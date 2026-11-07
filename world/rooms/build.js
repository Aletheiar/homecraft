import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { canvasTexture } from '@engine/world/textures.js';
import { buildPortals, attachPortalControls } from '../portals.js';
import { revealArrival, markArrival, chargeAndLeave, clearOverlay } from '../portal-transition.js';
import { SPACE, ROOM, SPAWN, STATIONS, PORTALS } from './layout.js';
import { mountInterface } from '../interface.js';
import { mountLibrary } from '../library/ui.js';
import { WRITTEN } from '../library/written.js';

const WOOD = { tex: 'walnut' }, METAL = { tex: 'paint', tint: 0xa48c62 };
const PAPER = { tex: 'paint', tint: 0xf0e9d6 }, INK = { tex: 'paint', tint: 0x405c61 };
const TITLES = { library: '随笔图书室', studio: '项目工作室' };

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
  // 工作室沿用原来那条宽地毯；图书室单独铺窄的（见「随笔图书室」段），
  // 两段若同时存在会共用同一张顶面，走动时整条走廊一直在打架。
  if (SPACE !== 'library') box(0, .008, .1, 3.8, .015, 12.6, { tex: 'linen', tint: 0x8eaaa1 });
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

  // ---- 随笔图书室：左「我的收藏」/ 右「我的原创」 ---------------------------
  // 两半用不同的家具种类区分，不是同一排书架换字：左边是高书架、卡片目录柜
  // 和斜置展牌，右边是写作桌、个人文集与手稿分类架。通道留在 |x| < 2.2。
  const TEAL = { tex: 'paint', tint: 0x33544e }, UMBER = { tex: 'paint', tint: 0x6b5240 };
  const BRASS = { tex: 'paint', tint: 0xb18f57 }, CREAM = { tex: 'paint', tint: 0xf2ead7 };
  const LEATHER = { tex: 'leather', tint: 0x5b4433 };
  const VOLUME = [0x6f4a33, 0x8a6a4a, 0x4d5f57, 0xa8845c];

  const clip = (text, limit) => (String(text || '').length > limit ? `${String(text).slice(0, limit - 1)}…` : String(text || ''));
  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
    let line = '', row = 0;
    for (const ch of String(text || '')) {
      if (line && ctx.measureText(line + ch).width > maxWidth) {
        ctx.fillText(line, x, y + row * lineHeight);
        row += 1; line = ch;
        if (row >= maxLines) return;
      } else line += ch;
    }
    if (line && row < maxLines) ctx.fillText(line, x, y + row * lineHeight);
  }

  // 一张纸贴在斜板面上：位置和朝向都从板子 box() 返回的世界矩阵里取，
  // 不再手工猜 rx/ry —— 之前就是靠手调角度，纸面偏出板外，木框横档压在了字上。
  function face(matrix, w, h, draw, px = 640) {
    const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scale = new THREE.Vector3();
    matrix.decompose(pos, quat, scale);
    const lift = new THREE.Vector3(0, 1, 0).applyQuaternion(quat).multiplyScalar(scale.y / 2 + .004);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: canvasTexture(Math.round(w * px), Math.round(h * px), draw), side: THREE.DoubleSide }),
    );
    mesh.position.copy(pos).add(lift);
    mesh.quaternion.copy(quat).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)));
    planes.push(mesh);
    return mesh;
  }
  function hotspot(id, x0, x1, z0, z1, y0 = 0, y1 = 2) {
    hotspots.push({ id, box: new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)) });
  }
  function picture(w, h, draw, { x, y, z, ry = 0, rx = 0, px = 200 }) {
    const texture = canvasTexture(Math.round(w * px), Math.round(h * px), draw);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    plane.position.set(x, y, z); plane.rotation.set(rx, ry, 0, 'YXZ');
    planes.push(plane);
    return plane;
  }
  // A zone backdrop: a painted panel on the north wall plus a rail, so each half
  // of the room reads as its own alcove without changing the wall blocks.
  function zonePanel(x, color) {
    trim.box(x, 0, -9.93, 8.6, 4.62, .14, color);
    trim.box(x, 4.62, -9.87, 8.8, .1, .26, METAL);
  }
  function zoneSign({ id, title, subtitle, note, x, y, z, width = 3.2, bar, panel }) {
    const plane = picture(width, width * .375, (ctx, w, h) => {
      ctx.fillStyle = '#f6f1e3'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = bar; ctx.fillRect(0, 0, w, 16); ctx.fillRect(0, h - 16, w, 16);
      ctx.fillStyle = '#26332e'; ctx.font = 'bold 76px "Microsoft YaHei",serif'; ctx.fillText(title, 40, 128);
      ctx.fillStyle = '#6d7b72'; ctx.font = '33px "Microsoft YaHei",sans-serif'; ctx.fillText(subtitle, 42, 202);
      ctx.fillStyle = bar; ctx.font = 'bold 25px "Microsoft YaHei",sans-serif'; ctx.fillText(note, 42, 268);
    }, { x, y, z });
    plane.name = `sign-${id}`;
    trim.box(x, y - width * .1875 - .03, z - .07, width + .18, width * .375 + .06, .07, panel);
    hotspot(id, x - width / 2, x + width / 2, z - .24, z + .24, y - .6, y + .6);
  }
  function bookcase(x, z, w, h, rows, yaw = 0) {
    furniture.at(x, 0, z, yaw, () => {
      box(0, .04, 0, w, h, .56, WOOD);
      box(0, h + .04, 0, w + .1, .1, .64, METAL);
      const step = (h - .16) / rows;
      for (let row = 0; row < rows; row++) {
        const y = .12 + row * step;
        box(0, y, .02, w + .05, .07, .6, WOOD);
        box(0, y + .07, .305, w - .16, step - .2, .05, { tex: 'bookshelf' });
      }
    });
    solid(x, z, w + .1, .64, h + .14);
  }
  // 个人文集：统一开本的精装册子，和左侧书脊纹理的书架刻意不同。
  function volumes(x, z, w, h, rows) {
    box(x, .04, z, w, h, .5, WOOD);
    box(x, h + .04, z, w + .1, .08, .58, METAL);
    const step = (h - .14) / rows, count = Math.floor((w - .2) / .16);
    for (let row = 0; row < rows; row++) {
      const y = .1 + row * step;
      box(x, y, z + .02, w + .04, .06, .52, WOOD);
      for (let i = 0; i < count; i++) {
        const tint = VOLUME[(i + row * 3) % VOLUME.length];
        box(x - w / 2 + .12 + i * .16, y + .06, z + .29, .13, step - .26 - (i % 3) * .04, .16, { tex: 'paint', tint });
      }
    }
    solid(x, z, w + .1, .58, h + .14);
  }
  // 卡片目录柜：这一侧的主件，柜顶留几张还没放回去的卡片。
  function catalogCabinet(x, z) {
    const w = 2.5, d = 1, h = .98, leg = .16;
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) box(x + dx * (w / 2 - .14), 0, z + dz * (d / 2 - .14), .11, leg, .11, METAL);
    box(x, leg, z, w, h, d, WOOD);
    box(x, leg + h, z, w + .12, .07, d + .12, METAL);
    const cols = 5, rows = 4, fw = (w - .18) / cols, fh = (h - .16) / rows;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const cx = x - w / 2 + .09 + fw * (c + .5), cy = leg + .08 + fh * (r + .5);
      box(cx, cy - fh / 2 + .02, z + d / 2 + .015, fw - .06, fh - .06, .04, CREAM);
      box(cx, cy + fh / 2 - .1, z + d / 2 + .04, fw - .3, .015, .03, { tex: 'paint', tint: 0xd6ccb2 });
      box(cx, cy - .02, z + d / 2 + .045, .12, .03, .05, BRASS);
    }
    box(x, leg + h + .09, z - .1, w - .3, .04, .12, BRASS);
    for (let i = 0; i < 5; i++) box(x - .8 + i * .4, leg + h + .13, z - .1, .3, .26, .02, CREAM);
    solid(x, z, w + .12, d + .12, leg + h + .12);
  }
  // 手稿分类架：右侧的主件。开放层板上立着一叠叠厚薄不一的手稿，
  // 和左侧抽屉式的卡片目录柜刻意做成两种家具。
  function manuscriptRack(x, z) {
    const w = 2.2, d = .46, h = 1.9, rows = 4;
    box(x, .05, z - .12, w, h, .1, WOOD);
    for (const side of [-1, 1]) box(x + side * (w / 2 - .05), .05, z, .1, h, d, WOOD);
    box(x, .05, z, w, .08, d, WOOD);
    box(x, .05 + h, z, w + .08, .08, d + .08, METAL);
    const step = (h - .14) / rows, count = 13, pitch = (w - .22) / count;
    for (let r = 0; r < rows; r++) {
      const y = .13 + r * step;
      box(x, y, z, w - .1, .05, d - .04, WOOD);
      for (let i = 0; i < count; i++) {
        const thick = .05 + ((i * 7 + r * 3) % 3) * .025;
        const height = step - .2 - ((i + r) % 4) * .05;
        const paper = (i + r * 2) % 7 === 0 ? { tex: 'paint', tint: 0xc98f6a } : CREAM;
        box(x - w / 2 + .11 + i * pitch + thick / 2, y + .05, z + .04, thick, height, d - .16, paper);
      }
      box(x, y + .05, z + d / 2 - .05, w - .1, .05, .04, WOOD);
    }
    solid(x, z, w + .08, d + .08, h + .12);
  }
  // 写作桌：右侧的主件。
  function writingDesk(x, z) {
    const w = 3.6, d = 1.7, top = .76;
    box(x, top, z, w, .09, d, WOOD);
    box(x, top + .085, z, w - .26, .015, d - .26, LEATHER);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) box(x + dx * (w / 2 - .16), 0, z + dz * (d / 2 - .14), .12, top, .12, METAL);
    box(x + w / 2 - .5, .12, z, .86, .56, d - .2, WOOD);
    for (let r = 0; r < 2; r++) {
      box(x + w / 2 - .5, .18 + r * .26, z + d / 2 - .1, .74, .2, .04, CREAM);
      box(x + w / 2 - .5, .26 + r * .26, z + d / 2 - .07, .16, .03, .04, BRASS);
    }
    box(x - .95, top + .09, z + .05, .62, .1, .8, CREAM);        // 一沓稿纸
    box(x - 1.1, top + .19, z + .12, .6, .06, .76, CREAM);
    box(x + .3, top + .09, z + .22, .5, .03, .7, { tex: 'paint', tint: 0xf8f3e4 });   // 摊开的稿子
    box(x + .3, top + .12, z + .22, .02, .006, .68, { tex: 'paint', tint: 0xb9b4a4 });
    box(x + .95, top + .09, z - .4, .16, .12, .16, { tex: 'paint', tint: 0x9fb0ab });  // 墨水瓶
    box(x + 1.12, top + .09, z - .4, .3, .03, .03, BRASS);                            // 笔
    box(x - .15, top + .09, z - .55, .18, .16, .18, { tex: 'paint', tint: 0xa4553f }); // 杯子
    solid(x, z, w + .04, d + .04, top + .2);
  }
  function deskLamp(x, y, z) {
    box(x, y, z, .26, .04, .26, METAL);
    box(x, y + .04, z, .05, .52, .05, METAL);
    box(x + .3, y + .52, z, .06, .06, .06, METAL);
    box(x + .34, y + .3, z, .3, .06, .3, METAL, { rz: -.7 });
    box(x + .52, y + .18, z, .3, .14, .3, { tex: 'paint', tint: 0xf6e2b6, emissive: .9 });
  }
  function chair(x, z, yaw = 0) {
    furniture.at(x, 0, z, yaw, () => {
      for (const dx of [-.26, .26]) for (const dz of [-.24, .24]) box(dx, 0, dz, .07, .44, .07, METAL);
      box(0, .44, 0, .62, .09, .58, LEATHER);
      box(0, .53, -.26, .62, .62, .09, LEATHER);
    });
    solid(x, z, .72, .72, 1.2);
  }
  function armchair(x, z, yaw = 0) {
    furniture.at(x, 0, z, yaw, () => {
      box(0, .06, 0, 1.05, .34, .95, WOOD);
      box(0, .4, 0, .92, .14, .82, { tex: 'linen', tint: 0x8a7057 });
      box(0, .54, -.36, 1.05, .52, .2, { tex: 'linen', tint: 0x8a7057 });
      for (const side of [-.5, .5]) box(side, .4, 0, .16, .28, .95, WOOD);
    });
    solid(x, z, 1.1, 1, 1.1);
  }
  function sideTable(x, z) {
    box(x, .02, z, .78, .06, .78, METAL);
    box(x, .08, z, .12, .48, .12, WOOD);
    box(x, .56, z, .82, .07, .82, WOOD);
    solid(x, z, .86, .86, .66);
  }
  function floorLamp(x, z, id) {
    box(x, .02, z, .42, .05, .42, METAL);
    box(x, .07, z, .07, 1.3, .07, METAL);
    box(x, 1.37, z, .5, .26, .5, { tex: 'paint', tint: 0xf6e2b6, emissive: .85 });
    solid(x, z, .5, .5, 1.7);
    bakes.push({ id, position: [x, 1.5, z], power: 1.3, radius: 6, direction: null });
  }
  // 斜置展牌：把一张推荐卡放在架子上。
  function easel(x, z, yaw = 0, draw = null) {
    let board;
    furniture.at(x, 0, z, yaw, () => {
      // rx 为正：板子向后仰、正面朝南对着通道；腿与托条都停在板面前缘之下。
      for (const side of [-.5, .5]) box(side, 0, .26, .07, .82, .07, WOOD);
      box(0, .8, .3, 1.06, .05, .07, WOOD);
      box(0, .06, -.26, .9, .05, .06, WOOD);
      box(0, .3, -.3, .07, .62, .07, WOOD, { rx: .3 });
      board = box(0, 1.035, .1, 1.06, .05, .56, WOOD, { rx: .36 });
    });
    if (draw) face(board, .96, .48, draw);
    solid(x, z, 1.12, .8, 1.3);
  }
  // 读稿台：右侧靠近通道的最后一站。
  function lectern(x, z, yaw = 0, draw = null) {
    let board;
    furniture.at(x, 0, z, yaw, () => {
      box(0, .02, 0, .64, .06, .64, METAL);
      box(0, .08, 0, .18, .86, .18, WOOD);
      box(0, .94, 0, .8, .05, .6, WOOD);
      board = box(0, 1.07, .02, .68, .04, .48, WOOD, { rx: .34 });
    });
    if (draw) face(board, .6, .4, draw);
    solid(x, z, .9, .9, 1.24);
  }

  if (SPACE === 'library') {
    // 两区各有一块墙背板：左青、右褐，进门就能分开。
    zonePanel(-6.6, TEAL);
    zonePanel(6.6, UMBER);
    // 两块背板之间的通道尽头用壁柱收边，避免露出一条生硬的白墙。
    for (const side of [-2.3, 2.3]) trim.box(side, 0, -9.9, .26, 4.72, .26, WOOD);
    trim.box(0, 4.72, -9.9, 5, .1, .26, METAL);
    // 通道正对着的那块墙留白，挂一张本室总览：进门就知道左右各是什么。
    trim.box(0, 1.22, -9.8, 3.6, 2.6, .06, BRASS);
    picture(3.4, 2.4, (ctx, w, h) => {
      ctx.fillStyle = '#f6f1e3'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#26332e'; ctx.font = 'bold 54px "Microsoft YaHei",serif';
      ctx.fillText('本室总览', 36, 78);
      ctx.fillStyle = '#6d7b72'; ctx.font = '23px "Microsoft YaHei",sans-serif';
      ctx.fillText('COLLECTED  ·  通道  ·  WRITTEN', 38, 116);
      const rx = 96, ry = 150, rw = 488, rh = 236, mid = rx + rw * .5;
      ctx.fillStyle = '#e9dfca'; ctx.fillRect(rx, ry, rw, rh);
      ctx.fillStyle = 'rgba(51,84,78,.28)'; ctx.fillRect(rx, ry, rw * .39, rh);
      ctx.fillStyle = 'rgba(107,82,64,.28)'; ctx.fillRect(rx + rw * .61, ry, rw * .39, rh);
      ctx.fillStyle = 'rgba(127,143,134,.45)'; ctx.fillRect(rx + rw * .39, ry, rw * .22, rh);
      ctx.strokeStyle = '#8a7a5f'; ctx.lineWidth = 4; ctx.strokeRect(rx, ry, rw, rh);
      // 家具：左侧书架与目录柜，右侧写作桌与手稿架。
      ctx.fillStyle = '#4c6157';
      for (let i = 0; i < 3; i++) ctx.fillRect(rx + 24 + i * 46, ry + 20, 38, 12);
      ctx.fillRect(rx + 112, ry + 150, 84, 44);
      ctx.fillStyle = '#7a5a40';
      for (let i = 0; i < 3; i++) ctx.fillRect(mid + 34 + i * 46, ry + 26, 34, 12);
      ctx.fillRect(mid + 96, ry + 148, 92, 42);
      ctx.fillStyle = '#3c4038'; ctx.font = 'bold 34px "Microsoft YaHei",serif';
      ctx.fillText('收藏', rx + 26, ry + rh - 22);
      ctx.fillText('原创', mid + 40, ry + rh - 22);
      ctx.fillStyle = '#5c6159'; ctx.font = '24px "Microsoft YaHei",sans-serif';
      ctx.fillText('入口', mid - 24, ry + rh + 44);
      ctx.beginPath(); ctx.moveTo(mid, ry + rh + 8); ctx.lineTo(mid - 9, ry + rh + 22); ctx.lineTo(mid + 9, ry + rh + 22); ctx.closePath(); ctx.fill();
    }, { x: 0, y: 2.52, z: -9.74 });

    // 中央通道：一条素色地毯 + 两道黄铜压边，中间始终空着。
    // 底面离地板 1.2 cm（旧版和上一段宽地毯共用同一张顶面，两个面片平分深度，
    // 走动时整条走廊就会闪色/出条纹）；也不挂织物贴图，十几米长的高频纹理会 moiré。
    // 压边下沉 4 mm 埋进毯面，不再和毯顶共面。
    box(0, .012, -1, 3.2, .022, 15.2, { tex: 'paint', tint: 0x6f8079 });
    for (const side of [-1.56, 1.56]) trim.box(side, .028, -1, .06, .014, 15.2, BRASS);

    // —— 左：我的收藏 ——
    bookcase(-9.8, -9.2, 2.3, 3, 4);
    bookcase(-6.9, -9.2, 2.3, 2.7, 4);
    bookcase(-4, -9.2, 2.3, 2.4, 3);
    shelf(-10.6, -6.2, Math.PI / 2);
    catalogCabinet(-4, -3);
    stool(-6.1, -3.1);
    easel(-3.3, 1.7, .5, (ctx, w, h) => {
      ctx.fillStyle = '#faf6ea'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2f6b60'; ctx.fillRect(0, 0, w, 12);
      ctx.fillStyle = '#2f4a44'; ctx.font = 'bold 44px "Microsoft YaHei",serif'; ctx.fillText('本期推荐', 30, 86);
      ctx.fillStyle = '#8d9a93'; ctx.font = '24px "Microsoft YaHei",sans-serif'; ctx.fillText('等你挑一张卡片', 30, 130);
      ctx.fillStyle = '#d9d3c2'; ctx.fillRect(30, 152, w - 60, 3);
      ctx.fillStyle = '#b8c4bc'; for (let i = 0; i < 3; i++) ctx.fillRect(30, 178 + i * 30, w - 90 - i * 40, 10);
    });
    sofa(-8.2, 3, Math.PI);
    sideTable(-10.2, 3);
    floorLamp(-11, 1.1, 'library-nook-lamp');
    zoneSign({
      id: 'collected', title: '我的收藏', subtitle: 'Collected · 读过，并且愿意推荐',
      note: '走近书架、目录柜或展牌，点击打开目录', x: -6.6, y: 3.95, z: -9.78, bar: '#2f6b60', panel: TEAL,
    });
    // 左墙：一张放大的收藏索引卡，和右侧的手稿墙成对。
    picture(2.6, 1.7, (ctx, w, h) => {
      ctx.fillStyle = '#f4efe1'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2f6b60'; ctx.fillRect(0, 0, w, 10);
      ctx.fillStyle = '#4c5a52'; ctx.font = 'bold 30px "Microsoft YaHei",sans-serif'; ctx.fillText('收藏索引', 26, 52);
      for (let i = 0; i < 7; i++) {
        const y = 84 + i * 36;
        ctx.fillStyle = i < 6 ? '#cfd8d2' : '#e6e0d0'; ctx.fillRect(26, y, w - 52, 22);
        ctx.fillStyle = '#9aa79f'; ctx.fillRect(38, y + 7, (w - 90) * (0.35 + (i % 4) * .15), 8);
      }
      ctx.fillStyle = '#2f6b60'; ctx.font = '20px "Microsoft YaHei",sans-serif'; ctx.fillText('外部内容 · 待补充', 26, h - 22);
    }, { x: -11.86, y: 2.5, z: -1, ry: Math.PI / 2 });
    hotspot('collected', -11, -2.8, -9.65, -8.85, 0, 3.2);
    hotspot('collected', -5.35, -2.65, -3.65, -2.35, 0, 1.35);
    hotspot('collected', -3.95, -2.65, 1.1, 2.3, 0, 1.5);
    // —— 右：我的原创 ——
    volumes(6.3, -9.2, 3.4, 1.6, 2);
    writingDesk(6.3, -6.1);
    deskLamp(7.6, .86, -6.5);
    bakes.push({ id: 'library-desk-lamp', position: [7.9, 1.15, -6.4], power: 1.5, radius: 5.5, direction: null });
    chair(6.3, -7.6);
    manuscriptRack(4, -3);
    lectern(3.4, 1.8, -.4, (ctx, w, h) => {
      const post = WRITTEN[0] || {};
      ctx.fillStyle = '#fbf7ec'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#b9ae97'; ctx.fillRect(20, 0, 2, h);
      ctx.fillStyle = '#3a352c'; ctx.font = 'bold 30px "Microsoft YaHei",serif';
      wrapText(ctx, post.title || '未命名', 38, 62, w - 62, 38, 2);
      ctx.fillStyle = '#8b7a63'; ctx.font = '20px "Microsoft YaHei",sans-serif';
      ctx.fillText(post.category || '未分类', 38, 152);
      ctx.fillStyle = '#c8bda6';
      for (let i = 0; i < 3; i++) ctx.fillRect(38, 176 + i * 18, w - 80 - (i % 2) * 24, 5);
    });
    armchair(7.6, 3, Math.PI);
    sideTable(9.4, 3);
    zoneSign({
      id: 'written', title: '我的原创', subtitle: 'Written · 自己写下的东西',
      note: '走近写作桌、手稿架或读稿台，点击打开目录', x: 6.6, y: 3.5, z: -9.78, bar: '#8a5a3b', panel: UMBER,
    });
    // 右墙：原创目录，条目直接读 written.js —— 墙上和二维目录永远是同一份数据。
    picture(2.6, 1.7, (ctx, w, h) => {
      ctx.fillStyle = '#f4ecdd'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#8a5a3b'; ctx.lineWidth = 9; ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#7a4a2e'; ctx.font = 'bold 52px "Microsoft YaHei",serif';
      ctx.fillText('我的原创 · 目录', 46, 96);
      ctx.fillStyle = '#a08d76'; ctx.font = '24px "Microsoft YaHei",sans-serif';
      ctx.fillText(`WRITTEN · 共 ${WRITTEN.length} 篇`, 48, 136);
      ctx.fillStyle = '#cdbfa8'; ctx.fillRect(46, 158, w - 92, 3);
      WRITTEN.slice(0, 4).forEach((post, i) => {
        const y = 214 + i * 108;
        ctx.fillStyle = '#8a5a3b'; ctx.fillRect(46, y - 30, 7, 70);
        ctx.fillStyle = '#3a352c'; ctx.font = 'bold 36px "Microsoft YaHei",serif';
        ctx.fillText(clip(post.title || '未命名', 17), 70, y);
        ctx.fillStyle = '#8b7a63'; ctx.font = '24px "Microsoft YaHei",sans-serif';
        ctx.fillText(`${post.category || '未分类'}${post.date ? ` · ${post.date}` : ''}`, 70, y + 36);
      });
    }, { x: 11.86, y: 2.5, z: -1, ry: -Math.PI / 2, px: 420 });
    trim.box(11.92, 1.6, -1, .08, 1.9, 2.8, UMBER);
    // 北墙三张手稿卡：标题直接取索引里的条目，不再画空白纸。
    for (const [i, px] of [4.95, 6.3, 7.65].entries()) {
      const post = WRITTEN[i] || {};
      picture(.78, .92, (ctx, w, h) => {
        ctx.fillStyle = '#f8f4e8'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#c9785c'; ctx.fillRect(0, 0, 9, h);
        ctx.fillStyle = '#c6b7a0'; ctx.fillRect(0, 0, w, 3);
        ctx.fillStyle = '#3a352c'; ctx.font = 'bold 27px "Microsoft YaHei",serif';
        wrapText(ctx, post.title || '未命名', 24, 58, w - 46, 34, 2);
        ctx.fillStyle = '#8b7a63'; ctx.font = '18px "Microsoft YaHei",sans-serif';
        ctx.fillText(post.category || '未分类', 24, 140);
        ctx.fillText(post.date || '', 24, 166);
        ctx.fillStyle = '#d5cbb7'; ctx.fillRect(24, 186, w - 48, 2);
        ctx.fillStyle = '#bdb29a';
        for (let line = 0; line < 7; line++) ctx.fillRect(24, 208 + line * 22, w - 52 - (line % 3) * 26, 4);
        ctx.fillStyle = '#8a5a3b'; ctx.font = '16px "Microsoft YaHei",sans-serif';
        ctx.fillText('随笔图书室 · 原创', 24, h - 22);
      }, { x: px, y: 2.2, z: -9.74, px: 520 });
      trim.box(px, 1.69, -9.79, .88, 1.04, .04, i === 1 ? BRASS : METAL);
    }
    hotspot('written', 4.4, 8.3, -9.5, -5.2, 0, 2);
    hotspot('written', 2.85, 5.15, -3.25, -2.75, 0, 2);
    hotspot('written', 2.9, 3.9, 1.3, 2.3, 0, 1.5);
    planter(-10, 8.5); planter(10, 8.5);
  } else {
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
    sign(null, '项目陈列 · 示例', '暂无项目展品', 0, 3.4, -9.88, 4.7);
  }

  // 图书室的展牌是分区牌（见上），工作室仍用默认的导览牌。
  if (SPACE !== 'library') {
    for (const station of STATIONS) {
      const [x, z] = station.look;
      sign(station.id, station.name, '点击导览牌查看', x, 1.7, z + .45);
    }
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
  const ui = mountInterface({ player, rig, room: true });
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
    clearOverlay();
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
  const goTo = player.goTo, flyTo = player.flyTo;
  player.goTo = (x, z, station) => world.roomContains(x, z) && goTo(x, z, station);
  player.flyTo = (x, z) => world.roomContains(x, z) && flyTo(x, z);
  return {
    blocksInput: ui.blocksInput,
    dismiss: ui.dismiss,
    // The two catalog pages render their body from world/library instead of
    // static markup, so adding an article never touches this file.
    pages: SPACE === 'library'
      ? { library: (body, page) => mountLibrary(body, { view: page.dataset.station }) }
      : undefined,
    update(dt) {
      ui.update();
      if (!initialized) { initialized = true; enter(); revealArrival(); }
      if (!world.roomContains(player.pos.x, player.pos.z, player.y)) player.teleport(lastX, lastZ);
      controls.update(dt);
    },
  };
}
