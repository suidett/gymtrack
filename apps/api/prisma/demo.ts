// ─────────────────────────────────────────────────────────────────────────────
// Datos de demostración · Zona: Datos (API)
//
// Qué hace: carga en la base de DATABASE_URL una demo lista para revisar la app y la base: 2
// entrenadores y 8 alumnos (6 con entrenador y 2 solos), todos con correo @demo.gymtrack.cl y la
// misma contraseña (CLAVE_DEMO), con encuesta, hora habitual, rutinas armadas con los ejercicios
// base, de 4 a 8 semanas de sesiones con series que progresan, peso y medidas, observaciones,
// récords, sugerencias y alertas. No escribe esas filas a mano: llama a las mismas funciones de
// dominio que usan las rutas (responderEncuesta, crearRutina, copiarRutina, activarRutina,
// iniciarSesion, guardarSeries, cerrarSesion, detectarTrasCierre, crearObservacion,
// crearAlertaSiFalta...) con el «ahora» de cada momento simulado, en orden, así las sugerencias,
// los récords y las alertas salen con las reglas de la API. Cada alumno sigue lo que le sugiere
// la app y rinde según una fuerza que crece, se estanca o baja según su historia (ALUMNOS).
// Las fechas son relativas a hoy en America/Santiago: correrla de nuevo deja la demo al día.
// Es idempotente: primero borra las cuentas @demo.gymtrack.cl con todo lo que depende de ellas y
// después las vuelve a crear. Nunca toca otras cuentas ni los ejercicios base.
//   pnpm --filter api db:demo             # local, después de db:migrar y db:sembrar
//   node dist/demo.js                     # en la imagen (terminal del contenedor de la API)
//   node dist/demo.js --borrar            # solo borra la demo
// Las cuentas y qué mostrar con cada una: docs/DEMO.md.
// Tócalo cuando: cambie la historia de la demo o una regla de la API haga que las alertas salgan
// distintas (revisa el resumen que imprime al terminar).
// No lo toques para: los ejercicios base y los consejos (prisma/semilla.ts) ni los datos de las
// pruebas (test/ayudas).
// Depende de: src/config.ts, src/db.ts, los servicios de src/modulos, src/seguridad/contrasenas.ts
// y @gymtrack/shared. Necesita las migraciones al día y la semilla base (los 67 ejercicios).
// Corre empaquetado con esbuild (dist/demo.js), igual que la semilla.
// ─────────────────────────────────────────────────────────────────────────────
import {
  CONSEJOS_POR_MOTIVO, esquemaContrasena, esquemaEjercicioNuevo, esquemaEncuestaEntrada, esquemaFinSesion,
  esquemaObservacionNueva, esquemaPerfilCambios, esquemaRutinaNueva, esquemaSeriesLote, esquemaSesionNueva,
  esquemaDiasRutina, type EjercicioNuevoApi, type EncuestaRespuestas,
} from '@gymtrack/shared';
import { createHash } from 'node:crypto';
import { uuidV7Fijo } from '../src/compartido/semilla';
import { leerConfig } from '../src/config';
import { crearPrisma, type BaseDeDatos } from '../src/db';
import type { Alerta, MetodoProgresion, MotivoBaja, Prisma, TipoAlerta, TipoCarga, Usuario } from '../src/generado/prisma/client';
import { crearAlertaSiFalta, detectarTrasCierre, limiteSinSesiones } from '../src/modulos/alertas/deteccion';
import { leerUmbrales, type Umbrales } from '../src/modulos/alertas/umbrales';
import { actualizarPerfil, crearInvitacion, responderEncuesta } from '../src/modulos/perfil/servicio';
import { diaLocal, diaSemanaIso, fechaDbDeDia, inicioDelDia, sumarDias } from '../src/modulos/progreso/zona';
import { activarRutina, copiarRutina, crearRutina, reemplazarDias, validarEstructura } from '../src/modulos/rutinas/servicio';
import { INCLUIR_RUTINA, type RutinaCompleta } from '../src/modulos/rutinas/vista';
import { crearObservacion } from '../src/modulos/sesiones/observaciones';
import { cerrarSesion, guardarSeries, iniciarSesion, sesionDelAlumno } from '../src/modulos/sesiones/servicio';
import { relojDelSistema } from '../src/reloj';
import { hashearContrasena } from '../src/seguridad/contrasenas';

// ── Constantes ───────────────────────────────────────────────────────────────
const DOMINIO = 'demo.gymtrack.cl';
/** La contraseña de todas las cuentas de la demo (cumple la política de la API: 8 a 128). */
const CLAVE_DEMO = 'GymTrack2026!';
const ZONA = 'America/Santiago';
const MIN_MS = 60_000;
const HORA_MS = 3_600_000;
const DIA_MS = 86_400_000;
/** Ejercicio propio de Fernanda (no está en la biblioteca base). */
const PATADA = 'patada-de-gluteo-en-polea';
const TIPOS_CON_MOTIVOS: readonly TipoAlerta[] = ['estancamiento', 'baja_rendimiento'];
const GRUPOS_TORSO = new Set(['Pecho', 'Espalda', 'Hombros', 'Brazos']);

