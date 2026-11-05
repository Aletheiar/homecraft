import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Resolve the browser import map without replacing camera or voxel behavior.
const layout = 'data:text/javascript,' + encodeURIComponent('export const ISLAND = { x0: -45, x1: 45, z0: -45, z1: 45 };');
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: new URL('../vendor/three/three.module.min.js', import.meta.url).href, shortCircuit: true };
  if (specifier === '@world/layout.js') return { url: layout, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const THREE = await import('three');
const { VoxelGrid } = await import('../engine/world/voxels.js');
const { createRig } = await import('../engine/world/rig.js');
const { createBoundarySource } = await import('../world/boundaries.js');
Object.assign(globalThis, { innerWidth: 1440, innerHeight: 950, matchMedia: () => ({ matches: false }) });

function fixture({ floor = false, x = .5, z = .5, viewBlock } = {}) {
  const grid = new VoxelGrid({ min: [-45, -4, -45], size: [90, 12, 90] });
  grid.define('stone', {});
  if (floor) grid.fill(-44, -4, -44, 44, 0, 44, 'stone');
  const camera = new THREE.PerspectiveCamera(46, 1440 / 950, .1, 600);
  const player = { pos: { x, z }, y: 0, swimming: false, gazing: false };
  const rig = createRig(camera, { grid, hidden: new Set(), setHidden() {}, viewBlock });
  const step = (frames = 120) => { for (let i = 0; i < frames; i++) rig.update(1 / 60, player); };
  const forward = () => camera.getWorldDirection(new THREE.Vector3());
  return { camera, player, grid, rig, step, forward };
}

test('dragging upward in third person can look above the horizon', () => {
  const h = fixture();
  h.rig.orbit(0, -300); h.step();
  assert.ok(h.forward().y > .3, 'upward input must produce an upward view');
});

test('a seated eye transition is smooth and restores the exact exploration view', () => {
  const h = fixture(); h.step();
  const saved = h.rig.captureView();
  const before = h.camera.position.clone();
  h.rig.setFirstPerson(true, Math.PI, { eyeHeight: 1.28, transition: true });
  assert.ok(h.camera.position.distanceTo(before) < 1e-9, 'setting the seat does not snap the eye');
  h.step(1);
  assert.ok(h.camera.position.distanceTo(before) < .1, 'the first frame eases out of the previous view');
  h.step(60);
  assert.ok(Math.abs(h.camera.position.y - 1.28) < 1e-6);
  assert.ok(h.forward().z < -.9, 'the visitor faces the desk');
  h.rig.restoreView(saved, { transition: true }); h.step();
  assert.deepEqual(h.rig.captureView(), saved);
  assert.ok(h.camera.position.distanceTo(before) < 1e-6);
});

test('first-person eye height and look direction survive a seat round trip', () => {
  const h = fixture();
  h.rig.setFirstPerson(true, .7); h.rig.orbit(40, -75); h.step();
  const saved = h.rig.captureView(), direction = h.forward();
  h.rig.setFirstPerson(true, Math.PI, { eyeHeight: 1.28, transition: true }); h.step();
  h.rig.restoreView(saved, { transition: true }); h.step();
  assert.equal(h.rig.firstPerson, true);
  assert.ok(Math.abs(h.camera.position.y - 1.62) < 1e-6);
  assert.ok(h.forward().distanceTo(direction) < 1e-6);
});

test('repeated extreme drags stay upright on both sides of the horizon', () => {
  const h = fixture();
  for (const dy of [-100000, 100000, -100000]) {
    h.rig.orbit(0, dy); h.step();
    const angle = Math.asin(h.forward().y);
    assert.ok(angle >= -1.4 && angle <= .82, `unsafe elevation ${angle}`);
    assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(h.camera.quaternion).y > .1);
    assert.ok(h.forward().z < 0, 'camera must not orbit past a vertical pole');
  }
});

test('programmatic follow views obey the same limits as dragging', () => {
  const h = fixture();
  for (const pitch of [-10, 10]) {
    h.rig.set(0, pitch, 8); h.step();
    assert.ok(h.forward().z < 0, 'setting a view must not invert the orbit');
    assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(h.camera.quaternion).y > .1);
  }
});

