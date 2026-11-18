// Cimientos de los módulos: registro automático, sesión, rol, matriz de permisos, regla de vínculo,
// errores, paginación y semilla (plan-de-validacion.md: CON, PERM, P-01, P-02, P-15, P-17, P-29).
// Un módulo de prueba se monta con montarModulo: así se prueba src/compartido sin un módulo real.
import {
  definirRuta, EJERCICIOS_BASE, esquemaPagina, esquemaPaginacion, esquemaQueryAlumno, LIMITE_MAXIMO,
} from '@gymtrack/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  actorDe, alumnoObjetivo, armarPagina, codificarCursor, definirModulo, esquemaDe, fallar, leerCursor,
  nombresDeModulos, noEncontrado, paginaPorId, prohibido, urlDe, usuarioDe,
} from '../src/compartido';
import { ErrorApi } from '../src/errores';
import { armarApp, URL_SIN_BASE } from './ayudantes';
import {
  describeConBase, desvincular, idConsejo, idEjercicioBase, montarModulo, sembrarBase, usarEntornoApi,
} from './ayudas';

// ── Un módulo de prueba ──────────────────────────────────────────────────────
const R = {
  sesion: definirRuta({ metodo: 'GET', ruta: '/v1/prueba/sesion', publica: false, exito: 200, respuesta: z.object({ id: z.uuid() }) }),
  datos: definirRuta({
    metodo: 'GET', ruta: '/v1/prueba/datos', publica: false, query: esquemaQueryAlumno, exito: 200,
    respuesta: z.object({ alumno: z.uuid() }),
  }),
  ejercicios: definirRuta({
    metodo: 'GET', ruta: '/v1/prueba/ejercicios', publica: false, query: esquemaPaginacion, exito: 200,
    respuesta: esquemaPagina(z.object({ id: z.uuid(), slug: z.string() })),
  }),
};

const moduloDePrueba = definirModulo(async (app, ctx) => {
  app.get(urlDe(R.sesion), { schema: esquemaDe(R.sesion), preHandler: app.exigirSesion }, async (req) => ({ id: usuarioDe(req).id }));
  app.get('/prueba/entrenador', { preHandler: app.exigirRol('trainer') }, async () => ({ ok: true }));
  app.get('/prueba/sobrescribir', { preHandler: app.exigirPermiso('sobrescribirSugerencia') }, async (req) => ({
    tipo: (await actorDe(ctx.prisma, req)).tipo,
  }));
  app.get(urlDe(R.datos), { schema: esquemaDe(R.datos), preHandler: app.exigirPermiso('verDatosAlumno') }, async (req) => ({
    alumno: await alumnoObjetivo(ctx.prisma, usuarioDe(req), req.query.client_id),
  }));
  app.get(urlDe(R.ejercicios), { schema: esquemaDe(R.ejercicios), preHandler: app.exigirSesion }, async (req) => {
    const p = paginaPorId(req.query, 'asc');
    const filas = await ctx.prisma.ejercicio.findMany({ ...p, where: { ...p.where, duenoId: null }, select: { id: true, slug: true } });
    return armarPagina(filas.map((f) => ({ id: f.id, slug: f.slug ?? '' })), req.query.limit, (u) => ({ id: u.id }));
  });
  app.get('/prueba/errores/:cual', async (req) => {
    const { cual } = req.params as { cual: string };
    if (cual === 'prohibido') prohibido();
    if (cual === 'no-existe') noEncontrado();
    if (cual === 'regla') fallar('REPS_RANGE_INVALID', { ejercicio: 'press-de-banca' });
    return fallar('SESSION_CLOSED', { session_id: '0192c1a0-7b1e-7c3a-9f0e-3f5b2a1d4e6f' });
  });
});

