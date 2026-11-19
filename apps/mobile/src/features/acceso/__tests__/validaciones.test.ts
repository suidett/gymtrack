// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de las validaciones de Acceso y Encuesta · Zona: Acceso
//
// Qué hace: prueba en Node que las pantallas de acceso y la encuesta muestran junto al campo, sin
// llamar a la API, las mismas reglas que revisa la API: nombre y apellido con letras, correo con
// el esquema de la API, contraseña fácil de adivinar o igual al correo, edad máxima, peso de hasta
// 300 kg, altura y peso que calcen (IMC), y que un error de la API se lea con su motivo bajo la
// pregunta o el campo. Cada prueba lleva el id de docs/pruebas/validaciones.md (VAL-xxx).
// Tócalo cuando: cambie una regla de ../validacion.ts, ../errores.ts, ../encuesta.ts o
// ../encuestaApi.ts.
// Depende de: vitest, @gymtrack/shared (ErrorDeApi), ../validacion, ../errores, ../encuesta y
// ../encuestaApi.
// ─────────────────────────────────────────────────────────────────────────────
import { ErrorDeApi } from '@gymtrack/shared';
import { describe, expect, it } from 'vitest';
import { estadoInicial, reducirEncuesta, type AccionEncuesta, type EstadoEncuesta } from '../encuesta';
import { falloDeEncuesta } from '../encuestaApi';
import { errorDeRegistro, errorDeRestablecer } from '../errores';
import { errorContrasenaNueva, errorCorreo, LARGO_MAXIMO, validarCuentaGoogle, validarRegistro } from '../validacion';

const HOY = new Date(2026, 10, 17, 10, 0, 0);
const correr = (acciones: AccionEncuesta[], s: EstadoEncuesta = estadoInicial(HOY)) => acciones.reduce(reducirEncuesta, s);
const sig: AccionEncuesta = { tipo: 'siguiente' };
/** Hasta la pregunta 6 (fecha de nacimiento), índice 5. */
const HASTA_FECHA: AccionEncuesta[] = [
  { tipo: 'elegir', valor: 'ganar_masa' },
  sig,
  { tipo: 'elegir', valor: 'nunca' },
  sig,
  { tipo: 'elegir', valor: 3 },
  sig,
  { tipo: 'elegir', valor: 'gimnasio_completo' },
  sig,
  { tipo: 'elegir', valor: 45 },
  sig,
];
const fecha = (d: string, mesesDesdeEnero: number, a: string): AccionEncuesta[] => [
  { tipo: 'escribir', campo: 'd', valor: d },
  ...Array.from({ length: mesesDesdeEnero + 1 }, () => ({ tipo: 'pasar', campo: 'm', dir: 1 }) as AccionEncuesta),
  { tipo: 'escribir', campo: 'a', valor: a },
];

