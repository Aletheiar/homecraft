export function getSpace(search = globalThis.location?.search || '') {
  const space = new URLSearchParams(search).get('space');
  return ['library', 'studio'].includes(space) ? space : 'hub';
}

// The original model has a single opening, on the west face. Every interior
// portal faces it so a visitor who walks in sees the front of each portal.
export const ENTRANCE_YAW = -Math.PI / 2;

// Hall plan. +x is east, +z is south, so the west opening sits at x = -13.4 and
// the walkable hall ends near |x| = |z| = 16.4. These anchors are shared by the
// furniture, the floor drawing and the stations so a later layout change stays
// one edit.
export const HALL_CENTER = { x: 0, z: 0 };
export const HALL_EMBLEM = { radius: 3.9 };
// The two feature corners: the workbench in the north-east, the lounge in the
// south-east. Furniture is placed around these anchors, not on top of them.
const WORKBENCH = { deskX: 12.7, deskZ: -12.6, yaw: -Math.PI/6, chairZ: -11.5, shelfX: 15.95, shelfZ: -14.25 };
// One rigid frame for the furniture, image planes, targets and player positions.
export function workbenchPoint(dx,dz,anchor=HALL_SPOTS.workbench) {
  const c=Math.cos(anchor.yaw||0),s=Math.sin(anchor.yaw||0);
  return {x:anchor.deskX+dx*c+dz*s,z:anchor.deskZ-dx*s+dz*c};
}
const approach=workbenchPoint(0,2.4,WORKBENCH);
export const HALL_SPOTS = {
  workbench: { ...WORKBENCH, approach:[approach.x,approach.z] },
  lounge: { x: 13.9, z: 13.4 },
  exhibit: { x: HALL_CENTER.x, z: HALL_CENTER.z },
};
// Relative to the desk anchor. The backdrop, working layer and turned left
// wing occupy different depths; only the centre rises near the sloped roof.
export const WORKSTATION_LAYOUT = {
  wall: { dx: -.4, dz: -1.38, width: 5.6, top: 4.12 },
  wing: { dx: -2.7, dz: -.25, yaw: Math.PI / 3, width: 1.85 },
  rack: { dx: -2.05, dz: .5 },
  cabinet: { dx: 2.2, dz: .45 },
  posters: {
    main: { dx: -.1, dz: -1.288, y: 2.91, w: 3.2, yaw: 0 },
    side: { y: 2.18, w: 1.15 },
  },
};
// Museum exhibit dimensions are local to the upper stone platform. The hall
// centre, all stations and the three portal definitions stay fixed. `spin`
// holds one period in seconds per turning part, so the motion is a single
// readable number instead of a radian rate. The crystal's glow is a constant in
// `world/armillary.js`: a breathing version measured a 2.3% swing in screen
// luminance and was removed, so there is deliberately nothing to tune here.
export const HALL_EXHIBIT = {
  plinth: 2.75, height: .17, cap: 2.23, upperWidth: 2.15, upperHeight: .2, capHeight: .045, gap: .01,
  // Corner lantern panes: an emissive surface, never a light. The value is
  // kept low so the brass frame and the stone stay the bright things.
  lantern: { tint: 0xecc487, emissive: .45 },
  armillary: {
    center: 1.60, radii: [1.232, 1.134, 1.036], tube: .027, band: .078, core: .3375,
    spin: { outer: 20, middle: 40, inner: 60, core: 10 },
    // Light that travels along the two driven bands. `period` is the time for
    // the light to lap the ring and is independent of `spin`, so the glow keeps
    // streaming past the metal even if the mechanical turn is paused. `arc` is
    // the lit stretch in degrees behind the head, `gain` its intensity.
    trails: {
      outer: { period: 4, arc: 55, color: 0x9ff0e4, gain: 1.35, radius: .026 },
      middle: { period: 7, arc: 44, color: 0xffd08a, gain: .9, radius: .019 },
    },
  },
};

export const HUB_PORTALS = [
  { id: 'writing', title: '随笔图书室', subtitle: '收藏文字、思考与故事', color: 0x7bbbad, x: 11, z: 0, yaw: ENTRANCE_YAW, href: '/?space=library' },
  { id: 'friends', title: '友链目录', subtitle: '通往其他有趣的角落', color: 0xa69ac8, x: -5.5, z: 6.4, yaw: ENTRANCE_YAW, href: '/friends/' },
  { id: 'about', title: '关于本站', subtitle: '认识我，以及这个小世界', color: 0x91adbb, x: -5.5, z: -6.4, yaw: ENTRANCE_YAW, href: '/about/' },
];
