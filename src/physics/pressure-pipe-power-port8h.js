/* STARFALL 8H — finite, factory-paid 8 MPa pressure-pipe T02 service
 * port. A REAL 320kg 8F-built 8E-installed sealed line and EMPTY original
 * 8A gas hold-up container are mandatory. T02 port is massless bookkeeping
 * only; no wire, solar charge, gas, pressure, or pump work is granted.
 * Caller must durably save BOTH original physical and T02 owners together.
 */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),EPS=1e-6;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=90;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const unit=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&
 Math.abs(Math.hypot(...x)-1)<1e-4;
const arc=(a,b,r)=>Math.acos(Math.max(-1,Math.min(1,
 a.reduce((n,x,i)=>n+x*b[i],0))))*r;
const SPEC=Object.freeze({kit:'plant_kit_pressure_pipeline',station:'pressure_pipeline',
 massKg:320,ratedPressurePa:8e6,powerW:420,maxHoldupM3:.08,maxHoldupKg:25,
 maxServiceDistanceScene:15});
function attach({physical8a,materials8a,outpost5,pipelineId,
 operatorLocal,bodyId,bodyRadius,timeS}={}){
 if(!id(pipelineId)||!id(bodyId)||!unit(operatorLocal)||
  !finite(bodyRadius)||bodyRadius<=0||!finite(timeS))
  throw Error('8H rated gas pipeline requires real local EVA maintenance');
 if(root.StarfallOutposts?.SPECS?.pressure_pipeline_pump?.watts!==SPEC.powerW||
  !root.StarfallOutposts?.Store||!root.StarfallPhysical8A?.create||
  !root.StarfallMaterials8A?.create)
  throw Error('8H original 8A rated line and original T02 420W load model required');
 const physical=root.StarfallPhysical8A.create(physical8a),
  materials=root.StarfallMaterials8A.create(materials8a);
 const machine=physical.get(pipelineId);
 if(!machine||machine.type!=='industrial_plant'||
    machine.state?.station!==SPEC.station||
    machine.state?.kitMaterialId!==SPEC.kit||
    machine.condition<.8||machine.state?.enabled!==true||
    machine.massKg!==SPEC.massKg||machine.location?.kind!=='surface'||
    machine.location.bodyId!==bodyId||!unit(machine.location.local)||
    !finite(machine.state.ratedPressurePa)||
    machine.state.ratedPressurePa<SPEC.ratedPressurePa)
  throw Error('8H requires intact physically manufactured certified 8 MPa 320kg pressure-pipeline');
 if(arc(machine.location.local,operatorLocal,bodyRadius)>SPEC.maxServiceDistanceScene)
  throw Error('8H EVA operator must service the actual rated pipeline manifold locally');
 if(!physical8a.transfers?.some(t=>t.action==='INSTALL'&&
    t.status==='COMMITTED'&&t.assetId===machine.id&&
    id(t.sourceLotId)&&Math.abs(t.massKg-SPEC.massKg)<EPS))
  throw Error('8H original consumed 8F pressure-line installation kit receipt missing');
 const c=materials.containers().find(c=>c.id===machine.state.containerId&&
   c.ownerId===machine.id&&/gas pipe/.test(c.kind)&&
   Math.abs(c.maxMassKg-SPEC.maxHoldupKg)<EPS&&
   Math.abs(c.maxVolumeM3-SPEC.maxHoldupM3)<EPS);
 if(!c)throw Error('8H gas pipeline has no original EMPTY bounded rated 8A holdup');
 if(materials.inventory(c.id).length||
    materials.operations().some(op=>op.status==='RESERVED'&&
      materials.inventory().some(l=>l.id===op.lotId&&l.containerId===c.id)))
  throw Error('8H install original electrical service on EMPTY depressurized pipeline');
 if(machine.state.t02LoadId)
  throw Error('8H original rated pump electrical load already commissioned');
 if(!outpost5||outpost5.schema!==1||!Number.isSafeInteger(outpost5.seed)||
   outpost5.seed<0||!Array.isArray(outpost5.items)||
   !Array.isArray(outpost5.wires))
  throw Error('8H original T02 outpost store missing');
 const portId='8h-pipe-port:'+pipelineId;
 if(outpost5.items.some(x=>x.id===portId)||outpost5.items.length>=320)
  throw Error('8H pressure-pipeline T02 port collision / bus structure limit');
 const owner=copy(outpost5);owner.items.push({
  id:portId,bodyId,kind:'pressure_pipeline_pump',
  local:[...machine.location.local],facing:[0,0,1],height:1,
  energyJ:0,temperatureK:290,condition:1,enabled:true,samples:[]});
 const native=new root.StarfallOutposts.Store(outpost5.seed,owner);
 if(!native.items.some(x=>x.id===portId&&x.kind==='pressure_pipeline_pump'&&
      x.energyJ===0))
  throw Error('8H native original 420W pressure-pipe load did not restore');
 const next=copy(physical8a),asset=next.assets.find(x=>x.id===pipelineId);
 if(!asset)throw Error('8H source-owned original pressure line missing');
 asset.state.t02LoadId=portId;
 root.StarfallPhysical8A.create(next);
 return{physical8a:next,outpost5:native.serialize(),materials8a:materials.snapshot(),
  receipt:{schema:1,status:'INSTALLED_NOT_WIRED',pipelineId,portId,bodyId,
   timeS,powerW:SPEC.powerW,ratedPressurePa:SPEC.ratedPressurePa,
   energyProducedJ:0,gasCreatedKg:0,gasTransferredKg:0,wireCreated:false,
   note:'No gas, wire or Joules granted. Original T02 48V bus must be physically wired.'}};
}
root.StarfallPressurePipePowerPort8H=Object.freeze({SPEC,attach});
if(typeof module!=='undefined'&&module.exports)
 module.exports=root.StarfallPressurePipePowerPort8H;
})(typeof globalThis!=='undefined'?globalThis:this);
