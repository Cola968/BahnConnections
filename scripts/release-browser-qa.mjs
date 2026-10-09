import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { routeShareUrl } from '../app/route-sharing.ts';

const base=process.env.BAHNCONNECTIONS_BASE_URL??'http://localhost:3001';
const port=9600+Math.floor(Math.random()*200);
const output=process.argv[2]??'work/release-browser';
const browser=spawn(process.env.EDGE_PATH??'/usr/bin/chromium',[
  '--headless=new',...(process.env.BAHNCONNECTIONS_QA_NO_SANDBOX==='1'?['--no-sandbox']:[]),
  '--no-first-run',`--remote-debugging-port=${port}`,`--user-data-dir=/tmp/bahn-release-${process.pid}`,'about:blank',
],{stdio:['ignore','ignore','pipe']});
let socket,stderr='';
browser.stderr.on('data',data=>stderr=(stderr+data).slice(-4000));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const pending=new Map();
let sequence=0;
try {
  await mkdir(output,{recursive:true});
  let targets;
  for(let attempt=0;attempt<80;attempt++) {
    try {targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();break;}catch{await pause(250);}
  }
  assert.ok(targets?.length,'Chromium unavailable: '+stderr);
  socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',event=>{
    const message=JSON.parse(String(event.data));
    if(!message.id)return;
    const entry=pending.get(message.id);if(!entry)return;
    clearTimeout(entry.timer);pending.delete(message.id);
    if(message.error)entry.reject(Error(message.error.message));else entry.resolve(message.result);
  });
  const command=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++sequence;
    const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'));},20000);
    pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
    const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor=async expression=>{
    for(let attempt=0;attempt<80;attempt++){if(await evaluate(expression))return;await pause(250);}
    throw Error('Condition timed out: '+expression);
  };
  const screenshot=async name=>{
    const {data}=await command('Page.captureScreenshot',{format:'png'});
    await writeFile(`${output}/${name}.png`,Buffer.from(data,'base64'));
  };
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const from={id:'berlin',name:'Berlin Hbf',lat:52.5251,lon:13.3694,country:'DE'};
  const to={id:'muenchen',name:'München Hbf',lat:48.14,lon:11.56,country:'DE'};
  await command('Page.navigate',{url:routeShareUrl(base,from,to,'2026-10-12T10:30')});
  await waitFor(`Boolean(document.querySelector('.planner-submit .plan-button'))&&document.querySelector('.app-shell')?.dataset.preferencesReady==='true'`);
  await pause(700);
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.route-search-pair input')).map(input=>input.value)`),['Berlin Hbf','München Hbf']);
  const footer=await evaluate(`(()=>{const button=document.querySelector('.plan-button').getBoundingClientRect();const nav=document.querySelector('.mobile-navigation').getBoundingClientRect();return {visible:button.top>0&&button.bottom<=nav.top,enabled:!document.querySelector('.plan-button').disabled}})()`);
  assert.ok(footer.visible&&footer.enabled,'Search action must be visible above mobile navigation');
  await screenshot('shared-search');
  // Hold the planner request so cancellation is checked deterministically.
  await command('Fetch.enable',{patterns:[{urlPattern:'*/api/journeys',requestStage:'Request'}]});
  await evaluate(`document.querySelector('.plan-button').click()`);
  await waitFor(`Boolean(document.querySelector('.planner-cancel'))`);
  await evaluate(`document.querySelector('.planner-cancel').click()`);
  await waitFor(`!document.querySelector('.planner-cancel')&&!document.querySelector('.plan-button').disabled`);
  assert.ok(await evaluate(`document.querySelector('.planner-message').textContent.includes('abgebrochen')`));
  await command('Fetch.disable');
  // Simulate a real browser connectivity change, rather than only firing a DOM event.
  await command('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await waitFor(`Boolean(document.querySelector('.connectivity-notice'))`);
  await screenshot('offline-notice');
  await command('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await waitFor(`!document.querySelector('.connectivity-notice')`);
  await evaluate(`localStorage.setItem('bahnconnections-saved-routes',JSON.stringify([{from:{name:'<img src=x onerror=alert(1)>'},to:{name:'München Hbf'}}]))`);
  await waitFor(`Boolean(navigator.serviceWorker.controller)`);
  assert.ok(await evaluate(`caches.match('/offline.html').then(Boolean)`));
  await command('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await command('Page.navigate',{url:base+'/?offline-smoke=1'});
  await waitFor(`Boolean(document.querySelector('#routes li'))`);
  assert.ok(await evaluate(`document.querySelector('#routes li').textContent.includes('<img src=x onerror=alert(1)>')&&!document.querySelector('#routes img')`),'Offline names must remain text, not executable HTML');
  await screenshot('offline-dashboard');
  await command('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await evaluate(`document.querySelector('#retry').click()`);
  await waitFor(`Boolean(document.querySelector('.app-shell'))`);
  const subscription=await evaluate(`fetch('/api/subscription').then(response=>response.json())`);
  assert.equal(subscription.entitlements.plan,'free');assert.equal(subscription.entitlements.checkoutEnabled,false);
  const version=await evaluate(`fetch('/version.json').then(response=>response.json())`);
  assert.equal(version.version,'51.0');
  const report={checkedAt:new Date().toISOString(),base,sharedRoute:true,visibleSearchAction:true,cancellation:true,offlineNotice:true,offlineNavigation:true,safeOfflineNames:true,recovery:true,productionSubscription:true,version:version.version};
  await writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally {
  for(const entry of pending.values())clearTimeout(entry.timer);
  socket?.close();browser.kill();
}
