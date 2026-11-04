// Real media playback catches lost audio ownership when cards are cloned/closed.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {launchBrowser,finishOpening} from './browser.mjs';
const base=process.argv[2]||'http://127.0.0.1:8765/',out='tools/.check/music';mkdirSync(out,{recursive:true});
const wav=Buffer.alloc(44+16000*2*12);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
for(let n=0;n<16000*12;n++)wav.writeInt16LE(Math.round(900*Math.sin(n*2*Math.PI*220/16000)),44+n*2);
const browser=await launchBrowser(),report=[];
try {
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]) {
  const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];let remoteRequests=0;
  page.on('pageerror',e=>errors.push(e.message));
  // External playback itself is verified separately against the live service.
  await page.route('https://music.163.com/outchain/**',route=>{remoteRequests++;return route.fulfill({contentType:'text/html',body:'<!doctype html><title>External player fixture</title><p>Playlist player</p>'});});
  await page.goto(base);await page.waitForFunction(()=>window.__home?.world.pyramid?.sceneryReady,null,{timeout:60000});await finishOpening(page);await page.locator('#return-button').click();
  assert.equal(remoteRequests,0,'No unsolicited music request on arrival');
  const open=()=>page.evaluate(async()=>{const {STATIONS}=await import('/world/layout.js');const s=STATIONS.find(s=>s.id==='plaza');__home.player.teleport(...s.at,s);__home.rig.recenter(__home.player);__home.openPage('plaza');});
  await page.evaluate(async()=>{const {STATIONS}=await import('/world/layout.js');const s=STATIONS.find(s=>s.id==='plaza');__home.player.teleport(...s.at,s);__home.rig.showcase([-22,4,-3],[-28,1,-8]);for(let i=0;i<90;i++)__home.rig.update(1/60,__home.player);});
  const sign=await page.evaluate(()=>__home.project(-26.5,1.4,-8));
  await page.mouse.click(sign.x,sign.y);
  await page.waitForFunction(()=>document.querySelector('#panel').open&&document.querySelector('#panel').dataset.station==='plaza');
  assert.equal(await page.locator('#panel [data-music-playlist]').inputValue(),'https://music.163.com/playlist?id=18559092586');
  await page.locator('#panel .music-local summary').click();
  await page.locator('#panel [data-music-files]').setInputFiles([{name:'First.wav',mimeType:'audio/wav',buffer:wav},{name:'Second.mp3',mimeType:'audio/mpeg',buffer:readFileSync(new URL('./fixtures/audio-tone.mp3',import.meta.url))}]);
  const audio=page.locator('#courtyard-audio');await audio.evaluate(a=>a.play());
  await page.waitForFunction(()=>document.querySelector('#courtyard-audio').currentTime>.25);
  const angle=await page.evaluate(()=>__home.world.foyer.record.rotation.y);
  await page.waitForFunction(before=>__home.world.foyer.record.rotation.y>before+.05,angle);
  await page.locator('#panel .close').click();
  const time=await audio.evaluate(a=>a.currentTime);await page.waitForFunction(t=>document.querySelector('#courtyard-audio').currentTime>t+.2,time);
  await open();assert.equal(await page.locator('#courtyard-audio').count(),1);
  await page.locator('#panel [data-music-next]').click();
  assert.match(await page.locator('#panel [data-music-track]').textContent(),/Second/);
  await page.waitForFunction(()=>document.querySelector('#courtyard-audio').currentTime>.1);
  await audio.evaluate(a=>a.pause());
  const rotation=await page.evaluate(()=>__home.world.foyer.record.rotation.y);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>__home.world.foyer.record.rotation.y),rotation);
  await audio.evaluate(a=>{a.currentTime=a.duration-.15;return a.play();});
  await page.waitForFunction(()=>document.querySelector('[data-music-track]').textContent.includes('First'));
  await page.locator('#panel [data-music-playlist]').fill('https://evil.test/playlist?id=123');await page.locator('#panel [data-music-load]').click();
  assert.equal(remoteRequests,0);assert.notEqual(await page.locator('#panel [data-music-error]').textContent(),'');
  await page.locator('#panel [data-music-playlist]').fill('https://music.163.com/playlist?id=18559092586&uct2=private');await page.locator('#panel [data-music-load]').click();
  await page.waitForFunction(()=>!!document.querySelector('[data-music-frame]'));
  assert.equal(await audio.evaluate(a=>a.paused),true,'Loading NetEase stops local music');
  assert.equal(await page.locator('[data-music-frame]').getAttribute('src'),'https://music.163.com/outchain/player?type=0&id=18559092586&auto=0&height=430');
  await page.locator('#panel .close').click();await open();assert.equal(remoteRequests,1,'Reopening must preserve the iframe document');
  assert.equal(await page.locator('#panel [data-music-stop]').isVisible(),true);
  assert.equal(await page.locator('#panel').evaluate(e=>e.scrollWidth<=e.clientWidth),true,'Mobile card does not overflow horizontally');
  await page.waitForTimeout(250);
  await page.screenshot({path:`${out}/${viewport.width}-player.png`});
  await page.locator('#panel .close').click();await page.locator('[data-music-stop-float]').click();assert.equal(await page.locator('[data-music-frame]').count(),0);
  await page.evaluate(()=>{__home.rig.showcase([-23,4,-3],[-28,1,-8]);for(let i=0;i<90;i++)__home.rig.update(1/60,__home.player);});
  await page.screenshot({path:`${out}/${viewport.width}-station.png`});
  report.push({viewport,errors,remoteRequests,stats:await page.evaluate(()=>__home.stats())});assert.deepEqual(errors,[]);await context.close();
 }
} finally{await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));}
console.log('Music playback, queue, source isolation, card lifetime and desktop/mobile layout passed.');
