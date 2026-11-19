// ─────────────────────────────────────────────────────────────────────────────
// Pruebas: mandar al tiro lo recién encolado · Zona: Entrenar
//
// Qué prueba: hayNuevaPendiente (cola.ts), la regla que usa useSincronizar para mandar una serie,
// una observación o un cierre en menos de un segundo sin quedar reintentando en bucle sin señal.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { hayNuevaPendiente, type OpCola } from '../cola';

const op = (id: string, estado: 'pendiente' | 'rechazada' = 'pendiente', intentos = 0): OpCola => ({
  id, session_id: 's1', creada_at: '2026-11-19T12:00:00.000Z', intentos, estado, motivo: null, codigo: null,
  tipo: 'descartar',
});

describe('mandar al tiro lo recién encolado', () => {
  it('una entrada pendiente nueva se manda al tiro', () => {
    expect(hayNuevaPendiente([op('a'), op('b')], [op('a')])).toBe(true);
    expect(hayNuevaPendiente([op('a')], [])).toBe(true);
  });

  it('un reintento sin señal (mismo id, otro intento) no dispara otro envío', () => {
    expect(hayNuevaPendiente([op('a', 'pendiente', 3)], [op('a', 'pendiente', 2)])).toBe(false);
  });

  it('lo rechazado o una cola que solo se vació no se manda', () => {
    expect(hayNuevaPendiente([op('b', 'rechazada')], [op('a')])).toBe(false);
    expect(hayNuevaPendiente([], [op('a')])).toBe(false);
  });
});
