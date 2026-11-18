// Peso muerto sumo con barra. Pies bien abiertos con las puntas hacia afuera y las manos
// por dentro de las rodillas, al ancho de los hombros. El tronco va más derecho que en el
// convencional y las rodillas empujan hacia afuera, sobre las puntas de los pies.
//
// Cómo está hecho (igual que peso-muerto.js):
//   - La barra va en el mundo y sube en línea recta sobre la mitad del pie; las manos la
//     siguen. La altura de la pelvis de cada cuadro se calculó con esqueleto.js para que los
//     brazos queden estirados justo hasta la barra.
//   - `alinear` ubica el hombro respecto de la barra. Arriba queda un poco detrás para que
//     la barra pase por delante de los muslos sin atravesarlos.
//   - Pies fijos; las rodillas salen de la IK hacia el polo, en la línea de las puntas.

const BZ = 0.1;      // la barra queda sobre la mitad del pie
const AGARRE = 0.17; // media distancia entre las manos (por dentro de las rodillas)
const HOMBRO = [0.19, 0.15, 0];

// Un cuadro: altura de la barra, altura de la pelvis, cabeceo del tronco, flexión de la
// columna, hombro delante (+) o detrás (-) de la barra y cabeza.
const c = (t, barra, pelvis, cabeceo, flex, adelante, cabeza) => ({
  t,
  pelvis: { pos: [0, pelvis, 0], cabeceo },
  columna: { flex },
  cabeza: { flex: cabeza },
  alinear: { en: 'torax', pos: HOMBRO, z: BZ + adelante },
  brazos: { mano: [AGARRE, barra, BZ], polo: [0, 0, -1], giro: -90 },
});

export default {
  id: 'peso-muerto-sumo',
  nombre: 'Peso muerto sumo',
  ceja: 'Piernas · barra',
  periodo: 4.2,
  vista: 'tres',
  equipos: [{ tipo: 'barra', en: 'manos', discos: [0.225, 0.225] }],
  momentos: [0, 0.2, 0.5],
  cuadros: [
    // Abajo: pies a casi el doble del ancho de los hombros, puntas 40° afuera, rodillas
    // sobre las puntas, canillas casi verticales y pecho arriba.
    { ...c(0, 0.225, 0.539, 44, 0, 0.03, -10), piernas: { pie: [0.36, 0.075, 0], abre: 40, polo: [1, 0, 1] } },
    { t: 0.06 },
    c(0.13, 0.36, 0.679, 45, 0, 0.025, -10),
    c(0.2, 0.5, 0.82, 45, 0, 0.02, -9),
    c(0.26, 0.6, 0.848, 30, 0, 0, -6),
    c(0.33, 0.7, 0.893, 12, -1, -0.07, -3),
    c(0.4, 0.772, 0.938, -2, -2, -0.17, 0), // arriba: cadera y rodillas estiradas
    { t: 0.48 },
    c(0.53, 0.68, 0.886, 18, -1, -0.05, -4),
    c(0.6, 0.56, 0.844, 38, 0, 0.01, -8),
    c(0.66, 0.45, 0.77, 45, 0, 0.02, -9),
    c(0.75, 0.33, 0.649, 45, 0, 0.025, -10),
    c(0.84, 0.225, 0.539, 44, 0, 0.03, -10),
  ],
  trabajan: ['Glúteos', 'Cuádriceps', 'Aductores'],
  ayudan: ['Isquiotibiales', 'Espalda baja', 'Trapecio', 'Antebrazos'],
  pintar: ['gluteos', 'cuadriceps'],
  pasos: [
    [0, 'Pies bien abiertos con las puntas afuera, manos por dentro de las rodillas y pecho arriba.'],
    [0.06, 'Empuja el suelo abriendo las rodillas: la barra sube pegada a las piernas.'],
    [0.24, 'Junta la cadera con la barra hasta quedar derecho, sin echarte atrás.'],
    [0.48, 'Baja controlado: cadera atrás y rodillas afuera hasta dejar la barra en el suelo.'],
  ],
};
