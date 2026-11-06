import * as THREE from 'three';

// Partition only the dominant opaque facade, after its original normals and
// directional colors have been computed. Shared attributes preserve those
// colors exactly, including the boundary vertices. No surfaces are simplified.
export function partitionSceneryGeometry(source, cellSize = 128) {
  const position = source.attributes.position, index = source.index;
  if (!index || !Number.isFinite(cellSize) || cellSize <= 0) throw new Error('Indexed geometry and a positive cell size are required.');
  const bins = new Map();
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
    const x = (position.getX(a) + position.getX(b) + position.getX(c)) / 3;
    const z = (position.getZ(a) + position.getZ(b) + position.getZ(c)) / 3;
    const key = `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
    if (!bins.has(key)) bins.set(key, []);
    bins.get(key).push(a, b, c);
  }
  const point = new THREE.Vector3();
  return [...bins].map(([key, indices]) => {
    const geometry = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(source.attributes)) geometry.setAttribute(name, attribute);
    geometry.setIndex(indices);
    // Three's automatic bounds scan every shared vertex, which would give all
    // partitions the original oversized sphere and defeat frustum culling.
    const box = new THREE.Box3();
    for (const id of indices) box.expandByPoint(point.fromBufferAttribute(position, id));
    const sphere = new THREE.Sphere(box.getCenter(new THREE.Vector3()), 0);
    for (const id of indices) sphere.radius = Math.max(sphere.radius, sphere.center.distanceTo(point.fromBufferAttribute(position, id)));
    sphere.radius += 1e-6;
    geometry.boundingBox = box; geometry.boundingSphere = sphere;
    return { key, geometry };
  });
}

export function partitionScenery(model) {
  const candidates = [];
  model.traverse(mesh => {
    if (mesh.isMesh && mesh.geometry.index?.count > 900000 && !mesh.material.transparent) candidates.push(mesh);
  });
  for (const mesh of candidates) {
    const chunks = partitionSceneryGeometry(mesh.geometry);
    // One shared index buffer supports both the full facade and region draw
    // ranges. Switching batching mode duplicates neither vertices nor GPU indices.
    const index = new THREE.BufferAttribute(new Uint32Array(mesh.geometry.index.count), 1);
    let offset = 0;
    const regions = new THREE.Group(); regions.name = `${mesh.name}-regions`;
    for (const { key, geometry } of chunks) {
      const count = geometry.index.count;
      index.array.set(geometry.index.array, offset);
      geometry.setIndex(index); geometry.setDrawRange(offset, count); offset += count;
      const part = mesh.clone(false);
      part.name = `${mesh.name}-region-${key}`; part.geometry = geometry;
      regions.add(part);
    }
    mesh.geometry.setIndex(index);
    const lod = new THREE.LOD(); lod.name = `${mesh.name}-batches`;
    mesh.parent.add(lod);
    lod.addLevel(regions, 0); lod.addLevel(mesh, 70);
    // Both levels contain the same triangles. Near cameras benefit from region
    // culling; the distant overview retains the original single draw call.
  }
}
