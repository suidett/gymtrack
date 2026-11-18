// ─────────────────────────────────────────────────────────────────────────────
// Semilla desde la consola · Zona: Datos (API)
//
// Qué hace: carga en la base de DATABASE_URL los 67 ejercicios base y los consejos de los
// motivos de baja (src/compartido/semilla.ts). Es idempotente y actualiza los que ya estaban.
//   pnpm --filter api db:sembrar          # local, después de db:migrar
//   npx prisma db seed                    # lo mismo, por la configuración de Prisma
//   node dist/semilla.js                  # en la imagen, después de `prisma migrate deploy`
// Corre empaquetado con esbuild (dist/semilla.js), no con tsx: tsx lee packages/shared como
// CommonJS y no encuentra sus exportaciones con nombre.
// Tócalo cuando: cambie cómo se llama la semilla desde la consola.
// No lo toques para: el contenido (src/compartido/semilla.ts y packages/shared).
// Depende de: src/config.ts, src/db.ts y src/compartido/semilla.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { sembrarBase } from '../src/compartido/semilla';
import { leerConfig } from '../src/config';
import { crearPrisma } from '../src/db';

const config = leerConfig();
const prisma = crearPrisma(config.databaseUrl);
try {
  const r = await sembrarBase(prisma, { actualizar: true });
  console.log(`[semilla] ${r.ejercicios} ejercicios base y ${r.consejos} consejos listos`);
} finally {
  await prisma.$disconnect();
}
