// ─────────────────────────────────────────────────────────────────────────────
// Piezas de los tableros · Zona: Diseño · herramienta de la Fase 5 de marca
//
// Qué hace: arma en HTML estático, con estilos en línea, cada pieza del sistema propuesto
// (botones, campos, filas de bitácora, avisos, la nota al margen, el récord, el descanso, la
// barra de pestañas) para dibujarla en los tableros del lienzo y en el espécimen.
// Tócalo cuando: cambie cómo se ve una pieza en la propuesta.
// Depende de: ../tokens-propuestos.js. Lo usa ./gen-tableros.js.
// ─────────────────────────────────────────────────────────────────────────────

const { colors: c, type, radius: R, decisiones } = require('../tokens-propuestos.js');

const SANS = "'Manrope', sans-serif";
const MONO = "'IBM Plex Mono', monospace";
const TINTA = c.ink.DEFAULT;

// ── Utilidades ───────────────────────────────────────────────────────────────
const SIN_UNIDAD = new Set(['fontWeight', 'opacity', 'flex', 'zIndex', 'flexGrow', 'flexShrink', 'order', 'columnCount']);
function S(o) {
  return Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${typeof v === 'number' && !SIN_UNIDAD.has(k) ? v + 'px' : v}`)
    .join(';');
}
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (t) => esc(t).replace(/"/g, '&quot;');
const PESO = { '400Regular': 400, '500Medium': 500, '600SemiBold': 600, '700Bold': 700, '800ExtraBold': 800 };
function ts(rol, color, extra = {}) {
  const r = type[rol];
  const [fam, peso] = r.font.split('_');
  return S({
    fontFamily: fam === 'Manrope' ? SANS : MONO,
    fontSize: r.size,
    lineHeight: r.line + 'px',
    fontWeight: PESO[peso],
    letterSpacing: r.tracking ? r.tracking + 'px' : undefined,
    textTransform: r.upper ? 'uppercase' : undefined,
    color,
    ...extra,
  });
}
const div = (st, html) => `<div style="${st}">${html}</div>`;
const span = (st, html) => `<span style="${st}">${html}</span>`;

// ── Temas ────────────────────────────────────────────────────────────────────
const CLARO = {
  oscuro: false, bg: c.bg, sup: c.surface, campo: c.field, linea: c.line, trazo: c.stroke,
  tinta: c.ink.DEFAULT, gris: c.ink.muted, tenue: c.ink.faint,
  mentaSuave: c.primary.soft, mentaSuavePres: c.primary.softPressed, mentaTexto: c.primary.deep,
  error: c.danger.DEFAULT, errorTexto: c.danger.deep, errorSuave: c.danger.soft, errorSuavePres: c.danger.softPressed,
  aviso: c.warning.DEFAULT, avisoTexto: c.warning.deep, avisoSuave: c.warning.soft,
  foco: c.ink.DEFAULT,
};
const g = c.gym;
const NOCHE = {
  oscuro: true, bg: g.bg, sup: g.card, campo: g.field, linea: g.line, trazo: g.stroke,
  tinta: g.text, gris: g.muted, tenue: g.faint,
  mentaSuave: c.primary.night, mentaSuavePres: g.field, mentaTexto: c.primary.bright,
  error: c.danger.bright, errorTexto: c.danger.bright, errorSuave: c.danger.night, errorSuavePres: g.field,
  aviso: c.warning.bright, avisoTexto: c.warning.bright, avisoSuave: c.warning.night,
  foco: g.text,
};
function acento(o, T) {
  return { base: o.DEFAULT, texto: T.oscuro ? o.bright : o.deep, suave: T.oscuro ? o.night : o.soft, pres: o.pressed };
}
const ACENTOS = decisiones.acento;
const ACENTO = acento(ACENTOS[decisiones.recomendadoAcento], CLARO);

// ── Íconos de trazo ──────────────────────────────────────────────────────────
const TRAZOS = {
  visto: '<path d="M5 12.5l4.5 4.5L19 7.5"></path>',
  mas: '<path d="M12 5v14M5 12h14"></path>',
  menos: '<path d="M5 12h14"></path>',
  error: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7.5v5.5M12 16.5v.01"></path>',
  info: '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5.5M12 7.5v.01"></path>',
  aviso: '<path d="M12 4l9 16H3z"></path><path d="M12 10v4M12 17v.01"></path>',
  reloj: '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5V12l3 2"></path>',
  hoy: '<rect x="4" y="5" width="16" height="15" rx="2"></rect><path d="M4 10h16M9 3v4M15 3v4"></path>',
  rutinas: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"></path>',
  progreso: '<path d="M4 19h16M5 15l4-4 3 3 6-7"></path>',
  ejercicios: '<path d="M6.5 8v8M17.5 8v8M3.5 10v4M20.5 10v4M6.5 12h11"></path>',
  perfil: '<circle cx="12" cy="8.5" r="3.5"></circle><path d="M5 19.5c1.2-3.3 3.8-5 7-5s5.8 1.7 7 5"></path>',
  cruz: '<path d="M6 6l12 12M18 6L6 18"></path>',
  basura: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"></path>',
};
function icono(nombre, tam, color, grosor = 2, extra = '') {
  return `<svg aria-hidden="true" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex:none${extra ? ';' + extra : ''}">${TRAZOS[nombre]}</svg>`;
}
function giro(color, tam = 18, clase = '') {
  return `<svg aria-hidden="true"${clase ? ` class="${clase}"` : ''} width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" style="display:block;flex:none"><circle cx="12" cy="12" r="9" stroke="${color}" stroke-opacity="0.25" stroke-width="3"></circle><path d="M12 3a9 9 0 0 1 9 9" stroke="${color}" stroke-width="3" stroke-linecap="round"></path></svg>`;
}

