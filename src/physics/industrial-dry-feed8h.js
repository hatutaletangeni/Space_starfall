/* STARFALL Update 8H — actual original 8A physical surface plant
 * dry feed hopper, emptied by original 8E atom-balanced chemical owner.
 * Genuine completed original 8F→8E paid plant kit contains a bounded EMPTY
 * 120 kg / .20 m³ dry hopper. Real landed EVA carries up to 20 kg at a
 * time from a separately paid installed receiving cargo depot into the
 * built-in same-world plant inlet. The upstream original 250W native T02
 * conveyor MUST actually deliver ore to the receiving depot first.
 *
 * No automatic conveyor-to-plant delivery here: this last-metre HANDOFF
 * is explicitly manual and does not pretend to be a powered belt hop.
 * The original 8A reserve→commit is the SOLE custody/material owner.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-6,MAX_MASS=20,
 MAX_DEPOT_HOP=32,MAX_EVA_REACH=20;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const DRY_DENIED=new Set(['water','ice','liquid_water','oxygen',
 'nitrogen','hydrogen','carbon_dioxide','carbon_monoxide','methane',
 'sulfur_dioxide','argon','helium','ammonia']);
const arc=(a,b,r)=>Math.acos(Math.max(-1,Math.min(1,
  a.reduce((s,x,i)=>s+x*b[i],0))))*r;
const unit=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)&&
 Math.abs(Math.hypot(...v)-1)<1e-3;
function transfer({id:jobId,sourceLotId,sourceDepotId,stationId,massKg,
 materials8a,physical8a,bodyId,bodyRadius,operatorLocal,
 operatorEVA,landed}={}){
 if(!id(jobId)||!jobId.startsWith('8h-dry-feed:')||
    !id(sourceLotId)||!id(sourceDepotId)||!id(stationId)||
    !id(bodyId)||!finite(bodyRadius)||bodyRadius<=0||
    !finite(massKg)||massKg<=0||massKg>MAX_MASS||
    operatorEVA!==true||landed!==true||!unit(operatorLocal)||
    !physical8a||physical8a.schema!==1||
    !Array.isArray(physical8a.assets)||
    !Array.isArray(physical8a.transfers)||
    !materials8a||materials8a.schema!==1)
  throw Error('8H surface dry handoff needs actual landed on-foot operator and finite <=20kg original stock');
 const assets=new Map(physical8a.assets.map(a=>[a.id,a])),
  depot=assets.get(sourceDepotId),plant=assets.get(stationId);
 const sourceBin=materials8a.containers?.find(c=>c.id===depot?.state?.containerId&&c.ownerId===depot.id),
  targetBin=materials8a.containers?.find(c=>c.id===plant?.state?.dryFeedContainerId&&c.ownerId===plant.id);
 const installed=a=>!!a&&physical8a.transfers.some(t=>
  t.action==='INSTALL'&&t.status==='COMMITTED'&&t.assetId===a.id&&
  id(t.sourceLotId)&&finite(t.massKg)&&Math.abs(t.massKg-a.massKg)<EPS);
 const same=a=>a?.location?.kind==='surface'&&a.location.bodyId===bodyId&&
  unit(a.location.local)&&a.condition>=.8&&a.state?.enabled===true;
 if(!same(depot)||!same(plant)||!installed(depot)||!installed(plant)||
   depot.type!=='industrial_plant'||depot.state.station!=='cargo_depot'||
   plant.type!=='industrial_plant'||![
    'reduction_furnace','glass_furnace','high_temp_cell',
    'electrolyzer','catalytic_reactor'].includes(plant.state.station))
  throw Error('8H actual paid same-world cargo depot and manufactured surface chemical station required');
 if(!sourceBin||!/dry-solid cargo dock/i.test(sourceBin.kind)||
   !targetBin||!/dry-reactant feed hopper/i.test(targetBin.kind)||
   Math.abs(targetBin.maxMassKg-120)>EPS||
   Math.abs(targetBin.maxVolumeM3-.20)>EPS||
   plant.state.dryFeedContainerId!=='plantfeed8h:'+plant.id)
  throw Error('8H real original 8A 120kg/.20m³ integrated dry plant inlet missing; old plants must use ship-fed legacy chemistry');
 const sourceReach=arc(operatorLocal,depot.location.local,bodyRadius),
  stationReach=arc(operatorLocal,plant.location.local,bodyRadius),
  distance=arc(depot.location.local,plant.location.local,bodyRadius);
 if(sourceReach>MAX_EVA_REACH+EPS||
   stationReach>MAX_EVA_REACH+EPS||
   distance>MAX_DEPOT_HOP+EPS||distance<.01)
  throw Error('8H carry must physically reach both original structures (operator <=20 and depot→plant <=32 scene units)');
 const ledger=root.StarfallMaterials8A?.create(materials8a);
 if(!ledger)throw Error('8H original physical 8A stock owner unavailable');
 const source=ledger.inventory(sourceBin.id).find(l=>l.id===sourceLotId);
 if(!source||DRY_DENIED.has(source.materialId)||
    source.grade==null||!finite(source.grade)||
    source.massKg+EPS<massKg)
  throw Error('8H original dry source lot absent in receiving depot or is gas/liquid');
 const originalKg=ledger.inventory().reduce((s,l)=>s+l.massKg,0);
 const old=ledger.operations().find(op=>op.id===jobId);
 if(old){
  if(old.status!=='COMMITTED'||old.lotId!==sourceLotId||
    old.destinationId!==targetBin.id||
    Math.abs(old.massKg-massKg)>EPS)
   throw Error('8H original feed receipt replay conflicts with existing custody');
  return {duplicate:true,materials8a:cp(materials8a),
   receipt:cp(old),gasCreatedKg:0,energyGrantedJ:0};
 }
 ledger.reserve(jobId,sourceLotId,targetBin.id,massKg);
 const receipt=ledger.commit(jobId);
 const result=ledger.snapshot(),
  afterKg=ledger.inventory().reduce((s,l)=>s+l.massKg,0);
 if(Math.abs(originalKg-afterKg)>EPS)
  throw Error('8H original surface intake transit broke 8A mass conservation');
 return{duplicate:false,materials8a:result,
  receipt:{...receipt,mode:'EVA_MANUAL_LAST_METRE',bodyId,
   plantId:plant.id,depotId:depot.id,actualCarryScene:distance},
  gasCreatedKg:0,energyGrantedJ:0,
  sourceContainerId:sourceBin.id,targetContainerId:targetBin.id};
}
root.StarfallIndustrialDryFeed8H=Object.freeze({transfer,MAX_MASS,
 MAX_DEPOT_HOP,MAX_EVA_REACH,DRY_DENIED});
if(typeof module!=='undefined'&&module.exports)
 module.exports=root.StarfallIndustrialDryFeed8H;
})(typeof globalThis!=='undefined'?globalThis:this);
