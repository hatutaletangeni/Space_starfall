/* 8E-R Resource Test Lab. Only reads authentic gameplay state and opens
 * authoritative existing controls. NEVER creates ore, air, gas, equipment or power. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const shell=document.createElement('section');
shell.id='sf-resource-tests8er';shell.hidden=true;shell.setAttribute('role','dialog');
shell.setAttribute('aria-modal','true');shell.setAttribute('aria-label','Mining and gas storage tests');
shell.innerHTML='<div class="sfr-window"><header><div><small>STARFALL · RESOURCE FIELD TEST</small><h2 id="sfr-title">Mining & Haulage</h2></div><button id="sfr-close" type="button">CLOSE ✕</button></header><nav aria-label="Resource test"><button type="button" data-sfr-tab="mining">01 · MINE ORE</button><button type="button" data-sfr-tab="gas">02 · STORE GAS</button></nav><div id="sfr-readout" role="status"></div><ol id="sfr-steps"></ol><div class="sfr-explain">These are live checks of existing game systems. Completing a step requires genuine mining, manufacturing, energy and materials; this guide never grants resources.</div></div>';
document.body.append(shell);
const tabBtns=[...shell.querySelectorAll('[data-sfr-tab]')],readout=$('sfr-readout'),steps=$('sfr-steps');
let selected='mining',priorFocus=null,stamp=0;
const mining=[
 ['Find a real deposit','Explore → World Survey; select a mineral occurrence on the surface. Survey evidence is required.','survey-open','Explore'],
 ['Park the original truck at the deposit','Follow the truck locator, enter with X, drive to the surveyed deposit and stop. The drill uses the original battery.','mining8d-panel','Operate'],
 ['Drill 20 kg','Start the existing physical bore. One batch requires 24 seconds and 57.6 kJ.','mining8d-panel','Operate'],
 ['Verify the ore in the hopper','The original hopper holds at most 800 kg / 1.2 m³. Check the real 8A cargo ledger; no free ore is given.','physical8a-dialog','Engineer'],
 ['Return and load into ship','Park near the landed ship and run a real 16-second loader cycle (up to 50 kg). Confirm the ore moved from truck to ship.','mining8d-panel','Operate']
];
const gas=[
 ['Manufacture a rated pressure vessel','Build the pressure-rated N₂ vessel with genuine materials, manufacturing energy and ship hardware. No starter gas is assumed.','factory8f-section','Engineer'],
 ['Erect separator and vessel on surface','Use the existing real industrial kit placement. The nitrogen separator and rated vessel must actually be installed on a suitable atmosphere-bearing world.','industrial8e-physical','Engineer'],
 ['Collect nitrogen from air','Separate a finite 20 kg air batch using 810 kJ. The game estimates N₂ fraction from a modeled atmosphere; other gases are vented.','air-fractionation8g','Engineer'],
 ['Check finite gas custody','Inspect the original N₂ vessel and 8A material ledger; there must be gas mass in the same physical vessel, not a new duplicate.','physical8a-dialog','Engineer'],
 ['Load the filled sealed vessel aboard','Use the original gas vessel gantry near your landed ship. A physical load or unload consumes 90 kJ and transports the contained gas with the vessel.','gas-vessel-cargo8g','Engineer'],
 ['Optional: move gas between rated vessels','Advanced 8H requires two distinct rated vessels, an installed pipe, correct reach, an original wired 420 W pump port, and actual powered transfer time.','pressure8h-live-panel','Engineer']
];
function checkList(){
 const r=root.StarfallRuntime; const miningMode=selected==='mining';
 if(!r)return 'GAME NOT READY · Waiting for the active expedition runtime.';
 if(miningMode){try{
  const c=r.miningContext8D(),site=r.miningDeposit8D(),lots=r.materials8a.inventory(root.StarfallMining8D.TRUCK),
    survey=!!site&&r.resources8c.observations().some(x=>x.siteId===site.id);
  return 'ORIGINAL TRUCK: '+(c.truckPresent?'ON WORLD':'NOT ON THIS WORLD')+
    ' · SURVEY: '+(survey?'DONE':'NEEDED')+
    ' · DRILL: '+(r.mining8d.active?(r.mining8d.active.type+' IN PROGRESS'):'IDLE')+
    ' · HOPPER: '+c.truckHopper.massKg.toFixed(1)+' / 800 kg'+
    ' · LOTS: '+lots.length+
    ' · SHIP HOLD: '+c.shipWarehouse.massKg.toFixed(1)+' / 9000 kg';
 }catch(e){return 'MINING CHECK: '+String(e.message||e);}}
 try{
  const a=r.airFractionationContext8G?.(),cargo=r.gasVesselCargoContext8G?.(),pipe=r.logisticsPressureContext8H?.();
  const vessels=cargo?.vessels||[],gas=vessels.reduce((t,v)=>t+(Number.isFinite(v.gasKg)?v.gasKg:0),0);
  return 'SEPARATORS: '+(a?.plantIds?.length||0)+
   ' · N₂ VESSELS: '+(a?.vesselIds?.length||0)+
   ' · ELIGIBLE GAS VESSELS: '+vessels.length+
   ' · STORED GAS: '+gas.toFixed(3)+' kg'+
   ' · RATED PIPELINES: '+(pipe?.pipes?.length||0)+
   ' · POWER: '+(a?.powerEnabled?'SHIP POWER ON':'SHIP POWER OFF');
 }catch(e){return 'GAS CHECK: '+String(e.message||e);}
}
function showWorkspace(id,page){
 const node=$(id);
 shell.hidden=true;
 root.StarfallUI21?.openRoute?.(page);
 const panel=$('panel');
 panel?.classList.remove('collapsed');
 panel?.classList.add('ui20-expanded');
 document.body.classList.add('sf-workspace-open');
 if(id==='physical8a-dialog'){root.StarfallInventoryUI8A?.open?.();return;}
 if(node){node.scrollIntoView({block:'start',behavior:'instant'});if(node.tagName==='BUTTON')node.click();}
 else{const notice=$('engineering-workflow-hint');if(notice)notice.textContent='This optional resource control is not installed in this edition.';}
}
function render(){
 const current=selected==='mining'?mining:gas;
 $('sfr-title').textContent=selected==='mining'?'Mine & haul ore':'Collect & store gas';
 readout.textContent=checkList();steps.replaceChildren();
 for(let i=0;i<current.length;i++){const [label,desc,id,page]=current[i],li=document.createElement('li'),heading=document.createElement('strong'),p=document.createElement('p'),btn=document.createElement('button');
  heading.textContent=label;p.textContent=desc;btn.type='button';btn.textContent='OPEN '+page.toUpperCase()+' CONTROL';btn.addEventListener('click',()=>showWorkspace(id,page));
  li.append(heading,p,btn);steps.append(li);
 }
 for(const b of tabBtns)b.setAttribute('aria-current',String(b.dataset.sfrTab===selected));
}
function open(which='mining'){priorFocus=document.activeElement;selected=which==='gas'?'gas':'mining';shell.hidden=false;render();$('sfr-close').focus();}
function close(){shell.hidden=true;priorFocus?.focus?.();}
for(const b of tabBtns)b.addEventListener('click',()=>{selected=b.dataset.sfrTab;render();});
$('sfr-close').addEventListener('click',close);
shell.addEventListener('click',e=>{if(e.target===shell)close();});
document.addEventListener('keydown',e=>{if(shell.hidden)return;
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
 if(e.key==='Tab'){const buttons=[...shell.querySelectorAll('button')].filter(b=>b.offsetParent!==null);
  if(!buttons.length)return;
  if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}
  else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}}
},true);
function tick(t){root.requestAnimationFrame(tick);if(shell.hidden||t-stamp<1000)return;stamp=t;readout.textContent=checkList();}
root.requestAnimationFrame(tick);
root.StarfallResourceTests8ER=Object.freeze({open,close});
})(window);
