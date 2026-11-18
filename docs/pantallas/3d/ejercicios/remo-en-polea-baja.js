// Remo en polea baja, sentado, con manilla en V (agarre neutro y manos juntas). Tira la manilla
// desde los brazos estirados hasta la parte alta del abdomen, con el tronco firme.
//
// Cómo está hecho:
//   - Polea con la roldana baja, delante de los pies; el cable va casi horizontal a la manilla.
//     La manilla 'simple' en las dos manos juntas se ve como la V.
//   - Asiento, riel del piso y pata de la plataforma son bloques fijos. La plataforma de los pies
//     sigue a los pies (que no se mueven) y queda justo bajo las plantas.
//   - Pies fijos con las rodillas un poco dobladas. El tronco va apenas adelante al estirar
//     (+9°) y vuelve derecho al tirar (-3°): sin balanceo ni tirar con la espalda baja.
//   - Las manos van por el mundo, a la altura del cable. Escápulas abiertas adelante al estirar
//     (prot +) y juntas al final (prot -).

const H = 0.42; // cara de arriba del asiento

const piernas = {
  // Plantas contra la plataforma, punta arriba; rodillas algo dobladas.
  piernas: { pie: [0.14, 0.4, 0.83], talon: -75, polo: [0.25, 1, 0] },
  cabeza: { flex: 0 },
};

const POLO = [0.25, -0.45, -1]; // codos atrás y pegados al cuerpo
// Al inclinarse adelante la pelvis rueda sobre el asiento: baja 1 cm para no despegarse.
const tira = (mano, prot, cabeceo, flex) => ({
  pelvis: { pos: [0, 0.59 - Math.max(0, cabeceo) * 0.0012, 0.02], cabeceo },
  columna: { flex },
  escapulas: { prot },
  brazos: { mano, polo: POLO, giro: 0 },
});

export default {
  id: 'remo-en-polea-baja',
  nombre: 'Remo en polea baja',
  ceja: 'Espalda · polea',
  periodo: 3.2,
  vista: 'lado',
  // De frente la torre y la plataforma tapan la figura: la cámara se corre al lado y arriba.
  vistas: { frente: [0.62, 0.32, 1] },
  equipos: [
    { tipo: 'polea', anclaje: [0, 0.5, 1.22], mano: 'ambas', manilla: 'simple' },
    // Asiento y su pata
    { tipo: 'bloque', pos: [0, H - 0.035, 0.0], tam: [0.36, 0.07, 0.44], color: 'tapiz' },
    { tipo: 'bloque', pos: [0, (H - 0.07) / 2, 0.0], tam: [0.08, H - 0.07, 0.08], color: 'estructura' },
    // Riel del piso, del asiento a la torre, y pata de la plataforma
    { tipo: 'bloque', pos: [0, 0.03, 0.62], tam: [0.1, 0.06, 1.28], color: 'estructura' },
    { tipo: 'bloque', pos: [0, 0.22, 0.97], tam: [0.06, 0.38, 0.06], color: 'estructura' },
    // Plataforma bajo las plantas
    { tipo: 'bloque', sigue: 'pies', pos: [0, -0.02, 0.05], tam: [0.5, 0.04, 0.34], color: 'estructura' },
  ],
  momentos: [0, 0.25, 0.45],
  cuadros: [
    { t: 0, ...piernas, ...tira([0.06, 0.93, 0.75], 0.03, 9, 4) },
    { t: 0.08 },
    { t: 0.26, ...tira([0.06, 0.91, 0.5], 0.005, 4, 0) },
    { t: 0.45, ...tira([0.06, 0.89, 0.225], -0.025, -3, -4) },
    { t: 0.53 },                 // aprieta atrás
    { t: 0.76, ...tira([0.06, 0.91, 0.52], 0.01, 5, 1) },
  ],
  trabajan: ['Dorsal ancho', 'Romboides', 'Trapecio medio'],
  ayudan: ['Bíceps', 'Hombro posterior', 'Lumbares', 'Antebrazos'],
  pintar: ['dorsales', 'trapecio'],
  pasos: [
    [0, 'Sentado, pies en la plataforma con las rodillas un poco dobladas y los brazos estirados.'],
    [0.08, 'Tira la manilla hacia el abdomen llevando los codos atrás, pegados al cuerpo.'],
    [0.43, 'Al final, junta las escápulas con el pecho arriba y el tronco derecho.'],
    [0.53, 'Estira los brazos controlado, dejando que los hombros vayan un poco adelante.'],
  ],
};
