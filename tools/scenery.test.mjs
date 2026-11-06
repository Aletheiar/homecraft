import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(s, ctx, next) {
  return s === 'three' ? { url: new URL('../vendor/three/three.module.min.js', import.meta.url).href, shortCircuit: true } : next(s, ctx);
} });
const THREE = await import('three');
const { partitionSceneryGeometry, partitionScenery } = await import('../world/scenery.js');

test('scenery partitions retain all triangles, winding, attributes and conservative local bounds', () => {
  const source = new THREE.BufferGeometry();
  const positions = [], indices = [];
  for (const [x, z] of [[-100,-100], [100,-100], [-100,100], [100,100]]) {
    const i = positions.length / 3;
    positions.push(x, 0, z, x + 1, 0, z, x, 2, z + 1); indices.push(i, i + 1, i + 2);
  }
  source.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  source.setAttribute('color', new THREE.Float32BufferAttribute(positions.map(() => .81), 3));
  source.setIndex(indices);
  const parts = partitionSceneryGeometry(source), actual = [];
  assert.equal(parts.length, 4);
  const v = new THREE.Vector3();
  for (const { geometry } of parts) {
    assert.equal(geometry.attributes.position, source.attributes.position);
    assert.equal(geometry.attributes.color, source.attributes.color);
    actual.push(...geometry.index.array);
    for (const i of geometry.index.array) {
      v.fromBufferAttribute(source.attributes.position, i);
      assert.ok(geometry.boundingBox.containsPoint(v));
      assert.ok(geometry.boundingSphere.containsPoint(v));
    }
    assert.ok(geometry.boundingSphere.radius < 2, 'bounds use referenced vertices, not the full shared buffer');
  }
  assert.deepEqual(actual, indices);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 40);
  cam.position.set(100, 1, 110); cam.lookAt(100, 1, 100); cam.updateMatrixWorld();
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  assert.equal(parts.filter(p => frustum.intersectsSphere(p.geometry.boundingSphere)).length, 1);
});

test('near and distant batching share GPU data and switch without changing surface coverage', () => {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (const [x,z] of [[-100,-100],[100,-100],[-100,100],[100,100]]) positions.push(x,0,z, x+1,0,z, x,1,z+1);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const indices = new Uint32Array(900012);
  for (let i = 0; i < indices.length; i++) indices[i] = i % 12;
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  const scene = new THREE.Scene(), mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  mesh.name = 'large-facade'; scene.add(mesh); partitionScenery(scene);
  const lod = scene.getObjectByName('large-facade-batches'), regions = lod.levels[0].object;
  assert.equal(lod.levels[1].object, mesh);
  assert.equal(regions.children.length, 4);
  let end = 0;
  for (const part of regions.children) {
    assert.equal(part.material, mesh.material);
    assert.equal(part.geometry.attributes.position, geometry.attributes.position);
    assert.equal(part.geometry.index, geometry.index, 'all batches share the same GPU index buffer');
    assert.equal(part.geometry.drawRange.start, end);
    end += part.geometry.drawRange.count;
  }
  assert.equal(end, indices.length);
  const counts = Array(12).fill(0); for (const i of geometry.index.array) counts[i]++;
  assert.ok(counts.every(n => n === indices.length / 12));
  scene.updateMatrixWorld();
  const camera = new THREE.PerspectiveCamera(); camera.position.set(0,2,8); camera.updateMatrixWorld(); lod.update(camera);
  assert.equal(regions.visible, true); assert.equal(mesh.visible, false);
  camera.position.set(0,100,100); camera.updateMatrixWorld(); lod.update(camera);
  assert.equal(regions.visible, false); assert.equal(mesh.visible, true);
});
