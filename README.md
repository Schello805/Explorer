# Platzguide

Eine moderne, mandantenfähige Campingplatz-Web-App und PWA. Eine gemeinsame
Codebasis versorgt beliebig viele Campingplätze; Branding, Inhalte und Daten
bleiben je Mandant getrennt.

> **Lizenzhinweis:** Der Quellcode ist öffentlich einsehbar und für
> nicht-kommerzielle Zwecke frei nutzbar. Wegen des Verbots kommerzieller
> Nutzung ist Platzguide im formalen OSI-Sinn **Source Available**, nicht Open
> Source. Details stehen in `LICENSE`.

## MVP-Funktionen

- Mobile-first Besucher-App mit interaktiver Platzkarte und Stationsliste
- Freie MapLibre-Karte mit Zoom, GPS und präzisen Stationsmarkern
- Optionale regionale Luftbilder und eigener georeferenzierter Platzplan
- Suche, Kategorien, Stationsdetails, Favoriten und externe Navigation
- Individuelles Branding und Rechtstexte anhand der Domain/Subdomain
- PWA-Manifest, Service Worker und Offline-Fallback
- Separater Adminbereich unter `/admin`
- Stationseditor sowie Einstellungen für Branding, Module und Rechtstexte
- Persistente Stationsänderungen mit PostgreSQL-Adapter
- CSV-/XLSX-Import mit Vorschau und Zeilenvalidierung
- Persistente Verwaltung von Kategorien, Medien, Rechtstexten, Branding,
  Kartenquellen, E-Mail, Tracking und Funktionsmodulen
- Optionale Module: Veranstaltungen, Rundgänge, Platzguide-Pass, Feedback,
  Check-ins, Statusanzeigen und digitale Gästemappe
- Healthcheck unter `/api/health` für Monitoring und Deployments
- E-Mail-Verifikation per Webhook oder Mailprovider vorbereitet
- Mailprovider: Webhook, Resend, Brevo oder Mailgun
- Captcha: Cloudflare Turnstile oder hCaptcha
- Uploads mit Tenant-Pfad, Größenlimit und MIME-Prüfung
- Platzplan-Upload mit Vierpunkt-Kalibrierung
- Ein Plattform-Admin: `admin@schellenberger.biz`
- Revisionsnummer im Footer, bei jedem GitHub-Actions-Lauf automatisch erhöht

## Installation

```bash
sudo bash scripts/install-ubuntu.sh
sudo bash /opt/platzguide/scripts/update-ubuntu.sh
```

Das Installationsskript richtet Node.js, Abhängigkeiten, Build, `systemd`,
optional Nginx/PostgreSQL und den Plattform-Admin
`admin@schellenberger.biz` ein. Das Admin-Passwort wird während der
Installation abgefragt oder per `ADMIN_PASSWORD=...` gesetzt.

Details und Optionen stehen in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Dokumentation

- Architektur: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Karten und Luftbilder: [`docs/MAPS.md`](docs/MAPS.md)
- Deployment: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- Geplanter Ausbau: [`ROADMAP.md`](ROADMAP.md)

## Revisionen

`.github/workflows/ci.yml` setzt bei jedem Push
`NEXT_PUBLIC_APP_REVISION` auf `<branch>.<GitHub run number>`. Die Build-Zeit-
Variable erscheint automatisch im Footer. Ein Hosting-Deployment sollte
denselben Wert übernehmen; bei Vercel kann alternativ die Commit-ID als
Umgebungsvariable gemappt werden.

## Produktionshinweise

- Für kommerzielle Nutzung ist eine separate schriftliche Lizenz erforderlich.
- Subdomains können per Wildcard-DNS automatisch funktionieren.
- Für automatische echte DNS-Einträge ist später eine DNS-Provider-Anbindung
  nötig.
- Mail, Captcha, Upload-Limit und Self-Service werden per Server-Konfiguration
  gesetzt; Details stehen in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Mitwirken

Fehlerberichte und nicht-kommerzielle Beiträge sind willkommen. Bitte zuerst
`CONTRIBUTING.md` lesen. Kommerzielle Nutzung erfordert eine separate
schriftliche Lizenz von Michael Schellenberger.
