// ─────────────────────────────────────────────────────────────────────────────
// Lógica de la campana · Zona: Notificaciones (app)
//
// Qué hace: las reglas puras de la campana y de la lista de notificaciones, sin React ni red (se
// prueban en Node, ./__tests__):
//   textoContador / etiquetaCampana   lo que dice la insignia («3», «9+») y el lector de pantalla.
//   haceCuanto                        «recién», «hace 5 min», «hace 2 h», «ayer», «hace 3 días».
//   mezclarPrimera / mezclarSiguiente juntan una página nueva con lo que ya se ve, sin duplicar,
//                                     lo último primero. «Leída» nunca vuelve atrás: si el
//                                     teléfono ya la marcó y la respuesta venía de antes, gana
//                                     la marca del teléfono (y el contador se corrige).
//   marcarLeida / marcarTodas         el cambio en el teléfono antes de que conteste la API.
//   comoAbrir                         si la ruta de la notificación es una pestaña (se vuelve a
//                                     ella) o una pantalla encima (se abre).
//   debeRefrescarAlTirar              el «deslizar para refrescar» de la app web, que no tiene el
//                                     de Android.
// Tócalo cuando: cambie una de esas reglas o un texto de la campana.
// No lo toques para: las llamadas (./api.ts) ni el estado (./almacen.ts).
// Depende de: @gymtrack/shared (tipo Notificacion y fmtHace).
// ─────────────────────────────────────────────────────────────────────────────
import { fmtHace, type Notificacion } from '@gymtrack/shared';

// ── Insignia ─────────────────────────────────────────────────────────────────
/** Lo que va en la insignia de la campana: nada con 0, el número hasta 9 y «9+» desde 10. */
export function textoContador(sinLeer: number): string | null {
  if (!Number.isFinite(sinLeer) || sinLeer <= 0) return null;
  return sinLeer > 9 ? '9+' : String(Math.floor(sinLeer));
}

/** Lo que lee el lector de pantalla en la campana. */
export function etiquetaCampana(sinLeer: number): string {
  if (!Number.isFinite(sinLeer) || sinLeer <= 0) return 'Notificaciones, ninguna sin leer';
  return sinLeer === 1 ? 'Notificaciones, 1 sin leer' : `Notificaciones, ${Math.floor(sinLeer)} sin leer`;
}

/** El subtítulo de la pantalla. */
export function resumenSinLeer(sinLeer: number): string {
  if (sinLeer <= 0) return 'Estás al día';
  return sinLeer === 1 ? '1 sin leer' : `${sinLeer} sin leer`;
}

// ── Tiempo ───────────────────────────────────────────────────────────────────
const MIN_MS = 60_000;

/** El «ahora» del teléfono, para pasarlo a useState o a un efecto (nunca se llama al renderizar). */
export const ahoraMs = () => Date.now();

/** «recién», «hace 5 min», «hace 2 h» (mismo día), y desde ayer lo de fmtHace («ayer», «hace 3 días»). */
export function haceCuanto(iso: string, ahora: Date): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const min = Math.floor((ahora.getTime() - t) / MIN_MS);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const d = new Date(t);
  const mismoDia = d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth() && d.getDate() === ahora.getDate();
  if (mismoDia) return `hace ${Math.floor(min / 60)} h`;
  return fmtHace(iso, ahora);
}

/** Lo que lee el lector de pantalla en una fila: «Sin leer. Título. Texto. hace 5 min», sin puntos dobles. */
export function etiquetaFila(n: Pick<Notificacion, 'leida' | 'titulo' | 'cuerpo'>, hace: string): string {
  const frase = (t: string) => t.trim().replace(/[.\s]+$/, '');
  return [n.leida ? '' : 'Sin leer', frase(n.titulo), frase(n.cuerpo), hace].filter(Boolean).join('. ');
}

// ── Juntar páginas ───────────────────────────────────────────────────────────
export interface Lista {
  items: Notificacion[];
  sinLeer: number;
  /** Puede haber más antiguas que la última que se ve. */
  hayMas: boolean;
}

const ordenar = (xs: Notificacion[]) =>
  xs.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));

/**
 * «Leída» no vuelve atrás: si el teléfono ya la tenía leída y la página dice que no (la respuesta
 * salió antes de que llegara la marca), queda leída y el contador de la API baja en esas.
 */
function conLeidasDelTelefono(previas: readonly Notificacion[], nuevas: readonly Notificacion[], sinLeerApi: number) {
  const leidas = new Set(previas.filter((x) => x.leida).map((x) => x.id));
  let corregir = 0;
  const items = nuevas.map((x) => {
    if (!x.leida && leidas.has(x.id)) {
      corregir += 1;
      return { ...x, leida: true };
    }
    return x;
  });
  return { items, sinLeer: Math.max(0, sinLeerApi - corregir) };
}

