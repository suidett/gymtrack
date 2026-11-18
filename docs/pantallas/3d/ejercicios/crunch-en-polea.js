// Crunch en polea. De rodillas frente a la polea alta, con la cuerda tomada a los lados de la
// cabeza. El movimiento es de la columna: se enrolla el tronco llevando los codos hacia los
// muslos y se vuelve. La cadera casi no se mueve y las manos no se separan de la cabeza.
//
// Cómo está hecho:
//   - Rodillas fijas en el suelo (z = 0) con los muslos verticales: la articulación de la cadera
//     queda fija en [±0.09, 0.485, 0] y la pelvis se calcula para cada cabeceo con
//     pos = [0, 0.485 + 0.05·cos(c), 0.05·sin(c)]. Así las rodillas no se deslizan.
//   - Empeines en el suelo detrás, con el pie estirado hacia atrás (talon 145) y la canilla
//     apenas inclinada.
//   - Las manos van en el marco del tórax, a los lados de la cara, y siguen al tronco solas.
//   - De 18 a 30 grados de cabeceo de pelvis y de -4 a 62 de flexión de columna: casi todo el
//     recorrido es abdomen.

const CADERA_Y = 0.485;
const pelvis = (c) => ({ pos: [0, +(CADERA_Y + 0.05 * Math.cos(c * Math.PI / 180)).toFixed(4), +(0.05 * Math.sin(c * Math.PI / 180)).toFixed(4)], cabeceo: c });

const arriba = {
  pelvis: pelvis(18),
  columna: { flex: -4 },
  cabeza: { flex: 0 },
  brazos: { mano: { en: 'torax', pos: [0.11, 0.34, 0.15] }, polo: [0.3, -0.4, 1], giro: 0 },
  piernas: { pie: [0.09, 0.1, -0.4276], talon: 145, polo: [0, -1, 0] },
};

const abajo = {
  pelvis: pelvis(30),
  columna: { flex: 62 },
  cabeza: { flex: 14 },
};

export default {
  id: 'crunch-en-polea',
  nombre: 'Crunch en polea',
  ceja: 'Core · polea',
  periodo: 3.6,
  vista: 'lado',
  // De frente la torre queda justo delante del cuerpo: la cámara se corre un poco al lado.
  vistas: { frente: [0.5, 0.18, 1] },
  equipos: [
    { tipo: 'suelo', colchoneta: { pos: [0, -0.15], tam: [0.6, 0.7] } },
    { tipo: 'polea', anclaje: [0, 2.0, 0.9], mano: 'ambas', manilla: 'cuerda' },
  ],
  momentos: [0, 0.25, 0.45],
  cuadros: [
    { t: 0, ...arriba },
    { t: 0.08 },
    { t: 0.42, ...abajo },
    { t: 0.5 },                 // aprieta abajo
    { t: 0.86, ...arriba },
    // pausa arriba hasta t = 1
  ],
  trabajan: ['Abdomen'],
  ayudan: ['Oblicuos'],
  pintar: ['abdomen'],
  pasos: [
    [0, 'De rodillas frente a la polea alta, con la cuerda tomada a los lados de la cabeza.'],
    [0.08, 'Enrolla el tronco hacia abajo y lleva los codos hacia los muslos. La cadera casi no se mueve.'],
    [0.42, 'Abajo, aprieta el abdomen un instante.'],
    [0.5, 'Sube controlado hasta estirar el tronco, con las manos siempre junto a la cabeza.'],
  ],
};
