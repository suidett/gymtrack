// Press de hombros en máquina, sentado. La máquina se arma con bloques: asiento, respaldo
// reclinado 10°, una columna detrás y la pieza que se mueve (dos manillas unidas por un marco
// que pasa sobre la cabeza y corre por la columna).
//
// Cómo está hecho:
//   - Misma postura sentada que el press con mancuernas: glúteos en el asiento (y = 0.45) y la
//     espalda contra el respaldo.
//   - Las manos suben y bajan en línea recta vertical (x = 0.36, z = 0.06), como una máquina
//     guiada. Las manillas siguen a las manos ('manos'), así todo el marco sube con ellas.
//   - Abajo las manillas quedan a la altura de las orejas; arriba los brazos casi rectos.

const sentado = {
  pelvis: { pos: [0, 0.62, 0.11], cabeceo: -10 },
  columna: { flex: -6 },
  cabeza: { flex: 8 },
  piernas: { pie: [0.22, 0.075, 0.6], abre: 15, polo: [0.3, 0.3, 1] },
};

const POLO = [0.7, -1, 0.2]; // codos hacia abajo y afuera, un poco adelante
const mano = (y) => ({ mano: [0.36, y, 0.06], polo: POLO, giro: 0 });

// Piezas que siguen a las manos: origen entre las manos, X de una mano a la otra.
const movil = (pos, tam) => ({ tipo: 'bloque', sigue: 'manos', pos, tam, color: 'fierro', radio: 0.012 });

export default {
  id: 'press-hombros-maquina',
  nombre: 'Press de hombros en máquina',
  ceja: 'Hombros · máquina',
  periodo: 3.2,
  vista: 'tres',
  equipos: [
    // Base, columna y soportes
    { tipo: 'bloque', pos: [0, 0.02, -0.02], tam: [0.5, 0.04, 0.8], color: 'estructura' },
    { tipo: 'bloque', pos: [0, 0.22, 0.18], tam: [0.07, 0.38, 0.07], color: 'estructura' },
    { tipo: 'bloque', pos: [0, 0.98, -0.31], tam: [0.07, 1.96, 0.07], color: 'estructura' },
    { tipo: 'bloque', pos: [0, 0.85, -0.235], tam: [0.06, 0.06, 0.15], color: 'estructura' },
    // Asiento y respaldo
    { tipo: 'bloque', pos: [0, 0.41, 0.2], tam: [0.42, 0.08, 0.4], color: 'tapiz' },
    { tipo: 'bloque', pos: [0, 0.817, -0.105], tam: [0.4, 0.75, 0.08], giro: [-10, 0, 0], color: 'tapiz' },
    // Lo que se mueve: manillas, parantes, travesaño sobre la cabeza y carro en la columna
    movil([0.4, 0, 0], [0.16, 0.032, 0.032]),
    movil([-0.4, 0, 0], [0.16, 0.032, 0.032]),
    movil([0.46, 0.1, 0], [0.035, 0.22, 0.035]),
    movil([-0.46, 0.1, 0], [0.035, 0.22, 0.035]),
    movil([0, 0.2, 0], [0.96, 0.04, 0.04]),
    movil([0, 0.2, -0.18], [0.05, 0.04, 0.36]),
    movil([0, 0.2, -0.37], [0.1, 0.16, 0.1]),
  ],
  momentos: [0, 0.25, 0.45],
  cuadros: [
    { t: 0, ...sentado, brazos: mano(1.66) },
    { t: 0.08 },
    { t: 0.25, brazos: mano(1.48) },
    { t: 0.45, brazos: mano(1.3) },
    { t: 0.52 },
    { t: 0.72, brazos: mano(1.48) },
  ],
  trabajan: ['Hombro anterior', 'Hombro lateral', 'Tríceps'],
  ayudan: ['Trapecio', 'Pectoral superior'],
  pintar: ['hombros', 'triceps'],
  pasos: [
    [0, 'Sentado con la espalda apoyada, toma las manillas con los brazos casi estirados.'],
    [0.08, 'Baja controlado, con los codos hacia abajo y un poco adelante.'],
    [0.42, 'Abajo, las manillas quedan a la altura de las orejas.'],
    [0.52, 'Empuja hacia arriba sin bloquear los codos ni despegar la espalda.'],
  ],
};
