#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-platzguide}"
APP_USER="${APP_USER:-platzguide}"
APP_DIR="${APP_DIR:-/opt/platzguide}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

log() { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[FEHLER]\033[0m %s\n' "$*" >&2; exit 1; }

[[ "${EUID}" -eq 0 ]] || fail "Bitte mit root-Rechten starten."
[[ -f "${APP_DIR}/package.json" ]] || fail "App-Verzeichnis nicht gefunden: ${APP_DIR}"
[[ -f "${APP_DIR}/.env.local" ]] || fail ".env.local fehlt: ${APP_DIR}/.env.local"

if [[ -z "${ADMIN_PASSWORD}" ]]; then
  read -r -s -p "Neues Admin-Passwort: " ADMIN_PASSWORD
  printf '\n'
fi

[[ "${#ADMIN_PASSWORD}" -ge 12 ]] || fail "Admin-Passwort muss mindestens 12 Zeichen lang sein."

log "Erzeuge Passwort-Hash ..."
password_hash="$(cd "${APP_DIR}" && node -e "require('bcryptjs').hash(process.argv[1], 12).then(console.log)" "${ADMIN_PASSWORD}")"

if grep -q '^ADMIN_PASSWORD_HASH=' "${APP_DIR}/.env.local"; then
  sed -i "s#^ADMIN_PASSWORD_HASH=.*#ADMIN_PASSWORD_HASH=${password_hash}#" "${APP_DIR}/.env.local"
else
  printf '\nADMIN_PASSWORD_HASH=%s\n' "${password_hash}" >> "${APP_DIR}/.env.local"
fi

chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env.local"
chmod 600 "${APP_DIR}/.env.local"

log "Starte Service neu ..."
systemctl restart "${APP_NAME}.service"
ok "Admin-Passwort wurde aktualisiert."
