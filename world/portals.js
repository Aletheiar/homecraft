import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { canvasTexture } from '@engine/world/textures.js';
import { crossedPortal, portalTarget } from './portal-rules.js';
import { chargeAndLeave, clearOverlay, markArrival } from './portal-transition.js';

export function buildPortals(layer, definitions) {
  const B = new BoxBatch(layer), planes = [], obstacles = [], hotspots = [], veils = [];
  for (const gate of definitions) {
    const { x, z, yaw, color } = gate;
    B.at(x, 0, z, yaw, () => {
      for (const side of [-1.33, 1.33]) {
        B.box(side, 0, 0, .28, 3.65, .4, { tex: 'deepslate' });
        B.box(side, .2, .23, .075, 3.2, .035, { tex: 'paint', tint: color, emissive: .8 });
      }
      B.box(0, 3.5, 0, 2.94, .25, .4, { tex: 'deepslate' });
      B.box(0, .015, 0, 2.85, .05, .65, { tex: 'paint', tint: color });
      for (const side of [-1.33, 1.33]) {
        const px = x + side * Math.cos(yaw), pz = z - side * Math.sin(yaw);
        obstacles.push({ x0: px - .22, x1: px + .22, z0: pz - .22, z1: pz + .22, level: 0 });
      }
    });
    // The veil keeps its door's colour only at the edges: the middle is the
    // violet current every door shares, so any of them reads the same way as
    // you step in. The map scrolls upward, which is what makes it flow.
    const texture = canvasTexture(128, 256, (ctx, w, h) => {
      ctx.fillStyle = '#150b22'; ctx.fillRect(0, 0, w, h);
      const core = ctx.createRadialGradient(w / 2, h * .52, 4, w / 2, h * .52, w * .92);
      core.addColorStop(0, 'rgba(226,210,255,.92)');
      core.addColorStop(.4, 'rgba(150,110,232,.62)');
      core.addColorStop(1, 'rgba(24,12,40,0)');
      ctx.fillStyle = core; ctx.fillRect(0, 0, w, h);
      // Long soft smears: scrolling the map turns them into drifting light.
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const x = (i * 31 + 7) % w, y = (i * 67) % h, len = 34 + (i % 5) * 26;
        const streak = ctx.createLinearGradient(0, y - len / 2, 0, y + len / 2);
        streak.addColorStop(0, 'rgba(255,255,255,0)');
        streak.addColorStop(.5, 'rgba(232,220,255,.45)');
        streak.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = streak; ctx.fillRect(x, y - len / 2, 1 + (i % 3), len);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = .55; ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
      ctx.fillRect(0, 0, w * .13, h); ctx.fillRect(w * .87, 0, w * .13, h);
    });
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(2.34, 3.34), new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: .72, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false }));
    veil.position.set(x, 1.8, z); veil.rotation.y = yaw; veil.name = `portal-${gate.id}`; planes.push(veil); veils.push(veil);
    const signMap = canvasTexture(768, 192, (ctx, w, h) => {
      ctx.fillStyle = '#f4f0e5'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#' + color.toString(16).padStart(6, '0'); ctx.fillRect(0, 0, w, 10);
      ctx.fillStyle = '#244642'; ctx.font = 'bold 58px "Microsoft YaHei",sans-serif'; ctx.fillText(gate.title, 28, 86);
      ctx.fillStyle = '#60746f'; ctx.font = '26px "Microsoft YaHei",sans-serif'; ctx.fillText(gate.subtitle, 28, 148);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .8), new THREE.MeshBasicMaterial({ map: signMap, side: THREE.DoubleSide }));
    sign.position.set(x, 4.15, z); sign.rotation.y = yaw; planes.push(sign);

  }
  return { batches: { portals: B }, planes, obstacles, hotspots, definitions, veils };
}

export function attachPortalControls({ player, rig, definitions, veils = [], onLeave }) {
  const previous = { x: player.pos.x, y: player.y, z: player.pos.z };
  const current = { ...previous };
  let navigating = false, elapsed = 0, lastGate = null, lastSide = 1;
  // Crossing the opening charges briefly, then changes the current space.
  function enter(gate) {
    const target = portalTarget(gate.href, location.href);
    if (!target || navigating) return;
    // `previous` is the face the visitor stepped from; a Back restoration
    // should put them back on that same face, not the opposite one.
    lastSide = (previous.x - gate.x) * Math.sin(gate.yaw) + (previous.z - gate.z) * Math.cos(gate.yaw) < 0 ? -1 : 1;
    navigating = true; lastGate = gate; player.cancel(); onLeave?.(gate); markArrival();
    chargeAndLeave(() => location.assign(target));
  }
  function modalOpen() { return document.body.classList.contains('reading') || !!document.querySelector('.page-overlay.open, .modal.open, #reader.open'); }
  // Browser Back may revive this same document, including its latched departure
  // flag and charging overlay. Re-arm at a safe point outside the last veil.
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    navigating = false; elapsed = 0; player.cancel();
    clearOverlay();
    if (lastGate) {
      player.teleport(lastGate.x + Math.sin(lastGate.yaw) * 1.5 * lastSide, lastGate.z + Math.cos(lastGate.yaw) * 1.5 * lastSide);
      rig.recenter(player);
    }
    previous.x = current.x = player.pos.x; previous.y = current.y = player.y; previous.z = current.z = player.pos.z;
  });
  return {
    update(dt = 0) {
      elapsed += dt;
      for (const veil of veils) veil.material.map.offset.y = (veil.material.map.offset.y - dt * .09) % 1;
      current.x = player.pos.x; current.y = player.y; current.z = player.pos.z;
      if (elapsed > .7 && !rig.introActive && !modalOpen()) for (const gate of definitions) if (crossedPortal(gate, previous, current)) { enter(gate); break; }
      previous.x = current.x; previous.y = current.y; previous.z = current.z;
    },
  };
}
