// ─────────────────────────────────────────────────────────────────────────────
// Tipos del dominio · Zona: Datos
//
// Qué hace: define la forma de todo lo que la app guarda y calcula: el ejercicio, la rutina (con
// sus días y lo que prescribe cada uno), la sesión de gimnasio (con sus series), el récord y la
// sugerencia de progresión. También las listas cerradas: grupos musculares, equipos, patrones,
// tipos de carga y métodos. Los comparten la app y, más adelante, la API.
// Tócalo cuando: una rutina, una serie o una sesión necesite un campo nuevo, o cuando haya que
// agregar un grupo muscular, un equipo, un tipo de carga o un método de progresión. Un campo
// nuevo en algo que ya se guarda va opcional (?) o con valor por defecto al leer: los teléfonos
// tienen datos con el esquema viejo y no existe una migración que los convierta.
// No lo toques para: cambiar la regla de progresión o el texto de la sugerencia (progression.ts),
// cómo se detecta un récord o qué pasa al cerrar la sesión (cierre.ts), ni para agregar
// ejercicios a la biblioteca (exercises.seed.ts).
// Depende de: ninguno propio. Es la base que importan el resto de shared, el store y las pantallas.
// ─────────────────────────────────────────────────────────────────────────────

// ── Listas cerradas: grupo, equipo, patrón y tipo de carga ───────────────────
// Cada lista se declara `as const` y su tipo se saca de ahí, así las opciones que ve el usuario
// (los chips del formulario de ejercicio) y el tipo que revisa el compilador nunca se desalinean.
// Para agregar una opción basta con sumarla al arreglo. Para quitar una, ojo: los ejercicios ya
// guardados en los teléfonos pueden tenerla y quedarían con un valor que el tipo no acepta.

/** Grupos musculares con los que se filtra la biblioteca. El texto se muestra tal cual. */
export const GRUPOS = ['Piernas', 'Pecho', 'Espalda', 'Hombros', 'Brazos', 'Core'] as const;
/** Uno de los valores de GRUPOS. */
export type GrupoMuscular = (typeof GRUPOS)[number];

/** Con qué se hace el ejercicio. El texto se muestra tal cual. */
export const EQUIPOS = ['Barra', 'Mancuerna', 'Máquina', 'Polea', 'Peso corporal', 'Kettlebell', 'Banda'] as const;
/** Uno de los valores de EQUIPOS. */
export type Equipo = (typeof EQUIPOS)[number];

/**
 * Patrón de movimiento. Son ids internos (por eso 'tiron' va sin tilde), no texto para el usuario:
 * el nombre que se muestra vive en NOMBRE_PATRON, en apps/mobile/src/components/FormularioEjercicio.tsx.
 */
export const PATRONES = ['empuje', 'tiron', 'rodilla', 'cadera', 'core', 'aislamiento'] as const;
/** Uno de los valores de PATRONES. */
export type Patron = (typeof PATRONES)[number];

/**
 * Cómo se mide el ejercicio. kg: se registra peso y repeticiones. peso_corporal: el peso es lastre
 * (puede ser 0). tiempo: las "reps" son segundos. Define qué cuenta como récord (ver cierre.ts),
 * por eso el store no deja cambiarlo en un ejercicio que ya tiene sesiones cerradas.
 */
export const TIPOS_CARGA = ['kg', 'peso_corporal', 'tiempo'] as const;
/** Uno de los valores de TIPOS_CARGA. */
export type TipoCarga = (typeof TIPOS_CARGA)[number];

// ── Ejercicio ────────────────────────────────────────────────────────────────

/**
 * Un ejercicio de la biblioteca, sea de la base ("base-...") o creado por el usuario.
 * Las rutinas y las sesiones lo referencian por id, así que un id ya publicado nunca se cambia.
 */
