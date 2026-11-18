// ─────────────────────────────────────────────────────────────────────────────
// Punto de entrada del worker · Zona: Worker (API)
//
// Qué hace: HOY NADA. Deja creado el proceso que en la imagen corre como `node dist/worker.js`
// (compose.yml lo levanta junto a la API, con la misma imagen). Se queda vivo sin tareas y se
// apaga limpio con SIGTERM, así Docker no lo reinicia en bucle.
// Lo que va a hacer (PRD §Arquitectura y plan de validación, sección WRK), en tareas separadas
// dentro de src/worker/:
//   - detección nocturna de estancamiento y de baja de rendimiento (umbrales por entorno, P-34);
//   - recordatorios al alumno a su hora habitual (P-21) con tope de 2 push al día (P-20);
//   - purga de cuentas marcadas para borrado hace 30 días (P-24), con `purga --ahora=<ISO>`
//     solo fuera de producción (SEG-032, P-52);
//   - latido opcional a HC_WORKER_URL al terminar la noche.
// Cada tarea recibe el «ahora» por parámetro (src/reloj.ts) para probarla con reloj fijo.
// Tócalo cuando: implementes la primera tarea (y su prueba WRK-).
// No lo toques para: lógica de la API (src/app.ts).
// Depende de: src/config.ts (cuando haya tareas usará también src/db.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { leerConfig } from './config';

const config = leerConfig();
console.log(JSON.stringify({ level: 30, msg: 'worker sin tareas todavía', version: config.version }));

const latido = setInterval(() => {}, 60 * 60 * 1000);
function apagar() {
  clearInterval(latido);
  process.exit(0);
}
process.on('SIGTERM', apagar);
process.on('SIGINT', apagar);
