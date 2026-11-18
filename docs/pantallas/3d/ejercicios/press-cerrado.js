// Press cerrado con barra (press banca con agarre cerrado), acostado en banca plana. Igual que
// ejercicios/press-de-banca.js, pero con las manos al ancho de los hombros y los codos pegados al
// cuerpo: así trabaja más el tríceps.
//
// Cómo se calcularon los números (con esqueleto.js):
//   - Banca de 0.43 m y cuerpo apoyado como en el press banca.
//   - Puños a ±0.22, apenas por fuera de los hombros (±0.19): así el antebrazo queda vertical
//     abajo. La barra va en el mundo y las manos la siguen.
//   - Abajo la barra toca la parte baja del esternón (z = 0.06, unos 20 cm hacia los pies desde
//     el hombro). El polo de los codos los deja a unos 25° del tronco visto desde arriba: bajan
//     pegados al costado, por debajo del nivel de la espalda. Visto desde los pies el codo queda
//     casi bajo la mano (el antebrazo se inclina menos de 10 grados) en toda la bajada.
//   - Arriba la barra queda sobre los hombros con los codos casi rectos (unos 15°).

const AGARRE = 0.22;
const POLO = [0.15, -0.8, 0.5];
const mano = (y, z) => ({ mano: [AGARRE, y, z], polo: POLO, giro: -90 });

const acostado = {
  pelvis: { pos: [0, 0.58, 0.3], cabeceo: -82 },
  columna: { flex: -18 },
  cabeza: { flex: -4 },
  escapulas: { prot: -0.025 },   // escápulas juntas y abajo
  // Pies planos a ±0.24, rodillas a ±0.27: de frente no se abren como rana.
  piernas: { pie: [0.24, 0.075, 0.6], abre: 8, polo: [0.12, 1, 0.4] },
};

export default {
  id: 'press-cerrado',
  nombre: 'Press cerrado',
  ceja: 'Brazos · barra',
  periodo: 3.2,
  vista: 'tres',
  // De lado justo, el disco cercano tapa el pecho: la cámara se corre un poco hacia la cabeza.
  // De frente, desde los pies y arriba, para que no se vea la entrepierna.
  vistas: { lado: [1, 0.25, -0.55], frente: [0, 0.9, 0.6] },
  equipos: [
    { tipo: 'banca', alto: 0.43, z: -0.05, largo: 1.2, ancho: 0.28 },
    { tipo: 'barra', en: 'manos', discos: [0.12] }, // discos chicos: no tapan pecho ni brazos
  ],
  momentos: [0, 0.27, 0.47],
  cuadros: [
    { t: 0, ...acostado, brazos: mano(1.145, -0.13) },
    { t: 0.08 },
    { t: 0.27, brazos: mano(0.9, 0.0) },
    { t: 0.47, brazos: mano(0.68, 0.06) },
    { t: 0.53 },
    { t: 0.72, brazos: mano(0.93, -0.02) },
  ],
  trabajan: ['Tríceps', 'Pectoral'],
  ayudan: ['Hombro anterior'],
  pintar: ['triceps', 'pecho'],
  pasos: [
    [0, 'Acostado en la banca, toma la barra con las manos al ancho de los hombros, brazos estirados.'],
    [0.08, 'Baja la barra hacia la parte baja del pecho con los codos pegados al cuerpo.'],
    [0.45, 'Abajo, la barra toca el pecho y los codos quedan junto al tronco, sin abrirse.'],
    [0.53, 'Empuja hasta estirar los brazos, con la barra sobre los hombros.'],
  ],
};