export interface Exercise {
  id: string;
  nombre: string;
  grupo: GrupoMuscular;
  equipo: Equipo;
  patron: Patron;
  tipoCarga: TipoCarga;
  /**
   * Cuánto sube la carga cuando la progresión lo indica. 0 en ejercicios sin lastre.
   * Es el valor por defecto: al agregar el ejercicio a una rutina se copia a RoutineExercise
   * y ahí se puede ajustar sin tocar la biblioteca.
   */
  incrementoKg: number;
  instrucciones?: string;
  /** true si lo creó el usuario; false si viene de la biblioteca base. */
  propio: boolean;
  /** Fecha ISO. En la biblioteca base es una fecha fija; en los propios, el momento en que se creó. */
  creadoAt: string;
}

// ── Métodos de progresión ────────────────────────────────────────────────────

/**
 * Los métodos que se pueden elegir para una rutina, con el nombre y la descripción que ve el
 * usuario en el editor. El id es lo que se guarda en Routine.metodo y lo que lee progression.ts.
 * Ojo: en esta versión solo doble progresión y lineal tienen regla propia; los otros cuatro se
 * calculan como doble progresión y la sugerencia lo avisa en su texto. Si agregas uno aquí,
 * dale su regla (y su prueba) en progression.ts, o se va a comportar como doble progresión.
 */
export const METODOS = [
  { id: 'doble_progresion', nombre: 'Doble progresión', descripcion: 'Sube repeticiones dentro del rango; al llegar al tope, sube el peso.' },
  { id: 'lineal', nombre: 'Lineal', descripcion: 'Sube el peso cada sesión mientras completes todas las series.' },
  { id: 'porcentual', nombre: 'Porcentual', descripcion: 'El peso es un porcentaje del 1RM estimado, fijado por semana.' },
  { id: 'por_rm', nombre: 'Por RM', descripcion: 'El objetivo se prescribe como xRM, por ejemplo 5RM.' },
  { id: 'descendentes', nombre: 'Series descendentes', descripcion: 'Serie principal y luego series con 20 % menos de peso.' },
  { id: 'cluster', nombre: 'Cluster', descripcion: 'Bloques de 2 a 3 repeticiones con pausas cortas.' },
] as const;
/** El id de uno de los METODOS ('doble_progresion', 'lineal', ...). */
export type MetodoProgresion = (typeof METODOS)[number]['id'];

// ── Rutina: días y ejercicios prescritos ─────────────────────────────────────

/**
 * Un ejercicio dentro de un día de rutina: lo que el entrenador prescribe (series, rango de
 * repeticiones, RIR, descanso), no lo que el alumno hizo. Lo hecho vive en SessionExercise.
 * Su id es el hilo que une las sesiones de un mismo ejercicio de la rutina: por él se buscan
 * la sesión anterior y la sugerencia vigente (historial.ts).
 */
export interface RoutineExercise {
  id: string;
  /** Id del Exercise en la biblioteca ("base-..." o el uuid de uno propio). */
  exerciseId: string;
  /** Posición dentro del día, desde 0. Se reordena cambiando este número, no moviendo el arreglo. */
  orden: number;
  series: number;
  /** Rango de repeticiones objetivo (o de segundos, si el ejercicio es de tiempo). */
  repsMin: number;
  repsMax: number;
  /** Repeticiones en reserva que se piden. Con RIR menor al objetivo, la serie no cuenta como "al tope". */
  rirObjetivo: number;
  /** Descanso entre series, en segundos. Lo usa el temporizador de la bitácora. */
  descansoS: number;
  /**
   * Cuántos kilos sube la progresión en este ejercicio. Se copia del Exercise al agregarlo a la
   * rutina y después se ajusta acá; el de la biblioteca es solo el valor por defecto.
   * 0 significa sin lastre: se progresa en repeticiones.
   */
  incrementoKg: number;
  /** Peso con el que se parte la primera vez. null: la app lo pide en la sesión. */
  pesoInicialKg: number | null;
  nota?: string;
}

/** Un día de entrenamiento de la rutina (por ejemplo "Empuje A"), con sus ejercicios en orden. */
export interface RoutineDay {
  id: string;
  nombre: string;
  /** Posición dentro de la rutina, desde 0. Marca el ciclo: después del último día vuelve al primero. */
  orden: number;
  ejercicios: RoutineExercise[];
}

