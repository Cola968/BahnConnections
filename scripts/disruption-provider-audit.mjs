import assert from 'node:assert/strict';
import {extractStationNotices} from '../app/station-disruptions-data.ts';
import {safeBoardAlertHeaders} from '../app/board-verification.ts';
import {supplementalNoticeRows} from '../app/supplemental-notices.ts';
import {transitAlertContent,transitAlerts} from '../app/transit-alerts.ts';

// MOTIS v6 OpenAPI: stop alerts live on Place and text fields are strings.
// Same shape observed in the public Waterloo response on 2026-10-13.
const alert={effect:'MODIFIED_SERVICE',headerText:'Special Service',descriptionText:'Trains may be cancelled or delayed by up to 45 minutes.'};
const row={displayName:'S1',place:{departure:'2026-10-13T19:00:00Z',alerts:[alert]}};
const notices=extractStationNotices([row]);
assert.equal(notices.length,1,'A real v6 place alert must appear in station disruptions');
assert.equal(notices[0].headline,'Special Service');
assert.equal(notices[0].detail,alert.descriptionText);
assert.deepEqual(safeBoardAlertHeaders([alert]),['Special Service'],'Plain-string provider warnings must appear on the board');
const old={headerText:{translation:[null,{text:123},{text:'Construction',language:'en'},{text:'Bauarbeiten',language:'de'}]},descriptionText:{translation:[{text:'Gleis gesperrt'}]}};
assert.equal(transitAlertContent(old).header,'Bauarbeiten');
assert.equal(extractStationNotices([{displayName:'S1',place:{alerts:[old]},alerts:[old]}]).length,1,'Deduplicate stop and trip warnings');
assert.deepEqual(transitAlerts([null,[],123,alert],{}),[alert]);
assert.deepEqual(safeBoardAlertHeaders([{headerText:{translation:'bad'}},null]),[]);
assert.equal(extractStationNotices([{place:{alerts:[{...alert,effect:'NO_EFFECT'}]}}]).length,0);
assert.equal(extractStationNotices([{place:{alerts:[{headerText:'Signalstörung; andere Linien haben keine Störungen',effect:'SIGNIFICANT_DELAYS'}]}}]).length,1,'An unaffected-line sentence must not suppress an incident');
const lift={type:'warning',summary:'Aufzug defekt',text:'Aufzug am Bahnhof außer Betrieb',products:{bus:true,tram:false}};
const provider=[
 {tripId:'a',line:{name:'M10',product:'tram'},remarks:[lift,{type:'hint',text:'BVG'}]},
 {tripId:'b',line:{name:'M5',product:'tram'},remarks:[lift]},
 {tripId:'c',line:{name:'S1',product:'suburban'},remarks:[{type:'warning',summary:'Bauarbeiten',text:'Ersatzverkehr',products:{suburban:true}}]},
 {tripId:'d',line:{name:'S2',product:'suburban'},cancelled:true,plannedWhen:'2026-10-13T19:00:00Z'},
 {tripId:'e',line:{name:'100',product:'bus'},cancelled:true},
 {tripId:'f',line:{name:'S3',product:'suburban'},remarks:[{type:'warning',summary:'Alte Störung',validUntil:'2025-01-01T00:00:00Z'}]},
];
const extra=extractStationNotices(supplementalNoticeRows(provider,'departure',Date.parse('2026-10-13T18:00:00Z')));
assert.equal(extra.length,3,'Keep station warning, construction and rail cancellation; omit hints, buses and expired warnings');
assert.deepEqual(extra.find(item=>item.headline==='Aufzug defekt').lines,[],'Do not mark all lines disrupted by a station lift warning');
assert.deepEqual(extra.find(item=>item.headline==='Bauarbeiten').lines,['S1']);
assert.deepEqual(supplementalNoticeRows(null,'arrival'),[]);
assert.equal(extractStationNotices([{displayName:'ICE 873',place:{alerts:[{headerText:'ICE 873: Fahrt fällt aus zwischen Hamburg-Altona und Hamburg Hbf.'}]}}])[0].kind,'cancellation','A partial route cancellation belongs under Ausfälle');
assert.equal(extractStationNotices([{displayName:'RE1',place:{alerts:[{headerText:'Bauarbeiten zwischen Berlin und Potsdam',descriptionText:'Ersatzverkehr im betroffenen Abschnitt'}]}}])[0].kind,'construction','Construction with bus replacement is not automatically a cancelled train.');
assert.equal(extractStationNotices([{displayName:'RE1',place:{alerts:[{headerText:'Fahrt fällt aus wegen Bauarbeiten',descriptionText:'Ersatzverkehr ist eingerichtet'}]}}])[0].kind,'cancellation','Explicitly cancelled services override a construction reason.');
console.log('Disruption provider format audit passed');
