// ─────────────────────────────────────────────────────────────────────────────
// Formatos de texto · Zona: Motor
//
// Qué hace: convierte números y fechas en el texto que ve el alumno: kilos con coma decimal ("47,5 kg"),
// el volumen en kilos o toneladas, la duración "m:ss", las fechas en español ("Miércoles 23 de
// septiembre") y el "hace 3 días" de las listas de sesiones. Solo escribe; nunca calcula.
// Tócalo cuando: quieras cambiar cómo se lee un número o una fecha en toda la app: el separador
// decimal, la abreviatura del mes, desde cuántos días se dice "hace 1 semana", cuándo el volumen
// pasa a toneladas.
// No lo toques para: cambiar el valor que se muestra (eso es una fórmula: packages/shared/src/formulas.ts)
// ni para el resumen "60×8 · 60×8" de las series, que vive en apps/mobile/src/lib/formato.ts.
// Depende de: ./formulas (redondear).
// ─────────────────────────────────────────────────────────────────────────────
import { redondear } from './formulas';

// ── Números y kilos ──────────────────────────────────────────────────────────

/**
 * Número con coma decimal, sin ceros de más: 47,5 · 60 · 0,25
 *
 * Recibe el número y cuántos decimales como máximo (1 por defecto); devuelve el texto listo para pintar.
 * Los ceros de más desaparecen solos porque JavaScript escribe 60 como "60" y no como "60.0".
 * Es la única función que pone la coma: si algún día hay que cambiar el separador, se cambia aquí.
 */
export function fmtNum(n: number, decimales = 1): string {
  return String(redondear(n, decimales)).replace('.', ',');
}

/** Kilos para mostrar: "32,5 kg". Misma regla de fmtNum, con la unidad pegada. */
export function fmtKg(n: number): string {
  return `${fmtNum(n)} kg`;
}

/**
 * Volumen: bajo 1000 en kg, sobre 1000 en toneladas con una decimal.
 *
 * Recibe kilos y devuelve "960 kg" o "1,2 t". Bajo la tonelada va sin decimales porque en una tarjeta
 * chica "960 kg" se lee mejor que "960,5 kg"; sobre la tonelada la decimal sí importa.
 */
export function fmtVolumen(kg: number): string {
  return kg >= 1000 ? `${fmtNum(kg / 1000)} t` : `${fmtNum(kg, 0)} kg`;
}

// ── Tiempo ───────────────────────────────────────────────────────────────────

/**
 * m:ss o h:mm:ss
 *
 * Recibe segundos y devuelve "5:07" o, pasada la hora, "1:05:07". Lo usan el cronómetro de la sesión,
 * el panel de descanso y las tarjetas de sesiones cerradas.
 * Los minutos solo llevan cero adelante cuando hay horas: "5:07" y no "05:07".
 */
export function fmtDuracion(segundos: number): string {
  // Se trunca y se acota a 0: un descanso que se pasó de largo o un decimal del cronómetro no rompen nada.
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// ── Fechas ───────────────────────────────────────────────────────────────────

/** Nombres de los días en el orden de Date.getDay(): 0 es domingo. En minúscula; fmtFecha capitaliza. */
export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
/** Nombres de los meses en el orden de Date.getMonth(): 0 es enero. */
export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Pone en mayúscula la primera letra: "miércoles" pasa a "Miércoles". */
function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * corta: "23 sep" · larga: "Miércoles 23 de septiembre"
 *
 * Recibe una fecha ISO (como se guardan las sesiones) o un Date, y el modo. Devuelve "" si la fecha no
 * se puede leer, así una sesión con un dato corrupto no revienta la pantalla.
 * Se escribe en la hora local del teléfono: una sesión cerrada a las 23:30 se ve en su día, aunque
 * en UTC ya fuera el siguiente.
 */
export function fmtFecha(iso: string | Date, modo: 'corta' | 'larga' = 'corta'): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  // El `?? ''` es por el tipado estricto de los índices; con un Date válido siempre hay mes y día.
  const mes = MESES[d.getMonth()] ?? '';
  // "sep", "mar", "ene": las tres primeras letras del mes bastan y caben en una tarjeta chica.
  if (modo === 'corta') return `${d.getDate()} ${mes.slice(0, 3)}`;
  return `${capitalizar(DIAS[d.getDay()] ?? '')} ${d.getDate()} de ${mes}`;
}

// ── Tiempo relativo ──────────────────────────────────────────────────────────

/**
 * "hoy", "ayer", "hace 3 días", "hace 2 semanas", "hace 3 meses"
 *
 * Recibe la fecha ISO y, para las pruebas, un "ahora" opcional. Cuenta bloques de 24 horas, no días
 * de calendario: una sesión de anoche a las 23:00 vista a las 8:00 sigue siendo "hoy". Si eso molesta,
 * el cambio va aquí (comparar a medianoche) y afecta a todas las listas a la vez.
 * Semanas y meses son aproximados: 7 días es una semana y 30 días es un mes.
 */
export function fmtHace(iso: string, ahora: Date = new Date()): string {
  const d = new Date(iso);
  // Se comparan días de calendario (medianoche local), no bloques de 24 horas:
  // una sesión de anoche a las 23:00 vista a las 8:00 es "ayer", no "hoy".
  const medianoche = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dias = Math.round((medianoche(ahora) - medianoche(d)) / 86_400_000);
  // Menor o igual a 0 también cubre una fecha "futura" por un reloj desajustado: se dice "hoy" y listo.
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  // Singular solo en la primera semana (7 a 13 días) y en el primer mes (30 a 59 días).
  if (dias < 30) return `hace ${Math.floor(dias / 7)} semana${dias < 14 ? '' : 's'}`;
  return `hace ${Math.floor(dias / 30)} mes${dias < 60 ? '' : 'es'}`;
}
