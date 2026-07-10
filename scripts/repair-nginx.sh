#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-platzguide}"
APP_DIR="${APP_DIR:-/opt/platzguide}"
DOMAIN="${DOMAIN:-_}"
PORT="${PORT:-}"

log() { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[FEHLER]\033[0m %s\n' "$*" >&2; exit 1; }

[[ "${EUID}" -eq 0 ]] || fail "Bitte mit root-Rechten starten: sudo bash scripts/repair-nginx.sh"
command -v nginx >/dev/null 2>&1 || fail "Nginx ist nicht installiert."

if [[ -z "${PORT}" && -f "${APP_DIR}/.env.local" ]]; then
  PORT="$(grep -E '^PORT=' "${APP_DIR}/.env.local" | cut -d= -f2- || true)"
fi
PORT="${PORT:-3000}"

listen_directive="listen 80;"
if [[ "${DOMAIN}" == "_" ]]; then
  listen_directive="listen 80 default_server;"
fi

log "Deaktiviere Nginx-Welcome-Site ..."
rm -f /etc/nginx/sites-enabled/default

log "Schreibe Platzguide-Nginx-Site für DOMAIN=${DOMAIN}, PORT=${PORT} ..."
cat > "/etc/nginx/sites-available/${APP_NAME}" <<EOF_NGINX
server {
  ${listen_directive}
  server_name ${DOMAIN};

  client_max_body_size 25m;

  location / {
    proxy_pass http://127.0.0.1:${PORT};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
EOF_NGINX

ln -sf "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/${APP_NAME}"

nginx -t
systemctl reload nginx
ok "Nginx neu geladen."

if curl -fsS -H "Host: ${DOMAIN}" "http://127.0.0.1/api/health" >/dev/null; then
  ok "Platzguide antwortet über Nginx."
else
  fail "Nginx läuft, aber Platzguide antwortet nicht. Prüfe: systemctl status ${APP_NAME} && journalctl -u ${APP_NAME} -n 100"
fi
