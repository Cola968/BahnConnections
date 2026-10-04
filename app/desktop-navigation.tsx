"use client";

import { UiIcon, type IconName } from "./ui-icon";

export type DesktopView = "connections" | "map" | "departures" | "settings" | "stats";

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
    <details className="navigation-more"><summary><UiIcon name="more" />Mehr<UiIcon name="chevron" /></summary><div><button onClick={(event) => { onChange("stats"); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Netzreport</button><button onClick={(event) => { onChange("settings"); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Einstellungen & Profil</button></div></details>
  </nav>;
}

export function MobileNavigation({ value, onChange, onMore, moreOpen }: { value: DesktopView; onChange: (view: DesktopView) => void; onMore: () => void; moreOpen: boolean }) {
  return <nav style={{"--active-tab":moreOpen ? 3 : value === "map" ? 0 : value === "connections" ? 1 : 2} as import("react").CSSProperties} className="mobile-navigation" aria-label="Mobile Hauptnavigation">
    {[destinations[1], destinations[0], destinations[2]].map(({ view, label, icon }) => <button key={view} type="button" className={!moreOpen && value === view ? "active" : ""} aria-current={!moreOpen && value === view ? "page" : undefined} aria-label={view === "connections" ? "Planen" : label} onClick={() => onChange(view)}><UiIcon name={icon} /><span>{view === "connections" ? "Planen" : label}</span></button>)}
    <button type="button" onClick={onMore} className={moreOpen ? "active" : ""} aria-expanded={moreOpen} aria-controls="more-menu"><UiIcon name="more" /><span>Mehr</span></button>
  </nav>;
}
