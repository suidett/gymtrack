// ─────────────────────────────────────────────────────────────────────────────
// GymTrack · esqueleto 3D (matemática pura, sin three.js)
//
// Convierte una pose en las posiciones 3D de todas las articulaciones de una persona
// de 1,75 m. No depende de three.js ni del DOM, para poder llevarlo tal cual a React Native.
//
// ── Ejes y unidades ──────────────────────────────────────────────────────────
//   Metros y grados. Y hacia arriba, el suelo es y = 0. De pie y sin giro, la persona
//   mira hacia +Z y su lado IZQUIERDO queda en +X (el derecho en -X).
//
// ── Una pose ─────────────────────────────────────────────────────────────────
//   {
//     pelvis:  { pos: [x, y, z], cabeceo, giro, alabeo },
//              pos = centro de la pelvis (de pie: [0, 0.985, 0]).
//              cabeceo + = el tronco se va hacia adelante (90 = boca abajo, -90 = de espalda).
//              giro + = gira hacia la izquierda (de +Z a +X). alabeo + = se inclina a la izquierda.
//     columna: { flex, lado, giro }      flexión (+ adelante, - arquea), inclinación lateral
//                                        (+ a la izquierda) y rotación (+ a la izquierda). Se
//                                        reparte en 3 tramos: pelvis-lumbar-tórax-cuello.
//     cabeza:  { flex, lado, giro }      respecto del tórax; la mitad va al cuello.
//     escapulas: { elev, prot }          metros: sube los hombros / los lleva adelante (- = junta
//                                        las escápulas, como en press banca).
//     alinear: { en, pos, z, x }         opcional: corre la pelvis en z (y/o x) para que el punto
//                                        `pos` del marco `en` quede en esa z (o x) del mundo.
//                                        Ej.: la barra sobre la mitad del pie en una sentadilla.
//
//     Extremidades. `brazos` y `piernas` valen para los dos lados: se escribe el lado
//     IZQUIERDO (x positiva) y el derecho se refleja en x. `brazoIzq`, `brazoDer`, `piernaIzq`
//     y `piernaDer` mandan sobre eso, por si un lado hace algo distinto.
//
//     Brazo por objetivo (IK analítica de dos huesos en 3D):
//       { mano: [x, y, z] | { en: 'torax', pos: [x, y, z] }, polo: [x, y, z], giro }
//       mano = centro del puño (donde va la barra o el mango). polo = DIRECCIÓN hacia donde
//       apunta el codo, en el mismo marco que la mano. giro = antebrazo: 0 martillo (palma hacia
//       adentro), 90 supino (palma arriba/adelante), -90 prono. La muñeca va recta.
//     Mano abierta (muñeca que se dobla): agrega `muneca` al brazo.
//       muneca: grados   extensión de la muñeca respecto del antebrazo (+ los dedos van hacia el
//                        dorso, - hacia la palma). La palma sale del `giro` del antebrazo.
//       muneca: { mira: [x, y, z], dedos: [x, y, z] }   palma fija: hacia dónde mira la palma y
//                        hacia dónde apuntan los dedos, en el marco de la mano (el mundo si `mano`
//                        es un punto). Para una mano apoyada en el suelo: { mira: [0, -1, 0],
//                        dedos: [0, 0, 1] }. La extensión que resulta se revisa igual.
//       Con `muneca`, `mano` es la BASE DE LA PALMA (el talón de la mano, en la línea media de la
//       palma) y el antebrazo efectivo mide 0.27 m (codo a base de la palma) en vez de 0.33.
//       La palma tiene 1,3 cm de medio grosor: apoyada en una superficie de alto h, mano y = h + 0.013.
//       cerrada: true    mano cerrada (agarre) con la muñeca doblada; la barra o el mango quedan
//                        en la base de la palma, como en el press militar con la muñeca atrás.
//     Brazo por ángulos:
//       { hombro: [flexión, abducción, rotación interna], codo: flexión, giro }
//       desde el brazo colgando: flexión lo lleva adelante, abducción hacia el lado.
//
//     Pierna por objetivo:
//       { pie: [x, y, z] | { en, pos }, polo, abre, talon, pivote }
//       pie = TOBILLO (pie plano en el suelo: y = MEDIDAS.tobillo = 0.075).
//       polo = dirección hacia donde apunta la rodilla. abre = grados que la punta se abre
//       hacia afuera (se suma al giro de la pelvis). talon = grados que se levanta el talón
//       (0 plano, 70 en punta de pies; en prensa a 45° la planta mira a la plataforma: -135).
//       pivote: 'bola' hace que `pie` sea la bola del pie (la base de los dedos) en vez del
//       tobillo, útil para quedar en punta de pies.
//     Pierna por ángulos:
//       { cadera: [flexión, abducción, rotación interna], rodilla: flexión, tobillo: flexión
//         plantar (+ punta abajo) }
//     No mezcles objetivo y ángulos en la misma extremidad a lo largo de un ejercicio.
//
//   Marcos para `en` (y para alinear): 'mundo', 'pelvis' (origen en la pelvis), 'abdomen'
//   (origen en la lumbar), 'torax' (origen en el tórax, a media espalda) y 'cabeza'.
//   Puntos útiles en el marco 'torax' (persona derecha, sin flexión):
//     hombros [±0.19, 0.15, 0], base del cuello [0, 0.20, 0],
//     centro de la barra sobre el trapecio (sentadilla trasera) [0, 0.16, -0.122],
//     superficie del esternón [0, 0.04, 0.115], espalda alta (apoyo en banca) [0, 0.05, -0.116].
//   En el marco 'pelvis': caderas [±0.09, -0.05, 0], superficie de los glúteos
//   [±0.074, -0.07, -0.14]. Acostado de espalda en una banca de alto h: pelvis.pos[1] ≈ h + 0.15
//   con cabeceo -82 y columna.flex -18 (ver ejercicios/press-de-banca.js).
//
// ── API ──────────────────────────────────────────────────────────────────────
//   MEDIDAS                    medidas del cuerpo (m).
//   resolver(pose)             -> { puntos, marcos, frentes, manos, avisos }
//        puntos: { pelvis, lumbar, torax, cuello, nuca, cabeza, coronilla,
//                  hombroIzq, codoIzq, munecaIzq, manoIzq, caderaIzq, rodillaIzq, tobilloIzq,
//                  talonIzq, pieIzq (bola), puntaIzq, ...Der }  cada uno [x, y, z]
//                  Con la mano abierta también dedosIzq / dedosDer (punta de los dedos).
//        manos:  { Izq, Der }: 'puno' (puño, muñeca recta), 'abierta' o 'cerrada' (con muñeca).
//                  El marco de la mano abierta o cerrada tiene Y hacia los dedos, Z hacia donde
//                  mira la palma y X a lo ancho de la palma.
//        marcos: { pelvis, columna1, abdomen, torax, cuello, cabeza, musloIzq, piernaIzq,
//                  pieIzq, brazoIzq, antebrazoIzq, manoIzq, ...Der }  cada uno { o, m }
//                  o = origen, m = matriz 3×3 por filas cuyas columnas son los ejes X, Y, Z.
//                  En los huesos de las extremidades Y va del extremo lejano al cercano y Z
//                  es el «frente» (rodilla, canilla; en el brazo, el lado del bíceps).
//        avisos: textos con lo que se ve mal (no alcanza, atraviesa el suelo...).
//   prepararCuadros(cuadros)   completa cada cuadro con lo que falta del anterior.
//   muestrear(cuadros, t)      pose interpolada (cúbica monótona, cíclica: t = 1 vuelve a 0).
//   poseEn(ejercicio, t)       resolver(muestrear(...)) con caché de cuadros preparados.
//   revisar(ejercicio, n)      recorre el ciclo y junta los avisos, más pies que resbalan.
//   Y utilidades de vectores y matrices (V, M3) para el motor.
// ─────────────────────────────────────────────────────────────────────────────

