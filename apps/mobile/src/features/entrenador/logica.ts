// ─────────────────────────────────────────────────────────────────────────────
// Lógica de las pantallas del entrenador · Zona: Entrenador (app)
//
// Qué hace: todo lo que las pantallas del entrenador calculan sin React: buscar y filtrar
// clientes sin importar tildes, las cuentas del panel (activos, entrenan hoy, sin rutina,
// adherencia de la semana), la línea de estado de cada cliente, las fechas cortas («ayer
// 19:20», «mar 24 nov»), el estado del código de invitación, los textos de cada alerta, y los
// cambios de Ajustar cargas (qué cambió, cuántos faltan por guardar, qué se manda a la API).
// Las pruebas están en __tests__/logica.test.ts.
// Tócalo cuando: cambie una regla de la pantalla (qué cuenta como «Revisar», cómo se escribe
// una fecha, cuánto sube el más y menos).
// No lo toques para: cómo se ve algo (los componentes) ni cómo se llama a la API (api.ts).
// Depende de: ./contrato (tipos) y @gymtrack/shared (fmtNum, fmtHace, MESES, DIAS).
// ─────────────────────────────────────────────────────────────────────────────
import { DIAS, fmtHace, fmtNum, MESES } from '@gymtrack/shared';
import type { Alerta, ClienteLista, Ficha, Invitacion, Observacion, Sugerencia, TipoAlerta, ValoresCarga } from './contrato';

// ── Texto y nombres ──────────────────────────────────────────────────────────
/** Minúsculas y sin tildes, para buscar «Jose» y encontrar «Josefa Muñoz». */
export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function nombreCompleto(p: { nombre: string; apellido: string }): string {
  return `${p.nombre} ${p.apellido}`.trim();
}

/** «MF» para Martina Fuentes. Sin nombre, «?». */
export function iniciales(p: { nombre: string; apellido: string }): string {
  const a = p.nombre.trim().charAt(0);
  const b = p.apellido.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || '?';
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// ── Fechas cortas ────────────────────────────────────────────────────────────
const DIA_CORTO = DIAS.map((d) => (d === 'miércoles' ? 'mié' : d === 'sábado' ? 'sáb' : d.slice(0, 3)));
/**
 * Lee una fecha ISO. Las de solo día («2026-11-05», medidas y fechas sugeridas) se leen a
 * mediodía local: new Date('2026-11-05') es medianoche UTC y en Chile caería el día anterior.
 */
const fecha = (iso: string): Date | null => {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);
  return Number.isNaN(d.getTime()) ? null : d;
};
const medianoche = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const diasEntre = (d: Date, ahora: Date) => Math.round((medianoche(ahora) - medianoche(d)) / 86_400_000);

/** «7:05» en la hora del teléfono. */
export function hora(iso: string): string {
  const d = fecha(iso);
  if (!d) return '';
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** «mar 24 nov». */
export function fmtDiaCorto(iso: string): string {
  const d = fecha(iso);
  if (!d) return '';
  return `${DIA_CORTO[d.getDay()]} ${d.getDate()} ${(MESES[d.getMonth()] ?? '').slice(0, 3)}`;
}

/** «10 de noviembre». */
export function fmtDiaLargo(iso: string): string {
  const d = fecha(iso);
  if (!d) return '';
  return `${d.getDate()} de ${MESES[d.getMonth()] ?? ''}`;
}

/**
 * Cuándo pasó algo, como en Alertas: «hoy 3:00», «ayer 19:20» y, antes, «sáb 14 nov».
 * `conHora` en false deja solo «hoy» o «ayer» (Por revisar, en Clientes).
 */
export function fmtCuando(iso: string, ahora: Date, conHora = true): string {
  const d = fecha(iso);
  if (!d) return '';
  const dias = diasEntre(d, ahora);
  if (dias <= 0) return conHora ? `hoy ${hora(iso)}` : 'hoy';
  if (dias === 1) return conHora ? `ayer ${hora(iso)}` : 'ayer';
  return fmtDiaCorto(iso);
}

// ── Clientes: filtros y cuentas ──────────────────────────────────────────────
export type FiltroClientes = 'todos' | 'hoy' | 'revisar' | 'sinrutina';
export const FILTROS_CLIENTES: readonly { id: FiltroClientes; nombre: string }[] = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'hoy', nombre: 'Hoy' },
  { id: 'revisar', nombre: 'Revisar' },
  { id: 'sinrutina', nombre: 'Sin rutina' },
];

