import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { canvasTexture } from '@engine/world/textures.js';
import { createMusicStation } from './music.js';

export function buildFoyer(layer) {
  const B = new BoxBatch(layer), planes = [], obstacles = [], hotspots = [];
  const state = { record: null };
  function plinth(id, x, z, title, subtitle, tint) {
    B.box(x, .02, z, 2.6, .55, 2.6, { tex: 'travertine' });
    B.box(x, .57, z, 2.7, .1, 2.7, { tex: 'paint', tint });
    obstacles.push({ x0: x - 1.4, x1: x + 1.4, z0: z - 1.4, z1: z + 1.4, level: 0 });
    const map = canvasTexture(512, 192, (ctx, w, h) => {
      ctx.fillStyle = '#f5f0df'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#bda57a'; ctx.lineWidth = 5; ctx.strokeRect(9, 9, w - 18, h - 18);
      ctx.fillStyle = '#274b43'; ctx.font = 'bold 44px "Microsoft YaHei",sans-serif'; ctx.fillText(title, 23, 75);
      ctx.fillStyle = '#6d7c6b'; ctx.font = '24px "Microsoft YaHei",sans-serif'; ctx.fillText(subtitle, 23, 137);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.5, .94), new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }));
    sign.position.set(x + 1.5, 1.4, z); sign.rotation.y = Math.PI / 2; planes.push(sign);
    hotspots.push({ id, box: new THREE.Box3(new THREE.Vector3(x - 1.5, 0, z - 1.5), new THREE.Vector3(x + 1.8, 3.4, z + 1.5)) });
  }
  plinth('plaza', -28, -8, '庭院音乐台', '庭院唱片 · 随选随播', 0x526853);
  // A walnut console, paired speakers and a brass tonearm, all inside the
  // previous sculpture's footprint. Most details share the furniture batches.
  B.box(-28, .67, -8, 1.85, .62, 2.16, { tex: 'walnut' });
  B.box(-28, 1.29, -8, 1.95, .1, 2.25, { tex: 'oak' });
  for (const z of [-8.77, -7.23]) {
    B.box(-28, 1.39, z, 1.05, .56, .51, { tex: 'walnut' });
    B.box(-27.46, 1.44, z, .025, .43, .41, { tex: 'black_metal' });
    for (let i = 0; i < 5; i++) B.box(-27.44, 1.48 + i * .075, z, .025, .025, .35, { tex: 'paint', tint: 0x8b805d });
  }
  B.box(-27.05, .81, -8, .04, .29, 1.47, { tex: 'black_metal' });
  for (let i = 0; i < 7; i++) B.box(-27.02, .85, -8.6 + i * .2, .035, .2, .045, { tex: 'paint', tint: i % 2 ? 0xac8a53 : 0x6c876e });
  B.box(-28.39, 1.4, -7.56, .1, .08, .12, { tex: 'paint', tint: 0xbca26a });
  B.box(-28.18, 1.48, -7.65, .47, .035, .04, { tex: 'paint', tint: 0xbca26a }, { ry: -.45 });
  B.box(-27.96, 1.46, -7.75, .12, .065, .08, { tex: 'black_metal' });
  const record = new THREE.Group(); record.position.set(-28, 1.42, -8); record.name = 'foyer-record';
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(.52, .52, .035, 24), new THREE.MeshStandardMaterial({ color: 0x17221c, roughness: .5 }));
  const label = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .038, 16), new THREE.MeshStandardMaterial({ color: 0xb99b60, roughness: .8 }));
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(.026, .026, .07, 10), new THREE.MeshStandardMaterial({ color: 0xc2a468, roughness: .35, metalness: .55 }));
  spindle.position.y = .035;
  // The asymmetric label makes real rotation visible from above.
  label.position.set(.035, .012, 0); record.add(disc, label, spindle); planes.push(record); state.record = record;
  plinth('observatory', -28, 9, '庭院留言亭', '留一张明信片 · GitHub', 0x526853);
  // An outdoor postbox and postcard board, within the former pedestal bounds.
  B.box(-28, .67, 9, 1.5, .75, 1.8, { tex: 'walnut' });
  B.box(-28, 1.42, 9, 1.6, .1, 1.95, { tex: 'oak' });
  B.box(-28.48, 1.52, 9, .18, 1.05, 1.85, { tex: 'walnut' });
  B.box(-28.37, 1.63, 9, .05, .8, 1.65, { tex: 'paint', tint: 0x526853 });
  B.box(-28.37, 2.57, 9, .58, .12, 2.15, { tex: 'walnut' });
  for (const [z, y, tint] of [[8.55, 1.75, 0xeee4ca], [9.35, 1.87, 0xf3ead8]]) {
    B.box(-28.33, y, z, .025, .4, .54, { tex: 'paint', tint });
    B.box(-28.31, y + .25, z + .15, .025, .09, .09, { tex: 'paint', tint: 0xaa8151 });
    B.box(-28.31, y + .1, z - .05, .025, .025, .27, { tex: 'paint', tint: 0x88927b });
  }
  B.box(-27.8, 1.52, 9, .72, .43, 1.05, { tex: 'paint', tint: 0x365846 });
  B.box(-27.42, 1.8, 9, .02, .055, .73, { tex: 'black_metal' });
  B.box(-27.4, 1.57, 9, .025, .12, .4, { tex: 'paint', tint: 0xe7d6a4 });
  for (const z of [-4, 4]) {
    B.box(-35, .08, z, 1.1, .42, 3, { tex: 'walnut' });
    B.box(-35.4, .5, z, .25, .55, 3, { tex: 'walnut' });
    obstacles.push({ x0: -35.7, x1: -34.3, z0: z - 1.6, z1: z + 1.6, level: 0 });
  }
  return { batches: { foyer: B }, planes, obstacles, hotspots, state };
}

export function attachFoyerControls(state) {
  const music = createMusicStation(document.querySelector('#panel'));
  return { update(dt = 0) { if (music.playing && dt > 0 && state.record.visible) state.record.rotation.y += dt * 1.4; } };
}
