// ─────────────────────────────────────────────────────────────────────────────
// Contrato de ejercicios · Zona: Contrato
//
// Qué hace: los esquemas Zod de entrada y salida de las rutas de ejercicios y su catálogo
// RUTAS_EJERCICIOS, que la API registra en apps/api/src/modulos/ejercicios (con esquemaDe y urlDe
// de src/compartido) y que CON-001 revisa. Rutas: GET /exercises (biblioteca base más los propios,
// con filtros q, grupo y equipo, y el PR del alumno), GET /exercises/:id (P-03), POST /exercises,
// PATCH /exercises/:id y DELETE /exercises/:id (borrado lógico).
// Quién ve qué (P-07): la base la ven todos; un ejercicio propio lo ve y edita su dueño; el
// entrenador ve los de sus alumnos con vínculo activo sin editarlos (en la lista, con
// ?client_id=); el alumno ve los del entrenador que están en rutinas asignadas a él. `editable`
// dice si quien llama lo puede cambiar.
// Pendiente: POST /exercises/:id/media y PUT /exercises/:id/media/:media_id (necesitan el bucket).
// Tócalo cuando: agregues o cambies una ruta de ejercicios.
// No lo toques para: rutas de otra área (cada una tiene su archivo en esta carpeta).
// El nombre repetido (uno propio o de la biblioteca con el mismo nombre, sin mirar tildes ni
// mayúsculas) es una regla de fondo: la revisa la API con la base (409 CONFLICT, campo nombre).
// Depende de: zod, ./comun (DefinicionRuta, paginación, esquemas base), ./reglas (tieneLetra) y
// ../types (las listas cerradas GRUPOS, EQUIPOS, PATRONES y TIPOS_CARGA).
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';
import { EQUIPOS, GRUPOS, PATRONES, TIPOS_CARGA } from '../types';
import { esquemaFechaHora, esquemaPagina, esquemaPaginacion, esquemaParamsId, esquemaUuid, type CatalogoRutas } from './comun';
import { tieneLetra } from './reglas';

// ── Listas cerradas ──────────────────────────────────────────────────────────
export const esquemaGrupoMuscular = z.enum(GRUPOS, { error: `El grupo va como ${GRUPOS.join(', ')}.` });
export const esquemaEquipo = z.enum(EQUIPOS, { error: `El equipo va como ${EQUIPOS.join(', ')}.` });
export const esquemaPatron = z.enum(PATRONES, { error: `El patrón va como ${PATRONES.join(', ')}.` });
export const esquemaTipoCarga = z.enum(TIPOS_CARGA, { error: `El tipo de carga va como ${TIPOS_CARGA.join(', ')}.` });

/** Tipos de récord de personal_records (los del PRD más reps y tiempo de cierre.ts). */
export const TIPOS_RECORD = ['peso_max', 'e1rm', 'reps_con_peso', 'volumen_sesion', 'reps', 'tiempo'] as const;

// ── Entrada ──────────────────────────────────────────────────────────────────
/** Largo del nombre de un ejercicio y de sus instrucciones. */
export const NOMBRE_EJERCICIO_MAX = 80;
export const INSTRUCCIONES_EJERCICIO_MAX = 2000;

const nombreEjercicio = z
  .string({ error: 'El nombre es obligatorio.' })
  .trim()
  .min(1, { error: 'El nombre es obligatorio.' })
  .max(NOMBRE_EJERCICIO_MAX, { error: `El nombre va hasta ${NOMBRE_EJERCICIO_MAX} caracteres.` })
  .refine((t) => !t || tieneLetra(t), { error: 'El nombre necesita al menos una letra.' });
const incrementoEjercicio = z
  .number({ error: 'El incremento tiene que ser un número.' })
  .min(0, { error: 'El incremento va de 0 a 50 kg.' })
  .max(50, { error: 'El incremento va de 0 a 50 kg.' });
const instruccionesEjercicio = z
  .string({ error: 'Las instrucciones van como texto.' })
  .trim()
  .max(INSTRUCCIONES_EJERCICIO_MAX, { error: `Las instrucciones van hasta ${INSTRUCCIONES_EJERCICIO_MAX} caracteres.` })
  .nullable();

/** POST /exercises: un ejercicio propio. El dueño es quien llama. */
export const esquemaEjercicioNuevo = z.strictObject({
  nombre: nombreEjercicio,
  grupo_muscular: esquemaGrupoMuscular,
  equipo: esquemaEquipo,
  patron: esquemaPatron,
  tipo_carga: esquemaTipoCarga.default('kg'),
  incremento_default_kg: incrementoEjercicio,
  instrucciones: instruccionesEjercicio.optional(),
});

