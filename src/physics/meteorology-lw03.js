/* STARFALL LW03: bounded deterministic climate columns and advected storm cells.
 * No runtime global clocks, world mutation or per-frame random weather.
 * SI estimates are plausible physical priors, not a solved GCM or calibrated forecast.
 */
(function(root){'use strict';
const PI=Math.PI,TAU=PI*2,R=8.314462618,STEFAN=5.670374419e-8;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const masses=Object.freeze({N2:.0280134,O2:.031998,CO2:.04401,H2O:.018015,CH4:.01604,NH3:.017031,H2:.002016,He:.004003,SO2:.064066,Ar:.03995});
const LIMIT=128,cache=new Map(),STEP=1200;
function base(body,seed=742){
 if(!body?.id)throw Error('Requires existing body');
 const key=seed+':'+body.id;
 if(cache.has(key))return cache.get(key);
 const fs=root.StarfallFieldScience?.profile(body,seed);
 const comp=root.StarfallCompositionCW01?.bodyFor(body,seed);
 const gases=comp?.atmosphereMoleFractions||{},p=fs?.pressurePa||0;
 const gasTotal=Object.values(gases).reduce((a,b)=>a+b,0);
 const vacuum=p<200||gasTotal<1e-7;
 const molar=vacuum?null:Object.entries(gases).reduce((s,[k,f])=>s+f*(masses[k]||.029),0)/gasTotal;
 const T=Math.max(25,fs?.temperatureK||250),g=Math.max(.12,(body.gravity||.4)*9.80665);
 const scaleHeightM=vacuum?0:R*T/(molar*g),densityKgM3=vacuum?0:p*molar/(R*T);
 const profile=Object.freeze({bodyId:body.id,seed,pressurePa:vacuum?0:p,
  temperatureK:T,gravityMS2:g,molarMassKgMol:molar,scaleHeightM,densityKgM3,
  mixture:Object.freeze({...gases}),vacuum,
  model:'CW01 atmospheric inventory and field-science pressure, approximate hydrostatic column',uncertainty:'high'});
 if(cache.size>=LIMIT)cache.delete(cache.keys().next().value);cache.set(key,profile);return profile;
}
function reservoir(body,climate){
 const g=climate.mixture,t=climate.temperatureK;
 const water=(g.H2O||0)>1e-5||['Ocean','Lush','Temperate'].includes(body.type);
 if(water&&t>210&&t<375)return 'H2O';
 if((g.CH4||0)>.002&&t>=65&&t<135)return 'CH4';
 if((g.NH3||0)>.002&&t>=145&&t<260)return 'NH3';
 if((g.CO2||0)>.15&&t<220)return 'CO2';
 return null;
}
function saturation(species,T){
 // Clausius-Clapeyron fit around species reference boiling point; bounded vapor pressure.
 const properties={H2O:[373.15,101325,40650],CH4:[111.66,101325,8190],
  NH3:[239.82,101325,23000],CO2:[194.7,101325,16500]};
 if(!properties[species]||!Number.isFinite(T)||T<=0)return 0;
 const [boiling,p0,L]=properties[species];
 return clamp(p0*Math.exp(clamp(-L/R*(1/T-1/boiling),-60,30)),.00001,1e9);
}
function cell(body,dir,timeS=0,seed=742){
 if(!Number.isFinite(timeS)||timeS<0||!Array.isArray(dir)||dir.length!==3)throw Error('Invalid weather sampling');
 const climate=base(body,seed);if(climate.vacuum)return Object.freeze({bodyId:body.id,regime:'vacuum',vacuum:true,
  temperatureK:climate.temperatureK,pressurePa:0,densityKgM3:0,scaleHeightM:0,
  windMS:0,windDirection:Object.freeze([0,0,0]),cloudFraction:0,precipitationKgM2S:0,
  sourceSpecies:null,humidityFraction:0,visibility:1,solarFactor:1,charge:0,stormId:null});
 const d=dir.map(v=>v/(Math.hypot(...dir)||1)),lat=Math.asin(clamp(d[1],-1,1)),lon=Math.atan2(d[2],d[0]);
 const rotation=TAU/Math.max(60,body.spinPeriod||50000),tick=Math.floor(timeS/STEP);
 // Phase-advection is continuous, but storm topology remains seeded and stable.
 const zonal=.000065*Math.sign(Math.cos(lat)||1)*(1+.6*Math.sin(2*lat)),u=lon-zonal*timeS;
 const hash=root.StarfallFieldScience?.rand||((x)=>.5),h=hash(seed+':'+body.id+':lw03:'+Math.floor((u+PI)*6)+':'+Math.floor((lat+PI/2)*6));
 const season=2*PI*timeS/Math.max(90000,body.orbitPeriod||800000);
 const day=2*PI*timeS/Math.max(120,body.spinPeriod||45000)+lon;
 const T=clamp(climate.temperatureK+10*Math.cos(lat)*Math.cos(day)+14*Math.sin(lat+season)*Math.cos(lat)+12*(h-.5),35,900);
 const vapor=reservoir(body,climate),inventory=vapor==='H2O'?
  Math.max(climate.mixture.H2O||0,['Ocean','Lush'].includes(body.type)?.045:.008):
  vapor?climate.mixture[vapor]||0:0;
 const partial=climate.pressurePa*inventory,sat=vapor?saturation(vapor,T):0;
 const relativeHumidity=vapor?clamp(partial/Math.max(1,sat),0,2):0;
 const stormSeed=hash(seed+':'+body.id+':lw03:storm:'+Math.floor((u+PI)*2)+':'+Math.floor((lat+PI/2)*3));
 const moisture=clamp(inventory*12,0,1),lift=clamp(.35+.35*Math.cos(2*lat)+.3*stormSeed,0,1);
 const cloud=vapor?clamp((relativeHumidity-.58)*.7+moisture*.35+lift*.13,0,.94):0;
 const precip=vapor&&relativeHumidity>.75?Math.min(inventory*climate.pressurePa/STEP*.012,
  Math.max(0,relativeHumidity-.75)*cloud*.004):0;
 const coriolis=2*rotation*Math.sin(lat),gradient=11*Math.sin(lat*2+u*.8);
 const wind=clamp(3+Math.abs(gradient)+4*stormSeed+Math.abs(coriolis)*80000,0,140);
 const direction=Object.freeze([-Math.sin(u),0,Math.cos(u)]),dust=body.type==='Desert'||body.type==='Volcanic';
 let regime='clear';
 if(precip>1e-8)regime=vapor==='H2O'?(T<272?'snow':wind>22?'rainstorm':'rain'):
   vapor==='CH4'?'methane-rain':vapor==='NH3'?'ammonia-condensation':'CO2-frost';
 else if(cloud>.15)regime=vapor==='CH4'?'methane-cloud':vapor==='NH3'?'ammonia-cloud':'cloud';
 else if(dust&&wind>13&&climate.densityKgM3>.02)regime='dust';
 else if((climate.mixture.CO2||0)>.6&&climate.pressurePa>1.5e5)regime='CO2-haze';
 const charged=regime==='rainstorm'&&cloud>.33&&precip>.000003;
 const charge=charged?clamp((cloud-.30)*wind/30,0,1):0;
 const visibility=clamp(1-cloud*.33-(dust&&regime==='dust'?.45:0)-(precip>0?.23:0),.15,1);
 const solarFactor=clamp(1-cloud*.62-(regime==='dust'?.33:0),.12,1);
 const durationKey=Math.floor((timeS)/STEP);
 return Object.freeze({bodyId:body.id,vacuum:false,temperatureK:T,pressurePa:climate.pressurePa,
  densityKgM3:climate.densityKgM3,scaleHeightM:climate.scaleHeightM,molarMassKgMol:climate.molarMassKgMol,
  windMS:wind,windDirection:direction,cloudFraction:cloud,precipitationKgM2S:precip,
  sourceSpecies:vapor,humidityFraction:clamp(relativeHumidity,0,1),charge,
  regime,visibility,solarFactor,stormId:regime==='clear'?null:body.id+':weather:'+durationKey,
  inventoryPrior:inventory,phaseNote:'coarse column; latent heat and local energy closure approximate',
  provenance:'CW01 gas mixture, field-science T/P, deterministic large-scale advection'});
}
const API=Object.freeze({STEP,base,cell,saturation,reservoir});root.StarfallMeteorologyLW03=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
