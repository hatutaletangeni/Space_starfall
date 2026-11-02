/* STARFALL 2B/2C: optional SI local flight with fixed-step integration.
 * Numerical fidelity: semi-implicit velocity-Verlet, analytic Kepler coasting,
 * patched-conic local-body selection. Baseline game remains authoritative when off.
 */
(function(root){'use strict';
const P=root.StarfallPhysics;if(!P)throw Error('Physics foundation must load first.');
const {vec,G0,SIGMA}=P;
function atmosphere(body,altitudeM){if(!body||body.kind==='moon'||(body.type!=='Gas Giant'&&!body.landable)||body.type==='Shattered')return{densityKgM3:0,pressurePa:0,temperatureK:0,scaleHeightM:0};
 const sea=({Rocky:.025,Desert:.7,Ice:.015,Temperate:1.12,Ocean:1.37,Volcanic:2.4,Lush:1.20,'Gas Giant':1.25}[body.type]||0);
 if(!sea)return{densityKgM3:0,pressurePa:0,temperatureK:0,scaleHeightM:0};
 const t=({Rocky:210,Desert:310,Ice:155,Temperate:288,Ocean:298,Volcanic:390,Lush:295,'Gas Giant':170}[body.type]||260),H=({Rocky:5500,Desert:9100,Ice:4500,Temperate:8500,Ocean:8800,Volcanic:10500,Lush:8700,'Gas Giant':26000}[body.type]||8000);
 const h=Math.max(0,altitudeM),factor=Math.exp(-Math.min(80,h/H)),specificR=body.type==='Gas Giant'?3700:body.type==='Volcanic'?189:287;
 const rho0=body.atmospherePressurePa>0?body.atmospherePressurePa/(specificR*t):sea;
 return{densityKgM3:rho0*factor,pressurePa:rho0*specificR*t*factor,temperatureK:Math.max(100,t-.0065*Math.min(h,16000)),scaleHeightM:H};}
const SHIP_DEFAULT={dryMassKg:14000,fuelKg:4500,thrustN:330000,ispS:315,cd:1.3,areaM2:34,liftCoefficient:0,heatCapacityJK:2.7e6,heatShieldEfficiency:.72,emissivity:.78,radiatorAreaM2:68,temperatureK:290,warningK:900,maxTempK:1650};
function shipState(override={}){return{...SHIP_DEFAULT,...override};}
function aero(vRelative,mass,atmo,craft){const speed=vec.len(vRelative);if(!(speed>0&&atmo.densityKgM3>0))return{forceN:[0,0,0],dragN:0,heatingW:0,areaM2:craft.areaM2||0};
 const area=Math.max(1,craft.areaM2||34),drag=.5*atmo.densityKgM3*speed**2*(craft.cd??1.3)*area;
 // Sutton-Graves-like trend only: proportional to sqrt(density) * speed^3.
 // This is not aerodynamic CFD or an actual heat-shield certification model.
 const heating=1.1e-8*Math.sqrt(atmo.densityKgM3/1.225)*speed**3*area;
 return{forceN:vec.mul(vRelative,-drag/speed),dragN:drag,heatingW:heating,areaM2:area};}
function thermalStep(craft,heatW,ambientK,dt){const hot=craft.temperatureK||290,cool=Math.max(0,(craft.emissivity??.78)*SIGMA*(craft.radiatorAreaM2||68)*(hot**4-Math.max(0,ambientK||3)**4));
 const capacity=Math.max(1,craft.heatCapacityJK||SHIP_DEFAULT.heatCapacityJK),shield=Math.max(0,Math.min(1,craft.heatShieldEfficiency??.72));
 const next=Math.max(2,Math.min(5000,hot+(heatW*(1-shield)-cool)*dt/capacity));
 return{temperatureK:next,radiatorW:cool,thermalWarning:next>(craft.warningK||900),thermalLimitExceeded:next>(craft.maxTempK||1650)};}
function acceleration(r,v,body,craft,throttle,forward,atmo,rotationRateRadS){const R=vec.len(r),safe=Math.max(R,body.radiusM||1);const mu=body.mu;
 const gravity=vec.mul(r,-mu/(safe**3)),mass=Math.max(1,craft.dryMassKg+craft.fuelKg),thrust=Math.max(0,Math.min(1,throttle))*(craft.thrustN||0)*(craft.fuelKg>0?1:0);
 // Planet spins around its own axis; wind follows the local rotating atmosphere.
 const wind=vec.cross(vec.mul(body.axis||[0,1,0],rotationRateRadS||0),r),relative=vec.sub(v,wind),relativeSpeed=vec.len(relative);
 // More drag while broadside; frontal area is smaller along the vehicle's nose.
 const dot=relativeSpeed>0?Math.abs(vec.dot(vec.norm(forward),vec.norm(relative))):1;
 const adjusted={...craft,areaM2:(craft.areaM2||34)*(.62+1.15*(1-dot))};
 const aeroForce=aero(relative,mass,atmo,adjusted);
 let lift=[0,0,0];
 if(relativeSpeed>0&&atmo.densityKgM3>0&&(craft.liftCoefficient||0)!==0){
  const windward=vec.mul(relative,-1/relativeSpeed),upCandidate=vec.sub(forward,vec.mul(windward,vec.dot(forward,windward)));
  const length=vec.len(upCandidate);
  if(length>1e-7)lift=vec.mul(upCandidate,(.5*atmo.densityKgM3*relativeSpeed**2*adjusted.areaM2*craft.liftCoefficient)/length);
 }
 const a=vec.add(gravity,vec.add(vec.mul(forward,thrust/mass),vec.mul(vec.add(aeroForce.forceN,lift),1/mass)));
 return{a,thrustN:thrust,relativeWind:relative,...aeroForce};}
function integrateFixed(state,body,dt,controls={},atmoProvider=atmosphere){if(!(dt>0&&dt<=.1))throw Error('Physics step must be (0,0.1] s');
 const craft={...state.craft},r=[...state.rM],v=[...state.vMS],forward=vec.norm(controls.forward||[0,0,1]);
 const alt=vec.len(r)-body.radiusM,atm=atmoProvider(body,alt),omega=controls.rotationRateRadS||0,thr=Math.max(0,Math.min(1,controls.throttle||0));
 const a0=acceleration(r,v,body,craft,thr,forward,atm,omega);
 const burn=thr>0&&craft.fuelKg>0?Math.min(craft.fuelKg,a0.thrustN/(Math.max(1,craft.ispS)*G0)*dt):0;
 const midV=vec.add(v,vec.mul(a0.a,dt*.5)),nextR=vec.add(r,vec.mul(midV,dt));craft.fuelKg=Math.max(0,craft.fuelKg-burn);
 const nextAtmo=atmoProvider(body,vec.len(nextR)-body.radiusM),a1=acceleration(nextR,midV,body,craft,thr,forward,nextAtmo,omega);
 const nextV=vec.add(midV,vec.mul(a1.a,dt*.5)),thermal=thermalStep(craft,a1.heatingW+(thr>0&&a0.thrustN>0?(controls.engineHeatW||0)*thr:0),nextAtmo.temperatureK||3,dt);
 craft.temperatureK=thermal.temperatureK;
 // Surface collision is stable but LANDING/contact must be handled by game's existing anchored surface system.
 const minR=body.radiusM+Math.max(0,controls.groundHeightM||0);let impact=false;
 if(vec.len(nextR)<=minR){impact=true;const n=vec.len(nextR)>1e-9?vec.norm(nextR):vec.len(r)>1e-9?vec.norm(r):[0,1,0],radial=vec.dot(nextV,n);const rNew=vec.mul(n,minR);const vNew=radial<0?vec.sub(nextV,vec.mul(n,radial)):nextV;
 return{rM:rNew,vMS:vNew,craft,impact,dragN:a1.dragN,heatingW:a1.heatingW,...thermal};}
 return{rM:nextR,vMS:nextV,craft,impact,dragN:a1.dragN,heatingW:a1.heatingW,...thermal};}
// Exact unpowered 2-body Kepler coast. Works with hyperbolic trajectories; use short
// chunks near collisions. Universal-variable formulation with safeguarded iterations.
function stumpffC(z){if(z>1e-8)return(1-Math.cos(Math.sqrt(z)))/z;if(z< -1e-8){const a=Math.sqrt(-z);if(a>40)throw Error('Hyperbolic coast interval too large');return(Math.cosh(a)-1)/(-z);}return.5-z/24+z*z/720;}
function stumpffS(z){if(z>1e-8){const a=Math.sqrt(z);return(a-Math.sin(a))/(a*a*a);}if(z< -1e-8){const a=Math.sqrt(-z);if(a>40)throw Error('Hyperbolic coast interval too large');return(Math.sinh(a)-a)/(a*a*a);}return 1/6-z/120+z*z/5040;}
function coast(r0,v0,mu,dt){const r=vec.len(r0),vsq=vec.dot(v0,v0),vr=vec.dot(r0,v0)/r,alpha=2/r-vsq/mu,sqrtMu=Math.sqrt(mu);if(!(r>0&&mu>0&&Number.isFinite(dt)))throw Error('Invalid coast state');
 // Bound orbit: reduce time modulo orbital period to prevent poor conditioning.
 if(alpha>0){const period=2*Math.PI/Math.sqrt(mu*alpha**3);dt=((dt%period)+period)%period;if(dt>period/2)dt-=period;}
 let chi=Math.sqrt(mu)*Math.abs(alpha)*dt;if(Math.abs(chi)<1e-9)chi=Math.sqrt(mu)*dt/r;
 for(let i=0;i<100;i++){const z=alpha*chi*chi,C=stumpffC(z),S=stumpffS(z),f=r*vr/sqrtMu*chi*chi*C+(1-alpha*r)*chi**3*S+r*chi-sqrtMu*dt,df=r*vr/sqrtMu*chi*(1-z*S)+(1-alpha*r)*chi*chi*C+r;
 const delta=f/df;chi-=delta;if(Math.abs(delta)<1e-9*Math.max(1,Math.abs(chi)))break;if(i===99)throw Error('Universal anomaly did not converge');}
 const z=alpha*chi*chi,C=stumpffC(z),S=stumpffS(z),f=1-chi**2*C/r,g=dt-chi**3*S/sqrtMu,r1=vec.add(vec.mul(r0,f),vec.mul(v0,g)),R=vec.len(r1),fdot=sqrtMu/(R*r)*(alpha*chi**3*S-chi),gdot=1-chi*chi*C/R,v1=vec.add(vec.mul(r0,fdot),vec.mul(v0,gdot));
 return{rM:r1,vMS:v1};}
function predictTrajectory(state,body,segments=96,stepS=10){const pts=[],r0=state.rM||state.r,v0=state.vMS||state.v;for(let i=0;i<=segments;i++){try{const next=coast(r0,v0,body.mu,i*stepS);if(vec.len(next.rM)<body.radiusM)break;pts.push(next.rM);}catch(_){break;}}return pts;}
root.StarfallFlightPhysics={atmosphere,shipState,aero,thermalStep,acceleration,integrateFixed,coast,predictTrajectory,SHIP_DEFAULT};
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallFlightPhysics;
})(globalThis);
