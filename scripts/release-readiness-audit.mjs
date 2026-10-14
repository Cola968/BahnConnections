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
const packageJson = JSON.parse(read("package.json"));
const releasePage = read("app/changelog/page.tsx");
verify(!version || packageJson.version === `${version}.0`, "package.json version must match APP_VERSION (major.minor.patch).");
verify(!version || releasePage.includes(`{version:"V${version}",`), "App release history must include the currently deployed version.");
verify(!version || new RegExp(`\\{version:"V${version.replaceAll(".", "\\.")}",[^\\n]*current:true`).test(releasePage), "Only the current published version must be marked as current in changelog UI.");
verify((releasePage.match(/current:true/g)??[]).length === 1, "Release history must have exactly one current version.");
const manifest = read("app/manifest.ts");
const layout = read("app/layout.tsx");
verify(!layout.includes('new URL("https://bahnconnections-de.a-stad.chatgpt.site")'), "App metadata must not hard-code the deprecated Sites host for Play builds.");
verify(layout.includes("NEXT_PUBLIC_APP_ORIGIN"), "Standalone production metadata must support a configured HTTPS origin.");
verify(manifest.includes('start_url:"/"') && manifest.includes('scope:"/"'), "A Play wrapper must launch the exact installed app origin.");
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
