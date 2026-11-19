// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de las reglas del alumno · Zona: Alumno
//
// Qué hace: prueba en Node, sin teléfono ni red, las reglas de ../logica que deciden lo que ven
// Rutinas, Nueva rutina, Detalle de rutina, Ejercicios, Detalle de ejercicio, Progreso, Perfil y
// Motivos. Cada prueba lleva el id de su escenario de docs/pruebas/plan-de-validacion.md.
// Tócalo cuando: cambie una regla de ../logica.
// Depende de: vitest y ../logica.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import type { DiaDeRutina, Ejercicio, Medida, Rutina } from '../datos';
import {
  accionDetalle,
  accionesRutina,
  cambio30Dias,
  codigoVencido,
  consejosPara,
  cuerpoEjercicio,
  cuerpoMedidas,
  cuerpoDias,
  cuerpoRutina,
  diaNuevo,
  ejercicioNuevo,
  erroresDeApi,
  erroresEjercicio,
  erroresRutina,
  fechaBorrado,
  filtrarEjercicios,
  firmado,
  hayTendencia,
  limpiarCodigo,
  mover,
  parecidos,
  pasoDescanso,
  pesosDe,
  puedeEditarEjercicio,
  rutinaVacia,
  semanaActual,
  tendenciaSemanal,
  textoConteo,
  textoEnviar,
  textoSinTendenciaPeso,
  tituloErrores,
} from '../logica';

// ── Datos ────────────────────────────────────────────────────────────────────
const YO = 'martina';
const CAMILA = 'camila';
const MARTES = new Date(2026, 10, 17, 10); // martes 17 de noviembre de 2026

const ej = (id: string, nombre: string, grupo: string, equipo: string, duenoId: string | null = null): Ejercicio => ({
  id,
  duenoId,
  nombre,
  grupo,
  equipo,
  patron: 'tiron',
  tipoCarga: 'kg',
  incrementoKg: 2.5,
  instrucciones: [],
  musculos: null,
  media: [],
  record: null,
  creadoAt: null,
});

const BIBLIOTECA = [
  ej('remo', 'Remo con barra', 'Espalda', 'Barra'),
  ej('remo-polea', 'Remo en polea baja', 'Espalda', 'Polea'),
  ej('jalon', 'Jalón al pecho', 'Espalda', 'Polea'),
  ej('sentadilla', 'Sentadilla', 'Piernas', 'Barra'),
  ej('bulgara', 'Sentadilla búlgara', 'Piernas', 'Mancuerna'),
  ej('curl', 'Curl femoral', 'Piernas', 'Máquina'),
];

const dia = (nombre: string, diaSemana: number | null, n = 1): DiaDeRutina => ({
  ...diaNuevo(1),
  nombre,
  diaSemana,
  ejercicios: Array.from({ length: n }, (_, i) => ejercicioNuevo({ ...BIBLIOTECA[i % BIBLIOTECA.length]!, id: `e${i}` })),
});

const rutina = (cambios: Partial<Rutina>): Rutina => ({
  id: 'r1',
  duenoId: YO,
  alumnoId: YO,
  origenId: null,
  nombre: 'Fuerza 4 días',
  descripcion: '',
  semanas: 8,
  metodo: 'doble_progresion',
  estado: 'activa',
  activadaAt: '2026-11-02T10:00:00-03:00',
  creadaAt: null,
  dias: [dia('Empuje A', 1), dia('Pierna A', 2), dia('Empuje B', 4), dia('Tirón A', 5)],
  numDias: 4,
  semanaActual: null,
  sesiones: null,
  primeraSesion: null,
  ultimaSesion: null,
  adherenciaPct: null,
  volumenKg: null,
  duenoNombre: null,
  asignados: [],
  ...cambios,
});

