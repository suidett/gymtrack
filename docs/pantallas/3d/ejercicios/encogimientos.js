// Encogimientos con mancuernas. De pie, con una mancuerna en cada mano a los lados del cuerpo.
// Lo único que se mueve son las escápulas: suben los hombros hacia las orejas y bajan.
//
// Cómo está hecho:
//   - Pies fijos en el mundo y tronco quieto: solo cambia escapulas.elev.
//   - Brazos por ángulos (colgando, codos casi rectos), así la mancuerna sube con el hombro
//     sin que el codo se doble: el peso lo levanta el trapecio, no los brazos.
//   - Agarre neutro (giro 0): palmas hacia el cuerpo.

const de_pie = {
  pelvis: { pos: [0, 0.98, 0], cabeceo: 3 },
  columna: { flex: 0 },
  cabeza: { flex: -3 },
  piernas: { pie: [0.13, 0.075, 0.02], abre: 8, polo: [0.15, 0, 1] },
};

const brazos = (elev) => ({
  escapulas: { elev, prot: 0 },
  brazos: { hombro: [2, 9, 0], codo: 6, giro: 0 },
});

export default {
  id: 'encogimientos',
  nombre: 'Encogimientos con mancuernas',
  ceja: 'Espalda · mancuernas',
  periodo: 2.6,
  vista: 'tres',
  // El 3/4 se mira desde atrás para que se vea el trapecio trabajando.
  vistas: { tres: [0.65, 0.3, -0.75] },
  equipos: [{ tipo: 'mancuernas', mano: 'ambas' }],
  momentos: [0, 0.22, 0.45],
  cuadros: [
    { t: 0, ...de_pie, ...brazos(-0.01) },
    { t: 0.1 },
    { t: 0.4, ...brazos(0.065) },
    { t: 0.55 },                 // aguanta arriba
    { t: 0.88, ...brazos(-0.01) },
  ],
  trabajan: ['Trapecio'],
  ayudan: ['Elevador de la escápula', 'Antebrazos'],
  pintar: ['trapecio'],
  pasos: [
    [0, 'De pie, con una mancuerna a cada lado, brazos estirados y palmas hacia el cuerpo.'],
    [0.1, 'Sube los hombros hacia las orejas, en línea recta, sin doblar los codos.'],
    [0.4, 'Arriba, aprieta un segundo. No gires los hombros ni bajes la cabeza.'],
    [0.55, 'Baja lento hasta que los hombros queden estirados abajo.'],
  ],
};
