/* STARFALL 8I — rated oxygen vessel -> actual T09 habitat reserve.
 * An O2 cylinder receives only physically transferred gas. The source is an
 * existing 8G/8E rated vessel's original 8A container, not a virtual supply.
 * No greenhouse, new habitat asset, free N2, or hidden air generation.
 */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),EPS=1e-8,OXYGEN_KG_PER_MOL=.031998;
const WORK_J_PER_KG=60000,MAX_BATCH_KG=20,MAX_O2_TANK_MOL=25000;
const good=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
function arc(a,b,r){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==3||b.length!==3||
  !a.every(Number.isFinite)||!b.every(Number.isFinite)||!good(r)||!r)
  throw Error('8I needs original body-fixed positions');
 if(Math.abs(Math.hypot(...a)-1)>1e-4||Math.abs(Math.hypot(...b)-1)>1e-4)
  throw Error('8I invalid physical radial coordinates');
 return Math.acos(Math.max(-1,Math.min(1,a.reduce((s,x,i)=>s+x*b[i],0))))*r;
}
function transfer(a){
 if(!a||!id(a.operationId)||!a.operationId.startsWith('haboxygen8i:')||
 !id(a.habitatId)||!id(a.vesselId)||!id(a.sourceLotId)||!id(a.bodyId)||
 !good(a.kg)||a.kg<=0||a.kg>MAX_BATCH_KG||!good(a.shipEnergyJ)||
 !good(a.bodyRadius)||a.bodyRadius<=0||
 !a.materials||a.materials.schema!==1||!Array.isArray(a.materials.lots)||
 !Array.isArray(a.materials.containers)||!Array.isArray(a.materials.operations)||
 !a.physical||a.physical.schema!==1||!Array.isArray(a.physical.assets)||
 !a.habitat||a.habitat.kind!=='hab'||a.habitat.id!==a.habitatId||
 a.habitat.bodyId!==a.bodyId||a.habitat.habT09?.schema!==1||
 a.habitat.enabled===false||!good(a.habitat.condition)||a.habitat.condition<=.02)
  throw Error('8I requires valid original 8A oxygen, rated vessel and T09 habitat');
 const prior=a.materials.operations.find(o=>o.id===a.operationId);
 if(prior){
  if(prior.kind!=='HABITAT_OXYGEN_8I'||prior.habitatId!==a.habitatId||
    prior.vesselId!==a.vesselId||prior.lotId!==a.sourceLotId||prior.massKg!==a.kg)
   throw Error('Conflicting 8I oxygen receipt');
  if(prior.status!=='COMMITTED')throw Error('Uncommitted oxygen operation cannot replay');
  return{duplicate:true,materials:clone(a.materials),habitat:clone(a.habitat),
   shipEnergyJ:a.shipEnergyJ,receipt:clone(prior)};
 }
 if(!a.shipLanded||!a.operatorEVA||!a.shipPowered)
  throw Error('8I requires landed powered ship and local EVA supervision');
 const h=a.habitat,hs=h.habT09;
 if(hs.airlock!=='CLOSED')throw Error('Close the actual habitat airlock before oxygen servicing');
 if(arc(h.local,a.evaLocal,a.bodyRadius)>24||
    arc(h.local,a.shipLocal,a.bodyRadius)>100)
  throw Error('8I oxygen hatch requires EVA within 24 and ship within 100');
 const vessel=a.physical.assets.find(x=>x.id===a.vesselId);
 if(!vessel||vessel.type!=='industrial_vessel'||vessel.state?.materialId!=='oxygen'||
  vessel.state?.enabled!==true||!good(vessel.condition)||vessel.condition<.8||
  !good(vessel.state.ratedPressurePa)||vessel.state.ratedPressurePa<5e6)
  throw Error('An intact enabled >=5 MPa rated original oxygen pressure vessel is required');
 let place;
 if(vessel.location?.kind==='surface'&&vessel.location.bodyId===a.bodyId)place=vessel.location.local;
 else if(vessel.location?.kind==='ship'&&vessel.location.parentId==='ship-main'&&
         vessel.location.slot==='engineering-gas-cradle')place=a.shipLocal;
 else throw Error('Oxygen vessel must be physically present on the same planet or secured in ship cradle');
 if(arc(place,h.local,a.bodyRadius)>95||arc(place,a.evaLocal,a.bodyRadius)>95)
  throw Error('8I rated oxygen hose is out of physical reach');
 const container=a.materials.containers.find(c=>c.id===vessel.state.containerId&&c.ownerId===vessel.id);
 if(!container||!String(container.kind).includes('gas')||
 !good(container.maxMassKg)||!good(container.maxVolumeM3))
  throw Error('Existing oxygen vessel lacks the actual rated gas container');
 const lot=a.materials.lots.find(x=>x.id===a.sourceLotId&&x.containerId===container.id&&x.materialId==='oxygen');
 if(!lot||!good(lot.massKg)||lot.massKg+EPS<a.kg||
 !good(lot.volumeM3)||lot.volumeM3<=EPS||!good(lot.grade)||lot.grade<.98||
 !id(lot.provenance))
  throw Error('Insufficient high-purity source-owned compressed oxygen lot');
 const contents=a.materials.lots.filter(x=>x.containerId===container.id);
 if(contents.some(x=>x.materialId!=='oxygen')||
 contents.reduce((s,x)=>s+x.massKg,0)>container.maxMassKg+EPS||
 contents.reduce((s,x)=>s+x.volumeM3,0)>container.maxVolumeM3+EPS)
  throw Error('Contaminated or overloaded rated vessel');
 const gasKg=contents.reduce((s,x)=>s+x.massKg,0),volumeM3=contents.reduce((s,x)=>s+x.volumeM3,0);
 const pressurePa=(gasKg/OXYGEN_KG_PER_MOL)*8.314462618*293.15/volumeM3;
 if(!Number.isFinite(pressurePa)||pressurePa>vessel.state.ratedPressurePa+100||pressurePa<100000)
  throw Error('Oxygen source gas compression violates rated vessel pressure');
 const held=a.materials.operations.filter(o=>o.status==='RESERVED'&&o.lotId===lot.id)
  .reduce((s,o)=>s+o.massKg,0);
 if(lot.massKg-held+EPS<a.kg)throw Error('Oxygen committed to another reserved operation');
 const moles=a.kg/OXYGEN_KG_PER_MOL;
 if(!good(hs.oxygenTankMol)||hs.oxygenTankMol+moles>MAX_O2_TANK_MOL+EPS)
  throw Error('T09 oxygen bottle lacks storage capacity');
 const workJ=a.kg*WORK_J_PER_KG;
 if(a.shipEnergyJ+EPS<workJ)throw Error('Insufficient original ship battery for rated oxygen transfer');
 const materials=clone(a.materials),habitat=clone(h),source=materials.lots.find(x=>x.id===lot.id);
 const beforeMass=source.massKg,removeVolume=source.volumeM3*a.kg/source.massKg;
 if(a.kg>=source.massKg-EPS)materials.lots.splice(materials.lots.indexOf(source),1);
 else{source.massKg-=a.kg;source.volumeM3=Math.max(0,source.volumeM3-removeVolume);}
 habitat.habT09.oxygenTankMol+=moles;
 const receipt={id:a.operationId,kind:'HABITAT_OXYGEN_8I',status:'COMMITTED',
  habitatId:h.id,vesselId:vessel.id,lotId:lot.id,sourceContainerId:container.id,
  massKg:a.kg,moles,workJ,energySourceId:'ship-main:engineering-battery',
  sourceBatteryJBefore:a.shipEnergyJ,sourceBatteryJAfter:a.shipEnergyJ-workJ,
  sourceProvenance:lot.provenance,bodyId:a.bodyId,
  destination:'outpost5:'+h.id+':habT09.oxygenTankMol'};
 materials.operations.push(receipt);
 root.StarfallMaterials8A?.create(materials);
 return{duplicate:false,materials,habitat,shipEnergyJ:a.shipEnergyJ-workJ,receipt};
}
const API=Object.freeze({transfer,WORK_J_PER_KG,MAX_BATCH_KG,MAX_O2_TANK_MOL,OXYGEN_KG_PER_MOL});
root.StarfallHabitatOxygen8I=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
