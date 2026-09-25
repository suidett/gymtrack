import type { Equipo, Exercise, GrupoMuscular, Patron, TipoCarga } from './types';

const CREADO = '2026-09-23T00:00:00.000Z';

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

/** Biblioteca base: 66 ejercicios con grupo, equipo, patrón e incremento por defecto. No se editan; se copian si alguien quiere una variante. */
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
  ex('sentadilla-peso-corporal', 'Sentadilla con peso corporal', 'Piernas', 'Peso corporal', 'rodilla', 0, 'peso_corporal'),
  ex('puente-de-gluteo', 'Puente de glúteo', 'Piernas', 'Peso corporal', 'cadera', 0, 'peso_corporal'),
  // Pecho
  ex('press-de-banca', 'Press de banca', 'Pecho', 'Barra', 'empuje', 2.5),
  ex('press-de-banca-inclinado', 'Press de banca inclinado', 'Pecho', 'Barra', 'empuje', 2.5),
  ex('press-con-mancuernas', 'Press con mancuernas', 'Pecho', 'Mancuerna', 'empuje', 2),
  ex('press-inclinado-mancuernas', 'Press inclinado con mancuernas', 'Pecho', 'Mancuerna', 'empuje', 2),
  ex('press-en-maquina', 'Press en máquina', 'Pecho', 'Máquina', 'empuje', 5),
  ex('fondos-en-paralelas', 'Fondos en paralelas', 'Pecho', 'Peso corporal', 'empuje', 2.5, 'peso_corporal'),
  ex('flexiones', 'Flexiones', 'Pecho', 'Peso corporal', 'empuje', 0, 'peso_corporal'),
  ex('aperturas-con-mancuernas', 'Aperturas con mancuernas', 'Pecho', 'Mancuerna', 'aislamiento', 2),
  ex('cruce-de-poleas', 'Cruce de poleas', 'Pecho', 'Polea', 'aislamiento', 2.5),
  ex('pec-deck', 'Pec deck', 'Pecho', 'Máquina', 'aislamiento', 5),
  // Espalda
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
  ex('plancha-frontal', 'Plancha frontal', 'Core', 'Peso corporal', 'core', 0, 'tiempo'),
  ex('plancha-lateral', 'Plancha lateral', 'Core', 'Peso corporal', 'core', 0, 'tiempo'),
  ex('crunch-en-polea', 'Crunch en polea', 'Core', 'Polea', 'core', 2.5),
  ex('elevacion-piernas-colgado', 'Elevación de piernas colgado', 'Core', 'Peso corporal', 'core', 0, 'peso_corporal'),
  ex('rueda-abdominal', 'Rueda abdominal', 'Core', 'Peso corporal', 'core', 0, 'peso_corporal'),
  ex('paseo-del-granjero', 'Paseo del granjero', 'Core', 'Kettlebell', 'core', 4, 'tiempo'),
  ex('pallof-press', 'Pallof press', 'Core', 'Banda', 'core', 0),
  ex('dead-bug', 'Dead bug', 'Core', 'Peso corporal', 'core', 0, 'peso_corporal'),
];
