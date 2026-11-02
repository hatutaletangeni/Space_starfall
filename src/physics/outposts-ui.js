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
function scene(){const ctx=RT.outpostContext();if(!ctx.body||!ctx.local)return[];const list=store.surfaceItems(ctx.body.id,ctx.local,ctx.body.radius,65);const result=list.map(renderLoc).filter(Boolean);if(!$('outpost').hidden&&tab==='build'){const item=preview();if(item){item.preview=true;result.push(item);}}return result;}
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
$('outpost-enforce-radio').onchange=()=>{radioEnforced=$('outpost-enforce-radio').checked;dirty=true;persist();show(radioEnforced?'Radio enforcement ON for new remote rover commands':'Assisted radio mode restored');};
$('outpost-export').onclick=wrapped(()=>{const file=new Blob([JSON.stringify(store.serialize(),null,2)],{type:'application/json'}),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='starfall-outposts-'+store.seed+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);show('Infrastructure JSON exported');});
$('outpost-export-receipts').onclick=wrapped(()=>{const rows=['observationId,labId,bodyId,instrument,value,unit,uncertainty,measurementTimeS,receivedAtS'];for(const x of store.receipts){const escape=v=>'"'+String(v??'').replaceAll('"','""')+'"';rows.push([x.observationId,x.labId,x.bodyId,x.instrument,x.value,x.unit,x.uncertainty,x.timeS,x.receivedAtS].map(escape).join(','));}const url=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='starfall-lab-receipts.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);show('Laboratory receipts exported');});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('outpost').hidden){$('outpost').hidden=true;e.stopImmediatePropagation();}});
function tick(dt,timeScale){if(document.hidden)return;const time=RT.time;
 if(!root.StarfallMissionOperationsUI&&time>=lastPowerTick+1){const used=Math.min(Math.max(0,time-lastPowerTick),600);if(store.items.length){powerTick(used);dirty=true;}lastPowerTick=time;}
 let completedTransmission=false;if(queue.length){for(const q of [...queue]){if(time<q.deliverAt)continue;const lab=store.items.find(x=>x.id===q.labId);if(!lab){queue.splice(queue.indexOf(q),1);dirty=true;completedTransmission=true;continue;}const connection=linkFor(lab);if(powered(lab.id,lab.bodyId)&&connection.connected){try{store.addReceipt(lab,q.obs,time,connection);queue.splice(queue.indexOf(q),1);dirty=true;completedTransmission=true;}catch(error){show(error.message,true);queue.splice(queue.indexOf(q),1);dirty=true;completedTransmission=true;}}}}
 if(completedTransmission||dirty&&performance.now()-lastFlush>6000)persist();if(!$('outpost').hidden&&performance.now()-lastPanel>900){lastPanel=performance.now();refresh();}
}
addEventListener('pagehide',()=>{if(dirty)persist();});
function advancePowerTo(atTime,resolve){if(!Number.isFinite(atTime)||atTime<0)return false;const before=store.serialize(),previousTimes={...lastPoweredAt},oldReports=new Map(powerReports),oldTick=lastPowerTick;try{powerTick(0,atTime,resolve);lastPowerTick=atTime;dirty=true;return true;}catch(error){store.restore(before);for(const k of Object.keys(lastPoweredAt))delete lastPoweredAt[k];Object.assign(lastPoweredAt,previousTimes);powerReports=oldReports;lastPowerTick=oldTick;throw error;}}
root.StarfallPowerInspectorT02={getAssetStatus(id){return root.StarfallPowerLedgerT02?.inspect({id,rt:RT,ui:root.StarfallOutpostUI,launch:root.StarfallLaunchUI})||null;},getBusStatus(bodyId){const r=powerReports.get(bodyId);return r?O.copy(r):null;}};
root.StarfallOutpostUI={store,tick,advancePowerTo,scene,preview,canCommandRover,get powerReports(){return powerReports;},get queue(){return queue;},linkFor,refresh,persist};
})(globalThis);
