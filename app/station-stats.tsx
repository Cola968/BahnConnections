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
  if (!board && !lines) return null;

  const validLive = board ? Math.max(0, board.total - board.canceled) : 0;
  const punctuality = board && validLive ? (validLive - board.delayed6) / validLive * 100 : null;
  const summary = [
    lines ? `${lines.total} Linien` : null,
    board ? `${board.total} Fahrten` : null,
  ].filter(Boolean).join(" · ");

  return (
    <details className="station-stats-details">
      <summary><span>Linien & Qualität</span><small>{summary}</small></summary>
      <div className="station-stats">
        {lines && <section className="station-role-card live-source-card">
          <div className="station-stats-title"><span>Linien am Bahnhof</span><small>aktuelle Linienauskunft</small></div>
          <div className="line-mode-grid">
            <span><b>{lines.fern}</b><small>Fern</small></span>
            <span><b>{lines.regional}</b><small>Regio</small></span>
            <span><b>{lines.sbahn}</b><small>S-Bahn</small></span>
            <span><b>{lines.ubahn}</b><small>U-Bahn</small></span>
            <span><b>{lines.tram}</b><small>Tram</small></span>
          </div>
          {lines.operators.length ? <p className="station-operators-inline">{lines.operators.slice(0,8).join(" · ")}{lines.operators.length > 8 ? ` · +${lines.operators.length - 8}` : ""}</p> : null}
        </section>}

        {board && <section className="station-live-breakdown">
          <div className="station-stats-title"><span>Betriebsqualität</span><small>nächste 500 Minuten</small></div>
          <div className="delay-thresholds">
            <span><b>{board.delayed6}</b><small>ab 6 Min.</small></span>
            <span><b>{board.delayed15}</b><small>ab 15 Min.</small></span>
            <span><b>{board.delayed30}</b><small>ab 30 Min.</small></span>
            <span><b>{board.canceled}</b><small>Ausfälle</small></span>
          </div>
          <p className="average-delay-note">{punctuality === null ? "Noch keine ausreichenden Echtzeitdaten." : <><b>{percent(punctuality)}</b> unter 6 Min. Abweichung · Ø {board.averageDelay.toLocaleString("de-DE", { maximumFractionDigits:1 })} Min.</>}</p>
        </section>}
      </div>
    </details>
  );
}
