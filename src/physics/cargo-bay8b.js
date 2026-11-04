/* STARFALL 8B — geometry-audited external vehicle cargo module.
 * Pure logic. Geometry is scene units, NEVER claimed to be SI meters.
 * A different, narrower central ramp remains reserved for crew boarding.
 */
(function(root){'use strict';
const WIDTH=14.5, HEIGHT=12.7, LENGTH=23.0;
const BAY=Object.freeze({centerX:16.5, minX:9.25,maxX:23.75,frontZ:-4,rearZ:19,rampEndZ:39,
 floorY:-1.2,rampEndY:-7.25,vehicleWidth:11.1,vehicleHeight:8.85,vehicleLength:14.8,
 maxCargoMassKg:3500,maxCargoVolumeM3:155,clearanceMargin:0.65});
function finite(n){return typeof n==='number'&&Number.isFinite(n);}
function safePose(p){return p&&finite(p.x)&&finite(p.z)&&finite(p.y)&&Math.abs(p.x)<1e5&&Math.abs(p.z)<1e5;}
function fit(a){
 const g=a||{},reasons=[];
 if(!(finite(g.massKg)&&g.massKg>=0&&g.massKg<=BAY.maxCargoMassKg))reasons.push('CARGO MASS EXCEEDS RATED MOUNT');
 if(!(finite(g.volumeM3)&&g.volumeM3>=0&&g.volumeM3<=BAY.maxCargoVolumeM3))reasons.push('CARGO VOLUME EXCEEDS MOUNT');
 if(BAY.vehicleWidth+2*BAY.clearanceMargin>WIDTH)reasons.push('TRUCK TOO WIDE');
 if(BAY.vehicleHeight+BAY.clearanceMargin>HEIGHT)reasons.push('TRUCK TOO TALL');
 if(BAY.vehicleLength+2*BAY.clearanceMargin>LENGTH)reasons.push('TRUCK TOO LONG');
 return {ok:reasons.length===0,reasons,geometry:BAY};
}
function height(z){
 const t=Math.max(0,Math.min(1,(z-BAY.rearZ)/(BAY.rampEndZ-BAY.rearZ)));
 return BAY.floorY+(BAY.rampEndY-BAY.floorY)*t;
}
function corridor(pos){
 if(!safePose(pos))return false;
 return pos.x>=BAY.minX+BAY.vehicleWidth/2&&pos.x<=BAY.maxX-BAY.vehicleWidth/2;
}
function canApproach(pos,headingZ){return corridor(pos)&&pos.z>=BAY.rampEndZ-2&&pos.z<=BAY.rampEndZ+8&&headingZ<-.65;}
// Explain the *measured* 8B state to the EVA operator without moving cargo.
function loadingAdvice(mode,pos,headingZ){
 if(mode==='secured')return 'TRUCK ALREADY SECURED INSIDE SHIP. B releases tie-downs.';
 if(mode==='ramp'){
  if(!safePose(pos))return 'Truck ramp position unavailable; do not force loading.';
  if(pos.z<=BAY.rearZ-BAY.vehicleLength/2+.01)
   return 'Truck fully on cargo deck. Exit with X; press B at starboard ramp access to lock.';
  return 'Truck is STILL ON RAMP: drive FORWARD with W until whole truck is INSIDE, exit X, then B. Cargo-deck distance remaining '+Math.max(0,pos.z-(BAY.rearZ-BAY.vehicleLength/2)).toFixed(1)+' scene units.';
 }
 if(mode!=='ground')return 'Unknown truck cargo mode; check saved cargo custody.';
 if(!safePose(pos)||!finite(headingZ))return 'Truck is on surface. Drive behind WIDE STARBOARD cargo ramp; center vehicle, face ship, W uphill.';
 const offset=pos.x-BAY.centerX,allowed=(BAY.maxX-BAY.minX-BAY.vehicleWidth)/2;
 if(Math.abs(offset)>allowed)
  return 'TRUCK IS OFF-CENTER by '+Math.abs(offset).toFixed(1)+' scene units ('+(offset>0?'toward starboard edge':'toward centerline')+'). Align with WIDE starboard ramp; permitted center offset ±'+allowed.toFixed(1)+'.';
 if(pos.z<BAY.rampEndZ-2||pos.z>BAY.rampEndZ+8)
  return 'Truck must approach ramp from BEHIND. Move to its foot (loading axis '+BAY.rampEndZ+' scene units from ship; current '+pos.z.toFixed(1)+') and drive W toward ship.';
 if(headingZ>=-.65)return 'Truck faces wrong way. Turn toward SHIP before W; your approach must point into bay.';
 return 'Truck correctly aligned at wide starboard ramp. Drive FORWARD W onto cargo deck, continue well inside, X to exit, then B near ramp access.';
}
function advance(pos,driveScene,ready=true){
 if(!ready||!safePose(pos)||!finite(driveScene)||Math.abs(driveScene)>4)throw Error('Invalid vehicle ramp movement');
 const x=pos.x;
 if(!corridor(pos))throw Error('Truck clearance outside cargo ramp');
 const z=Math.max(BAY.frontZ+BAY.vehicleLength/2,Math.min(BAY.rampEndZ+3,pos.z-driveScene));
 const y=height(z);
 return{x,z,y,inside:z<=BAY.rearZ-BAY.vehicleLength/2,atGround:z>=BAY.rampEndZ};
}
function snapshot(x){if(!x)return {schema:1,mode:'secured',pose:{x:BAY.centerX,z:5.7,y:BAY.floorY},counter:0};
 if(x.schema!==1||!['secured','ramp','ground'].includes(x.mode)||!safePose(x.pose)||!Number.isInteger(x.counter)||x.counter<0)throw Error('Invalid 8B cargo save state');
 return{schema:1,mode:x.mode,pose:{x:x.pose.x,y:x.pose.y,z:x.pose.z},counter:x.counter};
}
root.StarfallCargo8B=Object.freeze({BAY,fit,height,corridor,canApproach,advance,loadingAdvice,snapshot});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallCargo8B;
})(typeof globalThis!=='undefined'?globalThis:this);
