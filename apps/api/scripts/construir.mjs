// ─────────────────────────────────────────────────────────────────────────────
// Build de la API · Zona: Configuración (API)
//
// Qué hace: empaqueta src/servidor.ts y src/worker.ts con esbuild en dist/servidor.js y
// dist/worker.js (ESM, Node 22). Mete adentro el código propio, el cliente generado de Prisma y
// los paquetes del monorepo (@gymtrack/shared y @gymtrack/tokens, que se publican como
// TypeScript); deja afuera las dependencias de npm, que la imagen instala con pnpm.
// Tócalo cuando: agregues otro punto de entrada.
// No lo toques para: el Dockerfile (apps/api/Dockerfile).
// Depende de: esbuild y el cliente generado (`prisma generate` corre antes en `pnpm build`).
// ─────────────────────────────────────────────────────────────────────────────
import { build } from 'esbuild';

const internos = /^(\.|\/|@gymtrack\/)/;

await build({
  entryPoints: { servidor: 'src/servidor.ts', worker: 'src/worker.ts' },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  logLevel: 'info',
  plugins: [
    {
      name: 'externos-de-npm',
      setup(b) {
        b.onResolve({ filter: /.*/ }, (args) => {
          if (args.kind === 'entry-point' || internos.test(args.path) || args.path.startsWith('node:')) return undefined;
          return { path: args.path, external: true };
        });
      },
    },
  ],
  // Algunas dependencias CJS usan require(): se lo damos al ESM empaquetado.
  banner: { js: "import { createRequire as __crearRequire } from 'node:module'; const require = __crearRequire(import.meta.url);" },
});
