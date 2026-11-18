// Curl femoral acostado en máquina. Boca abajo sobre la banca, con las rodillas justo fuera del
// borde; solo se mueve la rodilla, de casi recta a unos 120 grados, y la cadera no se despega.
//
// Cómo está hecho:
//   - Boca abajo: pelvis con cabeceo 90 (la cabeza hacia +Z, las piernas hacia -Z).
//   - La rodilla es un punto fijo y el tobillo da vuelta alrededor de ella (función `pierna`).
//     El pie va en neutro respecto de la canilla (talon = flexión + 85).
//   - El rodillo y el brazo de la máquina siguen a la canilla izquierda (marco 'piernaIzq').

const RAD = Math.PI / 180;
const BANCA = 0.55;           // cara de arriba de la banca
const PY = BANCA + 0.114;     // centro de la pelvis, apoyada boca abajo
const CADERA = [0.09, PY, -0.05];
const RODILLA = [0.09, PY - 0.02, -0.05 - 0.4295];
// Tobillo con la rodilla doblada `f` grados (0 = pierna recta, 90 = canilla vertical).
const pierna = (f) => ({
  pie: [0.09, RODILLA[1] + 0.43 * Math.sin(f * RAD), RODILLA[2] - 0.43 * Math.cos(f * RAD)],
  talon: f + 85,
});

// Cuadros intermedios para la ida o la vuelta: el tobillo sigue el arco alrededor de la rodilla
// (si solo hubiera dos cuadros, iría por la cuerda y la rodilla se movería). Suave al partir y
// al llegar.
const arco = (t0, t1, f0, f1, n = 8) => Array.from({ length: n }, (_, k) => {
  const u = (k + 1) / n, e = (1 - Math.cos(Math.PI * u)) / 2;
  return { t: t0 + (t1 - t0) * u, piernas: pierna(f0 + (f1 - f0) * e) };
});

const acostado = {
  pelvis: { pos: [0, PY, 0], cabeceo: 90 },
  columna: { flex: 0 },
  cabeza: { flex: -16 },
  // Manos en las manillas bajo los hombros; los codos van hacia atrás, pegados a la banca.
  brazos: { mano: [0.2, BANCA - 0.25, 0.6], polo: [0.4, -0.2, -1], giro: 0 },
  piernas: { ...pierna(10), polo: [0, -1, 0] },
};

export default {
  id: 'curl-femoral-acostado',
  nombre: 'Curl femoral acostado',
  ceja: 'Piernas · máquina',
  periodo: 3.4,
  vista: 'lado',
  equipos: [
    // Banca: cojín, dos patas y base. Va del pecho hasta antes de las rodillas.
    { tipo: 'bloque', pos: [0, BANCA - 0.04, 0.05], tam: [0.34, 0.08, 0.9], color: 'tapiz' },
    { tipo: 'bloque', pos: [0, (BANCA - 0.08) / 2, 0.42], tam: [0.07, BANCA - 0.08, 0.07], color: 'estructura' },
    { tipo: 'bloque', pos: [0, (BANCA - 0.08) / 2, -0.3], tam: [0.07, BANCA - 0.08, 0.07], color: 'estructura' },
    { tipo: 'bloque', pos: [0, 0.02, 0.05], tam: [0.5, 0.04, 1.3], color: 'estructura' },
    // Manillas bajo los hombros, colgando de la pata de adelante.
    { tipo: 'bloque', pos: [0, BANCA - 0.32, 0.6], tam: [0.43, 0.03, 0.03], color: 'fierro' },
    { tipo: 'bloque', pos: [0.2, BANCA - 0.25, 0.6], tam: [0.03, 0.14, 0.03], color: 'fierro' },
    { tipo: 'bloque', pos: [-0.2, BANCA - 0.25, 0.6], tam: [0.03, 0.14, 0.03], color: 'fierro' },
    { tipo: 'bloque', pos: [0, BANCA - 0.32, 0.51], tam: [0.03, 0.03, 0.18], color: 'fierro' },
    // Eje a la altura de la rodilla, con su parante.
    { tipo: 'bloque', pos: [0.25, RODILLA[1], RODILLA[2]], tam: [0.05, 0.09, 0.09], color: 'estructura' },
    { tipo: 'bloque', pos: [0.275, RODILLA[1] / 2, RODILLA[2]], tam: [0.04, RODILLA[1], 0.05], color: 'estructura' },
    // Lo que se mueve: el rodillo detrás de los tobillos y el brazo que va al eje.
    { tipo: 'bloque', sigue: 'piernaIzq', pos: [-0.09, 0.08, -0.08], tam: [0.42, 0.085, 0.085], color: 'tapiz', radio: 0.04 },
    { tipo: 'bloque', sigue: 'piernaIzq', pos: [0.15, 0.26, -0.04], tam: [0.035, 0.4, 0.04], giro: [13, 0, 0], color: 'fierro' },
  ],
  momentos: [0, 0.22, 0.42],
  cuadros: [
    { t: 0, ...acostado },
    { t: 0.08 },
    ...arco(0.08, 0.4, 10, 120),
    { t: 0.5 },
    ...arco(0.5, 1, 120, 10),   // el último (t = 1) se descarta: el ciclo vuelve al primero
  ],
  trabajan: ['Isquiotibiales'],
  ayudan: ['Gemelos'],
  pintar: ['isquios'],
  pasos: [
    [0, 'Acuéstate boca abajo con las rodillas justo fuera de la banca y el rodillo detrás de los tobillos.'],
    [0.08, 'Dobla las rodillas y lleva los talones hacia los glúteos, con la cadera pegada a la banca.'],
    [0.38, 'Arriba, aprieta los isquiotibiales un segundo sin arquear la espalda.'],
    [0.5, 'Baja lento hasta que las piernas queden casi rectas.'],
  ],
};
