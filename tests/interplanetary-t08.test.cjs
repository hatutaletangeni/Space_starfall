'use strict';
const assert=require('node:assert/strict');
const O=require('../src/physics/outposts.js'),A=require('../src/physics/antenna-hardware-t04.js'),
 T=require('../src/physics/interplanetary-t08.js'),Tx=require('../src/physics/mission-transport-t03.js');
globalThis.StarfallPhysics={SCENE_METERS_PER_UNIT:1000};
const Aplanet={id:'star0-A',systemId:'star0',radius:100,position:[0,0,0],spinAxis:[0,1,0],spinAngle:0};
const Bplanet={id:'star0-B',systemId:'star0',radius:100,position:[15000,0,0],spinAxis:[0,1,0],spinAngle:0};
const unit=x=>{const d=Math.hypot(...x);return x.map(n=>n/d)};
function ant(id,body,local){
 const item={id,kind:'antenna',bodyId:body.id,enabled:true,condition:1,local,radioT04:A.repair(null),height:10};
 return item;
}
const a=ant('station-A',Aplanet,[1,0,0]),b=ant('station-B',Bplanet,[-1,0,0]);
const mkPower=(i,load)=>({byId:{[i.id]:{power:true,servedW:load,voltageV:48,busId:'bus-'+i.id}}});
let pA=mkPower(a,1265),pB=mkPower(b,1265);
assert.equal(T.repair(null).mode,'OFF');
assert.equal(T.watts(a),0);
assert.throws(()=>T.configure(a,'HIGH_GAIN','',1),/real remote antenna/);
assert.throws(()=>T.configure(a,'HIGH_GAIN',a.id,1),/distinct/);
T.configure(a,'HIGH_GAIN',b.id,1);T.configure(b,'HIGH_GAIN',a.id,1);
assert.equal(T.watts(a),1100);
assert.equal(A.loadW(a,165),1265);
assert.equal(A.repair(a.radioT04).deepT08.peerId,b.id);
assert.equal(T.inspected(a,pA).powered,true);
assert.equal(T.inspected(b,pB).powered,true);
const an=T.station(a,Aplanet,pA,O.rotate),bn=T.station(b,Bplanet,pB,O.rotate);
const rf=T.deepLink(an,bn,[Aplanet,Bplanet],1000);
assert(rf.connected,rf.reason);assert(rf.delayS>0&&rf.distanceM>1e7);
assert(rf.bandwidthBps<=T.RATED.HIGH_GAIN.bandwidthBps&&rf.txPowerW>300);
const unpowered=T.station(b,Bplanet,mkPower(b,165),O.rotate);
assert.equal(T.deepLink(an,unpowered,[Aplanet,Bplanet],1000).connected,false);
const facingAway=ant('station-away',Bplanet,[1,0,0]);
T.configure(facingAway,'HIGH_GAIN',a.id,1);T.configure(a,'HIGH_GAIN',facingAway.id,1);
const hidden=T.station(facingAway,Bplanet,mkPower(facingAway,1265),O.rotate);
assert.match(T.deepLink(T.station(a,Aplanet,pA,O.rotate),hidden,[Aplanet,Bplanet],1000).reason,/OCCULTATION/);
T.configure(a,'HIGH_GAIN',b.id,1);
const mismatch=ant('station-C',Bplanet,[-1,0,0]);
T.configure(mismatch,'HIGH_GAIN','station-X',1);
assert.match(T.deepLink(an,T.station(mismatch,Bplanet,mkPower(mismatch,1265),O.rotate),[Aplanet,Bplanet]).reason,/pointed/);
const ship={id:'starfall-ship',kind:'ship-radio',bodyId:Aplanet.id,position:[Aplanet.radius+12,0,0],
 rangeScene:45,bandwidthBps:128000,txPowerW:60};
const rover={id:'probe-B',kind:'rover-radio',bodyId:Bplanet.id,position:[Bplanet.position[0]-Bplanet.radius-3,0,0],
 rangeScene:45,bandwidthBps:48000,txPowerW:34};
const p={id:'cmd-B',encodedBytes:300,bytes:204,type:'ROVER_COMMAND'};
const route=T.plan({packet:p,time:5,source:ship,destination:rover,
 localNodes:[an,bn],allStations:[an,bn],bodyAt:id=>id===Aplanet.id?Aplanet:Bplanet,
 localLink:(a,b,body)=>A.link(a,b,body,O.radioLink,O.rotate,1000),unit:1000});
assert(route.connected,route.reason);
assert.deepEqual(route.hops,[ship.id,an.id,bn.id,rover.id]);
assert.equal(route.hopReports.length,3);
assert(route.delayS>=rf.delayS&&route.bandwidthBps>0);
assert.equal(T.plan({packet:p,time:5,source:ship,destination:rover,
 localNodes:[an,bn],allStations:[an,bn],bodyAt:id=>id===Aplanet.id?Aplanet:Bplanet,
 localLink:(a,b,body)=>A.link(a,b,body,O.radioLink,O.rotate,1000),
 bufferLoad:()=>4194304}).connected,false);
const send=new Tx.Transport(742,0);
const out=send.queue({id:'t08-rover-command',type:'ROVER_COMMAND',sourceId:ship.id,destId:rover.id,
 bodyId:Bplanet.id,systemId:'star0',bytes:204,createdS:0,ttlS:365*86400});
let delivered=0,charge=0;
for(let time=5;time<=150;time+=5){
 send.advanceTo(time,()=>route,()=>{delivered++;return true;},(pkt,j)=>{charge+=j;return true;});
 if(send.get('t08-rover-command').state==='ACKED')break;
}
assert.equal(delivered,1);assert.equal(send.get('t08-rover-command').state,'ACKED');
assert(send.get('t08-rover-command').energyJ>0&&charge>0);
const state=new Tx.Transport(742,send.cursorS,send.serialize());
assert.equal(state.get('t08-rover-command').state,'ACKED');
assert(state.receipts.includes('t08-rover-command'));
T.configure(a,'FICTIONAL',b.id,15);T.configure(b,'FICTIONAL',a.id,15);
const fa=T.station(a,Aplanet,mkPower(a,2365),O.rotate),fb=T.station(b,Bplanet,mkPower(b,2365),O.rotate);
fa.systemId='alpha';fb.systemId='beta';
const fi=T.deepLink(fa,fb,[Aplanet,Bplanet]);
assert(fi.connected&&fi.mode==='FICTIONAL'&&fi.delayS>=120);
T.configure(a,'HIGH_GAIN',b.id,20);T.configure(b,'HIGH_GAIN',a.id,20);
const ra=T.station(a,Aplanet,pA,O.rotate),rb=T.station(b,Bplanet,pB,O.rotate);
ra.systemId='alpha';rb.systemId='beta';
const realInterstellar=T.deepLink(ra,rb,[Aplanet,Bplanet]);
assert(!realInterstellar.connected&&realInterstellar.minimumLightSeconds>31500000);
const copy=JSON.parse(JSON.stringify(a));
assert.equal(A.repair(copy.radioT04).deepT08.mode,'HIGH_GAIN');
T.configure(a,'OFF','',30);assert.equal(T.watts(a),0);
console.log('PASS T08: commissioned 48V RF dual antenna; source/peer power + pointing, LOS occultation, finite A ship→A dish→B dish→B rover route, T03 byte+ACK, fictional opt-in and honest interstellar RF delay');
