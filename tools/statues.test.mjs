import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { FENCE_HALF } from '../world/boundaries.js';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: new URL('../vendor/three/three.module.min.js', import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith('@engine/')) return { url: new URL('../engine/' + specifier.slice(8), import.meta.url).href, shortCircuit: true };
  if (specifier === '@world/layout.js') return { url: new URL('../world/layout.js', import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const data = await import('../world/statue-data.js').catch(() => ({}));

test('the new monument mirrors the horse, faces the pyramid and stays wholly outside the fence', async () => {
  assert.equal(typeof data.createAngelBoxes, 'function', 'procedural angel geometry is missing');
  const { buildStatues } = await import('../world/statues.js');
  const result = buildStatues({ paint: 0, travertine: 1 });
  const { bounds, placement, height, triangleCount } = result.metadata;
  assert.deepEqual([placement.x, placement.z], [-62.6, -19.2]);
  assert.ok(Math.abs(placement.yaw - Math.PI / 2) < 1e-8);
  assert.ok(bounds.max[0] < -FENCE_HALF - 10, 'scenery must not intrude into the playable courtyard');
  assert.ok(Math.abs(height - 11.4) < .15, `monument height ${height}`);
  assert.ok(triangleCount < 10000, `excessive added geometry: ${triangleCount}`);
  assert.equal(Object.keys(result.batches).length, 1);
  assert.equal(result.batches.statues.items.glass.length, 0);
  assert.equal(result.lights, undefined);
});

test('the Angel Room prop has a large featureless face, a gray rim and separate offering palms', () => {
  assert.equal(typeof data.createAngelBoxes, 'function');
  const boxes = data.createAngelBoxes();
  const wings = boxes.filter(b => b.part === 'wing');
  const hands = boxes.filter(b => b.part === 'hands');
  const face = boxes.filter(b => b.part === 'blank-face');
  const rim = boxes.filter(b => b.part === 'head-rim');
  assert.ok(wings.length && hands.length && face.length && rim.length);
  assert.ok(Math.max(...face.map(b => b.x + b.w / 2)) - Math.min(...face.map(b => b.x - b.w / 2)) >= 3,
    'the oversized oval face is the identifying feature of the room statue');
  assert.ok(!boxes.some(b => /eye|nose|mouth|palm-seam/.test(b.part)), 'the room statue is faceless');
  assert.ok(hands.some(b => b.x < -1.4) && hands.some(b => b.x > 1.4), 'palms are offered separately at the sides');
  assert.ok(hands.every(b => b.z > .7 && b.w > b.h), 'palms face up in front of the short robe');
  const handEdges = boxes.filter(b => b.part === 'hand-outline');
  assert.ok(hands.every(palm => handEdges.filter(edge => Math.sign(edge.x) === Math.sign(palm.x))
    .every(edge => edge.y + edge.h < palm.y + palm.h)), 'pale palms must be visible above their dark supporting edge');
  assert.ok(Math.max(...rim.map(b => b.z + b.d / 2)) - Math.min(...rim.map(b => b.z - b.d / 2)) > 2,
    'the head must retain a rounded solid rear, rather than becoming a flat sprite board');
  const wingBottom = Math.min(...wings.map(b => b.y));
  const faceBottom = Math.min(...face.map(b => b.y));
  assert.ok(wingBottom < faceBottom - 1, 'folded wings hang down past the face');
  assert.ok(Math.max(...wings.map(b => b.x + b.w / 2)) < 4, 'wings stay close to the head rather than spreading horizontally');
  for (const b of wings) assert.ok(wings.some(other => Math.abs(other.x + b.x) < 1e-7 && other.y === b.y && other.z === b.z && other.w === b.w && other.h === b.h && other.d === b.d), 'wings must mirror each other');
  assert.ok(boxes.some(b => b.part === 'wing-feather'), 'folded wings retain carved feather grooves');
});

test('the solid six-metre stepped base is grounded and the geometry contains only finite positive boxes', () => {
  assert.equal(typeof data.createAngelBoxes, 'function');
  const boxes = data.createAngelBoxes();
  const foundation = boxes.find(b => b.part === 'foundation');
  assert.deepEqual([foundation.x, foundation.y, foundation.z, foundation.w, foundation.h, foundation.d], [0, 0, 0, 6, .4, 6]);
  for (const b of boxes) {
    assert.ok([b.x, b.y, b.z, b.w, b.h, b.d].every(Number.isFinite));
    assert.ok(b.w > 0 && b.h > 0 && b.d > 0);
    assert.ok(b.y >= 0);
  }
});
