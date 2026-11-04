/* 8G structural fabrication UI: read-only BOM + paid unqualified structural
 * staging. Neither button launches a rocket nor pressurizes a habitat.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallStructureAssembly8G)return;
const section=document.createElement('section');section.className='section';section.id='structure-assembly8g';
const heading=document.createElement('div');heading.className='section-title';
heading.textContent='8G · ROCKET & HABITAT PHYSICAL ASSEMBLY';
const explanation=document.createElement('p');explanation.className='panel-note';
explanation.textContent='Fabricate the full finite 8F bill, physically erect a rocket-integration rig or habitat-construction pad, then assemble on EVA from real ship cargo. Builds a DRY UNFUELED stage or UNPRESSURIZED shell. These structures do NOT launch or sustain life until independent propulsion, tank pressure, power, gas and T09 checks pass.';
const type=document.createElement('select');type.setAttribute('aria-label','Select dry rocket stage or habitat envelope');
for(const [id,label] of [['rocket_stage','DRY ROCKET STAGE'],['habitat_shell','UNPRESSURIZED HABITAT ENVELOPE']]){
 const option=document.createElement('option');option.value=id;option.textContent=label;type.append(option);
}
const pad=document.createElement('select');pad.setAttribute('aria-label','Select physical rocket or habitat assembly pad');
const button=document.createElement('button');button.className='science-action';button.type='button';
button.textContent='ASSEMBLE UNQUALIFIED PHYSICAL STRUCTURE';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
status.textContent='Select an installed assembly site; no materials or energy are granted by this screen.';
const detail=document.createElement('pre');detail.style.cssText='white-space:pre-wrap;font:11px/1.45 Consolas,monospace;background:#101b23;color:#cad8dc;border:1px solid #53677566;max-height:250px;overflow:auto;padding:10px';
const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center';
for(const el of [type,pad])el.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';
row.append(type,pad,button);section.append(heading,explanation,row,status,detail);host.append(section);
function refresh(){
 const rt=root.StarfallRuntime,ctx=rt?.structureAssemblyContext8G?.();
 if(!ctx)return;
 const selected=root.StarfallStructureAssembly8G.BLUEPRINTS[type.value],padList=(ctx.pads||[]).filter(x=>x.station===selected?.station);
 const signature=padList.map(x=>x.id).join('|');
 if(signature!==pad.dataset.signature){const previous=pad.value;pad.dataset.signature=signature;pad.replaceChildren();
  for(const p of padList){const option=document.createElement('option');option.value=p.id;option.textContent=p.id+' · '+p.station;pad.append(option);}
  if(padList.some(x=>x.id===previous))pad.value=previous;
 }
 let q=null,error='';
 try{if(pad.value)q=rt.structureQuote8G(type.value,pad.value);}
 catch(e){error=String(e.message||e);}
 button.disabled=!q?.ready||!q?.powered||!ctx.landed||!ctx.eva;
 detail.textContent='BLUEPRINT '+type.value+
  '\nREQUIRED FACILITY: '+(selected?.station||'NONE')+
  '\nAVAILABLE SITE: '+(pad.value||'FABRICATE/ERECT A PHYSICAL KIT FIRST')+
  '\nSHIP BATTERY: '+Math.round(ctx.energyJ)+' J'+
  '\nWORK: '+(q?.workJ||selected?.workJ||0)+' J / estimated labor '+(q?.assemblySeconds||selected?.assemblySeconds||0)+' s (not timed yet)'+
  '\nMATERIAL MASS: '+(q?.massKg?.toFixed(2)||'—')+' kg'+
  '\nPARTS: '+(q?.ready?'FULL CERTIFIED BILL':'MISSING')+
  (q?.shortages?.length?'\nSHORTAGES: '+q.shortages.map(x=>x.materialId+' '+x.missingKg.toFixed(2)+' kg').join(', '):'')+
  '\nPREFLIGHT: '+(error||(!pad.value?'NO PHYSICAL FACILITY':q?.ready&&q?.powered?'READY FOR NON-OPERATIONAL ASSEMBLY':'BLOCKED'))+
  '\nPOST-CONSTRUCTION: NO PRESSURE / NO PROPELLANT / NO AUTOMATIC LAUNCH';
}
button.addEventListener('click',()=>{try{
 const receipt=root.StarfallRuntime.structureStage8G(type.value,pad.value);
 status.textContent='CONSTRUCTED '+receipt.assetId+' · '+receipt.massKg.toFixed(2)+' kg from real 8F parts · '+receipt.energyJ+' J ship battery spent. UNQUALIFIED: rocket not launchable, habitat not habitable.';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();});
type.addEventListener('change',refresh);pad.addEventListener('change',refresh);
let at=0;function tick(t){if(t-at>1000){at=t;refresh();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
root.StarfallStructureAssemblyUI8G={refresh};
})(globalThis);
