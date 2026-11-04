import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
// The world's navigation predicate now imports the real shell collision
// source; resolve its Three.js import the same way as the browser import map.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: new URL('../vendor/three/three.module.min.js', import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { ENTRANCE_YAW, HUB_PORTALS } = await import('../world/space-config.js');
const { STATIONS } = await import('../world/layout.js');

// A door's front is the side its normal points to: (sin yaw, cos yaw).
const front = (gate, x, z) => {
  const dx = x - gate.x, dz = z - gate.z;
  return { normal: dx * Math.sin(gate.yaw) + dz * Math.cos(gate.yaw), tangent: dx * Math.cos(gate.yaw) - dz * Math.sin(gate.yaw) };
};

test('every interior door faces the only opening, on the west glass face', () => {
  assert.equal(HUB_PORTALS.length, 3);
  for (const gate of HUB_PORTALS) {
    assert.equal(gate.yaw, ENTRANCE_YAW, gate.id);
    // Facing west means the front normal points to negative x.
    assert.ok(Math.sin(gate.yaw) < -.9, `${gate.id} front x ${Math.sin(gate.yaw)}`);
    assert.ok(Math.abs(Math.cos(gate.yaw)) < .01, `${gate.id} front z ${Math.cos(gate.yaw)}`);
  }
});

test('three doors: the two front ones flank the entrance, the reading room closes the axis', () => {
  assert.deepEqual(HUB_PORTALS.map(g => [g.x, g.z]), [[11, 0], [-5.5, 6.4], [-5.5, -6.4]]);
  assert.ok(HUB_PORTALS.find(g => g.id === 'about').z < 0, 'About is the north door');
  assert.ok(HUB_PORTALS.find(g => g.id === 'friends').z > 0, 'Friends is the south door');
  assert.equal(HUB_PORTALS.find(g => g.id === 'writing').z, 0, 'the reading room holds the main axis');
  assert.equal(HUB_PORTALS.find(g => g.id === 'about').href, '/about/');
  // Friend links live on one static directory page, so the door never gains a
  // companion door when a friend is added.
  assert.equal(HUB_PORTALS.find(g => g.id === 'friends').href, '/friends/');
  assert.equal(HUB_PORTALS.find(g => g.id === 'writing').href, '/?space=library');
  // The studio keeps its space and its card link; it simply lost its own door.
  assert.equal(HUB_PORTALS.some(g => g.id === 'works' || g.href.includes('studio')), false);
});

test('each door station stands in front of its door and looks at it', () => {
  for (const gate of HUB_PORTALS) {
    const station = STATIONS.find(s => s.id === gate.id);
    assert.ok(station, gate.id);
    const from = front(gate, station.at[0], station.at[1]);
    assert.ok(from.normal > 1.2 && from.normal < 2.8, `${gate.id} stands ${from.normal} m from the door`);
    assert.ok(Math.abs(from.tangent) < .9, `${gate.id} is off-centre by ${from.tangent} m`);
    const site = front(gate, station.look[0], station.look[1]);
    assert.ok(Math.abs(site.normal) < 1.2 && Math.abs(site.tangent) < .9, `${gate.id} look is not on the door`);
    // Looking at the door means moving toward the door plane, so the view
    // direction opposes the front normal and requires a deliberate step.
    const vx = station.look[0] - station.at[0], vz = station.look[1] - station.at[1];
    assert.ok(vx * Math.sin(gate.yaw) + vz * Math.cos(gate.yaw) < -.5, `${gate.id} looks away from the door`);
  }
});
