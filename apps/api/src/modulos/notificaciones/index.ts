// ─────────────────────────────────────────────────────────────────────────────
// Módulo notificaciones · Zona: Notificaciones (API)
//
// Qué hace: las rutas de los avisos al celular y el servicio que usan los otros módulos:
//   POST   /notificaciones/dispositivos       registra el token de Expo (app Android) o la
//                                             suscripción push web (app web del iPhone) de quien
//                                             llama: 201 la primera vez, 200 si ya estaba.
//   DELETE /notificaciones/dispositivos/:id   lo borra (lo ajeno da 404).
//   POST   /notificaciones/prueba             le manda un aviso a quien llama, por push y, si pide
//                                             `correo: true`, también por correo. En producción
//                                             solo el entrenador (al alumno, 403); fuera de
//                                             producción, cualquiera. Hasta 10 por hora por persona.
// Al registrarse arma el servicio de avisos (./fabrica.ts) y lo deja en el contexto para que
// sesiones y rutinas avisen (./eventos.ts). Al cerrar la API espera los avisos en curso.
// Tócalo cuando: agregues o cambies una ruta de avisos.
// No lo toques para: cuándo sale un aviso (./eventos.ts, ./recordatorios.ts), el tope
// (./servicio.ts) ni la forma de la entrada y la salida (packages/shared/src/api/notificaciones.ts).
// Depende de: src/compartido, ./fabrica, ./eventos, ./textos y @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { RUTAS_NOTIFICACIONES as R } from '@gymtrack/shared';
import { randomUUID } from 'node:crypto';
import { definirModulo, ErrorApi, esquemaDe, noEncontrado, prohibido, urlDe, usuarioDe } from '../../compartido';
import { instalarAvisos } from './eventos';
import { armarServicioAvisos } from './fabrica';
import { avisoPrueba, correoPrueba } from './textos';

/** Pruebas por persona: suficiente para la demostración, no para llenarle el teléfono a nadie. */
export const LIMITE_PRUEBAS = { maximo: 10, ventanaMs: 3_600_000 } as const;

export default definirModulo(async (app, ctx) => {
  const avisos = armarServicioAvisos({
    prisma: ctx.prisma,
    reloj: ctx.reloj,
    jwtSecreto: ctx.config.jwtSecreto,
    enviarCorreo: (c) => ctx.correo.enviarEnSegundoPlano(c),
    log: app.log,
  });
  instalarAvisos(ctx, avisos);
  app.addHook('onClose', async () => {
    await avisos.esperar();
  });
  const limitePruebas = ctx.crearLimitador('notificaciones.prueba', LIMITE_PRUEBAS);

  // ── Dispositivos ───────────────────────────────────────────────────────────
  const esquemaRegistrar = esquemaDe(R.registrarDispositivo);
  app.post(urlDe(R.registrarDispositivo), {
    schema: { ...esquemaRegistrar, response: { ...esquemaRegistrar.response, 200: R.registrarDispositivo.respuesta } },
    preHandler: app.exigirSesion,
  }, async (req, reply) => {
    const { nuevo, dispositivo } = await avisos.dispositivos.guardar(usuarioDe(req).id, req.body);
    return reply.code(nuevo ? 201 : 200).send(dispositivo);
  });

  app.delete(urlDe(R.borrarDispositivo), { schema: esquemaDe(R.borrarDispositivo), preHandler: app.exigirSesion }, async (req) => {
    if (!(await avisos.dispositivos.borrar(usuarioDe(req).id, req.params.id))) noEncontrado();
    return { borrado: true as const };
  });

  // ── Prueba ─────────────────────────────────────────────────────────────────
  app.post(urlDe(R.prueba), { schema: esquemaDe(R.prueba), preHandler: app.exigirSesion }, async (req) => {
    const usuario = usuarioDe(req);
    if (ctx.config.entorno === 'production' && usuario.rol !== 'trainer') prohibido();
    const intento = limitePruebas.intentar(usuario.id);
    // Con Retry-After, como el ingreso: la app sabe cuánto esperar (P-42).
    if (!intento.permitido) throw new ErrorApi('RATE_LIMITED', { reintentar_en_s: intento.reintentarEnS }, undefined, intento.reintentarEnS);
    const conCorreo = req.body?.correo === true;
    const r = await avisos.enviar({
      tipo: 'prueba',
      clave: `prueba:${usuario.id}:${randomUUID()}`,
      para: usuario,
      push: avisoPrueba(),
      correo: conCorreo ? correoPrueba(usuario, avisos.config.urlApp) : null,
      cuentaTope: false,
    });
    return {
      dispositivos: r.push.dispositivos,
      enviados: r.push.enviados,
      invalidos: r.push.invalidos,
      fallidos: r.push.fallidos,
      correo: r.correo,
      resultados: r.push.resultados.map((x) => ({
        dispositivo_id: x.dispositivo.id, tipo: x.dispositivo.tipo, plataforma: x.dispositivo.plataforma, resultado: x.resultado,
      })),
    };
  });
});
