/* STARFALL 8D: integrated mining / hauling console on UI21 Operate.
 * Uses only live physics-owned truck, geology, energy and physical inventories.
 * No free lot creation, remote hauling, or fictitious extraction button.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Operate"]')
 ||document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host)return;
const rt=()=>root.StarfallRuntime;
const panel=document.createElement('section');panel.className='section';panel.id='mining8d-panel';
const title=document.createElement('div');title.className='section-title';title.textContent='8D · DRILLING & PHYSICAL HAULAGE';
const readout=document.createElement('pre');readout.style.cssText='white-space:pre-wrap;font:11px/1.6 Consolas,monospace;max-height:290px;overflow:auto;color:#c8d9d9;background:#101b23;border:1px solid #53677566;padding:12px';
readout.setAttribute('aria-live','polite');
const status=document.createElement('p');status.id='mining8d-status';status.setAttribute('role','status');status.className='panel-note';
status.textContent='Park the expedition truck at a surveyed deposit. A physical drill cycle uses 57.6 kJ and 24 seconds for 20 kg of crude feedstock.';
const controls=document.createElement('div');controls.className='obs-tools';
const drill=document.createElement('button');drill.type='button';drill.className='science-action';drill.textContent='START 20 KG BORE / 24 S';
const load=document.createElement('button');load.type='button';load.className='science-action';load.textContent='LOAD 50 KG INTO SHIP / 16 S';
const cancel=document.createElement('button');cancel.type='button';cancel.className='science-action';cancel.textContent='CANCEL MACHINE CYCLE';
const service=document.createElement('button');service.type='button';service.className='science-action';
service.textContent='REPLACE DRILL HEAD / 60 S';
service.title='Uses one certified 2 kg ship-held head and 120 kJ truck battery; returns the worn head as scrap. Fabricate replacements with the CNC.';
const lotPicker=document.createElement('select');lotPicker.setAttribute('aria-label','Truck cargo lot for physical loader');
lotPicker.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:7px;max-width:100%';
controls.append(drill,lotPicker,load,service,cancel);
let lastLots='';
function refresh(){
 const r=rt();if(!r?.mining8d||!r.materials8a){readout.textContent='Waiting for authoritative 8D runtime';return;}
 const ctx=r.miningContext8D(),site=r.miningDeposit8D(),op=r.mining8d.active,
  lots=r.materials8a.inventory(StarfallMining8D.TRUCK),
  shipped=r.materials8a.inventory(StarfallMining8D.SHIP),survey=site&&r.resources8c.observations().some(x=>x.siteId===site.id);
 const newLots=JSON.stringify(lots.map(x=>[x.id,x.massKg]));
 if(newLots!==lastLots){const prior=lotPicker.value;lotPicker.replaceChildren();
  for(const l of lots){const option=document.createElement('option');option.value=l.id;
   option.textContent=l.materialId.replace(/_/g,' ')+' · '+l.massKg.toFixed(1)+' kg · '+l.provenance;
   lotPicker.append(option);}
  if(lots.some(l=>l.id===prior))lotPicker.value=prior;lastLots=newLots;
 }
 const remaining=site?r.resources8c.remaining(site):0;
 readout.textContent=
 'DRILL KIT   '+StarfallMining8D.DRILL.kitId+'   |   CONDITION '+(r.mining8d.toolCondition*100).toFixed(1)+'%\n'+
 'TRUCK       '+(ctx.truckPresent?'ON THIS WORLD':'NOT AVAILABLE')+'  |  '+(ctx.truckIdle?'PARKED':'MOVING')+'  |  ENERGY '+(ctx.energyJ/1e6).toFixed(3)+' MJ\n'+
 'HOPPER      '+ctx.truckHopper.massKg.toFixed(1)+' / '+StarfallMining8D.LIMITS.truckMassKg+' kg'+
 '  |  '+ctx.truckHopper.volumeM3.toFixed(3)+' / '+StarfallMining8D.LIMITS.truckVolumeM3+' m³\n'+
 'SHIP HOLD   '+ctx.shipWarehouse.massKg.toFixed(1)+' / '+StarfallMining8D.LIMITS.shipMassKg+' kg'+
 '  |  '+ctx.shipWarehouse.volumeM3.toFixed(3)+' / '+StarfallMining8D.LIMITS.shipVolumeM3+' m³\n'+
 'TARGET      '+(site?site.label.toUpperCase()+' · '+site.hostRock+' · '+(survey?'SURVEY EVIDENCE PRESENT':'UNSURVEYED'):'NO MINERAL OCCURRENCE')+'\n'+
 'ORE LEFT    '+(site?remaining.toFixed(0)+' kg modeled accessible excavation':'—')+'\n'+
 'OPERATOR    '+(ctx.operatorNear?'NEAR TRUCK':'TOO FAR / NOT ON FOOT OR IN CAB')+
 '  |  SHIP LOADER '+(ctx.truckNearShip?'IN RANGE':'OUT OF RANGE')+'\n'+
 'CYCLE       '+(op?op.type+' · '+(100*op.elapsedS/op.durationS).toFixed(1)+'% · '+op.energyJ.toFixed(0)+' J consumed':'IDLE')+'\n'+
 'TRUCK LOTS  '+lots.length+'  |  SHIP LOTS '+shipped.length+'\n'+
 'SPARE HEADS '+Math.floor(shipped.filter(l=>l.materialId==='drill_head'&&l.grade>=.98)
  .reduce((n,l)=>n+l.massKg,0)/StarfallMining8D.SERVICE.headMassKg)+' · manufacture DRILL HEAD at installed CNC';
 drill.disabled=!!op||!ctx.truckPresent||!ctx.operatorNear||!ctx.truckIdle||!survey||remaining<StarfallMining8D.DRILL.kgPerBatch||r.mining8d.toolCondition<.1||ctx.energyJ<StarfallMining8D.DRILL.minimumEnergyJ;
 load.disabled=!!op||!ctx.truckPresent||!ctx.operatorNear||!ctx.truckIdle||!ctx.truckNearShip||!lots.length;
 cancel.disabled=!op;
 const head=shipped.find(l=>l.materialId==='drill_head'&&l.grade>=.98&&
  l.massKg-r.materials8a.operations().filter(o=>o.status==='RESERVED'&&o.lotId===l.id)
   .reduce((n,o)=>n+o.massKg,0)>=StarfallMining8D.SERVICE.headMassKg);
 service.dataset.lotId=head?.id||'';
 service.disabled=!!op||!head||!ctx.truckPresent||!ctx.operatorNear||!ctx.truckIdle||
  !ctx.truckNearShip||ctx.shipBodyId!==ctx.bodyId||r.mining8d.toolCondition>=1-1e-8||
  ctx.energyJ<StarfallMining8D.SERVICE.minimumEnergyJ;
}
function action(fn){try{const result=fn();status.textContent='8D · '+(result?.type||'Operation')+' accepted. Progress only advances while you remain physically at the truck with electrical power.';}catch(e){status.textContent='8D · '+String(e?.message||e);}refresh();}
drill.addEventListener('click',()=>action(()=>rt().miningStart8D()));
load.addEventListener('click',()=>action(()=>{
 const lot=rt()?.materials8a.inventory(StarfallMining8D.TRUCK).find(x=>x.id===lotPicker.value);
 if(!lot)throw Error('Select an existing truck lot');
 return rt().miningLoad8D(lot.id,Math.min(50,lot.massKg));
}));
cancel.addEventListener('click',()=>action(()=>rt().miningCancel8D()));
service.addEventListener('click',()=>action(()=>rt().miningService8D(service.dataset.lotId)));
panel.append(title,status,controls,readout);host.append(panel);
let last=0;const check=()=>{const t=performance.now();if(t-last>500){last=t;refresh();}requestAnimationFrame(check);};check();
root.StarfallMiningUI8D={refresh,open:()=>{root.StarfallUI21?.openRoute?.('Operate');panel.scrollIntoView({block:'nearest'});refresh();}};
})(globalThis);
