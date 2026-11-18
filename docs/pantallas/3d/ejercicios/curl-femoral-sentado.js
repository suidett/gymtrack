// Curl femoral sentado en máquina. Sentado con la espalda apoyada y la almohadilla sobre los
// muslos; solo se mueve la rodilla: de casi recta a unos 110 grados, con el rodillo detrás de
// los tobillos.
//
// Cómo está hecho (igual que extension-de-cuadriceps.js):
//   - La pelvis queda fija y los muslos casi horizontales: la rodilla es un punto fijo y el
//     tobillo da vuelta alrededor de ella (función `pierna`). Pie en neutro respecto de la canilla.
//   - El rodillo y el brazo de la máquina siguen a la canilla izquierda (marco 'piernaIzq').
//   - El asiento termina antes de la rodilla para que la pantorrilla pase por debajo al doblar.

const RAD = Math.PI / 180;
const PY = 0.665;        // centro de la pelvis, sentado
const CAB = -15;         // reclinado como el respaldo
const ASIENTO = 0.5;     // cara de arriba del asiento
const c = Math.cos(CAB * RAD), s = Math.sin(CAB * RAD);
const dePelvis = (y, z) => [0, PY + y * c - z * s, y * s + z * c];

const CADERA = [0.09, PY - 0.05 * c, -0.05 * s];
const RODILLA = [0.09, CADERA[1] - 0.025, CADERA[2] + 0.4293];
// Tobillo con la rodilla doblada `f` grados (0 = pierna recta, 90 = canilla vertical).
const pierna = (f) => ({
  pie: [0.09, RODILLA[1] - 0.43 * Math.sin(f * RAD), RODILLA[2] + 0.43 * Math.cos(f * RAD)],
  talon: f - 95,
});

// Cuadros intermedios para la ida o la vuelta: el tobillo sigue el arco alrededor de la rodilla
// (si solo hubiera dos cuadros, iría por la cuerda y la rodilla se movería). Suave al partir y
// al llegar.
const arco = (t0, t1, f0, f1, n = 8) => Array.from({ length: n }, (_, k) => {
  const u = (k + 1) / n, e = (1 - Math.cos(Math.PI * u)) / 2;
  return { t: t0 + (t1 - t0) * u, piernas: pierna(f0 + (f1 - f0) * e) };
});

// Almohadilla de los muslos, justo antes de las rodillas.
const MUSLOS = [0, RODILLA[1] + 0.17, RODILLA[2] - 0.11];

const sentado = {
  pelvis: { pos: [0, PY, 0], cabeceo: CAB },
  columna: { flex: -4 },
  cabeza: { flex: 18 },
  brazos: { mano: [0.27, 0.49, 0.04], polo: [0.3, 0, -1], giro: 0 },
  piernas: { ...pierna(15), polo: [0, 1, 0.2] },
};

export default {
  id: 'curl-femoral-sentado',
  nombre: 'Curl femoral sentado',
  ceja: 'Piernas · máquina',
  periodo: 3.4,
  vista: 'lado',
  equipos: [
    // Asiento, respaldo y base.
    { tipo: 'bloque', pos: [0, ASIENTO - 0.04, 0.04], tam: [0.44, 0.08, 0.5], color: 'tapiz' },
    { tipo: 'bloque', pos: dePelvis(0.25, -0.178), tam: [0.44, 0.7, 0.08], giro: [CAB, 0, 0], color: 'tapiz' },
    { tipo: 'bloque', pos: [0, (ASIENTO - 0.08) / 2, -0.02], tam: [0.08, ASIENTO - 0.08, 0.08], color: 'estructura' },
    { tipo: 'bloque', pos: [0, 0.02, 0.05], tam: [0.5, 0.04, 0.8], color: 'estructura' },
    // Manillas a los lados del asiento.
    { tipo: 'bloque', pos: [0.27, 0.49, 0.04], tam: [0.03, 0.03, 0.16], color: 'fierro' },
    { tipo: 'bloque', pos: [-0.27, 0.49, 0.04], tam: [0.03, 0.03, 0.16], color: 'fierro' },
    { tipo: 'bloque', pos: [0.245, 0.49, -0.03], tam: [0.06, 0.03, 0.03], color: 'fierro' },
    { tipo: 'bloque', pos: [-0.245, 0.49, -0.03], tam: [0.06, 0.03, 0.03], color: 'fierro' },
    // Almohadilla fija sobre los muslos, colgada del parante del eje.
    { tipo: 'bloque', pos: MUSLOS, tam: [0.44, 0.07, 0.12], color: 'tapiz', radio: 0.03 },
    { tipo: 'bloque', pos: [0.25, (MUSLOS[1] + RODILLA[1]) / 2, MUSLOS[2]], tam: [0.04, MUSLOS[1] - RODILLA[1] + 0.04, 0.04], color: 'estructura' },
    // Eje a la altura de la rodilla, con su parante.
    { tipo: 'bloque', pos: [0.25, RODILLA[1], RODILLA[2]], tam: [0.05, 0.09, 0.09], color: 'estructura' },
    { tipo: 'bloque', pos: [0.275, RODILLA[1] / 2, RODILLA[2]], tam: [0.04, RODILLA[1], 0.05], color: 'estructura' },
    // Lo que se mueve: el rodillo detrás de los tobillos y el brazo que va al eje.
    { tipo: 'bloque', sigue: 'piernaIzq', pos: [-0.09, 0.08, -0.08], tam: [0.42, 0.085, 0.085], color: 'tapiz', radio: 0.04 },
    { tipo: 'bloque', sigue: 'piernaIzq', pos: [0.15, 0.26, -0.04], tam: [0.035, 0.4, 0.04], giro: [13, 0, 0], color: 'fierro' },
  ],
  momentos: [0, 0.22, 0.42],
  cuadros: [
    { t: 0, ...sentado },
    { t: 0.08 },
    ...arco(0.08, 0.4, 15, 110),
    { t: 0.5 },
    ...arco(0.5, 1, 110, 15),   // el último (t = 1) se descarta: el ciclo vuelve al primero
  ],
  trabajan: ['Isquiotibiales'],
  ayudan: ['Gemelos'],
  pintar: ['isquios'],
  pasos: [
    [0, 'Siéntate con la espalda apoyada, la almohadilla firme sobre los muslos y el rodillo detrás de los tobillos.'],
    [0.08, 'Dobla las rodillas y lleva los talones hacia abajo y atrás, sin levantar la cadera.'],
    [0.38, 'Abajo, los talones quedan bajo el asiento: aprieta los isquiotibiales un segundo.'],
    [0.5, 'Vuelve lento hasta que las piernas queden casi rectas.'],
  ],
};
