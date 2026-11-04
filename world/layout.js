import polygons from '../assets/models/pool-regions.js';
import { navigationBlocks } from './boundaries.js';

// A* walks the courtyard floor, not the roof. Include low glass in its map
// so a route to a pool cannot cut through the imported shell. Manual climbing
// continues to use the separate walkable slope surface.
export const blockedAt = navigationBlocks;
// The .4 scale increases linear dimensions by 25% over the first preview.
export const ISLAND = { x0: -45, x1: 45, z0: -45, z1: 45 };
export const SPAWN = { x: -29, z: 0, heading: Math.PI / 2 };
export const INTRO = { pos: [-83, 53, 88], portrait: [-70, 95, 170], look: [0, 5, 0] };
export const POOL = { x0: -39, x1: 39, z0: -39, z1: 39, water: -.015, bed: -3, polygons };
export const STATIONS = [
  // Welcome and Articles remain Dock cards without physical hall fixtures.
  // All four doors face the west opening, so each station stands in
  // front of its door and looks east at it.
  { id: 'works', page: false, name: '项目研究', en: 'Projects', icon: 'works', at: [5.2, -5.6], look: [7.2, -5.6] },
  { id: 'writing', page: false, name: '随笔图书室', en: 'Journal', icon: 'writing', at: [-5.6, -5.6], look: [-4, -5.6] },
  { id: 'friends', page: false, name: '友链目录', en: 'Friends', icon: 'about', at: [5.2, 5.6], look: [7.2, 5.6] },
  { id: 'about', page: false, name: '关于本站', en: 'About', icon: 'about', at: [-5.6, 5.6], look: [-4, 5.6] },
  // The fan artwork hangs above the hall, so this station stands on the floor
  // below it: the card is what the visitor reads, the painting is what they see.
  { id: 'miku', name: '玻璃之下', en: 'Miku', icon: 'about', at: [-2.4, .4], look: [1, 0] },
  { id: 'plaza', name: '庭院音乐台', en: 'Music', icon: 'map', at: [-20, -6.4], look: [-22.4, -6.4] },
  { id: 'observatory', name: '庭院观测台', en: 'Observatory', icon: 'map', at: [-20, 7.2], look: [-22.4, 7.2] },
].map(s => ({ ...s, at: s.at.map(n => n * 1.25), look: s.look.map(n => n * 1.25) }));
