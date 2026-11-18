// Curl predicador en máquina. Sentado, con el pecho contra el atril y la parte de atrás de los
// brazos apoyada en el cojín inclinado. Solo se mueve el codo: el brazo no se despega del
// cojín, así el bíceps trabaja sin ayuda del hombro ni del balanceo.
//
// La máquina se arma con bloques: asiento con su pata, atril inclinado 45° sobre un parante y
// la pieza que se mueve (una manilla entre las manos y dos palancas a los lados de los
// antebrazos que giran en un eje a la altura de los codos).
//
// Cómo está hecho:
//   - Asiento a 0.5 m; el tronco 15° adelante y quieto. Brazos por ángulos (64° de hombro en el
//     marco del tórax = 45° en el mundo, igual que el cojín), codos fijos sobre el cojín.
//   - El cojín se calculó con la línea del brazo: su cara de arriba queda bajo el tríceps, desde
//     la mitad del brazo hasta pasado el codo, y su borde de arriba no se mete en el pecho.
//   - Las palancas siguen a cada mano (marco 'manoIzq' / 'manoDer': X a lo largo de la manilla,
//     Y hacia los dedos). Van a 12 cm por fuera del puño y llegan hasta el eje fijo del codo.
//   - Abajo el codo queda casi recto (18°), sin trabarlo; arriba, 120°: el antebrazo queda
//     casi vertical y no se pierde la tensión.

const RAD = Math.PI / 180;
const H = 0.5;                                   // cara de arriba del asiento
const HOMBRO = [1.0928, 0.1395];                 // [y, z] del hombro
const CODO = [0.8736, 0.3587];                   // [y, z] del codo, fijo
const ATRIL = 45;                                // inclinación del cojín
// Dirección del brazo (del hombro al codo) y normal del cojín, en [y, z].
const D = [-Math.cos(ATRIL * RAD), Math.sin(ATRIL * RAD)];
const N = [Math.sin(ATRIL * RAD), Math.cos(ATRIL * RAD)];
const S0 = 0.15, S1 = 0.37, GROSOR = 0.06, BAJO = 0.056; // tramo del brazo, grosor, tríceps
const s = (S0 + S1) / 2, k = BAJO + GROSOR / 2;
const COJIN = [0, HOMBRO[0] + D[0] * s - N[0] * k, HOMBRO[1] + D[1] * s - N[1] * k];
// Punto bajo el cojín donde llega el parante.
const BASE_COJIN = [COJIN[1] - N[0] * GROSOR / 2, COJIN[2] - N[1] * GROSOR / 2];

const sentado = {
  pelvis: { pos: [0, H + 0.165, 0], cabeceo: 15 },
  columna: { flex: 4 },
  cabeza: { flex: 10 },
  piernas: { pie: [0.2, 0.075, 0.45], abre: 12, polo: [0.3, 0.3, 1] },
};

const brazo = (codo) => ({ hombro: [64, 0, 0], codo, giro: 90 });

// Lo que se mueve con las manos.
const palanca = (L) => ({ tipo: 'bloque', sigue: 'mano' + L, pos: [-0.12, -0.165, 0], tam: [0.03, 0.37, 0.035], color: 'fierro', radio: 0.012 });

export default {
  id: 'curl-predicador',
  nombre: 'Curl predicador',
  ceja: 'Brazos · máquina',
  periodo: 3.2,
  vista: 'lado',
  equipos: [
    // Base, asiento y su pata
    { tipo: 'bloque', pos: [0, 0.02, 0.02], tam: [0.5, 0.04, 0.56], color: 'estructura' },
    { tipo: 'bloque', pos: [0, H - 0.04, -0.02], tam: [0.4, 0.08, 0.36], color: 'tapiz' },
    { tipo: 'bloque', pos: [0, (H - 0.08) / 2, -0.02], tam: [0.07, H - 0.08, 0.07], color: 'estructura' },
    // Atril: cojín inclinado y su parante
    { tipo: 'bloque', pos: COJIN, tam: [0.56, GROSOR, S1 - S0], giro: [ATRIL, 0, 0], color: 'tapiz' },
    { tipo: 'bloque', pos: [0, BASE_COJIN[0] / 2, BASE_COJIN[1]], tam: [0.07, BASE_COJIN[0], 0.07], color: 'estructura' },
    // Eje de la palanca, a la altura de los codos
    { tipo: 'bloque', pos: [0.31, CODO[0], CODO[1]], tam: [0.05, 0.07, 0.07], color: 'estructura' },
    { tipo: 'bloque', pos: [-0.31, CODO[0], CODO[1]], tam: [0.05, 0.07, 0.07], color: 'estructura' },
    // Manilla y palancas
    { tipo: 'bloque', sigue: 'manos', pos: [0, 0, 0], tam: [0.66, 0.032, 0.032], color: 'fierro', radio: 0.012 },
    palanca('Izq'),
    palanca('Der'),
  ],
  momentos: [0, 0.22, 0.42],
  cuadros: [
    { t: 0, ...sentado, brazos: brazo(18) },
    { t: 0.06 },                              // un instante abajo
    { t: 0.22, brazos: brazo(70) },
    { t: 0.42, brazos: brazo(120) },
    { t: 0.5 },                               // arriba, aprieta
    { t: 0.74, brazos: brazo(70) },           // baja más lento que sube
    { t: 0.94, brazos: brazo(20) },
  ],
  trabajan: ['Bíceps'],
  ayudan: ['Braquial', 'Antebrazos'],
  pintar: ['biceps'],
  pasos: [
    [0, 'Sentado, con el pecho contra el atril y la parte de atrás de los brazos apoyada en el cojín.'],
    [0.06, 'Sube la manilla doblando los codos, sin despegar los brazos del cojín.'],
    [0.42, 'Arriba, el antebrazo queda casi vertical. Aprieta el bíceps un instante.'],
    [0.5, 'Baja lento hasta casi estirar los brazos, sin trabar los codos.'],
  ],
};