// ── Botones ──────────────────────────────────────────────────────────────────
const ALTO = { grande: 56, normal: 48, chico: 40 };
const RELLENO = { grande: 24, normal: 20, chico: 16 };
function variante(v, T, A) {
  if (v === 'primario') return { bg: c.primary.DEFAULT, fg: TINTA, pres: c.primary.pressed };
  if (v === 'secundario') return { bg: T.mentaSuave, fg: T.tinta, pres: T.mentaSuavePres };
  if (v === 'borde') return { bg: 'transparent', fg: T.tinta, pres: T.campo, borde: T.trazo };
  if (v === 'peligro') return { bg: T.errorSuave, fg: T.errorTexto, pres: T.errorSuavePres, icono: 'basura' };
  if (v === 'acento') return { bg: A.base, fg: TINTA, pres: A.pres };
  throw new Error(v);
}
/** Un botón real. estado: normal, presionado, deshabilitado, cargando, foco. */
function boton({ v = 'primario', tam = 'normal', estado = 'normal', texto, radio = R.button, ancho, T = CLARO, A = ACENTO, clase = '', extra = {} }) {
  const e = variante(v, T, A);
  let bg = e.bg;
  let fg = e.fg;
  let borde = e.borde ? `1.5px solid ${e.borde}` : '0';
  let transform;
  let sombra;
  if (estado === 'presionado') {
    bg = e.pres;
    transform = 'scale(0.97)';
  }
  if (estado === 'deshabilitado') {
    bg = T.campo;
    fg = T.gris;
    borde = '0';
  }
  if (estado === 'foco') sombra = `0 0 0 2px ${T.bg}, 0 0 0 4px ${T.foco}`;
  const st = S({
    boxSizing: 'border-box', height: ALTO[tam], minWidth: tam === 'chico' ? 80 : 96, width: ancho,
    padding: `0 ${RELLENO[tam]}px`, border: borde, borderRadius: radio, background: bg, color: fg,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: SANS, fontSize: tam === 'chico' ? 14 : 16, lineHeight: tam === 'chico' ? '18px' : '20px', fontWeight: 700,
    transform, boxShadow: sombra, cursor: 'pointer', flex: 'none', ...extra,
  });
  const ico = e.icono && estado !== 'cargando' ? icono(e.icono, 18, fg, 2) : '';
  const cuerpo = estado === 'cargando' ? `${giro(fg)}<span>${esc(texto.cargando || 'Guardando…')}</span>` : `${ico}<span>${esc(texto)}</span>`;
  const dis = estado === 'deshabilitado' ? ' disabled' : '';
  const busy = estado === 'cargando' ? ' aria-busy="true"' : '';
  return `<button type="button"${clase ? ` class="${clase}"` : ''}${dis}${busy} style="${st}">${cuerpo}</button>`;
}

