/* STARFALL 4A–4D — safe, optional controller UI; no DOM-wide rerenders per frame. */
(function(root){'use strict';
const $=id=>document.getElementById(id),RT=root.StarfallRuntime,S=root.StarfallFieldScience,R=root.StarfallRobotics;
const saved=SF.load().robotics4||{},journal=S.journal(saved.journal),controller=new R.Controller();controller.restore(saved.controller);
let serial=Math.max(0,saved.serial||0),measuring=false,dirty=false,lastPersist=performance.now(),lastRefresh=0,lastState='',lastEvent='',lastObservation=null;
const fmt=(n,d=2)=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
function message(text,fail=false){$('field-status').textContent=text;$('field-status').style.color=fail?'#ffac99':'#efc58c';}
function persist(){SF.save({robotics4:{schema:1,serial,controller:controller.serialize(),journal:journal.serialize()}});dirty=false;lastPersist=performance.now();}
function exportFile(name,data,type='application/json'){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);}
function renderJournal(){const box=$('field-journal'),raw=journal.list(),filter=$('field-journal-body');box.replaceChildren();
 const bodies=[...new Set(raw.map(x=>x.bodyId))].sort(),selected=filter.value;filter.replaceChildren();for(const body of ['*',...bodies]){const option=document.createElement('option');option.value=body;option.textContent=body==='*'?'All bodies':body;filter.append(option);}filter.value=bodies.includes(selected)?selected:'*';
 const all=raw.filter(x=>filter.value==='*'||x.bodyId===filter.value);
 const sort=$('field-journal-sort').value;if(sort==='body')all.sort((a,b)=>a.bodyId.localeCompare(b.bodyId)||a.parameter.localeCompare(b.parameter));else if(sort==='instrument')all.sort((a,b)=>a.instrument.localeCompare(b.instrument)||a.bodyId.localeCompare(b.bodyId));else all.reverse();
 const buckets=new Map();for(const e of all){const key=e.parameter+':'+e.unit,old=buckets.get(key)||{count:0,total:0};old.count++;old.total+=e.value;buckets.set(key,old);}
 $('field-comparison').textContent=all.length+' observations across '+new Set(all.map(e=>e.bodyId)).size+' bodies · '+[...buckets.entries()].slice(0,5).map(([k,v])=>k+' mean '+fmt(v.total/v.count,2)).join(' · ');
 if(!all.length){box.textContent='No recorded measurements yet.';return;}for(const e of all.slice(0,70)){
 const el=document.createElement('div');el.className='field-entry';el.textContent=e.bodyId+' / '+e.instrument+' · '+fmt(e.value,4)+' '+e.unit+' ± '+fmt(e.uncertainty,3)+' · t='+fmt(e.timeS,1)+'s';box.append(el);}
}
function showObservation(obs){lastObservation=obs;$('field-latest').textContent=obs.parameter+' = '+fmt(obs.value,5)+' '+obs.unit+' ± '+fmt(obs.uncertainty,4)+'\n'+obs.bodyId+'  ·  '+obs.quality+'  ·  '+obs.model+'\nSimulated t = '+fmt(obs.timeS,1)+' seconds · '+obs.powerJ+' J required';}
function collect(instrument,fromRover=false){const data=RT.scienceContext();if(!data.body?.landable)throw Error('Land on a solid surface to measure.');const obs=RT.acquireFieldReading(instrument,serial++,fromRover);if(journal.add(obs)){dirty=true;persist();}showObservation(obs);renderJournal();return obs;}
function checkRover(){const info=RT.roverAutonomyPosition(),data=RT.scienceContext();if(!data.landed||!info)throw Error('Land and deploy a rover before using autonomy');if(data.roverOccupied)throw Error('Exit the rover first; autonomy never overrides manual driving');const link=root.StarfallOutpostUI?.canCommandRover();if(link&&!link.connected)throw Error('Remote command blocked: '+link.reason);return info;}
function start(script,homeOverride=null){const pose=checkRover();controller.start(script,{bodyId:pose.bodyId,local:pose.local,home:homeOverride});dirty=true;persist();message('Program armed. Close this panel to watch the rover move.');refresh(true);}
function restoreIfChanged(){if(!$('field-lab').hidden)refresh();}
function currentContext(){const pose=RT.roverAutonomyPosition();if(!pose)return null;const data=RT.scienceContext(),planet=data.body;
 return{bodyId:pose.bodyId,local:pose.local,energyPercent:data.roverPowerEnabled?data.energy/Math.max(1,data.roverStats.batteryCapacityJ)*100:100,temperatureK:data.roverState.temperatureK,distanceHome:controller.home?Math.acos(Math.max(-1,Math.min(1,R.V.dot(R.V.norm(pose.local),R.V.norm(controller.home)))))*pose.radius:0,
  destination:(forward,right)=>RT.roverDestination(forward,right),instrumentTime:instrument=>S.INSTRUMENTS[instrument]?.seconds||1000,
  measure:instrument=>collect(instrument,true),
  createPlanner:(origin,destination)=>new R.Planner({origin,forward:pose.forward.map((x,i)=>x),destination,radius:pose.radius,height:local=>Starfall3D.groundHeight(local,planet),maxCells:1100,range:160}),
  driveToward:(destination,dt)=>RT.driveRoverToward(destination,dt)};}
function refresh(force=false){const now=performance.now();if(!force&&now-lastRefresh<650)return;lastRefresh=now;
 const data=RT.scienceContext(),pose=RT.roverAutonomyPosition(),status=controller.state;
 const traction=RT.roverPhysicsReport;$('field-rover-diagnostics').textContent='Rover: '+(pose?'ON SURFACE':'NOT DEPLOYED')+' · '+(data.roverPowerEnabled?fmt(data.energy/3.6e6,2)+' kWh':'assisted power')+' · '+(traction?'Terrain '+traction.material+' · '+fmt(traction.slopeDeg,1)+'° slope · slip '+fmt(traction.slip,2)+' · tip '+fmt(traction.tipRisk,2):'No wheel traction sample yet');
 $('field-robot-state').textContent='STATE: '+status+' · command '+(controller.index+1)+' / '+controller.script.length+' · '+(controller.reason||controller.event||'')+(controller.planner?' · '+controller.planner.expanded+' terrain nodes':'');
 $('field-range').textContent='MODE '+data.mode+' · BODY '+(data.body?.name||'—')+' · altitude '+fmt(data.altitudeM,1)+' m · instrument physical limits and power requirements apply';
 $('field-rover-physics').checked=RT.science4Settings.roverPhysics;
}
for(const [key,spec] of Object.entries(S.INSTRUMENTS)){const opt=document.createElement('option');opt.value=key;opt.textContent=spec.name+' ('+spec.seconds+' s / '+spec.powerW+' W / ≤'+spec.maxAltitudeM+' m)';$('field-instrument').append(opt);}
$('field-open').onclick=()=>{$('field-lab').hidden=false;refresh(true);};
$('field-close').onclick=()=>{$('field-lab').hidden=true;};
$('field-lab').addEventListener('click',e=>{if(e.target===$('field-lab'))$('field-lab').hidden=true;});
$('field-lab').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{for(const btn of $('field-lab').querySelectorAll('[data-tab]'))btn.setAttribute('aria-selected',String(btn===b));for(const page of $('field-lab').querySelectorAll('[data-field-page]'))page.hidden=page.dataset.fieldPage!==b.dataset.tab;if(b.dataset.tab==='journal')renderJournal();refresh(true);});
$('field-measure').onclick=()=>{try{if(measuring)throw Error('Instrument is already sampling');const data=RT.scienceContext(),rover=data.roverOccupied,instrument=$('field-instrument').value,spec=S.INSTRUMENTS[instrument];
 if(!data.landed||!data.eva&&data.mode==='FLIGHT')throw Error('Land and walk out to take scientific measurements');
 if(data.altitudeM>spec.maxAltitudeM)throw Error('Instrument is outside operating range');
 measuring=true;$('field-measure').disabled=true;message('Sampling '+instrument+' for '+spec.seconds+' seconds…');
 setTimeout(()=>{try{const current=RT.scienceContext();if(current.bodyId!==data.bodyId)throw Error('Planet changed during measurement');const obs=collect(instrument,rover);message('Measurement recorded: '+obs.id);}catch(e){message(e.message,true);}finally{measuring=false;$('field-measure').disabled=false;}},spec.seconds*1000);
 }catch(e){message(e.message,true);}};
