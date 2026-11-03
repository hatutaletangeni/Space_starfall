/* CW04: pressure-temperature screening for volatile stability, read-only.
 * Approximate phase windows, NOT complete Gibbs free energy / activity models.
 * Never changes existing water surface, terrain height, or collisions.
 */
(function(root){'use strict';
const TRIPLE=Object.freeze({H2O:{K:273.16,Pa:611.657},CO2:{K:216.58,Pa:518000},CH4:{K:90.69,Pa:11696},N2:{K:63.15,Pa:12500},NH3:{K:195.4,Pa:6060}});
const BOIL=Object.freeze({H2O:373.15,CO2:194.7,CH4:111.66,N2:77.36,NH3:239.82});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function phase(species,tempK,pressurePa){if(!TRIPLE[species])throw Error('Unknown volatile');if(!Number.isFinite(tempK)||tempK<=0||!Number.isFinite(pressurePa)||pressurePa<0)throw Error('Invalid thermodynamic state');
 const triple=TRIPLE[species];
 // These limits are purposefully conservative; a real vapor-pressure calculation
 // is required to certify liquid stability at non-reference pressures.
 let state='undetermined';
 if(pressurePa<triple.Pa)state=tempK<triple.K?'solid-or-sublimating':'gas-or-vapor';
 else if(species==='CO2')state=tempK<triple.K?'solid':'undetermined';
 else if(tempK<triple.K)state='solid';
 else if(pressurePa>=85000&&pressurePa<=120000&&tempK>triple.K&&tempK<BOIL[species])state='liquid-possible';
 else if(tempK>BOIL[species]+30)state='gas-or-vapor';
 return Object.freeze({species,state,temperatureK:tempK,pressurePa,model:'conservative phase-window estimate',uncertainty:'high'});
}
function world(body,scienceProfile,composition){if(!body?.id)throw Error('Missing world ID');
 const c=composition||root.StarfallCompositionCW01?.bodyFor(body,742),p=scienceProfile||{};
 const temperatureK=Number.isFinite(p.estimatedEquilibriumTemperatureK)?p.estimatedEquilibriumTemperatureK:null;
 const pressurePa=Number.isFinite(p.atmospherePressurePa)?p.atmospherePressurePa:null;
 const inventory=c?.majorMaterialMassFractions||{},samples={};
 if(temperatureK!==null&&pressurePa!==null){for(const species of ['H2O','CO2','CH4','N2','NH3'])samples[species]=phase(species,temperatureK,pressurePa);}
 return Object.freeze({bodyId:body.id,legacyType:body.type,temperatureK,pressurePa,volatiles:Object.freeze(samples),
 waterInventoryPrior:inventory.H2O??null,existingVisualOceansUnchanged:true,
 provenance:'CW04 screened equilibrium temperature and legacy pressure; no local weather or geothermal treatment',
 uncertainty:'high; surface temperature, vapor pressures and volatile abundance unconfirmed'});
}
const API=Object.freeze({TRIPLE,phase,world});
root.StarfallVolatilesCW04=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
