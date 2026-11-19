// ─────────────────────────────────────────────────────────────────────────────
// Servicio de rutinas · Zona: Rutinas (API)
//
// Qué hace: lo que cambia la base en rutinas, sin HTTP:
//   - validarEstructura: reps_min mayor que reps_max da 422 REPS_RANGE_INVALID y un ejercicio
//     que no puede ir en la rutina da 422 EXERCISE_NOT_OWNED, los dos con el día y la posición.
//   - crearRutina y copiarRutina (duplicar y asignar una plantilla: P-43), siempre en borrador.
//   - reemplazarDias (PUT /days): lo que trae id se conserva y se actualiza, lo nuevo se crea y lo
//     que no viene se marca con deleted_at (nunca se borra: las sesiones y las sugerencias viejas
//     siguen apuntando ahí). Sube la versión si la rutina está activa.
//   - activarRutina: una sola activa por alumno. Archiva la anterior, sube la versión y apunta
//     client_profiles.rutina_activa_id a la nueva. Dos activaciones a la vez: la segunda da 422
//     ACTIVE_ROUTINE_CONFLICT (se toma el perfil solo si sigue apuntando a lo que se leyó).
//   - archivarRutina: queda archivada; sin sesiones además lleva deleted_at; si era la activa, el
//     alumno queda sin rutina (P-56).
// Tócalo cuando: cambie una regla de cómo se guarda, copia, activa o archiva una rutina.
// No lo toques para: quién puede hacer cada cosa (index.ts y vista.ts) ni la forma de la API.
// Depende de: el cliente de Prisma, src/compartido (errores), ../ejercicios/consultas
// (ejerciciosUsables) y ./vista (INCLUIR_RUTINA).
// ─────────────────────────────────────────────────────────────────────────────
import { errorRepsSegun, maxRepsSegun, type esquemaDiaRutinaEdicion } from '@gymtrack/shared';
import type { z } from 'zod';
import { campoInvalido, fallar } from '../../compartido';
import type { BaseDeDatos } from '../../db';
import type { MetodoProgresion, Prisma } from '../../generado/prisma/client';
import { ejerciciosUsables, type Db } from '../ejercicios/consultas';
import { INCLUIR_RUTINA, type RutinaCompleta } from './vista';

/** Un día como llega (POST o PUT; en POST nunca trae id). */
export type DiaEntrada = z.output<typeof esquemaDiaRutinaEdicion>;
type EjercicioEntrada = DiaEntrada['ejercicios'][number];
type Usables = Map<string, { incrementoDefaultKg: number; tipoCarga?: string }>;

// ── Validar ──────────────────────────────────────────────────────────────────
/**
 * Revisa las reglas de negocio de la estructura (las de forma ya las revisó Zod) y devuelve los
 * ejercicios usables con su incremento por defecto.
 */
export async function validarEstructura(
  prisma: Db,
  dias: readonly DiaEntrada[],
  d: { duenoId: string; alumnoId: string | null; rutinaId?: string },
): Promise<Usables> {
  dias.forEach((dia, i) =>
    dia.ejercicios.forEach((e, j) => {
      if (e.reps_min > e.reps_max) {
        fallar('REPS_RANGE_INVALID', { campo: `dias.${i}.ejercicios.${j}.reps_min`, dia: i, posicion: j, exercise_id: e.exercise_id, reps_min: e.reps_min, reps_max: e.reps_max });
      }
    }),
  );
  const usables = await ejerciciosUsables(prisma, dias.flatMap((x) => x.ejercicios.map((e) => e.exercise_id)), d);
  dias.forEach((dia, i) =>
    dia.ejercicios.forEach((e, j) => {
      const ej = usables.get(e.exercise_id);
      if (!ej) {
        fallar('EXERCISE_NOT_OWNED', { campo: `dias.${i}.ejercicios.${j}.exercise_id`, dia: i, posicion: j, exercise_id: e.exercise_id });
      }
      // Fondo: el tope depende de cómo se registra el ejercicio (60 repeticiones o 600 segundos).
      const motivo = errorRepsSegun(ej.tipoCarga ?? 'kg', e.reps_max);
      if (motivo) {
        fallar('BUSINESS_RULE', {
          campo: `dias.${i}.ejercicios.${j}.reps_max`, dia: i, posicion: j, exercise_id: e.exercise_id,
          regla: 'reps_maximas', maximo: maxRepsSegun(ej.tipoCarga ?? 'kg'), motivo,
        }, motivo);
      }
    }),
  );
  return usables;
}

// ── Armar filas ──────────────────────────────────────────────────────────────
function datosEjercicio(e: EjercicioEntrada, orden: number, usables: Usables) {
  return {
    ejercicioId: e.exercise_id,
    orden,
    series: e.series,
    repsMin: e.reps_min,
    repsMax: e.reps_max,
    rirObjetivo: e.rir_objetivo,
    descansoS: e.descanso_s,
    incrementoKg: e.incremento_kg ?? usables.get(e.exercise_id)?.incrementoDefaultKg ?? 0,
    pesoInicialKg: e.peso_inicial_kg ?? null,
    esquema: e.esquema,
    grupoSuperserie: e.grupo_superserie ?? null,
    notaEntrenador: e.nota_entrenador ? e.nota_entrenador : null,
    porcentajesSemana: e.porcentajes_semana,
    objetivoRm: e.objetivo_rm ?? null,
  };
}