// ── Ejercicios ───────────────────────────────────────────────────────────────
describe('Ejercicios: buscar y filtrar', () => {
  it('APP-024 · «remo» acota la lista, Espalda la filtra y «zercher» queda sin resultados', () => {
    const q = (texto: string, grupo = 'Todos') => filtrarEjercicios(BIBLIOTECA, { q: texto, grupo, equipos: [] });
    expect(q('remo').map((x) => x.id)).toEqual(['remo', 'remo-polea']);
    expect(q('', 'Espalda')).toHaveLength(3);
    expect(q('zercher')).toEqual([]);
    expect(textoConteo(2, { q: 'remo', grupo: 'Espalda', equipos: [] })).toBe('2 resultados · Espalda');
  });

  it('APP-024 · busca sin tildes y el filtro «Mancuernas» encuentra «Mancuerna» de la biblioteca', () => {
    expect(filtrarEjercicios(BIBLIOTECA, { q: 'bulgara', grupo: 'Todos', equipos: [] })[0]?.id).toBe('bulgara');
    expect(filtrarEjercicios(BIBLIOTECA, { q: '', grupo: 'Todos', equipos: ['Mancuernas'] }).map((x) => x.id)).toEqual(['bulgara']);
    expect(textoConteo(6, { q: '', grupo: 'Todos', equipos: [] })).toBe('6 ejercicios');
  });

  it('APP-024 · sin resultados propone lo más parecido por palabras de 4 letras o más', () => {
    expect(parecidos(BIBLIOTECA, 'curl nórdico').map((x) => x.id)).toEqual(['curl']);
    expect(parecidos(BIBLIOTECA, 'zz')).toEqual([]);
  });

  it('APP-025 · solo el ejercicio propio se edita; el de la biblioteca base no', () => {
    expect(puedeEditarEjercicio({ duenoId: YO }, YO)).toBe(true);
    expect(puedeEditarEjercicio({ duenoId: null }, YO)).toBe(false);
    expect(puedeEditarEjercicio({ duenoId: CAMILA }, YO)).toBe(false);
  });

  it('APP-024 · crear un ejercicio pide nombre, grupo y equipo, y no repite uno de la biblioteca', () => {
    const vacio = erroresEjercicio({ nombre: ' ', grupo: '', equipo: '', registro: 'kg', nota: '' }, BIBLIOTECA);
    expect(vacio).toEqual({ nombre: 'Ponle un nombre.', grupo: 'Elige un grupo.', equipo: 'Elige el equipo.' });
    expect(erroresEjercicio({ nombre: 'sentadilla', grupo: 'Piernas', equipo: 'Barra', registro: 'kg', nota: '' }, BIBLIOTECA).nombre).toBe(
      '«sentadilla» ya está en la biblioteca.',
    );
    const cuerpo = cuerpoEjercicio({ nombre: 'Curl nórdico ', grupo: 'Piernas', equipo: 'Peso corporal', registro: 'reps', nota: '' });
    expect(cuerpo).toEqual({ nombre: 'Curl nórdico', grupo_muscular: 'Piernas', equipo: 'Peso corporal', patron: 'rodilla', tipo_carga: 'peso_corporal', incremento_default_kg: 0 });
  });
});

