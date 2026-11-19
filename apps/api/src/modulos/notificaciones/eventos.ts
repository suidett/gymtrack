// ─────────────────────────────────────────────────────────────────────────────
// Eventos que avisan · Zona: Notificaciones (API)
//
// Qué hace: lo que los otros módulos y el worker llaman cuando pasa algo que merece un aviso. Cada
// función de la API vuelve de inmediato: lee lo que necesita y manda después de responder
// (servicio.enFondo), así un aviso nunca demora ni rompe la acción del usuario.
//   avisarCierreDeSesion   (sesiones, al cerrar o sincronizar) las alertas que dejó la sesión
//                          (estancamiento, baja, dolor general de 7 o más): push y correo al
//                          entrenador. Un cierre sin alertas no avisa (INT-150).
//   avisarObservacionNueva (sesiones, POST /observations) del alumno: un dolor de 7 o más es push
//                          y correo al entrenador al tiro (INT-147, P-20); otra observación, push
//                          al entrenador (INT-150). Del entrenador: push al alumno (P-41).
//   avisarRutina           (rutinas, asignar o activar) push al alumno, si lo hizo su entrenador.
//   avisarAlertasDeLaNoche (worker) un correo por entrenador con las alertas que creó la corrida
//                          de la noche. Sin push: son las 4 de la mañana en Chile; quedan en Alertas
//                          y en la campana (armarAvisosDeLaNoche arma los avisos sin mandarlos).
// Cada aviso deja además su notificación en la campana de quien lo recibe (./servicio.ts, ./bandeja.ts).
// El alumno solo (sin vínculo) no le avisa a nadie (INT-145, WRK-017). Los recordatorios están en
// ./recordatorios.ts.
// Tócalo cuando: un evento nuevo tenga que avisar, o cambie a quién.
// No lo toques para: los textos (./textos.ts) ni el tope (./servicio.ts).
// Depende de: la base, src/compartido (contexto del módulo), ../alertas/umbrales, ./servicio y ./textos.
// ─────────────────────────────────────────────────────────────────────────────
import type { ContextoModulo } from '../../compartido/modulos';
import type { BaseDeDatos } from '../../db';
import { leerUmbrales } from '../alertas/umbrales';
import type { Aviso, ServicioAvisos } from './servicio';
import {
  avisoAlertas, avisoObservacionDelAlumno, avisoObservacionDelEntrenador, avisoRutina, correoAlertasDeLaNoche,
  notificacionAlertasDeLaNoche, type AlertaParaAviso,
} from './textos';

// ── El servicio de cada API armada ───────────────────────────────────────────
// Cada construirApp tiene su contexto; el módulo notificaciones deja aquí su servicio al
// registrarse (./index.ts). Los otros módulos lo buscan con el mismo ctx que reciben.
const servicios = new WeakMap<ContextoModulo, ServicioAvisos>();

export function instalarAvisos(ctx: ContextoModulo, servicio: ServicioAvisos): void {
  servicios.set(ctx, servicio);
}

