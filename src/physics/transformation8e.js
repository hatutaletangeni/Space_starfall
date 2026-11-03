/* STARFALL 8E — serializable, atomic material conversion adapter over the 8A schema.
   Caller must atomically persist returned material and operation snapshots.
   An energy receipt is proof supplied by the authoritative power system, not a debit by this module. */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)), EPS=1e-7;
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const id=s=>typeof s==='string'&&s.length>0&&s.length<=128;
const mass=o=>Object.values(o).reduce((a,b)=>a+b,0);
const RECIPES=Object.freeze({
 crush_iron:{station:'crusher',inputs:{iron_ore:20},outputs:{iron_concentrate:11,tailings:9},powerW:1800,seconds:100},
 reduce_iron:{station:'smelter',inputs:{iron_concentrate:11,carbon:2},outputs:{iron:8,slag:3,offgas:2},powerW:11000,seconds:400},
 steel_cast:{station:'caster',inputs:{iron:8,carbon:0.2},outputs:{steel:7.9,slag:0.3},powerW:4000,seconds:180},
 copper_refine:{station:'electrorefinery',inputs:{copper_concentrate:10},outputs:{copper:7.5,tailings:2.5},powerW:6000,seconds:360},
 purify_water:{station:'purifier',inputs:{water_ice:10},outputs:{water:9.6,sediment:0.4},powerW:1200,seconds:160},
 water_electrolysis:{station:'electrolyzer',inputs:{water:9},outputs:{hydrogen:1,oxygen:8},powerW:21000,seconds:500},
 silica_glass:{station:'furnace',inputs:{silica:10},outputs:{glass:9.6,slag:0.4},powerW:9000,seconds:450}
});
function validateRecipe(r){if(!r||!id(r.station)||!valid(r.powerW)||!valid(r.seconds)||r.seconds<=0||!r.inputs||!r.outputs)throw Error('Invalid recipe');for(const group of [r.inputs,r.outputs])for(const [k,v] of Object.entries(group))if(!id(k)||!valid(v)||v<=0)throw Error('Invalid material amount');if(Math.abs(mass(r.inputs)-mass(r.outputs))>EPS)throw Error('Recipe mass balance violated');}
Object.values(RECIPES).forEach(validateRecipe);
function create(saved){let state=saved==null?{schema:1,operations:[]}:clone(saved);if(state.schema!==1||!Array.isArray(state.operations))throw Error('Corrupt 8E production history');
function convert({operationId,recipeId,recipe,materials,containerId,outputContainerId,outputGrades={},lotId=null,minInputGrade=0,energyReceipt,station}){
 if(!id(operationId)||!id(containerId)||!id(outputContainerId))throw Error('Invalid conversion identity');
 const existing=state.operations.find(x=>x.id===operationId);if(existing)return{duplicate:true,materials:clone(materials),operations:clone(state),receipt:clone(existing)};
 const r=recipe||RECIPES[recipeId];validateRecipe(r);
 if(!station||!id(station.id)||station.kind!==r.station||station.containerId!==containerId||station.condition<0.5||station.enabled!==true)throw Error('Incompatible, damaged or disconnected station');
 const requiredJ=r.powerW*r.seconds;
 if(!energyReceipt||energyReceipt.operationId!==operationId||!id(energyReceipt.sourceId)||!valid(energyReceipt.usedJ)||energyReceipt.usedJ+EPS<requiredJ)throw Error('Missing metered energy debit');
 if(!materials||materials.schema!==1||!Array.isArray(materials.lots)||!Array.isArray(materials.containers)||!Array.isArray(materials.operations))throw Error('Invalid 8A material snapshot');
 const next=clone(materials),op=clone(state);
 const reserved=new Map();for(const entry of next.operations)if(entry.status==='RESERVED'){const m=reserved.get(entry.lotId)||0;reserved.set(entry.lotId,m+entry.massKg);}
 const deductions=[];
 for(const [materialId,quantity] of Object.entries(r.inputs)){
  let remaining=quantity;
  for(const lot of next.lots){if(lot.containerId!==containerId||lot.materialId!==materialId||(lotId&&lot.id!==lotId)||
    (minInputGrade>0&&(!valid(lot.grade)||lot.grade<minInputGrade)))continue;
   const free=Math.max(0,lot.massKg-(reserved.get(lot.id)||0));const used=Math.min(remaining,free);if(used>EPS){deductions.push({lot,used});remaining-=used;}
   if(remaining<=EPS)break;
  }
  if(remaining>EPS)throw Error('Missing feedstock: '+materialId);
 }
 const dest=next.containers.find(c=>c.id===outputContainerId);if(!dest)throw Error('Missing output container');
 const currently=next.lots.filter(l=>l.containerId===outputContainerId).reduce((a,l)=>({kg:a.kg+l.massKg,vol:a.vol+l.volumeM3}),{kg:0,vol:0});
 const outputs=mass(r.outputs);
 // A processing step may return refined products to the same physical hold.
 // Check capacity after the reserved input mass/volume is removed, not before.
 const removing=containerId===outputContainerId?deductions.reduce((a,d)=>({
  kg:a.kg+d.used,vol:a.vol+d.used*(d.lot.volumeM3/d.lot.massKg)}),{kg:0,vol:0}):{kg:0,vol:0};
 const volume=containerId===outputContainerId?removing.vol:outputs*.001;
 if(currently.kg-removing.kg+outputs>dest.maxMassKg+EPS||currently.vol-removing.vol+volume>dest.maxVolumeM3+EPS)throw Error('Output storage full');
 if(op.operations.some(x=>x.id===operationId))throw Error('Duplicate operation');
 for(const d of deductions){const original=d.lot.massKg;d.lot.massKg-=d.used;d.lot.volumeM3=Math.max(0,d.lot.volumeM3*(d.lot.massKg/original));}
 next.lots=next.lots.filter(l=>l.massKg>EPS);
 let i=0;for(const [materialId,kg] of Object.entries(r.outputs))next.lots.push({id:'process:'+operationId+':'+(++i),materialId,containerId:outputContainerId,massKg:kg,
  volumeM3:kg*volume/Math.max(outputs,EPS),provenance:'process:'+operationId,
  grade:valid(outputGrades[materialId])&&outputGrades[materialId]<=1?outputGrades[materialId]:null});
 const receipt={id:operationId,recipeId:recipeId||'custom',stationId:station.id,inputs:clone(r.inputs),outputs:clone(r.outputs),energyJ:requiredJ,status:'COMMITTED'};
 op.operations.push(receipt);return{duplicate:false,materials:next,operations:op,receipt:clone(receipt)};
}
return Object.freeze({convert,snapshot:()=>clone(state)});
}
root.StarfallTransformation8E=Object.freeze({RECIPES,validateRecipe,create});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallTransformation8E;
})(typeof globalThis!=='undefined'?globalThis:this);