// ── Sin base ─────────────────────────────────────────────────────────────────
describe('Cimientos sin base', () => {
  let a: Awaited<ReturnType<typeof armarApp>>;
  beforeAll(async () => {
    a = await armarApp({ url: URL_SIN_BASE, antesDeListo: (app) => montarModulo(app, moduloDePrueba) });
  });
  afterAll(async () => {
    await a.app.close();
    await a.prisma.$disconnect();
  });

  it('CON-014 cada carpeta de src/modulos se registra sola bajo /v1', () => {
    const esperados = ['alertas', 'ejercicios', 'entrenador', 'perfil', 'progreso', 'rutinas', 'sesiones'];
    expect(nombresDeModulos()).toEqual(esperados);
    expect(a.app.gymtrack.modulos).toEqual(esperados);
    expect(a.app.hasRoute({ method: 'GET', url: '/v1/prueba/sesion' })).toBe(true);
    expect(a.app.hasRoute({ method: 'GET', url: '/prueba/sesion' })).toBe(false);
    expect(() => urlDe({ ruta: '/sessions' })).toThrow(/CON-014/);
  });

  it('P-01 y CON-005 los atajos de error salen con el sobre y su estado: 403, 404, 409 y 422', async () => {
    const r403 = await a.pedir({ method: 'GET', url: '/v1/prueba/errores/prohibido' });
    const r404 = await a.pedir({ method: 'GET', url: '/v1/prueba/errores/no-existe' });
    const r409 = await a.pedir({ method: 'GET', url: '/v1/prueba/errores/cerrada' });
    const r422 = await a.pedir({ method: 'GET', url: '/v1/prueba/errores/regla' });
    expect([r403.status, r404.status, r409.status, r422.status]).toEqual([403, 404, 409, 422]);
    expect(r403.json).toEqual({ error: { code: 'FORBIDDEN', message: 'No puedes hacer esto con tu cuenta.' } });
    // El 404 de «no es tuyo» es idéntico al de una ruta que no existe (§API).
    expect(r404.json).toEqual((await a.pedir({ method: 'GET', url: '/v1/no-existe' })).json);
    expect(r409.json.error).toEqual({
      code: 'SESSION_CLOSED', message: 'La sesión ya está cerrada y no se puede editar',
      details: { session_id: '0192c1a0-7b1e-7c3a-9f0e-3f5b2a1d4e6f' },
    });
    expect(r422.json.error).toMatchObject({ code: 'REPS_RANGE_INVALID', details: { ejercicio: 'press-de-banca' } });
  });

  it('PERM-38 una ruta del módulo sin token da 401 antes de tocar la base', async () => {
    const r = await a.pedir({ method: 'GET', url: '/v1/prueba/sesion' });
    expect(r.status).toBe(401);
    expect(r.json.error.code).toBe('UNAUTHENTICATED');
  });

  it('CON-008 la query de lista: limit 50 por defecto, de 1 a 100; cualquier otro, 400', async () => {
    expect(esquemaPaginacion.parse({})).toEqual({ limit: 50 });
    expect(esquemaPaginacion.parse({ limit: '20', cursor: 'abc' })).toEqual({ limit: 20, cursor: 'abc' });
    for (const limit of ['0', String(LIMITE_MAXIMO + 1), 'muchos', '2.5']) {
      expect(esquemaPaginacion.safeParse({ limit }).success, `limit=${limit}`).toBe(false);
    }
    expect(esquemaPagina(z.string()).parse({ items: ['a'], next_cursor: null })).toEqual({ items: ['a'], next_cursor: null });
  });

  it('CON-008 el cursor es opaco: ida y vuelta, y uno roto o inventado da 400 con campo cursor', () => {
    const esquema = z.object({ id: z.uuid() });
    const id = idEjercicioBase('press-de-banca');
    expect(leerCursor(codificarCursor({ id }), esquema)).toEqual({ id });
    expect(leerCursor(undefined, esquema)).toBeUndefined();
    for (const malo of ['no-es-base64-json', codificarCursor({ id: 'x' })]) {
      try {
        leerCursor(malo, esquema);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(ErrorApi);
        expect((e as ErrorApi).codigo).toBe('VALIDATION_ERROR');
        expect((e as ErrorApi).detalles).toMatchObject({ campo: 'cursor' });
      }
    }
    const pagina = armarPagina([1, 2, 3], 2, (u) => ({ u }));
    expect(pagina.items).toEqual([1, 2]);
    expect(leerCursor(pagina.next_cursor!, z.object({ u: z.number() }))).toEqual({ u: 2 });
    expect(armarPagina([1, 2], 2, (u) => u).next_cursor).toBeNull();
  });

  it('P-29 cada ejercicio base tiene un UUID v7 fijo calculado desde su slug', () => {
    const id = idEjercicioBase('press-de-banca');
    expect(id).toBe(idEjercicioBase('base-press-de-banca'));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(z.uuid().safeParse(id).success).toBe(true);
    expect(idEjercicioBase('press-militar')).not.toBe(id);
    expect(new Set(EJERCICIOS_BASE.map((e) => idEjercicioBase(e.id))).size).toBe(EJERCICIOS_BASE.length);
  });
});

