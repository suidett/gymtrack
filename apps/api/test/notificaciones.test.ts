// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de los avisos sin base ni red · Zona: Pruebas (API)
//
// Qué hace: prueba las piezas de src/modulos/notificaciones que no necesitan PostgreSQL: el
// contrato de entrada (forma y fondo de un token de Expo y de una suscripción web), el cifrado
// del destino, la configuración (VAPID, PUSH_DRIVER), los proveedores con un fetch y un envío web
// falsos (nunca se llama a Expo, a Google ni a Apple), los textos y la cuenta de la hora del
// recordatorio con cambio de horario. Los ids NOT-xx están al final de plan-de-validacion.md.
// Tócalo cuando: cambie una de esas piezas.
// Depende de: vitest, web-push (solo para generar llaves y armar el pedido, sin mandarlo) y
// src/modulos/notificaciones.
// ─────────────────────────────────────────────────────────────────────────────
import {
  esquemaDispositivoAvisoEntrada, esServicioPushWeb, medirBase64Url, RESPUESTAS_ERROR, RUTAS_NOTIFICACIONES,
} from '@gymtrack/shared';
import { createECDH, randomBytes } from 'node:crypto';
import { generateRequestDetails, generateVAPIDKeys } from 'web-push';
import { describe, expect, it } from 'vitest';
import { crearCifrador } from '../src/modulos/notificaciones/cifrado';
import { leerConfigAvisos } from '../src/modulos/notificaciones/config';
import {
  cargaWeb, crearProveedorExpo, crearProveedorWeb, LOTE_EXPO, TOPE_PUSH_MS, URL_EXPO_PUSH, type FetchExpo, type MensajePush,
} from '../src/modulos/notificaciones/proveedores';
import { enVentana, formatearHora, horaHabitual, instanteLocal, leerHora, minutosLocales } from '../src/modulos/notificaciones/recordatorios';
import {
  avisoAlertas, avisoObservacionDelAlumno, avisoObservacionDelEntrenador, avisoPrueba, avisoRecordatorio, avisoRutina, cortar,
  correoAlertasDeLaNoche,
} from '../src/modulos/notificaciones/textos';
import type { DispositivoExpo, DispositivoWeb } from '../src/modulos/notificaciones/almacen';
import { armarApp, URL_SIN_BASE } from './ayudantes';

// ── Datos ────────────────────────────────────────────────────────────────────
const TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
const p256dh = () => createECDH('prime256v1').generateKeys().toString('base64url');
const auth = () => randomBytes(16).toString('base64url');
const suscripcion = (endpoint = 'https://fcm.googleapis.com/fcm/send/abc123:APA91bH') => ({ endpoint, expirationTime: null, keys: { p256dh: p256dh(), auth: auth() } });
const mensaje: MensajePush = { titulo: 'Hola', cuerpo: 'Cuerpo', datos: { tipo: 'prueba', url: '/' }, vigenciaS: 3600, urgente: true };
const expo = (id: string, token = TOKEN): DispositivoExpo => ({ id, usuarioId: 'u1', tipo: 'expo', plataforma: 'android', createdAt: new Date(), destino: { token } });
const web = (id: string): DispositivoWeb => ({ id, usuarioId: 'u1', tipo: 'web', plataforma: 'web', createdAt: new Date(), destino: suscripcion() });

