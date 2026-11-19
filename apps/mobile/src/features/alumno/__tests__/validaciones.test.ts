// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de las validaciones del alumno · Zona: Alumno
//
// Qué hace: prueba en Node que Nueva y Editar rutina, el formulario de ejercicio propio, Registrar
// medidas, Motivos y el código del entrenador marcan antes de enviar lo mismo que rechaza la API:
// días con el mismo nombre o el mismo día de la semana, nombres vacíos o largos, más de 60
// repeticiones (o 600 segundos en los de tiempo), un nombre de ejercicio sin letras o repetido,
// medidas fuera de su rango, «otro» sin comentario y un código con letras que la API no usa.
// Cada prueba lleva el id de docs/pruebas/validaciones.md (VAL-xxx).
// Tócalo cuando: cambie una regla de ../logica.ts que también revisa la API.
// Depende de: vitest, @gymtrack/shared (esquemas de la API) y ../logica.
// ─────────────────────────────────────────────────────────────────────────────
import { esquemaDiasRutina, esquemaMedidaEntrada, esquemaReporteBajaEntrada } from '@gymtrack/shared';
import { describe, expect, it } from 'vitest';
import type { DiaDeRutina, Ejercicio } from '../datos';
import {
  cuerpoDias,
  cuerpoMedidas,
  diaNuevo,
  ejercicioNuevo,
  errorComentarioMotivos,
  erroresEjercicio,
  erroresMedidas,
  erroresRutina,
  limpiarCodigo,
  RANGO_PARTE,
  rutinaVacia,
} from '../logica';

const ej = (id: string, nombre: string, tipoCarga: Ejercicio['tipoCarga'] = 'kg'): Ejercicio => ({
  id,
  duenoId: null,
  slug: id,
  nombre,
  grupo: 'Piernas',
  equipo: 'Barra',
  patron: 'rodilla',
  tipoCarga,
  incrementoKg: 2.5,
  instrucciones: [],
  musculos: null,
  media: [],
  record: null,
  creadoAt: null,
});
const SENTADILLA = ej('0195f3a0-0000-7000-8000-000000000001', 'Sentadilla');
const PLANCHA = ej('0195f3a0-0000-7000-8000-000000000002', 'Plancha', 'tiempo');
const dia = (nombre: string, diaSemana: number | null, e: Ejercicio = SENTADILLA): DiaDeRutina => ({
  ...diaNuevo(1),
  nombre,
  diaSemana,
  ejercicios: [ejercicioNuevo(e)],
});

describe('Nueva y Editar rutina (VAL-032, VAL-037, VAL-038)', () => {
  it('VAL-032 dos días con el mismo nombre o el mismo día de la semana se marcan en el segundo, igual que la API', () => {
    const b = { ...rutinaVacia(), nombre: 'Fuerza', dias: [dia('Pierna A', 1), dia('pierna a', 3), dia('Empuje', 1)] };
    const errores = erroresRutina(b).map((x) => [x.campo, x.dia, x.texto]);
    expect(errores).toEqual([
      ['dia', 1, 'pierna a: Ya hay otro día con ese nombre.'],
      ['dia', 2, 'Empuje: Ya hay otro día el lunes.'],
    ]);
    // La API dice lo mismo con el cuerpo que arma la app (400 en el segundo día).
    const r = esquemaDiasRutina.safeParse({ dias: cuerpoDias(b.dias, false) });
    expect(r.error?.issues.map((i) => i.path.join('.'))).toEqual(['dias.1.nombre', 'dias.2.dia_semana']);
  });

  it('VAL-037 el nombre de la rutina y el del día tienen su largo; más de 14 días no se guarda', () => {
    const largo = { ...rutinaVacia(), nombre: 'x'.repeat(81), dias: [dia('y'.repeat(41), null), dia('  ', null)] };
    const textos = erroresRutina(largo).map((x) => x.texto);
    expect(textos).toContain('El nombre va hasta 80 caracteres.');
    expect(textos).toContain(`${'y'.repeat(41)}: el nombre del día va hasta 40 caracteres.`);
    expect(textos).toContain('El día 2 no tiene nombre.');
    const muchos = { ...rutinaVacia(), nombre: 'Muchos', dias: Array.from({ length: 15 }, (_, i) => dia(`Día ${i + 1}`, null)) };
    expect(erroresRutina(muchos).map((x) => x.texto)).toContain('La rutina va hasta 14 días.');
  });

  it('VAL-038 hasta 60 repeticiones con carga; los de tiempo van en segundos, hasta 600', () => {
    const pierna = dia('Pierna', null);
    pierna.ejercicios[0]!.repsMax = 61;
    expect(erroresRutina({ ...rutinaVacia(), nombre: 'R', dias: [pierna] }).map((x) => x.texto)).toEqual([
      'Sentadilla en Pierna: las repeticiones van hasta 60 por serie.',
    ]);
    const core = dia('Core', null, PLANCHA);
    expect(core.ejercicios[0]).toMatchObject({ repsMin: 30, repsMax: 45 });
    core.ejercicios[0]!.repsMax = 90;
    expect(erroresRutina({ ...rutinaVacia(), nombre: 'R', dias: [core] })).toEqual([]);
    core.ejercicios[0]!.repsMax = 601;
    expect(erroresRutina({ ...rutinaVacia(), nombre: 'R', dias: [core] }).map((x) => x.texto)).toEqual([
      'Plancha en Core: un ejercicio de tiempo va hasta 600 segundos.',
    ]);
  });
});

