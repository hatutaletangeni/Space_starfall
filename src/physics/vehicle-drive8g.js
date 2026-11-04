/* STARFALL 8G — bounded SI low-speed surface vehicle dynamics kernel.
 * Not wired to world collision, controls, vehicle saves, or 8A custody.
 * Certification must come from verified physical parts, not this model.
 */
(function(root){'use strict';
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const pos=n=>finite(n)&&n>0;
function validateHardware(h){
 if(!h||h.certified!==true||!h.brakesCertified||!h.steeringCertified||!h.wheelsCertified||!h.drivetrainCertified)
  throw Error('8G vehicle is not physically certified: brakes, steering, wheels and drivetrain required');
 for(const k of ['massKg','wheelRadiusM','wheelCount','motorTorqueNm','maxMotorPowerW','maxBrakeForceN',
   'batteryCapacityJ','drivetrainEfficiency','rollingResistanceCoefficient']){
  if(!pos(h[k]))throw Error('Invalid SI hardware parameter: '+k);
 }
 if(!finite(h.batteryEnergyJ)||h.batteryEnergyJ<0)throw Error('Invalid SI hardware parameter: batteryEnergyJ');
 if(!Number.isInteger(h.wheelCount)||h.wheelCount<4||h.wheelCount>8||
    h.batteryEnergyJ>h.batteryCapacityJ||h.drivetrainEfficiency>1||h.rollingResistanceCoefficient>=1)
  throw Error('Out-of-range certified 8G hardware configuration');
 return true;
}
function create(h,initial){
 validateHardware(h);
 const state=initial?JSON.parse(JSON.stringify(initial)):{schema:1,distanceM:0,speedMS:0,batteryEnergyJ:h.batteryEnergyJ};
 if(state.schema!==1||![state.distanceM,state.speedMS,state.batteryEnergyJ].every(finite)||
    state.batteryEnergyJ<0||state.batteryEnergyJ>h.batteryCapacityJ||Math.abs(state.speedMS)>60)
  throw Error('Invalid 8G vehicle dynamics save');
 function step(command,world,dt){
  if(!finite(dt)||dt<=0||dt>.1)throw Error('Require positive simulation substep <= 0.1 s');
  if(!world||!pos(world.gravityMS2)||!finite(world.slopeRad)||!finite(world.frictionCoefficient)||world.frictionCoefficient<0)
   throw Error('Invalid sampled gravity/slope/traction');
  const throttle=clamp(finite(command?.throttle)?command.throttle:0,-1,1);
  const brake=clamp(finite(command?.brake)?command.brake:0,0,1);
  const mass=h.massKg,g=world.gravityMS2,slope=clamp(world.slopeRad,-Math.PI/2,Math.PI/2),
   normalN=mass*g*Math.max(0,Math.cos(slope)),tractionLimitN=normalN*world.frictionCoefficient,
   v=state.speedMS,sign=v!==0?Math.sign(v):0;
  const gradeN=-mass*g*Math.sin(slope);
  const rollingLimitN=h.rollingResistanceCoefficient*normalN;
  const resistN=v!==0?-sign*rollingLimitN:
   -Math.sign(gradeN)*Math.min(Math.abs(gradeN),rollingLimitN);
  const requestedDriveN=throttle*(h.motorTorqueNm*h.wheelCount/h.wheelRadiusM)*h.drivetrainEfficiency;
  const powerLimitedDriveN=Math.min(Math.abs(requestedDriveN),h.maxMotorPowerW/Math.max(Math.abs(v),.5));
  const driveAllowed=state.batteryEnergyJ>0;
  const driveN=driveAllowed?Math.sign(requestedDriveN)*Math.min(powerLimitedDriveN,tractionLimitN):0;
  let brakeN=0;
  if(brake>0){
   const direction=Math.abs(v)>1e-5?Math.sign(v):Math.sign(driveN+gradeN);
   brakeN=-direction*Math.min(brake*h.maxBrakeForceN,tractionLimitN);
  }
  // Brakes may stop but must never reverse velocity through an integration step.
  let nextV=v+((driveN+gradeN+resistN+brakeN)/mass)*dt;
  if(brake>0&&v!==0&&Math.sign(nextV)!==Math.sign(v))nextV=0;
  const electricalPowerW=Math.abs(driveN*v)/h.drivetrainEfficiency;
  const electricalJ=Math.min(state.batteryEnergyJ,electricalPowerW*dt);
  // No regenerative credit is created by friction braking.
  state.batteryEnergyJ=clamp(state.batteryEnergyJ-electricalJ,0,h.batteryCapacityJ);
  state.distanceM+=(v+nextV)*dt/2;
  state.speedMS=nextV;
  return {speedMS:nextV,distanceM:state.distanceM,batteryEnergyJ:state.batteryEnergyJ,
   normalN,tractionLimitN,driveN,brakeN,gradeN,electricalJ,
   approximation:'longitudinal point mass, Coulomb traction, rolling resistance; no suspension or collision solver'};
 }
 return Object.freeze({step,snapshot:()=>JSON.parse(JSON.stringify(state))});
}
root.StarfallVehicleDrive8G=Object.freeze({create,validateHardware});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallVehicleDrive8G;
})(typeof globalThis!=='undefined'?globalThis:this);
