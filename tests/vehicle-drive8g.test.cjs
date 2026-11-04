'use strict';
const assert=require('node:assert/strict');
const Drive=require('../src/physics/vehicle-drive8g.js');
const hardware={certified:true,brakesCertified:true,steeringCertified:true,wheelsCertified:true,drivetrainCertified:true,
 massKg:600,wheelRadiusM:.45,wheelCount:6,motorTorqueNm:40,maxMotorPowerW:2500,maxBrakeForceN:4000,
 batteryCapacityJ:1000000,batteryEnergyJ:500000,drivetrainEfficiency:.82,rollingResistanceCoefficient:.03};
const world={gravityMS2:9.81,slopeRad:0,frictionCoefficient:.7};
assert.throws(()=>Drive.create({...hardware,brakesCertified:false}),/not physically certified/);
assert.throws(()=>Drive.create({...hardware,batteryEnergyJ:1100000}),/Out-of-range/);
assert.throws(()=>Drive.create(hardware,{schema:1,distanceM:0,speedMS:0,batteryEnergyJ:-5}),/Invalid/);
const start=Drive.create(hardware),zero=start.step({throttle:0,brake:0},world,.05);
assert.equal(zero.speedMS,0);assert.equal(zero.electricalJ,0);
const running=Drive.create(hardware);let prev=hardware.batteryEnergyJ;
for(let i=0;i<200;i++){
 const r=running.step({throttle:1},world,.05);
 assert.ok(r.speedMS>=0&&r.batteryEnergyJ<=prev&&r.electricalJ>=0);
 assert.ok(Math.abs(r.driveN)<=r.tractionLimitN+1e-9);
 prev=r.batteryEnergyJ;
}
const moving=running.snapshot();assert.ok(moving.speedMS>0&&moving.distanceM>0&&moving.batteryEnergyJ<hardware.batteryEnergyJ);
const saved=Drive.create(hardware,moving);
assert.deepEqual(saved.snapshot(),moving);
for(let i=0;i<100;i++){saved.step({throttle:0,brake:1},world,.05);if(saved.snapshot().speedMS===0)break;}
assert.equal(saved.snapshot().speedMS,0,'Brake must stop rather than reverse vehicle');
const empty=Drive.create({...hardware,batteryEnergyJ:0});
assert.equal(empty.step({throttle:1},world,.05).driveN,0,'Empty battery cannot drive');
const slippery=Drive.create(hardware).step({throttle:1},{...world,frictionCoefficient:.02},.05);
assert.ok(slippery.driveN<=slippery.tractionLimitN);
const slope=Drive.create(hardware).step({throttle:0},{...world,slopeRad:.3},.05);
assert.ok(slope.speedMS<0,'Unpowered vehicle may roll downhill');
assert.throws(()=>Drive.create(hardware).step({throttle:1},world,1),/substep/);
console.log('PASS 8G drive kernel: certified-only SI model, traction, finite energy, braking, empty battery, slope, saved state');
