import { describe, expect, it } from 'vitest';
import { sugerirProgresion, type EntradaProgresion, type WorkoutSet } from '../index';

const set = (pesoKg: number, reps: number, rir: number | null = 2, fallo = false): WorkoutSet => ({
  id: `${pesoKg}x${reps}-${Math.random()}`, serieN: 1, pesoKg, reps, rir, completada: true, fallo,
});

const base: Omit<EntradaProgresion, 'setsActuales'> = {
  metodo: 'doble_progresion',
  routineExerciseId: 're1',
  exerciseId: 'ex1',
  nombre: 'Press de banca',
  series: 3,
  repsMin: 8,
  repsMax: 10,
  rirObjetivo: 2,
  incrementoKg: 2.5,
};

describe('doble progresión', () => {
  it('al tope del rango sube el peso y vuelve al mínimo de repeticiones', () => {
    const s = sugerirProgresion({ ...base, setsActuales: [set(30, 10), set(30, 10), set(30, 10)] });
    expect(s?.motivo).toBe('tope_del_rango');
    expect(s?.pesoKg).toBe(32.5);
    expect(s?.repsMin).toBe(8);
    expect(s?.texto).toContain('32,5 kg');
    expect(s?.texto).toContain('35 kg');
  });

  it('dentro del rango mantiene el peso y explica cuándo subir', () => {
    const s = sugerirProgresion({ ...base, setsActuales: [set(30, 9), set(30, 8), set(30, 8)] });
    expect(s?.motivo).toBe('dentro_del_rango');
    expect(s?.pesoKg).toBe(30);
    expect(s?.texto).toBe(
      'Próxima sesión intenta 30 kg × 8 a 10. Si consigues 10 o más con RIR 2 o más, sube a 32,5 kg.',
    );
  });

  it('al tope pero con RIR bajo el objetivo, no sube', () => {
    const s = sugerirProgresion({ ...base, setsActuales: [set(30, 10, 0), set(30, 10, 1), set(30, 10, 2)] });
    expect(s?.motivo).toBe('dentro_del_rango');
    expect(s?.pesoKg).toBe(30);
  });

  it('bajo el mínimo una vez mantiene; dos veces seguidas baja', () => {
    const una = sugerirProgresion({ ...base, setsActuales: [set(30, 7), set(30, 6), set(30, 6)] });
    expect(una?.motivo).toBe('bajo_el_minimo');
    expect(una?.pesoKg).toBe(30);
    const dos = sugerirProgresion({
      ...base,
      setsActuales: [set(30, 7), set(30, 6), set(30, 6)],
      setsAnteriores: [set(30, 7), set(30, 7), set(30, 5)],
    });
    expect(dos?.motivo).toBe('baja_dos_sesiones');
    expect(dos?.pesoKg).toBe(27.5);
  });

  it('sin series completadas no sugiere nada', () => {
    expect(sugerirProgresion({ ...base, setsActuales: [] })).toBeNull();
  });

  it('otros métodos avisan que se calculan como doble progresión', () => {
    const s = sugerirProgresion({ ...base, metodo: 'cluster', setsActuales: [set(30, 10), set(30, 10), set(30, 10)] });
    expect(s?.texto).toContain('Cluster');
  });
});

describe('lineal', () => {
  it('sube cuando se completan todas las series', () => {
    const s = sugerirProgresion({ ...base, metodo: 'lineal', setsActuales: [set(60, 8), set(60, 8), set(60, 8)] });
    expect(s?.motivo).toBe('lineal_sube');
    expect(s?.pesoKg).toBe(62.5);
  });
  it('baja 10 % tras dos sesiones fallidas', () => {
    const s = sugerirProgresion({
      ...base,
      metodo: 'lineal',
      setsActuales: [set(60, 8), set(60, 6, 0, true)],
      setsAnteriores: [set(60, 8), set(60, 5, 0, true)],
    });
    expect(s?.motivo).toBe('lineal_baja');
    expect(s?.pesoKg).toBe(55);
  });
});
