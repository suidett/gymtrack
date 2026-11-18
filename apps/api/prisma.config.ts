// ─────────────────────────────────────────────────────────────────────────────
// Configuración de Prisma · Zona: Configuración (API)
//
// Qué hace: le dice al CLI de Prisma dónde están el esquema y las migraciones y de dónde sale la
// URL de la base. Prisma 7 ya no lee .env solo: si existe apps/api/.env se carga aquí.
// También dice cómo correr la semilla (`npx prisma db seed`: ejercicios base y consejos).
// Tócalo cuando: muevas el esquema, las migraciones o la semilla de carpeta.
// No lo toques para: la conexión de la API al correr (eso es src/db.ts).
// Depende de: la variable DATABASE_URL. `prisma generate` no la necesita; migrar sí.
// ─────────────────────────────────────────────────────────────────────────────
import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile('.env');
} catch {
  // Sin .env se usan las variables del entorno (CI, Docker).
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'node scripts/construir.mjs && node dist/semilla.js' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
