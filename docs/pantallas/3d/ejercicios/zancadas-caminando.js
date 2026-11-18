// Zancadas caminando con mancuernas. Desde de pie, da un paso largo adelante, baja hasta que
// la rodilla de atrás casi toca el suelo, sube sobre el pie de adelante y trae el de atrás
// para quedar de pie otra vez, un paso más adelante. En la serie se alterna la pierna.
//
// Cómo está hecho:
//   - Se muestra un paso (la izquierda adelante). Al terminar, la figura vuelve al punto de
//     partida para repetir: ese salto ocurre de pie y quieta (último cuadro en t = 0.995), así
//     que se ve como el comienzo del ciclo y no como un pie que resbala.
//   - El pie de atrás gira sobre el borde de los dedos: `dedos(talon, z)` calcula el tobillo
//     para que ese borde quede fijo en el suelo mientras el talón sube.
//   - Los pies apoyados son objetivos fijos; el que avanza pasa por un punto alto a medio
//     camino para no arrastrarse.
//   - Los brazos cuelgan verticales con una mancuerna en cada mano.

const RAD = Math.PI / 180;
const Z0 = -0.46;   // donde parten los dos pies (tobillos)
const PASO = 0.93;  // largo del paso, de tobillo a tobillo
const ADELANTE = Z0 + PASO;
const X = 0.1;      // pies al ancho de la cadera

// Tobillo de un pie apoyado en el borde de los dedos (punto [0, -0.075, 0.18] de la planta)
// que queda en el suelo en zDedos.
const dedos = (talon, zDedos, polo = [0, -0.3, 1]) => {
  const c = Math.cos(talon * RAD), s = Math.sin(talon * RAD);
  return { pie: [-X, 0.075 * c + 0.18 * s, zDedos - (-0.075 * s + 0.18 * c)], talon, polo };
};
const DEDOS_DER = Z0 + 0.18; // borde de los dedos del pie derecho mientras está atrás
const plano = (x, z, polo = [0, 0, 1]) => ({ pie: [x, 0.075, z], talon: 0, polo });
const brazos = (cabeceo) => ({ hombro: [cabeceo, 6, 0], codo: 4, giro: 0 });

const dePie = (z) => ({
  pelvis: { pos: [0, 0.976, z - 0.02], cabeceo: 2 },
  columna: { flex: 0 },
  cabeza: { flex: -3 },
  brazos: brazos(2),
});

export default {
  id: 'zancadas-caminando',
  nombre: 'Zancadas caminando',
  ceja: 'Piernas · mancuernas',
  periodo: 4.6,
  vista: 'lado',
  equipos: [{ tipo: 'mancuernas', mano: 'ambas' }],
  momentos: [0, 0.26, 0.42],
  cuadros: [
    // De pie, pies juntos al ancho de la cadera.
    { t: 0, ...dePie(Z0), piernaIzq: plano(X, Z0), piernaDer: plano(-X, Z0) },
    { t: 0.06 },
    // Paso: el pie izquierdo pasa por arriba y el cuerpo avanza.
    {
      t: 0.16, pelvis: { pos: [0, 0.93, Z0 + 0.22], cabeceo: 3 }, brazos: brazos(3),
      piernaIzq: { pie: [X, 0.2, Z0 + 0.45], talon: -10, polo: [0, 0, 1] },
    },
    // Apoya el pie adelante, plano; el talón de atrás empieza a subir.
    {
      t: 0.26, pelvis: { pos: [0, 0.83, Z0 + 0.5], cabeceo: 4 }, brazos: brazos(4),
      piernaIzq: plano(X, ADELANTE), piernaDer: dedos(30, DEDOS_DER),
    },
    // Abajo: las dos rodillas en ángulo recto, la de atrás cerca del suelo.
    {
      t: 0.42, pelvis: { pos: [0, 0.6, ADELANTE - 0.32], cabeceo: 6 }, cabeza: { flex: -6 }, brazos: brazos(6),
      piernaDer: dedos(60, DEDOS_DER),
    },
    { t: 0.48 },
    // Sube sobre el pie de adelante y despega el de atrás.
    {
      t: 0.58, pelvis: { pos: [0, 0.8, ADELANTE - 0.2], cabeceo: 6 }, cabeza: { flex: -4 }, brazos: brazos(6),
      piernaDer: dedos(70, DEDOS_DER),
    },
    {
      t: 0.68, pelvis: { pos: [0, 0.93, ADELANTE - 0.07], cabeceo: 3 }, cabeza: { flex: -3 }, brazos: brazos(3),
      piernaDer: { pie: [-X, 0.22, Z0 + 0.5], talon: 40, polo: [0, -0.2, 1] },
    },
    // Trae el pie de atrás junto al de adelante: llega desde arriba y queda de pie.
    {
      t: 0.76, pelvis: { pos: [0, 0.965, ADELANTE - 0.03], cabeceo: 2 }, cabeza: { flex: -3 }, brazos: brazos(2),
      piernaDer: { pie: [-X, 0.11, ADELANTE], talon: 5, polo: [0, -0.2, 1] },
    },
    { t: 0.82, ...dePie(ADELANTE), piernaDer: plano(-X, ADELANTE) },
    { t: 0.995 },
    // en t = 1 vuelve al cuadro inicial (de pie, un paso más atrás)
  ],
  trabajan: ['Cuádriceps', 'Glúteos'],
  ayudan: ['Isquiotibiales', 'Aductores', 'Gemelos', 'Core'],
  pintar: ['cuadriceps', 'gluteos'],
  pasos: [
    [0, 'De pie, una mancuerna en cada mano a los costados.'],
    [0.06, 'Da un paso largo adelante y apoya todo el pie.'],
    [0.3, 'Baja en vertical hasta que la rodilla de atrás casi toque el suelo, con el tronco derecho.'],
    [0.5, 'Empuja con el pie de adelante, sube y trae el de atrás. El próximo paso va con la otra pierna.'],
  ],
};
