/* STARFALL 8E-R S2: finite, explicit crew hatch eligibility and transition.
 * Pure game-state rules. Does not teleport people, create vehicles or invent
 * pressure/airlock hardware. Geometry interpolation remains owned by flight.js.
 */
(function(root){'use strict';
const MODES=Object.freeze({PILOT:'PILOT',INTERIOR:'INTERIOR',EVA:'EVA',EXITING:'EXITING',ENTERING:'ENTERING'});
const finite=n=>typeof n==='number'&&Number.isFinite(n);
function exitThreshold(at,{xLimit=3.2,zLimit=29.5}={}){
 return !!at&&finite(at.x)&&finite(at.z)&&Math.abs(at.x)<xLimit&&at.z>zLimit;
}
function requestExit({landed,at,move,truckOccupied,rampTransition,shipWalking}={}){
 if(!landed)return {ok:false,reason:'CREW HATCH · LAND THE SHIP FIRST'};
 if(truckOccupied)return {ok:false,reason:'CREW HATCH · EXIT THE TRUCK FIRST'};
 if(rampTransition)return {ok:false,reason:'CREW HATCH · RAMP TRANSITION STILL ACTIVE'};
 if(!shipWalking)return {ok:false,reason:'CREW HATCH · WALK FROM THE INSIDE FIRST'};
 if(!(move<0&&exitThreshold(at)))return {ok:false,reason:'CREW HATCH · WALK AFT TO THE CENTRAL CREW RAMP'};
 return {ok:true,mode:MODES.EXITING};
}
function requestEntry({landed,eva,truckOccupied,swimming,rampTransition,nearShip,walkedSinceExit,hatchCooldown,atEntrance}={}){
 if(!landed||!eva||truckOccupied)return {ok:false,reason:'CREW HATCH · MUST BE WALKING BESIDE LANDED SHIP'};
 // A crew ramp at the ocean surface is a valid boarding threshold: the
 // astronaut must still be at the correct physical entrance. Swimming must
 // never grant boarding at an arbitrary offshore position.
 if(swimming&&!atEntrance)return {ok:false,reason:'CREW HATCH · SWIM TO THE CENTRAL RAMP OPENING'};
 if(rampTransition)return {ok:false,reason:'CREW HATCH · COMPLETE CURRENT RAMP TRANSITION'};
 if(!(nearShip&&atEntrance))return {ok:false,reason:'CREW HATCH · APPROACH CENTRAL CREW RAMP'};
 if(!(walkedSinceExit>3&&hatchCooldown<=0))return {ok:false,reason:'CREW HATCH · COMPLETE WALK AWAY / COOLDOWN FIRST'};
 return {ok:true,mode:MODES.ENTERING};
}
function boardComplete({landed,eva,truckOccupied,shipBodyPresent,nearShip,transitionKind}={}){
 if(!landed||!eva||truckOccupied||!shipBodyPresent||!nearShip)
  return {ok:false,reason:'CREW HATCH · PHYSICAL POSITION NOT INSIDE SHIP'};
 if(transitionKind!=='in')return {ok:false,reason:'CREW HATCH · ENTRY ANIMATION INCOMPLETE'};
 return {ok:true,mode:MODES.INTERIOR};
}
function canPilot({landed,shipWalking,room,truckOccupied,rampTransition}={}){
 return !!(landed&&shipWalking&&room==='bridge'&&!truckOccupied&&!rampTransition);
}
root.StarfallShipHatch8ER=Object.freeze({MODES,exitThreshold,requestExit,requestEntry,boardComplete,canPilot});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallShipHatch8ER;
})(typeof globalThis!=='undefined'?globalThis:this);
