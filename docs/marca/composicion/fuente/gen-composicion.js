// ─────────────────────────────────────────────────────────────────────────────
// Generador de composiciones · Zona: Diseño · herramienta de la Fase 5.5 de marca
//
// Qué hace: dibuja las tres composiciones de las pantallas Hoy y Registro de sesión
// (A · La pauta, B · El margen, C · La balanza) y el tablero de antirreferentes. Escribe los
// siete tableros (.dc.html) en la carpeta del lienzo, el espécimen con la prueba de
// desenfoque (../especimen-composicion.html) y el índice del lienzo
// (../composicion-tableros.json).
// Uso: `node docs/marca/composicion/fuente/gen-composicion.js [carpeta-del-lienzo]`.
// Depende de: ../../sistema/fuente/piezas.js y, a través de él, ../../sistema/tokens-propuestos.js.
// No modifica nada de docs/marca/sistema/.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const P = require('../../sistema/fuente/piezas.js');

const { S, esc, attr, ts, div, span, SANS, MONO, TINTA, c, icono, redondo, marcaEstado, barraPestanas, nota } = P;
const CARPETA = process.argv[2] || path.join(__dirname, 'salida');
const AQUI = path.join(__dirname, '..');

const W = 412;
const H = 892;
const NB = ' ';
const GRIS = c.ink.muted;
const TENUE = c.ink.faint;
const MENTA = c.primary.DEFAULT;
const MENTA_P = c.primary.deep;
const MENTA_S = c.primary.soft;
const AZUL = c.accent.DEFAULT;
const AZUL_P = c.accent.deep;

// ── Contenido (el mismo en las tres composiciones) ───────────────────────────
const EJ = [
  ['Sentadilla', '4 × 6 a 8', '82', '5'],
  ['Peso muerto rumano', '3 × 8 a 10', '70', ''],
  ['Prensa', '3 × 10 a 12', '140', ''],
  ['Zancada búlgara', '3 × 8 a 10', '16', ''],
  ['Curl femoral', '3 × 10 a 12', '35', ''],
  ['Pantorrilla de pie', '4 × 12 a 15', '60', ''],
];
const NOTA = 'Subí la sentadilla a 82,5 kg. Si te molesta la rodilla, anótalo en la serie.';
const QUIEN = 'Matías Soto, tu entrenador';
const SUGERENCIA = `Mantén 70${NB}kg y apunta a 10 repeticiones.`;
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const SEMANA = ['hecha', 'hoy', '', '', '', '', ''];

// ── Utilidades ───────────────────────────────────────────────────────────────
const abs = (top, left, width, height, html, extra = {}) =>
  div(S({ position: 'absolute', top, left, width, height, boxSizing: 'border-box', ...extra }), html);
const etq = (t, color, extra = {}) => div(ts('etiqueta', color, extra), esc(t));
const regla = (top, left, width, color = c.line, grosor = 1) => abs(top, left, width, grosor, '', { background: color });
const dobleRegla = (top, left, width) => abs(top, left, width, 3, '', { borderTop: `1px solid ${TINTA}`, borderBottom: `1px solid ${TINTA}` });

const MAS_TRAZOS = {
  lapiz: '<path d="M4 20h4L19 9l-4-4L4 16z"></path><path d="M13.5 6.5l4 4"></path>',
  sig: '<path d="M9 5l7 7-7 7"></path>',
};
function ico(n, tam, color, grosor = 2) {
  if (MAS_TRAZOS[n]) return `<svg aria-hidden="true" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex:none">${MAS_TRAZOS[n]}</svg>`;
  return icono(n, tam, color, grosor);
}

/** Botón real con los valores del sistema. multilinea: la etiqueta puede ir en dos líneas (margen de B). */
function btn({ v = 'primario', tam = 'normal', texto, ic, ancho, extra = {}, multilinea = false, label }) {
  const V = {
    primario: { bg: MENTA, fg: TINTA },
    secundario: { bg: MENTA_S, fg: TINTA },
    borde: { bg: 'transparent', fg: TINTA, b: c.stroke },
    peligro: { bg: c.danger.soft, fg: c.danger.deep },
  }[v];
  const h = { grande: 56, normal: 48 }[tam];
  const st = S({
    boxSizing: 'border-box', height: h, width: ancho, padding: multilinea ? '0 10px' : `0 ${tam === 'grande' ? 24 : 16}px`,
    border: V.b ? `1.5px solid ${V.b}` : '0', borderRadius: 12, background: V.bg, color: V.fg,
    display: 'inline-flex', alignItems: 'center', justifyContent: multilinea ? 'flex-start' : 'center', gap: multilinea ? 6 : 8,
    fontFamily: SANS, fontSize: multilinea ? 14 : 16, lineHeight: multilinea ? '18px' : '20px', fontWeight: 700,
    textAlign: multilinea ? 'left' : undefined, cursor: 'pointer', flex: 'none', margin: 0, ...extra,
  });
  const i = ic ? ico(ic, 18, V.fg, 2.2) : '';
  return `<button type="button"${label ? ` aria-label="${attr(label)}"` : ''} style="${st}">${i}<span>${esc(texto)}</span></button>`;
}

/** Cifra con la coma alineada: parte entera en `intCh` caracteres, decimal en `decCh`. */
function cifra(ent, dec, { tam = 24, alto, peso = 600, color = TINTA, intCh = 3, decCh = 2, subrayar = false, extra = {} } = {}) {
  const sub = subrayar ? `;text-decoration:underline;text-decoration-color:${AZUL};text-decoration-thickness:3px;text-underline-offset:${Math.round(tam * 0.14)}px;text-decoration-skip-ink:none` : '';
  return `<span style="${S({ fontFamily: MONO, fontSize: tam, lineHeight: (alto || Math.round(tam * 1.17)) + 'px', fontWeight: peso, color, whiteSpace: 'nowrap', display: 'inline-flex', ...extra })}"><span style="display:inline-block;width:${intCh}ch;text-align:right${sub}">${ent}</span><span style="display:inline-block;width:${decCh}ch;text-align:left${dec ? sub : ''}">${dec ? ',' + dec : ''}</span></span>`;
}

/** RIR de 0 a 4+. Círculo de 44 con 4 de separación: 48 de toque con hitSlop 2. */
function rir(n, elegido, gap = 4) {
  const st = S({
    boxSizing: 'border-box', width: 44, height: 44, borderRadius: '50%', padding: 0, cursor: 'pointer', margin: 0,
    border: elegido ? '0' : `1px solid ${c.stroke}`, background: elegido ? MENTA : c.surface,
    fontFamily: MONO, fontSize: 15, fontWeight: 600, color: TINTA, flex: 'none',
  });
  const lbl = n === '4+' ? 'RIR 4 o más' : `RIR ${n}`;
  return `<button type="button" aria-label="${lbl}" aria-pressed="${elegido ? 'true' : 'false'}" style="${st}">${n}</button>`;
}
const rirs = (gap = 4) => div(S({ display: 'flex', gap }), ['0', '1', '2', '3', '4+'].map((n) => rir(n, n === '2')).join(''));

