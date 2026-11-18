// Reglas de detección sin base (plan-de-validacion.md, «Detección de estancamiento y baja»:
// UNI-080 a UNI-089; WRK-005 y WRK-012 en su parte pura; P-34, P-47). Corren aunque no haya
// DATABASE_URL.
import { describe, expect, it } from 'vitest';
import { esDolorFuerte, evaluarBaja, evaluarEstancamiento, limiteSinSesiones } from '../../src/modulos/alertas/deteccion';
import { leerUmbrales, UMBRALES_POR_DEFECTO } from '../../src/modulos/alertas/umbrales';
import { leerArgumentos } from '../../src/worker/tareas';

const dia = (d: string) => new Date(`${d}T20:00:00Z`);
const marcas = (valores: number[]) =>
  valores.map((marca, i) => ({ sesionId: `s${i}`, fecha: new Date(Date.UTC(2026, 9, 20 + i * 3, 20)), marca }));

describe('Detección de alertas', () => {
  const u = UMBRALES_POR_DEFECTO;

  it('UNI-080 80 kg de mejor 1RM y después 78, 80 y 76,7: hay estancamiento con las 3 sesiones', () => {
    const r = evaluarEstancamiento(marcas([80, 78, 80, 76.7]), u.estancamientoSesiones);
    expect(r?.mejor.marca).toBe(80);
    expect(r?.ventana.map((m) => m.marca)).toEqual([78, 80, 76.7]);
  });

  it('UNI-081 si la segunda llegó a 81 no hay estancamiento', () => {
    expect(evaluarEstancamiento(marcas([80, 78, 81, 76.7]), u.estancamientoSesiones)).toBeNull();
  });

  it('UNI-082 con solo 2 sesiones sin superar no hay estancamiento', () => {
    expect(evaluarEstancamiento(marcas([80, 78, 79]), u.estancamientoSesiones)).toBeNull();
  });

  it('UNI-083 con el umbral en 4 sesiones, 3 sin superar no alcanzan', () => {
    expect(evaluarEstancamiento(marcas([80, 78, 80, 76.7]), 4)).toBeNull();
  });

  const previos = [7, 14, 21, 27].map((d) => ({ fecha: new Date(Date.UTC(2026, 10, 17 - d, 20)), valor: 4200 }));
  const hoy = new Date('2026-11-17T20:00:00Z');

  it('UNI-084 promedio de 4.200 kg y hoy 3.780 (justo 10 % menos): hay baja', () => {
    expect(evaluarBaja(3780, previos, hoy, u)).toMatchObject({ actual: 3780, promedio: 4200, caida_pct: 10, sesiones_previas: 4 });
  });

  it('UNI-085 el mismo promedio y hoy 3.781 (9,98 % menos): no hay baja', () => {
    expect(evaluarBaja(3781, previos, hoy, u)).toBeNull();
  });

  it('UNI-086 el 1RM de la sentadilla cae de un promedio de 100 a 90: hay baja', () => {
    const conRm = previos.map((p) => ({ ...p, valor: 100 }));
    expect(evaluarBaja(90, conRm, hoy, u)?.caida_pct).toBe(10);
  });

  it('UNI-087 con menos de 2 semanas de historia no se evalúa; con 2 semanas sí (P-47)', () => {
    const unaSemana = [{ fecha: dia('2026-11-14'), valor: 4200 }, { fecha: dia('2026-11-12'), valor: 4200 }];
    expect(evaluarBaja(3000, unaSemana, hoy, u)).toBeNull();
    const dosSemanas = [{ fecha: dia('2026-11-14'), valor: 4200 }, { fecha: dia('2026-11-06'), valor: 4200 }];
    expect(evaluarBaja(3000, dosSemanas, hoy, u)).not.toBeNull();
    // Lo de hace más de 4 semanas no cuenta.
    expect(evaluarBaja(3000, [{ fecha: dia('2026-10-01'), valor: 4200 }, { fecha: dia('2026-10-08'), valor: 4200 }], hoy, u)).toBeNull();
  });

  it('UNI-088 sin sesiones: a los 7 días exactos sí; a los 6 días, 23 horas y 59 minutos no', () => {
    const ultima = new Date('2026-11-10T22:00:00Z');
    const limite = limiteSinSesiones(ultima, 'America/Santiago', 7);
    expect(limite.toISOString()).toBe('2026-11-17T22:00:00.000Z');
    expect(new Date('2026-11-17T21:59:00Z') < limite).toBe(true);
  });

  it('WRK-012 los 7 días se cuentan en hora de Santiago aunque cambie el horario el sábado 4 de abril', () => {
    // Viernes 3 de abril a las 19:00 (UTC-3) más 7 días locales: viernes 10 a las 19:00 (UTC-4).
    expect(limiteSinSesiones(new Date('2026-04-03T22:00:00Z'), 'America/Santiago', 7).toISOString()).toBe('2026-04-10T23:00:00.000Z');
  });

  it('UNI-089 solo el dolor de intensidad 7 o más genera alerta; una observación de 9 no', () => {
    expect(esDolorFuerte('dolor', 7, u.dolorIntensidad)).toBe(true);
    expect(esDolorFuerte('dolor', 6, u.dolorIntensidad)).toBe(false);
    expect(esDolorFuerte('observacion', 9, u.dolorIntensidad)).toBe(false);
  });

  it('WRK-005 los umbrales salen del entorno (P-34) y un valor raro no arranca', () => {
    expect(leerUmbrales({})).toEqual(UMBRALES_POR_DEFECTO);
    expect(leerUmbrales({ UMBRAL_SIN_SESIONES_DIAS: '10', UMBRAL_ESTANCAMIENTO_SESIONES: '4' })).toMatchObject({ sinSesionesDias: 10, estancamientoSesiones: 4 });
    expect(() => leerUmbrales({ UMBRAL_BAJA_PCT: 'diez' })).toThrow(/UMBRAL_BAJA_PCT/);
  });

  it('SEG-032 el worker no acepta --ahora en producción; fuera de producción sí, con zona', () => {
    expect(() => leerArgumentos(['purga', '--ahora=2026-12-17T03:00:00Z'], 'production')).toThrow(/SEG-032/);
    expect(leerArgumentos(['purga', '--ahora=2026-12-17T03:00:00Z'], 'test')).toEqual({ tarea: 'purga', ahora: new Date('2026-12-17T03:00:00Z') });
    expect(() => leerArgumentos(['--ahora=2026-12-17T03:00:00'], 'test')).toThrow(/zona/);
    expect(leerArgumentos([], 'production')).toEqual({ tarea: 'noche', ahora: undefined });
    expect(() => leerArgumentos(['borrar-todo'], 'test')).toThrow(/desconocido/);
  });
});
