// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de la cola sin señal · Zona: Entrenar (pruebas)
//
// Qué hace: prueba la cola de envíos sin red ni teléfono: cómo junta lo repetido, el orden, los
// reintentos con espera creciente, el corte por falta de señal o de sesión, los rechazos con su
// motivo y las llamadas que salen por cada entrada. Los ids son los del plan de pruebas.
// Tócalo cuando: cambie cola.ts o transporte.ts.
// Depende de: vitest, ../cola, ../transporte, ../contrato y @gymtrack/shared (ErrorDeApi).
// ─────────────────────────────────────────────────────────────────────────────
import { ErrorDeApi } from '@gymtrack/shared';
import { describe, expect, it, vi } from 'vitest';
import { aplicarProceso, contarCola, encolar, procesarCola, reintentarRechazadas, type NuevaOp, type OpCola } from '../cola';
import { cuerpoCerrar, cuerpoCrear, cuerpoSeries } from '../contrato';
import { crearEnvio } from '../transporte';
import { sesionMartina } from './fixtures';

const sinRed = () => new TypeError('Network request failed');
const esSinRed = (e: unknown) => e instanceof TypeError;
const sinEspera = { esperar: async () => undefined, esSinRed };

let k = 0;
const base = (sid: string | null, creada = '2026-11-17T10:00:00-03:00') => ({ id: `op-${++k}`, session_id: sid, creada_at: creada });

function opIniciar(sid: string): NuevaOp {
  const s = { ...sesionMartina(), id: sid };
  return { ...base(sid), tipo: 'iniciar', session_id: sid, cuerpo: cuerpoCrear(s) };
}
function opSeries(sid: string): NuevaOp {
  const s = { ...sesionMartina(), id: sid };
  return { ...base(sid), tipo: 'series', session_id: sid, cuerpo: cuerpoSeries(s) };
}
function opCerrar(sid: string, iniciada = '2026-11-17T10:00:00-03:00'): NuevaOp {
  const s = { ...sesionMartina(), id: sid, iniciada_at: iniciada };
  return { ...base(sid, iniciada), tipo: 'cerrar', session_id: sid, crear: cuerpoCrear(s), series: cuerpoSeries(s), cerrar: cuerpoCerrar('2026-11-17T11:00:00-03:00', 3600) };
}
function opObs(sid: string): NuevaOp {
  return { ...base(sid), tipo: 'observacion', session_id: sid, cuerpo: { tipo: 'observacion', texto: 'Me costó', session_id: sid } };
}
const armar = (...ops: NuevaOp[]) => ops.reduce<OpCola[]>((c, o) => encolar(c, o), []);

describe('encolar', () => {
  it('SYNC-007: un lote de series nuevo reemplaza al anterior de la misma sesión', () => {
    const c = armar(opIniciar('a'), opSeries('a'), opSeries('a'));
    expect(c.map((o) => o.tipo)).toEqual(['iniciar', 'series']);
  });

  it('SYNC-003: cerrar absorbe iniciar y series, y queda antes de las observaciones de esa sesión', () => {
    const c = armar(opIniciar('a'), opSeries('a'), opObs('a'), opCerrar('a'));
    expect(c.map((o) => o.tipo)).toEqual(['cerrar', 'observacion']);
    expect(contarCola(c)).toEqual({ pendientes: 2, rechazadas: 0 });
  });

  it('APP-017: descartar una sesión que nunca llegó a la API borra todo lo suyo sin llamar', () => {
    const c = encolar(armar(opIniciar('a'), opSeries('a')), { ...base('a'), tipo: 'descartar', session_id: 'a' });
    expect(c).toEqual([]);
  });

  it('APP-017: descartar una sesión que ya llegó (o que se está mandando) avisa el descarte', () => {
    const conIniciar = armar(opIniciar('a'), opSeries('a'));
    const enVuelo = new Set([conIniciar[0]?.id ?? '']);
    const c1 = encolar(conIniciar, { ...base('a'), tipo: 'descartar', session_id: 'a' }, enVuelo);
    expect(c1.map((o) => o.tipo)).toEqual(['descartar']);
    const c2 = encolar(armar(opSeries('a')), { ...base('a'), tipo: 'descartar', session_id: 'a' });
    expect(c2.map((o) => o.tipo)).toEqual(['descartar']);
  });
});

