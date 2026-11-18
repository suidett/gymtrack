// ─────────────────────────────────────────────────────────────────────────────
// Tokens de las URLs de fotos · Zona: Progreso (API)
//
// Qué hace: firma y lee el token de las URLs de subida y de lectura de una foto cuando el
// almacenamiento es el disco local: `<accion>.<vence_ms>.<firma>`, con HMAC-SHA256 del secreto del
// JWT sobre la acción, el id de la foto, la clave del objeto y el vencimiento. Vale 15 minutos
// (§Seguridad, SEG-016). Una firma de subir no sirve para ver ni al revés, y no sirve para otra foto.
// Tócalo cuando: cambie cuánto dura la URL o qué entra en la firma.
// No lo toques para: dónde se guarda el archivo (almacenamiento.ts).
// Depende de: node:crypto y DURACION_URL_FOTO_MS de @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { DURACION_URL_FOTO_MS } from '@gymtrack/shared';
import { createHmac, timingSafeEqual } from 'node:crypto';

export type AccionFoto = 'subir' | 'ver';

const firma = (secreto: string, cuerpo: string) => createHmac('sha256', secreto).update(`gymtrack-foto:${cuerpo}`).digest('base64url');

/** Token que vale 15 minutos desde `ahora` para esa acción sobre esa foto. */
export function firmarFoto(secreto: string, accion: AccionFoto, fotoId: string, clave: string, ahora: Date) {
  const venceAt = new Date(ahora.getTime() + DURACION_URL_FOTO_MS);
  const cuerpo = `${accion}.${venceAt.getTime()}`;
  return { token: `${cuerpo}.${firma(secreto, `${cuerpo}.${fotoId}.${clave}`)}`, venceAt };
}

/** true si el token es de esa acción, esa foto y esa clave, y todavía no vence. */
export function tokenFotoValido(secreto: string, accion: AccionFoto, fotoId: string, clave: string, token: string, ahora: Date): boolean {
  const partes = token.split('.');
  if (partes.length !== 3) return false;
  const [acc, vence, recibida] = partes as [string, string, string];
  if (acc !== accion || !/^\d+$/.test(vence) || Number(vence) <= ahora.getTime()) return false;
  const esperada = Buffer.from(firma(secreto, `${acc}.${vence}.${fotoId}.${clave}`));
  const dada = Buffer.from(recibida);
  return esperada.length === dada.length && timingSafeEqual(esperada, dada);
}
