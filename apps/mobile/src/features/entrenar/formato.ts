// ─────────────────────────────────────────────────────────────────────────────
// Formatos de Entrenar · Zona: Entrenar
//
// Qué hace: los textos chicos que se repiten en Hoy, el registro y el cierre: cifras con coma
// («82,5»), toneladas («41,3»), reloj («54:14»), la hora ISO con la zona del teléfono que pide la
// API («2026-11-17T19:42:10-03:00») y la hora actual envuelta para usarla desde un componente.
// Tócalo cuando: cambie cómo se escribe una cifra en estas pantallas.
// No lo toques para: los formatos de la 0.1 (packages/shared/src/format.ts), que siguen igual.
// Depende de: @gymtrack/shared (fmtDuracion, fmtFecha, MESES). Es puro.
// ─────────────────────────────────────────────────────────────────────────────
import { fmtDuracion, fmtFecha, MESES } from '@gymtrack/shared';

/** «85», «82,5». Hasta dos decimales, sin ceros de más. */
export function cifra(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r).replace('.', ',');
}

/** Kilos a toneladas con un decimal: 41320 da «41,3». */
export function toneladas(kg: number): string {
  return (Math.round(kg / 100) / 10).toFixed(1).replace('.', ',');
}

/** «54:14» o «1:05:07». */
export function reloj(segundos: number): string {
  return fmtDuracion(segundos);
}

/** «4+» para el 4, el número tal cual para el resto. */
export function textoRir(rir: number | null): string {
  if (rir === null) return 'sin marcar';
  return rir >= 4 ? '4+' : String(rir);
}

/** «+2,5», «−2,5» o «±0». */
export function firmado(n: number): string {
  if (n > 0) return `+${cifra(n)}`;
  if (n < 0) return `−${cifra(Math.abs(n))}`;
  return '±0';
}

/** La fecha y hora en ISO con la zona del teléfono, sin milisegundos. */
export function isoConZona(ms: number): string {
  const d = new Date(ms);
  const dos = (x: number) => String(Math.abs(x)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const signo = off >= 0 ? '+' : '-';
  return (
    `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}` +
    `T${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}` +
    `${signo}${dos(Math.trunc(off / 60))}:${dos(off % 60)}`
  );
}

/** «Martes 17 de noviembre». */
export function fechaLarga(iso: string | Date): string {
  return fmtFecha(iso, 'larga');
}

/** «10 nov». */
export function fechaCorta(iso: string | null): string {
  return iso ? fmtFecha(iso, 'corta') : '';
}

/** «Noviembre». */
export function nombreMes(d: Date): string {
  const m = MESES[d.getMonth()] ?? '';
  return m.charAt(0).toUpperCase() + m.slice(1);
}

/** La hora actual. Va en una función aparte porque el compilador de React no deja Date.now() en un componente. */
export function ahora(): number {
  return Date.now();
}

/** Iniciales para el avatar: «Camila Rojas» da «CR». */
export function iniciales(nombre: string, apellido = ''): string {
  return `${nombre.trim().charAt(0)}${apellido.trim().charAt(0)}`.toUpperCase();
}
