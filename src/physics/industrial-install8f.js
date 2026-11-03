/* STARFALL 8F: irreversible physical machine commissioning on a surface.
 * No duplicate assets, no direct 'build from UI' freebies, no unverified capacity.
 * Inputs consumed and asset issued as one staged serializable transaction.
 */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7;
const KITS=Object.freeze({
 cnc:{label:'Precision CNC workshop',station:'machine',tools:['cnc','lathe','grinder'],parts:{beam:19.2,gear:3.4,bearing:1.7,insulated_wire:1.22,control_board:0.6},workJ:1.5e6,seconds:900,volumeM3:4},
 foundry:{label:'Industrial casting foundry',station:'foundry',tools:['caster'],parts:{beam:28.8,gear:1.7,insulated_wire:2.44,control_board:0.6},workJ:2.4e6,seconds:1500,volumeM3:6},
 wire_draw:{label:'Wire extrusion line',station:'wire',tools:['wire-die'],parts:{beam:9.6,gear:1.7,bearing:.85,insulated_wire:1.22},workJ:720000,seconds:420,volumeM3:2},
 electronics:{label:'Electronics PCB line',station:'electronics',tools:['etching','reflow'],parts:{beam:9.6,control_board:1.2,insulated_wire:2.44},workJ:960000,seconds:680,volumeM3:4},
 solar:{label:'Solar module laminator',station:'solar',tools:['module-laminator'],parts:{beam:19.2,gear:1.7,control_board:.6,insulated_wire:1.22},workJ:800000,seconds:720,volumeM3:5}
});
function commission({id,kitId,materials,assets,sourceContainerId,bodyId,local,forward,
 energyReceipt,shipLocal,bodyRadiusScene=2000,existingStructures=[]}){
 const kit=KITS[kitId];if(!kit)throw Error('Unknown physical factory kit');
 if(!/^factory8f:[A-Za-z0-9:_-]{1,90}$/.test(id||''))throw Error('Invalid factory installation ID');
 if(!materials||materials.schema!==1||!Array.isArray(materials.lots)||!Array.isArray(materials.operations)||
 !Array.isArray(materials.containers))throw Error('8A material authority missing');
 if(!assets||assets.schema!==1||!Array.isArray(assets.assets))throw Error('8A physical asset registry missing');
 const prior=assets.assets.find(x=>x.id===id);
 if(prior)throw Error('Factory already commissioned, no duplicate matter');
 if(!bodyId||typeof bodyId!=='string'||!Array.isArray(local)||local.length!==3||!local.every(Number.isFinite)||
 !Array.isArray(forward)||forward.length!==3||!forward.every(Number.isFinite))throw Error('Invalid body-fixed site');
 const len=Math.hypot(...local),fl=Math.hypot(...forward);
 if(len<.5||fl<.5)throw Error('Invalid surface direction');
 const unit=local.map(x=>x/len),fwd=forward.map(x=>x/fl);
 const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
 const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,dot(a,b))))*bodyRadiusScene;
 if(!Array.isArray(shipLocal)||shipLocal.length!==3||shipLocal.some(x=>!Number.isFinite(x))||
 arc(unit,shipLocal)>45)throw Error('Factory requires landed ship service cable range (45 scene units)');
 if(existingStructures.some(s=>s.bodyId===bodyId&&Array.isArray(s.local)&&arc(unit,s.local)<12))
 throw Error('Factory would overlap existing structure');
 if(!energyReceipt||energyReceipt.operationId!==id||energyReceipt.sourceId!=='ship-main:engineering-battery'||
 !Number.isFinite(energyReceipt.usedJ)||energyReceipt.usedJ<kit.workJ-EPS)
 throw Error('Machine commissioning electrical work not debited');
 const staged=copy(materials),registry=copy(assets),used=[];
 for(const [materialId,needed] of Object.entries(kit.parts)){
  let remaining=needed;
  for(const lot of staged.lots){
   if(lot.containerId!==sourceContainerId||lot.materialId!==materialId||
     !Number.isFinite(lot.grade)||lot.grade<.98)continue;
   const reserved=staged.operations.filter(o=>o.status==='RESERVED'&&o.lotId===lot.id).reduce((n,o)=>n+o.massKg,0);
   const kg=Math.min(remaining,Math.max(0,lot.massKg-reserved));
   if(kg>EPS){used.push({lot,kg});remaining-=kg;}if(remaining<=EPS)break;
  }
  if(remaining>EPS)throw Error('Missing manufactured physical part: '+materialId+' ('+remaining.toFixed(3)+' kg)');
 }
 for(const {lot,kg} of used){
  const old=lot.massKg;lot.massKg-=kg;lot.volumeM3*=lot.massKg/old;
 }
 staged.lots=staged.lots.filter(x=>x.massKg>EPS);
 const massKg=Object.values(kit.parts).reduce((a,b)=>a+b,0);
 const asset={id,type:'industrial_machine',massKg,volumeM3:kit.volumeM3,
  location:{kind:'surface',bodyId,local:unit},condition:1,provenance:'physical-assembly:'+id,
  state:{station:kit.station,tools:kit.tools,kitId,forward:fwd,installed:true,energyJ:0}};
 registry.assets.push(asset);
 const receipt={id,kitId,massKg,workJ:kit.workJ,bodyId,status:'COMMITTED',
  parts:copy(kit.parts),sourceContainerId};
 return{materials:staged,assets:registry,receipt};
}
root.StarfallIndustrialInstall8F=Object.freeze({KITS,commission});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallIndustrialInstall8F;
})(typeof globalThis!=='undefined'?globalThis:this);
