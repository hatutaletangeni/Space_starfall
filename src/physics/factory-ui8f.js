/* STARFALL 8F — original UI21 Engineer route; no fictional inventory grants. */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallFactory8F||!root.StarfallManufacturing8F)return;
const runtime=()=>root.StarfallRuntime;
const section=document.createElement('section');section.className='section';section.id='factory8f-section';
const heading=document.createElement('div');heading.className='section-title';heading.textContent='8F · MATERIAL FABRICATION & MACHINE TOOLS';
const summary=document.createElement('p');summary.className='panel-note';
summary.textContent='Work consumes physical refined stock, real ship battery energy and time. Existing fabrication room includes a wire die; other precision machines must actually be installed.';
const picker=document.createElement('select');picker.setAttribute('aria-label','Select versioned part bill of materials');
picker.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:9px;width:100%';
for(const [key,r] of Object.entries(root.StarfallManufacturing8F.RECIPES)){
 const o=document.createElement('option');o.value=key;o.textContent=key.replace(/_/g,' ').toUpperCase()+' · '+r.station;o.disabled=false;picker.appendChild(o);
}
const start=document.createElement('button');start.className='science-action';start.textContent='START REAL FABRICATION';start.type='button';
const cancel=document.createElement('button');cancel.className='science-action';cancel.textContent='CANCEL · ENERGY NONREFUNDABLE';cancel.type='button';
const buttons=document.createElement('div');buttons.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:10px 0';buttons.append(start,cancel);
// Read-only lookup of certified actual recipe outputs, not a new crafting path.
const outputSources=new Map();
for(const [id,recipe] of Object.entries(root.StarfallManufacturing8F.RECIPES)){
 for(const [material,kg] of Object.entries(recipe.outputs||{})){
  const list=outputSources.get(material)||[];
  list.push({id,kg,station:recipe.station,tool:recipe.tool,inputs:recipe.inputs});
  outputSources.set(material,list);
 }
}
const upstreamHints=Object.freeze({
 iron_concentrate:'8E ship refinery: Iron ore concentration, from physically mined iron_ore',
 hematite:'8E ship refinery: Identify and recover hematite, from certified iron_concentrate',
 carbon:'8E ship refinery: Recover carbon from physically mined carbon_feed',
 iron:'8E chemical plant: Hematite reduction requires carbon, certified furnace, CO vessel and powered gas manifold',
 steel:'8E chemical plant: Iron-carbon alloying requires physically recovered iron, carbon and certified furnace',
 copper:'8E copper sulfide concentration/identification and dedicated chemical reduction, not direct copper_ore fabrication',
 aluminum:'8E aluminium mineral identification and powered high-temperature reduction, not direct aluminum_ore fabrication',
 glass:'8E glass furnace/qualified silica process or finite pre-existing imported glass',
 refractory_block:'Requires a documented qualified 8E ceramic/refractory process or finite imported stock',
 insulation_polymer:'Requires a genuine finite polymer synthesis/import; copper wire alone cannot provide insulation',
 stocked_chips:'Finite qualified imported/salvaged chips only until cleanroom semiconductor process is commissioned',
 magnets:'Requires a qualified magnetic-material manufacturing/import path',
 bearing_steel:'Requires qualified alloy/heat-treatment production or finite imported stock'
});
function sourceAdvice(material){
 const recipes=outputSources.get(material)||[];
 if(recipes.length)return recipes.slice(0,3).map(x=>
  '8F '+x.id+' ('+x.kg+' kg / batch, '+x.station+'/'+x.tool+
  ') from '+Object.entries(x.inputs).map(([k,v])=>v+' kg '+k).join(', ')).join(' OR ');
 return upstreamHints[material]||'No certified 8F output recipe located; inspect 8E refinery/chemistry or obtain finite imported stock (NOT automatic)';
}
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
const info=document.createElement('pre');info.style.cssText='white-space:pre-wrap;font:11px/1.6 Consolas,monospace;max-height:320px;overflow:auto;color:#c8d9d9;background:#101b23;border:1px solid #53677566;padding:12px';
function render(){
 const r=runtime();if(!r?.factory8f){info.textContent='Manufacturing runtime unavailable.';return;}
 const c=r.factoryContext8F(),active=c.active,bom=root.StarfallFactory8F.billOfMaterials(picker.value);
 let q=null,reason='';try{q=r.factoryQuote8F(picker.value);}catch(e){reason=String(e.message||e);}
 // Read-only requirement audit: never awards parts or replaces certified factory quote.
 // The original 8A physical ship-hold lots remain authoritative.
 const shipHold=root.StarfallMining8D?.SHIP;
 const stock=shipHold?r.materials8a.inventory(shipHold):[];
 const snapshot=r.materials8a.snapshot();
 const reserved=new Map();
 for(const operation of snapshot.operations||[]){
  if(operation.status==='RESERVED'&&operation.lotId)
   reserved.set(operation.lotId,(reserved.get(operation.lotId)||0)+(operation.massKg||0));
 }
 const requirements=Object.entries(bom.inputs).map(([material,needed])=>{
  const held=stock.filter(l=>l.materialId===material).reduce((sum,l)=>sum+Math.max(0,l.massKg-(reserved.get(l.id)||0)),0);
  return {material,needed,held,missing:Math.max(0,needed-held)};
 });
 const missing=requirements.filter(x=>x.missing>1e-6);
 const kg=Object.entries(bom.inputs).map(([name,m])=>m+' kg '+name).join(', ');
 const finished=Object.entries(bom.outputs).map(([name,m])=>m+' kg '+name).join(', ');
 info.textContent='SHIP WORKSHOP   '+(c.workshopInstalled?'INSTALLED':'UNAVAILABLE')+
  '\nACCESS          '+(c.operatorNear?'AT LANDED WORKSHOP':'APPROACH SHIP / FABRICATION ROOM')+
  '\nENERGY          '+(c.energyJ/1e6).toFixed(3)+' MJ'+
  '\nJOB             '+(active?active.recipeId+' · '+(100*active.elapsedS/active.seconds).toFixed(1)+'% · '+active.energyJ.toFixed(0)+' J paid':'IDLE')+
  '\nPART BOM v1      '+bom.id+' / '+bom.category+
  '\nTOOL            '+bom.requiredStation+' / '+bom.tool+
  '\nINPUTS          '+kg+
  '\nOUTPUTS         '+finished+' + '+bom.scrapKg.toFixed(3)+' kg SCRAP'+
  '\nSTOCK CHECK      '+(missing.length?'MISSING '+missing.length+' MATERIAL TYPE(S)':'REQUIRED MASSES PRESENT')+
  '\nSHIP HOLD NEEDS  '+requirements.map(x=>'\n  '+x.material+': '+x.held.toFixed(2)+' / '+x.needed.toFixed(2)+' kg'+(x.missing>1e-6?' · SHORT '+x.missing.toFixed(2)+' kg':'')).join('')+
  '\nMISSING SOURCES  '+(missing.length?missing.map(x=>'\n  '+x.material+' → '+sourceAdvice(x.material)).join(''):'All recipe material masses are present; check certified grade, station, electricity and location')+
  '\nSTOCK NOTE       Mass only; grade, tooling, reservations and power checked by original READY quote'+
  '\nWORK            '+bom.seconds+' s · '+bom.energyJ.toFixed(0)+' J'+
  '\nTOLERANCE       '+bom.toleranceMm+' mm (illustrative)'+
  '\nREADY           '+(q?'YES':'NO · '+reason)+
  '\nRECENT LOTS     '+c.receipts.slice(-5).map(x=>'\n  '+x.id+' '+x.status+' '+x.recipeId).join('');
 start.disabled=!!active||!c.operatorNear||!c.powerEnabled||!q||c.energyJ<=0;
 cancel.disabled=!active;
}
function handle(fn){try{const answer=fn();status.textContent='8F '+(answer?.id||'job')+' accepted; all material and energy are finite.';}catch(e){status.textContent='8F · '+String(e?.message||e);}render();}
start.addEventListener('click',()=>handle(()=>runtime().factoryStart8F(picker.value)));
cancel.addEventListener('click',()=>handle(()=>runtime().factoryCancel8F()));
picker.addEventListener('change',render);
section.append(heading,summary,picker,buttons,status,info);host.append(section);
let stamp=0;function tick(){let now=performance.now();if(now-stamp>=850){stamp=now;render();}requestAnimationFrame(tick);}tick();
root.StarfallFactoryUI8F={refresh:render};
})(globalThis);
