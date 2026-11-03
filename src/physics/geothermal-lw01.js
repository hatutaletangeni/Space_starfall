/* STARFALL LW-01 geothermal source model.
 * Analytical, deterministic candidate sources, not a CFD or finite-element solver.
 * Sources are planet-fixed; no collision/terrain generation or old save mutation.
 */
(function(root){'use strict';
const TAU=Math.PI*2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const nrm=v=>{const k=Math.hypot(...v);if(!(k>0&&Number.isFinite(k)))throw Error('Invalid planet-fixed direction');return v.map(x=>x/k)};
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
function rnd(s){let x=hash(s);x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296}
function sources(body,seed=742){
 if(!body?.id||!body.landable)return Object.freeze([]);
 const type=body.type,magmatic=['Volcanic','Rocky'].includes(type),cryogenic=type==='Ice',hydro=['Temperate','Ocean','Lush'].includes(type);
 if(!magmatic&&!cryogenic&&!hydro)return Object.freeze([]);
 const out=[],count=type==='Volcanic'?5:cryogenic?3:2;
 for(let i=0;i<count;i++){
  const k=seed+':'+body.id+':LW01:'+i,lat=(rnd(k+':lat')-.5)*2.3,lon=rnd(k+':lon')*TAU,cos=Math.cos(lat);
  const fluidPrior=cryogenic?.68:hydro?.75:magmatic?.24:0;
  const thermalWm2=(magmatic?.45:cryogenic?.18:.12)*(0.6+1.2*rnd(k+':heat'));
  const volatileInventoryKg=(4e6+3e7*rnd(k+':reservoir'))*fluidPrior;
  const magmaViscosityPaS=magmatic?Math.pow(10,1.7+4.4*rnd(k+':viscosity')):0;
  let kind;
  if(cryogenic)kind='cryovolcano';
  else if(hydro)kind=rnd(k+':style')<.7?'geyser':'fumarole';
  else if(magmaViscosityPaS>2e4)kind='explosive-volcano';
  else kind=rnd(k+':style')<.38?'fissure-eruption':'effusive-volcano';
  const cycleS=Math.round((type==='Volcanic'?1600:2600)*(0.7+1.1*rnd(k+':period')));
  const durationS=Math.max(60,Math.round(cycleS*(.06+.16*rnd(k+':duration'))));
  out.push(Object.freeze({schema:1,id:body.id+':geothermal:'+i,bodyId:body.id,kind,
   direction:Object.freeze([cos*Math.cos(lon),Math.sin(lat),cos*Math.sin(lon)]),
   thermalFluxWm2:thermalWm2,volatileInventoryKg,magmaViscosityPaS,
   conduitDepthM:220+2400*rnd(k+':depth'),ventRadiusM:4+36*rnd(k+':width'),
   cycleS,durationS,epochOffsetS:Math.floor(cycleS*rnd(k+':phase')),
   provenance:'seeded geothermal source prior; not surveyed',uncertainty:'high'}));
 }return Object.freeze(out);
}
function pulse(site,timeS,ambientPa=101325,gravityMS2=9.80665){
 if(!site||!Number.isFinite(timeS)||timeS<0||!Number.isFinite(ambientPa)||ambientPa<0||!(gravityMS2>0))throw Error('Invalid geothermal state');
 const cycle=site.cycleS,dt=(timeS+site.epochOffsetS)%cycle,active=dt<site.durationS;
 const phase=clamp(dt/site.durationS),eruption=active?Math.sin(phase*Math.PI)**2:0;
 const isMagma=['effusive-volcano','explosive-volcano','fissure-eruption'].includes(site.kind);
 const isCryo=site.kind==='cryovolcano',gasFluid=!isMagma&&site.volatileInventoryKg>0;
 const overpressurePa=site.thermalFluxWm2*(isMagma?3e7:8e6)*(0.35+0.65*(1-dt/cycle));
 const thresholdPa=ambientPa+(isMagma?7e5:gasFluid?1.5e5:5e4);
 const canErupt=site.thermalFluxWm2>0&&overpressurePa>thresholdPa&&(isMagma||site.volatileInventoryKg>0);
 const intensity=canErupt?eruption:0;
 const densityKgM3=isMagma?2700:isCryo?920:1000;
 const massFlowKgS=intensity*site.ventRadiusM**2*(isMagma?110:gasFluid?8:0);
 const estimatedExitVelocityMS=Math.sqrt(Math.max(0,2*(overpressurePa-thresholdPa)/densityKgM3));
 const ballisticHeightM=estimatedExitVelocityMS**2/(2*gravityMS2);
 const plumeHeightM=Math.min(25000,ballisticHeightM*(isMagma?1.6:.7));
 return Object.freeze({sourceId:site.id,kind:site.kind,timeS,active:!!intensity,intensity,
  pressurePa:ambientPa+overpressurePa,ambientPressurePa:ambientPa,thresholdPa,
  massFlowKgS,exitVelocityMS:estimatedExitVelocityMS,plumeHeightM,
  heatFluxWm2:site.thermalFluxWm2,ashMassFlowKgS:isMagma&&site.kind==='explosive-volcano'?massFlowKgS*.3:0,
  lavaMassFlowKgS:isMagma?massFlowKgS*(site.kind==='explosive-volcano'?.2:.8):0,
  vaporMassFlowKgS:!isMagma?massFlowKgS:0,
  model:'periodic pressurization and discharge analytical proxy; not fluid dynamics'});
}
function local(body,direction,timeS,seed=742,pressurePa=101325,gravityMS2=9.80665){
 const d=nrm(direction),r=body?.radius||1000;
 let best=null;for(const site of sources(body,seed)){
  const dot=clamp(d[0]*site.direction[0]+d[1]*site.direction[1]+d[2]*site.direction[2],-1,1);
  const distanceScene=Math.acos(dot)*r;
  const state=pulse(site,timeS,pressurePa,gravityMS2),rangeScene=Math.max(.008,site.ventRadiusM/1000)*15;
  if(distanceScene<rangeScene&&(!best||distanceScene<best.distanceScene))best=Object.freeze({site,state,distanceScene,rangeScene,thermalExposure:state.intensity*clamp(1-distanceScene/rangeScene)});
 }return best;
}
const API=Object.freeze({sources,pulse,local});
root.StarfallGeothermalLW01=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
