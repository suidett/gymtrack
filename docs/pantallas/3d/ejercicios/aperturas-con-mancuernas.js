// Aperturas con mancuernas en banca plana. El cuerpo es el de press-de-banca.js (acostado, pies en
// el suelo); los brazos abren y cierran en arco, con los codos un poco doblados y fijos.
//
// Cómo está hecho:
//   - Las manos van en el marco 'torax' (el tronco no se mueve): así el arco gira alrededor del
//     hombro. En ese marco X va hacia la izquierda, Y hacia la cabeza y Z sale del pecho.
//   - La mano queda siempre a 0.625 m del hombro: el codo se mantiene doblado unos 25°.
//   - Se escriben varios cuadros a lo largo del arco para que la mano no corte camino por dentro.
//   - giro 90: palmas enfrentadas, el mango de la mancuerna va a lo largo del cuerpo.

const HOMBRO = [0.19, 0.15, -0.025]; // en el marco del tórax (con las escápulas juntas)
const RADIO = 0.625;
const RAD = Math.PI / 180;

// fi = ángulo del brazo desde la vertical del pecho hacia afuera (0 = brazo apuntando al techo).
function brazo(fi) {
  const s = Math.sin(fi * RAD), c = Math.cos(fi * RAD);
  const dir = [s, -0.17, c]; // un poco hacia los pies: arriba quedan sobre el pecho
  const l = Math.hypot(...dir);
  const pos = HOMBRO.map((h, i) => h + (RADIO * dir[i]) / l);
  // El codo apunta hacia afuera y hacia el suelo, un poco hacia los pies.
  return { brazos: { mano: { en: 'torax', pos }, polo: [c, -0.25, -s], giro: 90 } };
}

const acostado = {
  pelvis: { pos: [0, 0.58, 0.3], cabeceo: -82 },
  columna: { flex: -18 },
  cabeza: { flex: -4 },
  escapulas: { prot: -0.025 },
  // Pies planos a ±0.24, rodillas a ±0.27: de frente no se abren como rana.
  piernas: { pie: [0.24, 0.075, 0.6], abre: 8, polo: [0.12, 1, 0.4] },
};

export default {
  id: 'aperturas-con-mancuernas',
  nombre: 'Aperturas con mancuernas',
  ceja: 'Pecho · mancuernas',
  periodo: 3.4,
  vista: 'frente',
  // De frente desde los pies y arriba: se ve el arco de los brazos y no la entrepierna.
  vistas: { frente: [0, 0.9, 0.6] },
  equipos: [
    { tipo: 'banca', alto: 0.43, z: -0.05, largo: 1.2, ancho: 0.28 },
    { tipo: 'mancuernas', mano: 'ambas' },
  ],
  momentos: [0, 0.26, 0.48],
  cuadros: [
    { t: 0, ...acostado, ...brazo(-8) },
    { t: 0.06 },
    { t: 0.16, ...brazo(15) },
    { t: 0.26, ...brazo(38) },
    { t: 0.36, ...brazo(61) },
    { t: 0.46, ...brazo(84) },
    { t: 0.52 },
    { t: 0.62, ...brazo(61) },
    { t: 0.71, ...brazo(38) },
    { t: 0.8, ...brazo(15) },
    { t: 0.9, ...brazo(-8) },
  ],
  trabajan: ['Pectoral'],
  ayudan: ['Hombro anterior', 'Bíceps', 'Serrato anterior'],
  pintar: ['pecho'],
  pasos: [
    [0, 'Acostado, mancuernas sobre el pecho con las palmas enfrentadas y los codos un poco doblados.'],
    [0.06, 'Abre los brazos en arco hacia los lados, sin cambiar el ángulo de los codos.'],
    [0.44, 'Baja hasta sentir el pecho estirado, con las manos a la altura del pecho.'],
    [0.52, 'Cierra por el mismo arco, como si abrazaras un barril, hasta juntar las mancuernas sobre el pecho.'],
  ],
};
