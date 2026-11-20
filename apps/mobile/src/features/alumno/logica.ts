// ─────────────────────────────────────────────────────────────────────────────
// Reglas de las pantallas del alumno · Zona: Alumno
//
// Qué hace: todo lo que las pantallas de Rutinas, Ejercicios, Progreso, Perfil y Motivos deciden
// sin dibujar nada: buscar y filtrar ejercicios, validar y armar una rutina para la API, qué
// acciones tiene una rutina según quién la armó, la semana en que va, la tendencia del peso, los
// límites del descanso, el código del entrenador y los consejos de cada motivo. Es puro: se
// prueba en Node (ver __tests__/logica.test.ts) y las pantallas solo lo llaman.
// Tócalo cuando: cambie una regla o un texto que sale de una regla («Faltan 2 cosas para guardar»).
// No lo toques para: cómo se ve algo (va en la pantalla) ni cómo se lee la API (./datos.ts).
// Las reglas de forma y de fondo que también revisa la API (largos, letras en el nombre, días
// repetidos, topes de repeticiones o segundos, rangos de las medidas) salen de @gymtrack/shared,
// así el error se ve junto al campo antes de enviar y dice lo mismo que la API.
// Depende de: ./datos (tipos) y @gymtrack/shared (fmtNum, MESES y las reglas de reglas.ts).
// ─────────────────────────────────────────────────────────────────────────────
import {
  DIAS_RUTINA_MAX, EJERCICIOS_POR_DIA_MAX, errorMedida, errorRepsSegun, erroresDiasRutina, fmtNum, INSTRUCCIONES_EJERCICIO_MAX,
  LARGO_INVITACION, MESES, NOMBRE_DIA_MAX, NOMBRE_EJERCICIO_MAX, RANGOS_MEDIDA, tieneLetra,
} from '@gymtrack/shared';
import type {
  DiaDeRutina,
  EjercicioDeRutina,
  Ejercicio,
  EsquemaSerie,
  Medida,
  MetodoProgresion,
  Rutina,
  TipoCarga,
} from './datos';

