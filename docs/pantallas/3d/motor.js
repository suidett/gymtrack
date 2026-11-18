// ─────────────────────────────────────────────────────────────────────────────
// GymTrack · motor 3D de los ejercicios (three.js 0.160)
//
// Dibuja la pose que calcula esqueleto.js. La figura se arma «por puntos»: cada hueso es una
// cápsula puesta entre dos articulaciones y el tronco son volúmenes pegados a los marcos de
// la columna, así sirve igual de pie, acostado en banca, sentado, colgado o en el suelo.
//
// ── API ──────────────────────────────────────────────────────────────────────
//   crearVisor(caja, { tel, ejercicio, vista, amortiguar, alMover })
//       -> { posar(t), vista(nombre), medir(), dibujar(), destruir(), revisar(), escena, ej }
//       caja: elemento donde va el lienzo (se pone primero). tel: elemento con data-tema del
//       que se leen los colores. vista: 'frente' | 'lado' | 'tres' (3/4); por defecto la del
//       ejercicio. Arrastrar gira (OrbitControls sin zoom ni desplazamiento). alMover se
//       llama cuando la persona gira la cámara (para redibujar si está en pausa).
//   crearEscena(ejercicio, colores) -> { escena, posar(t), encuadrar(camara, dir, aspecto,
//       margenes), mirarDesde(posicionCamara), revisar(), destruir() }   lo mismo sin lienzo,
//       para dibujar muchas con un solo renderer. Antes de cada render llama a
//       mirarDesde(camara.position): aclara el disco de la barra que queda frente a la cámara.
//       margenes: { lados, arriba, abajo } en fracción del cuadro (por defecto 0.08 en los cuatro).
//   colores(elemento)            lee los tokens del teléfono (--sup, --sup-alta, --texto...).
//   cargarEjercicio(id)          -> Promise<ejercicio | null> (null si el archivo no existe).
//   revisar(ejercicio)           -> [{ t, texto }] avisos del esqueleto y del equipo.
//   VISTAS, PARTES               direcciones de cámara y partes que se pueden pintar.
//
// ── Un ejercicio (3d/ejercicios/<id>.js, export default) ─────────────────────
//   { id, nombre, ceja: 'Grupo · equipo', periodo (s), vista: 'lado',
//     equipos: [ ...ver abajo ], cuadros: [{ t, ...pose }], trabajan: [...], ayudan: [...],
//     pintar: [...partes], pasos: [[t, 'texto'], ...],
//     pintarAyuda: [...partes]              (opcional: los de `ayudan`, en ámbar apagado al 35 %)
//     momentos: [inicio, mitad, exigente]   (t de la hoja de revisión; opcional)
//     vistas: { lado: [x, y, z] }           (opcional: otra dirección de cámara) }
//   En la vista de lado no hace falta esquivar los discos: el disco que queda frente a la
//   cámara se dibuja tenue (25 %) con su borde, y se ve el cuerpo detrás.
//   La pose está documentada en esqueleto.js. Los cuadros se interpolan suave (cúbica
//   monótona) y el ciclo vuelve al primero. Un cuadro que solo dice { t } repite el anterior
//   (sirve para pausas). Ejemplos: ejercicios/sentadilla-trasera.js (de pie, barra en la
//   espalda) y ejercicios/press-de-banca.js (acostado en banca, barra en las manos).
//
// ── Cómo armar un ejercicio nuevo ────────────────────────────────────────────
//   1. Copia el ejemplo más parecido y agrega el id a ejercicios/indice.js (ya están los 67 de la
//      biblioteca).
//   2. Lo que apoya va fijo en el mundo (pies en el suelo, manos en la barra de dominadas):
//      escribe el mismo objetivo en todos los cuadros y no resbala. Lo que se mueve con el
//      cuerpo va en un marco ('torax', 'pelvis'). Lo que lleva una trayectoria (la barra en
//      press) va en el mundo y las manos la siguen.
//   3. Para calcular números sin navegador: node puede importar esqueleto.js y el ejercicio,
//      y poseEn(ej, t).puntos da todas las articulaciones (ángulos, alturas, distancias).
//   4. Revisa en 3d/revision.html#ej=<id> (lista de avisos automáticos abajo) y en
//      ejercicios-3d.html#estado=<id>&t=0.5&vista=lado&jugar=no para una pose exacta.
//      Los avisos cubren: no alcanza, articulaciones fuera de rango, rodilla fuera de la
//      línea del pie, cosas bajo el suelo, pies que resbalan, cuerpo dentro de banca, cajón
//      o bloques fijos, barra dentro del cuerpo y puño o codo dentro del tronco.
//
// ── Partes para pintar en ámbar ──────────────────────────────────────────────
//   cuadriceps, isquios, gemelos, gluteos, abdomen, lumbares, pecho, dorsales, trapecio,
//   hombros, biceps, triceps, antebrazos. Grupos: muslos (cuádriceps + isquios), brazos
//   (bíceps + tríceps), espalda (dorsales + trapecio), core (abdomen + lumbares).
//   `pintar` va en ámbar; `pintarAyuda` en ámbar mezclado al 35 % con el gris de la figura.
//   Si una parte está en los dos, gana `pintar`.
//
// ── Manos ────────────────────────────────────────────────────────────────────
//   Sin `muneca` la mano es un puño con la muñeca recta (barras, mancuernas, poleas). Con
//   `muneca` en el brazo (ver esqueleto.js) se dibuja abierta: palma, dedos y pulgar, con la
//   muñeca doblada, para manos apoyadas (flexiones, planchas, fondos en banco). Con además
//   `cerrada: true`, es un puño con la muñeca doblada (press militar con la muñeca atrás).
//
// ── Equipos ──────────────────────────────────────────────────────────────────
//   { tipo: 'suelo', colchoneta: { pos: [x, z], tam: [ancho, largo] } }  el suelo va siempre;
//       esto solo agrega una colchoneta (1,2 cm de grosor, con el color de superficie del tema).
//   { tipo: 'banca', alto: 0.43, z: 0, largo: 1.2, ancho: 0.28 }          plana; alto = cara de
//       arriba del cojín. Inclinada: { inclinada: 30, bisagra: z, asiento: 0.42, respaldo: 0.85 }
//       (el respaldo sube hacia -Z; negativo = declinada).
//   { tipo: 'barra', en: 'manos' | 'pelvis' | 'torax' | ..., pos, largo: 1.9, discos: [0.225] }
//       'manos': entre los dos puños (también sirve sobre la espalda si las manos van en el
//       marco 'torax'). Con un marco: centro en `pos` de ese marco y eje en su X. El largo
//       dibujado es 1,9 m (más corto que una barra olímpica de 2,2) para que la figura se vea
//       más grande; el mango entre los collarines sigue en 1,31 m.
//   { tipo: 'mancuernas', mano: 'ambas' | 'izq' | 'der' }   el mango sigue al marco de la mano
//       (el `giro` del brazo decide si va en martillo o cruzado).
//   { tipo: 'kettlebell', mano: 'ambas' | 'izq' | 'der', cuelga: false }  la bola sigue al
//       antebrazo; con cuelga: true cuelga hacia abajo.
//   { tipo: 'polea', anclaje: [x, y, z], mano: 'ambas' | 'izq' | 'der', manilla: 'simple' |
//       'barra' | 'cuerda' }   torre, roldana, cable hasta la mano y manilla.
//   { tipo: 'bloque', pos: [x, y, z], tam: [ancho, alto, fondo], giro: [cabeceo, giro,
//       alabeo], color: 'tapiz' | 'estructura' | 'fierro' | 'disco' | 'cuerpo', radio: 0.02,
//       sigue: 'pies' | 'manos' | marco }
//       piezas de máquina; pos es el centro y tam va en X, Y, Z del bloque. Los colores son los
//       materiales del motor: 'tapiz' (cojines), 'estructura' (fierro pintado, más oscuro que la
//       figura), 'fierro' (barras y manillas), 'disco' y 'cuerpo' (el gris de la figura, por si
//       un bloque tiene que leerse como parte del cuerpo; para manos apoyadas usa `muneca`).
//       radio es el redondeo de las aristas. giro usa la
//       convención de la pelvis: con cabeceo +, la cara de arriba (eje Y) se inclina hacia +Z.
//       Un respaldo reclinado como el tronco: tam [0.5, 0.7, 0.08] y el mismo cabeceo de la
//       pelvis (por ejemplo -50). Con sigue, pos y giro son relativos a eso; con 'pies' el
//       origen es el centro de las plantas y Y sale de la planta (pos [0, -grosor/2, 0] la
//       deja justo debajo): así se hace la plataforma de una prensa. Los bloques fijos entran
//       en la revisión de choques; los que siguen algo, no.
//   { tipo: 'cajon', pos: [x, z], alto: 0.5, ancho: 0.6, fondo: 0.45 }
//   { tipo: 'dominadas', alto: 2.25, z: 0, ancho: 1.3 }      barra fija con dos parantes.
//   { tipo: 'paralelas', alto: 1.15, separacion: 0.52, largo: 0.9, z: 0 }
//   La barra (en las manos), la barra fija y las paralelas entran en la revisión: avisa si
//   atraviesan la cabeza, el tronco o las piernas (sin contar 9 cm alrededor de los puños).
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { poseEn, revisar as revisarEsqueleto, V, M3 } from './esqueleto.js';

