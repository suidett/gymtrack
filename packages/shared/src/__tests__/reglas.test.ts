// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de las reglas de validación compartidas · Zona: Contrato
//
// Qué hace: prueba en Node las reglas de forma y de fondo que la app y la API aplican igual
// (../api/reglas.ts) y cómo las usan los esquemas Zod de cada módulo: nombre con letras,
// contraseña fácil de adivinar o igual al correo, fecha de nacimiento de 14 a 100 años, IMC
// posible, rangos de las medidas (con null como «no lo medí»), fechas de registro, topes de
// repeticiones o segundos, días repetidos en una rutina, el dolor con su zona, «otro» con su
// comentario, «nada» sola al resolver, PATCH /me vacío y el detalle de un error para mostrarlo
// junto al campo. Cada prueba lleva el id de docs/pruebas/validaciones.md (VAL-xxx).
// Tócalo cuando: cambie una regla de reglas.ts o el esquema que la usa.
// Depende de: vitest y ../index.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import {
  detalleDeError, edadCumplida, ErrorDeApi, errorContrasenaDebil, errorFechaNacimiento, errorFechaRegistro, errorImc, errorMedida,
  errorNombrePersona, errorRepsSegun, erroresDiasRutina, esquemaAlertaCambio, esquemaDiasRutina, esquemaEjercicioNuevo,
  esquemaEncuestaRespuestas, esquemaMedidaEntrada, esquemaObservacionNueva, esquemaPerfilCambios, esquemaRegistro,
  esquemaReporteBajaEntrada, esquemaRestablecerContrasena, esquemaSerieEntrada, esquemaSugerenciaCambio, esquemaUsuarioMe,
  maxRepsSegun, restarDias, tieneLetra,
} from '../index';

const UUID = '0195f3a0-0000-7000-8000-000000000001';
const UUID_V7 = '0195f3a0-1234-7abc-8def-0123456789ab';
const primerMensaje = (r: { success: boolean; error?: { issues: { message: string; path: PropertyKey[] }[] } }) => r.error?.issues[0];

// ── Personas ─────────────────────────────────────────────────────────────────
describe('Nombre y apellido (VAL-001 a VAL-003)', () => {
  it('VAL-001 acepta tildes, ñ, guiones, apóstrofos y nombres compuestos', () => {
    for (const n of ['Martina', 'José Ignacio', 'Muñoz', "O'Higgins", 'Pérez-Cotapos', 'María José', 'Ma. Inés']) {
      expect(errorNombrePersona(n, 'nombre'), n).toBeNull();
    }
  });
  it('VAL-002 rechaza números, símbolos y lo que no empieza con letra', () => {
    expect(errorNombrePersona('Juan3', 'nombre')).toBe('Tu nombre solo puede tener letras, espacios, guiones y apóstrofos.');
    expect(errorNombrePersona('<script>', 'apellido')).toBe('Tu apellido solo puede tener letras, espacios, guiones y apóstrofos.');
    expect(errorNombrePersona('-Ana', 'nombre')).not.toBeNull();
    expect(errorNombrePersona('   ', 'nombre')).toBe('Escribe tu nombre.');
    expect(errorNombrePersona('a'.repeat(81), 'nombre')).toBe('Tu nombre puede tener hasta 80 caracteres.');
  });
  it('VAL-003 el registro y PATCH /me usan la misma regla', () => {
    const r = esquemaRegistro.safeParse({ rol: 'client', nombre: 'Ana', apellido: 'P4z', email: 'ana@gymtrack.test', password: 'sentadilla25' });
    expect(primerMensaje(r)).toMatchObject({ path: ['apellido'], message: 'Tu apellido solo puede tener letras, espacios, guiones y apóstrofos.' });
    expect(primerMensaje(esquemaPerfilCambios.safeParse({ nombre: '123' }))?.path).toEqual(['nombre']);
    expect(esquemaPerfilCambios.safeParse({ nombre: '  Valentina ' }).data).toEqual({ nombre: 'Valentina' });
  });
});

