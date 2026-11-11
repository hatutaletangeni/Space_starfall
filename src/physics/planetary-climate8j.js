/* Coupled six equal-area latitude-band perturbation climate, SI reservoirs.
 * CW01 owns composition. Controls evolve beside interventions to preserve old
 * world baselines exactly. No terrain, ecology or planetary IDs are rewritten.
 */
(function(root){'use strict';
const R=8.314462618,SIGMA=5.670374419e-8,CS=2e7,CO=4e8,LF=334000,LV=2.5e6,DAY=86400;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),sum=x=>Object.values(x||{}).reduce((s,n)=>s+n,0);
const MW={H2:.002016,He:.004003,CH4:.016043,N2:.028014,O2:.031998,CO2:.04401,H2O:.01801528,Ar:.03995,SO2:.064066};
const names={CO2:'carbon_dioxide',CH4:'methane',H2:'hydrogen',N2:'nitrogen',O2:'oxygen'};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function inputs(body,profile,seed,flux){
 const composition=root.StarfallCompositionCW01.bodyFor(body,seed),mix=composition.atmosphereMoleFractions,
 mean=Object.entries(mix).reduce((s,[k,v])=>s+v*MW[k],0),area=4*Math.PI*profile.radiusM**2;
 const gases=Object.fromEntries(Object.entries(mix).map(([k,v])=>[names[k]||k,mean?profile.atmospherePressurePa*area/profile.surfaceGravityMS2*v*MW[k]/mean:0]));
 const water=Math.min(Math.max(0,profile.massKg||0)*(composition.majorMaterialMassFractions.H2O||0),area*1000);
 return{schema:2,bodyId:body.id,compositionVersion:composition.schema,gases,waterKg:water,area,
 baselineK:root.StarfallFieldScience?.profile(body,seed)?.temperatureK||Math.max(30,Math.pow(Math.max(0,flux)*(1-profile.albedo)/(4*SIGMA),.25)),
 albedo:profile.albedo,tilt:body.axialTilt||0,periodS:Math.max(DAY,body.orbitPeriod||365*DAY),flux,profile:JSON.parse(JSON.stringify(profile)),
 provenance:'CW01 seeded composition, canonical R/g/pressure; accessible water layer capped at 1000 kg/m² and bulk H2O inventory; high uncertainty'};
}
function waterStep(w,T,dt,area,gravity,pressure){
 const before=LV*w.vaporKg-LF*w.iceKg,total=w.liquidKg+w.iceKg+w.vaporKg;
 const saturation=611.2*Math.exp(clamp(17.67*(T-273.15)/(T-29.65),-60,25));
 const target=Math.min(total,saturation*area/Math.max(.01,gravity)*.622);
 const vapor=(target-w.vaporKg)*(-Math.expm1(-dt/DAY));
 if(vapor>0){const q=Math.min(vapor,w.liquidKg);w.liquidKg-=q;w.vaporKg+=q;}
 else{w.vaporKg+=vapor;if(pressure<611)w.iceKg-=vapor;else w.liquidKg-=vapor;}
 // Below the water triple-point pressure, condensate is ice, never a new ocean.
 const fraction=pressure<611?1:clamp((278.15-T)/10,0,1),solid=w.liquidKg+w.iceKg,
 freeze=(solid*fraction-w.iceKg)*(-Math.expm1(-dt/(3*DAY)));
 w.iceKg+=freeze;w.liquidKg-=freeze;
 return LV*w.vaporKg-LF*w.iceKg-before;
}
function initialize(world,i,timeS){
 const oldHeat=world.climate8j?.storedHeatJ;
 const bands=Array.from({length:6},(_,n)=>{const lat=Math.asin(-1+(n+.5)/3),T=Math.max(30,i.baselineK+12*Math.cos(lat)-9),ice=T<273.15||i.profile.atmospherePressurePa<611?i.waterKg/6:0;
 const w={iceKg:ice,liquidKg:i.waterKg/6-ice,vaporKg:0};return{lat,anomalyK:0,deepAnomalyK:0,water:{...w},controlWater:{...w},cloudDelta:0};});
 world.climate8j={schema:2,lastS:timeS,bands,anomalyK:world.climate8j?.anomalyK||0,storedHeatJ:0,radiativeJ:0,latentJ:0,escapeWorkJ:0,escapedKg:0,steps:0,hazeOpacity:0,initialHeatJ:0,energyResidualJ:0,cloudDelta:0,iceCoverageDelta:0,deepAnomalyK:0};
 // Preserve the old thermal anomaly during migration rather than resetting it.
 for(const b of bands){b.anomalyK=world.climate8j.anomalyK;if(Number.isFinite(oldHeat))b.deepAnomalyK=(oldHeat/i.area-CS*b.anomalyK)/CO;}
 world.climate8j.storedHeatJ=Number.isFinite(oldHeat)?oldHeat:CS*i.area*world.climate8j.anomalyK;world.climate8j.initialHeatJ=world.climate8j.storedHeatJ;
}
function advance(world,profile,flux,timeS,context){
 if(!finite(timeS)||timeS<0||!finite(flux)||flux<0||flux>1e30)throw Error('Invalid coupled climate forcing/clock');
 let i=world.climateInputs8j;
 if(!i){if(!context?.body||context.body.id!==profile.id)throw Error('Canonical climate world required');i=world.climateInputs8j=inputs(context.body,profile,context.seed??742,flux);}
 if(i.bodyId!==profile.id||i.schema!==2||!(i.area>0))throw Error('Incompatible climate input snapshot');
 if(world.climate8j?.schema!==2)initialize(world,i,timeS);
 const c=world.climate8j,seconds=timeS-c.lastS;
 if(seconds<=0)return c;if(seconds>DAY)throw Error('Climate must advance in bounded daily substeps');
 if(c.bands.length!==6||!c.bands.every(b=>finite(b.anomalyK)&&finite(b.deepAnomalyK)&&[b.water,b.controlWater].every(w=>Object.values(w).every(v=>finite(v)&&v>=0))))throw Error('Corrupt coupled climate reservoirs');
 const a=i.area/6,delta=gas=>(world.emittedSpeciesKg?.[gas]||0)-(world.capturedSpeciesKg?.[gas]||0)-(world.baselineCapturedSpeciesKg?.[gas]||0)-(world.escapedSpeciesKg?.[gas]||0);
 let remaining=seconds;
 while(remaining>1e-8){const dt=Math.min(3600,remaining),now=c.lastS+dt,co2=delta('carbon_dioxide')/i.area,ch4=delta('methane')/i.area,
 co2base=Math.max(.01,(i.gases.carbon_dioxide||0)/i.area),ch4base=Math.max(.001,(i.gases.methane||0)/i.area),
 greenhouse=5.35*Math.log1p(Math.max(-.999999999,co2/co2base))+1.5*Math.log1p(Math.max(-.999999999,ch4/ch4base));
 const old=c.bands.map(b=>b.anomalyK),season=2*Math.PI*now/i.periodS;
 for(let n=0;n<6;n++){
  const b=c.bands[n],baseT=Math.max(30,i.baselineK+12*Math.cos(b.lat)-9+8*Math.sin(b.lat)*Math.sin(season)*Math.sin(i.tilt)),T=Math.max(3,baseT+b.anomalyK),
   priorLatent=(LV*(b.water.vaporKg-b.controlWater.vaporKg)-LF*(b.water.iceKg-b.controlWater.iceKg)),
   controlLatent=waterStep(b.controlWater,baseT,dt,a,profile.surfaceGravityMS2,profile.atmospherePressurePa),
   forcedLatent=waterStep(b.water,T,dt,a,profile.surfaceGravityMS2,world.pressurePa),latent=forcedLatent-controlLatent,
   iceDelta=(b.water.iceKg-b.controlWater.iceKg)/Math.max(1,i.waterKg/6),vaporDelta=(b.water.vaporKg-b.controlWater.vaporKg)/a,
   cloud=clamp(vaporDelta/20,-.8,.8),albedo=clamp(i.albedo+.3*iceDelta+.15*cloud,.02,.95),
   insolation=flux/4*Math.max(.15,1+.4*Math.cos(b.lat)+.2*Math.sin(b.lat)*Math.sin(season)*Math.sin(i.tilt)),
   vaporForcing=2*Math.log1p(Math.max(-.999999,vaporDelta/Math.max(.01,b.controlWater.vaporKg/a))),
   radiation=insolation*(i.albedo-albedo)+greenhouse+vaporForcing-4*SIGMA*Math.pow(Math.max(30,baseT),3)*b.anomalyK,
   ocean=1.2*(b.anomalyK-b.deepAnomalyK),transport=.6*((n>0?old[n-1]-old[n]:0)+(n<5?old[n+1]-old[n]:0));
  b.anomalyK+=(dt*(radiation-ocean+transport)-latent/a)/CS;b.deepAnomalyK+=dt*ocean/CO;b.cloudDelta=cloud;
  c.radiativeJ+=radiation*a*dt;c.latentJ+=latent;
  // Accounting check uses the change in phase energy, not fictional biomass.
  if(!finite(priorLatent)||!finite(b.anomalyK)||Math.abs(b.anomalyK)>1e5)throw Error('Climate outside numerical model envelope');
 }
 // Only introduced atmospheric gas can escape: baseline evolution is paired out.
 // Jeans tail with a separate finite stellar-XUV work budget; never creates gas.
 let escapeBudget=flux*1e-5*i.area/4*.15*dt;
 world.escapedSpeciesKg=world.escapedSpeciesKg||{};
 for(const [gas,mw]of [['hydrogen',.002016],['methane',.016043],['nitrogen',.028014],['oxygen',.031998],['carbon_dioxide',.04401],['carbon_monoxide',.02801]]){
  const available=Math.max(0,(world.emittedSpeciesKg?.[gas]||0)-(world.capturedSpeciesKg?.[gas]||0)-(world.escapedSpeciesKg[gas]||0)),temperature=Math.max(30,i.baselineK+c.bands.reduce((s,b)=>s+b.anomalyK,0)/6),
   binding=profile.mu/profile.radiusM,lambda=binding*mw/(R*temperature),rate=Math.min(1,(1+lambda)*Math.exp(-Math.min(700,lambda)))*1e-6,
   lost=Math.min(available*(-Math.expm1(-rate*dt)),escapeBudget/Math.max(1,binding));
  world.escapedSpeciesKg[gas]=(world.escapedSpeciesKg[gas]||0)+lost;escapeBudget-=lost*binding;c.escapeWorkJ+=lost*binding;c.escapedKg+=lost;
 }
 c.lastS=now;c.steps++;remaining-=dt;
 }
 const waterDelta=c.bands.reduce((s,b)=>s+b.water.vaporKg-b.controlWater.vaporKg,0);
 world.waterVaporDeltaKg=waterDelta;
 root.StarfallAtmosphereEmission8J.balance(world,profile);
 c.anomalyK=c.bands.reduce((s,b)=>s+b.anomalyK,0)/6;c.deepAnomalyK=c.bands.reduce((s,b)=>s+b.deepAnomalyK,0)/6;
 c.storedHeatJ=c.bands.reduce((s,b)=>s+a*(CS*b.anomalyK+CO*b.deepAnomalyK)+LV*(b.water.vaporKg-b.controlWater.vaporKg)-LF*(b.water.iceKg-b.controlWater.iceKg),0);
 c.energyResidualJ=c.storedHeatJ-c.radiativeJ-c.initialHeatJ;
 c.cloudDelta=c.bands.reduce((s,b)=>s+b.cloudDelta,0)/6;
 c.iceCoverageDelta=c.bands.reduce((s,b)=>s+(b.water.iceKg-b.controlWater.iceKg)/Math.max(1,i.waterKg/6),0)/6;
 c.liquidWaterKg=c.bands.reduce((s,b)=>s+b.water.liquidKg,0);c.surfaceK=i.baselineK+c.anomalyK;
 c.hazeOpacity=-Math.expm1(-1e-5*Math.max(0,root.StarfallAtmosphereEmission8J.massDelta(world))/i.area);
 c.model='Six equal-area latitude bands, paired baseline, finite surface/deep heat, CO2/CH4 opacity, water vapor/cloud/ice albedo, latent heat and XUV-limited Jeans-tail escape; coarse game climate, not a validated GCM';
 return c;
}
function sample(world,dir){const c=world?.climate8j;if(c?.schema!==2)return null;const n=Array.isArray(dir)?clamp(Math.floor((dir[1]/(Math.hypot(...dir)||1)+1)*3),0,5):-1,b=c.bands[n];return{anomalyK:b?.anomalyK??c.anomalyK,cloudDelta:b?.cloudDelta??c.cloudDelta,iceCoverageDelta:c.iceCoverageDelta};}
root.StarfallCoupledClimate8J=Object.freeze({advance,inputs,sample,CS,CO,LF,LV});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallCoupledClimate8J;
})(globalThis);
