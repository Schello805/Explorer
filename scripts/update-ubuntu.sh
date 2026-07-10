#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-platzguide}"
APP_USER="${APP_USER:-platzguide}"
APP_DIR="${APP_DIR:-/opt/platzguide}"
BRANCH="${BRANCH:-main}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/platzguide}"
RUN_VERIFY="${RUN_VERIFY:-true}"
FORCE_REBUILD="${FORCE_REBUILD:-false}"
RUN_SMOKE_TEST="${RUN_SMOKE_TEST:-true}"
RUN_DEPLOY_HEALTHCHECK="${RUN_DEPLOY_HEALTHCHECK:-true}"
BACKUP_DATABASE_BEFORE_MIGRATION="${BACKUP_DATABASE_BEFORE_MIGRATION:-true}"
AUTO_REPAIR_DATABASE_ENV="${AUTO_REPAIR_DATABASE_ENV:-true}"

log() { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[FEHLER]\033[0m %s\n' "$*" >&2; exit 1; }

OLD_REV=""
NEW_REV=""
RUNTIME_BACKUP_PATH=""
DB_BACKUP_PATH=""
ROLLBACK_IN_PROGRESS="false"

on_error() {
  printf '\n\033[1;31m[FEHLER]\033[0m Update abgebrochen.\n' >&2
  if [[ "${ROLLBACK_IN_PROGRESS}" != "true" && -n "${OLD_REV}" ]]; then
    rollback || true
  fi
  [[ -n "${DB_BACKUP_PATH}" ]] && printf 'Datenbank-Backup vor Migration: %s\n' "${DB_BACKUP_PATH}" >&2
  exit 1
}
trap on_error ERR

require_root() {
  [[ "${EUID}" -eq 0 ]] || fail "Bitte mit root-Rechten starten, z. B. sudo bash scripts/update-ubuntu.sh"
}

require_layout() {
  [[ -d "${APP_DIR}/.git" ]] || fail "Kein Git-Repository gefunden: ${APP_DIR}"
  [[ -f "${APP_DIR}/package.json" ]] || fail "package.json fehlt in ${APP_DIR}"
  [[ -f "${APP_DIR}/.env.local" ]] || warn ".env.local fehlt. Falls Produktion: bitte prüfen."
  id "${APP_USER}" >/dev/null 2>&1 || fail "Systembenutzer fehlt: ${APP_USER}"
  systemctl list-unit-files "${APP_NAME}.service" >/dev/null 2>&1 || fail "systemd-Service fehlt: ${APP_NAME}.service"
}

trust_git_directory() {
  git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true
  ok "Git-Verzeichnis ist als sicher markiert: ${APP_DIR}"
}

backup_runtime_files() {
  local stamp backup_path
  stamp="$(date +%Y%m%d-%H%M%S)"
  backup_path="${BACKUP_DIR}/${APP_NAME}-${stamp}"
  log "Sichere Laufzeitdateien nach ${backup_path} ..."
  mkdir -p "${backup_path}"
  [[ -f "${APP_DIR}/.env.local" ]] && cp "${APP_DIR}/.env.local" "${backup_path}/.env.local"
  [[ -d "${APP_DIR}/.data" ]] && cp -a "${APP_DIR}/.data" "${backup_path}/.data"
  git -C "${APP_DIR}" rev-parse HEAD > "${backup_path}/revision.txt"
  chmod -R go-rwx "${backup_path}"
  RUNTIME_BACKUP_PATH="${backup_path}"
  ok "Backup erstellt."
}

env_value() {
  local key="$1"
  grep -E "^${key}=" "${APP_DIR}/.env.local" 2>/dev/null | tail -n 1 | cut -d= -f2- || true
}

require_environment() {
  local missing=()
  [[ -f "${APP_DIR}/.env.local" ]] || fail ".env.local fehlt. Stelle sie aus /var/backups/platzguide wieder her."
  [[ -n "$(env_value DATABASE_URL)" ]] || missing+=("DATABASE_URL")
  [[ -n "$(env_value AUTH_SECRET)" ]] || missing+=("AUTH_SECRET")
  [[ -n "$(env_value ADMIN_PASSWORD_HASH)" ]] || missing+=("ADMIN_PASSWORD_HASH")
  if [[ "${AUTO_REPAIR_DATABASE_ENV}" == "true" && "${missing[*]}" == "DATABASE_URL" && -f "${APP_DIR}/scripts/repair-database-env.sh" ]]; then
    warn "DATABASE_URL fehlt. Starte automatische PostgreSQL-Reparatur ..."
    APP_DIR="${APP_DIR}" APP_USER="${APP_USER}" bash "${APP_DIR}/scripts/repair-database-env.sh"
    missing=()
    [[ -n "$(env_value DATABASE_URL)" ]] || missing+=("DATABASE_URL")
    [[ -n "$(env_value AUTH_SECRET)" ]] || missing+=("AUTH_SECRET")
    [[ -n "$(env_value ADMIN_PASSWORD_HASH)" ]] || missing+=("ADMIN_PASSWORD_HASH")
  fi
  if (( ${#missing[@]} > 0 )); then
    printf '\033[1;31m[FEHLER]\033[0m Produktionsumgebung unvollständig: %s\n' "${missing[*]}" >&2
    printf 'Wiederherstellung prüfen:\n' >&2
    printf '  ls -lt %s\n' "${BACKUP_DIR}" >&2
    printf '  cp %s/<letztes-backup>/.env.local %s/.env.local\n' "${BACKUP_DIR}" "${APP_DIR}" >&2
    exit 1
  fi
  ok "Produktionsumgebung vollständig."
}

check_clean_tree() {
  if [[ -n "$(git -C "${APP_DIR}" status --porcelain)" ]]; then
    local stamp stash_output
    stamp="$(date +%Y%m%d-%H%M%S)"
    warn "Arbeitsbaum in ${APP_DIR} enthält lokale Änderungen."
    mkdir -p "${BACKUP_DIR}"
    git -C "${APP_DIR}" status --porcelain > "${BACKUP_DIR}/${APP_NAME}-local-changes-${stamp}.status"
    stash_output="$(git -C "${APP_DIR}" stash push --include-untracked -m "platzguide-auto-update-${stamp}" -- . ":(exclude).env.local" ":(exclude).data" ":(exclude)public/uploads" 2>&1 || true)"
    if [[ "${stash_output}" == *"No local changes to save"* ]]; then
      ok "Nur ignorierte Laufzeitdateien vorhanden; Git-Update kann fortfahren."
    else
      ok "Lokale Änderungen wurden sicher als Git-Stash abgelegt: platzguide-auto-update-${stamp}"
      ok "Statusliste: ${BACKUP_DIR}/${APP_NAME}-local-changes-${stamp}.status"
    fi
  fi
  ok "Git-Arbeitsbaum ist sauber."
}

fetch_update() {
  OLD_REV="$(git -C "${APP_DIR}" rev-parse HEAD)"
  log "Hole Updates von origin/${BRANCH} ..."
  git -C "${APP_DIR}" fetch origin "${BRANCH}"
  NEW_REV="$(git -C "${APP_DIR}" rev-parse "origin/${BRANCH}")"
  if [[ "${OLD_REV}" == "${NEW_REV}" ]]; then
    ok "Bereits aktuell: ${OLD_REV:0:8}"
    return 1
  fi
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
  ok "Update geladen: ${OLD_REV:0:8} → ${NEW_REV:0:8}"
}

needs_rebuild() {
  local current_revision env_revision
  [[ "${FORCE_REBUILD}" == "true" ]] && return 0
  current_revision="$(git -C "${APP_DIR}" rev-parse --short HEAD)"
  env_revision="$(grep -E '^NEXT_PUBLIC_APP_REVISION=' "${APP_DIR}/.env.local" 2>/dev/null | cut -d= -f2 || true)"
  [[ "${env_revision}" != "${current_revision}" ]]
}

run_migrations() {
  local url
  url="$(env_value DATABASE_URL)"
  if [[ -z "${url}" ]]; then
    warn "DATABASE_URL fehlt; PostgreSQL-Migration wird übersprungen."
    return
  fi
  if [[ ! -f "${APP_DIR}/scripts/migrate-postgres.sh" ]]; then
    warn "Migration-Script fehlt; überspringe PostgreSQL-Migration."
    return
  fi
  log "Führe PostgreSQL-Migrationen aus ..."
  DATABASE_URL="${url}" APP_DIR="${APP_DIR}" bash "${APP_DIR}/scripts/migrate-postgres.sh"
}

backup_database() {
  local url before after tenants_table_exists tenant_count
  [[ "${BACKUP_DATABASE_BEFORE_MIGRATION}" == "true" ]] || return 0
  url="$(env_value DATABASE_URL)"
  [[ -n "${url}" ]] || fail "DATABASE_URL fehlt; Datenbank-Backup nicht möglich."
  [[ -f "${APP_DIR}/scripts/backup-postgres.sh" ]] || fail "backup-postgres.sh fehlt."
  if command -v psql >/dev/null 2>&1; then
    tenants_table_exists="$(PGOPTIONS="-c app.platform_admin=true" psql "${url}" -At -c "SELECT to_regclass('public.tenants') IS NOT NULL" 2>/dev/null || printf "unknown")"
    if [[ "${tenants_table_exists}" != "t" ]]; then
      ok "Datenbank enthält noch keine Mandantentabelle; PostgreSQL-Backup vor Migration wird übersprungen."
      return 0
    fi
    tenant_count="$(PGOPTIONS="-c app.platform_admin=true" psql "${url}" -At -c "SELECT count(*) FROM tenants" 2>/dev/null || printf "unknown")"
    if [[ "${tenant_count}" == "0" ]]; then
      ok "Datenbank enthält noch keine Mandanten; PostgreSQL-Backup vor Migration wird übersprungen."
      return 0
    fi
  fi
  before="$(find "${BACKUP_DIR}" -maxdepth 1 -name "${APP_NAME}-*.dump" -print 2>/dev/null | sort | tail -n 1 || true)"
  log "Erstelle PostgreSQL-Backup vor Migration ..."
  DATABASE_URL="${url}" BACKUP_DIR="${BACKUP_DIR}" APP_NAME="${APP_NAME}" bash "${APP_DIR}/scripts/backup-postgres.sh"
  after="$(find "${BACKUP_DIR}" -maxdepth 1 -name "${APP_NAME}-*.dump" -print 2>/dev/null | sort | tail -n 1 || true)"
  DB_BACKUP_PATH="${after:-${before}}"
}

run_post_deploy_checks() {
  if [[ "${RUN_DEPLOY_HEALTHCHECK}" == "true" && -f "${APP_DIR}/scripts/deploy-healthcheck.sh" ]]; then
    log "Führe Deploy-Healthcheck aus ..."
    APP_DIR="${APP_DIR}" bash "${APP_DIR}/scripts/deploy-healthcheck.sh"
    return
  fi
  if [[ "${RUN_SMOKE_TEST}" == "true" && -f "${APP_DIR}/scripts/smoke-test.sh" ]]; then
    log "Führe Smoke-Test aus ..."
    APP_DIR="${APP_DIR}" bash "${APP_DIR}/scripts/smoke-test.sh"
    return
  fi
  health_check
}

rollback() {
  ROLLBACK_IN_PROGRESS="true"
  warn "Starte automatischen Rollback auf ${OLD_REV:0:8} ..."
  if [[ -n "${RUNTIME_BACKUP_PATH}" && -f "${RUNTIME_BACKUP_PATH}/.env.local" ]]; then
    cp "${RUNTIME_BACKUP_PATH}/.env.local" "${APP_DIR}/.env.local"
    chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env.local"
    chmod 600 "${APP_DIR}/.env.local"
    ok ".env.local aus Backup wiederhergestellt."
  fi
  git -C "${APP_DIR}" checkout "${OLD_REV}"
  sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && npm ci"
  sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && npm run build"
  systemctl restart "${APP_NAME}.service"
  sleep 2
  if [[ -f "${APP_DIR}/scripts/smoke-test.sh" ]]; then
    APP_DIR="${APP_DIR}" bash "${APP_DIR}/scripts/smoke-test.sh"
  else
    local rollback_port
    rollback_port="$(env_value PORT)"
    rollback_port="${rollback_port:-3000}"
    curl -fsS "http://127.0.0.1:${rollback_port}/api/health" >/dev/null \
      || fail "Rollback ausgeführt, aber Healthcheck schlägt fehl. Prüfe journalctl -u ${APP_NAME} -n 120 --no-pager"
  fi
  ok "Rollback erfolgreich."
}

install_and_build() {
  log "Installiere Abhängigkeiten mit npm ci ..."
  sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && npm ci"
  if [[ "${RUN_VERIFY}" == "true" ]]; then
    log "Führe vollständige Prüfung aus ..."
    sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && npm run verify"
  else
    log "Baue Anwendung ..."
    sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && npm run build"
  fi
  ok "Build erfolgreich."
}

write_revision() {
  local revision
  revision="$(git -C "${APP_DIR}" rev-parse --short HEAD)"
  if [[ -f "${APP_DIR}/.env.local" ]]; then
    if grep -q '^NEXT_PUBLIC_APP_REVISION=' "${APP_DIR}/.env.local"; then
      sed -i "s/^NEXT_PUBLIC_APP_REVISION=.*/NEXT_PUBLIC_APP_REVISION=${revision}/" "${APP_DIR}/.env.local"
    else
      printf '\nNEXT_PUBLIC_APP_REVISION=%s\n' "${revision}" >> "${APP_DIR}/.env.local"
    fi
    chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env.local"
    chmod 600 "${APP_DIR}/.env.local"
    ok "Revision in .env.local aktualisiert: ${revision}"
  fi
}

restart_service() {
  log "Starte Service neu ..."
  systemctl restart "${APP_NAME}.service"
  sleep 2
  systemctl is-active --quiet "${APP_NAME}.service" || fail "Service läuft nach Update nicht. Prüfe: journalctl -u ${APP_NAME} -n 100"
  ok "Service läuft."
}

health_check() {
  local port
  port="$(grep -E '^PORT=' "${APP_DIR}/.env.local" 2>/dev/null | cut -d= -f2 || true)"
  port="${port:-3000}"
  log "Prüfe HTTP-Antwort auf Port ${port} ..."
  if curl -fsS "http://127.0.0.1:${port}/api/health" >/dev/null; then
    ok "App antwortet lokal."
  else
    fail "App antwortet nicht auf http://127.0.0.1:${port}"
  fi
}

main() {
  require_root
  require_layout
  trust_git_directory
  check_clean_tree
  backup_runtime_files
  require_environment
  if fetch_update; then
    require_environment
    backup_database
    run_migrations
    install_and_build
    write_revision
    restart_service
    run_post_deploy_checks
    ok "Update abgeschlossen."
  elif needs_rebuild; then
    warn "Code ist bereits aktuell, aber Build/Revision passt nicht. Baue neu ..."
    backup_database
    run_migrations
    install_and_build
    write_revision
    restart_service
    run_post_deploy_checks
    ok "Rebuild abgeschlossen."
  else
    ok "Kein Update notwendig."
  fi
}

main "$@"