// ── Contraseñas ──────────────────────────────────────────────────────────────
describe('Contraseña nueva (VAL-004 a VAL-006)', () => {
  it('VAL-004 rechaza las más usadas y las de un solo carácter repetido', () => {
    expect(errorContrasenaDebil('12345678')).toBe('Esa contraseña es muy fácil de adivinar. Usa otra.');
    expect(errorContrasenaDebil('Password')).not.toBeNull();
    expect(errorContrasenaDebil('aaaaaaaaaa')).not.toBeNull();
    expect(errorContrasenaDebil('sentadilla25')).toBeNull();
  });
  it('VAL-005 no puede ser el correo ni lo que va antes de la @', () => {
    expect(errorContrasenaDebil('martina.fuentes', 'martina.fuentes@gymtrack.test')).toBe('La contraseña no puede ser tu correo.');
    const r = esquemaRegistro.safeParse({ rol: 'client', nombre: 'Ana', apellido: 'Paz', email: 'anapaz25@gymtrack.test', password: 'ANAPAZ25' });
    expect(primerMensaje(r)).toMatchObject({ path: ['password'], message: 'La contraseña no puede ser tu correo.' });
  });
  it('VAL-006 restablecer usa la misma regla; el ingreso no (una vieja tiene que dar 401)', () => {
    expect(primerMensaje(esquemaRestablecerContrasena.safeParse({ token: 'x', password: '11111111' }))?.path).toEqual(['password']);
    expect(esquemaRestablecerContrasena.safeParse({ token: 'x', password: 'clave-nueva-segura' }).success).toBe(true);
  });
});

// ── Encuesta ─────────────────────────────────────────────────────────────────
describe('Encuesta: edad, altura, peso e IMC (VAL-010 a VAL-013)', () => {
  it('VAL-010 la fecha de nacimiento no es futura y da de 14 a 100 años', () => {
    expect(errorFechaNacimiento('2027-01-01', '2026-11-17')).toBe('La fecha de nacimiento no puede ser futura.');
    expect(errorFechaNacimiento('2012-11-18', '2026-11-17')).toBe('Para usar GymTrack necesitas tener 14 años o más.');
    expect(errorFechaNacimiento('2012-11-17', '2026-11-17')).toBeNull();
    expect(errorFechaNacimiento('1925-11-18', '2026-11-17')).toBeNull();
    expect(errorFechaNacimiento('1925-11-17', '2026-11-17')).toBe('Revisa el año: la edad máxima es 100 años.');
    expect(edadCumplida('1997-03-12', '2026-11-17')).toBe(29);
  });
  it('VAL-011 altura de 120 a 230 cm y peso de 30 a 300 kg en el esquema', () => {
    const base = {
      objetivo: 'ganar_masa', experiencia: 'nunca', dias_semana: 3, lugar: 'gimnasio_completo', minutos_sesion: 60,
      fecha_nacimiento: '1997-03-12', altura_cm: 165, peso_kg: 63.4, lesiones: { zonas: ['ninguna'] },
    };
    expect(esquemaEncuestaRespuestas.safeParse(base).success).toBe(true);
    expect(primerMensaje(esquemaEncuestaRespuestas.safeParse({ ...base, altura_cm: 110 }))?.message).toBe('Escribe un número entre 120 y 230.');
    expect(primerMensaje(esquemaEncuestaRespuestas.safeParse({ ...base, peso_kg: 301 }))?.message).toBe('Escribe un número entre 30 y 300.');
    expect(primerMensaje(esquemaEncuestaRespuestas.safeParse({ ...base, lesiones: { zonas: ['hombro', 'hombro'] } }))?.message).toBe('Cada zona va una sola vez.');
  });
  it('VAL-012 altura y peso tienen que calzar entre sí (IMC de 12 a 70)', () => {
    expect(errorImc(165, 63.4)).toBeNull();
    expect(errorImc(230, 30)).toBe('Revisa tu altura y tu peso: juntos no calzan.');
    expect(errorImc(120, 300)).toBe('Revisa tu altura y tu peso: juntos no calzan.');
  });
});

