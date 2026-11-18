// Sugerencias de carga: generar al cerrar, ajustar cargas y usar al iniciar (plan-de-validacion.md:
// INT-126 a INT-131, INT-155; PERM-19 a 21, PERM-42; P-19, P-38).
// La escena: Camila entrenadora, Martina vinculada a Camila, Diego solo y Rodrigo sin clientes.
// Martina y Diego tienen «Fuerza 4 días» activa con Press de banca de 8 a 10 en Empuje A.
import { expect, it } from 'vitest';
import { aplicarSugerencias, generarSugerenciasDeCierre } from '../../src/modulos/progreso/sugerencias';
import { AHORA, describeConBase, idEjercicioBase, usarEntornoApi, type PersonaDePrueba } from '../ayudas';
import { crearRutina, crearSesion, haceDias, series } from './datos';

const BANCA = idEjercicioBase('press-de-banca');

describeConBase('Sugerencias de carga', () => {
  const e = usarEntornoApi();

  /** Rutina activa del alumno y una sesión cerrada de Empuje A con 3 × 10 a 45 kg: el motor sube a 47,5. */
  async function conSugerencia(alumno: PersonaDePrueba, duenoId = alumno.id, pesoKg = 45, reps = 10) {
    const rutina = await crearRutina(e.prisma, {
      duenoId, alumnoId: alumno.id,
      dias: [{ nombre: 'Empuje A', ejercicios: [{ slug: 'press-de-banca', series: 3, repsMin: 8, repsMax: 10 }] }],
    });
    const dia = rutina.dias[0]!;
    const re = dia.ejercicios[0]!;
    const sesionId = await crearSesion(e.prisma, {
      alumnoId: alumno.id, cerradaAt: haceDias(AHORA, 2), rutinaId: rutina.id, diaRutinaId: dia.id,
      series: series(3, { ejercicioId: BANCA, ejercicioRutinaId: re.id, pesoKg, reps, rir: 2 }),
    });
    const sugerencias = await generarSugerenciasDeCierre(e.prisma, sesionId);
    return { rutina, dia, re, sesionId, sugerencias };
  }

  const listar = (quien: PersonaDePrueba, alumnoId: string) => e.pedirComo(quien, { method: 'GET', url: `/v1/clients/${alumnoId}/suggestions` });
  const cambiar = (quien: PersonaDePrueba, id: string, payload: Record<string, unknown>) =>
    e.pedirComo(quien, { method: 'PATCH', url: `/v1/suggestions/${id}`, payload });

  it('P-38 al cerrar la primera sesión hay sugerencia por ejercicio, con el motor del paquete compartido', async () => {
    const { martina } = await e.escena();
    const { sugerencias, re } = await conSugerencia(martina, martina.id);
    expect(sugerencias).toHaveLength(1);
    expect(sugerencias[0]).toMatchObject({ routine_exercise_id: re.id, metodo: 'doble_progresion', sugerencia: { peso_kg: 47.5, reps_min: 8, reps_max: 10, rir: 2 } });
    expect(sugerencias[0]!.texto).toContain('47,5 kg');
    // Llamarla otra vez no duplica.
    await generarSugerenciasDeCierre(e.prisma, (await e.prisma.sugerenciaProgresion.findFirstOrThrow()).sesionId);
    expect(await e.prisma.sugerenciaProgresion.count()).toBe(1);
  });

  it('INT-126 Camila ve las de Martina y Diego las suyas; Martina recibe 403 y Rodrigo 404', async () => {
    const { camila, martina, diego } = await e.escena();
    const rodrigo = await e.crear('rodrigo');
    await conSugerencia(martina, camila.id);
    await conSugerencia(diego);
    const deCamila = await listar(camila, martina.id);
    expect(deCamila.status).toBe(200);
    expect(deCamila.json.items).toHaveLength(1);
    expect(deCamila.json.items[0]).toMatchObject({
      nombre: 'Press de banca', estado: 'pendiente', dia: { nombre: 'Empuje A' },
      vigente: { peso_kg: 47.5, reps_min: 8, reps_max: 10, nota: null },
    });
    expect(deCamila.json.items[0].ultimo_rendimiento.series).toHaveLength(3);
    expect((await listar(diego, diego.id)).status).toBe(200);
    const deMartina = await listar(martina, martina.id);
    expect(deMartina.status).toBe(403);
    expect((await listar(rodrigo, martina.id)).status).toBe(404);
    expect((await listar(diego, martina.id)).status).toBe(404);
  });

  it('INT-127 Camila sobrescribe a 42,5 kg con nota: queda sobrescrita, con quién y cuándo', async () => {
    const { camila, martina } = await e.escena();
    const { sugerencias } = await conSugerencia(martina, camila.id);
    const r = await cambiar(camila, sugerencias[0]!.id, { peso_kg: 42.5, nota: 'Cuida el hombro' });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({
      estado: 'sobrescrita',
      valor_final: { peso_kg: 42.5, reps_min: 8, reps_max: 10, nota: 'Cuida el hombro' },
      vigente: { peso_kg: 42.5, nota: 'Cuida el hombro' },
      sugerencia: { peso_kg: 47.5 },
      sobrescrita_por: { id: camila.id, nombre: 'Camila' },
      sobrescrita_at: AHORA,
    });
  });

  it('INT-128 Martina, vinculada, no puede cambiar su sugerencia (403) y no cambia nada', async () => {
    const { camila, martina } = await e.escena();
    const { sugerencias } = await conSugerencia(martina, camila.id);
    const r = await cambiar(martina, sugerencias[0]!.id, { peso_kg: 50 });
    expect(r.status).toBe(403);
    const fila = await e.prisma.sugerenciaProgresion.findUniqueOrThrow({ where: { id: sugerencias[0]!.id } });
    expect(fila).toMatchObject({ estado: 'pendiente', valorFinal: null, sobrescritaPorId: null });
  });

  it('INT-129 Diego, alumno solo, cambia su sugerencia y queda a su nombre', async () => {
    const { diego } = await e.escena();
    const { sugerencias } = await conSugerencia(diego);
    const r = await cambiar(diego, sugerencias[0]!.id, { reps_min: 6, reps_max: 8 });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ estado: 'sobrescrita', sobrescrita_por: { id: diego.id }, valor_final: { peso_kg: 47.5, reps_min: 6, reps_max: 8 } });
  });

  it('INT-130 una sugerencia usada da 409 SUGGESTION_USED; un rango de 12 a 8 da 422', async () => {
    const { camila, martina } = await e.escena();
    const { sugerencias } = await conSugerencia(martina, camila.id);
    const rango = await cambiar(camila, sugerencias[0]!.id, { reps_min: 12, reps_max: 8 });
    expect(rango.status).toBe(422);
    expect(rango.json.error.code).toBe('REPS_RANGE_INVALID');
    await e.prisma.sugerenciaProgresion.update({ where: { id: sugerencias[0]!.id }, data: { estado: 'aplicada', aplicadaAt: new Date(AHORA) } });
    const usada = await cambiar(camila, sugerencias[0]!.id, { peso_kg: 40 });
    expect(usada.status).toBe(409);
    expect(usada.json.error.code).toBe('SUGGESTION_USED');
  });

  it('INT-131 volver a la calculada deja la sugerencia pendiente y registra quién y cuándo', async () => {
    const { camila, martina } = await e.escena();
    const { sugerencias } = await conSugerencia(martina, camila.id);
    await cambiar(camila, sugerencias[0]!.id, { peso_kg: 42.5 });
    e.reloj.avanzar('1h');
    const r = await cambiar(camila, sugerencias[0]!.id, { restaurar: true });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ estado: 'pendiente', valor_final: null, vigente: { peso_kg: 47.5 }, sobrescrita_por: { id: camila.id } });
    expect(r.json.sobrescrita_at).toBe(new Date(new Date(AHORA).getTime() + 3_600_000).toISOString());
  });

  it('INT-155 al iniciar la sesión que la precarga pasa a aplicada y el PATCH de Camila da 409 (P-19)', async () => {
    const { camila, martina } = await e.escena();
    const { dia, re, sugerencias } = await conSugerencia(martina, camila.id);
    await cambiar(camila, sugerencias[0]!.id, { peso_kg: 42.5, nota: 'Cuida el hombro' });
    const precarga = await aplicarSugerencias(e.prisma, martina.id, dia.id, new Date(AHORA));
    expect(precarga.get(re.id)).toMatchObject({ peso_kg: 42.5, nota: 'Cuida el hombro' });
    const fila = await e.prisma.sugerenciaProgresion.findUniqueOrThrow({ where: { id: sugerencias[0]!.id } });
    expect(fila.estado).toBe('aplicada');
    const r = await cambiar(camila, sugerencias[0]!.id, { peso_kg: 40 });
    expect(r.status).toBe(409);
    expect((await listar(camila, martina.id)).json.items).toHaveLength(0);
  });

  it('INT-126 sin rutina activa la lista viene vacía', async () => {
    const { diego } = await e.escena();
    const r = await listar(diego, diego.id);
    expect(r.status).toBe(200);
    expect(r.json.items).toEqual([]);
  });

});
