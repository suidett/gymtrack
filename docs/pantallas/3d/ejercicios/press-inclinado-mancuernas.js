// Press inclinado con mancuernas. El cuerpo es el de press-de-banca-inclinado.js (banca a 30°,
// glúteos en el asiento, espalda alta en el respaldo, pies en el suelo); cada mano lleva su
// mancuerna.
//
// Cómo se calcularon los números (con esqueleto.js):
//   - Arriba las mancuernas quedan en la vertical de los hombros, un poco hacia adentro y sin
//     tocarse, con los codos casi rectos.
//   - Abajo bajan a los lados de la parte alta del pecho, con el antebrazo vertical.
//   - giro 33 deja las mancuernas en línea (el mango de lado a lado).
//   - Los codos van a unos 60 grados del tronco (visto de frente al pecho) a media bajada, abajo
//     y a media subida: cada cuadro trae su polo, buscado con esqueleto.js, como en
//     press-de-banca-inclinado.js.

const mano = (x, y, z, polo) => ({ mano: [x, y, z], polo, giro: 33 });
const POLO_BAJA = [0.832, 0.026, 0.555];  // arriba y a media bajada
const POLO_ABAJO = [0.726, -0.677, 0.118]; // abajo, con el antebrazo casi vertical
const POLO_SUBE = [0.758, 0.225, 0.612];  // a media subida

const sentado = {
  pelvis: { pos: [0, 0.631, -0.049], cabeceo: -58 },
  columna: { flex: -4 },
  cabeza: { flex: -6 },
  escapulas: { prot: -0.025 },
  piernas: { pie: [0.25, 0.075, 0.45], abre: 15, polo: [0.35, 1, 0.6] },
};

export default {
  id: 'press-inclinado-mancuernas',
  nombre: 'Press inclinado con mancuernas',
  ceja: 'Pecho · mancuernas',
  periodo: 3.2,
  vista: 'tres',
  equipos: [
    { tipo: 'banca', inclinada: 30, bisagra: 0, alto: 0.45, asiento: 0.38, respaldo: 0.85 },
    { tipo: 'mancuernas', mano: 'ambas' },
  ],
  momentos: [0, 0.27, 0.47],
  cuadros: [
    { t: 0, ...sentado, brazos: mano(0.16, 1.457, -0.455, POLO_BAJA) },
    { t: 0.08 },
    { t: 0.27, brazos: mano(0.37, 1.15, -0.34, POLO_BAJA) },
    { t: 0.47, brazos: mano(0.4, 0.93, -0.315, POLO_ABAJO) },
    { t: 0.53 },
    { t: 0.72, brazos: mano(0.35, 1.2, -0.37, POLO_SUBE) },
  ],
  trabajan: ['Pectoral superior', 'Hombro anterior', 'Tríceps'],
  ayudan: ['Serrato anterior', 'Antebrazos'],
  pintar: ['pecho', 'hombros', 'triceps'],
  pasos: [
    [0, 'Banca a unos 30 grados, espalda apoyada y una mancuerna en cada mano sobre los hombros.'],
    [0.08, 'Baja las mancuernas controladas hacia los lados de la parte alta del pecho, con los codos a unos 60 grados del cuerpo.'],
    [0.45, 'Abajo, las mancuernas quedan a los lados del pecho y los antebrazos verticales.'],
    [0.53, 'Empuja hacia arriba y un poco hacia adentro, sin chocar las mancuernas.'],
  ],
};
