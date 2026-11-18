// Sentadilla con peso corporal. Como sentadilla-trasera.js, pero sin barra y con los brazos
// estirados al frente a la altura de los hombros, que ayudan a mantener el equilibrio.
//
// Cómo está hecho:
//   - Los pies son objetivos fijos en el mundo: no resbalan.
//   - `alinear` corre la pelvis en z para que el centro del pecho quede sobre la mitad del pie
//     (con los brazos al frente, así el peso del cuerpo cae sobre el pie al bajar y al subir).
//   - Los brazos van por ángulos: la flexión del hombro es 90 más lo que se inclina el tórax,
//     así quedan paralelos al suelo en todo el recorrido.

const arriba = {
  pelvis: { pos: [0, 0.98, 0], cabeceo: 3 },
  columna: { flex: 0 },
  cabeza: { flex: -3 },
  alinear: { en: 'torax', pos: [0, 0.1, 0], z: 0.035 },
  brazos: { hombro: [93, 6, 0], codo: 0, giro: -90 },
  // Pies al ancho de los hombros, puntas 20° afuera; las rodillas apuntan hacia las puntas.
  piernas: { pie: [0.17, 0.075, 0], abre: 20, polo: [0.55, 0, 0.84] },
};

const abajo = {
  pelvis: { pos: [0, 0.44, 0], cabeceo: 32 },
  columna: { flex: 6 },
  cabeza: { flex: -26 },
  brazos: { hombro: [128, 6, 0] },   // 90 + 38 de inclinación del tórax
  piernas: { polo: [0.4, 0, 0.92] },
};

export default {
  id: 'sentadilla-peso-corporal',
  nombre: 'Sentadilla con peso corporal',
  ceja: 'Piernas · peso corporal',
  periodo: 3.2,
  vista: 'tres',
  equipos: [],
  momentos: [0, 0.29, 0.5],
  cuadros: [
    { t: 0, ...arriba },
    { t: 0.1 },
    { t: 0.5, ...abajo },
    { t: 0.56 },
  ],
  trabajan: ['Cuádriceps', 'Glúteos'],
  ayudan: ['Aductores', 'Core'],
  pintar: ['cuadriceps', 'gluteos'],
  pasos: [
    [0, 'De pie, con los pies al ancho de los hombros, las puntas un poco afuera y los brazos estirados al frente.'],
    [0.1, 'Baja llevando la cadera atrás y abajo, con las rodillas en la línea de los pies.'],
    [0.46, 'Abajo, los muslos quedan paralelos al suelo o un poco más, con los talones apoyados.'],
    [0.56, 'Sube empujando el suelo con todo el pie hasta quedar derecho.'],
  ],
};
