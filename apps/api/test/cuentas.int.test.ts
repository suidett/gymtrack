// Integración de cuentas y perfil (plan-de-validacion.md, INT · Cuentas y perfil; INT-140 a 143).
// Contra PostgreSQL 16 real, con reloj fijo y buzón de correo en memoria.
import { describe, expect, it } from 'vitest';
import { armarApp, AHORA, bearer, CLAVE, describeConBase, payloadJwt, PERSONAS, URL_SIN_BASE, usarEntorno } from './ayudantes';
import { hashToken } from '../src/seguridad/tokens';

const DIA = 86_400_000;

describeConBase('Cuentas: registro', () => {
  const e = usarEntorno();

  it('INT-001 registra una alumna con Argon2id, valores por defecto y correo de bienvenida', async () => {
    const r = await e.pedir({
      method: 'POST', url: '/v1/auth/register',
      payload: { rol: 'client', nombre: 'Nueva', apellido: 'Alumna', email: 'nuevo.alumno@gymtrack.test', password: CLAVE },
    });
    expect(CLAVE).toHaveLength(12);
    expect(r.status).toBe(201);
    expect(r.json.usuario).toMatchObject({
      rol: 'client', email: 'nuevo.alumno@gymtrack.test', timezone: 'America/Santiago', unidades: 'kg', descanso_default_s: 90,
    });
    expect(r.json.tokens.access_token).toBeTruthy();
    expect(r.json.tokens.refresh_token).toBeTruthy();
    const fila = await e.prisma.usuario.findUniqueOrThrow({ where: { email: 'nuevo.alumno@gymtrack.test' } });
    expect(fila.passwordHash.startsWith('$argon2id$')).toBe(true);
    await e.esperarCorreos();
    const correo = e.buzon.ultimo('nuevo.alumno@gymtrack.test');
    expect(correo?.etiqueta).toBe('bienvenida');
    expect(correo?.texto).toContain('Hola, Nueva');
  });

  it('INT-002 registra un entrenador y GET /me no pide encuesta', async () => {
    const r = await e.registrar('camila');
    expect(r.usuario.rol).toBe('trainer');
    const me = await e.pedir({ method: 'GET', url: '/v1/me', headers: bearer(r.tokens.access_token) });
    expect(me.status).toBe(200);
    expect(me.json.encuesta_pendiente).toBe(false);
  });

  it('INT-003 el mismo correo en mayúsculas da 409 EMAIL_TAKEN y sigue habiendo una sola fila', async () => {
    await e.registrar('camila');
    const r = await e.pedir({
      method: 'POST', url: '/v1/auth/register',
      payload: { ...PERSONAS.camila, email: 'CAMILA.ROJAS@gymtrack.test', password: CLAVE },
    });
    expect(r.status).toBe(409);
    expect(r.json.error.code).toBe('EMAIL_TAKEN');
    expect(await e.prisma.usuario.count({ where: { email: 'camila.rojas@gymtrack.test' } })).toBe(1);
  });

  it('INT-004 contraseñas de 7 y 129 dan 400 con details.campo = password; 8 y 128 dan 201', async () => {
    const intentar = (largo: number, i: number) => e.pedir({
      method: 'POST', url: '/v1/auth/register',
      // Letras que no se repiten seguidas: una de un solo carácter repetido es fácil de adivinar (VAL-004).
      payload: { rol: 'client', nombre: 'Prueba', apellido: 'Largo', email: `largo${i}@gymtrack.test`, password: 'sentadilla'.repeat(13).slice(0, largo) },
    });
    for (const [i, largo] of [7, 129].entries()) {
      const r = await intentar(largo, i);
      expect(r.status).toBe(400);
      expect(r.json.error.code).toBe('VALIDATION_ERROR');
      expect(r.json.error.details.campo).toBe('password');
    }
    expect((await intentar(8, 2)).status).toBe(201);
    expect((await intentar(128, 3)).status).toBe(201);
  });

  it('INT-005 rol admin, sin apellido o correo sin @ dan 400 con el campo y no crean nada', async () => {
    const base = { rol: 'client', nombre: 'Prueba', apellido: 'Mala', email: 'mala@gymtrack.test', password: CLAVE };
    const casos: [Record<string, unknown>, string][] = [
      [{ ...base, rol: 'admin' }, 'rol'],
      [{ ...base, apellido: undefined }, 'apellido'],
      [{ ...base, email: 'mala.gymtrack.test' }, 'email'],
    ];
    for (const [payload, campo] of casos) {
      const r = await e.pedir({ method: 'POST', url: '/v1/auth/register', payload });
      expect(r.status).toBe(400);
      expect(r.json.error.details.campo).toBe(campo);
      expect(r.json.error.details.motivo).toBeTruthy();
    }
    expect(await e.prisma.usuario.count()).toBe(0);
  });
});

