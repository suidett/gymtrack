// Dominadas en barra fija. Ejemplo de postura colgada: las manos van fijas en el mundo, sobre
// la barra, y el cuerpo sube y baja debajo de ellas.
//
// Cómo se calcularon los números (con esqueleto.js, en Node):
//   - Barra a 2,30 m (z = 0). Los puños quedan en la barra a ±0.30, agarre prono un poco más
//     ancho que los hombros (±0.19). Como son el mismo objetivo en todos los cuadros, no se
//     deslizan.
//   - En cada cuadro se eligió dónde va el hombro y de ahí sale la pelvis (pelvis.pos).
//     Abajo: brazos casi estirados (14° de codo), hombro bajo la barra y escápulas arriba.
//     Arriba: 146° de codo, codos abajo, afuera y un poco atrás, escápulas abajo y juntas, y
//     el tronco algo inclinado atrás (pelvis -14 y columna -10) para llevar el pecho a la barra.
//   - La cara tiene que pasar por detrás de la barra: desde la mitad del recorrido el cuerpo ya
//     va inclinado y 11 cm atrás. Se revisó en todo el ciclo que la barra no toque la cabeza,
//     la cara, el cuello ni el tórax (lo más cerca: 4 mm del pecho arriba). Arriba la parte baja
//     de la cara queda 2 cm sobre la barra: el mentón la pasa.
//   - Las piernas van juntas, con las rodillas apenas dobladas (10°) y las puntas algo
//     estiradas (tobillo a 20°), por ángulos y sin objetivo: así se ve más natural colgado.
//     El centro de masa queda bajo la barra en todo el recorrido (a menos de 3 cm): la
//     inclinación del tronco arriba se compensa con las piernas un poco adelante.

const BARRA = 2.3;
const brazos = { mano: [0.3, BARRA, 0], polo: [1, -0.4, -0.15], giro: -90 };
const piernas = (flex) => ({ cadera: [flex, -2, 0], rodilla: 10, tobillo: 20 });

const abajo = {
  pelvis: { pos: [0, 1.195, 0.017], cabeceo: -2 },
  columna: { flex: 0 },
  cabeza: { flex: 0 },
  escapulas: { elev: 0.03, prot: 0 },
  brazos,
  piernas: piernas(4),
};
const medio = {
  pelvis: { pos: [0, 1.575, 0.037], cabeceo: -11 },
  columna: { flex: -8 },
  cabeza: { flex: -10 },
  escapulas: { elev: 0, prot: -0.015 },
  piernas: piernas(-2),
};
const arriba = {
  pelvis: { pos: [0, 1.816, 0.058], cabeceo: -14 },
  columna: { flex: -10 },
  cabeza: { flex: -12 },
  escapulas: { elev: -0.015, prot: -0.025 },
  piernas: piernas(-5),
};

export default {
  id: 'dominadas',
  nombre: 'Dominadas',
  ceja: 'Espalda · barra fija',
  periodo: 3.4,
  vista: 'tres',
  // 3/4 desde atrás: lo que trabaja (dorsales) queda a la vista en la vista por defecto.
  // De lado, un poco desde atrás: se ven los dorsales y los codos que bajan, y el parante
  // cercano (a 0,63 m del centro) queda por delante de los pies en vez de tapar el cuerpo.
  vistas: { tres: [0.7, 0.24, -0.72], lado: [1, 0.16, -0.5] },
  equipos: [{ tipo: 'dominadas', alto: BARRA, z: 0, ancho: 1.2 }],
  momentos: [0, 0.24, 0.4],
  cuadros: [
    { t: 0, ...abajo },
    { t: 0.08 },                 // un instante colgado
    { t: 0.24, ...medio },
    { t: 0.4, ...arriba },
    { t: 0.47 },                 // pausa arriba
    { t: 0.7, ...medio },        // baja más lento de lo que sube
    { t: 0.92, ...abajo },
  ],
  trabajan: ['Dorsal ancho', 'Bíceps'],
  ayudan: ['Trapecio medio', 'Romboides', 'Antebrazos', 'Core'],
  pintar: ['dorsales', 'biceps'],
  pintarAyuda: ['trapecio', 'antebrazos', 'core'],
  pasos: [
    [0, 'Cuelga de la barra con agarre prono, un poco más ancho que los hombros y los brazos estirados.'],
    [0.08, 'Baja los hombros y tira llevando los codos hacia abajo y atrás.'],
    [0.36, 'Sube hasta que el mentón pase la barra, con el pecho hacia ella.'],
    [0.47, 'Baja controlado hasta estirar los brazos, sin balancearte.'],
  ],
};
