// ─────────────────────────────────────────────────────────────────────────────
// Piezas comunes del contrato · Zona: Contrato
//
// Qué hace: lo que comparten los contratos de todos los módulos de la API: la forma de una
// definición de ruta (DefinicionRuta, la que la API registra y CON-001 revisa), las respuestas de
// error de cualquier ruta (con el 422 de las reglas de negocio), la paginación por cursor de §API
// (`?limit=50&cursor=...` y `{ items, next_cursor }`, CON-008), el `?client_id=` con que el
// entrenador lee los datos de su alumno en las rutas `/me/...` (P-02) y los esquemas base de ids
// y fechas (ISO 8601 con zona, CON-006). También deja a Zod hablando en español: los campos que no
// traen un mensaje propio (un campo de más, un tipo equivocado) igual responden en español.
// Tócalo cuando: todas las rutas necesiten algo nuevo en común (otro estado de error, otro tope
// de página).
// No lo toques para: el contrato de un módulo (va en su archivo: perfil.ts, ejercicios.ts, ...).
// Depende de: zod, ./errores (el sobre) y ./cuentas (RESPUESTAS_ERROR).
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';
import { RESPUESTAS_ERROR } from './cuentas';
import { esquemaSobreError } from './errores';

// ── Idioma de los mensajes ───────────────────────────────────────────────────
// Los mensajes propios de cada esquema mandan; este es el respaldo («Llave desconocida: "x"»). Es
// una sola configuración para la app y la API porque las dos usan el mismo zod.
z.config(z.locales.es());

// ── Definición de una ruta ───────────────────────────────────────────────────
export type MetodoHttp = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Una ruta de la API tal como la ven la API y la app. `ruta` es la completa (`/v1/exercises/:id`).
 * `cuerpo`, `query` y `params` son los esquemas de entrada (los que falten no se validan);
 * `exito` es el estado de la respuesta buena y `respuesta` su esquema. Las de error no se
 * declaran: todas usan RESPUESTAS_ERROR_API.
 */
export interface DefinicionRuta {
  metodo: MetodoHttp;
  ruta: string;
  /** true: no pide token (solo registro, ingreso, refresh, recuperación y /health; PERM-38). */
  publica: boolean;
  cuerpo?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
  exito: number;
  respuesta: z.ZodType;
}

/** El catálogo de rutas de un módulo: `{ listar: {...}, crear: {...} }`. */
export type CatalogoRutas = Record<string, DefinicionRuta>;

/** Ayuda de tipos: devuelve la misma definición, revisada contra DefinicionRuta. */
export const definirRuta = <const D extends DefinicionRuta>(d: D): D => d;

/** Respuestas de error que puede dar cualquier ruta de un módulo: las de cuentas más el 422. */
export const RESPUESTAS_ERROR_API = { ...RESPUESTAS_ERROR, 422: esquemaSobreError } as const;

// ── Esquemas base ────────────────────────────────────────────────────────────
/** UUID (los ids de la API son UUID v7). */
export const esquemaUuid = z.uuid({ error: 'El id no tiene el formato de un UUID.' });
/** Fecha y hora ISO 8601 con zona: `2026-11-17T10:00:00-03:00`. Sin zona da 400 (CON-006). */
export const esquemaFechaHora = z.iso.datetime({ offset: true, error: 'La fecha necesita hora y zona (ISO 8601).' });
/** Solo fecha, `2026-11-17` (medidas y fotos, una por día). */
export const esquemaFechaDia = z.iso.date({ error: 'La fecha va como AAAA-MM-DD.' });

/** Params de las rutas con `:id`. */
export const esquemaParamsId = z.object({ id: esquemaUuid });

// ── Paginación por cursor (§API, CON-008) ────────────────────────────────────
export const LIMITE_POR_DEFECTO = 50;
export const LIMITE_MAXIMO = 100;

/**
 * Query de toda lista: `limit` de 1 a 100 (50 si no viene) y `cursor` opaco. Para agregar
 * filtros: `esquemaPaginacion.extend({ grupo: ... })`. La query no es estricta: un parámetro
 * desconocido se ignora (los cuerpos sí son estrictos, CON-012).
 */
export const esquemaPaginacion = z.object({
  limit: z.coerce
    .number({ error: 'limit tiene que ser un número.' })
    .int({ error: 'limit tiene que ser un entero.' })
    .min(1, { error: 'limit va de 1 a 100.' })
    .max(LIMITE_MAXIMO, { error: 'limit va de 1 a 100.' })
    .default(LIMITE_POR_DEFECTO),
  cursor: z.string().min(1).max(512).optional(),
});

/** La respuesta de toda lista: `{ items, next_cursor }`; next_cursor es null en la última página. */
export const esquemaPagina = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), next_cursor: z.string().nullable() });

export interface Pagina<T> {
  items: T[];
  next_cursor: string | null;
}

// ── El entrenador leyendo a su alumno (P-02) ─────────────────────────────────
/**
 * Query de las rutas `/me/...` que dicen «Alumno y su entrenador»: el alumno no lo manda (lee lo
 * suyo); el entrenador manda `client_id` y, sin vínculo activo, recibe 404.
 */
export const esquemaQueryAlumno = z.object({ client_id: esquemaUuid.optional() });
