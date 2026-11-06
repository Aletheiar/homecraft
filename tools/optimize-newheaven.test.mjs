import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizeGLB } from './optimize-newheaven.mjs';

function fixture() {
  const positions = new Float32Array([0,0,0, 1,0,0, 0,1,0, 0,0,0, 1,0,0, 2,0,0, 0,0,0, 1,0,0, 0,1e-10,0]);
  const indices = new Uint32Array([0,1,2, 3,4,5, 6,7,8]);
  const image = Buffer.from([137,80,78,71,13,10,26,10]);
  const bin = Buffer.concat([Buffer.from(positions.buffer), Buffer.from(indices.buffer), image]);
  const doc = { asset: { version: '2.0' }, scenes: [{ nodes: [0] }], nodes: [{ name: 'preserved', mesh: 0, translation: [1,2,3] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{ doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [1,.8,.7,1] } }],
    images: [{ bufferView: 2, mimeType: 'image/png' }], buffers: [{ byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }, { buffer: 0, byteOffset: positions.byteLength, byteLength: indices.byteLength }, { buffer: 0, byteOffset: positions.byteLength + indices.byteLength, byteLength: image.length }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 9, type: 'VEC3', min: [0,0,0], max: [2,1,0] }, { bufferView: 1, componentType: 5125, count: 9, type: 'SCALAR', min: [0], max: [8] }] };
  const j = Buffer.from(JSON.stringify(doc)), json = Buffer.concat([j, Buffer.alloc((4-j.length%4)%4, 32)]);
  const raw = Buffer.alloc(28 + json.length + bin.length);
  raw.write('glTF'); raw.writeUInt32LE(2,4); raw.writeUInt32LE(raw.length,8); raw.writeUInt32LE(json.length,12); raw.writeUInt32LE(0x4e4f534a,16); json.copy(raw,20);
  raw.writeUInt32LE(bin.length,20+json.length); raw.writeUInt32LE(0x004e4942,24+json.length); bin.copy(raw,28+json.length);
  return { raw, doc, image, positions };
}
function unpack(raw) {
  const n = raw.readUInt32LE(12); return { doc: JSON.parse(raw.subarray(20,20+n)), bin: raw.subarray(28+n) };
}
test('only exact zero-area triangles are removed, indices packed, images and authored data preserved', () => {
  const f = fixture(), original = Buffer.from(f.raw), { buffer, report } = optimizeGLB(f.raw), { doc, bin } = unpack(buffer);
  assert.deepEqual(f.raw, original, 'input remains unchanged');
  assert.equal(report.removedTriangles, 1); assert.equal(report.trianglesBefore, 3); assert.equal(report.trianglesAfter, 2);
  assert.equal(doc.accessors[1].componentType, 5123); assert.equal(doc.accessors[1].count, 6);
  const view = doc.bufferViews[1];
  assert.deepEqual([...new Uint16Array(bin.buffer, bin.byteOffset + view.byteOffset, 6)], [0,1,2,6,7,8]);
  assert.deepEqual(doc.nodes, f.doc.nodes); assert.deepEqual(doc.materials, f.doc.materials); assert.deepEqual(doc.meshes, f.doc.meshes);
  assert.deepEqual(bin.subarray(0,f.positions.byteLength), Buffer.from(f.positions.buffer));
  const iv = doc.bufferViews[doc.images[0].bufferView]; assert.deepEqual(bin.subarray(iv.byteOffset,iv.byteOffset+iv.byteLength), f.image);
  assert.equal(optimizeGLB(buffer).report.removedTriangles, 0, 'optimization is idempotent');
});
test('malformed files and out-of-range indices fail before writing', () => {
  assert.throws(() => optimizeGLB(Buffer.from('not a glb')), /GLB/);
  const f = fixture(), n = f.raw.readUInt32LE(12); f.raw.writeUInt32LE(99, 28+n+f.positions.byteLength);
  assert.throws(() => optimizeGLB(f.raw), /index/i);
});
