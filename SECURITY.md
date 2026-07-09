# Sicherheit

## Sicherheitsmeldungen

Bitte Sicherheitslücken nicht öffentlich als Issue melden. Kontakt:
`admin@schellenberger.biz`. Eine erste Rückmeldung erfolgt nach Möglichkeit
innerhalb von sieben Tagen.

## Garantien

- Serverseitige Mandantenerkennung
- Tenant-Filter in der Zugriffsschicht
- PostgreSQL Row-Level Security
- HTTP-only, SameSite-Strict Admin-Session
- Ein erlaubtes Admin-Konto
- Keine Geheimnisse im Browser-Bundle
- Öffentliche Registrierung standardmäßig deaktiviert

## Vor Produktion

Der Demo-Datenadapter muss durch PostgreSQL ersetzt, ein starker Passwort-Hash
gesetzt, RLS mit echten Integrationschecks getestet und eine externe
Sicherheitsprüfung durchgeführt werden. Rechtstexte ersetzen keine juristische
Beratung.

Self-Service für Campingplatz-Betreiber darf erst öffentlich aktiviert werden,
wenn E-Mail-Verifikation, Rate-Limits, Nutzungsbedingungen, Missbrauchsschutz
und ein klares Lösch-/Exportkonzept umgesetzt sind.
