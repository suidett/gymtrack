// ─────────────────────────────────────────────────────────────────────────────
// Fechas en la zona del alumno · Zona: Sesiones (API)
//
// Qué hace: convierte instantes UTC a días de calendario en la zona del alumno (America/Santiago
// por defecto) y al revés: qué día es hoy, dónde empieza un día, el lunes de la semana y el día
// ISO de la semana (1 lunes a 7 domingo). Lo usan Hoy y la fecha sugerida de la próxima sesión.
// Tócalo cuando: cambie cómo se cuentan días, semanas o meses.
// No lo toques para: reglas de sesiones (servicio.ts).
// Depende de: Intl (sin dependencias).
// ─────────────────────────────────────────────────────────────────────────────

/** AAAA-MM-DD del instante en esa zona. */
export function fechaLocal(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function desfaseMs(d: Date, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  const comoUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return comoUtc - Math.floor(d.getTime() / 1000) * 1000;
}

/** El instante en que empieza ese día en esa zona. */
export function inicioDelDia(fecha: string, tz: string): Date {
  const [y, m, d] = fecha.split('-').map(Number) as [number, number, number];
  const base = Date.UTC(y, m - 1, d);
  let t = base - desfaseMs(new Date(base), tz);
  const otro = desfaseMs(new Date(t), tz);
  if (base - otro !== t) t = base - otro;
  return new Date(t);
}

export function sumarDias(fecha: string, n: number): string {
  const [y, m, d] = fecha.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 1 lunes a 7 domingo. */
export function diaIso(fecha: string): number {
  const w = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return w === 0 ? 7 : w;
}

export function lunesDe(fecha: string): string {
  return sumarDias(fecha, 1 - diaIso(fecha));
}