export const sinRutina = (c: ClienteLista) => c.sin_rutina || (c.rutina_activa === null && c.semana === null);
export const porRevisar = (c: ClienteLista) => c.alertas_abiertas > 0;

/** Orden alfabético por nombre completo, como la lista de la maqueta. */
export function ordenarClientes(lista: readonly ClienteLista[]): ClienteLista[] {
  return [...lista].sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'));
}

/** Aplica el filtro (chips) y la búsqueda (sin tildes, en cualquier parte del nombre). */
export function filtrarClientes(lista: readonly ClienteLista[], filtro: FiltroClientes, busqueda = ''): ClienteLista[] {
  const q = normalizar(busqueda);
  return ordenarClientes(lista).filter((c) => {
    if (q && !normalizar(nombreCompleto(c)).includes(q)) return false;
    if (filtro === 'hoy') return c.entrena_hoy;
    if (filtro === 'revisar') return porRevisar(c);
    if (filtro === 'sinrutina') return sinRutina(c);
    return true;
  });
}

/**
 * Parte un nombre en [antes, lo que coincide, después] para resaltar la búsqueda. Se normaliza
 * letra por letra para que los índices calcen aunque el nombre tenga tildes. null si no coincide.
 */
export function partirCoincidencia(nombre: string, busqueda: string): [string, string, string] | null {
  const q = normalizar(busqueda);
  if (!q) return null;
  const letras = [...nombre];
  const plano = letras.map((l) => normalizar(l) || l).join('');
  const i = plano.indexOf(q);
  if (i < 0) return null;
  return [letras.slice(0, i).join(''), letras.slice(i, i + q.length).join(''), letras.slice(i + q.length).join('')];
}

export interface CuentasPanel {
  activos: number;
  hoy: number;
  sinrutina: number;
  revisar: number;
  todos: number;
  /** Sesiones de la semana: hechas, perdidas y planificadas en total (sumando a todos). */
  hechas: number;
  perdidas: number;
  planificadas: number;
  /** Hechas sobre las que ya tocaban (hechas más perdidas), en %. null si todavía no tocaba ninguna. */
  adherencia: number | null;
}

export function cuentasPanel(lista: readonly ClienteLista[]): CuentasPanel {
  const conSemana = lista.filter((c) => c.semana && !sinRutina(c));
  const hechas = conSemana.reduce((a, c) => a + (c.semana?.hechas ?? 0), 0);
  const perdidas = conSemana.reduce((a, c) => a + (c.semana?.perdidas ?? 0), 0);
  const planificadas = conSemana.reduce((a, c) => a + (c.semana?.planificadas ?? 0), 0);
  return {
    activos: lista.length,
    hoy: lista.filter((c) => c.entrena_hoy).length,
    sinrutina: lista.filter(sinRutina).length,
    revisar: lista.filter(porRevisar).length,
    todos: lista.length,
    hechas,
    perdidas,
    planificadas,
    adherencia: hechas + perdidas > 0 ? Math.round((hechas / (hechas + perdidas)) * 100) : null,
  };
}

/** Segmentos de la barra de la semana: 'si' hecha, 'no' perdida, '' por venir. */
export function segmentosSemana(s: { hechas: number; perdidas: number; planificadas: number }): ('si' | 'no' | '')[] {
  const total = Math.max(s.planificadas, s.hechas + s.perdidas);
  return Array.from({ length: total }, (_, i) => (i < s.hechas ? 'si' : i < s.hechas + s.perdidas ? 'no' : ''));
}

