// ─────────────────────────────────────────────────────────────────────────────
// Gestor de la sesión con la API · Zona: Sesión de cuenta
//
// Qué hace: guarda el par de tokens, renueva el access antes de que venza o cuando la API dice
// 401, repite la llamada una vez con el access nuevo y, si el refresh ya no sirve, borra todo y
// avisa a la app para que vuelva a Ingreso. Expone el cliente de cuentas de packages/shared y
// `llamar`, una llamada autenticada genérica para las rutas que cada área vaya sumando
// (rutinas, sesiones, ejercicios, alertas...). Guarda también el último usuario para poder abrir
// la app sin señal.
// Tócalo cuando: cambie cómo se renueva el token, qué se guarda en el teléfono o cómo se arma una
// llamada autenticada.
// No lo toques para: la forma de una ruta o de un error (packages/shared/src/api/), ni para el
// estado de React (SesionProvider.tsx en esta carpeta).
// Depende de: @gymtrack/shared (cliente de cuentas, ErrorDeApi, sobre de error). No importa nada
// de React Native: el almacén se inyecta, así las pruebas corren en Node.
// ─────────────────────────────────────────────────────────────────────────────
import {
  CODIGOS_ERROR,
  crearClienteCuentas,
  ErrorDeApi,
  esquemaSobreError,
  type ClienteCuentas,
  type EntradaIngreso,
  type EntradaRegistro,
  type FetchMinimo,
  type Tokens,
  type Usuario,
} from '@gymtrack/shared';

/** Tope para lo que corre antes de cerrar sesión (borrar el teléfono de los avisos). */
export const ESPERA_ANTES_DE_CERRAR_MS = 5_000;

// ── Tipos ────────────────────────────────────────────────────────────────────
/** Dónde vive la sesión en el teléfono. Los tokens van siempre a expo-secure-store (APP-005). */
export interface AlmacenSesion {
  leerTokens(): Promise<Tokens | null>;
  guardarTokens(t: Tokens): Promise<void>;
  leerUsuario(): Promise<Usuario | null>;
  guardarUsuario(u: Usuario): Promise<void>;
  borrar(): Promise<void>;
}

/** Por qué se cerró la sesión: la cerró la persona o la API ya no acepta el refresh. */
export type MotivoCierre = 'cerrada' | 'vencida';

export interface OpcionesGestor {
  urlBase: string;
  fetch: FetchMinimo;
  almacen: AlmacenSesion;
  /** Reloj inyectable para las pruebas. */
  ahora?: () => number;
  /** Se renueva el access si le quedan menos de estos milisegundos. */
  margenRenovacionMs?: number;
}

/** Opciones de una llamada autenticada genérica. */
export interface OpcionesLlamada<T> {
  /** Cuerpo JSON. */
  cuerpo?: unknown;
  /** Parámetros de la consulta (?q=remo&grupo=espalda). Los undefined no se mandan. */
  consulta?: Record<string, string | number | boolean | undefined | null>;
  /** Esquema Zod (o cualquier objeto con parse) para validar la respuesta. */
  esquema?: { parse(datos: unknown): T };
  /** Cabeceras extra (por ejemplo Idempotency-Key). */
  cabeceras?: Record<string, string>;
  /** Si es true, no manda el access (rutas públicas). */
  publica?: boolean;
}

/** Resultado de restaurar la sesión al abrir la app. */
export interface Restaurada {
  usuario: Usuario;
  /** true si la API no respondió y se usó el último usuario guardado. */
  sinConexion: boolean;
}

// Los 401 que se arreglan renovando el access. INVALID_CREDENTIALS y ACCOUNT_DELETED no.
const RENOVABLES = new Set(['TOKEN_EXPIRED', 'TOKEN_INVALID', 'UNAUTHENTICATED']);

