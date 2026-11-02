/* STARFALL 7C satellite operations, embedded in Rocket Lab. All science must
 * be captured and DOWNLINKED before it enters existing journal/map stores. */
(function(root){'use strict';
const $=id=>document.getElementById(id),M=root.StarfallSatelliteOps7C,RT=root.StarfallRuntime,X=root.StarfallLaunch,O=root.StarfallOutposts,P=root.StarfallPhysics;
if(!M||!RT||!$('sat7c-list'))return;
const fmt=(v,n=1)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:n}):'Unavailable';
let selected='',lastView=0,lastSaved=0,lastModelTime=-Infinity,dirty=false,statusText='Choose an orbital satellite to operate.';
const satellites=()=>root.StarfallLaunchUI?.store?.satellites||[],bodyOf=s=>root.StarfallMissionOperationsUI?.resolveBody?.(s,RT.time)||RT.galaxy.byId.get(s.bodyId),T7=root.StarfallOrbitalBusT07;
function starOf(s){const system=RT.galaxy.byId.get(s.systemId);return system?.star?.position||system?.position||null;}
function groundStation(body,at=RT.time){const ctx=RT.outpostContext();if(ctx.landed&&ctx.bodyId===body.id&&Array.isArray(ctx.position)&&RT.vehicleStore.get('ship').state.energyJ>200){const d=(at-RT.time)*2*Math.PI/Math.max(1,body.spinPeriod||86400),up=O.rotate(ctx.local,body.spinAxis||[0,1,0],(body.spinAngle||0)+d),radius=O.V.len(O.V.sub(ctx.position,body.position))+5;return{position:O.V.add(body.position,O.V.mul(up,radius)),label:'Expedition ground radio'};}
 const site=root.StarfallOutpostUI,items=site?.store?.items||[],p=site?.powerReports?.get(body.id);for(const item of items){if(item.bodyId!==body.id||item.kind!=='antenna'||item.enabled===false||p?.byId?.[item.id]?.power!==true)continue;
  const past=(at-RT.time)*2*Math.PI/Math.max(1,body.spinPeriod||86400),dir=O.rotate(item.local,body.spinAxis||[0,1,0],(body.spinAngle||0)+past),position=O.V.add(body.position,O.V.mul(dir,body.radius+Math.max(8,item.height||0)));return{position,label:'Powered outpost antenna '+item.id.slice(-6)};}
 return null;}
