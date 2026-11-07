/* 8I · Actual T09 scrubber replacement from existing 8F manufactured stock.
 * Mounted with the other existing Habitat Life Support operations in Mission Build.
 */
(function(root){'use strict';
const host=document.getElementById('habitat-supply8i')||
 document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallRuntime?.habitatScrubberContext8I)return;
const panel=document.createElement('section');panel.className='section';panel.id='habitat-scrubber8i';
const heading=document.createElement('div');heading.className='section-title';heading.textContent='8I · T09 CO₂ SCRUBBER · REPLACE SORBENT';
const intro=document.createElement('p');intro.className='panel-note';
intro.textContent='Fit finite 8F press-manufactured scrubber_media from existing 8A ship cargo. The T09 CO₂ scrubber only works while its 680 W T02 bus and remaining sorbent capacity are available. No free cartridges or instant atmosphere.';
const habitat=document.createElement('select');habitat.setAttribute('aria-label','Existing T09 scrubber habitat');
const lot=document.createElement('select');lot.setAttribute('aria-label','Real fabricated scrubber media lot');
const kg=document.createElement('input');kg.type='number';kg.min='.01';kg.max='10';kg.step='.01';kg.value='1';kg.setAttribute('aria-label','Scrubber media mass kg');
const action=document.createElement('button');action.className='science-action';action.type='button';action.textContent='INSTALL FINITE MANUFACTURED CO₂ SORBENT';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
const info=document.createElement('pre');info.style.cssText='white-space:pre-wrap;font:11px/1.45 Consolas,monospace;background:#101b23;color:#c9d9de;border:1px solid #53677566;padding:10px';
for(const e of [habitat,lot,kg])e.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';
kg.style.width='90px';const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap';row.append(habitat,lot,kg,action);
panel.append(heading,intro,row,status,info);host.append(panel);
function fill(e,items,label){const sig=items.map(x=>x.id+':'+(x.massKg??x.scrubberCapacityMol)).join('|');
 if(sig===e.dataset.sig)return;const old=e.value;e.dataset.sig=sig;e.replaceChildren();
 for(const x of items){const o=document.createElement('option');o.value=x.id;o.textContent=label(x);e.append(o);}
 if(items.some(x=>x.id===old))e.value=old;}
function refresh(){
 const c=root.StarfallRuntime.habitatScrubberContext8I(),h=c.habitats||[],lots=c.scrubberLots||[];
 fill(habitat,h,x=>x.id+' · remaining '+x.scrubberCapacityMol.toFixed(2)+' mol CO₂');
 fill(lot,lots,x=>x.id+' · '+x.massKg.toFixed(2)+' kg');
 const a=h.find(x=>x.id===habitat.value),l=lots.find(x=>x.id===lot.value),n=Number(kg.value);
 const valid=Number.isFinite(n)&&n>0&&n<=10,work=valid?n*50000:0,capacity=valid?n*.08/.04401:0;
 action.disabled=!(c.landed&&c.eva&&c.powered&&a?.enabled&&a.condition>.02&&
 a.airlock==='CLOSED'&&l&&valid&&l.massKg>=n&&c.energyJ>=work&&
 a.scrubberCapacityMol+capacity<=25000);
 info.textContent='T09 HABITAT: '+(a?.id||'NONE')+
 '\nREMAINING CO₂ CAPTURE CAPACITY: '+(a?a.scrubberCapacityMol.toFixed(3):'—')+' mol'+
 '\nINSTALLED MEDIA: '+(a?a.scrubberMediaInstalledKg.toFixed(3):'—')+' kg'+
 '\nSOURCE MANUFACTURED MEDIA: '+(l?l.massKg.toFixed(3)+' kg':'NONE')+
 '\nADDED CAPACITY (APPROX): '+capacity.toFixed(3)+' mol CO₂'+
 '\nSHIP POWER: '+work.toFixed(0)+' J / '+(c.energyJ||0).toFixed(0)+' J available'+
 '\nREQUIRES: powered landed ship, EVA near existing hab, closed airlock, actual 8A manufactured sorbent.';
}
action.addEventListener('click',()=>{try{const r=root.StarfallRuntime.habitatSupplyScrubber8I(habitat.value,lot.value,Number(kg.value));
 status.textContent='COMMITTED '+r.id+' · installed '+r.massKg.toFixed(2)+' kg sorbent · CO₂ capacity +'+r.adsorbableCarbonDioxideMol.toFixed(3)+' mol · '+r.workJ.toFixed(0)+' J';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();});
for(const e of [habitat,lot,kg])e.addEventListener('change',refresh);
let last=0;function tick(t){if(t-last>1500){last=t;refresh();}root.requestAnimationFrame(tick);}root.requestAnimationFrame(tick);
root.StarfallScrubberUI8I={refresh};
})(globalThis);
