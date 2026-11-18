// ─────────────────────────────────────────────────────────────────────────────
// Reglas de perfil y cuenta · Zona: Perfil (API)
//
// Qué hace: lo que hacen las rutas de perfil sin pensar en HTTP: armar el perfil con su
// entrenador y su encuesta pendiente, cambiar ajustes, guardar la encuesta (con el primer peso y
// el vínculo por código, todo en una transacción), registrar el token de push con hash, generar
// el código de invitación (uno vigente por entrenador, P-14), vincular y desvincular al alumno
// (P-15, P-16) y marcar la cuenta para borrado (P-24).
// Tócalo cuando: cambie una regla de estas (qué termina al borrar, cómo se valida un código).
// No lo toques para: la forma de entrada y salida (packages/shared/src/api/perfil.ts) ni la
// matriz de permisos (src/compartido/permisos.ts).
// Depende de: la base, src/compartido (errores), src/seguridad/tokens.ts (hash) y @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import {
  ALFABETO_INVITACION, DIAS_PURGA_CUENTA, DURACION_INVITACION_MS, EDAD_MINIMA_ENCUESTA, LARGO_INVITACION,
  VERSION_ENCUESTA,
  type Encuesta, type EncuestaRespuestas, type Invitacion, type PerfilUsuario, type VinculoResultado,
  type esquemaEncuestaEntrada, type esquemaPerfilCambios, type esquemaPushToken, type esquemaPushTokenEntrada,
} from '@gymtrack/shared';
import { randomInt } from 'node:crypto';
import type { z } from 'zod';
import { esDuplicado, type BaseDeDatos } from '../../db';
import type { PerfilAlumno, Prisma, RespuestaEncuesta, Usuario, VinculoEntrenador } from '../../generado/prisma/client';
import { aUsuarioApi } from '../../cuentas/servicio';
import { fallar, noEncontrado } from '../../compartido';
import { hashToken } from '../../seguridad/tokens';

type Tx = Prisma.TransactionClient;
type Db = BaseDeDatos | Tx;
type PushTokenApi = z.infer<typeof esquemaPushToken>;

// ── Perfil ───────────────────────────────────────────────────────────────────
/** GET /me con el entrenador del vínculo activo, la encuesta pendiente y el recordatorio. */
export async function perfilApi(prisma: Db, usuario: Usuario): Promise<PerfilUsuario> {
  const base = aUsuarioApi(usuario);
  if (usuario.rol === 'trainer') return { ...base, entrenador: null, encuesta_pendiente: false, recordatorio_activo: null, recordatorio_hora: null };
  const [vinculo, encuestas, perfil] = await Promise.all([
    prisma.vinculoEntrenador.findFirst({ where: { alumnoId: usuario.id, estado: 'activo' }, include: { entrenador: true } }),
    prisma.respuestaEncuesta.count({ where: { alumnoId: usuario.id } }),
    prisma.perfilAlumno.findUnique({ where: { usuarioId: usuario.id } }),
  ]);
  return {
    ...base,
    entrenador: vinculo ? resumenEntrenador(vinculo.entrenador) : null,
    encuesta_pendiente: encuestas === 0,
    recordatorio_activo: perfil?.recordatorioActivo ?? true,
    recordatorio_hora: perfil?.recordatorioHora ?? null,
  };
}

const resumenEntrenador = (u: Pick<Usuario, 'id' | 'nombre' | 'apellido'>) => ({ id: u.id, nombre: u.nombre, apellido: u.apellido });

