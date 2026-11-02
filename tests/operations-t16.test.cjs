'use strict';
const assert=require('node:assert/strict');
const M=require('../src/physics/operations-t16.js');
const sample={id:'rover-packet-1',type:'ROVER_COMMAND',sourceId:'starfall-ship',destId:'probe-1',
 bodyId:'star-0-p0',systemId:'star-0',createdS:120,lastS:128,state:'WAITING_FOR_ROUTE',reason:'Dish no solar 48V',
 sendBytes:0,encodedBytes:512,route:[],ack:'PENDING',ackAtS:null,lastLink:null,ref:{missionId:'exp-1'}};
assert.equal(M.packetState(null).stage,'READY');
assert.equal(M.packetState(sample).stage,'IN_PROGRESS');
assert(/48V/.test(M.packetState(sample).reason));
assert.equal(M.packetState(sample).quality,null,'do not invent radio quality');
const sent={...sample,state:'TRANSMITTING',route:['probe-1','relay-1','starfall-ship'],
 sendBytes:220,lastLink:{delayS:13.5,quality:.31,bandwidthBps:1800}};
assert.equal(M.packetState(sent).route,'probe-1 → relay-1 → starfall-ship');
assert.equal(M.packetState(sent).delayS,13.5);
assert.equal(M.packetState(sent).quality,.31);
assert.equal(M.packetState({...sent,state:'ACKED',ackAtS:150}).stage,'COMPLETE');
assert.equal(M.packetState({...sent,state:'EXPIRED',reason:'Past TTL'}).stage,'FAILED');
const photo={id:'photo-1',sourceAssetId:'probe-1',sourceType:'rover',timeS:122,
 status:'stored-local',bytes:34800,progressBytes:0,receivedAtS:null};
assert.equal(M.photoState(photo).stage,'IN_PROGRESS');
assert(/onboard/i.test(M.photoState(photo).reason));
const transit={...photo,status:'in-transit',progressBytes:34800};
assert.equal(M.photoState(transit).stage,'IN_PROGRESS');
assert(!M.photoState(transit).label.includes('RECEIVED'),'all bytes sent is not an ACK');
assert.equal(M.photoState({...transit,status:'downlinked',receivedAtS:null}).stage,'IN_PROGRESS',
 'malformed older downlinked marker is not trusted as receipt');
assert.equal(M.photoState({...transit,status:'downlinked',receivedAtS:150}).stage,'COMPLETE');
assert.equal(M.photoState(null,{id:'photo-job-5',assetId:'probe-1',createdS:115,deliveredS:null}).stage,'IN_PROGRESS');
assert.equal(M.photoState(null,{id:'photo-job-5',assetId:'probe-1',createdS:115,renderState:'AWAITING_RENDER',renderReason:'world renderer unavailable'}).reason,'world renderer unavailable');
const unpowered=M.status({id:'probe-1',kind:'remote-rover',bodyId:'star-0-p0',systemId:'star-0',
 energyJ:0,capacityJ:22e6,powered:false,localTimeS:220,remoteTimeS:130,
 packet:sample,photo,storageUsed:24,storageMax:24,mode:'parked',
 limits:'Finite electronics, no physical teleport'});
assert.equal(unpowered.stage,'IN_PROGRESS');
assert.equal(unpowered.remoteLagS,90);
assert.equal(unpowered.energyJ,0);
assert(unpowered.warnings.some(x=>/Battery/.test(x)));
assert(unpowered.warnings.some(x=>/storage full/.test(x)));
assert(unpowered.warnings.some(x=>/route/.test(x)));
assert(unpowered.recommendations.some(x=>/source/i.test(x)||/power/i.test(x)));
const repaired=M.status({id:'probe-1',kind:'remote-rover',bodyId:'star-0-p0',systemId:'star-0',
 energyJ:1e7,capacityJ:22e6,powered:true,localTimeS:230,remoteTimeS:220,
 packet:{...sent,state:'ACKED',ackAtS:229},photo:{...photo,status:'downlinked',receivedAtS:230},
 mode:'parked',storageUsed:0,storageMax:24});
assert.equal(repaired.stage,'COMPLETE');
assert.equal(repaired.statusText,'POWERED');
assert.equal(repaired.warnings.length,0);
const unknown=M.status({id:'starfall-ship',kind:'ship',powered:null,energyJ:null,localTimeS:10});
assert.equal(unknown.statusText,'POWER UNCONFIRMED');
assert.equal(unknown.energyJ,null);
assert.equal(unknown.remoteTimeS,null);
assert.equal(unknown.remoteLagS,null);
assert.equal(unknown.packet.stage,'READY');
assert.throws(()=>M.status({id:'',kind:'ship'}),/identity/);
const failed=M.status({id:'starfall-rover',kind:'rover',fault:'Actual bus undervoltage',powered:false,mode:'FAULT'});
assert.equal(failed.stage,'FAILED');
assert(failed.recommendations.some(x=>/Inspect/.test(x)));
const log=M.events({packets:[sample,sent],photos:[photo,{...photo,id:'photo-2',status:'downlinked',receivedAtS:250}],
 jobs:[{id:'job-1',assetId:'probe-1',createdS:180,renderState:'AWAITING_RENDER'}],
 services:[{id:'service-1',action:'CONFIG_APPLIED',assetId:'starfall-rover',timeS:200,source:{type:'7E'}}],
 missions:[{id:'mission-1',type:'SUBMITTED',assetId:'probe-1',timeS:210}],
 labReceipts:[{id:'receipt-1',labId:'lab-1',observationId:'obs1',timeS:240}]});
assert(log.length>=7);
assert(log.every(x=>Number.isFinite(x.timeS)&&x.assetId));
assert(log.every((x,i)=>i===0||log[i-1].timeS>=x.timeS));
assert(M.filterEvents(log,{assetId:'starfall-rover'}).some(x=>x.id==='service-1'));
assert(M.filterEvents(log,{severity:'warning'}).some(x=>x.id==='photo:photo-1'));
assert(M.filterEvents(log,{missionId:'exp-1'}).length===2);
const frozen=JSON.stringify(sample),srcPhotos=JSON.stringify(photo);
M.events({packets:[sample],photos:[photo],limit:1});
assert.equal(JSON.stringify(sample),frozen);
assert.equal(JSON.stringify(photo),srcPhotos,'T16 readouts must not mutate canonical stores');
assert.equal(M.time(null),'NOT RECORDED');
assert.equal(M.time(0),'T+0.0 s');
console.log('PASS T16: exact four action phases, no ACK/imagery invention, native packet bytes/LOS/lag/custody, power/storage warnings, event filter without second store, no source mutation');