// ── Rutinas ──────────────────────────────────────────────────────────────────
describe('Rutinas: permisos y detalle', () => {
  it('APP-019 · la rutina del entrenador se ve y se duplica, sin Editar, Activar ni Archivar', () => {
    const deCamila = rutina({ duenoId: CAMILA });
    expect(accionesRutina(deCamila, YO)).toEqual(['ver', 'duplicar']);
    expect(accionesRutina(rutina({ estado: 'borrador' }), YO)).toEqual(['ver', 'activar', 'editar', 'duplicar', 'eliminar']);
    expect(accionesRutina(rutina({ estado: 'archivada' }), YO)).toEqual(['ver', 'activar', 'duplicar']);
    expect(accionesRutina(rutina({}), YO)).toEqual(['ver', 'editar', 'duplicar', 'archivar']);
  });

  it('APP-023 · «Empezar» solo si el día elegido toca hoy; la archivada no tiene Empezar', () => {
    const activa = rutina({});
    expect(accionDetalle(activa, 1, YO, 'alumno', MARTES)).toEqual({ tipo: 'empezar', dia: 1 });
    expect(accionDetalle(activa, 2, YO, 'alumno', MARTES)).toEqual({ tipo: 'cambiar', dia: 2, hoy: 1 });
    expect(accionDetalle(rutina({ estado: 'archivada' }), 1, YO, 'alumno', MARTES)).toEqual({ tipo: 'activar' });
    expect(accionDetalle(rutina({ estado: 'archivada', duenoId: CAMILA }), 1, YO, 'alumno', MARTES)).toEqual({ tipo: 'duplicar' });
    expect(accionDetalle(rutina({ estado: 'borrador' }), 0, YO, 'alumno', MARTES)).toEqual({ tipo: 'activar' });
    expect(accionDetalle(rutina({ duenoId: CAMILA, alumnoId: null, estado: 'borrador' }), 0, CAMILA, 'entrenador', MARTES)).toEqual({ tipo: 'asignar' });
  });

  it('APP-023 · la semana sale de la fecha de activación y no pasa del total', () => {
    expect(semanaActual(rutina({}), MARTES)).toBe(3);
    expect(semanaActual(rutina({ semanaActual: 5 }), MARTES)).toBe(5);
    expect(semanaActual(rutina({ activadaAt: '2026-01-01T00:00:00Z' }), MARTES)).toBe(8);
  });
});

