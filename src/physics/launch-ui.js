/* STARFALL 7 / Rocket Lab. No new networking or external runtime dependencies. */
(function(root){'use strict';
const $=id=>document.getElementById(id), RT=root.StarfallRuntime, X=root.StarfallLaunch, P=root.StarfallPhysics, V=root.Starfall3D.V;
const seed=RT.galaxy.seed??742;
const store=new X.Store(Number(new URLSearchParams(location.search).get('seed')??742)>>>0,SF.load().launch7);
let msg='',lastRefresh=0;
function persist(){SF.save({launch7:store.serialize()});}
function format(x,digits=1){return Number.isFinite(x)?x.toFixed(digits):'—';}
function padOptions(){const el=$('launch-pad'),old=el.value,ctx=RT.outpostContext();const pads=root.StarfallOutpostUI?.store?.items.filter(x=>x.kind==='foundation'&&x.bodyId===ctx.bodyId)||[];
 el.replaceChildren();for(const pad of pads){const o=document.createElement('option');o.value=pad.id;o.textContent=pad.id+' / '+ctx.body.name;el.append(o);}if(pads.some(x=>x.id===old))el.value=old;
 if(!pads.length){const o=document.createElement('option');o.textContent='Build a FOUNDATION on this planet first';o.value='';el.append(o);}}
function systemOptions(){const el=$('launch-system'),old=el.value,query=$('launch-system-search').value.trim().toLowerCase();el.replaceChildren();
 const all=RT.galaxy.systems,chosen=RT.galaxy.byId.get(RT.target?.systemId),loaded=query?all.filter(s=>(s.name+' '+s.id).toLowerCase().includes(query)).slice(0,120):all.filter(s=>!s.dormant).slice(0,64);
 if(chosen&&!loaded.some(s=>s.id===chosen.id))loaded.unshift(chosen);
 if(old&&!loaded.some(s=>s.id===old)){const existing=RT.galaxy.byId.get(old);if(existing)loaded.unshift(existing);}
 for(const sys of loaded){const o=document.createElement('option');o.value=sys.id;o.textContent=sys.name+' / '+sys.id;el.append(o);}if(loaded.some(s=>s.id===old))el.value=old;
 else if(chosen)el.value=chosen.id;refreshDestinations();}
function refreshDestinations(){const el=$('launch-destination'),old=el.value,sys=RT.galaxy.byId.get($('launch-system').value);if(sys?.dormant)RT.galaxy.activate(sys);el.replaceChildren();
 for(const b of (sys?.bodies||[]).filter(x=>x.landable)){const o=document.createElement('option');o.value=b.id;o.textContent=b.name+' · '+b.type;el.append(o);}if([...el.options].some(x=>x.value===old))el.value=old;
 if(!el.options.length){const o=document.createElement('option');o.value='';o.textContent='No solid destination in this system';el.append(o);}}
function chosenDesign(){return{engine:$('launch-engine').value,tanks:Number($('launch-tanks').value),stages:Number($('launch-stages').value),boosters:Number($('launch-boosters').value),payload:$('launch-payload').value};}
function profile(){const body=RT.nearest;if(!body?.landable)return null;
 return X.build(chosenDesign(),{surfaceGravityMS2:Math.max(.01,body.gravity*X.G0),radiusM:body.radius*P.SCENE_METERS_PER_UNIT,mu:Math.max(.01,body.gravity*X.G0)*Math.pow(body.radius*P.SCENE_METERS_PER_UNIT,2)});}
function preflight(){try{const pr=profile();$('launch-calculations').textContent=!pr?'Landing on a solid planet or moon is required to assemble and launch a rocket.':
  'Gross mass '+format(pr.massKg/1000)+' tonnes   Payload '+format(pr.payloadKg,0)+' kg\n'+
  'Launch TWR '+format(pr.launchTWR,2)+'   Ideal staged Δv '+format(pr.deltaVMS/1000,2)+' km/s\n'+
  'Guided orbital insertion budget '+format(pr.requiredDeltaVMS/1000,2)+' km/s\n'+
  'Estimated engine-on time '+format(pr.burnTimeS,0)+' s   Stages '+pr.stages+'\n'+
  pr.stageParts.map((s,i)=>'Stage '+(i+1)+': '+s.label+' / propellant '+format(s.propKg/1000,1)+' t / '+format(s.thrustN/1e6,2)+' MN').join('\n')+'\n'+
  (pr.valid?'PASS · '+pr.problem:'FAILED · '+pr.problem)+'\nNote: orbit insertion is a GUIDED, budget-gated approximation, not full n-body ascent.';
 $('launch-ignite').disabled=!pr?.valid||!$('launch-pad').value;
 }catch(e){$('launch-calculations').textContent='PRE-FLIGHT: '+e.message;$('launch-ignite').disabled=true;}}
function status(s,bad=false){msg=s;$('launch-status').textContent=s;$('launch-status').style.color=bad?'#ffaaa0':'#f4ce95';}
function open(){padOptions();systemOptions();refresh();$('launch-dialog').hidden=false;}
function close(){$('launch-dialog').hidden=true;document.activeElement?.blur?.();}
function refresh(){padOptions();preflight();const launches=store.launches.slice(-12).reverse(),sats=store.satellites.slice(-12).reverse();
 $('launch-log').textContent='LAUNCH HISTORY\n'+(launches.length?launches.map(m=>m.id+' · '+m.payload.toUpperCase()+' · '+m.phase.toUpperCase()+' · '+format(m.trajectoryAltitudeM/1000,1)+' km / '+format(m.velocityMS/1000,2)+' km/s').join('\n'):'No launches yet')+'\n\nORBITAL SATELLITES\n'+(sats.length?sats.map(x=>x.id+' / '+(RT.galaxy.byId.get(x.bodyId)?.name||x.bodyId)+' · '+format(x.altitudeM/1000,0)+' km altitude').join('\n'):'No orbital payloads deployed');
 const old=$('launch-probe').value,probe=$('launch-probe');probe.replaceChildren();for(const r of store.rovers){const o=document.createElement('option');o.value=r.id;o.textContent=r.id+' / '+(RT.galaxy.byId.get(r.bodyId)?.name||r.bodyId);probe.append(o);}if(store.rovers.some(x=>x.id===old))probe.value=old;
 refreshProbe();const t=RT.truckSystems();$('launch-truck-status').textContent=t.available?('BATTERY '+format(t.batteryJ/3.6e6,2)+' kWh · CARGO '+format(t.cargoKg,0)+' kg · FLOODLIGHTS '+(t.lights?'ON':'OFF')+'\nFORWARD SLOPE '+format(t.forwardSlopeDeg,1)+'° · BIOME '+t.terrain+'\nSCIENCE ROVER DISTANCE '+format(t.scienceRoverDistance,1)+' units'):'Truck unavailable until surface touchdown.';}
function refreshProbe(){const r=store.rovers.find(x=>x.id===$('launch-probe').value);$('launch-probe-status').textContent=r?['STATUS: '+r.status,'WORLD: '+(RT.galaxy.byId.get(r.bodyId)?.name||r.bodyId),'BATTERY: '+format(r.batteryJ/3.6e6,2)+' kWh','PROGRAM: '+r.index+'/'+r.commands.length,'READINGS: '+r.records.length,...r.records.slice(-5).map(o=>o.instrument+' · '+format(o.value,3)+' '+o.unit+' ±'+format(o.uncertainty,2))].join('\n'):'No deployed rover. Launch a rover capsule first.';}
function launch(){const ctx=RT.outpostContext();if(!ctx.landed||!ctx.body?.landable)throw Error('Land on a solid world to launch');const pad=root.StarfallOutpostUI?.store?.items.find(x=>x.id===$('launch-pad').value);if(!pad)throw Error('Build/select a FOUNDATION in Outposts first');
 const chosen=chosenDesign(),dst=RT.galaxy.byId.get($('launch-destination').value),sys=RT.galaxy.byId.get($('launch-system').value);
 const m=store.launch({body:ctx.body,foundation:pad,design:chosen,time:RT.time,destinationBody:chosen.payload==='rover'?dst:null,destinationSystem:chosen.payload==='rover'?sys:null,unit:P.SCENE_METERS_PER_UNIT});persist();return m;}
function worldPosition(body,local,extra){const u=V.norm(V.rot(local,body.spinAxis||[0,1,0],body.spinAngle||0));return{up:u,position:V.add(body.position,V.mul(u,body.radius+(Starfall3D.groundHeight(local,body)||0)+extra))};}
function sceneRockets(){return store.launches.filter(x=>x.phase==='ascent').slice(-3).flatMap(m=>{const body=RT.galaxy.byId.get(m.bodyId);if(!body)return[];const d=worldPosition(body,m.local,0);return[{position:V.add(d.position,V.mul(d.up,m.trajectoryAltitudeM/P.SCENE_METERS_PER_UNIT)),up:d.up}];});}
function sceneSatellites(){return store.satellites.slice(-48).flatMap(s=>{const b=RT.galaxy.byId.get(s.bodyId);if(!b)return[];try{const q=X.orbit(s,b,RT.time,P.SCENE_METERS_PER_UNIT);return[{position:q.position,up:s.axis}];}catch(_){return[];}});}
function sceneRovers(){const body=RT.nearest;if(!RT.landed||!body)return[];return store.rovers.filter(r=>r.bodyId===body.id).slice(-15).map(r=>{const d=worldPosition(body,r.local,1.8),up=d.up,side=V.norm(V.cross(up,[1,0,0])),front=V.norm(V.cross(side,up));return{position:d.position,up,forward:front};});}
function tick(dt,scale){const now=RT.time,events=store.update(now,id=>RT.galaxy.byId.get(id));store.tickRovers(now,id=>RT.galaxy.byId.get(id),root.StarfallFieldScience);if(events.length){for(const e of events){if(e.kind!=='deployed')continue;const m=store.launches.find(x=>x.id===e.id),sat=store.satellites.find(x=>x.launchId===e.id);if(!m||!sat||sat.kind!=='relay')continue;
  const os=root.StarfallOutpostUI?.store;
  if(os&&!os.relays.some(x=>x.id===sat.id)){const body=RT.galaxy.byId.get(sat.bodyId);if(body){const period=X.orbit(sat,body,RT.time,P.SCENE_METERS_PER_UNIT).periodS;os.relays.push({id:sat.id,bodyId:sat.bodyId,altitude:sat.altitudeM/P.SCENE_METERS_PER_UNIT,phase:0,periodS:period,axis:sat.axis,rangeScene:180000,bandwidthBps:1000000,enabled:true});root.StarfallOutpostUI.persist();}}
 }status(events.map(e=>e.message).join(' · '));persist();}
 if(performance.now()-lastRefresh>1000){lastRefresh=performance.now();if(!$('launch-dialog').hidden)refresh();if(store.launches.some(x=>['ascent','transfer'].includes(x.phase))||store.rovers.some(x=>x.status==='running'))persist();}}
$('launch-open').addEventListener('click',open);$('launch-close').addEventListener('click',close);$('launch-dialog').addEventListener('click',ev=>{if(ev.target===$('launch-dialog'))close();});
$('launch-system').onchange=()=>{refreshDestinations();preflight();};$('launch-system-search').addEventListener('input',systemOptions);
for(const id of ['launch-payload','launch-engine','launch-tanks','launch-stages','launch-boosters','launch-pad'])$(id).addEventListener('change',preflight);
$('launch-refresh').onclick=refresh;$('launch-probe').onchange=refreshProbe;
$('launch-ignite').onclick=()=>{try{const m=launch();status('LIFTOFF '+m.id+' / '+m.payload.toUpperCase()+' · '+format(m.profile.deltaVMS/1000,2)+' km/s ideal delta-v');refresh();}catch(e){status(e.message,true);}};
$('launch-run').onclick=()=>{try{const r=store.command($('launch-probe').value,$('launch-script').value);persist();status('Program accepted: '+r.commands.length+' commands · '+r.id);refreshProbe();}catch(e){status(e.message,true);}};
$('launch-winch').onclick=()=>{try{const r=RT.truckWinch();status('Winch pulled science rover to '+format(r.distanceAfter,1)+' units');refresh();}catch(e){status(e.message,true);}};
$('launch-recharge').onclick=()=>{try{const j=RT.truckRecharge();status('Battery '+format(j/3.6e6,2)+' kWh');refresh();}catch(e){status(e.message,true);}};
$('launch-emergency').onclick=()=>{try{store.command($('launch-probe').value,'STOP');persist();status('Rover stopped');refreshProbe();}catch(e){status(e.message,true);}};
$('launch-export').onclick=()=>{const b=new Blob([JSON.stringify(store.serialize(),null,2)],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='starfall-launch-telemetry.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
root.StarfallLaunchUI={store,open,close,tick,refresh,persist,sceneRockets,sceneSatellites,sceneRovers};
})(window);
