// Remo invertido en barra fija baja. Colgado bajo la barra, boca arriba, con el cuerpo recto
// como una tabla y los talones en el suelo: tira el pecho hasta la barra.
//
// Cómo está hecho:
//   - La barra es el equipo 'dominadas' a 1 m de alto. Las manos quedan fijas en la barra
//     (agarre prono, un poco más ancho que los hombros) y los talones fijos en el suelo.
//   - El cuerpo gira como una tabla alrededor de los talones: `cuerpo(angulo)` calcula la pelvis
//     para que las piernas queden rectas hasta el tobillo fijo. Columna y cabeza en línea.
//   - Ángulos buscados con esqueleto.js: abajo (18°) los brazos quedan estirados; arriba (40°)
//     el esternón toca la barra por debajo, sin que el pecho la pase.

const BARRA = 1.0;
const TALON = [0.09, 0.088, 0.88]; // tobillo, con el talón apoyado

// Cuerpo recto a `a` grados del suelo, girando sobre los talones.
function cuerpo(a) {
  const c = a - 90, r = (c * Math.PI) / 180;
  return {
    pelvis: { pos: [0, TALON[1] + 0.908 * Math.cos(r), TALON[2] + 0.908 * Math.sin(r)], cabeceo: c },
    columna: { flex: 0 },
    cabeza: { flex: -4 },
    piernas: { pie: TALON, talon: c, polo: [0, 1, 0] },
  };
}

const manos = {
  // Codos hacia los pies y afuera, a unos 45° del cuerpo.
  brazos: { mano: [0.3, BARRA, 0], polo: [0.6, -1, 0.5], giro: -90 },
};

export default {
  id: 'remo-invertido',
  nombre: 'Remo invertido',
  ceja: 'Espalda · peso corporal',
  periodo: 3,
  vista: 'lado',
  // De lado justo, el parante tapa los brazos: la cámara se corre un poco hacia los pies.
  vistas: { lado: [1, 0.22, 0.4] },
  equipos: [{ tipo: 'dominadas', alto: BARRA, z: 0, ancho: 1.5 }],
  momentos: [0, 0.22, 0.45],
  cuadros: [
    { t: 0, ...cuerpo(18), ...manos, escapulas: { prot: 0.02 } },
    { t: 0.08 },
    { t: 0.24, ...cuerpo(30), escapulas: { prot: 0 } },
    { t: 0.45, ...cuerpo(40), escapulas: { prot: -0.025 } },
    { t: 0.53 },                 // aprieta arriba
    { t: 0.76, ...cuerpo(29), escapulas: { prot: 0.005 } },
  ],
  trabajan: ['Dorsal ancho', 'Romboides', 'Trapecio medio'],
  ayudan: ['Bíceps', 'Hombro posterior', 'Core', 'Glúteos'],
  pintar: ['dorsales', 'trapecio'],
  pasos: [
    [0, 'Colgado bajo la barra, brazos estirados, talones en el suelo y el cuerpo recto.'],
    [0.08, 'Tira el pecho hacia la barra llevando los codos atrás, sin doblar la cadera.'],
    [0.43, 'Arriba, el pecho toca la barra y las escápulas se juntan.'],
    [0.53, 'Baja controlado hasta estirar los brazos, con el cuerpo siempre recto.'],
  ],
};
