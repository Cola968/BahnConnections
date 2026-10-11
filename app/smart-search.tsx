"use client";

import { FormEvent, KeyboardEvent, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Station } from "./network-data";
import { createPortal } from "react-dom";
import { UiIcon } from "./ui-icon";
import { compactStationLabel } from "./transit-style";

function normalise(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de").replace(/[^a-z0-9]+/g, " ").trim();
}

function distance(a: string, b: string, maximum:number) {
  if(Math.abs(a.length-b.length)>maximum)return maximum+1;
  const rows = new Array(b.length + 1).fill(0).map((_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let minimum=i;
    let previous = rows[0];
    rows[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = rows[j];
      rows[j] = Math.min(rows[j] + 1, rows[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      minimum=Math.min(minimum,rows[j]);
      previous = current;
    }
    if(minimum>maximum)return maximum+1;
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
  const maximum=Math.max(1,Math.floor(query.length/4));
  const typo = distance(first, query, maximum);
  return typo <= maximum ? 4 + typo / 10 : 99;
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
  const [liveQuery, setLiveQuery] = useState("");
  const [liveErrorQuery, setLiveErrorQuery] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved:unknown = JSON.parse(localStorage.getItem("bahnconnections-recent-stations") ?? "[]");
      return Array.isArray(saved) ? saved.filter((item):item is string => typeof item === "string").slice(0,6) : [];
    } catch { return []; }
  });

  const searchValue=useDeferredValue(value);
  const localSuggestions = useMemo(() => {
    // A map selection updates the label; a closed search must not rank every station.
    if(!open)return [];
    const query = normalise(searchValue);
    if (!query) {
      const preferred = [...favoriteIds, ...recentIds, ...stations.filter((station) => station.hub).map((station) => station.id)];
      return [...new Set(preferred)].map((id) => stations.find((station) => station.id === id)).filter((station): station is Station => Boolean(station)).slice(0, 9);
    }
    // Keep only the best nine candidates, rather than sorting the entire national
    // station catalogue on every keystroke.
    const best: { station:Station; score:number }[] = [];
    const compare = (a:typeof best[number], b:typeof best[number]) =>
      a.score - b.score || Number(Boolean(b.station.hub)) - Number(Boolean(a.station.hub)) || a.station.name.localeCompare(b.station.name, "de");
    for (const station of stations) {
      const item = { station, score:score(station, query) };
      if (item.score >= 99) continue;
      const index = best.findIndex((candidate) => compare(item, candidate) < 0);
      if (index < 0) {
        if (best.length < 9) best.push(item);
      } else {
        best.splice(index, 0, item);
        if (best.length > 9) best.pop();
      }
    }
    return best.map((item) => item.station);
  }, [favoriteIds, recentIds, stations, searchValue, open]);

  useEffect(() => {
    if (!open || !liveTransit || value.trim().length < 2) {
      const timer = window.setTimeout(() => { setLiveSuggestions([]); setLiveSearching(false); }, 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    const requestedQuery = value.trim();
    const timer = window.setTimeout(async () => {
      if (controller.signal.aborted) return;
      setLiveSearching(true);
      setLiveErrorQuery(null);
      try {
        const url = new URL("/api/stations/search", window.location.origin);
        url.searchParams.set("q", requestedQuery);
        const response = await fetch(url, { signal:controller.signal });
        if (!response.ok) throw new Error(`Haltestellensuche ${response.status}`);
        const payload = await response.json() as { stations?:Station[] };
        if (!controller.signal.aborted) {
          setLiveSuggestions(payload.stations ?? []);
          setLiveQuery(requestedQuery);
        }
      } catch (error) {
        if (!controller.signal.aborted && (error as Error).name !== "AbortError") {
          setLiveSuggestions([]);
          setLiveQuery(requestedQuery);
          setLiveErrorQuery(requestedQuery);
        }
      } finally { if (!controller.signal.aborted) setLiveSearching(false); }
    }, 220);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [liveTransit, value, open]);

  const suggestions = useMemo(() => {
    const unique = new Map<string, Station>();
    // Old remote results must never be selectable for a newly entered query.
    const currentLive = liveQuery === value.trim() ? liveSuggestions : [];
    for (const station of [...localSuggestions, ...currentLive]) {
      const key = `${normalise(station.name)}|${station.lat.toFixed(3)}|${station.lon.toFixed(3)}`;
      if (!unique.has(key)) unique.set(key, station);
    }
    return [...unique.values()].slice(0, 10);
  }, [liveSuggestions, liveQuery, localSuggestions, value]);

  const inputRef=useRef<HTMLInputElement>(null);
  const dialogRef=useRef<HTMLDialogElement>(null);
  const dialogInputRef=useRef<HTMLInputElement>(null);
  const [mobilePickerOpen,setMobilePickerOpen]=useState(false);
  useEffect(()=>{
    if (!mobilePickerOpen) return;
    const dialog=dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const frame=requestAnimationFrame(()=>dialogInputRef.current?.focus());
    return ()=>{cancelAnimationFrame(frame);if(dialog.open)dialog.close();};
  },[mobilePickerOpen]);
  function closeMobilePicker(){
    setMobilePickerOpen(false);setOpen(false);setActiveIndex(0);inputRef.current?.blur();
  }


  function select(station: Station) {
    const nextRecent = [station.id, ...recentIds.filter((id) => id !== station.id)].slice(0, 6);
    setRecentIds(nextRecent);
    try { localStorage.setItem("bahnconnections-recent-stations", JSON.stringify(nextRecent)); } catch { /* Search remains usable without storage. */ }
    onSelect(station);
    setOpen(false);
    setActiveIndex(0);
    setMobilePickerOpen(false);
    inputRef.current?.blur();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    const match=suggestions[activeIndex]??suggestions[0]??stations.find(station=>station.name===value);
    if(match)select(match);else setOpen(true);
  }

  function keydown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.max(0, Math.min(suggestions.length - 1, index + 1))); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
    if (event.key === "Escape") { event.stopPropagation(); closeMobilePicker(); }
  }

  const suggestionRows = <>
    <div className="suggestion-heading">
      <span>{value ? "Vorschläge" : favoriteIds.length ? "Favoriten & zuletzt" : "Beliebte Stationen"}</span>
      {liveSearching && <small>Suche läuft …</small>}
    </div>
    {suggestions.map((station,index)=>(
      <button key={station.id} id={suggestionsId+"-"+index} type="button" role="option"
        aria-selected={index===activeIndex} className={index===activeIndex?"active":""}
        onMouseDown={event=>event.preventDefault()} onMouseEnter={()=>setActiveIndex(index)}
        onClick={()=>select(station)}>
        <span className="station-symbol"><UiIcon name="train" /></span>
        <span><b title={station.name}>{compactStationLabel(station.name) ?? station.name}</b><small>{station.state ?? station.country}</small></span>
        {favoriteIds.includes(station.id)&&<em aria-label="Favorit"><UiIcon name="star" width="16" height="16" /></em>}
      </button>
    ))}
    {!suggestions.length && <p role="status">{liveTransit && liveErrorQuery === value.trim()
      ? "Online-Suche nicht erreichbar. Lokale Bahnhöfe bleiben durchsuchbar."
      : liveSearching || (liveTransit && value.trim().length>=2 && liveQuery!==value.trim())
        ? "Weitere Bahnhöfe werden gesucht …"
        : "Kein passender Bahnhof gefunden. Probiere einen Ortsnamen oder ein DB-Kürzel."}</p>}
  </>;

  return (<>
    <form className={"station-search"+(variant==="route"?" route-station-search":"")}
      data-search-open={open} onSubmit={submit}
      onBlur={event=>{if(!mobilePickerOpen&&!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}
      role="search">
      <UiIcon name="search" />
      <input ref={inputRef} role="combobox" aria-label={ariaLabel}
        aria-autocomplete="list" aria-expanded={open&&!mobilePickerOpen} aria-controls={suggestionsId}
        aria-activedescendant={open&&!mobilePickerOpen&&suggestions[activeIndex]?suggestionsId+"-"+activeIndex:undefined}
        autoComplete="off" autoCorrect="off" spellCheck={false}
        value={variant==="header"&&!open?compactStationLabel(value)??value:value}
        onFocus={event=>{
          const input=event.currentTarget;setOpen(true);
          if(variant==="route"&&window.matchMedia("(max-width:1023px)").matches)setMobilePickerOpen(true);
          if(variant==="header")requestAnimationFrame(()=>input.isConnected&&input.select());
        }}
        onChange={event=>{onChange(event.target.value);setOpen(true);setActiveIndex(0);}}
        onKeyDown={keydown} placeholder={placeholder??"Bahnhof suchen"} />
      {value&&<button className="search-clear" type="button"
        onClick={()=>{onChange("");setOpen(true);}}
        aria-label="Suche leeren"><UiIcon name="close" width="18" height="18" /></button>}
      {variant==="header"
        ? <button className="search-submit-icon" type="submit" aria-label="Ersten Treffer öffnen" title="Öffnen"><UiIcon name="arrow" /></button>
        : <button type="submit">{submitLabel}</button>}
      {open&&!mobilePickerOpen&&<div className="search-suggestions" id={suggestionsId} role="listbox">{suggestionRows}</div>}
    </form>
    {mobilePickerOpen&&typeof document!=="undefined"&&createPortal(
      <dialog ref={dialogRef} className="planner-station-picker" aria-label={ariaLabel}
        onCancel={event=>{event.preventDefault();closeMobilePicker();}}
        onKeyDown={event=>{if(event.key==="Escape")event.stopPropagation();}}>
        <div className="planner-station-picker-header">
          <strong>{ariaLabel}</strong>
          <button type="button" aria-label="Bahnhofssuche schließen" onClick={closeMobilePicker}><UiIcon name="close" width="20" height="20" /></button>
        </div>
        <form className="planner-station-picker-form" onSubmit={submit} role="search">
          <UiIcon name="search" />
          <input ref={dialogInputRef} role="combobox" aria-label={ariaLabel}
            aria-autocomplete="list" aria-expanded={true} aria-controls={suggestionsId}
            aria-activedescendant={suggestions[activeIndex]?suggestionsId+"-"+activeIndex:undefined}
            autoComplete="off" autoCorrect="off" spellCheck={false} value={value}
            onChange={event=>{onChange(event.target.value);setOpen(true);setActiveIndex(0);}}
            onKeyDown={keydown} placeholder={placeholder??"Bahnhof suchen"} />
          {value&&<button type="button" aria-label="Suche leeren"
            onClick={()=>{onChange("");setActiveIndex(0);dialogInputRef.current?.focus();}}>
            <UiIcon name="close" width="18" height="18" />
          </button>}
        </form>
        <div className="search-suggestions" id={suggestionsId} role="listbox">{suggestionRows}</div>
      </dialog>,document.body)}
  </>);
}
