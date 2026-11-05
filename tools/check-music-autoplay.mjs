// Exercise actual media playback under both browser autoplay policies.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { launchBrowser } from './browser.mjs';
import { COURTYARD_TRACKS } from '../world/music-library.js';

const base = process.argv[2] || 'http://127.0.0.1:8765/';
const fixture = readFileSync(new URL('./fixtures/audio-tone.mp3', import.meta.url));
const chosen = Math.floor(.41 * COURTYARD_TRACKS.length);
// Playwright evaluate/waitForFunction use Runtime.callFunctionOn with
// userGesture:true. Poll through CDP without granting the very activation
// whose absence this test needs to verify, including the first title read.
async function unactivatedStartup(page) {
  const client=await page.context().newCDPSession(page);
  try {
    const until=Date.now()+60000;
    while(Date.now()<until){
      const {result}=await client.send('Runtime.evaluate',{
        expression:`(() => {
          const audio=document.querySelector('#courtyard-audio');
          if(!window.__home?.world.foyer||!audio||audio.readyState<2)return null;
          return {title:document.querySelector('[data-music-title]').textContent,
            paused:audio.paused,activated:navigator.userActivation.hasBeenActive};
        })()`,returnByValue:true,userGesture:false,
      });
      if(result.value)return result.value;
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    throw new Error('The courtyard audio did not become ready without activation.');
  } finally {await client.detach();}
}
for (const allowed of [true, false]) {
  const browser = await launchBrowser({ args: [`--autoplay-policy=${allowed ? 'no-user-gesture-required' : 'document-user-activation-required'}`] });
  try {
    const context = await browser.newContext();
    // Fix randomness to test a nonzero starting position without changing order.
    await context.addInitScript(() => { Math.random = () => .41; });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/assets/music/*.mp3', route => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: fixture }));
    await page.goto(base);
    const initial=await unactivatedStartup(page);
    const current = () => page.locator('[data-music-title]').textContent();
    assert.equal(initial.title, COURTYARD_TRACKS[chosen].title, 'Arrival selects a random public track before opening the card');
    const audio = page.locator('#courtyard-audio');
    if (allowed) {
      await page.waitForFunction(() => document.querySelector('#courtyard-audio').currentTime > .1);
    } else {
      assert.equal(initial.activated,false,'Waiting for media never grants user activation');
      assert.equal(initial.paused, true, 'Fresh browser blocks unrequested sound');
      // A modifier key alone does not grant Chromium user activation.
      await page.keyboard.press('x');
      await page.waitForFunction(() => document.querySelector('#courtyard-audio').currentTime > .1);
      assert.equal(await current(), COURTYARD_TRACKS[chosen].title, 'Activation retains the chosen starting track');
    }
    assert.ok(await audio.evaluate(a => a.volume > 0 && !a.muted), 'First visit is audible by default');
    // Let the short media fixture really end, rather than synthesize an event.
    await audio.evaluate(a => { a.currentTime = Math.max(0, a.duration - .15); });
    await page.waitForFunction(title => document.querySelector('[data-music-title]').textContent === title, COURTYARD_TRACKS[chosen + 1].title);
    await page.waitForFunction(() => document.querySelector('#courtyard-audio').currentTime > .1);
    await page.evaluate(async () => {
      const station = (await import('/world/layout.js')).STATIONS.find(s => s.id === 'plaza');
      __home.rig.skipIntro(); __home.player.teleport(...station.at, station); __home.openPage('plaza');
    });
    await page.locator('[data-music-queue] .music-row').last().click();
    await page.waitForFunction(() => document.querySelector('#courtyard-audio').currentTime > .1);
    await audio.evaluate(a => { a.currentTime = Math.max(0, a.duration - .15); });
    await page.waitForFunction(title => document.querySelector('[data-music-title]').textContent === title, COURTYARD_TRACKS[0].title);
    assert.equal(await current(), COURTYARD_TRACKS[0].title, 'The manifest wraps from last to first');
    await page.waitForFunction(() => document.querySelector('#courtyard-audio').currentTime > .1);
    await page.locator('[data-music-queue] .music-row').nth(2).click();
    await page.waitForFunction(() => document.querySelector('#courtyard-audio').currentTime > .1);
    assert.equal(await current(), COURTYARD_TRACKS[2].title, 'Visitor may select a track');
    await page.locator('[data-music-toggle]').click();
    await page.keyboard.press('Shift');
    assert.equal(await audio.evaluate(a => a.paused), true, 'Later gestures do not undo an intentional pause');
    assert.deepEqual(errors, []);
    console.log(`${allowed ? 'Allowed' : 'Blocked'} autoplay: random start, ordered advance, wrap, visitor selection and pause passed.`);
  } finally { await browser.close(); }
}

// A touch drag grants activation without generating a click on mobile.
const browser = await launchBrowser({ args: ['--autoplay-policy=document-user-activation-required'] });
try {
  const context = await browser.newContext({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.route('**/assets/music/*.mp3', route => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: fixture }));
  await page.goto(base);
  const initial=await unactivatedStartup(page),chosenTitle=initial.title;
  assert.equal(initial.activated,false,'Readiness polling leaves the mobile document unactivated');
  assert.equal(initial.paused,true);
  const client = await context.newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 160, y: 400 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 210, y: 440 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => document.querySelector('#courtyard-audio').currentTime > .1, null, { timeout: 5000 });
  assert.equal(await page.locator('[data-music-title]').textContent(), chosenTitle);
  console.log('Mobile touch drag starts the pending arrival track without rerolling.');
} finally { await browser.close(); }
