"use client";

import type { BoardSummary } from "./live-board";
import type { Station } from "./network-data";
import type { StationLineSummary } from "./station-lines";

function percent(value: number) {
  return `${value.toLocaleString("de-DE", { maximumFractionDigits:1 })} %`;
}

export function StationStats({ station, boardSummary, lineSummary }: {
  station: Station;
  boardSummary: BoardSummary | null;
  lineSummary: StationLineSummary | null;
}) {
  const board = boardSummary?.stationId === station.id ? boardSummary : null;
  const lines = lineSummary?.stationId === station.id ? lineSummary : null;
  const validLive = board ? board.delaySamples : 0;
  const punctuality = board && validLive ? (validLive - board.delayed6) / validLive * 100 : null;
  const products = board ? Object.entries(board.products).filter(([, value]) => value > 0) : [];

  return (
    <div className="station-stats">
      <section className="station-stat-kpis">
        <article><small>Fahrplanlinien</small><strong>{lines?.total ?? "–"}</strong><span>direkt für diesen Bahnhof geprüft</span></article>
        <article><small>Fernverkehrslinien</small><strong>{lines?.fern ?? "–"}</strong><span>ICE, IC, EC und weitere Fernzüge</span></article>
        <article><small>S-Bahn-Linien</small><strong>{lines?.sbahn ?? "–"}</strong><span>aktuelle Linienquelle</span></article>
        <article><small>U-Bahn-Linien</small><strong>{lines?.ubahn ?? "–"}</strong><span>falls am Bahnhof vorhanden</span></article>
        <article><small>Straßenbahn-Linien</small><strong>{lines?.tram ?? "–"}</strong><span>laut aktueller Linienauskunft</span></article>
        <article><small>Fahrten / 500 Min.</small><strong>{board?.total ?? "–"}</strong><span>aktueller Tafelsnapshot</span></article>
        <article><small>Pünktlich &lt; 6 Min.</small><strong>{punctuality === null ? "–" : percent(punctuality)}</strong><span>{board ? `${board.delaySamples}/${board.total} Fahrten mit auswertbarer Prognose` : "Live-Tafel lädt"}</span></article>
      </section>

      <section className="station-role-card live-source-card">
        <div className="station-stats-title"><span>Linien am Bahnhof</span><small>Fahrplandaten</small></div>
        {lines ? <><div className="line-mode-grid"><span><b>{lines.fern}</b><small>Fern</small></span><span><b>{lines.regional}</b><small>Regio</small></span><span><b>{lines.sbahn}</b><small>S-Bahn</small></span><span><b>{lines.ubahn}</b><small>U-Bahn</small></span><span><b>{lines.tram}</b><small>Straßenbahn</small></span></div></> : <p>Linien werden geladen.</p>}
      </section>

      <section className="station-live-breakdown">
        <div className="station-stats-title"><span>Verkehrsmittel & Qualität</span><small>nächste 500 Minuten</small></div>
        {board && board.total ? <><div className="product-shares">{products.map(([name, value]) => <div key={name}><span>{name === "sbahn" ? "S-Bahn" : name === "ubahn" ? "U-Bahn" : name === "tram" ? "Straßenbahn" : name.toUpperCase()}</span><i><b style={{ width:`${value / board.total * 100}%` }} /></i><strong>{percent(value / board.total * 100)}</strong></div>)}</div><div className="delay-thresholds"><span><b>{board.delayed6}</b><small>ab 6 Min.</small></span><span><b>{board.delayed15}</b><small>ab 15 Min.</small></span><span><b>{board.delayed30}</b><small>ab 30 Min.</small></span><span><b>{board.canceled}</b><small>Ausfälle</small></span></div><p className="average-delay-note">Durchschnittliche Abweichung: <b>{board.averageDelay === null ? "Keine auswertbare Prognose" : `${board.averageDelay.toLocaleString("de-DE", { maximumFractionDigits:1 })} Minuten`}</b> · {board.delaySamples} auswertbare Prognosen, Ausfälle ausgeschlossen.</p></> : <p>Die Qualitätswerte erscheinen, sobald aktuelle Tafeldaten für diesen Bahnhof vorliegen.</p>}
      </section>

      {lines?.operators.length ? <section className="station-operators"><div className="station-stats-title"><span>Verkehrsunternehmen</span><small>{lines.operators.length}</small></div><p>{lines.operators.slice(0,4).join(" · ")}{lines.operators.length > 4 ? ` · ${lines.operators.length - 4} weitere` : ""}</p></section> : null}

      <details className="station-comparison-note"><summary>Daten & Genauigkeit</summary><p>„Live“ bedeutet, dass der Datenanbieter aktuelle Zeitangaben liefert. Fehlende Messwerte werden nicht geschätzt.</p></details>
    </div>
  );
}
