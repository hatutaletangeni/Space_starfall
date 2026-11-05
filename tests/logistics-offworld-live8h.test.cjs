'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const flight=read('src/flight.js'),ui=read('src/physics/logistics-offworld-ui8h.js');
const html=read('index.html');
test('8H original offworld manifest loads before real flight, with Engineer controls loaded after',()=>{
 const contract='src/physics/logistics-offworld-manifest8h.js';
 const panel='src/physics/logistics-offworld-ui8h.js';
 assert.ok(html.includes(contract)&&html.includes(panel));
 assert.ok(html.indexOf(contract)<html.indexOf('src/flight.js'));
 assert.ok(html.indexOf(panel)>html.indexOf('src/flight.js'));
 assert.ok(html.indexOf(panel)<html.indexOf('</body>'));
});
test('8H manifest saves and restores the original physical ship ledger without creating a separate cargo source',()=>{
 assert.match(flight,/StarfallOffworldManifest8H\.create\(session\.logisticsOffworldManifests8h\)/);
 assert.match(flight,/logisticsOffworldManifests8h:offworldManifests8h\.snapshot\(\)/);
 assert.match(flight,/StarfallOffworldManifest8H\.HOLD/);
 assert.match(flight,/StarfallOffworldManifest8H\.create\(saved\.logisticsOffworldManifests8h\)/);
 assert.match(flight,/SF\.save\(patch\)/);
 assert.match(flight,/SF\.storageStatus\(\)\.durable!==true/);
 assert.match(flight,/JSON\.stringify\(read\[k\]\)!==JSON\.stringify\(v\)/);
 assert.match(flight,/vehicleStore\.update\('ship'/);
 assert.doesNotMatch(flight,/logisticsOffworldApply8H[\s\S]*?function shipHoldFor8H[\s\S]*?(?:pos\s*=\s*V\.add|warp\s*=true)/);
});
test('8H Engineer panel exposes physical milestones but no remote transfer/ship travel button',()=>{
 for(const name of ['logisticsOffworldRegister8H','logisticsOffworldDepart8H',
  'logisticsOffworldArrive8H','logisticsOffworldDeliver8H','logisticsOffworldCancel8H']){
   assert.ok(flight.includes(name),name);
   assert.ok(ui.includes(name),name);
 }
 assert.match(ui,/shipHold/);
 assert.match(ui,/onFoot/);
 assert.match(ui,/nearShip/);
 assert.match(ui,/same-system offworld depot/);
 assert.doesNotMatch(ui,/teleportCargo\(|setShipPosition\(|autoFlyTo\(/);
});
