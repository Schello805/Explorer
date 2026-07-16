# Karten und Platzpläne

## Gewählte Lösung

Platzguide verwendet **MapLibre GL JS** als freie Karten-Engine. Sie ist
anbieterunabhängig und kann freie Rasterkarten sowie eigene georeferenzierte
Platzpläne gemeinsam darstellen.

Die Standardkonfiguration verwendet bewusst nur eine Basiskarte:
**OpenFreeMap** mit dem offiziellen MapLibre-Stil
`https://tiles.openfreemap.org/styles/liberty`. Die zugrunde liegenden
OpenStreetMap-Daten erfordern eine sichtbare Namensnennung. Platzguide blendet
diese direkt in der Karte ein.

## Kartengrundlagen pro Campingplatz

Der Betreiber pflegt nicht mehr primär Zahlenwerte, sondern markiert den
Campingplatz grafisch:

1. Karte auf den Campingplatz verschieben und zoomen.
2. Aktuellen Ausschnitt als Campingplatzfläche übernehmen.
3. Rechteck über die vier Eckpunkte fein ausrichten.
4. Speichern; Mittelpunkt und Start-Zoom werden automatisch gesetzt.

Diese Fläche wird in der Admin-Karte, im Stationspicker und in der
Besucherkarte als dezente Umrandung angezeigt. Stationen werden anschließend
innerhalb dieser Fläche platziert.

## Warum nicht Google Maps?

Google-Karten und -Satellitenbilder unterliegen API-, Abrechnungs-, Cache- und
Darstellungsbedingungen. Sie sind nicht frei weiterverteilbar und würden die
Plattform unnötig an einen Anbieter binden. MapLibre trennt Kartenanzeige und
Datenquelle vollständig.

## Eigener Platzplan

Für interne Wege, Sanitärgebäude, Stellplätze und Waldpfade ist ein eigener
Lageplan oft genauer als öffentliche Karten. Ein hochgeladenes Bild wird über
vier Eckkoordinaten georeferenziert und als MapLibre-Image-Layer eingeblendet.
Die Stationen selbst bleiben echte GPS-Koordinaten und funktionieren deshalb
auch bei einem späteren Kartenanbieterwechsel.

## Stationen positionieren

Im Admin-Stationseditor gibt es drei Wege:

1. auf die Karte klicken,
2. den Marker exakt verschieben,
3. direkt an der Station den Smartphone-GPS-Standort übernehmen.

GPS ist im Freien typischerweise genauer als in Gebäuden oder unter dichtem
Baumbestand. Der Marker sollte anschließend anhand von Wegen oder dem eigenen
Platzplan geprüft werden.

## Betrieb und Datenschutz

- Fremde Karten-Tiles werden nicht durch den Service Worker massenhaft offline gespeichert.
- OpenFreeMap ist die Standardkarte; weitere Kartenquellen sollen nur bewusst
  ergänzt werden, wenn Lizenz und Betrieb geklärt sind.
- Geolocation startet nur nach einer ausdrücklichen Benutzeraktion.
- Der Browser übermittelt beim Kartenabruf technisch notwendige Verbindungsdaten
  an den gewählten Kartenanbieter; dies muss im Mandanten-Datenschutztext genannt werden.
- Für hohen Traffic sollte OpenFreeMap selbst gehostet oder ein Anbieter mit SLA gewählt werden.

## Quellen

- MapLibre GL JS: <https://maplibre.org/maplibre-gl-js/docs/>
- OpenFreeMap Quick Start: <https://openfreemap.org/quick_start/>
- OpenFreeMap Bedingungen: <https://openfreemap.org/tos/>
- OpenStreetMap Tile Policy: <https://operations.osmfoundation.org/policies/tiles/>
- OpenStreetMap Attribution: <https://osmfoundation.org/wiki/Licence/Attribution_Guidelines>
- Deutsche Open-Data-Suche: <https://data.gov.de/>
