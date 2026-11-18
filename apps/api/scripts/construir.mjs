// ─────────────────────────────────────────────────────────────────────────────
// Build de la API · Zona: Configuración (API)
//
// Qué hace: empaqueta src/servidor.ts, src/worker.ts y prisma/semilla.ts con esbuild en
// dist/servidor.js, dist/worker.js y dist/semilla.js (ESM, Node 22). Mete adentro el código
// propio, el cliente generado de Prisma y los paquetes del monorepo (@gymtrack/shared y
// @gymtrack/tokens, que se publican como TypeScript); deja afuera las dependencias de npm, que la
// imagen instala con pnpm. Fija en __MODULOS_API__ la lista de carpetas de src/modulos: en el
// bundle no hay carpetas que leer, y esbuild empaqueta cada src/modulos/<nombre>/index.ts por el
// import con plantilla de src/compartido/modulos.ts.
// Tócalo cuando: agregues otro punto de entrada.
// No lo toques para: el Dockerfile (apps/api/Dockerfile).
// Depende de: esbuild y el cliente generado (`prisma generate` corre antes en `pnpm build`).
// ─────────────────────────────────────────────────────────────────────────────
import { build } from 'esbuild';
import { existsSync, readdirSync } from 'node:fs';

const internos = /^(\.|\/|@gymtrack\/)/;

// Las mismas reglas que nombresDeModulos() en src/compartido/modulos.ts.
const modulos = readdirSync('src/modulos', { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
  .filter((d) => existsSync(`src/modulos/${d.name}/index.ts`))
  .map((d) => d.name)
  .sort();

await build({
  entryPoints: { servidor: 'src/servidor.ts', worker: 'src/worker.ts', semilla: 'prisma/semilla.ts' },
  define: { __MODULOS_API__: JSON.stringify(modulos) },
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
