// Cruce de poleas, de alto a bajo. De pie entre dos poleas altas, un pie adelante, el tronco un
// poco inclinado hacia adelante; los brazos bajan en arco desde los lados hasta juntar las manos
// frente al ombligo, con los codos un poco doblados y fijos.
//
// Cómo está hecho:
//   - Los pies van fijos en el mundo y el tronco no se mueve: solo se mueven los brazos.
//   - Las manos van en el marco 'torax', a 0.62 m del hombro (codo doblado unos 25°), y siguen
//     un arco entre la partida (a los lados, a la altura del hombro) y la llegada (adelante
//     y abajo). Varios cuadros a lo largo del arco para que no corte camino.
//   - Cada polea es un equipo 'polea' con una sola mano: torre, roldana alta, cable y manilla.

const HOMBRO = [0.19, 0.15, 0];
const RADIO = 0.62;
// Dirección del brazo en el marco del tórax con dos ángulos: rumbo visto desde arriba (0 = hacia
// el lado, 90 = hacia adelante) y altura (+ arriba). Se interpolan por separado para que las
// manos vayan hacia adelante y hacia abajo a la vez, como en un abrazo.
const ABIERTO = { rumbo: -8, altura: 8 };   // brazo al lado, un poco arriba y atrás
const CERRADO = { rumbo: 103, altura: -10 }; // brazo adelante y abajo: las manos se juntan frente al ombligo
const RAD = Math.PI / 180;

// k = 0 abierto, 1 cerrado.
function brazo(k) {
  const r = (ABIERTO.rumbo + (CERRADO.rumbo - ABIERTO.rumbo) * k) * RAD;
  const a = (ABIERTO.altura + (CERRADO.altura - ABIERTO.altura) * k) * RAD;
  const dir = [Math.cos(a) * Math.cos(r), Math.sin(a), Math.cos(a) * Math.sin(r)];
  const pos = HOMBRO.map((h, i) => h + RADIO * dir[i]);
  // Codos hacia atrás y abajo al partir, hacia afuera al cerrar.
  return { brazos: { mano: { en: 'torax', pos }, polo: [1, -0.3, -0.6], giro: -45 } };
}

const dePie = {
  pelvis: { pos: [0, 0.95, 0], cabeceo: 18 },
  columna: { flex: 4 },
  cabeza: { flex: -14 },
  // Un pie adelante y otro atrás, rodillas apenas dobladas.
  piernaIzq: { pie: [0.13, 0.075, 0.2], abre: 8, polo: [0.15, 0, 1] },
  piernaDer: { pie: [-0.13, 0.075, -0.2], abre: 8, polo: [-0.15, 0, 1] },
};

export default {
  id: 'cruce-de-poleas',
  nombre: 'Cruce de poleas',
  ceja: 'Pecho · polea',
  periodo: 3,
  vista: 'tres',
  equipos: [
    { tipo: 'polea', anclaje: [0.85, 1.95, -0.25], mano: 'izq', manilla: 'simple' },
    { tipo: 'polea', anclaje: [-0.85, 1.95, -0.25], mano: 'der', manilla: 'simple' },
  ],
  momentos: [0, 0.22, 0.44],
  cuadros: [
    { t: 0, ...dePie, ...brazo(0) },
    { t: 0.06 },
    { t: 0.14, ...brazo(0.25) },
    { t: 0.22, ...brazo(0.5) },
    { t: 0.3, ...brazo(0.75) },
    { t: 0.38, ...brazo(1) },
    { t: 0.48 },
    { t: 0.6, ...brazo(0.75) },
    { t: 0.72, ...brazo(0.5) },
    { t: 0.83, ...brazo(0.25) },
    { t: 0.94, ...brazo(0) },
  ],
  trabajan: ['Pectoral'],
  ayudan: ['Hombro anterior', 'Bíceps', 'Core'],
  pintar: ['pecho'],
  pasos: [
    [0, 'De pie entre las dos poleas altas, un pie adelante y el tronco un poco inclinado.'],
    [0.06, 'Baja las manos en arco hacia adelante, con los codos un poco doblados y fijos.'],
    [0.36, 'Junta las manos frente al ombligo y aprieta el pecho un instante.'],
    [0.48, 'Vuelve abriendo lento por el mismo arco hasta sentir el pecho estirado.'],
  ],
};
