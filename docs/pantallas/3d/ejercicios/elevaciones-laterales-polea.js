// Elevaciones laterales en polea, a un brazo. De pie con el lado derecho hacia la torre: la
// polea está abajo y el cable cruza por delante del cuerpo hasta la mano izquierda, que es la
// que trabaja. La mano derecha se toma de la torre.
//
// Cómo está hecho:
//   - Pies fijos al ancho de la cadera; el tronco no se mueve.
//   - La mano izquierda va en el mundo: abajo frente a la cadera, un poco cruzada hacia la
//     polea, y arriba al costado, a la altura del hombro y algo adelante (plano de la escápula),
//     con el codo apenas doblado.
//   - La torre se ubica sola detrás de la roldana (anclaje) y la mano derecha queda fija en ella.

const dePie = {
  pelvis: { pos: [0, 0.978, 0], cabeceo: 2 },
  columna: { flex: 0 },
  cabeza: { flex: 0 },
  piernas: { pie: [0.12, 0.075, 0], abre: 8, polo: [0.15, 0, 1] },
  brazoDer: { mano: [-0.6, 1.05, 0.16], polo: [-0.3, -1, -0.6], giro: 0 },
};

const abajo = { mano: [0.04, 0.84, 0.2], polo: [1, 0, -0.5], giro: 0 };
const medio = { mano: [0.516, 0.964, 0.297], polo: [0.5, 0.1, -1], giro: 0 };
const arriba = { mano: [0.78, 1.38, 0.22], polo: [0, 0.3, -1], giro: 0 };

export default {
  id: 'elevaciones-laterales-polea',
  nombre: 'Elevaciones laterales en polea',
  ceja: 'Hombros · polea',
  periodo: 3,
  vista: 'frente',
  equipos: [{ tipo: 'polea', anclaje: [-0.6, 0.12, 0.18], mano: 'izq', manilla: 'simple' }],
  momentos: [0, 0.22, 0.4],
  cuadros: [
    { t: 0, ...dePie, brazoIzq: abajo },
    { t: 0.06 },
    { t: 0.22, brazoIzq: medio },
    { t: 0.4, brazoIzq: arriba },
    { t: 0.46 },
    { t: 0.72, brazoIzq: medio },
  ],
  trabajan: ['Hombro lateral'],
  ayudan: ['Hombro anterior', 'Trapecio', 'Core'],
  pintar: ['hombros'],
  pasos: [
    [0, 'De costado a la polea baja, toma la manilla con la mano más lejana frente a la cadera.'],
    [0.06, 'Sube el brazo hacia el costado con el codo apenas doblado, sin inclinar el cuerpo.'],
    [0.38, 'Arriba, la mano queda a la altura del hombro y un poco adelante.'],
    [0.46, 'Baja lento resistiendo el cable hasta volver frente a la cadera.'],
  ],
};
