import test from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../world/portal-journey.js').catch(() => ({}));
function memory() { const m = new Map(); return { setItem: (k, v) => m.set(k, v), getItem: k => m.get(k), removeItem: k => m.delete(k) }; }
const gate = { id: 'writing', x: -5, z: -7, yaw: -Math.PI / 2 };
// Yaw is stored wrapped, so compare directions rather than raw radians.
const sameView = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1e-9;

test('a return restores the local portal approach and consumes the checkpoint once', () => {
  assert.equal(typeof api.saveHubReturn, 'function');
  const store = memory();
  api.saveHubReturn({ pos: { x: -7, z: -7 }, y: 0 }, { yaw: 4.7, firstPerson: true }, gate, store);
  assert.equal(api.consumeHubReturn('', store), null);
  const result = api.consumeHubReturn('?space=hub&return=1', store);
  assert.equal(result.x, -7); assert.equal(result.z, -7); assert.equal(result.firstPerson, true);
  assert.ok(sameView(result.yaw, 4.7), `looked ${result.yaw} instead of 4.7`);
  assert.equal(api.consumeHubReturn('?space=hub&return=1', store), null);
});

test('walking through a plane returns safely to its front, not into the active veil', () => {
  const store = memory();
  api.saveHubReturn({ pos: { x: -4.95, z: -7 }, y: 0 }, { yaw: 1, firstPerson: false }, gate, store);
  const result = api.consumeHubReturn('?space=hub&return=1', store);
  assert.ok(result.x <= -6.2); assert.equal(result.z, -7);
});

test('invalid checkpoints cannot place a visitor beyond the courtyard or in midair', () => {
  const store = memory();
  api.saveHubReturn({ pos: { x: 100, z: 100 }, y: 20 }, { yaw: NaN, firstPerson: false }, gate, store);
  const result = api.consumeHubReturn('?space=hub&return=1', store);
  assert.ok(Math.abs(result.x) < 18 && Math.abs(result.z) < 18);
  assert.ok(Number.isFinite(result.yaw));
});
