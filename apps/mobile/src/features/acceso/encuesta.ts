// ─────────────────────────────────────────────────────────────────────────────
// Encuesta inicial (lógica) · Zona: Acceso
//
// Qué hace: las 10 preguntas fijas del PRD (§Pantallas) con sus opciones, rangos y textos de la
// maqueta encuesta.html, y el reductor que lleva la encuesta: elegir, escribir, más y menos,
// avanzar y volver sin perder respuestas, el código del entrenador, el resumen final con
// consentimiento y el guardado con reintento. También arma el cuerpo de POST /v1/me/survey y
// el texto de cada fila del resumen.
// Es lógica pura, sin React ni red: se prueba en Node (APP-011 a APP-014).
// Tócalo cuando: cambie una pregunta, una opción, un rango o un texto de la encuesta, o la forma
// del cuerpo que espera la API.
// No lo toques para: cómo se ve (PantallaEncuesta.tsx) ni las llamadas (encuestaApi.ts).
// Depende de: nada.
// ─────────────────────────────────────────────────────────────────────────────

// ── Las 10 preguntas ─────────────────────────────────────────────────────────
export type Objetivo = 'ganar_masa' | 'bajar_grasa' | 'salud_general' | 'mantenerme_activo';
export type Experiencia = 'nunca' | 'menos_de_un_ano' | 'uno_a_tres_anos' | 'mas_de_tres_anos';
export type Lugar = 'gimnasio_completo' | 'gimnasio_basico' | 'casa_mancuernas' | 'peso_corporal';
export type Lesion = 'hombro' | 'rodilla' | 'espalda_baja' | 'muneca' | 'cadera' | 'ninguna';

export interface Opcion<V> {
  v: V;
  texto: string;
  detalle?: string;
}

export interface OpcionBaldosa {
  v: number;
  cifra: string;
  unidad: string;
  /** Lo que lee el lector de pantalla («5 o más días»). */
  voz: string;
}

interface Base {
  id: IdPregunta;
  /** El nombre corto de la fila del resumen. */
  corto: string;
  titulo: string;
  ayuda: string;
}

export type IdPregunta =
  | 'objetivo'
  | 'experiencia'
  | 'dias'
  | 'lugar'
  | 'minutos'
  | 'nacimiento'
  | 'altura'
  | 'peso'
  | 'lesiones'
  | 'codigo';

export type Pregunta =
  | (Base & { tipo: 'unica'; id: 'objetivo' | 'experiencia' | 'lugar'; opciones: Opcion<string>[] })
  | (Base & { tipo: 'baldosas'; id: 'dias' | 'minutos'; opciones: OpcionBaldosa[] })
  | (Base & { tipo: 'fecha'; id: 'nacimiento' })
  | (Base & {
      tipo: 'numero';
      id: 'altura' | 'peso';
      unidad: string;
      nombre: string;
      paso: number;
      min: number;
      max: number;
      /** Donde arranca el más y menos si no hay nada escrito. */
      base: number;
      decimales: 0 | 1;
    })
  | (Base & { tipo: 'multiple'; id: 'lesiones'; opciones: Opcion<Lesion>[] })
  | (Base & { tipo: 'codigo'; id: 'codigo' });