// ── Medidas y fechas ─────────────────────────────────────────────────────────
describe('Peso, medidas y fechas de registro (VAL-020 a VAL-023)', () => {
  it('VAL-020 cada medida tiene su rango posible', () => {
    expect(errorMedida('cintura_cm', 71.5)).toBeNull();
    expect(errorMedida('cintura_cm', 0)).toBe('La cintura va de 40 a 250 cm.');
    expect(errorMedida('brazo_cm', 150)).toBe('El brazo va de 15 a 80 cm.');
    expect(errorMedida('grasa_pct', 90)).toBe('La grasa va de 3 a 70 %.');
    expect(primerMensaje(esquemaMedidaEntrada.safeParse({ peso_kg: 400 }))?.message).toBe('El peso va de 30 a 300 kg.');
  });
  it('VAL-021 null es «no lo medí»: lo que manda la app instalada sigue sirviendo', () => {
    const r = esquemaMedidaEntrada.safeParse({ fecha: '2026-11-17', cintura_cm: 71.5, cadera_cm: null, grasa_pct: null });
    expect(r.success).toBe(true);
    expect(primerMensaje(esquemaMedidaEntrada.safeParse({ cintura_cm: null }))?.message).toBe('Escribe al menos el peso o una medida.');
  });
  it('VAL-022 la fecha de un registro no es futura ni de hace más de un año', () => {
    expect(errorFechaRegistro('2026-11-18', '2026-11-17')).toBe('La fecha no puede ser futura.');
    expect(errorFechaRegistro('2025-11-17', '2026-11-17')).toBeNull();
    expect(errorFechaRegistro('2025-11-16', '2026-11-17')).toBe('La fecha puede ser de hasta un año atrás.');
    expect(restarDias('2026-03-01', 1)).toBe('2026-02-28');
  });
});

