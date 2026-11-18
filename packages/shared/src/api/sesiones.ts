// ─────────────────────────────────────────────────────────────────────────────
// Contrato de sesiones · Zona: Contrato
//
// Qué hace: los esquemas Zod de entrada y salida de las rutas de Entrenar y sincronizar y su
// catálogo RUTAS_SESIONES, que la API registra en apps/api/src/modulos/sesiones (con esquemaDe y
// urlDe de src/compartido) y que CON-001 revisa. Rutas de §API: GET /me/today, POST /sessions,
// PUT /sessions/:id/sets, POST /sessions/:id/finish y /discard, POST /sync/sessions, GET
// /sessions y /sessions/:id, POST y GET /observations.
// Reglas que se ven en la forma:
//   - Los ids de sesiones y series los genera el celular y son UUID v7 (otro formato da 400).
//   - PUT /sets reemplaza por id las series que mandas y no toca las que no vienen; para quitar
//     una, va su id en `eliminadas`.
//   - Cada elemento de POST /sync/sessions es crear, series y cerrar juntos (CON-015). El lote
//     solo exige el `id`: cada sesión se valida por separado y la inválida vuelve `rechazada`
//     con su motivo sin frenar a las demás (INT-106).
//   - Pesos en kilos (*_kg), fechas ISO 8601 con zona, cuerpos estrictos (CON-012).
// Tócalo cuando: agregues o cambies una ruta de sesiones u observaciones.
// No lo toques para: rutas de otra área (cada una tiene su archivo en esta carpeta).
// Depende de: zod, ./comun, ./ejercicios (esquemaTipoCarga) y ./rutinas (esquemaMetodoProgresion).
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';
import {
  esquemaFechaHora, esquemaPagina, esquemaPaginacion, esquemaParamsId, esquemaUuid, type CatalogoRutas,
} from './comun';
import { esquemaTipoCarga } from './ejercicios';
import { esquemaMetodoProgresion } from './rutinas';

// ── Piezas ───────────────────────────────────────────────────────────────────
/** Id generado en el celular: UUID versión 7 (INT-090). */
export const esquemaIdCelular = z.uuid({ version: 'v7', error: 'El id tiene que ser un UUID v7 generado en el celular.' });

export const ESTADOS_SESION = ['en_curso', 'cerrada', 'descartada'] as const;
export const esquemaEstadoSesion = z.enum(ESTADOS_SESION);
export const TIPOS_OBSERVACION = ['observacion', 'dolor', 'consejo'] as const;
export const esquemaTipoObservacion = z.enum(TIPOS_OBSERVACION, { error: `El tipo va como ${TIPOS_OBSERVACION.join(', ')}.` });

const entero = (min: number, max: number, que: string) =>
  z.number({ error: `${que} tiene que ser un número.` }).int({ error: `${que} tiene que ser entero.` })
    .min(min, { error: `${que} va de ${min} a ${max}.` }).max(max, { error: `${que} va de ${min} a ${max}.` });
const decimal = (min: number, max: number, que: string) =>
  z.number({ error: `${que} tiene que ser un número.` })
    .min(min, { error: `${que} va de ${min} a ${max}.` }).max(max, { error: `${que} va de ${min} a ${max}.` });
const textoLibre = (max: number) => z.string().trim().max(max, { error: `Va hasta ${max} caracteres.` });

/** Dolor de toda la sesión: zona e intensidad de 1 a 10. */
export const esquemaDolorGeneral = z.strictObject({
  zona: z.string().trim().min(1).max(60),
  intensidad: entero(1, 10, 'La intensidad'),
});

// ── Entrada ──────────────────────────────────────────────────────────────────
/** POST /sessions. `routine_version`: la que tenía el celular al iniciar sin señal (SYNC-012). */
export const esquemaSesionNueva = z.strictObject({
  id: esquemaIdCelular,
  routine_day_id: esquemaUuid.nullable(),
  iniciada_at: esquemaFechaHora,
  routine_version: entero(1, 100000, 'La versión').optional(),
  device_id: z.string().trim().min(1).max(100).optional(),
});