// ── Contrato ─────────────────────────────────────────────────────────────────
describe('Contrato de dispositivos', () => {
  const valida = (b: unknown) => esquemaDispositivoAvisoEntrada.safeParse(b).success;

  it('NOT-001 acepta un token de Expo de Android y una suscripción web de Chrome, Safari y Firefox', () => {
    expect(valida({ tipo: 'expo', token: TOKEN, plataforma: 'android' })).toBe(true);
    expect(valida({ tipo: 'web', suscripcion: suscripcion() })).toBe(true);
    expect(valida({ tipo: 'web', suscripcion: suscripcion('https://web.push.apple.com/QGuQyavXutnMH7BPzA') })).toBe(true);
    expect(valida({ tipo: 'web', suscripcion: suscripcion('https://updates.push.services.mozilla.com/wpush/v2/gAAAAA') })).toBe(true);
    // Sin expirationTime también (algunos navegadores no lo mandan).
    const { expirationTime: _, ...sinVencimiento } = suscripcion();
    expect(valida({ tipo: 'web', suscripcion: sinVencimiento })).toBe(true);
  });

  it('NOT-002 rechaza un endpoint que no es https o no es de un servicio de push (la API nunca le pega a una dirección del cliente)', () => {
    for (const endpoint of [
      'http://fcm.googleapis.com/fcm/send/abc', 'https://169.254.169.254/latest/meta-data', 'https://localhost:3000/v1/me',
      'https://fcm.googleapis.com.ataque.cl/x', 'https://evilfcm.googleapis.com.cl/x', 'https://ejemplo.cl/push', 'javascript:alert(1)',
      'https://fcm.googleapis.com..x/abc',
    ]) {
      expect(valida({ tipo: 'web', suscripcion: suscripcion(endpoint) }), endpoint).toBe(false);
    }
    expect(esServicioPushWeb('https://wns2-par02p.notify.windows.com/w/?token=abc')).toBe(true);
  });

  it('NOT-003 revisa el fondo de las llaves: p256dh de 65 bytes que empieza en 0x04 y auth de 16 bytes; nada de campos de más', () => {
    const s = suscripcion();
    expect(valida({ tipo: 'web', suscripcion: { ...s, keys: { ...s.keys, p256dh: randomBytes(65).toString('base64url').replace(/^./, 'A') } } })).toBe(false);
    expect(valida({ tipo: 'web', suscripcion: { ...s, keys: { ...s.keys, p256dh: randomBytes(32).toString('base64url') } } })).toBe(false);
    expect(valida({ tipo: 'web', suscripcion: { ...s, keys: { ...s.keys, auth: randomBytes(8).toString('base64url') } } })).toBe(false);
    expect(valida({ tipo: 'web', suscripcion: { ...s, keys: { ...s.keys, auth: 'no es base64!!' } } })).toBe(false);
    expect(valida({ tipo: 'web', suscripcion: { ...s, otra: 1 } })).toBe(false);
    expect(valida({ tipo: 'expo', token: TOKEN, plataforma: 'android', usuario_id: 'x' })).toBe(false);
    expect(valida({ tipo: 'expo', token: 'abc', plataforma: 'android' })).toBe(false);
    expect(valida({ tipo: 'expo', token: TOKEN, plataforma: 'web' })).toBe(false);
    expect(valida({ tipo: 'fcm', token: TOKEN })).toBe(false);
    // Con relleno «=» y en base64 normal también se mide bien.
    expect(medirBase64Url(Buffer.from(randomBytes(16)).toString('base64'))?.bytes).toBe(16);
  });

  it('NOT-004 CON-001 las rutas de /v1/notificaciones usan los mismos esquemas de RUTAS_NOTIFICACIONES y ninguna es pública', async () => {
    // Lo mismo que CON-001, mirado solo en este módulo (CATALOGO_API ya incluye RUTAS_NOTIFICACIONES).
    const a = await armarApp({ url: URL_SIN_BASE });
    try {
      const mias = a.app.gymtrack.rutas.filter((r) => r.url.startsWith('/v1/notificaciones/'));
      const catalogo = Object.values(RUTAS_NOTIFICACIONES);
      expect(mias).toHaveLength(catalogo.length);
      for (const r of mias) {
        const c = catalogo.find((x) => x.ruta === r.url && x.metodo === r.metodo);
        expect(c, `${r.metodo} ${r.url}`).toBeDefined();
        const schema = r.schema as { body?: unknown; params?: unknown; response: Record<string, unknown> };
        expect(schema.body).toBe((c as { cuerpo?: unknown }).cuerpo);
        expect(schema.params).toBe((c as { params?: unknown }).params);
        expect(schema.response[c!.exito]).toBe(c!.respuesta);
        for (const [estado, esquema] of Object.entries(RESPUESTAS_ERROR)) expect(schema.response[estado]).toBe(esquema);
        expect(c!.publica).toBe(false);
      }
      expect(a.app.gymtrack.modulos).toContain('notificaciones');
    } finally {
      await a.app.close();
      await a.prisma.$disconnect();
    }
  });
});

