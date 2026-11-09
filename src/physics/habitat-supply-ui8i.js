/* STARFALL 8I — discoverable field water service in existing Engineer route.
 * Only the original source-owned T09 habitat and actual 8A water lots are shown.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallHabitatSupply8I||!root.StarfallRuntime?.habitatSupplyContext8I)return;
const section=document.createElement('section');section.className='section';section.id='habitat-supply8i';
const title=document.createElement('div');title.className='section-title';
title.textContent='8I · HABITAT WATER SERVICE · REAL CARGO';
const intro=document.createElement('p');intro.className='panel-note';
intro.textContent='Refill an existing T09 habitat from real 8A ship-held water. Requires a landed powered ship within 100 surface units, EVA within 24, closed habitat airlock and available water-tank capacity. Pumping consumes 25 kJ per kg from the original ship battery. No free water, oxygen, food, scrubber media or greenhouse growth.';
const hab=document.createElement('select');hab.setAttribute('aria-label','Existing T09 habitat water destination');
const lot=document.createElement('select');lot.setAttribute('aria-label','Existing ship-held physical water lot');
const amount=document.createElement('input');amount.type='number';amount.min='0.1';amount.max='50';amount.step='0.1';amount.value='5';amount.setAttribute('aria-label','Water to transfer, kg');
const action=document.createElement('button');action.type='button';action.className='science-action';action.textContent='PUMP SOURCE-PAID WATER TO HABITAT';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
status.textContent='Land near an existing installed habitat with actual ship water cargo.';
const info=document.createElement('pre');info.style.cssText='white-space:pre-wrap;font:11px/1.45 Consolas,monospace;background:#101b23;color:#c9d9de;border:1px solid #53677566;padding:10px;max-height:210px;overflow:auto';
for(const x of [hab,lot,amount])x.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';
amount.style.width='90px';
const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap';row.append(hab,lot,amount,action);
section.append(title,intro,row,status,info);host.append(section);
function options(select,items,label){
 const stamp=items.map(x=>x.id+':'+(x.massKg??x.waterL)).join('|');
 if(stamp===select.dataset.stamp)return;
 const prior=select.value;select.dataset.stamp=stamp;select.replaceChildren();
 for(const item of items){const o=document.createElement('option');o.value=item.id;o.textContent=label(item);select.append(o);}
 if(items.some(x=>x.id===prior))select.value=prior;
}
function update(){
 const state=root.StarfallRuntime.habitatSupplyContext8I(),habs=state.habitats||[],lots=state.waterLots||[];
 options(hab,habs,x=>x.id+' · '+x.waterL.toFixed(1)+' / 2000 L');
 options(lot,lots,x=>x.id+' · '+x.massKg.toFixed(2)+' kg water');
 const h=habs.find(x=>x.id===hab.value),l=lots.find(x=>x.id===lot.value),kg=Number(amount.value);
 const valid=Number.isFinite(kg)&&kg>0&&kg<=50,work=valid?25000*kg:0;
 action.disabled=!(state.landed&&state.eva&&state.powered&&h?.enabled&&h.condition>.02&&
  h.airlock==='CLOSED'&&l&&valid&&l.massKg>=kg&&h.waterL+kg<=2000&&state.energyJ>=work);
 info.textContent='HABITAT: '+(h?.id||'NONE')+
  '\nAVAILABLE T09 WATER: '+(h?.waterL.toFixed(2)||'—')+' L of 2000 L capacity'+
  '\nORIGINAL SHIP WATER LOT: '+(l?l.massKg.toFixed(2)+' kg':'NONE')+
  '\nPUMP WORK: '+work.toFixed(0)+' J · SHIP BATTERY: '+state.energyJ.toFixed(0)+' J'+
  '\nSUPPLY: '+(state.landed?'LANDED':'LAND FIRST')+' · '+(state.eva?'EVA':'EXIT SHIP')+
  ' · '+(state.powered?'POWERED':'SHIP POWER OFF')+
  '\nNOTE: This refills only liquid water in the original T09 system.'+
  '\nCO₂ scrubber replacement, crop greenhouse and planetary terraforming remain separate engineering tasks.';
}
action.addEventListener('click',()=>{try{
 const r=root.StarfallRuntime.habitatSupplyWater8I(hab.value,lot.value,Number(amount.value));
 status.textContent='TRANSFER COMMITTED '+r.id+' · '+r.massKg.toFixed(2)+' kg debited, '+r.massKg.toFixed(2)+' L credited · '+r.workJ.toFixed(0)+' J spent.';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}update();});
for(const el of [hab,lot,amount])el.addEventListener('change',update);
let last=0;function tick(now){if(now-last>1500){last=now;update();}root.requestAnimationFrame(tick);}root.requestAnimationFrame(tick);
root.StarfallHabitatSupplyUI8I={refresh:update};
})(globalThis);
