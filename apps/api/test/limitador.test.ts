// Límite de intentos y reloj, sin base.
import { describe, expect, it } from 'vitest';
import { aMilisegundos, crearRelojFijo } from '../src/reloj';
import { crearLimitador } from '../src/seguridad/limitador';

describe('limitador', () => {
  it('deja pasar hasta el máximo, bloquea el siguiente con Retry-After y se abre al cumplirse la ventana', () => {
    const reloj = crearRelojFijo('2026-11-17T13:00:00Z');
    const l = crearLimitador({ maximo: 5, ventanaMs: 60_000, reloj });
    for (let i = 0; i < 5; i++) expect(l.intentar('ip').permitido).toBe(true);
    reloj.avanzar('20s');
    expect(l.intentar('ip')).toEqual({ permitido: false, reintentarEnS: 40 });
    expect(l.intentar('otra-ip').permitido).toBe(true);
    reloj.avanzar('40s');
    expect(l.intentar('ip').permitido).toBe(true);
  });
  it('el reloj fijo entiende ms, s, m, h y d', () => {
    expect(aMilisegundos('7d')).toBe(604_800_000);
    expect(aMilisegundos('15m')).toBe(900_000);
    expect(aMilisegundos(5)).toBe(5);
    expect(() => aMilisegundos('2 semanas')).toThrow();
  });
});