/** Botón redondo de más o menos. */
function redondo({ signo = 'mas', tam = 56, estado = 'normal', T = CLARO, etiqueta }) {
  let bg = T.sup;
  let fg = T.tinta;
  let borde = `1.5px solid ${T.trazo}`;
  let transform;
  if (estado === 'presionado') {
    bg = c.primary.DEFAULT;
    borde = '0';
    fg = TINTA;
    transform = 'scale(0.97)';
  }
  if (estado === 'deshabilitado') {
    bg = T.campo;
    fg = T.gris;
    borde = '0';
  }
  const st = S({
    boxSizing: 'border-box', width: tam, height: tam, borderRadius: '50%', border: borde, background: bg,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, transform, cursor: 'pointer', flex: 'none',
  });
  const dis = estado === 'deshabilitado' ? ' disabled' : '';
  return `<button type="button" aria-label="${attr(etiqueta || (signo === 'mas' ? 'subir' : 'bajar'))}"${dis} style="${st}">${icono(signo, tam >= 56 ? 24 : 20, fg, 2.5)}</button>`;
}

/** Stepper: menos, cifra, más. */
function stepper({ valor, tam = 56, T = CLARO, unidad, paso = '2,5 kg' }) {
  const rol = tam >= 56 ? 'cifraGrande' : 'cifraFila';
  return div(
    S({ display: 'flex', alignItems: 'center', gap: 8 }),
    redondo({ signo: 'menos', tam, T, etiqueta: `bajar ${paso}` }) +
      div(S({ minWidth: tam >= 56 ? 112 : 72, textAlign: 'center' }), span(ts(rol, T.tinta), esc(valor)) + (unidad ? span(ts('secundario', T.gris, { marginLeft: '4px' }), esc(unidad)) : '')) +
      redondo({ signo: 'mas', tam, T, etiqueta: `subir ${paso}` }),
  );
}

/** Círculo de RIR. */
function rir(n, elegido, T = CLARO) {
  const st = S({
    boxSizing: 'border-box', width: 44, height: 44, borderRadius: '50%', padding: 0, cursor: 'pointer',
    border: elegido ? '0' : `1px solid ${T.trazo}`, background: elegido ? c.primary.DEFAULT : T.sup,
    fontFamily: MONO, fontSize: 15, fontWeight: 600, color: elegido ? TINTA : T.tinta, flex: 'none',
  });
  return `<button type="button" aria-label="RIR ${n}" aria-pressed="${elegido ? 'true' : 'false'}" style="${st}">${n}</button>`;
}

/** Chip de filtro. */
function chip(texto, activo, { T = CLARO, radio = R.chip } = {}) {
  const st = S({
    boxSizing: 'border-box', height: 40, padding: activo ? '0 14px 0 10px' : '0 14px', borderRadius: radio, cursor: 'pointer',
    border: activo ? '0' : `1px solid ${T.trazo}`, background: activo ? c.primary.DEFAULT : T.sup,
    display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: SANS, fontSize: 14, fontWeight: activo ? 700 : 600,
    color: activo ? TINTA : T.tinta, flex: 'none',
  });
  return `<button type="button" aria-pressed="${activo ? 'true' : 'false'}" style="${st}">${activo ? icono('visto', 16, TINTA, 2.5) : ''}<span>${esc(texto)}</span></button>`;
}

/** Selector segmentado. */
function segmentado(opciones, elegida, { T = CLARO, radio = R.button, ancho = 320, etiqueta = 'Selector' } = {}) {
  const segs = opciones
    .map((o) => {
      const sel = o === elegida;
      const st = S({
        flex: 1, height: 40, border: sel ? `1px solid ${T.trazo}` : '1px solid transparent', borderRadius: Math.max(radio - 3, 4),
        background: sel ? T.sup : 'transparent', fontFamily: SANS, fontSize: 15, fontWeight: sel ? 700 : 600,
        color: sel ? T.tinta : T.gris, cursor: 'pointer', padding: 0, boxSizing: 'border-box',
      });
      return `<button type="button" role="radio" aria-checked="${sel ? 'true' : 'false'}" style="${st}">${esc(o)}</button>`;
    })
    .join('');
  return `<div role="radiogroup" aria-label="${attr(etiqueta)}" style="${S({ boxSizing: 'border-box', width: ancho, height: 48, padding: 4, display: 'flex', gap: 4, background: T.campo, borderRadius: radio })}">${segs}</div>`;
}

