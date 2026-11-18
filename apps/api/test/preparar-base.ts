// Prepara la base de pruebas una vez por corrida: aplica las migraciones de Prisma. Sin
// DATABASE_URL no hace nada y avisa (las pruebas de integración se saltan solas).
import { execFileSync } from 'node:child_process';

export default function prepararBase() {
  if (!process.env.DATABASE_URL) {
    console.warn(
      '\n[api] AVISO: falta DATABASE_URL. Se saltan las pruebas de integración (INT, SEG con base).\n' +
        '      Para correrlas: pnpm --filter api test:int   (levanta PostgreSQL 16 con Docker)\n',
    );
    return;
  }
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
  });
}