export const PREGUNTAS: Pregunta[] = [
  {
    id: 'objetivo',
    tipo: 'unica',
    corto: 'Objetivo',
    titulo: '¿Cuál es tu objetivo principal?',
    ayuda: 'Elige el que más te importa ahora.',
    opciones: [
      { v: 'ganar_masa', texto: 'Ganar masa muscular' },
      { v: 'bajar_grasa', texto: 'Bajar grasa corporal' },
      { v: 'salud_general', texto: 'Mejorar mi salud general' },
      { v: 'mantenerme_activo', texto: 'Mantenerme activo' },
    ],
  },
  {
    id: 'experiencia',
    tipo: 'unica',
    corto: 'Experiencia',
    titulo: '¿Cuánto tiempo llevas entrenando?',
    ayuda: 'Con pesas o máquinas, de forma constante.',
    opciones: [
      { v: 'nunca', texto: 'Nunca he entrenado' },
      { v: 'menos_de_un_ano', texto: 'Menos de un año' },
      { v: 'uno_a_tres_anos', texto: 'De uno a tres años' },
      { v: 'mas_de_tres_anos', texto: 'Más de tres años' },
    ],
  },
  {
    id: 'dias',
    tipo: 'baldosas',
    corto: 'Días por semana',
    titulo: '¿Cuántos días a la semana puedes entrenar?',
    ayuda: 'Los que de verdad puedes, no los ideales.',
    opciones: [
      { v: 2, cifra: '2', unidad: 'días', voz: '2 días' },
      { v: 3, cifra: '3', unidad: 'días', voz: '3 días' },
      { v: 4, cifra: '4', unidad: 'días', voz: '4 días' },
      { v: 5, cifra: '5', unidad: 'o más', voz: '5 o más días' },
    ],
  },
  {
    id: 'lugar',
    tipo: 'unica',
    corto: 'Dónde entrenas',
    titulo: '¿Dónde entrenas?',
    ayuda: 'Así tu rutina usa solo lo que tienes a mano.',
    opciones: [
      { v: 'gimnasio_completo', texto: 'Gimnasio completo', detalle: 'Máquinas, barras y mancuernas' },
      { v: 'gimnasio_basico', texto: 'Gimnasio básico', detalle: 'Algunas máquinas y mancuernas' },
      { v: 'casa_mancuernas', texto: 'En casa con mancuernas' },
      { v: 'peso_corporal', texto: 'Solo con mi peso corporal' },
    ],
  },
  {
    id: 'minutos',
    tipo: 'baldosas',
    corto: 'Minutos por sesión',
    titulo: '¿Cuánto tiempo tienes por sesión?',
    ayuda: 'Desde que empiezas a entrenar hasta que terminas.',
    opciones: [
      { v: 30, cifra: '30', unidad: 'min', voz: '30 minutos' },
      { v: 45, cifra: '45', unidad: 'min', voz: '45 minutos' },
      { v: 60, cifra: '60', unidad: 'min', voz: '60 minutos' },
      { v: 90, cifra: '90', unidad: 'min', voz: '90 minutos' },
    ],
  },
  { id: 'nacimiento', tipo: 'fecha', corto: 'Nacimiento', titulo: '¿Cuándo naciste?', ayuda: 'Sirve para ajustar tu plan.' },
  {
    id: 'altura',
    tipo: 'numero',
    corto: 'Altura',
    titulo: '¿Cuánto mides?',
    ayuda: 'En centímetros, sin zapatillas.',
    unidad: 'cm',
    nombre: 'Altura en centímetros',
    paso: 1,
    min: 120,
    max: 230,
    base: 165,
    decimales: 0,
  },
  {
    id: 'peso',
    tipo: 'numero',
    corto: 'Peso',
    titulo: '¿Cuánto pesas hoy?',
    ayuda: 'Queda como tu primer registro de peso. Lo puedes actualizar cuando quieras en Progreso.',
    unidad: 'kg',
    nombre: 'Peso en kilos',
    paso: 0.1,
    min: 30,
    max: 250,
    base: 65,
    decimales: 1,
  },
  {
    id: 'lesiones',
    tipo: 'multiple',
    corto: 'Lesiones o molestias',
    titulo: '¿Tienes alguna lesión o molestia?',
    ayuda: 'Marca todas las que tengas ahora.',
    opciones: [
      { v: 'hombro', texto: 'Hombro' },
      { v: 'rodilla', texto: 'Rodilla' },
      { v: 'espalda_baja', texto: 'Espalda baja' },
      { v: 'muneca', texto: 'Muñeca' },
      { v: 'cadera', texto: 'Cadera' },
      { v: 'ninguna', texto: 'Ninguna' },
    ],
  },
  {
    id: 'codigo',
    tipo: 'codigo',
    corto: 'Entrenador',
    titulo: '¿Tienes un código de entrenador?',
    ayuda:
      'Si tu entrenador te dio uno, escríbelo y verá tus rutinas y tu avance. Es opcional: también lo puedes ingresar después en tu perfil.',
  },
];

export const TOTAL_PREGUNTAS = PREGUNTAS.length;
/** Índice de la pantalla de revisión, después de la última pregunta. */
export const FINAL = TOTAL_PREGUNTAS;
export const EDAD_MINIMA = 14;
export const ANO_MINIMO = 1920;
export const LARGO_CODIGO = 6;
export const MAX_DETALLE_LESIONES = 500;
export const VERSION_ENCUESTA = 1;

