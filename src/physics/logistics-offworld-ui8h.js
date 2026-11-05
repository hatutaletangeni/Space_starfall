/* STARFALL 8H — original-ship offworld cargo controls, no teleport.
 * Displays only the real 8A ship hold, existing installed dry destinations
 * and saved physical-flight manifest milestones. No free stock or propulsion.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]')||
 document.querySelector('#ui21-pages .ui21-page[data-page="Operate"]');
if(!host)return;
const box=document.createElement('section');box.id='offworld-manifest8h-panel';
box.className='section';box.setAttribute('aria-label','8H original ship offworld cargo manifest');
const heading=document.createElement('div');heading.className='section-title';
heading.textContent='8H · PHYSICAL OFFWORLD SHIPMENTS';
const help=document.createElement('p');help.className='panel-note';
help.textContent='Load real dry material into the original ship hold using existing physical loading. Reserve only a certified depot already manufactured on another planet of the SAME star system. Manually launch, fly, land and EVA to deliver. No instant cargo, free warp or remote depot creation.';
const stock=document.createElement('select'),destination=document.createElement('select'),manifest=document.createElement('select');
stock.id='offworld8h-ship-lot';destination.id='offworld8h-destination';manifest.id='offworld8h-manifest';
for(const [el,label] of [[stock,'Actual dry material loaded in original ship'],[destination,'Existing installed offworld depot'],[manifest,'Saved original ship manifest']]){
 el.setAttribute('aria-label',label);
 el.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:7px;max-width:100%';
}
const reserve=button('RESERVE LOADED SHIP CARGO','offworld8h-register');
const depart=button('VERIFY REAL DEPARTURE','offworld8h-depart');
const arrive=button('VERIFY PHYSICAL LANDING','offworld8h-arrive');
const deliver=button('UNLOAD AT DOCK · 1.2 kJ','offworld8h-deliver');
const cancel=button('CANCEL BEFORE LAUNCH','offworld8h-cancel');
function button(label,id){
 const b=document.createElement('button');b.type='button';b.id=id;
 b.className='science-action';b.textContent=label;return b;
}
const tools=document.createElement('div');tools.className='obs-tools';
tools.append(stock,destination,reserve);
const phases=document.createElement('div');phases.className='obs-tools';
phases.append(manifest,depart,arrive,deliver,cancel);
const status=document.createElement('p');status.setAttribute('role','status');
status.className='panel-note';status.id='offworld8h-status';
const readout=document.createElement('pre');readout.id='offworld8h-readout';
readout.style.cssText='white-space:pre-wrap;overflow:auto;max-height:260px;background:#101b23;color:#c8d9d9;border:1px solid #53677566;padding:12px;font:11px/1.6 Consolas,monospace';
box.append(heading,help,tools,phases,status,readout);host.append(box);
function choices(el,rows,empty){
 const sig=JSON.stringify(rows);
 if(el.dataset.signature===sig)return;
 const prior=el.value;el.replaceChildren();
 if(!rows.length){let o=document.createElement('option');o.value='';o.textContent=empty;el.append(o);}
 for(const [id,label] of rows){let o=document.createElement('option');o.value=id;o.textContent=label;el.append(o);}
 if(rows.some(x=>x[0]===prior))el.value=prior;
 el.dataset.signature=sig;
}
let last='',pendingMessageUntil=0;
const report=msg=>{status.textContent=msg;pendingMessageUntil=performance.now()+7000;};
function refresh(){
 const runtime=root.StarfallRuntime,m=runtime?.logisticsOffworldContext8H?.();
 if(!m){status.textContent='Original flight/8A offworld manifest runtime not yet available';return;}
 const safeLots=m.shipHold.filter(l=>![
  'oxygen','nitrogen','hydrogen','helium','argon','carbon_dioxide',
  'carbon_monoxide','sulfur_dioxide','methane','ammonia'
 ].includes(l.materialId)&&l.massKg>0);
 const depots=m.depots.filter(d=>d.bodyId!==m.currentWorldId&&
   d.systemId===m.shipSystemId);
 choices(stock,safeLots.map(l=>[l.id,l.materialId+' · '+l.massKg.toFixed(2)+' kg (original ship)']),'No dry cargo in original ship');
 choices(destination,depots.map(d=>[d.id,d.worldName+' · '+d.id+
  ' (current stock '+d.storedKg.toFixed(2)+' kg)']),'No manufactured same-system offworld depot');
 choices(manifest,m.manifests.map(x=>[x.id,x.id+' · '+x.status+' → '+x.destinationWorldId]),
  'No saved ship manifest');
 const selected=m.manifests.find(x=>x.id===manifest.value);
 reserve.disabled=!m.onFoot||!m.nearShip||!safeLots.length||!depots.length;
 cancel.disabled=!selected||selected.status!=='RESERVED'||!m.onFoot||!m.nearShip||
   m.currentWorldId!==selected.sourceWorldId;
 depart.disabled=!selected||selected.status!=='RESERVED'||m.landed;
 arrive.disabled=!selected||selected.status!=='IN_TRANSIT'||!m.landed||
   m.currentWorldId!==selected.destinationWorldId;
 deliver.disabled=!selected||selected.status!=='ARRIVED'||!m.onFoot||!m.nearShip||
   m.currentWorldId!==selected.destinationWorldId;
 const lines=[
  'ORIGINAL SHIP HOLD     '+m.shipHold.reduce((n,l)=>n+l.massKg,0).toFixed(2)+' kg · '+m.shipHold.length+' source-owned lots',
  'LIVE SHIP             '+(m.landed?'LANDED':'IN FLIGHT')+
    ' · '+(m.currentWorldId||'no surface world'),
  'PHYSICAL EVA          '+(m.nearShip?'at ship':'not at original ship dock'),
  'EXISTING DEPOTS       '+depots.length+' same-system offworld destinations',
  'SAVED SHIP MANIFESTS  '+m.manifests.length,
  ...m.manifests.slice(-12).map(x=>x.id+' · '+x.status+' · '+x.massKg.toFixed(2)+
   ' kg '+x.materialId+' → '+x.destinationWorldId),
  'AUTHORITY             8A original ship lot + real flight clock + actual 1,200 J ship battery'
 ];
 const out=lines.join('\n');if(out!==last){last=out;readout.textContent=out;}
 if(performance.now()>=pendingMessageUntil)
  status.textContent='8H · Shipment milestones require real ship flight, physical landing, and EVA. Nothing is delivered by creating a reservation.';
}
function run(operation,fn){
 try{const result=fn();refresh();report('8H '+operation+' · '+result.id+' '+result.status+'; all owners saved.');}
 catch(e){report('8H '+operation+' rejected · '+String(e?.message||e));}
}
reserve.onclick=()=>run('reservation',()=>root.StarfallRuntime.logisticsOffworldRegister8H(stock.value,destination.value));
depart.onclick=()=>run('departure',()=>root.StarfallRuntime.logisticsOffworldDepart8H(manifest.value));
arrive.onclick=()=>run('landing',()=>root.StarfallRuntime.logisticsOffworldArrive8H(manifest.value));
deliver.onclick=()=>run('unloading',()=>root.StarfallRuntime.logisticsOffworldDeliver8H(manifest.value));
cancel.onclick=()=>run('cancel',()=>root.StarfallRuntime.logisticsOffworldCancel8H(manifest.value));
let lastTick=0;function tick(time){
 if(time-lastTick>750){lastTick=time;try{refresh();}catch(e){
   status.textContent='8H offworld inspector unavailable · '+String(e?.message||e);
 }}
 requestAnimationFrame(tick);
}requestAnimationFrame(tick);
root.StarfallOffworldManifestUI8H=Object.freeze({refresh,open:()=>{
 root.StarfallUI21?.openRoute?.('Engineer');box.scrollIntoView({block:'nearest'});refresh();
}});
})(globalThis);
