// ─────────────────────────────────────────────────────────────────────────────
// Ingreso con Google · Zona: Cuentas (API)
//
// Qué hace: POST /v1/auth/google. Recibe el id_token que Google le dio a la app, lo verifica con
// google-auth-library (firma con los certificados de Google, emisor, vencimiento) y revisa que
// su audiencia sea uno de los client ID de GOOGLE_CLIENT_IDS (web y Android, leídos en
// src/config.ts) y que Google diga
// que el correo está verificado. Después:
//   - si la cuenta de Google ya está vinculada (google_sub), entra a esa cuenta;
//   - si el correo ya tiene cuenta, entra y la deja vinculada: guarda el `sub` de Google y marca
//     email_verified_at. Una cuenta ya vinculada a otra cuenta de Google no entra (401);
//   - si no, y el envío no trae rol, responde `falta_rol` con el nombre que da Google;
//   - si trae rol, nombre y apellido, crea la cuenta sin contraseña conocida y entra.
// Entrega la misma sesión que el ingreso normal. Tope de 5 intentos por minuto por IP (como el
// ingreso); crear la cuenta cuenta además en el tope de registros por IP.
// Tócalo cuando: cambie qué se exige del token de Google o qué pasa con una cuenta nueva.
// No lo toques para: la forma de la entrada o la salida (packages/shared/src/api/cuentas.ts) ni
// cómo se emiten los tokens (servicio.ts).
// Depende de: google-auth-library, ./servicio, src/seguridad/limitador.ts y @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { esquemaEmail, RESPUESTAS_ERROR_API, RUTAS_CUENTAS, type PerfilGoogle, type RespuestaGoogle } from '@gymtrack/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { OAuth2Client } from 'google-auth-library';
import { esDuplicado, type BaseDeDatos } from '../db';
import { ErrorApi } from '../errores';
import type { Usuario } from '../generado/prisma/client';
import type { Reloj } from '../reloj';
import { claveDeIp, type Limitador } from '../seguridad/limitador';
import type { ServicioCuentas } from './servicio';

declare module '../app' {
  interface Internos {
    /** El verificador del ingreso con Google. Las pruebas lo cambian por uno con llaves propias. */
    google?: { verificador: VerificadorGoogle };
  }
}

// ── Configuración ────────────────────────────────────────────────────────────
// GOOGLE_CLIENT_IDS se lee y se valida en src/config.ts (config.google.clientIds) junto con las
// demás variables: un valor mal escrito no deja arrancar la API. Se reexporta para las pruebas.
export { leerClientIdsGoogle } from '../config';

// ── Verificador ──────────────────────────────────────────────────────────────
/** Lo que la API usa del token de Google, ya verificado. */
export interface IdentidadGoogle {
  /** El id estable de la persona en Google (claim `sub`). */
  sub: string;
  /** En minúsculas y sin espacios, como lo guarda la API. */
  email: string;
  emailVerificado: boolean;
  /** given_name y family_name, recortados a 80 (pueden venir vacíos). */
  nombre: string;
  apellido: string;
}

/**
 * Por qué no sirve un token: `token_invalido` (firma, emisor, vencido, basura), `cliente_ajeno`
 * (pedido para otra app), `sin_correo` (Google no mandó un correo con forma de correo) o
 * `servicio_caido` (no se pudieron bajar los certificados de Google).
 * `otra_cuenta_google` no sale del verificador: la cuenta del correo ya está vinculada a otra
 * cuenta de Google.
 */
export type MotivoRechazoGoogle = 'token_invalido' | 'cliente_ajeno' | 'sin_correo' | 'servicio_caido';

export class RechazoGoogle extends Error {
  constructor(readonly motivo: MotivoRechazoGoogle) {
    // El mensaje nunca lleva el token: google-auth-library lo pega entero en los suyos.
    super(`Token de Google rechazado: ${motivo}`);
    this.name = 'RechazoGoogle';
  }
}

export interface VerificadorGoogle {
  readonly clientIds: readonly string[];
  /** Devuelve la identidad o lanza RechazoGoogle. */
  verificar(idToken: string): Promise<IdentidadGoogle>;
}

/** Los emisores que acepta Google para sus id_token. */
const EMISORES = ['accounts.google.com', 'https://accounts.google.com'];
/** Un id_token de Google dura 1 hora; uno que dice durar más de 1 día no es de Google. */
const VIDA_MAXIMA_S = 86_400;
const recortar = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 80) : '');

/**
 * El verificador real. `certificados` es para las pruebas: por defecto se bajan los de Google
 * (google-auth-library los guarda en memoria lo que diga su Cache-Control).
 */
