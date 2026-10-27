"use client";
import {useEffect} from "react";
/** Android standalone and browser chrome follow the actual app theme, never a hardcoded red strip. */
export function BrowserChrome(){
 useEffect(()=>{
  const root=document.documentElement;
  const sync=()=>{
   const dark=root.dataset.theme==="dark";
   const color=dark?"#101b24":"#eaf1f5";
   let tag=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
   if(!tag){tag=document.createElement("meta");tag.name="theme-color";document.head.appendChild(tag);}
   tag.content=color;
   root.style.backgroundColor=color;
   document.body.style.backgroundColor=color;
  };
  const observer=new MutationObserver(sync);
  observer.observe(root,{attributes:true,attributeFilter:["data-theme"]});
  sync();
  return ()=>{observer.disconnect();root.style.removeProperty("background-color");document.body.style.removeProperty("background-color");};
 },[]);
 return null;
}
