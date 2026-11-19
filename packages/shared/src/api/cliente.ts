// ─────────────────────────────────────────────────────────────────────────────
// Cliente tipado de cuentas · Zona: Contrato
//
// Qué hace: un cliente mínimo para que la app llame a las rutas de cuentas (registrar, ingresar,
// renovar, cerrar sesión, recuperar y restablecer la contraseña, ver el perfil) con los mismos
// esquemas Zod que usa la API. Valida lo que manda y lo que recibe, y convierte el sobre de error
// en un ErrorDeApi con el código del catálogo. No guarda tokens ni reintenta: eso lo decide la
// app (tokens en expo-secure-store, §Seguridad). Todavía no hay pantallas conectadas.
// El refresh va de a uno: si la app pide renovar mientras ya hay una renovación en curso, espera
// esa misma en vez de mandar otra. Dos refresh simultáneos con el mismo token son, para la API,
// un reuso, y cierran la sesión en todos los dispositivos.
// Tócalo cuando: agregues una ruta al catálogo de cuentas.ts o cambie cómo se arma una llamada.
// No lo toques para: cambiar la forma de una respuesta (cuentas.ts) ni para guardar la sesión.
// Depende de: ./cuentas y ./errores. No usa tipos del DOM: recibe un fetch mínimo por parámetro,
// así corre igual en React Native, en Node y en las pruebas de la API.
// ─────────────────────────────────────────────────────────────────────────────
import type { z } from 'zod';
import { RUTAS_CUENTAS, type NombreRutaCuentas } from './cuentas';
import { CODIGOS_ERROR, esquemaSobreError, type CodigoError } from './errores';

// ── Tipos ────────────────────────────────────────────────────────────────────
/** Lo mínimo de fetch que usa el cliente (el fetch global de RN y de Node 22 calzan). */
export type FetchMinimo = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{
  status: number;
  headers: { get(nombre: string): string | null };
  json(): Promise<unknown>;
}>;

export interface OpcionesCliente {
  /** Origen de la API, sin barra final: `https://api-staging.<dominio>`. */
  urlBase: string;
  fetch: FetchMinimo;
  /** Devuelve el access vigente para las rutas autenticadas (GET /v1/me). */
  obtenerAccessToken?: () => string | null | Promise<string | null>;
}

/** Error con el código del catálogo. La app decide qué mostrar según `codigo`, no según el texto. */
export class ErrorDeApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: CodigoError,
    mensaje: string,
    readonly detalles?: Record<string, unknown>,
    /** Segundos que pide esperar un 429 (cabecera Retry-After, P-42). */
    readonly reintentarEnS?: number,
  ) {
    super(mensaje);
    this.name = 'ErrorDeApi';
  }
}

/**
 * El campo y el motivo de un error para mostrarlo junto al campo, venga de Zod (el cliente valida
 * antes de salir: el issue trae la ruta y el mensaje en español) o de la API (`details.campo` y
 * `details.motivo` de un 400, un 409 o un 422). `motivo` es null si el error no trae uno (queda el
 * mensaje general); `campo`, la ruta con puntos (`respuestas.peso_kg`, `dias.1.nombre`).
 */
export function detalleDeError(e: unknown): { campo: string | null; motivo: string | null } {
  if (e instanceof Error && e.name === 'ZodError') {
    const issue = (e as Error & { issues?: { path?: PropertyKey[]; message?: string }[] }).issues?.[0];
    return { campo: issue?.path?.length ? issue.path.map(String).join('.') : null, motivo: issue?.message ?? null };
  }
  if (e instanceof ErrorDeApi) {
    const d = e.detalles ?? {};
    const campo = typeof d.campo === 'string' ? d.campo : null;
    return { campo, motivo: typeof d.motivo === 'string' ? d.motivo : null };
  }
  return { campo: null, motivo: null };
}

type Ruta<N extends NombreRutaCuentas> = (typeof RUTAS_CUENTAS)[N];
type Cuerpo<N extends NombreRutaCuentas> =
  Ruta<N>['cuerpo'] extends z.ZodType ? z.input<Ruta<N>['cuerpo']> : undefined;
type Respuesta<N extends NombreRutaCuentas> = z.infer<Ruta<N>['respuesta']>;

// ── Cliente ──────────────────────────────────────────────────────────────────
export function crearClienteCuentas(opciones: OpcionesCliente) {
  async function llamar<N extends NombreRutaCuentas>(nombre: N, cuerpo: Cuerpo<N>): Promise<Respuesta<N>> {
    const ruta = RUTAS_CUENTAS[nombre];
    const headers: Record<string, string> = { accept: 'application/json' };
    let body: string | undefined;
    if (ruta.cuerpo) {
      // Se valida antes de salir: un error de forma se ve en la app, sin gastar una llamada.
      body = JSON.stringify((ruta.cuerpo as z.ZodType).parse(cuerpo));
      headers['content-type'] = 'application/json';
    }
    if (!ruta.publica) {
      const access = await opciones.obtenerAccessToken?.();
      if (access) headers.authorization = `Bearer ${access}`;
    }
    const res = await opciones.fetch(`${opciones.urlBase}${ruta.ruta}`, { method: ruta.metodo, headers, body });
    const json = await res.json().catch(() => null);
    if (res.status === ruta.exito) {
      return (ruta.respuesta as z.ZodType).parse(json) as Respuesta<N>;
    }
    const sobre = esquemaSobreError.safeParse(json);
    const retry = Number(res.headers.get('retry-after'));
    if (sobre.success) {
      const { code, message, details } = sobre.data.error;
      throw new ErrorDeApi(res.status, code, message, details, Number.isFinite(retry) && retry > 0 ? retry : undefined);
    }
    throw new ErrorDeApi(res.status, 'INTERNAL_ERROR', CODIGOS_ERROR.INTERNAL_ERROR.mensaje);
  }

  // ── Refresh de a uno ─────────────────────────────────────────────────────
  // Con el mismo token, todos reciben la promesa en curso. Con otro token (otra cuenta, o la app
  // ya guardó el nuevo), se espera a que termine la que está en curso antes de salir.
  let renovacion: { token: string; promesa: Promise<Respuesta<'renovar'>> } | undefined;
  function renovar(refreshToken: string): Promise<Respuesta<'renovar'>> {
    if (renovacion?.token === refreshToken) return renovacion.promesa;
    const antes = renovacion?.promesa.then(() => undefined, () => undefined) ?? Promise.resolve();
    const promesa: Promise<Respuesta<'renovar'>> = antes
      .then(() => llamar('renovar', { refresh_token: refreshToken }))
      .finally(() => {
        if (renovacion?.promesa === promesa) renovacion = undefined;
      });
    renovacion = { token: refreshToken, promesa };
    return promesa;
  }

  return {
    registrar: (datos: Cuerpo<'registrar'>) => llamar('registrar', datos),
    ingresar: (datos: Cuerpo<'ingresar'>) => llamar('ingresar', datos),
    /** Una sola renovación a la vez: las llamadas que llegan mientras hay una en curso la esperan. */
    renovar,
    cerrarSesion: (refreshToken: string) => llamar('cerrarSesion', { refresh_token: refreshToken }),
    olvideContrasena: (email: string) => llamar('olvideContrasena', { email }),
    restablecerContrasena: (datos: Cuerpo<'restablecerContrasena'>) => llamar('restablecerContrasena', datos),
    perfil: () => llamar('perfil', undefined),
    salud: () => llamar('salud', undefined),
  };
}

export type ClienteCuentas = ReturnType<typeof crearClienteCuentas>;
