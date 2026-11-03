import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';

export const pyramidState = { ready: false, sceneryReady: false, error: null, triangles: 0, sceneryTriangles: 0, shell: null, shellTop: null };

// Where the shell is opened up: the western door is a real gap in the model, and
// these boxes deepen it. A body walks through the hole it can see instead of a
// gap the code remembers from an earlier measurement of the same model.
const ENTRIES = [{ x0: -19.9, x1: -15.5, z: 3.7, y: 5.1 }];

// The shell's walkable top, sampled from the model itself: one height per cell,
// taken from the highest face that looks up, so what a visitor stands on is what
// the shell draws underfoot. The cell is finer than one 0.4 m block and the
// lookup averages its neighbours, which keeps the 0.4 m treads from asking the
// body to take a 0.8 m step at every riser.
const CELL = .2, SHELL_LOW = -18.4, SHELL_N = Math.round(36.8 / CELL) + 1;

// The model's lowest course is a full block (0.83 m) above the paving, one step
// more than a body can take on foot. A 0.6 m apron of the same stone turns that
// into two steps, and it is drawn as well as stood on, so the step a visitor
// climbs is a step they see. Its four corners stay open: that is where the pools
// begin.
const HALF = 18.2, PLINTH = { width: .6, top: .4 };

// Half-width of the andesite capstone on the apex, and the body radius that
// straddles its edge when a visitor stands on it.
const CAPSTONE = .6, BODY = .3, APEX = CAPSTONE + BODY;

// The western entry, where the shell's own surface is what a visitor stands on.
const ENTRY = { x0: -19.9, x1: -14.2, z: 5.6 };

function plinthTop(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  const r = Math.max(ax, az);
  if (r > HALF + PLINTH.width || Math.min(ax, az) > HALF) return null;
  return r > HALF ? PLINTH.top : null;
}

function buildPlinth() {
  const group = new THREE.Group();
  group.name = 'pyramid-plinth';
  const stone = new THREE.MeshStandardMaterial({ color: 0xc9d1cc, roughness: .86 });
  const span = HALF * 2, w = PLINTH.width, out = HALF + w / 2;
  for (const [x, z, sx, sz] of [[0, out, span, w], [0, -out, span, w], [out, 0, w, span], [-out, 0, w, span]]) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(sx, PLINTH.top, sz), stone);
    box.position.set(x, PLINTH.top / 2, z);
    box.castShadow = box.receiveShadow = true;
    group.add(box);
  }
  return group;
}

function buildShell(model) {
  const data = new Float32Array(SHELL_N * SHELL_N).fill(NaN);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3(), p = new THREE.Vector3();
  model.updateWorldMatrix(true, true);
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry;
    carve(mesh);
    const pos = geometry.attributes.position, idx = geometry.index;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      a.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2).applyMatrix4(mesh.matrixWorld);
      e1.subVectors(b, a); e2.subVectors(c, a); n.crossVectors(e1, e2).normalize();
      if (n.y < .5) continue;
      const x0 = Math.min(a.x, b.x, c.x), x1 = Math.max(a.x, b.x, c.x);
      const z0 = Math.min(a.z, b.z, c.z), z1 = Math.max(a.z, b.z, c.z);
      if (x1 < -18.2 || x0 > 18.2 || z1 < -18.2 || z0 > 18.2) continue;
      const area = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
      if (Math.abs(area) < 1e-9) continue;
      for (let x = x0 + .03; x < x1; x += .1) {
        for (let z = z0 + .03; z < z1; z += .1) {
          const l1 = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / area;
          const l2 = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / area;
          const l3 = 1 - l1 - l2;
          if (l1 < -.01 || l2 < -.01 || l3 < -.01) continue;
          p.copy(a).multiplyScalar(l1).addScaledVector(b, l2).addScaledVector(c, l3);
          const ix = Math.round((x - SHELL_LOW) / CELL), iz = Math.round((z - SHELL_LOW) / CELL);
          if (ix < 0 || iz < 0 || ix >= SHELL_N || iz >= SHELL_N) continue;
          const k = iz * SHELL_N + ix;
          if (!(data[k] >= p.y)) data[k] = p.y;
        }
      }
    }
  });
  // The lookup smooths its neighbourhood, but only across one riser: a cell on
  // the staircase averages with the cells within half a step of its own height,
  // so the 0.4 m treads read as a ramp while the capstone and the door edges stay
  // as sharp as they are drawn. A seam the raster missed takes the lowest surface
  // beside it, never a higher one, so no floor appears where a visitor sees none.
  const sample = (x, z) => {
    const ix = Math.round((x - SHELL_LOW) / CELL), iz = Math.round((z - SHELL_LOW) / CELL);
    if (ix < 0 || iz < 0 || ix >= SHELL_N || iz >= SHELL_N) return null;
    const own = data[iz * SHELL_N + ix];
    let sum = 0, seen = 0, low = Infinity;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const cx = ix + dx, cz = iz + dz;
      if (cx < 0 || cz < 0 || cx >= SHELL_N || cz >= SHELL_N) continue;
      const value = data[cz * SHELL_N + cx];
      if (!(value >= 0)) continue;
      if (value < low) low = value;
      if (own >= 0 && Math.abs(value - own) <= .9) { sum += value; seen++; }
    }
    if (own >= 0 && seen) return sum / seen;
    return low === Infinity ? null : low;
  };
  // The capstone is a 1.2 m block on a wide foot: standing anywhere on it puts the
  // body's own radius over the edge, so its walkable footprint carries the body out
  // by 0.3 m. Without that the apex is a ledge nothing can stand on.
  const apex = (x, z) => {
    const ix = Math.round((x - SHELL_LOW) / CELL), iz = Math.round((z - SHELL_LOW) / CELL);
    let best = -Infinity;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const cx = ix + dx, cz = iz + dz;
      if (cx < 0 || cz < 0 || cx >= SHELL_N || cz >= SHELL_N) continue;
      const value = data[cz * SHELL_N + cx];
      if (value > best) best = value;
    }
    return best > -Infinity ? best : null;
  };

  // What a body stands on. The entry is taken from the shell itself, because the
  // model opens it through the lowest courses and any line drawn through the
  // treads would put a floor where the visitor sees a gap. The apex takes the
  // capstone's block top for the same reason. The rest of the slope is left to
  // the site's cone: a 0.267 m tread is narrower than the body ring, so a surface
  // that follows the drawing literally jams the visitor at every riser.
  const walk = (x, z) => {
    const r = Math.max(Math.abs(x), Math.abs(z));
    const apron = plinthTop(x, z);
    if (r <= APEX) return apex(x, z) ?? apron ?? undefined;
    if (x > ENTRY.x0 && x < ENTRY.x1 && Math.abs(z) < ENTRY.z) {
      const y = sample(x, z);
      if (y !== null) return Math.max(0, y);
    }
    return apron ?? undefined;
  };
  pyramidState.shell = { cells: data, cell: CELL, low: SHELL_LOW, n: SHELL_N };
  pyramidState.shellTop = walk;
  return walk;
}

