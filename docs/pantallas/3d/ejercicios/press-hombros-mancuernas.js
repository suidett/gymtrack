// Press de hombros con mancuernas, sentado. La figura va sentada en una banca con el respaldo
// casi vertical (80°) y la espalda apoyada; las manos siguen una trayectoria en el mundo.
//
// Cómo se calcularon los números (con esqueleto.js):
//   - Pelvis con cabeceo -10 y columna -6: glúteos sobre el asiento (y = 0.45) y espalda alta
//     contra el respaldo, sin atravesarlo.
//   - Abajo las mancuernas quedan a la altura de las orejas, con el antebrazo vertical y el codo
//     un poco bajo el hombro y algo adelante (plano de la escápula).
//   - Arriba los brazos quedan casi rectos sobre los hombros y las mancuernas se acercan sin
//     tocarse. El mango va cruzado (palmas hacia adelante) en todo el recorrido.

const sentado = {
  pelvis: { pos: [0, 0.62, 0.11], cabeceo: -10 },
  columna: { flex: -6 },
  cabeza: { flex: 8 },
  // Pies planos, algo más abiertos que la cadera y adelante de las rodillas.
  piernas: { pie: [0.22, 0.075, 0.6], abre: 15, polo: [0.3, 0.3, 1] },
};

const GIRO = 0;
const POLO = [0.7, -1, 0.25]; // codos hacia abajo y afuera
const mano = (x, y, z) => ({ mano: [x, y, z], polo: POLO, giro: GIRO });

export default {
  id: 'press-hombros-mancuernas',
  nombre: 'Press de hombros con mancuernas',
  ceja: 'Hombros · mancuernas',
  periodo: 3.2,
  vista: 'tres',
  equipos: [
    { tipo: 'banca', inclinada: 80, bisagra: 0, asiento: 0.42, respaldo: 0.85, alto: 0.45 },
    { tipo: 'mancuernas', mano: 'ambas' },
  ],
  momentos: [0, 0.25, 0.45],
  cuadros: [
    { t: 0, ...sentado, brazos: mano(0.2, 1.68, 0.0) },
    { t: 0.08 },
    { t: 0.25, brazos: mano(0.33, 1.5, 0.08) },
    { t: 0.45, brazos: mano(0.43, 1.29, 0.13) },
    { t: 0.52 },
    { t: 0.72, brazos: mano(0.32, 1.52, 0.07) },
  ],
  trabajan: ['Hombro anterior', 'Hombro lateral', 'Tríceps'],
  ayudan: ['Trapecio', 'Pectoral superior', 'Core'],
  pintar: ['hombros', 'triceps'],
  pasos: [
    [0, 'Sentado con la espalda apoyada y las mancuernas arriba, sobre los hombros.'],
    [0.08, 'Baja las mancuernas controlado, abriendo los codos un poco hacia adelante.'],
    [0.42, 'Abajo, las mancuernas quedan a la altura de las orejas y los antebrazos verticales.'],
    [0.52, 'Empuja hacia arriba hasta casi estirar los brazos, sin chocar las mancuernas.'],
  ],
};
