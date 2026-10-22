"use client";

import { useEffect, useRef } from "react";
import { V60_SHORTCUTS } from "./v60-shortcuts";

export function V60ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const animationFrame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const interactive = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
      )).filter(element => element.getClientRects().length > 0);
      if (!interactive.length) { event.preventDefault(); return; }
      const first = interactive[0], last = interactive.at(-1);
      if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault(); (event.shiftKey ? last : first)?.focus(); return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(animationFrame);
      document.removeEventListener("keydown", onKeyDown, true);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="v60-shortcut-backdrop" onPointerDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div ref={dialogRef} className="v60-shortcut-dialog" role="dialog" aria-modal="true"
        aria-labelledby="v60-shortcuts-heading" aria-describedby="v60-shortcuts-description">
        <header>
          <div><small>BahnConnections · Schnellaktionen</small><h2 id="v60-shortcuts-heading">Tastenkürzel</h2></div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Tastaturhilfe schließen">✕</button>
        </header>
        <p id="v60-shortcuts-description">Schneller zwischen Zugkarte, Suche und Fahrplan wechseln. In Eingabefeldern und bei Browser-Tastenkombinationen bleiben die Befehle inaktiv.</p>
        <dl>{V60_SHORTCUTS.map(item => <div key={item.keys}><dt>{item.label}</dt><dd><kbd>{item.keys}</kbd></dd></div>)}</dl>
        <p className="v60-shortcut-hint">Animationen lassen sich in Einstellungen → Darstellung reduzieren. Das gilt auch für Karten- und Dialogeffekte.</p>
      </div>
    </div>
  );
}
