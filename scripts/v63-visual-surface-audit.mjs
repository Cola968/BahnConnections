import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const css=read("app/styles/v63-visual-reset.css");
const layout=read("app/layout.tsx");
const calls=read("app/station-calls-browser.tsx");
const comparison=read("app/station-comparison.tsx");
// Switching station/window must display loading for the new request without an effect-time synchronous state update.
assert.match(comparison,/const requestKey=/);
assert.match(comparison,/resolved\?\.key===requestKey/);
assert.doesNotMatch(comparison,/setLoaded\(empty\)/);

assert.match(layout,/import "\.\/styles\/v63-visual-reset\.css"/);
assert.ok(layout.lastIndexOf("v63-visual-reset.css")>layout.lastIndexOf("v62-optical-glass.css"));
for(const selector of [".station-card-head",".station-section-tabs",".board-mode-tabs",
  ".board-list .board-row",".v61-call-browser",".v62-call-row",".v63-call-indicator"]){
  assert.ok(css.includes(selector),"V63 visual surface missing: "+selector);
}
for(const safe of [/prefers-reduced-transparency:reduce/,/forced-colors:active/,/data-contrast="high"/,
  /prefers-reduced-motion:reduce/,/max-width:359px/]){
  assert.match(css,safe,"Missing visual fallback: "+safe);
}
assert.match(calls,/v63-call-indicator/);
assert.match(calls,/v63-call-reset/);
assert.match(calls,/setQuery\(""\)/);
assert.match(calls,/setDirection\("all"\)/);
assert.match(calls,/setQuick\("all"\)/);
console.log("V63 visual surfaces, data-quality status and reset affordance present (static checks).");