const RAD = Math.PI / 180;

// ── Vectores [x, y, z] ───────────────────────────────────────────────────────
const suma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const por = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const largo = (a) => Math.hypot(a[0], a[1], a[2]);
const unidad = (a, resp = [0, 1, 0]) => { const l = largo(a); return l > 1e-9 ? por(a, 1 / l) : resp.slice(); };
const mezcla = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
// La parte de v perpendicular a d (d unitario).
const perp = (v, d) => resta(v, por(d, punto(v, d)));
const cualquierPerp = (d) => unidad(Math.abs(d[1]) < 0.9 ? cruz(d, [0, 1, 0]) : cruz(d, [1, 0, 0]));
const angulo = (a, b) => Math.acos(Math.max(-1, Math.min(1, punto(unidad(a), unidad(b))))) / RAD;
export const V = { suma, resta, por, punto, cruz, largo, unidad, mezcla, perp, angulo };

// ── Matrices 3×3 por filas; sus columnas son los ejes locales X, Y, Z ────────
const IDENT = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mm = (A, B) => {
  const r = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    r[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  }
  return r;
};
const mv = (A, v) => [
  A[0] * v[0] + A[1] * v[1] + A[2] * v[2],
  A[3] * v[0] + A[4] * v[1] + A[5] * v[2],
  A[6] * v[0] + A[7] * v[1] + A[8] * v[2],
];
const rotX = (g) => { const c = Math.cos(g * RAD), s = Math.sin(g * RAD); return [1, 0, 0, 0, c, -s, 0, s, c]; };
const rotY = (g) => { const c = Math.cos(g * RAD), s = Math.sin(g * RAD); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
const rotZ = (g) => { const c = Math.cos(g * RAD), s = Math.sin(g * RAD); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
const eje = (M, i) => [M[i], M[3 + i], M[6 + i]];
const deEjes = (x, y, z) => [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
// Marco con Y en la dirección y, y Z lo más parecido posible a z.
const marcoYZ = (y, z) => {
  const Y = unidad(y);
  let Z = perp(z, Y);
  Z = largo(Z) > 1e-6 ? unidad(Z) : cualquierPerp(Y);
  return deEjes(cruz(Y, Z), Y, Z);
};
export const M3 = { IDENT, mm, mv, rotX, rotY, rotZ, eje, deEjes, marcoYZ };

// ── Medidas de una persona de 1,75 m (metros) ────────────────────────────────
export const MEDIDAS = {
  altura: 1.75,
  pelvisDePie: 0.985,          // centro de la pelvis con las piernas rectas
  tobillo: 0.075,              // altura del tobillo con el pie plano
  columna: [0.13, 0.17, 0.2],  // pelvis-lumbar, lumbar-tórax, tórax-base del cuello
  cuello: [0, 0.1, 0.012],     // base del cuello a la nuca, en el marco del cuello
  centroCabeza: [0, 0.064, 0.022],
  radioCabeza: 0.105,
  hombro: [0.19, 0.15, 0],     // en el marco del tórax
  cadera: [0.09, -0.05, 0],    // en el marco de la pelvis
  brazo: 0.31, antebrazo: 0.25, mano: 0.08, // mano: de la muñeca al centro del puño
  palma: 0.02,                 // mano abierta: de la muñeca a la base de la palma (antebrazo efectivo 0.27)
  largoMano: 0.165,            // de la base de la palma a la punta de los dedos
  muslo: 0.43, pierna: 0.43,
  pie: { talon: [0, -0.075, -0.055], bola: [0, -0.075, 0.135], punta: [0, -0.06, 0.195] },
};
const M = MEDIDAS;

// Cómo se reparte el movimiento de la columna entre sus tres tramos.
const PESOS = { flex: [0.45, 0.35, 0.2], lado: [0.4, 0.35, 0.25], giro: [0.15, 0.45, 0.4] };

const LADOS = [['Izq', 1], ['Der', -1]];
const MASC = { Izq: 'izquierdo', Der: 'derecho' }, FEM = { Izq: 'izquierda', Der: 'derecha' };

const rotPYR = (o = {}) => mm(mm(rotY(o.giro || 0), rotX(o.flex || 0)), rotZ(-(o.lado || 0)));

// ── El tronco: pelvis, columna, cuello, cabeza y hombros ─────────────────────
function tronco(pose, pos) {
  const pel = pose.pelvis || {};
  const Rp = mm(mm(rotY(pel.giro || 0), rotX(pel.cabeceo || 0)), rotZ(-(pel.alabeo || 0)));
  const col = pose.columna || {};
  const puntos = { pelvis: pos.slice() };
  const marcos = { mundo: { o: [0, 0, 0], m: IDENT }, pelvis: { o: pos.slice(), m: Rp } };
  const nombres = ['lumbar', 'torax', 'cuello'];
  const marcoDe = ['columna1', 'abdomen', 'torax'];
  let R = Rp, o = pos;
  for (let i = 0; i < 3; i++) {
    R = mm(mm(mm(R, rotY((col.giro || 0) * PESOS.giro[i])), rotX((col.flex || 0) * PESOS.flex[i])),
      rotZ(-(col.lado || 0) * PESOS.lado[i]));
    marcos[marcoDe[i]] = { o: o.slice(), m: R };
    o = suma(o, mv(R, [0, M.columna[i], 0]));
    puntos[nombres[i]] = o;
  }
  const cab = pose.cabeza || {};
  const mitad = { flex: (cab.flex || 0) / 2, lado: (cab.lado || 0) / 2, giro: (cab.giro || 0) / 2 };
  const Rn = mm(marcos.torax.m, rotPYR(mitad));
  marcos.cuello = { o: puntos.cuello, m: Rn };
  puntos.nuca = suma(puntos.cuello, mv(Rn, M.cuello));
  const Rh = mm(Rn, rotPYR(mitad));
  puntos.cabeza = suma(puntos.nuca, mv(Rh, M.centroCabeza));
  puntos.coronilla = suma(puntos.cabeza, mv(Rh, [0, M.radioCabeza, 0]));
  marcos.cabeza = { o: puntos.cabeza, m: Rh };

  const esc = pose.escapulas || {};
  const Rt = marcos.torax.m;
  for (const [L, s] of LADOS) {
    puntos['hombro' + L] = suma(puntos.torax, mv(Rt, [s * M.hombro[0], M.hombro[1] + (esc.elev || 0), M.hombro[2] + (esc.prot || 0)]));
    puntos['cadera' + L] = suma(pos, mv(Rp, [s * M.cadera[0], M.cadera[1], M.cadera[2]]));
  }
  return { puntos, marcos };
}

// Un punto (o dirección) dado en un marco con nombre, llevado al mundo.
function enMundo(spec, marcos, avisos) {
  if (Array.isArray(spec)) return { p: spec, R: IDENT };
  const m = marcos[spec.en || 'mundo'];
  if (!m) { avisos.push(`No existe el marco «${spec.en}».`); return { p: spec.pos, R: IDENT }; }
  return { p: suma(m.o, mv(m.m, spec.pos)), R: m.m };
}

// ── IK analítica de dos huesos ───────────────────────────────────────────────
// Desde la raíz a, con huesos l1 y l2, hacia el objetivo; el medio se dobla hacia `polo`.
export function dosHuesos(a, objetivo, l1, l2, polo) {
  const d = resta(objetivo, a);
  let dist = largo(d);
  const dir = unidad(d, [0, -1, 0]);
  const max = l1 + l2 - 1e-4, min = Math.abs(l1 - l2) + 1e-3;
  const falta = Math.max(0, dist - max);
  dist = Math.min(max, Math.max(min, dist));
  const cosA = Math.max(-1, Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)));
  const sinA = Math.sqrt(1 - cosA * cosA);
  let b = perp(polo, dir);
  b = largo(b) > 1e-6 ? unidad(b) : cualquierPerp(dir);
  const medio = suma(a, suma(por(dir, l1 * cosA), por(b, l1 * sinA)));
  return { medio, fin: suma(a, por(dir, dist)), falta, plano: b };
}

// Refleja una extremidad escrita para el lado izquierdo (x positiva) al derecho.
function espejo(e) {
  if (!e) return e;
  const r = {};
  for (const [k, v] of Object.entries(e)) {
    if (Array.isArray(v) && v.length === 3 && ['mano', 'pie', 'polo', 'pos', 'mira', 'dedos'].includes(k)) r[k] = [-v[0], v[1], v[2]];
    else if (v && typeof v === 'object' && !Array.isArray(v)) r[k] = espejo(v);
    else r[k] = v;
  }
  return r;
}

// Marco de la mano: Y hacia los dedos (sigue al antebrazo), X a lo largo del mango.
// Con giro 0 (martillo) el mango queda en el plano del codo; con 90, cruzado.
function marcoMano(codo, mano, hombro, plano, giro, s) {
  const y = unidad(resta(mano, codo));
  let u = perp(resta(hombro, codo), y); // el pulgar apunta hacia el lado del bíceps
  u = largo(u) > 1e-3 ? unidad(u) : unidad(perp(por(plano, -1), y), cualquierPerp(y));
  const n = unidad(cruz(y, u));
  const g = (giro || 0) * RAD * s;
  const x = suma(por(u, Math.cos(g)), por(n, Math.sin(g)));
  return deEjes(x, y, unidad(cruz(x, y)));
}

// Con `muneca` la mano va abierta (o cerrada con la muñeca doblada) y el objetivo es la base
// de la palma.
const conMuneca = (e) => !!e && (typeof e.muneca === 'number' || esObjeto(e.muneca));

// Marco de la mano con muñeca: Y hacia los dedos, Z hacia donde mira la palma, X = Y × Z.
// Devuelve también la extensión de la muñeca (grados, + hacia el dorso).
function marcoPalma(e, codo, mano, hombro, plano, s, R) {
  const y = unidad(resta(mano, codo));
  let P, f;
  if (typeof e.muneca === 'number') {
    // Palma con la muñeca recta, según el giro del antebrazo: 0 hacia adentro, 90 hacia el
    // lado del bíceps (supino), -90 hacia el otro (prono).
    let u = perp(resta(hombro, codo), y);
    u = largo(u) > 1e-3 ? unidad(u) : unidad(perp(por(plano, -1), y), cualquierPerp(y));
    const n = unidad(cruz(y, u));
    const g = (e.giro || 0) * RAD, w = e.muneca * RAD;
    const P0 = unidad(suma(por(n, s * Math.cos(g)), por(u, Math.sin(g))));
    f = unidad(suma(por(y, Math.cos(w)), por(P0, -Math.sin(w))));
    P = unidad(suma(por(P0, Math.cos(w)), por(y, Math.sin(w))));
  } else {
    P = unidad(mv(R, e.muneca.mira || [0, -1, 0]), [0, -1, 0]);
    f = perp(mv(R, e.muneca.dedos || [0, 0, 1]), P);
    f = largo(f) > 1e-6 ? unidad(f) : cualquierPerp(P);
  }
  const ext = angulo(y, f) * (punto(P, y) >= 0 ? 1 : -1);
  return { m: deEjes(cruz(f, P), f, P), f, ext };
}

function brazo(e, L, s, base, avisos) {
  const { puntos, marcos } = base;
  const hombro = puntos['hombro' + L];
  const abierta = conMuneca(e);
  const l1 = M.brazo, l2 = M.antebrazo + (abierta ? M.palma : M.mano);
  let codo, mano, plano, Robj = IDENT;
  if (e && e.mano) {
    const obj = enMundo(e.mano, marcos, avisos);
    Robj = obj.R;
    const polo = e.polo ? mv(obj.R, e.polo) : mv(marcos.torax.m, [0.3 * s, -0.6, -1]);
    const r = dosHuesos(hombro, obj.p, l1, l2, polo);
    if (r.falta > 0.01) avisos.push(`El brazo ${MASC[L]} no alcanza la mano (faltan ${Math.round(r.falta * 100)} cm).`);
    codo = r.medio; mano = r.fin; plano = r.plano;
  } else {
    const [fl, ab, ro] = (e && e.hombro) || [0, 0, 0];
    const Ru = mm(mm(mm(marcos.torax.m, rotX(-fl)), rotZ(s * ab)), rotY(-s * ro));
    codo = suma(hombro, mv(Ru, [0, -l1, 0]));
    const Rf = mm(Ru, rotX(-((e && e.codo) || 0)));
    mano = suma(codo, mv(Rf, [0, -l2, 0]));
    plano = eje(Ru, 2); // el codo apunta hacia atrás del brazo: -Z local; el bíceps hacia +Z
    plano = por(plano, -1);
  }
  const muneca = mezcla(codo, mano, M.antebrazo / l2);
  puntos['codo' + L] = codo; puntos['muneca' + L] = muneca; puntos['mano' + L] = mano;
  const yBrazo = resta(hombro, codo), yAnte = resta(codo, mano);
  // Frente del brazo (bíceps) = contrario a donde apunta el codo.
  marcos['brazo' + L] = { o: codo, m: marcoYZ(yBrazo, por(plano, -1)) };
  marcos['antebrazo' + L] = { o: mano, m: marcoYZ(yAnte, por(plano, -1)) };
  if (abierta) {
    const p = marcoPalma(e, codo, mano, hombro, plano, s, Robj);
    marcos['mano' + L] = { o: mano, m: p.m };
    puntos['dedos' + L] = suma(mano, por(p.f, M.largoMano));
    base.manos[L] = e.cerrada ? 'cerrada' : 'abierta';
    if (p.ext > 95) avisos.push(`La muñeca ${FEM[L]} se dobla hacia atrás más de lo posible (${Math.round(p.ext)}°).`);
    if (p.ext < -80) avisos.push(`La muñeca ${FEM[L]} se dobla hacia adelante más de lo posible (${Math.round(-p.ext)}°).`);
  } else {
    marcos['mano' + L] = { o: mano, m: marcoMano(codo, mano, hombro, plano, e && e.giro, s) };
    base.manos[L] = 'puno';
  }
  const flex = 180 - angulo(resta(hombro, codo), resta(mano, codo));
  if (flex > 155) avisos.push(`El codo ${MASC[L]} se dobla más de lo posible (${Math.round(flex)}°).`);
}

function pierna(e, L, s, base, pose, avisos) {
  const { puntos, marcos } = base;
  const cadera = puntos['cadera' + L];
  const l1 = M.muslo, l2 = M.pierna;
  const lado = FEM[L];
  let rodilla, tobillo, plano, Rf;
  if (e && e.pie) {
    const rumbo = ((pose.pelvis && pose.pelvis.giro) || 0) + s * (e.abre || 0);
    Rf = mm(rotY(rumbo), rotX(e.talon || 0));
    const obj = enMundo(e.pie, marcos, avisos);
    const objetivo = e.pivote === 'bola' ? resta(obj.p, mv(Rf, M.pie.bola)) : obj.p;
    const polo = e.polo ? mv(obj.R, e.polo) : eje(Rf, 2);
    const r = dosHuesos(cadera, objetivo, l1, l2, polo);
    if (r.falta > 0.005) avisos.push(`La pierna ${lado} no llega al pie (faltan ${Math.round(r.falta * 100)} cm): el pie se despega.`);
    rodilla = r.medio; tobillo = r.fin; plano = r.plano;
  } else {
    const [fl, ab, ro] = (e && e.cadera) || [0, 0, 0];
    const Rm = mm(mm(mm(marcos.pelvis.m, rotX(-fl)), rotZ(s * ab)), rotY(-s * ro));
    rodilla = suma(cadera, mv(Rm, [0, -l1, 0]));
    const Rc = mm(Rm, rotX((e && e.rodilla) || 0));
    tobillo = suma(rodilla, mv(Rc, [0, -l2, 0]));
    Rf = mm(Rc, rotX((e && e.tobillo) || 0));
    plano = eje(Rm, 2);
  }
  puntos['rodilla' + L] = rodilla; puntos['tobillo' + L] = tobillo;
  puntos['talon' + L] = suma(tobillo, mv(Rf, M.pie.talon));
  puntos['pie' + L] = suma(tobillo, mv(Rf, M.pie.bola));
  puntos['punta' + L] = suma(tobillo, mv(Rf, M.pie.punta));
  marcos['muslo' + L] = { o: rodilla, m: marcoYZ(resta(cadera, rodilla), plano) };
  marcos['pierna' + L] = { o: tobillo, m: marcoYZ(resta(rodilla, tobillo), plano) };
  marcos['pie' + L] = { o: tobillo, m: Rf };

  // Revisiones: rodilla, tobillo y rodilla en la línea del pie.
  const flexR = 180 - angulo(resta(cadera, rodilla), resta(tobillo, rodilla));
  if (flexR > 155) avisos.push(`La rodilla ${lado} se dobla más de lo posible (${Math.round(flexR)}°).`);
  const canilla = unidad(resta(rodilla, tobillo));
  const adelante = eje(Rf, 2);
  const tob = angulo(canilla, adelante); // 90 = neutro
  if (tob < 45) avisos.push(`El tobillo ${MASC[L]} se dobla demasiado hacia arriba (${Math.round(90 - tob)}° de flexión).`);
  if (tob > 150) avisos.push(`El tobillo ${MASC[L]} se estira demasiado (${Math.round(tob - 90)}°).`);
  if (flexR > 25) {
    const a = perp(plano, canilla), b = perp(adelante, canilla);
    if (largo(a) > 1e-3 && largo(b) > 1e-3 && angulo(a, b) > 35) {
      avisos.push(`La rodilla ${lado} no va en la línea del pie (${Math.round(angulo(a, b))}°).`);
    }
  }
}

// Radio aproximado del cuerpo alrededor de cada punto, para revisar el suelo.
const RADIOS = {
  pelvis: 0.13, lumbar: 0.1, torax: 0.11, cuello: 0.06, nuca: 0.05, cabeza: 0.1, coronilla: 0,
  hombro: 0.06, codo: 0.04, muneca: 0.03, mano: 0.035, cadera: 0.08, rodilla: 0.055, tobillo: 0.04,
  talon: 0, pie: 0, punta: 0, dedos: 0.01,
};
const radioDe = (nombre) => RADIOS[nombre.replace(/(Izq|Der)$/, '')] ?? 0.05;

// ── Resolver una pose ────────────────────────────────────────────────────────
export function resolver(pose) {
  const avisos = [];
  let pos = ((pose.pelvis && pose.pelvis.pos) || [0, M.pelvisDePie, 0]).slice();
  let base = tronco(pose, pos);
  if (pose.alinear) {
    const a = pose.alinear;
    const p = enMundo({ en: a.en || 'torax', pos: a.pos || [0, 0, 0] }, base.marcos, avisos).p;
    const dx = typeof a.x === 'number' ? a.x - p[0] : 0;
    const dz = typeof a.z === 'number' ? a.z - p[2] : 0;
    if (dx || dz) { pos = [pos[0] + dx, pos[1], pos[2] + dz]; base = tronco(pose, pos); }
  }
  base.manos = {};
  for (const [L, s] of LADOS) {
    const b = Object.assign({}, s > 0 ? pose.brazos : espejo(pose.brazos), pose['brazo' + L]);
    brazo(b, L, s, base, avisos);
    const p = Object.assign({}, s > 0 ? pose.piernas : espejo(pose.piernas), pose['pierna' + L]);
    pierna(p, L, s, base, pose, avisos);
  }
  const { puntos, marcos } = base;
  delete marcos.mundo;
  for (const [n, p] of Object.entries(puntos)) {
    const bajo = p[1] - radioDe(n);
    if (bajo < -0.015) avisos.push(`Atraviesa el suelo: ${n} (${Math.round(-bajo * 100)} cm).`);
  }
  const frentes = {};
  for (const n of ['musloIzq', 'musloDer', 'piernaIzq', 'piernaDer', 'brazoIzq', 'brazoDer', 'antebrazoIzq', 'antebrazoDer']) {
    frentes[n] = eje(marcos[n].m, 2);
  }
  return { puntos, marcos, frentes, manos: base.manos, avisos };
}

// ── Cuadros e interpolación ─────────────────────────────────────────────────
const esObjeto = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Fusiona `sobre` encima de `base` (los arreglos se reemplazan enteros).
export function fusionar(base, sobre) {
  if (!esObjeto(base)) return clonar(sobre);
  const r = clonar(base);
  for (const [k, v] of Object.entries(sobre || {})) r[k] = esObjeto(v) && esObjeto(r[k]) ? fusionar(r[k], v) : clonar(v);
  return r;
}
function clonar(v) {
  if (Array.isArray(v)) return v.map(clonar);
  if (esObjeto(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clonar(x)]));
  return v;
}
// Agrega a `destino` lo que le falta y sí está en `fuente`.
function rellenar(destino, fuente) {
  for (const [k, v] of Object.entries(fuente || {})) {
    if (!(k in destino)) destino[k] = clonar(v);
    else if (esObjeto(destino[k]) && esObjeto(v)) rellenar(destino[k], v);
  }
  return destino;
}

