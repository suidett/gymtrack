// Sentadilla búlgara con mancuernas. Pie de adelante plano en el suelo y el empeine del pie
// de atrás sobre una banca. Una mancuerna en cada mano, colgando a los costados. Se baja
// en vertical hasta que la rodilla de atrás casi toca el suelo.
//
// Cómo está hecho:
//   - Los dos pies son objetivos fijos en el mundo. El de atrás va con el talón girado 150°:
//     la punta mira hacia atrás y un poco abajo, y el empeine de los dedos se apoya en la
//     banca. El tobillo queda unos centímetros delante del borde y por sobre él.
//   - Solo cambian la pelvis (altura, un poco de avance y cabeceo) y la cabeza; las rodillas
//     salen de la IK. La de adelante apunta a la punta del pie y la de atrás al suelo.
//   - Los brazos van por ángulos: la flexión del hombro compensa el cabeceo del tronco, así
//     cuelgan verticales.

const BANCA = 0.4;           // alto del cojín
const ATRAS = -0.5;          // z del tobillo de atrás
// Con el talón en 150 el punto más bajo del pie (el empeine de los dedos) queda 8 cm bajo el
// tobillo: así el empeine toca la banca.
const PIE_ATRAS = { pie: [-0.1, BANCA + 0.08, ATRAS], talon: 150, polo: [0, -1, 0.5] };
const PIE_ADELANTE = { pie: [0.1, 0.075, 0.09], abre: 5, polo: [0.05, 0, 1] };
const brazos = (cabeceo) => ({ hombro: [cabeceo, 6, 0], codo: 4, giro: 0 });

const arriba = {
  pelvis: { pos: [0, 0.955, -0.1], cabeceo: 6 },
  columna: { flex: 0 },
  cabeza: { flex: -4 },
  brazos: brazos(6),
  piernaIzq: PIE_ADELANTE,
  piernaDer: PIE_ATRAS,
};

const abajo = {
  pelvis: { pos: [0, 0.6, -0.21], cabeceo: 14 },
  cabeza: { flex: -10 },
  brazos: brazos(14),
};

export default {
  id: 'sentadilla-bulgara',
  nombre: 'Sentadilla búlgara',
  ceja: 'Piernas · mancuernas y banca',
  periodo: 3.6,
  vista: 'lado',
  equipos: [
    { tipo: 'banca', alto: BANCA, z: ATRAS - 0.05 - 0.25, largo: 0.5, ancho: 0.28 },
    { tipo: 'mancuernas', mano: 'ambas' },
  ],
  momentos: [0, 0.29, 0.5],
  cuadros: [
    { t: 0, ...arriba },
    { t: 0.1 },
    { t: 0.5, ...abajo },
    { t: 0.56 },
  ],
  trabajan: ['Cuádriceps', 'Glúteos'],
  ayudan: ['Aductores', 'Isquiotibiales', 'Core'],
  pintar: ['cuadriceps', 'gluteos'],
  pasos: [
    [0, 'Empeine de atrás sobre la banca y el pie de adelante plano, lejos de la banca.'],
    [0.1, 'Baja en vertical con el tronco apenas inclinado y el peso en el pie de adelante.'],
    [0.46, 'Abajo, la rodilla de atrás casi toca el suelo y la de adelante va hacia la punta.'],
    [0.56, 'Sube empujando con todo el pie de adelante.'],
  ],
};
