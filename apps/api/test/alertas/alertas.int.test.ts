// Alertas: lista y estado del entrenador, alertas del alumno, motivos y consejos, y la detección
// al cerrar (plan-de-validacion.md: INT-132 a INT-136, INT-145, INT-147 en su parte de alerta,
// INT-149; UNI-090, UNI-091; PERM-01, PERM-23, PERM-24, PERM-37; P-05, P-23).
// La escena: Camila entrenadora, Martina vinculada a Camila, Diego solo. Rodrigo hace de la otra
// entrenadora (Paula en datos-de-prueba.md) y Gonzalo de su cliente (Benjamín).
import { expect, it } from 'vitest';
import { crearAlertaDolor, detectarTrasCierre } from '../../src/modulos/alertas/deteccion';
import { UMBRALES_POR_DEFECTO } from '../../src/modulos/alertas/umbrales';
import { AHORA, describeConBase, idConsejo, idEjercicioBase, usarEntornoApi, vincular, type PersonaDePrueba } from '../ayudas';
import { crearRutina, crearSesion, haceDias, series } from '../progreso/datos';

const BANCA = idEjercicioBase('press-de-banca');
const RUMANO = idEjercicioBase('peso-muerto-rumano');
const DOMINADAS = idEjercicioBase('dominadas');
const u = UMBRALES_POR_DEFECTO;

