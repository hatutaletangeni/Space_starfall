/* STARFALL 8H — physical multi-stop truck route manifest, first route slice.
 * This never moves the truck, matter, power or clock. Only certified *existing*
 * same-world dry depots become destinations. A visit requires observation of
 * the SAME original physical truck asset at the next waypoint, in order.
 * The original 8A materials, 8H pickup/delivery and battery owners remain
 * exclusively authoritative. No auto-driving, energy estimates or teleport.
 */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const TRUCK='truck-expedition-001',HOPPER='8d:truck-expedition-001:hopper';
const THRESHOLD_M=24,EPS=1e-7;
function point(x){return Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&
 Math.abs(Math.hypot(...x)-1)<1e-4;}
function arc(a,b,r){return Math.acos(Math.max(-1,Math.min(1,a.reduce((sum,v,i)=>sum+v*b[i],0))))*r;}
function physical(asset,bodyId){
 return asset?.location?.kind==='surface'&&asset.location.bodyId===bodyId&&point(asset.location.local);
}
function witnesses({physical8a,materials8a,truckPose,bodyId,bodyRadius}){
 if(!id(bodyId)||!number(bodyRadius)||bodyRadius<=0||
  !root.StarfallPhysical8A?.create||!root.StarfallMaterials8A?.create)
  throw Error('8H real physical and 8A inventory owners required for routes');
 const phys=root.StarfallPhysical8A.create(physical8a);
 const m=root.StarfallMaterials8A.create(materials8a);
 const truck=phys.get(TRUCK);
 if(!physical(truck,bodyId)||truck.type!=='truck'||truck.condition<.2||
  !truckPose||truckPose.bodyId!==bodyId||!point(truckPose.local)||
  arc(truck.location.local,truckPose.local,bodyRadius)>.01||
  !number(truckPose.batteryJ)||!number(truck.state?.batteryJ)||
  Math.abs(truckPose.batteryJ-truck.state.batteryJ)>EPS)
  throw Error('8H physical truck and saved original pose/battery disagree');
 if(!m.containers().some(c=>c.id===HOPPER&&c.ownerId===TRUCK))
  throw Error('8H original 8D truck hopper unavailable');
 return{phys,m,truck};
}
function depot(phys,m,bodyId,depotId){
 const a=phys.get(depotId);
 if(!a||a.type!=='industrial_plant'||a.state?.station!=='cargo_depot'||
  a.state?.enabled!==true||a.condition<.5||!physical(a,bodyId))
  throw Error('8H multi-stop route requires an installed operational dry depot on the same world');
 const c=m.containers().find(x=>x.id===a.state.containerId&&x.ownerId===a.id&&
  /dry-solid cargo dock/i.test(x.kind||''));
 if(!c)throw Error('8H selected route depot owns no original dry stock container');
 return a;
}
function create(saved){
 if(saved!=null&&(!saved||saved.schema!==1||!Array.isArray(saved.routes)))
  throw Error('8H unsupported saved route schema');
 const routes=new Map();
 for(const r of saved?.routes||[]){
  if(!id(r.id)||routes.has(r.id)||!id(r.bodyId)||r.carrierId!==TRUCK||
    !number(r.radiusM)||r.radiusM<=0||!number(r.createdS)||!number(r.lastS)||
    r.lastS<r.createdS||!point(r.startLocal)||!Array.isArray(r.stops)||
    r.stops.length<2||r.stops.length>12||!Number.isInteger(r.nextIndex)||
    r.nextIndex<0||r.nextIndex>r.stops.length||
    !['ACTIVE','COMPLETED','CANCELLED'].includes(r.status)||
    (r.status==='COMPLETED'&&r.nextIndex!==r.stops.length)||
    (r.status==='ACTIVE'&&r.nextIndex===r.stops.length))
   throw Error('8H corrupt physical route archive');
  const names=new Set();
  for(const s of r.stops){
   if(!id(s.depotId)||names.has(s.depotId)||!point(s.local)||
      !['PENDING','VISITED'].includes(s.status)||!number(s.legM))
    throw Error('8H invalid or repeated saved route waypoint');
   names.add(s.depotId);
  }
  if(r.stops.some((s,i)=>s.status!==(i<r.nextIndex?'VISITED':'PENDING')))
   throw Error('8H route visit state is not consecutive');
  routes.set(r.id,clone(r));
 }
 const snapshot=()=>({schema:1,routes:[...routes.values()].map(clone)});
 const list=()=>[...routes.values()].map(clone);
 const get=id=>routes.has(id)?clone(routes.get(id)):null;
 function plan({id:routeId,bodyId,bodyRadius,timeS,depotIds,...w}){
  if(!id(routeId)||!number(timeS)||routes.has(routeId)||routes.size>=100||
    !Array.isArray(depotIds)||depotIds.length<2||depotIds.length>12||
    new Set(depotIds).size!==depotIds.length||depotIds.some(x=>!id(x)))
   throw Error('8H route needs unique ID and two to twelve distinct physical stops');
  if([...routes.values()].some(r=>r.status==='ACTIVE'))
   throw Error('8H original single truck already has an active route');
  const {phys,m,truck}=witnesses({...w,bodyId,bodyRadius});
  let from=truck.location.local;
  const stops=depotIds.map(depotId=>{
   const d=depot(phys,m,bodyId,depotId);
   const out={depotId,local:[...d.location.local],legM:arc(from,d.location.local,bodyRadius),
    status:'PENDING',arrivedS:null};
   from=d.location.local;
   return out;
  });
  const route={schema:1,id:routeId,carrierId:TRUCK,bodyId,
   radiusM:bodyRadius,startLocal:[...truck.location.local],createdS:timeS,
   lastS:timeS,nextIndex:0,status:'ACTIVE',stops};
  routes.set(routeId,route);
  return{route:clone(route),routes:snapshot()};
 }
 function observe({id:routeId,timeS,bodyId,bodyRadius,physical8a,materials8a,truckPose}){
  const route=routes.get(routeId);
  if(!route||route.status!=='ACTIVE')throw Error('8H route already ended or missing');
  if(!number(timeS)||timeS+EPS<route.lastS||bodyId!==route.bodyId||
    !number(bodyRadius)||Math.abs(bodyRadius-route.radiusM)>EPS)
   throw Error('8H route observation clock/world/radius mismatch');
  const {phys,m,truck}=witnesses({physical8a,materials8a,truckPose,bodyId,bodyRadius});
  const step=route.stops[route.nextIndex];
  const actual=depot(phys,m,bodyId,step.depotId);
  if(arc(step.local,actual.location.local,bodyRadius)>.01)
   throw Error('8H installed route depot moved after route planning');
  const distanceM=arc(truck.location.local,actual.location.local,bodyRadius);
  if(distanceM>THRESHOLD_M)
   throw Error('8H original truck has not physically arrived at the next depot');
  const previous=route.nextIndex===0?route.startLocal:route.stops[route.nextIndex-1].local;
  // Do not treat a never-driven truck as having reached a remote stop merely
  // because the destination was chosen in a menu.
  if(route.nextIndex===0&&arc(previous,actual.location.local,bodyRadius)>THRESHOLD_M&&
    timeS<=route.createdS)
   throw Error('8H route clock has not advanced for travel');
  step.status='VISITED';step.arrivedS=timeS;
  route.nextIndex++;route.lastS=timeS;
  if(route.nextIndex===route.stops.length)route.status='COMPLETED';
  return{route:clone(route),routes:snapshot(),receipt:{
   routeId,stopIndex:route.nextIndex-1,depotId:step.depotId,
   bodyId,observedS:timeS,distanceM,carrierId:TRUCK,status:'VISITED'}};
 }
 function cancel({id:routeId,timeS}){
  const route=routes.get(routeId);
  if(!route||route.status!=='ACTIVE')throw Error('8H only active routes may be cancelled');
  if(!number(timeS)||timeS+EPS<route.lastS)
   throw Error('8H route cancellation clock reversed');
  route.status='CANCELLED';route.lastS=timeS;
  return{route:clone(route),routes:snapshot()};
 }
 return Object.freeze({snapshot,list,get,plan,observe,cancel});
}
const API=Object.freeze({create,TRUCK,HOPPER,THRESHOLD_M});
root.StarfallPhysicalRoutes8H=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
