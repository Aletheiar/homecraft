import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';
import { ORI_EXHIBIT } from './space-config.js';

const MODEL = new URL('../assets/models/ori-vincentskc.glb', import.meta.url).href;
const curve = points => new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');

// Tapered, slightly uneven sections give the wood a silhouette without textures.
function branch(points, radius, segments = 30) {
  const geometry = new THREE.TubeGeometry(curve(points), segments, radius, 9, false);
  const positions = geometry.attributes.position, center = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    geometry.parameters.path.getPointAt(t, center);
    const taper = Math.pow(1 - t, .72) * .95 + .045;
    for (let j = 0; j <= 9; j++) {
      const index = i * 10 + j, irregular = taper * (1 + .06 * Math.sin(t * 23 + j * 2.1));
      positions.setXYZ(index,
        center.x + (positions.getX(index) - center.x) * irregular,
        center.y + (positions.getY(index) - center.y) * irregular,
        center.z + (positions.getZ(index) - center.z) * irregular);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createOriSculpture() {
  const { x, z, yaw, modelHeight, perchY } = ORI_EXHIBIT;
  const mesh = new THREE.Group(); mesh.name = 'ori-sculpture';
  mesh.position.set(x, .03, z); mesh.rotation.y = yaw;

  // One shallow chamfered limestone block, with no stairs or large stage.
  const outline = [[-.88,-.52],[-.7,-.68],[.68,-.68],[.88,-.5],[.88,.48],[.68,.63],[-.68,.63],[-.88,.45]];
  const shape = new THREE.Shape(outline.map(([px, py]) => new THREE.Vector2(px, py)));
  const stoneGeometry = new THREE.ExtrudeGeometry(shape, { depth: .18, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .035, bevelThickness: .025 });
  stoneGeometry.rotateX(-Math.PI / 2); stoneGeometry.translate(0, .025, 0); stoneGeometry.clearGroups();
  const stone = new THREE.Mesh(stoneGeometry, new THREE.MeshStandardMaterial({ color: 0xd8dfd8, roughness: .82 }));
  stone.name = 'ori-stone-plinth'; stone.receiveShadow = true; mesh.add(stone);

  const parts = [
    branch([[-.46,.24,-.12],[-.64,.52,-.17],[-.46,.86,-.12],[-.05,1.10,-.08],[.39,1.19,-.04],[.77,1.51,-.18],[.82,1.88,-.24]], .19),
    branch([[-.46,.24,-.12],[-.17,.30,.18],[.28,.25,.33],[.62,.25,.36]], .12, 16),
    branch([[-.45,.27,-.12],[-.58,.26,-.35],[-.72,.24,-.43]], .11, 12),
    branch([[-.48,.78,-.14],[-.89,1.02,-.24],[-1.08,1.31,-.22],[-1.04,1.50,-.18]], .08, 18),
    branch([[.77,1.51,-.18],[1.02,1.67,-.18],[1.15,1.88,-.15]], .055, 14),
  ];
  const wood = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: 0x7b7166, roughness: .84, emissive: 0x353943, emissiveIntensity: .22 }));
  parts.forEach(p => p.dispose()); wood.name = 'ori-spirit-wood'; wood.receiveShadow = true; mesh.add(wood);

  // One open calligraphic sweep, asymmetrical and clear of the face.
  const arcPath = curve([[-.88,.47,.07],[-1.19,1.18,-.08],[-.97,2.05,-.30],[-.42,2.77,-.39],[.30,2.95,-.35],[.93,2.59,-.22],[1.14,2.19,-.06]]);
  const arcMaterial = new THREE.MeshBasicMaterial({ color: 0x9cdbef, transparent: true, opacity: .66, depthWrite: false });
  const arc = new THREE.Mesh(new THREE.TubeGeometry(arcPath, 64, .014, 5, false), arcMaterial);
  arc.name = 'ori-spirit-arc'; mesh.add(arc);

  const count = 12, positions = new Float32Array(count * 3), origins = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const p = arcPath.getPoint(i / (count - 1));
    origins[i * 3] = p.x + .11 * Math.sin(i * 7.2);
    origins[i * 3 + 1] = p.y + .13 * Math.cos(i * 3.7);
    origins[i * 3 + 2] = p.z + .22 + .17 * Math.sin(i * 1.7);
  }
  positions.set(origins);
  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const motes = new THREE.Points(pointsGeometry, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = clamp(110.0 / max(1.0, -mv.z), 2.0, 13.0);
      gl_Position = projectionMatrix * mv;
    }`,
    fragmentShader: `void main() {
      float r = length(gl_PointCoord - .5) * 2.0;
      float a = (1.0 - smoothstep(.08, 1.0, r)) * .70;
      if (a < .015) discard;
      gl_FragColor = vec4(.65, .89, 1.0, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  motes.name = 'ori-spirit-motes';
  pointsGeometry.computeBoundingSphere(); pointsGeometry.boundingSphere.radius += .15; mesh.add(motes);

  const subject = new THREE.Group(); subject.name = 'ori-subject'; mesh.add(subject);
  const hotspot = { id: 'ori', box: new THREE.Box3(new THREE.Vector3(x - .85, .28, z - .85), new THREE.Vector3(x + .85, 3.1, z + .85)) };
  const obstacles = [{ x0: x - 1.12, x1: x + 1.12, z0: z - 1.12, z1: z + 1.12, level: 0 }];
  let elapsed = 0, bodyMaterial = null, loading = null;
  const state = { ready: false, error: null };

  function load() {
    if (loading) return loading;
    // Local GLB retains original author/source/CC BY metadata; no remote assets.
    loading = new GLTFLoader().loadAsync(MODEL).then(gltf => {
      const model = gltf.scene; model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model), center = bounds.getCenter(new THREE.Vector3());
      const scale = modelHeight / (bounds.max.y - bounds.min.y);
      const mount = new THREE.Group(); mount.scale.setScalar(scale);
      // Preserve the authored glTF root transform; normalise with a parent.
      mount.position.set(-center.x * scale, perchY - bounds.min.y * scale, -center.z * scale);
      mount.add(model); subject.add(mount);
      model.traverse(object => {
        if (!object.isMesh) return;
        object.castShadow = false; object.receiveShadow = false;
        const material = object.material;
        if (material.name === 'Corps') {
          material.color.setHex(0xdceff2); material.emissive.setHex(0xa4d8ee);
          material.emissiveIntensity = .24; material.roughness = .48; bodyMaterial = material;
        } else if (material.name === 'Yeux') {
          material.emissiveIntensity = .16; material.roughness = .4;
        } else {
          material.color.setHex(0x61556c); material.roughness = .65;
        }
        material.side = THREE.FrontSide;
      });
      state.ready = true; return true;
    }).catch(error => {
      state.error = error.message; console.error('Ori exhibit model could not load:', error); return false;
    });
    return loading;
  }

  return { mesh, subject, hotspot, obstacles, state, load,
    update(dt = 0, animate = true) {
      if (!animate || !mesh.visible) return;
      elapsed += Math.min(Math.max(dt, 0), .1);
      const breath = Math.sin(elapsed * .85);
      if (bodyMaterial) bodyMaterial.emissiveIntensity = .24 + breath * .025;
      arcMaterial.opacity = .66 + breath * .035;
      for (let i = 0; i < count; i++) {
        positions[i * 3] = origins[i * 3] + .035 * Math.sin(elapsed * .3 + i * 2);
        positions[i * 3 + 1] = origins[i * 3 + 1] + .065 * Math.sin(elapsed * .48 + i * 1.3);
      }
      pointsGeometry.attributes.position.needsUpdate = true;
    },
  };
}

