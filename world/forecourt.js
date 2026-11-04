import * as THREE from 'three';
import { canvasTexture, rng } from '@engine/world/textures.js';
import { projectE8 } from './e8.js';

export const FORECOURT = { x0: -33.8, x1: -20.7, z0: -16.5, z1: 17.5, radius: 18.3 };

export function buildForecourt() {
  const { x0, x1, z0, z1, radius } = FORECOURT;
  const width = x1 - x0, depth = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const { points, rings, edges } = projectE8();
  const selected = edges.filter(([i, j]) => Math.abs(rings[i] - rings[j]) <= 1);
  const map = canvasTexture(1024, 2048, (ctx, w, h) => {
    const sx = w / width, sz = h / depth;
    const pixel = (x, z) => [(x - x0) * sx, (z - z0) * sz];
    const random = rng(0xe8);
    ctx.fillStyle = '#d8d3c1'; ctx.fillRect(0, 0, w, h);
    // Fine, deterministic stone grain; generated once rather than every frame.
    for (let i = 0; i < 14000; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(100,94,75,.035)' : 'rgba(255,252,231,.11)';
      ctx.fillRect(random() * w, random() * h, 1 + random() * 3, 1 + random() * 3);
    }
    ctx.strokeStyle = 'rgba(115,110,91,.12)'; ctx.lineWidth = .012 * sx;
    ctx.beginPath();
    for (let x = x0 + 1.2; x < x1; x += 1.2) { const p = pixel(x, z0); ctx.moveTo(...p); ctx.lineTo(p[0], h); }
    for (let z = z0 + 1.2; z < z1; z += 1.2) { const p = pixel(x0, z); ctx.moveTo(...p); ctx.lineTo(w, p[1]); }
    ctx.stroke();
    // Use world units while painting: canvas aspect and mesh UVs cancel, so
    // the E8 projection is uniformly scaled on the ground, never stretched.
    ctx.save(); ctx.scale(sx, sz); ctx.translate(-x0, -z0);
    ctx.strokeStyle = '#91743b'; ctx.globalAlpha = .34; ctx.lineWidth = .024;
    ctx.beginPath();
    for (const [i, j] of selected) {
      const a = points[i], b = points[j];
      ctx.moveTo(cx + a[1] * radius, cz + a[0] * radius);
      ctx.lineTo(cx + b[1] * radius, cz + b[0] * radius);
    }
    ctx.stroke();
    ctx.globalAlpha = .78; ctx.fillStyle = '#8b713d';
    for (const p of points) { ctx.beginPath(); ctx.arc(cx + p[1] * radius, cz + p[0] * radius, .035, 0, Math.PI * 2); ctx.fill(); }
    // Quiet stone surrounds match the kiosks' existing 2.7 m plinths. These
    // are painted clearances, not raised slabs or new collision geometry.
    ctx.globalAlpha = 1;
    for (const z of [-8, 9]) {
      ctx.fillStyle = '#d8d3c1'; ctx.fillRect(-29.85, z - 1.85, 3.7, 3.7);
      ctx.strokeStyle = 'rgba(145,116,59,.42)'; ctx.lineWidth = .022;
      ctx.strokeRect(-29.85, z - 1.85, 3.7, 3.7);
    }
    ctx.strokeStyle = '#9c8554'; ctx.lineWidth = .028;
    ctx.strokeRect(x0 + .08, z0 + .08, width - .16, depth - .16);
    ctx.lineWidth = .016;
    ctx.strokeRect(x0 + .32, z0 + .32, width - .64, depth - .64);
    ctx.restore();
  }, { pixelated: false });
  const material = new THREE.MeshStandardMaterial({ map, roughness: .94, metalness: 0 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.name = 'e8-forecourt';
  // The imported andesite paving is at y=.025, above the voxel floor.
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(cx, .036, cz);
  mesh.receiveShadow = true;
  mesh.userData.e8 = { roots: points.length, fullEdges: edges.length, drawnEdges: selected.length, bounds: { x0, x1, z0, z1 }, radius };
  return mesh;
}
