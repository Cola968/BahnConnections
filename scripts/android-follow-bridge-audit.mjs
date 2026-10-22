import assert from 'node:assert/strict';
import {syncAndroidFollow} from '../app/android-follow-bridge.ts';
const original=globalThis.window;
const starts=[];let stops=0;
try{
 globalThis.window={BahnConnectionsAndroid:{protocolVersion:2,start:(...args)=>starts.push(args),stop:()=>stops++}};
 const trip={tripId:'id',name:'ICE 100',from:{name:'Berlin'},to:{name:'Hamburg'},departure:'2026-10-22T10:00:00Z',arrival:'2026-10-22T12:00:00Z',delay:11,realTime:true};
 const observed=new Date('2026-10-22T10:01:00Z');
 syncAndroidFollow(trip,observed,true);
 assert.deepEqual(starts[0],['id','ICE 100','Berlin','Hamburg',trip.departure,trip.arrival,11,true,observed.getTime()]);
 syncAndroidFollow(trip);
 assert.equal(starts[1][7],false,'A saved trip without current evidence must not imply a live feed');
 assert.equal(starts[1][8],0,'Do not fabricate a fresh timestamp');
 assert.equal(stops,0,'Refreshing metadata must not stop a followed train');
 syncAndroidFollow(null);assert.equal(stops,1,'Explicit Stop is forwarded');
 delete globalThis.window.BahnConnectionsAndroid.protocolVersion;
 syncAndroidFollow(trip,observed,true);
 assert.equal(starts.at(-1).length,6,'Legacy preview APK bridge must retain its six-argument dispatch');
 globalThis.window={};assert.doesNotThrow(()=>syncAndroidFollow(trip));
}finally{if(original===undefined)delete globalThis.window;else globalThis.window=original;}
console.log('Android bridge: exact metadata, no invented freshness, explicit Stop, browser fallback passed.');
