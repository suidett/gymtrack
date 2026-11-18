// ─────────────────────────────────────────────────────────────────────────────
// Pruebas del registro de avisos · Zona: Notificaciones (app)
//
// Qué hace: prueba en Node, sin teléfono ni navegador (plataforma, API y memoria falsas), el flujo
// de ../registro.ts: el permiso se pide primero y una sola vez, el cuerpo que va a la API cumple
// el contrato de packages/shared (CON), el id queda guardado para poder borrarlo, renovar no
// pregunta nada, desactivar borra aunque la API falle, y los textos de cada estado. Los ids NOT-xx
// están al final de docs/pruebas/plan-de-validacion.md.
// Tócalo cuando: cambie el flujo de activar o un texto.
// Depende de: vitest, ../registro y @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { ErrorDeApi, esquemaDispositivoAvisoEntrada, type DispositivoAvisoEntrada } from '@gymtrack/shared';
import { describe, expect, it } from 'vitest';
import {
  base64UrlABytes, crearAvisos, mensajeDeErrorPrueba, mensajeDeEstado, mensajeDePrueba, rutaDelAviso, type LlamarApi, type Permiso, type PlataformaAvisos,
} from '../registro';

const ID = '019a8f2e-0000-7000-8000-000000000001';
const EXPO: DispositivoAvisoEntrada = { tipo: 'expo', token: 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]', plataforma: 'android' };
// Una llave P-256 sin comprimir (65 bytes, empieza con 0x04) y un secreto de 16 bytes, en base64url.
const P256 = `BA${'A'.repeat(85)}`;
const WEB: DispositivoAvisoEntrada = {
  tipo: 'web',
  suscripcion: { endpoint: 'https://web.push.apple.com/QGuQyavXutnMH7BPzA', expirationTime: null, keys: { p256dh: P256, auth: 'AAAAAAAAAAAAAAAAAAAAAA' } },
};

function armar(o: { permiso?: Permiso; alPedir?: Permiso; destino?: DispositivoAvisoEntrada; nombre?: PlataformaAvisos['nombre']; apiFalla?: boolean } = {}) {
  const pasos: string[] = [];
  const llamadas: { metodo: string; ruta: string; cuerpo?: unknown }[] = [];
  let guardado: string | null = null;
  let permiso: Permiso = o.permiso ?? 'sin_pedir';
  const plataforma: PlataformaAvisos = {
    nombre: o.nombre ?? 'android',
    permiso: async () => permiso,
    pedirPermiso: async () => {
      pasos.push('pedirPermiso');
      permiso = o.alPedir ?? 'concedido';
      return permiso;
    },
    destino: async () => {
      pasos.push('destino');
      return o.destino ?? EXPO;
    },
    olvidar: async () => {
      pasos.push('olvidar');
    },
  };
  const avisos = crearAvisos({
    plataforma,
    memoria: { leer: async () => guardado, guardar: async (v) => { guardado = v; }, borrar: async () => { guardado = null; } },
    llamar: async (metodo, ruta, op) => {
      pasos.push(`${metodo} ${ruta}`);
      llamadas.push({ metodo, ruta, cuerpo: op?.cuerpo });
      if (o.apiFalla) throw new TypeError('Network request failed');
      if (metodo === 'POST') return { id: ID, tipo: 'expo', plataforma: 'android', created_at: '2026-11-17T13:00:00.000Z' };
      return { borrado: true };
    },
  });
  return { avisos, pasos, llamadas, guardado: () => guardado };
}

describe('Activar avisos', () => {
  it('NOT-050 pide el permiso antes que todo, registra el token de Expo con el cuerpo del contrato y guarda el id', async () => {
    const a = armar();
    expect(await a.avisos.estado()).toBe('sin_pedir');
    const r = await a.avisos.activar();
    expect(r).toEqual({ estado: 'activos', mensaje: 'Listo: los avisos llegan a este teléfono.' });
    expect(a.pasos).toEqual(['pedirPermiso', 'destino', 'POST /v1/notificaciones/dispositivos']);
    expect(esquemaDispositivoAvisoEntrada.safeParse(a.llamadas[0]!.cuerpo).success).toBe(true);
    expect(a.guardado()).toBe(ID);
    expect(await a.avisos.estado()).toBe('activos');
  });

  it('NOT-051 en la web manda la suscripción con endpoint y llaves', async () => {
    const a = armar({ nombre: 'web', destino: WEB });
    expect((await a.avisos.activar()).estado).toBe('activos');
    expect(a.llamadas[0]!.cuerpo).toEqual(WEB);
  });

  it('NOT-052 si dice que no, o el iPhone no la tiene en la pantalla de inicio, no llama a la API y explica qué hacer', async () => {
    const no = armar({ alPedir: 'denegado' });
    expect(await no.avisos.activar()).toEqual({ estado: 'denegado', mensaje: mensajeDeEstado('denegado', 'android') });
    expect(no.llamadas).toHaveLength(0);
    const iphone = armar({ nombre: 'web', alPedir: 'instalar_primero' });
    const r = await iphone.avisos.activar();
    expect(r.estado).toBe('instalar_primero');
    expect(r.mensaje).toContain('Agregar a inicio');
    expect(iphone.llamadas).toHaveLength(0);
    expect(mensajeDeEstado('denegado', 'web')).toContain('ajustes del navegador');
  });

  it('NOT-053 sin señal devuelve error con un texto para la pantalla, no lanza y no guarda nada', async () => {
    const a = armar({ apiFalla: true });
    const r = await a.avisos.activar();
    expect(r.estado).toBe('error');
    expect(r.mensaje).toBe('No pudimos activar los avisos. Revisa tu conexión e inténtalo de nuevo.');
    expect(a.guardado()).toBeNull();
  });

  it('NOT-054 un destino que no cumple el contrato no llega a la API', async () => {
    const a = armar({ destino: { tipo: 'expo', token: 'no-es-un-token', plataforma: 'android' } });
    expect((await a.avisos.activar()).estado).toBe('error');
    expect(a.llamadas).toHaveLength(0);
  });
});

