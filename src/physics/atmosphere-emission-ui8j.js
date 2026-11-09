/* 8J — measured planet atmosphere release, same Mission → Build engineering group.
 * This action moves real gas mass and records a tiny global-mean pressure delta.
 * It never changes terrain, creates water, permits biological-world tampering,
 * or falsely claims an immediate visible climate shift.
 */
(function(root){'use strict';
const host=document.getElementById('terraform-feasibility8j')||
 document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallRuntime?.atmosphericContext8J||!root.StarfallAtmosphereEmission8J)return;
const section=document.createElement('section');section.id='atmosphere-emission8j';section.className='section';
const heading=document.createElement('div');heading.className='section-title';
heading.textContent='8J · SOURCE-PAID PLANET ATMOSPHERE EMISSION';
const description=document.createElement('p');description.className='panel-note';
description.textContent='Release up to 10 kg of actual rated gas to an unprotected planet with a landed powered ship and EVA operator. Original vessel stock and ship battery are debited, the tiny physical mean-pressure change is persisted. All worlds with native life or archaeological sites are locked. This is measured emission—not instant planetary terraforming.';
const vessel=document.createElement('select');vessel.setAttribute('aria-label','Actual planet atmospheric emission vessel');
const lot=document.createElement('select');lot.setAttribute('aria-label','Gas lot for planetary emission');
const qty=document.createElement('input');qty.type='number';qty.min='0.01';qty.max='10';qty.step='0.01';qty.value='1';qty.setAttribute('aria-label','Gas to release in kg');
for(const e of [vessel,lot,qty])e.style.cssText='color:#eaf0ef;background:#111c26;border:1px solid #78868b;padding:8px;max-width:100%';
qty.style.width='90px';
const act=document.createElement('button');act.className='science-action';act.type='button';
act.textContent='VENT SOURCE-PAID GAS TO PLANET';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
const info=document.createElement('pre');info.style.cssText='white-space:pre-wrap;font:11px/1.55 Consolas,monospace;background:#101b23;color:#c9d9de;border:1px solid #53677566;padding:10px';
const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap';row.append(vessel,lot,qty,act);
section.append(heading,description,row,status,info);host.append(section);
function fill(select,items,label){
 const sig=items.map(x=>x.id+':'+(x.massKg??x.gas)).join('|');
 if(sig===select.dataset.sig)return;
 const prior=select.value;select.dataset.sig=sig;select.replaceChildren();
 for(const x of items){const o=document.createElement('option');o.value=x.id;o.textContent=label(x);select.append(o);}
 if(items.some(x=>x.id===prior))select.value=prior;
}
function refresh(){
 try{
  const c=root.StarfallRuntime.atmosphericContext8J(),v=c.vessels||[];
  fill(vessel,v,x=>x.id+' · '+x.gas);
  const current=v.find(x=>x.id===vessel.value),stocks=(current?.lots||[]).filter(l=>l.grade>=.98);
  fill(lot,stocks,x=>x.id+' · '+x.massKg.toFixed(3)+' kg');
  const original=stocks.find(x=>x.id===lot.value),amount=Number(qty.value),
   valid=Number.isFinite(amount)&&amount>0&&amount<=10,
   delta=valid&&c.profile?amount*c.profile.surfaceGravityMS2/
    (4*Math.PI*c.profile.radiusM**2):0,
   work=valid?amount*100000:0;
  act.disabled=!(c.bodyId&&!c.protectedWorld&&c.landed&&c.eva&&c.powered&&
   current&&original&&valid&&original.massKg>=amount&&c.energyJ>=work);
  info.textContent='WORLD: '+(c.bodyId||'NONE')+
   '\nPLANETARY PROTECTION: '+(c.protectedWorld?'LOCKED · NO INDUSTRIAL INTERVENTION':'NO NATIVE LIFE/KNOWN RUINS · RESTRICTED LOCAL PROCESS')+
   '\nBASELINE + EMISSIONS PRESSURE: '+(c.pressurePa||0).toFixed(9)+' Pa'+
   '\nALREADY-EMITTED ΔPRESSURE: '+(c.pressureDeltaPa||0).toExponential(6)+' Pa'+
   '\nSELECTED GAS: '+(original?.materialId||'NONE')+
   '\nMEASURED MASS: '+(valid?amount.toFixed(3):'INVALID')+' kg'+
   '\nGLOBAL ΔP FOR THIS BATCH: '+delta.toExponential(6)+' Pa'+
   '\nRATED GAS VESSEL: '+(current?.id||'NONE')+
   '\nSHIP POWER WORK: '+work.toFixed(0)+' J / available '+(c.energyJ||0).toFixed(0)+' J'+
   '\nCONDITIONS: '+(c.landed?'LANDED':'LAND FIRST')+' / '+(c.eva?'EVA':'EXIT SHIP')+
    ' / '+(c.powered?'POWERED':'POWER OFF')+
   '\nSTATE: finite real gas exchange only. Climate, biochemistry and atmosphere optical rendering remain separate.';
 }catch(e){act.disabled=true;info.textContent='8J physical gate unavailable: '+String(e.message||e);}
}
act.addEventListener('click',()=>{
 try{const r=root.StarfallRuntime.atmosphericRelease8J(vessel.value,lot.value,Number(qty.value));
  status.textContent='COMMITTED '+r.id+' · '+r.massKg.toFixed(3)+' kg source debit · '+r.pressureDeltaPa.toExponential(6)+' Pa · '+r.workJ.toFixed(0)+' J energy debit.';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();
});
for(const e of [vessel,lot,qty])e.addEventListener('change',refresh);
let last=0;function loop(t){if(t-last>1800){last=t;refresh();}root.requestAnimationFrame(loop);}root.requestAnimationFrame(loop);
root.StarfallAtmosphereEmissionUI8J={refresh};
})(globalThis);
