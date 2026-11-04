/* 8G finite physical habitat atmosphere/water installation preflight.
 * T09 owns the actual gas law; this is not a magic habitable toggle.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallHabitatCharge8G)return;
const panel=document.createElement('section');panel.className='section';panel.id='habitat-charge8g';
const title=document.createElement('div');title.className='section-title';
title.textContent='8G · FINITE HABITAT ATMOSPHERE & WATER';
const help=document.createElement('p');help.className='panel-note';
help.textContent='Install oxygen, inert nitrogen and water from real grade-certified ship inventory into a manufactured empty habitat. Requires nearby EVA, a powered landed ship and 1.2 MJ compressor energy. T09 calculates pressure from actual gas moles; NO free tank reserves, oxygen generation, scrubber cartridge, sealed-habitat approval or automatic crew safety. Nitrogen must have a real physical source; it is not yet fabricated by 8E.';
const choose=document.createElement('select');choose.setAttribute('aria-label','Select physical habitat envelope to charge');
choose.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';
const act=document.createElement('button');act.type='button';act.className='science-action';
act.textContent='INSTALL FINITE AIR & WATER (1.2 MJ)';
const details=document.createElement('pre');
details.style.cssText='white-space:pre-wrap;background:#101b23;color:#cad8dc;border:1px solid #53677566;padding:10px;font:11px/1.45 Consolas,monospace;max-height:220px;overflow:auto';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
status.textContent='Requires physically acquired oxygen, nitrogen, water and the built habitat.';
panel.append(title,help,choose,act,status,details);host.append(panel);
function refresh(){
 const rt=root.StarfallRuntime,c=rt?.habitatChargeContext8G?.();
 if(!c)return;
 const sig=c.habitats.map(x=>x.id+':'+x.charged).join('|'),old=choose.value;
 if(choose.dataset.signature!==sig){choose.dataset.signature=sig;choose.replaceChildren();
  for(const h of c.habitats){const option=document.createElement('option');option.value=h.id;
   option.textContent=h.id+(h.charged?' · INITIAL AIR INSTALLED':' · EMPTY SHELL');
   choose.append(option);}
  if(c.habitats.some(x=>x.id===old))choose.value=old;}
 const h=c.habitats.find(x=>x.id===choose.value);
 let q=null,error='';
 try{if(h&&!h.charged)q=rt.habitatChargeQuote8G(h.id);}
 catch(e){error=String(e.message||e);}
 act.disabled=!h||h.charged||!q?.ready||!q?.powered||!c.landed||!c.eva||!c.powered;
 details.textContent='HABITAT '+(h?.id||'NONE')+
  '\nPHYSICAL STATE: '+(!h?'NO ASSET':h.charged?'GAS INSTALLED; LIFE SUPPORT UNQUALIFIED':'EMPTY ENVELOPE')+
  '\nT09 CABIN VOLUME: '+root.StarfallHabitatCharge8G.CABIN_VOLUME_M3+' m³'+
  '\nPREDICTED PRESSURE: '+(q?.estimatedPressureKPa?.toFixed(2)||h?.pressureKPa?.toFixed(2)||'—')+' kPa'+
  '\nPREDICTED O₂ PARTIAL: '+(q?.oxygenPartialKPa?.toFixed(2)||'—')+' kPa'+
  '\nREQUIRED BATTERY ENERGY: 1.2 MJ'+
  '\nPHYSICAL CONSUMABLES: '+Object.entries(root.StarfallHabitatCharge8G.requirements())
    .map(([k,v])=>k+' '+v.toFixed(2)+' kg').join(' · ')+
  (q?.shortages?.length?'\nSHORTAGES: '+q.shortages.map(x=>x.materialId+' '+x.missingKg.toFixed(2)+' kg').join(', '):'')+
  '\nSTATUS: '+(error||(!h?'NO HABITAT':h.charged?'ALREADY CHARGED':q?.ready&&q?.powered?'READY TO CHARGE':'WAITING FOR REAL STOCK / ENERGY'))+
  '\nCREW SAFETY: NOT APPROVED. T09 LIFE SUPPORT MUST BE WIRED, FED AND VALIDATED.';
}
act.addEventListener('click',()=>{try{const r=root.StarfallRuntime.habitatCharge8G(choose.value);
 status.textContent='INSTALLED '+r.addedMassKg.toFixed(2)+' kg of actual O₂/N₂/water. Real ship battery debited '+r.workJ+' J. No generated oxygen, water or habitable status.';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();});
choose.addEventListener('change',refresh);
let last=0;function tick(t){if(t-last>1000){last=t;refresh();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
root.StarfallHabitatChargeUI8G={refresh};
})(globalThis);