describe('procesar la cola', () => {
  it('SYNC-003: sin señal la sesión cerrada queda pendiente y no se pierde nada', async () => {
    const c = armar(opCerrar('a'));
    const r = await procesarCola(c, async () => Promise.reject(sinRed()), sinEspera);
    expect(r.detenida).toBe('sin_red');
    expect(aplicarProceso(c, r)).toEqual(c);
  });

  it('SYNC-004: tres sesiones en cola se mandan en orden y la cola queda vacía', async () => {
    const c = armar(opCerrar('lun', '2026-11-16T10:00:00-03:00'), opCerrar('mar', '2026-11-17T10:00:00-03:00'), opCerrar('mie', '2026-11-18T10:00:00-03:00'));
    const orden: string[] = [];
    const r = await procesarCola(c, async (op) => orden.push(op.session_id ?? ''), sinEspera);
    expect(orden).toEqual(['lun', 'mar', 'mie']);
    expect(aplicarProceso(c, r)).toEqual([]);
  });

  it('SYNC-005: con 503 dos veces y luego 200 hace 3 intentos esperando 1 s y 2 s', async () => {
    const c = armar(opCerrar('a'));
    const esperas: number[] = [];
    let intentos = 0;
    const r = await procesarCola(
      c,
      async () => {
        intentos += 1;
        if (intentos < 3) throw new ErrorDeApi(503, 'INTERNAL_ERROR', 'caída');
        return { ok: true };
      },
      { esSinRed, esperar: async (ms) => void esperas.push(ms) },
    );
    expect(intentos).toBe(3);
    expect(esperas).toEqual([1000, 2000]);
    expect(r.resultados).toHaveLength(1);
    expect(aplicarProceso(c, r)).toEqual([]);
  });

  it('SYNC-014: una sesión inválida queda rechazada con su motivo y las otras dos se aceptan', async () => {
    const c = armar(opCerrar('a'), opCerrar('b'), opCerrar('c'));
    const r = await procesarCola(
      c,
      async (op) => {
        if (op.session_id === 'b') throw new ErrorDeApi(400, 'VALIDATION_ERROR', 'RIR fuera de rango en la serie 2');
      },
      sinEspera,
    );
    const queda = aplicarProceso(c, r);
    expect(queda).toHaveLength(1);
    expect(queda[0]).toMatchObject({ session_id: 'b', estado: 'rechazada', motivo: 'RIR fuera de rango en la serie 2' });
    expect(reintentarRechazadas(queda)[0]).toMatchObject({ estado: 'pendiente', motivo: null });
  });

  it('SYNC-013: con el refresh vencido (401) se detiene y conserva la cola para después de ingresar', async () => {
    const c = armar(opCerrar('a'), opCerrar('b'));
    const enviar = vi.fn(async () => Promise.reject(new ErrorDeApi(401, 'TOKEN_EXPIRED', 'vencido')));
    const r = await procesarCola(c, enviar, sinEspera);
    expect(r.detenida).toBe('sin_sesion');
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(aplicarProceso(c, r)).toEqual(c);
  });

  it('SYNC-010: 409 SESSION_IN_PROGRESS rechaza la sesión y lo que sigue de ella espera', async () => {
    const c = armar(opIniciar('b'), opSeries('b'), opObs('x'));
    const enviados: string[] = [];
    const r = await procesarCola(
      c,
      async (op) => {
        enviados.push(op.tipo);
        if (op.tipo === 'iniciar') throw new ErrorDeApi(409, 'SESSION_IN_PROGRESS', 'Ya tienes una sesión en curso.');
      },
      sinEspera,
    );
    expect(enviados).toEqual(['iniciar', 'observacion']);
    const queda = aplicarProceso(c, r);
    expect(queda.map((o) => [o.tipo, o.estado])).toEqual([
      ['iniciar', 'rechazada'],
      ['series', 'pendiente'],
    ]);
  });

  it('INT-093: series sobre una sesión ya cerrada cuentan como enviadas', async () => {
    const c = armar(opSeries('a'));
    const r = await procesarCola(c, async () => Promise.reject(new ErrorDeApi(409, 'SESSION_CLOSED', 'cerrada')), sinEspera);
    expect(aplicarProceso(c, r)).toEqual([]);
  });
});

describe('llamadas por entrada', () => {
  it('CON-015: cerrar manda crear, series y cerrar en ese orden y devuelve el resumen', async () => {
    const llamadas: string[] = [];
    const enviar = crearEnvio(async (m, ruta) => {
      llamadas.push(`${m} ${ruta}`);
      return ruta.endsWith('/finish') ? { session: { volumen_kg: 100 } } : {};
    });
    const [op] = armar(opCerrar('s1'));
    const datos = await enviar(op as OpCola);
    expect(llamadas).toEqual(['POST /v1/sessions', 'PUT /v1/sessions/s1/sets', 'POST /v1/sessions/s1/finish']);
    expect(datos).toEqual({ session: { volumen_kg: 100 } });
  });

  it('INT-100: si las series dan SESSION_CLOSED (reintento del mismo teléfono) igual pide el resumen', async () => {
    const llamadas: string[] = [];
    const enviar = crearEnvio(async (m, ruta) => {
      llamadas.push(ruta);
      if (ruta.endsWith('/sets')) throw new ErrorDeApi(409, 'SESSION_CLOSED', 'cerrada');
      return {};
    });
    const [op] = armar(opCerrar('s1'));
    await enviar(op as OpCola);
    expect(llamadas.at(-1)).toBe('/v1/sessions/s1/finish');
  });
});
