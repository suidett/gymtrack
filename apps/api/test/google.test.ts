// Ingreso con Google (plan-de-validacion.md, GOO · Ingreso con Google).
// Nunca se llama a Google: los id_token se firman aquí con una llave RSA de la corrida y el
// verificador real (google-auth-library) recibe esa llave pública como si fuera de Google. Así se
// prueba la verificación de verdad (firma, emisor, vencimiento, audiencia) sin red.
// La primera parte no necesita base; la segunda corre contra PostgreSQL 16 real.
import { generateKeyPairSync, type KeyObject } from 'node:crypto';
import { esquemaIngresoGoogle } from '@gymtrack/shared';
import { SignJWT } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { crearVerificadorGoogle, leerClientIdsGoogle, RechazoGoogle, type VerificadorGoogle } from '../src/cuentas/google';
import { AHORA, CLAVE, describeConBase, payloadJwt, PERSONAS, usarEntorno } from './ayudantes';

// ── Llaves y tokens de prueba ────────────────────────────────────────────────
const LLAVE = generateKeyPairSync('rsa', { modulusLength: 2048 });
const OTRA_LLAVE = generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'llave-de-prueba';
const CERTIFICADOS = { [KID]: LLAVE.publicKey.export({ type: 'spki', format: 'pem' }) as string };
const WEB = '123456789012-web0de0prueba.apps.googleusercontent.com';
const ANDROID = '123456789012-android0de0prueba.apps.googleusercontent.com';
const AJENO = '999999999999-otra0app.apps.googleusercontent.com';

interface DatosToken {
  email?: string;
  email_verified?: boolean | string;
  aud?: string;
  iss?: string;
  sub?: string;
  given_name?: string;
  family_name?: string;
  /** Segundos desde ahora en que se emitió (negativo: en el pasado). */
  emitido?: number;
  llave?: KeyObject;
  kid?: string;
}

/** Un id_token con la forma de los de Google. google-auth-library mira la hora real, no el reloj de la API. */
async function tokenGoogle(d: DatosToken = {}): Promise<string> {
  const iat = Math.floor(Date.now() / 1000) + (d.emitido ?? 0);
  const aud = d.aud ?? ANDROID;
  return new SignJWT({
    email: 'email' in d ? d.email : 'valentina.soto@gmail.com',
    email_verified: d.email_verified ?? true,
    given_name: 'given_name' in d ? d.given_name : 'Valentina',
    family_name: 'family_name' in d ? d.family_name : 'Soto',
    azp: aud,
  })
    .setProtectedHeader({ alg: 'RS256', kid: d.kid ?? KID, typ: 'JWT' })
    .setIssuer(d.iss ?? 'https://accounts.google.com')
    .setAudience(aud)
    .setSubject(d.sub ?? '109876543210987654321')
    .setIssuedAt(iat)
    .setExpirationTime(iat + 3600)
    .sign(d.llave ?? LLAVE.privateKey);
}

const verificadorDePrueba = (clientIds: string[] = [WEB, ANDROID]): VerificadorGoogle =>
  crearVerificadorGoogle({ clientIds, certificados: async () => CERTIFICADOS });

async function motivoDe(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa;
    return 'aceptado';
  } catch (err) {
    expect(err).toBeInstanceOf(RechazoGoogle);
    return (err as RechazoGoogle).motivo;
  }
}

