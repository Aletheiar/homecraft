import polygons from '../assets/models/pool-regions.js';
import { navigationBlocks } from './boundaries.js';
import { HALL_SPOTS, HALL_EXHIBIT, ORI_EXHIBIT } from './space-config.js';

// A* walks the courtyard floor, not the roof. Include low glass in its map
// so a route to a pool cannot cut through the imported shell. Manual climbing
// continues to use the separate walkable slope surface.
export const blockedAt = navigationBlocks;
// The .4 scale increases linear dimensions by 25% over the first preview.
export const ISLAND = { x0: -45, x1: 45, z0: -45, z1: 45 };
export const SPAWN = { x: -29, z: 0, heading: Math.PI / 2 };
export const INTRO = { pos: [-83, 53, 88], portrait: [-114, 76, 27], look: [0, 5, 0] };
export const POOL = { x0: -39, x1: 39, z0: -39, z1: 39, water: -.015, bed: -3, polygons };
// The centre display is a step, not a wall. Its stone top is real floor, so a
// visitor walks on and off the plinth (and jumps or flies over it) instead of
// meeting an invisible column. Both stone tiers report their real local height;
// the instrument is decorative, so there is no full-height body blocker.
export const HALL_EXHIBIT_TOP = .02 + HALL_EXHIBIT.height + HALL_EXHIBIT.gap + HALL_EXHIBIT.upperHeight + HALL_EXHIBIT.capHeight;
export function floorAt(x, z) {
  if(Math.abs(x)<=HALL_EXHIBIT.cap/2&&Math.abs(z)<=HALL_EXHIBIT.cap/2)return HALL_EXHIBIT_TOP;
  return Math.abs(x)<=HALL_EXHIBIT.plinth/2&&Math.abs(z)<=HALL_EXHIBIT.plinth/2 ? .02+HALL_EXHIBIT.height : 0;
}
// Positions are world blocks: +x east, +z south. The three doors face the west
// opening, so each station stands in front of its door and looks east at it.
export const STATIONS = [
  // Welcome and Articles remain Dock cards without physical hall fixtures.
  { id: 'writing', page: false, name: '随笔图书室', en: 'Journal', icon: 'writing', at: [8.8, 0], look: [11, 0] },
  { id: 'friends', page: false, name: '友链目录', en: 'Friends', icon: 'link', at: [-7.8, 6.4], look: [-5.5, 6.4] },
  { id: 'about', page: false, name: '关于本站', en: 'About', icon: 'about', at: [-7.8, -6.4], look: [-5.5, -6.4] },
  // The fan artwork hangs above the hall, so this station stands on the floor
  // below it: the card is what the visitor reads, the painting is what they see.
  { id: 'miku', name: '玻璃之下', en: 'Miku', icon: 'about', at: [-3, .6], look: [1, 0] },
  // The workbench monitor is a hot spot; its label and link live in index.html.
  { id: 'workbench', icon: 'link', at: HALL_SPOTS.workbench.approach, look: [HALL_SPOTS.workbench.deskX, HALL_SPOTS.workbench.deskZ] },
  { id: 'ori', name: '查看展品 · Ori', en: 'View exhibit · Ori', icon: 'about', at: ORI_EXHIBIT.approach, look: [ORI_EXHIBIT.x, ORI_EXHIBIT.z] },
  { id: 'plaza', name: '庭院音乐台', en: 'Music', icon: 'map', at: [-25, -8], look: [-28, -8] },
  { id: 'observatory', name: '庭院留言亭', en: 'Guestbook', icon: 'map', at: [-25, 9], look: [-28, 9] },
];
