// Real Chromium rendering of the product UI. Timetable responses are deterministic
// fixtures, never evidence of live provider availability.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2).filter(value => value !== '--');
const base = args[0] ?? 'http://localhost:3000';
const output = resolve(args[1] ?? 'work/station-sheet-qa');
const baseline = args.includes('--baseline');
const sizes = args.includes('--probe') ? [[390,844]] : [[320,844],[360,844],[390,844],[430,932],[768,1024],[1024,900],[1440,900],[1920,1080]];
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
function timetable() {
  const names=[['S3','SUBURBAN','S Erkner Hbf','15'],['S7','SUBURBAN','S Potsdam Hauptbahnhof','16'],['M10','TRAM','S+U Warschauer Str.','Pos. 5'],['U5','SUBWAY','U Hönow (Berlin)','2'],['RE 1','REGIONAL_RAIL','Halle (Saale) Hauptbahnhof – Zugang über den Bahnhofsvorplatz','7'],['ICE 1205','HIGHSPEED_RAIL','München Hauptbahnhof','8']];
  return {source:'Station-sheet UI fixture',updatedAt:new Date().toISOString(),warnings:[],verification:{status:'matched'},stopTimes:Array.from({length:30},(_,i)=>{
    const [displayName,mode,headsign,track]=names[i%names.length];
    const scheduled=new Date(Date.now()+(i+5)*60000).toISOString();
    const actual=new Date(new Date(scheduled).getTime()+(i===4?10:0)*60000).toISOString();
    return {tripId:`station-qa-${i}`,displayName,mode,headsign,realTime:true,place:{departure:actual,arrival:actual,scheduledDeparture:scheduled,scheduledArrival:scheduled,track,scheduledTrack:i===4?'4':track}};
  })};
}
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
    const message=JSON.parse(String(event.data));
    if(message.method==='Fetch.requestPaused') {
      const path=new URL(message.params.request.url).pathname;
      const payload=path.endsWith('/board')?timetable():path.endsWith('/stations/search')?{stations:[{id:'motis:de-halle',transitousId:'de-halle',name:'Halle (Saale) Hauptbahnhof – Zugang über den Bahnhofsvorplatz',lat:51.4782,lon:11.9872,country:'DE'}]}:
        path.includes('geocode')?[{type:'STOP',id:'de-berlin-hbf',name:'Berlin Hauptbahnhof',lat:52.5251,lon:13.3694,country:'DE'}]:
        path.endsWith('/services')?{routes:[],stopTimes:[],source:'UI fixture',updatedAt:new Date().toISOString(),warnings:[]}:
        path.includes('/api/trips/')?{trip:{legs:[]}}:[];
      void command('Fetch.fulfillRequest',{requestId:message.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(JSON.stringify(payload)).toString('base64')}).catch(error=>{if(!error.message.includes('Invalid InterceptionId'))console.error(error.message);});
      return;
    }
    const p=pending.get(message.id);if(!p)return;
    clearTimeout(p.timer);pending.delete(message.id);
    if(message.error)p.rejectCommand(Error(message.error.message));else p.resolveCommand(message.result);
  });
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
  await command('Network.setBypassServiceWorker',{bypass:true});
  await command('Page.addScriptToEvaluateOnNewDocument',{source:"navigator.serviceWorker.register=()=>Promise.reject(new Error('UI fixture QA'));"});
  await command('Fetch.enable',{patterns:[{urlPattern:'*://*/api/stations/*',requestStage:'Request'},{urlPattern:'*://*/api/trips/*',requestStage:'Request'},{urlPattern:'https://api.transitous.org/*',requestStage:'Request'}]});
  const results=[];
  for(const [width,height] of sizes)for(const theme of ['light','dark']) {
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1024});
    await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:theme}]});
    const themeScript=await command('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('bahnconnections-theme',${JSON.stringify(theme)});localStorage.setItem('bahnconnections-font','normal');`});
    await command('Page.navigate',{url:new URL('/?station=berlin',base).href});
    for(let i=0;i<100;i++){if(await evaluate("document.querySelectorAll('.board-row-summary').length>=4"))break;await pause(150);}
    assert.ok(await evaluate("document.querySelectorAll('.board-row-summary').length>=4"),'Timetable did not load');
    await pause(600);
    await command('Page.removeScriptToEvaluateOnNewDocument',{identifier:themeScript.identifier});
    assert.equal(await evaluate('document.documentElement.dataset.theme'),theme,'Actual theme differs from screenshot label');
    for(const state of width<1024?['half','expanded']:['desktop']) {
      if(state==='expanded')await click('.mobile-sheet-summary');
      await pause(300);
      const measure=await evaluate(`(() => {
        const panel=document.querySelector('.station-card'),body=panel.querySelector('.panel-body'),header=panel.querySelector('.station-sheet-header')??panel.querySelector('.panel-tools'),tabs=panel.querySelector('.station-section-tabs'),bar=panel.querySelector('.board-primary-bar');
        const r=e=>e.getBoundingClientRect();const rows=[...panel.querySelectorAll('.board-row-summary')];
        const rect=e=>({top:r(e).top,bottom:r(e).bottom,height:r(e).height});
        const contentTop=Math.max(r(body).top,r(tabs).bottom,r(bar).bottom);
        const visible=rows.filter(e=>r(e).top>=contentTop-1&&r(e).bottom<=Math.min(r(body).bottom,r(panel).bottom)+1);
        const search=document.querySelector('.topbar>.station-search'),ss=getComputedStyle(search),topbar=document.querySelector('.topbar');return {search:{...rect(search),left:r(search).left,right:r(search).right,position:ss.position,computedTop:ss.top,transform:ss.transform,translate:ss.translate},topbar:{...rect(topbar),left:r(topbar).left,transform:getComputedStyle(topbar).transform,translate:getComputedStyle(topbar).translate},actualTheme:document.documentElement.dataset.theme,panel:rect(panel),body:rect(body),header:rect(header),tabs:rect(tabs),toolbar:rect(bar),firstRow:rect(rows[0]),rowHeights:rows.slice(0,6).map(e=>r(e).height),visibleRows:visible.length,chrome:r(rows[0]).top-r(panel).top,navHeight:r(document.querySelector('.mobile-navigation')).height,overlap:r(rows[0]).top<r(tabs).bottom-1,overflow:document.documentElement.scrollWidth>innerWidth+1||body.scrollWidth>body.clientWidth+1||panel.scrollWidth>panel.clientWidth+1,glass:getComputedStyle(panel).backdropFilter};
      })()`);
      const name=`${width}-${theme}-${state}`;
      await screenshot(name);results.push({name,width,height,theme,state,...measure});
      console.log(name,JSON.stringify({chrome:measure.chrome,visibleRows:measure.visibleRows,rowHeights:measure.rowHeights,overlap:measure.overlap}));
      if(!baseline){if(width<1024){assert.ok(measure.search.bottom<=measure.topbar.bottom+1,name+' station search stays inside header');assert.ok(measure.search.left>=60&&measure.search.right<=width-60,name+' station switcher controls');}if(width<1024)assert.match(measure.glass,/blur\((30|40)px\)/,name+' canonical glass');assert.equal(measure.overlap,false,name);assert.equal(measure.overflow,false,name);if(width===390){assert.ok(measure.chrome<=130,name+' chrome');if(state==='half')assert.ok(measure.visibleRows>=4,name+' visible rows');}}
      if(width<1024) {
        await evaluate("document.querySelector('.station-card .panel-body').scrollTop=180");await pause(250);
        const occlusion=await evaluate(`(() => {const tabs=document.querySelector('.station-section-tabs'),r=tabs.getBoundingClientRect();const h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {tabsHit:tabs.contains(h),position:getComputedStyle(tabs).position};})()`);
        await screenshot(name+'-scrolled');
        if(!baseline){assert.ok(occlusion.tabsHit,name+' scrolled header occlusion');assert.equal(await evaluate("document.querySelector('.station-card .panel-body').contains(document.querySelector('.station-section-tabs'))"),false,'Tabs must never share the content scroll plane');}
        await evaluate("document.querySelector('.station-card .panel-body').scrollTop=0");
      }
      if(!baseline&&width===390&&state==='half') {
        await click('.board-filter-toggle');await pause(350);
        await screenshot(`${width}-${theme}-half-filters`);
        const bounds=await evaluate(`(() => {const p=document.querySelector('.board-filter-panel').getBoundingClientRect(),b=document.querySelector('.station-card .panel-body').getBoundingClientRect();return {bottom:p.bottom,limit:b.bottom};})()`);
        assert.ok(bounds.bottom<=bounds.limit+1,'Filter popover must fit the half sheet');
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.board-table')).visibility"),'hidden','Filter surface must have only one readable text plane');
        await click('.board-filter-close');
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.board-table')).visibility"),'visible','Closing filters restores departures');
      }
    }
    if(!baseline&&width===390) {
      await click('.board-filter-toggle');assert.equal(await evaluate("Boolean(document.querySelector('.board-filter-panel'))"),true);
      await pause(350);await screenshot(`${width}-${theme}-filters`);
      await click('.board-filter-close');
      await click('.board-mode-tabs button:last-child');
      await pause(500);assert.equal(await evaluate("document.querySelector('.board-mode-tabs button:last-child').getAttribute('aria-selected')"),'true');
      await click('.station-section-tabs button:last-child');
      assert.equal(await evaluate("Boolean(document.querySelector('#station-panel-stats'))"),true);
      await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36});
      await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home',windowsVirtualKeyCode:36});
      assert.equal(await evaluate("document.querySelector('.station-section-tabs button:first-child').getAttribute('aria-selected')"),'true','Keyboard subnavigation');
    }
  }
  if(!baseline)for(const width of [320,390]) {
    await command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    await command('Page.navigate',{url:new URL('/?station=berlin',base).href});
    for(let i=0;i<100;i++){if(await evaluate("document.querySelectorAll('.board-row-summary').length>=4"))break;await pause(100);}
    await click('.topbar>.station-search input');
    assert.equal(await evaluate("Array.from(document.querySelectorAll('.topbar>.brand,.topbar>.header-actions,.location-tools')).every(element=>getComputedStyle(element).visibility==='hidden')"),true,'Focused search must not expose underlying controls');
    await command('Input.insertText',{text:'Halle (Saale) Hauptbahnhof – Zugang über den Bahnhofsvorplatz'});
    for(let i=0;i<100;i++){if(await evaluate(`Boolean(document.querySelector('.search-suggestions [title="Halle (Saale) Hauptbahnhof – Zugang über den Bahnhofsvorplatz"]'))`))break;await pause(100);}
    await screenshot(`${width}-station-switcher`);
    await click('.search-suggestions button[role="option"]:has([title="Halle (Saale) Hauptbahnhof – Zugang über den Bahnhofsvorplatz"])');
    await pause(800);
    assert.equal(await evaluate("document.activeElement===document.querySelector('.topbar>.station-search input')"),false,'Selection must release the mobile keyboard');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.topbar>.brand')).visibility"),'visible','Compact header must return after selection');
    assert.equal(await evaluate(`(() => {const search=document.querySelector('.topbar>.station-search'),r=search.getBoundingClientRect();return r.left>=60&&r.right<=innerWidth-60&&Array.from(search.querySelectorAll(':scope>button')).every(button=>getComputedStyle(button).display==='none');})()`),true,'Selected station must restore compact switcher bounds');
    assert.equal(await evaluate("document.querySelector('.station-sheet-header .mobile-sheet-summary b').textContent"),'Halle (Saale) Hbf');
    assert.equal(await evaluate("document.querySelector('.station-sheet-header .mobile-sheet-summary b').title"),'Halle (Saale) Hauptbahnhof – Zugang über den Bahnhofsvorplatz');
    await screenshot(`${width}-long-station-name`);
  }
  await writeFile(join(output,'report.json'),JSON.stringify({checkedAt:new Date().toISOString(),fixture:true,baseline,results},null,2));
}finally{for(const p of pending.values()){clearTimeout(p.timer);p.rejectCommand(Error('Browser closing'));}pending.clear();socket?.close();browser.kill();}
