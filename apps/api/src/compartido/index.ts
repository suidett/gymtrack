// ─────────────────────────────────────────────────────────────────────────────
// Puerta de lo compartido · Zona: Compartido (API)
//
// Qué hace: junta lo que todo módulo de src/modulos/<nombre> puede usar, para importarlo de un
// solo lugar (`import { definirModulo, esquemaDe, urlDe, usuarioDe } from '../../compartido'`):
// el registro del módulo, las rutas desde el contrato, la sesión y el rol, la matriz de permisos,
// la regla de vínculo entrenador y alumno, los errores, la paginación y los ids de la semilla.
// Tócalo cuando: agregues un archivo a esta carpeta (una línea `export * from`).
// No lo toques para: cambiar qué hace una pieza (va en su archivo).
// Depende de: los archivos de esta carpeta.
// ─────────────────────────────────────────────────────────────────────────────
export * from './autenticacion';
export * from './errores';
export * from './modulos';
export * from './paginacion';
export * from './permisos';
export * from './rutas';
export { FECHA_BIBLIOTECA, idConsejo, idEjercicioBase, slugDe, uuidV7Fijo } from './semilla';
export * from './vinculo';
