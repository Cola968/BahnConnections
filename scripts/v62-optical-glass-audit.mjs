import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const layout=read("app/layout.tsx");
const css=read("app/styles/v62-optical-glass.css");
const pointer=read("app/optical-glass-light.tsx");
const workflow=read(".github/workflows/quality.yml");
assert.match(layout,/import "\.\/styles\/v62-optical-glass\.css"/);
assert.ok(layout.lastIndexOf("v62-optical-glass.css")>layout.lastIndexOf("v62-station-operations.css"),
  "New optical CSS must override older glass hotfixes");
assert.match(layout,/<OpticalGlassLight\s*\/>/);
for(const selector of [".mobile-navigation",".mobile-sheet-panel",".desktop-navigation",
  ".topbar",".station-card",".train-inspector",".planner-panel",".settings-dialog",".v62-follow-hud"]){
  assert.ok(css.includes(selector),"Missing optical material coverage: "+selector);
}
for(const optic of [/--v62-glint-x/,/--v62-glint-y/,/radial-gradient/,/contrast\(1\.0/,/inset 0 1\.5px/,/backdrop-filter:blur/]){
  assert.match(css,optic,"Missing specular light/depth/optical material");
}
for(const safe of [/prefers-reduced-transparency:reduce/,/forced-colors:active/,/data-contrast="high"/,
  /prefers-reduced-motion:reduce/,/data-motion="reduced"/,/.board-list .board-row/,/.v62-call-row/]){
  assert.match(css,safe,"Missing fallback or legibility rule");
}
for(const guard of [/pointerType==="touch"/,/requestAnimationFrame/,/cancelAnimationFrame/,
  /prefers-reduced-motion/,/prefers-reduced-transparency/,/forced-colors/,/dataset.contrast/,
  /addEventListener\("pointermove"/,/removeEventListener\("pointermove"/,/"blur",clear/]){
  assert.match(pointer,guard,"Missing pointer performance or preference guard");
}
assert.match(workflow,/node scripts\/v62-optical-glass-audit\.mjs/);
console.log("V62 optical glass material, pointer guard and contrast coverage passed.");
