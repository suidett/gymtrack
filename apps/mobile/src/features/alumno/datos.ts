// ─────────────────────────────────────────────────────────────────────────────
// Datos del alumno · Zona: Alumno (rutinas, ejercicios, progreso, perfil y motivos)
//
// Qué hace: los tipos con que trabajan las pantallas del alumno y las funciones que convierten lo
// que responde la API (snake_case de §API) en esos tipos. Las funciones son tolerantes: aceptan
// una lista suelta o `{ items, next_cursor }`, nombres alternativos de campo y campos que faltan,
// porque el contrato de packages/shared/src/api todavía se está llenando en paralelo. Si la API
// cambia un nombre, el arreglo va aquí y las pantallas no se enteran.
// Tócalo cuando: la API agregue o renombre un campo que una pantalla del alumno necesita.
// No lo toques para: la lógica de una pantalla (va en ./logica.ts) ni las llamadas (./api.ts).
// Depende de: nada de React Native (se prueba en Node con vitest).
// ─────────────────────────────────────────────────────────────────────────────

// ── Tipos ────────────────────────────────────────────────────────────────────
export type EstadoRutina = 'borrador' | 'activa' | 'archivada';
export type MetodoProgresion = 'doble_progresion' | 'lineal' | 'porcentual' | 'por_rm' | 'descendentes' | 'cluster';
export type EsquemaSerie = 'normal' | 'descendente' | 'cluster';
export type TipoCarga = 'kg' | 'peso_corporal' | 'tiempo';

export interface EjercicioDeRutina {
  /** Id del ejercicio dentro de la rutina (routine_exercise). Nulo si es nuevo y no se ha guardado. */
  id: string | null;
  ejercicioId: string;
  nombre: string;
  grupo: string;
  equipo: string;
  tipoCarga: TipoCarga;
  series: number;
  repsMin: number;
  repsMax: number;
  rir: number;
  descansoS: number;
  incrementoKg: number;
  pesoInicialKg: number | null;
  /** La carga que toca la próxima vez, si la API la manda (sugerencia vigente). */
  pesoSugeridoKg: number | null;
  esquema: EsquemaSerie;
  nota: string;
}

export interface DiaDeRutina {
  id: string | null;
  nombre: string;
  /** 1 lunes a 7 domingo (ISO); nulo sin día fijo. */
  diaSemana: number | null;
  ejercicios: EjercicioDeRutina[];
  hechoSemana: boolean;
  ultimaVez: string | null;
}

export interface Rutina {
  id: string;
  duenoId: string;
  alumnoId: string | null;
  /** La rutina de la biblioteca de la que salió esta copia (asignada o duplicada). */
  origenId: string | null;
  nombre: string;
  descripcion: string;
  semanas: number;
  metodo: MetodoProgresion;
  estado: EstadoRutina;
  activadaAt: string | null;
  creadaAt: string | null;
  dias: DiaDeRutina[];
  /** Cuántos días tiene; viene aunque la lista no traiga los días completos. */
  numDias: number;
  semanaActual: number | null;
  sesiones: number | null;
  primeraSesion: string | null;
  ultimaSesion: string | null;
  adherenciaPct: number | null;
  volumenKg: number | null;
  duenoNombre: string | null;
  /** Para el entrenador: a cuántos clientes está asignada y quiénes. */
  asignados: { id: string; nombre: string }[];
}

export interface Ejercicio {
  id: string;
  duenoId: string | null;
  /** El id de la biblioteca (`press-de-banca`), que también nombra su animación 3D; null en los propios. */
  slug: string | null;
  nombre: string;
  grupo: string;
  equipo: string;
  patron: string;
  tipoCarga: TipoCarga;
  incrementoKg: number;
  instrucciones: string[];
  musculos: { principales: string[]; ayudan: string[] } | null;
  media: { id: string; tipo: 'video' | 'foto'; url: string | null }[];
  /** Récord del alumno, ya escrito («47,5 kg», «20 reps», «1:10»). */
  record: string | null;
  creadoAt: string | null;
}

