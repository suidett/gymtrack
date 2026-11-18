// Elevaciones laterales con mancuernas, de pie. Los brazos suben en el plano de la escápula
// (18° por delante del plano frontal), con los codos apenas doblados y las escápulas quietas
// (sin encoger los hombros).
//
// Cómo se calcularon los números (con esqueleto.js):
//   - Pies fijos a ±0.12, rodillas casi estiradas (pelvis a 0.983); el tronco no se mueve.
//   - Cada cuadro sale de `brazo(e, codo)`: el brazo apunta e grados desde abajo, dentro del
//     plano de la escápula, y el antebrazo se dobla `codo` grados hacia el lado del bíceps (hacia
//     adelante y arriba). La mano va en el marco del tórax y el polo lleva el codo hacia atrás,
//     así la IK reproduce ese brazo exacto.
//   - Abajo el brazo queda 7° separado del cuerpo para que la mancuerna no toque el muslo.
//   - Arriba, 88° con el codo a 20°: el codo queda a la altura del hombro y la mano apenas más
//     abajo, con el mango horizontal hacia adelante (palma hacia el suelo).
//   - Hay cuadros cada pocos grados (no solo abajo y arriba) para que la mano siga el arco y el
//     codo no se doble de más entre cuadros.
//   - escapulas.elev queda en 0 todo el ciclo: los hombros no suben.

const RAD = Math.PI / 180;
const PLANO = 18;                       // plano de la escápula: grados por delante del frontal
const HOMBRO = [0.19, 0.15, 0];         // en el marco del tórax
const L1 = 0.31, L2 = 0.33;             // brazo y antebrazo hasta el centro del puño

const unidad = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
// Brazo izquierdo a e grados desde abajo, en el plano de la escápula, con el codo doblado.
function brazo(e, codo) {
  const a = e * RAD, p = PLANO * RAD, c = codo * RAD;
  const d = [Math.sin(a) * Math.cos(p), -Math.cos(a), Math.sin(a) * Math.sin(p)];
  // Lado del bíceps: hacia adelante, perpendicular al brazo.
  const k = d[2];
  const n = unidad([-k * d[0], -k * d[1], 1 - k * d[2]]);
  const f = d.map((x, i) => x * Math.cos(c) + n[i] * Math.sin(c));
  const mano = HOMBRO.map((h, i) => +(h + d[i] * L1 + f[i] * L2).toFixed(4));
  return { mano: { en: 'torax', pos: mano }, polo: n.map((x) => +(-x).toFixed(4)), giro: 0 };
}

const quieto = {
  pelvis: { pos: [0, 0.983, 0] },
  cabeza: { flex: 4 },
  escapulas: { elev: 0 },
  piernas: { pie: [0.12, 0.075, 0], abre: 8 },
};

// Va de (e0, codo0) a (e1, codo1) con una curva suave, en n pasos entre t0 y t1.
function tramo(t0, t1, [e0, k0], [e1, k1], n) {
  const r = [];
  for (let i = 1; i <= n; i++) {
    const u = i / n, s = u * u * (3 - 2 * u);
    r.push({ t: +(t0 + (t1 - t0) * u).toFixed(4), brazos: brazo(e0 + (e1 - e0) * s, k0 + (k1 - k0) * s) });
  }
  return r;
}

export default {
  id: 'elevaciones-laterales',
  nombre: 'Elevaciones laterales',
  ceja: 'Hombros · mancuernas',
  periodo: 3.2,
  vista: 'frente',
  equipos: [{ tipo: 'mancuernas', mano: 'ambas' }],
  momentos: [0, 0.2, 0.4],
  cuadros: [
    { t: 0, ...quieto, brazos: brazo(7, 15) },
    { t: 0.06 },                                        // un instante abajo
    ...tramo(0.06, 0.4, [7, 15], [88, 20], 5),          // sube
    { t: 0.48 },                                        // arriba, un instante
    ...tramo(0.48, 0.94, [88, 20], [8, 15], 6),         // baja más lento que sube
  ],
  trabajan: ['Hombro lateral'],
  ayudan: ['Hombro anterior', 'Trapecio'],
  pintar: ['hombros'],
  pintarAyuda: ['trapecio'],
  pasos: [
    [0, 'De pie, mancuernas al costado, codos apenas doblados y hombros abajo.'],
    [0.06, 'Sube los brazos por los lados y un poco adelante, guiando con los codos.'],
    [0.4, 'Para a la altura de los hombros, sin encogerlos.'],
    [0.48, 'Baja lento y controlado hasta el costado.'],
  ],
};