export const VISTAS = { frente: [0, 0.16, 1], lado: [1, 0.16, 0.03], tres: [0.7, 0.24, 0.72] };
export const PARTES = ['cuadriceps', 'isquios', 'gemelos', 'gluteos', 'abdomen', 'lumbares', 'pecho',
  'dorsales', 'trapecio', 'hombros', 'biceps', 'triceps', 'antebrazos'];
const GRUPOS = { muslos: ['cuadriceps', 'isquios'], brazos: ['biceps', 'triceps'],
  espalda: ['dorsales', 'trapecio'], core: ['abdomen', 'lumbares'] };
const AMBAR = '#F5B83D';

// ── Colores ──────────────────────────────────────────────────────────────────
export function colores(el) {
  const css = getComputedStyle(el);
  const v = (n, resp) => css.getPropertyValue(n).trim() || resp;
  const tema = el.dataset.tema || el.closest('[data-tema]')?.dataset.tema;
  return {
    oscuro: tema !== 'clara',
    fondo: v('--sup', '#1A1D20'), suelo: v('--sup-alta', '#24282C'), texto: v('--texto', '#F2F3F4'),
    texto2: v('--texto-2', '#A0A6AD'), borde: v('--borde', '#767D85'), ambar: v('--hecho-fondo', AMBAR),
  };
}
// Cuánto ámbar llevan los músculos que ayudan (el resto es el gris de la figura).
export const AYUDA = 0.35;

function materiales(col) {
  const c = (x) => new THREE.Color(x);
  const mezcla = (a, b, k) => c(a).lerp(c(b), k);
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
  const o = col.oscuro;
  const gris = o ? c(col.texto2) : mezcla(col.texto2, '#FFFFFF', 0.3);
  return {
    cuerpo: std(gris),
    trabaja: std(c(AMBAR), { roughness: 0.7 }),
    ayuda: std(gris.clone().lerp(c(AMBAR), AYUDA)),
    fierro: std(mezcla(col.texto, col.fondo, o ? 0.14 : 0.06), { roughness: 0.45, metalness: 0.25 }),
    disco: std(o ? mezcla(col.borde, col.fondo, 0.42) : c(col.texto2), { roughness: 0.9 }),
    tapiz: std(o ? mezcla(col.suelo, col.texto, 0.13) : mezcla(col.texto, col.fondo, 0.2), { roughness: 0.95 }),
    // Fierro pintado de las máquinas: siempre más oscuro que la figura, para que el cuerpo resalte.
    estructura: std(o ? mezcla(col.borde, col.fondo, 0.45) : mezcla(col.borde, col.texto, 0.25), { roughness: 0.6, metalness: 0.15 }),
    cable: std(o ? mezcla(col.texto, col.fondo, 0.3) : c(col.texto), { roughness: 0.5 }),
    suelo: new THREE.MeshBasicMaterial({ color: c(col.suelo) }),
    // Colchoneta: en modo gimnasio un poco más clara que el suelo; en clara, la superficie alta
    // del tema (--sup-alta) con un 22 % del borde, para que se lea sobre el suelo y sobre el
    // blanco. Sin luz, para que no se queme a blanco.
    colchoneta: o ? std(mezcla(col.suelo, col.texto, 0.13), { roughness: 0.95 }) : new THREE.MeshBasicMaterial({ color: mezcla(col.suelo, col.borde, 0.22) }),
  };
}

// ── Ayudas de matrices ───────────────────────────────────────────────────────
const _m = new THREE.Matrix4(), _s = new THREE.Matrix4();
const vec = (a) => new THREE.Vector3(a[0], a[1], a[2]);
// Matriz de un marco del esqueleto ({ o, m }) en three.js.
function matrizDe(o, m, dest = new THREE.Matrix4()) {
  return dest.set(m[0], m[1], m[2], o[0], m[3], m[4], m[5], o[1], m[6], m[7], m[8], o[2], 0, 0, 0, 1);
}
function escalar(dest, sx, sy, sz) { return dest.multiply(_s.makeScale(sx, sy, sz)); }
// Marco con X dado y Y lo más cerca posible de `arriba`.
function marcoX(x, arriba = [0, 1, 0]) {
  const X = V.unidad(x, [1, 0, 0]);
  let Y = V.perp(arriba, X);
  Y = V.largo(Y) > 1e-4 ? V.unidad(Y) : V.unidad(V.perp([0, 0, 1], X));
  return M3.deEjes(X, Y, V.cruz(X, Y));
}
const rotacionPYR = ([cabeceo = 0, giro = 0, alabeo = 0] = []) =>
  M3.mm(M3.mm(M3.rotY(giro), M3.rotX(cabeceo)), M3.rotZ(-alabeo));

