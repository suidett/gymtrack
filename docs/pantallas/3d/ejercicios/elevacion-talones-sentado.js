// Elevación de talones sentado en máquina. Sentado con las rodillas a 90 grados, la base de
// los dedos en el borde del apoyo y la almohadilla sobre los muslos, justo antes de las
// rodillas; solo se mueve el tobillo y la almohadilla sube con las rodillas.
//
// Cómo está hecho:
//   - La pelvis queda fija en el asiento. Los pies usan pivote 'bola': la base de los dedos queda
//     fija en el borde y `talon` gira el pie; la rodilla sale de la IK y sube sola.
//   - El apoyo de los pies es angosto, justo bajo la base de los dedos (el pie de la figura es
//     rígido y la punta bajaría dentro de un apoyo ancho).
//   - La almohadilla sigue al muslo izquierdo (su X es la X del mundo) y cruza los dos muslos.

const PY = 0.665;              // centro de la pelvis, sentado y derecho
const ASIENTO = 0.5;
const APOYO = 0.1;             // alto del borde donde van los dedos
const RODILLA_Z = 0.43;        // la canilla queda vertical con el pie plano
const BOLA = [0.11, APOYO, RODILLA_Z + 0.135];

const ABAJO = -16, ARRIBA = 30;
const pies = (T) => ({ pie: BOLA, pivote: 'bola', talon: T, abre: 0, polo: [0, 1, 0.3] });
const arco = (t0, t1, T0, T1, n = 5) => Array.from({ length: n }, (_, i) => {
  const u = (i + 1) / n, e = (1 - Math.cos(Math.PI * u)) / 2;
  return { t: t0 + (t1 - t0) * u, piernas: pies(T0 + (T1 - T0) * e) };
});

const sentado = {
  pelvis: { pos: [0, PY, 0], cabeceo: 6 },
  columna: { flex: 2 },
  cabeza: { flex: -4 },
  // Manos en las manillas a los lados del asiento, codos hacia atrás.
  brazos: { mano: [0.27, 0.49, 0.1], polo: [0.3, 0, -1], giro: 0 },
  piernas: pies(ABAJO),
};

export default {
  id: 'elevacion-talones-sentado',
  nombre: 'Elevación de talones sentado',
  ceja: 'Piernas · máquina',
  periodo: 2.8,
  vista: 'lado',
  equipos: [
    // Asiento con su base.
    { tipo: 'bloque', pos: [0, ASIENTO - 0.04, 0.04], tam: [0.42, 0.08, 0.5], color: 'tapiz' },
    { tipo: 'bloque', pos: [0, (ASIENTO - 0.08) / 2, 0], tam: [0.08, ASIENTO - 0.08, 0.08], color: 'estructura' },
    { tipo: 'bloque', pos: [0, 0.015, 0.25], tam: [0.6, 0.03, 0.9], color: 'estructura' },
    // Manillas a los lados del asiento.
    { tipo: 'bloque', pos: [0.27, 0.49, 0.1], tam: [0.03, 0.03, 0.16], color: 'fierro' },
    { tipo: 'bloque', pos: [-0.27, 0.49, 0.1], tam: [0.03, 0.03, 0.16], color: 'fierro' },
    { tipo: 'bloque', pos: [0.245, 0.49, 0.03], tam: [0.06, 0.03, 0.03], color: 'fierro' },
    { tipo: 'bloque', pos: [-0.245, 0.49, 0.03], tam: [0.06, 0.03, 0.03], color: 'fierro' },
    // Apoyo angosto de los pies.
    { tipo: 'bloque', pos: [0, APOYO / 2, BOLA[2]], tam: [0.5, APOYO, 0.05], color: 'estructura', radio: 0.01 },
    // Lo que se mueve: la almohadilla sobre los muslos, que sube con las rodillas.
    { tipo: 'bloque', sigue: 'musloIzq', pos: [-0.1, 0.08, 0.13], tam: [0.44, 0.1, 0.08], color: 'tapiz', radio: 0.03 },
  ],
  momentos: [0, 0.22, 0.42],
  cuadros: [
    { t: 0, ...sentado },
    { t: 0.08 },
    ...arco(0.08, 0.4, ABAJO, ARRIBA),
    { t: 0.5 },
    ...arco(0.5, 1, ARRIBA, ABAJO),   // el último (t = 1) se descarta: el ciclo vuelve al primero
  ],
  trabajan: ['Sóleo', 'Gemelos'],
  ayudan: [],
  pintar: ['gemelos'],
  pasos: [
    [0, 'Siéntate con la base de los dedos en el borde, la almohadilla sobre los muslos y los talones abajo.'],
    [0.08, 'Sube los talones empujando con la punta de los pies, sin tirar con los brazos.'],
    [0.38, 'Arriba, aprieta la pantorrilla un segundo.'],
    [0.5, 'Baja lento hasta estirar bien la pantorrilla.'],
  ],
};
