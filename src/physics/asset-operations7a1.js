/* 7A.1 — presentation-only engineering helpers. No new mutable engineering model. */
(function(root){'use strict';
const finite=n=>typeof n==='number'&&Number.isFinite(n), clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const pretty=s=>String(s||'Unknown').replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const number=(n,d=1)=>finite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d}):'Unavailable';
function quantity(n,kind){if(!finite(n))return 'Unavailable';
 const a=Math.abs(n),units={energy:[[3.6e9,'MWh'],[3.6e6,'kWh'],[3600,'Wh'],[1000,'kJ'],[1,'J']],power:[[1e6,'MW'],[1000,'kW'],[1,'W']],mass:[[1000,'t'],[1,'kg']],force:[[1e6,'MN'],[1000,'kN'],[1,'N']],distance:[[1000,'km'],[1,'m']],time:[[3600,'h'],[60,'min'],[1,'s']],torque:[[1000,'kN·m'],[1,'N·m']]};
 if(kind==='temperature')return number(n-273.15,1)+' °C';if(kind==='percent')return number(n*100,0)+'%';
 const choices=units[kind]||[[1,kind||'']];const selected=choices.find(([m])=>a>=m)||choices[choices.length-1];return number(n/selected[0],a/selected[0]>=100?0:2)+(selected[1]?' '+selected[1]:'');}
function kindFor(type){if(['battery','solar','generator','drive','engine','tank','antenna','sensor','radiator','chassis','payload'].includes(type))return type; if(/motor|drive/.test(type))return'drive';if(/instrument|science|avionics/.test(type))return'sensor';if(/wheel|suspension|structure|frame|foundation/.test(type))return'chassis';return'payload';}
function details(id,type,raw){const r=raw&&typeof raw==='object'?raw:{};const properties={};for(const [k,v] of Object.entries(r)){if(finite(v)&&/(Kg|J|W|N|Nm|S|V|K|M2|Meters|Efficiency|torque|radius)/i.test(k))properties[k]=v;}return{id:String(id),type:kindFor(type),label:pretty(id),properties};}
function componentsFor(asset,sources={}){if(!asset)return[];const a=asset,results=[];
 if(a.type==='ship'||a.type==='rover'){
 const original=sources.vehicles?.get?.(a.type),slotNames=original?.definition?.slots||{},catalog=sources.vehicleCatalog||{};
 const live=root.StarfallRuntime?.equipmentSnapshotT15?.(a.type)?.components||[];
 for(const [slot,id] of Object.entries(slotNames)){
  if(!id)continue;const spec=catalog[id]||{},active=live.find(x=>x.slot===slot&&x.partId===id);
  const base=details(id,spec.type||slot,spec),extra={};
  if(active){extra.ownerAssetId=active.ownerId;extra.installedMassKg=active.massKg;
    extra.powerW=active.powerW;extra.liveBus=active.bus;extra.provenanceCount=active.provenance?.length||0;
    if(spec.instrumentKeys)extra.availableInstrumentTypes=spec.instrumentKeys.join(', ');}
  results.push({...base,properties:{...base.properties,...extra},slot,source:active?.ownerId||'Installed vehicle component',
   status:active?.status||'MODELLED',reason:active?.reason||'Live power sampler unavailable'});
 }
}
 else if(a.type==='rocket-stage'){const stageNo=+(a.id.match(/-stage-(\d+)$/)||[])[1],mission=sources.launch?.launches?.find(m=>m.id===a.parentId),part=mission?.profile?.stageParts?.[stageNo];if(part)for(const [name,value,unit] of [['Dry structure',part.dryKg,'mass'],['Propellant',part.propKg,'mass'],['Rated thrust',part.thrustN,'force']])results.push({id:a.id+':'+name,type:unit==='force'?'engine':unit==='mass'?'tank':'payload',label:name,source:'Stage simulation',properties:{[unit]:value},status:'Model-derived'});}
 else if(a.type==='rocket'){results.push({id:a.id+':payload',type:'payload',label:'Payload / mission',properties:{},source:'Launch system',status:'Modeled'});}
 else if(['truck','remote-rover','satellite'].includes(a.type)){if(a.capacityJ>0)results.push({id:a.id+':battery',type:'battery',label:'Battery pack',source:'Legacy vehicle or satellite store',status:'Model-derived',properties:{capacityJ:a.capacityJ,energyJ:a.energyJ}});
 if(a.type==='truck')for(const [key,type] of [['Traction drive','drive'],['Floodlights','sensor'],['Recovery winch','payload'],['Charge port','battery']])results.push({id:a.id+':'+key,type,label:key,source:'Truck subsystem',status:'Partially modeled',properties:{}});
 if(a.type==='satellite'){
 const sat=sources.launch?.satellites?.find(v=>v.id===a.id),ops=sat?.ops7c;
 for(const [key,type,props] of [['Radio transceiver','antenna',{enabled:ops?.radioEnabled??null,radioPowerW:root.StarfallSatelliteOps7C?.CONFIG.radioW??null}],['Solar array','solar',{ratedPowerW:ops?.solarW??null,currentGenerationW:ops?.lastSolarW??null,shadow:ops?.lastEclipse??null}],['Science payload','sensor',{sensor:ops?.sensor??'none',onboardRecords:ops?.storage?.length??0,receivedRecords:ops?.received?.length??0}],['Attitude bus','chassis',{pointing:ops?.pointing??'nadir',busConsumptionW:ops?.lastLoadW??null}],['Thermal controller','radiator',{temperatureK:ops?.temperatureK??null,heaterPowerW:ops?.heaterW??null}]])results.push({id:a.id+':'+key,type,label:key,source:'Live 7C satellite operations store',status:ops?'Model-derived / live':'Legacy orbit (7C not initialized)',properties:props});
 }
 if(a.type==='remote-rover')for(const [key,type] of [['Wheel drive','drive'],['Science instruments','sensor']])results.push({id:a.id+':'+key,type,label:key,source:'Remote rover subsystem',status:'Partially modeled',properties:{}});}
 else {const spec=sources.outpostSpecs?.[a.type];if(spec){const comp=details(a.id+':'+a.type,a.type,spec);comp.label=spec.label||pretty(a.type);comp.source='Outpost specification';comp.status='Modeled';results.push(comp);}}
 if(!results.length){for(const c of a.components||[]){const id=typeof c==='string'?c:c?.id;if(id)results.push({...details(id,c?.type||id,c),source:'Registry',status:'Model-derived'});}}
 return results.slice(0,40);}