export interface PuntoHistorial {
  sesionId: string | null;
  fecha: string;
  e1rm: number | null;
  pesoKg: number;
  reps: number;
  series: { pesoKg: number; reps: number }[];
  dia: string | null;
  rutina: string | null;
}

export interface Observacion {
  id: string;
  tipo: 'observacion' | 'dolor' | 'consejo';
  autorId: string | null;
  autorNombre: string | null;
  texto: string;
  zona: string | null;
  intensidad: number | null;
  fecha: string;
}

export interface SemanaVolumen {
  /** Lunes de la semana, AAAA-MM-DD. */
  desde: string;
  volumenKg: number;
  sesiones: number;
  enCurso: boolean;
}

export interface RecordPersonal {
  ejercicioId: string | null;
  nombre: string;
  tipo: string;
  valor: number;
  pesoKg: number | null;
  reps: number | null;
  fecha: string;
  diferencia: number | null;
}

export interface Medida {
  id: string | null;
  /** AAAA-MM-DD. */
  fecha: string;
  pesoKg: number | null;
  cinturaCm: number | null;
  caderaCm: number | null;
  pechoCm: number | null;
  brazoCm: number | null;
  musloCm: number | null;
  grasaPct: number | null;
}

export type TomaFoto = 'frente' | 'lado' | 'espalda';
export interface Foto {
  id: string;
  fecha: string;
  tipo: TomaFoto;
  url: string | null;
}

export interface Alerta {
  id: string;
  tipo: 'estancamiento' | 'baja_rendimiento' | 'sin_sesiones' | 'dolor' | string;
  estado: string;
  ejercicioNombre: string | null;
  detalle: { [k: string]: unknown };
  creadaAt: string | null;
}

export interface Invitacion {
  codigo: string;
  venceAt: string | null;
}

// ── Lectores sueltos ─────────────────────────────────────────────────────────
type Crudo = { [k: string]: unknown };

const esObjeto = (x: unknown): x is Crudo => typeof x === 'object' && x !== null && !Array.isArray(x);

/** El primer campo que exista de la lista. */
function campo(o: Crudo, ...nombres: string[]): unknown {
  for (const n of nombres) if (o[n] !== undefined && o[n] !== null) return o[n];
  return undefined;
}

export function texto(x: unknown, porDefecto = ''): string {
  return typeof x === 'string' ? x : typeof x === 'number' ? String(x) : porDefecto;
}

export function numero(x: unknown): number | null {
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  if (typeof x === 'string' && x.trim() !== '' && Number.isFinite(Number(x))) return Number(x);
  return null;
}

/** Una lista de la API: arreglo suelto, `{ items }`, `{ data }` o `{ <clave> }`. */
export function lista(x: unknown, ...claves: string[]): unknown[] {
  if (Array.isArray(x)) return x;
  if (esObjeto(x)) {
    for (const k of ['items', 'data', ...claves]) if (Array.isArray(x[k])) return x[k] as unknown[];
  }
  return [];
}

/** Lo que va después en una lista paginada (null en la última página). */
export function siguienteCursor(x: unknown): string | null {
  return esObjeto(x) && typeof x.next_cursor === 'string' && x.next_cursor ? x.next_cursor : null;
}

/** Saca el objeto de una respuesta que lo envuelve (`{ routine: {...} }`) o lo devuelve tal cual. */
export function desenvolver(x: unknown, ...claves: string[]): Crudo {
  if (!esObjeto(x)) return {};
  for (const k of claves) if (esObjeto(x[k])) return x[k] as Crudo;
  return x;
}

const nombreCompleto = (o: unknown): string | null => {
  if (!esObjeto(o)) return null;
  const n = [texto(o.nombre), texto(o.apellido)].filter(Boolean).join(' ');
  return n || null;
};