/** Una serie tal como la registra el celular. */
export const esquemaSerieEntrada = z.strictObject({
  id: esquemaIdCelular,
  exercise_id: esquemaUuid,
  routine_exercise_id: esquemaUuid.nullable().optional(),
  serie_n: entero(1, 50, 'El número de serie'),
  peso_kg: decimal(0, 1000, 'El peso'),
  /** Repeticiones, o segundos si el ejercicio es de tiempo. */
  reps: entero(0, 3600, 'Las repeticiones'),
  rir: entero(0, 10, 'El RIR').nullable().optional(),
  completada: z.boolean().default(false),
  fallo: z.boolean().default(false),
  tiempo_s: entero(0, 36000, 'El tiempo').nullable().optional(),
  descanso_real_s: entero(0, 36000, 'El descanso').nullable().optional(),
  nota: textoLibre(500).nullable().optional(),
});

/** PUT /sessions/:id/sets. */
export const esquemaSeriesLote = z.strictObject({
  series: z.array(esquemaSerieEntrada).max(300, { error: 'Van hasta 300 series por lote.' }),
  eliminadas: z.array(esquemaUuid).max(300).default([]),
});

/** POST /sessions/:id/finish (contrato de cierre de §API). */
export const esquemaFinSesion = z.strictObject({
  cerrada_at: esquemaFechaHora,
  duracion_s: entero(0, 86400, 'La duración').optional(),
  observacion: textoLibre(1000).nullable().optional(),
  dolor_general: esquemaDolorGeneral.nullable().optional(),
  device_id: z.string().trim().min(1).max(100).optional(),
});

/** Un elemento de POST /sync/sessions: crear, series y cerrar juntos (CON-015). */
export const esquemaSesionSincronizada = z.strictObject({
  ...esquemaSesionNueva.shape,
  series: z.array(esquemaSerieEntrada).max(300),
  cerrada_at: esquemaFechaHora,
  duracion_s: esquemaFinSesion.shape.duracion_s,
  observacion: esquemaFinSesion.shape.observacion,
  dolor_general: esquemaFinSesion.shape.dolor_general,
});

/** POST /sync/sessions: el lote solo exige el id; cada sesión se valida aparte (INT-106). */
export const esquemaLoteSincronizacion = z.strictObject({
  sesiones: z.array(z.looseObject({ id: esquemaUuid }), { error: 'Las sesiones van en una lista.' })
    .min(1, { error: 'Manda al menos una sesión.' }).max(20, { error: 'Van hasta 20 sesiones por lote.' }),
});

export const esquemaQuerySesiones = esquemaPaginacion.extend({ client_id: esquemaUuid.optional() });

/** POST /observations. Al menos un destino. `id` opcional para reintentos sin señal. */
export const esquemaObservacionNueva = z
  .strictObject({
    id: esquemaUuid.optional(),
    tipo: esquemaTipoObservacion.default('observacion'),
    texto: z.string().trim().min(1, { error: 'Escribe la observación.' }).max(1000),
    exercise_id: esquemaUuid.nullable().optional(),
    session_id: esquemaUuid.nullable().optional(),
    set_id: esquemaUuid.nullable().optional(),
    routine_id: esquemaUuid.nullable().optional(),
    /** De quién es el dato: solo el entrenador lo manda, si no hay sesión o serie de donde sacarlo. */
    client_id: esquemaUuid.optional(),
    dolor_zona: z.string().trim().min(1).max(60).nullable().optional(),
    dolor_intensidad: entero(1, 10, 'La intensidad').nullable().optional(),
  })
  .refine((o) => Boolean(o.exercise_id || o.session_id || o.set_id || o.routine_id), {
    error: 'La observación va sobre un ejercicio, una sesión, una serie o una rutina.', path: ['exercise_id'],
  })
  .refine((o) => o.tipo !== 'dolor' || typeof o.dolor_intensidad === 'number', {
    error: 'Un dolor necesita su intensidad de 1 a 10.', path: ['dolor_intensidad'],
  });

