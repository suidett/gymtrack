// ─────────────────────────────────────────────────────────────────────────────
// Pruebas del ingreso con Google en la app · Zona: Acceso
//
// Qué hace: prueba sin teléfono, sin red y sin Google la lógica de «Continuar con Google»: qué
// client ID usa cada plataforma, cómo se lee lo que devuelve Google (Android y web), qué mensaje
// sale en cada falla (cancelado, sin red, correo sin verificar, token rechazado, 429), la
// validación de «Completa tu cuenta» y el cuerpo que se manda a la API.
// Cada prueba lleva el id del plan (docs/pruebas/plan-de-validacion.md, GOO).
// Tócalo cuando: cambie google.ts, googleApi.ts o validarCuentaGoogle.
// Depende de: vitest, @gymtrack/shared y los archivos de ../.
// ─────────────────────────────────────────────────────────────────────────────
import { ErrorDeApi, esquemaRespuestaGoogle } from '@gymtrack/shared';
import { describe, expect, it } from 'vitest';
import {
  clientIdPara,
  errorDeGoogle,
  formDesdePerfil,
  leerAutorizacion,
  leerClientIdsGoogle,
  leerRetornoWeb,
  MENSAJES_GOOGLE,
  mensajeDeFallo,
  nonceDeIdToken,
} from '../google';
import { enviarAGoogle, RUTA_GOOGLE, type LlamadorPublico } from '../googleApi';
import { validarCuentaGoogle } from '../validacion';

const WEB = '123456789012-web0de0prueba.apps.googleusercontent.com';
const ANDROID = '123456789012-android0de0prueba.apps.googleusercontent.com';

