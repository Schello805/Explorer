#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/platzguide}"
DATABASE_URL="${DATABASE_URL:-}"

log() { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[FEHLER]\033[0m %s\n' "$*" >&2; exit 1; }

[[ -n "${DATABASE_URL}" ]] || fail "DATABASE_URL fehlt."
command -v psql >/dev/null 2>&1 || fail "psql fehlt. Bitte PostgreSQL-Client installieren."
[[ -f "${APP_DIR}/database/schema.sql" ]] || fail "schema.sql fehlt unter ${APP_DIR}/database/schema.sql"

log "Führe PostgreSQL-Migration aus ..."
if [[ "$(psql "${DATABASE_URL}" -At -c "SELECT to_regclass('public.tenants') IS NOT NULL")" == "t" ]]; then
  log "Basisschema existiert bereits, überspringe database/schema.sql."
else
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${APP_DIR}/database/schema.sql"
fi
if [[ -d "${APP_DIR}/database/migrations" ]]; then
  for migration in "${APP_DIR}"/database/migrations/*.sql; do
    [[ -e "${migration}" ]] || continue
    log "Wende Migration an: ${migration}"
    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${migration}"
  done
fi
ok "Migration abgeschlossen."
