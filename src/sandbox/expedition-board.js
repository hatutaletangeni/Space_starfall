/* STARFALL 6J — optional, evidence-based sandbox suggestions; no quests or rewards. */
(function(root){'use strict';
const array=x=>Array.isArray(x)?x:[];
const cleanId=x=>typeof x==='string'?x.slice(0,170):'';
const int=(n,a=0,b=1e9)=>Number.isFinite(n)?Math.max(a,Math.min(b,Math.floor(n))):a;
const cleanString=(s,n=180)=>typeof s==='string'?s.slice(0,n):'';
function sanitizeSaved(raw){const data=raw&&typeof raw==='object'?raw:{};
 const snoozed=Array.from(new Set(array(data.snoozed).filter(x=>typeof x==='string'&&x.length&&x.length<=170))).slice(-160);
 const focus=snoozed.includes(data.focus)?'':cleanId(data.focus);
 const milestones=[];const seen=new Set();for(const r of array(data.milestones).slice(-100))if(r&&typeof r.id==='string'&&!seen.has(r.id)&&/^field:/.test(r.id)){
   milestones.push({id:cleanId(r.id),label:cleanString(r.label,100),bodyId:cleanId(r.bodyId),timeS:int(r.timeS,0,1e13)});seen.add(r.id);}
 return{schema:1,snoozed,focus,milestones:milestones.slice(-80),visible:data.visible!==false};}
function evidence(state){const s=state||{}, bodyId=cleanId(s.bodyId),onBody=r=>r&&r.bodyId===bodyId, observation=array(s.observations), discoveries=array(s.discoveries), ruins=array(s.ruins),ecology=array(s.ecology),events=array(s.events),interiors=array(s.interiors),structures=array(s.structures),receipts=array(s.receipts),waypoints=array(s.waypoints),candidates=array(s.candidates),ruinSites=array(s.ruinSites),ecologySites=array(s.ecologySites);
 return{bodyId,landed:!!s.landed,eva:!!s.eva,timeS:int(s.timeS,0,1e13),worldName:cleanString(s.worldName,100)||'This world',observations:observation,localMeasurements:observation.filter(onBody),discoveries,localDiscoveries:discoveries.filter(onBody),ruins,localRuins:ruins.filter(onBody),ecology,localEcology:ecology.filter(onBody),events,localEvents:events.filter(onBody),interiors,localInteriors:interiors.filter(onBody),structures,localStructures:structures.filter(onBody),receipts,localReceipts:receipts.filter(onBody),waypoints,localWaypoints:waypoints.filter(onBody),labPower:array(s.labPower).filter(x=>x.bodyId===bodyId),candidates:candidates.filter(onBody),ruinSites:ruinSites.filter(onBody),ecologySites:ecologySites.filter(onBody),activeEvent:s.activeEvent?.bodyId===bodyId?s.activeEvent:null};}
function suggest(state,limit=24){const s=evidence(state),out=[],seen=new Set();
 function add(id,type,title,detail,action,priority,reason,bodyId=s.bodyId){if(!id||!action||!title||seen.has(id))return;seen.add(id);out.push({id,type,title,detail,action,priority,reason,bodyId});}
 if(!s.bodyId){add('global:approach','navigation','Choose a world to explore','Open the star chart, navigate to a landable world, and descend to the surface.','chart-open',10,'No nearby planetary exploration context is active.','');}
 else if(!s.landed){add('world:'+s.bodyId+':land','navigation','Land and begin a surface survey','Descend naturally to investigate local geology, ancient sites, ecology and weather.','chart-open',10,'A landable body is in range but surface exploration is not active.');}
 else{
  // One candidate at a time: avoid exposing unconfirmed discoveries and overwhelming the panel.
  const stageOrder=[1,2,3,0];const incomplete=s.localDiscoveries.filter(x=>int(x.stage,0,4)<4).sort((a,b)=>stageOrder.indexOf(int(a.stage,0,4))-stageOrder.indexOf(int(b.stage,0,4))||String(a.id).localeCompare(String(b.id)));
  for(const r of incomplete.slice(0,5)){
   const stage=int(r.stage,0,4),kind=r.category==='archaeological'?'archaeological':'geological',step=stage===0?'Map an unidentified signal':stage===1?'Examine a mapped signal':stage===2?'Collect instrument evidence': 'Archive measured evidence in a lab';
   add('site:'+s.bodyId+':'+cleanId(r.id),'science',step,stage===0?'Survey the candidate first.':stage===1?'Approach this surveyed site in EVA to inspect it.':stage===2?'Take a compatible field reading near the site, then link the evidence.':'Deliver the existing instrument observations to a powered laboratory and confirm receipt.','discovery-open',110-stage*7,kind+' investigation, stage '+stage+'/4.');
  }
  if(!s.localDiscoveries.some(r=>int(r.stage,0,4)>=1)&&s.candidates.length)add('world:'+s.bodyId+':survey','science','Map a local anomaly','Use the Expedition Notebook to classify a nearby signal. Mapping is not proof of its origin.','discovery-open',95,'Unmapped local candidates exist.');
  const pendingRuins=s.localRuins.filter(r=>int(r.level,0,3)<2);
  if(s.ruinSites.length&&!s.localRuins.some(r=>int(r.level,0,3)>=2))add('world:'+s.bodyId+':archaeology','archaeology','Investigate ancient structures','Find a seeded archaeological candidate and perform an on-foot architectural examination.','ruin-open',83,'Ancient structures detected, no field-examined local ruin recorded.');
  else if(pendingRuins.length)add('world:'+s.bodyId+':archaeology','archaeology','Examine surveyed ruins','Approach a surveyed ruin and inspect its structure.','ruin-open',79,'A ruin is mapped but has not been closely examined.');
  const examined=s.localRuins.filter(r=>int(r.level,0,3)>=2);
  if(examined.some(r=>!s.localInteriors.some(a=>a.siteId===r.id)))add('world:'+s.bodyId+':interior','archaeology','Explore an ancient interior','Walk into an examined structure and inspect a real artifact inside.','interior-open',87,'At least one examined ruin lacks an interior artifact record.');
  const lifeRecords=s.localEcology.filter(r=>int(r.stage,0,3)<3);
  if(lifeRecords.length){const top=lifeRecords.find(r=>r.stage>=1)||lifeRecords[0];add('ecology:'+s.bodyId+':'+cleanId(top.id),'biology',top.stage>=2?'Corroborate a biological finding':top.stage>=1?'Observe an ecological candidate':'Survey possible ecological traces',top.stage>=2?'Take a compatible bioassay (or mineral reading for fossils) and link it.':top.stage>=1?'Move within close-observation range and examine the candidate.':'Survey the candidate before attempting to classify it.','ecology-open',84,'An ecological investigation remains incomplete.');}
  else if(s.ecologySites.length&&!s.localEcology.some(r=>r.stage>=1))add('world:'+s.bodyId+':biology','biology','Investigate ecological traces','Survey local ecology candidates; some are geological fossils rather than living organisms.','ecology-open',68,'Nearby procedural ecological signatures available.');
  if(s.activeEvent&&!s.localEvents.some(r=>r.id===s.activeEvent.id))add('event:'+s.bodyId+':'+cleanId(s.activeEvent.id),'environment','Record a transient planetary event','Observe the active event while it is happening; a compatible timed instrument reading can corroborate it.','events-open',98,'An environmental event is currently active.');
  else if(s.localEvents.some(r=>!array(r.measurementIds).length))add('world:'+s.bodyId+':events','environment','Corroborate an environmental observation','Use the event journal to link a compatible field reading taken during that event.','events-open',60,'An event record has no linked instrument evidence.');
  const distinctBiomes=new Set(s.localMeasurements.map(o=>o.biome).filter(x=>typeof x==='string'&&x.trim()));
  if(distinctBiomes.size<3)add('world:'+s.bodyId+':biome-diversity','science','Measure three different local biomes','Travel through contrasting terrain types and collect one Field Science reading in each; recorded biome metadata counts as evidence.','field-open',distinctBiomes.size?44:30,'Measurements currently cover '+distinctBiomes.size+' distinct labeled biome(s).');
  const mineralReadings=s.localMeasurements.filter(o=>['spectrometer','sampler'].includes(o.instrument));
  if(mineralReadings.length===1)add('world:'+s.bodyId+':mineral-repeat','science','Compare mineral readings from two sites','Visit a different location and repeat a mineral measurement using Field Science. Compare your saved journal values and uncertainty.','field-open',32,'Only one local mineral measurement has been recorded.');
if(!s.localMeasurements.length)add('world:'+s.bodyId+':measure','science','Establish a scientific baseline','Use Field Science to record a measured local value; repeated observations help compare regions.','field-open',77,'No instrument measurements recorded on this world.');
  const labs=s.localStructures.filter(x=>x.kind==='lab');
  if(!labs.length&&s.localMeasurements.length)add('world:'+s.bodyId+':lab','engineering','Establish a research laboratory','Place a lab and a power system, connect the modules, then transmit actual readings.','outpost-open',52,'Local measurements exist but no laboratory has been constructed here.');
  if(labs.length&&s.labPower.some(x=>x.powered===false))add('world:'+s.bodyId+':grid','engineering','Restore laboratory power','Inspect connected power sources, cables and solar conditions in Outpost Engineering.','outpost-open',82,'A local lab is currently reporting unpowered.');
  if(labs.length&&s.localMeasurements.some(x=>!s.localReceipts.some(r=>r.observationId===x.id)))add('world:'+s.bodyId+':deliver','engineering','Transmit new measurements to your lab','Check laboratory power, wiring and radio connectivity before sending actual collected readings.','outpost-open',72,'One or more measured observations lack lab receipts on this world.');
  if(!s.localWaypoints.length)add('world:'+s.bodyId+':waypoint','navigation','Mark a destination on your survey map','Select a surface location and save a waypoint to plan your next EVA or rover excursion.','survey-open',27,'No local waypoints recorded.');
 }
 if(new Set(s.discoveries.map(x=>x.bodyId).filter(Boolean)).size>=2)add('global:compare','science','Compare findings between worlds','Open the Expedition Notebook comparison and review documented evidence, not speculative conclusions.','discovery-open',35,'You have investigation records from multiple worlds.','');
 return out.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id)).slice(0,int(limit,0,50));}
