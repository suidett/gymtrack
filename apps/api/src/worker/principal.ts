// ─────────────────────────────────────────────────────────────────────────────
// Arranque de las tareas del worker · Zona: Worker (API)
//
// Qué hace: lo que corre el cron: lee la configuración y los argumentos, abre la base, corre la
// tarea pedida (./tareas.ts), escribe una línea de log JSON con los conteos y cierra. Termina con
// código 1 si la configuración o los argumentos están mal, o si alguna cuenta quedó pendiente de
// purga, para que el cron lo marque.
//   node dist/worker.js noche                       (cada noche)
//   node dist/worker.js purga --ahora=2026-12-17T03:00:00Z   (solo fuera de producción)
//   node dist/worker.js recordatorios                (cada 5 minutos)
// Las tareas que avisan (noche, deteccion, recordatorios) reciben el servicio de avisos
// (./avisos.ts) y el worker espera los push y los correos antes de cerrar.
// El reloj: --ahora, si no RELOJ_FIJO (prohibido en producción por src/config.ts), si no la hora real.
// Tócalo cuando: cambie cómo arranca el worker.
// No lo toques para: qué hace cada tarea (./tareas.ts).
// Depende de: src/config.ts, src/db.ts, ./avisos y ./tareas.
// ─────────────────────────────────────────────────────────────────────────────
import { leerConfig } from '../config';
import { crearPrisma } from '../db';
import { leerConfigAvisos } from '../modulos/notificaciones/config';
import { prepararAvisosDelWorker, type AvisosDelWorker } from './avisos';
import { correrTarea, leerArgumentos, TAREAS_CON_AVISOS } from './tareas';

const escribir = (nivel: number, o: Record<string, unknown>) => console.log(JSON.stringify({ level: nivel, ...o }));

/** Corre una tarea y devuelve el código de salida. */
export async function principal(argv: readonly string[], env: Record<string, string | undefined> = process.env): Promise<number> {
  let config;
  let args;
  try {
    config = leerConfig(env);
    args = leerArgumentos(argv, config.entorno);
    // Una llave VAPID mal copiada se ve aquí, con su motivo, y no a mitad de la corrida.
    if (TAREAS_CON_AVISOS.includes(args.tarea)) leerConfigAvisos(env);
  } catch (e) {
    escribir(50, { msg: 'worker no arranca', motivo: e instanceof Error ? e.message : String(e) });
    return 1;
  }
  const ahora = args.ahora ?? (config.relojFijo ? new Date(config.relojFijo) : new Date());
  const prisma = crearPrisma(config.databaseUrl);
  let avisos: AvisosDelWorker | undefined;
  try {
    if (TAREAS_CON_AVISOS.includes(args.tarea)) avisos = prepararAvisosDelWorker(config, prisma, { ahora: () => new Date(ahora) }, env);
    const r = await correrTarea(prisma, args.tarea, ahora, { log: (o) => escribir(30, o), avisos: avisos?.avisos });
    await avisos?.cerrar();
    escribir(30, { msg: 'worker terminó', version: config.version, ...r });
    return r.purga && r.purga.pendientes > 0 ? 1 : 0;
  } catch (e) {
    escribir(50, { msg: 'worker falló', tarea: args.tarea, error: e instanceof Error ? e.name : 'Error' });
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}
