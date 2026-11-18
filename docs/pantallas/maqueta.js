// ─────────────────────────────────────────────────────────────────────────────
// GymTrack · controles comunes de las maquetas
//
// Cada pantalla pone un <div id="escenario"> y una barra .controles con selects data-ctl
// (estado, tema, zoom) y un checkbox data-ctl="medidas". Luego llama a iniciarMaqueta con
// la función que dibuja un teléfono. El estado de los controles se guarda en la dirección
// (#estado=…&tema=…) para poder enlazar o recargar un estado exacto.
// ─────────────────────────────────────────────────────────────────────────────

/* eslint-disable no-unused-vars */
function iniciarMaqueta({ telefono, porDefecto, alCambiarEstado, alPintar }) {
  const ctl = Object.assign({ tema: 'gimnasio', zoom: 'ajustar', medidas: 'no' }, porDefecto,
    Object.fromEntries(new URLSearchParams(location.hash.slice(1))));
  const escenario = document.getElementById('escenario');
  const HUECO = 32;

  // «Ajustar al ancho» achica el teléfono si no cabe; nunca lo agranda. Con dos teléfonos que
  // no caben lado a lado sin achicarlos más de un 25 %, se apilan.
  function escala(n) {
    if (ctl.zoom === '100') return 1;
    if (ctl.zoom === '150') return 1.5;
    const disponible = escenario.parentElement.clientWidth - 32;
    const z = disponible / (n * 412 + (n - 1) * HUECO);
    if (n > 1 && z < 0.75) return Math.min(1, disponible / 412);
    return Math.min(1, z);
  }

  function medir() {
    const z = parseFloat(escenario.style.zoom) || 1;
    escenario.querySelectorAll('.tel [data-toque]').forEach((el) => {
      const r = el.getBoundingClientRect();
      el.dataset.medida = `${Math.round(r.width / z)}×${Math.round(r.height / z)}`;
    });
  }

  function pintar() {
    const temas = ctl.tema === 'ambos' ? ['gimnasio', 'clara'] : [ctl.tema];
    const rotulo = { gimnasio: 'Modo gimnasio', clara: 'Clara' };
    escenario.innerHTML = temas.map((t) =>
      `<div>${temas.length > 1 ? `<p class="marco-rotulo">${rotulo[t]}</p>` : ''}${telefono(t, ctl)}</div>`).join('');
    escenario.style.zoom = escala(temas.length);
    document.body.classList.toggle('ver-medidas', ctl.medidas === 'si');
    document.querySelectorAll('.controles [data-ctl]').forEach((c) => {
      if (c.type === 'checkbox') c.checked = ctl.medidas === 'si'; else c.value = ctl[c.dataset.ctl];
    });
    medir();
    history.replaceState(null, '', '#' + new URLSearchParams(ctl).toString());
    if (alPintar) alPintar();
  }

  document.querySelector('.controles').addEventListener('change', (ev) => {
    const c = ev.target.closest('[data-ctl]'); if (!c) return;
    ctl[c.dataset.ctl] = c.type === 'checkbox' ? (c.checked ? 'si' : 'no') : c.value;
    if (c.dataset.ctl === 'estado' && alCambiarEstado) alCambiarEstado(ctl.estado);
    pintar();
  });
  let reajuste;
  addEventListener('resize', () => { clearTimeout(reajuste); reajuste = setTimeout(pintar, 100); });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') document.querySelectorAll('.velo.ver').forEach((v) => v.classList.remove('ver'));
  });

  // Para ir a otra maqueta conservando tema y tamaño.
  function ir(destino) {
    const sep = destino.includes('#') ? '&' : '#';
    location.href = `${destino}${sep}tema=${ctl.tema}&zoom=${ctl.zoom}`;
  }

  // Cualquier elemento con data-ir lleva a otra maqueta (pestañas, enlaces, botones).
  escenario.addEventListener('click', (ev) => {
    const d = ev.target.closest('[data-ir]');
    if (d && !d.disabled) { ev.preventDefault(); ir(d.dataset.ir); }
  });

  if (alCambiarEstado) alCambiarEstado(ctl.estado);
  document.fonts.ready.then(pintar);
  pintar();
  return { ctl, pintar, medir, ir, escenario };
}

// Aviso flotante dentro de un teléfono. Se va solo a los 2,4 s.
function avisar(tel, texto) {
  const a = tel.querySelector('.aviso');
  a.textContent = texto; a.classList.add('ver');
  clearTimeout(a._t); a._t = setTimeout(() => a.classList.remove('ver'), 2400);
}

// Formatos en es-CL.
const fmtKg = (n) => (Number.isInteger(n) ? String(n) : String(n).replace('.', ','));
const fmtReloj = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
};

// Símbolo de la marca. Dentro del botón de más hace de ícono.
const simbolo = (clase = 'simbolo', etiqueta = 'GymTrack') => `<svg class="${clase}" viewBox="0 0 24 24" ${etiqueta ? `role="img" aria-label="${etiqueta}"` : 'aria-hidden="true"'}>
  <rect class="h" x="3" y="10" width="5.5" height="4" rx="1"/><rect class="h" x="15.5" y="10" width="5.5" height="4" rx="1"/>
  <rect class="v" x="10" y="3" width="4" height="18" rx="1"/></svg>`;
const visto = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5l4.5 4.5 8.5-9.5" fill="none" stroke-width="3" stroke-linecap="square"/></svg>`;

// Barras de pestañas. La activa no navega; las demás llevan a su maqueta.
const PESTANAS_ALUMNO = [['Hoy', 'hoy.html'], ['Rutinas', 'rutinas.html'], ['Progreso', 'progreso.html'], ['Ejercicios', 'ejercicios.html'], ['Perfil', 'perfil.html']];
const PESTANAS_ENTRENADOR = [['Clientes', 'clientes.html'], ['Rutinas', 'rutinas.html#rol=entrenador'], ['Ejercicios', 'ejercicios.html#rol=entrenador'], ['Alertas', 'alertas.html'], ['Perfil', 'perfil.html#rol=entrenador']];
function pestanas(lista, activa) {
  return `<nav class="pestanas" role="tablist" aria-label="Pestañas">${lista.map(([t, href]) =>
    `<button class="pestana" role="tab" aria-selected="${t === activa}"${t === activa ? '' : ` data-ir="${href}"`} data-toque>${t}</button>`).join('')}</nav>`;
}
