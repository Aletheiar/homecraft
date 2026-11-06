import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const layout = 'data:text/javascript,' + encodeURIComponent(`
  export const ISLAND = { x0: 0, x1: 2, z0: 0, z1: 2 };
  export const SHELTER = { x0: 0, z0: 0, w: 2, d: 2 };
`);
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: new URL('../vendor/three/three.module.min.js', import.meta.url).href, shortCircuit: true };
  if (specifier === '@world/layout.js') return { url: layout, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const THREE = await import('three');
const { VoxelGrid } = await import('../engine/world/voxels.js');
const { createBlockMaterials } = await import('../engine/world/blocks.js');
const { createSea } = await import('../engine/world/landscape.js');
const { createWeatherFx } = await import('../engine/world/weather-fx.js');
globalThis.matchMedia = () => ({ matches: false });

function fixture() {
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x9fb4b8, 80, 220);
  const camera = new THREE.PerspectiveCamera(46, 1.5, .1, 600);
  const stage = { scene, camera, veil: 0, hemi: new THREE.HemisphereLight(0xffffff, 0x888888, 1.25),
    sky: { material: { uniforms: { uFogColor: { value: scene.fog.color } } } },
    renderer: { domElement: { height: 600 } }, setLightning() {} };
  const world = {
    grid: new VoxelGrid({ min: [0, -1, 0], size: [2, 2, 2] }),
    ground: { topAt: () => null }, coast: createSea(scene),
    materials: createBlockMaterials(new THREE.DataArrayTexture(), new THREE.Texture(), 0),
  };
  return { fx: createWeatherFx({ stage, world, quality: { mobile: true } }), camera };
}

test('weather reads reuse caller storage while public snapshots remain independent', () => {
  const { fx } = fixture(), out = {};
  const before = fx.state;
  assert.equal(fx.readState(out), out, 'frame readers retain their own reusable record');
  assert.deepEqual(out, { cloud: 0, rain: 0, snow: 0, fog: 0, haze: 0, wind: 0, storm: 0, wet: 0, cover: 0 });
  fx.setWeather({ rain: 1, snow: .4, wind: .5 }); fx.settle();
  fx.readState(out);
  assert.deepEqual(out, { cloud: 0, rain: 1, snow: .4, fog: 0, haze: 0, wind: .5, storm: 0, wet: 1, cover: .75 });
  assert.equal(before.rain, 0, 'retained public snapshots must not become live state');
  const snapshot = fx.state;
  out.rain = -10; snapshot.wind = -10;
  fx.readState(out);
  assert.equal(out.rain, 1, 'writing caller storage must not alter the weather');
  assert.equal(out.wind, .5, 'writing a public snapshot must not alter the weather');
  fx.setWeather({}); fx.settle(); fx.readState(out);
  assert.equal(snapshot.rain, 1, 'later reads and updates must not overwrite retained snapshots');
  assert.notEqual(fx.state, fx.state, 'the public getter still returns fresh snapshots');
});

test('weather frame reads preserve precipitation and surface transition timing', () => {
  const { fx, camera } = fixture();
  fx.setWeather({ rain: 1, snow: 1, wind: .5 }); fx.update(.8, camera);
  const out = {}; fx.readState(out);
  assert.ok(Math.abs(out.rain - .6321205588285577) < 1e-12);
  assert.ok(Math.abs(out.snow - .6321205588285577) < 1e-12);
  assert.ok(Math.abs(out.wind - .31606027941427883) < 1e-12);
  assert.ok(Math.abs(out.wet - .27385096292630906) < 1e-12);
  assert.ok(Math.abs(out.cover - .14785621103378865) < 1e-12);
});

test('rain and snow retain distinct density, fall direction, and opacity', () => {
  const { fx } = fixture();
  fx.setWeather({ rain: .5, snow: .25, wind: .4 }); fx.settle();
  const rain = fx.rain.material.uniforms, snow = fx.snow.material.uniforms;
  assert.equal(fx.rain.geometry.instanceCount, 420);
  assert.equal(fx.snow.geometry.instanceCount, 175);
  assert.equal(rain.uAlpha.value, .55);
  assert.equal(snow.uAlpha.value, .9);
  assert.equal(rain.uLen.value, .7250000000000001);
  assert.ok(Math.abs(rain.uDir.value.y + 9 / Math.hypot(9, 2)) < 1e-12);
  assert.ok(Math.abs(snow.uDir.value.y + 1.15 / Math.hypot(1.15, .64)) < 1e-12);
  fx.setWeather({}); fx.settle();
  assert.equal(fx.rain.visible, false);
  assert.equal(fx.snow.visible, false);
  assert.equal(fx.rain.geometry.instanceCount, 0);
  assert.equal(fx.snow.geometry.instanceCount, 0);
});
