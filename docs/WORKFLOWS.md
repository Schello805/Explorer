# Workflows

## Neuer Kunde / Mandant

1. Plattform-Admin legt den Mandanten im Adminbereich an oder gibt den Self-Service frei.
2. Betreiber wählt Name, Link-Kürzel und erste Admin-E-Mail.
3. Betreiber bestätigt die E-Mail-Adresse.
4. Betreiber pflegt Branding, Kontakt, Rechtstexte und Module.
5. Betreiber setzt den Kartenmittelpunkt oder lädt einen Platzplan hoch.
6. Betreiber prüft die Standardstationen, löscht unpassende Vorlagen und ergänzt echte Lage, Texte, Öffnungszeiten und Status.
7. Plattform-Admin prüft DNS, SMTP, Captcha, Backups und Healthcheck.
8. Plattform-Admin wählt Paket, prüft Zahlung/Abrede und schaltet die Besucher-App manuell öffentlich.
9. Mandant geht live, sobald Smoke-Test und Inhalte geprüft sind.

Neue Mandanten starten bewusst ohne Demo-Daten und ohne aktivierte Platzkarte.
Im Adminbereich werden typische Standardstationen als nicht öffentliche Vorlagen
angelegt: Rezeption, Sanitärgebäude, Entsorgung, Spielplatz und Restaurant. Die
Besucher-App zeigt diese Stationen erst, wenn der Betreiber sie aktiv freigibt.
Der öffentliche Platzguide-Link bleibt für anonyme Besucher gesperrt, bis im Adminbereich
`Abo & Veröffentlichung` aktiv freigeschaltet wurde.

## Pakete und Monetarisierung

- Starter: 4,99 € monatlich, 100 MB Speicher, Support innerhalb von 24h
- Pro: 19,99 € monatlich, 1 GB Speicher, mehrere Admins und künftige Module,
  Support innerhalb von 6h
- Monatlich kündbar
- Jahreszahlung mit Rabatt
- Optionaler Einrichtungsservice durch Michael: 199 € einmalig
- Payment erfolgt zunächst manuell; Online-Zahlung kann später ergänzt werden

## Aufgaben Plattform-Admin

- Installation, Updates, Backups, Restore und Monitoring betreiben
- PostgreSQL, RLS, SMTP, Captcha, DNS und Reverse Proxy verwalten
- Mandanten anlegen, sperren oder löschen
- Mandantenübergreifend nach Datensätzen filtern
- Deployment-Checks prüfen und Rollbacks auslösen oder kontrollieren
- Rechtliche Vorlagen bereitstellen, aber keine Rechtsprüfung ersetzen

## Aufgaben Betreiber / Mandanten-Admin

- Eigene App-Daten pflegen: Name, Logo, Farben, Kontakt und Rechtstexte
- Kartenmittelpunkt, Luftbild oder Platzplan konfigurieren
- Kategorien, Stationen, Bilder, Öffnungszeiten und Status pflegen
- Gästemappe, Veranstaltungen, Rundgänge, Feedback und Module verwalten
- Eigene Inhalte rechtlich prüfen lassen
- Gästehinweise und Notfallkontakte aktuell halten

## Besucher

- Öffnen die App über `platzguide.de/c/{link-kuerzel}`, QR-Code, PWA-Icon oder später optional eigene Domain
- Suchen Stationen, nutzen Karte/Liste, Favoriten und optionale Check-ins
- Sehen nur Inhalte des jeweiligen Campingplatzes
