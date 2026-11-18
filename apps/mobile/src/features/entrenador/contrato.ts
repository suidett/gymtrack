// ─────────────────────────────────────────────────────────────────────────────
// Contrato de las pantallas del entrenador · Zona: Entrenador (app)
//
// Qué hace: los esquemas Zod con que la app lee y escribe las rutas del entrenador de §API:
// clientes (GET /trainer/clients y /trainer/clients/:id, DELETE /trainer/clients/:id), código
// de invitación (POST /trainer/invitations), alertas (GET /trainer/alerts y PATCH /alerts/:id),
// sugerencias (GET /clients/:id/suggestions y PATCH /suggestions/:id), consejos (POST
// /observations) y volumen por semana del cliente (GET /me/progress/volume?client_id=, P-02).
// Son tolerantes a propósito: todo campo que no sea el id trae un valor por defecto, así una
// respuesta con menos datos se ve incompleta pero no rompe la pantalla.
// Tócalo cuando: packages/shared/src/api (entrenador.ts, alertas.ts, progreso.ts) publique los
// esquemas definitivos. Entonces estos se reemplazan por los de shared y se borra lo repetido.
// No lo toques para: cálculos de la pantalla (logica.ts) ni llamadas (api.ts).
// Depende de: zod (el mismo que usa @gymtrack/shared).
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// ── Piezas comunes ───────────────────────────────────────────────────────────
const texto = z.string().catch('');
const textoNulo = z.string().nullish().catch(null).transform((v) => v ?? null);
const numero = z.number().catch(0);
const numeroNulo = z.number().nullish().catch(null).transform((v) => v ?? null);
const booleano = z.boolean().catch(false);
/** Lista que nunca falla: si no es una lista queda vacía, y el elemento que no se lee se salta. */
const lista = <T extends z.ZodType>(item: T) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((xs) =>
      xs.flatMap((x) => {
        const r = item.safeParse(x);
        return r.success ? [r.data as z.output<T>] : [];
      }),
    );

type Obj = Record<string, unknown>;
const esObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
/**
 * Lleva la forma real de la API (packages/shared/src/api: entrenador.ts, alertas.ts y progreso.ts)
 * a la que leen las pantallas. Lo que ya viene con el nombre de la app se respeta; lo demás se
 * deriva de los campos de la API. Lo que no se puede derivar queda en su valor por defecto.
 */
const adaptar = <T extends z.ZodType>(f: (o: Obj) => Obj, esquema: T) => z.preprocess((v) => (esObj(v) ? { ...v, ...f(v) } : v), esquema);
/** El primero que no sea undefined ni null. */
const primero = (...vs: unknown[]) => vs.find((v) => v !== undefined && v !== null);
const obj = (v: unknown): Obj => (esObj(v) ? v : {});

/** Las rutas que la app llama. Van con el prefijo /v1 como el resto de §API. */
export const RUTAS = {
  clientes: '/v1/trainer/clients',
  cliente: (id: string) => `/v1/trainer/clients/${encodeURIComponent(id)}`,
  invitaciones: '/v1/trainer/invitations',
  alertas: '/v1/trainer/alerts',
  alerta: (id: string) => `/v1/alerts/${encodeURIComponent(id)}`,
  sugerencias: (clienteId: string) => `/v1/clients/${encodeURIComponent(clienteId)}/suggestions`,
  sugerencia: (id: string) => `/v1/suggestions/${encodeURIComponent(id)}`,
  observaciones: '/v1/observations',
  volumen: '/v1/me/progress/volume',
  me: '/v1/me',
  exportar: '/v1/me/export',
} as const;

// ── Clientes (GET /trainer/clients) ──────────────────────────────────────────
/** Tipo de alerta tal como lo guarda la API (§Datos, alerts.tipo). */
export const TIPOS_ALERTA = ['estancamiento', 'baja_rendimiento', 'sin_sesiones', 'dolor'] as const;
export type TipoAlerta = (typeof TIPOS_ALERTA)[number];
const tipoAlerta = z.enum(TIPOS_ALERTA).catch('estancamiento');

/** Sesiones de esta semana según la rutina activa: hechas, perdidas y planificadas en total. */
const esquemaSemana = z
  .object({ hechas: numero, perdidas: numero, planificadas: numero })
  .nullish()
  .catch(null)
  .transform((v) => v ?? null);

