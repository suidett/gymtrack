// ─────────────────────────────────────────────────────────────────────────────
// Biblioteca base de ejercicios · Zona: Datos
//
// Qué hace: la lista de ejercicios con la que parte todo alumno (67 hoy), cada uno con su grupo
// muscular, equipo, patrón de movimiento, tipo de carga y cuántos kilos sube por defecto cuando la
// progresión lo indica. El store la copia al teléfono la primera vez que se abre la app.
// Tócalo cuando: falte un ejercicio, un nombre esté mal escrito o un incremento por defecto no
// tenga sentido para el equipo. Un ejercicio nuevo es una línea `ex(...)` bajo su grupo. Ojo con
// dos cosas: el id (la primera parte, sin "base-") no se cambia una vez publicado, porque las
// rutinas y las sesiones guardadas apuntan a él; y la copia al teléfono ocurre solo al sembrar
// (primera vez o "restablecer datos" en useStore.ts), así que quien ya tiene datos no ve un
// ejercicio nuevo hasta que exista una migración.
// No lo toques para: cambiar qué campos tiene un ejercicio (types.ts), cómo se calcula la
// progresión (progression.ts) ni la rutina de ejemplo (rutina-ejemplo.ts).
// Depende de: types.ts (los tipos Exercise, GrupoMuscular, Equipo, Patron y TipoCarga).
// ─────────────────────────────────────────────────────────────────────────────
import type { Equipo, Exercise, GrupoMuscular, Patron, TipoCarga } from './types';

// ── Fecha fija y ayudante ────────────────────────────────────────────────────

// Todos los ejercicios base llevan la misma fecha de creación, fija y en el pasado: así, al ordenar
// por fecha, la biblioteca queda antes que los ejercicios propios, y el resultado es el mismo en
// todos los teléfonos.
const CREADO = '2026-09-23T00:00:00.000Z';

/**
 * Arma un Exercise de la biblioteca base escribiendo solo lo que cambia entre uno y otro.
 * Recibe el id corto (se le antepone "base-"), el nombre que ve el alumno, grupo, equipo, patrón,
 * el incremento por defecto en kilos y el tipo de carga ('kg' si no se indica).
 * Siempre deja propio en false y la fecha fija de arriba.
 */
function ex(
  id: string,
  nombre: string,
  grupo: GrupoMuscular,
  equipo: Equipo,
  patron: Patron,
  incrementoKg: number,
  tipoCarga: TipoCarga = 'kg',
): Exercise {
  return { id: `base-${id}`, nombre, grupo, equipo, patron, tipoCarga, incrementoKg, propio: false, creadoAt: CREADO };
}

// ── La biblioteca ────────────────────────────────────────────────────────────

/**
 * Biblioteca base: 67 ejercicios con grupo, equipo, patrón e incremento por defecto. No se editan;
 * se copian si alguien quiere una variante.
 *
 * El incremento sigue el salto real del equipo: 2,5 kg en barra (un disco chico por lado), 1 o 2 kg
 * en mancuerna (el salto entre una mancuerna y la siguiente), 5 kg en máquina (una placa), 2,5 o
 * 5 kg en polea según el aparato, 4 kg en kettlebell. Un 0 le dice al motor que el ejercicio
 * progresa en repeticiones y no en kilos (ver progression.ts); los de peso corporal con incremento
 * mayor a 0 (dominadas, fondos) son los que progresan agregando lastre (el motor sugiere subir kilos); en los demás el lastre se puede anotar igual, pero se progresa en repeticiones.
 */
