#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/platzguide}"
APP_USER="${APP_USER:-platzguide}"
DB_NAME="${DB_NAME:-platzguide}"
DB_USER="${DB_USER:-platzguide}"
DB_PASSWORD="${DB_PASSWORD:-}"

log() { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[FEHLER]\033[0m %s\n' "$*" >&2; exit 1; }

[[ "${EUID}" -eq 0 ]] || fail "Bitte mit root-Rechten starten: sudo bash scripts/repair-database-env.sh"
[[ -f "${APP_DIR}/.env.local" ]] || fail ".env.local fehlt in ${APP_DIR}"

install_postgres_if_missing() {
  if command -v psql >/dev/null 2>&1 && id postgres >/dev/null 2>&1; then
    return
  fi
  command -v apt-get >/dev/null 2>&1 || fail "psql fehlt und apt-get ist nicht verfügbar. Bitte PostgreSQL installieren."
  log "PostgreSQL fehlt. Installiere PostgreSQL und Client ..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y postgresql postgresql-client openssl
  systemctl enable --now postgresql
  command -v psql >/dev/null 2>&1 || fail "psql fehlt nach Installation weiterhin."
  id postgres >/dev/null 2>&1 || fail "PostgreSQL-Systembenutzer fehlt nach Installation weiterhin."
  ok "PostgreSQL installiert."
}

install_postgres_if_missing

generate_password() {
  openssl rand -base64 24 | tr -d '\n'
}

escape_sql() {
  printf "%s" "$1" | sed "s/'/''/g"
}

set_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "${APP_DIR}/.env.local"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "${APP_DIR}/.env.local"
  else
    printf '\n%s=%s\n' "${key}" "${value}" >> "${APP_DIR}/.env.local"
  fi
}

DB_PASSWORD="${DB_PASSWORD:-$(generate_password)}"
escaped_password="$(escape_sql "${DB_PASSWORD}")"

log "Prüfe lokale PostgreSQL-Datenbank ${DB_NAME} ..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${escaped_password}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${escaped_password}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
set_env "DATABASE_URL" "${DATABASE_URL}"
set_env "ALLOW_LOCAL_DATA_FALLBACK" "false"
chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env.local"
chmod 600 "${APP_DIR}/.env.local"

log "Führe Migration aus ..."
DATABASE_URL="${DATABASE_URL}" APP_DIR="${APP_DIR}" bash "${APP_DIR}/scripts/migrate-postgres.sh"

ok "DATABASE_URL repariert und Migration abgeschlossen."
ok "Danach starten: systemctl restart platzguide"
