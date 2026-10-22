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
const packageVersion=version?.split('.').length===2?`${version}.0`:version;
verify(!version || packageJson.version === packageVersion, "package.json version must match APP_VERSION (major.minor.patch).");
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

const latestReleaseGuide=read(`docs/releases/V${version}-RELEASE-CHECKLIST.md`);
verify(latestReleaseGuide.startsWith(`# BahnConnections V${version}`), "Authoritative release checklist must match the current APP_VERSION.");
verify(latestReleaseGuide.includes("nicht") || latestReleaseGuide.includes("OFFEN"), "The release guide must disclose outstanding approvals.");
verify(latestReleaseGuide.includes("#67") && latestReleaseGuide.includes("#66"), "The release guide must retain data-rights and real-device gates.");
const cloudflareGuide=read("docs/deploy/CLOUDFLARE-WORKERS.md");
verify(cloudflareGuide.includes(`V${version}-RELEASE-CHECKLIST.md`), "Deployment instructions must link to the current release checklist.");
verify(cloudflareGuide.includes(`"version": "${version}"`), "Deployment smoke must check the actual release version.");
verify(!layout.includes("exakten Fahrtverläufen") && !layout.includes("vollständigen Halten"), "Metadata must not promise unverified exact/complete coverage.");
verify(!manifest.includes("vollständige Halte") && !manifest.includes("exakte Fahrtverläufe"), "PWA metadata must describe provider-reported data honestly.");
const subscriptions=read("app/subscription-plans.ts");
verify(subscriptions.includes('availability:"planned"') && subscriptions.includes('checkoutEnabled:false'), "Plus must remain clearly unavailable until authorized payment activation.");

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