// ── Detalle de una alerta (alerts.detalle) ───────────────────────────────────
type Detalle = Record<string, unknown>;
const num = (d: Detalle, k: string): number | null => (typeof d[k] === 'number' ? (d[k] as number) : null);
const str = (d: Detalle, k: string): string | null => (typeof d[k] === 'string' && d[k] ? (d[k] as string) : null);

/** La línea de estado de un cliente en la lista, y si va en rojo (dolor). */
export function estadoCliente(c: ClienteLista, ahora: Date): { texto: string; peligro: boolean } {
  const a = c.alerta_principal;
  if (a && a.estado === 'nueva') {
    const d = a.detalle;
    if (a.tipo === 'dolor') {
      const zona = str(d, 'zona');
      const n = num(d, 'intensidad');
      return { texto: `Dolor${zona ? ` en la ${zona}` : ''}${n !== null ? ` · ${n} de 10` : ''}`, peligro: true };
    }
    if (a.tipo === 'estancamiento') {
      const n = num(d, 'sesiones') ?? 3;
      return { texto: `${a.ejercicio ?? 'Un ejercicio'} sin avance en ${n} sesiones`, peligro: false };
    }
    if (a.tipo === 'sin_sesiones') {
      const n = num(d, 'dias') ?? 7;
      return { texto: `${n} días sin entrenar`, peligro: false };
    }
  }
  if (sinRutina(c)) {
    return { texto: c.vinculado_at ? `Sin rutina · se vinculó ${fmtHace(c.vinculado_at, ahora)}` : 'Sin rutina', peligro: false };
  }
  const ultima = c.ultima_sesion_at ? fecha(c.ultima_sesion_at) : null;
  const nombre = c.ultima_sesion_nombre ? ` · ${c.ultima_sesion_nombre}` : '';
  if (ultima && diasEntre(ultima, ahora) <= 0) {
    return { texto: `Entrenó hoy a las ${hora(c.ultima_sesion_at ?? '')}${nombre}`, peligro: false };
  }
  if (c.entrena_hoy) return { texto: `Entrena hoy${c.dia_hoy ? ` · ${c.dia_hoy}` : ''}`, peligro: false };
  if (ultima && c.ultima_sesion_at) return { texto: `Entrenó ${fmtHace(c.ultima_sesion_at, ahora)}${nombre}`, peligro: false };
  return { texto: 'Todavía no registra sesiones', peligro: false };
}

// ── Código de invitación ─────────────────────────────────────────────────────
export type EstadoCodigo = 'ninguno' | 'vigente' | 'vencido';

/**
 * Vigente: nadie lo usó y no vence. Vencido: pasó la fecha sin que nadie lo usara (Perfil lo
 * muestra apagado). Ninguno: no hay código, o el último ya se usó o se reemplazó por otro.
 */
export function estadoCodigo(inv: Invitacion | null, ahoraMs: number): EstadoCodigo {
  if (!inv) return 'ninguno';
  if (inv.estado && inv.estado !== 'invitado') return 'ninguno';
  const vence = Date.parse(inv.vence_at);
  if (Number.isNaN(vence)) return 'ninguno';
  if (vence <= ahoraMs) return 'vencido';
  return inv.vigente === false ? 'ninguno' : 'vigente';
}

/** Lo que lee el lector de pantalla: «Código K 7 P 2 Q X». */
export const codigoAccesible = (codigo: string) => `Código ${[...codigo].join(' ')}`;

/** El texto que va al menú de compartir (maqueta de Perfil). */
export function mensajeInvitacion(inv: Invitacion): string {
  return `Entrena conmigo en GymTrack. Tu código es ${inv.codigo} y vence el ${fmtDiaCorto(inv.vence_at)}.`;
}

// ── Alertas ──────────────────────────────────────────────────────────────────
/** Los cuatro tipos con el mismo nombre en Clientes, la Ficha, Alertas y Ajustar cargas. */
export const NOMBRE_TIPO: Record<TipoAlerta, string> = {
  estancamiento: 'Sin avance',
  baja_rendimiento: 'Baja de rendimiento',
  sin_sesiones: 'Sin sesiones',
  dolor: 'Dolor',
};

