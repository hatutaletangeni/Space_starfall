/* STARFALL 8H — real Engineer panel for source-owned powered dry conveyor.
 * The original ship / truck / EVA controls are untouched. Starting a packet
 * reserves existing dry 8A stock; ONLY future real native T02 paid grid ticks
 * may transfer one physically travelled hop at a time into existing hardware.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host)return;
const panel=document.createElement('section');panel.className='section';
panel.id='conveyor8h-live-panel';panel.setAttribute('aria-label','8H physical conveyor controls');
const heading=document.createElement('div');heading.className='section-title';
heading.textContent='8H · LIVE POWERED CONVEYOR ROUTE';
const intro=document.createElement('p');intro.className='panel-note';
intro.textContent='Existing manufactured dry depot → real 180 kg conveyor drive with one owned 40 kg tray → separate manufactured dry depot. Physically install and wire its 250 W T02 motor. Start a genuine dry lot on EVA; one original T02 grid step pays power before each timed material hop. An unplug or blackout pauses actual stock in place.';
const source=document.createElement('select');source.id='conveyor8h-source';
const target=document.createElement('select');target.id='conveyor8h-target';
const drive=document.createElement('select');drive.id='conveyor8h-drive';
const lot=document.createElement('select');lot.id='conveyor8h-source-lot';
const kg=document.createElement('input');kg.type='number';kg.id='conveyor8h-kg';
kg.value='12';kg.min='.01';kg.max='40';kg.step='.01';
for(const [s,title] of [[source,'Existing dry source depot'],[target,'Existing dry destination depot'],[drive,'Installed 180kg T02-wired conveyor drive'],[lot,'Real original 8A source material lot']]){
 s.setAttribute('aria-label',title);
 s.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:7px;max-width:100%';
}
kg.setAttribute('aria-label','Packet mass in kilograms, maximum 40');
kg.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:7px;width:100px';
const start=document.createElement('button');start.id='conveyor8h-start';
start.type='button';start.className='science-action';
start.textContent='START PHYSICAL POWER-PAID PACKET';
const fields=document.createElement('div');fields.className='obs-tools';
fields.append(source,lot,drive,target,kg,start);
const status=document.createElement('p');status.className='panel-note';
status.id='conveyor8h-status';status.setAttribute('role','status');
const readout=document.createElement('pre');readout.id='conveyor8h-readout';
readout.style.cssText='white-space:pre-wrap;overflow:auto;max-height:310px;background:#101b23;color:#c8d9d9;border:1px solid #53677566;padding:12px;font:11px/1.6 Consolas,monospace';
panel.append(heading,intro,fields,status,readout);host.append(panel);
function choices(el,rows,empty){
 const signature=JSON.stringify(rows);if(el.dataset.signature===signature)return;
 const selected=el.value;el.replaceChildren();
 if(!rows.length){const opt=document.createElement('option');opt.value='';
  opt.textContent=empty;el.append(opt);}
 for(const [id,name] of rows){const opt=document.createElement('option');
  opt.value=id;opt.textContent=name;el.append(opt);}
 if(rows.some(x=>x[0]===selected))el.value=selected;
 el.dataset.signature=signature;
}
let last='',lastTick=0,reportUntil=0;
function report(message){status.textContent=message;reportUntil=performance.now()+7000;}
function refresh(){
 const rt=root.StarfallRuntime,ctx=rt?.logisticsConveyorContext8H?.();
 if(!ctx){status.textContent='Original T02/8A conveyor runtime unavailable';return;}
 const depots=ctx.depots,drives=ctx.drives;
 choices(source,depots.map(x=>[x.id,x.id+' · '+x.lots.reduce((s,l)=>s+l.massKg,0).toFixed(2)+' kg dry']), 'No certified source dry depot');
 const current=depots.find(x=>x.id===source.value),materialLots=current?.lots||[];
 choices(lot,materialLots.map(l=>[l.id,l.materialId+' · '+l.massKg.toFixed(2)+' kg · '+l.provenance]),'No real dry stock in source');
 choices(drive,drives.map(x=>[x.id,x.id+' · native T02 motor '+x.portId]),'No installed 250W drive');
 choices(target,depots.filter(x=>x.id!==source.value).map(x=>[x.id,x.id+' · '+x.lots.reduce((s,l)=>s+l.massKg,0).toFixed(2)+' kg stored']), 'No second manufactured dry depot');
 const active=ctx.packets.some(p=>p.status==='ACTIVE');
 const selectedLot=materialLots.find(x=>x.id===lot.value);
 start.disabled=!ctx.onFoot||!selectedLot||depots.length<2||!drive.value||
  !target.value||active||!ctx.gridReport||Number(kg.value)>selectedLot.massKg||
  !(Number(kg.value)>0&&Number(kg.value)<=40);
 const lines=[
  'REAL BODY            '+(ctx.bodyId||'NO LANDABLE WORLD'),
  'EVA AT SOURCE        '+(ctx.onFoot?'ON FOOT; APPROACH ORIGINAL DOCK':'REQUIRES REAL EVA'),
  'CERTIFIED DRY DEPOTS '+depots.length+' · CERTIFIED T02 DRIVES '+drives.length,
  'LIVE GRID            '+(ctx.gridReport?.servedW??0).toFixed(1)+' W actual served; '+(ctx.gridReport?.shed?.length||0)+' shed',
  'SAVED 8H PACKETS     '+ctx.packets.length,
  ...ctx.packets.slice(-10).map(p=>p.id+' · '+p.status+' · stage '+p.cursor+
   '/'+(p.driveIds.length+1)+' · '+p.massKg.toFixed(2)+' kg · remaining '+
   p.remainingS.toFixed(2)+' s · original lot '+p.currentLotId),
  'SAFETY               No automatic stock creation / no remote transfer / no second battery debit',
  'CONTROLS             Use native time scale 1×/10×/100×; unplugged T02 power pauses physical stock'
 ];
 const output=lines.join('\n');if(output!==last){last=output;readout.textContent=output;}
 if(performance.now()>=reportUntil)
  status.textContent='Choose actual dry stock in a manufactured depot, a physically adjacent installed drive and separate depot. EVA near source to reserve; future native powered ticks move ore.';
}
source.addEventListener('change',()=>{lot.dataset.signature='';target.dataset.signature='';refresh();});
start.addEventListener('click',()=>{try{
 const rt=root.StarfallRuntime;if(!rt?.logisticsConveyorStart8H)
  throw Error('8H native T02-powered runtime unavailable');
 const q=rt.logisticsConveyorStart8H(lot.value,source.value,drive.value,
  target.value,Number(kg.value));
 refresh();report('8H original dry cargo '+q.massKg+' kg RESERVED; drive power will advance actual physical tray on native T02 time.');
 }catch(error){report('8H conveyor start rejected · '+String(error.message||error));}});
function tick(now){
 if(now-lastTick>750){lastTick=now;try{refresh();}catch(error){
  status.textContent='8H genuine conveyor inspector unavailable · '+String(error.message||error);
 }}
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
root.StarfallConveyorLiveUI8H=Object.freeze({refresh,open:()=>{
 root.StarfallUI21?.openRoute?.('Engineer');panel.scrollIntoView({block:'nearest'});refresh();
}});
})(globalThis);
