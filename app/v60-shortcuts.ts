export type V60Shortcut = "search" | "live" | "filters" | "map" | "planner" | "departures" | "help" | "escape";

export type ShortcutInput = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  targetTag?: string;
  isContentEditable?: boolean;
  withinEditable?: boolean;
};

/** Browser shortcuts and form editing always take precedence over app commands. */
export function resolveV60Shortcut(input: ShortcutInput): V60Shortcut | null {
  if (input.ctrlKey || input.metaKey || input.altKey || input.repeat) return null;
  if (input.isContentEditable || input.withinEditable) return null;
  if (["input", "textarea", "select"].includes((input.targetTag ?? "").toLowerCase())) return null;
  // Escape inside form controls belongs to the control (e.g. search suggestions).
  if (input.key === "Escape") return "escape";
  switch (input.key.toLowerCase()) {
    case "?": return "help";
    case "/": return "search";
    case "s": return "search";
    case "l": return "live";
    case "f": return "filters";
    case "m": return "map";
    case "p": return "planner";
    case "d": return "departures";
    default: return null;
  }
}

export const V60_SHORTCUTS = [
  { keys:"S oder /", label:"Bahnhof suchen" },
  { keys:"L", label:"Live-Züge umschalten" },
  { keys:"F", label:"Kartenfilter öffnen" },
  { keys:"M", label:"Zur Karte wechseln" },
  { keys:"P", label:"Verbindung planen" },
  { keys:"D", label:"Abfahrten anzeigen" },
  { keys:"?", label:"Tastaturhilfe anzeigen" },
  { keys:"Esc", label:"Dialog oder Detail schließen" },
] as const;
