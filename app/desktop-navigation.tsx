"use client";

import type { CSSProperties } from "react";
import { UiIcon, type IconName } from "./ui-icon";

export type DesktopView = "connections" | "map" | "departures" | "settings" | "stats";

const destinations: { view: DesktopView; label: string; icon: IconName }[] = [
  { view:"connections", label:"Verbindungen", icon:"route" },
  { view:"map", label:"Karte", icon:"map" },
  { view:"departures", label:"Abfahrten", icon:"clock" },
];

const mobileDestinations = [destinations[1], destinations[0], destinations[2]];

export function DesktopNavigation({ value, onChange }: { value: DesktopView; onChange: (view: DesktopView) => void }) {
  return <nav className="desktop-navigation" aria-label="Hauptnavigation">
    {destinations.map(({ view, label, icon }) =>
      <button type="button" key={view} className={value === view ? "active" : ""} aria-current={value === view ? "page" : undefined} onClick={() => onChange(view)}><UiIcon name={icon} />{label}</button>
    )}
    <details className="navigation-more"><summary><UiIcon name="more" />Mehr<UiIcon name="chevron" /></summary><div><button onClick={(event) => { onChange("stats"); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Netzreport</button><button onClick={(event) => { onChange("settings"); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Einstellungen & Profil</button></div></details>
  </nav>;
}

export function MobileNavigation({ value, onChange, onMore, moreOpen }: { value: DesktopView; onChange: (view: DesktopView) => void; onMore: () => void; moreOpen: boolean }) {
  const selectedIndex = moreOpen ? 3 : Math.max(0,mobileDestinations.findIndex(item => item.view === value));
  return <nav className="mobile-navigation" aria-label="Mobile Hauptnavigation" style={{ "--mobile-nav-index":selectedIndex, "--mobile-nav-offset":`${selectedIndex*100}%` } as CSSProperties}>
    {mobileDestinations.map(({ view, label, icon }) => {
      const active=!moreOpen && value===view;
      return <button key={view} type="button" className={active ? "active" : ""} aria-current={active ? "page" : undefined} aria-label={view === "connections" ? "Planen" : label} onClick={() => onChange(view)}>
        <span className="mobile-nav-icon"><UiIcon name={icon} /></span><span className="mobile-nav-label">{view === "connections" ? "Planen" : label}</span>
      </button>;
    })}
    <button type="button" onClick={onMore} className={moreOpen ? "active" : ""} aria-expanded={moreOpen} aria-controls="more-menu">
      <span className="mobile-nav-icon"><UiIcon name="more" /></span><span className="mobile-nav-label">Mehr</span>
    </button>
    <i className="mobile-navigation-indicator" aria-hidden="true" />
  </nav>;
}
