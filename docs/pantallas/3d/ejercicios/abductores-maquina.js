// Abductores en máquina. Sentado con la espalda apoyada, los pies en sus apoyos y las
// almohadillas por fuera de las rodillas; los muslos se abren hacia los lados, en el plano del
// asiento, y vuelven controlados.
//
// Cómo está hecho:
//   - La pelvis queda fija. Cada muslo gira alrededor de la cadera, casi horizontal, y la canilla
//     cuelga vertical: el tobillo queda bajo la rodilla (función `pierna`). La punta del pie se
//     abre lo mismo que el muslo, porque el apoyo del pie va con el brazo de la máquina.
//   - Cuadros intermedios (función `arco`) para que la rodilla siga su arco y no la cuerda.
//   - Las almohadillas, los brazos y los apoyos de los pies siguen a cada pierna. En el marco
//     del muslo y de la canilla, la X apunta afuera en la izquierda y adentro en la derecha.

const RAD = Math.PI / 180;
const PY = 0.662;        // centro de la pelvis, sentado
const CAB = -10;         // reclinado como el respaldo
const ASIENTO = 0.5;
const c = Math.cos(CAB * RAD), s = Math.sin(CAB * RAD);
const dePelvis = (y, z) => [0, PY + y * c - z * s, y * s + z * c];
const CADERA = [0.09, PY - 0.05 * c, -0.05 * s];

// Pierna izquierda con el muslo abierto `a` grados hacia afuera.
const pierna = (a) => {
  const r = a * RAD;
  const rodilla = [CADERA[0] + 0.4293 * Math.sin(r), CADERA[1] - 0.025, CADERA[2] + 0.4293 * Math.cos(r)];
  return { pie: [rodilla[0], rodilla[1] - 0.43, rodilla[2]], abre: a, talon: 0 };
};
const arco = (t0, t1, a0, a1, n = 6) => Array.from({ length: n }, (_, k) => {
  const u = (k + 1) / n, e = (1 - Math.cos(Math.PI * u)) / 2;
  return { t: t0 + (t1 - t0) * u, piernas: pierna(a0 + (a1 - a0) * e) };
});

const CERRADO = 3, ABIERTO = 38;

const sentado = {
  pelvis: { pos: [0, PY, 0], cabeceo: CAB },
  columna: { flex: -6 },
  cabeza: { flex: 14 },
  brazos: { mano: [0.27, 0.49, -0.03], polo: [0.3, 0, -1], giro: 0 },
  piernas: { ...pierna(CERRADO), polo: [0, 1, 0] },
};

// Piezas que siguen a una pierna; en la derecha la X del marco va al revés.
const brazoMaquina = (L, x) => [
  { tipo: 'bloque', sigue: 'muslo' + L, pos: [x * 0.105, 0.08, 0], tam: [0.05, 0.2, 0.15], color: 'tapiz', radio: 0.02 },
  { tipo: 'bloque', sigue: 'pierna' + L, pos: [x * 0.105, 0.17, 0], tam: [0.035, 0.5, 0.035], color: 'fierro' },
  { tipo: 'bloque', sigue: 'pie' + L, pos: [0, -0.087, 0.06], tam: [0.12, 0.02, 0.27], color: 'fierro' },
];

export default {
  id: 'abductores-maquina',
  nombre: 'Abductores en máquina',
  ceja: 'Piernas · máquina',
  periodo: 3.2,
  vista: 'frente',
  equipos: [
    // Asiento, respaldo y base.
    { tipo: 'bloque', pos: [0, ASIENTO - 0.04, 0.07], tam: [0.44, 0.08, 0.54], color: 'tapiz' },
    { tipo: 'bloque', pos: dePelvis(0.25, -0.188), tam: [0.44, 0.7, 0.08], giro: [CAB, 0, 0], color: 'tapiz' },
    { tipo: 'bloque', pos: [0, (ASIENTO - 0.08) / 2, 0], tam: [0.08, ASIENTO - 0.08, 0.08], color: 'estructura' },
    { tipo: 'bloque', pos: [0, 0.02, 0.05], tam: [0.5, 0.04, 0.8], color: 'estructura' },
    // Manillas a los lados del asiento.
    { tipo: 'bloque', pos: [0.27, 0.49, -0.03], tam: [0.03, 0.03, 0.16], color: 'fierro' },
    { tipo: 'bloque', pos: [-0.27, 0.49, -0.03], tam: [0.03, 0.03, 0.16], color: 'fierro' },
    { tipo: 'bloque', pos: [0.245, 0.49, -0.1], tam: [0.06, 0.03, 0.03], color: 'fierro' },
    { tipo: 'bloque', pos: [-0.245, 0.49, -0.1], tam: [0.06, 0.03, 0.03], color: 'fierro' },
    // Lo que se mueve: almohadilla en la rodilla, brazo y apoyo del pie de cada lado.
    ...brazoMaquina('Izq', 1),
    ...brazoMaquina('Der', -1),
  ],
  momentos: [0, 0.22, 0.42],
  cuadros: [
    { t: 0, ...sentado },
    { t: 0.08 },
    ...arco(0.08, 0.4, CERRADO, ABIERTO),
    { t: 0.5 },
    ...arco(0.5, 1, ABIERTO, CERRADO),   // el último (t = 1) se descarta: el ciclo vuelve al primero
  ],
  trabajan: ['Glúteo medio', 'Glúteo menor'],
  ayudan: ['Tensor de la fascia lata'],
  pintar: ['gluteos'],
  pasos: [
    [0, 'Siéntate con la espalda apoyada, los pies en los apoyos y las almohadillas por fuera de las rodillas.'],
    [0.08, 'Abre las piernas empujando las almohadillas hacia afuera, con la espalda pegada al respaldo.'],
    [0.38, 'Abre hasta donde controles y aguanta un segundo.'],
    [0.5, 'Vuelve lento, sin dejar que el peso caiga de golpe.'],
  ],
};
