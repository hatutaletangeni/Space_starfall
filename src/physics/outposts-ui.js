/* STARFALL Update 5 control surface: bounded free-form construction, real solar/DC bus,
   modeled relay line-of-sight and a scientific laboratory with explicit data receipts. */
(function(root){'use strict';
const $=id=>document.getElementById(id),O=root.StarfallOutposts,RT=root.StarfallRuntime,P=root.StarfallPhysics;
if(!O||!RT)return;
const saved=SF.load().outpost5,store=new O.Store(RT.galaxy.seed,saved),c=O.V;
let lastPanel=0,dirty=false,lastFlush=performance.now(),powerReports=new Map(),queue=Array.isArray(saved?.pending)?saved.pending.filter(x=>x&&x.obs&&x.labId&&Number.isFinite(x.deliverAt)).slice(0,120):[];
let tab='build',statusMsg='',previewError='',lastPowerTick=RT.time,receiverResult=null,radioEnforced=!!saved?.radioEnforced,lastPlacement=null;
const lastPoweredAt=(saved?.lastPoweredAt&&typeof saved.lastPoweredAt==='object')?{...saved.lastPoweredAt}:{};
const fmt=(v,p=1)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:p}):'—';
function show(msg,bad=false){statusMsg=msg;const el=$('outpost-status');el.textContent=msg;el.style.color=bad?'#ffad97':'#eac18e';}
function persist(){SF.save({outpost5:{...store.serialize(),pending:queue.slice(0,120),lastPoweredAt,radioEnforced}});dirty=false;lastFlush=performance.now();}
function renderLoc(item){const b=RT.galaxy.byId.get(item.bodyId);if(!b)return null;const radial=O.rotate(item.local,b.spinAxis||[0,1,0],b.spinAngle||0);const sceneHeight=Starfall3D.groundHeight(item.local,b);const position=c.add(b.position,c.mul(radial,b.radius+sceneHeight+.6));
 const f=O.rotate(item.facing,b.spinAxis||[0,1,0],b.spinAngle||0);return{kind:item.kind,position,up:radial,forward:f};}
function placementKey(){const ctx=RT.outpostContext();return [ctx.bodyId,$('outpost-type').value,$('outpost-forward').value,$('outpost-right').value].join('|');}
function selection(){const ctx=RT.outpostContext(),kind=$('outpost-type').value,front=Number($('outpost-forward').value),right=Number($('outpost-right').value);
 if(!ctx.landed||!ctx.eva||!ctx.body?.landable)throw Error('Land and walk outside your ship to construct');if(!Number.isFinite(front)||!Number.isFinite(right)||Math.hypot(front,right)>150)throw Error('Placement limited to 150 scene units');
 const local=RT.outpostOffset(front,right),facing=O.rotate(ctx.forward,ctx.body.spinAxis||[0,1,0],-(ctx.body.spinAngle||0));const area=[];
 if(ctx.shipLocal)area.push({local:ctx.shipLocal,radius:37});if(ctx.roverLocal)area.push({local:ctx.roverLocal,radius:12});
 // Preserve newly generated archaeological footprints, without changing old saves.
 const archae=root.StarfallRuinsUI;if(archae){for(const site of archae.visibleSites){if(site.bodyId===ctx.body.id&&O.arc(local,site.local,ctx.body.radius)<100)area.push({local:site.local,radius:root.StarfallArchaeology.TIERS[site.tier].radius});}}
 const check=O.placement({kind,body:ctx.body,local,heightAt:d=>Starfall3D.groundHeight(d,ctx.body),structures:store.items,protectedAreas:area});return{kind,ctx,local,facing,check,area};}
function preview(){try{const p=lastPlacement?.key===placementKey()?lastPlacement:selection();previewError='';return renderLoc({kind:p.kind,local:p.local,bodyId:p.ctx.body.id,facing:p.facing});}catch(e){previewError=e.message;return null;}}
function scene(){const ctx=RT.outpostContext();if(!ctx.body||!ctx.local)return[];const list=store.surfaceItems(ctx.body.id,ctx.local,ctx.body.radius,65);const result=list.map(renderLoc).filter(Boolean);
 const physical=RT.physical8a?.list?.()||[];
 let drawn=0;
 for(const asset of physical){
  if(drawn>=30)break;
  if(!['industrial_plant','industrial_vessel'].includes(asset.type)||asset.location?.kind!=='surface'||
    asset.location.bodyId!==ctx.body.id||O.arc(ctx.local,asset.location.local,ctx.body.radius)>90)continue;
  const item=renderLoc({kind:asset.type,bodyId:asset.location.bodyId,local:asset.location.local,facing:[0,0,1]});
  if(item){result.push(item);drawn++;}
 }
 if(!$('outpost').hidden&&tab==='build'){const item=preview();if(item){item.preview=true;result.push(item);}}return result;}
