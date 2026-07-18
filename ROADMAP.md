# Roadmap

Diese Roadmap beschreibt nur noch Punkte, die für Betrieb, Verkauf und stabile Weiterentwicklung wichtig sind.

## Produktionsreife

- [x] PostgreSQL als verbindliche Produktionsdatenbank nutzen
- [x] Tenant-Isolation über `tenantId`, serverseitige Autorisierung und RLS-Grundlagen absichern
- [x] Sichere Standard-HTTP-Header setzen
- [x] Rate-Limits für Login, Feedback, Check-ins und Admin-Uploads aktivieren
- [x] Uploads nach Größe, MIME-Typ, Dateiendung und Magic Bytes prüfen
- [x] SMTP zentral für Systemmails konfigurieren
- [x] Stripe-Grundintegration für Abos, Kundenportal und Webhooks vorbereiten
- [x] Backup, Smoke-Test und Rollback im Update-Prozess vorsehen
- [x] Monitoring- und Cleanup-Endpunkte vorbereiten
- [ ] Produktionswerte final setzen und testen: SMTP, Stripe, Webhooks, VAPID, `NEXT_PUBLIC_BASE_URL`
- [ ] Backup/Restore einmal real auf einem Testsystem durchspielen
- [ ] Rechtstexte vor Livegang juristisch prüfen lassen

## Kernfunktionen

- [x] Marketing-Startseite für `platzguide.de`
- [x] Mandanten über Platzguide-Link wie `/p/demo` statt Pflicht-Subdomain aufrufen
- [x] Optional eigene Domains als Beta verwalten
- [x] Besucherkarte mobile-first darstellen
- [x] Stationspositionen über eine gemeinsame Kartenlogik platzieren und anzeigen
- [x] Stationseditor mit Drag & Drop, Detailbearbeitung und Löschen
- [x] Standardstationen für neue Campingplätze bereitstellen
- [x] Kategorien, Medien, Auditlog und Mandantenstatus verwalten
- [x] CSV/XLSX-Import und Export vorbereiten
- [ ] Platzplan-Upload mit grafischer Vierpunkt-Kalibrierung produktionsreif fertigstellen
- [ ] Mehrsprachige Inhalte für Besucheransicht vollständig ausbauen

## Module

- [x] Veranstaltungskalender
- [x] Rundgänge
- [x] Platzguide-Pass und Belohnungen
- [x] Web-Push-Grundlage
- [x] Feedback- und Fehlermeldungen
- [x] Digitale Gästemappe
- [x] Belegungs- und Live-Statusanzeigen als aktivierbares Modul vorbereiten
- [ ] Belegungsdaten später optional automatisiert per Schnittstelle/Sensor anbinden

## Qualitätssicherung

- [x] GitHub Actions mit Build, Tests und PostgreSQL-RLS-Test
- [x] Playwright-Smoke-Tests für wichtige Besucher- und Adminwege
- [ ] GPS-Praxistest auf Android, iOS und Safari direkt vor Ort durchführen
- [ ] Stripe-Testmodus vollständig durchspielen: Abo, Kündigung, Rechnung, Webhook, Reaktivierung
- [ ] E-Mail-Flows prüfen: Registrierung, Systemhinweis, Testmail, Massenmail
