/* 8I physical rated O₂ refill; same Engineer workspace as T09 water service.
 * Existing 8G oxygen vessel and 8A source lot supply finite T09 cylinders.
 */
(function(root){'use strict';
const host=document.getElementById('habitat-supply8i')||
 document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallRuntime?.habitatOxygenContext8I||!root.StarfallHabitatOxygen8I)return;
const panel=document.createElement('section');panel.className='section';panel.id='habitat-oxygen8i';
const heading=document.createElement('div');heading.className='section-title';heading.textContent='8I · HABITAT OXYGEN CYLINDER · RATED VESSEL';
const note=document.createElement('p');note.className='panel-note';note.textContent=
 'Top up the original T09 oxygen cylinder from an actual source-owned, 5 MPa+ rated O₂ vessel on this world or secured in the ship gas cradle. 60 kJ/kg from the ship battery; no oxygen appears without source gas, a landed powered ship, and close EVA supervision. This does not produce oxygen or replenish CO₂ scrubbers.';
const habitat=document.createElement('select');habitat.setAttribute('aria-label','T09 habitat oxygen destination');
const vessel=document.createElement('select');vessel.setAttribute('aria-label','Rated oxygen source vessel');
const lot=document.createElement('select');lot.setAttribute('aria-label','Actual oxygen gas lot');
const kg=document.createElement('input');kg.type='number';kg.min='0.01';kg.max='20';kg.step='0.01';kg.value='1';kg.setAttribute('aria-label','Oxygen transfer mass kg');
for(const el of [habitat,vessel,lot,kg])el.style.cssText='color:#eaf0ef;background:#111c26;border:1px solid #78868b;padding:8px;max-width:100%';
kg.style.width='100px';
const act=document.createElement('button');act.type='button';act.className='science-action';
act.textContent='PUMP METERED O₂ INTO T09 CYLINDER';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
const info=document.createElement('pre');info.style.cssText='white-space:pre-wrap;font:11px/1.45 Consolas,monospace;background:#101b23;color:#c9d9de;border:1px solid #53677566;padding:10px';
const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap';
row.append(habitat,vessel,lot,kg,act);panel.append(heading,note,row,status,info);host.append(panel);
function fill(el,items,label){
 const sig=items.map(x=>x.id+':'+(x.massKg??x.oxygenTankMol??x.where)).join('|');
 if(sig===el.dataset.sig)return;
 const previous=el.value;el.dataset.sig=sig;el.replaceChildren();
 for(const x of items){const option=document.createElement('option');option.value=x.id;option.textContent=label(x);el.append(option);}
 if(items.some(x=>x.id===previous))el.value=previous;
}
function refresh(){
 const c=root.StarfallRuntime.habitatOxygenContext8I(),h=c.habitats||[],v=c.vessels||[];
 fill(habitat,h,x=>x.id+' · O₂ '+(x.oxygenTankMol||0).toFixed(0)+' mol');
 fill(vessel,v,x=>x.id+' · '+x.where.toUpperCase()+' · 5MPa+');
 const v0=v.find(x=>x.id===vessel.value),stocks=v0?.lots||[];
 fill(lot,stocks,x=>x.id+' · '+x.massKg.toFixed(3)+' kg');
 const h0=h.find(x=>x.id===habitat.value),l0=stocks.find(x=>x.id===lot.value),
  n=Number(kg.value),valid=Number.isFinite(n)&&n>0&&n<=20,
  mol=valid?n/.031998:0,work=valid?n*60000:0;
 act.disabled=!(c.landed&&c.eva&&c.powered&&h0?.enabled&&h0?.condition>.02&&
  h0?.airlock==='CLOSED'&&v0&&l0&&valid&&l0.massKg>=n&&
  h0.oxygenTankMol+mol<=25000&&c.energyJ>=work);
 info.textContent='ORIGINAL O₂ CYLINDER: '+(h0?h0.oxygenTankMol.toFixed(2)+' / 25000 mol':'NO HABITAT')+
  '\nSOURCE RATED VESSEL: '+(v0?.id||'NONE')+
  '\nSOURCE STOCK: '+(l0?l0.massKg.toFixed(3)+' kg O₂':'NONE')+
  '\nTRANSFER: '+(valid?n.toFixed(3)+' kg → '+mol.toFixed(2)+' mol':'INVALID')+
  '\nBATTERY WORK: '+work.toFixed(0)+' J · SHIP AVAILABLE: '+c.energyJ.toFixed(0)+' J'+
  '\nCONDITIONS: '+(c.landed?'LANDED':'LAND FIRST')+' / '+(c.eva?'EVA':'EXIT SHIP')+
  ' / '+(c.powered?'SHIP POWER':'POWER OFF')+
  '\nIMPORTANT: this replenishes only finite stored O₂; no instant breathable atmosphere or CO₂ scrubber replacement.';
}
act.addEventListener('click',()=>{try{
 const r=root.StarfallRuntime.habitatSupplyOxygen8I(habitat.value,vessel.value,lot.value,Number(kg.value));
 status.textContent='COMMITTED '+r.id+' · vessel O₂ −'+r.massKg.toFixed(3)+' kg · T09 +'+r.moles.toFixed(2)+' mol · ship −'+r.workJ.toFixed(0)+' J';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();});
for(const e of [habitat,vessel,lot,kg])e.addEventListener('change',refresh);
let last=0;function tick(t){if(t-last>1500){last=t;refresh();}root.requestAnimationFrame(tick);}root.requestAnimationFrame(tick);
root.StarfallHabitatOxygenUI8I={refresh};
})(globalThis);