export const EJERCICIOS_BASE: readonly Exercise[] = [
  // Piernas
  ex('sentadilla-trasera', 'Sentadilla trasera', 'Piernas', 'Barra', 'rodilla', 2.5),
  ex('sentadilla-frontal', 'Sentadilla frontal', 'Piernas', 'Barra', 'rodilla', 2.5),
  ex('sentadilla-bulgara', 'Sentadilla búlgara', 'Piernas', 'Mancuerna', 'rodilla', 2),
  ex('sentadilla-goblet', 'Sentadilla goblet', 'Piernas', 'Kettlebell', 'rodilla', 4),
  ex('prensa-de-piernas', 'Prensa de piernas', 'Piernas', 'Máquina', 'rodilla', 5),
  ex('extension-de-cuadriceps', 'Extensión de cuádriceps', 'Piernas', 'Máquina', 'rodilla', 5),
  ex('curl-femoral-acostado', 'Curl femoral acostado', 'Piernas', 'Máquina', 'cadera', 5),
  ex('curl-femoral-sentado', 'Curl femoral sentado', 'Piernas', 'Máquina', 'cadera', 5),
  ex('peso-muerto', 'Peso muerto convencional', 'Piernas', 'Barra', 'cadera', 5),
  ex('peso-muerto-sumo', 'Peso muerto sumo', 'Piernas', 'Barra', 'cadera', 5),
  ex('peso-muerto-rumano', 'Peso muerto rumano', 'Piernas', 'Barra', 'cadera', 2.5),
  ex('peso-muerto-rumano-mancuernas', 'Peso muerto rumano con mancuernas', 'Piernas', 'Mancuerna', 'cadera', 2),
  ex('hip-thrust', 'Hip thrust', 'Piernas', 'Barra', 'cadera', 5),
  ex('zancadas-caminando', 'Zancadas caminando', 'Piernas', 'Mancuerna', 'rodilla', 2),
  ex('estocada-estatica', 'Estocada estática', 'Piernas', 'Mancuerna', 'rodilla', 2),
  ex('step-up', 'Step up al cajón', 'Piernas', 'Mancuerna', 'rodilla', 2),
  ex('abductores-maquina', 'Abductores en máquina', 'Piernas', 'Máquina', 'cadera', 5),
  ex('elevacion-talones-pie', 'Elevación de talones de pie', 'Piernas', 'Máquina', 'aislamiento', 5),
  ex('elevacion-talones-sentado', 'Elevación de talones sentado', 'Piernas', 'Máquina', 'aislamiento', 5),
  // Sin lastre: incremento 0, así el motor sugiere subir repeticiones y nunca inventa kilos.
  ex('sentadilla-peso-corporal', 'Sentadilla con peso corporal', 'Piernas', 'Peso corporal', 'rodilla', 0, 'peso_corporal'),
  ex('puente-de-gluteo', 'Puente de glúteo', 'Piernas', 'Peso corporal', 'cadera', 0, 'peso_corporal'),
  // Pecho
  ex('press-de-banca', 'Press de banca', 'Pecho', 'Barra', 'empuje', 2.5),
  ex('press-de-banca-inclinado', 'Press de banca inclinado', 'Pecho', 'Barra', 'empuje', 2.5),
  ex('press-con-mancuernas', 'Press con mancuernas', 'Pecho', 'Mancuerna', 'empuje', 2),
  ex('press-inclinado-mancuernas', 'Press inclinado con mancuernas', 'Pecho', 'Mancuerna', 'empuje', 2),
  ex('press-en-maquina', 'Press en máquina', 'Pecho', 'Máquina', 'empuje', 5),
  // Peso corporal con lastre: el peso que se anota es el del cinturón o la mancuerna entre las
  // piernas, y el 2,5 es cuánto sube ese lastre.
  ex('fondos-en-paralelas', 'Fondos en paralelas', 'Pecho', 'Peso corporal', 'empuje', 2.5, 'peso_corporal'),
  ex('flexiones', 'Flexiones', 'Pecho', 'Peso corporal', 'empuje', 0, 'peso_corporal'),
  ex('aperturas-con-mancuernas', 'Aperturas con mancuernas', 'Pecho', 'Mancuerna', 'aislamiento', 2),
  ex('cruce-de-poleas', 'Cruce de poleas', 'Pecho', 'Polea', 'aislamiento', 2.5),
  ex('pec-deck', 'Pec deck', 'Pecho', 'Máquina', 'aislamiento', 5),
  // Espalda
  // Igual que los fondos: aceptan lastre, por eso suben de a 2,5.
  ex('dominadas', 'Dominadas', 'Espalda', 'Peso corporal', 'tiron', 2.5, 'peso_corporal'),
  ex('jalon-al-pecho', 'Jalón al pecho', 'Espalda', 'Polea', 'tiron', 5),
  ex('remo-con-barra', 'Remo con barra', 'Espalda', 'Barra', 'tiron', 2.5),
  ex('remo-con-mancuerna', 'Remo con mancuerna', 'Espalda', 'Mancuerna', 'tiron', 2),
  ex('remo-en-polea-baja', 'Remo en polea baja', 'Espalda', 'Polea', 'tiron', 5),
  ex('remo-en-maquina', 'Remo en máquina', 'Espalda', 'Máquina', 'tiron', 5),
  ex('remo-invertido', 'Remo invertido', 'Espalda', 'Peso corporal', 'tiron', 0, 'peso_corporal'),
  ex('pull-over-en-polea', 'Pull over en polea', 'Espalda', 'Polea', 'aislamiento', 2.5),
  ex('face-pull', 'Face pull', 'Espalda', 'Polea', 'tiron', 2.5),
  ex('encogimientos', 'Encogimientos con mancuernas', 'Espalda', 'Mancuerna', 'aislamiento', 2),
  // Hombros
  ex('press-militar', 'Press militar', 'Hombros', 'Barra', 'empuje', 2.5),
  ex('press-hombros-mancuernas', 'Press de hombros con mancuernas', 'Hombros', 'Mancuerna', 'empuje', 2),
  ex('press-hombros-maquina', 'Press de hombros en máquina', 'Hombros', 'Máquina', 'empuje', 5),
  ex('press-arnold', 'Press Arnold', 'Hombros', 'Mancuerna', 'empuje', 2),
  ex('elevaciones-laterales', 'Elevaciones laterales', 'Hombros', 'Mancuerna', 'aislamiento', 1),
  ex('elevaciones-laterales-polea', 'Elevaciones laterales en polea', 'Hombros', 'Polea', 'aislamiento', 2.5),
  ex('elevaciones-frontales', 'Elevaciones frontales', 'Hombros', 'Mancuerna', 'aislamiento', 1),
  ex('pajaros', 'Pájaros', 'Hombros', 'Mancuerna', 'aislamiento', 1),
  // Brazos
  ex('curl-con-barra', 'Curl con barra', 'Brazos', 'Barra', 'aislamiento', 2.5),
  ex('curl-con-mancuernas', 'Curl con mancuernas', 'Brazos', 'Mancuerna', 'aislamiento', 1),
  ex('curl-martillo', 'Curl martillo', 'Brazos', 'Mancuerna', 'aislamiento', 1),
  ex('curl-en-polea', 'Curl en polea', 'Brazos', 'Polea', 'aislamiento', 2.5),
  ex('curl-predicador', 'Curl predicador', 'Brazos', 'Máquina', 'aislamiento', 2.5),
  ex('extension-triceps-polea', 'Extensión de tríceps en polea', 'Brazos', 'Polea', 'aislamiento', 2.5),
  ex('press-frances', 'Press francés', 'Brazos', 'Barra', 'aislamiento', 2.5),
  ex('extension-triceps-cabeza', 'Extensión de tríceps sobre la cabeza', 'Brazos', 'Mancuerna', 'aislamiento', 2),
  ex('fondos-en-banco', 'Fondos en banco', 'Brazos', 'Peso corporal', 'empuje', 0, 'peso_corporal'),
  ex('press-cerrado', 'Press cerrado', 'Brazos', 'Barra', 'empuje', 2.5),
  // Core
  // De tiempo: en la bitácora se anotan segundos donde van las repeticiones, y no suman al volumen.
  ex('plancha-frontal', 'Plancha frontal', 'Core', 'Peso corporal', 'core', 0, 'tiempo'),
  ex('plancha-lateral', 'Plancha lateral', 'Core', 'Peso corporal', 'core', 0, 'tiempo'),
  ex('crunch-en-polea', 'Crunch en polea', 'Core', 'Polea', 'core', 2.5),
  ex('elevacion-piernas-colgado', 'Elevación de piernas colgado', 'Core', 'Peso corporal', 'core', 0, 'peso_corporal'),
  ex('rueda-abdominal', 'Rueda abdominal', 'Core', 'Peso corporal', 'core', 0, 'peso_corporal'),
  // De tiempo pero con pesa: se anotan segundos, y el incremento de 4 kg sube el peso de la kettlebell.
  ex('paseo-del-granjero', 'Paseo del granjero', 'Core', 'Kettlebell', 'core', 4, 'tiempo'),
  // Con banda no hay kilos que anotar; el incremento 0 hace que progrese en repeticiones.
  ex('pallof-press', 'Pallof press', 'Core', 'Banda', 'core', 0, 'peso_corporal'),
  ex('dead-bug', 'Dead bug', 'Core', 'Peso corporal', 'core', 0, 'peso_corporal'),
];
