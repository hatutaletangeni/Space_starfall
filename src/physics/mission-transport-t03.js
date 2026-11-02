/* STARFALL T03 - one bounded, deterministic, durable store-and-forward
 * transport. Packets carry small command payloads or IDs of source-owned data.
 * Never persist image bytes in localStorage. No free or invented links.
 */
(function(root){'use strict';
const SCHEMA=1,MAX_PACKETS=240,MAX_BYTES=12_000_000,FRAME_S=5,MAX_FRAMES=12;
const VALID=new Set(['ROVER_COMMAND','EMERGENCY_STOP','CAMERA_REQUEST','IMAGE_REF','SATELLITE_OBSERVATION','ROVER_OBSERVATION','SCIENCE_NOTE','LAB_ACK','TELEMETRY']);
const PRIORITY={EMERGENCY_STOP:0,ROVER_COMMAND:1,CAMERA_REQUEST:2,LAB_ACK:2,ROVER_OBSERVATION:3,SATELLITE_OBSERVATION:3,TELEMETRY:4,SCIENCE_NOTE:5,IMAGE_REF:8};
const STATES=new Set(['CREATED','WAITING_FOR_ROUTE','QUEUED_AT_NODE','UPLINKING','TRANSMITTING','IN_FLIGHT','RECEIVED','ACKED','OFFLINE','PAUSED','FAILED','EXPIRED']);
const C=299792458;
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const id=x=>typeof x==='string'&&x.length>=1&&x.length<=160&&/^[\w:./-]+$/.test(x);
const copy=x=>JSON.parse(JSON.stringify(x));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function create({id:packetId,type,sourceId,destId,bodyId,systemId,bytes,createdS,ref={},ttlS=86400,priority=PRIORITY[type]}){
 if(!VALID.has(type)||![packetId,sourceId,destId,bodyId,systemId].every(id)||!Number.isSafeInteger(bytes)||bytes<1||bytes>2_500_000||!valid(createdS)||!valid(ttlS)||ttlS<1||!Number.isInteger(priority)||priority<0||priority>9)throw Error('T03 packet metadata invalid');
 const payload=JSON.stringify(ref);
 if(payload.length>5000||/(data:image\/|base64,)/i.test(payload))throw Error('T03 payload must be a compact reference, not image bytes');
 return{id:packetId,type,sourceId,destId,bodyId,systemId,ref:copy(ref),bytes,encodedBytes:bytes+96,
  priority,createdS,expiresS:createdS+ttlS,lastS:createdS,sendBytes:0,recvBytes:0,
  retries:0,route:[],hop:0,sourceCustody:sourceId,custody:sourceId,ack:'PENDING',ackAtS:null,
  eligibleS:createdS,arrivalS:null,state:'CREATED',reason:'',lastLink:null,energyJ:0};
}
class Transport{
 constructor(seed,startS=0,saved=null){
  if(!Number.isSafeInteger(seed)||seed<0||!valid(startS))throw Error('T03 seed/clock invalid');
  this.seed=seed;this.cursorS=startS;this.packets=[];this.receipts=[];this.metrics={txBytes:0,delivered:0};this.fault=null;
  if(saved?.schema===SCHEMA&&saved.seed===seed){
   // A saved comms cursor may legitimately be ahead of the flight snapshot
   // (e.g., mission-ops flushed while flight autosave lagged). Retain ALL
   // durable packets/receipts and freeze radio time until flight catches up.
   // NEVER discard delivery evidence merely because clocks disagree.
   if(valid(saved.cursorS)&&saved.cursorS<1e13){
    this.cursorS=saved.cursorS;this.receipts=Array.isArray(saved.receipts)?saved.receipts.filter(id).slice(-4000):[];
    const seen=new Set();
    for(const x of Array.isArray(saved.packets)?saved.packets:[]){
     if(!x||!id(x.id)||seen.has(x.id)||!VALID.has(x.type)||!STATES.has(x.state)||!valid(x.bytes)||!valid(x.sendBytes)||!valid(x.recvBytes))continue;
     if(x.sendBytes>x.bytes+96||x.recvBytes>x.bytes+96)continue;
     seen.add(x.id);this.packets.push(copy(x));
     if(this.packets.length>=MAX_PACKETS)break;
    }
    if(saved.metrics&&valid(saved.metrics.txBytes)&&valid(saved.metrics.delivered))this.metrics=copy(saved.metrics);
   }
  }
 }
 queue(meta){
  const p=create(meta),found=this.packets.find(x=>x.id===p.id);
  if(found){if(found.type!==p.type||found.sourceId!==p.sourceId||found.destId!==p.destId)throw Error('T03 packet ID collision');return copy(found);}
  if(this.packets.length>=MAX_PACKETS||this.packets.reduce((n,x)=>n+x.encodedBytes,0)+p.encodedBytes>MAX_BYTES)throw Error('T03 radio buffer full; export and explicitly archive ACKED packets');
  this.packets.push(p);return copy(p);
 }
 get(packetId){const p=this.packets.find(x=>x.id===packetId);return p?copy(p):null;}
 list(assetId=null){return this.packets.filter(p=>!assetId||p.sourceId===assetId||p.destId===assetId).map(copy);}
 archive(){
  const done=this.packets.filter(p=>['ACKED','EXPIRED','FAILED'].includes(p.state)).map(copy);
  this.packets=this.packets.filter(p=>!['ACKED','EXPIRED','FAILED'].includes(p.state));return done;
 }
 serialize(){return copy({schema:SCHEMA,seed:this.seed,cursorS:this.cursorS,packets:this.packets,receipts:this.receipts,metrics:this.metrics});}
 advanceTo(t,routeFor,receive,consume){
  if(!valid(t))throw Error('T03 timestamp invalid');
  if(t<this.cursorS-1e-8)return{status:'CLOCK_REWOUND',cursorS:this.cursorS,steps:0};
  if(t-this.cursorS>86400)return{status:'AWAITING_REVIEW',reason:'Backlog exceeds validated 24 hours; packets held rather than teleported',cursorS:this.cursorS,steps:0};
  let n=0;
  while(n<MAX_FRAMES){
   const boundary=(Math.floor((this.cursorS+1e-7)/FRAME_S)+1)*FRAME_S;
   if(boundary>t+1e-7)break;
   const dt=boundary-this.cursorS;this.advanceFrame(boundary,dt,routeFor,receive,consume);
   this.cursorS=boundary;n++;
  }
  return{status:t-this.cursorS>=FRAME_S?'CATCHING_UP':'CURRENT',cursorS:this.cursorS,remainingS:Math.max(0,t-this.cursorS),steps:n};
 }
 advanceFrame(now,dt,routeFor,receive,consume){
  const active=this.packets.filter(p=>!['ACKED','EXPIRED','FAILED'].includes(p.state));
  // In-flight data is not unsent when LOS vanishes; powered receiver is still checked.
  for(const p of active){
   if(now>p.expiresS){p.state='EXPIRED';p.reason='TTL exceeded without confirmed receipt';continue;}
   if(p.state==='RECEIVED'&&now>=p.ackAtS){
    p.state='ACKED';p.ack='ACKED';p.custody=p.destId;p.reason='Receiver acknowledged once';continue;
   }
   if(p.state!=='IN_FLIGHT'||p.arrivalS>now)continue;
   if(this.receipts.includes(p.id)){p.state='RECEIVED';p.ackAtS=now+.001;continue;}
   const route=routeFor(p,now,'receive');
   if(!route?.connected){p.state='OFFLINE';p.reason='Receiver unreachable after propagation: '+String(route?.reason||'offline');p.sendBytes=0;p.recvBytes=0;p.arrivalS=null;p.retries++;p.eligibleS=now+Math.min(60,2**Math.min(p.retries,5));continue;}
   try{
    const accepted=receive(p,now);
    if(accepted===false){p.state='IN_FLIGHT';p.reason='Destination storage or handler unavailable; received bytes held for retry';p.arrivalS=now+5;continue;}
   }catch(e){p.state='IN_FLIGHT';p.reason='Delivery handler retry: '+String(e?.message||e).slice(0,120);p.arrivalS=now+5;continue;}
   if(this.receipts.length>=4000){p.state='IN_FLIGHT';p.arrivalS=now+5;p.reason='Receipt ledger full; archive with export before accepting more';continue;}
   this.receipts.push(p.id);p.recvBytes=p.encodedBytes;p.state='RECEIVED';p.ackAtS=now+Math.max(.001,Number(route.delayS)||.001);
   p.custody=p.destId;p.reason='Payload accepted by authoritative destination';this.metrics.delivered++;
  }
  // Each physical hop represents a finite shared bandwidth resource; STOP
  // and control pre-empt bulk image traffic. Equal-priority packets share
  // capacity fairly by deterministic round-robin bytes per frame.
  const candidates=new Map();
  for(const p of active){
   if(p.state==='IN_FLIGHT'||p.state==='RECEIVED'||p.state==='ACKED'||p.state==='EXPIRED'||now<p.eligibleS)continue;
   const route=routeFor(p,now,'send');
   if(!route?.connected||!Array.isArray(route.hops)||route.hops.length<2){
    p.state='WAITING_FOR_ROUTE';p.reason=String(route?.reason||'No powered source/receiver radio route');p.lastLink=null;continue;
   }
   if(!valid(route.bandwidthBps)||route.bandwidthBps<=0||!valid(route.delayS)){
    p.state='OFFLINE';p.reason='No valid bounded bitrate or light-time';continue;
   }
   p.route=copy(route.hops);p.lastLink={atS:now,bandwidthBps:route.bandwidthBps,delayS:route.delayS,quality:route.quality??null,hops:Array.isArray(route.hopReports)?copy(route.hopReports).slice(0,6):[],reason:route.reason||'powered LOS'};
   p.state='QUEUED_AT_NODE';p.reason='Contact available; awaiting finite shared airtime';
   // A cross-body dish is one shared physical half-duplex RF channel.
   // Opposing command/image traffic and unrelated endpoints cannot each
   // claim its full nominal bitrate while competing for the SAME dish pair.
   const deep=route.hopReports?.find(h=>h.mode==='HIGH_GAIN'||h.mode==='FICTIONAL');
   const key=deep?'deep:'+ [deep.from,deep.to].sort().join('<>'):route.hops.join('>');
   if(!candidates.has(key))candidates.set(key,{route,packets:[]});
   candidates.get(key).packets.push(p);
  }
  for(const {route,packets} of candidates.values()){
   const capacity=Math.max(0,Math.floor(Math.min(route.bandwidthBps,...packets.map(p=>p.lastLink?.bandwidthBps||route.bandwidthBps))*dt/8));
   let left=capacity;
   const priorities=[...new Set(packets.map(p=>p.priority))].sort((a,b)=>a-b);
   for(const priority of priorities){
    const tier=packets.filter(p=>p.priority===priority).sort((a,b)=>a.id.localeCompare(b.id));
    // Deterministic fair-share small bursts, no fake completion for big files.
    let open=tier,guard=0;
    while(left>0&&open.length&&guard++<400){
     const quota=Math.max(1,Math.min(4096,Math.floor(left/open.length))),next=[];
     for(const p of open){
      if(left<=0){next.push(p);continue;}
      const bytes=Math.min(quota,left,p.encodedBytes-p.sendBytes);
      if(bytes<=0)continue;
      const watts=valid(route.txPowerW)?route.txPowerW:24;
      const chargeJ=watts*bytes*8/route.bandwidthBps;
      if(consume&&consume(p,chargeJ,now)===false){p.state='PAUSED';p.reason='Sender has insufficient electrical energy';p.eligibleS=now+FRAME_S;continue;}
      p.energyJ+=chargeJ;p.sendBytes+=bytes;p.lastS=now;this.metrics.txBytes+=bytes;left-=bytes;
      p.state=p.sendBytes>=p.encodedBytes?'IN_FLIGHT':'TRANSMITTING';
      if(p.state==='IN_FLIGHT'){p.arrivalS=now+Math.max(.001,route.delayS);p.reason='Encoded bytes transmitted; waiting for light-time and powered receiver';}
      else next.push(p);
     }
     open=next;
    }
   }
  }
 }
}
const API={SCHEMA,FRAME_S,MAX_PACKETS,MAX_BYTES,PRIORITY,STATES,C,Transport,create};
root.StarfallTransportT03=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
