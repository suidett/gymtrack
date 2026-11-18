// ─────────────────────────────────────────────────────────────────────────────
// Pruebas del contrato de Entrenar · Zona: Entrenar (pruebas)
//
// Qué hace: prueba que la app lea GET /me/today y la respuesta de cerrar (con campos que faltan
// o con otro nombre), elija el estado de Hoy, arme los cuerpos de la API y genere ids UUID v7.
// Los ids son los del plan de pruebas.
// Tócalo cuando: cambie contrato.ts, vistaHoy.ts o uuid7.ts.
// Depende de: vitest, ../contrato, ../vistaHoy, ../uuid7, ../sesionLocal y ./fixtures.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { cuerpoObservacion, cuerpoSeries, normalizarCierre, normalizarHoy } from '../contrato';
import type { CierreGuardado } from '../modelo';
import { marcar, resumenLocal } from '../sesionLocal';
import { crearGeneradorUuidV7, esUuidV7 } from '../uuid7';
import { estadoHoy, resumenDia } from '../vistaHoy';
import { AHORA, hoyMartina, JSON_HOY_MARTINA, sesionMartina } from './fixtures';

describe('Hoy', () => {
  it('APP-015: lee el Hoy de Martina: racha, semana 3 de 8, Pierna A con la sugerencia y su entrenadora', () => {
    const h = hoyMartina();
    expect(h.racha_dias).toBe(12);
    expect(h.semana).toEqual({ actual: 3, total: 8 });
    expect(h.dia?.nombre).toBe('Pierna A');
    expect(resumenDia(h.dia ?? { routine_day_id: '', nombre: '', ejercicios: [], minutos: null, fecha: null })).toBe('3 ejercicios · 10 series · ~55 min');
    expect(h.dia?.ejercicios[0]).toMatchObject({ nombre: 'Sentadilla', peso_kg: 82.5, sube_kg: 2.5, ultima: { peso_kg: 80, reps: [8, 8, 8, 7] } });
    expect(h.dia?.ejercicios[2]?.sube_kg).toBe(5);
    expect(h.semana_dias).toEqual(['hecho', 'toca', 'descanso', 'plan', 'plan', 'descanso', 'descanso']);
    expect(h.entrenador).toEqual({ nombre: 'Camila', apellido: 'Rojas' });
    expect(h.peso_corporal).toEqual({ kg: 62.4, fecha: '2026-11-10' });
    expect(estadoHoy(h, null, {}, AHORA, AHORA)).toBe('normal');
  });

  it('APP-016: sin rutina, con entrenador espera y solo ofrece crear la rutina', () => {
    const espera = normalizarHoy({ rutina: null, dia: null, entrenador: { nombre: 'Camila', apellido: 'Rojas' } });
    const solo = normalizarHoy({ rutina: null, dia: null, entrenador: null });
    expect(estadoHoy(espera, null, {}, AHORA, AHORA)).toBe('espera');
    expect(estadoHoy(solo, null, {}, AHORA, AHORA)).toBe('solo');
  });

  it('APP-017: día de descanso y sesión en curso', () => {
    const descanso = normalizarHoy({ ...JSON_HOY_MARTINA, dia: null });
    expect(estadoHoy(descanso, null, {}, AHORA, AHORA)).toBe('descanso');
    const curso = normalizarHoy({ ...JSON_HOY_MARTINA, sesion_en_curso: { id: 's9', nombre: 'Pierna A', series_hechas: 9, series_total: 20 } });
    expect(estadoHoy(curso, null, {}, AHORA, AHORA)).toBe('curso');
    expect(estadoHoy(hoyMartina(), sesionMartina(), {}, AHORA, AHORA)).toBe('curso');
  });

  it('APP-032: la sesión cerrada sin señal deja Hoy en «lista» aunque lo guardado diga que toca', () => {
    const s = sesionMartina();
    const cierre = { id: s.id, routine_day_id: s.routine_day_id, cerrada_at: new Date(AHORA).toISOString(), envio: 'pendiente' } as CierreGuardado;
    expect(estadoHoy(hoyMartina(), null, { [s.id]: cierre }, AHORA - 1000, AHORA)).toBe('lista');
  });

  it('CON-006: un Hoy vacío o con datos raros no revienta', () => {
    const h = normalizarHoy(null);
    expect(h).toMatchObject({ racha_dias: 0, rutina: null, dia: null, entrenador: null });
    expect(h.semana_dias).toHaveLength(7);
  });
});

