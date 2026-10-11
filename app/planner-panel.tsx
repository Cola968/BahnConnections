"use client";

import type { UIEvent } from "react";
import { JourneySearch, PlannerSearchAction, type JourneySearchProps } from "./journey-search";
import { PanelTools, type PanelControls, type MobileSheetState } from "./panel-tools";
import { SavedRoutesPanel } from "./saved-routes-panel";
import type { SavedRoute } from "./saved-routes";

export type PlannerPanelProps = {
  controls:PanelControls; sheetState:MobileSheetState; onSheetState:(state:MobileSheetState)=>void;
  onClose:()=>void; onScroll:(event:UIEvent<HTMLElement>)=>void; search:JourneySearchProps;
  returnLabel?:string; onReturn:()=>void; nearbyLabel?:string; onNearby:()=>void;
  routes:SavedRoute[]; onSave:()=>void; onOpenRoute:(route:SavedRoute,reverse:boolean)=>void;
  onRemoveRoute:(id:string)=>void; saveMessage:string; message:string; state:string;
};
export function PlannerPanel(props:PlannerPanelProps) {
  const search=props.search;
  return <aside className="explore-card planner-panel floating-panel mobile-sheet-panel" style={props.controls.style}>
    <PanelTools compact controls={props.controls} label="Verbindung planen" onClose={props.onClose} mobileState={props.sheetState} onMobileStateChange={props.onSheetState}/>
    <div className="panel-body" onScroll={props.onScroll}>
      {props.returnLabel&&<button type="button" className="planner-return" onClick={props.onReturn}>← Zur ausgewählten Verbindung <span>{props.returnLabel}</span></button>}
      <JourneySearch {...search} actionPlacement="footer"/>
      {props.message&&<div className={`planner-message ${props.state}`} role="status"><p>{props.message}</p>{props.state==="error"&&<button type="button" className="settings-link" onClick={search.onSearch}>Erneut versuchen</button>}</div>}
      <details className="planner-saved-routes" open={props.routes.length ? true : undefined}>
        <summary>Pendelstrecken <span>{props.routes.length ? `${props.routes.length} gespeichert` : "Strecke speichern"}</span></summary>
        <button type="button" className="settings-link" onClick={props.onSave} disabled={!search.canSearch}>+ Diese Pendelstrecke speichern</button>
        {props.saveMessage&&<p role="status" className="settings-message">{props.saveMessage}</p>}
        <SavedRoutesPanel routes={props.routes} onOpen={props.onOpenRoute} onRemove={props.onRemoveRoute}/>
      </details>
      {props.nearbyLabel&&<button type="button" className="planner-nearby settings-link" onClick={props.onNearby}>Ab nächstem Bahnhof · {props.nearbyLabel}</button>}
    </div>
    <div className="planner-footer"><PlannerSearchAction {...search}/></div>
  </aside>;
}
