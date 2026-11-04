import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { ISLAND, SPAWN, POOL } from './layout.js';
import { createBoundarySource, withinCourtyard, shellBlocks, useShellSurface, FENCE_HALF } from './boundaries.js';
import { poolContains } from '@engine/world/pool-regions.js';
import { furnishHall } from './furnish.js';
import { buildHallFloor } from './hall-floor.js';
import { loadPyramid, pyramidState } from './pyramid.js';
import { buildPortals, attachPortalControls } from './portals.js';
import { HUB_PORTALS } from './space-config.js';
import { saveHubReturn, consumeHubReturn } from './portal-journey.js';
import { revealArrival } from './portal-transition.js';
import { buildFoyer, attachFoyerControls } from './foyer.js';
import { buildGallery } from './gallery.js';
import { buildStatues } from './statues.js';
import { buildForecourt } from './forecourt.js';

export function build({ grid, layer, scene, stage }) {
  // The imported shell is dense enough to shadow itself across the flat courtyard
  // and pool planes; the engine's 3.5 cm normal bias leaves diagonal acne stripes
  // there, so this world widens it. Contact shadows are a separate baked pass.
  if (stage.sun) stage.sun.shadow.normalBias = .09;
  grid.define('courtStone', { tex: { all: 'travertine' }, merge: true, map: '#d9d8ce' });
  grid.fill(ISLAND.x0, -4, ISLAND.z0, ISLAND.x1, -1, ISLAND.z1, 'stone');
  grid.fill(-44, -1, -44, 44, 0, 44, 'courtStone');
  for (let x = -40; x < 40; x++) for (let z = -40; z < 40; z++) {
    if (poolContains(POOL, x + .5, z + .5)) grid.fill(x, -3, z, x + 1, 0, z + 1, null);
  }
  const hall = furnishHall(layer), floor = buildHallFloor(layer), B = new BoxBatch(layer);
  const portals = buildPortals(layer, HUB_PORTALS), foyer = buildFoyer(layer), gallery = buildGallery(layer), statues = buildStatues(layer);
  hall.obstacles.push(...portals.obstacles, ...foyer.obstacles);
  hall.planes.push(...portals.planes, ...foyer.planes, ...gallery.planes, ...floor.planes);
  hall.planes.push(buildForecourt());
  hall.hotspots.push(...portals.hotspots, ...foyer.hotspots, ...gallery.hotspots);
  // The fence follows the former pool perimeter. Restored small pyramids and
  // their complete original bases remain outside this walkable boundary.
  for (const axis of ['x', 'z']) for (const edge of [-FENCE_HALF, FENCE_HALF]) {
    for (let p = -FENCE_HALF; p <= FENCE_HALF; p += 3.95) {
      B.box(axis === 'x' ? edge : p, 0, axis === 'z' ? edge : p, .35, 1.05, .35, { tex: 'travertine' });
    }
    B.box(axis === 'x' ? edge : 0, .82, axis === 'z' ? edge : 0, axis === 'x' ? .12 : FENCE_HALF * 2, .12, axis === 'z' ? .12 : FENCE_HALF * 2, { tex: 'black_metal' });
    B.box(axis === 'x' ? edge : 0, .08, axis === 'z' ? edge : 0, axis === 'x' ? .45 : FENCE_HALF * 2, .48, axis === 'z' ? .45 : FENCE_HALF * 2, { tex: 'hedge' });
    hall.obstacles.push(axis === 'x'
      ? { x0: edge - .3, x1: edge + .3, z0: -44, z1: 44, level: 0 }
      : { x0: -44, x1: 44, z0: edge - .3, z1: edge + .3, level: 0 });
  }
  // New coping follows the scaled native water polygons, not the old GLB rims.
  for (const polygon of POOL.polygons) for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const count = Math.ceil(length / .65), yaw = -Math.atan2(dz, dx);
    for (let k = 0; k < count; k++) {
      const t = (k + .5) / count;
      B.box(a[0] + dx * t, .01, a[1] + dz * t, length / count - .018, .12, .32, { tex: 'travertine' }, { ry: yaw });
    }
  }
  const outside = new THREE.Shape();
  outside.moveTo(-900, -900); outside.lineTo(900, -900); outside.lineTo(900, 900); outside.lineTo(-900, 900); outside.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-44.2, -44.2); hole.lineTo(-44.2, 44.2); hole.lineTo(44.2, 44.2); hole.lineTo(44.2, -44.2); hole.closePath();
  outside.holes.push(hole);
  const lawn = new THREE.Mesh(new THREE.ShapeGeometry(outside), new THREE.MeshStandardMaterial({ color: 0x8eaa76, roughness: 1 }));
  lawn.name = 'outside-lawn';
  lawn.rotation.x = -Math.PI / 2; lawn.position.y = -.39; lawn.receiveShadow = true; scene.add(lawn);
  // Walking asks the imported shell where its surface is; before it arrives the
  // sampler answers undefined and the analytic cone stands in for it.
  useShellSurface((x, z) => pyramidState.shellTop ? pyramidState.shellTop(x, z) : undefined);
  loadPyramid(scene, stage.renderer);
  return { ...hall, batches: { ...hall.batches, ...floor.batches, ...portals.batches, ...foyer.batches, ...gallery.batches, ...statues.batches, perimeter: B }, sites: [createBoundarySource(hall.obstacles)], named: { pyramid: pyramidState, foyer: foyer.state, gallery: gallery.state, portals: HUB_PORTALS, veils: portals.veils, statues: statues.metadata } };
}

