/* STARFALL 6H — field interface, persisted survey records, and bounded draw adapter.
   Nothing here creates measurements: all corroboration comes from Update 4 journal.
*/
(function(root){'use strict';
const E=root.StarfallEcology,Bio=root.StarfallLivingBiosphere,RT=root.StarfallRuntime,G=root.Starfall3D,V=G.V,ST=root.StarfallStableTerrain,$=id=>document.getElementById(id);
if(!E||!RT)throw Error('Ecology UI needs runtime and ecology layer');
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
function region(force=false){const ctx=context();if(!ctx||!ctx.landed){candidates=[];lastBody=null;return null;}
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
 '\nWater: '+p.waterKg.toFixed(2)+' kg   ·  fertility: '+Math.round(p.fertility*100)+'%'+
 '\nCO₂: '+p.carbonDioxideKg.toFixed(2)+' kg   ·  O₂: '+p.oxygenKg.toFixed(2)+' kg'+
 '\nDetritus: '+p.detritusKg.toFixed(2)+' kg   ·  born: '+p.births+'   ·  died: '+p.deaths+
 '\nConsumed plants: '+p.consumedPlantsKg.toFixed(2)+' kg   ·  predation: '+p.kills+
 '\nSpecies diversity estimate: '+p.speciesCount+'   ·  intelligence tier: '+p.intelligenceTier+
 '\nTranslucent creature anatomy: pulsing red heart, amber digestive sac; winged foragers flap and glide.'+
  '\nModel clock: '+Math.round(p.lastS)+' s (may be catching up)';})() ;
 $('ecology-notes').value=r?.note||'';
}
function render(){const ctx=region(true),listing=$('ecology-sites');listing.replaceChildren();if(!ctx){$('ecology-context').textContent='Land on a solid world and explore its surface.';$('ecology-detail').textContent='No accessible surface.';return;}
 const cl=E.climate(ctx.body,RT.galaxy.seed),w=Bio?.world(ctx.body,RT.galaxy.seed,RT.galaxy);
 $('ecology-context').textContent=ctx.body.name+' · '+(w?.life?'Living biosphere potential (tier '+w.level+')':cl.suitable?'Potentially hospitable':'No supported active biosphere')+' · '+(w?.speciesCount||0)+' possible species · modeled temperature '+cl.temperatureK.toFixed(0)+' K · pressure '+(cl.pressurePa/1000).toFixed(0)+' kPa · '+records.length+' saved observations.';
 if(!candidates.length)listing.textContent='No seeded ecology signals nearby. Another biome or planet may hold more.';
 for(const s of candidates){const r=rec(s),button=document.createElement('button');button.type='button';button.className=s.id===selectedId?'active':'';button.textContent=(r?.stage>=2?E.KINDS[s.kind].label:r?.stage?'Possible '+E.KINDS[s.kind].group+' signal':'Unsurveyed local signature')+' · '+Math.round(s.distance)+' u · '+s.biome;button.onclick=()=>{selectedId=s.id;detail();for(const el of listing.querySelectorAll('button'))el.classList.toggle('active',el===button);};listing.append(button);}
 if(!candidates.some(x=>x.id===selectedId))selectedId=candidates[0]?.id||null;detail();}
function operate(stage){try{const ctx=region(true),s=current();if(!ctx||!s)throw Error('Select a nearby ecology site on a landed world.');
 if(stage===1){if(s.distance>180)throw Error('Approach within 180 scene units to map this signal.');updateRecord(s,ctx,1);status('Remote ecological candidate mapped. Move closer to observe.');}
 else if(stage===2){if(RT.interiorState)throw Error('Leave the ruin interior to observe planetary ecology.');if(!ctx.eva||ctx.roverOccupied)throw Error('Leave your ship or rover and investigate in EVA.');if(s.distance>24)throw Error('Move within 24 scene units to observe this site.');if((rec(s)?.stage||0)<1)throw Error('Map the candidate signal before investigating it.');updateRecord(s,ctx,2);status('Close field observation archived. Take '+(s.kind==='fossil'?'a spectrometer or sampler reading':'a field BIOASSAY')+' for evidence.');}
 else{if((rec(s)?.stage||0)<2)throw Error('First complete a close field observation.');const observations=linkedReadings(s,ctx);if(!observations.length)throw Error('No matching instrument evidence nearby. Use FIELD SCIENCE to collect '+(s.kind==='fossil'?'a spectrometer or sampler':'a bioassay')+' reading within 40 units.');updateRecord(s,ctx,3,observations.map(x=>x.id));status('Instrument observations linked. This remains a procedural hypothesis, not confirmed biology.');}
 }catch(err){status(err.message,true);}}