$('field-rover-physics').onchange=e=>{RT.science4SetPhysics(e.target.checked);refresh(true);};
$('field-waypoint').onclick=()=>{try{const forward=Number($('field-forward').value),right=Number($('field-right').value);start([{op:'GOTO',forward,right},{op:'STOP'}]);}catch(e){message(e.message,true);}};
$('field-return').onclick=()=>{try{const p=checkRover();if(!controller.home||controller.bodyId!==p.bodyId)throw Error('No recorded home position. Start a route first.');start([{op:'RETURN'},{op:'STOP'}],controller.home);}catch(e){message(e.message,true);}};
$('field-builder-add').onclick=()=>{try{const program=JSON.parse($('field-program').value),op=$('field-builder-op').value,a=Number($('field-builder-a').value),b=Number($('field-builder-b').value),instrument=$('field-instrument').value;
 if(!Array.isArray(program))throw Error('Program must be an array');const cmd={op};if(op==='GOTO'){cmd.forward=a;cmd.right=b;}if(op==='WAIT')cmd.seconds=a;if(op==='SCAN')cmd.instrument=instrument;if(op==='SAMPLE')cmd.instrument='sampler';program.push(cmd);R.validateProgram(program);$('field-program').value=JSON.stringify(program,null,2);message('Added '+op+' to sequence.');}catch(e){message('Builder: '+e.message,true);}};
