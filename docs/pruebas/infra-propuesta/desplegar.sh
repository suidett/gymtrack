#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Despliegue y vuelta atrás de un entorno en el VPS · BORRADOR
#
# Uso (lo llama puerta-ssh.sh cuando GitHub Actions entra por SSH):
#   desplegar.sh desplegar <staging|produccion> <sha-xxxxxxx|v1.2.3>   lee por stdin un token de GHCR
#   desplegar.sh volver    <staging|produccion>
#   desplegar.sh estado    <staging|produccion>
#   desplegar.sh purgar    staging <2026-12-17T13:00:00Z>   purga del worker con el reloj adelantado
#
# Desplegar:
#   1. baja la imagen nueva de GHCR con el token de un solo uso del job de GitHub
#   2. en producción, toma un respaldo antes de migrar (respaldar.sh predespliegue)
#   3. corre las migraciones de Prisma con la imagen nueva; si fallan, no cambia nada
#   4. levanta la API y el worker con la versión nueva
#   5. espera hasta 2 minutos a que /health, pasando por Caddy, responda 200 con esa versión
#   6. si no responde, vuelve sola a la versión que estaba y termina con error
#
# Las migraciones no se deshacen: volver atrás cambia el código, no el esquema.
# Por eso los cambios que borran o renombran van en dos versiones (ci.md).
#
# Va en /opt/gymtrack/bin/desplegar.sh, dueño root, permisos 755.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ACCION=${1:?accion}
ENTORNO=${2:?entorno}
VERSION_NUEVA=${3:-}

BASE=/opt/gymtrack
DIR="$BASE/$ENTORNO"
# vps.env trae DOMINIO e IMAGEN (ghcr.io/<dueño>/gymtrack-api, en minúsculas).
# shellcheck source=/dev/null
source "$BASE/vps.env"
export IMAGEN

case "$ENTORNO" in
  produccion) HOST="api.$DOMINIO" ;;
  staging)    HOST="api-staging.$DOMINIO" ;;
  *) echo "entorno desconocido: $ENTORNO" >&2; exit 2 ;;
esac
PROYECTO="gymtrack-$ENTORNO"

compose() {
  docker compose -p "$PROYECTO" \
    -f "$BASE/app/compose.yml" -f "$BASE/app/compose.$ENTORNO.yml" "$@"
}

# Nunca dos despliegues del mismo entorno a la vez.
exec 9>"$DIR/.bloqueo"
flock -w 600 9 || { echo "hay otro despliegue de $ENTORNO en curso" >&2; exit 1; }

ACTUAL=$(cat "$DIR/.version" 2>/dev/null || true)
ANTERIOR=$(cat "$DIR/.version-anterior" 2>/dev/null || true)

# /health por Caddy y con el certificado real, sin salir del servidor.
# PENDIENTE (propuesta de INF-01): que /health responda {"estado":"ok","version":"<VERSION>"}.
salud() {
  local esperada=$1 cuerpo
  for _ in $(seq 1 24); do
    if cuerpo=$(curl -fsS -m 5 --resolve "$HOST:443:127.0.0.1" "https://$HOST/health"); then
      if grep -q "\"version\":\"$esperada\"" <<<"$cuerpo"; then return 0; fi
    fi
    sleep 5
  done
  return 1
}

# Deja en el servidor solo las imágenes que están en uso o sirven para volver atrás.
limpiar_imagenes() {
  local conservar tag
  conservar=$(cat "$BASE"/staging/.version "$BASE"/staging/.version-anterior \
                  "$BASE"/produccion/.version "$BASE"/produccion/.version-anterior 2>/dev/null | sort -u)
  docker images "$IMAGEN" --format '{{.Tag}}' | while read -r tag; do
    grep -qx "$tag" <<<"$conservar" || docker rmi "$IMAGEN:$tag" >/dev/null 2>&1 || true
  done
  docker image prune -f >/dev/null
}

