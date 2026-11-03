/* LW04 deterministic hydrosphere: ocean inventory -> waves -> buoyancy and depth.
 * Original planet ground height remains untouched for existing save compatibility.
 * All scene units and SI conversions must be explicitly converted at the boundary.
 */
(function(root){'use strict';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),TAU=Math.PI*2;
const SCENE_M=1000;
function material(body,seed=742){
 if(!body?.id||!body.landable)return null;
 if(!['Ocean','Temperate','Lush'].includes(body.type))return null;
 const composition=root.StarfallCompositionCW01?.bodyFor(body,seed);
 const chemistry=composition?.majorMaterialMassFractions||{},water=chemistry.H2O||0;
 if(body.type==='Ocean'&&water<.005)return null;
 return Object.freeze({bodyId:body.id,species:'H2O',densityKgM3:body.type==='Ocean'?1025:998,
  sceneSeaLevel:body.radius+2.1,seaLevelOffsetScene:2.1,referenceTemperatureK:body.type==='Ocean'?288:282,
  dissolvedSalts:body.type==='Ocean'?.034:0,inventoryPrior:water,
  provenance:'CW01 water inventory; sea surface over legacy height-zero ocean terrain, visual offset to preserve existing collision'});
}
function wave(body,dir,timeS=0,seed=742,weather){
 if(!Number.isFinite(timeS)||timeS<0||!Array.isArray(dir)||dir.length!==3||!dir.every(Number.isFinite))throw Error('Invalid wave coordinates');
 const sea=material(body,seed);if(!sea)return 0;
 const len=Math.hypot(...dir);if(len<1e-10)throw Error('Zero water direction');
 const d=dir.map(x=>x/len),w=weather||root.StarfallMeteorologyLW03?.cell(body,d,timeS,seed);
 const wind=Math.max(0,w?.windMS||4),g=Math.max(.1,(body.gravity||1)*9.80665),amplitudeM=clamp(.07+wind*wind/(g*220),.07,3.2);
 const scales=[24,61,140],freq=[1.2,1.9,.8],coef=[.52,.30,.18];let sum=0;
 for(let i=0;i<3;i++){const k=TAU/scales[i],speed=Math.sqrt(g/k);
  const projection=(d[0]*(i===1?.6:1)+d[2]*(i===2?.7:1))*body.radius*SCENE_M;
  sum+=coef[i]*Math.sin(k*projection-k*speed*timeS*freq[i]+i*2.71);}
 return sum*amplitudeM/SCENE_M;
}
function sample(body,dir,sceneHeight,timeS=0,seed=742){
 const sea=material(body,seed);
 if(!sea)return Object.freeze({hasWater:false,wet:false,submerged:false,depthM:0,surfaceHeightScene:0,
  densityKgM3:0,buoyancyN:0,pressurePa:0,dragFactor:1});
 const unit=dir.map(x=>x/(Math.hypot(...dir)||1)),f=root.Starfall3D?.field?.(unit,body.seed);
 const ground=f===undefined?0:root.Starfall3D.groundHeight(unit,body,f);
 // Ocean masks are defined by the ORIGINAL continuous field, never by a new shoreline generator.
 const valid=f===undefined?sceneHeight<1:ground<1;
 const surface=sea.seaLevelOffsetScene+wave(body,unit,timeS,seed),depthM=Math.max(0,(surface-sceneHeight)*SCENE_M);
 const rho=sea.densityKgM3,gravity=Math.max(.1,(body.gravity||1)*9.80665);
 return Object.freeze({hasWater:valid,wet:valid&&Math.abs(sceneHeight-surface)<.65,
  submerged:valid&&depthM>0,depthM:valid?depthM:0,surfaceHeightScene:surface,
  densityKgM3:valid?rho:0,pressurePa:valid?rho*gravity*depthM:0,gravityMS2:gravity,
  waveHeightM:(surface-sea.seaLevelOffsetScene)*SCENE_M,dragFactor:valid?Math.exp(-Math.min(12,depthM*.025)):1});
}
function buoyancy(state,displacementM3,massKg,dtSeconds){
 if(!state?.hasWater||!Number.isFinite(displacementM3)||displacementM3<0||!(massKg>0)||!Number.isFinite(dtSeconds)||dtSeconds<0)throw Error('Invalid buoyancy inputs');
 const g=state.gravityMS2,upthrustN=state.densityKgM3*displacementM3*g;
 const weightN=massKg*g,netAccelerationMS2=(upthrustN-weightN)/massKg;
 return Object.freeze({upthrustN,weightN,netAccelerationMS2,
  displacementM3,massKg,volumeFloats:upthrustN>=weightN,model:'Archimedes hydrostatic displacement; no rigid-body wave coupling'});
}
const API=Object.freeze({SCENE_M,material,wave,sample,buoyancy});root.StarfallHydrosphereLW04=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