// ── Rutinas ──────────────────────────────────────────────────────────────────
/** Ordena por el campo `orden` (los que no lo traen quedan donde venían). */
function porOrden(xs: unknown[]): unknown[] {
  const ord = (v: unknown) => (esObjeto(v) ? numero(v.orden) : null) ?? 0;
  return xs.map((v, i) => ({ v, i })).sort((a, b) => ord(a.v) - ord(b.v) || a.i - b.i).map((p) => p.v);
}

const METODOS: MetodoProgresion[] = ['doble_progresion', 'lineal', 'porcentual', 'por_rm', 'descendentes', 'cluster'];
const ESTADOS: EstadoRutina[] = ['borrador', 'activa', 'archivada'];
const ESQUEMAS: EsquemaSerie[] = ['normal', 'descendente', 'cluster'];
const CARGAS: TipoCarga[] = ['kg', 'peso_corporal', 'tiempo'];

function deLista<T extends string>(valores: readonly T[], x: unknown, porDefecto: T): T {
  return valores.includes(x as T) ? (x as T) : porDefecto;
}

export function aEjercicioDeRutina(x: unknown): EjercicioDeRutina {
  const o = esObjeto(x) ? x : {};
  const ej = desenvolver(campo(o, 'exercise', 'ejercicio') ?? {}, 'exercise');
  const sugerencia = esObjeto(o.sugerencia) ? o.sugerencia : {};
  return {
    id: texto(o.id) || null,
    ejercicioId: texto(campo(o, 'exercise_id', 'ejercicio_id') ?? ej.id),
    nombre: texto(campo(o, 'nombre') ?? ej.nombre, 'Ejercicio'),
    grupo: texto(campo(o, 'grupo_muscular', 'grupo') ?? campo(ej, 'grupo_muscular', 'grupo')),
    equipo: texto(campo(o, 'equipo') ?? ej.equipo),
    tipoCarga: deLista(CARGAS, campo(o, 'tipo_carga') ?? ej.tipo_carga, 'kg'),
    series: numero(o.series) ?? 3,
    repsMin: numero(o.reps_min) ?? 8,
    repsMax: numero(o.reps_max) ?? numero(o.reps_min) ?? 10,
    rir: numero(campo(o, 'rir_objetivo', 'rir')) ?? 2,
    descansoS: numero(o.descanso_s) ?? 90,
    incrementoKg: numero(o.incremento_kg) ?? numero(ej.incremento_default_kg) ?? 2.5,
    pesoInicialKg: numero(o.peso_inicial_kg),
    pesoSugeridoKg: numero(campo(o, 'peso_sugerido_kg', 'peso_kg')) ?? numero(sugerencia.peso_kg),
    esquema: deLista(ESQUEMAS, o.esquema, 'normal'),
    nota: texto(campo(o, 'nota_entrenador', 'nota')),
  };
}

export function aDia(x: unknown): DiaDeRutina {
  const o = esObjeto(x) ? x : {};
  const dia = numero(o.dia_semana);
  return {
    id: texto(o.id) || null,
    nombre: texto(o.nombre, 'Día'),
    diaSemana: dia !== null && dia >= 1 && dia <= 7 ? dia : null,
    ejercicios: porOrden(lista(campo(o, 'ejercicios', 'exercises', 'routine_exercises') ?? [])).map(aEjercicioDeRutina),
    hechoSemana: campo(o, 'hecho_semana', 'hecho_esta_semana', 'hecho') === true,
    ultimaVez: texto(campo(o, 'ultima_vez', 'ultima_sesion_at')) || null,
  };
}

