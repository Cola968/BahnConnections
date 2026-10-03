export function compactStationName(name: string) {
  const trimmed = name
    .replace(/\s+[–—]\s+(?:Zugang|Ausgang|Bahnhofsvorplatz|Vorplatz|Busbahnhof|Haltestelle|Eingang)\b.*$/i, "")
    .replace(/\s+-\s+(?:Zugang|Ausgang|Bahnhofsvorplatz|Vorplatz|Busbahnhof|Haltestelle|Eingang)\b.*$/i, "")
    .trim();
  return trimmed
    .replace(/\bHauptbahnhof\b/gi, "Hbf")
    .replace(/\s{2,}/g, " ");
}
