/* CW05: cheap deterministic atmosphere optical adapter.
 * Mole fractions are CW01 procedural priors. No pressure/weather owner replacement.
 * No atmospheric physics claims for vacuum, giant deep layers or unmeasured aerosols.
 */
(function(root){'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mass=Object.freeze({H2:2.016,He:4.0026,N2:28.0134,O2:31.998,Ar:39.948,CO2:44.01,H2O:18.015,CH4:16.04,SO2:64.066});
const cache=new Map(),MAX_CACHE=192;
function optical(body,seed=742){if(!body?.id)throw Error('Missing atmosphere body');
 const key=seed+':'+body.id+':'+body.kind+':'+body.type;
 if(cache.has(key))return cache.get(key);
 const store=value=>{if(cache.size>=MAX_CACHE)cache.delete(cache.keys().next().value);cache.set(key,value);return value;};
 const c=root.StarfallCompositionCW01?.bodyFor(body,seed);
 const gases=c?.atmosphereMoleFractions||{};
 const species=Object.entries(gases),total=species.reduce((a,[,v])=>a+v,0);
 if(total===0)return store(Object.freeze({bodyId:body.id,vacuum:true,color:Object.freeze([0,0,0]),relativeHaze:0,meanMolarMassKgMol:null,provenance:'CW01 vacuum compatibility'}));
 const molar=species.reduce((a,[s,v])=>a+v*(mass[s]||28),0)/1000;
 const co2=gases.CO2||0,ch4=gases.CH4||0,so2=gases.SO2||0,water=gases.H2O||0,h2=gases.H2||0;
 // Artistically bounded scattering proxy: sky palette only, not calibrated Rayleigh radiance.
 const color=[clamp(.32+.45*co2+.18*so2+.17*ch4),clamp(.48-.10*co2+.15*water),clamp(.75-.48*co2-.36*ch4-.32*so2+.04*h2)];
 return store(Object.freeze({bodyId:body.id,vacuum:false,color:Object.freeze(color),relativeHaze:clamp(.13+.42*co2+.30*ch4+.27*so2),meanMolarMassKgMol:molar,provenance:'CW01 composition; approximate optical tone, NOT validated spectral scattering'}));
}
const API=Object.freeze({optical});
root.StarfallAtmosphereCW05=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