export function aRutina(x: unknown): Rutina {
  const o = desenvolver(x, 'routine', 'rutina');
  const dias = porOrden(lista(campo(o, 'dias', 'days') ?? [])).map(aDia);
  const asignados = lista(campo(o, 'asignados', 'clientes', 'clients') ?? []).map((c) => {
    const cc = esObjeto(c) ? c : {};
    return { id: texto(campo(cc, 'id', 'client_id')), nombre: nombreCompleto(cc) ?? texto(cc.nombre) };
  });
  return {
    id: texto(o.id),
    duenoId: texto(campo(o, 'owner_id', 'dueno_id')),
    alumnoId: texto(campo(o, 'client_id', 'alumno_id')) || null,
    origenId: texto(campo(o, 'origen_id', 'source_id')) || null,
    nombre: texto(o.nombre, 'Rutina'),
    descripcion: texto(o.descripcion),
    semanas: numero(o.semanas) ?? 4,
    metodo: deLista(METODOS, campo(o, 'metodo_progresion', 'metodo'), 'doble_progresion'),
    estado: deLista(ESTADOS, o.estado, 'borrador'),
    activadaAt: texto(o.activada_at) || null,
    creadaAt: texto(o.created_at) || null,
    dias,
    numDias: dias.length || numero(campo(o, 'num_dias', 'dias_count', 'dias_semana')) || 0,
    semanaActual: numero(o.semana_actual),
    sesiones: numero(campo(o, 'sesiones', 'sesiones_count', 'total_sesiones')),
    primeraSesion: texto(campo(o, 'primera_sesion_at', 'desde')) || null,
    ultimaSesion: texto(campo(o, 'ultima_sesion_at', 'hasta')) || null,
    adherenciaPct: numero(campo(o, 'adherencia_pct', 'adherencia')),
    volumenKg: numero(o.volumen_kg),
    duenoNombre: nombreCompleto(campo(o, 'owner', 'dueno')),
    asignados,
  };
}

// ── Ejercicios ───────────────────────────────────────────────────────────────
/** El récord escrito según cómo se registra el ejercicio. */
export function textoRecord(pr: unknown, tipoCarga: TipoCarga): string | null {
  if (pr === null || pr === undefined) return null;
  if (typeof pr === 'string') return pr;
  if (typeof pr === 'number') return tipoCarga === 'kg' ? `${coma(pr)} kg` : String(pr);
  if (!esObjeto(pr)) return null;
  const peso = numero(campo(pr, 'peso_kg', 'peso'));
  const reps = numero(pr.reps);
  const tiempo = numero(campo(pr, 'tiempo_s', 'segundos'));
  if (tipoCarga === 'tiempo' && tiempo !== null) return reloj(tiempo);
  if (tipoCarga === 'peso_corporal' && reps !== null) return `${reps} reps`;
  if (peso !== null) return `${coma(peso)} kg`;
  const valor = numero(pr.valor);
  if (valor === null) return null;
  return tipoCarga === 'kg' ? `${coma(valor)} kg` : tipoCarga === 'tiempo' ? reloj(valor) : `${valor} reps`;
}