describe('Crear cuenta y Completa tu cuenta (VAL-001, VAL-004, VAL-005)', () => {
  it('VAL-001 el nombre y el apellido con números o símbolos se marcan junto al campo', () => {
    const err = validarRegistro({ rol: 'cliente', nombre: 'Martina2', apellido: '<b>', correo: 'martina@gymtrack.test', clave: 'sentadilla25' });
    expect(err.nombre).toBe('Tu nombre solo puede tener letras, espacios, guiones y apóstrofos.');
    expect(err.apellido).toBe('Tu apellido solo puede tener letras, espacios, guiones y apóstrofos.');
    expect(validarCuentaGoogle({ rol: 'entrenador', nombre: 'Ma. José', apellido: "O'Ryan" })).toEqual({});
    expect(LARGO_MAXIMO).toEqual({ correo: 254, clave: 128, nombre: 80 });
  });

  it('VAL-004 una contraseña de las más usadas se marca antes de enviar, en Crear cuenta y en Nueva contraseña', () => {
    expect(validarRegistro({ rol: 'cliente', nombre: 'Ana', apellido: 'Paz', correo: 'ana@gymtrack.test', clave: '12345678' }).clave).toBe(
      'Esa contraseña es muy fácil de adivinar. Usa otra.',
    );
    expect(errorContrasenaNueva('aaaaaaaa')).toBe('Esa contraseña es muy fácil de adivinar. Usa otra.');
    expect(errorContrasenaNueva('corta')).toBe('corta');
  });

  it('VAL-005 la contraseña no puede ser el correo', () => {
    const err = validarRegistro({ rol: 'cliente', nombre: 'Ana', apellido: 'Paz', correo: ' Ana.Paz@gymtrack.test', clave: 'ana.paz' + '@gymtrack.test' });
    expect(err.clave).toBe('La contraseña no puede ser tu correo.');
  });

  it('VAL-007 un correo con dos @ o con espacios no sale del teléfono', () => {
    expect(errorCorreo('martina@@gymtrack.test')).toBe('Revisa el correo: le falta el final, como .cl o .com.');
    expect(errorCorreo('mar tina@gymtrack.test')).toBe('Revisa el correo: le falta el final, como .cl o .com.');
    expect(errorCorreo('martina@gymtrack..cl')).toBe('Revisa el correo: no tiene el formato nombre@dominio.');
    expect(errorCorreo('martina@gymtrack.test')).toBeNull();
  });

  it('VAL-008 el error de la API se ve con su motivo bajo el campo', () => {
    const api = new ErrorDeApi(400, 'VALIDATION_ERROR', 'Revisa los datos enviados.', { campo: 'nombre', motivo: 'Tu nombre solo puede tener letras, espacios, guiones y apóstrofos.' });
    expect(errorDeRegistro(api)).toEqual({ tipo: 'campo', campo: 'nombre', mensaje: 'Tu nombre solo puede tener letras, espacios, guiones y apóstrofos.' });
    const clave = new ErrorDeApi(400, 'VALIDATION_ERROR', 'Revisa los datos enviados.', { campo: 'password', motivo: 'Esa contraseña es muy fácil de adivinar. Usa otra.' });
    expect(errorDeRestablecer(clave)).toEqual({ tipo: 'clave', mensaje: 'Esa contraseña es muy fácil de adivinar. Usa otra.' });
  });
});

describe('Encuesta (VAL-010 a VAL-013)', () => {
  it('VAL-010 una fecha de hace más de 100 años muestra la edad máxima', () => {
    const s = correr([...HASTA_FECHA, ...fecha('16', 10, '1925'), sig]);
    expect(s.n).toBe(5);
    expect(s.err).toBe('Revisa el año: la edad máxima es 100 años.');
    const bien = correr([...HASTA_FECHA, ...fecha('16', 10, '1926'), sig]);
    expect(bien.n).toBe(6);
  });

  it('VAL-011 el peso llega hasta 300 kg, como en la API', () => {
    const base = correr([...HASTA_FECHA, ...fecha('12', 2, '1997'), sig, { tipo: 'escribir', campo: 'altura', valor: '210' }, sig]);
    expect(base.n).toBe(7);
    expect(correr([{ tipo: 'escribir', campo: 'peso', valor: '301' }, sig], base).err).toBe('Escribe un número entre 30 y 300.');
    expect(correr([{ tipo: 'escribir', campo: 'peso', valor: '280' }, sig], base).n).toBe(8);
  });

  it('VAL-012 una altura y un peso que no calzan se marcan en el peso', () => {
    const base = correr([...HASTA_FECHA, ...fecha('12', 2, '1997'), sig, { tipo: 'escribir', campo: 'altura', valor: '120' }, sig]);
    const s = correr([{ tipo: 'escribir', campo: 'peso', valor: '290' }, sig], base);
    expect(s.n).toBe(7);
    expect(s.err).toBe('Revisa tu altura y tu peso: juntos no calzan.');
  });

  it('VAL-013 un 422 de la API lleva a la pregunta con el motivo de la regla', () => {
    const imc = falloDeEncuesta(new ErrorDeApi(422, 'BUSINESS_RULE', 'x', { campo: 'respuestas.peso_kg', motivo: 'Revisa tu altura y tu peso: juntos no calzan.' }));
    expect(imc).toEqual({ tipo: 'falloGuardar', irA: 7, err: 'Revisa tu altura y tu peso: juntos no calzan.' });
    const edad = falloDeEncuesta(new ErrorDeApi(422, 'BUSINESS_RULE', 'x', { campo: 'respuestas.fecha_nacimiento', motivo: 'Revisa el año: la edad máxima es 100 años.' }));
    expect(edad).toMatchObject({ irA: 5, err: 'Revisa el año: la edad máxima es 100 años.' });
  });
});
