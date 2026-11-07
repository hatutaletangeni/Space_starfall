/* STARFALL 8I — finite sealed greenhouse inside ORIGINAL T09 hab.
 * Passive sunlight provides photons; the existing already-billed 680 W T02
 * habitat bus runs valves/pumps (no additional electrical producer).
 * Idealized biomass reaction, per CO2 mole:
 *   CO2(44.01g) + H2O(18.01528g) -> CH2O(30.02728g) + O2(31.998g)
 * Mineral nutrient is retained within plant biomass, and seed biomass starts
 * from an actually debited 8A seed lot. Nothing grows without daylight.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-8;
const MOL_WATER_KG=.01801528,BIOMASS_KG_MOL=.04401+MOL_WATER_KG-.031998;
const NUTRIENT_KG_MOL=.0001,ENERGY_J_PER_MOL=480000,APERTURE_M2=6,EFFICIENCY=.02;
const WORK_INSTALL_J=400000,MAX_SOURCE_MASS_KG=100;
const good=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
function arc(a,b,r){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==3||b.length!==3||
  !a.every(Number.isFinite)||!b.every(Number.isFinite)||!good(r)||r<=0)
  throw Error('8I greenhouse requires original body-fixed positions');
 if(Math.abs(Math.hypot(...a)-1)>1e-4||Math.abs(Math.hypot(...b)-1)>1e-4)
  throw Error('8I greenhouse invalid radial position');
 return Math.acos(Math.max(-1,Math.min(1,a.reduce((s,v,i)=>s+v*b[i],0))))*r;
}
function install(a){
 if(!a||!id(a.operationId)||!a.operationId.startsWith('greenhouse8i:')||
 !id(a.habitatId)||!id(a.bodyId)||!id(a.shipContainerId)||
 !a.habitat||a.habitat.id!==a.habitatId||a.habitat.kind!=='hab'||
 a.habitat.bodyId!==a.bodyId||a.habitat.habT09?.schema!==1||
 !good(a.habitat.condition)||a.habitat.condition<=.02||
 !a.materials||a.materials.schema!==1||!Array.isArray(a.materials.lots)||
 !Array.isArray(a.materials.containers)||!Array.isArray(a.materials.operations)||
 !good(a.shipEnergyJ)||!good(a.timeS))
  throw Error('8I greenhouse needs original T09, 8A materials and valid job');
 const old=a.materials.operations.find(o=>o.id===a.operationId);
 if(old){
  if(old.kind!=='HABITAT_GREENHOUSE_8I'||old.habitatId!==a.habitatId)
   throw Error('Conflicting greenhouse installation receipt');
  if(old.status!=='COMMITTED')throw Error('Uncommitted greenhouse receipt cannot replay');
  return{duplicate:true,materials:cp(a.materials),habitat:cp(a.habitat),
   shipEnergyJ:a.shipEnergyJ,receipt:cp(old)};
 }
 if(a.habitat.habT09.greenhouse8i?.installed)
  throw Error('Physical greenhouse already installed; never create duplicates');
 if(a.habitat.habT09.airlock!=='CLOSED'||!a.shipLanded||!a.operatorEVA||!a.shipPowered||
    a.habitat.enabled===false)
  throw Error('Powered landed ship, active closed T09 habitat and EVA operator needed');
 if(arc(a.habitat.local,a.evaLocal,a.bodyRadius)>24||
    arc(a.habitat.local,a.shipLocal,a.bodyRadius)>100)
  throw Error('8I greenhouse installation out of physical range');
 const c=a.materials.containers.find(x=>x.id===a.shipContainerId&&x.ownerId==='ship-main');
 if(!c)throw Error('8I actual ship container needed');
 const specs=[['greenhouse_kit',1,.98],['crop_seeds',.02,.98],['fertilizer',.2,.98]];
 const debits=[];
 for(const [materialId,kg,grade] of specs){
  let remaining=kg;
  for(const l of a.materials.lots.filter(x=>x.containerId===c.id&&x.materialId===materialId&&
    good(x.grade)&&x.grade>=grade&&id(x.provenance))){
   const held=a.materials.operations.filter(o=>o.status==='RESERVED'&&o.lotId===l.id)
    .reduce((s,o)=>s+o.massKg,0);
   const n=Math.min(Math.max(0,l.massKg-held),remaining);
   if(n>EPS){debits.push({id:l.id,materialId,massKg:n,provenance:l.provenance});remaining-=n;}
   if(remaining<=EPS)break;
  }
  if(remaining>EPS)throw Error('8I greenhouse missing source-owned '+materialId+' ('+remaining.toFixed(4)+' kg)');
 }
 if(a.shipEnergyJ<WORK_INSTALL_J)throw Error('8I no original ship battery for greenhouse work');
 const materials=cp(a.materials),habitat=cp(a.habitat);
 for(const d of debits){
  const l=materials.lots.find(x=>x.id===d.id),vol=d.massKg*l.volumeM3/l.massKg;
  if(l.massKg-d.massKg<=EPS)materials.lots.splice(materials.lots.indexOf(l),1);
  else{l.massKg-=d.massKg;l.volumeM3=Math.max(0,l.volumeM3-vol);}
 }
 habitat.habT09.greenhouse8i={schema:1,installed:true,
  hardwareKg:1,seedMassKg:.02,nutrientKg:.2,cropBiomassKg:.02,
  carbonConsumedMol:0,waterConsumedKg:0,oxygenProducedMol:0,
  lastS:a.timeS,lastSunlightWm2:0,condition:1,harvestedKg:0,
  manufactureOrigins:debits.map(x=>({sourceLotId:x.id,materialId:x.materialId,
    massKg:x.massKg,provenance:x.provenance}))};
 const receipt={id:a.operationId,kind:'HABITAT_GREENHOUSE_8I',status:'COMMITTED',
  habitatId:a.habitatId,bodyId:a.bodyId,materialDebits:debits,
  seedMassKg:.02,nutrientKg:.2,hardwareKg:1,
  sourceContainerId:c.id,workJ:WORK_INSTALL_J,
  energySourceId:'ship-main:engineering-battery',
  sourceBatteryJBefore:a.shipEnergyJ,sourceBatteryJAfter:a.shipEnergyJ-WORK_INSTALL_J};
 materials.operations.push(receipt);
 root.StarfallMaterials8A?.create(materials);
 return{duplicate:false,materials,habitat,shipEnergyJ:a.shipEnergyJ-WORK_INSTALL_J,receipt};
}
function grow(item,{seconds,powered,irradianceWm2,nowS}){
 if(!item||item.kind!=='hab'||item.habT09?.schema!==1)throw Error('Original T09 required');
 const h=item.habT09,g=h.greenhouse8i;
 if(!g?.installed)return{advanced:false,reason:'NOT_INSTALLED',co2Mol:0};
 if(!good(seconds)||seconds>86400||!good(nowS)||!good(irradianceWm2))
  throw Error('Invalid native greenhouse timestep or sunlight');
 if(nowS<g.lastS-EPS)return{advanced:false,reason:'CLOCK_REWIND',co2Mol:0};
 const dt=Math.min(seconds,Math.max(0,nowS-g.lastS));
 if(dt<=EPS)return{advanced:false,reason:'NO_NEW_SIM_TIME',co2Mol:0};
 g.lastS=nowS;g.lastSunlightWm2=irradianceWm2;
 if(!powered||!item.enabled||!h.enabled||h.airlock!=='CLOSED'||g.condition<.5||
   irradianceWm2<20||h.tempK<280||h.tempK>307)
  return{advanced:false,reason:'NO_POWER_LIGHT_SEAL_OR_THERMAL',co2Mol:0};
 if(!good(h.carbonMol)||!good(h.waterL)||!good(h.oxygenMol)||!good(g.nutrientKg)||
   !good(g.cropBiomassKg))throw Error('Corrupt greenhouse source mass');
 const byPhoton=irradianceWm2*APERTURE_M2*EFFICIENCY*dt/ENERGY_J_PER_MOL;
 const byCarbon=Math.max(0,h.carbonMol),byWater=h.waterL/MOL_WATER_KG,
  byNutrients=g.nutrientKg/NUTRIENT_KG_MOL;
 const mol=Math.max(0,Math.min(byPhoton,byCarbon,byWater,byNutrients));
 if(mol<EPS)return{advanced:false,reason:'NO_CO2_WATER_OR_NUTRIENTS',co2Mol:0};
 const water=mol*MOL_WATER_KG,nutrient=mol*NUTRIENT_KG_MOL,
  biomass=mol*BIOMASS_KG_MOL+nutrient;
 h.carbonMol-=mol;h.waterL=Math.max(0,h.waterL-water);h.oxygenMol+=mol;
 g.nutrientKg=Math.max(0,g.nutrientKg-nutrient);
 g.cropBiomassKg+=biomass;g.carbonConsumedMol+=mol;
 g.waterConsumedKg+=water;g.oxygenProducedMol+=mol;
 return{advanced:true,co2Mol:mol,waterKg:water,nutrientKg:nutrient,
  biomassKg:biomass,oxygenMol:mol,solarPhotonEnergyJ:irradianceWm2*APERTURE_M2*EFFICIENCY*dt};
}
function irradiance(body,star,luminosityW,local,unitM=1000,transmission=1){
 if(!body||!star||!Array.isArray(body.position)||!Array.isArray(star.position)||
    !Array.isArray(local)||!good(luminosityW)||!good(unitM)||!good(transmission))
  return 0;
 const dir=star.position.map((x,i)=>x-body.position[i]),dist=Math.hypot(...dir);
 if(dist<=body.radius||!Number.isFinite(dist))return 0;
 const axis=body.spinAxis||[0,1,0],angle=body.spinAngle||0;
 const cross=[axis[1]*local[2]-axis[2]*local[1],axis[2]*local[0]-axis[0]*local[2],
    axis[0]*local[1]-axis[1]*local[0]];
 const k=Math.cos(angle),sn=Math.sin(angle),projection=axis.reduce((s,v,i)=>s+v*local[i],0);
 const normal=local.map((v,i)=>v*k+cross[i]*sn+axis[i]*projection*(1-k));
 const sun=Math.max(0,normal.reduce((s,v,i)=>s+v*dir[i]/dist,0));
 return Math.max(0,Math.min(1400,luminosityW/(4*Math.PI*(dist*unitM)**2)*sun*Math.min(1,transmission)));
}
root.StarfallGreenhouse8I=Object.freeze({install,grow,irradiance,
 MOL_WATER_KG,BIOMASS_KG_MOL,ENERGY_J_PER_MOL,WORK_INSTALL_J});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallGreenhouse8I;
})(typeof globalThis!=='undefined'?globalThis:this);
