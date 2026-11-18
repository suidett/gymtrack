// Fondos en paralelas, con el pecho como foco: el tronco se inclina hacia adelante (18° arriba,
// 30° abajo), los codos van hacia atrás y un poco afuera, y las rodillas quedan dobladas para
// que los pies no toquen el suelo.
//
// Cómo está hecho:
//   - Las manos son objetivos fijos en el mundo, sobre las barras (no resbalan).
//   - `alinear` corre la pelvis en z para que los hombros queden sobre las manos arriba y
//     unos 15 cm por delante abajo, que es como se ve un fondo real.
//   - Abajo el brazo queda casi paralelo al suelo (el hombro apenas sobre el codo) y el
//     antebrazo inclinado unos 25°: rango completo sin forzar el hombro.
//   - Las piernas van en el marco de la pelvis (siguen al tronco) con la rodilla doblada a 96°.

const MANO = [0.26, 1.165, 0]; // centro del puño sobre la barra izquierda
const HOMBRO = [0.19, 0.15, 0]; // en el marco del tórax

const piernas = { pie: { en: 'pelvis', pos: [0.1, -0.51, -0.35] }, polo: [0, -0.3, 1], talon: 110 };
const brazos = { mano: MANO, polo: [0.3, 0, -1] };

const arriba = {
  pelvis: { pos: [0, 1.375, 0], cabeceo: 18 },
  columna: { flex: 4 },
  cabeza: { flex: -11 },
  alinear: { en: 'torax', pos: HOMBRO, z: 0.02 },
  brazos,
  piernas,
};

const abajo = {
  pelvis: { pos: [0, 1.15, 0], cabeceo: 30 },
  columna: { flex: 6 },
  cabeza: { flex: -18 },
  alinear: { en: 'torax', pos: HOMBRO, z: 0.15 },
};

export default {
  id: 'fondos-en-paralelas',
  nombre: 'Fondos en paralelas',
  ceja: 'Pecho · peso corporal',
  periodo: 3,
  vista: 'lado',
  equipos: [{ tipo: 'paralelas', alto: 1.15, separacion: 0.52, largo: 0.9, z: 0 }],
  momentos: [0, 0.27, 0.47],
  cuadros: [
    { t: 0, ...arriba },
    { t: 0.08 },
    { t: 0.47, ...abajo },
    { t: 0.53 },
  ],
  trabajan: ['Pectoral inferior', 'Tríceps'],
  ayudan: ['Hombro anterior', 'Core', 'Serrato anterior'],
  pintar: ['pecho', 'triceps'],
  pasos: [
    [0, 'Apoyado en las barras con los brazos estirados, el tronco un poco adelante y las rodillas dobladas.'],
    [0.08, 'Baja doblando los codos hacia atrás mientras inclinas el pecho hacia adelante.'],
    [0.45, 'Abajo, los brazos quedan casi paralelos al suelo, sin hundir los hombros.'],
    [0.53, 'Empuja las barras hasta estirar los brazos, sin trabar los codos.'],
  ],
};