describe('cerrar', () => {
  it('APP-032: lo que responde el servidor manda sobre lo calculado en el teléfono', () => {
    const s = marcar(sesionMartina(), false, AHORA).sesion;
    const local = resumenLocal(s, AHORA + 2718_000, null);
    const r = normalizarCierre(
      {
        session: { id: s.id, estado: 'cerrada', series_completadas: 14, volumen_kg: 3450, kcal_estimadas: 320, duracion_s: 2718 },
        prs: [{ exercise_id: 'ex-sent', nombre: 'Sentadilla', tipo: 'e1rm', valor: 63.3, anterior: 60 }],
        sugerencias: [{ routine_exercise_id: 're-sent', nombre: 'Sentadilla', metodo: 'doble_progresion', sugerencia: { peso_kg: 80, reps_min: 6, reps_max: 8, rir: 2 }, texto: 'Próxima sesión intenta 80 kg × 6 a 8.' }],
        alertas_creadas: [],
        proxima_sesion: { routine_day_id: 'dia-empuje-b', nombre: 'Empuje B', fecha_sugerida: '2026-11-19' },
      },
      local,
    );
    expect(r).toMatchObject({ series_hechas: 14, volumen_kg: 3450, kcal: 320, duracion_s: 2718, series_total: 10 });
    expect(r.prs[0]).toMatchObject({ nombre: 'Sentadilla', marca: '1RM 63,3 kg', antes: 'antes 60 kg', diferencia: '+3,3 kg' });
    expect(r.sugerencias).toHaveLength(1);
    expect(r.sugerencias[0]).toMatchObject({ peso_kg: 80, reps_min: 6, reps_max: 8 });
    expect(r.proxima).toEqual({ routine_day_id: 'dia-empuje-b', nombre: 'Empuje B', fecha: '2026-11-19' });
  });
});

describe('cuerpos', () => {
  it('INT-091: las series van con id del celular; las pendientes como no completadas y sin RIR', () => {
    const s = marcar(sesionMartina(), true, AHORA).sesion;
    const { series } = cuerpoSeries(s);
    expect(series).toHaveLength(10);
    expect(series[0]).toMatchObject({ exercise_id: 'ex-sent', routine_exercise_id: 're-sent', serie_n: 1, completada: true, fallo: true });
    expect(series[1]).toMatchObject({ completada: false, fallo: false, rir: null });
  });

  it('INT-110: un dolor lleva zona e intensidad de 1 a 10; sin texto se arma uno', () => {
    const c = cuerpoObservacion({ tipo: 'dolor', texto: '  ', zona: 'rodilla', intensidad: 12, sessionId: 's1' });
    expect(c).toEqual({ tipo: 'dolor', texto: 'Dolor en rodilla, 10 de 10.', session_id: 's1', dolor_zona: 'rodilla', dolor_intensidad: 10 });
    const o = cuerpoObservacion({ tipo: 'observacion', texto: 'Dormí poco', zona: 'rodilla', intensidad: 3, exerciseId: 'e1' });
    expect(o).toEqual({ tipo: 'observacion', texto: 'Dormí poco', exercise_id: 'e1' });
  });
});

describe('ids', () => {
  it('SYNC-001: 10.000 ids seguidos son UUID v7, crecen y no se repiten, aunque el reloj no avance o retroceda', () => {
    let reloj = AHORA;
    let semilla = 7;
    const azar = (n: number) => Uint8Array.from({ length: n }, () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) & 0xff);
    const nuevo = crearGeneradorUuidV7({ ahora: () => reloj, aleatorio: azar });
    const ids: string[] = [];
    for (let i = 0; i < 10_000; i++) {
      if (i === 5000) reloj -= 60_000;
      if (i % 3000 === 0) reloj += 1;
      ids.push(nuevo());
    }
    expect(ids.every(esUuidV7)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
  });
});
