// ─────────────────────────────────────────────────────────────────────────────
// Contrato de rutinas · Zona: Contrato
//
// Qué hace: los esquemas Zod de entrada y salida de las rutas de rutinas y su catálogo
// RUTAS_RUTINAS, que la API registra en apps/api/src/modulos/rutinas (con esquemaDe y urlDe de
// src/compartido) y que CON-001 revisa. Rutas de §API: GET y POST /routines, GET y PATCH
// /routines/:id, PUT /routines/:id/days, POST /routines/:id/assign, /activate y /duplicate, y
// DELETE /routines/:id (archiva).
// Reglas que se ven en la forma:
//   - La rutina nace en borrador con sus días completos; el método parte en doble progresión.
//   - reps_min mayor que reps_max NO es un 400: es la regla de negocio 422 REPS_RANGE_INVALID
//     (§API), por eso no va como refine aquí; la revisa la API con el día y la posición.
//   - El orden de los días y de los ejercicios es el orden en que vienen (desde 0).
//   - En PUT /days un día o un ejercicio puede traer su `id` para conservarlo (así la sugerencia y
//     el historial por routine_exercise_id siguen); sin id es nuevo; lo que no viene se quita.
//   - Cada rutina de la respuesta trae `permisos` calculados para quien llama (la del entrenador,
//     para su alumno, sale sin editar ni archivar ni activar).
// Tócalo cuando: agregues o cambies una ruta de rutinas.
// No lo toques para: rutas de otra área (cada una tiene su archivo en esta carpeta).
// Depende de: zod, ./comun (DefinicionRuta, paginación, esquemas base), ./ejercicios (las listas
// cerradas del ejercicio) y ../types (MetodoProgresion).
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';
import type { MetodoProgresion } from '../types';
import { esquemaFechaHora, esquemaPagina, esquemaPaginacion, esquemaParamsId, esquemaUuid, type CatalogoRutas } from './comun';
import { esquemaEquipo, esquemaGrupoMuscular, esquemaPatron, esquemaTipoCarga } from './ejercicios';

// ── Listas cerradas ──────────────────────────────────────────────────────────
/** Los ids de METODOS (types.ts), como tupla para Zod. */
export const METODOS_PROGRESION = [
  'doble_progresion', 'lineal', 'porcentual', 'por_rm', 'descendentes', 'cluster',
] as const satisfies readonly MetodoProgresion[];
export const ESTADOS_RUTINA = ['borrador', 'activa', 'archivada'] as const;
/** Cómo se cuentan las series de un ejercicio (§Datos, routine_exercises). */
export const ESQUEMAS_SERIE = ['normal', 'descendente', 'cluster'] as const;

export const esquemaMetodoProgresion = z.enum(METODOS_PROGRESION, {
  error: `El método va como ${METODOS_PROGRESION.join(', ')}.`,
});
export const esquemaEstadoRutina = z.enum(ESTADOS_RUTINA, { error: `El estado va como ${ESTADOS_RUTINA.join(', ')}.` });
export const esquemaEsquemaSerie = z.enum(ESQUEMAS_SERIE, { error: `El esquema va como ${ESQUEMAS_SERIE.join(', ')}.` });

// ── Piezas de entrada ────────────────────────────────────────────────────────
const entero = (min: number, max: number, que: string) =>
  z
    .number({ error: `${que} tiene que ser un número.` })
    .int({ error: `${que} tiene que ser un número entero.` })
    .min(min, { error: `${que} va de ${min} a ${max}.` })
    .max(max, { error: `${que} va de ${min} a ${max}.` });
const decimal = (min: number, max: number, que: string) =>
  z
    .number({ error: `${que} tiene que ser un número.` })
    .min(min, { error: `${que} va de ${min} a ${max}.` })
    .max(max, { error: `${que} va de ${min} a ${max}.` });
