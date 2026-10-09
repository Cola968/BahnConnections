"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { UiIcon } from "./ui-icon";

export type PanelControls = {
  style: CSSProperties;
  smaller: () => void;
  larger: () => void;
  reset: () => void;
  scale: number;
};

export type MobileSheetState = "expanded" | "collapsed" | "closed" | "half";

export const MOBILE_SHEET_HEIGHT_EVENT = "bahnconnections:mobile-sheet-height";

export function usePanelControls(id: string): PanelControls {
  const storageKey = `bahnconnections-panel-${id}`;
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as { scale?: number } | null;
        if (saved?.scale && Number.isFinite(saved.scale)) setScale(Math.max(.85, Math.min(1.25, saved.scale)));
      } catch { /* Panel preferences are optional. */ }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ scale })); } catch { /* Private browsing can deny preference storage. */ }
  }, [ready, scale, storageKey]);

  return {
    style:{ "--panel-scale":scale } as CSSProperties,
    smaller:() => setScale((value) => Math.max(.85, Math.round((value - .1) * 100) / 100)),
    larger:() => setScale((value) => Math.min(1.25, Math.round((value + .1) * 100) / 100)),
    reset:() => setScale(1),
    scale,
  };
}

export function PanelTools({ controls, label, onClose, mobileState, onMobileStateChange, mobileTitle, mobileSummary, subNavigation, fullTitle }: {
  controls: PanelControls;
  label: string;
  onClose?: () => void;
  mobileState?: MobileSheetState;
  onMobileStateChange?: (state: MobileSheetState) => void;
  mobileTitle?: string;
  mobileSummary?: string;
  subNavigation?: ReactNode;
  fullTitle?: string;
}) {
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startHeight: number;
    lastHeight: number;
    minHeight: number;
    maxHeight: number;
    dragged: boolean;
    expandedDuringDrag: boolean;
    panel: HTMLElement;
    shell: HTMLElement | null;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const dragFrame = useRef<number | null>(null);
  useEffect(() => () => { if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current); }, []);

  function selectSize(state: MobileSheetState) {
    const panel = toolsRef.current?.closest<HTMLElement>(".mobile-sheet-panel");
    panel?.style.removeProperty("--mobile-sheet-height");
    window.dispatchEvent(new CustomEvent(MOBILE_SHEET_HEIGHT_EVENT, { detail:{ height:null } }));
    onMobileStateChange?.(state);
  }
  const toolsRef = useRef<HTMLDivElement>(null);

  function announceSheetHeight(height: number) {
    window.dispatchEvent(new CustomEvent(MOBILE_SHEET_HEIGHT_EVENT, { detail:{ height:Math.round(height) } }));
  }

  function startMobileDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!window.matchMedia('(max-width:1023px)').matches || !onMobileStateChange || !mobileState || mobileState === "closed" || event.button !== 0) return;
    const panel = event.currentTarget.closest<HTMLElement>(".mobile-sheet-panel");
    if (!panel) return;
    suppressClickRef.current = false;
    const shell = panel.closest<HTMLElement>(".app-shell");
    const headerHeight = shell?.querySelector<HTMLElement>(".topbar")?.getBoundingClientRect().height ?? 0;
    const navigationHeight = shell?.querySelector<HTMLElement>(".mobile-navigation")?.getBoundingClientRect().height ?? 0;
    const startHeight = panel.getBoundingClientRect().height;
    dragRef.current = {
      pointerId:event.pointerId,
      startY:event.clientY,
      startHeight,
      lastHeight:startHeight,
      minHeight:100,
      maxHeight:Math.max(100, (window.visualViewport?.height ?? window.innerHeight) - headerHeight - navigationHeight - 8),
      dragged:false,
      expandedDuringDrag:false,
      panel,
      shell,
    };
    panel.dataset.sheetDragging = "true";
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveMobileDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rawDelta = event.clientY - drag.startY;
    const nextHeight = Math.max(drag.minHeight, Math.min(drag.maxHeight, drag.startHeight - rawDelta));
    drag.lastHeight = nextHeight;
    if (Math.abs(rawDelta) > 4) {
      drag.dragged = true;
      suppressClickRef.current = true;
    }
    if (dragFrame.current === null) dragFrame.current = requestAnimationFrame(() => {
      dragFrame.current = null;
      drag.panel.style.setProperty("--mobile-sheet-height", `${drag.lastHeight}px`);
      drag.shell?.style.setProperty("--mobile-sheet-visible-height", `${drag.lastHeight}px`);
    });
    if (mobileState === "collapsed" && nextHeight > 116 && !drag.expandedDuringDrag && onMobileStateChange) {
      drag.expandedDuringDrag = true;
      onMobileStateChange("expanded");
    }
  }

  function finishMobileDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !onMobileStateChange || !mobileState) return;
    if (dragFrame.current !== null) { cancelAnimationFrame(dragFrame.current); dragFrame.current = null; }
    const nextState: MobileSheetState = drag.lastHeight <= 100 ? "collapsed" : drag.lastHeight >= drag.maxHeight - 10 ? "expanded" : "half";
    if (drag.dragged) event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.dragged) {
      announceSheetHeight(drag.lastHeight);
      onMobileStateChange(nextState);
    }
    window.requestAnimationFrame(() => {
      drag.panel.removeAttribute("data-sheet-dragging");
      drag.panel.style.removeProperty("--mobile-sheet-height");
      drag.shell?.style.removeProperty("--mobile-sheet-visible-height");
    });
    dragRef.current = null;
  }

  return (
    <div className={`panel-tools${subNavigation ? " station-sheet-header" : ""}`} ref={toolsRef}
      onPointerDown={(event) => { if (!(event.target instanceof Element && event.target.closest('button'))) startMobileDrag(event); }}
      onPointerMove={moveMobileDrag} onPointerUp={finishMobileDrag} onPointerCancel={finishMobileDrag}>
      <span className="panel-drag-label" title="Feste Detailspalte"><i />{subNavigation ? mobileTitle ?? label : label}</span>
      {mobileState && onMobileStateChange && <button
        type="button"
        className="mobile-sheet-summary"
        onPointerDown={startMobileDrag}
        onPointerMove={moveMobileDrag}
        onPointerUp={finishMobileDrag}
        onPointerCancel={finishMobileDrag}
        onClick={() => {
          if (suppressClickRef.current) { suppressClickRef.current = false; return; }
          selectSize(mobileState === "collapsed" ? "half" : mobileState === "half" ? "expanded" : "collapsed");
        }}
        aria-expanded={mobileState !== "collapsed" && mobileState !== "closed"}
        aria-label={`${fullTitle ?? mobileTitle ?? label} ${mobileState === "expanded" ? "minimieren" : "vergrößern"}`}
        title="Stufenlos hoch- oder runterschieben"
      ><i aria-hidden="true" /><span><b title={fullTitle}>{mobileTitle ?? label}</b>{mobileSummary && <small>{mobileSummary}</small>}</span><em aria-hidden="true">{mobileState === "expanded" ? "⌄" : "⌃"}</em></button>}
      <div className="desktop-panel-actions">
        <button onClick={controls.smaller} disabled={controls.scale <= .85} aria-label={`${label}: Schrift kleiner`}>A−</button>
        <button onClick={controls.larger} disabled={controls.scale >= 1.25} aria-label={`${label}: Schrift größer`}>A+</button>
        <button onClick={controls.reset} aria-label={`${label}: Schriftgröße zurücksetzen`} title="Schriftgröße zurücksetzen">↺</button>
        {onClose && <button type="button" onClick={(event) => { event.stopPropagation(); onClose(); }} aria-label={`${label} schließen`}><UiIcon name="close" /></button>}
      </div>
      {mobileState && onMobileStateChange && <div className="mobile-sheet-actions">
        <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); selectSize(mobileState === "collapsed" ? "half" : "collapsed"); }} aria-label={`${label} ${mobileState === "collapsed" ? "vergrößern" : "minimieren"}`}><UiIcon name="chevron" style={mobileState === "collapsed" ? { transform:"rotate(180deg)" } : undefined} /></button>
        <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (onClose) onClose(); else onMobileStateChange("closed"); }} aria-label={`${label} schließen`}><UiIcon name="close" /></button>
      </div>}
      {subNavigation}
    </div>
  );
}
