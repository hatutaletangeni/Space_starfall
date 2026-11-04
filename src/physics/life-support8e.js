/* STARFALL 8E -- single-crew, finite ship life support (SI model).
 * Uses the original ship T02 power bus, not a separate generator or free energy.
 * Consumables are inherited from the initial vessel's sealed manifest; no 8C
 * resource extraction or refinery manufacturing is implied.
 */
(function(root){'use strict';
const INITIAL=Object.freeze({schema:1,oxygenKg:180,waterKg:260,co2Kg:0,scrubberRemainingKg:125,crew:1,pressureKPa:101.3,temperatureK:294.5,elapsedS:0});
const RATES=Object.freeze({oxygenKgPerCrewS:.85/86400,waterKgPerCrewS:2.3/86400,co2KgPerCrewS:1.0/86400,baseScrubKgPerS:1.25/86400});
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
function restore(saved){
 if(saved==null)return{...INITIAL};
 if(saved.schema!==1||![saved.oxygenKg,saved.waterKg,saved.co2Kg,saved.scrubberRemainingKg,saved.pressureKPa,saved.temperatureK,saved.elapsedS].every(finite)||
  !Number.isInteger(saved.crew)||saved.crew<0||saved.crew>8)throw Error('Invalid 8E life-support snapshot');
 return{schema:1,oxygenKg:saved.oxygenKg,waterKg:saved.waterKg,co2Kg:saved.co2Kg,
 scrubberRemainingKg:saved.scrubberRemainingKg,crew:saved.crew,pressureKPa:saved.pressureKPa,
 temperatureK:saved.temperatureK,elapsedS:saved.elapsedS};
}
function demandW(level=1){if(!Number.isInteger(level)||level<1||level>3)throw Error('Invalid life support level');return 450+70*(level-1);}
function step(old,dt,{powered=false,level=1,crew}={}){
 if(!Number.isFinite(dt)||dt<0||dt>10000)throw Error('Invalid life-support time step');
 const s=restore(old),n=crew===undefined?s.crew:crew;
 if(!Number.isInteger(n)||n<0||n>8)throw Error('Invalid crew occupancy');
 s.crew=n;
 // Human metabolic rates continue during blackout; no energy or matter creation.
 const consumedO2=Math.min(s.oxygenKg,RATES.oxygenKgPerCrewS*n*dt);
 const consumedWater=Math.min(s.waterKg,RATES.waterKgPerCrewS*n*dt);
 const co2Created=Math.min(RATES.co2KgPerCrewS*n*dt,consumedO2*1.5);
 s.oxygenKg-=consumedO2;s.waterKg-=consumedWater;s.co2Kg+=co2Created;
 if(powered&&s.scrubberRemainingKg>0&&s.co2Kg>0){
  const removed=Math.min(s.co2Kg,s.scrubberRemainingKg,RATES.baseScrubKgPerS*(1+.45*(level-1))*dt);
  s.co2Kg-=removed;s.scrubberRemainingKg-=removed;
 }
 // Bounded cabin regulator: pressure falls only when available O2 reserve fails.
 if(s.oxygenKg<1){s.pressureKPa=Math.max(0,s.pressureKPa-dt*.006*n);}
 else if(powered)s.pressureKPa=Math.min(101.3,s.pressureKPa+dt*.0001);
 s.elapsedS+=dt;
 return s;
}
function diagnostics(s,powered,level=1){
 const ratio=s.co2Kg/Math.max(1,760),oxygenDays=s.crew>0?s.oxygenKg/(RATES.oxygenKgPerCrewS*s.crew*86400):Infinity,
 waterDays=s.crew>0?s.waterKg/(RATES.waterKgPerCrewS*s.crew*86400):Infinity;
 const alert=s.pressureKPa<65?'CABIN PRESSURE LOW':s.oxygenKg<3?'OXYGEN RESERVE LOW':ratio>.015?'CARBON DIOXIDE BUILDUP':s.waterKg<5?'WATER RESERVE LOW':!powered?'ELECTRICAL POWER UNAVAILABLE':'NOMINAL';
 return{alert,powered,drawDemandW:demandW(level),co2ApproxFraction:ratio,oxygenDays,waterDays,oxygenKg:s.oxygenKg,waterKg:s.waterKg,scrubberRemainingKg:s.scrubberRemainingKg,pressureKPa:s.pressureKPa,crew:s.crew,source:'finite initial ship manifest / T02 electrical bus; simplified cabin model'};
}
root.StarfallLifeSupport8E=Object.freeze({INITIAL,RATES,restore,step,diagnostics,demandW});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallLifeSupport8E;
})(typeof globalThis!=='undefined'?globalThis:this);
