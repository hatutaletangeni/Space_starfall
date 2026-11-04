/* STARFALL 7 / Rocket Lab. No new networking or external runtime dependencies. */
(function(root){'use strict';
const $=id=>document.getElementById(id), RT=root.StarfallRuntime, X=root.StarfallLaunch, P=root.StarfallPhysics, V=root.Starfall3D.V;
const seed=RT.galaxy.seed??742;
const store=new X.Store(Number(new URLSearchParams(location.search).get('seed')??742)>>>0,SF.load().launch7);
const E=root.StarfallEngineering7A,registry=E?new E.Registry(seed,SF.load().engineering7A):null;
let lastAssetSave=0;
function refreshRegistry(persist=false){if(!registry)return;
 registry.project({vehicles:RT.vehicleStore,flight:RT.engineeringAssetPoses(),outposts:root.StarfallOutpostUI?.store,launch:store,observations:root.StarfallScienceUI?.journal,timeS:RT.time});
 if(persist)SF.save({engineering7A:registry.serialize()});
}
root.StarfallEngineering7AUI={registry,refreshRegistry};

let msg='',lastRefresh=0;
function persist(){SF.save({launch7:store.serialize()});refreshRegistry(true);}
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
function chosenDesign(){const stages=Number($('launch-stages').value);return{mode:$('launch-7b-build-mode').value,targetAltitudeM:Number($('launch-7b-target').value)*1000,stageConfig:[{tanks:Number($('launch-tanks').value),engine:$('launch-engine').value},{tanks:Number($('launch-7b-tank2').value),engine:$('launch-7b-engine2').value},{tanks:Number($('launch-7b-tank3').value),engine:$('launch-7b-engine3').value}].slice(0,stages),engine:$('launch-engine').value,tanks:Number($('launch-tanks').value),stages:Number($('launch-stages').value),boosters:Number($('launch-boosters').value),payload:$('launch-payload').value};}
function profile(){const body=RT.nearest;if(!body?.landable)return null;
 return X.build(chosenDesign(),{surfaceGravityMS2:Math.max(.01,body.gravity*X.G0),radiusM:body.radius*P.SCENE_METERS_PER_UNIT,mu:Math.max(.01,body.gravity*X.G0)*Math.pow(body.radius*P.SCENE_METERS_PER_UNIT,2)});}
function preflight(){try{const pr=profile();$('launch-calculations').textContent=!pr?'Landing on a solid planet or moon is required to assemble and launch a rocket.':
  'Gross mass '+format(pr.massKg/1000)+' tonnes   Payload '+format(pr.payloadKg,0)+' kg\n'+
  'Launch TWR '+format(pr.launchTWR,2)+'   Ideal staged Δv '+format(pr.deltaVMS/1000,2)+' km/s\n'+
  'Preliminary ideal budget '+format(pr.requiredDeltaVMS/1000,2)+' km/s (advisory, NOT guaranteed)\n'+
  'Estimated engine-on time '+format(pr.burnTimeS,0)+' s   Stages '+pr.stages+'\n'+
  pr.stageParts.map((s,i)=>'Stage '+(i+1)+': '+s.tanks+' tanks · '+s.label+' / fuel '+format(s.propKg/1000,1)+' t / thrust '+format(s.thrustN/1e6,2)+' MN').join('\n')+'\n'+
  (pr.valid?'DESIGN CHECK · '+pr.problem:'WARNING · '+pr.problem)+'\nReal launch may fail. Acceleration, drag, fuel exhaustion, trajectory and stable orbit are force-integrated.';
 $('launch-ignite').disabled=!pr||!$('launch-pad').value;
 }catch(e){$('launch-calculations').textContent='PRE-FLIGHT: '+e.message;$('launch-ignite').disabled=true;}}
function padReadinessT11(){
 const T=root.StarfallPadT11,os=root.StarfallOutpostUI?.store,ctx=RT.outpostContext();
 const pad=os?.items.find(x=>x.id===$('launch-pad').value);
 const report=T.inspect({pad,body:ctx.body,launchStore:store,outposts:os,
  powerReport:root.StarfallOutpostUI?.powerReports.get(ctx.bodyId),
  heightAt:ctx.body?.landable?(v=>Starfall3D.groundHeight(v,ctx.body)):null});
 $('launch-t11-pad-status').textContent='T11 PAD '+(pad?.id||'NONE')+' · '+report.mode.toUpperCase()+
  ' · CONTROL LOAD '+report.powerW+' W · '+(report.ready?'READY':report.reasons.join(' / '))+
  (report.slopeDeg===null?'':' · TERRAIN SLOPE '+format(report.slopeDeg,2)+'°');
 const choice=chosenDesign(),target=RT.galaxy.byId.get($('launch-destination').value),
  system=RT.galaxy.byId.get($('launch-system').value);
 try{
  const route=T.validateDestination({design:choice,body:ctx.body||RT.nearest,destinationBody:target,destinationSystem:system});
  const p=profile(),payload=X.PAYLOADS[choice.payload];
  $('launch-t11-manifest').textContent='PAYLOAD '+payload.label+' · '+payload.massKg+' kg · RETENTION 210 kg'+
    ' · ROUTE '+route.kind+' · TARGET '+route.destinationBodyId+
    '\\nRequires actual stable 7B orbit before separation. '+(choice.payload==='rover'?'Destination site from T06 survey; capsule descent has bounded envelope.':'Satellite uses launch-inherited orbital state.');
 }catch(e){$('launch-t11-manifest').textContent='PAYLOAD PREFLIGHT: '+e.message;}
 $('launch-t11-commission').disabled=!pad||report.busy||report.mode==='commissioned';
 $('launch-t11-legacy').disabled=!pad||report.busy||report.mode==='legacy';
 return report;
}
function configurePadT11(mode){
 try{
  const os=root.StarfallOutpostUI?.store,pad=os?.items.find(x=>x.id===$('launch-pad').value);
  root.StarfallPadT11.configure(pad,mode,RT.time,store);
  root.StarfallOutpostUI.persist();
  refresh();status('Pad '+pad.id+' now '+mode.toUpperCase()+'. '+(mode==='commissioned'?'Requires wired 90 W control bus and safe terrain clearance.':'Legacy saved-game launch compatibility is restored.'));
 }catch(e){status(e.message,true);}
}
function status(s,bad=false){msg=s;$('launch-status').textContent=s;$('launch-status').style.color=bad?'#ffaaa0':'#f4ce95';}
function open(){padOptions();systemOptions();refresh();$('launch-dialog').hidden=false;}
function close(){$('launch-dialog').hidden=true;document.activeElement?.blur?.();}
function refresh(){padOptions();preflight();const padT11=padReadinessT11();if(!padT11.ready)$('launch-ignite').disabled=true;refreshRegistry();$('launch-7a-shared').checked=registry?.enabled!==false;const assetPicker=$('launch-7a-asset'),oldAsset=assetPicker.value;assetPicker.replaceChildren();for(const item of [...(registry?.assets?.values()||[])].slice(0,240)){const option=document.createElement('option');option.value=item.id;option.textContent=item.type.toUpperCase()+' · '+item.id;assetPicker.append(option);}if([...assetPicker.options].some(x=>x.value===oldAsset))assetPicker.value=oldAsset;showAsset();const sourcePicker=$('launch-charge-source'),previous=sourcePicker.value,ctx=RT.outpostContext(),list=root.StarfallOutpostUI?.store?.items.filter(x=>x.kind==='battery'&&x.bodyId===ctx.bodyId)||[];
 sourcePicker.replaceChildren();for(const item of list){const op=document.createElement('option');op.value=item.id;op.textContent=item.id.slice(-16)+' · '+format(item.energyJ/3.6e6,2)+' kWh';sourcePicker.append(op);}if(list.some(x=>x.id===previous))sourcePicker.value=previous;
 if(!list.length){const op=document.createElement('option');op.value='';op.textContent='Build and wire a solar array + battery';sourcePicker.append(op);}
 const launches=store.launches.slice(-12).reverse(),sats=store.satellites.slice(-12).reverse();refreshFlightPanel();
 $('launch-log').textContent='LAUNCH HISTORY\n'+(launches.length?launches.map(m=>m.id+' · '+m.payload.toUpperCase()+' · '+m.phase.toUpperCase()+' · '+format(m.trajectoryAltitudeM/1000,1)+' km / '+format(m.velocityMS/1000,2)+' km/s').join('\n'):'No launches yet')+'\n\nORBITAL SATELLITES\n'+(sats.length?sats.map(x=>x.id+' / '+(RT.galaxy.byId.get(x.bodyId)?.name||x.bodyId)+' · '+format(x.altitudeM/1000,0)+' km altitude').join('\n'):'No orbital payloads deployed');
 const old=$('launch-probe').value,probe=$('launch-probe');probe.replaceChildren();for(const r of store.rovers){const o=document.createElement('option');o.value=r.id;o.textContent=r.id+' / '+(RT.galaxy.byId.get(r.bodyId)?.name||r.bodyId);probe.append(o);}if(store.rovers.some(x=>x.id===old))probe.value=old;
 refreshProbe();refreshRoverService();refreshT12();const t=RT.truckSystems();$('launch-truck-status').textContent=t.available?('BATTERY '+format(t.batteryJ/3.6e6,2)+' kWh · CARGO '+format(t.cargoKg,0)+' kg · FLOODLIGHTS '+(t.lights?'ON':'OFF')+'\nFORWARD SLOPE '+format(t.forwardSlopeDeg,1)+'° · BIOME '+t.terrain+'\nSCIENCE ROVER DISTANCE '+format(t.scienceRoverDistance,1)+' units'+(t.winch?'\nWINCH '+t.winch.status+' · '+format(t.winch.lastDistance,1)+' units remaining · '+format(t.winch.remainingWorkJ/1000,1)+' kJ remaining · '+format(t.winch.consumedWorkJ/1000,1)+' kJ actually spent · cable '+format(t.winch.cableLengthScene,1)+' units'+(t.winch.reason?' · '+t.winch.reason:''):'\nWINCH IDLE · Max 55 scene units')):(t.stored?'Truck secured in spacecraft cargo bay · unload physically on landing.':'Truck unavailable on this surface.');}
function chosenFieldRover(){
 if($('launch-t12-target').value!=='deployed')return null;
 const r=store.rovers.find(x=>x.id===$('launch-probe').value);
 if(!r)throw Error('T12 select a real deployed rover first');
 return r;
}
function refreshT12(){
 const el=$('launch-t12-status');if(!el)return;
 try{
  const r=chosenFieldRover(),d=RT.fieldServiceStatus(r),parts=d.parts.parts;
  el.textContent=['TARGET '+(r?.id||'starfall-rover')+' / '+(r?'deployed':'local science rover'),
   'ACCESS '+(d.nearby?'PHYSICAL ACCESS CONFIRMED':'OUT OF RANGE: exit parked truck with X and approach within 18 scene units'),
   'TRUCK ENERGY '+format(d.batteryJ/3.6e6,2)+' kWh · CONNECTOR '+format(d.parts.temperatureK,1)+' K',
   'FAULT '+d.parts.fault,'NEXT SERVICE '+format(Math.max(0,d.parts.readyAtS-RT.time),0)+' simulation seconds',
   ...Object.entries(parts).map(([k,v])=>k.toUpperCase()+' CONDITION '+format(v*100,0)+'%'),
   'LAST REPLACEMENTS '+(d.records.length?d.records.slice(-3).map(x=>x.slot+' / '+x.installedId+' / '+format(x.energyJ/1000,0)+' kJ').join(' · '):'None')].join('\n');
 }catch(e){el.textContent='T12 DIAGNOSTIC '+e.message;}
}
function showAsset(){const item=registry?.assets.get($('launch-7a-asset').value),sum=registry?.summary();$('launch-7a-detail').textContent=item?('Registry: '+sum.total+' tracked assets · selected '+item.type.toUpperCase()+' · '+item.id+'\nEnergy '+(item.capacityJ>0?(item.energyJ/3.6e6).toFixed(2)+' / '+(item.capacityJ/3.6e6).toFixed(2)+' kWh':'not modeled')+' · condition '+Math.round(item.health*100)+'%\nOpen ASSET MANAGER for component cards, connections, operating limits, and source labels.'):'Registry: No registered engineered objects.';}
/* 7D: a local surface terminal or powered relay, never a fabricated interstellar instant connection. */
function remoteLink(r,time=RT.time){if(!r)return{connected:false,reason:'No selected rover',delayS:0};
 if(root.StarfallCommsT03){const q=root.StarfallCommsT03.routeFor({sourceId:'starfall-ship',destId:r.id,bodyId:r.bodyId,systemId:r.systemId},time);return{connected:!!q.connected,reason:q.reason||'No physical packet route',delayS:q.delayS||0,quality:q.connected?1:0,route:q.hops||[],bandwidthBps:q.bandwidthBps||0};}
 const body=RT.galaxy.byId.get(r.bodyId)||r.bodySnapshot,ctx=RT.outpostContext(),unit=P.SCENE_METERS_PER_UNIT;
 if(!body||!Number.isFinite(body.radius)||!body.position)return{connected:false,reason:'Destination ephemeris unloaded: visit system to establish contact',delayS:0};
 if(!ctx.landed||ctx.bodyId!==r.bodyId||!ctx.local)return{connected:false,reason:'No ground terminal on rover world; travel to destination or deploy a powered local receiver',delayS:0};
 const G=root.StarfallGroundOps7D,groundArc=G.arcMeters(ctx.local,r.local,body.radius*unit),horizonM=2*Math.sqrt(2*body.radius*unit*2);
 if(groundArc<=Math.min(30000,horizonM))return{connected:true,reason:'Direct surface radio',delayS:Math.max(.001,groundArc/299792458),quality:Math.max(.1,1-groundArc/30000)};
 const station=(root.StarfallOutpostUI?.store?.items||[]).find(x=>x.bodyId===r.bodyId&&x.kind==='antenna'&&x.enabled&&x.condition>.02&&root.StarfallOutpostUI?.powerReports?.get(r.bodyId)?.byId?.[x.id]?.power===true);
 const receivers=[ctx.local];if(station)receivers.push(station.local);
 for(const sat of store.satellites){if(sat.bodyId!==r.bodyId||!root.StarfallSatelliteOps7C?.relayOperational?.(sat))continue;
  try{const q=root.StarfallEngineering7A?.satellitePosition?.(sat,body,time,unit)||X.orbit(sat,body,time,unit),radial=(local)=>{const w=V.rot(local,body.spinAxis||[0,1,0],body.spinAngle||0);return V.add(body.position,V.mul(w,body.radius+(Starfall3D.groundHeight(local,body)||0)+2));},rp=radial(r.local),bodies=[{position:body.position,radius:body.radius}],range=180000;
   const ro=root.StarfallOutposts.radioLink(q.position,rp,bodies,range,unit);if(!ro.connected)continue;
   for(const local of receivers){const stationLink=root.StarfallOutposts.radioLink(q.position,radial(local),bodies,range,unit);if(stationLink.connected)return{connected:true,reason:'Orbital relay '+sat.id,delayS:Math.max(.01,ro.delayS+stationLink.delayS),quality:Math.min(ro.quality,stationLink.quality)};}
  }catch(_){continue;}}
 return{connected:false,reason:'Surface horizon or satellite blackout; onboard program continues',delayS:0};}
function groundHeight7d(local,body){return Starfall3D.groundHeight(local,body);}
function receiveRover(obs,r){if(!obs||!root.StarfallScienceUI?.ingestRover)return;root.StarfallScienceUI.ingestRover(obs);}
function refreshCommsT03(id){
 const box=$('launch-comms-t03');if(!box)return;const svc=root.StarfallCommsT03;
 if(!svc){box.textContent='Radio transport not initialized';return;}
 const packets=svc.status(id).packets.slice(-14).reverse();
 box.textContent=packets.length?packets.map(p=>[
  p.type+' / '+p.id+' · '+p.state,
  Math.floor(p.sendBytes)+' / '+p.encodedBytes+' encoded bytes ('+Math.floor(100*p.sendBytes/p.encodedBytes)+'%)',
  'ROUTE '+(p.route.join(' → ')||'none')+' · '+(p.lastLink?Math.round(p.lastLink.bandwidthBps)+' bit/s · '+(p.lastLink.delayS*1000).toFixed(3)+' ms':'no live link'),
  'CUSTODY '+p.custody+' · '+(p.reason||p.ack)
 ].join(' | ')).join('\\n'):'No radio packets for this asset. Deployed commands remain pending when out of contact.';
}
function refreshProbe(){const r=store.rovers.find(x=>x.id===$('launch-probe').value);$('launch-probe-status').textContent=r?['STATUS: '+r.status,'WORLD: '+(RT.galaxy.byId.get(r.bodyId)?.name||r.bodyId),'BATTERY: '+format(r.batteryJ/3.6e6,2)+' kWh','RADIO: '+remoteLink(r).reason,'MISSION: '+(r.ground7d?.mode||'LEGACY')+' · '+(r.ground7d?.reason||'Ready'),'PROGRAM: '+r.index+'/'+r.commands.length,'UPLINK QUEUE: '+(r.ground7d?.pending?.length||0),'ONBOARD DATA: '+(r.ground7d?.queuedObservations?.length||0),'PACKETS: '+(root.StarfallCommsT03?.status(r.id).packets.filter(x=>x.state!=='ACKED').length||0),'DISTANCE: '+format(r.ground7d?.distanceM||0,1)+' m','ONBOARD READINGS: '+r.records.length+' · RECEIVED: '+(r.ground7d?.receivedIds?.length||0),...r.records.filter(o=>r.ground7d?.receivedIds?.includes(o.id)).slice(-5).map(o=>o.instrument+' · '+format(o.value,3)+' '+o.unit+' ±'+format(o.uncertainty,2))].join('\n'):'No deployed rover. Launch a rover capsule first.';refreshCommsT03(r?.id||null);refreshRoverT06(r);}
function landingPreview(){
 const T=root.StarfallRoverT06,dst=RT.galaxy.byId.get($('launch-destination').value);
 const p=$('launch-rover-landing-preview');
 if(!T||!dst||!dst.landable){p.textContent='Select a landable destination world and the rover payload.';return null;}
 try{
  const auto=$('launch-rover-auto-site').checked;
  const selected=auto?null:T.fromLatLon(Number($('launch-rover-lat').value),Number($('launch-rover-lon').value));
  const id='launch-'+store.seed+'-'+(store.serial+1);
  const site=T.chooseSite(dst,(u,b)=>Starfall3D.groundHeight(u,b),id,selected,P.SCENE_METERS_PER_UNIT);
  const landing=T.landingDecision(dst,site),latlon=T.latLon(site.local);
  p.textContent=['DESTINATION '+dst.name+' · '+dst.id,'SITE '+site.siteId,
   'COORDINATES '+format(latlon.lat,4)+'° latitude / '+format(latlon.lon,4)+'° longitude',
   'REAL TERRAIN '+format(site.heightM,1)+' m elevation · '+format(site.slopeDeg,1)+'° footprint slope · '+format(site.roughnessM,2)+' m relief',
   'CAPSULE '+landing.reason+' · '+format(landing.requiredJ/1e6,1)+' MJ landing fuel budget · '+format(landing.estimatedTouchdownMS,2)+' m/s terminal estimate',
   'WARNING: entry/descent modeled by bounded landing envelope, not a six-DOF atmosphere integrator.',
   'RELEASE '+(landing.safe?'SITE VERIFIED: entry/descent may proceed':'UNSAFE: capsule may fault, never teleport a healthy robot')].join('\n');
  return{site,landing};
 }catch(e){p.textContent='SITE UNAVAILABLE: '+String(e.message||e);return null;}
}
function refreshRoverService(){
 const select=$('launch-rover-service-source'),old=select.value,id=$('launch-probe').value;
 const r=store.rovers.find(x=>x.id===id),batteries=root.StarfallOutpostUI?.store?.items.filter(x=>x.kind==='battery'&&x.bodyId===r?.bodyId)||[];
 select.replaceChildren();
 for(const battery of batteries){const op=document.createElement('option');op.value=battery.id;op.textContent=battery.id+' · '+format(battery.energyJ/3.6e6,2)+' kWh';select.append(op);}
 if(batteries.some(x=>x.id===old))select.value=old;
}
function refreshRoverT06(r){
 const p=$('launch-rover-trajectory'),T=root.StarfallRoverT06;
 if(!r||!T){p.textContent='No real deployed rover selected.';return;}
 const hw=T.hardware(r),body=RT.galaxy.byId.get(r.bodyId)||r.bodySnapshot,
  G=root.StarfallGroundOps7D,comm=root.StarfallCommsT03?.status(r.id),
  active=r.commands[r.index],info=active&&['GO_TO','RETURN','DOCK'].includes(active.op)?
   T.route(r,body,active.op==='GO_TO'?active.local:hw.homeLocal,P.SCENE_METERS_PER_UNIT):null;
 const link=remoteLink(r);
 let ground='Terrain unavailable until destination snapshot is loaded';
 try{if(body?.landable){const fp=T.footprint(body,r.local,groundHeight7d,P.SCENE_METERS_PER_UNIT);
  ground='Slope '+format(fp.slopeDeg,1)+'° · relief '+format(fp.roughnessM,2)+' m · '+fp.reason;}}catch(e){ground=e.message;}
 const ll=T.latLon(r.local);
 p.textContent=['T06 '+r.id+' / '+hw.state+' · '+hw.landSiteId,
  'BODY '+r.bodyId+' · '+format(ll.lat,5)+'° latitude · '+format(ll.lon,5)+'° longitude · heading '+format(r.heading*180/Math.PI,1)+'°',
  'SURFACE '+ground,'CHARGE '+format(r.batteryJ/3.6e6,3)+' kWh · reserve '+format((r.ground7d?.safeReserveJ||400000)/3.6e6,3)+' kWh',
  'ROUTE '+(link.connected?link.route?.join(' → ')||'direct':'BLACKOUT: '+link.reason)+' · one-way light delay '+format(link.delayS||0,4)+' s',
  'COMMAND '+(active?.op||'IDLE')+' '+(info?.ok?' · waypoint '+format(info.distanceM,0)+' m / ETA '+format(info.etaS,0)+' s':'')+' · '+r.index+'/'+r.commands.length,
  'RADIO '+(comm?.packets?.filter(x=>x.state!=='ACKED').length||0)+' unacknowledged packets',
  'SCIENCE '+(r.ground7d?.queuedObservations?.length||0)+' onboard readings · '+(root.StarfallImagingUI7F?.store?.photos.filter(x=>x.sourceAssetId===r.id&&x.status!=='downlinked').length||0)+' onboard images',
  'THERMAL '+format(r.ground7d?.temperatureK||290,1)+' K · battery services available only at powered 48V battery sockets',
  'FAULT '+(hw.fault||'NONE'),'HISTORY '+(hw.faults.slice(-3).map(x=>x.reason).join(' / ')||'None'),
  'CAPSULE '+(hw.landing?.reason||'LEGACY DEPLOYED')].join('\n');
}
function launch(){const ctx=RT.outpostContext();if(!ctx.landed||!ctx.body?.landable)throw Error('Land on a solid world to launch');const pad=root.StarfallOutpostUI?.store?.items.find(x=>x.id===$('launch-pad').value);if(!pad)throw Error('Build/select a FOUNDATION in Outposts first');
 const chosen=chosenDesign(),dst=RT.galaxy.byId.get($('launch-destination').value),sys=RT.galaxy.byId.get($('launch-system').value);
 const site=chosen.payload==='rover'?landingPreview():null;
 if(chosen.payload==='rover'&&!site)throw Error('Resolve the destination touchdown site before ignition');
 const m=store.launch({body:ctx.body,foundation:pad,design:chosen,time:RT.time,
  destinationBody:chosen.payload==='rover'?dst:null,destinationSystem:chosen.payload==='rover'?sys:null,
  landingLocal:chosen.payload==='rover'?site.site.local:null,unit:P.SCENE_METERS_PER_UNIT,
  padContext:{outposts:root.StarfallOutpostUI?.store,powerReport:root.StarfallOutpostUI?.powerReports.get(ctx.bodyId),
   heightAt:v=>Starfall3D.groundHeight(v,ctx.body)}});persist();return m;}
function worldPosition(body,local,extra){const u=V.norm(V.rot(local,body.spinAxis||[0,1,0],body.spinAngle||0));return{up:u,position:V.add(body.position,V.mul(u,body.radius+(Starfall3D.groundHeight(local,body)||0)+extra))};}
function sceneRockets(){return store.launches.filter(x=>['ascent','coast'].includes(x.phase)&&x.flight).slice(-3).flatMap(m=>{const body=RT.galaxy.byId.get(m.bodyId);if(!body)return[];
 const d=worldPosition(body,m.local,0),u=m.launchUp||d.up,pole=Math.abs(u[1])>.95?[1,0,0]:[0,1,0],tang=V.norm(V.cross(u,pole)),f=m.flight,r=Math.hypot(f.x,f.y);
 const world=V.add(body.position,V.mul(V.add(V.mul(u,f.x),V.mul(tang,f.y)),1/P.SCENE_METERS_PER_UNIT));
 const direction=V.norm(V.add(V.mul(u,f.vx),V.mul(tang,f.vy)));
 return[{position:world,up:V.len(direction)>.1?direction:V.norm(V.add(V.mul(u,f.x/r),V.mul(tang,f.y/r))),stage:f.stageIndex+1}];});}
function sceneSatellites(){return store.satellites.slice(-48).flatMap(s=>{const b=RT.galaxy.byId.get(s.bodyId);if(!b)return[];try{const q=E?E.satellitePosition(s,b,RT.time,P.SCENE_METERS_PER_UNIT):X.orbit(s,b,RT.time,P.SCENE_METERS_PER_UNIT);return[{position:q.position,up:s.axis}];}catch(_){return[];}});}
function sceneRovers(){const body=RT.nearest;if(!RT.landed||!body)return[];return store.rovers.filter(r=>r.bodyId===body.id&&(!r.roverT06||['READY','TRAVERSING','SCIENCE','SAFE_STOP','RECOVERY'].includes(r.roverT06.state))).slice(-15).map(r=>{const d=worldPosition(body,r.local,1.8),up=d.up,side=V.norm(V.cross(up,[1,0,0])),front=V.norm(V.cross(side,up));return{position:d.position,up,forward:front};});}
function activeMission(){return store.launches.find(m=>m.id===$('launch-7b-active').value);}
function refreshFlightPanel(){const pick=$('launch-7b-active'),previous=pick.value;
 const live=store.launches.slice().reverse().filter(m=>['ascent','coast'].includes(m.phase)&&m.flight);
 pick.replaceChildren();for(const m of live){const op=document.createElement('option');op.value=m.id;op.textContent=m.id+' · '+m.phase.toUpperCase();pick.append(op);}
 if(live.some(m=>m.id===previous))pick.value=previous;const m=activeMission();if(!m){$('launch-7b-telemetry').textContent='No rocket in powered/coasting flight. Launch one from a FOUNDATION.';return;}
 const f=m.flight,orb=root.StarfallRocketFlight7B.elements(f,m.profile.mu,m.profile.radiusM);
 if(!orb)return;
 $('launch-7b-live-mode').value=f.mode;
 const clean=x=>Number.isFinite(x)?x.toFixed(1):'ESCAPE';
 $('launch-7b-telemetry').textContent='PHASE '+f.phase.toUpperCase()+' · stage '+(f.stageIndex+1)+'/'+m.profile.stages+' · '+f.mode.toUpperCase()+'\n'+
  'ALTITUDE '+clean(orb.altitudeM/1000)+' km  SPEED '+clean(orb.speedMS/1000)+' km/s  VERTICAL '+clean(orb.radialMS)+' m/s\n'+
  'APOAPSIS '+clean(orb.apoapsisM/1000)+' km  PERIAPSIS '+clean(orb.periapsisM/1000)+' km  ECC '+clean(orb.eccentricity)+'\n'+
  'THROTTLE '+Math.round(f.throttle*100)+'% · PITCH '+clean(f.pitchDeg)+'° · PROPELLANT '+clean(f.stageFuelKg[f.stageIndex]/1000)+' t · BOOSTER '+clean(f.boosterFuelKg/1000)+' t\n'+
  'MASS '+clean(root.StarfallRocketFlight7B.totalMass(f,m.profile)/1000)+' t  MAX Q '+clean(f.maxDynamicPressurePa/1000)+' kPa · SIMULATED '+clean(f.integratedS)+' s\n'+
  'Staging history '+f.discards.length+' discarded stages · Ongoing ascent cannot be skipped or guaranteed.';
}
function flightAction(op,value){try{const m=activeMission();if(!m)throw Error('Select an active launch first');store.control(m.id,op,value);persist();refreshFlightPanel();status('Flight control '+op+' accepted for '+m.id);}catch(err){status(err.message,true);}}
function tick(dt,scale){const now=RT.time,events=store.update(now,id=>RT.galaxy.byId.get(id)||root.StarfallMissionOperationsUI?.resolveBody(id,now));if(!root.StarfallMissionOperationsUI)store.tickRovers(now,id=>RT.galaxy.byId.get(id),root.StarfallFieldScience,{enabled:true,link:remoteLink,height:groundHeight7d,unitScale:P.SCENE_METERS_PER_UNIT,onReceive:receiveRover});if(events.length){for(const e of events){if(e.kind!=='deployed')continue;if(registry?.enabled)registry.event('ASSET_DEPLOYED',store.launches.find(x=>x.id===e.id)?.id||e.id,now,{missionId:e.id});const m=store.launches.find(x=>x.id===e.id),sat=store.satellites.find(x=>x.launchId===e.id);if(!m||!sat||sat.kind!=='relay')continue;
  const os=root.StarfallOutpostUI?.store;
  if(os&&!os.relays.some(x=>x.id===sat.id)){const body=RT.galaxy.byId.get(sat.bodyId);if(body){const period=X.orbit(sat,body,RT.time,P.SCENE_METERS_PER_UNIT).periodS;os.relays.push({id:sat.id,bodyId:sat.bodyId,altitude:sat.altitudeM/P.SCENE_METERS_PER_UNIT,phase:0,periodS:period,axis:sat.axis,rangeScene:180000,bandwidthBps:1000000,enabled:true});root.StarfallOutpostUI.persist();}}
 }status(events.map(e=>e.message).join(' · '));persist();}
 root.StarfallSatelliteOpsUI?.tick(now);if(performance.now()-lastRefresh>1000){lastRefresh=performance.now();if(registry&&performance.now()-lastAssetSave>8000){lastAssetSave=performance.now();refreshRegistry(true);}if(!$('launch-dialog').hidden)refresh();if(store.launches.some(x=>['ascent','coast','transfer'].includes(x.phase))||store.rovers.some(x=>x.status==='running'||x.ground7d?.pending?.length||x.ground7d?.queuedObservations?.length))persist();}}
$('launch-t11-commission').onclick=()=>configurePadT11('commissioned');
$('launch-t11-legacy').onclick=()=>configurePadT11('legacy');
$('launch-open').addEventListener('click',open);$('launch-close').addEventListener('click',close);$('launch-dialog').addEventListener('click',ev=>{if(ev.target===$('launch-dialog'))close();});
$('launch-system').onchange=()=>{refreshDestinations();preflight();};$('launch-system-search').addEventListener('input',systemOptions);
for(const id of ['launch-payload','launch-engine','launch-tanks','launch-stages','launch-boosters','launch-pad','launch-7b-tank2','launch-7b-engine2','launch-7b-tank3','launch-7b-engine3','launch-7b-build-mode','launch-7b-target'])$(id).addEventListener('change',preflight);
$('launch-7b-active').onchange=refreshFlightPanel;
$('launch-7b-apply').onclick=()=>{try{const m=activeMission();if(!m)throw Error('No active rocket');store.control(m.id,'mode',$('launch-7b-live-mode').value);if(m.flight.mode==='manual'){store.control(m.id,'pitch',Number($('launch-7b-pitch').value));store.control(m.id,'throttle',Number($('launch-7b-throttle').value)/100);}persist();refreshFlightPanel();status('Flight controls applied');}catch(e){status(e.message,true);}};
$('launch-7b-ignite').onclick=()=>flightAction('ignite');$('launch-7b-cutoff').onclick=()=>flightAction('cutoff');$('launch-7b-separate').onclick=()=>flightAction('stage');$('launch-7b-abort').onclick=()=>flightAction('abort');
$('launch-7a-open-assets').onclick=()=>{close();root.StarfallAssetUI7A1?.select($('launch-7a-asset').value,true)||root.StarfallAssetUI7A1?.open();};$('launch-refresh').onclick=refresh;$('launch-7a-asset').onchange=showAsset;$('launch-7a-shared').onchange=()=>{if(registry){registry.enabled=$('launch-7a-shared').checked;refreshRegistry(true);status(registry.enabled?'Shared engineering/charging ON':'Classic compatibility mode ON');refresh();}};$('launch-probe').onchange=()=>{refreshProbe();refreshRoverService();};
$('launch-rover-preview').onclick=landingPreview;
$('launch-ignite').onclick=()=>{try{const m=launch();status('IGNITION '+m.id+' / '+m.payload.toUpperCase()+' · '+format(m.profile.deltaVMS/1000,2)+' km/s ideal design estimate; physical trajectory underway');refresh();}catch(e){status(e.message,true);}};
$('launch-run').onclick=()=>{try{const id=$('launch-probe').value,r=store.rovers.find(x=>x.id===id),q=root.StarfallCommsT03?root.StarfallCommsT03.command(r,$('launch-script').value,RT.time):store.queueProgram(id,$('launch-script').value,RT.time,remoteLink(r));persist();status('Program '+q.status+' · '+q.commands.length+' commands · '+id);refreshProbe();}catch(e){status(e.message,true);}};
$('launch-rover-go-home').onclick=()=>{try{
 const id=$('launch-probe').value,r=store.rovers.find(x=>x.id===id);
 const q=root.StarfallCommsT03?root.StarfallCommsT03.command(r,'RETURN',RT.time):store.queueProgram(id,'RETURN',RT.time,remoteLink(r));
 persist();status('RETURN '+q.status+' · via physical radio');refreshProbe();
 }catch(e){status(e.message,true);}};
$('launch-rover-status-ping').onclick=()=>{try{
 const id=$('launch-probe').value,r=store.rovers.find(x=>x.id===id);
 const q=root.StarfallCommsT03?root.StarfallCommsT03.command(r,'STATUS',RT.time):store.queueProgram(id,'STATUS',RT.time,remoteLink(r));
 persist();status('STATUS '+q.status+' · no instant remote telemetry');refreshProbe();
 }catch(e){status(e.message,true);}};
$('launch-rover-service').onclick=()=>{try{
 const id=$('launch-probe').value,r=store.rovers.find(x=>x.id===id),site=root.StarfallOutpostUI,
  battery=site?.store.items.find(x=>x.id===$('launch-rover-service-source').value),
  body=RT.nearest;
 if(!r||!RT.landed||!body||r.bodyId!==body.id)throw Error('Travel/land on the rover world to perform physical service.');
  if(!RT.fieldServiceStatus(r).nearby)throw Error('T12: park the support truck, exit with X and stand within 18 scene units of deployed rover.');
 const receipt=root.StarfallRoverT06.service(r,battery,body,site,RT.time,P.SCENE_METERS_PER_UNIT);
 persist();site.persist();status('Service completed: '+format(receipt.deliveredJ/3600,1)+' Wh credited · '+format(receipt.lossJ/3600,1)+' Wh loss');refresh();
 }catch(e){status(e.message,true);}};
$('launch-t12-target').onchange=refreshT12;
$('launch-t12-slot').onchange=refreshT12;
$('launch-t12-inspect').onclick=refreshT12;
$('launch-t12-repair').onclick=()=>{try{
 const r=chosenFieldRover(),result=RT.fieldRepair($('launch-t12-slot').value,r);
 if(r)persist();
 status('T12 '+result.record.assetId+' / '+result.record.slot+' repaired with installed '+result.record.installedId+
  ' · '+format(result.record.energyJ/1000,0)+' kJ tools · '+result.record.durationS+' s service lockout');
 refresh();
 }catch(e){status(e.message,true);refreshT12();}};
$('launch-t12-charge-local').onclick=()=>{try{
 const x=RT.roverRechargeLocal($('launch-charge-source').value);
 status('T12 local six-wheel rover charged '+format(x.deliveredJ/3600,1)+' Wh from '+x.sourceId+
  ' · cable '+format(x.cableLengthScene,1)+' units · '+format(x.lossJ/1000,1)+' kJ loss');
 refresh();
 }catch(e){status(e.message,true);refreshT12();}};
$('launch-winch').onclick=()=>{try{const r=RT.truckWinch();status('Recovery started · '+format(r.distanceAfter,1)+' scene units to target · budget '+format(r.workJ/1000,1)+' kJ; use CANCEL to stop safely');refresh();}catch(e){status(e.message,true);}};
$('launch-7d-winch-cancel').onclick=()=>{try{status(RT.truckWinchCancel()?'Recovery cancelled. Energy already used is not restored.':'No active recovery');refresh();}catch(e){status(e.message,true);}};
$('launch-recharge').onclick=()=>{try{const j=RT.truckRecharge($('launch-charge-source').value);status('Wired charge '+format(j.deliveredJ/3.6e6,3)+' kWh · source draw '+format(j.drawnJ/3.6e6,3)+' kWh · truck '+format(j.batteryJ/3.6e6,2)+' kWh');refresh();}catch(e){status(e.message,true);}};
$('launch-emergency').onclick=()=>{try{const id=$('launch-probe').value,r=store.rovers.find(x=>x.id===id),q=root.StarfallCommsT03?root.StarfallCommsT03.command(r,'STOP',RT.time,true):store.queueStop(id,RT.time,remoteLink(r));persist();status('STOP '+q.status+' · rover cannot receive commands through radio blackout');refreshProbe();}catch(e){status(e.message,true);}};
$('launch-export').onclick=()=>{const b=new Blob([JSON.stringify(store.serialize(),null,2)],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='starfall-launch-telemetry.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
refreshRegistry(true);
addEventListener('pagehide',()=>refreshRegistry(true));
root.StarfallLaunchUI={store,open,close,tick,refresh,persist,sceneRockets,sceneSatellites,sceneRovers,remoteLink};
})(window);
