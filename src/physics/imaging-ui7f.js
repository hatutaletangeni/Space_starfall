/* STARFALL 7F: actual offscreen-rendered science images, local storage, radio telemetry.
   Image bytes: IndexedDB, mission metadata: existing SF save schema. */
(function(root){'use strict';
const $=id=>document.getElementById(id),M=root.StarfallImaging7F,RT=root.StarfallRuntime,Sat=root.StarfallSatelliteOps7C,V=root.Starfall3D?.V,O=root.StarfallOutposts,X=root.StarfallLaunch;
if(!M||!RT||!V||!$('imaging7f'))return;
const store=new M.Store(root.SF.load().imaging7f),units=root.StarfallPhysics.SCENE_METERS_PER_UNIT,DB='starfall-7f-images-v1';
const safe=n=>Number.isFinite(n)?n.toFixed(1):'—',err=e=>message(String(e.message||e),false);
let busy=false,lastUI=0,lastPersist=0,dirty=false,energyDirty=false,current=null,dbPromise=null;const thumbs=new Map();
function message(t,success=true){const s=$('imaging7f-status');s.textContent=t;s.dataset.success=String(success);}
function persist(){if(root.SF.save({imaging7f:store.serialize()})===false)message('Image metadata could not be saved; check local storage quota.',false);else{dirty=false;lastPersist=performance.now();}}
function database(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!root.indexedDB)return reject(Error('This browser cannot store mission photos. IndexedDB is required.'));
  const q=indexedDB.open(DB,1);
  q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('images'))q.result.createObjectStore('images');};
  q.onerror=()=>reject(Error('Image archive unavailable: '+(q.error?.message||'IndexedDB denied')));
  q.onsuccess=()=>resolve(q.result);
 }).catch(e=>{dbPromise=null;throw e;});return dbPromise;
}
async function imageGet(id,thumbnail=false){const db=await database();return new Promise((resolve,reject)=>{
 const t=db.transaction('images','readonly'),r=t.objectStore('images').get(id);
 r.onsuccess=()=>resolve(typeof r.result==='string'?r.result:thumbnail?r.result?.thumbnail||r.result?.image||null:r.result?.image||null);r.onerror=()=>reject(Error('Cannot read camera image'));});}
async function imagePut(id,image,thumbnail){const db=await database();await new Promise((resolve,reject)=>{
 const t=db.transaction('images','readwrite');t.objectStore('images').put({image,thumbnail},id);
 t.oncomplete=resolve;t.onerror=()=>reject(Error('Not enough device storage for camera image'));t.onabort=()=>reject(Error('Image transaction aborted'));});}
async function imageRemove(id){const db=await database();await new Promise((resolve,reject)=>{
 const t=db.transaction('images','readwrite');t.objectStore('images').delete(id);t.oncomplete=resolve;t.onerror=()=>reject(Error('Cannot remove archived image'));});}
function sources(){const result=[],local=RT.roverAutonomyPosition?.(),context=RT.scienceContext?.();
 if(local?.local&&context?.body?.id===local.bodyId)result.push({key:'local:'+RT.vehicleStore.get('rover').definition.id,type:'rover',label:'Local science rover',assetId:RT.vehicleStore.get('rover').definition.id,bodyId:local.bodyId,local:true,roverLocal:local});
 for(const r of (root.StarfallLaunchUI?.store?.rovers||[]))result.push({key:'remote:'+r.id,type:'rover',label:'Deployed rover · '+r.id,assetId:r.id,bodyId:r.bodyId,rover:r});
 for(const s of (root.StarfallLaunchUI?.store?.satellites||[]))if(s.kind==='observatory')result.push({key:'satellite:'+s.id,type:'satellite',label:'Orbital science imager · '+s.id,assetId:s.id,bodyId:s.bodyId,sat:s});
 return result;
}
function selected(){return sources().find(x=>x.key===$('imaging7f-source').value)||null;}
function modeChoices(type){return type==='satellite'?[['nadir','Nadir / terrain'],['oblique','Oblique horizon'],['wide','Wide orbital context']]:[['forward','Forward mast'],['left','Left mast'],['right','Right mast'],['panorama','Three-frame panorama'],['target','Nearby ruin target']];}
function selectSources(){const box=$('imaging7f-source'),old=box.value;box.replaceChildren();for(const s of sources()){const option=document.createElement('option');option.value=s.key;option.textContent=s.label;box.append(option);}
 if(sources().some(x=>x.key===old))box.value=old;selectModes();}