export function crearVerificadorGoogle(o: {
  clientIds: readonly string[];
  certificados?: () => Promise<Record<string, string>>;
}): VerificadorGoogle {
  const cliente = new OAuth2Client();
  const certificados =
    o.certificados ?? (async () => (await cliente.getFederatedSignonCertsAsync()).certs as Record<string, string>);
  return {
    clientIds: o.clientIds,
    async verificar(idToken) {
      let certs: Record<string, string>;
      try {
        certs = await certificados();
      } catch {
        throw new RechazoGoogle('servicio_caido');
      }
      let datos: Record<string, unknown> | undefined;
      try {
        // Sin audiencia aquí: se revisa abajo, para distinguir «token de otra app» de «token malo».
        const ticket = await cliente.verifySignedJwtWithCertsAsync(idToken, certs, undefined, EMISORES, VIDA_MAXIMA_S);
        datos = ticket.getPayload() as Record<string, unknown> | undefined;
      } catch {
        throw new RechazoGoogle('token_invalido');
      }
      if (!datos || typeof datos.sub !== 'string' || !datos.sub) throw new RechazoGoogle('token_invalido');
      if (typeof datos.aud !== 'string' || !o.clientIds.includes(datos.aud)) throw new RechazoGoogle('cliente_ajeno');
      const email = esquemaEmail.safeParse(datos.email);
      if (!email.success) throw new RechazoGoogle('sin_correo');
      return {
        sub: datos.sub,
        email: email.data,
        // Google lo manda como booleano; algunos tokens antiguos, como texto.
        emailVerificado: datos.email_verified === true || datos.email_verified === 'true',
        nombre: recortar(datos.given_name) || recortar(datos.name),
        apellido: recortar(datos.family_name),
      };
    },
  };
}

// ── Lógica del ingreso ───────────────────────────────────────────────────────
interface DependenciasGoogle {
  cuentas: ServicioCuentas;
  prisma: BaseDeDatos;
  reloj: Reloj;
}

/**
 * Entra a la cuenta y la deja vinculada a esa cuenta de Google: guarda el `sub` (si no lo tenía)
 * y marca email_verified_at (Google confirmó el correo). Si la cuenta ya está vinculada a otra
 * cuenta de Google, no entra: 401 con motivo `otra_cuenta_google`.
 */
async function entrarExistente(d: DependenciasGoogle, u: Usuario, sub: string) {
  if (u.deletedAt) throw new ErrorApi('ACCOUNT_DELETED');
  if (u.googleSub && u.googleSub !== sub) {
    throw new ErrorApi(
      'INVALID_CREDENTIALS',
      { proveedor: 'google', motivo: 'otra_cuenta_google' },
      'Esta cuenta de GymTrack está vinculada a otra cuenta de Google. Entra con esa o con tu correo y contraseña.',
    );
  }
  const cambios = {
    ...(u.googleSub ? {} : { googleSub: sub }),
    ...(u.emailVerifiedAt ? {} : { emailVerifiedAt: d.reloj.ahora() }),
  };
  let vinculado = u;
  if (Object.keys(cambios).length) {
    try {
      vinculado = await d.prisma.usuario.update({ where: { id: u.id }, data: cambios });
    } catch (err) {
      // Ese `sub` ya quedó en otra cuenta (dos envíos a la vez con correos distintos): no se vincula dos veces.
      if (esDuplicado(err)) {
        throw new ErrorApi('INVALID_CREDENTIALS', { proveedor: 'google', motivo: 'otra_cuenta_google' }, 'Esa cuenta de Google ya está vinculada a otra cuenta de GymTrack.');
      }
      throw err;
    }
  }
  return d.cuentas.abrirSesion(vinculado);
}

