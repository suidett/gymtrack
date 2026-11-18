// Rueda abdominal desde las rodillas. De rodillas sobre una colchoneta, con las manos en la
// rueda y los brazos estirados, rueda hacia adelante hasta que el cuerpo queda casi en línea
// y cerca del suelo, y vuelve tirando con el abdomen.
//
// Cómo está hecho:
//   - La rueda no viene en el motor: son seis bloques redondeados de 19 × 19 cm girados de 15 en
//     15 grados (de lado se ven como una rueda) y un bloque delgado de mango, todos siguiendo a
//     las manos. La rueda no gira al avanzar: es lisa y no se nota.
//     El eje de la rueda va en el centro de los puños, a 0.097 m del suelo.
//   - Rodillas fijas en el suelo (z = 0) y empeines apoyados atrás, como en el crunch en polea.
//     La cadera se mueve en un círculo de 0.43 m alrededor de la rodilla (el muslo gira sobre
//     ella): para cada ángulo del muslo b, la cadera va en [0.09, 0.055 + 0.43·cos(b),
//     0.43·sin(b)] y la pelvis se calcula desde ahí.
//   - En cada cuadro la rueda se puso a 0.628 m de los hombros (brazos estirados): de 0.63 a
//     1.49 m de las rodillas. Los cuadros intermedios van cada 12 grados de muslo para que la
//     rodilla no se mueva entre ellos.
//   - Abajo el muslo queda a 72 grados de la vertical y el tronco casi en su línea, con la
//     espalda neutra (sin hundir la zona lumbar).

const R = Math.PI / 180;
const RUEDA_Y = 0.097;
const piernas = { pie: [0.09, 0.1, -0.4276], talon: 145, polo: [0, -1, 0] };

// b: ángulo del muslo; c: cabeceo de pelvis; flex: columna; cab: cabeza; z: rueda.
const cuadro = (t, b, c, flex, cab, z) => ({
  t,
  pelvis: { pos: [0, +(0.055 + 0.43 * Math.cos(b * R) + 0.05 * Math.cos(c * R)).toFixed(4), +(0.43 * Math.sin(b * R) + 0.05 * Math.sin(c * R)).toFixed(4)], cabeceo: c },
  columna: { flex },
  cabeza: { flex: cab },
  brazos: { mano: [0.1, RUEDA_Y, z], polo: [0.3, 0, -1], giro: -90 },
  piernas,
});

const IDA = [
  [0, 57, 12, -10, 0.627],
  [12, 60.5, 10.5, -9, 0.8043],
  [24, 64, 9, -8, 0.9853],
  [36, 67.5, 7, -6.5, 1.1494],
  [48, 71, 5, -5, 1.293],
  [60, 74, 3.5, -3.5, 1.4078],
  [72, 77, 2, -2, 1.49],
];

const rueda = (giro) => ({ tipo: 'bloque', sigue: 'manos', pos: [0, 0, 0], tam: [0.09, 0.19, 0.19], giro: [giro, 0, 0], color: 'disco', radio: 0.044 });

// Ida (0.06 a 0.42), pausa abajo y vuelta (0.5 a 0.88), con pausa arriba hasta t = 1.
const cuadros = [cuadro(0, ...IDA[0])];
IDA.forEach((f, i) => cuadros.push(cuadro(+(0.06 + (0.36 * i) / (IDA.length - 1)).toFixed(3), ...f)));
[...IDA].reverse().forEach((f, i) => cuadros.push(cuadro(+(0.5 + (0.38 * i) / (IDA.length - 1)).toFixed(3), ...f)));

export default {
  id: 'rueda-abdominal',
  nombre: 'Rueda abdominal',
  ceja: 'Core · rueda',
  periodo: 5.2,
  vista: 'lado',
  equipos: [
    { tipo: 'suelo', colchoneta: { pos: [0, 0.4], tam: [0.6, 1.9] } },
    rueda(0), rueda(15), rueda(30), rueda(45), rueda(60), rueda(75),
    { tipo: 'bloque', sigue: 'manos', pos: [0, 0, 0], tam: [0.34, 0.03, 0.03], color: 'fierro', radio: 0.012 },
  ],
  momentos: [0, 0.25, 0.42],
  cuadros,
  trabajan: ['Abdomen'],
  ayudan: ['Dorsal ancho', 'Hombros', 'Tríceps', 'Glúteos'],
  pintar: ['abdomen'],
  pasos: [
    [0, 'De rodillas, con las manos en la rueda un poco por delante de los hombros y los brazos estirados.'],
    [0.06, 'Rueda hacia adelante con el abdomen apretado, sin hundir la espalda baja.'],
    [0.42, 'Llega hasta donde mantengas la espalda recta, con el pecho cerca del suelo.'],
    [0.5, 'Vuelve tirando con el abdomen hasta quedar otra vez sobre las rodillas.'],
  ],
};
