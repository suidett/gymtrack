#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Corre Maestro dentro del emulador del CI · borrador
#
# Lo llama android-emulator-runner desde e2e-android.yml, con el emulador ya
# arriba. Instala el APK e2e, ajusta la fuente si la suite lo pide, corre los
# flujos de apps/mobile/e2e con las etiquetas de la suite y, si REINTENTOS es 1,
# vuelve a correr una vez los que fallaron. Lo que pasa al reintentar queda en
# inestables.txt para el issue «inestable».
# Al activar: copiar a .github/scripts/correr-maestro.sh.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SUITE="${SUITE:-humo}"
SALIDA="${SALIDA:-maestro-salida}"
REINTENTOS="${REINTENTOS:-0}"
mkdir -p "$SALIDA"

adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk

# ACC-005: fuente del sistema al 130 % en la suite de compatibilidad.
adb shell settings put system font_scale "${ESCALA_FUENTE:-1.0}"

# Qué flujos corre cada suite (etiquetas de Maestro en cada flujo).
case "$SUITE" in
  humo)           INCLUIR="humo";      EXCLUIR="inestable" ;;
  compatibilidad) INCLUIR="humo";      EXCLUIR="inestable" ;;
  sin-senal)      INCLUIR="sin-senal"; EXCLUIR="" ;;
  completo)       INCLUIR="";          EXCLUIR="" ;;
  *) echo "Suite desconocida: $SUITE"; exit 2 ;;
esac

correr() {
  local junit="$1"; shift
  local args=(test --format junit --output "$junit" --debug-output "$SALIDA/depuracion")
  [ -n "$INCLUIR" ] && args+=(--include-tags "$INCLUIR")
  [ -n "$EXCLUIR" ] && args+=(--exclude-tags "$EXCLUIR")
  maestro "${args[@]}" "$@"
}

adb logcat -c
set +e
correr "$SALIDA/junit.xml" apps/mobile/e2e
RESULTADO=$?
set -e

if [ "$RESULTADO" -ne 0 ] && [ "$REINTENTOS" -gt 0 ]; then
  # PENDIENTE: ajustar al formato JUnit de la versión de Maestro fijada. Se asume que
  # cada <testcase> fallido trae en «name» el nombre del archivo del flujo sin extensión.
  python3 - "$SALIDA/junit.xml" > "$SALIDA/fallidos.txt" <<'PY'
import sys, xml.etree.ElementTree as ET
for caso in ET.parse(sys.argv[1]).iter("testcase"):
    if caso.find("failure") is not None or caso.find("error") is not None:
        print(f"apps/mobile/e2e/{caso.get('name')}.yaml")
PY
  if [ -s "$SALIDA/fallidos.txt" ]; then
    set +e
    # shellcheck disable=SC2046
    correr "$SALIDA/junit-reintento.xml" $(cat "$SALIDA/fallidos.txt")
    RESULTADO=$?
    set -e
    # Si el reintento pasó, los flujos son inestables: verdes, pero anotados.
    [ "$RESULTADO" -eq 0 ] && cp "$SALIDA/fallidos.txt" "$SALIDA/inestables.txt"
  fi
fi

adb logcat -d > "$SALIDA/logcat.txt" || true
exit "$RESULTADO"