/**
 * La primera página que acaba de llegar (las más nuevas) con lo que ya se veía: quedan las de la
 * página y, debajo, las más antiguas que ya se habían cargado con «ver más».
 */
export function mezclarPrimera(previa: Lista, pagina: { items: Notificacion[]; sin_leer: number }, porPagina: number): Lista {
  const { items, sinLeer } = conLeidasDelTelefono(previa.items, pagina.items, pagina.sin_leer);
  const completa = pagina.items.length < porPagina;
  if (completa || items.length === 0) return { items: ordenar([...items]), sinLeer, hayMas: false };
  const ids = new Set(items.map((x) => x.id));
  const limite = Math.min(...items.map((x) => Date.parse(x.created_at)));
  const antiguas = previa.items.filter((x) => !ids.has(x.id) && Date.parse(x.created_at) < limite);
  return { items: ordenar([...items, ...antiguas]), sinLeer, hayMas: antiguas.length > 0 ? previa.hayMas : true };
}

/** Una página más antigua (pedida con `antes`) va debajo de lo que ya se ve. */
export function mezclarSiguiente(previa: Lista, pagina: { items: Notificacion[]; sin_leer: number }, porPagina: number): Lista {
  const ids = new Set(previa.items.map((x) => x.id));
  const { items, sinLeer } = conLeidasDelTelefono(previa.items, pagina.items, pagina.sin_leer);
  return {
    items: ordenar([...previa.items, ...items.filter((x) => !ids.has(x.id))]),
    sinLeer,
    hayMas: pagina.items.length >= porPagina,
  };
}

/** El `antes` para pedir la página siguiente: la hora de la última que se ve. */
export function antesDe(items: readonly Notificacion[]): string | undefined {
  return items.at(-1)?.created_at;
}

// ── Marcar en el teléfono ────────────────────────────────────────────────────
/** La deja leída al tiro (sin esperar a la API). Si ya estaba leída o no está, no cambia nada. */
export function marcarLeida(l: Lista, id: string): Lista {
  const x = l.items.find((n) => n.id === id);
  if (!x || x.leida) return l;
  return { ...l, items: l.items.map((n) => (n.id === id ? { ...n, leida: true } : n)), sinLeer: Math.max(0, l.sinLeer - 1) };
}

/** Si la API no la pudo marcar, vuelve a quedar sin leer. */
export function desmarcarLeida(l: Lista, id: string): Lista {
  const x = l.items.find((n) => n.id === id);
  if (!x || !x.leida) return l;
  return { ...l, items: l.items.map((n) => (n.id === id ? { ...n, leida: false } : n)), sinLeer: l.sinLeer + 1 };
}

export function marcarTodas(l: Lista): Lista {
  return { ...l, items: l.items.map((n) => (n.leida ? n : { ...n, leida: true })), sinLeer: 0 };
}

// ── Abrir ────────────────────────────────────────────────────────────────────
/** Las pestañas de cada rol: Hoy y las del alumno, y todo lo que cuelga de /entrenador. */
const PESTANAS_ALUMNO = new Set(['/', '/rutinas', '/progreso', '/ejercicios', '/perfil']);

/**
 * `volver`: la ruta es una pestaña (Hoy, Alertas...): se cierra Notificaciones y se muestra esa
 * pestaña, sin apilar otra copia de las pestañas. `abrir`: una pantalla que va encima (la ficha
 * de un alumno, una rutina): se abre y Volver regresa a Notificaciones. `nada`: no es una ruta.
 */
export function comoAbrir(ruta: string): 'volver' | 'abrir' | 'nada' {
  if (!ruta.startsWith('/') || ruta.startsWith('//')) return 'nada';
  const camino = ruta.split(/[?#]/)[0]!.replace(/\/+$/, '') || '/';
  if (PESTANAS_ALUMNO.has(camino) || camino === '/entrenador' || camino.startsWith('/entrenador/')) return 'volver';
  return 'abrir';
}

/**
 * La ruta para quien la toca: «/» es Hoy del alumno; para el entrenador (la prueba de avisos
 * lleva «/») es su inicio, Clientes.
 */
export function rutaSegunRol(ruta: string, rol: 'alumno' | 'entrenador' | null): string {
  return rol === 'entrenador' && ruta === '/' ? '/entrenador' : ruta;
}

// ── Deslizar para refrescar en la web ────────────────────────────────────────
/** Cuánto hay que tirar hacia abajo desde arriba de la lista para refrescar (dp). */
export const TIRON_PARA_REFRESCAR = 72;

/** true si el dedo partió con la lista arriba del todo y bajó al menos TIRON_PARA_REFRESCAR. */
export function debeRefrescarAlTirar(o: { desplazamientoAlEmpezar: number; yInicio: number; yAhora: number }): boolean {
  return o.desplazamientoAlEmpezar <= 0 && o.yAhora - o.yInicio >= TIRON_PARA_REFRESCAR;
}
