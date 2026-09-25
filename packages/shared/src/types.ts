// Tipos del dominio de GymTrack. Los comparten la app y, más adelante, la API.

export const GRUPOS = ['Piernas', 'Pecho', 'Espalda', 'Hombros', 'Brazos', 'Core'] as const;
export type GrupoMuscular = (typeof GRUPOS)[number];

export const EQUIPOS = ['Barra', 'Mancuerna', 'Máquina', 'Polea', 'Peso corporal', 'Kettlebell', 'Banda'] as const;
export type Equipo = (typeof EQUIPOS)[number];

export const PATRONES = ['empuje', 'tiron', 'rodilla', 'cadera', 'core', 'aislamiento'] as const;
export type Patron = (typeof PATRONES)[number];

/** kg: se registra peso y repeticiones. peso_corporal: el peso es lastre (puede ser 0). tiempo: las "reps" son segundos. */
export const TIPOS_CARGA = ['kg', 'peso_corporal', 'tiempo'] as const;
export type TipoCarga = (typeof TIPOS_CARGA)[number];

export interface Exercise {
  id: string;
  nombre: string;
  grupo: GrupoMuscular;
  equipo: Equipo;
  patron: Patron;
  tipoCarga: TipoCarga;
  /** Cuánto sube la carga cuando la progresión lo indica. 0 en ejercicios sin lastre. */
  incrementoKg: number;
  instrucciones?: string;
  /** true si lo creó el usuario; false si viene de la biblioteca base. */
  propio: boolean;
  creadoAt: string;
}

export const METODOS = [
  { id: 'doble_progresion', nombre: 'Doble progresión', descripcion: 'Sube repeticiones dentro del rango; al llegar al tope, sube el peso.' },
  { id: 'lineal', nombre: 'Lineal', descripcion: 'Sube el peso cada sesión mientras completes todas las series.' },
  { id: 'porcentual', nombre: 'Porcentual', descripcion: 'El peso es un porcentaje del 1RM estimado, fijado por semana.' },
  { id: 'por_rm', nombre: 'Por RM', descripcion: 'El objetivo se prescribe como xRM, por ejemplo 5RM.' },
  { id: 'descendentes', nombre: 'Series descendentes', descripcion: 'Serie principal y luego series con 20 % menos de peso.' },
  { id: 'cluster', nombre: 'Cluster', descripcion: 'Bloques de 2 a 3 repeticiones con pausas cortas.' },
] as const;
export type MetodoProgresion = (typeof METODOS)[number]['id'];

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  orden: number;
  series: number;
  repsMin: number;
  repsMax: number;
  rirObjetivo: number;
  descansoS: number;
  incrementoKg: number;
  /** Peso con el que se parte la primera vez. null: la app lo pide en la sesión. */
  pesoInicialKg: number | null;
  nota?: string;
}

export interface RoutineDay {
  id: string;
  nombre: string;
  orden: number;
  ejercicios: RoutineExercise[];
}

export type EstadoRutina = 'borrador' | 'activa' | 'archivada';

export interface Routine {
  id: string;
  nombre: string;
  descripcion?: string;
  metodo: MetodoProgresion;
  semanas: number;
  estado: EstadoRutina;
  dias: RoutineDay[];
  creadoAt: string;
  /** Cuándo se activó por primera vez; desde ahí se cuentan las semanas. */
  activadaAt: string | null;
  actualizadoAt: string;
}

export interface WorkoutSet {
  id: string;
  serieN: number;
  pesoKg: number;
  /** Repeticiones, o segundos si el ejercicio es de tiempo. */
  reps: number;
  /** Repeticiones en reserva que declaró el alumno. null si no marcó. */
  rir: number | null;
  completada: boolean;
  fallo: boolean;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  routineExerciseId: string | null;
  orden: number;
  /** Copia del nombre por si el ejercicio cambia después. */
  nombre: string;
  tipoCarga: TipoCarga;
  descansoS: number;
  objetivo: { series: number; repsMin: number; repsMax: number; rirObjetivo: number; incrementoKg: number };
  sets: WorkoutSet[];
  observacion: string;
}

export type EstadoSesion = 'en_curso' | 'cerrada' | 'descartada';

export type TipoPR = 'e1rm' | 'reps' | 'tiempo';

export interface PR {
  exerciseId: string;
  nombre: string;
  tipo: TipoPR;
  valor: number;
  /** Lastre con el que se hizo la marca (solo en peso corporal). */
  lastreKg: number;
  anterior: number | null;
  setId: string;
  fecha: string;
}

export type MotivoSugerencia =
  | 'tope_del_rango'
  | 'dentro_del_rango'
  | 'bajo_el_minimo'
  | 'baja_dos_sesiones'
  | 'sin_lastre_sube_reps'
  | 'lineal_sube'
  | 'lineal_mantiene'
  | 'lineal_baja';

export interface Sugerencia {
  routineExerciseId: string;
  exerciseId: string;
  nombre: string;
  metodo: MetodoProgresion;
  pesoKg: number;
  repsMin: number;
  repsMax: number;
  rir: number;
  texto: string;
  motivo: MotivoSugerencia;
}

export interface WorkoutSession {
  id: string;
  routineId: string | null;
  routineDayId: string | null;
  nombreDia: string;
  iniciadaAt: string;
  cerradaAt: string | null;
  estado: EstadoSesion;
  ejercicios: SessionExercise[];
  duracionS: number | null;
  volumenKg: number | null;
  kcalEstimadas: number | null;
  observacion: string;
  sugerencias: Sugerencia[];
  prs: PR[];
}
