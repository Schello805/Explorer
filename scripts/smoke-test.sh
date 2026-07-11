#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/platzguide}"
BASE_URL="${BASE_URL:-}"
PORT="${PORT:-}"

log() { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[FEHLER]\033[0m %s\n' "$*" >&2; exit 1; }

env_value() {
  local key="$1"
  grep -E "^${key}=" "${APP_DIR}/.env.local" 2>/dev/null | tail -n 1 | cut -d= -f2- || true
}

if [[ -z "${BASE_URL}" ]]; then
  PORT="${PORT:-$(env_value PORT)}"
  PORT="${PORT:-3000}"
  BASE_URL="http://127.0.0.1:${PORT}"
fi

check_get() {
  local path="$1"
  local expected="$2"
  local status
  status="$(curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}${path}" || true)"
  [[ "${status}" == "${expected}" ]] || fail "${path} liefert HTTP ${status}, erwartet ${expected}."
  ok "${path} liefert HTTP ${expected}."
}

log "Smoke-Test gegen ${BASE_URL} ..."
check_get "/api/health" "200"
check_get "/" "200"
check_get "/admin/login" "200"
check_get "/manifest.webmanifest" "200"
check_get "/rechtliches/agb" "200"
ok "Smoke-Test erfolgreich."