/** La alerta abierta más importante del cliente, para el texto de su fila. */
const esquemaAlertaCorta = z
  .object({
    tipo: tipoAlerta,
    estado: z.enum(['nueva', 'vista', 'resuelta']).catch('nueva'),
    ejercicio: textoNulo,
    detalle: z.record(z.string(), z.unknown()).catch({}),
  })
  .nullish()
  .catch(null)
  .transform((v) => v ?? null);

/** esquemaClienteLista de la API: rutina, adherencia_semana { hechas, planificadas, pct } y ultima_sesion. */
const desdeClienteApi = (o: Obj): Obj => {
  const rutina = esObj(o.rutina) ? o.rutina : null;
  const adh = esObj(o.adherencia_semana) ? o.adherencia_semana : null;
  const ultima = esObj(o.ultima_sesion) ? o.ultima_sesion : null;
  return {
    rutina_activa: primero(o.rutina_activa, rutina ? { id: rutina.id, nombre: rutina.nombre, dias_semana: rutina.dias_por_semana } : null),
    adherencia_semana_pct: primero(o.adherencia_semana_pct, adh?.pct),
    semana: primero(o.semana, adh ? { hechas: adh.hechas, perdidas: 0, planificadas: adh.planificadas } : null),
    ultima_sesion_at: primero(o.ultima_sesion_at, ultima?.cerrada_at, ultima?.iniciada_at),
    ultima_sesion_nombre: primero(o.ultima_sesion_nombre, ultima?.dia_nombre),
  };
};

const esquemaClienteListaApp = z.object({
  id: z.string(),
  nombre: texto,
  apellido: texto,
  vinculado_at: textoNulo,
  /** Rutina activa (nombre y cuántos días por semana); null si no tiene. */
  rutina_activa: z
    .object({ id: z.string().catch(''), nombre: texto, dias_semana: numeroNulo })
    .nullish()
    .catch(null)
    .transform((v) => v ?? null),
  sin_rutina: booleano,
  entrena_hoy: booleano,
  /** Nombre del día que le toca hoy («Pierna A»), si entrena hoy. */
  dia_hoy: textoNulo,
  ultima_sesion_at: textoNulo,
  ultima_sesion_nombre: textoNulo,
  adherencia_semana_pct: numeroNulo,
  semana: esquemaSemana,
  alertas_abiertas: numero,
  alerta_principal: esquemaAlertaCorta,
});
export const esquemaClienteLista = adaptar(desdeClienteApi, esquemaClienteListaApp);
export type ClienteLista = z.infer<typeof esquemaClienteListaApp>;

/** Página de clientes. Además de { items, next_cursor } acepta la adherencia de la semana pasada, si la API la manda. */
export const esquemaPaginaClientes = z.object({
  items: lista(esquemaClienteLista),
  next_cursor: z.string().nullish().catch(null).transform((v) => v ?? null),
  adherencia_semana_pasada_pct: numeroNulo,
});

// ── Invitación (POST y GET /trainer/invitations) ─────────────────────────────
// Misma forma que esquemaInvitacion de packages/shared/src/api/perfil.ts, con estado y vigente
// opcionales para poder guardarla en el teléfono solo con código y vencimiento.
const esquemaInvitacionPlana = z.object({
  codigo: z.string(),
  vence_at: z.string(),
  /** invitado mientras nadie lo usa; activo si ya se usó; terminado si se pidió otro. */
  estado: z.enum(['invitado', 'activo', 'terminado']).optional().catch(undefined),
  /** false si ya venció, se usó o se pidió otro. */
  vigente: z.boolean().optional().catch(undefined),
});
/** POST: acepta { codigo, vence_at, ... } o { invitacion: {...} }. */
export const esquemaInvitacion = z
  .union([esquemaInvitacionPlana, z.object({ invitacion: esquemaInvitacionPlana })])
  .transform((v) => ('invitacion' in v ? v.invitacion : v));
/** GET: el último código que pidió el entrenador, o null si nunca pidió uno. */
export const esquemaInvitacionActual = z.object({ invitacion: esquemaInvitacionPlana.nullable() });
export type Invitacion = z.infer<typeof esquemaInvitacionPlana>;

// ── Alertas (GET /trainer/alerts) ────────────────────────────────────────────
export const ESTADOS_ALERTA = ['nueva', 'vista', 'resuelta'] as const;
export type EstadoAlerta = (typeof ESTADOS_ALERTA)[number];

