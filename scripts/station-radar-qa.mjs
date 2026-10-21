// Product-level regression: stop membership, complete itinerary and mobile controls.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const base=process.argv[2]??'http://localhost:3107';
const output=resolve(process.argv[3]??'work/v57-mobile-qa');
const baseline=process.argv.includes('--baseline');
const port=9750+Math.floor(Math.random()*150),pause=ms=>new Promise(r=>setTimeout(r,ms));
await mkdir(output,{recursive:true});
const browser=spawn(process.env.EDGE_PATH??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
  '--headless=new','--disable-gpu','--no-first-run','--disable-background-timer-throttling','--disable-renderer-backgrounding',
  `--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),`bahn-v57-${process.pid}-${Date.now()}`)}`,'about:blank'
],{stdio:['ignore','ignore','pipe'],windowsHide:true});
let socket,stderr='',next=0,tripFailure=false;const pending=new Map(),errors=[],checks=[];
browser.stderr.on('data',c=>{stderr=(stderr+c).slice(-3000);});
function command(method,params={}){return new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'));},20000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result?.value;}
async function waitFor(expression,label){for(let i=0;i<100;i++){if(await evaluate(expression))return;await pause(100);}throw Error(label);}
async function click(selector){const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);if(!h||!(e===h||e.contains(h)))throw Error('Occluded '+${JSON.stringify(selector)});return{x,y};})()`);await command('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await command('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await pause(180);}
async function screenshot(name){const r=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(output,name+'.png'),Buffer.from(r.data,'base64'));}
function encode(points){let a=0,b=0,result='';const piece=v=>{let n=v<0?~(v<<1):v<<1,out='';while(n>=32){out+=String.fromCharCode((32|(n&31))+63);n>>=5;}return out+String.fromCharCode(n+63);};for(const [lat,lon]of points){const x=Math.round(lat*1e4),y=Math.round(lon*1e4);result+=piece(x-a)+piece(y-b);a=x;b=y;}return result;}
const time=minutes=>new Date(Date.now()+minutes*60000).toISOString();
function segments(){return [
  {id:'qa-outbound',from:'Berlin Hbf',to:'Berlin Südkreuz',lat:52.5251,lon:13.3694},
  {id:'qa-inbound',from:'Gesundbrunnen',to:'Berlin Hbf',lat:52.5351,lon:13.3794},
  {id:'qa-unrelated',from:'Humboldthain',to:'Nordbahnhof',lat:52.5451,lon:13.3894}
].map(s=>({trips:[{tripId:s.id,displayName:s.id==='qa-unrelated'?'S2':'ICE 241'}],mode:'HIGHSPEED_RAIL',realTime:true,from:{name:s.from,lat:s.lat,lon:s.lon},to:{name:s.to,lat:s.lat-.01,lon:s.lon-.01},departure:time(-3),arrival:time(3),scheduledDeparture:time(-7),scheduledArrival:time(-1),distance:1500,polyline:encode(Array.from({length:20},(_,i)=>[s.lat-i/19*.01,s.lon-i/19*.01]))}));}
function board(arrival){return{stopTimes:[{tripId:arrival?'qa-inbound':'qa-outbound',mode:'HIGHSPEED_RAIL',displayName:'ICE 241',realTime:true,tripFrom:{name:'Hamburg Hbf'},tripTo:{name:'München Hbf'},place:{name:'Berlin Hbf',departure:time(-3),arrival:time(3),scheduledDeparture:time(-7),scheduledArrival:time(-1),track:'3'}}],updatedAt:new Date().toISOString(),warnings:[]};}
function details(){const names=['Hamburg Hbf','Ludwigslust','Wittenberge','Berlin Hbf','Berlin Südkreuz','Halle Hbf','Erfurt Hbf','Nürnberg Hbf','München Hbf'];const stops=names.map((name,i)=>({name,lat:52.53-i*.001,lon:13.37-i*.001,arrival:i?time((i-3)*6-4):undefined,departure:i<names.length-1?time((i-3)*6-3):undefined,scheduledArrival:i?time((i-3)*6-8):undefined,scheduledDeparture:i<names.length-1?time((i-3)*6-7):undefined,track:'3'}));return{trip:{legs:[{mode:'HIGHSPEED_RAIL',realTime:true,displayName:'ICE 241',from:stops[0],to:stops.at(-1),intermediateStops:stops.slice(1,-1),legGeometry:{points:encode(stops.map(s=>[s.lat,s.lon])),precision:4}}]},updatedAt:new Date().toISOString()};}
try{
  let targets;for(let i=0;i<100;i++){try{targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();break;}catch{if(browser.exitCode!==null)throw Error(stderr);await pause(100);}}
  assert.ok(targets?.length,stderr);socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true});});
  socket.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(m.method==='Fetch.requestPaused'){const u=new URL(m.params.request.url); const payload=u.pathname==='/api/radar'?{segments:segments()}:u.pathname.endsWith('/map/trips')?segments():u.pathname.includes('/geocode')?[{type:'STOP',id:'de-berlin-hbf',name:'Berlin Hbf',lat:52.5251,lon:13.3694}]:u.pathname.endsWith('/board')?board(u.searchParams.get('kind')==='arrival'):u.pathname.includes('/api/trips/')?details():u.pathname.endsWith('/services')?{routes:[],stopTimes:[],warnings:[]}:{stations:[]};void command('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:tripFailure&&u.pathname.includes("/api/trips/")?502:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(JSON.stringify(payload)).toString('base64')}).catch(()=>{});return;}const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}});
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');await command('Network.setBypassServiceWorker',{bypass:true});
  await command('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('bahnconnections-auto-location','0');localStorage.setItem('bahnconnections-motion','reduced');navigator.serviceWorker.register=()=>Promise.reject(Error('QA'));"});
  await command('Fetch.enable',{patterns:[{urlPattern:"*://*/api/radar*",requestStage:"Request"},{urlPattern:'*://*/api/stations/*',requestStage:'Request'},{urlPattern:'*://*/api/trips/*',requestStage:'Request'},{urlPattern:'https://api.transitous.org/*',requestStage:'Request'}]});
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await command('Page.navigate',{url:base+'/?station=berlin'});
  await waitFor("Boolean(document.querySelector('.station-card'))",'Station missing');
  await click('.mobile-navigation button:first-of-type');await click('.mobile-map-view-button');
  if(!await evaluate("document.querySelector('.map-filter-master input').checked"))await click('.map-filter-master input');
  await click('.map-menu-dismiss button');await waitFor("Boolean(document.querySelector('.live-train-wrap,.live-cluster-wrap'))",'Markers missing');
  await waitFor("Array.from(document.querySelectorAll('.live-cluster b')).some(e=>Number(e.textContent)===2)",'Nearby trains must form a compact group at overview zoom');
  const clusters=await evaluate("Array.from(document.querySelectorAll('.live-cluster')).map(e=>({count:Number(e.querySelector('b').textContent),text:e.textContent,icon:Boolean(e.querySelector('svg')),width:e.getBoundingClientRect().width}))");
  assert.ok(clusters.every(c=>c.count>=2&&c.icon&&!c.text.includes('Züge')&&c.width<64),'Compact groups must contain multiple trains');
  checks.push({name:'compact-groups-without-singleton-bubbles',clusters});await screenshot('390-compact-radar');
  const zoomPoint=await evaluate("(()=>{const r=document.querySelector('path.station-point.selected').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()");
  await command('Input.dispatchMouseEvent',{type:'mouseWheel',...zoomPoint,deltaY:-850,deltaX:0});await pause(1000);
  // Open a cluster to expose its members; the station scope must still apply.
  if(!await evaluate("Boolean(document.querySelector('.live-train-wrap'))")){await click('.live-cluster-wrap');await waitFor("Boolean(document.querySelector('.live-train-wrap'))",'Cluster did not zoom');}
  await screenshot('390-before-train');
  const ids=await evaluate("Array.from(document.querySelectorAll('.live-train-wrap')).map(e=>e.dataset.tripId)");
  checks.push({name:'station-membership',ids});
  assert.equal(ids.includes('qa-unrelated'),false,'Unrelated S2 does not stop at Berlin Hbf and must not be shown');
  assert.ok(ids.includes('qa-outbound')&&ids.includes('qa-inbound'),'Both stopping directions visible by default');
  await click('.station-radar-scope .radar-direction-control button:nth-child(2)');
  await waitFor("document.querySelectorAll('.live-train-wrap').length===1",'Inbound did not filter');
  assert.equal(await evaluate("document.querySelector('.live-train-wrap').dataset.tripId"),'qa-inbound');
  await click('.station-radar-scope .radar-direction-control button:nth-child(3)');
  await waitFor("document.querySelectorAll('.live-train-wrap').length===1",'Outbound did not filter');
  assert.equal(await evaluate("document.querySelector('.live-train-wrap').dataset.tripId"),'qa-outbound');
  await click('.station-radar-scope .radar-direction-control button:first-child');
  await waitFor("document.querySelectorAll('.live-train-wrap').length===2",'All did not reset directions');
  checks.push({name:'inbound-outbound-all',passed:true});
  const arrow=await evaluate("(()=>{const g=document.querySelector('.live-train-marker.glyph');return{inner:getComputedStyle(g.querySelector('i')).clipPath,before:getComputedStyle(g,'::before').content,front:getComputedStyle(g,'::after').clipPath};})()");
  assert.equal(arrow.inner,'none');assert.equal(arrow.before,'none');assert.match(arrow.front,/polygon/);
  checks.push({name:'single-front-arrow',passed:true});
  await click('[data-trip-id="qa-outbound"]');await waitFor("document.querySelectorAll('.train-stop-list li').length>0",'Itinerary did not load');
  const full=await evaluate("({summary:document.querySelector('.train-inspector .mobile-sheet-summary')?.textContent??document.querySelector('.train-inspector .mobile-sheet-header')?.textContent,stops:document.querySelectorAll('.train-stop-list li').length,text:document.querySelector('.train-inspector').innerText})");
  assert.equal(full.stops,9,'Every stop must be visible without expanding');assert.match(full.text,/Hamburg Hbf/);assert.match(full.text,/München Hbf/);
  assert.equal(await evaluate("Boolean(document.querySelector('.train-cockpit'))"),false,'Repeated oversized cockpit replaced by compact itinerary');
  checks.push({name:'full-route',stops:full.stops});await screenshot('390-full-route');
  await click('.train-inspector .mobile-sheet-summary');await screenshot('390-expanded-route');
  await click('.train-inspector .mobile-sheet-summary');await click('.train-inspector .mobile-sheet-summary');
  assert.equal(await evaluate("document.querySelector('.train-stop-list li[aria-current=step] b').textContent"),'Berlin Südkreuz');
  await click('.train-action-row button:nth-child(2)');
  await waitFor("document.querySelectorAll('path.live-journey-stop').length===9",'Full route stops were not drawn');
  checks.push({name:'full-route-map',passed:true});
  tripFailure=true;await evaluate("document.dispatchEvent(new Event('visibilitychange'))");
  await waitFor("Boolean(document.querySelector('.train-route-error'))",'Failed refresh state missing');
  assert.equal(await evaluate("document.querySelectorAll('.train-stop-list li').length"),9,'Failed refresh preserves the complete itinerary');
  assert.equal(await evaluate("document.querySelector('.train-arrival-overview .realtime-time').dataset.tone"),'neutral','Old forecasts must not be displayed as current');
  tripFailure=false;await click('.train-route-error button');await waitFor("!document.querySelector('.train-route-error')",'Retry did not recover');
  checks.push({name:'failed-refresh-retains-route-and-retry',passed:true});
  for(const [width,height]of [[320,640],[360,780],[390,430],[430,932],[768,1024],[1440,900]]){
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1024});await pause(200);
    const layout=await evaluate("(()=>{const p=document.querySelector('.train-inspector'),b=p.querySelector('.panel-body'),r=p.getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth+1,panelOverflow:p.scrollWidth>p.clientWidth+1,bodyOverflow:b.scrollWidth>b.clientWidth+1,inside:r.left>=-1&&r.right<=innerWidth+1};})()");
    assert.ok(!layout.overflow&&!layout.panelOverflow&&!layout.bodyOverflow&&layout.inside,JSON.stringify({width,height,...layout}));checks.push({name:'responsive',width,height,...layout});await screenshot(`${width}x${height}-route`);
  }
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(200);
  await click('.train-inspector .track-button');await waitFor("Boolean(document.querySelector('.train-radar-hud'))",'Follow HUD missing');
  await click('.train-inspector .mobile-sheet-actions button:last-child');assert.equal(await evaluate("Boolean(document.querySelector('.train-inspector,.train-radar-hud,.station-card'))"),false,'X resets every panel and tracking');
  assert.equal(errors.length,0,errors.join('\n'));checks.push({name:'tracking-close',passed:true});
}catch(error){await screenshot("failure");console.error(await evaluate("document.body.innerText.slice(0,800)"));throw error;}finally{await writeFile(join(output,'report.json'),JSON.stringify({checkedAt:new Date().toISOString(),baseline,checks,errors,realDevice:false},null,2));socket?.close();browser.kill();}
console.log(JSON.stringify({passed:true,checks},null,2));
