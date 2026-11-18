# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Imagen de la API y el worker · Zona: Configuración (API)
#
# Qué hace: construye la imagen que corre en el VPS (compose.yml de infra-propuesta): la misma
# imagen para la API (`node dist/servidor.js`, el comando por defecto) y el worker
# (`node dist/worker.js`). Trae el CLI de Prisma y las migraciones para que desplegar.sh corra
# `npx prisma migrate deploy` con esta misma imagen antes de levantar la versión nueva.
# Se construye desde la raíz del monorepo:
#   docker build -f apps/api/Dockerfile --build-arg COMMIT_SHA=$(git rev-parse --short HEAD) -t gymtrack-api .
# Tócalo cuando: cambie la versión de Node, de pnpm o lo que la API necesita al correr.
# No lo toques para: variables de entorno (van en app.env del VPS, nunca en la imagen).
# Depende de: pnpm-lock.yaml, apps/api, packages/shared y packages/tokens.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@12.6.0
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/tokens/package.json packages/tokens/

# ── Construcción: todas las dependencias, prisma generate y esbuild ──────────
FROM base AS construir
RUN pnpm install --frozen-lockfile --filter api...
COPY packages/shared packages/shared
COPY packages/tokens packages/tokens
COPY apps/api apps/api
RUN pnpm --filter api build

# ── Ejecución: solo dependencias de producción ───────────────────────────────
FROM base AS ejecutar
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod --filter api... && pnpm store prune
COPY --from=construir /repo/apps/api/dist apps/api/dist
COPY --from=construir /repo/apps/api/src/generado apps/api/src/generado
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/
ARG COMMIT_SHA=desconocido
ENV COMMIT_SHA=${COMMIT_SHA}
WORKDIR /repo/apps/api
USER node
EXPOSE 3000
CMD ["node", "dist/servidor.js"]
