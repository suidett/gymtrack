#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Puerta SSH de GitHub Actions · BORRADOR
#
# Comando forzado de las llaves que usa GitHub Actions para entrar como el usuario
# «despliegue». Esa llave no abre una terminal: solo puede pedir una de las
# acciones de abajo, y cada llave sirve para un solo alcance. En
# /home/despliegue/.ssh/authorized_keys:
#
#   command="/opt/gymtrack/bin/puerta-ssh.sh staging",restrict ssh-ed25519 AAAA... github-staging
#   command="/opt/gymtrack/bin/puerta-ssh.sh produccion",restrict ssh-ed25519 AAAA... github-produccion
#   command="/opt/gymtrack/bin/puerta-ssh.sh respaldo",restrict ssh-ed25519 AAAA... github-respaldo
#
# «restrict» apaga el reenvío de puertos, del agente y de X11, y la terminal.
# Así, si se filtra la llave de staging, con ella no se toca producción.
#
# sudoers (visudo -f /etc/sudoers.d/gymtrack):
#   despliegue ALL=(root) NOPASSWD: /opt/gymtrack/bin/respaldar.sh, /opt/gymtrack/bin/restaurar-prueba.sh
#
# Va en /opt/gymtrack/bin/puerta-ssh.sh, dueño root, permisos 755.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ALCANCE=${1:?alcance}
read -r -a PEDIDO <<<"${SSH_ORIGINAL_COMMAND:-}"
ACCION=${PEDIDO[0]:-}
ENTORNO=${PEDIDO[1]:-}
VERSION=${PEDIDO[2]:-}

logger -t gymtrack-puerta "alcance=$ALCANCE pedido=${SSH_ORIGINAL_COMMAND:-vacío} desde=${SSH_CLIENT%% *}"

case "$ALCANCE:$ACCION" in
  staging:desplegar | staging:volver | staging:estado | \
  staging:purgar | \
  produccion:desplegar | produccion:volver | produccion:estado)
    [ "$ENTORNO" = "$ALCANCE" ] || { echo "esta llave solo sirve para $ALCANCE" >&2; exit 1; }
    exec /opt/gymtrack/bin/desplegar.sh "$ACCION" "$ENTORNO" ${VERSION:+"$VERSION"}
    ;;
  respaldo:revisar)
    exec sudo /opt/gymtrack/bin/respaldar.sh revisar produccion
    ;;
  respaldo:restaurar-prueba)
    # La llave privada de age llega por stdin y pasa tal cual al script.
    exec sudo /opt/gymtrack/bin/restaurar-prueba.sh
    ;;
  *)
    echo "pedido no permitido" >&2
    exit 1
    ;;
esac