export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

// ── Estado ───────────────────────────────────────────────────────────────────
export interface FechaPartes {
  d: number | null;
  m: number | null;
  a: number | null;
}

export interface Respuestas {
  objetivo?: string;
  experiencia?: string;
  lugar?: string;
  dias?: number;
  minutos?: number;
  nacimiento?: FechaPartes;
  /** Lo escrito, tal cual: «164». */
  altura?: string;
  /** Lo escrito, con coma: «62,4». */
  peso?: string;
  lesiones?: Lesion[];
  lesionesTexto?: string;
  codigo?: string;
}

export interface Entrenador {
  nombre: string;
  apellido: string;
}

export type EstadoCodigo =
  | { tipo: 'vacio' }
  | { tipo: 'comprobando' }
  | { tipo: 'valido'; entrenador: Entrenador }
  | { tipo: 'error'; mensaje: string }
  /** La API no pudo comprobarlo ahora (sin red o sin la ruta): se revisa al terminar. */
  | { tipo: 'sin-comprobar' };

export interface EstadoEncuesta {
  /** Pregunta actual (0 a 9) o FINAL. */
  n: number;
  r: Respuestas;
  codigo: EstadoCodigo;
  consentimiento: boolean;
  guardando: boolean;
  errorGuardar: boolean;
  /** true mientras se cambia una respuesta desde el resumen: «Listo» vuelve al resumen. */
  editando: boolean;
  /** Error de la pregunta actual (rango, fecha imposible, edad mínima). */
  err: string | null;
  /** El último más o menos chocó con un límite (para el aviso y la vibración). */
  limite: 'min' | 'max' | null;
  /** Hoy, para la edad y el tope del año. */
  hoy: FechaPartes & { d: number; m: number; a: number };
}

export function estadoInicial(hoy: Date): EstadoEncuesta {
  return {
    n: 0,
    r: {},
    codigo: { tipo: 'vacio' },
    consentimiento: false,
    guardando: false,
    errorGuardar: false,
    editando: false,
    err: null,
    limite: null,
    hoy: { d: hoy.getDate(), m: hoy.getMonth() + 1, a: hoy.getFullYear() },
  };
}