// ── Entrenamiento ────────────────────────────────────────────────────────────
describe('Topes del entrenamiento (VAL-030 a VAL-036)', () => {
  it('VAL-030 hasta 60 repeticiones con carga o con el cuerpo; 600 segundos en los de tiempo', () => {
    expect(maxRepsSegun('kg')).toBe(60);
    expect(maxRepsSegun('tiempo')).toBe(600);
    expect(errorRepsSegun('kg', 61)).toBe('Las repeticiones van hasta 60 por serie.');
    expect(errorRepsSegun('peso_corporal', 60)).toBeNull();
    expect(errorRepsSegun('tiempo', 90)).toBeNull();
    expect(errorRepsSegun('tiempo', 601)).toBe('Un ejercicio de tiempo va hasta 600 segundos.');
  });
  it('VAL-031 una serie va de 0 a 500 kg y no acepta texto ni negativos', () => {
    const serie = { id: UUID_V7, exercise_id: UUID, serie_n: 1, peso_kg: 80, reps: 8 };
    expect(esquemaSerieEntrada.safeParse(serie).success).toBe(true);
    expect(primerMensaje(esquemaSerieEntrada.safeParse({ ...serie, peso_kg: 501 }))?.message).toBe('El peso va de 0 a 500.');
    expect(esquemaSerieEntrada.safeParse({ ...serie, peso_kg: -1 }).success).toBe(false);
    expect(esquemaSerieEntrada.safeParse({ ...serie, reps: '8' }).success).toBe(false);
    expect(primerMensaje(esquemaSerieEntrada.safeParse({ ...serie, rir: 11 }))?.message).toBe('El RIR va de 0 a 10.');
  });
  it('VAL-032 dos días con el mismo nombre o el mismo día de la semana dan error en el segundo', () => {
    expect(erroresDiasRutina([{ nombre: 'Pierna A', dia_semana: 1 }, { nombre: 'pierna a ', dia_semana: 3 }, { nombre: 'Empuje', dia_semana: 1 }])).toEqual([
      { dia: 1, campo: 'nombre', mensaje: 'Ya hay otro día con ese nombre.' },
      { dia: 2, campo: 'dia_semana', mensaje: 'Ya hay otro día el lunes.' },
    ]);
    const ej = { exercise_id: UUID, series: 3, reps_min: 8, reps_max: 10 };
    const r = esquemaDiasRutina.safeParse({ dias: [{ nombre: 'Pierna', ejercicios: [ej] }, { nombre: 'Pierna', ejercicios: [ej] }] });
    expect(primerMensaje(r)).toMatchObject({ path: ['dias', 1, 'nombre'], message: 'Ya hay otro día con ese nombre.' });
  });
  it('VAL-033 series de 1 a 10, descanso hasta 10 minutos y carga inicial hasta 500 kg', () => {
    const ej = { exercise_id: UUID, series: 11, reps_min: 8, reps_max: 10 };
    const dias = (e: object) => ({ dias: [{ nombre: 'A', ejercicios: [{ ...ej, series: 3, ...e }] }] });
    expect(primerMensaje(esquemaDiasRutina.safeParse(dias({ series: 11 })))?.message).toBe('El número de series va de 1 a 10.');
    expect(esquemaDiasRutina.safeParse(dias({ descanso_s: 601 })).success).toBe(false);
    expect(esquemaDiasRutina.safeParse(dias({ peso_inicial_kg: 501 })).success).toBe(false);
    expect(esquemaDiasRutina.safeParse(dias({ peso_inicial_kg: 500 })).success).toBe(true);
  });
  it('VAL-034 un dolor lleva zona e intensidad de 1 a 10; la zona y la intensidad van solo con un dolor', () => {
    const base = { tipo: 'dolor', texto: 'Molesta', exercise_id: UUID, dolor_zona: 'rodilla', dolor_intensidad: 6 };
    expect(esquemaObservacionNueva.safeParse(base).success).toBe(true);
    expect(primerMensaje(esquemaObservacionNueva.safeParse({ ...base, dolor_intensidad: 0 }))?.message).toBe('La intensidad va de 1 a 10.');
    expect(primerMensaje(esquemaObservacionNueva.safeParse({ ...base, dolor_zona: undefined }))?.message).toBe('Indica dónde te duele.');
    expect(primerMensaje(esquemaObservacionNueva.safeParse({ ...base, tipo: 'observacion' }))?.message).toBe('La zona y la intensidad van solo con un dolor.');
  });
  it('VAL-035 la sugerencia acepta segundos (la API baja el tope si no es de tiempo) y hasta 500 kg', () => {
    expect(esquemaSugerenciaCambio.safeParse({ reps_min: 60, reps_max: 90 }).success).toBe(true);
    expect(primerMensaje(esquemaSugerenciaCambio.safeParse({ peso_kg: 900 }))?.message).toBe('El peso va hasta 500 kg.');
  });
  it('VAL-036 el nombre de un ejercicio necesita una letra', () => {
    const e = { grupo_muscular: 'Pecho', equipo: 'Barra', patron: 'empuje', incremento_default_kg: 2.5 };
    expect(primerMensaje(esquemaEjercicioNuevo.safeParse({ ...e, nombre: '!!!' }))?.message).toBe('El nombre necesita al menos una letra.');
    expect(esquemaEjercicioNuevo.safeParse({ ...e, nombre: 'Press 21s' }).success).toBe(true);
    expect(tieneLetra('5/3/1')).toBe(false);
  });
});

