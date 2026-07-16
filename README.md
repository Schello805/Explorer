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
- Individuelles Branding und Rechtstexte je Mandant unter `/c/{link-kuerzel}`
- PWA-Manifest, Service Worker und Offline-Fallback
- Separater Adminbereich unter `/admin`
- Stationseditor sowie Einstellungen für Branding, Module und Rechtstexte
- Persistente Stationsänderungen mit PostgreSQL-Adapter
- CSV-/XLSX-Import mit Vorschau und Zeilenvalidierung
- Persistente Verwaltung von Kategorien, Medien, Rechtstexten, Branding,
  Kartenquellen, E-Mail, Tracking und Funktionsmodulen
- Optionale Module: Veranstaltungen, Rundgänge, Platzguide-Pass, Feedback,
  Check-ins, Statusanzeigen und digitale Gästemappe
- Web-Push-Abos und serverseitige Check-ins mandantengebunden
- Feedback mit optionalem Kontakt, Bild/PDF-Anhang und E-Mail an Mandantenadmins
- Healthcheck unter `/api/health` für Monitoring und Deployments
- Plattform-Admin mit Systemlog-, Auditlog-, Monitoring- und Upload-Cleanup-Ansicht
- Uptime-Check mit SMTP-Alarm an den Plattform-Admin
- E-Mail-Verifikation per SMTP vorbereitet
- Mailprovider: klassisches SMTP
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

Das Installationsskript richtet Node.js, PostgreSQL, Abhängigkeiten, Build,
`systemd`, optional Nginx und den Plattform-Admin
`admin@schellenberger.biz` ein. Das Admin-Passwort wird während der
Installation abgefragt oder per `ADMIN_PASSWORD=...` gesetzt.

Details und Optionen stehen in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Dokumentation

- Architektur: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Karten und Luftbilder: [`docs/MAPS.md`](docs/MAPS.md)
- Deployment: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- Workflows: [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md)
- Geplanter Ausbau: [`ROADMAP.md`](ROADMAP.md)

## Revisionen

`.github/workflows/ci.yml` setzt bei jedem Push
`NEXT_PUBLIC_APP_REVISION` auf eine numerische Vor-1.0-Version wie `0.152`.
Das Ubuntu-Updatescript setzt denselben Stil aus der Git-Commit-Anzahl. Die
Build-Zeit-Variable erscheint automatisch im Footer.

## Produktionshinweise

- Für kommerzielle Nutzung ist eine separate schriftliche Lizenz erforderlich.
- Neue Mandanten laufen standardmäßig ohne Wildcard-DNS unter
  `https://platzguide.de/c/{link-kuerzel}`.
- Eigene Domains können im Pro-Paket beim Mandanten hinterlegt werden. DNS/TLS
  wird am Reverse Proxy eingerichtet, Platzguide löst den Host dann dem
  richtigen Mandanten zu.
- SMTP, Captcha, Upload-Limit und Self-Service werden per Server-Konfiguration
  gesetzt; Details stehen in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Mitwirken

Fehlerberichte und nicht-kommerzielle Beiträge sind willkommen. Bitte zuerst
`CONTRIBUTING.md` lesen. Kommerzielle Nutzung erfordert eine separate
schriftliche Lizenz von Michael Schellenberger.