// ── Gestor ───────────────────────────────────────────────────────────────────
export function crearGestorSesion(opciones: OpcionesGestor) {
  const { urlBase, fetch, almacen } = opciones;
  const ahora = opciones.ahora ?? (() => Date.now());
  const margen = opciones.margenRenovacionMs ?? 30_000;

  let tokens: Tokens | null = null;
  // Una sola renovación a la vez: si diez llamadas ven el access vencido, renuevan una vez.
  let renovando: Promise<Tokens | null> | null = null;
  const oyentes = new Set<(motivo: MotivoCierre) => void>();
  // Lo que otras partes de la app hacen con la sesión todavía abierta, justo antes de cerrarla
  // (los avisos borran este teléfono en la API).
  const previosAlCierre = new Set<() => Promise<unknown>>();

  const cliente: ClienteCuentas = crearClienteCuentas({
    urlBase,
    fetch,
    obtenerAccessToken: () => accessVigente(),
  });

  // ── Guardar y limpiar ──────────────────────────────────────────────────────
  async function establecer(t: Tokens) {
    tokens = t;
    await almacen.guardarTokens(t);
  }

  async function limpiar(motivo: MotivoCierre) {
    const habia = tokens !== null;
    tokens = null;
    await almacen.borrar();
    if (habia || motivo === 'cerrada') oyentes.forEach((f) => f(motivo));
  }

  // ── Renovación ─────────────────────────────────────────────────────────────
  /**
   * Usa el refresh para pedir un par nuevo. Si la API lo rechaza (401), la sesión termina.
   * Si falla la red, se deja todo como estaba y se lanza el error: sin señal no se cierra sesión.
   */
  function renovar(): Promise<Tokens | null> {
    if (!tokens) return Promise.resolve(null);
    if (!renovando) {
      const refresh = tokens.refresh_token;
      renovando = cliente
        .renovar(refresh)
        .then(async (r) => {
          await establecer(r.tokens);
          return r.tokens;
        })
        .catch(async (e: unknown) => {
          if (e instanceof ErrorDeApi && e.estado === 401) {
            await limpiar('vencida');
            return null;
          }
          throw e;
        })
        .finally(() => {
          renovando = null;
        });
    }
    return renovando;
  }

  /** El access vigente; si está por vencer, primero lo renueva. */
  async function accessVigente(): Promise<string | null> {
    if (!tokens) return null;
    const vence = Date.parse(tokens.access_vence_at);
    if (Number.isFinite(vence) && vence - ahora() <= margen) {
      try {
        const t = await renovar();
        return t?.access_token ?? null;
      } catch {
        // Sin red: se intenta con el que hay; si la API lo rechaza, conReintento vuelve a probar.
        return tokens?.access_token ?? null;
      }
    }
    return tokens.access_token;
  }

  /** Corre `fn`; si la API responde 401 renovable, renueva una vez y repite (APP-046). */
  async function conReintento<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof ErrorDeApi) || e.estado !== 401 || !RENOVABLES.has(e.codigo) || !tokens) throw e;
      const nuevos = await renovar();
      if (!nuevos) throw e;
      try {
        return await fn();
      } catch (e2) {
        if (e2 instanceof ErrorDeApi && e2.estado === 401) await limpiar('vencida');
        throw e2;
      }
    }
  }

  // ── Llamada genérica ───────────────────────────────────────────────────────
  /**
   * Llamada a cualquier ruta de la API con el access vigente, renovación incluida.
   * Devuelve el JSON validado con `esquema` (si lo pasas) o tal cual. Un 204 devuelve undefined.
   * Un error 4xx o 5xx llega como ErrorDeApi con el código del catálogo; sin red, el error de
   * fetch tal cual (TypeError), para que la pantalla muestre «Sin conexión».
   */
  async function llamar<T = unknown>(metodo: string, ruta: string, op: OpcionesLlamada<T> = {}): Promise<T> {
    const una = async (): Promise<T> => {
      const headers: Record<string, string> = { accept: 'application/json', ...op.cabeceras };
      let body: string | undefined;
      if (op.cuerpo !== undefined) {
        body = JSON.stringify(op.cuerpo);
        headers['content-type'] = 'application/json';
      }
      if (!op.publica) {
        const access = await accessVigente();
        if (access) headers.authorization = `Bearer ${access}`;
      }
      const res = await fetch(`${urlBase}${ruta}${armarConsulta(op.consulta)}`, { method: metodo, headers, body });
      if (res.status === 204) return undefined as T;
      const json = await res.json().catch(() => null);
      if (res.status >= 200 && res.status < 300) return op.esquema ? op.esquema.parse(json) : (json as T);
      throw aErrorDeApi(res.status, json, res.headers.get('retry-after'));
    };
    return op.publica ? una() : conReintento(una);
  }

  // ── Cuenta ─────────────────────────────────────────────────────────────────
  async function ingresar(datos: EntradaIngreso): Promise<Usuario> {
    const s = await cliente.ingresar(datos);
    await establecer(s.tokens);
    await almacen.guardarUsuario(s.usuario);
    return s.usuario;
  }

  async function registrar(datos: EntradaRegistro): Promise<Usuario> {
    const s = await cliente.registrar(datos);
    await establecer(s.tokens);
    await almacen.guardarUsuario(s.usuario);
    return s.usuario;
  }

  /**
   * Entra con una sesión que otra ruta ya entregó (POST /v1/auth/google): guarda los tokens y el
   * usuario igual que ingresar y registrar.
   */
  async function entrarConSesion(s: { usuario: Usuario; tokens: Tokens }): Promise<Usuario> {
    await establecer(s.tokens);
    await almacen.guardarUsuario(s.usuario);
    return s.usuario;
  }

  /**
   * Avisa a la API (si hay señal) y borra todo del teléfono. Nunca falla. Antes corre lo que se
   * pidió con antesDeCerrarSesion, con 5 s de tope: sin señal no hace esperar a nadie.
   */
  async function cerrarSesion(): Promise<void> {
    if (tokens && previosAlCierre.size) {
      let reloj: ReturnType<typeof setTimeout> | undefined;
      const tope = new Promise<void>((listo) => {
        reloj = setTimeout(listo, ESPERA_ANTES_DE_CERRAR_MS);
      });
      await Promise.race([Promise.allSettled([...previosAlCierre].map((f) => Promise.resolve().then(f))), tope]);
      clearTimeout(reloj);
    }
    const refresh = tokens?.refresh_token;
    if (refresh) await cliente.cerrarSesion(refresh).catch(() => undefined);
    await limpiar('cerrada');
  }

  /** Pide GET /v1/me de nuevo y lo guarda. */
  async function refrescarUsuario(): Promise<Usuario> {
    const u = await conReintento(() => cliente.perfil());
    await almacen.guardarUsuario(u);
    return u;
  }

  /**
   * Al abrir la app: lee los tokens guardados y pide el perfil. Devuelve null si no hay sesión
   * o si la API ya no la acepta. Sin señal devuelve el último usuario guardado.
   */
  async function restaurar(): Promise<Restaurada | null> {
    const t = await almacen.leerTokens();
    if (!t) return null;
    const venceRefresh = Date.parse(t.refresh_vence_at);
    if (Number.isFinite(venceRefresh) && venceRefresh <= ahora()) {
      await almacen.borrar();
      return null;
    }
    tokens = t;
    try {
      const usuario = await refrescarUsuario();
      return { usuario, sinConexion: false };
    } catch (e) {
      if (e instanceof ErrorDeApi) {
        if (e.estado === 401) {
          await limpiar('vencida');
          return null;
        }
      }
      // Sin red o la API caída: se entra con el último usuario conocido.
      const guardado = await almacen.leerUsuario();
      if (guardado && tokens) return { usuario: guardado, sinConexion: true };
      if (!tokens) return null;
      throw e;
    }
  }

  /** Algo que hacer con la sesión todavía abierta cuando la persona cierra sesión. Devuelve cómo quitarlo. */
  function antesDeCerrarSesion(fn: () => Promise<unknown>): () => void {
    previosAlCierre.add(fn);
    return () => {
      previosAlCierre.delete(fn);
    };
  }

  /** Avisa cuando la sesión termina (la persona salió o el refresh venció). Devuelve cómo dejar de escuchar. */
  function alCerrar(fn: (motivo: MotivoCierre) => void): () => void {
    oyentes.add(fn);
    return () => {
      oyentes.delete(fn);
    };
  }

  return {
    cliente,
    llamar,
    ingresar,
    registrar,
    entrarConSesion,
    cerrarSesion,
    refrescarUsuario,
    restaurar,
    alCerrar,
    antesDeCerrarSesion,
    accessVigente,
    tieneSesion: () => tokens !== null,
  };
}