function groupFor(id,bodyId){return store.connectedGroups(bodyId).find(g=>g.some(x=>x.id===id))||[];}
function powered(id,bodyId){const rep=powerReports.get(bodyId);return rep?.byId[id]?.power===true;}
function powerTick(dt,atTime=RT.time,resolveRemote=null){const byBody=new Set(store.items.map(x=>x.bodyId));for(const bodyId of byBody){const oldSite=store.items.find(x=>x.bodyId===bodyId)?.bodySnapshot;const body=(resolveRemote?resolveRemote({bodyId,bodySnapshot:oldSite},atTime):null)||RT.galaxy.byId.get(bodyId);if(!body||!body.radius)continue;const sys=RT.galaxy.byId.get(body.systemId),star=sys?.star;if(!star)continue;const luminosity=P.starProfile(star).luminosityW;const occluders=(sys.bodies||[]).filter(x=>x.id!==bodyId&&x.radius>0).map(x=>({position:x.position,radius:x.radius}));
  // Rehydrate distant sites by analytic elapsed time. Sample changing rotation at up to
  // 12 points, cap an individual catch-up to one simulated day to avoid long stalls.
  if(Number.isFinite(lastPoweredAt[bodyId])&&lastPoweredAt[bodyId]>atTime+1e-8)continue;const start=Number.isFinite(lastPoweredAt[bodyId])?lastPoweredAt[bodyId]:atTime;
  const total=Math.max(0,Math.min(86400,atTime-start)),steps=total>0?Math.min(12,Math.max(1,Math.ceil(total/600))):1;
  let report=null;for(let i=0;i<steps;i++){
    const past=(i+.5)*total/steps-total;
    const offsetSpin=2*Math.PI*past/Math.max(1,body.spinPeriod);
    const virtualBody={...body,spinAngle:(body.spinAngle||0)+offsetSpin};
    report=store.power(virtualBody,star.position,luminosity,atTime+past,total/steps,P.SCENE_METERS_PER_UNIT,occluders,(local,t)=>root.StarfallEvents?.skyTransmission(body,local,t,RT.galaxy.seed)??1);
    if(root.StarfallHabitatT09){
      const to=start+(i+1)*total/steps;
      for(const item of store.items.filter(x=>x.kind==='hab'&&x.bodyId===bodyId)){
        const supplied=report?.byId?.[item.id]?.power===true;
        root.StarfallHabitatT09.step(item,virtualBody,to,supplied);
        if(atTime-start>86400+1e-8)item.habT09.awaitingReview=true;
      }
    }
  }
  lastPoweredAt[bodyId]=atTime;powerReports.set(bodyId,report);
}}
function linkFor(lab){const body=RT.galaxy.byId.get(lab.bodyId),ctx=RT.outpostContext();if(!body||ctx.body?.id!==lab.bodyId||!ctx.landed)return{connected:false,reason:'Not on laboratory body'};
 const receiver=renderLoc(lab);if(!receiver)return{connected:false,reason:'Lab not rendered'};
 const origin=c.add(ctx.position,c.mul(ctx.up,3)),destination=c.add(receiver.position,c.mul(receiver.up,4)),occluders=[{position:body.position,radius:body.radius}];
 const direct=O.radioLink(origin,destination,occluders,1700,P.SCENE_METERS_PER_UNIT);if(direct.connected)return{...direct,via:'Local field radio'};
 const antennas=groupFor(lab.id,lab.bodyId).filter(x=>x.kind==='antenna'&&powered(x.id,x.bodyId));if(!antennas.length)return{connected:false,reason:'No powered antenna or local link'};
 const relays=store.relays.filter(r=>r.bodyId===body.id&&r.enabled);for(const relay of relays){const sat=root.StarfallLaunchUI?.store?.satellites.find(v=>v.id===relay.id);if(sat&&root.StarfallSatelliteOps7C&&!root.StarfallSatelliteOps7C.relayOperational(sat))continue;const rp=O.relayPosition(relay,body,RT.time),one=O.radioLink(origin,rp,occluders,relay.rangeScene,P.SCENE_METERS_PER_UNIT),two=O.radioLink(rp,destination,occluders,relay.rangeScene,P.SCENE_METERS_PER_UNIT);
  if(one.connected&&two.connected)return{connected:true,via:relay.id,reason:'Relay link active',delayS:one.delayS+two.delayS,quality:Math.min(one.quality,two.quality)};
 }return{connected:false,reason:'No direct or relayed line of sight'};}

function canCommandRover(){if(!radioEnforced)return{connected:true,reason:'Legacy rover radio assistance active'};
 const rover=RT.roverAutonomyPosition(),ctx=RT.outpostContext(),body=ctx.body;
 if(!rover||!ctx.landed||rover.bodyId!==body?.id)return{connected:false,reason:'Rover outside current planetary control area'};
 const state=RT.vehicleStore.get('rover').state;
 if(state.powerEnabled&&state.energyJ<=0)return{connected:false,reason:'Rover electrical supply exhausted'};
 const dist=O.arc(rover.local,ctx.local,body.radius);if(dist<120)return{connected:true,reason:'Direct short-range rover radio'};
 const up=O.rotate(rover.local,body.spinAxis||[0,1,0],body.spinAngle||0),goal=c.add(body.position,c.mul(up,body.radius+Starfall3D.groundHeight(rover.local,body)+4)),start=c.add(ctx.position,c.mul(ctx.up,3)),occluder=[{position:body.position,radius:body.radius}];
 const towers=store.items.filter(i=>i.kind==='antenna'&&i.bodyId===body.id&&powered(i.id,i.bodyId));
 for(const tower of towers){const site=renderLoc(tower);if(!site)continue;const middle=c.add(site.position,c.mul(site.up,8));const first=O.radioLink(start,middle,occluder,2000,P.SCENE_METERS_PER_UNIT),second=O.radioLink(middle,goal,occluder,2000,P.SCENE_METERS_PER_UNIT);
 if(first.connected&&second.connected)return{connected:true,reason:'Powered surface radio relay',delayS:first.delayS+second.delayS};}
 for(const relay of store.relays.filter(r=>r.bodyId===body.id&&r.enabled)){const sat=root.StarfallLaunchUI?.store?.satellites.find(v=>v.id===relay.id);if(sat&&root.StarfallSatelliteOps7C&&!root.StarfallSatelliteOps7C.relayOperational(sat))continue;const rp=O.relayPosition(relay,body,RT.time),a=O.radioLink(start,rp,occluder,relay.rangeScene,P.SCENE_METERS_PER_UNIT),b=O.radioLink(rp,goal,occluder,relay.rangeScene,P.SCENE_METERS_PER_UNIT);if(a.connected&&b.connected)return{connected:true,reason:'Orbital satellite relay',delayS:a.delayS+b.delayS};}
 return{connected:false,reason:'No powered tower or satellite line-of-sight'};
}
function sendData(){const id=$('outpost-lab').value,lab=store.items.find(x=>x.id===id&&x.kind==='lab');if(!lab)throw Error('Choose a laboratory');
 if(!powered(lab.id,lab.bodyId))throw Error('Lab has no electrical power: connect a battery or solar array');const link=linkFor(lab);if(!link.connected)throw Error('Radio unavailable: '+link.reason);
 const journal=root.StarfallScienceUI?.journal||[],recs=journal.filter(x=>x.bodyId===lab.bodyId&&!store.receipts.some(r=>r.labId===lab.id&&r.observationId===x.id)&&!queue.some(q=>q.labId===lab.id&&q.obs.id===x.id));
 if(!recs.length)throw Error('No new measurements from this body; collect field data first');for(const obs of recs.slice(0,20)){if(queue.length>=120)break;queue.push({labId:lab.id,obs:O.copy(obs),deliverAt:RT.time+Math.max(.05,link.delayS)});}dirty=true;persist();show('Queued '+Math.min(recs.length,20)+' observation(s) · '+link.via+' · '+fmt(link.delayS,5)+' s one-way');}