// ── La figura ────────────────────────────────────────────────────────────────
// L se reemplaza por Izq y Der. `lados: true` duplica una pieza del tronco reflejando su x.
const PIEZAS = [
  // Pelvis, abdomen y tórax
  { tipo: 'elip', marco: 'pelvis', c: [0, -0.015, 0], r: [0.165, 0.11, 0.115], tronco: true },
  { tipo: 'elip', marco: 'pelvis', c: [0.074, -0.07, -0.058], r: [0.086, 0.095, 0.082], parte: 'gluteos', lados: true },
  { tipo: 'hueso', a: 'pelvis', b: 'lumbar', marco: 'columna1', r: 0.1, ancho: 1.42, tronco: true },
  { tipo: 'hueso', a: 'lumbar', b: 'torax', marco: 'abdomen', r: 0.1, ancho: 1.45, tronco: true },
  { tipo: 'elip', marco: 'abdomen', c: [0, 0.03, 0.07], r: [0.095, 0.135, 0.042], parte: 'abdomen' },
  { tipo: 'elip', marco: 'abdomen', c: [0.045, 0, -0.07], r: [0.045, 0.12, 0.036], parte: 'lumbares', lados: true },
  { tipo: 'elip', marco: 'torax', c: [0, 0.07, 0], r: [0.165, 0.155, 0.115], tronco: true },
  { tipo: 'elip', marco: 'torax', c: [0.072, 0.08, 0.088], r: [0.092, 0.078, 0.032], parte: 'pecho', lados: true },
  { tipo: 'elip', marco: 'torax', c: [0.088, 0.03, -0.066], r: [0.07, 0.13, 0.05], parte: 'dorsales', lados: true },
  { tipo: 'elip', marco: 'torax', c: [0, 0.163, -0.045], r: [0.13, 0.05, 0.062], parte: 'trapecio' },
  { tipo: 'hueso', a: 'hombroIzq', b: 'hombroDer', marco: 'torax', r: 0.055, tronco: true },
  { tipo: 'hueso', a: 'cuello', b: 'nuca', marco: 'cuello', r: 0.05 },
  { tipo: 'elip', marco: 'cabeza', c: [0, 0, 0], r: [0.08, 0.105, 0.096], tronco: true },
  { tipo: 'elip', marco: 'cabeza', c: [0, -0.052, 0.042], r: [0.058, 0.05, 0.06] },
  // Brazos. El tríceps es la mitad de atrás del brazo y un poco más ancho que el bíceps, para
  // que se lea como músculo también desde adelante (antes era una línea fina en el borde).
  { tipo: 'bola', p: 'hombroL', marco: 'torax', c: [0.012, 0.008, 0], r: 0.058, parte: 'hombros' },
  { tipo: 'hueso', a: 'hombroL', b: 'codoL', frente: 'brazoL', desp: 0.016, r: 0.036, recorte: [0.07, 0.035], parte: 'biceps' },
  { tipo: 'hueso', a: 'hombroL', b: 'codoL', frente: 'brazoL', desp: -0.014, r: 0.042, ancho: 1.16, recorte: [0.04, 0.02], parte: 'triceps' },
  { tipo: 'bola', p: 'codoL', r: 0.037 },
  { tipo: 'hueso', a: 'codoL', b: 'munecaL', frente: 'antebrazoL', r: 0.033, parte: 'antebrazos' },
  { tipo: 'hueso', a: 'codoL', b: 'munecaL', frente: 'antebrazoL', desp: 0.006, r: 0.04, recorte: [0.02, 0.13], parte: 'antebrazos' },
  // Mano: puño con la muñeca recta (sin `muneca`)...
  { tipo: 'hueso', a: 'munecaL', b: 'manoL', frente: 'antebrazoL', r: 0.029, mano: true, forma: 'puno' },
  { tipo: 'elip', marco: 'manoL', c: [0, 0, 0], r: [0.047, 0.045, 0.038], mano: true, forma: 'puno' },
  // ...abierta (marco de la palma: Y hacia los dedos, Z hacia donde mira la palma; el origen es
  // la base de la palma, en su línea media)...
  { tipo: 'caja', marco: 'manoL', c: [0, 0.04, 0], tam: [0.084, 0.1, 0.026], radio: 0.012, mano: true, forma: 'abierta' },
  { tipo: 'caja', marco: 'manoL', c: [0, 0.122, -0.003], tam: [0.076, 0.085, 0.02], radio: 0.009, mano: true, forma: 'abierta' },
  { tipo: 'caja', marco: 'manoL', c: [0.05, 0.035, -0.002], tam: [0.024, 0.062, 0.022], radio: 0.01, mano: true, forma: 'abierta', pulgar: true },
  // ...o cerrada con la muñeca doblada: el mango queda en la base de la palma.
  { tipo: 'elip', marco: 'manoL', c: [0, 0.035, 0.012], r: [0.047, 0.05, 0.038], mano: true, forma: 'cerrada' },
  // Piernas
  { tipo: 'hueso', a: 'caderaL', b: 'rodillaL', frente: 'musloL', desp: 0.018, r: 0.07, recorte: [0.02, 0.06], parte: 'cuadriceps' },
  { tipo: 'hueso', a: 'caderaL', b: 'rodillaL', frente: 'musloL', desp: -0.02, r: 0.066, recorte: [0.05, 0.07], parte: 'isquios' },
  { tipo: 'bola', p: 'rodillaL', r: 0.056 },
  { tipo: 'hueso', a: 'rodillaL', b: 'tobilloL', frente: 'piernaL', desp: 0.006, r: 0.042 },
  { tipo: 'hueso', a: 'rodillaL', b: 'tobilloL', frente: 'piernaL', desp: -0.022, r: 0.05, recorte: [0.05, 0.19], parte: 'gemelos' },
  { tipo: 'bola', p: 'tobilloL', r: 0.036 },
  { tipo: 'caja', marco: 'pieL', c: [0, -0.045, 0.07], tam: [0.085, 0.06, 0.255], radio: 0.025, pie: true },
];

function expandirPiezas() {
  const r = [];
  for (const p of PIEZAS) {
    const tieneL = JSON.stringify(p).includes('L"');
    if (p.lados) {
      r.push({ ...p, lado: 1 }, { ...p, lado: -1, c: [-p.c[0], p.c[1], p.c[2]] });
    } else if (tieneL) {
      for (const [L, s] of [['Izq', 1], ['Der', -1]]) {
        const q = {};
        for (const [k, v] of Object.entries(p)) q[k] = typeof v === 'string' ? v.replace(/L$/, L) : v;
        if (p.c && p.marco && !p.marco.endsWith('L')) q.c = [s * p.c[0], p.c[1], p.c[2]];
        // En el marco de la palma (X = Y × Z) el pulgar de la mano izquierda queda en -X y el de
        // la derecha en +X.
        if (p.pulgar) q.c = [-s * p.c[0], p.c[1], p.c[2]];
        q.lado = s;
        q.L = L;
        r.push(q);
      }
    } else r.push(p);
  }
  return r;
}

