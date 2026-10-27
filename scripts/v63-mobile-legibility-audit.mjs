// Contract checks complement real Chromium layout checks in station-sheet-qa and mobile-visual-qa.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const followCss = read("app/styles/v61-2-glass-clarity.css");
const stationCss = read("app/styles/v57-2-turnaround.css");
const stationQA = read("scripts/station-sheet-qa.mjs");
const mobileQA = read("scripts/mobile-visual-qa.mjs");

const followStatusRule = followCss.match(/\.app-shell \.v62-follow-heading-copy small\s*\{([^}]+)\}/)?.[1] ?? "";
assert.match(followStatusRule, /white-space\s*:\s*normal\s*;/, "Follow source disclosure must wrap rather than truncate");
assert.doesNotMatch(followStatusRule, /text-overflow\s*:\s*ellipsis/, "Follow source disclosure must not hide 'kein GPS'");
assert.match(followCss, /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.v62-follow-heading\s*\{[^}]*flex-wrap\s*:\s*wrap/, "Narrow follow header needs a second row for controls");

assert.match(stationCss, /@media\s*\(max-width:\s*480px\)\s*\{\s*\.app-shell \.incidents-tools\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0,1fr\)/, "Mobile disruption selects need a single column at 390px");
assert.match(stationQA, /Station disruption selects overlap/, "Chromium must measure station filter layout");
assert.match(mobileQA, /Follow source status clipped/, "Chromium must measure follow disclosure visibility");

console.log("V63 mobile information legibility: static regression contracts passed.");