// Pec deck (contractor de pecho con cojines para los antebrazos). Sentado derecho con la espalda
// en el respaldo; brazos a la altura de los hombros, codos en 90° y antebrazos verticales
// contra los cojines. Los codos se juntan al frente en arco y vuelven.
//
// Cómo está hecho:
//   - Asiento y respaldo calculados con esqueleto.js: glúteos y espalda alta tocan sin meterse.
//   - Las manos van en el marco 'torax'. El codo gira alrededor de la vertical del hombro, a
//     0.31 m de él (un poco bajo el hombro), y la mano queda 0.33 m sobre el codo. Varios cuadros
//     a lo largo del arco para que el codo no corte camino.
//   - La pieza que se mueve sigue al antebrazo (sigue: 'antebrazoIzq' / 'antebrazoDer'): cojín,
//     barra vertical y brazo de la palanca hasta el eje, que queda justo sobre el hombro. En el
//     marco del antebrazo Y va de la mano al codo, Z hacia el hombro y la X que empuja es -X a
//     la izquierda y +X a la derecha.

const HOMBRO = [0.19, 0.15, 0]; // en el marco del tórax
const RAD = Math.PI / 180;
const BAJA = -0.1; // el brazo baja un poco desde el hombro hasta el codo
const ALCANCE = 0.31 / Math.hypot(1, BAJA); // distancia horizontal del eje del hombro al codo

// th = ángulo del brazo visto desde arriba: 0 = hacia el lado, 90 = hacia adelante.
function brazo(th) {
  const d = [Math.cos(th * RAD), BAJA, Math.sin(th * RAD)].map((v) => v / Math.hypot(1, BAJA));
  const codo = HOMBRO.map((h, i) => h + 0.31 * d[i]);
  const mano = [codo[0], codo[1] + 0.33, codo[2]];
  return { brazos: { mano: { en: 'torax', pos: mano }, polo: d, giro: 0 } };
}

const sentado = {
  pelvis: { pos: [0, 0.652, 0.031], cabeceo: -4 },
  columna: { flex: 4 },
  cabeza: { flex: 0 },
  piernas: { pie: [0.2, 0.075, 0.45], abre: 10, polo: [0.25, 1, 0.8] },
};

// Máquina. Fijas: base, asiento, respaldo, poste trasero, viga alta y los dos ejes sobre los
// hombros (y = 1.70).
const fijo = (pos, tam, color = 'estructura') => ({ tipo: 'bloque', pos, tam, color });
const EJE_Y = 1.7;
// Pieza móvil de cada lado (s = 1 izquierda, -1 derecha), en el marco de su antebrazo.
const palanca = (s) => {
  const sigue = s > 0 ? 'antebrazoIzq' : 'antebrazoDer';
  const x = -s; // hacia donde empuja el antebrazo
  return [
    { tipo: 'bloque', sigue, pos: [x * 0.075, 0.16, 0], tam: [0.07, 0.34, 0.12], color: 'tapiz' },
    { tipo: 'bloque', sigue, pos: [x * 0.125, -0.07, 0], tam: [0.03, 0.5, 0.03], color: 'fierro' },
    { tipo: 'bloque', sigue, pos: [x * 0.0625, -0.3, ALCANCE / 2], tam: [0.03, 0.03, Math.hypot(0.125, ALCANCE)],
      giro: [0, s * 22, 0], color: 'fierro' },
  ];
};

export default {
  id: 'pec-deck',
  nombre: 'Pec deck',
  ceja: 'Pecho · máquina',
  periodo: 3,
  vista: 'tres',
  // 3/4 desde más arriba: se ve el arco de los codos sin que los cojines tapen los brazos.
  vistas: { tres: [0.55, 0.7, 0.75] },
  equipos: [
    fijo([0, 0.02, 0.0], [0.12, 0.04, 0.7]),            // base
    fijo([0, 0.2, 0.06], [0.07, 0.4, 0.07]),            // poste del asiento
    fijo([0, 0.44, 0.1], [0.4, 0.08, 0.4], 'tapiz'),    // asiento
    fijo([0, 0.99, -0.14], [0.36, 0.62, 0.08], 'tapiz'), // respaldo
    fijo([0, 0.89, -0.21], [0.06, 1.78, 0.06]),         // poste trasero
    fijo([0, EJE_Y + 0.04, -0.09], [0.05, 0.04, 0.26]), // viga hacia adelante
    fijo([0, EJE_Y + 0.04, 0.024], [0.5, 0.04, 0.05]),  // travesaño de los ejes
    fijo([0.19, EJE_Y, 0.024], [0.05, 0.05, 0.05], 'fierro'),
    fijo([-0.19, EJE_Y, 0.024], [0.05, 0.05, 0.05], 'fierro'),
    ...palanca(1),
    ...palanca(-1),
  ],
  momentos: [0, 0.22, 0.42],
  cuadros: [
    { t: 0, ...sentado, ...brazo(-15) },
    { t: 0.06 },
    { t: 0.14, ...brazo(13) },
    { t: 0.22, ...brazo(41) },
    { t: 0.3, ...brazo(69) },
    { t: 0.38, ...brazo(97) },
    { t: 0.48 },
    { t: 0.59, ...brazo(69) },
    { t: 0.7, ...brazo(41) },
    { t: 0.81, ...brazo(13) },
    { t: 0.92, ...brazo(-15) },
  ],
  trabajan: ['Pectoral'],
  ayudan: ['Hombro anterior', 'Serrato anterior'],
  pintar: ['pecho'],
  pasos: [
    [0, 'Sentado con la espalda apoyada, brazos a la altura de los hombros y codos en 90 grados contra los cojines.'],
    [0.06, 'Junta los codos al frente empujando los cojines con los antebrazos.'],
    [0.36, 'Adelante, los cojines casi se tocan: aprieta el pecho un instante.'],
    [0.48, 'Abre lento hasta que los codos queden un poco detrás del cuerpo.'],
  ],
};
