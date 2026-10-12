import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const text=(file)=>readFileSync(new URL(`../${file}`,import.meta.url),"utf8");
const source=text("wrangler.jsonc");
// Simple JSONC comments are full-line only, so this is intentionally strict.
const worker=JSON.parse(source.replace(/^\s*\/\/.*$/gm,""));
const workerName="bahnconnections-standalone";
assert.equal(worker.name,workerName);
assert.equal(worker.main,"vinext/server/app-router-entry");
assert.ok(/^20\d{2}-\d{2}-\d{2}$/.test(worker.compatibility_date));
assert.ok(worker.compatibility_flags.includes("nodejs_compat"));
assert.equal(worker.assets?.not_found_handling,"none");
assert.equal(worker.workers_dev,true);
assert.equal(worker.d1_databases,undefined,"Standalone Workers must not inherit placeholder Sites D1 bindings");
assert.equal(worker.r2_buckets,undefined,"Standalone Workers must not inherit placeholder Sites R2 bindings");

const vite=text("vite.cloudflare.config.ts");
assert.ok(vite.includes("vinext()"));
assert.ok(vite.includes("cloudflare({"));
assert.ok(vite.includes('configPath: "./wrangler.jsonc"'));
assert.ok(vite.includes('viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] }'));
assert.ok(!vite.includes("@openai/sites-vite-plugin"),"Standalone build must not depend on ChatGPT Sites");
assert.ok(!/\bfrom\s+["\x27][^"\x27]*hosting\.json/.test(vite),"Standalone build must not import Sites metadata");

// The original ChatGPT Sites environment must remain isolated from the root Worker.
const sitesVite=text("vite.config.ts");
const sitesWorker=JSON.parse(text(".openai/wrangler-sites-local.jsonc").split("\n").filter(line=>!line.trimStart().startsWith("//")).join("\n"));
assert.ok(sitesVite.includes("configPath: './.openai/wrangler-sites-local.jsonc'"));
assert.ok(sitesVite.includes("config: localBindingConfig"));
assert.equal(sitesWorker.name,"sites-project");
assert.equal(sitesWorker.compatibility_flags,undefined,"Avoid duplicate nodejs_compat in Sites local runtime");

const pkg=JSON.parse(text("package.json"));
assert.equal(pkg.scripts["build:cloudflare"],"vite build --config vite.cloudflare.config.ts");
assert.equal(pkg.scripts["audit:cloudflare"],"node scripts/cloudflare-preflight.mjs");
assert.equal(pkg.scripts["deploy:cloudflare"],"wrangler deploy --config $(node scripts/cloudflare-output-config.mjs)");
assert.ok(pkg.dependencies.vinext||pkg.devDependencies.vinext);
assert.ok(pkg.devDependencies["@cloudflare/vite-plugin"]);

const workflow=text(".github/workflows/cloudflare-workers.yml");
assert.ok(workflow.includes("workflow_dispatch:"),"Deployment must be explicitly triggerable");
assert.ok(workflow.includes("CLOUDFLARE_DEPLOY_ENABLED"),"Automatic deployment must be opt-in");
assert.ok(workflow.includes("github.ref == 'refs/heads/main'"),"Production deployments must be restricted to main");
assert.ok(workflow.includes("CLOUDFLARE_API_TOKEN")&&workflow.includes("CLOUDFLARE_ACCOUNT_ID"));
assert.ok(workflow.includes("pnpm build:cloudflare"));
assert.ok(workflow.includes("--dry-run"),"Pull-request validation must never publish");
assert.ok(!workflow.includes("wrangler login"),"CI must use scoped credentials, not browser login");

console.log("Standalone Cloudflare configuration OK: Vite separation, Worker runtime, no inherited Sites bindings, guarded CI deploy.");
