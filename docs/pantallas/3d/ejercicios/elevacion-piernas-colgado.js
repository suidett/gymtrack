// Elevación de piernas colgado. Colgado de la barra con agarre prono al ancho de los hombros,
// sube las piernas estiradas hasta que quedan un poco sobre la horizontal, enrollando la pelvis,
// y baja lento sin balancearse.
//
// Cómo está hecho:
//   - Las manos van fijas en la barra (2.35 m, puños en x = ±0.28) y los hombros siempre a
//     0.6375 m de los puños: brazos casi estirados.
//   - Piernas por ángulos (rodillas casi rectas, puntas estiradas). Ángulo de la pierna respecto
//     de la vertical = flexión de cadera - cabeceo de la pelvis.
//   - En cada cuadro el centro de masa del cuerpo queda bajo la barra, como pasa colgado: al
//     subir las piernas, la cadera se va un poco atrás y los hombros quedan unos 20 cm detrás de
//     la barra, con los brazos inclinados hacia adelante.
//   - Arriba: pelvis con cabeceo -24 (enrollada hacia atrás), columna 14, cadera 72: la pierna
//     queda 96 grados respecto de la vertical. Los pies nunca bajan de 34 cm del suelo.

const brazos = { mano: [0.28, 2.35, 0], polo: [1, 0, 0.15], giro: -90 };

const colgado = {
  pelvis: { pos: [0, 1.249, -0.01], cabeceo: 0 },
  columna: { flex: 0 },
  cabeza: { flex: 0 },
  escapulas: { elev: 0.02 },
  brazos,
  piernas: { cadera: [3, 0, 0], rodilla: 4, tobillo: 25 },
};

const medio = {
  pelvis: { pos: [0, 1.2667, -0.0812], cabeceo: -12 },
  columna: { flex: 7 },
  piernas: { cadera: [36, 0, 0], rodilla: 3, tobillo: 25 },
};

const arriba = {
  pelvis: { pos: [0, 1.2961, -0.0983], cabeceo: -24 },
  columna: { flex: 14 },
  piernas: { cadera: [72, 0, 0], rodilla: 3, tobillo: 25 },
};

export default {
  id: 'elevacion-piernas-colgado',
  nombre: 'Elevación de piernas colgado',
  ceja: 'Core · peso corporal',
  periodo: 4.2,
  vista: 'lado',
  // De lado justo, el parante de la barra tapa el cuerpo: la cámara se corre un poco atrás.
  vistas: { lado: [1, 0.16, -0.4] },
  equipos: [{ tipo: 'dominadas', alto: 2.35, z: 0, ancho: 1.2 }],
  momentos: [0, 0.25, 0.45],
  cuadros: [
    { t: 0, ...colgado },
    { t: 0.08 },
    { t: 0.25, ...medio },
    { t: 0.42, ...arriba },
    { t: 0.5 },                 // un instante arriba
    { t: 0.72, ...medio },
    { t: 0.92, ...colgado },
  ],
  trabajan: ['Abdomen', 'Flexores de cadera'],
  ayudan: ['Oblicuos', 'Antebrazos', 'Dorsal ancho'],
  pintar: ['abdomen'],
  pasos: [
    [0, 'Cuélgate de la barra con las manos al ancho de los hombros y el cuerpo quieto.'],
    [0.08, 'Sube las piernas estiradas apretando el abdomen, sin balancearte.'],
    [0.42, 'Arriba, las piernas quedan un poco sobre la horizontal y la pelvis se enrolla hacia adelante.'],
    [0.5, 'Baja lento y controlado hasta quedar colgado otra vez.'],
  ],
};
