import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';

export function buildGallery(layer) {
  const B = new BoxBatch(layer), planes = [], hotspots = [], state = { ready: false, error: null };
  function artwork(file) {
    const texture = new THREE.TextureLoader().load(`assets/gallery/${file}`, () => { state.ready = true; }, undefined, () => { state.error = 'Artwork could not load'; });
    texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }
  const art = artwork('miku-glass.webp');
  function frame(x, y, z, width, height, map, id) {
    // Face the original western entrance. Both sides remain visible in flight.
    B.at(x, y, z, -Math.PI / 2, () => {
      for (const dx of [-width / 2 - .06, width / 2 + .06]) B.box(dx, -height / 2 - .1, 0, .09, height + .2, .12, { tex: 'paint', tint: 0xc4ab7d });
      for (const dy of [-height / 2 - .1, height / 2 + .1]) B.box(0, dy, 0, width + .2, .09, .12, { tex: 'paint', tint: 0xc4ab7d });
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }));
    mesh.name = `suspended-${id}`; mesh.position.set(x, y, z); mesh.rotation.y = -Math.PI / 2; planes.push(mesh);
    // Cables end below the sloping glass rather than extending outside it.
    const roof = 24.8 * (1 - Math.max(Math.abs(x), Math.abs(z)) / 18.2) - .5;
    for (const dz of [-width * .4, width * .4]) {
      const bottom = y + height / 2 + .15, top = Math.min(roof, bottom + 4);
      if (top > bottom) B.box(x, bottom, z + dz, .025, top - bottom, .025, { tex: 'black_metal' });
    }
    if (id === 'miku') hotspots.push({ id, box: new THREE.Box3(new THREE.Vector3(x - .2, y - height / 2, z - width / 2), new THREE.Vector3(x + .2, y + height / 2, z + width / 2)) });
  }
  frame(1, 8.6, 0, 3.2, 4.8, art, 'miku');
  return { batches: { gallery: B }, planes, hotspots, state };
}
