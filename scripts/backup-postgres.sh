#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-platzguide}"
DATABASE_URL="${DATABASE_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/platzguide}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

fail() { printf '\033[1;31m[FEHLER]\033[0m %s\n' "$*" >&2; exit 1; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }

[[ -n "${DATABASE_URL}" ]] || fail "DATABASE_URL fehlt."
command -v pg_dump >/dev/null 2>&1 || fail "pg_dump fehlt."

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"
target="${BACKUP_DIR}/${APP_NAME}-$(date +%Y%m%d-%H%M%S).dump"
PGOPTIONS="-c app.platform_admin=true" pg_dump --enable-row-security --format=custom --no-owner --no-acl "${DATABASE_URL}" --file "${target}"
find "${BACKUP_DIR}" -name "${APP_NAME}-*.dump" -mtime "+${RETENTION_DAYS}" -delete
ok "Backup erstellt: ${target}"
