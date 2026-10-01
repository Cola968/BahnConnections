"use client";

export type DesktopView = "connections" | "map" | "departures" | "network" | "stats";

export function DesktopNavigation({ value, onChange }: { value: DesktopView; onChange: (view: DesktopView) => void }) {
  return <nav className="desktop-navigation" aria-label="Hauptnavigation">
    {([["connections", "Verbindungen"], ["map", "Karte"], ["departures", "Abfahrten"], ["network", "Netzwerk"], ["stats", "Statistiken"]] as const).map(([view, label]) =>
      <button type="button" key={view} className={value === view ? "active" : ""} aria-current={value === view ? "page" : undefined} onClick={() => onChange(view)}>{label}</button>
    )}
    <span className="desktop-nav-divider" aria-hidden="true" />
    <a href="/passport">Passport</a><a href="/pulse">Pulse</a>
  </nav>;
}

export function DesktopWelcome() {
  return <aside className="desktop-welcome">
    <span className="workspace-version">VERSION 32 · ATLAS</span>
    <h2>Deine nächste Verbindung</h2>
    <p>Plane deine Fahrt mit aktuellen Zeiten, verständlichen Alternativen und einem Live-Modus für unterwegs.</p>
    <div className="workspace-modes">{["ICE / IC / EC", "RE / RB", "S-Bahn", "U-Bahn", "Straßenbahn"].map(mode => <span key={mode}>{mode}</span>)}</div>
    <hr/><h3>Echtzeit, wenn sie wirklich vorliegt</h3>
    <p>Verspätungen, Gleise und Störungen bleiben sichtbar getrennt von reinen Fahrplandaten.</p>
  </aside>;
}
