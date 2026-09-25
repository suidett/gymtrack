import { describe, expect, it } from 'vitest';
import { e1rm, fmtKg, fmtNum, kcalEstimadas, redondearCarga, volumenSets } from '../index';
import type { WorkoutSet } from '../index';

const set = (pesoKg: number, reps: number, completada = true): WorkoutSet => ({
  id: `${pesoKg}x${reps}`, serieN: 1, pesoKg, reps, rir: null, completada, fallo: false,
});

describe('e1rm (Epley)', () => {
  it('una repetición es el peso mismo', () => expect(e1rm(100, 1)).toBe(100));
  it('60 kg por 8 estima 76 kg', () => expect(e1rm(60, 8)).toBe(76));
  it('más de 12 repeticiones no se estima', () => expect(e1rm(60, 13)).toBeNull());
  it('sin peso no hay estimación', () => expect(e1rm(0, 5)).toBeNull());
});

describe('volumen', () => {
  it('suma solo las series completadas', () => {
    expect(volumenSets([set(60, 8), set(60, 8), set(60, 8, false)])).toBe(960);
  });
});

describe('formato', () => {
  it('usa coma decimal y no muestra ,0', () => {
    expect(fmtNum(47.5)).toBe('47,5');
    expect(fmtNum(60)).toBe('60');
    expect(fmtKg(32.5)).toBe('32,5 kg');
  });
  it('redondea la carga al múltiplo', () => {
    expect(redondearCarga(53.7)).toBe(52.5);
    expect(redondearCarga(54)).toBe(55);
  });
});

describe('kcal', () => {
  it('MET 5 por peso corporal por horas', () => expect(kcalEstimadas(70, 3600)).toBe(350));
});