function milestones(state){const s=evidence(state),m=[];
 const add=(id,label,bodyId='')=>m.push({id:'field:'+id,label,bodyId,timeS:s.timeS});
 if(s.observations.length)add('first-measurement','Collected first scientific instrument reading');
 if(s.discoveries.some(r=>r.stage>=2))add('first-field-site','Completed first close field investigation');
 if(s.discoveries.some(r=>r.stage>=3))add('first-corroborated-site','Linked field evidence to a discovery');
 if(s.ruins.some(r=>r.level>=2))add('first-ruin','Field-examined an ancient structure');
 if(s.interiors.length)add('first-artifact','Recorded an artifact inside an ancient ruin');
 if(s.ecology.some(r=>r.stage>=2))add('first-ecology','Completed first close ecology observation');
 if(s.ecology.some(r=>r.stage>=3))add('first-ecology-evidence','Linked a compatible biosignature or mineral reading');
 if(s.events.length)add('first-event','Observed an active planetary event');
 if(s.events.some(r=>array(r.measurementIds).length))add('first-event-evidence','Linked a time-matched instrument reading to an event');
 if(s.structures.some(x=>x.kind==='lab'))add('first-lab','Constructed a research laboratory');
 if(s.receipts.length)add('first-receipt','Received a scientific measurement at a laboratory');
 if(s.waypoints.length)add('first-waypoint','Saved a planetary navigation waypoint');
 const worlds=new Set([...s.observations,...s.discoveries,...s.ruins,...s.ecology,...s.events].map(r=>r.bodyId).filter(Boolean));
 if(worlds.size>=2)add('multi-world','Recorded investigations on two different worlds');
 return m;}
function reconcile(prev,state){const data=sanitizeSaved(prev),items=milestones(state),seen=new Set(data.milestones.map(x=>x.id)),gained=[];
 for(const item of items)if(!seen.has(item.id)){data.milestones.push(item);gained.push(item);seen.add(item.id);}data.milestones=data.milestones.slice(-80);return{data,gained};}
function visibleTasks(tasks,raw,includeHidden=false){const s=sanitizeSaved(raw),items=tasks.filter(t=>includeHidden||!s.snoozed.includes(t.id));return items.sort((a,b)=>(a.id===s.focus?-1:0)-(b.id===s.focus?-1:0)).map(t=>({...t,focused:s.focus===t.id,hidden:s.snoozed.includes(t.id)}));}
root.StarfallExpeditionBoard={evidence,suggest,milestones,reconcile,sanitizeSaved,visibleTasks};
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallExpeditionBoard;
})(globalThis);
