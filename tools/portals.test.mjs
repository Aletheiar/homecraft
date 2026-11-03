import test from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../world/portal-rules.js').catch(() => ({}));
const gate = { x: 0, z: 0, yaw: 0 };

test('entering a portal requires crossing its opening from the front', () => {
  assert.equal(typeof api.crossedPortal, 'function');
  assert.equal(api.crossedPortal(gate, { x: 0, y: 0, z: .3 }, { x: 0, y: 0, z: -.2 }), true);
  assert.equal(api.crossedPortal(gate, { x: 0, y: 0, z: -.2 }, { x: 0, y: 0, z: .3 }), false);
  assert.equal(api.crossedPortal(gate, { x: 3, y: 0, z: .3 }, { x: 3, y: 0, z: -.2 }), false);
  assert.equal(api.crossedPortal(gate, { x: 0, y: 5, z: .3 }, { x: 0, y: 5, z: -.2 }), false);
});

test('teleporting across the hall does not accidentally enter a portal', () => {
  assert.equal(typeof api.crossedPortal, 'function');
  assert.equal(api.crossedPortal(gate, { x: 0, y: 0, z: 6 }, { x: 0, y: 0, z: -6 }), false);
  assert.equal(api.crossedPortal({ x: 12, z: 0, yaw: -Math.PI / 2 }, { x: 11.7, y: 0, z: 0 }, { x: 12.2, y: 0, z: 0 }), true);
});

test('portal targets permit local rooms and HTTPS blogs but reject script URLs', () => {
  assert.equal(typeof api.portalTarget, 'function');
  assert.equal(api.portalTarget('/?space=library', 'http://127.0.0.1:8765/'), 'http://127.0.0.1:8765/?space=library');
  assert.equal(api.portalTarget('https://terryhu.cn/', 'http://127.0.0.1:8765/'), 'https://terryhu.cn/');
  assert.equal(api.portalTarget('javascript:alert(1)', 'http://127.0.0.1:8765/'), null);
});

