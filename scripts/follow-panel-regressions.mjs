import assert from 'node:assert/strict';

// Provider I/O is replaced; navigation, tracking and panel state remain real.
export function panelJourneyFixture() {
  const startTime=new Date(Date.now()+600_000).toISOString(),endTime=new Date(Date.now()+15_000_000).toISOString();
  const from={id:'berlin',name:'Berlin Hbf',lat:52.5251,lon:13.3694,departure:startTime,scheduledDeparture:startTime};
  const to={id:'muenchen',name:'München Hbf',lat:48.1402,lon:11.5586,arrival:endTime,scheduledArrival:endTime};
  const leg={mode:'HIGHSPEED_RAIL',category:'fern',name:'ICE 1509',tripId:'panel-journey',from,to,stops:[from,to],points:[[from.lat,from.lon],[to.lat,to.lon]],startTime,endTime,scheduledStartTime:startTime,scheduledEndTime:endTime,durationSeconds:14_400,realtime:false,cancelled:false,alerts:[]};
  return {journeys:[{id:'panel-journey',durationSeconds:14_400,transfers:0,startTime,endTime,scheduledStartTime:startTime,scheduledEndTime:endTime,legs:[leg],transitLegs:[leg],source:'transitous',sourceLabel:'UI-QA-Fixture',updatedAt:new Date().toISOString(),realtimeStatus:'schedule',warnings:[],realtime:false,cancelled:false}]};
}