export const esAbierta = (a: Alerta) => a.estado !== 'resuelta';
export const contarNuevas = (alertas: readonly Alerta[]) => alertas.filter((a) => a.estado === 'nueva').length;

/** Por revisar: las nuevas primero y, dentro de cada grupo, la más reciente arriba. */
export function ordenarPorRevisar(alertas: readonly Alerta[]): Alerta[] {
  return alertas
    .filter(esAbierta)
    .sort((a, b) => Number(b.estado === 'nueva') - Number(a.estado === 'nueva') || b.created_at.localeCompare(a.created_at));
}

/** Resueltas agrupadas por mes («Noviembre»), la más reciente primero. */
export function agruparPorMes(alertas: readonly Alerta[]): { mes: string; items: Alerta[] }[] {
  const grupos = new Map<string, Alerta[]>();
  const ordenadas = [...alertas].sort((a, b) => (b.resuelta_at ?? b.created_at).localeCompare(a.resuelta_at ?? a.created_at));
  for (const a of ordenadas) {
    const d = fecha(a.resuelta_at ?? a.created_at);
    const mes = d ? (MESES[d.getMonth()] ?? '') : '';
    const clave = mes.charAt(0).toUpperCase() + mes.slice(1);
    grupos.set(clave, [...(grupos.get(clave) ?? []), a]);
  }
  return [...grupos].map(([mes, items]) => ({ mes, items }));
}

/** De qué es la alerta, bajo el nombre del cliente: el ejercicio, la sesión o la rutina. */
export function queDeAlerta(a: Alerta): string {
  const d = a.detalle;
  if (a.tipo === 'sin_sesiones') return str(d, 'rutina_nombre') ? `Rutina ${str(d, 'rutina_nombre')}` : 'Su rutina activa';
  if (a.tipo === 'baja_rendimiento' && !a.ejercicio && str(d, 'sesion_nombre')) return `Sesión ${str(d, 'sesion_nombre')}`;
  return a.ejercicio?.nombre || str(d, 'ejercicio') || '';
}

/** Serie del 1RM estimado por sesión (estancamiento), para el gráfico corto. */
export function serieEstancamiento(a: Alerta): { fecha: string; valor: number }[] {
  const serie = Array.isArray(a.detalle.serie) ? (a.detalle.serie as unknown[]) : [];
  return serie.flatMap((p) => {
    if (!p || typeof p !== 'object') return [];
    const o = p as Detalle;
    const valor = num(o, 'e1rm') ?? num(o, 'valor');
    const f = str(o, 'fecha');
    return valor !== null && f ? [{ fecha: f, valor }] : [];
  });
}

/** La frase con el dato que disparó la alerta. */
export function textoDatoAlerta(a: Alerta): string {
  const d = a.detalle;
  if (a.tipo === 'estancamiento') {
    const mejor = num(d, 'mejor_e1rm');
    const desde = str(d, 'mejor_fecha');
    const n = num(d, 'sesiones') ?? 3;
    if (mejor === null) return `Su 1RM estimado no sube hace ${n} sesiones.`;
    return `Su mejor 1RM estimado es ${fmtNum(mejor)} kg${desde ? `, del ${fmtDiaLargo(desde)}` : ''}. No lo supera en sus ${n} últimas sesiones.`;
  }
  if (a.tipo === 'baja_rendimiento') {
    const valor = num(d, 'valor');
    const prom = num(d, 'promedio');
    const medida = str(d, 'medida') === 'e1rm' ? 'Su 1RM estimado' : 'El volumen de la sesión';
    const pct = num(d, 'caida_pct') ?? (valor !== null && prom ? Math.round(((prom - valor) / prom) * 100) : null);
    return `${medida} cayó ${pct ?? 10} % frente a su promedio de las 4 semanas anteriores.`;
  }
  if (a.tipo === 'sin_sesiones') {
    const n = num(d, 'dias') ?? 7;
    const ultima = str(d, 'ultima_sesion_at');
    return `${n} días sin entrenar.${ultima ? ` Su última sesión fue el ${fmtDiaCorto(ultima)}` : ' No registra sesiones'} y tiene una rutina activa.`;
  }
  const n = num(d, 'intensidad');
  const zona = str(d, 'zona');
  const serie = num(d, 'serie_n');
  const total = num(d, 'series_total');
  const donde = serie !== null ? ` Serie ${serie}${total !== null ? ` de ${total}` : ''}.` : '';
  return `Dolor ${n ?? 7} de 10${zona ? ` en la ${zona}` : ''}.${donde}`;
}

