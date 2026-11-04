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
// Canvas painting needs a 2D context; physical batching, the floor drawing and
// navigation all use the real modules.
const context = () => ({
  clearRect() {}, fillRect() {}, fillText() {}, beginPath() {}, arc() {}, moveTo() {}, lineTo() {},
  closePath() {}, stroke() {}, fill() {}, scale() {}, save() {}, restore() {}, translate() {},
  createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }),
});
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: context }) };
const { furnishHall } = await import('../world/furnish.js');
const { buildHallFloor } = await import('../world/hall-floor.js');
const { STATIONS, floorAt, HALL_EXHIBIT_TOP } = await import('../world/layout.js');
const { HUB_PORTALS, HALL_EMBLEM, HALL_SPOTS, HALL_EXHIBIT } = await import('../world/space-config.js');
const { createNav } = await import('../engine/world/nav.js');
const { VoxelGrid } = await import('../engine/world/voxels.js');
const hall = furnishHall({ walnut: 0, paint: 1, plaster: 2, bookshelf: 3, travertine: 4, linen: 5, terracotta: 6, leaves: 7, black_metal: 8, deepslate: 9 });
const floor = buildHallFloor({ paint: 1 });
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function nav() {
  const grid = new VoxelGrid({ min: [-45, -4, -45], size: [90, 12, 90] });
  grid.define('stone', {}); grid.fill(-44, -1, -44, 44, 0, 44, 'stone');
  return createNav(grid, [...hall.obstacles, ...(floor.obstacles || [])]);
}

test('the hall has exactly three doors and no studio portal', () => {
  assert.deepEqual(HUB_PORTALS.map(g => g.id), ['writing', 'friends', 'about']);
  assert.equal(HUB_PORTALS.some(g => g.href.includes('studio')), false);
  assert.equal(HUB_PORTALS.find(g => g.id === 'about').z < 0, true, 'About is north of the axis');
  assert.equal(HUB_PORTALS.find(g => g.id === 'friends').z > 0, true, 'Friends is south of the axis');
  assert.equal(HUB_PORTALS.find(g => g.id === 'writing').x > 0, true, 'the reading room is the east door');
  assert.equal(HUB_PORTALS.find(g => g.id === 'writing').z, 0);
  // The project workbench is still reachable from its card, just not by a door.
  assert.match(index, /href="\/\?space=studio"/);
  assert.equal((index.match(/data-approach-portal="works"/g) || []).length, 0);
});

test('the workbench and the floor drawing are the only interior fixtures with a box', () => {
  assert.equal(hall.hotspots.length, 1);
  assert.equal(hall.hotspots[0].id, 'workbench');
  const box = hall.hotspots[0].box;
  assert.ok(box.min.x < HALL_SPOTS.workbench.deskX && box.max.x > HALL_SPOTS.workbench.deskX);
  assert.ok(box.min.y > .7 && box.min.y < 1, 'the target sits on the desk, not on the floor');
  assert.equal(hall.bakes.length, 1);
  assert.equal(hall.planes.some(p => p.name?.startsWith('hall-sign-')), false);
  const names = [...hall.planes, ...floor.planes].map(p => p.name).filter(Boolean);
  for (const name of ['hall-exhibit', 'hall-workbench-plate', 'hall-emblem']) assert.ok(names.includes(name), `missing ${name}`);
  assert.equal((index.match(/data-station="workbench"/g) || []).length, 1);
  assert.match(index, /data-link="https:\/\/github\.com\/Aletheiar\/homecraft"/);
});

test('the floor emblem is a quarter of the hall and never blocks a walk', () => {
  const diameter = HALL_EMBLEM.radius * 2;
  // The walkable hall runs from the door at x = -13.4 to the glass near r = 16.4.
  const ratio = diameter / (16.4 * 2);
  assert.ok(ratio > .2 && ratio < .25, `emblem covers ${(ratio * 100).toFixed(1)}% of the hall width`);
  const navs = nav();
  // Flat decoration: the emblem's own centre is walkable, and so is the plinth
  // standing on it, because the plinth top is floor, not an obstacle.
  assert.equal(navs.canStand(0, HALL_EMBLEM.radius - .2), true);
  assert.equal(navs.canStand(HALL_EMBLEM.radius - .2, 0), true);
});

