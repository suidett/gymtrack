// ─────────────────────────────────────────────────────────────────────────────
// Punto de entrada del worker · Zona: Worker (API)
//
// Qué hace: corre las tareas de src/worker/ (detección nocturna de estancamiento, baja y días sin
// entrenar; purga de cuentas borradas hace 30 días, P-24). Tiene dos formas de correr:
//   node dist/worker.js noche | deteccion | purga | recordatorios [--ahora=<ISO>]   una vez (cron)
//   node dist/worker.js                                              residente (compose)
// Residente se queda vivo (así Docker no lo reinicia en bucle) y corre `noche` todos los días a
// las 07:00 UTC (04:00 en Chile en horario de verano, 03:00 en invierno) y `recordatorios` cada
// 5 minutos en punto (:00, :05, :10...), sin pisarse si una corrida se demora. Se apaga limpio
// con SIGTERM. --ahora solo se acepta fuera de producción (SEG-032).
// Falta (anotado en docs/ESTADO-DEL-CODIGO.md): el latido a HC_WORKER_URL.
// Tócalo cuando: cambie la hora de la corrida residente o la forma de arrancar.
// No lo toques para: qué hace cada tarea (src/worker/tareas.ts).
// Depende de: src/worker/principal.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { principal } from './worker/principal';

const HORA_UTC = 7;
const DIA_MS = 86_400_000;
const RECORDATORIOS_MS = 5 * 60_000;

const argumentos = process.argv.slice(2);

if (argumentos.length > 0) {
  process.exit(await principal(argumentos));
} else {
  const ahora = new Date();
  const proxima = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate(), HORA_UTC));
  if (proxima.getTime() <= ahora.getTime()) proxima.setTime(proxima.getTime() + DIA_MS);
  console.log(JSON.stringify({ level: 30, msg: 'worker residente', proxima_corrida: proxima.toISOString() }));

  let intervalo: ReturnType<typeof setInterval> | undefined;
  const correr = () => {
    void principal(['noche']);
  };
  const espera = setTimeout(() => {
    correr();
    intervalo = setInterval(correr, DIA_MS);
  }, proxima.getTime() - ahora.getTime());

  // Recordatorios (P-21): cada 5 minutos alineados al reloj, uno a la vez.
  let recordando = false;
  let cadaCinco: ReturnType<typeof setInterval> | undefined;
  const recordar = () => {
    if (recordando) return;
    recordando = true;
    void principal(['recordatorios']).finally(() => {
      recordando = false;
    });
  };
  const alinear = setTimeout(() => {
    recordar();
    cadaCinco = setInterval(recordar, RECORDATORIOS_MS);
  }, RECORDATORIOS_MS - (ahora.getTime() % RECORDATORIOS_MS));

  const apagar = () => {
    clearTimeout(espera);
    clearTimeout(alinear);
    if (intervalo) clearInterval(intervalo);
    if (cadaCinco) clearInterval(cadaCinco);
    process.exit(0);
  };
  process.on('SIGTERM', apagar);
  process.on('SIGINT', apagar);
}
