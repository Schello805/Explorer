#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-entdecker}"
APP_USER="${APP_USER:-entdecker}"
APP_DIR="${APP_DIR:-/opt/entdecker}"
REPO_URL="${REPO_URL:-https://github.com/Schello805/Explorer.git}"
BRANCH="${BRANCH:-main}"
NODE_MAJOR="${NODE_MAJOR:-22}"
PORT="${PORT:-3000}"
DOMAIN="${DOMAIN:-_}"
INSTALL_NGINX="${INSTALL_NGINX:-true}"
INSTALL_POSTGRES="${INSTALL_POSTGRES:-false}"
DB_NAME="${DB_NAME:-explorer}"
DB_USER="${DB_USER:-explorer}"
DB_PASSWORD="${DB_PASSWORD:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@schellenberger.biz}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
AUTH_SECRET="${AUTH_SECRET:-}"
GITHUB_URL="${GITHUB_URL:-https://github.com/Schello805/Explorer}"

log() { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[FEHLER]\033[0m %s\n' "$*" >&2; exit 1; }

on_error() {
  fail "Installation abgebrochen. Prüfe die letzte Meldung oben. Das System wurde nicht vollständig eingerichtet."
}
trap on_error ERR

require_root() {
  [[ "${EUID}" -eq 0 ]] || fail "Bitte mit root-Rechten starten, z. B. sudo bash scripts/install-ubuntu.sh"
}

require_ubuntu() {
  [[ -r /etc/os-release ]] || fail "/etc/os-release nicht gefunden."
  . /etc/os-release
  [[ "${ID:-}" == "ubuntu" || "${ID_LIKE:-}" == *"ubuntu"* || "${ID_LIKE:-}" == *"debian"* ]] \
    || fail "Dieses Script ist für Ubuntu/Debian gedacht. Erkannt: ${PRETTY_NAME:-unbekannt}"
  ok "Linux erkannt: ${PRETTY_NAME:-Ubuntu/Debian}"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Benötigter Befehl fehlt: $1"
}

generate_secret() {
  openssl rand -base64 48 | tr -d '\n'
}

install_base_packages() {
  log "Installiere Basispakete ..."
  apt-get update
  apt-get install -y ca-certificates curl git gnupg openssl build-essential
  ok "Basispakete installiert."
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -p "process.versions.node.split('.')[0]")"
    if [[ "${major}" -ge "${NODE_MAJOR}" ]]; then
      ok "Node.js $(node -v) ist ausreichend."
      return
    fi
    warn "Node.js $(node -v) ist zu alt. Installiere Node.js ${NODE_MAJOR}."
  else
    log "Node.js ist nicht installiert. Installiere Node.js ${NODE_MAJOR}."
  fi

  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  printf 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_%s.x nodistro main\n' "${NODE_MAJOR}" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update
  apt-get install -y nodejs
  ok "Node.js $(node -v) installiert."
}

create_app_user() {
  if id "${APP_USER}" >/dev/null 2>&1; then
    ok "Systembenutzer ${APP_USER} existiert."
  else
    useradd --system --create-home --shell /usr/sbin/nologin "${APP_USER}"
    ok "Systembenutzer ${APP_USER} erstellt."
  fi
}

clone_or_update_repo() {
  if [[ -d "${APP_DIR}/.git" ]]; then
    log "Repository existiert bereits. Aktualisiere ${APP_DIR} ..."
    git -C "${APP_DIR}" fetch origin "${BRANCH}"
    git -C "${APP_DIR}" checkout "${BRANCH}"
    git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
  else
    log "Klonen nach ${APP_DIR} ..."
    mkdir -p "$(dirname "${APP_DIR}")"
    git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
  fi
  chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
  ok "Projekt liegt unter ${APP_DIR}."
}

configure_postgres() {
  if [[ "${INSTALL_POSTGRES}" != "true" ]]; then
    warn "PostgreSQL-Installation übersprungen. Setze DATABASE_URL später manuell in ${APP_DIR}/.env.local."
    return
  fi
  [[ -n "${DB_PASSWORD}" ]] || DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
  log "Installiere PostgreSQL und richte Datenbank ein ..."
  apt-get install -y postgresql postgresql-contrib
  systemctl enable --now postgresql
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
    || sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
    || sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
  sudo -u postgres psql -d "${DB_NAME}" -f "${APP_DIR}/database/schema.sql"
  ok "PostgreSQL bereit: Datenbank ${DB_NAME}, Benutzer ${DB_USER}."
}

write_env_file() {
  local env_file="${APP_DIR}/.env.local"
  local password_hash
  [[ -n "${AUTH_SECRET}" ]] || AUTH_SECRET="$(generate_secret)"
  if [[ -n "${ADMIN_PASSWORD}" ]]; then
    password_hash="$(cd "${APP_DIR}" && node -e "require('bcryptjs').hash(process.argv[1], 12).then(console.log)" "${ADMIN_PASSWORD}")"
  else
    password_hash=""
    warn "ADMIN_PASSWORD wurde nicht gesetzt. Trage ADMIN_PASSWORD_HASH vor dem Livegang in ${env_file} ein."
  fi

  if [[ "${INSTALL_POSTGRES}" == "true" ]]; then
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
  else
    DATABASE_URL="${DATABASE_URL:-}"
  fi

  log "Schreibe Umgebung nach ${env_file} ..."
  cat > "${env_file}" <<EOF_ENV
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD_HASH=${password_hash}
AUTH_SECRET=${AUTH_SECRET}
NEXT_PUBLIC_APP_REVISION=$(git -C "${APP_DIR}" rev-parse --short HEAD)
NEXT_PUBLIC_GITHUB_URL=${GITHUB_URL}
DATABASE_URL=${DATABASE_URL}
PORT=${PORT}
EOF_ENV
  chown "${APP_USER}:${APP_USER}" "${env_file}"
  chmod 600 "${env_file}"
  ok "Umgebung gespeichert."
}

install_dependencies_and_build() {
  log "Installiere npm-Abhängigkeiten ..."
  sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && npm ci"
  log "Prüfe und baue Anwendung ..."
  sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && npm run verify"
  ok "Build und Tests erfolgreich."
}

write_systemd_service() {
  log "Erstelle systemd-Service ${APP_NAME}.service ..."
  cat > "/etc/systemd/system/${APP_NAME}.service" <<EOF_SERVICE
[Unit]
Description=Entdecker Campingplatz PWA
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env.local
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start -- --hostname 127.0.0.1 --port ${PORT}
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=${APP_DIR}

[Install]
WantedBy=multi-user.target
EOF_SERVICE
  systemctl daemon-reload
  systemctl enable --now "${APP_NAME}.service"
  ok "Service gestartet."
}

configure_nginx() {
  if [[ "${INSTALL_NGINX}" != "true" ]]; then
    warn "Nginx-Installation übersprungen. App läuft lokal auf Port ${PORT}."
    return
  fi
  log "Installiere und konfiguriere Nginx ..."
  apt-get install -y nginx
  cat > "/etc/nginx/sites-available/${APP_NAME}" <<EOF_NGINX
server {
  listen 80;
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
  systemctl enable --now nginx
  systemctl reload nginx
  ok "Nginx aktiv."
}

health_check() {
  log "Prüfe lokalen Dienst ..."
  sleep 2
  systemctl is-active --quiet "${APP_NAME}.service" || fail "systemd-Service läuft nicht. Prüfe: journalctl -u ${APP_NAME} -n 100"
  if curl -fsS "http://127.0.0.1:${PORT}" >/dev/null; then
    ok "App antwortet lokal auf http://127.0.0.1:${PORT}"
  else
    fail "App antwortet nicht auf Port ${PORT}. Prüfe: journalctl -u ${APP_NAME} -n 100"
  fi
}

main() {
  require_root
  require_ubuntu
  require_command apt-get
  install_base_packages
  install_node
  create_app_user
  clone_or_update_repo
  configure_postgres
  install_dependencies_and_build
  write_env_file
  write_systemd_service
  configure_nginx
  health_check
  ok "Installation abgeschlossen."
  printf '\nZugriff:\n'
  printf '  Lokal:   http://127.0.0.1:%s\n' "${PORT}"
  printf '  Nginx:   http://%s\n' "${DOMAIN}"
  printf '\nNützliche Befehle:\n'
  printf '  Status:  systemctl status %s\n' "${APP_NAME}"
  printf '  Logs:    journalctl -u %s -f\n' "${APP_NAME}"
  printf '  Update:  bash %s/scripts/update-ubuntu.sh\n' "${APP_DIR}"
}

main "$@"
