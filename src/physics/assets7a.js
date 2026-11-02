/* STARFALL Update 7A — shared engineering data contracts and conservation ledger.
   Source legacy simulation stores remain authoritative for their physics until the
   corresponding adapter is deliberately migrated; this registry is a bounded,
   versioned read-through projection with independent transfer accounting.
   SI: kg,m,s,N,J,W,K,rad. Positions carry explicit frame tags. */
(function(root){'use strict';
const SCHEMA=1,MAX_ASSETS=800,MAX_EVENTS=120,MAX_TRANSFERS=150;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const nonnegative=n=>finite(n)&&n>=0;
const textId=s=>typeof s==='string'&&/^[A-Za-z0-9_:\-.]{1,120}$/.test(s);
const vec3=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
const deep=x=>JSON.parse(JSON.stringify(x));
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const COMP=Object.freeze({
 battery:Object.freeze({unit:'J',connectors:['dc'],rated:{voltageV:48},failure:['overcharge','overcurrent','thermal']}),
 solar:Object.freeze({unit:'W',connectors:['dc'],failure:['eclipse','occlusion','wiring']}),
 generator:Object.freeze({unit:'W',connectors:['dc'],failure:['fuel','thermal']}),
 drive:Object.freeze({unit:'N·m',connectors:['dc','shaft'],failure:['stall','overcurrent']}),
 engine:Object.freeze({unit:'N',connectors:['propellant','thrust'],failure:['starvation','overheat']}),
 tank:Object.freeze({unit:'kg',connectors:['propellant'],failure:['empty','leak']}),
 antenna:Object.freeze({unit:'W',connectors:['dc','data'],failure:['occlusion','power']}),
 sensor:Object.freeze({unit:'W',connectors:['dc','data'],failure:['calibration','range']}),
 radiator:Object.freeze({unit:'W',connectors:['thermal'],failure:['overheat']}),
 chassis:Object.freeze({unit:'kg',connectors:['mount'],failure:['structural']}),
 payload:Object.freeze({unit:'kg',connectors:['mount','data'],failure:['deployment']})});
function location(x){if(!x||!['surface','orbit','free','attached','unknown'].includes(x.frame))throw Error('Explicit coordinate frame required');
 if(x.frame==='surface'&&(!textId(x.bodyId)||!vec3(x.local)))throw Error('Invalid planet-fixed location');
 if(x.frame==='orbit'&&(!textId(x.bodyId)||!nonnegative(x.altitudeM)||!finite(x.epochS)))throw Error('Invalid orbital location');
 if(x.frame==='free'&&!vec3(x.positionScene))throw Error('Invalid free position');
 if(x.frame==='attached'&&!textId(x.parentId))throw Error('Invalid parent');return deep(x);}
function component(kind,id,properties={}){const spec=COMP[kind];if(!spec||!textId(id))throw Error('Unknown engineering component');for(const [k,v] of Object.entries(properties)){if(k.endsWith('Kg')||k.endsWith('J')||k.endsWith('W')||k.endsWith('N'))if(!nonnegative(v))throw Error('Invalid SI component quantity: '+k);}return Object.freeze({id,type:kind,contract:spec,properties:deep(properties)});}
function asset(value){if(!value||!textId(value.id)||!textId(value.type))throw Error('Asset requires stable id and type');const energy=value.energyJ??0,capacity=value.capacityJ??0,fuel=value.fuelKg??0,mass=value.massKg??0;
 if(![energy,capacity,fuel,mass].every(nonnegative)||energy>capacity+1e-7)throw Error('Invalid asset mass, fuel or battery energy');
 if(value.bodyId!==null&&value.bodyId!==undefined&&!textId(value.bodyId))throw Error('Invalid body ID');
 const local=location(value.location??{frame:'unknown'});
 return{id:value.id,type:value.type,bodyId:value.bodyId||null,systemId:value.systemId||null,parentId:value.parentId||null,location:local,components:Array.isArray(value.components)?value.components.slice(0,40):[],massKg:mass,fuelKg:fuel,energyJ:energy,capacityJ:capacity,health:clamp(value.health??1,0,1),status:String(value.status||'available').slice(0,100),updatedS:nonnegative(value.updatedS)?value.updatedS:0,owner:value.owner||'legacy'};}
function transfer(from,to,deliveredJ,options={}){const eta=options.efficiency??.92,maxJ=options.maxSourceJ??Infinity;
 if(!nonnegative(deliveredJ)||!(finite(eta)&&eta>0&&eta<=1)||!(nonnegative(maxJ)||maxJ===Infinity))throw Error('Invalid transfer parameters');
 if(from.id===to.id)throw Error('Cannot transfer energy to same asset');
 for(const value of [from.energyJ,from.capacityJ,to.energyJ,to.capacityJ])if(!nonnegative(value))throw Error('Invalid stored energy');
 if(from.energyJ>from.capacityJ+1e-8||to.energyJ>to.capacityJ+1e-8)throw Error('Overcharged source or destination');
 const draw=Math.min(from.energyJ,maxJ,deliveredJ/eta,(to.capacityJ-to.energyJ)/eta),received=draw*eta;
 const answer={fromEnergyJ:from.energyJ-draw,toEnergyJ:to.energyJ+received,drawnJ:draw,deliveredJ:received,lossJ:draw-received,efficiency:eta};
 if(answer.fromEnergyJ<0||answer.toEnergyJ>to.capacityJ+1e-6)throw Error('Nonconserving transfer');return answer;
}
function observe(o){if(!o||!textId(o.id)||!textId(o.sourceAssetId)||!textId(o.bodyId)||!finite(o.timeS)||o.timeS<0||!finite(o.value)||!nonnegative(o.uncertainty))throw Error('Observation needs source, body, time, value, uncertainty');return{schema:1,id:o.id,sourceAssetId:o.sourceAssetId,bodyId:o.bodyId,location:location(o.location),timeS:o.timeS,instrument:String(o.instrument||'unknown'),value:o.value,unit:String(o.unit||'unitless'),uncertainty:o.uncertainty,calibration:o.calibration||'unspecified',model:o.model||'procedural simulation',provenance:o.provenance||'in-game instrument'};}
class Registry{
 constructor(seed,saved){if(!Number.isSafeInteger(seed)||seed<0)throw Error('Invalid galaxy seed');this.seed=seed;this.assets=new Map();this.events=[];this.transfers=[];this.observations=[];this.initialProjected=false;this.serial=0;this.enabled=saved?.enabled!==false;this.restore(saved);}
 restore(saved){if(!saved||saved.schema!==SCHEMA||saved.seed!==this.seed)return;
  this.enabled=saved.enabled!==false;this.serial=nonnegative(saved.serial)?Math.min(1e8,saved.serial):0;
  if(Array.isArray(saved.assets))for(const a of saved.assets.slice(0,MAX_ASSETS)){try{const v=asset(a);if(!this.assets.has(v.id))this.assets.set(v.id,v);}catch(_){}}
  this.events=(Array.isArray(saved.events)?saved.events:[]).slice(-MAX_EVENTS).filter(e=>textId(e?.assetId)&&textId(e?.type)&&nonnegative(e.timeS));
  this.transfers=(Array.isArray(saved.transfers)?saved.transfers:[]).slice(-MAX_TRANSFERS).filter(e=>nonnegative(e.drawnJ)&&nonnegative(e.deliveredJ)&&e.drawnJ+1e-8>=e.deliveredJ);
  this.observations=(Array.isArray(saved.observations)?saved.observations:[]).slice(-200).filter(o=>textId(o?.id)&&textId(o?.bodyId)&&finite(o?.timeS));
 }
 upsert(data,emit=false){const a=asset(data),old=this.assets.get(a.id);if(!old&&this.assets.size>=MAX_ASSETS)throw Error('Registry capacity exceeded');this.assets.set(a.id,a);if(emit)this.event('ASSET_CREATED',a.id,a.updatedS);return a;}
 event(type,assetId,timeS,details={}){if(!textId(type)||!textId(assetId)||!nonnegative(timeS))throw Error('Invalid lifecycle event');this.events.push({type,assetId,timeS,details:deep(details)});if(this.events.length>MAX_EVENTS)this.events.shift();}
 recordObservation(o){const v=observe(o);if(this.observations.some(x=>x.id===v.id))return false;this.observations.push(v);if(this.observations.length>200)this.observations.shift();this.event('OBSERVATION_RECORDED',v.sourceAssetId,v.timeS,{observationId:v.id});return true;}
 recordTransfer(sourceId,targetId,report,timeS){if(!this.enabled||!(report.drawnJ>0))return;this.transfers.push({id:'transfer-'+this.seed+'-'+(++this.serial),sourceId,targetId,timeS,drawnJ:report.drawnJ,deliveredJ:report.deliveredJ,lossJ:report.lossJ});if(this.transfers.length>MAX_TRANSFERS)this.transfers.shift();this.event('POWER_CHANGED',targetId,timeS,{deliveredJ:report.deliveredJ});}
 project({vehicles,flight,outposts,launch,observations,timeS=0}={}){
  // Legacy adapters only read their original authoritative stores. Never sum energy
  // from both this projection and its source: it is a view, not a second battery.
  const existing=new Set(),add=v=>{if(existing.has(v.id))return;existing.add(v.id);const isNew=!this.assets.has(v.id);this.upsert(v);if(isNew&&this.initialProjected)this.event('ASSET_CREATED',v.id,timeS);};
  if(vehicles)for(const kind of ['ship','rover']){try{const v=vehicles.get(kind),f=flight||{},isShip=kind==='ship';const pose=isShip?f.shipPose:f.roverPose;add({id:v.definition?.id||'starfall-'+kind,type:kind,bodyId:pose?.bodyId,systemId:pose?.systemId,location:pose?.local?{frame:'surface',bodyId:pose.bodyId,local:pose.local}:{frame:'unknown'},massKg:v.stats.massKg,fuelKg:v.state.fuelKg||0,energyJ:v.state.energyJ||0,capacityJ:v.stats.batteryCapacityJ||0,health:v.state.health,status:'active',components:Object.values(v.definition?.slots||{}),updatedS:timeS});}catch(_){}}
  if(flight?.truckPose?.bodyId&&vec3(flight.truckPose.local))add({id:'starfall-truck',type:'truck',bodyId:flight.truckPose.bodyId,location:{frame:'surface',bodyId:flight.truckPose.bodyId,local:flight.truckPose.local},energyJ:flight.truckPose.batteryJ??0,capacityJ:44e6,health:1,updatedS:timeS});
  for(const p of outposts?.items||[]){if(!textId(p.id)||!vec3(p.local))continue;const cap=p.kind==='battery'?outpostsBatteryCapacity(p):0;add({id:p.id,type:p.kind,bodyId:p.bodyId,location:{frame:'surface',bodyId:p.bodyId,local:p.local},energyJ:p.kind==='battery'?clamp(p.energyJ||0,0,cap):0,capacityJ:cap,massKg:root.StarfallOutposts?.SPECS?.[p.kind]?.weightKg||0,health:p.condition??1,status:p.enabled===false?'offline':'available',updatedS:timeS});}
  for(const r of outposts?.relays||[]){if(!textId(r.id)||!textId(r.bodyId)||launch?.satellites?.some(x=>x.id===r.id))continue;add({id:r.id,type:'satellite',bodyId:r.bodyId,location:{frame:'orbit',bodyId:r.bodyId,altitudeM:(r.altitude||0)*1000,epochS:0,phase:r.phase||0,axis:r.axis,periodS:r.periodS,model:'legacy period-based relay'},status:r.enabled===false?'offline':'orbiting',updatedS:timeS});}
  for(const m of launch?.launches||[]){if(!textId(m.id))continue;add({id:m.id,type:'rocket',bodyId:m.bodyId,systemId:m.systemId,location:{frame:'unknown'},massKg:m.flight&&root.StarfallRocketFlight7B?root.StarfallRocketFlight7B.totalMass(m.flight,m.profile):(m.profile?.massKg||0),status:m.phase,updatedS:timeS});for(let i=0;i<(m.profile?.stageParts||[]).length;i++){const part=m.profile.stageParts[i];add({id:m.id+'-stage-'+i,type:'rocket-stage',bodyId:m.bodyId,parentId:m.id,location:{frame:'attached',parentId:m.id},massKg:(m.flight&&i<m.flight.stageIndex)?0:(part.dryKg||0)+(m.flight?.stageFuelKg?.[i]??part.propKg??0),status:m.flight&&i<m.flight.stageIndex?'discarded':m.phase,updatedS:timeS});}}
  for(const s of launch?.satellites||[]){if(!textId(s.id)||!textId(s.bodyId))continue;add({id:s.id,type:'satellite',bodyId:s.bodyId,systemId:s.systemId,location:{frame:'orbit',bodyId:s.bodyId,altitudeM:s.altitudeM,epochS:s.epochS,axis:s.axis,mu:s.mu,phase:s.phase},energyJ:clamp(s.ops7c?.energyJ??s.powerJ??0,0,s.ops7c?.capacityJ||5e7),capacityJ:s.ops7c?.capacityJ||5e7,health:1,status:s.ops7c?.enabled===false?'offline':'orbiting',updatedS:timeS});}
  for(const r of launch?.rovers||[]){if(!textId(r.id)||!vec3(r.local))continue;add({id:r.id,type:'remote-rover',bodyId:r.bodyId,systemId:r.systemId,location:{frame:'surface',bodyId:r.bodyId,local:r.local},energyJ:clamp(r.batteryJ||0,0,2.2e7),capacityJ:2.2e7,status:r.status,updatedS:timeS});}
  if(observations){for(const o of observations.slice(-120)){if(!o?.id||!textId(o.bodyId)||!vec3(o.location))continue;try{this.recordObservation({id:o.id,bodyId:o.bodyId,sourceAssetId:o.satelliteId||'starfall-fieldkit',location:{frame:'surface',bodyId:o.bodyId,local:o.location},timeS:o.timeS,value:o.value,uncertainty:o.uncertainty,instrument:o.instrument,unit:o.unit,calibration:o.calibrated?'calibrated':'unknown',provenance:o.satelliteId?'orbital science downlink / seeded approximation':'existing field-science journal'});}catch(_){}}}
  // Safe prune: only inventory categories fully represented by these provided stores.
  if(outposts&&launch)for(const [id,v] of this.assets){if(['satellite','remote-rover','rocket','rocket-stage',...Object.keys(root.StarfallOutposts?.SPECS||{})].includes(v.type)&&!existing.has(id)&&v.owner==='legacy')this.assets.delete(id);}
  this.initialProjected=true;return{total:this.assets.size,refreshed:existing.size};
 }
 serialize(){return{schema:SCHEMA,seed:this.seed,enabled:this.enabled,serial:this.serial,assets:[...this.assets.values()].map(deep).slice(0,MAX_ASSETS),events:deep(this.events),transfers:deep(this.transfers),observations:deep(this.observations)};}
 summary(){const a=[...this.assets.values()];return{total:a.length,byType:a.reduce((m,v)=>(m[v.type]=(m[v.type]||0)+1,m),{}),energyJ:a.reduce((s,v)=>s+v.energyJ,0),events:this.events.length,transfers:this.transfers.length,observations:this.observations.length,mode:this.enabled?'shared-interfaces':'classic-adapters'};}
}
function outpostsBatteryCapacity(item){return (root.StarfallOutposts?.SPECS?.battery?.capacityJ)||24e6;}
// A satellite's single ephemeris is StarfallLaunch.orbit; renderer/radio both call this.
function satellitePosition(sat,body,timeS,metresPerSceneUnit){if(!root.StarfallLaunch?.orbit)throw Error('Satellite ephemeris unavailable');return root.StarfallLaunch.orbit(sat,body,timeS,metresPerSceneUnit);}
const exported={SCHEMA,COMP,component,asset,location,transfer,observe,Registry,satellitePosition};root.StarfallEngineering7A=exported;if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof window!=='undefined'?window:globalThis);