test('low third-person views keep the camera and near plane above voxel ground', () => {
  const h = fixture({ floor: true });
  for (const pitch of [-.035, -.3, -.8, -1.35]) {
    h.rig.set(0, pitch, 34); h.step();
    assert.ok(h.camera.position.y >= .2, `camera too low at pitch ${pitch}: ${h.camera.position.y}`);
    h.camera.updateMatrixWorld(true);
    for (const x of [-1, 1]) for (const y of [-1, 1]) {
      const corner = new THREE.Vector3(x, y, -1).unproject(h.camera);
      assert.ok(corner.y > 0, `near plane clips ground at pitch ${pitch}`);
    }
  }
});

test('nearby solids take priority over the old minimum follow distance', () => {
  const h = fixture();
  h.grid.fill(1, 0, 0, 2, 3, 1, 'stone');
  h.rig.set(Math.PI / 2, 0, 8); h.step();
  assert.ok(h.camera.position.x < .9, `camera passed into the wall: ${h.camera.position.x}`);
});

test('a near-plane corner cannot enter the shore while the camera centre is above water', () => {
  const h = fixture({ floor: true, x: .5, z: .05 });
  h.grid.fill(-44, -3, 0, 0, 0, 44, null);
  h.rig.set(-Math.PI / 2, -.08, 34); h.step();
  h.camera.updateMatrixWorld(true);
  for (const x of [-1, 1]) for (const y of [-1, 1]) {
    const p = new THREE.Vector3(x, y, -1).unproject(h.camera);
    assert.equal(h.grid.type(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))?.kind, undefined, `near plane entered the shore at ${p.toArray()}`);
  }
});

test('collapsing against a close wall preserves the intended viewing direction', () => {
  const h = fixture({ x: .69 });
  h.grid.fill(1, 0, -4, 2, 3, 4, 'stone');
  h.rig.set(Math.PI / 2, 0, 8); h.step();
  assert.ok(h.forward().x < -.99, `close-wall view changed direction: ${h.forward().toArray()}`);
  assert.ok(Math.abs(h.forward().z) < 1e-6);
  assert.ok(h.camera.position.x < 1);
});

test('an obstruction pulls the camera in immediately while recovery stays smooth', () => {
  const h = fixture();
  h.rig.set(Math.PI / 2, 0, 8); h.step();
  h.grid.fill(1, 0, 0, 2, 3, 1, 'stone'); h.step(1);
  assert.ok(h.camera.position.x < .9);
  h.grid.fill(1, 0, 0, 2, 3, 1, null); h.step(1);
  assert.ok(h.camera.position.x > .6 && h.camera.position.x < 2, 'return must ease out');
  h.step();
  assert.ok(h.camera.position.x > 8.4);
});

test('looking up beyond the voxel island cannot put the camera below the outer lawn', () => {
  const boundary = createBoundarySource();
  const h = fixture({ floor: true, x: 38, z: 0, viewBlock: boundary.viewBlock });
  h.rig.set(Math.PI / 2, -.08, 34); h.step();
  assert.ok(h.camera.position.y >= -.19, `camera below lawn clearance: ${h.camera.position.y}`);
});

test('outer lawn camera collisions leave the open courtyard and upward rays unobstructed', () => {
  const boundary = createBoundarySource();
  assert.equal(typeof boundary.viewBlock, 'function');
  assert.equal(boundary.viewBlock(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), 20), Infinity);
  assert.equal(boundary.viewBlock(new THREE.Vector3(50, 1, 0), new THREE.Vector3(0, 1, 0), 20), Infinity);
  assert.equal(boundary.viewBlock(new THREE.Vector3(50, 1, 0), new THREE.Vector3(0, -1, 0), .5), Infinity);
  assert.ok(Math.abs(boundary.viewBlock(new THREE.Vector3(50, 1, 0), new THREE.Vector3(0, -1, 0), 20) - 1.39) < 1e-6);
});

test('first-person looking and zooming back to third person still work', () => {
  const h = fixture({ floor: true });
  h.rig.setFirstPerson(true, Math.PI); h.rig.orbit(0, -1000); h.step();
  assert.ok(h.forward().y > .9);
  assert.ok(Math.abs(h.camera.position.y - 1.62) < 1e-6);
  h.rig.zoom(1.1); h.step();
  assert.equal(h.rig.firstPerson, false);
  assert.ok(h.camera.position.y > .2);
});
