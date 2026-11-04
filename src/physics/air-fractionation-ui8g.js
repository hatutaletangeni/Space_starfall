/* 8G — physical atmospheric nitrogen harvesting. CW01 fractions are modeled,
 * never measured; a fixed finite parcel is debited per surface cell.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallAirFractionation8G)return;
const section=document.createElement('section');section.className='section';section.id='air-fractionation8g';
const title=document.createElement('div');title.className='section-title';
title.textContent='8G · FINITE ATMOSPHERIC NITROGEN';
const intro=document.createElement('p');intro.className='panel-note';
intro.textContent='On a nitrogen-bearing planet, build an actual 8F air-separation facility and a separate rated nitrogen pressure vessel. Capturing one 20 kg air batch consumes 810 kJ and a finite local modeled air reserve; the recovered N₂ goes only to the rated vessel while other gases are exhausted to the environment. Planet atmospheres are composition priors, NOT surveyed pressure or flight-safety evidence.';
const plant=document.createElement('select');plant.setAttribute('aria-label','Select physical air separator');
const vessel=document.createElement('select');vessel.setAttribute('aria-label','Select physical nitrogen vessel');
for(const x of [plant,vessel])x.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';
const collect=document.createElement('button');collect.className='science-action';collect.type='button';
collect.textContent='SEPARATE 20 KG ATMOSPHERIC AIR (810 kJ)';
const detail=document.createElement('pre');detail.style.cssText='white-space:pre-wrap;background:#101b23;color:#c8d9de;border:1px solid #53677566;padding:10px;font:11px/1.45 Consolas,monospace;max-height:250px;overflow:auto';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
status.textContent='Requires actual pressure-rated vessel and finite planetary atmosphere.';
const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center';
row.append(plant,vessel,collect);section.append(title,intro,row,detail,status);host.append(section);
function entries(select,ids){
 const sig=ids.join('|');if(select.dataset.signature===sig)return;
 const prev=select.value;select.dataset.signature=sig;select.replaceChildren();
 for(const id of ids){const o=document.createElement('option');o.value=id;o.textContent=id;select.append(o);}
 if(ids.includes(prev))select.value=prev;
}
function refresh(){
 const rt=root.StarfallRuntime,c=rt?.airFractionationContext8G?.();
 if(!c)return;
 entries(plant,c.plantIds);entries(vessel,c.vesselIds);
 let q=null,error='';
 try{if(plant.value&&vessel.value)q=rt.airFractionationQuote8G(plant.value,vessel.value);}
 catch(e){error=String(e.message||e);}
 collect.disabled=!q?.ready||!q?.powered||!c.landed||!c.eva;
 detail.textContent='MODEL: CW01 v1 deterministic uncertain atmosphere prior'+
  '\nSEPARATOR: '+(plant.value||'NONE BUILT')+
  '\nRATED N₂ VESSEL: '+(vessel.value||'NONE BUILT')+
  '\nN₂ MOLE FRACTION: '+(q?(q.nitrogenMoleFraction*100).toFixed(2)+'%':'—')+
  '\nAVAILABLE CELL AIR: '+(q?q.availableAirKg.toFixed(2)+' kg':'—')+
  '\nBATCH AIR INPUT: '+(q?.airBatchKg||20)+' kg'+
  '\nN₂ COMPRESSED IN VESSEL: '+(q?q.nitrogenKg.toFixed(3)+' kg':'—')+
  '\nSEPARATION VENTED MASS: '+(q?q.ventToAtmosphereKg.toFixed(3)+' kg':'—')+
  '\nBATTERY ENERGY: 810 kJ'+
  '\nSTATUS: '+(error||q?.blockedReason||(!q?'INSTALL BOTH PHYSICAL FACILITIES':q.ready&&q.powered?'READY':'SHIP POWER NEEDED'))+
  '\nIMPORTANT: N₂ is stored in the STATIONARY gas vessel, not teleported to the ship.';
}
collect.addEventListener('click',()=>{try{
 const r=root.StarfallRuntime.airFractionationCollect8G(plant.value,vessel.value);
 status.textContent='CAPTURED '+r.nitrogenKg.toFixed(3)+' kg nitrogen; '+r.ventKg.toFixed(3)+' kg released as exhaust; '+r.airKg+' kg of local air depleted, '+r.energyJ+' J paid.';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();});
plant.addEventListener('change',refresh);vessel.addEventListener('change',refresh);
let last=0;function tick(t){if(t-last>1000){last=t;refresh();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
root.StarfallAirFractionationUI8G={refresh};
})(globalThis);