describe('Renovar y desactivar', () => {
  it('NOT-055 renovar no pregunta nada: sin permiso no hace nada y con permiso registra de nuevo', async () => {
    const sin = armar();
    expect(await sin.avisos.renovar()).toBe(false);
    expect(sin.pasos).toEqual([]);
    const con = armar({ permiso: 'concedido' });
    expect(await con.avisos.renovar()).toBe(true);
    expect(con.pasos).toEqual(['destino', 'POST /v1/notificaciones/dispositivos']);
  });

  it('NOT-056 desactivar borra el registro en la API y lo olvida, aunque la API no responda', async () => {
    const a = armar();
    await a.avisos.activar();
    await a.avisos.desactivar();
    expect(a.llamadas.at(-1)).toEqual({ metodo: 'DELETE', ruta: `/v1/notificaciones/dispositivos/${ID}`, cuerpo: undefined });
    expect(a.pasos.at(-1)).toBe('olvidar');
    expect(a.guardado()).toBeNull();
    const caida = armar({ apiFalla: true, permiso: 'concedido' });
    await expect(caida.avisos.desactivar()).resolves.toBeUndefined();
  });
});

describe('Ayudas', () => {
  it('NOT-057 la clave VAPID pasa a bytes y un aviso solo abre rutas de la app', () => {
    expect([...base64UrlABytes('AQID_-8')]).toEqual([1, 2, 3, 255, 239]);
    expect(base64UrlABytes(P256)).toHaveLength(65);
    expect(rutaDelAviso({ url: '/entrenador/alertas' })).toBe('/entrenador/alertas');
    expect(rutaDelAviso({ url: `/cliente/${ID}` })).toBe(`/cliente/${ID}`);
    for (const malo of [{ url: '//sitio.cl' }, { url: 'https://sitio.cl' }, { url: '/\\sitio.cl' }, { url: 3 }, null, undefined, 'x']) {
      expect(rutaDelAviso(malo)).toBeNull();
    }
  });

  it('NOT-058 los textos van con tuteo y sin guion largo', () => {
    for (const nombre of ['android', 'web'] as const) {
      for (const e of ['activos', 'sin_pedir', 'denegado', 'instalar_primero', 'no_disponible', 'error'] as const) {
        const t = mensajeDeEstado(e, nombre);
        expect(t.length).toBeGreaterThan(10);
        expect(t).not.toMatch(/[—–]|\busted\b/i);
      }
    }
  });
});

describe('Probar avisos', () => {
  const conApi = (llamar: LlamarApi) =>
    crearAvisos({
      plataforma: { nombre: 'android', permiso: async () => 'concedido', pedirPermiso: async () => 'concedido', destino: async () => EXPO, olvidar: async () => {} },
      memoria: { leer: async () => ID, guardar: async () => {}, borrar: async () => {} },
      llamar,
    });

  it('NOT-064 la prueba pide POST /v1/notificaciones/prueba con correo, lee la respuesta con el contrato y explica el resultado', async () => {
    const llamadas: { metodo: string; ruta: string; cuerpo?: unknown }[] = [];
    const respuesta = { dispositivos: 1, enviados: 1, invalidos: 0, fallidos: 0, correo: true, resultados: [] };
    const a = conApi(async (metodo, ruta, op) => {
      llamadas.push({ metodo, ruta, cuerpo: op?.cuerpo });
      return respuesta;
    });
    expect(await a.probar(true)).toBe(mensajeDePrueba(respuesta));
    expect(llamadas).toEqual([{ metodo: 'POST', ruta: '/v1/notificaciones/prueba', cuerpo: { correo: true } }]);
    expect(mensajeDePrueba(respuesta)).toMatch(/aviso de prueba y un correo/);
    expect(mensajeDePrueba({ dispositivos: 0, enviados: 0, correo: true })).toMatch(/correo de prueba.*Activar avisos/);
    expect(mensajeDePrueba({ dispositivos: 0, enviados: 0, correo: false })).toMatch(/no está registrado/);
    expect(mensajeDePrueba({ dispositivos: 2, enviados: 0, correo: true })).toMatch(/pero sí el correo/);
    // Una respuesta con otra forma no se muestra como éxito.
    expect(await conApi(async () => ({ ok: true })).probar()).toBe(mensajeDeErrorPrueba(new Error('forma')));
  });

  it('NOT-065 sin señal, con 429 o con 403 la prueba no lanza y dice qué pasó, con tuteo y sin guion largo', async () => {
    const sinRed = await conApi(async () => { throw new TypeError('Network request failed'); }).probar(true);
    expect(sinRed).toMatch(/Revisa tu conexión/);
    const tope = mensajeDeErrorPrueba(new ErrorDeApi(429, 'RATE_LIMITED', 'x', undefined, 1800));
    expect(tope).toBe('Ya pediste varias pruebas. Inténtalo de nuevo en 30 minutos.');
    expect(mensajeDeErrorPrueba(new ErrorDeApi(429, 'RATE_LIMITED', 'x', undefined, 20))).toMatch(/en 1 minuto\.$/);
    expect(mensajeDeErrorPrueba(new ErrorDeApi(403, 'FORBIDDEN', 'x'))).toMatch(/solo para entrenadores/);
    for (const t of [sinRed, tope, mensajeDePrueba({ dispositivos: 1, enviados: 1, correo: false })]) expect(t).not.toMatch(/[—–]|\busted\b/i);
  });
});
