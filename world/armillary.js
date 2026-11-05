import * as THREE from 'three';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';

// Satin brass body, brighter machined lips and a polished rim, a darker recess
// and near-black engraving: the graduations have to survive the distance
// between the west entrance and the centre of the hall.
const BRASS = 0xb9975f, LIP = 0xdcc28c, SHOULDER = 0x8f7444, FACE = 0xad8e58,
  RIM = 0xf2ddaf, ENGRAVED = 0x453921, BOLT = 0xf0dbb2, HUB = 0xd2b47c;

// Three graduated bands turning on real gimbal axles. A hoop is only unchanged
// by a spin about its own normal, so every band is instead pinned through two
// rim points and turns about that diameter: it tumbles like a coin, and the
// bearing that pins it sits on the rim the band already has, which leaves the
// floating crystal a clear sphere and keeps the hardware honest.
export function createArmillary({ center, radii, tube, band, core, spin, trails }, plinthTop) {
  const group = new THREE.Group(); group.name = 'hall-exhibit'; group.position.set(0, plinthTop, 0);
  // Fixed mounting, then one geometry per band: each band has to turn on its
  // own axle, so each one is merged separately.
  const base = [], outerParts = [], middleParts = [], innerParts = [];
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
  // profile is one geometry, so a ring still costs one draw call. Both faces
  // are graduated because the bands now turn over and show either side.
  function track(parts, radius, width, matrix, marks) {
    const depth = tube * 2 - .008, outer = depth + .008, lip = width * .13;
    const profile = [
      [width / 2, -outer / 2, RIM], [width / 2, outer / 2, LIP],
      [width / 2 - lip, outer / 2, SHOULDER], [width / 2 - lip, depth / 2, FACE],
      [-(width / 2 - lip), depth / 2, SHOULDER], [-(width / 2 - lip), outer / 2, LIP],
      [-width / 2, outer / 2, RIM], [-width / 2, -outer / 2, LIP],
      [-(width / 2 - lip), -outer / 2, SHOULDER], [-(width / 2 - lip), -depth / 2, FACE],
      [width / 2 - lip, -depth / 2, SHOULDER], [width / 2 - lip, -outer / 2, LIP],
    ];
    place(parts, swept(profile, Math.max(36, Math.round(radius * 44)), radius), matrix);
    // Graduations in the recess: three lengths, so the major and minor marks
    // separate without a mesh per degree.
    const k = width / .078;
    const major = Math.max(4, Math.round(marks / 4)), medium = Math.max(2, Math.round(marks / 8));
    const rail = radius + width / 2 - width * .065;
    for (const side of [-1, 1]) {
      const field = side * (depth / 2 - .0008);
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

  // Bearing hardware. Each band is pinned at two rim points, so its axle is a
  // diameter of that band; the collar straddles the band at the pinned point
  // and the stub reaches out to the parent band, where it is bolted.
  function gudgeon(parts, axis, from, to, radius) {
    const length = Math.abs(to - from), middle = (from + to) / 2;
    const at = axis === 'x' ? transform(middle, 0, 0, 0, 0, Math.PI / 2)
      : axis === 'y' ? transform(0, middle, 0) : transform(0, 0, middle, Math.PI / 2);
    piece(parts, new THREE.CylinderGeometry(radius, radius, length, 10), HUB, at);
  }
  function collar(parts, axis, distance, radial, width, thickness) {
    const size = axis === 'x' ? [radial, width, thickness] : axis === 'y' ? [width, radial, thickness] : [width, thickness, radial];
    const at = axis === 'x' ? transform(distance, 0, 0) : axis === 'y' ? transform(0, distance, 0) : transform(0, 0, distance);
    piece(parts, new THREE.BoxGeometry(size[0], size[1], size[2]), LIP, at);
    piece(parts, new THREE.BoxGeometry(size[0] * .78, size[1] * 1.22, size[2] * 1.22), SHOULDER, at);
  }

  // Outer band: plane YZ, axle along Z, pinned by the fork trunnions.
  track(outerParts, radii[0], band, transform(0, 0, 0, 0, Math.PI / 2, 0), 48);
  // Middle band: plane XY, axle along Y, carried by the outer band.
  track(middleParts, radii[1], band * .94, new THREE.Matrix4(), 32);
  // Inner band: plane XZ, axle along X, carried by the middle band.
  track(innerParts, radii[2], band * .88, transform(0, 0, 0, Math.PI / 2, 0, 0), 32);

  // The middle band's trunnions are part of the outer band, so they travel
  // with it and drag the middle axle through space. Each stub starts outside
  // the child band's rim and stops inside the parent band, and the collar
  // straddles the rim the stub grips, so no stub ever pierces a band.
  const half = [band / 2, band * .94 / 2, band * .88 / 2];
  for (const side of [-1, 1]) {
    collar(outerParts, 'y', side * radii[1], .09, .09, .085);
    gudgeon(outerParts, 'y', side * (radii[1] + half[1]), side * (radii[0] - .02), .022);
    collar(middleParts, 'x', side * radii[2], .09, .09, .085);
    gudgeon(middleParts, 'x', side * (radii[2] + half[2]), side * (radii[1] - .02), .02);
  }

  // ---- mounting ----------------------------------------------------------
  // A circular brass bed-plate bolted into the stone, a turned drum and pier,
  // then a four-arm fork that carries the outer band's axle on both poles.
  // Ring bottoms clear the capital and no support passes through the crystal.
  piece(base, new THREE.CylinderGeometry(.452, .462, .018, 44), BRASS, transform(0, .010, 0));
  place(base, swept([[.404, .017, LIP], [.456, .017, RIM], [.456, .003, LIP], [.404, .003, SHOULDER]], 44));
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;
    piece(base, new THREE.CylinderGeometry(.015, .015, .009, 6), BOLT,
      transform(.428 * Math.cos(a), .021, .428 * Math.sin(a)));
  }
  piece(base, new THREE.CylinderGeometry(.34, .404, .026, 40), SHOULDER, transform(0, .031, 0));
  piece(base, new THREE.CylinderGeometry(.30, .34, .02, 36), LIP, transform(0, .054, 0));
  piece(base, new THREE.CylinderGeometry(.19, .30, .036, 28), BRASS, transform(0, .082, 0));
  piece(base, new THREE.CylinderGeometry(.15, .19, .05, 24), LIP, transform(0, .125, 0));
  piece(base, new THREE.CylinderGeometry(.088, .15, .09, 20), BRASS, transform(0, .195, 0));
  piece(base, new THREE.CylinderGeometry(.10, .088, .03, 20), LIP, transform(0, .255, 0));
  piece(base, new THREE.CylinderGeometry(.115, .10, .026, 20), BRASS, transform(0, .283, 0));

  // The fork straddles the outer band by two arms per side, clear of its rims
  // except where it bolts into the pole flange, so nothing cuts through a ring.
  for (const side of [-1, 1]) for (const sx of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      [.048, .250, .055], [.056, .36, .40], [.056, .60, .85], [.056, .92, 1.14],
      [.056, 1.26, 1.30], [.055, 1.46, 1.325], [.054, 1.545, 1.281],
    ].map(([x, y, z]) => new THREE.Vector3(sx * x, y, side * z)));
    piece(base, new THREE.TubeGeometry(curve, 26, .027, 6, false), BRASS);
  }
  for (const side of [-1, 1]) {
    const z = side * 1.2;
    piece(base, new THREE.CylinderGeometry(.019, .019, .20, 10), HUB, transform(0, center, z, Math.PI / 2));
    piece(base, new THREE.CylinderGeometry(.028, .028, .018, 10), BOLT, transform(0, center, side * 1.1845, Math.PI / 2));
    // Bearing flange on the outer band's rim, with the axle end and nut.
    piece(base, swept([[.024, -.007, LIP], [.082, -.007, HUB], [.082, .007, BOLT], [.024, .007, LIP]], 24),
      transform(0, center, side * 1.2765));
    piece(base, new THREE.CylinderGeometry(.021, .021, .016, 6), BOLT, transform(0, center, side * 1.2905, Math.PI / 2));
    // No plate bolted to the band's face here any more: the band turns inside
    // this bearing, so the flange, collar and nut carry the whole node.
  }

  // Polished but not mirror-like: a tighter highlight on the machined rims and
  // a little more metal, with no environment map and no emission of its own.
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .42, metalness: .36 });
  function merged(parts, name, shadow) {
    const geometry = mergeGeometries(parts); parts.forEach(p => p.dispose());
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.castShadow = shadow; mesh.receiveShadow = true; return mesh;
  }

  // ---- assembly ----------------------------------------------------------
  const support = merged(base, 'armillary-base', true);
  support.userData.ringCount = radii.length; support.userData.radii = [...radii];
  support.userData.periods = { outer: spin.outer, middle: spin.middle, inner: spin.inner, core: spin.core };
  group.add(support);

  const outer = new THREE.Group(); outer.name = 'armillary-spin-outer'; outer.position.y = center;
  const gimbal = new THREE.Group(); gimbal.name = 'armillary-gimbal';
  const innerSpin = new THREE.Group(); innerSpin.name = 'armillary-spin-inner';
  outer.add(merged(outerParts, 'armillary-ring-outer', true));
  gimbal.add(merged(middleParts, 'armillary-ring-middle', false));
  innerSpin.add(merged(innerParts, 'armillary-ring-inner', false));
  gimbal.add(innerSpin); outer.add(gimbal); group.add(outer);

  // ---- light trails -------------------------------------------------------
  // A light that *travels* along the band rather than a lit arc welded to it.
  // Each trail is one full-circumference tube drawn with a small shader: the
  // fragment knows its own angle around the ring (from the torus UV) and the
  // head angle arrives as a uniform, so the lit stretch sweeps on its own clock
  // while the brass turns on its own. Nothing is rebuilt per frame (one float
  // write per trail), the 0/360 seam is closed by `mod`, and the tail is a real
  // gradient rather than a baked one, so the old brightness always fades as the
  // head moves on.
  // Additive but depth-tested: the metal occludes the far side, and it writes no
  // depth, so it neither hides the crystal nor leaves a stencil behind.
  const trailVertex = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}',
  ].join('\n');
  const trailFragment = [
    'uniform float uHead;',
    'uniform float uSpan;',
    'uniform float uPower;',
    'uniform float uGain;',
    'uniform vec3 uColor;',
    'varying vec2 vUv;',
    'const float TAU = 6.28318530718;',
    'void main() {',
    '  float theta = vUv.x * TAU;',
    // how far behind the head this fragment sits, wrapped into [0, 2pi)
    '  float back = mod(uHead - theta + TAU, TAU);',
    '  float along = clamp(1.0 - back / uSpan, 0.0, 1.0);',
    '  float fade = pow(along, uPower);',
    // a short, hotter tip at the head; the white mix keeps it cyan-white
    '  float head = smoothstep(uSpan * 0.22, 0.0, back);',
    '  float edge = pow(sin(vUv.y * 3.14159265), 0.45);',
    '  float a = fade * (0.42 + 0.58 * head) * edge * uGain;',
    '  vec3 tint = mix(uColor, vec3(1.0), 0.45 * head);',
    '  gl_FragColor = vec4(tint, clamp(a, 0.0, 1.0));',
    '}',
  ].join('\n');
  // One shared shader program, one material per trail (each needs its own head).
  const trailUniforms = (color, span, gain) => ({
    uHead: { value: 0 },
    uSpan: { value: span * Math.PI / 180 },
    uPower: { value: 1.6 },
    uGain: { value: gain },
    uColor: { value: new THREE.Color(color) },
  });
  function lightTrack(radius, matrix, look) {
    const centreline = radius + band / 2 + .028;
    const geometry = new THREE.TorusGeometry(centreline, look.radius, 5, 128);
    geometry.applyMatrix4(matrix);
    geometry.computeBoundingSphere();
    const uniforms = trailUniforms(look.color, look.arc, look.gain);
    const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
      uniforms, vertexShader: trailVertex, fragmentShader: trailFragment,
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide, toneMapped: false,
      // A two-sided additive surface otherwise draws both faces; one pass is
      // both correct and half the cost.
      forceSinglePass: true,
    }));
    mesh.castShadow = false; mesh.receiveShadow = false;
    // After the crystal and the other transparents, so the glow lands on top of
    // whatever it crosses, while depth testing still hides it behind the metal.
    mesh.renderOrder = 2;
    mesh.userData = { centreline, period: look.period, arc: look.arc,
      triangles: geometry.index.count / 3, uniforms };
    return mesh;
  }
  const outerTrail = lightTrack(radii[0], transform(0, 0, 0, 0, Math.PI / 2, 0), trails.outer);
  outerTrail.name = 'armillary-trail-outer'; outer.add(outerTrail);
  const middleTrail = lightTrack(radii[1], new THREE.Matrix4(), trails.middle);
  middleTrail.name = 'armillary-trail-middle'; gimbal.add(middleTrail);

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
  // The glow is emissive only: no bloom, no light, and no animation. A breath
  // was tried and removed: at +-15% on these two intensities the crystal's mean
  // pixel luminance moved 2.3%, because the emissive term is a small part of
  // what the eye reads on a lit, transparent shell. A steady value reads better
  // than an imperceptible rhythm.
  const CRYSTAL_GLOW = .44, KERNEL_GLOW = 1.3;
  const crystal = new THREE.Mesh(shell, new THREE.MeshStandardMaterial({
    vertexColors: true, transparent: true, opacity: .76, roughness: .18, metalness: .04,
    emissive: 0x2e7a70, emissiveIntensity: CRYSTAL_GLOW, flatShading: true, depthWrite: false,
  }));
  crystal.name = 'armillary-core'; crystal.position.y = center;

  const kernel = [], innerCore = new THREE.OctahedronGeometry(core * .56);
  innerCore.rotateY(.62); innerCore.rotateZ(.34); tint(innerCore, 0xcdf7ea); kernel.push(innerCore);
  const poles = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
    .map(v => new THREE.Vector3(...v).multiplyScalar(core * 1.012));
  for (let i = 0; i < poles.length; i++) for (let j = i + 1; j < poles.length; j++) {
    if (poles[i].dot(poles[j]) < 0) continue;
    const a = poles[i], b = poles[j], middle = a.clone().add(b).multiplyScalar(.5);
    const rib = new THREE.CylinderGeometry(.0056, .0056, a.distanceTo(b), 4, 1);
    rib.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
    rib.translate(middle.x, middle.y, middle.z);
    piece(kernel, rib, 0xe6fff8);
  }
  const innerMesh = new THREE.Mesh(mergeGeometries(kernel), new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: .3, metalness: .03, flatShading: true,
    emissive: 0x54cbbb, emissiveIntensity: KERNEL_GLOW,
  }));
  kernel.forEach(g => g.dispose());
  innerMesh.name = 'armillary-core-inner'; crystal.add(innerMesh);

  const outline = [new THREE.EdgesGeometry(shell), new THREE.EdgesGeometry(new THREE.OctahedronGeometry(core * .56))];
  outline[0].applyMatrix4(new THREE.Matrix4().makeScale(1.004, 1.004, 1.004));
  outline[1].applyMatrix4(new THREE.Matrix4().makeRotationZ(.34).multiply(new THREE.Matrix4().makeRotationY(.62)));
  const edges = new THREE.LineSegments(mergeGeometries(outline), new THREE.LineBasicMaterial({
    color: 0xd6fff3, transparent: true, opacity: .56, depthWrite: false,
  }));
  outline.forEach(g => g.dispose());
  edges.name = 'armillary-core-edges'; crystal.add(edges); group.add(crystal);

  // One accumulated clock drives all four turns; each angle is reduced to
  // [0, 2pi) so nothing drifts after hours of idling.
  let elapsed = 0;
  const tau = Math.PI * 2;
  return { mesh: group, update(dt = 0) {
    if (dt <= 0 || !group.visible) return;
    elapsed += dt;
    outer.rotation.z = (elapsed * tau / spin.outer) % tau;
    gimbal.rotation.y = (elapsed * tau / spin.middle) % tau;
    innerSpin.rotation.x = (elapsed * tau / spin.inner) % tau;
    crystal.rotation.y = (elapsed * tau / spin.core) % tau;
    // The light keeps its own clock, so it streams along the band even when the
    // mechanical turn is stopped, and much faster than the brass moves.
    outerTrail.material.uniforms.uHead.value = (elapsed * tau / trails.outer.period) % tau;
    middleTrail.material.uniforms.uHead.value = (elapsed * tau / trails.middle.period) % tau;
  } };
}
