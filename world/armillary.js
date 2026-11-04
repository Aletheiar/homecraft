import * as THREE from 'three';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';

// A single metal draw and one transparent crystal. All geometry is created
// once; the update changes only rotations, without lights or texture work.
export function createArmillary({ center, radii, tube, core, ringSpeed, coreSpeed }, plinthTop) {
  const group = new THREE.Group();
  group.name = 'hall-exhibit';
  group.position.set(0, plinthTop, 0);
  const parts = [];
  const bronze = 0xb29a6b, engraved = 0x796341;
  function piece(geometry, color, matrix) {
    if (matrix) geometry.applyMatrix4(matrix);
    const tint = new THREE.Color(color), colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = tint.r; colors[i + 1] = tint.g; colors[i + 2] = tint.b; }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(geometry);
  }
  const transform = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1),
  );
  const inclinations = [[0, Math.PI / 2, 0], [Math.PI / 2 - Math.PI / 8, 0, Math.PI / 7], [Math.PI / 5, -Math.PI / 4, 0]];
  radii.forEach((radius, i) => {
    piece(new THREE.TorusGeometry(radius, tube * (1 - i * .08), 6, 96), bronze,
      transform(0, center, 0, ...inclinations[i]));
  });
  // Sparse degree marks on the western face of the outer meridian.
  const meridian = transform(0, center, 0, ...inclinations[0]);
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI / 12, major = i % 6 === 0;
    const marker = transform(radii[0] * Math.cos(angle), radii[0] * Math.sin(angle), -.019, 0, 0, angle - Math.PI / 2);
    piece(new THREE.BoxGeometry(.012, major ? .065 : .035, .014), engraved, meridian.clone().multiply(marker));
  }
  // A short circular foot and tapered stem meet the bottom of the meridian.
  piece(new THREE.CylinderGeometry(.25, .32, .08, 24), bronze, transform(0, .04, 0));
  piece(new THREE.CylinderGeometry(.065, .13, .2, 16), bronze, transform(0, .18, 0));
  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const metal = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: .74, metalness: .32,
  }));
  metal.name = 'armillary-rings';
  metal.userData.ringCount = radii.length;
  metal.userData.radii = [...radii];
  metal.receiveShadow = true;
  group.add(metal);

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(core), new THREE.MeshStandardMaterial({
    color: 0xbce2df, transparent: true, opacity: .66, roughness: .18, metalness: 0,
    emissive: 0x315d58, emissiveIntensity: .12, flatShading: true,
  }));
  crystal.name = 'armillary-core';
  crystal.position.y = center;
  crystal.rotation.y = Math.PI / 8;
  group.add(crystal);
  return {
    mesh: group,
    update(dt = 0) {
      if (dt <= 0 || !group.visible) return;
      metal.rotation.y = (metal.rotation.y + dt * ringSpeed) % (Math.PI * 2);
      crystal.rotation.y = (crystal.rotation.y + dt * coreSpeed) % (Math.PI * 2);
    },
  };
}
