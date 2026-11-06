// The floating mini player: transport and pause/resume, the three-second
// previous rule, volume and mute, saved preferences, keyboard access and
// interaction isolation from the 3D scene.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';
import { COURTYARD_TRACKS } from '../world/music-library.js';

const base = process.argv[2] || 'http://127.0.0.1:8765/';
const fixture = readFileSync(new URL('./fixtures/audio-tone.mp3', import.meta.url));
const out = fileURLToPath(new URL('./.check/music-mini/', import.meta.url));
mkdirSync(out, { recursive: true });
const TOTAL = COURTYARD_TRACKS.length;
const MINI = '[data-music-mini]';
const AUDIO = '#courtyard-audio';

const title = page => page.locator(`${MINI} [data-music-mini-title]`).textContent();
const progress = page => page.locator(AUDIO).evaluate(audio => audio.currentTime);
const playing = page => page.locator(AUDIO).evaluate(audio => !audio.paused && !audio.ended);
const view = page => page.evaluate(() => {
  const mini = document.querySelector('[data-music-mini]').getBoundingClientRect();
  const actions = document.querySelector('.pyramid-actions')?.getBoundingClientRect();
  const bar = document.querySelector('#hotbar')?.getBoundingClientRect();
  const apart = (a, b) => !b || a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom;
  return {
    inside: mini.left >= 0 && mini.top >= 0 && mini.right <= innerWidth && mini.bottom <= innerHeight,
    clear: apart(mini, actions) && apart(mini, bar),
    width: mini.width,
  };
});
const scene = page => page.evaluate(() => ({
  x: __home.player.pos.x,
  z: __home.player.pos.z,
  yaw: __home.rig.captureView().yaw,
  open: document.querySelector('#panel').open,
  audios: document.querySelectorAll('audio').length,
  minis: document.querySelectorAll('[data-music-mini]').length,
}));
// Serve the short tone with byte ranges: without them the browser marks the
// media unseekable, and the three-second rule could not be exercised.
function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header || '').trim());
  if (!match) return null;
  let start = match[1] === '' ? null : Number(match[1]);
  let end = match[2] === '' ? null : Number(match[2]);
  if (start === null) { start = Math.max(0, size - (end ?? 0)); end = size - 1; }
  else if (end === null) end = size - 1;
  if (start > end || start >= size) return null;
  return [start, Math.min(end, size - 1)];
}

async function serveTracks(page) {
  await page.route('**/assets/music/*.mp3', route => {
    const common = { 'content-type': 'audio/mpeg', 'accept-ranges': 'bytes', 'cache-control': 'no-store' };
    const range = parseRange(route.request().headers().range, fixture.length);
    if (!range) return route.fulfill({ status: 200, headers: common, body: fixture });
    const [start, end] = range;
    return route.fulfill({
      status: 206,
      headers: { ...common, 'content-range': `bytes ${start}-${end}/${fixture.length}` },
      body: fixture.subarray(start, end + 1),
    });
  });
}

const waitLabel = (page, label) => page.waitForFunction(
  value => document.querySelector('[data-music-mini-toggle]').getAttribute('aria-label') === value, label);
const waitTitle = (page, file) => page.waitForFunction(
  name => document.querySelector('[data-music-mini-title]').textContent.startsWith(name), file.title);

async function start(page) {
  await page.goto(base);
  await page.waitForFunction(() => window.__home?.world.foyer?.record, null, { timeout: 60000 });
  await page.evaluate(() => __home.rig.skipIntro());
  await page.waitForFunction(() => {
    const mini = document.querySelector('[data-music-mini]');
    return mini && !mini.hidden;
  });
  // A screenshot taken while the opening veil is still up shows its progress
  // bar instead of the scene. The veil is cosmetic, so a slow fade may not fail
  // the suite, but the pictures want it gone.
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector('#loading')).display === 'none',
    null, { timeout: 15000 }).catch(() => {});
}

