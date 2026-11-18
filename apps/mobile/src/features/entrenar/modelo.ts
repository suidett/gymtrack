// ─────────────────────────────────────────────────────────────────────────────
// Modelo de Entrenar · Zona: Entrenar
//
// Qué hace: los tipos de lo que maneja el área Entrenar en el celular: lo que llega de
// GET /me/today ya normalizado (Hoy), la sesión en curso guardada en el teléfono (SesionLocal),
// el resumen al cerrar (local y el del servidor) y lo que queda en la cola sin señal.
// Los campos van en snake_case como la API, así el cuerpo que se manda sale casi directo.
// Tócalo cuando: la API agregue un dato que las pantallas necesiten o la sesión local necesite
// un campo nuevo (agrégalo opcional: los teléfonos tienen sesiones guardadas con la forma vieja).
// No lo toques para: cómo se lee la respuesta de la API (contrato.ts) ni las reglas al marcar
// una serie (sesionLocal.ts).
// Depende de: @gymtrack/shared (MetodoProgresion).
// ─────────────────────────────────────────────────────────────────────────────
import type { MetodoProgresion } from '@gymtrack/shared';

// ── Hoy (GET /me/today normalizado) ──────────────────────────────────────────
/** Cómo se ve un día en la semana de Hoy: entrenado, toca hoy, por entrenar o descanso. */
export type MarcaDia = 'hecho' | 'toca' | 'plan' | 'descanso';

/** Lo que se hizo la última vez en un ejercicio: «10 nov · 80 × 8 · 8 · 8 · 7». */
export interface UltimaVezEj {
  fecha: string | null;
  peso_kg: number;
  reps: number[];
}

/** Un ejercicio del día con lo que toca hoy (ya con la sugerencia aplicada). */
export interface EjercicioHoy {
  routine_exercise_id: string | null;
  exercise_id: string;
  nombre: string;
  grupo: string;
  series: number;
  reps_min: number;
  reps_max: number;
  rir_objetivo: number;
  descanso_s: number;
  incremento_kg: number;
  /** Kilos con que parte hoy. null si no hay sugerencia, ni última vez, ni peso inicial. */
  peso_kg: number | null;
  /** Lo que sube respecto de la última vez (el «+2,5»). 0 si repite. */
  sube_kg: number;
  ultima: UltimaVezEj | null;
  /** Récord de peso vigente, para detectar un récord sin señal. */
  record: { peso_kg: number; reps: number; fecha: string | null } | null;
  nota: string | null;
}

export interface DiaHoy {
  routine_day_id: string;
  nombre: string;
  ejercicios: EjercicioHoy[];
  minutos: number | null;
  /** Fecha de la próxima vez, para «Mañana toca Empuje B» o «Jueves 19 de noviembre». */
  fecha: string | null;
}

export interface SesionEnCursoHoy {
  id: string;
  routine_day_id: string | null;
  nombre: string;
  iniciada_at: string | null;
  series_hechas: number;
  series_total: number;
}

export interface Hoy {
  racha_dias: number;
  rutina: { id: string; nombre: string; metodo: MetodoProgresion; version: number | null } | null;
  semana: { actual: number; total: number } | null;
  /** El día que toca hoy. null en día de descanso o sin rutina. */
  dia: DiaHoy | null;
  /** El siguiente día de la rutina (el de mañana en un día de descanso). */
  proximo: DiaHoy | null;
  sesion_en_curso: SesionEnCursoHoy | null;
  /** 7 marcas, de lunes a domingo. */
  semana_dias: MarcaDia[];
  /** Índice de hoy en semana_dias (0 lunes). */
  semana_hoy: number;
  semana_cuenta: { hechas: number; plan: number } | null;
  mes: { sesiones: number; volumen_kg: number; prs: number };
  entrenador: { nombre: string; apellido: string } | null;
  ultima_accion: { texto: string; created_at: string | null; total: number } | null;
  peso_corporal: { kg: number; fecha: string | null } | null;
}

