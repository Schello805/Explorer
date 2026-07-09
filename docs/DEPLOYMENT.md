# Deployment

## Benötigte Dienste

- Node.js-Hosting für Next.js
- PostgreSQL 16 oder neuer
- DNS mit Wildcard-Eintrag `*.app-domain.de`
- Objektspeicher für Bilder (später)
- TLS-Zertifikat für Haupt- und Wildcard-Domain

## Produktionsvariablen

Alle Werte aus `.env.example` werden serverseitig gesetzt. Verpflichtend sind
ein zufälliges `AUTH_SECRET`, der bcrypt-Hash des Admin-Passworts,
`DATABASE_URL`, GitHub-URL und Revisionsnummer.

`ALLOW_PUBLIC_SIGNUP` bleibt in Produktion standardmäßig `false`. Erst nach
E-Mail-Verifikation, Rate-Limit, Nutzungsbedingungen und Missbrauchsschutz darf
öffentliche Selbstregistrierung aktiviert werden.

## Datenbank

1. Eigene Application-DB-Rolle ohne `SUPERUSER` und ohne `BYPASSRLS` anlegen.
2. `database/schema.sql` anwenden.
3. Pro Request eine Transaktion öffnen.
4. Darin `set_config('app.tenant_id', tenantId, true)` setzen.
5. Erst danach Queries ausführen.

## Domains

Der Load Balancer muss den originalen `Host`-Header unverändert an Next.js
weitergeben. Benutzerdefinierte Domains werden in `tenants.hosts` hinterlegt.
Unbekannte Hosts müssen vor Produktion auf eine neutrale Plattformseite führen.

## Revision

Der CI-Workflow erzeugt bei jedem Push eine höhere GitHub-Run-Nummer. Das
Deployment muss den verifizierten Build-Artefakt verwenden oder
`NEXT_PUBLIC_APP_REVISION` identisch setzen.

## Ubuntu-Installation

Für einen eigenen Ubuntu-Server liegen fertige Skripte im Ordner `scripts`.
Sie prüfen Betriebssystem, Rechte, Node.js, Git, Build, systemd und optional
Nginx/PostgreSQL. Alle Schritte geben klare Statusmeldungen aus.

### Minimal mit externer Datenbank

```bash
sudo APP_DIR=/opt/platzguide \
  DOMAIN=example.org \
  ADMIN_PASSWORD='sehr-sicheres-passwort' \
  DATABASE_URL='postgresql://user:pass@db-host:5432/platzguide' \
  bash scripts/install-ubuntu.sh
```

### Mit lokalem PostgreSQL

```bash
sudo INSTALL_POSTGRES=true \
  DB_PASSWORD='langes-db-passwort' \
  DOMAIN=example.org \
  ADMIN_PASSWORD='sehr-sicheres-passwort' \
  bash scripts/install-ubuntu.sh
```

Wichtige Optionen:

- `APP_DIR`: Zielordner, Standard `/opt/platzguide`
- `APP_USER`: Systembenutzer, Standard `platzguide`
- `DOMAIN`: Nginx-Domain oder `_` für alle Hosts
- `PORT`: interner Next.js-Port, Standard `3000`
- `INSTALL_NGINX=false`: Nginx nicht installieren
- `INSTALL_POSTGRES=true`: PostgreSQL lokal installieren
- `ADMIN_PASSWORD`: erzeugt automatisch den bcrypt-Hash

Nach der Installation:

```bash
systemctl status platzguide
journalctl -u platzguide -f
```

## Ubuntu-Updates

Das Updatescript erstellt ein Backup von `.env.local` und `.data`, prüft den
Git-Arbeitsbaum, lädt Updates per Fast-Forward, baut die App neu, aktualisiert
`NEXT_PUBLIC_APP_REVISION` und startet den Service neu.

```bash
sudo bash /opt/platzguide/scripts/update-ubuntu.sh
```

Optionen:

- `APP_DIR=/opt/platzguide`
- `APP_NAME=platzguide`
- `BRANCH=main`
- `RUN_VERIFY=false` für nur `npm run build` statt vollständiger Prüfung
- `BACKUP_DIR=/var/backups/platzguide`
