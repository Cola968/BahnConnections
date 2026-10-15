"use client";
import { UiIcon } from "./ui-icon";
import type {BoardQuickView} from "./board-quick-view";

export function BoardToolbar({ mode, onMode, filtersOpen, filtersActive, onFilters }: {
  mode: "departures" | "arrivals";
  onMode: (mode: "departures" | "arrivals") => void;
  filtersOpen: boolean;
  filtersActive: boolean;
  onFilters: () => void;
}) {
  return <div className="board-primary-bar">
    <div className="board-mode-tabs" role="tablist" aria-label="Live-Tafel" onKeyDown={event=>{
      const index=['ArrowLeft','ArrowRight','Home','End'].indexOf(event.key);if(index<0)return;
      event.preventDefault();const next=index===2?'departures':index===3?'arrivals':mode==='departures'?'arrivals':'departures';
      onMode(next);event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next==='departures'?0:1]?.focus();
    }}>
      <button type="button" role="tab" tabIndex={mode==="departures"?0:-1} aria-selected={mode === "departures"} className={mode === "departures" ? "active" : ""} onClick={() => onMode("departures")}>Abfahrt</button>
      <button type="button" role="tab" tabIndex={mode==="arrivals"?0:-1} aria-selected={mode === "arrivals"} className={mode === "arrivals" ? "active" : ""} onClick={() => onMode("arrivals")}>Ankunft</button>
    </div>
    <div className="board-actions">
      <button type="button" className={`board-filter-toggle${filtersOpen || filtersActive ? " active" : ""}`} onClick={onFilters} aria-expanded={filtersOpen} aria-controls="board-filters"><UiIcon name="settings" />Filter{filtersActive && <i className="board-filter-active" aria-label="Filter aktiv" />}</button>

    </div>

  </div>;
}

export function BoardQuickFilters({quickView,onQuickView}:{quickView:BoardQuickView|null;onQuickView:(view:BoardQuickView)=>void}){
  return (<div className="board-quick-views" role="group" aria-label="Schnellfilter der Bahnhofstafel">
      {([["upcoming","1 Std.","Nächste Stunde"],["delayed","Verspätet","Verspätete Fahrten"],["canceled","Ausfälle","Ausgefallene Fahrten"],["all","Alle","Alle Fahrten"]] as const).map(([id,label,description])=><button type="button" key={id} data-quick-view={id} aria-label={description} title={description} aria-pressed={quickView===id} className={quickView===id?"active":""} onClick={()=>onQuickView(id)}>{label}</button>)}
    </div>);
}
