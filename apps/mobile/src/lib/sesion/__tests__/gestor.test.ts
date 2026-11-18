// ─────────────────────────────────────────────────────────────────────────────
// Pruebas del gestor de sesión · Zona: Sesión de cuenta
//
// Qué hace: prueba sin red ni teléfono (fetch y almacén falsos) que el gestor guarde los tokens
// en el almacén seguro, renueve una sola vez y repita la llamada, cierre la sesión cuando el
// refresh ya no sirve y no la cierre por falta de señal. Los ids son los del plan de pruebas
// (docs/pruebas/plan-de-validacion.md).
// Tócalo cuando: cambie cómo el gestor renueva, guarda o cierra la sesión.
// Depende de: vitest, ../gestor y ../almacen (con expo-secure-store y react-native simulados).
// ─────────────────────────────────────────────────────────────────────────────
import type { Tokens, Usuario } from '@gymtrack/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearGestorSesion, type AlmacenSesion } from '../gestor';

// ── Simulaciones de módulos nativos ──────────────────────────────────────────
const llavero = new Map<string, string>();
vi.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => llavero.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => {
    llavero.set(k, v);
  },
  deleteItemAsync: async (k: string) => {
    llavero.delete(k);
  },
}));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));

// ── Datos ────────────────────────────────────────────────────────────────────
const AHORA = Date.parse('2026-11-17T22:00:00.000Z');

function tokens(n: number, accessVenceEnMs = 900_000): Tokens {
  return {
    token_type: 'Bearer',
    access_token: `access-${n}`,
    access_vence_at: new Date(AHORA + accessVenceEnMs).toISOString(),
    refresh_token: `refresh-${n}`,
    refresh_vence_at: new Date(AHORA + 30 * 86_400_000).toISOString(),
  };
}

const usuario: Usuario = {
  id: '8f6f3d1e-4d39-4a2b-9a51-0d6f0b8a1c11',
  email: 'martina@gymtrack.test',
  rol: 'client',
  nombre: 'Martina',
  apellido: 'Fuentes',
  timezone: 'America/Santiago',
  unidades: 'kg',
  descanso_default_s: 90,
  modo_gimnasio: true,
  entrenador: null,
  encuesta_pendiente: false,
  created_at: '2026-11-01T12:00:00.000Z',
};

const error = (code: string, message = 'x') => ({ error: { code, message } });

// ── Fetch falso ──────────────────────────────────────────────────────────────
type Respuesta = { status: number; body?: unknown; headers?: Record<string, string> } | Error;
type Manejador = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Respuesta;

function crearFetch(manejador: Manejador) {
  const llamadas: { url: string; method: string; headers: Record<string, string>; body?: string }[] = [];
  const fetch = vi.fn(async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
    llamadas.push({ url, ...init });
    const r = manejador(url, init);
    if (r instanceof Error) throw r;
    return {
      status: r.status,
      headers: { get: (n: string) => r.headers?.[n.toLowerCase()] ?? null },
      json: async () => r.body,
    };
  });
  return { fetch, llamadas };
}

function crearAlmacen(inicial?: { tokens?: Tokens; usuario?: Usuario }): AlmacenSesion & { estado: { tokens: Tokens | null; usuario: Usuario | null } } {
  const estado = { tokens: inicial?.tokens ?? null, usuario: inicial?.usuario ?? null };
  return {
    estado,
    leerTokens: async () => estado.tokens,
    guardarTokens: async (t) => {
      estado.tokens = t;
    },
    leerUsuario: async () => estado.usuario,
    guardarUsuario: async (u) => {
      estado.usuario = u;
    },
    borrar: async () => {
      estado.tokens = null;
      estado.usuario = null;
    },
  };
}

const URL = 'http://api.test';

beforeEach(() => {
  llavero.clear();
});

