#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/platzguide}"
BASE_URL="${BASE_URL:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-${DEPLOY_ADMIN_PASSWORD:-}}"
REQUIRE_ADMIN_LOGIN="${REQUIRE_ADMIN_LOGIN:-false}"

log() { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[FEHLER]\033[0m %s\n' "$*" >&2; exit 1; }

env_value() {
  local key="$1"
  grep -E "^${key}=" "${APP_DIR}/.env.local" 2>/dev/null | tail -n 1 | cut -d= -f2- || true
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

if [[ -z "${BASE_URL}" ]]; then
  port="$(env_value PORT)"
  BASE_URL="http://127.0.0.1:${port:-3000}"
fi
ADMIN_EMAIL="${ADMIN_EMAIL:-$(env_value ADMIN_EMAIL)}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@schellenberger.biz}"

APP_DIR="${APP_DIR}" BASE_URL="${BASE_URL}" bash "${APP_DIR}/scripts/smoke-test.sh"

if [[ -z "${ADMIN_PASSWORD}" ]]; then
  if [[ "${REQUIRE_ADMIN_LOGIN}" == "true" ]]; then
    fail "Admin-Login-Test verlangt, aber ADMIN_PASSWORD oder DEPLOY_ADMIN_PASSWORD fehlt."
  fi
  warn "Admin-Login-Test übersprungen. Für Prüfung ADMIN_PASSWORD oder DEPLOY_ADMIN_PASSWORD setzen."
  exit 0
fi

log "Prüfe Admin-Login für ${ADMIN_EMAIL} ..."
payload="{\"email\":\"$(json_escape "${ADMIN_EMAIL}")\",\"password\":\"$(json_escape "${ADMIN_PASSWORD}")\"}"
cookie_file="$(mktemp)"
body_file="$(mktemp)"
status="$(curl -sS -o "${body_file}" -w "%{http_code}" -c "${cookie_file}" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "${payload}" \
  "${BASE_URL}/api/auth/login" || true)"
rm -f "${cookie_file}"
if [[ "${status}" != "200" ]]; then
  body="$(cat "${body_file}" 2>/dev/null || true)"
  rm -f "${body_file}"
  fail "Admin-Login-Test fehlgeschlagen: HTTP ${status} ${body}"
fi
rm -f "${body_file}"
ok "Admin-Login-Test erfolgreich."
