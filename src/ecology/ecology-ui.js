/* STARFALL 6H — field interface, persisted survey records, and bounded draw adapter.
   Nothing here creates measurements: all corroboration comes from Update 4 journal.
*/
(function(root){'use strict';
const E=root.StarfallEcology,Bio=root.StarfallLivingBiosphere,Fly=root.StarfallAerialFlight9C,Motion=root.StarfallLocomotion9D,Wild=root.StarfallBiomeWildlife9F,RT=root.StarfallRuntime,G=root.Starfall3D,V=G.V,ST=root.StarfallStableTerrain,$=id=>document.getElementById(id);
if(!E||!RT)throw Error('Ecology UI needs runtime and ecology layer');
const flierStates=new Map(),groundStates=new Map(),wildGround=new Map(),wildFly=new Map();let flierBody=null,wildBody=null,wildLocal=null,wildRecords=[];
const storageKey='ecology6h',initial=SF.load()?.[storageKey]||{};let records=E.sanitizeRecords(initial.records),biospheres=Bio?Bio.sanitize(initial.biospheres):[],bioDirty=false,lastBioSave=0,selectedId=null,candidates=[],lastLocal=null,lastBody=null,updatedAt=-Infinity;
function context(){const ctx=RT.outpostContext(),b=ctx.body;return b?.landable&&ctx.local?{...ctx,local:ST.normalize(ctx.local),body:b}:null;}
function sample(b,d){return G.sampleTerrain(b,d);}
function save(){SF.save({[storageKey]:{...initial,schema:1,records:records.slice(-300),biospheres:biospheres.slice(-Bio.MAX_PATCHES)}});bioDirty=false;lastBioSave=RT.time;}
function living(site,ctx){if(!Bio||!site||!ctx||site.group==='trace'||site.group==='fossil')return null;
 let p=biospheres.find(x=>x.id===site.id&&x.bodyId===site.bodyId);
 if(!p&&biospheres.length<Bio.MAX_PATCHES){p=Bio.seedPatch(site,ctx.body,RT.galaxy.seed,RT.galaxy,RT.time);
  if(p){biospheres.push(p);bioDirty=true;}}
 if(p&&RT.time>=p.lastS+Bio.STEP_S){const e=Bio.environment(ctx.body,site.local,RT.time,RT.galaxy.seed,RT.galaxy),r=Bio.advance(p,RT.time,e,12);
  if(r.steps){Object.assign(p,r.state);bioDirty=true;}}
 if(bioDirty&&RT.time-lastBioSave>=120)save();return p;
}
function region(force=false){const ctx=context();if(!ctx||!ctx.landed){candidates=[];lastBody=null;flierStates.clear();groundStates.clear();wildGround.clear();wildFly.clear();wildRecords=[];wildBody=null;wildLocal=null;flierBody=null;return null;}
 if(force||ctx.body.id!==lastBody||!lastLocal||E.arc(ctx.local,lastLocal,ctx.body.radius)>38){candidates=E.nearby(ctx.body,ctx.local,sample,5,RT.galaxy.seed,30);lastBody=ctx.body.id;lastLocal=[...ctx.local];updatedAt=RT.time;}
 return ctx;}
function current(){return candidates.find(s=>s.id===selectedId)||null;}
function rec(site){return records.find(r=>r.id===site.id&&r.bodyId===site.bodyId)||null;}
function linkedReadings(site,ctx){const readings=root.StarfallScienceUI?.journal||[];
 const instruments=site.kind==='fossil'?['sampler','spectrometer']:['bioassay'];
 return readings.filter(o=>o.bodyId===site.bodyId&&instruments.includes(o.instrument)&&Array.isArray(o.location)&&E.arc(o.location,site.local,ctx.body.radius)<=40).slice(-8);
}
function updateRecord(site,ctx,stage,measurements=[]){const previous=rec(site),r=previous||{id:site.id,bodyId:site.bodyId,kind:site.kind,stage:0,local:[...site.local],timeS:RT.time,measurementIds:[],note:''};
 r.stage=Math.max(r.stage,stage);r.timeS=RT.time;r.measurementIds=[...new Set([...(r.measurementIds||[]),...measurements])].slice(-8);if(!previous)records.push(r);if(records.length>300)records.shift();save();render();}
function status(txt,error=false){const node=$('ecology-status');node.textContent=txt;node.style.color=error?'#ffb09b':'#e4c58c';}
function detail(){const site=current(),ctx=context(),element=$('ecology-detail');if(!site||!ctx){element.textContent='No site selected.';return;}
 const r=rec(site),stage=r?.stage||0,kind=E.KINDS[site.kind],available=linkedReadings(site,ctx);
 element.textContent='SITE '+site.id+'\n'+(stage>=2?kind.label:'Unclassified ecological anomaly')+'\n'+site.biome+' · '+site.distance.toFixed(1)+' scene units\nStatus: '+['UNSURVEYED','REMOTE SURVEY','CLOSE OBSERVATION','INSTRUMENT-CORROBORATED'][stage]+'\n'+(stage>=1?'Signal: '+kind.signal+'\n':'')+(stage>=2?'Morphology model: '+site.kind+' · '+site.speciesId+'\n':'')+(site.kind==='fossil'?'Mineral evidence nearby: ':'Bioassay readings nearby: ')+available.length+'\n'+(available.length?'Newest index: '+available.at(-1).value.toFixed(2)+' ± '+available.at(-1).uncertainty.toFixed(2)+'\n':'')+'This is a fictional seeded hypothesis, NOT confirmed biology.'+
 (()=>{const p=living(site,ctx);return !p?'\nNo active local food web.':
 '\n\nLIVING PATCH (100m² model)\nProducers: '+p.plantKg.toFixed(2)+' kg   ·  grazers: '+p.agents.filter(a=>a.role==='grazer').length+
 '   ·  flyers: '+p.agents.filter(a=>a.role==='flier').length+
  '   ·  predators: '+p.agents.filter(a=>a.role==='predator').length+
 '   ·  detritivores: '+p.agents.filter(a=>a.role==='detritivore').length+
 '   ·  aquatic filterers: '+p.agents.filter(a=>a.role==='filterer').length+
 '   ·  aquatic predators: '+p.agents.filter(a=>a.role==='aquatic_predator').length+
 '\nWater: '+p.waterKg.toFixed(2)+' kg   ·  fertility: '+Math.round(p.fertility*100)+'%'+
 '\nCO₂: '+p.carbonDioxideKg.toFixed(2)+' kg   ·  O₂: '+p.oxygenKg.toFixed(2)+' kg'+
 '\nDetritus: '+p.detritusKg.toFixed(2)+' kg   ·  born: '+p.births+'   ·  died: '+p.deaths+
 '\nConsumed plants: '+p.consumedPlantsKg.toFixed(2)+' kg   ·  predation: '+p.kills+
 '\nSpecies diversity estimate: '+p.speciesCount+'   ·  intelligence tier: '+p.intelligenceTier+
 '\nLiving fauna: grazers herd and flee, hunters pursue prey, burrowers forage detritus, filterers swim, four-sailed fliers bank and flap.'+
  '\nModel clock: '+Math.round(p.lastS)+' s (may be catching up)';})() ;
 $('ecology-notes').value=r?.note||'';
}
function render(){const ctx=region(true),listing=$('ecology-sites');listing.replaceChildren();if(!ctx){$('ecology-context').textContent='Land on a solid world and explore its surface.';$('ecology-detail').textContent='No accessible surface.';return;}
 const cl=E.climate(ctx.body,RT.galaxy.seed),w=Bio?.world(ctx.body,RT.galaxy.seed,RT.galaxy);
 const sightings=Wild?.nearby(ctx.body,ctx.local,sample,w,RT.galaxy.seed,{max:12,distance:215})||[];
 $('ecology-context').textContent=ctx.body.name+' · '+(w?.life?'Living biosphere potential (tier '+w.level+')':cl.suitable?'Potentially hospitable':'No supported active biosphere')+' · '+(w?.speciesCount||0)+' possible species · modeled temperature '+cl.temperatureK.toFixed(0)+' K · pressure '+(cl.pressurePa/1000).toFixed(0)+' kPa · '+records.length+' saved observations.\nBiome wildlife nearby: '+sightings.length+' encounters (seeded observations, not verified biological discoveries).';
 if(!candidates.length)listing.textContent='No seeded ecology signals nearby. Another biome or planet may hold more.';
 for(const s of candidates){const r=rec(s),button=document.createElement('button');button.type='button';button.className=s.id===selectedId?'active':'';button.textContent=(r?.stage>=2?E.KINDS[s.kind].label:r?.stage?'Possible '+E.KINDS[s.kind].group+' signal':'Unsurveyed local signature')+' · '+Math.round(s.distance)+' u · '+s.biome;button.onclick=()=>{selectedId=s.id;detail();for(const el of listing.querySelectorAll('button'))el.classList.toggle('active',el===button);};listing.append(button);}
 if(!candidates.some(x=>x.id===selectedId))selectedId=candidates[0]?.id||null;detail();}
function operate(stage){try{const ctx=region(true),s=current();if(!ctx||!s)throw Error('Select a nearby ecology site on a landed world.');
 if(stage===1){if(s.distance>180)throw Error('Approach within 180 scene units to map this signal.');updateRecord(s,ctx,1);status('Remote ecological candidate mapped. Move closer to observe.');}
 else if(stage===2){if(RT.interiorState)throw Error('Leave the ruin interior to observe planetary ecology.');if(!ctx.eva||ctx.roverOccupied)throw Error('Leave your ship or rover and investigate in EVA.');if(s.distance>24)throw Error('Move within 24 scene units to observe this site.');if((rec(s)?.stage||0)<1)throw Error('Map the candidate signal before investigating it.');updateRecord(s,ctx,2);status('Close field observation archived. Take '+(s.kind==='fossil'?'a spectrometer or sampler reading':'a field BIOASSAY')+' for evidence.');}
 else{if((rec(s)?.stage||0)<2)throw Error('First complete a close field observation.');const observations=linkedReadings(s,ctx);if(!observations.length)throw Error('No matching instrument evidence nearby. Use FIELD SCIENCE to collect '+(s.kind==='fossil'?'a spectrometer or sampler':'a bioassay')+' reading within 40 units.');updateRecord(s,ctx,3,observations.map(x=>x.id));status('Instrument observations linked. This remains a procedural hypothesis, not confirmed biology.');}
 }catch(err){status(err.message,true);}}
function exportData(){const blob=new Blob([JSON.stringify({schema:1,seed:RT.galaxy.seed,model:'fictional seeded local biospheres, NOT a planetary gas ledger',records,biospheres},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='starfall-ecology-journal.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
// 9F: camera-independent planet-fixed fauna streaming beyond sparse field sites.
// This uses bounded, ephemeral encounter poses: 9A continues to own all edible
// biomass, metabolism, birth/death and industrial matter bookkeeping.
function wildScene(ctx,world,envAt,objects,addObject){
 if(!Wild||!Motion||!Fly||!world?.life||world.subsurface||objects.length>=18)return;
 if(wildBody!==ctx.body.id){
  wildBody=ctx.body.id;wildGround.clear();wildFly.clear();
  wildLocal=null;wildRecords=[];
 }
 if(!wildLocal||E.arc(ctx.local,wildLocal,ctx.body.radius)>24){
  wildLocal=[...ctx.local];
  wildRecords=Wild.nearby(ctx.body,ctx.local,sample,world,RT.galaxy.seed,{max:12,distance:215,span:3});
 }
 if(!wildRecords.length)return;
 const axis=ctx.body.spinAxis||[0,1,0],spin=ctx.body.spinAngle||0;
 const gravity=root.StarfallPhysics?.bodyProfile?.(ctx.body)?.surfaceGravityMS2||9.81;
 const phaseFor=id=>root.StarfallFieldScience.rand(id+':phase')*6.28318530718;
 const light=envAt?.light??.5;
 // Keep 9A creatures visible when the two visual systems share territory.
 for(const animal of wildRecords){
  if(objects.length>=18)break;
  if(candidates.some(s=>s.distance<55&&E.arc(s.local,animal.local,ctx.body.radius)<18))continue;
  const frame=E.basis(animal.local),base=sample(ctx.body,animal.local).height;
  const relative=V.mul(V.sub(ctx.local,animal.local),ctx.body.radius);
  const player=[V.dot(relative,frame.east),V.dot(relative,frame.north)];
  const phase=phaseFor(animal.id),flying=animal.role==='flier',
   swim=animal.role==='filterer'||animal.role==='aquatic_predator';
  if(flying){
   let s=wildFly.get(animal.id)||Fly.start(animal.id,animal.massKg,animal.sizeM,RT.time);
   const previous=E.offset(animal.local,s.p[0],s.p[2],ctx.body.radius);
   const ground=sample(ctx.body,previous).height;
   const close=Math.hypot(player[0]-s.p[0],player[1]-s.p[2])<24?player:null;
   s=Fly.advance(s,RT.time,{massKg:animal.massKg,sizeM:animal.sizeM,
      rhoKgM3:Fly.airDensity(world.pressurePa,world.temperatureK),
      gravityMS2:gravity,floorY:ground-base,
      foraging:animal.energy<.73,threat:close});
   wildFly.set(animal.id,s);
   const local=E.offset(animal.local,s.p[0],s.p[2],ctx.body.radius);
   const positionHeight=sample(ctx.body,local).height;
   const altitude=Math.max(1.2,s.p[1]+base-positionHeight);
   const orient=E.basis(local),up=V.rot(orient.up,axis,spin),
     east=V.rot(orient.east,axis,spin),north=V.rot(orient.north,axis,spin);
   const forward=V.norm(V.add(V.add(V.mul(east,s.v[0]),V.mul(north,s.v[2])),V.mul(up,s.v[1])));
   const right=V.norm(V.cross(forward,up));
   const tilted=V.norm(V.add(V.mul(up,Math.cos(s.bank)),V.mul(right,Math.sin(s.bank))));
   addObject({id:animal.id},animal.kind,local,altitude,animal.id,animal.sizeM,s.flightMode,{
      alive:true,encounterOnly:true,up:tilted,forward,heartPhase:RT.time*8.1+phase,
      digestion:.25,wingPhase:Math.max(.0001,s.wingPhase),
      bodyPulse:Math.max(.0001,RT.time*2.4+phase)
   });
  }else{
   const last=wildGround.get(animal.id),previous=E.offset(animal.local,last?.p[0]||0,last?.p[1]||0,ctx.body.radius);
   const prevHeight=sample(ctx.body,previous).height;
   const peers=wildRecords.filter(a=>a.cellId===animal.cellId&&a.role!=='flier').map(a=>{
      const state=wildGround.get(a.id)||Motion.start(a,RT.time);
      return{id:a.id,role:a.role,p:state.p};
   });
   const traversable=(x,z,role)=>{
      const dir=E.offset(animal.local,x,z,ctx.body.radius),terrain=sample(ctx.body,dir);
      const biome=root.StarfallBiomes.classify(ctx.body,dir,terrain.height,terrain.field);
      if(role==='filterer'||role==='aquatic_predator')return biome.material==='water';
      const delta=Math.abs(terrain.height-prevHeight),step=Math.hypot(x-(last?.p[0]||0),z-(last?.p[1]||0));
      return biome.material!=='water'&&delta<Math.max(1.25,step*.9);
   };
   const s=Motion.advance(last,animal,RT.time,peers,{
      player,light,plantKg:animal.role==='grazer'?1:0,
      detritusKg:animal.role==='detritivore'?1:0,traversable
   });
   wildGround.set(animal.id,s);
   const local=E.offset(animal.local,s.p[0],s.p[1],ctx.body.radius),
     terrain=sample(ctx.body,local);
   const waterDepth=1.15+.22*s.altitude*-1;
   const altitude=swim?Math.max(.35,2.1-waterDepth-terrain.height):
                        Math.max(.04,Math.min(.5,s.altitude));
   const speed=Math.hypot(...s.v);
   const direction=V.norm(V.add(
     V.mul(frame.east,speed>.04?s.v[0]:Math.cos(s.heading)),
     V.mul(frame.north,speed>.04?s.v[1]:Math.sin(s.heading))));
   addObject({id:animal.id},animal.kind,local,altitude,animal.id,animal.sizeM,s.behavior,{
     alive:true,encounterOnly:true,forward:V.rot(direction,axis,spin),
     heartPhase:RT.time*(animal.role.includes('predator')?5.4:6.2)+phase,
     digestion:.25,gaitPhase:s.gait,bodyPulse:Math.max(.0001,s.pulse),
     locomotionSpeed:speed
   });
  }
 }
 // Bounded nearby animation cache; unobserved animals re-seed deterministically.
 const ids=new Set(wildRecords.map(a=>a.id));
 for(const map of [wildGround,wildFly]){
  for(const key of map.keys())if(!ids.has(key))map.delete(key);
  while(map.size>24)map.delete(map.keys().next().value);
 }
}
function scene(){const ctx=region();if(!ctx||!ctx.landed||RT.interiorState)return[];
 if(flierBody!==ctx.body.id){flierStates.clear();groundStates.clear();flierBody=ctx.body.id;}
 const world=Bio?.world(ctx.body,RT.galaxy.seed,RT.galaxy);
 const envAt=Bio?.environment(ctx.body,ctx.local,RT.time,RT.galaxy.seed,RT.galaxy);
 const objects=[],addObject=(site,kind,local,altitude=0,id=site.id,size=1,behavior='idle',anatomy=null)=>{
  if(objects.length>=18)return;
  const surface=sample(ctx.body,local),worldDir=V.rot(local,ctx.body.spinAxis||[0,1,0],ctx.body.spinAngle||0),
  position=V.add(ctx.body.position,V.mul(worldDir,ctx.body.radius+surface.height+altitude+.1)),
  frame=E.basis(local),fw=V.rot(frame.north,ctx.body.spinAxis||[0,1,0],ctx.body.spinAngle||0);
  objects.push({id,kind,position,up:worldDir,forward:fw,scale:Math.max(.22,Math.min(2.5,size)),behavior,...(anatomy||{})});
 };
 for(const site of candidates){
  if(objects.length>=18)break;if(site.distance>230)continue;
  const patch=living(site,ctx);
  if(site.kind==='fossil'||site.group==='trace'){
   const state=E.pose(site,ctx.body,RT.time,ctx.local,sample);
   addObject(site,site.kind,state.local,state.altitude,site.id,1,state.behavior);continue;
  }
  if(patch){
   if(patch.plantKg>.05){
    const type=site.kind==='spores'?'spores':'microbial';
    addObject(site,type,site.local,0,site.id+':producers',Math.max(.3,Math.min(1.8,Math.sqrt(patch.plantKg/12))),'photosynthesizing',{alive:true,bodyPulse:Math.max(.0001,RT.time*(type==='spores'?2.2:1.1)+root.StarfallFieldScience.rand(site.id+':pulse')*6.28)});
   }
   for(const animal of patch.agents){
    if(objects.length>=18)break;
    const phase=root.StarfallFieldScience.rand(animal.id+':flight')*Math.PI*2;
    const flying=animal.role==='flier',kind=Motion?.modelKind(animal,site)||(flying?'flier':animal.role==='predator'?'crawler':'grazer');
    // 9C: integrate actual lift, drag, thrust and gravity in the near-field.
    // The biology record still owns mass, food, mortality and reproduction.
    if(flying&&Fly){
     let state=flierStates.get(animal.id);
     if(!state)state=Fly.start(animal.id,animal.massKg,animal.sizeM,RT.time);
     const groundAtSite=sample(ctx.body,site.local).height;
     const previousLocal=E.offset(site.local,state.p[0],state.p[2],ctx.body.radius);
     const groundAtFlyer=sample(ctx.body,previousLocal).height;
     const gravity=root.StarfallPhysics?.bodyProfile?.(ctx.body)?.surfaceGravityMS2||9.81;
     const frameAtSite=E.basis(site.local),playerDelta=V.mul(V.sub(ctx.local,site.local),ctx.body.radius),
       playerXZ=[V.dot(playerDelta,frameAtSite.east),V.dot(playerDelta,frameAtSite.north)];
     const closePlayer=Math.hypot(playerXZ[0]-state.p[0],playerXZ[1]-state.p[2])<24?playerXZ:null;
     const localHunt=patch.agents.some(a=>a.role==='predator'&&a.energy<.8);
     state=Fly.advance(state,RT.time,{massKg:animal.massKg,sizeM:animal.sizeM,
      rhoKgM3:Fly.airDensity(world.pressurePa,world.temperatureK),
      gravityMS2:gravity,floorY:groundAtFlyer-groundAtSite,
      foraging:animal.energy<.72,threat:closePlayer, predatorAlert:localHunt});
     flierStates.set(animal.id,state);
     if(flierStates.size>36)flierStates.delete(flierStates.keys().next().value);
     const local=E.offset(site.local,state.p[0],state.p[2],ctx.body.radius);
     const groundHere=sample(ctx.body,local).height;
     const altitude=Math.max(1.2,state.p[1]+groundAtSite-groundHere);
     const spinAxis=ctx.body.spinAxis||[0,1,0],spinAngle=ctx.body.spinAngle||0;
     const frame=E.basis(local),up=V.rot(frame.up,spinAxis,spinAngle),
      east=V.rot(frame.east,spinAxis,spinAngle),north=V.rot(frame.north,spinAxis,spinAngle);
     const travel=V.norm(V.add(V.add(V.mul(east,state.v[0]),V.mul(north,state.v[2])),V.mul(up,state.v[1])));
     const right=V.norm(V.cross(travel,up)),
      bankedUp=V.norm(V.add(V.mul(up,Math.cos(state.bank)),V.mul(right,Math.sin(state.bank))));
     addObject(site,kind,local,altitude,animal.id,Math.max(.3,Math.min(1.8,animal.sizeM)),state.flightMode,{
      alive:true,up:bankedUp,forward:travel,heartPhase:RT.time*9.2+phase,
      digestion:(animal.lastEvent==='grazing'||animal.lastEvent==='hunting')?.85:.25,
      wingPhase:Math.max(.0001,state.wingPhase),
      bodyPulse:Math.max(.0001,RT.time*2.7+phase),
      locomotionSpeed:Math.hypot(...state.v)
     });
     continue;
    }
    // 9D: true finite ground/soil/aquatic motion, velocity-driven gait,
    // patch food seeking, herd separation, pursuit, fleeing and terrain avoidance.
    if(Motion){
     const siteFrame=E.basis(site.local),playerDelta=V.mul(V.sub(ctx.local,site.local),ctx.body.radius);
     const player=[V.dot(playerDelta,siteFrame.east),V.dot(playerDelta,siteFrame.north)];
     const seeded=patch.agents.filter(a=>a.role!=='flier').map(a=>{
      const state=groundStates.get(a.id)||Motion.start(a,RT.time);
      return {id:a.id,role:a.role,p:state.p};
     });
     const oldState=groundStates.get(animal.id);
     const prevLocal=E.offset(site.local,oldState?.p[0]??0,oldState?.p[1]??0,ctx.body.radius);
     const prevHeight=sample(ctx.body,prevLocal).height;
     const traversable=(x,z,role)=>{
      const dir=E.offset(site.local,x,z,ctx.body.radius),s=sample(ctx.body,dir);
      const biome=root.StarfallBiomes.classify(ctx.body,dir,s.height,s.field);
      const aquatic=role==='filterer'||role==='aquatic_predator';
      if(aquatic)return biome.material==='water';
      // Check LOCAL slope against the last safe position, not the height of
      // the seed site: otherwise animals freeze on walkable gradual hills.
      const hDelta=Math.abs(s.height-prevHeight),
       walkDist=Math.hypot(x-(oldState?.p[0]??0),z-(oldState?.p[1]??0));
      return biome.material!=='water'&&hDelta<Math.max(1.25,walkDist*.9);
     };
     let state=Motion.advance(oldState,animal,RT.time,seeded,{
      player,plantKg:patch.plantKg,detritusKg:patch.detritusKg,light:envAt?.light??.6,traversable
     });
     groundStates.set(animal.id,state);
     if(groundStates.size>64)groundStates.delete(groundStates.keys().next().value);
     const local=E.offset(site.local,state.p[0],state.p[1],ctx.body.radius),
       ground=sample(ctx.body,local),isWater=animal.role==='filterer'||animal.role==='aquatic_predator';
     // In-water movement is below the original LW04 sea-level mesh (radius+2.1).
     // This is stylized depth, bounded above the original collision ground.
     const waterDepth=1.15+.22*state.altitude*-1;
     const altitude=isWater?Math.max(.35,2.1-waterDepth-ground.height):
      Math.max(.04,Math.min(.5,state.altitude));
     const speed=Math.hypot(...state.v),forward=V.rot(V.norm(V.add(
       V.mul(siteFrame.east,speed>.04?state.v[0]:Math.cos(state.heading)),
       V.mul(siteFrame.north,speed>.04?state.v[1]:Math.sin(state.heading)))),
       ctx.body.spinAxis||[0,1,0],ctx.body.spinAngle||0);
     addObject(site,kind,local,altitude,animal.id,
      Math.max(.3,Math.min(1.8,animal.sizeM)),state.behavior,{
      alive:true,forward,heartPhase:RT.time*(animal.role.includes('predator')?5.2:6.4)+phase,
      digestion:(animal.lastEvent==='grazing'||animal.lastEvent==='hunting'||animal.lastEvent==='filtering'||animal.lastEvent==='scavenging')?.85:.25,
      gaitPhase:state.gait,bodyPulse:state.pulse,swimPhase:state.pulse,
      locomotionSpeed:speed
     });
     continue;
    }
    // Compatibility fallback if optional 9D script is absent.
    const speed=300+animal.sizeM*150,span=Math.min(8,2+animal.sizeM*3);
    const local=E.offset(site.local,Math.cos(RT.time/speed+phase)*span,
       Math.sin(RT.time/(speed*1.16)+phase)*span*.83,ctx.body.radius);
    addObject(site,'grazer',local,0,animal.id,
      Math.max(.3,Math.min(1.8,animal.sizeM)),animal.lastEvent,{alive:true,heartPhase:RT.time*6.4+phase,digestion:.35});
   }
  }else if(site.kind==='microbial'||site.kind==='spores'){
   // A local candidate is not a guaranteed living population.
   continue;
  }
 }
 wildScene(ctx,world,envAt,objects,addObject);
 return objects;
}
$('ecology-open').onclick=()=>{$('ecology-panel').hidden=false;render();};$('ecology-close').onclick=()=>{$('ecology-panel').hidden=true;};$('ecology-panel').addEventListener('click',e=>{if(e.target===$('ecology-panel'))$('ecology-panel').hidden=true;});
$('ecology-panel').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();$('ecology-panel').hidden=true;document.activeElement?.blur?.();}});
$('ecology-scan').onclick=()=>operate(1);$('ecology-observe').onclick=()=>operate(2);$('ecology-link').onclick=()=>operate(3);
$('ecology-save-notes').onclick=()=>{const s=current();if(!s||!rec(s)){status('Survey a site before saving notes.',true);return;}rec(s).note=$('ecology-notes').value.slice(0,1000);save();status('Field notes saved.');};$('ecology-export').onclick=exportData;
root.StarfallEcologyUI={scene,refresh:render,get candidates(){region();return candidates.slice();},get records(){return records.map(r=>({...r}));},get livingPatches(){return biospheres.map(p=>({...p,agents:p.agents.map(a=>({...a}))}));},getSelected:()=>current(),getContext:context};
})(globalThis);
