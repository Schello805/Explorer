# Platzguide Product Specification

Stand: 2026-07-16

## Produktmodell

Platzguide ist ein gehostetes SaaS für Campingplätze. Ein zentraler Superadmin verwaltet die Plattform, Mandanten, Abos, Rechtstexte, SMTP, Captcha, Stripe, Module und Betrieb. Campingplatzbetreiber registrieren sich selbst, erstellen einen oder mehrere Campingplätze und pflegen deren Inhalte. Besucher nutzen anonym die öffentliche PWA unter `platzguide.de/c/<slug>`.

Source-Available bleibt Transparenz und Community-Option. Der primäre Betrieb ist das gehostete SaaS.

## Rollen

- Superadmin: Michael Schellenberger, volle Plattformverwaltung.
- Mandantenadmin: verwaltet eigene Campingplätze, Inhalte, Medien, Karte, Abo und Profil.
- Besucher: anonym, keine Accounts, Favoriten/Consent lokal auf dem Gerät.

Mandantenadmins sehen keine SMTP-, Captcha-, Stripe-, Datenbank-, Backup-, Systemlog- oder Rechtstext-Plattformkonfiguration.

## Mandanten und URLs

Jeder Campingplatz hat einen eindeutigen Slug unter `platzguide.de/c/<slug>`. Ein Account kann mehrere Campingplätze besitzen; jeder Campingplatz hat eigenes Paket, eigenes Abo, eigenes Speicherlimit und eigene Veröffentlichungsberechtigung. Slug-Änderungen sind möglich, alte Slugs leiten maximal drei Monate weiter. Der Mandantenadmin muss bestätigen, dass QR-Codes, Flyer und Links angepasst werden müssen.

## Pakete und Billing

Stripe Billing ist das führende Abo-, Zahlungs- und Rechnungssystem. Platzguide speichert nur notwendige Stripe-Referenzen, Status, Price-IDs und Rechnungslinks, keine Zahlungsdaten.

- Testmodus: kostenlos, 30 MB Speicher, interne Vorschau, nicht öffentlich.
- Starter: 4,99 €/Monat oder 49,90 €/Jahr, 100 MB Speicher, 1 Admin, 24h Support.
- Pro: 19,99 €/Monat oder 199,90 €/Jahr, 1 GB Speicher, mehrere Admins, Pro-Module, 6h Support.
- Einrichtungsservice: 199 € einmalig.

Preise laufen unter Kleinunternehmerregelung. Stripe-Rechnungen enthalten den Hinweis: `Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.`

Zahlung schaltet nur die Berechtigung zur Veröffentlichung frei. Öffentlich wird ein Campingplatz erst, wenn der Mandantenadmin bewusst veröffentlicht. Superadmin kann manuell freigeben, sperren oder Kulanz setzen.

## Veröffentlichung

Admin-Änderungen speichern immer Entwürfe. Besucher sehen ausschließlich veröffentlichte Versionen. Veröffentlichung läuft atomar: entweder wird der gesamte Entwurf live oder nichts. Es werden fünf alte Live-Versionen gespeichert. Rollback schreibt eine frühere Live-Version zurück in den Entwurf und erfordert erneute Veröffentlichung.

Versioniert werden Branding, Kategorien, Stationen, Kartenbereich, Platzplan, Hinweise, Gästemappe, Events und sichtbare Moduleinstellungen. Nicht versioniert werden Billing, Adminaccounts, Auditlog, Stripe und Systemsettings.

## Sperr- und Wartungszustände

- Nicht öffentlich oder gesperrt: neutrale Platzguide-Seite „Diese Platzguide-Seite ist gerade nicht erreichbar.“
- Wartungsmodus: „Dieser Platzguide wird gerade aktualisiert.“
- Unbekannter Slug: normale 404/Marketing-Hinweis.
- Sperr- und Wartungsseiten sind `noindex`.
- Adminbereich bleibt erreichbar.

## Karten und Platzplan

Kernfeature ist Orientierung auf dem Campingplatz. Besucher sehen Karte zuerst, danach Liste. GPS wird erst nach Nutzeraktion angefragt. Karte nutzt OpenFreeMap/OSM. Der Mandantenadmin markiert den Campingplatz per Rechteck; Warnung ab 1 km², Blockade ab 5 km². Außerhalb des Rechtecks wird dezent abgedunkelt.

Stationen werden per Drag-and-drop platziert. Auf Mobilgeräten gibt es eine Alternative: Vorlage antippen, Marker setzen/verschieben. Drops außerhalb des Rechtecks werden blockiert, externe Orte sind nur nach bewusster Bestätigung möglich.