/** Interruptor con su etiqueta. */
function interruptor(texto, encendido, id, { T = CLARO, ancho = 320 } = {}) {
  const pista = S({
    position: 'relative', boxSizing: 'border-box', width: 52, height: 32, borderRadius: R.pill, padding: 0, cursor: 'pointer', flex: 'none',
    border: encendido ? '0' : `1.5px solid ${T.trazo}`, background: encendido ? c.primary.DEFAULT : T.sup,
  });
  const perilla = encendido
    ? S({ position: 'absolute', top: 4, left: 24, width: 24, height: 24, borderRadius: '50%', background: TINTA, display: 'flex', alignItems: 'center', justifyContent: 'center' })
    : S({ position: 'absolute', top: 6.5, left: 6.5, width: 16, height: 16, borderRadius: '50%', background: T.gris });
  const dentro = encendido ? icono('visto', 14, c.primary.DEFAULT, 3) : '';
  return div(
    S({ width: ancho, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }),
    `<label for="${id}" style="${ts('cuerpo', T.tinta)}">${esc(texto)}</label><button type="button" id="${id}" role="switch" aria-checked="${encendido ? 'true' : 'false'}" style="${pista}"><span style="${perilla}">${dentro}</span></button>`,
  );
}

// ── Campo de texto ───────────────────────────────────────────────────────────
/** estado: vacio, foco, error, correcto, lleno. */
function campo({ id, etiqueta, valor = '', placeholder = '', estado = 'lleno', ayuda, radio = R.field, ancho = 320, T = CLARO, tipo = 'text' }) {
  let borde = `1.5px solid ${T.trazo}`;
  let pad = '0 14px';
  if (estado === 'foco') {
    borde = `2px solid ${T.oscuro ? c.primary.DEFAULT : c.primary.deep}`;
    pad = '0 13.5px';
  }
  if (estado === 'error') {
    borde = `2px solid ${T.error}`;
    pad = '0 13.5px';
  }
  if (estado === 'correcto') borde = `1.5px solid ${T.oscuro ? c.primary.DEFAULT : c.primary.deep}`;
  const derecha = estado === 'correcto' ? 44 : 14;
  const input = `<input id="${id}" type="${tipo}" value="${attr(valor)}" readonly${estado === 'error' ? ' aria-invalid="true"' : ''}${ayuda ? ` aria-describedby="${id}-ayuda"` : ''} style="${S({
    boxSizing: 'border-box', width: '100%', height: 48, padding: pad, paddingRight: derecha, border: borde, borderRadius: radio, background: T.sup,
    fontFamily: SANS, fontSize: 16, color: T.tinta, outline: 'none', margin: 0,
  })}">`;
  const fantasma = !valor && placeholder ? span(S({ position: 'absolute', left: 15, top: 13, fontFamily: SANS, fontSize: 16, lineHeight: '22px', color: T.tenue, pointerEvents: 'none' }), esc(placeholder)) : '';
  const cursor = estado === 'foco' ? span(S({ position: 'absolute', left: valor ? 15 + valor.length * 8.6 : 15, top: 13, width: 2, height: 22, background: T.tinta }), '') : '';
  const visto = estado === 'correcto' ? span(S({ position: 'absolute', right: 14, top: 12 }), icono('visto', 22, T.oscuro ? c.primary.bright : c.primary.deep, 2.5)) : '';
  let pie = '';
  if (ayuda) {
    const color = estado === 'error' ? T.errorTexto : estado === 'correcto' ? T.mentaTexto : T.gris;
    const ico = estado === 'error' ? icono('error', 16, T.error, 2) : estado === 'correcto' ? icono('visto', 16, T.mentaTexto, 2.5) : '';
    pie = div(S({ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 2 }), (ico ? span(S({ paddingTop: 1 }), ico) : '') + `<span id="${id}-ayuda" style="${ts('nota', color, { fontWeight: estado === 'error' ? 600 : 400 })}">${esc(ayuda)}</span>`);
  }
  return div(
    S({ width: ancho, display: 'flex', flexDirection: 'column', gap: 6 }),
    `<label for="${id}" style="${S({ fontFamily: SANS, fontSize: 14, lineHeight: '20px', fontWeight: 600, color: T.tinta })}">${esc(etiqueta)}</label>` +
      div(S({ position: 'relative' }), input + fantasma + cursor + visto) +
      pie,
  );
}

