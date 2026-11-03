import { getSpace } from '../space-config.js';

export const SPACE = getSpace();
export const ISLAND = { x0: -13, x1: 13, z0: -11, z1: 11 };
// The wall occupies the metre outside these interior bounds. All rooms are
// sealed, including the ceiling; portals change the root page's query string.
export const ROOM = { x0: -12, x1: 12, z0: -10, z1: 10, ceiling: 6 };
export const SPAWN = { x: 0, z: 4.5, heading: Math.PI };
export const INTRO = { pos: [0, 4.6, 7.5], portrait: [0, 4.6, 8], look: [0, 1.2, -3] };
export const LIGHT_VOLUME = { min: [-13, -1, -11], extent: [26, 8, 22], size: [26, 8, 22] };
export const SHELTER = { x0: -13, z0: -11, w: 26, d: 22 };

// The return portal is the only in-world way back. It already carries the
// "return to the hall" sign, so no second guide sign sits in the room.
const stations = {
  library: [
    { id: 'blog', name: '文章书架', en: 'Articles', icon: 'blog', at: [-6, -3], look: [-6, -5.5] },
    { id: 'writing', name: '随笔手帐', en: 'Journal', icon: 'writing', at: [6, -3], look: [6, -5.5] },
  ],
  studio: [
    { id: 'works', name: '项目工作台', en: 'Projects', icon: 'works', at: [0, -3], look: [0, -5.5] },
  ],
  friends: [
    { id: 'friends', name: '示例博客导览', en: 'Example blogs', icon: 'about', at: [0, .4], look: [0, -2] },
  ],
};
export const STATIONS = stations[SPACE] || stations.library;

export const PORTALS = [
  // The flag asks the hall to restore the spot this visitor left from.
  { id: 'return-hub', title: '返回中央大厅', subtitle: 'HOME · 本地空间', color: 0x91bb9d, x: 0, z: 8, yaw: Math.PI, href: '/?space=hub&return=1' },
  ...(SPACE === 'friends' ? [
    { id: 'example-terry', title: 'Terry', subtitle: '示例链接 · terryhu.cn', color: 0x83bcb5, x: -7, z: -7.2, yaw: 0, href: 'https://terryhu.cn/' },
    { id: 'example-134688', title: '134688', subtitle: '示例链接 · m.134688.xyz', color: 0xd4b17e, x: 0, z: -7.2, yaw: 0, href: 'https://m.134688.xyz/' },
    { id: 'example-rsliyu', title: 'Rsliyu', subtitle: '示例链接 · rsliyu.com', color: 0xa9a0ca, x: 7, z: -7.2, yaw: 0, href: 'https://rsliyu.com/' },
  ] : []),
];
