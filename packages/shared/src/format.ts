import { redondear } from './formulas';

/** Número con coma decimal, sin ceros de más: 47,5 · 60 · 0,25 */
export function fmtNum(n: number, decimales = 1): string {
  return String(redondear(n, decimales)).replace('.', ',');
}

export function fmtKg(n: number): string {
  return `${fmtNum(n)} kg`;
}

/** Volumen: bajo 1000 en kg, sobre 1000 en toneladas con una decimal. */
export function fmtVolumen(kg: number): string {
  return kg >= 1000 ? `${fmtNum(kg / 1000)} t` : `${fmtNum(kg, 0)} kg`;
}

/** m:ss o h:mm:ss */
export function fmtDuracion(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** corta: "23 sep" · larga: "Miércoles 23 de septiembre" */
export function fmtFecha(iso: string | Date, modo: 'corta' | 'larga' = 'corta'): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  const mes = MESES[d.getMonth()] ?? '';
  if (modo === 'corta') return `${d.getDate()} ${mes.slice(0, 3)}`;
  return `${capitalizar(DIAS[d.getDay()] ?? '')} ${d.getDate()} de ${mes}`;
}

/** "hoy", "ayer", "hace 3 días", "hace 2 semanas", "hace 3 meses" */
export function fmtHace(iso: string, ahora: Date = new Date()): string {
  const d = new Date(iso);
  const dias = Math.floor((ahora.getTime() - d.getTime()) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  if (dias < 30) return `hace ${Math.floor(dias / 7)} semana${dias < 14 ? '' : 's'}`;
  return `hace ${Math.floor(dias / 30)} mes${dias < 60 ? '' : 'es'}`;
}
