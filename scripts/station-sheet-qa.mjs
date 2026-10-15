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
const sizes = args.includes('--landscape') ? [[667,375],[844,390]] : args.includes('--mobile') ? [[320,568],[360,640],[390,844],[430,932],[667,375],[844,390],[768,1024]] : args.includes('--probe-desktop') ? [[1440,900]] : args.includes('--probe') ? [[390,844]] : [[320,700],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1366,768],[1440,900],[1920,1080]];
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
let incidentFixtureMode=false;
function incidentTimetable(requestUrl){
  const kind=new URL(requestUrl).searchParams.get('kind');
  const when=new Date(Date.now()+35*60_000).toISOString();
  const scheduled=new Date(Date.now()+30*60_000).toISOString();
  const place=kind==='arrival'?{arrival:when,scheduledArrival:scheduled}:{departure:when,scheduledDeparture:scheduled};
  return {source:'Incident QA fixture',updatedAt:new Date().toISOString(),warnings:[],stopTimes:kind==='arrival'
    ? [{tripId:'qa-inc-s7',displayName:'S7',place:{...place,alerts:[{headerText:'Signalstörung an der Stadtbahn',descriptionText:'Züge fahren mit Verspätung.',effect:'SIGNIFICANT_DELAYS'}]}}]
    : [{tripId:'qa-inc-re1',displayName:'RE1',place:{...place,alerts:[{headerText:'Bauarbeiten zwischen Berlin und Potsdam',descriptionText:'Ersatzverkehr im betroffenen Abschnitt.',effect:'MODIFIED_SERVICE'}]}},
       {tripId:'qa-inc-ice',displayName:'ICE 1205',place,tripCancelled:true},
       {tripId:'qa-info-only',displayName:'S1',place,alerts:[{header:'Fahrradmitnahme möglich'}]},
       {tripId:'qa-unaffected',displayName:'S9',place,alerts:[{header:'Keine aktuellen Störungen'}]}]};
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
      const payload=path.endsWith('/board')?(incidentFixtureMode?incidentTimetable(message.params.request.url):timetable()):path.endsWith('/stations/search')?{stations:[{id:'motis:de-halle',transitousId:'de-halle',name:'Halle (Saale) Hauptbahnhof – Zugang über den Bahnhofsvorplatz',lat:51.4782,lon:11.9872,country:'DE'}]}:
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
  if(args.includes('--stream'))await command('Page.addScriptToEvaluateOnNewDocument',{source:`
    const originalFetch=window.fetch;
    window.fetch=async (...args)=>{
      const response=await originalFetch(...args);
      const url=new URL(args[0] instanceof Request?args[0].url:String(args[0]),window.location.href);
      if(!url.pathname.endsWith('/board')||url.searchParams.get('stream')!=='1'||!response.ok)return response;
      const data=await response.json(),encoder=new TextEncoder();
      return new Response(new ReadableStream({start(controller){
        controller.enqueue(encoder.encode(JSON.stringify({type:'board',...data,verification:{status:'pending'}})+'\\n'));
        setTimeout(()=>{try{controller.enqueue(encoder.encode(JSON.stringify({type:'verification',source:data.source,warnings:[],verification:{status:'inconclusive'}})+'\\n'));controller.close();}catch{}},1800);
      }}),{headers:{'Content-Type':'application/x-ndjson'}});
    };
  `});
  const results=[];
  for(const [width,height] of sizes)for(const theme of ['light','dark']) {
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1024});
    await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:theme}]});
    const themeScript=await command('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('bahnconnections-theme',${JSON.stringify(theme)});localStorage.setItem('bahnconnections-font','normal');`});
    await command('Page.navigate',{url:new URL('/?station=berlin',base).href});
    await command('Page.bringToFront');
    for(let i=0;i<100;i++){if(await evaluate("document.querySelectorAll('.board-row-summary').length>=4"))break;await pause(150);}
    assert.ok(await evaluate("document.querySelectorAll('.board-row-summary').length>=4"),'Timetable did not load');
    if(args.includes('--stream')){
      assert.equal(await evaluate("Boolean(document.querySelector('.verification-pending'))"),true,'Rows must display while DB verification is pending');
      await click('.board-row-summary');
      for(let attempt=0;attempt<100;attempt++){
        if(await evaluate("Boolean(document.querySelector('.verification-inconclusive'))"))break;
        await pause(100);
      }
      assert.equal(await evaluate("Boolean(document.querySelector('.verification-inconclusive'))"),true,'Late verification must remain conservative');
      assert.equal(await evaluate("document.querySelector('.board-row-summary').getAttribute('aria-expanded')"),'true','Verification must preserve expanded row');
      await click('.board-row-summary');
    }
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

      if(!baseline && width < 480) {
        const rows=await evaluate(`(() => [...document.querySelectorAll('.station-card .board-row-summary')].slice(0,6).map(row => {
          const service=row.querySelector('.board-service');
          const number=service?.querySelector('b');
          const destination=row.querySelector('.board-destination');
          const r=e=>e?.getBoundingClientRect();
          return {train:number?.textContent,serviceRight:r(service)?.right,numberRight:r(number)?.right,destinationLeft:r(destination)?.left,
            serviceOverflow:service?.scrollWidth-(service?.clientWidth??0),
            destinationOverflow:destination?.scrollWidth-(destination?.clientWidth??0)};
        }))()`);
        for(const row of rows) {
          assert.ok(row.serviceRight <= row.destinationLeft-3,
            `${width}-${theme}-${state} number and destination must never overlap: ${JSON.stringify(row)}`);
          assert.ok(row.serviceOverflow <= 1,
            `${width}-${theme}-${state} train number must remain inside its grid column: ${JSON.stringify(row)}`);
          assert.ok(row.destinationOverflow <= 1,
            `${width}-${theme}-${state} destination must not overflow its column: ${JSON.stringify(row)}`);
        }
      }
      const name=`${width}-${theme}-${state}`;
      if(!baseline&&width<1024){
        const targets=await evaluate(`(() => {
          const header=document.querySelector('.station-sheet-header'),bounds=header.getBoundingClientRect();
          return [...header.querySelectorAll('.mobile-sheet-actions button,.station-section-tabs button')].map(button=>{
            const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
            return {label:button.getAttribute('aria-label')||button.textContent,width:r.width,height:r.height,
              inside:r.left>=bounds.left-1&&r.right<=bounds.right+1&&r.top>=bounds.top-1&&r.bottom<=bounds.bottom+1,
              hit:hit===button||button.contains(hit),overflow:button.classList.contains('active')||button.getAttribute('role')==='tab'?button.scrollWidth-button.clientWidth:0};
          });
        })()`);
        assert.equal(targets.length,7,name+' must expose five tabs plus minimize and close');
        for(const target of targets){
          assert.ok(target.width>=43.9&&target.height>=43.9&&target.inside&&target.hit,
            name+' reachable 44px header target: '+JSON.stringify(target));
          assert.ok(target.overflow<=1,name+' navigation label must fit: '+JSON.stringify(target));
        }
      }
      if(!baseline&&height<521){
        assert.ok(measure.visibleRows>=1,name+' must initially expose a complete timetable row');
        assert.equal(await evaluate(`Array.from(document.querySelectorAll('.board-primary-bar button')).every(button=>{const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.height>=44&&r.width>=44&&(hit===button||button.contains(hit));})`),true,name+' all timetable controls must remain reachable');
      }
      await screenshot(name);results.push({name,width,height,theme,state,...measure});
      console.log(name,JSON.stringify({chrome:measure.chrome,visibleRows:measure.visibleRows,rowHeights:measure.rowHeights,overlap:measure.overlap}));
      if(!baseline){if(width<1024){assert.ok(measure.search.bottom<=measure.topbar.bottom+1,name+' station search stays inside header');assert.ok(measure.search.left>=60&&measure.search.right<=width-60,name+' station switcher controls: '+JSON.stringify(measure.search));}if(width<1024)assert.match(measure.glass,/blur\((30|40)px\)/,name+' canonical glass');assert.equal(measure.overlap,false,name);assert.equal(measure.overflow,false,name);if(width===390){assert.ok(measure.chrome<=205,name+' header and quick-filter controls');if(state==='half')assert.ok(measure.visibleRows>=3,name+' visible rows under the redesigned V58 controls');}}
      if(!baseline && width===390 && state==='expanded' && theme==='light') {
        await click('.mobile-sheet-actions button:first-child');
        await pause(280);
        const collapsed=await evaluate(`(() => {const p=document.querySelector('.station-card').getBoundingClientRect();const h=document.querySelector('.station-sheet-header').getBoundingClientRect();return {height:p.height,header:h.height,content:getComputedStyle(document.querySelector('.station-card .panel-body')).display,state:document.querySelector('.app-shell').dataset.mobileSheet};})()`);
        assert.equal(collapsed.state,'collapsed','Station drawer close/collapse action must update state');
        assert.ok(collapsed.height<=68 && collapsed.header<=68,'Collapsed drawer must not display the blank 100px sheet: '+JSON.stringify(collapsed));
        assert.equal(collapsed.content,'none','Collapsed drawer must keep timetable content hidden');
        await screenshot('390-light-station-collapsed-compact');
        await click('.mobile-sheet-actions button:first-child');
        await pause(260);
        // V60: the timetable owns the initial viewport. All confirmed station
        // trips remain reachable in one tap without displacing departure rows.
        await click('#station-tab-trips');
        assert.equal(await evaluate("document.querySelector('#station-tab-trips').getAttribute('aria-selected')"),'true');
        assert.ok(await evaluate("Boolean(document.querySelector('#station-panel-trips .station-radar-trip-toggle'))"),'Train list tab must be reachable');
        await click('.station-radar-trip-toggle');
        for(let attempt=0;attempt<100;attempt++){
          if(await evaluate("document.querySelectorAll('#station-panel-trips .station-radar-trip-rows > li').length>0"))break;
          await pause(100);
        }
        assert.ok(await evaluate("document.querySelectorAll('#station-panel-trips .station-radar-trip-rows > li').length>0"),
          'Train list must show confirmed provider calls: '+await evaluate("document.querySelector('#station-panel-trips')?.innerText"));
        await screenshot('390-light-station-trips-tab');
        await click('#station-tab-live');
        assert.equal(await evaluate("document.querySelector('#station-tab-live').getAttribute('aria-selected')"),'true');
      }
      if(width<1024) {
        await evaluate("document.querySelector('.station-card .panel-body').scrollTop=180");await pause(250);
        const occlusion=await evaluate(`(() => {const tabs=document.querySelector('.station-section-tabs'),r=tabs.getBoundingClientRect();const h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {tabsHit:tabs.contains(h),position:getComputedStyle(tabs).position};})()`);
        await screenshot(name+'-scrolled');
        if(!baseline){assert.ok(occlusion.tabsHit,name+' scrolled header occlusion');assert.equal(await evaluate("document.querySelector('.station-card .panel-body').contains(document.querySelector('.station-section-tabs'))"),false,'Tabs must never share the content scroll plane');}
        await evaluate("document.querySelector('.station-card .panel-body').scrollTop=0");
      }
      if(!baseline&&width===390&&state==='half') {
        // V58: preset selection is an actual React action, not only a visual pill.
        assert.equal(await evaluate("document.querySelectorAll('.board-quick-views button').length"),4,'All four quick views must be rendered');
        await click('.board-quick-views button[data-quick-view="upcoming"]');
        assert.equal(await evaluate("document.querySelector('.board-quick-views button[data-quick-view=upcoming]').getAttribute('aria-pressed')"),'true','Upcoming view must select the 60-minute window');
        await click('.board-quick-views button[data-quick-view="canceled"]');
        assert.equal(await evaluate("document.querySelector('.board-quick-views button[data-quick-view=canceled]').getAttribute('aria-pressed')"),'true','Cancellation view must activate');
        await click('.board-quick-views button[data-quick-view="all"]');
        assert.equal(await evaluate("document.querySelector('.board-quick-views button[data-quick-view=all]').getAttribute('aria-pressed')"),'true','All view must restore the default state');
        await screenshot('390-railglass-quick-views');
        await click('.board-filter-toggle');await pause(350);
        await screenshot(`${width}-${theme}-half-filters`);
        const filterPosition=await evaluate(`(() => {
          const filter=document.querySelector('.board-filter-panel'),body=document.querySelector('.station-card .panel-body'),toolbar=document.querySelector('.board-primary-bar');
          const style=getComputedStyle(filter),b=filter.getBoundingClientRect(),t=toolbar.getBoundingClientRect();
          return {position:style.position,overflow:style.overflowY,startsBelowToolbar:b.top>=t.bottom-1,
            inBody:body.contains(filter),bodyScroll:getComputedStyle(body).overflowY};
        })()`);
        assert.ok(filterPosition.inBody&&filterPosition.startsBelowToolbar&&filterPosition.position!=='absolute'&&
          filterPosition.overflow==='visible'&&filterPosition.bodyScroll==='auto',
          'Filter must remain in the station pane single scroller: '+JSON.stringify(filterPosition));
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
    if(!baseline&&!args.includes('--stream')){
      // A real Chromium interaction trace, with both arrival and departure fixtures.
      incidentFixtureMode=true;
      await click('#station-tab-disruptions');
      await command('Page.bringToFront');
      for(let attempt=0;attempt<70;attempt++){
        if(await evaluate("document.querySelectorAll('.incident-card').length===3"))break;
        await pause(100);
      }
      assert.equal(await evaluate("document.querySelectorAll('.incident-card').length"),3,'Arrival and departure notices must render');
      assert.equal(await evaluate("Array.from(document.querySelectorAll('.incident-card')).some(e=>/Fahrradmitnahme|Keine aktuellen Störungen/.test(e.textContent))"),false,'Unaffected lines must not enter the disruption tab');
      assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('.incidents-watch-lines .incident-line-badge')).map(e=>e.textContent).sort()"),['ICE 1205','RE1','S7'],'Only affected lines are immediately visible');
      await evaluate("document.querySelector('.station-card .panel-body').scrollTop=0");
      await screenshot(`${width}-${theme}-incidents`);
      if(width===390&&theme==='light'){
        // Bookmarked rail lines are a real mobile interaction, not a decorative chip.
        await evaluate("document.querySelector('.incidents-watch-lines button:last-child').scrollIntoView({block:'center'})");
        await click('.incidents-watch-lines button:last-child');
        assert.equal(await evaluate("document.querySelector('.incidents-watch-lines button:last-child').getAttribute('aria-pressed')"),'true','Line watch must respond to touch');
        await evaluate("document.querySelector('.incidents-watch-selected button').scrollIntoView({block:'center'})");
        await click('.incidents-watch-selected button');
        assert.equal(await evaluate("document.querySelectorAll('.incident-card').length"),1,'Watched-line filter must narrow the results');
        await click('.incidents-watch-selected button');
        assert.equal(await evaluate("document.querySelectorAll('.incident-card').length"),3,'Resetting watch-only view must recover all reports');
        await screenshot('390-light-incidents-bookmarks');
      }

      if(width===390&&theme==='light'){
        // A frozen, anonymous DOM capture for design comparison. Keep real rendered
        // markup/styles; remove scripts so the visual tool cannot start live polling.
        const html=await evaluate("(() => {const copy=document.documentElement.cloneNode(true);copy.querySelectorAll('script,link[rel=stylesheet],style').forEach(node=>node.remove());const style=document.createElement('style');style.textContent=[...document.styleSheets].flatMap(sheet=>{try{return [...sheet.cssRules].map(rule=>rule.cssText);}catch{return [];}}).join('\\n');copy.querySelector('head').append(style);return copy.outerHTML;})()");
        await writeFile(join(output,'incidents-rendered.html'),'<!doctype html>'+html.replace('<head>',`<head><base href="${new URL('/',base).href}">`));
      }
      await evaluate("document.querySelector('.incident-disclosure summary').scrollIntoView({block:'center'})");
      await click('.incident-disclosure summary');
      assert.equal(await evaluate("document.querySelector('.incident-disclosure').open"),true,'Opening a notice reveals its details');
      const noticeLayout=await evaluate(`(() => {
        const root=document.querySelector('.station-incidents');
        return {overflow:root.scrollWidth>root.clientWidth+1,collisions:[...root.querySelectorAll('.incident-disclosure summary')].some(row=>{
          const [lines,copy,chevron]=[...row.children].map(e=>e.getBoundingClientRect());
          return lines.right>copy.left+1||copy.right>chevron.left+1;
        })};
      })()`);
      assert.equal(noticeLayout.overflow||noticeLayout.collisions,false,'Notice columns must never overlap or overflow: '+JSON.stringify(noticeLayout));
      await screenshot(`${width}-${theme}-incidents-expanded`);
      await click('.incident-disclosure summary');
      assert.equal(await evaluate("document.querySelector('.incident-disclosure').open"),false,'Closing a notice restores the compact row');
      await evaluate("document.querySelector('.incidents-filters').scrollIntoView({block:'center'})");
      await click('.incidents-filters button:nth-child(2)');
      assert.equal(await evaluate("document.querySelectorAll('.incident-card').length"),1,'Construction category should filter notice cards');
      await click('.incidents-filters button:first-child');
      await evaluate("document.querySelector('.incidents-search input').scrollIntoView({block:'center'})");
      await click('.incidents-search input');
      await command('Input.insertText',{text:'S7'});
      await pause(150);
      assert.equal(await evaluate("document.querySelectorAll('.incident-card').length"),1,'Line search should find arrival notices');
      assert.match(await evaluate("document.querySelector('.incident-card h3').textContent"),/Signalstörung/);
      await screenshot(`${width}-${theme}-incidents-search`);
      if(width===390&&theme==='light'){
        // Check composability on a real controlled React select (category + search + line).
        assert.deepEqual(await evaluate("Array.from(document.querySelector('.incidents-tools select').options).map(o=>o.value)"),['all','ICE 1205','RE1','S7']);
        await evaluate("(() => {const e=document.querySelector('.incidents-tools select');e.value='RE1';e.dispatchEvent(new Event('change',{bubbles:true}));})()");
        await pause(150);
        assert.equal(await evaluate("document.querySelectorAll('.incident-card').length"),0,'Line focus must combine with S7 search without showing unrelated notices');
        await evaluate("(() => {const e=document.querySelector('.incidents-tools select');e.value='all';e.dispatchEvent(new Event('change',{bubbles:true}));})()");
        await pause(150);
        assert.equal(await evaluate("document.querySelectorAll('.incident-card').length"),1,'Clearing line focus must restore search results');
        await screenshot('390-light-incidents-line-focus');
      }

      incidentFixtureMode=false;
      await click('#station-tab-live');
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
  if(!baseline){
    await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'},{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.station-card')).backdropFilter"),'none','Reduced transparency removes glass blur');
    await screenshot('320-reduced-transparency');
  }
  await writeFile(join(output,'report.json'),JSON.stringify({checkedAt:new Date().toISOString(),fixture:true,baseline,results},null,2));
}finally{for(const p of pending.values()){clearTimeout(p.timer);p.rejectCommand(Error('Browser closing'));}pending.clear();socket?.close();browser.kill();}
