// Press de banca con barra. Ejemplo de postura acostada: la figura va de espalda sobre una banca
// plana (pelvis con cabeceo -90 y un poco menos para el arco lumbar) y la barra va en el
// mundo, por su trayectoria real; las manos la siguen.
//
// Cómo se calcularon los números (con esqueleto.js):
//   - Banca de 0.43 m: glúteos y espalda alta quedan apoyados (su punto más bajo en y = 0.43),
//     la zona lumbar queda unos centímetros arriba (arco) y la cabeza apoyada.
//   - Abajo la barra toca el pecho a la altura del esternón (z = 0.009, unos 15 cm hacia los
//     pies desde el hombro) y el antebrazo queda vertical: el codo cae justo bajo la mano.
//     El polo de los codos es la dirección del hombro a ese codo, y da 54° entre el brazo y
//     el tronco visto desde arriba.
//   - Arriba la barra queda sobre la articulación del hombro con los codos casi rectos.
//   - Al subir la barra vuelve primero hacia la cara (curva en J) y al bajar va en diagonal.

const AGARRE = 0.4; // media distancia entre las manos (m)
const POLO_CODO = [0.677, -0.551, 0.488];
const mano = (y, z) => ({ mano: [AGARRE, y, z], polo: POLO_CODO });
const POLO_RODILLA = [0.1, 1, 0.35];

const acostado = {
  pelvis: { pos: [0, 0.58, 0.3], cabeceo: -82 },
  columna: { flex: -18 },
  cabeza: { flex: -4 },
  escapulas: { prot: -0.025 },   // escápulas juntas y abajo
  // Pies planos en el suelo, algo más abiertos que la cadera y un poco hacia atrás, rodillas
  // hacia arriba y apenas afuera (en x ±0.27, sobre los pies: de frente no queda «de rana»).
  piernas: { pie: [0.24, 0.075, 0.6], abre: 15, polo: POLO_RODILLA },
};

export default {
  id: 'press-de-banca',
  nombre: 'Press de banca',
  ceja: 'Pecho · barra',
  periodo: 3.2,
  vista: 'tres',
  // 3/4 desde más arriba, para ver el pecho y el recorrido de los codos; de frente, desde los
  // pies y arriba (la vista recta mostraba sobre todo las rodillas y tapaba el pecho).
  vistas: { tres: [0.75, 0.7, 0.2], frente: [0, 0.9, 0.6] },
  equipos: [
    { tipo: 'banca', alto: 0.43, z: -0.05, largo: 1.2, ancho: 0.28 },
    { tipo: 'barra', en: 'manos', discos: [0.225, 0.225] },
  ],
  momentos: [0, 0.27, 0.47],
  cuadros: [
    { t: 0, ...acostado, brazos: mano(1.111, -0.132) },
    { t: 0.08 },
    { t: 0.27, brazos: mano(0.89, -0.062) },
    { t: 0.47, brazos: mano(0.67, 0.009) },
    { t: 0.53 },
    { t: 0.72, brazos: mano(0.92, -0.1) },
  ],
  trabajan: ['Pectoral', 'Tríceps'],
  ayudan: ['Hombro anterior', 'Dorsal ancho', 'Antebrazos'],
  pintar: ['pecho', 'triceps'],
  pintarAyuda: ['hombros', 'dorsales', 'antebrazos'],
  pasos: [
    [0, 'Acostado, pies firmes en el suelo, glúteos y espalda alta apoyados en la banca.'],
    [0.08, 'Baja la barra controlada hacia el esternón, con los codos entre 45 y 70 grados del cuerpo.'],
    [0.45, 'Abajo, la barra toca el pecho y los antebrazos quedan verticales.'],
    [0.53, 'Empuja hacia arriba y un poco hacia la cara hasta estirar los brazos sobre los hombros.'],
  ],
};
