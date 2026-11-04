/* 8G: paid EVA replacement-part repairs of real physical structures. */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallFieldRepair8G)return;
const panel=document.createElement('section');panel.className='section';panel.id='field-repair8g';
const title=document.createElement('div');title.className='section-title';title.textContent='8G · PHYSICAL FIELD REPAIRS';
const help=document.createElement('p');help.className='panel-note';
help.textContent='Repair a damaged manufactured frame, dry rocket or habitat envelope only when on EVA beside it. Every repair takes one genuine manufactured spare from your ship hold, returns the old part as equally massive scrap and consumes ship electrical energy. Repairs never automatically fuel a rocket or make a habitat habitable.';
const chooser=document.createElement('select');chooser.setAttribute('aria-label','Select damaged manufactured structure');
chooser.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';
const action=document.createElement('button');action.type='button';action.className='science-action';
action.textContent='REPLACE DAMAGED PHYSICAL PART';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
status.textContent='No free repairs: requires a certified replacement and ship energy.';
panel.append(title,help,chooser,action,status);host.append(panel);
function refresh(){
 const rt=root.StarfallRuntime,c=rt?.fieldRepairContext8G?.();if(!c)return;
 const old=chooser.value,signature=c.available.map(x=>x.id+':'+x.condition.toFixed(3)).join('|');
 if(chooser.dataset.signature!==signature){chooser.dataset.signature=signature;chooser.replaceChildren();
  for(const x of c.available){const opt=document.createElement('option');opt.value=x.id;
   opt.textContent=x.id+' · '+Math.round(x.condition*100)+'% · '+x.replacement+' · '+Math.round(x.workJ/1000)+' kJ';
   chooser.append(opt);}
  if(c.available.some(x=>x.id===old))chooser.value=old;
 }
 const chosen=c.available.find(x=>x.id===chooser.value);
 const stock=chosen&&rt.materials8a.inventory(c.sourceContainerId)
   .filter(l=>l.materialId===chosen.replacement&&l.grade>=.98)
   .reduce((s,l)=>s+l.massKg,0);
 action.disabled=!chosen||!c.landed||!c.eva||!c.powered||
  c.energyJ<chosen.workJ||stock<root.StarfallFieldRepair8G.REPAIRS[chosen.type].kg;
 if(!c.available.length)status.textContent='No damaged manufactured structures on this world.';
}
action.addEventListener('click',()=>{try{const r=root.StarfallRuntime.fieldRepair8G(chooser.value);
 status.textContent='COMMITTED '+r.assetId+': '+r.part+' replaced, '+r.kg+' kg damaged stock returned as scrap, '+r.energyJ+' J spent. Condition '+Math.round(r.conditionBefore*100)+'% → '+Math.round(r.conditionAfter*100)+'%.';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();});
chooser.addEventListener('change',refresh);
let last=0;function tick(t){if(t-last>900){last=t;refresh();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
root.StarfallFieldRepairUI8G={refresh};
})(globalThis);
