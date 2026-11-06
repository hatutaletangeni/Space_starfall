'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const walk=fs.readFileSync('src/physics/ship-walk8e.js','utf8');
const context={module:{exports:{}},console};context.globalThis=context;
vm.runInNewContext(walk,context,{filename:'src/physics/ship-walk8e.js'});
const ship=context.module.exports;
assert.equal(ship.room(16.5,5.7),'cargo');
assert.equal(ship.nearVehicleBayTruck(16.5,5.7),true);
assert.equal(ship.nearVehicleBayTruck(16.5,19),false,'must not board across the entire room');
assert.equal(ship.nearVehicleBayTruck(0,5.7),false,'central corridor is not truck access');
assert.equal(ship.nearVehicleBayTruck(16.5,-40),false,'bridge is not truck access');
let p={x:0,z:6,heading:0};
for(let n=0;n<40;n++){const next=ship.move(p,.4,0);p={...p,...next};}
assert.equal(ship.nearVehicleBayTruck(p.x,p.z),true,'cargo bay reachable on foot from ship spine');
const flight=fs.readFileSync('src/flight.js','utf8');
assert.match(flight,/function boardVehicleBayTruck8B\(\)/);
assert.match(flight,/if\(room==='cargo'\)\{if\(boardVehicleBayTruck8B\(\)\)/);
// Truck driving now deliberately retains the surface simulation flag (eva=true)
// while truckOccupied selects exclusive vehicle controls. Changing it back would
// suppress the real truck/terrain update path and break ramp egress.
assert.match(flight,/shipWalking8e=false;truckOccupied=true;eva=true;/);
assert.match(flight,/if\(landed\)\{if\(eva\|\|truckOccupied\|\|manufacturedOccupied8G\)\{/,
 'Original truck remains in the surface vehicle physics branch after indoor boarding');
assert.doesNotMatch(flight,/shipWalking8e=false;truckOccupied=true;eva=false;/);
assert.match(flight,/const truck=truckWorldState\(\);pos=\[\.\.\.truck\.position\]/);
assert.match(flight,/if\(!fromInterior&&V\.len\(V\.sub\(pos,access\)\)>35\)return false;/);
assert.match(flight,/if\(code==='KeyI'&&eva&&landed&&!truckOccupied&&!rampTransition\)/);
const render=fs.readFileSync('src/engine.js','utf8');
assert.match(render,/The actual 8B wide starboard ramp continues/);
assert.doesNotMatch(render,/\[17,1\],\[17,15\]/,'truck lane must not have cargo desks');
const mobile=fs.readFileSync('src/mobile/landscape.js','utf8');
assert.match(mobile,/data-mobile-action/);
assert.match(mobile,/VEHICLE BAY · TAP X TO BOARD TRUCK/);
console.log('PASS: reachable indoor vehicle bay; proximity-restricted original-truck X boarding; visible ramp; mobile guidance');