export async function ingresarConGoogle(
  d: DependenciasGoogle,
  id: IdentidadGoogle,
  cuenta: { rol?: 'trainer' | 'client'; nombre?: string; apellido?: string },
  antesDeCrear: () => void,
): Promise<RespuestaGoogle> {
  if (!id.emailVerificado) {
    throw new ErrorApi(
      'BUSINESS_RULE',
      { regla: 'google_correo_sin_verificar' },
      'Tu cuenta de Google no tiene el correo verificado. Verifícalo en Google o crea tu cuenta con correo y contraseña.',
    );
  }
  // Primero por el `sub` (la persona pudo cambiar el correo de su cuenta de Google) y después por
  // el correo verificado.
  const existente =
    (await d.prisma.usuario.findUnique({ where: { googleSub: id.sub } })) ??
    (await d.prisma.usuario.findUnique({ where: { email: id.email } }));
  if (existente) return { resultado: 'sesion', cuenta_nueva: false, ...(await entrarExistente(d, existente, id.sub)) };

  if (!cuenta.rol || cuenta.nombre === undefined || cuenta.apellido === undefined) {
    const perfil: PerfilGoogle = { email: id.email, nombre: id.nombre, apellido: id.apellido };
    return { resultado: 'falta_rol', perfil };
  }

  antesDeCrear();
  try {
    const sesion = await d.cuentas.registrarSinContrasena({
      rol: cuenta.rol, nombre: cuenta.nombre, apellido: cuenta.apellido, email: id.email, googleSub: id.sub,
    });
    return { resultado: 'sesion', cuenta_nueva: true, ...sesion };
  } catch (err) {
    // Dos envíos a la vez (doble toque): el segundo choca con el índice único y entra a la que
    // creó el primero.
    if (err instanceof ErrorApi && err.codigo === 'EMAIL_TAKEN') {
      const creada = await d.prisma.usuario.findUnique({ where: { email: id.email } });
      if (creada) return { resultado: 'sesion', cuenta_nueva: false, ...(await entrarExistente(d, creada, id.sub)) };
    }
    throw err;
  }
}

// ── Ruta ─────────────────────────────────────────────────────────────────────
export interface OpcionesRutaGoogle {
  cuentas: ServicioCuentas;
  prisma: BaseDeDatos;
  /** Intentos por IP, con el tope del ingreso (5 por minuto). */
  limitadorIntentos: Limitador;
  /** El de registros por IP: solo cuenta cuando se crea una cuenta. */
  limitadorRegistro: Limitador;
  /** Por defecto, el real con los client ID de la configuración (GOOGLE_CLIENT_IDS). */
  verificador?: VerificadorGoogle;
  clientIds: readonly string[];
}

const RESPUESTA_TOKEN: Record<Exclude<MotivoRechazoGoogle, 'servicio_caido'>, string> = {
  token_invalido: 'No pudimos confirmar tu cuenta de Google. Intenta de nuevo.',
  cliente_ajeno: 'Ese ingreso con Google no es de GymTrack.',
  sin_correo: 'Tu cuenta de Google no nos entregó un correo.',
};

function revisarLimite(limitador: Limitador, clave: string) {
  const r = limitador.intentar(clave);
  if (!r.permitido) throw new ErrorApi('RATE_LIMITED', { reintentar_en_s: r.reintentarEnS }, undefined, r.reintentarEnS);
}

export function rutaGoogle(appBase: FastifyInstance, o: OpcionesRutaGoogle) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const R = RUTAS_CUENTAS.google;
  const reloj = appBase.gymtrack.reloj;
  appBase.gymtrack.google = { verificador: o.verificador ?? crearVerificadorGoogle({ clientIds: o.clientIds }) };

  app.post(
    R.ruta,
    { schema: { body: R.cuerpo, response: { [R.exito]: R.respuesta, ...RESPUESTAS_ERROR_API } as Record<200, typeof R.respuesta> & typeof RESPUESTAS_ERROR_API } },
    async (req) => {
      const ip = claveDeIp(req.ip);
      revisarLimite(o.limitadorIntentos, ip);
      // Se lee en cada pedido: así las pruebas cambian el verificador después de armar la app.
      const verificador = appBase.gymtrack.google!.verificador;
      if (verificador.clientIds.length === 0) {
        throw new ErrorApi('SERVICE_UNAVAILABLE', { motivo: 'google_no_configurado' }, 'El ingreso con Google no está disponible ahora.');
      }
      let id: IdentidadGoogle;
      try {
        id = await verificador.verificar(req.body.id_token);
      } catch (err) {
        if (!(err instanceof RechazoGoogle)) throw err;
        // Al log solo el motivo: ni el token ni el correo (SEG-018).
        req.log.info({ motivo: err.motivo }, 'ingreso con Google rechazado');
        if (err.motivo === 'servicio_caido') {
          throw new ErrorApi('SERVICE_UNAVAILABLE', { motivo: 'google_sin_respuesta' }, 'No pudimos hablar con Google. Intenta de nuevo en un momento.');
        }
        throw new ErrorApi('INVALID_CREDENTIALS', { proveedor: 'google', motivo: err.motivo }, RESPUESTA_TOKEN[err.motivo]);
      }
      return ingresarConGoogle({ cuentas: o.cuentas, prisma: o.prisma, reloj }, id, req.body, () => revisarLimite(o.limitadorRegistro, ip));
    },
  );
}
