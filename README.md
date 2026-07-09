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
- DSGVO-Einwilligung ohne vorangekreuzte optionale Dienste
- Separater Adminbereich unter `/admin`
- Stationseditor sowie Einstellungen für Branding, Module und Rechtstexte
- Persistente Stationsänderungen mit PostgreSQL-Adapter und lokaler Entwicklungsablage
- CSV-/XLSX-Import mit Vorschau und Zeilenvalidierung
- Persistente Verwaltung von Kategorien, Medien, Rechtstexten, Branding,
  Kartenquellen, E-Mail, Tracking und Funktionsmodulen
- Optionale Module: Veranstaltungen, Rundgänge, Platzguide-Pass, Feedback,
  Check-ins, Statusanzeigen und digitale Gästemappe
- Rollenmodell für Plattform-Admin, Betreiber, Bearbeiter und Leser
- Datenschutzfunktionen für Mandantenexport und protokollierte Löschanfragen
- Healthcheck unter `/api/health` für Monitoring und Deployments
- Self-Service mit Rate-Limit und starkem Betreiber-Passwort vorbereitet
- Ein Plattform-Admin: `admin@schellenberger.biz`
- Tenant-Kontext in jeder Anfrage und PostgreSQL-RLS als zweite Schutzschicht
- Revisionsnummer im Footer, bei jedem GitHub-Actions-Lauf automatisch erhöht

## Schnellstart

Voraussetzungen: Node.js 22 und npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Danach:

- Besucher-App: `http://localhost:3000`
- Beispiel-Subdomain: `http://sonnental.localhost:3000`
- Admin: `http://localhost:3000/admin`
- Lokales Entwicklungspasswort: `platzguide-admin`

Für Produktion muss `ADMIN_PASSWORD_HASH` gesetzt werden:

```bash
node -e "require('bcryptjs').hash(process.argv[1], 12).then(console.log)" "DEIN-SEHR-SICHERES-PASSWORT"
```

## Architektur

```text
Browser
  └─ Domain/Subdomain
      └─ Next.js Middleware → Tenant-Kontext
          ├─ Besucher-App
          ├─ Admin-Authentifizierung
          └─ Server-Datenzugriff → tenantId-Filter
                                  → PostgreSQL Row-Level Security
```

Die Anwendung verwendet niemals vom Browser übermittelte `tenantId`-Werte als
Vertrauensanker. Der Mandant wird serverseitig aus dem Hostnamen aufgelöst.
Jede Datenoperation muss anschließend über eine tenantgebundene
Transaktion laufen. PostgreSQL erzwingt die Isolation zusätzlich per RLS.

Weitere Entscheidungen: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)  
Karten und Luftbilder: [`docs/MAPS.md`](docs/MAPS.md)  
Deployment: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)  
Sicherheit: [`SECURITY.md`](SECURITY.md)  
Geplanter Ausbau: [`ROADMAP.md`](ROADMAP.md)

## Revisionen

`.github/workflows/ci.yml` setzt bei jedem Push
`NEXT_PUBLIC_APP_REVISION` auf `<branch>.<GitHub run number>`. Die Build-Zeit-
Variable erscheint automatisch im Footer. Ein Hosting-Deployment sollte
denselben Wert übernehmen; bei Vercel kann alternativ die Commit-ID als
Umgebungsvariable gemappt werden.

## Produktionshinweise

- Rechtstexte, Kartenanbieter und Tracking müssen je Mandant geprüft werden.
- Für kommerzielle Nutzung ist eine separate schriftliche Lizenz erforderlich.
- Eigene Platzpläne können aktuell per URL referenziert werden; Upload und
  grafische Vierpunkt-Kalibrierung sind als nächster Ausbauschritt vorgesehen.
- Öffentliche Selbstregistrierung ist standardmäßig deaktiviert
  (`ALLOW_PUBLIC_SIGNUP=false`), bis E-Mail-Verifikation, Rate-Limits und
  Nutzungsbedingungen produktiv eingerichtet sind.
- Medien werden aktuell als geprüfte externe URLs gespeichert. Binär-Uploads
  brauchen vor Produktion Storage-Signaturen, Größenlimits und optionalen
  Virenscan.

## Qualität

```bash
npm run lint
npm test
npm run build
npm run verify
```

## Ubuntu-Server

Für eigene Ubuntu-/Debian-Server gibt es geprüfte Skripte:

```bash
sudo bash scripts/install-ubuntu.sh
sudo bash /opt/platzguide/scripts/update-ubuntu.sh
```

Details und Optionen stehen in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Mitwirken

Fehlerberichte und nicht-kommerzielle Beiträge sind willkommen. Bitte zuerst
`CONTRIBUTING.md` lesen. Kommerzielle Nutzung erfordert eine separate
schriftliche Lizenz von Michael Schellenberger.