$('field-builder-pop').onclick=()=>{try{const commands=JSON.parse($('field-program').value);if(!Array.isArray(commands))throw Error('Expected a list');commands.pop();$('field-program').value=JSON.stringify(commands,null,2);message('Removed final command.');}catch(e){message('Builder: '+e.message,true);}};
$('field-run').onclick=()=>{try{start(JSON.parse($('field-program').value));}catch(e){message('Script error: '+e.message,true);}};
$('field-pause').onclick=()=>{if(controller.state==='PAUSED')controller.resume();else controller.pause();dirty=true;persist();refresh(true);};
$('field-stop').onclick=()=>{controller.abort('Stopped by operator');dirty=true;persist();refresh(true);};
$('field-journal-body').onchange=renderJournal;$('field-journal-sort').onchange=renderJournal;
$('field-export-json').onclick=()=>exportFile('starfall-field-observations.json',JSON.stringify({schema:1,seed:RT.galaxy.seed,entries:journal.list()},null,2));
$('field-export-csv').onclick=()=>exportFile('starfall-field-observations.csv',S.csv(journal.list()),'text/csv');
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('field-lab').hidden){$('field-lab').hidden=true;e.stopImmediatePropagation();}});
function tick(dt){
 const active=controller.script.length&& !['PAUSED','FAULT','DOCKED'].includes(controller.state);
 if(active){const pose=RT.roverAutonomyPosition(),data=RT.scienceContext();if(data.roverOccupied){controller.pause();dirty=true;}else if(!pose||!data.landed){controller.abort('Rover is not on a landed surface');dirty=true;}else{
  try{const ctx=currentContext();controller.tick(dt,ctx);if(controller.event!==lastEvent||controller.state!==lastState){lastState=controller.state;lastEvent=controller.event;dirty=true;}}
  catch(e){controller.abort('Controller stopped safely: '+e.message);dirty=true;}
 }}
 if(dirty&&performance.now()-lastPersist>4800)persist();if(!$('field-lab').hidden)refresh();
}
function ingestOrbital(obs){if(!obs||obs.kind!=='orbital-observation'||!S.journal||!Number.isFinite(obs.value)||!Array.isArray(obs.location)||!obs.satelliteId||!obs.bodyId)return false;
 if(!journal.add(obs))return false;dirty=true;persist();if(!$('field-lab').hidden)renderJournal();return true;}
function ingestRover(obs){if(!obs||!obs.probeId||!obs.bodyId||!Array.isArray(obs.location)||!Number.isFinite(obs.value))return false;
 if(obs.t14&&!root.StarfallScienceT14?.validateEvidence(obs))return false;
 if(!journal.add(obs))return false;dirty=true;persist();if(!$('field-lab').hidden)renderJournal();return true;}
function ingestShip(obs){
 if(!obs||obs.sourceAssetId!=='starfall-ship'||obs.kind!=='measurement'||
  obs.instrument!=='thermometer'||obs.parameter!=='hullTemperatureK'||obs.unit!=='K'||
  !Number.isFinite(obs.value)||!Number.isFinite(obs.timeS)||!Array.isArray(obs.location)||!obs.location.every(Number.isFinite))
  return false;
 if(!journal.add(obs))return false;
 dirty=true;persist();if(!$('field-lab').hidden)renderJournal();return true;
}
root.StarfallScienceUI={ingestRover,ingestOrbital,ingestShip,tick,open:()=>$('field-open').click(),get controller(){return controller;},get journal(){return journal.list();},get autoDriving(){return['MOVING','RETURNING'].includes(controller.state);},measure:collect,refresh:()=>refresh(true)};
})(globalThis);
