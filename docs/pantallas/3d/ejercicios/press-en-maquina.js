// Press en máquina (press de pecho sentado). Máquina armada con bloques simples: asiento,
// respaldo inclinado 12°, dos guías horizontales sobre las manos y la pieza que se mueve: dos
// manillas verticales que cuelgan de un carro y corren por las guías hacia adelante.
//
// Cómo está hecho:
//   - Glúteos en el asiento y espalda alta en el respaldo, calculados con esqueleto.js: tocan
//     sin meterse. Pies planos en el suelo y canillas verticales.
//   - Las manos van en el mundo por una línea recta a la altura del pecho (y = 1.02) y la
//     manilla sigue a las manos (bloques con sigue: 'manos'). Atrás el codo queda en la línea
//     del tronco, abierto unos 60°; adelante el brazo queda casi recto.
//   - giro -50 deja las manillas verticales (agarre neutro, palmas enfrentadas).

const X = 0.3; // media distancia entre las manos (m)
const Y = 1.02;
const mano = (z) => ({ mano: [X, Y, z], polo: [0.7, -0.6, -0.4], giro: -50 });

const sentado = {
  pelvis: { pos: [0, 0.656, 0.081], cabeceo: -10 },
  columna: { flex: -2 },
  cabeza: { flex: 0 },
  piernas: { pie: [0.2, 0.075, 0.5], abre: 10, polo: [0.25, 1, 0.8] },
};

// Piezas de la máquina. Fijas: base, asiento, respaldo, guías y parantes. Las guías van sobre
// las manos para que los antebrazos no las crucen cuando los codos se abren.
const fijo = (pos, tam, color = 'estructura', giro) => ({ tipo: 'bloque', pos, tam, color, ...(giro ? { giro } : {}) });
const lados = (f) => [f(1), f(-1)];
const maquina = [
  fijo([0, 0.02, 0.27], [0.12, 0.04, 1.08]),                    // base en el suelo
  fijo([0, 0.02, 0.8], [0.8, 0.04, 0.06]),                       // travesaño delantero
  fijo([0, 0.2, 0.06], [0.07, 0.4, 0.07]),                       // poste del asiento
  fijo([0, 0.44, 0.1], [0.4, 0.08, 0.4], 'tapiz'),               // asiento
  fijo([0, 0.52, -0.235], [0.06, 1, 0.06]),                      // poste del respaldo
  fijo([0, 0.97, -0.15], [0.36, 0.62, 0.08], 'tapiz', [-12, 0, 0]), // respaldo
  ...lados((s) => fijo([s * X, 1.17, 0.5], [0.03, 0.03, 0.6], 'fierro')), // guías sobre las manos
  ...lados((s) => fijo([s * X, 0.595, 0.8], [0.05, 1.19, 0.05])),         // parantes delanteros
  // La pieza que se mueve: la manilla vertical cuelga de un carro que corre por la guía.
  ...lados((s) => ({ tipo: 'bloque', sigue: 'manos', pos: [s * X, 0.04, 0], tam: [0.03, 0.22, 0.03], color: 'fierro' })),
  ...lados((s) => ({ tipo: 'bloque', sigue: 'manos', pos: [s * X, 0.15, 0], tam: [0.07, 0.06, 0.14] })),
];

export default {
  id: 'press-en-maquina',
  nombre: 'Press en máquina',
  ceja: 'Pecho · máquina',
  periodo: 3,
  vista: 'tres',
  equipos: maquina,
  momentos: [0, 0.27, 0.47],
  cuadros: [
    { t: 0, ...sentado, brazos: mano(0.61) },
    { t: 0.08 },
    { t: 0.27, brazos: mano(0.44) },
    { t: 0.47, brazos: mano(0.27) },
    { t: 0.53 },
    { t: 0.72, brazos: mano(0.46) },
  ],
  trabajan: ['Pectoral', 'Tríceps'],
  ayudan: ['Hombro anterior', 'Serrato anterior', 'Antebrazos'],
  pintar: ['pecho', 'triceps'],
  pasos: [
    [0, 'Sentado con la espalda apoyada, pies firmes y los brazos adelante tomando las manillas.'],
    [0.08, 'Deja volver las manillas controladas hasta que las manos queden a los lados del pecho.'],
    [0.45, 'Atrás, los codos llegan a la línea del tronco, sin despegar la espalda del respaldo.'],
    [0.53, 'Empuja hacia adelante hasta casi estirar los brazos, sin trabar los codos.'],
  ],
};
