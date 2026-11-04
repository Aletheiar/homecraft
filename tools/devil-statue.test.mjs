import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.min.js';
import { ANGEL_PLACEMENT, createAngelBoxes } from '../world/statue-data.js';
const devil = await import('../world/devil-statue.js').catch(() => ({}));

test('the devil monument mirrors the angel across the entrance axis', () => {
  assert.equal(typeof devil.createDevilBoxes, 'function');
  assert.deepEqual(devil.DEVIL_PLACEMENT, { x: ANGEL_PLACEMENT.x, z: -ANGEL_PLACEMENT.z, yaw: ANGEL_PLACEMENT.yaw });
  const boxes = devil.createDevilBoxes();
  assert.ok(Math.max(...boxes.map(b => b.y + b.h)) <= 12);
  assert.ok((boxes.length + createAngelBoxes().length) * 12 < 10000);
  for (const b of boxes) {
    assert.ok([b.x,b.y,b.z,b.w,b.h,b.d].every(Number.isFinite));
    assert.ok(b.w > 0 && b.h > 0 && b.d > 0 && b.y >= 0);
    assert.ok(devil.DEVIL_PALETTE[b.tone] !== undefined);
  }
});

test('the Devil Room prop has two raised horns, a goat jaw, eyes and folded bat wings', () => {
  assert.equal(typeof devil.createDevilBoxes, 'function');
  const boxes = devil.createDevilBoxes(), horns = boxes.filter(b => b.part === 'horn');
  const face = boxes.filter(b => b.part === 'goat-face'), wings = boxes.filter(b => b.part === 'bat-wing');
  assert.ok(horns.some(b => b.x < -1) && horns.some(b => b.x > 1));
  assert.ok(Math.max(...horns.map(b => b.y+b.h)) > Math.max(...face.map(b => b.y+b.h)) + .6);
  assert.ok(boxes.some(b => b.part === 'eye' && b.x < 0) && boxes.some(b => b.part === 'eye' && b.x > 0));
  assert.ok(boxes.some(b => b.part === 'goat-snout') && boxes.some(b => b.part === 'pointed-jaw'));
  assert.ok(wings.some(b => b.x < -2) && wings.some(b => b.x > 2));
  assert.ok(boxes.some(b => b.part === 'raised-hand') && boxes.some(b => b.part === 'open-hand'));
});

test('runtime replacement removes the old horse without removing distant or spanning scenery', () => {
  assert.equal(typeof devil.removeHorseGeometry, 'function');
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -63,5,19, -62,5,19, -62,6,19,
    -1,5,19, 0,5,19, 0,6,19,
    -100,0,0, 0,0,0, 0,0,100,
  ],3));
  assert.equal(devil.removeHorseGeometry(geometry), 1);
  assert.deepEqual(Array.from(geometry.index.array), [3,4,5,6,7,8]);
  assert.equal(devil.removeHorseGeometry(geometry), 0, 'Replacement is idempotent');
});
