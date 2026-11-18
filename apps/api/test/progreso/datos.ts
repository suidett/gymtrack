// ─────────────────────────────────────────────────────────────────────────────
// Datos de entrenamiento para las pruebas · Zona: Pruebas (API)
//
// Qué hace: arma directo en la base lo que las pruebas de progreso, alertas y entrenador necesitan
// de partida: una rutina (activa o no) con días y ejercicios, y sesiones cerradas con sus series,
// sin pasar por las rutas de rutinas y sesiones (que son de otros módulos). Los ejercicios se
// nombran por slug de la biblioteca base («press-de-banca»).
// Tócalo cuando: varias pruebas necesiten otra forma de dato de partida.
// No lo toques para: escribir una prueba (va en su *.int.test.ts).
// Depende de: la base y las ayudas de test/ayudas.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from 'node:crypto';
import type { BaseDeDatos } from '../../src/db';
import { idEjercicioBase } from '../ayudas';

export const DIA_MS = 86_400_000;
export const haceDias = (base: string | Date, dias: number) => new Date(new Date(base).getTime() - dias * DIA_MS);

export interface EjercicioDePrueba {
  slug: string;
  series?: number;
  repsMin?: number;
  repsMax?: number;
  rir?: number;
  incrementoKg?: number;
}

export interface RutinaDePrueba {
  id: string;
  dias: { id: string; nombre: string; ejercicios: { id: string; ejercicioId: string }[] }[];
}

/** Una rutina con sus días y ejercicios. Activa: queda también en el perfil del alumno. */
export async function crearRutina(
  prisma: BaseDeDatos,
  o: {
    duenoId: string;
    alumnoId: string | null;
    nombre?: string;
    estado?: 'borrador' | 'activa' | 'archivada';
    metodo?: 'doble_progresion' | 'lineal';
    activadaAt?: Date;
    semanas?: number;
    dias: { nombre: string; diaSemana?: number | null; ejercicios: EjercicioDePrueba[] }[];
  },
): Promise<RutinaDePrueba> {
  const estado = o.estado ?? 'activa';
  const rutina = await prisma.rutina.create({
    data: {
      duenoId: o.duenoId,
      alumnoId: o.alumnoId,
      nombre: o.nombre ?? 'Fuerza 4 días',
      semanas: o.semanas ?? 8,
      metodoProgresion: o.metodo ?? 'doble_progresion',
      estado,
      version: 2,
      activadaAt: estado === 'activa' ? (o.activadaAt ?? new Date('2026-10-05T12:00:00Z')) : null,
    },
  });
  const dias: RutinaDePrueba['dias'] = [];
  for (const [i, d] of o.dias.entries()) {
    const dia = await prisma.diaRutina.create({ data: { rutinaId: rutina.id, orden: i + 1, nombre: d.nombre, diaSemana: d.diaSemana ?? null } });
    const ejercicios = [];
    for (const [j, e] of d.ejercicios.entries()) {
      const re = await prisma.ejercicioRutina.create({
        data: {
          diaRutinaId: dia.id, ejercicioId: idEjercicioBase(e.slug), orden: j + 1, series: e.series ?? 3,
          repsMin: e.repsMin ?? 8, repsMax: e.repsMax ?? 10, rirObjetivo: e.rir ?? 2, incrementoKg: e.incrementoKg ?? 2.5,
        },
      });
      ejercicios.push({ id: re.id, ejercicioId: re.ejercicioId });
    }
    dias.push({ id: dia.id, nombre: dia.nombre, ejercicios });
  }
  if (estado === 'activa' && o.alumnoId) {
    await prisma.perfilAlumno.upsert({
      where: { usuarioId: o.alumnoId },
      create: { usuarioId: o.alumnoId, rutinaActivaId: rutina.id },
      update: { rutinaActivaId: rutina.id },
    });
  }
  return { id: rutina.id, dias };
}

export interface SerieDePrueba {
  ejercicioId: string;
  ejercicioRutinaId?: string | null;
  pesoKg: number;
  reps: number;
  rir?: number | null;
  completada?: boolean;
}

/** Una sesión cerrada (o en curso) con sus series. Devuelve el id. */
export async function crearSesion(
  prisma: BaseDeDatos,
  o: {
    alumnoId: string;
    cerradaAt: Date | string | null;
    iniciadaAt?: Date | string;
    rutinaId?: string | null;
    diaRutinaId?: string | null;
    estado?: 'en_curso' | 'cerrada' | 'descartada';
    volumenKg?: number | null;
    series: SerieDePrueba[];
  },
): Promise<string> {
  const id = randomUUID();
  const cerrada = o.cerradaAt ? new Date(o.cerradaAt) : null;
  const iniciada = o.iniciadaAt ? new Date(o.iniciadaAt) : new Date((cerrada ?? new Date()).getTime() - 3_600_000);
  const estado = o.estado ?? (cerrada ? 'cerrada' : 'en_curso');
  const volumen = o.volumenKg !== undefined
    ? o.volumenKg
    : estado === 'cerrada'
      ? o.series.filter((s) => s.completada !== false).reduce((a, s) => a + s.pesoKg * s.reps, 0)
      : null;
  await prisma.sesionEntreno.create({
    data: {
      id, alumnoId: o.alumnoId, rutinaId: o.rutinaId ?? null, diaRutinaId: o.diaRutinaId ?? null, routineVersion: o.rutinaId ? 2 : null,
      iniciadaAt: iniciada, cerradaAt: cerrada, estado, volumenKg: volumen, duracionS: cerrada ? 3600 : null,
    },
  });
  for (const [i, s] of o.series.entries()) {
    await prisma.serie.create({
      data: {
        id: randomUUID(), sesionId: id, alumnoId: o.alumnoId, ejercicioId: s.ejercicioId, ejercicioRutinaId: s.ejercicioRutinaId ?? null,
        serieN: i + 1, pesoKg: s.pesoKg, reps: s.reps, rir: s.rir ?? 2, completada: s.completada ?? true,
      },
    });
  }
  return id;
}

/** n series iguales del mismo ejercicio. */
export const series = (n: number, s: SerieDePrueba): SerieDePrueba[] => Array.from({ length: n }, () => ({ ...s }));
