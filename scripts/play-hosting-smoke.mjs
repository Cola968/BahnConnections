import {assessPlayOrigin} from "../app/play-hosting.ts";
import {APP_VERSION} from "../app/app-version.ts";

const requested=process.env.BAHNCONNECTIONS_PLAY_ORIGIN;
const decision=assessPlayOrigin(requested);
if(!decision.ok){
 console.error("PLAY HOSTING BLOCKED: "+decision.reason);
 console.error("Set BAHNCONNECTIONS_PLAY_ORIGIN to the *actual deployed* HTTPS Worker/custom-domain origin, never to the sleeping Render free service.");
 process.exit(1);
}
const base=decision.origin;
const issues=[];
const fetchChecked=async (path,contentType)=> {
 const response=await fetch(base+path,{redirect:"follow",headers:{"Accept":contentType},signal:AbortSignal.timeout(20000),cache:"no-store"});
 if(!response.ok)throw Error(path+" HTTP "+response.status);
 if(new URL(response.url).origin!==base)throw Error(path+" redirected off the verified app origin");
 return response;
};
try{
 const [root,version,manifest,worker]=await Promise.all([
  fetchChecked("/","text/html"),fetchChecked("/version.json","application/json"),
  fetchChecked("/manifest.webmanifest","application/manifest+json"),fetchChecked("/sw.js","application/javascript"),
 ]);
 const html=(await root.text()).slice(0,300_000).toLowerCase();
 if(!html.includes("bahnconnections"))issues.push("Start page has no BahnConnections app identity");
 if(/your free instance will spin down|render is loading|your service is starting up|waking your service/.test(html))
  issues.push("Host displayed an infrastructure startup/sleep page instead of the app");
 const details=await version.json();
 if(details?.version!==APP_VERSION)issues.push("Live version is "+String(details?.version)+" rather than V"+APP_VERSION);
 const pwa=await manifest.json();
 if(pwa?.start_url!=="/"||pwa?.display!=="standalone"||pwa?.scope!=="/")
  issues.push("PWA must launch directly at / in standalone mode on the verified origin");
 const sw=await worker.text();
 if(!sw.includes("SKIP_WAITING"))issues.push("Service Worker is missing update support");
 const assetlinks=await fetch(base+"/.well-known/assetlinks.json",{signal:AbortSignal.timeout(10000),cache:"no-store"});
 if(!assetlinks.ok)issues.push("Google Play Digital Asset Links are not published at /.well-known/assetlinks.json");
 else{
  let links;
  try{links=await assetlinks.json();}catch{issues.push("Digital Asset Links file is not valid JSON");}
  if(!Array.isArray(links)||!links.some(x=>x?.relation?.includes("delegate_permission/common.handle_all_urls")&&x?.target?.namespace==="android_app"&&typeof x?.target?.package_name==="string"&&Array.isArray(x?.target?.sha256_cert_fingerprints)&&x.target.sha256_cert_fingerprints.length))
   issues.push("Google Play Digital Asset Links are missing a genuine signed Android package and Play app-signing SHA256 fingerprint");
 }
}catch(e){issues.push(e instanceof Error?e.message:String(e));}
if(issues.length){
 console.error("Play startup smoke failed for "+base);
 for(const issue of issues)console.error(" - "+issue);
 process.exit(1);
}
console.log("Play startup smoke passed: "+base+" serves V"+APP_VERSION+", installs from /, updates via Service Worker and verifies Android Digital Asset Links.");
