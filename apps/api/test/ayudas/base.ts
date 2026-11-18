// ─────────────────────────────────────────────────────────────────────────────
// Base de prueba: vaciar y sembrar · Zona: Pruebas (API)
//
// Qué hace: deja la base de pruebas como recién migrada: vacía TODAS las tablas de la app (las que
// existan hoy y las que vengan, sin lista a mano; nunca _prisma_migrations) y vuelve a cargar la
// semilla (los 67 ejercicios base y los consejos), con los mismos ids fijos de siempre.
// Tócalo cuando: toda prueba necesite partir con algo más en la base.
// No lo toques para: los datos de una prueba (créalos en la prueba o con personas.ts).
// Depende de: src/compartido/semilla.ts y la base de DATABASE_URL.
// ─────────────────────────────────────────────────────────────────────────────
import { sembrarBase } from '../../src/compartido/semilla';
import type { BaseDeDatos } from '../../src/db';

/** TRUNCATE de todas las tablas de public menos _prisma_migrations. SQL fijo, sin texto de afuera. */
export async function limpiarBase(prisma: BaseDeDatos): Promise<void> {
  await prisma.$executeRaw`
    DO $$
    DECLARE tablas text;
    BEGIN
      SELECT string_agg(format('%I', tablename), ', ') INTO tablas
        FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';
      IF tablas IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE ' || tablas || ' RESTART IDENTITY CASCADE';
      END IF;
    END $$;
  `;
}

/** Vacía y siembra: la base queda con la biblioteca base y los consejos, y nada más. */
export async function reiniciarBase(prisma: BaseDeDatos): Promise<void> {
  await limpiarBase(prisma);
  await sembrarBase(prisma);
}

export { sembrarBase };
