// ─────────────────────────────────────────────────────────────────────────────
// Avisos desde el worker · Zona: Worker (API)
//
// Qué hace: arma para el worker el mismo servicio de avisos que usa la API (Expo, Web Push y el
// correo que pida CORREO_DRIVER, con Gmail incluido), con su propio logger, y lo cierra al
// terminar esperando lo que quedó en camino. Lo usan las tareas `recordatorios` (cada 5 minutos)
// y `noche` (el correo con las alertas nuevas para cada entrenador).
// Tócalo cuando: el worker necesite otra pieza para avisar.
// No lo toques para: a quién y cuándo se avisa (src/modulos/notificaciones).
// Depende de: src/config.ts, src/correo y src/modulos/notificaciones/fabrica.ts.
// ─────────────────────────────────────────────────────────────────────────────
import Fastify, { type FastifyBaseLogger } from 'fastify';
import type { Config } from '../config';
import { adaptadorDesdeConfig, crearServicioCorreo } from '../correo';
import type { BaseDeDatos } from '../db';
import { armarServicioAvisos } from '../modulos/notificaciones/fabrica';
import type { ServicioAvisos } from '../modulos/notificaciones/servicio';
import type { Reloj } from '../reloj';

let logDelWorker: FastifyBaseLogger | undefined;

export interface AvisosDelWorker {
  avisos: ServicioAvisos;
  /** Espera los push y los correos en curso. */
  cerrar(): Promise<void>;
}

export function prepararAvisosDelWorker(
  config: Config,
  prisma: BaseDeDatos,
  reloj: Reloj,
  env: Record<string, string | undefined> = process.env,
): AvisosDelWorker {
  // El logger de Fastify (pino) sin servidor: las mismas líneas JSON que la API. Uno por proceso:
  // el worker residente corre los recordatorios cada 5 minutos y no tiene por qué juntar loggers.
  const log = (logDelWorker ??= Fastify({ logger: { level: config.nivelLog } }).log);
  const { adaptador, buzon } = adaptadorDesdeConfig(config, log);
  const correo = crearServicioCorreo({ adaptador, buzon, log });
  const avisos = armarServicioAvisos({
    prisma, reloj, jwtSecreto: config.jwtSecreto, env, log, enviarCorreo: (c) => correo.enviarEnSegundoPlano(c),
  });
  return {
    avisos,
    async cerrar() {
      await avisos.esperar();
      await correo.esperarPendientes();
    },
  };
}
