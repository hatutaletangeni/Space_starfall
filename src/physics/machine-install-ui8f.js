/* STARFALL 8F -- machine-kit installation inspector in the existing Engineer UI. */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallMachineInstall8F)return;
const panel=document.createElement('section');panel.className='section';panel.id='machine-install8f-panel';
const title=document.createElement('div');title.className='section-title';
title.textContent='8F · PHYSICAL MACHINE INSTALLATION';
const expl=document.createElement('p');expl.className='panel-note';
expl.textContent='Install a complete certified machine kit physically carried in the ship hold. Installation consumes that one kit and ship battery energy; no free kit or machine is supplied. The time figure is an engineering estimate; installation currently completes as one paid service operation.';
const select=document.createElement('select');select.setAttribute('aria-label','Select carried machine kit');
select.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:9px;width:100%';
const go=document.createElement('button');go.type='button';go.className='science-action';go.textContent='INSTALL SELECTED PHYSICAL KIT';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
const info=document.createElement('pre');info.style.cssText='white-space:pre-wrap;font:11px/1.6 Consolas,monospace;color:#c8d9d9;background:#101b23;border:1px solid #53677566;padding:12px;max-height:280px;overflow:auto';
let previous='';
function refresh(){
 const r=root.StarfallRuntime;if(!r?.machineKitQuotes8F){info.textContent='8F installation runtime unavailable';return;}
 const ctx=r.factoryContext8F(),kits=r.machineKitQuotes8F(),machines=r.physical8a.list().filter(a=>a.type==='industrial_machine'&&a.location?.kind==='ship'&&a.location.slot==='workshop');
 const signature=JSON.stringify(kits.map(k=>[k.lotId,k.ready,k.materialId]));
 if(signature!==previous){const prior=select.value;select.replaceChildren();for(const kit of kits){
  const o=document.createElement('option');o.value=kit.lotId;o.textContent=kit.materialId.replace(/_/g,' ')+' · '+kit.lotId+(kit.ready?'':' [UNSEALED]');
  select.appendChild(o);}if(kits.some(k=>k.lotId===prior))select.value=prior;previous=signature;}
 const kit=kits.find(k=>k.lotId===select.value),spec=kit&&root.StarfallMachineInstall8F.CAPS[kit.materialId];
 const ready=!!kit?.ready&&ctx.shipLanded&&ctx.operatorNear&&ctx.workshopInstalled&&ctx.powerEnabled&&ctx.energyJ>=spec.workJ;
 go.disabled=!ready;
 info.textContent='SHIP WORKSHOP: '+(ctx.workshopInstalled?'INSTALLED':'UNAVAILABLE')+
 '\nACCESS: '+(ctx.operatorNear?'OPERATOR AT WORKSHOP':'LAND / APPROACH / ENTER FABRICATION')+
 '\nSHIP BATTERY: '+Math.round(ctx.energyJ)+' J'+
 '\nCARRIED MACHINE KITS: '+kits.length+
 '\nSELECTED: '+(kit?(kit.materialId+' · '+(kit.ready?'CERTIFIED':'UNAVAILABLE: '+kit.reason)):'NO FINITE KITS IN SHIP HOLD')+
 '\nINSTALL WORK: '+(spec?spec.workJ+' J · '+spec.seconds+' s nominal (currently one paid service operation)':'—')+
 '\nINSTALLED MACHINES: '+machines.length+
 (machines.length?'\n'+machines.map(a=>'  '+a.id+' · '+a.state.station+' · '+a.state.tools.join('/')).join('\n'):'')+
 '\nSYSTEM: Only real owned machine kits turn into working production stations.';
}
select.addEventListener('change',refresh);
go.addEventListener('click',()=>{try{const receipt=root.StarfallRuntime.machineInstall8F(select.value);
 status.textContent='Installed '+receipt.assetId+' · consumed '+receipt.sourceLotId+' · '+receipt.workJ+' J.';}
 catch(e){status.textContent=String(e?.message||e);}refresh();});
panel.append(title,expl,select,go,status,info);host.append(panel);
let last=0;function check(){const now=performance.now();if(now-last>900){last=now;refresh();}requestAnimationFrame(check);}check();
root.StarfallMachineInstallUI8F={refresh};
})(globalThis);
