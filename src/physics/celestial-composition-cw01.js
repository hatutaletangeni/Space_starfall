/* CW-01: deterministic, read-only composition interpretation of existing celestial bodies.
 * Values are modeled priors, NOT measured composition or precise planetary formation.
 * No galaxy regeneration, body mutation, clocks, DOM, WebGL, saves or side effects.
 * Composition versions are explicit because previously discovered worlds must not silently re-roll.
 */
(function(root){'use strict';
const VERSION=1, EPS=1e-10;
const FREEZE=x=>Object.freeze(x);
const mixtures=FREEZE({
 Rocky:{silicate:.68,metal:.27,volatile:.05},Desert:{silicate:.78,metal:.19,volatile:.03},
 Ice:{silicate:.29,metal:.09,volatile:.62},Temperate:{silicate:.69,metal:.25,volatile:.06},
 Ocean:{silicate:.44,metal:.16,volatile:.40},Volcanic:{silicate:.78,metal:.19,volatile:.03},
 Lush:{silicate:.64,metal:.25,volatile:.11},'Gas Giant':{gas:.94,ice:.045,rock:.015},
 Shattered:{silicate:.53,metal:.43,volatile:.04}
});
const bulkDensity=FREEZE({Rocky:4100,Desert:3650,Ice:1700,Temperate:4000,Ocean:2600,Volcanic:4600,Lush:3800,'Gas Giant':920,Shattered:3250});
const atmosphereTemplates=FREEZE({
 Rocky:{},Desert:{CO2:.94,N2:.05,Ar:.01},Ice:{N2:.90,CH4:.08,Ar:.02},
 Temperate:{N2:.79,O2:.20,Ar:.01},Ocean:{N2:.76,O2:.21,H2O:.02,Ar:.01},
 Volcanic:{CO2:.82,N2:.12,SO2:.06},Lush:{N2:.77,O2:.21,Ar:.01,H2O:.01},
 'Gas Giant':{H2:.86,He:.13,CH4:.01},Shattered:{}
});
const compatible=FREEZE(['Rocky','Desert','Ice','Temperate','Ocean','Volcanic','Lush','Gas Giant','Shattered']);
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function unit(seed,id,salt){let x=hash(seed+':'+id+':cw01:'+VERSION+':'+salt);x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;}
function fractions(x){const entries=Object.entries(x);if(!entries.length)return FREEZE({});let sum=0;for(const [key,val] of entries){if(typeof key!=='string'||!Number.isFinite(val)||val<0)throw Error('Invalid composition fraction');sum+=val;}if(!(sum>0))throw Error('Empty positive inventory');return FREEZE(Object.fromEntries(entries.map(([key,val])=>[key,val/sum])));}
function check(x){const a=Object.values(x);return a.length===0||Math.abs(a.reduce((s,v)=>s+v,0)-1)<EPS;}
function interpolate(prior,seed,id){const entries=Object.entries(prior),altered={};for(const [name,frac] of entries)altered[name]=frac*(.91+.18*unit(seed,id,name));return fractions(altered);}
function starFor(star,seed=742){if(!star||!star.id)throw Error('Expected an existing star ID');const metal=.008+.024*unit(seed,star.id,'stellar-metallicity');const helium=.225+.09*unit(seed,star.id,'stellar-helium');const elements=fractions({H:1-helium-metal,He:helium,metals:metal});
return FREEZE({schema:VERSION,id:star.id,kind:'star',legacyType:star.type,elementMassFractions:elements,metallicityMassFraction:elements.metals,provenance:'seeded stellar abundance prior (not spectroscopic measurement)',uncertainty:'high',generationKey:seed+':'+star.id+':'+VERSION});}
function bodyFor(body,seed=742,context={}){if(!body||!body.id||!['planet','moon'].includes(body.kind))throw Error('Expected existing planet/moon ID');
 const type=compatible.includes(body.type)?body.type:'Rocky',giant=type==='Gas Giant',p=interpolate(mixtures[type],seed,body.id);
 const parentType=context.parentType||null;
 // Legacy moon surfaces remain interpreted by their own type; no body-class or terrain rewriting.
 const major=giant?fractions({H2:.73+.08*unit(seed,body.id,'H2'),He:.24,CH4:.02,NH3:.01}):fractions({
 SiO2:p.silicate*.65,otherSilicates:p.silicate*.35,FeNi:p.metal||0,
 H2O:(p.volatile||0)*(type==='Ice'||type==='Ocean'?.80:.45),
 CO2_ice:(p.volatile||0)*(type==='Ice'?.12:.16),
 otherVolatiles:(p.volatile||0)*(type==='Ice'?.08:.39)
 });
 // Legacy moon-atmosphere text is not trustworthy pressure evidence. The existing
 // physics model reports vacuum for moons; interpretation must therefore be vacuum.
 const vacuum=body.kind==='moon'||type==='Rocky'||type==='Shattered'||body.atmosphere==='Vacuum / debris field';
 const atmosphereMoleFractions=vacuum?FREEZE({}):interpolate(atmosphereTemplates[type],seed,body.id+':atm');
 const layers=giant?FREEZE({envelopeMassFraction:p.gas,condensateMassFraction:p.ice,deepInteriorMassFraction:p.rock}):FREEZE({crustMantleSilicateMassFraction:p.silicate,coreMetalMassFraction:p.metal,bulkVolatileMassFraction:p.volatile});
 const profile=FREEZE({schema:VERSION,id:body.id,seed,kind:body.kind,legacyType:body.type,parentType,landable:!!body.landable,
   bulkComponentMassFractions:p,majorMaterialMassFractions:major,layers,
   atmosphereMoleFractions,atmosphereMode:vacuum?'legacy vacuum-compatible':giant?'gas envelope':'seeded atmosphere prior',
   approximateDensityKgM3:bulkDensity[type],phaseAssessment:'unknown: requires local pressure-temperature model',
   provenance:'seeded compositional prior derived from existing classification; not observed',uncertainty:'high',
   generationKey:seed+':'+body.id+':'+VERSION});
 if(!check(p)||!check(major)||!check(atmosphereMoleFractions))throw Error('Invalid composition sum');
 return profile;
}
function forBody(body,galaxy){if(!body)return null;const seed=Number.isSafeInteger(galaxy?.seed)?galaxy.seed:742;
 if(body.kind==='star')return starFor(body,seed);
 const parent=body.kind==='moon'?galaxy?.byId?.get(body.parentId):null;
 return bodyFor(body,seed,{parentType:parent?.type||null});}
const API=FREEZE({SCHEMA_VERSION:VERSION,mixtures,starFor,bodyFor,forBody,check});
root.StarfallCompositionCW01=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
