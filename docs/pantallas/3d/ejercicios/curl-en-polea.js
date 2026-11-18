// Curl de bíceps en polea baja, de pie y de frente a la torre, con una barra recta. El brazo
// hace lo mismo que en el curl con barra (codos fijos al costado, solo se dobla el codo); la
// diferencia es que el cable tira desde abajo y adelante, así que la tensión no se pierde arriba.
//
// Cómo está hecho:
//   - Pies fijos a ±0.12 a medio metro de la polea; el tronco no se mueve.
//   - La roldana está casi en el suelo (y = 0.1) frente a los pies. La torre se ubica sola
//     detrás de ella y el cable llega al centro de la barra.
//   - Brazos por ángulos, agarre supino al ancho de los hombros. Abajo la barra queda frente a
//     los muslos; arriba, frente a la parte alta del pecho.

const brazo = (fl, codo) => ({ hombro: [fl, 5, 0], codo, giro: 90 });

const quieto = {
  pelvis: { pos: [0, 0.983, 0] },
  cabeza: { flex: 4 },
  piernas: { pie: [0.12, 0.075, 0], abre: 8 },
};

export default {
  id: 'curl-en-polea',
  nombre: 'Curl en polea',
  ceja: 'Brazos · polea',
  periodo: 3.2,
  vista: 'tres',
  // De frente la torre queda justo delante del cuerpo: la cámara se corre un poco al lado.
  vistas: { frente: [0.75, 0.2, 1] },
  equipos: [{ tipo: 'polea', anclaje: [0, 0.1, 0.55], mano: 'ambas', manilla: 'barra' }],
  momentos: [0, 0.2, 0.4],
  cuadros: [
    { t: 0, ...quieto, brazos: brazo(5, 10) },
    { t: 0.06 },                                  // un instante abajo
    { t: 0.2, brazos: brazo(7, 85) },
    { t: 0.4, brazos: brazo(10, 135) },
    { t: 0.48 },                                  // arriba, aprieta
    { t: 0.72, brazos: brazo(7, 85) },            // baja más lento que sube
    { t: 0.94, brazos: brazo(5, 12) },
  ],
  trabajan: ['Bíceps'],
  ayudan: ['Braquial', 'Antebrazos'],
  pintar: ['biceps'],
  pasos: [
    [0, 'De pie frente a la polea baja, toma la barra con las palmas hacia adelante.'],
    [0.06, 'Sube la barra doblando los codos, sin despegarlos del cuerpo ni echarte atrás.'],
    [0.4, 'Arriba, la barra queda frente al pecho. Aprieta el bíceps un instante.'],
    [0.48, 'Baja lento resistiendo el cable hasta estirar los brazos.'],
  ],
};
