/* STARFALL 8G — finite structural repair.
 * Consumes physically manufactured finished parts, transfers the same mass
 * of removed damaged hardware into a bounded real 8A ship scrap lot, debits
 * actual ship electrical work, and retains original 8A structure identity.
 * This restores structural condition only. It NEVER certifies a fueled rocket,
 * pressure-tight habitat, breathing air, or qualified propulsion.
 */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7;
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const ident=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const SPECS=Object.freeze({
 rocket_stage_dry:{parts:{steel_bracket:7.5,copper_busbar:.48,glass_panel:.55},
  workJ:1250000,gain:.25,station:'rocket_integration'},
 habitat_envelope:{parts:{steel_bracket:15,glass_panel:1.1,copper_busbar:.48},
  workJ:1750000,gain:.25,station:'habitat_pad'}
});
function prepare(a){
 const p=a?.physical,m=a?.materials;
 if(!ident(a?.jobId)||!a.jobId.startsWith('repair8g:')||
    !ident(a.assetId)||!ident(a.containerId)||!ident(a.bodyId)||
    !p||p.schema!==1||!Array.isArray(p.assets)||
    !m||m.schema!==1||!Array.isArray(m.lots)||!Array.isArray(m.operations)||
    !Array.isArray(m.containers))throw Error('Authoritative repair IDs and 8A owner ledgers required');
 const target=p.assets.find(x=>x.id===a.assetId);
 const spec=SPECS[target?.type];
 if(!spec||target.location?.kind!=='surface'||target.location.bodyId!==a.bodyId||
    !valid(target.condition)||target.condition<.1)throw Error('Only a damaged, intact on-world manufactured stage or habitat can be repaired');
 const past=target.state?.repairReceipts||[];
 if(!Array.isArray(past))throw Error('Corrupt persisted structure repair history');
 const prior=past.find(x=>x.id===a.jobId);
 if(prior){
  if(prior.assetId!==a.assetId||prior.bodyId!==a.bodyId)throw Error('Repair job ID collision');
  return {duplicate:true,receipt:clone(prior),asset:clone(target)};
 }
 if(target.condition>=.999)throw Error('Structure is already fully repaired');
 if(target.state?.commissioned===true||target.state?.operational===true)
  throw Error('Structural repair cannot alter active or commissioned equipment');
 const facility=p.assets.find(x=>x.id===target.state?.assemblyFacilityId);
 if(!facility||facility.type!=='industrial_plant'||facility.state?.station!==spec.station||
    facility.state?.enabled===false||!valid(facility.condition)||facility.condition<.5||
    facility.location?.kind!=='surface'||facility.location.bodyId!==a.bodyId)
  throw Error('Original physical repair/integration facility required');
 const container=m.containers.find(x=>x.id===a.containerId&&ident(x.ownerId));
 if(!container)throw Error('Physical output/source ship container required');
 if(p.assets.some(x=>x.id===a.jobId)||m.lots.some(x=>x.id==='repair-scrap:'+a.jobId))
  throw Error('Repair job or salvage lot already allocated');
 const reserved=new Map();
 for(const op of m.operations)if(op.status==='RESERVED'){
  if(!ident(op.lotId)||!valid(op.massKg))throw Error('Invalid pending material reservation');
  reserved.set(op.lotId,(reserved.get(op.lotId)||0)+op.massKg);
 }
 const takes=[],shortages=[];
 for(const [part,need] of Object.entries(spec.parts)){
  let left=need;
  for(const lot of m.lots){
   if(lot.materialId!==part||lot.containerId!==a.containerId||
      !valid(lot.grade)||lot.grade<.98||!ident(lot.provenance)||
      !valid(lot.massKg)||!valid(lot.volumeM3))continue;
   const held=reserved.get(lot.id)||0;
   if(held>lot.massKg+EPS)throw Error('Over-reserved structural repair hardware');
   const qty=Math.min(Math.max(0,lot.massKg-held),left);
   if(qty>EPS){takes.push({lotId:lot.id,materialId:part,massKg:qty,
    volumeM3:lot.volumeM3*qty/lot.massKg});left-=qty;}
   if(left<=EPS)break;
  }
  if(left>EPS)shortages.push({materialId:part,missingKg:left});
 }
 const e=a.powerReceipt;
 if(!e||e.status!=='COMMITTED'||e.operationId!==a.jobId||
    e.sourceId!=='ship-main:engineering-battery'||!valid(e.usedJ)||e.usedJ+EPS<spec.workJ)
  throw Error('Committed source-owned ship electrical repair debit required');
 return {target,spec,takes,shortages,kg:Object.values(spec.parts).reduce((s,x)=>s+x,0),
  volumeM3:takes.reduce((s,x)=>s+x.volumeM3,0)};
}
function quote(a){
 const p=prepare(a);
 if(p.duplicate)return{duplicate:true,receipt:p.receipt};
 return{ready:!p.shortages.length,shortages:clone(p.shortages),
  replacementMassKg:p.kg,energyJ:p.spec.workJ,conditionBefore:p.target.condition,
  conditionAfter:Math.min(1,p.target.condition+p.spec.gain),
  salvageMaterialId:'manufacturing_scrap',certifiesOperations:false};
}
function repair(a){
 const p=prepare(a);
 if(p.duplicate)return{duplicate:true,receipt:p.receipt,
  physical:clone(a.physical),materials:clone(a.materials)};
 if(p.shortages.length)throw Error('Missing certified replacement parts: '+
  p.shortages.map(x=>x.materialId).join(', '));
 const materials=clone(a.materials),physical=clone(a.physical),
  before=materials.lots.reduce((s,x)=>s+x.massKg,0)+
   physical.assets.reduce((s,x)=>s+x.massKg,0);
 for(const item of p.takes){
  const lot=materials.lots.find(x=>x.id===item.lotId);
  const m0=lot.massKg;
  lot.massKg=Math.max(0,m0-item.massKg);
  lot.volumeM3=m0?lot.volumeM3*(lot.massKg/m0):0;
 }
 materials.lots=materials.lots.filter(x=>x.massKg>EPS);
 const scrap={id:'repair-scrap:'+a.jobId,materialId:'manufacturing_scrap',
   containerId:a.containerId,massKg:p.kg,volumeM3:p.volumeM3,
   grade:.25,provenance:'removed-damaged-physical-hardware:'+a.assetId};
 materials.lots.push(scrap);
 // This is a replacement operation: new parts displace equal-mass failed
 // hardware; structural mass does not grow. Removed hardware is recoverable scrap.
 const target=physical.assets.find(x=>x.id===a.assetId);
 const previousCondition=target.condition;
 target.condition=Math.min(1,target.condition+p.spec.gain);
 const receipt={id:a.jobId,assetId:a.assetId,bodyId:a.bodyId,status:'COMMITTED',
  consumedLots:clone(p.takes),salvageLotId:scrap.id,
  massKg:p.kg,energyJ:p.spec.workJ,conditionBefore:previousCondition,
  conditionAfter:target.condition,
  statusNote:'STRUCTURAL_REPAIR_ONLY_NO_PROPULSION_OR_PRESSURE_CERTIFICATION'};
 target.state.repairReceipts=[...(target.state.repairReceipts||[]),receipt].slice(-100);
 const checkedMaterials=root.StarfallMaterials8A.create(materials).snapshot();
 const checkedPhysical=root.StarfallPhysical8A.create(physical).serialize();
 const after=checkedMaterials.lots.reduce((s,x)=>s+x.massKg,0)+
  checkedPhysical.assets.reduce((s,x)=>s+x.massKg,0);
 if(Math.abs(after-before)>EPS)throw Error('Structural repair created or destroyed mass');
 return{duplicate:false,receipt,asset:clone(target),materials:checkedMaterials,physical:checkedPhysical};
}
root.StarfallStructureRepair8G=Object.freeze({SPECS,quote,repair});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallStructureRepair8G;
})(typeof globalThis!=='undefined'?globalThis:this);
