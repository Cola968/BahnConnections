# Code und Fremddaten

Der eigene Anwendungscode von BahnConnections steht unter der MIT-Lizenz in
LICENSE. Der Rechteinhaber hat MIT am 23.10.2026 ausdrücklich ausgewählt.
Diese Entscheidung erteilt keine Rechte an fremden Daten, Assets oder Marken.

## Laufzeitdaten

- Transitous / MOTIS: https://transitous.org/sources/ listet Anbieter und deren
  jeweilige Bedingungen. Nutzung: https://transitous.org/api/. Nichtkommerzielle
  Nutzung; Monetarisierung bleibt deaktiviert. Die Lizenz des Codes ersetzt
  weder erforderliche Provider-Abstimmung noch Datenrechte.
- OpenStreetMap-Mitwirkende: https://www.openstreetmap.org/copyright.
  OSM-Daten unter ODbL; Kartendienstbedingungen gelten zusätzlich.
- DB transport.rest: https://v6.db.transport.rest/ ist ein zusätzlicher
  Fahrplanabgleich, keine unabhängige Betreiberbestätigung.

## Mitgelieferte Geodaten

- Verwaltungsgebiete: © BKG (2026), Datenlizenz Deutschland – Namensnennung –
  Version 2.0, https://www.govdata.de/dl-de/by-2-0;
  https://www.bkg.bund.de. VG250 wurde zur Zuordnung der Bundesländer verarbeitet.
  Quellen: https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf.
- DB InfraGO GeoViewer WFS: ISR Betriebsstellen Punkt und KOMBau DB-Streckennetz.
  Abrufdaten und Bearbeitung sind in public/db-stations.json beziehungsweise
  public/db-rail-network.json dokumentiert. Eine belastbare Freigabe zur
  Weiterveröffentlichung genau dieser Exporte ist noch nicht dokumentiert.
  MIT gilt ausdrücklich nicht für diese Dateien. Release-Blocker #67 bleibt offen.

## Direkte Laufzeitbibliotheken

| Paket | Version | Lizenz |
| --- | --- | --- |
| @glass-sdk/liquid-glass | 0.0.1 | MIT |
| leaflet | 1.9.4 | BSD-2-Clause |
| next | 16.2.6 | MIT |
| react / react-dom | 19.2.6 | MIT |
| stripe | 22.6.0 | MIT |

Die Originaltexte und Copyright-Hinweise befinden sich bei den jeweiligen
Paketen. Sie werden durch die Anwendungslizenz nicht ersetzt. Die App verlinkt
Quellen und diese Hinweise unter Einstellungen → App → Lizenzen.
