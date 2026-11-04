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
const THREE = await import('three');
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
  for (const name of ['hall-exhibit', 'hall-workstation', 'hall-emblem']) assert.ok(names.includes(name), `missing ${name}`);
  assert.equal((index.match(/data-station="workbench"/g) || []).length, 1);
  assert.match(index, /data-link="https:\/\/github\.com\/Aletheiar"/);
});

test('the workstation has three textured screens but only the main screen is clickable', () => {
  const station = hall.workstation;
  assert.ok(station, 'the old single monitor is replaced by a workstation');
  assert.equal(station.screens.length, 3);
  assert.ok(station.mesh.getObjectByName('workstation-screens').material.map.isCanvasTexture);
  const main = station.screens.find(s => s.id === 'main');
  const target = hall.hotspots.find(h => h.id === 'workbench').box;
  assert.ok(target.containsPoint(main.position));
  for (const s of station.screens.filter(s => s.id !== 'main')) assert.equal(target.containsPoint(s.position), false);
  assert.ok(target.max.z - target.min.z < .03, 'the target hugs the main display face');
  assert.ok(target.max.x - target.min.x <= main.width + .001);
  assert.ok(station.mesh.getObjectByName('workstation-status-leds'));
});

test('auxiliary housings occlude the main target from an oblique side view', () => {
  const target=hall.workstation.hotspot;
  const origin=new THREE.Vector3(15.2,1.3,-12.73),aux=new THREE.Vector3(14.32,1.3,-12.84);
  const ray=new THREE.Ray(origin,aux.clone().sub(origin).normalize());
  assert.ok(ray.intersectBox(target.box,new THREE.Vector3()), 'the former box-only hit leaked through');
  assert.equal(target.hitTest?.(ray) ?? true,false,'the auxiliary housing must reject the main-screen hit');
  const front=new THREE.Vector3(13.3,1.32,-10.5);
  assert.equal(target.hitTest(new THREE.Ray(front,hall.workstation.screens[0].position.clone().sub(front).normalize())),true);
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
  assert.ok(floorAt(HALL_EXHIBIT.plinth / 2 - .1, 0) < HALL_EXHIBIT_TOP, 'the broad lower step is below the upper platform');
  assert.ok(floorAt(HALL_EXHIBIT.plinth / 2 - .1, 0) > 0);
  assert.equal(floorAt(HALL_EXHIBIT.plinth / 2 + .1, 0), 0);
  // Nothing in the hall stands a collider over the centre, so a jump or a short
  // flight passes above the little glass pyramid instead of hitting a wall.
  assert.deepEqual(hall.obstacles.filter(o => o.x0 < 0 && o.x1 > 0 && o.z0 < 0 && o.z1 > 0), []);
  const navs = nav();
  assert.ok(navs.canStand(0, 0), 'the plinth top is not walkable');
  assert.ok(navs.findPath({ x: -4, z: 0 }, { x: 4, z: 0 }), 'the centre lane does not cross the display');
});

test('the central armillary replaces the cone with solid rings and a glass core', () => {
  const instrument = hall.exhibit.mesh;
  assert.equal(instrument.name, 'hall-exhibit');
  assert.equal(instrument.isGroup, true, 'the old single glass cone is replaced');
  const support = instrument.getObjectByName('armillary-base');
  const core = instrument.getObjectByName('armillary-core');
  const bands = ['armillary-ring-outer', 'armillary-ring-middle', 'armillary-ring-inner'].map(n => instrument.getObjectByName(n));
  assert.ok(support?.isMesh && core?.isMesh && bands.every(b => b?.isMesh));
  assert.equal(support.userData.ringCount, 3);
  assert.ok(support.geometry.attributes.normal && (support.geometry.index?.count ?? support.geometry.attributes.position.count) > 500, 'the support has a solid lit surface');
  for (const band of bands) assert.ok((band.geometry.index?.count ?? band.geometry.attributes.position.count) > 500, 'every band has a solid lit surface');
  assert.equal(core.geometry.type, 'OctahedronGeometry');
  assert.ok(core.material.transparent && core.material.opacity > .4 && core.material.opacity < .9);
  assert.equal(instrument.position.x, 0); assert.equal(instrument.position.z, 0);
  assert.equal(instrument.position.y, HALL_EXHIBIT_TOP, 'the existing low stone base is reused');
  let cones = 0; instrument.traverse(o => { if (o.geometry?.type === 'ConeGeometry') cones++ });
  assert.equal(cones, 0, 'the previous pyramid does not coexist with the new instrument');
});