// ── Azar con semilla ─────────────────────────────────────────────────────────
/** Números entre 0 y 1 que salen siempre iguales para la misma semilla (la demo se repite igual). */
function azarDe(semilla: string): () => number {
  let h = createHash('sha256').update(semilla).digest().readInt32LE(0);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Fuerza de partida ────────────────────────────────────────────────────────
// Lo que rinde una persona de nivel 1 al partir. En kilos: 1RM estimado como fracción del peso
// corporal (en mancuernas, por mancuerna). En peso corporal: repeticiones al fallo. En tiempo:
// segundos. Cada alumno lo multiplica por su nivel (y por `torso` en pecho, espalda, hombros y brazos).
const KILOS: Record<string, number> = {
  'sentadilla-trasera': 1.35, 'sentadilla-bulgara': 0.3, 'sentadilla-goblet': 0.5, 'prensa-de-piernas': 2.6,
  'extension-de-cuadriceps': 0.75, 'curl-femoral-sentado': 0.55, 'curl-femoral-acostado': 0.5, 'peso-muerto': 1.6,
  'peso-muerto-rumano': 1.1, 'peso-muerto-rumano-mancuernas': 0.36, 'hip-thrust': 1.5, 'zancadas-caminando': 0.25,
  'abductores-maquina': 0.8, 'elevacion-talones-pie': 1.1, 'press-de-banca': 1.0, 'press-inclinado-mancuernas': 0.3,
  'press-con-mancuernas': 0.34, 'press-militar': 0.62, 'press-hombros-mancuernas': 0.24, 'press-hombros-maquina': 0.6,
  'jalon-al-pecho': 0.85, 'remo-con-barra': 0.85, 'remo-con-mancuerna': 0.4, 'remo-en-polea-baja': 0.85,
  'elevaciones-laterales': 0.15, 'face-pull': 0.35, 'curl-con-barra': 0.42, 'curl-con-mancuernas': 0.2,
  'curl-martillo': 0.19, 'extension-triceps-polea': 0.4, 'crunch-en-polea': 0.6, [PATADA]: 0.3,
};
const REPETICIONES: Record<string, number> = { flexiones: 20, dominadas: 9, 'puente-de-gluteo': 32, 'dead-bug': 22 };
const SEGUNDOS: Record<string, number> = { 'plancha-frontal': 65 };

// ── Rutinas ──────────────────────────────────────────────────────────────────
/** [ejercicio, series, reps mín, reps máx, extra]. En los de tiempo, las «reps» son segundos. */
type EjercicioPlan = [slug: string, series: number, repsMin: number, repsMax: number, extra?: { rir?: number; descanso?: number; inc?: number; nota?: string }];
interface DiaPlan {
  nombre: string;
  /** 1 lunes a 7 domingo. Sin valor: la rutina va por ciclo. */
  diaSemana?: number;
  ejercicios: EjercicioPlan[];
}
interface RutinaPlan {
  nombre: string;
  descripcion: string;
  semanas: number;
  metodo: MetodoProgresion;
  dias: DiaPlan[];
}

const RUTINAS = {
  fullBody: {
    nombre: 'Full body 3 días',
    descripcion: 'Tres días por ciclo, cuerpo completo. Doble progresión: llega al tope del rango en todas las series y la app sube el peso.',
    semanas: 8,
    metodo: 'doble_progresion',
    dias: [
      { nombre: 'Día A', ejercicios: [
        ['sentadilla-trasera', 3, 6, 10, { descanso: 150, nota: 'Baja hasta que la cadera quede a la altura de las rodillas.' }],
        ['press-de-banca', 3, 6, 10, { descanso: 150 }],
        ['remo-con-barra', 3, 8, 12, { descanso: 120 }],
        ['elevaciones-laterales', 3, 12, 20, { descanso: 60 }],
        ['plancha-frontal', 3, 30, 45, { descanso: 60 }],
      ] },
      { nombre: 'Día B', ejercicios: [
        ['peso-muerto-rumano', 3, 8, 10, { descanso: 150 }],
        ['press-militar', 3, 6, 10, { descanso: 150 }],
        ['jalon-al-pecho', 3, 8, 12],
        ['zancadas-caminando', 3, 10, 15],
        ['curl-con-mancuernas', 2, 10, 15, { descanso: 60 }],
      ] },
      { nombre: 'Día C', ejercicios: [
        ['prensa-de-piernas', 3, 10, 12, { descanso: 120 }],
        ['press-inclinado-mancuernas', 3, 8, 12],
        ['remo-en-polea-baja', 3, 8, 12],
        ['hip-thrust', 3, 8, 12, { descanso: 120 }],
        ['extension-triceps-polea', 2, 10, 15, { descanso: 60 }],
      ] },
    ],
  },
  torsoPiernaJosefa: {
    nombre: 'Torso / Pierna 4 días',
    descripcion: 'Lunes y jueves torso, martes y viernes pierna. Sin peso muerto convencional por la molestia lumbar.',
    semanas: 8,
    metodo: 'doble_progresion',
    dias: [
      { nombre: 'Torso A', diaSemana: 1, ejercicios: [
        ['press-de-banca', 3, 6, 10, { descanso: 150 }],
        ['remo-con-mancuerna', 3, 8, 12],
        ['press-hombros-mancuernas', 3, 8, 14],
        ['jalon-al-pecho', 3, 8, 12],
        ['curl-martillo', 2, 10, 15, { descanso: 60 }],
      ] },
      { nombre: 'Pierna A', diaSemana: 2, ejercicios: [
        ['sentadilla-trasera', 3, 6, 10, { descanso: 150 }],
        ['peso-muerto-rumano', 3, 8, 10, { descanso: 150, nota: 'Espalda neutra: baja solo hasta media canilla.' }],
        ['extension-de-cuadriceps', 3, 10, 15, { descanso: 60 }],
        ['curl-femoral-sentado', 3, 10, 15, { descanso: 60 }],
        ['elevacion-talones-pie', 3, 12, 20, { descanso: 60 }],
      ] },
      { nombre: 'Torso B', diaSemana: 4, ejercicios: [
        ['press-inclinado-mancuernas', 3, 8, 12],
        ['remo-en-polea-baja', 3, 8, 12],
        ['elevaciones-laterales', 3, 12, 20, { descanso: 60 }],
        ['face-pull', 3, 12, 20, { descanso: 60 }],
        ['extension-triceps-polea', 2, 10, 15, { descanso: 60 }],
      ] },
      { nombre: 'Pierna B', diaSemana: 5, ejercicios: [
        ['hip-thrust', 3, 8, 12, { descanso: 120 }],
        ['prensa-de-piernas', 3, 10, 12, { descanso: 120 }],
        ['sentadilla-bulgara', 3, 8, 12],
        ['abductores-maquina', 3, 12, 20, { descanso: 60 }],
        ['plancha-frontal', 3, 30, 45, { descanso: 60 }],
      ] },
    ],
  },
  adaptacion: {
    nombre: 'Adaptación',
    descripcion: 'Dos semanas para aprender la técnica con mancuernas antes de pasar a la barra.',
    semanas: 2,
    metodo: 'doble_progresion',
    dias: [
      { nombre: 'Día A', ejercicios: [
        ['sentadilla-goblet', 3, 10, 15],
        ['press-con-mancuernas', 3, 8, 12],
        ['remo-con-mancuerna', 3, 8, 12],
        ['plancha-frontal', 2, 20, 30, { descanso: 60 }],
      ] },
      { nombre: 'Día B', ejercicios: [
        ['peso-muerto-rumano-mancuernas', 3, 10, 15],
        ['press-hombros-mancuernas', 3, 8, 14],
        ['jalon-al-pecho', 3, 8, 12],
        ['puente-de-gluteo', 2, 12, 15, { descanso: 60 }],
      ] },
    ],
  },
  fuerza5x5: {
    nombre: 'Fuerza 5×5',
    descripcion: 'Progresión lineal: si completas las 5 series de 5, la próxima sesión sube 2,5 kg (5 kg en peso muerto).',
    semanas: 6,
    metodo: 'lineal',
    dias: [
      { nombre: 'Día A', ejercicios: [
        ['sentadilla-trasera', 5, 5, 5, { rir: 1, descanso: 180, nota: 'Rodillas hacia afuera al subir.' }],
        ['press-de-banca', 5, 5, 5, { rir: 1, descanso: 180 }],
        ['remo-con-barra', 5, 5, 5, { rir: 1, descanso: 150 }],
      ] },
      { nombre: 'Día B', ejercicios: [
        ['sentadilla-trasera', 5, 5, 5, { rir: 1, descanso: 180, nota: 'Rodillas hacia afuera al subir.' }],
        ['press-militar', 5, 5, 5, { rir: 1, descanso: 180 }],
        ['peso-muerto', 1, 5, 5, { rir: 1, descanso: 180 }],
      ] },
    ],
  },
  torsoPiernaTomas: {
    nombre: 'Torso / Pierna intermedio',
    descripcion: 'Cuatro días fijos para quien ya entrena hace años. Dominadas progresando en repeticiones.',
    semanas: 10,
    metodo: 'doble_progresion',
    dias: [
      { nombre: 'Torso A', diaSemana: 1, ejercicios: [
        ['press-de-banca', 4, 6, 8, { descanso: 180 }],
        ['remo-con-barra', 4, 6, 10, { descanso: 150 }],
        ['press-militar', 3, 6, 10, { descanso: 150 }],
        ['jalon-al-pecho', 3, 8, 12],
        ['elevaciones-laterales', 3, 12, 20, { descanso: 60 }],
        ['curl-con-barra', 3, 8, 12, { descanso: 60 }],
      ] },
      { nombre: 'Pierna A', diaSemana: 2, ejercicios: [
        ['sentadilla-trasera', 4, 5, 8, { descanso: 180 }],
        ['peso-muerto-rumano', 3, 8, 10, { descanso: 150 }],
        ['prensa-de-piernas', 3, 10, 12, { descanso: 120 }],
        ['curl-femoral-sentado', 3, 10, 15, { descanso: 60 }],
        ['elevacion-talones-pie', 3, 12, 20, { descanso: 60 }],
      ] },
      { nombre: 'Torso B', diaSemana: 4, ejercicios: [
        ['press-inclinado-mancuernas', 3, 8, 12],
        ['remo-en-polea-baja', 3, 8, 12],
        ['press-hombros-mancuernas', 3, 8, 14],
        ['dominadas', 3, 6, 10, { inc: 0, descanso: 120 }],
        ['extension-triceps-polea', 3, 10, 15, { descanso: 60 }],
        ['curl-martillo', 2, 10, 15, { descanso: 60 }],
      ] },
      { nombre: 'Pierna B', diaSemana: 5, ejercicios: [
        ['peso-muerto', 3, 4, 6, { descanso: 180 }],
        ['sentadilla-bulgara', 3, 8, 12],
        ['hip-thrust', 3, 8, 12, { descanso: 120 }],
        ['extension-de-cuadriceps', 3, 10, 15, { descanso: 60 }],
        ['plancha-frontal', 3, 45, 60, { descanso: 60 }],
      ] },
    ],
  },
  recomposicion: {
    nombre: 'Recomposición 3 días',
    descripcion: 'Tres días por ciclo, sesiones de 45 minutos. Descansos cortos.',
    semanas: 8,
    metodo: 'doble_progresion',
    dias: [
      { nombre: 'Día 1', ejercicios: [
        ['sentadilla-goblet', 3, 10, 15, { descanso: 75 }],
        ['press-con-mancuernas', 3, 8, 12, { descanso: 75 }],
        ['remo-en-polea-baja', 3, 8, 12, { descanso: 75 }],
        ['elevaciones-laterales', 3, 12, 20, { descanso: 45 }],
        ['plancha-frontal', 3, 30, 45, { descanso: 45 }],
      ] },
      { nombre: 'Día 2', ejercicios: [
        ['peso-muerto-rumano-mancuernas', 3, 10, 15, { descanso: 75 }],
        ['jalon-al-pecho', 3, 8, 12, { descanso: 75 }],
        ['zancadas-caminando', 3, 10, 15, { descanso: 75 }],
        ['press-hombros-maquina', 3, 10, 15, { descanso: 75 }],
        ['crunch-en-polea', 3, 12, 20, { descanso: 45 }],
      ] },
      { nombre: 'Día 3', ejercicios: [
        ['prensa-de-piernas', 3, 12, 15, { descanso: 90 }],
        ['hip-thrust', 3, 10, 12, { descanso: 90 }],
        ['remo-con-mancuerna', 3, 8, 12, { descanso: 75 }],
        ['curl-con-mancuernas', 2, 10, 15, { descanso: 45 }],
        ['extension-triceps-polea', 2, 10, 15, { descanso: 45 }],
      ] },
    ],
  },
  gluteoFernanda: {
    nombre: 'Glúteo y pierna 3 días',
    descripcion: 'Mi rutina: dos días de pierna con foco en glúteo y uno de torso.',
    semanas: 8,
    metodo: 'doble_progresion',
    dias: [
      { nombre: 'Glúteo', diaSemana: 1, ejercicios: [
        ['hip-thrust', 4, 8, 12, { descanso: 120 }],
        ['sentadilla-bulgara', 3, 8, 12],
        [PATADA, 3, 12, 20, { descanso: 60 }],
        ['abductores-maquina', 3, 12, 20, { descanso: 60 }],
        ['elevacion-talones-pie', 3, 12, 20, { descanso: 60 }],
      ] },
      { nombre: 'Torso', diaSemana: 3, ejercicios: [
        ['press-con-mancuernas', 3, 8, 12],
        ['jalon-al-pecho', 3, 8, 12],
        ['remo-con-mancuerna', 3, 8, 12],
        ['elevaciones-laterales', 3, 12, 20, { descanso: 60 }],
        ['crunch-en-polea', 3, 12, 20, { descanso: 60 }],
      ] },
      { nombre: 'Pierna', diaSemana: 5, ejercicios: [
        ['sentadilla-trasera', 3, 8, 10, { descanso: 150 }],
        ['peso-muerto-rumano', 3, 8, 10, { descanso: 150 }],
        ['curl-femoral-acostado', 3, 10, 15, { descanso: 60 }],
        ['prensa-de-piernas', 3, 10, 12, { descanso: 120 }],
      ] },
    ],
  },
  casaIgnacio: {
    nombre: 'Full body en casa',
    descripcion: 'Con dos mancuernas ajustables y peso corporal. 45 minutos.',
    semanas: 6,
    metodo: 'doble_progresion',
    dias: [
      { nombre: 'Día A', ejercicios: [
        ['sentadilla-goblet', 3, 10, 15],
        ['flexiones', 3, 6, 12],
        ['remo-con-mancuerna', 3, 8, 12],
        ['press-hombros-mancuernas', 3, 8, 14],
        ['plancha-frontal', 3, 30, 45, { descanso: 60 }],
      ] },
      { nombre: 'Día B', ejercicios: [
        ['peso-muerto-rumano-mancuernas', 3, 10, 15],
        ['zancadas-caminando', 3, 10, 15],
        ['press-con-mancuernas', 3, 8, 12],
        ['curl-martillo', 3, 10, 15, { descanso: 60 }],
        ['puente-de-gluteo', 3, 15, 20, { descanso: 60 }],
        ['dead-bug', 3, 10, 12, { descanso: 45 }],
      ] },
    ],
  },
} satisfies Record<string, RutinaPlan>;

type ClaveRutina = keyof typeof RUTINAS;

// ── Personas ─────────────────────────────────────────────────────────────────
type ClaveEntrenador = 'francisca' | 'tomas';

const ENTRENADORES: readonly { clave: ClaveEntrenador; nombre: string; apellido: string; haceDias: number; plantillas: ClaveRutina[] }[] = [
  { clave: 'francisca', nombre: 'Francisca', apellido: 'Muñoz', haceDias: 75, plantillas: ['fullBody'] },
  { clave: 'tomas', nombre: 'Tomás', apellido: 'Espinoza', haceDias: 70, plantillas: ['torsoPiernaTomas'] },
];

/** Rutinas que son plantilla de un entrenador: al alumno le llega una copia (P-43). */
const PLANTILLAS = new Set<ClaveRutina>(ENTRENADORES.flatMap((e) => e.plantillas));

interface NotaDemo {
  /** La sesión: -1 es la última, -2 la penúltima. Con `ejercicio`, cuenta solo las sesiones que lo tienen. */
  sesion?: number;
  /** O un día fijo después de la última sesión: hace tantos días, a mediodía. */
  haceDias?: number;
  quien: 'alumno' | 'entrenador';
  tipo: 'observacion' | 'dolor' | 'consejo';
  texto: string;
  ejercicio?: string;
  /** Sobre la rutina activa (solo el entrenador o el alumno solo, P-08). */
  rutina?: boolean;
  dolor?: { zona: string; intensidad: number };
  /** Va como la observación del cierre de esa sesión (POST /sessions/:id/finish). */
  alCerrar?: boolean;
}

interface AlumnoDemo {
  clave: string;
  nombre: string;
  apellido: string;
  entrenador: ClaveEntrenador | null;
  encuesta: Omit<EncuestaRespuestas, 'codigo_entrenador'>;
  /** Hora habitual (recordatorio_hora) y a la que parte cada sesión, más o menos 20 minutos. */
  hora: string;
  descansoS: number;
  modoGimnasio: boolean;
  /** Días que entrena (1 lunes a 7 domingo) cuando la rutina va por ciclo. */
  diasSemana: number[];
  /** Las rutinas en orden; la última queda activa. */
  etapas: { rutina: ClaveRutina; semanas: number }[];
  /** La última sesión puede ser como mucho de hace estos días (1: ayer). */
  ultimaHaceDias: number;
  /** Probabilidad de faltar a una sesión. */
  faltas: number;
  /** Nivel de fuerza, factor para el torso y cuánto crece por semana (0,02 = 2 %). */
  fuerza: { nivel: number; torso: number; crecimiento: number };
  pesoPorSemana: number;
  medidas?: { cintura: number; cadera: number; pecho: number; brazo: number; muslo: number; grasa?: number; cinturaPorSemana: number; grasaPorSemana?: number };
  ejercicioPropio?: EjercicioNuevoApi & { clave: string };
  /** Ese ejercicio deja de mejorar desde esa semana. */
  estancado?: { ejercicio: string; desdeSemana: number };
  /** Las últimas sesiones rinde menos y deja la última serie de los dos últimos ejercicios. */
  baja?: { sesiones: number; factor: number };
  dolorGeneral?: { sesion: number; ejercicio?: string; zona: string; intensidad: number; observacion: string };
  /** En esa sesión hace solo esas series del ejercicio (las demás quedan sin completar). */
  corte?: { sesion: number; ejercicio: string; series: number };
  notas?: NotaDemo[];
  /** Responde los motivos de su primera alerta de estancamiento o baja (POST /me/drop-reports). */
  motivos?: { motivos: MotivoBaja[]; comentario: string };
  /** El entrenador abre sus alertas recientes a las pocas horas (quedan vistas). */
  entrenadorVeAlTiro?: boolean;
  /** Lo que escribe el entrenador al resolver una alerta de ese tipo. */
  consejoAlResolver?: Partial<Record<TipoAlerta, string>>;
  /** El entrenador sobrescribe la próxima sugerencia de ese ejercicio con una nota. */
  sobrescribir?: { ejercicio: string; nota: string };
}

const ALUMNOS: readonly AlumnoDemo[] = [
  {
    clave: 'valentina', nombre: 'Valentina', apellido: 'Soto', entrenador: 'francisca',
    encuesta: {
      objetivo: 'ganar_masa', experiencia: 'uno_a_tres_anos', dias_semana: 3, lugar: 'gimnasio_completo', minutos_sesion: 60,
      fecha_nacimiento: '1999-04-12', altura_cm: 164, peso_kg: 59.5, lesiones: { zonas: ['ninguna'] },
    },
    hora: '19:00', descansoS: 90, modoGimnasio: false, diasSemana: [1, 3, 5],
    etapas: [{ rutina: 'fullBody', semanas: 7 }], ultimaHaceDias: 1, faltas: 0.06,
    fuerza: { nivel: 0.9, torso: 0.8, crecimiento: 0.022 }, pesoPorSemana: 0.12,
    medidas: { cintura: 68, cadera: 96, pecho: 88, brazo: 27, muslo: 55, cinturaPorSemana: -0.05 },
    notas: [
      { sesion: -7, quien: 'alumno', tipo: 'observacion', texto: 'Dormí ocho horas y la sentadilla se sintió liviana. Creo que la próxima puedo subir.' },
      { sesion: -7, quien: 'entrenador', tipo: 'consejo', texto: '¡Bien, Vale! Cuando completes el tope del rango en las tres series, la app te sube 2,5 kg. Cuida la profundidad.' },
      { sesion: -1, quien: 'alumno', tipo: 'observacion', ejercicio: 'hip-thrust', texto: 'El hip thrust cada vez más firme, ya no se me levanta la espalda.' },
    ],
    sobrescribir: { ejercicio: 'sentadilla-trasera', nota: 'Mantén este peso una sesión más y baja hasta paralelo en todas las repeticiones.' },
  },
  {
    clave: 'benjamin', nombre: 'Benjamín', apellido: 'Araya', entrenador: 'francisca',
    encuesta: {
      objetivo: 'salud_general', experiencia: 'menos_de_un_ano', dias_semana: 3, lugar: 'gimnasio_completo', minutos_sesion: 60,
      fecha_nacimiento: '1995-09-03', altura_cm: 178, peso_kg: 82, lesiones: { zonas: ['ninguna'] },
    },
    hora: '07:00', descansoS: 120, modoGimnasio: true, diasSemana: [2, 4, 6],
    etapas: [{ rutina: 'fullBody', semanas: 6 }], ultimaHaceDias: 1, faltas: 0.08,
    fuerza: { nivel: 0.85, torso: 1, crecimiento: 0.02 }, pesoPorSemana: 0.2,
    estancado: { ejercicio: 'press-de-banca', desdeSemana: 1.5 },
    notas: [
      { sesion: -9, quien: 'alumno', tipo: 'observacion', alCerrar: true, texto: 'Llegué con el tiempo justo, pero hice todo.' },
      { sesion: -2, quien: 'alumno', tipo: 'observacion', ejercicio: 'press-de-banca', texto: 'Siento que no avanzo en banca: hace semanas que repito el mismo peso y la última serie no sale.' },
    ],
  },
  {
    clave: 'josefa', nombre: 'Josefa', apellido: 'Contreras', entrenador: 'francisca',
    encuesta: {
      objetivo: 'bajar_grasa', experiencia: 'uno_a_tres_anos', dias_semana: 4, lugar: 'gimnasio_completo', minutos_sesion: 60,
      fecha_nacimiento: '2001-11-25', altura_cm: 160, peso_kg: 63,
      lesiones: { zonas: ['espalda_baja'], texto: 'Molestia lumbar cuando hago peso muerto convencional.' },
    },
    hora: '18:30', descansoS: 90, modoGimnasio: false, diasSemana: [],
    etapas: [{ rutina: 'torsoPiernaJosefa', semanas: 6 }], ultimaHaceDias: 1, faltas: 0.05,
    fuerza: { nivel: 0.85, torso: 0.75, crecimiento: 0.018 }, pesoPorSemana: -0.25,
    medidas: { cintura: 74, cadera: 100, pecho: 90, brazo: 28, muslo: 57, cinturaPorSemana: -0.2 },
    baja: { sesiones: 2, factor: 0.9 },
    notas: [
      { sesion: -6, quien: 'entrenador', tipo: 'consejo', texto: 'Muy buena semana, Jose. En el peso muerto rumano mantén la espalda neutra y baja solo hasta media canilla.' },
      { sesion: -1, quien: 'alumno', tipo: 'observacion', texto: 'Semana de certámenes: dormí cinco horas y me costó todo.' },
    ],
    motivos: { motivos: ['sueno', 'estres'], comentario: 'Semana de certámenes en la universidad, dormí muy poco.' },
    entrenadorVeAlTiro: true,
  },
  {
    clave: 'matias', nombre: 'Matías', apellido: 'Pizarro', entrenador: 'francisca',
    encuesta: {
      objetivo: 'ganar_masa', experiencia: 'nunca', dias_semana: 3, lugar: 'gimnasio_completo', minutos_sesion: 60,
      fecha_nacimiento: '2004-02-17', altura_cm: 175, peso_kg: 74,
      lesiones: { zonas: ['rodilla'], texto: 'Me molesta la rodilla izquierda cuando juego fútbol.' },
    },
    hora: '20:00', descansoS: 120, modoGimnasio: true, diasSemana: [1, 3, 5],
    etapas: [{ rutina: 'adaptacion', semanas: 2 }, { rutina: 'fuerza5x5', semanas: 5 }], ultimaHaceDias: 1, faltas: 0.05,
    fuerza: { nivel: 0.75, torso: 0.9, crecimiento: 0.035 }, pesoPorSemana: 0.3,
    corte: { sesion: -1, ejercicio: 'sentadilla-trasera', series: 3 },
    notas: [
      { sesion: -8, quien: 'entrenador', tipo: 'consejo', texto: 'Matías, en la sentadilla empuja las rodillas hacia afuera y no dejes que se vayan hacia adentro al subir.' },
      {
        sesion: -1, quien: 'alumno', tipo: 'dolor', ejercicio: 'sentadilla-trasera', dolor: { zona: 'Rodilla izquierda', intensidad: 8 },
        texto: 'Al empezar la cuarta serie de sentadilla sentí una puntada en la rodilla izquierda y paré.',
      },
    ],
  },
  {
    clave: 'catalina', nombre: 'Catalina', apellido: 'Vergara', entrenador: 'tomas',
    encuesta: {
      objetivo: 'bajar_grasa', experiencia: 'menos_de_un_ano', dias_semana: 3, lugar: 'gimnasio_basico', minutos_sesion: 45,
      fecha_nacimiento: '1992-06-30', altura_cm: 168, peso_kg: 74, lesiones: { zonas: ['ninguna'] },
    },
    hora: '08:00', descansoS: 75, modoGimnasio: false, diasSemana: [2, 4, 6],
    etapas: [{ rutina: 'recomposicion', semanas: 6 }], ultimaHaceDias: 9, faltas: 0.1,
    fuerza: { nivel: 0.75, torso: 0.7, crecimiento: 0.022 }, pesoPorSemana: -0.45,
    medidas: { cintura: 86, cadera: 104, pecho: 98, brazo: 31, muslo: 60, grasa: 32, cinturaPorSemana: -0.6, grasaPorSemana: -0.3 },
    notas: [
      { sesion: -3, quien: 'alumno', tipo: 'observacion', texto: 'Esta semana se me complicó el trabajo, entrené más corto.' },
      {
        haceDias: 2, quien: 'entrenador', tipo: 'consejo', rutina: true,
        texto: 'Catalina, ¿cómo vas? Si se te complica la semana, haz aunque sea el día 1 en 40 minutos. Lo importante es no cortar.',
      },
    ],
  },
  {
    clave: 'joaquin', nombre: 'Joaquín', apellido: 'Morales', entrenador: 'tomas',
    encuesta: {
      objetivo: 'ganar_masa', experiencia: 'mas_de_tres_anos', dias_semana: 4, lugar: 'gimnasio_completo', minutos_sesion: 90,
      fecha_nacimiento: '1990-01-08', altura_cm: 181, peso_kg: 86,
      lesiones: { zonas: ['hombro'], texto: 'Tendinitis en el hombro derecho hace dos años.' },
    },
    hora: '06:45', descansoS: 150, modoGimnasio: true, diasSemana: [],
    etapas: [{ rutina: 'torsoPiernaTomas', semanas: 8 }], ultimaHaceDias: 1, faltas: 0.04,
    fuerza: { nivel: 1.15, torso: 1.05, crecimiento: 0.015 }, pesoPorSemana: 0.05,
    medidas: { cintura: 86, cadera: 99, pecho: 106, brazo: 37, muslo: 59, grasa: 17, cinturaPorSemana: 0, grasaPorSemana: -0.05 },
    dolorGeneral: { sesion: -3, ejercicio: 'press-militar', zona: 'Hombro derecho', intensidad: 7, observacion: 'Molestia en el hombro derecho con el press militar.' },
    consejoAlResolver: { dolor: 'Esta semana baja un 10 % el press militar y agrega face pull al final. Si vuelve la molestia, avísame antes de entrenar.' },
    notas: [
      { sesion: -1, quien: 'alumno', tipo: 'observacion', texto: 'El hombro ya no molesta. Volví a mis pesos de siempre.' },
    ],
  },
  {
    clave: 'fernanda', nombre: 'Fernanda', apellido: 'Castillo', entrenador: null,
    encuesta: {
      objetivo: 'ganar_masa', experiencia: 'uno_a_tres_anos', dias_semana: 3, lugar: 'gimnasio_completo', minutos_sesion: 60,
      fecha_nacimiento: '1997-08-21', altura_cm: 166, peso_kg: 61, lesiones: { zonas: ['ninguna'] },
    },
    hora: '18:00', descansoS: 90, modoGimnasio: false, diasSemana: [],
    etapas: [{ rutina: 'gluteoFernanda', semanas: 5 }], ultimaHaceDias: 1, faltas: 0.06,
    fuerza: { nivel: 0.95, torso: 0.75, crecimiento: 0.022 }, pesoPorSemana: 0.1,
    estancado: { ejercicio: 'sentadilla-bulgara', desdeSemana: 0.5 },
    ejercicioPropio: {
      clave: PATADA, nombre: 'Patada de glúteo en polea', grupo_muscular: 'Piernas', equipo: 'Polea', patron: 'cadera',
      tipo_carga: 'kg', incremento_default_kg: 2.5, instrucciones: 'Tobillera en la polea baja. Empuja el talón hacia atrás sin arquear la espalda.',
    },
    notas: [
      { sesion: -5, quien: 'alumno', tipo: 'observacion', rutina: true, texto: 'Cambié el torso al miércoles: los lunes el gimnasio está lleno.' },
      { sesion: -1, quien: 'alumno', tipo: 'observacion', ejercicio: 'hip-thrust', texto: 'Hip thrust cada vez más pesado y con mejor técnica.' },
    ],
    motivos: { motivos: ['tiempo'], comentario: 'Tuve mucho trabajo y entrené apurada.' },
  },
  {
    clave: 'ignacio', nombre: 'Ignacio', apellido: 'Reyes', entrenador: null,
    encuesta: {
      objetivo: 'salud_general', experiencia: 'nunca', dias_semana: 3, lugar: 'casa_mancuernas', minutos_sesion: 45,
      fecha_nacimiento: '2000-12-02', altura_cm: 172, peso_kg: 79, lesiones: { zonas: ['ninguna'] },
    },
    hora: '21:00', descansoS: 60, modoGimnasio: false, diasSemana: [1, 4, 6],
    etapas: [{ rutina: 'casaIgnacio', semanas: 4 }], ultimaHaceDias: 1, faltas: 0.08,
    fuerza: { nivel: 0.6, torso: 0.8, crecimiento: 0.03 }, pesoPorSemana: -0.3,
    notas: [
      { sesion: -4, quien: 'alumno', tipo: 'observacion', texto: 'Entrené en la pieza con las mancuernas. Me faltan más pesadas para el remo.' },
      { sesion: -1, quien: 'alumno', tipo: 'observacion', alCerrar: true, texto: 'Buena sesión, 45 minutos justos.' },
    ],
  },
];

// ── Fechas ───────────────────────────────────────────────────────────────────
/** El instante de las HH:MM (en minutos) de ese día en la zona de Chile. */
function instanteLocal(dia: string, minutos: number): Date {
  return new Date(inicioDelDia(dia, ZONA).getTime() + minutos * MIN_MS);
}

const minutosDe = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
const mas = (t: Date, ms: number) => new Date(t.getTime() + ms);
const redondear1 = (n: number) => Math.round(n * 10) / 10;

/** Un id UUID v7 con la hora `t` (el mismo para la misma semilla), como los que genera el celular. */
const idEn = (t: Date, semilla: string) => uuidV7Fijo(t, `demo:${semilla}`);

// ── Agenda ───────────────────────────────────────────────────────────────────
/** Lo que pasa entre sesiones (respuestas del entrenador, motivos), en orden de hora. */
class Agenda {
  private lista: { t: number; n: number; hacer: () => Promise<void> }[] = [];
  private n = 0;

  poner(t: Date, hacer: () => Promise<void>): void {
    this.lista.push({ t: t.getTime(), n: this.n++, hacer });
  }

  async correrHasta(t: Date): Promise<void> {
    for (;;) {
      this.lista.sort((a, b) => a.t - b.t || a.n - b.n);
      const siguiente = this.lista[0];
      if (!siguiente || siguiente.t > t.getTime()) return;
      this.lista.shift();
      await siguiente.hacer();
    }
  }
}

// ── Contexto ─────────────────────────────────────────────────────────────────
interface Contexto {
  prisma: BaseDeDatos;
  /** El ahora real: nada de la demo queda después. */
  ahora: Date;
  hoy: string;
  umbrales: Umbrales;
  /** slug → id de los ejercicios base (y los propios de la demo). */
  ejercicios: Map<string, string>;
  slugs: Map<string, string>;
  /** slug → lo que hace falta para calcular cargas e incrementos. */
  info: Map<string, InfoEjercicio>;
  hashClave: string;
}

interface InfoEjercicio {
  grupoMuscular: string;
  equipo: string;
  tipoCarga: TipoCarga;
  incrementoDefaultKg: number;
}

function idEjercicio(ctx: Contexto, slug: string): string {
  const id = ctx.ejercicios.get(slug);
  if (!id) throw new Error(`No está el ejercicio «${slug}». Corre la semilla base antes (node dist/semilla.js).`);
  return id;
}

// ── Borrar la demo ───────────────────────────────────────────────────────────
/**
 * Borra las cuentas @demo.gymtrack.cl con todo lo que depende de ellas (las relaciones de la base
 * borran en cascada). Antes saca las series, las sesiones y las rutinas, porque un ejercicio
 * propio de la demo no se puede borrar mientras una serie o una rutina lo usa (RESTRICT).
 */
async function borrarDemo(prisma: BaseDeDatos): Promise<number> {
  const cuentas = await prisma.usuario.findMany({ where: { email: { endsWith: `@${DOMINIO}` } }, select: { id: true } });
  const ids = cuentas.map((c) => c.id);
  if (ids.length === 0) return 0;
  await prisma.$transaction(async (tx) => {
    await tx.serie.deleteMany({ where: { alumnoId: { in: ids } } });
    await tx.sesionEntreno.deleteMany({ where: { alumnoId: { in: ids } } });
    await tx.rutina.deleteMany({ where: { OR: [{ duenoId: { in: ids } }, { alumnoId: { in: ids } }] } });
    await tx.usuario.deleteMany({ where: { id: { in: ids } } });
  }, { timeout: 120_000, maxWait: 30_000 });
  return ids.length;
}

// ── Cuentas ──────────────────────────────────────────────────────────────────
async function crearCuenta(ctx: Contexto, p: { clave: string; nombre: string; apellido: string; rol: 'trainer' | 'client'; creadaAt: Date }): Promise<Usuario> {
  const email = `${p.clave}@${DOMINIO}`;
  return ctx.prisma.usuario.create({
    data: {
      id: uuidV7Fijo(p.creadaAt, `demo:usuario:${email}`),
      email, nombre: p.nombre, apellido: p.apellido, rol: p.rol, passwordHash: ctx.hashClave, timezone: ZONA,
      createdAt: p.creadaAt, updatedAt: p.creadaAt,
    },
  });
}

// ── Armar rutinas e incrementos ──────────────────────────────────────────────
/**
 * Arma la rutina con el mismo esquema de POST /routines y la guarda en borrador (crearRutina).
 * Para un alumno, en doble progresión, cada incremento queda a la medida de su peso de trabajo.
 */
async function armarRutina(
  ctx: Contexto, plan: RutinaPlan, d: { duenoId: string; alumnoId: string | null }, t: Date, alumno?: AlumnoDemo,
): Promise<RutinaCompleta> {
  const entrada = esquemaRutinaNueva.parse({
    nombre: plan.nombre,
    descripcion: plan.descripcion,
    metodo_progresion: plan.metodo,
    semanas: plan.semanas,
    dias: plan.dias.map((dia) => ({
      nombre: dia.nombre,
      dia_semana: dia.diaSemana ?? null,
      ejercicios: dia.ejercicios.map(([slug, series, repsMin, repsMax, x]) => {
        const rir = x?.rir ?? 2;
        const inc = x?.inc ?? (alumno && plan.metodo !== 'lineal' ? incrementoPara(alumno, slug, infoDe(ctx, slug), series, repsMin, repsMax, rir) : undefined);
        return {
          exercise_id: idEjercicio(ctx, slug), series, reps_min: repsMin, reps_max: repsMax,
          rir_objetivo: rir, descanso_s: x?.descanso ?? 90, nota_entrenador: x?.nota ?? null,
          ...(inc !== undefined ? { incremento_kg: inc } : {}),
        };
      }),
    })),
  });
  const usables = await validarEstructura(ctx.prisma, entrada.dias, d);
  return crearRutina(
    ctx.prisma,
    { ...d, nombre: entrada.nombre, descripcion: entrada.descripcion || null, semanas: entrada.semanas, metodoProgresion: entrada.metodo_progresion },
    entrada.dias, usables, t,
  );
}

/**
 * La copia de una plantilla con los incrementos a la medida del alumno: el entrenador la ajusta
 * con PUT /routines/:id/days (reemplazarDias, conserva los ids) antes de activarla.
 */
async function ajustarCopia(ctx: Contexto, copia: RutinaCompleta, alumno: AlumnoDemo, t: Date): Promise<RutinaCompleta> {
  let cambia = false;
  const dias = copia.dias.map((d) => ({
    id: d.id, nombre: d.nombre, dia_semana: d.diaSemana,
    ejercicios: d.ejercicios.map((x) => {
      const slug = ctx.slugs.get(x.ejercicioId)!;
      const inc = copia.metodoProgresion === 'lineal' ? x.incrementoKg : incrementoPara(alumno, slug, infoDe(ctx, slug), x.series, x.repsMin, x.repsMax, x.rirObjetivo);
      if (inc !== x.incrementoKg) cambia = true;
      return {
        id: x.id, exercise_id: x.ejercicioId, series: x.series, reps_min: x.repsMin, reps_max: x.repsMax, rir_objetivo: x.rirObjetivo,
        descanso_s: x.descansoS, incremento_kg: inc, peso_inicial_kg: x.pesoInicialKg, esquema: x.esquema,
        grupo_superserie: x.grupoSuperserie, nota_entrenador: x.notaEntrenador, porcentajes_semana: x.porcentajesSemana, objetivo_rm: x.objetivoRm,
      };
    }),
  }));
  if (!cambia) return copia;
  const entrada = esquemaDiasRutina.parse({ dias });
  const usables = await validarEstructura(ctx.prisma, entrada.dias, { duenoId: copia.duenoId, alumnoId: copia.alumnoId, rutinaId: copia.id });
  await reemplazarDias(ctx.prisma, copia, entrada.dias, usables, t);
  return ctx.prisma.rutina.findUniqueOrThrow({ where: { id: copia.id }, include: INCLUIR_RUTINA });
}

function infoDe(ctx: Contexto, slug: string): InfoEjercicio {
  const info = ctx.info.get(slug);
  if (!info) throw new Error(`No está el ejercicio «${slug}»`);
  return info;
}

/** Repeticiones que se pierden por serie en kilos (en peso corporal, una entera). */
const CANSANCIO_KG = 0.3;

/** Los saltos de carga que permite cada equipo, del más grande al más chico. */
const SALTOS: Record<string, number[]> = { Barra: [2.5], Mancuerna: [2, 1], Máquina: [5, 2.5], Polea: [5, 2.5, 1.25], Kettlebell: [4, 2] };

/**
 * El incremento que pondría un entrenador: el salto más grande del equipo que cabe en el rango de
 * repeticiones. Cabe si, al llegar al tope en todas las series con el RIR objetivo, con el peso
 * nuevo la última serie todavía llega al mínimo (con un 10 % de margen). Si ninguno cabe
 * (laterales de 3 kg), 0: ese ejercicio progresa en repeticiones.
 */
function incrementoPara(a: AlumnoDemo, slug: string, ej: InfoEjercicio, series: number, repsMin: number, repsMax: number, rir: number): number {
  if (ej.tipoCarga !== 'kg') return 0;
  const peso = capacidad(a, slug, ej, 0, 1) / (1 + (repsMin + 1 + rir) / 30);
  const cansancio = CANSANCIO_KG * (series - 1);
  const cabe = ((1 + (repsMax + rir + cansancio) / 30) / (1 + (repsMin + cansancio) / 30) - 1) * 0.9;
  for (const salto of SALTOS[ej.equipo] ?? [ej.incrementoDefaultKg]) if (salto / peso <= cabe) return salto;
  return 0;
}

// ── Rendimiento del alumno ───────────────────────────────────────────────────
interface Prescripcion {
  pesoKg: number;
  repsMin: number;
  repsMax: number;
}

type EjercicioDeRutina = RutinaCompleta['dias'][number]['ejercicios'][number];

/**
 * Lo que rinde hoy: 1RM estimado (kg), repeticiones al fallo (peso corporal) o segundos (tiempo).
 * La fuerza crece `crecimiento` por semana; en peso corporal las repeticiones crecen como manda
 * Epley con esa misma fuerza (no en la misma proporción), y el tiempo, el triple.
 */
function capacidad(a: AlumnoDemo, slug: string, ej: Pick<InfoEjercicio, 'grupoMuscular' | 'tipoCarga'>, semanas: number, factor: number): number {
  const torso = GRUPOS_TORSO.has(ej.grupoMuscular) ? a.fuerza.torso : 1;
  const estancado = a.estancado?.ejercicio === slug;
  const w = estancado ? Math.min(semanas, a.estancado!.desdeSemana) : semanas;
  const crece = 1 + a.fuerza.crecimiento * w;
  // El ejercicio estancado rinde igual cada sesión: así se ve en los números.
  const f = estancado && semanas > a.estancado!.desdeSemana ? Math.min(1, factor) : factor;
  if (ej.tipoCarga === 'kg') {
    const base = KILOS[slug];
    if (base === undefined) throw new Error(`Falta la fuerza de partida de «${slug}»`);
    return base * a.encuesta.peso_kg * a.fuerza.nivel * torso * crece * f;
  }
  if (ej.tipoCarga === 'peso_corporal') {
    const base = REPETICIONES[slug];
    if (base === undefined) throw new Error(`Falta la fuerza de partida de «${slug}»`);
    return 30 * ((1 + (base * a.fuerza.nivel * torso) / 30) * crece * f - 1);
  }
  const base = SEGUNDOS[slug];
  if (base === undefined) throw new Error(`Falta la fuerza de partida de «${slug}»`);
  return base * a.fuerza.nivel * (1 + 3 * a.fuerza.crecimiento * w) * f;
}

/** El salto más chico del equipo: con él se redondea el peso de partida. */
const pasoDe = (equipo: string) => SALTOS[equipo]?.at(-1) ?? 1;

/** El primer peso cuando no hay sugerencia ni peso anterior: el que deja hacer el mínimo del rango más uno. */
function prescripcionInicial(re: EjercicioDeRutina, metodo: MetodoProgresion, cap: number): Prescripcion {
  if (re.ejercicio.tipoCarga !== 'kg') return { pesoKg: 0, repsMin: re.repsMin, repsMax: re.repsMax };
  if (re.incrementoKg === 0) {
    // Sin incremento: el más pesado con el que la última serie llega al mínimo (no se queda corto
    // de peso desde el primer día).
    const paso = pasoDe(re.ejercicio.equipo);
    const cansancio = CANSANCIO_KG * (re.series - 1);
    const ideal = cap / (1 + (re.repsMin + 1 + cansancio) / 30);
    const arriba = Math.ceil(ideal / paso) * paso;
    const llega = 30 * (cap / arriba - 1) - cansancio >= re.repsMin;
    return { pesoKg: llega ? arriba : Math.max(paso, Math.floor(ideal / paso) * paso), repsMin: re.repsMin, repsMax: re.repsMax };
  }
  const inc = re.incrementoKg;
  const objetivo = Math.min(re.repsMax, re.repsMin + 1) + re.rirObjetivo;
  let peso = cap / (1 + objetivo / 30);
  if (metodo === 'lineal') peso *= 0.85; // la lineal parte liviana y sube cada sesión
  const minimo = re.ejercicio.equipo === 'Barra' ? 20 : inc;
  return { pesoKg: Math.max(minimo, Math.floor(peso / inc) * inc), repsMin: re.repsMin, repsMax: re.repsMax };
}

/**
 * Las series que sale a hacer con lo prescrito: cada una al RIR objetivo, con un poco de cansancio
 * por serie. Si el ejercicio sube de peso, para en el tope del rango; si progresa en repeticiones
 * (incremento 0, peso corporal), hace las que le dé (en kilos, hasta 4 sobre el tope). Si no llega
 * al mínimo, aprieta hasta cerca del fallo y queda como serie fallida.
 */
function hacerSeries(tipo: TipoCarga, p: Prescripcion, re: Pick<EjercicioDeRutina, 'rirObjetivo' | 'incrementoKg' | 'repsMax'>, cap: number, n: number) {
  const series: { pesoKg: number; reps: number; rir: number | null; fallo: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    if (tipo === 'tiempo') {
      series.push({ pesoKg: 0, reps: Math.max(10, Math.round(cap * 0.9 - 4 * i)), rir: null, fallo: false });
      continue;
    }
    const disponible = tipo === 'kg' ? 30 * (cap / Math.max(p.pesoKg, 0.5) - 1) - CANSANCIO_KG * i : cap - i;
    let reps = Math.floor(disponible - re.rirObjetivo);
    // Con incremento para en el tope del rango; sin incremento sigue, pero nadie hace 30 laterales.
    const tope = tipo !== 'kg' ? Infinity : re.incrementoKg > 0 ? p.repsMax : re.repsMax + 4;
    if (reps > tope) reps = tope;
    if (reps < p.repsMin) reps = Math.max(1, Math.min(p.repsMin, Math.floor(disponible)));
    const rir = Math.max(0, Math.min(5, Math.floor(disponible - reps)));
    series.push({ pesoKg: p.pesoKg, reps, rir, fallo: reps < p.repsMin });
  }
  return series;
}

// ── Un alumno de punta a punta ───────────────────────────────────────────────
interface SesionPlaneada {
  fecha: string;
  etapa: number;
  dia: number;
  slugs: string[];
}

/** Los días que entrena en cada etapa: los fijos de la rutina o sus días por ciclo, con alguna falta. */
function planificarSesiones(ctx: Contexto, a: AlumnoDemo, inicio: string): SesionPlaneada[] {
  const azar = azarDe(`faltas:${a.clave}`);
  const salida: SesionPlaneada[] = [];
  let desde = inicio;
  a.etapas.forEach((etapa, k) => {
    const plan: RutinaPlan = RUTINAS[etapa.rutina];
    const ultima = k === a.etapas.length - 1;
    const hasta = ultima ? sumarDias(ctx.hoy, -a.ultimaHaceDias) : sumarDias(desde, 7 * etapa.semanas - 1);
    const fijos = plan.dias.some((d) => d.diaSemana);
    let siguiente = 0;
    for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
      const iso = diaSemanaIso(f);
      const dia = fijos ? plan.dias.findIndex((d) => d.diaSemana === iso) : a.diasSemana.includes(iso) ? siguiente : -1;
      if (dia < 0) continue;
      // Falta a algunas (nunca a las dos últimas, que cuentan la historia del final).
      const alFinal = f > sumarDias(hasta, -6);
      if (!alFinal && azar() < a.faltas) continue;
      salida.push({ fecha: f, etapa: k, dia, slugs: plan.dias[dia]!.ejercicios.map((e) => e[0]) });
      if (!fijos) siguiente = (siguiente + 1) % plan.dias.length;
    }
    desde = sumarDias(desde, 7 * etapa.semanas);
  });
  return salida;
}

