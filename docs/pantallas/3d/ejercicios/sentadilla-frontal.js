// Sentadilla frontal con barra. De pie, la barra apoyada adelante sobre los hombros, frente
// al cuello, con los codos altos apuntando hacia adelante. El tronco va más derecho que en
// la sentadilla trasera y las rodillas avanzan más.
//
// Cómo está hecho:
//   - La barra va en el marco 'torax' (sobre la parte de adelante de los hombros) y se mueve
//     con el tronco. `alinear` corre la pelvis para que la barra quede sobre la mitad del pie.
//   - Los brazos van por ángulos (codos altos y muy doblados), así siguen al tronco. Con la
//     muñeca recta del maniquí el puño queda un poco por sobre la barra; en la realidad la
//     muñeca se dobla hacia atrás y los dedos sostienen la barra.
//   - Pies fijos en el suelo; las rodillas salen de la IK hacia el polo, en la línea de los
//     pies. Solo cambian la altura de la pelvis, su cabeceo, la columna y la cabeza.

const BARRA = [0, 0.185, 0.125]; // sobre los hombros, frente al cuello (marco del tórax)

const arriba = {
  pelvis: { pos: [0, 0.976, 0], cabeceo: 4 },
  columna: { flex: 0 },
  cabeza: { flex: -4 },
  alinear: { en: 'torax', pos: BARRA, z: 0.085 },
  // Codos adelante, casi a la altura de los hombros.
  brazos: { hombro: [80, 12, 0], codo: 152, giro: 90 },
  // Pies al ancho de los hombros, puntas 20° afuera; las rodillas apuntan a las puntas.
  piernas: { pie: [0.17, 0.075, 0], abre: 20, polo: [0.5, 0, 0.87] },
};

const abajo = {
  pelvis: { pos: [0, 0.45, 0], cabeceo: 22 },
  columna: { flex: 2 },
  cabeza: { flex: -14 },
  piernas: { polo: [0.4, 0, 0.92] },
};

export default {
  id: 'sentadilla-frontal',
  nombre: 'Sentadilla frontal',
  ceja: 'Piernas · barra',
  periodo: 3.6,
  vista: 'tres',
  equipos: [{ tipo: 'barra', en: 'torax', pos: BARRA, discos: [0.225, 0.16] }],
  momentos: [0, 0.29, 0.5],
  cuadros: [
    { t: 0, ...arriba },
    { t: 0.1 },                 // pausa arriba
    { t: 0.5, ...abajo },
    { t: 0.56 },                // un instante abajo
  ],
  trabajan: ['Cuádriceps', 'Glúteos'],
  ayudan: ['Aductores', 'Espalda alta', 'Core'],
  pintar: ['cuadriceps', 'gluteos'],
  pasos: [
    [0, 'Barra adelante sobre los hombros, codos altos apuntando al frente.'],
    [0.1, 'Baja con el tronco derecho y las rodillas hacia adelante, en la línea de los pies.'],
    [0.46, 'Abajo, la cadera queda bajo las rodillas y los codos siguen arriba.'],
    [0.56, 'Sube empujando el suelo con todo el pie, sin dejar caer los codos.'],
  ],
};