// ── Cifrado ──────────────────────────────────────────────────────────────────
describe('Cifrado del destino', () => {
  it('NOT-005 lo cifrado no deja ver el token, se lee con la misma clave y no con otra', () => {
    const c = crearCifrador('a'.repeat(64));
    const x = c.cifrar(JSON.stringify({ token: TOKEN }));
    expect(x).not.toContain('Exponent');
    expect(x).toMatch(/^v1\./);
    expect(c.cifrar('igual')).not.toBe(c.cifrar('igual'));
    expect(JSON.parse(c.descifrar(x)!)).toEqual({ token: TOKEN });
    expect(crearCifrador('b'.repeat(64)).descifrar(x)).toBeNull();
    expect(c.descifrar(`${x.slice(0, -2)}AA`)).toBeNull();
    expect(c.descifrar('basura')).toBeNull();
  });
});

// ── Configuración ────────────────────────────────────────────────────────────
describe('Configuración de avisos', () => {
  const llaves = generateVAPIDKeys();
  const base = { VAPID_PUBLICA: llaves.publicKey, VAPID_PRIVADA: llaves.privateKey, VAPID_CONTACTO: 'mailto:equipo@gymtrack.cl' };

  it('NOT-006 PUSH_DRIVER por entorno: producción real, pruebas memoria, local consola', () => {
    expect(leerConfigAvisos({ NODE_ENV: 'production' }).driver).toBe('real');
    expect(leerConfigAvisos({ NODE_ENV: 'test' }).driver).toBe('memoria');
    expect(leerConfigAvisos({}).driver).toBe('consola');
    expect(leerConfigAvisos({ NODE_ENV: 'test', PUSH_DRIVER: '' }).driver).toBe('memoria');
    expect(() => leerConfigAvisos({ PUSH_DRIVER: 'fcm' })).toThrow(/PUSH_DRIVER/);
  });

  it('NOT-007 las llaves VAPID van las tres juntas, con su forma, y el contacto es mailto o https', () => {
    expect(leerConfigAvisos(base).vapid).toEqual({ publica: llaves.publicKey, privada: llaves.privateKey, contacto: 'mailto:equipo@gymtrack.cl' });
    expect(leerConfigAvisos({ VAPID_PUBLICA: '', VAPID_PRIVADA: '', VAPID_CONTACTO: '' }).vapid).toBeNull();
    expect(() => leerConfigAvisos({ VAPID_PUBLICA: llaves.publicKey })).toThrow(/las tres juntas/);
    expect(() => leerConfigAvisos({ ...base, VAPID_PUBLICA: llaves.privateKey })).toThrow(/VAPID_PUBLICA/);
    expect(() => leerConfigAvisos({ ...base, VAPID_PRIVADA: llaves.publicKey })).toThrow(/VAPID_PRIVADA/);
    expect(() => leerConfigAvisos({ ...base, VAPID_CONTACTO: 'equipo@gymtrack.cl' })).toThrow(/VAPID_CONTACTO/);
    expect(() => leerConfigAvisos({ ...base, VAPID_CONTACTO: 'https://localhost' })).toThrow(/VAPID_CONTACTO/);
    expect(leerConfigAvisos({ ...base, VAPID_CONTACTO: 'https://gymtrack-app-5dd46.web.app' }).vapid?.contacto).toBe('https://gymtrack-app-5dd46.web.app');
  });

  it('NOT-008 AVISOS_URL_APP sin barra final y con https en producción', () => {
    expect(leerConfigAvisos({ AVISOS_URL_APP: 'https://gymtrack-app-5dd46.web.app/' }).urlApp).toBe('https://gymtrack-app-5dd46.web.app');
    expect(() => leerConfigAvisos({ NODE_ENV: 'production', AVISOS_URL_APP: 'http://gymtrack.cl' })).toThrow(/https/);
    expect(() => leerConfigAvisos({ AVISOS_URL_APP: 'gymtrack.cl' })).toThrow(/AVISOS_URL_APP/);
  });

  it('NOT-009 las llaves y una suscripción real sirven para armar el pedido de web-push (sin mandarlo)', () => {
    const c = leerConfigAvisos(base);
    const s = suscripcion();
    const pedido = generateRequestDetails(s, cargaWeb(mensaje), {
      vapidDetails: { subject: c.vapid!.contacto, publicKey: c.vapid!.publica, privateKey: c.vapid!.privada }, TTL: 60, urgency: 'high',
    });
    expect(pedido.endpoint).toBe(s.endpoint);
    expect(pedido.headers.Authorization).toMatch(/^vapid t=/);
    expect(pedido.headers.Urgency).toBe('high');
  });
});

