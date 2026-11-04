import * as THREE from 'three';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';

// Satin brass body, brighter machined lips and a polished rim, a darker recess
// and near-black engraving: the graduations have to survive the distance
// between the west entrance and the centre of the hall.
const BRASS = 0xb9975f, LIP = 0xdcc28c, SHOULDER = 0x8f7444, FACE = 0xad8e58,
  RIM = 0xe8d1a0, ENGRAVED = 0x453921, BOLT = 0xe8d2a4, HUB = 0xd2b47c;

// Nested brass bands share a real north/south bearing axis. Only the middle
// gimbal moves; the meridian, near-horizontal ring and mounting stay fixed.
export function createArmillary({ center, radii, tube, band, core, ringSpeed, coreSpeed }, plinthTop) {
  const group = new THREE.Group(); group.name = 'hall-exhibit'; group.position.set(0, plinthTop, 0);
  const fixed = [], moving = [];
  const transform = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(1, 1, 1));
  function tint(geometry, color) {
    const c = new THREE.Color(color), colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b; }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); return geometry;
  }
  function piece(parts, geometry, color, matrix) {
    if (geometry.index) { const old = geometry; geometry = geometry.toNonIndexed(); old.dispose(); }
    tint(geometry, color);
    if (matrix) geometry.applyMatrix4(matrix);
    parts.push(geometry);
  }
  function place(parts, geometry, matrix) { if (matrix) geometry.applyMatrix4(matrix); parts.push(geometry); }

  // One circular sweep of a closed profile. Vertices are shared around the
  // circle so the band stays round, but not between profile edges, so its
  // corners stay sharp; every edge carries its own vertex colour.
  function swept(profile, segments, base = 0) {
    const position = [], color = [], index = [];
    for (let e = 0; e < profile.length; e++) {
      const from = profile[e], to = profile[(e + 1) % profile.length], c = new THREE.Color(from[2]);
      const start = position.length / 3;
      for (let i = 0; i <= segments; i++) {
        const a = i * Math.PI * 2 / segments, cs = Math.cos(a), sn = Math.sin(a);
        const fr = base + from[0], tr = base + to[0];
        position.push(fr * cs, fr * sn, from[1], tr * cs, tr * sn, to[1]);
        color.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
      for (let i = 0; i < segments; i++) {
        const v = start + i * 2;
        index.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
    geometry.setIndex(index); geometry.computeVertexNormals();
    const flat = geometry.toNonIndexed();
    // The brass material samples no map; the empty uv keeps the attribute set
    // identical to the boxes and cylinders merged beside it.
    flat.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(flat.attributes.position.count * 2), 2));
    return flat;
  }

  // A band is a machined strip, not a tube: raised lips on both faces, a
  // recessed field carrying the graduations, and a polished rim. The whole
  // profile is one geometry, so a ring still costs one draw call. `side`
  // picks the graduated face: -1 for the west face of a standing band, +1 to
  // turn the dial upward on the near-horizontal ring.
  function track(parts, radius, width, matrix, marks, side = -1) {
    const depth = tube * 2 - .008, outer = depth + .008, lip = width * .13;
    const profile = [
      [width / 2, -outer / 2, RIM], [width / 2, outer / 2, LIP],
      [width / 2 - lip, outer / 2, SHOULDER], [width / 2 - lip, depth / 2, FACE],
      [-(width / 2 - lip), depth / 2, SHOULDER], [-(width / 2 - lip), outer / 2, LIP],
      [-width / 2, outer / 2, RIM], [-width / 2, -outer / 2, LIP],
      [-(width / 2 - lip), -outer / 2, SHOULDER], [-(width / 2 - lip), -depth / 2, FACE],
      [width / 2 - lip, -depth / 2, SHOULDER], [width / 2 - lip, -outer / 2, LIP],
    ];
    place(parts, swept(profile, Math.max(40, Math.round(radius * 52)), radius), matrix);
    // Graduations in the recess: three lengths, so the major and minor marks
    // separate without a mesh per degree.
    const k = width / .078, field = side * (depth / 2 - .0008);
    const major = Math.max(4, Math.round(marks / 4)), medium = Math.max(2, Math.round(marks / 8));
    const rail = radius + width / 2 - width * .065;
    for (let i = 0; i < marks; i++) {
      const a = i * Math.PI * 2 / marks;
      const grade = i % major === 0 ? 2 : i % medium === 0 ? 1 : 0;
      const mark = transform(radius * Math.cos(a), radius * Math.sin(a), field, 0, 0, a - Math.PI / 2);
      piece(parts, new THREE.BoxGeometry([.0062, .0104, .0166][grade] * k, [.028, .042, .058][grade] * k, .0066),
        ENGRAVED, matrix.clone().multiply(mark));
      // Rivets sit on the raised border, not in the dial, so the silhouette
      // stays a straight machined edge.
      if (i % medium === 0) {
        const rivet = transform(rail * Math.cos(a), rail * Math.sin(a), side * (outer / 2 + .0004), Math.PI / 2);
        piece(parts, new THREE.CylinderGeometry(.0054 * k, .0054 * k, .005, 8), BOLT, matrix.clone().multiply(rivet));
      }
    }
    // Four clamped segment joints, kept clear of the top so the sight line to
    // the reading-room sign stays open.
    for (const deg of [40, 140, 220, 320]) {
      const a = deg * Math.PI / 180;
      const at = transform(radius * Math.cos(a), radius * Math.sin(a), 0, 0, 0, a - Math.PI / 2);
      piece(parts, new THREE.BoxGeometry(.05, width + .02, outer + .012), LIP, matrix.clone().multiply(at));
      piece(parts, new THREE.BoxGeometry(.016, width + .026, outer + .018), SHOULDER, matrix.clone().multiply(at));
    }
  }

  const yz = transform(0, 0, 0, 0, Math.PI / 2, 0);
  track(fixed, radii[0], band, transform(0, center, 0).multiply(yz), 48);
  track(moving, radii[1], band * .94, yz, 32);
  track(fixed, radii[2], band * .88, transform(0, center, 0, 0, 0, Math.PI * 80 / 180).multiply(yz), 32, 1);

  // ---- mounting ----------------------------------------------------------
  // A circular brass bed-plate bolted into the stone, a turned drum and pier,
  // then a four-arm fork that carries the gimbal axle on both poles. Ring
  // bottoms clear the capital and no support passes through the crystal.
  piece(fixed, new THREE.CylinderGeometry(.452, .462, .018, 44), BRASS, transform(0, .010, 0));
  place(fixed, swept([[.404, .017, LIP], [.456, .017, RIM], [.456, .003, LIP], [.404, .003, SHOULDER]], 44));
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;
    piece(fixed, new THREE.CylinderGeometry(.015, .015, .009, 6), BOLT,
      transform(.428 * Math.cos(a), .021, .428 * Math.sin(a)));
  }
  piece(fixed, new THREE.CylinderGeometry(.34, .404, .026, 40), SHOULDER, transform(0, .031, 0));
  piece(fixed, new THREE.CylinderGeometry(.30, .34, .02, 36), LIP, transform(0, .054, 0));
  piece(fixed, new THREE.CylinderGeometry(.19, .30, .036, 28), BRASS, transform(0, .082, 0));
  piece(fixed, new THREE.CylinderGeometry(.15, .19, .05, 24), LIP, transform(0, .125, 0));
  piece(fixed, new THREE.CylinderGeometry(.088, .15, .09, 20), BRASS, transform(0, .195, 0));
  piece(fixed, new THREE.CylinderGeometry(.10, .088, .03, 20), LIP, transform(0, .255, 0));
  piece(fixed, new THREE.CylinderGeometry(.115, .10, .026, 20), BRASS, transform(0, .283, 0));

  // The fork straddles the standing bands by two arms per side, clear of the
  // rims except where it bolts into the pole flange, so nothing cuts through a
  // ring and the moving band keeps the axle it turns about.
  for (const side of [-1, 1]) for (const sx of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      [.048, .250, .055], [.056, .36, .40], [.056, .60, .85], [.056, .92, 1.14],
      [.056, 1.26, 1.30], [.055, 1.46, 1.325], [.054, 1.545, 1.281],
    ].map(([x, y, z]) => new THREE.Vector3(sx * x, y, side * z)));
    piece(fixed, new THREE.TubeGeometry(curve, 26, .027, 6, false), BRASS);
  }
  for (const side of [-1, 1]) {
    const z = side * 1.2;
    piece(fixed, new THREE.CylinderGeometry(.019, .019, .20, 10), HUB, transform(0, center, z, Math.PI / 2));
    piece(fixed, new THREE.CylinderGeometry(.028, .028, .018, 10), BOLT, transform(0, center, side * 1.1845, Math.PI / 2));
    // Bearing flange on the meridian's outer edge, with the axle end and nut.
    piece(fixed, swept([[.024, -.007, LIP], [.082, -.007, HUB], [.082, .007, BOLT], [.024, .007, LIP]], 24),
      transform(0, center, side * 1.2765));
    piece(fixed, new THREE.CylinderGeometry(.021, .021, .016, 6), BOLT, transform(0, center, side * 1.2905, Math.PI / 2));
    // Bolted cheek plate on the meridian face at the same node.
    piece(fixed, new THREE.BoxGeometry(.012, .066, .072), BRASS, transform(-.036, center, side * 1.232));
    for (const dy of [-.022, .022]) {
      piece(fixed, new THREE.CylinderGeometry(.006, .006, .01, 6), BOLT, transform(-.043, center + dy, side * 1.232, 0, Math.PI / 2, 0));
    }
  }

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .4 });
  function merged(parts, name, shadow) {
    const geometry = mergeGeometries(parts); parts.forEach(p => p.dispose());
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.castShadow = shadow; mesh.receiveShadow = true; return mesh;
  }
  const frame = merged(fixed, 'armillary-rings', true);
  frame.userData.ringCount = 3; frame.userData.radii = [...radii]; group.add(frame);
  const gimbal = new THREE.Group(); gimbal.name = 'armillary-gimbal';
  gimbal.position.y = center; gimbal.rotation.z = Math.PI / 4;
  gimbal.add(merged(moving, 'armillary-moving-band', false)); group.add(gimbal);

  // ---- crystal -----------------------------------------------------------
  // Facets of two shades with a brighter solid core and metal-capped edges:
  // the gem stays glass, but it no longer dissolves into the glazed hall.
  const shell = new THREE.OctahedronGeometry(core);
  const shades = [0x86d5c7, 0x55a89c], shadesArray = new Float32Array(shell.attributes.position.count * 3);
  for (let f = 0; f < shell.attributes.position.count / 3; f++) {
    const c = new THREE.Color(shades[f % 2]);
    for (let v = 0; v < 3; v++) {
      const i = (f * 3 + v) * 3;
      shadesArray[i] = c.r; shadesArray[i + 1] = c.g; shadesArray[i + 2] = c.b;
    }
  }
  shell.setAttribute('color', new THREE.BufferAttribute(shadesArray, 3));
  const crystal = new THREE.Mesh(shell, new THREE.MeshStandardMaterial({
    vertexColors: true, transparent: true, opacity: .8, roughness: .18, metalness: .04,
    emissive: 0x2e6b62, emissiveIntensity: .36, flatShading: true, depthWrite: false,
  }));
  crystal.name = 'armillary-core'; crystal.position.y = center; crystal.rotation.y = Math.PI / 8;

  const inner = [], innerCore = new THREE.OctahedronGeometry(core * .56);
  innerCore.rotateY(.62); innerCore.rotateZ(.34); tint(innerCore, 0xcdf7ea); inner.push(innerCore);
  const poles = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
    .map(v => new THREE.Vector3(...v).multiplyScalar(core * 1.012));
  for (let i = 0; i < poles.length; i++) for (let j = i + 1; j < poles.length; j++) {
    if (poles[i].dot(poles[j]) < 0) continue;
    const a = poles[i], b = poles[j], middle = a.clone().add(b).multiplyScalar(.5);
    const rib = new THREE.CylinderGeometry(.0056, .0056, a.distanceTo(b), 4, 1);
    rib.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
    rib.translate(middle.x, middle.y, middle.z);
    piece(inner, rib, 0xe6fff8);
  }
  const innerMesh = new THREE.Mesh(mergeGeometries(inner), new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: .3, metalness: .03, flatShading: true,
    emissive: 0x37907f, emissiveIntensity: .5,
  }));
  inner.forEach(g => g.dispose());
  innerMesh.name = 'armillary-core-inner'; crystal.add(innerMesh);

  const outline = [new THREE.EdgesGeometry(shell), new THREE.EdgesGeometry(new THREE.OctahedronGeometry(core * .56))];
  outline[0].applyMatrix4(new THREE.Matrix4().makeScale(1.004, 1.004, 1.004));
  outline[1].applyMatrix4(new THREE.Matrix4().makeRotationZ(.34).multiply(new THREE.Matrix4().makeRotationY(.62)));
  const edges = new THREE.LineSegments(mergeGeometries(outline), new THREE.LineBasicMaterial({
    color: 0xd6fff3, transparent: true, opacity: .45, depthWrite: false,
  }));
  outline.forEach(g => g.dispose());
  edges.name = 'armillary-core-edges'; crystal.add(edges); group.add(crystal);

  let elapsed = 0;
  return { mesh: group, update(dt = 0) {
    if (dt <= 0 || !group.visible) return;
    elapsed = (elapsed + dt) % (Math.PI * 2 / ringSpeed);
    // Bounded motion keeps the gimbal seated in its Z-axis bearings.
    gimbal.rotation.z = Math.PI / 4 + .035 * Math.sin(elapsed * ringSpeed);
    crystal.rotation.y = (crystal.rotation.y + dt * coreSpeed) % (Math.PI * 2);
  } };
}
