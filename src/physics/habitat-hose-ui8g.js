/* 8G — metered O2/N2 regulator hose from rated 8E vessels to the actual
 * 8G habitat. Nothing decants to the ship material hold or grants free air. */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallHabitatHose8G)return;
const section=document.createElement('section');section.className='section';section.id='habitat-hose8g';
const title=document.createElement('div');title.className='section-title';
title.textContent='8G · PHYSICAL PRESSURE-VESSEL HABITAT CHARGING';
const note=document.createElement('p');note.className='panel-note';
note.textContent='Charge an empty, manufactured habitat from actual oxygen and nitrogen vessels on this world or one secured in the ship gas cradle. A rated hose and regulator consume 1.5 MJ plus physical O₂, N₂ and 20 kg of ship-stowed water. No free tanks, free CO₂ scrubbers, crew safety or automated life support are created. Requires close EVA supervision and a powered landed ship.';
const h=document.createElement('select');h.setAttribute('aria-label','Select unfinished habitat for rated gas charge');
const o=document.createElement('select');o.setAttribute('aria-label','Select actual rated oxygen source');
const n=document.createElement('select');n.setAttribute('aria-label','Select actual rated nitrogen source');
for(const x of [h,o,n])x.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';
const action=document.createElement('button');action.className='science-action';action.type='button';
action.textContent='METER O₂ + N₂ + SHIP WATER INTO HABITAT (1.5 MJ)';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
status.textContent='Select one actual empty pressure envelope and two physical rated gas vessels.';
const details=document.createElement('pre');details.style.cssText='white-space:pre-wrap;font:11px/1.45 Consolas,monospace;background:#101b23;color:#c9d9de;border:1px solid #53677566;padding:10px;max-height:250px;overflow:auto';
const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap';
row.append(h,o,n,action);section.append(title,note,row,status,details);host.append(section);
function setOptions(select,arr,display){
 const sig=arr.map(x=>x.id).join('|');if(select.dataset.signature===sig)return;
 const prior=select.value;select.dataset.signature=sig;select.replaceChildren();
 for(const item of arr){const opt=document.createElement('option');opt.value=item.id;opt.textContent=display(item);select.append(opt);}
 if(arr.some(x=>x.id===prior))select.value=prior;
}
function refresh(){
 const rt=root.StarfallRuntime,c=rt?.habitatHoseContext8G?.();if(!c)return;
 setOptions(h,c.habitats,x=>x.id+' · '+Math.round(100*x.condition)+'% structural condition');
 setOptions(o,c.oxygenVessels,x=>x.id+(x.location.kind==='ship'?' · SHIP':' · SURFACE'));
 setOptions(n,c.nitrogenVessels,x=>x.id+(x.location.kind==='ship'?' · SHIP':' · SURFACE'));
 let q=null,error='';
 try{if(h.value&&o.value&&n.value)q=rt.habitatHoseQuote8G(h.value,o.value,n.value);}
 catch(e){error=String(e.message||e);}
 action.disabled=!c.landed||!c.eva||!c.powered||!q?.ready||!q?.powered;
 details.textContent='TARGET: '+(h.value||'NONE')+
  '\nRATED O₂ VESSEL: '+(o.value||'NONE')+
  '\nRATED N₂ VESSEL: '+(n.value||'NONE')+
  '\nSHIP WATER SOURCE: 8A physical material hold'+
  '\nEXPECTED CABIN PRESSURE: '+(q?q.pressureKPa.toFixed(2):'—')+' kPa'+
  '\nEXPECTED O₂ PARTIAL PRESSURE: '+(q?q.oxygenPartialKPa.toFixed(2):'—')+' kPa'+
  '\nNEEDED FROM REAL LOTS: '+Object.entries(root.StarfallHabitatCharge8G.requirements())
   .map(([name,kg])=>name+' '+kg.toFixed(3)+' kg').join(' · ')+
  (q?.shortages?.length?'\nSHORTAGES: '+q.shortages.map(x=>x.materialId+' '+x.missingKg.toFixed(3)+' kg').join(', '):'')+
  '\nSHIP ELECTRICAL WORK: 1.5 MJ'+
  '\nSTATUS: '+(error||(!h.value?'NO FINISHED HABITAT':!q?'NEED RATED GAS SOURCES':!q.ready?'INSUFFICIENT PHYSICAL GAS/WATER':!q.powered?'SHIP BATTERY TOO LOW':'READY TO TRANSFER'))+
  '\nCREW ACCESS: BLOCKED; airlock, scrubber, life support and pressure proof incomplete.';
}
action.addEventListener('click',()=>{try{
 const r=root.StarfallRuntime.habitatHoseTransfer8G(h.value,o.value,n.value);
 status.textContent='CHARGED '+r.assetId+' · '+r.addedMassKg.toFixed(2)+' kg moved from existing rated vessels/ship water · '+r.initialPressureKPa.toFixed(2)+' kPa · 1.5 MJ paid · NOT HABITABLE.';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();});
for(const x of [h,o,n])x.addEventListener('change',refresh);
let last=0;function tick(t){if(t-last>900){last=t;refresh();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
root.StarfallHabitatHoseUI8G={refresh};
})(globalThis);
