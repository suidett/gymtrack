// Extensión de cuádriceps en máquina. Sentado con la espalda apoyada, la cadera y los muslos
// quietos; solo se mueve la rodilla, de 90 grados a casi recta, y el rodillo va con la canilla.
//
// Cómo está hecho:
//   - La pelvis queda fija en el asiento, un poco reclinada como el respaldo.
//   - Los muslos van casi horizontales: la rodilla es un punto fijo y el tobillo da vuelta alrededor de
//     ella (función `pierna`). El pie va en neutro respecto de la canilla (talon = flexión - 95).
//   - El rodillo y el brazo de la máquina siguen a la canilla izquierda (marco 'piernaIzq'): su X
//     es la X del mundo, así el rodillo cruza por delante de las dos canillas.

const RAD = Math.PI / 180;
const PY = 0.662;        // centro de la pelvis, sentado
const CAB = -10;         // reclinado como el respaldo
const ASIENTO = 0.5;     // cara de arriba del asiento
const c = Math.cos(CAB * RAD), s = Math.sin(CAB * RAD);
// Un punto escrito en el marco de la pelvis (solo cabeceo), en el mundo.
const dePelvis = (y, z) => [0, PY + y * c - z * s, y * s + z * c];

const CADERA = [0.09, PY - 0.05 * c, -0.05 * s];
const RODILLA = [0.09, CADERA[1] - 0.025, CADERA[2] + 0.4293]; // muslo apenas inclinado, apoyado
// Tobillo con la rodilla doblada `f` grados (90 = canilla vertical, 0 = pierna recta).
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

const sentado = {
  pelvis: { pos: [0, PY, 0], cabeceo: CAB },
  columna: { flex: -6 },
  cabeza: { flex: 14 },
  // Manos en las manillas a los lados del asiento, codos hacia atrás.
  brazos: { mano: [0.27, 0.49, 0.04], polo: [0.3, 0, -1], giro: 0 },
  piernas: { ...pierna(90), polo: [0, 1, 0.2] },
};

const respaldo = dePelvis(0.25, -0.188);

export default {
  id: 'extension-de-cuadriceps',
  nombre: 'Extensión de cuádriceps',
  ceja: 'Piernas · máquina',
  periodo: 3.4,
  vista: 'lado',
  equipos: [
    // Asiento, respaldo y base.
    { tipo: 'bloque', pos: [0, ASIENTO - 0.04, 0.08], tam: [0.44, 0.08, 0.56], color: 'tapiz' },
    { tipo: 'bloque', pos: respaldo, tam: [0.44, 0.7, 0.08], giro: [CAB, 0, 0], color: 'tapiz' },
    { tipo: 'bloque', pos: [0, (ASIENTO - 0.08) / 2, 0.02], tam: [0.08, ASIENTO - 0.08, 0.08], color: 'estructura' },
    { tipo: 'bloque', pos: [0, 0.02, 0.05], tam: [0.5, 0.04, 0.8], color: 'estructura' },
    // Manillas a los lados del asiento.
    { tipo: 'bloque', pos: [0.27, 0.49, 0.04], tam: [0.03, 0.03, 0.16], color: 'fierro' },
    { tipo: 'bloque', pos: [-0.27, 0.49, 0.04], tam: [0.03, 0.03, 0.16], color: 'fierro' },
    { tipo: 'bloque', pos: [0.245, 0.49, -0.03], tam: [0.06, 0.03, 0.03], color: 'fierro' },
    { tipo: 'bloque', pos: [-0.245, 0.49, -0.03], tam: [0.06, 0.03, 0.03], color: 'fierro' },
    // Eje de la máquina a la altura de la rodilla, con su parante.
    { tipo: 'bloque', pos: [0.25, RODILLA[1], RODILLA[2]], tam: [0.05, 0.09, 0.09], color: 'estructura' },
    { tipo: 'bloque', pos: [0.275, RODILLA[1] / 2, RODILLA[2]], tam: [0.04, RODILLA[1], 0.05], color: 'estructura' },
    // Lo que se mueve: el rodillo sobre los tobillos y el brazo que va al eje.
    { tipo: 'bloque', sigue: 'piernaIzq', pos: [-0.09, 0.07, 0.092], tam: [0.42, 0.085, 0.085], color: 'tapiz', radio: 0.04 },
    { tipo: 'bloque', sigue: 'piernaIzq', pos: [0.15, 0.25, 0.045], tam: [0.035, 0.42, 0.04], giro: [-14, 0, 0], color: 'fierro' },
  ],
  momentos: [0, 0.22, 0.42],
  cuadros: [
    { t: 0, ...sentado },
    { t: 0.08 },
    ...arco(0.08, 0.4, 90, 8),
    { t: 0.5 },
    ...arco(0.5, 1, 8, 90),   // el último (t = 1) se descarta: el ciclo vuelve al primero
  ],
  trabajan: ['Cuádriceps'],
  ayudan: [],
  pintar: ['cuadriceps'],
  pasos: [
    [0, 'Siéntate con la espalda apoyada, las rodillas en el borde del asiento y el rodillo sobre los tobillos.'],
    [0.08, 'Estira las rodillas y sube el rodillo, sin despegar la cadera del asiento.'],
    [0.38, 'Arriba, las piernas quedan casi rectas: aprieta el cuádriceps un segundo.'],
    [0.5, 'Baja lento hasta que las rodillas vuelvan a 90 grados.'],
  ],
};
