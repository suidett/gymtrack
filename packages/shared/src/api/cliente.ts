// ─────────────────────────────────────────────────────────────────────────────
// Cliente tipado de cuentas · Zona: Contrato
//
// Qué hace: un cliente mínimo para que la app llame a las rutas de cuentas (registrar, ingresar,
// renovar, cerrar sesión, recuperar y restablecer la contraseña, ver el perfil) con los mismos
// esquemas Zod que usa la API. Valida lo que manda y lo que recibe, y convierte el sobre de error
// en un ErrorDeApi con el código del catálogo. No guarda tokens ni reintenta: eso lo decide la
// app (tokens en expo-secure-store, §Seguridad). Todavía no hay pantallas conectadas.
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

  return {
    registrar: (datos: Cuerpo<'registrar'>) => llamar('registrar', datos),
    ingresar: (datos: Cuerpo<'ingresar'>) => llamar('ingresar', datos),
    renovar: (refreshToken: string) => llamar('renovar', { refresh_token: refreshToken }),
    cerrarSesion: (refreshToken: string) => llamar('cerrarSesion', { refresh_token: refreshToken }),
    olvideContrasena: (email: string) => llamar('olvideContrasena', { email }),
    restablecerContrasena: (datos: Cuerpo<'restablecerContrasena'>) => llamar('restablecerContrasena', datos),
    perfil: () => llamar('perfil', undefined),
    salud: () => llamar('salud', undefined),
  };
}

export type ClienteCuentas = ReturnType<typeof crearClienteCuentas>;