/** Un JWT con la forma de un id_token (sin firma real: la revisa la API, no la app). */
function idToken(datos: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'RS256', kid: 'x' })}.${b64(datos)}.firma`;
}

const errorApi = (estado: number, codigo: ConstructorParameters<typeof ErrorDeApi>[1], detalles?: Record<string, unknown>, retry?: number) =>
  new ErrorDeApi(estado, codigo, 'mensaje de la API', detalles, retry);

describe('Ingreso con Google en la app', () => {
  it('GOO-020 cada plataforma usa su client ID; iPhone nativo y valores vacíos o con otra forma no muestran el botón', () => {
    const ids = leerClientIdsGoogle({ web: ` ${WEB} `, android: ANDROID });
    expect(ids).toEqual({ web: WEB, android: ANDROID });
    expect(clientIdPara('web', ids)).toBe(WEB);
    expect(clientIdPara('android', ids)).toBe(ANDROID);
    expect(clientIdPara('ios', ids)).toBeNull();
    expect(leerClientIdsGoogle({ web: '', android: 'mi-app' })).toEqual({ web: null, android: null });
    expect(leerClientIdsGoogle({})).toEqual({ web: null, android: null });
  });

  it('GOO-021 la respuesta de Google en Android: código, cancelado (cerrar o no aceptar) y error', () => {
    expect(leerAutorizacion({ type: 'success', params: { code: 'abc', state: 's' } })).toEqual({ tipo: 'codigo', codigo: 'abc' });
    expect(leerAutorizacion({ type: 'success', params: { id_token: 'x.y.z' } })).toEqual({ tipo: 'token', idToken: 'x.y.z' });
    expect(leerAutorizacion({ type: 'cancel' })).toEqual({ tipo: 'fallo', fallo: 'cancelado' });
    expect(leerAutorizacion({ type: 'dismiss' })).toEqual({ tipo: 'fallo', fallo: 'cancelado' });
    expect(leerAutorizacion({ type: 'error', params: { error: 'access_denied' } })).toEqual({ tipo: 'fallo', fallo: 'cancelado' });
    expect(leerAutorizacion({ type: 'error', params: { error: 'invalid_request' } })).toEqual({ tipo: 'fallo', fallo: 'proveedor' });
    expect(leerAutorizacion({ type: 'success', params: {} })).toEqual({ tipo: 'fallo', fallo: 'proveedor' });
    expect(leerAutorizacion({ type: 'locked' })).toEqual({ tipo: 'nada' });
  });

  it('GOO-022 la vuelta a /ingreso en web solo se acepta con el state y el nonce guardados', () => {
    const guardado = { state: 'estado-1', nonce: 'nonce-1', rol: 'entrenador' as const };
    const token = idToken({ nonce: 'nonce-1', email: 'valentina.soto@gmail.com' });
    expect(nonceDeIdToken(token)).toBe('nonce-1');
    expect(leerRetornoWeb('', guardado)).toEqual({ tipo: 'nada' });
    expect(leerRetornoWeb('#rol=entrenador', guardado)).toEqual({ tipo: 'nada' });
    expect(leerRetornoWeb(`#state=estado-1&id_token=${token}`, guardado)).toEqual({ tipo: 'token', idToken: token });
    // Otro state, nada guardado (otra pestaña, se borró) o un token de otro pedido: no entra.
    expect(leerRetornoWeb(`#state=otro&id_token=${token}`, guardado)).toEqual({ tipo: 'fallo', fallo: 'estado' });
    expect(leerRetornoWeb(`#state=estado-1&id_token=${token}`, null)).toEqual({ tipo: 'fallo', fallo: 'estado' });
    const ajeno = idToken({ nonce: 'otro-nonce' });
    expect(leerRetornoWeb(`#state=estado-1&id_token=${ajeno}`, guardado)).toEqual({ tipo: 'fallo', fallo: 'estado' });
    expect(leerRetornoWeb('#state=estado-1&error=access_denied', guardado)).toEqual({ tipo: 'fallo', fallo: 'cancelado' });
    expect(leerRetornoWeb('#state=estado-1', guardado)).toEqual({ tipo: 'fallo', fallo: 'proveedor' });
    expect(nonceDeIdToken('basura')).toBeNull();
  });

  it('GOO-023 cada falla tiene su mensaje: cancelado y sin red en gris, correo sin verificar, token, 429 con la espera', () => {
    expect(mensajeDeFallo('cancelado')).toMatchObject({ titulo: 'Ingreso con Google cancelado', tono: 'neutro' });
    expect(mensajeDeFallo('red')).toMatchObject({ titulo: 'Sin conexión', tono: 'neutro' });
    expect(errorDeGoogle(new TypeError('Network request failed'))).toEqual({ tipo: 'mensaje', mensaje: MENSAJES_GOOGLE.red });
    expect(errorDeGoogle(errorApi(422, 'BUSINESS_RULE', { regla: 'google_correo_sin_verificar' }))).toEqual({
      tipo: 'mensaje', mensaje: MENSAJES_GOOGLE.sinVerificar,
    });
    expect(errorDeGoogle(errorApi(401, 'INVALID_CREDENTIALS', { proveedor: 'google', motivo: 'token_invalido' }))).toEqual({
      tipo: 'mensaje', mensaje: MENSAJES_GOOGLE.token,
    });
    expect(errorDeGoogle(errorApi(401, 'INVALID_CREDENTIALS', { proveedor: 'google', motivo: 'cliente_ajeno' }))).toEqual({
      tipo: 'mensaje', mensaje: MENSAJES_GOOGLE.noDisponible,
    });
    expect(errorDeGoogle(errorApi(429, 'RATE_LIMITED', undefined, 42))).toEqual({ tipo: 'bloqueo', mensaje: MENSAJES_GOOGLE.bloqueo, esperaS: 42 });
    expect(errorDeGoogle(errorApi(429, 'RATE_LIMITED'))).toMatchObject({ tipo: 'bloqueo', esperaS: 60 });
    expect(errorDeGoogle(errorApi(401, 'ACCOUNT_DELETED'))).toEqual({ tipo: 'mensaje', mensaje: MENSAJES_GOOGLE.borrada });
    expect(errorDeGoogle(errorApi(503, 'SERVICE_UNAVAILABLE', { motivo: 'google_no_configurado' }))).toEqual({
      tipo: 'mensaje', mensaje: MENSAJES_GOOGLE.noDisponible,
    });
    expect(errorDeGoogle(errorApi(400, 'VALIDATION_ERROR', { campo: 'apellido' }))).toEqual({ tipo: 'campo', campo: 'apellido', mensaje: 'Revisa este dato.' });
    expect(errorDeGoogle(errorApi(500, 'INTERNAL_ERROR'))).toEqual({ tipo: 'mensaje', mensaje: MENSAJES_GOOGLE.otro });
    // Ningún texto con guion largo (regla de los textos de la app).
    for (const m of Object.values(MENSAJES_GOOGLE)) expect(`${m.titulo} ${m.texto}`).not.toMatch(/\u2014/);
  });

  it('GOO-024 «Completa tu cuenta» pide rol, nombre y apellido de 1 a 80, y parte con lo que dio Google', () => {
    const perfil = { email: 'valentina.soto@gmail.com', nombre: ' Valentina ', apellido: 'Soto' };
    expect(formDesdePerfil(perfil, 'cliente')).toEqual({ rol: 'cliente', nombre: 'Valentina', apellido: 'Soto' });
    expect(validarCuentaGoogle({ rol: 'cliente', nombre: 'Valentina', apellido: 'Soto' })).toEqual({});
    expect(validarCuentaGoogle({ rol: null, nombre: '  ', apellido: 'x'.repeat(81) })).toEqual({
      rol: 'Elige cómo vas a usar GymTrack.',
      nombre: 'Escribe tu nombre.',
      apellido: 'Tu apellido puede tener hasta 80 caracteres.',
    });
  });

  it('GOO-025 el cuerpo sale validado con el esquema de la API y la respuesta se lee con el mismo esquema', async () => {
    const llamadas: { metodo: string; ruta: string; op?: { cuerpo?: unknown; publica?: boolean } }[] = [];
    const respuesta = { resultado: 'falta_rol', perfil: { email: 'valentina.soto@gmail.com', nombre: 'Valentina', apellido: 'Soto' } };
    const api: LlamadorPublico = {
      async llamar<T>(metodo: string, ruta: string, op?: { cuerpo?: unknown; publica?: boolean; esquema?: { parse(d: unknown): T } }) {
        llamadas.push({ metodo, ruta, op });
        return op!.esquema!.parse(respuesta);
      },
    };
    const token = idToken({ nonce: 'n' });
    const r = await enviarAGoogle(api, { id_token: token });
    expect(r).toEqual(esquemaRespuestaGoogle.parse(respuesta));
    await enviarAGoogle(api, { id_token: token, rol: 'trainer', nombre: '  Valentina ', apellido: 'Soto' });
    expect(llamadas.map((l) => [l.metodo, l.ruta, l.op?.publica])).toEqual([
      ['POST', RUTA_GOOGLE, true],
      ['POST', '/v1/auth/google', true],
    ]);
    expect(llamadas[1]!.op!.cuerpo).toEqual({ id_token: token, rol: 'trainer', nombre: 'Valentina', apellido: 'Soto' });
    // Un rol sin nombre no sale del teléfono: el error de forma dice el campo.
    const sinNombre = await enviarAGoogle(api, { id_token: token, rol: 'client' }).catch((e: unknown) => e);
    expect(errorDeGoogle(sinNombre)).toEqual({ tipo: 'campo', campo: 'nombre', mensaje: 'Revisa este dato.' });
    expect(llamadas).toHaveLength(2);
  });
});
