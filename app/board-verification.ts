export type TransitousBoardRow = {
  displayName?:string;
  routeShortName?:string;
  place?:{ arrival?:string; departure?:string; scheduledArrival?:string; scheduledDeparture?:string };
  realTime?:boolean;
};

/** Ignore malformed external records individually instead of dropping the full board. */
export function validTransitousBoardRows(input:unknown):TransitousBoardRow[] {
  if(!Array.isArray(input))return [];
  return input.filter((row):row is TransitousBoardRow => {
    if(!row||typeof row!=="object"||Array.isArray(row))return false;
    const place=(row as TransitousBoardRow).place;
    return !!place&&typeof place==="object"&&!Array.isArray(place);
  });
}

/** Read untrusted alert headers without assuming nested translation arrays exist. */
export function safeBoardAlertHeaders(value:unknown):string[] {
  if(!Array.isArray(value)) return [];
  const result:string[]=[];
  for(const raw of value) {
    if(!raw||typeof raw!=="object"||Array.isArray(raw))continue;
    const alert=raw as Record<string,unknown>;
    const headerText=alert.headerText;
    const translations=headerText&&typeof headerText==="object"&&!Array.isArray(headerText)
      ? (headerText as {translation?:unknown}).translation : undefined;
    const translated=Array.isArray(translations)
      ? translations.find(row=>row&&typeof row==="object"&&typeof row.text==="string"&&row.text.trim())?.text : undefined;
    const rawText=typeof alert.header==="string"&&alert.header.trim()?alert.header:translated;
    if(typeof rawText!=="string")continue;
    const text=rawText.trim().replace(/\s+/g," ").slice(0,240);
    if(text)result.push(text);
  }
  return result;
}

export type DbBoardRow = { tripId?:string; when?:string; plannedWhen?:string; direction?:string; cancelled?:boolean; line?:{ name?:string; product?:string } };

export type BoardCrossCheck = {
  source:"DB transport.rest";
  status:"matched" | "different" | "inconclusive" | "unavailable";
  checkedAt:string;
  stationId?:string;
  comparedRows:number;
  matchedRows:number;
  matchRate?:number;
  message:string;
};

export function normaliseBoardLine(value = "") {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleUpperCase("de").replace(/[^A-Z0-9]+/g, "");
}

function transitousEventTime(entry: TransitousBoardRow, arrival:boolean) {
  return arrival ? entry.place?.scheduledArrival ?? entry.place?.arrival : entry.place?.scheduledDeparture ?? entry.place?.departure;
}

export function compareBoardRows(stopTimes: TransitousBoardRow[], dbRows: DbBoardRow[], arrival:boolean, startTime:Date): Omit<BoardCrossCheck,"source" | "checkedAt" | "stationId"> {
  const end = startTime.getTime() + 500 * 60_000;
  const primary = stopTimes.filter((entry) => {
    const value = new Date(transitousEventTime(entry, arrival) ?? 0).getTime();
    return value >= startTime.getTime() - 5 * 60_000 && value <= end && Boolean(normaliseBoardLine(entry.displayName ?? entry.routeShortName));
  }).slice(0, 500);
  const secondary = dbRows.filter((entry) => {
    const value = new Date(entry.plannedWhen ?? entry.when ?? 0).getTime();
    return value >= startTime.getTime() - 5 * 60_000 && value <= end && Boolean(normaliseBoardLine(entry.line?.name));
  });
  const used = new Set<number>();
  let matchedRows = 0;
  for (const row of primary) {
    const line = normaliseBoardLine(row.displayName ?? row.routeShortName);
    const when = new Date(transitousEventTime(row, arrival) ?? 0).getTime();
    const index = secondary.findIndex((candidate, candidateIndex) => !used.has(candidateIndex) && normaliseBoardLine(candidate.line?.name) === line && Math.abs(new Date(candidate.plannedWhen ?? candidate.when ?? 0).getTime() - when) <= 3 * 60_000);
    if (index >= 0) { used.add(index); matchedRows += 1; }
  }
  // The denominator must include all primary rows. Otherwise one matching DB trip
  // could incorrectly be advertised as confirming fifty primary departures.
  const comparedRows = primary.length;
  const matchRate = comparedRows ? Math.round(matchedRows / comparedRows * 100) : 0;
  const sufficientSample = primary.length >= 5 && secondary.length >= 5;
  const status = !sufficientSample ? "inconclusive" : matchRate >= 80 ? "matched" : matchRate < 55 ? "different" : "inconclusive";
  const message = status === "matched"
    ? `Stichprobe: DB bestätigt ${matchedRows} von ${comparedRows} Transitous-Fahrten. Keine Vollständigkeitsgarantie.`
    : status === "different"
      ? `DB-Gegenprüfung weicht ab: ${matchedRows} von ${comparedRows} Transitous-Fahrten stimmen überein. Die Quellen werden nicht vermischt.`
      : `DB-Gegenprüfung nicht aussagekräftig: ${matchedRows} von ${comparedRows} Transitous-Fahrten bestätigt. Keine unabhängige Bestätigung.`;
  return { status, comparedRows, matchedRows, matchRate, message };
}
