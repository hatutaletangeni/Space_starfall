/* Fresh-game certified electrical material bootstrap; no test-only stock
 * creation, no active installations, no imported full solar or battery packs.
 * High purity electrodes and PV films are FINITE prelaunch stock, never made
 * from raw rock by a basic furnace. All machine kits remain uninstalled.
 */
'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const M=require('../src/physics/material-ledger8a.js'),
 S=require('../src/physics/starter-manifest8k.js'),
 K=require('../src/physics/machine-install8f.js');
require('../src/physics/kit-recipes8f.js');
const Stock=require('../src/physics/stock-parts8f.js');
const F=require('../src/physics/manufacturing8f.js');
function fresh(){
 return{schema:1,seed:742,startedAt:1762510000000};
}
function empty(){
 return M.create({schema:1,containers:[{id:'8d:ship-main:materials',
  ownerId:'ship-main',kind:'ship',maxMassKg:9000,maxVolumeM3:16}],
  lots:[],operations:[]}).snapshot();
}
function mk(){
 const old=empty(),result=S.prepare(old,fresh(),null,'8d:ship-main:materials');
 return{old,result,s:Object.fromEntries(result.materials.lots.map(x=>[x.materialId,x.massKg]))};
}
test('all three real 8F machines exist ONLY as finite, sealed, uninstalled original 8A kit lots',()=>{
 const {result}=mk();
 assert.equal(result.applied,true);
 assert.ok(result.receipt.status==='COMMITTED');
 for(const key of ['machine_kit_laminator','machine_kit_battery','machine_kit_extruder']){
  const item=result.materials.lots.find(x=>x.materialId===key);
  const spec=K.CAPS[key];
  assert.ok(spec,key+' actual machine installer absent');
  assert.equal(item.massKg,spec.massKg);
  assert.equal(item.volumeM3,spec.volumeM3);
  assert.equal(item.provenance.startsWith('preexisting_ship_manifest8k:'),true);
 }
 assert.ok(S.SUM.massKg<9000 && S.SUM.volumeM3<16);
 assert.equal(result.materials.lots.length,S.SUM.uniqueLots);
 assert.equal(M.create(result.materials).used('8d:ship-main:materials').massKg,S.SUM.massKg);
 assert.ok(!result.materials.lots.some(x=>x.materialId==='solar_module'||x.materialId==='battery_cell'),
  'starter may not conjure finished 8F solar modules or charged battery cells');
});
test('exact finite starter input budgets support only two 8F PV module BOMs and one 8-cell pack',()=>{
 const{result,s}=mk();
 const stock={...s},take=(material,kg)=>{
  assert.ok(stock[material]!=null,material+' missing');
  assert.ok(stock[material]+1e-8>=kg,material+' short '+kg+' / '+stock[material]);
  stock[material]=Math.max(0,stock[material]-kg);
 };
 const cell=Stock.RECIPES.cell_casing;
 assert.equal(cell.station,'bench');
 assert.equal(cell.tool,'hand-shear');
 assert.equal(Object.values(cell.inputs).reduce((a,b)=>a+b),.34);
 assert.equal(Object.values(cell.outputs).reduce((a,b)=>a+b),.30);
 for(let i=0;i<8;i++)take('aluminum',cell.inputs.aluminum);
 const frame=Stock.RECIPES.aluminum_frame;
 for(let i=0;i<2;i++)take('aluminum',frame.inputs.aluminum);
 const bare=F.RECIPES.copper_wire;
 take('copper',bare.inputs.copper);
 const coated=F.RECIPES.insulated_wire;
 take('insulation_polymer',coated.inputs.insulation_polymer);
 // 8F copper wire yields 1.96 kg bare_wire, then 8F extruder consumes 1.
 assert.ok(bare.outputs.bare_wire>=coated.inputs.bare_wire);
 assert.ok(coated.outputs.insulated_wire>=1);
 const solar=F.RECIPES.solar_module,solarNeeds={...solar.inputs};
 for(const [material,mass] of Object.entries(solarNeeds)){
  if(material==='aluminum_frame'){assert.equal(mass,2);continue;}
  if(material==='insulated_wire'){assert.equal(mass,.5);continue;}
  take(material,2*mass);
 }
 assert.equal(stock.pv_cells,0,'no unlimited semiconductor supply');
 assert.equal(stock.encapsulant,0,'no free replenishing PV film');
 const battery=F.RECIPES.battery_cell;
 for(const [material,kg] of Object.entries(battery.inputs)){
  if(material==='cell_casing'){assert.equal(kg,.3);continue;}
  take(material,8*kg);
 }
 assert.equal(stock.electrode_active,0,'certified battery chemistry remains finite');
 assert.ok(stock.aluminum>=0);
 assert.equal(F.RECIPES.battery_cell.outputs.battery_cell*8,15.6);
 assert.equal(F.RECIPES.solar_module.outputs.solar_module*2,17.6);
 assert.throws(()=>take('encapsulant',.6),/short/);
 assert.throws(()=>take('electrode_active',1.2),/short/);
 assert.equal(result.materials.containers[0].maxVolumeM3,16);
});
test('preflight cannot duplicate or credit old saves, planets or second use',()=>{
 const {old,result}=mk();
 assert.equal(result.receipt.massKg,S.SUM.massKg);
 assert.equal(result.receipt.volumeM3,S.SUM.volumeM3);
 const again=S.prepare(result.materials,fresh(),result.receipt,'8d:ship-main:materials');
 assert.equal(again.applied,false);
 assert.deepEqual(again.materials,result.materials);
 assert.deepEqual(old,empty());
 assert.throws(()=>S.prepare(result.materials,fresh(),null,'8d:ship-main:materials'),/refuses/);
 const legacy=S.prepare(result.materials,null,null,'8d:ship-main:materials');
 assert.equal(legacy.applied,false);
 assert.deepEqual(legacy.materials,result.materials);
});
