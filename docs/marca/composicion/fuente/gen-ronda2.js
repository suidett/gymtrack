// ─────────────────────────────────────────────────────────────────────────────
// Generador de la ronda 2 de composición · Zona: Diseño · herramienta de la Fase 5.5 de marca
//
// Qué hace: dibuja las dos direcciones de la ronda 2 (D · Paso a paso y E · Una tarjeta a la
// vez), cada una con cuatro pantallas (Hoy, Antes de la serie, Anotar la serie, Descanso), y el
// tablero de la prueba de comprensión. Escribe los nueve tableros (.dc.html) en la carpeta del
// lienzo, el espécimen (../especimen-ronda2.html) y el índice del lienzo (../ronda2-tableros.json).
// La regla que manda: alguien que nunca entrenó tiene que entender cada pantalla a la primera.
// Uso: `node docs/marca/composicion/fuente/gen-ronda2.js [carpeta-del-lienzo]`.
// Depende de: ../../sistema/fuente/piezas.js (utilidades, íconos y colores). No modifica nada de
// docs/marca/sistema/ ni de la ronda 1.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const P = require('../../sistema/fuente/piezas.js');

const { S, esc, attr, SANS, MONO, c, icono } = P;
const CARPETA = process.argv[2] || path.join(__dirname, 'salida-ronda2');
const AQUI = path.join(__dirname, '..');

const W = 412;
const H = 892;
const M = 20; // margen lateral
const CW = W - 2 * M; // ancho del contenido: 372
const NB = ' '; // espacio duro entre cifra y unidad

const TINTA = c.ink.DEFAULT;
const GRIS = c.ink.muted;
const PAPEL = c.bg;
const SUP = c.surface;
const LINEA = c.line;
const CAMPO = c.field;
const TRAZO = c.stroke;
const MENTA = c.primary.DEFAULT;
const MENTA_P = c.primary.deep;
const MENTA_S = c.primary.soft;
const AZUL = c.accent.DEFAULT;
const AZUL_P = c.accent.deep;
const AZUL_S = c.accent.soft;

const FUENTES = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;display=swap';

// ── Contenido (el mismo de la ronda 1, dicho en palabras) ────────────────────
const NOTA = `Subí la sentadilla a 82,5${NB}kg. Si te molesta la rodilla, anótalo en la serie.`;
const FIRMA = 'Nota de Matías Soto, tu entrenador';
const QUE_HACER = `entre 8 y 10 veces seguidas`;
const VEZ_PASADA = `Levantaste 67,5${NB}kg: 10 veces en la primera serie, 10 en la segunda y 9 en la tercera. Hoy son 2,5${NB}kg más.`;
const QUE_ES_SERIE = 'Una serie es un grupo de repeticiones seguidas, sin parar. Una repetición es levantar el peso una vez.';
const OPCIONES_FUERZA = ['No, ninguna', '1 más', '2 más', '3 más', '4 o más']; // por dentro: RIR 0, 1, 2, 3 y 4+

// ── Utilidades de texto ──────────────────────────────────────────────────────
const LH = { 14: 20, 16: 24, 18: 26, 20: 28, 22: 30, 24: 30, 26: 32, 28: 34, 32: 38, 36: 42, 40: 46 };
/** Estilo de texto Manrope. Nada de cuerpo baja de 16. */
const t = (size, weight = 400, color = TINTA, extra = {}) =>
  S({ fontFamily: SANS, fontSize: size, lineHeight: (LH[size] || Math.round(size * 1.25)) + 'px', fontWeight: weight, color, margin: 0, ...extra });
/** Estilo de cifra IBM Plex Mono. */
const m = (size, weight = 600, color = TINTA, extra = {}) =>
  S({ fontFamily: MONO, fontSize: size, lineHeight: Math.round(size * 1.1) + 'px', fontWeight: weight, color, letterSpacing: size >= 40 ? '-1px' : undefined, margin: 0, ...extra });
const div = (st, html = '') => `<div style="${st}">${html}</div>`;
const span = (st, html = '') => `<span style="${st}">${html}</span>`;
const abs = (top, left, width, height, html, extra = {}) =>
  div(S({ position: 'absolute', top, left, width, height, boxSizing: 'border-box', ...extra }), html);
const col = (gap, html, extra = {}) => div(S({ display: 'flex', flexDirection: 'column', gap, ...extra }), html);

// ── Íconos de trazo (los del sistema y los que faltaban) ─────────────────────
const MAS_TRAZOS = {
  sig: '<path d="M9 5l7 7-7 7"></path>',
  play: '<circle cx="12" cy="12" r="9"></circle><path d="M10 8.5l5.5 3.5-5.5 3.5z"></path>',
  abajo: '<path d="M6 9l6 6 6-6"></path>',
  lapiz: '<path d="M4 20h4L19 9l-4-4L4 16z"></path><path d="M13.5 6.5l4 4"></path>',
  alto: '<circle cx="12" cy="12" r="9"></circle><path d="M8.5 12h7"></path>',
};
function ico(n, tam, color, grosor = 2) {
  if (MAS_TRAZOS[n]) return `<svg aria-hidden="true" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex:none">${MAS_TRAZOS[n]}</svg>`;
  return icono(n, tam, color, grosor);
}

