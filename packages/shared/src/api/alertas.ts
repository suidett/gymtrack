// ─────────────────────────────────────────────────────────────────────────────
// Contrato de alertas · Zona: Contrato
//
// Qué hace: los esquemas Zod de entrada y salida de las rutas de alertas y su catálogo
// RUTAS_ALERTAS, que la API registra en apps/api/src/modulos/alertas (con esquemaDe y urlDe de
// src/compartido) y que CON-001 revisa:
//   GET /trainer/alerts      las abiertas de sus clientes (o las resueltas con ?estado=) (EP-56).
//   PATCH /alerts/:id        marcarla vista o resuelta, con lo que hizo al resolver (EP-57).
//   GET /me/alerts           las del alumno que piden sus motivos (EP-58; P-05, P-23).
//   POST /me/drop-reports    los motivos y hasta 3 consejos por motivo (EP-59).
// Los cuatro tipos son los de §Datos (estancamiento, baja_rendimiento, sin_sesiones, dolor) y los
// seis motivos los de la pantalla 20 (sueño, estrés, alimentación, lesión, tiempo, otro).
// Reglas: los nombres llevan el área (Alerta, Baja) porque index.ts junta todo con export *.
// Campos en snake_case y fechas con esquemaFechaHora. Los cuerpos van con z.strictObject.
// Tócalo cuando: agregues o cambies una ruta de alertas, un tipo o un motivo.
// No lo toques para: los umbrales que disparan una alerta (variables de entorno de la API y el
// worker, apps/api/src/modulos/alertas/umbrales.ts).
// Depende de: zod y ./comun (DefinicionRuta, paginación, esquemas base).
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';
import { esquemaFechaHora, esquemaPagina, esquemaPaginacion, esquemaParamsId, esquemaUuid, type CatalogoRutas } from './comun';

// ── Listas cerradas ──────────────────────────────────────────────────────────
export const TIPOS_ALERTA = ['estancamiento', 'baja_rendimiento', 'sin_sesiones', 'dolor'] as const;
export type TipoAlertaApi = (typeof TIPOS_ALERTA)[number];
export const ESTADOS_ALERTA = ['nueva', 'vista', 'resuelta'] as const;
/** Los tipos que le piden motivos al alumno (pantalla 20; matriz de §Roles, PERM-23 y 24). */
export const TIPOS_ALERTA_CON_MOTIVOS = ['estancamiento', 'baja_rendimiento'] as const satisfies readonly TipoAlertaApi[];
export const MOTIVOS_BAJA = ['sueno', 'estres', 'alimentacion', 'lesion', 'tiempo', 'otro'] as const;
export type MotivoBajaApi = (typeof MOTIVOS_BAJA)[number];
/** §API: hasta 3 consejos por motivo. */
export const CONSEJOS_POR_MOTIVO = 3;
/** Lo que anota la entrenadora al resolver (pantalla 18, hoja «Resolver»). */
export const ACCIONES_RESOLUCION = ['cargas', 'consejo', 'rutina', 'nada'] as const;

// ── Alerta ───────────────────────────────────────────────────────────────────
export const esquemaPersonaAlerta = z.object({ id: esquemaUuid, nombre: z.string(), apellido: z.string() });

export const esquemaReporteBajaResumen = z.object({
  id: esquemaUuid,
  motivos: z.array(z.enum(MOTIVOS_BAJA)),
  comentario: z.string().nullable(),
  consejos_mostrados: z.number().int(),
  created_at: esquemaFechaHora,
});

export const esquemaAlerta = z.object({
  id: esquemaUuid,
  tipo: z.enum(TIPOS_ALERTA),
  estado: z.enum(ESTADOS_ALERTA),
  client: esquemaPersonaAlerta,
  /** null en sin_sesiones y en la baja por volumen de la sesión. */
  exercise: z.object({ id: esquemaUuid, nombre: z.string() }).nullable(),
  /** El dato que la disparó: sesiones y marcas, volumen y promedio, días, dolor. */
  detalle: z.record(z.string(), z.unknown()),
  /** true si el alumno todavía no manda sus motivos (estancamiento y baja). */
  pide_motivos: z.boolean(),
  reporte: esquemaReporteBajaResumen.nullable(),
  /** Lo que anotó quien la resolvió. */
  acciones: z.array(z.enum(ACCIONES_RESOLUCION)),
  created_at: esquemaFechaHora,
  vista_at: esquemaFechaHora.nullable(),
  resuelta_at: esquemaFechaHora.nullable(),
});

