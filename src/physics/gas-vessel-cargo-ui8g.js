/* STARFALL 8G — actual pressure-vessel cargo crane, independent from
 * expedition truck ramp and manufactured chassis cradle. */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallGasVesselCargo8G)return;
const section=document.createElement('section');section.className='section';section.id='gas-vessel-cargo8g';
const title=document.createElement('div');title.className='section-title';title.textContent='8G · PRESSURE-RATED GAS VESSEL GANTRY';
const intro=document.createElement('p');intro.className='panel-note';
intro.textContent='Load a real sealed 8E pressure vessel with all its existing gas into the separate spacecraft engineering cradle. No decanting, teleporting, new gas inventory or duplicated vessels. All loaded containers count towards shared ship cargo mass/volume. Requires parked landed ship, EVA within reach and 90 kJ of ship power for each movement.';
const choose=document.createElement('select');choose.setAttribute('aria-label','Select physical nitrogen or oxygen vessel');
choose.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';
const load=document.createElement('button');load.type='button';load.className='science-action';load.textContent='WINCH GAS VESSEL INTO SHIP (90 kJ)';
const unload=document.createElement('button');unload.type='button';unload.className='science-action';unload.textContent='UNLOAD GAS VESSEL ONTO GROUND (90 kJ)';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
status.textContent='Construct and fill a rated N₂ or O₂ vessel on the planet before attempting transport.';
const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:8px';
row.append(choose,load,unload);section.append(title,intro,row,status);host.append(section);
function refresh(){
 const rt=root.StarfallRuntime,c=rt?.gasVesselCargoContext8G?.();if(!c)return;
 const previous=choose.value,items=c.vessels||[],signature=items.map(x=>x.id+':'+x.location.kind+':'+x.gasKg).join('|');
 if(signature!==choose.dataset.signature){
  choose.dataset.signature=signature;choose.replaceChildren();
  for(const v of items){const opt=document.createElement('option');opt.value=v.id;
   opt.textContent=v.materialId.toUpperCase()+' '+v.id+' · gas '+v.gasKg.toFixed(2)+' kg · '+(v.location.kind==='ship'?'IN SHIP':'ON SURFACE');
   choose.append(opt);}
  if(items.some(x=>x.id===previous))choose.value=previous;
 }
 const v=items.find(x=>x.id===choose.value),ready=c.landed&&c.eva&&c.powered&&
   c.energyJ>=root.StarfallGasVesselCargo8G.LIMIT.workJ;
 load.disabled=!ready||!v||v.location.kind!=='surface';
 unload.disabled=!ready||!v||v.location.kind!=='ship';
 if(!items.length)status.textContent='No eligible pressure-rated physical vessel nearby or already stowed in ship.';
}
function act(action){try{const r=root.StarfallRuntime.gasVesselCargoTransfer8G(action,choose.value);
 status.textContent='COMMITTED '+action.toUpperCase()+': '+r.assetId+' · dry '+r.dryMassKg.toFixed(2)+
 ' kg + gas '+r.containedGasKg.toFixed(3)+' kg · original gas container unchanged · 90 kJ spent and saved.';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();}
load.addEventListener('click',()=>act('load'));unload.addEventListener('click',()=>act('unload'));
choose.addEventListener('change',refresh);
let then=0;function loop(t){if(t-then>900){then=t;refresh();}requestAnimationFrame(loop);}requestAnimationFrame(loop);
root.StarfallGasVesselCargoUI8G={refresh};
})(globalThis);
