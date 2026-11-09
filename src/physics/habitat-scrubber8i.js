/* 8I — manufactured sorbent refill for the EXISTING T09 carbon scrubber.
 * Source must be already manufactured, not ore. Zeolite and binder are
 * consumed by the existing 8F press BOM, giving a real replaceable lot.
 * Simplified working capacity: 80g CO2 / kg installed sorbent.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),RATIO=.08/.04401,WORK_J_KG=50000,MAX_BATCH_KG=10;
const ok=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const ident=x=>typeof x==='string'&&x.length>0&&x.length<=128;
function arc(a,b,r){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==3||b.length!==3||
    !a.every(Number.isFinite)||!b.every(Number.isFinite)||!ok(r)||r<=0)
  throw Error('8I requires original body-fixed geometry');
 if(Math.abs(Math.hypot(...a)-1)>1e-4||Math.abs(Math.hypot(...b)-1)>1e-4)
  throw Error('8I invalid surface radial coordinates');
 return Math.acos(Math.max(-1,Math.min(1,a.reduce((s,v,i)=>s+v*b[i],0))))*r;
}
function refill(a){
 if(!a||!ident(a.operationId)||!a.operationId.startsWith('habscrub8i:')||
 !ident(a.sourceLotId)||!ident(a.bodyId)||!ident(a.habitatId)||
 !ok(a.kg)||a.kg<=0||a.kg>MAX_BATCH_KG||!ok(a.shipEnergyJ)||
 !a.materials||a.materials.schema!==1||!Array.isArray(a.materials.containers)||
 !Array.isArray(a.materials.lots)||!Array.isArray(a.materials.operations)||
 !a.habitat||a.habitat.id!==a.habitatId||a.habitat.kind!=='hab'||
 a.habitat.bodyId!==a.bodyId||a.habitat.habT09?.schema!==1||
 a.habitat.enabled===false||!ok(a.habitat.condition)||a.habitat.condition<=.02)
  throw Error('8I requires existing original T09, manufactured sorbent and physical ship');
 const prior=a.materials.operations.find(x=>x.id===a.operationId);
 if(prior){
  if(prior.kind!=='HABITAT_SCRUBBER_8I'||prior.lotId!==a.sourceLotId||
   prior.habitatId!==a.habitatId||prior.massKg!==a.kg)
   throw Error('Conflicting T09 scrubber replacement receipt');
  if(prior.status!=='COMMITTED')throw Error('Cannot repeat unfinished scrubber operation');
  return{duplicate:true,materials:cp(a.materials),habitat:cp(a.habitat),
   shipEnergyJ:a.shipEnergyJ,receipt:cp(prior)};
 }
 if(!a.shipLanded||!a.operatorEVA||!a.shipPowered)
  throw Error('Powered landed ship and actual EVA needed for media replacement');
 if(arc(a.habitat.local,a.evaLocal,a.bodyRadius)>24||
    arc(a.habitat.local,a.shipLocal,a.bodyRadius)>100)
  throw Error('8I operator and ship must physically approach original T09');
 const h=a.habitat.habT09;
 if(h.airlock!=='CLOSED')throw Error('8I scrubber replacement requires closed airlock');
 if(!ok(h.scrubberCapacityMol)||!ok(h.filteredAirMol)||
   h.scrubberCapacityMol+a.kg*RATIO>25000)
  throw Error('T09 scrubber unit capacity insufficient');
 const container=a.materials.containers.find(x=>x.id===a.shipContainerId&&x.ownerId==='ship-main');
 if(!container)throw Error('8I scrubber media must be on real ship');
 const lot=a.materials.lots.find(x=>x.id===a.sourceLotId&&x.containerId===container.id&&
   x.materialId==='scrubber_media'&&ok(x.massKg)&&x.massKg>=a.kg-1e-8&&
   ok(x.grade)&&x.grade>=.98&&ident(x.provenance));
 if(!lot)throw Error('8I requires existing fabricated, high-grade scrubber_media lot');
 const held=a.materials.operations.filter(o=>o.status==='RESERVED'&&o.lotId===lot.id)
  .reduce((s,o)=>s+o.massKg,0);
 if(lot.massKg-held<a.kg-1e-8)throw Error('8I sorbent stock reserved for another job');
 const workJ=a.kg*WORK_J_KG;
 if(a.shipEnergyJ+1e-8<workJ)throw Error('8I ship battery lacks scrubber service work');
 const materials=cp(a.materials),habitat=cp(a.habitat),l=materials.lots.find(x=>x.id===lot.id);
 const usedVolume=l.volumeM3*a.kg/l.massKg;
 if(l.massKg-a.kg<=1e-8)materials.lots.splice(materials.lots.indexOf(l),1);
 else{l.massKg-=a.kg;l.volumeM3=Math.max(0,l.volumeM3-usedVolume);}
 habitat.habT09.scrubberCapacityMol+=a.kg*RATIO;
 habitat.habT09.scrubberMediaInstalledKg=(habitat.habT09.scrubberMediaInstalledKg||0)+a.kg;
 const receipt={id:a.operationId,kind:'HABITAT_SCRUBBER_8I',status:'COMMITTED',
  habitatId:a.habitatId,lotId:a.sourceLotId,massKg:a.kg,
  adsorbableCarbonDioxideMol:a.kg*RATIO,sourceProvenance:lot.provenance,
  sourceContainerId:container.id,bodyId:a.bodyId,workJ,
  energySourceId:'ship-main:engineering-battery',
  sourceBatteryJBefore:a.shipEnergyJ,sourceBatteryJAfter:a.shipEnergyJ-workJ,
  destination:'outpost5:'+a.habitatId+':habT09.scrubberCapacityMol'};
 materials.operations.push(receipt);
 root.StarfallMaterials8A?.create(materials);
 return{duplicate:false,materials,habitat,shipEnergyJ:a.shipEnergyJ-workJ,receipt};
}
root.StarfallScrubberSupply8I=Object.freeze({refill,RATIO,WORK_J_KG,MAX_BATCH_KG});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallScrubberSupply8I;
})(typeof globalThis!=='undefined'?globalThis:this);
