// ─────────────────────────────────────────────────────────────────────────────
// Validación de contraste · Zona: Diseño · herramienta de la Fase 5 de marca
//
// Qué hace: calcula la razón de contraste WCAG 2.x de cada par texto/fondo y gráfico/fondo que
// usa el sistema propuesto, en claro y en modo gimnasio, para las tres opciones del segundo
// acento. Texto: 4,5:1 o más. Texto grande (24 dp o 19 dp en negrita) y gráficos de
// interfaz (bordes de control, foco, íconos, barras): 3:1 o más.
// Uso: `node docs/marca/sistema/contraste.js` imprime la tabla en Markdown y sale con código 1
// si algún par no pasa. `--json` imprime los pares con su razón.
// Depende de: ./tokens-propuestos.js.
// ─────────────────────────────────────────────────────────────────────────────

const { colors: c, decisiones } = require('./tokens-propuestos.js');

// ── Fórmula WCAG ─────────────────────────────────────────────────────────────
function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function razon(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// ── Pares ────────────────────────────────────────────────────────────────────
// tipo: 'texto' (4,5), 'grande' (3, texto de 24 dp o más), 'grafico' (3).
const T = 'texto';
const G = 'grafico';
const claro = [
  [T, 'Tinta', c.ink.DEFAULT, 'Papel', c.bg, 'Todo el texto'],
  [T, 'Tinta', c.ink.DEFAULT, 'Superficie', c.surface, 'Texto en tarjetas y campos'],
  [T, 'Tinta', c.ink.DEFAULT, 'Campo', c.field, 'Chip inactivo, etiqueta, selector'],
  [T, 'Tinta', c.ink.DEFAULT, 'Menta', c.primary.DEFAULT, 'Botón primario, chip activo, RIR'],
  [T, 'Tinta', c.ink.DEFAULT, 'Menta presionada', c.primary.pressed, 'Botón primario presionado'],
  [T, 'Tinta', c.ink.DEFAULT, 'Menta suave', c.primary.soft, 'Fila activa, aviso de éxito'],
  [T, 'Tinta', c.ink.DEFAULT, 'Menta suave presionada', c.primary.softPressed, 'Botón secundario presionado'],
  [T, 'Tinta', c.ink.DEFAULT, 'Campo', c.field, 'Botón de borde presionado'],
  [T, 'Tinta', c.ink.DEFAULT, 'Error suave', c.danger.soft, 'Aviso de error'],
  [T, 'Tinta', c.ink.DEFAULT, 'Aviso suave', c.warning.soft, 'Aviso de estancamiento'],
  [T, 'Grafito', c.ink.muted, 'Papel', c.bg, 'Texto secundario'],
  [T, 'Grafito', c.ink.muted, 'Superficie', c.surface, 'Secundario en tarjetas'],
  [T, 'Grafito', c.ink.muted, 'Campo', c.field, 'Segmento sin elegir'],
  [T, 'Grafito', c.ink.muted, 'Menta suave', c.primary.soft, 'Etiquetas en la fila activa'],
  [T, 'Grafito', c.ink.muted, 'Error suave', c.danger.soft, 'Detalle en aviso de error'],
  [T, 'Grafito', c.ink.muted, 'Aviso suave', c.warning.soft, 'Detalle en aviso'],
  [T, 'Tenue', c.ink.faint, 'Papel', c.bg, 'Serie pendiente'],
  [T, 'Tenue', c.ink.faint, 'Superficie', c.surface, 'Placeholder del campo'],
  [T, 'Menta profunda', c.primary.deep, 'Papel', c.bg, 'Enlace, «Correcto»'],
  [T, 'Menta profunda', c.primary.deep, 'Superficie', c.surface, 'Enlace en tarjeta'],
  [T, 'Menta profunda', c.primary.deep, 'Menta suave', c.primary.soft, '«Serie 2» en la fila activa'],
  [T, 'Error texto', c.danger.deep, 'Papel', c.bg, 'Mensaje de error'],
  [T, 'Error texto', c.danger.deep, 'Superficie', c.surface, 'Error en tarjeta'],
  [T, 'Error texto', c.danger.deep, 'Error suave', c.danger.soft, 'Botón de peligro'],
  [T, 'Error texto', c.danger.deep, 'Error suave presionado', c.danger.softPressed, 'Botón de peligro presionado'],
  [T, 'Aviso texto', c.warning.deep, 'Papel', c.bg, 'Etiqueta de aviso'],
  [T, 'Aviso texto', c.warning.deep, 'Aviso suave', c.warning.soft, 'Título del aviso'],
  [G, 'Trazo', c.stroke, 'Papel', c.bg, 'Borde de campo y botón de borde'],
  [G, 'Trazo', c.stroke, 'Superficie', c.surface, 'Borde de campo en tarjeta'],
  [G, 'Menta profunda', c.primary.deep, 'Superficie', c.surface, 'Foco del campo, barra de progreso'],
  [G, 'Menta profunda', c.primary.deep, 'Menta suave', c.primary.soft, 'Borde de la fila activa'],
  [G, 'Tinta', c.ink.DEFAULT, 'Menta', c.primary.DEFAULT, 'Visto de la serie hecha'],
  [G, 'Tinta', c.ink.DEFAULT, 'Papel', c.bg, 'Anillo de foco'],
  [G, 'Error', c.danger.DEFAULT, 'Papel', c.bg, 'Ícono de error'],
  [G, 'Error', c.danger.DEFAULT, 'Superficie', c.surface, 'Borde del campo con error'],
  [G, 'Aviso', c.warning.DEFAULT, 'Papel', c.bg, 'Ícono de aviso'],
  [G, 'Aviso', c.warning.DEFAULT, 'Superficie', c.surface, 'Borde de aviso'],
];
const gym = c.gym;
const noche = [
  [T, 'Texto', gym.text, 'Fondo', gym.bg, 'Todo el texto'],
  [T, 'Texto', gym.text, 'Superficie', gym.card, 'Texto en tarjetas'],
  [T, 'Texto', gym.text, 'Campo', gym.field, 'Chip inactivo, selector'],
  [T, 'Texto', gym.text, 'Menta noche', c.primary.night, 'Fila activa'],
  [T, 'Texto', gym.text, 'Error noche', c.danger.night, 'Aviso de error'],
  [T, 'Texto', gym.text, 'Aviso noche', c.warning.night, 'Aviso'],
  [T, 'Tinta', c.ink.DEFAULT, 'Menta', c.primary.DEFAULT, 'Botón primario (igual que en claro)'],
  [T, 'Tinta', c.ink.DEFAULT, 'Menta presionada', c.primary.pressed, 'Botón primario presionado'],
  [T, 'Secundario', gym.muted, 'Fondo', gym.bg, 'Texto secundario'],
  [T, 'Secundario', gym.muted, 'Superficie', gym.card, 'Secundario en tarjetas'],
  [T, 'Secundario', gym.muted, 'Campo', gym.field, 'Segmento sin elegir'],
  [T, 'Secundario', gym.muted, 'Menta noche', c.primary.night, 'Etiquetas en la fila activa'],
  [T, 'Tenue', gym.faint, 'Fondo', gym.bg, 'Serie pendiente'],
  [T, 'Tenue', gym.faint, 'Superficie', gym.card, 'Placeholder'],
  [T, 'Menta clara', c.primary.bright, 'Fondo', gym.bg, 'Enlace, «Correcto»'],
  [T, 'Menta clara', c.primary.bright, 'Superficie', gym.card, 'Enlace en tarjeta'],
  [T, 'Menta clara', c.primary.bright, 'Menta noche', c.primary.night, '«Serie 2» en la fila activa'],
  [T, 'Error claro', c.danger.bright, 'Fondo', gym.bg, 'Mensaje de error'],
  [T, 'Error claro', c.danger.bright, 'Superficie', gym.card, 'Error en tarjeta'],
  [T, 'Error claro', c.danger.bright, 'Error noche', c.danger.night, 'Botón de peligro'],
  [T, 'Aviso claro', c.warning.bright, 'Fondo', gym.bg, 'Etiqueta de aviso'],
  [T, 'Aviso claro', c.warning.bright, 'Aviso noche', c.warning.night, 'Título del aviso'],
  [G, 'Trazo noche', gym.stroke, 'Fondo', gym.bg, 'Borde de campo'],
  [G, 'Trazo noche', gym.stroke, 'Superficie', gym.card, 'Borde de campo en tarjeta'],
  [G, 'Menta', c.primary.DEFAULT, 'Fondo', gym.bg, 'Foco, barra de progreso'],
  [G, 'Menta', c.primary.DEFAULT, 'Superficie', gym.card, 'Foco en tarjeta'],
  [G, 'Texto', gym.text, 'Fondo', gym.bg, 'Anillo de foco'],
  [G, 'Error claro', c.danger.bright, 'Superficie', gym.card, 'Borde del campo con error'],
  [G, 'Aviso claro', c.warning.bright, 'Superficie', gym.card, 'Ícono de aviso'],
];
// Cada opción del segundo acento, en claro y en modo gimnasio.
function paresAcento(o) {
  return {
    claro: [
      [T, 'Tinta', c.ink.DEFAULT, 'Acento', o.DEFAULT, 'Botón de acento'],
      [T, 'Tinta', c.ink.DEFAULT, 'Acento presionado', o.pressed, 'Botón de acento presionado'],
      [T, 'Tinta', c.ink.DEFAULT, 'Acento suave', o.soft, 'Panel de descanso, nota'],
      [T, 'Grafito', c.ink.muted, 'Acento suave', o.soft, '«Siguiente: serie 3»'],
      [T, 'Acento profundo', o.deep, 'Papel', c.bg, 'Firma de la nota al margen'],
      [T, 'Acento profundo', o.deep, 'Superficie', c.surface, 'Etiqueta del récord'],
      [T, 'Acento profundo', o.deep, 'Acento suave', o.soft, 'Etiqueta «Descanso»'],
      [G, 'Acento', o.DEFAULT, 'Papel', c.bg, 'Raya del margen, subrayado del récord'],
      [G, 'Acento', o.DEFAULT, 'Superficie', c.surface, 'Subrayado en tarjeta'],
      [G, 'Acento profundo', o.deep, 'Acento suave', o.soft, 'Barra del descanso'],
    ],
    noche: [
      [T, 'Tinta', c.ink.DEFAULT, 'Acento', o.DEFAULT, 'Botón de acento'],
      [T, 'Texto', gym.text, 'Acento noche', o.night, 'Panel de descanso'],
      [T, 'Acento claro', o.bright, 'Fondo', gym.bg, 'Firma de la nota'],
      [T, 'Acento claro', o.bright, 'Superficie', gym.card, 'Etiqueta del récord'],
      [T, 'Acento claro', o.bright, 'Acento noche', o.night, 'Etiqueta «Descanso»'],
      [G, 'Acento', o.DEFAULT, 'Fondo', gym.bg, 'Raya del margen'],
      [G, 'Acento', o.DEFAULT, 'Superficie', gym.card, 'Subrayado del récord'],
    ],
  };
}

// ── Cálculo ──────────────────────────────────────────────────────────────────
const MIN = { texto: 4.5, grande: 3, grafico: 3 };
function evaluar(lista, modo, grupo) {
  return lista.map(([tipo, fgN, fg, bgN, bg, uso]) => {
    const r = razon(fg, bg);
    return { modo, grupo, tipo, fgN, fg, bgN, bg, uso, razon: Math.round(r * 100) / 100, min: MIN[tipo], pasa: r >= MIN[tipo] };
  });
}
function todos() {
  const out = [...evaluar(claro, 'claro', 'base'), ...evaluar(noche, 'gimnasio', 'base')];
  for (const [id, o] of Object.entries(decisiones.acento)) {
    const p = paresAcento(o);
    out.push(...evaluar(p.claro, 'claro', id), ...evaluar(p.noche, 'gimnasio', id));
  }
  return out;
}

// Pares que se evitan a propósito (no están en la matriz porque no se usan).
const evitados = [
  ['Blanco', '#FFFFFF', 'Menta', c.primary.DEFAULT, 'El texto blanco del botón menta de hoy'],
  ['Menta', c.primary.DEFAULT, 'Papel', c.bg, 'Menta como texto o como único indicador sobre papel'],
  ['Tenue', c.ink.faint, 'Campo', c.field, 'Placeholder sobre un relleno gris'],
  ['Grafito de hoy', '#71817B', 'Papel', c.bg, 'El gris secundario anterior'],
  ['Tenue de hoy', '#8B9A94', 'Papel', c.bg, 'El gris tenue anterior'],
  ['Menta profunda de hoy', '#2f7f68', 'Papel', c.bg, 'La menta profunda anterior'],
  ['Gris de hoy (gym)', '#6E807A', 'Tarjeta gym de hoy', '#18211E', 'El secundario oscuro anterior'],
].map(([fgN, fg, bgN, bg, uso]) => ({ fgN, fg, bgN, bg, uso, razon: Math.round(razon(fg, bg) * 100) / 100 }));

module.exports = { luminancia, razon, todos, evitados };

// ── Salida ───────────────────────────────────────────────────────────────────
if (require.main === module) {
  const filas = todos();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ filas, evitados }, null, 2));
  } else {
    const coma = (n) => n.toFixed(2).replace('.', ',');
    const nombreGrupo = { base: 'Base', violeta: 'Acento violeta', azul: 'Acento azul', ocre: 'Acento ocre' };
    console.log('| Modo | Grupo | Primer plano | Fondo | Uso | Tipo | Razón | Mínimo | Pasa |');
    console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const f of filas) {
      console.log(`| ${f.modo} | ${nombreGrupo[f.grupo]} | ${f.fgN} \`${f.fg}\` | ${f.bgN} \`${f.bg}\` | ${f.uso} | ${f.tipo === 'texto' ? 'texto' : 'gráfico'} | ${coma(f.razon)} | ${coma(f.min)} | ${f.pasa ? 'sí' : 'NO'} |`);
    }
    const malos = filas.filter((f) => !f.pasa);
    console.log(`\nPares: ${filas.length}. Pasan: ${filas.length - malos.length}. No pasan: ${malos.length}.`);
    console.log('\nEvitados a propósito:');
    for (const e of evitados) console.log(`- ${e.fgN} ${e.fg} sobre ${e.bgN} ${e.bg}: ${coma(e.razon)}. ${e.uso}.`);
    if (malos.length) process.exitCode = 1;
  }
}
