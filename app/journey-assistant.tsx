"use client";

import { useMemo, useState } from "react";
import type { LiveJourney } from "./live-journey";

function compactJourney(journey: LiveJourney) {
  return {
    startTime: journey.startTime,
    scheduledStartTime: journey.scheduledStartTime,
    endTime: journey.endTime,
    scheduledEndTime: journey.scheduledEndTime,
    durationSeconds: journey.durationSeconds,
    transfers: journey.transfers,
    realtimeStatus: journey.realtimeStatus,
    cancelled: journey.cancelled,
    warnings: journey.warnings.slice(0, 8),
    legs: journey.transitLegs.map((leg) => ({
      name: leg.name,
      category: leg.category,
      operator: leg.operator,
      from: leg.from.name,
      to: leg.to.name,
      startTime: leg.startTime,
      endTime: leg.endTime,
      scheduledStartTime: leg.scheduledStartTime,
      scheduledEndTime: leg.scheduledEndTime,
      alerts: leg.alerts.slice(0, 5).map((alert) => ({ header:alert.header, description:alert.description })),
      stops: leg.stops.slice(0, 40).map((stop) => ({
        name:stop.name,
        arrival:stop.arrival,
        scheduledArrival:stop.scheduledArrival,
        departure:stop.departure,
        scheduledDeparture:stop.scheduledDeparture,
        track:stop.track,
        scheduledTrack:stop.scheduledTrack,
      })),
    })),
  };
}

const QUICK_QUESTIONS = [
  "Schaffe ich meine Anschlüsse?",
  "Was ist der größte Risikopunkt dieser Reise?",
  "Wie viel Verspätung hat die Verbindung aktuell?",
  "Fasse die wichtigsten Änderungen kurz zusammen.",
];

export function JourneyAssistant({ journey }: { journey: LiveJourney }) {
  const [question, setQuestion] = useState("Wie zuverlässig ist diese Verbindung und worauf sollte ich beim Umsteigen achten?");
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [copied, setCopied] = useState(false);

  const context = useMemo(() => {
    const alerts = journey.transitLegs.reduce((sum, leg) => sum + leg.alerts.length, 0);
    const delay = Math.round((new Date(journey.endTime).getTime() - new Date(journey.scheduledEndTime).getTime()) / 60_000);
    return { alerts, delay };
  }, [journey]);

  async function analyze(nextQuestion = question) {
    const clean = nextQuestion.trim();
    if (!clean) return;
    setQuestion(clean);
    setState("loading");
    setAnswer("");
    setCopied(false);
    try {
      const response = await fetch("/api/ai/route", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ question:clean, journey:compactJourney(journey) }),
      });
      const body = await response.json() as { answer?:string; error?:string };
      if (!response.ok || !body.answer) throw new Error(body.error ?? "Analyse nicht verfügbar");
      setAnswer(body.answer);
      setState("idle");
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : "Analyse ist gerade nicht verfügbar.");
      setState("error");
    }
  }

  async function copyAnswer() {
    if (!answer) return;
    await navigator.clipboard.writeText(answer);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="journey-ai journey-ai-v33">
      <div className="journey-ai-head">
        <div><span>ATLAS · REISEANALYSE</span><b>Diese Verbindung verstehen</b><p>Atlas erklärt nur die Daten, die bereits zu dieser Reise vorliegen.</p></div>
        <div className="journey-ai-context">
          <span>{journey.transfers ? journey.transfers + " Umstieg" + (journey.transfers > 1 ? "e" : "") : "direkt"}</span>
          <span className={context.delay > 0 ? "warning" : ""}>{context.delay > 0 ? "+" + context.delay + " Min." : "planmäßig"}</span>
          {context.alerts > 0 && <span className="warning">{context.alerts} Hinweis{context.alerts > 1 ? "e" : ""}</span>}
        </div>
      </div>

      <div className="journey-ai-quick">
        {QUICK_QUESTIONS.map((item) => <button key={item} type="button" onClick={() => void analyze(item)} disabled={state === "loading"}>{item}</button>)}
      </div>

      <div className="journey-ai-compose">
        <textarea value={question} maxLength={400} onChange={(event) => setQuestion(event.target.value)} aria-label="Frage zur Verbindung" />
        <button type="button" onClick={() => void analyze()} disabled={state === "loading" || !question.trim()}>
          {state === "loading" ? <><i className="journey-ai-spinner" /> Analysiere</> : "Analysieren →"}
        </button>
      </div>

      <div className="journey-ai-trust"><span>Nur geladene Fahrtdaten</span><span>Keine erfundenen Gleise oder Zeiten</span></div>

      {answer && (
        <div className={"journey-ai-answer journey-ai-answer-v33" + (state === "error" ? " error" : "")}>
          <div className="journey-ai-answer-head"><b>{state === "error" ? "Analyse nicht verfügbar" : "Atlas-Einordnung"}</b>{state !== "error" && <button type="button" onClick={() => void copyAnswer()}>{copied ? "Kopiert" : "Kopieren"}</button>}</div>
          <p>{answer}</p>
        </div>
      )}
    </section>
  );
}
