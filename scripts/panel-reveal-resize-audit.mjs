import assert from 'node:assert/strict';
const api=await import('../app/panel-content-visibility.ts');
const saved={ResizeObserver:globalThis.ResizeObserver,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
let resized=()=>{};const frames=new Map();let id=0;
globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};
globalThis.cancelAnimationFrame=key=>frames.delete(key);
globalThis.ResizeObserver=class {constructor(fn){resized=fn;}observe(){}disconnect(){resized=()=>{};}};
const flush=()=>{for(const [key,fn] of [...frames]){frames.delete(key);fn();}};
const pane={clientHeight:180,scrollTop:0,getBoundingClientRect(){return {top:167,bottom:167+this.clientHeight};},scrollTo({top}){this.scrollTop=top;}};
const section={closest:()=>pane,getBoundingClientRect:()=>({top:238-pane.scrollTop,bottom:700-pane.scrollTop})};
const priority={getBoundingClientRect:()=>({top:500-pane.scrollTop,bottom:530-pane.scrollTop})};
try{
 const observe=api.observePanelReveal??((section,priority)=>{api.revealPanelContent(section,priority);return()=>{};});
 const cleanup=observe(section,priority);flush();
 assert.ok(pane.scrollTop>200,'Short pane must reveal the detail controls');
 pane.clientHeight=592;resized();flush();
 assert.ok(section.getBoundingClientRect().top>=pane.getBoundingClientRect().top,'Expanding the pane must bring its row/close control back into view');
 cleanup();assert.equal(frames.size,0,'Unmount must cancel scheduled reveal work');
}finally{for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
console.log('Panel reveal: short-pane priority, expanded row visibility and observer cleanup passed.');
