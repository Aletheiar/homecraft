import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: new URL('../vendor/three/three.module.min.js', import.meta.url).href, shortCircuit: true };
  if (specifier === '@world/layout.js') return { url: new URL('../world/layout.js', import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { VoxelGrid } = await import('../engine/world/voxels.js');
const { createNav } = await import('../engine/world/nav.js');
const { useShellSurface } = await import('../world/boundaries.js');

test('pool routes avoid low glass while the original west doorway stays open', () => {
  const grid = new VoxelGrid({ min: [-45, -4, -45], size: [90, 40, 90] });
  grid.define('stone', {});
  grid.fill(-44, -1, -44, 44, 0, 44, 'stone');
  const nav = createNav(grid, []);
  for (const [x, z] of [[-17.5, -6], [17.5, 6], [6, -17.5], [-6, 17.5]]) {
    assert.equal(nav.canStand(x, z), false, `low glass at ${x},${z} is not a ground-level route`);
  }
  assert.equal(nav.canStand(-18, 0), true, 'the original west entrance remains accessible');
  assert.equal(nav.canStand(-9, 0), true, 'the tall interior remains accessible');
  const path = nav.findPath({ x: -29, z: 0 }, { x: 0, z: -18.6 });
  assert.ok(path?.length, 'the northern shore remains reachable around the glass');
});

test('loading raised model surfaces does not close the door or dry shore approach in A*', () => {
  const grid = new VoxelGrid({ min: [-45, -4, -45], size: [90, 40, 90] });
  grid.define('stone', {});
  grid.fill(-44, -1, -44, 44, 0, 44, 'stone');
  // The imported apron is a walkable step, not a new ground-level wall.
  // Loading it before or after the nav grid must produce the same map.
  useShellSurface(() => .4);
  try {
    const nav = createNav(grid, []);
    assert.equal(nav.canStand(-18, 0), true, 'the west door must not depend on model arrival order');
    assert.equal(nav.canStand(0, 18.65), true, 'the apron approach has room for the body and grid clearance');
  } finally { useShellSurface(null); }
});
