"use client";

import type { LiveJourney } from "./live-journey";
import {useState} from "react";
import {sortJourneys,walkingMinutes,journeyDateRange,type JourneySort} from "./journey-tools";
import { formatDuration } from "./network-data";
import { UiIcon } from "./ui-icon";
import { compactStationLabel } from "./transit-style";

import { JourneyTimeRange } from "./journey-time-range";
import { RealtimeTime } from "./realtime-time";
import { RealtimePlatform } from "./realtime-platform";
import { assessTransfer,assessJourneyTransfers,minimumTransferBuffer } from "./v60-transfer-assessment.ts";

export function JourneyAlternatives({ journeys, selected, limit, label, onSelect, onMore }: {
  journeys:LiveJourney[]; selected:LiveJourney; limit:number; label:(journey:LiveJourney, first:LiveJourney) => string;
  onSelect:(journey:LiveJourney) => void; onMore:() => void;
}) {
  const [order,setOrder]=useState<JourneySort>('recommended');
  const [excludeCancelled,setExcludeCancelled]=useState(true);
  const candidates=journeys.filter(journey=>journey.id!==selected.id);
  const excluded=candidates.filter(journey=>journey.cancelled||journey.transitLegs.some(leg=>leg.cancelled||leg.from.cancelled||leg.to.cancelled)).length;
  const alternatives = sortJourneys(candidates.filter(journey=>!excludeCancelled||!(journey.cancelled||journey.transitLegs.some(leg=>leg.cancelled||leg.from.cancelled||leg.to.cancelled))),order);
  const disrupted=selected.cancelled||selected.transitLegs.some(leg=>leg.cancelled);
  if (!candidates.length) return null;
  return <details className="journey-alternatives">
    <summary>{disrupted?"Fahrt fällt aus · Alternativen prüfen":"Andere Verbindungen"} <span>{alternatives.length}{excluded&&excludeCancelled?` von ${candidates.length}`:""}<UiIcon name="chevron" width="16" height="16" /></span></summary>
    <div className="v58-alternative-sort" role="group" aria-label="Andere Verbindungen sortieren">{([["recommended","Empfohlen"],["arrival","Früh ankommen"],["duration","Schnell"],["changes","Wenig Umstiege"],["walking","Wenig Fußweg"],["transfer","Mehr Umstiegszeit"]] as const).map(([id,label])=><button key={id} type="button" aria-pressed={order===id} onClick={()=>setOrder(id)}>{label}</button>)}</div>
    {excluded>0&&<label className="v60-alternative-available"><input type="checkbox" checked={excludeCancelled} onChange={event=>setExcludeCancelled(event.target.checked)}/> Nur Verbindungen ohne gemeldeten Ausfall ({excluded} ausgeblendet)</label>}
    {!alternatives.length&&<p className="v60-alternative-empty">Keine Alternative ohne gemeldeten Ausfall in dieser Auswahl. Mit dem Schalter kannst du auch ausgefallene Vorschläge anzeigen.</p>}
    <div>{alternatives.slice(0,limit).map(journey => <button type="button" key={journey.id} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); onSelect(journey); }}>
      <em>{label(journey,journeys[0])}</em>
      <small>{journeyDateRange(journey)}</small>
      <JourneyTimeRange journey={journey} />
      <small>{formatDuration(Math.round(journey.durationSeconds / 60))} · {journey.transfers ? `${journey.transfers} Umstieg${journey.transfers > 1 ? "e" : ""}` : "Direkt"}</small>
      <small>{journey.transitLegs.map(leg => leg.name).join(" · ")}</small>
      {journey.transitLegs.length>1&&<small>{minimumTransferBuffer(journey)===null?"Umstiegszeit nicht berechenbar":`Kleinste Umstiegszeit: ${minimumTransferBuffer(journey)} Min. ${assessJourneyTransfers(journey).every(transfer=>transfer.walkProvided)?"(gemeldete Fußwege abgezogen)":"(mindestens ein Gleisweg nicht bekannt)"} · kein garantierter Anschluss`}</small>}
      <small>{walkingMinutes(journey)} Min. Fußweg · {Math.round((journey.durationSeconds-selected.durationSeconds)/60)>0?'+':''}{Math.round((journey.durationSeconds-selected.durationSeconds)/60)} Min. gegenüber Auswahl{journey.cancelled?' · Ausfall':''}</small>
    </button>)}{alternatives.length > limit && <button type="button" className="journey-more" onClick={onMore}>Weitere Verbindungen anzeigen</button>}</div>
  </details>;
}

export function TransferNotice({ journey, index }: {journey:LiveJourney; index:number}) {
  const previous=journey.transitLegs[index],next=journey.transitLegs[index+1];
  if(!previous||!next)return null;
  const assessment=assessTransfer(journey,index);
  return <div className={`transfer-step ${assessment.tone}`} role="status">
    <span><b>{assessment.label} · {compactStationLabel(previous.to.name)??previous.to.name}</b>
      <span className="transfer-times">
        <span>Ankunft <RealtimeTime scheduled={previous.scheduledEndTime} actual={assessment.arrivalRealtime?previous.endTime:previous.scheduledEndTime} realtime={assessment.arrivalRealtime} cancelled={previous.cancelled||previous.to.cancelled} cancellationLabel={previous.cancelled?"Fahrtabschnitt entfällt":"Halt entfällt"} compact /> · <RealtimePlatform scheduled={previous.to.scheduledTrack} actual={assessment.arrivalRealtime?previous.to.track:previous.to.scheduledTrack}/></span>
        <span>Abfahrt <RealtimeTime scheduled={next.scheduledStartTime} actual={assessment.departureRealtime?next.startTime:next.scheduledStartTime} realtime={assessment.departureRealtime} cancelled={next.cancelled||next.from.cancelled} cancellationLabel={next.cancelled?"Fahrtabschnitt entfällt":"Halt entfällt"} compact /> · <RealtimePlatform scheduled={next.from.scheduledTrack} actual={assessment.departureRealtime?next.from.track:next.from.scheduledTrack}/></span>
      </span>
      <small>{next.name} · {assessment.detail}</small>
    </span>
  </div>;
}
