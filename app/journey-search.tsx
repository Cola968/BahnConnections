"use client";

import { useRef } from "react";
import { SmartSearch } from "./smart-search";
import { UiIcon } from "./ui-icon";
import type { Station } from "./network-data";
import type { PlannerCategory } from "./live-journey";

type StationField = { value:string; onChange:(value:string) => void; onSelect:(station:Station) => void };
type SearchOptions = { arriveBy:boolean; maxChanges:0|1|2|3|4|5; transferMinutes:number; wheelchair:boolean; bike:boolean };
export type JourneySearchProps = {
  stations:Station[]; favoriteIds:string[]; start:StationField; target:StationField;
  departure:string; onDeparture:(value:string) => void; onSwap:() => void;
  categories:PlannerCategory[]; onCategory:(category:PlannerCategory) => void;
  options:SearchOptions; onOptions:(options:Partial<SearchOptions>) => void;
  loading:boolean; canSearch:boolean; onSearch:() => void; onDiscover:() => void; onReset:() => void;
};

function readableLocalDateTime(value:string) {
  const [date,time=""] = value.split("T");
  const [year,month,day] = date.split("-");
  if (!year || !month || !day) return "Datum und Zeit wählen";
  return `${day}.${month}.${year} · ${time.slice(0,5) || "--:--"}`;
}

export function JourneySearch(props:JourneySearchProps) {
  const { options } = props;
  const departurePicker = useRef<HTMLInputElement>(null);
  const readableDeparture = readableLocalDateTime(props.departure);
  const openDeparturePicker = () => {
    const input = departurePicker.current;
    if (!input) return;
    try { input.showPicker(); }
    catch { input.focus(); input.click(); }
  };
  return <>
    <div className="route-discovery-head"><h1>Verbindung planen</h1><p>Deutschlandweit mit Live-Fahrplandaten</p></div>
    <div className="route-search-pair">
      <div><span>Von</span><SmartSearch stations={props.stations} favoriteIds={props.favoriteIds} {...props.start} variant="route" placeholder="Startbahnhof" ariaLabel="Startbahnhof suchen" liveTransit /></div>
      <button type="button" className="swap-button" onClick={props.onSwap} aria-label="Start und Ziel tauschen"><UiIcon name="swap" width="18" height="18" /></button>
      <div><span>Nach</span><SmartSearch stations={props.stations} favoriteIds={props.favoriteIds} {...props.target} variant="route" placeholder="Zielbahnhof" ariaLabel="Zielbahnhof suchen" liveTransit /></div>
    </div>
    <div className="planner-time-row">
      <div className="planner-time-mode" role="group" aria-label="Abfahrts- oder Ankunftszeit"><button type="button" className={!options.arriveBy ? "active" : ""} onClick={() => props.onOptions({arriveBy:false})}>Abfahrt</button><button type="button" className={options.arriveBy ? "active" : ""} onClick={() => props.onOptions({arriveBy:true})}>Ankunft</button></div>
      <div className="planner-departure"><label>{options.arriveBy ? "Ankommen am" : "Losfahren am"}<span className="planner-date-control"><button type="button" className="planner-date-trigger" onClick={openDeparturePicker} aria-label={`${options.arriveBy ? "Ankunft" : "Abfahrt"} ändern: ${readableDeparture}`}><span>{readableDeparture}</span><UiIcon name="clock" width="18" height="18" /></button><input ref={departurePicker} className="planner-datetime-native" type="datetime-local" step="300" value={props.departure} onChange={event => props.onDeparture(event.target.value)} tabIndex={-1} aria-hidden="true" /></span></label></div>
    </div>
    <details className="filter-drawer route-options">
      <summary>Optionen</summary>
      <div className="planner-types" aria-label="Verkehrsmittel filtern">
        {([['fern','ICE / IC / EC'],['regional','RE / RB'],['sbahn','S-Bahn'],['ubahn','U-Bahn'],['tram','Straßenbahn']] as const).map(([category,label]) => <button type="button" key={category} className={props.categories.includes(category) ? "active" : ""} aria-pressed={props.categories.includes(category)} onClick={() => props.onCategory(category)}>{label}</button>)}
      </div>
      <div className="filter-grid">
        <label>Umstiege<select value={options.maxChanges} onChange={event => props.onOptions({maxChanges:Number(event.target.value) as SearchOptions['maxChanges']})}>{[0,1,2,3,4,5].map(count => <option key={count} value={count}>{count === 0 ? "Nur Direktverbindungen" : count === 5 ? "Automatisch · bis 5" : `Bis ${count} Umstieg${count > 1 ? 'e' : ''}`}</option>)}</select></label>
        <label>Zusätzlicher Umstiegspuffer<select value={options.transferMinutes} onChange={event => props.onOptions({transferMinutes:Number(event.target.value)})}>{[0,3,5,8,12].map(minutes => <option key={minutes} value={minutes}>{minutes ? `${minutes} Minuten` : "Ohne zusätzlichen Puffer"}</option>)}</select></label>
        <label className="planner-check"><input type="checkbox" checked={options.wheelchair} onChange={event => props.onOptions({wheelchair:event.target.checked})} /><span><b>Barrierearme Wege</b><small>Stufenarme Umstiege bevorzugen</small></span></label>
        <label className="planner-check"><input type="checkbox" checked={options.bike} onChange={event => props.onOptions({bike:event.target.checked})} /><span><b>Fahrrad mitnehmen</b><small>Nur Fahrten mit gemeldeter Mitnahme</small></span></label>
      </div>
      <div className="explore-actions"><button type="button" onClick={props.onDiscover}>Ziel entdecken</button><button type="button" onClick={props.onReset}>Karte zurücksetzen</button></div>
    </details>
    <button type="button" className="plan-button" onClick={props.onSearch} disabled={props.loading || !props.canSearch}>{props.loading ? "Suche läuft …" : "Verbindungen anzeigen"}<UiIcon name={props.loading ? "clock" : "arrow"} /></button>
  </>;
}