// ── Expo ─────────────────────────────────────────────────────────────────────
describe('Proveedor de Expo (fetch falso)', () => {
  it('NOT-010 manda a la Push API de Expo con el canal de Android y marca DeviceNotRegistered como inválido', async () => {
    const llamadas: { url: string; init: Parameters<FetchExpo>[1] }[] = [];
    const p = crearProveedorExpo({
      accessToken: 'token-de-acceso-de-prueba',
      fetch: async (url, init) => {
        llamadas.push({ url, init });
        return { ok: true, status: 200, json: async () => ({ data: [{ status: 'ok', id: 'x' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }, { status: 'error', details: { error: 'MessageRateExceeded' } }] }) };
      },
    });
    const r = await p.enviar([expo('a'), expo('b', 'ExponentPushToken[yyyyyyyyyyyy]'), expo('c', 'ExponentPushToken[zzzzzzzzzzzz]')], mensaje);
    expect([...r.entries()]).toEqual([['a', 'enviado'], ['b', 'invalido'], ['c', 'fallido']]);
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0]!.url).toBe(URL_EXPO_PUSH);
    expect(llamadas[0]!.init.headers.authorization).toBe('Bearer token-de-acceso-de-prueba');
    expect(llamadas[0]!.init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(llamadas[0]!.init.body)[0]).toEqual({
      to: TOKEN, title: 'Hola', body: 'Cuerpo', data: { tipo: 'prueba', url: '/' }, sound: 'default', priority: 'high', channelId: 'avisos', ttl: 3600,
    });
    expect(TOPE_PUSH_MS).toBe(10_000);
  });

  it('NOT-011 un 503 o una caída de red se reintenta una vez; un 400 no; de a 100 por pedido', async () => {
    let n = 0;
    const caido = crearProveedorExpo({ pausaReintentoMs: 0, fetch: async () => { n += 1; return { ok: false, status: 503, json: async () => ({}) }; } });
    expect((await caido.enviar([expo('a')], mensaje)).get('a')).toBe('fallido');
    expect(n).toBe(2);
    n = 0;
    const malo = crearProveedorExpo({ pausaReintentoMs: 0, fetch: async () => { n += 1; return { ok: false, status: 400, json: async () => ({}) }; } });
    expect((await malo.enviar([expo('a')], mensaje)).get('a')).toBe('fallido');
    expect(n).toBe(1);
    n = 0;
    const sinRed = crearProveedorExpo({
      pausaReintentoMs: 0,
      fetch: async () => {
        n += 1;
        if (n === 1) throw new DOMException('timeout', 'TimeoutError');
        return { ok: true, status: 200, json: async () => ({ data: [{ status: 'ok' }] }) };
      },
    });
    expect((await sinRed.enviar([expo('a')], mensaje)).get('a')).toBe('enviado');
    const lotes: number[] = [];
    const muchos = crearProveedorExpo({
      fetch: async (_u, init) => {
        const cuerpo = JSON.parse(init.body) as unknown[];
        lotes.push(cuerpo.length);
        return { ok: true, status: 200, json: async () => ({ data: cuerpo.map(() => ({ status: 'ok' })) }) };
      },
    });
    const r = await muchos.enviar(Array.from({ length: 150 }, (_, i) => expo(`d${i}`)), mensaje);
    expect(lotes).toEqual([LOTE_EXPO, 50]);
    expect([...r.values()].every((x) => x === 'enviado')).toBe(true);
  });
});