case "$ACCION" in
  desplegar)
    [[ "$VERSION_NUEVA" =~ ^(sha-[0-9a-f]{7,40}|v[0-9]+\.[0-9]+\.[0-9]+)$ ]] \
      || { echo "versión inválida: $VERSION_NUEVA" >&2; exit 2; }
    if [ "$ENTORNO" = produccion ] && [[ ! "$VERSION_NUEVA" =~ ^v ]]; then
      echo "a producción solo van versiones etiquetadas (v1.2.3)" >&2; exit 2
    fi

    # 1. Imagen. El token llega por stdin, vale solo mientras dura el job y no se guarda.
    TOKEN=$(cat)
    trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT
    printf '%s' "$TOKEN" | docker login ghcr.io -u gymtrack-ci --password-stdin >/dev/null
    docker pull --quiet "$IMAGEN:$VERSION_NUEVA"
    docker logout ghcr.io >/dev/null

    # La base tiene que estar arriba antes de migrar (también en la primera instalación).
    VERSION="$VERSION_NUEVA" compose up -d --wait db

    # 2. Respaldo previo a la migración, solo en producción.
    if [ "$ENTORNO" = produccion ]; then
      sudo "$BASE/bin/respaldar.sh" produccion predespliegue "$VERSION_NUEVA"
    fi

    # 3. Migraciones con la imagen nueva. Si fallan, la versión actual sigue atendiendo.
    #    Prisma corre cada migración en una transacción; una fallida queda anotada en
    #    _prisma_migrations y hay que resolverla a mano (runbook en el documento).
    if ! VERSION="$VERSION_NUEVA" compose run --rm --no-deps api npx prisma migrate deploy; then
      echo "::error::la migración falló; $ENTORNO sigue en ${ACTUAL:-ninguna}" >&2
      exit 1
    fi

    # 4 y 5. Cambiar de versión y comprobar.
    VERSION="$VERSION_NUEVA" compose up -d --wait --wait-timeout 120 api worker || true
    if salud "$VERSION_NUEVA"; then
      if [ -n "$ACTUAL" ] && [ "$ACTUAL" != "$VERSION_NUEVA" ]; then
        echo "$ACTUAL" > "$DIR/.version-anterior"
      fi
      echo "$VERSION_NUEVA" > "$DIR/.version"
      limpiar_imagenes
      echo "OK $ENTORNO en $VERSION_NUEVA (antes ${ACTUAL:-ninguna})"
      exit 0
    fi

    # 6. Vuelta atrás automática.
    echo "::error::/health no respondió con $VERSION_NUEVA; vuelvo a ${ACTUAL:-ninguna}" >&2
    if [ -n "$ACTUAL" ]; then
      VERSION="$ACTUAL" compose up -d --wait --wait-timeout 120 api worker || true
      salud "$ACTUAL" || echo "::error::la versión anterior tampoco responde: revisa a mano" >&2
    fi
    exit 1
    ;;

  volver)
    [ -n "$ANTERIOR" ] || { echo "no hay versión anterior anotada" >&2; exit 1; }
    docker image inspect "$IMAGEN:$ANTERIOR" >/dev/null 2>&1 \
      || { echo "la imagen $ANTERIOR ya no está en el servidor" >&2; exit 1; }
    VERSION="$ANTERIOR" compose up -d --wait --wait-timeout 120 api worker || true
    salud "$ANTERIOR" || { echo "::error::$ANTERIOR no respondió /health" >&2; exit 1; }
    echo "$ACTUAL" > "$DIR/.version-anterior"
    echo "$ANTERIOR" > "$DIR/.version"
    echo "OK $ENTORNO volvió a $ANTERIOR (quitada: $ACTUAL)."
    echo "Las migraciones de $ACTUAL siguen aplicadas: si no eran compatibles hacia atrás, mira el runbook."
    ;;

  purgar)
    # Solo staging: corre la purga del worker con el reloj adelantado (SEG-017 en version.yml).
    # Reemplaza al «railway run --service worker ... purga --ahora=<ISO>» del diseño anterior.
    [ "$ENTORNO" = staging ] || { echo "la purga adelantada solo corre en staging" >&2; exit 2; }
    AHORA=$VERSION_NUEVA
    [[ "$AHORA" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]] \
      || { echo "fecha inválida, usa 2026-12-17T13:00:00Z" >&2; exit 2; }
    # PENDIENTE: confirmar el subcomando real del worker.
    VERSION="$ACTUAL" compose run --rm --no-deps worker node dist/worker.js purga --ahora="$AHORA"
    ;;

  estado)
    echo "entorno:  $ENTORNO"
    echo "actual:   ${ACTUAL:-ninguna}"
    echo "anterior: ${ANTERIOR:-ninguna}"
    VERSION="${ACTUAL:-ninguna}" compose ps --format 'table {{.Service}}\t{{.Status}}'
    curl -fsS -m 5 --resolve "$HOST:443:127.0.0.1" "https://$HOST/health" || echo "/health no responde"
    ;;

  *)
    echo "acción desconocida: $ACCION" >&2; exit 2 ;;
esac
