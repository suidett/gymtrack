// Peso muerto rumano con mancuernas. De pie, una mancuerna en cada mano por delante de los
// muslos (palmas hacia el cuerpo). Bisagra de cadera: la cadera va atrás, las rodillas
// quedan apenas dobladas y casi no cambian, y la espalda va recta todo el tiempo.
//
// Cómo está hecho (igual que peso-muerto.js):
//   - Las mancuernas van en el mundo y bajan en línea recta, pegadas a las piernas; las manos
//     las siguen. La altura de la pelvis se calculó con esqueleto.js para que las rodillas
//     queden con la misma flexión suave (de 12 a 24 grados) y la de las manos para que los brazos
//     queden estirados y colgando de los hombros.
//   - `alinear` ubica el hombro respecto de las mancuernas: arriba un poco detrás (la cadera
//     queda derecha y las mancuernas por delante de los muslos) y abajo un poco delante.
//   - Pies fijos en el suelo.

const MZ = 0.125;    // las mancuernas bajan por delante de las canillas, sobre el pie
const MANOS = 0.15;  // media distancia entre las manos
const HOMBRO = [0.19, 0.15, 0];

// Un cuadro: altura de las manos, altura de la pelvis, cabeceo del tronco, flexión de la
// columna, hombro delante (+) o detrás (-) de las mancuernas y cabeza.
const c = (t, manos, pelvis, cabeceo, flex, adelante, cabeza) => ({
  t,
  pelvis: { pos: [0, pelvis, 0], cabeceo },
  columna: { flex },
  cabeza: { flex: cabeza },
  alinear: { en: 'torax', pos: HOMBRO, z: MZ + adelante },
  brazos: { mano: [MANOS, manos, MZ], polo: [0, 0, -1], giro: -90 },
});

const arriba = c(0, 0.812, 0.979, 2, -2, -0.16, 0);
const bajando = [
  c(0.2, 0.732, 0.959, 25, 0, -0.06, -5),
  c(0.28, 0.615, 0.928, 44, 0, 0, -9),
  c(0.36, 0.522, 0.906, 56, 0, 0.03, -11),
];
// Abajo el tronco queda a unos 26 grados sobre la horizontal (cabeza sobre la cadera) y las
// mancuernas justo bajo las rodillas.
const abajo = c(0.44, 0.453, 0.89, 64, 0, 0.045, -12);
// Al subir pasa por las mismas poses, en el orden contrario.
const subiendo = [...bajando].reverse().map((p, i) => ({ ...p, t: [0.55, 0.62, 0.7][i] }));

export default {
  id: 'peso-muerto-rumano-mancuernas',
  nombre: 'Peso muerto rumano con mancuernas',
  ceja: 'Piernas · mancuernas',
  periodo: 4.4,
  vista: 'lado',
  equipos: [{ tipo: 'mancuernas', mano: 'ambas' }],
  momentos: [0, 0.28, 0.44],
  cuadros: [
    // Pies al ancho de la cadera, rodillas apenas dobladas.
    { ...arriba, piernas: { pie: [0.11, 0.075, 0], abre: 6, polo: [0.1, 0, 1] } },
    { t: 0.08 },
    ...bajando,
    abajo,
    { t: 0.48 },            // un instante abajo, con los isquios estirados
    ...subiendo,
    { ...arriba, t: 0.82 },
    // queda arriba hasta t = 1
  ],
  trabajan: ['Isquiotibiales', 'Glúteos'],
  ayudan: ['Espalda baja', 'Antebrazos', 'Core'],
  pintar: ['isquios', 'gluteos'],
  pasos: [
    [0, 'De pie, mancuernas delante de los muslos y rodillas apenas dobladas.'],
    [0.08, 'Lleva la cadera atrás con la espalda recta: las mancuernas bajan pegadas a las piernas.'],
    [0.4, 'Para cuando sientas estirar la parte de atrás del muslo, con las mancuernas justo bajo las rodillas.'],
    [0.5, 'Sube llevando la cadera adelante y aprieta los glúteos arriba.'],
  ],
};