describeConBase('Cuentas: ingreso', () => {
  const e = usarEntorno();

  it('INT-006 ingresa con un access de 900 s y un refresh de 30 días', async () => {
    await e.registrar('martina');
    const r = await e.ingresar('martina');
    expect(r.status).toBe(200);
    const p = payloadJwt(r.json.tokens.access_token);
    expect(p.exp - p.iat).toBe(900);
    expect(p.iat * 1000).toBe(new Date(AHORA).getTime());
    expect(new Date(r.json.tokens.refresh_vence_at).getTime() - new Date(AHORA).getTime()).toBe(30 * DIA);
    expect(r.json.usuario.rol).toBe('client');
  });

  it('INT-007 contraseña mala y correo inexistente dan 401 con el mismo code y message', async () => {
    await e.registrar('martina');
    const mala = await e.ingresar('martina', 'otra-clave-cualquiera');
    const nadie = await e.pedir({ method: 'POST', url: '/v1/auth/login', payload: { email: 'nadie@gymtrack.test', password: CLAVE } });
    expect(mala.status).toBe(401);
    expect(nadie.status).toBe(401);
    expect(mala.json).toEqual(nadie.json);
    expect(mala.json.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('INT-008 Gonzalo, marcado para borrado hace 29 días, da 401 ACCOUNT_DELETED', async () => {
    const { usuario } = await e.registrar('gonzalo');
    await e.prisma.usuario.update({ where: { id: usuario.id }, data: { deletedAt: new Date(new Date(AHORA).getTime() - 29 * DIA) } });
    const r = await e.ingresar('gonzalo');
    expect(r.status).toBe(401);
    expect(r.json.error.code).toBe('ACCOUNT_DELETED');
  });
});

describeConBase('Cuentas: refresh y cierre de sesión', () => {
  const e = usarEntorno();
  const renovar = (refresh: string) => e.pedir({ method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: refresh } });

  it('INT-009 un refresh vigente entrega un par nuevo y el usado queda con revocado_at', async () => {
    const { tokens } = await e.registrar('martina');
    const r = await renovar(tokens.refresh_token);
    expect(r.status).toBe(200);
    expect(r.json.tokens.refresh_token).not.toBe(tokens.refresh_token);
    const usado = await e.prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashToken(tokens.refresh_token) } });
    expect(usado.revocadoAt).not.toBeNull();
    expect(usado.reemplazadoPor).not.toBeNull();
  });

  it('INT-010 reutilizar A después de rotar a B da 401 REFRESH_REUSED y revoca todos los refresh de Martina', async () => {
    const { tokens: a } = await e.registrar('martina');
    const otroDispositivo = (await e.ingresar('martina')).json.tokens;
    const b = (await renovar(a.refresh_token)).json.tokens;
    const r = await renovar(a.refresh_token);
    expect(r.status).toBe(401);
    expect(r.json.error.code).toBe('REFRESH_REUSED');
    const activos = await e.prisma.refreshToken.count({ where: { revocadoAt: null } });
    expect(activos).toBe(0);
    expect((await renovar(b.refresh_token)).status).toBe(401);
    expect((await renovar(otroDispositivo.refresh_token)).status).toBe(401);
  });

  it('INT-011 un refresh de 30 días y 1 segundo da REFRESH_EXPIRED; uno de 29 días, 23 h y 59 min sirve', async () => {
    const viejo = (await e.registrar('martina')).tokens;
    e.reloj.avanzar('60s');
    const casiViejo = (await e.ingresar('martina')).json.tokens;
    e.reloj.fijar(new Date(new Date(AHORA).getTime() + 30 * DIA + 1000));
    const r1 = await renovar(viejo.refresh_token);
    expect(r1.status).toBe(401);
    expect(r1.json.error.code).toBe('REFRESH_EXPIRED');
    expect(r1.json.tokens).toBeUndefined();
    // El segundo se emitió 60 s después: a las 30 días + 1 s del primero tiene 29 d 23 h 59 min 1 s.
    const r2 = await renovar(casiViejo.refresh_token);
    expect(r2.status).toBe(200);
  });

  it('INT-012 cerrar sesión en un dispositivo revoca solo ese refresh', async () => {
    const uno = (await e.registrar('martina')).tokens;
    const dos = (await e.ingresar('martina')).json.tokens;
    const r = await e.pedir({ method: 'POST', url: '/v1/auth/logout', payload: { refresh_token: uno.refresh_token } });
    expect(r.status).toBe(200);
    expect((await renovar(dos.refresh_token)).status).toBe(200);
    const fila = await e.prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashToken(uno.refresh_token) } });
    expect(fila.revocadoAt).not.toBeNull();
  });

  it('un refresh cerrado con logout que vuelve da 401 REFRESH_INVALID y no saca a los otros dispositivos', async () => {
    const uno = (await e.registrar('martina')).tokens;
    const dos = (await e.ingresar('martina')).json.tokens;
    await e.pedir({ method: 'POST', url: '/v1/auth/logout', payload: { refresh_token: uno.refresh_token } });
    const r = await renovar(uno.refresh_token);
    expect(r.status).toBe(401);
    expect(r.json.error.code).toBe('REFRESH_INVALID');
    // No fue reuso de uno reemplazado: el otro teléfono sigue con su sesión.
    expect(await e.prisma.refreshToken.count({ where: { revocadoAt: null } })).toBe(1);
    expect((await renovar(dos.refresh_token)).status).toBe(200);
  });

  it('el registro guarda al usuario y su refresh en una sola transacción', async () => {
    const { usuario, tokens } = await e.registrar('martina');
    const fila = await e.prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashToken(tokens.refresh_token) } });
    expect(fila.usuarioId).toBe(usuario.id);
    expect(fila.createdAt.toISOString()).toBe(AHORA);
  });
});

