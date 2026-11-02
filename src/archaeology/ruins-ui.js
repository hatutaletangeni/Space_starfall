/* STARFALL 6C — field archaeology, local-only drawing and evidence persistence. */
(function(root){'use strict';
const A=root.StarfallArchaeology,RT=root.StarfallRuntime,ST=root.StarfallStableTerrain,V=root.Starfall3D.V;
if(!A||!RT||!ST)throw Error('Archaeology dependencies not loaded');
const $=id=>document.getElementById(id),key='archaeology6c';const prior=SF.load()?.[key]||{};
let records=A.safeRecords(prior.records),selectedId=null,sites=[],lastPosition=null,lastBody=null,lastRefresh=-Infinity,dirty=false,lastPersist=0,viewed=false;
const sample=(body,dir)=>root.Starfall3D.sampleTerrain(body,dir);
function context(){const ctx=RT.outpostContext(),body=ctx.body;if(!body?.landable)return{body:null,local:null};
 const local=ctx.local?A.norm(ctx.local):A.norm(V.rot(A.norm(V.sub(ctx.position,body.position)),body.spinAxis||[0,1,0],-(body.spinAngle||0)));
 return{...ctx,body,local};}
function status(s,bad=false){const el=$('ruin-status');el.textContent=s;el.style.color=bad?'#ffb09b':'#d6c49d';}
function save(){SF.save({[key]:{schema:1,records:records.slice(-300)}});dirty=false;lastPersist=performance.now();}
function distance(site,ctx){return A.arc(site.local,ctx.local,ctx.body.radius);}
function region(force=false){const ctx=context(),now=performance.now();if(!ctx.body){sites=[];lastBody=null;lastPosition=null;return ctx;}
 if(!force&&ctx.body.id===lastBody&&lastPosition&&A.arc(ctx.local,lastPosition,ctx.body.radius)<30)return ctx;
 sites=A.nearby(ctx.body,ctx.local,sample,4);lastBody=ctx.body.id;lastPosition=[...ctx.local];lastRefresh=now;return ctx;}
function level(site){return records.find(r=>r.id===site.id&&r.bodyId===site.bodyId)?.level||0;}
function selected(){return sites.find(s=>s.id===selectedId)||null;}
function corroboration(site){const journal=root.StarfallScienceUI?.journal||[];return journal.filter(e=>e.bodyId===site.bodyId&&Array.isArray(e.location)&&A.arc(e.location,site.local,RT.nearest.radius)<55&&['magnetometer','spectrometer','sampler','radar','seismometer'].includes(e.instrument)).slice(-5);}
function record(site,next){const siteSnapshot={id:site.id,bodyId:site.bodyId,tier:site.tier,local:[...site.local],height:site.height,ageMa:site.ageMa,condition:site.condition,collapse:site.collapse,style:site.style,biome:site.biome,anomaly:site.anomaly};const current=records.find(r=>r.id===site.id&&r.bodyId===site.bodyId),measurements=corroboration(site).map(x=>x.id),levelReached=Math.max(current?.level||0,next);
 if(current){current.siteSnapshot=siteSnapshot;current.level=levelReached;current.timeS=RT.time;current.measurementIds=[...new Set([...(current.measurementIds||[]),...measurements])].slice(-10);}else{records.push({id:site.id,bodyId:site.bodyId,level:levelReached,timeS:RT.time,measurementIds:measurements,siteSnapshot});if(records.length>300)records.shift();}dirty=true;save();}
function bearing(site,ctx){const up=ctx.local,target=A.norm(site.local.map((x,i)=>x-up[i]*A.dot(site.local,up))),worldForward=V.rot(ctx.forward||[0,0,1],ctx.body.spinAxis||[0,1,0],-(ctx.body.spinAngle||0)),north=A.norm(worldForward.map((x,i)=>x-up[i]*A.dot(worldForward,up))),right=A.norm(A.norm([north[2],north[0],north[1]]));const east=A.norm([north[1]*up[2]-north[2]*up[1],north[2]*up[0]-north[0]*up[2],north[0]*up[1]-north[1]*up[0]]);return Math.atan2(A.dot(target,east),A.dot(target,north))*180/Math.PI;}
function render(){const ctx=region(true),container=$('ruin-list');container.replaceChildren();const civ=ctx.body&&A.culture(ctx.body),sys=ctx.body&&RT.galaxy.byId.get(ctx.body.systemId),stellar=A.stellarSignature(sys?.star);
 $('ruin-world').textContent=ctx.body?ctx.body.name:'No solid world in range';
 $('ruin-context').textContent=ctx.body?(civ?'Preliminary orbital archive: potential ancient cultural remains. Evidence is required before confirmation.':'No seeded ancient surface culture on this world. Geological exploration is still possible.'):'Approach a solid planet or moon.';
 $('ruin-stellar').textContent=stellar?'Stellar signature: '+stellar.category+' — unverified spectral hypothesis for '+sys.name+'.':'No stellar-scale engineering signature in the current system.';
 if(!sites.length){const p=document.createElement('p');p.className='field-note';p.textContent=civ?'No candidate ruins within the current survey area. Explore another region or expand the search.':'No nearby archaeological signals.';container.append(p);}
 for(const site of sites.slice(0,40)){
  const d=distance(site,ctx),lv=level(site),item=document.createElement('button');item.type='button';item.className='ruin-entry'+(selectedId===site.id?' active':'');item.dataset.siteId=site.id;
  // Unknown tier is not revealed before successful physical investigation.
  const signal=lv>=2?A.TIERS[site.tier].name:lv===1?'Unclassified structural anomaly':'Unsurveyed signal';
  item.textContent=signal+' · '+Math.round(d)+' scene units · '+Math.abs(bearing(site,ctx)).toFixed(0)+'° '+(bearing(site,ctx)>=0?'right':'left')+' · '+site.biome+(lv>=2?' · '+site.condition:'');item.onclick=()=>{selectedId=site.id;renderDetails();for(const el of container.children)el.classList.toggle('active',el===item);};container.append(item);
 }
 if(!sites.some(s=>s.id===selectedId))selectedId=sites[0]?.id||null;renderDetails();
 $('ruin-count').textContent=sites.length+' nearby · '+records.length+' archived';
}
function renderDetails(){const box=$('ruin-details'),ctx=context(),site=selected();if(!site||!ctx.body){box.textContent='Select a candidate from the survey list.';return;}
 const d=distance(site,ctx),lv=level(site),base='SITE '+site.id+' · distance '+d.toFixed(1)+' scene units · bearing '+bearing(site,ctx).toFixed(0)+'° (positive right)\nBiome: '+site.biome+' / '+site.material+'\n';
 if(lv===0){box.textContent=base+'Status: UNVERIFIED\nField survey at ≤250 units to classify the signal.';return;}
 if(lv===1){box.textContent=base+'Status: REMOTE ANOMALY\nSpectral signature: '+site.anomaly+'\nClose investigation (≤45 units) required to identify civilization.';return;}
 const civ=A.culture(ctx.body),measure=corroboration(site),t=A.TIERS[site.tier];
 box.textContent=base+'Status: '+(lv>=3?'CORROBORATED':'FIELD EXAMINED')+'\nTech tier '+site.tier+' / '+t.name+'\nForm: '+t.architecture+'\nCultural geometry: '+site.style+'\nCondition: '+site.condition+'\nEstimated age: ~'+site.ageMa+' million years (fictional)\nPossible decline: '+site.collapse+'\nOrigin: '+civ.origin+'\nInstrument context: '+measure.length+' nearby measurement(s)\nInterior relics examined: '+(root.StarfallInteriorsUI?.records||[]).filter(x=>x.siteId===site.id&&x.bodyId===site.bodyId).length+'\nInterpretation is an in-game hypothesis, not a real archaeological measurement.';
}
function operation(investigate=false){const ctx=region(true),site=selected();if(!ctx.body||!site)throw Error('Select an archaeological signal on a landable world.');const d=distance(site,ctx);
 if(investigate){if(!ctx.landed||!ctx.eva)throw Error('Exit your spacecraft or rover before field examination.');if(d>45)throw Error('Site is '+d.toFixed(1)+' units away. Approach within 45.');if(level(site)<1)throw Error('Perform a remote survey first.');record(site,corroboration(site).length?3:2);status('Field examination recorded. '+(corroboration(site).length?'Nearby scientific measurements corroborate the site.':'Take a magnetometer / spectrometer / sampler measurement near the site for corroboration.'));}
 else {if(d>250)throw Error('Signal is '+d.toFixed(1)+' units away. Approach within 250 to survey.');record(site,1);status('Orbital/local anomaly mapped. Approach within 18 units, exit the vehicle and examine it.');}
 render();}
function exportData(){const data={schema:1,model:'fictional ancient civilizational hypotheses',records:records.map(r=>({...r})),stellarSignature:(()=>{const b=context().body,sys=b&&RT.galaxy.byId.get(b.systemId);return A.stellarSignature(sys?.star);})()};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='starfall-archaeology.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function scene(){const ctx=region(),body=ctx.body;if(!body||!ctx.local)return[];
 const result=[];for(const s of sites){const d=distance(s,ctx);if(d>375)continue;const radial=V.rot(s.local,body.spinAxis||[0,1,0],body.spinAngle||0);const at=V.add(body.position,V.mul(radial,body.radius+s.height+.22));const toward=V.rot(A.norm([s.local[2],.13,-s.local[0]]),body.spinAxis||[0,1,0],body.spinAngle||0);
 result.push({id:s.id,tier:s.tier,position:at,up:radial,forward:toward,scale:s.tier===5?1.0:1});}return result;
}
$('ruin-open').onclick=()=>{$('ruin-panel').hidden=false;viewed=true;render();};$('ruin-close').onclick=()=>{$('ruin-panel').hidden=true;};$('ruin-panel').addEventListener('click',e=>{if(e.target===$('ruin-panel'))$('ruin-panel').hidden=true;});
$('ruin-survey').onclick=()=>{try{operation(false);}catch(e){status(e.message,true);}};
$('ruin-examine').onclick=()=>{try{operation(true);}catch(e){status(e.message,true);}};
$('ruin-recheck').onclick=()=>{try{const site=selected();if(!site||level(site)<2)throw Error('Examine a nearby site first.');const measure=corroboration(site);if(!measure.length)throw Error('No nearby instrument observation found. Collect a field measurement within 55 units of the ruin.');record(site,3);status('Scientific readings linked to the archaeological record.');render();}catch(e){status(e.message,true);}};
$('ruin-rescan').onclick=()=>{lastRefresh=-Infinity;render();};$('ruin-export').onclick=exportData;
$('ruin-panel').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();$('ruin-panel').hidden=true;}});
function tick(){if(document.hidden)return;if(!viewed||$('ruin-panel').hidden)return;const ctx=context();if(ctx.body?.id!==lastBody||ctx.local&&lastPosition&&A.arc(ctx.local,lastPosition,ctx.body.radius)>35){render();}}
root.StarfallRuinsUI={scene,tick,context,refresh:render,get records(){return records.slice();},get visibleSites(){region();return sites.slice();},get selectedSite(){return selected();}};
})(globalThis);
