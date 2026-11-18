// ─────────────────────────────────────────────────────────────────────────────
// Dispositivos que reciben avisos · Zona: Notificaciones (API)
//
// Qué hace: guarda, lista y borra los teléfonos y navegadores de cada usuario en push_tokens:
//   token_hash       SHA-256 de «aviso:<tipo>:<token de Expo o endpoint web>»: no se duplica y un
//                    teléfono que cambia de cuenta queda de quien lo registró último.
//   tipo             expo (app Android) o web (app web del iPhone).
//   plataforma       android, ios o web.
//   destino_cifrado  el token o la suscripción con sus llaves, cifrado con ./cifrado.ts: en la
//                    base no queda nada en claro (SEG-003).
// Las filas sin destino (las que dejaba POST /me/push-tokens antes, solo con el hash) no sirven
// para mandar y aquí se ignoran.
// Cada usuario guarda hasta 10 dispositivos; al registrar el undécimo se borra el más viejo.
// Tócalo cuando: cambie la tabla o cuántos dispositivos se guardan.
// No lo toques para: cómo se manda (./proveedores.ts) ni cuándo (./servicio.ts, ./eventos.ts).
// Depende de: la base, src/seguridad/tokens.ts (hash), ./cifrado y @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import type { DispositivoAviso, DispositivoAvisoEntrada, PlataformaAviso } from '@gymtrack/shared';
import { esDuplicado, type BaseDeDatos } from '../../db';
import { hashToken } from '../../seguridad/tokens';
import type { Cifrador } from './cifrado';

export const MAXIMO_DISPOSITIVOS = 10;

export interface DestinoWeb {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface Base {
  id: string;
  usuarioId: string;
  plataforma: PlataformaAviso;
  createdAt: Date;
}
export type DispositivoExpo = Base & { tipo: 'expo'; destino: { token: string } };
export type DispositivoWeb = Base & { tipo: 'web'; destino: DestinoWeb };
export type Dispositivo = DispositivoExpo | DispositivoWeb;

export interface AlmacenDispositivos {
  guardar(usuarioId: string, entrada: DispositivoAvisoEntrada): Promise<{ nuevo: boolean; dispositivo: DispositivoAviso }>;
  /** Borra uno del usuario. false si no existe o es de otro. */
  borrar(usuarioId: string, id: string): Promise<boolean>;
  /** Los vigentes del usuario, del más nuevo al más viejo. Borra los que ya no se pueden leer. */
  activosDe(usuarioId: string): Promise<Dispositivo[]>;
  /** Borra los que el proveedor dijo que ya no existen. */
  invalidar(ids: readonly string[]): Promise<void>;
}

const TIPOS = new Set(['expo', 'web']);
const PLATAFORMAS = new Set(['android', 'ios', 'web']);

function aApi(f: { id: string; tipo: string; plataforma: string; createdAt: Date }): DispositivoAviso {
  return { id: f.id, tipo: f.tipo as 'expo' | 'web', plataforma: f.plataforma as PlataformaAviso, created_at: f.createdAt.toISOString() };
}

export function crearAlmacenDispositivos(prisma: BaseDeDatos, cifrador: Cifrador): AlmacenDispositivos {
  /** Solo las filas de este módulo: con destino y de un tipo conocido. */
  const filtroPropias = { destinoCifrado: { not: null }, tipo: { in: ['expo', 'web'] } };

  return {
    async guardar(usuarioId, entrada) {
      const identidad = entrada.tipo === 'expo' ? entrada.token : entrada.suscripcion.endpoint;
      const destino = entrada.tipo === 'expo'
        ? { token: entrada.token }
        : { endpoint: entrada.suscripcion.endpoint, keys: { p256dh: entrada.suscripcion.keys.p256dh, auth: entrada.suscripcion.keys.auth } };
      const plataforma: PlataformaAviso = entrada.tipo === 'expo' ? entrada.plataforma : 'web';
      const tokenHash = hashToken(`aviso:${entrada.tipo}:${identidad}`);
      const datos = { usuarioId, tipo: entrada.tipo, plataforma, destinoCifrado: cifrador.cifrar(JSON.stringify(destino)) };

      const actualizar = (id: string) => prisma.pushToken.update({ where: { id }, data: { ...datos, revocadoAt: null } });
      let nuevo = false;
      let fila;
      const existente = await prisma.pushToken.findUnique({ where: { tokenHash } });
      if (existente) {
        // El mismo teléfono otra vez (o en otra cuenta): se actualizan el dueño y las llaves.
        fila = await actualizar(existente.id);
      } else {
        try {
          fila = await prisma.pushToken.create({ data: { ...datos, tokenHash } });
          nuevo = true;
        } catch (error) {
          if (!esDuplicado(error)) throw error;
          fila = await actualizar((await prisma.pushToken.findUniqueOrThrow({ where: { tokenHash } })).id);
        }
      }

      // Hasta MAXIMO_DISPOSITIVOS por persona: los más viejos se van.
      const sobrantes = await prisma.pushToken.findMany({
        where: { usuarioId, revocadoAt: null, ...filtroPropias },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: MAXIMO_DISPOSITIVOS,
        select: { id: true },
      });
      if (sobrantes.length) await prisma.pushToken.deleteMany({ where: { id: { in: sobrantes.map((s) => s.id) } } });
      return { nuevo, dispositivo: aApi(fila) };
    },

    async borrar(usuarioId, id) {
      const r = await prisma.pushToken.deleteMany({ where: { id, usuarioId, ...filtroPropias } });
      return r.count > 0;
    },

    async activosDe(usuarioId) {
      const filas = await prisma.pushToken.findMany({
        where: { usuarioId, revocadoAt: null, ...filtroPropias },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: MAXIMO_DISPOSITIVOS,
      });
      const listos: Dispositivo[] = [];
      const ilegibles: string[] = [];
      for (const f of filas) {
        const conocida = TIPOS.has(f.tipo) && PLATAFORMAS.has(f.plataforma);
        const texto = conocida && f.destinoCifrado ? cifrador.descifrar(f.destinoCifrado) : null;
        let destino: unknown;
        try {
          destino = texto ? JSON.parse(texto) : null;
        } catch {
          destino = null;
        }
        const base = { id: f.id, usuarioId: f.usuarioId, plataforma: f.plataforma as PlataformaAviso, createdAt: f.createdAt };
        if (f.tipo === 'expo' && typeof (destino as { token?: unknown })?.token === 'string') {
          listos.push({ ...base, tipo: 'expo', destino: destino as { token: string } });
        } else if (f.tipo === 'web' && typeof (destino as DestinoWeb)?.endpoint === 'string' && (destino as DestinoWeb).keys) {
          listos.push({ ...base, tipo: 'web', destino: destino as DestinoWeb });
        } else {
          // Otra llave (cambió JWT_SECRET) o alterado: no sirve para mandar. La app lo vuelve a registrar.
          ilegibles.push(f.id);
        }
      }
      if (ilegibles.length) await prisma.pushToken.deleteMany({ where: { id: { in: ilegibles } } });
      return listos;
    },

    async invalidar(ids) {
      if (ids.length) await prisma.pushToken.deleteMany({ where: { id: { in: [...ids] } } });
    },
  };
}
