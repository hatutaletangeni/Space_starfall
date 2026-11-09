'use strict';
const assert = require('node:assert/strict');
const { evaluate } = require('../src/physics/expedition-audit8k.js');

function snapshot() {
  const habitat = id => ({
    id, kind: 'hab', bodyId: 'world-b', physicalAssetId: 'envelope-1',
    enabled: true, habT09: {schema: 1, enabled: true, waterL: 10,
      oxygenTankMol: 100, scrubberCapacityMol: 20, airlock: 'CLOSED',
      greenhouse8i: {installed: true, carbonConsumedMol: 1, oxygenProducedMol: 1}}
  });
  return {
    physical8a: {assets: [{id: 'envelope-1', type: 'habitat_envelope',
      location: {kind: 'surface', bodyId: 'world-b'},
      provenance: 'structural-8g:receipt-1'}]},
    vehicleAssembly8g: {receipts: [{assetId: 'envelope-1',
      blueprintId: 'habitat_shell', status: 'COMMITTED'}]},
    materials8a: {operations: [{kind: 'HABITAT_GREENHOUSE_8I',
      habitatId: 'hab-1', status: 'COMMITTED'}]},
    outpost5: {items: [habitat('hab-1')]}
  };
}
const stage = (s, id) => evaluate(s).stages.find(x => x.id === id).status;
const legitimate = snapshot();
assert.equal(stage(legitimate, 'habitat'), 'EVIDENCE');
assert.equal(stage(legitimate, 'greenhouse'), 'EVIDENCE');

const duplicated = snapshot();
duplicated.outpost5.items.push({...duplicated.outpost5.items[0], id: 'hab-2'});
assert.equal(stage(duplicated, 'habitat'), 'NOT_PROVEN',
  'two outposts cannot each claim one physical envelope');
assert.equal(stage(duplicated, 'greenhouse'), 'NOT_PROVEN');

const duplicatedAsset = snapshot();
duplicatedAsset.physical8a.assets.push({...duplicatedAsset.physical8a.assets[0]});
assert.equal(stage(duplicatedAsset, 'habitat'), 'NOT_PROVEN',
  'duplicate physical asset identities are not independently valid');
console.log('8K unique physical envelope audit regression passed');
