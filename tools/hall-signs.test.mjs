import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: new URL('../vendor/three/three.module.min.js', import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith('@engine/')) return { url: new URL('../engine/' + specifier.slice(8), import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith('@world/')) return { url: new URL('../world/' + specifier.slice(7), import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
// Old labels need a canvas in the red phase. Physical batching and navigation
// use the real modules in both phases.
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
const { furnishHall } = await import('../world/furnish.js');
const { STATIONS } = await import('../world/layout.js');
const { createNav } = await import('../engine/world/nav.js');
const { VoxelGrid } = await import('../engine/world/voxels.js');
const hall = furnishHall({ walnut: 0, paint: 1, plaster: 2, bookshelf: 3 });

test('no obsolete kiosks, carpets or physical Welcome/Articles targets remain', () => {
  assert.equal(hall.hotspots.length, 0);
  assert.equal(hall.bakes.length, 0);
  assert.equal(hall.planes.some(p => p.name?.startsWith('hall-sign-')), false);
  for (const id of ['welcome', 'blog']) {
    assert.equal(STATIONS.some(s => s.id === id), false);
    assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), new RegExp(`data-station="${id}"`));
  }
});

test('the space between bookcases and original entry aisle stay clear', () => {
  const grid = new VoxelGrid({ min: [-45, -4, -45], size: [90, 12, 90] });
  grid.define('stone', {}); grid.fill(-44, -1, -44, 44, 0, 44, 'stone');
  const nav = createNav(grid, hall.obstacles);
  for (const [x, z] of [[-8.75, -11.25], [-10.375, -9.6875], [-7.125, -9.6875], [-6, 2.4]]) {
    assert.ok(nav.canStand(x, z), `obsolete furniture blocks ${x},${z}`);
  }
  for (let x = -13; x <= -2; x += .25) assert.ok(nav.canStand(x, 0));
  for (const id of ['about', 'miku']) {
    const s = STATIONS.find(s => s.id === id);
    assert.ok(nav.canStand(...s.at));
    assert.ok(nav.findPath({ x: -13, z: 0 }, { x: s.at[0], z: s.at[1] }));
  }
});