/** esquemaAlerta de la API: client, exercise, reporte (motivos del alumno), pide_motivos y acciones. */
const desdeAlertaApi = (o: Obj): Obj => {
  const reporte = esObj(o.reporte) ? o.reporte : null;
  return {
    cliente: primero(o.cliente, o.client),
    ejercicio: primero(o.ejercicio, o.exercise),
    motivos: primero(
      o.motivos,
      reporte
        ? { lista: reporte.motivos, comentario: reporte.comentario, respondido_at: reporte.created_at, consejos_mostrados: reporte.consejos_mostrados }
        : null,
    ),
    motivos_pedidos_at: primero(o.motivos_pedidos_at, o.pide_motivos === true ? o.created_at : null),
  };
};

const esquemaAlertaApp = z.object({
  id: z.string(),
  tipo: tipoAlerta,
  estado: z.enum(ESTADOS_ALERTA).catch('nueva'),
  created_at: texto,
  resuelta_at: textoNulo,
  cliente: z
    .object({ id: z.string().catch(''), nombre: texto, apellido: texto })
    .catch({ id: '', nombre: '', apellido: '' }),
  /** El ejercicio, la sesión o la rutina sobre la que es («Press de banca»). */
  ejercicio: z
    .object({ id: z.string().catch(''), nombre: texto })
    .nullish()
    .catch(null)
    .transform((v) => v ?? null),
  /**
   * El dato que la disparó (§Datos, alerts.detalle jsonb). Por tipo:
   * estancamiento: serie [{ fecha, e1rm }], mejor_e1rm, mejor_fecha.
   * baja_rendimiento: medida ('volumen' | 'e1rm'), valor, promedio, fecha, sesion_nombre.
   * sin_sesiones: dias, ultima_sesion_at, dias_entrenados (fechas de los últimos 14 días), rutina_nombre.
   * dolor: intensidad, zona, texto, serie_n, series_total.
   */
  detalle: z.record(z.string(), z.unknown()).catch({}),
  /** Motivos que mandó el cliente (solo en baja_rendimiento; pantalla 20). */
  motivos: z
    .object({
      lista: lista(z.string()),
      comentario: textoNulo,
      respondido_at: textoNulo,
      consejos_mostrados: numero,
    })
    .nullish()
    .catch(null)
    .transform((v) => v ?? null),
  motivos_pedidos_at: textoNulo,
  /** Qué hizo el entrenador al resolverla («Ajusté sus cargas»). */
  nota: textoNulo,
  /** Lo que marcó en la hoja Resolver (ACCIONES_RESOLUCION de la API: cargas, consejo, rutina, nada). */
  acciones: lista(z.string()),
});
export const esquemaAlerta = adaptar(desdeAlertaApi, esquemaAlertaApp);
export type Alerta = z.infer<typeof esquemaAlertaApp>;

export const esquemaPaginaAlertas = z.object({
  items: lista(esquemaAlerta),
  next_cursor: z.string().nullish().catch(null).transform((v) => v ?? null),
});

// ── Ficha (GET /trainer/clients/:id) ─────────────────────────────────────────
/** esquemaFichaObservacion de la API: autor, exercise y respondida (sin el texto de la respuesta). */
const desdeObservacionApi = (o: Obj): Obj => ({
  autor_id: primero(o.autor_id, obj(o.autor).id),
  ejercicio: primero(o.ejercicio, o.exercise),
});

const esquemaObservacionApp = z.object({
  id: z.string().catch(''),
  tipo: z.enum(['observacion', 'dolor', 'consejo']).catch('observacion'),
  texto: texto,
  created_at: texto,
  autor_id: textoNulo,
  ejercicio: z
    .object({ id: z.string().catch(''), nombre: texto })
    .nullish()
    .catch(null)
    .transform((v) => v ?? null),
  session_id: textoNulo,
  sesion_nombre: textoNulo,
  routine_id: textoNulo,
  dolor_zona: textoNulo,
  dolor_intensidad: numeroNulo,
  /** El consejo con que respondió el entrenador, si lo hay. */
  respuesta: z
    .object({ texto: texto, created_at: texto })
    .nullish()
    .catch(null)
    .transform((v) => v ?? null),
  /** true si ya le escribiste un consejo después (la API no manda el texto de la respuesta). */
  respondida: booleano,
});
export const esquemaObservacion = adaptar(desdeObservacionApi, esquemaObservacionApp);
export type Observacion = z.infer<typeof esquemaObservacionApp>;

const esquemaSesionCorta = z.object({
  id: z.string().catch(''),
  nombre: texto,
  cerrada_at: texto,
  duracion_s: numero,
  volumen_kg: numero,
  records: lista(z.string()),
  dolores: numero,
});
export type SesionCorta = z.infer<typeof esquemaSesionCorta>;

