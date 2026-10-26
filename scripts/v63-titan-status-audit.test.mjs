import {test} from "node:test";
import assert from "node:assert/strict";
import {auditRegistry} from "./v63-titan-status-audit.mjs";

const row=(id,overrides={})=>({
  id,epic:"Rail Atlas",priority:"P1",name:"Example feature",acceptance:"Testable behavior",
  classification:"unreviewed",status:"todo",release_scope:"undecided",changed_paths:[],
  unit_test_ids:[],integration_test_ids:[],browser_test_ids:[],visual_evidence:[],live_evidence:[],
  commit_sha:null,blockers:[],notes:"",...overrides
});
const reg=(items)=>({schema_version:1,feature_count:items.length,items});

test("inventory accepts genuinely unstarted items without treating them as done",()=>{
  const r=auditRegistry(reg([row("BC63-01-01")]));
  assert.equal(r.errors.length,0);
  assert.equal(r.summary.todo,1);
  assert.equal(r.summary.live_verified,0);
});

test("duplicate IDs must fail registry validation",()=>{
  const r=auditRegistry(reg([row("BC63-01-01"),row("BC63-01-01")]));
  assert.ok(r.errors.some(x=>x.includes("Doppelte")));
});

test("cannot claim tested with zero evidence",()=>{
  const r=auditRegistry(reg([row("BC63-01-01",{status:"tested",classification:"new",release_scope:"web-63",changed_paths:["app/page.tsx"],commit_sha:"a".repeat(40)})]));
  assert.ok(r.errors.some(x=>x.includes("Testnachweis")));
});

test("cannot claim live verification without live proof",()=>{
  const r=auditRegistry(reg([row("BC63-01-01",{status:"live_verified",classification:"new",release_scope:"web-63",changed_paths:["app/page.tsx"],commit_sha:"a".repeat(40),browser_test_ids:["QA63-001"]})]));
  assert.ok(r.errors.some(x=>x.includes("Live-Nachweis")));
});

test("deferred item requires a reason and may not be web-scoped",()=>{
  const r=auditRegistry(reg([row("BC63-01-01",{status:"deferred",classification:"defer",release_scope:"web-63"})]));
  assert.ok(r.errors.length>0);
});

test("release requires deliberate classification and scope decisions",()=>{
  const r=auditRegistry(reg([row("BC63-01-01")]),{release:true});
  assert.ok(r.errors.some(x=>x.includes("Noch nicht triagiert")));
});

test("passing live evidence is counted only for a real implementation and test",()=>{
  const r=auditRegistry(reg([row("BC63-01-01",{status:"live_verified",classification:"new",release_scope:"web-63",changed_paths:["app/page.tsx"],commit_sha:"a".repeat(40),browser_test_ids:["QA63-001"],live_evidence:["https://example.invalid/verified-proof-placeholder"]})]));
  assert.equal(r.errors.length,0);
  assert.equal(r.summary.live_verified,1);
});
