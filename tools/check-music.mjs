// Public playlist, private local shelf, playback, lifetime and responsive layout.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {launchBrowser,finishOpening} from './browser.mjs';
const {COURTYARD_TRACKS}=await import('../world/music-library.js');
const PUBLIC_COUNT=COURTYARD_TRACKS.length,FIRST_TITLE=COURTYARD_TRACKS[0].title;
const base=process.argv[2]||'http://127.0.0.1:8765/',out='tools/.check/music';mkdirSync(out,{recursive:true});
function toneWav(seconds,freq){const bytes=Buffer.alloc(44+16000*2*seconds);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(16000,24);bytes.writeUInt32LE(32000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(bytes.length-44,40);for(let n=0;n<16000*seconds;n++)bytes.writeInt16LE(Math.round(900*Math.sin(n*2*Math.PI*freq/16000)),44+n*2);return bytes;}
const first=toneWav(12,220),second=readFileSync(new URL('./fixtures/audio-tone.mp3',import.meta.url));
async function openPlaza(page){
 await page.goto(base);await page.waitForFunction(()=>window.__home?.world.pyramid?.sceneryReady,null,{timeout:60000});await finishOpening(page);await page.locator('#return-button').click();
 await page.evaluate(async()=>{const {STATIONS}=await import('/world/layout.js');const s=STATIONS.find(s=>s.id==='plaza');__home.player.teleport(...s.at,s);__home.rig.recenter(__home.player);__home.openPage('plaza');});
 await page.locator('#panel .music-station').waitFor({state:'visible'});
}
assert.ok(PUBLIC_COUNT>0,'The public manifest lists tracks');
const browser=await launchBrowser(),report=[];
try {
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]) {
  const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];let netease=0,publicAudio=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://music.163.com/**',route=>{netease++;return route.abort();});
  // Stub the collection with the short fixture so checks never stream 133MB.
  await page.route('**/assets/music/*.mp3',route=>{publicAudio++;return route.fulfill({status:200,contentType:'audio/mpeg',body:second});});
  await page.goto(base);await page.waitForFunction(()=>window.__home?.world.pyramid?.sceneryReady,null,{timeout:60000});await finishOpening(page);await page.locator('#return-button').click();
  assert.equal(netease,0,'No music request on arrival');
  assert.equal(publicAudio,0,'No public audio downloads before a press');
  await page.evaluate(async()=>{const {STATIONS}=await import('/world/layout.js');const s=STATIONS.find(s=>s.id==='plaza');__home.player.teleport(...s.at,s);__home.rig.showcase([-22,4,-3],[-28,1,-8]);for(let i=0;i<90;i++)__home.rig.update(1/60,__home.player);});
  const sign=await page.evaluate(()=>__home.project(-26.5,1.4,-8));
  await page.mouse.click(sign.x,sign.y);
  await page.waitForFunction(()=>document.querySelector('#panel').open&&document.querySelector('#panel').dataset.station==='plaza');
  const host=page.locator('#panel .music-station'),audio=page.locator('#courtyard-audio');
  await host.waitFor({state:'visible'});
  assert.equal(await page.locator('#panel [data-music-playlist]').count(),0,'The NetEase form is gone');
  assert.equal(await page.locator('#panel iframe').count(),0,'No playlist iframe exists');
  assert.doesNotMatch(await host.innerText(),/网易云|NetEase|music\.163/);
  assert.equal(await page.locator('#panel [data-music-queue] .music-row').count(),PUBLIC_COUNT,'The public shelf renders every track');
  assert.equal(await page.locator('#panel [data-music-public-count]').innerText(),String(PUBLIC_COUNT));
  assert.equal(await page.locator('#panel [data-music-tab="public"]').getAttribute('aria-selected'),'true');
  assert.equal((await page.locator('#panel [data-music-title]').innerText()).trim(),FIRST_TITLE);
  assert.equal(await page.locator('#panel [data-music-empty]').isVisible(),false,'The local shelf is hidden behind its tab');
  assert.equal(publicAudio,0,'Opening the card downloads no audio');
  // Public playback starts only after a click.
  await page.locator('#panel [data-music-queue] .music-row').nth(0).click();
  await page.waitForFunction(()=>document.querySelector('#courtyard-audio').currentTime>.2);
  assert.equal(await host.evaluate(e=>e.classList.contains('is-playing')),true);
  assert.equal((await page.locator('#panel [data-music-title]').innerText()).trim(),FIRST_TITLE);
  assert.ok(publicAudio>0,'The pressed public track is fetched');
  const angle=await page.evaluate(()=>__home.world.foyer.record.rotation.y);
  await page.waitForFunction(before=>__home.world.foyer.record.rotation.y>before+.05,angle);
  await page.locator('#panel .close').click();
  const time=await audio.evaluate(a=>a.currentTime);await page.waitForFunction(t=>document.querySelector('#courtyard-audio').currentTime>t+.2,time);
  const floater=page.locator('[data-music-stop-float]');
  assert.equal(await floater.isVisible(),true,'Playback continues behind the card');
  assert.ok((await floater.textContent()).includes(FIRST_TITLE));
  await page.evaluate(async()=>{const {STATIONS}=await import('/world/layout.js');const s=STATIONS.find(s=>s.id==='plaza');__home.player.teleport(...s.at,s);__home.rig.recenter(__home.player);__home.openPage('plaza');});
  await host.waitFor({state:'visible'});
  assert.equal(await audio.count(),1,'The same audio element survives reopen');
  assert.equal(await floater.isVisible(),false);
  await page.locator('#panel [data-music-next]').click();
  await page.waitForFunction(()=>document.querySelector('[data-music-title]').textContent.includes('東京フラッシュ'));
  await page.waitForFunction(()=>document.querySelector('#courtyard-audio').currentTime>.1);
  // The local shelf is separate and private.
  await page.locator('#panel [data-music-tab="local"]').click();
  assert.equal(await page.locator('#panel [data-music-empty]').isVisible(),true);
  await page.locator('#panel [data-music-files]').setInputFiles([{name:'First.wav',mimeType:'audio/wav',buffer:first},{name:'Second.mp3',mimeType:'audio/mpeg',buffer:second}]);
  await page.waitForFunction(()=>document.querySelectorAll('[data-music-local-queue] .music-row').length===2);
  assert.equal(await page.locator('#panel [data-music-tab="local"]').getAttribute('aria-selected'),'true','Importing opens the local shelf');
  assert.equal(await page.locator('#panel [data-music-count]').innerText(),'2');
  assert.equal(await page.locator('#panel [data-music-queue] .music-row').count(),PUBLIC_COUNT,'Local files never enter the public shelf');
  await page.waitForFunction(index=>document.querySelector(`[data-music-local-queue] .music-row[data-index="${index}"] .music-row-time`)?.textContent==='0:12',PUBLIC_COUNT,{timeout:15000});
  await page.locator('#panel [data-music-local-queue] .music-row').nth(0).click();
  await page.waitForFunction(()=>document.querySelector('#courtyard-audio').currentTime>.15);
  assert.match(await page.locator('#panel [data-music-title]').innerText(),/First/);
  assert.match(await page.locator('#panel [data-music-kicker]').innerText(),/SIDE B/);
  await page.waitForTimeout(250);
  await page.screenshot({path:`${out}/${viewport.width}-local.png`});
  // Volume persists.
  await page.locator('#panel [data-music-volume]').evaluate(input=>{input.value='40';input.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.ok(Math.abs(await audio.evaluate(a=>a.volume)-.4)<.01);
  assert.equal(await page.evaluate(()=>localStorage.getItem('homecraft-music-volume')),'0.4');
  // Repeat cycles all -> one -> off -> all.
  const repeat=page.locator('#panel [data-music-repeat]');
  assert.equal(await repeat.getAttribute('data-mode'),'all');
  await repeat.click();assert.equal(await repeat.getAttribute('data-mode'),'one');
  await repeat.click();assert.equal(await repeat.getAttribute('data-mode'),'off');
  await repeat.click();assert.equal(await repeat.getAttribute('data-mode'),'all');
  // Seeking works while a file is loaded.
  await page.locator('#panel [data-music-seek]').evaluate(input=>{input.value='500';input.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.ok(await audio.evaluate(a=>a.currentTime>1),'Scrubbing moves playback');
  // Clearing removes only the local shelf; the public record stays ready.
  await page.locator('#panel [data-music-clear]').click();
  assert.equal(await page.locator('#panel [data-music-local-queue] .music-row').count(),0);
  assert.equal(await page.locator('#panel [data-music-queue] .music-row').count(),PUBLIC_COUNT,'Public tracks survive clearing');
  assert.equal((await page.locator('#panel [data-music-title]').innerText()).trim(),FIRST_TITLE);
  assert.equal(await audio.evaluate(a=>!a.getAttribute('src')),true,'Clearing the playing local file releases it');
  // Folder picker still filters audio-only files.
  await page.locator('#panel [data-music-folder]').setInputFiles(fileURLToPath(new URL('./fixtures',import.meta.url)));
  await page.waitForFunction(()=>document.querySelectorAll('[data-music-local-queue] .music-row').length===1);
  assert.match(await page.locator('#panel [data-music-local-queue] .music-row-text b').textContent(),/audio-tone/);
  await page.locator('#panel [data-music-clear]').click();
  assert.equal(netease,0,'The music card never contacts NetEase');
  await page.locator('#panel [data-music-tab="public"]').click();
  await page.waitForTimeout(250);
  await page.screenshot({path:`${out}/${viewport.width}-player.png`});
  // A public record still plays from its manifest entry.
  await page.locator('#panel [data-music-queue] .music-row').nth(0).click();
  await page.waitForFunction(()=>document.querySelector('#courtyard-audio').currentTime>.2);
  await page.locator('#panel .close').click();await page.locator('[data-music-stop-float]').click();
  assert.equal(await audio.evaluate(a=>a.paused),true,'The floating pill stops playback');
  assert.equal(await page.locator('#panel').evaluate(e=>e.scrollWidth<=e.clientWidth),true,'Card does not overflow horizontally');
  await page.evaluate(()=>{__home.rig.showcase([-23,4,-3],[-28,1,-8]);for(let i=0;i<90;i++)__home.rig.update(1/60,__home.player);});
  await page.screenshot({path:`${out}/${viewport.width}-station.png`});
  report.push({viewport,errors,netease,publicAudio,stats:await page.evaluate(()=>__home.stats())});assert.deepEqual(errors,[]);await context.close();
 }
 // Small and short screens keep tabs, shelf and the lifetime note inside the card.
 for(const viewport of [{width:320,height:700},{width:375,height:667},{width:360,height:640}]) {
  const context=await browser.newContext({viewport}),page=await context.newPage();
  await page.route('**/assets/music/*.mp3',route=>route.fulfill({status:200,contentType:'audio/mpeg',body:second}));
  await openPlaza(page);
  const host=page.locator('#panel .music-station');
  await page.locator('#panel [data-music-files]').setInputFiles([{name:'First.wav',mimeType:'audio/wav',buffer:first},{name:'Second.mp3',mimeType:'audio/mpeg',buffer:second}]);
  await page.waitForFunction(()=>document.querySelectorAll('[data-music-local-queue] .music-row').length===2);await page.waitForTimeout(400);
  const m=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect();const hostEl=document.querySelector('.music-station'),panelEl=document.querySelector('#panel'),station=r('.music-station'),queue=r('.music-local-queue'),note=r('.music-note'),arm=r('.music-arm'),title=r('.music-now-title'),head=r('.music-library-head'),tabs=document.querySelector('.music-tabs');return {host:[hostEl.clientWidth,hostEl.scrollWidth],panel:[panelEl.clientWidth,panelEl.scrollWidth],head:[head.width,head.height],tabs:[tabs.clientWidth,tabs.scrollWidth],queueBottom:queue.bottom,noteTop:note.top,noteBottom:note.bottom,stationBottom:station.bottom,armRight:arm.right,titleLeft:title.left,noteVisible:getComputedStyle(document.querySelector('.music-note')).display!=='none'};});
  assert.equal(m.noteVisible,true,'The lifetime note stays visible');
  assert.ok(m.panel[1]<=m.panel[0]+1&&m.host[1]<=m.host[0]+1,`No horizontal overflow at ${viewport.width}: panel ${JSON.stringify(m.panel)}, host ${JSON.stringify(m.host)}`);
  assert.ok(m.queueBottom<=m.noteTop+.5,`Shelf stays above the note at ${viewport.width}x${viewport.height}`);
  assert.ok(m.noteBottom<=m.stationBottom+.5,`Lifetime note is not clipped at ${viewport.width}x${viewport.height}`);
  assert.ok(m.armRight<=m.titleLeft,`Idle tonearm clears the title at ${viewport.width}x${viewport.height}`);
  assert.ok(m.tabs[0]>0&&m.tabs[1]<=m.tabs[0]+1,`Tabs fit at ${viewport.width}: ${JSON.stringify(m.tabs)}`);
  await page.screenshot({path:`${out}/${viewport.width}-player.png`});
  await context.close();
 }
} finally{await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));}
console.log('Public playlist, private local shelf, playback, queue, seek, lifetime and desktop/mobile/short-screen layout passed.');
