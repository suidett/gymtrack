// ─────────────────────────────────────────────────────────────────────────────
// Semilla de la base · Zona: Datos (API)
//
// Qué hace: carga el contenido con el que parte toda base: los ejercicios de la biblioteca base
// (packages/shared/src/exercises.seed.ts, 67 hoy; P-29) y los consejos de los motivos de baja
// (docs/pantallas/motivos.html: 3 por motivo, «otro» no tiene). Cada ejercicio conserva el id de
// la app sin «base-» como slug (`press-de-banca`) y recibe un UUID v7 fijo calculado desde el slug,
// el mismo en todas las bases: una prueba o la app lo pueden calcular con idEjercicioBase(slug).
// Es idempotente: lo que ya está no se duplica. Con `actualizar` también reescribe nombre, grupo,
// equipo, incremento e instrucciones de los que ya estaban (para cuando cambie exercises.seed.ts
// o los pasos de exercises.detalle.ts).
// Tócalo cuando: haya otro contenido que toda base necesite.
// No lo toques para: cambiar un ejercicio (exercises.seed.ts) ni para datos de prueba
// (test/ayudas).
// Depende de: @gymtrack/shared (EJERCICIOS_BASE) y la base. La corren prisma/semilla.ts
// (`pnpm --filter api db:sembrar`) y las ayudas de prueba después de vaciar la base.
// ─────────────────────────────────────────────────────────────────────────────
import { EJERCICIOS_BASE } from '@gymtrack/shared';
import { createHash } from 'node:crypto';
import type { BaseDeDatos } from '../db';
import type { MotivoBaja, Patron, TipoCarga } from '../generado/prisma/client';

// ── Ids fijos ────────────────────────────────────────────────────────────────
/** La fecha de la biblioteca base en exercises.seed.ts: va en los 48 bits de tiempo del UUID v7. */
export const FECHA_BIBLIOTECA = '2026-09-23T00:00:00.000Z';

/**
 * Un UUID v7 determinista: la marca de tiempo de `fecha` y el resto de los bits del SHA-256 de
 * `semilla`. Siempre da lo mismo para la misma entrada.
 */
export function uuidV7Fijo(fecha: string | Date, semilla: string): string {
  const b = Buffer.alloc(16);
  b.writeUIntBE(new Date(fecha).getTime(), 0, 6);
  createHash('sha256').update(semilla).digest().copy(b, 6, 0, 10);
  b[6] = (b[6]! & 0x0f) | 0x70; // versión 7
  b[8] = (b[8]! & 0x3f) | 0x80; // variante RFC 9562
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** `base-press-de-banca` o `press-de-banca` → `press-de-banca`. */
export function slugDe(idApp: string): string {
  return idApp.replace(/^base-/, '');
}

/** El id en la base de un ejercicio de la biblioteca: `idEjercicioBase('press-de-banca')`. */
export function idEjercicioBase(slugOIdApp: string): string {
  return uuidV7Fijo(FECHA_BIBLIOTECA, `ejercicio:${slugDe(slugOIdApp)}`);
}

// ── Contenido ────────────────────────────────────────────────────────────────
const CONSEJOS: Record<Exclude<MotivoBaja, 'otro'>, string[]> = {
  sueno: [
    'Apunta a dormir entre 7 y 9 horas. Acostarte a la misma hora ayuda más que dormir hasta tarde el fin de semana.',
    'Si dormiste menos de 6 horas, entrena igual pero repite los kilos de la vez pasada. No es día de récords.',
    'Deja el celular media hora antes de dormir.',
  ],
  estres: [
    'Entrenar igual ayuda. Si cuesta, haz los ejercicios principales y deja los accesorios para otro día.',
    'Alarga 30 segundos el descanso entre series.',
    'Una caminata de 10 minutos antes de entrenar ayuda a bajar las revoluciones.',
  ],
  alimentacion: [
    'Come algo con carbohidratos y proteína entre 1 y 3 horas antes de entrenar.',
    'Reparte la proteína en 3 o 4 comidas al día.',
    'Toma agua durante el día, no solo en el gimnasio.',
  ],
  lesion: [
    'No entrenes con dolor. Si una molestia pasa de 3 en una escala de 10, para ese ejercicio.',
    'Anótala como dolor en el ejercicio, en el registro, para seguirla semana a semana.',
    'Si dura más de una semana o empeora, consulta a un profesional de la salud.',
  ],
  tiempo: [
    'Con poco tiempo, haz primero los ejercicios principales: son los que más cuentan.',
    'Acorta el descanso de los accesorios, no el de los ejercicios principales.',
    'Es mejor mover la sesión a otro día que saltártela.',
  ],
};

/** El id fijo de un consejo: `idConsejo('sueno', 1)` (orden desde 1). */
export function idConsejo(motivo: MotivoBaja, orden: number): string {
  return uuidV7Fijo(FECHA_BIBLIOTECA, `consejo:${motivo}:${orden}`);
}

function filasEjercicios() {
  return EJERCICIOS_BASE.map((e) => ({
    id: idEjercicioBase(e.id),
    duenoId: null,
    slug: slugDe(e.id),
    nombre: e.nombre,
    grupoMuscular: e.grupo,
    equipo: e.equipo,
    patron: e.patron as Patron,
    tipoCarga: e.tipoCarga as TipoCarga,
    incrementoDefaultKg: e.incrementoKg,
    instrucciones: e.instrucciones ?? null,
    createdAt: new Date(e.creadoAt),
  }));
}

function filasConsejos() {
  return Object.entries(CONSEJOS).flatMap(([motivo, textos]) =>
    textos.map((texto, i) => ({ id: idConsejo(motivo as MotivoBaja, i + 1), motivo: motivo as MotivoBaja, texto, orden: i + 1 })),
  );
}

// ── Carga ────────────────────────────────────────────────────────────────────
export async function sembrarBase(
  prisma: Pick<BaseDeDatos, 'ejercicio' | 'consejo' | '$transaction'>,
  opciones: { actualizar?: boolean } = {},
): Promise<{ ejercicios: number; consejos: number }> {
  const ejercicios = filasEjercicios();
  const consejos = filasConsejos();
  await prisma.ejercicio.createMany({ data: ejercicios, skipDuplicates: true });
  await prisma.consejo.createMany({ data: consejos, skipDuplicates: true });
  if (opciones.actualizar) {
    await prisma.$transaction([
      ...ejercicios.map(({ id, createdAt: _c, duenoId: _d, ...datos }) => prisma.ejercicio.update({ where: { id }, data: datos })),
      ...consejos.map(({ id, ...datos }) => prisma.consejo.update({ where: { id }, data: datos })),
    ]);
  }
  return { ejercicios: ejercicios.length, consejos: consejos.length };
}