export const esquemaQueryObservaciones = esquemaPaginacion.extend({
  client_id: esquemaUuid.optional(),
  exercise_id: esquemaUuid.optional(),
  session_id: esquemaUuid.optional(),
  routine_id: esquemaUuid.optional(),
});

// ── Salida ───────────────────────────────────────────────────────────────────
export const esquemaSerieEntreno = z.object({
  id: esquemaUuid,
  session_id: esquemaUuid,
  exercise_id: esquemaUuid,
  routine_exercise_id: esquemaUuid.nullable(),
  serie_n: z.number().int(),
  peso_kg: z.number(),
  reps: z.number().int(),
  rir: z.number().int().nullable(),
  rpe: z.number().nullable(),
  completada: z.boolean(),
  fallo: z.boolean(),
  tiempo_s: z.number().int().nullable(),
  descanso_real_s: z.number().int().nullable(),
  e1rm: z.number().nullable(),
  nota: z.string().nullable(),
});

export const esquemaObservacionApi = z.object({
  id: esquemaUuid,
  autor_id: esquemaUuid,
  autor: z.object({ id: esquemaUuid, nombre: z.string(), apellido: z.string(), rol: z.enum(['trainer', 'client']) }),
  client_id: esquemaUuid,
  tipo: esquemaTipoObservacion,
  texto: z.string(),
  exercise_id: esquemaUuid.nullable(),
  session_id: esquemaUuid.nullable(),
  set_id: esquemaUuid.nullable(),
  routine_id: esquemaUuid.nullable(),
  dolor_zona: z.string().nullable(),
  dolor_intensidad: z.number().int().nullable(),
  created_at: esquemaFechaHora,
});

export const esquemaSesionEntreno = z.object({
  id: esquemaUuid,
  client_id: esquemaUuid,
  routine_id: esquemaUuid.nullable(),
  routine_day_id: esquemaUuid.nullable(),
  routine_version: z.number().int().nullable(),
  nombre_dia: z.string().nullable(),
  estado: esquemaEstadoSesion,
  iniciada_at: esquemaFechaHora,
  cerrada_at: esquemaFechaHora.nullable(),
  duracion_s: z.number().int().nullable(),
  volumen_kg: z.number().nullable(),
  kcal_estimadas: z.number().nullable(),
  series_completadas: z.number().int(),
  observacion: z.string().nullable(),
  dolor_general: z.object({ zona: z.string(), intensidad: z.number().int() }).nullable(),
  device_id: z.string().nullable(),
});

export const esquemaSesionDetalle = esquemaSesionEntreno.extend({
  series: z.array(esquemaSerieEntreno),
  observaciones: z.array(esquemaObservacionApi),
});

export const esquemaSugerenciaCierre = z.object({
  id: esquemaUuid,
  routine_exercise_id: esquemaUuid,
  exercise_id: esquemaUuid,
  nombre: z.string(),
  metodo: esquemaMetodoProgresion,
  sugerencia: z.object({ peso_kg: z.number(), reps_min: z.number().int(), reps_max: z.number().int(), rir: z.number().int() }),
  texto: z.string(),
});