// ── Web Push ─────────────────────────────────────────────────────────────────
describe('Proveedor de Web Push (envío falso)', () => {
  const vapid = { publica: 'pub', privada: 'priv', contacto: 'mailto:equipo@gymtrack.cl' };

  it('NOT-012 manda la carga que lee el service worker con VAPID; 404 y 410 son inválidos; un 500 se reintenta una vez', async () => {
    const vistos: { carga: string; opciones: unknown }[] = [];
    const estados = new Map<string, number[]>([['ok', []], ['ido', [410]], ['viejo', [404]], ['caido', [500, 500]], ['vuelve', [503]]]);
    const p = crearProveedorWeb({
      vapid, pausaReintentoMs: 0,
      enviar: async (s, carga, opciones) => {
        vistos.push({ carga, opciones });
        const cola = estados.get(s.endpoint)!;
        const estado = cola.shift();
        if (estado) throw Object.assign(new Error('WebPushError'), { statusCode: estado });
        return { statusCode: 201 };
      },
    });
    const ds = ['ok', 'ido', 'viejo', 'caido', 'vuelve'].map((id) => ({ ...web(id), destino: { endpoint: id, keys: { p256dh: 'x', auth: 'y' } } }));
    const r = await p.enviar(ds, mensaje);
    expect(Object.fromEntries(r)).toEqual({ ok: 'enviado', ido: 'invalido', viejo: 'invalido', caido: 'fallido', vuelve: 'enviado' });
    expect(JSON.parse(vistos[0]!.carga)).toEqual({ titulo: 'Hola', cuerpo: 'Cuerpo', url: '/', tipo: 'prueba' });
    expect(vistos[0]!.opciones).toEqual({
      vapidDetails: { subject: 'mailto:equipo@gymtrack.cl', publicKey: 'pub', privateKey: 'priv' }, TTL: 3600, urgency: 'high', timeout: 10_000,
    });
  });
});

// ── Textos ───────────────────────────────────────────────────────────────────
describe('Textos de los avisos', () => {
  const camila = { nombre: 'Camila', apellido: 'Rojas' };
  const martina = { nombre: 'Martina', apellido: 'Fuentes' };
  const todos = () => [
    avisoAlertas({ entrenador: camila, alumno: martina, alumnoId: 'm', urlApp: 'https://app', alertas: [{ tipo: 'dolor', ejercicio: 'Press de banca', detalle: { zona: 'espalda_baja', intensidad: 8 } }] }),
    avisoAlertas({ entrenador: camila, alumno: martina, alumnoId: 'm', urlApp: null, alertas: [
      { tipo: 'estancamiento', ejercicio: 'Peso muerto rumano', detalle: { sesiones: [1, 2, 3] } },
      { tipo: 'baja_rendimiento', ejercicio: null, detalle: { medida: 'volumen', caida_pct: 15.04 } },
    ] }),
  ];

  it('NOT-013 el dolor dice cuánto y dónde, abre Alertas y es urgente; dos alertas van en un solo aviso', () => {
    const [dolor, dos] = todos();
    expect(dolor!.push).toMatchObject({ titulo: 'Dolor fuerte de Martina', datos: { tipo: 'dolor', url: '/entrenador/alertas' }, urgente: true });
    expect(dolor!.push.cuerpo).toBe('Dolor 8 de 10 en espalda baja en Press de banca. Toca para revisarla.');
    expect(dolor!.correo.asunto).toBe('Martina reportó un dolor fuerte');
    expect(dolor!.correo.html).toContain('https://app/entrenador/alertas');
    expect(dos!.push.titulo).toBe('Martina tiene 2 alertas nuevas');
    expect(dos!.push.cuerpo).toContain('3 sesiones sin superar su mejor marca');
    expect(dos!.correo.texto).toContain('El volumen de la sesión bajó 15 % frente a las 4 semanas anteriores.');
  });

  it('NOT-014 lo que escribe el alumno no va en el push; lo del entrenador va cortado; todo con tuteo y sin guion largo', () => {
    const alumno = avisoObservacionDelAlumno({ alumno: martina, alumnoId: 'm', sobre: 'Press de banca' });
    expect(alumno).toMatchObject({ titulo: 'Martina dejó una observación', cuerpo: 'Sobre Press de banca. Toca para verla en su ficha.', datos: { url: '/cliente/m' } });
    const largo = 'Baja un poco el peso y cuida que el codo no se abra en la bajada, así proteges el hombro. '.repeat(3);
    const entrenador = avisoObservacionDelEntrenador({ entrenador: camila, tipo: 'consejo', texto: largo, sobre: null });
    expect(entrenador.titulo).toBe('Camila te dejó un consejo');
    expect(entrenador.cuerpo.length).toBeLessThanOrEqual(140);
    expect(entrenador.cuerpo.endsWith('...')).toBe(true);
    const textos = [
      ...todos().flatMap((t) => [t.push.titulo, t.push.cuerpo, t.correo.asunto, t.correo.texto]),
      alumno.titulo, alumno.cuerpo, entrenador.titulo,
      ...Object.values(avisoRutina({ entrenador: camila, rutina: 'Fuerza', rutinaId: 'r', accion: 'asignada_activa' })).filter((v) => typeof v === 'string'),
      avisoRecordatorio({ hora: '19:00', dia: 'Empuje A' }).titulo, avisoRecordatorio({ hora: '19:00', dia: null }).cuerpo, avisoPrueba().cuerpo,
      correoAlertasDeLaNoche(camila, [{ alumno: martina, alertas: [{ tipo: 'sin_sesiones', ejercicio: null, detalle: { dias: 7 } }] }], null).texto,
    ];
    for (const t of textos) {
      expect(t).not.toMatch(/[—–]/);
      expect(t).not.toMatch(/\busted\b/i);
    }
    expect(avisoRecordatorio({ hora: '19:00', dia: 'Empuje A' })).toMatchObject({ titulo: 'Hoy toca Empuje A', cuerpo: 'Tu hora habitual es a las 19:00: quedan 30 minutos.', vigenciaS: 1800 });
    expect(cortar('hola mundo', 50)).toBe('hola mundo');
  });

  it('NOT-015 el correo escapa lo que viene del usuario', () => {
    const { correo } = avisoAlertas({
      entrenador: { nombre: '<b>Cami</b>' }, alumno: { nombre: '<script>x</script>' }, alumnoId: 'm', urlApp: null,
      alertas: [{ tipo: 'dolor', ejercicio: null, detalle: { zona: '<img src=x>', intensidad: 9 } }],
    });
    expect(correo.html).not.toContain('<script>');
    expect(correo.html).not.toContain('<img');
    expect(correo.html).toContain('&lt;b&gt;Cami&lt;/b&gt;');
  });
});

