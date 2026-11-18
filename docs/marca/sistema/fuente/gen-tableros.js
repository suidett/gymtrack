// ─────────────────────────────────────────────────────────────────────────────
// Generador de tableros · Zona: Diseño · herramienta de la Fase 5 de marca
//
// Qué hace: escribe los cinco tableros del sistema de diseño (.dc.html) en la carpeta del
// lienzo, el espécimen para revisar en un navegador (../especimen-sistema.html) y las
// entradas del índice del lienzo (../sistema-tableros.json). Todos los valores salen de
// ../tokens-propuestos.js y la matriz de contraste, de ../contraste.js.
// Uso: `node docs/marca/sistema/fuente/gen-tableros.js [carpeta-del-lienzo]`.
// Depende de: ./piezas.js, ../tokens-propuestos.js, ../contraste.js.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const P = require('./piezas.js');
const { todos, evitados } = require('../contraste.js');
const { motion, radius, spacing } = require('../tokens-propuestos.js');

const { S, esc, ts, div, span, SANS, MONO, TINTA, c, g, CLARO, NOCHE, acento, ACENTOS, ACENTO, decisiones } = P;
const CARPETA = process.argv[2] || path.join(__dirname, 'salida');
const coma = (n, d = 2) => n.toFixed(d).replace('.', ',');

// ── Piezas de página ─────────────────────────────────────────────────────────
function cabecera(n, tema, titulo, bajada) {
  return div(
    S({ marginBottom: 40 }),
    div(ts('etiqueta', c.ink.muted), `Sistema de diseño · ${n} de 5 · ${tema}`) +
      `<h1 style="${S({ margin: '10px 0 0', fontFamily: SANS, fontSize: 36, lineHeight: '42px', fontWeight: 700, letterSpacing: '-0.4px', color: TINTA })}">${titulo}</h1>` +
      `<p style="${S({ margin: '10px 0 0', maxWidth: 1040, fontFamily: SANS, fontSize: 17, lineHeight: '26px', color: c.ink.muted })}">${bajada}</p>`,
  );
}
function h2(texto, bajada, extra = {}) {
  return div(
    S({ marginBottom: 16, ...extra }),
    `<h2 style="${S({ margin: 0, fontFamily: SANS, fontSize: 22, lineHeight: '28px', fontWeight: 700, color: TINTA })}">${texto}</h2>` +
      (bajada ? `<p style="${S({ margin: '4px 0 0', fontFamily: SANS, fontSize: 14, lineHeight: '20px', color: c.ink.muted })}">${bajada}</p>` : ''),
  );
}
function h3(texto, color = c.ink.muted, extra = {}) {
  return div(ts('etiqueta', color, { margin: '0 0 10px', ...extra }), texto);
}
function insignia(texto, oscuro = false) {
  return span(
    S({ display: 'inline-block', fontFamily: MONO, fontSize: 13, lineHeight: '16px', fontWeight: 500, letterSpacing: '0.6px', textTransform: 'uppercase', padding: '4px 8px', borderRadius: 4, background: oscuro ? c.bg : TINTA, color: oscuro ? TINTA : c.bg }),
    esc(texto),
  );
}
function muestra(hex, tam = 40, oscuro = false) {
  const claro = !oscuro && parseInt(hex.slice(1), 16) > 0xd0d0d0;
  return span(S({ display: 'block', flex: 'none', width: tam, height: tam, borderRadius: 6, background: hex, boxSizing: 'border-box', border: claro ? `1px solid ${c.line}` : oscuro ? `1px solid ${g.line}` : '0' }), '');
}
function fichaColor(nombre, hex, rol, lleva) {
  return div(
    S({ display: 'flex', gap: 12, alignItems: 'center', minHeight: 48, padding: '4px 0', borderTop: `1px solid ${c.line}` }),
    muestra(hex) +
      div(S({ flex: 1, minWidth: 0 }), div(S({ fontFamily: SANS, fontSize: 15, lineHeight: '20px', fontWeight: 700, color: TINTA }), esc(nombre)) + div(ts('nota', c.ink.muted), esc(rol))) +
      div(S({ width: 132, flex: 'none', textAlign: 'right' }), div(S({ fontFamily: MONO, fontSize: 14, lineHeight: '20px', color: TINTA }), hex) + div(ts('nota', c.ink.muted), esc(lleva))),
  );
}
function fichaNoche(nombre, hex) {
  return div(
    S({ display: 'flex', gap: 10, alignItems: 'center', height: 40 }),
    muestra(hex, 32, true) + div(S({ flex: 1 }), div(S({ fontFamily: SANS, fontSize: 14, lineHeight: '18px', fontWeight: 600, color: g.text }), esc(nombre)) + div(S({ fontFamily: MONO, fontSize: 13, lineHeight: '16px', color: g.muted }), hex)),
  );
}

