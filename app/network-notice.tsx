"use client";
import {useEffect,useState} from 'react';
export function NetworkNotice(){
  const [offline,setOffline]=useState(false);
  useEffect(()=>{const update=()=>setOffline(!navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
  if(!offline)return null;
  return <aside className="network-notice" role="status">Offline: Neue Verbindungen und Prognosen sind nicht abrufbar. Sichtbare Daten können veraltet sein.</aside>;
}
