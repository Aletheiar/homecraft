import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, finishOpening, activateSceneControl } from './browser.mjs';

const base=process.argv[2]||'http://127.0.0.1:8765/';
const out='tools/.check/netrunner';mkdirSync(out,{recursive:true});
const browser=await launchBrowser(),report=[];
try {
  for(const mobile of [false,true]) {
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:950},isMobile:mobile,hasTouch:mobile});
    const page=await context.newPage(),errors=[];let popups=0;
    page.on('pageerror',e=>errors.push(e.message));
    await context.route('https://github.com/**',route=>route.fulfill({contentType:'text/html',body:'<title>GitHub test</title>'}));
    page.on('popup',()=>popups++);
    await page.goto(base);await page.waitForFunction(()=>window.__home?.world.pyramid.sceneryReady,null,{timeout:60000});
    await finishOpening(page);await page.locator('#loading').waitFor({state:'detached'});
    const tap=async point=>mobile?page.touchscreen.tap(point.x,point.y):page.mouse.click(point.x,point.y);
    const aim=async(id,stand=null)=>page.evaluate(({id,stand})=>{
      const h=__home,w=h.world.workstation;
      if(stand){const p=w.at(stand[0]-13.3,stand[1]+12.6);h.player.teleport(p.x,p.z);}
      const f=w.fixtures.find(f=>f.id===id),s=w.screens.find(s=>s.id===id);
      const rack=w.at(w.layout.rack.dx,w.layout.rack.dz);
      const p=f?f.box.getCenter(new h.stage.camera.position.constructor()):s?s.position.clone():new h.stage.camera.position.constructor(rack.x,.6,rack.z);
      const height=w.controls.seated?1.28:1.62;
      const heading=Math.atan2(p.x-h.player.pos.x,p.z-h.player.pos.z);
      h.rig.skipIntro();h.rig.setFirstPerson(true,heading,{eyeHeight:height});
      const elevation=Math.atan2(p.y-h.player.y-height,Math.hypot(p.x-h.player.pos.x,p.z-h.player.pos.z));
      h.rig.orbit(0,(-.12-elevation)/.0036);
      for(let i=0;i<130;i++)h.rig.update(1/60,h.player);
      p.project(h.stage.camera);
      return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};
    },{id,stand});
    const open=async(id,stand)=>{
      await tap(await aim(id,stand));
      await page.waitForFunction(id=>document.querySelector('#panel').open&&document.querySelector('#panel').dataset.station===id,id,{timeout:3000});
      assert.equal(await page.locator('dialog[open]').count(),1);
    };
    const close=async()=>{await page.locator('#panel header .close').click();await page.waitForFunction(()=>!document.querySelector('#panel').open);};

    // Actual pointer/touch events, including an exact one-popup assertion.
    const main=await aim('main',[13.3,-10.5]);
    const before=await page.evaluate(()=>[location.href,__home.player.pos.x,__home.player.pos.z]);
    const popupPromise=page.waitForEvent('popup');await tap(main);const popup=await popupPromise;
    await popup.waitForLoadState();assert.equal(popup.url(),'https://github.com/Aletheiar');
    assert.equal(await popup.evaluate(()=>window.opener),null);await popup.close();
    assert.equal(popups,1,'a main-screen tap opens exactly one tab');
    assert.deepEqual(await page.evaluate(()=>[location.href,__home.player.pos.x,__home.player.pos.z]),before);

    // Decorative equipment remains visible without hints, cards or links.
    for(const id of ['terminal','rack']) {
      const point=await aim(id,id==='rack'?[11.3,-10.8]:[13.3,-10.5]);
      if(!mobile)await page.mouse.move(point.x,point.y);
      await page.waitForTimeout(180);
      assert.equal(await page.locator('#tooltip').isVisible(),false,`${id} offers no hover hint`);
      if(!mobile)assert.notEqual(await page.locator('canvas').first().evaluate(c=>c.style.cursor),'pointer');
      await tap(point);await page.waitForTimeout(180);
      assert.equal(await page.locator('#panel').evaluate(p=>p.open),false,`${id} opens no card`);
      assert.equal(popups,1,`${id} opens no external page`);
      assert.equal(await page.locator(`[data-station="${id}"], [data-open="${id}"]`).count(),0,`${id} has no hidden page entry`);
      await page.screenshot({path:`${out}/${mobile?'touch':'desktop'}-${id}-decorative.png`});
    }

    await open('status',[13.3,-10.5]);
    await page.waitForFunction(()=>/^\d/.test(document.querySelector('#panel [data-k="fps"]').textContent));
    const telemetry=await page.evaluate(()=>{
      const read=k=>document.querySelector(`#panel [data-k="${k}"]`).textContent;
      return {fps:read('fps'),frame:read('frame'),calls:read('calls'),tris:read('tris'),measured:__home.stats()};
    });
    assert.ok(Math.abs(parseFloat(telemetry.frame)-telemetry.measured.frameMs)<8,'frame time comes from the engine frame sample');
    assert.ok(Number(telemetry.calls)>0&&Number(telemetry.tris.replaceAll(',',''))>0);
    await page.screenshot({path:`${out}/${mobile?'touch':'desktop'}-status.png`});await close();

    for(const id of ['poster-pyramid','poster-v']) {
      await open(id,id==='poster-v'?[11.1,-11]:[12.1,-11.1]);
      await page.waitForFunction(()=>document.querySelector('#panel img.nr-poster')?.naturalWidth>0);
      const poster=await page.locator('#panel img.nr-poster').evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight,rendered:img.getBoundingClientRect().width/innerWidth}));
      assert.equal(poster.width,id==='poster-v'?960:1280);assert.ok(poster.rendered>.3);
      await page.screenshot({path:`${out}/${mobile?'touch':'desktop'}-${id}.png`});await close();
    }
    const modes=[];
    for(let i=0;i<3;i++) {
      await tap(await aim('lights',[14.7,-11]));
      modes.push(await page.evaluate(()=>__home.world.workstation.lightMode));
    }
    assert.deepEqual(modes,['night','off','warm']);
    // Main-screen reach must also constrain the engine's original hotspot.
    await aim('main',[13.3,-10.5]);
    await page.evaluate(()=>__home.player.startFlying());
    await tap(await aim('main'));await page.waitForTimeout(180);
    assert.equal(popups,1,'flying visitors cannot bypass the workstation reach check through the old GitHub hotspot');
    await page.evaluate(()=>{const p=__home.world.workstation.at(0,2.2);__home.player.teleport(p.x,p.z);});

    // Keyboard sitting preserves first/third person; modal Escape closes first.
    await aim('seat',[13.3,-10.4]);
    await page.evaluate(()=>__home.rig.setFirstPerson(false));
    await page.keyboard.press('f');
    await page.waitForFunction(()=>__home.world.workstation.controls.seated);
    await page.waitForTimeout(650);
    const seated=await page.evaluate(()=>({eye:__home.stage.camera.position.toArray(),state:__home.world.workstation.controls.state,pos:__home.player.pos.toArray()}));
    assert.ok(Math.abs(seated.eye[1]-1.305)<.08,'seated eyes are lower than standing eyes');
    assert.equal(seated.state,'seated');
    await page.evaluate(()=>__home.rig.zoom(1.5));
    assert.equal(await page.evaluate(()=>__home.rig.firstPerson),true,'pinch zoom cannot leave the seated viewpoint');
    if(mobile){
      const client=await context.newCDPSession(page);
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:60,y:350},{x:330,y:350}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:120,y:350},{x:270,y:350}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert.equal(await page.evaluate(()=>__home.rig.firstPerson),true,'native two-finger pinch retains the seated camera');
      assert.equal(await page.locator('#panel').evaluate(p=>p.open),false,'pinch never activates the underlying display');
      await client.detach();
    }
    await activateSceneControl(page, '#moodButton');
    await page.keyboard.press('f');
    assert.equal(await page.evaluate(()=>__home.world.workstation.controls.seated),true,'weather controls block chair shortcuts');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#weatherMenu').evaluate(m=>m.hidden),true,'Escape dismisses weather before leaving the chair');
    assert.equal(await page.evaluate(()=>__home.world.workstation.controls.seated),true);
    await page.keyboard.press('f');
    assert.equal(await page.evaluate(()=>__home.world.workstation.controls.seated),true,'exploration tools also block chair shortcuts');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#scene-tools').evaluate(m=>m.open),false);
    await page.keyboard.press('Space');await page.keyboard.press('Space');await page.keyboard.press('v');
    await page.keyboard.down('w');await page.waitForTimeout(250);await page.keyboard.up('w');
    assert.equal(await page.evaluate(()=>__home.player.flying),false);
    assert.equal(await page.evaluate(()=>__home.rig.firstPerson),true);
    assert.deepEqual(await page.evaluate(()=>__home.player.pos.toArray()),seated.pos);
    for(const id of ['terminal','rack']) {
      await tap(await aim(id));await page.waitForTimeout(180);
      assert.equal(await page.locator('#panel').evaluate(p=>p.open),false,`${id} stays decorative while seated`);
      assert.equal(await page.evaluate(()=>__home.world.workstation.controls.seated),true);
      assert.equal(popups,1,`${id} never activates the main display behind it`);
    }
    await open('status');await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('#panel').open);
    assert.equal(await page.evaluate(()=>__home.world.workstation.controls.seated),true);
    await page.screenshot({path:`${out}/${mobile?'touch':'desktop'}-seated.png`});
    // A phone has no F key, so the seated chip carries a tap target; on a fine
    // pointer the F prompt is a hint and only F stands the visitor up.
    if(mobile)await page.locator('.nr-seat-exit').click();
    else await page.keyboard.press('f');
    assert.equal(await page.evaluate(()=>__home.world.workstation.controls.seated),false);
    assert.equal(await page.evaluate(()=>__home.rig.firstPerson),false);
    assert.equal(await page.evaluate(()=>__home.nav.canStand(__home.player.pos.x,__home.player.pos.z)),true);
    // Now enter by a real chair tap and leave by the interaction key.
    await tap(await aim('seat',[13.3,-10.4]));
    assert.equal(await page.evaluate(()=>__home.world.workstation.controls.seated),true);
    await page.keyboard.press('f');
    assert.equal(await page.evaluate(()=>__home.world.workstation.controls.seated),false);
    assert.equal(await page.evaluate(()=>__home.rig.firstPerson),true);
    // Escape must remain usable after a status card is dismissed, and it
    // must never be the thing that stands the visitor up.
    await page.keyboard.press('f');await open('status');
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#panel').open);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>__home.world.workstation.controls.seated),true);
    await page.keyboard.press('f');
    assert.equal(await page.evaluate(()=>__home.world.workstation.controls.seated),false);
    await page.keyboard.press('Space');await page.keyboard.press('Space');
    assert.equal(await page.evaluate(()=>__home.player.flying),true,`flight still works after leaving the seat: ${await page.evaluate(()=>JSON.stringify({mode:__home.player.mode,focus:document.activeElement?.outerHTML.slice(0,200)}))}`);
    await page.evaluate(()=>{const p=__home.world.workstation.at(0,2.2);__home.player.teleport(p.x,p.z);});
    assert.equal(popups,1,'no other fixture opens an external page');
    if(!mobile) {
      const p=await aim('status',[13.3,-10.5]);
      await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+30,p.y+15,{steps:5});await page.mouse.up();
      assert.equal(await page.locator('#panel').evaluate(p=>p.open),false,'dragging to look does not activate a fixture');
    }
    await page.evaluate(()=>{const h=__home;h.player.teleport(8,-8);h.rig.showcase([7.6,3.4,-6.5],[12.7,1.5,-12.7]);for(let i=0;i<150;i++)h.rig.update(1/60,h.player);});
    await page.screenshot({path:`${out}/${mobile?'touch':'desktop'}-workspace.png`});
    const stats=await page.evaluate(()=>__home.stats());
    assert.deepEqual(errors,[]);report.push({mobile,telemetry,seated,stats,errors});await context.close();
  }
} finally {await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));}
console.log('Netrunner: desktop and touch decorative equipment, telemetry, posters, light modes, seat controls and view restoration passed.');
