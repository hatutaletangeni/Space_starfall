/* STARFALL 8H — physical/powered conveyor eligibility interlock, zero transfers.
 * This module never moves ore or invents hardware/energy. A link can be
 * evaluated only between real installed dry depots via existing, installed
 * conveyor-drive assets and the ACTUAL T02 48V outpost bus report. Until a
 * manufactured conveyor drive, physical ports and T02 load integration exist,
 * the response is NO_CONNECTION. Proximity alone never enables throughput.
 */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),EPS=1e-6;
const ident=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const num=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const unit=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&Math.abs(Math.hypot(...x)-1)<1e-4;
const arc=(a,b,r)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((n,x,i)=>n+x*b[i],0))))*r;
const fail=(fault,detail='')=>({schema:1,eligible:false,throughputKgS:0,powerW:0,fault,detail});
function inspect({physical8a,materials8a,outpost5,powerReport,bodyId,bodyRadius,sourceId,targetId,driveIds,timeS}={}){
 if(!ident(bodyId)||!num(bodyRadius)||bodyRadius<=0||!num(timeS)||
   !ident(sourceId)||!ident(targetId)||sourceId===targetId||
   !Array.isArray(driveIds)||driveIds.length<1||driveIds.length>16||
   driveIds.some(x=>!ident(x))||new Set(driveIds).size!==driveIds.length)
  throw Error('8H invalid physical conveyor network request');
 if(!root.StarfallPhysical8A?.create||!root.StarfallMaterials8A?.create)
  throw Error('8H authoritative installed machinery and material owners missing');
 const phys=root.StarfallPhysical8A.create(physical8a),ledger=root.StarfallMaterials8A.create(materials8a);
 function item(id,station){
  const a=phys.get(id);
  if(!a||a.type!=='industrial_plant'||a.state?.station!==station||
     a.state.enabled!==true||a.condition<.5||a.location?.kind!=='surface'||
     a.location.bodyId!==bodyId||!unit(a.location.local))
    return null;
  // An item listed only in physical assets is not proof that its mass was
  // manufactured. It MUST have a previously committed 8E consumed-kit install.
  const installed=physical8a.transfers?.some(t=>t.action==='INSTALL'&&
   t.status==='COMMITTED'&&t.assetId===id&&ident(t.sourceLotId)&&num(t.massKg)&&
   Math.abs(t.massKg-a.massKg)<EPS);
  return installed?a:null;
 }
 const chemicalKinds=['reduction_furnace','glass_furnace','high_temp_cell',
  'electrolyzer','catalytic_reactor'];
 const depotSource=item(sourceId,'cargo_depot');
 // The SOURCE may be a paid plant only when the destination is a distinct
 // paid dry depot. 8E created the original solid product in its already-paid
 // bounded machine hopper; the belt must still transport the actual 8A lot.
 const plantSource=depotSource?null:
  chemicalKinds.map(kind=>item(sourceId,kind)).find(Boolean);
 const from=depotSource||plantSource;
 const to=item(targetId,'cargo_depot')||
  (plantSource?null:chemicalKinds.map(kind=>item(targetId,kind)).find(Boolean));
 if(!from||!to)return fail('NO_CERTIFIED_ENDPOINT',
  'Require paid depot → paid depot/plant OR paid solid-output plant → paid depot');
 for(const a of [from,to]){
  const isFeed=a.state.station!=='cargo_depot';

  const port=isFeed?a.state.dryFeedContainerId:a.state.containerId;
  const c=ledger.containers().find(c=>c.id===port&&c.ownerId===a.id&&
   (isFeed?/dry-reactant feed hopper/i:/dry-solid cargo dock/i).test(c.kind));
  if(!c||isFeed&&(port!=='plantfeed8h:'+a.id||
    Math.abs(c.maxMassKg-120)>EPS||Math.abs(c.maxVolumeM3-.20)>EPS))
   return fail('NO_8A_PORT',isFeed?'Manufactured station missing original bounded 8A dry feed hopper':'Depot missing original dry storage');
 }
 const drives=driveIds.map(x=>item(x,'conveyor_drive'));
 if(drives.some(x=>!x))return fail('NO_CERTIFIED_CONVEYOR','Missing physically manufactured and installed drive segments');
 const chain=[from,...drives,to],lengths=[];
 for(let i=1;i<chain.length;i++){
  const metres=arc(chain[i-1].location.local,chain[i].location.local,bodyRadius);
  if(metres>12+EPS)return fail('DISCONNECTED_SEGMENT','Conveyor segments are not physically connected (max 12 m)');
  lengths.push(metres);
 }
 if(!outpost5||!Array.isArray(outpost5.items)||!Array.isArray(outpost5.wires))
  return fail('NO_T02_WIRING','Original T02 outpost wiring is absent');
 const items=new Map(outpost5.items.filter(x=>x.bodyId===bodyId).map(x=>[x.id,x]));
 const report=powerReport;
 if(!report||report.schema!==1||report.bodyId!==bodyId||!num(report.simulatedAtS)||
    Math.abs(report.simulatedAtS-timeS)>1)
  return fail('STALE_POWER_REPORT','Only the current original T02 grid simulation may authorize power');
 const adjacency=new Map();
 for(const wire of outpost5.wires){
  if(!items.has(wire.a)||!items.has(wire.b))continue;
  if(!adjacency.has(wire.a))adjacency.set(wire.a,new Set());
  if(!adjacency.has(wire.b))adjacency.set(wire.b,new Set());
  adjacency.get(wire.a).add(wire.b);adjacency.get(wire.b).add(wire.a);
 }
 const connected=(a,b)=>{
  const seen=new Set([a]),queue=[a];
  for(let i=0;i<queue.length;i++){
   if(queue[i]===b)return true;
   for(const n of adjacency.get(queue[i])||[])if(!seen.has(n)){
    seen.add(n);queue.push(n);
   }
  }return false;
 };
 const served=[];
 for(const drive of drives){
  const loadId=drive.state?.t02LoadId;
  if(!ident(loadId)||!items.has(loadId))
   return fail('MISSING_T02_LOAD','A real wired outpost electrical load is required for each conveyor drive');
  const electrical=items.get(loadId),reading=report.byId?.[loadId];
  if(electrical.kind!=='conveyor_drive'||electrical.enabled===false||
    electrical.condition<=.02||!reading||reading.power!==true||
    reading.bodyId!==bodyId||
    reading.busId==null||!num(reading.servedW)||reading.servedW<150||
    !Array.isArray(reading.sourceIds)||reading.sourceIds.length===0)
   return fail('NO_POWER','Conveyor drive is switched off, underpowered or load-shed');
  // All loads must share one actual bus. T02's own source graph and energy
  // ledger remain authoritative; this check is not a parallel Joule debit.
  if(!reading.sourceIds.some(id=>items.has(id)&&connected(loadId,id)))
   return fail('DISCONNECTED_POWER','No physically wired T02 source reaches this conveyor drive');
  served.push({id:loadId,busId:reading.busId,servedW:reading.servedW,
    sourceIds:[...reading.sourceIds]});
 }
 if(served.some(x=>x.busId!==served[0].busId))
  return fail('ISOLATED_BUS','Drives do not share one continuous 48V power bus');
 // A powered route is only ELIGIBLE for a future conveyor packet simulation.
 // No stock may move until each packet is scheduled, clocked and paid.
 return{schema:1,eligible:true,throughputKgS:0,powerW:served.reduce((s,x)=>s+x.servedW,0),
  fault:'TRANSFER_ENGINE_NOT_INSTALLED',bodyId,sourceId,targetId,
  driveIds:[...driveIds],lengthM:lengths.reduce((s,x)=>s+x,0),
  totalSegments:lengths.length,sourceLoads:served,observedS:timeS,
  detail:'Real installed and powered links verified; movement, manufacturing and finite conveyor packets still required'};
}
const API=Object.freeze({inspect});
root.StarfallPoweredNetwork8H=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
