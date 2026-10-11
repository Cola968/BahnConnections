// Real Chromium rendering of the product UI. Timetable responses are deterministic
// fixtures, never evidence of live provider availability.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2).filter(value => value !== '--');
const base = args[0] ?? 'http://localhost:3000';
const output = resolve(args[1] ?? 'work/live-map-qa');
const baseline = args.includes('--baseline');
const port = 9600 + Math.floor(Math.random()*300);
const pause = ms => new Promise(resolvePause => setTimeout(resolvePause,ms));
await mkdir(output,{recursive:true});
await rm(join(output,'report.json'),{force:true});
const browser = spawn(process.env.EDGE_PATH ?? '/usr/bin/chromium',[
  '--headless=new', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  ...(process.env.BAHNCONNECTIONS_QA_NO_SANDBOX === '1' ? ['--no-sandbox'] : []),
  '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(),`bahn-station-${process.pid}`)}`, 'about:blank',
],{stdio:['ignore','ignore','pipe']});
let browserError = '';
browser.stderr.on('data',chunk => {browserError=(browserError+chunk).slice(-4000);});
const pending = new Map();
let socket;
let nextId = 0;
function command(method,params={}) {
  return new Promise((resolveCommand,rejectCommand) => {
    const id=++nextId;
    const timer=setTimeout(()=>{pending.delete(id);rejectCommand(Error(`DevTools timeout: ${method}`));},30000);
    pending.set(id,{resolveCommand,rejectCommand,timer});
    socket.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression) {
  const response=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
  return response.result?.value;
}
async function click(selector) {
  const point=await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing: '+${JSON.stringify(selector)});const r=e.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;const h=document.elementFromPoint(x,y);if(!h||!(e===h||e.contains(h)))throw Error('Occluded: '+${JSON.stringify(selector)});return {x,y};})()`);
  await command('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
  await command('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
  await pause(350);
}
async function screenshot(name) {
  const r=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(join(output,name+'.png'),Buffer.from(r.data,'base64'));
}

function encode(points){let a=0,b=0,result='';const piece=v=>{let n=v<0?~(v<<1):v<<1,out='';while(n>=32){out+=String.fromCharCode((32|(n&31))+63);n>>=5;}return out+String.fromCharCode(n+63);};for(const p of points){const x=Math.round(p[0]*1e4),y=Math.round(p[1]*1e4);result+=piece(x-a)+piece(y-b);a=x;b=y;}return result;}
const count=180,pointsPerTrip=6000;
function trips(){const now=Date.now();return Array.from({length:count},(_,i)=>{const lat=52.5251+(i%15-7)*.004,lon=13.3694+(Math.floor(i/15)-6)*.005;return {trips:[{tripId:'radar-'+i,displayName:i===0?'<img src=x onerror=alert(1)>':'RE '+i}],mode:'REGIONAL_RAIL',distance:3000,from:{name:'Berlin Hbf',lat,lon},to:{name:'Berlin Südkreuz',lat:lat+.01,lon:lon+.01},departure:new Date(now-300000).toISOString(),arrival:new Date(now+300000).toISOString(),scheduledDeparture:new Date(now-300000-(i%4===0?5:0)*60000).toISOString(),scheduledArrival:new Date(now+300000-(i%4===0?5:0)*60000).toISOString(),realTime:i%5!==0,polyline:encode(Array.from({length:pointsPerTrip},(_,j)=>[lat+j/(pointsPerTrip-1)*.01,lon+Math.sin(j/(pointsPerTrip-1)*Math.PI)*.003+j/(pointsPerTrip-1)*.01]))};});}
let requests=0;
try {
  let targets;
  for(let i=0;i<100;i++) {
    if(browser.exitCode!==null)throw Error(browserError);
    try{targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();break;}catch{await pause(100);}
  }
  assert.ok(targets?.length,browserError);
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolveOpen,rejectOpen)=>{socket.addEventListener('open',resolveOpen,{once:true});socket.addEventListener('error',rejectOpen,{once:true});});

  socket.addEventListener('message',event=>{
    const m=JSON.parse(String(event.data));
    if(m.method==='Fetch.requestPaused'){
      const path=new URL(m.params.request.url).pathname;
      const payload=path.endsWith('/map/trips')?(requests++,trips()):path.includes('geocode')?[{type:'STOP',id:'de-berlin-hbf',name:'Berlin Hauptbahnhof',lat:52.5251,lon:13.3694,country:'DE'}]:path.endsWith('/board')?{stopTimes:[],updatedAt:new Date().toISOString(),verification:{status:'inconclusive'},warnings:[]}:path.endsWith('/services')?{routes:[],stopTimes:[],warnings:[]}:path.endsWith('/stations/search')?{stations:[]}:[];
      void command('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(JSON.stringify(payload)).toString('base64')}).catch(()=>{});return;
    }
    const p=pending.get(m.id);if(!p)return;clearTimeout(p.timer);pending.delete(m.id);if(m.error)p.rejectCommand(Error(m.error.message));else p.resolveCommand(m.result);
  });
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
  await command('Network.setBypassServiceWorker',{bypass:true});
  await command('Page.addScriptToEvaluateOnNewDocument',{source:"navigator.serviceWorker.register=()=>Promise.reject(Error('Fixture'));localStorage.setItem('bahnconnections-auto-location','0');"});
  await command('Fetch.enable',{patterns:[{urlPattern:'*://*/api/stations/*',requestStage:'Request'},{urlPattern:'https://api.transitous.org/*',requestStage:'Request'}]});
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await command('Page.navigate',{url:new URL('/?station=berlin',base).href});
  for(let i=0;i<100;i++){if(await evaluate("Boolean(document.querySelector('path.station-point'))"))break;await pause(100);}
  await click('.topbar>.station-search input');
  await click('.topbar .search-suggestions button:has(b[title="Berlin Hbf"])');
  await pause(1000);
  for(let i=0;i<3;i++)await click('.leaflet-control-zoom-in');
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'l',code:'KeyL',windowsVirtualKeyCode:76});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'l',code:'KeyL',windowsVirtualKeyCode:76});
  for(let i=0;i<200;i++){if(await evaluate(`document.querySelectorAll('.live-train-wrap').length===${count}`))break;await pause(100);}
  assert.equal(await evaluate("document.querySelectorAll('.live-train-wrap').length"),count,'All fixture trains must render');
  await command('Emulation.setCPUThrottlingRate',{rate:4});
  await evaluate(`window.radarQa={original:[...document.querySelectorAll('.live-train-wrap')],tasks:[],gaps:[],mutations:0};new PerformanceObserver(list=>window.radarQa.tasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:false});new MutationObserver(list=>window.radarQa.mutations+=list.reduce((n,e)=>n+[...e.addedNodes,...e.removedNodes].filter(v=>v.nodeType===1&&v.classList?.contains('live-train-wrap')).length,0)).observe(document.querySelector('.leaflet-marker-pane'),{childList:true});let prior=performance.now();function frame(now){window.radarQa.gaps.push(now-prior);prior=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);`);
  await pause(17000);
  const metrics=await evaluate(`(() => {const p=window.radarQa;return {retained:p.original.filter(e=>e.isConnected).length,mutations:p.mutations,maxTask:Math.max(0,...p.tasks),blockingTime:p.tasks.reduce((n,t)=>n+Math.max(0,t-50),0),longTasks:p.tasks.length,maxFrameGap:Math.max(0,...p.gaps),markers:document.querySelectorAll('.live-train-wrap').length};})()`);
  await command('Emulation.setCPUThrottlingRate',{rate:1});await screenshot('1440-radar');
  await writeFile(join(output,'report.json'),JSON.stringify({fixture:true,baseline,cpuSlowdown:4,count,pointsPerTrip,requests,...metrics},null,2));console.log(JSON.stringify(metrics));
  if(!baseline){
    await evaluate("window.radarQa.original[0].focus()");await pause(4100);
    assert.equal(await evaluate("document.activeElement===window.radarQa.original[0]"),true,'Animation ticks retain keyboard focus');
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
    await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await pause(250);assert.equal(await evaluate("Boolean(document.querySelector('.live-trip-card'))"),true,'Keyboard opens current trip details');
    assert.equal(await evaluate("document.querySelectorAll('.live-trip-card img[src=x],.leaflet-tooltip img[src=x]').length"),0,'Provider text must not become HTML');
    assert.equal(await evaluate("(() => {const panel=document.querySelector('.live-trip-card'),body=panel.querySelector('.panel-body');return panel.scrollWidth>panel.clientWidth+1||body.scrollWidth>body.clientWidth+1;})()"),false,'Trip inspector must not overflow with long provider text');
    await screenshot('1440-trip-details');
    assert.equal(metrics.retained,count,'Ticks must preserve marker identity');assert.equal(metrics.mutations,0,'Ticks must not replace DOM markers');assert.equal(metrics.markers,count);assert.ok(metrics.maxTask<250,'Radar main-thread budget');}
}finally{for(const p of pending.values()){clearTimeout(p.timer);p.rejectCommand(Error('Browser closing'));}pending.clear();socket?.close();browser.kill();}
