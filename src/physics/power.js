/* STARFALL 3C: pure deterministic SI energy, prioritized loads, sunlight and thermal. */
(function(root){'use strict';
const SIGMA=5.670374419e-8,AU=149597870700;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const loadsOrder=[['avionics',0],['lifeSupport',1],['radiator',2],['drive',3],['lights',4],['instruments',5]];
const finite=x=>Number.isFinite(x)?x:0;
function solarFlux(luminosityW,distanceM){return distanceM>0&&luminosityW>0?luminosityW/(4*Math.PI*distanceM**2):0;}
function visibleSun(observer,star,occluder){const v=star.map((x,i)=>x-observer[i]),d=Math.hypot(...v);if(d<=1e-10)return true;const unit=v.map(x=>x/d),r=occluder?.radiusM||0;if(!r)return true;const centre=occluder.positionM.map((x,i)=>x-observer[i]),project=centre.reduce((s,x,i)=>s+x*unit[i],0);if(project<=0||project>=d)return true;const separation=Math.hypot(...centre.map((x,i)=>x-project*unit[i]));return separation>=r;}
function generation(stats,light){const d=Math.max(1,finite(light?.distanceM)||AU),L=Math.max(0,finite(light?.luminosityW));const incidence=clamp(finite(light?.incidence),0,1),transmit=clamp(light?.transmission??1,0,1),unoccluded=light?.occluded===true?0:1;
 const flux=solarFlux(L,d),solarW=Math.min(stats.maxSolarW,stats.solarAreaM2*stats.solarEfficiency*flux*incidence*transmit*unoccluded),generatorW=Math.max(0,finite(stats.generatorW));return{solarW,generatorW,totalW:solarW+generatorW,fluxWM2:flux,generatorModel:generatorW>0?'FICTIONAL COMPACT SOURCE — finite rated watts and heat; no consumable model':'NONE'};}
function loadPower(stats,state,activity={}){const spec={avionics:stats.avionicsW,lights:activity.lightsW??(stats.kind==='ship'?1200:180),instruments:stats.instrumentsW,radiator:stats.pumpW,drive:activity.driveW??0,lifeSupport:activity.lifeSupportW??0};if(activity.engineActive)spec.avionics+=stats.enginePowerW;if(Number.isFinite(activity.protectionW)&&activity.protectionW>0)spec.avionics+=activity.protectionW;return spec;}
function step(stats,rawState,dt,light={},activity={}){if(!(dt>=0&&Number.isFinite(dt)))throw Error('Invalid simulation elapsed time');const state={...rawState,loads:{...rawState.loads}},gen=generation(stats,light),requirements=loadPower(stats,state,activity);
 const energy=Math.max(0,Math.min(stats.batteryCapacityJ,finite(state.energyJ))),capacity=Math.max(0,stats.batteryCapacityJ);const maxOut=Math.min(stats.maxDischargeW,dt>0?energy*stats.dischargeEfficiency/dt:stats.maxDischargeW),available=gen.totalW+maxOut;
 const draws={},shed=[];let total=0;for(const [load] of loadsOrder.sort((a,b)=>a[1]-b[1])){const need=state.loads?.[load]!==false?Math.max(0,finite(requirements[load])):0;if(total+need<=available+1e-8){draws[load]=need;total+=need;}else{draws[load]=0;if(need>0)shed.push(load);}}
 const fromGen=Math.min(total,gen.totalW),fromBattery=Math.max(0,total-fromGen),surplus=Math.max(0,gen.totalW-fromGen),charge=Math.min(stats.maxChargeW,surplus),chargeStored=Math.min(capacity-energy,charge*dt*stats.chargeEfficiency),used=Math.min(energy,fromBattery*dt/Math.max(1e-9,stats.dischargeEfficiency));
 const nextEnergy=clamp(energy+chargeStored-used,0,capacity);
 const tempK=clamp(finite(state.temperatureK)||290,2,3000),ambientK=clamp(light.ambientK??210,2,1500),thermalCapacityJK=stats.kind==='ship'?4.4e6:1.1e6,heatW=finite(activity.heatW)+total*.08;
 const radiatedW=Math.max(0,stats.emissivity*SIGMA*stats.radiatorAreaM2*(tempK**4-ambientK**4))*(draws.radiator>0?1:.23);
 // Exact exponential relaxation for a locally linearized cooling coefficient; stable at 100x time.
 const k=Math.max(0,radiatedW/Math.max(1,tempK-ambientK))/thermalCapacityJK,steady=ambientK+heatW/Math.max(1e-9,k*thermalCapacityJK),newTemp=k>1e-12?steady+(tempK-steady)*Math.exp(-k*dt):tempK+heatW*dt/thermalCapacityJK;
 state.energyJ=nextEnergy;state.temperatureK=clamp(newTemp,2,3000);
 return{state,generated:gen,draws,shed,totalLoadW:total,drawnBatteryW:fromBattery,chargedJ:chargeStored,usedJ:used,radiatedW,heatW,netEnergyJ:nextEnergy-energy,enginePowered:!activity.engineActive||draws.avionics>=stats.avionicsW+stats.enginePowerW-1e-8};}
root.StarfallPower={solarFlux,visibleSun,generation,loadPower,step};if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallPower;
})(globalThis);
