// Press con mancuernas en banca plana. El cuerpo es el mismo de press-de-banca.js (acostado,
// pies en el suelo, escápulas juntas); cambian las manos, que van cada una con su mancuerna.
//
// Cómo se calcularon los números (con esqueleto.js):
//   - Arriba las mancuernas quedan sobre los hombros, un poco hacia adentro y sin tocarse,
//     con los codos casi rectos.
//   - Abajo bajan a los lados del pecho, a la altura del esternón, con el antebrazo vertical
//     (el codo bajo la mano) y unos 53° entre el brazo y el tronco visto desde arriba.
//   - giro 33 deja las mancuernas en línea (el mango de lado a lado, palmas hacia los pies).

const POLO_CODO = [0.677, -0.551, 0.488];
const mano = (x, y, z) => ({ mano: [x, y, z], polo: POLO_CODO, giro: 33 });

const acostado = {
  pelvis: { pos: [0, 0.58, 0.3], cabeceo: -82 },
  columna: { flex: -18 },
  cabeza: { flex: -4 },
  escapulas: { prot: -0.025 },
  // Pies planos a ±0.24, rodillas a ±0.27: de frente no se abren como rana.
  piernas: { pie: [0.24, 0.075, 0.6], abre: 8, polo: [0.12, 1, 0.4] },
};

export default {
  id: 'press-con-mancuernas',
  nombre: 'Press con mancuernas',
  ceja: 'Pecho · mancuernas',
  periodo: 3.2,
  vista: 'tres',
  // Desde más arriba, para que se vea el pecho y el recorrido de los codos y no la entrepierna.
  vistas: { frente: [0, 0.9, 0.6], tres: [0.75, 0.7, 0.2] },
  equipos: [
    { tipo: 'banca', alto: 0.43, z: -0.05, largo: 1.2, ancho: 0.28 },
    { tipo: 'mancuernas', mano: 'ambas' },
  ],
  momentos: [0, 0.27, 0.47],
  cuadros: [
    { t: 0, ...acostado, brazos: mano(0.16, 1.14, -0.13) },
    { t: 0.08 },
    { t: 0.27, brazos: mano(0.36, 0.93, -0.05) },
    { t: 0.47, brazos: mano(0.4, 0.69, 0) },
    { t: 0.53 },
    { t: 0.72, brazos: mano(0.34, 0.96, -0.07) },
  ],
  trabajan: ['Pectoral', 'Tríceps'],
  ayudan: ['Hombro anterior', 'Serrato anterior', 'Antebrazos'],
  pintar: ['pecho', 'triceps'],
  pasos: [
    [0, 'Acostado, pies firmes en el suelo y una mancuerna en cada mano sobre los hombros.'],
    [0.08, 'Baja las mancuernas controladas hacia los lados del pecho, con los codos a unos 45 a 60 grados del cuerpo.'],
    [0.45, 'Abajo, las mancuernas quedan a la altura del pecho y los antebrazos verticales.'],
    [0.53, 'Empuja hacia arriba y un poco hacia adentro, sin chocar las mancuernas.'],
  ],
};
