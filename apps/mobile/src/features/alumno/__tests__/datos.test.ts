// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de la lectura de la API del alumno · Zona: Alumno
//
// Qué hace: prueba que ../datos entienda las respuestas de §API como las describe el PRD (listas
// paginadas, rutinas con días y ejercicios, ejercicios con su récord, progreso, medidas, alertas
// y consejos), y que tolere campos que faltan sin romper la pantalla. Cada prueba lleva el id de
// su escenario de docs/pruebas/plan-de-validacion.md.
// Tócalo cuando: cambie un nombre de campo de la API o un lector de ../datos.
// Depende de: vitest y ../datos.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { aAlerta, aConsejos, aEjercicio, aHistorial, aInvitacion, aMedidas, aRecords, aRutina, aSemanas, lista, siguienteCursor } from '../datos';

describe('Listas de la API', () => {
  it('CON-008 · lee `{ items, next_cursor }` y también una lista suelta', () => {
    expect(lista({ items: [1, 2], next_cursor: 'abc' })).toEqual([1, 2]);
    expect(siguienteCursor({ items: [], next_cursor: 'abc' })).toBe('abc');
    expect(siguienteCursor({ items: [], next_cursor: null })).toBeNull();
    expect(lista([3])).toEqual([3]);
    expect(lista(null)).toEqual([]);
  });
});

describe('Rutinas', () => {
  it('APP-023 · arma la rutina con sus días y ejercicios en orden, con el nombre del ejercicio anidado', () => {
    const r = aRutina({
      id: 'r1',
      owner_id: 'camila',
      client_id: 'martina',
      nombre: 'Fuerza 4 días',
      semanas: 8,
      metodo_progresion: 'lineal',
      estado: 'activa',
      activada_at: '2026-11-02T10:00:00-03:00',
      owner: { nombre: 'Camila', apellido: 'Rojas' },
      dias: [
        { id: 'd2', orden: 2, nombre: 'Pierna A', dia_semana: 2, ejercicios: [] },
        {
          id: 'd1',
          orden: 1,
          nombre: 'Empuje A',
          dia_semana: 1,
          ejercicios: [
            { id: 're2', orden: 2, exercise_id: 'x2', series: 3, reps_min: 8, reps_max: 10, exercise: { nombre: 'Press militar con barra' } },
            { id: 're1', orden: 1, exercise_id: 'x1', series: 4, reps_min: 6, reps_max: 8, rir_objetivo: 2, descanso_s: 180, peso_inicial_kg: 47.5, exercise: { nombre: 'Press de banca', grupo_muscular: 'Pecho' } },
          ],
        },
      ],
    });
    expect(r.dias.map((d) => d.nombre)).toEqual(['Empuje A', 'Pierna A']);
    expect(r.dias[0]?.ejercicios.map((e) => e.nombre)).toEqual(['Press de banca', 'Press militar con barra']);
    expect(r.dias[0]?.ejercicios[0]).toMatchObject({ series: 4, repsMin: 6, repsMax: 8, descansoS: 180, pesoInicialKg: 47.5, grupo: 'Pecho' });
    expect(r).toMatchObject({ metodo: 'lineal', estado: 'activa', numDias: 2, duenoNombre: 'Camila Rojas' });
  });

  it('APP-019 · una rutina de la lista sin días igual dice cuántos tiene', () => {
    const r = aRutina({ id: 'r2', nombre: 'Básica 3 días', estado: 'archivada', num_dias: 3, sesiones: 14 });
    expect(r).toMatchObject({ numDias: 3, sesiones: 14, estado: 'archivada', metodo: 'doble_progresion' });
  });
});

