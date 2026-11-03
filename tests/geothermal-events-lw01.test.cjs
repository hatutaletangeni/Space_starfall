'use strict';
const assert=require('node:assert/strict');
global.StarfallCompositionCW01=require('../src/physics/celestial-composition-cw01.js');
global.StarfallStableTerrain=require('../src/terrain/stable-surface.js');
global.StarfallFieldScience=require('../src/physics/science-field.js');
const G=global.StarfallGeothermalLW01=require('../src/physics/geothermal-lw01.js');
const EV=require('../src/events/events.js');
const galaxy=require('../src/galaxy.js').generateGalaxy(742,64);
assert.equal(galaxy.systems.length+0,2368);
const body=galaxy.allWorlds.find(b=>b.type==='Volcanic');
assert.ok(body&&body.id&&body.landable,'expected an existing volcanic world');
const sites=G.sources(body,galaxy.seed);
assert.ok(sites.length>0);
let active=null;
for(const site of sites){
 const t=(site.cycleS-site.epochOffsetS)%site.cycleS+site.durationS/2;
 const record=EV.geothermalEvent(body,site.direction,t,galaxy.seed);
 if(record){active={site,t,record};break;}
}
assert.ok(active,'at least one genuinely generated geothermal site must activate');
const r=active.record,at=EV.evaluate(body,active.site.direction,active.t,galaxy.seed);
assert.equal(r.id,at.id);
assert.equal(r.bodyId,body.id);
assert.ok(r.intensity>0&&r.intensity<=1);
assert.ok(Number.isFinite(r.endS)&&r.endS>r.startS);
assert.equal(EV.geothermalEvent(body,active.site.direction,active.t,galaxy.seed).id,r.id);
assert.ok(EV.skyTransmission(body,active.site.direction,active.t,galaxy.seed)<=1);
assert.ok(EV.sanitize([{id:r.id,bodyId:r.bodyId,kind:r.kind,timeS:active.t,local:active.site.direction,intensity:r.intensity}]).length===1);
console.log('LW01 genuine galaxy site -> eruption -> journal -> solar effect PASS:',body.id,active.site.kind);
