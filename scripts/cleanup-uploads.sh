#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:${PORT:-3000}}"
DRY_RUN="${DRY_RUN:-true}"
MAINTENANCE_SECRET="${MAINTENANCE_SECRET:-}"

info() { printf '[INFO] %s\n' "$*"; }
ok() { printf '[OK] %s\n' "$*"; }
fail() { printf '[FEHLER] %s\n' "$*" >&2; exit 1; }

command -v curl >/dev/null 2>&1 || fail "curl fehlt."
[[ -n "${MAINTENANCE_SECRET}" ]] || fail "MAINTENANCE_SECRET fehlt."

info "Prüfe ungenutzte Uploads auf ${BASE_URL} ..."
if [[ "${DRY_RUN}" == "false" ]]; then
  curl -fsS -X POST -H "Content-Type: application/json" \
    -H "x-maintenance-secret: ${MAINTENANCE_SECRET}" \
    --data '{"dryRun":false}' "${BASE_URL}/api/maintenance/cleanup" || fail "Cleanup fehlgeschlagen."
  printf '\n'
  ok "Cleanup ausgeführt."
else
  curl -fsS -X POST -H "Content-Type: application/json" \
    -H "x-maintenance-secret: ${MAINTENANCE_SECRET}" \
    --data '{"dryRun":true}' "${BASE_URL}/api/maintenance/cleanup" || fail "Cleanup-Vorschau fehlgeschlagen."
  printf '\n'
  ok "Cleanup-Vorschau abgeschlossen."
fi