// A freshly loaded source can reset the position once its metadata lands, so
// keep asking until the element really holds the requested position.
async function seekTo(page, at, nearEnd = false) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const held = await page.locator(AUDIO).evaluate((audio, target) => {
      const value = target === 'end' ? Math.max(0, audio.duration - .25) : target;
      audio.currentTime = value;
      return target === 'end' ? audio.currentTime > audio.duration - .6 : Math.abs(audio.currentTime - value) < .6;
    }, nearEnd ? 'end' : at).catch(() => false);
    if (held) return;
    await page.waitForTimeout(50);
  }
  throw new Error(`The audio element never accepted a seek to ${nearEnd ? 'its end' : at}.`);
}

async function setSlider(page, value) {
  await page.locator(`${MINI} [data-music-mini-slider]`)
    .evaluate((input, next) => { input.value = String(next); input.dispatchEvent(new Event('input', { bubbles: true })); }, value);
}

// ---------------------------------------------------------------------------
// A permissive policy, so transport can be exercised without gestures.
const browser = await launchBrowser({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => { Math.random = () => 0; });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await serveTracks(page);
  await start(page);

  const audio = page.locator(AUDIO);
  assert.equal(await audio.evaluate(element => element.volume), .25, 'A fresh visit starts playback at 25 percent');
  assert.equal(await page.locator('[data-music-volume]').inputValue(), '25', 'The station slider matches the initial volume');
  assert.equal(await page.locator('[data-music-mini-slider]').inputValue(), '25', 'The mini-player slider matches the initial volume');
  const toggle = page.locator(`${MINI} [data-music-mini-toggle]`);
  const mini = page.locator(MINI);

  // Structure: one player, semantic buttons, SVG icons rather than emoji.
  assert.equal(await mini.getAttribute('role'), 'group');
  assert.equal(await page.locator(`${MINI}`).count(), 1, 'Only one mini player exists');
  assert.equal(await page.locator(`${MINI} button`).count(), 5, 'Previous, play/pause, next, volume and mute');
  for (const [selector, label] of [
    ['[data-music-mini-prev]', '上一首'],
    ['[data-music-mini-toggle]', '暂停'],
    ['[data-music-mini-next]', '下一首'],
  ]) {
    const button = page.locator(`${MINI} ${selector}`);
    assert.equal(await button.getAttribute('aria-label'), label, `${selector} is labelled`);
    assert.equal(await button.evaluate(element => element.tagName), 'BUTTON');
  }
  assert.match(await page.locator(`${MINI} [data-music-mini-volume]`).getAttribute('aria-label'), /^音量/);
  assert.ok(await page.locator(`${MINI} svg`).count() >= 7, 'Every control draws an SVG icon');
  assert.doesNotMatch(await mini.innerText(), /[▶⏸⏭⏮🔊🔇♫]/, 'No emoji stands in for an icon');
  assert.equal((await title(page)).startsWith(COURTYARD_TRACKS[0].title), true, 'The capsule names the current track');
  const style = await mini.evaluate(element => ({
    background: getComputedStyle(element).backgroundColor,
    radius: getComputedStyle(element).borderRadius,
  }));
  assert.match(style.background, /rgba?\(49, 87, 76/, 'The dark-green capsule colour is kept');
  assert.notEqual(style.radius, '0px', 'The capsule keeps its rounded shape');
  const frame = await view(page);
  assert.equal(frame.inside, true, 'The capsule stays inside the viewport');
  assert.equal(frame.clear, true, 'The capsule leaves the scene controls reachable');

  // Pause keeps the source and the progress, and the icon follows the audio.
  await page.waitForFunction(() => document.querySelector('#courtyard-audio').currentTime > .25);
  await toggle.click();
  await page.waitForFunction(() => document.querySelector('#courtyard-audio').paused);
  await waitLabel(page, '播放');
  const paused = await progress(page);
  assert.ok(paused > 0, 'Pausing keeps the played progress');
  assert.equal(await audio.evaluate(a => Boolean(a.getAttribute('src'))), true, 'The audio source survives a pause');
  assert.equal(await toggle.getAttribute('aria-label'), '播放');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  await page.waitForTimeout(450);
  assert.equal(await progress(page), paused, 'A paused track does not drift');
  await page.screenshot({ path: `${out}desktop-paused.png` });

  // Play continues from the paused position, not from the start.
  await toggle.click();
  await page.waitForFunction(at => document.querySelector('#courtyard-audio').currentTime > at + .15, paused);
  await waitLabel(page, '暂停');
  assert.equal(await playing(page), true);
  assert.equal(await toggle.getAttribute('aria-label'), '暂停');
  assert.equal((await title(page)).startsWith(COURTYARD_TRACKS[0].title), true, 'Resume plays the same track');

  // A manual switch while paused changes the track and stays paused.
  await toggle.click();
  await page.waitForFunction(() => document.querySelector('#courtyard-audio').paused);
  await page.locator(`${MINI} [data-music-mini-next]`).click();
  await waitTitle(page, COURTYARD_TRACKS[1]);
  assert.equal(await audio.evaluate(a => a.paused), true, 'The paused state survives a switch');
  assert.equal(await progress(page), 0, 'A new track starts at its beginning');
  await page.locator(`${MINI} [data-music-mini-prev]`).click();
  await waitTitle(page, COURTYARD_TRACKS[0]);
  await page.locator(`${MINI} [data-music-mini-prev]`).click();
  await waitTitle(page, COURTYARD_TRACKS[TOTAL - 1]);
  await page.locator(`${MINI} [data-music-mini-next]`).click();
  await waitTitle(page, COURTYARD_TRACKS[0]);

  // Previous restarts after three seconds and steps back before that. The
  // track must be loaded first: a paused element preloads nothing.
  await toggle.click();
  await page.waitForFunction(() => {
    const audio = document.querySelector('#courtyard-audio');
    return audio.readyState >= 2 && audio.currentTime > .2 && audio.duration > 3.2;
  });
  await toggle.click();
  await page.waitForFunction(() => document.querySelector('#courtyard-audio').paused);
  await seekTo(page, 3.4);
  await page.locator(`${MINI} [data-music-mini-prev]`).click();
  await page.waitForFunction(() => document.querySelector('#courtyard-audio').currentTime < .4);
  assert.equal((await title(page)).startsWith(COURTYARD_TRACKS[0].title), true, 'Previous after three seconds restarts the track');
  await page.locator(`${MINI} [data-music-mini-prev]`).click();
  await waitTitle(page, COURTYARD_TRACKS[TOTAL - 1]);

  // While playing, previous past three seconds keeps the sound going.
  await page.locator(`${MINI} [data-music-mini-next]`).click();
  await waitTitle(page, COURTYARD_TRACKS[0]);
  await toggle.click();
  await page.waitForFunction(() => document.querySelector('#courtyard-audio').currentTime > .2);
  await seekTo(page, 3.2);
  await page.locator(`${MINI} [data-music-mini-prev]`).click();
  await page.waitForFunction(() => {
    const audio = document.querySelector('#courtyard-audio');
    return !audio.paused && audio.currentTime < 2.5;
  }, null, { timeout: 5000 });
  assert.equal((await title(page)).startsWith(COURTYARD_TRACKS[0].title), true, 'Restarting keeps playing the same track');

  // A natural end advances to the next track and plays it.
  await page.waitForFunction(() => {
    const audio = document.querySelector('#courtyard-audio');
    return audio.readyState >= 1 && audio.duration > 1;
  });
  await seekTo(page, 0, true);
  await waitTitle(page, COURTYARD_TRACKS[1]);
  await page.waitForFunction(() => document.querySelector('#courtyard-audio').currentTime > .1);
  assert.equal(await playing(page), true, 'A finished track starts the next one');
  await seekTo(page, 0);

  // Volume: collapsed by default, expands on the volume button.
  const volumeButton = page.locator(`${MINI} [data-music-mini-volume]`);
  assert.equal(await page.locator(`${MINI} [data-music-mini-volume-panel]`).isVisible(), false, 'The slider starts collapsed');
  await volumeButton.click();
  assert.equal(await volumeButton.getAttribute('aria-expanded'), 'true');
  await page.locator(`${MINI} [data-music-mini-volume-panel]`).waitFor({ state: 'visible' });
  const panel = await page.locator(`${MINI} [data-music-mini-volume-panel]`).boundingBox();
  assert.ok(panel.x >= 0 && panel.x + panel.width <= 1280, 'The popover stays inside the viewport');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}desktop-expanded.png` });
  await setSlider(page, 0);
  assert.equal(await audio.evaluate(a => a.volume), 0, 'Zero percent silences the element');
  assert.equal((await page.locator(`${MINI} [data-music-mini-percent]`).textContent()).trim(), '0%');
  assert.equal(await playing(page), true, 'A silent slider keeps the track playing');
  assert.equal(await mini.evaluate(element => element.classList.contains('is-muted')), true, 'Zero percent shows the muted icon');
  await setSlider(page, 100);
  assert.equal(await audio.evaluate(a => a.volume), 1, 'Full volume reaches the element');
  assert.equal((await page.locator(`${MINI} [data-music-mini-percent]`).textContent()).trim(), '100%');
  await setSlider(page, 65);
  assert.ok(Math.abs(await audio.evaluate(a => a.volume) - .65) < .001, 'The slider adjusts volume as it moves');
  assert.equal((await page.locator(`${MINI} [data-music-mini-percent]`).textContent()).trim(), '65%');
  assert.equal(await page.evaluate(() => localStorage.getItem('homecraft-music-volume')), '0.65');

  // Mute silences without pausing, and unmuting restores the level.
  const muteName = await title(page);
  const started = await progress(page);
  await page.locator(`${MINI} [data-music-mini-mute]`).click();
  assert.equal(await audio.evaluate(a => a.muted), true, 'Mute sets audio.muted');
  assert.equal(await audio.evaluate(a => a.paused), false, 'Mute does not pause the track');
  assert.ok(Math.abs(await audio.evaluate(a => a.volume) - .65) < .001, 'Mute leaves the volume alone');
  await page.waitForFunction(at => document.querySelector('#courtyard-audio').currentTime > at + .15, started);
  assert.equal(await title(page), muteName, 'Muting keeps the same track');
  assert.equal(await mini.evaluate(element => element.classList.contains('is-muted')), true);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}desktop-muted.png` });
  await page.locator(`${MINI} [data-music-mini-mute]`).click();
  assert.equal(await audio.evaluate(a => a.muted), false, 'Unmute clears audio.muted');
  assert.ok(Math.abs(await audio.evaluate(a => a.volume) - .65) < .001, 'Unmute restores the previous volume');
  assert.equal(await page.evaluate(() => localStorage.getItem('homecraft-music-muted')), '');
  // A zero level still comes back to something audible.
  await setSlider(page, 0);
  await page.locator(`${MINI} [data-music-mini-mute]`).click();
  assert.ok(await audio.evaluate(a => !a.muted && a.volume > 0), 'Unmuting a zero level restores a usable volume');

  // Dragging the slider never reaches the scene.
  const before = await scene(page);
  const box = await page.locator(`${MINI} [data-music-mini-slider]`).boundingBox();
  await page.mouse.move(box.x + box.width * .2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .7, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  const after = await scene(page);
  assert.deepEqual([after.x, after.z], [before.x, before.z], 'Dragging the slider does not walk the player');
  assert.ok(Math.abs(after.yaw - before.yaw) < 1e-9, 'Dragging the slider does not turn the camera');
  assert.equal(after.open, false, 'Dragging the slider never opens a card');
  assert.ok(await audio.evaluate(a => a.volume > .4), 'The drag moved the volume');
  await page.waitForTimeout(200);

  // Keyboard: the buttons and the slider are reachable and operable.
  await page.locator(`${MINI} [data-music-mini-toggle]`).focus();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('#courtyard-audio').paused);
  await waitLabel(page, '播放');
  assert.equal(await toggle.getAttribute('aria-label'), '播放', 'Space pauses the focused button');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => !document.querySelector('#courtyard-audio').paused);
  await waitLabel(page, '暂停');
  const keyboardStart = await audio.evaluate(a => a.volume);
  await page.locator(`${MINI} [data-music-mini-slider]`).focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  assert.ok(await audio.evaluate((a, from) => a.volume < from, keyboardStart), 'Arrow keys lower the volume');
  assert.ok(Math.abs((await audio.evaluate(a => a.volume)) - keyboardStart) <= .021, 'Each arrow press moves one percent');
  assert.equal((await page.evaluate(() => __home.player.pos.x)), before.x, 'Keyboard volume changes do not move the player');
  const focusRing = await page.locator(`${MINI} [data-music-mini-slider]`).evaluate(element => {
    const styles = getComputedStyle(element);
    return styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px';
  });
  assert.equal(focusRing, true, 'The focused control shows a visible focus ring');

  // Collapsing again, and rapid presses, leave exactly one player behind.
  await volumeButton.click();
  assert.equal(await volumeButton.getAttribute('aria-expanded'), 'false');
  await page.locator(`${MINI} [data-music-mini-volume-panel]`).waitFor({ state: 'hidden' });
  assert.equal(await volumeButton.getAttribute('aria-expanded'), 'false', 'The volume popover collapses');
  const name = await title(page);
  const from = COURTYARD_TRACKS.findIndex(file => name.startsWith(file.title));
  assert.ok(from >= 0, 'The visible title maps to a track');
  await page.evaluate(() => {
    const button = document.querySelector('[data-music-mini] [data-music-mini-next]');
    for (let click = 0; click < 8; click++) button.click();
  });
  await waitTitle(page, COURTYARD_TRACKS[(from + 8) % TOTAL]);
  await page.waitForFunction(() => {
    const audio = document.querySelector('#courtyard-audio');
    return audio.readyState >= 1 && !audio.paused;
  }, null, { timeout: 15000 });
  assert.deepEqual(await page.evaluate(() => ({
    audios: document.querySelectorAll('audio').length,
    minis: document.querySelectorAll('[data-music-mini]').length,
    playing: !document.querySelector('#courtyard-audio').paused,
  })), { audios: 1, minis: 1, playing: true }, 'Rapid switching keeps one player and one audio element');
  assert.deepEqual(errors, []);

  // A scene change never restarts or duplicates the track.
  const sceneStart = await progress(page);
  await page.evaluate(async () => {
    const station = (await import('/world/layout.js')).STATIONS.find(entry => entry.id === 'plaza');
    __home.player.teleport(...station.at, station);
    __home.rig.recenter(__home.player);
    __home.openPage('plaza');
  });
  await page.waitForFunction(() => document.querySelector('#panel').open);
  assert.equal(await page.locator(MINI).isVisible(), false, 'The capsule steps aside for the card');
  await page.locator('#panel .close').click();
  await page.waitForFunction(() => !document.querySelector('#panel').open);
  // A modal dialog fires `close` in a later task, so the page keeps the
  // `reading` body class (and the capsule its display:none) for a moment.
  await page.locator(MINI).waitFor({ state: 'visible' });
  await page.waitForFunction(at => document.querySelector('#courtyard-audio').currentTime > at, sceneStart);
  assert.equal(await page.locator(AUDIO).count(), 1, 'The same audio element survives a scene change');
  assert.deepEqual(errors, []);

  await page.screenshot({ path: `${out}desktop-collapsed.png` });
  await page.screenshot({ path: `${out}desktop-player.png`, clip: { x: 860, y: 560, width: 420, height: 140 } });
  // A long name may not push the buttons around: the capsule caps its width,
  // the name ellipsizes inside it and the transport keeps its own size.
  const squeeze = await page.evaluate(() => {
    const mini = document.querySelector('[data-music-mini]');
    const name = mini.querySelector('[data-music-mini-title]');
    const transport = mini.querySelector('.music-mini-transport');
    const original = name.textContent;
    const before = { mini: mini.getBoundingClientRect().width, transport: transport.getBoundingClientRect().width };
    name.textContent = '東京フラッシュバック・佐藤千亜妃 / 花曇り・Vaundy '.repeat(4);
    const after = { mini: mini.getBoundingClientRect().width, transport: transport.getBoundingClientRect().width };
    const style = getComputedStyle(name);
    const result = { before, after, clipped: name.scrollWidth > name.clientWidth + 2, overflow: style.textOverflow, wrap: style.whiteSpace };
    name.textContent = original;
    return result;
  });
  assert.equal(squeeze.clipped, true, 'A long track name is clipped instead of widening the page');
  assert.equal(squeeze.overflow, 'ellipsis', 'The clipped name ends in an ellipsis');
  assert.equal(squeeze.wrap, 'nowrap', 'The name never wraps to a second line');
  assert.equal(squeeze.after.transport, squeeze.before.transport, 'A long name never squeezes the transport buttons');
  assert.ok(squeeze.after.mini <= 360, 'The capsule caps its width instead of growing with the name');
  console.log('Desktop mini player: pause/resume, switching, volume, mute, isolation and keyboard passed.');
  await context.close();
} finally { await browser.close(); }