/** Los días con sus ejercicios como creación anidada de Prisma. */
function crearDias(dias: readonly DiaEntrada[], usables: Usables, ahora: Date): Prisma.DiaRutinaCreateWithoutRutinaInput[] {
  return dias.map((dia, i) => ({
    orden: i,
    nombre: dia.nombre,
    diaSemana: dia.dia_semana ?? null,
    createdAt: ahora,
    ejercicios: { create: dia.ejercicios.map((e, j) => ({ ...datosEjercicio(e, j, usables), createdAt: ahora })) },
  }));
}

/** Los días vivos de una rutina leída, como entrada (para copiarla). */
function diasDe(r: RutinaCompleta): { dias: DiaEntrada[]; usables: Usables } {
  const usables: Usables = new Map();
  const dias = r.dias.map((d) => ({
    nombre: d.nombre,
    dia_semana: d.diaSemana,
    ejercicios: d.ejercicios.map((x) => {
      usables.set(x.ejercicioId, { incrementoDefaultKg: x.incrementoKg });
      return {
        exercise_id: x.ejercicioId,
        series: x.series,
        reps_min: x.repsMin,
        reps_max: x.repsMax,
        rir_objetivo: x.rirObjetivo,
        descanso_s: x.descansoS,
        incremento_kg: x.incrementoKg,
        peso_inicial_kg: x.pesoInicialKg,
        esquema: x.esquema,
        grupo_superserie: x.grupoSuperserie,
        nota_entrenador: x.notaEntrenador,
        porcentajes_semana: x.porcentajesSemana,
        objetivo_rm: x.objetivoRm,
      };
    }),
  }));
  return { dias, usables };
}

// ── Crear y copiar ───────────────────────────────────────────────────────────
export interface DatosRutinaNueva {
  duenoId: string;
  alumnoId: string | null;
  origenId?: string | null;
  nombre: string;
  descripcion: string | null;
  semanas: number;
  metodoProgresion: MetodoProgresion;
}

export function crearRutina(
  prisma: Db,
  r: DatosRutinaNueva,
  dias: readonly DiaEntrada[],
  usables: Usables,
  ahora: Date,
): Promise<RutinaCompleta> {
  return prisma.rutina.create({
    data: {
      duenoId: r.duenoId,
      alumnoId: r.alumnoId,
      origenId: r.origenId ?? null,
      nombre: r.nombre,
      descripcion: r.descripcion,
      semanas: r.semanas,
      metodoProgresion: r.metodoProgresion,
      estado: 'borrador',
      version: 1,
      createdAt: ahora,
      updatedAt: ahora,
      dias: { create: crearDias(dias, usables, ahora) },
    },
    include: INCLUIR_RUTINA,
  });
}

/** Copia en borrador, versión 1, sin sesiones, con origen_id a la de partida. */
export function copiarRutina(
  prisma: Db,
  origen: RutinaCompleta,
  a: { duenoId: string; alumnoId: string | null; nombre: string },
  ahora: Date,
): Promise<RutinaCompleta> {
  const { dias, usables } = diasDe(origen);
  return crearRutina(
    prisma,
    {
      duenoId: a.duenoId,
      alumnoId: a.alumnoId,
      origenId: origen.id,
      nombre: a.nombre,
      descripcion: origen.descripcion,
      semanas: origen.semanas,
      metodoProgresion: origen.metodoProgresion,
    },
    dias,
    usables,
    ahora,
  );
}