/** El detalle en una línea, para «Por revisar» en Clientes: «Rodilla izquierda · 7 de 10». */
export function detalleCorto(a: Alerta): string {
  const d = a.detalle;
  const may = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (a.tipo === 'dolor') {
    const zona = str(d, 'zona');
    const n = num(d, 'intensidad');
    return [zona ? may(zona) : queDeAlerta(a), n !== null ? `${n} de 10` : ''].filter(Boolean).join(' · ');
  }
  if (a.tipo === 'estancamiento') return [queDeAlerta(a), `${num(d, 'sesiones') ?? 3} sesiones iguales`].filter(Boolean).join(' · ');
  if (a.tipo === 'sin_sesiones') return `${num(d, 'dias') ?? 7} días sin entrenar`;
  const valor = num(d, 'valor');
  const prom = num(d, 'promedio');
  const pct = num(d, 'caida_pct') ?? (valor !== null && prom ? Math.round(((prom - valor) / prom) * 100) : null);
  return [queDeAlerta(a), pct !== null ? `cayó ${pct} %` : ''].filter(Boolean).join(' · ');
}

/** Lo que el entrenador anota al resolver (hoja Resolver alerta). */
export const SALIDAS_RESOLVER = [
  { id: 'cargas', enHoja: 'Ajusté sus cargas', enLista: 'Ajustaste las cargas' },
  { id: 'consejo', enHoja: 'Le escribí un consejo', enLista: 'Le escribiste un consejo' },
  { id: 'rutina', enHoja: 'Cambié su rutina', enLista: 'Cambiaste su rutina' },
  { id: 'nada', enHoja: 'Nada, fue algo puntual', enLista: 'Sin cambios' },
] as const;
export type SalidaResolver = (typeof SALIDAS_RESOLVER)[number]['id'];

/** La nota que se manda al resolver; sin nada marcado no hay nota. */
export function notaResolver(elegidas: readonly SalidaResolver[]): string | undefined {
  const textos = SALIDAS_RESOLVER.filter((s) => elegidas.includes(s.id)).map((s) => s.enLista);
  return textos.length ? textos.join(' · ') : undefined;
}

/** Cómo se resolvió, para la lista de resueltas. */
export const comoSeResolvio = (a: Alerta) =>
  a.nota || notaResolver(a.acciones.filter((x): x is SalidaResolver => SALIDAS_RESOLVER.some((s) => s.id === x))) || 'Sin nota';

// ── Ficha ────────────────────────────────────────────────────────────────────
export const METODOS: Record<string, string> = {
  doble_progresion: 'Doble progresión',
  lineal: 'Lineal',
  porcentual: 'Porcentual',
  por_rm: 'Por RM',
  descendentes: 'Series descendentes',
  series_descendentes: 'Series descendentes',
  cluster: 'Cluster',
};
export const nombreMetodo = (m: string | null | undefined) => (m ? (METODOS[m] ?? m.replace(/_/g, ' ')) : '');

