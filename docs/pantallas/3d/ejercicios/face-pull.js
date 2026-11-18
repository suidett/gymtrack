// Face pull en polea con cuerda. De pie frente a la polea a la altura de la cara, tira la cuerda
// hacia la frente separando las manos, con los codos altos y abiertos.
//
// Cómo está hecho:
//   - Pies fijos en el suelo y tronco quieto, derecho, apenas inclinado atrás.
//   - Polea a la altura de los ojos, con cuerda: el cable llega casi horizontal a la cara.
//   - Las manos van por el mundo: salen juntas con los brazos estirados hacia la polea y terminan
//     separadas a los lados de la cabeza, sobre los codos (rotación externa del hombro).
//   - Codos hacia afuera y un poco atrás, a la altura de los hombros al final.

const de_pie = {
  pelvis: { pos: [0, 0.975, 0], cabeceo: -3 },
  columna: { flex: -2 },
  cabeza: { flex: 4 },
  piernas: { pie: [0.13, 0.075, 0.02], abre: 8, polo: [0.15, 0, 1] },
};

const POLO = [1, -0.15, -0.35]; // codos afuera, a la altura de los hombros
const manos = (x, y, z, prot) => ({ escapulas: { prot }, brazos: { mano: [x, y, z], polo: POLO, giro: 0 } });

export default {
  id: 'face-pull',
  nombre: 'Face pull',
  ceja: 'Espalda · polea',
  periodo: 3,
  vista: 'tres',
  // De frente la torre tapa la figura: la cámara se corre un poco al lado.
  vistas: { frente: [0.42, 0.18, 1] },
  equipos: [{ tipo: 'polea', anclaje: [0, 1.66, 1.25], mano: 'ambas', manilla: 'cuerda' }],
  momentos: [0, 0.22, 0.45],
  cuadros: [
    { t: 0, ...de_pie, ...manos(0.08, 1.5, 0.6, 0.025) },
    { t: 0.08 },
    { t: 0.26, ...manos(0.17, 1.6, 0.34, 0.0) },
    { t: 0.45, ...manos(0.25, 1.68, 0.08, -0.03) },
    { t: 0.55 },                 // aguanta atrás
    { t: 0.78, ...manos(0.16, 1.58, 0.36, 0.005) },
  ],
  trabajan: ['Hombro posterior', 'Trapecio medio', 'Romboides'],
  ayudan: ['Manguito rotador', 'Bíceps'],
  pintar: ['hombros', 'trapecio'],
  pasos: [
    [0, 'De pie frente a la polea, cuerda tomada con los brazos estirados a la altura de la cara.'],
    [0.08, 'Tira la cuerda hacia la frente con los codos altos y abiertos hacia los lados.'],
    [0.43, 'Al final, separa las manos a los lados de la cabeza y junta las escápulas.'],
    [0.55, 'Estira los brazos controlado de vuelta hacia la polea.'],
  ],
};
