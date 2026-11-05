/* STARFALL 8H — read-only Engineer logistics operations inspector.
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
desc.textContent='Actual carrier custody, installed dock inventory and paid operation receipts. No automatic shipment or free depots. Use 8D drilling and physical loading to move existing ore.';
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
let last='',lastTick=0;
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
 return {truck,pose,hopper,ship,eligible,jobs,energyReceipts};
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
 status.textContent='8H · READ-ONLY LIVE CUSTODY. Physical loading and fuel/power are controlled by original systems.';
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
panel.append(title,desc,status,row,readout);host.append(panel);
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