function build(asset,sources={}){if(!asset)return null;const source=sources.outposts?.items?.find(x=>x.id===asset.id),stats=['ship','rover'].includes(asset.type)?sources.vehicles?.get?.(asset.type):null,mission=sources.launch?.launches?.find(x=>x.id===asset.id);let state='Modeled';if(['ship','rover','truck'].includes(asset.type))state='Live / legacy store';if(source)state='Live / outpost store';if(asset.type==='satellite')state='Analytic orbital model';if(asset.type==='remote-rover')state='Saved / remote store';
 const capacity=asset.capacityJ||0,charge=capacity?clamp(asset.energyJ/capacity,0,1):null,metrics=[];
 if(capacity>0){metrics.push({name:'Stored energy',value:quantity(asset.energyJ,'energy'),detail:'Battery charge',fraction:charge,type:'energy'});metrics.push({name:'Battery capacity',value:quantity(capacity,'energy')});}
 if(asset.massKg>0)metrics.push({name:'Mass',value:quantity(asset.massKg,'mass')});
 if(asset.fuelKg>0)metrics.push({name:'Propellant',value:quantity(asset.fuelKg,'mass')});
 if(stats?.state&&finite(stats.state.temperatureK))metrics.push({name:'Temperature',value:quantity(stats.state.temperatureK,'temperature'),detail:'Vehicle system (modeled)'});
 if(source){const rep=sources.powerReports?.get?.(source.bodyId)?.byId?.[source.id];if(rep&&finite(rep.generatedW)&&rep.generatedW>0)metrics.push({name:'Current generation',value:quantity(rep.generatedW,'power'),detail:'Model-derived · active grid tick'});if(rep&&typeof rep.power==='boolean')metrics.push({name:'Electrical state',value:rep.power?'Powered':'Unpowered',detail:'Outpost power network'});if(finite(source.temperatureK))metrics.push({name:'Temperature',value:quantity(source.temperatureK,'temperature')});const spec=sources.outpostSpecs?.[source.kind];if(spec){if(spec.solarW)metrics.push({name:'Rated solar',value:quantity(spec.solarW,'power'),detail:'Nameplate maximum — not live output'});if(spec.watts)metrics.push({name:'Rated load',value:quantity(spec.watts,'power')});}if(source.kind==='lab')metrics.push({name:'Stored records',value:String(source.samples?.length||0)});}
 if(mission){if(mission.flight&&sources.launch&&root.StarfallRocketFlight7B){const f=mission.flight,el=root.StarfallRocketFlight7B.elements(f,mission.profile.mu,mission.profile.radiusM);if(el){metrics.push({name:'Apoapsis',value:quantity(el.apoapsisM,'distance'),detail:'Computed from orbital energy'});metrics.push({name:'Periapsis',value:quantity(el.periapsisM,'distance'),detail:'Computed from angular momentum'});metrics.push({name:'Rocket stage',value:(f.stageIndex+1)+' / '+mission.profile.stages});}}if(finite(mission.trajectoryAltitudeM))metrics.push({name:'Altitude',value:quantity(mission.trajectoryAltitudeM,'distance'),detail:mission.flight?'Force-integrated trajectory':'Legacy guided trajectory'});if(finite(mission.velocityMS))metrics.push({name:'Speed',value:number(mission.velocityMS,1)+' m/s'});}
 if(asset.location?.frame==='orbit'&&finite(asset.location.altitudeM))metrics.push({name:'Orbital altitude',value:quantity(asset.location.altitudeM,'distance')});
 if(asset.type==='satellite'){const sat=sources.launch?.satellites?.find(v=>v.id===asset.id),op=sat?.ops7c;if(op){metrics.push({name:'Solar generation',value:quantity(op.lastSolarW,'power'),detail:op.lastEclipse?'In eclipse / model-derived':'Sunlit / model-derived'});metrics.push({name:'Bus load',value:quantity(op.lastLoadW,'power'),detail:'Model-derived'});metrics.push({name:'Bus temperature',value:quantity(op.temperatureK,'temperature'),detail:'Lumped thermal approximation'});metrics.push({name:'Queued science',value:(op.storage?.length||0)+' records',detail:'Not yet downlinked'});metrics.push({name:'Data received',value:(op.received?.length||0)+' records',detail:'Ground link confirmed'});metrics.push({name:'Radio state',value:op.radioEnabled&&op.enabled?'Enabled':'Offline',detail:'Current satellite config'});}}
 metrics.push({name:'Condition',value:quantity(asset.health,'percent'),fraction:asset.health,type:'health'});
 const components=componentsFor(asset,sources),connections=source? (sources.outposts?.wires||[]).filter(w=>w.a===asset.id||w.b===asset.id).map(w=>w.a===asset.id?w.b:w.a):[];
 const transfers=(sources.registry?.transfers||[]).filter(t=>t.sourceId===asset.id||t.targetId===asset.id).slice(-6).reverse();
 const events=(sources.registry?.events||[]).filter(e=>e.assetId===asset.id).slice(-5).reverse();
 const warnings=[];if(asset.status==='offline'||source?.enabled===false)warnings.push('Asset is offline');if(asset.health<.25)warnings.push('Low component condition');if(charge!==null&&charge<.1)warnings.push('Low stored energy');
 return{asset,heading:pretty(asset.type),state,metrics,components,connections,transfers,events,warnings,charge};}
const api={number,quantity,pretty,kindFor,componentsFor,build};root.StarfallAssetView7A1=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
