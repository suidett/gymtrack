// Worker con reloj controlado: detección de la noche y purga de cuentas a 30 días
// (plan-de-validacion.md, «WRK»: WRK-001 a WRK-005, WRK-008 a WRK-011, WRK-013, WRK-017; P-23,
// P-24). Las tareas reciben el «ahora» por parámetro.
// La escena: Camila entrenadora, Martina vinculada a Camila, Diego solo.
import { expect, it } from 'vitest';
import { detectarNoche, detectarTrasCierre } from '../../src/modulos/alertas/deteccion';
import { leerUmbrales, UMBRALES_POR_DEFECTO } from '../../src/modulos/alertas/umbrales';
import { almacenamiento, type AdaptadorAlmacenamiento } from '../../src/modulos/progreso/almacenamiento';
import { correrTarea } from '../../src/worker/tareas';
import { AHORA, describeConBase, idEjercicioBase, usarEntornoApi, type PersonaDePrueba } from '../ayudas';
import { crearRutina, crearSesion, DIA_MS, haceDias, series } from '../progreso/datos';

const BANCA = idEjercicioBase('press-de-banca');
const RUMANO = idEjercicioBase('peso-muerto-rumano');
const u = UMBRALES_POR_DEFECTO;

describeConBase('Worker', () => {
  const e = usarEntornoApi();

  /** 80 kg de mejor 1RM del rumano y después 78, 80 y 76,7 (WRK-001). La última cerró hace un día. */
  async function rumanoSinSuperar(alumno: PersonaDePrueba) {
    let ultima = '';
    for (const [i, pesoKg] of [60, 58.5, 60, 57.5].entries()) {
      ultima = await crearSesion(e.prisma, { alumnoId: alumno.id, cerradaAt: haceDias(AHORA, 10 - i * 3), series: series(3, { ejercicioId: RUMANO, pesoKg, reps: 10 }) });
    }
    return ultima;
  }

  /** Una rutina activa sin día fijo y, si se da, la última sesión cerrada en `cuando`. */
  async function conRutinaYUltima(alumno: PersonaDePrueba, cuando: string | null, duenoId = alumno.id) {
    const r = await crearRutina(e.prisma, {
      duenoId, alumnoId: alumno.id, activadaAt: new Date('2026-09-01T12:00:00Z'),
      dias: [{ nombre: 'Cuerpo completo', ejercicios: [{ slug: 'press-de-banca' }] }],
    });
    if (cuando) {
      await crearSesion(e.prisma, { alumnoId: alumno.id, cerradaAt: cuando, rutinaId: r.id, diaRutinaId: r.dias[0]!.id, series: [{ ejercicioId: BANCA, pesoKg: 40, reps: 8 }] });
    }
    return r;
  }

  // ── Detección ───────────────────────────────────────────────────────────────
  it('WRK-001 la corrida de la noche crea el estancamiento del rumano y la segunda no crea nada', async () => {
    const { martina } = await e.escena();
    await rumanoSinSuperar(martina);
    const primera = await detectarNoche(e.prisma, new Date(AHORA), u, 24 * 10);
    expect(primera.por_tipo).toEqual({ estancamiento: 1 });
    const segunda = await detectarNoche(e.prisma, new Date(AHORA), u, 24 * 10);
    expect(segunda.alertas_creadas).toBe(0);
    expect(await e.prisma.alerta.count({ where: { tipo: 'estancamiento', ejercicioId: RUMANO } })).toBe(1);
  });

  it('WRK-013 lo que creó el cierre la noche no lo duplica, aunque la entrenadora ya lo haya resuelto', async () => {
    const { martina } = await e.escena();
    const ultima = await rumanoSinSuperar(martina);
    const alCerrar = await detectarTrasCierre(e.prisma, ultima, u, new Date(AHORA));
    expect(alCerrar).toHaveLength(1);
    await e.prisma.alerta.update({ where: { id: alCerrar[0]!.id }, data: { estado: 'resuelta', resueltaAt: new Date(AHORA) } });
    expect((await detectarNoche(e.prisma, new Date(AHORA), u, 24 * 10)).alertas_creadas).toBe(0);
  });

  it('WRK-002 una sesión que llegó sin detección: la noche crea la baja y la deja pidiendo motivos', async () => {
    const { martina, camila } = await e.escena();
    const r = await crearRutina(e.prisma, { duenoId: camila.id, alumnoId: martina.id, dias: [{ nombre: 'Empuje A', ejercicios: [{ slug: 'press-de-banca' }] }] });
    const d = r.dias[0]!;
    for (const [i, dias] of [27, 20, 13, 6].entries()) {
      await crearSesion(e.prisma, {
        alumnoId: martina.id, cerradaAt: haceDias(AHORA, dias), rutinaId: r.id, diaRutinaId: d.id, volumenKg: 4200,
        series: series(3, { ejercicioId: BANCA, pesoKg: 40 + i, reps: 8 }),
      });
    }
    await crearSesion(e.prisma, {
      alumnoId: martina.id, cerradaAt: haceDias(AHORA, 0.5), rutinaId: r.id, diaRutinaId: d.id, volumenKg: 3570,
      series: series(3, { ejercicioId: BANCA, pesoKg: 45, reps: 8 }),
    });
    const noche = await detectarNoche(e.prisma, new Date(AHORA), u);
    expect(noche.por_tipo).toEqual({ baja_rendimiento: 1 });
    const mias = await e.pedirComo(martina, { method: 'GET', url: '/v1/me/alerts' });
    expect(mias.json.items).toEqual([expect.objectContaining({ tipo: 'baja_rendimiento', pide_motivos: true })]);
  });

  it('WRK-003 última sesión el martes 10 a las 19:00 de Santiago: a las 18:59 del 17 nada, a las 19:00 «sin sesiones»', async () => {
    const { martina } = await e.escena();
    await conRutinaYUltima(martina, '2026-11-10T22:00:00Z');
    expect((await detectarNoche(e.prisma, new Date('2026-11-17T21:59:00Z'), u)).alertas_creadas).toBe(0);
    expect((await detectarNoche(e.prisma, new Date('2026-11-17T22:00:00Z'), u)).por_tipo).toEqual({ sin_sesiones: 1 });
  });

  it('WRK-004 sin rutina no hay alerta; una abierta no se repite; con la anterior resuelta y 7 días más, sí', async () => {
    const { camila, martina, diego } = await e.escena();
    const gonzalo = await e.crear('gonzalo');
    // Gonzalo (Sebastián en los datos de prueba): sin rutina activa y sin sesiones hace 20 días.
    await crearSesion(e.prisma, { alumnoId: gonzalo.id, cerradaAt: haceDias(AHORA, 20), series: [{ ejercicioId: BANCA, pesoKg: 40, reps: 8 }] });
    // Martina (Antonia): ya tiene una «sin sesiones» abierta.
    await conRutinaYUltima(martina, haceDias(AHORA, 9).toISOString(), camila.id);
    await e.prisma.alerta.create({ data: { alumnoId: martina.id, entrenadorId: camila.id, tipo: 'sin_sesiones' } });
    // Diego (Florencia): la anterior se resolvió hace 7 días y sigue sin entrenar.
    await conRutinaYUltima(diego, haceDias(AHORA, 20).toISOString());
    await e.prisma.alerta.create({ data: { alumnoId: diego.id, tipo: 'sin_sesiones', estado: 'resuelta', resueltaAt: haceDias(AHORA, 7) } });
    const r = await detectarNoche(e.prisma, new Date(AHORA), u);
    expect(r.por_tipo).toEqual({ sin_sesiones: 1 });
    expect(await e.prisma.alerta.count({ where: { alumnoId: gonzalo.id } })).toBe(0);
    expect(await e.prisma.alerta.count({ where: { alumnoId: martina.id } })).toBe(1);
    expect(await e.prisma.alerta.count({ where: { alumnoId: diego.id, estado: 'nueva' } })).toBe(1);
  });

  it('WRK-005 con UMBRAL_SIN_SESIONES_DIAS=10 y UMBRAL_ESTANCAMIENTO_SESIONES=4 no crea ninguna', async () => {
    const { martina } = await e.escena();
    await rumanoSinSuperar(martina);
    await conRutinaYUltima(martina, null);
    await e.prisma.sesionEntreno.updateMany({ where: { alumnoId: martina.id }, data: { cerradaAt: haceDias(AHORA, 8) } });
    const umbrales = leerUmbrales({ UMBRAL_SIN_SESIONES_DIAS: '10', UMBRAL_ESTANCAMIENTO_SESIONES: '4' });
    expect((await detectarNoche(e.prisma, new Date(AHORA), umbrales, 24 * 10)).alertas_creadas).toBe(0);
    // Con los del PRD, las dos aparecen.
    expect((await detectarNoche(e.prisma, new Date(AHORA), u, 24 * 10)).alertas_creadas).toBeGreaterThan(0);
  });

  it('WRK-017 Diego, solo, con 7 días sin entrenar: «sin sesiones» sin entrenador (P-23)', async () => {
    const { diego } = await e.escena();
    await conRutinaYUltima(diego, haceDias(AHORA, 7).toISOString());
    expect((await detectarNoche(e.prisma, new Date(AHORA), u)).por_tipo).toEqual({ sin_sesiones: 1 });
    const a = await e.prisma.alerta.findFirstOrThrow({ where: { alumnoId: diego.id } });
    expect(a.entrenadorId).toBeNull();
  });

  // ── Purga ───────────────────────────────────────────────────────────────────
  /** Una foto subida (fila y objeto en el almacenamiento). */
  async function fotoDe(alumno: PersonaDePrueba) {
    const clave = `fotos/${alumno.id}/${crypto.randomUUID()}.jpg`;
    await almacenamiento().guardar(clave, Buffer.from('foto'), 'image/jpeg');
    await e.prisma.fotoProgreso.create({ data: { alumnoId: alumno.id, fecha: new Date('2026-10-01'), tipo: 'frente', storageKey: clave, subidaAt: new Date(AHORA) } });
    return clave;
  }

  it('WRK-008 y WRK-010 se purga quien se marcó hace 30 días; quien lleva 29 días y 23 horas queda intacto', async () => {
    const { martina, diego } = await e.escena();
    const claveMartina = await fotoDe(martina);
    const claveDiego = await fotoDe(diego);
    await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: haceDias(AHORA, 40), series: [{ ejercicioId: BANCA, pesoKg: 40, reps: 8 }] });
    await e.prisma.usuario.update({ where: { id: martina.id }, data: { deletedAt: haceDias(AHORA, 30) } });
    await e.prisma.usuario.update({ where: { id: diego.id }, data: { deletedAt: new Date(new Date(AHORA).getTime() - 30 * DIA_MS + 3_600_000) } });
    const logs: Record<string, unknown>[] = [];
    const r = await correrTarea(e.prisma, 'purga', new Date(AHORA), { log: (o) => logs.push(o) });
    expect(r.purga).toMatchObject({ revisadas: 1, purgadas: 1, pendientes: 0, fotos_borradas: 1 });
    expect(await e.prisma.usuario.findUnique({ where: { id: martina.id } })).toBeNull();
    expect(await e.prisma.sesionEntreno.count({ where: { alumnoId: martina.id } })).toBe(0);
    expect(await almacenamiento().existe(claveMartina)).toBe(false);
    expect(await e.prisma.usuario.findUnique({ where: { id: diego.id } })).not.toBeNull();
    expect(await almacenamiento().existe(claveDiego)).toBe(true);
    // WRK-010: solo ids y conteos.
    const texto = JSON.stringify([logs, r]);
    expect(texto).not.toContain('@gymtrack.test');
    expect(texto).not.toContain('Martina');
  });

  it('WRK-009 si el almacenamiento falla la cuenta no se purga ni quedan huérfanos; la noche siguiente termina', async () => {
    const { martina } = await e.escena();
    const clave = await fotoDe(martina);
    await e.prisma.usuario.update({ where: { id: martina.id }, data: { deletedAt: haceDias(AHORA, 31) } });
    const roto: AdaptadorAlmacenamiento = { ...almacenamiento(), nombre: 'roto', borrar: async () => { throw new Error('bucket caído'); } };
    const primera = await correrTarea(e.prisma, 'purga', new Date(AHORA), { almacenamiento: roto });
    expect(primera.purga).toMatchObject({ purgadas: 0, pendientes: 1 });
    expect(await e.prisma.usuario.findUnique({ where: { id: martina.id } })).not.toBeNull();
    expect(await e.prisma.fotoProgreso.count({ where: { alumnoId: martina.id } })).toBe(1);
    expect(await almacenamiento().existe(clave)).toBe(true);
    const segunda = await correrTarea(e.prisma, 'purga', new Date(AHORA.replace('17', '18')));
    expect(segunda.purga).toMatchObject({ purgadas: 1, pendientes: 0 });
    expect(await almacenamiento().existe(clave)).toBe(false);
  });

  it('WRK-011 la entrenadora purgada deja a sus clientes solos con su historial y sus rutinas archivadas (P-24)', async () => {
    const { camila, martina } = await e.escena();
    // Un ejercicio propio de Camila que Martina usó en su rutina y en sus series.
    const propio = await e.prisma.ejercicio.create({
      data: { duenoId: camila.id, nombre: 'Remo en banco de Camila', grupoMuscular: 'Espalda', equipo: 'Mancuerna', patron: 'tiron', tipoCarga: 'kg', incrementoDefaultKg: 2 },
    });
    const rutina = await crearRutina(e.prisma, { duenoId: camila.id, alumnoId: martina.id, dias: [{ nombre: 'Tirón B', ejercicios: [{ slug: 'press-de-banca' }] }] });
    await e.prisma.ejercicioRutina.create({ data: { diaRutinaId: rutina.dias[0]!.id, ejercicioId: propio.id, orden: 2, series: 3, repsMin: 8, repsMax: 12, incrementoKg: 2 } });
    const sesion = await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: haceDias(AHORA, 35), rutinaId: rutina.id, series: [{ ejercicioId: propio.id, pesoKg: 20, reps: 10 }] });
    // Y una plantilla propia de Camila, sin alumno, que se va con ella.
    await crearRutina(e.prisma, { duenoId: camila.id, alumnoId: null, estado: 'borrador', dias: [{ nombre: 'Plantilla', ejercicios: [{ slug: 'press-de-banca' }] }] });
    await e.prisma.usuario.update({ where: { id: camila.id }, data: { deletedAt: haceDias(AHORA, 30) } });
    await e.prisma.vinculoEntrenador.updateMany({ where: { entrenadorId: camila.id }, data: { estado: 'terminado', terminadoAt: haceDias(AHORA, 30) } });

    const r = await correrTarea(e.prisma, 'purga', new Date(AHORA));
    expect(r.purga).toMatchObject({ purgadas: 1, pendientes: 0, ejercicios_copiados: 1, rutinas_entregadas: 1 });
    expect(await e.prisma.usuario.findUnique({ where: { id: camila.id } })).toBeNull();
    const deMartina = await e.prisma.rutina.findUniqueOrThrow({ where: { id: rutina.id } });
    expect(deMartina).toMatchObject({ duenoId: martina.id, alumnoId: martina.id, estado: 'archivada' });
    const serie = await e.prisma.serie.findFirstOrThrow({ where: { sesionId: sesion }, include: { ejercicio: true } });
    expect(serie.ejercicio).toMatchObject({ duenoId: martina.id, nombre: 'Remo en banco de Camila' });
    expect(await e.prisma.rutina.count({ where: { nombre: 'Fuerza 4 días', alumnoId: null } })).toBe(0);
    // Martina sigue entrando y viendo su historial.
    const historial = await e.pedirComo(martina, { method: 'GET', url: `/v1/me/progress/exercises/${serie.ejercicioId}` });
    expect(historial.status).toBe(200);
    expect(historial.json.puntos).toHaveLength(1);
  });
});
