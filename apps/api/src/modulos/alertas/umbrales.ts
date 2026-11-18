// ─────────────────────────────────────────────────────────────────────────────
// Umbrales de las alertas · Zona: Alertas (API)
//
// Qué hace: los umbrales de §Datos «Detección de estancamiento y de baja» como configuración del
// servidor (P-34), con los valores del PRD por defecto. Los leen la API (al cerrar una sesión y al
// crear un dolor) y el worker (la corrida de la noche).
//   UMBRAL_ESTANCAMIENTO_SESIONES  3   sesiones seguidas sin superar el mejor 1RM estimado
//   UMBRAL_BAJA_PCT                10  % de caída frente al promedio de las semanas anteriores
//   UMBRAL_BAJA_SEMANAS            4   semanas que se promedian (28 días, P-47)
//   UMBRAL_BAJA_SEMANAS_MIN        2   semanas de historia para evaluar la baja (P-47)
//   UMBRAL_SIN_SESIONES_DIAS       7   días sin cerrar una sesión con rutina activa
//   UMBRAL_DOLOR_INTENSIDAD        7   intensidad desde la que un dolor avisa al instante
// Un valor que no es un entero positivo hace fallar el arranque (mejor no subir que subir mal).
// Tócalo cuando: aparezca otro umbral.
// No lo toques para: cambiar un valor en un entorno (va en su variable).
// Depende de: nada.
// ─────────────────────────────────────────────────────────────────────────────

export interface Umbrales {
  estancamientoSesiones: number;
  bajaPct: number;
  bajaSemanas: number;
  bajaSemanasMin: number;
  sinSesionesDias: number;
  dolorIntensidad: number;
}

export const UMBRALES_POR_DEFECTO: Umbrales = {
  estancamientoSesiones: 3,
  bajaPct: 10,
  bajaSemanas: 4,
  bajaSemanasMin: 2,
  sinSesionesDias: 7,
  dolorIntensidad: 7,
};

const VARIABLES: Record<keyof Umbrales, string> = {
  estancamientoSesiones: 'UMBRAL_ESTANCAMIENTO_SESIONES',
  bajaPct: 'UMBRAL_BAJA_PCT',
  bajaSemanas: 'UMBRAL_BAJA_SEMANAS',
  bajaSemanasMin: 'UMBRAL_BAJA_SEMANAS_MIN',
  sinSesionesDias: 'UMBRAL_SIN_SESIONES_DIAS',
  dolorIntensidad: 'UMBRAL_DOLOR_INTENSIDAD',
};

/** Los umbrales desde las variables de entorno; lo que falta queda con el valor del PRD. */
export function leerUmbrales(env: Record<string, string | undefined> = process.env): Umbrales {
  const u = { ...UMBRALES_POR_DEFECTO };
  for (const [clave, variable] of Object.entries(VARIABLES) as [keyof Umbrales, string][]) {
    const crudo = env[variable];
    if (crudo === undefined || crudo === '') continue;
    const n = Number(crudo);
    if (!Number.isInteger(n) || n < 1) throw new Error(`${variable} tiene que ser un entero mayor que 0 (vino «${crudo}»)`);
    u[clave] = n;
  }
  return u;
}
