#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:${PORT:-3000}}"
MONITORING_SECRET="${MONITORING_SECRET:-}"

fail() { printf '[FEHLER] %s\n' "$*" >&2; exit 1; }
ok() { printf '[OK] %s\n' "$*"; }

command -v curl >/dev/null 2>&1 || fail "curl fehlt."
[[ -n "${MONITORING_SECRET}" ]] || fail "MONITORING_SECRET fehlt."

curl -fsS -H "x-monitoring-secret: ${MONITORING_SECRET}" "${BASE_URL}/api/monitoring/uptime" || fail "Monitoring fehlgeschlagen. Falls SMTP konfiguriert ist, wurde eine Admin-Mail ausgelöst."
printf '\n'
ok "Monitoring erfolgreich."
