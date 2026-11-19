// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de la campana sin base ni red · Zona: Pruebas (API)
//
// Qué hace: prueba las piezas de la campana que no necesitan PostgreSQL: qué deja cada aviso en la
// campana (lo mismo que el push, o lo del correo de la noche), el contrato de GET
// /v1/notificaciones (forma y fondo de `limite` y `antes`) y el servicio de avisos armado con una
// bandeja, un registro y unos dispositivos falsos: la notificación se crea aunque no haya
// dispositivos, aunque haya tope o aunque el push se caiga, y si la campana falla el push igual
// sale. Los ids NOT-080 a NOT-086 siguen la línea de NOT-xx de plan-de-validacion.md.
// Tócalo cuando: cambie servicio.ts, bandeja.ts o el contrato de la campana.
// Depende de: vitest y src/modulos/notificaciones.
// ─────────────────────────────────────────────────────────────────────────────
import { esquemaQueryNotificaciones, TOPE_AVISOS_DIA } from '@gymtrack/shared';
import { describe, expect, it } from 'vitest';
import type { Dispositivo } from '../src/modulos/notificaciones/almacen';
import { notificacionDeAviso, type Bandeja, type NuevaNotificacion } from '../src/modulos/notificaciones/bandeja';
import { leerConfigAvisos } from '../src/modulos/notificaciones/config';
import { crearBuzonPush, crearProveedores, type ProveedoresPush } from '../src/modulos/notificaciones/proveedores';
import { crearRegistroEnMemoria } from '../src/modulos/notificaciones/registro';
import { crearServicioAvisos, type Aviso } from '../src/modulos/notificaciones/servicio';
import { avisoObservacionDelAlumno, notificacionAlertasDeLaNoche } from '../src/modulos/notificaciones/textos';
import { crearRelojFijo } from '../src/reloj';

// ── Piezas falsas ────────────────────────────────────────────────────────────
const AHORA = '2026-11-17T13:00:00.000Z';
const camila = { id: 'u-camila', email: 'camila.rojas@gymtrack.test', nombre: 'Camila', timezone: 'America/Santiago', deletedAt: null };
const telefono: Dispositivo = { id: 'd1', usuarioId: camila.id, tipo: 'expo', plataforma: 'android', createdAt: new Date(AHORA), destino: { token: 'ExponentPushToken[camila-telefono-01]' } };

function bandejaEnMemoria(falla = false) {
  const guardadas: NuevaNotificacion[] = [];
  const bandeja: Bandeja = {
    async crear(n) {
      if (falla) throw new Error('la base no responde');
      if (guardadas.some((g) => g.clave === n.clave)) return false;
      guardadas.push(n);
      return true;
    },
    listar: async () => ({ items: [], sinLeer: 0 }),
    leer: async () => null,
    leerTodas: async () => 0,
    contarSinLeer: async () => guardadas.length,
  };
  return { bandeja, guardadas };
}

function armar(o: { dispositivos?: Dispositivo[]; bandejaFalla?: boolean; proveedores?: ProveedoresPush } = {}) {
  const config = leerConfigAvisos({ NODE_ENV: 'test' });
  const buzon = crearBuzonPush();
  const errores: unknown[] = [];
  const log = { info: () => undefined, warn: () => undefined, error: (x: unknown) => void errores.push(x) };
  const { bandeja, guardadas } = bandejaEnMemoria(o.bandejaFalla);
  const servicio = crearServicioAvisos({
    config,
    reloj: crearRelojFijo(AHORA),
    dispositivos: {
      guardar: async () => { throw new Error('no se usa'); },
      borrar: async () => false,
      activosDe: async () => o.dispositivos ?? [],
      invalidar: async () => undefined,
    },
    registro: crearRegistroEnMemoria(),
    bandeja,
    proveedores: o.proveedores ?? crearProveedores(config, buzon, log as never),
    buzon,
    enviarCorreo: () => undefined,
    log: log as never,
  });
  return { servicio, buzon, guardadas, errores };
}

const observacion = (k: number): Aviso => ({
  tipo: 'observacion', clave: `observacion:${k}`, para: camila, correo: null, cuentaTope: true,
  push: avisoObservacionDelAlumno({ alumno: { nombre: 'Martina' }, alumnoId: 'u-martina', sobre: 'Press de banca' }),
});