function radioTargets(body){
 const options=[];if(!body)return options;
 const ship=RT.engineeringAssetPoses()?.shipPose;
 if(RT.outpostContext()?.landed&&ship?.bodyId===body.id)options.push({id:'starfall-ship',label:'Landed ship radio'});
 for(const rover of root.StarfallLaunchUI?.store?.rovers||[])if(rover.bodyId===body.id)options.push({id:rover.id,label:'Deployed rover '+rover.id.slice(-8)});
 for(const sat of root.StarfallLaunchUI?.store?.satellites||[])if(sat.bodyId===body.id)options.push({id:sat.id,label:'Orbital '+sat.id.slice(-8)});
 for(const item of store.items)if(item.bodyId===body.id&&item.kind==='antenna')options.push({id:item.id,label:'Surface antenna '+item.id.slice(-8)});
 return options;
}
function radioPosition(id,body){
 const V=O.V,spin=body.spinAngle||0,axis=body.spinAxis||[0,1,0],unit=root.StarfallPhysics.SCENE_METERS_PER_UNIT;
 const pose=id==='starfall-ship'?RT.engineeringAssetPoses()?.shipPose:null;
 const rover=root.StarfallLaunchUI?.store?.rovers.find(x=>x.id===id);
 const tower=store.items.find(x=>x.id===id&&x.bodyId===body.id);
 const sat=root.StarfallLaunchUI?.store?.satellites.find(x=>x.id===id);
 if(sat)return root.StarfallLaunch.orbit(sat,body,RT.time,unit).position;
 const local=pose?.local||rover?.local||tower?.local;
 if(!local)return null;
 return V.add(body.position,V.mul(O.rotate(local,axis,spin),body.radius+(tower?.height||5)+4));
}
function refreshRadioHardware(body){
 const hw=root.StarfallAntennaT04,picker=$('outpost-radio-device'),target=$('outpost-radio-target'),mode=$('outpost-radio-mode'),detail=$('outpost-radio-diagnostic');
 if(!hw){detail.textContent='T04 hardware adapter not loaded';return;}
 const prev=picker.value,items=store.items.filter(x=>x.kind==='antenna'&&x.bodyId===body?.id);
 picker.replaceChildren();for(const item of items){const opt=document.createElement('option');opt.value=item.id;opt.textContent=item.id;picker.append(opt);}
 if(items.some(x=>x.id===prev))picker.value=prev;
 const item=items.find(x=>x.id===picker.value);
 const oldTarget=target.value;target.replaceChildren();
 for(const row of radioTargets(body)){const op=document.createElement('option');op.value=row.id;op.textContent=row.label;target.append(op);}
 const cfg=item?hw.repair(item.radioT04):null;
 if([...target.options].some(x=>x.value===oldTarget))target.value=oldTarget;
 else if(cfg?.targetId&&[...target.options].some(x=>x.value===cfg.targetId))target.value=cfg.targetId;
 if(cfg)mode.value=cfg.mode;
 const packets=root.StarfallCommsT03?.transport?.packets||[];
 const report=item?hw.diagnostics(item,body,powerReports.get(body.id),packets,O.rotate,RT.time):null;
 detail.textContent=!report?'No placed surface antenna on this world.':[
  'T04 ANTENNA '+report.id+' / '+(report.powered?'ONLINE':'OFFLINE '+report.fault),
  'MODE '+report.mode.toUpperCase()+(report.targetId?' · target '+report.targetId:' · omnidirectional legacy default'),
  'POWER '+fmt(report.actualLoadW,1)+' W on bus '+(report.busId||'NO BUS')+' · '+fmt(report.voltageV,0)+' V · tracking motor '+fmt(report.trackingW,0)+' W',
  'TX '+report.txPowerW+' W / RX '+report.rxPowerW+' W · RATED '+report.bandwidthBps+' bit/s · range '+fmt(report.rangeScene,0)+' scene units',
  'HEALTH '+fmt(report.health*100,0)+'% · THERMAL '+fmt(report.temperatureK,1)+' K',
  'BUFFER '+fmt(report.bufferUsedBytes,0)+' / '+fmt(report.bufferCapacityBytes,0)+' bytes · '+report.packetsAwaitingACK+' packet(s) awaiting ACK',
  'CONTACT '+(report.lastContactS===null?'NONE':('T+'+fmt(report.lastContactS,1)+' s · '+report.lastPeerId)),
  'RECENT PACKETS '+(report.queuedPacketIds.slice(-4).join(', ')||'NONE')
 ].join('\\n');
 refreshDeepSpace(body,item);
}
function refreshDeepSpace(body,item){
 const T=root.StarfallDeepSpaceT08,box=$('outpost-t08-diagnostic'),mode=$('outpost-t08-mode'),
  peer=$('outpost-t08-peer');
 if(!T){box.textContent='T08 radio adapter not available';return;}
 const p=item?T.repair(item.radioT04?.deepT08):null,prior=peer.value;
 const remote=store.items.filter(x=>x.kind==='antenna'&&x.id!==item?.id&&x.bodyId!==item?.bodyId);
 peer.replaceChildren();
 for(const i of remote){const option=document.createElement('option');option.value=i.id;
  option.textContent=(i.bodySnapshot?.name||i.bodyId)+' / '+i.id;peer.append(option);}
 if(remote.some(x=>x.id===p?.peerId))peer.value=p.peerId;
 else if(remote.some(x=>x.id===prior))peer.value=prior;
 mode.value=p?.mode||'OFF';
 if(!item){box.textContent='No existing antenna selected. Build, wire and power one here, then another on the remote world.';return;}
 const d=T.inspected(item,powerReports.get(item.bodyId)),other=store.items.find(x=>x.id===d.peerId),
  far=other?T.inspected(other,powerReports.get(other.bodyId)):null;
 const packets=root.StarfallCommsT03?.transport?.list()||[];
 const relevant=packets.filter(x=>x.route?.includes(item.id)).slice(-6);
 box.textContent=[
 'T08 REAL INSTALLED HARDWARE '+item.id,
 'STATE '+d.mode+' · '+(d.powered?'POWERED':'OFFLINE: '+d.reason)+' · '+d.ratedPowerW+' W extra real 48V load',
 'TARGET '+(d.peerId||'NOT CONFIGURED')+' · '+(other?'REAL ANTENNA ON '+other.bodyId:'NO SAVED REMOTE STATION'),
 'PEER '+(far?.mode||'MISSING')+' / '+(far?.powered?'POWERED':'OFFLINE '+(far?.reason||'NO PEER')),
 'PHY RATE '+d.bandwidthBps+' bit/s nameplate · '+d.rangeScene+' scene-unit rated RF range',
 'IN-FLIGHT '+relevant.map(p=>p.id+' '+p.state+' '+p.sendBytes+'/'+p.encodedBytes+' bytes'+(p.lastLink?' · '+p.lastLink.delayS.toFixed(2)+' s delay':'')).join(' | '),
 'ROUTING: local ship/rover ↔ local antenna ↔ both powered deep dishes ↔ remote antenna ↔ remote rover',
 d.mode==='FICTIONAL'?'FICTIONAL MODE explicitly chosen: 120s minimum modeled carrier wait, not real light-speed interstellar travel':
  'Real radio c latency. Other stars are physically very distant; no fast interstellar RF link.',
 !remote.length?'NO OTHER COMMISSIONABLE STATION: travel and build/wire one, or deploy a real powered base kit.':''
 ].join('\\n');
}
function selectedRadio(){const i=store.items.find(x=>x.id===$('outpost-radio-device').value);if(i?.kind!=='antenna')throw Error('Select an existing surface antenna');return i;}
function selectedHabitat(){
 const item=store.items.find(x=>x.id===$('hab-t09-select').value&&x.kind==='hab');
 if(!item)throw Error('Select a real, built habitat on this world');return item;
}
function habitatNear(item){
 const ctx=RT.outpostContext();
 return !!(ctx.landed&&ctx.eva&&ctx.bodyId===item.bodyId&&Array.isArray(ctx.local)
  &&O.arc(ctx.local,item.local,ctx.body.radius)<=24);
}
function habitatControl(action,opts={}){
 const item=selectedHabitat(),H=root.StarfallHabitatT09;
 const body=RT.galaxy.byId.get(item.bodyId)||item.bodySnapshot;
 advancePowerTo(RT.time,(asset,t)=>root.StarfallMissionOperationsUI?.resolveBody?.(asset,t)||RT.galaxy.byId.get(asset.bodyId));
 const powered=powerReports.get(item.bodyId)?.byId[item.id]?.power===true;
 const result=H.command(item,action,{...opts,near:habitatNear(item),powered,now:RT.time,body});
 dirty=true;persist();show('T09 '+item.id+' · '+result.state+' · '+result.pressureKPa.toFixed(2)+' kPa');
 return result;
}
function refreshHabitat(bodyId){
 const H=root.StarfallHabitatT09,select=$('hab-t09-select'),box=$('hab-t09-diagnostic');
 const items=store.items.filter(x=>x.kind==='hab'&&x.bodyId===bodyId),old=select.value;
 select.replaceChildren();for(const i of items){const option=document.createElement('option');option.value=i.id;
  option.textContent='HAB '+i.id.slice(-9);select.append(option);}
 if(items.some(i=>i.id===old))select.value=old;
 const item=items.find(i=>i.id===select.value);
 const roverSelect=$('hab-t09-rover'),prevRover=roverSelect.value;roverSelect.replaceChildren();
 const rovers=(root.StarfallLaunchUI?.store?.rovers||[]).filter(x=>x.bodyId===bodyId&&Array.isArray(x.local));
 for(const r of rovers){const option=document.createElement('option');option.value=r.id;option.textContent=r.id;roverSelect.append(option);}
 if(rovers.some(r=>r.id===prevRover))roverSelect.value=prevRover;
 if(!H||!item){box.textContent='No habitat here. Build one, wire its original 680 W grid to solar/battery, then inspect its air system.';return;}
 const body=RT.galaxy.byId.get(item.bodyId)||item.bodySnapshot,report=powerReports.get(item.bodyId),
  h=H.inspect(item,body,report?.byId?.[item.id]?.power===true);
 $('hab-t09-occupancy').value=String(h.occupants);
 box.textContent=[
 'HABITAT T09 '+h.id+' · '+h.state+' · '+(habitatNear(item)?'EXPLICIT FIELD CONTROLS IN RANGE':'REMOTE MONITOR ONLY'),
 '48V DC BUS '+(h.powered?'SERVING 680 W':'UNPOWERED')+' · LIFE SUPPORT '+(h.enabled?'ENABLED':'STANDBY')+' · RECHARGE PORT '+(h.serviceReady?'READY':'INACTIVE'),
 'PRESSURE '+fmt(h.pressureKPa,3)+' kPa (70–120 recommended) · EXTERIOR '+fmt(h.ambientPressureKPa,2)+' kPa / '+h.exteriorAssumption,
 'OXYGEN '+fmt(h.oxygenKPa,3)+' kPa · CARBON DIOXIDE '+fmt(h.carbonKPa,4)+' kPa · IDEAL GAS WELL MIXED '+fmt(h.volumeM3,0)+' m³',
 'TEMPERATURE '+fmt(h.temperatureK,2)+' K · HVAC CONTROL '+fmt(h.thermalLoadW,0)+' W (part of real served 680 W) · LOSS '+fmt(h.heatLossW,0)+' W',
 'SEAL '+fmt(100*h.seal,2)+' % · AIRLOCK '+h.airlock+(h.airlockUntilS?' finishes at T+'+fmt(h.airlockUntilS,0)+' s':'')+' · OCCUPANTS '+h.occupants,
 'O₂ CYLINDER '+fmt(h.oxygenTankMol,2)+' mol · INERT CYLINDER '+fmt(h.inertTankMol,2)+' mol · FILTER CAPACITY '+fmt(h.scrubberCapacityMol,2)+' mol · WATER '+fmt(h.waterL,2)+' L',
 'BACKUP '+fmt(h.backupReserveJ,0)+' J (no hidden backup installed) · SERVICE '+(h.serviceReady?'physical cable+rover position still required':'disabled'),
 'ALARMS '+(h.alarms.join(' | ')||'NONE')+' · '+(h.fault||'NO ACTIVE HARDWARE FAULT'),
 'LAST SIMULATED T+'+fmt(h.lastS,1)+' s; optional service, NOT PLAYER SURVIVAL / NO PLAYER TELEPORT'
 ].join('\\n');
}
function refreshScienceT10(){
 const C=root.StarfallScienceCustodyT10;
 if(!C)return;
 const body=RT.outpostContext()?.body,lab=store.items.find(x=>x.id===$('outpost-lab').value&&x.kind==='lab');
 const pick=$('t10-sample-storage'),prev=pick.value;
 pick.replaceChildren();
 for(const item of store.items.filter(x=>x.kind==='storage'&&x.bodyId===body?.id)){
  const option=document.createElement('option');option.value=item.id;option.textContent=item.id;pick.append(option);
 }
 if([...pick.options].some(x=>x.value===prev))pick.value=prev;
 const observation=$('t10-lab-observation'),old=observation.value;
 observation.replaceChildren();
 const evidence=(root.StarfallScienceUI?.journal||[]).filter(x=>x?.id&&lab&&(x.bodyId===lab.bodyId||Number.isFinite(x.receivedAtS))).slice(-100);
 for(const row of evidence){const option=document.createElement('option');option.value=row.id;
  option.textContent=row.instrument+' · '+row.id.slice(-35);observation.append(option);}
 if([...observation.options].some(x=>x.value===old))observation.value=old;
 const storage=store.items.find(x=>x.id===pick.value),cap=storage?C.capacity(storage):null;
 const records=lab?.t10?.analysis||[];
 const photos=root.StarfallImagingUI7F?.store?.photos?.filter(p=>p.status==='downlinked')||[];
 const packets=root.StarfallCommsT03?.transport?.list()?.filter(p=>p.destId==='starfall-ship'||p.destId===lab?.id).slice(-8)||[];
 $('t10-lab-readout').textContent=[
  'LAB '+(lab?.id||'NONE')+' · electric '+(lab&&powered(lab.id,lab.bodyId)?'POWERED':'OFFLINE')+' · '+(lab?.t10?.mode||'STANDBY'),
  'NUMERIC ORIGINAL JOURNAL '+evidence.length+' received observation(s) · latest '+(evidence.at(-1)?.id||'NONE'),
  'LAB PROCESSING '+records.slice(-5).map(x=>x.observationId+' '+x.status+' · '+x.result).join(' | '),
  'STORAGE '+(storage?.id||'NONE')+' · '+(cap?cap.count+'/'+cap.maxCount+' samples, '+fmt(cap.massKg,2)+'/'+cap.maxMassKg+' kg':'NO MODULE'),
  'SAMPLES '+(storage?.t10?.samples||[]).slice(-5).map(x=>x.id+' '+x.type+' '+fmt(x.massKg,2)+' kg / '+x.sourceId).join(' | '),
  'PHOTO IDs ACKED '+photos.slice(-5).map(x=>x.id).join(' | '),
  'T03 PACKETS '+packets.map(x=>x.id+' '+x.state+' '+x.sendBytes+'/'+x.encodedBytes+' B').join(' | '),
  'RECEIPTS '+store.receipts.length+' total; physical transfer requires on-world EVA within 18 units.'
 ].join('\\n');
}
function refresh(){$('outpost-enforce-radio').checked=radioEnforced;const ctx=RT.outpostContext(),bodyId=ctx.body?.id||null,all=bodyId?store.items.filter(x=>x.bodyId===bodyId):[];
 const options=(el,list,placeholder)=>{const old=el.value;el.replaceChildren();if(placeholder){const p=document.createElement('option');p.value='';p.textContent=placeholder;el.append(p);}for(const item of list){const p=document.createElement('option');p.value=item.id;p.textContent=item.kind.toUpperCase()+' / '+item.id.slice(-8);el.append(p);}if([...el.options].some(x=>x.value===old))el.value=old;};
 options($('outpost-node-a'),all,'A: select module');options($('outpost-node-b'),all,'B: select module');options($('outpost-lab'),all.filter(x=>x.kind==='lab'),'Select laboratory');
 const rep=powerReports.get(bodyId);$('outpost-power-result').textContent='Power groups '+(rep?.groups??'—')+' · generation '+fmt(rep?.generationW??0)+' W · delivered '+fmt(rep?.servedW??0)+' W · loads shed '+(rep?.shed?.length||0)+' · '+fmt(rep?.busVoltageV||48,0)+' V / '+fmt(rep?.currentA||0,1)+' A · wire heat '+fmt(rep?.wireLossW||0,1)+' W · charge '+fmt((rep?.chargedJ||0)/3600000,3)+' kWh · battery draw '+fmt((rep?.dischargedJ||0)/3600000,3)+' kWh';
 const links=$('outpost-structure-list');links.replaceChildren();for(const item of all.slice(0,80)){const node=document.createElement('div');node.className='field-entry';const line=rep?.byId[item.id];node.textContent=item.kind.toUpperCase()+' · '+item.id.slice(-8)+' · '+(line?.power?'POWERED':line?.fault||'UNPOWERED')+' · '+fmt(line?.generatedW||0,0)+' W generated / '+fmt(line?.loadW||0,0)+' W served'+(item.kind==='battery'?' · '+fmt(item.energyJ/3.6e6,3)+' kWh':'')+(item.kind==='lab'?' · '+item.samples.length+' records':'');links.append(node);}
 const selected=all.find(x=>x.id===$('outpost-node-a').value),powerLine=selected?rep?.byId[selected.id]:null;
 $('outpost-t02-inspector').textContent=selected?[
 'T02 ENGINEERING POWER INSPECTOR — '+selected.kind.toUpperCase()+' / '+selected.id,
 'Status: '+(powerLine?.power?'POWERED':powerLine?.fault||'AWAITING GRID EVALUATION')+' · switch '+(selected.enabled?'ON':'OFF'),
 'Bus: '+(powerLine?.busId||'unknown')+' · '+fmt(powerLine?.voltageV||0,0)+' V · '+fmt(powerLine?.currentA||0,2)+' A',
 'Nameplate: '+fmt(powerLine?.loadNameplateW||0,0)+' W load · '+fmt(powerLine?.nameplateW||0,0)+' W source rating',
 'Actual: '+fmt(powerLine?.generatedW||0,1)+' W generated · '+fmt(powerLine?.servedW||0,1)+' W served · '+fmt(powerLine?.shedW||0,1)+' W shed',
 'Real sources: '+(powerLine?.sourceIds?.join(', ')||'NONE — no connected producing source'),
 'Metered sources: '+(Object.entries(powerLine?.sourceWatts||{}).map(([id,watts])=>id.slice(-11)+' '+fmt(watts,2)+' W').join(' · ')||'NONE'),
 'Storage: '+fmt((powerLine?.batteryJ||0)/3.6e6,3)+' kWh / '+fmt((powerLine?.capacityJ||0)/3.6e6,3)+' kWh',
 'Battery limits: '+fmt(powerLine?.chargeLimitW||0,0)+' W charge / '+fmt(powerLine?.dischargeLimitW||0,0)+' W discharge',
 'Temperature '+fmt(powerLine?.temperatureK||0,1)+' K · condition '+fmt((powerLine?.condition||0)*100,1)+'%',
 'Last simulated '+fmt(rep?.simulatedAtS||0,2)+' s · '+(rep?.model||'bounded DC group model')
 ].join('\\n'):'Select Module A to inspect its authoritative battery/bus/source record.';
 $('outpost-structure-count').textContent=all.length+' placed on '+(ctx.body?.name||'—')+' · '+store.wires.length+' cables · '+store.relays.length+' relays';
 $('outpost-wire-list').textContent=store.wires.filter(w=>all.some(x=>x.id===w.a)).map(w=>w.a.slice(-6)+' ↔ '+w.b.slice(-6)).join(' · ')||'No electrical wires yet. Adjacent structures are not connected automatically.';
 const labs=all.filter(x=>x.kind==='lab');const lab=labs.find(x=>x.id===$('outpost-lab').value),readings=lab?store.receipts.filter(r=>r.labId===lab.id):[];
 $('outpost-data').textContent=readings.length?readings.slice(-35).map(r=>r.instrument+' '+fmt(r.value,3)+' '+r.unit+' ±'+fmt(r.uncertainty,2)+' · measured '+fmt(r.timeS)+'s · received '+fmt(r.receivedAtS)+'s').join('\n'):'No received measurements. A powered lab needs a radio connection and actual instrument readings.';
 if(lab){const l=linkFor(lab);$('outpost-radio').textContent=(l.connected?'ONLINE':'OFFLINE')+' · '+(l.via||l.reason)+' · '+fmt(l.delayS,5)+' s one-way';}else $('outpost-radio').textContent='Choose a laboratory for radio status';
 refreshRadioHardware(ctx.body);
 refreshHabitat(bodyId);
 refreshScienceT10();
 const r=$('outpost-relays');r.replaceChildren();for(const item of store.relays.filter(x=>x.bodyId===bodyId)){const opt=document.createElement('div');opt.className='field-entry';opt.textContent=item.id+' · altitude '+fmt(item.altitude)+' scene units · analytic orbit '+fmt(item.periodS)+'s';r.append(opt);}
 try{const key=placementKey(),p=lastPlacement?.key===key?lastPlacement:selection();p.key=key;lastPlacement=p;$('outpost-placement').textContent='VALID LOCATION · '+fmt(p.check.slopeDeg,1)+'° slope · '+fmt(p.check.height,2)+' scene-units elevation';$('outpost-placement').style.color='#a7d4b7';}catch(e){lastPlacement=null;$('outpost-placement').textContent='INVALID LOCATION · '+e.message;$('outpost-placement').style.color='#ffb19a';}
}
function wrapped(action){return()=>{try{action();if(store.items.length){powerTick(0);}refresh();}catch(e){show(e.message,true);}};}
$('outpost-open').onclick=()=>{lastPlacement=null;$('outpost').hidden=false;refresh();};$('outpost-close').onclick=()=>{$('outpost').hidden=true;};$('outpost').addEventListener('click',e=>{if(e.target===$('outpost'))$('outpost').hidden=true;});
for(const b of $('outpost').querySelectorAll('[data-outpost-tab]'))b.onclick=()=>{tab=b.dataset.outpostTab;for(const btn of $('outpost').querySelectorAll('[data-outpost-tab]'))btn.setAttribute('aria-selected',String(btn===b));for(const page of $('outpost').querySelectorAll('[data-outpost-page]'))page.hidden=page.dataset.outpostPage!==tab;refresh();};
for(const x of ['outpost-type','outpost-forward','outpost-right']){ $(x).addEventListener('change',refresh);$(x).addEventListener('input',refresh);}
$('outpost-place').onclick=wrapped(()=>{const p=lastPlacement;if(!p||p.key!==placementKey())throw Error('No valid placement — change offset or select a safer surface');const result=store.add(p.kind,p.ctx.body,p.local,p.facing,d=>Starfall3D.groundHeight(d,p.ctx.body),p.area);if(!Number.isFinite(lastPoweredAt[p.ctx.body.id]))lastPoweredAt[p.ctx.body.id]=RT.time;lastPlacement=null;dirty=true;persist();show('Constructed '+p.kind+' · '+fmt(result.slope,1)+'° slope. Connect electrical cables to power it.');});
$('outpost-remove').onclick=wrapped(()=>{const id=$('outpost-node-a').value;if(!id)throw Error('Select module A to dismantle');if(!store.remove(id))throw Error('Module unavailable');dirty=true;persist();show('Module dismantled · its cables were disconnected');});
$('outpost-connect').onclick=wrapped(()=>{const ctx=RT.outpostContext();if(!ctx.landed)throw Error('Land before wiring');const added=store.link($('outpost-node-a').value,$('outpost-node-b').value,ctx.body);if(added){dirty=true;persist();}show(added?'Cable connected. Power network recomputes on next simulation tick.':'Those modules are already wired.');});
$('outpost-toggle-power').onclick=wrapped(()=>{const id=$('outpost-node-a').value;const selected=store.items.find(x=>x.id===id);if(!selected)throw Error('Select module A to switch its real bus load');store.setEnabled(id,!selected.enabled);dirty=true;persist();show((selected.enabled?'Enabled ':'Isolated ')+selected.kind+' / '+selected.id);});
$('outpost-disconnect').onclick=wrapped(()=>{if(!store.unlink($('outpost-node-a').value,$('outpost-node-b').value))throw Error('Cable not found');dirty=true;persist();show('Cable disconnected.');});
$('outpost-launch-relay').onclick=wrapped(()=>{const ctx=RT.outpostContext();if(!ctx.landed||!ctx.eva)throw Error('Deploy a relay while exploring the surface');const relay=store.addRelay(ctx.body);dirty=true;persist();show('Simulated relay deployed: '+relay.id+' · analytic orbit (no cinematic rocket launch)');});
$('outpost-send').onclick=wrapped(sendData);
$('outpost-radio-device').onchange=()=>refresh();
$('outpost-t08-apply').onclick=wrapped(()=>{
 const T=root.StarfallDeepSpaceT08,item=selectedRadio(),mode=$('outpost-t08-mode').value,
  peer=$('outpost-t08-peer').value;
 if(!T)throw Error('T08 radio adapter missing');
 T.configure(item,mode,peer,RT.time);
 // Immediately recalculate the real same-owner T02 bus demand. No free
 // amplifier; if installed wattage exceeds available supply it is shed.
 advancePowerTo(RT.time,(asset,t)=>root.StarfallMissionOperationsUI?.resolveBody?.(asset,t)||RT.galaxy.byId.get(asset.bodyId));
 dirty=true;persist();refresh();show('T08 '+mode+' antenna commissioned on '+item.id+' → '+(peer||'OFF')+
  '. Verify real 48V power and matching remote hardware in T08 diagnostics.');
});
$('outpost-t08-off').onclick=wrapped(()=>{
 const item=selectedRadio();root.StarfallDeepSpaceT08.configure(item,'OFF','',RT.time);
 advancePowerTo(RT.time,(asset,t)=>root.StarfallMissionOperationsUI?.resolveBody?.(asset,t)||RT.galaxy.byId.get(asset.bodyId));
 dirty=true;persist();refresh();show('T08 deep-space transceiver disabled. Local radio is unchanged.');
});

