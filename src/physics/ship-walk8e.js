/* STARFALL 8E — actual bounded walkable interior coordinates.
   Single ship-local scene. No teleport between rooms, no separate planet scene.
   Deck 1 is accessible now; other decks and machinery are future verified slices.
 */
(function(root){'use strict';
const zones=Object.freeze([
 {id:'spine',x0:-5.2,x1:5.2,z0:-53,z1:32,label:'Central pressure corridor'},
 {id:'bridge',x0:-7.5,x1:7.5,z0:-58,z1:-35,label:'Bridge / navigation'},
 {id:'science',x0:-23,x1:-5,z0:-34,z1:-14,label:'Science laboratory'},
 {id:'habitat',x0:5,x1:23,z0:-34,z1:-14,label:'Habitation / medical'},
 {id:'power',x0:5,x1:23,z0:-14,z1:-1,label:'Power distribution'},
 {id:'fabrication',x0:-23,x1:-5,z0:-12,z1:13,label:'Manufacturing and repairs'},
 {id:'life',x0:-23,x1:-5,z0:13,z1:31,label:'Life support'},
 {id:'cargo',x0:5,x1:23,z0:-1,z1:22,label:'Integrated vehicle cargo bay'}
]);
const epsilon=0.65;
function reachable(x,z){
 return Number.isFinite(x)&&Number.isFinite(z)&&zones.some(q=>x>=q.x0+epsilon&&x<=q.x1-epsilon&&z>=q.z0+epsilon&&z<=q.z1-epsilon);
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
root.StarfallShipWalk8E=Object.freeze({zones,reachable,room,move,restore});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallShipWalk8E;
})(typeof globalThis!=='undefined'?globalThis:this);
