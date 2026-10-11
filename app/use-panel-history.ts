"use client";
import { useEffect, useEffectEvent, useRef } from "react";

/** One owned history entry per panel; preserve the router's state across reload. */
export function usePanelHistory(open:boolean,onClose:()=>void,ready:boolean) {
  const owned=useRef<string|null>(null);
  const initialized=useRef(false);
  const close=useEffectEvent(onClose);
  useEffect(()=>{
    const pop=()=>{
      if(owned.current&&window.history.state?.bahnConnectionsPanel!==owned.current){owned.current=null;close();}
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
      try {window.history.pushState({...window.history.state,bahnConnectionsPanel:token},"",window.location.href);owned.current=token;}
      catch { /* Retain normal browser behaviour if history is unavailable. */ }
    }else if(!open&&owned.current){
      const token=owned.current;owned.current=null;
      if(window.history.state?.bahnConnectionsPanel===token)window.history.back();
    }
  },[open,ready]);
}
