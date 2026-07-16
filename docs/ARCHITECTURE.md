# Architektur

## Leitentscheidungen

1. **Ein deploybares System:** Keine Mandanten-Forks und keine individuellen Builds.
2. **Pfad als Mandantenschlüssel:** Standard-Mandanten laufen unter `/c/{slug}`; optionale eigene Domains bleiben möglich.
3. **Defense in Depth:** Service-Filter plus PostgreSQL Row-Level Security.
4. **Konfiguration statt Sondercode:** Farben, Module und Rechtstexte liegen am Mandanten.
5. **Serverseitige Geheimnisse:** Auth- und Datenbankgeheimnisse gelangen nie ins Frontend.
6. **Anbieterneutrale Karten:** MapLibre trennt Rendering, Kartendaten und eigene Platzpläne.

## Datenmodell

- `tenants`: Hostnamen, Branding, Kontakte, Module und externe Einstellungen
- `stations`: Orte, Status, Geodaten, Öffnungszeiten und lokalisierbare Inhalte
- `categories`: Frei definierbare Kategorien je Mandant
- `media`: Mandantengebundene Dateien mit Storage-Pfad
- `admin_users`: Zunächst genau ein Plattform-Admin
- `audit_log`: Unveränderliche Historie jeder administrativen Änderung
- `events`, `tours`, `rewards`, `guestGuide`, `feedback`: optionale Module je Mandant
- später: serverseitige Check-in-Historie, Push-Abos, Übersetzungen und Belegungsdaten

Alle fachlichen Tabellen besitzen eine verpflichtende `tenant_id`. Fremdschlüssel
und zusammengesetzte Unique Constraints müssen diese Spalte einschließen.

## Authentifizierung

Der MVP nutzt eine signierte, HTTP-only Session und erlaubt ausschließlich
`admin@schellenberger.biz`. Das Passwort wird als bcrypt-Hash in einer
Server-Umgebungsvariable gespeichert. Für mehrere Administratoren ist später
ein externer OIDC-Anbieter mit MFA vorgesehen.

## Autorisierung

1. Middleware schützt `/admin`.
2. Serveraktionen prüfen die Session erneut.
3. Der Tenant kommt aus dem verifizierten Pfadkontext `/c/{slug}` oder optional aus einer hinterlegten eigenen Domain.
4. Jede Transaktion setzt `app.tenant_id`.
5. PostgreSQL RLS blockiert alle fremden Datensätze.
6. Storage-Pfade beginnen mit der Tenant-ID und werden serverseitig signiert.

## Caching

Öffentliche Daten dürfen nur mit Tenant-ID im Cache-Key gespeichert werden.
Der Service Worker cached App-Shell und bereits besuchte GET-Ressourcen. Nach
einem Release wird durch eine neue Cache-Version kontrolliert aktualisiert.
Fremde Karten-Tiles werden bewusst nicht offline gespiegelt.

## Datenhaltung

In Produktion ist PostgreSQL verpflichtend. Die lokale `.data`-Ablage ist nur
für Entwicklung und Builds erlaubt, wenn `ALLOW_LOCAL_DATA_FALLBACK=true`
gesetzt ist. Die verbindliche Struktur und RLS-Regeln liegen in
`database/schema.sql`. Stationsdaten, Mandantenkonfiguration, Gästemappe,
Feedback, Rechtstexte, Medienverweise und optionale Module bleiben immer über
die `tenant_id` dem jeweiligen Mandanten zugeordnet.
