"use client";
import { useEffect, useEffectEvent, useRef } from "react";

/** One owned history entry per panel; preserve the router's state across reload. */
export function usePanelHistory(open:boolean,onClose:()=>void,ready:boolean) {
  const owned=useRef<string|null>(null);
  const closing=useRef(false);
  const initialized=useRef(false);
  const close=useEffectEvent(onClose);
  useEffect(()=>{
    const pop=()=>{
      const dismissed=Boolean(owned.current&&window.history.state?.bahnConnectionsPanel!==owned.current);
      if(closing.current||dismissed){
        closing.current=false;
        // Also clean entries created before this version, whose underlying URL
        // could still contain the shared station or journey.
        const url=new URL(window.location.href);
        for(const key of ["station","from","to","at","arrive","changes","buffer","bike","stepfree","modes"])url.searchParams.delete(key);
        window.history.replaceState(window.history.state,"",url.href);
      }
      if(dismissed){owned.current=null;close();}
    };
    window.addEventListener("popstate",pop);
    return()=>window.removeEventListener("popstate",pop);
  },[]);
  useEffect(()=>{
    if(!ready)return;
    if(!initialized.current){
      initialized.current=true;
      const existing=window.history.state?.bahnConnectionsPanel;
      if(open&&typeof existing==="string"){owned.current=existing;return;}
      if(existing){
        const state={...window.history.state};delete state.bahnConnectionsPanel;
        window.history.replaceState(state,"",window.location.href);
      }
    }
    if(open&&!owned.current){
      const token=window.crypto.randomUUID();
      try {
        const panelUrl=window.location.href;
        const mapUrl=new URL(panelUrl);
        // Back/close must return to the map even when arriving through a shared link.
        for(const key of ["station","from","to","at","arrive","changes","buffer","bike","stepfree","modes"])mapUrl.searchParams.delete(key);
        if(mapUrl.href!==panelUrl)window.history.replaceState(window.history.state,"",mapUrl.href);
        window.history.pushState({...window.history.state,bahnConnectionsPanel:token},"",panelUrl);
        owned.current=token;
      }
      catch { /* Retain normal browser behaviour if history is unavailable. */ }
    }else if(!open&&owned.current){
      const token=owned.current;owned.current=null;
      if(window.history.state?.bahnConnectionsPanel===token){closing.current=true;window.history.back();}
    }
  },[open,ready]);
}