function selectedSatellite(){return satellites().find(s=>s.id===selected)||null;}
function persist(){root.StarfallLaunchUI?.persist?.();dirty=false;lastSaved=performance.now();}
function announce(t,error=false){statusText=t;const e=$('sat7c-status');e.textContent=t;e.dataset.error=error?'true':'false';}
function run(fn){try{fn();dirty=true;persist();refresh();}catch(e){announce(e.message,true);}}
function ratioBar(parent,name,value,max){const box=document.createElement('div');box.className='sat7c-meter';const top=document.createElement('div');top.className='sat7c-meter-head';const a=document.createElement('span'),b=document.createElement('strong');a.textContent=name;b.textContent=fmt(value/3.6e6,2)+' / '+fmt(max/3.6e6,2)+' kWh';top.append(a,b);const bar=document.createElement('div');bar.className='sat7c-meter-track';const fill=document.createElement('i');fill.style.width=(Math.max(0,Math.min(1,value/max))*100).toFixed(1)+'%';bar.append(fill);box.append(top,bar);parent.append(box);}
function metric(el,label,value,caption){const card=document.createElement('div');card.className='sat7c-metric';const l=document.createElement('small');l.textContent=label;const val=document.createElement('strong');val.textContent=value;const c=document.createElement('small');c.textContent=caption||'';card.append(l,val,c);el.append(card);}
function refresh(){const picker=$('sat7c-list'),prev=selected||picker.value,ss=satellites();picker.replaceChildren();for(const s of ss){const op=document.createElement('option');op.value=s.id;op.textContent=(RT.galaxy.byId.get(s.bodyId)?.name||s.bodyId)+' / '+s.kind.toUpperCase()+' / '+s.id.slice(-8);picker.append(op);}selected=ss.some(s=>s.id===prev)?prev:ss[0]?.id||'';picker.value=selected;
 const metrics=$('sat7c-metrics'),data=$('sat7c-data'),passes=$('sat7c-passes');metrics.replaceChildren();data.replaceChildren();passes.replaceChildren();
 const s=selectedSatellite();if(!s){metrics.textContent='No deployed satellites. Launch a communications or science satellite from a FOUNDATION to create an orbital asset.';announce('No orbital satellites available.');return;}
 const o=M.ensure(s),b=bodyOf(s),star=starOf(s);$('sat7c-enabled').checked=o.enabled;$('sat7c-radio').checked=o.radioEnabled;$('sat7c-pointing').value=T7?({SAFE:'safe',NADIR_IMAGING:'nadir'}[T7.bus(s).desiredMode]||T7.bus(s).desiredMode):o.pointing;const options=$('sat7c-sensor');options.replaceChildren();for(const k of s.kind==='relay'?['none']:['camera','spectrometer','atmosphere']){const op=document.createElement('option');op.value=k;op.textContent=M.PAYLOADS[k]?.label||'No science payload (relay-only)';options.append(op);}options.value=o.sensor;
 $('sat7c-capture').disabled=s.kind==='relay';$('sat7c-status').textContent=statusText;
 if(!b||!star){metrics.textContent='This system is not loaded: the satellite state remains saved but live orbit and link calculations are unavailable until its system is activated.';return;}
 let g,link;try{g=M.geometry(s,b,star,RT.time,P.SCENE_METERS_PER_UNIT,X.orbit);const station=groundStation(b);link=M.radio(s,b,star,RT.time,P.SCENE_METERS_PER_UNIT,X.orbit,station?.position,O.radioLink);
 const cells=document.createElement('div');cells.className='sat7c-metrics';metric(cells,'ORBIT HEIGHT',fmt(g.altitudeM/1000,0)+' km','Achieved Kepler orbit');
 if(T7){const v=T7.inspect(s,b,star,RT.time,P.SCENE_METERS_PER_UNIT,X.orbit),bus=T7.bus(s);
  metric(cells,'ORBIT SPEED',fmt(v.orbit.speedMS/1000,3)+' km/s',v.orbit.model);
  metric(cells,'PERIOD',fmt(v.orbit.periodS/60,1)+' min','Using original 7B/7C achieved orbit');
  metric(cells,'ATTITUDE',v.mode+' → '+v.desiredMode,fmt(v.pointingErrorDeg,1)+'° error · '+fmt(bus.health*100,0)+'% bus health');
  metric(cells,'POINTING LOAD',fmt(bus.activeW,0)+' W',bus.state+' · max '+fmt(T7.CONFIG.slewDegS,1)+'°/s');
  metric(cells,'PAYLOAD QUEUE',bus.jobs.length+' acquisition(s)',bus.completed.length+' recorded numeric exposures');
  $('sat7c-t07-status').textContent=[
   'T07 SOURCE '+s.id+' · '+s.kind.toUpperCase()+' / bus '+bus.state,
   'PERIAPSIS '+fmt(v.orbit.periapsisM===null?NaN:v.orbit.periapsisM/1000,1)+' km / APOAPSIS '+fmt(v.orbit.apoapsisM===null?NaN:v.orbit.apoapsisM/1000,1)+' km / ECCENTRICITY '+fmt(v.orbit.eccentricity===null?NaN:v.orbit.eccentricity,5),
   'NADIR FOOTPRINT '+fmt(v.footprintRadiusM/1000,2)+' km · fixed subpoint '+v.subpoint.map(x=>fmt(x,4)).join('/'),
   'BATTERY '+fmt(v.batteryJ/3.6e6,3)+' kWh · SOLAR '+fmt(v.solarActualW,0)+' / '+fmt(v.solarRatedW,0)+' W · LOAD '+fmt(v.loadW,0)+' W',
   'ACQUISITIONS '+bus.jobs.map(j=>j.sensor+': '+j.status+' T+'+fmt(j.eligibleAtS,0)+'s'+(j.lastReason?' / '+j.lastReason:'')).join(' | '),
   'FAULTS '+(bus.faults.slice(-3).map(f=>f.reason).join(' | ')||'None'),
   'MANEUVERS UNAVAILABLE: no onboard propellant/impulse hardware; Kepler orbit unmodified'
  ].join('\\n');
 }metric(cells,'ILLUMINATION',g.shadow?'ECLIPSE':'SUNLIT','Cylindrical shadow model');metric(cells,'SOLAR INPUT',fmt(o.lastSolarW,0)+' W','Rated 1.15 kW, modeled');metric(cells,'DC BUS LOAD',fmt(o.lastLoadW,0)+' W','Conservative baseline');metric(cells,'THERMAL',fmt(o.temperatureK-273.15,1)+' °C','Lumped heater/radiator model');metric(cells,'DOWNLINK',link.connected?'IN VIEW':'NO LINK',link.connected?'Delay '+fmt(link.delayS*1000,2)+' ms':link.reason);metric(cells,'DATA QUEUE',(o.storage.length+o.inTransit.length)+' / '+M.CONFIG.storageMax+' files','Max 24 onboard records');metrics.append(cells);ratioBar(metrics,'BATTERY',o.energyJ,o.capacityJ);
 const st=document.createElement('p');st.className='sat7c-description';st.textContent=(station?'Receiver: '+station.label:'No powered ground receiver on this world')+' · satellite ID '+s.id+' · time T+'+fmt(RT.time,0)+'s';metrics.append(st);
 const sched=T7?T7.predict(s,b,star,RT.time,P.SCENE_METERS_PER_UNIT,X.orbit,
  (t,atBody)=>groundStation(atBody,t)?.position,O.radioLink,
  t=>root.StarfallMissionOperationsUI?.resolveBody?.(s,t)||b):
  {passes:M.passWindows(s,b,star,RT.time,P.SCENE_METERS_PER_UNIT,X.orbit,t=>groundStation(b,t)?.position,O.radioLink,3),sunWindows:[]};
 const schedule=sched.passes;
 passes.textContent=[
  schedule.length?schedule.map((p,i)=>'REAL LINK PASS '+(i+1)+' · T+'+fmt(p.startS-RT.time,0)+'s – T+'+fmt(p.endS-RT.time,0)+'s · '+fmt(p.endS-p.startS,0)+'s window').join('\\n'):'No commissioned powered receiver passes in sampled orbital horizon',
  sched.sunWindows?.length?sched.sunWindows.map((p,i)=>'SUN WINDOW '+(i+1)+' · T+'+fmt(p.startS-RT.time,0)+'s – T+'+fmt(p.endS-RT.time,0)+'s').join('\\n'):'Sun visibility windows unavailable',
  'Battery time-to-full with current solar/load: '+fmt(sched.estimatedBatteryFullS,0)+' simulated s'
 ].join('\\n');
 }catch(err){metrics.textContent='Orbit/radio unavailable: '+err.message;}
 const entries=[...o.storage.map(x=>({...x,mode:'ONBOARD'})),...o.inTransit.map(x=>({...x,mode:'IN TRANSIT'})),...o.received.slice(-10).map(x=>({...x,mode:'DOWNLINKED'}))].sort((a,b)=>b.timeS-a.timeS).slice(0,28);
 if(!entries.length)data.textContent='No observations yet. Select a sensor, orient NADIR, acquire a dataset, then transmit it when a ground link is available.';
 for(const r of entries){const line=document.createElement('div');line.className='sat7c-datum';const top=document.createElement('strong');top.textContent=(r.mode==='ONBOARD'?'◈ ':'✓ ')+r.instrument.toUpperCase();const val=document.createElement('span');val.textContent=fmt(r.value,3)+' '+r.unit+' ±'+fmt(r.uncertainty,2);const note=document.createElement('small');note.textContent=r.mode+' · '+r.bodyId+' · T+'+fmt(r.timeS,0)+'s · '+(r.footprintRadiusM?fmt(r.footprintRadiusM/1000,2)+' km footprint':'');line.append(top,val,note);data.append(line);}
}
function tick(time){if(root.StarfallMissionOperationsUI){if(!$('launch-dialog').hidden&&performance.now()-lastView>1100){lastView=performance.now();refresh();}return;}if(!Number.isFinite(time)||time>=lastModelTime&&time-lastModelTime<1)return;lastModelTime=time;const sats=satellites();if(sats.length===0)return;
 let deliveredNow=false;for(const s of sats.slice(-70)){const b=bodyOf(s),star=starOf(s);if(!b||!star)continue;try{const o=M.ensure(s),before=o.energyJ;M.step(s,b,star,time,P.SCENE_METERS_PER_UNIT,X.orbit);if(Math.abs(before-o.energyJ)>0.01)dirty=true;const ready=M.receive(s,time);if(ready.length){deliveredNow=true;for(const r of ready){if(root.StarfallScienceUI?.ingestOrbital?.(r))root.StarfallSurveyUI?.recordOrbitalFootprint?.(r);}dirty=true;}}catch(e){s.ops7cError=String(e.message).slice(0,160);}}
 const now=performance.now();if(dirty&&(deliveredNow||now-lastSaved>6000))persist();if(!$('launch-dialog').hidden&&now-lastView>1100){lastView=now;refresh();}
}
function open(id){if(id)selected=id;root.StarfallLaunchUI?.open?.();refresh();$('sat7c-section').scrollIntoView({block:'nearest',behavior:'auto'});}
$('sat7c-list').onchange=e=>{selected=e.target.value;refresh();};$('sat7c-refresh').onclick=refresh;
$('sat7c-enabled').onchange=()=>run(()=>{const s=selectedSatellite();if(!s)throw Error('Select a satellite');const o=M.ensure(s);if(!o.enabled&&o.energyJ<=150)throw Error('Battery exhausted: wait for solar charging');o.enabled=$('sat7c-enabled').checked;announce(o.enabled?'Satellite bus enabled':'Satellite placed in low-power standby');});
$('sat7c-radio').onchange=()=>run(()=>{const o=M.ensure(selectedSatellite());o.radioEnabled=$('sat7c-radio').checked;announce('Radio '+(o.radioEnabled?'enabled':'disabled'));});
$('sat7c-pointing').onchange=()=>run(()=>{const s=selectedSatellite(),o=M.ensure(s),value=$('sat7c-pointing').value;
 if(T7)T7.command(s,value==='safe'?'SAFE':value==='nadir'?'NADIR_IMAGING':value,RT.time);
 else o.pointing=value;
 announce('Attitude target '+(T7?.bus(s).desiredMode||o.pointing).toUpperCase()+' queued · slew uses finite time & power');});
