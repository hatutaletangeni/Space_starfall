/* STARFALL 8K — conservative read-only expedition evidence audit.
 * One snapshot; NO materials, vehicles, air or milestones are awarded.
 * This is NOT an automatic certificate for a no-cheat two-world expedition.
 * It intentionally distinguishes historical receipts from unassisted proof.
 */
(function(root){'use strict';
const arr=x=>Array.isArray(x)?x:[],obj=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const valid=x=>typeof x==='string'&&x.length>0;
const artifact=x=>typeof x==='string'&&/TEST_FIXTURE|CREATIVE|DEBUG|CHEAT/i.test(x);
const owned=r=>r&&r.status==='COMMITTED'&&!artifact(r.sourceProvenance)&&
 !artifact(r.provenance)&&!artifact(r.id);
const has=(rs,where)=>rs.some(x=>owned(x)&&where(x));
function evaluate(saved){
 const s=obj(saved),materials=obj(s.materials8a),assets=arr(obj(s.physical8a).assets),
  operations=arr(materials.operations),survey=obj(s.resources8c),
  refinery=arr(obj(s.refinery8e).receipts),factory=arr(obj(s.factory8f).receipts),
  assembly=arr(obj(s.vehicleAssembly8g).receipts),
  offworld=arr(obj(s.logisticsOffworldManifests8h).manifests),
  habitats=arr(obj(s.outpost5).items).filter(x=>x?.kind==='hab'&&x.habT09?.schema===1),
  worlds=Object.values(obj(s.terraformWorlds8j)).filter(x=>x&&typeof x==='object'),
  genuineLots=arr(materials.lots).filter(x=>x&&valid(x.id)&&!artifact(x.provenance));
 const stages=[];
 const push=(id,title,evidence,requirement)=>stages.push({id,title,
  status:evidence?'EVIDENCE':'NOT_PROVEN',requirement});
 const starting= s.freshExpedition?.schema===1&&
  s.initialIndustrialManifest8k?.status==='COMMITTED';
 push('manifest','Finite original expedition manifest',starting,
  'Explicit new industrial start and one-time committed manifest');
 const trucks=assets.filter(x=>x?.id==='truck-expedition-001');
 push('original_truck','Original truck identity',trucks.length===1&&
  valid(trucks[0]?.location?.kind),
  'Exactly one persistent starter truck record; no duplicate original ID');
 push('survey','Planet-fixed geology surveyed',arr(survey.surveys).length>0,
  'Actual geological observations on a stable body');
 push('mining','Finite ore physically mined and depleted',
  arr(survey.depletions).some(x=>x?.massKg>0)&&
  arr(survey.transactions).some(x=>x?.status==='COMMITTED'),
  'Original surveyed 8C deposit physically depleted by 8D');
 const refined=refinery.filter(owned);
 const rawModes=refined.map(x=>(x.product||'')+' '+(x.mode||''));
 push('refine','Copper, iron and water processed',
  ['copper','iron','water'].every(q=>rawModes.some(x=>x.includes(q))),
  'All three outputs in source-paid refinery receipts');
 const outputs=factory.filter(owned).map(x=>x.recipeId);
 push('electrical','Electrical subassembly physically fabricated',
  outputs.includes('copper_wire')&&
  outputs.some(x=>['populated_board','pcb','insulated_wire','stator','motor'].includes(x)),
  'Refined copper conductor and a functional electrical subassembly');
 push('energy','Energy component manufactured',
  outputs.some(x=>['solar_module','battery_cell'].includes(x)),
  'Original 8F solar module or battery cell with actual part and power receipts');
 push('vehicle','Replacement vehicle commissioned',
  assembly.some(x=>owned(x)&&['truck','science_rover'].includes(x.blueprintId))&&
  assets.some(x=>['truck','rover'].includes(x.type)&&x.id!=='truck-expedition-001'&&
   x.id!=='rover-science-001'&&!artifact(x.provenance)),
  'Another unique physical vehicle from full 8G BOM; original remains accounted for');
 push('interplanetary','Physical off-world delivery',
  offworld.some(x=>x?.status==='DELIVERED'&&
   valid(x.sourceWorldId)&&valid(x.destinationWorldId)&&
   x.sourceWorldId!==x.destinationWorldId),
  'Original ship physically flies a paid 8H cargo manifest to another world');
 // No-cheat 8K MUST NOT accept an old one-click free outpost5 habitat.
 // The native T09 simulation and 8G paid pressure envelope are presently
 // distinct owners; require explicit nonduplicating physical linkage.
 // A physical 8G envelope may commission at most one T09 structure. Duplicate
 // outpost claims cannot independently satisfy habitat or greenhouse evidence.
 const physicalHabitat=hab=>hab.physicalAssetId&&
  habitats.filter(x=>x.physicalAssetId===hab.physicalAssetId).length===1&&
  assets.filter(a=>a.id===hab.physicalAssetId&&a.type==='habitat_envelope').length===1&&
  assets.find(a=>a.id===hab.physicalAssetId&&
  a.type==='habitat_envelope'&&
  a.location?.kind==='surface'&&a.location.bodyId===hab.bodyId&&
  valid(a.provenance)&&!artifact(a.provenance)&&
  a.provenance.startsWith('structural-8g:')&&
  arr(obj(s.vehicleAssembly8g).receipts).filter(r=>r.id===a.provenance.slice('structural-8g:'.length)).length===1&&
  arr(obj(s.vehicleAssembly8g).receipts).filter(r=>r.assetId===a.id&&r.blueprintId==='habitat_shell').length===1&&
  arr(obj(s.vehicleAssembly8g).receipts).some(r=>
   r.assetId===a.id&&r.blueprintId==='habitat_shell'&&
   owned(r)&&valid(r.id)&&a.provenance==='structural-8g:'+r.id));
 const readyHab=habitats.filter(x=>x.enabled!==false&&x.habT09.enabled===true&&physicalHabitat(x));
 push('habitat','8G-linked T09 sealed habitat and stored life support',
  readyHab.some(x=>x.habT09.waterL>0&&x.habT09.oxygenTankMol>0&&
   x.habT09.scrubberCapacityMol>0&&x.habT09.airlock==='CLOSED'),
  'Original 8G paid pressure-envelope linked to same T09; sealed source-paid water, oxygen and scrubber. Free legacy outpost placement is NOT 8K evidence.');
 push('greenhouse','8G-linked greenhouse produced physical biomass',
  readyHab.some(x=>x.habT09.greenhouse8i?.installed===true&&
    x.habT09.greenhouse8i?.carbonConsumedMol>0&&
    x.habT09.greenhouse8i?.oxygenProducedMol>0&&
    has(operations,r=>r.kind==='HABITAT_GREENHOUSE_8I'&&r.habitatId===x.id)),
  'Physically paid 8G shell, source-owned 8F greenhouse and T02-powered photosynthesis.');
 push('terraform','Planet atmosphere materially changed',
  worlds.some(w=>arr(w.receipts).some(x=>owned(x)&&
    x.kind==='PLANET_ATMOSPHERE_EMISSION_8J'&&x.massKg>0&&
    x.sourceBatteryJBefore>x.sourceBatteryJAfter)),
  'Source-paid gas emitted on a valid world; preserved small pressure receipt');
 push('legacy','Old-save compatibility and return journey',false,
  'Unassisted old-save/revisit verification has no self-certifying durable source receipt');
 push('gpu','Real GPU and sustained frame-time test',false,
  'External physical GPU measurement, not software-generated estimate');
 const observed=stages.filter(x=>x.status==='EVIDENCE').length;
 return{schema:1,observed,total:stages.length,stages,
  evidenceComplete:observed===stages.length,
  certified:false,claim:'NOT VERIFIED: full 8K requires unassisted physical end-to-end browser expedition, old-save and GPU verification.',
  integrity:{originalTruckCount:trucks.length,realLotCount:genuineLots.length,
   suspiciousFixtureLots:arr(materials.lots).filter(x=>artifact(x?.provenance)).length}};
}
const API=Object.freeze({evaluate});
root.StarfallExpeditionAudit8K=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
