// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de Ingreso, Crear cuenta y Recuperar · Zona: Acceso
//
// Qué hace: prueba sin teléfono ni red la lógica de las pantallas de acceso: los textos de
// validación de las maquetas, cómo se lee cada error de la API (credenciales, 429 con
// Retry-After, sin red, correo repetido, enlace vencido) y la cuenta de reenvíos del enlace.
// Cada prueba lleva el id del plan (docs/pruebas/plan-de-validacion.md).
// Tócalo cuando: cambie un texto o una regla de validacion.ts, errores.ts o recuperar.ts.
// Depende de: vitest, @gymtrack/shared (ErrorDeApi) y los archivos de ../.
// ─────────────────────────────────────────────────────────────────────────────
import { ErrorDeApi } from '@gymtrack/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  errorDeIngreso,
  errorDePedirEnlace,
  errorDeRegistro,
  errorDeRestablecer,
  formatoReloj,
  formTrasErrorIngreso,
  restaHasta,
  TEXTO_CORREO_USADO,
} from '../errores';
import {
  avisoReenvio,
  enviosEnLaHora,
  llegoAlLimite,
  proximoPermitido,
  reenvioDesde,
  registrarEnvio,
  SIN_ENVIOS,
  venceEnlace,
} from '../recuperar';
import { errorCorreo, reglaContrasena, sinErrores, validarIngreso, validarRegistro } from '../validacion';

const errorRed = () => new TypeError('Network request failed');
const errorApi = (estado: number, codigo: ConstructorParameters<typeof ErrorDeApi>[1], detalles?: Record<string, unknown>, retry?: number) =>
  new ErrorDeApi(estado, codigo, 'mensaje de la API', detalles, retry);

// ── Ingreso ──────────────────────────────────────────────────────────────────
describe('Ingreso (PAN-01)', () => {
  it('APP-001 · el correo sin @ da «Revisa el correo: le falta la @.» y no deja llamar a la API', () => {
    const ingresar = vi.fn();
    const err = validarIngreso({ correo: 'martina.gymtrack.test', clave: 'sentadilla25' });
    if (sinErrores(err)) ingresar();
    expect(err.correo).toBe('Revisa el correo: le falta la @.');
    expect(ingresar).not.toHaveBeenCalled();
  });

  it('APP-001 · los otros dos textos del correo y la contraseña vacía', () => {
    expect(errorCorreo('')).toBe('Escribe tu correo.');
    expect(errorCorreo('martina@gymtrack')).toBe('Revisa el correo: le falta el final, como .cl o .com.');
    expect(errorCorreo('  martina@gymtrack.test ')).toBeNull();
    expect(validarIngreso({ correo: 'martina@gymtrack.test', clave: '' }).clave).toBe('Escribe tu contraseña.');
    // Una contraseña vieja más corta que 8 tiene que llegar a la API (y dar 401), no frenarse aquí.
    expect(validarIngreso({ correo: 'martina@gymtrack.test', clave: 'corta' })).toEqual({});
  });

  it('APP-002 · un 401 no dice cuál de los dos falló; el correo queda y la contraseña se borra', () => {
    const r = errorDeIngreso(errorApi(401, 'INVALID_CREDENTIALS'));
    expect(r.tipo).toBe('credenciales');
    if (r.tipo !== 'credenciales') return;
    expect(r.mensaje.titulo).toBe('No pudimos ingresar');
    expect(r.mensaje.texto).toContain('El correo o la contraseña no coinciden');
    const form = formTrasErrorIngreso({ correo: 'martina@gymtrack.test', clave: 'sentadila25' }, r);
    expect(form).toEqual({ correo: 'martina@gymtrack.test', clave: '' });
  });

  it('APP-003 · un 429 con Retry-After 48 da «Demasiados intentos» y cuenta desde 48 hasta 0', () => {
    const r = errorDeIngreso(errorApi(429, 'RATE_LIMITED', undefined, 48));
    expect(r.tipo).toBe('bloqueo');
    if (r.tipo !== 'bloqueo') return;
    expect(r.mensaje.titulo).toBe('Demasiados intentos');
    expect(r.esperaS).toBe(48);
    const inicio = 1_000_000;
    const fin = inicio + r.esperaS * 1000;
    expect(formatoReloj(restaHasta(fin, inicio))).toBe('0:48');
    expect(restaHasta(fin, inicio + 47_500)).toBe(1);
    // A los 48 s la cuenta llega a 0: el botón vuelve a «Ingresar».
    expect(restaHasta(fin, inicio + 48_000)).toBe(0);
    // Sin Retry-After se espera el minuto del límite (5 por minuto por IP).
    const sinCabecera = errorDeIngreso(errorApi(429, 'RATE_LIMITED'));
    expect(sinCabecera.tipo === 'bloqueo' && sinCabecera.esperaS).toBe(60);
  });

  it('APP-004 · sin red se ve «Sin conexión», con la barra gris, y la contraseña no se borra', () => {
    const r = errorDeIngreso(errorRed());
    expect(r.tipo).toBe('red');
    if (r.tipo !== 'red') return;
    expect(r.mensaje).toEqual({
      titulo: 'Sin conexión',
      texto: 'Para ingresar necesitas internet. Revisa la señal o el wifi e intenta de nuevo.',
      tono: 'neutro',
    });
    expect(formTrasErrorIngreso({ correo: 'a@b.cl', clave: 'x' }, r).clave).toBe('x');
  });

  it('APP-002 · un correo que la regla local deja pasar y Zod rechaza va bajo el campo, no como error del servidor', () => {
    const zod = Object.assign(new Error('forma'), { name: 'ZodError', issues: [{ path: ['email'] }] });
    expect(errorDeIngreso(zod)).toEqual({ tipo: 'correo', texto: 'Revisa el correo: no tiene el formato nombre@dominio.' });
  });
});

