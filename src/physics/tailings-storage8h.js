/* Bounded, source-owned storage for original 8E mineral residues. An open
 * lined pile does not delete waste, supply factory feed, contain gases or
 * silently replace paid depots. Native ship crane work moves one <=500 kg
 * lot between the landed ship and a nearby actually constructed footprint.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7;
const ALLOWED=new Set(['iron_tailings','iron_mineralogy_tailings','spent_iron_tailings',
 'copper_tailings','sulfide_mineralogy_tailings','spent_copper_tailings',
 'carbon_ash_tailings','aluminum_tailings','aluminosilicate_mineralogy_tailings',
 'silicate_tailings','silica_polishing_tailings','hydrated_residue']);
const finite=x=>typeof x==='number'&&Number.isFinite(x),radial=x=>Array.isArray(x)&&x.length===3&&x.every(finite)&&Math.abs(Math.hypot(...x)-1)<1e-4;
const distance=(a,b,r)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((s,x,i)=>s+x*b[i],0))))*r;
function eligible(lot,refinery){
 if(!lot||!ALLOWED.has(lot.materialId)||!finite(lot.massKg)||lot.massKg<=0)return false;
 const r=refinery?.receipts?.find(r=>r.status==='COMMITTED'&&lot.provenance==='process:'+r.id);
 return !!r&&root.StarfallRefinery8E?.MODES?.[r.mode]?.residue===lot.materialId;
}
function transfer(a){
 const {jobId,materials,physical,refinery,stockpileId,lotId,massKg,bodyId,bodyRadius,
  shipLocal,evaLocal,shipLanded,operatorEVA,shipPowered,shipEnergyJ}=a;
 if(typeof jobId!=='string'||!/^8h-tailings:[\w:-]+$/.test(jobId)||jobId.length>128||
  !finite(massKg)||massKg<=0||massKg>500||!finite(shipEnergyJ)||shipEnergyJ<0)
  throw Error('Tailings crane needs a unique operation, <=500 kg and actual ship battery');
 const pile=physical?.assets?.find(x=>x.id===stockpileId),cid=pile?.state?.containerId,
  bin=materials?.containers?.find(x=>x.id===cid&&x.ownerId===stockpileId);
 if(!shipLanded||!operatorEVA||!shipPowered||!finite(bodyRadius)||bodyRadius<=0||
  !radial(shipLocal)||!radial(evaLocal)||pile?.location?.kind!=='surface'||pile.location.bodyId!==bodyId||
  !radial(pile.location.local)||pile.type!=='industrial_plant'||pile.condition<.5||
  pile.state?.enabled===false||pile.state?.kitMaterialId!=='plant_kit_tailings_stockpile'||pile.state.station!=='tailings_stockpile'||
  pile.massKg!==10||!physical.transfers?.some(t=>t.assetId===stockpileId&&t.status==='COMMITTED'&&
   t.action==='INSTALL'&&t.massKg===10&&t.sourceLotId)||
  !bin||bin.maxMassKg!==40000||bin.maxVolumeM3!==20||!bin.kind.includes('mineral-tailings'))
  throw Error('Actual paid same-world lined stockpile, landed powered ship and surface EVA required');
 if(distance(shipLocal,pile.location.local,bodyRadius)>65+EPS||distance(evaLocal,pile.location.local,bodyRadius)>20+EPS)
  throw Error('Walk within 20 units of stockpile and park ship within 65 units for crane reach');
 const ledger=root.StarfallMaterials8A.create(materials),old=ledger.operations().find(x=>x.id===jobId);
 if(old){if(old.status!=='COMMITTED'||old.kind!=='8H_TAILINGS_STORAGE'||old.lotId!==lotId||
   old.destinationId!==cid||Math.abs(old.massKg-massKg)>EPS)throw Error('Tailings operation replay conflicts');
  return{duplicate:true,materials:cp(materials),shipEnergyJ,receipt:cp(old),usedJ:0};}
 const lot=ledger.inventory('8d:ship-main:materials').find(l=>l.id===lotId);
 if(!eligible(lot,refinery)||lot.massKg+EPS<massKg)
  throw Error('Only actual original 8E mineral residue in ship hold can enter this waste pile');
 const usedJ=5000+massKg*500;
 if(shipEnergyJ+EPS<usedJ)throw Error('Ship battery lacks tailings crane work energy');
 const before=ledger.inventory().reduce((s,l)=>s+l.massKg,0);
 ledger.reserve(jobId,lotId,cid,massKg);ledger.commit(jobId);
 const next=ledger.snapshot(),r=next.operations.find(x=>x.id===jobId);
 Object.assign(r,{kind:'8H_TAILINGS_STORAGE',bodyId,stockpileId,energyJ:usedJ,
  energySourceId:'ship-main:engineering-battery',sourceProvenance:lot.provenance});
 if(Math.abs(next.lots.reduce((s,l)=>s+l.massKg,0)-before)>EPS)throw Error('Tailings mass changed');
 return{duplicate:false,materials:next,shipEnergyJ:shipEnergyJ-usedJ,receipt:cp(r),usedJ};
}
root.StarfallTailingsStorage8H=Object.freeze({eligible,transfer});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallTailingsStorage8H;
})(typeof globalThis!=='undefined'?globalThis:this);
