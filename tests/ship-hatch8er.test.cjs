'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const hatch=require('../src/physics/ship-hatch8er.js');
const yesEntry={landed:true,eva:true,truckOccupied:false,swimming:false,rampTransition:null,nearShip:true,walkedSinceExit:4,hatchCooldown:0,atEntrance:true};
assert.equal(hatch.requestEntry(yesEntry).ok,true);
for(const invalid of [{truckOccupied:true},{nearShip:false},{atEntrance:false},{hatchCooldown:1},{walkedSinceExit:2},{rampTransition:{kind:'out'}},{swimming:true},{landed:false},{eva:false}])
 assert.equal(hatch.requestEntry({...yesEntry,...invalid}).ok,false,JSON.stringify(invalid));
const yesBoard={landed:true,eva:true,truckOccupied:false,shipBodyPresent:true,nearShip:true,transitionKind:'in'};
assert.equal(hatch.boardComplete(yesBoard).ok,true);
for(const invalid of [{transitionKind:null},{transitionKind:'out'},{nearShip:false},{shipBodyPresent:false},{truckOccupied:true},{landed:false}])
 assert.equal(hatch.boardComplete({...yesBoard,...invalid}).ok,false,JSON.stringify(invalid));
const yesExit={landed:true,at:{x:0,z:30,heading:0},move:-1,truckOccupied:false,rampTransition:null,shipWalking:true};
assert.equal(hatch.requestExit(yesExit).ok,true);
for(const invalid of [{landed:false},{move:1},{truckOccupied:true},{at:{x:10,z:30}},{at:{x:0,z:10}},{shipWalking:false},{rampTransition:{kind:'in'}}])
 assert.equal(hatch.requestExit({...yesExit,...invalid}).ok,false,JSON.stringify(invalid));
assert.equal(hatch.canPilot({landed:true,shipWalking:true,room:'bridge',truckOccupied:false,rampTransition:null}),true);
assert.equal(hatch.canPilot({landed:true,shipWalking:true,room:'cargo',truckOccupied:false,rampTransition:null}),false);
const flight=fs.readFileSync('src/flight.js','utf8');
new vm.Script(flight,{filename:'src/flight.js'});
assert.match(flight,/StarfallShipHatch8ER\.requestEntry/);
assert.match(flight,/StarfallShipHatch8ER\.requestExit/);
assert.match(flight,/StarfallShipHatch8ER\.boardComplete/);
assert.match(flight,/boardShip\('in'\)/);
assert.doesNotMatch(flight,/if\(shipIdleElapsed>\.52&&hatchCooldown<=0\)\{exitShip\(/);
assert.doesNotMatch(flight,/\{boardShip\(\);saveFlight\(\);\}/);
const index=fs.readFileSync('index.html','utf8');
assert.ok(index.indexOf('ship-hatch8er.js')>index.indexOf('ship-walk8e.js'));
assert.ok(index.indexOf('ship-hatch8er.js')<index.indexOf('src/flight.js'));
assert.match(flight,/shipWalkAt8e=\{x:0,z:29\.25,heading:0\}/,'Interior entry must be at inner crew hatch');
assert.match(flight,/tangentOffsetLocal\(nearest,shipLocal,shipForwardVec,-30,0\)/);
assert.match(flight,/tangentOffsetLocal\(shipBody,shipLocal,shipForwardVec,-30,0\)/);
const mesh=fs.readFileSync('src/engine.js','utf8');
new vm.Script(mesh,{filename:'src/engine.js'});
assert.match(mesh,/lightweight static pressure arches and practical cable\/floor grammar/);
assert.match(mesh,/Door\/status plaques above the two room banks/);
assert.match(flight,/StarfallShipWalk8E\.roomSchema\(id\)/);
console.log('PASS: hatch entry/exit/pilot eligibility and no direct EVA boarding bypass');
