// Extensión de tríceps en polea alta, con cuerda. De pie frente a la torre, el tronco un poco
// inclinado adelante desde la cadera y los codos pegados al costado. Solo se mueve el codo:
// de unos 100° (manos a la altura del pecho) a casi recto, abriendo la cuerda abajo.
//
// Cómo está hecho:
//   - Pies fijos a ±0.13, rodillas apenas dobladas y el tronco 12° adelante, quieto.
//   - Brazos por ángulos en el marco del tórax: el brazo va 10° adelante respecto del tronco,
//     así queda casi vertical en el mundo, con el codo junto a las costillas. La rotación interna
//     junta las manos arriba; abajo, con el codo estirado, quedan a los lados de los muslos.
//   - La roldana está arriba y adelante (y = 2.0, z = 0.60, lejos del cuerpo): el cable baja hasta la cuerda frente a la
//     cara sin tocarla.

const brazo = (codo, ro) => ({ hombro: [10, 7, ro], codo, giro: 0 });

const dePie = {
  pelvis: { pos: [0, 0.97, 0], cabeceo: 12 },
  columna: { flex: 0 },
  cabeza: { flex: -6 },
  piernas: { pie: [0.13, 0.075, 0.02], abre: 8, polo: [0.1, 0, 1] },
};

export default {
  id: 'extension-triceps-polea',
  nombre: 'Extensión de tríceps en polea',
  ceja: 'Brazos · polea',
  periodo: 3,
  // De lado: la torre queda adelante y no tapa las manos.
  vista: 'lado',
  // De frente la torre queda justo delante del cuerpo: la cámara se corre un poco al lado.
  vistas: { frente: [0.75, 0.2, 1] },
  equipos: [{ tipo: 'polea', anclaje: [0, 2.0, 0.6], mano: 'ambas', manilla: 'cuerda' }],
  momentos: [0, 0.2, 0.4],
  cuadros: [
    { t: 0, ...dePie, brazos: brazo(100, 22) },
    { t: 0.06 },                                 // un instante arriba
    { t: 0.2, brazos: brazo(55, 14) },
    { t: 0.4, brazos: brazo(6, 4) },
    { t: 0.48 },                                 // abajo, aprieta
    { t: 0.72, brazos: brazo(55, 14) },          // sube más lento que baja
  ],
  trabajan: ['Tríceps'],
  ayudan: ['Antebrazos', 'Core'],
  pintar: ['triceps'],
  pasos: [
    [0, 'De pie frente a la polea alta, toma la cuerda con los codos pegados al cuerpo.'],
    [0.06, 'Empuja la cuerda hacia abajo estirando los codos, sin moverlos de su lugar.'],
    [0.38, 'Abajo, estira los brazos por completo y abre un poco la cuerda.'],
    [0.48, 'Sube controlado hasta que las manos lleguen a la altura del pecho.'],
  ],
};
