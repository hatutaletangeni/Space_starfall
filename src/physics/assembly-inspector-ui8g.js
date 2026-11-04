/* STARFALL 8G — safe truck locator and assembly readiness, no commissioning. */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallAssemblyInspector8G||!root.StarfallAssembly8G)return;
const panel=document.createElement('section');panel.className='section';panel.id='assembly-inspector8g-panel';
const h=document.createElement('div');h.className='section-title';h.textContent='8G · VEHICLE ASSEMBLY PREFLIGHT & TRUCK LOCATOR';
const explain=document.createElement('p');explain.className='panel-note';
explain.textContent='Read-only BOM preflight plus a separate paid frame-assembly action. Frames are persistent, conserved and visibly unfinished; they are not drivable vehicles. The original truck remains unchanged.';
const button=document.createElement('button');button.type='button';button.className='science-action';
button.textContent='OPEN TRUCK & CARGO INVENTORY';
const where=document.createElement('p');where.className='panel-note';where.setAttribute('role','status');
const select=document.createElement('select');select.setAttribute('aria-label','Inspect future vehicle bill of materials');
select.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:9px;max-width:100%';
for(const [key,d] of Object.entries(root.StarfallAssembly8G.DEFINITIONS)){
 const x=document.createElement('option');x.value=key;x.textContent=key.replace(/_/g,' ').toUpperCase()+' / '+d.facility;select.append(x);
}
const pad=document.createElement('select');pad.setAttribute('aria-label','Physical assembly pad');
pad.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:9px;max-width:100%';
const stage=document.createElement('button');stage.type='button';stage.className='science-action';
stage.textContent='ASSEMBLE REAL FRAME (200 kJ · NOT DRIVABLE)';
const stageStatus=document.createElement('p');stageStatus.className='panel-note';stageStatus.setAttribute('role','status');
stageStatus.textContent='Requires powered landed ship, astronaut EVA within 35 m, a physical pad and a certified parts bill. No truck duplication.';
const pre=document.createElement('pre');pre.style.cssText='white-space:pre-wrap;font:11px/1.55 Consolas,monospace;background:#101b23;color:#c8d9d9;border:1px solid #53677566;padding:12px;max-height:340px;overflow:auto';
function refresh(){
 const rt=root.StarfallRuntime;if(!rt?.physical8a||!rt?.materials8a)return;
 const ctx=rt.assemblyContext8G?.(),pads=ctx?.padIds||[],oldPad=pad.value;
 const current=[...pad.options].map(x=>x.value).join('|'),next=pads.join('|');
 if(current!==next){pad.replaceChildren();
  for(const id of pads){const opt=document.createElement('option');opt.value=id;opt.textContent='PAD · '+id;pad.append(opt);}
  if(pads.includes(oldPad))pad.value=oldPad;}
 let liveQuote=null,liveError='';
 try{if(pad.value&&['truck','science_rover'].includes(select.value))liveQuote=rt.assemblyQuote8G(select.value,pad.value);}
 catch(e){liveError=String(e.message||e);}
 stage.disabled=!liveQuote?.ready||!ctx?.powered||ctx.energyJ<200000;
 stage.title=liveQuote?.ready?'Consumes certified parts and 200000 J into one NON-OPERATIONAL frame':liveError||'Missing physical pad or parts';

 const truck=rt.physical8a.get('truck-expedition-001'),l=truck?.location;
 where.textContent=!truck?'NO EXPEDITION TRUCK IN CUSTODY — restore previous save rather than spawning another':
  l.kind==='ship'?'TRUCK: SECURED IN STARBOARD CARGO BAY. Land on flat terrain; walk out the aft crew ramp, press B at the right-hand WIDE cargo ramp, X to enter, S to reverse. Rack: '+rt.cargo8b?.mode:
  'TRUCK: LEFT ON '+l.bodyId+'. Return to that planet; no replacement is spawned when you land elsewhere.';
 try{
  const c=rt.refineryContext8E(),q=root.StarfallAssemblyInspector8G.report({
   blueprintId:select.value,materials:rt.materials8a.snapshot(),physical:rt.physical8a.serialize(),
   containerId:root.StarfallMining8D.SHIP,bodyId:c.bodyId,shipLanded:c.shipLanded,
   powerEnabled:c.powerEnabled,operatorNear:c.operatorNear});
  pre.textContent='BLUEPRINT '+q.blueprintId+' / '+q.kind+
   '\nNOMINAL MASS '+q.nominalBlueprintMassKg+' kg (actual required part mass '+q.exactPartMassKg.toFixed(3)+' kg)'+
   '\nREQUIRED PHYSICAL FACILITY '+q.facilityNeeded+' / '+(q.facilityId||'NOT INSTALLED ON THIS PLANET')+
   '\nLANDED / POWERED / NEAR '+[q.flags.shipLanded,q.flags.powerEnabled,q.flags.operatorNear].map(v=>v?'YES':'NO').join(' / ')+
   '\nCERTIFIED SHIP PARTS (kg):'+
   q.parts.map(p=>'\n '+p.materialId+': '+p.availableKg.toFixed(2)+' / '+p.requiredKg.toFixed(2)+(p.missingKg>1e-7?'  NEED '+p.missingKg.toFixed(2):'  OK')).join('')+
   '\nBOM PREFLIGHT '+(q.readyForEngineeringReview?'READY FOR FURTHER ENGINEERING':'INCOMPLETE')+
   '\nACTUAL VEHICLE COMMISSIONING: DISABLED / NOT IMPLEMENTED'+
   '\n'+q.reason;
 }catch(e){pre.textContent='Inspection unavailable: '+String(e.message||e);}
}
button.addEventListener('click',()=>root.StarfallInventoryUI8A?.open?.());
stage.addEventListener('click',()=>{
 try{
  const rt=root.StarfallRuntime,receipt=rt.assemblyStage8G(select.value,pad.value);
  stageStatus.textContent='ASSEMBLED '+receipt.assetId+' · '+receipt.massKg.toFixed(2)+' kg · '+receipt.status+
   '. Conserved physical frame; NOT DRIVABLE until steering, brakes, powertrain and 3D collision are validated.';
 }catch(e){stageStatus.textContent='BLOCKED: '+String(e.message||e);}
 refresh();
});
pad.addEventListener('change',refresh);
select.addEventListener('change',refresh);
panel.append(h,explain,button,where,select,pad,stage,stageStatus,pre);host.append(panel);
let last=0;function tick(){const t=performance.now();if(t-last>=900){last=t;refresh();}requestAnimationFrame(tick);}tick();
root.StarfallAssemblyInspectorUI8G={refresh};
})(globalThis);