// ── Crear cuenta ─────────────────────────────────────────────────────────────
describe('Crear cuenta (PAN-02)', () => {
  it('APP-006 · 6 caracteres dan «Al menos 8 caracteres · te faltan 2» y el apellido vacío su error, sin llamar', () => {
    const registrar = vi.fn();
    const form = { rol: 'cliente' as const, nombre: 'Sofía', apellido: '', correo: 'sofia.lagos@gymtrack.test', clave: 'gym202' };
    const err = validarRegistro(form);
    if (sinErrores(err)) registrar();
    expect(err.apellido).toBe('Escribe tu apellido.');
    expect(err.clave).toBe('corta');
    expect(reglaContrasena(form.clave, true)).toMatchObject({ cumple: false, texto: 'Al menos 8 caracteres · te faltan 2', cuenta: '6/8' });
    expect(registrar).not.toHaveBeenCalled();
  });

  it('APP-006 · la regla está a la vista antes de intentar y se marca sola a los 8', () => {
    expect(reglaContrasena('gym', false)).toMatchObject({ cumple: false, texto: 'Al menos 8 caracteres', cuenta: '3/8' });
    expect(reglaContrasena('gym2026a', false)).toMatchObject({ cumple: true, texto: 'Al menos 8 caracteres', cuenta: null });
    expect(reglaContrasena('gym2026', true).texto).toBe('Al menos 8 caracteres · te falta 1');
  });

  it('APP-006 · sin rol elegido pide elegirlo', () => {
    const err = validarRegistro({ rol: null, nombre: 'Sofía', apellido: 'Lagos', correo: 'sofia.lagos@gymtrack.test', clave: 'sentadilla25' });
    expect(err).toEqual({ rol: 'Elige cómo vas a usar GymTrack.' });
  });

  it('APP-007 · un 409 EMAIL_TAKEN pone «Ya hay una cuenta con este correo.» bajo el correo', () => {
    expect(errorDeRegistro(errorApi(409, 'EMAIL_TAKEN'))).toEqual({ tipo: 'correo-usado' });
    expect(TEXTO_CORREO_USADO).toBe('Ya hay una cuenta con este correo.');
  });

  it('APP-007 · un 400 de la API sobre un campo va bajo ese campo; sin red, el mensaje gris', () => {
    expect(errorDeRegistro(errorApi(400, 'VALIDATION_ERROR', { campo: 'apellido' }))).toMatchObject({ tipo: 'campo', campo: 'apellido' });
    const red = errorDeRegistro(errorRed());
    expect(red.tipo === 'mensaje' && red.mensaje.tono).toBe('neutro');
  });
});

// ── Recuperar ────────────────────────────────────────────────────────────────
describe('Recuperar contraseña (PAN-03)', () => {
  const T0 = Date.parse('2026-11-17T12:41:00.000Z');

  it('APP-009 · reenviar espera 60 s; el segundo envío avisa «2 de 3»; después del tercero, límite', () => {
    let e = registrarEnvio(SIN_ENVIOS, 'martina@gymtrack.test', T0);
    // Antes de los 60 s el botón está deshabilitado.
    expect(restaHasta(reenvioDesde(e), T0 + 30_000)).toBe(30);
    expect(restaHasta(reenvioDesde(e), T0 + 60_000)).toBe(0);
    e = registrarEnvio(e, 'martina@gymtrack.test', T0 + 61_000);
    expect(avisoReenvio(enviosEnLaHora(e, T0 + 61_000))).toBe('Te mandamos otro enlace (2 de 3 en esta hora). Usa el más reciente.');
    expect(llegoAlLimite(e, T0 + 61_000)).toBe(false);
    e = registrarEnvio(e, 'martina@gymtrack.test', T0 + 125_000);
    expect(llegoAlLimite(e, T0 + 190_000)).toBe(true);
    // Sin Retry-After, se puede volver a pedir una hora después del primero.
    expect(proximoPermitido(e, T0 + 190_000, null)).toBe(T0 + 3_600_000);
  });

  it('APP-009 · la API responde 429: «Límite de envíos», con la hora del Retry-After', () => {
    const r = errorDePedirEnlace(errorApi(429, 'RATE_LIMITED', undefined, 1860));
    expect(r).toEqual({ tipo: 'limite', esperaS: 1860 });
    expect(proximoPermitido(SIN_ENVIOS, T0, 1860)).toBe(T0 + 1_860_000);
  });

  it('APP-009 · el enlace vence una hora después de pedirlo; otro correo parte la cuenta de cero', () => {
    const e = registrarEnvio(SIN_ENVIOS, 'martina@gymtrack.test', T0);
    expect(venceEnlace(e)).toBe(T0 + 3_600_000);
    const otro = registrarEnvio(e, 'diego.munoz@gymtrack.test', T0 + 70_000);
    expect(otro.horas).toEqual([T0 + 70_000]);
    // Los envíos de hace más de una hora ya no cuentan.
    expect(enviosEnLaHora(e, T0 + 3_600_001)).toBe(0);
  });

  it('APP-010 · un token vencido, usado o inventado lleva a «Enlace vencido»', () => {
    expect(errorDeRestablecer(errorApi(400, 'RESET_TOKEN_INVALID'))).toEqual({ tipo: 'vencido' });
    expect(errorDeRestablecer(errorApi(400, 'VALIDATION_ERROR', { campo: 'token' }))).toEqual({ tipo: 'vencido' });
    expect(errorDeRestablecer(errorApi(400, 'VALIDATION_ERROR', { campo: 'password' })).tipo).toBe('clave');
    expect(errorDeRestablecer(errorRed())).toEqual({ tipo: 'red' });
  });
});
