/* STARFALL LW06 — causal stellar activity and observable remnant / space weather.
 * A derived, reproducible model. Does NOT mutate existing galaxy systems,
 * planetary orbits, saved positions, or pre-existing molecular clouds.
 * Sim-time pulses propagate outward at a finite modeled speed.
 */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const C_SCENE_S=299792.458; // 1 scene unit = 1000 m, light travels 299792.458 units/s
const REMNANT_SPEED=2800; // illustrative early ejecta: 2800 km/s at scene scale
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function rand(k){return hash(k)/4294967296;}
function source(system,seed=742){
 if(!system?.id||!system.star?.radius)throw Error('Stellar source needs existing system');
 const star=system.star,kind=system.phenomenon==='supernova'?'supernova-remnant':system.phenomenon==='pulsar'?'pulsar':'stellar-wind';
 const key=seed+':'+system.id,composition=root.StarfallCompositionCW01?.starFor(star,seed);
 const metallicity=composition?.metallicityMassFraction??.012;
 const activityScale=kind==='supernova-remnant'?0:star.type==='M dwarf'?1.0:star.type==='K dwarf'?.48:star.type.includes('G')?.67:kind==='pulsar'?.82:.53;
 const cycleS=2400+Math.round(rand(key+':cycle')*2300),
 epochS=cycleS*(.22+.58*rand(key+':phase')),durationS=100+280*rand(key+':width');
 const axis=[.2+rand(key+':x'),.2+rand(key+':y'),.2+rand(key+':z')],length=Math.hypot(...axis);
 const ejectaAgeAtZeroS=system.phenomenon==='supernova'?100+300*rand(key+':ejectaAge'):null;
 return Object.freeze({systemId:system.id,starId:star.id,kind,seed,cycleS,epochS,durationS,
  spinAxis:Object.freeze(axis.map(x=>x/length)),ejectaAgeAtZeroS,
  ejectaSpeedSceneS:REMNANT_SPEED,metallicityPrior:metallicity,activityScale,
  note:kind==='supernova-remnant'?'Existing legacy supernova tag interpreted as a remnant, not a fresh star exploding every frame':'Model activity, not a calibrated flare prediction'});
}
function flare(source,timeS,distanceScene=0){
 if(!Number.isFinite(timeS)||timeS<0||!Number.isFinite(distanceScene)||distanceScene<0)throw Error('Invalid stellar activity time or distance');
 const observedTime=timeS-distanceScene/C_SCENE_S,dt=observedTime+source.epochS;
 const cycle=Math.floor(dt/source.cycleS),phase=((dt%source.cycleS)+source.cycleS)%source.cycleS;
 const strength=cycle>=0&&phase<source.durationS?Math.sin(Math.PI*phase/source.durationS)**2*source.activityScale:0;
 return Object.freeze({eventId:'lw06:'+source.systemId+':flare:'+cycle,cycle,
  sourceTimeS:observedTime,phaseS:phase,flareStrength:strength,active:strength>.02,
  lightTravelDelayS:distanceScene/C_SCENE_S,provenance:'Periodic seeded magnetic flare with finite electromagnetic travel time'});
}
function remnant(source,timeS){
 if(source.kind!=='supernova-remnant')return null;
 if(!Number.isFinite(timeS)||timeS<0)throw Error('Invalid remnant time');
 const age=source.ejectaAgeAtZeroS+timeS,radius=age*source.ejectaSpeedSceneS;
 const thickness=radius*(.075+.020*rand(source.systemId+':thickness'));
 const dustCondensation=clamp((age-180)/1100);
 return Object.freeze({id:'lw06:'+source.systemId+':remnant',originSystemId:source.systemId,ageS:age,
  radiusScene:radius,thicknessScene:thickness,shockSpeedSceneS:source.ejectaSpeedSceneS,
  dustFraction:dustCondensation*.28,gasFraction:1-dustCondensation*.28,
  enrichedMaterial:'O, Ne, Mg, Si, Fe (qualitative stellar-yield prior)',
  mechanism:'expanding ejecta shock and progressively condensing dust, not primordial molecular cloud',
  caveat:'Legacy explosion age and uniform speed are seeded approximations; no hydrodynamic shock solver'});
}
function exposure(system,position,timeS=0,seed=742){
 const src=source(system,seed),delta=position.map((v,i)=>v-system.position[i]),r=Math.max(1,Math.hypot(...delta));
 const pulse=flare(src,timeS,r),rem=remnant(src,timeS);
 // Inverse-square dilution with a finite source near-field limit.
 const radius=Math.max(1,system.star.radius),geom=Math.min(1,(radius/Math.max(radius*2,r))**2);
 const quiescent=clamp(geom*.12),flareDose=clamp(pulse.flareStrength*geom*4);
 const dir=delta.map(x=>x/r),axis=src.spinAxis,cos=axis.reduce((s,x,i)=>s+x*dir[i],0);
 // Rotating magnetic cone is narrow and double-sided.
 const spin=timeS*.55,beamVector=[Math.cos(spin)*axis[0]-Math.sin(spin)*axis[2],axis[1],Math.sin(spin)*axis[0]+Math.cos(spin)*axis[2]];
 const alignment=Math.abs(beamVector.reduce((s,x,i)=>s+x*dir[i],0));
 const beam=src.kind==='pulsar'?Math.pow(clamp((alignment-.82)/.18),3):0;
 const shock=rem?Math.exp(-.5*((r-rem.radiusScene)/Math.max(1,rem.thicknessScene))**2)*.85:0;
 const ionization=clamp(quiescent+flareDose+beam*.75+shock);
 const shieldFactor=clamp(1-ionization*.68,.22,1);
 return Object.freeze({systemId:system.id,sourceId:src.starId,kind:src.kind,distanceScene:r,
  pulse,remnant:rem,flareStrength:pulse.flareStrength,beamStrength:beam,shockStrength:shock,
  ionizationIndex:ionization,magneticDisturbanceNT:(flareDose+beam*.35+shock*.55)*9000,
  inducedCommsNoise:clamp(ionization*.8),solarTransmissionFactor:shieldFactor,
  hazard:ionization>.75?'SEVERE':ionization>.27?'ELEVATED':ionization>.06?'WATCH':'NOMINAL',
  provenance:'inverse-square and finite-delay stellar activity plus expanding remnant shock proxy'});
}
function nearest(galaxy,position,timeS=0,seed=742){
 if(!galaxy||!position||!position.every(Number.isFinite))return null;
 const sys=galaxy.nearestSystem(position);if(!sys)return null;
 return exposure(sys,position,timeS,seed);
}
function remnantParticles(system,timeS,count=144,seed=742){
 const src=source(system,seed),rem=remnant(src,timeS);if(!rem)return Object.freeze([]);
 const n=Math.min(288,Math.max(0,Math.floor(count))),out=[];
 for(let j=0;j<n;j++){
  const a=j*2.399963229728653,y=1-2*(j+.5)/n,q=Math.sqrt(Math.max(0,1-y*y));
  const radial=rem.radiusScene*(.94+.12*rand(src.systemId+':shell:'+j));
  out.push(Object.freeze({position:Object.freeze([system.position[0]+Math.cos(a)*q*radial,
    system.position[1]+y*radial,system.position[2]+Math.sin(a)*q*radial]),size:rem.thicknessScene*(.38+.20*rand(src.systemId+':size:'+j)),
   color:j%5===0?Object.freeze([.50,.71,1]):Object.freeze([.95,.47,.30]),alpha:.13+.18*rand(src.systemId+':alpha:'+j)}));
 }
 return Object.freeze(out);
}
const API=Object.freeze({C_SCENE_S,REMNANT_SPEED,source,flare,remnant,exposure,nearest,remnantParticles});
root.StarfallSpaceWeatherLW06=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
