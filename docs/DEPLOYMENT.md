# Deployment

## Benötigte Dienste

- Node.js-Hosting für Next.js
- PostgreSQL 16 oder neuer
- DNS für die Hauptdomain, z. B. `platzguide.de`; Wildcard-DNS ist für Standard-Mandanten nicht nötig
- Objektspeicher für Bilder (später)
- TLS-Zertifikat für die Hauptdomain, z. B. `platzguide.de` und `www.platzguide.de`

## Produktionsvariablen

Alle Werte aus `.env.example` werden serverseitig gesetzt. Verpflichtend sind
ein zufälliges `AUTH_SECRET`, der bcrypt-Hash des Admin-Passworts,
`DATABASE_URL`, GitHub-URL und Revisionsnummer.

`ALLOW_PUBLIC_SIGNUP` bleibt in Produktion standardmäßig `false`. Erst nach
E-Mail-Verifikation, Rate-Limit, Nutzungsbedingungen und Missbrauchsschutz darf
öffentliche Selbstregistrierung aktiviert werden.

Für Betreiber-Registrierungen muss SMTP eingerichtet sein. Platzguide nutzt
keine Provider-spezifischen APIs, sondern ausschließlich `SMTP_HOST`,
`SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`,
`MAIL_FROM_NAME` und optional `MAIL_LOGO_URL`.
Diese SMTP-Zugangsdaten gelten global für die Plattform und werden nicht pro
Mandant gespeichert. Auch Absendername und Absenderadresse sind zentral.
E-Mails gehen ausschließlich an Mandanten-Admins; Besucher erhalten keine
E-Mails.

Alte Variablen wie `MAIL_PROVIDER`, `MAIL_WEBHOOK_URL`, `RESEND_API_KEY`,
`BREVO_API_KEY` oder `MAILGUN_API_KEY` werden ignoriert. Ohne `SMTP_HOST` und
`MAIL_FROM` kann Platzguide keine E-Mails versenden.

Öffentliche Registrierung sollte zusätzlich per Captcha geschützt werden:

- `CAPTCHA_PROVIDER=turnstile`
- `CAPTCHA_PROVIDER=hcaptcha`
- `CAPTCHA_PROVIDER=recaptcha`
- `NEXT_PUBLIC_CAPTCHA_SITE_KEY`
- `TURNSTILE_SECRET_KEY`, `HCAPTCHA_SECRET_KEY` oder `RECAPTCHA_SECRET_KEY`

Monitoring kann `/api/health` abfragen. Der Endpunkt liefert App-Name,
Revision, Mandantenanzahl und Latenz oder Status `503`, wenn der Datenzugriff
fehlschlägt. Für aktive Alarmierung per E-Mail gibt es zusätzlich
`/api/monitoring/uptime`. In Produktion muss dafür `MONITORING_SECRET` gesetzt
sein; Fehler werden gedrosselt an `ADMIN_EMAIL` gesendet.

## Datenbank

1. Eigene Application-DB-Rolle ohne `SUPERUSER` und ohne `BYPASSRLS` anlegen.
2. `database/schema.sql` anwenden.
3. Pro Request eine Transaktion öffnen.
4. Darin `set_config('app.tenant_id', tenantId, true)` setzen.
5. Erst danach Queries ausführen.

Die Tabellen `tenant_users`, `media_assets`, `privacy_requests`, `stations`
und `audit_log` sind tenantgebunden und per RLS geschützt.

Migration und RLS-Test:

```bash
sudo DATABASE_URL='postgresql://...' APP_DIR=/opt/platzguide \
  bash /opt/platzguide/scripts/migrate-postgres.sh

sudo DATABASE_URL='postgresql://...' \
  bash /opt/platzguide/scripts/test-postgres-rls.sh
```

## Backups und Restore

```bash
sudo DATABASE_URL='postgresql://...' \
  BACKUP_DIR=/var/backups/platzguide \
  bash /opt/platzguide/scripts/backup-postgres.sh

sudo DATABASE_URL='postgresql://...' \
  bash /opt/platzguide/scripts/restore-postgres.sh /var/backups/platzguide/platzguide-YYYYmmdd-HHMMSS.dump
```

Für automatische Backups kann das Backup-Skript per systemd timer oder Cron
täglich ausgeführt werden. Restore sollte nach jedem Infrastrukturwechsel einmal
in einer Testdatenbank geprüft werden.
Das Backup-Skript setzt beim Dump den Plattform-RLS-Kontext, damit Tabellen mit
`FORCE ROW LEVEL SECURITY` vollständig gesichert werden.

## Uploads und Platzpläne

Lokale Uploads landen unter `public/uploads/<tenantId>/`. Erlaubte MIME-Typen
und maximale Dateigröße sind pro Mandant im Adminpanel unter `Integrationen`
verwaltbar. Platzpläne können im Bereich `Campingplätze` hochgeladen und über
vier Eckpunkte georeferenziert werden.

