import assert from "node:assert/strict";
import {assessPlayOrigin} from "../app/play-hosting.ts";
for(const origin of [
 "https://bahnconnections-standalone.example.workers.dev",
 "https://app.bahnconnections.de",
 "https://example.com"
]){
 const result=assessPlayOrigin(origin);
 assert.equal(result.ok,true,"Expected a valid independently hosted app origin: "+origin);
 assert.equal(result.origin,origin);
}
for(const origin of [
 "",null,undefined,"http://app.bahnconnections.de","https://bahnconnections-v55.onrender.com/",
 "https://bahnconnections-de.a-stad.chatgpt.site/","https://app.bahnconnections.de/login",
 "https://app.bahnconnections.de/?pwa=1","https://app.bahnconnections.de#start",
 "https://localhost/","https://127.0.0.1/","https://app.bahnconnections.de:8443/"
]){
 assert.equal(assessPlayOrigin(origin).ok,false,"Unsafe Play origin accepted: "+String(origin));
}
assert.match(assessPlayOrigin("https://bahnconnections-v55.onrender.com").reason,/Render/);
console.log("Play Store hosting origin audit passed: unsupported and sleeping hosts blocked.");