// ── Tablero 1: colores ───────────────────────────────────────────────────────
function tableroColores() {
  const papel = [
    ['Papel', c.bg, 'Fondo de todas las pantallas.', 'Lleva tinta, grafito, tenue'],
    ['Superficie', c.surface, 'Tarjetas, campos, barra de pestañas.', 'Lleva tinta, grafito, tenue'],
    ['Campo', c.field, 'Chip y etiqueta neutros, selector, deshabilitado.', 'Lleva tinta, grafito'],
    ['Línea', c.line, 'Separa renglones. Es decorativa.', 'No lleva texto'],
    ['Trazo', c.stroke, 'Borde de campos y del botón de borde: 3,3:1.', 'No lleva texto'],
    ['Tinta', c.ink.DEFAULT, 'Todo el texto: títulos, cuerpo y cifras.', 'Sobre todo fondo claro'],
    ['Grafito', c.ink.muted, 'Texto secundario y etiquetas.', 'Sobre papel y rellenos suaves'],
    ['Tenue', c.ink.faint, 'Serie pendiente, placeholder.', 'Solo papel y superficie'],
  ];
  const menta = [
    ['Menta', c.primary.DEFAULT, 'Relleno de la acción y de lo hecho.', 'Lleva tinta: 6,8:1'],
    ['Menta profunda', c.primary.deep, 'Enlace, «correcto», foco, barras.', '5,3:1 sobre papel'],
    ['Menta suave', c.primary.soft, 'Fila activa, aviso de éxito.', 'Lleva tinta, grafito'],
    ['Menta presionada', c.primary.pressed, 'Botón primario presionado.', 'Lleva tinta: 5,4:1'],
  ];
  const sem = [
    ['Éxito = menta', c.primary.DEFAULT, 'No hay un segundo verde.', 'Ver familia menta'],
    ['Error', c.danger.DEFAULT, 'Borde e ícono de error.', 'No lleva texto'],
    ['Error texto', c.danger.deep, 'Mensaje de error, botón de peligro.', '5,6:1 sobre papel'],
    ['Error suave', c.danger.soft, 'Fondo de aviso y de peligro.', 'Lleva tinta, error texto'],
    ['Aviso', c.warning.DEFAULT, 'Borde e ícono de aviso.', 'No lleva texto'],
    ['Aviso texto', c.warning.deep, 'Etiqueta de aviso.', '5,3:1 sobre papel'],
    ['Aviso suave', c.warning.soft, 'Fondo del aviso.', 'Lleva tinta, aviso texto'],
  ];
  const reglas = [
    ['La tinta escribe.', 'Todo texto va en tinta o grafito, también sobre un botón de color.'],
    ['El color subraya.', 'Rellena, marca o subraya. Nunca lleva una palabra solo.'],
    ['Solo los profundos escriben.', 'Menta, error y aviso profundos llevan texto, siempre con ícono o palabra.'],
    ['Nada de blanco sobre menta.', 'Da 2,6:1. El botón menta lleva tinta.'],
  ];
  const colA =
    h2('Papel y tinta', 'La página y lo que se escribe en ella.') + papel.map((f) => fichaColor(...f)).join('') +
    h2('Menta', 'El color fijo del símbolo. La acción y lo hecho.', { marginTop: 28 }) + menta.map((f) => fichaColor(...f)).join('');
  const colB =
    h2('Semánticos', 'Éxito, error y aviso. Apagados, sin alarma.') + sem.map((f) => fichaColor(...f)).join('') +
    div(
      S({ marginTop: 28, padding: 20, background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12 }),
      h3('Las reglas') + reglas.map(([a, b]) => div(S({ marginTop: 10 }), div(S({ fontFamily: SANS, fontSize: 15, lineHeight: '20px', fontWeight: 700, color: TINTA }), esc(a)) + div(ts('secundario', c.ink.muted), esc(b)))).join(''),
    );
  const noche = [
    ['Fondo', g.bg], ['Superficie', g.card], ['Campo', g.field], ['Línea', g.line], ['Trazo', g.stroke], ['Texto', g.text],
    ['Secundario', g.muted], ['Tenue', g.faint], ['Menta', c.primary.DEFAULT], ['Menta clara', c.primary.bright], ['Menta noche', c.primary.night],
    ['Error claro', c.danger.bright], ['Error noche', c.danger.night], ['Aviso claro', c.warning.bright], ['Aviso noche', c.warning.night], ['Acento claro', ACENTOS.azul.bright],
  ];
  const T = NOCHE;
  const An = acento(ACENTOS.azul, NOCHE);
  const ejemploNoche = div(
    S({ marginTop: 20, padding: 16, background: g.card, borderRadius: P.R.card, border: `1px solid ${g.line}` }),
    div(S({ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }), div(ts('tituloTarjeta', g.text), 'Sentadilla') + div(ts('nota', g.muted), 'Serie 2 de 3')) +
      div(S({ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 8 }), span(ts('cifra', g.text), '30 kg × 10') + span(ts('cifraTabla', g.muted), 'RIR 2')) +
      div(S({ marginTop: 14 }), P.nota({ A: An, T, texto: 'Baja hasta la paralela. Si la rodilla molesta, quédate en 27,5 kg.' })) +
      div(S({ display: 'flex', gap: 8, marginTop: 16 }), P.boton({ v: 'primario', tam: 'grande', texto: 'Serie hecha', T, extra: { flex: '1' } }) + P.boton({ v: 'peligro', tam: 'grande', texto: 'Fallé', T })),
  );
  const colC = div(
    S({ background: g.bg, borderRadius: 16, padding: 24 }),
    `<h2 style="${S({ margin: 0, fontFamily: SANS, fontSize: 22, lineHeight: '28px', fontWeight: 700, color: g.text })}">Modo gimnasio</h2>` +
      `<p style="${S({ margin: '4px 0 18px', fontFamily: SANS, fontSize: 14, lineHeight: '20px', color: g.muted })}">La misma libreta con la luz baja. El fondo es la tinta del símbolo, no negro. La página se invierte y el botón menta sigue con texto tinta.</p>` +
      div(S({ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16, rowGap: 6 }), noche.map((n) => fichaNoche(...n)).join('')) +
      ejemploNoche,
  );
  const fila1 = div(S({ display: 'grid', gridTemplateColumns: '500px 500px 1fr', columnGap: 40, alignItems: 'start' }), div('', colA) + div('', colB) + colC);

  // Decisión 1
  const por = {
    violeta: 'Era el de hoy. Funcionaba en contraste, pero no sale de la libreta: ningún cuaderno se escribe en violeta.',
    azul: 'La lapicera azul del profe. El margen queda escrito en su color y no se confunde con el menta ni con el ámbar del aviso.',
    ocre: 'El lápiz de color sobre el papel. Cálido, pero se cruzaba con el ámbar del aviso y se acercaba a una medalla.',
  };
  const opciones = Object.entries(ACENTOS)
    .map(([id, o]) => {
      const A = acento(o, CLARO);
      const rec = id === decisiones.recomendadoAcento;
      const valores = div(
        S({ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }),
        [['Base', o.DEFAULT], ['Profundo', o.deep], ['Suave', o.soft], ['Claro (noche)', o.bright]]
          .map(([n, h]) => div(S({ display: 'flex', alignItems: 'center', gap: 6 }), muestra(h, 22) + div('', div(ts('nota', c.ink.muted), n) + div(S({ fontFamily: MONO, fontSize: 13, lineHeight: '16px', color: TINTA }), h))))
          .join(''),
      );
      return div(
        S({ boxSizing: 'border-box', background: c.surface, border: rec ? `2px solid ${TINTA}` : `1px solid ${c.line}`, borderRadius: 16, padding: 20 }),
        div(S({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }), div(S({ fontFamily: SANS, fontSize: 20, lineHeight: '26px', fontWeight: 700, color: TINTA }), esc(o.nombre)) + (rec ? insignia('Elegida') : insignia('Comparada', true))) +
          valores +
          div(ts('secundario', c.ink.muted, { marginTop: '12px', minHeight: '40px' }), esc(por[id])) +
          h3('Nota al margen', c.ink.muted, { marginTop: '18px' }) +
          div(S({ background: c.bg, borderRadius: 8, padding: 14 }), P.nota({ A, texto: 'Baja hasta la paralela. Si la rodilla molesta, quédate en 27,5 kg.' })) +
          h3('Récord', c.ink.muted, { marginTop: '18px' }) +
          P.record({ A }) +
          h3('Descanso', c.ink.muted, { marginTop: '18px' }) +
          P.descanso({ A }),
      );
    })
    .join('');
  const decision = div(
    S({ marginTop: 56 }),
    h2('Decisión 1 · el segundo acento (cerrada)', 'Elegido el 2026-11-17: azul lapicera. Junta tres cosas: la voz del entrenador al margen, el récord y el descanso. El texto siempre va en tinta; el acento pone la raya, el subrayado, la barra y la firma.') +
      div(S({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', columnGap: 24 }), opciones),
  );

  // Matriz
  const filas = todos();
  const grupos = [];
  const nombreGrupo = { base: '', violeta: ' · acento violeta', azul: ' · acento azul', ocre: ' · acento ocre' };
  for (const f of filas) {
    const k = `${f.modo === 'claro' ? 'Claro' : 'Modo gimnasio'}${nombreGrupo[f.grupo]}`;
    if (!grupos.length || grupos[grupos.length - 1].k !== k) grupos.push({ k, f: [] });
    grupos[grupos.length - 1].f.push(f);
  }
  const corto = (n, grupo) => (grupo === 'base' ? n : n.replace(/^Acento /, '').replace(/^Acento$/, 'Base').replace(/^./, (m) => m.toUpperCase()));
  const celda = (f) =>
    div(
      S({ display: 'flex', alignItems: 'center', gap: 8, minHeight: 26, padding: '2px 0', borderTop: `1px solid ${c.line}`, breakInside: 'avoid' }),
      span(S({ flex: 'none', width: 34, height: 20, borderRadius: 4, background: f.bg, color: f.fg, fontFamily: SANS, fontSize: 13, lineHeight: '20px', fontWeight: 700, textAlign: 'center', boxSizing: 'border-box', border: `1px solid ${c.line}` }), f.tipo === 'texto' ? 'Aa' : '▬') +
        div(S({ flex: 1, minWidth: 0, fontFamily: SANS, fontSize: 13, lineHeight: '17px', color: TINTA }), `${esc(corto(f.fgN, f.grupo))} / ${esc(corto(f.bgN, f.grupo))}`) +
        span(S({ flex: 'none', fontFamily: MONO, fontSize: 13, lineHeight: '17px', color: TINTA, width: 48, textAlign: 'right' }), coma(f.razon)) +
        span(S({ flex: 'none', fontFamily: MONO, fontSize: 13, lineHeight: '17px', color: c.ink.muted, width: 34, textAlign: 'right' }), f.tipo === 'texto' ? '4,5' : '3') +
        span(S({ flex: 'none', width: 16 }), f.pasa ? P.icono('visto', 16, c.primary.deep, 2.5) : P.icono('cruz', 16, c.danger.deep, 2.5)),
    );
  const bloques = grupos.map((gr) => div(S({ marginBottom: 14 }), h3(esc(gr.k), TINTA, { margin: '0 0 4px', breakAfter: 'avoid' }) + gr.f.map(celda).join(''))).join('');
  const pasan = filas.filter((f) => f.pasa).length;
  const evit = evitados.map((e) => div(ts('nota', c.ink.muted, { marginTop: '2px' }), `${esc(e.fgN)} sobre ${esc(e.bgN)}: ${coma(e.razon)}`)).join('');
  const matriz = div(
    S({ marginTop: 56 }),
    div(
      S({ display: 'flex', justifyContent: 'space-between', gap: 40, alignItems: 'flex-start' }),
      h2('Matriz de contraste', `${filas.length} pares, ${pasan} pasan. Razón WCAG calculada con docs/marca/sistema/contraste.js. Texto: 4,5:1 o más. Gráficos de interfaz (bordes, foco, íconos, barras): 3:1 o más. «Aa» es texto, «▬» es gráfico.`, { maxWidth: '900px' }) +
        div(S({ width: 520, flex: 'none', padding: 14, background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12 }), h3('Pares que no se usan, a propósito', TINTA, { margin: '0 0 4px' }) + evit),
    ) + div(S({ columnCount: 5, columnGap: 24, marginTop: 8 }), bloques),
  );
  return cabecera(1, 'Color', 'La tinta escribe, el color subraya', 'Papel y tinta como base, la menta del símbolo para la acción y un segundo acento para la voz del entrenador. Cada color dice con qué texto se combina, y cada par está medido.') + fila1 + decision + matriz;
}

// ── Tablero 2: escala tipográfica ────────────────────────────────────────────
function tableroTipo() {
  const escala = [
    ['titulo', 'Título', 'Saludo y título de pantalla', 'Hola, Camila'],
    ['subtitulo', 'Subtítulo', 'Sección o día de rutina', 'Día A · Piernas'],
    ['tituloTarjeta', 'Título de tarjeta', 'Ejercicio, nombre de alumno', 'Sentadilla'],
    ['cuerpo', 'Cuerpo', 'La sugerencia de carga, textos', 'Intenta 30 kg × 10 a 12. Si logras 12 con RIR 2 o más, sube a 32,5 kg.'],
    ['cuerpoMedio', 'Cuerpo medio', 'Lo que se destaca en una fila', 'Press banca'],
    ['secundario', 'Secundario', 'Detalle bajo un título', 'Serie 2 de 3 · descanso de 1:30'],
    ['nota', 'Nota', 'Lo mínimo. Nada baja de 13', 'Última vez: martes 11, 30 kg × 10'],
    ['etiqueta', 'Etiqueta', 'Encabezados de columna y de sección', 'Sugerencia de carga'],
    ['boton', 'Botón', 'Texto de botón normal y grande', 'Serie hecha'],
    ['botonChico', 'Botón chico', 'Botón de 40 dp', '+30 s'],
    ['cifraGrande', 'Cifra grande', 'Kilos y reps de la fila activa', '32,5'],
    ['cifra', 'Cifra', 'Récord, dato del resumen', '45 kg × 8'],
    ['cifraFila', 'Cifra de fila', 'Kilos y reps en la bitácora', '30   10'],
    ['cifraTabla', 'Cifra de tabla', 'Historial, Progreso, RIR', '27,5 · 30 · 30 · 32,5'],
    ['cronometro', 'Cronómetro', 'El descanso que corre', '1:24'],
  ];
  const PESO = { '400Regular': 400, '500Medium': 500, '600SemiBold': 600, '700Bold': 700 };
  const filas = escala
    .map(([rol, nombre, uso, ej]) => {
      const r = P.type[rol];
      const [fam, peso] = r.font.split('_');
      const spec = `${r.size} / ${r.line} · ${PESO[peso]} · ${fam === 'Manrope' ? 'Manrope' : 'Plex Mono'}${r.upper ? ' · mayúsculas' : ''}`;
      const ejemplo = rol === 'etiqueta' ? div(ts(rol, c.ink.muted), esc(ej)) : rol === 'cuerpo' ? div(ts(rol, TINTA, { maxWidth: '400px' }), esc(ej)) : div(ts(rol, TINTA, { whiteSpace: 'pre' }), esc(ej));
      return div(
        S({ display: 'grid', gridTemplateColumns: '220px 1fr', columnGap: 24, alignItems: 'center', padding: '10px 0', borderTop: `1px solid ${c.line}` }),
        div('', div(S({ fontFamily: SANS, fontSize: 15, lineHeight: '20px', fontWeight: 700, color: TINTA }), esc(nombre)) + div(S({ fontFamily: MONO, fontSize: 13, lineHeight: '18px', color: TINTA }), esc(spec)) + div(ts('nota', c.ink.muted), esc(uso))) + ejemplo,
      );
    })
    .join('');
  const reglas = [
    ['32,5 kg', '32.5kg', 'Coma decimal. Un espacio que no se corta antes de la unidad.'],
    ['30 kg × 10', '30kg x 10', 'El signo × (U+00D7), con un espacio a cada lado.'],
    ['10 a 12', '10-12', 'Los rangos se escriben con «a».'],
    ['−2,5 kg', '-2,5 kg', 'Signo menos tipográfico (U+2212): mide lo mismo que el más.'],
    ['1:24', '84 s', 'Cronómetro en minutos y segundos. Agregados: «+30 s».'],
    ['4,3 t', '4.300 kg', 'Volumen desde 1.000 kg en toneladas, como fmtVolumen.'],
  ];
  const tablaReglas = reglas
    .map(([si, no, por]) =>
      div(
        S({ display: 'grid', gridTemplateColumns: '108px 96px 1fr', columnGap: 12, alignItems: 'baseline', padding: '8px 0', borderTop: `1px solid ${c.line}` }),
        div(S({ fontFamily: MONO, fontSize: 17, lineHeight: '24px', fontWeight: 500, color: TINTA }), esc(si)) +
          div(S({ fontFamily: MONO, fontSize: 15, lineHeight: '24px', color: c.ink.muted, textDecoration: 'line-through', textDecorationColor: c.danger.DEFAULT }), esc(no)) +
          div(ts('nota', c.ink.muted), esc(por)),
      ),
    )
    .join('');
  const columna = ['27,5', '30', '32,5', '102,5']
    .map((n, i) => div(S({ display: 'flex', justifyContent: 'space-between', borderTop: i ? `1px solid ${c.line}` : '0', padding: '4px 0' }), span(ts('cifraTabla', c.ink.muted), `Sesión ${i + 1}`) + span(ts('cifraFila', TINTA, { textAlign: 'right' }), `${n} kg`)))
    .join('');
  const pantalla = div(
    S({ boxSizing: 'border-box', width: 380, background: c.bg, border: `1px solid ${c.line}`, borderRadius: 20, padding: 20 }),
    div(ts('etiqueta', c.ink.muted), 'Hoy · semana 3 · sesión 2 de 4') +
      div(ts('titulo', TINTA, { marginTop: '8px' }), 'Hola, Camila') +
      div(ts('secundario', c.ink.muted, { marginTop: '2px' }), 'Día A · Piernas, 5 ejercicios') +
      P.tarjeta(
        div(S({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 48 }), div('', div(ts('tituloTarjeta', TINTA), 'Sentadilla') + div(ts('nota', c.ink.muted), 'Serie 2 de 3')) + div(S({ display: 'flex', alignItems: 'baseline', gap: 10 }), span(ts('cifraFila', TINTA, { fontWeight: '600' }), '30 kg × 10') + span(ts('cifraTabla', c.ink.muted), 'RIR 2'))) +
          div(S({ marginTop: 12 }), P.sugerencia({ texto: 'Intenta 30 kg × 10 a 12. Si logras 12 con RIR 2 o más, sube a 32,5 kg.' })),
        { extra: { marginTop: '16px' } },
      ) +
      div(S({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '12px 14px', background: c.surface, border: `1px solid ${c.line}`, borderRadius: P.R.card }), div('', div(ts('secundario', c.ink.muted), 'kg') + div(ts('cifraGrande', TINTA), '30')) + div('', div(ts('etiqueta', ACENTO.texto), 'Descanso') + div(ts('cronometro', TINTA, { fontSize: '40px', lineHeight: '44px' }), '1:24'))) +
      div(S({ marginTop: 16 }), P.boton({ v: 'primario', tam: 'grande', texto: 'Empezar rutina', ancho: '100%' })),
  );
  const der =
    h2('En una pantalla de verdad', 'La cifra manda: «30» es más grande que «Hola, Camila».') +
    pantalla +
    h2('Reglas de las cifras', 'Lo de la izquierda sí, lo tachado no.', { marginTop: 32 }) +
    tablaReglas +
    h3('Ancho fijo: las columnas calzan', c.ink.muted, { marginTop: '20px' }) +
    div(S({ width: 300 }), columna);
  const izq = h2('La escala', 'Tamaño / interlínea en dp, peso y familia. Manrope habla, IBM Plex Mono cuenta.') + filas + div(ts('nota', c.ink.muted, { marginTop: '12px', maxWidth: '640px' }), 'Junto a Manrope, la mono se ve un 5 % más chica: por eso la cifra de fila (17) va un punto sobre el cuerpo (16). Extrabold (800) queda cargado para el logotipo, no para la interfaz.');
  return cabecera(2, 'Tipografía', 'Una voz que habla y otra que cuenta', 'Manrope para el texto e IBM Plex Mono para las cifras. Quince roles, ninguno bajo 13 dp, y reglas fijas para escribir kilos, repeticiones y tiempos.') +
    div(S({ display: 'grid', gridTemplateColumns: '640px 1fr', columnGap: 48, alignItems: 'start' }), div('', izq) + div('', der));
}

// ── Tablero 3: botones ───────────────────────────────────────────────────────
function tableroBotones() {
  const variantes = [
    ['primario', 'Primario', 'Serie hecha', 'La acción de la pantalla. Una por pantalla.'],
    ['secundario', 'Secundario', 'Agregar serie', 'Acción que acompaña.'],
    ['borde', 'De borde', 'Cancelar', 'Salida o alternativa.'],
    ['peligro', 'De peligro', 'Borrar rutina', 'Borra o marca un fallo.'],
    ['acento', 'De acento', 'Ver mi progreso', 'Después de un récord, saltar el descanso.'],
  ];
  const estados = [['normal', 'Normal'], ['presionado', 'Presionado'], ['deshabilitado', 'Deshabilitado'], ['cargando', 'Cargando'], ['foco', 'Con foco']];
  const cab = div(S({ display: 'grid', gridTemplateColumns: '220px repeat(5, 1fr)', columnGap: 16, paddingBottom: 8 }), div('', '') + estados.map(([, n]) => div(ts('etiqueta', c.ink.muted), n)).join(''));
  const filas = variantes
    .map(([v, n, txt, uso]) =>
      div(
        S({ display: 'grid', gridTemplateColumns: '220px repeat(5, 1fr)', columnGap: 16, alignItems: 'center', minHeight: 76, borderTop: `1px solid ${c.line}` }),
        div('', div(S({ fontFamily: SANS, fontSize: 15, lineHeight: '20px', fontWeight: 700, color: TINTA }), n) + div(ts('nota', c.ink.muted), esc(uso))) +
          estados.map(([e]) => div('', P.boton({ v, estado: e, texto: e === 'cargando' ? { cargando: 'Guardando…' } : txt }))).join(''),
      ),
    )
    .join('');
  const specEstados = [
    ['Presionado', 'Baja a 97 % y el relleno pasa a su tono presionado. 90 ms.'],
    ['Deshabilitado', 'Relleno campo, texto grafito. Sin opacidad: se lee igual.'],
    ['Cargando', 'Mismo ancho. Círculo que gira y «Guardando…». Solo si tarda más de 300 ms.'],
    ['Con foco', 'Anillo de tinta de 2 dp, separado 2 dp. Teclado, lector de pantalla y web.'],
  ];
  const tamanos = [['grande', 'Grande · 56', 'Serie hecha'], ['normal', 'Normal · 48', 'Guardar'], ['chico', 'Chico · 40 + 4 de toque', '+30 s']]
    .map(([t, n, txt]) =>
      div(
        S({ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }),
        div(S({ width: 170, flex: 'none' }), div(S({ fontFamily: SANS, fontSize: 14, lineHeight: '20px', fontWeight: 700, color: TINTA }), n)) +
          div(S({ position: 'relative', display: 'inline-block' }), (t === 'chico' ? span(S({ position: 'absolute', left: -4, top: -4, right: -4, bottom: -4, border: `1px dashed ${c.stroke}`, borderRadius: P.R.button + 4 }), '') : '') + P.boton({ v: 'primario', tam: t, texto: txt })),
      ),
    )
    .join('');
  const ladoDer = div(
    S({ padding: 20, background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12 }),
    h3('Tamaños') + tamanos + div(ts('nota', c.ink.muted, { marginTop: '12px' }), 'El chico agranda su zona de toque con hitSlop hasta 48.') +
      h3('Estados', c.ink.muted, { marginTop: '24px' }) + specEstados.map(([a, b]) => div(S({ marginTop: 8 }), div(S({ fontFamily: SANS, fontSize: 14, lineHeight: '20px', fontWeight: 700, color: TINTA }), a) + div(ts('nota', c.ink.muted), b))).join(''),
  );
  const tabla = div(S({ display: 'grid', gridTemplateColumns: '1fr 380px', columnGap: 40, alignItems: 'start' }), div('', h2('Variantes y estados', 'El texto siempre en tinta, salvo el de peligro, que usa el error texto con su ícono.') + cab + filas) + ladoDer);

  const noche = div(
    S({ marginTop: 24, padding: 20, background: g.bg, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }),
    div(S({ width: 200, fontFamily: SANS, fontSize: 15, lineHeight: '20px', fontWeight: 700, color: g.text }), 'En modo gimnasio') +
      variantes.map(([v, , txt]) => P.boton({ v, texto: txt, T: NOCHE, A: acento(ACENTOS.azul, NOCHE) })).join(''),
  );

  const controles = div(
    S({ display: 'grid', gridTemplateColumns: '1.15fr 1fr 1fr', columnGap: 40, marginTop: 48, alignItems: 'start' }),
    div(
      '',
      h2('Más y menos', 'Círculos de 56 en kilos y reps, 48 en el resto. Superficie con borde de trazo y el signo en tinta; al presionar, se rellenan de menta.') +
        div(S({ display: 'flex', gap: 28, alignItems: 'center' }), P.stepper({ valor: '30', unidad: 'kg' }) + P.stepper({ valor: '10', tam: 48, paso: '1' })) +
        div(S({ display: 'flex', gap: 20, alignItems: 'center', marginTop: 16 }), div('', P.redondo({ signo: 'mas', estado: 'presionado' }) + div(ts('nota', c.ink.muted, { marginTop: '4px', textAlign: 'center' }), 'Presionado')) + div('', P.redondo({ signo: 'menos', estado: 'deshabilitado', etiqueta: 'bajar, ya estás en 0' }) + div(ts('nota', c.ink.muted, { marginTop: '4px', textAlign: 'center' }), 'En el mínimo'))) +
        h3('RIR', c.ink.muted, { marginTop: '24px' }) +
        div(S({ display: 'flex', gap: 4 }), [0, 1, 2, 3, 4, 5].map((n) => P.rir(n, n === 2)).join('')) +
        div(ts('nota', c.ink.muted, { marginTop: '8px' }), '44 de diámetro, 4 de separación y 2 de hitSlop: 48 de toque.'),
    ) +
      div(
        '',
        h2('Chips', 'Filtros. El activo se rellena de menta y suma un visto.') +
          div(S({ display: 'flex', gap: 8, flexWrap: 'wrap' }), [['Todos', false], ['Piernas', true], ['Empuje', false], ['Tirón', false], ['Core', false]].map(([t, a]) => P.chip(t, a)).join('')) +
          h2('Selector segmentado', 'Dos a cuatro opciones que se excluyen.', { marginTop: 28 }) +
          P.segmentado(['Alumno', 'Entrenador'], 'Alumno', { etiqueta: 'Rol' }) +
          div(S({ marginTop: 12 }), P.segmentado(['Semana', 'Mes', 'Año'], 'Mes', { etiqueta: 'Periodo' })),
      ) +
      div(
        '',
        h2('Interruptor', 'Encendido: pista menta y perilla de tinta con un visto. No depende solo del color.') +
          P.interruptor('Descanso automático', true, 'mb-sw1') +
          P.interruptor('Vibración', true, 'mb-sw2') +
          P.interruptor('Modo gimnasio', false, 'mb-sw3'),
      ),
  );

  // Decisión 2 (cerrada): registro de lo comparado, con la elegida al centro.
  const { canto, proporcion } = decisiones.radio;
  const columnasR = [
    ['canto', `A · ${canto.nombre}`, canto, false, 'Esquinas apenas suavizadas, como el canto de una libreta. Se veía instrumento, pero a tamaño de pantalla quedaba seco.'],
    ['medio', decisiones.radioCerrado.elegido, P.R, true, 'Entre las dos: más suave que el canto, sin la blandura de Material. Botón y campo comparten radio y se apilan parejos.'],
    ['proporcion', `B · ${proporcion.nombre}`, proporcion, false, 'El radio es 2/7 del alto, la proporción de las barras del símbolo (radio 2 en barra de 7). Casi lo que la app tiene hoy.'],
  ];
  const opR = columnasR
    .map(([id, nombre, r, elegida, por]) => {
      const valores = `Botón ${r.button} · campo ${r.field} · tarjeta ${r.card} · chip ${r.chip === 999 ? 'redondo' : r.chip} · etiqueta ${r.tag}`;
      return div(
        S({ boxSizing: 'border-box', background: c.surface, border: elegida ? `2px solid ${TINTA}` : `1px solid ${c.line}`, borderRadius: 16, padding: 24 }),
        div(S({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }), div(S({ fontFamily: SANS, fontSize: 20, lineHeight: '26px', fontWeight: 700, color: TINTA }), esc(nombre)) + (elegida ? insignia('Elegida') : insignia('Comparada', true))) +
          div(S({ fontFamily: MONO, fontSize: 14, lineHeight: '20px', color: TINTA, marginTop: 6 }), esc(valores)) +
          div(ts('secundario', c.ink.muted, { marginTop: '6px', minHeight: '60px' }), esc(por)) +
          div(
            S({ display: 'flex', gap: 24, alignItems: 'flex-end', marginTop: 16 }),
            [['Botón y campo', r.button], ['Tarjeta', r.card]]
              .map(([n, v]) => div('', div(S({ width: 132, height: 72, boxSizing: 'border-box', borderTop: `3px solid ${TINTA}`, borderLeft: `3px solid ${TINTA}`, borderTopLeftRadius: v * 4 }), '') + div(ts('nota', c.ink.muted, { marginTop: '4px' }), `${n}: ${v}, esquina a 4×`)))
              .join(''),
          ) +
          div(S({ marginTop: 18 }), P.tarjeta(div(ts('tituloTarjeta', TINTA), 'Día A · Piernas') + div(ts('secundario', c.ink.muted), '5 ejercicios · 45 min') + div(S({ marginTop: 12 }), P.sugerencia({ texto: 'Sube a 32,5 kg en sentadilla.' })), { radio: r.card })) +
          div(S({ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }), P.chip('Piernas', true, { radio: r.chip }) + P.chip('Empuje', false, { radio: r.chip })) +
          div(
            S({ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }),
            P.campo({ id: `mb-r-${id}`, etiqueta: 'Correo', valor: 'camila@correo.cl', radio: r.field, ancho: '100%' }) +
              P.boton({ v: 'primario', tam: 'grande', texto: 'Empezar rutina', radio: r.button, ancho: '100%' }) +
              P.boton({ v: 'borde', texto: 'Cancelar', radio: r.button, ancho: '100%' }),
          ),
      );
    })
    .join('');
  const decision = div(
    S({ marginTop: 56 }),
    h2('Decisión 2 · el radio de las esquinas (cerrada)', `Elegido el ${decisiones.radioCerrado.fecha}: punto medio entre las dos opciones comparadas. El símbolo usa radio 2 en una barra de 7; la app hoy usa 13 a 16. Las mismas piezas en las tres.`) +
      div(S({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', columnGap: 24, alignItems: 'start' }), opR),
  );

  return cabecera(3, 'Botones y controles', 'Se aciertan con el pulgar cansado', `Cinco variantes, tres tamaños y cinco estados. Ningún toque bajo 48 dp; 56 en kilos, repeticiones y «Serie hecha». Las piezas usan el radio de punto medio: ${P.R.button} en botón y campo, ${P.R.card} en tarjeta.`) + tabla + noche + controles + decision;
}

// ── Tablero 4: componentes ───────────────────────────────────────────────────
function tableroComponentes() {
  const campos =
    h2('Campo de texto', 'Etiqueta arriba, 48 de alto, borde de trazo. El error dice qué hacer.') +
    div(
      S({ display: 'flex', flexDirection: 'column', gap: 18 }),
      P.campo({ id: 'mc-c1', etiqueta: 'Correo', placeholder: 'nombre@correo.cl', valor: '', estado: 'vacio' }) +
        P.campo({ id: 'mc-c2', etiqueta: 'Correo', valor: 'camila@', estado: 'foco' }) +
        P.campo({ id: 'mc-c3', etiqueta: 'Correo', valor: 'camila@correo', estado: 'error', ayuda: 'Falta el final del correo, por ejemplo camila@correo.cl.' }) +
        P.campo({ id: 'mc-c4', etiqueta: 'Contraseña', valor: '••••••••••', estado: 'correcto', ayuda: '8 caracteres o más.', tipo: 'password' }),
    ) +
    div(ts('nota', c.ink.muted, { marginTop: '12px', maxWidth: '320px' }), 'Vacío, con foco (borde de 2 en menta profunda), con error (borde de error y mensaje) y correcto (visto y borde menta profunda).');
  const avisos =
    h2('Avisos', 'En línea, sobre la pantalla. El texto va en tinta; el color está en el fondo y el ícono.', { marginTop: 36 }) +
    div(
      S({ display: 'flex', flexDirection: 'column', gap: 10 }),
      P.aviso({ tipo: 'info', fuerte: 'Sin señal.', texto: 'Tus series se guardan en el teléfono.', ancho: 340 }) +
        P.aviso({ tipo: 'exito', fuerte: 'Sesión guardada.', texto: 'Javier la ve esta noche.', ancho: 340 }) +
        P.aviso({ tipo: 'aviso', fuerte: 'Tres sesiones en 30 kg.', texto: 'Revisa la sugerencia de carga.', ancho: 340 }) +
        P.aviso({ tipo: 'error', fuerte: 'No se pudo guardar.', texto: 'Revisa la conexión y vuelve a intentar.', ancho: 340 }),
    );
  const col1 = div('', campos + avisos);

  const col2 =
    h2('Tarjeta', `Superficie con línea, radio ${P.R.card}, relleno 16. Sin sombra.`) +
    P.tarjeta(
      div(S({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }), div('', div(ts('tituloTarjeta', TINTA), 'Día A · Piernas') + div(ts('secundario', c.ink.muted), '5 ejercicios · unos 45 min')) + div(ts('etiqueta', c.ink.muted), 'Hoy')) +
        div(S({ marginTop: 12, display: 'flex', gap: 20 }), div('', div(ts('cifra', TINTA), '4,3 t') + div(ts('nota', c.ink.muted), 'volumen la vez pasada')) + div('', div(ts('cifra', TINTA), '52:10') + div(ts('nota', c.ink.muted), 'duración'))),
    ) +
    h2('La nota al margen', 'La voz del entrenador. Raya de acento a la izquierda, firma en acento profundo, texto en tinta. No es una tarjeta: es el margen de la página.', { marginTop: 32 }) +
    div(S({ padding: '4px 0' }), P.nota({ texto: 'Baja hasta la paralela. Si la rodilla molesta, quédate en 27,5 kg y me cuentas.' })) +
    h2('La sugerencia de carga', 'La página siguiente que escribe la app. Misma forma, raya menta.', { marginTop: 28 }) +
    P.sugerencia({ texto: 'Intenta 30 kg × 10 a 12. Si logras 12 con RIR 2 o más, sube a 32,5 kg.' }) +
    h2('Tarjeta de récord', 'La cifra en tinta, subrayada con el acento. Lo nota y sigue.', { marginTop: 32 }) +
    P.record({});

  const bitacora = P.tarjeta(
    div(S({ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }), div('', div(ts('tituloTarjeta', TINTA), 'Sentadilla') + div(ts('nota', c.ink.muted), '4 series · descanso 1:30')) + div(ts('nota', c.ink.muted), 'Paso de 2,5 kg')) +
      P.cabeceraBitacora() +
      P.filaSet({ n: 1, kg: '27,5', reps: '10', rir: '3', estado: 'hecha' }) +
      P.filaSet({ n: 2, kg: '30', reps: '8', rir: '0', estado: 'fallo' }) +
      P.filaActiva({}) +
      P.filaSet({ n: 4, kg: '30', reps: '10', rir: '–', estado: 'pendiente' }),
    { pad: 14 },
  );
  const leyenda = [
    ['Hecha', 'Cifras en tinta, círculo menta con visto de tinta.'],
    ['Con fallo', 'Círculo de error suave con ícono. La fila no se pinta de rojo.'],
    ['Activa', 'Fondo menta suave, borde menta profunda, steppers de 56.'],
    ['Pendiente', 'Cifras tenues, círculo vacío de trazo.'],
  ]
    .map(([a, b]) => div(S({ display: 'flex', gap: 8, marginTop: 6 }), span(S({ width: 90, flex: 'none', fontFamily: SANS, fontSize: 14, lineHeight: '20px', fontWeight: 700, color: TINTA }), a) + span(ts('nota', c.ink.muted, { lineHeight: '20px' }), b)))
    .join('');
  const pestanas = div(
    S({ display: 'flex', gap: 24, marginTop: 8 }),
    div('', h3('Claro') + P.barraPestanas({ activa: 'Hoy' })) + div('', h3('Modo gimnasio') + div(S({ background: g.bg, paddingTop: 0 }), P.barraPestanas({ T: NOCHE, activa: 'Progreso' }))),
  );
  const col3 =
    h2('La fila de bitácora: el renglón', 'Cada serie es un renglón de 48. Columnas fijas: serie, kg, reps, RIR y estado. La cifra se lee primero.') +
    div(S({ display: 'grid', gridTemplateColumns: '440px 1fr', columnGap: 24, alignItems: 'start' }), bitacora + div('', h3('Estados del renglón') + leyenda)) +
    h2('Barra de pestañas', 'Cinco pestañas, 64 de alto más la zona segura. La activa: ficha menta detrás del ícono, ícono y nombre en tinta y en negrita.', { marginTop: 36 }) +
    pestanas;
  return cabecera(4, 'Componentes', 'Renglones, margen y página siguiente', 'Las piezas de la libreta sobre el kit que ya existe: Campo, Tarjeta, Fila, la bitácora (FilaSet y FilaActiva), PanelDescanso y la barra de pestañas.') +
    div(S({ display: 'grid', gridTemplateColumns: '340px 380px 1fr', columnGap: 40, alignItems: 'start' }), col1 + div('', col2) + div('', col3));
}

// ── Tablero 5: animaciones ───────────────────────────────────────────────────
const KEYFRAMES = `@media (prefers-reduced-motion: no-preference){
@keyframes gtPresion{0%,30%{transform:scale(1);background-color:${c.primary.DEFAULT}}33%{transform:scale(0.97);background-color:${c.primary.pressed}}48%{transform:scale(0.97);background-color:${c.primary.pressed}}54%,100%{transform:scale(1);background-color:${c.primary.DEFAULT}}}
@keyframes gtDedo{0%,28%{opacity:0;transform:scale(0.6)}33%,48%{opacity:0.35;transform:scale(1)}56%,100%{opacity:0;transform:scale(1.1)}}
@keyframes gtMarca{0%,35%{transform:scale(0.6);opacity:0}40%,92%{transform:scale(1);opacity:1}100%{transform:scale(1);opacity:0}}
@keyframes gtCifras{0%,35%{color:${c.ink.faint}}40%,92%{color:${c.ink.DEFAULT}}100%{color:${c.ink.faint}}}
@keyframes gtVacio{0%,35%{opacity:1}38%,94%{opacity:0}100%{opacity:1}}
@keyframes gtDigitos{0%{transform:translateY(0);animation-timing-function:steps(9,end)}81.8%{transform:translateY(-540px)}100%{transform:translateY(-540px)}}
@keyframes gtBarra{0%{transform:scaleX(1);animation-timing-function:linear}81.8%{transform:scaleX(0)}100%{transform:scaleX(0)}}
@keyframes gtDestello{0%,81.8%{opacity:0}84.5%{opacity:0.3}90%,100%{opacity:0}}
@keyframes gtEtqA{0%,81%{opacity:1}82%,99%{opacity:0}100%{opacity:1}}
@keyframes gtEtqB{0%,81%{opacity:0}82%,99%{opacity:1}100%{opacity:0}}
@keyframes gtRecord{0%,10%{opacity:0;transform:translateY(6px)}15.5%,88%{opacity:1;transform:translateY(0)}96%,100%{opacity:0;transform:translateY(0)}}
@keyframes gtRaya{0%,13%{transform:scaleX(0)}20.5%,100%{transform:scaleX(1)}}
@keyframes gtGiro{to{transform:rotate(360deg)}}
.gt-presion{animation:gtPresion 2.4s infinite}
.gt-dedo{animation:gtDedo 2.4s infinite}
.gt-marca{animation:gtMarca 3s cubic-bezier(0.2,0,0,1) infinite}
.gt-cifras>div{animation:gtCifras 3s infinite}
.gt-vacio{animation:gtVacio 3s infinite}
.gt-digitos{animation:gtDigitos 11s infinite}
.gt-barra{animation:gtBarra 11s infinite}
.gt-destello{animation:gtDestello 11s infinite}
.gt-etq-a{animation:gtEtqA 11s infinite}
.gt-etq-b{animation:gtEtqB 11s infinite}
.gt-record{animation:gtRecord 4s cubic-bezier(0.2,0,0,1) infinite}
.gt-raya{animation:gtRaya 4s cubic-bezier(0.2,0,0,1) infinite}
.gt-giro{animation:gtGiro 0.9s linear infinite}
}`;

const EVENTOS = [
  ['Presionar un botón', 'El botón baja a 97 % y el relleno pasa a su tono presionado. Al soltar, vuelve.', '90 ms al bajar, 150 ms al soltar', 'salida', 'Ninguna. Más y menos: selección.', 'Sin escala: solo cambia el relleno.'],
  ['Marcar una serie', 'El círculo se llena de menta (de 60 % a 100 %) y el visto aparece. Las cifras pasan de tenue a tinta. La fila activa baja a la serie siguiente.', '150 ms el círculo, 220 ms el cambio de fila', 'salida', 'Impacto leve. Con «Fallé», impacto medio.', 'Cambio inmediato, sin escala.'],
  ['Empieza el descanso', 'El panel sube 8 dp y aparece.', '220 ms', 'salida', 'Ninguna: ya vibró la serie.', 'Aparece solo con opacidad, 120 ms.'],
  ['Corre el descanso', 'La barra se acorta en línea recta con el tiempo real. La cifra cambia una vez por segundo, sin animarse.', 'Lo que dura el descanso', 'lineal', 'Ninguna.', 'La barra avanza una vez por segundo, a saltos.'],
  ['Termina el descanso', 'El panel se ilumina una vez con el acento y la etiqueta cambia a «Listo: serie 3». No se repite.', '300 ms de ida y 300 de vuelta', 'cambio', 'Éxito, una vez.', 'Sin destello: cambia la etiqueta. La vibración se mantiene.'],
  ['Aparece un récord', 'La tarjeta sube 6 dp y aparece. Después, el subrayado de acento se dibuja bajo la cifra. Luego queda quieta.', '220 ms la tarjeta; 300 ms el subrayado, desde los 120 ms', 'salida', 'Éxito, una vez por sesión.', 'Aparece con opacidad, 120 ms, ya subrayada.'],
  ['Pasar de pantalla', 'La pantalla nueva sube 16 dp y aparece; al volver, al revés. Entre pestañas no hay movimiento.', '220 ms al entrar, 180 ms al volver', 'salida / entrada', 'Ninguna.', 'Fundido de 120 ms, sin desplazamiento.'],
  ['Error en un campo', 'El borde pasa a error y el mensaje aparece debajo. Sin sacudida.', '150 ms', 'cambio', 'Aviso, solo al tocar «Guardar» o «Entrar» con errores.', 'Cambio inmediato.'],
  ['Cargar', 'El botón mantiene su ancho, cambia el texto («Guardando…») y gira un círculo. Solo si tarda más de 300 ms. Listas: renglones grises quietos.', 'Una vuelta cada 900 ms', 'lineal', 'Ninguna.', 'El círculo no gira: queda el texto.'],
];

function tableroAnimaciones() {
  const principios = [
    ['Solo se mueve lo que informa.', 'Una serie marcada, el descanso que corre, un récord. Lo demás se queda quieto hasta que alguien lo toca.'],
    ['Corto y sin rebote.', 'Nada pasa de 300 ms salvo el descanso. Ninguna curva se pasa de largo. Nada de confeti.'],
    ['La vibración confirma.', 'Vibra lo que pasó de verdad: una serie, el fin del descanso, un récord. Nunca mientras escribes.'],
    ['Reducir movimiento manda.', 'Si está activado, nada se desplaza ni escala. Queda el cambio de color, el texto y la vibración.'],
  ];
  const cajaPrin = div(
    S({ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', columnGap: 20 }),
    principios.map(([a, b]) => div(S({ padding: 18, background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12 }), div(S({ fontFamily: SANS, fontSize: 17, lineHeight: '22px', fontWeight: 700, color: TINTA }), esc(a)) + div(ts('secundario', c.ink.muted, { marginTop: '6px' }), esc(b)))).join(''),
  );
  const dur = Object.entries(motion.duracion)
    .map(([n, ms]) => div(S({ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }), span(S({ width: 80, fontFamily: SANS, fontSize: 14, fontWeight: 700, color: TINTA }), n) + span(S({ width: 64, fontFamily: MONO, fontSize: 14, color: TINTA, textAlign: 'right' }), `${ms} ms`) + span(S({ height: 8, width: ms, background: c.primary.deep, borderRadius: 4 }), '')))
    .join('');
  const curvaSvg = (p) => {
    const [x1, y1, x2, y2] = p;
    const X = (v) => 6 + v * 88;
    const Y = (v) => 94 - v * 88;
    return `<svg aria-hidden="true" width="100" height="100" viewBox="0 0 100 100" style="display:block"><rect x="6" y="6" width="88" height="88" fill="none" stroke="${c.line}" stroke-width="1"></rect><path d="M${X(0)} ${Y(0)}C${X(x1)} ${Y(y1)} ${X(x2)} ${Y(y2)} ${X(1)} ${Y(1)}" fill="none" stroke="${TINTA}" stroke-width="2.5" stroke-linecap="round"></path></svg>`;
  };
  const usos = { salida: 'Lo que entra o responde', entrada: 'Lo que sale', cambio: 'Un estado que cambia', lineal: 'Tiempo real y giros' };
  const curvas = div(
    S({ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', columnGap: 12, marginTop: 12 }),
    Object.entries(motion.curva).map(([n, p]) => div('', curvaSvg(p) + div(S({ fontFamily: SANS, fontSize: 14, lineHeight: '18px', fontWeight: 700, color: TINTA, marginTop: 4 }), n) + div(S({ fontFamily: MONO, fontSize: 13, lineHeight: '16px', color: TINTA }), p.join(', ')) + div(ts('nota', c.ink.muted), usos[n]))).join(''),
  );
  const fichas = div(S({ display: 'grid', gridTemplateColumns: '440px 1fr', columnGap: 40, padding: 20, background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12 }), div('', h3('Duraciones') + dur + div(ts('nota', c.ink.muted, { marginTop: '12px' }), 'El descanso no tiene ficha: dura lo que dura, en línea recta.')) + div('', h3('Curvas') + curvas));

  // Demostraciones
  const demo = (titulo, pie, html) =>
    div(S({ boxSizing: 'border-box', padding: 18, background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12, display: 'flex', flexDirection: 'column' }), h3(titulo, TINTA) + div(S({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 230 }), html) + div(ts('nota', c.ink.muted, { marginTop: '10px' }), pie));
  const d1 = div(S({ position: 'relative' }), P.boton({ v: 'primario', tam: 'grande', texto: 'Serie hecha', clase: 'gt-presion', ancho: '220px' }) + `<span class="gt-dedo" aria-hidden="true" style="${S({ position: 'absolute', left: 92, top: 10, width: 36, height: 36, borderRadius: '50%', background: TINTA, opacity: 0, pointerEvents: 'none' })}"></span>`);
  const d2 = div(
    S({ width: 300 }),
    P.cabeceraBitacora() +
      P.filaSet({ n: 1, kg: '27,5', reps: '10', rir: '3', estado: 'hecha' }) +
      `<div style="${S({ position: 'relative' })}">${P.filaSet({ n: 2, kg: '30', reps: '10', rir: '2', estado: 'hecha', claseCifras: 'gt-cifras', claseMarca: 'gt-marca' })}<span class="gt-vacio" aria-hidden="true" style="${S({ position: 'absolute', right: 4, top: 10, width: 28, height: 28, boxSizing: 'border-box', borderRadius: '50%', border: `1.5px solid ${c.stroke}`, opacity: 0 })}"></span></div>`,
  );
  const digitos = `<div style="${S({ display: 'flex', alignItems: 'flex-start' })}"><span style="${ts('cronometro', TINTA)}">0:0</span><span style="${S({ display: 'block', height: 60, overflow: 'hidden' })}"><span class="gt-digitos" style="${S({ display: 'block' })}">${[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((n) => `<span style="${ts('cronometro', TINTA, { display: 'block', height: '60px' })}">${n}</span>`).join('')}</span></span></div>`;
  const d3 = div(S({ width: 330 }), P.descanso({ cifraHtml: digitos, pct: 100, siguiente: 'Siguiente: Sentadilla, serie 3', clases: { barra: 'gt-barra', destello: 'gt-destello', etiqueta: 'gt-etq-a', listo: 'gt-etq-b' } }));
  const d4 = div(S({ width: 310 }), P.record({ claseRaya: 'gt-raya', claseCaja: 'gt-record' }));
  const demos = div(
    S({ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', columnGap: 20 }),
    demo('Presionar un botón', '90 ms al bajar a 97 %, 150 ms al volver. Sin vibración.', d1) +
      demo('Marcar una serie', 'El círculo llena en 150 ms y las cifras pasan a tinta. Impacto leve.', d2) +
      demo('El descanso corre y termina', 'Demo de 9 s. La barra es lineal; la cifra salta cada segundo. Al final, un destello y vibración de éxito.', d3) +
      demo('Aparece un récord', 'Sube 6 dp en 220 ms; el subrayado se dibuja en 300 ms. Vibración de éxito, una vez.', d4),
  );
  const cel = (t, w, bold = false) => `<td style="${S({ width: w, padding: '10px 12px 10px 0', verticalAlign: 'top', borderTop: `1px solid ${c.line}`, fontFamily: SANS, fontSize: 14, lineHeight: '20px', fontWeight: bold ? 700 : 400, color: TINTA })}">${esc(t)}</td>`;
  const th = (t) => `<th scope="col" style="${S({ textAlign: 'left', padding: '0 12px 8px 0', fontFamily: MONO, fontSize: 13, lineHeight: '16px', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', color: c.ink.muted })}">${t}</th>`;
  const tabla = `<table style="${S({ width: '100%', borderCollapse: 'collapse' })}"><thead><tr>${['Evento', 'Qué se mueve', 'Duración', 'Curva', 'Vibración', 'Reducir movimiento'].map(th).join('')}</tr></thead><tbody>${EVENTOS.map(([a, b, d, cu, v, r]) => `<tr>${cel(a, 180, true)}${cel(b, 480)}${cel(d, 200)}${cel(cu, 110)}${cel(v, 240)}${cel(r, 250)}</tr>`).join('')}</tbody></table>`;
  return cabecera(5, 'Movimiento', 'Solo se mueve lo que informa', 'Duraciones y curvas fijas, una vibración por evento que importa y todo listo para «reducir movimiento». Las demos corren en bucle; con reducir movimiento activado se ven quietas.') +
    cajaPrin +
    div(S({ marginTop: 24 }), fichas) +
    div(S({ marginTop: 24 }), demos) +
    div(S({ marginTop: 40 }), h2('Cada evento', 'Reanimated 4 para el movimiento, expo-haptics para la vibración.') + tabla);
}

// ── Ensamblado ───────────────────────────────────────────────────────────────
const FUENTES = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;display=swap';
const TABLEROS = [
  { archivo: 'MColores.dc.html', titulo: 'Sistema · Colores', nombre: 'Colores', w: 1680, h: 3080, html: tableroColores },
  { archivo: 'MTipoEscala.dc.html', titulo: 'Sistema · Escala tipográfica', nombre: 'Escala tipográfica', w: 1200, h: 1620, html: tableroTipo },
  { archivo: 'MBotones.dc.html', titulo: 'Sistema · Botones', nombre: 'Botones y controles', w: 1680, h: 2200, html: tableroBotones },
  { archivo: 'MComponentes.dc.html', titulo: 'Sistema · Componentes', nombre: 'Componentes', w: 1680, h: 1280, html: tableroComponentes },
  { archivo: 'MAnimaciones.dc.html', titulo: 'Sistema · Animaciones', nombre: 'Animaciones', w: 1680, h: 1680, html: tableroAnimaciones, css: KEYFRAMES },
];
// Los altos salen de medir el contenido en un navegador (alto real + margen, redondeado a
// 20). Si agregas contenido, vuelve a medir: la raíz recorta lo que sobra sin avisar.

function raiz(t, cuerpo) {
  return `<div style="${S({ width: t.w, height: t.h, position: 'relative', overflow: 'hidden', background: c.bg, boxSizing: 'border-box', padding: 56 })}">${cuerpo}</div>`;
}
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
<style>body{margin:0}${t.css ? '\n' + t.css + '\n' : ''}</style>
</helmet>
${raiz(t, cuerpo)}
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
  const css = TABLEROS.filter((t) => t.css).map((t) => t.css).join('\n');
  const indice = TABLEROS.map((t) => `<a href="#${t.archivo.replace('.dc.html', '')}" style="${S({ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: c.primary.deep, marginRight: 20 })}">${t.nombre}</a>`).join('');
  const cuerpo = TABLEROS.map((t, i) => `<section id="${t.archivo.replace('.dc.html', '')}" style="${S({ margin: '0 0 64px' })}"><div style="${S({ fontFamily: MONO, fontSize: 13, color: c.ink.muted, margin: '0 0 10px' })}">${t.archivo} · ${t.w} × ${t.h}</div><div style="${S({ width: t.w, height: t.h, boxShadow: `0 0 0 1px ${c.line}` })}">${raiz(t, partes[i])}</div></section>`).join('\n');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sistema de diseño GymTrack</title>
<link href="${FUENTES}" rel="stylesheet">
<style>body{margin:0;background:#E9EDEA;padding:40px}
${css}
</style>
</head>
<body>
<header style="${S({ margin: '0 0 32px' })}"><div style="${S({ fontFamily: MONO, fontSize: 13, letterSpacing: '0.8px', textTransform: 'uppercase', color: c.ink.muted })}">Fase 5 · propuesta para revisar</div><h1 style="${S({ margin: '6px 0 12px', fontFamily: SANS, fontSize: 32, fontWeight: 700, color: TINTA })}">Sistema de diseño GymTrack</h1><nav aria-label="Tableros">${indice}</nav></header>
${cuerpo}
</body>
</html>
`;
}

function main() {
  fs.mkdirSync(CARPETA, { recursive: true });
  const partes = TABLEROS.map((t) => t.html());
  TABLEROS.forEach((t, i) => fs.writeFileSync(path.join(CARPETA, t.archivo), dc(t, partes[i])));
  fs.writeFileSync(path.join(__dirname, '..', 'especimen-sistema.html'), especimen(partes));
  // Índice del lienzo: filas a 360 px bajo el borde inferior de la fila anterior.
  const [col, tip, bot, com, ani] = TABLEROS;
  const y1 = 4020;
  const y2 = y1 + Math.max(col.h, tip.h) + 360;
  const y3 = y2 + Math.max(bot.h, com.h) + 360;
  const pos = [[col, 0, y1], [tip, 1760, y1], [bot, 0, y2], [com, 1760, y2], [ani, 0, y3]];
  const boards = {};
  for (const [t, x, y] of pos) boards[t.archivo] = { x, y, w: t.w, h: t.h, title: t.nombre, page: 'marca' };
  const json = {
    boards,
    order: TABLEROS.map((t) => t.archivo),
    notes: { msi0: { x: 0, y: 3720, text: 'Sistema: colores, botones, componentes y movimiento', kind: 'title1', maxW: 3440, page: 'marca' } },
  };
  fs.writeFileSync(path.join(__dirname, '..', 'sistema-tableros.json'), JSON.stringify(json, null, 2) + '\n');
  console.log(TABLEROS.map((t) => `${t.archivo} ${t.w}×${t.h}`).join('\n'));
}
main();
