import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { canvasTexture } from '@engine/world/textures.js';
import { buildPortals, attachPortalControls } from '../portals.js';
import { revealArrival, markArrival, chargeAndLeave } from '../portal-transition.js';
import { SPACE, ROOM, SPAWN, STATIONS, PORTALS } from './layout.js';

const WOOD = { tex: 'walnut' }, METAL = { tex: 'paint', tint: 0xa48c62 };
const PAPER = { tex: 'paint', tint: 0xf0e9d6 }, INK = { tex: 'paint', tint: 0x405c61 };
const TITLES = { library: '手帐图书室', studio: '项目工作室', friends: '博客传送客厅' };

export function build({ grid, layer }) {
  const furniture = new BoxBatch(layer), trim = new BoxBatch(layer);
  const planes = [], obstacles = [], solids = [], hotspots = [], bakes = [];
  const box = (...args) => furniture.box(...args);
  function solid(x, z, w, d, height = 1) {
    const bounds = { x0: x - w / 2 - .05, x1: x + w / 2 + .05, z0: z - d / 2 - .05, z1: z + d / 2 + .05, level: 0 };
    obstacles.push(bounds); solids.push({ ...bounds, height });
  }

  grid.define('roomWall', { tex: { all: 'plaster' }, merge: true, map: '#e0d8c8' });
  grid.define('roomFloor', { tex: { all: 'parquet' }, merge: true, map: '#997951' });
  grid.define('roomCeiling', { tex: { all: 'plaster' }, merge: true, map: '#e8e1d6' });
  grid.fill(-13, -2, -11, 13, -1, 11, 'stone');
  grid.fill(-13, -1, -11, 13, 0, 11, 'roomFloor');
  grid.fill(-13, 0, -11, -12, 6, 11, 'roomWall');
  grid.fill(12, 0, -11, 13, 6, 11, 'roomWall');
  grid.fill(-12, 0, -11, 12, 6, -10, 'roomWall');
  grid.fill(-12, 0, 10, 12, 6, 11, 'roomWall');
  grid.fill(-13, 6, -11, 13, 7, 11, 'roomCeiling');
  for (const x of [-11.94, 11.94]) {
    trim.box(x, .03, 0, .1, .8, 20, WOOD);
    trim.box(x, 5.5, 0, .15, .18, 20, METAL);
  }
  for (const z of [-9.94, 9.94]) {
    trim.box(0, .03, z, 24, .8, .1, WOOD);
    trim.box(0, 5.5, z, 24, .18, .15, METAL);
  }
  // A broad, unobstructed central aisle connects every station and portal.
  box(0, .008, .1, 3.8, .015, 12.6, { tex: 'linen', tint: 0x8eaaa1 });
  for (const x of [-7, 0, 7]) for (const z of [-4, 4]) {
    trim.box(x, 5.75, z, 2.2, .12, 1.1, WOOD);
    trim.box(x, 5.72, z, 1.95, .035, .88, { tex: 'paint', tint: 0xffe1aa, emissive: .9 });
    bakes.push({ id: `room-lamp-${x}-${z}`, position: [x, 5.5, z], power: 2, radius: 9, direction: null });
  }

  function sign(id, title, subtitle, x, y, z, width = 2.7, yaw = 0) {
    const texture = canvasTexture(768, 288, (ctx, w, h) => {
      ctx.fillStyle = '#f1ecdf'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#628c83'; ctx.fillRect(0, 0, w, 12);
      ctx.fillStyle = '#263e3c'; ctx.font = 'bold 63px "Microsoft YaHei",sans-serif'; ctx.fillText(title, 32, 117);
      ctx.fillStyle = '#68766d'; ctx.font = '31px "Microsoft YaHei",sans-serif'; ctx.fillText(subtitle, 34, 211);
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, width * .375), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    plane.position.set(x, y, z); plane.rotation.y = yaw; planes.push(plane);
    if (id) hotspots.push({ id, box: new THREE.Box3(new THREE.Vector3(x - width / 2, y - .65, z - .3), new THREE.Vector3(x + width / 2, y + .65, z + .3)) });
  }
  function desk(x, z, width = 3.4) {
    box(x, .72, z, width, .12, 1.35, WOOD);
    for (const dx of [-width / 2 + .18, width / 2 - .18]) for (const dz of [-.48, .48]) box(x + dx, 0, z + dz, .13, .72, .13, METAL);
    solid(x, z, width, 1.35, .84);
  }
  function notebook(x, z) {
    box(x, .85, z, .7, .045, .5, INK);
    box(x, .9, z, .65, .025, .45, PAPER);
    box(x, .929, z, .015, .006, .43, INK);
    for (let line = 0; line < 5; line++) box(x, .932, z - .14 + line * .065, .48, .005, .008, { tex: 'paint', tint: 0xb4b6a7 });
    box(x + .45, .85, z, .025, .025, .4, METAL);
  }
  function stool(x, z) {
    box(x, .04, z, .78, .4, .78, WOOD); box(x, .44, z, .85, .09, .85, { tex: 'linen', tint: 0x718a7e }); solid(x, z, .85, .85, .53);
  }
  function shelf(x, z, yaw = 0) {
    furniture.at(x, 0, z, yaw, () => {
      box(0, .04, 0, 3, 3.25, .62, WOOD);
      for (let row = 0; row < 4; row++) {
        box(0, .2 + row * .76, .34, 2.7, .6, .06, { tex: 'bookshelf' });
        box(0, .16 + row * .76, .05, 3.12, .08, .9, WOOD);
      }
      box(0, 3.27, 0, 3.15, .12, .9, METAL);
    });
    const sideways = Math.abs(Math.sin(yaw)) > .5;
    solid(x, z, sideways ? .9 : 3.15, sideways ? 3.15 : .9, 3.39);
  }
  function planter(x, z) {
    box(x, .03, z, .65, .6, .65, { tex: 'terracotta' });
    box(x, .63, z, .95, 1.05, .95, { tex: 'leaves' }); solid(x, z, .95, .95, 1.68);
  }
  function sofa(x, z, yaw = 0) {
    furniture.at(x, 0, z, yaw, () => {
      box(0, .06, 0, 3.3, .4, 1.1, WOOD);
      box(0, .46, 0, 3.05, .15, .95, { tex: 'linen', tint: 0x617e75 });
      box(0, .6, -.45, 3.3, .6, .22, { tex: 'linen', tint: 0x617e75 });
      for (const side of [-1.57, 1.57]) box(side, .46, 0, .2, .33, 1.1, WOOD);
    });
    solid(x, z, 3.4, 1.15, 1.2);
  }

  if (SPACE === 'library') {
    for (const x of [-8, -4, 0, 4, 8]) shelf(x, -8.8);
    for (const z of [-3.5, .5, 4.5]) { shelf(-10.6, z, Math.PI / 2); shelf(10.6, z, -Math.PI / 2); }
    for (const x of [-6, 6]) {
      desk(x, -5.5); notebook(x, -5.5); stool(x, -4.15);
      // Station positions stay clear of the chair and desk collision bounds.
      box(x + 1.15, .85, -5.7, .13, .5, .13, METAL);
      box(x + 1.15, 1.35, -5.7, .65, .12, .4, { tex: 'paint', tint: 0xffd594, emissive: .5 });
    }
    sofa(-6, 1.6); sofa(6, 1.6);
    desk(-6, 3.8, 2.4); desk(6, 3.8, 2.4);
    planter(-10, 8.5); planter(10, 8.5);
  } else if (SPACE === 'studio') {
    desk(0, -5.6, 6); notebook(-1.2, -5.6);
    box(.9, .85, -5.8, 1.8, 1.05, .12, INK);
    box(.9, .96, -5.72, 1.6, .82, .025, { tex: 'paint', tint: 0x82b6ad, emissive: .35 });
    box(.9, .85, -5.45, 1.3, .05, .4, METAL);
    for (const x of [-6, 6]) {
      box(x, .04, -1.3, 2, .92, 2, { tex: 'plaster' });
      box(x, .96, -1.3, 2.12, .08, 2.12, METAL);
      box(x, 1.04, -1.3, .95, 1, .95, { tex: 'paint', tint: x < 0 ? 0x82aaa2 : 0xc4aa79 }, { ry: Math.PI / 5 });
      solid(x, -1.3, 2.12, 2.12, 2.04);
      shelf(x, -8.8);
    }
    sofa(-6, 3.3); sofa(6, 3.3); planter(-10, 8); planter(10, 8);
    sign(null, '项目陈列 · 示例', '等待添加自己的作品', 0, 3.4, -9.88, 4.7);
  } else {
    sofa(-7, 2.7); sofa(7, 2.7);
    desk(-7, 4.7, 2.3); desk(7, 4.7, 2.3);
    box(0, .04, -2, 2.6, .9, .75, WOOD); solid(0, -2, 2.6, .75, .94);
    planter(-10.5, -7.3); planter(10.5, -7.3); planter(10, 8.5);
    sign(null, '示例博客传送门', '展示可访问站点，不代表真实好友', 0, 4.8, -9.88, 6.5);
  }

  for (const station of STATIONS) {
    const [x, z] = station.look;
    sign(station.id, station.name, SPACE === 'friends' ? '示例站点 · 点击查看' : '点击导览牌查看', x, 1.7, z + .45);
  }
  const portals = buildPortals(layer, PORTALS);
  obstacles.push(...portals.obstacles);
  const contains = (x, z, feet = 0) => Number.isFinite(x) && Number.isFinite(z) && Number.isFinite(feet)
    && x > ROOM.x0 + .35 && x < ROOM.x1 - .35 && z > ROOM.z0 + .35 && z < ROOM.z1 - .35
    && feet >= -.05 && feet + 1.8 < ROOM.ceiling - .04;
  const boundary = {
    levels() {},
    collides(x, feet, z) {
      if (!contains(x, z, feet)) return true;
      for (const o of solids) if (feet < o.height && feet + 1.8 > 0 && x > o.x0 - .28 && x < o.x1 + .28 && z > o.z0 - .28 && z < o.z1 + .28) return true;
      return false;
    },
  };
  return {
    batches: { furniture, trim, ...portals.batches },
    planes: [...planes, ...portals.planes], obstacles, hotspots: [...hotspots, ...portals.hotspots], bakes,
    sites: [boundary], named: { roomReady: true, space: SPACE, roomBounds: ROOM, roomContains: contains, roomPortals: PORTALS, veils: portals.veils },
  };
}

export function setup({ player, rig, world }) {
  const title = TITLES[SPACE] || TITLES.library;
  const setText = (selector, text) => { const element = document.querySelector(selector); if (element) element.textContent = text; };
  setText('.pyramid-brand h1', title);
  setText('.brand-eyebrow', 'HOMECRAFT · 独立室内空间');
  setText('#model-status', `${title} · 本地预览`);
  setText('.explore-hint span', 'WASD 移动 · 拖动视角 · V 第一人称 · 双击空格飞行');
  const returnButton = document.querySelector('#return-button');
  let leaving = false;
  if (returnButton) {
    returnButton.textContent = '返回大厅';
    returnButton.addEventListener('click', () => {
      if (leaving) return;
      leaving = true;
      markArrival();
      chargeAndLeave(() => location.assign('/?space=hub&return=1'));
    });
  }
  // BFCache restores the old module state; a latch left by the departure
  // would make the return button inert after Back.
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    leaving = false;
    document.querySelector('#portal-ripple')?.remove();
    document.documentElement.classList.remove('arriving');
  });
  function enter() {
    player.cancel(); rig.skipIntro();
    player.teleport(SPAWN.x, SPAWN.z, { look: [SPAWN.x, -4] });
    rig.recenter(player); rig.setFirstPerson(true, Math.PI);
  }
  const enterButton = document.querySelector('#enter-button');
  if (enterButton) { enterButton.textContent = '走进房间'; enterButton.addEventListener('click', enter); }
  const overview = document.querySelector('#overview-button');
  if (overview) {
    overview.textContent = '室内全景';
    overview.addEventListener('click', () => {
      player.cancel(); rig.skipIntro(); rig.setFirstPerson(false);
      rig.showcase([9.5, 4.7, 8.6], [0, 1.4, -3]);
    });
  }
  const controls = attachPortalControls({ player, rig, definitions: PORTALS, veils: world.veils });
  let initialized = false, lastX = SPAWN.x, lastZ = SPAWN.z;
  const update = player.update;
  player.update = (dt, input, yaw, firstPerson) => {
    update(dt, input, yaw, firstPerson);
    if (!world.roomContains(player.pos.x, player.pos.z, player.y)) player.teleport(lastX, lastZ);
    else if (player.mode === 'ground') { lastX = player.pos.x; lastZ = player.pos.z; }
  };
  const goTo = player.goTo, flyTo = player.flyTo, zipTo = player.zipTo;
  player.goTo = (x, z, station) => world.roomContains(x, z) && goTo(x, z, station);
  player.flyTo = (x, z) => world.roomContains(x, z) && flyTo(x, z);
  player.zipTo = target => world.roomContains(target.x, target.z, target.y) && zipTo(target);
  return {
    update(dt) {
      if (!initialized) { initialized = true; enter(); revealArrival(); }
      if (!world.roomContains(player.pos.x, player.pos.z, player.y)) player.teleport(lastX, lastZ);
      controls.update(dt);
    },
  };
}
