// ─────────────────────────────────────────────────────────────────────────────
// Bandeja de notificaciones · Zona: Notificaciones (API)
//
// Qué hace: guarda y lee las notificaciones dentro de la app, las que muestra la campana de Hoy
// (alumno) y de Clientes (entrenador):
//   notificacionDeAviso  lo que deja un aviso en la campana: el mismo título, texto y ruta del
//                        push (o lo que el aviso diga en `notificacion`, como el correo de la
//                        noche, que no trae push), con el tipo y la clave del aviso.
//   crear                una por clave: el mismo aviso dos veces deja una sola (la clave es la
//                        misma de avisos_enviados). El servicio de avisos la llama SIEMPRE, antes
//                        del push: queda aunque no haya dispositivos, haya tope o el push falle.
//   listar               lo último primero (created_at y id, descendente), `limite` y `antes`
//                        (exclusivo), y cuántas hay sin leer. Una página no corta un mismo
//                        instante: las que comparten la hora de la última van todas, así la
//                        siguiente página con `antes` no se salta ninguna.
//   leer / leerTodas     marcan las propias como leídas (leer otra vez no cambia la hora). Una
//                        ajena o que no existe da null: la ruta responde 404 igual en los dos casos.
// Vive en la tabla notificaciones (migración 20261119000000_notificaciones). La demo
// (prisma/demo.ts) usa estas mismas funciones para dejar notificaciones en sus cuentas.
// Tócalo cuando: cambie qué se guarda de una notificación, cómo se pagina o qué es «leída».
// No lo toques para: cuándo sale un aviso (./eventos.ts, ./recordatorios.ts) ni sus textos
// (./textos.ts), ni la forma de la respuesta (packages/shared/src/api/notificaciones.ts).
// Depende de: la base (modelo Notificacion), src/compartido/semilla.ts (ids UUID v7 a partir de
// la clave) y @gymtrack/shared (la forma de la API).
// ─────────────────────────────────────────────────────────────────────────────
import type { Notificacion } from '@gymtrack/shared';
import { uuidV7Fijo } from '../../compartido/semilla';
import type { BaseDeDatos } from '../../db';
import type { Aviso } from './servicio';

// ── Tipos ────────────────────────────────────────────────────────────────────
/** Lo que se ve en la campana. `ruta` es la pantalla de la app que abre al tocarla. */
export interface ContenidoNotificacion {
  titulo: string;
  cuerpo: string;
  ruta: string;
}

export interface NuevaNotificacion extends ContenidoNotificacion {
  usuarioId: string;
  /** La clave del aviso (cierre:<sesión>, observacion:<id>, recordatorio:<alumno>:<día>...). */
  clave: string;
  tipo: string;
}

export interface FilaNotificacion extends ContenidoNotificacion {
  id: string;
  usuarioId: string;
  clave: string;
  tipo: string;
  leidaAt: Date | null;
  createdAt: Date;
}

export interface PaginaNotificaciones {
  items: FilaNotificacion[];
  sinLeer: number;
}

export interface Bandeja {
  /** Crea la notificación. false si ya había una con esa clave (no la pisa). */
  crear(n: NuevaNotificacion, ahora: Date): Promise<boolean>;
  listar(usuarioId: string, o: { limite: number; antes?: Date }): Promise<PaginaNotificaciones>;
  /** La marca leída si es de esa persona. null si no existe o es de otra. */
  leer(usuarioId: string, id: string, ahora: Date): Promise<FilaNotificacion | null>;
  /** Marca todas las de esa persona. Devuelve cuántas estaban sin leer. */
  leerTodas(usuarioId: string, ahora: Date): Promise<number>;
  contarSinLeer(usuarioId: string): Promise<number>;
}

// ── Del aviso a la notificación ──────────────────────────────────────────────
/**
 * Lo que deja un aviso en la campana de quien lo recibe: el mismo título, texto y ruta del push.
 * Si el aviso no trae push (el correo de la noche) usa su `notificacion`; sin ninguno de los dos,
 * null. Nunca agrega nada que el push no muestre (lo que escribe el alumno no va, INT-150).
 */
export function notificacionDeAviso(a: Pick<Aviso, 'tipo' | 'clave' | 'para' | 'push' | 'notificacion'>): NuevaNotificacion | null {
  const contenido = a.notificacion ?? (a.push ? { titulo: a.push.titulo, cuerpo: a.push.cuerpo, ruta: a.push.datos.url } : null);
  if (!contenido) return null;
  return { usuarioId: a.para.id, clave: a.clave, tipo: a.tipo, titulo: contenido.titulo, cuerpo: contenido.cuerpo, ruta: contenido.ruta };
}

/** La forma de la API (packages/shared, esquemaNotificacion). */
export function notificacionApi(f: FilaNotificacion): Notificacion {
  return {
    id: f.id, tipo: f.tipo, titulo: f.titulo, cuerpo: f.cuerpo, ruta: f.ruta, leida: f.leidaAt !== null, created_at: f.createdAt.toISOString(),
  };
}

// ── En la base (tabla notificaciones) ────────────────────────────────────────
export function crearBandeja(prisma: BaseDeDatos): Bandeja {
  const contarSinLeer = (usuarioId: string) => prisma.notificacion.count({ where: { usuarioId, leidaAt: null } });
  return {
    async crear(n, ahora) {
      // skipDuplicates: la clave (o el id que sale de ella) ya guardada no se pisa ni se duplica.
      const r = await prisma.notificacion.createMany({
        data: [{
          id: uuidV7Fijo(ahora, `notificacion:${n.clave}`), usuarioId: n.usuarioId, clave: n.clave, tipo: n.tipo,
          titulo: n.titulo, cuerpo: n.cuerpo, ruta: n.ruta, createdAt: ahora,
        }],
        skipDuplicates: true,
      });
      return r.count === 1;
    },

    async listar(usuarioId, { limite, antes }) {
      const orden = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
      const [filas, sinLeer] = await Promise.all([
        prisma.notificacion.findMany({ where: { usuarioId, ...(antes ? { createdAt: { lt: antes } } : {}) }, orderBy: orden, take: limite }),
        contarSinLeer(usuarioId),
      ]);
      const ultima = filas.at(-1);
      if (ultima && filas.length === limite) {
        // Las que comparten el instante de la última y quedaron fuera (van después por id).
        const resto = await prisma.notificacion.findMany({ where: { usuarioId, createdAt: ultima.createdAt, id: { lt: ultima.id } }, orderBy: orden });
        filas.push(...resto);
      }
      return { items: filas, sinLeer };
    },

    async leer(usuarioId, id, ahora) {
      // Un solo UPDATE con el dueño en el WHERE: lo ajeno no se toca ni se distingue de lo que no existe.
      await prisma.notificacion.updateMany({ where: { id, usuarioId, leidaAt: null }, data: { leidaAt: ahora } });
      return prisma.notificacion.findFirst({ where: { id, usuarioId } });
    },

    async leerTodas(usuarioId, ahora) {
      const r = await prisma.notificacion.updateMany({ where: { usuarioId, leidaAt: null }, data: { leidaAt: ahora } });
      return r.count;
    },

    contarSinLeer,
  };
}