function selectModes(){const s=selected(),modes=$('imaging7f-mode'),old=modes.value;modes.replaceChildren();
 for(const [key,label] of modeChoices(s?.type)){const option=document.createElement('option');option.value=key;option.textContent=label;modes.append(option);}
 if(modeChoices(s?.type).some(x=>x[0]===old))modes.value=old;}
function vec(a,b){return a.map((v,i)=>v+(b[i]||0));}
function direction(up,heading){const pole=Math.abs(up[1])>.95?[1,0,0]:[0,1,0],base=V.norm(V.cross(up,pole)),tangent=V.norm(V.cross(up,base));
 return V.norm(V.add(V.mul(base,Math.cos(heading)),V.mul(tangent,Math.sin(heading))));}
function rotForward(f,u,a){return V.norm(V.add(V.mul(f,Math.cos(a)),V.mul(V.cross(u,f),Math.sin(a))));}
function poseFor(s,mode,timeS=RT.time){
 const asset=s.local?{bodyId:s.bodyId,systemId:RT.nearest?.systemId}:s.type==='satellite'?s.sat:s.rover;
 const body=root.StarfallMissionOperationsUI?.resolveBody?.(asset,timeS)||RT.galaxy.byId.get(s.bodyId);
 if(!body?.position||!body.landable)throw Error('AWAITING_RENDER: destination world body ephemeris is missing; no invented terrain');
 if(s.type==='satellite'){
  const sat=s.sat,o=Sat.ensure(sat);
  if(!Sat.PAYLOADS[o.sensor]||o.sensor!=='camera'||sat.kind!=='observatory')throw Error('Select an observatory with a terrain camera payload');
  if(!o.enabled||o.pointing!=='nadir'||o.energyJ<1800)throw Error('Satellite camera requires powered nadir pointing');
  const system=RT.galaxy.byId.get(sat.systemId),star=system?.star?.position||system?.position;
  if(!star)throw Error('Satellite star ephemeris unavailable');
  const geo=Sat.geometry(sat,body,star,timeS,units,X.orbit);
  if(!geo.sunlit)throw Error('Orbital camera requires sunlight; wait for daylight pass');
  if(!(geo.altitudeM>25000))throw Error('Orbital camera below minimum imaging altitude');
  const up=V.norm(geo.relative),orbital=V.norm(V.cross(Math.abs(up[1])>.95?[1,0,0]:[0,1,0],up));
  const f=mode==='nadir'?V.mul(up,-1):mode==='oblique'?V.norm(V.add(V.mul(up,-.78),V.mul(orbital,.63))):V.norm(V.add(V.mul(up,-1),V.mul(orbital,.12)));
  return{body,eye:geo.position,forward:f,up:orbital,altitudeM:geo.altitudeM,headingDeg:null};
 }
 const state=s.local?s.roverLocal:s.rover;
 if(!state?.local)throw Error('Rover position unavailable');
 let radial=V.norm(V.rot(state.local,body.spinAxis||[0,1,0],body.spinAngle||0));
 let forward=s.local?V.norm(V.rot(state.forward,body.spinAxis||[0,1,0],body.spinAngle||0)):direction(radial,state.heading||0);
 forward=V.norm(V.sub(forward,V.mul(radial,V.dot(forward,radial))));
 if(V.len(forward)<.01)forward=direction(radial,0);
 const height=Number(root.Starfall3D.groundHeight(state.local,body))||0;
 const eye=V.add(body.position,V.mul(radial,body.radius+height+3.3));
 if(mode==='left')forward=rotForward(forward,radial,-1.1);
 if(mode==='right')forward=rotForward(forward,radial,1.1);
 if(mode==='target'){
  const localHere=RT.nearest?.id===body.id;
  const saved=(root.SF.load()?.archaeology6c?.records||[]).filter(x=>x.bodyId===body.id&&x.siteSnapshot?.local)
   .map(x=>{const item=x.siteSnapshot,u=V.rot(item.local,body.spinAxis||[0,1,0],body.spinAngle||0);
    return{id:item.id,position:V.add(body.position,V.mul(u,body.radius+(root.Starfall3D.groundHeight(item.local,body)||0)+Math.max(0,item.height||0)))};});
  const targets=localHere?root.StarfallRuinsUI?.scene?.()||saved:saved;
  const near=targets.find(x=>x.position&&V.len(V.sub(x.position,eye))<1300);
  if(!near)throw Error('No visible ruins within camera range for TARGET; use FORWARD instead');
  forward=V.norm(V.sub(near.position,eye));}
 return{body,eye,forward,up:radial,altitudeM:3.3,headingDeg:s.local?null:(state.heading||0)*180/Math.PI};
}
function linkFor(s){
 if(s.type==='rover'){
  if(s.local){const c=RT.outpostContext(),state=s.roverLocal;
   if(!c.landed||c.bodyId!==s.bodyId||!c.local)return{connected:false,reason:'No surface ground terminal'};
   const body=RT.galaxy.byId.get(s.bodyId),distance=root.StarfallGroundOps7D.arcMeters(c.local,state.local,body.radius*units);
   return distance<=30000?{connected:true,quality:Math.max(.15,1-distance/32000),delayS:Math.max(.001,distance/299792458)}:{connected:false,reason:'Rover beyond direct local radio range'};}
  return root.StarfallLaunchUI?.remoteLink?.(s.rover,RT.time)||{connected:false,reason:'Radio model unavailable'};
 }
 const b=RT.galaxy.byId.get(s.bodyId),star=RT.galaxy.byId.get(s.sat.systemId)?.position,station=b&&root.StarfallSatelliteOpsUI?.groundStation?.(b);
 if(!b||!star||!station)return{connected:false,reason:'No powered same-body ground receiver'};
 return Sat.radio(s.sat,b,star,RT.time,units,X.orbit,station.position,O.radioLink);
}
function sourceForPhoto(p){const s=sources().find(x=>x.type===p.sourceType&&x.assetId===p.sourceAssetId);
 return s||null;}