$('outpost-radio-mode').onchange=()=>{};$('outpost-radio-target').onchange=()=>{};
$('outpost-radio-apply').onclick=wrapped(()=>{
 const item=selectedRadio();if(!root.StarfallAntennaT04)throw Error('T04 radio model missing');
 store.configureRadio(item.id,{mode:$('outpost-radio-mode').value,targetId:$('outpost-radio-target').value});dirty=true;persist();
 show('Radio '+item.id+' now '+item.radioT04.mode.toUpperCase()+'; moving tracking consumes 35 additional modeled watts.');
});
$('outpost-radio-aim').onclick=wrapped(()=>{
 const item=selectedRadio(),body=RT.outpostContext()?.body,targetId=$('outpost-radio-target').value;
 if(!body||!targetId||targetId===item.id)throw Error('Choose another physical target on this body');
 const origin=root.StarfallAntennaT04.position(item,body,O.rotate),aim=radioPosition(targetId,body);
 if(!aim)throw Error('Physical target location is unavailable');
 const direction=O.V.norm(O.rotate(O.V.sub(aim,origin),body.spinAxis||[0,1,0],-(body.spinAngle||0)));
 store.configureRadio(item.id,{mode:'fixed',targetId,boresightLocal:direction});
 dirty=true;persist();show('Dish mechanically aimed at '+targetId+' (body-fixed pointing, no automatic tracking).');
});
$('outpost-radio-reset').onclick=wrapped(()=>{
 const i=selectedRadio();store.configureRadio(i.id,{mode:'omni',radioEnabled:true,targetId:''});dirty=true;persist();show('Radio reset: legacy-compatible omnidirectional mode enabled.');
});
$('outpost-radio-power').onclick=wrapped(()=>{
 const i=selectedRadio(),enabled=!root.StarfallAntennaT04.repair(i.radioT04).radioEnabled;
 store.configureRadio(i.id,{radioEnabled:enabled});dirty=true;persist();show('Transceiver '+(enabled?'enabled':'disabled')+' · DC module remains separately switched.');
});
$('outpost-enforce-radio').onchange=()=>{radioEnforced=$('outpost-enforce-radio').checked;dirty=true;persist();show(radioEnforced?'Radio enforcement ON for new remote rover commands':'Assisted radio mode restored');};
$('hab-t09-select').onchange=refresh;
$('hab-t09-enable').onclick=wrapped(()=>habitatControl('ENABLE'));
$('hab-t09-disable').onclick=wrapped(()=>habitatControl('DISABLE'));
$('hab-t09-repair').onclick=wrapped(()=>habitatControl('REPAIR'));
$('hab-t09-set-crew').onclick=wrapped(()=>habitatControl('OCCUPANCY',{occupants:Number($('hab-t09-occupancy').value)}));
$('hab-t09-cycle-out').onclick=wrapped(()=>habitatControl('CYCLE_OUT'));
$('hab-t09-cycle-in').onclick=wrapped(()=>habitatControl('CYCLE_IN'));
$('hab-t09-service').onclick=wrapped(()=>{
 const hab=selectedHabitat(),body=RT.galaxy.byId.get(hab.bodyId),H=root.StarfallHabitatT09;
 if(!habitatNear(hab))throw Error('Approach the real habitat service hatch in EVA');
 const rover=root.StarfallLaunchUI?.store?.rovers.find(r=>r.id===$('hab-t09-rover').value);
 const on=powerReports.get(hab.bodyId)?.byId?.[hab.id]?.power===true;
 const result=H.serviceRover(hab,rover,store,body,RT.time,30,on);
 root.StarfallLaunchUI?.persist?.();dirty=true;persist();
 show('Habitat service: drew '+fmt(result.drawnJ,0)+' J from actual wired battery, credited '+fmt(result.deliveredJ,0)+' J to rover; lost '+fmt(result.lossJ,0)+' J.');
});
$('t10-process').onclick=wrapped(()=>{
 const C=root.StarfallScienceCustodyT10,lab=store.items.find(x=>x.id===$('outpost-lab').value&&x.kind==='lab');
 const obs=(root.StarfallScienceUI?.journal||[]).find(x=>x.id===$('t10-lab-observation').value);
 if(!obs||!lab)throw Error('Select a real lab and acknowledged numerical journal observation');
 const record=C.analyze(store,lab,obs,RT.time,powered(lab.id,lab.bodyId));
 dirty=true;persist();show('T10 '+record.id+' · '+record.status+'; result after 20 simulated seconds and continuous DC supply.');
});
$('t10-transfer').onclick=wrapped(()=>{
 const C=root.StarfallScienceCustodyT10,ctx=RT.outpostContext(),body=ctx.body,
  item=store.items.find(x=>x.id===$('t10-sample-storage').value&&x.kind==='storage');
 if(!item||!body)throw Error('Select physical storage on the world you are visiting');
 const rovers=root.StarfallLaunchUI?.store?.rovers||[];
 const nearby=rovers.filter(r=>r.bodyId===body.id&&r.sampleInventory?.length&&r.local)
  .sort((a,b)=>O.arc(a.local,item.local,body.radius)-O.arc(b.local,item.local,body.radius));
 const source=nearby[0],sample=source?.sampleInventory?.[0];
 if(!sample)throw Error('No authentic unique physical sample in a nearby deployed rover inventory; numeric observations cannot be converted into rocks.');
 const receipt=C.transfer(store,item,sample,source,body,ctx,powered(item.id,item.bodyId),RT.time);
 root.StarfallLaunchUI?.persist?.();dirty=true;persist();
 show('T10 specimen '+receipt.id+' physically transferred, with one source debit and matching custody receipt.');
});
$('outpost-export').onclick=wrapped(()=>{const file=new Blob([JSON.stringify(store.serialize(),null,2)],{type:'application/json'}),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='starfall-outposts-'+store.seed+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);show('Infrastructure JSON exported');});
$('outpost-export-receipts').onclick=wrapped(()=>{const rows=['observationId,labId,bodyId,instrument,value,unit,uncertainty,measurementTimeS,receivedAtS'];for(const x of store.receipts){const escape=v=>'"'+String(v??'').replaceAll('"','""')+'"';rows.push([x.observationId,x.labId,x.bodyId,x.instrument,x.value,x.unit,x.uncertainty,x.timeS,x.receivedAtS].map(escape).join(','));}const url=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='starfall-lab-receipts.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);show('Laboratory receipts exported');});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('outpost').hidden){$('outpost').hidden=true;e.stopImmediatePropagation();}});
function tick(dt,timeScale){if(document.hidden)return;const time=RT.time;
 if(!root.StarfallMissionOperationsUI&&time>=lastPowerTick+1){const used=Math.min(Math.max(0,time-lastPowerTick),600);if(store.items.length){powerTick(used);dirty=true;}lastPowerTick=time;}
 let completedTransmission=false;if(queue.length){for(const q of [...queue]){if(time<q.deliverAt)continue;const lab=store.items.find(x=>x.id===q.labId);if(!lab){queue.splice(queue.indexOf(q),1);dirty=true;completedTransmission=true;continue;}const connection=linkFor(lab);if(powered(lab.id,lab.bodyId)&&connection.connected){try{store.addReceipt(lab,q.obs,time,connection);queue.splice(queue.indexOf(q),1);dirty=true;completedTransmission=true;}catch(error){show(error.message,true);queue.splice(queue.indexOf(q),1);dirty=true;completedTransmission=true;}}}}
 if(root.StarfallScienceCustodyT10){for(const lab of store.items.filter(x=>x.kind==='lab'&&x.t10?.analysis?.some(j=>j.status==='RUNNING'||j.status==='PAUSED'))){const before=JSON.stringify(lab.t10);root.StarfallScienceCustodyT10.advanceLab(lab,time,powered(lab.id,lab.bodyId));if(before!==JSON.stringify(lab.t10))dirty=true;}}
 if(completedTransmission||dirty&&performance.now()-lastFlush>6000)persist();if(!$('outpost').hidden&&performance.now()-lastPanel>900){lastPanel=performance.now();refresh();}
}
addEventListener('pagehide',()=>{if(dirty)persist();});
function advancePowerTo(atTime,resolve){if(!Number.isFinite(atTime)||atTime<0)return false;const before=store.serialize(),previousTimes={...lastPoweredAt},oldReports=new Map(powerReports),oldTick=lastPowerTick;try{powerTick(0,atTime,resolve);lastPowerTick=atTime;dirty=true;return true;}catch(error){store.restore(before);for(const k of Object.keys(lastPoweredAt))delete lastPoweredAt[k];Object.assign(lastPoweredAt,previousTimes);powerReports=oldReports;lastPowerTick=oldTick;throw error;}}
root.StarfallPowerInspectorT02={getAssetStatus(id){return root.StarfallPowerLedgerT02?.inspect({id,rt:RT,ui:root.StarfallOutpostUI,launch:root.StarfallLaunchUI})||null;},getBusStatus(bodyId){const r=powerReports.get(bodyId);return r?O.copy(r):null;}};
root.StarfallOutpostUI={store,tick,advancePowerTo,scene,preview,canCommandRover,get powerReports(){return powerReports;},get queue(){return queue;},linkFor,refresh,persist};
})(globalThis);