describeConBase('Cuentas: recuperación de contraseña', () => {
  const e = usarEntorno();
  const pedirEnlace = (email: string) => e.pedir({ method: 'POST', url: '/v1/auth/password/forgot', payload: { email } });
  const tokenDelCorreo = (email: string) => /token=([A-Za-z0-9_-]+)/.exec(e.buzon.ultimo(email)!.texto)![1]!;
  const restablecer = (token: string, password: string) =>
    e.pedir({ method: 'POST', url: '/v1/auth/password/reset', payload: { token, password } });

  it('INT-013 pide recuperación: 202, un correo con enlace y una fila con token_hash que vence en 1 hora', async () => {
    await e.registrar('martina');
    const r = await pedirEnlace(PERSONAS.martina.email);
    expect(r.status).toBe(202);
    await e.esperarCorreos();
    const correo = e.buzon.ultimo(PERSONAS.martina.email)!;
    expect(correo.etiqueta).toBe('recuperacion');
    expect(correo.texto).toMatch(/gymtrack:\/\/restablecer\?token=/);
    // 13:00 UTC + 1 h = 11:00 en Santiago (UTC-3 en noviembre).
    expect(correo.texto).toContain('martes 17 de noviembre, 11:00');
    const filas = await e.prisma.passwordReset.findMany();
    expect(filas).toHaveLength(1);
    expect(filas[0]!.tokenHash).toBe(hashToken(tokenDelCorreo(PERSONAS.martina.email)));
    expect(filas[0]!.expiresAt.getTime() - new Date(AHORA).getTime()).toBe(3_600_000);
  });

  it('INT-014 un correo sin cuenta da 202 con el mismo cuerpo, sin correo ni fila', async () => {
    await e.registrar('martina');
    const existe = await pedirEnlace(PERSONAS.martina.email);
    // El enlace se guarda y se manda en segundo plano: se espera antes de limpiar.
    await e.esperarCorreos();
    e.buzon.vaciar();
    await e.prisma.passwordReset.deleteMany();
    const nadie = await pedirEnlace('nadie@gymtrack.test');
    expect(nadie.status).toBe(202);
    expect(nadie.json).toEqual(existe.json);
    await e.esperarCorreos();
    expect(e.buzon.todos()).toHaveLength(0);
    expect(await e.prisma.passwordReset.count()).toBe(0);
  });

  it('INT-015 guarda la contraseña nueva: hash nuevo, usado_at, dos refresh revocados, entra con la nueva y no con la vieja', async () => {
    const { tokens: uno } = await e.registrar('martina');
    await e.ingresar('martina');
    const antes = await e.prisma.usuario.findUniqueOrThrow({ where: { email: PERSONAS.martina.email } });
    await pedirEnlace(PERSONAS.martina.email);
    await e.esperarCorreos();
    const nueva = 'clave-nueva-de-martina';
    const r = await restablecer(tokenDelCorreo(PERSONAS.martina.email), nueva);
    expect(r.status).toBe(200);
    const despues = await e.prisma.usuario.findUniqueOrThrow({ where: { email: PERSONAS.martina.email } });
    expect(despues.passwordHash).not.toBe(antes.passwordHash);
    expect((await e.prisma.passwordReset.findFirstOrThrow()).usadoAt).not.toBeNull();
    expect(await e.prisma.refreshToken.count({ where: { revocadoAt: null } })).toBe(0);
    expect((await e.pedir({ method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: uno.refresh_token } })).status).toBe(401);
    expect((await e.ingresar('martina', nueva)).status).toBe(200);
    expect((await e.ingresar('martina', CLAVE)).status).toBe(401);
  });

  it('INT-016 un enlace emitido hace 1 hora y 1 segundo da 400 RESET_TOKEN_INVALID y la contraseña no cambia', async () => {
    await e.registrar('martina');
    await pedirEnlace(PERSONAS.martina.email);
    await e.esperarCorreos();
    const antes = (await e.prisma.usuario.findFirstOrThrow()).passwordHash;
    e.reloj.avanzar(3_601_000);
    const r = await restablecer(tokenDelCorreo(PERSONAS.martina.email), 'otra-clave-nueva');
    expect(r.status).toBe(400);
    expect(r.json.error.code).toBe('RESET_TOKEN_INVALID');
    expect((await e.prisma.usuario.findFirstOrThrow()).passwordHash).toBe(antes);
  });

  it('INT-017 un enlace ya usado da 400 RESET_TOKEN_INVALID', async () => {
    await e.registrar('martina');
    await pedirEnlace(PERSONAS.martina.email);
    await e.esperarCorreos();
    const token = tokenDelCorreo(PERSONAS.martina.email);
    expect((await restablecer(token, 'primera-clave-nueva')).status).toBe(200);
    const r = await restablecer(token, 'segunda-clave-nueva');
    expect(r.status).toBe(400);
    expect(r.json.error.code).toBe('RESET_TOKEN_INVALID');
  });
});

