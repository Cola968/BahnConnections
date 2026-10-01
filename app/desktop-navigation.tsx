"use client";

import { UiIcon, type IconName } from "./ui-icon";

export type DesktopView = "connections" | "map" | "departures" | "network" | "stats";

const destinations: { view: DesktopView; label: string; icon: IconName }[] = [
  { view:"connections", label:"Verbindungen", icon:"route" },
  { view:"map", label:"Karte", icon:"map" },
  { view:"departures", label:"Abfahrten", icon:"clock" },
];

export function DesktopNavigation({ value, onChange }: { value: DesktopView; onChange: (view: DesktopView) => void }) {
  return <nav className="desktop-navigation" aria-label="Hauptnavigation">
    {destinations.map(({ view, label, icon }) =>
      <button type="button" key={view} className={value === view ? "active" : ""} aria-current={value === view ? "page" : undefined} onClick={() => onChange(view)}><UiIcon name={icon} />{label}</button>
    )}
    <details className="navigation-more"><summary><UiIcon name="network" />Netz<UiIcon name="chevron" /></summary><div><button onClick={(event) => { onChange("stats"); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Netzreport</button><button onClick={(event) => { onChange("network"); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Netzlabor · Simulation</button></div></details>
  </nav>;
}

export function MobileNavigation({ value, onChange, onMore, moreOpen }: { value: DesktopView; onChange: (view: DesktopView) => void; onMore: () => void; moreOpen: boolean }) {
  return <nav className="mobile-navigation" aria-label="Mobile Hauptnavigation">
    {[destinations[1], destinations[0], destinations[2]].map(({ view, label, icon }) => <button key={view} type="button" className={value === view ? "active" : ""} aria-current={value === view ? "page" : undefined} onClick={() => onChange(view)}><UiIcon name={icon} /><span>{label}</span></button>)}
    <button type="button" onClick={onMore} className={moreOpen ? "active" : ""} aria-expanded={moreOpen} aria-controls="map-view-menu"><UiIcon name="more" /><span>Mehr</span></button>
  </nav>;
}

export function DesktopWelcome() {
  return <aside className="desktop-welcome">
    <UiIcon name="route" width="32" height="32" />
    <h2>Wohin geht’s?</h2>
    <p>Suche eine Verbindung. Fahrten und Alternativen erscheinen hier – mit allen Halten und verfügbaren Live-Daten.</p>
    <hr/><h3>Oder einen Bahnhof entdecken</h3>
    <p>Wähle einen Punkt auf der Karte für Abfahrten, Linien und Fahrtverläufe.</p>
    <span className="workspace-version">V32 · Lyra</span>
  </aside>;
}
