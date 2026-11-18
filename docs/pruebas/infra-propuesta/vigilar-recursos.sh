#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Vigilancia de disco, RAM y contenedores · BORRADOR
#
# Lo corre gymtrack-recursos.timer cada 5 minutos. Si todo está bien manda el
# latido a Healthchecks.io; si algo está mal, manda /fail con la lista de
# problemas, y Healthchecks.io avisa por correo al equipo. Si el servidor se
# apaga, el latido deja de llegar y también avisa.
#
# También reinicia los contenedores de GymTrack que siguen «unhealthy»: Docker no
# lo hace solo (restart: unless-stopped actúa cuando el proceso termina, no cuando
# falla el healthcheck).
#
# Necesita /etc/gymtrack/vigilancia.env con HC_RECURSOS_URL y, si quieres
# cambiarlos, UMBRAL_DISCO (por defecto 80 %), UMBRAL_RAM (90 %) y UMBRAL_SWAP (50 %).
# Va en /opt/gymtrack/bin/vigilar-recursos.sh.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

# shellcheck source=/dev/null
source /etc/gymtrack/vigilancia.env
UMBRAL_DISCO=${UMBRAL_DISCO:-80}
UMBRAL_RAM=${UMBRAL_RAM:-90}
UMBRAL_SWAP=${UMBRAL_SWAP:-50}
problemas=()

disco=$(df --output=pcent / | tail -1 | tr -dc '0-9')
[ "$disco" -lt "$UMBRAL_DISCO" ] || problemas+=("disco al ${disco} %")

leer() { awk -v k="$1:" '$1==k {print $2}' /proc/meminfo; }
total=$(leer MemTotal); libre=$(leer MemAvailable)
ram=$(( 100 - libre * 100 / total ))
[ "$ram" -lt "$UMBRAL_RAM" ] || problemas+=("RAM al ${ram} %")

swap_total=$(leer SwapTotal); swap_libre=$(leer SwapFree)
if [ "$swap_total" -gt 0 ]; then
  swap=$(( 100 - swap_libre * 100 / swap_total ))
  [ "$swap" -lt "$UMBRAL_SWAP" ] || problemas+=("swap al ${swap} %")
fi

# Contenedores enfermos, reiniciándose o caídos (solo los de Compose).
malos=$(
  docker ps --filter health=unhealthy --format '{{.Names}} (unhealthy)'
  docker ps -a --filter status=restarting --format '{{.Names}} (reiniciándose)'
  docker ps -a --filter status=exited --filter label=com.docker.compose.project --format '{{.Names}} (detenido)'
)
[ -z "$malos" ] || problemas+=("contenedores: $(tr '\n' ' ' <<<"$malos")")

# Reinicio de los «unhealthy» de los proyectos gymtrack-*. Solo con 8 chequeos fallidos
# seguidos (unos 2 minutos con interval 15s, más que los 2 minutos que desplegar.sh le da
# a una versión nueva) y nunca mientras hay un despliegue de ese entorno (su .bloqueo).
# Si la causa es la base caída, reiniciar la API no la arregla, pero el aviso sale igual.
reiniciados=()
for id in $(docker ps -q --filter health=unhealthy --filter label=com.docker.compose.project); do
  proyecto=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$id")
  case "$proyecto" in gymtrack-produccion|gymtrack-staging) ;; *) continue ;; esac
  bloqueo="/opt/gymtrack/${proyecto#gymtrack-}/.bloqueo"
  if [ -e "$bloqueo" ] && ! flock -n "$bloqueo" true; then continue; fi
  racha=$(docker inspect -f '{{.State.Health.FailingStreak}}' "$id")
  if [ "${racha:-0}" -ge 8 ]; then
    nombre=$(docker inspect -f '{{.Name}}' "$id")
    docker restart "$id" >/dev/null && reiniciados+=("${nombre#/}")
  fi
done
[ "${#reiniciados[@]}" -eq 0 ] || problemas+=("reiniciados por unhealthy: ${reiniciados[*]}")

# El kernel mató algo por memoria en los últimos 5 minutos.
oom=$(journalctl -k --since "-5 min" --no-pager 2>/dev/null | grep -ci "out of memory\|oom-kill")
[ "$oom" -eq 0 ] || problemas+=("$oom eventos OOM del kernel")

if [ "${#problemas[@]}" -gt 0 ]; then
  curl -fsS -m 10 --retry 3 --data-raw "$(printf '%s\n' "${problemas[@]}")" "$HC_RECURSOS_URL/fail" >/dev/null
else
  curl -fsS -m 10 --retry 3 "$HC_RECURSOS_URL" >/dev/null
fi
