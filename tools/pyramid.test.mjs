import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// The bounds describe the imported shell as ground, so they need the browser's
// three.js; resolve it the way the page does.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: new URL('../vendor/three/three.module.min.js', import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });

// Removing bounds or closing the entrance must break these behaviors.
const bounds = await import('../world/boundaries.js').catch(() => ({}));

test('courtyard rejects walking or flying across all four horizontal edges', () => {
  assert.equal(typeof bounds.withinCourtyard, 'function');
  for (const [x, z, want] of [[0, 0, true], [38.3, 0, true], [39.5, 0, false], [-39.5, 0, false], [0, 39.5, false], [0, -39.5, false]]) {
    assert.equal(bounds.withinCourtyard(x, z, 0), want, `${x},${z}`);
    assert.equal(bounds.withinCourtyard(x, z, 20), want, `air ${x},${z}`);
  }
});

test('courtyard encloses the sky and rejects non-finite positions', () => {
  assert.equal(typeof bounds.withinCourtyard, 'function');
  assert.equal(bounds.withinCourtyard(0, 0, 27), true);
  assert.equal(bounds.withinCourtyard(0, 0, 38), false);
  assert.equal(bounds.withinCourtyard(NaN, 0, 0), false);
  assert.equal(bounds.withinCourtyard(0, Infinity, 0), false);
});

test('the west door admits a person while the glass above it stays solid', () => {
  assert.equal(typeof bounds.shellBlocks, 'function');
  assert.equal(bounds.shellBlocks(-18, 0, 0), false, 'door tunnel is level with the paving');
  assert.equal(bounds.shellBlocks(0, 0, 0), false, 'hall floor is open under the roof');
  assert.equal(bounds.shellBlocks(0, 5, 0), false, 'hall air under the roof');
  assert.equal(bounds.shellBlocks(0, 0, 17.6), true, 'a tread at knee height is solid');
  assert.equal(bounds.shellBlocks(0, 5, 13.7), true, 'a tread through the chest is solid');
  assert.equal(bounds.shellBlocks(-25, 0, 0), false, 'outside the pyramid nothing is solid');
});

test('the shell is a slope a visitor can climb to the crown', () => {
  assert.equal(typeof bounds.pyramidTop, 'function');
  assert.equal(bounds.pyramidTop(0), 24.8, 'the apex is the capstone top');
  assert.equal(bounds.pyramidTop(.5), 24.8, 'the capstone is a flat plinth');
  assert.ok(Math.abs(bounds.pyramidTop(.7) - 23.85) < .01, 'the glass crown starts beside the plinth');
  assert.equal(bounds.pyramidTop(18.2), 0, 'the base meets the paving');
  assert.equal(bounds.pyramidTop(18.3), null, 'beyond the base is courtyard');
  // Climbing in, the surface never rises more than the engine's 0.7 m step
  // between one stride and the next, so no point on it can pin the walker.
  // The capstone is skipped: it is a plinth to jump onto, not a stair,
  // so it is deliberately one step too tall to walk up from the crown.
  let worst = 0;
  for (let r = 18.2; r > .9; r -= .05) {
    const a = bounds.pyramidTop(r), b = bounds.pyramidTop(r - .05);
    if (a === null || b === null) continue;
    worst = Math.max(worst, b - a);
  }
  assert.ok(worst <= .7, `tallest step ${worst} m`);
  assert.equal(bounds.shellBlocks(0, 24, 0), true, 'the plinth is solid from the crown beside it');
  // The treads are walkable ground, and the paving beside them is too, so a
  // body can step between the block grid and the shell.
  const source = bounds.createBoundarySource(), out = [];
  source.levels(17.9, 0, out);
  assert.equal(out.length, 1, JSON.stringify(out));
  assert.ok(Math.abs(out[0].y - .41) < .01, JSON.stringify(out));
  assert.equal(out[0].site, 'pyramid');
  const porch = [];
  source.levels(-16, 0, porch);
  assert.deepEqual(porch, [{ y: 0, site: null }], 'the door tunnel floor is courtyard level');
  const beside = [];
  source.levels(18.5, 0, beside);
  assert.deepEqual(beside, [{ y: 0, site: null }], 'the paving beside the base is reported');
  const off = [];
  source.levels(25, 0, off);
  assert.deepEqual(off, [], 'further out the block grid is the only floor');
});

test('a web anchors on the slope and misses the hall behind the door', () => {
  const source = bounds.createBoundarySource();
  const drop = source.pick({ origin: { x: 0, y: 30, z: 0 }, direction: { x: 0, y: -1, z: 0 } });
  assert.ok(drop && Math.abs(drop.point.y - 24.8) < .01, 'straight down the capstone');
  assert.equal(drop.site, 'pyramid');
  const side = source.pick({ origin: { x: 0, y: 1, z: 25 }, direction: { x: 0, y: 0, z: -1 } });
  assert.ok(side && Math.abs(side.point.z) < 18.2 && side.point.z > 17, 'thrown at the base from outside');
  assert.equal(source.pick({ origin: { x: -25, y: 1.7, z: 0 }, direction: { x: 1, y: 0, z: 0 } }), null, 'a ray through the door passes under the roof');
  assert.equal(source.pick({ origin: { x: -9, y: 1.7, z: 0 }, direction: { x: 1, y: 0, z: 0 } }), null, 'a ray thrown from inside the hall misses');
  assert.equal(source.pick({ origin: { x: 0, y: 1, z: 30 }, direction: { x: 0, y: 0, z: 1 } }), null, 'a ray walking away from the pyramid misses');
});
