"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const STORAGE_KEY="bahnconnections-desktop-panel-width";
const DEFAULT_WIDTH=382;
const MIN_WIDTH=300;

function limits() {
  const max=Math.min(820,Math.max(MIN_WIDTH,window.innerWidth-450));
  return {min:MIN_WIDTH,max};
}
function clamp(value:number) {
  const {min,max}=limits();
  return Math.max(min,Math.min(max,Math.round(value)));
}

/** Desktop-only drag and keyboard accessible resizing of the right-side panel. */
export function DesktopPanelResizer() {
  const [width,setWidth]=useState(DEFAULT_WIDTH);
  const [ready,setReady]=useState(false);
  const handleRef=useRef<HTMLDivElement>(null);
  const dragRef=useRef<{pointerId:number,startX:number,startWidth:number}|null>(null);

  useEffect(()=>{
    const timer=window.setTimeout(()=>{
      let saved=DEFAULT_WIDTH;
      try {const candidate=Number(localStorage.getItem(STORAGE_KEY));if(Number.isFinite(candidate)&&candidate>=MIN_WIDTH)saved=candidate;}catch { /* Storage optional */ }
      const next=clamp(saved);
      setWidth(next);
      handleRef.current?.closest<HTMLElement>(".app-shell")?.style.setProperty("--workspace-right",next+"px");
      setReady(true);
    },0);
    const onResize=()=>{
      const shell=handleRef.current?.closest<HTMLElement>(".app-shell");
      const active=parseFloat(shell?.style.getPropertyValue("--workspace-right")??"")||DEFAULT_WIDTH;
      const next=clamp(active);
      shell?.style.setProperty("--workspace-right",next+"px");
      setWidth(next);
    };
    window.addEventListener("resize",onResize);
    return ()=>{window.clearTimeout(timer);window.removeEventListener("resize",onResize);};
  },[]);

  const apply=(next:number)=>{
    const value=clamp(next);
    handleRef.current?.closest<HTMLElement>(".app-shell")?.style.setProperty("--workspace-right",value+"px");
    setWidth(value);
  };
  const commit=(next:number)=>{
    apply(next);
    try{localStorage.setItem(STORAGE_KEY,String(clamp(next)));}catch{/* optional */}
    window.dispatchEvent(new Event("resize"));
  };

  const onPointerDown=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(event.button!==0||window.innerWidth<1024)return;
    const panel=handleRef.current?.closest<HTMLElement>(".app-shell");
    const current=parseFloat(panel?.style.getPropertyValue("--workspace-right")??"")||width;
    dragRef.current={pointerId:event.pointerId,startX:event.clientX,startWidth:current};
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const onPointerMove=(event:ReactPointerEvent<HTMLDivElement>)=>{
    const d=dragRef.current;
    if(!d||d.pointerId!==event.pointerId)return;
    apply(d.startWidth+d.startX-event.clientX);
  };
  const onPointerEnd=(event:ReactPointerEvent<HTMLDivElement>)=>{
    const d=dragRef.current;
    if(!d||d.pointerId!==event.pointerId)return;
    dragRef.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    const shell=handleRef.current?.closest<HTMLElement>(".app-shell");
    commit(parseFloat(shell?.style.getPropertyValue("--workspace-right")??"")||width);
  };
  const {min,max}=ready?limits():{min:MIN_WIDTH,max:820};
  return <div ref={handleRef} className="desktop-panel-resizer" role="separator" aria-label="Breite der rechten Seitenleiste einstellen" aria-orientation="vertical"
    aria-valuenow={width} aria-valuemin={min} aria-valuemax={max} aria-valuetext={width+" Pixel"} tabIndex={0}
    data-ready={ready} title="Ziehen: Seitenleiste breiter oder schmaler · Doppelklick: zurücksetzen"
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
    onDoubleClick={()=>commit(DEFAULT_WIDTH)}
    onKeyDown={e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();commit(width+(e.key==="ArrowLeft"?24:-24));}else if(e.key==="Home"){e.preventDefault();commit(MIN_WIDTH);}else if(e.key==="End"){e.preventDefault();commit(max);}}}>
    <span className="desktop-panel-resizer-grip" aria-hidden="true"><i/><i/><i/></span>
  </div>;
}
