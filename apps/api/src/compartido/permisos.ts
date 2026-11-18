// ─────────────────────────────────────────────────────────────────────────────
// Matriz de permisos · Zona: Compartido (API)
//
// Qué hace: la matriz de §Roles del PRD en un solo objeto: para cada acción, si la puede hacer el
// entrenador, el alumno vinculado y el alumno solo (PERM-01 a PERM-42 de casos-de-uso.md). Lo que
// la matriz niega responde 403 FORBIDDEN (P-01). Ojo: la matriz dice si el ROL puede; el alcance
// (que sea tu rutina, tu alumno con vínculo activo) lo revisa cada módulo con vinculo.ts y da 404.
// Tócalo cuando: cambie una celda de la matriz de §Roles o aparezca una acción nueva.
// No lo toques para: reglas de un recurso concreto (la rutina del entrenador se lee pero no se
// edita: eso lo decide el módulo rutinas comparando el dueño).
// Depende de: nada (solo tipos).
// ─────────────────────────────────────────────────────────────────────────────

/** Quién llama, según la matriz: el rol y, para el alumno, si tiene entrenador con vínculo activo. */
export type TipoActor = 'entrenador' | 'alumno_vinculado' | 'alumno_solo';

type Celda = Readonly<Record<TipoActor, boolean>>;
const fila = (entrenador: boolean, alumno_vinculado: boolean, alumno_solo: boolean): Celda => ({
  entrenador, alumno_vinculado, alumno_solo,
});

// ── La matriz ────────────────────────────────────────────────────────────────
export const MATRIZ_PERMISOS = {
  /** Lista de clientes y sus alertas, y toda ruta /trainer/* (PERM-01 a 03, PERM-32). */
  verClientes: fila(true, false, false),
  /** Ver datos de una persona: sesiones, medidas, fotos (PERM-04 a 06). Alcance: vinculo.ts. */
  verDatosAlumno: fila(true, true, true),
  /** Crear, editar y archivar rutinas (PERM-07 a 09). La del entrenador, el alumno solo la lee. */
  editarRutinas: fila(true, true, true),
  /** Asignar una rutina a un cliente (PERM-10 a 12). */
  asignarRutina: fila(true, false, false),
  /** Activar una rutina (PERM-10 a 12). El alumno vinculado, solo las propias. */
  activarRutina: fila(true, true, true),
  /** Crear ejercicios propios con referencia (PERM-13 a 15). */
  crearEjercicio: fila(true, true, true),
  /** Registrar sesión, peso, medidas y fotos (PERM-16 a 18, PERM-36). */
  registrarEntreno: fila(false, true, true),
  /** Sobrescribir la sugerencia de carga con PATCH /suggestions/:id (PERM-19 a 21). */
  sobrescribirSugerencia: fila(true, false, true),
  /** GET /clients/:id/suggestions (PERM-42). */
  verSugerenciasCliente: fila(true, false, true),
  /** GET /trainer/alerts y PATCH /alerts/:id. */
  gestionarAlertas: fila(true, false, false),
  /** GET /me/alerts, POST /me/drop-reports: motivos y consejos (PERM-23, 24, 37; P-05). */
  responderAlertas: fila(false, true, true),
  /** Escribir observaciones (PERM-25 a 27). El tipo consejo es solo del entrenador: 422 (P-08). */
  escribirObservacion: fila(true, true, true),
  /** Exportar datos y borrar la cuenta propia (PERM-28 a 30). */
  exportarYBorrar: fila(true, true, true),
  /** POST y GET /me/survey (PERM-31). */
  responderEncuesta: fila(false, true, true),
  /** POST /me/trainer/link y DELETE /me/trainer (PERM-33). Ya vinculado: 409 ALREADY_LINKED. */
  vincularse: fila(false, true, true),
} as const satisfies Record<string, Celda>;

export type AccionPermiso = keyof typeof MATRIZ_PERMISOS;

/** true si ese tipo de actor puede hacer la acción. */
export function puede(tipo: TipoActor, accion: AccionPermiso): boolean {
  return MATRIZ_PERMISOS[accion][tipo];
}
