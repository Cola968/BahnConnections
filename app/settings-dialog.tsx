"use client";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { Station } from "./network-data";
import { UiIcon } from "./ui-icon";
import { SavedRoutesPanel } from "./saved-routes-panel";
import type { SavedRoute } from "./saved-routes";
import { SUBSCRIPTION_PLANS } from "./subscription-plans";

export type LocalProfile={name:string;homeStationId:string;initials:string};
export function parseLocalProfile(value:unknown):LocalProfile {
  const p=value && typeof value==="object" ? value as Record<string,unknown> : {};
  const name=typeof p.name==="string" ? p.name.trim().slice(0,40) : "";
  return {name,homeStationId:typeof p.homeStationId==="string" ? p.homeStationId.slice(0,120) : "",initials:name.split(/\s+/).map(part=>Array.from(part)[0]).slice(0,2).join("").toLocaleUpperCase("de-DE")};
}
type Props={
  savedRoutes:SavedRoute[];onOpenRoute:(route:SavedRoute,reverse:boolean)=>void;onRemoveRoute:(id:string)=>void;
  onClose:()=>void;profile:LocalProfile;onProfile:(profile:LocalProfile)=>boolean;
  stations:Station[];onHomeStation:(station:Station)=>void;favoriteCount:number;
  theme:"light"|"dark";onTheme:(theme:"light"|"dark")=>void;
  highContrast:boolean;onContrast:(value:boolean)=>void;largeFont:boolean;onLargeFont:(value:boolean)=>void;
  reducedMotion:boolean;onReducedMotion:(value:boolean)=>void;
  autoLocation:boolean;onAutoLocation:(value:boolean)=>void;onRequestLocation:()=>void;
  locationStatus:string;locationAccuracy?:number;
};
export function SettingsDialog(p:Props) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [tab,setTab]=useState<"profile"|"settings"|"plans">("profile");
  const [name,setName]=useState(p.profile.name);
  const [home,setHome]=useState(p.profile.homeStationId);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    const el=dialog.current,previous=document.activeElement as HTMLElement|null;
    el?.showModal();
    return ()=>{el?.close();previous?.focus();};
  },[]);
  function save(event:FormEvent) {
    event.preventDefault();
    const saved=p.onProfile(parseLocalProfile({name,homeStationId:home}));
    setMessage(saved ? "Gespeichert." : "Für diese Sitzung übernommen.");
  }
  const homeStation=p.stations.find(station=>station.id===p.profile.homeStationId);
  const tabIndex=tab==="profile"?0:tab==="settings"?1:2;
  const locationText=`${p.locationStatus}${p.locationAccuracy!==undefined ? ` · ±${Math.round(p.locationAccuracy)} m` : ""}`;

  return <dialog ref={dialog} className="settings-dialog settings-dialog-v48" aria-labelledby="settings-title" onCancel={p.onClose} onClick={event=>{if(event.target===event.currentTarget){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)p.onClose();}}}>
    <header className="settings-heading">
      <div><h2 id="settings-title">Einstellungen</h2></div>
      <button type="button" className="round-button" onClick={p.onClose} aria-label="Einstellungen schließen"><UiIcon name="close"/></button>
    </header>
    <nav className="settings-tabs" aria-label="Einstellungsbereiche" style={{"--settings-tab-index":tabIndex,"--settings-tab-offset":`${tabIndex*100}%`} as CSSProperties}>
      {([["profile","Profil"],["settings","App"],["plans","Plus"]] as const).map(([id,label])=><button type="button" key={id} aria-pressed={tab===id} className={tab===id ? "active" : ""} onClick={()=>setTab(id)}>{label}</button>)}
      <i className="settings-tab-indicator" aria-hidden="true"/>
    </nav>

    <div className="settings-content" key={tab}>
      {tab==="profile" && <>
        <div className="profile-overview">
          <span className="profile-avatar" aria-hidden="true">{p.profile.initials||<UiIcon name="user"/>}</span>
          <div><h3>{p.profile.name||"Dein Profil"}</h3><p>{p.favoriteCount} Favoriten{homeStation ? ` · ${homeStation.name}` : ""}</p></div>
        </div>
        <form onSubmit={save} className="profile-form">
          <label><span>Name</span><input autoComplete="nickname" maxLength={40} value={name} onChange={event=>setName(event.target.value)} placeholder="Wie heißt du?"/></label>
          <label><span>Heimatbahnhof</span><select value={home} onChange={event=>setHome(event.target.value)}><option value="">Nicht festgelegt</option>{p.stations.map(station=><option key={station.id} value={station.id}>{station.name}</option>)}</select></label>
          <button type="submit" className="settings-primary">Speichern</button>
          {message&&<p role="status" className="settings-message">{message}</p>}
        </form>
        {homeStation&&<button className="settings-link settings-quick-action" onClick={()=>{p.onHomeStation(homeStation);p.onClose();}}><UiIcon name="clock"/>Abfahrten am Heimatbahnhof</button>}
        <SavedRoutesPanel routes={p.savedRoutes} onOpen={p.onOpenRoute} onRemove={p.onRemoveRoute}/>
        <details className="settings-danger-zone">
          <summary>Lokale Profildaten</summary>
          <p>Profil und Heimatbahnhof liegen nur auf diesem Gerät.</p>
          <button className="settings-link danger" onClick={()=>{setName("");setHome("");p.onProfile(parseLocalProfile(null));setMessage("Profil zurückgesetzt.");}}>Profil zurücksetzen</button>
        </details>
      </>}

      {tab==="settings" && <>
        <section className="settings-group">
          <div className="settings-section-heading"><h3>Oberfläche</h3></div>
          <div className="theme-choice" aria-label="Farbschema">{(["light","dark"] as const).map(theme=><button key={theme} aria-pressed={p.theme===theme} className={p.theme===theme ? "active" : ""} onClick={()=>p.onTheme(theme)}><UiIcon name={theme==="light"?"sun":"moon"}/><span>{theme==="light"?"Hell":"Dunkel"}</span></button>)}</div>
          <Toggle label="Größere Schrift" description="Mehr Lesbarkeit in Tafeln und Verbindungen" checked={p.largeFont} onChange={p.onLargeFont}/>
          <Toggle label="Hoher Kontrast" description="Stärkere Trennung von Text und Flächen" checked={p.highContrast} onChange={p.onContrast}/>
          <Toggle label="Animationen reduzieren" description="Weniger Bewegung bei Sheets und Navigation" checked={p.reducedMotion} onChange={p.onReducedMotion}/>
        </section>
        <section className="settings-group">
          <div className="settings-section-heading"><h3>Standort</h3></div>
          <div className="settings-status-row"><span className={p.locationStatus.toLocaleLowerCase("de-DE").includes("aktiv") ? "status-dot active" : "status-dot"} aria-hidden="true"/><span><b>Standortstatus</b><small>{locationText}</small></span><button type="button" onClick={p.onRequestLocation}>Prüfen</button></div>
          <Toggle label="Automatisch aktivieren" description="Nur wenn die Browser-Freigabe bereits erteilt ist" checked={p.autoLocation} onChange={p.onAutoLocation}/>
        </section>
      </>}

      {tab==="plans" && <>
        <div className="settings-section-heading"><h3>BahnConnections Plus</h3><p>Komfortfunktionen für häufige Fahrten. Die Basis bleibt kostenlos.</p></div>
        <div className="plan-list">{SUBSCRIPTION_PLANS.map(plan=><section className={"plan-card "+plan.id} key={plan.id}>
          <div><h3>{plan.name}</h3><span>{plan.availability==="available"?"Aktiv":"noch nicht buchbar"}</span></div>
          <ul>{plan.features.map(feature=><li key={feature}>{feature}</li>)}</ul>
          {plan.availability==="planned"&&<><div className="billing-price-options"><span><strong>3,99 €</strong><small>monatlich</small></span><span><strong>29,99 €</strong><small>jährlich</small></span></div></>}
        </section>)}</div>
      </>}
    </div>
  </dialog>;
}
function Toggle({label,description,checked,onChange}:{label:string;description?:string;checked:boolean;onChange:(value:boolean)=>void}) {
  return <label className="settings-toggle"><span><b>{label}</b>{description&&<small>{description}</small>}</span><input type="checkbox" checked={checked} onChange={event=>onChange(event.target.checked)}/><i aria-hidden="true"/></label>;
}
