import type { LiveJourney } from './live-journey';

export type JourneySort='recommended'|'arrival'|'duration'|'changes'|'walking';
/** Shift a local calendar date while preserving wall-clock time across DST. */
export function shiftPlannerDay(value:string,days:number):string|null {
  const match=/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value);
  if(!match||!Number.isInteger(days)||Math.abs(days)>31)return null;
  const date=new Date(match[1]+'T12:00:00Z');
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==match[1]||Number(match[2].slice(0,2))>23||Number(match[2].slice(3))>59)return null;
  date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10)+'T'+match[2];
}
export const walkingMinutes=(journey:LiveJourney)=>Math.ceil(journey.legs.filter(leg=>leg.category==='walk').reduce((seconds,leg)=>seconds+Math.max(0,leg.durationSeconds),0)/60);
const timestamp=(value:string)=>Number.isFinite(Date.parse(value))?Date.parse(value):Infinity;
export function sortJourneys(journeys:LiveJourney[],order:JourneySort):LiveJourney[] {
  if(order==='recommended')return [...journeys];
  const value=(journey:LiveJourney)=>order==='arrival'?timestamp(journey.endTime):order==='duration'?journey.durationSeconds:order==='changes'?journey.transfers:walkingMinutes(journey);
  return [...journeys].sort((a,b)=>Number(a.cancelled)-Number(b.cancelled)||value(a)-value(b)||timestamp(a.startTime)-timestamp(b.startTime)||a.id.localeCompare(b.id));
}
const clock=(value:string)=>Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'Zeit unbekannt';
export function journeyText(journey:LiveJourney):string {
  const lines=['BahnConnections – Reiseübersicht',`Stand: ${clock(journey.updatedAt)} · Gespeicherte Momentaufnahme, keine laufende Echtzeit.`,journey.cancelled?'ACHTUNG: Verbindung enthält Ausfälle.':'',`${clock(journey.startTime)} → ${clock(journey.endTime)}`,`${journey.transfers} Umstiege · ${walkingMinutes(journey)} Min. Fußweg`,...journey.legs.map(leg=>`${leg.cancelled?'AUSFALL · ':''}${leg.name}: ${leg.from.name} (${clock(leg.startTime)}) → ${leg.to.name} (${clock(leg.endTime)})${leg.from.track?` · Abfahrt Gleis ${leg.from.track}`:''}${leg.to.track?` · Ankunft Gleis ${leg.to.track}`:''} · ${leg.realtime?'Prognose zum angegebenen Stand':'Fahrplan'}`),...journey.warnings.map(warning=>`Hinweis: ${warning}`),`Quelle: ${journey.sourceLabel}`];
  return lines.filter(Boolean).join('\n');
}
const escapeCalendar=(value:string)=>value.replaceAll('\\','\\\\').replace(/\r\n|\r|\n/g,'\\n').replaceAll(';','\\;').replaceAll(',','\\,');
function foldCalendar(line:string):string {
  const encoder=new TextEncoder();let output='',current='';
  for(const character of line){if(encoder.encode(current+character).length>75){output+=current+'\r\n';current=' ';}current+=character;}
  return output+current;
}
const calendarTime=(value:string)=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export function journeyCalendar(journey:LiveJourney,now=new Date()):string {
  if(journey.cancelled)throw new Error('Ausgefallene Verbindungen können nicht als Reise in den Kalender übernommen werden.');
  const start=journey.scheduledStartTime,end=journey.scheduledEndTime;
  if(!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))||Date.parse(end)<=Date.parse(start))throw new Error('Keine gültigen Fahrplanzeiten für den Kalender.');
  let hash=2166136261;for(const character of journey.id)hash=Math.imul(hash^character.charCodeAt(0),16777619);
  const from=journey.legs[0]?.from.name??'Start',to=journey.legs.at(-1)?.to.name??'Ziel';
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BahnConnections//Reiseexport//DE','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${(hash>>>0).toString(16)}-${calendarTime(start)}@bahnconnections`,`DTSTAMP:${calendarTime(now.toISOString())}`,`DTSTART:${calendarTime(start)}`,`DTEND:${calendarTime(end)}`,`SUMMARY:${escapeCalendar(`${from} → ${to}`)}`,`LOCATION:${escapeCalendar(from)}`,`DESCRIPTION:${escapeCalendar('Kalenderzeiten entsprechen dem Fahrplan. Vor Abfahrt aktuelle Verbindung prüfen.\n\n'+journeyText(journey))}`,'STATUS:TENTATIVE','END:VEVENT','END:VCALENDAR'];
  return lines.map(foldCalendar).join('\r\n')+'\r\n';
}
