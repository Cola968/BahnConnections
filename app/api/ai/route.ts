import { NextResponse } from "next/server";

type RequestBody = {
  question?: string;
  journey?: unknown;
};

function extractText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (typeof data.output_text === "string") return data.output_text.trim();
  return (data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) {
    return NextResponse.json({ error: "KI ist auf diesem Deployment noch nicht konfiguriert." }, { status: 503 });
  }

  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, 400) : "";
  if (!question || !body.journey) {
    return NextResponse.json({ error: "Frage oder Fahrtdaten fehlen." }, { status: 400 });
  }

  const journeyJson = JSON.stringify(body.journey).slice(0, 24000);
  const prompt = [
    "Du bist der sachliche Reiseanalyst von BahnConnections.",
    "Nutze ausschließlich die bereitgestellten strukturierten Fahrtdaten.",
    "Erfinde niemals Abfahrtszeiten, Ankunftszeiten, Gleise, Linien, Störungen oder Anschlüsse.",
    "Wenn Daten fehlen oder unsicher sind, sage das ausdrücklich.",
    "Antworte auf Deutsch, kompakt, maximal vier kurze Absätze.",
    "Bei Anschlussfragen: vergleiche reale bzw. gelieferte Ist-/Sollzeiten und nenne Unsicherheit.",
    "",
    "Frage: " + question,
    "",
    "Fahrtdaten: " + journeyJson
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: prompt,
        max_output_tokens: 500
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: "KI-Analyse ist gerade nicht verfügbar." }, { status: 502 });
    }

    const answer = extractText(payload);
    if (!answer) return NextResponse.json({ error: "Die KI hat keine verwertbare Antwort geliefert." }, { status: 502 });
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ error: "KI-Analyse ist gerade nicht erreichbar." }, { status: 502 });
  }
}
