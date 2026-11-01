'use strict';
/* Compares stable unpowered fixed-step integration with conserved Kepler invariants. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const P=require('../src/physics/foundation.js'),F=require('../src/physics/flight-model.js');
const mu=3.986004418e14,a=7e6,T=2*Math.PI*Math.sqrt(a**3/mu),N=Math.ceil(10*T/.1),dt=10*T/N;
let s={rM:[a,0,0],vMS:[0,Math.sqrt(mu/a),0],craft:F.shipState({fuelKg:0})};
const base=P.stateToElements(s.rM,s.vMS,mu),rows=['orbit,time_s,specific_energy_J_kg,specific_angular_momentum_m2_s,radius_m,relative_energy_error,relative_momentum_error'];
const body={mu,radiusM:6370000,kind:'moon',type:'Rocky',landable:true};let maxEnergyError=0,maxAngularError=0;
for(let i=0;i<N;i++){
 const d=F.integrateFixed(s,body,dt,{throttle:0});assert.ok(!d.impact,'Unexpected collision while orbiting');s={rM:d.rM,vMS:d.vMS,craft:d.craft};
 if(i%Math.max(1,Math.floor(N/50))===0||i===N-1){const e=P.stateToElements(s.rM,s.vMS,mu),de=Math.abs((e.specificEnergy-base.specificEnergy)/base.specificEnergy),dh=Math.abs((e.specificAngularMomentum-base.specificAngularMomentum)/base.specificAngularMomentum);maxEnergyError=Math.max(maxEnergyError,de);maxAngularError=Math.max(maxAngularError,dh);
  rows.push([Math.floor(i*dt/T),((i+1)*dt).toFixed(2),e.specificEnergy.toPrecision(15),e.specificAngularMomentum.toPrecision(15),P.vec.len(s.rM).toFixed(5),de.toExponential(3),dh.toExponential(3)].join(','));}
}
assert.ok(maxEnergyError<1e-5,'Energy drift exceeded 1e-5');assert.ok(maxAngularError<1e-5,'Angular momentum drift exceeded 1e-5');
const zero=F.integrateFixed({rM:[0,0,0],vMS:[0,0,0],craft:F.shipState()},body,.01,{});assert.ok(zero.impact&&zero.rM.every(Number.isFinite)&&P.vec.len(zero.rM)>=body.radiusM);
const out=path.join(__dirname,'../reports/orbit-invariants.csv');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,rows.join('\n')+'\n');
console.log('PASS: 10 numerically integrated circular orbits / '+N+' fixed steps; max relative energy error '+maxEnergyError.toExponential(2)+', angular momentum error '+maxAngularError.toExponential(2)+'; zero-radius collision guarded');