export async function actualizarPerfil(prisma: BaseDeDatos, usuario: Usuario, cambios: z.output<typeof esquemaPerfilCambios>): Promise<PerfilUsuario> {
  const { recordatorio_activo, recordatorio_hora, ...deUsuario } = cambios;
  const tocaRecordatorio = recordatorio_activo !== undefined || recordatorio_hora !== undefined;
  if (tocaRecordatorio && usuario.rol !== 'client') {
    fallar('BUSINESS_RULE', { campo: 'recordatorio_activo', regla: 'solo_alumno' }, 'El recordatorio para entrenar es solo de los alumnos.');
  }
  const actualizado = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.update({
      where: { id: usuario.id },
      data: {
        nombre: deUsuario.nombre,
        apellido: deUsuario.apellido,
        timezone: deUsuario.timezone,
        unidades: deUsuario.unidades,
        descansoDefaultS: deUsuario.descanso_default_s,
        modoGimnasio: deUsuario.modo_gimnasio,
      },
    });
    if (tocaRecordatorio) {
      const datos = { recordatorioActivo: recordatorio_activo, recordatorioHora: recordatorio_hora };
      await tx.perfilAlumno.upsert({ where: { usuarioId: usuario.id }, create: { usuarioId: usuario.id, ...datos }, update: datos });
    }
    return u;
  });
  return perfilApi(prisma, actualizado);
}

// ── Encuesta ─────────────────────────────────────────────────────────────────
/** La fecha de hoy (AAAA-MM-DD) en la zona del usuario. */
export function hoyEn(zona: string, ahora: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
}

/** Años cumplidos a la fecha `hoy` (las dos en AAAA-MM-DD). */
export function edadEn(nacimiento: string, hoy: string): number {
  const [an, mn, dn] = nacimiento.split('-').map(Number) as [number, number, number];
  const [ah, mh, dh] = hoy.split('-').map(Number) as [number, number, number];
  return ah - an - (mh < mn || (mh === mn && dh < dn) ? 1 : 0);
}

function encuestaApi(fila: RespuestaEncuesta, perfil: PerfilAlumno | null, entrenador: Pick<Usuario, 'id' | 'nombre' | 'apellido'> | null): Encuesta {
  const { codigo_entrenador: _codigo, ...respuestas } = fila.respuestas as EncuestaRespuestas;
  return {
    id: fila.id,
    version: fila.version,
    respuestas,
    completada_at: fila.completadaAt.toISOString(),
    consentimiento_salud_at: perfil?.consentimientoSaludAt?.toISOString() ?? null,
    politica_version: perfil?.politicaVersion ?? null,
    entrenador: entrenador ? resumenEntrenador(entrenador) : null,
  };
}

export async function responderEncuesta(
  prisma: BaseDeDatos,
  usuario: Usuario,
  entrada: z.output<typeof esquemaEncuestaEntrada>,
  ahora: Date,
  alFallarCodigo: () => void,
): Promise<Encuesta> {
  // P-25: sin la casilla propia no se guarda nada.
  if (entrada.consentimiento_salud !== true) fallar('CONSENT_REQUIRED', { campo: 'consentimiento_salud' });
  const r = entrada.respuestas;
  const hoy = hoyEn(usuario.timezone, ahora);
  if (r.fecha_nacimiento > hoy || edadEn(r.fecha_nacimiento, hoy) < EDAD_MINIMA_ENCUESTA) {
    fallar('BUSINESS_RULE', { campo: 'fecha_nacimiento', regla: 'edad_minima', edad_minima: EDAD_MINIMA_ENCUESTA },
      `Necesitas tener al menos ${EDAD_MINIMA_ENCUESTA} años para usar GymTrack.`);
  }
  return prisma.$transaction(async (tx) => {
    const fila = await tx.respuestaEncuesta.create({
      data: { alumnoId: usuario.id, version: VERSION_ENCUESTA, respuestas: r as Prisma.InputJsonValue, completadaAt: ahora },
    });
    const datosPerfil = {
      fechaNacimiento: new Date(`${r.fecha_nacimiento}T00:00:00.000Z`),
      alturaCm: r.altura_cm,
      objetivo: r.objetivo,
      experiencia: r.experiencia,
      diasSemana: r.dias_semana,
      lugar: r.lugar,
      minutosSesion: r.minutos_sesion,
      lesiones: r.lesiones as Prisma.InputJsonValue,
      consentimientoSaludAt: ahora,
      politicaVersion: entrada.politica_version,
    };
    const perfil = await tx.perfilAlumno.upsert({
      where: { usuarioId: usuario.id },
      create: { usuarioId: usuario.id, ...datosPerfil },
      update: datosPerfil,
    });
    // Pregunta 8: primer registro de peso corporal (uno por día: si ya pesó hoy, se reemplaza el peso).
    const fecha = new Date(`${hoy}T00:00:00.000Z`);
    await tx.medidaCorporal.upsert({
      where: { alumnoId_fecha: { alumnoId: usuario.id, fecha } },
      create: { alumnoId: usuario.id, fecha, pesoKg: r.peso_kg },
      update: { pesoKg: r.peso_kg },
    });
    // Pregunta 10: si trae código, queda vinculado en la misma transacción (INT-022).
    let entrenador: Pick<Usuario, 'id' | 'nombre' | 'apellido'> | null = null;
    if (r.codigo_entrenador) {
      entrenador = (await vincularConCodigo(tx, usuario, r.codigo_entrenador, ahora, alFallarCodigo, false)).entrenador;
    } else {
      const v = await tx.vinculoEntrenador.findFirst({ where: { alumnoId: usuario.id, estado: 'activo' }, include: { entrenador: true } });
      entrenador = v?.entrenador ?? null;
    }
    return encuestaApi(fila, perfil, entrenador);
  });
}