const texto = (min: number, max: number, que: string) =>
  z
    .string({ error: `${que} es obligatorio.` })
    .trim()
    .min(min, { error: min === 1 ? `${que} es obligatorio.` : `${que} va desde ${min} caracteres.` })
    .max(max, { error: `${que} va hasta ${max} caracteres.` });

const camposEjercicioRutina = {
  exercise_id: esquemaUuid,
  series: entero(1, 20, 'Las series'),
  /** Repeticiones, o segundos si el ejercicio es de tiempo. */
  reps_min: entero(1, 3600, 'El mínimo de repeticiones'),
  reps_max: entero(1, 3600, 'El máximo de repeticiones'),
  rir_objetivo: entero(0, 10, 'El RIR objetivo').default(2),
  descanso_s: entero(0, 1800, 'El descanso').default(90),
  /** Sin valor, se copia el incremento por defecto del ejercicio. 0: se progresa en repeticiones. */
  incremento_kg: decimal(0, 50, 'El incremento').optional(),
  peso_inicial_kg: decimal(0, 1000, 'El peso inicial').nullable().optional(),
  esquema: esquemaEsquemaSerie.default('normal'),
  /** Mismo texto en dos ejercicios seguidos del día: van en superserie («A»). */
  grupo_superserie: texto(1, 10, 'El grupo de superserie').nullable().optional(),
  nota_entrenador: texto(0, 500, 'La nota').nullable().optional(),
  /** Método porcentual: el porcentaje del 1RM de cada semana (P-10). */
  porcentajes_semana: z.array(decimal(1, 120, 'El porcentaje'), { error: 'Los porcentajes van en una lista.' })
    .max(52, { error: 'Hay un porcentaje por semana, hasta 52.' })
    .default([]),
  /** Método por RM: el «x» de xRM (P-10). */
  objetivo_rm: entero(1, 30, 'El objetivo de RM').nullable().optional(),
};

const camposDiaRutina = {
  nombre: texto(1, 40, 'El nombre del día'),
  /** 1 lunes a 7 domingo (ISO). null o sin valor: sin día fijo, va por ciclo. */
  dia_semana: entero(1, 7, 'El día de la semana').nullable().optional(),
};

/** Un ejercicio de un día en POST /routines. */
export const esquemaEjercicioRutinaNuevo = z.strictObject(camposEjercicioRutina);
/** Un día en POST /routines. Un día puede ir vacío en borrador; para activar, ninguno vacío. */
export const esquemaDiaRutinaNuevo = z.strictObject({
  ...camposDiaRutina,
  ejercicios: z.array(esquemaEjercicioRutinaNuevo, { error: 'Los ejercicios del día van en una lista.' })
    .max(30, { error: 'Un día va hasta 30 ejercicios.' }),
});

/** Un ejercicio en PUT /days: con `id` conserva el que ya estaba en la rutina. */
export const esquemaEjercicioRutinaEdicion = z.strictObject({ id: esquemaUuid.optional(), ...camposEjercicioRutina });
export const esquemaDiaRutinaEdicion = z.strictObject({
  id: esquemaUuid.optional(),
  ...camposDiaRutina,
  ejercicios: z.array(esquemaEjercicioRutinaEdicion, { error: 'Los ejercicios del día van en una lista.' })
    .max(30, { error: 'Un día va hasta 30 ejercicios.' }),
});

const diasRutina = <T extends z.ZodType>(dia: T) =>
  z.array(dia, { error: 'La rutina necesita sus días.' })
    .min(1, { error: 'La rutina necesita al menos un día.' })
    .max(14, { error: 'La rutina va hasta 14 días.' });

const nombreRutina = texto(1, 80, 'El nombre');
const descripcionRutina = texto(0, 500, 'La descripción').nullable();
const semanasRutina = entero(1, 52, 'Las semanas');

