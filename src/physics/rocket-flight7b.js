/* STARFALL 7B — deterministic planar (2-D inertial) force-integrated rocket flight.
   SI: kg, m, s, N. Physics: Newtonian central gravity, variable mass, atmospheric
   drag (exponential approximation). Not six-degree-of-freedom CFD or full n-body.
   Interstellar travel remains a separate fictional carrier operation. */
(function(root){'use strict';
const G0=9.80665,STEP=.20,MAX_STEPS=620,EPS=1e-9;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function finite(n){return typeof n==='number'&&Number.isFinite(n);}
function elements(f,mu,radius){const {x,y,vx,vy}=f,r=Math.hypot(x,y),v2=vx*vx+vy*vy,h=x*vy-y*vx,E=v2/2-mu/r;if(!(r>0&&mu>0&&finite(E)))return null;
 const erx=vy*h/mu-x/r,ery=-vx*h/mu-y/r,e=Math.hypot(erx,ery),a=Math.abs(E)>EPS?-mu/(2*E):Infinity;
 const rp=h*h/(mu*(1+e)),ra=E<0?a*(1+e):Infinity;
 return{radiusM:r,altitudeM:r-radius,speedMS:Math.sqrt(v2),radialMS:(x*vx+y*vy)/r,tangentialMS:h/r,energyJkg:E,angularMomentumM2S:h,eccentricity:e,semiMajorM:a,periapsisM:rp-radius,apoapsisM:ra-radius,stable:E<0&&rp>radius,periodS:E<0?2*Math.PI*Math.sqrt(a*a*a/mu):null};
}
function init(profile,body,{mode='assisted',targetAltitudeM=180000}={}){if(!profile?.stageParts?.length||!(profile.massKg>0))throw Error('Rocket profile required');const r=Number(body.radiusM),mu=Number(body.mu);if(!(r>0&&mu>0))throw Error('Invalid local body gravity');
 return{schema:1,x:r,y:0,vx:0,vy:0,elapsedS:0,integratedS:0,stageIndex:0,stageFuelKg:profile.stageParts.map(s=>s.propKg),boosterFuelKg:profile.boosterPropKg||0,boosterAttached:(profile.boosterPropKg||0)>0,throttle:1,pitchDeg:0,mode:mode==='manual'?'manual':'assisted',targetAltitudeM:clamp(+targetAltitudeM||180000,50000,1000000),phase:'powered',stagingPending:false,engineOn:true,discards:[],rho0:Math.max(0,Number(body.rho0)||0),scaleHeightM:Math.max(500,Number(body.scaleHeightM)||8500),areaM2:Math.max(1,Number(body.areaM2)||12),cd:Math.max(0,Number(body.cd)||.4),lastTimeS:0,steps:0,reason:'',maxDynamicPressurePa:0};}
function totalMass(f,p){const payload=p.payloadKg+210;let total=payload;for(let i=f.stageIndex;i<p.stageParts.length;i++)total+=p.stageParts[i].dryKg+Math.max(0,f.stageFuelKg[i]||0);if(f.stageIndex===0){if(f.boosterAttached)total+=p.boosterDryKg||0;total+=f.boosterFuelKg;}return Math.max(1,total);}
function finishStage(f,p,auto){const idx=f.stageIndex; if(idx>=p.stageParts.length-1){f.engineOn=false;f.phase='coast';return 'FUEL_EXHAUSTED';}
 if(!auto){f.engineOn=false;f.phase='awaiting-stage';f.stagingPending=true;return 'STAGE_READY';}
 const r=Math.hypot(f.x,f.y);f.discards.push({stage:idx+1,timeS:f.integratedS,altitudeM:r-p.radiusM,remainingKg:Math.max(0,f.stageFuelKg[idx]),x:f.x,y:f.y});f.stageIndex++;f.engineOn=true;f.phase='powered';f.stagingPending=false;return 'STAGE_SEPARATED';}
function stage(f,p){if(!['powered','coast','awaiting-stage'].includes(f.phase)||f.stageIndex>=p.stageParts.length-1)return false;finishStage(f,p,true);return true;}
function command(f,op,value){if(!f||f.phase==='failed'||f.phase==='orbit')throw Error('Rocket is not controllable');
 if(op==='mode'){if(!['manual','assisted'].includes(value))throw Error('Invalid flight mode');f.mode=value;return;}
 if(op==='throttle'){if(!finite(value)||value<0||value>1)throw Error('Throttle 0..1 required');f.throttle=value;f.engineOn=value>0;return;}
 if(op==='pitch'){if(!finite(value)||value< -25||value>105)throw Error('Pitch must be -25°..105°');f.pitchDeg=value;return;}
 if(op==='cutoff'){f.engineOn=false;f.throttle=0;return;}
 if(op==='ignite'){if(f.phase==='awaiting-stage')throw Error('Separate spent stage first');if((f.stageFuelKg[f.stageIndex]||0)<1)throw Error('Current stage has no fuel');f.engineOn=true;f.phase='powered';f.throttle=Math.max(.15,f.throttle);return;}
 if(op==='stage')throw Error('Use the mission stage separator');
 if(op==='abort'){f.phase='failed';f.reason='Player aborted';f.engineOn=false;return;}
 throw Error('Unsupported flight command');}
function guidance(f,p,el){const altitude=Math.max(0,el.altitudeM),r=el.radiusM,mu=p.mu;
 // Reduced-order gravity turn: mostly radial below 2 km, tangent by 70 km.
 let pitch=clamp((altitude-1800)/78000,0,1)*89.5;
 const orbitSpeed=Math.sqrt(mu/r);
 if(altitude>45000&&el.radialMS<20&&el.tangentialMS<.85*orbitSpeed)pitch=clamp(pitch-9,45,90);
 // Keep the model a physical force integration. Throttle only adjusts *force*;
 // no altitude/velocity snaps, warp-to-orbit, or orbital state overwrites.
 let throttle=1;
 if(el.apoapsisM>f.targetAltitudeM*1.22&&el.tangentialMS<orbitSpeed*.86){throttle=0;f.phase='coast';f.engineOn=false;}
 if(f.phase==='coast'&&el.apoapsisM>f.targetAltitudeM*.8&&el.radialMS<90&&el.altitudeM>40000&&(f.stageFuelKg[f.stageIndex]||0)>1){f.phase='powered';f.engineOn=true;throttle=1;pitch=90;}
 if(el.apoapsisM>f.targetAltitudeM*.95&&el.tangentialMS>=orbitSpeed*.85)throttle=clamp((orbitSpeed-el.tangentialMS)/(orbitSpeed*.11),.12,1);
 if(!f.engineOn&&f.phase==='coast')throttle=0;
 return{pitchDeg:pitch,throttle};}
function singleStep(f,p,dt){if(['failed','orbit'].includes(f.phase))return null;
 const r=Math.hypot(f.x,f.y),erx=f.x/r,ery=f.y/r,tx=-ery,ty=erx;
 const el=elements(f,p.mu,p.radiusM);if(!el)return(f.phase='failed',f.reason='Nonfinite trajectory',null);
 // Confirm physically bound orbit from energy and angular momentum, no programmed insertion.
 const periThreshold=f.rho0>0?80000:25000;
 if(el.stable&&el.periapsisM>=periThreshold&&el.apoapsisM<=Math.max(5e6,f.targetAltitudeM*5)&&el.eccentricity<=.19){f.phase='orbit';f.engineOn=false;f.throttle=0;f.reason='Bound orbit established by integrated flight';return'ORBIT_INSERTION';}
 if(el.altitudeM< -2||el.radiusM<p.radiusM*.99){f.phase='failed';f.reason='Impact with planetary surface';f.engineOn=false;return'IMPACT';}
 if(el.altitudeM>p.radiusM*8||el.speedMS>65000){f.phase='failed';f.reason='Escaped flight corridor';f.engineOn=false;return'ESCAPE';}
 if(f.mode==='assisted'&&f.phase!=='awaiting-stage'){
  const guidanceResult=guidance(f,p,el);f.pitchDeg=guidanceResult.pitchDeg;f.throttle=guidanceResult.throttle;
 }
 const s=p.stageParts[f.stageIndex],booster=f.stageIndex===0&&f.boosterFuelKg>0;
 const throttle=f.engineOn&&f.phase==='powered'?clamp(f.throttle,0,1):0;
 const coreFlow=throttle&&f.stageFuelKg[f.stageIndex]>EPS?s.thrustN/(s.ispS*G0)*throttle:0;
 const boosterFlow=throttle&&booster?p.boosterThrustN/(p.boosterIspS*G0)*throttle:0;
 const coreUsed=Math.min(f.stageFuelKg[f.stageIndex],coreFlow*dt),boosterUsed=Math.min(f.boosterFuelKg,boosterFlow*dt);
 const actualCoreThrust=coreUsed/dt*s.ispS*G0,actualBoostThrust=boosterUsed/dt*p.boosterIspS*G0;
 const mBefore=totalMass(f,p),mass=Math.max(1,mBefore-(coreUsed+boosterUsed)*.5);
 const thrust=actualCoreThrust+actualBoostThrust,alpha=f.pitchDeg*Math.PI/180;
 const dirX=erx*Math.cos(alpha)+tx*Math.sin(alpha),dirY=ery*Math.cos(alpha)+ty*Math.sin(alpha);
 const v=Math.hypot(f.vx,f.vy),rho=f.rho0*Math.exp(-Math.max(0,el.altitudeM)/f.scaleHeightM),q=.5*rho*v*v;
 f.maxDynamicPressurePa=Math.max(f.maxDynamicPressurePa,q);
 const dragN=q*f.cd*f.areaM2,ax=(thrust*dirX-(v>0?dragN*f.vx/v:0))/mass-p.mu*f.x/(r*r*r),ay=(thrust*dirY-(v>0?dragN*f.vy/v:0))/mass-p.mu*f.y/(r*r*r);
 // Semi-implicit Euler, fixed 0.2 s or smaller bounded substep.
 f.vx+=ax*dt;f.vy+=ay*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;
 f.stageFuelKg[f.stageIndex]=Math.max(0,f.stageFuelKg[f.stageIndex]-coreUsed);f.boosterFuelKg=Math.max(0,f.boosterFuelKg-boosterUsed);
 if(f.boosterAttached&&f.boosterFuelKg<=EPS){f.boosterAttached=false;f.discards.push({kind:'booster',timeS:f.integratedS+dt,altitudeM:Math.hypot(f.x,f.y)-p.radiusM,massKg:p.boosterDryKg||0,x:f.x,y:f.y});}
 f.elapsedS+=dt;f.integratedS+=dt;f.steps++;
 if(![f.x,f.y,f.vx,f.vy,f.boosterFuelKg].every(finite)||!f.stageFuelKg.every(finite)){f.phase='failed';f.reason='Numerical failure';return'NUMERICAL_FAILURE';}
 if(f.stageFuelKg[f.stageIndex]<=EPS&&f.phase==='powered')return finishStage(f,p,f.mode==='assisted');
 if(f.elapsedS>8000){f.phase='failed';f.reason='Flight timeout';return'TIMEOUT';}
 return null;
}
function advance(f,p,seconds){if(!finite(seconds)||seconds<0)throw Error('Invalid flight time step');const events=[];let budget=Math.min(MAX_STEPS,Math.ceil(seconds/STEP)),used=0;
 while(budget-->0&&used<seconds&&f.phase!=='failed'&&f.phase!=='orbit'){const dt=Math.min(STEP,seconds-used),event=singleStep(f,p,dt);used+=dt;if(event)events.push(event);if(f.phase==='awaiting-stage')break;}
 return{advancedS:used,remainderS:Math.max(0,seconds-used),events,orbit:elements(f,p.mu,p.radiusM),massKg:totalMass(f,p)};}
const api={G0,STEP,MAX_STEPS,elements,init,totalMass,advance,command,stage};root.StarfallRocketFlight7B=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
