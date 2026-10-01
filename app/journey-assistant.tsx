"use client";

import { useState } from "react";
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
      alerts: leg.alerts.slice(0, 5).map((alert) => ({ header: alert.header, description: alert.description })),
      stops: leg.stops.slice(0, 40).map((stop) => ({
        name: stop.name,
        arrival: stop.arrival,
        scheduledArrival: stop.scheduledArrival,
        departure: stop.departure,
        scheduledDeparture: stop.scheduledDeparture,
        track: stop.track,
        scheduledTrack: stop.scheduledTrack,
      })),
    })),
  };
}

export function JourneyAssistant({ journey }: { journey: LiveJourney }) {
  const [question, setQuestion] = useState("Wie zuverlässig ist diese Verbindung und worauf sollte ich beim Umsteigen achten?");
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function analyze() {
    setState("loading");
    setAnswer("");
    try {
      const response = await fetch("/api/ai/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, journey: compactJourney(journey) }),
      });
      const body = await response.json() as { answer?: string; error?: string };
      if (!response.ok || !body.answer) throw new Error(body.error ?? "Analyse nicht verfügbar");
      setAnswer(body.answer);
      setState("idle");
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : "Analyse ist gerade nicht verfügbar.");
      setState("error");
    }
  }

  return (
    <section className="journey-ai">
      <div className="journey-ai-head"><div><span>ATLAS ANALYSE</span><b>Verbindung verstehen</b></div><em>KI nutzt nur die geladenen Fahrtdaten</em></div>
      <textarea value={question} maxLength={400} onChange={(event) => setQuestion(event.target.value)} aria-label="Frage zur Verbindung" />
      <div className="journey-ai-actions"><button type="button" onClick={() => void analyze()} disabled={state === "loading" || !question.trim()}>{state === "loading" ? "Analysiere …" : "Verbindung analysieren"}</button><small>Zeiten, Gleise und Störungen werden nicht erfunden.</small></div>
      {answer && <div className={"journey-ai-answer" + (state === "error" ? " error" : "")}>{answer}</div>}
    </section>
  );
}