function partesPintadas(lista = []) {
  const set = new Set();
  for (const n of lista) {
    if (GRUPOS[n]) GRUPOS[n].forEach((x) => set.add(x));
    else if (PARTES.includes(n)) set.add(n);
    else console.warn(`[motor 3D] Parte desconocida para pintar: «${n}».`);
  }
  return set;
}

const ESFERA = new THREE.SphereGeometry(1, 28, 18);
// Nombre legible de una pieza para los avisos.
const BASE_PIEZA = { pelvis: 'pelvis', columna1: 'abdomen', abdomen: 'abdomen', lumbar: 'abdomen', torax: 'tórax',
  cuello: 'cuello', cabeza: 'cabeza', hombro: 'hombros', muneca: 'mano', mano: 'mano', rodilla: 'pierna', codo: 'codo',
  tobillo: 'tobillo', pie: 'pie' };
function nombrePieza(d) {
  if (d.parte) return d.parte;
  const k = d.tipo === 'elip' || d.tipo === 'caja' ? d.marco : d.a || d.p || d.marco;
  const lado = (k.match(/(Izq|Der)$/) || [])[1];
  const base = k.replace(/(Izq|Der)$/, '');
  return (BASE_PIEZA[base] || base) + (lado ? (lado === 'Izq' ? ' izq.' : ' der.') : '');
}

function crearFigura(ej, mats) {
  const grupo = new THREE.Group();
  const pintadas = partesPintadas(ej.pintar);
  const ayudan = partesPintadas(ej.pintarAyuda);
  const piezas = expandirPiezas().map((def) => {
    const mat = !def.parte ? mats.cuerpo : pintadas.has(def.parte) ? mats.trabaja : ayudan.has(def.parte) ? mats.ayuda : mats.cuerpo;
    const malla = new THREE.Mesh(def.tipo === 'elip' || def.tipo === 'bola' ? ESFERA : undefined, mat);
    malla.matrixAutoUpdate = false;
    malla.userData = { def };
    grupo.add(malla);
    return { def, malla, largo0: 0 };
  });

  const m4 = new THREE.Matrix4();
  function actualizar(s) {
    for (const pz of piezas) {
      const { def, malla } = pz;
      if (def.forma) {
        malla.visible = ((s.manos && s.manos[def.L]) || 'puno') === def.forma;
        if (!malla.visible) continue;
      }
      if (def.tipo === 'elip') {
        const mk = s.marcos[def.marco];
        matrizDe(V.suma(mk.o, M3.mv(mk.m, def.c)), mk.m, malla.matrix);
        escalar(malla.matrix, ...def.r);
      } else if (def.tipo === 'bola') {
        let p = s.puntos[def.p];
        if (def.c && def.marco) p = V.suma(p, M3.mv(s.marcos[def.marco].m, def.c));
        malla.matrix.makeScale(def.r, def.r, def.r).setPosition(p[0], p[1], p[2]);
      } else if (def.tipo === 'caja') {
        const mk = s.marcos[def.marco];
        if (!malla.geometry.parameters?.width) {
          malla.geometry = new RoundedBoxGeometry(def.tam[0], def.tam[1], def.tam[2], 3, def.radio || 0.02);
        }
        matrizDe(V.suma(mk.o, M3.mv(mk.m, def.c)), mk.m, malla.matrix);
      } else {
        const a = s.puntos[def.a], b = s.puntos[def.b];
        const d = V.resta(b, a), L = V.largo(d), y = V.unidad(d);
        const z0 = def.frente ? M3.eje(s.marcos[def.frente].m, 2) : M3.eje(s.marcos[def.marco].m, 2);
        const R = M3.marcoYZ(y, z0);
        const z = M3.eje(R, 2);
        const [r0, r1] = def.recorte || [0, 0];
        const largo = Math.max(0.001, L - r0 - r1);
        let c = V.suma(a, V.por(y, r0 + largo / 2));
        if (def.desp) c = V.suma(c, V.por(z, def.desp));
        if (!pz.largo0) { pz.largo0 = largo; malla.geometry = new THREE.CapsuleGeometry(def.r, largo, 6, 18); }
        matrizDe(c, R, malla.matrix);
        escalar(malla.matrix, def.ancho || 1, largo / pz.largo0, def.fondo || 1);
      }
    }
  }
  return { grupo, piezas, actualizar };
}

// Profundidad (m) a la que un punto del mundo queda dentro de una pieza; negativo = afuera.
const _inv = new THREE.Matrix4(), _p = new THREE.Vector3();
function dentroDe(pz, p) {
  const { def, malla } = pz;
  _inv.copy(malla.matrix).invert();
  _p.set(p[0], p[1], p[2]).applyMatrix4(_inv);
  if (def.tipo === 'elip' || def.tipo === 'bola') {
    const rmin = def.tipo === 'bola' ? def.r : Math.min(...def.r);
    return (1 - _p.length()) * rmin;
  }
  if (def.tipo === 'caja') {
    return Math.min(def.tam[0] / 2 - Math.abs(_p.x), def.tam[1] / 2 - Math.abs(_p.y), def.tam[2] / 2 - Math.abs(_p.z));
  }
  const h = pz.largo0 / 2;
  const yy = Math.max(-h, Math.min(h, _p.y));
  return def.r - Math.hypot(_p.x, _p.y - yy, _p.z);
}

// ── Equipos ──────────────────────────────────────────────────────────────────
function caja(tam, mat, radio = 0.015) {
  return new THREE.Mesh(new RoundedBoxGeometry(tam[0], tam[1], tam[2], 2, Math.min(radio, ...tam.map((x) => x / 2 - 1e-3))), mat);
}
function cilindroX(r, largo, mat, x = 0, seg = 24) {
  const g = new THREE.CylinderGeometry(r, r, largo, seg); g.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.position.x = x; return m;
}
// Cilindro de alto 1 que se estira entre dos puntos (cables, cuerdas).
function cuerda(r, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), mat);
  m.matrixAutoUpdate = false;
  m.entre = (a, b) => {
    const d = V.resta(b, a), L = Math.max(1e-4, V.largo(d));
    matrizDe(V.mezcla(a, b, 0.5), M3.marcoYZ(d, [0, 0, 1]), m.matrix);
    escalar(m.matrix, 1, L, 1);
  };
  return m;
}
// Caja orientada para revisar choques: centro, ejes y medias medidas.
function obb(centro, R, tam) { return { c: centro, ejes: [M3.eje(R, 0), M3.eje(R, 1), M3.eje(R, 2)], h: tam.map((x) => x / 2) }; }
function dentroDeCaja(b, p) {
  const d = V.resta(p, b.c);
  return Math.min(...b.ejes.map((e, i) => b.h[i] - Math.abs(V.punto(d, e))));
}
function fijo(obj) { obj.matrixAutoUpdate = false; return obj; }
const manosDe = (cfg) => (cfg.mano === 'izq' ? ['Izq'] : cfg.mano === 'der' ? ['Der'] : ['Izq', 'Der']);

