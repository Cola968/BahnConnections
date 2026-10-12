"use client";
import {useState} from 'react';
import type {LiveJourney} from './live-journey';
import {journeyCalendar,journeyText} from './journey-tools';
export function JourneyExport({journey}:{journey:LiveJourney}) {
  const [message,setMessage]=useState(''),[fallback,setFallback]=useState('');
  function download(calendar:boolean){
    try{const content=calendar?journeyCalendar(journey):journeyText(journey);const url=URL.createObjectURL(new Blob([content],{type:calendar?'text/calendar;charset=utf-8':'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=calendar?'bahnconnections-reise.ics':'bahnconnections-reise.txt';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage(calendar?'Kalenderdatei erstellt. Sie enthält Fahrplanzeiten.':'Reiseübersicht als Momentaufnahme erstellt.');}
    catch(error){setMessage(error instanceof Error?error.message:'Export nicht möglich.');}
  }
  async function copy(){const text=journeyText(journey);try{await navigator.clipboard.writeText(text);setFallback('');setMessage('Reiseübersicht kopiert.');}catch{setFallback(text);setMessage('Kopieren nicht verfügbar. Text unten auswählen und manuell kopieren.');}}
  return <details className="journey-export"><summary>Reise mitnehmen</summary><p>Kalender: Fahrplanzeiten. Text: Momentaufnahme. Vor Abfahrt aktualisieren.</p><div className="journey-export-actions"><button type="button" disabled={journey.cancelled} onClick={()=>download(true)}>In Kalender übernehmen</button><button type="button" onClick={()=>download(false)}>Text herunterladen</button><button type="button" onClick={()=>{void copy();}}>Übersicht kopieren</button></div>{journey.cancelled&&<p>Kalenderexport für ausgefallene Verbindungen gesperrt.</p>}{message&&<p role="status">{message}</p>}{fallback&&<textarea aria-label="Reiseübersicht zum Kopieren" value={fallback} readOnly/>}</details>;
}
