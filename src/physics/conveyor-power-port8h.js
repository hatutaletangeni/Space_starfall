/* STARFALL 8H — attach a genuine T02 electrical LOAD to an already paid
 * manufactured 8E conveyor drive. No free outpost module, material, battery,
 * wire or powered conveyor is created. Caller must durably save BOTH owners.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-6;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=70;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const point=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&
 Math.abs(Math.hypot(...x)-1)<1e-4;
function arc(a,b,r){return Math.acos(Math.max(-1,Math.min(1,a.reduce((n,x,i)=>n+x*b[i],0))))*r;}
function attach({physical8a,outpost5,driveId,operatorLocal,bodyId,bodyRadius,timeS}={}){
 if(!id(driveId)||!id(bodyId)||!point(operatorLocal)||
  !finite(bodyRadius)||bodyRadius<=0||!finite(timeS))
  throw Error('8H source-owned installed drive/operator location required');
 if(!root.StarfallPhysical8A?.create||!root.StarfallOutposts?.Store||
  root.StarfallOutposts.SPECS?.conveyor_drive?.watts!==250)
  throw Error('8H original 8A and native 250 W T02 module required');
 const phys=root.StarfallPhysical8A.create(physical8a),a=phys.get(driveId);
 if(!a||a.type!=='industrial_plant'||a.state?.station!=='conveyor_drive'||
  a.state?.kitMaterialId!=='plant_kit_conveyor_drive'||
  a.condition<.5||a.state.enabled!==true||a.massKg!==180||
  a.location?.kind!=='surface'||a.location.bodyId!==bodyId||
  !point(a.location.local))
  throw Error('8H certified physical 180 kg conveyor drive is not installed here');
 if(arc(a.location.local,operatorLocal,bodyRadius)>15)
  throw Error('8H EVA operator must be at the actual drive service port');
 if(!physical8a.transfers?.some(t=>t.action==='INSTALL'&&
  t.status==='COMMITTED'&&t.assetId===driveId&&
  t.massKg===180&&typeof t.sourceLotId==='string'))
  throw Error('8H original consumed-kit conveyor installation receipt missing');
 if(a.state.t02LoadId)
  throw Error('8H drive electrical port already installed; no duplicate load');
 if(!outpost5||outpost5.schema!==1||!Number.isInteger(outpost5.seed)||outpost5.seed<0||
  !Array.isArray(outpost5.items)||!Array.isArray(outpost5.wires))
  throw Error('8H original T02 outpost store not initialized');
 const portId='8h-port:'+driveId;
 if(outpost5.items.length>=320||outpost5.items.some(i=>i.id===portId))
  throw Error('8H outpost grid full or conveyor port ID collision');
 const item={id:portId,bodyId,kind:'conveyor_drive',
  local:[...a.location.local],facing:[0,0,1],
  height:1,energyJ:0,temperatureK:290,condition:1,enabled:true,samples:[]};
 const saved=cp(outpost5);saved.items.push(item);
 const portStore=new root.StarfallOutposts.Store(outpost5.seed,saved);
 if(!portStore.items.some(i=>i.id===portId&&i.kind==='conveyor_drive')||
  portStore.items.some(i=>i.id===portId&&i.energyJ>0))
  throw Error('8H native T02 conveyor load could not be restored');
 const physical=cp(physical8a),installed=physical.assets.find(x=>x.id===driveId);
 if(!installed)throw Error('8H original installed drive missing');
 installed.state.t02LoadId=portId;
 root.StarfallPhysical8A.create(physical);
 return{physical8a:physical,outpost5:portStore.serialize(),
  receipt:{schema:1,driveId,portId,bodyId,timeS,watts:250,
   status:'CONNECTED_PORT_UNWIRED',energyProducedJ:0,materialMovedKg:0,
   note:'250 W T02 load exists but must be physically wired before conveyor can draw energy'}};
}
root.StarfallConveyorPowerPort8H=Object.freeze({attach});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallConveyorPowerPort8H;
})(typeof globalThis!=='undefined'?globalThis:this);