// ── Piezas ───────────────────────────────────────────────────────────────────
/** El único botón principal de la pantalla: 56 de alto, abajo, texto tinta. */
function principal(texto, { ancho = CW, color = MENTA } = {}) {
  return `<button type="button" style="${S({
    boxSizing: 'border-box', width: ancho, height: 56, margin: 0, padding: '0 16px', border: 0, borderRadius: 12, background: color, color: TINTA,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontSize: 18, lineHeight: '24px', fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer', flex: 'none',
  })}">${esc(texto)}</button>`;
}
/** Botón de borde: salida o alternativa. */
function deBorde(texto, { ancho, alto = 48, ic, label, pad = 16 } = {}) {
  return `<button type="button"${label ? ` aria-label="${attr(label)}"` : ''} style="${S({
    boxSizing: 'border-box', width: ancho, height: alto, margin: 0, padding: `0 ${pad}px`, border: `1.5px solid ${TRAZO}`, borderRadius: 12, background: 'transparent', color: TINTA,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: SANS, fontSize: 16, lineHeight: '24px', fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer', flex: 'none',
  })}">${ic ? ico(ic, 20, TINTA, 2) : ''}<span>${esc(texto)}</span></button>`;
}
/** Enlace que abre lo secundario: texto menta profunda con flecha, 48 de toque. */
function enlace(texto, { ic = 'sig', ancho } = {}) {
  return `<button type="button" style="${S({
    boxSizing: 'border-box', width: ancho, height: 48, margin: 0, padding: 0, border: 0, background: 'transparent', color: MENTA_P,
    display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: SANS, fontSize: 16, lineHeight: '24px', fontWeight: 700, cursor: 'pointer', textAlign: 'left', flex: 'none',
  })}"><span>${esc(texto)}</span>${ico(ic, 20, MENTA_P, 2.2)}</button>`;
}
/** Salida de texto (sin borde), para «No pude terminarla» y «Anotar un dolor». */
function salida(texto, ic, { ancho } = {}) {
  return `<button type="button" style="${S({
    boxSizing: 'border-box', width: ancho, height: 48, margin: 0, padding: '0 4px', border: 0, background: 'transparent', color: TINTA,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: SANS, fontSize: 16, lineHeight: '24px', fontWeight: 600,
    textDecoration: 'underline', textUnderlineOffset: '4px', textDecorationColor: TRAZO, whiteSpace: 'nowrap', cursor: 'pointer', flex: 'none',
  })}">${ic ? ico(ic, 20, GRIS, 2) : ''}<span>${esc(texto)}</span></button>`;
}
/** Barra de arriba de la sesión: salir y el avance, sin protagonismo. */
function barraSesion(paso, { fondo = PAPEL, pista = CAMPO } = {}) {
  const segs = Array.from({ length: 6 }, (_, i) =>
    span(S({ flex: 1, height: 6, borderRadius: 3, background: i < paso - 1 ? MENTA_P : i === paso - 1 ? MENTA : pista, display: 'block' })),
  ).join('');
  const salir = `<button type="button" style="${S({
    boxSizing: 'border-box', height: 48, margin: 0, padding: '0 12px 0 4px', border: 0, background: 'transparent', color: GRIS,
    display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: SANS, fontSize: 16, lineHeight: '24px', fontWeight: 600, cursor: 'pointer',
  })}">${ico('cruz', 20, GRIS, 2.2)}<span>Salir</span></button>`;
  return abs(0, 0, W, 72,
    div(S({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, marginTop: 8 }), salir + span(t(16, 600, GRIS), `Ejercicio 2 de 6`)) +
      div(S({ display: 'flex', gap: 4, marginTop: 6 }), segs),
    { padding: `0 ${M}px`, background: fondo });
}
/** Barra de pestañas con los nombres reales. Nombre en 14 (la guía dice 13). */
const PESTANAS = [['Hoy', 'hoy'], ['Rutinas', 'rutinas'], ['Progreso', 'progreso'], ['Ejercicios', 'ejercicios'], ['Perfil', 'perfil']];
function pestanas() {
  const items = PESTANAS.map(([n, ic]) => {
    const on = n === 'Hoy';
    return `<button type="button" aria-current="${on ? 'page' : 'false'}" style="${S({ flex: 1, minWidth: 0, height: 63, margin: 0, padding: '6px 0 5px', border: 0, background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' })}">${span(S({ width: 56, height: 30, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? MENTA : 'transparent' }), ico(ic, 22, on ? TINTA : GRIS, 2))}${span(S({ fontFamily: SANS, fontSize: 14, lineHeight: '18px', fontWeight: on ? 700 : 500, color: on ? TINTA : GRIS }), n)}</button>`;
  }).join('');
  return abs(H - 64, 0, W, 64, `<nav aria-label="Pestañas" style="${S({ boxSizing: 'border-box', width: W, height: 64, display: 'flex', background: SUP, borderTop: `1px solid ${LINEA}` })}">${items}</nav>`);
}
/** La nota del entrenador: raya azul, firma en azul profundo, texto en tinta. */
function nota({ tam = 18 } = {}) {
  return div(S({ borderLeft: `3px solid ${AZUL}`, paddingLeft: 14 }),
    div(t(16, 700, AZUL_P), FIRMA) + div(t(tam, 400, TINTA, { lineHeight: tam === 18 ? '27px' : '24px', marginTop: '4px' }), esc(NOTA)));
}
/** Botón redondo de más o menos, 56 de toque. */
function redondo(signo, label) {
  return `<button type="button" aria-label="${attr(label)}" style="${S({ boxSizing: 'border-box', width: 56, height: 56, margin: 0, padding: 0, borderRadius: '50%', border: `1.5px solid ${TRAZO}`, background: SUP, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' })}">${ico(signo, 24, TINTA, 2.5)}</button>`;
}
/** Una pregunta con su respuesta numérica: menos, la cifra con su nombre, más. */
function pregunta(texto, cifra, unidad, paso, { ayuda, ancho = CW } = {}) {
  const caja = div(S({ flex: 1, height: 56, margin: '0 10px', boxSizing: 'border-box', borderRadius: 12, background: SUP, border: `1.5px solid ${TRAZO}`, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, paddingTop: 6 }),
    span(m(36, 600, TINTA, { lineHeight: '40px' }), esc(cifra)) + span(t(18, 600, GRIS), esc(unidad)));
  return div('',
    div(t(18, 700), esc(texto)) +
      div(S({ display: 'flex', alignItems: 'center', marginTop: 8, width: ancho }), redondo('menos', `Bajar ${paso}`) + caja + redondo('mas', `Subir ${paso}`)) +
      (ayuda ? div(t(16, 400, GRIS, { marginTop: '6px' }), esc(ayuda)) : ''));
}
/** «¿Te quedaban fuerzas para más?»: cinco opciones en palabras. Elegida: menta suave, borde profundo y visto. */
function fuerzas(elegida, { ancho = CW, ayuda = true } = {}) {
  const ops = OPCIONES_FUERZA.map((o) => {
    const on = o === elegida;
    return `<button type="button" role="radio" aria-checked="${on ? 'true' : 'false'}" style="${S({
      boxSizing: 'border-box', height: 48, margin: 0, padding: '0 4px', borderRadius: 12, cursor: 'pointer',
      border: on ? `2px solid ${MENTA_P}` : `1.5px solid ${TRAZO}`, background: on ? MENTA_S : SUP, color: TINTA,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: SANS, fontSize: 16, lineHeight: '24px', fontWeight: on ? 700 : 600, whiteSpace: 'nowrap',
    })}">${on ? ico('visto', 18, TINTA, 2.6) : ''}<span>${esc(o)}</span></button>`;
  }).join('');
  return div('',
    div(t(18, 700), '¿Te quedaban fuerzas para más repeticiones?') +
      (ayuda ? div(t(16, 400, GRIS, { marginTop: '2px' }), 'Piensa cuántas veces más podías levantarlo.') : '') +
      `<div role="radiogroup" aria-label="Repeticiones que te quedaban" style="${S({ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10, width: ancho })}">${ops}</div>`);
}
/** La instrucción de la serie: «Levanta 70 kg entre 8 y 10 veces seguidas». */
function instruccion({ cifra = 64, rotulo = true } = {}) {
  return div('',
    (rotulo ? div(t(16, 600, GRIS), 'Lo que tienes que hacer') : '') +
      div(t(22, 700, TINTA, { marginTop: rotulo ? '6px' : 0 }), 'Levanta') +
      div(S({ display: 'flex', alignItems: 'baseline', gap: 10 }), span(m(cifra, 600, TINTA, { lineHeight: Math.round(cifra * 1.1) + 'px' }), '70') + span(m(Math.round(cifra * 0.5), 600, TINTA), 'kg')) +
      div(t(22, 700), esc(QUE_HACER)));
}
/** Línea con visto: un paso ya hecho, cerrado. Se toca para abrirlo. */
function cerrada(titulo, detalle) {
  return `<button type="button" aria-label="${attr(`${titulo}. ${detalle}. Abrir`)}" style="${S({
    boxSizing: 'border-box', width: CW, height: 64, margin: 0, padding: 0, border: 0, borderBottom: `1px solid ${LINEA}`, background: 'transparent',
    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', flex: 'none',
  })}">${span(S({ width: 28, height: 28, borderRadius: '50%', background: MENTA, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }), ico('visto', 17, TINTA, 2.6))}${span(S({ flex: 1, minWidth: 0, display: 'block' }), div(t(16, 700), esc(titulo)) + div(t(16, 400, GRIS), esc(detalle)))}${ico('abajo', 20, GRIS, 2)}</button>`;
}
/** Tarjeta abierta (E): el paso de ahora. Superficie, borde menta profunda, radio 14. */
function abierta(top, alto, html, { fondo = SUP, borde = MENTA_P } = {}) {
  return abs(top, M, CW, alto, html, { background: fondo, border: `1.5px solid ${borde}`, borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column' });
}
const rotuloAhora = (txt, color = MENTA_P) => div(S({ display: 'flex', alignItems: 'center', gap: 8 }), span(S({ width: 10, height: 10, borderRadius: '50%', background: color, display: 'block', flex: 'none' })) + span(t(16, 700, color), esc(txt)));
const aparte = (txt, { color = GRIS } = {}) => div(S({ display: 'flex', gap: 10, alignItems: 'flex-start' }), span(S({ paddingTop: 2, display: 'block' }), ico('info', 20, color, 2.2)) + div(t(16, 400, color), esc(txt)));
const raya = (extra = {}) => div(S({ height: 1, background: LINEA, ...extra }));
const raiz = (html, fondo = PAPEL) => `<div style="${S({ width: W, height: H, position: 'relative', overflow: 'hidden', background: fondo })}">${html}</div>`;

// ── D · Paso a paso ──────────────────────────────────────────────────────────
// Cada pantalla es un paso con una sola pregunta como título, como un asistente. No hay historial
// a la vista: lo de antes ya pasó y lo de después llega cuando tocas el botón.
function dHoy() {
  let h = abs(28, M, CW, 64, div(t(16, 500, GRIS), 'Martes 17 de noviembre') + div(t(28, 700, TINTA, { marginTop: '4px', letterSpacing: '-0.3px' }), 'Hola, Camila'));
  h += abs(116, M, CW, 250,
    div(t(18, 600, GRIS), 'Hoy te toca') +
      div(t(40, 700, TINTA, { letterSpacing: '-0.5px', marginTop: '2px' }), 'Pierna A') +
      div(t(18, 400, TINTA, { marginTop: '8px' }), `6 ejercicios para las piernas. Te toma unos 55${NB}minutos.`) +
      div(t(16, 400, GRIS, { marginTop: '6px' }), 'Vas en la semana 3 de 8 de tu plan.') +
      div(S({ marginTop: 6 }), enlace('Ver los 6 ejercicios')),
    { background: SUP, border: `1px solid ${LINEA}`, borderRadius: 14, padding: '18px 20px 8px' });
  h += abs(392, M, CW, 140, nota());
  h += abs(H - 64 - 16 - 56, M, CW, 56, principal('Empezar entrenamiento'));
  h += pestanas();
  return raiz(h);
}
function dAntes() {
  let h = barraSesion(2);
  h += abs(92, M, CW, 160,
    div(t(16, 700, MENTA_P), 'Serie 2 de 3') +
      div(t(28, 700, TINTA, { letterSpacing: '-0.3px', marginTop: '2px' }), 'Peso muerto rumano') +
      div(t(16, 400, GRIS, { marginTop: '4px' }), 'Trabaja la parte de atrás de las piernas.') +
      div(S({ marginTop: 12 }), deBorde('Cómo se hace', { ic: 'play' })));
  h += abs(282, M, CW, 214, instruccion(), { background: SUP, border: `1.5px solid ${MENTA_P}`, borderRadius: 14, padding: '18px 20px' });
  h += abs(514, M, CW, 76, aparte(QUE_ES_SERIE));
  h += abs(606, M, CW, 136, div(t(16, 700), 'La vez pasada') + div(t(18, 400, TINTA, { lineHeight: '26px', marginTop: '2px' }), esc(VEZ_PASADA)));
  h += abs(H - 24 - 56, M, CW, 56, principal('Ya hice la serie'));
  return raiz(h);
}
function dAnotar() {
  let h = barraSesion(2);
  h += abs(90, M, CW, 64, div(t(26, 700, TINTA, { letterSpacing: '-0.3px' }), '¿Cómo te fue en esta serie?') + div(t(16, 400, GRIS, { marginTop: '2px' }), 'Peso muerto rumano, serie 2 de 3'));
  h += abs(176, M, CW, 96, pregunta('¿Cuántas veces lo levantaste?', '9', 'veces', '1 vez'));
  h += abs(290, M, CW, 150, pregunta('¿Con cuánto peso?', '70', 'kg', '2,5 kg', { ayuda: 'Viene lleno con el peso sugerido. Cámbialo si usaste otro.' }));
  h += abs(458, M, CW, 210, fuerzas('1 más'));
  h += abs(690, M, CW, 48, div(S({ display: 'flex', justifyContent: 'space-between' }), salida('No pude terminarla', 'alto') + salida('Anotar un dolor', 'lapiz')));
  h += abs(H - 24 - 56, M, CW, 56, principal('Guardar serie'));
  return raiz(h);
}
function dDescanso() {
  let h = barraSesion(2, { fondo: AZUL_S, pista: SUP });
  h += abs(92, M, CW, 28, div(S({ display: 'flex', alignItems: 'center', gap: 10 }), span(S({ width: 24, height: 24, borderRadius: '50%', background: MENTA, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }), ico('visto', 15, TINTA, 2.6)) + span(t(16, 600), `Guardaste la serie 2: 70${NB}kg, 9 veces.`)));
  h += abs(148, M, CW, 340,
    div(S({ display: 'flex', alignItems: 'center', gap: 8 }), ico('reloj', 22, AZUL_P, 2.2) + span(t(18, 700, AZUL_P), 'Descanso')) +
      div(t(24, 700, TINTA, { marginTop: '8px', letterSpacing: '-0.2px' }), 'Descansa antes de la siguiente serie') +
      div(m(112, 600, TINTA, { lineHeight: '120px', marginTop: '8px', letterSpacing: '-3px' }), '1:24') +
      div(t(20, 600, TINTA), 'Queda 1 minuto y 24 segundos') +
      div(S({ height: 8, borderRadius: 4, background: SUP, marginTop: 14, overflow: 'hidden' }), div(S({ width: '93%', height: 8, background: AZUL_P }))) +
      div(t(16, 400, GRIS, { marginTop: '8px' }), `El descanso es de 1 minuto y 30 segundos.`));
  h += abs(496, M, CW, 56, aparte('Cuando llegue a cero, el teléfono vibra. No tienes que tocar nada.', { color: TINTA }));
  h += abs(572, M, CW, 124,
    div(t(16, 600, GRIS), 'Lo que viene') + div(t(20, 700, TINTA, { marginTop: '4px' }), 'Serie 3 de 3, peso muerto rumano') + div(t(18, 400, TINTA, { marginTop: '4px' }), `Levanta 70${NB}kg entre 8 y 10 veces.`),
    { background: SUP, borderRadius: 14, padding: '16px 20px' });
  h += abs(H - 24 - 56, M, CW, 56, div(S({ display: 'flex', gap: 12 }), deBorde('+30 segundos', { alto: 56, ancho: 150, label: 'Sumar 30 segundos al descanso' }) + principal('Saltar descanso', { ancho: CW - 150 - 12, color: AZUL })));
  return raiz(h, AZUL_S);
}

// ── E · Una tarjeta a la vez ─────────────────────────────────────────────────
// La sesión es una sola página. Arriba, lo hecho, cerrado en una línea con su visto. Abajo, una
// sola tarjeta abierta: el paso de ahora, con su botón al pie, donde cae el pulgar.
function eHoy() {
  let h = abs(28, M, CW, 64, div(t(16, 500, GRIS), 'Martes 17 de noviembre') + div(t(28, 700, TINTA, { marginTop: '4px', letterSpacing: '-0.3px' }), 'Hola, Camila'));
  h += abs(104, M, CW, 64, cerrada('Llevas 3 días seguidos entrenando', 'Sábado, domingo y lunes'));
  const top = 196;
  const alto = H - 64 - 16 - top;
  h += abierta(top, alto,
    rotuloAhora('Hoy te toca') +
      div(t(36, 700, TINTA, { letterSpacing: '-0.5px', marginTop: '4px' }), 'Pierna A') +
      div(t(18, 400, TINTA, { marginTop: '6px' }), `6 ejercicios para las piernas. Te toma unos 55${NB}minutos.`) +
      div(t(16, 400, GRIS, { marginTop: '6px' }), 'Vas en la semana 3 de 8 de tu plan.') +
      div(S({ marginTop: 2 }), enlace('Ver los 6 ejercicios')) +
      raya({ margin: '10px 0 16px' }) +
      nota({ tam: 16 }) +
      div(S({ flex: 1 })) +
      principal('Empezar entrenamiento', { ancho: CW - 32 - 3 }));
  h += pestanas();
  return raiz(h);
}
function eAntes() {
  let h = barraSesion(2);
  h += abs(76, M, CW, 128, cerrada('Sentadilla', '4 series hechas') + cerrada('Peso muerto rumano, serie 1', `Hecha: 70${NB}kg, 10 veces`));
  const top = 220;
  h += abierta(top, H - 20 - top,
    rotuloAhora('Ahora: serie 2 de 3') +
      div(S({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }), div(t(24, 700, TINTA, { letterSpacing: '-0.2px' }), 'Peso muerto rumano')) +
      div(S({ marginTop: 10 }), deBorde('Cómo se hace', { ic: 'play' })) +
      div(S({ marginTop: 18 }), instruccion({ cifra: 56 })) +
      div(S({ marginTop: 14 }), aparte(QUE_ES_SERIE)) +
      div(t(16, 400, TINTA, { marginTop: '12px' }), `<b style="font-weight:700">La vez pasada</b> ${esc(VEZ_PASADA.replace('Levantaste', 'levantaste'))}`) +
      div(S({ flex: 1 })) +
      principal('Ya hice la serie', { ancho: CW - 32 - 3 }));
  return raiz(h);
}
function eAnotar() {
  let h = barraSesion(2);
  h += abs(76, M, CW, 128, cerrada('Sentadilla', '4 series hechas') + cerrada('Peso muerto rumano, serie 1', `Hecha: 70${NB}kg, 10 veces`));
  const top = 216;
  const IW = CW - 32 - 3;
  h += abierta(top, H - 20 - top,
    rotuloAhora('Ahora: anota la serie 2 de 3') +
      div(t(24, 700, TINTA, { letterSpacing: '-0.2px', marginTop: '4px' }), '¿Cómo te fue?') +
      div(S({ marginTop: 12 }), pregunta('¿Cuántas veces lo levantaste?', '9', 'veces', '1 vez', { ancho: IW })) +
      div(S({ marginTop: 14 }), pregunta('¿Con cuánto peso?', '70', 'kg', '2,5 kg', { ancho: IW, ayuda: 'Viene lleno con el peso sugerido.' })) +
      div(S({ marginTop: 14 }), fuerzas('1 más', { ancho: IW, ayuda: false })) +
      div(S({ display: 'flex', justifyContent: 'space-between', marginTop: 6 }), salida('No pude terminarla') + salida('Anotar un dolor')) +
      div(S({ flex: 1 })) +
      principal('Guardar serie', { ancho: IW }));
  return raiz(h);
}
function eDescanso() {
  let h = barraSesion(2);
  h += abs(76, M, CW, 192, cerrada('Sentadilla', '4 series hechas') + cerrada('Peso muerto rumano, serie 1', `Hecha: 70${NB}kg, 10 veces`) + cerrada('Peso muerto rumano, serie 2', `Hecha: 70${NB}kg, 9 veces`));
  const top = 284;
  const IW = CW - 32 - 3;
  h += abierta(top, H - 20 - top,
    div(S({ display: 'flex', alignItems: 'center', gap: 8 }), ico('reloj', 22, AZUL_P, 2.2) + span(t(18, 700, AZUL_P), 'Descanso')) +
      div(m(88, 600, TINTA, { lineHeight: '96px', letterSpacing: '-2px', marginTop: '4px' }), '1:24') +
      div(t(18, 700, TINTA), 'para la siguiente serie') +
      div(t(18, 400, TINTA), 'Queda 1 minuto y 24 segundos.') +
      div(S({ height: 8, borderRadius: 4, background: SUP, marginTop: 12, overflow: 'hidden' }), div(S({ width: '93%', height: 8, background: AZUL_P }))) +
      div(t(16, 400, TINTA, { marginTop: '10px' }), 'Cuando llegue a cero, el teléfono vibra. No tienes que tocar nada.') +
      raya({ margin: '14px 0 12px', background: '#C9D6F0' }) +
      div(t(16, 700, TINTA), 'Después: serie 3 de 3') +
      div(t(16, 400, TINTA), `Levanta 70${NB}kg entre 8 y 10 veces.`) +
      div(S({ flex: 1 })) +
      div(S({ display: 'flex', gap: 10 }), deBorde('+30 segundos', { alto: 56, ancho: 136, pad: 10, label: 'Sumar 30 segundos al descanso' }) + principal('Saltar descanso', { ancho: IW - 136 - 10, color: AZUL })),
    { fondo: AZUL_S, borde: AZUL });
  return raiz(h);
}

// ── Prueba de comprensión ────────────────────────────────────────────────────
const PW = 1200;
const PRUEBA = [
  ['1 · Hoy', [
    ['¿Qué me toca hoy?', 'La tarjeta de arriba: «Hoy te toca Pierna A».', 'La tarjeta abierta: «Hoy te toca Pierna A».'],
    ['¿Qué me dice mi entrenador?', 'La nota con raya azul, bajo la tarjeta.', 'La nota con raya azul, dentro de la tarjeta.'],
    ['¿Qué tengo que tocar ahora?', 'El botón menta de abajo: «Empezar entrenamiento».', 'El botón menta al pie de la tarjeta.'],
  ]],
  ['2 · Antes de la serie', [
    ['¿En qué ejercicio y serie voy?', 'Arriba: «Serie 2 de 3» y «Peso muerto rumano».', 'El rótulo de la tarjeta: «Ahora: serie 2 de 3».'],
    ['¿Cuánto levanto y cuántas veces?', 'El recuadro: «Levanta 70 kg entre 8 y 10 veces».', 'El centro de la tarjeta, con el mismo texto.'],
    ['¿Qué toco cuando termine?', 'El botón de abajo: «Ya hice la serie».', 'El botón al pie de la tarjeta: «Ya hice la serie».'],
  ]],
  ['3 · Anotar la serie', [
    ['¿Qué me está preguntando?', 'El título «¿Cómo te fue en esta serie?» y tres preguntas.', 'La tarjeta «¿Cómo te fue?», con las mismas tres preguntas.'],
    ['¿Cómo cambio un número?', 'Menos y más, a cada lado de «9 veces» y de «70 kg».', 'Los mismos botones, dentro de la tarjeta.'],
    ['¿Y si no pude terminarla?', '«No pude terminarla», encima de «Guardar serie».', 'Igual, dentro de la tarjeta, encima de «Guardar serie».'],
  ]],
  ['4 · Descanso', [
    ['¿Cuánto me falta?', '«1:24» en grande y «Queda 1 minuto y 24 segundos».', '«1:24 para la siguiente serie», en la tarjeta azul.'],
    ['¿Qué viene después?', 'La tarjeta blanca: «Lo que viene: serie 3 de 3».', '«Después: serie 3 de 3», en la tarjeta azul.'],
    ['¿Tengo que tocar algo?', 'No: «Cuando llegue a cero, el teléfono vibra».', 'La misma frase, en la tarjeta azul.'],
  ]],
];
// La lista completa, con el contexto de cada cambio, está en ../notas-ronda2.md.
const JERGA = [
  ['4 × 6 a 8', '4 series de 6 a 8 repeticiones'],
  ['RIR 2', '¿Te quedaban fuerzas? «2 más»'],
  ['reps', 'veces'],
  ['Serie hecha', 'Ya hice la serie'],
  ['Fallé', 'No pude terminarla'],
  ['Observación', 'Anotar un dolor'],
  ['Técnica', 'Cómo se hace'],
  ['Última vez', 'La vez pasada levantaste 67,5 kg'],
  ['Sugerencia', 'Peso sugerido'],
  ['+30 s', '+30 segundos'],
  ['Saltar', 'Saltar descanso'],
  ['Racha', '3 días seguidos entrenando'],
  ['Volumen', 'Fuera de Hoy, va en Progreso'],
  ['Empezar rutina', 'Empezar entrenamiento'],
];
function prueba() {
  const PH = 892;
  const X = 40;
  const ANCHO = PW - 2 * X;
  let h = abs(28, X, ANCHO, 64,
    div(t(28, 700, TINTA, { letterSpacing: '-0.3px' }), 'Prueba de comprensión: ¿se entiende en 5 segundos?') +
      div(t(16, 400, GRIS, { marginTop: '2px' }), 'Lo que alguien que nunca entrenó tiene que poder responder en cada pantalla, y dónde está la respuesta en D · Paso a paso y en E · Una tarjeta a la vez.'));
  const letra = (L, txt) => div(S({ display: 'flex', gap: 8, marginTop: 4 }), span(S({ flex: 'none', width: 24, height: 22, marginTop: 1, borderRadius: 6, background: L === 'D' ? MENTA_S : AZUL_S, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 16, lineHeight: '22px', fontWeight: 600, color: TINTA }), L) + div(t(16, 400, TINTA, { lineHeight: '22px' }), esc(txt)));
  const NC = 128;
  const cw = (ANCHO - NC - 3 * 24) / 3;
  const filasPrueba = PRUEBA.map(([titulo, qs], i) => {
    const celdas = qs.map(([q, d, e]) => div(S({ width: cw, flex: 'none' }), div(t(16, 700, TINTA, { lineHeight: '22px' }), esc(q)) + letra('D', d) + letra('E', e))).join('');
    return div(S({ display: 'flex', gap: 24, padding: '8px 0 8px', borderTop: `1.5px solid ${i === 0 ? TINTA : LINEA}` }),
      div(S({ width: NC - 24, flex: 'none' }), div(t(18, 700, TINTA, { lineHeight: '24px' }), esc(titulo))) + celdas);
  }).join('');
  const jw = (ANCHO - 2 * 32) / 3;
  const filas = JERGA.map(([a, b]) => div(S({ display: 'flex', gap: 12, alignItems: 'baseline', padding: '5px 0', borderBottom: `1px solid ${LINEA}` }),
    span(t(16, 600, GRIS, { flex: 'none', width: 112, lineHeight: '22px', textDecoration: 'line-through', textDecorationColor: TRAZO }), esc(a)) + span(t(16, 400, TINTA, { lineHeight: '22px' }), esc(b))));
  const jerga = div(S({ marginTop: 10 }), div(t(20, 700, TINTA), 'Palabras de gimnasio que se sacaron o se tradujeron') +
    div(S({ display: 'flex', gap: 32, marginTop: 6 }), [0, 1, 2].map((k) => div(S({ width: jw, flex: 'none' }), filas.slice(k * 5, k * 5 + 5).join(''))).join('')));
  h += abs(94, X, ANCHO, PH - 94 - 12, filasPrueba + jerga, { display: 'flex', flexDirection: 'column' });
  return `<div style="${S({ width: PW, height: PH, position: 'relative', overflow: 'hidden', background: PAPEL })}">${h}</div>`;
}

// ── Tableros ─────────────────────────────────────────────────────────────────
const D = 'D · Paso a paso';
const E = 'E · Una tarjeta a la vez';
const TABLEROS = [
  { archivo: 'Comp2DHoy.dc.html', titulo: `${D} · Hoy`, x: 0, w: W, h: H, html: dHoy },
  { archivo: 'Comp2DAntes.dc.html', titulo: `${D} · Antes de la serie`, x: 492, w: W, h: H, html: dAntes },
  { archivo: 'Comp2DAnotar.dc.html', titulo: `${D} · Anotar la serie`, x: 984, w: W, h: H, html: dAnotar },
  { archivo: 'Comp2DDescanso.dc.html', titulo: `${D} · Descanso`, x: 1476, w: W, h: H, html: dDescanso },
  { archivo: 'Comp2EHoy.dc.html', titulo: `${E} · Hoy`, x: 2080, w: W, h: H, html: eHoy },
  { archivo: 'Comp2EAntes.dc.html', titulo: `${E} · Antes de la serie`, x: 2572, w: W, h: H, html: eAntes },
  { archivo: 'Comp2EAnotar.dc.html', titulo: `${E} · Anotar la serie`, x: 3064, w: W, h: H, html: eAnotar },
  { archivo: 'Comp2EDescanso.dc.html', titulo: `${E} · Descanso`, x: 3556, w: W, h: H, html: eDescanso },
  { archivo: 'Comp2Prueba.dc.html', titulo: 'Ronda 2 · Prueba de comprensión', x: 4160, w: PW, h: H, html: prueba },
];

function dc(tb, cuerpo) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Composición ${esc(tb.titulo)}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="${FUENTES}" rel="stylesheet">
<style>body{margin:0}</style>
</helmet>
${cuerpo}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${tb.w},"height":${tb.h}}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
`;
}

function especimen(partes) {
  const marco = (i) => {
    const tb = TABLEROS[i];
    return `<figure style="${S({ margin: 0, flex: 'none' })}"><figcaption style="${S({ fontFamily: SANS, fontSize: 16, lineHeight: '24px', fontWeight: 700, color: TINTA, margin: '0 0 2px' })}">${esc(tb.titulo.split(' · ').pop())}</figcaption><div style="${S({ fontFamily: MONO, fontSize: 13, lineHeight: '18px', color: GRIS, margin: '0 0 8px' })}">${esc(tb.archivo)} · ${tb.w} × ${tb.h}</div><div style="${S({ width: tb.w, height: tb.h, overflow: 'hidden', boxShadow: `0 0 0 1px ${TRAZO}` })}">${partes[i]}</div></figure>`;
  };
  const fila = (id, nombre, idea, desde) => `<section id="${id}" style="${S({ marginTop: 56 })}"><h2 style="${S({ margin: '0 0 4px', fontFamily: SANS, fontSize: 24, lineHeight: '30px', fontWeight: 700, color: TINTA })}">${esc(nombre)}</h2><p style="${S({ margin: '0 0 20px', maxWidth: 880, fontFamily: SANS, fontSize: 16, lineHeight: '24px', color: GRIS })}">${esc(idea)}</p><div style="${S({ display: 'flex', gap: 32, alignItems: 'flex-start' })}">${[0, 1, 2, 3].map((k) => marco(desde + k)).join('')}</div></section>`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Composición GymTrack, ronda 2</title>
<link href="${FUENTES}" rel="stylesheet">
<style>body{margin:0;background:${CAMPO};padding:40px;min-width:1780px}</style>
</head>
<body>
<header><div style="${S({ fontFamily: MONO, fontSize: 13, lineHeight: '16px', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', color: GRIS })}">Fase 5.5 · ronda 2 · dos direcciones</div><h1 style="${S({ margin: '6px 0 10px', fontFamily: SANS, fontSize: 32, lineHeight: '38px', fontWeight: 700, color: TINTA })}">Que se entienda a la primera</h1><p style="${S({ margin: 0, maxWidth: 880, fontFamily: SANS, fontSize: 16, lineHeight: '24px', color: GRIS })}">Cuatro pantallas por dirección, pensadas para alguien que nunca entrenó. Una pregunta por pantalla, un botón principal abajo y cada número con su nombre en palabras.</p></header>
${fila('d', D, 'Cada pantalla es un paso con una sola pregunta como título, como un asistente. Avanzar es tocar el botón de abajo. No hay historial a la vista.', 0)}
${fila('e', E, 'La sesión es una sola página. Lo hecho queda arriba, cerrado en una línea con su visto; el paso de ahora es la única tarjeta abierta, con su botón al pie.', 4)}
<section id="prueba" style="${S({ marginTop: 56 })}"><h2 style="${S({ margin: '0 0 20px', fontFamily: SANS, fontSize: 24, lineHeight: '30px', fontWeight: 700, color: TINTA })}">Prueba de comprensión</h2>${marco(8)}</section>
</body>
</html>
`;
}

function main() {
  fs.mkdirSync(CARPETA, { recursive: true });
  const partes = TABLEROS.map((tb) => tb.html());
  TABLEROS.forEach((tb, i) => fs.writeFileSync(path.join(CARPETA, tb.archivo), dc(tb, partes[i])));
  fs.writeFileSync(path.join(AQUI, 'especimen-ronda2.html'), especimen(partes));
  const boards = {};
  for (const tb of TABLEROS) boards[tb.archivo] = { x: tb.x, y: 1800, w: tb.w, h: tb.h, title: tb.titulo, page: 'composicion' };
  const json = {
    boards,
    order: TABLEROS.map((tb) => tb.archivo),
    notes: { mc2: { x: 0, y: 1500, text: 'Ronda 2: que se entienda a la primera', kind: 'title1', maxW: 5360, page: 'composicion' } },
  };
  fs.writeFileSync(path.join(AQUI, 'ronda2-tableros.json'), JSON.stringify(json, null, 2) + '\n');
  console.log(TABLEROS.map((tb) => `${tb.archivo} ${tb.w}×${tb.h}`).join('\n'));
}
main();