function availableEnergy(s){if(s.type==='satellite')return Sat.ensure(s.sat).energyJ;
 return s.local?RT.vehicleStore.get('rover').state.energyJ:s.rover.batteryJ;}
function consumeEnergy(s,j,immediate=true){if(s.type==='satellite'){
  const o=Sat.ensure(s.sat);o.energyJ=Math.max(0,o.energyJ-j);s.sat.powerJ=o.energyJ;if(immediate)root.StarfallLaunchUI?.persist?.();else energyDirty=true;return;
 }
 if(s.local){const v=RT.vehicleStore.get('rover');RT.vehicleStore.update('rover',{...v.state,energyJ:Math.max(0,v.state.energyJ-j)});if(immediate)RT.persistVehicles();else energyDirty=true;}
 else{s.rover.batteryJ=Math.max(0,s.rover.batteryJ-j);if(immediate)root.StarfallLaunchUI?.persist?.();else energyDirty=true;}
}
async function thumbnailFor(data){return new Promise((resolve,reject)=>{const source=new Image();source.onerror=()=>reject(Error('Image thumbnail decode failed'));source.onload=()=>{const ratio=Math.min(1,256/source.width,256/source.height),canvas=document.createElement('canvas');canvas.width=Math.round(source.width*ratio);canvas.height=Math.round(source.height*ratio);const ctx=canvas.getContext('2d');if(!ctx)return reject(Error('Thumbnail rendering unavailable'));ctx.drawImage(source,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.7));};source.src=data;});}
function cameraCapture(pose,mode,size,caption,s,timeS){
 const offworld=RT.nearest?.id!==pose.body.id||!RT.galaxy.byId.has(pose.body.id);
 const rd=RT.captureScienceImage,remote=root.StarfallRemoteImagingT05;
 if(offworld&&!remote)throw Error('AWAITING_RENDER: isolated GPU camera unavailable');
 if(!offworld&&typeof rd!=='function')throw Error('Offscreen renderer not initialized');
 const render=(forward)=>offworld?remote.capture({
   asset:s.local?{bodyId:s.bodyId,systemId:s.systemId}:s.type==='satellite'?s.sat:s.rover,
   eye:pose.eye,forward,up:pose.up,size,mode,caption:mode==='panorama'?'':caption,timeS
 }):rd({body:pose.body,eye:pose.eye,forward,up:pose.up,size,caption:mode==='panorama'?'':caption,wide:mode==='wide'});
 if(mode!=='panorama')return render(pose.forward);
 // Three actual World renders stitched side by side; no fabricated pixels.
 const images=[render(rotForward(pose.forward,pose.up,-.83)),render(pose.forward),render(rotForward(pose.forward,pose.up,.83))];
 const canvas=document.createElement('canvas');canvas.width=size*3;canvas.height=size;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Panorama compositor unavailable');
 return Promise.all(images.map(x=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Panorama photo decode failed'));img.src=x.image;}))).then(pics=>{
  pics.forEach((img,i)=>ctx.drawImage(img,i*size,0,size,size));
  if(caption){ctx.fillStyle='#07101bd0';ctx.fillRect(0,size-34,size*3,34);ctx.fillStyle='#f2e0c2';ctx.font='14px monospace';ctx.fillText(caption.slice(0,110),12,size-10);}
  const image=canvas.toDataURL('image/jpeg',.77);
  return{image,mime:'image/jpeg',width:size*3,height:size,bytes:Math.floor(image.slice(image.indexOf(',')+1).length*3/4),camera:images[1].camera,sceneSnapshotVersion:images[1].sceneSnapshotVersion||null,renderSource:images[1].renderSource||'STARFALL_7F'};
 });
}
async function perform(job,s){
 if(busy)return;busy=true;
 try{
  const captureAt=Math.max(RT.time,job.deliveredS||0),pose=poseFor(s,job.mode,captureAt),shotEnergy=job.resolution===1024?1700:job.resolution===512?900:520;
  if(availableEnergy(s)<shotEnergy+500)throw Error('Camera cannot operate with depleted battery');
  if(store.countFor(s.type,s.assetId)>=(s.type==='rover'?M.MAX_ROVER:M.MAX_SATELLITE)||store.photos.length>=M.MAX_TOTAL)throw Error('Image storage full');
  store.markRendering(job.id);dirty=true;persist();
  // A real remote render costs GPU setup. Yield to the visible ship scene and
  // render at most one 7F job at a time; captureAt remains the frozen source clock.
  if(RT.nearest?.id!==pose.body.id)await new Promise(resolve=>{
   if(typeof root.requestIdleCallback==='function')root.requestIdleCallback(resolve,{timeout:300});
   else setTimeout(resolve,0);
  });
  const caption='STARFALL SCIENCE | '+s.assetId+' | '+pose.body.name+' | T+'+Math.floor(captureAt)+'s';
  const shot=await cameraCapture(pose,job.mode,job.resolution,$('imaging7f-caption').checked?caption:'',s,captureAt);
  if(shot.bytes>2500000||store.usedBytes()+shot.bytes>M.MAX_BYTES)throw Error('Camera storage byte budget exceeded; select lower resolution');
  // Save image data first. Image capture failures do NOT consume power or create records.
  const nextId='photo-'+(store.serialize().serial+1).toString(36);
  const thumbnail=await thumbnailFor(shot.image);await imagePut(nextId,shot.image,thumbnail);thumbs.set(nextId,thumbnail);
  let photo;try{photo=store.put({sourceType:s.type,sourceAssetId:s.assetId,sourceName:s.label,bodyId:s.bodyId,systemId:pose.body.systemId,
    mode:job.mode,resolution:job.resolution,width:shot.width,height:shot.height,timeS:captureAt,position:pose.eye.slice(),camera:shot.camera,sceneSnapshotVersion:shot.sceneSnapshotVersion||null,renderSource:shot.renderSource||'STARFALL_7F',cameraJobId:job.id,t07JobId:job.t07JobId||null,
    altitudeM:pose.altitudeM,headingDeg:pose.headingDeg,bytes:shot.bytes,mime:shot.mime,caption,
    observationRefs:job.t07JobId?(root.StarfallSatelliteOps7C?.ensure?.(s.sat)?.storage||[]).filter(x=>x.t07JobId===job.t07JobId).map(x=>x.id):(root.StarfallScienceUI?.journal||[]).filter(x=>x.bodyId===s.bodyId).slice(-5).map(x=>x.id)});
  }catch(e){await imageRemove(nextId);throw e;}
  consumeEnergy(s,shotEnergy);store.finishJob(job.id);store.queueDownlink(photo.id);persist();
  message('Camera recorded '+photo.id+' ('+Math.round(photo.bytes/1024)+' KB). Image onboard; queued for radio downlink.');
  refresh();return photo;
 }catch(e){
  // Render failure remains a durable, resumable 7F job. No fake image, archive
  // entry, battery debit, gallery unlock or accepted science evidence.
  store.renderPending(job.id,e?.message||String(e),RT.time);
  dirty=true;persist();refresh();
  message('Camera awaiting real render: '+String(e?.message||e).slice(0,175),false);
  return null;
 }finally{busy=false;}
}
function badge(text){const el=document.createElement('span');el.className='im7f-badge';el.textContent=text;return el;}
function refresh(){
 const list=$('imaging7f-list');list.replaceChildren();
 const filter=$('imaging7f-filter').value,records=store.photos.filter(x=>filter==='all'||x.sourceType===filter||x.status===filter).slice().reverse();
 for(const p of records){const btn=document.createElement('button');btn.type='button';btn.className='im7f-card';btn.append(badge(p.status),document.createTextNode(p.sourceAssetId+' · '+p.mode.toUpperCase()+' · '+p.resolution));
  const info=document.createElement('small');info.textContent=p.bodyId+' · '+Math.round(p.bytes/1024)+' KB · '+Math.floor(100*p.progressBytes/p.bytes)+'%';btn.append(info);
  btn.onclick=()=>showPhoto(p.id).catch(err);if(p.status==='downlinked'){const photo=document.createElement('img');photo.className='im7f-thumb';photo.alt='Downlinked terrain image preview';photo.loading='lazy';btn.prepend(photo);if(thumbs.has(p.id))photo.src=thumbs.get(p.id);else imageGet(p.id,true).then(data=>{if(data){thumbs.set(p.id,data);if(photo.isConnected)photo.src=data;}}).catch(()=>{});}list.append(btn);}
 if(!records.length)list.textContent='No image records match this filter.';
 const jobs=store.jobs;$('imaging7f-jobs').textContent=jobs.length?jobs.map(j=>j.assetId+' '+j.mode.toUpperCase()+' · '+(j.renderState==='AWAITING_RENDER'?'AWAITING_RENDER: '+j.renderReason:j.deliveredS===null?'AWAITING RADIO COMMAND':'ONBOARD CAPTURE')).join('\n'):'No pending image commands.';
 const src=selected();$('imaging7f-link').textContent=src?(linkFor(src).connected?'RADIO LINK: READY · '+'Battery '+safe(availableEnergy(src)/3600)+' Wh':'RADIO BLACKOUT · '+(linkFor(src).reason||'awaiting pass')):'Select a deployed science rover or observatory satellite.';
 $('imaging7f-budget').textContent='Storage: '+(store.usedBytes()/1048576).toFixed(2)+' / '+(M.MAX_BYTES/1048576)+' MiB · '+store.photos.length+' / '+M.MAX_TOTAL+' photos';
}
async function showPhoto(id){
 const p=store.get(id);if(!p)return;
 current=id;$('imaging7f-detail').hidden=false;
 $('imaging7f-metadata').textContent=[p.id,'SOURCE '+p.sourceType.toUpperCase()+' '+p.sourceAssetId,'BODY '+p.bodyId,
 'SYSTEM '+p.systemId,'CAPTURE T+'+safe(p.timeS)+' s','VIEW '+p.mode.toUpperCase(),'RESOLUTION '+p.width+'×'+p.height,
 'ALTITUDE '+safe(p.altitudeM)+' m','SIZE '+Math.round(p.bytes/1024)+' KiB','LINK '+p.status.toUpperCase(),
 'TRANSMITTED '+Math.round(p.progressBytes/p.bytes*100)+'%',
 'JOURNAL OBSERVATIONS '+(p.observationRefs||[]).join(', '),
 'RESEARCH RUNS '+(root.StarfallResearchUI7E?.store?.runs||[]).filter(r=>(r.photoRefs||[]).includes(p.id)).map(r=>r.id).slice(-6).join(', ')].join('\n');
 $('imaging7f-note').value=p.note||'';
 const im=$('imaging7f-photo');
 im.removeAttribute('src');im.alt='';im.hidden=true;
 if(p.status==='downlinked'){
  const data=await imageGet(id);
  if(!data)throw Error('Image bytes missing from this device; restore the original browser archive.');
  im.src=data;im.alt='Actual Starfall in-game '+p.sourceType+' photo of '+p.bodyId+' ('+p.mode+')';im.hidden=false;
  $('imaging7f-download').disabled=false;
 }else $('imaging7f-download').disabled=true;
 $('imaging7f-pending').textContent=p.status==='downlinked'?'Photo received and ready to inspect / export.':'Onboard image · not visible until the actual downlink finishes.';
}
async function deletePhoto(){const id=current;if(!id)return;await imageRemove(id);thumbs.delete(id);store.remove(id);current=null;persist();$('imaging7f-detail').hidden=true;refresh();message('Photo bytes and metadata deleted from this device.');}
function open(){selectSources();$('imaging7f').hidden=false;refresh();$('imaging7f-source').focus();}
function close(){$('imaging7f').hidden=true;}
$('imaging7f-open').onclick=open;
document.querySelectorAll('[data-imaging7f-open]').forEach(btn=>{btn.addEventListener('click',()=>{open();if(btn.dataset.imaging7fType){const found=sources().find(x=>x.type===btn.dataset.imaging7fType);if(found){$('imaging7f-source').value=found.key;selectModes();refresh();}}});});
$('imaging7f-close').onclick=close;$('imaging7f').addEventListener('click',e=>{if(e.target===$('imaging7f'))close();});
$('imaging7f-source').onchange=()=>{selectModes();refresh();};
$('imaging7f-filter').onchange=refresh;
$('imaging7f-request').onclick=()=>{try{const s=selected();if(!s)throw Error('No imaging-capable asset available');const job=store.request(s.type,s.assetId,$('imaging7f-mode').value,Number($('imaging7f-resolution').value),RT.time);
  persist();refresh();message('Imaging command '+job.id+' queued until a radio link exists; no instant remote control.',true);}catch(e){err(e);}};
