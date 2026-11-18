// ─────────────────────────────────────────────────────────────────────────────
// Pruebas del registro de sesión · Zona: Entrenar (pruebas)
//
// Qué hace: prueba sin teléfono las reglas del registro (más y menos, serie hecha, fallé,
// deshacer, añadir serie, descanso) y el resumen local del cierre. Los ids son los del plan de
// pruebas (docs/pruebas/plan-de-validacion.md).
// Tócalo cuando: cambie una regla de sesionLocal.ts.
// Depende de: vitest, ../sesionLocal y ./fixtures.
// ─────────────────────────────────────────────────────────────────────────────
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as S from '../sesionLocal';
import { AHORA, idPrueba, sesionMartina } from './fixtures';

afterEach(() => vi.restoreAllMocks());

describe('registro de sesión', () => {
  it('APP-026: 60 kg × 8, dos más y un menos en kilos, un menos en reps: queda 62,5 × 7 y marcar no llama a la red', () => {
    const fetchEspia = vi.fn();
    vi.stubGlobal('fetch', fetchEspia);
    let s = sesionMartina();
    s = S.cambiarActiva(s, { peso_kg: 60, reps: 8 });
    const kg = () => S.ejercicioActual(s)?.series[S.indiceActiva(S.ejercicioActual(s))]?.peso_kg ?? 0;
    const reps = () => S.ejercicioActual(s)?.series[S.indiceActiva(S.ejercicioActual(s))]?.reps ?? 0;
    s = S.cambiarActiva(s, { peso_kg: kg() + S.PASO_KG });
    s = S.cambiarActiva(s, { peso_kg: kg() + S.PASO_KG });
    s = S.cambiarActiva(s, { peso_kg: kg() - S.PASO_KG });
    s = S.cambiarActiva(s, { reps: reps() - S.PASO_REPS });
    const r = S.marcar(s, false, AHORA);
    expect(r.marcada?.serie).toMatchObject({ peso_kg: 62.5, reps: 7, estado: 'hecha' });
    expect(fetchEspia).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('APP-026: la serie que sigue hereda los kilos y el RIR de la recién hecha', () => {
    let s = S.cambiarActiva(sesionMartina(), { peso_kg: 85, rir: 1 });
    s = S.marcar(s, false, AHORA).sesion;
    const siguiente = S.ejercicioActual(s)?.series[1];
    expect(siguiente).toMatchObject({ peso_kg: 85, rir: 1, estado: 'pendiente' });
  });

  it('APP-027: «Fallé» guarda la serie 2 con sus 6 repeticiones; deshacer la deja pendiente', () => {
    let s = S.marcar(sesionMartina(), false, AHORA).sesion;
    s = S.cambiarActiva(s, { reps: 6 });
    const r = S.marcar(s, true, AHORA);
    expect(r.marcada).toMatchObject({ ej: 0, i: 1, serie: { reps: 6, estado: 'fallada' } });
    const des = S.deshacer(r.sesion, { ej: 0, i: 1 });
    expect(S.ejercicioActual(des)?.series[1]?.estado).toBe('pendiente');
    expect(S.indiceActiva(S.ejercicioActual(des))).toBe(1);
  });

  it('APP-028: «Añadir serie» suma la serie 5 con los kilos de la última', () => {
    const s = S.anadirSerie(S.cambiarActiva(sesionMartina(), { peso_kg: 82.5 }), idPrueba());
    const e = S.ejercicioActual(s);
    expect(e?.series).toHaveLength(5);
    expect(e?.series[4]).toMatchObject({ serie_n: 5, peso_kg: 82.5, reps: 8, estado: 'pendiente' });
  });

  it('APP-030: marcar arranca el descanso del ejercicio; la última serie de la sesión no', () => {
    let s = sesionMartina();
    expect(S.marcar(s, false, AHORA).descansoS).toBe(180);
    let ultimo: number | null = 0;
    for (let k = 0; k < S.totalSeries(s); k++) {
      const e = S.ejercicioActual(s);
      if (S.indiceActiva(e) === -1) s = S.irA(s, S.siguientePendiente(s));
      const r = S.marcar(s, false, AHORA);
      s = r.sesion;
      ultimo = r.descansoS;
    }
    expect(S.seriesMarcadas(s)).toBe(S.totalSeries(s));
    expect(ultimo).toBeNull();
  });

  it('APP-030: «Terminar» avisa cuántas series quedan sin marcar', () => {
    const s = S.marcar(sesionMartina(), false, AHORA).sesion;
    expect(S.textoQuedan(s)).toBe('Te quedan 9 series sin marcar. Se guardan como no hechas.');
    expect(S.textoSigue(s)).toBe('Serie 2 · 82,5 kg × 8');
  });

  it('APP-026: kilos y repeticiones no salen de sus límites', () => {
    const s = S.cambiarActiva(sesionMartina(), { peso_kg: -5, reps: 0 });
    expect(S.ejercicioActual(s)?.series[0]).toMatchObject({ peso_kg: 0, reps: 1 });
  });
});

describe('resumen al terminar', () => {
  function completar(fallarUltima = false) {
    let s = sesionMartina();
    while (S.seriesMarcadas(s) < S.totalSeries(s)) {
      if (S.indiceActiva(S.ejercicioActual(s)) === -1) s = S.irA(s, S.siguientePendiente(s));
      const quedaUna = S.totalSeries(s) - S.seriesMarcadas(s) === 1;
      s = S.marcar(s, fallarUltima && quedaUna, AHORA).sesion;
    }
    return s;
  }

  it('APP-031: con récords, volumen = kilos × reps y kcal = 5 × peso × horas', () => {
    const r = S.resumenLocal(completar(), AHORA + 3254_000, null);
    // 82,5×8×4 + 60×10×3 + 140×12×3
    expect(r.volumen_kg).toBe(82.5 * 8 * 4 + 60 * 10 * 3 + 140 * 12 * 3);
    expect(r.kcal).toBe(Math.round(5 * 62.4 * (3254 / 3600)));
    expect(r.series_hechas).toBe(10);
    expect(r.prs.map((p) => p.nombre)).toEqual(['Sentadilla', 'Prensa']);
    expect(r.prs[0]).toMatchObject({ marca: '82,5 kg × 8', diferencia: '+2,5 kg' });
    expect(r.ejercicios_incompletos).toEqual([]);
  });

  it('APP-031: la doble progresión sube si llegó al tope en todas y lo dice', () => {
    const r = S.resumenLocal(completar(), AHORA + 60_000, null);
    expect(r.sugerencias[0]).toMatchObject({ nombre: 'Sentadilla', peso_kg: 85, sube_kg: 2.5, por: 'Llegaste a 8 en las 4 series.' });
  });

  it('APP-031: incompleta: dice qué quedó sin marcar y mantiene el peso donde no hubo series', () => {
    let s = sesionMartina();
    s = S.marcar(s, false, AHORA).sesion;
    const r = S.resumenLocal(s, AHORA + 60_000, null);
    expect(r.series_hechas).toBe(1);
    expect(r.ejercicios_incompletos).toEqual(['Sentadilla', 'Peso muerto rumano', 'Prensa']);
    expect(r.sugerencias[1]).toMatchObject({ peso_kg: 60, sube_kg: 0, por: 'Sin series hoy. Se mantiene 60 kg.' });
  });

  it('APP-031: sin peso corporal no hay kcal (H-13)', () => {
    const s = { ...completar(), peso_corporal_kg: null };
    expect(S.resumenLocal(s, AHORA + 60_000, null).kcal).toBeNull();
  });
});
