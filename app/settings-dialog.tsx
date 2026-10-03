"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
    setMessage(saved ? "Profil auf diesem Gerät gespeichert." : "Profil gilt für diese Sitzung. Der Browser erlaubt gerade keine Speicherung.");
  }
  const homeStation=p.stations.find(station=>station.id===p.profile.homeStationId);
  return <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-title" onCancel={p.onClose} onClick={event=>{if(event.target===event.currentTarget){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)p.onClose();}}}>
    <header className="settings-heading"><div><small>DEIN BAHNCONNECTIONS</small><h2 id="settings-title">Einstellungen</h2></div><button type="button" className="round-button" onClick={p.onClose} aria-label="Einstellungen schließen"><UiIcon name="close"/></button></header>
    <nav className="settings-tabs" aria-label="Einstellungsbereiche">{([['profile','Profil'],['settings','Darstellung'],['plans','Abonnement']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={tab===id} className={tab===id ? "active" : ""} onClick={()=>setTab(id)}>{label}</button>)}</nav>
    <div className="settings-content" key={tab}>
      {tab==="profile" && <><div className="profile-overview"><span className="profile-avatar" aria-hidden="true">{p.profile.initials||<UiIcon name="user"/>}</span><div><h3>{p.profile.name||"Dein Profil"}</h3><p>Free · {p.favoriteCount} Favoriten</p></div></div><form onSubmit={save} className="profile-form"><label>Dein Name<input autoComplete="nickname" maxLength={40} value={name} onChange={event=>setName(event.target.value)} placeholder="Wie heißt du?"/></label><label>Heimatbahnhof<select value={home} onChange={event=>setHome(event.target.value)}><option value="">Bahnhof auswählen</option>{p.stations.map(station=><option key={station.id} value={station.id}>{station.name}</option>)}</select></label><button type="submit" className="settings-primary">Profil speichern</button><p role="status" className="settings-message">{message}</p></form>{homeStation&&<button className="settings-link" onClick={()=>{p.onHomeStation(homeStation);p.onClose();}}>Abfahrten in {homeStation.name}</button>}<button className="settings-link" onClick={()=>{setName('');setHome('');p.onProfile(parseLocalProfile(null));setMessage('Lokales Profil gelöscht.');}}>Profil löschen</button><p className="settings-note">Dein Profil bleibt auf diesem Gerät. Es ist kein Online-Konto und wird nicht synchronisiert.</p><SavedRoutesPanel routes={p.savedRoutes} onOpen={p.onOpenRoute} onRemove={p.onRemoveRoute}/></>}
      {tab==="settings" && <><section className="settings-group"><h3>Darstellung</h3><div className="theme-choice">{(['light','dark'] as const).map(theme=><button key={theme} aria-pressed={p.theme===theme} className={p.theme===theme ? 'active' : ''} onClick={()=>p.onTheme(theme)}><UiIcon name={theme==='light'?'sun':'moon'}/>{theme==='light'?'Hell':'Dunkel'}</button>)}</div><Toggle label="Größere Schrift" checked={p.largeFont} onChange={p.onLargeFont}/><Toggle label="Hoher Kontrast" checked={p.highContrast} onChange={p.onContrast}/><Toggle label="Animationen reduzieren" checked={p.reducedMotion} onChange={p.onReducedMotion}/></section><section className="settings-group"><h3>Standort</h3><Toggle label="Bei erteilter Freigabe automatisch aktivieren" checked={p.autoLocation} onChange={p.onAutoLocation}/><p className="settings-note">{p.locationStatus}{p.locationAccuracy!==undefined ? ` · Genauigkeit ca. ${Math.round(p.locationAccuracy)} m` : ''}</p><button className="settings-link" onClick={p.onRequestLocation}><UiIcon name="location"/>Standort freigeben oder erneut versuchen</button><p className="settings-note">Die Freigabe verwaltest du im Browser. Dein Standort wird nicht im Profil gespeichert.</p></section></>}
      {tab==="plans" && <><h3>Dein Abonnement</h3><p className="settings-note">Die Basisfunktionen und lokale Pendelstrecken bleiben kostenlos. Plus ist in Vorbereitung: 3,99 € monatlich oder 29,99 € jährlich. Noch nicht buchbar.</p><div className="plan-list">{SUBSCRIPTION_PLANS.map(plan=><section className={'plan-card '+plan.id} key={plan.id}><div><h3>{plan.name}</h3><span>{plan.availability==='available'?'Dein Tarif':'In Vorbereitung'}</span></div><ul>{plan.features.map(feature=><li key={feature}>{feature}</li>)}</ul>{plan.availability==='planned'&&<><div className="billing-price-options"><span><strong>3,99 €</strong> / Monat</span><span><strong>29,99 €</strong> / Jahr<small>Spart 17,89 € gegenüber 12 Monatszahlungen</small></span></div><small>Geplante Funktionen · noch nicht buchbar</small><p className="settings-note">Stripe-Checkout und Abo-Verwaltung werden im Testmodus eingerichtet. Es werden noch keine Zahlungen angenommen.</p></>}</section>)}</div></>}
    </div>
  </dialog>;
}
function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(value:boolean)=>void}) {
  return <label className="settings-toggle"><span>{label}</span><input type="checkbox" checked={checked} onChange={event=>onChange(event.target.checked)}/><i aria-hidden="true"/></label>;
}
