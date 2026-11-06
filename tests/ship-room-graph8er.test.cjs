'use strict';
const assert=require('node:assert/strict');
const walk=require('../src/physics/ship-walk8e.js');
assert.equal(walk.validateRoomGraph(),true);
assert.equal(walk.ROOM_SCHEMA.length,walk.zones.length);
const ids=new Set(walk.ROOM_SCHEMA.map(r=>r.id));
const codes=new Set(walk.ROOM_SCHEMA.map(r=>r.code));
assert.equal(codes.size,walk.ROOM_SCHEMA.length,'Stable room codes must be unique');
for(const source of ids)for(const target of ids){
 const route=walk.routeRooms(source,target);
 assert.ok(route&&route.length<=3,source+' to '+target+' inaccessible');
 assert.equal(route[0],source);assert.equal(route.at(-1),target);
}
assert.equal(walk.roomSchema('cargo').code,'V01');
assert.equal(walk.roomSchema('cargo').role,'single-truck vehicle bay');
assert.equal(walk.roomSchema('spine').code,'U01');
assert.equal(walk.roomSchema('no-room'),null);
assert.equal(walk.routeRooms('cargo','unbuilt-material-hold'),null);
assert.equal(walk.nearVehicleBayTruck(16.5,5.7),true);
assert.equal(walk.nearVehicleBayTruck(0,5.7),false);
console.log('PASS: actual room graph, physical adjacency, unique codes, no phantom cargo hold');
