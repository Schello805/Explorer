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