const EQUIPOS = {
  suelo(cfg, mats) {
    const g = new THREE.Group(); const cajas = [];
    if (cfg.colchoneta) {
      const [x, z] = cfg.colchoneta.pos || [0, 0], [an, la] = cfg.colchoneta.tam || [0.6, 1.8];
      const m = caja([an, 0.012, la], mats.colchoneta, 0.005); m.position.set(x, 0.006, z); g.add(m);
    }
    return { obj: g, cajas: () => cajas };
  },

  banca(cfg, mats) {
    const g = new THREE.Group(); const cajas = [];
    const alto = cfg.alto ?? 0.43, ancho = cfg.ancho ?? 0.28, grosor = 0.08;
    const pata = (z, h) => {
      const p = caja([0.05, h, 0.05], mats.estructura, 0.01); p.position.set(0, h / 2, z); g.add(p);
      const b = caja([0.42, 0.035, 0.06], mats.estructura, 0.01); b.position.set(0, 0.0175, z); g.add(b);
    };
    const cojin = (centro, R, largo) => {
      const m = caja([ancho, grosor, largo], mats.tapiz, 0.025);
      m.matrixAutoUpdate = false; matrizDe(centro, R, m.matrix); g.add(m);
      cajas.push(obb(centro, R, [ancho, grosor, largo]));
    };
    if (!cfg.inclinada) {
      const z = cfg.z ?? 0, largo = cfg.largo ?? 1.2;
      cojin([0, alto - grosor / 2, z], M3.IDENT, largo);
      const viga = caja([0.06, 0.05, largo - 0.2], mats.estructura, 0.01); viga.position.set(0, alto - grosor - 0.025, z); g.add(viga);
      pata(z - largo / 2 + 0.12, alto - grosor); pata(z + largo / 2 - 0.12, alto - grosor);
    } else {
      const a = cfg.inclinada, zb = cfg.bisagra ?? 0, asiento = cfg.asiento ?? 0.42, respaldo = cfg.respaldo ?? 0.85;
      cojin([0, alto - grosor / 2, zb + asiento / 2], M3.IDENT, asiento);
      const R = M3.rotX(a);
      const dir = [0, Math.sin(a * Math.PI / 180), -Math.cos(a * Math.PI / 180)];
      const normal = M3.eje(R, 1);
      const centro = V.suma(V.suma([0, alto, zb], V.por(dir, respaldo / 2 + 0.01)), V.por(normal, -grosor / 2));
      cojin(centro, R, respaldo);
      pata(zb + asiento - 0.08, alto - grosor);
      const fin = V.suma([0, alto - grosor, zb], V.por(dir, respaldo * 0.75));
      const base = [0, 0.03, Math.min(fin[2], zb - 0.3)];
      const puntal = cuerda(0.025, mats.estructura); puntal.entre(base, fin); g.add(puntal);
      const piso = caja([0.42, 0.035, 0.06], mats.estructura, 0.01); piso.position.set(0, 0.0175, base[2]); g.add(piso);
      const viga = cuerda(0.022, mats.estructura); viga.entre([0, 0.03, base[2]], [0, 0.03, zb + asiento - 0.08]); g.add(viga);
    }
    return { obj: g, cajas: () => cajas };
  },

  barra(cfg, mats) {
    const g = fijo(new THREE.Group());
    const media = Math.max(0.8, (cfg.largo ?? 1.9) / 2);
    g.add(cilindroX(0.014, 1.31, mats.fierro));
    // Los discos de cada lado, con un aro (solo el borde) que se ve cuando el disco va tenue.
    const tenue = mats.disco.clone();
    tenue.transparent = true; tenue.depthWrite = false; tenue.opacity = 0.25;
    const lados = {};
    for (const s of [-1, 1]) {
      g.add(cilindroX(0.035, 0.03, mats.fierro, s * 0.67));
      g.add(cilindroX(0.025, media - 0.685, mats.fierro, s * (0.685 + (media - 0.685) / 2)));
      let x = 0.69;
      const discos = [], aros = [];
      for (const r of cfg.discos || [0.225]) {
        const e = r > 0.19 ? 0.055 : 0.035;
        const d = cilindroX(r, e, mats.disco, s * (x + e / 2), 48); g.add(d); discos.push(d);
        // Banda de 6 mm en el canto del disco, del grosor del disco.
        const aro = new THREE.Mesh(new THREE.TorusGeometry(r - 0.006, 0.006, 6, 64), mats.disco);
        aro.rotation.y = Math.PI / 2; aro.scale.z = e / 0.012; aro.position.x = s * (x + e / 2); aro.visible = false;
        g.add(aro); aros.push(aro);
        x += e + 0.004;
      }
      g.add(cilindroX(0.032, 0.025, mats.fierro, s * (x + 0.0125)));
      lados[s] = { discos, aros };
    }
    let eje = null, centro = null, ejeX = null;
    return {
      obj: g,
      // Si la cámara mira a lo largo de la barra (vista de lado), el disco que queda frente a
      // ella pasa a 25 % con su aro, para que no tape el cuerpo.
      mirar(cam) {
        if (!centro) return;
        const hacia = V.unidad(V.resta(cam, centro));
        const a = V.punto(ejeX, hacia);
        const k = Math.min(1, Math.max(0, (Math.abs(a) - 0.8) / 0.13));
        const cerca = a >= 0 ? 1 : -1;
        tenue.opacity = 1 - 0.75 * k;
        for (const s of [-1, 1]) {
          const atenuar = s === cerca && k > 0;
          lados[s].discos.forEach((d) => { d.material = atenuar ? tenue : mats.disco; });
          lados[s].aros.forEach((aro) => { aro.visible = atenuar && k > 0.3; });
        }
      },
      actualizar(s) {
        let c, ex;
        if (!cfg.en || cfg.en === 'manos') {
          const a = s.puntos.manoIzq, b = s.puntos.manoDer;
          c = V.mezcla(a, b, 0.5); ex = V.resta(a, b);
        } else {
          const mk = s.marcos[cfg.en];
          c = V.suma(mk.o, M3.mv(mk.m, cfg.pos || [0, 0, 0])); ex = M3.eje(mk.m, 0);
        }
        const R = marcoX(ex);
        matrizDe(c, R, g.matrix);
        const x = M3.eje(R, 0);
        centro = c; ejeX = x;
        eje = { a: V.suma(c, V.por(x, -0.66)), b: V.suma(c, V.por(x, 0.66)), r: 0.014 };
      },
      varillas: () => (eje ? [eje] : []),
      destruir() { tenue.dispose(); },
    };
  },

  mancuernas(cfg, mats) {
    const g = new THREE.Group();
    const lados = manosDe(cfg).map((L) => {
      const d = fijo(new THREE.Group());
      d.add(cilindroX(0.016, 0.14, mats.fierro));
      for (const s of [-1, 1]) {
        d.add(cilindroX(0.062, 0.055, mats.disco, s * 0.098, 36));
        d.add(cilindroX(0.03, 0.012, mats.fierro, s * 0.064));
      }
      g.add(d); return { L, d };
    });
    return {
      obj: g,
      actualizar(s) { for (const { L, d } of lados) matrizDe(s.puntos['mano' + L], s.marcos['mano' + L].m, d.matrix); },
    };
  },

  kettlebell(cfg, mats) {
    const g = new THREE.Group();
    const hacer = () => {
      const k = fijo(new THREE.Group());
      // El asa pasa por el centro del puño; la bola queda debajo.
      const bola = new THREE.Mesh(ESFERA, mats.disco); bola.scale.setScalar(0.105); bola.position.y = -0.165; k.add(bola);
      const asa = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.012, 10, 32, Math.PI), mats.disco);
      asa.position.y = -0.062; k.add(asa);
      g.add(k); return k;
    };
    const unidades = cfg.mano === 'izq' || cfg.mano === 'der' ? [{ L: manosDe(cfg)[0], k: hacer() }] : [{ L: null, k: hacer() }];
    return {
      obj: g,
      actualizar(s) {
        for (const { L, k } of unidades) {
          let c, x, abajo;
          if (L) { const mk = s.marcos['mano' + L]; c = s.puntos['mano' + L]; x = M3.eje(mk.m, 0); abajo = M3.eje(mk.m, 1); } else {
            c = V.mezcla(s.puntos.manoIzq, s.puntos.manoDer, 0.5);
            x = V.resta(s.puntos.manoIzq, s.puntos.manoDer);
            abajo = V.suma(M3.eje(s.marcos.manoIzq.m, 1), M3.eje(s.marcos.manoDer.m, 1));
          }
          if (cfg.cuelga) abajo = [0, -1, 0];
          const R = marcoX(x, V.por(abajo, -1));
          matrizDe(c, R, k.matrix);
        }
      },
    };
  },

  polea(cfg, mats) {
    const g = new THREE.Group();
    const anc = cfg.anclaje || [0, 2, -0.6];
    const torre = caja([0.14, 1, 0.14], mats.estructura, 0.01); g.add(torre);
    const rueda = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 28), mats.fierro); g.add(rueda);
    const cable = cuerda(0.004, mats.cable); g.add(cable);
    const manos = manosDe(cfg);
    const manilla = cfg.manilla || 'simple';
    const asas = manos.map(() => { const m = cilindroX(0.014, 0.13, mats.fierro); m.matrixAutoUpdate = false; g.add(m); return m; });
    const barra = cilindroX(0.014, 1, mats.fierro); barra.matrixAutoUpdate = false; if (manilla === 'barra') g.add(barra);
    const sogas = manos.map(() => { const c = cuerda(0.011, mats.disco); if (manilla === 'cuerda') g.add(c); return c; });
    let ubicada = false;
    return {
      obj: g,
      actualizar(s) {
        const pm = manos.map((L) => s.puntos['mano' + L]);
        const medio = pm.length === 2 ? V.mezcla(pm[0], pm[1], 0.5) : pm[0];
        if (!ubicada) {
          // La torre queda detrás del anclaje, mirando hacia donde está la persona.
          let atras = V.resta(anc, medio); atras[1] = 0;
          atras = V.unidad(atras, [0, 0, -1]);
          const alto = Math.max(2.1, anc[1] + 0.15);
          torre.scale.y = alto; torre.position.set(anc[0] + atras[0] * 0.1, alto / 2, anc[2] + atras[2] * 0.1);
          rueda.position.set(anc[0], anc[1], anc[2]);
          rueda.rotation.set(0, Math.atan2(atras[0], atras[2]), Math.PI / 2);
          ubicada = true;
        }
        let fin = medio;
        if (manilla === 'cuerda' && pm.length === 2) {
          fin = V.suma(medio, V.por(V.unidad(V.resta(anc, medio)), 0.12));
          sogas.forEach((c, i) => c.entre(fin, pm[i]));
        } else if (manilla === 'barra' && pm.length === 2) {
          const ex = V.resta(pm[0], pm[1]);
          matrizDe(medio, marcoX(ex), barra.matrix); escalar(barra.matrix, V.largo(ex) + 0.3, 1, 1);
        }
        if (manilla === 'simple' || pm.length === 1) {
          manos.forEach((L, i) => matrizDe(pm[i], s.marcos['mano' + L].m, asas[i].matrix));
        } else asas.forEach((a) => { a.visible = false; });
        cable.entre(anc, fin);
      },
    };
  },

  bloque(cfg, mats) {
    const tam = cfg.tam || [0.4, 0.1, 0.4];
    const m = fijo(caja(tam, mats[cfg.color || 'tapiz'], cfg.radio ?? 0.02));
    let caj = null;
    const local = rotacionPYR(cfg.giro);
    const ubicar = (o, R) => {
      const Rf = M3.mm(R, local), c = V.suma(o, M3.mv(R, cfg.pos || [0, 0, 0]));
      matrizDe(c, Rf, m.matrix); caj = obb(c, Rf, tam);
    };
    if (!cfg.sigue) ubicar([0, 0, 0], M3.IDENT);
    return {
      obj: m,
      actualizar(s) {
        if (!cfg.sigue) return;
        if (cfg.sigue === 'pies') {
          const planta = (L) => V.suma(s.puntos['tobillo' + L], M3.mv(s.marcos['pie' + L].m, [0, -0.075, 0.07]));
          const a = planta('Izq'), b = planta('Der');
          const y = V.unidad(V.suma(M3.eje(s.marcos.pieIzq.m, 1), M3.eje(s.marcos.pieDer.m, 1)));
          const R = M3.marcoYZ(y, V.cruz(V.resta(a, b), y));
          ubicar(V.mezcla(a, b, 0.5), R);
        } else if (cfg.sigue === 'manos') {
          const a = s.puntos.manoIzq, b = s.puntos.manoDer;
          ubicar(V.mezcla(a, b, 0.5), marcoX(V.resta(a, b)));
        } else {
          const mk = s.marcos[cfg.sigue];
          if (mk) ubicar(mk.o, mk.m);
        }
      },
      cajas: () => (caj && !cfg.sigue ? [caj] : []),
    };
  },

  cajon(cfg, mats) {
    const [x, z] = cfg.pos || [0, 0.5];
    const tam = [cfg.ancho ?? 0.6, cfg.alto ?? 0.5, cfg.fondo ?? 0.45];
    const m = caja(tam, mats.tapiz, 0.02); m.position.set(x, tam[1] / 2, z);
    return { obj: m, cajas: () => [obb([x, tam[1] / 2, z], M3.IDENT, tam)] };
  },

  dominadas(cfg, mats) {
    const g = new THREE.Group();
    const alto = cfg.alto ?? 2.25, z = cfg.z ?? 0, ancho = cfg.ancho ?? 1.3;
    const b = cilindroX(0.016, ancho, mats.fierro); b.position.set(0, alto, z); g.add(b);
    for (const s of [-1, 1]) {
      const p = caja([0.06, alto + 0.08, 0.06], mats.estructura, 0.01);
      p.position.set(s * (ancho / 2 + 0.03), (alto + 0.08) / 2, z); g.add(p);
      const pie = caja([0.07, 0.035, 0.42], mats.estructura, 0.01); pie.position.set(s * (ancho / 2 + 0.03), 0.0175, z); g.add(pie);
    }
    const varilla = { a: [-ancho / 2, alto, z], b: [ancho / 2, alto, z], r: 0.016 };
    return { obj: g, varillas: () => [varilla] };
  },

  paralelas(cfg, mats) {
    const g = new THREE.Group();
    const alto = cfg.alto ?? 1.15, sep = cfg.separacion ?? 0.52, largo = cfg.largo ?? 0.9, z = cfg.z ?? 0;
    const varillas = [];
    for (const s of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, largo, 18), mats.fierro);
      b.rotation.x = Math.PI / 2; b.position.set(s * sep / 2, alto, z); g.add(b);
      varillas.push({ a: [s * sep / 2, alto, z - largo / 2], b: [s * sep / 2, alto, z + largo / 2], r: 0.022 });
      for (const k of [-1, 1]) {
        const p = caja([0.05, alto, 0.05], mats.estructura, 0.01);
        p.position.set(s * (sep / 2 + 0.03), alto / 2, z + k * (largo / 2 - 0.08)); g.add(p);
      }
    }
    return { obj: g, varillas: () => varillas };
  },
};

