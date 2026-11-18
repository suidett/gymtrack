// ─────────────────────────────────────────────────────────────────────────────
// Hoy · Zona: Sesiones (API)
//
// Qué hace: arma GET /me/today (pantalla 5): qué día de la rutina toca (día fijo o ciclo, P-22),
// la sugerencia vigente por ejercicio (la sobrescrita por el entrenador manda), la sesión en curso
// para retomar, la semana de lunes a domingo, la racha, las cifras del mes y lo último que dejó el
// entrenador. Todo en la zona horaria del alumno.
// Tócalo cuando: cambie lo que muestra Hoy.
// No lo toques para: iniciar o cerrar sesiones (servicio.ts).
// Depende de: el cliente de Prisma, ./fechas y @gymtrack/shared (HoyApi).
// ─────────────────────────────────────────────────────────────────────────────
import type { HoyApi } from '@gymtrack/shared';
import type { Usuario } from '../../generado/prisma/client';
import { semanaActualDe } from './semana';
import { diaIso, fechaLocal, inicioDelDia, lunesDe, sumarDias } from './fechas';
import type { Db } from './servicio';

export async function armarHoy(db: Db, usuario: Usuario, ahora: Date): Promise<HoyApi> {
  const tz = usuario.timezone || 'America/Santiago';
  const hoy = fechaLocal(ahora, tz);
  const lunes = lunesDe(hoy);
  const inicioMes = `${hoy.slice(0, 7)}-01`;
  const desde = inicioDelDia(sumarDias(hoy, -120) < inicioMes ? sumarDias(hoy, -120) : inicioMes, tz);

  const perfil = await db.perfilAlumno.findUnique({ where: { usuarioId: usuario.id } });
  const vinculo = await db.vinculoEntrenador.findFirst({
    where: { alumnoId: usuario.id, estado: 'activo' }, include: { entrenador: { select: { id: true, nombre: true, apellido: true } } },
  });
  const rutina = perfil?.rutinaActivaId
    ? await db.rutina.findFirst({
      where: { id: perfil.rutinaActivaId, estado: 'activa', deletedAt: null },
      include: {
        dias: {
          where: { deletedAt: null }, orderBy: [{ orden: 'asc' }, { id: 'asc' }],
          include: { ejercicios: { where: { deletedAt: null }, orderBy: [{ orden: 'asc' }, { id: 'asc' }], include: { ejercicio: true } } },
        },
      },
    })
    : null;
  const enCurso = await db.sesionEntreno.findFirst({
    where: { alumnoId: usuario.id, estado: 'en_curso' }, include: { dia: { select: { nombre: true } }, series: { select: { completada: true } } },
  });
  const cerradas = await db.sesionEntreno.findMany({
    where: { alumnoId: usuario.id, estado: 'cerrada', cerradaAt: { gte: desde } },
    select: { id: true, cerradaAt: true, volumenKg: true, rutinaId: true, diaRutinaId: true }, orderBy: { cerradaAt: 'desc' },
  });
  const diasHechos = new Set(cerradas.map((s) => fechaLocal(s.cerradaAt!, tz)));

  // Racha: días seguidos con sesión cerrada; hoy sin sesión no la corta.
  let cursor = diasHechos.has(hoy) ? hoy : sumarDias(hoy, -1);
  let racha = 0;
  while (diasHechos.has(cursor)) { racha += 1; cursor = sumarDias(cursor, -1); }

  // Día que toca: con días fijos, el de hoy (si no hay, descanso); sin días fijos, el siguiente del ciclo.
  const dias = rutina?.dias ?? [];
  const conFijos = dias.some((d) => d.diaSemana !== null);
  let dia = null as (typeof dias)[number] | null;
  if (rutina && dias.length > 0) {
    if (conFijos) dia = dias.find((d) => d.diaSemana === diaIso(hoy)) ?? null;
    else {
      const ultima = await db.sesionEntreno.findFirst({
        where: { alumnoId: usuario.id, estado: 'cerrada', rutinaId: rutina.id }, orderBy: { cerradaAt: 'desc' }, select: { diaRutinaId: true },
      });
      const i = ultima ? dias.findIndex((d) => d.id === ultima.diaRutinaId) : -1;
      dia = dias[(i + 1) % dias.length] ?? null;
    }
  }
  if (enCurso?.diaRutinaId) dia = dias.find((d) => d.id === enCurso.diaRutinaId) ?? dia;

  const ejercicios: NonNullable<HoyApi['dia']>['ejercicios'] = [];
  for (const x of dia?.ejercicios ?? []) {
    const sug = await db.sugerenciaProgresion.findFirst({ where: { alumnoId: usuario.id, ejercicioRutinaId: x.id }, orderBy: { createdAt: 'desc' } });
    const ultima = await db.serie.findFirst({
      where: { alumnoId: usuario.id, ejercicioRutinaId: x.id, completada: true, sesion: { estado: 'cerrada' } },
      orderBy: { sesion: { cerradaAt: 'desc' } }, select: { sesionId: true },
    });
    const pesoUltimo = ultima
      ? (await db.serie.aggregate({ where: { sesionId: ultima.sesionId, ejercicioRutinaId: x.id, completada: true }, _max: { pesoKg: true } }))._max.pesoKg
      : null;
    const base = sug?.sugerencia as { peso_kg?: number; reps_min?: number; reps_max?: number; rir?: number } | undefined;
    const final = (sug?.valorFinal ?? null) as { peso_kg?: number; reps_min?: number; reps_max?: number; rir?: number; nota?: string } | null;
    const v = { ...base, ...(final ?? {}) };
    ejercicios.push({
      routine_exercise_id: x.id, exercise_id: x.ejercicioId, nombre: x.ejercicio.nombre, grupo_muscular: x.ejercicio.grupoMuscular,
      tipo_carga: x.ejercicio.tipoCarga, series: x.series, reps_min: x.repsMin, reps_max: x.repsMax, rir_objetivo: x.rirObjetivo,
      descanso_s: x.descansoS, incremento_kg: x.incrementoKg, peso_inicial_kg: x.pesoInicialKg, nota_entrenador: x.notaEntrenador,
      ultimo_peso_kg: pesoUltimo ?? null,
      sugerencia: sug && typeof v.peso_kg === 'number'
        ? {
          id: sug.id, estado: sug.estado, peso_kg: v.peso_kg, reps_min: v.reps_min ?? x.repsMin, reps_max: v.reps_max ?? x.repsMax,
          rir: v.rir ?? x.rirObjetivo, texto: sug.texto, nota: typeof final?.nota === 'string' ? final.nota : sug.motivo && final ? sug.motivo : null,
        }
        : null,
    });
  }
  const seriesTotal = ejercicios.reduce((a, x) => a + x.series, 0);
  const minutos = Math.round(ejercicios.reduce((a, x) => a + x.series * (40 + x.descanso_s), 0) / 60);

  // Semana de lunes a domingo.
  const fijos = new Set(dias.flatMap((d) => (d.diaSemana ? [d.diaSemana] : [])));
  const planificadas = rutina ? (conFijos ? fijos.size : dias.length) : 0;
  let restantes = Math.max(0, planificadas - [...diasHechos].filter((f) => f >= lunes && f <= sumarDias(lunes, 6)).length);
  const semana: HoyApi['semana'] = [];
  for (let i = 0; i < 7; i++) {
    const f = sumarDias(lunes, i);
    let estado: HoyApi['semana'][number]['estado'] = 'descanso';
    if (diasHechos.has(f)) estado = 'hecho';
    else if (f === hoy && dia) { estado = 'toca'; restantes -= 1; }
    else if (f > hoy && rutina && (conFijos ? fijos.has(diaIso(f)) : restantes > 0)) { estado = 'plan'; if (!conFijos) restantes -= 1; }
    semana.push({ fecha: f, dia_semana: i + 1, estado, es_hoy: f === hoy });
  }

  const inicioMesUtc = inicioDelDia(inicioMes, tz);
  const delMes = cerradas.filter((s) => s.cerradaAt! >= inicioMesUtc);
  const prsMes = await db.recordPersonal.count({ where: { alumnoId: usuario.id, fecha: { gte: inicioMesUtc }, sesion: { estado: 'cerrada' } } });

  let ultimaAccion: HoyApi['ultima_accion_entrenador'] = null;
  if (vinculo) {
    const donde = { alumnoId: usuario.id, autorId: vinculo.entrenadorId };
    const [obs, total] = await Promise.all([
      db.observacion.findFirst({ where: donde, orderBy: { createdAt: 'desc' } }),
      db.observacion.count({ where: donde }),
    ]);
    if (obs) ultimaAccion = { tipo: obs.tipo, texto: obs.texto, created_at: obs.createdAt.toISOString(), total };
  }

  const estado: HoyApi['estado'] = enCurso ? 'en_curso' : !rutina ? (vinculo ? 'espera_entrenador' : 'sin_rutina') : !dia ? 'descanso' : 'normal';
  return {
    fecha: hoy,
    estado,
    racha_dias: racha,
    rutina: rutina
      ? { id: rutina.id, nombre: rutina.nombre, semana: semanaActualDe(rutina, ahora), semanas: rutina.semanas, metodo_progresion: rutina.metodoProgresion, version: rutina.version }
      : null,
    dia: dia ? { id: dia.id, nombre: dia.nombre, dia_semana: dia.diaSemana, series_total: seriesTotal, minutos_estimados: minutos, ejercicios } : null,
    sesion_en_curso: enCurso
      ? { id: enCurso.id, routine_day_id: enCurso.diaRutinaId, nombre_dia: enCurso.dia?.nombre ?? null, iniciada_at: enCurso.iniciadaAt.toISOString(), series_hechas: enCurso.series.filter((x) => x.completada).length }
      : null,
    semana,
    semana_hechas: semana.filter((d) => d.estado === 'hecho').length,
    semana_planificadas: planificadas,
    mes: { sesiones: delMes.length, volumen_kg: Math.round(delMes.reduce((a, s) => a + (s.volumenKg ?? 0), 0) * 10) / 10, prs: prsMes },
    entrenador: vinculo ? vinculo.entrenador : null,
    ultima_accion_entrenador: ultimaAccion,
  };
}
