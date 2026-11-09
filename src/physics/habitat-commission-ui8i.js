/* 8I source-owned physical shell → T09 commissioning.
 * This is a real player-facing Engineer action. It cannot grant free supplies.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallHabitatCommission8I||!root.StarfallRuntime)return;
const section=document.createElement('section');section.className='section';
section.id='habitat-commission8i';
const title=document.createElement('div');title.className='section-title';
title.textContent='8I · COMMISSION PAID HABITAT FOR T09 LIFE SUPPORT';
const help=document.createElement('p');help.className='panel-note';
help.textContent='Build one genuine 8G pressure envelope from a complete BOM, charge its gas and water from real material lots or rated vessels, then commission it here. A 500 kJ pressure/leak proof moves all existing sealed gas and water into exactly one linked T09 habitat. No extra oxygen cylinder, scrubber, battery, solar or airlock power is granted. Wire an actual original T02 electrical source and install replacement supplies separately.';
const selector=document.createElement('select');
selector.setAttribute('aria-label','Select actual charged 8G habitat envelope');
selector.style.cssText='max-width:100%;min-width:180px;min-height:38px;padding:7px;background:#0f1c27;color:#eff7f7;border:1px solid #81939d';
const button=document.createElement('button');button.type='button';
button.className='science-action';button.textContent='QUALIFY SEALED SHELL & CONNECT T09 (500 kJ)';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
const detail=document.createElement('pre');detail.style.cssText='font:11px/1.5 Consolas,monospace;white-space:pre-wrap;color:#c5d7df;padding:9px;background:#0a1b27;border:1px solid #41556566';
section.append(title,help,selector,button,status,detail);host.append(section);
function refresh(){
 const c=root.StarfallRuntime.habitatCommissionContext8I?.();if(!c)return;
 const eligible=c.shells.filter(x=>x.charged&&!x.linked);
 const key=eligible.map(x=>x.id).join('|');
 if(selector.dataset.list!==key){
  const old=selector.value;selector.dataset.list=key;selector.replaceChildren();
  for(const x of eligible){const opt=document.createElement('option');opt.value=x.id;
   opt.textContent=x.id+' · '+x.pressureKPa.toFixed(2)+' kPa';selector.append(opt);}
  if(eligible.some(x=>x.id===old))selector.value=old;
 }
 const chosen=eligible.find(x=>x.id===selector.value);
 const ready=!!chosen&&c.landed&&c.eva&&c.powered&&
  c.energyJ>=root.StarfallHabitatCommission8I.WORK_J;
 button.disabled=!ready;
 detail.textContent='REAL SHELL: '+(chosen?.id||'NONE CHARGED AND UNLINKED')+
  '\nLANDED: '+c.landed+' · EVA: '+c.eva+' · SHIP POWER: '+c.powered+
  '\nSHIP BATTERY: '+Math.round(c.energyJ)+' J · CALIBRATION: 500000 J'+
  '\nAFTERWARD: install O₂/scrubber through the original 8A cargo and connect T02 power.'+
  '\nREADY: '+ready;
}
button.addEventListener('click',()=>{try{
 const r=root.StarfallRuntime.habitatCommission8I(selector.value);
 status.textContent='LINKED '+r.habitatId+' · '+r.transferredKg.toFixed(2)+
  ' kg real water/air moved to one T09 owner; 500 kJ paid. No free ECLSS supplies.';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();});
selector.addEventListener('change',refresh);
let last=0;function frame(t){if(t-last>1100){last=t;refresh();}requestAnimationFrame(frame);}
requestAnimationFrame(frame);
root.StarfallHabitatCommissionUI8I={refresh};
})(globalThis);
