#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-platzguide}"
APP_USER="${APP_USER:-platzguide}"
APP_DIR="${APP_DIR:-/opt/platzguide}"
BRANCH="${BRANCH:-main}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/platzguide}"
RUN_VERIFY="${RUN_VERIFY:-true}"
FORCE_REBUILD="${FORCE_REBUILD:-false}"

log() { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[FEHLER]\033[0m %s\n' "$*" >&2; exit 1; }

OLD_REV=""
NEW_REV=""

on_error() {
  printf '\n\033[1;31m[FEHLER]\033[0m Update abgebrochen.\n' >&2
  if [[ -n "${OLD_REV}" ]]; then
    printf 'Rollback bei Bedarf:\n' >&2
    printf '  cd %s\n' "${APP_DIR}" >&2
    printf '  git checkout %s\n' "${OLD_REV}" >&2
    printf '  npm ci\n' >&2
    printf '  npm run build\n' >&2
    printf '  systemctl restart %s\n' "${APP_NAME}" >&2
  fi
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
  ok "Backup erstellt."
}

check_clean_tree() {
  if [[ -n "$(git -C "${APP_DIR}" status --porcelain)" ]]; then
    fail "Arbeitsbaum in ${APP_DIR} ist nicht sauber. Bitte lokale Änderungen sichern oder committen."
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
  if fetch_update; then
    install_and_build
    write_revision
    restart_service
    health_check
    ok "Update abgeschlossen."
  elif needs_rebuild; then
    warn "Code ist bereits aktuell, aber Build/Revision passt nicht. Baue neu ..."
    install_and_build
    write_revision
    restart_service
    health_check
    ok "Rebuild abgeschlossen."
  else
    ok "Kein Update notwendig."
  fi
}

main "$@"
