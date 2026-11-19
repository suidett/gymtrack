// ─────────────────────────────────────────────────────────────────────────────
// Pruebas del estado de la campana · Zona: Notificaciones (app)
//
// Qué hace: prueba en Node ../api.ts con un `llamar` falso (rutas, consulta y que las respuestas
// pasen los esquemas de @gymtrack/shared) y ../almacen.ts con una API falsa: la primera carga y
// sus estados (cargando, listo, vacío, error, sin señal con datos), «ver anteriores» con `antes`,
// marcar una y todas al tiro con vuelta atrás si la API falla, un solo pedido a la vez y que otra
// cuenta parta de cero.
// Tócalo cuando: cambie ../api.ts o ../almacen.ts.
// Depende de: vitest, @gymtrack/shared, ../api y ../almacen.
// ─────────────────────────────────────────────────────────────────────────────
import { ErrorDeApi, esquemaQueryNotificaciones, type ListaNotificaciones, type Notificacion } from '@gymtrack/shared';
import { describe, expect, it } from 'vitest';
import { crearAlmacenNotificaciones } from '../almacen';
import { crearApiNotificaciones, POR_PAGINA, type ApiNotificaciones, type Llamar } from '../api';

const ID = (k: number) => `0193${String(k).padStart(4, '0')}-0000-7000-8000-000000000000`;
const n = (k: number, leida = false): Notificacion => ({
  id: ID(k), tipo: 'alerta', titulo: `T${k}`, cuerpo: 'C', ruta: '/entrenador/alertas', leida,
  created_at: new Date(Date.UTC(2026, 10, 17, 13, k)).toISOString(),
});
const sinRed = () => Object.assign(new TypeError('Network request failed'));
const esSinRed = (e: unknown) => e instanceof TypeError;

/** Una API falsa con lo que devuelve cada llamada; anota cada pedido. */
function apiFalsa(o: Partial<{ [K in keyof ApiNotificaciones]: ApiNotificaciones[K] }> = {}) {
  const pedidos: string[] = [];
  const api: ApiNotificaciones = {
    listar: async (antes) => {
      pedidos.push(`listar${antes ? `:${antes}` : ''}`);
      return o.listar ? o.listar(antes) : { items: [], sin_leer: 0 };
    },
    leer: async (id) => {
      pedidos.push(`leer:${id}`);
      return o.leer ? o.leer(id) : { notificacion: { ...n(0), id, leida: true }, sin_leer: 0 };
    },
    leerTodas: async () => {
      pedidos.push('leerTodas');
      return o.leerTodas ? o.leerTodas() : { marcadas: 0, sin_leer: 0 };
    },
  };
  return { api, pedidos };
}

describe('Llamadas de la campana', () => {
  it('NOT-100 CON-012 listar, leer y leer todas van a sus rutas, con una consulta que la API acepta y la respuesta validada', async () => {
    const llamadas: unknown[][] = [];
    const respuestas: Record<string, unknown> = {
      'GET /v1/notificaciones': { items: [n(1)], sin_leer: 1 },
      [`POST /v1/notificaciones/${ID(1)}/leer`]: { notificacion: n(1, true), sin_leer: 0 },
      'POST /v1/notificaciones/leer-todas': { marcadas: 0, sin_leer: 0 },
    };
    const llamar: Llamar = async (metodo, ruta, op = {}) => {
      llamadas.push([metodo, ruta, op.consulta, op.cuerpo]);
      const r = respuestas[`${metodo} ${ruta}`];
      return (op.esquema ? op.esquema.parse(r) : r) as never;
    };
    const api = crearApiNotificaciones(llamar);
    expect((await api.listar()).sin_leer).toBe(1);
    await api.listar('2026-11-17T13:01:00.000Z');
    expect((await api.leer(ID(1))).notificacion.leida).toBe(true);
    await api.leerTodas();
    expect(llamadas).toEqual([
      ['GET', '/v1/notificaciones', { limite: POR_PAGINA, antes: undefined }, undefined],
      ['GET', '/v1/notificaciones', { limite: POR_PAGINA, antes: '2026-11-17T13:01:00.000Z' }, undefined],
      ['POST', `/v1/notificaciones/${ID(1)}/leer`, undefined, undefined],
      ['POST', '/v1/notificaciones/leer-todas', undefined, undefined],
    ]);
    // La consulta, tal como sale por la URL (texto, sin los undefined), pasa el esquema estricto de la API.
    expect(esquemaQueryNotificaciones.safeParse({ limite: String(POR_PAGINA), antes: '2026-11-17T13:01:00.000Z' }).success).toBe(true);
    // Una respuesta que no calza con el contrato falla al leerla.
    respuestas['GET /v1/notificaciones'] = { items: [{ ...n(1), leida: 'no' }], sin_leer: 1 };
    await expect(api.listar()).rejects.toThrow();
  });
});

