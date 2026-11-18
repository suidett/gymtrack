// Press Arnold, sentado con mancuernas. Misma banca y postura que el press de hombros con
// mancuernas; cambia el inicio y el giro de las manos.
//
// Cómo está hecho:
//   - Inicio: mancuernas frente a la cara a la altura del mentón, palmas hacia la cara (giro 90)
//     y codos al frente, bajo las manos.
//   - Al subir, los codos se abren hacia los lados mientras las manos giran media vuelta: el
//     mango pasa de cruzado a apuntar hacia adelante (palmas enfrentadas) y vuelve a quedar
//     cruzado arriba, ahora con las palmas hacia adelante (giro 180).
//   - Al bajar se hace el camino inverso.

const sentado = {
  pelvis: { pos: [0, 0.62, 0.11], cabeceo: -10 },
  columna: { flex: -6 },
  cabeza: { flex: 8 },
  piernas: { pie: [0.22, 0.075, 0.6], abre: 15, polo: [0.3, 0.3, 1] },
};

const frente = { mano: [0.15, 1.2, 0.21], polo: [0.05, -1, 0.6], giro: 90 };
const lados = { mano: [0.35, 1.44, 0.1], polo: [0.7, -1, 0.3], giro: 150 };
const arriba = { mano: [0.2, 1.68, 0.0], polo: [0.7, -1, 0.25], giro: 180 };

export default {
  id: 'press-arnold',
  nombre: 'Press Arnold',
  ceja: 'Hombros · mancuernas',
  periodo: 3.6,
  vista: 'tres',
  equipos: [
    { tipo: 'banca', inclinada: 80, bisagra: 0, asiento: 0.42, respaldo: 0.85, alto: 0.45 },
    { tipo: 'mancuernas', mano: 'ambas' },
  ],
  momentos: [0, 0.22, 0.42],
  cuadros: [
    { t: 0, ...sentado, brazos: frente },
    { t: 0.06 },
    { t: 0.22, brazos: lados },
    { t: 0.42, brazos: arriba },
    { t: 0.5 },
    { t: 0.7, brazos: lados },
  ],
  trabajan: ['Hombro anterior', 'Hombro lateral', 'Tríceps'],
  ayudan: ['Trapecio', 'Pectoral superior', 'Core'],
  pintar: ['hombros', 'triceps'],
  pasos: [
    [0, 'Sentado con la espalda apoyada, mancuernas frente al mentón y palmas hacia ti.'],
    [0.06, 'Abre los codos hacia los lados mientras giras las manos y empiezas a subir.'],
    [0.38, 'Arriba, brazos casi estirados y palmas hacia adelante.'],
    [0.5, 'Baja controlado haciendo el giro al revés hasta volver frente al mentón.'],
  ],
};
