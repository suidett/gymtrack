#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Pruebas con base · Zona: Pruebas (API)
#
# Qué hace: levanta PostgreSQL 16 con Docker (compose.dev.yml), espera a que esté sano y corre
# toda la suite de Vitest contra la base gymtrack_test (la vacía antes de cada caso).
#   pnpm --filter api test:int
# Si ya tienes una base, define DATABASE_URL y corre `pnpm --filter api test` directo.
# Depende de: Docker y apps/api/compose.dev.yml.
# ─────────────────────────────────────────────────────────────────────────────
set -eu
cd "$(dirname "$0")/.."
docker compose -f compose.dev.yml up -d --wait db
export DATABASE_URL="${DATABASE_URL:-postgresql://gymtrack:gymtrack@127.0.0.1:5442/gymtrack_test}"
npx prisma generate >/dev/null
npx vitest run "$@"
