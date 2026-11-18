// Sentadilla goblet con kettlebell. De pie, la kettlebell tomada por las asas frente al
// pecho, codos abajo. Baja profundo con el tronco derecho y los codos por dentro de las
// rodillas.
//
// Cómo está hecho:
//   - Las manos van en el marco 'torax', frente al pecho: suben y bajan con el tronco. La
//     kettlebell cuelga de las manos (cuelga: true) y queda siempre vertical.
//   - Pies fijos en el suelo, un poco más abiertos que los hombros y con las puntas afuera;
//     las rodillas salen de la IK hacia el polo, en la línea de los pies.
//   - Solo cambian la altura y la posición de la pelvis, su cabeceo y la cabeza.

const MANO = [0.07, 0.15, 0.22]; // frente al pecho, a la altura de los hombros (marco del tórax)

const arriba = {
  pelvis: { pos: [0, 0.976, -0.02], cabeceo: 3 },
  columna: { flex: 0 },
  cabeza: { flex: -3 },
  // Codos abajo, cerca del cuerpo.
  brazos: { mano: { en: 'torax', pos: MANO }, polo: [-0.1, -1, 0.3], giro: 0 },
  piernas: { pie: [0.2, 0.075, 0], abre: 25, polo: [0.6, 0, 0.8] },
};

const abajo = {
  pelvis: { pos: [0, 0.45, -0.18], cabeceo: 22 },
  columna: { flex: 2 },
  cabeza: { flex: -16 },
  // Codos hacia abajo y adelante, entre las rodillas.
  brazos: { polo: [-0.2, -1, 0.6] },
  piernas: { polo: [0.5, 0, 0.87] },
};

export default {
  id: 'sentadilla-goblet',
  nombre: 'Sentadilla goblet',
  ceja: 'Piernas · kettlebell',
  periodo: 3.6,
  vista: 'tres',
  equipos: [{ tipo: 'kettlebell', mano: 'ambas', cuelga: true }],
  momentos: [0, 0.29, 0.5],
  cuadros: [
    { t: 0, ...arriba },
    { t: 0.1 },
    { t: 0.5, ...abajo },
    { t: 0.56 },
  ],
  trabajan: ['Cuádriceps', 'Glúteos'],
  ayudan: ['Aductores', 'Core', 'Espalda alta'],
  pintar: ['cuadriceps', 'gluteos'],
  pasos: [
    [0, 'Kettlebell frente al pecho tomada por las asas, codos abajo y pies algo más abiertos que los hombros.'],
    [0.1, 'Baja entre las piernas con el pecho arriba y las rodillas hacia las puntas.'],
    [0.46, 'Abajo, los codos apuntan al suelo entre las rodillas y la espalda queda recta.'],
    [0.56, 'Sube empujando el suelo con todo el pie, sin soltar la kettlebell del pecho.'],
  ],
};
