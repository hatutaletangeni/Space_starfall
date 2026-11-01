const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../src/galaxy.js'),'utf8'));
const g=globalThis.StarfallGalaxy.generateGalaxy(742,64);
assert.equal(g.systems.length,2368);
assert.equal(g.skyCatalog.length,2304);
assert.equal(new Set(g.systems.map(s=>s.id)).size,2368);
assert.equal(new Set(g.systems.map(s=>s.name)).size,2368);
let minimum=Infinity;
for(let i=0;i<g.systems.length;i++)for(let j=i+1;j<g.systems.length;j++){
 const a=g.systems[i],b=g.systems[j],d=Math.hypot(...a.position.map((v,k)=>v-b.position[k])),sep=d/(2*Math.max(a.star.radius,b.star.radius));
 minimum=Math.min(minimum,sep);assert.ok(sep>=100-1e-9,'stellar spacing violation '+a.id+' '+b.id+': '+sep);
}
assert.equal(g.skyCatalog.filter(s=>s.planets.length).length,0,'Far systems must remain unloaded');
assert.ok(g.allWorlds.length>100,'Original nearby worlds should be retained');
const target=g.skyCatalog[14];g.activate(target);
assert.equal(target.dormant,false);assert.ok(target.planets.length>=1&&target.planets.length<=20);
for(const p of target.planets){assert.ok(p.moons.length>=0&&p.moons.length<=7);for(const m of p.moons)assert.equal(m.systemId,target.id);}
const firstPos=[...target.planets[0].position];g.update(500);
assert.ok(Math.hypot(...firstPos.map((v,i)=>v-target.planets[0].position[i]))>1,'Orbit motion must be observable');
const initialNames=target.planets.map(p=>p.name),initialMoonCounts=target.planets.map(p=>p.moons.length);
for(let i=0;i<27;i++)g.activate(g.skyCatalog[100+i]);
assert.ok(g.skyCatalog.filter(s=>!s.dormant).length<=24,'Limit streamed systems');
g.activate(target);
assert.deepEqual(target.planets.map(p=>p.name),initialNames,'Reactivated system must be reproducible');
assert.deepEqual(target.planets.map(p=>p.moons.length),initialMoonCounts);
assert.equal(g.byId.get(target.star.id),target.star);
assert.equal(g.nearestSystem(target.position),target);
assert.equal(g.nearestStar(target.position).system,target);
assert.ok(g.nearbySystems(target.position,2e6).includes(target));
console.log('PASS: '+g.systems.length+' navigable stars, '+g.skyCatalog.length+' streamed systems, minimum '+minimum.toFixed(3)+' larger-star diameters, 1–20 planets, 0–7 moons, deterministic orbital simulation and LRU');