// ── Con base ─────────────────────────────────────────────────────────────────
describeConBase('Cimientos con base', () => {
  const e = usarEntornoApi({ antesDeListo: (app) => montarModulo(app, moduloDePrueba) });

  it('P-29 la semilla carga la biblioteca base de exercises.seed.ts y los consejos, sin duplicar', async () => {
    const base = await e.prisma.ejercicio.findMany({ where: { duenoId: null } });
    expect(base).toHaveLength(EJERCICIOS_BASE.length);
    const banca = base.find((x) => x.slug === 'press-de-banca');
    expect(banca).toMatchObject({ id: idEjercicioBase('press-de-banca'), nombre: 'Press de banca', tipoCarga: 'kg', incrementoDefaultKg: 2.5 });
    expect(await e.prisma.consejo.count()).toBe(15);
    expect(await e.prisma.consejo.findUnique({ where: { id: idConsejo('sueno', 1) } })).toMatchObject({ motivo: 'sueno', orden: 1 });
    await sembrarBase(e.prisma, { actualizar: true });
    expect(await e.prisma.ejercicio.count()).toBe(EJERCICIOS_BASE.length);
  });

  it('PERM-38 con el access de Martina la ruta responde y da su usuario', async () => {
    const { martina } = await e.escena();
    const r = await e.pedirComo(martina, { method: 'GET', url: '/v1/prueba/sesion' });
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ id: martina.id });
  });

  it('PERM-32 y P-01 una ruta de entrenador da 403 FORBIDDEN a la alumna vinculada y al alumno solo', async () => {
    const { camila, martina, diego } = await e.escena();
    expect((await e.pedirComo(camila, { method: 'GET', url: '/v1/prueba/entrenador' })).status).toBe(200);
    for (const alumno of [martina, diego]) {
      const r = await e.pedirComo(alumno, { method: 'GET', url: '/v1/prueba/entrenador' });
      expect(r.status).toBe(403);
      expect(r.json.error.code).toBe('FORBIDDEN');
      expect(r.json.error.details).toBeUndefined();
    }
  });

  it('PERM-19 PERM-20 PERM-21 la matriz separa al alumno vinculado del alumno solo', async () => {
    const { camila, martina, diego } = await e.escena();
    const pedir = (p: typeof camila) => e.pedirComo(p, { method: 'GET', url: '/v1/prueba/sobrescribir' });
    expect((await pedir(camila)).json).toEqual({ tipo: 'entrenador' });
    expect((await pedir(martina)).status).toBe(403);
    expect((await pedir(diego)).json).toEqual({ tipo: 'alumno_solo' });
  });

  it('PERM-04 PERM-05 y P-02 cada uno ve lo suyo; el entrenador, solo a sus vinculados con ?client_id', async () => {
    const { camila, martina, diego } = await e.escena();
    const rodrigo = await e.crear('rodrigo');
    const datos = (p: typeof camila, clientId?: string) =>
      e.pedirComo(p, { method: 'GET', url: '/v1/prueba/datos', query: clientId ? { client_id: clientId } : {} });

    expect((await datos(martina)).json).toEqual({ alumno: martina.id });
    expect((await datos(martina, martina.id)).json).toEqual({ alumno: martina.id });
    expect((await datos(camila, martina.id)).json).toEqual({ alumno: martina.id });

    const ajeno = await datos(martina, diego.id);
    const inventado = await datos(camila, idEjercicioBase('no-existe'));
    const noVinculado = await datos(camila, diego.id);
    const intruso = await datos(rodrigo, martina.id);
    for (const r of [ajeno, inventado, noVinculado, intruso]) expect(r.status).toBe(404);
    // Mismo cuerpo para lo que no existe y lo que no es tuyo.
    expect(intruso.json).toEqual(inventado.json);

    const sinCliente = await datos(camila);
    expect(sinCliente.status).toBe(400);
    expect(sinCliente.json.error.details.campo).toBe('client_id');
  });

  it('PERM-34 al terminar el vínculo la entrenadora deja de ver a Martina al instante y Martina queda sola', async () => {
    const { camila, martina } = await e.escena();
    await desvincular(e.prisma, martina, e.reloj.ahora());
    expect((await e.pedirComo(camila, { method: 'GET', url: '/v1/prueba/datos', query: { client_id: martina.id } })).status).toBe(404);
    expect((await e.pedirComo(martina, { method: 'GET', url: '/v1/prueba/sobrescribir' })).json).toEqual({ tipo: 'alumno_solo' });
  });

  it('P-15 la base no acepta dos vínculos activos para el mismo alumno', async () => {
    const { martina } = await e.escena();
    const rodrigo = await e.crear('rodrigo');
    await expect(
      e.prisma.vinculoEntrenador.create({
        data: { entrenadorId: rodrigo.id, alumnoId: martina.id, estado: 'activo', codigo: 'P3XK7M', codigoVenceAt: e.reloj.ahora() },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('P-17 la base no acepta dos sesiones en curso del mismo alumno', async () => {
    const { martina } = await e.escena();
    const sesion = (id: string) => ({ id, alumnoId: martina.id, iniciadaAt: e.reloj.ahora() });
    await e.prisma.sesionEntreno.create({ data: sesion('0192c1a0-7b1e-7c3a-9f0e-3f5b2a1d4e6f') });
    await expect(e.prisma.sesionEntreno.create({ data: sesion('0192c1a0-7b1e-7c3a-9f0e-3f5b2a1d4e70') })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('CON-008 paginaPorId recorre la biblioteca base con limit=20 sin repetidos ni faltantes', async () => {
    const { martina } = await e.escena();
    const vistos: string[] = [];
    let cursor: string | null = null;
    let paginas = 0;
    do {
      const r: Awaited<ReturnType<typeof e.pedir>> = await e.pedirComo(martina, {
        method: 'GET', url: '/v1/prueba/ejercicios', query: { limit: '20', ...(cursor ? { cursor } : {}) },
      });
      expect(r.status).toBe(200);
      vistos.push(...r.json.items.map((i: { slug: string }) => i.slug));
      cursor = r.json.next_cursor;
      paginas++;
    } while (cursor);
    expect(paginas).toBe(Math.ceil(EJERCICIOS_BASE.length / 20));
    expect(new Set(vistos).size).toBe(EJERCICIOS_BASE.length);
    const roto = await e.pedirComo(martina, { method: 'GET', url: '/v1/prueba/ejercicios', query: { cursor: 'roto' } });
    expect(roto.status).toBe(400);
    expect(roto.json.error.details.campo).toBe('cursor');
  });
});