/** Respuesta de POST /sessions/:id/finish (contrato de cierre de §API, CON-013). */
export const esquemaResumenCierre = z.object({
  session: z.object({
    id: esquemaUuid,
    estado: esquemaEstadoSesion,
    series_completadas: z.number().int(),
    volumen_kg: z.number(),
    kcal_estimadas: z.number().nullable(),
    duracion_s: z.number().int(),
  }),
  prs: z.array(z.object({
    exercise_id: esquemaUuid,
    nombre: z.string(),
    tipo: z.enum(['e1rm', 'reps', 'tiempo']),
    valor: z.number(),
    anterior: z.number().nullable(),
  })),
  sugerencias: z.array(esquemaSugerenciaCierre),
  alertas_creadas: z.array(z.object({
    tipo: z.enum(['estancamiento', 'baja_rendimiento', 'sin_sesiones', 'dolor']),
    exercise_id: esquemaUuid.nullable(),
    nombre: z.string().nullable(),
  })),
  proxima_sesion: z.object({ routine_day_id: esquemaUuid, nombre: z.string(), fecha_sugerida: z.iso.date() }).nullable(),
});

export const RESULTADOS_SINCRONIZACION = ['aceptada', 'ya_estaba', 'descartada_conflicto', 'rechazada'] as const;

/** Respuesta de POST /sync/sessions: un resultado por sesión, en el orden procesado (P-18, P-31). */
export const esquemaResultadoSincronizacion = z.object({
  resultados: z.array(z.object({
    id: esquemaUuid,
    resultado: z.enum(RESULTADOS_SINCRONIZACION),
    motivo: z.object({ code: z.string(), message: z.string(), details: z.record(z.string(), z.unknown()).optional() }).nullable(),
    resumen: esquemaResumenCierre.nullable(),
  })),
});

/** Un ejercicio del día en Hoy, con la sugerencia vigente para precargar. */
export const esquemaEjercicioHoy = z.object({
  routine_exercise_id: esquemaUuid,
  exercise_id: esquemaUuid,
  nombre: z.string(),
  grupo_muscular: z.string(),
  tipo_carga: esquemaTipoCarga,
  series: z.number().int(),
  reps_min: z.number().int(),
  reps_max: z.number().int(),
  rir_objetivo: z.number().int(),
  descanso_s: z.number().int(),
  incremento_kg: z.number(),
  peso_inicial_kg: z.number().nullable(),
  nota_entrenador: z.string().nullable(),
  /** Peso más alto de la última vez (para el «+2,5» de Hoy). */
  ultimo_peso_kg: z.number().nullable(),
  sugerencia: z.object({
    id: esquemaUuid,
    estado: z.enum(['pendiente', 'aplicada', 'sobrescrita']),
    peso_kg: z.number(),
    reps_min: z.number().int(),
    reps_max: z.number().int(),
    rir: z.number().int(),
    texto: z.string(),
    nota: z.string().nullable(),
  }).nullable(),
});

export const ESTADOS_HOY = ['normal', 'en_curso', 'descanso', 'espera_entrenador', 'sin_rutina'] as const;

/** GET /me/today (pantalla 5, INT-083 a INT-085). */
export const esquemaHoyApi = z.object({
  /** Día de hoy en la zona del alumno. */
  fecha: z.iso.date(),
  estado: z.enum(ESTADOS_HOY),
  racha_dias: z.number().int(),
  rutina: z.object({
    id: esquemaUuid,
    nombre: z.string(),
    semana: z.number().int(),
    semanas: z.number().int(),
    metodo_progresion: esquemaMetodoProgresion,
    version: z.number().int(),
  }).nullable(),
  dia: z.object({
    id: esquemaUuid,
    nombre: z.string(),
    dia_semana: z.number().int().nullable(),
    series_total: z.number().int(),
    minutos_estimados: z.number().int(),
    ejercicios: z.array(esquemaEjercicioHoy),
  }).nullable(),
  sesion_en_curso: z.object({
    id: esquemaUuid,
    routine_day_id: esquemaUuid.nullable(),
    nombre_dia: z.string().nullable(),
    iniciada_at: esquemaFechaHora,
    series_hechas: z.number().int(),
  }).nullable(),
  /** Lunes a domingo de esta semana en la zona del alumno. */
  semana: z.array(z.object({
    fecha: z.iso.date(),
    dia_semana: z.number().int(),
    estado: z.enum(['hecho', 'toca', 'plan', 'descanso']),
    es_hoy: z.boolean(),
  })),
  semana_hechas: z.number().int(),
  semana_planificadas: z.number().int(),
  mes: z.object({ sesiones: z.number().int(), volumen_kg: z.number(), prs: z.number().int() }),
  entrenador: z.object({ id: esquemaUuid, nombre: z.string(), apellido: z.string() }).nullable(),
  /** Lo último que el entrenador te escribió (observación o consejo). */
  ultima_accion_entrenador: z.object({
    tipo: esquemaTipoObservacion, texto: z.string(), created_at: esquemaFechaHora, total: z.number().int(),
  }).nullable(),
});

