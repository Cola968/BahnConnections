"use client";

import { FormEvent, KeyboardEvent, useEffect, useId, useMemo, useState } from "react";
import type { Station } from "./network-data";
import { UiIcon } from "./ui-icon";
import { compactStationLabel } from "./transit-style";

function normalise(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de").replace(/[^a-z0-9]+/g, " ").trim();
}

function distance(a: string, b: string) {
  const rows = new Array(b.length + 1).fill(0).map((_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = rows[0];
    rows[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = rows[j];
      rows[j] = Math.min(rows[j] + 1, rows[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return rows[b.length];
}

function score(station: Station, query: string) {
  const name = normalise(station.name);
  const code = normalise([station.code, ...(station.mergedCodes ?? [])].filter(Boolean).join(" "));
  const words = `${name} ${code}`.split(" ").filter(Boolean);
  const tokens = query.split(" ").filter(Boolean);
  if (name === query || code === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.split(" ").some((word) => word.startsWith(query))) return 2;
  if (tokens.length > 1 && tokens.every((token) => words.some((word) => word.startsWith(token)) || name.includes(token) || code.includes(token))) return 2.5;
  if (name.includes(query) || code.includes(query)) return 3;
  const first = name.split(" ")[0] ?? name;
  const typo = distance(first.slice(0, Math.max(query.length, first.length)), query);
  return typo <= Math.max(1, Math.floor(query.length / 4)) ? 4 + typo / 10 : 99;
}

export function SmartSearch({ stations, value, onChange, onSelect, favoriteIds, variant = "header", placeholder, submitLabel = "Anzeigen", ariaLabel = "Bahnhof oder Betriebsstelle suchen", liveTransit = false }: {
  stations: Station[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (station: Station) => void;
  favoriteIds: string[];
  variant?: "header" | "route";
  placeholder?: string;
  submitLabel?: string;
  ariaLabel?: string;
  liveTransit?: boolean;
}) {
  const suggestionsId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [liveSuggestions, setLiveSuggestions] = useState<Station[]>([]);
  const [liveSearching, setLiveSearching] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("bahnconnections-recent-stations") ?? "[]"); } catch { return []; }
  });

  const localSuggestions = useMemo(() => {
    const query = normalise(value);
    if (!query) {
      const preferred = [...favoriteIds, ...recentIds, ...stations.filter((station) => station.hub).map((station) => station.id)];
      return [...new Set(preferred)].map((id) => stations.find((station) => station.id === id)).filter((station): station is Station => Boolean(station)).slice(0, 9);
    }
    return stations
      .map((station) => ({ station, score: score(station, query) }))
      .filter((item) => item.score < 99)
      .sort((a, b) => a.score - b.score || Number(Boolean(b.station.hub)) - Number(Boolean(a.station.hub)) || a.station.name.localeCompare(b.station.name, "de"))
      .slice(0, 9)
      .map((item) => item.station);
  }, [favoriteIds, recentIds, stations, value]);

  useEffect(() => {
    if (!liveTransit || value.trim().length < 2) {
      const timer = window.setTimeout(() => { setLiveSuggestions([]); setLiveSearching(false); }, 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLiveSearching(true);
      try {
        const url = new URL("/api/stations/search", window.location.origin);
        url.searchParams.set("q", value.trim());
        const response = await fetch(url, { signal:controller.signal });
        if (!response.ok) throw new Error(`Haltestellensuche ${response.status}`);
        const payload = await response.json() as { stations?:Station[] };
        setLiveSuggestions(payload.stations ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setLiveSuggestions([]);
      } finally { if (!controller.signal.aborted) setLiveSearching(false); }
    }, 220);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [liveTransit, value]);

  const suggestions = useMemo(() => {
    const unique = new Map<string, Station>();
    for (const station of [...localSuggestions, ...liveSuggestions]) {
      const key = `${normalise(station.name)}|${station.lat.toFixed(3)}|${station.lon.toFixed(3)}`;
      if (!unique.has(key)) unique.set(key, station);
    }
    return [...unique.values()].slice(0, 10);
  }, [liveSuggestions, localSuggestions]);

  function select(station: Station) {
    const nextRecent = [station.id, ...recentIds.filter((id) => id !== station.id)].slice(0, 6);
    setRecentIds(nextRecent);
    try { localStorage.setItem("bahnconnections-recent-stations", JSON.stringify(nextRecent)); } catch { /* Search remains usable without storage. */ }
    onSelect(station);
    setOpen(false);
    setActiveIndex(0);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (suggestions[activeIndex] ?? suggestions[0]) select(suggestions[activeIndex] ?? suggestions[0]);
  }

  function keydown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.max(0, Math.min(suggestions.length - 1, index + 1))); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
    if (event.key === "Escape") { event.stopPropagation(); setOpen(false); }
  }

  return (
    <form className={`station-search${variant === "route" ? " route-station-search" : ""}`} onSubmit={submit} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} role="search">
      <UiIcon name="search" />
      <input
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={suggestionsId}
        aria-activedescendant={open && suggestions[activeIndex] ? `${suggestionsId}-${activeIndex}` : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => { onChange(event.target.value); setOpen(true); setActiveIndex(0); }}
        onKeyDown={keydown}
        placeholder={placeholder ?? "Bahnhof suchen"}
      />
      {value && <button className="search-clear" type="button" onClick={() => { onChange(""); setOpen(true); }} aria-label="Suche leeren"><UiIcon name="close" width="18" height="18" /></button>}
      <button type="submit">{submitLabel}</button>
      {open && (
        <div className="search-suggestions" id={suggestionsId} role="listbox">
          <div className="suggestion-heading"><span>{value ? "Passende Stationen" : favoriteIds.length ? "Favoriten & zuletzt gesucht" : "Beliebte Stationen"}</span><small>{liveSearching ? "Haltestellen werden geprüft …" : liveTransit ? "Deutschlandweit · Transitous" : `${stations.length.toLocaleString("de-DE")} verfügbar`}</small></div>
          {suggestions.map((station, index) => (
            <button key={station.id} id={`${suggestionsId}-${index}`} type="button" role="option" aria-selected={index === activeIndex} className={index === activeIndex ? "active" : ""} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => select(station)}>
              <span className="station-symbol"><UiIcon name="train" /></span>
              <span><b>{compactStationLabel(station.name) ?? station.name}</b><small>{station.state ?? station.country}{station.id.startsWith("motis:") ? " · Fahrplan-Haltestelle" : station.source === "db" ? ` · ${station.kind ?? "Bahnhof"}` : " · Fernverkehr"}</small></span>
              {favoriteIds.includes(station.id) && <em aria-label="Favorit"><UiIcon name="star" width="16" height="16" /></em>}
            </button>
          ))}
          {!suggestions.length && <p>Kein exakter Treffer. Probiere einen Ortsnamen oder ein DB-Kürzel.</p>}
        </div>
      )}
    </form>
  );
}
