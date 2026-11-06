/* STARFALL 8H — actual original 8A paid dry receiving dock to
 * installed 8E chemical station bounded dry-feed hopper. Not a second
 * inventory, not an invisible automatic conveyor delivery.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallRuntime?.industrialDryFeedContext8H)return;
const section=document.createElement('section');
section.className='section';section.id='industrial8h-surface-feed';
const heading=document.createElement('div');heading.className='section-title';
heading.textContent='8H · REAL SURFACE CHEMICAL DRY FEED';
section.appendChild(heading);
const note=document.createElement('p');
note.className='panel-note';
note.textContent='Use a genuine 250 W T02 powered belt to deliver dry solids into a separately paid receiving cargo depot first. Next, physically walk on EVA close to BOTH that depot and the already manufactured 8E chemical station, then manually carry up to 20 kg into its EMPTY 120 kg / 0.20 m³ original 8A built-in feed hopper. This last-metre step is MANUAL, not an automatic conveyor-to-machine port. Select SURFACE HOPPER in the 8E chemical recipe above to use it, without silently taking materials from the ship.';
section.appendChild(note);
const select=()=>{const x=document.createElement('select');x.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';return x;};
const source=select(),station=select(),lot=select();
const mass=document.createElement('input');
mass.type='number';mass.min='0.01';mass.max='20';mass.step='0.01';
mass.value='1';mass.style.cssText='width:80px;background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px';
const button=document.createElement('button');
button.className='science-action';button.textContent='EVA CARRY REAL 8A DRY LOT INTO PLANT';
const readout=document.createElement('pre');
readout.style.cssText='white-space:pre-wrap;color:#d4dfe1;font:11px/1.5 Consolas,monospace';
readout.id='industrial8h-dry-feed-readout';
const line=document.createElement('div');line.style.cssText='display:flex;flex-wrap:wrap;gap:7px;align-items:center';
line.append(source,station,lot,mass,button);section.append(line,readout);host.appendChild(section);
function choose(el,rows,choice,label){
 const old=el.value;
 const signature=rows.map(x=>x.id).join('|');
 if(el.dataset.sig===signature)return;
 el.replaceChildren();
 for(const x of rows){const o=document.createElement('option');o.value=x.id;o.textContent=label(x);el.append(o);}
 el.dataset.sig=signature;
 if(rows.some(x=>x.id===old))el.value=old;
}
function refresh(){
 const r=root.StarfallRuntime,c=r.industrialDryFeedContext8H();
 choose(source,c.depots,null,x=>'RECEIVED DEPOT · '+x.id);
 choose(station,c.stations,null,x=>x.station+' · '+x.id);
 const depot=c.depots.find(x=>x.id===source.value);
 choose(lot,depot?.lots||[],null,x=>x.materialId+' · '+x.massKg.toFixed(2)+'kg · '+x.id);
 const chosenLot=depot?.lots?.find(x=>x.id===lot.value);
 button.disabled=!c.onFoot||!depot||!station.value||!chosenLot||
  !(Number(mass.value)>0&&Number(mass.value)<=20)||
  Number(mass.value)>chosenLot.massKg;
 readout.textContent='BODY: '+(c.bodyId||'LAND SHIP')+
 '\nOPERATOR: '+(c.onFoot?'ON FOOT, ORIGINAL EVA':'LAND AND EXIT SHIP')+
 '\nRECEIVED 8A DEPOTS: '+c.depots.length+
 '\nPAID ORIGINAL PLANT FEED HOPPERS: '+c.stations.length+
 '\nSTATION SOURCE LOTS: '+(c.stations.find(x=>x.id===station.value)?.lots||[])
  .map(x=>x.materialId+' '+x.massKg.toFixed(2)+'kg').join(', ')+
 '\nREAL HANDOFF RECEIPTS: '+c.receipts.length+
 '\nUPSTREAM: must actually deliver from another depot via native 250 W T02 before carrying. The current transfer makes NO claim of motorized final connection.';
}
button.addEventListener('click',()=>{
 try{
  const q=root.StarfallRuntime.industrialDryFeedTransfer8H(source.value,station.value,lot.value,Number(mass.value));
  readout.textContent='COMMITTED ORIGINAL 8A: '+q.id+' · '+q.massKg+' kg into genuine installed plant bin · NO invented mass or Joules';
 }catch(e){readout.textContent='HELD: '+String(e.message||e);}
 refresh();
});
for(const e of [source,station,lot,mass])e.addEventListener('change',refresh);
let last=0;function frame(t){if(t-last>1200){last=t;refresh();}requestAnimationFrame(frame);}frame(0);
})(globalThis);
