/* STARFALL 8H — actual original Engineer panel for finite rated 8MPa
 * source vessel→fabricated 80L pipe→other physical rated vessel. Existing
 * outpost wiring supplies ORIGINAL 420W T02 power. UI cannot grant gas.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host)return;
const panel=document.createElement('section');
panel.className='section';panel.id='pressure8h-live-panel';
panel.setAttribute('aria-label','8H physical rated gas pipeline controls');
const title=document.createElement('div');title.className='section-title';
title.textContent='8H · PHYSICAL RATED PRESSURE PIPE';
const description=document.createElement('p');description.className='panel-note';
description.textContent='Actual certified gas vessel → manufactured 320 kg 8 MPa pressure pipe with EMPTY 80 L/25 kg hold-up → separate certified gas vessel. A real 420 W T02 pump must be installed, connected to an original battery/solar source, and served on every timed hop. No free gas, Joules, tank, pipe or remote transfer.';
const helper=document.createElement('p');helper.className='panel-note';
helper.textContent='EVA STEP 1: Manufacture and physically install certified 320 kg pipe (8F → 8E), place matching real rated gas vessels 9.5–12 scene units from each flange. STEP 2: Walk within 15 units of pipe; install its 420 W electrical port. STEP 3: Use NATIVE OUTPOST / ENGINEERING to wire the new 8h-pipe-port module to a previously built original T02 battery/solar source. STEP 4: Select real certified gas source stock and destination vessel; initiate a ≤5 kg packet. Loss of power/damage pauses gas physically inside its original container. This ideal-gas teaching model is not a real pressure-system design certification.';
const select=(id,label)=>{
 const s=document.createElement('select');s.id=id;s.setAttribute('aria-label',label);
 s.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';
 return s;};
const pipe=select('pressure8h-pipe','Original installed 320kg rated pump pipe');
const src=select('pressure8h-source','Source rated gas vessel');
const dst=select('pressure8h-dest','Separate destination rated gas vessel');
const lot=select('pressure8h-lot','Actual source gas lot');
const mass=document.createElement('input');mass.id='pressure8h-mass';mass.type='number';
mass.min='.001';mass.max='5';mass.step='.01';mass.value='3';
mass.setAttribute('aria-label','Finite gas packet mass kilograms, up to 5 kg');
mass.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;width:95px';
const button=t=>{const el=document.createElement('button');
 el.type='button';el.className='science-action';el.textContent=t;return el;};
const install=button('INSTALL ORIGINAL 420 W PUMP PORT');install.id='pressure8h-install-port';
const open=button('OPEN NATIVE T02 WIRING');open.id='pressure8h-open-wiring';
const start=button('START REAL PAID GAS PIPE PACKET');start.id='pressure8h-start';
const place=document.createElement('div');place.className='obs-tools';
place.append(pipe,install,open);
const controls=document.createElement('div');controls.className='obs-tools';
controls.append(src,lot,dst,mass,start);
const status=document.createElement('p');status.className='panel-note';
status.id='pressure8h-status';status.setAttribute('role','status');
const readout=document.createElement('pre');readout.id='pressure8h-readout';
readout.style.cssText='white-space:pre-wrap;overflow:auto;max-height:320px;background:#101b23;color:#c8d9d9;border:1px solid #53677566;padding:12px;font:11px/1.6 Consolas,monospace';
panel.append(title,description,helper,place,controls,status,readout);host.append(panel);
let last='',lastTick=0,statusUntil=0;
function report(message){status.textContent=message;statusUntil=performance.now()+9000;}
function options(el,rows,empty){
 const sig=JSON.stringify(rows);
 if(sig===el.dataset.sig)return;
 const value=el.value;el.replaceChildren();
 if(rows.length===0){let o=document.createElement('option');o.value='';
  o.textContent=empty;el.appendChild(o);}
 for(const [id,label] of rows){const o=document.createElement('option');
  o.value=id;o.textContent=label;el.appendChild(o);}
 if(rows.some(row=>row[0]===value))el.value=value;
 el.dataset.sig=sig;
}
function refresh(){
 const ctx=root.StarfallRuntime?.logisticsPressureContext8H?.();
 if(!ctx){status.textContent='Real pressure pipeline runtime not yet available';return;}
 const pipes=ctx.pipes||[],vessels=ctx.vessels||[];
 options(pipe,pipes.map(x=>[x.id,x.id+' · '+(x.portId?'420W PORT INSTALLED':'ELECTRICAL PORT NOT INSTALLED')]),
  'No manufactured 8MPa pressure pipeline');
 const current=pipes.find(x=>x.id===pipe.value);
 options(src,vessels.filter(x=>x.contents.length).map(x=>[x.id,
  x.id+' · '+x.materialId+' · '+x.contents.reduce((s,a)=>s+a.massKg,0).toFixed(2)+' kg']),
  'No certified original gas stock in a rated vessel');
 const s=vessels.find(x=>x.id===src.value),
  stock=s?.contents.filter(x=>x.materialId===s.materialId)||[];
 options(lot,stock.map(x=>[x.id,x.materialId+' · '+x.massKg.toFixed(3)+' kg · '+x.provenance]),
  'No physically produced source gas');
 options(dst,vessels.filter(x=>x.id!==src.value&&x.materialId===s?.materialId)
   .map(x=>[x.id,x.id+' · matched certified '+x.materialId+' gas storage']),
  'No different same-gas rated destination');
 const active=ctx.packets.some(j=>j.status==='ACTIVE');
 const picked=stock.find(x=>x.id===lot.value),n=Number(mass.value);
 install.disabled=!ctx.onFoot||!current||!!current.portId;
 open.disabled=!document.querySelector('#outpost-open');
 start.disabled=!ctx.onFoot||!current?.portId||!s||!dst.value||
  !picked||!(n>0&&n<=5&&n<=picked.massKg)||active||!ctx.gridReport;
 const pressure=x=>{try{return root.StarfallPressureGasPackets8H
  .pressure(x.contents,.08)/1e6;}catch(_){return NaN;}};
 const lines=[
  'REAL WORLD         '+(ctx.bodyId||'NONE · LAND ORIGINAL SHIP'),
  'OPERATOR           '+(ctx.onFoot?'REAL EVA ACTIVE · APPROACH PIPE':'REQUIRES REAL EVA'),
  'CERTIFIED VESSELS  '+vessels.length+' · PHYSICAL 8MPa PIPES '+pipes.length,
  'INSTALLED PUMP     '+(current?.portId||'NONE · NO ELECTRICAL LOAD'),
  'PIPE CHARGE        '+(current?current.contents.reduce((sum,x)=>sum+x.massKg,0).toFixed(3):'0')+' kg / maximum 25 kg',
  'PIPE PRESSURE      '+(current?pressure(current).toFixed(3):'0')+' MPa / certified 8 MPa',
  'POWER              '+(ctx.gridReport?'ORIGINAL NATIVE T02 OBSERVED':'NO PAID ORIGINAL GRID REPORT'),
  'RESERVED PACKETS   '+ctx.packets.length,
  ...ctx.packets.slice(-9).map(j=>j.id+' '+j.status+' '+j.massKg.toFixed(3)+' kg '+j.materialId+
    ' · stage '+j.stage+'/2 · '+j.remainingS.toFixed(2)+' seconds left · 8A LOT '+j.currentLotId),
  'PHYSICS            293.15 K ideal gas law and 8MPa vessel check, not production pressure certification',
  'ACCOUNTING         Native source pays 420W once, no free gas/wiring/energy, no background travel'
 ];
 const printed=lines.join('\n');if(printed!==last){readout.textContent=printed;last=printed;}
 if(performance.now()>statusUntil)
  status.textContent='Service the ACTUAL powered pipe on EVA; each real gas lot moves only after a paid native grid interval.';
}
src.addEventListener('change',()=>{lot.dataset.sig='';dst.dataset.sig='';refresh();});
install.addEventListener('click',()=>{try{
 const rt=root.StarfallRuntime;
 if(!rt?.logisticsPressureInstallPort8H)throw Error('Original real pipe servicing unavailable');
 const q=rt.logisticsPressureInstallPort8H(pipe.value);
 refresh();report('Genuine 420W T02 pump port '+q.portId+' installed with ZERO FREE ENERGY. Now use original Outposts/Engineering to physically wire it before moving gas.');
 }catch(e){report('PRESSURE INSTALL BLOCKED: '+String(e.message||e));}});
open.addEventListener('click',()=>{
 const original=document.querySelector('#outpost-open');
 if(original){original.click();report('Connect new 8h-pipe-port:<manufactured pipe asset ID> to an ORIGINAL solar/battery source in native T02 wiring, no free source can be made.');}
 else report('Original Outposts/Engineering electrical UI not available');});
start.addEventListener('click',()=>{try{
 const rt=root.StarfallRuntime;
 if(!rt?.logisticsPressureStart8H)throw Error('Real source-owned paid pressure gas flow unavailable');
 const q=rt.logisticsPressureStart8H(lot.value,src.value,pipe.value,dst.value,Number(mass.value));
 refresh();report(q.massKg.toFixed(3)+' kg '+q.materialId+
  ' ORIGINAL SOURCE GAS RESERVED; wait for actual paid T02 pump time and both physical hops.');
 }catch(e){report('RATED GAS FLOW BLOCKED: '+String(e.message||e));}});
function tick(now){
 if(now-lastTick>850){lastTick=now;try{refresh();}catch(e){
  status.textContent='8H source-owned pressure inspector paused: '+String(e.message||e);
 }}
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
root.StarfallPressurePipeLiveUI8H=Object.freeze({refresh,open:()=>{
 root.StarfallUI21?.openRoute?.('Engineer');panel.scrollIntoView({block:'nearest'});refresh();
}});
})(globalThis);
