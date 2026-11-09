/* 8I — passive sunlight greenhouse fitted INSIDE existing T09 habitat. */
(function(root){'use strict';
const host=document.getElementById('habitat-supply8i')||
 document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallRuntime?.greenhouseContext8I||!root.StarfallGreenhouse8I)return;
const panel=document.createElement('section');panel.className='section';panel.id='greenhouse8i';
const header=document.createElement('div');header.className='section-title';header.textContent='8I · CLOSED-LOOP SEALED GREENHOUSE';
const note=document.createElement('p');note.className='panel-note';
note.textContent='Install 1 kg manufactured 8F greenhouse_kit, 20 g real crop_seeds and 200 g fertilizer into an existing powered T09. Native daylight supplies photons, the existing 680 W T02 habitat bus powers pumps. Photosynthesis uses finite cabin CO₂ and water, returns O₂ and stores grown biomass. No growing at night, without power or nutrients; the model does not certify food safety.';
const hab=document.createElement('select');hab.setAttribute('aria-label','T09 greenhouse destination');
const action=document.createElement('button');action.type='button';action.className='science-action';action.textContent='INSTALL SOURCE-PAID HABITAT GREENHOUSE (400 kJ)';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
const pre=document.createElement('pre');pre.style.cssText='white-space:pre-wrap;font:11px/1.55 Consolas,monospace;background:#101b23;color:#c9d9de;border:1px solid #53677566;padding:10px;max-height:230px;overflow:auto';
hab.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';
const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap';row.append(hab,action);
panel.append(header,note,row,status,pre);host.append(panel);
function refresh(){
 try{
  const c=root.StarfallRuntime.greenhouseContext8I(),h=c.habitats||[],old=hab.value;
  const sig=h.map(x=>x.id+':'+!!x.greenhouse).join('|');
  if(hab.dataset.sig!==sig){
   hab.dataset.sig=sig;hab.replaceChildren();
   for(const x of h){const o=document.createElement('option');o.value=x.id;
    o.textContent=x.id+(x.greenhouse?.installed?' · INSTALLED':' · UNFITTED');hab.append(o);}
   if(h.some(x=>x.id===old))hab.value=old;
  }
  const current=h.find(x=>x.id===hab.value);
  const inputs=c.availableInputs||[],req={greenhouse_kit:1,crop_seeds:.02,fertilizer:.2};
  const stock=inputs.map(x=>({id:x.materialId,need:req[x.materialId]||0,
   have:x.lots.reduce((s,l)=>s+l.massKg,0)}));
  action.disabled=!(current&&!current.greenhouse?.installed&&current.enabled&&
   current.condition>.02&&current.airlock==='CLOSED'&&c.landed&&c.eva&&
   c.powered&&c.energyJ>=400000&&stock.every(x=>x.have>=x.need));
  const g=current?.greenhouse;
  pre.textContent='ACTUAL T09: '+(current?.id||'NONE')+
   '\nGREENHOUSE: '+(g?.installed?'PHYSICALLY INSTALLED':'NO HARDWARE')+
   '\nNATIVE CABIN CO₂: '+(current?.co2Mol||0).toFixed(5)+' mol'+
   '\nCABIN WATER: '+(current?.waterL||0).toFixed(3)+' L'+
   '\nGROWN BIOMASS: '+(current?.cropBiomassKg||0).toFixed(6)+' kg'+
   '\nINSTALLED NUTRIENTS: '+(g?.nutrientKg||0).toFixed(6)+' kg'+
   '\nTOTAL PHOTOSYNTHETIC O₂: '+(g?.oxygenProducedMol||0).toFixed(6)+' mol'+
   '\nSUNLIGHT: '+(g?.lastSunlightWm2||0).toFixed(2)+' W/m² (last native pulse)'+
   '\nSOURCE INPUTS: '+stock.map(x=>x.id+' '+x.have.toFixed(3)+' / '+x.need.toFixed(3)+' kg').join(' · ')+
   '\nINSTALL: '+(c.landed?'LANDED':'LAND FIRST')+' / '+(c.eva?'EVA':'EXIT SHIP')+
    ' / '+(c.powered?'SHIP POWER':'POWER OFF')+
   '\nFULL BIOSPHERE: NOT YET CERTIFIED; no free agriculture, external plants or crew calories.';
 }catch(e){action.disabled=true;pre.textContent='GREENHOUSE BLOCKED: '+String(e.message||e);}
}
action.addEventListener('click',()=>{try{
 const r=root.StarfallRuntime.greenhouseInstall8I(hab.value);
 status.textContent='COMMITTED '+r.id+' · hardware + seeds + fertilizer physically installed · '+r.workJ+' J paid';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();});
hab.addEventListener('change',refresh);
let last=0;function tick(t){if(t-last>1500){last=t;refresh();}root.requestAnimationFrame(tick);}root.requestAnimationFrame(tick);
root.StarfallGreenhouseUI8I={refresh};
})(globalThis);
