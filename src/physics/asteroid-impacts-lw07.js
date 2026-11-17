/* STARFALL LW07 — seeded asteroid impacts and permanent, closed-surface craters.
 * Impacts only occur in systems that actually contain a generated asteroid belt.
 * The model stores bounded crater records; it never edits body IDs or orbit data.
 */
(function(root){'use strict';
const VERSION=1,PERIOD_S=18000,MAX_RECORDS=1200,TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function unit(key){let v=hash(key);v=Math.imul(v^(v>>>16),0x7feb352d);v=Math.imul(v^(v>>>15),0x846ca68b);return ((v^(v>>>16))>>>0)/4294967296;}
function direction(key){const y=unit(key+':y')*2-1,a=unit(key+':a')*TAU,r=Math.sqrt(Math.max(0,1-y*y));return [Math.cos(a)*r,y,Math.sin(a)*r];}
function validRecord(x){
 return !!x&&typeof x.id==='string'&&x.id.length<=180&&typeof x.bodyId==='string'&&x.bodyId.length<=160&&
  Array.isArray(x.direction)&&x.direction.length===3&&x.direction.every(Number.isFinite)&&
  Number.isFinite(x.radiusScene)&&x.radiusScene>0&&Number.isFinite(x.depthScene)&&x.depthScene>0&&
  Number.isFinite(x.createdAtS)&&x.createdAtS>=0&&Number.isFinite(x.energyJ)&&x.energyJ>=0&&
  Number.isFinite(x.massKg)&&x.massKg>=0;
}
function staticCraters(body,system,seed=742){
 if(!body||!system)return [];
 const belts=Array.isArray(system.belts)?system.belts:[],isShattered=body.type==='Shattered';
 if(!belts.length&&!isShattered)return [];
 const population=belts.reduce((n,b)=>n+(Array.isArray(b.rocks)?b.rocks.length:0),0);
 const density=belts.length?Math.max(.5,Math.min(2.5,population/420)):0;
 const key='lw07:history:'+seed+':'+body.id;
 const count=isShattered?5+Math.floor(unit(key+':count')*4):
  Math.min(7,1+Math.floor(unit(key+':count')*(belts.length*2.1+density)));
 const out=[];
 for(let i=0;i<count;i++){
  const k=key+':'+i,frac=isShattered?.035+unit(k+':r')*.065:.018+unit(k+':r')*.04;
  const radiusScene=Math.max(2,body.radius*frac),depthScene=radiusScene*(.12+unit(k+':d')*.16);
  out.push(Object.freeze({id:'crater:'+hash(k).toString(36),bodyId:body.id,direction:direction(k),
   radiusScene,depthScene,createdAtS:0,source:isShattered?'fragmentation':'asteroid-belt'}));
 }
 return out;
}
function attachSystem(system,seed=742){
 if(!system||!Array.isArray(system.bodies))return 0;
 let count=0;
 for(const body of system.bodies){
  const craters=staticCraters(body,system,seed);
  body.impactBaseCraters=craters;
  body.impactCraters=craters;
  body.impactRevision=(body.impactRevision||0)+1;
  count+=craters.length;
 }
 return count;
}
function scheduled(body,system,window,seed){
 const belts=system?.belts||[];
 if(!belts.length||!body||!['planet','moon'].includes(body.kind))return null;
 const population=belts.reduce((n,b)=>n+(Array.isArray(b.rocks)?b.rocks.length:0),0);
 const density=Math.max(.5,Math.min(2.5,population/420));
 const chance=clamp(.008+.012*belts.length+.003*density,.008,.05);
 const key='lw07:impact:'+seed+':'+body.id+':'+window;
 if(unit(key+':occur')>=chance)return null;
 const impactTimeS=window*PERIOD_S+90+unit(key+':time')*(PERIOD_S-180);
 const massKg=1e5+unit(key+':mass')*8e8,velocityMS=4500+unit(key+':velocity')*28500;
 const energyJ=.5*massKg*velocityMS*velocityMS;
 const radiusScene=Math.max(2,body.radius*(.012+unit(key+':radius')*.03));
 return Object.freeze({id:'impact:'+hash(key).toString(36),bodyId:body.id,impactTimeS,
  direction:direction(key),incoming:direction(key+':incoming'),radiusScene,
  depthScene:radiusScene*(.20+unit(key+':depth')*.18),massKg,velocityMS,energyJ,
  source:'system-asteroid-belt',window});
}
function safeClone(value){try{return JSON.parse(JSON.stringify(value));}catch(_error){return{unreadable:true};}}
function create(saved){
 const invalid=saved!=null&&(saved.schema!==VERSION||!Array.isArray(saved.craters)||saved.craters.length>MAX_RECORDS||!saved.craters.every(validRecord));
 const recovery=invalid?{status:'quarantined',reason:'Invalid LW07 impact archive; original payload preserved',original:safeClone(saved)}:(saved?.recovery||null);
 const records=new Map((invalid?[]:(saved?.craters||[])).map(x=>[x.id,{...x,direction:[...x.direction]}]));
 function step(body,system,timeS,seed=742){
  if(!body||!Number.isFinite(timeS)||timeS<0||!['planet','moon'].includes(body.kind))return null;
  const window=Math.floor(timeS/PERIOD_S),first=Math.max(0,window-6);
  let active=null,changed=false;
  for(let w=first;w<=window;w++){
   const event=scheduled(body,system,w,seed);if(!event)continue;
   if(timeS>=event.impactTimeS&&!records.has(event.id)){
    records.set(event.id,{id:event.id,bodyId:body.id,direction:[...event.direction],
     radiusScene:event.radiusScene,depthScene:event.depthScene,createdAtS:event.impactTimeS,
     energyJ:event.energyJ,massKg:event.massKg,source:event.source});
    changed=true;
   }
   if(timeS>=event.impactTimeS-8&&timeS<=event.impactTimeS+5)
    active={...event,phase:clamp((timeS-(event.impactTimeS-8))/13,0,1)};
  }
  if(records.size>MAX_RECORDS){const oldest=[...records.values()].sort((a,b)=>a.createdAtS-b.createdAtS).slice(0,records.size-MAX_RECORDS);for(const x of oldest)records.delete(x.id);}
  const base=body.impactBaseCraters||staticCraters(body,system,seed);
  const dynamic=[...records.values()].filter(x=>x.bodyId===body.id);
  if(changed||!Array.isArray(body.impactCraters)||body.impactCraters.length!==base.length+dynamic.length){
   body.impactBaseCraters=base;body.impactCraters=base.concat(dynamic);
   body.impactRevision=(body.impactRevision||0)+1;
  }
  return active;
 }
 function serialize(){return{schema:VERSION,craters:[...records.values()].map(x=>({...x,direction:[...x.direction]})),recovery:safeClone(recovery)};}
 return Object.freeze({step,serialize,staticCraters,attachSystem,
  get craterCount(){return records.size;},get recoveryRequired(){return !!recovery;}});
}
root.StarfallAsteroidImpactsLW07=Object.freeze({VERSION,PERIOD_S,staticCraters,scheduled,attachSystem,create,direction});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallAsteroidImpactsLW07;
})(globalThis);