// ---------------------------------------------------------------------------
// A phone-sized viewport keeps every control on screen and off the dock.
{
  const browser = await launchBrowser({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    await context.addInitScript(() => { Math.random = () => 0; });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await serveTracks(page);
    await start(page);
    const layout = await view(page);
    assert.equal(layout.inside, true, 'The capsule fits the phone viewport');
    assert.equal(layout.clear, true, 'The capsule clears the dock and the entry button');
    for (const selector of ['[data-music-mini-prev]', '[data-music-mini-toggle]', '[data-music-mini-next]']) {
      const size = await page.locator(`${MINI} ${selector}`).boundingBox();
      assert.ok(size.width >= 36 && size.height >= 36, `${selector} keeps a touch-sized target`);
      assert.equal(await page.locator(`${MINI} ${selector}`).isVisible(), true, 'Core controls are never hidden on a phone');
    }
    await page.screenshot({ path: `${out}mobile-collapsed.png` });
    await page.locator(`${MINI} [data-music-mini-volume]`).click();
    const popover = await page.locator(`${MINI} [data-music-mini-volume-panel]`).boundingBox();
    assert.ok(popover.x >= 0 && popover.x + popover.width <= 390, 'The volume popover fits a phone');
    assert.ok(popover.y >= 0, 'The volume popover stays below the top edge');
    // Touch-dragging the slider changes volume without touching the camera.
    const yaw = await page.evaluate(() => __home.rig.captureView().yaw);
    const slider = page.locator(`${MINI} [data-music-mini-slider]`);
    const box = await slider.boundingBox();
    const client = await context.newCDPSession(page);
    const point = x => [{ x: Math.round(box.x + box.width * x), y: Math.round(box.y + box.height / 2) }];
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(.15) });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(.5) });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(.85) });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok(await page.locator(AUDIO).evaluate(a => a.volume > .5), 'A touch drag sets the volume');
    assert.ok(Math.abs((await page.evaluate(() => __home.rig.captureView().yaw)) - yaw) < 1e-9, 'A touch drag on the slider does not turn the camera');
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}mobile-expanded.png` });
    assert.equal((await title(page)).length > 0, true);
    assert.deepEqual(errors, []);
    console.log('Phone mini player: layout, touch targets, popover and touch drag passed.');
    await context.close();
  } finally { await browser.close(); }
}

// ---------------------------------------------------------------------------
// A fresh browser that blocks sound: the saved volume and mute state must come
// back on load, and restoring them is not a user gesture, so a blocking policy
// still leaves the page paused until the visitor asks for playback.
{
  const browser = await launchBrowser({ args: ['--autoplay-policy=document-user-activation-required'] });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => { Math.random = () => 0; });
    // Seed a saved preference before the page loads. The tab name stops the seed
    // from running again on the reloads below, which must replay whatever the
    // visitor changed in between.
    await context.addInitScript(() => {
      if (!location.protocol.startsWith('http') || window.name === 'seeded') return;
      window.name = 'seeded';
      try {
        localStorage.setItem('homecraft-music-volume', '0.45');
        localStorage.removeItem('homecraft-music-muted');
      } catch {}
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await serveTracks(page);
    await start(page);
    const state = () => page.locator(AUDIO).evaluate(a => ({ volume: a.volume, muted: a.muted, paused: a.paused }));
    const percent = () => page.locator(`${MINI} [data-music-mini-percent]`).textContent();
    // Restoring a preference is not a gesture, so the page still asks for
    // playback once and a blocking policy refuses it. Whether that refusal
    // lands before or after the element reports a stalled load is timing, not
    // player state, and the policy itself is covered by check-music-autoplay.mjs;
    // what this suite owns is that the preference is restored and the refusal is
    // not turned into an error.
    const saved = await state();
    assert.ok(Math.abs(saved.volume - .45) < .001, 'The saved volume comes back on load');
    assert.equal(saved.muted, false, 'An unmuted preference comes back unmuted');
    assert.equal((await page.locator('#panel [data-music-error]').textContent()).trim(), '', 'The blocked start reports no error');
    assert.equal((await percent()).trim(), '45%', 'The capsule shows the restored volume');
    // Browser inspection can grant activation before a delayed startup play
    // resolves. Only press Play if still paused; otherwise this would pause a
    // running track and incorrectly attribute that pause to the later mute.
    if ((await state()).paused) await page.locator(`${MINI} [data-music-mini-toggle]`).click();
    await page.waitForFunction(() => {
      const audio = document.querySelector('#courtyard-audio');
      return !audio.paused && audio.currentTime > .1;
    });
    await page.locator(`${MINI} [data-music-mini-volume]`).click();
    await page.locator(`${MINI} [data-music-mini-volume-panel]`).waitFor({ state: 'visible' });
    await page.locator(`${MINI} [data-music-mini-mute]`).click();
    const muted = await state();
    assert.equal(muted.muted, true, 'Muting leaves the element running silently');
    assert.equal(muted.paused, false, 'Muting never pauses the track');
    assert.ok(Math.abs(muted.volume - .45) < .001, 'Muting keeps the element volume');
    assert.equal(await page.evaluate(() => localStorage.getItem('homecraft-music-muted')), '1');
    // The mute flag survives a refresh on its own.
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-music-mini]') && !document.querySelector('[data-music-mini]').hidden);
    const remuted = await state();
    assert.equal(remuted.muted, true, 'The saved mute state comes back after a refresh');
    assert.ok(Math.abs(remuted.volume - .45) < .001, 'The saved volume stays put while muted');
    assert.equal((await percent()).trim(), '45%');
    assert.equal(await page.locator(`${MINI} [data-music-mini-mute]`).getAttribute('aria-pressed'), 'true');
    await page.locator(`${MINI} [data-music-mini-volume]`).click();
    await page.locator(`${MINI} [data-music-mini-volume-panel]`).waitFor({ state: 'visible' });
    await page.locator(`${MINI} [data-music-mini-mute]`).click();
    const unmuted = await state();
    assert.equal(unmuted.muted, false, 'Unmuting after a refresh clears the flag');
    assert.ok(Math.abs(unmuted.volume - .45) < .001, 'Unmuting after a refresh returns the saved volume');
    // Damaged storage must not break the player.
    await page.evaluate(() => { localStorage.setItem('homecraft-music-volume', 'loud'); localStorage.setItem('homecraft-music-muted', 'maybe'); });
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-music-mini]') && !document.querySelector('[data-music-mini]').hidden);
    assert.equal(await page.locator(AUDIO).evaluate(a => a.muted), false, 'A damaged mute flag is ignored');
    assert.ok(await page.locator(AUDIO).evaluate(a => a.volume > 0 && a.volume <= 1), 'A damaged volume falls back inside the range');
    if ((await state()).paused) await page.locator(`${MINI} [data-music-mini-toggle]`).click();
    await page.waitForFunction(() => {
      const audio = document.querySelector('#courtyard-audio');
      return !audio.paused && audio.currentTime > .1;
    });
    assert.equal(await playing(page), true, 'The player still works after damaged storage');
    assert.deepEqual(errors, []);
    console.log('Saved preferences: volume and mute survive a refresh, damaged storage is tolerated.');
    await context.close();
  } finally { await browser.close(); }
}
