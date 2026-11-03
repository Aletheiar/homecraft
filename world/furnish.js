import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';

export function furnishHall(layer) {
  const B = new BoxBatch(layer), planes = [], obstacles = [], hotspots = [], bakes = [];
  const wood = { tex: 'walnut' }, brass = { tex: 'paint', tint: 0xa98b4e }, pale = { tex: 'plaster' };
  function obstacle(x, z, w, d) { x *= 1.25; z *= 1.25; obstacles.push({ x0: x - w / 2 - .07, x1: x + w / 2 + .07, z0: z - d / 2 - .07, z1: z + d / 2 + .07, level: 0 }); }
  function box(x, y, z, w, h, d, mat = wood) { B.box(x * 1.25, y, z * 1.25, w, h, d, mat); }
  box(0, .08, -.7, 2.8, .75, 1.5, pale); obstacle(0, -.7, 2.8, 1.5);
  box(0, .85, -.7, 2.95, .07, 1.65, brass);
  const mini = new THREE.Mesh(new THREE.ConeGeometry(.7, .85, 4), new THREE.MeshStandardMaterial({ color: 0x91c6c4, transparent: true, opacity: .7, roughness: .3 }));
  mini.rotation.y = Math.PI / 4; mini.position.set(0, 1.34, -.875); planes.push(mini);
  for (const x of [-10.7, -3.7]) {
    box(x, .04, -7.7, 1.25, 1.7, 2, { tex: 'bookshelf', top: 'walnut' }); obstacle(x, -7.7, 1.25, 2);
  }
  for (const x of [4.4, 7, 9.6]) {
    box(x, .04, -9, 1.5, .9, 1.5, pale); obstacle(x, -9, 1.5, 1.5);
    box(x, 1, -9, .8, .7, .8, { tex: 'paint', tint: 0x537d70 });
    box(x, 1.72, -9, 1, .05, 1, brass);
  }
  box(-9, .05, 8, 3.2, .45, 1.1, { tex: 'linen' }); box(-9, .5, 8.4, 3.2, .5, .3, wood); obstacle(-9, 8, 3.2, 1.2);
  box(-5.3, .04, 8, 1.2, .48, 1.2, pale); obstacle(-5.3, 8, 1.2, 1.2);
  box(7, .05, 8, 3.5, .74, 1.4, wood); obstacle(7, 8, 3.5, 1.4);
  box(7, .8, 8, .8, .08, .5, { tex: 'paint', tint: 0xf4e5c4 });
  for (const x of [-10.5, 10.5]) for (const z of [-3, 4]) {
    box(x, .04, z, .6, .5, .6, { tex: 'terracotta' });
    box(x, .54, z, .9, .8, .9, { tex: 'leaves' }); obstacle(x, z, .9, .9);
  }
  return { batches: { hall: B }, planes, obstacles, hotspots, bakes };
}
