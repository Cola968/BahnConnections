import assert from "node:assert/strict";
import { existsSync,readFileSync } from "node:fs";
import { resolveV60Shortcut,V60_SHORTCUTS } from "../app/v60-shortcuts.ts";

const root=(relative)=>new URL("../"+relative,import.meta.url);
const read=path=>readFileSync(root(path),"utf8");
const run=(input)=>resolveV60Shortcut({key:"l",...input});
for(const input of [{ctrlKey:true},{metaKey:true},{altKey:true},{repeat:true},{targetTag:"INPUT"},
 {targetTag:"textarea"},{targetTag:"select"},{isContentEditable:true},{withinEditable:true}]){
 assert.equal(run(input),null,"Never hijack inputs or browser shortcuts: "+JSON.stringify(input));
}
assert.equal(resolveV60Shortcut({key:"Escape",targetTag:"input"}),"escape");
assert.equal(resolveV60Shortcut({key:"?"}),"help");
assert.equal(resolveV60Shortcut({key:"/"}),"search");
assert.equal(resolveV60Shortcut({key:"s"}),"search");
assert.equal(resolveV60Shortcut({key:"m"}),"map");
assert.equal(resolveV60Shortcut({key:"p"}),"planner");
assert.equal(resolveV60Shortcut({key:"d"}),"departures");
assert.equal(resolveV60Shortcut({key:"f"}),"filters");
assert.equal(resolveV60Shortcut({key:"Ctrl+s",ctrlKey:true}),null);
assert.ok(V60_SHORTCUTS.length>=8);

const plan=read("docs/releases/V60-PRODUCT-AND-QA-PLAN.md");
const items=[...plan.matchAll(/^\|\s*(0[1-9]|1[0-9]|20)\s*\|/gm)].map(m=>Number(m[1]));
assert.deepEqual(items,Array.from({length:20},(_,i)=>i+1),"Every planned function needs a distinct numbered gate");

const packageJson=JSON.parse(read("package.json"));
assert.equal(packageJson.scripts["build:render"],undefined,"Render must never be resurrected");
for(const file of ["vite.render.config.ts","app/render/cloudflare-env-shim.ts",
  ".github/workflows/render-availability-monitor.yml",".github/workflows/render-node-smoke.yml"]){
 assert.equal(existsSync(root(file)),false,"Legacy Render deploy file present: "+file);
}
const motion=read("app/styles/v60-motion.css");
const html=read("app/layout.tsx");
const page=read("app/page.tsx");
assert.match(html,/\.\/styles\/v60-motion\.css/);
assert.match(page,/V60ShortcutHelp/);
assert.match(page,/resolveV60Shortcut/);
assert.match(page,/runV60Shortcut/);
assert.match(motion,/@media\(prefers-reduced-motion:reduce\)/);
assert.match(motion,/html\[data-motion="reduced"\]/);
assert.match(motion,/v60-dialog-in/);
assert.match(motion,/station-section-tabs/);
assert.match(motion,/board-row\.open/);
assert.match(motion,/mobile-navigation/);
assert.doesNotMatch(motion,/infinite|blink/,"No infinite attention-grabbing animations");

console.log("V60 readiness audit: shortcuts, 20 planned features, motion, Render cleanup passed.");
