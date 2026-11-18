// Estocada estática (split squat) con mancuernas. Pies separados adelante y atrás, al ancho
// de la cadera. El pie de adelante va plano y el de atrás apoyado en los dedos, con el
// talón arriba. El cuerpo baja y sube en vertical, sin mover los pies.
//
// Cómo está hecho:
//   - El pie de adelante es un objetivo fijo en el suelo.
//   - El de atrás se apoya en la punta: `atras(talon)` calcula dónde va el tobillo para que
//     el borde de los dedos quede siempre en el mismo punto del suelo mientras el talón sube
//     o baja (el pie es rígido, así que gira sobre ese borde).
//   - Solo cambian la pelvis (altura y cabeceo), la cabeza y el talón de atrás. Los brazos
//     cuelgan verticales con una mancuerna en cada mano (la flexión del hombro compensa el
//     cabeceo del tronco).

const RAD = Math.PI / 180;
const DEDOS = [-0.1, 0, -0.43]; // donde apoyan los dedos del pie de atrás
// Tobillo del pie de atrás para un talón dado: el punto de la planta bajo los dedos
// ([0, -0.075, 0.18] en el marco del pie) queda en DEDOS.
const atras = (talon) => {
  const c = Math.cos(talon * RAD), s = Math.sin(talon * RAD);
  const y = 0.075 * c + 0.18 * s, z = -0.075 * s + 0.18 * c;
  return { pie: [DEDOS[0], DEDOS[1] + y, DEDOS[2] - z], talon, polo: [0, -0.3, 1] };
};
const brazos = (cabeceo) => ({ hombro: [cabeceo, 6, 0], codo: 4, giro: 0 });

const arriba = {
  pelvis: { pos: [0, 0.918, 0.035], cabeceo: 3 },
  columna: { flex: 0 },
  cabeza: { flex: -3 },
  brazos: brazos(3),
  piernaIzq: { pie: [0.1, 0.075, 0.32], abre: 5, polo: [0.05, 0, 1] },
  piernaDer: atras(50),
};

const abajo = {
  pelvis: { pos: [0, 0.6, 0], cabeceo: 6 },
  cabeza: { flex: -6 },
  brazos: brazos(6),
  piernaDer: atras(60),
};

export default {
  id: 'estocada-estatica',
  nombre: 'Estocada estática',
  ceja: 'Piernas · mancuernas',
  periodo: 3.4,
  vista: 'lado',
  equipos: [{ tipo: 'mancuernas', mano: 'ambas' }],
  momentos: [0, 0.29, 0.5],
  cuadros: [
    { t: 0, ...arriba },
    { t: 0.1 },
    { t: 0.5, ...abajo },
    { t: 0.56 },
  ],
  trabajan: ['Cuádriceps', 'Glúteos'],
  ayudan: ['Aductores', 'Isquiotibiales', 'Gemelos', 'Core'],
  pintar: ['cuadriceps', 'gluteos'],
  pasos: [
    [0, 'Un pie adelante y otro atrás, al ancho de la cadera, con el talón de atrás arriba.'],
    [0.1, 'Baja en vertical, con el tronco derecho y el peso repartido entre los dos pies.'],
    [0.46, 'Abajo, la rodilla de atrás casi toca el suelo y las dos quedan en ángulo recto.'],
    [0.56, 'Sube empujando con el pie de adelante, sin mover los pies.'],
  ],
};
