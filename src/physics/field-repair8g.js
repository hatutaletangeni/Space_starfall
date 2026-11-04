/* STARFALL 8G — physically accountable component replacement.
 * A real manufactured spare becomes one installed replacement; one old
 * damaged component becomes a same-mass scrap lot in the original hold.
 * Never repairs an unqualified rocket into a launch-ready vehicle, or
 * an empty habitat into a habitable shelter.
 */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7;
const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const name=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const REPAIRS=Object.freeze({
 rocket_stage_dry:{part:'rocket_valve_set',kg:9.4,workJ:600000,gain:.18},
 habitat_envelope:{part:'habitat_seal_kit',kg:20.8,workJ:750000,gain:.20},
 vehicle_frame:{part:'brake_caliper',kg:3,workJ:260000,gain:.12}
});
function operate(a){
 const rule=REPAIRS[a?.asset?.type];
 if(!rule||!name(a.assetId)||!name(a.jobId)||!a.jobId.startsWith('repair8g:')||
  !name(a.containerId)||!name(a.bodyId))throw Error('Unsupported 8G repair operation');
 if(!a.physical||a.physical.schema!==1||!Array.isArray(a.physical.assets)||
   !a.materials||a.materials.schema!==1||!Array.isArray(a.materials.containers)||
   !Array.isArray(a.materials.lots)||!Array.isArray(a.materials.operations))
  throw Error('8A authoritative custody snapshots required');
 const owned=a.physical.assets.find(x=>x.id===a.assetId);
 if(!owned||owned.type!==a.asset.type||owned.location?.kind!=='surface'||
   owned.location.bodyId!==a.bodyId)throw Error('Repair requires a surface-owned asset on this world');
 if(!number(owned.massKg)||!number(owned.volumeM3)||!number(owned.condition)||
   owned.condition>=.999||owned.condition<.15)throw Error('Asset is already healthy or too damaged for field replacement');
 if(a.physical.assets.filter(x=>x.id===a.assetId).length!==1)throw Error('Duplicate physical asset');
 if(!a.landed||!a.eva||!a.shipPowered||
   !number(a.bodyRadius)||a.bodyRadius<=0)throw Error('Landed powered ship and EVA required');
 const radial=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&
   Math.abs(Math.hypot(...x)-1)<1e-4;
 if(!radial(a.evaLocal)||!radial(a.shipLocal)||!radial(owned.location.local))
  throw Error('Invalid world-fixed repair pose');
 const distance=(x,y)=>Math.acos(Math.max(-1,Math.min(1,
  x.reduce((sum,v,i)=>sum+v*y[i],0))))*a.bodyRadius;
 if(distance(owned.location.local,a.evaLocal)>15||
    distance(owned.location.local,a.shipLocal)>80)throw Error('Repair requires nearby EVA and ship power umbilical');
 if(!a.materials.containers.some(c=>c.id===a.containerId&&c.ownerId==='ship-main'))
  throw Error('Replacement hardware must originate in the physical ship cargo hold');
 const old=owned.state?.fieldRepairs8g||[];
 if(old.some(x=>x.jobId===a.jobId))return{duplicate:true,receipt:clone(old.find(x=>x.jobId===a.jobId)),
  materials:clone(a.materials),physical:clone(a.physical)};
 if(a.physical.assets.some(x=>x.id===a.jobId))throw Error('Repair ID collides with physical asset');
 const receipt=a.powerReceipt;
 if(!receipt||receipt.operationId!==a.jobId||receipt.status!=='COMMITTED'||
   receipt.sourceId!=='ship-main:engineering-battery'||!number(receipt.usedJ)||
   receipt.usedJ+EPS<rule.workJ)throw Error('Actual paid ship battery repair energy receipt required');
 const candidates=a.materials.lots.filter(l=>l.containerId===a.containerId&&
   l.materialId===rule.part&&number(l.grade)&&l.grade>=.98&&name(l.provenance)&&
   number(l.massKg)&&l.massKg+EPS>=rule.kg);
 const reserved=l=>a.materials.operations.filter(x=>x.status==='RESERVED'&&x.lotId===l.id)
   .reduce((s,x)=>s+x.massKg,0);
 const stock=candidates.find(l=>l.massKg-reserved(l)+EPS>=rule.kg);
 if(!stock)throw Error('Missing unreserved certified manufactured replacement: '+rule.part);
 const materials=clone(a.materials),physical=clone(a.physical),
   consumed=materials.lots.find(x=>x.id===stock.id);
 const before=materials.lots.reduce((s,x)=>s+x.massKg,0)+physical.assets.reduce((s,x)=>s+x.massKg,0);
 const partVol=consumed.volumeM3*rule.kg/consumed.massKg;
 consumed.massKg=Math.max(0,consumed.massKg-rule.kg);
 consumed.volumeM3=Math.max(0,consumed.volumeM3-partVol);
 if(consumed.massKg<EPS)materials.lots=materials.lots.filter(x=>x.id!==stock.id);
 const scrapId='scrap:'+a.jobId;
 if(materials.lots.some(x=>x.id===scrapId))throw Error('Repair scrap ID already exists');
 materials.lots.push({id:scrapId,materialId:'manufacturing_scrap',containerId:a.containerId,
  massKg:rule.kg,volumeM3:partVol,grade:0,
  provenance:'removed damaged '+rule.part+' from '+a.assetId});
 const installed=physical.assets.find(x=>x.id===a.assetId),conditionBefore=installed.condition;
 installed.condition=Math.min(.999,conditionBefore+rule.gain);
 const repair={jobId:a.jobId,assetId:a.assetId,part:rule.part,kg:rule.kg,
  sourceLotId:stock.id,scrapLotId:scrapId,energyJ:rule.workJ,
  conditionBefore,conditionAfter:installed.condition};
 installed.state={...installed.state,fieldRepairs8g:[...old,repair]};
 const after=materials.lots.reduce((s,x)=>s+x.massKg,0)+physical.assets.reduce((s,x)=>s+x.massKg,0);
 if(Math.abs(before-after)>EPS)throw Error('Physical repair violated total mass conservation');
 if(!root.StarfallMaterials8A||!root.StarfallPhysical8A)
  throw Error('8A ledger validators unavailable');
 root.StarfallMaterials8A.create(materials);
 root.StarfallPhysical8A.create(physical);
 return{duplicate:false,receipt:clone(repair),materials,physical};
}
root.StarfallFieldRepair8G=Object.freeze({REPAIRS,operate});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallFieldRepair8G;
})(typeof globalThis!=='undefined'?globalThis:this);