test('the museum armillary has a larger banded frame, separate gimbal and defined crystal edges', () => {
  const instrument = hall.exhibit.mesh;
  assert.ok(HALL_EXHIBIT.armillary.radii[0] >= 1.18 && HALL_EXHIBIT.armillary.radii[0] <= 1.3);
  assert.ok(HALL_EXHIBIT.armillary.tube >= .025 && HALL_EXHIBIT.armillary.tube <= .03);
  const base = instrument.getObjectByName('armillary-base');
  assert.ok(base?.isMesh && base.parent === instrument, 'the mounting is a static mesh directly under the exhibit');
  assert.ok(instrument.getObjectByName('armillary-core-edges')?.isLineSegments);
  assert.ok(instrument.getObjectByName('armillary-core').geometry.parameters.radius >= .32);
  assert.ok(instrument.getObjectByName('armillary-ring-outer'), 'the outer main ring still exists');
});

test('each band turns on its own axle, at its own period, and nothing else moves', () => {
  const instrument = hall.exhibit.mesh, tau = Math.PI * 2;
  const spin = HALL_EXHIBIT.armillary.spin;
  assert.deepEqual(spin, { outer: 20, middle: 40, inner: 60, core: 10 });
  const base = instrument.getObjectByName('armillary-base');
  const outer = instrument.getObjectByName('armillary-spin-outer');
  const gimbal = instrument.getObjectByName('armillary-gimbal');
  const inner = instrument.getObjectByName('armillary-spin-inner');
  const core = instrument.getObjectByName('armillary-core');
  assert.ok(outer?.isGroup && gimbal?.isGroup && inner?.isGroup, 'each turning part has its own axle group');
  // A real gimbal nests: the middle axle rides on the outer ring, the inner on
  // the middle one, so every attitude change is carried by real bearings.
  assert.equal(gimbal.parent, outer); assert.equal(inner.parent, gimbal);
  const pose = () => [outer.rotation.z, gimbal.rotation.y, inner.rotation.x, core.rotation.y];
  const still = [base.rotation.x, base.rotation.y, base.rotation.z];
  const before = pose();
  hall.exhibit.update(2);
  const after = pose();
  const turn = after.map((a, i) => ((a - before[i]) % tau + tau) % tau);
  const want = [tau * 2 / spin.outer, tau * 2 / spin.middle, tau * 2 / spin.inner, tau * 2 / spin.core];
  for (let i = 0; i < 4; i++) assert.ok(Math.abs(turn[i] - want[i]) < 1e-9, `part ${i} does not complete its period`);
  assert.deepEqual([base.rotation.x, base.rotation.y, base.rotation.z], still, 'the mounting never turns');
  assert.deepEqual([outer.rotation.x, outer.rotation.y, gimbal.rotation.x, gimbal.rotation.z, inner.rotation.y, inner.rotation.z], [0, 0, 0, 0, 0, 0], 'each axle uses exactly one axis');
  // Two updates must equal one update of twice the length, so the motion is
  // driven by delta time rather than by the frame count.
  const once = [...pose()]; hall.exhibit.update(2); const twice = pose();
  const half = twice.map((a, i) => ((a - once[i]) % tau + tau) % tau);
  assert.ok(half.every((d, i) => Math.abs(d - want[i]) < 1e-9), 'the motion steps by time, not by frames');
});