// ── Reemplazar los días (PUT /days) ──────────────────────────────────────────
export async function reemplazarDias(
  prisma: BaseDeDatos,
  rutina: RutinaCompleta,
  dias: readonly DiaEntrada[],
  usables: Usables,
  ahora: Date,
): Promise<void> {
  const diasViejos = new Map(rutina.dias.map((d) => [d.id, d]));
  const ejerciciosViejos = new Map(rutina.dias.flatMap((d) => d.ejercicios.map((x) => [x.id, x] as const)));

  // Los ids que vienen tienen que ser de esta rutina y no repetirse.
  const vistosDia = new Set<string>();
  const vistosEj = new Set<string>();
  dias.forEach((dia, i) => {
    if (dia.id) {
      if (!diasViejos.has(dia.id) || vistosDia.has(dia.id)) campoInvalido(`dias.${i}.id`, 'Ese día no es de esta rutina o viene repetido.');
      vistosDia.add(dia.id);
    }
    dia.ejercicios.forEach((e, j) => {
      if (!e.id) return;
      if (!ejerciciosViejos.has(e.id) || vistosEj.has(e.id)) {
        campoInvalido(`dias.${i}.ejercicios.${j}.id`, 'Ese ejercicio no es de esta rutina o viene repetido.');
      }
      vistosEj.add(e.id);
    });
  });
  // Un id que ahora trae otro ejercicio se toma como nuevo: el hilo de la progresión es por ejercicio.
  const conserva = (e: EjercicioEntrada) => Boolean(e.id && ejerciciosViejos.get(e.id)?.ejercicioId === e.exercise_id);
  const diasQueQuedan = [...vistosDia];
  const ejerciciosQueQuedan = dias.flatMap((d) => d.ejercicios.filter(conserva).map((e) => e.id as string));

  await prisma.$transaction(async (tx) => {
    await tx.ejercicioRutina.updateMany({
      where: { deletedAt: null, dia: { rutinaId: rutina.id }, id: { notIn: ejerciciosQueQuedan } },
      data: { deletedAt: ahora },
    });
    await tx.diaRutina.updateMany({
      where: { rutinaId: rutina.id, deletedAt: null, id: { notIn: diasQueQuedan } },
      data: { deletedAt: ahora },
    });
    for (const [i, dia] of dias.entries()) {
      const datosDia = { orden: i, nombre: dia.nombre, diaSemana: dia.dia_semana ?? null };
      const diaId = dia.id
        ? (await tx.diaRutina.update({ where: { id: dia.id }, data: datosDia, select: { id: true } })).id
        : (await tx.diaRutina.create({ data: { ...datosDia, rutinaId: rutina.id, createdAt: ahora }, select: { id: true } })).id;
      for (const [j, e] of dia.ejercicios.entries()) {
        const datos = { ...datosEjercicio(e, j, usables), diaRutinaId: diaId };
        if (conserva(e)) await tx.ejercicioRutina.update({ where: { id: e.id as string }, data: datos });
        else await tx.ejercicioRutina.create({ data: { ...datos, createdAt: ahora } });
      }
    }
    await tx.rutina.update({
      where: { id: rutina.id },
      data: { updatedAt: ahora, ...(rutina.estado === 'activa' ? { version: { increment: 1 } } : {}) },
    });
  });
}

// ── Activar ──────────────────────────────────────────────────────────────────
/** 422 ROUTINE_EMPTY si no tiene días o algún día no tiene ejercicios. */
export function exigirConEjercicios(r: RutinaCompleta): void {
  const vacios = r.dias.filter((d) => d.ejercicios.length === 0).map((d) => d.id);
  if (r.dias.length === 0 || vacios.length > 0) fallar('ROUTINE_EMPTY', { routine_id: r.id, dias_vacios: vacios });
}

export async function activarRutina(prisma: BaseDeDatos, r: RutinaCompleta, alumnoId: string, ahora: Date): Promise<void> {
  await prisma.perfilAlumno.createMany({ data: [{ usuarioId: alumnoId }], skipDuplicates: true });
  const perfil = await prisma.perfilAlumno.findUniqueOrThrow({ where: { usuarioId: alumnoId }, select: { rutinaActivaId: true } });
  if (r.estado === 'activa' && perfil.rutinaActivaId === r.id) return;
  await prisma.$transaction(async (tx) => {
    // Se toma el perfil solo si sigue como se leyó: si otra activación ganó en el medio, 422.
    // Va en un solo UPDATE con la condición (updateMany de Prisma lee los ids primero y después
    // actualiza por id, y así la segunda no vería el cambio de la primera). SQL fijo, con parámetros.
    const tomado = await tx.$executeRaw`
      UPDATE client_profiles SET rutina_activa_id = ${r.id}::uuid, updated_at = ${ahora}
      WHERE user_id = ${alumnoId}::uuid AND rutina_activa_id IS NOT DISTINCT FROM ${perfil.rutinaActivaId}::uuid`;
    if (tomado === 0) fallar('ACTIVE_ROUTINE_CONFLICT', { routine_id: r.id });
    await tx.rutina.updateMany({
      where: { alumnoId, estado: 'activa', id: { not: r.id } },
      data: { estado: 'archivada', updatedAt: ahora },
    });
    await tx.rutina.update({
      where: { id: r.id },
      data: { estado: 'activa', version: { increment: 1 }, activadaAt: r.activadaAt ?? ahora, updatedAt: ahora },
    });
  });
}

// ── Archivar ─────────────────────────────────────────────────────────────────
export async function archivarRutina(prisma: BaseDeDatos, r: RutinaCompleta, ahora: Date): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const sesiones = await tx.sesionEntreno.count({ where: { rutinaId: r.id } });
    await tx.rutina.update({
      where: { id: r.id },
      data: { estado: 'archivada', updatedAt: ahora, ...(sesiones === 0 ? { deletedAt: ahora } : {}) },
    });
    await tx.perfilAlumno.updateMany({ where: { rutinaActivaId: r.id }, data: { rutinaActivaId: null } });
  });
}
