export type TransitousBoardRow = {
  displayName?:string;
  routeShortName?:string;
  place?:{ arrival?:string; departure?:string; scheduledArrival?:string; scheduledDeparture?:string };
  realTime?:boolean;
};

export type DbBoardRow = { tripId?:string; when?:string; plannedWhen?:string; direction?:string; cancelled?:boolean; line?:{ name?:string; product?:string } };

export type BoardCrossCheck = {
  source:"DB transport.rest";
  status:"matched" | "different" | "unavailable";
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
  const comparedRows = Math.min(primary.length, secondary.length);
  const matchRate = comparedRows ? Math.round(matchedRows / comparedRows * 100) : primary.length === secondary.length ? 100 : 0;
  const status = comparedRows >= 5 && matchRate < 55 ? "different" : "matched";
  const message = status === "matched"
    ? `DB-Gegenprüfung bestätigt ${matchedRows} von ${comparedRows} vergleichbaren Fahrten.`
    : `DB-Gegenprüfung weicht ab: ${matchedRows} von ${comparedRows} vergleichbaren Fahrten stimmen überein. Die Quellen werden nicht vermischt.`;
  return { status, comparedRows, matchedRows, matchRate, message };
}
