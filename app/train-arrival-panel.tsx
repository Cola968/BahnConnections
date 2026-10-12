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
        <time dateTime={arrival.planned??undefined}>{arrival.plannedLabel}</time>
      </div>
      <span className="train-arrival-arrow" aria-hidden="true">→</span>
      <div className="train-arrival-time expected">
        <small>Erwartete Ankunft</small>
        <time className={`tone-${arrival.tone}`} dateTime={arrival.expected??undefined}>{arrival.expectedLabel}</time>
      </div>
    </div>
    <div className="train-arrival-footer">
      <span className={`train-arrival-status tone-${arrival.tone}`}>{arrival.status}</span>
      <small>{arrival.isFreshPrediction?"Aktuelle Echtzeitprognose":input.realtime?"Keine aktuelle Echtzeitprognose":"Keine Echtzeitmeldung"}</small>
    </div>
  </section>;
}
