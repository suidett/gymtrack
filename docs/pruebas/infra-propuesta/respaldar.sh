#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Respaldo cifrado de PostgreSQL a Cloud Storage · BORRADOR
#
# Uso:
#   respaldar.sh <produccion|staging> diario                  lo corre gymtrack-respaldo.timer a las 07:00 UTC
#   respaldar.sh produccion predespliegue <version>           lo corre desplegar.sh antes de migrar
#   respaldar.sh revisar produccion                           ¿existe el diario de anoche? (respaldo-vps.yml)
#
# Qué hace:
#   - pg_dump en formato custom dentro del contenedor de la base (misma versión, sin
#     abrir el puerto), cifrado al vuelo con age usando solo la llave PÚBLICA: el
#     servidor puede cifrar pero no descifrar. La privada vive en GitHub (entorno
#     «respaldo») y en el gestor de claves del equipo.
#   - Sube el archivo al bucket de respaldos con rclone, sin sobrescribir.
#     La cuenta de servicio del VPS solo crea y lee objetos: no puede borrar.
#     La retención de 14 días (§Disponibilidad) la hace la regla de ciclo de vida
#     del bucket, no este script.
#   - Deja las 3 últimas copias locales en /var/backups/gymtrack/<entorno>.
#   - Avisa a Healthchecks.io: al terminar bien (latido) o con /fail si algo falla.
#
# Necesita: age y rclone (paquetes de Ubuntu 24.04), y en /etc/gymtrack/respaldo/
# (dueño root, permisos 600): respaldo.env, rclone.conf, sa-respaldos.json y
# age-destinatario.txt. Va en /opt/gymtrack/bin/respaldar.sh.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
umask 077

CONF=/etc/gymtrack/respaldo
# respaldo.env trae: BUCKET_RESPALDOS, HC_RESPALDO_URL, MINIMO_BYTES (por ejemplo 20000)
# shellcheck source=/dev/null
source "$CONF/respaldo.env"
export RCLONE_CONFIG="$CONF/rclone.conf"   # remoto «gcs» con service_account_file y bucket_policy_only
REMOTO="gcs:$BUCKET_RESPALDOS"

if [ "${1:-}" = revisar ]; then
  ENTORNO=${2:-produccion}
  # Último diario: nombre, tamaño y antigüedad. Falla si pasa de 26 horas o es muy chico.
  LINEA=$(rclone lsf "$REMOTO/$ENTORNO/diario/" --files-only --format "tsp" --separator ";" | sort | tail -n1)
  [ -n "$LINEA" ] || { echo "no hay ningún respaldo diario de $ENTORNO"; exit 1; }
  IFS=';' read -r FECHA TAMANO NOMBRE <<<"$LINEA"
  HORAS=$(( ( $(date -u +%s) - $(date -u -d "$FECHA" +%s) ) / 3600 ))
  echo "archivo=$NOMBRE"
  echo "tamano_bytes=$TAMANO"
  echo "horas=$HORAS"
  [ "$HORAS" -le 26 ] || { echo "el último respaldo tiene $HORAS horas"; exit 1; }
  [ "$TAMANO" -ge "$MINIMO_BYTES" ] || { echo "el último respaldo pesa $TAMANO bytes, menos de $MINIMO_BYTES"; exit 1; }
  exit 0
fi

ENTORNO=${1:?entorno}
TIPO=${2:-diario}
ETIQUETA=${3:-}
case "$ENTORNO" in produccion|staging) ;; *) echo "entorno desconocido" >&2; exit 2 ;; esac
case "$TIPO" in diario|predespliegue) ;; *) echo "tipo desconocido" >&2; exit 2 ;; esac
[[ -z "$ETIQUETA" || "$ETIQUETA" =~ ^[a-z0-9.-]+$ ]] || { echo "etiqueta inválida" >&2; exit 2; }

DESTINATARIO=$(cat "$CONF/age-destinatario.txt")
LOCAL="/var/backups/gymtrack/$ENTORNO"
mkdir -p "$LOCAL"
NOMBRE="$(date -u +%Y-%m-%dT%H%MZ)${ETIQUETA:+-$ETIQUETA}.dump.age"
ARCHIVO="$LOCAL/$NOMBRE"

avisar_fallo() {
  [ "$TIPO" = diario ] || return 0
  curl -fsS -m 10 --retry 3 --data-raw "falló el respaldo $TIPO de $ENTORNO" "$HC_RESPALDO_URL/fail" >/dev/null || true
}
trap 'avisar_fallo; rm -f "$ARCHIVO.parcial"' ERR

CONTENEDOR=$(docker ps -q \
  -f "label=com.docker.compose.project=gymtrack-$ENTORNO" \
  -f "label=com.docker.compose.service=db")
[ -n "$CONTENEDOR" ] || { echo "la base de $ENTORNO no está corriendo" >&2; false; }

# pipefail hace que un error de pg_dump haga fallar todo el flujo.
docker exec "$CONTENEDOR" sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --compress=6 --no-owner' \
  | age -r "$DESTINATARIO" > "$ARCHIVO.parcial"

TAMANO=$(stat -c %s "$ARCHIVO.parcial")
# MINIMO_BYTES vale solo para el diario (y para «revisar», arriba): el predespliegue
# de la primera versión corre con la base recién creada y pesa menos que eso; si se
# exigiera aquí, el primer despliegue a producción no podría pasar nunca.
if [ "$TIPO" = diario ]; then
  [ "$TAMANO" -ge "$MINIMO_BYTES" ] || { echo "respaldo demasiado chico: $TAMANO bytes" >&2; false; }
else
  [ "$TAMANO" -gt 0 ] || { echo "respaldo vacío" >&2; false; }
fi
mv "$ARCHIVO.parcial" "$ARCHIVO"

# --immutable: nunca reemplaza un archivo que ya existe en el bucket.
rclone copyto "$ARCHIVO" "$REMOTO/$ENTORNO/$TIPO/$NOMBRE" --immutable

# Comprobar que llegó entero.
REMOTO_TAMANO=$(rclone lsf "$REMOTO/$ENTORNO/$TIPO/$NOMBRE" --format s)
[ "$REMOTO_TAMANO" = "$TAMANO" ] || { echo "el tamaño en el bucket no coincide" >&2; false; }

# Copias locales: solo las 3 más nuevas de este entorno.
ls -1t "$LOCAL"/*.dump.age 2>/dev/null | tail -n +4 | xargs -r rm -f

if [ "$TIPO" = diario ]; then
  curl -fsS -m 10 --retry 3 "$HC_RESPALDO_URL" >/dev/null || true
fi
echo "OK respaldo $TIPO de $ENTORNO: $NOMBRE ($TAMANO bytes)"
