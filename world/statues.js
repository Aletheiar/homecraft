import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { ANGEL_PLACEMENT, ANGEL_PALETTE, createAngelBoxes } from './statue-data.js';
import { DEVIL_PLACEMENT, DEVIL_PALETTE, createDevilBoxes } from './devil-statue.js';

export function buildStatues(layer) {
  const B = new BoxBatch(layer), boxes = createAngelBoxes();
  const { x, z, yaw } = ANGEL_PLACEMENT;
  B.at(x, 0, z, yaw, () => {
    for (const box of boxes) B.box(box.x, box.y, box.z, box.w, box.h, box.d,
      { tex: 'paint', tint: ANGEL_PALETTE[box.tone] }, { tag: `angel-${box.part}` });
  });
  const bounds = new THREE.Box3();
  const unit = new THREE.Box3(new THREE.Vector3(-.5, -.5, -.5), new THREE.Vector3(.5, .5, .5));
  for (const item of B.items.opaque) bounds.union(unit.clone().applyMatrix4(item.matrix));
  const devilBoxes = createDevilBoxes(), firstDevil = B.items.opaque.length;
  B.at(DEVIL_PLACEMENT.x, 0, DEVIL_PLACEMENT.z, DEVIL_PLACEMENT.yaw, () => {
    for (const box of devilBoxes) B.box(box.x, box.y, box.z, box.w, box.h, box.d,
      { tex: 'paint', tint: DEVIL_PALETTE[box.tone] }, { tag: `devil-${box.part}` });
  });
  const devilBounds = new THREE.Box3();
  for (const item of B.items.opaque.slice(firstDevil)) devilBounds.union(unit.clone().applyMatrix4(item.matrix));
  return {
    batches: { statues: B },
    // No navigable geometry is added: this is scenery beyond the courtyard.
    obstacles: [],
    metadata: {
      id: 'angel-monument', placement: { ...ANGEL_PLACEMENT },
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      height: bounds.max.y - bounds.min.y, boxCount: boxes.length, triangleCount: boxes.length * 12,
      facing: [1, 0, 0], subject: 'The Binding of Isaac Angel Room statue (room prop)',
      features: ['oversized blank oval face', 'gray head rim', 'separate upturned palms', 'downward folded wings', 'short seated robe'],
      source: 'Original procedural voxel fan adaptation from an inspected in-game room screenshot; not an official game asset',
      totalTriangleCount: (boxes.length + devilBoxes.length) * 12,
      devil: {
        id: 'devil-monument', placement: { ...DEVIL_PLACEMENT },
        bounds: { min: devilBounds.min.toArray(), max: devilBounds.max.toArray() },
        height: devilBounds.max.y - devilBounds.min.y, boxCount: devilBoxes.length,
        triangleCount: devilBoxes.length * 12, facing: [1, 0, 0],
        subject: 'The Binding of Isaac Devil Room statue (room prop)',
      },
    },
  };
}
