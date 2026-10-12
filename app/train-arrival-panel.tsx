import { trainArrivalView, type TrainArrivalInput } from "./train-arrival";

type Props = TrainArrivalInput & {
  destination: string;
  heading?: string;
  secondary?: boolean;
};

export function TrainArrivalPanel({destination,heading="Nächster Halt",secondary=false,...input}:Props) {
  const arrival=trainArrivalView(input);
  return <section className={secondary?"train-arrival-panel secondary":"train-arrival-panel"} aria-label={`Ankunft ${destination}`}>
    <div className="train-arrival-title"><span>{heading}</span><b title={destination}>{destination}</b></div>
    <div className="train-arrival-times">
      <div className="train-arrival-time">
        <small>Planmäßig</small>
        <time className={arrival.delayMinutes!==null&&arrival.delayMinutes!==0?"superseded":undefined} dateTime={arrival.planned??undefined}>{arrival.plannedLabel}</time>
      </div>
      <span className="train-arrival-arrow" aria-hidden="true">→</span>
      <div className="train-arrival-time expected">
        <small>{input.cancelled?"Ankunft entfällt":arrival.isFreshPrediction?"Erwartete Ankunft":"Ankunft (Fahrplan)"}</small>
        <time className={`tone-${arrival.tone}`} dateTime={arrival.expected??arrival.planned??undefined}>{arrival.expectedLabel}</time>
        {arrival.expectedDayOffset!==null&&arrival.expectedDayOffset!==0&&<small className="train-arrival-day">{arrival.expectedDayOffset>0?`+${arrival.expectedDayOffset} Tag${arrival.expectedDayOffset!==1?"e":""}`:`${arrival.expectedDayOffset} Tag${arrival.expectedDayOffset!==-1?"e":""}`}</small>}
      </div>
    </div>
    <div className="train-arrival-footer">
      <span className={`train-arrival-status tone-${arrival.tone}`}>{arrival.status}</span>
      <small>{input.cancelled?"Für diesen Halt wird keine Ankunft erwartet":arrival.isFreshPrediction?"Aktuelle Echtzeitprognose":input.realtime?"Keine aktuelle Echtzeitprognose":"Keine Echtzeitmeldung"}</small>
    </div>
  </section>;
}
