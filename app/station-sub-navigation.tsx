"use client";

export type StationPanel = "live" | "destinations" | "stats";
const sections: { value: StationPanel; label: string }[] = [
  { value:"live", label:"Tafel" },
  { value:"destinations", label:"Linien" },
  { value:"stats", label:"Info" },
];

/** One native subnavigation, owned by the sheet header rather than its scroller. */
export function StationSubNavigation({ value, onChange }: {
  value: StationPanel;
  onChange: (value: StationPanel) => void;
}) {
  return <div className="station-section-tabs" role="tablist" aria-label="Bahnhofsinformationen">
    {sections.map((section,index) => <button key={section.value} type="button" role="tab"
      id={`station-tab-${section.value}`} aria-controls={`station-panel-${section.value}`}
      aria-selected={value === section.value} tabIndex={value === section.value ? 0 : -1}
      className={value === section.value ? "active" : ""}
      onClick={() => onChange(section.value)}
      onKeyDown={event => {
        const target = event.key === "ArrowRight" ? (index+1)%sections.length
          : event.key === "ArrowLeft" ? (index+sections.length-1)%sections.length
          : event.key === "Home" ? 0 : event.key === "End" ? sections.length-1 : null;
        if(target === null) return;
        event.preventDefault();
        onChange(sections[target].value);
        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[target]?.focus();
      }}>{section.label}</button>)}
  </div>;
}