export async function verEncuesta(prisma: BaseDeDatos, alumnoId: string): Promise<Encuesta> {
  // P-12: la vigente es la más reciente.
  const fila = await prisma.respuestaEncuesta.findFirst({ where: { alumnoId }, orderBy: [{ completadaAt: 'desc' }, { id: 'desc' }] });
  if (!fila) noEncontrado();
  const [perfil, vinculo] = await Promise.all([
    prisma.perfilAlumno.findUnique({ where: { usuarioId: alumnoId } }),
    prisma.vinculoEntrenador.findFirst({ where: { alumnoId, estado: 'activo' }, include: { entrenador: true } }),
  ]);
  return encuestaApi(fila, perfil, vinculo?.entrenador ?? null);
}

// ── Push ─────────────────────────────────────────────────────────────────────
/** Guarda el token con hash (SEG-003). El mismo token otra vez no se duplica: `nuevo` es false. */
export async function registrarPush(
  prisma: BaseDeDatos,
  usuario: Usuario,
  entrada: z.output<typeof esquemaPushTokenEntrada>,
): Promise<{ nuevo: boolean; token: PushTokenApi }> {
  const tokenHash = hashToken(entrada.token);
  const existente = await prisma.pushToken.findUnique({ where: { tokenHash } });
  const aApi = (f: { id: string; plataforma: string; createdAt: Date }): PushTokenApi => ({
    id: f.id, plataforma: f.plataforma as PushTokenApi['plataforma'], created_at: f.createdAt.toISOString(),
  });
  if (existente) {
    // El teléfono pasó a otra cuenta, o vuelve después de revocado: queda de quien lo registra ahora.
    const f = await prisma.pushToken.update({
      where: { id: existente.id },
      data: { usuarioId: usuario.id, plataforma: entrada.plataforma, revocadoAt: null },
    });
    return { nuevo: false, token: aApi(f) };
  }
  try {
    const f = await prisma.pushToken.create({ data: { usuarioId: usuario.id, tokenHash, plataforma: entrada.plataforma } });
    return { nuevo: true, token: aApi(f) };
  } catch (error) {
    if (!esDuplicado(error)) throw error;
    const f = await prisma.pushToken.findUniqueOrThrow({ where: { tokenHash } });
    return { nuevo: false, token: aApi(f) };
  }
}

// ── Invitación ───────────────────────────────────────────────────────────────
/** 6 caracteres del alfabeto de P-14, al azar con crypto (sin sesgo: randomInt). */
export function generarCodigoInvitacion(): string {
  let codigo = '';
  for (let i = 0; i < LARGO_INVITACION; i++) codigo += ALFABETO_INVITACION[randomInt(ALFABETO_INVITACION.length)];
  return codigo;
}

function invitacionApi(v: VinculoEntrenador, ahora: Date): Invitacion {
  return {
    codigo: v.codigo,
    vence_at: v.codigoVenceAt.toISOString(),
    estado: v.estado,
    vigente: v.estado === 'invitado' && v.alumnoId === null && v.codigoVenceAt.getTime() > ahora.getTime(),
    created_at: v.createdAt.toISOString(),
  };
}