describe('Estado de la campana', () => {
  it('NOT-101 la primera carga pasa por cargando y deja la lista y el contador; vacía queda lista con 0', async () => {
    const { api } = apiFalsa({ listar: async () => ({ items: [n(2), n(1, true)], sin_leer: 1 }) });
    const s = crearAlmacenNotificaciones({ api, esSinRed });
    // Sin cuenta no pide nada.
    await s.getState().refrescar();
    expect(s.getState().fase).toBe('inicial');
    s.getState().usar('u1');
    const p = s.getState().refrescar();
    expect(s.getState().fase).toBe('cargando');
    await p;
    expect(s.getState()).toMatchObject({ fase: 'listo', sinLeer: 1, fallo: null, hayMas: false });
    expect(s.getState().items.map((x) => x.titulo)).toEqual(['T2', 'T1']);

    const vacia = crearAlmacenNotificaciones({ api: apiFalsa().api, esSinRed });
    vacia.getState().usar('u1');
    await vacia.getState().refrescar();
    expect(vacia.getState()).toMatchObject({ fase: 'listo', items: [], sinLeer: 0 });
  });

  it('NOT-102 sin datos, una falla deja el error (sin señal o del servidor) y Reintentar vuelve a cargando; con datos, los conserva', async () => {
    let falla: unknown = sinRed();
    const { api } = apiFalsa({
      listar: async () => {
        if (falla) throw falla;
        return { items: [n(1)], sin_leer: 1 };
      },
    });
    const s = crearAlmacenNotificaciones({ api, esSinRed });
    s.getState().usar('u1');
    await s.getState().refrescar();
    expect(s.getState()).toMatchObject({ fase: 'error', fallo: 'sin_red' });
    falla = new ErrorDeApi(500, 'INTERNAL_ERROR', 'falló');
    const otra = s.getState().refrescar();
    expect(s.getState().fase).toBe('cargando');
    await otra;
    expect(s.getState()).toMatchObject({ fase: 'error', fallo: 'error' });
    falla = null;
    await s.getState().refrescar();
    expect(s.getState()).toMatchObject({ fase: 'listo', fallo: null, sinLeer: 1 });
    falla = sinRed();
    await s.getState().refrescar({ manual: true });
    expect(s.getState()).toMatchObject({ fase: 'listo', fallo: 'sin_red', sinLeer: 1, refrescando: false });
    expect(s.getState().items).toHaveLength(1);
  });

  it('NOT-103 un solo pedido a la vez; con la lista fresca, volver a la pantalla no pide; ver anteriores usa antes', async () => {
    let t = 1_000;
    const pagina = (desde: number): ListaNotificaciones => ({ items: Array.from({ length: POR_PAGINA }, (_, i) => n(desde - i)), sin_leer: 40 });
    const { api, pedidos } = apiFalsa({ listar: async (antes) => (antes ? { items: [n(5), n(4)], sin_leer: 40 } : pagina(60)) });
    const s = crearAlmacenNotificaciones({ api, esSinRed, ahora: () => t });
    s.getState().usar('u1');
    await Promise.all([s.getState().refrescar(), s.getState().refrescar(), s.getState().refrescar({ manual: true })]);
    expect(pedidos).toEqual(['listar']);
    t += 2_000;
    await s.getState().refrescar({ siPasaronMs: 3_000 });
    expect(pedidos).toHaveLength(1);
    t += 2_000;
    await s.getState().refrescar({ siPasaronMs: 3_000 });
    expect(pedidos).toHaveLength(2);
    expect(s.getState().hayMas).toBe(true);
    await s.getState().cargarMas();
    expect(pedidos.at(-1)).toBe(`listar:${n(31).created_at}`);
    expect(s.getState().items).toHaveLength(POR_PAGINA + 2);
    expect(s.getState().hayMas).toBe(false);
    await s.getState().cargarMas();
    expect(pedidos).toHaveLength(3);
  });

  it('NOT-104 tocar una la marca al tiro y toma el contador de la API; si la API falla, vuelve a sin leer', async () => {
    let fallaLeer = false;
    const { api, pedidos } = apiFalsa({
      listar: async () => ({ items: [n(3), n(2), n(1)], sin_leer: 3 }),
      leer: async (id) => {
        if (fallaLeer) throw sinRed();
        return { notificacion: { ...n(3), id, leida: true }, sin_leer: 2 };
      },
    });
    const s = crearAlmacenNotificaciones({ api, esSinRed });
    s.getState().usar('u1');
    await s.getState().refrescar();
    const p = s.getState().leer(ID(3));
    expect([s.getState().sinLeer, s.getState().items[0]!.leida]).toEqual([2, true]);
    await p;
    expect(s.getState().sinLeer).toBe(2);
    // Una ya leída no se vuelve a mandar.
    await s.getState().leer(ID(3));
    expect(pedidos.filter((x) => x.startsWith('leer:'))).toHaveLength(1);
    fallaLeer = true;
    await s.getState().leer(ID(2));
    expect([s.getState().sinLeer, s.getState().items[1]!.leida]).toEqual([2, false]);
  });

  it('NOT-105 marcar todas deja 0 al tiro; si la API falla, vuelve como estaba y avisa', async () => {
    let falla = true;
    const { api } = apiFalsa({
      listar: async () => ({ items: [n(2), n(1)], sin_leer: 2 }),
      leerTodas: async () => {
        if (falla) throw sinRed();
        return { marcadas: 2, sin_leer: 0 };
      },
    });
    const s = crearAlmacenNotificaciones({ api, esSinRed });
    s.getState().usar('u1');
    await s.getState().refrescar();
    await expect(s.getState().leerTodas()).rejects.toThrow();
    expect([s.getState().sinLeer, s.getState().items.some((x) => x.leida)]).toEqual([2, false]);
    falla = false;
    await s.getState().leerTodas();
    expect([s.getState().sinLeer, s.getState().items.every((x) => x.leida)]).toEqual([0, true]);
  });

  it('NOT-106 otra cuenta en el mismo teléfono parte de cero y lo que llega de la anterior se descarta', async () => {
    let soltar: (l: ListaNotificaciones) => void = () => undefined;
    const { api } = apiFalsa({ listar: () => new Promise((listo) => (soltar = listo)) });
    const s = crearAlmacenNotificaciones({ api, esSinRed });
    s.getState().usar('camila');
    const p = s.getState().refrescar();
    s.getState().usar('martina');
    soltar({ items: [n(1)], sin_leer: 1 });
    await p;
    expect(s.getState()).toMatchObject({ usuarioId: 'martina', items: [], sinLeer: 0, fase: 'inicial' });
  });
});
