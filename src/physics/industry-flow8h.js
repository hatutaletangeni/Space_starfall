/* STARFALL Update 8H — read-only authoritative industry material-flow audit.
 *
 * This is NOT a new logistics owner, wallet, cargo renderer or teleport graph.
 * All material lots come from the ORIGINAL 8A ledger; physical machines from
 * the ORIGINAL 8A asset store; a link exists ONLY when a real saved operation
 * identifies two previously manufactured physical endpoints. For loading from
 * a ground depot into the ship, the actual expedition truck and 8D ship winch
 * remain mandatory; there is no implicit depot-to-factory graph edge.
 *
 * Pure, bounded snapshot inspector. No world generation, T02 grid step,
 * material import/commit, time advance, DOM or localStorage.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),MAX_LIST=2000,EPS=1e-7;
const valid=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const stockType=Object.freeze({
 '8d:truck-expedition-001:hopper':'ORIGINAL_TRUCK',
 '8d:ship-main:materials':'ORIGINAL_SHIP_HOLD'});
function inspect(s={}){
 if(!root.StarfallMaterials8A?.create||!root.StarfallPhysical8A?.create)
  throw Error('8H authoritative physical 8A material owners missing');
 if(!s.materials8a||s.materials8a.schema!==1||
    !s.physical8a||s.physical8a.schema!==1)
  throw Error('8H requires real original 8A inventory and physical snapshots');
 if(s.materials8a.lots?.length>MAX_LIST||
    s.physical8a.assets?.length>MAX_LIST||
    s.materials8a.operations?.length>MAX_LIST*4)
  throw Error('8H material-flow browser list exceeds a bounded inventory view');
 const m=root.StarfallMaterials8A.create(s.materials8a).snapshot(),
  p=root.StarfallPhysical8A.create(s.physical8a).serialize();
 const assets=new Map(p.assets.map(a=>[a.id,a])),
  bins=new Map(m.containers.map(c=>[c.id,c])),
  lots=m.lots,byContainer=new Map(),faults=[],connections=[];
 for(const c of m.containers)byContainer.set(c.id,[]);
 for(const lot of lots){
  if(!bins.has(lot.containerId))throw Error('8H material lot lacks a real container');
  byContainer.get(lot.containerId).push(lot);
 }
 const installed=a=>p.transfers.some(t=>t.action==='INSTALL'&&
  t.status==='COMMITTED'&&t.assetId===a.id&&valid(t.sourceLotId)&&
  finite(t.massKg)&&Math.abs(t.massKg-a.massKg)<EPS);
 const total=xs=>xs.reduce((n,x)=>n+x.massKg,0);
 function contents(containerId){return byContainer.get(containerId)||[];}
 const gasKinds=new Set(['oxygen','nitrogen','hydrogen','methane',
  'carbon_dioxide','carbon_monoxide','sulfur_dioxide']);
 const locations=[];
 for(const c of m.containers){
  const a=assets.get(c.ownerId);
  const isVehicle=c.ownerId==='ship-main'||c.ownerId==='truck-expedition-001';
  const certified=isVehicle||!!(a&&installed(a));
  const stock=contents(c.id);
  locations.push({id:c.id,ownerId:c.ownerId,kind:c.kind,
   location:a?.location?.kind|| (isVehicle?'vehicle':'UNKNOWN'),
   bodyId:a?.location?.bodyId||null,
   massKg:total(stock),capacityKg:c.maxMassKg,
   volumeM3:stock.reduce((sum,x)=>sum+x.volumeM3,0),
   maxVolumeM3:c.maxVolumeM3,materialCount:stock.length,
   certified,materials:stock.map(x=>({id:x.id,type:x.materialId,
    massKg:x.massKg,provenance:x.provenance}))});
  if(!certified&&stock.length)
   faults.push({code:'UNVERIFIED_OWNER',severity:'review',ownerId:c.ownerId,
    reason:'Materials exist in a container not owned by a paid 8E asset or original expedition vehicle'});
 }
 const worldId=valid(s.bodyId)?s.bodyId:null;
 // No local physical surface exists when piloting in deep space.
 // Keep all original stock immutable/inspectable, but NEVER falsely certify
 // a remote packet's flange geometry from a zero/unknown planet radius.
 const onBody=a=>!!worldId&&a?.location?.kind==='surface'&&
   a.location.bodyId===worldId;
 const deps=p.assets.filter(a=>onBody(a)&&a.type==='industrial_plant'&&
   a.state?.station==='cargo_depot'&&installed(a)),
  drives=p.assets.filter(a=>onBody(a)&&a.type==='industrial_plant'&&
   a.state?.station==='conveyor_drive'&&installed(a)),
  pipes=p.assets.filter(a=>onBody(a)&&a.type==='industrial_plant'&&
   a.state?.station==='pressure_pipeline'&&installed(a)),
  vessels=p.assets.filter(a=>onBody(a)&&a.type==='industrial_vessel'&&installed(a));
 const outpost=s.outpost5||{};
 const outpostItems=new Map((outpost.items||[]).map(x=>[x.id,x]));
 const nativeWires=outpost.wires||[];
 const transport=(s.conveyorPackets?.jobs||[]),gas=(s.pressurePackets?.jobs||[]),
  orders=s.logisticsOrders||[],offworld=s.offworldManifests||[];
 if(transport.length>MAX_LIST||gas.length>MAX_LIST||
    orders.length>MAX_LIST||offworld.length>MAX_LIST)
  throw Error('8H too many source-owned job records for bounded industry view');
 const jobMap=new Set(),custody=new Set();
 const originalStock=locations.filter(x=>x.location==='vehicle');
 function verifyRoute(j,isGas){
  if(!valid(j.id)||jobMap.has((isGas?'G:':'C:')+j.id))
   throw Error('8H duplicate or invalid archived industrial job ID');
  jobMap.add((isGas?'G:':'C:')+j.id);
  if(!worldId||j.bodyId!==worldId)return;
  const ids=isGas?[j.sourceId,j.pipeId,j.targetId]:
   [j.sourceId,...(j.driveIds||[]),j.targetId];
  const ends=ids.map(id=>assets.get(id));
  const sameWorld=ids.length>=3&&new Set(ids).size===ids.length&&
   ends.every(a=>a&&installed(a)&&a.location?.kind==='surface'&&
   a.location.bodyId===j.bodyId&&Array.isArray(a.location.local));
  const routeType=sameWorld&&(
   isGas?
    ends[0].type==='industrial_vessel'&&ends[2].type==='industrial_vessel'&&
    ends[1].type==='industrial_plant'&&
    ends[1].state?.station==='pressure_pipeline'&&
    ends[1].state?.ratedPressurePa>=8e6&&ends[1].massKg===320&&
    ends[0].state?.materialId===ends[2].state?.materialId&&
    ends[0].state?.materialId===j.materialId&&
    ends[1].state?.kitMaterialId==='plant_kit_pressure_pipeline':
    ends[0].type==='industrial_plant'&&ends.at(-1).type==='industrial_plant'&&
    ends[0].state?.station==='cargo_depot'&&
    ends.at(-1).state?.station==='cargo_depot'&&
    ends.slice(1,-1).every(a=>a.type==='industrial_plant'&&
     a.state?.station==='conveyor_drive'&&a.state?.kitMaterialId==='plant_kit_conveyor_drive'&&
     a.massKg===180));
  const radius=s.bodyRadius;
  const connectedGeometry=routeType&&finite(radius)&&radius>0&&
   ends.slice(1).every((a,i)=>{
    const dot=ends[i].location.local.reduce((sum,v,k)=>sum+v*a.location.local[k],0);
    const distance=radius*Math.acos(Math.max(-1,Math.min(1,dot)));
    return distance>.01&&distance<=12+EPS;
   });
  const validEndpoints=routeType&&connectedGeometry;
  const lot=lots.find(x=>x.id===j.currentLotId);
  const actualContainer=lot?.containerId||null;
  const expected=isGas?(j.stage===0?ends[0]?.state?.containerId:
   j.stage===1?ends[1]?.state?.containerId:ends[2]?.state?.containerId):
   ends[j.cursor]?.state?.containerId;
  const hasCustody=!!lot&&lot.massKg+EPS>=j.massKg&&
    lot.materialId===j.materialId&&actualContainer===expected;
  const active=j.status==='ACTIVE';
  if(active&&hasCustody){
   if(custody.has(lot.id))faults.push({code:'MULTIPLE_CLAIMS',severity:'block',
    ownerId:lot.id,reason:'Two live logistics jobs claim one original lot'});
   custody.add(lot.id);
  }
  if(!validEndpoints||!hasCustody)
   faults.push({code:'BROKEN_CUSTODY_LINK',severity:'block',ownerId:j.id,
    reason:'Saved operation no longer matches a paid same-world physical endpoint and real 8A cargo lot'});
  connections.push({id:j.id,kind:isGas?'RATED_PIPE':'POWERED_CONVEYOR',
   state:j.status,bodyId:j.bodyId,sourceId:j.sourceId,
   path:ids,sourcePaid:validEndpoints,realCustody:hasCustody,
   lotId:j.currentLotId,materialId:j.materialId,massKg:j.massKg,
   stage:isGas?j.stage:j.cursor,
   remainingS:j.remainingS,
   powerPortId:isGas?ends[1]?.state?.t02LoadId:
     ends.slice(1,-1).map(x=>x?.state?.t02LoadId||null),
   note:hasCustody&&validEndpoints?
    'Physical source-owned custody; latest pump/drive power must be verified at native T02':
    'REQUIRES REPAIR — not a validated physical pipe or conveyor path'});
 }
 for(const j of transport)verifyRoute(j,false);
 for(const j of gas)verifyRoute(j,true);
 const depotStock=deps.reduce((sum,a)=>sum+total(contents(a.state.containerId)),0),
  truckKg=total(contents('8d:truck-expedition-001:hopper')),
  shipKg=total(contents('8d:ship-main:materials'));
 const drillReceipts=(s.miningHistory||[]).filter(x=>
  x.type==='DRILL'&&x.status==='COMMITTED'),
  refinery=s.refineryJob||null,factory=s.factoryJob||null;
 const staged=p.assets.filter(x=>onBody(x)&&
  ['rocket_stage_dry','vehicle_frame','habitat_envelope'].includes(x.type)&&installed(x));
 const realOrders=orders.filter(x=>x?.status==='DELIVERED'),
  realOffworld=offworld.filter(x=>x?.status==='DELIVERED');
 const stages=[
  {id:'SURVEY',state:(s.surveys||0)>0?'EVIDENCE_RECORDED':'NO_VERIFIED_SURVEY',
   count:s.surveys||0,help:'Prospect original finite geology; survey evidence is not ore stock'},
  {id:'EXTRACT',state:drillReceipts.length?'ACTUAL_PAID_DRILL_RECEIPTS':'NO_DRILLED_LOTS',
   count:drillReceipts.length,help:'Park and operate the ORIGINAL drilling truck near a finite ore site'},
  {id:'HAUL',state:truckKg>EPS?'MATERIAL_ON_ORIGINAL_TRUCK':
     realOrders.length?'MATERIAL_AT_PHYSICAL_DEPOT':'NO_HAULED_ORE',
   massKg:truckKg,help:'Drive original truck; collect from a real depot, then drive to landed ship to operate 8D winch'},
  {id:'STORE',state:depotStock>EPS?'ORIGINAL_PAID_DEPOT_STOCK':'NO_DEPOT_STOCK',
   massKg:depotStock,help:'Depot is not a refinery input. Actual truck pickup and ship loading required'},
  {id:'REFINE',state:refinery?'REAL_REFINERY_JOB_ACTIVE':
    shipKg>EPS?'SOURCE_SHIP_HOLD_HAS_STOCK':'NO_SHIP_FEEDSTOCK',
   massKg:shipKg,help:'Real smelter/refinery consumes only ORIGINAL ship hold via installed fabrication workshop and energy'},
  {id:'FABRICATE',state:factory?'REAL_MACHINE_JOB_ACTIVE':
    (s.factoryReceipts||0)>0?'HISTORICAL_FACTORY_RECEIPTS':'NO_ACTIVE_MANUFACTURE',
   count:s.factoryReceipts||0,help:'Original 8F machine shop must consume refined material and draw ship battery'},
  {id:'ASSEMBLE',state:staged.length?'ACTUAL_FINISHED_OR_STAGED_HARDWARE':'NO_PHYSICAL_ASSEMBLY',
   count:staged.length,help:'Original rocket/vehicle parts require 8G installed pad and complete real BOM'},
  {id:'TRANSPORT',state:realOffworld.length?'REAL_DELIVERY_RECEIPTS':
     offworld.some(x=>x.status!=='CANCELLED')?'MANIFEST_NEEDS_MANUAL_FLIGHT':'NO_OFFWORLD_MANIFEST',
   count:realOffworld.length,
   help:'Offworld cannot be completed by UI alone. Pilot the original ship and land at actual destination'}];
 const totals={lotCount:lots.length,totalMassKg:total(lots),
  totalVolumeM3:lots.reduce((sum,x)=>sum+x.volumeM3,0),
  truckKg,shipKg,depotKg:depotStock,
  realDepots:deps.length,realDrives:drives.length,
  installedPipes:pipes.length,realGasVessels:vessels.length,
  liveConveyor:transport.filter(x=>x.status==='ACTIVE').length,
  liveGas:gas.filter(x=>x.status==='ACTIVE').length,
  offworldJobs:offworld.length,deliveredOffworld:realOffworld.length};
 for(const c of m.containers){
  const arr=contents(c.id),mkg=total(arr),vol=arr.reduce((n,x)=>n+x.volumeM3,0);
  if(mkg>c.maxMassKg+EPS||vol>c.maxVolumeM3+EPS)
   throw Error('8H physical inventory exceeds bounded container capacity');
 }
 if(depotStock>EPS&&shipKg<EPS){
  faults.push({code:'NO_AUTOMATIC_DEPOT_TO_SMELTER',severity:'action',
   reason:'A conveyor delivery is NOT instant refinery feed. Drive original truck to depot, pick up, return to ship, operate 8D loading winch'});
 }
 if((transport.length||gas.length)&&!outpostItems.size)
  faults.push({code:'NATIVE_POWER_UNAVAILABLE',severity:'action',
   reason:'Real 8H driven conveyors/pumps require original connected T02 source and its already-paid latest power report'});
 return{schema:1,worldId,totals,stages,connections,
  facilities:{depots:deps.map(x=>x.id),drives:drives.map(x=>x.id),
   pipes:pipes.map(x=>x.id),vessels:vessels.map(x=>x.id)},
  locations,faults,transportOrders:realOrders.length,sourceOwner:'original-8A',
  note:'OBSERVATIONAL only. No industrial throughput or offworld completion is implied.'};
}
root.StarfallIndustryFlow8H=Object.freeze({inspect});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallIndustryFlow8H;
})(typeof globalThis!=='undefined'?globalThis:this);