describe('Ejercicio propio (VAL-036, VAL-039)', () => {
  const borrador = { nombre: '', grupo: 'Piernas', equipo: 'Barra', registro: 'kg' as const, nota: '' };
  it('VAL-036 el nombre necesita letras y su largo', () => {
    expect(erroresEjercicio({ ...borrador, nombre: '123' }, []).nombre).toBe('El nombre necesita al menos una letra.');
    expect(erroresEjercicio({ ...borrador, nombre: 'x'.repeat(81) }, []).nombre).toBe('El nombre va hasta 80 caracteres.');
    expect(erroresEjercicio({ ...borrador, nombre: 'Curl nórdico', nota: 'n'.repeat(2001) }, []).nota).toBe('Las instrucciones van hasta 2000 caracteres.');
  });
  it('VAL-039 un nombre que ya está en la biblioteca, sin mirar tildes, mayúsculas ni espacios', () => {
    expect(erroresEjercicio({ ...borrador, nombre: '  SENTADILLA ' }, [SENTADILLA]).nombre).toBe('«SENTADILLA» ya está en la biblioteca.');
    expect(erroresEjercicio({ ...borrador, nombre: 'Sentadilla' }, [SENTADILLA], SENTADILLA.id)).toEqual({});
  });
});

describe('Registrar medidas (VAL-020, VAL-021)', () => {
  it('VAL-020 cada medida tiene el rango de la API y uno fuera se marca', () => {
    expect(RANGO_PARTE.brazoCm).toMatchObject({ min: 15, max: 80 });
    expect(erroresMedidas({ cinturaCm: 72, brazoCm: 90 })).toEqual({ brazoCm: 'El brazo va de 15 a 80 cm.' });
  });
  it('VAL-021 el cuerpo que arma la app pasa el esquema de la API', () => {
    const c = cuerpoMedidas('2026-11-17', { cinturaCm: 72, caderaCm: 96, pechoCm: 88, brazoCm: 27, musloCm: 55 });
    expect(esquemaMedidaEntrada.safeParse(c).success).toBe(true);
  });
});

describe('Motivos y código del entrenador (VAL-040, VAL-044)', () => {
  it('VAL-040 «otro» sin comentario se marca bajo el comentario, igual que la API', () => {
    expect(errorComentarioMotivos(['otro'], '  ')).toBe('Cuéntanos cuál es el otro motivo.');
    expect(errorComentarioMotivos(['sueno'], '')).toBeNull();
    expect(errorComentarioMotivos(['sueno'], 'x'.repeat(501))).toBe('El comentario puede tener hasta 500 caracteres.');
    expect(esquemaReporteBajaEntrada.safeParse({ alert_id: '0195f3a0-0000-7000-8000-000000000001', motivos: ['otro'] }).success).toBe(false);
  });
  it('VAL-044 el código solo deja letras sin tilde ni ñ y números, hasta 6', () => {
    expect(limpiarCodigo('ñk7p2qx9')).toBe('K7P2QX');
  });
});
