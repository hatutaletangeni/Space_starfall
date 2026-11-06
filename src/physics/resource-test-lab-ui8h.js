/* STARFALL resource test lab — access to source-owned 8C/8D/8E/8F/8G/8H jobs.
 * Read-only diagnostics and navigation only: this module never creates stock,
 * starts work, bypasses energy or writes to SF saves.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Operate"]');
if(!host)return;
const $=id=>document.getElementById(id);
const open=document.createElement('button');
open.id='resource8h-open';open.type='button';open.className='ui21-link';
open.textContent='Mine, Manufacture & Store Gas';
open.setAttribute('aria-haspopup','dialog');
open.setAttribute('aria-controls','resource8h-dialog');
open.style.cssText='width:100%;text-align:left;margin:6px 0 10px';
const note=document.createElement('p');
note.className='ui21-intro';
note.textContent='Guided production tests · real truck, materials, machinery and pressure vessels';
host.insertBefore(note,host.children[1]||null);
host.insertBefore(open,note.nextSibling);
const style=document.createElement('style');
style.textContent=String.raw`
#resource8h-dialog[hidden]{display:none!important}
#resource8h-dialog{position:fixed;inset:0;z-index:90;background:#020812e9;display:grid;place-items:center;padding:12px;overscroll-behavior:contain}
#resource8h-dialog .resource-card{width:min(820px,97vw);max-height:92dvh;overflow:auto;overscroll-behavior:contain;background:#0c1722;border:1px solid #e9bb7890;box-shadow:0 15px 35px #0009;padding:16px;color:#e5e8e8}
#resource8h-dialog header{display:flex;align-items:center;justify-content:space-between;gap:12px}
#resource8h-dialog h2{font:600 18px/1.25 "Segoe UI",sans-serif;margin:4px 0;color:#ecbb7a}
#resource8h-dialog p{font:12px/1.6 "Segoe UI",sans-serif;color:#adbcc7;margin:8px 0}
#resource8h-dialog button{touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;border:1px solid #667a82;background:#172532;color:#e5e8e8;border-radius:5px;padding:10px;font:12px "Segoe UI",sans-serif;cursor:pointer}
#resource8h-dialog button:focus-visible{outline:2px solid #ecbb7a;outline-offset:2px}
#resource8h-dialog button[aria-selected="true"]{border-color:#ecbb7a;background:#493925}
#resource8h-dialog .resource-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
#resource8h-dialog .resource-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:start}
#resource8h-dialog .resource-panel{border:1px solid #ffffff24;padding:12px;min-width:0;background:#ffffff04}
#resource8h-dialog h3{font:600 13px "Segoe UI",sans-serif;color:#ecbb7a;margin:0 0 8px}
#resource8h-dialog .resource-steps{display:grid;gap:7px}
#resource8h-dialog .resource-steps button{text-align:left;width:100%}
#resource8h-dialog .resource-steps button b{display:block;color:#ecbb7a;margin-bottom:3px}
#resource8h-dialog .resource-steps button span{display:block;color:#c0cbd0;font-size:11px;line-height:1.35}
#resource8h-dialog pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.6 Consolas,monospace;color:#d5e0e2;max-height:48dvh;overflow:auto}
#resource8h-dialog .resource-foot{margin-top:12px;border-top:1px solid #ffffff28;padding-top:8px}
@media(max-width:620px),(max-height:490px){#resource8h-dialog .resource-card{max-height:94dvh;padding:11px}#resource8h-dialog .resource-grid{grid-template-columns:1fr}#resource8h-dialog pre{max-height:140px}#resource8h-dialog .resource-tabs{margin:8px 0}#resource8h-dialog button{padding:8px;min-height:37px}}
`;
document.head.appendChild(style);
const overlay=document.createElement('div');
overlay.id='resource8h-dialog';overlay.hidden=true;
overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
overlay.setAttribute('aria-label','Mine, manufacture and store gas test lab');
const card=document.createElement('div');card.className='resource-card';
const header=document.createElement('header');
const heading=document.createElement('h2');heading.textContent='RESOURCE TEST LAB';
const close=document.createElement('button');close.type='button';close.textContent='Close ✕';close.setAttribute('aria-label','Close resource test lab');
header.append(heading,close);
const intro=document.createElement('p');
intro.textContent='Select a production chain. Each action opens its genuine existing in-game control. Prerequisites, physical travel, stored mass, power and save state are never bypassed.';
const tabs=document.createElement('div');tabs.className='resource-tabs';tabs.setAttribute('role','tablist');
const grid=document.createElement('div');grid.className='resource-grid';
const left=document.createElement('section');left.className='resource-panel';
const subtitle=document.createElement('h3');
const steps=document.createElement('div');steps.className='resource-steps';
left.append(subtitle,steps);
const right=document.createElement('section');right.className='resource-panel';
const statusTitle=document.createElement('h3');statusTitle.textContent='Live engineering readout';
const status=document.createElement('pre');status.id='resource8h-status';status.setAttribute('aria-live','polite');
right.append(statusTitle,status);
grid.append(left,right);
const foot=document.createElement('p');foot.className='resource-foot';
foot.textContent='Evidence: inventory and machinery belong to original 8A–8H game stores. This guide does not grant ore, gas, tanks, energy, or machines. If a requirement is missing, build, survey, transport, wire or power it through the linked console.';
card.append(header,intro,tabs,grid,foot);overlay.append(card);document.body.append(overlay);
const routes={
 mining:[
  ['Survey geological deposit','Explore','resources8c-explore','StarfallProspectingUI8C','On foot: use the spectrometer and record a local finite deposit.'],
  ['Drill ore into truck hopper','Operate','mining8d-panel','StarfallMiningUI8D','Park the original truck at the surveyed site; spend 57.6 kJ over 24 seconds per 20 kg bore.'],
  ['Haul / load ore into ship','Operate','mining8d-panel','StarfallMiningUI8D','Drive near the ship, exit the truck and physically load an existing lot (up to 50 kg per 16-second cycle).'],
  ['Refine real ore','Engineer','refinery8e-panel','StarfallRefineryUI8E','A landed, powered ship and correct material lots are required; yields and byproducts consume finite stock.'],
  ['Manufacture a part','Engineer','factory8f-section','StarfallFactoryUI8F','Choose a compatible recipe and installed machine; check feedstock, waste, energy, manufacturing time and output.'],
  ['Install machine kits','Engineer','machine-install8f-panel','StarfallMachineInstallUI8F','Machine installation consumes an actually owned certified kit and finite ship energy.'],
  ['Inspect custody / deliveries','Engineer','logistics8h-panel','StarfallLogisticsUI8H','View real truck, depot and shipping orders without inventing or transporting stock.']
 ],
 gas:[
  ['Build a rated vessel and separator','Engineer','industrial8e-physical','StarfallIndustrialSiteUI8E','Manufacture certified kits, then physically install a gas vessel and air separator on the same world.'],
  ['Collect atmospheric nitrogen','Engineer','air-fractionation8g','StarfallAirFractionationUI8G','On an atmosphere-bearing world with powered installed facilities, separate 20 kg of real local air for 810 kJ.'],
  ['Inspect vessel gas','Engineer','air-fractionation8g','StarfallAirFractionationUI8G','Check the collected N₂ mass in the rated original pressure-vessel stock, not a phantom ship tank.'],
  ['Load the sealed vessel aboard','Engineer','gas-vessel-cargo8g','StarfallGasVesselCargoUI8G','Walk near the landed ship; winch the real gas-filled vessel for 90 kJ.'],
  ['Transfer gas through a pipe','Engineer','pressure8h-live-panel','StarfallPressurePipeLiveUI8H','Advanced: build rated flanges/pipe, install a 420 W powered T02 pump and move a finite original 8A gas lot.'],
  ['Run a chemical process','Engineer','industrial8e-physical','StarfallIndustrialSiteUI8E','Use genuine installed plant, permitted real reactants, routed input gas, power and compatible product vessel.']
 ]};
let active='mining',priorFocus=null;
const fmt=(v,unit)=>Number.isFinite(Number(v))?Number(v).toFixed(2)+' '+unit:'—';
function safe(fn,fallback=null){try{const result=fn();return result==null?fallback:result;}catch(_){return fallback;}}
function lines(){
 const r=root.StarfallRuntime;
 if(!r)return ['FLIGHT NOT READY — begin a game before using these consoles.'];
 const m=safe(()=>r.miningContext8D()),g=safe(()=>r.airFractionationContext8G()),
  vessels=safe(()=>r.gasVesselCargoContext8G()?.vessels,[])||[],
  deposits=safe(()=>r.miningDeposit8D()),
  surveyed=safe(()=>deposits&&r.resources8c.observations().some(x=>x.siteId===deposits.id),false),
  refinery=safe(()=>r.refineryContext8E()),
  factory=safe(()=>r.factoryContext8F()),
  ore=safe(()=>r.materials8a.inventory(root.StarfallMining8D.TRUCK),[])||[],
  shipped=safe(()=>r.materials8a.inventory(root.StarfallMining8D.SHIP),[])||[];
 if(active==='mining')return [
 'SOURCE: original world + truck + 8A lot ledger',
 'TRUCK: '+(m?(m.truckPresent?'ON THIS WORLD':'NOT ON THIS WORLD'):'UNKNOWN')+
   ' / '+(m?.truckIdle?'PARKED':'MOVING / UNAVAILABLE'),
 'TRUCK POWER: '+fmt(m?.energyJ,'J'),
 'OPERATOR: '+(m?.operatorNear?'AT EQUIPMENT':'GO ON FOOT NEAR TRUCK'),
 'TARGET DEPOSIT: '+(deposits?.label||'NO MINERAL SITE AT CURRENT SECTOR'),
 'SURVEY: '+(surveyed?'RECORD EXISTS':'SURVEY THIS SECTOR'),
 'HOPPER: '+fmt(m?.truckHopper?.massKg,'kg'),
 'ORE LOTS IN TRUCK: '+ore.length,
 'SHIP LOADER: '+(m?.truckNearShip?'TRUCK IN RANGE':'DRIVE BACK TO SHIP'),
 'SHIP RAW HOLD: '+fmt(m?.shipWarehouse?.massKg,'kg'),
 'REFINERY: '+(refinery?.workshopInstalled?'INSTALLED':'NOT READY'),
 'REFINERY JOB: '+(refinery?.active?.id||'IDLE'),
 'FABRICATION: '+(factory?.workshopInstalled?'INSTALLED':'NOT READY'),
 'FABRICATION JOB: '+(factory?.active?.id||'IDLE'),
 'SHIP LOTS: '+shipped.length,
 'SAVE / RELOAD: Verify that actual ore lot IDs and masses are unchanged.'
 ];
 return [
 'SOURCE: physically modeled planetary atmosphere',
 'LANDING: '+(g?.landed?'LANDED':'SHIP MUST LAND'),
 'OPERATOR: '+(g?.eva?'EVA':'EXIT SHIP'),
 'AIR SEPARATORS: '+(g?.plantIds?.length||0),
 'RATED N₂ VESSELS: '+(g?.vesselIds?.length||0),
 'VESSELS WITH LIVE GAS:',
 ...(vessels.length?vessels.slice(0,9).map(v=>
  '  '+v.id+' · '+v.materialId+' · '+fmt(v.gasKg,'kg')+' · '+(v.location?.kind||'unknown'))
   :['  NONE IN LOCAL GANTRY RANGE']),
 'ENERGY: 810 kJ per air batch; 90 kJ per sealed-vessel ship transfer',
 'PIPE: native T02 420 W pump, certified rated flanges, local power',
 'NO ATMOSPHERE / NO VESSEL = NO GAS COLLECTION',
 'SAVE / RELOAD: Compare real vessel ID and contained gas mass.'
 ];
}
function refresh(){if(!overlay.hidden)status.textContent=lines().join('\n');}
function navigate(step){
 hide();
 const route=step[1],target=step[2],api=step[3];
 root.StarfallUI21?.openRoute?.(route);
 try{if(typeof root[api]?.open==='function'){root[api].open();return;}}catch(_){}
 const el=$(target);
 if(!el){root.StarfallUI21?.openRoute?.('Engineer');return;}
 el.scrollIntoView({block:'nearest',behavior:'auto'});
 safe(()=>root[api]?.refresh?.());
}
function render(){
 subtitle.textContent=active==='mining'?'Survey → extract → refine → fabricate':'Manufacture → collect → store → transport';
 steps.replaceChildren();
 routes[active].forEach((step,i)=>{
  const button=document.createElement('button');button.type='button';
  const label=document.createElement('b');label.textContent=(i+1)+'. '+step[0];
  const desc=document.createElement('span');desc.textContent=step[4];
  button.append(label,desc);
  button.addEventListener('click',()=>navigate(step));steps.append(button);
 });
 for(const button of tabs.querySelectorAll('button')){
  const selected=button.dataset.chain===active;
  button.setAttribute('aria-selected',String(selected));
 }
 refresh();
}
for(const [key,label] of [['mining','Mining & manufacturing'],['gas','Gas collection & storage']]){
 const button=document.createElement('button');button.type='button';button.dataset.chain=key;
 button.setAttribute('role','tab');button.textContent=label;
 button.addEventListener('click',()=>{active=key;render();});tabs.append(button);
}
function show(chain){
 priorFocus=document.activeElement;if(chain)active=chain;
 overlay.hidden=false;open.setAttribute('aria-expanded','true');
 render();close.focus();
}
function hide(){overlay.hidden=true;open.setAttribute('aria-expanded','false');priorFocus?.focus?.();}
open.addEventListener('click',()=>show());
close.addEventListener('click',hide);
overlay.addEventListener('click',e=>{if(e.target===overlay)hide();});
document.addEventListener('keydown',e=>{
 if(overlay.hidden)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();hide();}
 if(e.key==='Tab'){
  const controls=[...card.querySelectorAll('button:not([disabled])')];
  const ix=controls.indexOf(document.activeElement);
  if(e.shiftKey&&ix===0){e.preventDefault();controls[controls.length-1]?.focus();}
  else if(!e.shiftKey&&ix===controls.length-1){e.preventDefault();controls[0]?.focus();}
 }
},true);
setInterval(()=>{if(!overlay.hidden)refresh();},1200);
root.StarfallResourceTestLab8H=Object.freeze({open:show,refresh});
})(globalThis);
