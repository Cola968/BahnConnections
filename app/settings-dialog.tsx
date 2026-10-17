"use client";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { Station } from "./network-data";
import { UiIcon } from "./ui-icon";
import { SavedRoutesPanel } from "./saved-routes-panel";
import type { SavedRoute } from "./saved-routes";
import { PLUS_PRICING } from "./subscription-plans";
import { APP_VERSION_LABEL } from "./app-version";

const formatEuro=(cents:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(cents/100);

export type LocalProfile={name:string;homeStationId:string;homeStationName:string;favoriteLine:string;avatarDataUrl:string;initials:string};
export function parseLocalProfile(value:unknown):LocalProfile {
  const p=value && typeof value==="object" ? value as Record<string,unknown> : {};
  const name=typeof p.name==="string" ? p.name.trim().slice(0,40) : "";
  return {name,homeStationId:typeof p.homeStationId==="string" ? p.homeStationId.slice(0,120) : "",homeStationName:typeof p.homeStationName==="string" ? p.homeStationName.trim().slice(0,100) : "",favoriteLine:typeof p.favoriteLine==="string" ? p.favoriteLine.trim().slice(0,24) : "",avatarDataUrl:typeof p.avatarDataUrl==="string" && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.avatarDataUrl) && p.avatarDataUrl.length<180000 ? p.avatarDataUrl : "",initials:name.split(/\s+/).map(part=>Array.from(part)[0]).slice(0,2).join("").toLocaleUpperCase("de-DE")};
}
type Props={
  savedRoutes:SavedRoute[];onOpenRoute:(route:SavedRoute,reverse:boolean)=>void;onRemoveRoute:(id:string)=>void;
  onClose:()=>void;profile:LocalProfile;onProfile:(profile:LocalProfile)=>boolean;
  stations:Station[];onHomeStation:(station:Station)=>void;favoriteCount:number;
  theme:"light"|"dark";onTheme:(theme:"light"|"dark")=>void;
  language:"de"|"en";onLanguage:(language:"de"|"en")=>void;
  highContrast:boolean;onContrast:(value:boolean)=>void;fontScale:"compact"|"normal"|"large";onFontScale:(value:"compact"|"normal"|"large")=>void;
  reducedMotion:boolean;onReducedMotion:(value:boolean)=>void;
  autoLocation:boolean;onAutoLocation:(value:boolean)=>void;onRequestLocation:()=>void;
  locationStatus:string;locationAccuracy?:number;
  initialTab?:"profile"|"settings"|"about"|"plans";
  showTrails:boolean;onShowTrails:(value:boolean)=>void;showRouteLabels:boolean;onShowRouteLabels:(value:boolean)=>void;overviewRoutesVisible:boolean;onOverviewRoutesVisible:(value:boolean)=>void;
};
export function SettingsDialog(p:Props) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [tab,setTab]=useState<"profile"|"settings"|"about"|"plans">(p.initialTab??"profile");
  const [name,setName]=useState(p.profile.name);
  const [homeText,setHomeText]=useState(p.profile.homeStationName || p.stations.find(station=>station.id===p.profile.homeStationId)?.name || "");
  const [favoriteLine,setFavoriteLine]=useState(p.profile.favoriteLine);
  const [avatarDataUrl,setAvatarDataUrl]=useState(p.profile.avatarDataUrl);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    const el=dialog.current,previous=document.activeElement as HTMLElement|null;
    el?.showModal();
    return ()=>{el?.close();previous?.focus();};
  },[]);
  function save(event:FormEvent) {
    event.preventDefault();
    const found=p.stations.find(station=>station.name.toLocaleLowerCase("de-DE")===homeText.trim().toLocaleLowerCase("de-DE"));
    const saved=p.onProfile(parseLocalProfile({name,homeStationId:found?.id || "",homeStationName:homeText.trim(),favoriteLine,avatarDataUrl}));
    setMessage(saved ? "Gespeichert." : "Für diese Sitzung übernommen.");
  }
  const homeStation=p.stations.find(station=>station.id===p.profile.homeStationId);
  const suggestions=homeText.trim().length>=2 ? p.stations.filter(station=>station.name.toLocaleLowerCase("de-DE").includes(homeText.toLocaleLowerCase("de-DE"))).slice(0,12) : [];
  async function choosePhoto(file?:File) {
    if(!file)return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>5_000_000){setMessage("Bitte ein JPG-, PNG- oder WebP-Bild unter 5 MB auswählen.");return;}
    try {
      const bitmap=await createImageBitmap(file);
      const canvas=document.createElement("canvas");canvas.width=192;canvas.height=192;
      const ctx=canvas.getContext("2d");if(!ctx){bitmap.close();throw new Error("Canvas nicht verfügbar");}
      const scale=Math.max(192/bitmap.width,192/bitmap.height);
      ctx.drawImage(bitmap,(192-bitmap.width*scale)/2,(192-bitmap.height*scale)/2,bitmap.width*scale,bitmap.height*scale);
      bitmap.close();const data=canvas.toDataURL("image/jpeg",.72);
      if(data.length>=180000)throw new Error("Bild zu groß");
      setAvatarDataUrl(data);setMessage("Profilbild ausgewählt. Bitte speichern.");
    } catch {setMessage("Bild konnte nicht verarbeitet werden.");}
  }
  const tabIndex=tab==="profile"?0:tab==="settings"?1:tab==="about"?2:3;
  const locationText=`${p.locationStatus}${p.locationAccuracy!==undefined ? ` · ±${Math.round(p.locationAccuracy)} m` : ""}`;

  return <dialog ref={dialog} className="settings-dialog settings-dialog-v48" aria-labelledby="settings-title" onCancel={event=>{event.preventDefault();p.onClose();}} onKeyDownCapture={event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();p.onClose();}}} onClick={event=>{if(event.target===event.currentTarget){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)p.onClose();}}}>
    <header className="settings-heading">
      <div className="settings-heading-copy"><h2 id="settings-title">Einstellungen</h2><p className="settings-subtitle">Passe die App an dich an</p></div>
      <button type="button" className="round-button" onClick={p.onClose} aria-label="Einstellungen schließen"><UiIcon name="close"/></button>
    </header>
    <nav className="settings-tabs" aria-label="Einstellungsbereiche" style={{"--settings-tab-index":tabIndex,"--settings-tab-offset":`${tabIndex*100}%`} as CSSProperties}>
      {([["profile","Profil","user"],["settings","Design","settings"],["about","App","layers"],["plans","Plus","star"]] as const).map(([id,label,icon])=><button type="button" key={id} data-settings-tab={id} aria-pressed={tab===id} className={tab===id ? "active" : ""} onClick={()=>setTab(id)}><UiIcon name={icon}/><span>{label}</span></button>)}
      <i className="settings-tab-indicator" aria-hidden="true"/>
    </nav>

    <div className="settings-content" key={tab}>
      {tab==="profile" && <>
        <div className="profile-overview profile-overview-v53">
          <span className="profile-avatar" aria-hidden={!avatarDataUrl}>{avatarDataUrl ? <img src={avatarDataUrl} alt="Dein Profilbild · Vorschau"/> : (name.trim().split(/\s+/).map(item=>item[0]).slice(0,2).join("").toLocaleUpperCase("de")||<UiIcon name="user"/>)}</span>
          <div><h3>{p.profile.name||"Dein Profil"}</h3><p>{p.favoriteCount} Favoriten{(homeStation?.name || p.profile.homeStationName) ? ` · ${homeStation?.name || p.profile.homeStationName}` : ""}{p.profile.favoriteLine ? ` · ${p.profile.favoriteLine}` : ""}</p></div>
        </div>
        <div className="profile-quick-stats" aria-label="Dein Überblick"><span><UiIcon name="star"/><strong>{p.favoriteCount}</strong><small>Favoriten</small></span><span><UiIcon name="route"/><strong>{p.savedRoutes.length}</strong><small>Pendelstrecken</small></span><span><UiIcon name="location"/><strong>{homeStation||p.profile.homeStationName?"1":"0"}</strong><small>Heimatbahnhof</small></span></div>
        <div className="settings-section-heading settings-profile-intro"><h3><UiIcon name="user"/> Dein Profil</h3><p>Diese Daten bleiben lokal auf deinem Gerät.</p></div>
        <form onSubmit={save} className="profile-form">
          <label><span>Name</span><input autoComplete="nickname" maxLength={40} value={name} onChange={event=>setName(event.target.value)} placeholder="Wie heißt du?"/></label>
          <label className="profile-photo-picker"><span>Profilbild (auch im App-Header sichtbar)</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>void choosePhoto(event.target.files?.[0])}/>{avatarDataUrl && <button type="button" className="settings-link" onClick={()=>setAvatarDataUrl("")}>Bild entfernen</button>}<small>Das Bild wird nach „Speichern“ oben rechts angezeigt und bleibt auf diesem Gerät.</small></label>
          <label><span>Heimatbahnhof</span><input type="text" list="home-station-suggestions" maxLength={100} value={homeText} onChange={event=>setHomeText(event.target.value)} placeholder="Bahnhof eingeben, z. B. Berlin Hbf"/><datalist id="home-station-suggestions">{suggestions.map(station=><option key={station.id} value={station.name}/>)}</datalist><small>Passende Bahnhöfe können direkt geöffnet werden.</small></label>
          <label><span>Lieblingslinie (optional)</span><input type="text" maxLength={24} value={favoriteLine} onChange={event=>setFavoriteLine(event.target.value)} placeholder="z. B. S7, RE1 oder ICE"/></label>
          <button type="submit" className="settings-primary">Speichern</button>
          {message&&<p role="status" className="settings-message">{message}</p>}
        </form>
        {homeStation&&<button className="settings-link settings-quick-action" onClick={()=>{p.onHomeStation(homeStation);p.onClose();}}><UiIcon name="clock"/>Abfahrten am Heimatbahnhof</button>}
        <div className="settings-section-heading settings-profile-intro"><h3><UiIcon name="route"/> Deine Fahrten</h3><p>Gespeicherte Pendelstrecken für deinen schnellen Rückweg.</p></div>
        <SavedRoutesPanel routes={p.savedRoutes} onOpen={p.onOpenRoute} onRemove={p.onRemoveRoute}/>
        <details className="settings-danger-zone">
          <summary><UiIcon name="info"/> Datenschutz & lokale Profildaten</summary>
          <p>Profil und Heimatbahnhof liegen nur auf diesem Gerät.</p>
          <button className="settings-link danger" onClick={()=>{setName("");setHomeText("");setFavoriteLine("");setAvatarDataUrl("");p.onProfile(parseLocalProfile(null));setMessage("Profil zurückgesetzt.");}}>Profil zurücksetzen</button>
        </details>
      </>}

      {tab==="settings" && <>
        <section className="settings-group">
          <div className="settings-section-heading"><h3><UiIcon name="sun"/> {p.language==="en"?"Appearance":"Darstellung"}</h3><p>{p.language==="en"?"Theme, readability and motion.":"Helligkeit, Lesbarkeit und Bewegung."}</p></div>
          <div className="theme-choice" aria-label="Farbschema">{(["light","dark"] as const).map(theme=><button key={theme} aria-pressed={p.theme===theme} className={p.theme===theme ? "active" : ""} onClick={()=>p.onTheme(theme)}><UiIcon name={theme==="light"?"sun":"moon"}/><span>{theme==="light"?"Hell":"Dunkel"}</span></button>)}</div>
          <label className="settings-scale-choice"><span><b>Schriftgröße</b><small>Standard ist jetzt kompakt, jederzeit veränderbar</small></span><select value={p.fontScale} onChange={event=>p.onFontScale(event.target.value as "compact"|"normal"|"large")}><option value="compact">Kompakt (Standard)</option><option value="normal">Normal</option><option value="large">Groß</option></select></label>
          <label className="settings-scale-choice"><span><b>{p.language==="en"?"Language":"Sprache"}</b><small>{p.language==="en"?"English UI (beta) · navigation and journey planner":"Sprache der App-Oberfläche"}</small></span><select aria-label="Sprache wählen" value={p.language} onChange={e=>p.onLanguage(e.target.value==="en"?"en":"de")}><option value="de">Deutsch</option><option value="en">English (Beta)</option></select></label>
          <Toggle label="Hoher Kontrast" description="Stärkere Trennung von Text und Flächen" checked={p.highContrast} onChange={p.onContrast}/>
          <Toggle label="Animationen reduzieren" description="Weniger Bewegung bei Sheets und Navigation" checked={p.reducedMotion} onChange={p.onReducedMotion}/>
        </section>
        <section className="settings-group">
          <div className="settings-section-heading"><h3><UiIcon name="location"/> Standort & Umgebung</h3><p>Bahnhöfe in deiner Nähe schneller finden.</p></div>
          <div className="settings-status-row"><span className={p.locationStatus.toLocaleLowerCase("de-DE").includes("aktiv") ? "status-dot active" : "status-dot"} aria-hidden="true"/><span><b>Standortstatus</b><small>{locationText}</small></span><button type="button" onClick={p.onRequestLocation}>Prüfen</button></div>
          <Toggle label="Automatisch aktivieren" description="Nur wenn die Browser-Freigabe bereits erteilt ist" checked={p.autoLocation} onChange={p.onAutoLocation}/>
        </section>
        <section className="settings-group"><div className="settings-section-heading"><h3><UiIcon name="layers"/> Kartendarstellung</h3><p>Selten benötigte Kartenoptionen.</p></div><Toggle label="Fernverkehrsnetz" checked={p.overviewRoutesVisible} onChange={p.onOverviewRoutesVisible}/><Toggle label="Liniennamen" checked={p.showRouteLabels} onChange={p.onShowRouteLabels}/><Toggle label="Zugspur" checked={p.showTrails} onChange={p.onShowTrails}/></section>

      </>}

      {tab==="about" && <>
        <section className="settings-group">
          <div className="settings-section-heading"><h3><UiIcon name="info"/> BahnConnections</h3><p>Version, Änderungen und Installation auf einem Blick.</p></div>
          <div className="v53-version-row"><span><b>Webversion</b><small>Öffentliche und vorbereitete Version können sich unterscheiden.</small></span><strong>{APP_VERSION_LABEL}</strong></div>
          <a href="/changelog" className="v53-settings-link"><UiIcon name="arrow"/><span>Was ist neu? · Changelog</span></a>
          <a href="/install" className="v53-settings-link"><UiIcon name="arrow"/><span>App installieren & Updates</span></a>
        </section>
        <section className="settings-group">
          <div className="settings-section-heading"><h3><UiIcon name="user"/> Deine Daten</h3><p>Favoriten, Profilbild und Pendelstrecken sind lokal gespeichert und nicht automatisch zwischen Geräten synchronisiert.</p></div>
          <button className="settings-link" type="button" onClick={()=>{
            const backup={exportedAt:new Date().toISOString(),appVersion:APP_VERSION_LABEL,profile:p.profile,routeCount:p.savedRoutes.length,routes:p.savedRoutes};
            const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
            const url=URL.createObjectURL(blob);
            const anchor=document.createElement("a");anchor.href=url;anchor.download="bahnconnections-meine-daten.json";anchor.click();
            window.setTimeout(()=>URL.revokeObjectURL(url),1000);
            setMessage("Lokale Profildaten und Pendelstrecken exportiert.");
          }}><UiIcon name="arrow"/> Profildaten und Pendelstrecken exportieren</button>
          <p className="settings-note">Dieser Export enthält auch dein Profilbild, sofern gespeichert. Bewahre die Datei geschützt auf. Ein Import ist noch nicht verfügbar.</p>
          {message&&<p className="settings-message" role="status">{message}</p>}
        </section>
        <section className="settings-group"><div className="settings-section-heading"><h3><UiIcon name="location"/> Quellen & Transparenz</h3><p>Fahrplandaten werden von externen Verkehrsdatendiensten geladen. Ohne aktuelle Quelle zeigen wir keine bestätigte Pünktlichkeit.</p></div><p className="settings-note">Baustellen und Störungen werden nur für den gewählten Bahnhof und die aus der Quelle gemeldeten Fahrten angezeigt. Keine Garantie einer vollständigen Netzübersicht.</p></section>
      </>}
      {tab==="plans" && <>
        <div className="settings-section-heading"><h3><UiIcon name="star"/> BahnConnections Plus</h3><p>Die Basis bleibt kostenlos. Plus ist noch nicht buchbar.</p></div>
        <div className="plan-list plan-list-v60-simple">
          <section className="plan-card free">
            <div><h3>Free</h3><span>Aktiv</span></div>
            <ul className="plan-feature-list">
              <li><UiIcon name="check"/><span>Karte und Verbindungssuche</span></li>
              <li><UiIcon name="check"/><span>Live-Abfahrten</span></li>
              <li><UiIcon name="check"/><span>Profil, Favoriten und Pendelstrecken auf diesem Gerät</span></li>
            </ul>
          </section>
          <section className="plan-card plus plus-simple">
            <div className="plus-simple-heading"><h3>Plus</h3><span>Noch nicht buchbar</span></div>
            <ul className="plan-feature-list">
              <li><UiIcon name="check"/><span>Profil und Favoriten synchronisieren</span></li>
              <li><UiIcon name="check"/><span>Hinweise zu deinen Fahrten</span></li>
              <li><UiIcon name="check"/><span>Pendelstrecken auf mehreren Geräten nutzen</span></li>
            </ul>
            <div className="billing-price-options" aria-label="Vorgesehene Preise, noch nicht buchbar">
              <span><strong>{formatEuro(PLUS_PRICING.month)}</strong><small>monatlich</small></span>
              <span><strong>{formatEuro(PLUS_PRICING.year)}</strong><small>jährlich</small></span>
            </div>
            <details className="plus-simple-more">
              <summary>Mehr zu Plus <UiIcon name="chevron"/></summary>
              <div className="plus-simple-more-content">
                <p className="plus-detail-intro">Das ist für Plus geplant:</p>
                <div className="plus-detail-row">
                  <UiIcon name="devices"/>
                  <span><strong>Auf Handy und PC</strong><small>Favoriten und Pendelstrecken auf beiden Geräten wiederfinden.</small></span>
                </div>
                <div className="plus-detail-row">
                  <UiIcon name="bell"/>
                  <span><strong>Fahrthinweise</strong><small>Meldungen zu gespeicherten Fahrten, wenn passende Daten vorliegen.</small></span>
                </div>
                <div className="plus-detail-row">
                  <UiIcon name="euro"/>
                  <span><strong>Preis und Start</strong><small>Wann Plus startet, steht noch nicht fest. Die Preise sind vorläufig.</small></span>
                </div>
              </div>
            </details>
          </section>
        </div>
      </>}
    </div>
  </dialog>;
}
function Toggle({label,description,checked,onChange}:{label:string;description?:string;checked:boolean;onChange:(value:boolean)=>void}) {
  return <label className="settings-toggle"><span><b>{label}</b>{description&&<small>{description}</small>}</span><input type="checkbox" checked={checked} onChange={event=>onChange(event.target.checked)}/><i aria-hidden="true"/></label>;
}