/** El índice de la sesión de una nota: -1 es la última (con ejercicio, la última que lo tiene). */
function indiceDe(sesiones: readonly SesionPlaneada[], sesion: number, ejercicio?: string): number | null {
  const candidatas = sesiones.map((s, i) => ({ s, i })).filter(({ s }) => !ejercicio || s.slugs.includes(ejercicio));
  return candidatas[candidatas.length + sesion]?.i ?? null;
}

interface ResumenAlumno {
  email: string;
  nombre: string;
  entrenador: string | null;
  rutina: string;
  sesiones: number;
}

/** Lo que anota el entrenador al resolver (PATCH /alerts/:id). «cargas» solo va donde de verdad baja una carga. */
const ACCIONES_POR_TIPO: Record<TipoAlerta, ('cargas' | 'consejo' | 'rutina' | 'nada')[]> = {
  estancamiento: ['consejo'],
  baja_rendimiento: ['consejo'],
  dolor: ['consejo', 'cargas'],
  sin_sesiones: ['consejo'],
};

const CONSEJO_POR_TIPO: Record<TipoAlerta, string> = {
  estancamiento: 'Mantén el peso y apunta a una repetición más por serie. Si en dos sesiones no sale, lo ajustamos.',
  baja_rendimiento: 'Vi la baja de esta semana. Prioriza dormir bien y repite los pesos la próxima sesión.',
  dolor: 'Si la molestia sigue, baja el peso y avísame antes de la próxima sesión.',
  sin_sesiones: 'Te extrañamos en el gimnasio. ¿Te acomoda otro horario esta semana?',
};

