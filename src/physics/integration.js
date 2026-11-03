/* STARFALL Update 6: bounded, opt-in CPU diagnostics and transactional save backup.
   Does not change the flight integrator, render resources or world generation. */
(function(root){'use strict';
const $=id=>document.getElementById(id),MAX_FRAMES=240,SCHEMA=1,MAX_IMPORT_BYTES=3*1024*1024;
const finite=x=>typeof x==='number'&&Number.isFinite(x),plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
function safeSave(value,seed){
 if(!plain(value))throw Error('Expected a Starfall save object');
 const raw=JSON.stringify(value);if(raw.length>MAX_IMPORT_BYTES)throw Error('Save data exceeds 3 MB limit');
 if(value.version!==undefined&&(!Number.isSafeInteger(value.version)||value.version<0||value.version>20))throw Error('Invalid save version');
 const f=value.flightGalaxy;
 if(f!==undefined){
  if(!plain(f))throw Error('Flight record must be an object');
  if(f.seed!==undefined&&f.seed!==seed)throw Error('Save belongs to a different galaxy seed. Start a matching ?seed= first.');
  if(f.time!==undefined&&(!finite(f.time)||f.time<0||f.time>=1e13))throw Error('Invalid simulation timestamp');
  if(f.position!==undefined&&(!Array.isArray(f.position)||f.position.length!==3||!f.position.every(x=>finite(x)&&Math.abs(x)<1e15)))throw Error('Invalid world position');
  if(f.groundDirection!==undefined&&f.groundDirection!==null&&(!Array.isArray(f.groundDirection)||f.groundDirection.length!==3||!f.groundDirection.every(finite)))throw Error('Invalid surface attachment');
 }
 for(const field of ['engineeringVehicles','scienceSettings','science4','outpost5','engineering7A','launch7','research7e','imaging7f','robotics4','flightGalaxy','launchPlan','refinery8e','transformations8e'])if(value[field]!==undefined&&!plain(value[field]))throw Error('Invalid '+field+' record');
 if(value.launch7){
  const L=value.launch7;
  if(L.schema!==undefined&&L.schema!==1)throw Error('Unsupported rocket inventory schema: import cancelled');
  if(L.seed!==undefined&&L.seed!==seed)throw Error('Launch inventory belongs to a different galaxy seed');
  for(const name of ['launches','satellites','rovers']){
   if(L[name]!==undefined&&(!Array.isArray(L[name])||L[name].length>4000))throw Error('Invalid or oversized '+name+' in launch inventory');
   if(Array.isArray(L[name])&&L[name].some(x=>!plain(x)||typeof x.id!=='string'||typeof x.bodyId!=='string'))throw Error('Damaged '+name+' entry: backup not imported');
   if(Array.isArray(L[name])&&new Set(L[name].map(x=>x.id)).size!==L[name].length)throw Error('Duplicate '+name+' asset IDs: backup not imported');
  }
 }
 if(value.refinery8e&&(value.refinery8e.schema!==1||!Number.isSafeInteger(value.refinery8e.serial)||!Array.isArray(value.refinery8e.receipts)||
   (value.refinery8e.active!==null&&value.refinery8e.active!==undefined&&(typeof value.refinery8e.active!=='object'||!Number.isFinite(value.refinery8e.active.energyJ)))))throw Error('Invalid refinery save data');
 if(value.transformations8e&&(value.transformations8e.schema!==1||!Array.isArray(value.transformations8e.operations)))throw Error('Invalid refinery transformation receipts');
 if(value.research7e&&(value.research7e.plans!==undefined&&!Array.isArray(value.research7e.plans)||value.research7e.runs!==undefined&&!Array.isArray(value.research7e.runs)))throw Error('Research save records malformed');
 if(value.imaging7f&&(value.imaging7f.photos!==undefined&&!Array.isArray(value.imaging7f.photos)||value.imaging7f.jobs!==undefined&&!Array.isArray(value.imaging7f.jobs)))throw Error('Camera metadata malformed; image data is separate from JSON');
 if(value.outpost5){if(value.outpost5.items!==undefined&&(!Array.isArray(value.outpost5.items)||value.outpost5.items.length>320))throw Error('Invalid/oversized structures');
  if(value.outpost5.wires!==undefined&&(!Array.isArray(value.outpost5.wires)||value.outpost5.wires.length>1500))throw Error('Invalid/oversized wiring');}
 return JSON.parse(raw);
}
function quantile(data,q){if(!data.length)return null;const sorted=[...data].sort((a,b)=>a-b);const p=(sorted.length-1)*q,a=Math.floor(p),b=Math.ceil(p);return sorted[a]+(sorted[b]-sorted[a])*(p-a);}
function finiteSummary(data){return{count:data.length,p50:quantile(data,.50),p95:quantile(data,.95),p99:quantile(data,.99),worst:data.length?Math.max(...data):null};}
function download(name,value,mime='application/json'){const blob=new Blob([value],{type:mime});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
let enabled=false,frame=[],update=[],stamp=0,last={time:null,world:null,cache:null},warnings=[],frameDrops=0;
function recordFrame(now,elapsed,updateMS,renderer,galaxy,simTime,timeScale){if(!enabled)return;
 if(!finite(elapsed)||!finite(updateMS))return;
 const delta=stamp?now-stamp:16.667;stamp=now;
 if(delta>50)frameDrops++;
 frame.push(Math.max(0,delta));update.push(Math.max(0,Math.min(elapsed,updateMS)));
 if(frame.length>MAX_FRAMES)frame.shift();if(update.length>MAX_FRAMES)update.shift();
 // Only sample cache state when the panel refreshes. No scan of the 2,368 stars per frame.
 last.time={simulationSeconds:simTime,scale:timeScale};
}
function diagnostics(){const rt=root.StarfallRuntime;const render=rt?.renderStats?.()||{};const glCanvas=$('universe');const storage=(()=>{try{const v=root.localStorage.getItem('starfall_save');return{available:true,bytes:v?new Blob([v]).size:0};}catch(e){return{available:false,reason:'Storage blocked by browser',bytes:0};}})();
 return{schema:SCHEMA,runDate:new Date().toISOString(),userAgent:navigator.userAgent,active:enabled,renderFPS:finiteSummary(frame).p50?1000/finiteSummary(frame).p50:null,frameMS:finiteSummary(frame),updateMS:finiteSummary(update),frameOver50ms:frameDrops,renderer:{...render,canvasWidth:glCanvas.width,canvasHeight:glCanvas.height},galaxy:{seed:rt?.galaxy.seed,stars:rt?.galaxy.systems.length,loadedRemote:render.galaxyCacheLoaded},state:{time:rt?.time,physics:rt?.engineering?'Engineering':'Assisted',landed:rt?.landed,eva:rt?.eva},storage,warnings:[...warnings]};}
function format(d){const q=x=>finite(x)?x.toFixed(2):'n/a';return[
 'State: '+(d.state.physics||'?')+' / '+(d.state.landed?'SURFACE':'FLIGHT')+' · EVA '+String(d.state.eva),
 'Simulated time: '+q(d.state.time)+'s · '+d.galaxy.stars+' navigable stars',
 'Frame time p50/p95/p99: '+[d.frameMS.p50,d.frameMS.p95,d.frameMS.p99].map(q).join(' / ')+' ms',
 'Update time p50/p95/p99: '+[d.updateMS.p50,d.updateMS.p95,d.updateMS.p99].map(q).join(' / ')+' ms',
 'Frames over 50 ms: '+d.frameOver50ms+' · samples '+d.frameMS.count+' / '+MAX_FRAMES,
 'Rendered bodies '+(d.renderer.renderedBodies??'n/a')+' · culled '+(d.renderer.culledBodies??'n/a')+' · real sky stars '+(d.renderer.visibleStars??'n/a'),
 'Remote systems cached '+(d.galaxy.loadedRemote??'n/a')+' · meshes '+(d.renderer.meshCache??'n/a')+' · rings '+(d.renderer.ringCache??'n/a'),
 'Outpost meshes '+(d.renderer.infrastructureMeshes??'n/a')+' · terrain patch rebuilds '+(d.renderer.patchRebuilds??'n/a'),
 'Drawing scale '+q(d.renderer.pixelRatio)+' · draw calls '+(d.renderer.drawCalls??'not instrumented'),
 'Browser save '+(d.storage.available?'available':'blocked')+' · '+d.storage.bytes+' bytes',
 'GPU timing / memory: not measured (requires compatible GPU tooling)' ].join('\n');}
function refresh(){if(!enabled&&!frame.length){$('integration-readout').textContent='Profiler disabled. Enable it to collect a rolling window of 240 frames.';return;}$('integration-readout').textContent=format(diagnostics());}
function feedback(text,bad=false){const e=$('integration-feedback');e.textContent=text;e.style.color=bad?'#f6b1a1':'#9dd9b5';}
$('integration-open').onclick=()=>{$('integration-modal').hidden=false;refresh();};
$('integration-close').onclick=()=>{$('integration-modal').hidden=true;};
$('integration-modal').addEventListener('click',e=>{if(e.target===$('integration-modal'))$('integration-modal').hidden=true;});
$('integration-enable').onchange=e=>{enabled=e.target.checked;stamp=0;refresh();};
$('integration-reset').onclick=()=>{frame=[];update=[];stamp=0;frameDrops=0;refresh();feedback('Diagnostics window cleared.');};
$('integration-export').onclick=()=>{download('starfall-update6-health.json',JSON.stringify(diagnostics(),null,2));feedback('Performance snapshot exported.');};
$('integration-save-export').onclick=()=>{try{const data=safeSave(SF.load(),root.StarfallRuntime.galaxy.seed);download('starfall-save-backup.json',JSON.stringify(data,null,2));feedback('Save exported. Keep this file safe.');}catch(e){feedback(e.message,true);}};
$('integration-save-file').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>MAX_IMPORT_BYTES)throw Error('The import is larger than 3 MB');const data=safeSave(JSON.parse(await file.text()),root.StarfallRuntime.galaxy.seed);
 // Imported save is only committed after every validation succeeds. If storage is denied,
 // leave the current world unchanged and alert the user instead of false success.
 if(!root.localStorage)throw Error('Browser storage unavailable');
 const serialized=JSON.stringify({...data,version:2});const key='starfall_save';const old=root.localStorage.getItem(key);root.localStorage.setItem(key,serialized);
 if(root.localStorage.getItem(key)!==serialized){if(old===null)root.localStorage.removeItem(key);else root.localStorage.setItem(key,old);throw Error('Save write could not be verified');}
 root.__STARFALL_IMPORT_PENDING=true;feedback('Valid save imported. Reloading the restored world now.');root.location.reload();
 }catch(error){feedback('Import rejected: '+error.message,true);}};
$('integration-copy-summary').onclick=async()=>{const value=format(diagnostics());try{await navigator.clipboard.writeText(value);feedback('Health summary copied.');}catch(e){feedback('Clipboard blocked. Use export JSON instead.',true);}};
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('integration-modal').hidden){$('integration-modal').hidden=true;e.stopImmediatePropagation();}});
setInterval(()=>{if(!$('integration-modal').hidden)refresh();},800);
root.StarfallIntegration={get enabled(){return enabled;},recordFrame,diagnostics,quantile,validateSave:safeSave,format,clear(){frame=[];update=[];stamp=0;frameDrops=0;}};
})(globalThis);
