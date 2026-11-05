/* STARFALL 8H — first same-system physical ship cargo manifest contract.
 * The ORIGINAL 8D ship cargo hold remains the single authoritative lot owner.
 * Registering a manifest only reserves remote destination capacity; neither
 * loading nor delivery teleports cargo. Flight.js physics must actually fly
 * away from origin and land at destination before any 8A commit is possible.
 * Delivery debits the original installed ship battery and conserves 8A mass.
 * Caller must persist all returned snapshots ATOMICALLY in one SF.save.
 * No interstellar warp, autonomous flight or live Engineer UI in this slice.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-6;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=96;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const SHIP='ship-main',HOLD='8d:ship-main:materials';
const GAS=new Set(['oxygen','nitrogen','hydrogen','helium','argon',
 'carbon_dioxide','carbon_monoxide','sulfur_dioxide','methane','ammonia']);
const vec=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite);
const unit=x=>vec(x)&&Math.abs(Math.hypot(...x)-1)<1e-4;
const arc=(a,b,r)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((s,x,i)=>s+x*b[i],0))))*r;
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
function checkWorld(w){
 if(!w||!id(w.id)||!id(w.systemId)||!finite(w.radius)||w.radius<=0||
  !vec(w.position)||w.landable!==true)
  throw Error('8H actual landable deterministic galaxy world required');
 return w;
}
function flightAt(f,world,landed,timeS){
 if(!f||f.seed!==742||!!f.landed!==landed||!finite(f.time)||
  Math.abs(f.time-timeS)>1||!vec(f.position))
  throw Error('8H original seed-742 ship flight state/time mismatch');
 if(landed){
  if(f.attached!==world.id||!unit(f.groundDirection))
   throw Error('8H real ship must have landed and attached to the expected world');
  const alt=distance(f.position,world.position)-world.radius;
  if(alt<-100||alt>1000)
   throw Error('8H ship landing position inconsistent with destination surface');
 }
}
function dryDock(physical8a,materials8a,world,depotId){
 const p=root.StarfallPhysical8A.create(physical8a),m=root.StarfallMaterials8A.create(materials8a);
 const d=p.get(depotId);
 if(!d||d.type!=='industrial_plant'||d.state?.station!=='cargo_depot'||
  d.state?.enabled!==true||d.condition<.5||
  d.location?.kind!=='surface'||d.location.bodyId!==world.id||
  !unit(d.location.local))
  throw Error('8H offworld delivery requires a REAL installed original dry depot');
 if(!physical8a.transfers?.some(t=>t.action==='INSTALL'&&t.status==='COMMITTED'&&
  t.assetId===depotId&&t.sourceLotId&&Math.abs(t.massKg-d.massKg)<EPS))
  throw Error('8H offworld depot was not physically manufactured and installed');
 const c=m.containers().find(x=>x.id===d.state.containerId&&x.ownerId===depotId&&
  /dry-solid cargo dock/i.test(x.kind||''));
 if(!c)throw Error('8H physically owned destination dry storage missing');
 return{d,c};
}
function cargo(ledger,lotId,massKg){
 const hold=ledger.containers().find(c=>c.id===HOLD&&c.ownerId===SHIP&&
  c.maxMassKg<=9000+EPS&&c.maxVolumeM3<=16+EPS);
 if(!hold)throw Error('8H original 8D ship cargo hold is not present/capacity rated');
 const lot=ledger.inventory(HOLD).find(x=>x.id===lotId);
 if(!lot||GAS.has(lot.materialId)||lot.massKg+EPS<massKg||
  !finite(massKg)||massKg<=0)
  throw Error('8H original dry 8A lot is not actually secured in ship hold');
 return lot;
}
function create(saved){
 const state=saved==null?{schema:1,manifests:[]}:cp(saved);
 if(state.schema!==1||!Array.isArray(state.manifests)||state.manifests.length>200)
  throw Error('8H invalid offworld manifest archive');
 if(new Set(state.manifests.map(x=>x.id)).size!==state.manifests.length)
  throw Error('8H duplicate offworld manifests');
 for(const m of state.manifests)if(!id(m.id)||m.carrierId!==SHIP||
  !id(m.lotId)||!id(m.sourceWorldId)||!id(m.destinationWorldId)||
  m.sourceWorldId===m.destinationWorldId||
  !['RESERVED','IN_TRANSIT','ARRIVED','DELIVERED'].includes(m.status)||
  !finite(m.massKg)||m.massKg<=0||!finite(m.createdS))
  throw Error('8H corrupt loaded-ship manifest');
 const snapshot=()=>cp(state),list=()=>cp(state.manifests);
 const get=id=>state.manifests.find(x=>x.id===id);
 function register({id:manifestId,lotId,massKg,depotId,originWorld,
  destinationWorld,physical8a,materials8a,flightGalaxy,timeS}){
  if(!id(manifestId)||!id(lotId)||!id(depotId)||!finite(massKg)||massKg<=0||
    !finite(timeS)||get(manifestId)||state.manifests.length>=200)
   throw Error('8H invalid/replayed original ship manifest');
  const origin=checkWorld(originWorld),target=checkWorld(destinationWorld);
  if(origin.id===target.id||origin.systemId!==target.systemId)
   throw Error('8H first manifest supports real same-system interplanetary shipping ONLY; no free warp');
  flightAt(flightGalaxy,origin,true,timeS);
  const l=root.StarfallMaterials8A.create(materials8a);
  const lot=cargo(l,lotId,massKg),d=dryDock(physical8a,materials8a,target,depotId);
  const opId='8h-offworld:'+manifestId;
  l.reserve(opId,lotId,d.c.id,massKg); // capacity lock, NOT a transfer!
  const manifest={schema:1,id:manifestId,carrierId:SHIP,
   sourceWorldId:origin.id,destinationWorldId:target.id,
   sourceSystemId:origin.systemId,destinationSystemId:target.systemId,
   lotId,massKg,materialId:lot.materialId,depotId,
   destinationContainerId:d.c.id,reservationId:opId,
   status:'RESERVED',createdS:timeS,departedS:null,arrivedS:null,deliveredS:null};
  state.manifests.push(manifest);
  return{manifest:cp(manifest),manifests:snapshot(),materials8a:l.snapshot(),
   receipt:{status:'RESERVED',id:manifestId,sourceLotId:lotId,kg:massKg,
    materialLocation:HOLD,powerCreatedJ:0,movedKg:0}};
 }
 function depart({id:manifestId,flightGalaxy,originWorld,materials8a,timeS}){
  const m=get(manifestId);
  if(!m||m.status!=='RESERVED')throw Error('8H shipment not newly loaded or already launched');
  const origin=checkWorld(originWorld);
  if(origin.id!==m.sourceWorldId||!finite(timeS)||timeS<=m.createdS||
   !flightGalaxy||flightGalaxy.seed!==742||flightGalaxy.landed!==false||
   !finite(flightGalaxy.time)||Math.abs(flightGalaxy.time-timeS)>1||
   !vec(flightGalaxy.position))
   throw Error('8H original ship must physically launch and advance its real flight clock');
  if(distance(flightGalaxy.position,origin.position)<origin.radius+100)
   throw Error('8H ship has not yet cleared the departure atmosphere/surface');
  const l=root.StarfallMaterials8A.create(materials8a);
  cargo(l,m.lotId,m.massKg);
  const op=l.operations().find(x=>x.id===m.reservationId);
  if(!op||op.status!=='RESERVED'||op.destinationId!==m.destinationContainerId)
   throw Error('8H original ship cargo/reservation custody lost on departure');
  m.departedS=timeS;m.status='IN_TRANSIT';
  return{manifest:cp(m),manifests:snapshot(),materials8a:l.snapshot()};
 }
 function arrive({id:manifestId,flightGalaxy,destinationWorld,materials8a,timeS}){
  const m=get(manifestId),dest=checkWorld(destinationWorld);
  if(!m||m.status!=='IN_TRANSIT'||dest.id!==m.destinationWorldId||
   !finite(timeS)||timeS<=m.departedS)
   throw Error('8H original shipment has not departed for this destination');
  flightAt(flightGalaxy,dest,true,timeS);
  const l=root.StarfallMaterials8A.create(materials8a);
  cargo(l,m.lotId,m.massKg);
  if(l.operations().find(x=>x.id===m.reservationId)?.status!=='RESERVED')
   throw Error('8H cargo reservation was spent before physical destination landing');
  m.arrivedS=timeS;m.status='ARRIVED';
  return{manifest:cp(m),manifests:snapshot(),materials8a:l.snapshot()};
 }
 function deliver({id:manifestId,flightGalaxy,destinationWorld,operatorLocal,
  onFoot,physical8a,materials8a,engineeringVehicles,energyReceipts,timeS}){
  const m=get(manifestId),dest=checkWorld(destinationWorld);
  if(!m||m.status!=='ARRIVED'||dest.id!==m.destinationWorldId||
   !finite(timeS)||timeS<m.arrivedS||onFoot!==true||!unit(operatorLocal))
   throw Error('8H destination requires original landed ship and physical EVA operator');
  flightAt(flightGalaxy,dest,true,timeS);
  const dock=dryDock(physical8a,materials8a,dest,m.depotId);
  if(arc(operatorLocal,dock.d.location.local,dest.radius)>20||
    arc(flightGalaxy.groundDirection,dock.d.location.local,dest.radius)>75)
   throw Error('8H real landed spacecraft and EVA operator must be at destination dock');
  const l=root.StarfallMaterials8A.create(materials8a);
  cargo(l,m.lotId,m.massKg);
  const op=l.operations().find(x=>x.id===m.reservationId);
  if(!op||op.status!=='RESERVED'||op.destinationId!==dock.c.id||
    op.lotId!==m.lotId||Math.abs(op.massKg-m.massKg)>EPS)
   throw Error('8H original reserved ship lot was changed or already unloaded');
  if(!Array.isArray(energyReceipts)||!root.StarfallLogisticsBatteryBridge8H?.parse||
    !root.StarfallLogisticsEnergy8H?.debit)
   throw Error('8H source-owned ship electrical debit missing');
  const shipEnergy=root.StarfallLogisticsBatteryBridge8H.parse(
   {engineeringVehicles},'starfall-ship',SHIP);
  const usedJ=1200,energy=root.StarfallLogisticsEnergy8H.debit({
   state:{schema:1,stores:{'starfall-ship':{carrierId:SHIP,
    energyJ:shipEnergy.energyJ,capacityJ:shipEnergy.capacityJ}},
    receipts:cp(energyReceipts)},
   operationId:'8h-offworld-unload:'+manifestId,carrierId:SHIP,
   sourceId:'starfall-ship',usedJ});
  const priorMass=l.inventory().reduce((n,x)=>n+x.massKg,0);
  const receipt=l.commit(m.reservationId);
  const afterMass=l.inventory().reduce((n,x)=>n+x.massKg,0);
  if(Math.abs(priorMass-afterMass)>EPS||receipt.outputLotId!=='transfer:'+m.reservationId)
   throw Error('8H offworld unloading violated original 8A cargo mass conservation');
  const v=cp(engineeringVehicles);
  v.states.ship.energyJ=energy.receipt.afterJ;
  m.deliveredS=timeS;m.status='DELIVERED';
  return{manifest:cp(m),manifests:snapshot(),materials8a:l.snapshot(),
   engineeringVehicles:v,energyReceipts:energy.state.receipts,
   receipt:cp(receipt),energyReceipt:energy.receipt,movedKg:m.massKg,
   note:'Cargo moved only after original ship landed and 1200 J paid; caller must persist owners together'};
 }
 return Object.freeze({snapshot,list,register,depart,arrive,deliver});
}
root.StarfallOffworldManifest8H=Object.freeze({create,SHIP,HOLD});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallOffworldManifest8H;
})(typeof globalThis!=='undefined'?globalThis:this);
