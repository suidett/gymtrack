#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Restauración de prueba semanal · BORRADOR
#
# Uso: sudo restaurar-prueba.sh   (lee por stdin la llave privada de age)
# Lo dispara respaldo-vps.yml los lunes por SSH (puerta-ssh.sh, alcance «respaldo»).
#
# Qué hace:
#   1. Recibe la llave privada por stdin y la deja en /dev/shm (memoria), nunca en disco.
#   2. Toma el último respaldo DIARIO de producción desde Cloud Storage, no la copia
#      local: así se prueba la copia de afuera, que es la que importa si el VPS muere.
#   3. Levanta un PostgreSQL 16 temporal sin red y con 256 MB como máximo. Si el
#      servidor tiene menos de 450 MB libres, pausa la API y el worker de staging.
#   4. Baja, descifra y restaura en un solo flujo: nada descifrado se escribe fuera
#      del contenedor temporal.
#   5. Cuenta filas por tabla en la base restaurada y en producción, y mide cuánto tardó.
#   6. Borra el contenedor y su volumen, la llave y lo temporal, y vuelve a levantar staging.
#
# La salida es una tabla en Markdown con conteos (sin datos de personas) para el
# resumen del job, y una línea en /var/log/gymtrack/restauraciones.log (fecha,
# archivo, duración, resultado), que es el registro de MAN-024.
#
# Va en /opt/gymtrack/bin/restaurar-prueba.sh, dueño root, permisos 755.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
umask 077

CONF=/etc/gymtrack/respaldo
# shellcheck source=/dev/null
source "$CONF/respaldo.env"
export RCLONE_CONFIG="$CONF/rclone.conf"
REMOTO="gcs:$BUCKET_RESPALDOS"
REGISTRO=/var/log/gymtrack/restauraciones.log
mkdir -p "$(dirname "$REGISTRO")"

# PENDIENTE: nombres reales de las tablas de §Datos cuando exista el esquema de Prisma.
TABLAS="users routines workout_sessions workout_sets personal_records body_metrics progress_photos alerts _prisma_migrations"

INICIO=$(date -u +%s)
TEMPORAL=$(mktemp -d /dev/shm/restauracion.XXXXXX)
CONTENEDOR="gymtrack-restauracion-$$"
PAUSADOS=""
RESULTADO="fallo"
ULTIMO="ninguno"

limpiar() {
  docker rm -f -v "$CONTENEDOR" >/dev/null 2>&1 || true   # -v: borra también el volumen anónimo con los datos
  rm -rf "$TEMPORAL"
  if [ -n "$PAUSADOS" ]; then docker start $PAUSADOS >/dev/null || true; fi
  echo "$(date -u +%FT%TZ) archivo=$ULTIMO duracion_s=$(( $(date -u +%s) - INICIO )) resultado=$RESULTADO" >> "$REGISTRO"
}
trap limpiar EXIT

# 1. Llave privada.
cat > "$TEMPORAL/llave.txt"
grep -q '^AGE-SECRET-KEY-' "$TEMPORAL/llave.txt" || { echo "no llegó una llave de age por stdin" >&2; exit 1; }

# 2. Último diario de producción.
ULTIMO=$(rclone lsf "$REMOTO/produccion/diario/" --files-only | sort | tail -n1)
[ -n "$ULTIMO" ] || { echo "no hay respaldos diarios de producción" >&2; exit 1; }

# 3. Memoria.
LIBRE_MB=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
if [ "$LIBRE_MB" -lt 450 ]; then
  PAUSADOS=$(docker ps -q -f label=com.docker.compose.project=gymtrack-staging \
    | xargs -r docker inspect -f '{{.Id}} {{index .Config.Labels "com.docker.compose.service"}}' \
    | awk '$2=="api"||$2=="worker"{print $1}' | tr '\n' ' ')
  [ -z "$PAUSADOS" ] || docker stop $PAUSADOS >/dev/null
fi

# Base temporal: sin red, sin puertos, con límite de memoria. fsync apagado porque es desechable.
docker run -d --name "$CONTENEDOR" --network none --memory 256m --memory-swap 256m \
  -e POSTGRES_PASSWORD=temporal -e POSTGRES_DB=restaurada \
  postgres:16-alpine -c shared_buffers=32MB -c fsync=off >/dev/null   # PENDIENTE: misma etiqueta exacta que compose.yml
for _ in $(seq 1 30); do
  docker exec "$CONTENEDOR" pg_isready -U postgres -d restaurada >/dev/null 2>&1 && break
  sleep 2
done

# 4. Bajar, descifrar y restaurar.
rclone cat "$REMOTO/produccion/diario/$ULTIMO" \
  | age -d -i "$TEMPORAL/llave.txt" \
  | docker exec -i "$CONTENEDOR" pg_restore -U postgres -d restaurada --no-owner --exit-on-error

# 5. Conteos.
PRODUCCION=$(docker ps -q -f label=com.docker.compose.project=gymtrack-produccion -f label=com.docker.compose.service=db)
contar_restaurada() { docker exec "$CONTENEDOR" psql -U postgres -d restaurada -Atc "select count(*) from \"$1\""; }
contar_produccion() { docker exec "$PRODUCCION" sh -c "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -Atc 'select count(*) from \"$1\"'"; }

AVISOS=0
echo "### Restauración de prueba"
echo
echo "Respaldo: \`$ULTIMO\`"
echo
echo "| Tabla | Restaurada | Producción hoy | Diferencia |"
echo "| --- | ---: | ---: | ---: |"
for t in $TABLAS; do
  r=$(contar_restaurada "$t")
  p=$(contar_produccion "$t")
  d=$(( p - r ))
  echo "| $t | $r | $p | $d |"
  # Más de 10 % de diferencia con producción es raro para un respaldo de menos de un día.
  if [ "$p" -gt 0 ] && [ $(( (d < 0 ? -d : d) * 100 / p )) -gt 10 ]; then AVISOS=$((AVISOS + 1)); fi
done

USUARIOS=$(contar_restaurada users)
[ "$USUARIOS" -gt 0 ] || { echo "la base restaurada no tiene usuarios" >&2; exit 1; }

DURACION=$(( $(date -u +%s) - INICIO ))
echo
echo "Duración: ${DURACION} s. Tablas con más de 10 % de diferencia: $AVISOS."
RESULTADO=$([ "$AVISOS" -eq 0 ] && echo ok || echo ok-con-avisos)
