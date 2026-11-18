// Step up al cajón con mancuernas. Un pie completo arriba del cajón y el otro en el suelo.
// Se sube empujando con la pierna de arriba hasta quedar de pie sobre el cajón y se baja
// controlado, con el mismo pie de abajo. El pie de arriba no se mueve en toda la serie.
//
// Cómo está hecho:
//   - El pie izquierdo es un objetivo fijo sobre el cajón. El derecho parte plano en el suelo,
//     despega girando sobre los dedos (`dedos`), pasa por sobre el borde del cajón, apoya al
//     lado del izquierdo y vuelve al suelo por el mismo camino.
//   - La pelvis sube y avanza hasta quedar sobre el pie de arriba; el tronco va algo inclinado
//     al empezar y derecho arriba. Los brazos cuelgan con una mancuerna en cada mano.

const RAD = Math.PI / 180;
const ALTO = 0.45;                         // alto del cajón
const ARRIBA = [0.1, ALTO + 0.075, 0.3];   // tobillo del pie que queda sobre el cajón
const SUELO = [-0.1, 0.075, -0.2];         // tobillo del pie de abajo

// Pie derecho apoyado en el borde de los dedos (punto [0, -0.075, 0.18] de la planta), con
// ese borde fijo donde estaba al estar plano en SUELO.
const dedos = (talon) => {
  const c = Math.cos(talon * RAD), s = Math.sin(talon * RAD);
  return { pie: [SUELO[0], 0.075 * c + 0.18 * s, SUELO[2] + 0.18 - (-0.075 * s + 0.18 * c)], talon, polo: [0, -0.2, 1] };
};
const der = (pie, talon) => ({ pie, talon, polo: [0, -0.2, 1] });
const brazos = (cabeceo) => ({ hombro: [cabeceo, 6, 0], codo: 4, giro: 0 });
const cuerpo = (y, z, cabeceo, cabeza = -4) => ({
  pelvis: { pos: [0, y, z], cabeceo }, cabeza: { flex: cabeza }, brazos: brazos(cabeceo),
});

const inicio = {
  ...cuerpo(0.92, -0.06, 15, -8),
  columna: { flex: 0 },
  piernaIzq: { pie: ARRIBA, abre: 5, polo: [0.05, 0, 1] },
  piernaDer: der(SUELO, 0),
};

export default {
  id: 'step-up',
  nombre: 'Step up al cajón',
  ceja: 'Piernas · mancuernas y cajón',
  periodo: 4.4,
  vista: 'lado',
  equipos: [
    { tipo: 'cajon', pos: [0, 0.33], alto: ALTO, ancho: 0.6, fondo: 0.45 },
    { tipo: 'mancuernas', mano: 'ambas' },
  ],
  momentos: [0, 0.29, 0.16],
  cuadros: [
    { t: 0, ...inicio },
    { t: 0.08 },
    // Sube: el peso pasa a la pierna de arriba y el pie de abajo despega.
    { t: 0.16, ...cuerpo(0.98, 0, 18, -8), piernaDer: dedos(30) },
    { t: 0.24, ...cuerpo(1.1, 0.1, 16, -6), piernaDer: der([-0.1, 0.3, -0.1], 30) },
    // El pie de abajo sube primero y después avanza, para pasar por sobre el borde.
    { t: 0.29, ...cuerpo(1.2, 0.16, 12, -5), piernaDer: der([-0.1, 0.58, -0.06], 32) },
    { t: 0.35, ...cuerpo(1.32, 0.23, 7, -4), piernaDer: der([-0.1, 0.61, 0.2], 5) },
    // Arriba: de pie sobre el cajón, cadera y rodillas estiradas.
    { t: 0.42, ...cuerpo(1.43, 0.27, 2, -2), piernaDer: der([-0.1, ALTO + 0.075, 0.3], 0) },
    { t: 0.5 },
    // Baja con el mismo pie, controlado: la pierna de arriba se dobla.
    { t: 0.58, ...cuerpo(1.36, 0.22, 6, -4), piernaDer: der([-0.1, 0.62, 0.15], 10) },
    { t: 0.63, ...cuerpo(1.25, 0.17, 9, -5), piernaDer: der([-0.1, 0.58, -0.07], 15) },
    { t: 0.69, ...cuerpo(1.1, 0.07, 12, -6), piernaDer: der([-0.1, 0.3, -0.15], 25) },
    { t: 0.76, ...cuerpo(0.97, -0.03, 14, -8), piernaDer: der([-0.1, 0.13, -0.2], 5) },
    { t: 0.84, ...inicio },
    // queda abajo hasta t = 1
  ],
  trabajan: ['Cuádriceps', 'Glúteos'],
  ayudan: ['Isquiotibiales', 'Gemelos', 'Core'],
  pintar: ['cuadriceps', 'gluteos'],
  pasos: [
    [0, 'Pie izquierdo completo sobre el cajón y el derecho en el suelo, mancuernas a los costados.'],
    [0.08, 'Empuja con el pie de arriba y sube sin impulsarte con el de abajo.'],
    [0.38, 'Arriba, quedas derecho con los dos pies sobre el cajón.'],
    [0.52, 'Baja controlado con el mismo pie que subiste; el de arriba no se mueve.'],
  ],
};