describe('Nueva rutina', () => {
  it('APP-021 · parte vacía en doble progresión y avisa lo que falta antes de guardar', () => {
    const b = rutinaVacia();
    expect(b.metodo).toBe('doble_progresion');
    expect(erroresRutina(b).map((e) => e.texto)).toEqual(['Ponle nombre a la rutina.', 'Agrega al menos un día.']);
    expect(tituloErrores(2)).toBe('Faltan 2 cosas para guardar');
    const conDias = { ...b, nombre: 'Fuerza', dias: [dia('Empuje A', 1), { ...dia('Tirón A', null), ejercicios: [] }] };
    expect(erroresRutina(conDias)).toEqual([{ campo: 'dia', dia: 1, texto: 'Tirón A no tiene ejercicios.' }]);
  });

  it('APP-021 · un rango de 12 a 8 repeticiones se marca en el ejercicio, no al guardar', () => {
    const d = dia('Pierna A', 2, 2);
    d.ejercicios[1] = { ...d.ejercicios[1]!, repsMin: 12, repsMax: 8 };
    const errores = erroresRutina({ nombre: 'Fuerza', metodo: 'lineal', semanas: 6, dias: [d] });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatchObject({ campo: 'ejercicio', dia: 0, ejercicio: 1 });
  });

  it('APP-021 · reordenar mueve uno a la vez y no se sale de la lista', () => {
    expect(mover(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(mover(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(mover(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });

  it('APP-021 · el cuerpo de POST /routines lleva los días en orden con sus ejercicios', () => {
    const b = { nombre: ' Fuerza 4 días ', metodo: 'doble_progresion' as const, semanas: 8, dias: [dia('Empuje A', 1, 1), dia('Libre', null, 1)] };
    const c = cuerpoRutina(b, false);
    expect(c.nombre).toBe('Fuerza 4 días');
    expect(c.dias.map((d) => d.nombre)).toEqual(['Empuje A', 'Libre']);
    // CON-012: los esquemas de la API son estrictos; el orden es el de la lista, sin campo «orden» ni ids.
    expect(c.dias[0]).not.toHaveProperty('orden');
    expect(c.dias[0]).not.toHaveProperty('id');
    expect(c).not.toHaveProperty('client_id');
    expect(c.dias[0]).toMatchObject({ nombre: 'Empuje A', dia_semana: 1 });
    expect(c.dias[1]).not.toHaveProperty('dia_semana');
    expect(c.dias[0]?.ejercicios[0]).toMatchObject({ exercise_id: 'e0', series: 3, reps_min: 8, reps_max: 12, rir_objetivo: 2, descanso_s: 90 });
    expect(cuerpoRutina(b, true, 'cli-1')).toMatchObject({ client_id: 'cli-1' });
  });

  it('APP-021 · PUT /days conserva los ids que ya estaban y manda sin id el día duplicado', () => {
    const a = { ...dia('Empuje A', 1, 1), id: 'd1' };
    a.ejercicios[0] = { ...a.ejercicios[0]!, id: 're1' };
    const copia = { ...a, ejercicios: a.ejercicios.map((e) => ({ ...e })) };
    const c = cuerpoDias([a, copia], false, true);
    expect(c[0]).toMatchObject({ id: 'd1' });
    expect(c[0]?.ejercicios[0]).toMatchObject({ id: 're1' });
    expect(c[1]).not.toHaveProperty('id');
    expect(c[1]?.ejercicios[0]).not.toHaveProperty('id');
  });

  it('APP-022 · el 422 REPS_RANGE_INVALID de la API (dia y posicion) marca el ejercicio', () => {
    const b = { nombre: 'Fuerza', metodo: 'lineal' as const, semanas: 6, dias: [dia('Empuje A', 1, 2)] };
    const e = erroresDeApi({ campo: 'dias.0.ejercicios.1.reps_min', dia: 0, posicion: 1, exercise_id: 'e1' }, b, 'El mínimo de repeticiones no puede pasar al máximo.');
    expect(e).toEqual([
      { campo: 'ejercicio', dia: 0, ejercicio: 1, texto: 'Remo en polea baja en Empuje A: El mínimo de repeticiones no puede pasar al máximo.' },
    ]);
  });

  it('APP-022 · un 422 con details de un ejercicio marca ese ejercicio y no pierde nada', () => {
    const b = { nombre: 'Fuerza', metodo: 'lineal' as const, semanas: 6, dias: [dia('Empuje A', 1, 2)] };
    const e = erroresDeApi([{ campo: 'dias.0.ejercicios.1.reps_min', motivo: 'El mínimo de repeticiones no puede pasar al máximo.' }], b, 'Revisa los datos enviados.');
    expect(e).toEqual([
      { campo: 'ejercicio', dia: 0, ejercicio: 1, texto: 'Remo en polea baja en Empuje A: El mínimo de repeticiones no puede pasar al máximo.' },
    ]);
    expect(erroresDeApi(undefined, b, 'La rutina no tiene días con ejercicios.')).toEqual([{ campo: 'dias', texto: 'La rutina no tiene días con ejercicios.' }]);
    expect(b.dias[0]?.ejercicios).toHaveLength(2);
  });
});

// ── Progreso ─────────────────────────────────────────────────────────────────
const medida = (fecha: string, pesoKg: number | null, cinturaCm: number | null = null): Medida => ({
  id: null,
  fecha,
  pesoKg,
  cinturaCm,
  caderaCm: null,
  pechoCm: null,
  brazoCm: null,
  musloCm: null,
  grasaPct: null,
});

describe('Progreso: peso y medidas', () => {
  it('APP-033 · con 2 registros no hay tendencia y dice «Vas bien: falta uno.»; al tercero aparece', () => {
    const dos = pesosDe([medida('2026-11-03', 62.7), medida('2026-11-10', 62.4)]);
    expect(hayTendencia(dos.length)).toBe(false);
    expect(tendenciaSemanal(dos)).toBeNull();
    expect(textoSinTendenciaPeso(2)).toBe('Vas bien: falta uno.');
    expect(textoSinTendenciaPeso(1)).toBe('Tu primer peso viene de la encuesta.');
    const tres = pesosDe([medida('2026-10-27', 62.9), medida('2026-11-03', 62.7), medida('2026-11-10', 62.4)]);
    expect(tendenciaSemanal(tres)).toBeCloseTo(-0.25, 2);
    expect(firmado(tendenciaSemanal(tres) ?? 0)).toBe('−0,3');
  });

  it('APP-033 · el cambio en 30 días compara con el registro más cercano a esa fecha', () => {
    const ps = pesosDe([medida('2026-10-13', 63.1), medida('2026-10-20', 63.3), medida('2026-11-10', 62.4)]);
    // 30 días antes del 17 nov es el 18 oct: el más cercano es el del 20 oct (63,3).
    expect(cambio30Dias(ps, MARTES)).toBeCloseTo(-0.9, 5);
    expect(firmado(0)).toBe('±0,0');
    expect(firmado(1.25)).toBe('+1,3');
  });

  it('APP-051 · lo que no se midió no va (nunca 0), y la grasa vacía tampoco', () => {
    const c = cuerpoMedidas('2026-11-17', { cinturaCm: 71.5, caderaCm: null, brazoCm: 0 });
    expect(c).toEqual({ fecha: '2026-11-17', cintura_cm: 71.5 });
  });
});

// ── Perfil ───────────────────────────────────────────────────────────────────
describe('Perfil', () => {
  it('APP-038 · el descanso va de 30 s a 5 min y avisa en los límites', () => {
    expect(pasoDescanso(90, 15)).toEqual({ valor: 105, aviso: null });
    expect(pasoDescanso(30, -15)).toEqual({ valor: 30, aviso: 'El mínimo es 30 segundos.' });
    expect(pasoDescanso(300, 15)).toEqual({ valor: 300, aviso: 'El máximo es 5 minutos.' });
    expect(pasoDescanso(40, -15)).toEqual({ valor: 30, aviso: null });
  });

  it('APP-035 · el código se escribe en mayúsculas, sin espacios ni símbolos y con 6 como mucho', () => {
    expect(limpiarCodigo('k7p 2-qx9')).toBe('K7P2QX');
    expect(limpiarCodigo('ab')).toBe('AB');
  });

  it('APP-035 · borrar la cuenta hoy la purga en 30 días', () => {
    expect(fechaBorrado(MARTES)).toBe('17 de diciembre');
    expect(fechaBorrado(new Date(2026, 11, 20, 9))).toBe('19 de enero');
  });

  it('APP-039 · el código del entrenador vence a los 7 días', () => {
    expect(codigoVencido('2026-11-24T10:00:00-03:00', MARTES)).toBe(false);
    expect(codigoVencido('2026-11-15T10:00:00-03:00', MARTES)).toBe(true);
    expect(codigoVencido(null, MARTES)).toBe(false);
  });
});

// ── Motivos ──────────────────────────────────────────────────────────────────
describe('Motivos de la baja', () => {
  it('APP-044 · muestra hasta 3 consejos por motivo, los de la API si llegaron', () => {
    const api = { sueno: ['a', 'b', 'c', 'd'], estres: [] };
    const g = consejosPara(['sueno', 'estres'], api, null);
    expect(g[0]?.consejos).toEqual(['a', 'b', 'c']);
    expect(g[1]?.consejos).toHaveLength(3);
    expect(g[1]?.consejos[0]).toMatch(/^Entrenar igual ayuda/);
  });

  it('APP-044 · sin señal usa los sembrados y la versión con entrenador lo nombra (P-05)', () => {
    const g = consejosPara(['lesion', 'otro'], null, 'Camila');
    expect(g[0]?.consejos[1]).toBe('Anótala como dolor en el ejercicio, en el registro. Camila la ve en tu ficha.');
    expect(g[1]).toEqual({ motivo: 'otro', consejos: [] });
    expect(textoEnviar(0, false)).toBe('Enviar');
    expect(textoEnviar(2, false)).toBe('Enviar (2)');
    expect(textoEnviar(2, true)).toBe('Enviando…');
  });
});