// ── GET /trainer/alerts ──────────────────────────────────────────────────────
export const esquemaQueryAlertasEntrenador = esquemaPaginacion.extend({
  /** abiertas (nueva y vista, por defecto), nuevas o resueltas (INT-132). */
  estado: z.enum(['abiertas', 'nuevas', 'resueltas'], { error: 'El estado es abiertas, nuevas o resueltas.' }).default('abiertas'),
  client_id: esquemaUuid.optional(),
  tipo: z.enum(TIPOS_ALERTA).optional(),
});

export const esquemaListaAlertasEntrenador = esquemaPagina(esquemaAlerta).extend({
  /** Cuántas abiertas y cuántas nuevas tiene en total (insignia de la pestaña). */
  abiertas: z.number().int(),
  nuevas: z.number().int(),
});

// ── PATCH /alerts/:id ────────────────────────────────────────────────────────
export const esquemaAlertaCambio = z.strictObject({
  estado: z.enum(['vista', 'resuelta'], { error: 'El estado es vista o resuelta.' }),
  acciones: z.array(z.enum(ACCIONES_RESOLUCION)).max(ACCIONES_RESOLUCION.length).optional(),
});

// ── GET /me/alerts ───────────────────────────────────────────────────────────
export const esquemaListaAlertasAlumno = z.object({ items: z.array(esquemaAlerta) });

// ── POST /me/drop-reports ────────────────────────────────────────────────────
export const esquemaReporteBajaEntrada = z.strictObject({
  alert_id: esquemaUuid,
  motivos: z
    .array(z.enum(MOTIVOS_BAJA, { error: 'Los motivos son sueño, estrés, alimentación, lesión, tiempo u otro.' }))
    .min(1, { error: 'Elige al menos un motivo.' })
    .max(MOTIVOS_BAJA.length)
    .refine((m) => new Set(m).size === m.length, { error: 'Un motivo va una sola vez.' }),
  comentario: z.string().trim().max(500, { error: 'El comentario puede tener hasta 500 caracteres.' }).nullable().optional(),
});

export const esquemaConsejoBaja = z.object({
  id: esquemaUuid,
  motivo: z.enum(MOTIVOS_BAJA),
  orden: z.number().int(),
  texto: z.string(),
});

export const esquemaReporteBaja = z.object({
  id: esquemaUuid,
  alert_id: esquemaUuid,
  motivos: z.array(z.enum(MOTIVOS_BAJA)),
  comentario: z.string().nullable(),
  /** Hasta 3 por motivo, en el orden de los motivos (6 como máximo con dos motivos). */
  consejos: z.array(esquemaConsejoBaja),
  created_at: esquemaFechaHora,
});

// ── Catálogo de rutas ────────────────────────────────────────────────────────
export const RUTAS_ALERTAS = {
  listarEntrenador: {
    metodo: 'GET', ruta: '/v1/trainer/alerts', publica: false,
    query: esquemaQueryAlertasEntrenador, exito: 200, respuesta: esquemaListaAlertasEntrenador,
  },
  cambiarEstado: {
    metodo: 'PATCH', ruta: '/v1/alerts/:id', publica: false,
    params: esquemaParamsId, cuerpo: esquemaAlertaCambio, exito: 200, respuesta: esquemaAlerta,
  },
  listarAlumno: {
    metodo: 'GET', ruta: '/v1/me/alerts', publica: false,
    exito: 200, respuesta: esquemaListaAlertasAlumno,
  },
  reportarBaja: {
    metodo: 'POST', ruta: '/v1/me/drop-reports', publica: false,
    cuerpo: esquemaReporteBajaEntrada, exito: 201, respuesta: esquemaReporteBaja,
  },
} as const satisfies CatalogoRutas;
