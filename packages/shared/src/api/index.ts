// ─────────────────────────────────────────────────────────────────────────────
// Puerta del contrato de la API · Zona: Contrato
//
// Qué hace: junta los esquemas Zod de la API, los códigos de error, las piezas comunes
// (definición de ruta, paginación) y el cliente tipado, más un archivo por módulo de la API
// (perfil, ejercicios, rutinas, sesiones, progreso, alertas, entrenador). La API los importa
// desde '@gymtrack/shared' y la app también: así validan con el mismo objeto.
// También arma CATALOGO_API y LISTA_RUTAS_API: todas las rutas de todos los módulos, que
// CON-001 compara con las que Fastify tiene registradas.
// Tócalo cuando: agregues un archivo de contrato nuevo (una línea `export * from` y su catálogo
// en CATALOGO_API). Para llenar el contrato de un módulo no hace falta tocarlo: edita su archivo.
// No lo toques para: cambiar un esquema (va en su archivo).
// Depende de: todos los archivos de esta carpeta.
// ─────────────────────────────────────────────────────────────────────────────
import { RUTAS_ALERTAS } from './alertas';
import type { DefinicionRuta } from './comun';
import { RUTAS_CUENTAS } from './cuentas';
import { RUTAS_EJERCICIOS } from './ejercicios';
import { RUTAS_ENTRENADOR } from './entrenador';
import { RUTAS_PERFIL } from './perfil';
import { RUTAS_PROGRESO } from './progreso';
import { RUTAS_RUTINAS } from './rutinas';
import { RUTAS_SESIONES } from './sesiones';

export * from './errores';
export * from './cuentas';
export * from './cliente';
export * from './comun';

// ── Un archivo por módulo de la API ──────────────────────────────────────────
export * from './perfil';
export * from './ejercicios';
export * from './rutinas';
export * from './sesiones';
export * from './progreso';
export * from './alertas';
export * from './entrenador';

// ── Catálogo completo ────────────────────────────────────────────────────────
/** Las rutas de la API por área. CON-001 revisa que Fastify registre exactamente estas. */
export const CATALOGO_API = {
  cuentas: RUTAS_CUENTAS,
  perfil: RUTAS_PERFIL,
  ejercicios: RUTAS_EJERCICIOS,
  rutinas: RUTAS_RUTINAS,
  sesiones: RUTAS_SESIONES,
  progreso: RUTAS_PROGRESO,
  alertas: RUTAS_ALERTAS,
  entrenador: RUTAS_ENTRENADOR,
} as const;

/** Todas las rutas en una lista (para CON-001 y para generar el OpenAPI). */
export const LISTA_RUTAS_API: readonly DefinicionRuta[] = Object.values(CATALOGO_API).flatMap(
  (catalogo) => Object.values(catalogo) as DefinicionRuta[],
);
