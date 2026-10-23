"use client";

import {useEffect} from "react";

/** Lightweight pointer-following specular highlights; no extra overlays or per-row listeners. */
const SURFACES=[
  ".app-shell .topbar",
  ".app-shell .desktop-navigation",
  ".app-shell .mobile-navigation",
  ".app-shell .mobile-search-dock .station-search",
  ".app-shell .map-menu-popover.detached",
  ".app-shell .view-menu-popover",
  ".app-shell .search-suggestions",
  ".app-shell .settings-dialog",
  ".app-shell .mobile-sheet-panel",
  ".app-shell .floating-panel",
  ".app-shell .station-card",
  ".app-shell .train-inspector",
  ".app-shell .planner-panel",
  ".app-shell .v62-follow-hud",
].join(",");

export function OpticalGlassLight() {
  useEffect(()=>{
    const fine=window.matchMedia("(hover: hover) and (pointer: fine)");
    const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
    const transparency=window.matchMedia("(prefers-reduced-transparency: reduce)");
    const colors=window.matchMedia("(forced-colors: active)");
    let current:HTMLElement|null=null;
    let frame=0;
    let pending:{element:HTMLElement;x:number;y:number}|null=null;

    const clear=()=>{
      if(frame){window.cancelAnimationFrame(frame);frame=0;}
      pending=null;
      if(current){
        current.style.removeProperty("--v62-glint-x");
        current.style.removeProperty("--v62-glint-y");
        current=null;
      }
    };

    const blocked=()=>!fine.matches||motion.matches||transparency.matches||colors.matches||
      document.documentElement.dataset.motion==="reduced"||
      document.documentElement.dataset.contrast==="high";

    const move=(event:PointerEvent)=>{
      if(event.pointerType==="touch"||blocked()){clear();return;}
      const target=event.target;
      const glass=target instanceof Element?target.closest<HTMLElement>(SURFACES):null;
      if(glass!==current){
        clear();
        current=glass;
      }
      if(!glass)return;
      const rect=glass.getBoundingClientRect();
      if(rect.width<=0||rect.height<=0)return;
      pending={
        element:glass,
        x:Math.max(0,Math.min(100,Math.round((event.clientX-rect.left)/rect.width*100))),
        y:Math.max(0,Math.min(100,Math.round((event.clientY-rect.top)/rect.height*100))),
      };
      if(frame)return;
      frame=window.requestAnimationFrame(()=>{
        frame=0;
        if(!pending||current!==pending.element)return;
        current.style.setProperty("--v62-glint-x",pending.x+"%");
        current.style.setProperty("--v62-glint-y",pending.y+"%");
        pending=null;
      });
    };
    document.addEventListener("pointermove",move,{passive:true});
    document.addEventListener("pointerout",leave,{passive:true});
    function leave(event:PointerEvent) {
      if(event.relatedTarget===null)clear();
    }
    window.addEventListener("blur",clear);
    const preferences=[fine,motion,transparency,colors];
    for(const preference of preferences)preference.addEventListener?.("change",clear);
    return ()=>{
      document.removeEventListener("pointermove",move);
      document.removeEventListener("pointerout",leave);
      window.removeEventListener("blur",clear);
      for(const preference of preferences)preference.removeEventListener?.("change",clear);
      clear();
    };
  },[]);
  return null;
}
