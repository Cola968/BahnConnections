"use client";

export type DesktopView = "connections" | "map" | "departures" | "network" | "stats";

export function DesktopNavigation({ value, onChange }: { value: DesktopView; onChange: (view: DesktopView) => void }) {
  return <nav className="desktop-navigation" aria-label="Hauptnavigation">
    {([["connections", "Verbindungen"], ["map", "Karte"], ["departures", "Abfahrten"], ["network", "Netzwerk"], ["stats", "Statistiken"]] as const).map(([view, label]) =>
      <button type="button" key={view} className={value === view ? "active" : ""} aria-current={value === view ? "page" : undefined} onClick={() => onChange(view)}>{label}</button>
    )}
  </nav>;
}

export function DesktopWelcome() {
  return <aside className="desktop-welcome">
    <span className="workspace-version">VERSION 30 · ASTERIA</span>
    <h2>Deine nächste Verbindung</h2>
    <p>Wähle Start, Ziel und Reisezeit. Hier erscheinen die verfügbaren Fahrten mit Umstiegen, Halten und Echtzeitstatus.</p>
    <div className="workspace-modes">{["ICE / IC / EC", "RE / RB", "S-Bahn", "U-Bahn", "Straßenbahn"].map(mode => <span key={mode}>{mode}</span>)}</div>
    <hr/><h3>Aktuelle Daten statt Schätzungen</h3>
    <p>Verspätungen und Meldungen werden angezeigt, sobald sie von der Fahrplanquelle vorliegen.</p>
  </aside>;
}
