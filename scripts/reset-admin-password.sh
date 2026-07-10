#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-platzguide}"
APP_USER="${APP_USER:-platzguide}"
APP_DIR="${APP_DIR:-/opt/platzguide}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
SHOW_PASSWORD="${SHOW_PASSWORD:-false}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"

log() { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[FEHLER]\033[0m %s\n' "$*" >&2; exit 1; }

[[ "${EUID}" -eq 0 ]] || fail "Bitte mit root-Rechten starten."
[[ -f "${APP_DIR}/package.json" ]] || fail "App-Verzeichnis nicht gefunden: ${APP_DIR}"
[[ -f "${APP_DIR}/.env.local" ]] || fail ".env.local fehlt: ${APP_DIR}/.env.local"

if [[ -z "${ADMIN_PASSWORD}" ]]; then
  if [[ "${SHOW_PASSWORD}" == "true" ]]; then
    read -r -p "Neues Admin-Passwort sichtbar eingeben: " ADMIN_PASSWORD
    read -r -p "Admin-Passwort wiederholen: " ADMIN_PASSWORD_CONFIRM
  else
    read -r -s -p "Neues Admin-Passwort: " ADMIN_PASSWORD
    printf '\n'
    read -r -s -p "Admin-Passwort wiederholen: " ADMIN_PASSWORD_CONFIRM
    printf '\n'
  fi
  [[ "${ADMIN_PASSWORD}" == "${ADMIN_PASSWORD_CONFIRM}" ]] || fail "Passwörter stimmen nicht überein."
fi

[[ "${#ADMIN_PASSWORD}" -ge 12 ]] || fail "Admin-Passwort muss mindestens 12 Zeichen lang sein."

log "Erzeuge Passwort-Hash ..."
password_hash="$(cd "${APP_DIR}" && node -e "require('bcryptjs').hash(process.argv[1], 12).then(console.log)" "${ADMIN_PASSWORD}")"
cd "${APP_DIR}" && node -e "require('bcryptjs').compare(process.argv[1], process.argv[2]).then((ok) => process.exit(ok ? 0 : 1))" "${ADMIN_PASSWORD}" "${password_hash}" \
  || fail "Der erzeugte Passwort-Hash konnte nicht verifiziert werden."
ok "Hash wurde lokal verifiziert."

if grep -q '^ADMIN_PASSWORD_HASH=' "${APP_DIR}/.env.local"; then
  sed -i "s#^ADMIN_PASSWORD_HASH=.*#ADMIN_PASSWORD_HASH=${password_hash}#" "${APP_DIR}/.env.local"
else
  printf '\nADMIN_PASSWORD_HASH=%s\n' "${password_hash}" >> "${APP_DIR}/.env.local"
fi

chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env.local"
chmod 600 "${APP_DIR}/.env.local"

if [[ -z "${ADMIN_EMAIL}" ]]; then
  ADMIN_EMAIL="$(grep -E '^ADMIN_EMAIL=' "${APP_DIR}/.env.local" | cut -d= -f2- || true)"
fi
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@schellenberger.biz}"
port="$(grep -E '^PORT=' "${APP_DIR}/.env.local" | cut -d= -f2- || true)"
port="${port:-3000}"

log "Starte Service neu ..."
systemctl restart "${APP_NAME}.service"
for attempt in {1..20}; do
  if curl -fsS "http://127.0.0.1:${port}/api/health" >/dev/null; then
    ok "Service antwortet auf /api/health."
    break
  fi
  sleep 1
  [[ "${attempt}" -lt 20 ]] || fail "Service antwortet nach Neustart nicht."
done

log "Prüfe Login für ${ADMIN_EMAIL} ..."
login_result="$(ADMIN_EMAIL="${ADMIN_EMAIL}" ADMIN_PASSWORD="${ADMIN_PASSWORD}" LOGIN_URL="http://127.0.0.1:${port}/api/auth/login" node -e '
  fetch(process.env.LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
  }).then(async (response) => {
    console.log(JSON.stringify({ ok: response.ok, status: response.status, body: await response.text() }));
    process.exit(response.ok ? 0 : 1);
  }).catch((error) => {
    console.log(JSON.stringify({ ok: false, status: 0, body: String(error && error.message || error) }));
    process.exit(1);
  });
' 2>/dev/null)" && login_ok=true || login_ok=false
if [[ "${login_ok}" == "true" ]]; then
  ok "Login-Test erfolgreich für ${ADMIN_EMAIL}."
else
  printf '%s\n' "${login_result}" >&2
  fail "Passwort wurde gespeichert, aber der Login-Test ist fehlgeschlagen. Prüfe: journalctl -u ${APP_NAME} -n 100 --no-pager"
fi
ok "Admin-Passwort wurde aktualisiert."
