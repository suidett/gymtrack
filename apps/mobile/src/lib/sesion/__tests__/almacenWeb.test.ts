// ─────────────────────────────────────────────────────────────────────────────
// Pruebas del almacén de la sesión en web · Zona: Sesión de cuenta
//
// Qué hace: prueba la mitad web de la capa (almacenCrudo.web.ts) con un localStorage falso y el
// almacén de la sesión (almacen.ts) montado sobre ella, igual que en la app instalada desde Safari.
// WEB-001: la sesión queda en localStorage, se lee igual que en el teléfono y cerrar la borra.
// WEB-002: sin localStorage (bloqueado o lleno), la sesión vive en memoria y nada se cae.
// Tócalo cuando: cambie dónde guarda la versión web o el formato de lo guardado.
// No lo toques para: la renovación de tokens (gestor.test.ts).
// Depende de: ../almacenCrudo.web, ../almacen y @gymtrack/shared (tipos).
// ─────────────────────────────────────────────────────────────────────────────
import type { Tokens, Usuario } from '@gymtrack/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// almacen.ts importa ./almacenCrudo; en la app web Metro elige el .web.ts. Aquí se hace lo mismo.
vi.mock('../almacenCrudo', async () => import('../almacenCrudo.web'));

const { almacenCrudo } = await import('../almacenCrudo.web');
const { almacenSeguro } = await import('../almacen');

const TOKENS: Tokens = {
  token_type: 'Bearer',
  access_token: 'acceso-de-prueba',
  access_vence_at: '2026-11-17T13:15:00.000Z',
  refresh_token: 'refresh-de-prueba',
  refresh_vence_at: '2026-12-17T13:00:00.000Z',
} as Tokens;

/** Un localStorage mínimo en memoria, como el del navegador. */
function localStorageFalso() {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, String(v)),
    removeItem: (k: string) => void datos.delete(k),
    clear: () => datos.clear(),
    key: (i: number) => [...datos.keys()][i] ?? null,
    get length() {
      return datos.size;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WEB-001 la sesión de la app web queda en localStorage', () => {
  let ls: ReturnType<typeof localStorageFalso>;
  beforeEach(async () => {
    ls = localStorageFalso();
    vi.stubGlobal('localStorage', ls);
    await almacenSeguro.borrar();
  });

  it('guarda los tokens con la misma clave que el teléfono y los lee validados', async () => {
    await almacenSeguro.guardarTokens(TOKENS);
    expect(JSON.parse(ls.datos.get('gymtrack.tokens')!)).toEqual(TOKENS);
    expect(await almacenSeguro.leerTokens()).toEqual(TOKENS);
  });

  it('sobrevive a cerrar la app: otra lectura encuentra lo que dejó la anterior', async () => {
    ls.setItem('gymtrack.tokens', JSON.stringify(TOKENS));
    expect(await almacenSeguro.leerTokens()).toEqual(TOKENS);
  });

  it('un valor roto o con otra forma cuenta como que no hay sesión', async () => {
    ls.setItem('gymtrack.tokens', '{no es json');
    expect(await almacenSeguro.leerTokens()).toBeNull();
    ls.setItem('gymtrack.tokens', JSON.stringify({ access_token: 1 }));
    expect(await almacenSeguro.leerTokens()).toBeNull();
    ls.setItem('gymtrack.usuario', JSON.stringify({ nombre: 'sin id ni correo' }));
    expect(await almacenSeguro.leerUsuario()).toBeNull();
  });

  it('cerrar sesión borra los tokens y el usuario y no toca otras claves', async () => {
    await almacenSeguro.guardarTokens(TOKENS);
    await almacenSeguro.guardarUsuario({ id: 'u1' } as unknown as Usuario);
    ls.setItem('gymtrack-v1', 'del store');
    await almacenSeguro.borrar();
    expect(ls.getItem('gymtrack.tokens')).toBeNull();
    expect(ls.getItem('gymtrack.usuario')).toBeNull();
    expect(ls.getItem('gymtrack-v1')).toBe('del store');
    expect(await almacenSeguro.leerTokens()).toBeNull();
  });
});

describe('WEB-002 sin localStorage la sesión vive en memoria', () => {
  beforeEach(async () => {
    vi.stubGlobal('localStorage', undefined);
    await almacenSeguro.borrar();
  });

  it('sin localStorage guarda y lee de memoria', async () => {
    await almacenSeguro.guardarTokens(TOKENS);
    expect(await almacenSeguro.leerTokens()).toEqual(TOKENS);
    await almacenSeguro.borrar();
    expect(await almacenSeguro.leerTokens()).toBeNull();
  });

  it('si localStorage lanza (lleno o bloqueado), no se cae y queda la copia en memoria', async () => {
    const roto = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };
    vi.stubGlobal('localStorage', roto);
    await expect(almacenCrudo.escribir('gymtrack.tokens', JSON.stringify(TOKENS))).resolves.toBeUndefined();
    expect(await almacenSeguro.leerTokens()).toEqual(TOKENS);
    await expect(almacenSeguro.borrar()).resolves.toBeUndefined();
    expect(await almacenSeguro.leerTokens()).toBeNull();
  });
});
