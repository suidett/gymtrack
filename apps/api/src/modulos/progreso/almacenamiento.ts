// ─────────────────────────────────────────────────────────────────────────────
// Almacenamiento de fotos · Zona: Progreso (API)
//
// Qué hace: guarda y sirve los objetos privados (fotos de progreso) detrás de una interfaz única,
// para cambiar dónde viven sin tocar las rutas. Hoy hay un adaptador de disco local: los archivos
// quedan en ALMACENAMIENTO_DIR (o en una carpeta temporal en las pruebas) y las URLs firmadas que
// entrega son rutas de la API con un token HMAC que vence a los 15 minutos (fotos.ts). La
// interfaz ya trae lo que necesita un bucket (Firebase Storage o S3): URL firmada de subida y de
// lectura, existe, leer y borrar. Para Firebase hay que escribir un AdaptadorAlmacenamiento que
// devuelva las URLs firmadas del bucket y elegirlo con ALMACENAMIENTO_DRIVER=firebase.
// Tócalo cuando: agregues otro adaptador o cambie dónde se guardan los archivos en disco.
// No lo toques para: quién puede ver o subir una foto (index.ts) ni cómo se firma el token (fotos.ts).
// Depende de: node:fs y node:path.
// ─────────────────────────────────────────────────────────────────────────────
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

export interface UrlFirmada {
  url: string;
  metodo: 'PUT' | 'GET';
  headers: Record<string, string>;
  venceAt: Date;
}

export interface OpcionesUrl {
  venceAt: Date;
  contentType?: string;
  /** La URL de la API ya firmada con HMAC. El adaptador de disco la entrega tal cual; uno de bucket la ignora. */
  urlApi: string;
}

/** Lo que cualquier almacenamiento de objetos privados tiene que saber hacer. */
export interface AdaptadorAlmacenamiento {
  readonly nombre: string;
  urlSubida(clave: string, o: OpcionesUrl): Promise<UrlFirmada>;
  urlLectura(clave: string, o: OpcionesUrl): Promise<UrlFirmada>;
  guardar(clave: string, datos: Buffer, contentType: string): Promise<void>;
  leer(clave: string): Promise<{ datos: Buffer; contentType: string } | null>;
  existe(clave: string): Promise<boolean>;
  /** Borra el objeto. Si ya no estaba, no falla (la purga puede reintentar, WRK-009). */
  borrar(clave: string): Promise<void>;
}

// ── Disco local ──────────────────────────────────────────────────────────────
const EXT_DE: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const TIPO_DE: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** La extensión del archivo para ese tipo de contenido. */
export const extensionDe = (contentType: string) => EXT_DE[contentType] ?? 'bin';

export function crearAlmacenamientoDisco(raiz: string): AdaptadorAlmacenamiento {
  const base = resolve(raiz);
  // La clave la arma la API, pero igual se revisa que no se salga de la carpeta.
  const ruta = (clave: string) => {
    const r = resolve(base, clave);
    if (!r.startsWith(base + sep)) throw new Error('Clave de almacenamiento fuera de la carpeta');
    return r;
  };
  return {
    nombre: 'disco',
    async urlSubida(_clave, o) {
      const headers: Record<string, string> = o.contentType ? { 'content-type': o.contentType } : {};
      return { url: o.urlApi, metodo: 'PUT', headers, venceAt: o.venceAt };
    },
    async urlLectura(_clave, o) {
      return { url: o.urlApi, metodo: 'GET', headers: {}, venceAt: o.venceAt };
    },
    async guardar(clave, datos) {
      const r = ruta(clave);
      await mkdir(dirname(r), { recursive: true });
      await writeFile(r, datos);
    },
    async leer(clave) {
      try {
        const datos = await readFile(ruta(clave));
        const ext = clave.split('.').pop() ?? '';
        return { datos, contentType: TIPO_DE[ext] ?? 'application/octet-stream' };
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw e;
      }
    },
    async existe(clave) {
      try {
        return (await stat(ruta(clave))).isFile();
      } catch {
        return false;
      }
    },
    async borrar(clave) {
      await rm(ruta(clave), { force: true });
    },
  };
}

// ── Elección por entorno ─────────────────────────────────────────────────────
let actual: AdaptadorAlmacenamiento | undefined;

/**
 * El almacenamiento de la API y el worker, según ALMACENAMIENTO_DRIVER (disco por defecto).
 * En pruebas, la carpeta es temporal y única por proceso.
 */
export function almacenamiento(env: Record<string, string | undefined> = process.env): AdaptadorAlmacenamiento {
  if (actual) return actual;
  const driver = env.ALMACENAMIENTO_DRIVER ?? 'disco';
  if (driver !== 'disco') {
    throw new Error(`ALMACENAMIENTO_DRIVER=${driver} todavía no tiene adaptador: hoy solo existe «disco»`);
  }
  const raiz =
    env.ALMACENAMIENTO_DIR ??
    (env.NODE_ENV === 'test' ? join(tmpdir(), `gymtrack-almacenamiento-${process.pid}`) : join(process.cwd(), 'almacenamiento'));
  actual = crearAlmacenamientoDisco(raiz);
  return actual;
}

/** Cambia el almacenamiento (pruebas de la purga que simulan un bucket que falla). Sin argumento vuelve al de entorno. */
export function fijarAlmacenamiento(a?: AdaptadorAlmacenamiento): void {
  actual = a;
}