/** Marca de un día de la semana. hecha: menta con visto; hoy: anillo menta profunda; resto: campo. */
function dia(letra, estado, tam = 22, conLetra = true) {
  let circ;
  if (estado === 'hecha') circ = span(S({ width: tam, height: tam, borderRadius: '50%', background: MENTA, display: 'flex', alignItems: 'center', justifyContent: 'center' }), icono('visto', Math.round(tam * 0.6), TINTA, 2.6));
  else if (estado === 'hoy') circ = span(S({ boxSizing: 'border-box', width: tam, height: tam, borderRadius: '50%', border: `2px solid ${MENTA_P}`, display: 'block' }), '');
  else circ = span(S({ width: tam, height: tam, borderRadius: '50%', background: c.field, display: 'block' }), '');
  return div(S({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: tam + 6 }), circ + (conLetra ? span(ts('nota', GRIS, { fontFamily: MONO, lineHeight: '14px', fontWeight: estado === 'hoy' ? 600 : 400, color: estado === 'hoy' ? TINTA : GRIS }), letra) : ''));
}

// ── Marco del teléfono ───────────────────────────────────────────────────────
function barraEstado() {
  const sen = `<svg aria-hidden="true" width="16" height="12" viewBox="0 0 16 12" style="display:block"><rect x="0" y="8" width="3" height="4" rx="1" fill="${GRIS}"></rect><rect x="4.3" y="5.5" width="3" height="6.5" rx="1" fill="${GRIS}"></rect><rect x="8.6" y="3" width="3" height="9" rx="1" fill="${GRIS}"></rect><rect x="13" y="0" width="3" height="12" rx="1" fill="${GRIS}"></rect></svg>`;
  const bat = `<svg aria-hidden="true" width="23" height="12" viewBox="0 0 23 12" style="display:block"><rect x="0.75" y="0.75" width="18.5" height="10.5" rx="2.5" fill="none" stroke="${GRIS}" stroke-width="1.5"></rect><rect x="3" y="3" width="11" height="6" rx="1" fill="${GRIS}"></rect><rect x="20.5" y="4" width="2" height="4" rx="1" fill="${GRIS}"></rect></svg>`;
  return abs(0, 0, W, 28, span(S({ fontFamily: SANS, fontSize: 13, lineHeight: '16px', fontWeight: 600, color: GRIS }), '19:32') + span(S({ display: 'flex', gap: 6, alignItems: 'center' }), sen + bat), {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
  });
}
const gestos = (fondo) => abs(H - 16, 0, W, 16, span(S({ display: 'block', width: 108, height: 4, borderRadius: 999, background: c.stroke, margin: '6px auto 0' }), ''), { background: fondo });
const pestanas = () => abs(812, 0, W, 64, barraPestanas({ ancho: W, activa: 'Hoy' })) + gestos(c.surface);
const raiz = (w, h, html, fondo = c.bg) => `<div style="${S({ width: w, height: h, position: 'relative', overflow: 'hidden', background: fondo })}">${html}</div>`;

