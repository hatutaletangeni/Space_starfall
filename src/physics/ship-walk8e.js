/* STARFALL 8E — actual bounded walkable interior coordinates.
   Single ship-local scene. No teleport between rooms, no separate planet scene.
   Deck 1 is accessible now; other decks and machinery are future verified slices.
 */
(function(root){'use strict';
const zones=Object.freeze([
 {id:'spine',x0:-5.2,x1:5.2,z0:-53,z1:32,label:'Central pressure corridor'},
 {id:'bridge',x0:-7.5,x1:7.5,z0:-58,z1:-35,label:'Bridge / navigation'},
 {id:'science',x0:-23,x1:-3,z0:-34,z1:-14,label:'Science laboratory'},
 {id:'habitat',x0:3,x1:23,z0:-34,z1:-14,label:'Habitation / medical'},
 {id:'power',x0:3,x1:23,z0:-14,z1:-1,label:'Power distribution'},
 {id:'fabrication',x0:-23,x1:-3,z0:-12,z1:13,label:'Manufacturing and repairs'},
 {id:'life',x0:-23,x1:-3,z0:13,z1:31,label:'Life support'},
 {id:'cargo',x0:3,x1:23,z0:-1,z1:22,label:'Integrated vehicle cargo bay'}
]);
// S1 ship-space registry. Units below are the existing ship-local scene units,
// not an independently scaled level. No new room or inventory is spawned here.
// C01 material hold / A01 airlock remain unbuilt until the geometry slice.
const ROOM_SCHEMA=Object.freeze([
 {id:'spine',code:'U01',module:null,deck:'service',adjacent:['bridge','science','habitat','power','fabrication','life','cargo']},
 {id:'bridge',code:'B01',module:'bridge',deck:'service',adjacent:['spine']},
 {id:'science',code:'S01',module:'science',deck:'service',adjacent:['spine']},
 {id:'habitat',code:'H01',module:'habitat',deck:'service',adjacent:['spine']},
 {id:'power',code:'E01',module:'power',deck:'service',adjacent:['spine']},
 {id:'fabrication',code:'F01',module:'fabrication',deck:'service',adjacent:['spine']},
 {id:'life',code:'L01',module:'life',deck:'service',adjacent:['spine']},
 {id:'cargo',code:'V01',module:'cargo',deck:'service',adjacent:['spine'],role:'single-truck vehicle bay'}
].map(item=>Object.freeze(item)));
function validateRoomGraph(){
 const ids=new Set(zones.map(z=>z.id)),codes=new Set();
 for(const r of ROOM_SCHEMA){
  if(!ids.has(r.id)||codes.has(r.code))throw Error('Invalid ship room identifier');
  codes.add(r.code);
  const bounds=zones.find(z=>z.id===r.id);
  if(!(bounds.x1>bounds.x0&&bounds.z1>bounds.z0))throw Error('Invalid ship interior bounds');
  for(const next of r.adjacent){
   const peer=ROOM_SCHEMA.find(x=>x.id===next);
   if(!peer||!peer.adjacent.includes(r.id))throw Error('Disconnected ship room portal: '+r.id+' -> '+next);
   const overlapX=Math.min(bounds.x1,zones.find(z=>z.id===next).x1)-Math.max(bounds.x0,zones.find(z=>z.id===next).x0);
   const overlapZ=Math.min(bounds.z1,zones.find(z=>z.id===next).z1)-Math.max(bounds.z0,zones.find(z=>z.id===next).z0);
   if(overlapX<=0||overlapZ<=0)throw Error('Room graph claims nonadjacent physical rectangles');
  }
 }
 return true;
}
validateRoomGraph();
function roomSchema(id){const r=ROOM_SCHEMA.find(x=>x.id===id);return r?{...r,adjacent:[...r.adjacent]}:null;}
function routeRooms(from,to){
 if(!ROOM_SCHEMA.some(x=>x.id===from)||!ROOM_SCHEMA.some(x=>x.id===to))return null;
 const seen=new Set([from]),queue=[[from]];
 while(queue.length){
  const route=queue.shift(),at=route[route.length-1];
  if(at===to)return route;
  for(const next of ROOM_SCHEMA.find(x=>x.id===at).adjacent)if(!seen.has(next)){seen.add(next);queue.push([...route,next]);}
 }
 return null;
}
const epsilon=0.65;
function reachable(x,z){
 return Number.isFinite(x)&&Number.isFinite(z)&&zones.some(q=>x>=q.x0+epsilon&&x<=q.x1-epsilon&&z>=q.z0+epsilon&&z<=q.z1-epsilon);
}
function nearVehicleBayTruck(x,z,truckX=16.5,truckZ=5.7){
 return room(x,z)==='cargo'&&Math.hypot(x-truckX,z-truckZ)<=11.5;
}
function room(x,z){
 for(const q of zones.slice(1)){if(x>=q.x0&&x<=q.x1&&z>=q.z0&&z<=q.z1)return q.id;}
 return 'spine';
}
function move(from,dx,dz){
 if(!from||!Number.isFinite(dx)||!Number.isFinite(dz)||Math.hypot(dx,dz)>5)throw Error('Invalid interior movement');
 let x=from.x,z=from.z;const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.45));
 for(let i=0;i<n;i++){if(reachable(x+dx/n,z))x+=dx/n;if(reachable(x,z+dz/n))z+=dz/n;}
 return{x,z};
}
function restore(saved){
 const start={x:0,z:-40,heading:0};
 if(saved==null)return start;
 if(!Number.isFinite(saved.x)||!Number.isFinite(saved.z)||!Number.isFinite(saved.heading)||!reachable(saved.x,saved.z))
   throw Error('Corrupt ship interior position');
 return{x:saved.x,z:saved.z,heading:((saved.heading%(2*Math.PI))+2*Math.PI)%(2*Math.PI)};
}
root.StarfallShipWalk8E=Object.freeze({zones,ROOM_SCHEMA,roomSchema,routeRooms,validateRoomGraph,reachable,room,nearVehicleBayTruck,move,restore});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallShipWalk8E;
})(typeof globalThis!=='undefined'?globalThis:this);