/** El dolor que el entrenador todavía no responde (el más reciente). */
export function dolorSinResponder(obs: readonly Observacion[]): Observacion | null {
  return [...obs].filter((o) => o.tipo === 'dolor' && !o.respuesta).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

/** La acción fija de abajo según lo que más importa: rutina, dolor o consejo. */
export function accionFicha(f: Ficha): 'asignar' | 'responder' | 'consejo' {
  if (!f.rutina_activa) return 'asignar';
  if (dolorSinResponder(f.observaciones)) return 'responder';
  return 'consejo';
}

export function validarMensaje(texto: string, esRespuesta: boolean): string | null {
  if (texto.trim()) return null;
  return esRespuesta ? 'Escribe la respuesta antes de enviarla.' : 'Escribe el consejo antes de enviarlo.';
}

/** «Hoy toca Pierna A, 6 ejercicios. La última vez fue el 10 de noviembre.» */
export function textoHoyToca(hoy: { nombre: string; ejercicios: number; ultima_vez_at: string | null } | null): string {
  if (!hoy) return 'Hoy no le toca entrenar.';
  const ej = hoy.ejercicios ? `, ${plural(hoy.ejercicios, 'ejercicio', 'ejercicios')}` : '';
  const ultima = hoy.ultima_vez_at ? ` La última vez fue el ${fmtDiaLargo(hoy.ultima_vez_at)}.` : '';
  return `Hoy toca ${hoy.nombre}${ej}.${ultima}`;
}

// Las respuestas de la encuesta (pantalla 4, esquemaEncuestaRespuestas de shared) en palabras.
const RESPUESTAS: Record<string, string> = {
  ganar_masa: 'Ganar masa muscular',
  bajar_grasa: 'Bajar grasa corporal',
  salud_general: 'Mejorar salud general',
  mantenerme_activo: 'Mantenerme activo',
  nunca: 'Nunca',
  menos_de_un_ano: 'Menos de un año',
  uno_a_tres_anos: 'De uno a tres años',
  mas_de_tres_anos: 'Más de tres años',
  gimnasio_completo: 'Gimnasio completo',
  gimnasio_basico: 'Gimnasio básico',
  casa_mancuernas: 'En casa con mancuernas',
  peso_corporal: 'Solo peso corporal',
  espalda_baja: 'Espalda baja',
  muneca: 'Muñeca',
  ninguna: 'Ninguna',
};

/** Años cumplidos a `ahora` desde una fecha AAAA-MM-DD. */
export function edadDesde(nacimiento: string, ahora: Date): number | null {
  const d = fecha(nacimiento);
  if (!d) return null;
  let edad = ahora.getFullYear() - d.getFullYear();
  if (ahora.getMonth() < d.getMonth() || (ahora.getMonth() === d.getMonth() && ahora.getDate() < d.getDate())) edad -= 1;
  return edad;
}
const enPalabras = (v: unknown): string => {
  if (Array.isArray(v)) return v.map(enPalabras).filter(Boolean).join(', ');
  if (typeof v === 'number') return fmtNum(v);
  if (typeof v !== 'string' || !v) return '';
  const t = RESPUESTAS[v] ?? v.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/**
 * «Punto de partida»: las filas [título, valor] (sin las vacías) y lo que escribió sobre sus
 * lesiones. `edad` es la que manda la API; si no viene, se calcula de la fecha de nacimiento.
 */
export function leerEncuesta(r: Record<string, unknown>, edad: number | null, ahora: Date): { filas: [string, string][]; escribio: string } {
  const dias = typeof r.dias_semana === 'number' ? `${r.dias_semana === 5 ? '5 o más' : r.dias_semana} por semana` : enPalabras(r.dias_semana);
  const min = typeof r.minutos_sesion === 'number' ? `${r.minutos_sesion} por sesión` : enPalabras(r.minutos_sesion);
  const anos = edad ?? (typeof r.fecha_nacimiento === 'string' ? edadDesde(r.fecha_nacimiento, ahora) : null);
  const cuerpo = [anos !== null ? `${anos} años` : '', typeof r.altura_cm === 'number' ? `${r.altura_cm} cm` : ''].filter(Boolean).join(' · ');
  const peso = typeof r.peso_kg === 'number' ? `${fmtNum(r.peso_kg)} kg` : '';
  const l = r.lesiones && typeof r.lesiones === 'object' && !Array.isArray(r.lesiones) ? (r.lesiones as Record<string, unknown>) : null;
  const lesiones = l ? enPalabras(l.zonas) : enPalabras(r.lesiones);
  const escribio = l && typeof l.texto === 'string' ? l.texto.trim() : '';
  const filas: [string, string][] = [
    ['Objetivo', enPalabras(r.objetivo)],
    ['Experiencia', enPalabras(r.experiencia)],
    ['Días', dias],
    ['Tiempo', min],
    ['Dónde entrena', enPalabras(r.lugar)],
    ['Edad y altura', cuerpo],
    ['Peso al empezar', peso],
    ['Lesiones', lesiones],
  ];
  return { filas: filas.filter(([, v]) => v), escribio };
}

// ── Ajustar cargas ───────────────────────────────────────────────────────────
export interface Ajuste {
  peso_kg: number;
  reps_min: number;
  reps_max: number;
  nota: string;
}

/** Rangos de repeticiones que ofrecen las chips (más el de la sugerencia si no está). */
export function rangosPara(s: Sugerencia): [number, number][] {
  const base: [number, number][] = [
    [6, 8],
    [8, 10],
    [10, 12],
    [12, 15],
  ];
  const { reps_min, reps_max } = s.sugerencia;
  if (!base.some(([a, b]) => a === reps_min && b === reps_max)) base.push([reps_min, reps_max]);
  return base.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}

export const rango = (min: number, max: number) => (min === max ? `${min}` : `${min}–${max}`);

/** Lo que muestra el editor al abrir: lo guardado si el entrenador ya la cambió; si no, la sugerencia. */
export function ajusteInicial(s: Sugerencia): Ajuste {
  const v = s.valor_final ?? s.sugerencia;
  return { peso_kg: v.peso_kg, reps_min: v.reps_min, reps_max: v.reps_max, nota: s.nota ?? '' };
}

/** La carga o el rango ya no son los que calculó la app (borde ámbar, «Cambiado»). */
export function cambioCarga(s: Sugerencia, a: Ajuste): boolean {
  const g = s.sugerencia;
  return a.peso_kg !== g.peso_kg || a.reps_min !== g.reps_min || a.reps_max !== g.reps_max;
}

export const cambiado = (s: Sugerencia, a: Ajuste) => cambioCarga(s, a) || a.nota.trim() !== '';

/** Lo que falta guardar: difiere de lo que hay hoy en la API. */
export function sinGuardar(s: Sugerencia, a: Ajuste): boolean {
  const g = ajusteInicial(s);
  return a.peso_kg !== g.peso_kg || a.reps_min !== g.reps_min || a.reps_max !== g.reps_max || a.nota.trim() !== g.nota.trim();
}

export const contarSinGuardar = (lista: readonly Sugerencia[], ajustes: Record<string, Ajuste>) =>
  lista.filter((s) => ajustes[s.id] && sinGuardar(s, ajustes[s.id] as Ajuste)).length;

/** Tope del más y menos de Ajustar cargas. El mínimo es el incremento del ejercicio. */
export const LIMITE_CARGA_KG = 300;

export function textoDeltaCarga(s: Sugerencia, a: Ajuste): string {
  const d = Math.round((a.peso_kg - s.sugerencia.peso_kg) * 100) / 100;
  if (!d) return 'Igual que la sugerencia.';
  return d > 0 ? `${fmtNum(d)} kg más que la sugerencia.` : `${fmtNum(-d)} kg menos que la sugerencia.`;
}

export function textoDeltaReps(s: Sugerencia, a: Ajuste): string {
  const g = s.sugerencia;
  return a.reps_min !== g.reps_min || a.reps_max !== g.reps_max ? `La app sugiere ${rango(g.reps_min, g.reps_max)}.` : '';
}

/** El cuerpo de PATCH /suggestions/:id. La nota vacía no se manda. */
export function cuerpoSobrescribir(a: Ajuste): Omit<ValoresCarga, 'rir'> & { nota?: string } {
  const nota = a.nota.trim();
  return { peso_kg: a.peso_kg, reps_min: a.reps_min, reps_max: a.reps_max, ...(nota ? { nota } : {}) };
}

export const textoCambios = (n: number) => plural(n, 'cambio', 'cambios');
