/* STARFALL 6G — surface survey map UI. Planet-fixed, discovery-aware, no game-loop edits.
   Browser-only drawing; model operations live in survey-map.js for deterministic tests. */
(function(root){'use strict';
const M=root.StarfallSurveyMap,RT=root.StarfallRuntime,T=root.StarfallStableTerrain,BI=root.StarfallBiomes,GL=root.Starfall3D;
if(!M||!RT||!T||!BI||!GL)throw Error('Survey-map modules unavailable');
const $=id=>document.getElementById(id),saveKey='surveyMap6g',prior=SF.load()[saveKey]||{};
let coverage=M.sanitizeCoverage(prior.coverage),waypoints=Array.isArray(prior.waypoints)?prior.waypoints.filter(x=>x&&/^wp-[a-z0-9-]{2,32}$/.test(x.id)&&typeof x.bodyId==='string'&&x.bodyId.length<160&&Array.isArray(x.local)&&x.local.length===3&&x.local.every(Number.isFinite)&&Math.abs(Math.hypot(...x.local)-1)<.01).map(x=>({id:x.id,bodyId:x.bodyId,local:M.unit(x.local),label:String(x.label||'Waypoint').slice(0,48)})):[];
let center=null,lastBodyId=null,selected=null,canvas=$('survey-canvas'),ctx=canvas.getContext('2d',{alpha:false}),raster=null,rasterKey='',lastSave=performance.now(),dirty=false,lastTick=0,knownMarkers=[],lastCanvasTime=0,refreshCounter=0;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'—';
function current(){const p=RT.outpostContext(),body=p?.body;return body?.landable&&p.landed&&Array.isArray(p.local)?{...p,local:M.unit(p.local)}:null;}
function save(){if(!dirty)return;SF.save({[saveKey]:{schema:1,coverage,waypoints}});dirty=false;lastSave=performance.now();}
function status(t){$('survey-status').textContent=t;}
function range(){return Number($('survey-range').value)||350;}
function isOpen(){return !$('survey-panel').hidden;}
function visit(){const p=current();if(!p)return;if(!coverage[p.bodyId]&&Object.keys(coverage).length>=40){if(isOpen())status('40 mapped worlds limit: export expedition before extending coverage; old maps retained.');return;}if(M.addCoverage(coverage,p.bodyId,p.local,p.body.radius,50)){dirty=true;rasterKey='';}}
function resetCenter(p){if(!p){center=null;lastBodyId=null;return;}if(lastBodyId!==p.bodyId||!center){if(lastBodyId!==p.bodyId)selected=null;lastBodyId=p.bodyId;center=[...p.local];rasterKey='';}else if($('survey-follow').checked&&M.arc(center,p.local,p.body.radius)>8){center=[...p.local];rasterKey='';}}
function pendingJobsT14(p){
 // A queued camera request is NOT a captured image nor received evidence.
 // Plot it only at a real current deployed/local rover position; do not
 // invent geolocations for off-world satellites or delayed future commands.
 const jobs=root.StarfallImagingUI7F?.store?.jobs||[],found=[];
 const ownId=RT.vehicleStore.get('rover').definition.id;
 for(const job of jobs){
  let loc=null;if(job.sourceType==='rover'){
    if(job.assetId===ownId&&RT.roverAutonomyPosition?.()?.bodyId===p.bodyId)
      loc=RT.roverAutonomyPosition().local;
    else{
      const r=root.StarfallLaunchUI?.store?.rovers.find(x=>x.id===job.assetId);
      if(r?.bodyId===p.bodyId&&['parked','running','complete','safe-stop'].includes(r.status))loc=r.local;
    }
  }
  if(loc)found.push({id:'pending-'+job.id,bodyId:p.bodyId,local:loc,
    assetId:job.assetId,requestedAtS:job.createdS});
 }
 return found.slice(-16);
}
function markers(p){if(!p)return[];const found=[],ids=new Set();const push=(m)=>{if(!m?.local||m.bodyId!==p.bodyId||ids.has(m.id))return;try{m.local=M.unit(m.local);}catch(_){return;}ids.add(m.id);found.push(m);};
 push({id:'explorer',bodyId:p.bodyId,local:p.local,label:'Explorer',type:'explorer'});
 if(p.shipLocal)push({id:'ship',bodyId:p.bodyId,local:p.shipLocal,label:'Landed spacecraft',type:'ship'});
 if(p.roverLocal)push({id:'rover',bodyId:p.bodyId,local:p.roverLocal,label:'Rover',type:'rover'});
 for(const s of (root.StarfallOutpostUI?.store?.items||[]))if(s.bodyId===p.bodyId)push({id:s.id,bodyId:s.bodyId,local:s.local,label:s.kind.toUpperCase()+' / '+s.id.slice(-6),type:'outpost'});
 // Only records whose survey action succeeded are displayed. Never expose all seeded ruins/candidates.
 const ruins=root.StarfallRuinsUI?.records||[];
 for(const r of ruins)if(r.bodyId===p.bodyId&&r.level>=1&&r.siteSnapshot?.local)push({id:r.id,bodyId:r.bodyId,local:r.siteSnapshot.local,label:r.level>=2?'Investigated ancient structure':'Mapped archaeological signal',type:'ruin'});
 for(const r of(root.StarfallExpeditionUI?.records||[]))if(r.bodyId===p.bodyId&&r.stage>=1){const known=ids.has(r.id);if(!known)push({id:r.id,bodyId:r.bodyId,local:r.local,label:r.stage>=2?(r.category==='geological'?'Investigated geological site':'Investigated ancient site'):'Mapped '+r.category+' signal',type:r.category==='archaeological'?'ruin':'anomaly'});}
 for(const w of waypoints)if(w.bodyId===p.bodyId)push({...w,type:'waypoint'});
 const evidence=root.StarfallScienceT14?.evidenceLayers({bodyId:p.bodyId,
  journal:root.StarfallScienceUI?.journal||[],
  photos:root.StarfallImagingUI7F?.store?.photos||[],
  ruins:root.StarfallRuinsUI?.records||[],
  ecology:root.StarfallEcologyUI?.records||[],
  outposts:root.StarfallOutpostUI?.store?.items||[],pending:pendingJobsT14(p)})||[];
 for(const m of evidence)push(m);
 return root.StarfallScienceT14?.filterMarkers(found,$('survey-t14-filter').value)||found;
}
const ICONS={explorer:['●','#ffde94'],ship:['◇','#d4e8f3'],rover:['▣','#91d5d5'],outpost:['■','#b4d4a2'],ruin:['✦','#ebae8b'],anomaly:['△','#b5a9f6'],waypoint:['○','#f2c26d'],measurement:['◎','#7bd9ff'],orbital:['▧','#e5c69b'],photo:['◉','#caeeb8'],ecology:['♧','#99deb3'],relay:['⌁','#80c2e1'],pending:['◌','#cfbb99']};
function bgCacheKey(p,w,h){const b=T.descriptorForDirection(p.body,center);return[p.bodyId,b.key,Math.round(range()),$('survey-mode').value,$('survey-fog').checked,coverage[p.bodyId]?.length||0,w,h,Math.round(M.toLocal(center,p.local,p.body.radius).distance/12)].join(':');}
function rasterize(p,w,h){const off=document.createElement('canvas');off.width=100;off.height=82;const c=off.getContext('2d'),im=c.createImageData(off.width,off.height),data=im.data,heights=new Float32Array(off.width*off.height),points=new Array(heights.length),radius=Math.min(w,h)/2-23,scale=radius/range(),visited=new Set(coverage[p.bodyId]||[]);
 for(let y=0;y<off.height;y++)for(let x=0;x<off.width;x++){
  const idx=y*off.width+x,xx=(x+.5)/off.width*w,yy=(y+.5)/off.height*h,dx=(xx-w/2)/scale,dy=(h/2-yy)/scale;
  if(Math.hypot(dx,dy)>range()){data[idx*4]=4;data[idx*4+1]=12;data[idx*4+2]=20;data[idx*4+3]=255;continue;}
  const local=M.fromLocal(center,dx,dy,p.body.radius),hgt=GL.groundHeight(local,p.body),field=GL.field(local,p.body.seed),bio=BI.classify(p.body,local,hgt,field);heights[idx]=hgt;points[idx]={local,field,bio,hgt};
 }
 const mode=$('survey-mode').value,fog=$('survey-fog').checked;
 for(let y=0;y<off.height;y++)for(let x=0;x<off.width;x++){
  const idx=y*off.width+x,i=idx*4,point=points[idx];if(!point)continue;
  const known=!fog||visited.has(M.faceCell(point.local));const left=heights[y*off.width+Math.max(0,x-1)],right=heights[y*off.width+Math.min(off.width-1,x+1)],top=heights[Math.max(0,y-1)*off.width+x],bottom=heights[Math.min(off.height-1,y+1)*off.width+x],light=clamp(.86+(left-right+bottom-top)*.009,.50,1.22);
  const base=mode==='relief'?(()=>{const t=clamp(point.hgt/112,0,1);return[.13+t*.68,.19+t*.66,.24+t*.63];})():BI.color(p.body,point.local,point.hgt,point.field,point.bio);
  for(let k=0;k<3;k++)data[i+k]=Math.round(clamp((known?base[k]*light:.025+base[k]*.055),0,1)*255);
  data[i+3]=255;
 }
 c.putImageData(im,0,0);return off;
}
function legendList(p){const box=$('survey-markers');box.replaceChildren();const sorted=knownMarkers.filter(m=>m.id!=='explorer').map(m=>({...m,distance:M.arc(p.local,m.local,p.body.radius)})).sort((a,b)=>a.distance-b.distance).slice(0,75);
 if(!sorted.length)box.textContent='No recorded locations nearby. Survey new signals or place a waypoint.';
 for(const m of sorted){const el=document.createElement('button');el.type='button';el.setAttribute('aria-pressed',String(selected?.id===m.id));el.textContent=(ICONS[m.type]?.[0]||'•')+' '+m.label+' · '+fmt(m.distance,0)+' units';el.onclick=()=>{selected=m;inspect(p);draw();};box.append(el);}
}
function inspect(p){if(!selected){$('survey-inspect').textContent='Select a map marker or click the surface for distance and bearing.';return;}
 const local=selected.local,here=M.arc(p.local,local,p.body.radius),hdg=M.bearing(p.local,local),scene=GL.sampleTerrain(p.body,local),label=selected.label||'Selected coordinate';
 $('survey-inspect').textContent=[label,'Range: '+fmt(here)+' scene units','Bearing: '+fmt(hdg,0)+'° (0° true north)','Terrain: '+(scene.biome||scene.material),'Elevation: '+fmt(scene.height)+' scene units','Position: '+local.map(x=>fmt(x,5)).join(' / '),$('survey-t14-show-details').checked&&selected.evidenceId?'Evidence '+selected.evidenceId+(selected.sourceId?' / source '+selected.sourceId:'')+(selected.quality?' / '+selected.quality:''):'',selected.photoId?'Actual downlinked photo '+selected.photoId+(selected.targetRuinId?' · target ruin '+selected.targetRuinId:''):'',root.StarfallScienceT14?'Latitude '+fmt(root.StarfallScienceT14.latLon(local).lat,5)+'° · longitude '+fmt(root.StarfallScienceT14.latLon(local).lon,5)+'°':'',selected.type==='waypoint'?'Saved personal waypoint':'Select MARK to save this coordinate'].join('\n');
}
function draw(){if(!isOpen())return;const p=current();if(!p){$('survey-world').textContent='Land on a solid planet or moon before opening a surface map.';ctx.fillStyle='#09141c';ctx.fillRect(0,0,canvas.width,canvas.height);$('survey-markers').textContent='Map unavailable in space.';return;}
 resetCenter(p);const w=canvas.width,h=canvas.height,cache=bgCacheKey(p,w,h);if(rasterKey!==cache||!raster){raster=rasterize(p,w,h);rasterKey=cache;}
 ctx.imageSmoothingEnabled=true;ctx.drawImage(raster,0,0,w,h);
 const mapRadius=Math.min(w,h)/2-23;ctx.strokeStyle='#b49a6670';ctx.lineWidth=1;ctx.beginPath();ctx.arc(w/2,h/2,mapRadius,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle='#d0be9960';for(const f of [.25,.5,.75]){ctx.beginPath();ctx.arc(w/2,h/2,mapRadius*f,0,2*Math.PI);ctx.stroke();}
 ctx.beginPath();ctx.moveTo(w/2,16);ctx.lineTo(w/2,h-16);ctx.moveTo(w/2-60,h/2);ctx.lineTo(w/2+60,h/2);ctx.stroke();
 ctx.font='13px Consolas,monospace';ctx.textAlign='center';ctx.textBaseline='middle';knownMarkers=markers(p);const visible=knownMarkers.filter(m=>M.markerProjection(center,m.local,p.body.radius,range(),w,h).inside);
 const evidenceCount=knownMarkers.filter(x=>['measurement','orbital','photo','ecology'].includes(x.type)).length;
 $('survey-t14-summary').textContent='Visible '+evidenceCount+' received evidence markers on '+p.bodyId+' · '+knownMarkers.length+' selected-layer markers total. Photo markers require real DOWNLINKED 7F bytes; orbital markers require received T07 records. Body-fixed locations · model uncertainty; no fabricated science from world selection. Pending image jobs: '+(root.StarfallImagingUI7F?.store?.jobs||[]).filter(x=>x.assetId).length+'.';
 // Save waypoint selection is drawn with a hollow reticle, but never recorded as surveyed terrain.
 for(const m of visible){const proj=M.markerProjection(center,m.local,p.body.radius,range(),w,h),[glyph,color]=ICONS[m.type]||['•','#ddd'];ctx.fillStyle='#031018';ctx.beginPath();ctx.arc(proj.px,proj.py,11,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;ctx.fillText(glyph,proj.px,proj.py);if(selected?.id===m.id){ctx.strokeStyle='#ffe1a9';ctx.beginPath();ctx.arc(proj.px,proj.py,14,0,Math.PI*2);ctx.stroke();}}
 if(selected&&!visible.some(x=>x.id===selected.id)&&selected.local){const proj=M.markerProjection(center,selected.local,p.body.radius,range(),w,h);if(proj.inside){ctx.strokeStyle='#eabf7f';ctx.strokeRect(proj.px-7,proj.py-7,14,14);}}
 $('survey-world').textContent=p.body.name+' · '+p.body.type+' · '+(p.eva?'ON FOOT':p.roverOccupied?'ROVER':'LANDED')+' · radius '+fmt(p.body.radius,0)+' units · view '+range()+' units from center';
 legendList(p);inspect(p);
}
function open(){const p=current();$('survey-panel').hidden=false;if(p){lastBodyId=null;center=null;visit();save();}draw();}
function clickCanvas(e){const p=current();if(!p)return;const rect=canvas.getBoundingClientRect(),px=(e.clientX-rect.left)/rect.width*canvas.width,py=(e.clientY-rect.top)/rect.height*canvas.height;
 const r=Math.min(canvas.width,canvas.height)/2-23,sc=r/range(),x=(px-canvas.width/2)/sc,y=(canvas.height/2-py)/sc;
 if(Math.hypot(x,y)>range())return;
 const nearest=knownMarkers.map(m=>({m,pj:M.markerProjection(center,m.local,p.body.radius,range(),canvas.width,canvas.height)})).filter(z=>z.pj.inside).sort((a,b)=>Math.hypot(a.pj.px-px,a.pj.py-py)-Math.hypot(b.pj.px-px,b.pj.py-py))[0];
 selected=nearest&&Math.hypot(nearest.pj.px-px,nearest.pj.py-py)<14?nearest.m:{id:'coord',type:'coord',local:M.fromLocal(center,x,y,p.body.radius),label:'Selected surface point',bodyId:p.bodyId};draw();}
function addWaypoint(){const p=current();if(!p||!selected?.local||selected.bodyId!==p.bodyId){status('Select a point on the current planet first.');return;}
 if(waypoints.length>=75){status('75 waypoint limit reached. Remove an older waypoint.');return;}const id='wp-'+(Date.now()%1e11).toString(36)+'-'+Math.floor(Math.random()*1e5).toString(36),waypoint={id,bodyId:p.bodyId,local:[...selected.local],label:'Waypoint '+(waypoints.filter(x=>x.bodyId===p.bodyId).length+1)};waypoints.push(waypoint);dirty=true;save();selected={...waypoint,type:'waypoint'};status('Waypoint saved at planet-fixed coordinates.');draw();}
function removeWaypoint(){if(selected?.type!=='waypoint'){status('Select a saved waypoint to remove.');return;}waypoints=waypoints.filter(w=>w.id!==selected.id);selected=null;dirty=true;save();status('Waypoint removed.');draw();}
$('survey-open').addEventListener('click',open);$('survey-close').addEventListener('click',()=>{$('survey-panel').hidden=true;save();});$('survey-panel').addEventListener('click',e=>{if(e.target===$('survey-panel'))$('survey-panel').hidden=true;});$('survey-panel').addEventListener('keydown',e=>{if(e.key==='Escape'){$('survey-panel').hidden=true;e.stopPropagation();}});
$('survey-t14-filter').addEventListener('change',()=>{selected=null;draw();});$('survey-t14-refresh').onclick=draw;
 $('survey-t14-show-details').onchange=draw;
 for(const id of['survey-mode','survey-range','survey-fog'])$(id).addEventListener('change',()=>{rasterKey='';draw();});$('survey-follow').addEventListener('change',draw);$('survey-recenter').onclick=()=>{const p=current();if(p){center=[...p.local];rasterKey='';draw();}};
canvas.addEventListener('click',clickCanvas);$('survey-waypoint-add').onclick=addWaypoint;$('survey-waypoint-remove').onclick=removeWaypoint;$('survey-open-notebook').onclick=()=>{$('survey-panel').hidden=true;$('discovery-open').click();};
addEventListener('pagehide',save);
// Passive visited-region recording: no alteration of flight, rover or physics step functions.
const observer=setInterval(()=>{if(document.hidden)return;visit();if(dirty&&performance.now()-lastSave>6500)save();if(isOpen())draw();},1400);
function recordOrbitalFootprint(o){if(!o||o.kind!=='orbital-observation'||!o.satelliteId||o.receivedAtS===null||!Array.isArray(o.location)||o.location.length!==3||!o.location.every(Number.isFinite))return false;
 const s=root.StarfallLaunchUI?.store?.satellites.find(x=>x.id===o.satelliteId);const b=RT.galaxy.byId.get(o.bodyId)||root.StarfallMissionOperationsUI?.resolveBody?.(s,o.receivedAtS);if(!b?.radius||!b.landable||b.id!==o.bodyId)return false;
 if(o.instrument!=='orbital-camera'&&o.instrument!=='orbital-spectrometer')return false;
 if(!coverage[b.id]&&Object.keys(coverage).length>=40)return false;
 if(!M.addCoverage(coverage,b.id,o.location,b.radius,Math.max(12,Math.min(140,(o.footprintRadiusM||1000)/1000))))return false;
 dirty=true;rasterKey='';save();if(isOpen())draw();return true;}
root.StarfallSurveyUI={recordOrbitalFootprint,open,draw,get coverage(){return M.sanitizeCoverage(coverage);},get waypoints(){return waypoints.map(x=>({...x,local:[...x.local]}));},get visibleMarkers(){return knownMarkers.map(x=>({...x,local:[...x.local]}));},get selected(){return selected;},save,observer};
})(globalThis);
