/* STARFALL 8G — safe truck locator and assembly readiness, no commissioning. */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallAssemblyInspector8G||!root.StarfallAssembly8G)return;
const panel=document.createElement('section');panel.className='section';panel.id='assembly-inspector8g-panel';
const h=document.createElement('div');h.className='section-title';h.textContent='8G · VEHICLE ASSEMBLY PREFLIGHT & TRUCK LOCATOR';
const explain=document.createElement('p');explain.className='panel-note';
explain.textContent='Read-only engineering inspector. It never creates a vehicle or grants stock. Check the original truck custody and exact missing real components.';
const button=document.createElement('button');button.type='button';button.className='science-action';
button.textContent='OPEN TRUCK & CARGO INVENTORY';
const where=document.createElement('p');where.className='panel-note';where.setAttribute('role','status');
const select=document.createElement('select');select.setAttribute('aria-label','Inspect future vehicle bill of materials');
select.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:9px;max-width:100%';
for(const [key,d] of Object.entries(root.StarfallAssembly8G.DEFINITIONS)){
 const x=document.createElement('option');x.value=key;x.textContent=key.replace(/_/g,' ').toUpperCase()+' / '+d.facility;select.append(x);
}
const pre=document.createElement('pre');pre.style.cssText='white-space:pre-wrap;font:11px/1.55 Consolas,monospace;background:#101b23;color:#c8d9d9;border:1px solid #53677566;padding:12px;max-height:340px;overflow:auto';
function refresh(){
 const rt=root.StarfallRuntime;if(!rt?.physical8a||!rt?.materials8a)return;
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
select.addEventListener('change',refresh);
panel.append(h,explain,button,where,select,pre);host.append(panel);
let last=0;function tick(){const t=performance.now();if(t-last>=900){last=t;refresh();}requestAnimationFrame(tick);}tick();
root.StarfallAssemblyInspectorUI8G={refresh};
})(globalThis);