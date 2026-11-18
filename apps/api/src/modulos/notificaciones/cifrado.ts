// ─────────────────────────────────────────────────────────────────────────────
// Cifrado del destino de cada dispositivo · Zona: Notificaciones (API)
//
// Qué hace: para mandar un push hace falta el token de Expo o la suscripción web tal cual, pero
// §Seguridad pide que ningún token quede en claro en la base (SEG-003). Por eso el destino se
// guarda cifrado con AES-256-GCM y una llave que sale de JWT_SECRET con HKDF (otra llave, para
// otro uso: con la de los JWT no se puede descifrar nada y al revés). La búsqueda y el «no
// duplicar» van por el hash SHA-256 en token_hash, como antes.
// Si JWT_SECRET cambia, los destinos viejos ya no se pueden leer: el servicio los borra al primer
// envío y la app los vuelve a registrar sola al abrirse.
// Tócalo cuando: cambie el algoritmo (sube la versión «v1» del prefijo y deja leer la anterior).
// No lo toques para: dónde se guarda (./almacen.ts).
// Depende de: node:crypto.
// ─────────────────────────────────────────────────────────────────────────────
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const LARGO_IV = 12;
const LARGO_TAG = 16;

export interface Cifrador {
  /** `v1.<base64url de iv | tag | cifrado>`. */
  cifrar(texto: string): string;
  /** El texto, o null si no es de este cifrador (otra llave, alterado o de otra versión). */
  descifrar(cifrado: string): string | null;
}

export function crearCifrador(secreto: string): Cifrador {
  const llave = Buffer.from(hkdfSync('sha256', secreto, 'gymtrack', 'avisos/dispositivos/v1', 32));
  return {
    cifrar(texto) {
      const iv = randomBytes(LARGO_IV);
      const c = createCipheriv('aes-256-gcm', llave, iv);
      const cuerpo = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
      return `${VERSION}.${Buffer.concat([iv, c.getAuthTag(), cuerpo]).toString('base64url')}`;
    },
    descifrar(cifrado) {
      if (!cifrado.startsWith(`${VERSION}.`)) return null;
      try {
        const crudo = Buffer.from(cifrado.slice(VERSION.length + 1), 'base64url');
        if (crudo.length <= LARGO_IV + LARGO_TAG) return null;
        const d = createDecipheriv('aes-256-gcm', llave, crudo.subarray(0, LARGO_IV));
        d.setAuthTag(crudo.subarray(LARGO_IV, LARGO_IV + LARGO_TAG));
        return Buffer.concat([d.update(crudo.subarray(LARGO_IV + LARGO_TAG)), d.final()]).toString('utf8');
      } catch {
        return null;
      }
    },
  };
}