test('the centre display is a step underfoot, never an invisible column', () => {
  // The plinth top is reported as floor, so the walker climbs on and off it.
  assert.equal(floorAt(0, 0), HALL_EXHIBIT_TOP);
  assert.equal(floorAt(HALL_EXHIBIT.plinth / 2 - .1, 0), HALL_EXHIBIT_TOP);
  assert.equal(floorAt(HALL_EXHIBIT.plinth / 2 + .1, 0), 0);
  // Nothing in the hall stands a collider over the centre, so a jump or a short
  // flight passes above the little glass pyramid instead of hitting a wall.
  assert.deepEqual(hall.obstacles.filter(o => o.x0 < 0 && o.x1 > 0 && o.z0 < 0 && o.z1 > 0), []);
  const navs = nav();
  assert.ok(navs.canStand(0, 0), 'the plinth top is not walkable');
  assert.ok(navs.findPath({ x: -4, z: 0 }, { x: 4, z: 0 }), 'the centre lane does not cross the display');
});

test('the glass pyramid levitates above the plinth', () => {
  const glass = hall.exhibit.mesh;
  assert.equal(glass.name, 'hall-exhibit');
  const underside = glass.position.y - HALL_EXHIBIT.pyramid.height / 2;
  // The gap is exactly the configured hover, so the owner can tune
  // HALL_EXHIBIT.hover in world/space-config.js without touching this test.
  assert.ok(Math.abs(underside - HALL_EXHIBIT_TOP - HALL_EXHIBIT.hover) < 1e-6);
  assert.ok(HALL_EXHIBIT.hover > 0, 'the exhibit still hovers');
  // The drift is small enough that the model never settles onto the plinth.
  assert.ok(HALL_EXHIBIT.bob >= 0 && HALL_EXHIBIT.bob < HALL_EXHIBIT.hover);
  assert.equal(hall.exhibit.base, HALL_EXHIBIT_TOP + HALL_EXHIBIT.hover + HALL_EXHIBIT.pyramid.height / 2);
});

test('the centre plinth leaves a wide walk around it and both sides of the lane open', () => {
  const navs = nav();
  for (const x of [-14, -8, -4, -2.5, 2.5, 6, 9.5]) assert.ok(navs.canStand(x, 0), `centre lane blocked at ${x},0`);
  // Two metres either side of the plinth is clear, so the middle route only steps around it.
  for (const z of [-2, 2]) for (const x of [-2, 0, 2]) assert.ok(navs.canStand(x, z), `plinth blocks ${x},${z}`);
});

test('every door and both corners are reachable from the west entrance', () => {
  const navs = nav();
  for (const s of STATIONS) {
    if (['plaza', 'observatory'].includes(s.id)) continue;
    assert.ok(navs.canStand(...s.at), `${s.id} stands on a blocked tile`);
    assert.ok(navs.findPath({ x: -13.5, z: 0 }, { x: s.at[0], z: s.at[1] }), `${s.id} cannot be reached`);
  }
  // The workbench approach, the lounge and the door fronts are all on open floor.
  for (const [x, z] of [[13.3, -10.2], [12.2, 9.6], [12.6, 13.2], [-13, 0], [-11, -6.4], [-11, 6.4], [9.4, 0]]) {
    assert.ok(navs.canStand(x, z), `blocked at ${x},${z}`);
  }
});

test('the bench and shelf groups stay out of the walking lanes', () => {
  const navs = nav();
  // A one-metre-wide path down each side of the hall, past the furniture.
  for (let z = -12; z <= 12; z += .5) assert.ok(navs.canStand(-6, z), `west side blocked at -6,${z}`);
  for (const x of [-9, -4, 0, 4, 8]) assert.ok(navs.canStand(x, -9), `north lane blocked at ${x},-9`);
  for (const x of [-9, -4, 0, 4, 8]) assert.ok(navs.canStand(x, 9), `south lane blocked at ${x},9`);
  assert.ok(navs.canStand(11, -6) && navs.canStand(11, 6), 'the door frame lane is open');
});
