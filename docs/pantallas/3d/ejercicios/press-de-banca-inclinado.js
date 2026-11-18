// Press de banca inclinado con barra. Como press-de-banca.js, pero sentado en una banca a 30°:
// glúteos en el asiento, espalda alta y cabeza en el respaldo, pies planos en el suelo.
//
// Cómo se calcularon los números (con esqueleto.js):
//   - Banca con el asiento a 0.45 m (corto, 0.38 m) y la bisagra en z = 0. Con la pelvis a -58° y la columna
//     a -4 (un arco leve), el tórax queda en la línea del respaldo: la espalda alta y los
//     glúteos tocan sin meterse.
//   - Abajo la barra toca la parte alta del pecho (bajo las clavículas) y el codo queda casi
//     bajo la barra. Arriba la barra queda en la vertical de los hombros, con los codos casi
//     rectos. La barra sube unos 12 cm hacia la cara: es el camino normal en banca inclinada.
//   - Los codos van a unos 60 grados del tronco (visto de frente al pecho) a media bajada, abajo
//     y a media subida: cada cuadro trae su polo, buscado con esqueleto.js. Para eso, a media
//     bajada la barra ya se acerca un poco al pecho (4 cm) en vez de bajar en línea recta.

const AGARRE = 0.4; // media distancia entre las manos (m)
const mano = (y, z, polo) => ({ mano: [AGARRE, y, z], polo });
const POLO_BAJA = [0.835, 0.006, 0.551];  // arriba y a media bajada
const POLO_ABAJO = [0.761, -0.629, 0.159]; // abajo, con el antebrazo casi vertical
const POLO_SUBE = [0.769, 0.198, 0.607];  // a media subida

const sentado = {
  pelvis: { pos: [0, 0.631, -0.049], cabeceo: -58 },
  columna: { flex: -4 },
  cabeza: { flex: -6 },
  escapulas: { prot: -0.025 },   // escápulas juntas y abajo
  // Pies planos delante del asiento, un poco más abiertos que la cadera.
  piernas: { pie: [0.25, 0.075, 0.45], abre: 15, polo: [0.35, 1, 0.6] },
};

export default {
  id: 'press-de-banca-inclinado',
  nombre: 'Press de banca inclinado',
  ceja: 'Pecho · barra',
  periodo: 3.2,
  vista: 'tres',
  equipos: [
    { tipo: 'banca', inclinada: 30, bisagra: 0, alto: 0.45, asiento: 0.38, respaldo: 0.85 },
    { tipo: 'barra', en: 'manos', discos: [0.225] },
  ],
  momentos: [0, 0.27, 0.47],
  cuadros: [
    { t: 0, ...sentado, brazos: mano(1.425, -0.452, POLO_BAJA) },
    { t: 0.08 },
    { t: 0.27, brazos: mano(1.15, -0.34, POLO_BAJA) },
    { t: 0.47, brazos: mano(0.95, -0.322, POLO_ABAJO) },
    { t: 0.53 },
    { t: 0.72, brazos: mano(1.2, -0.37, POLO_SUBE) },
  ],
  trabajan: ['Pectoral superior', 'Hombro anterior', 'Tríceps'],
  ayudan: ['Serrato anterior', 'Antebrazos'],
  pintar: ['pecho', 'hombros', 'triceps'],
  pasos: [
    [0, 'Banca a unos 30 grados, glúteos y espalda apoyados, pies firmes y barra sobre los hombros.'],
    [0.08, 'Baja la barra controlada hacia la parte alta del pecho, con los codos a unos 60 grados del cuerpo.'],
    [0.45, 'Abajo, la barra toca el pecho justo bajo las clavículas.'],
    [0.53, 'Empuja hacia arriba hasta estirar los brazos, con la barra sobre los hombros.'],
  ],
};
