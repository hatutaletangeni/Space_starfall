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
function launch(a){
 const m=cp(a.materials),p=cp(a.physical),store=cp(a.launchStore),body=a.body;
 requireThat(a.operationId?.startsWith('rocket8g:')&&good(a.timeS)&&good(a.shipEnergyJ)&&a.shipEnergyJ>=3e6,'Rocket ignition needs unique ID, clock and 3 MJ ship work');
 requireThat(!m.operations.some(o=>o.id===a.operationId)&&!store.launches.some(o=>o.id===a.operationId),'Rocket already committed');
 requireThat(body?.landable&&good(body.radius)&&body.radius>0&&good(body.gravity)&&body.gravity>0&&store.launches.length<240&&Array.isArray(a.launchUp)&&a.launchUp.length===3&&a.launchUp.every(Number.isFinite)&&Math.abs(Math.hypot(...a.launchUp)-1)<1e-4,'Valid solid world, radial launch axis and free launch archive slot required');
 const stage=p.assets.find(x=>x.id===a.stageId),receipt=a.assembly?.receipts?.find(x=>x.assetId===a.stageId&&x.blueprintId==='rocket_stage'),bill=root.StarfallAssembly8G.DEFINITIONS.rocket_stage.parts;
 requireThat(stage?.type==='rocket_stage_dry'&&stage.condition>=.95&&stage.location?.bodyId===body.id&&stage.provenance==='structural-8g:'+stage.id&&receipt?.status==='ASSEMBLED_NOT_OPERATIONAL'&&Math.abs(stage.massKg-receipt.massKg)<EPS,'An intact, genuinely manufactured dry rocket stage is required');
 for(const [id,kg]of Object.entries(bill))requireThat(Math.abs(receipt.consumedLots.filter(l=>l.materialId===id).reduce((s,l)=>s+l.massKg,0)-kg)<EPS,'Rocket missing manufactured '+id);
 const pad=p.assets.find(x=>x.id===stage.state.assemblyFacilityId);
 requireThat(pad?.state?.station==='rocket_integration'&&pad.location?.bodyId===body.id&&pad.condition>=.8,'Original installed rocket integration rig required');
 const h=a.hydrogenKg;requireThat(good(h)&&h>=.1&&h<=8,'Hydrogen load must be 0.1–8 kg');
 const fuel=9*h,hotFire=.02,temperatureK=293.15,pressurePa=8e6;
 const volume=(h/.002016+8*h/.031998)*R*temperatureK/pressurePa;
 requireThat(volume<=stage.volumeM3,'Compressed propellant exceeds manufactured tank volume');
 const vessels=[['hydrogen',a.hydrogenVesselId,h],['oxygen',a.oxygenVesselId,8*h]],used=[];
 for(const [gas,id,kg]of vessels){const v=p.assets.find(x=>x.id===id),bin=m.containers.find(c=>c.id===v?.state?.containerId&&c.ownerId===id);
  requireThat(v?.type==='industrial_vessel'&&v.condition>=.8&&v.state.enabled&&v.state.materialId===gas&&v.state.ratedPressurePa>=5e6&&v.location?.bodyId===body.id&&bin?.kind.includes('gas'),'Real same-world rated '+gas+' vessel required');
  requireThat(!m.lots.some(l=>l.containerId===bin.id&&l.materialId!==gas),'Mixed propellant vessel');
  const stock=m.lots.filter(l=>l.containerId===bin.id),kgStored=stock.reduce((s,l)=>s+l.massKg,0);
  const mw=gas==='hydrogen'?.002016:.031998;
  requireThat(kgStored/mw*R*temperatureK/bin.maxVolumeM3<=v.state.ratedPressurePa+EPS,'Propellant vessel overpressure');
  used.push(...take(m,bin.id,gas,kg*(1+hotFire)));
 }
 const radiusM=body.radius*1000,g=body.gravity*9.80665,mu=g*radiusM**2,thrustN=12000,ispS=180,massKg=stage.massKg+fuel;
 requireThat(thrustN/(massKg*g)>=1.08,'Prototype has insufficient liftoff thrust on this world');
 const profile={massKg,payloadKg:0,busMassKg:0,payload:'sounding-test',stages:1,boosterPropKg:0,boosterDryKg:0,boosterIspS:280,boosterThrustN:0,
  stageParts:[{dryKg:stage.massKg,propKg:fuel,thrustN,ispS,tanks:1,label:'Manufactured gas-fed H2/O2 sounding prototype'}],
  radiusM,mu,deltaVMS:ispS*9.80665*Math.log(massKg/stage.massKg),burnTimeS:fuel*ispS*9.80665/thrustN,
  model:'Gas-fed sounding prototype: 8 MPa tank-volume bound, illustrative 12 kN / 180 s nameplate. No cryogenic storage, orbital guarantee or real-world qualification.'};
 const flight=root.StarfallRocketFlight7B.init(profile,{radiusM,mu,rho0:good(a.profile?.atmospherePressurePa)?a.profile.atmospherePressurePa*.02897/(R*293.15):(body.atmosphere?1.05:0),areaM2:1},{mode:'manual'});
 const mission={id:a.operationId,bodyId:body.id,systemId:body.systemId,padId:pad.id,local:cp(stage.location.local),launchUp:cp(a.launchUp),
  startS:a.timeS,lastUpdateS:a.timeS,phase:'ascent',elapsedS:0,profile,flight,payload:'sounding-test',sourcePaid8g:true,
  sourceStage:cp(stage),propellantLots:used,hotFireExhaustKg:fuel*hotFire,altitudeM:50000,trajectoryAltitudeM:0,velocityMS:0};
 store.launches.push(mission);p.assets=p.assets.filter(x=>x.id!==stage.id);
 p.transfers=p.transfers||[];p.transfers.push({id:a.operationId,assetId:stage.id,action:'LAUNCH',status:'COMMITTED',destinationOwner:'launch7:'+mission.id,massKg:stage.massKg});
 m.operations.push({id:a.operationId,kind:'MANUFACTURED_ROCKET_IGNITION',status:'COMMITTED',stageId:stage.id,massKg:fuel*(1+hotFire),energyJ:3e6,consumedLots:used});
 return{materials:m,physical:p,launchStore:store,shipEnergyJ:a.shipEnergyJ-3e6,mission};
}
function installLoop(a){
 const m=cp(a.materials),hab=cp(a.habitat),h=hab.habT09,physical=cp(a.physical);
 const shell=physical.assets.find(x=>x.id===hab.physicalAssetId);
 requireThat(shell?.type==='habitat_envelope'&&shell.location?.bodyId===hab.bodyId,'Original physical pressure shell required');
 requireThat(m.lots.some(l=>l.materialId==='habitat_recycler'&&a.factory?.receipts?.some(r=>r.status==='COMMITTED'&&r.recipeId==='habitat_recycler'&&l.provenance==='process:'+r.id)),'Recycler must have original factory manufacture evidence');
 requireThat(a.operationId?.startsWith('loop8i:')&&h?.greenhouse8i?.installed&&hab.physicalAssetId&&good(a.shipEnergyJ)&&a.shipEnergyJ>=8e5,'Real commissioned greenhouse and 800 kJ ship work required');
 requireThat(!h.regenerative8i&&!m.operations.some(o=>o.id===a.operationId),'Regenerative processor already installed');
 const consumed=[...take(m,a.containerId,'habitat_recycler',40)];
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
 if(powered&&h.enabled&&h.airlock==='CLOSED'){
  // A 120 W allocation INSIDE the existing 680 W bus, 25 kJ/kg work.
  const feed=Math.min(c.wasteWaterKg,120*dt/25000),returned=feed*.98;
  c.wasteWaterKg-=feed;c.brineKg+=feed-returned;h.waterL+=returned;c.recoveredWaterKg+=returned;c.processingJ+=feed*25000;
 }
 return true;
}
function capture(a){
 const m=cp(a.materials),world=root.StarfallAtmosphereEmission8J.normalize(a.world,a.profile),v=a.physical.assets.find(x=>x.id===a.vesselId);
 requireThat(a.operationId?.startsWith('capture8j:')&&good(a.kg)&&a.kg>0&&a.kg<=10&&good(a.shipEnergyJ)&&a.shipEnergyJ>=a.kg*2e6,'Capture requires <=10 kg and 2 MJ/kg ship separation/compression work');
 requireThat(!a.protectedWorld&&!a.nativeLife&&!a.archaeologicalProtection&&a.landable&&a.timeS>=world.lastTimeS,'Protected world or regressed clock');
 requireThat(!m.operations.some(o=>o.id===a.operationId)&&!world.receipts.some(r=>r.id===a.operationId),'Capture already committed');
 const collector=a.physical.assets.find(x=>x.id===a.collectorId);
 requireThat(collector?.type==='industrial_plant'&&collector.state?.station==='atmospheric_capture'&&collector.state.enabled&&collector.condition>=.8&&collector.massKg===740&&collector.location?.bodyId===a.profile.id&&a.physical.transfers?.some(t=>t.action==='INSTALL'&&t.status==='COMMITTED'&&t.assetId===collector.id&&t.massKg===740&&t.sourceLotId),'Actual manufactured atmospheric capture plant required');
 const gas=v?.state?.materialId,mw={oxygen:.031998,nitrogen:.028014,carbon_dioxide:.04401,carbon_monoxide:.02801,hydrogen:.002016,methane:.016043}[gas];
 requireThat(v?.type==='industrial_vessel'&&v.condition>=.8&&v.location?.bodyId===a.profile.id&&v.state.enabled&&mw&&v.state.ratedPressurePa>=5e6,'Actual same-world rated receiving vessel required');
 const available=(world.emittedSpeciesKg[gas]||0)-(world.capturedSpeciesKg?.[gas]||0);
 requireThat(available+EPS>=a.kg,'No inventoried atmospheric '+gas+' available; unmeasured baseline species cannot be invented');
 const workJ=a.kg*2e6+a.kg/mw*R*293.15*Math.log(Math.max(1,(world.baselineAtmosphereKg+world.netAddedKg)/Math.max(EPS,available)));
 requireThat(a.shipEnergyJ>=workJ,'Battery lacks separation/compression work at actual trace-gas dilution');
 const ledger=root.StarfallMaterials8A.create(m),bin=m.containers.find(x=>x.id===v.state.containerId&&x.ownerId===v.id);
 requireThat(bin&&bin.kind.includes('gas')&&!m.lots.some(l=>l.containerId===bin.id&&l.materialId!==gas),'Receiving vessel is missing or mixed');
 const mass=ledger.used(bin.id).massKg+a.kg,volume=a.kg/mw*R*293.15/5e6;
 requireThat(mass/mw*R*293.15/bin.maxVolumeM3<=v.state.ratedPressurePa+EPS,'Capture would overpressure vessel');
 ledger.importLot({id:a.operationId+':gas',materialId:gas,massKg:a.kg,volumeM3:volume,containerId:bin.id,grade:1,provenance:'atmospheric-capture:'+a.operationId});
 const materials=ledger.snapshot(),receipt={id:a.operationId,kind:'ATMOSPHERIC_CAPTURE',status:'COMMITTED',gas,massKg:a.kg,energyJ:workJ,energySourceId:'ship-main:engineering-battery',collectorId:collector.id,sourceAtmosphereKgBefore:world.atmosphereKg,sourceSpeciesKgBefore:available,bodyId:a.profile.id};materials.operations.push(receipt);
 world.capturedSpeciesKg=world.capturedSpeciesKg||{};world.capturedSpeciesKg[gas]=(world.capturedSpeciesKg[gas]||0)+a.kg;
 world.netAddedKg=Math.max(0,world.netAddedKg-a.kg);world.atmosphereKg=world.baselineAtmosphereKg+world.netAddedKg;
 world.pressureDeltaPa=world.netAddedKg*a.profile.surfaceGravityMS2/(4*Math.PI*a.profile.radiusM**2);world.pressurePa=a.profile.atmospherePressurePa+world.pressureDeltaPa;
 world.lastTimeS=a.timeS;world.receipts.push(receipt);
 return{materials,world,shipEnergyJ:a.shipEnergyJ-receipt.energyJ};
}
function climate(world,profile,flux,timeS){
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
root.StarfallIndustryCompletion8K=Object.freeze({launch,installLoop,crew,capture,climate});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallIndustryCompletion8K;
})(typeof globalThis!=='undefined'?globalThis:this);
