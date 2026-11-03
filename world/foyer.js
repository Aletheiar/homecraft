import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { canvasTexture } from '@engine/world/textures.js';

export function buildFoyer(layer) {
  const B = new BoxBatch(layer), planes = [], obstacles = [], hotspots = [];
  const state = { rotating: true, crystal: null };
  function plinth(id, x, z, title, subtitle, tint) {
    B.box(x, .02, z, 2.6, .55, 2.6, { tex: 'travertine' });
    B.box(x, .57, z, 2.7, .1, 2.7, { tex: 'paint', tint });
    obstacles.push({ x0: x - 1.4, x1: x + 1.4, z0: z - 1.4, z1: z + 1.4, level: 0 });
    const map = canvasTexture(512, 192, (ctx, w, h) => {
      ctx.fillStyle = '#f5f0df'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#274b43'; ctx.font = 'bold 44px "Microsoft YaHei",sans-serif'; ctx.fillText(title, 23, 75);
      ctx.fillStyle = '#6d7c6b'; ctx.font = '24px "Microsoft YaHei",sans-serif'; ctx.fillText(subtitle, 23, 137);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.5, .94), new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }));
    sign.position.set(x + 1.5, 1.4, z); sign.rotation.y = Math.PI / 2; planes.push(sign);
    hotspots.push({ id, box: new THREE.Box3(new THREE.Vector3(x - 1.5, 0, z - 1.5), new THREE.Vector3(x + 1.8, 3.4, z + 1.5)) });
  }
  plinth('plaza', -28, -8, '风中的晶体', '点击查看', 0x78bbb0);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.9), new THREE.MeshStandardMaterial({ color: 0x6ad4ce, roughness: .25, metalness: .35 }));
  crystal.position.set(-28, 2.2, -8); crystal.name = 'foyer-crystal'; planes.push(crystal); state.crystal = crystal;
  plinth('observatory', -28, 9, '庭院观测台', '清晨 · 黄昏 · 星夜', 0xc7ac72);
  B.box(-28, .67, 9, 1.3, .06, 1.3, { tex: 'black_metal' });
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    B.box(-28 + Math.cos(angle) * .55, .73, 9 + Math.sin(angle) * .55, .12, .12, .12, { tex: 'paint', tint: 0xf2dca3, emissive: .7 });
  }
  for (const z of [-4, 4]) {
    B.box(-35, .08, z, 1.1, .42, 3, { tex: 'walnut' });
    B.box(-35.4, .5, z, .25, .55, 3, { tex: 'walnut' });
    obstacles.push({ x0: -35.7, x1: -34.3, z0: z - 1.6, z1: z + 1.6, level: 0 });
  }
  return { batches: { foyer: B }, planes, obstacles, hotspots, state };
}

export function attachFoyerControls(state) {
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-foyer-action]');
    if (!button) return;
    if (button.dataset.foyerAction === 'crystal') {
      state.rotating = !state.rotating;
      button.textContent = state.rotating ? '暂停晶体旋转' : '继续晶体旋转';
      button.setAttribute('aria-pressed', String(!state.rotating));
    } else if (button.dataset.foyerAction === 'time') {
      window.__home?.setTimeMode(button.dataset.time);
    }
  });
  return { update(dt = 0) { if (state.rotating && dt > 0) state.crystal.rotation.y += dt * .4; } };
}
