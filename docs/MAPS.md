# Karten, Luftbilder und Platzpläne

## Gewählte Lösung

Platzguide verwendet **MapLibre GL JS** als freie Karten-Engine. Sie ist
anbieterunabhängig und kann Vektorkarten, Rasterkarten, WMS-Luftbilder und
eigene georeferenzierte Platzpläne gemeinsam darstellen.

Die Standardkonfiguration verwendet den öffentlichen **OpenFreeMap**-Stil
`liberty`. Die zugrunde liegenden OpenStreetMap-Daten erfordern eine sichtbare
Namensnennung. Platzguide blendet diese direkt in der Karte ein.

## Warum nicht Google Maps?

Google-Karten und -Satellitenbilder unterliegen API-, Abrechnungs-, Cache- und
Darstellungsbedingungen. Sie sind nicht frei weiterverteilbar und würden die
Plattform unnötig an einen Anbieter binden. MapLibre trennt Kartenanzeige und
Datenquelle vollständig.

## Luftbilder

Es gibt keine dauerhaft kostenlose, weltweit einheitliche Satellitenquelle,
die ohne Einschränkungen für jede App übernommen werden kann. Für Deutschland
stellen Landesvermessungsämter digitale Orthophotos häufig als WMS unter
offenen Lizenzen bereit. Lizenz, Quellenangabe, Aktualität und technische URL
müssen je Bundesland geprüft werden.

Die Mandantenkonfiguration unterstützt deshalb:

- `aerialTiles`: Raster-Tile- oder WMS-URL mit Platzhaltern
- `aerialAttribution`: verpflichtende Quellenangabe des Anbieters
- einen optionalen eigenen Lageplan als georeferenziertes Bild

Ein Luftbild-Layer darf erst aktiviert werden, wenn dessen Lizenz und
Attribution für den konkreten Campingplatz dokumentiert sind.

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
Baumbestand. Der Marker sollte anschließend anhand von Wegen, Luftbild oder
Platzplan geprüft werden.

## Betrieb und Datenschutz

- Fremde Karten-Tiles werden nicht durch den Service Worker massenhaft offline gespeichert.
- Kartenanbieter und Attributionsangaben sind konfigurierbar.
- Geolocation startet nur nach einer ausdrücklichen Benutzeraktion.
- Der Browser übermittelt beim Kartenabruf technisch notwendige Verbindungsdaten
  an den gewählten Kartenanbieter; dies muss im Mandanten-Datenschutztext genannt werden.
- Für hohen Traffic sollte OpenFreeMap selbst gehostet oder ein Anbieter mit SLA gewählt werden.

## Quellen

- MapLibre GL JS: <https://maplibre.org/maplibre-gl-js/docs/>
- OpenFreeMap Bedingungen: <https://openfreemap.org/tos/>
- OpenStreetMap Tile Policy: <https://operations.osmfoundation.org/policies/tiles/>
- OpenStreetMap Attribution: <https://osmfoundation.org/wiki/Licence/Attribution_Guidelines>
- Deutsche Open-Data-Suche: <https://data.gov.de/>
