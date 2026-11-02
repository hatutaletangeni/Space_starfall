/* STARFALL T08 — real commissioned high-gain antennas on existing T04
 * Outpost items, no new station class, power source or packet engine.
 * T03 owns actual byte progress, in-flight delay, custody and ACK.
 */
(function(root){'use strict';
const C=299792458,LY=9.4607304725808e15,UNIT=()=>root.StarfallPhysics?.SCENE_METERS_PER_UNIT||1000;
const TYPES=Object.freeze(['OFF','HIGH_GAIN','FICTIONAL']);
const RATED=Object.freeze({HIGH_GAIN:{watts:1100,txW:420,bandwidthBps:256000,maxScene:3e7,bufferBytes:4194304},
 FICTIONAL:{watts:2200,txW:900,bandwidthBps:128000,maxScene:0,bufferBytes:2097152}});
const V={sub:(a,b)=>a.map((v,i)=>v-b[i]),add:(a,b)=>a.map((v,i)=>v+b[i]),mul:(a,n)=>a.map(x=>x*n),norm:a=>{const d=Math.hypot(...a);return d>1e-9?a.map(x=>x/d):[0,0,1]},len:a=>Math.hypot(...a),dot:(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0)};
const finite=Number.isFinite,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function repair(raw){
 const o=raw?.schema===1?raw:{};
 return{schema:1,mode:TYPES.includes(o.mode)?o.mode:'OFF',
  peerId:typeof o.peerId==='string'&&/^[\w.:-]{0,160}$/.test(o.peerId)?o.peerId:'',
  enabled:o.enabled!==false,health:finite(o.health)?clamp(o.health,0,1):1,
  commissionedAtS:finite(o.commissionedAtS)&&o.commissionedAtS>=0?o.commissionedAtS:null,
  lastContactS:finite(o.lastContactS)&&o.lastContactS>=0?o.lastContactS:null,
  fault:String(o.fault||'').slice(0,160)};
}
function configure(item,mode,peerId,at=0){
 if(item?.kind!=='antenna'||!TYPES.includes(mode))throw Error('T08 requires an existing real outpost antenna');
 if(!finite(at)||at<0)throw Error('T08 invalid commissioning time');
 if(mode!=='OFF'&&(!peerId||typeof peerId!=='string'||peerId===item.id||!/^[\w.:-]{1,160}$/.test(peerId)))
  throw Error('Select a distinct real remote antenna ID for the deep-space pointing target');
 const p=repair(item.radioT04?.deepT08);
 p.mode=mode;p.peerId=mode==='OFF'?'':peerId;p.enabled=mode!=='OFF';p.commissionedAtS=mode==='OFF'?null:at;p.fault='';
 if(!item.radioT04)item.radioT04=root.StarfallAntennaT04?.repair(null)||{};
 item.radioT04.deepT08=p;return{...p};
}
function watts(item){
 const p=repair(item?.radioT04?.deepT08);
 return p.mode==='OFF'||!p.enabled?0:RATED[p.mode].watts;
}
function inspected(item,power,at=0){
 const p=repair(item?.radioT04?.deepT08),spec=RATED[p.mode],line=power?.byId?.[item?.id],
 enabled=item?.kind==='antenna'&&item.enabled!==false&&item.condition>.1&&p.enabled&&p.mode!=='OFF';
 const powered=!!(enabled&&line?.power===true&&line.servedW>=watts(item)+root.StarfallAntennaT04.BASE_W-1);
 return{itemId:item?.id||null,bodyId:item?.bodyId||null,mode:p.mode,peerId:p.peerId,commissionedAtS:p.commissionedAtS,
  powered,radioEnabled:!!(item?.radioT04?.radioEnabled!==false&&p.enabled),health:p.health,
  ratedPowerW:spec?.watts||0,servedW:line?.servedW||0,bandwidthBps:spec?.bandwidthBps||0,
  rangeScene:spec?.maxScene||0,bufferBytes:spec?.bufferBytes||0,
  reason:!item?'NO_STATION':p.mode==='OFF'?'HIGH_GAIN_NOT_INSTALLED':!enabled?'ANTENNA_DISABLED_OR_DAMAGED':
   !line?.power?'T02_GRID_OFFLINE':!powered?'DEEP_SPACE_DC_UNDERSERVED':'ONLINE',fault:p.fault};
}
function station(item,body,power,rotate){
 const hw=root.StarfallAntennaT04,node=hw?.station(item,body,power,rotate);
 if(!node)return null;const info=inspected(item,power);
 return{...node,systemId:body.systemId,deep:info,deepHardware:repair(item.radioT04?.deepT08)};
}
function blocked(a,b,occluders){
 // Conservative finite spherical occluders; body surface endpoint can be close
 // to its own radius, but no ray can cut through the body interior.
 const ab=V.sub(b,a),den=V.dot(ab,ab);
 if(den<1e-8)return false;
 for(const o of occluders){
  if(!o?.position||!finite(o.radius)||o.radius<=0)continue;
  const f=V.sub(o.position,a),t=clamp(V.dot(f,ab)/den,0,1),closest=V.add(a,V.mul(ab,t));
  if(V.len(V.sub(closest,o.position))<o.radius-1e-8)return true;
 }
 return false;
}
function deepLink(a,b,occluders=[],unit=UNIT()){
 if(!a||!b||!a.deep||!b.deep)return{connected:false,reason:'Two installed deep-space antenna endpoints required'};
 const x=a.deep,y=b.deep,mode=x.mode;
 if(!x.powered||!y.powered||!x.radioEnabled||!y.radioEnabled)return{connected:false,reason:'Ground station high-gain/fictional hardware not powered'};
 if(mode==='OFF'||mode!==y.mode)return{connected:false,reason:'Both deep-space stations must have the same commissioned mode'};
 if(x.peerId!==b.id||y.peerId!==a.id)return{connected:false,reason:'Deep-space dishes must be pointed at each other, using exact saved target IDs'};
 if(a.bodyId===b.bodyId)return{connected:false,reason:'Deep-space mode reserved for different real celestial bodies'};
 if(blocked(a.position,b.position,occluders))return{connected:false,reason:'PLANETARY_OCCULTATION: a body blocks the actual antenna ray'};
 const d=V.len(V.sub(a.position,b.position));
 if(!finite(d)||d<=0)return{connected:false,reason:'No valid orbital source positions'};
 const crossSystem=a.systemId!==b.systemId;
 if(!crossSystem&&mode==='FICTIONAL')return{connected:false,reason:'FICTIONAL_INTERSTELLAR_ONLY: normal same-system RF must use HIGH_GAIN hardware'};
 if(crossSystem&&mode!=='FICTIONAL'){
  return{connected:false,reason:'REAL_INTERSTELLAR_RF: no viable installed link; shortest conceptual separation ≥1 ly, one-way light time ≥1 year. Commission explicit FICTIONAL endpoints for expedited messages.',
   minimumLightSeconds:LY/C,scientificDistanceNote:'The procedural game galaxy does not encode physical interstellar star separations; ≥1 ly is only a conservative lower bound'};
 }
 const rating=RATED[mode];
 if(mode==='HIGH_GAIN'&&d>rating.maxScene)return{connected:false,reason:'DEEP_SPACE_RANGE: high-gain station link budget exceeded'};
 const distanceM=d*unit;
 const lightTimeS=mode==='FICTIONAL'?120+distanceM/C:distanceM/C;
 const margin=mode==='FICTIONAL'?Math.min(x.health,y.health):
  Math.min(x.health,y.health)/(1+Math.pow(d/(rating.maxScene*.65),2));
 if(margin<.08)return{connected:false,reason:'HIGH_GAIN_SNR: below receiver lock threshold'};
 const bandwidthBps=Math.max(128,Math.floor(rating.bandwidthBps*margin));
 return{connected:true,reason:mode==='FICTIONAL'?'FICTIONAL INTERSTELLAR DATA RELAY · explicitly commissioned hardware':'Modeled RF high-gain link with finite path loss and c latency',
  mode,delayS:Math.max(.001,lightTimeS),lightTimeS:distanceM/C,
  bandwidthBps,quality:margin,txPowerW:rating.txW,distanceM,distanceScene:d,
  energyMode:mode==='FICTIONAL'?'FICTIONAL': 'RF',
  hopReports:[{from:a.id,to:b.id,mode,distanceM,delayS:Math.max(.001,lightTimeS),bandwidthBps,quality:margin}]};
}
function plan({packet,time,source,destination,localNodes,allStations,bodyAt,localLink,unit=UNIT(),bufferLoad=()=>0}){
 if(!packet||!source||!destination)return{connected:false,reason:'NO_SOURCE_OR_DESTINATION: real powered endpoints required'};
 if(source.bodyId===destination.bodyId)return{connected:false,reason:'T03/T04 owns same-body routes'};
 const involved=[...allStations].filter(n=>n?.powered&&n.deep?.powered&&n.deep?.mode!=='OFF');
 const candidates=[],nodes=[source,...localNodes.filter(n=>n.id!==source.id&&n.id!==destination.id),destination];
 const byId=new Map(nodes.map(n=>[n.id,n]));const others=involved.filter(n=>!byId.has(n.id)).sort((a,b)=>a.id.localeCompare(b.id));
 for(const n of others)byId.set(n.id,n);
 const available=[...byId.values()];let expansions=0;
 function visit(path,links){
  if(++expansions>1200)return;
  const cur=path.at(-1);
  if(cur.id===destination.id){
   if(!links.some(l=>l.mode==='HIGH_GAIN'||l.mode==='FICTIONAL'))return;
   const bw=Math.min(...links.map(x=>x.bandwidthBps)),delay=links.reduce((n,x)=>n+x.delayS,0);
   const route={connected:true,hops:path.map(n=>n.id),
    hopReports:links.map((x,i)=>({from:path[i].id,to:path[i+1].id,delayS:x.delayS,
      bandwidthBps:x.bandwidthBps,quality:x.quality,distanceM:x.distanceM||null,mode:x.mode||'LOCAL'})),
    bandwidthBps:bw,delayS:delay,quality:Math.min(...links.map(x=>x.quality??1)),
    txPowerW:source.txPowerW||34,reason:links.map(x=>x.reason||'local link').join(' / '),
    deepSpace:true,mode:links.some(x=>x.mode==='FICTIONAL')?'FICTIONAL':'RF',
    pathDistanceM:links.reduce((n,x)=>n+(x.distanceM||0),0)};
   candidates.push(route);return;
  }
  if(path.length>=6)return;
  for(const next of available){
   if(next.id===cur.id||path.some(x=>x.id===next.id))continue;
   if(next.id!==destination.id){
    if(!['wired-radio','orbital-radio'].includes(next.kind))continue;
    const cap=next.deep?.bufferBytes||4194304;
    if(bufferLoad(next.id)+(packet.encodedBytes||packet.bytes||0)>cap)continue;
   }
   const same=cur.bodyId===next.bodyId;
   if(!same&&!(cur.deep?.powered&&next.deep?.powered))continue;
   const link=same?localLink(cur,next,bodyAt(cur.bodyId,time)):deepLink(cur,next,
     [bodyAt(cur.bodyId,time),bodyAt(next.bodyId,time),...(packet.occluders||[])],unit);
   if(!link?.connected)continue;
   visit([...path,next],[...links,link]);
  }
 }
 visit([source],[]);
 candidates.sort((a,b)=>a.mode.localeCompare(b.mode)||b.quality-a.quality||a.delayS-b.delayS||a.hops.length-b.hops.length||a.hops.join('>').localeCompare(b.hops.join('>')));
 return candidates[0]||{connected:false,reason:'T08_NO_ROUTE: commission and power high-gain antennas on BOTH worlds, point each at the other ID; ensure wired T02 power, local LOS to ship/rover, and unobstructed moving planetary line of sight. No remote free station.'};
}
const API={SCHEMA:1,RATED,TYPES,LY,C,repair,configure,watts,inspected,station,blocked,deepLink,plan};
root.StarfallDeepSpaceT08=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