export type HoyApi = z.infer<typeof esquemaHoyApi>;
export type SesionEntrenoApi = z.infer<typeof esquemaSesionEntreno>;
export type SesionDetalleApi = z.infer<typeof esquemaSesionDetalle>;
export type SerieEntrenoApi = z.infer<typeof esquemaSerieEntreno>;
export type SerieEntradaApi = z.input<typeof esquemaSerieEntrada>;
export type ResumenCierreApi = z.infer<typeof esquemaResumenCierre>;
export type ObservacionApi = z.infer<typeof esquemaObservacionApi>;
export type SesionSincronizadaApi = z.input<typeof esquemaSesionSincronizada>;
export type ResultadoSincronizacionApi = z.infer<typeof esquemaResultadoSincronizacion>;

// ── Catálogo de rutas ────────────────────────────────────────────────────────
export const RUTAS_SESIONES = {
  hoy: {
    metodo: 'GET', ruta: '/v1/me/today', publica: false, exito: 200, respuesta: esquemaHoyApi,
  },
  /** 201 al crear; con un id que ya existe, 200 con la sesión tal como está (P-40). */
  iniciar: {
    metodo: 'POST', ruta: '/v1/sessions', publica: false, cuerpo: esquemaSesionNueva, exito: 201, respuesta: esquemaSesionDetalle,
  },
  series: {
    metodo: 'PUT', ruta: '/v1/sessions/:id/sets', publica: false,
    params: esquemaParamsId, cuerpo: esquemaSeriesLote, exito: 200, respuesta: esquemaSesionDetalle,
  },
  cerrar: {
    metodo: 'POST', ruta: '/v1/sessions/:id/finish', publica: false,
    params: esquemaParamsId, cuerpo: esquemaFinSesion, exito: 200, respuesta: esquemaResumenCierre,
  },
  descartar: {
    metodo: 'POST', ruta: '/v1/sessions/:id/discard', publica: false,
    params: esquemaParamsId, exito: 200, respuesta: esquemaSesionEntreno,
  },
  sincronizar: {
    metodo: 'POST', ruta: '/v1/sync/sessions', publica: false,
    cuerpo: esquemaLoteSincronizacion, exito: 200, respuesta: esquemaResultadoSincronizacion,
  },
  historial: {
    metodo: 'GET', ruta: '/v1/sessions', publica: false,
    query: esquemaQuerySesiones, exito: 200, respuesta: esquemaPagina(esquemaSesionEntreno),
  },
  detalle: {
    metodo: 'GET', ruta: '/v1/sessions/:id', publica: false, params: esquemaParamsId, exito: 200, respuesta: esquemaSesionDetalle,
  },
  /** 201 al crear; con un id que ya existe, 200 con la observación tal como está. */
  observar: {
    metodo: 'POST', ruta: '/v1/observations', publica: false, cuerpo: esquemaObservacionNueva, exito: 201, respuesta: esquemaObservacionApi,
  },
  observaciones: {
    metodo: 'GET', ruta: '/v1/observations', publica: false,
    query: esquemaQueryObservaciones, exito: 200, respuesta: esquemaPagina(esquemaObservacionApi),
  },
} as const satisfies CatalogoRutas;