test('each driven band carries one short comet arc, never a glowing hoop', () => {
  const instrument = hall.exhibit.mesh;
  const spec = HALL_EXHIBIT.armillary.trails;
  const outer = instrument.getObjectByName('armillary-trail-outer');
  const middle = instrument.getObjectByName('armillary-trail-middle');
  assert.ok(outer?.isMesh && middle?.isMesh, 'both driven bands carry a trail');
  // The arcs hang off the turning groups, so they ride the real motion without a
  // single per-frame write; the fixed band and the mounting stay dark.
  assert.equal(outer.parent, instrument.getObjectByName('armillary-spin-outer'));
  assert.equal(middle.parent, instrument.getObjectByName('armillary-gimbal'));
  assert.equal(instrument.getObjectByName('armillary-spin-inner').children.some(o => /trail/.test(o.name ?? '')), false);
  assert.equal(outer.material, middle.material, 'one shared additive material covers both arcs');
  const material = outer.material;
  assert.equal(material.blending, THREE.AdditiveBlending, 'light adds to what is behind it');
  assert.equal(material.transparent, true);
  assert.equal(material.depthWrite, false, 'the glow leaves no depth of its own');
  assert.equal(material.toneMapped, false);
  assert.equal(material.side, THREE.DoubleSide, 'the ribbon reads from both faces of the ring');
  assert.equal(material.forceSinglePass, true, 'one draw per arc, not a back-face plus front-face pass');
  assert.equal(outer.castShadow, false); assert.equal(middle.castShadow, false);
  for (const [mesh, wanted] of [[outer, spec.outer], [middle, spec.middle]]) {
    const geometry = mesh.geometry;
    const colour = geometry.getAttribute('color');
    assert.equal(colour.itemSize, 4, 'the fade lives in the vertex alpha channel');
    const position = geometry.getAttribute('position');
    const rows = 5, segs = colour.count / rows - 1;
    assert.equal(segs, 30, 'one baked ribbon, thirty segments');
    assert.equal(geometry.index.count / 3, 240, 'a 240-triangle arc, not a second ring');
    const alphaAt = i => colour.getW(i * rows + 2);
    assert.ok(alphaAt(segs) > 8 * alphaAt(0), 'the head is far brighter than the tail, so the arc has a direction');
    // The arc spans the configured degrees and sits outside the machined rim.
    const head = new THREE.Vector3().fromBufferAttribute(position, 2);
    const tail = new THREE.Vector3().fromBufferAttribute(position, segs * rows + 2);
    const chord = head.distanceTo(tail), radius = head.length();
    const span = 2 * Math.asin(chord / (2 * radius)) * 180 / Math.PI;
    assert.ok(Math.abs(span - wanted.arc) < 1, `arc spans ${span.toFixed(1)} degrees, wanted ${wanted.arc}`);
    const rim = HALL_EXHIBIT.armillary.radii[[outer, middle].indexOf(mesh)];
    assert.ok(radius > rim + HALL_EXHIBIT.armillary.band / 2, 'the arc rides clear of the rim');
    assert.ok(radius < rim + .2, 'but stays close enough to read as part of the instrument');
    // Pale cyan outside, warm gold inside, and never a saturated neon.
    const r = colour.getX(segs * rows + 2), g = colour.getY(segs * rows + 2), b = colour.getZ(segs * rows + 2);
    if (mesh === outer) assert.ok(g >= r && b >= r, 'the outer arc is pale cyan');
    else assert.ok(r > g && g > b, 'the middle arc is warm gold');
    assert.ok(Math.max(r, g, b) < 2, 'the arc stays under a bloom threshold; there is no bloom to feed anyway');
  }
  // Nothing may be rebuilt while the rings turn: the animation moves groups only.
  const baked = [outer.geometry, middle.geometry, outer.material, middle.material];
  for (let i = 0; i < 12; i++) hall.exhibit.update(1.7);
  assert.deepEqual([outer.geometry, middle.geometry, outer.material, middle.material], baked, 'the arcs are baked once');
});

