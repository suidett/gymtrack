// ─────────────────────────────────────────────────────────────────────────────
// Reloj inyectado · Zona: Utilidades (API)
//
// Qué hace: la única fuente de «ahora» de la API. En producción es la hora del sistema; en las
// pruebas es un reloj fijo que se mueve a mano (datos-de-prueba.md: martes 17 de noviembre de
// 2026, 13:00 UTC). Los vencimientos (access de 15 minutos, refresh de 30 días, enlace de 1 hora)
// y los límites de intentos leen la hora de aquí, nunca de Date.now() directo.
// Tócalo cuando: necesites otra forma de mover el reloj en las pruebas.
// No lo toques para: cambiar cuánto dura un token (src/seguridad/tokens.ts).
// Depende de: nada.
// ─────────────────────────────────────────────────────────────────────────────

export interface Reloj {
  ahora(): Date;
}

export interface RelojFijo extends Reloj {
  /** Mueve el reloj: un número en milisegundos o un texto como '15m', '30d', '1h', '59s'. */
  avanzar(cuanto: number | string): void;
  fijar(iso: string | Date): void;
}

export const relojDelSistema: Reloj = { ahora: () => new Date() };

const UNIDADES_MS: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Convierte '7d', '15m', '1h', '1s' o '500ms' a milisegundos. */
export function aMilisegundos(cuanto: number | string): number {
  if (typeof cuanto === 'number') return cuanto;
  const m = /^(-?\d+)(ms|s|m|h|d)$/.exec(cuanto.trim());
  if (!m) throw new Error(`Duración inválida: ${cuanto}`);
  return Number(m[1]) * UNIDADES_MS[m[2]!]!;
}

export function crearRelojFijo(inicio: string | Date): RelojFijo {
  let actual = new Date(inicio).getTime();
  return {
    ahora: () => new Date(actual),
    avanzar: (cuanto) => {
      actual += aMilisegundos(cuanto);
    },
    fijar: (iso) => {
      actual = new Date(iso).getTime();
    },
  };
}
