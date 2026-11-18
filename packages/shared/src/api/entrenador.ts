// ─────────────────────────────────────────────────────────────────────────────
// Contrato del panel del entrenador · Zona: Contrato
//
// Qué hace: los esquemas Zod de entrada y salida de las rutas de clientes del entrenador y su
// catálogo RUTAS_ENTRENADOR, que la API registra en apps/api/src/modulos/entrenador (con esquemaDe
// y urlDe de src/compartido) y que CON-001 revisa:
//   GET /trainer/clients        lista con estado, adherencia de la semana, alertas abiertas,
//                               entrena hoy y sin rutina, más el resumen de arriba (EP-15).
//   GET /trainer/clients/:id    ficha: rutina activa, mes, últimas sesiones, PRs, medidas,
//                               encuesta, observaciones y alertas (EP-16).
//   DELETE /trainer/clients/:id termina el vínculo; el historial queda en el alumno (EP-17, P-16).
// La invitación (POST y GET /trainer/invitations) y el vínculo desde el alumno (POST
// /me/trainer/link y DELETE /me/trainer) están en perfil.ts.
// Reglas: los nombres llevan el área (Cliente, Ficha) porque index.ts junta todo con export *.
// Campos en snake_case, pesos en kilos (*_kg) y fechas con esquemaFechaHora.
// Tócalo cuando: agregues o cambies una ruta del panel del entrenador.
// No lo toques para: rutas de otra área (cada una tiene su archivo en esta carpeta).
// Depende de: zod, ./comun y los esquemas de ./alertas y ./progreso que la ficha reutiliza.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';
import { esquemaAlerta } from './alertas';
import { esquemaFechaDia, esquemaFechaHora, esquemaPagina, esquemaPaginacion, esquemaParamsId, esquemaUuid, type CatalogoRutas } from './comun';
import { esquemaMedidaCorporal, esquemaRecordProgreso, esquemaTendenciaMedidas } from './progreso';

/** Cuántas sesiones trae la ficha en «Últimas sesiones». */
export const SESIONES_EN_FICHA = 10;
/** Cuántas observaciones trae la ficha. */
export const OBSERVACIONES_EN_FICHA = 20;
export const FILTROS_CLIENTES = ['todos', 'hoy', 'revisar', 'sin_rutina'] as const;

// ── Piezas ───────────────────────────────────────────────────────────────────
export const esquemaAdherenciaCliente = z.object({
  /** Lunes de la semana en la zona del alumno. */
  semana_inicio: esquemaFechaDia,
  hechas: z.number().int(),
  /** Días de la rutina activa por semana; 0 sin rutina. */
  planificadas: z.number().int(),
  /** hechas / planificadas en %, hasta 100; null sin rutina. */
  pct: z.number().int().nullable(),
});

export const esquemaRutinaCliente = z.object({
  id: esquemaUuid,
  nombre: z.string(),
  metodo_progresion: z.string(),
  dias_por_semana: z.number().int(),
});

export const esquemaUltimaSesionCliente = z.object({
  id: esquemaUuid,
  estado: z.enum(['en_curso', 'cerrada', 'descartada']),
  iniciada_at: esquemaFechaHora,
  cerrada_at: esquemaFechaHora.nullable(),
  dia_nombre: z.string().nullable(),
});

// ── GET /trainer/clients ─────────────────────────────────────────────────────
export const esquemaQueryClientes = esquemaPaginacion.extend({
  /** Busca en nombre y apellido sin importar tildes ni mayúsculas. */
  q: z.string().trim().max(80).optional(),
  filtro: z.enum(FILTROS_CLIENTES, { error: 'El filtro es todos, hoy, revisar o sin_rutina.' }).default('todos'),
});

export const esquemaClienteLista = z.object({
  id: esquemaUuid,
  nombre: z.string(),
  apellido: z.string(),
  estado: z.literal('activo'),
  vinculado_at: esquemaFechaHora.nullable(),
  rutina: esquemaRutinaCliente.nullable(),
  sin_rutina: z.boolean(),
  /** Tiene una sesión iniciada hoy o un día de su rutina fijado para hoy (en su zona). */
  entrena_hoy: z.boolean(),
  ultima_sesion: esquemaUltimaSesionCliente.nullable(),
  adherencia_semana: esquemaAdherenciaCliente,
  alertas_abiertas: z.number().int(),
  alertas_nuevas: z.number().int(),
  /** La etiqueta «Revisar»: tiene al menos una alerta abierta. */
  revisar: z.boolean(),
});

export const esquemaResumenClientes = z.object({
  activos: z.number().int(),
  entrenan_hoy: z.number().int(),
  sin_rutina: z.number().int(),
  alertas_abiertas: z.number().int(),
  alertas_nuevas: z.number().int(),
  /** Sesiones hechas sobre planificadas de todos los clientes con rutina, en %; null sin ninguna. */
  adherencia_semana_pct: z.number().int().nullable(),
  sesiones_hechas: z.number().int(),
  sesiones_planificadas: z.number().int(),
});

