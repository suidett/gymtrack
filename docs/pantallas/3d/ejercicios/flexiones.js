// Flexiones de brazos (push-ups) en el suelo. Ejemplo de postura boca abajo: el cuerpo es una
// tabla recta que gira sobre las puntas de los pies, con las manos fijas en la colchoneta.
//
// Cómo está hecho:
//   - `plancha(c)` arma la pose completa a partir de un solo número: la inclinación del cuerpo
//     (cabeceo de la pelvis; 90 = paralelo al suelo). Con la punta del pie fija en el mundo,
//     calcula el tobillo, la cadera y la pelvis para que piernas y tronco queden en línea.
//   - El pie es rígido: apoya la esquina de la punta (no la bola) y gira junto con la canilla,
//     así no atraviesa la colchoneta ni resbala.
//   - Los cuadros salen de `plancha` cada pocos grados (no solo arriba y abajo) para que la
//     interpolación siga el arco alrededor de los pies y las piernas no se estiren de más.
//
// Cómo se calcularon los números (con esqueleto.js):
//   - Las manos van abiertas y apoyadas (`muneca: { mira, dedos }`): la palma plana sobre la
//     colchoneta y los dedos hacia adelante, un poco abiertos. El objetivo es la base de la palma
//     y el antebrazo efectivo mide 0.27 m, así que los hombros quedan a 0,59 m del suelo arriba.
//   - Arriba (c = 74.1) los hombros quedan sobre las palmas con los codos casi rectos (12°) y la
//     muñeca extendida 94°.
//   - Abajo (c = 90.7) el pecho queda a 6 cm de la colchoneta. Los hombros avanzan 10 cm al
//     bajar, así las manos terminan junto a la parte baja del pecho, y el codo queda 7 cm sobre
//     el hombro (con el puño de antes eran 18 cm). La muñeca llega a 84°.
//   - El polo de los codos (afuera, arriba y hacia los pies) deja el brazo a unos 48° del tronco
//     visto desde arriba y el antebrazo casi vertical.

const RAD = Math.PI / 180;
const COLCHONETA = 0.012;                     // grosor: manos y pies apoyan sobre ella
const PUNTA = [0.08, COLCHONETA, -1.2];      // donde apoya la punta del pie izquierdo
const MANO = [0.29, COLCHONETA + 0.013, 0.02]; // base de la palma (medio grosor 1,3 cm), bajo el hombro de arriba
// Mano abierta y apoyada: la palma mira al suelo y los dedos van hacia adelante, un poco abiertos.
const PALMA = { mira: [0, -1, 0], dedos: [0.15, 0, 1] };
const PIERNA = 0.858;                         // cadera-tobillo con la rodilla casi recta
// Esquinas de la punta del zapato (centros del redondeo de 0.025) en el marco del pie.
const ESQUINAS = [[0, -0.05, 0.1725], [0, -0.04, 0.1725]];

const ARRIBA = 74.1, ABAJO = 90.7;

function rotX(g, [x, y, z]) {
  const c = Math.cos(g * RAD), s = Math.sin(g * RAD);
  return [x, c * y - s * z, s * y + c * z];
}

// La pose con el cuerpo inclinado c grados (cabeceo de la pelvis).
function plancha(c, extra = {}) {
  const talon = c - 4;                        // el pie va casi perpendicular a la canilla
  const esq = ESQUINAS.map((e) => rotX(talon, e)).sort((a, b) => a[1] - b[1])[0];
  const tobillo = [PUNTA[0], PUNTA[1] - esq[1] + 0.025, PUNTA[2] - esq[2]];
  const eje = [0, Math.cos(c * RAD), Math.sin(c * RAD)]; // de los pies hacia la cabeza
  const cadera = [tobillo[1] + eje[1] * PIERNA, tobillo[2] + eje[2] * PIERNA];
  const pelvis = [0, cadera[0] + eje[1] * 0.05, cadera[1] + eje[2] * 0.05];
  return {
    pelvis: { pos: pelvis, cabeceo: c },
    columna: { flex: 0 },
    cabeza: { flex: -6 },                     // cuello neutro, mirada al suelo un poco adelante
    piernas: { pie: tobillo, talon, polo: [0, -1, 0] },
    brazos: { mano: MANO, polo: [0.7, 0.5, -0.7], muneca: PALMA },
    ...extra,
  };
}

// Va de una inclinación a otra con una curva suave, en n pasos entre t0 y t1.
function tramo(t0, t1, c0, c1, n) {
  const r = [];
  for (let k = 1; k <= n; k++) {
    const u = k / n, s = u * u * (3 - 2 * u);
    r.push({ t: +(t0 + (t1 - t0) * u).toFixed(4), ...plancha(c0 + (c1 - c0) * s) });
  }
  return r;
}

export default {
  id: 'flexiones',
  nombre: 'Flexiones',
  ceja: 'Pecho · peso corporal',
  periodo: 3,
  vista: 'tres',
  equipos: [
    { tipo: 'suelo', colchoneta: { pos: [0, -0.4], tam: [0.8, 1.9] } },
  ],
  momentos: [0, 0.27, 0.48],
  cuadros: [
    { t: 0, ...plancha(ARRIBA) },
    { t: 0.06 },                               // un instante arriba
    ...tramo(0.06, 0.48, ARRIBA, ABAJO, 6),    // baja controlado
    { t: 0.54 },                               // abajo, un instante
    ...tramo(0.54, 0.9, ABAJO, ARRIBA, 6),     // sube y queda arriba hasta que vuelve el ciclo
  ],
  trabajan: ['Pectoral', 'Tríceps'],
  ayudan: ['Hombro anterior', 'Core', 'Serrato'],
  pintar: ['pecho', 'triceps'],
  pintarAyuda: ['hombros', 'core'],
  pasos: [
    [0, 'Manos en el suelo un poco más abiertas que los hombros y cuerpo recto de la cabeza a los talones.'],
    [0.06, 'Baja doblando los codos a unos 45 grados del tronco, con el abdomen y los glúteos firmes.'],
    [0.46, 'Abajo, el pecho queda cerca del suelo.'],
    [0.54, 'Empuja el suelo hasta estirar los brazos, sin que se hunda la cadera.'],
  ],
};