function coma(n: number): string {
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

function reloj(s: number): string {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function pasos(x: unknown): string[] {
  if (Array.isArray(x)) return x.map((p) => texto(p).trim()).filter(Boolean);
  return texto(x)
    .split(/\n+/)
    .map((p) => p.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);
}

export function aEjercicio(x: unknown): Ejercicio {
  const o = desenvolver(x, 'exercise', 'ejercicio');
  const tipoCarga = deLista(CARGAS, o.tipo_carga, 'kg');
  const m = esObjeto(o.musculos) ? o.musculos : null;
  const principales = m ? lista(campo(m, 'principales', 'primarios') ?? []).map((v) => texto(v)).filter(Boolean) : [];
  const ayudan = m ? lista(campo(m, 'ayudan', 'secundarios') ?? []).map((v) => texto(v)).filter(Boolean) : [];
  return {
    id: texto(o.id),
    duenoId: texto(campo(o, 'owner_id', 'dueno_id')) || null,
    slug: texto(o.slug) || null,
    nombre: texto(o.nombre, 'Ejercicio'),
    grupo: texto(campo(o, 'grupo_muscular', 'grupo')),
    equipo: texto(o.equipo),
    patron: texto(o.patron, 'empuje'),
    tipoCarga,
    incrementoKg: numero(campo(o, 'incremento_default_kg', 'incremento_kg')) ?? 2.5,
    instrucciones: pasos(campo(o, 'instrucciones', 'tecnica')),
    musculos: principales.length || ayudan.length ? { principales, ayudan } : null,
    media: lista(o.media ?? []).map((md) => {
      const mm = esObjeto(md) ? md : {};
      return { id: texto(mm.id), tipo: mm.tipo === 'video' ? 'video' : 'foto', url: texto(mm.url) || null };
    }),
    record: textoRecord(campo(o, 'pr', 'record', 'mejor'), tipoCarga),
    creadoAt: texto(o.created_at) || null,
  };
}

export function aPuntoHistorial(x: unknown): PuntoHistorial {
  const o = esObjeto(x) ? x : {};
  const mejor = esObjeto(campo(o, 'mejor_set', 'mejor_serie')) ? (campo(o, 'mejor_set', 'mejor_serie') as Crudo) : o;
  const series = lista(campo(o, 'series', 'sets') ?? []).map((s) => {
    const ss = esObjeto(s) ? s : {};
    return { pesoKg: numero(ss.peso_kg) ?? 0, reps: numero(ss.reps) ?? 0 };
  });
  const pesoKg = numero(mejor.peso_kg) ?? series.reduce((a, s) => Math.max(a, s.pesoKg), 0);
  const reps = numero(mejor.reps) ?? series.reduce((a, s) => Math.max(a, s.reps), 0);
  return {
    sesionId: texto(campo(o, 'session_id', 'sesion_id')) || null,
    fecha: texto(campo(o, 'fecha', 'cerrada_at', 'iniciada_at')),
    e1rm: numero(o.e1rm),
    pesoKg,
    reps,
    series,
    dia: texto(campo(o, 'dia', 'dia_nombre', 'routine_day_nombre')) || null,
    rutina: texto(campo(o, 'rutina', 'rutina_nombre', 'routine_nombre')) || null,
  };
}

/** Historial del ejercicio, la sesión más nueva primero. */
export function aHistorial(x: unknown): PuntoHistorial[] {
  return lista(x, 'puntos', 'sesiones', 'serie')
    .map(aPuntoHistorial)
    .filter((p) => p.fecha)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function aObservacion(x: unknown): Observacion {
  const o = esObjeto(x) ? x : {};
  const tipo = o.tipo === 'dolor' || o.tipo === 'consejo' ? o.tipo : 'observacion';
  return {
    id: texto(o.id),
    tipo,
    autorId: texto(campo(o, 'autor_id', 'author_id')) || null,
    autorNombre: nombreCompleto(campo(o, 'autor', 'author')),
    texto: texto(o.texto),
    zona: texto(o.dolor_zona) || null,
    intensidad: numero(o.dolor_intensidad),
    fecha: texto(campo(o, 'created_at', 'fecha')),
  };
}

// ── Progreso ─────────────────────────────────────────────────────────────────
export function aSemanas(x: unknown): SemanaVolumen[] {
  return lista(x, 'semanas', 'weeks')
    .map((s) => {
      const o = esObjeto(s) ? s : {};
      const vol = numero(campo(o, 'volumen_kg', 'volumen'));
      return {
        desde: texto(campo(o, 'semana_inicio', 'desde', 'semana', 'inicio')).slice(0, 10),
        volumenKg: vol ?? (numero(o.volumen_t) ?? 0) * 1000,
        sesiones: numero(campo(o, 'sesiones', 'sesiones_count')) ?? 0,
        enCurso: campo(o, 'en_curso', 'actual') === true,
      };
    })
    .filter((s) => s.desde)
    .sort((a, b) => a.desde.localeCompare(b.desde));
}

export function aRecords(x: unknown): RecordPersonal[] {
  return lista(x, 'prs', 'records')
    .map((r) => {
      const o = esObjeto(r) ? r : {};
      const ej = esObjeto(campo(o, 'exercise', 'ejercicio')) ? (campo(o, 'exercise', 'ejercicio') as Crudo) : {};
      const valor = numero(o.valor) ?? 0;
      const anterior = numero(o.anterior);
      return {
        ejercicioId: texto(campo(o, 'exercise_id', 'ejercicio_id') ?? ej.id) || null,
        nombre: texto(campo(o, 'nombre') ?? ej.nombre, 'Ejercicio'),
        tipo: texto(o.tipo, 'peso_max'),
        valor,
        pesoKg: numero(o.peso_kg),
        reps: numero(o.reps),
        fecha: texto(campo(o, 'fecha', 'created_at')),
        diferencia: numero(o.diferencia) ?? (anterior !== null ? valor - anterior : null),
      };
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function aMedidas(x: unknown): Medida[] {
  return lista(x, 'medidas', 'metrics')
    .map((m) => {
      const o = esObjeto(m) ? m : {};
      return {
        id: texto(o.id) || null,
        fecha: texto(o.fecha).slice(0, 10),
        pesoKg: numero(o.peso_kg),
        cinturaCm: numero(o.cintura_cm),
        caderaCm: numero(o.cadera_cm),
        pechoCm: numero(o.pecho_cm),
        brazoCm: numero(o.brazo_cm),
        musloCm: numero(o.muslo_cm),
        grasaPct: numero(o.grasa_pct),
      };
    })
    .filter((m) => m.fecha)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function aFotos(x: unknown): Foto[] {
  return lista(x, 'fotos', 'photos')
    .map((f) => {
      const o = esObjeto(f) ? f : {};
      const tipo: TomaFoto = o.tipo === 'lado' || o.tipo === 'espalda' ? o.tipo : 'frente';
      return { id: texto(o.id), fecha: texto(o.fecha).slice(0, 10), tipo, url: texto(campo(o, 'url', 'url_firmada')) || null };
    })
    .filter((f) => f.fecha);
}

// ── Alertas, motivos e invitaciones ──────────────────────────────────────────
export function aAlerta(x: unknown): Alerta {
  const o = desenvolver(x, 'alert', 'alerta');
  const detalle = esObjeto(o.detalle) ? o.detalle : {};
  const ej = esObjeto(campo(o, 'exercise', 'ejercicio')) ? (campo(o, 'exercise', 'ejercicio') as Crudo) : {};
  return {
    id: texto(o.id),
    tipo: texto(o.tipo, 'baja_rendimiento'),
    estado: texto(o.estado, 'nueva'),
    ejercicioNombre: texto(ej.nombre ?? detalle.ejercicio_nombre ?? detalle.nombre) || null,
    detalle,
    creadaAt: texto(o.created_at) || null,
  };
}

/** Consejos que devuelve POST /me/drop-reports, agrupados por motivo. */
export function aConsejos(x: unknown): { [motivo: string]: string[] } {
  const o = esObjeto(x) ? x : {};
  const crudo = campo(o, 'consejos', 'tips') ?? x;
  const salida: { [motivo: string]: string[] } = {};
  if (esObjeto(crudo)) {
    for (const [k, v] of Object.entries(crudo)) salida[k] = lista(v).map((t) => texto(esObjeto(t) ? t.texto : t)).filter(Boolean);
    return salida;
  }
  for (const t of lista(crudo)) {
    if (!esObjeto(t)) continue;
    const motivo = texto(t.motivo);
    if (!motivo) continue;
    (salida[motivo] ??= []).push(texto(t.texto));
  }
  return salida;
}

export function aInvitacion(x: unknown): Invitacion | null {
  const o = desenvolver(x, 'invitacion', 'invitation');
  const codigo = texto(campo(o, 'codigo', 'code'));
  if (!codigo) return null;
  return { codigo, venceAt: texto(campo(o, 'codigo_vence_at', 'vence_at', 'expires_at')) || null };
}
