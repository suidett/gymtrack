// ─────────────────────────────────────────────────────────────────────────────
// Envíos del enlace de recuperación · Zona: Acceso
//
// Qué hace: lleva la cuenta de los enlaces pedidos en esta hora para Recuperar contraseña:
// cuándo se puede reenviar (un minuto entre envíos), el aviso «Te mandamos otro enlace (2 de 3
// en esta hora)», la hora en que vence el último enlace (una hora después de pedirlo) y cuándo
// se puede pedir otro tras el límite de 3 por hora por correo (§Seguridad). La API es la que
// manda: si responde 429, se pasa al límite aunque la cuenta local diga otra cosa.
// Es lógica pura con la hora inyectada: se prueba en Node (APP-009).
// Tócalo cuando: cambie la espera entre envíos o el límite por hora.
// No lo toques para: el límite real (lo aplica la API en apps/api/src/seguridad).
// Depende de: nada.
// ─────────────────────────────────────────────────────────────────────────────

export const ESPERA_REENVIO_S = 60;
export const ENVIOS_POR_HORA = 3;
export const DURACION_ENLACE_MS = 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;

export interface Envios {
  /** Correo al que se mandaron (en minúsculas). Si cambia, la cuenta parte de cero. */
  correo: string;
  /** Hora (ms) de cada envío de la última hora, del más viejo al más nuevo. */
  horas: number[];
}

export const SIN_ENVIOS: Envios = { correo: '', horas: [] };

/** Los envíos que siguen contando (los de la última hora) para ese correo. */
export function vigentes(e: Envios, correo: string, ahoraMs: number): number[] {
  if (e.correo !== correo) return [];
  return e.horas.filter((h) => ahoraMs - h < HORA_MS);
}

/** Suma un envío que la API aceptó (202). */
export function registrarEnvio(e: Envios, correo: string, ahoraMs: number): Envios {
  return { correo, horas: [...vigentes(e, correo, ahoraMs), ahoraMs] };
}

/** Cuántos van en esta hora. */
export const enviosEnLaHora = (e: Envios, ahoraMs: number) => vigentes(e, e.correo, ahoraMs).length;

/** Momento (ms) desde el que se puede reenviar: un minuto después del último envío. */
export function reenvioDesde(e: Envios): number {
  const ultimo = e.horas[e.horas.length - 1];
  return ultimo === undefined ? 0 : ultimo + ESPERA_REENVIO_S * 1000;
}

/** true si con la cuenta local ya se llegó al límite y el próximo pedido daría 429. */
export const llegoAlLimite = (e: Envios, ahoraMs: number) => enviosEnLaHora(e, ahoraMs) >= ENVIOS_POR_HORA;

/** Hora (ms) en que vence el último enlace pedido. */
export function venceEnlace(e: Envios): number | null {
  const ultimo = e.horas[e.horas.length - 1];
  return ultimo === undefined ? null : ultimo + DURACION_ENLACE_MS;
}

/**
 * Hora (ms) en que se puede volver a pedir tras el límite. Si la API mandó Retry-After, manda
 * ese; si no, una hora después del más viejo de los envíos de esta hora.
 */
export function proximoPermitido(e: Envios, ahoraMs: number, retryAfterS: number | null): number {
  if (retryAfterS != null) return ahoraMs + retryAfterS * 1000;
  const v = vigentes(e, e.correo, ahoraMs);
  return v.length ? v[0] + HORA_MS : ahoraMs + HORA_MS;
}

/** El aviso que sale al reenviar (maqueta de Recuperar). */
export const avisoReenvio = (n: number) => `Te mandamos otro enlace (${n} de ${ENVIOS_POR_HORA} en esta hora). Usa el más reciente.`;
