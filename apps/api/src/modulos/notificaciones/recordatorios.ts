// ─────────────────────────────────────────────────────────────────────────────
// Recordatorio para entrenar · Zona: Notificaciones (API)
//
// Qué hace: lo que corre el worker cada 5 minutos: a cada alumno con el recordatorio encendido
// (Perfil, recordatorio_activo) y rutina activa le manda un push 30 minutos antes de su hora
// habitual (P-21, WRK-006):
//   - la hora habitual es la que fijó en Perfil (recordatorio_hora); si no fijó, la mediana de la
//     hora de inicio de sus últimas 10 sesiones cerradas; sin sesiones, no hay recordatorio;
//   - no llega si hoy ya cerró una sesión o tiene una en curso, ni en un día de descanso (rutina
//     con días fijos y hoy no es uno, P-22);
//   - todo en la zona del alumno, con cambio de horario (WRK-012);
//   - sale una vez al día (la clave recordatorio:<alumno>:<día>) y cuenta para el tope de 2.
// Cada corrida mira la ventana (ahora - intervalo, ahora]: si el cron corre cada 5 minutos, cada
// hora objetivo cae en una sola corrida.
// Tócalo cuando: cambie la regla de la hora habitual o cuándo no se recuerda.
// No lo toques para: el texto (./textos.ts) ni cómo sale (./servicio.ts).
// Depende de: la base, ../progreso/zona, ./textos y ./servicio.
// ─────────────────────────────────────────────────────────────────────────────
import { MINUTOS_ANTES_RECORDATORIO } from '@gymtrack/shared';
import type { BaseDeDatos } from '../../db';
import { diaLocal, diaSemanaIso, inicioDelDia, sumarDias } from '../progreso/zona';
import type { ServicioAvisos } from './servicio';
import { avisoRecordatorio } from './textos';

export const INTERVALO_RECORDATORIOS_MIN = 5;
const MIN_MS = 60_000;

// ── Reglas puras ─────────────────────────────────────────────────────────────
const formatos = new Map<string, Intl.DateTimeFormat>();
function partesLocales(instante: Date, zona: string) {
  let f = formatos.get(zona);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat('en-US', { timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      f = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    formatos.set(zona, f);
  }
  const p: Record<string, number> = {};
  for (const x of f.formatToParts(instante)) if (x.type !== 'literal') p[x.type] = Number(x.value);
  return { anio: p.year!, mes: p.month!, dia: p.day!, hora: p.hour!, minuto: p.minute! };
}

/** Minutos desde la medianoche local de `instante` en `zona` (19:05 → 1145). */
export function minutosLocales(instante: Date, zona: string): number {
  const p = partesLocales(instante, zona);
  return p.hora * 60 + p.minuto;
}

/** «19:00» → 1140, o null si no es HH:MM. */
export function leerHora(hora: string | null | undefined): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export const formatearHora = (minutos: number) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

/** La mediana de las horas de inicio (en minutos locales); con dos al medio, el promedio redondeado. Sin datos, null. */
export function horaHabitual(minutos: readonly number[]): number | null {
  if (minutos.length === 0) return null;
  const o = [...minutos].sort((a, b) => a - b);
  const medio = Math.floor(o.length / 2);
  return o.length % 2 ? o[medio]! : Math.round((o[medio - 1]! + o[medio]!) / 2);
}

/** El instante UTC de la hora local `minutos` del día `dia` en `zona`, con cambio de horario. */
export function instanteLocal(dia: string, minutos: number, zona: string): Date {
  const [a, m, d] = dia.split('-').map(Number) as [number, number, number];
  const ingenuo = Date.UTC(a, m - 1, d, Math.floor(minutos / 60), minutos % 60);
  const desfase = (t: number) => {
    const p = partesLocales(new Date(t), zona);
    return Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto) - Math.floor(t / MIN_MS) * MIN_MS;
  };
  let t = ingenuo - desfase(ingenuo);
  t = ingenuo - desfase(t);
  return new Date(t);
}

/** true si `objetivo` cae en (ahora - intervalo, ahora]. */
export function enVentana(objetivo: Date, ahora: Date, intervaloMin: number): boolean {
  return objetivo.getTime() > ahora.getTime() - intervaloMin * MIN_MS && objetivo.getTime() <= ahora.getTime();
}

// ── Con base ─────────────────────────────────────────────────────────────────
export interface ResultadoRecordatorios {
  revisados: number;
  enviados: number;
  /** Ya entrenó hoy, es día de descanso o no tiene hora habitual. */
  sin_recordatorio: number;
  omitidos_por_tope: number;
}