// ── Ingreso y almacén ────────────────────────────────────────────────────────
describe('ingreso', () => {
  it('APP-005 al ingresar, los tokens y el usuario van al almacén seguro', async () => {
    const { fetch } = crearFetch(() => ({ status: 200, body: { usuario, tokens: tokens(1) } }));
    const almacen = crearAlmacen();
    const g = crearGestorSesion({ urlBase: URL, fetch, almacen, ahora: () => AHORA });
    const u = await g.ingresar({ email: 'martina@gymtrack.test', password: 'clave-segura-1' });
    expect(u.rol).toBe('client');
    expect(almacen.estado.tokens?.refresh_token).toBe('refresh-1');
    expect(almacen.estado.usuario?.email).toBe('martina@gymtrack.test');
    expect(g.tieneSesion()).toBe(true);
  });

  it('APP-005 el almacén de la app escribe los tokens en expo-secure-store', async () => {
    const { almacenSeguro } = await import('../almacen');
    await almacenSeguro.guardarTokens(tokens(1));
    expect(JSON.parse(llavero.get('gymtrack.tokens') ?? '{}').refresh_token).toBe('refresh-1');
    expect((await almacenSeguro.leerTokens())?.access_token).toBe('access-1');
    await almacenSeguro.borrar();
    expect(llavero.size).toBe(0);
  });

  it('APP-002 un 401 al ingresar llega como ErrorDeApi con su código y no guarda nada', async () => {
    const { fetch } = crearFetch(() => ({ status: 401, body: error('INVALID_CREDENTIALS') }));
    const almacen = crearAlmacen();
    const g = crearGestorSesion({ urlBase: URL, fetch, almacen, ahora: () => AHORA });
    await expect(g.ingresar({ email: 'martina@gymtrack.test', password: 'mala' })).rejects.toMatchObject({
      estado: 401,
      codigo: 'INVALID_CREDENTIALS',
    });
    expect(almacen.estado.tokens).toBeNull();
  });
});

// ── Renovación ───────────────────────────────────────────────────────────────
describe('renovación', () => {
  it('APP-046 un 401 renueva una vez y repite la llamada con el access nuevo', async () => {
    let vecesMe = 0;
    const { fetch, llamadas } = crearFetch((url, init) => {
      if (url.endsWith('/v1/auth/refresh')) return { status: 200, body: { tokens: tokens(2) } };
      if (url.endsWith('/v1/rutinas')) {
        vecesMe += 1;
        return init.headers.authorization === 'Bearer access-2'
          ? { status: 200, body: { items: [] } }
          : { status: 401, body: error('TOKEN_EXPIRED') };
      }
      return { status: 404, body: error('NOT_FOUND') };
    });
    const almacen = crearAlmacen({ tokens: tokens(1), usuario });
    const g = crearGestorSesion({ urlBase: URL, fetch, almacen, ahora: () => AHORA });
    await g.restaurar().catch(() => null);
    const r = await g.llamar<{ items: unknown[] }>('GET', '/v1/rutinas');
    expect(r.items).toEqual([]);
    expect(vecesMe).toBe(2);
    expect(llamadas.filter((l) => l.url.endsWith('/v1/auth/refresh'))).toHaveLength(1);
    expect(almacen.estado.tokens?.access_token).toBe('access-2');
  });

  it('APP-046 si el refresh falla, la sesión se cierra y avisa «vencida»', async () => {
    const { fetch } = crearFetch((url) => {
      if (url.endsWith('/v1/auth/login')) return { status: 200, body: { usuario, tokens: tokens(1) } };
      if (url.endsWith('/v1/auth/refresh')) return { status: 401, body: error('REFRESH_REUSED') };
      return { status: 401, body: error('TOKEN_EXPIRED') };
    });
    const almacen = crearAlmacen();
    const g = crearGestorSesion({ urlBase: URL, fetch, almacen, ahora: () => AHORA });
    await g.ingresar({ email: 'martina@gymtrack.test', password: 'clave-segura-1' });
    const avisos: string[] = [];
    g.alCerrar((m) => avisos.push(m));
    await expect(g.llamar('GET', '/v1/rutinas')).rejects.toMatchObject({ codigo: 'TOKEN_EXPIRED' });
    expect(avisos).toEqual(['vencida']);
    expect(almacen.estado.tokens).toBeNull();
    expect(g.tieneSesion()).toBe(false);
  });

  it('SYNC-013 con el access por vencer renueva antes de llamar, una sola vez para varias llamadas', async () => {
    const { fetch, llamadas } = crearFetch((url, init) => {
      // Al access que entrega el ingreso le quedan 10 s: menos que el margen de 30 s.
      if (url.endsWith('/v1/auth/login')) return { status: 200, body: { usuario, tokens: tokens(1, 10_000) } };
      if (url.endsWith('/v1/auth/refresh')) return { status: 200, body: { tokens: tokens(2) } };
      return init.headers.authorization === 'Bearer access-2' ? { status: 200, body: {} } : { status: 401, body: error('TOKEN_EXPIRED') };
    });
    const almacen = crearAlmacen();
    const g = crearGestorSesion({ urlBase: URL, fetch, almacen, ahora: () => AHORA });
    await g.ingresar({ email: 'martina@gymtrack.test', password: 'clave-segura-1' });
    await Promise.all([g.llamar('GET', '/v1/a'), g.llamar('GET', '/v1/b'), g.llamar('GET', '/v1/c')]);
    expect(llamadas.filter((l) => l.url.endsWith('/v1/auth/refresh'))).toHaveLength(1);
    expect(llamadas.filter((l) => l.headers.authorization === 'Bearer access-1')).toHaveLength(0);
  });

  it('SYNC-013 sin señal al renovar no cierra la sesión', async () => {
    const { fetch } = crearFetch(() => new TypeError('Network request failed'));
    const almacen = crearAlmacen({ tokens: tokens(1, 10_000), usuario });
    const g = crearGestorSesion({ urlBase: URL, fetch, almacen, ahora: () => AHORA });
    const r = await g.restaurar();
    expect(r).toEqual({ usuario, sinConexion: true });
    await expect(g.llamar('GET', '/v1/rutinas')).rejects.toBeInstanceOf(TypeError);
    expect(g.tieneSesion()).toBe(true);
    expect(almacen.estado.tokens?.refresh_token).toBe('refresh-1');
  });
});

