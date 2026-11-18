// ─────────────────────────────────────────────────────────────────────────────
// Personas de prueba con sesión · Zona: Pruebas (API)
//
// Qué hace: crea a las personas de docs/pruebas/datos-de-prueba.md directo en la base (rápido:
// la contraseña se hashea una sola vez por corrida) con ids UUID v7 fijos, y les da sesión
// firmando un access con el reloj de la prueba, sin pasar por el ingreso. La escena base es
// Camila (entrenadora), Martina (alumna vinculada a Camila desde el 4 de agosto, con los dos
// consentimientos) y Diego (alumno solo, sin consentimiento de fotos). Igual pueden ingresar por
// POST /v1/auth/login con CLAVE.
// Tócalo cuando: una prueba necesite otra persona o un estado de partida que usen varias.
// No lo toques para: escribir una prueba (va en su *.test.ts).
// Depende de: test/ayudantes.ts (PERSONAS, CLAVE), src/seguridad/contrasenas.ts y
// src/compartido/semilla.ts (uuidV7Fijo).
// ─────────────────────────────────────────────────────────────────────────────
import { randomBytes } from 'node:crypto';
import type { BaseDeDatos } from '../../src/db';
import type { Usuario, VinculoEntrenador } from '../../src/generado/prisma/client';
import { uuidV7Fijo } from '../../src/compartido/semilla';
import { hashearContrasena } from '../../src/seguridad/contrasenas';
import type { Firmador } from '../../src/seguridad/tokens';
import { CLAVE, PERSONAS, type Persona } from '../ayudantes';

export type { Persona };

/** Lo que una prueba necesita de una persona. `usuario` es la fila tal como quedó al crearla. */
export interface PersonaDePrueba {
  nombre: Persona;
  id: string;
  email: string;
  rol: 'trainer' | 'client';
  usuario: Usuario;
}

/** Fechas de datos-de-prueba.md. */
export const FECHAS = {
  /** Martina se vinculó a Camila el 4 de agosto de 2026. */
  vinculoMartina: '2026-08-04T13:00:00.000Z',
  /** Las cuentas de la escena se crearon antes, el 1 de agosto. */
  cuentas: '2026-08-01T13:00:00.000Z',
} as const;

/** El id fijo de una persona: siempre el mismo en todas las corridas. */
export const idPersona = (p: Persona) => uuidV7Fijo(FECHAS.cuentas, `persona:${p}`);

// Argon2id cuesta: se calcula una vez por corrida y lo comparten todas las personas.
let hashClave: Promise<string> | undefined;
const hashDeClave = () => (hashClave ??= hashearContrasena(CLAVE));

// ── Crear ────────────────────────────────────────────────────────────────────
export async function crearPersona(prisma: BaseDeDatos, p: Persona, extra: Partial<Usuario> = {}): Promise<PersonaDePrueba> {
  const datos = PERSONAS[p];
  const usuario = await prisma.usuario.create({
    data: {
      id: idPersona(p),
      email: datos.email,
      nombre: datos.nombre,
      apellido: datos.apellido,
      rol: datos.rol,
      passwordHash: await hashDeClave(),
      createdAt: new Date(FECHAS.cuentas),
      ...extra,
    },
  });
  return { nombre: p, id: usuario.id, email: usuario.email, rol: usuario.rol, usuario };
}

/** Código de 6 caracteres sin 0, O, 1 ni I (P-14), al azar. */
export function codigoDePrueba(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return [...randomBytes(6)].map((b) => alfabeto[b % alfabeto.length]).join('');
}

/**
 * Deja al alumno vinculado al entrenador: fila activa en trainer_clients y entrenador_id en su
 * perfil (lo crea si no existe). `desde`: fecha de aceptación.
 */
export async function vincular(
  prisma: BaseDeDatos,
  entrenador: PersonaDePrueba,
  alumno: PersonaDePrueba,
  desde: string | Date = FECHAS.vinculoMartina,
): Promise<VinculoEntrenador> {
  const aceptado = new Date(desde);
  const vinculo = await prisma.vinculoEntrenador.create({
    data: {
      entrenadorId: entrenador.id,
      alumnoId: alumno.id,
      estado: 'activo',
      codigo: codigoDePrueba(),
      codigoVenceAt: new Date(aceptado.getTime() + 7 * 86_400_000),
      aceptadoAt: aceptado,
    },
  });
  await prisma.perfilAlumno.upsert({
    where: { usuarioId: alumno.id },
    create: { usuarioId: alumno.id, entrenadorId: entrenador.id },
    update: { entrenadorId: entrenador.id },
  });
  return vinculo;
}

/** Termina el vínculo activo del alumno (como DELETE /me/trainer): el entrenador deja de verlo. */
export async function desvincular(prisma: BaseDeDatos, alumno: PersonaDePrueba, cuando: Date): Promise<void> {
  await prisma.vinculoEntrenador.updateMany({
    where: { alumnoId: alumno.id, estado: 'activo' },
    data: { estado: 'terminado', terminadoAt: cuando },
  });
  await prisma.perfilAlumno.updateMany({ where: { usuarioId: alumno.id }, data: { entrenadorId: null } });
}

export interface Escena {
  camila: PersonaDePrueba;
  martina: PersonaDePrueba;
  diego: PersonaDePrueba;
}

/** La escena base: Camila entrenadora, Martina vinculada a Camila y Diego solo. */
export async function crearEscena(prisma: BaseDeDatos): Promise<Escena> {
  const [camila, martina, diego] = await Promise.all([
    crearPersona(prisma, 'camila'),
    crearPersona(prisma, 'martina'),
    crearPersona(prisma, 'diego'),
  ]);
  await vincular(prisma, camila, martina);
  const consentimiento = new Date(FECHAS.vinculoMartina);
  await prisma.perfilAlumno.update({
    where: { usuarioId: martina.id },
    data: { consentimientoSaludAt: consentimiento, consentimientoFotosAt: consentimiento, politicaVersion: '1' },
  });
  await prisma.perfilAlumno.create({
    data: { usuarioId: diego.id, consentimientoSaludAt: new Date(FECHAS.cuentas), politicaVersion: '1' },
  });
  return { camila, martina, diego };
}

// ── Sesión ───────────────────────────────────────────────────────────────────
/** Un access válido para esta persona, firmado con el «ahora» que le pases (el reloj de la prueba). */
export async function tokenPara(firmador: Firmador, persona: Pick<PersonaDePrueba, 'usuario'>, ahora: Date): Promise<string> {
  const u = persona.usuario;
  const { token } = await firmador.firmarAccess({ sub: u.id, rol: u.rol, sello: firmador.selloDeContrasena(u.passwordHash) }, ahora);
  return token;
}
