// Remo en máquina, sentado con el pecho apoyado en el cojín y agarre neutro. Tira las manillas
// desde los brazos estirados hasta los costados del pecho.
//
// Cómo está hecho:
//   - La máquina son bloques: asiento, cojín del pecho con su pata y un riel con una columna
//     adelante. La pieza que se mueve (dos manillas verticales, sus brazos y el travesaño)
//     sigue a las manos ('sigue: manos') y se desliza sobre el riel.
//   - El tronco no se mueve: el pecho queda apoyado en el cojín todo el recorrido. Solo trabajan
//     brazos y escápulas (abiertas adelante al estirar, juntas al tirar).
//   - Pies planos y fijos en el suelo.

const H = 0.47; // cara de arriba del asiento
const AGARRE = 0.22;
const Y = 0.93; // altura de las manillas (parte baja del pecho)

const sentado = {
  pelvis: { pos: [0, 0.64, 0.0], cabeceo: 4 },
  columna: { flex: 0 },
  cabeza: { flex: 0 },
  piernas: { pie: [0.2, 0.075, 0.48], abre: 10, polo: [0.3, 0.2, 1] },
};

const POLO = [0.3, -0.25, -1]; // codos atrás, cerca del cuerpo
const tira = (z, prot) => ({ escapulas: { prot }, brazos: { mano: [AGARRE, Y, z], polo: POLO, giro: 0 } });

export default {
  id: 'remo-en-maquina',
  nombre: 'Remo en máquina',
  ceja: 'Espalda · máquina',
  periodo: 3,
  vista: 'tres',
  equipos: [
    // Asiento y su pata
    { tipo: 'bloque', pos: [0, H - 0.035, -0.02], tam: [0.4, 0.07, 0.38], color: 'tapiz' },
    { tipo: 'bloque', pos: [0, (H - 0.07) / 2, -0.02], tam: [0.08, H - 0.07, 0.08], color: 'estructura' },
    // Cojín del pecho y su pata
    { tipo: 'bloque', pos: [0, 1.0, 0.185], tam: [0.3, 0.3, 0.07], color: 'tapiz' },
    { tipo: 'bloque', pos: [0, 0.81, 0.255], tam: [0.06, 0.06, 0.1], color: 'estructura' },
    { tipo: 'bloque', pos: [0, 0.405, 0.3], tam: [0.06, 0.81, 0.06], color: 'estructura' },
    // Viga del piso, riel bajo las manillas y columna de adelante
    { tipo: 'bloque', pos: [0, 0.025, 0.57], tam: [0.08, 0.05, 1.18], color: 'estructura' },
    { tipo: 'bloque', pos: [0, Y - 0.115, 0.715], tam: [0.05, 0.05, 0.81], color: 'estructura' },
    { tipo: 'bloque', pos: [0, (Y - 0.09) / 2, 1.12], tam: [0.08, Y - 0.09, 0.08], color: 'estructura' },
    // La pieza que se mueve: manillas, brazos y travesaño
    { tipo: 'bloque', sigue: 'manos', pos: [AGARRE, 0, 0], tam: [0.035, 0.16, 0.035], color: 'fierro' },
    { tipo: 'bloque', sigue: 'manos', pos: [-AGARRE, 0, 0], tam: [0.035, 0.16, 0.035], color: 'fierro' },
    { tipo: 'bloque', sigue: 'manos', pos: [AGARRE, -0.07, 0.18], tam: [0.035, 0.035, 0.36], color: 'fierro' },
    { tipo: 'bloque', sigue: 'manos', pos: [-AGARRE, -0.07, 0.18], tam: [0.035, 0.035, 0.36], color: 'fierro' },
    { tipo: 'bloque', sigue: 'manos', pos: [0, -0.07, 0.36], tam: [0.48, 0.04, 0.04], color: 'fierro' },
  ],
  momentos: [0, 0.24, 0.45],
  cuadros: [
    { t: 0, ...sentado, ...tira(0.67, 0.03) },
    { t: 0.08 },
    { t: 0.26, ...tira(0.42, 0.0) },
    { t: 0.45, ...tira(0.16, -0.03) },
    { t: 0.53 },                 // aprieta atrás
    { t: 0.76, ...tira(0.44, 0.01) },
  ],
  trabajan: ['Dorsal ancho', 'Romboides', 'Trapecio medio'],
  ayudan: ['Bíceps', 'Hombro posterior', 'Antebrazos'],
  pintar: ['dorsales', 'trapecio'],
  pasos: [
    [0, 'Sentado, el pecho apoyado en el cojín y las manillas tomadas con los brazos estirados.'],
    [0.08, 'Tira las manillas hacia atrás llevando los codos pegados al cuerpo.'],
    [0.43, 'Al final, junta las escápulas sin despegar el pecho del cojín.'],
    [0.53, 'Estira los brazos controlado hasta sentir la espalda abierta.'],
  ],
};
