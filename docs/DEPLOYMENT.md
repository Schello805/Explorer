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

Für Betreiber-Registrierungen muss `MAIL_WEBHOOK_URL` auf einen transaktionalen
Maildienst zeigen. Ohne diesen Wert werden E-Mails nur lokal in
`.data/mail-outbox.json` abgelegt.

Unterstützte Mailprovider:

- `MAIL_PROVIDER=resend` mit `RESEND_API_KEY`
- `MAIL_PROVIDER=brevo` mit `BREVO_API_KEY`
- `MAIL_PROVIDER=mailgun` mit `MAILGUN_API_KEY` und `MAILGUN_DOMAIN`
- `MAIL_PROVIDER=webhook` mit `MAIL_WEBHOOK_URL`

Öffentliche Registrierung sollte zusätzlich per Captcha geschützt werden:

- `CAPTCHA_PROVIDER=turnstile`
- `CAPTCHA_PROVIDER=hcaptcha`
- `NEXT_PUBLIC_CAPTCHA_SITE_KEY`
- `TURNSTILE_SECRET_KEY` oder `HCAPTCHA_SECRET_KEY`

Monitoring kann `/api/health` abfragen. Der Endpunkt liefert App-Name,
Revision, Mandantenanzahl und Latenz oder Status `503`, wenn der Datenzugriff
fehlschlägt.

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

## Uploads und Platzpläne

Lokale Uploads landen unter `public/uploads/<tenantId>/`. Erlaubte MIME-Typen
und maximale Dateigröße sind pro Mandant im Adminpanel unter `Integrationen`
verwaltbar. Platzpläne können im Bereich `Campingplätze` hochgeladen und über
vier Eckpunkte georeferenziert werden.

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
- `NEXT_PUBLIC_BASE_URL`: öffentliche Basis-URL; wird sonst aus `DOMAIN`
  abgeleitet oder bei `DOMAIN=_` automatisch auf die Server-IP gesetzt
- `ALLOW_PUBLIC_SIGNUP=true`: Self-Service-Registrierung aktivieren
- `MAIL_PROVIDER`: `outbox`, `webhook`, `resend`, `brevo` oder `mailgun`
- `MAIL_FROM`, `MAIL_FROM_NAME`, `MAIL_LOGO_URL`, `MAIL_WEBHOOK_URL`
- `RESEND_API_KEY`, `BREVO_API_KEY`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`
- `CAPTCHA_PROVIDER`: `disabled`, `turnstile` oder `hcaptcha`
- `NEXT_PUBLIC_CAPTCHA_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `HCAPTCHA_SECRET_KEY`
- `UPLOAD_MAX_MB`: Upload-Größenlimit, Standard `10`

Klassisches SMTP per Host/Port/User ist aktuell nicht direkt eingebaut. Für
Mailversand nutzt Platzguide Transaktionsmail-Anbieter oder einen eigenen
Webhook.

Nach der Installation:

```bash
systemctl status platzguide
journalctl -u platzguide -f
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
Git-Arbeitsbaum, lädt Updates per Fast-Forward, baut die App neu, aktualisiert
`NEXT_PUBLIC_APP_REVISION` und startet den Service neu.

```bash
sudo bash /opt/platzguide/scripts/update-ubuntu.sh
```

Optionen:

- `APP_DIR=/opt/platzguide`
- `APP_NAME=platzguide`
- `BRANCH=main`
- `FORCE_REBUILD=true`, wenn Code schon gepullt wurde, aber Build/Service neu erstellt werden soll
- `RUN_VERIFY=false` für nur `npm run build` statt vollständiger Prüfung
- `BACKUP_DIR=/var/backups/platzguide`

Admin-Passwort zurücksetzen:

```bash
sudo bash /opt/platzguide/scripts/reset-admin-password.sh
```

Mit sichtbarer Eingabe zur Kontrolle:

```bash
sudo SHOW_PASSWORD=true bash /opt/platzguide/scripts/reset-admin-password.sh
```