/** El servicio de avisos de esta API (undefined si el módulo notificaciones no se registró). */
export function avisosDe(ctx: ContextoModulo): ServicioAvisos | undefined {
  return servicios.get(ctx);
}

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// ── Cierre de sesión ─────────────────────────────────────────────────────────
export async function armarAvisoDeCierre(prisma: BaseDeDatos, sesionId: string, urlApp: string | null): Promise<Aviso | null> {
  const alertas = await prisma.alerta.findMany({
    where: { detalle: { path: ['session_id'], equals: sesionId }, entrenadorId: { not: null }, estado: 'nueva' },
    include: { alumno: true, entrenador: true, ejercicio: { select: { nombre: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  const primera = alertas[0];
  if (!primera?.entrenador) return null;
  const lista: AlertaParaAviso[] = alertas.map((a) => ({ tipo: a.tipo, ejercicio: a.ejercicio?.nombre ?? null, detalle: esObjeto(a.detalle) ? a.detalle : {} }));
  const hayDolor = lista.some((a) => a.tipo === 'dolor');
  const { push, correo } = avisoAlertas({ entrenador: primera.entrenador, alumno: primera.alumno, alumnoId: primera.alumnoId, alertas: lista, urlApp });
  return { tipo: hayDolor ? 'dolor' : 'alerta', clave: `cierre:${sesionId}`, para: primera.entrenador, push, correo, cuentaTope: true, saltaTope: hayDolor };
}

export function avisarCierreDeSesion(ctx: ContextoModulo, sesionId: string): void {
  const s = avisosDe(ctx);
  s?.enFondo('cierre', () => armarAvisoDeCierre(ctx.prisma, sesionId, s.config.urlApp));
}

// ── Observaciones ────────────────────────────────────────────────────────────
export async function armarAvisoDeObservacion(prisma: BaseDeDatos, observacionId: string, urlApp: string | null): Promise<Aviso | null> {
  const o = await prisma.observacion.findUnique({
    where: { id: observacionId },
    include: { autor: true, alumno: true, ejercicio: { select: { nombre: true } }, rutina: { select: { nombre: true } } },
  });
  if (!o) return null;
  const sobre = o.ejercicio?.nombre ?? (o.rutina ? `la rutina «${o.rutina.nombre}»` : o.sesionId ? 'la sesión' : null);

  if (o.autor.rol === 'client') {
    const vinculo = await prisma.vinculoEntrenador.findFirst({ where: { alumnoId: o.alumnoId, estado: 'activo' }, include: { entrenador: true } });
    if (!vinculo) return null;
    const umbral = leerUmbrales().dolorIntensidad;
    if (o.tipo === 'dolor' && (o.dolorIntensidad ?? 0) >= umbral) {
      // Al tiro, por push y correo, y aunque ya tenga 2 hoy (P-20).
      const { push, correo } = avisoAlertas({
        entrenador: vinculo.entrenador, alumno: o.alumno, alumnoId: o.alumnoId, urlApp,
        alertas: [{ tipo: 'dolor', ejercicio: o.ejercicio?.nombre ?? null, detalle: { zona: o.dolorZona, intensidad: o.dolorIntensidad } }],
      });
      return { tipo: 'dolor', clave: `observacion:${o.id}`, para: vinculo.entrenador, push, correo, cuentaTope: true, saltaTope: true };
    }
    return {
      tipo: 'observacion', clave: `observacion:${o.id}`, para: vinculo.entrenador, correo: null, cuentaTope: true,
      push: avisoObservacionDelAlumno({ alumno: o.alumno, alumnoId: o.alumnoId, sobre }),
    };
  }

  // Del entrenador a su alumno: la respuesta o el consejo (P-41).
  if (o.alumnoId === o.autorId) return null;
  return {
    tipo: o.tipo === 'consejo' ? 'consejo' : 'observacion', clave: `observacion:${o.id}`, para: o.alumno, correo: null, cuentaTope: true,
    push: avisoObservacionDelEntrenador({ entrenador: o.autor, tipo: o.tipo, texto: o.texto, sobre }),
  };
}

export function avisarObservacionNueva(ctx: ContextoModulo, observacionId: string): void {
  const s = avisosDe(ctx);
  s?.enFondo('observacion', () => armarAvisoDeObservacion(ctx.prisma, observacionId, s.config.urlApp));
}

// ── Rutinas ──────────────────────────────────────────────────────────────────
export type AccionRutina = 'asignada' | 'activada' | 'asignada_activa';

export async function armarAvisoDeRutina(prisma: BaseDeDatos, rutinaId: string, actorId: string, accion: AccionRutina): Promise<Aviso | null> {
  const [rutina, actor] = await Promise.all([
    prisma.rutina.findUnique({ where: { id: rutinaId }, include: { alumno: true } }),
    prisma.usuario.findUnique({ where: { id: actorId } }),
  ]);
  // Solo lo que hace el entrenador por su alumno: el alumno que activa su propia rutina no se avisa a sí mismo.
  if (!rutina?.alumno || !actor || actor.rol !== 'trainer' || rutina.alumnoId === actorId) return null;
  return {
    tipo: 'rutina', clave: `rutina:${rutina.id}:${accion}:${rutina.version}`, para: rutina.alumno, correo: null, cuentaTope: true,
    push: avisoRutina({ entrenador: actor, rutina: rutina.nombre, rutinaId: rutina.id, accion }),
  };
}

export function avisarRutina(ctx: ContextoModulo, rutinaId: string, actorId: string, accion: AccionRutina): void {
  avisosDe(ctx)?.enFondo('rutina', () => armarAvisoDeRutina(ctx.prisma, rutinaId, actorId, accion));
}

// ── La noche (worker) ────────────────────────────────────────────────────────
/**
 * Los avisos de las alertas que acaba de crear la corrida de la noche: crearAlertaSiFalta las
 * fecha con el mismo «ahora» de la corrida, así que son las de created_at igual a ese instante. Uno
 * por entrenador, solo correo y su notificación en la campana; el alumno solo no avisa a nadie
 * (WRK-017). La demo (prisma/demo.ts) los arma igual para dejar la notificación.
 */
export async function armarAvisosDeLaNoche(prisma: BaseDeDatos, ahora: Date, urlApp: string | null): Promise<Aviso[]> {
  const alertas = await prisma.alerta.findMany({
    where: { createdAt: ahora, entrenadorId: { not: null }, estado: 'nueva' },
    include: { alumno: true, entrenador: true, ejercicio: { select: { nombre: true } } },
    orderBy: [{ entrenadorId: 'asc' }, { alumnoId: 'asc' }, { createdAt: 'asc' }],
  });
  const porEntrenador = new Map<string, typeof alertas>();
  for (const a of alertas) porEntrenador.set(a.entrenadorId!, [...(porEntrenador.get(a.entrenadorId!) ?? []), a]);
  const avisos: Aviso[] = [];
  for (const [entrenadorId, suyas] of porEntrenador) {
    const entrenador = suyas[0]!.entrenador!;
    const porAlumno = new Map<string, { alumno: (typeof suyas)[number]['alumno']; alertas: AlertaParaAviso[] }>();
    for (const a of suyas) {
      const g = porAlumno.get(a.alumnoId) ?? { alumno: a.alumno, alertas: [] };
      g.alertas.push({ tipo: a.tipo, ejercicio: a.ejercicio?.nombre ?? null, detalle: esObjeto(a.detalle) ? a.detalle : {} });
      porAlumno.set(a.alumnoId, g);
    }
    const alumnos = [...porAlumno.values()];
    avisos.push({
      tipo: 'alertas_noche', clave: `noche:${entrenadorId}:${ahora.toISOString()}`, para: entrenador, push: null, cuentaTope: false,
      correo: correoAlertasDeLaNoche(entrenador, alumnos, urlApp),
      notificacion: notificacionAlertasDeLaNoche(alumnos),
    });
  }
  return avisos;
}

/** Manda los avisos de la noche: un correo por entrenador (y su notificación). Cuenta las alertas y los correos. */
export async function avisarAlertasDeLaNoche(prisma: BaseDeDatos, avisos: ServicioAvisos, ahora: Date): Promise<{ alertas: number; correos: number }> {
  const alertas = await prisma.alerta.count({ where: { createdAt: ahora, entrenadorId: { not: null }, estado: 'nueva' } });
  let correos = 0;
  for (const aviso of await armarAvisosDeLaNoche(prisma, ahora, avisos.config.urlApp)) {
    const r = await avisos.enviar(aviso);
    if (r.correo) correos += 1;
  }
  return { alertas, correos };
}
