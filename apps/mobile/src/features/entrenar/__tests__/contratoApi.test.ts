// ─────────────────────────────────────────────────────────────────────────────
// Pruebas del contrato de Entrenar contra la API · Zona: Entrenar
//
// Qué hace: arma Hoy con la forma exacta de esquemaHoyApi (packages/shared/src/api/sesiones.ts),
// crea una sesión con ids UUID v7 y comprueba que cada cuerpo que manda la app pasa el esquema
// estricto de la API tal cual (un campo de más da 400 en la API, CON-012).
// Tócalo cuando: cambie un esquema de RUTAS_SESIONES o un cuerpo de ../contrato.ts.
// Depende de: vitest, @gymtrack/shared y ../contrato, ../sesionLocal, ../uuid7.
// ─────────────────────────────────────────────────────────────────────────────
import {
  esquemaFinSesion,
  esquemaHoyApi,
  esquemaObservacionNueva,
  esquemaSeriesLote,
  esquemaSesionNueva,
} from '@gymtrack/shared';
import { describe, expect, it } from 'vitest';
import { cuerpoCerrar, cuerpoCrear, cuerpoObservacion, cuerpoSeries, normalizarHoy } from '../contrato';
import { crearSesion, marcar } from '../sesionLocal';
import { crearGeneradorUuidV7 } from '../uuid7';

const AHORA = Date.parse('2026-11-17T22:00:00.000Z');
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** Lo que responde GET /v1/me/today para Martina (forma de esquemaHoyApi). */
const HOY_API = {
  fecha: '2026-11-17',
  estado: 'normal',
  racha_dias: 4,
  rutina: { id: U(1), nombre: 'Fuerza', semana: 3, semanas: 8, metodo_progresion: 'doble_progresion', version: 2 },
  dia: {
    id: U(2), nombre: 'Pierna A', dia_semana: 2, series_total: 6, minutos_estimados: 50,
    ejercicios: [
      {
        routine_exercise_id: U(3), exercise_id: U(4), nombre: 'Sentadilla', grupo_muscular: 'piernas', tipo_carga: 'kg',
        series: 3, reps_min: 6, reps_max: 8, rir_objetivo: 2, descanso_s: 120, incremento_kg: 2.5, peso_inicial_kg: null,
        nota_entrenador: null, ultimo_peso_kg: 80,
        sugerencia: { id: U(5), estado: 'pendiente', peso_kg: 82.5, reps_min: 6, reps_max: 8, rir: 2, texto: 'Sube 2,5 kg', nota: null },
      },
      {
        routine_exercise_id: U(6), exercise_id: U(7), nombre: 'Prensa', grupo_muscular: 'piernas', tipo_carga: 'kg',
        series: 3, reps_min: 10, reps_max: 12, rir_objetivo: 2, descanso_s: 90, incremento_kg: 5, peso_inicial_kg: 100,
        nota_entrenador: 'Pies altos', ultimo_peso_kg: null, sugerencia: null,
      },
    ],
  },
  sesion_en_curso: null,
  semana: [
    { fecha: '2026-11-16', dia_semana: 1, estado: 'hecho', es_hoy: false },
    { fecha: '2026-11-17', dia_semana: 2, estado: 'toca', es_hoy: true },
    { fecha: '2026-11-18', dia_semana: 3, estado: 'descanso', es_hoy: false },
    { fecha: '2026-11-19', dia_semana: 4, estado: 'plan', es_hoy: false },
    { fecha: '2026-11-20', dia_semana: 5, estado: 'descanso', es_hoy: false },
    { fecha: '2026-11-21', dia_semana: 6, estado: 'plan', es_hoy: false },
    { fecha: '2026-11-22', dia_semana: 7, estado: 'descanso', es_hoy: false },
  ],
  semana_hechas: 1,
  semana_planificadas: 4,
  mes: { sesiones: 9, volumen_kg: 41250, prs: 3 },
  entrenador: { id: U(8), nombre: 'Camila', apellido: 'Rojas' },
  ultima_accion_entrenador: { tipo: 'consejo', texto: 'Baja el ritmo en la excéntrica', created_at: '2026-11-16T20:00:00.000Z', total: 2 },
} as const;

describe('Contrato con la API de sesiones', () => {
  it('CON-006: la app lee el Hoy real de la API: semana, día de hoy, semana de la rutina y sugerencia', () => {
    expect(esquemaHoyApi.safeParse(HOY_API).success).toBe(true);
    const hoy = normalizarHoy(HOY_API);
    expect(hoy.semana).toEqual({ actual: 3, total: 8 });
    expect(hoy.semana_dias).toEqual(['hecho', 'toca', 'descanso', 'plan', 'descanso', 'plan', 'descanso']);
    expect(hoy.semana_hoy).toBe(1);
    expect(hoy.semana_cuenta).toEqual({ hechas: 1, plan: 4 });
    expect(hoy.dia?.routine_day_id).toBe(U(2));
    expect(hoy.dia?.ejercicios[0]).toMatchObject({ peso_kg: 82.5, sube_kg: 2.5, grupo: 'piernas' });
    expect(hoy.dia?.ejercicios[1]).toMatchObject({ peso_kg: 100, sube_kg: 0, nota: 'Pies altos' });
    expect(hoy.entrenador).toEqual({ nombre: 'Camila', apellido: 'Rojas' });
  });

  it('CON-012: crear, series, cerrar y observación pasan los esquemas estrictos de RUTAS_SESIONES', () => {
    let semilla = 3;
    const azar = (n: number) => Uint8Array.from({ length: n }, () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) & 0xff);
    const nuevoId = crearGeneradorUuidV7({ ahora: () => AHORA, aleatorio: azar });
    const hoy = normalizarHoy(HOY_API);
    let s = crearSesion(hoy, hoy.dia!, { id: nuevoId(), nuevoId, ahoraMs: AHORA, deviceId: 'tel-a' });
    s = marcar(s, false, AHORA + 60_000).sesion;
    s = marcar(s, true, AHORA + 240_000).sesion;

    const crear = cuerpoCrear(s);
    expect(crear.routine_version).toBe(2);
    expect(esquemaSesionNueva.safeParse(crear).success).toBe(true);

    const series = esquemaSeriesLote.safeParse(cuerpoSeries(s));
    expect(series.error?.issues ?? []).toEqual([]);

    expect(esquemaFinSesion.safeParse(cuerpoCerrar('2026-11-17T19:40:00-03:00', 2400)).success).toBe(true);

    const dolor = cuerpoObservacion({ tipo: 'dolor', texto: '', zona: 'rodilla', intensidad: 7, sessionId: s.id });
    expect(esquemaObservacionNueva.safeParse(dolor).success).toBe(true);
  });
});