// ── Alertas y perfil ─────────────────────────────────────────────────────────
describe('Motivos, resolver y PATCH /me (VAL-040 a VAL-043)', () => {
  it('VAL-040 «otro» pide el comentario que lo explica', () => {
    expect(primerMensaje(esquemaReporteBajaEntrada.safeParse({ alert_id: UUID, motivos: ['otro'] }))).toMatchObject({
      path: ['comentario'], message: 'Cuéntanos cuál es el otro motivo.',
    });
    expect(esquemaReporteBajaEntrada.safeParse({ alert_id: UUID, motivos: ['otro'], comentario: 'Cambio de turno' }).success).toBe(true);
    expect(primerMensaje(esquemaReporteBajaEntrada.safeParse({ alert_id: UUID, motivos: ['sueno', 'sueno'] }))?.message).toBe('Un motivo va una sola vez.');
  });
  it('VAL-041 al resolver «nada» va sola y las acciones van solo con resuelta', () => {
    expect(primerMensaje(esquemaAlertaCambio.safeParse({ estado: 'resuelta', acciones: ['nada', 'cargas'] }))?.message).toBe('«Nada» no va con otras acciones.');
    expect(primerMensaje(esquemaAlertaCambio.safeParse({ estado: 'vista', acciones: ['cargas'] }))?.message).toBe('Las acciones van solo al resolver la alerta.');
    expect(esquemaAlertaCambio.safeParse({ estado: 'resuelta', acciones: ['cargas', 'consejo'] }).success).toBe(true);
  });
  it('VAL-042 PATCH /me necesita al menos un campo y la hora va de 00:00 a 23:59', () => {
    expect(primerMensaje(esquemaPerfilCambios.safeParse({}))?.message).toBe('Manda al menos un campo para cambiar.');
    expect(primerMensaje(esquemaPerfilCambios.safeParse({ recordatorio_hora: '24:00' }))?.message).toBe('La hora va como HH:MM, de 00:00 a 23:59.');
    expect(esquemaPerfilCambios.safeParse({ recordatorio_hora: '07:30' }).success).toBe(true);
  });
  it('VAL-043 GET /me trae el recordatorio, y una respuesta sin él (API anterior) igual se entiende', () => {
    const usuario = {
      id: UUID, email: 'a@gymtrack.test', rol: 'client', nombre: 'Ana', apellido: 'Paz', timezone: 'America/Santiago', unidades: 'kg',
      descanso_default_s: 90, modo_gimnasio: false, entrenador: null, encuesta_pendiente: false, created_at: '2026-11-17T13:00:00.000Z',
    };
    expect(esquemaUsuarioMe.parse({ ...usuario, recordatorio_activo: true, recordatorio_hora: '07:30' }).recordatorio_hora).toBe('07:30');
    expect(esquemaUsuarioMe.safeParse(usuario).success).toBe(true);
  });
});

// ── Mensaje junto al campo ───────────────────────────────────────────────────
describe('detalleDeError (VAL-050)', () => {
  it('VAL-050 saca el campo y el motivo de un ZodError o de los details de la API', () => {
    const zod = esquemaRegistro.safeParse({ rol: 'client', nombre: 'Ana', apellido: 'Paz', email: 'ana@gymtrack.test', password: '12345678' }).error;
    expect(detalleDeError(zod)).toEqual({ campo: 'password', motivo: 'Esa contraseña es muy fácil de adivinar. Usa otra.' });
    const api = new ErrorDeApi(422, 'BUSINESS_RULE', 'Revisa tu altura y tu peso: juntos no calzan.', { campo: 'respuestas.peso_kg', motivo: 'Revisa tu altura y tu peso: juntos no calzan.' });
    expect(detalleDeError(api)).toEqual({ campo: 'respuestas.peso_kg', motivo: 'Revisa tu altura y tu peso: juntos no calzan.' });
    expect(detalleDeError(new ErrorDeApi(404, 'NOT_FOUND', 'x'))).toEqual({ campo: null, motivo: null });
  });
});
