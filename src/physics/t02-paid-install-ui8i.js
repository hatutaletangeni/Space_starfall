/* STARFALL 8I — actual 8F-manufactured solar and battery deployment.
 * Original outpost T02 owns the 48 V devices and their finite Joule state.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
const rt=()=>root.StarfallRuntime;
if(!host||!root.StarfallT02PaidInstall8I||!rt())return;
const section=document.createElement('section');section.id='t02-paid-install8i';
section.className='section';
const title=document.createElement('div');title.className='section-title';
title.textContent='8I · BUILD SOURCE-PAID 48 V SOLAR / BATTERY';
const help=document.createElement('p');help.className='panel-note';
help.textContent='First fabricate the real 8F solar_module or eight battery_cell batches. Move the finished parts into the original ship hold. Park the ship, power it, and walk 40–65 surface units away on EVA. Starting a job consumes no parts; after 300 / 600 seconds of ACTUAL simulated time, remain nearby with sufficient ship power for final installation. Solar nameplate 400 W per module. Battery pack stores up to 9.6 MJ but STARTS EMPTY. Use Outposts → Power to connect these actual T02 devices to each other and to the commissioned T09 habitat; no fictional precharged battery or free electrical array.';
const picker=document.createElement('select');picker.setAttribute('aria-label','Select paid 8F solar or 48V battery');
picker.style.cssText='width:100%;background:#10202b;color:#ebf4f6;padding:8px;border:1px solid #667b87';
for(const [id,text] of [['solar','400 W SOLAR · 8.8 kg 8F solar_module · 300 s · 250 kJ'],['battery','48 V BATTERY · eight 8F cells (15.6 kg) · 600 s · 450 kJ']]){
 const o=document.createElement('option');o.value=id;o.textContent=text;picker.append(o);
}
const start=document.createElement('button');start.type='button';start.className='science-action';
start.textContent='START PAID T02 INSTALLATION';
const cancel=document.createElement('button');cancel.type='button';cancel.className='science-action';
cancel.textContent='CANCEL UNFINISHED JOB';
const row=document.createElement('div');row.style.cssText='display:flex;gap:9px;flex-wrap:wrap;margin:10px 0';
row.append(start,cancel);
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
const detail=document.createElement('pre');
detail.style.cssText='white-space:pre-wrap;font:11px/1.55 Consolas,monospace;color:#cde2e7;background:#0c1d27;padding:9px;border:1px solid #52677355';
section.append(title,help,picker,row,status,detail);host.append(section);
function refresh(){
 const c=rt()?.t02PaidContext8I?.();if(!c)return;
 const spec=c.components?.find(x=>x.kind===picker.value);
 let q=null,reason='';
 if(!c.active){try{q=rt().t02PaidInstallQuote8I(picker.value);}catch(e){reason=String(e.message||e);}}
 const remaining=c.active?Math.max(0,c.active.startedAtS+c.active.requiredSeconds-c.timeS):0;
 const finished=c.lastReceipt;
 detail.textContent='ORIGINAL SHIP: '+(c.landed?'LANDED':'NOT LANDED')+
  ' · EVA '+c.eva+' · POWER '+c.shipPowered+
  '\nBATTERY: '+Math.round(c.energyJ)+' J'+
  '\nACTUAL 8F PARTS IN SHIP HOLD: '+(spec?.shipKg.toFixed(2)||'0')+
  ' / '+(spec?.requiredKg||0)+' kg '+(spec?.part||'')+
  '\nJOB: '+(c.active?c.active.id+' · '+c.active.kind.toUpperCase()+
    ' · '+remaining.toFixed(1)+' simulated seconds remaining':'NONE')+
  '\nSTATUS: '+(c.active?(remaining<=0?(c.hold||'COMMISSIONING WHEN SHIP AND EVA PRESENT'):'WORK IN PROGRESS'):
   q?'READY TO START':'NOT READY: '+reason)+
  '\nNEW DEVICES: PAY THEIR REAL POWER DRAW / NO FREE CHARGE'+
  (finished?'\nLAST INSTALLED: '+finished.deviceId+' · '+finished.installedMassKg+
   ' kg source material · '+finished.workJ+' J paid':'');
 start.disabled=!!c.active||!q;cancel.disabled=!c.active;
}
start.addEventListener('click',()=>{try{
 const x=rt().t02PaidInstallStart8I(picker.value);
 status.textContent='STARTED '+x.id+' · real materials reserved for verification, not yet consumed; '+x.requiredSeconds+' simulated seconds.';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();});
cancel.addEventListener('click',()=>{try{
 if(rt().t02PaidInstallCancel8I())status.textContent='Cancelled unfinished T02 job: no fictional device installed.';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();});
picker.addEventListener('change',refresh);
let last=0;function update(t){if(t-last>1100){last=t;refresh();}requestAnimationFrame(update);}
requestAnimationFrame(update);
root.StarfallT02PaidInstallUI8I={refresh};
})(globalThis);