// ── Textos ───────────────────────────────────────────────────────────────────
/** Quita tildes y pasa a minúscula, para buscar «busqueda» y encontrar «búsqueda». */
export function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function conMayuscula(s: string): string {
  const t = s.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** «sueño», «sueño y estrés», «sueño, estrés y tiempo». */
export function listaNatural(xs: string[]): string {
  if (xs.length < 2) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
}

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Un decimal con coma, siempre con el decimal: 62,4 · 80,0. */
export function cifra1(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
}

/** +0,5 · −0,3 · ±0,0 (el menos es el signo tipográfico, no el guion). */
export function firmado(n: number): string {
  // Se redondea el tamaño y después se pone el signo: así −0,25 y +0,25 dan −0,3 y +0,3.
  const m = Math.round(Math.abs(n) * 10) / 10;
  return `${m === 0 ? '±' : n > 0 ? '+' : '−'}${cifra1(m)}`;
}

/** 90 → «1:30». */
export function reloj(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function iniciales(nombre: string, apellido = ''): string {
  const partes = `${nombre} ${apellido}`.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

// ── Fechas ───────────────────────────────────────────────────────────────────
const MES3 = MESES.map((m) => m.slice(0, 3));
const DIA3 = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
/** Las letras de los días como en las maquetas: L M X J V S D. */
export const LETRAS_DIA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Lee «2026-11-17» o una fecha ISO completa como fecha local, a mediodía (sin saltos de zona). */
export function aFecha(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(`${iso}T12:00:00`);
  return new Date(iso);
}

/** «17 nov». */
export function fechaCorta(iso: string): string {
  const d = aFecha(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MES3[d.getMonth()]}`;
}

/** «mar 17 nov». */
export function fechaConDia(iso: string): string {
  const d = aFecha(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${DIA3[d.getDay()]} ${d.getDate()} ${MES3[d.getMonth()]}`;
}

/** «2026-11-17» del día local. */
export function diaIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 1 lunes a 7 domingo. */
export function diaSemanaIso(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}

/** «Lunes» o «Sin día fijo». */
export function nombreDiaSemana(n: number | null): string {
  if (!n) return 'Sin día fijo';
  const d = DIAS_SEMANA[n - 1] ?? '';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

/** «17 de diciembre»: el día en que se purga una cuenta borrada hoy (30 días, §Modelo). */
export function fechaBorrado(hoy: Date): string {
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 30, 12);
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** «Martes 17 de noviembre». */
export function fechaLarga(d: Date): string {
  const dia = DIAS_SEMANA[(d.getDay() + 6) % 7] ?? '';
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

// ── Ejercicios: buscar y filtrar (PAN-09) ────────────────────────────────────
export const GRUPOS_FILTRO = ['Todos', 'Piernas', 'Pecho', 'Espalda', 'Hombros', 'Brazos', 'Core'] as const;
export const EQUIPOS_FILTRO = ['Barra', 'Mancuernas', 'Máquina', 'Polea', 'Peso corporal', 'Banda'] as const;

/** La biblioteca base dice «Mancuerna» y las maquetas «Mancuernas»: se comparan igual. */
function mismoEquipo(a: string, b: string): boolean {
  const n = (s: string) => sinTildes(s).replace(/s$/, '');
  return n(a) === n(b);
}

export interface FiltroEjercicios {
  q: string;
  grupo: string;
  equipos: string[];
}

export function filtrarEjercicios<T extends Pick<Ejercicio, 'nombre' | 'grupo' | 'equipo'>>(xs: T[], f: FiltroEjercicios): T[] {
  const q = sinTildes(f.q.trim());
  return xs.filter(
    (x) =>
      (f.grupo === 'Todos' || sinTildes(x.grupo) === sinTildes(f.grupo)) &&
      (!f.equipos.length || f.equipos.some((e) => mismoEquipo(e, x.equipo))) &&
      (!q || sinTildes(x.nombre).includes(q)),
  );
}

/** Hasta 3 de la biblioteca que comparten una palabra de 4 letras o más con la búsqueda. */
export function parecidos<T extends Pick<Ejercicio, 'nombre'>>(xs: T[], q: string): T[] {
  const palabras = sinTildes(q).split(/\s+/).filter((w) => w.length >= 4);
  if (!palabras.length) return [];
  return xs.filter((x) => palabras.some((w) => sinTildes(x.nombre).includes(w))).slice(0, 3);
}

/** «12 ejercicios» o «3 resultados · Piernas · Barra». */
export function textoConteo(n: number, f: FiltroEjercicios): string {
  const filtros = f.grupo !== 'Todos' || f.equipos.length > 0;
  if (!f.q.trim() && !filtros) return `${n} ejercicios`;
  const detalle = [f.grupo !== 'Todos' ? f.grupo : '', ...f.equipos].filter(Boolean).join(' · ');
  return `${n} ${n === 1 ? 'resultado' : 'resultados'}${detalle ? ` · ${detalle}` : ''}`;
}

// ── Ejercicios: crear uno propio ─────────────────────────────────────────────
export type ComoSeRegistra = 'kg' | 'reps' | 'tiempo';
export const OPCIONES_REGISTRO: { id: ComoSeRegistra; nombre: string }[] = [
  { id: 'kg', nombre: 'Kilos y reps' },
  { id: 'reps', nombre: 'Solo reps' },
  { id: 'tiempo', nombre: 'Tiempo' },
];

export function tipoCargaDe(m: ComoSeRegistra): TipoCarga {
  return m === 'kg' ? 'kg' : m === 'reps' ? 'peso_corporal' : 'tiempo';
}

export function registroDe(t: TipoCarga): ComoSeRegistra {
  return t === 'kg' ? 'kg' : t === 'peso_corporal' ? 'reps' : 'tiempo';
}

/** El patrón que pide la API, deducido del grupo (el alumno no lo elige). */
export function patronDeGrupo(grupo: string): string {
  const g = sinTildes(grupo);
  if (g === 'piernas') return 'rodilla';
  if (g === 'espalda') return 'tiron';
  if (g === 'core') return 'core';
  if (g === 'brazos') return 'aislamiento';
  return 'empuje';
}

export interface BorradorEjercicio {
  nombre: string;
  grupo: string;
  equipo: string;
  registro: ComoSeRegistra;
  nota: string;
}

/** Topes de largo del formulario de ejercicio (los mismos de la API): van como maxLength. */
export const LARGO_EJERCICIO = { nombre: NOMBRE_EJERCICIO_MAX, nota: INSTRUCCIONES_EJERCICIO_MAX } as const;

export function erroresEjercicio(b: BorradorEjercicio, existentes: Pick<Ejercicio, 'nombre' | 'id'>[], idPropio?: string) {
  const e: { nombre?: string; grupo?: string; equipo?: string; nota?: string } = {};
  const nombre = b.nombre.trim();
  if (!nombre) e.nombre = 'Ponle un nombre.';
  else if (nombre.length > NOMBRE_EJERCICIO_MAX) e.nombre = `El nombre va hasta ${NOMBRE_EJERCICIO_MAX} caracteres.`;
  else if (!tieneLetra(nombre)) e.nombre = 'El nombre necesita al menos una letra.';
  // La API revisa lo mismo con la base (409): aquí se avisa antes con lo que ya está cargado.
  else if (existentes.some((x) => x.id !== idPropio && sinTildes(x.nombre).replace(/\s+/g, ' ') === sinTildes(nombre).replace(/\s+/g, ' '))) {
    e.nombre = `«${nombre}» ya está en la biblioteca.`;
  }
  if (!b.grupo) e.grupo = 'Elige un grupo.';
  if (!b.equipo) e.equipo = 'Elige el equipo.';
  if (b.nota.trim().length > INSTRUCCIONES_EJERCICIO_MAX) e.nota = `Las instrucciones van hasta ${INSTRUCCIONES_EJERCICIO_MAX} caracteres.`;
  return e;
}

/** Cuerpo de POST /exercises y PATCH /exercises/:id. */
export function cuerpoEjercicio(b: BorradorEjercicio) {
  const tipo = tipoCargaDe(b.registro);
  return {
    nombre: b.nombre.trim(),
    grupo_muscular: b.grupo,
    equipo: b.equipo,
    patron: patronDeGrupo(b.grupo),
    tipo_carga: tipo,
    incremento_default_kg: tipo === 'kg' ? 2.5 : 0,
    ...(b.nota.trim() ? { instrucciones: b.nota.trim() } : {}),
  };
}

/** APP-025: solo el propio se edita y lleva «Subir referencia»; los de la biblioteca base no. */
export function puedeEditarEjercicio(e: Pick<Ejercicio, 'duenoId'>, yoId: string | null): boolean {
  return !!e.duenoId && e.duenoId === yoId;
}

// ── Rutinas: la lista y sus permisos (PAN-06, PAN-08) ────────────────────────
export function ordenarRutinas(rs: Rutina[]) {
  return {
    activa: rs.find((r) => r.estado === 'activa') ?? null,
    borradores: rs.filter((r) => r.estado === 'borrador'),
    archivadas: rs.filter((r) => r.estado === 'archivada'),
  };
}

export const esMia = (r: Pick<Rutina, 'duenoId'>, yoId: string | null) => !!yoId && r.duenoId === yoId;

/** La semana en que va la rutina activa: la de la API o la que da la fecha de activación. */
export function semanaActual(r: Pick<Rutina, 'semanaActual' | 'activadaAt' | 'semanas'>, hoy: Date): number {
  if (r.semanaActual) return Math.min(r.semanas, Math.max(1, r.semanaActual));
  if (!r.activadaAt) return 1;
  const desde = new Date(r.activadaAt);
  const dias = Math.floor((hoy.getTime() - desde.getTime()) / 86_400_000);
  return Math.min(r.semanas, Math.max(1, Math.floor(dias / 7) + 1));
}

export type AccionMenuRutina = 'ver' | 'activar' | 'editar' | 'duplicar' | 'archivar' | 'eliminar';

/**
 * APP-019: lo que el alumno puede hacer con una rutina. La que armó su entrenador se ve y se
 * duplica, pero no se edita, activa ni archiva. Un borrador propio se puede eliminar.
 */
export function accionesRutina(r: Pick<Rutina, 'duenoId' | 'estado'>, yoId: string | null): AccionMenuRutina[] {
  const mia = esMia(r, yoId);
  const a: AccionMenuRutina[] = ['ver'];
  if (mia && r.estado !== 'activa') a.push('activar');
  if (mia && r.estado !== 'archivada') a.push('editar');
  a.push('duplicar');
  if (mia && r.estado !== 'archivada') a.push(r.estado === 'borrador' ? 'eliminar' : 'archivar');
  return a;
}

/** El índice del día que toca hoy en la rutina, o -1 si hoy no toca. */
export function indiceDiaDeHoy(dias: Pick<DiaDeRutina, 'diaSemana'>[], hoy: Date): number {
  const n = diaSemanaIso(hoy);
  return dias.findIndex((d) => d.diaSemana === n);
}

export type AccionDetalle =
  | { tipo: 'empezar'; dia: number }
  | { tipo: 'cambiar'; dia: number; hoy: number }
  | { tipo: 'activar' }
  | { tipo: 'duplicar' }
  | { tipo: 'asignar' }
  | { tipo: 'ninguna' };

/**
 * APP-023: el botón de abajo del detalle. «Empezar» solo si el día elegido toca hoy en la rutina
 * activa; la archivada propia se activa de nuevo y la del entrenador se duplica; el borrador se
 * activa; el entrenador asigna.
 */
export function accionDetalle(
  r: Pick<Rutina, 'duenoId' | 'estado' | 'dias'>,
  diaElegido: number,
  yoId: string | null,
  rol: 'alumno' | 'entrenador' | null,
  hoy: Date,
): AccionDetalle {
  if (rol === 'entrenador') return esMia(r, yoId) && r.estado !== 'archivada' ? { tipo: 'asignar' } : { tipo: 'ninguna' };
  if (r.estado === 'activa') {
    if (!r.dias.length) return { tipo: 'ninguna' };
    const idxHoy = indiceDiaDeHoy(r.dias, hoy);
    return idxHoy === diaElegido ? { tipo: 'empezar', dia: diaElegido } : { tipo: 'cambiar', dia: diaElegido, hoy: idxHoy };
  }
  if (r.estado === 'archivada') return esMia(r, yoId) ? { tipo: 'activar' } : { tipo: 'duplicar' };
  return esMia(r, yoId) ? { tipo: 'activar' } : { tipo: 'duplicar' };
}

export function seriesDelDia(d: Pick<DiaDeRutina, 'ejercicios'>): number {
  return d.ejercicios.reduce((a, e) => a + e.series, 0);
}

/** Minutos aproximados del día: cada serie son unos 40 s de trabajo más su descanso. */
export function minutosDelDia(d: Pick<DiaDeRutina, 'ejercicios'>): number {
  const s = d.ejercicios.reduce((a, e) => a + e.series * (40 + e.descansoS), 0);
  return Math.max(5, Math.round(s / 60 / 5) * 5);
}

// ── Rutinas: métodos y esquemas (PAN-07) ─────────────────────────────────────
export const METODOS_RUTINA: { id: MetodoProgresion; nombre: string; recomendado?: boolean; detalle: string; explica: string }[] = [
  {
    id: 'doble_progresion',
    nombre: 'Doble progresión',
    recomendado: true,
    detalle: 'Trabajas en un rango, por ejemplo 6 a 8. Cuando todas las series llegan a 8, la app sube los kilos.',
    explica:
      'Cuando todas las series llegan al tope del rango con el RIR pedido, la próxima vez sube los kilos y vuelves al mínimo del rango.',
  },
  {
    id: 'lineal',
    nombre: 'Lineal',
    detalle: 'Sube los kilos cada sesión mientras completes todas las series. Si fallas dos veces seguidas, baja un 10 % y vuelve a subir.',
    explica: 'Sube los kilos cada sesión mientras completes todas las series. Si fallas dos veces seguidas, baja un 10 % y vuelve a subir.',
  },
  {
    id: 'porcentual',
    nombre: 'Porcentual',
    detalle: 'Los kilos son un porcentaje de tu máximo estimado, fijado por semana. Por ejemplo 70, 75, 80 y 65 %.',
    explica: 'Los kilos son un porcentaje de tu máximo estimado, fijado por semana. Por ejemplo 70, 75, 80 y 65 %.',
  },
  {
    id: 'por_rm',
    nombre: 'Por RM',
    detalle: 'Apuntas a un máximo para cierto número de repeticiones, por ejemplo 5RM: el peso que mueves 5 veces y no 6.',
    explica: 'Apuntas a un máximo para cierto número de repeticiones, por ejemplo 5RM: el peso que mueves 5 veces y no 6.',
  },
];

export function metodoDe(id: MetodoProgresion) {
  return METODOS_RUTINA.find((m) => m.id === id) ?? { id, nombre: id === 'cluster' ? 'Cluster' : 'Series descendentes', detalle: '', explica: '' };
}

export const ESQUEMAS: { id: EsquemaSerie; nombre: string; detalle: string }[] = [
  { id: 'normal', nombre: 'Normal', detalle: 'Todas las series con los mismos kilos.' },
  { id: 'descendente', nombre: 'Descendentes', detalle: 'La primera serie sigue el método; cada una de las siguientes baja un 20 %.' },
  { id: 'cluster', nombre: 'Cluster', detalle: 'Bloques de 2 a 3 repeticiones con 15 a 20 s entre bloques.' },
];

/** Los incrementos que se pueden elegir con el más y menos. */
export const INCREMENTOS = [0, 0.5, 1, 1.25, 2, 2.5, 5, 10];

export function siguienteIncremento(actual: number, dir: 1 | -1): number {
  let i = INCREMENTOS.indexOf(actual);
  if (i < 0) i = INCREMENTOS.findIndex((v) => v > actual) - (dir > 0 ? 1 : 0);
  const j = Math.max(0, Math.min(INCREMENTOS.length - 1, i + dir));
  return INCREMENTOS[j] ?? actual;
}

/** De a cuánto sube la carga inicial: 1 kg con mancuernas, 2,5 con lo demás. */
export function pasoCarga(equipo: string): number {
  return sinTildes(equipo).startsWith('mancuerna') ? 1 : 2.5;
}

// ── Rutinas: el borrador que se arma (PAN-07) ────────────────────────────────
export interface BorradorRutina {
  nombre: string;
  metodo: MetodoProgresion;
  semanas: number;
  dias: DiaDeRutina[];
}

/** APP-021: una rutina nueva parte vacía, en doble progresión y 8 semanas. */
export function rutinaVacia(): BorradorRutina {
  return { nombre: '', metodo: 'doble_progresion', semanas: 8, dias: [] };
}

export function borradorDe(r: Rutina): BorradorRutina {
  return { nombre: r.nombre, metodo: r.metodo, semanas: r.semanas, dias: r.dias.map((d) => ({ ...d, ejercicios: d.ejercicios.map((e) => ({ ...e })) })) };
}

/** Un día nuevo: «Día 1», «Día 2»... sin día fijo. */
export function diaNuevo(n: number): DiaDeRutina {
  return { id: null, nombre: `Día ${n}`, diaSemana: null, ejercicios: [], hechoSemana: false, ultimaVez: null };
}

/** El ejercicio con los valores de partida al agregarlo desde la biblioteca. */
export function ejercicioNuevo(e: Pick<Ejercicio, 'id' | 'nombre' | 'grupo' | 'equipo' | 'tipoCarga' | 'incrementoKg'>): EjercicioDeRutina {
  const corporal = e.tipoCarga !== 'kg';
  // En los de tiempo la «repetición» son segundos: parte en 30 a 45 s, como una plancha.
  const tiempo = e.tipoCarga === 'tiempo';
  return {
    id: null,
    ejercicioId: e.id,
    nombre: e.nombre,
    grupo: e.grupo,
    equipo: e.equipo,
    tipoCarga: e.tipoCarga,
    series: 3,
    repsMin: tiempo ? 30 : 8,
    repsMax: tiempo ? 45 : 12,
    rir: 2,
    descansoS: 90,
    incrementoKg: corporal ? 0 : e.incrementoKg || 2.5,
    pesoInicialKg: corporal ? null : 20,
    pesoSugeridoKg: null,
    esquema: 'normal',
    nota: '',
  };
}

/** Mueve el elemento i una posición arriba (-1) o abajo (+1). No cambia la lista original. */
export function mover<T>(xs: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (i < 0 || j < 0 || i >= xs.length || j >= xs.length) return xs;
  const copia = [...xs];
  [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
  return copia;
}

export interface ErrorRutina {
  campo: 'nombre' | 'dias' | 'dia' | 'ejercicio';
  dia?: number;
  ejercicio?: number;
  texto: string;
}

/** Topes del editor de rutinas (los mismos de la API): van como maxLength. */
export const LARGO_RUTINA = { nombre: 80, dia: NOMBRE_DIA_MAX, nota: 500 } as const;

/**
 * APP-021: lo que falta o está mal para guardar, en el orden en que se lee la pantalla. Revisa lo
 * mismo que la API: nombre de 1 a 80, de 1 a 14 días, nombre del día de 1 a 40 y sin repetir,
 * un día de la semana por día, hasta 30 ejercicios por día, el mínimo de repeticiones no pasa al
 * máximo, el tope de repeticiones (60) o de segundos (600) y la nota de hasta 500.
 */
export function erroresRutina(b: BorradorRutina): ErrorRutina[] {
  const l: ErrorRutina[] = [];
  const nombre = b.nombre.trim();
  if (!nombre) l.push({ campo: 'nombre', texto: 'Ponle nombre a la rutina.' });
  else if (nombre.length > LARGO_RUTINA.nombre) l.push({ campo: 'nombre', texto: `El nombre va hasta ${LARGO_RUTINA.nombre} caracteres.` });
  if (!b.dias.length) l.push({ campo: 'dias', texto: 'Agrega al menos un día.' });
  if (b.dias.length > DIAS_RUTINA_MAX) l.push({ campo: 'dias', texto: `La rutina va hasta ${DIAS_RUTINA_MAX} días.` });
  const repetidos = erroresDiasRutina(b.dias.map((d, i) => ({ nombre: d.nombre.trim() || `Día ${i + 1}`, dia_semana: d.diaSemana })));
  b.dias.forEach((d, i) => {
    const nombreDia = d.nombre.trim();
    if (!nombreDia) l.push({ campo: 'dia', dia: i, texto: `El día ${i + 1} no tiene nombre.` });
    else if (nombreDia.length > NOMBRE_DIA_MAX) l.push({ campo: 'dia', dia: i, texto: `${nombreDia}: el nombre del día va hasta ${NOMBRE_DIA_MAX} caracteres.` });
    for (const r of repetidos.filter((x) => x.dia === i)) l.push({ campo: 'dia', dia: i, texto: `${nombreDia || `Día ${i + 1}`}: ${r.mensaje}` });
    if (!d.ejercicios.length) l.push({ campo: 'dia', dia: i, texto: `${d.nombre} no tiene ejercicios.` });
    if (d.ejercicios.length > EJERCICIOS_POR_DIA_MAX) l.push({ campo: 'dia', dia: i, texto: `${d.nombre}: un día va hasta ${EJERCICIOS_POR_DIA_MAX} ejercicios.` });
    d.ejercicios.forEach((e, k) => {
      if (e.repsMin > e.repsMax) {
        l.push({ campo: 'ejercicio', dia: i, ejercicio: k, texto: `${e.nombre} en ${d.nombre}: el mínimo de repeticiones pasa al máximo.` });
      }
      const tope = errorRepsSegun(e.tipoCarga, e.repsMax);
      if (tope) l.push({ campo: 'ejercicio', dia: i, ejercicio: k, texto: `${e.nombre} en ${d.nombre}: ${tope.charAt(0).toLowerCase()}${tope.slice(1)}` });
      if (e.nota.trim().length > LARGO_RUTINA.nota) {
        l.push({ campo: 'ejercicio', dia: i, ejercicio: k, texto: `${e.nombre} en ${d.nombre}: la nota va hasta ${LARGO_RUTINA.nota} caracteres.` });
      }
    });
  });
  return l;
}

export function tituloErrores(n: number): string {
  return n === 1 ? 'Falta 1 cosa para guardar' : `Faltan ${n} cosas para guardar`;
}

/**
 * Los días con sus ejercicios tal como los piden los esquemas estrictos de la API
 * (esquemaRutinaNueva y esquemaDiasRutina en packages/shared/src/api/rutinas.ts): el orden es el
 * de la lista. Con `conIds` (PUT /routines/:id/days) cada día y ejercicio que ya existía lleva su
 * id, así la API lo conserva con su historial; un id repetido (día duplicado) va sin id, como nuevo.
 */
export function cuerpoDias(dias: DiaDeRutina[], conNota: boolean, conIds = false) {
  const vistos = new Set<string>();
  const conId = (id: string | null) => {
    if (!conIds || !id || vistos.has(id)) return {};
    vistos.add(id);
    return { id };
  };
  return dias.map((d, i) => ({
    ...conId(d.id),
    nombre: d.nombre.trim() || `Día ${i + 1}`,
    ...(d.diaSemana ? { dia_semana: d.diaSemana } : {}),
    ejercicios: d.ejercicios.map((e) => ({
      ...conId(e.id),
      exercise_id: e.ejercicioId,
      series: e.series,
      reps_min: e.repsMin,
      reps_max: e.repsMax,
      rir_objetivo: e.rir,
      descanso_s: e.descansoS,
      incremento_kg: e.incrementoKg,
      ...(e.pesoInicialKg !== null && e.tipoCarga === 'kg' ? { peso_inicial_kg: e.pesoInicialKg } : {}),
      esquema: e.esquema,
      ...(conNota && e.nota.trim() ? { nota_entrenador: e.nota.trim() } : {}),
    })),
  }));
}

/** POST /routines. Con `clienteId` (solo el entrenador) la rutina queda escrita para ese cliente. */
export function cuerpoRutina(b: BorradorRutina, conNota: boolean, clienteId?: string | null) {
  return {
    nombre: b.nombre.trim(),
    metodo_progresion: b.metodo,
    semanas: b.semanas,
    ...(clienteId ? { client_id: clienteId } : {}),
    dias: cuerpoDias(b.dias, conNota),
  };
}

/**
 * APP-022: ubica los `details` de un 422 en el borrador. La API puede mandar la ruta del campo
 * (`dias.1.ejercicios.0.reps_min`, `dias[1].ejercicios[0]`) o los índices sueltos.
 */
export function erroresDeApi(detalles: unknown, b: BorradorRutina, mensaje: string): ErrorRutina[] {
  const l: ErrorRutina[] = [];
  const agregar = (ruta: string, texto: string) => {
    const m = /dias\D+(\d+)(?:\D+ejercicios\D+(\d+))?/.exec(ruta);
    if (m) {
      const dia = Number(m[1]);
      const ej = m[2] !== undefined ? Number(m[2]) : undefined;
      const d = b.dias[dia];
      const nombreEj = ej !== undefined ? d?.ejercicios[ej]?.nombre : undefined;
      l.push({
        campo: ej !== undefined ? 'ejercicio' : 'dia',
        dia,
        ejercicio: ej,
        texto: [nombreEj, d?.nombre].filter(Boolean).length ? `${[nombreEj, d?.nombre].filter(Boolean).join(' en ')}: ${texto}` : texto,
      });
    } else if (/nombre/.test(ruta)) l.push({ campo: 'nombre', texto });
    else l.push({ campo: 'dias', texto });
  };
  const lista = Array.isArray(detalles)
    ? detalles
    : detalles && typeof detalles === 'object'
      ? (((detalles as { campos?: unknown; errores?: unknown }).campos ?? (detalles as { errores?: unknown }).errores ?? [detalles]) as unknown[])
      : [];
  for (const d of Array.isArray(lista) ? lista : []) {
    if (!d || typeof d !== 'object') continue;
    const o = d as { [k: string]: unknown };
    const ruta = Array.isArray(o.path) ? o.path.join('.') : String(o.campo ?? o.field ?? o.ruta ?? o.path ?? '');
    const texto = String(o.motivo ?? o.message ?? o.mensaje ?? mensaje);
    // La API manda { campo: 'dias.0.ejercicios.1.reps_min', dia: 0, posicion: 1, exercise_id } (desde 0).
    const ejercicio = o.ejercicio ?? o.posicion;
    if (o.dia !== undefined) agregar(`dias.${String(o.dia)}${ejercicio !== undefined ? `.ejercicios.${String(ejercicio)}` : ''}`, texto);
    else agregar(ruta, texto);
  }
  return l.length ? l : [{ campo: 'dias', texto: mensaje }];
}

// ── Progreso: peso y medidas (PAN-14) ────────────────────────────────────────
/** La tendencia se calcula desde el tercer registro (§Alcance, APP-033, APP-051). */
export const MINIMO_TENDENCIA = 3;

export function hayTendencia(n: number): boolean {
  return n >= MINIMO_TENDENCIA;
}

/** El texto de la tarjeta cuando todavía no hay tendencia de peso (APP-033). */
export function textoSinTendenciaPeso(n: number): string {
  return n <= 1 ? 'Tu primer peso viene de la encuesta.' : 'Vas bien: falta uno.';
}

type Pesada = { fecha: string; pesoKg: number };

export function pesosDe(ms: Medida[]): Pesada[] {
  return ms.filter((m) => m.pesoKg !== null).map((m) => ({ fecha: m.fecha, pesoKg: m.pesoKg as number }));
}

/** Cuánto cambió el peso frente al registro más cercano a 30 días atrás. */
export function cambio30Dias(ps: Pesada[], hoy: Date): number | null {
  if (ps.length < 2) return null;
  const ult = ps[ps.length - 1] as Pesada;
  const meta = hoy.getTime() - 30 * 86_400_000;
  const base = ps.reduce((a, p) => (Math.abs(aFecha(p.fecha).getTime() - meta) < Math.abs(aFecha(a.fecha).getTime() - meta) ? p : a));
  return ult.pesoKg - base.pesoKg;
}

/** Kilos por semana, con mínimos cuadrados sobre los últimos 8 registros. Nulo con menos de 3. */
export function tendenciaSemanal(ps: Pesada[]): number | null {
  if (!hayTendencia(ps.length)) return null;
  const ult = ps.slice(-8);
  const t0 = aFecha((ult[0] as Pesada).fecha).getTime();
  const xs = ult.map((p) => (aFecha(p.fecha).getTime() - t0) / 86_400_000);
  const ys = ult.map((p) => p.pesoKg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((a, x, i) => a + (x - mx) * ((ys[i] as number) - my), 0);
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  return den === 0 ? 0 : (num / den) * 7;
}

export const PARTES_MEDIDA = [
  { id: 'cinturaCm', api: 'cintura_cm', nombre: 'Cintura' },
  { id: 'caderaCm', api: 'cadera_cm', nombre: 'Cadera' },
  { id: 'pechoCm', api: 'pecho_cm', nombre: 'Pecho' },
  { id: 'brazoCm', api: 'brazo_cm', nombre: 'Brazo' },
  { id: 'musloCm', api: 'muslo_cm', nombre: 'Muslo' },
] as const;

export type ParteMedida = (typeof PARTES_MEDIDA)[number]['id'];

/**
 * Cuerpo de POST /me/body-metrics para medidas. Lo que no se midió no va (nunca 0, APP-051): la API
 * acepta null como «no lo medí», pero sin el campo se lee más claro.
 */
export function cuerpoMedidas(fecha: string, valores: Partial<{ [k in ParteMedida | 'grasaPct']: number | null }>) {
  const v = (x: number | null | undefined) => (typeof x === 'number' && x > 0 ? Math.round(x * 10) / 10 : null);
  const campos = {
    cintura_cm: v(valores.cinturaCm),
    cadera_cm: v(valores.caderaCm),
    pecho_cm: v(valores.pechoCm),
    brazo_cm: v(valores.brazoCm),
    muslo_cm: v(valores.musloCm),
    grasa_pct: v(valores.grasaPct),
  };
  return { fecha, ...Object.fromEntries(Object.entries(campos).filter(([, x]) => x !== null)) } as { fecha: string } & Partial<Record<keyof typeof campos, number>>;
}

/** Rango de cada medida para su más y menos (el mismo de la API, RANGOS_MEDIDA). */
export const RANGO_PARTE: { [k in ParteMedida]: { min: number; max: number } } = {
  cinturaCm: RANGOS_MEDIDA.cintura_cm,
  caderaCm: RANGOS_MEDIDA.cadera_cm,
  pechoCm: RANGOS_MEDIDA.pecho_cm,
  brazoCm: RANGOS_MEDIDA.brazo_cm,
  musloCm: RANGOS_MEDIDA.muslo_cm,
};

/** Los errores de las medidas antes de guardar (por si un valor quedó fuera de su rango). */
export function erroresMedidas(valores: Partial<{ [k in ParteMedida]: number | null }>): Partial<Record<ParteMedida, string>> {
  const e: Partial<Record<ParteMedida, string>> = {};
  for (const p of PARTES_MEDIDA) {
    const x = valores[p.id];
    const m = typeof x === 'number' ? errorMedida(p.api, x) : null;
    if (m) e[p.id] = m;
  }
  return e;
}

/** Las medidas que tienen al menos un perímetro. */
export function conPerimetros(ms: Medida[]): Medida[] {
  return ms.filter((m) => PARTES_MEDIDA.some((p) => m[p.id] !== null));
}

// ── Perfil (PAN-15) ──────────────────────────────────────────────────────────
/**
 * Lo que el alumno escribe en las casillas del código: mayúsculas, letras sin tilde ni ñ y
 * números, 6 como mucho (la misma forma que esquemaCodigoInvitacion de la API).
 */
export function limpiarCodigo(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LARGO_INVITACION);
}

export const DESCANSO_MIN = 30;
export const DESCANSO_MAX = 300;

/** APP-038: el descanso va de 30 s a 5 min, de 15 en 15; fuera de eso, el aviso. */
export function pasoDescanso(actual: number, delta: number): { valor: number; aviso: string | null } {
  const v = actual + delta;
  if (v < DESCANSO_MIN) return { valor: actual <= DESCANSO_MIN ? actual : DESCANSO_MIN, aviso: actual <= DESCANSO_MIN ? 'El mínimo es 30 segundos.' : null };
  if (v > DESCANSO_MAX) return { valor: actual >= DESCANSO_MAX ? actual : DESCANSO_MAX, aviso: actual >= DESCANSO_MAX ? 'El máximo es 5 minutos.' : null };
  return { valor: v, aviso: null };
}

/** El código del entrenador: vigente o vencido según la fecha. */
export function codigoVencido(venceAt: string | null, ahora: Date): boolean {
  return !!venceAt && new Date(venceAt).getTime() <= ahora.getTime();
}

// ── Motivos de la baja (PAN-20) ──────────────────────────────────────────────
export type Motivo = 'sueno' | 'estres' | 'alimentacion' | 'lesion' | 'tiempo' | 'otro';

export const MOTIVOS: { id: Motivo; nombre: string; ejemplo: string }[] = [
  { id: 'sueno', nombre: 'Sueño', ejemplo: 'Dormí poco o mal' },
  { id: 'estres', nombre: 'Estrés', ejemplo: 'Semana cargada o preocupaciones' },
  { id: 'alimentacion', nombre: 'Alimentación', ejemplo: 'Comí poco o a deshora' },
  { id: 'lesion', nombre: 'Lesión o dolor', ejemplo: 'Algo me molesta' },
  { id: 'tiempo', nombre: 'Tiempo', ejemplo: 'Entrené con poco tiempo' },
  { id: 'otro', nombre: 'Otro', ejemplo: 'Cuéntalo abajo' },
];

/** Los consejos sembrados (tabla tips): sirven sin señal y si la API no manda los suyos. */
export const CONSEJOS_BASE: { [m in Exclude<Motivo, 'otro'>]: string[] } = {
  sueno: [
    'Apunta a dormir entre 7 y 9 horas. Acostarte a la misma hora ayuda más que dormir hasta tarde el fin de semana.',
    'Si dormiste menos de 6 horas, entrena igual pero repite los kilos de la vez pasada. No es día de récords.',
    'Deja el celular media hora antes de dormir.',
  ],
  estres: [
    'Entrenar igual ayuda. Si cuesta, haz los ejercicios principales y deja los accesorios para otro día.',
    'Alarga 30 segundos el descanso entre series.',
    'Una caminata de 10 minutos antes de entrenar ayuda a bajar las revoluciones.',
  ],
  alimentacion: [
    'Come algo con carbohidratos y proteína entre 1 y 3 horas antes de entrenar.',
    'Reparte la proteína en 3 o 4 comidas al día.',
    'Toma agua durante el día, no solo en el gimnasio.',
  ],
  lesion: [
    'No entrenes con dolor. Si una molestia pasa de 3 en una escala de 10, para ese ejercicio.',
    'Anótala como dolor en el ejercicio, en el registro, para seguirla semana a semana.',
    'Si dura más de una semana o empeora, consulta a un profesional de la salud.',
  ],
  tiempo: [
    'Con poco tiempo, haz primero los ejercicios principales: son los que más cuentan.',
    'Acorta el descanso de los accesorios, no el de los ejercicios principales.',
    'Es mejor mover la sesión a otro día que saltártela.',
  ],
};

/**
 * APP-044: hasta 3 consejos por cada motivo elegido. Usa los de la API si llegaron; si no (sin
 * señal o respuesta vacía), los sembrados. «Otro» no trae consejos: muestra el comentario.
 */
export function consejosPara(
  elegidos: Motivo[],
  deApi: { [motivo: string]: string[] } | null,
  conEntrenador: string | null,
): { motivo: Motivo; consejos: string[] }[] {
  return elegidos.map((m) => {
    if (m === 'otro') return { motivo: m, consejos: [] };
    const api = deApi?.[m]?.filter(Boolean) ?? [];
    let lista = (api.length ? api : CONSEJOS_BASE[m]).slice(0, 3);
    if (m === 'lesion' && conEntrenador && !api.length) {
      lista = lista.map((t, i) => (i === 1 ? `Anótala como dolor en el ejercicio, en el registro. ${conEntrenador} la ve en tu ficha.` : t));
    }
    return { motivo: m, consejos: lista };
  });
}

export function nombreMotivo(m: Motivo): string {
  return MOTIVOS.find((x) => x.id === m)?.nombre ?? m;
}

/** «Enviar», «Enviar (2)» o «Enviando…». */
/** POST /me/drop-reports: el comentario va hasta 500 caracteres. */
export const COMENTARIO_MOTIVOS_MAX = 500;

/**
 * El error del comentario de Motivos, o null: «otro» pide contar cuál es (la misma regla de la API,
 * esquemaReporteBajaEntrada) y el comentario va hasta 500 caracteres.
 */
export function errorComentarioMotivos(elegidos: readonly string[], comentario: string): string | null {
  const c = comentario.trim();
  if (elegidos.includes('otro') && !c) return 'Cuéntanos cuál es el otro motivo.';
  if (c.length > COMENTARIO_MOTIVOS_MAX) return `El comentario puede tener hasta ${COMENTARIO_MOTIVOS_MAX} caracteres.`;
  return null;
}

export function textoEnviar(n: number, enviando: boolean): string {
  if (enviando) return 'Enviando…';
  return n ? `Enviar (${n})` : 'Enviar';
}

/** Qué pasó, armado desde el detalle de la alerta (los campos que mande la API). */
export function resumenAlerta(a: {
  tipo: string;
  ejercicioNombre: string | null;
  detalle: { [k: string]: unknown };
  creadaAt: string | null;
}): { ceja: string; titulo: string; texto: string; promedioKg: number | null; ultimaKg: number | null } {
  const d = a.detalle;
  const n = (k: string) => (typeof d[k] === 'number' ? (d[k] as number) : null);
  const s = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : '');
  const fecha = s('fecha') || s('sesion_fecha') || a.creadaAt || '';
  const cuando = fecha ? fechaLarga(aFecha(fecha.slice(0, 10))) : '';
  if (a.tipo === 'estancamiento') {
    const ej = a.ejercicioNombre ?? 'Este ejercicio';
    const peso = n('peso_kg');
    const sesiones = n('sesiones') ?? 3;
    return {
      ceja: ej,
      titulo: `Tu ${ej.charAt(0).toLowerCase() + ej.slice(1)} no sube`,
      texto: `Llevas ${sesiones} sesiones${peso !== null ? ` con ${fmtNum(peso)} kg` : ''} sin superar tu mejor serie.`,
      promedioKg: null,
      ultimaKg: null,
    };
  }
  const prom = n('promedio_kg') ?? n('promedio_volumen_kg');
  const ult = n('volumen_kg') ?? n('ultima_kg');
  const caida = n('caida_pct') ?? (prom && ult !== null ? Math.round((1 - ult / prom) * 100) : null);
  const dia = s('dia_nombre') || s('dia');
  const diaSemana = cuando ? cuando.split(' ')[0]?.toLowerCase() : '';
  return {
    ceja: [cuando, dia].filter(Boolean).join(' · '),
    titulo: diaSemana ? `El ${diaSemana} rendiste menos` : 'Rendiste menos',
    texto:
      ult !== null && caida !== null
        ? `Levantaste ${fmtNum(ult / 1000)} t, un ${caida} % menos que tu promedio de las 4 semanas anteriores.`
        : 'Tu última sesión quedó bajo tu promedio de las 4 semanas anteriores.',
    promedioKg: prom,
    ultimaKg: ult,
  };
}

// ── Enlaces ──────────────────────────────────────────────────────────────────
/**
 * Si la app corre en https (la web) y la API devolvió el enlace con http (un proxy mal
 * configurado), se pide por https: el navegador bloquea pedir http desde una página https.
 */
export function aHttpsSiHaceFalta(url: string, protocoloPagina: string | undefined = globalThis.location?.protocol): string {
  return protocoloPagina === 'https:' && url.startsWith('http://') ? `https://${url.slice('http://'.length)}` : url;
}