describe('Ejercicios', () => {
  it('APP-024 · el récord se escribe según cómo se registra el ejercicio', () => {
    expect(aEjercicio({ id: 'a', nombre: 'Press de banca', tipo_carga: 'kg', pr: { peso_kg: 47.5, reps: 8 } }).record).toBe('47,5 kg');
    expect(aEjercicio({ id: 'b', nombre: 'Puente', tipo_carga: 'peso_corporal', pr: { reps: 20 } }).record).toBe('20 reps');
    expect(aEjercicio({ id: 'c', nombre: 'Plancha', tipo_carga: 'tiempo', pr: { tiempo_s: 70 } }).record).toBe('1:10');
    expect(aEjercicio({ id: 'd', nombre: 'Sentadilla' }).record).toBeNull();
  });

  it('APP-025 · las instrucciones en texto se separan en pasos y el dueño queda marcado', () => {
    const e = aEjercicio({ id: 'p', owner_id: 'martina', nombre: 'Puente', instrucciones: '1. Acuéstate de espalda.\n2. Sube la cadera.' });
    expect(e.instrucciones).toEqual(['Acuéstate de espalda.', 'Sube la cadera.']);
    expect(e.duenoId).toBe('martina');
  });

  it('APP-025 · el historial queda de la sesión más nueva a la más vieja, con la mejor serie', () => {
    const h = aHistorial({
      puntos: [
        { fecha: '2026-11-03', e1rm: 98.2, mejor_set: { peso_kg: 77.5, reps: 8 } },
        { fecha: '2026-11-10', e1rm: 101.3, mejor_set: { peso_kg: 80, reps: 8 }, series: [{ peso_kg: 80, reps: 8 }, { peso_kg: 80, reps: 7 }] },
      ],
    });
    expect(h.map((p) => p.fecha)).toEqual(['2026-11-10', '2026-11-03']);
    expect(h[0]).toMatchObject({ pesoKg: 80, reps: 8, e1rm: 101.3 });
    expect(h[0]?.series).toHaveLength(2);
  });
});

describe('Progreso', () => {
  it('APP-033 · las medidas quedan por fecha y lo que falta queda null', () => {
    const m = aMedidas({ items: [{ fecha: '2026-11-10', peso_kg: 62.4 }, { fecha: '2026-11-03T00:00:00Z', peso_kg: 62.7, cintura_cm: 71.5 }] });
    expect(m.map((x) => x.fecha)).toEqual(['2026-11-03', '2026-11-10']);
    expect(m[1]).toMatchObject({ pesoKg: 62.4, cinturaCm: null, grasaPct: null });
  });

  it('APP-031 · récords y volumen por semana, con la diferencia frente al anterior', () => {
    const r = aRecords({ items: [{ exercise_id: 'x', nombre: 'Sentadilla', tipo: 'e1rm', valor: 63.3, anterior: 60, fecha: '2026-11-10' }] });
    expect(r[0]?.diferencia).toBeCloseTo(3.3, 5);
    const s = aSemanas({ semanas: [{ semana_inicio: '2026-11-16', volumen_kg: 2600, sesiones: 1 }, { semana_inicio: '2026-11-09', volumen_kg: 20100, sesiones: 4 }] });
    expect(s.map((x) => x.desde)).toEqual(['2026-11-09', '2026-11-16']);
  });
});

describe('Alertas, consejos e invitaciones', () => {
  it('APP-044 · los consejos llegan agrupados por motivo, como objeto o como lista', () => {
    expect(aConsejos({ consejos: { sueno: ['a', 'b'] } })).toEqual({ sueno: ['a', 'b'] });
    expect(aConsejos({ consejos: [{ motivo: 'estres', texto: 'x' }, { motivo: 'estres', texto: 'y' }] })).toEqual({ estres: ['x', 'y'] });
  });

  it('APP-044 · la alerta trae su tipo y el nombre del ejercicio si lo hay', () => {
    const a = aAlerta({ id: 'a1', tipo: 'estancamiento', detalle: { ejercicio_nombre: 'Press inclinado con mancuernas', peso_kg: 22 } });
    expect(a).toMatchObject({ tipo: 'estancamiento', ejercicioNombre: 'Press inclinado con mancuernas' });
  });

  it('APP-039 · la invitación trae el código y su vencimiento', () => {
    expect(aInvitacion({ codigo: 'K7P2QX', codigo_vence_at: '2026-11-24T10:00:00-03:00' })).toEqual({ codigo: 'K7P2QX', venceAt: '2026-11-24T10:00:00-03:00' });
    expect(aInvitacion({})).toBeNull();
  });
});
