/** Reveal an explicit user action inside the panel, without scrolling the page. */
export function revealPanelContent(section: HTMLElement | null, priority?: HTMLElement | null) {
  const pane = section?.closest<HTMLElement>(".panel-body");
  if (!section || !pane) return;
  const bounds = pane.getBoundingClientRect();
  const start = section.getBoundingClientRect();
  const target = priority?.getBoundingClientRect();
  // A short landscape viewport cannot show the whole section. Prefer its controls.
  const anchor = target && target.bottom - start.top > pane.clientHeight - 16 ? target : start;
  pane.scrollTo({ top: Math.max(0, pane.scrollTop + anchor.top - bounds.top - 8), behavior: "instant" });
}

/** Re-evaluate after the enclosing sheet finishes growing, not only on open.
 * Otherwise the short-pane priority scroll can leave the row's toggle above
 * the expanded viewport. Observing size (not scrolling) preserves user scroll.
 */
export function observePanelReveal(section:HTMLElement|null,priority?:HTMLElement|null){
  const pane=section?.closest<HTMLElement>('.panel-body');
  if(!section||!pane)return()=>{};
  let frame:number|null=null;
  const reveal=()=>{
    if(frame!==null)cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{frame=null;revealPanelContent(section,priority);});
  };
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(reveal);
  observer?.observe(pane);
  reveal();
  return()=>{observer?.disconnect();if(frame!==null)cancelAnimationFrame(frame);};
}
