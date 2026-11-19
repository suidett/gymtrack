// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de las validaciones del entrenador · Zona: Entrenador (app)
//
// Qué hace: prueba en Node que las hojas del entrenador revisan lo mismo que la API antes de
// enviar: en Resolver alerta «Nada, fue algo puntual» va sola (y lo que se manda pasa
// esquemaAlertaCambio), el consejo o la respuesta no van vacíos ni pasan de 1000 caracteres, y
// Ajustar cargas no deja subir de 500 kg ni la nota de 300 caracteres. Cada prueba lleva el id de
// docs/pruebas/validaciones.md (VAL-xxx).
// Tócalo cuando: cambie una de esas reglas en ../logica.ts.
// Depende de: vitest, @gymtrack/shared (esquemas de la API) y ../logica.
// ─────────────────────────────────────────────────────────────────────────────
import { esquemaAlertaCambio, esquemaSugerenciaCambio, PESO_MAX_KG } from '@gymtrack/shared';
import { describe, expect, it } from 'vitest';
import { alternarSalida, cuerpoSobrescribir, LIMITE_CARGA_KG, MENSAJE_MAX, NOTA_AJUSTE_MAX, validarMensaje } from '../logica';

describe('Resolver alerta (VAL-041)', () => {
  it('VAL-041 marcar «Nada» limpia las demás y marcar otra limpia «Nada»', () => {
    expect(alternarSalida(['cargas', 'consejo'], 'nada', true)).toEqual(['nada']);
    expect(alternarSalida(['nada'], 'rutina', true)).toEqual(['rutina']);
    expect(alternarSalida(['cargas', 'consejo'], 'cargas', false)).toEqual(['consejo']);
    const elegidas = alternarSalida(alternarSalida([], 'cargas', true), 'consejo', true);
    expect(esquemaAlertaCambio.safeParse({ estado: 'resuelta', acciones: elegidas }).success).toBe(true);
  });
});

describe('Consejo y Ajustar cargas (VAL-045, VAL-046)', () => {
  it('VAL-045 el consejo no va vacío ni pasa de 1000 caracteres', () => {
    expect(validarMensaje('   ', false)).toBe('Escribe el consejo antes de enviarlo.');
    expect(validarMensaje('x'.repeat(MENSAJE_MAX + 1), true)).toBe('El mensaje va hasta 1000 caracteres.');
    expect(validarMensaje('Duerme 8 horas.', false)).toBeNull();
  });
  it('VAL-046 la carga llega hasta el tope de la API y la nota hasta 300', () => {
    expect(LIMITE_CARGA_KG).toBe(PESO_MAX_KG);
    expect(NOTA_AJUSTE_MAX).toBe(300);
    const cuerpo = cuerpoSobrescribir({ peso_kg: 82.5, reps_min: 8, reps_max: 10, nota: '  baja lento ' });
    expect(esquemaSugerenciaCambio.safeParse(cuerpo).success).toBe(true);
    expect(esquemaSugerenciaCambio.safeParse({ ...cuerpo, nota: 'n'.repeat(301) }).success).toBe(false);
  });
});