// ── Sin base: configuración, verificador y esquema ───────────────────────────
describe('Ingreso con Google sin base', () => {
  it('GOO-001 GOOGLE_CLIENT_IDS se lee separado por coma, sin repetidos; vacío deja el ingreso apagado; otra forma no deja arrancar', () => {
    expect(leerClientIdsGoogle({})).toEqual([]);
    expect(leerClientIdsGoogle({ GOOGLE_CLIENT_IDS: '  ' })).toEqual([]);
    expect(leerClientIdsGoogle({ GOOGLE_CLIENT_IDS: ` ${WEB} , ${ANDROID},${WEB}` })).toEqual([WEB, ANDROID]);
    expect(() => leerClientIdsGoogle({ GOOGLE_CLIENT_IDS: `${WEB},mi-app` })).toThrow(/GOOGLE_CLIENT_IDS/);
  });

  it('GOO-002 el verificador acepta un token válido de web y de Android y entrega el correo en minúsculas', async () => {
    const v = verificadorDePrueba();
    const id = await v.verificar(await tokenGoogle({ aud: WEB, email: ' Valentina.Soto@Gmail.com ' }));
    expect(id).toEqual({ sub: '109876543210987654321', email: 'valentina.soto@gmail.com', emailVerificado: true, nombre: 'Valentina', apellido: 'Soto' });
    expect((await v.verificar(await tokenGoogle({ aud: ANDROID }))).email).toBe('valentina.soto@gmail.com');
    // Algunos tokens traen email_verified como texto.
    expect((await v.verificar(await tokenGoogle({ email_verified: 'true' }))).emailVerificado).toBe(true);
    expect((await v.verificar(await tokenGoogle({ email_verified: false }))).emailVerificado).toBe(false);
  });

  it('GOO-003 el verificador rechaza un token de otro client ID, vencido, de otro emisor, firmado con otra llave o basura', async () => {
    const v = verificadorDePrueba();
    expect(await motivoDe(v.verificar(await tokenGoogle({ aud: AJENO })))).toBe('cliente_ajeno');
    // Vencido hace más de los 5 minutos de tolerancia de reloj.
    expect(await motivoDe(v.verificar(await tokenGoogle({ emitido: -2 * 3600 })))).toBe('token_invalido');
    expect(await motivoDe(v.verificar(await tokenGoogle({ iss: 'https://otro-emisor.example' })))).toBe('token_invalido');
    expect(await motivoDe(v.verificar(await tokenGoogle({ llave: OTRA_LLAVE.privateKey })))).toBe('token_invalido');
    expect(await motivoDe(v.verificar(await tokenGoogle({ kid: 'llave-que-no-existe' })))).toBe('token_invalido');
    expect(await motivoDe(v.verificar('aaa.bbb.ccc'))).toBe('token_invalido');
    expect(await motivoDe(v.verificar(await tokenGoogle({ email: undefined })))).toBe('sin_correo');
    expect(await motivoDe(v.verificar(await tokenGoogle({ email: 'no-es-correo' })))).toBe('sin_correo');
  });

  it('GOO-004 sin los certificados de Google el verificador dice servicio_caido, y el mensaje nunca lleva el token', async () => {
    const v = crearVerificadorGoogle({ clientIds: [WEB], certificados: async () => { throw new Error('sin red'); } });
    expect(await motivoDe(v.verificar(await tokenGoogle({ aud: WEB })))).toBe('servicio_caido');
    const token = await tokenGoogle({ llave: OTRA_LLAVE.privateKey });
    const err = await verificadorDePrueba().verificar(token).catch((e: Error) => e);
    expect(String((err as Error).message)).not.toContain(token.split('.')[1]);
  });

  it('GOO-005 la entrada es estricta: rol, nombre y apellido van los tres o ninguno, y el token tiene forma de JWT', () => {
    const token = 'aaa.bbb.ccc';
    expect(esquemaIngresoGoogle.safeParse({ id_token: token }).success).toBe(true);
    expect(esquemaIngresoGoogle.safeParse({ id_token: token, rol: 'client', nombre: 'Ana', apellido: 'Paz' }).success).toBe(true);
    const casos: [unknown, string][] = [
      [{ id_token: token, rol: 'admin', nombre: 'Ana', apellido: 'Paz' }, 'rol'],
      [{ id_token: token, rol: 'client' }, 'nombre'],
      [{ id_token: token, nombre: 'Ana', apellido: 'Paz' }, 'rol'],
      [{ id_token: token, rol: 'trainer', nombre: '   ', apellido: 'Paz' }, 'nombre'],
      [{ id_token: token, rol: 'trainer', nombre: 'Ana', apellido: 'x'.repeat(81) }, 'apellido'],
      [{ id_token: 'no es un jwt' }, 'id_token'],
      [{ id_token: `a.b.${'c'.repeat(5000)}` }, 'id_token'],
      [{ id_token: token, email: 'otro@gymtrack.test' }, ''],
    ];
    for (const [entrada, campo] of casos) {
      const r = esquemaIngresoGoogle.safeParse(entrada);
      expect(r.success, JSON.stringify(entrada)).toBe(false);
      if (campo) expect(r.error!.issues[0]!.path[0]).toBe(campo);
    }
  });
});

