(mode)=>{
    const r=StarfallRuntime,s=SF.load(),b=r.galaxy.byId.get(mode==='orbital'?'star-0-p3-m2':'star-0-p1');r.galaxy.update(0);
    const physical=r.physical8a.serialize(),m=StarfallMaterials8A.create(r.materials8a.snapshot()),
     local=[Math.sin(45/b.radius),Math.cos(45/b.radius),0],loc={kind:'surface',bodyId:b.id,local},
     parts=Object.entries(StarfallAssembly8G.DEFINITIONS.rocket_stage.parts).map(([materialId,massKg])=>({materialId,massKg,lotId:'protocol-part:'+materialId})),
     mass=parts.reduce((s,p)=>s+p.massKg,0);
    physical.assets.push({id:'protocol-rig',type:'industrial_plant',condition:1,massKg:900,volumeM3:2.9,location:loc,state:{station:'rocket_integration'}},
     {id:'protocol-stage',type:'rocket_stage_dry',condition:1,massKg:mass,volumeM3:3,location:loc,provenance:'structural-8g:protocol-stage',state:{assemblyFacilityId:'protocol-rig'}},
     {id:'protocol-collector',type:'industrial_plant',massKg:740,volumeM3:2.4,condition:1,location:loc,state:{station:'atmospheric_capture',enabled:true}},
     {id:'protocol-shell',type:'habitat_envelope',condition:1,massKg:985.4,volumeM3:25,location:loc,state:{}});
    physical.transfers.push({id:'plant8e:protocol-capture-install',assetId:'protocol-collector',action:'INSTALL',status:'COMMITTED',massKg:740,sourceLotId:'protocol-capture-kit'});
    for(const [gas,kg,mw]of [['hydrogen',5,.002016],['oxygen',50,.031998]]){
     const id='protocol-'+gas,cid=id+':gas';m.registerContainer({id:cid,ownerId:id,kind:'rated gas vessel',maxMassKg:1000,maxVolumeM3:4});
     m.importLot({id:id+':source',materialId:gas,massKg:kg,volumeM3:kg/mw*8.314462618*293.15/5e6,grade:1,containerId:cid,provenance:'chemical:protocol-electrolysis'});
     physical.assets.push({id,type:'industrial_vessel',massKg:195,volumeM3:4,condition:1,location:loc,state:{enabled:true,materialId:gas,containerId:cid,ratedPressurePa:8e6}});
    }
    m.registerContainer({id:'protocol-nitrogen:gas',ownerId:'protocol-nitrogen',kind:'rated gas vessel',maxMassKg:1000,maxVolumeM3:4});physical.assets.push({id:'protocol-nitrogen',type:'industrial_vessel',massKg:195,volumeM3:4,condition:1,location:loc,state:{enabled:true,materialId:'nitrogen',containerId:'protocol-nitrogen:gas',ratedPressurePa:8e6}});
    m.importLot({id:'protocol-recycler',materialId:'habitat_recycler',massKg:40,volumeM3:.1,grade:1,containerId:StarfallMining8D.SHIP,provenance:'process:protocol-factory'});
    const factory=r.factory8f.snapshot();factory.receipts.push({id:'protocol-factory',recipeId:'habitat_recycler',status:'COMMITTED'});
    const out=StarfallOutpostUI.store.serialize(),h=StarfallHabitatT09.defaults(0);
    Object.assign(h,{enabled:true,occupants:1,greenhouse8i:{schema:1,installed:true,cropBiomassKg:.2,nutrientKg:.2,carbonConsumedMol:0,waterConsumedKg:0,oxygenProducedMol:0}});
    out.items.push({id:'protocol-hab',kind:'hab',bodyId:b.id,local,physicalAssetId:'protocol-shell',condition:1,enabled:true,habT09:h});
    let materialSnapshot=m.snapshot();
    if(mode==='orbital'){
     const stock=StarfallMaterials8A.create(materialSnapshot);stock.importLot({id:'protocol-orbital-kit',materialId:'orbital_propulsion_kit',massKg:80,volumeM3:.1,grade:1,containerId:StarfallMining8D.SHIP,provenance:'process:protocol-orbital-factory'});materialSnapshot=stock.snapshot();factory.receipts.push({id:'protocol-orbital-factory',recipeId:'orbital_propulsion_kit',status:'COMMITTED'});
     for(let n=0;n<12;n++){
      for(const l of materialSnapshot.lots){const mw=l.materialId==='hydrogen'?.002016:l.materialId==='oxygen'?.031998:0;if(!mw)continue;l.massKg=l.materialId==='hydrogen'?5:50;l.volumeM3=l.massKg/mw*8.314462618*293.15/5e6;}
      const q=StarfallIndustryCompletion8K.launch({operationId:'condition8g:protocol:'+n,prepareOnly:true,hydrogenKg:2,materials:materialSnapshot,physical,body:b,launchStore:{launches:[]},assembly:{receipts:[{assetId:'protocol-stage',blueprintId:'rocket_stage',status:'ASSEMBLED_NOT_OPERATIONAL',massKg:mass,consumedLots:parts}]},factory,partsContainerId:StarfallMining8D.SHIP,shipEnergyJ:180e6,timeS:0,launchUp:[0,1,0],stageId:'protocol-stage',hydrogenVesselId:'protocol-hydrogen',oxygenVesselId:'protocol-oxygen'});
      materialSnapshot=q.materials;physical.assets=q.physical.assets;physical.transfers=q.physical.transfers;
     }
    }
    const vehicles=r.vehicleStore.serialize();vehicles.states.ship.powerEnabled=true;
    const dir=Starfall3D.V.rot([0,1,0],b.spinAxis||[0,1,0],b.spinAngle||0);
    SF.save({materials8a:materialSnapshot,physical8a:physical,factory8f:factory,outpost5:out,engineeringVehicles:vehicles,
     vehicleAssembly8g:{schema:1,receipts:[{id:'protocol-stage',assetId:'protocol-stage',blueprintId:'rocket_stage',bodyId:b.id,status:'ASSEMBLED_NOT_OPERATIONAL',massKg:mass,consumedLots:parts}]},
     flightGalaxy:{...s.flightGalaxy,seed:742,time:0,position:b.position.map((x,i)=>x+dir[i]*(b.radius+8)),target:b.id,attached:b.id,groundDirection:dir,up:dir,forward:[1,0,0],landed:true}});
    window.__STARFALL_IMPORT_PENDING=true;
   }