// ── Entrada de cada ruta ─────────────────────────────────────────────────────
/**
 * POST /routines. `client_id`: el entrenador la arma para ese alumno (vínculo activo o 404); sin
 * él es una plantilla. El alumno no lo manda (o manda el suyo): la rutina es propia.
 */
export const esquemaRutinaNueva = z.strictObject({
  nombre: nombreRutina,
  descripcion: descripcionRutina.optional(),
  metodo_progresion: esquemaMetodoProgresion.default('doble_progresion'),
  semanas: semanasRutina,
  client_id: esquemaUuid.nullable().optional(),
  dias: diasRutina(esquemaDiaRutinaNuevo),
});

/** PATCH /routines/:id: nombre, descripción, método y semanas; al menos uno. */
export const esquemaRutinaEdicion = z
  .strictObject({
    nombre: nombreRutina.optional(),
    descripcion: descripcionRutina.optional(),
    metodo_progresion: esquemaMetodoProgresion.optional(),
    semanas: semanasRutina.optional(),
  })
  .refine((c) => Object.values(c).some((v) => v !== undefined), { error: 'Manda al menos un campo para cambiar.' });

/** PUT /routines/:id/days: la estructura completa, que reemplaza a la anterior. */
export const esquemaDiasRutina = z.strictObject({ dias: diasRutina(esquemaDiaRutinaEdicion) });

/** POST /routines/:id/assign: copia la rutina para ese cliente (P-43) y, si `activar`, la activa. */
export const esquemaAsignarRutina = z.strictObject({
  client_id: esquemaUuid,
  activar: z.boolean({ error: 'activar va como true o false.' }).default(false),
});

/**
 * POST /routines/:id/duplicate (cuerpo opcional). La copia es de quien llama, en borrador.
 * `nombre`: sin valor, «<nombre> (copia)». `client_id`: solo el entrenador, para dejar la copia
 * a un cliente; sin él, la copia del entrenador es una plantilla.
 */
export const esquemaDuplicarRutina = z
  .strictObject({
    nombre: nombreRutina.optional(),
    client_id: esquemaUuid.nullable().optional(),
  })
  .nullish();

/** GET /routines. `client_id`: el entrenador ve las rutinas de ese alumno (las suyas y las que el alumno se hizo). */
export const esquemaQueryRutinas = esquemaPaginacion.extend({
  estado: esquemaEstadoRutina.optional(),
  client_id: esquemaUuid.optional(),
});

// ── Salida ───────────────────────────────────────────────────────────────────
export const esquemaEjercicioDeRutina = z.object({
  id: esquemaUuid,
  orden: z.number().int(),
  exercise_id: esquemaUuid,
  /** Lo mínimo del ejercicio para dibujar la rutina sin pedir la biblioteca. */
  ejercicio: z.object({
    id: esquemaUuid,
    nombre: z.string(),
    grupo_muscular: esquemaGrupoMuscular,
    equipo: esquemaEquipo,
    patron: esquemaPatron,
    tipo_carga: esquemaTipoCarga,
  }),
  series: z.number().int(),
  reps_min: z.number().int(),
  reps_max: z.number().int(),
  rir_objetivo: z.number().int(),
  descanso_s: z.number().int(),
  incremento_kg: z.number(),
  peso_inicial_kg: z.number().nullable(),
  esquema: esquemaEsquemaSerie,
  grupo_superserie: z.string().nullable(),
  nota_entrenador: z.string().nullable(),
  porcentajes_semana: z.array(z.number()),
  objetivo_rm: z.number().int().nullable(),
});

export const esquemaDiaDeRutina = z.object({
  id: esquemaUuid,
  orden: z.number().int(),
  nombre: z.string(),
  dia_semana: z.number().int().nullable(),
  ejercicios: z.array(esquemaEjercicioDeRutina),
});

/** Qué puede hacer con la rutina quien llama (para mostrar u ocultar botones). */
export const esquemaPermisosRutina = z.object({
  editar: z.boolean(),
  activar: z.boolean(),
  asignar: z.boolean(),
  archivar: z.boolean(),
  duplicar: z.boolean(),
});

