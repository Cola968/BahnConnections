"use client";

import { useEffect, useMemo, useState } from "react";
import type { Station } from "./network-data";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from "./subscription";
import { UiIcon } from "./ui-icon";

type Profile = {
  displayName:string;
  homeStation:string;
  bio:string;
};

const EMPTY_PROFILE:Profile={displayName:"",homeStation:"",bio:""};

export function SettingsPanel({
  open,
  onClose,
  theme,
  onTheme,
  highContrast,
  onHighContrast,
  fontScale,
  onFontScale,
  autoLocation,
  onAutoLocation,
  geoStatus,
  geoAccuracy,
  onLocate,
  onStopLocation,
  stations,
}:{
  open:boolean;
  onClose:()=>void;
  theme:"light"|"dark";
  onTheme:(value:"light"|"dark")=>void;
  highContrast:boolean;
  onHighContrast:(value:boolean)=>void;
  fontScale:"normal"|"large";
  onFontScale:(value:"normal"|"large")=>void;
  autoLocation:boolean;
  onAutoLocation:(value:boolean)=>void;
  geoStatus:"idle"|"locating"|"active"|"error";
  geoAccuracy?:number;
  onLocate:()=>void;
  onStopLocation:()=>void;
  stations:Station[];
}) {
  const [profile,setProfile]=useState<Profile>(EMPTY_PROFILE);
  const [plan]=useState<SubscriptionPlanId>("free");
  const homeSuggestions=useMemo(()=>stations.filter((station)=>station.country==="DE").slice(0,700),[stations]);

  useEffect(()=>{
    if(!open) return;
    try {
      const saved=localStorage.getItem("bahnconnections-profile");
      if(saved) setProfile({...EMPTY_PROFILE,...JSON.parse(saved)});
    } catch { /* A profile can still be edited for this session. */ }
  },[open]);

  useEffect(()=>{
    if(!open) return;
    try { localStorage.setItem("bahnconnections-profile",JSON.stringify(profile)); } catch { /* Storage may be unavailable. */ }
  },[open,profile]);

  if(!open) return null;
  const initials=(profile.displayName.trim() || "B").split(/\s+/).slice(0,2).map((part)=>part[0]?.toUpperCase()).join("");

  return <div className="settings-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event)=>event.stopPropagation()}>
      <header className="settings-head">
        <div className="profile-avatar" aria-hidden="true">{initials}</div>
        <div><span className="eyebrow plain">BAHNCONNECTIONS</span><h2 id="settings-title">Profil & Einstellungen</h2><p>Persönlich, lokal und gerätebezogen. Cloud-Sync ist für Plus vorbereitet.</p></div>
        <button className="round-button" onClick={onClose} aria-label="Einstellungen schließen"><UiIcon name="close" /></button>
      </header>

      <div className="settings-scroll">
        <section className="settings-section profile-settings">
          <div className="settings-section-title"><div><b>Mein Profil</b><small>Wird aktuell nur auf diesem Gerät gespeichert</small></div></div>
          <label><span>Anzeigename</span><input value={profile.displayName} onChange={(event)=>setProfile((current)=>({...current,displayName:event.target.value.slice(0,40)}))} placeholder="Dein Name" /></label>
          <label><span>Heimatbahnhof</span><input list="profile-home-stations" value={profile.homeStation} onChange={(event)=>setProfile((current)=>({...current,homeStation:event.target.value.slice(0,80)}))} placeholder="z. B. Berlin Hbf" /><datalist id="profile-home-stations">{homeSuggestions.map((station)=><option key={station.id} value={station.name} />)}</datalist></label>
          <label><span>Profiltext <small>optional</small></span><textarea value={profile.bio} onChange={(event)=>setProfile((current)=>({...current,bio:event.target.value.slice(0,120)}))} placeholder="z. B. Pendler · Fernverkehr · Wochenendtrips" /></label>
        </section>

        <section className="settings-section">
          <div className="settings-section-title"><div><b>Darstellung</b><small>Gilt auf diesem Gerät</small></div></div>
          <div className="settings-segmented" role="group" aria-label="Farbschema">
            <button className={theme==="light"?"active":""} onClick={()=>onTheme("light")}><UiIcon name="sun" />Hell</button>
            <button className={theme==="dark"?"active":""} onClick={()=>onTheme("dark")}><UiIcon name="moon" />Dunkel</button>
          </div>
          <div className="settings-switch-row"><span><b>Hoher Kontrast</b><small>Stärkere Kanten und weniger Transparenz</small></span><button role="switch" aria-checked={highContrast} className={highContrast?"switch active":"switch"} onClick={()=>onHighContrast(!highContrast)}><i /></button></div>
          <div className="settings-switch-row"><span><b>Große Schrift</b><small>Mehr Lesbarkeit in Panels und Tafeln</small></span><button role="switch" aria-checked={fontScale==="large"} className={fontScale==="large"?"switch active":"switch"} onClick={()=>onFontScale(fontScale==="large"?"normal":"large")}><i /></button></div>
        </section>

        <section className="settings-section">
          <div className="settings-section-title"><div><b>Standort</b><small>Automatisch nur, wenn dein Browser bereits Zugriff erlaubt</small></div></div>
          <div className="settings-switch-row"><span><b>Standort automatisch verwenden</b><small>Startet beim Öffnen, sobald die Browserfreigabe auf „Erlaubt“ steht</small></span><button role="switch" aria-checked={autoLocation} className={autoLocation?"switch active":"switch"} onClick={()=>onAutoLocation(!autoLocation)}><i /></button></div>
          <div className="location-settings-status"><span className={"location-status-dot "+geoStatus} /><div><b>{geoStatus==="active"?"Standort aktiv":geoStatus==="locating"?"Standort wird gesucht":geoStatus==="error"?"Standort nicht verfügbar":"Standort inaktiv"}</b><small>{geoStatus==="active"&&geoAccuracy?"Genauigkeit etwa "+Math.round(geoAccuracy)+" m":"Die Freigabe wird vom Browser bzw. Betriebssystem verwaltet."}</small></div>{geoStatus==="active"?<button onClick={onStopLocation}>Beenden</button>:<button onClick={onLocate}>Aktivieren</button>}</div>
        </section>

        <section className="settings-section subscription-settings">
          <div className="settings-section-title"><div><b>BahnConnections Abo</b><small>Technisches Modell vorbereitet – noch keine Zahlung aktiv</small></div></div>
          <div className="plan-grid">
            {SUBSCRIPTION_PLANS.map((item)=><article key={item.id} className={item.id===plan?"plan-card current":"plan-card"}>
              <div><span>{item.name}</span><strong>{item.priceLabel}</strong></div>
              <p>{item.description}</p>
              <ul>{item.highlights.map((feature)=><li key={feature}>{feature}</li>)}</ul>
              <button disabled={!item.available}>{item.id===plan?"Aktueller Plan":"Noch nicht buchbar"}</button>
            </article>)}
          </div>
          <p className="billing-note">Verbindungen, Live-Abfahrten und die Karte bleiben im Free-Plan. Für Plus sind Entitlements und UI vorbereitet; Checkout, Login und Cloud-Sync werden erst mit einem echten Billing-/Auth-Backend aktiviert.</p>
        </section>
      </div>
    </section>
  </div>;
}
