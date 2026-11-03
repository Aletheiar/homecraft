import test from 'node:test';
import assert from 'node:assert/strict';
const helpers = await import('../engine/world/pool-regions.js').catch(() => ({}));
const pool = { x0: 0, x1: 30, z0: 0, z1: 20, polygons: [[[0, 0], [10, 0], [0, 10]], [[20, 0], [30, 0], [30, 10]]] };

test('polygon water excludes dry points inside its bounding rectangle', () => {
  assert.equal(typeof helpers.poolContains, 'function');
  assert.equal(helpers.poolContains(pool, 2, 2), true);
  assert.equal(helpers.poolContains(pool, 8, 8), false);
  assert.equal(helpers.poolContains(pool, 15, 2), false);
  assert.equal(helpers.poolContains(pool, 28, 2), true);
  assert.equal(helpers.poolContains(null, 2, 2), false);
  assert.equal(helpers.poolContains({ x0: 0, x1: 10, z0: 0, z1: 10 }, 8, 8), true);
});

test('swimming clamp respects slanted shores and stays in the current water region', () => {
  assert.equal(typeof helpers.clampPoolPoint, 'function');
  const point = helpers.clampPoolPoint(pool, 29, 2, .4, { x: 2, z: 2 });
  assert.equal(helpers.poolContains(pool, point.x, point.z), true);
  assert.ok(point.x + point.z <= 10 - .4 * Math.sqrt(2) + 1e-6);
  assert.ok(point.x >= .4 - 1e-6 && point.z >= .4 - 1e-6);
});

test('shore candidates include the sloping side and provide outward normals', () => {
  assert.equal(typeof helpers.poolShores, 'function');
  const shores = helpers.poolShores(pool, 4, 4);
  const diagonal = shores.find(s => s.ox > .6 && s.oz > .6);
  assert.ok(diagonal);
  assert.ok(Math.abs(diagonal.x + diagonal.z - 10) < 1e-6);
});

test('short shoreline edges never extrapolate beyond their endpoints', () => {
  const narrow = { polygons: [[[0, 0], [.4, 0], [.4, 5], [0, 5]]] };
  const edge = helpers.poolShores(narrow, .2, 2).find(s => s.oz < -.9);
  assert.ok(edge.x >= 0 && edge.x <= .4);
});

test('an infeasible body margin still returns a position inside the basin', () => {
  const narrow = { polygons: [[[0, 0], [10, 0], [10, 1], [0, 1]]] };
  const p = helpers.clampPoolPoint(narrow, 5, .5, 2);
  assert.equal(helpers.poolContains(narrow, p.x, p.z), true);
});