function exportData(){const blob=new Blob([JSON.stringify({schema:1,seed:RT.galaxy.seed,model:'fictional seeded local biospheres, NOT a planetary gas ledger',records,biospheres},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='starfall-ecology-journal.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function scene(){const ctx=region();if(!ctx||!ctx.landed||RT.interiorState)return[];
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
    addObject(site,type,site.local,0,site.id+':producers',Math.max(.3,Math.min(1.8,Math.sqrt(patch.plantKg/12))),'growing',{alive:true});
   }
   for(const animal of patch.agents){
    if(objects.length>=18)break;
    // Each organism uses a stable phase; air foragers occupy a true flying volume.
    const phase=root.StarfallFieldScience.rand(animal.id+':flight')*Math.PI*2;
    const flying=animal.role==='flier',speed=flying?24+animal.sizeM*7:300+animal.sizeM*150;
    const span=flying?Math.min(18,8+animal.sizeM*4):Math.min(8,2+animal.sizeM*3);
    const x=Math.cos(RT.time/speed+phase)*span;
    const z=Math.sin(RT.time/(speed*1.16)+phase)*span*.83;
    const local=E.offset(site.local,x,z,ctx.body.radius);
    const kind=flying?'flier':animal.role==='predator'?'crawler':site.kind==='crawler'?'crawler':'grazer';
    const altitude=flying?7+2.8*Math.sin(RT.time/9+phase)+1.2*Math.cos(RT.time/17+phase):0;
    addObject(site,kind,local,altitude,animal.id,
      Math.max(.3,Math.min(1.8,animal.sizeM)),animal.lastEvent,{
       alive:true,heartPhase:RT.time*(animal.role==='predator'?5.2:flying?9.2:6.4)+phase,
       digestion:(animal.lastEvent==='grazing'||animal.lastEvent==='hunting')?.85:.25,
       wingPhase:flying?RT.time*8.3+phase:0
      });
   }
  }else if(site.kind==='microbial'||site.kind==='spores'){
   // A local candidate is not a guaranteed living population.
   continue;
  }
 }
 return objects;
}
$('ecology-open').onclick=()=>{$('ecology-panel').hidden=false;render();};$('ecology-close').onclick=()=>{$('ecology-panel').hidden=true;};$('ecology-panel').addEventListener('click',e=>{if(e.target===$('ecology-panel'))$('ecology-panel').hidden=true;});
$('ecology-panel').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();$('ecology-panel').hidden=true;document.activeElement?.blur?.();}});
$('ecology-scan').onclick=()=>operate(1);$('ecology-observe').onclick=()=>operate(2);$('ecology-link').onclick=()=>operate(3);
$('ecology-save-notes').onclick=()=>{const s=current();if(!s||!rec(s)){status('Survey a site before saving notes.',true);return;}rec(s).note=$('ecology-notes').value.slice(0,1000);save();status('Field notes saved.');};$('ecology-export').onclick=exportData;
root.StarfallEcologyUI={scene,refresh:render,get candidates(){region();return candidates.slice();},get records(){return records.map(r=>({...r}));},get livingPatches(){return biospheres.map(p=>({...p,agents:p.agents.map(a=>({...a}))}));},getSelected:()=>current(),getContext:context};
})(globalThis);
