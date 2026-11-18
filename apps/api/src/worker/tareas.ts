// ─────────────────────────────────────────────────────────────────────────────
// Tareas del worker · Zona: Worker (API)
//
// Qué hace: las tareas que el cron corre de noche, cada una con el «ahora» por parámetro para
// probarlas con reloj fijo (WRK-001 a WRK-017):
//   deteccion  repasa las sesiones cerradas de las últimas 48 horas (estancamiento y baja) y
//              busca a quien lleva 7 días sin entrenar con rutina activa (sin sesiones).
//   purga      borra las cuentas marcadas para borrado hace 30 días, con sus fotos (P-24).
//   noche      las dos, en ese orden. Con avisos, además un correo a cada entrenador con las
//              alertas nuevas de la corrida (sin push: es de madrugada en Chile).
//   recordatorios  el push 30 minutos antes de la hora habitual de cada alumno (P-21); corre
//              cada 5 minutos (src/modulos/notificaciones/recordatorios.ts).
// Y leerArgumentos: `noche|deteccion|purga|recordatorios [--ahora=<ISO>]`. El --ahora solo se acepta fuera de
// producción (SEG-032, P-52): en producción nadie puede adelantar la purga ni las alertas.
// Tócalo cuando: agregues una tarea (resumen semanal P-33).
// No lo toques para: la regla de una alerta (src/modulos/alertas/deteccion.ts) ni qué se purga
// (./purga.ts).
// Depende de: ../modulos/alertas (detección y umbrales), ../modulos/notificaciones y ./purga.
// ─────────────────────────────────────────────────────────────────────────────
import type { BaseDeDatos } from '../db';
import { detectarNoche, type ResultadoDeteccion } from '../modulos/alertas/deteccion';
import { leerUmbrales, type Umbrales } from '../modulos/alertas/umbrales';
import { avisarAlertasDeLaNoche } from '../modulos/notificaciones/eventos';
import { mandarRecordatorios, type ResultadoRecordatorios } from '../modulos/notificaciones/recordatorios';
import type { ServicioAvisos } from '../modulos/notificaciones/servicio';
import type { AdaptadorAlmacenamiento } from '../modulos/progreso/almacenamiento';
import { purgarCuentas, type ResultadoPurga } from './purga';

export const TAREAS = ['noche', 'deteccion', 'purga', 'recordatorios'] as const;
/** Las tareas que mandan avisos: el worker les arma el servicio (./avisos.ts). */
export const TAREAS_CON_AVISOS: readonly Tarea[] = ['noche', 'deteccion', 'recordatorios'];
export type Tarea = (typeof TAREAS)[number];

export interface Argumentos {
  tarea: Tarea;
  ahora?: Date;
}

/** Lee `noche|deteccion|purga [--ahora=<ISO>]`. Lanza un Error con el motivo si algo no calza. */
export function leerArgumentos(argv: readonly string[], entorno: string | undefined): Argumentos {
  let tarea: Tarea = 'noche';
  let ahora: Date | undefined;
  for (const a of argv) {
    if (a.startsWith('--ahora=')) {
      if (entorno === 'production') throw new Error('--ahora no se permite con NODE_ENV=production (SEG-032)');
      const valor = a.slice('--ahora='.length);
      if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) {
        throw new Error('--ahora tiene que ser una fecha ISO 8601 con zona');
      }
      ahora = new Date(valor);
    } else if ((TAREAS as readonly string[]).includes(a)) {
      tarea = a as Tarea;
    } else {
      throw new Error(`Argumento desconocido: ${a}. Uso: noche|deteccion|purga|recordatorios [--ahora=<ISO>]`);
    }
  }
  return { tarea, ahora };
}

export interface ResultadoTareas {
  tarea: Tarea;
  ahora: string;
  deteccion?: ResultadoDeteccion;
  /** Con avisos: cuántas alertas de la corrida y cuántos correos a entrenadores. */
  avisos_noche?: { alertas: number; correos: number };
  recordatorios?: ResultadoRecordatorios;
  purga?: Omit<ResultadoPurga, 'purgadas' | 'pendientes'> & { purgadas: number; pendientes: number };
}

/** Corre la tarea. Devuelve solo conteos (WRK-010), listos para un log. */
export async function correrTarea(
  prisma: BaseDeDatos,
  tarea: Tarea,
  ahora: Date,
  o: {
    umbrales?: Umbrales;
    almacenamiento?: AdaptadorAlmacenamiento;
    log?: (x: Record<string, unknown>) => void;
    /** Sin servicio de avisos, las tareas corren igual y no avisan (así las prueban WRK-001 a 017). */
    avisos?: ServicioAvisos;
  } = {},
): Promise<ResultadoTareas> {
  const r: ResultadoTareas = { tarea, ahora: ahora.toISOString() };
  if (tarea === 'noche' || tarea === 'deteccion') {
    r.deteccion = await detectarNoche(prisma, ahora, o.umbrales ?? leerUmbrales());
    if (o.avisos) r.avisos_noche = await avisarAlertasDeLaNoche(prisma, o.avisos, ahora);
  }
  if (tarea === 'recordatorios') {
    if (!o.avisos) throw new Error('La tarea recordatorios necesita el servicio de avisos');
    r.recordatorios = await mandarRecordatorios(prisma, o.avisos, ahora);
  }
  if (tarea === 'noche' || tarea === 'purga') {
    const p = await purgarCuentas(prisma, ahora, { almacenamiento: o.almacenamiento, log: o.log });
    r.purga = { ...p, purgadas: p.purgadas.length, pendientes: p.pendientes.length };
  }
  return r;
}
