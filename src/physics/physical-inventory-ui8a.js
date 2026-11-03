/* Update 8A — compact read-only physical inventory inspector under Engineer. */
(function(root){'use strict';
const runtime=()=>root.StarfallRuntime, host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host)return;
const btn=document.createElement('button');btn.type='button';btn.className='ui21-link';btn.textContent='Cargo & Inventory';btn.title='View persistent ship, truck and rover ownership';
const shell=document.createElement('div');shell.className='modal-backdrop';shell.hidden=true;shell.id='physical8a-dialog';
const pane=document.createElement('section');pane.className='chart-panel';pane.setAttribute('role','dialog');pane.setAttribute('aria-modal','true');pane.setAttribute('aria-label','Physical cargo inventory');
const heading=document.createElement('h2');heading.textContent='Cargo & Inventory';
const note=document.createElement('p');note.textContent='Every vehicle has one saved ID and one custody location. Physical loading, tool inventory and cargo geometry arrive in subsequent stages.';
const status=document.createElement('div');status.style.cssText='white-space:pre-wrap;line-height:1.8;font:12px monospace;max-height:55vh;overflow:auto';
const close=document.createElement('button');close.type='button';close.textContent='Close';close.style.cssText='margin-top:18px;padding:12px 20px;border:1px solid #ecbb7a;background:#121c25';
const redraw=()=>{const a=runtime()?.physical8a?.list()||[];
 const model=runtime()?.materials8a;
 const stock=model?.inventory()||[],bins=model?.containers()||[];
 const heading='PHYSICAL VEHICLES\n';
 const vehicleText=a.map(v=>v.type.toUpperCase()+' · '+v.id+'\n'+
  'Custody: '+(v.location.kind==='ship'?'Spacecraft hold / '+v.location.slot:'Surface / '+v.location.bodyId)+'\n'+
  'Mass: '+v.massKg+' kg · Volume: '+v.volumeM3+' m³\nSource: '+v.provenance+'\n').join('\n');
 const stockText='\nMATERIAL LOTS ('+stock.length+')\n'+(stock.length?stock.map(l=>l.materialId+
  ' · '+l.massKg.toFixed(2)+' kg · '+l.containerId+' · '+l.provenance).join('\n'):'No sourced material stock available yet.');
 const binsText='\n\nCONTAINERS ('+bins.length+')\n'+(bins.length?bins.map(c=>{
  const u=model.used(c.id);return c.id+' · '+u.massKg.toFixed(2)+'/'+c.maxMassKg+' kg · '+u.volumeM3.toFixed(3)+'/'+c.maxVolumeM3+' m³';
 }).join('\n'):'No material storage commissioned yet.');
 status.textContent=heading+(vehicleText||'No vehicle data')+stockText+binsText;};
const shut=()=>{shell.hidden=true;btn.focus();};
btn.addEventListener('click',()=>{redraw();shell.hidden=false;close.focus();});
close.addEventListener('click',shut);shell.addEventListener('click',e=>{if(e.target===shell)shut();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!shell.hidden){e.preventDefault();e.stopPropagation();shut();}},true);
pane.append(heading,note,status,close);shell.append(pane);document.body.append(shell);host.append(btn);
root.StarfallInventoryUI8A={open:()=>btn.click(),refresh:redraw};
})(globalThis);