// ── Restaurar y cerrar ───────────────────────────────────────────────────────
describe('restaurar y cerrar', () => {
  it('INT-011 un refresh guardado ya vencido no se usa y se borra', async () => {
    const { fetch, llamadas } = crearFetch(() => ({ status: 200, body: usuario }));
    const vencido = { ...tokens(1), refresh_vence_at: new Date(AHORA - 1000).toISOString() };
    const almacen = crearAlmacen({ tokens: vencido, usuario });
    const g = crearGestorSesion({ urlBase: URL, fetch, almacen, ahora: () => AHORA });
    expect(await g.restaurar()).toBeNull();
    expect(llamadas).toHaveLength(0);
    expect(almacen.estado.tokens).toBeNull();
  });

  it('INT-002 restaurar trae el usuario de GET /v1/me con encuesta_pendiente', async () => {
    const { fetch } = crearFetch((url) =>
      url.endsWith('/v1/me') ? { status: 200, body: { ...usuario, encuesta_pendiente: true } } : { status: 404, body: error('NOT_FOUND') },
    );
    const g = crearGestorSesion({ urlBase: URL, fetch, almacen: crearAlmacen({ tokens: tokens(1) }), ahora: () => AHORA });
    const r = await g.restaurar();
    expect(r?.usuario.encuesta_pendiente).toBe(true);
    expect(r?.sinConexion).toBe(false);
  });

  it('INT-012 cerrar sesión manda el refresh a /logout y borra el teléfono aunque no haya señal', async () => {
    const { fetch, llamadas } = crearFetch((url) =>
      url.endsWith('/v1/auth/login') ? { status: 200, body: { usuario, tokens: tokens(1) } } : new TypeError('Network request failed'),
    );
    const almacen = crearAlmacen();
    const g = crearGestorSesion({ urlBase: URL, fetch, almacen, ahora: () => AHORA });
    await g.ingresar({ email: 'martina@gymtrack.test', password: 'clave-segura-1' });
    const avisos: string[] = [];
    g.alCerrar((m) => avisos.push(m));
    await g.cerrarSesion();
    const logout = llamadas.find((l) => l.url.endsWith('/v1/auth/logout'));
    expect(JSON.parse(logout?.body ?? '{}')).toEqual({ refresh_token: 'refresh-1' });
    expect(almacen.estado.tokens).toBeNull();
    expect(avisos).toEqual(['cerrada']);
  });

  it('APP-003 un 429 trae los segundos de Retry-After en el error', async () => {
    const { fetch } = crearFetch(() => ({ status: 429, body: error('RATE_LIMITED'), headers: { 'retry-after': '48' } }));
    const g = crearGestorSesion({ urlBase: URL, fetch, almacen: crearAlmacen(), ahora: () => AHORA });
    await expect(g.llamar('POST', '/v1/auth/login', { publica: true, cuerpo: {} })).rejects.toMatchObject({
      codigo: 'RATE_LIMITED',
      reintentarEnS: 48,
    });
  });

  it('CON-012 la consulta se arma sin los valores vacíos', async () => {
    const { fetch, llamadas } = crearFetch(() => ({ status: 200, body: [] }));
    const g = crearGestorSesion({ urlBase: URL, fetch, almacen: crearAlmacen(), ahora: () => AHORA });
    await g.llamar('GET', '/v1/exercises', { publica: true, consulta: { q: 'remo zercher', grupo: undefined, pagina: 2 } });
    expect(llamadas[0]?.url).toBe('http://api.test/v1/exercises?q=remo%20zercher&pagina=2');
  });
});
