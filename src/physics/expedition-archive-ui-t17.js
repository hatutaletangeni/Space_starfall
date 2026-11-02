/* STARFALL T17 — actual offline portable backup UI.
 * No dependence on a server. Full imports are staged and validated in RAM,
 * committed to one IndexedDB transaction and ONE localStorage write.
 * Rollback replays checkpoint if disk is denied or any verification fails.
 */
(function(root){'use strict';
const M=root.StarfallArchiveT17,$=id=>document.getElementById(id);
if(!M||!$('archive-t17'))return;
const DB='starfall-7f-images-v1',safe=x=>String(x??'').slice(0,350),seed=()=>root.StarfallRuntime?.galaxy?.seed;
const status=$('archive-t17-status');let busy=false;
function display(text,ok=true){status.textContent=text;status.dataset.ok=String(ok);}
function storage(){
 try{const s=root.localStorage,token='starfall-t17-write-check';
  s.setItem(token,'ok');if(s.getItem(token)!=='ok')throw Error('storage read-back mismatch');
  s.removeItem(token);
  return{durable:true,raw:s.getItem('starfall_save')};
 }catch(e){return{durable:false,reason:'Browser persistent localStorage unavailable: '+safe(e.message)};}
}
function indexedDBOpen(){
 return new Promise((resolve,reject)=>{
  if(!root.indexedDB)return reject(Error('IndexedDB denied/unavailable. Full camera backup is unavailable.'));
  const req=root.indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('images'))req.result.createObjectStore('images');};
  req.onerror=()=>reject(Error('Cannot open camera binary store: '+(req.error?.message||'denied')));
  req.onsuccess=()=>resolve(req.result);
 });
}
async function readAllMedia(){
 const db=await indexedDBOpen();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('images','readonly'),store=tx.objectStore('images'),
   keys=store.getAllKeys(),values=store.getAll();
  tx.oncomplete=()=>resolve(new Map(keys.result.map((key,i)=>[key,values.result[i]])));
  tx.onerror=()=>reject(Error('Cannot read all camera binary records; no files changed'));
  tx.onabort=()=>reject(Error('Camera archive read transaction aborted'));
 });}finally{db.close();}
}
async function replaceMedia(map){
 const db=await indexedDBOpen();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('images','readwrite'),store=tx.objectStore('images');
  store.clear();for(const [key,val] of map)store.put(val,key);
  tx.oncomplete=resolve;tx.onerror=()=>reject(Error('Camera binary write failed; old save must remain intact'));
  tx.onabort=()=>reject(Error('Camera binary archive transaction aborted'));
 });}finally{db.close();}
}
const toData=raw=>typeof raw==='string'?{image:raw,thumbnail:raw}:raw;
const download=(filename,text)=>{
 const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
 return blob.size;
};
function visibleState(){const s=storage();
 $('archive-t17-save-status').textContent=s.durable?
  'DURABLE BROWSER STORAGE: available. Portable backups are still recommended.':
  'NONPERSISTENT SESSION · '+s.reason+' · Your current game may disappear on close. Export a backup now.';
 $('archive-t17-save-status').dataset.ok=String(s.durable);
 return s;
}
async function exportBackup(includeMedia=false){
 if(busy)throw Error('Another archive operation is in progress');busy=true;
 try{
  const s=visibleState(),state=root.SF.load();
  const photos=state.imaging7f?.photos||[];
  let media=[];
  if(includeMedia){
   const all=await readAllMedia();
   media=photos.map(p=>{
    const data=toData(all.get(p.id));
    if(typeof data?.image!=='string'||typeof data?.thumbnail!=='string')
     throw Error('Original photo '+p.id+' has missing camera binary data. Backup cancelled: use existing 7F gallery to repair or archive it.');
    return{id:p.id,image:data.image,thumbnail:data.thumbnail,
     imageHash:M.hash(data.image),thumbnailHash:M.hash(data.thumbnail)};
   });
  }
  const pack=M.create({state,galaxySeed:seed(),media,includeMedia}),size=download(
   'STARFALL-expedition-'+seed()+(includeMedia?'-FULL-MEDIA':'-STATE')+'.json',JSON.stringify(pack));
  display('Exported '+(includeMedia?'FULL MEDIA':'STATE-ONLY')+' expedition backup · '+pack.summary.rovers+
   ' deployed rovers · '+pack.summary.photos+' camera IDs · '+Math.ceil(size/1024)+' KiB. '+
   (!includeMedia&&photos.length?'State-only file does NOT include photo bytes: for portable image restore export FULL MEDIA. ':'')+
   (!s.durable?'WARNING: current session is not persistent.':''));
  return pack;
 }finally{busy=false;}
}
const decode=data=>new Promise((resolve,reject)=>{
 const img=new Image();img.onload=()=>resolve({w:img.naturalWidth,h:img.naturalHeight});
 img.onerror=()=>reject(Error('Camera payload cannot be decoded as a real image'));
 img.src=data;
});
async function validateMediaBinary(pack){
 const refs=new Map((pack.state.imaging7f?.photos||[]).map(p=>[p.id,p]));
 const result=new Map();
 for(const record of pack.media){
  const p=refs.get(record.id),img=await decode(record.image),thumb=await decode(record.thumbnail);
  if(img.w!==p.width||img.h!==p.height||thumb.w<1||thumb.h<1)
   throw Error('Camera '+p.id+' dimensions do not match original image/thumbnail.');
  result.set(p.id,{image:record.image,thumbnail:record.thumbnail});
 }
 return result;
}
async function importBackup(file,{approved=false}={}){
 if(busy)throw Error('Another backup/import operation is in progress');
 if(!file||file.size<50||file.size>M.MAX_JSON_BYTES+M.MAX_MEDIA_BYTES+4096)
  throw Error('Wrong file size: select an expedition JSON smaller than 160 MiB.');
 busy=true;
 let frozen=false,mediaBefore=null,rawBefore=null,mediaChanged=false;
 try{
  const local=visibleState();
  if(!local.durable)throw Error('Persistent localStorage is unavailable: import safely refused. Export and enable browser storage.');
  const text=await file.text(),pack=JSON.parse(text);
  const summary=M.validate(pack,seed());
  if(pack.scope==='STATE_ONLY'&&summary.photos)
   throw Error('This save references '+summary.photos+' actual camera files but provides no image bytes. Export FULL MEDIA at the source browser; state-only import is refused to prevent phantom photos.');
  const staged=pack.scope==='FULL_MEDIA'?await validateMediaBinary(pack):new Map();
  // Do not attempt to apply owner stores until all checks and binary decode pass.
  const acceptance='REPLACE the current local expedition with '+summary.outposts+' outposts, '+summary.rovers+
   ' deployed rovers and '+summary.photos+' real images? This will reload the original game. Export your current game first.';
  if(!approved&&!root.confirm(acceptance))throw Error('Import cancelled; existing expedition preserved.');
  const verify=storage();if(!verify.durable)throw Error('Browser save lost write permission before import.');
  rawBefore=verify.raw;mediaBefore=await readAllMedia();
  if(pack.scope==='FULL_MEDIA'&&!root.indexedDB)throw Error('Camera binary storage denied');
  root.__STARFALL_IMPORT_PENDING=true;frozen=true;
  // Original UIs must not autosave stale in-memory state during import.
  await replaceMedia(staged);mediaChanged=true;
  root.localStorage.setItem('starfall_save',JSON.stringify(pack.state));
  if(root.localStorage.getItem('starfall_save')!==JSON.stringify(pack.state))
   throw Error('Local expedition state read-back does not match imported archive.');
  // Verifies committed durable state using original SF.load path, not a new owner.
  M.validateState(root.SF.load(),seed());
  display('RESTORE VERIFIED · original save and '+staged.size+' images switched together. Reloading the original game.',true);
  root.location.reload();
  return summary;
 }catch(error){
  if(frozen){
   const failures=[];
   try{if(rawBefore===null)root.localStorage.removeItem('starfall_save');
    else root.localStorage.setItem('starfall_save',rawBefore);}catch(e){failures.push('localStorage rollback: '+safe(e.message));}
   if(mediaChanged)try{await replaceMedia(mediaBefore);}catch(e){failures.push('IndexedDB rollback: '+safe(e.message));}
   if(failures.length)throw Error('IMPORT FAILED; RECOVERY INCOMPLETE. Keep this browser open and export current data. '+
    failures.join(' | ')+' · Original cause: '+safe(error.message));
  }
  throw error;
 }finally{if(frozen)root.__STARFALL_IMPORT_PENDING=false;busy=false;}
}
$('archive-t17-export-state').onclick=()=>exportBackup(false).catch(e=>display('EXPORT FAILED · '+safe(e.message),false));
$('archive-t17-export-full').onclick=()=>exportBackup(true).catch(e=>display('EXPORT FAILED · '+safe(e.message),false));
$('archive-t17-select').onclick=()=>$('archive-t17-file').click();
$('archive-t17-file').onchange=e=>{
 const file=e.target.files?.[0];e.target.value='';
 if(file)importBackup(file).catch(err=>display('IMPORT REJECTED · '+safe(err.message)+' · Existing save retained unless a rollback failure is explicitly shown.',false));
};
$('archive-t17-open').onclick=()=>{$('archive-t17').hidden=false;visibleState();};
$('archive-t17-close').onclick=()=>{$('archive-t17').hidden=true;};
$('archive-t17').onclick=e=>{if(e.target===$('archive-t17'))$('archive-t17').hidden=true;};
visibleState();
root.StarfallExpeditionArchiveUI17={exportBackup,importBackup,validateMediaBinary,readAllMedia,replaceMedia,storage,visibleState};
})(window);