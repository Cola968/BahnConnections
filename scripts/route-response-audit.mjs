import assert from 'node:assert/strict';
import {readTripResponse,tripRevision} from '../app/trip-response.ts';
const revision=tripRevision('test');
const validity={status:'blocked',reason:'Betreiber meldet Umleitung',warnings:[],policyVersion:'test',checkedAt:new Date().toISOString(),validUntil:new Date().toISOString()};
await assert.rejects(readTripResponse(Response.json({trip:null,routeValidity:validity},{status:409}),'test',revision),/Umleitung/);
await assert.rejects(readTripResponse(Response.json({trip:{legs:[]}}),'test',revision),/Veraltete Antwort/,'A late success cannot resurrect a known blocked route');
assert.deepEqual(await readTripResponse(Response.json({trip:{legs:[]}}),'test',tripRevision('test')),{trip:{legs:[]}});
await assert.rejects(readTripResponse(Response.json({warnings:['Quelle offline']},{status:502}),'test',tripRevision('test')),/offline/);
console.log('Trip response: block vs network failure and late-response rejection passed.');
