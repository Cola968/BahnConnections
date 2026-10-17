import assert from "node:assert/strict";
import { existsSync,readFileSync } from "node:fs";
import { resolveV60Shortcut,V60_SHORTCUTS } from "../app/v60-shortcuts.ts";
import {nextRecentStations,RECENT_STATIONS_LIMIT} from "../app/v60-recent-stations.ts";

const root=(relative)=>new URL("../"+relative,import.meta.url);
const read=path=>readFileSync(root(path),"utf8");
const run=(input)=>resolveV60Shortcut({key:"l",...input});
for(const input of [{ctrlKey:true},{metaKey:true},{altKey:true},{repeat:true},{targetTag:"INPUT"},
 {targetTag:"textarea"},{targetTag:"select"},{isContentEditable:true},{withinEditable:true}]){
 assert.equal(run(input),null,"Never hijack inputs or browser shortcuts: "+JSON.stringify(input));
}
assert.equal(resolveV60Shortcut({key:"Escape",targetTag:"input"}),null,"Escape in search must not reset the map");
assert.equal(resolveV60Shortcut({key:"Escape",withinEditable:true}),null);
assert.equal(resolveV60Shortcut({key:"Escape"}),"escape");
assert.equal(resolveV60Shortcut({key:"?"}),"help");
assert.equal(resolveV60Shortcut({key:"/"}),"search");
assert.equal(resolveV60Shortcut({key:"s"}),"search");
assert.equal(resolveV60Shortcut({key:"m"}),"map");
assert.equal(resolveV60Shortcut({key:"p"}),"planner");
assert.equal(resolveV60Shortcut({key:"d"}),"departures");
assert.equal(resolveV60Shortcut({key:"f"}),"filters");
assert.equal(resolveV60Shortcut({key:"Ctrl+s",ctrlKey:true}),null);
assert.ok(V60_SHORTCUTS.length>=8);
assert.deepEqual(nextRecentStations(["berlin","potsdam"],"potsdam"),["potsdam","berlin"]);
assert.equal(nextRecentStations(["berlin"],"").length,1);
assert.equal(nextRecentStations(["berlin"],"x".repeat(181)).length,1);
assert.deepEqual(nextRecentStations([], "berlin"),["berlin"]);
assert.equal(nextRecentStations(Array.from({length:50},(_,i)=>"s"+i),"next").length,RECENT_STATIONS_LIMIT);


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
assert.match(page,/getClientRects\(\)\.length>0/);
assert.match(page,/nextRecentStations/);
assert.match(page,/Verlauf löschen/);
assert.match(motion,/v60-recent-stations/);
assert.match(motion,/@media\(prefers-reduced-motion:reduce\)/);
assert.match(motion,/html\[data-motion="reduced"\]/);
assert.match(motion,/v60-dialog-in/);
assert.match(motion,/station-section-tabs/);
assert.match(motion,/board-row\.open/);
assert.match(motion,/mobile-navigation/);
assert.doesNotMatch(motion,/infinite|blink/,"No infinite attention-grabbing animations");

const settings=read("app/settings-dialog.tsx");
const premium=read("app/styles/v60-premium.css");
const subscription=read("app/subscription-plans.ts");
assert.match(settings,/plan-list-v60-simple/,"Use the approved two-card Free and Plus layout");
assert.match(settings,/className="plan-card plus plus-simple"/,"Plus must remain a simple, readable comparison card");
assert.match(settings,/billing-price-options/,"Planned prices must remain visible");
assert.match(settings,/PLUS_PRICING/,"Read planned prices from the shared subscription contract");
assert.match(settings,/Noch nicht buchbar/,"Plus must clearly remain unavailable");
assert.match(settings,/<details className="plus-simple-more">/,"Plus details must remain expandable");
assert.match(settings,/<summary>Mehr zu Plus/,"Expandable Plus details must have a visible label");
assert.match(settings,/Wann Plus startet, steht noch nicht fest/,"Do not imply a launch date");
assert.match(settings,/Das ist für Plus geplant:/,"Subscription features must be described as planned");
for(const icon of ["devices","bell","euro"]) {
 assert.match(settings,new RegExp('name="'+icon+'"'),"Show a clear icon for "+icon);
}
assert.match(premium,/v60-plus-details-in/,"Expand details with restrained motion");
assert.doesNotMatch(settings,/<details className="plan-card plus"/,"Do not restore the oversized expandable Plus card");
assert.match(premium,/plan-list-v60-simple/,"Keep the restrained card styling");
assert.match(subscription,/checkoutEnabled:false/,"Plus details must not enable Stripe checkout");
for(const color of ["#951e4d","#b63172","#873e98","#3a4a9b","#1f697d","#246e52"])
  assert.ok(premium.includes(color),"Keep ruby-to-emerald design stop "+color);
assert.match(premium,/prefers-reduced-motion:reduce/);
assert.match(premium,/forced-colors:active/);

console.log("V60 readiness audit: shortcuts, 20 planned features, motion, Render cleanup passed.");