export type GestorSesion = ReturnType<typeof crearGestorSesion>;

// ── Ayudas ───────────────────────────────────────────────────────────────────
function armarConsulta(consulta?: OpcionesLlamada<unknown>['consulta']): string {
  if (!consulta) return '';
  const partes = Object.entries(consulta)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return partes.length ? `?${partes.join('&')}` : '';
}

/** Convierte una respuesta de error en ErrorDeApi, con Retry-After si viene (P-42). */
export function aErrorDeApi(estado: number, json: unknown, retryAfter: string | null): ErrorDeApi {
  const sobre = esquemaSobreError.safeParse(json);
  const retry = Number(retryAfter);
  const reintentar = Number.isFinite(retry) && retry > 0 ? retry : undefined;
  if (sobre.success) {
    const { code, message, details } = sobre.data.error;
    return new ErrorDeApi(estado, code, message, details, reintentar);
  }
  return new ErrorDeApi(estado, 'INTERNAL_ERROR', CODIGOS_ERROR.INTERNAL_ERROR.mensaje, undefined, reintentar);
}

/** true si el error es de red (fetch no llegó a la API), para mostrar «Sin conexión». */
export function esSinConexion(e: unknown): boolean {
  return !(e instanceof ErrorDeApi) && e instanceof Error && (e.name === 'TypeError' || /network/i.test(e.message));
}
