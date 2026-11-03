export function getSpace(search = globalThis.location?.search || '') {
  const space = new URLSearchParams(search).get('space');
  return ['library', 'studio', 'friends'].includes(space) ? space : 'hub';
}

// The original model has a single opening, on the west face. Every interior
// door faces it so a visitor who walks in sees the front of each door.
export const ENTRANCE_YAW = -Math.PI / 2;

export const HUB_PORTALS = [
  { id: 'writing', title: '随笔图书室', subtitle: '走入传送门', color: 0x7bbbad, x: -5, z: -7, yaw: ENTRANCE_YAW, href: '/?space=library' },
  { id: 'works', title: '项目工作室', subtitle: '走入传送门', color: 0xd5b578, x: 9, z: -7, yaw: ENTRANCE_YAW, href: '/?space=studio' },
  { id: 'friends', title: '博客传送客厅', subtitle: '通往其他人的博客 · 示例友链', color: 0xa69ac8, x: 9, z: 7, yaw: ENTRANCE_YAW, href: '/?space=friends' },
  { id: 'about', title: '关于本站', subtitle: 'Aletheia · 自我介绍与社交账号', color: 0x91adbb, x: -5, z: 7, yaw: ENTRANCE_YAW, href: '/about/' },
];