export function setup({ player, rig, stage, world }) {
  let introduced = false, lastMessage = '', lastSafeX = SPAWN.x, lastSafeZ = SPAWN.z, clock = 0;
  // The glass pyramid above the centre plinth drifts a little, on top of its
  // resting hover, so the levitation reads as intended.
  const exhibit = world.exhibit;
  const leave = gate => {
    saveHubReturn(player, rig, gate);
    history.replaceState({ ...history.state, hubReturnPending: true }, '', location.href);
  };
  const portals = attachPortalControls({ player, rig, definitions: HUB_PORTALS, veils: world.veils, onLeave: leave });
  // Reading cards may guide a visitor to a door, but only crossing its
  // physical plane starts the portal controller.
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[data-approach-portal]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const id = link.dataset.approachPortal;
    if (!HUB_PORTALS.some(g => g.id === id)) return;
    event.preventDefault(); window.__home?.go(id);
  });
  const foyer = attachFoyerControls(world.foyer);
  const status = document.querySelector('#model-status');
  const view = () => rig.showcase(innerWidth < 650 ? [-70, 95, 170] : [-83, 53, 88], [0, 5, 0]);
  const after = { x: 0, y: 0, z: 0 };
  const move = player.update;
  player.update = (dt, input, yaw, firstPerson) => {
    move(dt, input, yaw, firstPerson);
    after.x = player.pos.x; after.y = player.y; after.z = player.pos.z;
    // The block grid does not contain the imported shell, so a walk on it runs
    // straight through the glass; the shell itself says where a body fits.
    // Flight and falls ask the same question, and the treads are ground a
    // visitor may climb, so this stops the walker and nothing else.
    if (!withinCourtyard(after.x, after.z, after.y)
      || (!player.island && player.mode === 'ground' && shellBlocks(after.x, after.y, after.z)))
      player.teleport(lastSafeX, lastSafeZ);
  };
  const goTo = player.goTo, flyTo = player.flyTo;
  player.goTo = (x, z, station) => withinCourtyard(x, z) && goTo(x, z, station);
  player.flyTo = (x, z) => withinCourtyard(x, z) && flyTo(x, z);
  document.querySelector('#overview-button').addEventListener('click', () => { player.cancel(); rig.skipIntro(); view(); });
  document.querySelector('#enter-button').addEventListener('click', () => {
    introduced = true; rig.skipIntro(); player.teleport(-9, 0); rig.recenter(player); rig.set(.42, .3, 5.4);
    rig.setFirstPerson(true, Math.PI / 2);
  });
  document.querySelector('#return-button').addEventListener('click', () => {
    introduced = true; rig.skipIntro(); player.teleport(SPAWN.x, SPAWN.z); rig.setFirstPerson(false); rig.recenter(player); rig.set(.35, .38, 25);
  });
  // Coming back from a room: stand in front of the door the visitor left through,
  // facing their old view, and skip the island opening shot.
  const historyReturn = history.state?.hubReturnPending;
  const restored = consumeHubReturn(historyReturn ? '?space=hub&return=1' : location.search);
  if (historyReturn) history.replaceState({ ...history.state, hubReturnPending: false }, '', location.href);
  window.addEventListener('pageshow', event => {
    if (event.persisted && history.state?.hubReturnPending) {
      consumeHubReturn('?space=hub&return=1');
      history.replaceState({ ...history.state, hubReturnPending: false }, '', location.href);
    }
  });
  if (restored) {
    introduced = true;
    player.teleport(restored.x, restored.z, { look: [restored.x + Math.sin(restored.face), restored.z + Math.cos(restored.face)] });
    lastSafeX = player.pos.x; lastSafeZ = player.pos.z;
    rig.setFirstPerson(restored.firstPerson);
    rig.recenter(player);
    rig.set(restored.yaw, restored.firstPerson ? 0 : .3, restored.firstPerson ? 5.4 : 6.5);
    rig.skipIntro();
  }
  // A page that was entered through a door opens out of the ripple.
  revealArrival();
  return {
    // A restored viewpoint is the whole point of coming back: the island
    // opening shot would fly the camera away from the door the visitor left.
    skipIntro: !!restored,
    update(dt = 0) {
      // This also catches moves that do not use the walking collision grid.
      if (!withinCourtyard(player.pos.x, player.pos.z, player.y)) player.teleport(lastSafeX, lastSafeZ);
      else if (player.mode === 'ground') { lastSafeX = player.pos.x; lastSafeZ = player.pos.z; }
      portals.update(dt); foyer.update(dt);
      clock += dt;
      if (exhibit) exhibit.mesh.position.y = exhibit.base + Math.sin(clock * .62) * exhibit.bob;
      const message = pyramidState.error ? '模型读取失败，请刷新页面重试' : pyramidState.sceneryReady ? 'NewHeaven · 本地预览' : pyramidState.ready ? '正在载入外围景观…' : '正在载入金字塔…';
      if (message !== lastMessage) { status.textContent = message; lastMessage = message; }
      if (rig.introSkipped) introduced = true;
      if (pyramidState.ready && !introduced && window.__home && !rig.introActive) {
        introduced = true; rig.skipIntro(); view();
        window.__home.setTimeMode('morning'); window.__home.setWeatherMode('clear');
        stage.renderer.shadowMap.needsUpdate = true;
      }
    },
  };
}
