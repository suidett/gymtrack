// Pull over en polea alta (jalón con brazos rectos). De pie frente a la polea, con la cadera un
// poco atrás, baja la barra en arco desde arriba hasta los muslos sin doblar los codos.
//
// Cómo está hecho:
//   - Pies fijos en el suelo y tronco quieto, inclinado unos 25° con la espalda recta.
//   - Las manos van en el marco del tórax sobre un arco alrededor del hombro, a 0,63 m (codos
//     apenas flexionados y fijos). Solo se mueve el hombro: de 145° a 24° respecto del tronco,
//     donde la barra queda justo delante de los muslos.
//   - Polea alta delante, con barra recta; el cable queda casi perpendicular a los brazos en la
//     mitad del recorrido.

const AGARRE = 0.24;
const R = 0.63; // del hombro al puño, con los codos apenas doblados
// Mano en el arco: ang = grados desde el tronco (0 = brazo pegado, 90 = brazo adelante).
const arco = (ang) => {
  const a = (ang * Math.PI) / 180;
  return { mano: { en: 'torax', pos: [AGARRE, 0.15 - R * Math.cos(a), R * Math.sin(a)] }, polo: [0.3, -0.6, -0.8], giro: -90 };
};

const de_pie = {
  pelvis: { pos: [0, 0.95, -0.04], cabeceo: 22 },
  columna: { flex: 3 },
  cabeza: { flex: -14 },
  piernas: { pie: [0.13, 0.075, 0.02], abre: 8, polo: [0.15, 0, 1] },
};

export default {
  id: 'pull-over-en-polea',
  nombre: 'Pull over en polea',
  ceja: 'Espalda · polea',
  periodo: 3,
  vista: 'lado',
  // De frente la torre tapa la figura: la cámara se corre un poco al lado.
  vistas: { frente: [0.45, 0.22, 1] },
  equipos: [{ tipo: 'polea', anclaje: [0, 2.05, 0.95], mano: 'ambas', manilla: 'barra' }],
  momentos: [0, 0.22, 0.45],
  cuadros: [
    { t: 0, ...de_pie, brazos: arco(145), escapulas: { elev: 0.015 } },
    { t: 0.08 },
    { t: 0.26, brazos: arco(85), escapulas: { elev: 0.005 } },
    { t: 0.45, brazos: arco(24), escapulas: { elev: -0.005 } },
    { t: 0.53 },                 // aprieta abajo
    { t: 0.76, brazos: arco(90), escapulas: { elev: 0.008 } },
  ],
  trabajan: ['Dorsal ancho', 'Redondo mayor'],
  ayudan: ['Tríceps (cabeza larga)', 'Hombro posterior', 'Core'],
  pintar: ['dorsales'],
  pasos: [
    [0, 'De pie frente a la polea, cadera un poco atrás, espalda recta y brazos arriba casi estirados.'],
    [0.08, 'Baja la barra en arco con los brazos rectos, llevando la fuerza desde la espalda.'],
    [0.43, 'Abajo, la barra llega a los muslos. Aprieta los dorsales sin mover el tronco.'],
    [0.53, 'Sube controlado por el mismo arco hasta sentir la espalda estirada.'],
  ],
};