/** PATCH /exercises/:id: los mismos campos, todos opcionales, y al menos uno. */
export const esquemaEjercicioEdicion = z
  .strictObject({
    nombre: nombreEjercicio.optional(),
    grupo_muscular: esquemaGrupoMuscular.optional(),
    equipo: esquemaEquipo.optional(),
    patron: esquemaPatron.optional(),
    tipo_carga: esquemaTipoCarga.optional(),
    incremento_default_kg: incrementoEjercicio.optional(),
    instrucciones: instruccionesEjercicio.optional(),
  })
  .refine((c) => Object.values(c).some((v) => v !== undefined), { error: 'Manda al menos un campo para cambiar.' });

/**
 * GET /exercises: paginación más los filtros de §API. `q` busca en el nombre sin distinguir
 * mayúsculas (vacío es lo mismo que no mandarlo). `client_id`: el entrenador ve además los
 * propios de ese alumno y su PR (P-02, P-07); sin vínculo activo, 404.
 */
export const esquemaQueryEjercicios = esquemaPaginacion.extend({
  q: z.string().trim().max(80, { error: 'La búsqueda va hasta 80 caracteres.' }).optional(),
  grupo: esquemaGrupoMuscular.optional(),
  equipo: esquemaEquipo.optional(),
  client_id: esquemaUuid.optional(),
});

// ── Salida ───────────────────────────────────────────────────────────────────
/** El récord vigente que se muestra en la lista: peso máximo, repeticiones o segundos según el tipo de carga. */
export const esquemaPrEjercicio = z.object({
  tipo: z.enum(TIPOS_RECORD),
  valor: z.number(),
  fecha: esquemaFechaHora,
});

export const esquemaEjercicio = z.object({
  id: esquemaUuid,
  /** El id de la app para los de la base (`press-de-banca`); null en los propios (P-29). */
  slug: z.string().nullable(),
  nombre: z.string(),
  grupo_muscular: esquemaGrupoMuscular,
  equipo: esquemaEquipo,
  patron: esquemaPatron,
  tipo_carga: esquemaTipoCarga,
  incremento_default_kg: z.number(),
  instrucciones: z.string().nullable(),
  /** null en la biblioteca base. */
  owner_id: esquemaUuid.nullable(),
  /** true si es de la biblioteca base. */
  base: z.boolean(),
  /** true si es de quien llama. */
  propio: z.boolean(),
  /** true si quien llama lo puede editar y borrar (solo el dueño). */
  editable: z.boolean(),
  /** El PR del alumno (el que llama o el de ?client_id=); null para el entrenador sin client_id. */
  pr: esquemaPrEjercicio.nullable(),
  created_at: esquemaFechaHora,
  updated_at: esquemaFechaHora,
});

/** Una referencia: los de la base son enlaces; los propios se sirven con URL firmada (pendiente). */
export const esquemaMediaEjercicio = z.object({
  id: esquemaUuid,
  tipo: z.enum(['video', 'foto']),
  url: z.string().nullable(),
  orden: z.number().int(),
});

export const esquemaEjercicioDetalle = esquemaEjercicio.extend({
  media: z.array(esquemaMediaEjercicio),
});

export const esquemaEjercicioBorrado = z.object({
  id: esquemaUuid,
  deleted_at: esquemaFechaHora,
});

export type EjercicioApi = z.infer<typeof esquemaEjercicio>;
export type EjercicioDetalleApi = z.infer<typeof esquemaEjercicioDetalle>;
export type EjercicioNuevoApi = z.input<typeof esquemaEjercicioNuevo>;
export type EjercicioEdicionApi = z.input<typeof esquemaEjercicioEdicion>;

// ── Catálogo de rutas ────────────────────────────────────────────────────────
export const RUTAS_EJERCICIOS = {
  listar: {
    metodo: 'GET', ruta: '/v1/exercises', publica: false,
    query: esquemaQueryEjercicios, exito: 200, respuesta: esquemaPagina(esquemaEjercicio),
  },
  detalle: {
    metodo: 'GET', ruta: '/v1/exercises/:id', publica: false,
    params: esquemaParamsId, exito: 200, respuesta: esquemaEjercicioDetalle,
  },
  crear: {
    metodo: 'POST', ruta: '/v1/exercises', publica: false,
    cuerpo: esquemaEjercicioNuevo, exito: 201, respuesta: esquemaEjercicioDetalle,
  },
  editar: {
    metodo: 'PATCH', ruta: '/v1/exercises/:id', publica: false,
    params: esquemaParamsId, cuerpo: esquemaEjercicioEdicion, exito: 200, respuesta: esquemaEjercicioDetalle,
  },
  borrar: {
    metodo: 'DELETE', ruta: '/v1/exercises/:id', publica: false,
    params: esquemaParamsId, exito: 200, respuesta: esquemaEjercicioBorrado,
  },
} as const satisfies CatalogoRutas;
