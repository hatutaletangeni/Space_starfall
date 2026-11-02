/* STARFALL 6H — field interface, persisted survey records, and bounded draw adapter.
   Nothing here creates measurements: all corroboration comes from Update 4 journal.
*/
(function(root){'use strict';
const E=root.StarfallEcology,RT=root.StarfallRuntime,G=root.Starfall3D,V=G.V,ST=root.StarfallStableTerrain,$=id=>document.getElementById(id);
if(!E||!RT)throw Error('Ecology UI needs runtime and ecology layer');
const storageKey='ecology6h';let records=E.sanitizeRecords(SF.load()?.[storageKey]?.records),selectedId=null,candidates=[],lastLocal=null,lastBody=null,updatedAt=-Infinity;
function context(){const ctx=RT.outpostContext(),b=ctx.body;return b?.landable&&ctx.local?{...ctx,local:ST.normalize(ctx.local),body:b}:null;}
function sample(b,d){return G.sampleTerrain(b,d);}
function save(){SF.save({[storageKey]:{schema:1,records:records.slice(-300)}});}
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
 element.textContent='SITE '+site.id+'\n'+(stage>=2?kind.label:'Unclassified ecological anomaly')+'\n'+site.biome+' · '+site.distance.toFixed(1)+' scene units\nStatus: '+['UNSURVEYED','REMOTE SURVEY','CLOSE OBSERVATION','INSTRUMENT-CORROBORATED'][stage]+'\n'+(stage>=1?'Signal: '+kind.signal+'\n':'')+(stage>=2?'Morphology model: '+site.kind+' · '+site.speciesId+'\n':'')+(site.kind==='fossil'?'Mineral evidence nearby: ':'Bioassay readings nearby: ')+available.length+'\n'+(available.length?'Newest index: '+available.at(-1).value.toFixed(2)+' ± '+available.at(-1).uncertainty.toFixed(2)+'\n':'')+'This is a fictional seeded hypothesis, NOT confirmed biology.';
 $('ecology-notes').value=r?.note||'';
}
function render(){const ctx=region(true),listing=$('ecology-sites');listing.replaceChildren();if(!ctx){$('ecology-context').textContent='Land on a solid world and explore its surface.';$('ecology-detail').textContent='No accessible surface.';return;}
 const cl=E.climate(ctx.body,RT.galaxy.seed);
 $('ecology-context').textContent=ctx.body.name+' · '+(cl.suitable?'Potentially hospitable biome':'No supported active biosphere')+' · modeled temperature '+cl.temperatureK.toFixed(0)+' K · modeled pressure '+(cl.pressurePa/1000).toFixed(0)+' kPa · '+records.length+' saved observations.';
 if(!candidates.length)listing.textContent='No seeded ecology signals nearby. Another biome or planet may hold more.';
 for(const s of candidates){const r=rec(s),button=document.createElement('button');button.type='button';button.className=s.id===selectedId?'active':'';button.textContent=(r?.stage>=2?E.KINDS[s.kind].label:r?.stage?'Possible '+E.KINDS[s.kind].group+' signal':'Unsurveyed local signature')+' · '+Math.round(s.distance)+' u · '+s.biome;button.onclick=()=>{selectedId=s.id;detail();for(const el of listing.querySelectorAll('button'))el.classList.toggle('active',el===button);};listing.append(button);}
 if(!candidates.some(x=>x.id===selectedId))selectedId=candidates[0]?.id||null;detail();}
function operate(stage){try{const ctx=region(true),s=current();if(!ctx||!s)throw Error('Select a nearby ecology site on a landed world.');
 if(stage===1){if(s.distance>180)throw Error('Approach within 180 scene units to map this signal.');updateRecord(s,ctx,1);status('Remote ecological candidate mapped. Move closer to observe.');}
 else if(stage===2){if(RT.interiorState)throw Error('Leave the ruin interior to observe planetary ecology.');if(!ctx.eva||ctx.roverOccupied)throw Error('Leave your ship or rover and investigate in EVA.');if(s.distance>24)throw Error('Move within 24 scene units to observe this site.');if((rec(s)?.stage||0)<1)throw Error('Map the candidate signal before investigating it.');updateRecord(s,ctx,2);status('Close field observation archived. Take '+(s.kind==='fossil'?'a spectrometer or sampler reading':'a field BIOASSAY')+' for evidence.');}
 else{if((rec(s)?.stage||0)<2)throw Error('First complete a close field observation.');const observations=linkedReadings(s,ctx);if(!observations.length)throw Error('No matching instrument evidence nearby. Use FIELD SCIENCE to collect '+(s.kind==='fossil'?'a spectrometer or sampler':'a bioassay')+' reading within 40 units.');updateRecord(s,ctx,3,observations.map(x=>x.id));status('Instrument observations linked. This remains a procedural hypothesis, not confirmed biology.');}
 }catch(err){status(err.message,true);}}
function exportData(){const blob=new Blob([JSON.stringify({schema:1,seed:RT.galaxy.seed,model:'fictional ecology and uncertain biosignatures',records},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='starfall-ecology-journal.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function scene(){const ctx=region();if(!ctx||!ctx.landed||RT.interiorState)return[];
 const objects=[];for(const site of candidates){if(objects.length>=18)break;if(site.distance>230)continue;
 const state=E.pose(site,ctx.body,RT.time,ctx.local,sample),worldDir=V.rot(state.local,ctx.body.spinAxis||[0,1,0],ctx.body.spinAngle||0),position=V.add(ctx.body.position,V.mul(worldDir,ctx.body.radius+state.height+state.altitude+.1));
 const frame=E.basis(state.local),fw=V.rot(frame.north,ctx.body.spinAxis||[0,1,0],ctx.body.spinAngle||0);
 objects.push({id:site.id,kind:site.kind,position,up:worldDir,forward:fw,behavior:state.behavior});}
 return objects;
}
$('ecology-open').onclick=()=>{$('ecology-panel').hidden=false;render();};$('ecology-close').onclick=()=>{$('ecology-panel').hidden=true;};$('ecology-panel').addEventListener('click',e=>{if(e.target===$('ecology-panel'))$('ecology-panel').hidden=true;});
$('ecology-panel').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();$('ecology-panel').hidden=true;document.activeElement?.blur?.();}});
$('ecology-scan').onclick=()=>operate(1);$('ecology-observe').onclick=()=>operate(2);$('ecology-link').onclick=()=>operate(3);
$('ecology-save-notes').onclick=()=>{const s=current();if(!s||!rec(s)){status('Survey a site before saving notes.',true);return;}rec(s).note=$('ecology-notes').value.slice(0,1000);save();status('Field notes saved.');};$('ecology-export').onclick=exportData;
root.StarfallEcologyUI={scene,refresh:render,get candidates(){region();return candidates.slice();},get records(){return records.map(r=>({...r}));},getSelected:()=>current(),getContext:context};
})(globalThis);