// Remove the blocks inside a door box: whole blocks, because every face of a
// block centres inside the same box, so a triangle test keeps the opening square.
function carve(mesh) {
  if (!ENTRIES.length) return;
  const geometry = mesh.geometry, pos = geometry.attributes.position;
  const idx = geometry.index;
  const count = idx ? idx.count : pos.count;
  const keep = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i += 3) {
    const ia = idx ? idx.getX(i) : i, ib = idx ? idx.getX(i + 1) : i + 1, ic = idx ? idx.getX(i + 2) : i + 2;
    v.set(0, 0, 0).fromBufferAttribute(pos, ia).add(p1.fromBufferAttribute(pos, ib)).add(p2.fromBufferAttribute(pos, ic)).multiplyScalar(1 / 3).applyMatrix4(mesh.matrixWorld);
    const cut = ENTRIES.some(e => v.y > .6 && v.y < e.y && Math.abs(v.z) < e.z && v.x > e.x0 && v.x < e.x1);
    if (!cut) keep.push(ia, ib, ic);
  }
  if (keep.length === count) return;
  geometry.setIndex(keep);
  pyramidState.carved = (pyramidState.carved ?? 0) + (count - keep.length) / 3;
}

const p1 = new THREE.Vector3(), p2 = new THREE.Vector3();

export function loadPyramid(scene, renderer) {
  return new GLTFLoader().loadAsync(new URL('../assets/models/newheaven-courtyard.glb', import.meta.url).href)
    .then(gltf => {
      const model = gltf.scene;
      model.name = 'NewHeaven-courtyard';
      model.position.y = .025;
      model.traverse(mesh => {
        if (!mesh.isMesh) return;
        pyramidState.triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
        const glass = mesh.name.includes('glass');
        mesh.castShadow = !glass && !mesh.name.includes('water');
        mesh.receiveShadow = !glass;
        mesh.material.side = THREE.DoubleSide;
        mesh.material.roughness = .86;
        if (mesh.name.includes('cyan_terracotta') || mesh.name.includes('andesite')) {
          mesh.material.map = null;
          mesh.material.color.setHex(0xc9d1cc);
          mesh.material.emissive.setHex(0x343c38);
          mesh.material.emissiveIntensity = .28;
        }
        if (mesh.material.map) {
          mesh.material.map.magFilter = THREE.NearestFilter;
          mesh.material.map.anisotropy = 2;
        }
        if (glass) {
          mesh.material.transparent = true;
          mesh.material.opacity = .44;
          mesh.material.depthWrite = false;
          mesh.renderOrder = 1;
        }
      });
      scene.add(model);
      scene.add(buildPlinth());
      buildShell(model);
      renderer.shadowMap.needsUpdate = true;
      pyramidState.ready = true;
      new GLTFLoader().loadAsync(new URL('../assets/models/newheaven-scenery.glb', import.meta.url).href).then(background => {
        background.scene.name = 'NewHeaven-original-surroundings';
        background.scene.position.y = .025;
        background.scene.traverse(mesh => {
          if (!mesh.isMesh) return;
          pyramidState.sceneryTriangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
          // Distant scenery uses baked directional tones rather than one PBR
          // lighting pass per fragment. Its authored surface coverage remains.
          if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
          const normals = mesh.geometry.attributes.normal;
          const shades = new Float32Array(normals.count * 3);
          for (let i = 0; i < normals.count; i++) {
            const shade = .68 + .32 * Math.abs(normals.getY(i)) + .13 * Math.abs(normals.getX(i));
            shades[i * 3] = shades[i * 3 + 1] = shades[i * 3 + 2] = shade;
          }
          mesh.geometry.setAttribute('color', new THREE.BufferAttribute(shades, 3));
          const source = mesh.material;
          mesh.material = new THREE.MeshBasicMaterial({ color: source.color, vertexColors: true, side: THREE.DoubleSide });
          source.dispose();
        });
        scene.add(background.scene);
        pyramidState.sceneryReady = true;
      }).catch(error => { pyramidState.error = `Scenery: ${error.message}`; console.error('Scenery load failed:', error); });
      return model;
    }).catch(error => {
      pyramidState.error = error.message;
      console.error('NewHeaven model failed to load:', error);
      return null;
    });
}
