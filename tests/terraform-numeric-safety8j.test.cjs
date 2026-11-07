'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../src/physics/terraform8j.js');

const world = () => ({
  schema: 1, radiusM: 6000000, gravityMS2: 9.8,
  atmosphereKg: 1e16, pressurePa: 0, receipts: []
});
const args = (receiptId = 'finite-1') => ({
  deliveredGasKg: 1000, capturedGasKg: 250, lostGasKg: 50,
  seconds: 60, receiptId
});

test('8J finite transfer changes atmospheric mass once, with finite pressure', () => {
  const input = world();
  const initial = structuredClone(input);
  const r = T.advance(input, args());
  assert.equal(r.duplicate, false);
  assert.equal(r.state.atmosphereKg, input.atmosphereKg + 700);
  assert.ok(Number.isFinite(r.state.pressurePa));
  assert.equal(r.state.receipts.length, 1);
  assert.deepEqual(input, initial, 'source snapshot must remain unmodified');
  const again = T.advance(r.state, args());
  assert.equal(again.duplicate, true);
  assert.equal(again.state.receipts.length, 1);
  assert.throws(() => T.advance(r.state, {...args(), deliveredGasKg: 1001}), /Conflicting/);
});

test('8J refuses arithmetic overflow rather than saving Infinity', () => {
  const input = world();
  input.atmosphereKg = 1.6e308;
  assert.throws(() => T.advance(input, {
    deliveredGasKg: 1.6e308, capturedGasKg: 0,
    lostGasKg: 0, seconds: 1, receiptId: 'overflow'
  }), /Invalid atmospheric mass arithmetic|Non-finite atmosphere state/);
  assert.equal(input.receipts.length, 0);
});

test('8J rejects overflow in withdrawals and invalid receipt identity', () => {
  assert.throws(() => T.advance(world(), {
    deliveredGasKg: 0, capturedGasKg: 1.7e308, lostGasKg: 1.7e308,
    seconds: 1, receiptId: 'overflow-out'
  }), /Invalid atmospheric mass arithmetic/);
  for (const bad of ['', ' ', 0, 123, 'x'.repeat(161)])
    assert.throws(() => T.advance(world(), args(bad)), /Invalid terraforming intervention/);
});

test('8J rejects unrepresentable pressure and geometry', () => {
  const input = world();
  input.radiusM = 1e-300;
  assert.throws(() => T.advance(input, args('bad-area')), /Non-finite atmosphere state/);
  const high = world();
  high.gravityMS2 = 1e308;
  high.radiusM = 0.01;
  assert.throws(() => T.advance(high, args('bad-pressure')), /Non-finite atmosphere state/);
});