// ═════════════════════════════════════════════════════════════════════════════
// A · LA PAUTA: sin tarjetas. Renglones parejos de borde a borde, cifras en columna a la derecha.
// ═════════════════════════════════════════════════════════════════════════════
const filaA = (h, html, extra = {}) =>
  div(S({ height: h, boxSizing: 'border-box', borderBottom: `1px solid ${c.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', ...extra }), html);

function aHoy() {
  const cab = div(
    S({ height: 96, boxSizing: 'border-box', borderBottom: `3px double ${TINTA}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 20px 12px' }),
    div('', etq('Martes 17 de noviembre', GRIS) + div(ts('titulo', TINTA, { marginTop: '4px' }), 'Hola, Camila')) +
      div(S({ textAlign: 'right' }), div(ts('cifraGrande', TINTA), '3') + div(ts('nota', GRIS), 'días de racha')),
  );
  const rutina = filaA(
    56,
    div('', div(ts('subtitulo', TINTA, { lineHeight: '24px' }), 'Pierna A') + div(ts('nota', GRIS), 'Semana 3 de 8 · 6 ejercicios · 20 series')) + etq('kg', GRIS, { alignSelf: 'flex-end', marginBottom: '6px' }),
  );
  const ej = EJ.map(([nom, ser, ent, dec], i) =>
    filaA(
      48,
      div('', div(ts('cuerpoMedio', TINTA, { lineHeight: '20px' }), esc(nom)) + div(ts('cifraTabla', GRIS, { fontSize: '13px', lineHeight: '16px' }), esc(ser))) +
        cifra(ent, dec, { tam: 24, subrayar: i === 0 }),
      i === 0 ? { borderBottom: '0' } : {},
    ),
  );
  // La nota va entre renglones, debajo del renglón que comenta.
  const notaFila = div(
    S({ height: 72, boxSizing: 'border-box', borderBottom: `1px solid ${c.line}`, display: 'flex', alignItems: 'flex-start', padding: '0 20px 0 36px' }),
    div(S({ flex: 1 }), nota({ quien: QUIEN, cuando: 'ayer', texto: NOTA })),
  );
  const mes = [
    ['Sesiones en noviembre', '9', '', ''],
    ['Volumen de noviembre, en toneladas', '38', '4', 't'],
    ['Récords de noviembre', '3', '', ''],
  ].map(([l, e, d], i) => filaA(48, div(ts('cuerpo', TINTA), l) + cifra(e, d, { tam: 24 }), i === 0 ? { borderTop: `1.5px solid ${TINTA}` } : {}));
  const semana = filaA(
    48,
    div(ts('cuerpo', TINTA), 'Esta semana') +
      div(S({ display: 'flex', gap: 2 }), DIAS.map((d, i) => dia(d, SEMANA[i], 18)).join('')) +
      div(S({ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end' }), span(ts('cifra', TINTA), '1') + span(ts('nota', GRIS, { marginLeft: '6px' }), 'de 4')),
  );
  const cuerpo = cab + rutina + ej[0] + notaFila + ej.slice(1).join('') + mes.join('') + semana;
  const accion = abs(740, 0, W, 72, btn({ tam: 'grande', texto: 'Empezar rutina', ancho: 372 }), { borderTop: `1px solid ${c.line}`, padding: '8px 20px', background: c.bg });
  return raiz(W, H, barraEstado() + abs(28, 0, W, 712, cuerpo) + accion + pestanas());
}

// Columnas de la bitácora de A: serie, kg, aire, reps, RIR, estado (372 en total).
const CA = { serie: 36, kg: 124, aire: 16, reps: 124, rir: 36, est: 36 };
function filaSerieA({ n, kg, reps, r, estado }) {
  const col = estado === 'pendiente' ? TENUE : TINTA;
  const peso = estado === 'pendiente' ? 400 : 500;
  return div(
    S({ height: 48, boxSizing: 'border-box', borderBottom: `1px solid ${c.line}`, display: 'flex', alignItems: 'center', padding: '0 20px' }),
    div(ts('cifraTabla', estado === 'pendiente' ? TENUE : GRIS, { width: CA.serie + 'px', flex: 'none' }), n) +
      div(ts('cifraFila', col, { width: CA.kg + 'px', flex: 'none', textAlign: 'right', fontWeight: peso }), kg) +
      div(S({ width: CA.aire, flex: 'none' }), '') +
      div(ts('cifraFila', col, { width: CA.reps + 'px', flex: 'none', textAlign: 'right', fontWeight: peso }), reps) +
      div(ts('cifraTabla', col, { width: CA.rir + 'px', flex: 'none', textAlign: 'right' }), r) +
      div(S({ width: CA.est, flex: 'none', display: 'flex', justifyContent: 'flex-end' }), marcaEstado(estado)),
  );
}
/** Un renglón que se toca entero (48 de alto, borde a borde). */
function filaBoton(html, label) {
  return `<button type="button"${label ? ` aria-label="${attr(label)}"` : ''} style="${S({ boxSizing: 'border-box', width: W, height: 48, margin: 0, border: 0, borderBottom: `1px solid ${c.line}`, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 20px', cursor: 'pointer', textAlign: 'left' })}">${html}</button>`;
}

function aRegistro() {
  const barra = div(
    S({ height: 56, boxSizing: 'border-box', borderBottom: `1px solid ${c.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 0 12px' }),
    btn({ v: 'borde', texto: 'Salir', ic: 'cruz', extra: { padding: '0 14px' } }) +
      div(S({ display: 'flex', alignItems: 'center', gap: 6 }), ico('reloj', 16, GRIS, 2.2) + span(ts('cifraFila', TINTA), '24:18')) +
      etq('Ejercicio 2 de 6', GRIS),
  );
  const titulo = div(
    S({ height: 96, boxSizing: 'border-box', borderBottom: `3px double ${TINTA}`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 20px 12px' }),
    div(ts('titulo', TINTA), 'Peso muerto rumano') + div(S({ marginTop: 4 }), span(ts('secundario', GRIS, { marginRight: '6px' }), 'Objetivo') + span(ts('cifraTabla', TINTA), `3 × 8 a 10 · RIR 2`)),
  );
  const sug = div(
    S({ height: 64, boxSizing: 'border-box', borderBottom: `1px solid ${c.line}`, display: 'flex', alignItems: 'center', padding: '0 20px' }),
    div(S({ flex: 1, borderLeft: `3px solid ${MENTA}`, paddingLeft: 14 }), div(S({ fontFamily: SANS, fontSize: 13, lineHeight: '18px', fontWeight: 700, color: GRIS }), 'Sugerencia de carga') + div(ts('cuerpo', TINTA, { fontSize: '15px', lineHeight: '22px', marginTop: '2px' }), esc(SUGERENCIA))),
  );
  const ultima = filaA(48, div('', div(ts('secundario', TINTA, { fontWeight: 600 }), 'Última vez') + div(ts('nota', GRIS), 'Martes 10 de noviembre')) + span(ts('cifraFila', TINTA), `67,5 × 10, 10, 9`));
  const e = (t, w, al = 'right') => div(ts('etiqueta', GRIS, { width: w + 'px', flex: 'none', textAlign: al }), t);
  const cabTabla = div(S({ height: 28, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: `1px solid ${c.line}` }), e('Serie', CA.serie, 'left') + e('kg', CA.kg) + div(S({ width: CA.aire }), '') + e('Reps', CA.reps) + e('RIR', CA.rir) + div(S({ width: CA.est }), ''));
  const s1 = filaSerieA({ n: '1', kg: '70', reps: '10', r: '2', estado: 'hecha' });
  // La fila activa es el mismo renglón, más alto: las cifras grandes caen en las mismas columnas.
  const col = (w, html, extra = {}) => div(S({ width: w, flex: 'none', ...extra }), html);
  const banda = div(
    S({ background: MENTA_S, borderTop: `1.5px solid ${MENTA_P}`, borderBottom: `1.5px solid ${MENTA_P}`, padding: '10px 20px 12px' }),
    etq('Serie 2 de 3 · en curso', MENTA_P) +
      div(
        S({ display: 'flex', alignItems: 'flex-end', height: 48, marginTop: 2 }),
        col(CA.serie, span(ts('cifraFila', TINTA), '2'), { paddingBottom: '6px' }) +
          col(CA.kg, span(ts('secundario', GRIS), 'kg') + span(ts('cifraGrande', TINTA), '70'), { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }) +
          col(CA.aire, '') +
          col(CA.reps, span(ts('secundario', GRIS), 'reps') + span(ts('cifraGrande', TINTA), '10'), { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }),
      ) +
      div(
        S({ display: 'flex', marginTop: 8 }),
        col(CA.serie, '') +
          col(CA.kg, redondo({ signo: 'menos', etiqueta: 'bajar 2,5 kg' }) + redondo({ signo: 'mas', etiqueta: 'subir 2,5 kg' }), { display: 'flex', justifyContent: 'space-between' }) +
          col(CA.aire, '') +
          col(CA.reps, redondo({ signo: 'menos', etiqueta: 'bajar 1 repetición' }) + redondo({ signo: 'mas', etiqueta: 'subir 1 repetición' }), { display: 'flex', justifyContent: 'space-between' }),
      ) +
      div(S({ display: 'flex', alignItems: 'center', marginTop: 12 }), col(CA.serie, etq('RIR', GRIS)) + rirs()) +
      div(S({ display: 'flex', gap: 8, marginTop: 14 }), btn({ tam: 'grande', texto: 'Serie hecha', extra: { flex: '1' } }) + btn({ v: 'peligro', tam: 'grande', texto: 'Fallé la serie', ic: 'error', extra: { padding: '0 18px' } })),
  );
  const s3 = filaSerieA({ n: '3', kg: '70', reps: '10', r: '–', estado: 'pendiente' });
  const obs = filaBoton(div(S({ display: 'flex', alignItems: 'center', gap: 10 }), ico('lapiz', 20, TINTA, 2) + span(ts('cuerpoMedio', TINTA), 'Observación o dolor')) + ico('mas', 20, GRIS, 2.2));
  const sig = filaBoton(
    div('', div(ts('nota', GRIS), 'Siguiente') + div(ts('cuerpoMedio', TINTA, { lineHeight: '20px' }), 'Prensa · 3 × 10 a 12')) + div(S({ display: 'flex', alignItems: 'center', gap: 8 }), cifra('140', '', { tam: 17, peso: 500, decCh: 0 }) + span(ts('nota', GRIS), 'kg') + ico('sig', 20, GRIS, 2.2)),
    'Ir al siguiente ejercicio: Prensa',
  );
  return raiz(W, H, barraEstado() + abs(28, 0, W, 848, barra + titulo + sug + ultima + cabTabla + s1 + banda + s3 + obs + sig) + gestos(c.bg));
}

// ═════════════════════════════════════════════════════════════════════════════
// B · EL MARGEN: una línea azul fija a 136. A la izquierda, la voz (entrenador, sugerencia,
// contexto, etiquetas y acciones secundarias), a la altura del renglón que comenta. A la
// derecha, el registro.
// ═════════════════════════════════════════════════════════════════════════════
const ML = 136; // línea del margen
const MX = 16; // texto del margen
const MW = 108;
const RX = 152; // página
const RW = 240;
const lineaMargen = (alto) => abs(0, ML, 3, alto, '', { background: AZUL }); // raya de 3, la del margen en la guía
const reglaB = (top, color = c.line) => regla(top, ML + 3, W - ML - 3, color);
const dobleB = (top) => dobleRegla(top, ML + 3, W - ML - 3);
const margen = (top, html, extra = {}) => abs(top, MX, MW, undefined, html, extra);
const rotulo = (top, t, sub) => margen(top, div(ts('secundario', GRIS, { fontWeight: 600 }), t) + (sub ? div(ts('nota', GRIS), sub) : ''), { textAlign: 'right' });

function bHoy() {
  let h = lineaMargen(812);
  h += margen(52, etq('Martes', GRIS) + div(ts('nota', GRIS, { marginTop: '2px' }), '17 de noviembre'));
  h += abs(50, RX, RW, 40, div(ts('titulo', TINTA), 'Hola, Camila'));
  h += dobleB(104);
  // Rutina
  h += margen(124, etq('Semana', GRIS) + div(ts('cifraFila', TINTA), '3 de 8'));
  h += abs(118, RX, RW, 56, div('', div(ts('subtitulo', TINTA, { lineHeight: '24px' }), 'Pierna A') + div(ts('nota', GRIS), '6 ejercicios · 20 series')) + etq('kg', GRIS, { alignSelf: 'flex-end', marginBottom: '6px' }), { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
  h += reglaB(176);
  EJ.forEach(([nom, ser, ent, dec], i) => {
    const y = 176 + i * 56;
    h += abs(y, RX, RW, 56, div(S({ minWidth: 0 }), div(ts('cuerpoMedio', TINTA, { lineHeight: '20px' }), esc(nom)) + div(ts('cifraTabla', GRIS, { fontSize: '13px', lineHeight: '16px', marginTop: '2px' }), esc(ser))) + cifra(ent, dec, { tam: 24, subrayar: i === 0 }), {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
    });
    h += reglaB(y + 56);
  });
  // La nota del entrenador, a la altura de la sentadilla que comenta. La línea azul hace de raya.
  h += margen(186, div(S({ fontFamily: SANS, fontSize: 13, lineHeight: '18px', fontWeight: 700, color: AZUL_P }), `Nota de ${esc(QUIEN)} · ayer`) + div(ts('secundario', TINTA, { marginTop: '6px' }), esc(NOTA)));
  // Acción
  h += margen(536, div(ts('nota', GRIS), 'Cerca de') + div(ts('cifraTabla', TINTA), '70 min'), { textAlign: 'right' });
  h += abs(528, RX, RW, 56, btn({ tam: 'grande', texto: 'Empezar rutina', ancho: RW }));
  // Semana y racha
  h += reglaB(608);
  h += margen(620, div(ts('cifra', TINTA), '3') + div(ts('nota', GRIS), 'días de racha'));
  h += abs(620, RX, RW, 24, span(ts('cuerpoMedio', TINTA), 'Esta semana') + div(S({ display: 'flex', alignItems: 'baseline', gap: 6 }), span(ts('cifraFila', TINTA), '1') + span(ts('nota', GRIS), 'de 4')), { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' });
  h += abs(654, RX - 3, RW + 6, 50, DIAS.map((d, i) => dia(d, SEMANA[i], 28)).join(''), { display: 'flex', justifyContent: 'space-between' });
  // Mes
  h += reglaB(716);
  h += margen(730, etq('Noviembre', GRIS));
  h += abs(726, RX, RW, 60, [['9', '', 'sesiones'], ['38,4', 't', 'volumen'], ['3', '', 'récords']].map(([n, u, l]) => div(S({ width: 80 }), div(S({ display: 'flex', alignItems: 'baseline', gap: 4 }), span(ts('cifra', TINTA), n) + (u ? span(ts('nota', GRIS), u) : '')) + div(ts('nota', GRIS), l))).join(''), { display: 'flex' });
  return raiz(W, H, barraEstado() + h + pestanas());
}

// Columnas de la bitácora de B, dentro de la página (240).
const CB = { serie: 32, kg: 72, reps: 64, rir: 36, est: 36 };
function filaSerieB(top, { n, kg, reps, r, estado }) {
  const col = estado === 'pendiente' ? TENUE : TINTA;
  const peso = estado === 'pendiente' ? 400 : 500;
  const marca =
    estado === 'curso'
      ? span(S({ boxSizing: 'border-box', width: 28, height: 28, borderRadius: '50%', border: `2px solid ${MENTA_P}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }), span(S({ width: 10, height: 10, borderRadius: '50%', background: MENTA_P, display: 'block' }), ''))
      : marcaEstado(estado);
  return abs(
    top, RX, RW, 48,
    div(ts('cifraTabla', estado === 'pendiente' ? TENUE : GRIS, { width: CB.serie + 'px', flex: 'none' }), n) +
      div(ts('cifraFila', col, { width: CB.kg + 'px', flex: 'none', textAlign: 'right', fontWeight: peso }), kg) +
      div(ts('cifraFila', col, { width: CB.reps + 'px', flex: 'none', textAlign: 'right', fontWeight: peso }), reps) +
      div(ts('cifraTabla', col, { width: CB.rir + 'px', flex: 'none', textAlign: 'right' }), r) +
      div(S({ width: CB.est, flex: 'none', display: 'flex', justifyContent: 'flex-end' }), marca),
    { display: 'flex', alignItems: 'center' },
  );
}

function bRegistro() {
  let h = lineaMargen(876);
  // Cabecera: salir al margen, tiempo y avance en la página
  h += margen(32, btn({ v: 'borde', texto: 'Salir', ic: 'cruz', extra: { padding: '0 14px' } }));
  h += abs(32, RX, RW, 48, span(ts('cifra', TINTA), '24:18') + etq('Ejercicio 2 de 6', GRIS), { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
  h += reglaB(88);
  // Ejercicio. Al margen, la última vez como una cuenta chica.
  h += abs(100, RX, RW, undefined, div(ts('titulo', TINTA), 'Peso muerto rumano') + div(S({ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 6 }), span(ts('nota', GRIS), 'Objetivo') + span(ts('cifraTabla', TINTA), '3 × 8 a 10 · RIR 2')));
  h += margen(102, div(ts('nota', GRIS, { fontWeight: 700 }), 'Última vez') + ['67,5 × 10', '67,5 × 10', '67,5 × 9'].map((t) => div(ts('cifraTabla', TINTA, { fontSize: '13px', lineHeight: '18px' }), t)).join(''));
  h += dobleB(200);
  // Tabla de series
  const e = (t, w, al = 'right') => div(ts('etiqueta', GRIS, { width: w + 'px', flex: 'none', textAlign: al }), t);
  h += abs(208, RX, RW, 28, e('Serie', CB.serie, 'left') + e('kg', CB.kg) + e('Reps', CB.reps) + e('RIR', CB.rir) + div(S({ width: CB.est }), ''), { display: 'flex', alignItems: 'center' });
  h += reglaB(236);
  h += filaSerieB(236, { n: '1', kg: '70', reps: '10', r: '2', estado: 'hecha' });
  h += reglaB(284);
  h += abs(285, ML + 3, W - ML - 3, 47, '', { background: MENTA_S });
  h += filaSerieB(284, { n: '2', kg: '70', reps: '10', r: '–', estado: 'curso' });
  h += reglaB(332);
  h += filaSerieB(332, { n: '3', kg: '70', reps: '10', r: '–', estado: 'pendiente' });
  h += reglaB(380);
  // La sugerencia, al margen de la tabla que va a llenar.
  h += margen(214, div(S({ borderLeft: `3px solid ${MENTA}`, paddingLeft: 10 }), div(S({ fontFamily: SANS, fontSize: 13, lineHeight: '18px', fontWeight: 700, color: GRIS }), 'Sugerencia de carga') + div(ts('nota', TINTA, { marginTop: '4px' }), esc(SUGERENCIA))));
  // La pluma: la serie 2 se escribe acá. Etiquetas y salidas al margen.
  h += abs(396, ML + 3, W - ML - 3, 316, '', { background: MENTA_S, borderTop: `1.5px solid ${MENTA_P}`, borderBottom: `1.5px solid ${MENTA_P}` });
  h += abs(410, RX, RW, 16, etq('Serie 2 de 3 · en curso', MENTA_P));
  const step = (v, a, b) => div(S({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }), redondo({ signo: 'menos', etiqueta: a }) + span(ts('cifraGrande', TINTA, { width: '112px', textAlign: 'center' }), v) + redondo({ signo: 'mas', etiqueta: b }));
  h += abs(436, RX, RW, 56, step('70', 'bajar 2,5 kg', 'subir 2,5 kg'));
  h += rotulo(442, 'kg', `de a 2,5`);
  h += abs(504, RX, RW, 56, step('10', 'bajar 1 repetición', 'subir 1 repetición'));
  h += rotulo(510, 'reps', 'de a 1');
  h += abs(576, RX, RW, 44, rirs(5));
  h += rotulo(576, 'RIR', 'reps en reserva');
  h += abs(640, RX, RW, 56, btn({ tam: 'grande', texto: 'Serie hecha', ancho: RW }));
  // Los botones del margen miden 116 (de 12 a 128): 8 de aire hasta la línea.
  h += abs(640, 12, 116, 56, btn({ v: 'peligro', tam: 'grande', texto: 'Fallé la serie', ic: 'error', ancho: 116, multilinea: true }));
  h += abs(724, 12, 116, 56, btn({ v: 'borde', tam: 'grande', texto: 'Observación o dolor', ancho: 116, multilinea: true }));
  h += abs(728, RX, RW, 48, `<button type="button" aria-label="Ir al siguiente ejercicio: Prensa" style="${S({ boxSizing: 'border-box', width: RW, height: 48, margin: 0, padding: 0, border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' })}">${div('', div(ts('nota', GRIS), 'Siguiente') + div(ts('cuerpoMedio', TINTA, { lineHeight: '20px' }), 'Prensa · 140 kg'))}${ico('sig', 20, GRIS, 2.2)}</button>`);
  h += reglaB(788);
  return raiz(W, H, barraEstado() + h + gestos(c.bg));
}

// ═════════════════════════════════════════════════════════════════════════════
// C · LA BALANZA: la cifra de la próxima serie ocupa la pantalla, como el visor de una pesa.
// Todo lo demás se achica y se agrupa abajo.
// ═════════════════════════════════════════════════════════════════════════════
function enorme(txt, tam, { subrayar = false } = {}) {
  const sub = subrayar ? `;text-decoration:underline;text-decoration-color:${AZUL};text-decoration-thickness:3px;text-underline-offset:10px;text-decoration-skip-ink:none` : '';
  return `<span style="font-family:${MONO};font-size:${tam}px;line-height:${tam}px;font-weight:600;letter-spacing:-${Math.round(tam / 64)}px;color:${TINTA};white-space:nowrap${sub}">${txt}</span>`;
}

function cHoy() {
  let h = '';
  h += abs(36, 20, 372, 44, div('', div(ts('cuerpoMedio', TINTA), 'Hola, Camila') + div(ts('nota', GRIS), 'Martes 17 de noviembre')) + div(S({ textAlign: 'right' }), div(S({ display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'flex-end' }), span(ts('cifra', TINTA), '3') + span(ts('nota', GRIS), 'días')) + div(ts('nota', GRIS), 'de racha')), {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  });
  h += regla(92, 20, 372);
  h += abs(108, 20, 372, 16, etq('Hoy · Pierna A · semana 3 de 8', GRIS));
  h += abs(130, 20, 372, 22, span(ts('tituloTarjeta', TINTA), 'Sentadilla') + span(ts('cifraTabla', GRIS, { marginLeft: '10px' }), '4 × 6 a 8'));
  h += abs(160, 14, 386, 140, enorme('82,5', 136, { subrayar: true }) + span(ts('cifra', GRIS, { marginLeft: '6px' }), 'kg'), { display: 'flex', alignItems: 'baseline' });
  h += abs(314, 20, 372, undefined, nota({ quien: QUIEN, cuando: 'ayer', texto: NOTA }));
  h += abs(400, 20, 372, 56, btn({ tam: 'grande', texto: 'Empezar rutina', ancho: 372 }));
  // Lo subordinado: el resto de la rutina, en chico.
  h += abs(484, 20, 372, 16, etq('Después', GRIS) + etq('kg', GRIS, { width: '72px', textAlign: 'right' }), { display: 'flex', justifyContent: 'space-between' });
  EJ.slice(1).forEach(([nom, ser, ent, dec], i) => {
    const y = 506 + i * 36;
    h += regla(y, 20, 372);
    h += abs(y, 20, 372, 36, span(ts('secundario', TINTA, { flex: '1' }), esc(nom)) + span(ts('nota', GRIS, { fontFamily: MONO, width: '96px' }), esc(ser)) + cifra(ent, dec, { tam: 15, peso: 500, intCh: 3, decCh: 2 }), {
      display: 'flex', alignItems: 'center',
    });
  });
  h += regla(686, 20, 372);
  // Semana y mes, en una franja.
  h += abs(706, 20, 372, 40, etq('Semana', GRIS, { width: '72px' }) + div(S({ display: 'flex', gap: 4 }), DIAS.map((d, i) => dia(d, SEMANA[i], 18)).join('')) + div(S({ display: 'flex', alignItems: 'baseline', gap: 5 }), span(ts('cifraFila', TINTA), '1') + span(ts('nota', GRIS), 'de 4')), {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  });
  h += abs(760, 20, 372, 32, etq('Noviembre', GRIS, { width: '86px' }) + [['9', 'sesiones'], ['38,4 t', 'volumen'], ['3', 'récords']].map(([n, l]) => div(S({ display: 'flex', alignItems: 'baseline', gap: 5 }), span(ts('cifraFila', TINTA), n) + span(ts('nota', GRIS), l))).join(''), {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  });
  return raiz(W, H, barraEstado() + h + pestanas());
}

function cRegistro() {
  let h = '';
  h += abs(28, 12, 380, 48, btn({ v: 'borde', texto: 'Salir', ic: 'cruz', extra: { padding: '0 14px' } }) + div(S({ display: 'flex', alignItems: 'center', gap: 6 }), ico('reloj', 16, GRIS, 2.2) + span(ts('cifraFila', TINTA), '24:18')) + etq('Ejercicio 2 de 6', GRIS), {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  });
  h += abs(88, 20, 372, 44, div(ts('tituloTarjeta', TINTA), 'Peso muerto rumano') + div(ts('nota', GRIS, { fontFamily: MONO }), 'Serie 2 de 3 · objetivo 3 × 8 a 10 · RIR 2'));
  // Las dos cifras de la serie, como el visor de una balanza. Más y menos a la derecha, en el pulgar.
  const visor = (top, v, u, a, b) =>
    abs(top, 14, 378, 144, div(S({ display: 'flex', alignItems: 'baseline' }), enorme(v, 144) + span(ts('cifra', GRIS, { marginLeft: '8px' }), u)) + div(S({ display: 'flex', flexDirection: 'column', gap: 12 }), redondo({ signo: 'mas', etiqueta: b }) + redondo({ signo: 'menos', etiqueta: a })), {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    });
  h += visor(138, '70', 'kg', 'bajar 2,5 kg', 'subir 2,5 kg');
  h += regla(286, 20, 372);
  h += visor(290, '10', 'reps', 'bajar 1 repetición', 'subir 1 repetición');
  h += abs(446, 20, 372, 44, etq('RIR', GRIS) + rirs(4), { display: 'flex', alignItems: 'center', justifyContent: 'space-between' });
  h += abs(504, 20, 372, 56, btn({ tam: 'grande', texto: 'Serie hecha', extra: { flex: '1' } }) + btn({ v: 'peligro', tam: 'grande', texto: 'Fallé la serie', ic: 'error', extra: { padding: '0 18px' } }), { display: 'flex', gap: 8 });
  // Lo subordinado: sugerencia, última vez y la tabla, en chico.
  h += abs(578, 20, 372, 44, div(S({ borderLeft: `3px solid ${MENTA}`, paddingLeft: 12 }), div(S({ fontFamily: SANS, fontSize: 13, lineHeight: '18px', fontWeight: 700, color: GRIS }), 'Sugerencia de carga') + div(ts('secundario', TINTA, { lineHeight: '20px', marginTop: '2px' }), esc(SUGERENCIA))));
  h += abs(630, 20, 372, 20, span(ts('nota', GRIS), 'Última vez') + span(ts('cifraTabla', TINTA, { fontSize: '13px', lineHeight: '18px' }), '67,5 × 10, 10, 9'), { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' });
  const fila = (top, n, txt, r, estado) => {
    const col = estado === 'pendiente' ? TENUE : TINTA;
    const marca = estado === 'curso'
      ? span(S({ boxSizing: 'border-box', width: 28, height: 28, borderRadius: '50%', border: `2px solid ${MENTA_P}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }), span(S({ width: 10, height: 10, borderRadius: '50%', background: MENTA_P, display: 'block' }), ''))
      : marcaEstado(estado);
    return regla(top, 20, 372) + abs(top, 20, 372, 48, span(ts('cifraTabla', estado === 'pendiente' ? TENUE : GRIS, { width: '32px' }), n) + span(ts('cifraTabla', col, { flex: '1' }), txt) + span(ts('cifraTabla', col, { width: '72px' }), r) + marca, {
      display: 'flex', alignItems: 'center', background: estado === 'curso' ? MENTA_S : undefined, padding: estado === 'curso' ? '0 0 0 0' : undefined,
    });
  };
  h += fila(658, '1', '70 × 10', 'RIR 2', 'hecha');
  h += fila(706, '2', 'en curso', '', 'curso');
  h += fila(754, '3', '70 × 10', '', 'pendiente');
  h += regla(802, 20, 372);
  h += abs(812, 20, 372, 48, btn({ v: 'borde', texto: 'Observación o dolor', ic: 'lapiz', ancho: 372 }));
  return raiz(W, H, barraEstado() + h + gestos(c.bg));
}

// ═════════════════════════════════════════════════════════════════════════════
// ANTIRREFERENTES: lo que la marca no hace, en esquemas grises, y las tres composiciones.
// ═════════════════════════════════════════════════════════════════════════════
const G1 = c.field;
const G2 = c.stroke;
const telefono = (svg) => div(S({ width: 168, height: 364, borderRadius: 16, border: `1.5px solid ${G2}`, background: c.surface, overflow: 'hidden', boxSizing: 'border-box' }), svg);
const svgT = (inner) => `<svg aria-hidden="true" width="165" height="361" viewBox="0 0 165 361" style="display:block">${inner}</svg>`;
const rect = (x, y, w, h, fill, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${extra}></rect>`;

function esqPila() {
  let s = rect(12, 16, 76, 10, G2, 3) + rect(130, 14, 22, 14, G1, 7);
  for (let i = 0; i < 5; i++) {
    const y = 40 + i * 58;
    s += rect(12, y + 3, 141, 48, '#DCE2DF', 14) + rect(12, y, 141, 48, c.surface, 14, ` stroke="${c.line}" stroke-width="1"`);
    s += `<circle cx="34" cy="${y + 24}" r="11" fill="${G1}"></circle>` + rect(54, y + 15, 62, 7, G2, 3) + rect(54, y + 28, 40, 6, G1, 3) + rect(126, y + 18, 16, 12, G1, 4);
  }
  s += rect(0, 331, 165, 30, c.surface, 0, ` stroke="${c.line}"`);
  for (let i = 0; i < 5; i++) s += `<circle cx="${20 + i * 31}" cy="346" r="5" fill="${G1}"></circle>`;
  return svgT(s);
}
function esqAnillos() {
  const anillo = (r, w, col, pct) => {
    const L = 2 * Math.PI * r;
    return `<circle cx="82" cy="82" r="${r}" fill="none" stroke="${G1}" stroke-width="${w}"></circle><circle cx="82" cy="82" r="${r}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(L * pct).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 82 82)"></circle>`;
  };
  let s = anillo(52, 10, G2, 0.78) + anillo(38, 10, GRIS, 0.55) + anillo(24, 10, '#A9B5B0', 0.9);
  [[12, 156], [86, 156], [12, 214], [86, 214]].forEach(([x, y]) => {
    s += rect(x, y, 67, 50, G1, 12) + rect(x + 10, y + 12, 30, 12, G2, 3) + rect(x + 10, y + 32, 44, 5, '#C9D3CE', 2);
  });
  [30, 52, 22, 64, 44, 58, 36].forEach((hh, i) => {
    s += rect(16 + i * 20, 330 - hh, 12, hh, i === 3 ? G2 : '#C9D3CE', 3);
  });
  return svgT(s);
}
function esqHeroe() {
  let s = rect(0, 0, 165, 206, '#C9D3CE');
  s += `<path d="M0 0L165 206M165 0L0 206" stroke="${c.surface}" stroke-width="1.5" opacity="0.7"></path>`;
  s += rect(22, 222, 121, 14, G2, 4) + rect(38, 244, 89, 14, G2, 4) + rect(30, 270, 105, 6, G1, 3) + rect(46, 282, 73, 6, G1, 3);
  s += rect(14, 306, 137, 40, GRIS, 20);
  return svgT(s);
}
function esqPlanilla() {
  let s = '';
  const filas = 13;
  const cols = [8, 48, 88, 126, 157];
  for (let r = 0; r <= filas; r++) s += rect(8, 18 + r * 24, 149, 1, G2);
  cols.forEach((x) => (s += rect(x, 18, 1, filas * 24 + 1, G2)));
  for (let r = 0; r < filas; r++) for (let k = 0; k < 4; k++) s += rect(cols[k] + 6, 18 + r * 24 + 9, [28, 26, 24, 20][k], 6, G1, 1);
  return svgT(s);
}
function miniComp(tipo) {
  let s = '';
  if (tipo === 'A') {
    s += rect(0, 0, 56, 121, c.bg);
    for (let i = 0; i < 12; i++) s += rect(0, 14 + i * 8, 56, 0.8, G2);
    for (let i = 0; i < 11; i++) s += rect(4, 16 + i * 8, i % 3 === 0 ? 18 : 22, 3, GRIS) + rect(40, 16 + i * 8, 12, 4, TINTA);
    s += rect(4, 104, 48, 7, MENTA, 2);
  } else if (tipo === 'B') {
    s += rect(0, 0, 56, 121, c.bg) + rect(18, 0, 1, 121, AZUL);
    for (let i = 0; i < 6; i++) s += rect(19, 22 + i * 10, 37, 0.8, G2) + rect(22, 24 + i * 10, 18, 3, GRIS) + rect(44, 24 + i * 10, 9, 4, TINTA);
    for (let i = 0; i < 7; i++) s += rect(3, 24 + i * 5, i === 6 ? 8 : 12, 2, AZUL_P);
    s += rect(22, 88, 32, 7, MENTA, 2) + rect(3, 6, 10, 3, GRIS);
  } else {
    s += rect(0, 0, 56, 121, c.bg) + rect(4, 8, 30, 3, GRIS) + rect(4, 18, 40, 22, TINTA, 2) + rect(4, 42, 40, 1.5, AZUL);
    s += rect(4, 48, 3, 9, AZUL) + rect(9, 49, 38, 2.5, GRIS) + rect(9, 54, 30, 2.5, GRIS) + rect(4, 62, 48, 7, MENTA, 2);
    for (let i = 0; i < 5; i++) s += rect(4, 76 + i * 6, 34, 2, '#A9B5B0') + rect(44, 76 + i * 6, 8, 2, GRIS);
  }
  return `<svg aria-hidden="true" width="56" height="121" viewBox="0 0 56 121" style="display:block;flex:none;border:1px solid ${G2};border-radius:6px;overflow:hidden">${s}</svg>`;
}

function antirreferentes() {
  const AW = 1200;
  const AH = 892;
  const cab =
    etq('Composición · lo que la marca no hace', GRIS) +
    `<h1 style="${S({ margin: '10px 0 0', fontFamily: SANS, fontSize: 36, lineHeight: '42px', fontWeight: 700, letterSpacing: '-0.4px', color: TINTA })}">Antirreferentes</h1>` +
    `<p style="${S({ margin: '10px 0 0', width: 720, fontFamily: SANS, fontSize: 17, lineHeight: '26px', color: GRIS })}">Cuatro pantallas genéricas de fitness, en gris. Si una composición de GymTrack se confunde con alguna de estas al desenfocarla, no sirve.</p>`;
  const esq = [
    ['La pila de tarjetas', 'Cada dato en su caja y todas pesan igual: la cifra que importa se pierde entre bordes y sombras.', esqPila()],
    ['El panel de anillos', 'Doce métricas peleando por el ojo. Mide actividad y no dice qué levantar en la próxima serie.', esqAnillos()],
    ['El héroe centrado', 'Un cuerpo de portada y un botón que grita. Promete transformación y no dice cuántos kilos.', esqHeroe()],
    ['La planilla gris', 'El riesgo de la propia libreta: todo en columnas y nada manda. Es volver al Excel de las once de la noche.', esqPlanilla()],
  ]
    .map(([n, p, s]) => div(S({ width: 168, flex: 'none' }), telefono(s) + div(ts('tituloTarjeta', TINTA, { marginTop: '16px' }), n) + div(ts('secundario', GRIS, { marginTop: '6px' }), p)))
    .join('');
  const comps = [
    ['A', 'La pauta', 'la pila de tarjetas', 'Sin cajas. Renglones parejos de borde a borde y las cifras en columna a la derecha, con la coma alineada.', 'el libro de caja del almacén'],
    ['B', 'El margen', 'el entrenador metido en un chat o en una tarjeta más', 'Una línea azul fija. Al margen, la voz del entrenador y la sugerencia, a la altura del renglón que comentan.', 'la prueba corregida con lápiz azul'],
    ['C', 'La balanza', 'el panel de anillos', 'Una sola cifra ocupa la pantalla, como el visor de una pesa. Todo lo demás se achica y baja.', 'el visor de la pesa de la feria'],
  ]
    .map(([l, n, contra, idea, viene]) =>
      div(
        S({ display: 'flex', gap: 14, padding: '18px 0', borderTop: `1px solid ${c.line}` }),
        miniComp(l) +
          div(
            S({ flex: 1 }),
            div(S({ display: 'flex', alignItems: 'baseline', gap: 8 }), span(ts('cifra', TINTA), l) + span(ts('subtitulo', TINTA), n)) +
              div(ts('nota', TINTA, { marginTop: '6px', fontWeight: 700 }), `Pelea con ${contra}.`) +
              div(ts('nota', GRIS, { marginTop: '4px' }), idea) +
              div(ts('nota', GRIS, { marginTop: '4px' }), `Viene de ${viene}.`),
          ),
      ),
    )
    .join('');
  const cuerpo =
    abs(56, 56, 760, 160, cab) +
    abs(236, 56, 744, 600, esq, { display: 'flex', gap: 24 }) +
    abs(236, 848, 296, 600, etq('Las tres composiciones', GRIS, { marginBottom: '10px' }) + comps) +
    abs(AH - 56 - 18, 56, 1088, 18, div(ts('nota', GRIS), 'Ninguna de las tres usa sombras, anillos ni fotos. El riesgo de cada una está en las notas de composición.'));
  return raiz(AW, AH, cuerpo);
}

// ── Ensamblado ───────────────────────────────────────────────────────────────
const FUENTES = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;display=swap';
const COMPS = [
  { letra: 'A', nombre: 'La pauta', contra: 'la pila de tarjetas redondeadas' },
  { letra: 'B', nombre: 'El margen', contra: 'el entrenador como una tarjeta o un chat más' },
  { letra: 'C', nombre: 'La balanza', contra: 'el panel de anillos y métricas que pesan igual' },
];
const TABLEROS = [
  { archivo: 'CompAHoy.dc.html', titulo: 'Composición A · La pauta · Hoy', nombre: 'A · La pauta · Hoy', w: W, h: H, html: aHoy, x: 0 },
  { archivo: 'CompARegistro.dc.html', titulo: 'Composición A · La pauta · Registro', nombre: 'A · La pauta · Registro de sesión', w: W, h: H, html: aRegistro, x: 492 },
  { archivo: 'CompBHoy.dc.html', titulo: 'Composición B · El margen · Hoy', nombre: 'B · El margen · Hoy', w: W, h: H, html: bHoy, x: 1100 },
  { archivo: 'CompBRegistro.dc.html', titulo: 'Composición B · El margen · Registro', nombre: 'B · El margen · Registro de sesión', w: W, h: H, html: bRegistro, x: 1592 },
  { archivo: 'CompCHoy.dc.html', titulo: 'Composición C · La balanza · Hoy', nombre: 'C · La balanza · Hoy', w: W, h: H, html: cHoy, x: 2200 },
  { archivo: 'CompCRegistro.dc.html', titulo: 'Composición C · La balanza · Registro', nombre: 'C · La balanza · Registro de sesión', w: W, h: H, html: cRegistro, x: 2692 },
  { archivo: 'CompAntirreferentes.dc.html', titulo: 'Composición · Antirreferentes', nombre: 'Antirreferentes y las tres composiciones', w: 1200, h: 892, html: antirreferentes, x: 3300 },
];

function dc(t, cuerpo) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${t.titulo}</title>
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
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${t.w},"height":${t.h}}}'>
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
  const marco = (i, filtro) => {
    const t = TABLEROS[i];
    const dentro = filtro ? `<div style="filter:blur(12px)">${partes[i]}</div>` : partes[i];
    return `<figure style="${S({ margin: 0 })}"><figcaption style="${S({ fontFamily: MONO, fontSize: 13, lineHeight: '18px', color: GRIS, margin: '0 0 8px' })}">${esc(t.archivo)} · ${t.w} × ${t.h}</figcaption><div style="${S({ width: t.w, height: t.h, overflow: 'hidden', boxShadow: `0 0 0 1px ${c.stroke}` })}">${dentro}</div></figure>`;
  };
  const columna = (k, filtro) => {
    const co = COMPS[k];
    return `<div style="${S({ width: W, flex: 'none' })}"><div style="${S({ minHeight: 64, margin: '0 0 12px' })}"><div style="${ts('subtitulo', TINTA)}">${co.letra} · ${esc(co.nombre)}</div><div style="${ts('secundario', GRIS)}">Pelea con ${esc(co.contra)}.</div></div><div style="${S({ display: 'flex', flexDirection: 'column', gap: 32 })}">${marco(k * 2, filtro)}${marco(k * 2 + 1, filtro)}</div></div>`;
  };
  const fila = (filtro) => `<div style="${S({ display: 'flex', gap: 48, alignItems: 'flex-start' })}">${[0, 1, 2].map((k) => columna(k, filtro)).join('')}</div>`;
  const h2 = (id, t, p) => `<h2 id="${id}" style="${S({ margin: '72px 0 6px', fontFamily: SANS, fontSize: 24, lineHeight: '30px', fontWeight: 700, color: TINTA })}">${t}</h2><p style="${S({ margin: '0 0 24px', maxWidth: 820, fontFamily: SANS, fontSize: 16, lineHeight: '24px', color: GRIS })}">${p}</p>`;
  const enlace = (href, t) => `<a href="#${href}" style="${S({ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: MENTA_P, marginRight: 20 })}">${t}</a>`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Composición GymTrack</title>
<link href="${FUENTES}" rel="stylesheet">
<style>body{margin:0;background:${c.field};padding:40px;min-width:1332px}</style>
</head>
<body>
<header><div style="${ts('etiqueta', GRIS)}">Fase 5.5 · tres composiciones para descartar</div><h1 style="${S({ margin: '6px 0 10px', fontFamily: SANS, fontSize: 32, lineHeight: '38px', fontWeight: 700, color: TINTA })}">Composición GymTrack</h1><p style="${S({ margin: '0 0 14px', maxWidth: 820, fontFamily: SANS, fontSize: 16, lineHeight: '24px', color: GRIS })}">Tres maneras de ocupar la pantalla con los mismos tokens y el mismo contenido. No se mezclan: se deja viva una y se descartan dos.</p><nav aria-label="Secciones">${enlace('nitidas', 'Las tres composiciones')}${enlace('antirreferentes', 'Antirreferentes')}${enlace('desenfoque', 'Prueba de desenfoque')}</nav></header>
${h2('nitidas', 'Las tres composiciones', 'Arriba, Hoy. Abajo, el registro de sesión. Cada columna es una composición.')}
${fila(false)}
${h2('antirreferentes', 'Antirreferentes', 'Lo que la marca no hace y contra qué pelea cada composición.')}
${marco(6, false)}
${h2('desenfoque', 'Prueba de desenfoque', 'Las mismas seis pantallas con <code>filter: blur(12px)</code>. Sin leer nada, cada columna tiene que reconocerse por su silueta, y ninguna tiene que parecerse a los esquemas grises.')}
${fila(true)}
<div style="${S({ marginTop: 40 })}">${marco(6, true)}</div>
</body>
</html>
`;
}

function main() {
  fs.mkdirSync(CARPETA, { recursive: true });
  const partes = TABLEROS.map((t) => t.html());
  TABLEROS.forEach((t, i) => fs.writeFileSync(path.join(CARPETA, t.archivo), dc(t, partes[i])));
  fs.writeFileSync(path.join(AQUI, 'especimen-composicion.html'), especimen(partes));
  const boards = {};
  for (const t of TABLEROS) boards[t.archivo] = { x: t.x, y: 0, w: t.w, h: t.h, title: t.nombre, page: 'composicion' };
  const json = {
    page: { id: 'composicion', name: '3 · Composición' },
    boards,
    order: TABLEROS.map((t) => t.archivo),
    notes: { mc0: { x: 0, y: -300, text: 'Composición: elige cómo se arma una pantalla', kind: 'title1', maxW: 4200, page: 'composicion' } },
  };
  fs.writeFileSync(path.join(AQUI, 'composicion-tableros.json'), JSON.stringify(json, null, 2) + '\n');
  console.log(TABLEROS.map((t) => `${t.archivo} ${t.w}×${t.h}`).join('\n'));
}
main();
