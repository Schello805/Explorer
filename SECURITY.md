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
- Rollen: Plattform-Admin, Betreiber, Bearbeiter und Leser
- Keine Geheimnisse im Browser-Bundle
- Öffentliche Registrierung standardmäßig deaktiviert
- Rate-Limit für vorbereiteten Self-Service
- Datenschutzexport und Löschanfragen mit Audit-Log

## Vor Produktion

Der Demo-Datenadapter muss durch PostgreSQL ersetzt, ein starker Passwort-Hash
gesetzt, RLS mit echten Integrationschecks getestet und eine externe
Sicherheitsprüfung durchgeführt werden. Rechtstexte ersetzen keine juristische
Beratung.

Self-Service für Campingplatz-Betreiber darf erst öffentlich aktiviert werden,
wenn E-Mail-Verifikation, Rate-Limits, Nutzungsbedingungen, Missbrauchsschutz
und ein klares Lösch-/Exportkonzept umgesetzt sind.

Medien werden derzeit als geprüfte URLs gespeichert. Vor echten Datei-Uploads
sind tenantgetrennte Storage-Pfade, Dateityp-/Größenprüfung, kurzlebige
Upload-Signaturen und optionaler Virenscan nötig.
