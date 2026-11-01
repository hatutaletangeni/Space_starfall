'use strict';
const assert=require('node:assert/strict'),P=require('../src/physics/foundation.js'),FP=require('../src/physics/flight-model.js'),Galaxy=require('../src/galaxy.js'),Bridge=require('../src/physics/orbit-bridge.js');
const near=(a,b,tol=1e-9)=>{assert.ok(Number.isFinite(a)&&Number.isFinite(b),'not finite: '+a+', '+b);assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),a+' ≠ '+b);};
function check(){
 const g=Galaxy.generateGalaxy(742,64),base=g.systems[0].planets[0],before=[...base.position],pstar=P.starProfile(g.systems[0].star),pplanet=P.bodyProfile(base,pstar);
 assert.ok(pstar.massKg>0&&pstar.mu>0&&pstar.luminosityW>0);assert.ok(pplanet.massKg>0&&pplanet.mu>0);assert.ok(pplanet.orbit.keplerPeriodS>0);
 assert.deepEqual(P.scienceProfile(g,base),P.scienceProfile(g,base));
 for(const seed of [742,314159,918273]){const x=Galaxy.generateGalaxy(seed,64);const first=x.systems[0].planets[0];const state=P.scienceProfile(x,first);assert.ok(Number.isFinite(state.estimatedEquilibriumTemperatureK));}
 for(const e of [0,.00000001,.2,.7,.92,.995])for(const i of [0,1e-12,Math.PI/6,1.1]){
  const mu=3.986004418e14,o={semiMajorAxisM:7e7,eccentricity:e,inclinationRad:i,ascendingNodeRad:.23,argumentPeriapsisRad:.3,meanAnomalyEpochRad:1.1,epochS:0};
  const a=P.keplerState(o,mu,300000),b=P.keplerState(o,mu,300000+a.periodS),c=P.keplerState(o,mu,300000+100*a.periodS);
  near(P.vec.len(a.positionM),P.vec.len(b.positionM),1e-8);near(P.vec.len(a.velocityMS),P.vec.len(c.velocityMS),1e-8);
  const el=P.stateToElements(a.positionM,a.velocityMS,mu);near(el.semiMajorAxisM,o.semiMajorAxisM,1e-8);near(el.eccentricity,e,1e-8);
  near(a.specificEnergy,-mu/(2*o.semiMajorAxisM),1e-8);
  near(a.specificAngularMomentum,Math.sqrt(mu*o.semiMajorAxisM*(1-e*e)),1e-8);
 }
 const cb=Bridge.attach(g);g.update(10);const old=[...base.position];cb.setEnabled(false);assert.deepEqual(old,base.position);cb.setEnabled(true);assert.ok(base.position.every(Number.isFinite));cb.setEnabled(false);assert.deepEqual(old,base.position);assert.notDeepEqual(before,old);
 const c1=new P.SimulationClock(3),c2=new P.SimulationClock(3);for(let t=0;t<2000;t++)c1.advance(.01,10);for(let t=0;t<400;t++)c2.advance(.05,10);near(c1.at(),c2.at(),1e-11);
 const r=7e6,mu=3.986004418e14,v=Math.sqrt(mu/r),s={rM:[r,0,0],vMS:[0,v,0],craft:FP.shipState({fuelKg:100})};
 const coast=FP.coast(s.rM,s.vMS,mu,5300),orb=P.stateToElements(coast.rM,coast.vMS,mu);near(orb.semiMajorAxisM,r,1e-9);near(orb.eccentricity,0,1e-9);
 const pro=FP.integrateFixed(s,{mu,radiusM:6370000,kind:'planet',type:'Rocky',landable:true},.03,{throttle:1,forward:[0,1,0]});
 assert.ok(pro.craft.fuelKg<s.craft.fuelKg);assert.ok(pro.vMS[1]>s.vMS[1]);
 const rp=P.stateToElements(pro.rM,pro.vMS,mu);assert.ok(rp.apoapsisM>r);
 const ret=FP.integrateFixed(s,{mu,radiusM:6370000,kind:'planet',type:'Rocky',landable:true},.03,{throttle:1,forward:[0,-1,0]});assert.ok(ret.vMS[1]<s.vMS[1]);
 const escaped=P.stateToElements([r,0,0],[0,Math.sqrt(2*mu/r)*1.1,0],mu);assert.ok(escaped.specificEnergy>=0&&!escaped.bound);
 const vacuum=FP.atmosphere({kind:'moon',type:'Ice',landable:true},0);assert.equal(vacuum.densityKgM3,0);assert.equal(FP.aero([9000,0,0],10000,vacuum,FP.shipState()).heatingW,0);
 const dense=FP.atmosphere({kind:'planet',type:'Volcanic',landable:true},0),thin=FP.atmosphere({kind:'planet',type:'Rocky',landable:true},0);
 const d1=FP.aero([3000,0,0],10000,thin,FP.shipState()),d2=FP.aero([3000,0,0],10000,dense,FP.shipState());
 assert.ok(d2.dragN>d1.dragN&&d2.heatingW>d1.heatingW);assert.ok(d2.forceN[0]<0);
 assert.ok(FP.aero([6000,0,0],10000,dense,FP.shipState()).heatingW>d2.heatingW);
 const cooling=FP.thermalStep(FP.shipState({temperatureK:700}),0,10,10);assert.ok(cooling.temperatureK<700);
 const time=FP.coast([r,0,0],[0,v,0],mu,5300),time2=FP.coast([r,0,0],[0,v,0],mu,5300+2*Math.PI*Math.sqrt(r**3/mu));near(P.vec.len(P.vec.sub(time.rM,time2.rM)),0,1e-4);
 const temp=P.equilibriumTemperature(pstar.luminosityW,1e11,.3),cold=P.equilibriumTemperature(pstar.luminosityW,2e11,.3);assert.ok(cold<temp);
 const tiny={...base,radius:106,orbitRadius:9600,orbitPeriod:1500,id:'test-tiny',type:'Ice'},small=P.bodyProfile(tiny,pstar);assert.ok(small.mu>0&&Number.isFinite(small.surfaceGravityMS2));
 const huge=P.starProfile(g.systems[63].star);assert.ok(Number.isFinite(huge.luminosityW)&&huge.mu>0);
 console.log('PASS: deterministic physical profiles, bounded Kepler invariants, extreme eccentricity/time warp, legacy orbit flag parity, circular/orbital burns, escape, vacuum/drag/heating, cooling, temperature distance, tiny moons and giant stars');
}
check();
