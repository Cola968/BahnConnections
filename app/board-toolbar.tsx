"use client";
import { UiIcon } from "./ui-icon";

export function BoardToolbar({ mode, onMode, filtersOpen, filtersActive, onFilters, compact, onCompact, onWindow }: {
  mode: "departures" | "arrivals";
  onMode: (mode: "departures" | "arrivals") => void;
  filtersOpen: boolean;
  filtersActive: boolean;
  onFilters: () => void;
  compact: boolean;
  onCompact: () => void;
  onWindow: () => void;
}) {
  return <div className="board-primary-bar">
    <div className="board-mode-tabs" role="tablist" aria-label="Live-Tafel">
      <button type="button" role="tab" aria-selected={mode === "departures"} className={mode === "departures" ? "active" : ""} onClick={() => onMode("departures")}>Abfahrt</button>
      <button type="button" role="tab" aria-selected={mode === "arrivals"} className={mode === "arrivals" ? "active" : ""} onClick={() => onMode("arrivals")}>Ankunft</button>
    </div>
    <div className="board-actions">
      <button type="button" className={`board-filter-toggle${filtersOpen || filtersActive ? " active" : ""}`} onClick={onFilters} aria-expanded={filtersOpen} aria-controls="board-filters"><UiIcon name="settings" />Filter{filtersActive && <i className="board-filter-active" aria-label="Filter aktiv" />}</button>
      <button type="button" onClick={onCompact} aria-pressed={!compact}>{compact ? "Erweitert" : "Kompakt"}</button>
      <button type="button" onClick={onWindow} title="In eigenem Fenster öffnen" aria-label="Live-Tafel in eigenem Fenster öffnen">↗</button>
    </div>
  </div>;
}