/**
 * borrador: recién creada, todavía se está armando. activa: la que toca entrenar y la que muestra
 * Hoy. archivada: ya no se entrena, se conserva por el historial. Hay una sola activa: al activar
 * otra, el store archiva la anterior (activarRutina en useStore.ts).
 */
export type EstadoRutina = 'borrador' | 'activa' | 'archivada';

/**
 * Una rutina completa: método de progresión, duración en semanas y sus días.
 * Al iniciar una sesión, lo prescrito se copia a la sesión; editar la rutina después no cambia
 * lo que ya se registró.
 */
export interface Routine {
  id: string;
  nombre: string;
  descripcion?: string;
  metodo: MetodoProgresion;
  /** Duración planificada. La semana en curso (historial.ts) nunca pasa de este número. */
  semanas: number;
  estado: EstadoRutina;
  dias: RoutineDay[];
  creadoAt: string;
  /** Cuándo se activó por primera vez; desde ahí se cuentan las semanas. */
  activadaAt: string | null;
  actualizadoAt: string;
}

// ── Sesión: series y ejercicios registrados ──────────────────────────────────

/**
 * Una serie que el alumno registró en la bitácora. Es lo que realmente hizo, no lo prescrito.
 * Al cerrar la sesión, las series con completada en false se descartan (cierre.ts).
 */
export interface WorkoutSet {
  id: string;
  /** Número de la serie dentro del ejercicio, desde 1. Al borrar una, el store renumera las demás. */
  serieN: number;
  /** Kilos levantados. En peso corporal es el lastre (0 si no hay); en tiempo no se usa para el volumen. */
  pesoKg: number;
  /** Repeticiones, o segundos si el ejercicio es de tiempo. */
  reps: number;
  /** Repeticiones en reserva que declaró el alumno. null si no marcó. */
  rir: number | null;
  /**
   * true cuando el alumno la marcó como hecha. Solo las completadas cuentan para el volumen,
   * los récords y la progresión.
   */
  completada: boolean;
  /** true si no llegó a las repeticiones que quería. Para la progresión cuenta como "bajo el mínimo". */
  fallo: boolean;
}

/**
 * Un ejercicio dentro de una sesión. Es una foto de lo que decía la rutina al iniciar (objetivo,
 * descanso, nombre): si después se edita la rutina o el ejercicio, esta copia no cambia.
 */
export interface SessionExercise {
  id: string;
  exerciseId: string;
  /** Con qué RoutineExercise se corresponde. null está previsto para un ejercicio agregado suelto. */
  routineExerciseId: string | null;
  orden: number;
  /** Copia del nombre por si el ejercicio cambia después. */
  nombre: string;
  /** Copia del tipo de carga: decide cómo se leen reps y pesoKg de cada serie y qué tipo de récord aplica. */
  tipoCarga: TipoCarga;
  descansoS: number;
  /** Lo prescrito al momento de iniciar. Es lo que el motor de progresión compara con los sets. */
  objetivo: { series: number; repsMin: number; repsMax: number; rirObjetivo: number; incrementoKg: number };
  sets: WorkoutSet[];
  /** Nota libre del alumno sobre este ejercicio en esta sesión. Cadena vacía si no escribió. */
  observacion: string;
}

/**
 * en_curso: se está registrando (el store no deja iniciar otra mientras haya una). cerrada: terminó
 * y ya tiene totales, récords y sugerencias. descartada: está previsto para una sesión abandonada,
 * pero el store todavía no lo usa.
 */
export type EstadoSesion = 'en_curso' | 'cerrada' | 'descartada';

// ── Récords ──────────────────────────────────────────────────────────────────

/**
 * Con qué se mide un récord. Depende solo del tipo de carga del ejercicio (cierre.ts):
 * e1rm para los de kilos (1RM estimado), reps para peso corporal, tiempo (segundos) para los de tiempo.
 */
