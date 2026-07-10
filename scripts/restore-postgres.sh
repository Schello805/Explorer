#!/usr/bin/env bash
set -Eeuo pipefail

DATABASE_URL="${DATABASE_URL:-}"
BACKUP_FILE="${1:-}"

fail() { printf '\033[1;31m[FEHLER]\033[0m %s\n' "$*" >&2; exit 1; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }

[[ -n "${DATABASE_URL}" ]] || fail "DATABASE_URL fehlt."
[[ -n "${BACKUP_FILE}" && -f "${BACKUP_FILE}" ]] || fail "Backup-Datei fehlt. Nutzung: restore-postgres.sh /pfad/backup.dump"
command -v pg_restore >/dev/null 2>&1 || fail "pg_restore fehlt."

printf 'Restore überschreibt Daten in der Ziel-Datenbank. Tippe RESTORE zum Fortfahren: '
read -r confirmation
[[ "${confirmation}" == "RESTORE" ]] || fail "Restore abgebrochen."

pg_restore --clean --if-exists --no-owner --no-acl --dbname "${DATABASE_URL}" "${BACKUP_FILE}"
ok "Restore abgeschlossen."
