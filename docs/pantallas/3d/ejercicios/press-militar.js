// Press militar con barra, de pie. La barra va en el mundo por su trayectoria real (casi
// vertical sobre la mitad del pie) y las manos la siguen; el cuerpo es el que se aparta.
//
// Cómo se calcularon los números (con esqueleto.js):
//   - Pies fijos a ±0.13 con las puntas 10° afuera; rodillas casi estiradas (pelvis a 0.983).
//   - `alinear` deja el centro de los hombros (punto [0, 0.15, 0] del tórax) en la z que dice
//     cada cuadro, así la barra queda donde corresponde respecto del cuerpo.
//   - Las manos van cerradas con la muñeca atrás (`muneca`, de 30° abajo a 10° arriba): la barra
//     queda en la base de la palma, sobre el antebrazo, y el antebrazo efectivo mide 0.27 m.
//   - Abajo la barra descansa sobre las clavículas y el deltoides anterior: 4,5 cm sobre la
//     articulación del hombro y 12 cm adelante, a 1 cm del pecho. El codo queda bajo la mano
//     visto de frente y un poco adelante de la barra (148,5° de flexión).
//   - Al subir, el polo de cada cuadro deja el codo en x ≤ 0.31 (la mano va en 0.29): de frente
//     el antebrazo queda casi vertical (5° como mucho) en vez de abrirse hacia afuera.
//   - Al pasar la cara, el tronco se va un poco atrás desde la cadera (7°) y la cabeza se echa
//     atrás: la barra pasa a unos 3 cm del mentón y a 5 cm de la frente, casi sin desviarse
//     (de z 0.07 abajo a z 0.035 arriba).
//   - Cuando la barra pasa la frente, el tronco se mete bajo la barra y la cabeza vuelve
//     adelante, entre los brazos. Arriba la barra queda sobre los hombros y la mitad del pie
//     (z = 0.035, y = 2.028), con los codos casi rectos (8°) y los hombros un poco encogidos.

const AGARRE = 0.29; // media distancia entre los puños: un poco más ancha que los hombros

const pies = { pie: [0.13, 0.075, 0], abre: 10 };

// Un cuadro: barra [alto, z], hombros en z, inclinación del tronco, cabeza, polo de los codos y
// extensión de la muñeca (mano cerrada con la muñeca atrás: la barra va en la base de la palma,
// sobre el antebrazo, y el antebrazo efectivo mide 0.27 m).
const cuadro = (t, { barra, hombros, inclina, columna = 0, cabeza = 0, elev = 0, polo, muneca = 20 }) => ({
  t,
  pelvis: { pos: [0, 0.983, 0], cabeceo: inclina },
  columna: { flex: columna },
  cabeza: { flex: cabeza },
  escapulas: { elev },
  alinear: { en: 'torax', pos: [0, 0.15, 0], z: hombros },
  piernas: pies,
  brazos: { mano: [AGARRE, barra[0], barra[1]], polo, muneca, cerrada: true, giro: -90 },
});

// Barra sobre las clavículas, codos bajo la barra.
const abajo = { barra: [1.474, 0.07], hombros: -0.05, inclina: -5, columna: -2, cabeza: 0, polo: [0.6, -0.25, 0.8], muneca: 30 };
// La barra pasa el mentón y la nariz: cabeza atrás.
const cara = { barra: [1.63, 0.068], hombros: -0.075, inclina: -7, columna: -3, cabeza: -12, polo: [0.42, -0.1, 1], muneca: 25 };
// La barra pasa la frente: la cabeza empieza a volver.
const frente = { barra: [1.82, 0.062], hombros: -0.055, inclina: -5, columna: -2, cabeza: -6, polo: [0.26, 0.1, 0.6], muneca: 20 };
// Sobre la cabeza: el tronco se mete bajo la barra.
const encima = { barra: [1.93, 0.05], hombros: -0.005, inclina: -2, columna: -1, cabeza: 2, polo: [0.58, -0.05, 1], muneca: 15 };
// Brazos estirados, barra sobre hombros y mitad del pie, cabeza entre los brazos.
const arriba = { barra: [2.028, 0.035], hombros: 0.035, inclina: 0, columna: 0, cabeza: 4, elev: 0.025, polo: [1, -0.3, 0], muneca: 10 };

export default {
  id: 'press-militar',
  nombre: 'Press militar',
  ceja: 'Hombros · barra',
  periodo: 3.4,
  vista: 'tres',   // de lado, el motor aclara el disco cercano y se ve la barra pasar junto a la cara
  equipos: [{ tipo: 'barra', en: 'manos', discos: [0.225] }],
  momentos: [0, 0.28, 0.46],
  cuadros: [
    cuadro(0, abajo),
    { t: 0.08 },              // un instante abajo
    cuadro(0.2, cara),
    cuadro(0.3, frente),
    cuadro(0.38, encima),
    cuadro(0.46, arriba),
    { t: 0.54 },              // arriba, brazos estirados
    cuadro(0.64, encima),
    cuadro(0.73, frente),
    cuadro(0.84, cara),
    // vuelve sola a las clavículas en t = 1
  ],
  trabajan: ['Hombros', 'Tríceps'],
  ayudan: ['Trapecio', 'Pectoral superior', 'Core'],
  pintar: ['hombros', 'triceps'],
  pintarAyuda: ['trapecio', 'pecho', 'core'],
  pasos: [
    [0, 'De pie, barra sobre las clavículas, manos un poco más abiertas que los hombros y codos bajo la barra o un poco adelante.'],
    [0.08, 'Aprieta glúteos y abdomen y empuja la barra recto hacia arriba, llevando la cabeza un poco atrás.'],
    [0.3, 'Cuando la barra pasa la frente, mete la cabeza y el pecho bajo la barra.'],
    [0.46, 'Arriba, brazos estirados sobre los hombros. Baja controlado por el mismo camino.'],
  ],
};
