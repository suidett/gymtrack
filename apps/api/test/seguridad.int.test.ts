// Seguridad de cuentas (plan-de-validacion.md, SEG · Seguridad y privacidad) contra PostgreSQL 16.
import { SignJWT } from 'jose';
import { describe, expect, it, vi } from 'vitest';
import { leerConfig, leerConfiarProxy } from '../src/config';
import { hashearContrasena } from '../src/seguridad/contrasenas';
import { claveDeIp } from '../src/seguridad/limitador';
import { hashToken } from '../src/seguridad/tokens';
import { AHORA, armarApp, bearer, CLAVE, describeConBase, payloadJwt, PERSONAS, usarEntorno } from './ayudantes';

// El hash de verdad, pero espiado: SEG-002 revisa que una contraseña gigante no llegue a Argon2.
vi.mock('../src/seguridad/contrasenas', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/seguridad/contrasenas')>();
  return { ...real, hashearContrasena: vi.fn(real.hashearContrasena) };
});

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

  it('SEG-002 una contraseña de 10.000 caracteres da 400 sin calcular ningún hash, en registro y en reset', async () => {
    const larga = 'x'.repeat(10_000);
    vi.mocked(hashearContrasena).mockClear();
    const r1 = await e.pedir({ method: 'POST', url: '/v1/auth/register', payload: { ...PERSONAS.diego, password: larga } });
    const r2 = await e.pedir({ method: 'POST', url: '/v1/auth/password/reset', payload: { token: 'abc', password: larga } });
    expect([r1.status, r2.status]).toEqual([400, 400]);
    expect([r1.json.error.details.campo, r2.json.error.details.campo]).toEqual(['password', 'password']);
    // El esquema corta antes de la ruta: Argon2 no se llamó (sin medir el reloj de pared).
    expect(hashearContrasena).not.toHaveBeenCalled();
    expect(await e.prisma.usuario.count()).toBe(0);
    // Y el espía sí ve los hash de verdad: un registro normal llama una vez.
    await e.registrar('diego');
    expect(hashearContrasena).toHaveBeenCalledTimes(1);
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
    const medir = async (email: string, remoteAddress: string) => {
      const t = performance.now();
      const r = await e.pedir({ method: 'POST', url: '/v1/auth/password/forgot', remoteAddress, payload: { email } });
      const ms = performance.now() - t;
      // Fuera de la medición: que la tarea de fondo del pedido anterior no se cruce con el siguiente.
      await e.esperarCorreos();
      return { ms, cuerpo: JSON.stringify(r.json), status: r.status };
    };
    const existen: Awaited<ReturnType<typeof medir>>[] = [];
    const noExisten: Awaited<ReturnType<typeof medir>>[] = [];
    // Cada pedido desde su IP: aquí se mide el tiempo, no el tope de 10 enlaces por hora por IP.
    for (let i = 0; i < 50; i++) {
      existen.push(await medir(`existe${i}@gymtrack.test`, `10.81.0.${i + 1}`));
      noExisten.push(await medir(`noexiste${i}@gymtrack.test`, `10.82.0.${i + 1}`));
    }
    // Los 50 que existen sí recibieron su enlace (el trabajo se hizo, en segundo plano).
    expect(await e.prisma.passwordReset.count()).toBe(50);
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
    await e.esperarCorreos();
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

  it('SEG-018 los logs no llevan correos, nombres, apellidos, contraseñas ni tokens: solo ids, también en los errores', async () => {
    const reset = (token: string) => e.pedir({ method: 'POST', url: '/v1/auth/password/reset', payload: { token, password: 'clave-nueva-segura' } });
    const emitidos: string[] = [];
    // Flujo completo con errores para que haya logs de todo tipo.
    for (const p of ['martina', 'camila', 'diego'] as const) {
      const { tokens } = await e.registrar(p);
      emitidos.push(tokens.access_token, tokens.refresh_token);
    }
    const camila = (await e.ingresar('camila')).json.tokens;
    const camila2 = (await renovar(camila.refresh_token)).json.tokens;
    emitidos.push(camila.access_token, camila.refresh_token, camila2.access_token, camila2.refresh_token);
    await renovar(camila.refresh_token); // reuso: REFRESH_REUSED
    await e.ingresar('martina', 'mala-clave');
    await pedirEnlace(PERSONAS.martina.email);
    await pedirEnlace('nadie@gymtrack.test');
    await e.esperarCorreos();
    const enlace = tokenDelCorreo(PERSONAS.martina.email);
    emitidos.push(enlace);
    await reset(enlace);
    await reset(enlace); // ya usado
    await e.pedir({ method: 'GET', url: '/v1/me', headers: bearer(emitidos[0]!) }); // access de antes del reset
    await e.pedir({ method: 'POST', url: '/v1/auth/register', remoteAddress: '203.0.113.60', payload: { ...PERSONAS.martina, password: CLAVE } });

    // Error inesperado de la base con los datos en el mensaje, como los de pg («Key (email)=(...)»).
    const sofia = PERSONAS.sofia;
    const falloBase = Object.assign(new Error(`Key (email)=(${sofia.email}) ${sofia.nombre} ${sofia.apellido} ${CLAVE}`), { code: 'P2010' });
    const espia = vi.spyOn(e.prisma, '$transaction').mockRejectedValueOnce(falloBase);
    const r = await e.pedir({ method: 'POST', url: '/v1/auth/register', remoteAddress: '203.0.113.60', payload: { ...sofia, password: CLAVE } });
    espia.mockRestore();
    expect(r.status).toBe(500);
    // Y un correo que falla en segundo plano con un mensaje igual de indiscreto.
    const rodrigo = PERSONAS.rodrigo;
    e.app.gymtrack.correo.prepararEnSegundoPlano('recuperacion', async () => {
      throw Object.assign(new Error(`insert or update violates foreign key: ${rodrigo.email} ${rodrigo.nombre}`), { code: '23503' });
    });
    await e.esperarCorreos();

    const logs = e.logs.join('\n');
    expect(logs.length).toBeGreaterThan(0);
    // Los errores sí quedan en el log, con su tipo y su código.
    expect(logs).toContain('"codigo":"P2010"');
    expect(logs).toContain('"codigo":"23503"');
    for (const p of Object.values(PERSONAS)) {
      expect(logs).not.toContain(p.email);
      expect(logs).not.toContain(p.nombre);
      expect(logs).not.toContain(p.apellido);
    }
    expect(logs).not.toContain('nadie@gymtrack.test');
    expect(logs).not.toContain(CLAVE);
    for (const t of emitidos) expect(logs).not.toContain(t);
  });

  it('el sexto registro en una hora desde la misma IP da 429 con Retry-After; otra IP sí puede y a la hora vuelve a poder', async () => {
    const registrar = (i: number, remoteAddress = '203.0.113.20') => e.pedir({
      method: 'POST', url: '/v1/auth/register', remoteAddress,
      payload: { rol: 'client', nombre: 'Prueba', apellido: 'Tope', email: `tope${i}@gymtrack.test`, password: CLAVE },
    });
    for (let i = 0; i < 5; i++) expect((await registrar(i)).status).toBe(201);
    const sexto = await registrar(5);
    expect(sexto.status).toBe(429);
    expect(sexto.json.error.code).toBe('RATE_LIMITED');
    expect(Number(sexto.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(sexto.headers['retry-after'])).toBeLessThanOrEqual(3600);
    expect(await e.prisma.usuario.count()).toBe(5);
    expect((await registrar(6, '203.0.113.21')).status).toBe(201);
    e.reloj.avanzar('1h');
    expect((await registrar(7)).status).toBe(201);
  });

  it('el refresh 31 en un minuto, el enlace 11 y el restablecimiento 11 en una hora desde la misma IP dan 429', async () => {
    const desde = (remoteAddress: string, url: string, payload: Record<string, unknown>) =>
      e.pedir({ method: 'POST', url, remoteAddress, payload });
    for (let i = 0; i < 30; i++) {
      expect((await desde('203.0.113.30', '/v1/auth/refresh', { refresh_token: `inventado-${i}` })).json.error.code).toBe('REFRESH_INVALID');
    }
    const refresh = await desde('203.0.113.30', '/v1/auth/refresh', { refresh_token: 'inventado' });
    expect(refresh.status).toBe(429);
    expect(Number(refresh.headers['retry-after'])).toBeGreaterThan(0);

    // El tope por correo (3) no alcanza a quien prueba muchos correos distintos: por IP, 10 por hora.
    for (let i = 0; i < 10; i++) expect((await desde('203.0.113.40', '/v1/auth/password/forgot', { email: `otro${i}@gymtrack.test` })).status).toBe(202);
    const enlace = await desde('203.0.113.40', '/v1/auth/password/forgot', { email: 'otro99@gymtrack.test' });
    expect(enlace.status).toBe(429);
    expect(enlace.json.error.code).toBe('RATE_LIMITED');

    for (let i = 0; i < 10; i++) {
      const r = await desde('203.0.113.50', '/v1/auth/password/reset', { token: `inventado-${i}`, password: 'clave-nueva-segura' });
      expect(r.json.error.code).toBe('RESET_TOKEN_INVALID');
    }
    const reset = await desde('203.0.113.50', '/v1/auth/password/reset', { token: 'inventado', password: 'clave-nueva-segura' });
    expect(reset.status).toBe(429);
    // Otra IP no se ve afectada.
    expect((await desde('203.0.113.51', '/v1/auth/password/reset', { token: 'inventado', password: 'clave-nueva-segura' })).status).toBe(400);
    await e.esperarCorreos();
  });

  it('detrás de Caddy (CONFIAR_PROXY=1) cambiar X-Forwarded-For en cada pedido no salta el límite de ingresos', async () => {
    const antes = process.env.CONFIAR_PROXY;
    process.env.CONFIAR_PROXY = '1';
    let a: Awaited<ReturnType<typeof armarApp>>;
    try {
      a = await armarApp();
    } finally {
      if (antes === undefined) delete process.env.CONFIAR_PROXY;
      else process.env.CONFIAR_PROXY = antes;
    }
    try {
      const ingresar = (xff: string, remoteAddress = '172.18.0.3') => a.pedir({
        method: 'POST', url: '/v1/auth/login', remoteAddress, headers: { 'x-forwarded-for': xff },
        payload: { email: 'nadie@gymtrack.test', password: 'cualquiera' },
      });
      // Caddy (172.18.0.3) agrega la IP real al final; lo de la izquierda lo escribe el cliente.
      for (let i = 0; i < 5; i++) expect((await ingresar(`10.9.9.${i}, 198.51.100.${i}, 203.0.113.70`)).status).toBe(401);
      const sexto = await ingresar('192.0.2.1, 203.0.113.70');
      expect(sexto.status).toBe(429);
      expect(sexto.json.error.code).toBe('RATE_LIMITED');
      // Otra persona detrás del mismo Caddy sigue pudiendo.
      expect((await ingresar('192.0.2.1, 203.0.113.71')).status).toBe(401);
      // Alguien que llega directo, sin Caddy, desde una IP pública: su X-Forwarded-For no se cree.
      for (let i = 0; i < 5; i++) expect((await ingresar(`192.0.2.${i + 10}`, '198.51.100.200')).status).toBe(401);
      expect((await ingresar('192.0.2.99', '198.51.100.200')).status).toBe(429);
    } finally {
      await a.app.close();
      await a.prisma.$disconnect();
    }
  });

  it('cuatro refresh simultáneos con el mismo token: uno 200, tres REFRESH_REUSED y después ningún refresh de Martina renueva', async () => {
    const { tokens } = await e.registrar('martina');
    const otroDispositivo = (await e.ingresar('martina')).json.tokens;
    const r = await Promise.all(Array.from({ length: 4 }, () => renovar(tokens.refresh_token)));
    expect(r.map((x) => x.status).sort()).toEqual([200, 401, 401, 401]);
    expect(r.filter((x) => x.status === 401).map((x) => x.json.error.code)).toEqual(['REFRESH_REUSED', 'REFRESH_REUSED', 'REFRESH_REUSED']);
    const ganador = r.find((x) => x.status === 200)!.json.tokens;
    // La revocación de los perdedores no se deshizo con su transacción.
    expect(await e.prisma.refreshToken.count({ where: { revocadoAt: null } })).toBe(0);
    for (const t of [ganador.refresh_token, otroDispositivo.refresh_token]) {
      expect((await renovar(t)).status).toBe(401);
    }
  });

  it('un access emitido antes de restablecer la contraseña deja de servir aunque no haya vencido', async () => {
    const { tokens } = await e.registrar('martina');
    expect((await e.pedir({ method: 'GET', url: '/v1/me', headers: bearer(tokens.access_token) })).status).toBe(200);
    await pedirEnlace(PERSONAS.martina.email);
    await e.esperarCorreos();
    const reset = await e.pedir({
      method: 'POST', url: '/v1/auth/password/reset',
      payload: { token: tokenDelCorreo(PERSONAS.martina.email), password: 'clave-nueva-segura' },
    });
    expect(reset.status).toBe(200);
    // Mismo segundo que el reset, 14 minutos antes de vencer: igual queda fuera.
    const viejo = await e.pedir({ method: 'GET', url: '/v1/me', headers: bearer(tokens.access_token) });
    expect(viejo.status).toBe(401);
    expect(viejo.json.error.code).toBe('TOKEN_INVALID');
    const nuevo = (await e.ingresar('martina', 'clave-nueva-segura')).json.tokens;
    expect((await e.pedir({ method: 'GET', url: '/v1/me', headers: bearer(nuevo.access_token) })).status).toBe(200);
    // El sello va en el token, pero no es el hash ni deja adivinarlo.
    const u = await e.prisma.usuario.findFirstOrThrow();
    expect(JSON.stringify(payloadJwt(nuevo.access_token))).not.toContain(u.passwordHash.slice(-20));
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

  it('CONFIAR_PROXY: saltos (1 por defecto en producción), IPs o redes del proxy, o false; nunca «creerle a todos»', () => {
    const produccion = leerConfig({ ...base, NODE_ENV: 'production' }).confiarProxy;
    expect(typeof produccion).toBe('function');
    const unSalto = produccion as (direccion: string, salto: number) => boolean;
    // El socket es Caddy en la red de Docker: se le cree. Uno más atrás, no.
    expect(unSalto('172.18.0.3', 0)).toBe(true);
    expect(unSalto('::ffff:10.0.0.2', 0)).toBe(true);
    expect(unSalto('192.0.2.1', 1)).toBe(false);
    // Alguien que llega directo desde internet no es un proxy.
    expect(unSalto('203.0.113.9', 0)).toBe(false);
    expect(leerConfig({ ...base, NODE_ENV: 'test' }).confiarProxy).toBe(false);
    expect(leerConfig({ ...base, NODE_ENV: 'production', CONFIAR_PROXY: 'false' }).confiarProxy).toBe(false);
    const dos = leerConfiarProxy('2', true) as (direccion: string, salto: number) => boolean;
    expect([dos('10.0.0.2', 0), dos('198.51.100.1', 1), dos('198.51.100.2', 2)]).toEqual([true, true, false]);
    // `true` (el valor viejo) ya no confía en toda la cadena: se lee como 1 salto.
    const viejo = leerConfiarProxy('true', true) as (direccion: string, salto: number) => boolean;
    expect([viejo('10.0.0.2', 0), viejo('198.51.100.1', 1)]).toEqual([true, false]);
    expect(leerConfiarProxy('172.18.0.0/16, 10.0.0.2,uniquelocal', true)).toEqual(['172.18.0.0/16', '10.0.0.2', 'uniquelocal']);
    expect(() => leerConfig({ ...base, NODE_ENV: 'production', CONFIAR_PROXY: 'caddy' })).toThrow(/CONFIAR_PROXY/);
    expect(() => leerConfig({ ...base, NODE_ENV: 'production', CONFIAR_PROXY: '10.0.0.0/99' })).toThrow(/CONFIAR_PROXY/);
  });

  it('el límite por IP cuenta una IPv6 por su /64 y una IPv4 mapeada como la IPv4', () => {
    expect(claveDeIp('2001:db8:1:2::a')).toBe('2001:db8:1:2::/64');
    expect(claveDeIp('2001:0db8:0001:0002:ffff:ffff:ffff:ffff')).toBe('2001:db8:1:2::/64');
    expect(claveDeIp('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(claveDeIp('::1')).toBe('0:0:0:0::/64');
    expect(claveDeIp('fe80::1%eth0')).toBe('fe80:0:0:0::/64');
    expect(claveDeIp('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(claveDeIp('203.0.113.7')).toBe('203.0.113.7');
  });
});
