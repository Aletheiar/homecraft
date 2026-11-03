// Remembers where a visitor left the hall, so coming back from a room lands them
// in front of the same door with the same view instead of at the default spawn.
// The checkpoint lives in sessionStorage, belongs to one tab, and is consumed by
// the first arrival, so a refresh afterwards starts normally.
const KEY = 'homecraft.hub-return.v1';
// A checkpoint outside the island or high in the air is not a place to stand.
const ISLAND_HALF = 45, CEILING = 30;
// A visitor who walked into a veil returns a step away from it, never inside.
const CLEARANCE = 1.5;

function storage(store) {
  if (store) return store;
  try { return sessionStorage; } catch { return { setItem() {}, getItem() { return null; }, removeItem() {} }; }
}
const finiteGate = gate => !!gate && Number.isFinite(gate.x) && Number.isFinite(gate.z) && Number.isFinite(gate.yaw);
// The door's front is the side its normal points to: (sin yaw, cos yaw).
const normalAt = (gate, x, z) => (x - gate.x) * Math.sin(gate.yaw) + (z - gate.z) * Math.cos(gate.yaw);
// The rig accumulates yaw over a session; store it wrapped so a restored view
// never depends on how long the visitor had been turning before leaving.
const wrap = angle => Number.isFinite(angle) ? Math.atan2(Math.sin(angle), Math.cos(angle)) : NaN;

export function saveHubReturn(player, rig, gate, store) {
  try {
    storage(store).setItem(KEY, JSON.stringify({
      x: player.pos.x, z: player.pos.z, y: player.y,
      yaw: wrap(rig.yaw), firstPerson: !!rig.firstPerson,
      gate: finiteGate(gate) ? { x: gate.x, z: gate.z, yaw: gate.yaw } : null,
    }));
  } catch { /* storage full or blocked: the return simply starts at the spawn */ }
}

// Returns the restored spot, or null when this load is not a return trip.
export function consumeHubReturn(search, store) {
  const params = new URLSearchParams(search || '');
  if (!params.has('return')) return null;
  const space = params.get('space');
  if (space && space !== 'hub') return null;
  const box = storage(store);
  let saved = null;
  try {
    const raw = box.getItem(KEY);
    box.removeItem(KEY);
    saved = raw ? JSON.parse(raw) : null;
  } catch { saved = null; }
  if (!saved || typeof saved !== 'object') return null;
  const gate = finiteGate(saved.gate) ? saved.gate : null;
  let x = Number(saved.x), z = Number(saved.z);
  const standable = Number.isFinite(x) && Number.isFinite(z) && Math.abs(x) <= ISLAND_HALF && Math.abs(z) <= ISLAND_HALF && !(Number(saved.y) > CEILING);
  if (!standable) {
    x = gate ? gate.x + Math.sin(gate.yaw) * CLEARANCE : 0;
    z = gate ? gate.z + Math.cos(gate.yaw) * CLEARANCE : 0;
  } else if (gate) {
    // The checkpoint is taken just after the crossing, so it sits on the
    // face the visitor stepped onto. Step back out on the opposite face —
    // the one they entered from — so a rear approach is not teleported
    // through the veil to the front.
    const normal = normalAt(gate, x, z);
    if (Math.abs(normal) < CLEARANCE) {
      const side = normal < 0 ? 1 : -1, push = side * CLEARANCE - normal;
      x += Math.sin(gate.yaw) * push; z += Math.cos(gate.yaw) * push;
    }
  }
  const face = gate ? Math.atan2(gate.x - x, gate.z - z) : Number(saved.yaw);
  const yaw = Number.isFinite(saved.yaw) ? wrap(saved.yaw) : wrap(face + Math.PI);
  return { x, z, yaw, face, firstPerson: !!saved.firstPerson };
}
