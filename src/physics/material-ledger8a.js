/* STARFALL 8A — physical stock lots, bounded containers and reserve/commit/cancel.
   Data only: never fabricates starting matter or changes any existing legacy store. */
(function(root){'use strict';
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const ident=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const copy=x=>JSON.parse(JSON.stringify(x));
const EPS=1e-8;
function create(saved){
 if(saved!=null&&(!saved||saved.schema!==1||!Array.isArray(saved.containers)||!Array.isArray(saved.lots)||!Array.isArray(saved.operations)))throw Error('Unsupported 8A material ledger');
 const containers=new Map(),lots=new Map(),ops=new Map();
 function container(c){if(!c||!ident(c.id)||!finite(c.maxMassKg)||!finite(c.maxVolumeM3)||!ident(c.ownerId))throw Error('Invalid container');
  return {id:c.id,ownerId:c.ownerId,maxMassKg:c.maxMassKg,maxVolumeM3:c.maxVolumeM3,kind:String(c.kind||'storage').slice(0,40)};}
 function lot(l){if(!l||!ident(l.id)||!ident(l.materialId)||!ident(l.containerId)||!finite(l.massKg)||!finite(l.volumeM3)||!ident(l.provenance))throw Error('Invalid material lot');
  if(l.massKg<=0||l.volumeM3<0)throw Error('Invalid lot quantity');
  return {id:l.id,materialId:l.materialId,containerId:l.containerId,massKg:l.massKg,volumeM3:l.volumeM3,provenance:l.provenance,grade:finite(l.grade)?Math.min(1,l.grade):null};}
 function used(id){let massKg=0,volumeM3=0;for(const l of lots.values())if(l.containerId===id){massKg+=l.massKg;volumeM3+=l.volumeM3;}return {massKg,volumeM3};}
 function room(id,mass,volume){const c=containers.get(id);if(!c)throw Error('Container missing: '+id);const u=used(id);
  if(u.massKg+mass>c.maxMassKg+EPS||u.volumeM3+volume>c.maxVolumeM3+EPS)throw Error('Destination capacity exceeded');}
 function registerContainer(c){const v=container(c);if(containers.has(v.id))throw Error('Duplicate container ID');containers.set(v.id,v);return copy(v);}
 function importLot(l){const v=lot(l);if(lots.has(v.id))throw Error('Duplicate lot ID');room(v.containerId,v.massKg,v.volumeM3);lots.set(v.id,v);return copy(v);}
 if(saved){for(const c of saved.containers)registerContainer(c);for(const l of saved.lots)importLot(l);
   for(const op of saved.operations){if(!ident(op.id)||ops.has(op.id)||!['RESERVED','COMMITTED','CANCELLED'].includes(op.status))throw Error('Invalid inventory operation');ops.set(op.id,copy(op));}}
 // Stock is deliberately empty until real expedition manifest is source-audited.
 function reserve(id,lotId,destinationId,massKg){
  if(!ident(id)||!ident(lotId)||!ident(destinationId)||!finite(massKg)||massKg<=0)throw Error('Invalid reservation');
  const existing=ops.get(id);if(existing){if(existing.lotId!==lotId||existing.destinationId!==destinationId||Math.abs(existing.massKg-massKg)>EPS)throw Error('Reservation ID conflict');return copy(existing);}
  const l=lots.get(lotId);if(!l)throw Error('Material lot missing');if(l.containerId===destinationId)throw Error('Same source and destination');
  const active=[...ops.values()].filter(o=>o.status==='RESERVED'&&o.lotId===lotId);
  const held=active.reduce((a,o)=>a+o.massKg,0);
  if(held+massKg>l.massKg+EPS)throw Error('Insufficient unreserved stock');
  const other=[...ops.values()].filter(o=>o.status==='RESERVED'&&o.destinationId===destinationId&&lots.get(o.lotId)).reduce((a,o)=>{
   const src=lots.get(o.lotId);a.massKg+=o.massKg;a.volumeM3+=o.massKg*src.volumeM3/src.massKg;return a;},{massKg:0,volumeM3:0});
  room(destinationId,massKg+other.massKg,massKg*l.volumeM3/l.massKg+other.volumeM3);
  const op={id,lotId,destinationId,massKg,status:'RESERVED'};ops.set(id,op);return copy(op);
 }
 function commit(id){
  const op=ops.get(id);if(!op)throw Error('Missing reservation');if(op.status==='COMMITTED')return copy(op);
  if(op.status!=='RESERVED')throw Error('Cancelled reservation cannot commit');
  const src=lots.get(op.lotId);if(!src||src.massKg+EPS<op.massKg)throw Error('Source stock changed');
  const vol=op.massKg*src.volumeM3/src.massKg, targetId='transfer:'+id;
  if(lots.has(targetId))throw Error('Duplicate transfer output');
  // Validate before debiting anything; outstanding other reservations remain intact.
  room(op.destinationId,op.massKg,vol);
  if(op.massKg>=src.massKg-EPS)lots.delete(src.id);
  else {src.massKg-=op.massKg;src.volumeM3=Math.max(0,src.volumeM3-vol);}
  lots.set(targetId,{...src,id:targetId,containerId:op.destinationId,massKg:op.massKg,volumeM3:vol});
  op.status='COMMITTED';op.outputLotId=targetId;return copy(op);
 }
 function cancel(id){const op=ops.get(id);if(!op)throw Error('Missing reservation');if(op.status==='COMMITTED')throw Error('Committed transfer cannot cancel');op.status='CANCELLED';return copy(op);}
 function snapshot(){return {schema:1,containers:[...containers.values()].map(copy),lots:[...lots.values()].map(copy),operations:[...ops.values()].map(copy)};}
 function inventory(id){return [...lots.values()].filter(l=>!id||l.containerId===id).map(copy);}
 return Object.freeze({registerContainer,importLot,reserve,commit,cancel,inventory,used,snapshot,
   containers:()=>[...containers.values()].map(copy),operations:()=>[...ops.values()].map(copy)});
}
root.StarfallMaterials8A=Object.freeze({create});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallMaterials8A;
})(typeof globalThis!=='undefined'?globalThis:this);
