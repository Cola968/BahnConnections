import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const failures = [];
const verify = (condition, explanation) => { if (!condition) failures.push(explanation); };

const source = read("app/app-version.ts");
const match = source.match(/export const APP_VERSION\s*=\s*["'](\d+\.\d+(?:\.\d+)?)["']/);
verify(Boolean(match), "APP_VERSION is missing or not a numeric version.");
const version = match?.[1];

let published;
try {
  published = JSON.parse(read("public/version.json"));
} catch (error) {
  failures.push(`public/version.json is not valid JSON: ${error.message}`);
}

const worker = read("public/sw.js");
const changelog = read("CHANGELOG.md");
const manifest = read("app/manifest.ts");
const transitous = read("app/transitous.ts");
verify(transitous.includes('import { APP_VERSION } from "./app-version.ts"'), "Transitous User-Agent must use the current app version.");
verify(transitous.includes("https://github.com/Cola968/BahnConnections"), "Transitous User-Agent needs a public contact URL.");
verify(!transitous.includes('"BahnConnections/16"'), "Outdated User-Agent may not be shipped.");


if (version) {
  verify(published?.version === version, `public/version.json version must equal ${version}.`);
  verify(published?.label === `V${version}`, `public/version.json label must equal V${version}.`);
  verify(published?.installPath === `/install?update=V${version}`, "Install/update URL is not aligned with the app version.");
  const expectedCache = `bahnconnections-static-v${version.replaceAll(".", "-")}`;
  verify(worker.includes(`const CACHE_NAME = "${expectedCache}"`), `Service worker cache must use ${expectedCache}.`);
  verify(changelog.trimStart().startsWith(`# V${version}`), `CHANGELOG.md must begin with V${version}.`);
}

verify(manifest.includes('display:"standalone"'), "Installable PWA display mode is missing.");
verify(manifest.includes("/app-icon-192.png") && manifest.includes("/app-icon-512.png"), "PWA icon entries are missing.");
verify(worker.includes('event.data?.type === "SKIP_WAITING"'), "PWA update handler is missing.");

if (failures.length) {
  for (const message of failures) console.error(`RELEASE CHECK FAILED: ${message}`);
  process.exitCode = 1;
} else {
  assert.ok(version);
  console.log(`Release metadata OK: V${version}, update URL, PWA manifest, service worker cache and changelog are synchronized.`);
}
