// ─────────────────────────────────────────────────────────────────────────────
// GymTrack · auditoría rápida de las maquetas
//
// Se carga desde la consola de cualquier maqueta:
//   const { auditar } = await import('/auditoria.js'); await auditar();
// Recorre todos los estados del select «Estado» en modo gimnasio y en clara, y revisa dentro
// de cada teléfono: toques bajo 48 dp, botones sin nombre, contraste de texto bajo AA, letra
// bajo 12 px, desbordes, imágenes sin alt, campos sin etiqueta y enlaces data-ir rotos.
// ─────────────────────────────────────────────────────────────────────────────

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function rgba(txt) {
  const m = txt.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return { r, g, b, a };
}
function lum({ r, g, b }) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contraste(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function mezclar(fg, bg) {
  const a = fg.a ?? 1;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}
function fondo(el) {
  const capas = [];
  for (let e = el; e; e = e.parentElement) {
    const c = rgba(getComputedStyle(e).backgroundColor);
    if (c && c.a > 0) { capas.push(c); if (c.a >= 1) break; }
  }
  let res = { r: 255, g: 255, b: 255, a: 1 };
  for (const c of capas.reverse()) res = mezclar(c, res);
  return res;
}
const visible = (el) => {
  if (!el.getClientRects().length) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.opacity !== '0';
};
const nombre = (el) => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
const describe = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} «${nombre(el)}»`;

function revisarTelefono(tel, zoom) {
  const hallazgos = [];
  const add = (tipo, el, detalle) => hallazgos.push({ tipo, el: describe(el), detalle });
  const telR = tel.getBoundingClientRect();

  // Toques y nombres accesibles.
  const tocables = tel.querySelectorAll('button, a[href], [role="button"], [role="tab"], input:not([type="hidden"]), select, textarea, [data-ir], [data-accion]');
  for (const el of tocables) {
    if (!visible(el) || el.closest('.velo:not(.ver)') || el.closest('[aria-hidden="true"]')) continue;
    const caja = el.matches('input.valor') && el.closest('.campo') ? el.closest('.campo') : el;
    const r = caja.getBoundingClientRect();
    const amplia = parseFloat(getComputedStyle(el, '::after').height) || 0;
    const w = r.width / zoom, h = r.height / zoom;
    const tipo = el.tagName === 'INPUT' ? (el.type || 'text') : '';
    if (!['checkbox', 'radio'].includes(tipo) && Math.min(w, Math.max(h, amplia / zoom)) < 47.5) add('toque', el, `${Math.round(w)}×${Math.round(h)} dp`);
    if (['BUTTON', 'A'].includes(el.tagName) || el.getAttribute('role') === 'button') {
      if (!nombre(el) && !el.getAttribute('aria-labelledby')) add('sin-nombre', el, 'botón o enlace sin nombre accesible');
    }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
      const etiquetado = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label') || (el.id && tel.querySelector(`label[for="${el.id}"]`));
      if (!etiquetado) add('campo-sin-etiqueta', el, el.placeholder ? `solo placeholder «${el.placeholder}»` : 'sin etiqueta');
    }
  }

  // Texto: contraste y tamaño. Solo elementos con texto propio.
  for (const el of tel.querySelectorAll('*')) {
    if (!visible(el) || el.closest('.velo:not(.ver)') || el.closest('svg') || el.closest('canvas') || el.closest('[aria-hidden="true"]')) continue;
    const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!propio) continue;
    const cs = getComputedStyle(el);
    const px = parseFloat(cs.fontSize);
    const peso = parseInt(cs.fontWeight, 10) || 400;
    if (px < 12) add('letra-chica', el, `${px}px`);
    const fg = rgba(cs.color); if (!fg) continue;
    const bg = fondo(el);
    const c = contraste(mezclar(fg, bg), bg);
    const grande = px >= 24 || (px >= 18.66 && peso >= 700);
    const desactivado = el.closest(':disabled, [aria-disabled="true"], .desh');
    if (!desactivado && c < (grande ? 3 : 4.5)) add('contraste', el, `${c.toFixed(2)}:1 (${px}px ${peso})`);
  }

  // Desbordes: el contenido no debe ser más ancho que el teléfono.
  const cont = tel.querySelector('.tel-contenido');
  if (cont && cont.scrollWidth > cont.clientWidth + 1) hallazgos.push({ tipo: 'desborde', el: '.tel-contenido', detalle: `${cont.scrollWidth} > ${cont.clientWidth}` });
  for (const el of tel.querySelectorAll('.tel-contenido *, .tel-accion *')) {
    if (!visible(el) || el.closest('.chips, .filtros, [data-desliza], .carrusel') || getComputedStyle(el).position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.right > telR.right + 1 && !el.closest('[style*="overflow"]')) { add('se-sale', el, `+${Math.round((r.right - telR.right) / zoom)} dp`); break; }
  }

  for (const img of tel.querySelectorAll('img')) if (!img.hasAttribute('alt')) add('img-sin-alt', img, img.src.split('/').pop());
  return hallazgos;
}

async function existe(url) {
  try { const r = await fetch(url, { method: 'HEAD' }); return r.ok; } catch { return false; }
}

export async function auditar({ temas = ['gimnasio', 'clara'], pausa = 250 } = {}) {
  const selEstado = document.querySelector('.controles [data-ctl="estado"]');
  const selTema = document.querySelector('.controles [data-ctl="tema"]');
  const estados = selEstado ? [...selEstado.options].map((o) => o.value) : [''];
  const resultado = { pagina: location.pathname, estados: estados.length, hallazgos: [], enlacesRotos: [] };
  const enlaces = new Set();
  for (const estado of estados) {
    for (const tema of temas) {
      if (selEstado) { selEstado.value = estado; selEstado.dispatchEvent(new Event('change', { bubbles: true })); }
      if (selTema) { selTema.value = tema; selTema.dispatchEvent(new Event('change', { bubbles: true })); }
      await espera(pausa);
      const zoom = parseFloat(document.getElementById('escenario')?.style.zoom) || 1;
      for (const tel of document.querySelectorAll('#escenario .tel')) {
        for (const h of revisarTelefono(tel, zoom)) resultado.hallazgos.push({ estado, tema, ...h });
        tel.querySelectorAll('[data-ir]').forEach((e) => enlaces.add(e.dataset.ir.split('#')[0]));
      }
    }
  }
  for (const u of enlaces) if (u && !(await existe(u))) resultado.enlacesRotos.push(u);
  // Agrupa repetidos: mismo tipo y elemento en varios estados o temas.
  const grupos = {};
  for (const h of resultado.hallazgos) {
    const k = `${h.tipo}|${h.el}|${h.detalle}`;
    (grupos[k] ||= { tipo: h.tipo, el: h.el, detalle: h.detalle, donde: new Set() }).donde.add(`${h.estado}/${h.tema}`);
  }
  resultado.resumen = Object.values(grupos).map((g) => ({ ...g, donde: [...g.donde].slice(0, 4).join(', ') + (g.donde.size > 4 ? ` y ${g.donde.size - 4} más` : '') }));
  delete resultado.hallazgos;
  return resultado;
}