// ── Tarjetas, nota, récord, descanso ─────────────────────────────────────────
function tarjeta(html, { T = CLARO, radio = R.card, pad = 16, extra = {} } = {}) {
  return div(S({ boxSizing: 'border-box', background: T.sup, border: `1px solid ${T.linea}`, borderRadius: radio, padding: pad, ...extra }), html);
}
function etiqueta(texto, color, extra = {}) {
  return div(ts('etiqueta', color, extra), esc(texto));
}
/** La nota del entrenador al margen: raya de acento, firma en acento profundo, texto en tinta. */
function nota({ A = ACENTO, T = CLARO, quien = 'Javier, tu entrenador', cuando = 'ayer', texto }) {
  return div(
    S({ borderLeft: `3px solid ${A.base}`, paddingLeft: 14 }),
    div(S({ fontFamily: SANS, fontSize: 13, lineHeight: '18px', fontWeight: 700, color: A.texto }), `Nota de ${esc(quien)} · ${esc(cuando)}`) +
      div(ts('cuerpo', T.tinta, { fontSize: '15px', lineHeight: '22px', marginTop: '4px' }), esc(texto)),
  );
}
/** La sugerencia de carga: misma forma que la nota, con la raya menta. */
function sugerencia({ T = CLARO, texto }) {
  return div(
    S({ borderLeft: `3px solid ${c.primary.DEFAULT}`, paddingLeft: 14 }),
    div(S({ fontFamily: SANS, fontSize: 13, lineHeight: '18px', fontWeight: 700, color: T.gris }), 'Sugerencia de carga') +
      div(ts('cuerpo', T.tinta, { fontSize: '15px', lineHeight: '22px', marginTop: '4px' }), esc(texto)),
  );
}
/** Tarjeta de récord: la cifra en tinta, subrayada con el acento. */
function record({ A = ACENTO, T = CLARO, ejercicio = 'Press banca', cifra = '45 kg × 8', antes = 'Antes: 42,5 kg × 8 · hace 3 semanas', radio = R.card, claseRaya = '', claseCaja = '' }) {
  const html =
    div(S({ display: 'flex', alignItems: 'center', gap: 8 }), span(S({ width: 8, height: 8, borderRadius: '50%', background: A.base, flex: 'none' }), '') + etiqueta(`Récord · ${ejercicio}`, A.texto)) +
    div(S({ display: 'inline-block', marginTop: 10 }), div(ts('cifra', T.tinta, { fontSize: '30px', lineHeight: '34px' }), esc(cifra)) + `<div${claseRaya ? ` class="${claseRaya}"` : ''} style="${S({ height: 3, marginTop: 4, background: A.base, borderRadius: R.pill, transformOrigin: 'left center' })}"></div>`) +
    div(ts('secundario', T.gris, { marginTop: '8px' }), esc(antes));
  return `<div${claseCaja ? ` class="${claseCaja}"` : ''} style="${S({ boxSizing: 'border-box', background: T.sup, border: `1px solid ${T.linea}`, borderRadius: radio, padding: 16 })}">${html}</div>`;
}
/** Panel de descanso. clases: para el tablero de animaciones. */
function descanso({ A = ACENTO, T = CLARO, tiempo = '1:24', pct = 62, siguiente = 'Siguiente: Sentadilla, serie 3 · 30 kg × 10', radio = R.card, radioBoton = R.button, botones = true, cifraHtml, clases = {} }) {
  const cifra = cifraHtml || div(ts('cronometro', T.tinta), esc(tiempo));
  const cab = `<div${clases.etiqueta ? ` class="${clases.etiqueta}"` : ''} style="${S({ display: 'flex', alignItems: 'center', gap: 6 })}">${icono('reloj', 16, A.texto, 2.2)}<div style="${ts('etiqueta', A.texto)}">Descanso</div></div>`;
  const btns = botones
    ? div(S({ display: 'flex', flexDirection: 'column', gap: 8 }), boton({ v: 'borde', tam: 'chico', texto: '+30 s', T, A, radio: radioBoton }) + boton({ v: 'acento', tam: 'chico', texto: 'Saltar', T, A, radio: radioBoton }))
    : '';
  const barra = div(
    S({ marginTop: 12, height: 6, borderRadius: R.pill, background: T.oscuro ? g.field : c.surface, overflow: 'hidden' }),
    `<div${clases.barra ? ` class="${clases.barra}"` : ''} style="${S({ width: pct + '%', height: '100%', borderRadius: R.pill, background: T.oscuro ? A.base : A.texto, transformOrigin: 'left center' })}"></div>`,
  );
  const listo = clases.listo ? `<div class="${clases.listo}" style="${S({ position: 'absolute', left: 16, top: 16, opacity: 0, display: 'flex', alignItems: 'center', gap: 6 })}">${icono('visto', 16, A.texto, 2.5)}${div(ts('etiqueta', A.texto), 'Listo: serie 3')}</div>` : '';
  const destello = clases.destello ? `<div class="${clases.destello}" aria-hidden="true" style="${S({ position: 'absolute', inset: 0, background: A.base, opacity: 0, borderRadius: radio })}"></div>` : '';
  return `<div style="${S({ position: 'relative', boxSizing: 'border-box', background: A.suave, borderRadius: radio, padding: 16, overflow: 'hidden' })}">${destello}<div style="position:relative">${div(
    S({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }),
    div('', cab + cifra) + btns,
  )}${barra}${div(ts('secundario', T.gris, { marginTop: '10px' }), esc(siguiente))}</div>${listo}</div>`;
}

