// Seguridad de cuentas (plan-de-validacion.md, SEG · Seguridad y privacidad) contra PostgreSQL 16.
import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { leerConfig } from '../src/config';
import { hashearContrasena } from '../src/seguridad/contrasenas';
import { hashToken } from '../src/seguridad/tokens';
import { AHORA, bearer, CLAVE, describeConBase, payloadJwt, PERSONAS, usarEntorno } from './ayudantes';

describeConBase('Seguridad de cuentas', () => {
  const e = usarEntorno();
  const renovar = (refresh: string) => e.pedir({ method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: refresh } });
  const pedirEnlace = (email: string) => e.pedir({ method: 'POST', url: '/v1/auth/password/forgot', payload: { email } });
  const tokenDelCorreo = (email: string) => /token=([A-Za-z0-9_-]+)/.exec(e.buzon.ultimo(email)!.texto)![1]!;

  it('SEG-001 el hash es Argon2id con 19 MiB, 2 iteraciones y paralelismo 1', async () => {
    await e.registrar('martina');
    const u = await e.prisma.usuario.findFirstOrThrow();
    expect(u.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it('SEG-002 una contraseña de 10.000 caracteres da 400 en menos de 50 ms, en registro y en reset', async () => {
    const larga = 'x'.repeat(10_000);
    let t = performance.now();
    const r1 = await e.pedir({ method: 'POST', url: '/v1/auth/register', payload: { ...PERSONAS.diego, password: larga } });
    expect(performance.now() - t).toBeLessThan(50);
    t = performance.now();
    const r2 = await e.pedir({ method: 'POST', url: '/v1/auth/password/reset', payload: { token: 'abc', password: larga } });
    expect(performance.now() - t).toBeLessThan(50);
    expect([r1.status, r2.status]).toEqual([400, 400]);
    expect(r1.json.error.details.campo).toBe('password');
  });

  it('SEG-003 ningún token emitido aparece en claro en refresh_tokens, password_resets ni push_tokens', async () => {
    const emitidos: string[] = [];
    const s = await e.registrar('martina');
    emitidos.push(s.tokens.refresh_token, s.tokens.access_token);
    const s2 = (await renovar(s.tokens.refresh_token)).json.tokens;
    emitidos.push(s2.refresh_token);
    await pedirEnlace(PERSONAS.martina.email);
    await e.esperarCorreos();
    emitidos.push(tokenDelCorreo(PERSONAS.martina.email));
    const volcado = JSON.stringify([
      await e.prisma.refreshToken.findMany(), await e.prisma.passwordReset.findMany(), await e.prisma.pushToken.findMany(),
    ]);
    for (const t of emitidos) expect(volcado).not.toContain(t);
    expect(volcado).toContain(hashToken(s2.refresh_token));
  });

  it('SEG-004 un access emitido a las 10:00:00 sirve a las 10:14:59 y no a las 10:15:01', async () => {
    const { tokens } = await e.registrar('martina');
    e.reloj.avanzar(14 * 60_000 + 59_000);
    expect((await e.pedir({ method: 'GET', url: '/v1/me', headers: bearer(tokens.access_token) })).status).toBe(200);
    e.reloj.avanzar('2s');
    const r = await e.pedir({ method: 'GET', url: '/v1/me', headers: bearer(tokens.access_token) });
    expect(r.status).toBe(401);
    expect(r.json.error.code).toBe('TOKEN_EXPIRED');
  });

  it('SEG-005 firma alterada, alg none, otra clave y usuario inexistente dan 401', async () => {
    const { tokens, usuario } = await e.registrar('martina');
    const [h, p, firma] = tokens.access_token.split('.');
    const alterado = `${h}.${p}.${firma!.slice(0, -2)}${firma!.endsWith('AA') ? 'BB' : 'AA'}`;
    const payload = payloadJwt(tokens.access_token);
    const sinFirma = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${p}.`;
    const firmar = (clave: string, sub: string) => new SignJWT({ rol: 'client' })
      .setProtectedHeader({ alg: 'HS256' }).setSubject(sub).setIssuer(payload.iss).setAudience(payload.aud)
      .setIssuedAt(payload.iat).setExpirationTime(payload.exp).sign(new TextEncoder().encode(clave));
    const otraClave = await firmar('otra-clave-de-al-menos-32-caracteres-xx', usuario.id);
    const mismaClaveOtroUsuario = await e.prisma.usuario.delete({ where: { id: usuario.id } }).then(() => tokens.access_token);
    for (const t of [alterado, sinFirma, otraClave, mismaClaveOtroUsuario]) {
      const r = await e.pedir({ method: 'GET', url: '/v1/me', headers: bearer(t) });
      expect(r.status).toBe(401);
    }
  });

  it('SEG-006 reutilizar un refresh viejo deja sin sesión a los 3 dispositivos en su próxima renovación', async () => {
    const d1 = (await e.registrar('martina')).tokens;
    const d2 = (await e.ingresar('martina')).json.tokens;
    const d3 = (await e.ingresar('martina')).json.tokens;
    const d1b = (await renovar(d1.refresh_token)).json.tokens;
    expect((await renovar(d1.refresh_token)).json.error.code).toBe('REFRESH_REUSED');
    for (const t of [d1b, d2, d3]) expect((await renovar(t.refresh_token)).status).toBe(401);
  });

  it('SEG-007 el enlace usado dos veces o a la hora y 1 segundo se rechaza; los refresh anteriores quedan revocados', async () => {
    const antes = (await e.registrar('martina')).tokens;
    await pedirEnlace(PERSONAS.martina.email);
    await e.esperarCorreos();
    const t1 = tokenDelCorreo(PERSONAS.martina.email);
    const reset = (token: string) => e.pedir({ method: 'POST', url: '/v1/auth/password/reset', payload: { token, password: 'clave-nueva-segura' } });
    expect((await reset(t1)).status).toBe(200);
    expect((await reset(t1)).status).toBe(400);
    expect((await renovar(antes.refresh_token)).status).toBe(401);
    e.reloj.avanzar('2m');
    await pedirEnlace(PERSONAS.martina.email);
    await e.esperarCorreos();
    const t2 = tokenDelCorreo(PERSONAS.martina.email);
    e.reloj.avanzar(3_601_000);
    expect((await reset(t2)).json.error.code).toBe('RESET_TOKEN_INVALID');
  });

  it('SEG-008 50 pedidos con correos que existen y 50 que no: misma respuesta y medianas a menos de 50 ms', async () => {
    const hash = await hashearContrasena(CLAVE);
    await e.prisma.usuario.createMany({
      data: Array.from({ length: 50 }, (_, i) => ({
        email: `existe${i}@gymtrack.test`, passwordHash: hash, rol: 'client' as const, nombre: 'Prueba', apellido: 'Tiempo',
      })),
    });
    const medir = async (email: string) => {
      const t = performance.now();
      const r = await pedirEnlace(email);
      return { ms: performance.now() - t, cuerpo: JSON.stringify(r.json), status: r.status };
    };
    const existen: Awaited<ReturnType<typeof medir>>[] = [];
    const noExisten: Awaited<ReturnType<typeof medir>>[] = [];
    for (let i = 0; i < 50; i++) {
      existen.push(await medir(`existe${i}@gymtrack.test`));
      noExisten.push(await medir(`noexiste${i}@gymtrack.test`));
    }
    const mediana = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
    expect(new Set([...existen, ...noExisten].map((x) => `${x.status}${x.cuerpo}`)).size).toBe(1);
    expect(Math.abs(mediana(existen.map((x) => x.ms)) - mediana(noExisten.map((x) => x.ms)))).toBeLessThan(50);
  });

  it('SEG-009 el sexto ingreso en un minuto desde la misma IP da 429 con Retry-After; después del minuto vuelve a poder', async () => {
    await e.registrar('martina');
    const ingresar = () => e.pedir({
      method: 'POST', url: '/v1/auth/login', remoteAddress: '203.0.113.7',
      payload: { email: PERSONAS.martina.email, password: CLAVE },
    });
    for (let i = 0; i < 5; i++) expect((await ingresar()).status).toBe(200);
    const sexto = await ingresar();
    expect(sexto.status).toBe(429);
    expect(sexto.json.error.code).toBe('RATE_LIMITED');
    expect(Number(sexto.headers['retry-after'])).toBeGreaterThan(0);
    // Otra IP no se ve afectada.
    expect((await e.pedir({ method: 'POST', url: '/v1/auth/login', remoteAddress: '203.0.113.8', payload: { email: PERSONAS.martina.email, password: CLAVE } })).status).toBe(200);
    e.reloj.avanzar('60s');
    expect((await ingresar()).status).toBe(200);
  });

  it('SEG-010 el cuarto pedido de recuperación en una hora para el mismo correo da 429', async () => {
    await e.registrar('martina');
    for (let i = 0; i < 3; i++) expect((await pedirEnlace(PERSONAS.martina.email)).status).toBe(202);
    const cuarto = await pedirEnlace('MARTINA.FUENTES@gymtrack.test');
    expect(cuarto.status).toBe(429);
    expect(cuarto.headers['retry-after']).toBeDefined();
    // Un correo inexistente cuenta igual (no revela nada) y otro correo no se ve afectado.
    expect((await pedirEnlace(PERSONAS.diego.email)).status).toBe(202);
  });

  it('SEG-011 la llamada 61 de Martina en un minuto da 429; la de Diego da 200', async () => {
    const martina = (await e.registrar('martina')).tokens.access_token;
    const diego = (await e.registrar('diego')).tokens.access_token;
    for (let i = 0; i < 60; i++) expect((await e.pedir({ method: 'GET', url: '/v1/me', headers: bearer(martina) })).status).toBe(200);
    expect((await e.pedir({ method: 'GET', url: '/v1/me', headers: bearer(martina) })).status).toBe(429);
    expect((await e.pedir({ method: 'GET', url: '/v1/me', headers: bearer(diego) })).status).toBe(200);
  });

  it('SEG-012 campos de más (owner_id, deleted_at, rol en el ingreso) dan 400 y nada cambia', async () => {
    await e.registrar('martina');
    const r1 = await e.pedir({ method: 'POST', url: '/v1/auth/register', payload: { ...PERSONAS.diego, password: CLAVE, owner_id: 'x' } });
    const r2 = await e.pedir({ method: 'POST', url: '/v1/auth/register', payload: { ...PERSONAS.diego, password: CLAVE, deleted_at: AHORA } });
    const r3 = await e.pedir({ method: 'POST', url: '/v1/auth/login', payload: { email: PERSONAS.martina.email, password: CLAVE, rol: 'trainer' } });
    expect([r1.status, r2.status, r3.status]).toEqual([400, 400, 400]);
    expect(r1.json.error.details.campo).toBe('owner_id');
    expect(await e.prisma.usuario.count()).toBe(1);
    expect(await e.prisma.refreshToken.count()).toBe(1);
  });

  it('SEG-018 los logs de la suite no llevan correos ni nombres de las personas, solo ids', async () => {
    // Flujo completo con errores para que haya logs de todo tipo.
    for (const p of ['martina', 'camila', 'diego'] as const) await e.registrar(p);
    await e.ingresar('martina', 'mala-clave');
    await pedirEnlace(PERSONAS.martina.email);
    await pedirEnlace('nadie@gymtrack.test');
    await e.esperarCorreos();
    await e.pedir({ method: 'POST', url: '/v1/auth/password/reset', payload: { token: tokenDelCorreo(PERSONAS.martina.email), password: 'clave-nueva-segura' } });
    await e.pedir({ method: 'POST', url: '/v1/auth/register', payload: { ...PERSONAS.martina, password: CLAVE } });
    const logs = e.logs.join('\n');
    expect(logs.length).toBeGreaterThan(0);
    for (const p of Object.values(PERSONAS)) {
      expect(logs).not.toContain(p.email);
      expect(logs).not.toContain(p.apellido);
    }
    expect(logs).not.toContain('nadie@gymtrack.test');
    expect(logs).not.toContain(CLAVE);
  });

  it('SEG-025 las rutas /test/* no existen fuera del modo de prueba (aquí no existen en ningún modo)', async () => {
    for (const url of ['/test/reset', '/test/reloj', '/test/correos']) {
      const r = await e.pedir({ method: 'POST', url });
      expect(r.status).toBe(404);
      expect(r.json.error.code).toBe('NOT_FOUND');
    }
  });
});

describe('Seguridad de la configuración (sin base)', () => {
  const base = { DATABASE_URL: 'postgresql://x@localhost/x', JWT_SECRET: 'a'.repeat(64), RESEND_API_KEY: 're_prueba' };

  it('SEG-032 la API no arranca en producción con RELOJ_FIJO', () => {
    expect(() => leerConfig({ ...base, NODE_ENV: 'production', RELOJ_FIJO: '2026-11-17T13:00:00Z' })).toThrow(/RELOJ_FIJO/);
    expect(() => leerConfig({ ...base, NODE_ENV: 'production' })).not.toThrow();
    expect(leerConfig({ ...base, NODE_ENV: 'test', RELOJ_FIJO: '2026-11-17T13:00:00Z' }).relojFijo).toBe('2026-11-17T13:00:00Z');
  });

  it('en producción exige JWT_SECRET y Resend con su clave', () => {
    expect(() => leerConfig({ DATABASE_URL: base.DATABASE_URL, NODE_ENV: 'production', RESEND_API_KEY: 're_x' })).toThrow(/JWT_SECRET/);
    expect(() => leerConfig({ ...base, NODE_ENV: 'production', RESEND_API_KEY: undefined })).toThrow(/RESEND_API_KEY/);
    expect(() => leerConfig({ ...base, NODE_ENV: 'production', CORREO_DRIVER: 'consola' })).toThrow(/Resend/);
    expect(leerConfig({ ...base, NODE_ENV: 'test' }).correo.driver).toBe('memoria');
    expect(leerConfig({ ...base, NODE_ENV: 'development' }).correo.driver).toBe('consola');
  });
});