// Cada cuadro hereda lo que no dice del anterior (y el primero, del último). Un cuadro en
// t >= 1 se descarta: el ciclo siempre vuelve al primero.
export function prepararCuadros(cuadros) {
  const lista = cuadros.filter((c) => c.t < 1).slice().sort((a, b) => a.t - b.t);
  if (!lista.length) return [{ t: 0 }];
  const pasada = (primero) => {
    const r = [primero];
    for (let i = 1; i < lista.length; i++) r.push(fusionar(r[i - 1], lista[i]));
    return r;
  };
  let r = pasada(clonar(lista[0]));
  const primero = rellenar(clonar(lista[0]), r[r.length - 1]);
  r = pasada(primero);
  r.forEach((c, i) => { c.t = lista[i].t; });
  return r;
}

// Hermite cúbica monótona (Fritsch-Butland): suave y sin pasarse de los valores clave,
// para que nada atraviese el suelo entre dos cuadros.
function pendiente(d0, d1, h0, h1) {
  if (d0 * d1 <= 0) return 0;
  return (3 * (h0 + h1)) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1);
}
function hermite(v0, v1, v2, v3, h0, h1, h2, u) {
  const d0 = (v1 - v0) / h0, d1 = (v2 - v1) / h1, d2 = (v3 - v2) / h2;
  const m1 = pendiente(d0, d1, h0, h1), m2 = pendiente(d1, d2, h1, h2);
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v1 + (u3 - 2 * u2 + u) * h1 * m1 + (-2 * u3 + 3 * u2) * v2 + (u3 - u2) * h1 * m2;
}
function interpolar(n0, n1, n2, n3, h0, h1, h2, u) {
  if (typeof n1 === 'number') {
    const f = (v) => (typeof v === 'number' ? v : n1);
    return hermite(f(n0), n1, typeof n2 === 'number' ? n2 : n1, f(n3), h0, h1, h2, u);
  }
  if (Array.isArray(n1)) {
    return n1.map((v, i) => interpolar(n0?.[i], v, n2?.[i] ?? v, n3?.[i], h0, h1, h2, u));
  }
  if (esObjeto(n1)) {
    const r = {};
    for (const k of new Set([...Object.keys(n1), ...Object.keys(n2 || {})])) {
      if (k === 't') continue;
      const a = k in n1 ? n1[k] : n2[k], b = n2 && k in n2 ? n2[k] : a;
      r[k] = interpolar(n0?.[k] ?? a, a, b, n3?.[k] ?? b, h0, h1, h2, u);
    }
    return r;
  }
  return n1; // textos y booleanos: cambian al llegar al cuadro
}