/** Un código nuevo que vence en 7 días; los anteriores sin usar dejan de servir (P-14). */
export async function crearInvitacion(prisma: BaseDeDatos, entrenadorId: string, ahora: Date): Promise<Invitacion> {
  for (let intento = 0; intento < 5; intento++) {
    try {
      const v = await prisma.$transaction(async (tx) => {
        await tx.vinculoEntrenador.updateMany({
          where: { entrenadorId, estado: 'invitado', alumnoId: null, codigoVenceAt: { gt: ahora } },
          data: { codigoVenceAt: ahora },
        });
        return tx.vinculoEntrenador.create({
          data: {
            entrenadorId,
            estado: 'invitado',
            codigo: generarCodigoInvitacion(),
            codigoVenceAt: new Date(ahora.getTime() + DURACION_INVITACION_MS),
            createdAt: ahora,
          },
        });
      });
      return invitacionApi(v, ahora);
    } catch (error) {
      if (!esDuplicado(error)) throw error; // el código ya existía: se prueba otro
    }
  }
  return fallar('CONFLICT', undefined, 'No pudimos crear un código. Intenta de nuevo.');
}

export async function verInvitacion(prisma: BaseDeDatos, entrenadorId: string, ahora: Date): Promise<Invitacion | null> {
  const v = await prisma.vinculoEntrenador.findFirst({
    where: { entrenadorId, alumnoId: null, estado: 'invitado' },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  return v ? invitacionApi(v, ahora) : null;
}

// ── Vínculo ──────────────────────────────────────────────────────────────────
/**
 * Vincula al alumno con el entrenador dueño del código (CU-12). Ya vinculado: 409 ALREADY_LINKED
 * (P-15). Código inexistente o vencido: 404 INVITATION_NOT_FOUND con el mismo cuerpo (P-14);
 * usado: 409 INVITATION_USED. `alFallarCodigo` cuenta el intento fallido (P-27) y puede lanzar 429.
 */
export async function vincularConCodigo(
  db: Db,
  alumno: Usuario,
  codigo: string,
  ahora: Date,
  alFallarCodigo: () => void,
  vistaPrevia: boolean,
): Promise<VinculoResultado> {
  const yaVinculado = await db.vinculoEntrenador.findFirst({ where: { alumnoId: alumno.id, estado: 'activo' } });
  if (yaVinculado) fallar('ALREADY_LINKED');
  const invitacion = await db.vinculoEntrenador.findUnique({ where: { codigo }, include: { entrenador: true } });
  const vencido = invitacion && invitacion.estado === 'invitado' && invitacion.codigoVenceAt.getTime() <= ahora.getTime();
  if (!invitacion || vencido || invitacion.entrenador.deletedAt) {
    alFallarCodigo();
    fallar('INVITATION_NOT_FOUND');
  }
  if (invitacion.estado !== 'invitado' || invitacion.alumnoId !== null) {
    alFallarCodigo();
    fallar('INVITATION_USED');
  }
  const entrenador = resumenEntrenador(invitacion.entrenador);
  if (vistaPrevia) return { entrenador, vinculado: false, aceptado_at: null };

  const aplicar = async (tx: Tx) => {
    const r = await tx.vinculoEntrenador.updateMany({
      where: { id: invitacion.id, estado: 'invitado', alumnoId: null },
      data: { estado: 'activo', alumnoId: alumno.id, aceptadoAt: ahora },
    });
    if (r.count === 0) fallar('INVITATION_USED');
    await tx.perfilAlumno.upsert({
      where: { usuarioId: alumno.id },
      create: { usuarioId: alumno.id, entrenadorId: invitacion.entrenadorId },
      update: { entrenadorId: invitacion.entrenadorId },
    });
  };
  try {
    if ('$transaction' in db) await db.$transaction(aplicar);
    else await aplicar(db);
  } catch (error) {
    // El índice parcial de un vínculo activo por alumno ganó una carrera (P-15).
    if (esDuplicado(error)) fallar('ALREADY_LINKED');
    throw error;
  }
  return { entrenador, vinculado: true, aceptado_at: ahora.toISOString() };
}

/**
 * Termina el vínculo activo del alumno: el entrenador deja de verlo al instante (PERM-34) y la
 * rutina activa que él escribió queda archivada para el alumno (P-16). Sin vínculo: 404.
 */
export async function terminarVinculo(tx: Tx, alumnoId: string, ahora: Date): Promise<VinculoEntrenador | null> {
  const v = await tx.vinculoEntrenador.findFirst({ where: { alumnoId, estado: 'activo' } });
  if (!v) return null;
  await tx.vinculoEntrenador.update({ where: { id: v.id }, data: { estado: 'terminado', terminadoAt: ahora } });
  await tx.perfilAlumno.updateMany({ where: { usuarioId: alumnoId }, data: { entrenadorId: null } });
  await archivarRutinasDelEntrenador(tx, v.entrenadorId, [alumnoId]);
  return v;
}

async function archivarRutinasDelEntrenador(tx: Tx, entrenadorId: string, alumnoIds: string[]) {
  if (alumnoIds.length === 0) return;
  const activas = await tx.rutina.findMany({
    where: { duenoId: entrenadorId, alumnoId: { in: alumnoIds }, estado: 'activa' },
    select: { id: true },
  });
  if (activas.length === 0) return;
  const ids = activas.map((r) => r.id);
  await tx.perfilAlumno.updateMany({ where: { rutinaActivaId: { in: ids } }, data: { rutinaActivaId: null } });
  await tx.rutina.updateMany({ where: { id: { in: ids } }, data: { estado: 'archivada' } });
}

export async function desvincular(prisma: BaseDeDatos, alumnoId: string, ahora: Date): Promise<Date> {
  const v = await prisma.$transaction((tx) => terminarVinculo(tx, alumnoId, ahora));
  if (!v) noEncontrado();
  return ahora;
}

// ── Borrar la cuenta ─────────────────────────────────────────────────────────
/**
 * DELETE /me (P-24): marca deleted_at, revoca todos los refresh y los push, descarta la sesión en
 * curso y termina los vínculos. Si es entrenador, sus clientes quedan solos con su historial y
 * las rutinas activas que él les escribió se archivan; sus códigos sin usar dejan de servir. Los
 * datos y las fotos los purga el worker desde `purgaAt`.
 */
export async function borrarCuenta(prisma: BaseDeDatos, usuario: Usuario, ahora: Date): Promise<{ deletedAt: Date; purgaAt: Date }> {
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id: usuario.id }, data: { deletedAt: ahora } });
    await tx.refreshToken.updateMany({ where: { usuarioId: usuario.id, revocadoAt: null }, data: { revocadoAt: ahora } });
    await tx.pushToken.updateMany({ where: { usuarioId: usuario.id, revocadoAt: null }, data: { revocadoAt: ahora } });
    if (usuario.rol === 'client') {
      await tx.sesionEntreno.updateMany({ where: { alumnoId: usuario.id, estado: 'en_curso' }, data: { estado: 'descartada' } });
      await terminarVinculo(tx, usuario.id, ahora);
    } else {
      const vinculos = await tx.vinculoEntrenador.findMany({ where: { entrenadorId: usuario.id, estado: 'activo' } });
      const alumnos = vinculos.flatMap((v) => (v.alumnoId ? [v.alumnoId] : []));
      await tx.vinculoEntrenador.updateMany({ where: { entrenadorId: usuario.id, estado: 'activo' }, data: { estado: 'terminado', terminadoAt: ahora } });
      await tx.perfilAlumno.updateMany({ where: { entrenadorId: usuario.id }, data: { entrenadorId: null } });
      await archivarRutinasDelEntrenador(tx, usuario.id, alumnos);
      await tx.vinculoEntrenador.updateMany({
        where: { entrenadorId: usuario.id, estado: 'invitado', codigoVenceAt: { gt: ahora } },
        data: { codigoVenceAt: ahora },
      });
    }
  });
  return { deletedAt: ahora, purgaAt: new Date(ahora.getTime() + DIAS_PURGA_CUENTA * 86_400_000) };
}
