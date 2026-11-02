/* STARFALL 3A: immutable component catalog, vehicle definitions, derived SI values,
 * transactional state and v2-save-compatible persistence. No geometry ownership.
 */
(function(root){'use strict';
const G0=9.80665,SCHEMA=1;
const C=Object.create(null);
const component=(id,type,massKg,extra={})=>Object.freeze({id,type,massKg,...extra});
[
 component('ship-hull','chassis',8600,{dimensionsM:[38,16,46],inertiaScale:[.083,.083,.083],maxPayloadKg:30000}),
 component('rover-frame','chassis',310,{dimensionsM:[6.8,3.2,8.6],inertiaScale:[.083,.083,.083],maxPayloadKg:1800}),
 component('thruster-standard','engine',1650,{thrustN:330000,ispS:315,powerW:21000,heatW:67000,heatLimitK:1650}),
 component('thruster-efficient','engine',1950,{thrustN:185000,ispS:425,powerW:26000,heatW:51000,heatLimitK:1650}),
 component('thruster-heavy','engine',2300,{thrustN:460000,ispS:292,powerW:31000,heatW:92000,heatLimitK:1650}),
 component('rover-motor','drive',110,{torqueNm:1300,powerW:3300,efficiency:.84}),
 component('rover-motor-efficient','drive',126,{torqueNm:1200,powerW:2550,efficiency:.91}),
 component('ship-tank','tank',520,{capacityKg:4500,propellant:'monopropellant'}),
 component('ship-tank-long','tank',760,{capacityKg:6800,propellant:'monopropellant'}),
 component('rover-tank-none','tank',0,{capacityKg:0,propellant:'none'}),
 component('battery-ship','battery',690,{capacityJ:18e7,maxChargeW:36000,maxDischargeW:50000,chargeEfficiency:.94,dischargeEfficiency:.94}),
 component('battery-ship-heavy','battery',1150,{capacityJ:32e7,maxChargeW:45000,maxDischargeW:65000,chargeEfficiency:.94,dischargeEfficiency:.94}),
 component('battery-rover','battery',165,{capacityJ:18e6,maxChargeW:9000,maxDischargeW:10000,chargeEfficiency:.92,dischargeEfficiency:.92}),
 component('battery-rover-long','battery',260,{capacityJ:32e6,maxChargeW:10000,maxDischargeW:12000,chargeEfficiency:.94,dischargeEfficiency:.94}),
 component('solar-ship','solar',155,{areaM2:32,efficiency:.24,maxPowerW:8700}),
 component('solar-ship-large','solar',225,{areaM2:54,efficiency:.26,maxPowerW:18000}),
 component('solar-rover','solar',65,{areaM2:6.5,efficiency:.27,maxPowerW:2400}),
 component('solar-rover-large','solar',85,{areaM2:11,efficiency:.28,maxPowerW:4300}),
 component('generator-ship','generator',420,{maxPowerW:28000,fuelIndependent:true}),
 component('generator-rover','generator',95,{maxPowerW:4800,fuelIndependent:true}),
 component('radiator-ship','radiator',170,{areaM2:68,emissivity:.78,pumpW:450}),
 component('radiator-ship-large','radiator',245,{areaM2:110,emissivity:.86,pumpW:600}),
 component('radiator-rover','radiator',25,{areaM2:9,emissivity:.83,pumpW:70}),
 component('wheels-standard','wheels',225,{count:6,radiusM:.7,traction:.7}),
 component('wheels-grippy','wheels',315,{count:6,radiusM:.74,traction:.91}),
 component('suspension-bogie','suspension',180,{travelM:.35,maxLoadKg:2600}),
 component('avionics-ship','avionics',170,{powerW:900}),
 component('avionics-rover','avionics',39,{powerW:190}),
 component('science-suite-ship','instrument',90,{powerW:600}),
 component('science-suite-rover','instrument',45,{powerW:280}),
  component('science-suite-rover-geo','instrument',62,{powerW:360,mode:'geology',instrumentKeys:['spectrometer','thermometer','barometer','magnetometer','radar','seismometer','sampler']}),
  component('science-suite-rover-bio','instrument',71,{powerW:420,mode:'biosurvey',instrumentKeys:['spectrometer','thermometer','barometer','bioassay','sampler']}),
 component('docking-ship','docking',90,{powerW:30}),
 component('docking-rover','docking',22,{powerW:10})
].forEach(item=>C[item.id]=item);
const slots={ship:[['chassis','chassis'],['engine','engine'],['tank','tank'],['battery','battery'],['solar','solar'],['generator','generator'],['radiator','radiator'],['avionics','avionics'],['instruments','instrument'],['docking','docking']],rover:[['chassis','chassis'],['motor','drive'],['battery','battery'],['solar','solar'],['generator','generator'],['radiator','radiator'],['wheels','wheels'],['suspension','suspension'],['avionics','avionics'],['instruments','instrument'],['docking','docking']]};
const ATTACH={
 ship:{chassis:[0,0,0],engine:[0,-.5,15.5],tank:[0,-.4,1],battery:[1.3,-.3,-3],solar:[0,1.5,3],generator:[-1.6,-.2,4],radiator:[0,1.2,10],avionics:[0,1.5,-10],instruments:[0,0,2],docking:[0,-1.1,-9]},
 rover:{chassis:[0,0,0],motor:[0,0,0],battery:[0,1,0],solar:[0,2,0],generator:[-.7,.6,.5],radiator:[0,1.3,1],wheels:[0,-1,0],suspension:[0,-.6,0],avionics:[0,2.2,-1],instruments:[0,1,-2],docking:[0,1.1,2]}
};
const presets={ship:{id:'starfall-ship',kind:'ship',schema:SCHEMA,mountPointsM:ATTACH.ship,slots:{chassis:'ship-hull',engine:'thruster-standard',tank:'ship-tank',battery:'battery-ship',solar:'solar-ship',generator:'generator-ship',radiator:'radiator-ship',avionics:'avionics-ship',instruments:'science-suite-ship',docking:'docking-ship'}},rover:{id:'starfall-rover',kind:'rover',schema:SCHEMA,mountPointsM:ATTACH.rover,slots:{chassis:'rover-frame',motor:'rover-motor',battery:'battery-rover',solar:'solar-rover',generator:'generator-rover',radiator:'radiator-rover',wheels:'wheels-standard',suspension:'suspension-bogie',avionics:'avionics-rover',instruments:'science-suite-rover',docking:'docking-rover'}}};
const copy=x=>JSON.parse(JSON.stringify(x));
function validate(def){const errors=[];if(!def||typeof def!=='object'||!slots[def.kind])return['Expected a ship or rover definition'];
 if(def.schema!==SCHEMA)errors.push('Unsupported definition schema');if(typeof def.id!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(def.id))errors.push('Invalid vehicle ID');
 const spec=slots[def.kind],expected=new Map(spec),ids=new Set(),parts=def.slots;if(!parts||typeof parts!=='object'||Array.isArray(parts))return['Missing component connections'];
 for(const [slot,type] of spec){const id=parts[slot];if(typeof id!=='string'||!C[id]){errors.push('Missing/unknown component at '+slot);continue;}
  const part=C[id];if(part.type!==type)errors.push('Incompatible component '+id+' at '+slot+' (requires '+type+')');
  const roverOnly=id.startsWith('rover-')||id.includes('-rover')||type==='drive'||type==='wheels'||type==='suspension';
  if((def.kind==='rover')!==roverOnly)errors.push('Incompatible vehicle family at '+slot+': '+id);
  if(ids.has(id))errors.push('Duplicate component ID: '+id);ids.add(id);
  if(!Number.isFinite(part.massKg)||part.massKg<0)errors.push('Invalid mass in '+id);
  if(type==='battery'&&(!(part.capacityJ>0)||!(part.maxDischargeW>0)))errors.push('Invalid battery SI capacity/power');
  if(type==='engine'&&(!(part.thrustN>0)||!(part.ispS>0)))errors.push('Invalid propulsion SI quantities');
  if(type==='tank'&&!(part.capacityKg>=0))errors.push('Invalid fuel capacity');
  if(type==='solar'&&(!(part.areaM2>0)||!(part.efficiency>0&&part.efficiency<=1)))errors.push('Invalid solar array');
 }
 for(const key of Object.keys(parts))if(!expected.has(key))errors.push('Unexpected connector: '+key);
 const hull=C[parts.chassis],dims=hull?.dimensionsM||[1,1,1];
 for(const [slot] of spec){const m=def.mountPointsM?.[slot];if(!Array.isArray(m)||m.length!==3||!m.every(Number.isFinite))errors.push('Missing/invalid mounting point for '+slot);
  else if(m.some((x,i)=>Math.abs(x)>dims[i]/2+3))errors.push('Mount point outside chassis envelope: '+slot);
 }
 if(def.mountPointsM&&Object.keys(def.mountPointsM).some(k=>!expected.has(k)))errors.push('Unexpected attachment point');
 if(def.kind==='rover'&&C[parts.wheels]?.count!==6)errors.push('Rover requires six wheels');
 if(C[parts.chassis]){const mass=Object.values(parts).reduce((s,id)=>s+(C[id]?.massKg||0),0);if(mass>50000||mass>C[parts.chassis].massKg+(C[parts.chassis].maxPayloadKg||0))errors.push('Assembly exceeds chassis load limit');}
 return errors;
}
function evaluate(def,fuelKg){const errors=validate(def);if(errors.length)throw Error(errors.join('; '));const parts=Object.values(def.slots).map(id=>C[id]);const get=(slot)=>C[def.slots[slot]]||{},structure=parts.reduce((sum,c)=>sum+c.massKg,0),tank=get('tank'),fuelCapacityKg=tank.capacityKg||0;
 const fuel=Math.max(0,Math.min(fuelCapacityKg,Number.isFinite(fuelKg)?fuelKg:fuelCapacityKg));const hull=get('chassis'),engine=get('engine'),battery=get('battery'),solar=get('solar'),generator=get('generator'),radiator=get('radiator'),motor=get('motor'),wheels=get('wheels');
 const massKg=structure+fuel,dimensionsM=hull.dimensionsM||[1,1,1];
 const bodies=Object.entries(def.slots).sort(([a],[b])=>a.localeCompare(b)).map(([slot,id])=>({slot,mass:(C[id]?.massKg||0)+(slot==='tank'?fuel:0),at:def.mountPointsM[slot]}));
 const centerOfMassM=[0,1,2].map(i=>bodies.reduce((a,b)=>a+b.mass*b.at[i],0)/Math.max(1,massKg));
 // Lumped point modules plus cuboid chassis self-inertia (parallel axis theorem).
 const chassisMass=hull.massKg||0;
 const inertiaKgM2=[0,1,2].map(i=>chassisMass*(dimensionsM[(i+1)%3]**2+dimensionsM[(i+2)%3]**2)/12+bodies.reduce((a,b)=>a+(b.mass*((b.at[(i+1)%3]-centerOfMassM[(i+1)%3])**2+(b.at[(i+2)%3]-centerOfMassM[(i+2)%3])**2)),0));
 return{kind:def.kind,id:def.id,dryMassKg:structure,fuelKg:fuel,massKg,fuelCapacityKg,inertiaKgM2,centerOfMassM,thrustN:engine.thrustN||0,ispS:engine.ispS||0,enginePowerW:engine.powerW||0,engineHeatW:engine.heatW||0,engineHeatLimitK:engine.heatLimitK||1650,batteryCapacityJ:battery.capacityJ||0,maxChargeW:battery.maxChargeW||0,maxDischargeW:battery.maxDischargeW||0,chargeEfficiency:battery.chargeEfficiency||1,dischargeEfficiency:battery.dischargeEfficiency||1,solarAreaM2:solar.areaM2||0,solarEfficiency:solar.efficiency||0,maxSolarW:solar.maxPowerW||0,generatorW:generator.maxPowerW||0,radiatorAreaM2:radiator.areaM2||0,emissivity:radiator.emissivity||.78,pumpW:radiator.pumpW||0,avionicsW:get('avionics').powerW||0,instrumentsW:get('instruments').powerW||0,dockingW:get('docking').powerW||0,drivePowerW:motor.powerW||0,driveTorqueNm:motor.torqueNm||0,wheelRadiusM:wheels.radiusM||0,traction:wheels.traction||0,suspensionTravelM:get('suspension').travelM||0,deltaVMS:fuel>0&&engine.ispS?engine.ispS*G0*Math.log(massKg/structure):0,burnSeconds:fuel>0&&engine.thrustN?fuel*engine.ispS*G0/engine.thrustN:0};}
function allowsInstrument(def,instrument){
 if(!def||typeof instrument!=='string')return false;
 const part=C[def.slots?.instruments];if(!part||part.type!=='instrument')return false;
 // Legacy science suite intentionally retains its prior full tool set.
 const all=['spectrometer','thermometer','barometer','magnetometer','radar','seismometer','sampler','bioassay'];
 return (Array.isArray(part.instrumentKeys)?part.instrumentKeys:all).includes(instrument);
}
function initialState(kind,def=presets[kind]){const e=evaluate(def);return{schema:SCHEMA,fuelKg:e.fuelKg,energyJ:e.batteryCapacityJ*.85,temperatureK:290,health:1,loads:{avionics:true,instruments:true,lights:true,radiator:true,drive:true},powerEnabled:false};}
function repairState(def,input){const base=initialState(def.kind,def),e=evaluate(def);const s=input&&typeof input==='object'?input:{};const safe=(key,min,max,fallback)=>Number.isFinite(s[key])?Math.min(max,Math.max(min,s[key])):fallback;return{...base,fuelKg:safe('fuelKg',0,e.fuelCapacityKg,base.fuelKg),energyJ:safe('energyJ',0,e.batteryCapacityJ,base.energyJ),temperatureK:safe('temperatureK',2,3000,290),health:safe('health',0,1,1),powerEnabled:!!s.powerEnabled,loads:Object.fromEntries(Object.keys(base.loads).map(k=>[k,s.loads?.[k]!==false]))};}
function sanitize(saved){const output={schema:SCHEMA,definitions:{},states:{}};for(const kind of ['ship','rover']){const def=saved?.schema===SCHEMA&&saved.definitions?.[kind];output.definitions[kind]=def&&validate(def).length===0?copy(def):copy(presets[kind]);output.states[kind]=repairState(output.definitions[kind],saved?.states?.[kind]);}return output;}
function createStore(saved){let data=sanitize(saved);return{get(kind){return{definition:copy(data.definitions[kind]),state:copy(data.states[kind]),stats:evaluate(data.definitions[kind],data.states[kind].fuelKg)};},serialize(){return copy(data);},replaceAll(value){data=sanitize(value);},setPower(kind,enabled){if(data.states[kind])data.states[kind].powerEnabled=!!enabled;},setLoad(kind,load,on){if(!(load in data.states[kind].loads))throw Error('Unknown load '+load);data.states[kind].loads[load]=!!on;},update(kind,next){data.states[kind]=repairState(data.definitions[kind],next);},apply(kind,def){if(!def||def.kind!==kind)throw Error('Wrong vehicle type');const errors=validate(def);if(errors.length)throw Error(errors.join('; '));const revised=copy(def),old=data.states[kind],previous=evaluate(data.definitions[kind]);const stats=evaluate(revised);const converted=repairState(revised,old);
 // Preserve current fuel and charge when possible; new capacity never gives free energy.
 converted.energyJ=Math.min(old.energyJ,stats.batteryCapacityJ);converted.fuelKg=Math.min(old.fuelKg,stats.fuelCapacityKg);
 const result={definition:revised,state:converted};data.definitions[kind]=result.definition;data.states[kind]=result.state;return{old:previous,next:evaluate(revised,converted.fuelKg)};}};}
root.StarfallVehicles={SCHEMA,G0,components:C,presets:copy(presets),slots,validate,evaluate,initialState,repairState,sanitize,createStore,allowsInstrument,clone:copy};
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallVehicles;
})(globalThis);