test('the crystal glows from inside without ever being a lamp', () => {
  const instrument = hall.exhibit.mesh;
  assert.equal(HALL_EXHIBIT.armillary.glow, undefined, 'the crystal glow is a constant, not a tuned rhythm');
  const core = instrument.getObjectByName('armillary-core');
  const kernel = instrument.getObjectByName('armillary-core-inner');
  const edges = instrument.getObjectByName('armillary-core-edges');
  assert.ok(kernel?.isMesh && kernel.parent === core, 'the lit kernel sits inside the glass shell');
  assert.ok(core.material.emissive.getHex() !== 0, 'the shell carries its own colour, not a lamp');
  assert.ok(core.material.emissiveIntensity > .2 && core.material.emissiveIntensity < .8);
  assert.ok(kernel.material.emissiveIntensity > core.material.emissiveIntensity, 'the inner core is the brighter layer');
  // The breath was removed: a +/-15% swing on these two intensities only moved
  // the crystal's mean pixel luminance 2.3%, so a steady value reads better than
  // an imperceptible rhythm. Nothing may animate the intensities again.
  const base = { shell: core.material.emissiveIntensity, kernel: kernel.material.emissiveIntensity };
  for (let i = 0; i < 20; i++) hall.exhibit.update(.5);
  assert.equal(core.material.emissiveIntensity, base.shell, 'the shell glow holds steady');
  assert.equal(kernel.material.emissiveIntensity, base.kernel, 'the kernel glow holds steady');
  assert.ok(edges?.isLineSegments, 'the edge wires stay available to catch the glow');
  // Nothing else in the exhibit is emissive, so the glow stays a core effect.
  let emissive = 0;
  instrument.traverse(o => { if (o.isMesh && o.material.emissive && o.material.emissive.getHex() !== 0) emissive++ });
  assert.equal(emissive, 2, 'only the glass shell and its kernel are emissive; the brass never glows');
});

test('the plinth corners carry dim warm panes and the floor emblem gains one lit wire layer', () => {
  const position = new THREE.Vector3();
  const atCorner = i => {
    position.setFromMatrixPosition(i.matrix);
    return Math.abs(Math.abs(position.x) - 1.19) < 1e-6 && Math.abs(Math.abs(position.z) - 1.19) < 1e-6;
  };
  const lamps = hall.batches.hall.items.opaque.filter(i => atCorner(i) && i.emissive > 0);
  assert.equal(lamps.length, 4, 'one lantern pane in each corner');
  for (const lamp of lamps) {
    assert.ok(Math.abs(lamp.emissive - HALL_EXHIBIT.lantern.emissive) < 1e-9, 'every corner burns at the same value');
    assert.ok(lamp.emissive > .3 && lamp.emissive <= .6, 'the pane stays a decoration, not a streetlight');
    const { r, g, b } = lamp.color;
    assert.ok(r > g && g > b, 'the pane is warm amber rather than white');
    assert.equal(lamp.shadow, false, 'an emissive pane casts no shadow of its own');
  }
  // The floor keeps its multiplied inlay and adds exactly one additive layer,
  // so the wire catches light without a light being added to the scene.
  assert.deepEqual(floor.planes.map(p => p.name), ['hall-emblem', 'hall-emblem-shine']);
  const [inlay, shine] = floor.planes;
  assert.equal(inlay.material.blending, THREE.MultiplyBlending);
  assert.equal(shine.material.blending, THREE.AdditiveBlending);
  assert.ok(shine.material.opacity <= .25, 'the catch-light is a whisper');
  assert.ok(shine.material.transparent && shine.material.depthWrite === false, 'nothing writes depth, so nothing z-fights');
  assert.ok(shine.position.y > inlay.position.y, 'the lit layer sits above the inlay');
  const lights = [];
  for (const plane of floor.planes) plane.traverse?.(o => { if (o.isLight) lights.push(o) });
  assert.equal(lights.length, 0, 'the emblem ships no light of its own');
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
