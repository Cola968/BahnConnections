"use client";

export type WorkspacePreferences = {
  density: "compact" | "comfortable";
  panelWidth: "narrow" | "standard" | "wide";
  showPlanner: boolean;
  showContext: boolean;
  showMapTools: boolean;
  glass: boolean;
  accent: "blue" | "red" | "violet";
};

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  density: "comfortable",
  panelWidth: "standard",
  showPlanner: true,
  showContext: true,
  showMapTools: true,
  glass: true,
  accent: "blue",
};

export function WorkspaceCustomizer({
  open,
  value,
  onChange,
  onClose,
  onReset,
}: {
  open: boolean;
  value: WorkspacePreferences;
  onChange: (next: WorkspacePreferences) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  if (!open) return null;

  const set = <K extends keyof WorkspacePreferences>(key: K, next: WorkspacePreferences[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="workspace-customizer" role="dialog" aria-modal="false" aria-label="Oberfläche anpassen">
      <div className="workspace-customizer-head">
        <div>
          <span>ARBEITSBEREICH</span>
          <b>Fenster anpassen</b>
        </div>
        <button type="button" onClick={onClose} aria-label="Anpassen schließen">×</button>
      </div>

      <section>
        <label>Fenster</label>
        <div className="customizer-switches">
          <button type="button" className={value.showPlanner ? "active" : ""} onClick={() => set("showPlanner", !value.showPlanner)}>
            <i>{value.showPlanner ? "✓" : ""}</i><span><b>Reiseplaner</b><small>Linke Planungsspalte</small></span>
          </button>
          <button type="button" className={value.showContext ? "active" : ""} onClick={() => set("showContext", !value.showContext)}>
            <i>{value.showContext ? "✓" : ""}</i><span><b>Kontextfenster</b><small>Fahrt, Bahnhof & Details</small></span>
          </button>
          <button type="button" className={value.showMapTools ? "active" : ""} onClick={() => set("showMapTools", !value.showMapTools)}>
            <i>{value.showMapTools ? "✓" : ""}</i><span><b>Kartenwerkzeuge</b><small>Standort & Kartenhilfen</small></span>
          </button>
        </div>
      </section>

      <section>
        <label>Fensterbreite</label>
        <div className="customizer-segmented">
          {(["narrow","standard","wide"] as const).map((item) => (
            <button type="button" key={item} className={value.panelWidth === item ? "active" : ""} onClick={() => set("panelWidth", item)}>
              {item === "narrow" ? "Schmal" : item === "standard" ? "Standard" : "Breit"}
            </button>
          ))}
        </div>
      </section>

      <section>
        <label>Dichte</label>
        <div className="customizer-segmented">
          <button type="button" className={value.density === "compact" ? "active" : ""} onClick={() => set("density", "compact")}>Kompakt</button>
          <button type="button" className={value.density === "comfortable" ? "active" : ""} onClick={() => set("density", "comfortable")}>Komfortabel</button>
        </div>
      </section>

      <section>
        <label>Akzent</label>
        <div className="customizer-accents">
          {(["blue","red","violet"] as const).map((item) => (
            <button type="button" key={item} className={value.accent === item ? "active " + item : item} onClick={() => set("accent", item)} aria-label={"Akzent " + item}><i /></button>
          ))}
        </div>
      </section>

      <section className="customizer-row">
        <div><b>Glas-Effekt</b><small>Transparente, weich schwebende Fenster</small></div>
        <button type="button" className={"customizer-toggle" + (value.glass ? " active" : "")} onClick={() => set("glass", !value.glass)} aria-pressed={value.glass}><i /></button>
      </section>

      <div className="workspace-customizer-foot">
        <button type="button" onClick={onReset}>Auf Standard zurücksetzen</button>
        <small>Wird nur auf diesem Gerät gespeichert.</small>
      </div>
    </div>
  );
}