Platzpläne können als PNG/JPG/WebP kalibriert und als PDF angezeigt/downloaded werden. Besucher sehen die interaktive Karte zuerst und können den Platzplan als Layer öffnen.

## Besucher-App

Die Besucher-App ist mobile-first. Sie startet mit Karte, Iconfiltern und Bottom-Sheet. Hauptkategorien:

- Rezeption
- Sanitär
- Entsorgung
- Abfall
- Spielplatz
- Essen & Trinken
- Erholung

Suche ist sekundär über Lupe. Liste zeigt Cards statt Tabellen. Check-ins entfallen. Favoriten bleiben lokal. Offline-Speichern umfasst Stationen, Texte, Bilder und Platzplan; Kartenkacheln werden bestmöglich gecacht.

## Stationen

Stationen haben eine Hauptkategorie, mehrere Tags, DE/EN-Texte, Status, Öffnungszeiten als Textfeld, Position, Hauptbild, optionale Galerie und optional Video/Embed. Wenn Englisch fehlt, wird Deutsch angezeigt. Nicht sichtbare Stationen sind Entwurf. Status wird manuell gesetzt und nicht zeitgesteuert.

## Medien und Uploads

Einzeluploads dürfen maximal 30 MB groß sein. Speicherlimits hängen am Paket. Erlaubt sind JPG, PNG, WebP, MP4, WebM und PDF. Verboten sind SVG, HTML, JS, EXE, PHP, ZIP und ausführbare/aktive Dateien. Uploads werden per Dateiendung, MIME und möglichst Magic Bytes geprüft. Dateien liegen tenantgetrennt unter `/uploads/<tenantId>/...`.

Bilder können nach Nutzerwahl original behalten oder komprimiert werden. Videos werden nicht transkodiert. Externe Video-Embeds zählen nicht zum Speicher und laden per Zwei-Klick/Consent.

## Import und Export

Campingplätze können als ZIP exportiert/importiert werden. Enthalten sind JSON-Manifest, Inhalte, Kategorien, Stationen, Medien, Branding, Karte, Platzplan und Modulsettings. Nicht enthalten sind Stripe, Rechnungen, Passwörter, Auditlog, Datenschutzanfragen und Superadmin-Notizen. Import läuft immer mit Vorschau, neuer Slug-Auswahl, neuer ID-Vergabe und landet im Entwurf.

## Recht und Datenschutz

Zentrale Dokumente: Impressum, Datenschutzerklärung, Cookie-/Consent-Hinweise, AGB/Nutzungsbedingungen und AVV-Hinweis. Mandanten pflegen keine eigenen Rechtstexte. Vor Veröffentlichung bestätigen Mandanten mit Zeitstempel, dass sie für Inhalte, Bilder, Videos, Rechte und Aktualität verantwortlich sind.

Löschung erfolgt als Antrag, nicht als sofortige automatische Löschung. Gesetzliche Aufbewahrungspflichten bleiben vorbehalten. Datenschutzformular ist zentral verlinkt. Besucher haben keine Accounts.

## Analytics

Matomo ist nur Superadmin-Werkzeug. Mandanten sehen keine Analytics. Konfiguriert werden Matomo URL/Site-ID bzw. sichere Felder statt freier Script-Injektion. Ziel ist aggregierte Nutzung pro Campingplatz ohne IP-Speicherung/mit IP-Anonymisierung. Kein GPS, keine Favoriten, keine Bewegungsprofile.

## E-Mail

SMTP ist global. Mandanten können SMTP/Absender nicht ändern. E-Mails gehen nur an Admins, nicht an Besucher. Systemmails, Billingmails, Securitymails und Produktupdates werden templatebasiert gesendet. Superadmin kann Rundmails an gefilterte Gruppen senden, mit Vorschau, Testmail, Batchversand, Auditlog und Opt-out für Marketing.

## Betrieb und Qualität

Testbetrieb läuft auf Proxmox/Ubuntu/systemd/Nginx. Live-Betrieb soll später auf externem Server/VPS laufen. Updates laufen im Wartungsfenster mit animiertem Wartungsbildschirm. Backups täglich und vor Updates, Offsite verschlüsselt sobald echte Kunden. Monitoring alle fünf Minuten mit Mailalarm.

Jeder Push auf `main` prüft Lint, Unit Tests, Build, PostgreSQL-RLS und Playwright Mobile-Smoke. Stripe-Webhooks werden simuliert. Öffentliche Version zeigt `v0.<Commit-Anzahl>`, Superadmin zusätzlich Commit-Hash und Updatezeit.
