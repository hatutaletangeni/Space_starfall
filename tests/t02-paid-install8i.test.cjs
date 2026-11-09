const assert=require('node:assert/strict');
const {test}=require('node:test');
const {install}=require('../src/physics/t02-paid-install8i.js');
function fixture(kind='solar'){
 const part=kind==='solar'?'solar_module':'battery_cell',mass=kind==='solar'?830:1950;
 return{operationId:'install:1',assetId:'module:1',bodyId:'world:1',kind,
  local:[0,1,0],containerId:'depot:1',installEnergyJ:900000,installSeconds:900,
  outpost:{schema:1,seed:742,items:[]},
  materials:{schema:1,lots:[{id:'lot:1',materialId:part,massKg:mass,bodyId:'world:1',
   containerId:'depot:1',provenance:'job:1'}],operations:[]},
  manufacturing:{schema:1,jobs:[{id:'job:1',recipeId:part,status:'COMMITTED'}]},
  lotIds:['lot:1']};
}
test('TEST_FIXTURE paid solar consumes parts and creates uncharged native T02 device',()=>{
 const a=fixture(),result=install(a);
 assert.equal(result.outpost.items[0].kind,'solar');
 assert.equal(result.outpost.items[0].energyJ,0);
 assert.equal(result.materials.lots.length,0);
 assert.equal(a.materials.lots.length,1);
 assert.equal(install({...a,outpost:result.outpost,materials:result.materials}).duplicate,true);
});
test('TEST_FIXTURE paid battery never grants starter charge',()=>{
 const result=install(fixture('battery'));
 assert.equal(result.outpost.items[0].energyJ,0);
 assert.equal(result.receipt.initialChargeJ,0);
});
test('reject missing, wrong-world, forged and insufficient parts',()=>{
 for(const edit of [
 a=>{a.lotIds=[]},
 a=>{a.materials.lots[0].bodyId='other'},
 a=>{a.materials.lots[0].massKg=1},
 a=>{a.manufacturing.jobs=[]},
 a=>{a.installEnergyJ=0},
 a=>{a.materials.lots[0].provenance='fake'}
 ]){const a=fixture();edit(a);assert.throws(()=>install(a));}
});
test('reject reused physical asset or operation',()=>{
 const a=fixture();a.outpost.items=[{id:'other',physicalAssetId:'module:1'}];
 assert.throws(()=>install(a));
});
