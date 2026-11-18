// Elevaciones frontales con mancuernas, de pie y con los dos brazos a la vez.
//
// Cómo está hecho:
//   - De pie con los pies fijos al ancho de la cadera y las rodillas apenas sueltas. El tronco
//     no se mueve: solo suben los brazos (sin balanceo).
//   - Las manos van en el mundo: abajo frente a los muslos y arriba a la altura de los hombros,
//     con los codos apenas doblados. El mango va cruzado (palmas hacia abajo arriba).

const dePie = {
  pelvis: { pos: [0, 0.978, 0], cabeceo: 2 },
  columna: { flex: 0 },
  cabeza: { flex: 0 },
  piernas: { pie: [0.12, 0.075, 0], abre: 8, polo: [0.15, 0, 1] },
};

const GIRO = 0; // con los codos hacia afuera, el mango queda cruzado
const abajo = { mano: [0.15, 0.81, 0.17], polo: [1, 0, -0.25], giro: GIRO };
const medio = { mano: [0.165, 1.075, 0.548], polo: [1, -0.1, -0.15], giro: GIRO };
const arriba = { mano: [0.17, 1.43, 0.652], polo: [1, -0.1, 0], giro: GIRO };

export default {
  id: 'elevaciones-frontales',
  nombre: 'Elevaciones frontales',
  ceja: 'Hombros · mancuernas',
  periodo: 3,
  vista: 'lado',
  equipos: [{ tipo: 'mancuernas', mano: 'ambas' }],
  momentos: [0, 0.22, 0.4],
  cuadros: [
    { t: 0, ...dePie, brazos: abajo },
    { t: 0.06 },
    { t: 0.22, brazos: medio },
    { t: 0.4, brazos: arriba },
    { t: 0.47 },
    { t: 0.72, brazos: medio },
  ],
  trabajan: ['Hombro anterior'],
  ayudan: ['Hombro lateral', 'Pectoral superior', 'Trapecio', 'Core'],
  pintar: ['hombros'],
  pasos: [
    [0, 'De pie, mancuernas frente a los muslos y codos apenas doblados.'],
    [0.06, 'Sube los brazos al frente sin balancear el cuerpo.'],
    [0.38, 'Arriba, las manos quedan a la altura de los hombros.'],
    [0.47, 'Baja lento y controlado hasta volver frente a los muslos.'],
  ],
};