// ── Del aviso a la notificación ──────────────────────────────────────────────
describe('Qué deja un aviso en la campana', () => {
  it('NOT-080 el mismo título, texto y ruta del push, con el tipo y la clave del aviso', () => {
    expect(notificacionDeAviso(observacion(1))).toEqual({
      usuarioId: camila.id, clave: 'observacion:1', tipo: 'observacion',
      titulo: 'Martina dejó una observación', cuerpo: 'Sobre Press de banca. Toca para verla en su ficha.', ruta: '/cliente/u-martina',
    });
    // Sin push ni notificación propia, nada; con notificación propia, esa.
    expect(notificacionDeAviso({ ...observacion(2), push: null })).toBeNull();
    expect(notificacionDeAviso({ ...observacion(3), push: null, notificacion: { titulo: 'T', cuerpo: 'C', ruta: '/entrenador/alertas' } }))
      .toMatchObject({ titulo: 'T', cuerpo: 'C', ruta: '/entrenador/alertas' });
  });

  it('NOT-081 la noche: el asunto del correo como título y las alertas en una línea, hacia Alertas', () => {
    const sinSesiones = { tipo: 'sin_sesiones' as const, ejercicio: null, detalle: { dias: 9 } };
    expect(notificacionAlertasDeLaNoche([{ alumno: { nombre: 'Martina' }, alertas: [sinSesiones] }])).toEqual({
      titulo: 'Martina tiene una alerta nueva', cuerpo: 'Lleva 9 días sin entrenar. Toca para revisarla.', ruta: '/entrenador/alertas',
    });
    const varias = notificacionAlertasDeLaNoche([
      { alumno: { nombre: 'Martina' }, alertas: [sinSesiones] },
      { alumno: { nombre: 'Gonzalo' }, alertas: [{ ...sinSesiones, detalle: { dias: 12 } }] },
    ]);
    expect(varias.titulo).toBe('Tienes 2 alertas nuevas de tus alumnos');
    expect(varias.cuerpo).toBe('Martina: Lleva 9 días sin entrenar. Gonzalo: Lleva 12 días sin entrenar.');
  });
});

// ── Contrato ─────────────────────────────────────────────────────────────────
describe('Contrato de GET /v1/notificaciones', () => {
  const q = (x: Record<string, unknown>) => esquemaQueryNotificaciones.safeParse(x);

  it('NOT-082 limite de 1 a 50 (20 si no viene), solo dígitos; antes con fecha, hora y zona; nada más', () => {
    expect(q({}).data).toEqual({ limite: 20 });
    expect(q({ limite: '50', antes: '2026-11-17T10:00:00-03:00' }).data).toEqual({ limite: 50, antes: '2026-11-17T10:00:00-03:00' });
    for (const limite of ['0', '51', '-1', '2.5', '1e1', '0x10', ' 5', '', 'diez', 5]) expect(q({ limite }).success, String(limite)).toBe(false);
    for (const antes of ['ayer', '2026-11-17', '2026-11-17T10:00:00', '2026-13-01T10:00:00Z']) expect(q({ antes }).success, antes).toBe(false);
    expect(q({ cursor: 'abc' }).success).toBe(false);
  });
});

// ── El servicio crea la notificación siempre ─────────────────────────────────
describe('Servicio de avisos y campana', () => {
  it('NOT-083 sin dispositivos: no sale push, la notificación queda; el mismo aviso otra vez no la duplica', async () => {
    const { servicio, guardadas, buzon } = armar();
    const r = await servicio.enviar(observacion(1));
    expect([r.notificacion, r.push.omitido, buzon.todos().length]).toEqual([true, 'sin_dispositivos', 0]);
    const otra = await servicio.enviar(observacion(1));
    expect([otra.repetido, otra.notificacion]).toEqual([true, false]);
    expect(guardadas.map((g) => g.clave)).toEqual(['observacion:1']);
  });

  it('NOT-084 P-20 con el tope de push del día, el aviso que sigue no sale por push pero sí queda en la campana', async () => {
    const { servicio, guardadas, buzon } = armar({ dispositivos: [telefono] });
    for (let k = 1; k <= TOPE_AVISOS_DIA + 1; k++) await servicio.enviar(observacion(k));
    expect(buzon.todos()).toHaveLength(TOPE_AVISOS_DIA);
    expect(guardadas).toHaveLength(TOPE_AVISOS_DIA + 1);
  });

  it('NOT-085 si el servicio de push se cae, la notificación ya quedó; si la campana falla, el push igual sale', async () => {
    const caido: ProveedoresPush = {
      nombre: 'memoria',
      expo: async () => { throw new Error('sin red'); },
      web: async () => new Map(),
    };
    const a = armar({ dispositivos: [telefono], proveedores: caido });
    await expect(a.servicio.enviar(observacion(1))).rejects.toThrow('sin red');
    expect(a.guardadas.map((g) => g.titulo)).toEqual(['Martina dejó una observación']);

    const b = armar({ dispositivos: [telefono], bandejaFalla: true });
    const r = await b.servicio.enviar(observacion(1));
    expect([r.notificacion, r.push.enviados]).toEqual([false, 1]);
    expect(JSON.stringify(b.errores)).toContain('observacion');
    // El log no lleva el texto del aviso.
    expect(JSON.stringify(b.errores)).not.toContain('Martina');
  });

  it('NOT-086 a una cuenta por borrarse no le queda nada', async () => {
    const { servicio, guardadas } = armar();
    const r = await servicio.enviar({ ...observacion(1), para: { ...camila, deletedAt: new Date(AHORA) } });
    expect(r.notificacion).toBe(false);
    expect(guardadas).toHaveLength(0);
  });
});