Nicht mehr referenzierte Upload-Dateien können im Plattform-Admin geprüft und
gelöscht werden. Für automatische Wartung setzt du `MAINTENANCE_SECRET` und
rufst z. B. per Cron auf:

```bash
MAINTENANCE_SECRET='...' DRY_RUN=false \
  bash /opt/platzguide/scripts/cleanup-uploads.sh
```

## Analytics

Matomo kann pro Mandant im Adminbereich unter `Integrationen` aktiviert werden.
Dazu werden Matomo-URL und Site-ID des jeweiligen Campingplatzes hinterlegt.
Das Tracking wird in der Besucher-App nur geladen, wenn der Mandant Matomo
aktiviert hat und Besucher im Consent-Banner „Alle akzeptieren“ wählen.

## Abo-Automatisierung

Die aktuelle Version unterstützt manuelle Pakete, Status und Freischaltung im
Adminbereich. Für automatische Freischaltung, Rechnungen und Kündigungen sollte
später ein Zahlungsanbieter mit Kundenportal und Webhooks angebunden werden,
z. B. Stripe Billing, Mollie Subscriptions oder Paddle. Der Webhook setzt dann
serverseitig `billing.status`, `billing.publicEnabled`, Paket, Speicherlimit
und Rechnungsstatus. Die Besucher-App darf niemals allein aufgrund von
Frontend-Daten freigeschaltet werden.

## Domains

Der Load Balancer muss den originalen `Host`-Header unverändert an Next.js
weitergeben. Benutzerdefinierte Domains werden in `tenants.hosts` hinterlegt.
Unbekannte Hosts müssen vor Produktion auf eine neutrale Plattformseite führen.

## Revision

Die öffentliche Revision ist eine numerische Vor-1.0-Version, z. B. `0.152`.
GitHub Actions setzt dafür `0.<run_number>`, das Ubuntu-Updatescript setzt
`0.<git-commit-anzahl>`. Es werden keine Git-Hashes im Footer angezeigt.

## Ubuntu-Installation

Für einen eigenen Ubuntu-Server liegen fertige Skripte im Ordner `scripts`.
Sie prüfen Betriebssystem, Rechte, Node.js, Git, Build, PostgreSQL, systemd und
optional Nginx. Alle Schritte geben klare Statusmeldungen aus.

Das Installationsskript richtet den Plattform-Admin automatisch ein:

- Standard-E-Mail: `admin@schellenberger.biz`
- Interaktiv: Passwort wird während der Installation abgefragt
- Automatisiert: `ADMIN_PASSWORD='...'` vorgeben
- Ohne Terminal-Eingabe: ein einmaliges Passwort wird generiert und am Ende angezeigt

### Standardinstallation mit lokaler Datenbank

```bash
sudo APP_DIR=/opt/platzguide \
  DOMAIN=example.org \
  ADMIN_PASSWORD='sehr-sicheres-passwort' \
  bash scripts/install-ubuntu.sh
```

### Mit externer Datenbank

```bash
sudo INSTALL_POSTGRES=false \
  DATABASE_URL='postgresql://user:pass@db-host:5432/platzguide' \
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
- `INSTALL_POSTGRES=true`: PostgreSQL lokal installieren, Standard `true`
- `INSTALL_POSTGRES=false`: externe Datenbank über `DATABASE_URL` verwenden
- `ADMIN_PASSWORD`: erzeugt automatisch den bcrypt-Hash
- `ADMIN_EMAIL`: Admin-Adresse, Standard `admin@schellenberger.biz`
- `MONITORING_SECRET`: geheimer Token für `/api/monitoring/uptime`
- `MAINTENANCE_SECRET`: geheimer Token für automatische Wartung
- `NEXT_PUBLIC_BASE_URL`: öffentliche Basis-URL; wird sonst aus `DOMAIN`
  abgeleitet oder bei `DOMAIN=_` automatisch auf die Server-IP gesetzt
- `ALLOW_PUBLIC_SIGNUP=true`: Self-Service-Registrierung aktivieren
- `MAIL_FROM`, `MAIL_FROM_NAME`, `MAIL_LOGO_URL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`
- `CAPTCHA_PROVIDER`: `disabled`, `turnstile`, `hcaptcha` oder `recaptcha`
- `NEXT_PUBLIC_CAPTCHA_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `HCAPTCHA_SECRET_KEY`, `RECAPTCHA_SECRET_KEY`
- `UPLOAD_MAX_MB`: Upload-Größenlimit, Standard `10`

Der Mailversand läuft ausschließlich über klassisches SMTP. Bei fehlender
SMTP-Konfiguration kann die Registrierung keine Bestätigungs-E-Mail versenden.

Nach der Installation:

```bash
systemctl status platzguide
journalctl -u platzguide -f
MONITORING_SECRET='...' bash /opt/platzguide/scripts/monitor-uptime.sh
```

Die App ist nach erfolgreichem Abschluss direkt startbereit. Das Skript prüft
abschließend `systemd`, die interne App und Nginx über `/api/health`.

Bei `DOMAIN=_` richtet das Skript Nginx als Default-Site ein. Der Zugriff per
Server-IP funktioniert dann direkt über Port `80`. Ein externer Reverse Proxy
sollte deshalb auf `http://SERVER-IP:80` zeigen, nicht auf den internen
Next.js-Port `3000`.

Falls nach einer bestehenden Installation noch die Nginx-Welcome-Seite
erscheint:

```bash
cd /opt/platzguide
sudo bash scripts/repair-nginx.sh
```

## Ubuntu-Updates

Das Updatescript erstellt ein Backup von `.env.local` und `.data`, prüft den
Git-Arbeitsbaum, prüft die Produktionsumgebung, erstellt vor Migrationen ein
PostgreSQL-Backup, führt Migrationen aus, baut die App neu, startet den Service,
führt Smoke-/Healthchecks aus und rollt bei Fehlern automatisch auf die vorige
Git-Revision zurück.

```bash
sudo bash /opt/platzguide/scripts/update-ubuntu.sh
```

Das Script lädt Git-Updates selbst. Bitte vorher kein manuelles `git pull`
ausführen; dadurch bleiben Abhängigkeitsprüfung, Revision und Fortschritt
eindeutig nachvollziehbar.

Während des Updates zeigt das Script nummerierte Schritte, laufende Dauer pro
Abschnitt und klare Hinweise für längere Phasen wie `npm ci` oder Build. Am
Ende werden Base URL, lokale Healthcheck-URL, Revision, Backup-Pfad und die
wichtigsten Service-Befehle ausgegeben.

Node-Abhängigkeiten werden über einen Lockfile-Hash unter `.deploy-state`
geprüft. `npm ci` läuft dadurch nur, wenn `package.json` oder
`package-lock.json` wirklich nicht zu den installierten Abhängigkeiten passen.
Der Installationsschritt nutzt bewusst `--include=dev`, weil Next.js beim
Produktionsbuild TypeScript-, ESLint- und Test-Typen aus `devDependencies`
benötigen kann.

Optionen:

- `APP_DIR=/opt/platzguide`
- `APP_NAME=platzguide`
- `BRANCH=main`
- `FORCE_REBUILD=true`, wenn Code schon gepullt wurde, aber Build/Service neu erstellt werden soll
- `RUN_VERIFY=false` für nur `npm run build` statt vollständiger Prüfung
- `BACKUP_DIR=/var/backups/platzguide`
- `RUN_SMOKE_TEST=true`: prüft `/api/health`, Startseite, Admin-Loginseite,
  Manifest und Hinweise
- `RUN_DEPLOY_HEALTHCHECK=true`: führt Smoke-Test plus optionalen Admin-Login aus
- `DEPLOY_ADMIN_PASSWORD=...`: aktiviert echten Admin-Login-Test beim Deployment
- `BACKUP_DATABASE_BEFORE_MIGRATION=true`: PostgreSQL-Dump vor Migrationen
- `AUTO_REPAIR_DATABASE_ENV=true`: fehlende lokale PostgreSQL-URL automatisch reparieren
- `FORCE_NPM_CI=true`: erzwingt Neuinstallation der Node-Abhängigkeiten
- `NPM_CI_TIMEOUT_SECONDS=900`: maximale Dauer für `npm ci`
- `SERVICE_READY_TIMEOUT_SECONDS=60`: maximale Wartezeit bis `/api/health`
  nach Neustart antwortet

Bei einer frischen, leeren Installation ohne Mandanten überspringt das
Updatescript den PostgreSQL-Dump vor Migrationen automatisch. Sobald mindestens
ein Mandant existiert, wird vor Migrationen wieder ein Datenbank-Backup erzeugt.

Admin-Passwort zurücksetzen:

```bash
sudo bash /opt/platzguide/scripts/reset-admin-password.sh
```

Mit sichtbarer Eingabe zur Kontrolle:

```bash
sudo SHOW_PASSWORD=true bash /opt/platzguide/scripts/reset-admin-password.sh
```

Das Script baut die App danach standardmäßig neu, damit der Hash im
Produktionsserver sicher übernommen wird. Für reine Diagnose kann
`REBUILD_APP=false` gesetzt werden.

PostgreSQL-Verbindung reparieren, falls `/api/health` den Status `503` liefert
und im Journal `DATABASE_URL fehlt` steht:

```bash
cd /opt/platzguide
sudo bash scripts/repair-database-env.sh
sudo systemctl restart platzguide
```