// ── Una escena ───────────────────────────────────────────────────────────────
export function crearEscena(ej, col) {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(col.fondo);
  const o = col.oscuro;
  escena.add(new THREE.HemisphereLight(0xffffff, o ? 0x2a2e33 : 0xc8ccd0, o ? 1.6 : 1.9));
  const luz = new THREE.DirectionalLight(0xffffff, o ? 1.8 : 1.4); luz.position.set(2, 4, 3); escena.add(luz);
  const luz2 = new THREE.DirectionalLight(0xffffff, o ? 0.5 : 0.4); luz2.position.set(-3, 2, -2); escena.add(luz2);

  const mats = materiales(col);
  const figura = crearFigura(ej, mats);
  escena.add(figura.grupo);
  const equipos = [];
  for (const cfg of ej.equipos || []) {
    const f = EQUIPOS[cfg.tipo];
    if (!f) { console.warn(`[motor 3D] Equipo desconocido: «${cfg.tipo}».`); continue; }
    const e = f(cfg, mats);
    e.cfg = cfg;
    escena.add(e.obj); equipos.push(e);
  }

  let ultima = null;
  function posar(t) {
    const s = poseEn(ej, t);
    figura.actualizar(s);
    for (const e of equipos) if (e.actualizar) e.actualizar(s);
    ultima = s;
    return s;
  }

  // Nube de puntos de todo el ciclo (figura y equipos) para encuadrar la cámara.
  const nube = [];
  const v = new THREE.Vector3();
  const muestras = 24;
  for (let k = 0; k < muestras; k++) {
    posar(k / muestras);
    escena.updateMatrixWorld(true);
    escena.traverse((m) => {
      if (!m.isMesh || !m.visible || !m.geometry.attributes.position) return;
      const pos = m.geometry.attributes.position;
      const paso = Math.max(1, Math.floor(pos.count / 40));
      for (let i = 0; i < pos.count; i += paso) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        nube.push(v.x, v.y, v.z);
      }
    });
  }
  // El suelo: un disco bajo todo lo que se mueve.
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < nube.length; i += 3) {
    x0 = Math.min(x0, nube[i]); x1 = Math.max(x1, nube[i]); z0 = Math.min(z0, nube[i + 2]); z1 = Math.max(z1, nube[i + 2]);
  }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const radioSuelo = Math.max(0.9, Math.hypot(x1 - x0, z1 - z0) / 2 * 0.92);
  const suelo = new THREE.Mesh(new THREE.CircleGeometry(radioSuelo, 72), mats.suelo);
  suelo.rotation.x = -Math.PI / 2; suelo.position.set(cx, 0, cz); escena.add(suelo);
  nube.push(cx - radioSuelo * 0.6, 0, cz, cx + radioSuelo * 0.6, 0, cz, cx, 0, cz - radioSuelo * 0.6, cx, 0, cz + radioSuelo * 0.6);

  // Encaja toda la nube en la cámara mirando desde `dir` (del centro hacia la cámara), dejando
  // libre una fracción del cuadro en cada borde (margenes). Es exacto en perspectiva: cada punto
  // queda dentro del cuadro útil, y el centro vertical se corre para que los márgenes de arriba
  // y abajo puedan ser distintos (por ejemplo, más abajo para no pisar un rótulo).
  function encuadrar(camara, dir, aspecto = camara.aspect, margenes = {}) {
    const ml = margenes.lados ?? 0.08, mt = margenes.arriba ?? 0.08, mb = margenes.abajo ?? 0.08;
    const d = vec(dir).normalize();
    const der = new THREE.Vector3(0, 1, 0).cross(d).normalize();
    if (der.lengthSq() < 1e-6) der.set(1, 0, 0);
    const arr = new THREE.Vector3().crossVectors(d, der).normalize();
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity, c0 = Infinity, c1 = -Infinity;
    const P = [];
    for (let i = 0; i < nube.length; i += 3) {
      v.set(nube[i], nube[i + 1], nube[i + 2]);
      const a = v.dot(der), b = v.dot(arr), c = v.dot(d);
      P.push(a, b, c);
      a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); c0 = Math.min(c0, c); c1 = Math.max(c1, c);
    }
    const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2, cc = (c0 + c1) / 2;
    const tv = Math.tan((camara.fov * Math.PI) / 360), th = tv * aspecto;
    // Mitades útiles del cuadro (en unidades de tan): horizontal, hacia arriba y hacia abajo.
    const kh = th * (1 - 2 * ml), kt = tv * (1 - 2 * mt), kb = tv * (1 - 2 * mb);
    // Un punto a (a', b') del centro y z hacia la cámara pide: dist ≥ |a'|/kh + z,
    // dist ≥ (b' - D)/kt + z y dist ≥ (D - b')/kb + z, con D el corrimiento vertical del centro.
    let H = 0, U = -Infinity, W = -Infinity;
    for (let i = 0; i < P.length; i += 3) {
      const z = P[i + 2] - cc, b = P[i + 1] - cb;
      H = Math.max(H, Math.abs(P[i] - ca) / kh + z);
      U = Math.max(U, b / kt + z);
      W = Math.max(W, z - b / kb);
    }
    const D = (U - W) / (1 / kt + 1 / kb);
    const dist = Math.max(H, U - D / kt, 0.5);
    const objetivo = der.clone().multiplyScalar(ca).add(arr.clone().multiplyScalar(cb + D)).add(d.clone().multiplyScalar(cc));
    return { objetivo, posicion: objetivo.clone().add(d.multiplyScalar(dist)) };
  }

  // Ajustes que dependen de dónde está la cámara (el disco cercano de la barra).
  function mirarDesde(pos) {
    const p = Array.isArray(pos) ? pos : [pos.x, pos.y, pos.z];
    for (const e of equipos) if (e.mirar) e.mirar(p);
  }

  // Avisos: los del esqueleto, más cuerpo contra equipos y barra contra cuerpo. Un mismo
  // aviso sale una vez, con el peor valor y el instante en que aparece por primera vez.
  function revisar(n = 48) {
    const avisos = [];
    const vistos = new Map();
    const anota = (texto, t) => {
      const clave = texto.replace(/\d+/g, '#'), valor = Number((texto.match(/(\d+) (cm|°)/) || [])[1] || 0);
      const previo = vistos.get(clave);
      if (!previo) { const a = { t, texto, valor }; vistos.set(clave, a); avisos.push(a); } else if (valor > previo.valor) { previo.texto = texto; previo.valor = valor; }
    };
    revisarEsqueleto(ej, n).forEach((a) => anota(a.texto, a.t));
    const nombre = nombrePieza;
    const tronco = figura.piezas.filter((p) => p.def.tronco);
    const cuerpo = figura.piezas.filter((p) => !p.def.mano);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const s = posar(t);
      escena.updateMatrixWorld(true);
      const cajas = equipos.flatMap((e) => (e.cajas ? e.cajas() : []));
      if (cajas.length) {
        for (const pz of cuerpo) {
          if (pz.def.pie && equipos.some((e) => e.cfg.sigue === 'pies')) continue;
          const pos = pz.malla.geometry.attributes.position;
          const paso = Math.max(1, Math.floor(pos.count / 60));
          let peor = 0;
          for (let i = 0; i < pos.count; i += paso) {
            v.fromBufferAttribute(pos, i).applyMatrix4(pz.malla.matrix);
            for (const b of cajas) peor = Math.max(peor, dentroDeCaja(b, [v.x, v.y, v.z]));
          }
          if (peor > 0.015) anota(`El cuerpo atraviesa el equipo (${nombre(pz.def)}, ${Math.round(peor * 100)} cm).`, t);
        }
      }
      for (const e of equipos) {
        for (const eje of e.varillas ? e.varillas() : []) {
          for (let i = 0; i <= 20; i++) {
            const p = V.mezcla(eje.a, eje.b, i / 20);
            if (['manoIzq', 'manoDer'].some((m) => V.largo(V.resta(p, s.puntos[m])) < 0.09)) continue;
            for (const pz of cuerpo) {
              const d = dentroDe(pz, p) + eje.r;
              if (d > 0.012) { anota(`La barra atraviesa el cuerpo (${nombre(pz.def)}, ${Math.round(d * 100)} cm).`, t); break; }
            }
          }
        }
      }
      for (const L of ['Izq', 'Der']) {
        for (const n2 of ['mano', 'muneca', 'codo']) {
          const p = s.puntos[n2 + L];
          for (const pz of tronco) {
            const d = dentroDe(pz, p);
            if (d > 0.02) { anota(`El ${n2 === 'mano' ? 'puño' : n2 === 'muneca' ? 'antebrazo' : 'codo'} ${L === 'Izq' ? 'izquierdo' : 'derecho'} se mete en el tronco (${Math.round(d * 100)} cm).`, t); break; }
          }
        }
      }
    }
    return avisos.sort((a, b) => a.t - b.t).map(({ t, texto }) => ({ t, texto }));
  }

  function destruir() {
    escena.traverse((m) => { if (m.isMesh && m.geometry !== ESFERA) m.geometry.dispose(); });
    Object.values(mats).forEach((m) => m.dispose());
    equipos.forEach((e) => e.destruir && e.destruir());
  }

  return { escena, posar, encuadrar, mirarDesde, revisar, destruir, get pose() { return ultima; } };
}