/** La hora habitual del alumno: la de Perfil o la mediana de sus últimas 10 sesiones (P-21). */
export async function horaDelAlumno(prisma: BaseDeDatos, alumnoId: string, fijada: string | null, zona: string): Promise<number | null> {
  const propia = leerHora(fijada);
  if (propia !== null) return propia;
  const sesiones = await prisma.sesionEntreno.findMany({
    where: { alumnoId, estado: 'cerrada' }, orderBy: { cerradaAt: 'desc' }, take: 10, select: { iniciadaAt: true },
  });
  return horaHabitual(sesiones.map((s) => minutosLocales(s.iniciadaAt, zona)));
}

export async function mandarRecordatorios(
  prisma: BaseDeDatos,
  avisos: ServicioAvisos,
  ahora: Date,
  intervaloMin = INTERVALO_RECORDATORIOS_MIN,
): Promise<ResultadoRecordatorios> {
  const r: ResultadoRecordatorios = { revisados: 0, enviados: 0, sin_recordatorio: 0, omitidos_por_tope: 0 };
  const perfiles = await prisma.perfilAlumno.findMany({
    where: { recordatorioActivo: true, rutinaActivaId: { not: null }, usuario: { deletedAt: null, rol: 'client' } },
    include: {
      usuario: true,
      rutinaActiva: { include: { dias: { where: { deletedAt: null }, orderBy: [{ orden: 'asc' }, { id: 'asc' }] } } },
    },
  });
  for (const p of perfiles) {
    const rutina = p.rutinaActiva;
    if (!rutina || rutina.estado !== 'activa' || rutina.deletedAt || rutina.dias.length === 0) continue;
    r.revisados += 1;
    const zona = p.usuario.timezone || 'America/Santiago';
    const hora = await horaDelAlumno(prisma, p.usuarioId, p.recordatorioHora, zona);
    if (hora === null) {
      r.sin_recordatorio += 1;
      continue;
    }
    // El día en que se entrena: hoy o, si la hora habitual es antes de las 00:30, mañana (su
    // recordatorio cae hoy antes de medianoche).
    const hoy = diaLocal(ahora, zona);
    const diaEntreno = [hoy, sumarDias(hoy, 1)].find((d) =>
      enVentana(new Date(instanteLocal(d, hora, zona).getTime() - MINUTOS_ANTES_RECORDATORIO * MIN_MS), ahora, intervaloMin));
    if (!diaEntreno) continue;

    // ¿Ya entrenó ese día o tiene una en curso? (P-21)
    const desde = inicioDelDia(diaEntreno, zona);
    const yaEntreno = await prisma.sesionEntreno.count({
      where: { alumnoId: p.usuarioId, OR: [{ estado: 'en_curso' }, { estado: 'cerrada', cerradaAt: { gte: desde } }] },
    });
    // Día que toca: con días fijos, el de hoy (si no hay, descansa); sin días fijos, el que sigue al último.
    const conFijos = rutina.dias.some((d) => d.diaSemana !== null);
    let nombreDia: string | null = null;
    if (conFijos) {
      nombreDia = rutina.dias.find((d) => d.diaSemana === diaSemanaIso(diaEntreno))?.nombre ?? null;
    } else {
      const ultima = await prisma.sesionEntreno.findFirst({
        where: { alumnoId: p.usuarioId, rutinaId: rutina.id, estado: 'cerrada', diaRutinaId: { not: null } },
        orderBy: { cerradaAt: 'desc' }, select: { diaRutinaId: true },
      });
      const i = rutina.dias.findIndex((d) => d.id === ultima?.diaRutinaId);
      nombreDia = rutina.dias[(i + 1) % rutina.dias.length]!.nombre;
    }
    if (yaEntreno > 0 || (conFijos && !nombreDia)) {
      r.sin_recordatorio += 1;
      continue;
    }
    const res = await avisos.enviar({
      tipo: 'recordatorio',
      clave: `recordatorio:${p.usuarioId}:${diaEntreno}`,
      para: p.usuario,
      push: avisoRecordatorio({ hora: formatearHora(hora), dia: nombreDia }),
      correo: null,
      cuentaTope: true,
    });
    if (res.push.enviados > 0) r.enviados += 1;
    if (res.push.omitido === 'tope') r.omitidos_por_tope += 1;
  }
  return r;
}
