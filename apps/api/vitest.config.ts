// ─────────────────────────────────────────────────────────────────────────────
// Configuración de Vitest · Zona: Configuración (API)
//
// Qué hace: corre las pruebas de test/. Las de integración usan una sola base (DATABASE_URL) y la
// vacían antes de cada caso, por eso los archivos corren uno detrás de otro. Si no hay
// DATABASE_URL, las de integración se saltan con un aviso y las demás (contrato, correo,
// configuración, límites) corren igual: así `pnpm test` pasa en un CI sin base.
// Tócalo cuando: separes proyectos (integración, worker) o agregues cobertura.
// No lo toques para: preparar la base (test/preparar-base.ts).
// Depende de: vitest.
// ─────────────────────────────────────────────────────────────────────────────
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/preparar-base.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: { NODE_ENV: 'test', TZ: 'UTC', LOG_LEVEL: 'info' },
  },
});