export function muestrear(preparados, t) {
  const c = preparados, n = c.length;
  if (n === 1) return clonar(c[0]);
  let x = ((t % 1) + 1) % 1;
  if (x < c[0].t) x += 1;
  const T = (i) => c[((i % n) + n) % n].t + Math.floor(i / n); // tiempos con vueltas
  let i = 0;
  while (i < n - 1 && x >= T(i + 1)) i++;
  const h = (k) => T(k + 1) - T(k) || 1e-6;
  const at = (k) => c[((k % n) + n) % n];
  const u = Math.max(0, Math.min(1, (x - T(i)) / h(i)));
  return interpolar(at(i - 1), at(i), at(i + 1), at(i + 2), h(i - 1), h(i), h(i + 1), u);
}

const cache = new WeakMap();
export function cuadrosDe(ej) {
  if (!cache.has(ej)) cache.set(ej, prepararCuadros(ej.cuadros || [{ t: 0 }]));
  return cache.get(ej);
}
export function poseEn(ej, t) { return resolver(muestrear(cuadrosDe(ej), t)); }

// Recorre el ciclo y junta los avisos (con el primer instante en que aparecen), más los
// pies que se mueven mientras están apoyados en el suelo.
export function revisar(ej, n = 60) {
  const vistos = new Map();
  const pies = { Izq: null, Der: null };
  const anota = (texto, t) => { if (!vistos.has(texto)) vistos.set(texto, t); };
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const s = poseEn(ej, t);
    s.avisos.forEach((a) => anota(a, t));
    for (const L of ['Izq', 'Der']) {
      const pts = ['talon', 'pie'].map((p) => s.puntos[p + L]);
      const apoyado = pts.every((p) => p[1] < 0.012);
      const antes = pies[L];
      if (apoyado && antes) {
        const mov = Math.max(...pts.map((p, i) => Math.hypot(p[0] - antes[i][0], p[2] - antes[i][2])));
        if (mov > 0.01) anota(`El pie ${MASC[L]} resbala en el suelo (${Math.round(mov * 100)} cm).`, t);
      }
      pies[L] = apoyado ? pts : null;
    }
  }
  return [...vistos].map(([texto, t]) => ({ t, texto }));
}
