/* Update 8A: one authoritative, serializable physical inventory and custody ledger.
 * No renderer, DOM, or localStorage dependencies. Ship loading geometry is Update 8B.
 */
(function(root){'use strict';
const validId=s=>typeof s==='string'&&s.length>0&&s.length<=160;
const number=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const clone=x=>JSON.parse(JSON.stringify(x));
function location(x){if(!x||typeof x!=='object')throw Error('Missing physical location');
 if(x.kind==='ship')return {kind:'ship',parentId:'ship-main',slot:String(x.slot||'hold').slice(0,60)};
 if(x.kind==='surface'&&validId(x.bodyId)&&Array.isArray(x.local)&&x.local.length===3&&x.local.every(Number.isFinite)){
  const q=Math.hypot(...x.local);if(q<.5||q>2)throw Error('Invalid body-fixed position');
  return {kind:'surface',bodyId:x.bodyId,local:x.local.map(v=>v/q)};
 }
 throw Error('Invalid physical location');}
function asset(a){if(!a||!validId(a.id)||!validId(a.type)||!number(a.massKg)||!number(a.volumeM3))
 throw Error('Invalid physical asset');return{id:a.id,type:a.type,massKg:a.massKg,volumeM3:a.volumeM3,
 location:location(a.location),condition:number(a.condition)?Math.min(1,a.condition):0,
 provenance:validId(a.provenance)?a.provenance:'legacy_import',
 components:Array.isArray(a.components)?clone(a.components).slice(0,120):[],state:a.state&&typeof a.state==='object'?clone(a.state):{}};}
function create(saved,legacy={}){
 const input=saved&&saved.schema===1&&Array.isArray(saved.assets)?saved.assets:null;
 const assets=new Map(), transfers=new Map();
 const insert=a=>{const v=asset(a);if(assets.has(v.id))throw Error('Duplicate physical asset ID: '+v.id);assets.set(v.id,v);};
 if(input){for(const a of input)insert(a);
  for(const t of Array.isArray(saved.transfers)?saved.transfers:[])if(validId(t.id)&&!transfers.has(t.id))transfers.set(t.id,clone(t));
 }else{
  insert({id:'ship-main',type:'ship',massKg:0,volumeM3:0,location:{kind:'ship',slot:'self'},condition:1,provenance:'pre_expédition',state:{manifest:true}});
  const pose=(x,type)=>x&&validId(x.bodyId)&&Array.isArray(x.local)&&x.local.length===3&&x.local.every(Number.isFinite)?
   {kind:'surface',bodyId:x.bodyId,local:x.local}:{kind:'ship',slot:type+'-starter-stowage'};
  insert({id:'truck-expedition-001',type:'truck',massKg:1600,volumeM3:13,location:pose(legacy.truckPose,'truck'),condition:1,
   provenance:legacy.truckPose?'legacy_import':'initial_manifest',state:{batteryJ:number(legacy.truckPose?.batteryJ)?legacy.truckPose.batteryJ:44e6}});
  insert({id:'rover-science-001',type:'science-rover',massKg:380,volumeM3:3,location:pose(legacy.roverPose,'rover'),condition:1,
   provenance:legacy.roverPose?'legacy_import':'initial_manifest'});
 }
 function get(id){const a=assets.get(id);return a?clone(a):null;}
 function move(id,to,transferId,requirements={}){
  if(!validId(transferId))throw Error('A unique transfer ID is required');
  const prior=transfers.get(transferId);if(prior){if(prior.assetId!==id)throw Error('Transfer ID already used for another asset');return clone(prior);}
  const a=assets.get(id);if(!a)throw Error('Unknown physical asset');
  const destination=location(to),original=clone(a.location);
  if(requirements.expected&&JSON.stringify(location(requirements.expected))!==JSON.stringify(original))throw Error('Custody changed; transfer rejected');
  if(requirements.maxMassKg!==undefined&&(!number(requirements.maxMassKg)||a.massKg>requirements.maxMassKg))throw Error('Cargo exceeds rated mass');
  if(requirements.maxVolumeM3!==undefined&&(!number(requirements.maxVolumeM3)||a.volumeM3>requirements.maxVolumeM3))throw Error('Cargo exceeds volume');
  if(destination.kind==='ship'&&a.type==='ship')throw Error('Ship cannot be cargo of itself');
  const record={id:transferId,assetId:id,source:original,destination,status:'COMMITTED'};
  a.location=destination;transfers.set(transferId,record);return clone(record);
 }
 function setSurface(id,bodyId,local,updatedState={}){
  const a=assets.get(id);if(!a||a.location.kind!=='surface'||a.location.bodyId!==bodyId)throw Error('Asset is not on this surface');
  a.location=location({kind:'surface',bodyId,local});
  for(const [key,value] of Object.entries(updatedState)){
   if((typeof value==='number'&&Number.isFinite(value))||typeof value==='boolean')a.state[key]=value;
   else if(key==='forward'&&Array.isArray(value)&&value.length===3&&value.every(Number.isFinite)){
    const n=Math.hypot(...value);if(n>1e-6)a.state.forward=value.map(v=>v/n);
   }
  }
  return get(id);
 }
 function serialize(){return {schema:1,assets:[...assets.values()].map(clone),transfers:[...transfers.values()].map(clone)};}
 function list(){return [...assets.values()].map(clone);}
 return Object.freeze({get,list,move,setSurface,serialize});}
root.StarfallPhysical8A=Object.freeze({create,location});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallPhysical8A;
})(typeof globalThis!=='undefined'?globalThis:this);
