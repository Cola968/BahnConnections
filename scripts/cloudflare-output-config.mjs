#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const workerName = "bahnconnections-standalone";
const distPath = resolve("dist");
const found = [];
try {
  for (const entry of readdirSync(distPath, { withFileTypes:true })) {
    if (!entry.isDirectory()) continue;
    const file = join(distPath, entry.name, "wrangler.json");
    try {
      if (!statSync(file).isFile()) continue;
      const config = JSON.parse(readFileSync(file, "utf8"));
      found.push({ path:file, name:config.name, main:config.main, assets:config.assets });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const targets = found.filter((item)=>item.name===workerName);
if (targets.length !== 1 || !targets[0].main) {
  console.error("Expected exactly one built Cloudflare Worker with a server entry.");
  console.error(JSON.stringify(found.map((entry)=>({path:entry.path,name:entry.name,main:entry.main})),null,2));
  process.exit(1);
}
console.log(targets[0].path);
