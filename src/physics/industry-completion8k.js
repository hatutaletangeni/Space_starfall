/* Source-owned prototype flight, regenerative cabin and incremental climate.
 * These reduced-order engineering models do not certify real hardware,
 * food safety or planetary habitability. No ambient species are invented.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7,R=8.314462618,SIGMA=5.670374419e-8;
const good=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
function requireThat(x,message){if(!x)throw Error(message);}
function take(m,cid,id,kg){let left=kg;const used=[];
 for(const l of m.lots){if(l.containerId!==cid||l.materialId!==id||l.grade<.98||/TEST_FIXTURE|CREATIVE|DEBUG|CHEAT/i.test(l.provenance||''))continue;
  const held=m.operations.filter(o=>o.status==='RESERVED'&&o.lotId===l.id).reduce((s,o)=>s+o.massKg,0),n=Math.min(left,Math.max(0,l.massKg-held));
  if(n>EPS){const old=l.massKg;l.massKg-=n;l.volumeM3*=l.massKg/old;used.push({lotId:l.id,materialId:id,massKg:n,provenance:l.provenance});left-=n;}if(left<EPS)break;
 }requireThat(left<EPS,'Missing unreserved source-owned '+id);m.lots=m.lots.filter(l=>l.massKg>EPS);return used;
}
function ageStage(stage,timeS){
 const c=stage.state?.orbital8g;if(!c)return;
 requireThat(good(c.hydrogenKg)&&good(c.lastS)&&good(c.ventedKg)&&timeS>=c.lastS,'Corrupt/regressed cryogenic tank ledger');
 const lostH=Math.min(c.hydrogenKg,20*(timeS-c.lastS)/(445000+8*213000));
 c.hydrogenKg-=lostH;c.ventedKg+=9*lostH;c.lastS=timeS;stage.massKg-=9*lostH;
}
function ageTanks(physical,timeS){const p=cp(physical);for(const stage of p.assets)ageStage(stage,timeS);return p;}
function launch(a){
 const m=cp(a.materials),p=ageTanks(a.physical,a.timeS),store=cp(a.launchStore),body=a.body,preparing=a.prepareOnly===true,orbital=a.propulsion==='orbital'||preparing;
 requireThat((a.operationId?.startsWith('rocket8g:')||a.operationId?.startsWith('condition8g:'))&&good(a.timeS)&&good(a.shipEnergyJ)&&a.shipEnergyJ>=3e6,'Rocket operation needs unique ID, clock and 3 MJ ship work');
 requireThat(!m.operations.some(o=>o.id===a.operationId)&&!store.launches.some(o=>o.id===a.operationId),'Rocket already committed');
 requireThat(body?.landable&&good(body.radius)&&body.radius>0&&good(body.gravity)&&body.gravity>0&&store.launches.length<240&&Array.isArray(a.launchUp)&&a.launchUp.length===3&&a.launchUp.every(Number.isFinite)&&Math.abs(Math.hypot(...a.launchUp)-1)<1e-4,'Valid solid world, radial launch axis and free launch archive slot required');
 const stage=p.assets.find(x=>x.id===a.stageId),receipt=a.assembly?.receipts?.find(x=>x.assetId===a.stageId&&x.blueprintId==='rocket_stage'),bill=root.StarfallAssembly8G.DEFINITIONS.rocket_stage.parts,c=stage?.state?.orbital8g,
  storedMass=c?80+9*c.hydrogenKg:0;
 requireThat(stage?.type==='rocket_stage_dry'&&stage.condition>=.95&&stage.location?.bodyId===body.id&&stage.provenance==='structural-8g:'+stage.id&&receipt?.status==='ASSEMBLED_NOT_OPERATIONAL'&&Math.abs(stage.massKg-storedMass-receipt.massKg)<EPS,'An intact, genuinely manufactured dry rocket stage is required');
 for(const [id,kg]of Object.entries(bill))requireThat(Math.abs(receipt.consumedLots.filter(l=>l.materialId===id).reduce((s,l)=>s+l.massKg,0)-kg)<EPS,'Rocket missing manufactured '+id);
 const pad=p.assets.find(x=>x.id===stage.state.assemblyFacilityId);
 requireThat(pad?.state?.station==='rocket_integration'&&pad.location?.bodyId===body.id&&pad.condition>=.8,'Original installed rocket integration rig required');
 requireThat(orbital||!c,'Conditioned orbital stage must use orbital ignition');
 let h=orbital&&!preparing?c?.hydrogenKg:a.hydrogenKg;
 requireThat(good(h)&&h>=.1&&h<=(orbital&&!preparing?140:8),'Hydrogen load outside selected envelope; condition orbital propellant in <=8 kg H2 batches first');
 let workJ=3e6,used=[],hardware=[];
 if(preparing&&!c){
  requireThat(m.lots.some(l=>l.containerId===a.partsContainerId&&l.materialId==='orbital_propulsion_kit'&&a.factory?.receipts?.some(r=>r.status==='COMMITTED'&&r.recipeId==='orbital_propulsion_kit'&&l.provenance==='process:'+r.id)),'Manufacture an orbital propulsion kit before cryogenic conditioning');
  hardware=take(m,a.partsContainerId,'orbital_propulsion_kit',80);
 }
 const liquidH=preparing?h+(c?.hydrogenKg||0):h,volume=orbital?liquidH/70.8+8*liquidH/1141:(h/.002016+8*h/.031998)*R*293.15/8e6;
 requireThat(volume<=stage.volumeM3,'Propellant exceeds manufactured tank volume');
 if(preparing||!orbital){
  if(preparing)workJ+=h*1.02*(15e6+8*.8e6);
  for(const [gas,id,kg,mw]of [['hydrogen',a.hydrogenVesselId,h,.002016],['oxygen',a.oxygenVesselId,8*h,.031998]]){
   const v=p.assets.find(x=>x.id===id),bin=m.containers.find(x=>x.id===v?.state?.containerId&&x.ownerId===id);
   requireThat(v?.type==='industrial_vessel'&&v.condition>=.8&&v.state.enabled&&v.state.materialId===gas&&v.state.ratedPressurePa>=5e6&&v.location?.bodyId===body.id&&bin?.kind.includes('gas'),'Real same-world rated '+gas+' vessel required');
   requireThat(!m.lots.some(l=>l.containerId===bin.id&&l.materialId!==gas),'Mixed propellant vessel');
   const stock=m.lots.filter(l=>l.containerId===bin.id),pressure=stock.reduce((n,l)=>n+l.massKg,0)/mw*R*293.15/bin.maxVolumeM3;
   requireThat(pressure<=v.state.ratedPressurePa+EPS,'Propellant vessel overpressure');
   workJ+=kg*1.02/mw*R*293.15*Math.max(0,Math.log(8e6)-Math.log(Math.max(Number.MIN_VALUE,pressure)));
   used.push(...take(m,bin.id,gas,kg*1.02));
  }
 }
 requireThat(a.shipEnergyJ>=workJ,'Battery lacks actual conditioning/compression work; use smaller conditioning batches');
 if(preparing){
  const tank=c||{schema:1,hydrogenKg:0,ventedKg:0,lastS:a.timeS,sourceLots:[],conditioningJ:0,hardwareLots:hardware};
  tank.hydrogenKg+=h;tank.ventedKg+=9*h*.02;tank.conditioningJ+=workJ;tank.sourceLots.push(...used);tank.lastS=a.timeS;
  stage.state.orbital8g=tank;stage.massKg=receipt.massKg+80+9*tank.hydrogenKg;
  m.operations.push({id:a.operationId,kind:'ORBITAL_PROPELLANT_CONDITIONING',status:'COMMITTED',stageId:stage.id,energyJ:workJ,massKg:9*h*1.02,conditionedKg:9*h,ventedKg:9*h*.02,consumedLots:used,hardwareLots:hardware});
  return{materials:m,physical:p,shipEnergyJ:a.shipEnergyJ-workJ};
 }
 const fuel=9*h,dryKg=receipt.massKg+(orbital?80:0),geoidRadiusM=body.radius*1000,height=a.surfaceHeightM??0;
 requireThat(Number.isFinite(height)&&Math.abs(height)<geoidRadiusM*.3,'Invalid actual launch terrain height');
 const radiusM=geoidRadiusM+height,g=body.gravity*9.80665,mu=g*geoidRadiusM**2,thrustN=orbital?40000:12000,ispS=orbital?350:180,massKg=dryKg+fuel;
 requireThat(thrustN/(massKg*(mu/radiusM**2))>=1.08,'Insufficient liftoff thrust on this world');
 const profile={massKg,payloadKg:0,busMassKg:0,payload:'sounding-test',stages:1,boosterPropKg:0,boosterDryKg:0,boosterIspS:280,boosterThrustN:0,
  stageParts:[{dryKg,propKg:fuel,thrustN,ispS,tanks:1,label:orbital?'Manufactured conditioned LOX/LH2 orbital stage':'Manufactured gas-fed H2/O2 sounding prototype'}],radiusM,mu,
  deltaVMS:ispS*9.80665*Math.log(massKg/dryKg),burnTimeS:fuel*ispS*9.80665/thrustN,
  model:orbital?'Manufactured 80 kg cryogenic pump/injector, cooling, tank insulation and guidance: modeled 40 kN / 350 s. H2/O2 densities 70.8/1141 kg/m³, paid staged conditioning and 20 W heat-leak boiloff. Not real hardware certification.':'Gas-fed sounding prototype: 8 MPa tank-volume bound, illustrative 12 kN / 180 s nameplate.'};
 if(orbital){profile.guidance='manufactured-orbit';profile.requiredDeltaVMS=Math.sqrt(mu/(radiusM+180000))+(mu/radiusM**2)*135+380;requireThat(profile.deltaVMS>=profile.requiredDeltaVMS,'Orbital delta-v budget insufficient on this world: condition more propellant or use a lower-gravity launch site');}
 const flight=root.StarfallRocketFlight7B.init(profile,{radiusM,mu,rho0:good(a.profile?.atmospherePressurePa)?a.profile.atmospherePressurePa*.02897/(R*293.15):(body.atmosphere?1.05:0),areaM2:1},{mode:orbital?'assisted':'manual',targetAltitudeM:a.profile?.atmospherePressurePa>0?180000:60000});
 const mission={id:a.operationId,bodyId:body.id,systemId:body.systemId,padId:pad.id,local:cp(stage.location.local),launchUp:cp(a.launchUp),startS:a.timeS,lastUpdateS:a.timeS,phase:'ascent',elapsedS:0,profile,flight,payload:'sounding-test',sourcePaid8g:true,
  sourceStage:{...cp(stage),massKg:dryKg},propulsion:orbital?'orbital':'sounding',propellantLots:orbital?cp(c.sourceLots):used,hotFireExhaustKg:orbital?0:fuel*.02,altitudeM:180000,trajectoryAltitudeM:0,velocityMS:0};
 store.launches.push(mission);p.assets=p.assets.filter(x=>x.id!==stage.id);p.transfers=p.transfers||[];
 p.transfers.push({id:a.operationId,assetId:stage.id,action:'LAUNCH',status:'COMMITTED',destinationOwner:'launch7:'+mission.id,massKg:dryKg+fuel});
 m.operations.push({id:a.operationId,kind:'MANUFACTURED_ROCKET_IGNITION',status:'COMMITTED',stageId:stage.id,massKg:orbital?0:fuel*1.02,energyJ:workJ,consumedLots:used,transferredConditionedKg:orbital?fuel:0});
 return{materials:m,physical:p,launchStore:store,shipEnergyJ:a.shipEnergyJ-workJ,mission};
}
function installLoop(a){
 const m=cp(a.materials),hab=cp(a.habitat),h=hab.habT09,physical=cp(a.physical);
 const shell=physical.assets.find(x=>x.id===hab.physicalAssetId);
 requireThat(shell?.type==='habitat_envelope'&&shell.location?.bodyId===hab.bodyId,'Original physical pressure shell required');
 requireThat(m.lots.some(l=>l.materialId==='habitat_recycler'&&a.factory?.receipts?.some(r=>r.status==='COMMITTED'&&r.recipeId==='habitat_recycler'&&l.provenance==='process:'+r.id)),'Recycler must have original factory manufacture evidence');
 requireThat(a.operationId?.startsWith('loop8i:')&&h?.greenhouse8i?.installed&&hab.physicalAssetId&&good(a.shipEnergyJ)&&a.shipEnergyJ>=8e5,'Real commissioned greenhouse and 800 kJ ship work required');
 requireThat(!h.regenerative8i&&!m.operations.some(o=>o.id===a.operationId),'Regenerative processor already installed');
 const consumed=[...take(m,a.containerId,'habitat_recycler',40)];
 h.greenhouse8i.regenerativeCollectorM2=24;
 h.regenerative8i={schema:1,hardwareKg:40,wasteWaterKg:0,brineKg:0,foodConsumedKg:0,metabolicWaterKg:0,
  recoveredWaterKg:0,nutrientsRecoveredKg:0,starvedMol:0,processingJ:0};
 m.operations.push({id:a.operationId,kind:'REGENERATIVE_HABITAT',status:'COMMITTED',habitatId:hab.id,massKg:40,energyJ:8e5,consumedLots:consumed});
 shell.massKg+=40;shell.state.regenerativeHardwareKg=(shell.state.regenerativeHardwareKg||0)+40;
 return{materials:m,physical,habitat:hab,shipEnergyJ:a.shipEnergyJ-8e5};
}
function crew(h,dt,powered){const c=h.regenerative8i,g=h.greenhouse8i;if(!c||!g)return false;
 requireThat(good(dt)&&dt<=86400&&['wasteWaterKg','brineKg','foodConsumedKg','metabolicWaterKg','recoveredWaterKg','nutrientsRecoveredKg','starvedMol','processingJ'].every(k=>good(c[k]))&&good(g.cropBiomassKg)&&good(g.nutrientKg),'Corrupt regenerative ledger');
 const organic=.03002728,nutrient=.0001,biomassPerMol=organic+nutrient;
 const demand=h.occupants*.0003*dt,mol=Math.min(demand,h.oxygenMol,Math.max(0,g.cropBiomassKg-.02)/biomassPerMol);
 const eaten=mol*biomassPerMol;g.cropBiomassKg-=eaten;h.oxygenMol-=mol;h.carbonMol+=mol;
 c.foodConsumedKg+=eaten;c.metabolicWaterKg+=mol*.01801528;c.wasteWaterKg+=mol*.01801528;
 c.nutrientsRecoveredKg+=mol*nutrient;g.nutrientKg+=mol*nutrient;c.starvedMol+=demand-mol;c.lastStarvedMol=demand-mol;
 const drink=Math.min(h.waterL,h.occupants*.00004*dt);h.waterL-=drink;c.wasteWaterKg+=drink;
 c.availableProcessingJ=0;
 if(powered&&h.enabled&&h.airlock==='CLOSED'){
  // A 120 W allocation INSIDE the existing 680 W bus, 25 kJ/kg work.
  let workAvailable=120*dt;
  const feed=Math.min(c.wasteWaterKg,workAvailable/25000,Math.max(0,2000-h.waterL)/.98),returned=feed*.98;
  c.wasteWaterKg-=feed;c.brineKg+=feed-returned;h.waterL+=returned;c.recoveredWaterKg+=returned;c.processingJ+=feed*25000;workAvailable-=feed*25000;
  // Idealized distillation of water-only reject. Minerals remain separate.
  const distilled=Math.min(c.brineKg,workAvailable/2600000,Math.max(0,2000-h.waterL));
  c.brineKg-=distilled;h.waterL+=distilled;c.recoveredWaterKg+=distilled;
  c.processingJ+=distilled*2600000;workAvailable-=distilled*2600000;
  c.availableProcessingJ=Math.max(0,workAvailable);
 }
 return true;
}
function capture(a){
 const m=cp(a.materials),world=root.StarfallAtmosphereEmission8J.normalize(a.world,a.profile),v=a.physical.assets.find(x=>x.id===a.vesselId);
 requireThat(a.operationId?.startsWith('capture8j:')&&good(a.kg)&&a.kg>0&&a.kg<=10&&good(a.shipEnergyJ)&&a.shipEnergyJ>=a.kg*2e6,'Capture requires <=10 kg and 2 MJ/kg ship separation/compression work');
 requireThat(!a.protectedWorld&&!a.nativeLife&&!a.archaeologicalProtection&&a.landable&&a.timeS>=world.lastTimeS,'Protected world or regressed clock');
 requireThat(!m.operations.some(o=>o.id===a.operationId)&&!world.receipts.some(r=>r.id===a.operationId),'Capture already committed');requireThat(world.receipts.length<2000,'Planetary operation archive full; export/archive receipts first');
 const collector=a.physical.assets.find(x=>x.id===a.collectorId);
 requireThat(collector?.type==='industrial_plant'&&collector.state?.station==='atmospheric_capture'&&collector.state.enabled&&collector.condition>=.8&&collector.massKg===740&&collector.location?.bodyId===a.profile.id&&a.physical.transfers?.some(t=>t.action==='INSTALL'&&t.status==='COMMITTED'&&t.assetId===collector.id&&t.massKg===740&&t.sourceLotId),'Actual manufactured atmospheric capture plant required');
 const gas=v?.state?.materialId,mw={oxygen:.031998,nitrogen:.028014,carbon_dioxide:.04401,carbon_monoxide:.02801,hydrogen:.002016,methane:.016043}[gas];
 requireThat(v?.type==='industrial_vessel'&&v.condition>=.8&&v.location?.bodyId===a.profile.id&&v.state.enabled&&mw&&v.state.ratedPressurePa>=5e6,'Actual same-world rated receiving vessel required');
 const baseline=a.sourceMode==='baseline';let available,sourceFraction;
 if(baseline){
  requireThat(a.body?.id===a.profile.id&&a.body?.kind&&root.StarfallCompositionCW01,'Canonical world composition required for baseline extraction');
  const mix=root.StarfallCompositionCW01.bodyFor(a.body,a.seed??742).atmosphereMoleFractions;
  const masses={H2:.002016,He:.004003,CH4:.016043,N2:.028014,O2:.031998,CO2:.04401,CO:.02801,H2O:.01801528,Ar:.03995,SO2:.064066},key={oxygen:'O2',nitrogen:'N2',carbon_dioxide:'CO2',carbon_monoxide:'CO',hydrogen:'H2',methane:'CH4'}[gas];
  const mean=Object.entries(mix).reduce((n,[k,v])=>n+v*masses[k],0);
  sourceFraction=mean>0?(mix[key]||0)*mw/mean:0;
  available=world.baselineAtmosphereKg*sourceFraction-(world.baselineCapturedSpeciesKg?.[gas]||0);
  requireThat(sourceFraction>0&&available>=a.kg,'Canonical baseline has no available '+gas+'; survey a compatible atmosphere');
  const last=world.receipts.filter(r=>r.collectorId===collector.id&&r.sourceMode==='baseline').at(-1)?.timeS??Math.max(0,a.timeS-60);
  const density=world.pressurePa*mean/(R*293.15),intake=400/3600*density*sourceFraction*Math.max(0,a.timeS-last);
  requireThat(a.kg<=intake+EPS,'Capture intake limited to 400 m³/hour: wait for sufficient atmospheric throughput');
 }else{
  available=(world.emittedSpeciesKg[gas]||0)-(world.capturedSpeciesKg?.[gas]||0)-(world.escapedSpeciesKg?.[gas]||0);
  requireThat(available+EPS>=a.kg,'No inventoried atmospheric '+gas+' available; select canonical baseline extraction if present');
 }
 const dilution=Math.log(baseline?1/sourceFraction:Math.max(1,world.atmosphereKg/Math.max(EPS,available))),
  pressureLift=Math.max(0,Math.log(5e6)-Math.log(Math.max(Number.MIN_VALUE,world.pressurePa))),
  workJ=a.kg*2e6+a.kg/mw*R*293.15*(dilution+pressureLift);
 requireThat(a.shipEnergyJ>=workJ,'Battery lacks separation/compression work at actual trace-gas dilution');
 const ledger=root.StarfallMaterials8A.create(m),bin=m.containers.find(x=>x.id===v.state.containerId&&x.ownerId===v.id);
 requireThat(bin&&bin.kind.includes('gas')&&!m.lots.some(l=>l.containerId===bin.id&&l.materialId!==gas),'Receiving vessel is missing or mixed');
 const mass=ledger.used(bin.id).massKg+a.kg,volume=a.kg/mw*R*293.15/5e6;
 requireThat(mass/mw*R*293.15/bin.maxVolumeM3<=v.state.ratedPressurePa+EPS,'Capture would overpressure vessel');
 ledger.importLot({id:a.operationId+':gas',materialId:gas,massKg:a.kg,volumeM3:volume,containerId:bin.id,grade:1,provenance:'atmospheric-capture:'+a.operationId});
 const materials=ledger.snapshot(),receipt={id:a.operationId,kind:'ATMOSPHERIC_CAPTURE',status:'COMMITTED',gas,massKg:a.kg,energyJ:workJ,energySourceId:'ship-main:engineering-battery',collectorId:collector.id,sourceAtmosphereKgBefore:world.atmosphereKg,sourceSpeciesKgBefore:available,sourceMode:baseline?'baseline':'recovery',timeS:a.timeS,compositionVersion:baseline?1:null,bodyId:a.profile.id};materials.operations.push(receipt);
 if(baseline){world.baselineCapturedSpeciesKg=world.baselineCapturedSpeciesKg||{};world.baselineCapturedSpeciesKg[gas]=(world.baselineCapturedSpeciesKg[gas]||0)+a.kg;}
 else{world.capturedSpeciesKg=world.capturedSpeciesKg||{};world.capturedSpeciesKg[gas]=(world.capturedSpeciesKg[gas]||0)+a.kg;world.netAddedKg=Math.max(0,world.netAddedKg-a.kg);}
 root.StarfallAtmosphereEmission8J.balance(world,a.profile);
 world.lastTimeS=a.timeS;world.receipts.push(receipt);
 return{materials,world,shipEnergyJ:a.shipEnergyJ-receipt.energyJ};
}
function climate(world,profile,flux,timeS,context){
 if(context?.body||world.climateInputs8j)return root.StarfallCoupledClimate8J.advance(world,profile,flux,timeS,context);
 requireThat(good(profile.albedo)&&profile.albedo<=1&&good(flux)&&flux<=1e30&&good(timeS),'Invalid stellar flux/clock');
 requireThat(good(world.netAddedKg)&&Object.values(world.emittedSpeciesKg||{}).every(good)&&Object.values(world.capturedSpeciesKg||{}).every(good),'Corrupt atmospheric species ledger');
 const s=world,area=4*Math.PI*profile.radiusM**2,c=s.climate8j||(s.climate8j={schema:1,lastS:timeS,anomalyK:0,storedHeatJ:0}),dt=timeS-c.lastS;
 requireThat(good(c.lastS)&&Number.isFinite(c.anomalyK)&&Number.isFinite(c.storedHeatJ),'Corrupt climate ledger');
 if(dt<=0)return c;requireThat(dt<=86400,'Climate must advance in bounded daily substeps');
 const albedo=Math.max(0,Math.min(.95,profile.albedo)),base=Math.max(3,Math.pow(flux*(1-albedo)/(4*SIGMA),.25));
 const co2=Math.max(0,(s.emittedSpeciesKg.carbon_dioxide||0)-(s.capturedSpeciesKg?.carbon_dioxide||0));
 const tau=.01*co2/area,targetAnomaly=base*Math.expm1(.25*Math.log1p(.75*tau)),capacity=4e8;
 const k=4*SIGMA*Math.pow(Math.max(3,base+c.anomalyK),3)/capacity;
 const previous=c.anomalyK;c.anomalyK=previous+(targetAnomaly-previous)*(-Math.expm1(-k*dt));
 c.storedHeatJ+=capacity*area*(c.anomalyK-previous);c.lastS=timeS;c.surfaceK=base+c.anomalyK;c.infraredOpticalDepth=tau;
 c.hazeOpacity=-Math.expm1(-1e-5*Math.max(0,s.netAddedKg)/area);c.model='Illustrative grey CO2 opacity 0.01 m²/kg, 4e8 J/m²/K heat capacity, stellar/albedo greybody equilibrium; not a validated planetary climate forecast';return c;
}
root.StarfallIndustryCompletion8K=Object.freeze({launch,ageTanks,installLoop,crew,capture,climate});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallIndustryCompletion8K;
})(typeof globalThis!=='undefined'?globalThis:this);