describeConBase('Alertas', () => {
  const e = usarEntornoApi();

  async function alerta(alumno: PersonaDePrueba, entrenadorId: string | null, tipo: 'estancamiento' | 'baja_rendimiento' | 'sin_sesiones' | 'dolor', extra: Record<string, unknown> = {}) {
    return e.prisma.alerta.create({
      data: { alumnoId: alumno.id, entrenadorId, tipo, ejercicioId: tipo === 'sin_sesiones' ? null : RUMANO, detalle: { dato: 1 }, ...extra },
    });
  }

  /** Mejor 1RM de 80 (60 × 10) y luego 3 sesiones con 78, 80 y 76,7 (UNI-080). La última cierra ahora. */
  async function tresSinSuperar(alumno: PersonaDePrueba, ejercicioId = BANCA) {
    const pesos = [60, 58.5, 60, 57.5];
    let ultima = '';
    for (const [i, pesoKg] of pesos.entries()) {
      ultima = await crearSesion(e.prisma, {
        alumnoId: alumno.id, cerradaAt: i === pesos.length - 1 ? AHORA : haceDias(AHORA, (pesos.length - 1 - i) * 3),
        series: series(3, { ejercicioId, pesoKg, reps: 10 }),
      });
    }
    return ultima;
  }

  // ── Entrenador ──────────────────────────────────────────────────────────────
  it('INT-132 Camila ve las abiertas por defecto y las resueltas con el filtro; nunca la de otra entrenadora', async () => {
    const { camila, martina } = await e.escena();
    const rodrigo = await e.crear('rodrigo');
    const gonzalo = await e.crear('gonzalo');
    await vincular(e.prisma, rodrigo, gonzalo);
    const nueva = await alerta(martina, camila.id, 'estancamiento');
    const vista = await alerta(martina, camila.id, 'sin_sesiones', { estado: 'vista', vistaAt: new Date(AHORA) });
    const resuelta = await alerta(martina, camila.id, 'dolor', { estado: 'resuelta', resueltaAt: new Date(AHORA) });
    await alerta(gonzalo, rodrigo.id, 'estancamiento');
    const abiertas = await e.pedirComo(camila, { method: 'GET', url: '/v1/trainer/alerts' });
    expect(abiertas.status).toBe(200);
    expect(abiertas.json.items.map((a: any) => a.id).sort()).toEqual([nueva.id, vista.id].sort());
    expect(abiertas.json).toMatchObject({ abiertas: 2, nuevas: 1, next_cursor: null });
    expect(abiertas.json.items.find((a: any) => a.id === nueva.id)).toMatchObject({
      tipo: 'estancamiento', estado: 'nueva', client: { id: martina.id, nombre: 'Martina' }, exercise: { nombre: 'Peso muerto rumano' }, pide_motivos: true,
    });
    const resueltas = await e.pedirComo(camila, { method: 'GET', url: '/v1/trainer/alerts', query: { estado: 'resueltas' } });
    expect(resueltas.json.items.map((a: any) => a.id)).toEqual([resuelta.id]);
  });

  it('INT-133 Camila marca vista y luego resuelta; «borrada» da 400 y la de otra entrenadora 404', async () => {
    const { camila, martina } = await e.escena();
    const rodrigo = await e.crear('rodrigo');
    const gonzalo = await e.crear('gonzalo');
    await vincular(e.prisma, rodrigo, gonzalo);
    const a = await alerta(martina, camila.id, 'estancamiento');
    const ajena = await alerta(gonzalo, rodrigo.id, 'estancamiento');
    const patch = (id: string, payload: Record<string, unknown>) => e.pedirComo(camila, { method: 'PATCH', url: `/v1/alerts/${id}`, payload });
    const vista = await patch(a.id, { estado: 'vista' });
    expect(vista.status).toBe(200);
    expect(vista.json).toMatchObject({ estado: 'vista', vista_at: AHORA });
    const resuelta = await patch(a.id, { estado: 'resuelta', acciones: ['cargas', 'consejo'] });
    expect(resuelta.status).toBe(200);
    expect(resuelta.json).toMatchObject({ estado: 'resuelta', resuelta_at: AHORA, acciones: ['cargas', 'consejo'], pide_motivos: false });
    expect(resuelta.json.detalle).toEqual({ dato: 1 });
    expect((await patch(a.id, { estado: 'borrada' })).status).toBe(400);
    expect((await patch(a.id, { estado: 'vista' })).status).toBe(409);
    const otra = await patch(ajena.id, { estado: 'vista' });
    expect(otra.status).toBe(404);
    expect((await e.prisma.alerta.findUniqueOrThrow({ where: { id: ajena.id } })).estado).toBe('nueva');
  });

  it('PERM-01 Martina y Diego no ven ni cambian alertas de entrenador (403)', async () => {
    const { camila, martina, diego } = await e.escena();
    const a = await alerta(martina, camila.id, 'estancamiento');
    for (const p of [martina, diego]) {
      expect((await e.pedirComo(p, { method: 'GET', url: '/v1/trainer/alerts' })).status).toBe(403);
      expect((await e.pedirComo(p, { method: 'PATCH', url: `/v1/alerts/${a.id}`, payload: { estado: 'vista' } })).status).toBe(403);
    }
  });

  // ── Alumno ──────────────────────────────────────────────────────────────────
  it('INT-134 Martina ve solo sus alertas que piden motivos; Camila recibe 403', async () => {
    const { camila, martina, diego } = await e.escena();
    const baja = await alerta(martina, camila.id, 'baja_rendimiento');
    await alerta(martina, camila.id, 'sin_sesiones');
    await alerta(martina, camila.id, 'dolor');
    await alerta(diego, null, 'baja_rendimiento');
    const r = await e.pedirComo(martina, { method: 'GET', url: '/v1/me/alerts' });
    expect(r.status).toBe(200);
    expect(r.json.items.map((a: any) => a.id)).toEqual([baja.id]);
    expect(r.json.items[0].pide_motivos).toBe(true);
    expect((await e.pedirComo(camila, { method: 'GET', url: '/v1/me/alerts' })).status).toBe(403);
  });

  it('INT-135 sueño y estrés con comentario: 201, el reporte queda guardado y vienen 6 consejos', async () => {
    const { camila, martina } = await e.escena();
    const baja = await alerta(martina, camila.id, 'baja_rendimiento');
    const r = await e.pedirComo(martina, {
      method: 'POST', url: '/v1/me/drop-reports',
      payload: { alert_id: baja.id, motivos: ['sueno', 'estres'], comentario: 'Semana de cierre en el trabajo.' },
    });
    expect(r.status).toBe(201);
    expect(r.json.consejos).toHaveLength(6);
    expect(r.json.consejos.map((c: any) => c.id)).toEqual([1, 2, 3].map((i) => idConsejo('sueno', i)).concat([1, 2, 3].map((i) => idConsejo('estres', i))));
    const fila = await e.prisma.reporteBaja.findUniqueOrThrow({ where: { alertaId: baja.id } });
    expect(fila).toMatchObject({ motivos: ['sueno', 'estres'], comentario: 'Semana de cierre en el trabajo.' });
    expect(fila.consejosMostrados).toHaveLength(6);
    // Con el reporte ya no pide motivos, y la entrenadora lo ve en la alerta.
    expect((await e.pedirComo(martina, { method: 'GET', url: '/v1/me/alerts' })).json.items).toEqual([]);
    const deCamila = await e.pedirComo(camila, { method: 'GET', url: '/v1/trainer/alerts' });
    expect(deCamila.json.items[0].reporte).toMatchObject({ motivos: ['sueno', 'estres'], consejos_mostrados: 6 });
  });

  it('INT-136 un segundo reporte da 409, el motivo «flojera» 400 y la alerta de Diego 404', async () => {
    const { camila, martina, diego } = await e.escena();
    const baja = await alerta(martina, camila.id, 'baja_rendimiento');
    const deDiego = await alerta(diego, null, 'baja_rendimiento');
    const reportar = (payload: Record<string, unknown>) => e.pedirComo(martina, { method: 'POST', url: '/v1/me/drop-reports', payload });
    expect((await reportar({ alert_id: baja.id, motivos: ['tiempo'] })).status).toBe(201);
    expect((await reportar({ alert_id: baja.id, motivos: ['otro'], comentario: 'Cambio de turno' })).status).toBe(409);
    expect((await reportar({ alert_id: baja.id, motivos: ['flojera'] })).status).toBe(400);
    expect((await reportar({ alert_id: deDiego.id, motivos: ['sueno'] })).status).toBe(404);
    expect((await e.pedirComo(camila, { method: 'POST', url: '/v1/me/drop-reports', payload: { alert_id: baja.id, motivos: ['sueno'] } })).status).toBe(403);
  });

  // ── Detección con base ──────────────────────────────────────────────────────
  it('INT-145 Diego, solo, con 3 sesiones sin superar su mejor 1RM: alerta sin entrenador, motivos y consejos', async () => {
    const { diego } = await e.escena();
    const ultima = await tresSinSuperar(diego);
    const creadas = await detectarTrasCierre(e.prisma, ultima, u, new Date(AHORA));
    expect(creadas.map((a) => a.tipo)).toEqual(['estancamiento']);
    expect(creadas[0]).toMatchObject({ exercise_id: BANCA, nombre: 'Press de banca' });
    const fila = await e.prisma.alerta.findUniqueOrThrow({ where: { id: creadas[0]!.id } });
    expect(fila.entrenadorId).toBeNull();
    expect(fila.detalle).toMatchObject({ mejor: { valor: 80 }, sesiones: [{ marca: 78 }, { marca: 80 }, { marca: 76.7 }] });
    const mias = await e.pedirComo(diego, { method: 'GET', url: '/v1/me/alerts' });
    expect(mias.json.items.map((a: any) => a.id)).toEqual([fila.id]);
    const r = await e.pedirComo(diego, { method: 'POST', url: '/v1/me/drop-reports', payload: { alert_id: fila.id, motivos: ['alimentacion'] } });
    expect(r.status).toBe(201);
    expect(r.json.consejos).toHaveLength(3);
  });

  it('UNI-090 no se repite la alerta abierta; con la anterior resuelta se vuelve a crear', async () => {
    const { martina, camila } = await e.escena();
    const ultima = await tresSinSuperar(martina);
    const [primera] = await detectarTrasCierre(e.prisma, ultima, u, new Date(AHORA));
    expect(primera?.tipo).toBe('estancamiento');
    expect((await e.prisma.alerta.findUniqueOrThrow({ where: { id: primera!.id } })).entrenadorId).toBe(camila.id);
    // Otra sesión sin superar: con la abierta, no crea otra.
    const otra = await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: new Date(new Date(AHORA).getTime() + 3_600_000), series: series(3, { ejercicioId: BANCA, pesoKg: 57.5, reps: 10 }) });
    expect(await detectarTrasCierre(e.prisma, otra, u, new Date(AHORA))).toEqual([]);
    await e.prisma.alerta.update({ where: { id: primera!.id }, data: { estado: 'resuelta', resueltaAt: new Date(AHORA) } });
    const tercera = await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: new Date(new Date(AHORA).getTime() + 7_200_000), series: series(3, { ejercicioId: BANCA, pesoKg: 57.5, reps: 10 }) });
    expect((await detectarTrasCierre(e.prisma, tercera, u, new Date(AHORA))).map((a) => a.tipo)).toEqual(['estancamiento']);
  });

  it('UNI-091 en peso corporal se compara por repeticiones (P-09)', async () => {
    const { diego } = await e.escena();
    const reps = [12, 11, 12, 11];
    let ultima = '';
    for (const [i, r] of reps.entries()) {
      ultima = await crearSesion(e.prisma, { alumnoId: diego.id, cerradaAt: haceDias(AHORA, (reps.length - 1 - i) * 3), series: series(3, { ejercicioId: DOMINADAS, pesoKg: 0, reps: r }) });
    }
    const creadas = await detectarTrasCierre(e.prisma, ultima, u, new Date(AHORA));
    expect(creadas.map((a) => a.tipo)).toEqual(['estancamiento']);
    const fila = await e.prisma.alerta.findUniqueOrThrow({ where: { id: creadas[0]!.id } });
    expect(fila.detalle).toMatchObject({ tipo_marca: 'reps', mejor: { valor: 12 } });
  });

  it('INT-149 Empuje A con 3.780 kg contra 4.200 de promedio crea la baja y pide motivos; con 3.781 nada', async () => {
    const { camila, martina } = await e.escena();
    for (const [volumen, hay] of [[3780, true], [3781, false]] as const) {
      await e.prisma.alerta.deleteMany();
      await e.prisma.sesionEntreno.deleteMany();
      await e.prisma.rutina.deleteMany();
      const rutina = await crearRutina(e.prisma, { duenoId: camila.id, alumnoId: martina.id, dias: [{ nombre: 'Empuje A', ejercicios: [{ slug: 'press-de-banca' }] }] });
      const dia = rutina.dias[0]!;
      // Pesos que suben para que ni el 1RM ni el estancamiento disparen nada: solo el volumen.
      for (const [i, d] of [27, 21, 14, 7].entries()) {
        await crearSesion(e.prisma, {
          alumnoId: martina.id, cerradaAt: haceDias(AHORA, d), rutinaId: rutina.id, diaRutinaId: dia.id, volumenKg: 4200,
          series: series(3, { ejercicioId: BANCA, ejercicioRutinaId: dia.ejercicios[0]!.id, pesoKg: 40 + i, reps: 8 }),
        });
      }
      const hoy = await crearSesion(e.prisma, {
        alumnoId: martina.id, cerradaAt: AHORA, rutinaId: rutina.id, diaRutinaId: dia.id, volumenKg: volumen,
        series: series(3, { ejercicioId: BANCA, ejercicioRutinaId: dia.ejercicios[0]!.id, pesoKg: 45, reps: 8 }),
      });
      const creadas = await detectarTrasCierre(e.prisma, hoy, u, new Date(AHORA));
      if (!hay) {
        expect(creadas, `volumen ${volumen}`).toEqual([]);
        continue;
      }
      expect(creadas).toEqual([expect.objectContaining({ tipo: 'baja_rendimiento', exercise_id: null })]);
      const fila = await e.prisma.alerta.findUniqueOrThrow({ where: { id: creadas[0]!.id } });
      expect(fila.entrenadorId).toBe(camila.id);
      expect(fila.detalle).toMatchObject({ medida: 'volumen', actual: 3780, promedio: 4200, caida_pct: 10, session_id: hoy });
      const mias = await e.pedirComo(martina, { method: 'GET', url: '/v1/me/alerts' });
      expect(mias.json.items).toEqual([expect.objectContaining({ id: fila.id, tipo: 'baja_rendimiento', pide_motivos: true })]);
    }
  });

  it('INT-147 un dolor de intensidad 7 crea la alerta para Camila; uno de 6 no (§Datos)', async () => {
    const { camila, martina } = await e.escena();
    const obs = (intensidad: number) =>
      e.prisma.observacion.create({
        data: { autorId: martina.id, alumnoId: martina.id, tipo: 'dolor', ejercicioId: BANCA, texto: 'Me molesta el hombro', dolorZona: 'hombro_derecho', dolorIntensidad: intensidad },
      });
    const fuerte = await obs(7);
    const a = await crearAlertaDolor(e.prisma, fuerte, u, new Date(AHORA));
    expect(a).toMatchObject({ tipo: 'dolor', exercise_id: BANCA, nombre: 'Press de banca' });
    expect((await e.prisma.alerta.findUniqueOrThrow({ where: { id: a!.id } })).entrenadorId).toBe(camila.id);
    await e.prisma.alerta.deleteMany();
    expect(await crearAlertaDolor(e.prisma, await obs(6), u, new Date(AHORA))).toBeNull();
    expect(await e.prisma.alerta.count()).toBe(0);
  });
});
