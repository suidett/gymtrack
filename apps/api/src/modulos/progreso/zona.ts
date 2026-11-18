// ─────────────────────────────────────────────────────────────────────────────
// Días y semanas en la zona del alumno · Zona: Progreso (API)
//
// Qué hace: pasa un instante (UTC) al día local de una zona horaria IANA y de vuelta, sin
// librerías: con Intl. Lo usan el volumen por semana (lunes a domingo en la zona del alumno,
// INT-117), el día de una medida (INT-121), «entrena hoy» y la adherencia del panel del
// entrenador, y la alerta «sin sesiones» del worker (WRK-003, WRK-012: cambio de horario).
// Los días van como texto AAAA-MM-DD, que se ordena igual que la fecha.
// Tócalo cuando: haga falta otra cuenta de calendario (inicio de mes, semana ISO).
// No lo toques para: reglas de negocio (van en el módulo que las usa).
// Depende de: Intl (Node trae los datos de zonas).
// ─────────────────────────────────────────────────────────────────────────────

const DIA_MS = 86_400_000;
const formatos = new Map<string, Intl.DateTimeFormat>();

function formato(zona: string): Intl.DateTimeFormat {
  let f = formatos.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    formatos.set(zona, f);
  }
  return f;
}

/** Las partes de la hora local de `instante` en `zona`. Una zona inválida cae a UTC. */
function partes(instante: Date, zona: string) {
  let f: Intl.DateTimeFormat;
  try {
    f = formato(zona);
  } catch {
    f = formato('UTC');
  }
  const p: Record<string, number> = {};
  for (const x of f.formatToParts(instante)) if (x.type !== 'literal') p[x.type] = Number(x.value);
  return { anio: p.year!, mes: p.month!, dia: p.day!, hora: p.hour!, minuto: p.minute!, segundo: p.second! };
}

const dos = (n: number) => String(n).padStart(2, '0');

/** El día local («2026-11-17») de un instante en esa zona. */
export function diaLocal(instante: Date, zona: string): string {
  const p = partes(instante, zona);
  return `${p.anio}-${dos(p.mes)}-${dos(p.dia)}`;
}

/** Minutos que la zona va adelantada a UTC en ese instante (Santiago en verano: -180). */
function desfaseMin(instante: Date, zona: string): number {
  const p = partes(instante, zona);
  const comoUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  return Math.round((comoUtc - Math.floor(instante.getTime() / 1000) * 1000) / 60_000);
}

/** El instante UTC en que empieza ese día local (medianoche local, con cambio de horario). */
export function inicioDelDia(dia: string, zona: string): Date {
  const [a, m, d] = dia.split('-').map(Number) as [number, number, number];
  const ingenuo = Date.UTC(a, m - 1, d);
  let t = ingenuo - desfaseMin(new Date(ingenuo), zona) * 60_000;
  // Si entre el primer cálculo y el instante hay un cambio de horario, se corrige una vez.
  t = ingenuo - desfaseMin(new Date(t), zona) * 60_000;
  return new Date(t);
}

/** Suma días a un día local («2026-11-17» + 1 = «2026-11-18»). */
export function sumarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d) + n * DIA_MS).toISOString().slice(0, 10);
}

/** Día de la semana ISO: 1 lunes a 7 domingo. */
export function diaSemanaIso(dia: string): number {
  const [a, m, d] = dia.split('-').map(Number) as [number, number, number];
  const js = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return js === 0 ? 7 : js;
}

/** El lunes de la semana de ese día. */
export function lunesDe(dia: string): string {
  return sumarDias(dia, 1 - diaSemanaIso(dia));
}

/** El primer día del mes de ese día. */
export function primeroDelMes(dia: string): string {
  return `${dia.slice(0, 8)}01`;
}

/** Un `@db.Date` de Prisma (medianoche UTC) como día AAAA-MM-DD. */
export function diaDeFechaDb(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Un día AAAA-MM-DD como valor para una columna `@db.Date`. */
export function fechaDbDeDia(dia: string): Date {
  return new Date(`${dia}T00:00:00.000Z`);
}

/** Días enteros entre dos días locales (b - a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((fechaDbDeDia(b).getTime() - fechaDbDeDia(a).getTime()) / DIA_MS);
}
