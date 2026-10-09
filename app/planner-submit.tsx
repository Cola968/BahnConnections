"use client";

import { UiIcon } from "./ui-icon";

export function PlannerSubmit({ loading, canSearch, hint, onSearch, onCancel }: {
  loading: boolean;
  canSearch: boolean;
  hint: string;
  onSearch: () => void;
  onCancel: () => void;
}) {
  return <div className="planner-submit" aria-busy={loading}>
    {!canSearch && !loading && <p id="planner-search-hint" className="planner-search-hint">{hint}</p>}
    <button type="button" className="plan-button" onClick={onSearch} disabled={loading || !canSearch}
      aria-describedby={!canSearch && !loading ? "planner-search-hint" : undefined}>
      {loading ? "Verbindungen werden gesucht …" : "Verbindungen anzeigen"}
      <UiIcon name={loading ? "clock" : "arrow"} />
    </button>
    {loading && <button type="button" className="planner-cancel" onClick={onCancel}>Suche abbrechen</button>}
  </div>;
}
