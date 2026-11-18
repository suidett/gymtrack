// ─────────────────────────────────────────────────────────────────────────────
// Pruebas del correo por Gmail · Zona: Pruebas (API)
//
// Qué hace: prueba el adaptador SMTP (src/correo/smtp.ts) con un transporte falso, sin
// conectarse a Gmail: qué se manda, el reintento una sola vez ante un corte o un tope de tiempo,
// que una clave mala no se reintente y que la clave de aplicación nunca aparezca en un error ni
// en un log. Y la configuración: CORREO_DRIVER=smtp pide la cuenta y la clave de 16 letras, se
// acepta en producción y el remitente por defecto es la propia cuenta.
// Tócalo cuando: cambie el adaptador SMTP o sus variables.
// Depende de: vitest, pino, src/correo y src/config.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { Writable } from 'node:stream';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { leerConfig } from '../src/config';
import { adaptadorDesdeConfig, crearServicioCorreo } from '../src/correo';
import { plantillaRecuperacion } from '../src/correo/plantillas';
import { clasificarErrorSmtp, crearAdaptadorSmtp, crearTransporteNodemailer, ErrorSmtp, INTENTOS_SMTP, TOPE_SMTP_MS, type TransporteSmtp } from '../src/correo/smtp';
import type { CorreoSaliente } from '../src/correo/tipos';

const CLAVE_APP = 'abcdefghijklmnop';
const correo = (): CorreoSaliente => ({
  ...plantillaRecuperacion({ nombre: 'Martina', enlace: 'gymtrack://restablecer?token=abc', venceAt: new Date('2026-11-17T14:00:00Z'), zona: 'America/Santiago' }),
  para: 'martina.fuentes@gymtrack.test', etiqueta: 'recuperacion', usuarioId: '0192c000-0000-7000-8000-000000000001',
});
const opciones = (transporte: TransporteSmtp) => ({
  host: 'smtp.gmail.com', puerto: 465, usuario: 'gymtrack.avisos@gmail.com', clave: CLAVE_APP, remitente: 'GymTrack <gymtrack.avisos@gmail.com>',
  transporte, pausaReintentoMs: 0,
});
const errorSmtp = (code: string, responseCode?: number) => Object.assign(new Error(`Invalid login: 535 ${CLAVE_APP} martina.fuentes@gymtrack.test`), { code, responseCode });

describe('Adaptador SMTP (transporte falso)', () => {
  it('NOT-020 manda el mismo correo de las plantillas, con el remitente de Gmail y el tipo en una cabecera', async () => {
    const enviados: Parameters<TransporteSmtp['sendMail']>[0][] = [];
    const smtp = crearAdaptadorSmtp({ ...opciones({ sendMail: async (m) => { enviados.push(m); } }), responderA: 'equipo@gymtrack.test' });
    await smtp.enviar(correo());
    expect(smtp.nombre).toBe('smtp');
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toMatchObject({
      from: 'GymTrack <gymtrack.avisos@gmail.com>', to: 'martina.fuentes@gymtrack.test', subject: 'Restablece tu contraseña de GymTrack',
      replyTo: 'equipo@gymtrack.test', headers: { 'X-GymTrack-Tipo': 'recuperacion' },
    });
    expect(enviados[0]!.html).toContain('lang="es-CL"');
    expect(enviados[0]!.text).toContain('gymtrack://restablecer?token=abc');
  });

  it('NOT-021 un tope de tiempo o un corte se reintenta una sola vez; una clave mala (535) no se reintenta', async () => {
    let n = 0;
    const vuelve = crearAdaptadorSmtp(opciones({ sendMail: async () => { n += 1; if (n === 1) throw errorSmtp('ETIMEDOUT'); } }));
    await vuelve.enviar(correo());
    expect(n).toBe(2);
    n = 0;
    const caido = crearAdaptadorSmtp(opciones({ sendMail: async () => { n += 1; throw errorSmtp('ECONNECTION'); } }));
    await expect(caido.enviar(correo())).rejects.toMatchObject({ name: 'ErrorSmtp', code: 'SMTP_RED' });
    expect(n).toBe(INTENTOS_SMTP);
    n = 0;
    const clave = crearAdaptadorSmtp(opciones({ sendMail: async () => { n += 1; throw errorSmtp('EAUTH', 535); } }));
    await expect(clave.enviar(correo())).rejects.toMatchObject({ code: 'SMTP_535' });
    expect(n).toBe(1);
    // Un 421 (servidor ocupado) es temporal: se reintenta.
    n = 0;
    const ocupado = crearAdaptadorSmtp(opciones({ sendMail: async () => { n += 1; throw errorSmtp('EENVELOPE', 421); } }));
    await expect(ocupado.enviar(correo())).rejects.toMatchObject({ code: 'SMTP_421' });
    expect(n).toBe(2);
    expect(TOPE_SMTP_MS).toBe(10_000);
  });

  it('NOT-022 la clave de aplicación y el destinatario no aparecen en el error ni en el log del servicio de correo', async () => {
    const lineas: string[] = [];
    const log = pino({ level: 'info' }, new Writable({ write(t, _e, listo) { lineas.push(String(t)); listo(); } }));
    const smtp = crearAdaptadorSmtp(opciones({ sendMail: async () => { throw errorSmtp('EAUTH', 535); } }));
    const error = await smtp.enviar(correo()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorSmtp);
    expect(JSON.stringify(error) + String((error as Error).message) + String((error as Error).stack)).not.toContain(CLAVE_APP);
    expect((error as Error).message).not.toContain('martina');
    const servicio = crearServicioCorreo({ adaptador: smtp, log });
    servicio.enviarEnSegundoPlano(correo());
    await servicio.esperarPendientes();
    const todo = lineas.join('\n');
    expect(todo).toContain('SMTP_535');
    expect(todo).not.toContain(CLAVE_APP);
    expect(todo).not.toContain('martina.fuentes');
    expect(clasificarErrorSmtp({ code: 'ESOCKET' }, 'x').code).toBe('SMTP_RED');
    expect(clasificarErrorSmtp('raro', 'x').code).toBe('SMTP_DESCONOCIDO');
  });

  it('NOT-023 el transporte de nodemailer va con TLS desde el inicio en 465 y STARTTLS obligatorio en 587, con topes de 10 s', () => {
    const t465 = crearTransporteNodemailer({ host: 'smtp.gmail.com', puerto: 465, usuario: 'a@gmail.com', clave: CLAVE_APP }) as unknown as { options: Record<string, unknown> };
    const t587 = crearTransporteNodemailer({ host: 'smtp.gmail.com', puerto: 587, usuario: 'a@gmail.com', clave: CLAVE_APP }) as unknown as { options: Record<string, unknown> };
    const o465 = t465.options ?? (t465 as unknown as { transporter: { options: Record<string, unknown> } }).transporter.options;
    const o587 = t587.options ?? (t587 as unknown as { transporter: { options: Record<string, unknown> } }).transporter.options;
    expect(o465).toMatchObject({ secure: true, requireTLS: false, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 10_000, logger: false });
    expect(o587).toMatchObject({ secure: false, requireTLS: true });
  });
});