// ── Hora del recordatorio ────────────────────────────────────────────────────
describe('Hora del recordatorio', () => {
  it('NOT-016 la hora habitual es la mediana de las horas de inicio (P-21)', () => {
    expect(horaHabitual([])).toBeNull();
    expect(horaHabitual([1140])).toBe(1140);
    expect(horaHabitual([1200, 1140, 600])).toBe(1140);
    expect(horaHabitual([1140, 1170])).toBe(1155);
    expect(formatearHora(1155)).toBe('19:15');
    expect(leerHora('19:00')).toBe(1140);
    expect(leerHora('24:00')).toBeNull();
    expect(leerHora(null)).toBeNull();
    expect(minutosLocales(new Date('2026-11-17T22:05:00Z'), 'America/Santiago')).toBe(19 * 60 + 5);
  });

  it('WRK-012 las 19:00 de Santiago con el cambio de horario del 4 de abril de 2026', () => {
    // Antes del cambio Santiago está en UTC-3; después, en UTC-4.
    expect(instanteLocal('2026-04-03', 1140, 'America/Santiago').toISOString()).toBe('2026-04-03T22:00:00.000Z');
    expect(instanteLocal('2026-04-10', 1140, 'America/Santiago').toISOString()).toBe('2026-04-10T23:00:00.000Z');
    // Punta Arenas sigue en UTC-3 todo el año.
    expect(instanteLocal('2026-07-01', 1140, 'America/Punta_Arenas').toISOString()).toBe('2026-07-01T22:00:00.000Z');
  });

  it('NOT-017 la ventana es (ahora - 5 min, ahora]: cada hora cae en una sola corrida', () => {
    const objetivo = new Date('2026-11-17T21:30:00Z');
    expect(enVentana(objetivo, new Date('2026-11-17T21:30:00Z'), 5)).toBe(true);
    expect(enVentana(objetivo, new Date('2026-11-17T21:34:59Z'), 5)).toBe(true);
    expect(enVentana(objetivo, new Date('2026-11-17T21:35:00Z'), 5)).toBe(false);
    expect(enVentana(objetivo, new Date('2026-11-17T21:29:59Z'), 5)).toBe(false);
  });
});
