/* 8G gantry controls: physical frames only, separate from original 8B truck. */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallFrameCargo8G)return;
const section=document.createElement('section');section.className='section';section.id='frame-cargo8g';
const title=document.createElement('div');title.className='section-title';
title.textContent='8G · MANUFACTURED FRAME CARGO GANTRY';
const note=document.createElement('p');note.className='panel-note';
note.textContent='Loads one incomplete manufactured chassis into a separate engineering cradle, without replacing or cloning the original expedition truck. Ship cargo mass, bay limits and 30 kJ operation energy are real. A landed powered ship and nearby EVA astronaut are required. Frame transport does not enable driving.';
const select=document.createElement('select');select.setAttribute('aria-label','Select manufactured frame cargo');
select.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:9px;max-width:100%';
const load=document.createElement('button');load.type='button';load.className='science-action';load.textContent='WINCH FRAME INTO SHIP (30 kJ)';
const unload=document.createElement('button');unload.type='button';unload.className='science-action';unload.textContent='UNLOAD FRAME ONTO CLEAR GROUND (30 kJ)';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
status.textContent='A real manufactured frame is required. The original truck stays in its separate ramp and cargo custody.';
const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center';
row.append(select,load,unload);section.append(title,note,row,status);host.append(section);
function refresh(){
 const rt=root.StarfallRuntime,c=rt?.frameCargoContext8G?.();if(!c)return;
 const old=select.value,items=c.frames||[],signature=items.map(x=>x.id+':'+x.location.kind).join('|');
 if(signature!==select.dataset.signature){select.dataset.signature=signature;select.replaceChildren();
  for(const frame of items){const o=document.createElement('option');o.value=frame.id;
   o.textContent=frame.id+' · '+frame.massKg.toFixed(1)+' kg · '+(frame.location.kind==='ship'?'SECURED IN SHIP':'ON SURFACE');
   select.append(o);}if(items.some(x=>x.id===old))select.value=old;
 }
 const frame=items.find(x=>x.id===select.value),ready=c.landed&&c.eva&&c.enabled&&c.energyJ>=root.StarfallFrameCargo8G.LIMIT.workJ;
 load.disabled=!ready||!frame||frame.location.kind!=='surface';
 unload.disabled=!ready||!frame||frame.location.kind!=='ship';
 if(!items.length)status.textContent='No 8G vehicle frames on this planet or in ship cradle. Manufacture one in Engineer first.';
}
function act(action){try{const receipt=root.StarfallRuntime.frameCargoTransfer8G(action,select.value);
 status.textContent=action.toUpperCase()+' COMMITTED: '+receipt.assetId+' · physical custody retained · energy debited · saved. No driving controls created.';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();}
load.addEventListener('click',()=>act('load'));unload.addEventListener('click',()=>act('unload'));
select.addEventListener('change',refresh);
let last=0;function tick(t){if(t-last>1000){last=t;refresh();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
root.StarfallFrameCargoUI8G={refresh};
})(globalThis);