// ── Un visor con lienzo propio ───────────────────────────────────────────────
export function crearVisor(caja, { tel, ejercicio, vista, amortiguar = true, alMover } = {}) {
  const ej = ejercicio;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  caja.prepend(renderer.domElement);
  const esc = crearEscena(ej, colores(tel || caja));
  const camara = new THREE.PerspectiveCamera(28, 1, 0.05, 80);
  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableZoom = false; controles.enablePan = false; controles.enableDamping = amortiguar;
  controles.minPolarAngle = 0.45; controles.maxPolarAngle = 1.68;
  let actual = VISTAS[vista] ? vista : (VISTAS[ej.vista] ? ej.vista : 'tres');
  const dirDe = (nombre) => (ej.vistas && ej.vistas[nombre]) || VISTAS[nombre];

  // Márgenes: 8 % en los cuatro bordes, y más arriba o abajo si un rótulo de la caja (la fase
  // arriba, «Arrastra para girar» abajo) ocupa más que eso.
  function margenes() {
    const h = Math.max(1, caja.clientHeight);
    let arriba = 0.08, abajo = 0.08;
    for (const el of caja.querySelectorAll('p, span')) {
      if (!el.offsetHeight || el === renderer.domElement) continue;
      const y0 = el.offsetTop, y1 = y0 + el.offsetHeight;
      if (y1 < h / 2) arriba = Math.max(arriba, (y1 + 6) / h);
      else if (y0 > h / 2) abajo = Math.max(abajo, (h - y0 + 6) / h);
    }
    return { lados: 0.08, arriba, abajo };
  }
  function colocar(dir) {
    const r = esc.encuadrar(camara, dir, camara.aspect, margenes());
    controles.target.copy(r.objetivo); camara.position.copy(r.posicion); camara.lookAt(r.objetivo);
    controles.update();
  }
  function medir() {
    const w = Math.max(1, caja.clientWidth), h = Math.max(1, caja.clientHeight);
    renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix();
    const d = camara.position.clone().sub(controles.target);
    colocar(d.lengthSq() > 1e-6 && !actual ? [d.x, d.y, d.z] : dirDe(actual || 'tres'));
  }
  esc.posar(0);
  medir();
  controles.addEventListener('start', () => { actual = null; });
  // Sin amortiguación, OrbitControls ya se actualiza solo al arrastrar: dibujar() no lo toca y
  // así alMover no se llama a sí mismo.
  let moviendo = false;
  if (alMover) controles.addEventListener('change', () => { if (moviendo) return; moviendo = true; try { alMover(); } finally { moviendo = false; } });

  return {
    ej, escena: esc,
    posar: (t) => esc.posar(t),
    vista(nombre) { actual = VISTAS[nombre] ? nombre : 'tres'; colocar(dirDe(actual)); },
    medir,
    dibujar() {
      if (amortiguar) controles.update();
      esc.mirarDesde(camara.position);
      renderer.render(esc.escena, camara);
    },
    revisar: () => esc.revisar(),
    destruir() {
      controles.dispose(); esc.destruir(); renderer.dispose(); renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}

// ── Carga de ejercicios ──────────────────────────────────────────────────────
// Con ?v= para que el navegador no muestre una versión vieja mientras se editan.
export async function cargarEjercicio(id) {
  try {
    const m = await import(new URL(`./ejercicios/${id}.js?v=${Date.now()}`, import.meta.url).href);
    return m.default || null;
  } catch (e) {
    if (!/Failed to fetch|Importing a module script failed|error loading/i.test(String(e))) console.error(e);
    return null;
  }
}

export function revisar(ej) {
  const esc = crearEscena(ej, colores(document.body));
  const r = esc.revisar();
  esc.destruir();
  return r;
}