describe('Configuración del correo por Gmail', () => {
  const base = { NODE_ENV: 'test', DATABASE_URL: 'postgresql://x@127.0.0.1/y' };
  const prod = { ...base, NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40) };

  it('NOT-024 CORREO_DRIVER=smtp pide SMTP_USUARIO y la clave de aplicación de 16 letras (con o sin espacios)', () => {
    expect(() => leerConfig({ ...base, CORREO_DRIVER: 'smtp' })).toThrow(/SMTP_USUARIO.*SMTP_CLAVE/);
    expect(() => leerConfig({ ...base, CORREO_DRIVER: 'smtp', SMTP_USUARIO: 'a@gmail.com', SMTP_CLAVE: 'MiContraseña2026' })).toThrow(/16 letras/);
    const c = leerConfig({ ...base, CORREO_DRIVER: 'smtp', SMTP_USUARIO: 'gymtrack.avisos@gmail.com', SMTP_CLAVE: 'abcd efgh ijkl mnop' });
    expect(c.correo.smtp).toEqual({ host: 'smtp.gmail.com', puerto: 465, usuario: 'gymtrack.avisos@gmail.com', clave: CLAVE_APP });
    expect(c.correo.remitente).toBe('GymTrack <gymtrack.avisos@gmail.com>');
    expect(() => leerConfig({ ...base, CORREO_DRIVER: 'smtp', SMTP_USUARIO: 'a@gmail.com', SMTP_CLAVE: CLAVE_APP, SMTP_PUERTO: '25' })).toThrow(/SMTP_PUERTO/);
    // Variables vacías del .env cuentan como no definidas.
    expect(leerConfig({ ...base, SMTP_PUERTO: '', SMTP_HOST: '', SMTP_USUARIO: '', SMTP_CLAVE: '' }).correo.driver).toBe('memoria');
  });

  it('NOT-025 en producción se acepta smtp; consola no; el remitente fijado se respeta', () => {
    const c = leerConfig({ ...prod, CORREO_DRIVER: 'smtp', SMTP_USUARIO: 'gymtrack.avisos@gmail.com', SMTP_CLAVE: CLAVE_APP, CORREO_REMITENTE: 'Más <gymtrack.avisos@gmail.com>' });
    expect(c.correo.driver).toBe('smtp');
    expect(c.correo.remitente).toBe('Más <gymtrack.avisos@gmail.com>');
    expect(() => leerConfig({ ...prod, CORREO_DRIVER: 'consola' })).toThrow(/Resend o por SMTP/);
  });

  it('NOT-026 adaptadorDesdeConfig arma el adaptador smtp sin conectarse', () => {
    const c = leerConfig({ ...base, CORREO_DRIVER: 'smtp', SMTP_USUARIO: 'gymtrack.avisos@gmail.com', SMTP_CLAVE: CLAVE_APP });
    const { adaptador, buzon } = adaptadorDesdeConfig(c, pino({ level: 'silent' }));
    expect(adaptador.nombre).toBe('smtp');
    expect(buzon).toBeUndefined();
  });
});
