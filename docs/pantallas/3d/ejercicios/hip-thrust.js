// Hip thrust con barra. La espalda alta apoyada en el borde de una banca puesta de lado, la barra
// sobre la cadera y los pies fijos; la cadera sube hasta que el tronco y los muslos quedan en
// línea, paralelos al suelo, y baja sin que la espalda se mueva del borde.
//
// Cómo se calcularon los números (con esqueleto.js):
//   - El tronco gira alrededor del borde de la banca (z = -0.30, alto 0.40). Para cada cabeceo
//     de la pelvis se buscó su posición para que el punto [0, 0.02, -0.112] del tórax (la espalda
//     bajo las escápulas) quede justo en ese borde. Son las cinco FASES, de abajo hacia arriba;
//     con cinco cuadros la interpolación sigue el arco y la espalda no resbala.
//   - Arriba la pelvis queda horizontal (cabeceo -90) y los pies están puestos para que las
//     canillas queden verticales y las rodillas a 90 grados.
//   - La barra va en el marco de la pelvis, en el pliegue de la cadera, por encima de donde
//     se doblan los muslos; las manos la sujetan a los lados.

const FASES = [
  { pelvis: { pos: [0, 0.269, 0.013], cabeceo: -48 }, columna: { flex: 0 } },
  { pelvis: { pos: [0, 0.322, 0.03], cabeceo: -58 }, columna: { flex: 0.75 } },
  { pelvis: { pos: [0, 0.384, 0.04], cabeceo: -69 }, columna: { flex: 1.5 } },
  { pelvis: { pos: [0, 0.446, 0.037], cabeceo: -80 }, columna: { flex: 2.25 } },
  { pelvis: { pos: [0, 0.501, 0.026], cabeceo: -90 }, columna: { flex: 3 } },
];
// Cuadros de un tramo, suaves al partir y al llegar (sin repetir el primero).
const suave = (u) => (1 - Math.cos(Math.PI * u)) / 2;
const tramo = (t0, t1, orden) => orden.slice(1).map((k, i) => ({
  t: t0 + (t1 - t0) * suave((i + 1) / (orden.length - 1)), ...FASES[k],
}));

const BARRA = [0, 0.05, 0.125]; // en el marco de la pelvis

const abajo = {
  ...FASES[0],
  cabeza: { flex: 22 },            // mentón recogido, la mirada hacia las rodillas
  brazos: { mano: { en: 'pelvis', pos: [0.3, BARRA[1], BARRA[2]] }, polo: [0.9, 0.3, -0.6], giro: 0 },
  // Pies al ancho de la cadera, un poco abiertos; las rodillas hacia las puntas.
  piernas: { pie: [0.16, 0.075, 0.5], abre: 12, polo: [0.12, 1, 0.2] },
};

export default {
  id: 'hip-thrust',
  nombre: 'Hip thrust',
  ceja: 'Piernas · barra',
  periodo: 3.2,
  vista: 'lado',
  vistas: { lado: [1, 0.3, 0.35] },   // de lado, un poco desde arriba y desde los pies: el disco no tapa la cadera
  equipos: [
    // Banca de lado: el cojín a lo ancho (en X) y dos patas.
    { tipo: 'bloque', pos: [0, 0.36, -0.46], tam: [1.2, 0.08, 0.32], color: 'tapiz' },
    { tipo: 'bloque', pos: [0.5, 0.16, -0.46], tam: [0.05, 0.32, 0.26], color: 'estructura' },
    { tipo: 'bloque', pos: [-0.5, 0.16, -0.46], tam: [0.05, 0.32, 0.26], color: 'estructura' },
    // Discos chicos para que no tapen la cadera en la vista de lado.
    { tipo: 'barra', en: 'pelvis', pos: BARRA, discos: [0.16] },
  ],
  momentos: [0, 0.2, 0.4],
  cuadros: [
    { t: 0, ...abajo },
    { t: 0.06 },
    ...tramo(0.06, 0.36, [0, 1, 2, 3, 4]),
    { t: 0.48 },                              // arriba, apretando
    ...tramo(0.48, 1, [4, 3, 2, 1, 0]),       // el último (t = 1) se descarta
  ],
  trabajan: ['Glúteos'],
  ayudan: ['Isquiotibiales', 'Cuádriceps', 'Core'],
  pintar: ['gluteos'],
  pasos: [
    [0, 'Espalda alta en el borde de la banca, barra sobre la cadera y pies firmes al ancho de la cadera.'],
    [0.06, 'Empuja con los talones y sube la cadera, con el mentón recogido y las costillas abajo.'],
    [0.34, 'Arriba, tronco y muslos quedan en línea y paralelos al suelo: aprieta los glúteos.'],
    [0.48, 'Baja la cadera controlada, sin mover la espalda del borde.'],
  ],
};