/** Estado de cada día de esta semana, de lunes a domingo. */
export const ESTADOS_DIA = ['hecho', 'toca', 'plan', 'descanso', 'perdido'] as const;
export type EstadoDia = (typeof ESTADOS_DIA)[number];

/**
 * esquemaFichaCliente de la API: mes { sesiones, prs }, rutina_activa con dias, ultimas_sesiones
 * con dia_nombre y medidas { ultima, registros, tendencia }. La adherencia de 4 semanas no viene
 * (la API da la de esta semana): queda en null y la pantalla muestra «–».
 */
const DIAS_ISO = [1, 2, 3, 4, 5, 6, 7];
const desdeFichaApi = (o: Obj): Obj => {
  const mes = obj(o.mes);
  const rutina = esObj(o.rutina_activa) ? o.rutina_activa : null;
  const medidas = obj(o.medidas);
  const ultima = esObj(medidas.ultima) ? medidas.ultima : null;
  const tendencia = obj(medidas.tendencia);
  const tendPeso = obj(tendencia.peso_kg);
  const diasRutina = Array.isArray(rutina?.dias) ? (rutina.dias as unknown[]).map(obj) : [];
  return {
    sesiones_mes: primero(o.sesiones_mes, mes.sesiones),
    records_mes: primero(o.records_mes, mes.prs),
    rutina_activa: rutina
      ? {
          ...rutina,
          semana_dias: primero(
            rutina.semana_dias,
            diasRutina.some((d) => typeof d.dia_semana === 'number')
              ? DIAS_ISO.map((n) => (diasRutina.some((d) => d.dia_semana === n) ? 'plan' : 'descanso'))
              : [],
          ),
        }
      : null,
    ultimas_sesiones: Array.isArray(o.ultimas_sesiones)
      ? o.ultimas_sesiones.map(obj).map((x) => ({ ...x, nombre: primero(x.nombre, x.dia_nombre), cerrada_at: primero(x.cerrada_at, x.iniciada_at) }))
      : o.ultimas_sesiones,
    peso: primero(
      o.peso,
      ultima && typeof ultima.peso_kg === 'number'
        ? {
            actual_kg: ultima.peso_kg,
            fecha: ultima.fecha,
            serie: [],
            desde_inicio_kg: null,
            ultimos_30_dias_kg: typeof tendPeso.cambio === 'number' ? tendPeso.cambio : null,
            de_la_encuesta: medidas.registros === 1,
          }
        : null,
    ),
    medidas: esObj(o.medidas) && 'ultima' in o.medidas ? ultima : o.medidas,
  };
};

const esquemaFichaApp = z.object({
  cliente: z.object({
    id: z.string(),
    nombre: texto,
    apellido: texto,
    vinculado_at: textoNulo,
    edad: numeroNulo,
  }),
  adherencia_4_semanas_pct: numeroNulo,
  sesiones_mes: numero,
  records_mes: numero,
  rutina_activa: z
    .object({
      id: z.string().catch(''),
      nombre: texto,
      metodo_progresion: texto,
      semana_actual: numeroNulo,
      semanas: numeroNulo,
      semana_dias: lista(z.enum(ESTADOS_DIA).catch('descanso')),
      hoy: z
        .object({ nombre: texto, ejercicios: numero, ultima_vez_at: textoNulo })
        .nullish()
        .catch(null)
        .transform((v) => v ?? null),
    })
    .nullish()
    .catch(null)
    .transform((v) => v ?? null),
  ultimas_sesiones: lista(esquemaSesionCorta),
  encuesta: z
    .object({
      completada_at: texto,
      version: numero,
      respuestas: z.record(z.string(), z.unknown()).catch({}),
    })
    .nullish()
    .catch(null)
    .transform((v) => v ?? null),
  peso: z
    .object({
      actual_kg: z.number(),
      fecha: texto,
      serie: lista(z.number()),
      desde_inicio_kg: numeroNulo,
      ultimos_30_dias_kg: numeroNulo,
      de_la_encuesta: booleano,
    })
    .nullish()
    .catch(null)
    .transform((v) => v ?? null),
  medidas: z
    .object({
      fecha: texto,
      cintura_cm: numeroNulo,
      cadera_cm: numeroNulo,
      pecho_cm: numeroNulo,
      brazo_cm: numeroNulo,
      muslo_cm: numeroNulo,
    })
    .nullish()
    .catch(null)
    .transform((v) => v ?? null),
  fotos: numero,
  observaciones: lista(esquemaObservacion),
  alertas: lista(esquemaAlerta),
});
export const esquemaFicha = adaptar(desdeFichaApi, esquemaFichaApp);
export type Ficha = z.infer<typeof esquemaFichaApp>;

