"use client";
import {revalidateJourney} from './journey-revalidation';
import {useState} from 'react';
import type {LiveJourney} from './live-journey';
import {journeyCalendar,journeyCalendarLinks} from './journey-tools';
export function JourneyExport({journey}:{journey:LiveJourney}) {
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  let links:ReturnType<typeof journeyCalendarLinks>|null=null;
  let unavailable='';
  try {links=journeyCalendarLinks(journey);} catch(error) {unavailable=error instanceof Error?error.message:'Kalender nicht verfügbar.';}
  async function download(){
    setBusy(true);
    try {
      const fresh=await revalidateJourney(journey);
      const url=URL.createObjectURL(new Blob([journeyCalendar(fresh)],{type:'text/calendar;charset=utf-8'}));
      const link=document.createElement('a');link.href=url;link.download='bahnconnections-reise.ics';
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
      setMessage('Kalenderdatei öffnen und die Reise in deiner Kalender-App bestätigen.');
    } catch(error) {setMessage(error instanceof Error?error.message:'Kalenderimport nicht möglich.');}finally{setBusy(false);}
  }
  async function openCalendar(kind:'google'|'outlook'){
    const target=window.open('about:blank','_blank');
    if(target)target.opener=null;
    setBusy(true);
    try{const fresh=await revalidateJourney(journey);const href=journeyCalendarLinks(fresh)[kind];if(target)target.location.href=href;else window.location.href=href;}
    catch(error){target?.close();setMessage(error instanceof Error?error.message:'Reise nicht aktuell prüfbar.');}
    finally{setBusy(false);}
  }
  return <details className="journey-export"><summary>Zum Kalender hinzufügen</summary>
    <p>Wähle deinen Kalender und bestätige dort mit „Speichern“. Der Termin enthält Fahrplanzeiten; Änderungen der Reise werden nicht automatisch übernommen.</p>
    <div className="journey-export-actions">
      {links&&<><button type="button" disabled={busy} onClick={()=>void openCalendar('google')}>Google Kalender öffnen</button><button type="button" disabled={busy} onClick={()=>void openCalendar('outlook')}>Outlook Kalender öffnen</button></>}
      <button type="button" disabled={!links||busy} onClick={()=>void download()}>Apple oder andere Kalender (ICS)</button>
    </div>
    {busy&&<p role="status">Aktuelle Haltefolge wird geprüft …</p>}{unavailable&&<p role="status">{unavailable}</p>}{message&&<p role="status">{message}</p>}
  </details>;
}