// ── Bitácora ─────────────────────────────────────────────────────────────────
function marcaEstado(estado, T = CLARO, clase = '') {
  if (estado === 'hecha')
    return `<span${clase ? ` class="${clase}"` : ''} style="${S({ width: 28, height: 28, borderRadius: '50%', background: c.primary.DEFAULT, display: 'flex', alignItems: 'center', justifyContent: 'center' })}">${icono('visto', 16, TINTA, 2.5)}</span>`;
  if (estado === 'fallo')
    return span(S({ width: 28, height: 28, borderRadius: '50%', background: T.errorSuave, display: 'flex', alignItems: 'center', justifyContent: 'center' }), icono('error', 18, T.errorTexto, 2));
  return span(S({ boxSizing: 'border-box', width: 28, height: 28, borderRadius: '50%', border: `1.5px solid ${T.trazo}`, display: 'block' }), '');
}
const COLS = { serie: 64, rir: 56, estado: 40 };
function cabeceraBitacora(T = CLARO) {
  const e = (t, w, al = 'left') => div(ts('etiqueta', T.gris, { width: w ? w + 'px' : undefined, flex: w ? 'none' : '1', textAlign: al }), t);
  return div(S({ display: 'flex', alignItems: 'center', height: 28, padding: '0 4px' }), e('Serie', COLS.serie) + e('kg') + e('Reps') + e('RIR', COLS.rir) + div(S({ width: COLS.estado }), ''));
}
function filaSet({ n, kg, reps, rir: r, estado = 'hecha', T = CLARO, claseCifras = '', claseMarca = '' }) {
  const col = estado === 'pendiente' ? T.tenue : T.tinta;
  const peso = estado === 'pendiente' ? 400 : 500;
  const cifras =
    div(ts('cifraTabla', estado === 'pendiente' ? T.tenue : T.gris, { width: COLS.serie + 'px', flex: 'none' }), esc(n)) +
    div(ts('cifraFila', col, { flex: '1', fontWeight: peso }), esc(kg)) +
    div(ts('cifraFila', col, { flex: '1', fontWeight: peso }), esc(reps)) +
    div(ts('cifraTabla', col, { width: COLS.rir + 'px', flex: 'none' }), esc(r));
  return `<div style="${S({ display: 'flex', alignItems: 'center', minHeight: 48, padding: '0 4px', borderTop: `1px solid ${T.linea}` })}"><div${claseCifras ? ` class="${claseCifras}"` : ''} style="display:flex;align-items:center;flex:1">${cifras}</div>${div(S({ width: COLS.estado, display: 'flex', justifyContent: 'flex-end' }), marcaEstado(estado, T, claseMarca))}</div>`;
}
function filaActiva({ T = CLARO, radio = R.card, rBoton = R.button, ancho }) {
  const r = (lbl, html) => div(S({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }), div(ts('secundario', T.gris), lbl) + html);
  const rirs = div(S({ display: 'flex', alignItems: 'center', gap: 4 }), div(ts('secundario', T.gris, { width: '36px' }), 'RIR') + [0, 1, 2, 3, 4, 5].map((n) => rir(n, n === 2, T)).join(''));
  return div(
    S({ boxSizing: 'border-box', width: ancho, background: T.mentaSuave, border: `1.5px solid ${T.oscuro ? c.primary.DEFAULT : c.primary.deep}`, borderRadius: radio, padding: 14, margin: '4px 0' }),
    div(S({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }), etiqueta('Serie 3 de 4', T.mentaTexto) + div(ts('nota', T.gris), 'Última vez: 30 kg × 10')) +
      r('kg', stepper({ valor: '30', T })) +
      r('reps', stepper({ valor: '10', T, paso: '1' })) +
      div(S({ marginTop: 12 }), rirs) +
      div(S({ display: 'flex', gap: 8, marginTop: 14 }), boton({ v: 'primario', tam: 'grande', texto: 'Serie hecha', radio: rBoton, T, extra: { flex: '1' } }) + boton({ v: 'peligro', tam: 'grande', texto: 'Fallé', radio: rBoton, T })),
  );
}

