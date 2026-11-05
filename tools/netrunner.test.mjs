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
// The room paints its screen atlas on a canvas and loads two poster images; a
// node test only needs the objects, never the pixels.
const context = () => ({
  clearRect() {}, fillRect() {}, fillText() {}, beginPath() {}, arc() {}, moveTo() {}, lineTo() {},
  closePath() {}, stroke() {}, fill() {}, scale() {}, save() {}, restore() {}, translate() {},
  createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }),
});
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: context }),
  createElementNS: () => ({ style: {}, src: '', width: 1, height: 1, addEventListener() {}, removeEventListener() {}, setAttribute() {} }),
};
const { furnishHall } = await import('../world/furnish.js');
const { HALL_SPOTS } = await import('../world/space-config.js');
const { LIGHT_MODES } = await import('../world/workstation.js');
const hall = furnishHall({ walnut: 0, paint: 1, plaster: 2, bookshelf: 3, travertine: 4, linen: 5, terracotta: 6, leaves: 7, black_metal: 8, deepslate: 9 });
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ws = hall.workstation;
const fixture = id => ws.fixtures.find(f => f.id === id);

test('the corner is one walkable room with the desk where the hall expects it', () => {
  assert.equal(ws.href, 'https://github.com/Aletheiar');
  assert.deepEqual(ws.screens.map(s => s.id), ['main', 'terminal', 'status']);
  // The three display anchors stay where the old single-screen desk put them,
  // so the engine hotspot, the seat and the hall layout keep working.
  assert.ok(Math.abs(ws.screens[0].position.x - HALL_SPOTS.workbench.deskX) < 1e-9);
  assert.ok(Math.abs(ws.screens[0].position.z - (HALL_SPOTS.workbench.deskZ - .31)) < 1e-9);
  assert.equal(ws.screens[1].position.x < ws.screens[0].position.x, true);
  assert.equal(ws.screens[2].position.x > ws.screens[0].position.x, true);
  // Everything a visitor can touch has a label and a box in world space.
  for (const f of ws.fixtures) {
    assert.ok(f.box.min.x < f.box.max.x && f.box.min.y < f.box.max.y && f.box.min.z < f.box.max.z, `${f.id} box is positive`);
    if (f.id !== 'lights') assert.ok(f.label.length > 0, `${f.id} has a hint`);
  }
  assert.deepEqual(ws.fixtures.map(f => f.id), ['main', 'terminal', 'status', 'rack', 'poster-pyramid', 'poster-v', 'lights', 'seat']);
  // The seat sits behind the desk and the stand spot is clear of the chair.
  assert.ok(ws.seat.z > HALL_SPOTS.workbench.deskZ, 'the seat is south of the desk');
  assert.ok(ws.stand.z > ws.seat.z, 'the standing spot is behind the seat');
});

test('both official posters are real image planes on the wall', () => {
  const posters = ws.mesh.getObjectByName('workstation-posters');
  assert.ok(posters && posters.children.length === 2);
  const byName = Object.fromEntries(posters.children.map(m => [m.name, m]));
  for (const [name, file, ratio] of [['poster-pyramid', 'cyberpunk-pyramid.webp', 800 / 1280], ['poster-v', 'cyberpunk-v.webp', 540 / 960]]) {
    const plane = byName[name];
    assert.ok(plane, `${name} is in the scene`);
    assert.equal(plane.userData.file, file, `${name} loads its own official file`);
    assert.equal(plane.userData.credit, 'CD PROJEKT RED');
    assert.ok(plane.material.map, `${name} has a real texture`);
    assert.equal(plane.material.toneMapped, false, `${name} is not tone mapped down`);
    const { width, height } = plane.geometry.parameters;
    assert.ok(Math.abs(height / width - ratio) < 1e-6, `${name} keeps its original aspect ratio`);
    assert.match(index, new RegExp(`assets/posters/${file}`), `${name} also has its own page`);
  }
  // The big one is the focal point: clearly larger than the side poster.
  assert.ok(byName['poster-pyramid'].geometry.parameters.width > byName['poster-v'].geometry.parameters.width * 1.8);
});

test('the room owns five pages, one light switch and no extra lights', () => {
  for (const id of ['terminal', 'status', 'rack', 'poster-pyramid', 'poster-v']) {
    assert.match(index, new RegExp(`data-station="${id}"`), `${id} has a page card`);
  }
  // The terminal must say it is a simulation, and the rack must deny networking.
  assert.match(index, /模拟终端/);
  assert.match(index, /不执行系统命令/);
  assert.match(index, /没有网络连接/);
  assert.match(index, /CD PROJEKT RED/);
  assert.deepEqual(LIGHT_MODES.map(m => m.id), ['warm', 'night', 'off']);
  // The switch cycles the room's own material, never the pyramid's daylight.
  assert.equal(ws.lightMode, 'warm');
  ws.cycleLights();
  assert.equal(ws.lightMode, 'night');
  ws.cycleLights();
  assert.equal(ws.lightMode, 'off');
  ws.cycleLights();
  assert.equal(ws.lightMode, 'warm');
});
