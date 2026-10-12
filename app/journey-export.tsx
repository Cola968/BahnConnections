"use client";
import {useState} from 'react';
import type {LiveJourney} from './live-journey';
import {journeyCalendar,journeyCalendarLinks} from './journey-tools';
export function JourneyExport({journey}:{journey:LiveJourney}) {
  const [message,setMessage]=useState('');
  let links:ReturnType<typeof journeyCalendarLinks>|null=null;
  let unavailable='';
  try {links=journeyCalendarLinks(journey);} catch(error) {unavailable=error instanceof Error?error.message:'Kalender nicht verfügbar.';}
  function download(){
    try {
      const url=URL.createObjectURL(new Blob([journeyCalendar(journey)],{type:'text/calendar;charset=utf-8'}));
      const link=document.createElement('a');link.href=url;link.download='bahnconnections-reise.ics';
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
      setMessage('Kalenderdatei öffnen und die Reise in deiner Kalender-App bestätigen.');
    } catch(error) {setMessage(error instanceof Error?error.message:'Kalenderimport nicht möglich.');}
  }
  return <details className="journey-export"><summary>Zum Kalender hinzufügen</summary>
    <p>Wähle deinen Kalender und bestätige dort mit „Speichern“. Der Termin enthält Fahrplanzeiten; Änderungen der Reise werden nicht automatisch übernommen.</p>
    <div className="journey-export-actions">
      {links&&<><a href={links.google} target="_blank" rel="noopener noreferrer">Google Kalender öffnen</a><a href={links.outlook} target="_blank" rel="noopener noreferrer">Outlook Kalender öffnen</a></>}
      <button type="button" disabled={!links} onClick={download}>Apple oder andere Kalender (ICS)</button>
    </div>
    {unavailable&&<p role="status">{unavailable}</p>}{message&&<p role="status">{message}</p>}
  </details>;
}