// ── Volumen por semana (GET /me/progress/volume?client_id=) ──────────────────
const esquemaSemanaVolumen = z.preprocess(
  // La API manda { inicio, fin, volumen_kg, sesiones, variacion_pct, en_curso } (esquemaSemanaVolumen de shared).
  (v) => (esObj(v) ? { ...v, semana_inicio: primero(v.semana_inicio, v.inicio) } : v),
  z.object({ semana_inicio: texto, volumen_kg: numero, en_curso: booleano, variacion_pct: numeroNulo }),
);
/** Acepta { semanas: [...] } o { items: [...] }. */
export const esquemaVolumen = z
  .object({
    semanas: lista(esquemaSemanaVolumen).optional(),
    items: lista(esquemaSemanaVolumen).optional(),
    variacion_pct: numeroNulo,
  })
  .transform((v) => {
    const semanas = v.semanas ?? v.items ?? [];
    // Sin variación general, la de la última semana completa frente a la anterior.
    const ultimaCompleta = [...semanas].reverse().find((x) => !x.en_curso);
    return { semanas, variacion_pct: v.variacion_pct ?? ultimaCompleta?.variacion_pct ?? null };
  });
export type Volumen = z.infer<typeof esquemaVolumen>;

// ── Sugerencias (GET /clients/:id/suggestions) ───────────────────────────────
const esquemaValores = z.object({
  peso_kg: z.number(),
  reps_min: z.number().int(),
  reps_max: z.number().int(),
  rir: numeroNulo,
});
export type ValoresCarga = z.infer<typeof esquemaValores>;

/** esquemaSugerencia de la API (progreso.ts): valor_final con nota y ultimo_rendimiento con sus series. */
const desdeSugerenciaApi = (o: Obj): Obj => {
  const ult = esObj(o.ultimo_rendimiento) ? o.ultimo_rendimiento : null;
  const series = Array.isArray(ult?.series) ? (ult.series as unknown[]).map(obj) : [];
  const pesos = series.map((x) => x.peso_kg).filter((x): x is number => typeof x === 'number');
  return {
    nota: primero(o.nota, obj(o.valor_final).nota),
    ultima: primero(
      o.ultima,
      ult && series.length
        ? { fecha: ult.fecha, peso_kg: Math.max(...pesos, 0), reps: series.map((x) => x.reps), rir: series[series.length - 1]?.rir ?? null }
        : null,
    ),
  };
};

const esquemaSugerenciaApp = z.object({
  id: z.string(),
  routine_exercise_id: texto,
  nombre: texto,
  estado: z.enum(['pendiente', 'aplicada', 'sobrescrita']).catch('pendiente'),
  metodo: texto,
  series: numero,
  rir_objetivo: numeroNulo,
  incremento_kg: z.number().catch(2.5),
  sugerencia: esquemaValores,
  valor_final: esquemaValores.nullish().catch(null).transform((v) => v ?? null),
  /** El «por qué» de la sugerencia (§Riesgos: siempre trae su motivo). */
  texto: texto,
  motivo: textoNulo,
  nota: textoNulo,
  ultima: z
    .object({ fecha: texto, peso_kg: numero, reps: lista(z.number()), rir: numeroNulo })
    .nullish()
    .catch(null)
    .transform((v) => v ?? null),
  alerta: textoNulo,
});
export const esquemaSugerencia = adaptar(desdeSugerenciaApi, esquemaSugerenciaApp);
export type Sugerencia = z.infer<typeof esquemaSugerenciaApp>;

/** Acepta { items, proxima_sesion } o una lista suelta. */
export const esquemaSugerencias = z
  .union([
    z.array(esquemaSugerencia),
    z.object({
      items: lista(esquemaSugerencia),
      proxima_sesion: z
        .object({
          nombre: texto,
          fecha_sugerida: textoNulo,
          semana_actual: numeroNulo,
          semanas: numeroNulo,
          rutina_nombre: textoNulo,
          metodo_progresion: textoNulo,
          base_fecha: textoNulo,
        })
        .nullish()
        .catch(null)
        .transform((v) => v ?? null),
    }),
  ])
  .transform((v) => (Array.isArray(v) ? { items: v, proxima_sesion: null } : v));
export type RespuestaSugerencias = z.infer<typeof esquemaSugerencias>;
