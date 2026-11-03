import test from 'node:test';
import assert from 'node:assert/strict';

// Removing bounds or treating the entrance as solid must break these behaviors.
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

test('original west door admits a person while glass walls and the upper roof remain solid', () => {
  assert.equal(typeof bounds.shellCollides, 'function');
  assert.equal(bounds.shellCollides(-18, 0, 0), false);
  assert.equal(bounds.shellCollides(7, 0, 17.7), true);
  assert.equal(bounds.shellCollides(17.7, 0, 0), true);
  assert.equal(bounds.shellCollides(0, 0, 0), false);
  assert.equal(bounds.shellCollides(0, 5, 13.7), true);
  assert.equal(bounds.shellCollides(0, 5, 0), false);
});

test('swept shell checks catch falling through the roof and fast wall crossings', () => {
  assert.equal(typeof bounds.segmentHitsShell, 'function');
  assert.equal(bounds.segmentHitsShell({ x: 2, y: 24, z: 2 }, { x: 2, y: 0, z: 2 }), true);
  assert.equal(bounds.segmentHitsShell({ x: 20, y: 0, z: 2 }, { x: 2, y: 0, z: 2 }), true);
  assert.equal(bounds.segmentHitsShell({ x: -25, y: 0, z: 0 }, { x: -9, y: 0, z: 0 }), false);
  assert.equal(bounds.segmentHitsShell({ x: 0, y: 0, z: 7 }, { x: 7, y: 0, z: 5 }), false);
});