export async function followPanelRegressions({command,evaluate,click,screenshot,pause,openFixtureRadar,changeRadarResponse}) {
  const checks=[],failures=[];
  async function visibleClick(selector) {
    await evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'center',behavior:'instant'})`);
    await pause(100);await click(selector);
  }
  async function waitFor(expression) {
    for(let i=0;i<100;i++){if(await evaluate(expression))return;await pause(100);}
    assert.fail('UI transition did not complete: '+expression);
  }
  await visibleClick('.train-inspector .track-button');
  await waitFor("Boolean(document.querySelector('.v62-follow-hud'))");
  for(const [width,height] of [[320,568],[390,844],[430,932],[844,390],[1440,900]]) {
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1024});
    await pause(500);
    const layout=await evaluate(`(() => {
      const hud=document.querySelector('.v62-follow-hud'),panel=document.querySelector('.train-inspector');
      const h=hud.getBoundingClientRect(),p=(panel.contains(hud)?panel.querySelector('.train-route-header'):panel).getBoundingClientRect();
      const overlap=Math.max(0,Math.min(h.right,p.right)-Math.max(h.left,p.left))*Math.max(0,Math.min(h.bottom,p.bottom)-Math.max(h.top,p.top));
      return {overlap,copies:document.querySelectorAll('.v62-follow-hud').length,overflow:document.documentElement.scrollWidth>innerWidth+1||hud.scrollWidth>hud.clientWidth+1};
    })()`);
    checks.push({case:'follow-hud',width,height,...layout});
    if(layout.overlap>1||layout.copies!==1||layout.overflow)failures.push(`Follow HUD ${width}×${height}: ${JSON.stringify(layout)}`);
    try {
      await visibleClick('.v62-follow-details-toggle');
      assert.equal(await evaluate("document.querySelector('.v62-follow-details-toggle').getAttribute('aria-expanded')"),'true','Follow details must actually expand');
      assert.ok(await evaluate("Boolean(document.querySelector('.v62-follow-expanded time'))"),'Expanded follow details expose times');
      await visibleClick('.v62-follow-details-toggle');
      assert.equal(await evaluate("Boolean(document.querySelector('.v62-follow-expanded'))"),false,'Follow details must actually collapse');
    } catch(error) {failures.push(`Follow controls ${width}×${height}: ${error.message}`);}
    await screenshot(`${width}-${height}-follow-regression`);
  }
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await pause(500);await visibleClick('.v62-follow-stop');
  assert.equal(await evaluate("Boolean(document.querySelector('.v62-follow-hud'))"),false,'Beenden releases the follow HUD');
  assert.equal(await evaluate("document.querySelector('.train-inspector .track-button').getAttribute('aria-pressed')"),'false','Beenden releases active tracking');
  // Follow -> stop -> saved commuter search reproduced the production bug.
  await click('.mobile-navigation button:nth-of-type(2)');
  await waitFor("Boolean(document.querySelector('.planner-panel'))");
  if(await evaluate("!document.querySelector('.planner-saved-routes').open"))await visibleClick('.planner-saved-routes>summary');
  await visibleClick('.planner-saved-routes>.settings-link');
  await visibleClick('.planner-panel .saved-route-now');
  await waitFor("Boolean(document.querySelector('.journey-card'))");
  const handoff=await evaluate(`(() => {
    const card=document.querySelector('.journey-card');const r=card.getBoundingClientRect();
    const hit=document.elementFromPoint(r.x+r.width/2,r.y+Math.min(r.height/2,100));
    return {oldInspector:!!document.querySelector('.train-inspector'),oldHud:!!document.querySelector('.v62-follow-hud'),journeyVisible:!!hit&&card.contains(hit),text:card.textContent.includes('ICE 1509')};
  })()`);
  checks.push({case:'saved-route-handoff',width:390,...handoff});
  if(handoff.oldInspector||handoff.oldHud||!handoff.journeyVisible||!handoff.text)failures.push('Saved route handoff: '+JSON.stringify(handoff));
  await screenshot('390-journey-handoff-regression');
  // Desktop regular search must also release an actively followed radar train.
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  // Keep the existing connection view: a reload would hide navigation bugs.
  if(await evaluate("!document.querySelector('.live-train-wrap')")){
    await evaluate("document.querySelector('.live-cluster-wrap').focus()");
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
    await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await waitFor("Boolean(document.querySelector('.live-train-wrap'))");
  }
  const desktopTripId=await evaluate("document.querySelector('.live-train-wrap').getAttribute('data-trip-id')");
  await evaluate("document.querySelector('.live-train-wrap').focus()");
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await pause(400);
  const fromJourney=await evaluate("({inspector:!!document.querySelector('.train-inspector'),planner:!!document.querySelector('.planner-panel'),journey:!!document.querySelector('.journey-card')})");
  checks.push({case:'desktop-journey-to-train',...fromJourney});
  await screenshot('1440-journey-to-train-regression');
  assert.equal(fromJourney.inspector&&!fromJourney.planner&&!fromJourney.journey,true,'Selecting a radar train from a PC connection must show its inspector, not the planner');
  await click('.desktop-navigation button:first-child');
  await waitFor("Boolean(document.querySelector('.planner-panel'))");
  await evaluate(`document.querySelector('.live-train-wrap[data-trip-id="${desktopTripId}"]').focus()`);
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await pause(400);
  const fromPlanner=await evaluate("({inspector:!!document.querySelector('.train-inspector'),planner:!!document.querySelector('.planner-panel')})");
  checks.push({case:'desktop-planner-to-train',...fromPlanner});
  assert.equal(fromPlanner.inspector&&!fromPlanner.planner,true,'Selecting a radar train while the PC planner is open must show train details');
  await waitFor("Boolean(document.querySelector('.train-inspector'))");
  await visibleClick('.train-inspector .track-button');
  await click('.desktop-navigation button:first-child');
  await waitFor("Boolean(document.querySelector('.planner-panel'))");
  await visibleClick('.plan-button');
  await waitFor("Boolean(document.querySelector('.journey-card'))");
  const desktop=await evaluate(`(() => {
    const card=document.querySelector('.journey-card'),r=card.getBoundingClientRect();
    const hit=document.elementFromPoint(r.x+r.width/2,r.y+Math.min(r.height/2,100));
    return {oldInspector:!!document.querySelector('.train-inspector'),oldHud:!!document.querySelector('.v62-follow-hud'),journeyVisible:!!hit&&card.contains(hit)};
  })()`);
  checks.push({case:'regular-search-handoff',width:1440,...desktop});
  if(desktop.oldInspector||desktop.oldHud||!desktop.journeyVisible)failures.push('Desktop search handoff: '+JSON.stringify(desktop));
  await screenshot('1440-journey-handoff-regression');
  // A station-centred scan may lose a selected train or fail entirely. Its
  // inspector stays open with paused evidence; it must not silently close.
  await openFixtureRadar();
  const selectedTripId=await evaluate("document.querySelector('.live-train-wrap').getAttribute('data-trip-id')");
  await evaluate("document.querySelector('.live-train-wrap').focus()");
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await waitFor("Boolean(document.querySelector('.train-inspector'))");
  await visibleClick('.train-inspector .track-button');
  for(const scenario of ['missing','error','full']){
    const consumed=changeRadarResponse(scenario,selectedTripId);
    // Exercise the real resume/refresh listener, without replacing app state.
    await evaluate("document.dispatchEvent(new Event('visibilitychange'))");
    await consumed();
    if(scenario!=='full')await waitFor(`!document.querySelector('.live-train-wrap[data-trip-id="${selectedTripId}"]')`);
    const state=await evaluate(`(() => {
      const panel=document.querySelector('.train-inspector');
      return {inspector:!!panel,hud:!!document.querySelector('.v62-follow-hud'),paused:!!panel?.textContent.includes('Verfolgung pausiert'),following:!!panel?.textContent.includes('Kamera folgt')};
    })()`);
    checks.push({case:'radar-refresh-'+scenario,width:1440,...state});
    if(!state.inspector||!state.hud||(scenario==='full'?!state.following:!state.paused))failures.push('Radar refresh '+scenario+': '+JSON.stringify(state));
    await screenshot('1440-radar-refresh-'+scenario);
    if(!state.inspector)break;
  }
  if(await evaluate("Boolean(document.querySelector('.train-inspector'))")){
    await click('.train-inspector .desktop-panel-actions button:last-child');
    assert.equal(await evaluate("Boolean(document.querySelector('.train-inspector,.v62-follow-hud'))"),false,'Closing releases the train and HUD');
    const consumed=changeRadarResponse('full');
    await click('.topbar>.station-search input');
    await click('.topbar .search-suggestions button:has(b[title="Berlin Hbf"])');await consumed();
    assert.equal(await evaluate("Boolean(document.querySelector('.train-inspector,.v62-follow-hud'))"),false,'A radar refresh must not resurrect an explicitly closed train');
  }
  console.log(JSON.stringify({panelRegressions:checks,failures}));
  assert.deepEqual(failures,[],'Follow HUD and journey handoff regressions');
  return checks;
}
