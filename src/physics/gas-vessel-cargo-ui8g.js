/* 8G — actual pressurized vessel loading, never instant loose-gas cargo.
 * Uses separate ship cradle and keeps every gas lot in its vessel container.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallGasVesselCargo8G)return;
const panel=document.createElement('section');panel.className='section';panel.id='gas-vessel-cargo8g';
const heading=document.createElement('div');heading.className='section-title';
heading.textContent='8G · RATED GAS VESSEL SHIP GANTRY';
const note=document.createElement('p');note.className='panel-note';
note.textContent='Move one physically installed O₂/N₂ pressure vessel into a dedicated ship cradle and unload onto clear ground on another world. Its nitrogen or oxygen lots REMAIN inside the same rated tank, with full shell+gas mass added to ship flight physics and shared cargo limits. Needs powered landed ship, nearby EVA operator and 120 kJ for each lift. This does not transfer loose gas into the unpressurized material hold or grant a habitable atmosphere.';
const select=document.createElement('select');select.setAttribute('aria-label','Select rated gas vessel cargo');
select.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';
const load=document.createElement('button');load.type='button';load.className='science-action';
load.textContent='WINCH PRESSURE VESSEL INTO SHIP (120 kJ)';
const unload=document.createElement('button');unload.type='button';unload.className='science-action';
unload.textContent='UNLOAD PRESSURE VESSEL TO CLEAR SURFACE (120 kJ)';
const detail=document.createElement('p');detail.className='panel-note';
detail.textContent='The vessel and all its physical gas are one conserved cargo payload.';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
status.textContent='Requires one real physical industrial pressure vessel. Empty vessels can be repositioned too.';
const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center';
row.append(select,load,unload);panel.append(heading,note,row,detail,status);host.append(panel);
function refresh(){
 const rt=root.StarfallRuntime,c=rt?.gasVesselCargoContext8G?.();if(!c)return;
 const all=c.vessels||[],old=select.value,
  signature=all.map(x=>x.id+':'+x.location.kind+':'+x.gasKg.toFixed(3)).join('|');
 if(select.dataset.signature!==signature){select.dataset.signature=signature;select.replaceChildren();
  for(const v of all){const opt=document.createElement('option');opt.value=v.id;
   opt.textContent=v.id+' · '+v.materialId.toUpperCase()+' · '+v.gasKg.toFixed(2)+' kg gas · '+v.location.kind.toUpperCase();
   select.append(opt);}
  if(all.some(x=>x.id===old))select.value=old;
 }
 const selected=all.find(x=>x.id===select.value);
 const ready=c.landed&&c.eva&&c.enabled&&c.energyJ>=root.StarfallGasVesselCargo8G.LIMIT.workJ;
 load.disabled=!ready||!selected||selected.location.kind!=='surface';
 unload.disabled=!ready||!selected||selected.location.kind!=='ship';
 detail.textContent=selected?
   'PHYSICAL DRY VESSEL '+selected.massKg.toFixed(2)+' kg; GAS '+selected.gasKg.toFixed(2)+
   ' kg; FLIGHT PAYLOAD '+(selected.massKg+selected.gasKg).toFixed(2)+
   ' kg; EXTERNAL BAY '+selected.volumeM3.toFixed(2)+' m³.':
   'No actual nitrogen or oxygen pressure vessel is on this surface or in the ship cradle.';
}
function act(action){try{
 const receipt=root.StarfallRuntime.gasVesselCargoTransfer8G(action,select.value);
 status.textContent=action.toUpperCase()+' '+receipt.gasMaterialId.toUpperCase()+
  ' vessel '+receipt.assetId+'; '+receipt.totalLoadedMassKg.toFixed(2)+
  ' kg tank + same conserved gas, 120 kJ ship power spent; save committed.';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();}
load.addEventListener('click',()=>act('load'));unload.addEventListener('click',()=>act('unload'));
select.addEventListener('change',refresh);
let last=0;function tick(t){if(t-last>950){last=t;refresh();}requestAnimationFrame(tick);}
requestAnimationFrame(tick);
root.StarfallGasVesselCargoUI8G={refresh};
})(globalThis);