describeConBase('Perfil, salud y reglas transversales', () => {
  const e = usarEntorno();

  it('INT-018 GET /me trae nombre, rol, zona, unidades, descanso, modo gimnasio y entrenador, sin hash ni tokens', async () => {
    const { tokens } = await e.registrar('martina');
    const r = await e.pedir({ method: 'GET', url: '/v1/me', headers: bearer(tokens.access_token) });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({
      nombre: 'Martina', apellido: 'Fuentes', rol: 'client', timezone: 'America/Santiago',
      unidades: 'kg', descanso_default_s: 90, modo_gimnasio: false, entrenador: null,
    });
    const texto = JSON.stringify(r.json);
    expect(texto).not.toMatch(/password|hash|token|argon/i);
  });

  it('INT-140 /health responde 200 con la versión y el commit cuando hay base', async () => {
    const r = await e.pedir({ method: 'GET', url: '/health' });
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ estado: 'ok', version: 'sha-prueba', commit: 'abc1234', base: 'ok' });
  });

  it('INT-142 las rutas autenticadas piden token (sin token y vencido dan 401); las públicas no', async () => {
    const { tokens } = await e.registrar('martina');
    const sin = await e.pedir({ method: 'GET', url: '/v1/me' });
    expect(sin.status).toBe(401);
    expect(sin.json.error.code).toBe('UNAUTHENTICATED');
    e.reloj.avanzar('16m');
    const vencido = await e.pedir({ method: 'GET', url: '/v1/me', headers: bearer(tokens.access_token) });
    expect(vencido.status).toBe(401);
    expect(vencido.json.error.code).toBe('TOKEN_EXPIRED');
    // Las públicas responden sin Authorization (con su propio código, nunca 401 por falta de token).
    const publicas = [
      e.pedir({ method: 'POST', url: '/v1/auth/login', payload: { email: 'x@gymtrack.test', password: 'x' } }),
      e.pedir({ method: 'POST', url: '/v1/auth/password/forgot', payload: { email: 'x@gymtrack.test' } }),
      e.pedir({ method: 'POST', url: '/v1/auth/logout', payload: { refresh_token: 'x' } }),
      e.pedir({ method: 'GET', url: '/health' }),
    ];
    const [login, forgot, logout, salud] = await Promise.all(publicas);
    expect(login!.json.error.code).toBe('INVALID_CREDENTIALS');
    expect(forgot!.status).toBe(202);
    expect(logout!.status).toBe(200);
    expect(salud!.status).toBe(200);
  });

  it('INT-143 existen las tablas de cuentas con UUID como id y llaves foráneas reales a users', async () => {
    const tablas = await e.prisma.$queryRaw<{ table_name: string; data_type: string }[]>`
      SELECT c.table_name, c.data_type FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.column_name = 'id'
        AND c.table_name IN ('users', 'refresh_tokens', 'password_resets', 'push_tokens')`;
    expect(tablas.map((t) => t.table_name).sort()).toEqual(['password_resets', 'push_tokens', 'refresh_tokens', 'users']);
    expect(new Set(tablas.map((t) => t.data_type))).toEqual(new Set(['uuid']));
    const fks = await e.prisma.$queryRaw<{ tabla: string }[]>`
      SELECT tc.table_name AS tabla FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users'`;
    // Las de cuentas cuelgan de users; el resto del modelo (rutinas, sesiones, alertas) también.
    expect(fks.map((f) => f.tabla)).toEqual(expect.arrayContaining(['password_resets', 'push_tokens', 'refresh_tokens']));
    const borrado = await e.prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deleted_at'`;
    expect(Number(borrado[0]!.n)).toBe(1);
  });
});

// Sin base: la parte de INT-140 que se puede probar siempre (la base no responde → 503).
describe('Salud sin base', () => {
  it('INT-140 /health responde 503 con el sobre de error cuando la base no contesta', async () => {
    const { app, pedir, prisma } = await armarApp({ url: URL_SIN_BASE });
    const r = await pedir({ method: 'GET', url: '/health' });
    expect(r.status).toBe(503);
    expect(r.json.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(r.json.error.details).toMatchObject({ version: 'sha-prueba', commit: 'abc1234' });
    await app.close();
    await prisma.$disconnect();
  });
});