export type TipoPR = 'e1rm' | 'reps' | 'tiempo';

/** Un récord personal detectado al cerrar una sesión. Se guarda dentro de la sesión en que se hizo. */
export interface PR {
  exerciseId: string;
  /** Copia del nombre del ejercicio, para mostrarlo aunque el ejercicio cambie o se borre. */
  nombre: string;
  tipo: TipoPR;
  /** La marca, en la unidad del tipo: kilos de 1RM estimado, repeticiones o segundos. */
  valor: number;
  /** Lastre con el que se hizo la marca (solo en peso corporal). */
  lastreKg: number;
  /** La marca anterior que superó, o null si es la primera vez que se hace el ejercicio. */
  anterior: number | null;
  /** Id de la serie con la que se logró, para poder resaltarla. */
  setId: string;
  fecha: string;
}

// ── Sugerencia de progresión ─────────────────────────────────────────────────

/**
 * Por qué el motor sugirió lo que sugirió. Sirve para mostrar un tono distinto (subió, mantiene,
 * baja) sin tener que analizar el texto. Cada valor es una rama de sugerirProgresion:
 * tope_del_rango: llegó al máximo de reps con el RIR pedido, sube el peso.
 * dentro_del_rango: va bien pero aún no llega al tope, sube reps con el mismo peso.
 * bajo_el_minimo: una sesión sin llegar al mínimo, mantiene el peso.
 * baja_dos_sesiones: dos sesiones seguidas bajo el mínimo, baja el peso (o pide una variante más fácil).
 * sin_lastre_sube_reps: sin kilos que subir, corre el rango de repeticiones hacia arriba.
 * lineal_sube, lineal_mantiene, lineal_baja: las tres salidas del método lineal.
 */
export type MotivoSugerencia =
  | 'tope_del_rango'
  | 'dentro_del_rango'
  | 'bajo_el_minimo'
  | 'baja_dos_sesiones'
  | 'sin_lastre_sube_reps'
  | 'lineal_sube'
  | 'lineal_mantiene'
  | 'lineal_baja';

/**
 * Lo que la próxima sesión debería intentar en un ejercicio de la rutina. La calcula progression.ts
 * al cerrar, se guarda en la sesión y la lee la siguiente al iniciar (historial.ts).
 * pesoKg, repsMin y repsMax ya vienen ajustados; texto es la frase que se le muestra al alumno.
 */
export interface Sugerencia {
  /** A qué ejercicio de la rutina aplica. Por este id la encuentra la próxima sesión. */
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

// ── Sesión completa ──────────────────────────────────────────────────────────

/**
 * Una sesión de gimnasio, del inicio al cierre. Mientras está en curso los totales van en null;
 * al cerrarla, calcularCierre (cierre.ts) los llena junto con los récords y las sugerencias.
 * routineId en null está previsto para una sesión libre, sin rutina; el store aún no la crea.
 */
export interface WorkoutSession {
  id: string;
  routineId: string | null;
  routineDayId: string | null;
  /** Copia del nombre del día ("Empuje A"), para mostrarla aunque la rutina cambie. */
  nombreDia: string;
  iniciadaAt: string;
  cerradaAt: string | null;
  estado: EstadoSesion;
  ejercicios: SessionExercise[];
  /** Segundos entre iniciadaAt y el cierre. null hasta cerrar. */
  duracionS: number | null;
  /**
   * Suma de peso por repeticiones de las series completadas, sin contar los ejercicios de tiempo.
   * null hasta cerrar.
   */
  volumenKg: number | null;
  /** Estimación por duración y peso corporal del perfil. null hasta cerrar o si el perfil no tiene peso. */
  kcalEstimadas: number | null;
  observacion: string;
  /** Una por ejercicio de la rutina, calculadas al cerrar. Vacío mientras está en curso. */
  sugerencias: Sugerencia[];
  /** Los récords que se hicieron en esta sesión. Vacío mientras está en curso. */
  prs: PR[];
}