/** El estado de la tarjeta principal de Hoy, como en hoy.html. */
export type EstadoHoy = 'normal' | 'curso' | 'descanso' | 'espera' | 'solo' | 'lista';

// ── Sesión en curso, guardada en el teléfono ─────────────────────────────────
export type EstadoSerie = 'pendiente' | 'hecha' | 'fallada';

export interface SerieLocal {
  id: string;
  serie_n: number;
  peso_kg: number;
  reps: number;
  /** 0 a 4; el 4 se muestra como «4+». */
  rir: number | null;
  estado: EstadoSerie;
  marcada_at: string | null;
}

export interface ObjetivoEj {
  series: number;
  reps_min: number;
  reps_max: number;
  rir_objetivo: number;
  descanso_s: number;
  incremento_kg: number;
}

export interface EjercicioLocal {
  exercise_id: string;
  routine_exercise_id: string | null;
  nombre: string;
  grupo: string;
  objetivo: ObjetivoEj;
  /** Kilos con que partió hoy y cuánto subió respecto de la última vez. */
  peso_hoy_kg: number;
  sube_kg: number;
  ultima: UltimaVezEj | null;
  record: EjercicioHoy['record'];
  series: SerieLocal[];
}

export interface SesionLocal {
  id: string;
  routine_id: string | null;
  routine_day_id: string;
  routine_version: number | null;
  nombre_dia: string;
  metodo: MetodoProgresion;
  semana: { actual: number; total: number } | null;
  /** ISO con la zona del teléfono, como la pide la API. */
  iniciada_at: string;
  iniciada_ms: number;
  ejercicio_actual: number;
  ejercicios: EjercicioLocal[];
  peso_corporal_kg: number | null;
  /** «Camila», para «Camila lo verá en tu ficha». null si entrena solo. */
  entrenador_nombre: string | null;
  device_id: string;
}

// ── Resumen al cerrar ────────────────────────────────────────────────────────
export interface PrVista {
  exercise_id: string;
  nombre: string;
  /** Lo que se muestra: «82,5 kg × 8» o «1RM 63,3 kg». */
  marca: string;
  antes: string | null;
  /** «+2,5 kg». */
  diferencia: string | null;
}

export interface SugerenciaVista {
  routine_exercise_id: string | null;
  nombre: string;
  peso_kg: number | null;
  sube_kg: number;
  reps_min: number;
  reps_max: number;
  /** Por qué: «Llegaste a 8 en las 4 series.» */
  por: string;
}

export interface ResumenCierre {
  series_hechas: number;
  series_total: number;
  volumen_kg: number;
  duracion_s: number;
  kcal: number | null;
  prs: PrVista[];
  sugerencias: SugerenciaVista[];
  /** Ejercicios con series sin marcar, para «Quedaron 2 series sin marcar, de ...». */
  ejercicios_incompletos: string[];
  proxima: { routine_day_id: string | null; nombre: string; fecha: string | null } | null;
}

/** Cómo va la subida de una sesión cerrada. */
export type EstadoEnvio = 'pendiente' | 'enviada' | 'rechazada';

export interface CierreGuardado {
  id: string;
  nombre_dia: string;
  semana: SesionLocal['semana'];
  routine_id: string | null;
  routine_day_id: string;
  cerrada_at: string;
  local: ResumenCierre;
  /** Lo que respondió POST /sessions/:id/finish. Si existe, manda sobre lo local. */
  servidor: ResumenCierre | null;
  envio: EstadoEnvio;
  motivo: string | null;
  observacion: ObservacionGuardada | null;
  entrenador_nombre: string | null;
  peso_corporal: Hoy['peso_corporal'];
}

// ── Observaciones ────────────────────────────────────────────────────────────
export type TipoObservacion = 'observacion' | 'dolor';

export interface ObservacionGuardada {
  tipo: TipoObservacion;
  texto: string;
  zona: string | null;
  intensidad: number | null;
}
