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
export const HALL_SPOTS = {
  workbench: { deskX: 13.3, deskZ: -12.6, chairZ: -11.5, shelfX: 14.95, shelfZ: -14.25, approach: [13.3, -10.2] },
  lounge: { x: 13.9, z: 13.4 },
  exhibit: { x: HALL_CENTER.x, z: HALL_CENTER.z },
};
// Museum exhibit dimensions are local to the upper stone platform. The hall
// centre, all stations and the three portal definitions stay fixed. `spin`
// holds one period in seconds per turning part, so the motion is a single
// readable number instead of a radian rate.
export const HALL_EXHIBIT = {
  plinth: 2.75, height: .17, cap: 2.23, upperWidth: 2.15, upperHeight: .2, capHeight: .045, gap: .01,
  armillary: {
    center: 1.60, radii: [1.232, 1.134, 1.036], tube: .027, band: .078, core: .3375,
    spin: { outer: 20, middle: 40, inner: 60, core: 10 },
  },
};

export const HUB_PORTALS = [
  { id: 'writing', title: '随笔图书室', subtitle: '收藏文字、思考与故事', color: 0x7bbbad, x: 11, z: 0, yaw: ENTRANCE_YAW, href: '/?space=library' },
  { id: 'friends', title: '友链目录', subtitle: '通往其他有趣的角落', color: 0xa69ac8, x: -5.5, z: 6.4, yaw: ENTRANCE_YAW, href: '/friends/' },
  { id: 'about', title: '关于本站', subtitle: '认识我，以及这个小世界', color: 0x91adbb, x: -5.5, z: -6.4, yaw: ENTRANCE_YAW, href: '/about/' },
];
