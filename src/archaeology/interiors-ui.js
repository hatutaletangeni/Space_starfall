/* STARFALL 6F — in-world interior prompt, evidence journal, and controls. */
(function(root){'use strict';
const I=root.StarfallInteriors,A=root.StarfallArchaeology,RT=root.StarfallRuntime,R=root.StarfallRuinsUI;
if(!I||!RT||!R)throw Error('Ruin interior runtime unavailable');
const $=id=>document.getElementById(id),saveKey='interiors6f';let records=I.validateRecords(SF.load()?.[saveKey]?.records);
function save(){SF.save({[saveKey]:{schema:1,records:records.slice(-240)}});}
const storedCaves=SF.load()?.geologyLW02;
let caveRecords=Array.isArray(storedCaves?.records)?storedCaves.records.slice(-160).filter(x=>x&&typeof x.siteId==='string'&&x.siteId.startsWith('cave-')&&typeof x.bodyId==='string'&&Number.isFinite(x.maxDepth)&&x.maxDepth>=0&&x.maxDepth<=200):[];
function recordCave(state,force=false){
 if(state?.kind!=='cave')return;
 let entry=caveRecords.find(x=>x.siteId===state.site.id&&x.bodyId===state.site.bodyId);
 const depth=Math.min(state.layout.length,Math.max(0,state.at.z));
 if(!entry){entry={siteId:state.site.id,bodyId:state.site.bodyId,kind:state.site.kind,maxDepth:0,observedAtS:RT.time};caveRecords.push(entry);}
 if(depth-entry.maxDepth<5&&!force)return;
 entry.maxDepth=Math.max(entry.maxDepth,depth);entry.observedAtS=RT.time;
 caveRecords=caveRecords.slice(-160);SF.save({geologyLW02:{schema:1,records:caveRecords}});
}

function interact(){try{if(RT.interiorState){const s=RT.interiorState;if(s.kind==='cave'){
 recordCave(s,true);
 SF.recordDiscovery({id:'geology:lw02:'+s.site.id,type:'geological survey',name:'Explored '+s.site.kind,
  detail:'In-situ cave traversal to '+Math.round(s.at.z)+' scene units; composition remains a procedural prior.',
  planet:RT.nearest.name,system:RT.nearest.system});
 status('Geological survey saved · '+s.site.kind+' · reached '+s.at.z.toFixed(1)+' scene units.');refresh();return;}const near=I.nearestArtifact(s.layout,s.at,4.4);if(!near)throw Error('Move closer to a relic before inspecting it.');const record={siteId:s.site.id,bodyId:s.site.bodyId,tier:s.site.tier,artifactId:near.id,label:near.label,timeS:RT.time};const valid=I.validateRecords([record]);if(!valid.length)throw Error('Invalid observation');const key=r=>r.bodyId+':'+r.siteId+':'+r.artifactId;const prev=records.findIndex(r=>key(r)===key(valid[0]));if(prev<0)records.push(valid[0]);else records[prev]=valid[0];records=records.slice(-240);save();SF.recordDiscovery({id:'interior-'+key(valid[0]),name:'Studied '+near.label,type:'archaeological evidence',planet:RT.nearest.name,detail:'In-situ visual inspection; technology and provenance remain fictional in-game hypotheses.'});status('Recorded '+near.label+' in the archaeological journal.');refresh();return;}
 const ctx=RT.outpostContext();if(!ctx.landed||!ctx.eva)throw Error('Exit the spacecraft and explore on foot.');
 const G=root.StarfallGeologyLW02,entrance=G&&ctx.body?.landable&&ctx.local?G.sites(ctx.body,RT.galaxy.seed).find(x=>G.arc(x.local,ctx.local,ctx.body.radius)<7):null;
 if(entrance){RT.enterCave(entrance);status('Entered '+entrance.kind+'. Walk with W/S, rotate with A/D and use ESC to exit.');refresh();return;}const candidate=R.visibleSites.find(s=>A.arc(s.local,ctx.local,ctx.body.radius)<30&&R.records.some(r=>r.id===s.id&&r.level>=2));if(!candidate)throw Error('Field-examine an ancient ruin, then approach within 30 units.');RT.enterInterior(candidate);status('Entered '+A.TIERS[candidate.tier].name+'. Walk with W/S and turn with A/D; drag to look. X inspects nearby relics.');refresh();
 }catch(e){status(e.message,true);}}
function exit(){if(!RT.interiorState)return;const cave=RT.interiorState.kind==='cave';if(cave)recordCave(RT.interiorState,true);RT.leaveInterior();status(cave?'Returned to planetary surface.':'Returned outside the ruin.');refresh();}
function status(t,error=false){const s=$('interior-status');s.textContent=t;s.style.color=error?'#ffb6a2':'#ecd69d';}
function refresh(){const s=RT.interiorState,ctx=RT.outpostContext(),near=(!s&&ctx.body&&ctx.local)?R.visibleSites.find(x=>A.arc(x.local,ctx.local,ctx.body.radius)<34):null;
 const label=$('interior-state'),enter=$('interior-enter'),leave=$('interior-exit'),inspect=$('interior-inspect');
 if(s?.kind==='cave'){label.textContent='CAVE · '+s.site.kind.toUpperCase()+' · '+s.at.z.toFixed(1)+' / '+s.layout.length.toFixed(1)+' units explored. W/S move · A/D rotate · X log survey · ESC exit. Geological prior, not surveyed.';}
 else if(s){const a=I.nearestArtifact(s.layout,s.at,4.4),done=records.filter(x=>x.siteId===s.site.id&&x.bodyId===s.site.bodyId).length;label.textContent='INSIDE '+A.TIERS[s.site.tier].name.toUpperCase()+' · '+done+'/'+s.layout.artifacts.length+' relics logged · '+s.layout.hazard+'. '+(a?'Nearby: '+a.label+'.':'Explore chambers to find relics.');}
 else{const G=root.StarfallGeologyLW02,entrance=G&&ctx.landed&&ctx.eva&&ctx.local&&ctx.body?G.sites(ctx.body,RT.galaxy.seed).find(x=>G.arc(x.local,ctx.local,ctx.body.radius)<7):null;
 label.textContent=entrance?'CAVE ENTRANCE · '+entrance.kind+' · walk inside with X or use ENTER.':near?'Ruin entrance nearby — '+A.TIERS[near.tier].name+'. Survey and field-examine before entry.':'Find a cave mouth on foot or approach a surveyed ruin to enter.';}
 enter.hidden=!!s;leave.hidden=!s;inspect.hidden=!s;
 $('interior-records').textContent=records.length?'ARCHIVE / '+records.length+' artifact observations\n'+records.slice(-9).reverse().map(x=>x.label+' · '+x.bodyId+' · '+x.siteId).join('\n'):'No relic observations yet.';
}
function exportData(){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify({schema:1,records,limitations:'fictional seeded ruins; artifacts are visual observations, not physical sample analysis'},null,2)],{type:'application/json'}));a.download='starfall-interior-archaeology.json';a.href=u;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}
$('interior-open').onclick=()=>{$('interior-panel').hidden=false;refresh();};$('interior-close').onclick=()=>{if($('interior-panel').contains(document.activeElement))document.activeElement.blur();$('interior-panel').hidden=true;};$('interior-panel').addEventListener('click',e=>{if(e.target===$('interior-panel'))$('interior-panel').hidden=true;});
$('interior-enter').onclick=()=>{if($('interior-panel').contains(document.activeElement))document.activeElement.blur();$('interior-panel').hidden=true;interact();};$('interior-exit').onclick=()=>{exit();};$('interior-inspect').onclick=interact;$('interior-export').onclick=exportData;
$('interior-panel').addEventListener('keydown',e=>{if(e.key==='Escape'){if($('interior-panel').contains(document.activeElement))document.activeElement.blur();$('interior-panel').hidden=true;if(RT.interiorState)RT.leaveInterior();e.stopPropagation();}});
let last=-Infinity;function tick(){const now=performance.now();if(now-last<250)return;last=now;const s=RT.interiorState,hint=$('interior-hint');if(s?.kind==='cave'){recordCave(s);hint.hidden=false;hint.textContent='CAVE TUNNEL · W/S MOVE · A/D TURN · X LOG GEOLOGY · ESC SURFACE EXIT';}
 else if(s){const relic=I.nearestArtifact(s.layout,s.at,4.4);hint.hidden=false;hint.textContent='RUIN INTERIOR · W/S WALK · A/D TURN · MOUSE LOOK · '+String(root.StarfallInput?.settings?.bindings?.interact||'KeyX').replace(/^Key/,'')+' '+(relic?'EXAMINE '+relic.label.toUpperCase():'INSPECT')+' · ESC EXIT · JOURNAL IN RECON PANEL';}
 else{const c=RT.outpostContext(),G=root.StarfallGeologyLW02,cave=G&&c.landed&&c.eva&&c.body&&c.local?G.sites(c.body,RT.galaxy.seed).find(x=>G.arc(x.local,c.local,c.body.radius)<7):null;
 const near=c.landed&&c.eva&&c.body&&c.local?R.visibleSites.find(x=>A.arc(x.local,c.local,c.body.radius)<28&&R.records.some(r=>r.id===x.id&&r.level>=2)):null;
 hint.hidden=!near&&!cave;if(cave)hint.textContent='CAVE MOUTH · X ENTER · '+cave.kind.toUpperCase();
 else if(near)hint.textContent='RUIN ENTRANCE · '+String(root.StarfallInput?.settings?.bindings?.interact||'KeyX').replace(/^Key/,'')+' ENTER · EXPLORABLE CHAMBERS';}
 if(!$('interior-panel').hidden)refresh();}
addEventListener('pagehide',save);
root.StarfallInteriorsUI={tick,interact,exit,refresh,get caveRecords(){return caveRecords.map(x=>({...x}));},get records(){return records.map(x=>({...x}));}};
})(globalThis);
