import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: new URL('../vendor/three/three.module.min.js', import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith('@engine/')) return { url: new URL('../engine/' + specifier.slice(8), import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const THREE = await import('three');
const { PYRAMID } = await import('../world/boundaries.js');
const sculpture = await import('../world/ori-sculpture.js').catch(() => ({}));

test('the Ori display fits below the south-east glass and faces the central hall', () => {
  assert.equal(typeof sculpture.createOriSculpture, 'function', 'the independent Ori exhibit is missing');
  const exhibit = sculpture.createOriSculpture();
  exhibit.mesh.updateMatrixWorld(true);
  const front = new THREE.Vector3(0, 0, 1).transformDirection(exhibit.mesh.matrixWorld);
  const position = exhibit.mesh.position;
  assert.ok(position.x > 10 && position.z > 10);
  assert.ok(front.dot(new THREE.Vector3(-position.x, 0, -position.z).normalize()) > .98);
  const bounds = new THREE.Box3().setFromObject(exhibit.mesh);
  const size = bounds.getSize(new THREE.Vector3());
  assert.ok(size.y >= 2.2 && size.y <= 3.2, `display height: ${size.y}`);
  assert.ok(Math.max(size.x, size.z) < 4, 'the display must leave the corner routes open');
  const vertex = new THREE.Vector3();
  exhibit.mesh.traverse(object => {
    assert.ok(!object.isLight, 'the display must not add real-time lights');
    if (!object.isMesh) return;
    const attribute = object.geometry.attributes.position;
    for (let i = 0; i < attribute.count; i++) {
      vertex.fromBufferAttribute(attribute, i).applyMatrix4(object.matrixWorld);
      const ceiling = PYRAMID.height * (1 - Math.max(Math.abs(vertex.x), Math.abs(vertex.z)) / PYRAMID.half) - .6;
      assert.ok(vertex.y < ceiling, 'the display must remain below the glass membrane');
    }
  });
  assert.ok(exhibit.obstacles.every(o => o.x0 > 10 && o.z0 > 10));
});

test('the open spirit arc and sparse motes stay lightweight and respect paused motion', () => {
  assert.equal(typeof sculpture.createOriSculpture, 'function', 'the independent Ori exhibit is missing');
  const exhibit = sculpture.createOriSculpture();
  const arc = exhibit.mesh.getObjectByName('ori-spirit-arc');
  const motes = exhibit.mesh.getObjectByName('ori-spirit-motes');
  assert.ok(arc && motes);
  assert.equal(arc.geometry.parameters.path.closed, false);
  assert.ok(motes.geometry.attributes.position.count <= 16);
  const before = motes.geometry.attributes.position.array.slice();
  exhibit.update(.5);
  assert.notDeepEqual(motes.geometry.attributes.position.array, before);
  const after = motes.geometry.attributes.position.array.slice();
  exhibit.update(.5, false);
  assert.deepEqual(motes.geometry.attributes.position.array, after, 'hidden or reduced-motion displays should pause');
  let triangles = 0, draws = 0;
  exhibit.mesh.traverse(o => {
    if (o.isMesh) { triangles += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3; draws++; }
    if (o.isPoints) draws++;
  });
  assert.ok(triangles < 4500, `support geometry: ${triangles}`);
  assert.ok(draws <= 4, `support draw calls: ${draws}`);
});
