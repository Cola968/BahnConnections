import assert from "node:assert/strict";
import {readLimitedJson,RequestInputError} from "../app/api/request-limits.ts";
const request=(body,headers={})=>new Request("https://bahn.example/api/journeys",{method:"POST",headers:{"Content-Type":"application/json",...headers},body});
assert.deepEqual(await readLimitedJson(request('{"ok":true}')),{ok:true});
await assert.rejects(readLimitedJson(request("{bad")),error=>error instanceof RequestInputError&&error.status===400);
await assert.rejects(readLimitedJson(request(" ".repeat(200)),32),error=>error instanceof RequestInputError&&error.status===413);
await assert.rejects(readLimitedJson(request("{}",{"Content-Length":"100000"})),error=>error instanceof RequestInputError&&error.status===413);
await assert.rejects(readLimitedJson(new Request("https://bahn.example",{method:"POST"})),error=>error instanceof RequestInputError&&error.status===400);
console.log("Bounded request bodies: valid JSON, malformed JSON, size and missing body passed.");
