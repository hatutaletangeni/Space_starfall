/* STARFALL 9C — local aerodynamic animal flight (no WebGL dependency).
 * Flight uses SI kg, m, s, N and Pa in an ecology-local frame: +Y is up,
 * +X east and +Z north. One ecology-display unit is one local metre.
 * IMPORTANT: celestial scene coordinates use a different legacy mapping
 * (1000 m/scene unit); that scale is intentionally NOT reused for animal
 * anatomy. The ecology UI is responsible for the visual coordinate adapter.
 * This is a bounded force-based wing model, not full CFD, fluid coupling or
 * rigid articulated wing dynamics.
 */
(function(root){'use strict';
const DT=1/30, MAX_STEPS=14, TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>typeof v==='number'&&Number.isFinite(v);
function hash(id){let h=2166136261;for(const c of String(id))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function phase(id){return hash(id)/4294967296*TAU;}
function airDensity(pressurePa,temperatureK){
 if(!finite(pressurePa)||!finite(temperatureK)||pressurePa<=0||temperatureK<=0)return 0;
 return clamp(pressurePa/(287.05*temperatureK),0,6);
}
function start(id,massKg=1,sizeM=1,timeS=0){
 const p=phase(id),angle=p+timeS*.21,speed=7.2;
 return {id:String(id),t:Math.max(0,timeS),p:[Math.cos(angle)*11,10+2*Math.sin(p),Math.sin(angle)*11],
  v:[-Math.sin(angle)*speed,0,Math.cos(angle)*speed],bank:0,
  wingPhase:p+timeS*13.5,angle:p,flightMode:'cruise',
  massKg:clamp(massKg,.10,30),sizeM:clamp(sizeM,.15,5)};
}
function step(original,env={},dt=DT){
 if(!(dt>0&&dt<=.1))throw Error('Flight timestep must be (0, 0.1] seconds');
 const s={...original,p:original.p.slice(),v:original.v.slice()};
 const mass=clamp(finite(env.massKg)?env.massKg:s.massKg,.1,30);
 const size=clamp(finite(env.sizeM)?env.sizeM:s.sizeM,.15,5);
 const rho=clamp(finite(env.rhoKgM3)?env.rhoKgM3:airDensity(env.pressurePa,env.temperatureK),0,6);
 const g=clamp(finite(env.gravityMS2)?env.gravityMS2:9.81,.1,35);
 const time=s.t,desiredAngle=s.angle+time*.21,target=[Math.cos(desiredAngle)*13,
  (env.foraging?6.5:12)+1.6*Math.sin(time*.12+s.angle),Math.sin(desiredAngle)*13];
 // Aurelius-inspired aerial awareness: alter the requested heading/altitude,
 // never teleport or overwrite the integrated physical motion.
 const threat=Array.isArray(env.threat)&&env.threat.length===2?env.threat:null;
 if(threat){
  const awayX=s.p[0]-threat[0],awayZ=s.p[2]-threat[1],d=Math.hypot(awayX,awayZ);
  if(d<24){target[0]=s.p[0]+(awayX/(d||1))*25;target[2]=s.p[2]+(awayZ/(d||1))*25;target[1]=17;}
 }else if(env.predatorAlert)target[1]+=3;
 const wind=[.65*Math.sin(time*.13+s.angle),0,.55*Math.cos(time*.11+s.angle)];
 const air=[s.v[0]-wind[0],s.v[1],s.v[2]-wind[2]];
 const airspeed=Math.max(.01,Math.hypot(...air));
 const horizontal=Math.max(.01,Math.hypot(air[0],air[2]));
 const fx=air[0]/horizontal,fz=air[2]/horizontal;
 const heading=Math.atan2(fz,fx),desired=Math.atan2(target[2]-s.p[2],target[0]-s.p[0]);
 const error=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading));
 const wantedBank=clamp(error*.8,-.72,.72);
 s.bank+=clamp((wantedBank-s.bank)*dt*2.4,-.055,.055);
 const wingArea=clamp(1.65*size*size,.18,18);
 const q=.5*rho*airspeed*airspeed;
 const verticalDemand=clamp((target[1]-s.p[1])*1.4-s.v[1]*1.9,-g*.65,g*.75);
 const requestedLift=mass*(g+verticalDemand)/Math.max(.6,Math.cos(s.bank));
 const reqCl=q>1e-5?requestedLift/(q*wingArea):2.8;
 // Normal aerodynamic angle-of-attack response, with a finite stall region.
 const alpha=clamp((reqCl-.18)/5.1,-.12,.46);
 const absAlpha=Math.abs(alpha),stall=absAlpha>.30?clamp(1-(absAlpha-.30)*2.8,.35,1):1;
 const cl=clamp((.18+5.1*alpha)*stall,-.35,1.65);
 const cd=.065+.075*cl*cl+(.30<absAlpha?.12*(absAlpha-.30)/.16:0);
 const lift=q*wingArea*cl,drag=q*wingArea*cd;
 // Wing beats do useful propulsive work; power is bounded by body mass.
 const flapFrequency=3.0+clamp(reqCl,0,1.7)*1.5;
 const thrust=rho>.04?mass*clamp((10-airspeed)*1.05+2.5,.2,5.5):0;
 const rightX=-fz,rightZ=fx,forwardY=clamp(air[1]/airspeed,-.32,.32);
 const liftX=rightX*lift*Math.sin(s.bank);
 const liftZ=rightZ*lift*Math.sin(s.bank);
 const liftY=lift*Math.cos(s.bank);
 const ax=(liftX-drag*air[0]/airspeed+thrust*fx)/mass;
 const ay=(liftY-drag*air[1]/airspeed+thrust*forwardY)/mass-g;
 const az=(liftZ-drag*air[2]/airspeed+thrust*fz)/mass;
 s.v[0]=clamp(s.v[0]+ax*dt,-45,45);
 s.v[1]=clamp(s.v[1]+ay*dt,-45,45);
 s.v[2]=clamp(s.v[2]+az*dt,-45,45);
 s.p[0]+=s.v[0]*dt;s.p[1]+=s.v[1]*dt;s.p[2]+=s.v[2]*dt;
 // Local collision terrain is sampled by the game at the current position.
 // Floor contact is a safe grounded transition, not fake levitation.
 const floor=finite(env.floorY)?env.floorY:0;
 if(s.p[1]<floor+1.2){s.p[1]=floor+1.2;s.v[1]=Math.max(0,-s.v[1]*.12);}
 const range=Math.hypot(s.p[0],s.p[2]);
 if(range>75){ // Long-range migrations are outside a local-patch simulation.
  const n=75/range;s.p[0]*=n;s.p[2]*=n;
  s.v[0]*=.6;s.v[2]*=.6;
 }
 s.t+=dt;s.wingPhase=(s.wingPhase+TAU*flapFrequency*dt)%TAU;
 s.flightMode=airspeed<4.3?'stall':s.v[1]>.9?'climb':s.v[1]<-1.2?'descent':'cruise';
 s.massKg=mass;s.sizeM=size;
 if(![...s.p,...s.v,s.bank,s.wingPhase].every(finite))throw Error('Nonfinite aerodynamic state');
 return s;
}
function advance(state,toTimeS,env={},stepBudget=MAX_STEPS){
 if(!finite(toTimeS)||toTimeS<0)throw Error('Invalid ecology flight time');
 if(!Number.isInteger(stepBudget)||stepBudget<0||stepBudget>MAX_STEPS)throw Error('Invalid work budget');
 let s=state;
 if(!s||toTimeS<s.t||toTimeS-s.t>8)return start(state?.id||'unknown',env.massKg||state?.massKg||1,env.sizeM||state?.sizeM||1,toTimeS);
 let n=0;
 while(toTimeS-s.t>=DT*.999999&&n<stepBudget){s=step(s,env,DT);n++;}
 // Never integrate unbounded frame time or spoil 100x time-warp frame budgets.
 // Keep the last physically integrated pose, with a freshly anchored wall clock.
 if(toTimeS-s.t>DT){s={...s,t:toTimeS};}
 return s;
}
const API=Object.freeze({DT,MAX_STEPS,airDensity,start,step,advance});
root.StarfallAerialFlight9C=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
