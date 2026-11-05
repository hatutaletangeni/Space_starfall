/* STARFALL 8H — one durable, fail-closed cargo/energy transaction.
 * No new carrier, battery, material or dock is created. The caller must
 * provide an actual 8A physical truck and paid/installed source+destination
 * with existing owner-matched material containers. Saves once, verifies
 * persistent readback, and ONLY THEN permits the live runtime to swap owners.
 * This does not move vehicles or invent a free 8H depot.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x));
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const EPS=1e-6;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function checked(saved,request){
 if(!saved||!saved.physical8a||!saved.materials8a||!saved.logisticsOrders8h||
    !Array.isArray(saved.logisticsEnergyReceipts8h)||!saved.flightGalaxy||
    !saved.engineeringVehicles)throw Error('8H missing authoritative durable game owners');
 if(!request||!['LOAD','DELIVER'].includes(request.action)||!id(request.orderId)||
    !valid(request.timeS)||!valid(request.bodyRadius)||request.bodyRadius<=0)
  throw Error('8H invalid cargo transaction clock or request');
 if(!root.StarfallPhysical8A?.create||!root.StarfallMaterials8A?.create||
    !root.StarfallLogisticsBatteryBridge8H?.execute||
    !root.StarfallLogisticsOrders8H?.create)
  throw Error('8H all authoritative physical, stock, order and vehicle models required');
 const phys=root.StarfallPhysical8A.create(saved.physical8a);
 const truck=phys.get('truck-expedition-001'),pose=saved.flightGalaxy.truckPose;
 if(!truck||truck.type!=='truck'||truck.condition<.2||
    truck.location?.kind!=='surface'||!pose||pose.bodyId!==truck.location.bodyId||
    !Array.isArray(pose.local)||pose.local.length!==3||!pose.local.every(Number.isFinite)||
    !valid(pose.batteryJ)||!valid(truck.state?.batteryJ)||
    Math.abs(truck.state.batteryJ-pose.batteryJ)>EPS)
  throw Error('8H physical truck asset and saved truck battery/position disagree');
 const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((n,x,i)=>n+x*b[i],0))));
 if(angle(truck.location.local,pose.local)>1e-4)
  throw Error('8H original truck world pose is not authoritative');
 const orders=root.StarfallLogisticsOrders8H.create(saved.logisticsOrders8h),o=orders.get(request.orderId);
 if(!o||o.carrierId!==truck.id||o.carrierContainerId!=='8d:truck-expedition-001:hopper'||
    o.bodyId!==truck.location.bodyId)
  throw Error('8H order is not for the real single expedition truck and ore hopper');
 const materials=root.StarfallMaterials8A.create(saved.materials8a);
 const hopper=materials.containers().find(x=>x.id===o.carrierContainerId);
 if(!hopper||hopper.ownerId!==truck.id)
  throw Error('8H original 8D truck hopper does not own cargo');
 const assetId=request.action==='LOAD'?o.sourceId:o.destinationId;
 const containerId=request.action==='LOAD'?o.sourceContainerId:o.destinationContainerId;
 const dock=phys.get(assetId),container=materials.containers().find(x=>x.id===containerId);
 if(!dock||!['industrial_plant','industrial_vessel'].includes(dock.type)||
    dock.condition<.5||dock.state?.enabled===false||
    dock.location?.kind!=='surface'||dock.location.bodyId!==truck.location.bodyId||
    !container||container.ownerId!==dock.id)
  throw Error('8H dock requires existing installed operational surface industrial asset and owned stock container');
 if(!Array.isArray(dock.location.local)||dock.location.local.length!==3)
  throw Error('8H installed dock has no real surface location');
 if(request.bodyId!==truck.location.bodyId)
  throw Error('8H cannot move material between different planets');
 const actor={id:truck.id,bodyId:truck.location.bodyId,
    kind:'truck',local:truck.location.local,containerId:o.carrierContainerId,
    operational:true,condition:truck.condition};
 const site={id:dock.id,bodyId:dock.location.bodyId,local:dock.location.local,containerId};
 return{truck,pose,actor,site};
}
function project(saved,request){
 const ctx=checked(saved,request),B=root.StarfallLogisticsBatteryBridge8H;
 const originalEnergy=ctx.pose.batteryJ;
 const authority={truck:{assetId:ctx.truck.id,energyJ:originalEnergy,
  capacityJ:44000000,location:ctx.truck.location},engineeringVehicles:saved.engineeringVehicles};
 const q=B.execute({authority,receipts:saved.logisticsEnergyReceipts8h,
  sourceId:'starfall-truck',action:request.action,orderId:request.orderId,
  orders:saved.logisticsOrders8h,materials:saved.materials8a,actor:ctx.actor,
  site:ctx.site,bodyRadius:request.bodyRadius,timeS:request.timeS});
 const next=cp(saved);
 next.materials8a=q.materials;next.logisticsOrders8h=q.orders;
 next.logisticsEnergyReceipts8h=q.receipts;
 next.flightGalaxy.truckPose.batteryJ=q.authority.truck.energyJ;
 const a=next.physical8a.assets.find(x=>x.id===ctx.truck.id);
 if(!a||Math.abs(a.state.batteryJ-originalEnergy)>EPS)
  throw Error('8H physical truck battery changed before durable commit');
 a.state.batteryJ=q.authority.truck.energyJ;
 // Everything returned is owned by a single saved game tree; no mutation to
 // any input owner. All material amounts were conserved in the 8A model.
 root.StarfallPhysical8A.create(next.physical8a);
 root.StarfallMaterials8A.create(next.materials8a);
 checked(next,{...request,action:request.action}); // validate source battery/physical position
 return{saved:next,materialReceipt:q.materialReceipt,
  energyReceipt:q.energyReceipt,chargedJ:q.chargedJ};
}
function commit({storage,request}){
 if(!storage||typeof storage.read!=='function'||typeof storage.write!=='function'||
   typeof storage.status!=='function')
  throw Error('8H durable storage read/write/status required');
 if(storage.status()?.durable!==true)
  throw Error('8H persistent storage unavailable; refusing to debit matter or energy');
 const prior=storage.read();
 if(!prior)throw Error('8H no authoritative saved game to modify');
 const q=project(prior,request);
 // Single persisted write; the runtime must use q.saved to update live owners
 // only AFTER this returns successfully. Failed writes cannot claim a transfer.
 if(storage.write(q.saved)!==true)
  throw Error('8H durable cargo/energy save failed; live owners must not change');
 if(storage.status()?.durable!==true)
  throw Error('8H storage stopped being durable after cargo transaction');
 const actual=storage.read();
 for(const key of ['materials8a','logisticsOrders8h','logisticsEnergyReceipts8h','physical8a'])
  if(!same(actual?.[key],q.saved[key]))
   throw Error('8H persisted '+key+' differs from paid cargo transaction');
 if(!same(actual?.flightGalaxy?.truckPose,q.saved.flightGalaxy.truckPose))
  throw Error('8H persisted truck battery does not match source-owned debit');
 return q;
}
const API=Object.freeze({project,commit});
root.StarfallLogisticsDurable8H=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