// ── Barra de pestañas ────────────────────────────────────────────────────────
const PESTANAS = [
  ['Hoy', 'hoy'],
  ['Rutinas', 'rutinas'],
  ['Progreso', 'progreso'],
  ['Ejercicios', 'ejercicios'],
  ['Perfil', 'perfil'],
];
function barraPestanas({ T = CLARO, activa = 'Hoy', ancho = 360 }) {
  const items = PESTANAS.map(([n, ic]) => {
    const on = n === activa;
    const pill = S({ width: 56, height: 30, borderRadius: R.tab, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? c.primary.DEFAULT : 'transparent' });
    return `<button type="button" aria-current="${on ? 'page' : 'false'}" style="${S({ flex: 1, minWidth: 0, height: 64, padding: '8px 0 6px', border: 0, background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' })}"><span style="${pill}">${icono(ic, 22, on ? TINTA : T.gris, 2)}</span><span style="${S({ fontFamily: SANS, fontSize: 13, lineHeight: '16px', fontWeight: on ? 700 : 500, color: on ? T.tinta : T.gris })}">${n}</span></button>`;
  }).join('');
  return `<nav aria-label="Pestañas" style="${S({ boxSizing: 'border-box', width: ancho, display: 'flex', background: T.sup, borderTop: `1px solid ${T.linea}` })}">${items}</nav>`;
}

// ── Avisos ───────────────────────────────────────────────────────────────────
function aviso({ tipo = 'info', fuerte, texto, T = CLARO, radio = R.card, ancho }) {
  const m = {
    info: { bg: T.campo, ic: 'info', col: T.gris },
    exito: { bg: T.mentaSuave, ic: 'visto', col: T.mentaTexto },
    aviso: { bg: T.avisoSuave, ic: 'aviso', col: T.avisoTexto },
    error: { bg: T.errorSuave, ic: 'error', col: T.errorTexto },
  }[tipo];
  return `<div role="${tipo === 'error' ? 'alert' : 'status'}" style="${S({ boxSizing: 'border-box', width: ancho, display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: radio, background: m.bg })}">${span(S({ paddingTop: 0 }), icono(m.ic, 20, m.col, 2.2))}<div style="${ts('secundario', T.tinta)}"><b style="font-weight:700">${esc(fuerte)}</b> ${esc(texto)}</div></div>`;
}

module.exports = {
  S, esc, attr, ts, div, span, SANS, MONO, TINTA, c, g, type, R, decisiones, CLARO, NOCHE, acento, ACENTOS, ACENTO,
  icono, giro, boton, redondo, stepper, rir, chip, segmentado, interruptor, campo, tarjeta, etiqueta, nota, sugerencia,
  record, descanso, marcaEstado, cabeceraBitacora, filaSet, filaActiva, barraPestanas, aviso,
};
