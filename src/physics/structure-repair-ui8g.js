/* STARFALL 8G: finite EVA repair for staged rocket and habitat structures.
 * Pure UI: all ownership, salvage, power and conditions are runtime-authoritative.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallStructureRepair8G)return;
const section=document.createElement('section');section.className='section';section.id='structure-repair8g';
const title=document.createElement('div');title.className='section-title';
title.textContent='8G · FINITE STRUCTURAL REPAIR';
const description=document.createElement('p');description.className='panel-note';
description.textContent='Repair damaged physical rocket-stage structures or habitat envelopes by exchanging finished 8F parts for the exact same mass of salvage scrap, with a paid ship battery debit. EVA must approach the damage; repair raises only structure condition. No free pressure, oxygen, propellant or flight certification.';
const pick=document.createElement('select');
pick.setAttribute('aria-label','Select damaged physical rocket or habitat');
pick.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';
const button=document.createElement('button');button.type='button';button.className='science-action';
button.textContent='REPLACE DAMAGED STRUCTURAL HARDWARE';
const result=document.createElement('p');result.className='panel-note';result.setAttribute('role','status');
result.textContent='Only real damaged structures appear. Repair materials must already be in ship cargo.';
const details=document.createElement('pre');
details.style.cssText='white-space:pre-wrap;font:11px/1.45 Consolas,monospace;color:#cad8dc;background:#101b23;border:1px solid #53677566;padding:10px;max-height:220px;overflow:auto';
const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap';
row.append(pick,button);section.append(title,description,row,result,details);host.append(section);
function refresh(){
 const rt=root.StarfallRuntime,c=rt?.structureRepairContext8G?.();
 if(!c)return;
 const all=c.repairCandidates||[],signature=all.map(x=>x.id+':'+x.condition.toFixed(3)).join('|');
 if(signature!==pick.dataset.signature){const old=pick.value;pick.replaceChildren();
  for(const x of all){const o=document.createElement('option');o.value=x.id;
   o.textContent=x.id+' · '+x.type+' · '+Math.round(x.condition*100)+'%';pick.append(o);}
  if(all.some(x=>x.id===old))pick.value=old;
  pick.dataset.signature=signature;
 }
 let quote=null,reason='';
 try{if(pick.value)quote=rt.structureRepairQuote8G(pick.value);}
 catch(e){reason=String(e.message||e);}
 button.disabled=!quote?.ready||!quote?.powered||!c.landed||!c.eva;
 details.textContent='TARGET: '+(pick.value||'NO DAMAGED STRUCTURE')+
  '\nCONDITION: '+(quote?Math.round(quote.conditionBefore*100)+'% -> '+Math.round(quote.conditionAfter*100)+'%':'—')+
  '\nSINGLE REPAIR WORK: '+(quote?.energyJ||0)+' J ship energy'+
  '\nREPLACEMENT HARDWARE: '+(quote?.replacementMassKg||0)+' kg'+
  '\nRECOVERED SALVAGE: '+(quote?.replacementMassKg||0)+' kg real 8A manufacturing_scrap in ship'+
  (quote?.shortages?.length?'\nMISSING: '+quote.shortages.map(x=>x.materialId+' '+x.missingKg.toFixed(2)+' kg').join(', '):'')+
  '\nSTATUS: '+(reason||(!pick.value?'REPAIR NOT NEEDED':quote?.ready&&quote?.powered?'READY':'BLOCKED'))+
  '\nREPAIR DOES NOT COMMISSION A ROCKET ENGINE OR A PRESSURIZED HABITAT';
}
button.addEventListener('click',()=>{try{const r=root.StarfallRuntime.structureRepair8G(pick.value);
 result.textContent='REPAIR COMMITTED: '+r.assetId+' · condition '+Math.round(r.conditionAfter*100)+
  '% · '+r.massKg+' kg hardware swapped and salvaged · '+r.energyJ+' J paid.';
 }catch(e){result.textContent='BLOCKED: '+String(e.message||e);}refresh();});
pick.addEventListener('change',refresh);
let last=0;function tick(n){if(n-last>1100){last=n;refresh();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
root.StarfallStructureRepairUI8G={refresh};
})(globalThis);