$('sat7c-sensor').onchange=()=>run(()=>{const s=selectedSatellite(),o=M.ensure(s),sensor=$('sat7c-sensor').value;if(!M.PAYLOADS[sensor]&&sensor!=='none')throw Error('Sensor unavailable');if(s.kind==='relay'&&sensor!=='none')throw Error('Relay satellite has no science sensor');o.sensor=sensor;announce('Sensor configured: '+sensor);});
$('sat7c-capture').onclick=()=>run(()=>{const s=selectedSatellite(),b=bodyOf(s),star=starOf(s);if(!b||!star)throw Error('Destination ephemeris unavailable');if(T7){
 const j=T7.schedule(s,M.ensure(s).sensor,RT.time);
 announce('Real '+j.durationS+' s '+j.sensor+' exposure queued onboard as '+j.id+'. Next T01 clock tick performs acquisition only after valid orbit/daylight/pointing/power.');
 }else{const record=M.capture(s,b,star,RT.time,RT.galaxy.seed,P.SCENE_METERS_PER_UNIT,X.orbit,root.StarfallFieldScience,root.Starfall3D?.groundHeight);announce('Captured '+record.instrument+' · stored '+record.dataBytes+' bytes until downlink.');}});
$('sat7c-downlink').onclick=()=>run(()=>{const s=selectedSatellite(),b=bodyOf(s),star=starOf(s);if(!b||!star)throw Error('Satellite world is unloaded');const rec=groundStation(b),v=root.StarfallCommsT03?{records:root.StarfallCommsT03.queueSatellite(s,RT.time),link:{delayS:0}}:M.downlink(s,b,star,RT.time,P.SCENE_METERS_PER_UNIT,X.orbit,rec?.position,O.radioLink);
  announce(root.StarfallCommsT03?'Queued '+v.records.length+' dataset(s) in shared physical radio transport. Data stays onboard until complete ACK.':'Transmitting '+v.records.length+' dataset(s) · propagation delay '+fmt(v.link.delayS*1000,3)+' ms. Journal/map update only after receipt.');});
$('sat7c-view-assets').onclick=()=>{const id=selected;$('launch-dialog').hidden=true;root.StarfallAssetUI7A1?.select?.(id,true);};
$('sat7c-schedule').onclick=()=>$('sat7c-capture').click();
 $('sat7c-predict').onclick=refresh;
 root.StarfallSatelliteOpsUI={tick,refresh,open,get selected(){return selected;},groundStation};addEventListener('pagehide',()=>{if(dirty)persist();});
})(window);
