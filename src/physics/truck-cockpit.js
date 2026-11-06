/* STARFALL shared truck cockpit: replaces ship/EVA HUD while driving.
 * This is UI only. Truck physics, drill, ore ownership and save remain in flight.js. */
(function(root){'use strict';
const ID='sf-truck-cockpit';
const on=()=>!!root.StarfallRuntime?.truckOccupied;
const panel=document.createElement('section');
panel.id=ID;panel.setAttribute('aria-label','Expedition truck cockpit');panel.hidden=true;
panel.innerHTML=`
 <div class="sft-header"><strong>EXPEDITION TRUCK</strong><span id="sft-world">SURFACE VEHICLE</span></div>
 <div class="sft-dials">
  <div><small>BATTERY</small><b id="sft-battery">—</b></div>
  <div><small>HOPPER</small><b id="sft-hopper">—</b></div>
  <div><small>CAMERA</small><b id="sft-camera">CHASE</b></div>
  <div><small>DRILL</small><b id="sft-drill">—</b></div>
 </div>
 <div id="sft-state" role="status">Vehicle initializing</div>
 <div class="sft-tools" aria-label="Truck utility actions">
  <button type="button" data-truck-action="EXIT">EXIT TRUCK</button>
  <button type="button" data-truck-action="MAP">MAP</button>
  <button type="button" data-truck-action="VIEW">VIEW</button>
  <button type="button" data-truck-action="LIGHTS">LIGHTS</button>
  <button type="button" data-truck-action="MINE">DRILL 20 KG</button>
  <button type="button" data-truck-action="LOAD">LOAD ORE</button>
  <button type="button" data-truck-action="SHORE">SHORE CRAWL</button>
  <button type="button" data-truck-action="CANCEL">STOP CYCLE</button>
 </div>
 <label class="sft-lots">Ore lot <select id="sft-lot" aria-label="Ore lot to load into ship"></select></label>
 <div id="sft-hint">W/S DRIVE · A/D STEER · X EXIT · V VIEW</div>
 <div class="sft-error" role="status" id="sft-error" hidden></div>`;
document.body.append(panel);
const el=id=>panel.querySelector('#'+id);
const buttons=Object.fromEntries([...panel.querySelectorAll('[data-truck-action]')].map(b=>[b.dataset.truckAction,b]));
const lot=el('sft-lot');
let lastLots='',lastAt=0;
function execute(action){
 const r=root.StarfallRuntime;
 if(!r?.truckOccupied)return;
 try{
  const result=r.truckHudAction(action,lot.value);
  el('sft-error').hidden=true;
  if(result===false)el('sft-hint').textContent='Action blocked by vehicle safety conditions';
 }catch(error){
  el('sft-error').textContent=String(error?.message||error).slice(0,180);
  el('sft-error').hidden=false;
 }
 refresh(true);
}
for(const b of Object.values(buttons)){
 b.addEventListener('pointerdown',e=>{e.stopPropagation();},{passive:true});
 b.addEventListener('click',e=>{e.stopPropagation();execute(b.dataset.truckAction);});
}
lot.addEventListener('keydown',e=>e.stopPropagation());
function refresh(force=false){
 const active=on();
 document.body.dataset.truckDriving=active?'true':'false';
 panel.hidden=!active;
 if(!active)return;
 const now=performance.now();if(!force&&now-lastAt<200)return;lastAt=now;
 const info=root.StarfallRuntime.truckHudInfo();
 el('sft-world').textContent=info.world+' · '+(info.onRamp?'RAMP':'GROUND');
 el('sft-battery').textContent=info.batteryPct+'%';
 el('sft-hopper').textContent=info.hopperKg.toFixed(0)+' / '+info.hopperLimitKg+' kg';
 el('sft-camera').textContent=info.camera;
 el('sft-drill').textContent=info.drillConditionPct+'%';
 el('sft-state').textContent=info.cycle?
  info.cycle+' · '+info.cyclePct+'%':info.surveyed?
  (info.deposit+' · '+Math.round(info.oreRemainingKg)+' kg remaining'):'NO SURVEY AT CURRENT DEPOSIT';
 el('sft-hint').textContent=info.hint+' · W/S DRIVE · A/D STEER';
 buttons.EXIT.disabled=!info.canExit;
 buttons.MINE.disabled=!info.canDrill;
 buttons.LOAD.disabled=!info.canLoad;
 buttons.CANCEL.disabled=!info.cycle;
 buttons.LIGHTS.textContent=info.lights?'LIGHTS ON':'LIGHTS OFF';
 buttons.SHORE.textContent=info.shoreCrawl?'SHORE CRAWL ON':'SHORE CRAWL';
 const list=JSON.stringify(info.lots.map(l=>[l.id,l.massKg]));
 if(list!==lastLots){
  const previous=lot.value;lot.replaceChildren();
  for(const item of info.lots){const option=document.createElement('option');option.value=item.id;
   option.textContent=item.materialId.replaceAll('_',' ')+' · '+item.massKg.toFixed(1)+' kg';lot.add(option);}
  if(info.lots.some(l=>l.id===previous))lot.value=previous;
  lastLots=list;
 }
 lot.hidden=!info.lots.length;
 lot.parentElement.hidden=!info.lots.length;
}
function tick(){try{refresh();}catch(error){console.warn('Truck HUD refresh',error);}requestAnimationFrame(tick);}
requestAnimationFrame(tick);
root.StarfallTruckCockpit={refresh,execute};
})(globalThis);