// ── Con base: la ruta ────────────────────────────────────────────────────────
describeConBase('Ingreso con Google', () => {
  const e = usarEntorno();
  beforeAll(() => {
    e.app.gymtrack.google = { verificador: verificadorDePrueba() };
  });
  const google = (payload: Record<string, unknown>, ip = '203.0.113.10') =>
    e.pedir({ method: 'POST', url: '/v1/auth/google', payload, remoteAddress: ip });
  const CORREO = 'valentina.soto@gmail.com';

  it('GOO-006 una cuenta existente entra con la misma sesión que el ingreso y queda vinculada', async () => {
    const { usuario } = await e.registrar('martina');
    const r = await google({ id_token: await tokenGoogle({ email: PERSONAS.martina.email }) });
    expect(r.status).toBe(200);
    expect(r.json.resultado).toBe('sesion');
    expect(r.json.cuenta_nueva).toBe(false);
    expect(r.json.usuario).toMatchObject({ id: usuario.id, rol: 'client', encuesta_pendiente: true });
    const p = payloadJwt(r.json.tokens.access_token);
    expect(p.exp - p.iat).toBe(900);
    expect(new Date(r.json.tokens.refresh_vence_at).getTime() - new Date(AHORA).getTime()).toBe(30 * 86_400_000);
    const fila = await e.prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(fila.emailVerifiedAt?.toISOString()).toBe(AHORA);
    expect(fila.googleSub).toBe('109876543210987654321');
    // El access sirve y la contraseña de siempre sigue sirviendo.
    expect((await e.pedir({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${r.json.tokens.access_token}` } })).status).toBe(200);
    expect((await e.ingresar('martina')).status).toBe(200);
  });

  it('GOO-007 un correo sin cuenta y sin rol responde falta_rol con el perfil de Google y no crea nada', async () => {
    const r = await google({ id_token: await tokenGoogle({ aud: WEB }) });
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ resultado: 'falta_rol', perfil: { email: CORREO, nombre: 'Valentina', apellido: 'Soto' } });
    expect(await e.prisma.usuario.count()).toBe(0);
    expect(await e.prisma.refreshToken.count()).toBe(0);
  });

  it('GOO-008 con rol, nombre y apellido crea la cuenta sin contraseña conocida; con correo entra solo después de crearla', async () => {
    const idToken = await tokenGoogle();
    const r = await google({ id_token: idToken, rol: 'trainer', nombre: '  Valentina ', apellido: 'Soto Díaz' });
    expect(r.status).toBe(200);
    expect(r.json.resultado).toBe('sesion');
    expect(r.json.cuenta_nueva).toBe(true);
    expect(r.json.usuario).toMatchObject({ email: CORREO, rol: 'trainer', nombre: 'Valentina', apellido: 'Soto Díaz', encuesta_pendiente: false });
    const fila = await e.prisma.usuario.findUniqueOrThrow({ where: { email: CORREO } });
    expect(fila.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(fila.emailVerifiedAt?.toISOString()).toBe(AHORA);
    expect(fila.googleSub).toBe('109876543210987654321');
    await e.esperarCorreos();
    expect(e.buzon.ultimo(CORREO)?.etiqueta).toBe('bienvenida');
    // El mismo token otra vez entra a la cuenta que se acaba de crear.
    const otra = await google({ id_token: idToken });
    expect(otra.json).toMatchObject({ resultado: 'sesion', cuenta_nueva: false, usuario: { id: fila.id } });
    // Sin contraseña: el ingreso con correo da 401 hasta que la crea con «olvidé mi contraseña».
    const conCorreo = (password: string) => e.pedir({ method: 'POST', url: '/v1/auth/login', payload: { email: CORREO, password } });
    expect((await conCorreo(CLAVE)).json.error.code).toBe('INVALID_CREDENTIALS');
    expect((await e.pedir({ method: 'POST', url: '/v1/auth/password/forgot', payload: { email: CORREO } })).status).toBe(202);
    await e.esperarCorreos();
    const token = /token=([A-Za-z0-9_-]+)/.exec(e.buzon.ultimo(CORREO)!.texto)![1]!;
    expect((await e.pedir({ method: 'POST', url: '/v1/auth/password/reset', payload: { token, password: CLAVE } })).status).toBe(200);
    expect((await conCorreo(CLAVE)).status).toBe(200);
  });

  it('GOO-009 rol inválido, rol sin nombre o un campo de más dan 400 con el campo y no crean nada', async () => {
    const id_token = await tokenGoogle();
    const casos: [Record<string, unknown>, string][] = [
      [{ id_token, rol: 'admin', nombre: 'Valentina', apellido: 'Soto' }, 'rol'],
      [{ id_token, rol: 'client' }, 'nombre'],
      [{ id_token, rol: 'client', nombre: 'Valentina', apellido: '' }, 'apellido'],
      [{ id_token, email: 'otra@gymtrack.test' }, 'email'],
      [{}, 'id_token'],
    ];
    for (const [payload, campo] of casos) {
      const r = await google(payload);
      expect(r.status, JSON.stringify(payload)).toBe(400);
      expect(r.json.error.code).toBe('VALIDATION_ERROR');
      expect(r.json.error.details.campo).toBe(campo);
    }
    expect(await e.prisma.usuario.count()).toBe(0);
  });

  it('GOO-010 un correo sin verificar en Google da 422 y no entra ni crea, aunque la cuenta exista', async () => {
    await e.registrar('martina');
    const existente = await google({ id_token: await tokenGoogle({ email: PERSONAS.martina.email, email_verified: false }) });
    expect(existente.status).toBe(422);
    expect(existente.json.error).toMatchObject({ code: 'BUSINESS_RULE', details: { regla: 'google_correo_sin_verificar' } });
    const nueva = await google({ id_token: await tokenGoogle({ email_verified: false }), rol: 'client', nombre: 'Valentina', apellido: 'Soto' });
    expect(nueva.status).toBe(422);
    expect(await e.prisma.usuario.count()).toBe(1);
    expect(await e.prisma.refreshToken.count()).toBe(1);
  });

  it('GOO-011 un token de otro client ID o inválido da 401 INVALID_CREDENTIALS con el motivo, y no entra', async () => {
    await e.registrar('martina');
    const ajeno = await google({ id_token: await tokenGoogle({ email: PERSONAS.martina.email, aud: AJENO }) });
    expect(ajeno.status).toBe(401);
    expect(ajeno.json.error).toMatchObject({ code: 'INVALID_CREDENTIALS', details: { proveedor: 'google', motivo: 'cliente_ajeno' } });
    const firmado = await google({ id_token: await tokenGoogle({ email: PERSONAS.martina.email, llave: OTRA_LLAVE.privateKey }) });
    expect(firmado.json.error.details.motivo).toBe('token_invalido');
    const vencido = await google({ id_token: await tokenGoogle({ email: PERSONAS.martina.email, emitido: -2 * 3600 }), rol: 'client', nombre: 'A', apellido: 'B' });
    expect(vencido.status).toBe(401);
    expect(await e.prisma.refreshToken.count()).toBe(1);
    expect(e.logs.join('')).not.toContain(PERSONAS.martina.email);
  });

  it('GOO-012 una cuenta marcada para borrado da 401 ACCOUNT_DELETED', async () => {
    const { usuario } = await e.registrar('gonzalo');
    await e.prisma.usuario.update({ where: { id: usuario.id }, data: { deletedAt: new Date(AHORA) } });
    const r = await google({ id_token: await tokenGoogle({ email: PERSONAS.gonzalo.email }) });
    expect(r.status).toBe(401);
    expect(r.json.error.code).toBe('ACCOUNT_DELETED');
  });

  it('GOO-013 cinco intentos por minuto por IP: el sexto da 429 con Retry-After; otra IP sigue', async () => {
    const malo = { id_token: 'aaa.bbb.ccc' };
    for (let i = 0; i < 5; i++) expect((await google(malo)).status).toBe(401);
    const sexto = await google(malo);
    expect(sexto.status).toBe(429);
    expect(Number(sexto.headers['retry-after'])).toBeGreaterThan(0);
    expect((await google(malo, '203.0.113.99')).status).toBe(401);
    e.reloj.avanzar('61s');
    expect((await google(malo)).status).toBe(401);
  });

  it('GOO-014 crear la cuenta cuenta en el tope de registros por IP; entrar a una existente no', async () => {
    await e.registrar('martina');
    for (let i = 0; i < 4; i++) {
      const r = await e.pedir({
        method: 'POST', url: '/v1/auth/register',
        payload: { rol: 'client', nombre: 'Prueba', apellido: `Tope ${i}`, email: `tope${i}@gymtrack.test`, password: CLAVE },
      });
      expect(r.status).toBe(201);
    }
    // Las 5 de arriba salen de 127.0.0.1, la IP por defecto de inject.
    const nueva = await google({ id_token: await tokenGoogle(), rol: 'client', nombre: 'Valentina', apellido: 'Soto' }, '127.0.0.1');
    expect(nueva.status).toBe(429);
    expect(await e.prisma.usuario.count({ where: { email: CORREO } })).toBe(0);
    const existente = await google({ id_token: await tokenGoogle({ email: PERSONAS.martina.email }) }, '127.0.0.1');
    expect(existente.status).toBe(200);
  });

  it('GOO-015 dos envíos con rol a la vez crean una sola cuenta y los dos entran', async () => {
    const payload = { id_token: await tokenGoogle(), rol: 'client', nombre: 'Valentina', apellido: 'Soto' };
    const [a, b] = await Promise.all([google(payload), google(payload, '203.0.113.11')]);
    expect([a!.status, b!.status]).toEqual([200, 200]);
    expect([a!.json.cuenta_nueva, b!.json.cuenta_nueva].sort()).toEqual([false, true]);
    expect(a!.json.usuario.id).toBe(b!.json.usuario.id);
    expect(await e.prisma.usuario.count({ where: { email: CORREO } })).toBe(1);
  });

  it('GOO-017 la cuenta queda atada a su cuenta de Google: entra aunque Google cambie el correo, y otra cuenta de Google con el mismo correo no entra', async () => {
    const { usuario } = await e.registrar('martina');
    expect((await google({ id_token: await tokenGoogle({ email: PERSONAS.martina.email, sub: '111' }) })).status).toBe(200);
    // La misma cuenta de Google con otro correo: entra a la misma cuenta, por el sub.
    const cambiado = await google({ id_token: await tokenGoogle({ email: 'martina.nueva@gmail.com', sub: '111' }) });
    expect(cambiado.json).toMatchObject({ resultado: 'sesion', cuenta_nueva: false, usuario: { id: usuario.id } });
    // Otra cuenta de Google que dice tener el correo de Martina: 401 y no entra.
    const otra = await google({ id_token: await tokenGoogle({ email: PERSONAS.martina.email, sub: '222' }) });
    expect(otra.status).toBe(401);
    expect(otra.json.error).toMatchObject({ code: 'INVALID_CREDENTIALS', details: { proveedor: 'google', motivo: 'otra_cuenta_google' } });
    expect((await e.prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } })).googleSub).toBe('111');
    expect(await e.prisma.usuario.count()).toBe(1);
  });

  it('GOO-016 sin GOOGLE_CLIENT_IDS o sin los certificados de Google responde 503', async () => {
    const real = e.app.gymtrack.google!.verificador;
    try {
      e.app.gymtrack.google = { verificador: verificadorDePrueba([]) };
      const apagado = await google({ id_token: await tokenGoogle() });
      expect(apagado.status).toBe(503);
      expect(apagado.json.error.details.motivo).toBe('google_no_configurado');
      e.app.gymtrack.google = {
        verificador: crearVerificadorGoogle({ clientIds: [ANDROID], certificados: async () => { throw new Error('sin red'); } }),
      };
      const caido = await google({ id_token: await tokenGoogle() });
      expect(caido.status).toBe(503);
      expect(caido.json.error.details.motivo).toBe('google_sin_respuesta');
    } finally {
      e.app.gymtrack.google = { verificador: real };
    }
  });
});