async function cargarAlumno(
  ctx: Contexto,
  a: AlumnoDemo,
  entrenadores: Map<ClaveEntrenador, Usuario>,
  plantillas: Map<ClaveRutina, RutinaCompleta>,
): Promise<ResumenAlumno> {
  const { prisma } = ctx;
  const azar = azarDe(`sesiones:${a.clave}`);
  const agenda = new Agenda();
  const totalSemanas = a.etapas.reduce((s, e) => s + e.semanas, 0);
  const inicio = sumarDias(ctx.hoy, -7 * totalSemanas);
  const entrenador = a.entrenador ? entrenadores.get(a.entrenador)! : null;
  const dispositivo = uuidV7Fijo(instanteLocal(inicio, 0), `demo:dispositivo:${a.clave}`);

  // ── Cuenta, encuesta (con el código del entrenador) y perfil ────────────────
  const creada = instanteLocal(sumarDias(inicio, -4), 20 * 60 + 15);
  let usuario = await crearCuenta(ctx, { clave: a.clave, nombre: a.nombre, apellido: a.apellido, rol: 'client', creadaAt: creada });
  const tEncuesta = instanteLocal(sumarDias(inicio, -3), 21 * 60);
  const codigo = entrenador ? (await crearInvitacion(prisma, entrenador.id, mas(tEncuesta, -2 * HORA_MS))).codigo : null;
  await responderEncuesta(
    prisma, usuario,
    esquemaEncuestaEntrada.parse({ respuestas: { ...a.encuesta, codigo_entrenador: codigo }, consentimiento_salud: true, politica_version: '1' }),
    tEncuesta, () => undefined,
  );
  // El primer peso lo deja la encuesta (pregunta 8).
  await prisma.medidaCorporal.updateMany({ where: { alumnoId: usuario.id }, data: { createdAt: tEncuesta, updatedAt: tEncuesta } });
  await actualizarPerfil(prisma, usuario, esquemaPerfilCambios.parse({
    descanso_default_s: a.descansoS, modo_gimnasio: a.modoGimnasio, recordatorio_activo: true, recordatorio_hora: a.hora,
  }));
  usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });

  if (a.ejercicioPropio) {
    const { clave, ...cuerpo } = a.ejercicioPropio;
    const e = esquemaEjercicioNuevo.parse(cuerpo);
    const t = instanteLocal(sumarDias(inicio, -2), 19 * 60);
    const fila = await prisma.ejercicio.create({
      data: {
        duenoId: usuario.id, nombre: e.nombre, grupoMuscular: e.grupo_muscular, equipo: e.equipo, patron: e.patron,
        tipoCarga: e.tipo_carga, incrementoDefaultKg: e.incremento_default_kg, instrucciones: e.instrucciones ?? null,
        createdAt: t, updatedAt: t,
      },
    });
    ctx.ejercicios.set(clave, fila.id);
    ctx.slugs.set(fila.id, clave);
    ctx.info.set(clave, { grupoMuscular: fila.grupoMuscular, equipo: fila.equipo, tipoCarga: fila.tipoCarga, incrementoDefaultKg: fila.incrementoDefaultKg });
  }

  // ── Peso y medidas: una vez por semana, hasta su última sesión ──────────────
  const sesiones = planificarSesiones(ctx, a, inicio);
  const ultimoDia = sesiones.at(-1)?.fecha ?? ctx.hoy;
  const azarMedidas = azarDe(`medidas:${a.clave}`);
  for (let w = 0; sumarDias(inicio, 7 * w) <= ultimoDia; w++) {
    const fecha = sumarDias(inicio, 7 * w);
    const t = instanteLocal(fecha, 7 * 60 + 20);
    const m = a.medidas;
    const conMedidas = m && w % 2 === 0;
    const datos = {
      pesoKg: redondear1(a.encuesta.peso_kg + a.pesoPorSemana * (w + 0.5) + (azarMedidas() - 0.5) * 0.6),
      ...(conMedidas ? {
        cinturaCm: redondear1(m.cintura + m.cinturaPorSemana * w),
        caderaCm: redondear1(m.cadera + m.cinturaPorSemana * 0.7 * w),
        pechoCm: redondear1(m.pecho + a.pesoPorSemana * 0.3 * w),
        brazoCm: redondear1(m.brazo + a.pesoPorSemana * 0.15 * w),
        musloCm: redondear1(m.muslo + a.pesoPorSemana * 0.2 * w),
        ...(m.grasa !== undefined ? { grasaPct: redondear1(m.grasa + (m.grasaPorSemana ?? 0) * w) } : {}),
      } : {}),
      nota: w === 0 ? 'En ayunas.' : null,
    };
    await prisma.medidaCorporal.upsert({
      where: { alumnoId_fecha: { alumnoId: usuario.id, fecha: fechaDbDeDia(fecha) } },
      create: { alumnoId: usuario.id, fecha: fechaDbDeDia(fecha), ...datos, createdAt: t, updatedAt: t },
      update: datos,
    });
  }

  // ── Las notas, ubicadas en su sesión ────────────────────────────────────────
  const notasPorSesion = new Map<number, NotaDemo[]>();
  const notasSueltas: NotaDemo[] = [];
  for (const nota of a.notas ?? []) {
    if (nota.haceDias !== undefined) { notasSueltas.push(nota); continue; }
    const i = indiceDe(sesiones, nota.sesion ?? -1, nota.ejercicio);
    if (i === null) throw new Error(`${a.clave}: no hay sesión para la nota «${nota.texto.slice(0, 30)}…»`);
    notasPorSesion.set(i, [...(notasPorSesion.get(i) ?? []), nota]);
  }
  const iDolorGeneral = a.dolorGeneral ? indiceDe(sesiones, a.dolorGeneral.sesion, a.dolorGeneral.ejercicio) : null;
  const iCorte = a.corte ? indiceDe(sesiones, a.corte.sesion, a.corte.ejercicio) : null;

  // ── Alertas: lo que hacen el entrenador y el alumno después ─────────────────
  const programadas = new Set<string>();
  let motivosDados = false;
  let rutina: RutinaCompleta | null = null;
  const plan = new Map<string, Prescripcion>();

  const observar = async (autor: Usuario, t: Date, semilla: string, cuerpo: Record<string, unknown>) => {
    const entrada = esquemaObservacionNueva.parse({ id: idEn(t, `${a.clave}:obs:${semilla}`), ...cuerpo });
    const { observacion } = await crearObservacion(prisma, autor, entrada);
    // Un dolor de 7 o más dejó su alerta con la hora real: va a la de la observación.
    await prisma.alerta.updateMany({ where: { alumnoId: usuario.id, tipo: 'dolor', detalle: { path: ['observation_id'], equals: observacion.id } }, data: { createdAt: t } });
  };

  const vista = (al: Alerta, t: Date) => agenda.poner(t, async () => {
    const fila = await prisma.alerta.findUniqueOrThrow({ where: { id: al.id } });
    if (fila.estado === 'nueva') await prisma.alerta.update({ where: { id: al.id }, data: { estado: 'vista', vistaAt: t } });
  });

  /** Lo mismo que PATCH /alerts/:id con estado resuelta y sus acciones. */
  const resolver = (al: Alerta, t: Date) => agenda.poner(t, async () => {
    const fila = await prisma.alerta.findUniqueOrThrow({ where: { id: al.id } });
    if (fila.estado === 'resuelta' || !entrenador) return;
    const acciones = ACCIONES_POR_TIPO[fila.tipo];
    const detalle = (fila.detalle && typeof fila.detalle === 'object' && !Array.isArray(fila.detalle) ? fila.detalle : {}) as Record<string, unknown>;
    await prisma.alerta.update({
      where: { id: fila.id },
      data: {
        estado: 'resuelta', resueltaAt: t, vistaAt: fila.vistaAt ?? mas(t, -20 * MIN_MS),
        detalle: { ...detalle, resolucion: { acciones, por: entrenador.id, at: t.toISOString() } } as Prisma.InputJsonValue,
      },
    });
    if (acciones.includes('consejo')) {
      const texto = a.consejoAlResolver?.[fila.tipo] ?? CONSEJO_POR_TIPO[fila.tipo];
      const sesionId = typeof detalle.session_id === 'string' ? detalle.session_id : null;
      await observar(entrenador, mas(t, 2 * MIN_MS), `resuelve:${fila.id}`, {
        tipo: 'consejo', texto, ...(sesionId ? { session_id: sesionId } : { routine_id: rutina!.id }),
      });
    }
    // El dolor general no trae ejercicio: la carga que baja es la del ejercicio que lo provocó.
    const conDolor = fila.ejercicioId ?? (a.dolorGeneral?.ejercicio ? idEjercicio(ctx, a.dolorGeneral.ejercicio) : null);
    if (acciones.includes('cargas') && conDolor) await bajarCarga(conDolor, t);
  });

  /** «Ajustar cargas» (PATCH /suggestions/:id): la próxima sugerencia de ese ejercicio baja un 10 %. */
  const bajarCarga = async (ejercicioId: string, t: Date) => {
    const sug = await prisma.sugerenciaProgresion.findFirst({
      where: { alumnoId: usuario.id, estado: 'pendiente', ejercicioRutina: { ejercicioId } },
      include: { ejercicioRutina: true }, orderBy: { createdAt: 'desc' },
    });
    if (!sug || !entrenador) return;
    const v = sug.sugerencia as { peso_kg: number; reps_min: number; reps_max: number; rir: number | null };
    const inc = sug.ejercicioRutina.incrementoKg > 0 ? sug.ejercicioRutina.incrementoKg : 1;
    const peso = Math.max(inc, Math.floor((v.peso_kg * 0.9) / inc) * inc);
    if (!(peso < v.peso_kg)) return;
    const final = { peso_kg: peso, reps_min: sug.ejercicioRutina.repsMin, reps_max: v.reps_max, rir: v.rir, nota: 'Bajamos un 10 % por la molestia. Si no duele, la próxima vuelves al peso de antes.' };
    await prisma.sugerenciaProgresion.update({
      where: { id: sug.id },
      data: { estado: 'sobrescrita', valorFinal: final, sobrescritaPor: { connect: { id: entrenador.id } }, sobrescritaAt: t },
    });
    plan.set(sug.ejercicioRutinaId, { pesoKg: final.peso_kg, repsMin: final.reps_min, repsMax: final.reps_max });
  };

  /** Lo mismo que POST /me/drop-reports: guarda los motivos y los consejos que se le mostraron. */
  const reportar = (al: Alerta, t: Date, m: NonNullable<AlumnoDemo['motivos']>) => agenda.poner(t, async () => {
    const fila = await prisma.alerta.findUniqueOrThrow({ where: { id: al.id }, include: { reporte: true } });
    if (fila.reporte || fila.estado === 'resuelta') return;
    const consejos = (await Promise.all(m.motivos.map((motivo) =>
      prisma.consejo.findMany({ where: { motivo }, orderBy: { orden: 'asc' }, take: CONSEJOS_POR_MOTIVO })))).flat();
    await prisma.reporteBaja.create({
      data: { alumnoId: usuario.id, alertaId: fila.id, motivos: m.motivos, comentario: m.comentario, consejosMostrados: consejos.map((c) => c.id), createdAt: t },
    });
  });

  /**
   * Cada alerta nueva: el alumno responde sus motivos si le toca; el entrenador resuelve las de
   * más de una semana (al día siguiente), deja vistas las de 3 a 7 días y las recientes quedan nuevas.
   */
  const programarAlertas = async () => {
    const nuevas = await prisma.alerta.findMany({ where: { alumnoId: usuario.id, id: { notIn: [...programadas] } }, orderBy: { createdAt: 'asc' } });
    for (const al of nuevas) {
      programadas.add(al.id);
      const edad = ctx.ahora.getTime() - al.createdAt.getTime();
      if (a.motivos && !motivosDados && TIPOS_CON_MOTIVOS.includes(al.tipo)) {
        motivosDados = true;
        reportar(al, mas(al.createdAt, 3 * HORA_MS), a.motivos);
      }
      if (!entrenador) continue;
      if (edad > 7 * DIA_MS) resolver(al, mas(al.createdAt, 26 * HORA_MS));
      else if (edad > 3 * DIA_MS) vista(al, mas(al.createdAt, 20 * HORA_MS));
      else if (a.entrenadorVeAlTiro) vista(al, mas(al.createdAt, 6 * HORA_MS));
    }
  };

  // ── Las sesiones, en orden ──────────────────────────────────────────────────
  let primera: Date | null = null;
  let ultimaCerrada: Date | null = null;
  const horaBase = minutosDe(a.hora);
  for (const [i, s] of sesiones.entries()) {
    const desdeFinal = i - sesiones.length;
    const inicioSesion = instanteLocal(s.fecha, horaBase + Math.round((azar() - 0.5) * 40));

    // Una etapa nueva: el entrenador (o el alumno solo) arma la rutina el día antes y la activa.
    if (!rutina || sesiones[i - 1]?.etapa !== s.etapa) {
      const tRutina = instanteLocal(sumarDias(s.fecha, -1), 12 * 60 + 30);
      await agenda.correrHasta(tRutina);
      const clave = a.etapas[s.etapa]!.rutina;
      const dueno = entrenador ?? usuario;
      // La plantilla se asigna como copia (POST /routines/:id/assign) y se ajusta para el alumno.
      const nueva = PLANTILLAS.has(clave)
        ? await ajustarCopia(ctx, await copiarRutina(prisma, plantillas.get(clave)!, { duenoId: dueno.id, alumnoId: usuario.id, nombre: RUTINAS[clave].nombre }, tRutina), a, mas(tRutina, 15 * MIN_MS))
        : await armarRutina(ctx, RUTINAS[clave], { duenoId: dueno.id, alumnoId: usuario.id }, tRutina, a);
      await activarRutina(prisma, nueva, usuario.id, tRutina);
      rutina = await prisma.rutina.findUniqueOrThrow({ where: { id: nueva.id }, include: INCLUIR_RUTINA });
    }
    await agenda.correrHasta(inicioSesion);
    primera ??= inicioSesion;
    const metodo = rutina.metodoProgresion;
    const dia = rutina.dias[s.dia]!;

    // Cómo llega hoy: un día bueno o malo, la semana de baja o el dolor.
    const semanas = (inicioSesion.getTime() - primera.getTime()) / (7 * DIA_MS);
    const enBaja = a.baja !== undefined && desdeFinal >= -a.baja.sesiones;
    let factor = 1 + (azar() - 0.5) * 0.01;
    if (enBaja) factor *= a.baja!.factor;
    if (i === iDolorGeneral) factor *= 0.95;

    let t = mas(inicioSesion, 5 * MIN_MS);
    const series: Record<string, unknown>[] = [];
    for (const [j, re] of dia.ejercicios.entries()) {
      const slug = ctx.slugs.get(re.ejercicioId)!;
      // Un aislado liviano que no sube de peso (laterales de 3 kg) mejora más lento en repeticiones.
      const enReps = re.ejercicio.tipoCarga === 'kg' && re.incrementoKg === 0;
      const cap = capacidad(a, slug, re.ejercicio, enReps ? semanas / 2 : semanas, factor);
      const p = plan.get(re.id) ?? prescripcionInicial(re, metodo, cap);
      plan.set(re.id, p);
      let hechas = re.series;
      if (enBaja && j >= dia.ejercicios.length - 2) hechas -= 1;
      if (i === iCorte && slug === a.corte!.ejercicio) hechas = a.corte!.series;
      const resultado = hacerSeries(re.ejercicio.tipoCarga, p, re, cap, re.series);
      resultado.forEach((x, k) => {
        const tSerie = mas(t, 40_000);
        const completada = k < hechas;
        series.push({
          id: idEn(tSerie, `${a.clave}:${i}:${re.id}:${k}`), exercise_id: re.ejercicioId, routine_exercise_id: re.id,
          serie_n: k + 1, peso_kg: x.pesoKg, reps: x.reps, rir: completada ? x.rir : null, completada, fallo: completada && x.fallo,
        });
        t = mas(tSerie, (re.descansoS + Math.round((azar() - 0.5) * 30)) * 1000);
      });
      t = mas(t, 75_000);
    }
    const cierre = mas(t, 3 * MIN_MS);
    const id = idEn(inicioSesion, `${a.clave}:sesion:${i}`);
    const notas = notasPorSesion.get(i) ?? [];
    const alCerrar = notas.find((n) => n.alCerrar);
    const dolor = i === iDolorGeneral ? a.dolorGeneral! : null;

    // Lo mismo que POST /sync/sessions: iniciar, guardar las series y cerrar en una transacción.
    await prisma.$transaction(async (tx) => {
      await iniciarSesion(tx, usuario.id, esquemaSesionNueva.parse({
        id, routine_day_id: dia.id, iniciada_at: inicioSesion.toISOString(), device_id: dispositivo,
      }), inicioSesion);
      await guardarSeries(tx, await sesionDelAlumno(tx, id, usuario.id), esquemaSeriesLote.parse({ series }));
      await cerrarSesion(tx, await sesionDelAlumno(tx, id, usuario.id), esquemaFinSesion.parse({
        cerrada_at: cierre.toISOString(),
        duracion_s: Math.round((cierre.getTime() - inicioSesion.getTime()) / 1000),
        observacion: dolor?.observacion ?? alCerrar?.texto ?? null,
        dolor_general: dolor ? { zona: dolor.zona, intensidad: dolor.intensidad } : null,
        device_id: dispositivo,
      }), cierre);
    }, { timeout: 60_000, maxWait: 30_000 });
    if (dolor) {
      await prisma.alerta.updateMany({ where: { alumnoId: usuario.id, tipo: 'dolor', ejercicioId: null, detalle: { path: ['session_id'], equals: id } }, data: { createdAt: cierre } });
    }
    // Lo que corre la API después del cierre: estancamiento y baja.
    await detectarTrasCierre(prisma, id, ctx.umbrales, cierre);
    ultimaCerrada = cierre;

    // Lo que precarga la próxima sesión: la sugerencia que dejó el cierre (como Hoy).
    for (const sug of await prisma.sugerenciaProgresion.findMany({ where: { sesionId: id } })) {
      const v = sug.sugerencia as { peso_kg: number; reps_min: number; reps_max: number };
      plan.set(sug.ejercicioRutinaId, { pesoKg: v.peso_kg, repsMin: v.reps_min, repsMax: v.reps_max });
    }

    // Observaciones de esta sesión: el alumno al terminar, el entrenador unas horas después.
    for (const [k, nota] of notas.entries()) {
      if (nota.alCerrar) continue;
      const cuerpo = {
        tipo: nota.tipo, texto: nota.texto,
        ...(nota.rutina ? { routine_id: rutina.id } : { session_id: id }),
        ...(nota.ejercicio ? { exercise_id: idEjercicio(ctx, nota.ejercicio) } : {}),
        ...(nota.dolor ? { dolor_zona: nota.dolor.zona, dolor_intensidad: nota.dolor.intensidad } : {}),
      };
      if (nota.quien === 'alumno') {
        await observar(usuario, mas(cierre, (4 + k) * MIN_MS), `${i}:${k}`, cuerpo);
      } else if (entrenador) {
        const tNota = new Date(Math.min(mas(cierre, 3 * HORA_MS).getTime(), ctx.ahora.getTime() - 10 * MIN_MS));
        agenda.poner(tNota, () => observar(entrenador, tNota, `${i}:${k}`, cuerpo));
      }
    }
    await programarAlertas();
  }

  // ── Después de la última sesión ─────────────────────────────────────────────
  // La corrida de la noche (07:00 UTC) busca a quien lleva 7 días sin entrenar, como
  // detectarSinSesiones pero solo para este alumno: la de verdad recorre toda la base.
  if (rutina && ultimaCerrada) {
    const referencia = new Date(Math.max(ultimaCerrada.getTime(), rutina.activadaAt?.getTime() ?? 0));
    const limite = limiteSinSesiones(referencia, ZONA, ctx.umbrales.sinSesionesDias);
    let noche = new Date(Date.UTC(limite.getUTCFullYear(), limite.getUTCMonth(), limite.getUTCDate(), 7));
    if (noche < limite) noche = mas(noche, DIA_MS);
    if (noche <= ctx.ahora) {
      await agenda.correrHasta(noche);
      await crearAlertaSiFalta(prisma, {
        alumnoId: usuario.id, tipo: 'sin_sesiones', ejercicioId: null,
        detalle: {
          dias: Math.floor((noche.getTime() - referencia.getTime()) / DIA_MS),
          ultima_sesion_at: ultimaCerrada.toISOString(), desde: referencia.toISOString(), routine_id: rutina.id,
        },
      }, noche);
      await programarAlertas();
    }
  }
  for (const [k, nota] of notasSueltas.entries()) {
    const autor = nota.quien === 'entrenador' ? entrenador : usuario;
    if (!autor || !rutina) continue;
    const t = instanteLocal(sumarDias(ctx.hoy, -(nota.haceDias ?? 0)), 12 * 60 + 10);
    const rutinaId = rutina.id;
    agenda.poner(t, () => observar(autor, t, `suelta:${k}`, { tipo: nota.tipo, texto: nota.texto, routine_id: rutinaId }));
  }
  if (a.sobrescribir && entrenador && rutina && ultimaCerrada) {
    const { ejercicio, nota } = a.sobrescribir;
    const t = new Date(Math.min(mas(ultimaCerrada, 14 * HORA_MS).getTime(), ctx.ahora.getTime() - HORA_MS));
    const rutinaId = rutina.id;
    agenda.poner(t, async () => {
      const sug = await prisma.sugerenciaProgresion.findFirst({
        where: { alumnoId: usuario.id, estado: 'pendiente', ejercicioRutina: { ejercicioId: idEjercicio(ctx, ejercicio), dia: { rutinaId } } },
        orderBy: { createdAt: 'desc' },
      });
      if (!sug) return;
      const v = sug.sugerencia as { peso_kg: number; reps_min: number; reps_max: number; rir: number | null };
      await prisma.sugerenciaProgresion.update({
        where: { id: sug.id },
        data: {
          estado: 'sobrescrita', valorFinal: { peso_kg: v.peso_kg, reps_min: v.reps_min, reps_max: v.reps_max, rir: v.rir, nota },
          sobrescritaPor: { connect: { id: entrenador.id } }, sobrescritaAt: t,
        },
      });
    });
  }
  await agenda.correrHasta(ctx.ahora);

  return {
    email: usuario.email,
    nombre: `${a.nombre} ${a.apellido}`,
    entrenador: entrenador ? `${entrenador.nombre} ${entrenador.apellido}` : null,
    rutina: rutina?.nombre ?? '(sin rutina)',
    sesiones: sesiones.length,
  };
}