$('imaging7f-downlink').onclick=()=>{try{if(!current)throw Error('Select photo first');store.queueDownlink(current);persist();refresh();message('Downlink queued until a valid radio pass.');}catch(e){err(e);}};
$('imaging7f-download').onclick=async()=>{try{const p=store.get(current);if(!p||p.status!=='downlinked')throw Error('Photo not yet downlinked');
 const data=await imageGet(p.id);if(!data)throw Error('Original image missing');const a=document.createElement('a');a.href=data;a.download='starfall-'+p.id+'.'+(p.mime==='image/webp'?'webp':'jpg');a.click();
 }catch(e){err(e);}};
$('imaging7f-save-note').onclick=()=>{try{if(!current)throw Error('Select a photo');store.annotate(current,$('imaging7f-note').value);persist();message('Mission photo note saved.',true);}catch(e){err(e);}};
async function exportPortableArchive(){
 const records=[];
 for(const p of store.photos){
  const image=await imageGet(p.id),thumbnail=await imageGet(p.id,true);
  if(!image||!thumbnail)throw Error('Cannot export camera '+p.id+': source image/thumbnail missing');
  records.push({metadata:p,image,thumbnail});
 }
 if(!records.length)throw Error('Nothing in this camera archive to export');
 const archive={format:'STARFALL_CAMERA_ARCHIVE',schema:1,galaxySeed:RT.galaxy.seed,
  origin:'Real WebGL2 camera bytes + original 7F metadata',photos:records};
 const blob=new Blob([JSON.stringify(archive)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
 a.download='starfall-7f-camera-archive.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2500);
 message('Exported '+records.length+' real image(s) as portable camera archive ('+Math.ceil(blob.size/1024)+' KiB).');
}
async function importPortableArchive(file){
 if(!file||file.size>40*1048576||file.size<30)throw Error('Camera archive must be between 30 bytes and 40 MiB');
 const archive=JSON.parse(await file.text());
 if(archive?.format!=='STARFALL_CAMERA_ARCHIVE'||archive.schema!==1||
  archive.galaxySeed!==RT.galaxy.seed||!Array.isArray(archive.photos)||archive.photos.length>120)
  throw Error('Invalid camera archive version, galaxy seed or record count');
 const added=[];
 try{
  for(const entry of archive.photos){
   const p=entry?.metadata;
   M.validateCapture(p);
   if(!p.id||!/^photo-[0-9a-z]+$/.test(p.id)||p.mime!=='image/webp'&&p.mime!=='image/jpeg')
    throw Error('Camera archive contains an invalid image record');
   if(store.get(p.id))continue; // never overwrite live evidence
   for(const x of ['image','thumbnail'])if(!new RegExp('^data:image/(webp|jpeg);base64,').test(entry[x]||'')||entry[x].length>4*1048576)
    throw Error('Camera archive contains malformed or oversized encoded media');
   if(Math.abs(Math.floor(entry.image.split(',')[1].length*3/4)-p.bytes)>6)
    throw Error('Camera archive byte provenance does not match');
   const img=new Image();img.src=entry.image;await img.decode();
   if(img.width!==p.width||img.height!==p.height)throw Error('Camera archive dimensions do not match actual bytes');
   await imagePut(p.id,entry.image,entry.thumbnail);
   try{store.importPhoto(p);added.push(p.id);}catch(e){await imageRemove(p.id);throw e;}
  }
  if(root.SF.save({imaging7f:store.serialize()})===false)throw Error('Browser metadata storage full');
  dirty=false;refresh();message('Restored '+added.length+' original real image(s). Archive metadata and image bytes retained.');
 }catch(e){
  for(const id of added){store.remove(id);await imageRemove(id);}
  root.SF.save({imaging7f:store.serialize()});throw e;
 }
}
$('imaging7f-export-archive').onclick=()=>exportPortableArchive().catch(err);
$('imaging7f-import-archive').onclick=()=>$('imaging7f-archive-file').click();
$('imaging7f-archive-file').onchange=e=>{
 const file=e.target.files?.[0];e.target.value='';
 if(file)importPortableArchive(file).catch(err);
};
$('imaging7f-delete').onclick=()=>deletePhoto().catch(err);
$('imaging7f-photo').onclick=()=>{const img=$('imaging7f-photo');if(img.src)root.open(img.src,'_blank','noopener,noreferrer');};
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('imaging7f').hidden){close();e.stopImmediatePropagation();}},true);
let lastTime=RT.time,lastCheck=performance.now(),lastT03CaptureAttempt=-Infinity;
function tick(_dt){
 const t=RT.time,step=Math.max(0,Math.min(15,t-lastTime));lastTime=t;
 if(!busy&&store.jobs.length){
  const job=store.jobs[0],s=sources().find(x=>x.assetId===job.assetId&&x.type===job.sourceType);
  if(s){
   if(root.StarfallCommsT03){if(job.deliveredS===null)root.StarfallCommsT03.camera(job);else if(performance.now()-lastT03CaptureAttempt>5000){lastT03CaptureAttempt=performance.now();perform(job,s).catch(e=>{err(e);});}}
   else{const link=linkFor(s);if(link.connected){
    if(job.deliveredS===null){store.markDelivered(job.id,t+Math.max(.05,Number(link.delayS)||.05));dirty=true;}
    else if(t>=job.deliveredS)perform(job,s).catch(e=>{store.finishJob(job.id);dirty=true;persist();err(e);});
   }else if(job.deliveredS!==null){/* delayed onboard command continues even if link has since blacked out */if(t>=job.deliveredS)perform(job,s).catch(e=>{store.finishJob(job.id);dirty=true;persist();err(e);});}
   }
  }
 }
 const changes=root.StarfallCommsT03?[]:store.tick(t,step,p=>{const s=sourceForPhoto(p);return s?linkFor(s):{connected:false};},(p,seconds,bandwidth)=>{
  const s=sourceForPhoto(p);if(!s)return-1;
  const budget=Math.min(bandwidth*seconds,p.bytes-p.progressBytes),rate=s.type==='satellite'?125:45,joules=rate*seconds;
  if(availableEnergy(s)<joules+250)return -1;
  consumeEnergy(s,joules,false);return budget;
 });
 if(changes.length)dirty=true;
 const now=performance.now();
 if((dirty||energyDirty)&&now-lastPersist>2500){if(energyDirty){root.StarfallLaunchUI?.persist?.();RT.persistVehicles?.();energyDirty=false;}if(dirty)persist();else lastPersist=now;}
 if(!$('imaging7f').hidden&&now-lastUI>900){lastUI=now;refresh();if(current&&store.get(current)?.status==='downlinked'&&$('imaging7f-photo').hidden)showPhoto(current).catch(err);}
}
addEventListener('pagehide',()=>{if(energyDirty){root.StarfallLaunchUI?.persist?.();RT.persistVehicles?.();}if(dirty)persist();});
root.StarfallImagingUI7F={open,store,tick,refresh,persist,get localAssetCount(){return sources().length;}};
})(window);