// The site's generic keyboard prompt is disabled. The local button uses the
// engine's existing card lifecycle; scene picking stays with its hotspots.
export function attachOriControls(exhibit, { player, stage }) {
  const prompt = document.createElement('button');
  prompt.id = 'ori-exhibit-prompt'; prompt.type = 'button'; prompt.hidden = true;
  prompt.textContent = '查看展品 · Ori'; document.querySelector('#hud').appendChild(prompt);
  prompt.addEventListener('click', () => window.__home?.openPage('ori'));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const frustum = new THREE.Frustum(), matrix = new THREE.Matrix4();
  const sphere = new THREE.Sphere(new THREE.Vector3(ORI_EXHIBIT.x, 1.6, ORI_EXHIBIT.z), 2.1);
  return {
    update(dt) {
      const modal = !!document.querySelector('dialog[open]');
      const distance = Math.hypot(player.pos.x - ORI_EXHIBIT.x, player.pos.z - ORI_EXHIBIT.z);
      prompt.hidden = modal || distance > 3.6 || Math.abs(player.y) > .7 || player.flying || !exhibit.state.ready;
      matrix.multiplyMatrices(stage.camera.projectionMatrix, stage.camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(matrix);
      exhibit.update(dt, !document.hidden && !reducedMotion.matches && !modal && distance < 35 && frustum.intersectsSphere(sphere));
    },
  };
}
