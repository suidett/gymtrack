// Pallof press. De pie, de lado al anclaje (la banda o el cable sale desde la derecha, a la
// altura del pecho). Las dos manos toman la manilla en el esternón, la empujan recto hacia
// adelante, aguantan con los brazos estirados y vuelven. El tronco no gira: ese es el trabajo.
//
// Cómo está hecho:
//   - El equipo es una polea con su torre (sirve de poste para la banda) y el anclaje a la
//     altura de las manos, 1 m a la derecha. El cable tira hacia el lado durante todo el ciclo.
//   - Pies fijos un poco más abiertos que la cadera y rodillas apenas flexionadas; el tronco y
//     la pelvis no cambian en ningún cuadro.
//   - Las manos van juntas (una al lado de la otra) en el marco del tórax: del esternón a unos
//     60 cm al frente, a la misma altura. Los codos parten abajo y pegados al cuerpo.

const PECHO = 0.2, ESTIRADO = 0.615;  // distancia de las manos al eje del tórax (m)
const manos = (z, y) => ({ mano: { en: 'torax', pos: [0.035, y, z] }, polo: [0.45, -1, -0.15], giro: 0 });

const dePie = {
  pelvis: { pos: [0, 0.972, 0], cabeceo: 5 },
  columna: { flex: -3 },
  cabeza: { flex: -2 },
  piernas: { pie: [0.16, 0.075, 0.02], abre: 8, polo: [0.2, 0, 1] },
};

export default {
  id: 'pallof-press',
  nombre: 'Pallof press',
  ceja: 'Core · banda o polea',
  periodo: 4.6,
  vista: 'tres',
  equipos: [{ tipo: 'polea', anclaje: [-1.05, 1.335, 0.22], mano: 'ambas', manilla: 'simple' }],
  momentos: [0, 0.18, 0.42],
  cuadros: [
    { t: 0, ...dePie, brazos: manos(PECHO, 0.06) },
    { t: 0.06 },
    { t: 0.3, brazos: manos(ESTIRADO, 0.075) },
    { t: 0.55 },                       // aguanta con los brazos estirados
    { t: 0.82, brazos: manos(PECHO, 0.06) },
    // pausa en el pecho hasta t = 1
  ],
  trabajan: ['Oblicuos', 'Transverso abdominal'],
  ayudan: ['Abdomen', 'Glúteo medio', 'Hombros'],
  pintar: ['abdomen'],
  pasos: [
    [0, 'De lado a la banda o polea, pies al ancho de los hombros y la manilla en el pecho con las dos manos.'],
    [0.06, 'Empuja la manilla recto hacia adelante hasta estirar los brazos.'],
    [0.3, 'Aguanta 2 segundos sin dejar que la banda o el cable te giren el tronco ni la cadera.'],
    [0.55, 'Vuelve la manilla al pecho con control. Al terminar, cambia de lado.'],
  ],
};
