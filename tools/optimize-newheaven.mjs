// Lossless, bounded GLB cleanup. No coordinate welding, decimation or UV edits.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export function optimizeGLB(raw) {
  if (raw.length < 28 || raw.toString('ascii', 0, 4) !== 'glTF' || raw.readUInt32LE(4) !== 2 || raw.readUInt32LE(8) !== raw.length) throw new Error('Invalid GLB header.');
  const jsonLength = raw.readUInt32LE(12), binaryHeader = 20 + jsonLength;
  if (raw.readUInt32LE(16) !== 0x4e4f534a || binaryHeader + 8 > raw.length || raw.readUInt32LE(binaryHeader + 4) !== 0x004e4942 || binaryHeader + 8 + raw.readUInt32LE(binaryHeader) !== raw.length) throw new Error('Expected JSON and BIN GLB chunks.');
  const doc = JSON.parse(raw.toString('utf8', 20, binaryHeader)), bin = raw.subarray(binaryHeader + 8);
  if (doc.buffers.length !== 1 || doc.buffers[0].uri) throw new Error('Only a single embedded GLB buffer is supported.');
  const views = doc.bufferViews.map(v => {
    const offset = v.byteOffset || 0;
    if (v.buffer !== 0 || offset < 0 || offset + v.byteLength > bin.length) throw new Error('Invalid GLB buffer view.');
    return Buffer.from(bin.subarray(offset, offset + v.byteLength));
  });
  const replacements = new Map(), processed = new Set();
  let trianglesBefore = 0, trianglesAfter = 0, packedAccessors = 0;
  for (const mesh of doc.meshes) for (const primitive of mesh.primitives) {
    if ((primitive.mode ?? 4) !== 4 || primitive.indices === undefined) throw new Error('Only indexed triangle primitives are supported.');
    if (processed.has(primitive.indices)) throw new Error('Shared index accessors require a separate audit.');
    processed.add(primitive.indices);
    const a = doc.accessors[primitive.indices], p = doc.accessors[primitive.attributes.POSITION];
    const iv = doc.bufferViews[a.bufferView], pv = doc.bufferViews[p.bufferView];
    const width = a.componentType === 5125 ? 4 : a.componentType === 5123 ? 2 : a.componentType === 5121 ? 1 : 0;
    if (!width || a.type !== 'SCALAR' || a.count % 3 || a.sparse || iv.byteStride || (a.byteOffset || 0) !== 0 || a.count * width !== iv.byteLength || doc.accessors.some((other, id) => id !== primitive.indices && other.bufferView === a.bufferView)) throw new Error('Unsupported index buffer layout.');
    if (p.componentType !== 5126 || p.type !== 'VEC3' || p.sparse) throw new Error('Expected float32 positions.');
    const positions = views[p.bufferView], stride = pv.byteStride || 12, offset = p.byteOffset || 0;
    if (offset + (p.count - 1) * stride + 12 > positions.length) throw new Error('Invalid position bounds.');
    const source = views[a.bufferView];
    const getIndex = i => width === 4 ? source.readUInt32LE(i * 4) : width === 2 ? source.readUInt16LE(i * 2) : source[i];
    const point = i => {
      if (i >= p.count) throw new Error('Index exceeds position bounds.');
      const at = offset + i * stride;
      const xyz = [positions.readFloatLE(at), positions.readFloatLE(at + 4), positions.readFloatLE(at + 8)];
      if (!xyz.every(Number.isFinite)) throw new Error('Non-finite position.');
      return xyz;
    };
    const kept = [];
    for (let i = 0; i < a.count; i += 3) {
      const ids = [getIndex(i), getIndex(i + 1), getIndex(i + 2)], [x, y, z] = ids.map(point);
      const u = y.map((v, k) => v - x[k]), v = z.map((n, k) => n - x[k]);
      // Exact arithmetic comparison on decoded float32 values. A thin but
      // nonzero triangle is retained, regardless of how small it is.
      if (u[1]*v[2]-u[2]*v[1] === 0 && u[2]*v[0]-u[0]*v[2] === 0 && u[0]*v[1]-u[1]*v[0] === 0) continue;
      kept.push(...ids);
    }
    if (!kept.length) throw new Error('Empty primitives require a separate hierarchy cleanup.');
    let min = Infinity, max = -Infinity;
    for (const id of kept) { min = Math.min(min, id); max = Math.max(max, id); }
    const packedWidth = max <= 65535 ? 2 : 4;
    const replacement = Buffer.alloc(kept.length * packedWidth);
    for (let i = 0; i < kept.length; i++) packedWidth === 2 ? replacement.writeUInt16LE(kept[i], i * 2) : replacement.writeUInt32LE(kept[i], i * 4);
    replacements.set(a.bufferView, replacement);
    trianglesBefore += a.count / 3; trianglesAfter += kept.length / 3;
    if (width > packedWidth) packedAccessors++;
    a.count = kept.length; a.componentType = packedWidth === 2 ? 5123 : 5125; a.min = [min]; a.max = [max];
  }
  const chunks = []; let length = 0;
  for (let i = 0; i < views.length; i++) {
    const bytes = replacements.get(i) || views[i], padding = (4 - length % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); length += padding; }
    doc.bufferViews[i].byteOffset = length; doc.bufferViews[i].byteLength = bytes.length;
    chunks.push(bytes); length += bytes.length;
  }
  doc.buffers[0].byteLength = length;
  if (length % 4) chunks.push(Buffer.alloc(4 - length % 4));
  const binary = Buffer.concat(chunks), text = Buffer.from(JSON.stringify(doc));
  const json = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20), binaryChunk = Buffer.alloc(8);
  header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + binary.length, 8);
  header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  binaryChunk.writeUInt32LE(binary.length); binaryChunk.writeUInt32LE(0x004e4942, 4);
  const buffer = Buffer.concat([header, json, binaryChunk, binary]);
  const sha = b => createHash('sha256').update(b).digest('hex');
  return { buffer, report: { bytesBefore: raw.length, bytesAfter: buffer.length, trianglesBefore, trianglesAfter, removedTriangles: trianglesBefore - trianglesAfter, packedAccessors, sourceSha256: sha(raw), outputSha256: sha(buffer) } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const write = process.argv.includes('--write'), args = process.argv.slice(2).filter(a => a !== '--write');
  const paths = args.length ? args : ['assets/models/newheaven-courtyard.glb', 'assets/models/newheaven-scenery.glb'];
  for (const path of paths) {
    const { buffer, report } = optimizeGLB(readFileSync(path));
    if (write) writeFileSync(path, buffer);
    console.log(JSON.stringify({ path, written: write, ...report }));
  }
}