// ── Fechas en la base ────────────────────────────────────────────────────────
/**
 * Los servicios dejan created_at y updated_at con la hora real de la carga (default now() y
 * @updatedAt). Aquí quedan con la hora simulada: la de los ids UUID v7 (que llevan la hora en sus
 * primeros 48 bits, como los del celular) o la del dato que los define (cierre, fecha del récord).
 * Solo filas de las cuentas de la demo; SQL fijo con parámetros.
 */
async function ajustarFechas(prisma: BaseDeDatos, alumnos: string[], entrenadores: string[]): Promise<void> {
  const todos = [...alumnos, ...entrenadores];
  await prisma.$executeRaw`
    UPDATE workout_sessions
    SET created_at = to_timestamp(('x' || lpad(substr(replace(id::text, '-', ''), 1, 12), 16, '0'))::bit(64)::bigint / 1000.0),
        updated_at = COALESCE(cerrada_at, iniciada_at)
    WHERE client_id = ANY(${alumnos}::uuid[])`;
  await prisma.$executeRaw`
    UPDATE workout_sets
    SET created_at = to_timestamp(('x' || lpad(substr(replace(id::text, '-', ''), 1, 12), 16, '0'))::bit(64)::bigint / 1000.0),
        updated_at = to_timestamp(('x' || lpad(substr(replace(id::text, '-', ''), 1, 12), 16, '0'))::bit(64)::bigint / 1000.0)
    WHERE client_id = ANY(${alumnos}::uuid[])`;
  await prisma.$executeRaw`
    UPDATE observations
    SET created_at = to_timestamp(('x' || lpad(substr(replace(id::text, '-', ''), 1, 12), 16, '0'))::bit(64)::bigint / 1000.0)
    WHERE client_id = ANY(${alumnos}::uuid[])`;
  await prisma.$executeRaw`UPDATE personal_records SET created_at = fecha WHERE client_id = ANY(${alumnos}::uuid[])`;
  await prisma.$executeRaw`
    UPDATE progression_suggestions p
    SET created_at = s.cerrada_at, updated_at = GREATEST(s.cerrada_at, p.aplicada_at, p.sobrescrita_at)
    FROM workout_sessions s
    WHERE s.id = p.session_id AND s.cerrada_at IS NOT NULL AND p.client_id = ANY(${alumnos}::uuid[])`;
  await prisma.$executeRaw`UPDATE alerts SET updated_at = GREATEST(created_at, vista_at, resuelta_at) WHERE client_id = ANY(${alumnos}::uuid[])`;
  await prisma.$executeRaw`UPDATE survey_responses SET created_at = completada_at WHERE client_id = ANY(${alumnos}::uuid[])`;
  await prisma.$executeRaw`
    UPDATE client_profiles c
    SET created_at = u.created_at,
        updated_at = COALESCE((SELECT MAX(r.activada_at) FROM routines r WHERE r.client_id = c.user_id), c.consentimiento_salud_at, u.created_at)
    FROM users u
    WHERE u.id = c.user_id AND c.user_id = ANY(${alumnos}::uuid[])`;
  await prisma.$executeRaw`UPDATE trainer_clients SET updated_at = COALESCE(terminado_at, aceptado_at, created_at) WHERE trainer_id = ANY(${entrenadores}::uuid[])`;
  await prisma.$executeRaw`UPDATE users SET updated_at = created_at WHERE id = ANY(${todos}::uuid[])`;
}