export const esquemaListaClientes = esquemaPagina(esquemaClienteLista).extend({ resumen: esquemaResumenClientes });

// ── GET /trainer/clients/:id ─────────────────────────────────────────────────
export const esquemaFichaRutina = z.object({
  id: esquemaUuid,
  nombre: z.string(),
  metodo_progresion: z.string(),
  semanas: z.number().int(),
  /** Semana en curso desde que se activó, de 1 a semanas. */
  semana_actual: z.number().int().nullable(),
  version: z.number().int(),
  activada_at: esquemaFechaHora.nullable(),
  /** Quién la escribió: el entrenador o el alumno. */
  owner_id: esquemaUuid,
  dias: z.array(z.object({ id: esquemaUuid, nombre: z.string(), orden: z.number().int(), dia_semana: z.number().int().nullable() })),
});

export const esquemaFichaSesion = z.object({
  id: esquemaUuid,
  estado: z.enum(['en_curso', 'cerrada', 'descartada']),
  dia_nombre: z.string().nullable(),
  iniciada_at: esquemaFechaHora,
  cerrada_at: esquemaFechaHora.nullable(),
  duracion_s: z.number().int().nullable(),
  volumen_kg: z.number().nullable(),
  series_completadas: z.number().int(),
});

export const esquemaFichaObservacion = z.object({
  id: esquemaUuid,
  tipo: z.enum(['observacion', 'dolor', 'consejo']),
  texto: z.string(),
  autor: z.object({ id: esquemaUuid, rol: z.enum(['trainer', 'client']), nombre: z.string() }),
  exercise: z.object({ id: esquemaUuid, nombre: z.string() }).nullable(),
  session_id: esquemaUuid.nullable(),
  set_id: esquemaUuid.nullable(),
  routine_id: esquemaUuid.nullable(),
  dolor_zona: z.string().nullable(),
  dolor_intensidad: z.number().int().nullable(),
  /** Dolor u observación del alumno que tiene un consejo del entrenador escrito después. */
  respondida: z.boolean(),
  created_at: esquemaFechaHora,
});

export const esquemaFichaEncuesta = z.object({
  id: esquemaUuid,
  version: z.number().int(),
  respuestas: z.record(z.string(), z.unknown()),
  completada_at: esquemaFechaHora,
});

export const esquemaFichaCliente = z.object({
  cliente: z.object({
    id: esquemaUuid,
    nombre: z.string(),
    apellido: z.string(),
    timezone: z.string(),
    unidades: z.enum(['kg', 'lb']),
    vinculado_at: esquemaFechaHora.nullable(),
    cuenta_creada_at: esquemaFechaHora,
  }),
  rutina_activa: esquemaFichaRutina.nullable(),
  adherencia_semana: esquemaAdherenciaCliente,
  /** Las cifras del mes en curso (como en Hoy). */
  mes: z.object({ sesiones: z.number().int(), volumen_kg: z.number(), prs: z.number().int() }),
  /** De la más reciente a la más antigua (INT-041). */
  ultimas_sesiones: z.array(esquemaFichaSesion),
  prs: z.array(esquemaRecordProgreso),
  medidas: z.object({
    ultima: esquemaMedidaCorporal.nullable(),
    registros: z.number().int(),
    tendencia: esquemaTendenciaMedidas.nullable(),
  }),
  fotos: z.number().int(),
  encuesta: esquemaFichaEncuesta.nullable(),
  observaciones: z.array(esquemaFichaObservacion),
  /** Abiertas (nueva y vista), de la más nueva a la más vieja. */
  alertas: z.array(esquemaAlerta),
});

// ── DELETE /trainer/clients/:id ──────────────────────────────────────────────
export const esquemaVinculoTerminado = z.object({
  client_id: esquemaUuid,
  terminado_at: esquemaFechaHora,
  /** Rutinas escritas por el entrenador que quedaron archivadas para el alumno (P-16). */
  rutinas_archivadas: z.number().int(),
});

// ── Catálogo de rutas ────────────────────────────────────────────────────────
export const RUTAS_ENTRENADOR = {
  listarClientes: {
    metodo: 'GET', ruta: '/v1/trainer/clients', publica: false,
    query: esquemaQueryClientes, exito: 200, respuesta: esquemaListaClientes,
  },
  fichaCliente: {
    metodo: 'GET', ruta: '/v1/trainer/clients/:id', publica: false,
    params: esquemaParamsId, exito: 200, respuesta: esquemaFichaCliente,
  },
  terminarVinculo: {
    metodo: 'DELETE', ruta: '/v1/trainer/clients/:id', publica: false,
    params: esquemaParamsId, exito: 200, respuesta: esquemaVinculoTerminado,
  },
} as const satisfies CatalogoRutas;