// ── Números y fechas ─────────────────────────────────────────────────────────
/** «62,4» → 62.4; vacío o sin cifras → null. */
export function aNumero(t: string | undefined | null): number | null {
  if (t == null || t === '') return null;
  const n = parseFloat(String(t).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

/** Un número con coma decimal y sin decimal si es entero: 62.4 → «62,4», 65 → «65». */
export function conComa(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
}

export const diasDelMes = (m: number, a: number) => new Date(a, m, 0).getDate();

const fechaCompleta = (f: FechaPartes | undefined): f is { d: number; m: number; a: number } =>
  !!f && !!f.d && !!f.m && !!f.a && String(f.a).length === 4;

/** Años cumplidos a `hoy`, o null si la fecha está incompleta. */
export function edad(f: FechaPartes | undefined, hoy: { d: number; m: number; a: number }): number | null {
  if (!fechaCompleta(f)) return null;
  let e = hoy.a - f.a;
  if (f.m > hoy.m || (f.m === hoy.m && f.d > hoy.d)) e -= 1;
  return e;
}

// ── Reglas de cada pregunta ──────────────────────────────────────────────────
export const preguntaActual = (s: EstadoEncuesta): Pregunta | null => (s.n < FINAL ? PREGUNTAS[s.n] : null);

/** true si «Siguiente» (o «Terminar») se puede tocar (APP-011, APP-014). */
export function puedeSeguir(s: EstadoEncuesta): boolean {
  if (s.n === FINAL) return s.consentimiento && !s.guardando;
  const q = PREGUNTAS[s.n];
  switch (q.tipo) {
    case 'unica':
    case 'baldosas':
      return s.r[q.id] != null;
    case 'multiple':
      return (s.r.lesiones ?? []).length > 0;
    case 'fecha':
      return fechaCompleta(s.r.nacimiento);
    case 'numero':
      return aNumero(s.r[q.id]) != null;
    case 'codigo': {
      const largo = (s.r.codigo ?? '').length;
      return largo === 0 || (largo === LARGO_CODIGO && s.codigo.tipo !== 'comprobando');
    }
  }
}

/** El error que impide avanzar, o null (APP-012). */
export function errorDe(q: Pregunta, s: EstadoEncuesta): string | null {
  if (q.tipo === 'numero') {
    const v = aNumero(s.r[q.id]);
    if (v == null || v < q.min || v > q.max) return `Escribe un número entre ${q.min} y ${q.max}.`;
  }
  if (q.tipo === 'fecha') {
    const f = s.r.nacimiento;
    if (!fechaCompleta(f)) return 'Completa el día, el mes y el año.';
    if (f.a < ANO_MINIMO || f.a > s.hoy.a) return 'Revisa el año.';
    const max = diasDelMes(f.m, f.a);
    if (f.d < 1 || f.d > max) return `Revisa el día: ${MESES[f.m - 1]} de ${f.a} tiene ${max} días.`;
    const e = edad(f, s.hoy);
    if (e == null || e < 0) return 'Revisa el año.';
    if (e < EDAD_MINIMA) return `Para usar GymTrack necesitas tener ${EDAD_MINIMA} años o más.`;
  }
  return null;
}

/** El texto del botón principal. */
export function etiquetaPrincipal(s: EstadoEncuesta): string {
  if (s.n === FINAL) return s.guardando ? 'Guardando…' : s.errorGuardar ? 'Reintentar' : 'Terminar';
  if (s.editando) return 'Listo';
  if (s.n === 9 && (!(s.r.codigo ?? '').length || s.codigo.tipo === 'error')) return 'Seguir sin código';
  return 'Siguiente';
}

/** «Pregunta 3 de 10» o, al final, «Último paso · revisa y termina». */
export function textoCabecera(s: EstadoEncuesta): string {
  return s.n === FINAL ? 'Último paso · revisa y termina' : `Pregunta ${s.n + 1} de ${TOTAL_PREGUNTAS}`;
}

/** Segmentos ámbar de la barra. Al cambiar una respuesta desde el resumen, todas siguen hechas. */
export const segmentosHechos = (s: EstadoEncuesta) => (s.editando || s.n === FINAL ? TOTAL_PREGUNTAS : s.n);

/** Porcentaje de la barra con la pregunta actual incluida («Pregunta 3 de 10» = 30). */
export const porcentajeAvance = (s: EstadoEncuesta) => Math.round((Math.min(s.n + 1, TOTAL_PREGUNTAS) / TOTAL_PREGUNTAS) * 100);

/** El código como se escribe: mayúsculas, solo letras y números, hasta 6. */
export const normalizarCodigo = (t: string) =>
  t
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, LARGO_CODIGO);

export const MENSAJE_CODIGO_INVALIDO =
  'Ese código no existe o ya venció. Revísalo, pídele uno nuevo a tu entrenador o sigue sin él.';

// ── Acciones ─────────────────────────────────────────────────────────────────
export type AccionEncuesta =
  | { tipo: 'elegir'; valor: string | number }
  | { tipo: 'marcar'; valor: Lesion }
  | { tipo: 'escribir'; campo: 'altura' | 'peso' | 'd' | 'a' | 'lesionesTexto'; valor: string }
  | { tipo: 'pasar'; campo: 'altura' | 'peso' | 'd' | 'm' | 'a'; dir: 1 | -1 }
  | { tipo: 'codigo'; valor: string }
  | { tipo: 'codigoComprobado'; codigo: string; resultado: EstadoCodigo }
  | { tipo: 'siguiente' }
  | { tipo: 'atras' }
  | { tipo: 'editar'; i: number }
  | { tipo: 'consentir' }
  | { tipo: 'guardando' }
  | { tipo: 'falloGuardar'; irA?: number; err?: string; codigo?: EstadoCodigo };

const ir = (s: EstadoEncuesta, n: number): EstadoEncuesta => ({ ...s, n, err: null, limite: null });

function pasarNumero(s: EstadoEncuesta, campo: 'altura' | 'peso', dir: 1 | -1): EstadoEncuesta {
  const q = PREGUNTAS.find((x) => x.id === campo);
  if (!q || q.tipo !== 'numero') return s;
  const actual = aNumero(s.r[campo]);
  let nuevo = actual == null ? q.base : +(actual + dir * q.paso).toFixed(q.decimales);
  nuevo = Math.min(q.max, Math.max(q.min, nuevo));
  if (actual != null && nuevo === actual) return { ...s, limite: dir > 0 ? 'max' : 'min' };
  return { ...s, err: null, limite: null, r: { ...s.r, [campo]: q.decimales ? conComa(nuevo) : String(nuevo) } };
}

function pasarFecha(s: EstadoEncuesta, campo: 'd' | 'm' | 'a', dir: 1 | -1): EstadoEncuesta {
  const f: FechaPartes = { ...(s.r.nacimiento ?? { d: null, m: null, a: null }) };
  if (campo === 'a') {
    if (f.a == null || String(f.a).length !== 4) f.a = 2000;
    else {
      const n = Math.min(s.hoy.a, Math.max(ANO_MINIMO, f.a + dir));
      if (n === f.a) return { ...s, limite: dir > 0 ? 'max' : 'min' };
      f.a = n;
    }
  }
  // Día y mes dan la vuelta: de 31 pasa a 1, de diciembre a enero.
  if (campo === 'm') f.m = f.m == null ? 1 : ((f.m - 1 + dir + 12) % 12) + 1;
  if (campo === 'd') {
    const max = diasDelMes(f.m ?? 1, f.a ?? 2000);
    f.d = f.d == null ? 1 : ((Math.min(f.d, max) - 1 + dir + max) % max) + 1;
  }
  if (f.d && f.m) f.d = Math.min(f.d, diasDelMes(f.m, f.a ?? 2000));
  return { ...s, err: null, limite: null, r: { ...s.r, nacimiento: f } };
}

/** Altura en enteros; peso con coma y un decimal (lo mismo que deja escribir la maqueta). */
function limpiarNumero(campo: 'altura' | 'peso', texto: string): string {
  if (campo === 'altura') return texto.replace(/\D/g, '').slice(0, 3);
  const t = texto.replace('.', ',').replace(/[^\d,]/g, '');
  const [e = '', d] = t.split(',');
  return (d === undefined ? e.slice(0, 3) : `${e.slice(0, 3)},${d.slice(0, 1)}`);
}

export function reducirEncuesta(s: EstadoEncuesta, a: AccionEncuesta): EstadoEncuesta {
  const q = preguntaActual(s);
  switch (a.tipo) {
    case 'elegir':
      if (!q || (q.tipo !== 'unica' && q.tipo !== 'baldosas')) return s;
      return { ...s, err: null, r: { ...s.r, [q.id]: a.valor } };

    case 'marcar': {
      const antes = s.r.lesiones ?? [];
      // «Ninguna» excluye las demás (CU-09 A3).
      const sel: Lesion[] =
        a.valor === 'ninguna'
          ? antes.includes('ninguna')
            ? []
            : ['ninguna']
          : antes.includes(a.valor)
            ? antes.filter((x) => x !== a.valor)
            : [...antes.filter((x) => x !== 'ninguna'), a.valor];
      return { ...s, err: null, r: { ...s.r, lesiones: sel } };
    }

    case 'escribir': {
      if (a.campo === 'lesionesTexto') return { ...s, r: { ...s.r, lesionesTexto: a.valor.slice(0, MAX_DETALLE_LESIONES) } };
      if (a.campo === 'd' || a.campo === 'a') {
        const f: FechaPartes = { ...(s.r.nacimiento ?? { d: null, m: null, a: null }) };
        const n = parseInt(a.valor.replace(/\D/g, '').slice(0, a.campo === 'd' ? 2 : 4), 10);
        f[a.campo] = Number.isNaN(n) ? null : n;
        return { ...s, err: null, limite: null, r: { ...s.r, nacimiento: f } };
      }
      return { ...s, err: null, limite: null, r: { ...s.r, [a.campo]: limpiarNumero(a.campo, a.valor) } };
    }

    case 'pasar':
      return a.campo === 'altura' || a.campo === 'peso' ? pasarNumero(s, a.campo, a.dir) : pasarFecha(s, a.campo, a.dir);

    case 'codigo': {
      const limpio = normalizarCodigo(a.valor);
      if (limpio === (s.r.codigo ?? '') && s.codigo.tipo !== 'vacio') return s;
      const codigo: EstadoCodigo = limpio.length === LARGO_CODIGO ? { tipo: 'comprobando' } : { tipo: 'vacio' };
      return { ...s, err: null, codigo, r: { ...s.r, codigo: limpio } };
    }

    case 'codigoComprobado':
      // Si ya escribió otro código mientras se comprobaba, la respuesta vieja no sirve.
      if (a.codigo !== s.r.codigo) return s;
      return { ...s, codigo: a.resultado };

    case 'siguiente': {
      if (!q || !puedeSeguir(s)) return s;
      const err = errorDe(q, s);
      if (err) return { ...s, err };
      let t = s;
      // Con un código que no sirve, «Seguir sin código» lo borra.
      if (q.tipo === 'codigo' && s.codigo.tipo === 'error') t = { ...s, codigo: { tipo: 'vacio' }, r: { ...s.r, codigo: '' } };
      if (q.tipo === 'multiple' && (t.r.lesiones ?? []).includes('ninguna')) t = { ...t, r: { ...t.r, lesionesTexto: '' } };
      if (s.editando) return ir({ ...t, editando: false }, FINAL);
      return ir(t, s.n + 1);
    }

    case 'atras':
      if (s.n === 0 || s.guardando) return s;
      if (s.editando) return ir({ ...s, editando: false }, FINAL);
      return ir(s, s.n - 1);

    case 'editar':
      if (s.guardando) return s;
      return ir({ ...s, editando: true, errorGuardar: false }, a.i);

    case 'consentir':
      if (s.guardando) return s;
      return { ...s, consentimiento: !s.consentimiento };

    case 'guardando':
      return { ...s, guardando: true, errorGuardar: false };

    case 'falloGuardar': {
      const t: EstadoEncuesta = { ...s, guardando: false, codigo: a.codigo ?? s.codigo };
      // Un error de una respuesta lleva a esa pregunta; el resumen se ve al tocar «Listo».
      if (a.irA != null) return { ...ir({ ...t, editando: true, errorGuardar: false }, a.irA), err: a.err ?? null };
      return { ...t, errorGuardar: true };
    }
  }
}

// ── Resumen ──────────────────────────────────────────────────────────────────
/** Un tramo del texto de una fila del resumen; las cifras van en JetBrains Mono. */
export interface Tramo {
  texto: string;
  cifra?: boolean;
}

/** El entrenador del código, si el código quedó bueno. */
export const entrenadorDelCodigo = (s: EstadoEncuesta): Entrenador | null =>
  s.codigo.tipo === 'valido' && (s.r.codigo ?? '').length === LARGO_CODIGO ? s.codigo.entrenador : null;

export const nombreCompleto = (e: Entrenador) => `${e.nombre} ${e.apellido}`.trim();

/** La respuesta de una pregunta como la muestra el resumen. */
export function textoRespuesta(q: Pregunta, s: EstadoEncuesta): Tramo[] {
  const r = s.r;
  switch (q.tipo) {
    case 'unica': {
      const o = q.opciones.find((x) => x.v === r[q.id]);
      return [{ texto: o?.texto ?? 'Sin responder' }];
    }
    case 'baldosas': {
      const v = r[q.id];
      if (v == null) return [{ texto: 'Sin responder' }];
      if (q.id === 'dias') return v === 5 ? [{ texto: '5', cifra: true }, { texto: ' o más días' }] : [{ texto: String(v), cifra: true }, { texto: ' días' }];
      return [{ texto: String(v), cifra: true }, { texto: ' min' }];
    }
    case 'fecha': {
      const f = r.nacimiento;
      if (!fechaCompleta(f)) return [{ texto: 'Sin responder' }];
      return [{ texto: String(f.d), cifra: true }, { texto: ` de ${MESES[f.m - 1]} de ` }, { texto: String(f.a), cifra: true }];
    }
    case 'numero': {
      const v = r[q.id];
      return v ? [{ texto: v, cifra: true }, { texto: ` ${q.unidad}` }] : [{ texto: 'Sin responder' }];
    }
    case 'multiple': {
      const v = r.lesiones ?? [];
      if (!v.length) return [{ texto: 'Sin responder' }];
      const nombres = v.map((k) => q.opciones.find((o) => o.v === k)?.texto ?? k).join(', ');
      return [{ texto: v.includes('ninguna') || !r.lesionesTexto?.trim() ? nombres : `${nombres} · con detalle` }];
    }
    case 'codigo': {
      const e = entrenadorDelCodigo(s);
      if (e) return [{ texto: `${nombreCompleto(e)} · ` }, { texto: r.codigo ?? '', cifra: true }];
      if (s.codigo.tipo === 'sin-comprobar' && r.codigo) return [{ texto: 'Código ' }, { texto: r.codigo, cifra: true }];
      return [{ texto: 'Sin código' }];
    }
  }
}

// ── Cuerpo de POST /v1/me/survey ─────────────────────────────────────────────
/**
 * Lo que se manda al terminar: esquemaEncuestaEntrada de packages/shared/src/api/perfil.ts
 * (respuestas, consentimiento_salud y politica_version, P-25). El código de la pregunta 10 va
 * dentro de las respuestas (codigo_entrenador) y la API vincula en la misma transacción.
 */
export interface CuerpoEncuesta {
  consentimiento_salud: true;
  politica_version: string;
  respuestas: {
    objetivo: string;
    experiencia: string;
    dias_semana: number;
    lugar: string;
    minutos_sesion: number;
    /** AAAA-MM-DD. */
    fecha_nacimiento: string;
    altura_cm: number;
    peso_kg: number;
    lesiones: { zonas: Lesion[]; texto?: string };
    /** El código de la pregunta 10; null si siguió sin código. */
    codigo_entrenador: string | null;
  };
}

/** Versión de la política de privacidad que acepta la casilla (P-25). */
export const VERSION_POLITICA = '1';

/** El código que viaja en el cuerpo, o null. */
export const codigoDelCuerpo = (c: CuerpoEncuesta) => c.respuestas.codigo_entrenador;

const dos = (n: number) => String(n).padStart(2, '0');

/** Arma el cuerpo con las 10 respuestas. Lanza si falta alguna (no debería: cada paso lo exige). */
export function armarCuerpo(s: EstadoEncuesta): CuerpoEncuesta {
  const r = s.r;
  const f = r.nacimiento;
  const altura = aNumero(r.altura);
  const peso = aNumero(r.peso);
  if (
    !r.objetivo ||
    !r.experiencia ||
    r.dias == null ||
    !r.lugar ||
    r.minutos == null ||
    !fechaCompleta(f) ||
    altura == null ||
    peso == null ||
    !r.lesiones?.length
  ) {
    throw new Error('La encuesta está incompleta.');
  }
  const detalle = r.lesiones.includes('ninguna') ? '' : (r.lesionesTexto ?? '').trim();
  const codigo = (r.codigo ?? '').length === LARGO_CODIGO && s.codigo.tipo !== 'error' ? (r.codigo as string) : null;
  return {
    consentimiento_salud: true,
    politica_version: VERSION_POLITICA,
    respuestas: {
      objetivo: r.objetivo,
      experiencia: r.experiencia,
      dias_semana: r.dias,
      lugar: r.lugar,
      minutos_sesion: r.minutos,
      fecha_nacimiento: `${f.a}-${dos(f.m)}-${dos(f.d)}`,
      altura_cm: Math.round(altura),
      peso_kg: Math.round(peso * 10) / 10,
      lesiones: detalle ? { zonas: [...r.lesiones], texto: detalle } : { zonas: [...r.lesiones] },
      codigo_entrenador: codigo,
    },
  };
}

/** Pregunta a la que lleva un error de la API sobre un campo del cuerpo (details.campo). */
export function preguntaDeCampo(campo: string): number | null {
  const clave = campo.replace(/^respuestas\./, '').split('.')[0];
  const mapa: Record<string, IdPregunta> = {
    objetivo: 'objetivo',
    experiencia: 'experiencia',
    dias_semana: 'dias',
    lugar: 'lugar',
    minutos_sesion: 'minutos',
    fecha_nacimiento: 'nacimiento',
    altura_cm: 'altura',
    peso_kg: 'peso',
    lesiones: 'lesiones',
    codigo_entrenador: 'codigo',
  };
  const id = mapa[clave];
  if (!id) return null;
  return PREGUNTAS.findIndex((p) => p.id === id);
}