// ── Carga completa ───────────────────────────────────────────────────────────
async function cargarDemo(prisma: BaseDeDatos, ahora: Date): Promise<void> {
  const base = await prisma.ejercicio.findMany({
    where: { duenoId: null, deletedAt: null, slug: { not: null } },
    select: { id: true, slug: true, grupoMuscular: true, equipo: true, tipoCarga: true, incrementoDefaultKg: true },
  });
  if (base.length === 0) throw new Error('La base no tiene los ejercicios base. Corre la semilla antes (node dist/semilla.js).');
  const ctx: Contexto = {
    prisma, ahora, hoy: diaLocal(ahora, ZONA), umbrales: leerUmbrales(),
    ejercicios: new Map(base.map((e) => [e.slug!, e.id])),
    slugs: new Map(base.map((e) => [e.id, e.slug!])),
    info: new Map(base.map(({ slug, id: _id, ...info }) => [slug!, info])),
    hashClave: await hashearContrasena(CLAVE_DEMO),
  };

  const entrenadores = new Map<ClaveEntrenador, Usuario>();
  const plantillas = new Map<ClaveRutina, RutinaCompleta>();
  for (const e of ENTRENADORES) {
    const creada = instanteLocal(sumarDias(ctx.hoy, -e.haceDias), 19 * 60);
    const u = await crearCuenta(ctx, { clave: e.clave, nombre: e.nombre, apellido: e.apellido, rol: 'trainer', creadaAt: creada });
    entrenadores.set(e.clave, u);
    for (const clave of e.plantillas) plantillas.set(clave, await armarRutina(ctx, RUTINAS[clave], { duenoId: u.id, alumnoId: null }, mas(creada, 2 * DIA_MS)));
  }

  const resumen: ResumenAlumno[] = [];
  for (const a of ALUMNOS) {
    resumen.push(await cargarAlumno(ctx, a, entrenadores, plantillas));
    console.log(`[demo] ${a.clave}: ${resumen.at(-1)!.sesiones} sesiones`);
  }

  // Un código vigente por entrenador, para mostrar cómo se vincula un alumno nuevo.
  const codigos = new Map<ClaveEntrenador, string>();
  for (const [clave, u] of entrenadores) codigos.set(clave, (await crearInvitacion(prisma, u.id, ahora)).codigo);

  const idsAlumnos = (await prisma.usuario.findMany({ where: { email: { endsWith: `@${DOMINIO}` }, rol: 'client' }, select: { id: true } })).map((u) => u.id);
  const idsEntrenadores = [...entrenadores.values()].map((u) => u.id);
  await ajustarFechas(prisma, idsAlumnos, idsEntrenadores);
  await imprimirResumen(prisma, resumen, entrenadores, codigos);
}

