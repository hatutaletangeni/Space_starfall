/* STARFALL 8I — physical ship-water → original T09 habitat transfer.
 * Never creates stock: the original 8A water lot is debited while the same
 * existing outpost5 habitat water reservoir receives its mass. One operation
 * returns full detached snapshots; the runtime commits both in one SF.save.
 * 1 kg water ≈ 1 L (20 C liquid density approximation).
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-8;
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const validId=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const WORK_J_PER_KG=25000,MAX_KG=50,MAX_WATER_L=2000,MAX_EVA_RANGE=24,MAX_SHIP_RANGE=100;
function arc(a,b,r){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==3||b.length!==3||
  !a.every(Number.isFinite)||!b.every(Number.isFinite)||!finite(r)||r<=0)
  throw Error('8I needs physical world-fixed positions');
 const na=Math.hypot(...a),nb=Math.hypot(...b);
 if(Math.abs(na-1)>1e-4||Math.abs(nb-1)>1e-4)throw Error('8I invalid surface position');
 const dot=a.reduce((x,y,i)=>x+y*b[i],0);
 return Math.acos(Math.max(-1,Math.min(1,dot)))*r;
}
function transfer({operationId,materials,habitat,sourceLotId,shipContainerId,bodyId,
 bodyRadius,shipLocal,evaLocal,shipLanded,operatorEVA,shipPowered,shipEnergyJ,kg}){
 if(!validId(operationId)||!operationId.startsWith('habsupply8i:')||
  !validId(sourceLotId)||!validId(shipContainerId)||!validId(bodyId)||!finite(kg)||kg<=0||kg>MAX_KG||
  !finite(shipEnergyJ)||!materials||materials.schema!==1||
  !Array.isArray(materials.containers)||!Array.isArray(materials.lots)||
  !Array.isArray(materials.operations)||!habitat||habitat.kind!=='hab'||
  !validId(habitat.id)||habitat.bodyId!==bodyId||habitat.condition<=.02||
  habitat.enabled===false||habitat.habT09?.schema!==1)
  throw Error('8I needs valid existing T09 habitat, 8A stock and 0–50 kg transfer');
 const existing=materials.operations.find(x=>x.id===operationId);
 if(existing){
  if(existing.kind!=='HABITAT_WATER_8I'||existing.lotId!==sourceLotId||
     existing.massKg!==kg||existing.habitatId!==habitat.id)
   throw Error('8I operation ID reused with incompatible inputs');
  if(existing.status==='COMMITTED')return{duplicate:true,materials:cp(materials),habitat:cp(habitat),
   shipEnergyJ,receipt:cp(existing)};
  throw Error('8I pending or cancelled operation cannot replay');
 }
 if(!shipLanded||!operatorEVA||!shipPowered)
  throw Error('8I needs landed powered ship and EVA operator, not remote free resupply');
 if(arc(habitat.local,evaLocal,bodyRadius)>MAX_EVA_RANGE||
    arc(habitat.local,shipLocal,bodyRadius)>MAX_SHIP_RANGE)
  throw Error('8I operator must be within 24 and ship within 100 surface units of habitat');
 if(habitat.habT09.airlock!=='CLOSED')throw Error('8I water service requires a closed habitat airlock');
 const water=habitat.habT09.waterL;
 if(!finite(water)||water+kg>MAX_WATER_L+EPS)throw Error('8I habitat tank lacks water capacity');
 const costJ=WORK_J_PER_KG*kg;
 if(shipEnergyJ+EPS<costJ)throw Error('8I ship battery lacks actual water-pump work');
 const container=materials.containers.find(x=>x.id===shipContainerId);
 if(!container||container.ownerId!=='ship-main')throw Error('8I ship cargo source not owned by ship');
 const lot=materials.lots.find(x=>x.id===sourceLotId);
 if(!lot||lot.containerId!==shipContainerId||lot.materialId!=='water'||
  !finite(lot.massKg)||lot.massKg+EPS<kg)
  throw Error('8I insufficient real water lot in ship cargo hold');
 const reserved=materials.operations.filter(x=>x.status==='RESERVED'&&x.lotId===sourceLotId)
  .reduce((x,o)=>x+o.massKg,0);
 if(lot.massKg-reserved+EPS<kg)throw Error('8I water reserved by another operation');
 const m=cp(materials),h=cp(habitat),l=m.lots.find(x=>x.id===sourceLotId);
 const volumeRemoved=kg*l.volumeM3/l.massKg;
 if(kg>=l.massKg-EPS)m.lots.splice(m.lots.indexOf(l),1);
 else{l.massKg-=kg;l.volumeM3=Math.max(0,l.volumeM3-volumeRemoved);}
 h.habT09.waterL+=kg;
 const receipt={id:operationId,kind:'HABITAT_WATER_8I',status:'COMMITTED',
  lotId:sourceLotId,habitatId:h.id,sourceContainerId:shipContainerId,
  massKg:kg,workJ:costJ,bodyId,sourceProvenance:lot.provenance,
  destination:'outpost5:'+h.id+':habT09.waterL'};
 m.operations.push(receipt);
 // Verify the new material snapshot is loadable; never mutate the original.
 if(root.StarfallMaterials8A)root.StarfallMaterials8A.create(m);
 return{duplicate:false,materials:m,habitat:h,shipEnergyJ:shipEnergyJ-costJ,receipt};
}
const API=Object.freeze({transfer,WORK_J_PER_KG,MAX_KG,MAX_WATER_L});
root.StarfallHabitatSupply8I=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