export const esquemaRutina = z.object({
  id: esquemaUuid,
  nombre: z.string(),
  descripcion: z.string().nullable(),
  semanas: z.number().int(),
  metodo_progresion: esquemaMetodoProgresion,
  estado: esquemaEstadoRutina,
  /** Sube en 1 al activar y en cada cambio de días con la rutina activa. */
  version: z.number().int(),
  /** Quien la escribió. */
  owner_id: esquemaUuid,
  /** A quién está asignada; null: plantilla del entrenador. La propia del alumno tiene owner_id = client_id. */
  client_id: esquemaUuid.nullable(),
  /** De cuál se copió (duplicar o asignar una plantilla). */
  origen_id: esquemaUuid.nullable(),
  dueno: z.object({
    id: esquemaUuid,
    nombre: z.string(),
    apellido: z.string(),
    rol: z.enum(['trainer', 'client']),
  }),
  /** La primera activación; desde ahí se cuentan las semanas. */
  activada_at: esquemaFechaHora.nullable(),
  /** Semana en curso, de 1 a `semanas`; null si nunca se activó. */
  semana_actual: z.number().int().nullable(),
  /** Solo se llena al archivar una rutina sin sesiones (deja de aparecer). */
  deleted_at: esquemaFechaHora.nullable(),
  created_at: esquemaFechaHora,
  updated_at: esquemaFechaHora,
  permisos: esquemaPermisosRutina,
  dias: z.array(esquemaDiaDeRutina),
});

export type RutinaApi = z.infer<typeof esquemaRutina>;
export type RutinaNuevaApi = z.input<typeof esquemaRutinaNueva>;
export type DiasRutinaApi = z.input<typeof esquemaDiasRutina>;

// ── Catálogo de rutas ────────────────────────────────────────────────────────
export const RUTAS_RUTINAS = {
  listar: {
    metodo: 'GET', ruta: '/v1/routines', publica: false,
    query: esquemaQueryRutinas, exito: 200, respuesta: esquemaPagina(esquemaRutina),
  },
  crear: {
    metodo: 'POST', ruta: '/v1/routines', publica: false,
    cuerpo: esquemaRutinaNueva, exito: 201, respuesta: esquemaRutina,
  },
  detalle: {
    metodo: 'GET', ruta: '/v1/routines/:id', publica: false,
    params: esquemaParamsId, exito: 200, respuesta: esquemaRutina,
  },
  editar: {
    metodo: 'PATCH', ruta: '/v1/routines/:id', publica: false,
    params: esquemaParamsId, cuerpo: esquemaRutinaEdicion, exito: 200, respuesta: esquemaRutina,
  },
  reemplazarDias: {
    metodo: 'PUT', ruta: '/v1/routines/:id/days', publica: false,
    params: esquemaParamsId, cuerpo: esquemaDiasRutina, exito: 200, respuesta: esquemaRutina,
  },
  asignar: {
    metodo: 'POST', ruta: '/v1/routines/:id/assign', publica: false,
    params: esquemaParamsId, cuerpo: esquemaAsignarRutina, exito: 201, respuesta: esquemaRutina,
  },
  activar: {
    metodo: 'POST', ruta: '/v1/routines/:id/activate', publica: false,
    params: esquemaParamsId, exito: 200, respuesta: esquemaRutina,
  },
  duplicar: {
    metodo: 'POST', ruta: '/v1/routines/:id/duplicate', publica: false,
    params: esquemaParamsId, cuerpo: esquemaDuplicarRutina, exito: 201, respuesta: esquemaRutina,
  },
  archivar: {
    metodo: 'DELETE', ruta: '/v1/routines/:id', publica: false,
    params: esquemaParamsId, exito: 200, respuesta: esquemaRutina,
  },
} as const satisfies CatalogoRutas;
