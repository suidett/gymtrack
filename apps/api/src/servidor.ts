// ─────────────────────────────────────────────────────────────────────────────
// Punto de entrada de la API · Zona: Configuración (API)
//
// Qué hace: lee la configuración, abre la base, arma la API y escucha en PORT (3000 por defecto).
// Al recibir SIGTERM o SIGINT (docker stop, Ctrl+C) deja de aceptar pedidos, espera los correos
// en curso y cierra la base. En la imagen corre como `node dist/servidor.js`.
// Tócalo cuando: cambie cómo arranca o se apaga el proceso.
// No lo toques para: agregar rutas (src/app.ts).
// Depende de: src/config.ts, src/db.ts y src/app.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { construirApp } from './app';
import { leerConfig } from './config';
import { crearPrisma } from './db';

const config = leerConfig();
const prisma = crearPrisma(config.databaseUrl);
const app = await construirApp({ config, prisma });

let cerrando = false;
async function apagar(senal: string) {
  if (cerrando) return;
  cerrando = true;
  app.log.info({ senal }, 'apagando la API');
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', () => void apagar('SIGTERM'));
process.on('SIGINT', () => void apagar('SIGINT'));

await app.listen({ port: config.puerto, host: config.host });
app.log.info({ version: config.version, commit: config.commit, correo: config.correo.driver }, 'API lista');
