/* T19A optional original Outpost RADIO tab diagnostics.
 * Reads T03.routeFor/T04.station/T02 grid; records ONLY source-owned trace.
 * Does not transmit a ping, deduct arbitrary Joules or forge radio ACK.
 */
(function(root){'use strict';
const $=id=>document.getElementById(id),A=root.StarfallRFAnalyzerT19,T=root.StarfallAntennaT04,
 UI=root.StarfallOutpostUI,C=root.StarfallCommsT03,O=root.StarfallOutposts,RT=root.StarfallRuntime;
if(!A||!T||!UI||!C||!O||!RT||!$('rf-t19'))return;
const txt=(id,v)=>{if($(id))$(id).textContent=String(v);};
const num=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d}):'NOT MEASURED';
const source=()=>UI.store.items.find(x=>x.id===$('outpost-radio-device').value&&x.kind==='antenna')||null;
const world=id=>{
 const item=UI.store.items.find(x=>x.id===id);
 if(item)return{bodyId:item.bodyId,systemId:item.bodySnapshot?.systemId||RT.galaxy.byId.get(item.bodyId)?.systemId};
 const r=root.StarfallLaunchUI?.store?.rovers.find(x=>x.id===id)||
   root.StarfallLaunchUI?.store?.satellites.find(x=>x.id===id);
 if(r)return{bodyId:r.bodyId,systemId:r.systemId};
 if(id==='starfall-ship')return RT.engineeringAssetPoses()?.shipPose||null;
 const local=RT.vehicleStore?.get('rover')?.definition?.id;
 if(id===local)return RT.roverAutonomyPosition?.()||null;
 return null;
};
function candidates(){
 const current=source(),opts=new Map(),add=(id,label)=>{if(typeof id!=='string'||!id||id===current?.id||opts.has(id)||!world(id)?.bodyId)return;
  opts.set(id,label+' · '+id);};
 add('starfall-ship','Ship radio');
 const local=RT.vehicleStore?.get('rover')?.definition?.id;add(local,'Local science rover');
 for(const i of UI.store.items.filter(x=>x.kind==='antenna'&&x.id!==current?.id))add(i.id,'Outpost antenna');
 for(const i of root.StarfallLaunchUI?.store?.rovers||[])add(i.id,'Deployed rover');
 for(const i of root.StarfallLaunchUI?.store?.satellites||[])add(i.id,'Real orbital asset');
 return opts;
}
function selection(){
 const pick=$('rf-t19-target'),old=pick.value,targets=candidates(),sourceItem=source();
 if(!sourceItem){pick.replaceChildren();txt('rf-t19-status','Build and wire an actual powered antenna before measuring.');return;}
 if(pick.options.length!==targets.size||[...targets.keys()].some((id,i)=>pick.options[i]?.value!==id)){
  pick.replaceChildren();
  for(const [id,label] of targets){const o=document.createElement('option');o.value=id;o.textContent=label;pick.add(o);}
 }
 if(targets.has(old))pick.value=old;
 $('rf-t19-measure').disabled=!pick.value;
 const count=A.restore(sourceItem.radioT04?.budgetT19).samples.length;
 $('rf-t19-measure').disabled||=count>=A.MAX_SAMPLES;
 $('rf-t19-export').disabled=count===0;$('rf-t19-clear').disabled=count===0;
 txt('rf-t19-count',count+'/'+A.MAX_SAMPLES+' samples on original antenna '+sourceItem.id);
}
function inspect(){
 const x=source(),targetId=$('rf-t19-target').value;
 if(!x||!targetId)throw Error('Select a real installed antenna and existing receiver');
 const dst=world(targetId),body=RT.galaxy.byId.get(x.bodyId)||x.bodySnapshot;
 if(!body?.position||!dst?.bodyId)throw Error('Current source world or receiver ephemeris not loaded. No synthetic radio target.');
 const realLine=UI.powerReports.get(x.bodyId)?.byId?.[x.id]||null;
 const station=T.station(x,body,UI.powerReports.get(x.bodyId),O.rotate);
 const bodyId=dst.bodyId,sys=dst.systemId||RT.galaxy.byId.get(bodyId)?.systemId||x.bodySnapshot?.systemId||'unknown';
 // No T03 queue() call. This is a route calculation only; actual packet
 // transmission and its power cost must still use original mission controls.
 let route=null,reason='';
 try{route=C.routeFor({sourceId:x.id,destId:targetId,bodyId,systemId:sys,encodedBytes:256},RT.time);}
 catch(e){reason=e.message;route={connected:false,reason};}
 const packet=C.transport.packets.filter(p=>p.sourceId===x.id&&p.destId===targetId&&p.state==='ACKED')
  .sort((a,b)=>(b.ackAtS||0)-(a.ackAtS||0))[0]||null;
 return A.snapshot({sourceId:x.id,targetId,bodyId:x.bodyId,timeS:RT.time,
  station,report:realLine,route,packet});
}
function draw(sourceItem){
 const canvas=$('rf-t19-chart');if(!canvas)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#12283f';ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='#426d8b';ctx.lineWidth=1;
 for(const y of [.08,.25,.5,.75,1]){
  const py=h-24-y*(h-44);ctx.beginPath();ctx.moveTo(33,py);ctx.lineTo(w-8,py);ctx.stroke();
  ctx.font='11px sans-serif';ctx.fillStyle='#bcd8ed';ctx.fillText(y.toFixed(2),3,py+3);
 }
 const history=A.restore(sourceItem?.radioT04?.budgetT19).samples.filter(s=>s.targetId===$('rf-t19-target').value);
 if(!history.length){ctx.font='12px sans-serif';ctx.fillStyle='#bcd8ed';ctx.fillText('No recorded observations for this receiver (no invented historical RF)',44,26);return;}
 const xAt=i=>40+i*(w-52)/Math.max(1,history.length-1);
 const yAt=q=>h-24-(q||0)*(h-44);
 ctx.strokeStyle='#91dafb';ctx.lineWidth=2;ctx.beginPath();
 history.forEach((s,i)=>{const x=xAt(i),y=yAt(s.quality);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
 ctx.stroke();
 history.forEach((s,i)=>{ctx.fillStyle=s.connected?'#8ee4b5':'#f2b39b';ctx.beginPath();ctx.arc(xAt(i),yAt(s.quality),3.5,0,Math.PI*2);ctx.fill();});
}
function status(s){
 const q=s.quality,proxy=A.qualityMarginDb(q),noise=A.estimateThermalNoiseDbm(s.bitrate);
 txt('rf-t19-status',[
  'T19A READ-ONLY ROUTE MEASUREMENT · '+(s.connected?'AVAILABLE PHYSICAL PATH':'OFFLINE / NO ROUTE'),
  'ANTENNA '+s.sourceId+' → '+s.targetId+' · WORLD '+s.bodyId+' · CLOCK T+'+num(s.timeS,1)+' s',
  'ORIGINAL T02 '+num(s.watts,1)+' W served · '+num(s.supplyV,1)+' V. This is the antenna operating load; analysis does NOT add a packet or energy.',
  'ORIGINAL T03 '+(s.connected?s.hops.join(' → '):s.reason),
  'REAL ROUTE '+(s.connected?num(s.quality,3)+' normalized quality · '+num(s.bitrate,0)+' bit/s · '+num(s.delayS,5)+' s propagation':'UNKNOWN QUALITY/DELAY; NO PHYSICAL CONTACT'),
  'T04 quality margin proxy '+(proxy===null?'NOT MEASURABLE':num(proxy,2)+' dB relative to 0.08 model cutoff'),
  'Illustrative thermal-noise floor '+(noise===null?'NOT MEASURABLE':num(noise,1)+' dBm, at 290 K and 6 dB noise figure; channel width assumed equal to bit rate'),
  'RF SNR / measured receive power: NOT MODELED; do not treat this noise estimate or quality margin as a physical SNR.',
  'Last REAL T03 ACK '+(s.ackId||'NONE')+(s.ackAtS===null?'':' @ T+'+num(s.ackAtS,1)+' s'),
  'If offline: verify original T02 supply, radio enable, pointing, LOS, buffer, and T08 counterpart hardware.'
 ].join('\n'));
}
function inspectOnly(){try{selection();const s=inspect();status(s);draw(source());return s;}catch(e){txt('rf-t19-status','INSPECTION FAILED · '+e.message);draw(source());return null;}}
function saveVerify(item){
 UI.persist();
 let raw;
 try{raw=JSON.parse(root.localStorage.getItem('starfall_save')||'null');}catch(_){}
 const stored=raw?.outpost5?.items?.find(x=>x.id===item.id)?.radioT04?.budgetT19?.samples;
 const own=A.restore(item.radioT04?.budgetT19).samples;
 if(!Array.isArray(stored)||stored.length!==own.length||stored.at(-1)?.id!==own.at(-1)?.id)
  throw Error('This browser did not persist the source-owned RF trace. Export the existing session before closing.');
}
$('rf-t19-refresh').onclick=()=>inspectOnly();
$('rf-t19-target').onchange=()=>{selection();inspectOnly();};
$('rf-t19-measure').onclick=()=>{
 try{
  const s=inspect(),item=source();
  const sample=A.record(item,s);saveVerify(item);
  status(s);draw(item);selection();
  txt('rf-t19-feedback','RECORDED '+sample.id+' in the original antenna save. No packet queued, energy manufactured, or ACK invented.');
 }catch(e){txt('rf-t19-feedback','NOT RECORDED / '+e.message);selection();}
};
$('rf-t19-export').onclick=()=>{
 const item=source();if(!item)return;
 const samples=A.restore(item.radioT04?.budgetT19).samples;
 const blob=new Blob([JSON.stringify({schema:19,sourceId:item.id,bodyId:item.bodyId,samples},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='starfall-rf-'+item.id+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 txt('rf-t19-feedback','Exported '+samples.length+' original sample IDs; no network access required.');
};
$('rf-t19-clear').onclick=()=>{
 const item=source();if(!item)return;
 const count=A.restore(item.radioT04?.budgetT19).samples.length;
 if(!count||!root.confirm('Clear '+count+' RF diagnostics on '+item.id+'? EXPORT FIRST. This does not alter original radio packets or other equipment.'))return;
 try{A.clear(item);saveVerify(item);selection();draw(item);txt('rf-t19-feedback','Cleared '+count+' confirmed trace records; original packets and antenna unchanged.');}
 catch(e){txt('rf-t19-feedback','CLEAR ERROR · '+e.message);}
};
$('outpost-radio-device').addEventListener('change',()=>{selection();inspectOnly();});
$('outpost-open').addEventListener('click',()=>{selection();});
for(const b of $('outpost').querySelectorAll('[data-outpost-tab]'))b.addEventListener('click',()=>{
 if(b.dataset.outpostTab==='comms'){selection();inspectOnly();}
});
root.StarfallRFAnalyzerUI19={inspect,refresh:inspectOnly,selection};
})(window);