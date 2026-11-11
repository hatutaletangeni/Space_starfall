const M=require('../../src/physics/material-ledger8a.js'),A=require('../../src/physics/assembly8g.js');
function rocket(){const ledger=M.create(),assets=[];
 for(const [id,kg,mw]of [['hydrogen',3,.002016],['oxygen',30,.031998]]){
  ledger.registerContainer({id:'tank:'+id,ownerId:id,kind:'gas vessel',maxMassKg:1000,maxVolumeM3:4});
  ledger.importLot({id:'source:'+id,materialId:id,massKg:kg,volumeM3:kg/mw*8.314462618*293.15/5e6,grade:1,containerId:'tank:'+id,provenance:'chemical:electrolysis:1'});
  assets.push({id,type:'industrial_vessel',condition:1,massKg:195,volumeM3:4,location:{kind:'surface',bodyId:'a',local:[0,1,0]},state:{materialId:id,containerId:'tank:'+id,ratedPressurePa:8e6,enabled:true}});
 }
 const parts=Object.entries(A.DEFINITIONS.rocket_stage.parts).map(([materialId,massKg])=>({materialId,massKg,lotId:'produced:'+materialId})),massKg=parts.reduce((s,l)=>s+l.massKg,0);
 assets.push({id:'rig',type:'industrial_plant',massKg:900,condition:1,location:{kind:'surface',bodyId:'a',local:[0,1,0]},state:{station:'rocket_integration'}},
  {id:'stage',type:'rocket_stage_dry',provenance:'structural-8g:stage',massKg,volumeM3:3,condition:1,location:{kind:'surface',bodyId:'a',local:[0,1,0]},state:{assemblyFacilityId:'rig'}});
 return{operationId:'rocket8g:1',materials:ledger.snapshot(),physical:{schema:1,assets,transfers:[]},shipEnergyJ:50e6,timeS:1,body:{id:'a',systemId:'s',landable:true,radius:1000,gravity:.04,atmosphere:null},launchUp:[0,1,0],stageId:'stage',hydrogenVesselId:'hydrogen',oxygenVesselId:'oxygen',hydrogenKg:2,assembly:{schema:1,receipts:[{assetId:'stage',blueprintId:'rocket_stage',status:'ASSEMBLED_NOT_OPERATIONAL',massKg,consumedLots:parts}]},launchStore:{schema:1,seed:742,serial:0,launches:[],satellites:[],rovers:[]}};
}
module.exports={rocket};