// ── Resumen ──────────────────────────────────────────────────────────────────
async function imprimirResumen(
  prisma: BaseDeDatos,
  alumnos: ResumenAlumno[],
  entrenadores: Map<ClaveEntrenador, Usuario>,
  codigos: Map<ClaveEntrenador, string>,
): Promise<void> {
  console.log(`\n[demo] Listo. Contraseña de todas las cuentas: ${CLAVE_DEMO}`);
  for (const [clave, u] of entrenadores) {
    const clientes = await prisma.vinculoEntrenador.count({ where: { entrenadorId: u.id, estado: 'activo' } });
    const abiertas = await prisma.alerta.count({ where: { entrenadorId: u.id, estado: { in: ['nueva', 'vista'] } } });
    console.log(`  entrenador  ${u.email.padEnd(30)} ${clientes} alumnos, ${abiertas} alertas abiertas, código vigente ${codigos.get(clave)}`);
  }
  for (const r of alumnos) {
    const u = await prisma.usuario.findUniqueOrThrow({ where: { email: r.email } });
    const [series, prs, medidas, obs, alertas] = await Promise.all([
      prisma.serie.count({ where: { alumnoId: u.id } }),
      prisma.recordPersonal.count({ where: { alumnoId: u.id, superadoAt: null } }),
      prisma.medidaCorporal.count({ where: { alumnoId: u.id } }),
      prisma.observacion.count({ where: { alumnoId: u.id } }),
      prisma.alerta.findMany({ where: { alumnoId: u.id }, include: { ejercicio: { select: { nombre: true } } }, orderBy: { createdAt: 'asc' } }),
    ]);
    const conQuien = r.entrenador ? `con ${r.entrenador}` : 'solo';
    console.log(`  alumno      ${r.email.padEnd(30)} ${conQuien}; «${r.rutina}»; ${r.sesiones} sesiones, ${series} series, ${prs} récords vigentes, ${medidas} medidas, ${obs} observaciones`);
    for (const al of alertas) {
      console.log(`              alerta ${al.tipo}${al.ejercicio ? ` (${al.ejercicio.nombre})` : ''}: ${al.estado}, ${al.createdAt.toISOString().slice(0, 10)}`);
    }
  }
}

// ── Principal ────────────────────────────────────────────────────────────────
const argumentos = process.argv.slice(2);
for (const a of argumentos) {
  if (a !== '--borrar') throw new Error(`Argumento desconocido: ${a}. Uso: node dist/demo.js [--borrar]`);
}
esquemaContrasena.parse(CLAVE_DEMO);
const config = leerConfig();
const prisma = crearPrisma(config.databaseUrl);
try {
  const url = new URL(config.databaseUrl);
  console.log(`[demo] base ${url.hostname}:${url.port || '5432'}${url.pathname}`);
  const borradas = await borrarDemo(prisma);
  console.log(`[demo] ${borradas} cuentas @${DOMINIO} borradas`);
  if (!argumentos.includes('--borrar')) {
    const ahora = config.relojFijo ? new Date(config.relojFijo) : relojDelSistema.ahora();
    await cargarDemo(prisma, ahora);
  }
} finally {
  await prisma.$disconnect();
}
