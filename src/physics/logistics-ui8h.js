/* STARFALL 8H — physical Engineer logistics orders and custody inspector.
 * No independent inventory, free material, phantom dock or movement controls.
 * All values come from the actual 8A physical/inventory owners and original
 * flight runtime. Active 8H orders are not invented on legacy saves.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]')||
 document.querySelector('#ui21-pages .ui21-page[data-page="Operate"]');
if(!host)return;
const panel=document.createElement('section');
panel.id='logistics8h-panel';panel.className='section';
panel.setAttribute('aria-label','8H physical logistics and route status');
const title=document.createElement('div');
title.className='section-title';title.textContent='8H · PHYSICAL LOGISTICS NETWORK';
const desc=document.createElement('p');desc.className='panel-note';
desc.textContent='Original 8D mined ore can be reserved for a physically installed 8F-manufactured dry depot. Drive the original truck to the dock and exit on foot to unload with 1.2 kJ of actual truck battery. No teleport, free cargo or pressure-gas loading.';
const status=document.createElement('p');status.id='logistics8h-status';
status.className='panel-note';status.setAttribute('role','status');
const readout=document.createElement('pre');readout.id='logistics8h-readout';
readout.setAttribute('aria-live','polite');
readout.style.cssText='white-space:pre-wrap;overflow:auto;max-height:320px;background:#101b23;color:#c8d9d9;border:1px solid #53677566;padding:12px;font:11px/1.6 Consolas,monospace';
const row=document.createElement('div');row.className='obs-tools';
const locate=document.createElement('button');locate.type='button';locate.className='science-action';
locate.textContent='PLOT ORIGINAL TRUCK ROUTE';
const mining=document.createElement('button');mining.type='button';mining.className='science-action';
mining.textContent='OPEN REAL MINING / LOADING';
row.append(locate,mining);
const shipments=document.createElement('div');
shipments.className='obs-tools';
const ore=document.createElement('select');ore.id='logistics8h-ore-lot';
ore.setAttribute('aria-label','Original mined ore lot in truck');
const depot=document.createElement('select');depot.id='logistics8h-depot';
depot.setAttribute('aria-label','Installed same-world dry cargo depot');
const dispatch=document.createElement('button');dispatch.type='button';dispatch.className='science-action';
dispatch.id='logistics8h-dispatch';dispatch.textContent='RESERVE MINED ORE FOR DEPOT';
const order=document.createElement('select');order.id='logistics8h-loaded-order';
order.setAttribute('aria-label','Loaded shipment to unload at dock');
const deliver=document.createElement('button');deliver.type='button';deliver.className='science-action';
deliver.id='logistics8h-deliver';deliver.textContent='UNLOAD AT DOCK · 1.2 kJ';
const cancel=document.createElement('button');cancel.type='button';cancel.className='science-action';
cancel.id='logistics8h-cancel';cancel.textContent='CANCEL RESERVED DELIVERY';
for(const select of [ore,depot,order]){
 select.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:7px;max-width:100%';
}
shipments.append(ore,depot,dispatch,order,deliver,cancel);
let last='',lastTick=0,lastStatusUntil=0;
const report=message=>{status.textContent=message;lastStatusUntil=performance.now()+4500;};
const choices=(select,items,empty)=>{
 const values=items.map(x=>[x.id,x.label]);
 const signature=JSON.stringify(values);
 if(select.dataset.signature===signature)return;
 const original=select.value;select.replaceChildren();
 if(!values.length){const e=document.createElement('option');e.textContent=empty;e.value='';select.append(e);}
 for(const [id,label] of values){const opt=document.createElement('option');opt.value=id;opt.textContent=label;select.append(opt);}
 if(values.some(([id])=>id===original))select.value=original;
 select.dataset.signature=signature;
};
const fmt=n=>Number.isFinite(n)?n.toFixed(2):'—';
function model(){
 const r=root.StarfallRuntime,physical=r?.physical8a,materials=r?.materials8a;
 if(!r||!physical||!materials)return null;
 const truck=physical.get('truck-expedition-001');
 const pose=r.engineeringAssetPoses?.().truckPose;
 const s=root.SF?.load?.()||{};
 const jobs=Array.isArray(s.logisticsOrders8h?.orders)?s.logisticsOrders8h.orders:[];
 const energyReceipts=Array.isArray(s.logisticsEnergyReceipts8h)?s.logisticsEnergyReceipts8h:[];
 const holders=materials.containers(),assets=physical.list();
 const eligible=assets.filter(a=>a.location?.kind==='surface'&&
  ['industrial_plant','industrial_vessel'].includes(a.type)&&a.condition>=.5&&
  a.state?.enabled!==false).map(a=>{
    const container=holders.find(c=>c.ownerId===a.id&&c.id===a.state?.containerId);
    const lots=container?materials.inventory(container.id):[];
    return {id:a.id,bodyId:a.location.bodyId,container,
      materialKg:lots.reduce((n,x)=>n+x.massKg,0),lotCount:lots.length,
      pressureRated:container?.kind?.includes('gas')||false};
  });
 const hopper=materials.used(root.StarfallMining8D?.TRUCK||'8d:truck-expedition-001:hopper'),
  ship=materials.used(root.StarfallMining8D?.SHIP||'8d:ship-main:materials');
 return {truck,pose,hopper,ship,eligible,jobs,energyReceipts,transport:r.logisticsContext8H?.()||null};
}
function refresh(){
 const m=model();if(!m){status.textContent='8H · Awaiting original flight and 8A material runtime.';return;}
 const t=m.truck,loc=t?.location;
 const physical=loc?.kind==='surface'?'SURFACE · '+loc.bodyId:
  loc?.kind==='ship'?'SECURED IN SHIP':'NOT FOUND';
 const location=loc?.kind==='surface'&&m.pose?.bodyId===loc.bodyId?
  'LIVE ON SAME WORLD':'AWAY / SAVED CUSTODY ONLY';
 const jobs=m.jobs.slice(-8).map(o=>o.id+' · '+o.status+' · '+fmt(o.massKg)+' kg · '+o.carrierId);
 const docks=m.eligible.slice(0,10).map(d=>
  d.id+' @ '+d.bodyId+' · '+(d.container?'OWNED '+d.container.id:'NO STOCK CONTAINER')+
  ' · '+fmt(d.materialKg)+' kg'+(d.pressureRated?' · PRESSURIZED GAS: NO OPEN HOPPER TRANSFER':''));
 const lines=[
  'ORIGINAL TRUCK     '+physical+' | '+location,
  'BATTERY            '+(m.pose?fmt(m.pose.batteryJ/1e6)+' MJ':'NOT LIVE ON THIS WORLD'),
  'REAL ORE HOPPER    '+fmt(m.hopper.massKg)+' kg / '+fmt(m.hopper.volumeM3)+' m³',
  'SHIP RAW HOLD      '+fmt(m.ship.massKg)+' kg / '+fmt(m.ship.volumeM3)+' m³',
  'INSTALLED INDUSTRY '+m.eligible.length+' qualifying assets',
  ...(docks.length?docks:['NO ACTIVE INSTALLED CARGO DOCKS']),
  '8H ORDERS          '+m.jobs.length+' saved orders',
  ...(jobs.length?jobs:['NO 8H ORDERS YET — NO INVENTORY GENERATED']),
  'PAID RECEIPTS      '+m.energyReceipts.length+' (persistent receipts)',
  'SAFETY             No instant planetary shipments; no unsecured gas in hopper.'
 ];
 const output=lines.join('\n');
 if(output!==last){last=output;readout.textContent=output;}
 locate.disabled=!t||loc?.kind!=='surface';
 mining.disabled=!root.StarfallMiningUI8D;
 const tctx=m.transport;
 const lots=tctx?.lots||[],depots=tctx?.depots||[],
  active=(tctx?.orders||[]).filter(x=>x.status==='LOADED');
 choices(ore,lots.map(l=>({id:l.id,label:l.materialId+' · '+fmt(l.massKg)+' kg · '+l.provenance})),
   'No verified 8D ore in truck');
 choices(depot,depots.map(d=>({id:d.id,label:d.id+' · '+fmt(d.stock?.massKg||0)+' kg stored'})),
   'No manufactured dry depot on this world');
 choices(order,active.map(o=>({id:o.id,label:o.id+' · '+fmt(o.massKg)+' kg → '+o.destinationId})),
   'No loaded shipment');
 dispatch.disabled=!tctx?.operatorNear||!lots.length||!depots.length;
 deliver.disabled=!tctx?.operatorNear||!active.length;
 cancel.disabled=!tctx?.operatorNear||!active.length;
 if(performance.now()>=lastStatusUntil)
  status.textContent='8H · Reserve real mined stock, drive to the actual depot, park and EVA to unload. All 8A lots and battery Joules stay source-owned.';
}
locate.addEventListener('click',()=>{try{
 const r=root.StarfallRuntime;if(!r?.plotTruckDestination8B)throw Error('Actual truck locator unavailable');
 const result=r.plotTruckDestination8B();
 status.textContent='8H route · '+(result?.message||result?.status||'Plotted actual vehicle destination');
 }catch(e){status.textContent='8H route · '+String(e?.message||e);}});
mining.addEventListener('click',()=>{try{
 if(!root.StarfallMiningUI8D?.open)throw Error('Real 8D loading console unavailable');
 root.StarfallMiningUI8D.open();
 }catch(e){status.textContent='8H · '+String(e?.message||e);}});
dispatch.addEventListener('click',()=>{try{
 const rt=root.StarfallRuntime;
 if(!rt?.logisticsReserve8H)throw Error('8H runtime delivery unavailable');
 const q=rt.logisticsReserve8H(ore.value,depot.value);
 refresh();report('8H · Reserved '+fmt(q.massKg)+' kg · '+q.id+'. Physically drive the original truck to '+q.destinationId+'.');
 }catch(e){report('8H reservation rejected · '+String(e?.message||e));}});
deliver.addEventListener('click',()=>{try{
 const rt=root.StarfallRuntime;
 if(!rt?.logisticsDeliver8H)throw Error('8H source-owned power delivery unavailable');
 const receipt=rt.logisticsDeliver8H(order.value);
 refresh();report('8H · Delivered '+fmt(receipt.massKg)+' kg. Physical ore moved and truck battery debited exactly once.');
 }catch(e){report('8H unloading rejected · '+String(e?.message||e));}});
cancel.addEventListener('click',()=>{try{
 const rt=root.StarfallRuntime;
 if(!rt?.logisticsCancel8H)throw Error('8H live cancellation unavailable');
 const receipt=rt.logisticsCancel8H(order.value);
 refresh();report('8H · Released original '+fmt(receipt.massKg)+' kg ore reservation with NO stock or energy debit.');
 }catch(e){report('8H cancellation rejected · '+String(e?.message||e));}});
panel.append(title,desc,status,row,shipments,readout);host.append(panel);
function tick(time){
 if(time-lastTick>=650){lastTick=time;try{refresh();}catch(e){
  status.textContent='8H monitor unavailable · '+String(e?.message||e);
 }}
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
root.StarfallLogisticsUI8H=Object.freeze({refresh,model,open:()=>{
 root.StarfallUI21?.openRoute?.('Engineer');panel.scrollIntoView({block:'nearest'});refresh();
}});
})(globalThis);
