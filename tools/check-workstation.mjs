import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, finishOpening } from './browser.mjs';

const base=process.argv[2]||'http://127.0.0.1:8765/';
const out='tools/.check/workstation';mkdirSync(out,{recursive:true});
const browser=await launchBrowser(),report=[];
try {
  for(const viewport of [{width:1440,height:950},{width:390,height:844}]) {
    const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);await page.waitForFunction(()=>window.__home?.world.pyramid.sceneryReady,null,{timeout:60000});
    await finishOpening(page);await page.locator('#loading').waitFor({state:'detached'});
    await page.evaluate(()=>{
      const h=__home;h.player.teleport(...h.world.workstation.approach);h.rig.skipIntro();
      h.rig.showcase([7.3,3.2,-5.8],[12.4,1.95,-12.65]);
      for(let i=0;i<100;i++)h.rig.update(1/60,h.player);
    });
    await page.waitForTimeout(350);
    const state=await page.evaluate(async()=>{
      const h=__home,ws=h.world.workstation,T=await import('three');
      const {STATIONS}=await import('/world/layout.js');
      const {PYRAMID}=await import('/world/boundaries.js');
      const atlas=ws.mesh.getObjectByName('workstation-screens').material.map.image;
      const before=ws.mesh.getObjectByName('workstation-status-leds').material.opacity;
      h.extras.update(.8);const after=ws.mesh.getObjectByName('workstation-status-leds').material.opacity;
      const project=p=>{const v=p.clone().project(h.stage.camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};};
      const routes=STATIONS.filter(s=>['writing','friends','about','workbench'].includes(s.id)).map(s=>({id:s.id,clear:h.nav.canStand(...s.at),path:!!h.nav.findPath({x:-13,z:0},{x:s.at[0],z:s.at[1]})}));
      const furnitureBlocked=[[0,0],[-2.05,.5],[-.15,1.1],[2.2,.45]].every(([dx,dz])=>{const p=ws.at(dx,dz);return !h.nav.canStand(p.x,p.z);});
      h.player.teleport(9,-9.4);
      for(let i=0;i<75;i++)h.player.update(1/60,{x:1,z:0,run:false},0);
      const crossing={x:h.player.pos.x,z:h.player.pos.z};
      h.player.teleport(...ws.approach);
      for(let i=0;i<60;i++)h.player.update(1/60,{x:-Math.sin(ws.yaw),z:-Math.cos(ws.yaw),run:false},0);
      const seatStop=ws.toLocal(h.player.pos).z;h.player.teleport(...ws.approach);
      // Follow the real walking controller, beyond merely finding an A* path.
      const walkTo=at=>{
        const started=h.player.goTo(...at);
        for(let i=0;i<1200&&h.player.path?.length;i++)h.player.update(1/60,{x:0,z:0,run:false},0);
        return started&&Math.hypot(h.player.pos.x-at[0],h.player.pos.z-at[1])<.45;
      };
      h.player.teleport(ws.stand.x,ws.stand.z);
      const library=STATIONS.find(s=>s.id==='writing');
      const libraryWalk=walkTo(library.at),returnWalk=walkTo(ws.approach);
      h.player.teleport(...ws.approach);
      // Check all rendered workstation boxes, not merely collider centres.
      const {furnishHall}=await import('/world/furnish.js');const hall=furnishHall(h.world.tiles.layer);
      const items=hall.batches.hall.items.opaque.filter(i=>i.tag==='workstation');
      const bounds=new T.Box3(),unit=new T.Box3(new T.Vector3(-.5,-.5,-.5),new T.Vector3(.5,.5,.5));
      let roofClear=true;
      for(const i of items){const b=unit.clone().applyMatrix4(i.matrix);bounds.union(b);const r=Math.max(Math.abs(b.min.x),Math.abs(b.max.x),Math.abs(b.min.z),Math.abs(b.max.z));if(b.max.y+.15>PYRAMID.height*(1-r/PYRAMID.half))roofClear=false;}
      // New canvases from the isolated measurement are never uploaded to the renderer.
      return {screens:ws.screens.map(s=>({id:s.id,point:project(s.position)})),href:ws.href,atlas:[atlas.width,atlas.height],ledChanged:before!==after,routes,libraryWalk,returnWalk,furnitureBlocked,crossing,seatStop,roofClear,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},boxes:items.length,stats:h.stats(),portals:h.world.portals.map(g=>[g.id,g.x,g.z]),core:h.stage.scene.getObjectByName('armillary-core').getWorldPosition(new T.Vector3()).toArray()};
    });
    assert.equal(state.screens.length,3);assert.deepEqual(state.atlas,[1536,640]);
    assert.equal(state.href,'https://github.com/Aletheiar');assert.ok(state.ledChanged);
    assert.ok(state.roofClear);assert.ok(state.routes.every(s=>s.clear&&s.path));
    assert.ok(state.libraryWalk&&state.returnWalk,'the real walker can travel from the chair exit to the library and back');
    assert.ok(state.furnitureBlocked&&state.crossing.x>12.5&&Math.abs(state.crossing.z+9.4)<.01);
    assert.ok(state.seatStop>1.5&&state.seatStop<2.35,`the chair's actual footprint stops the walker (stopped at ${state.seatStop.toFixed(2)})`);
    assert.ok(state.bounds.min[0]>8.5&&state.bounds.max[0]<16&&state.bounds.min[2]>-15.6&&state.bounds.max[2]<-9.9);
    assert.deepEqual(state.portals,[['writing',11,0],['friends',-5.5,6.4],['about',-5.5,-6.4]]);
    assert.deepEqual([state.core[0],state.core[2]],[0,0]);
    // Intercept only the external destination; test a real click and actual popup.
    await context.route('https://github.com/**',route=>route.fulfill({contentType:'text/html',body:'<title>GitHub destination test</title>'}));
    report.push({viewport,state,errors});
    await page.screenshot({path:`${out}/${viewport.width}-pre-hover.png`});
    const main=state.screens.find(s=>s.id==='main').point;
    await page.mouse.move(main.x,main.y);
    await page.waitForFunction(()=>!document.querySelector('#tooltip').hidden&&document.querySelector('#tooltip').textContent==='访问 GitHub ↗');
    await page.screenshot({path:`${out}/${viewport.width}-detail.png`});
    const before=await page.evaluate(()=>({p:[__home.player.pos.x,__home.player.pos.z],url:location.href}));
    const popupPromise=page.waitForEvent('popup');await page.mouse.click(main.x,main.y);const popup=await popupPromise;
    await popup.waitForLoadState();assert.equal(popup.url(),'https://github.com/Aletheiar');
    assert.equal(await popup.evaluate(()=>window.opener),null);await popup.close();
    const after=await page.evaluate(()=>({p:[__home.player.pos.x,__home.player.pos.z],url:location.href}));assert.deepEqual(after,before);
    let unwanted=0;page.on('popup',()=>unwanted++);
    // The status screen keeps its own hint and panel without opening a popup.
    const sides=[['status','系统状态']];
    for(const [i,[id,hint]] of sides.entries()) {
      await page.evaluate(()=>__home.player.cancel());
      // Opening and closing a page releases the locked showcase camera, so
      // re-lock it and project immediately before each hover.
      const point=await page.evaluate(sid=>{
        const h=__home,s=h.world.workstation.screens.find(s=>s.id===sid);
        // Stand at the desk and look straight at this screen: the same view a
        // visitor has, without a locked showcase camera in between.
        const p=h.world.workstation.at(0,2);h.player.cancel();h.player.teleport(p.x,p.z);
        h.rig.skipIntro();h.rig.setFirstPerson(true,Math.atan2(s.position.x-h.player.pos.x,s.position.z-h.player.pos.z));
        h.rig.orbit(0,28);
        for(let k=0;k<120;k++)h.rig.update(1/60,h.player);
        const v=s.position.clone().project(h.stage.camera);
        return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};
      },id);
      await page.mouse.move(point.x,point.y);await page.waitForTimeout(160);
      const text=await page.locator('#tooltip').textContent();
      assert.equal(await page.locator('#tooltip').isVisible(),true,`the ${id} screen offers its own hint`);
      assert.ok(text.startsWith(hint),`the ${id} hint names the screen (got ${text})`);
      const pos=await page.evaluate(()=>[__home.player.pos.x,__home.player.pos.z]);
      await page.mouse.click(point.x,point.y);
      await page.waitForFunction(()=>document.querySelector("#panel")?.open,null,{timeout:3000});
      const open=await page.evaluate(()=>document.querySelector('#panel').dataset.station);
      assert.equal(open,id,`the ${id} screen opens its own panel`);
      assert.deepEqual(await page.evaluate(()=>[__home.player.pos.x,__home.player.pos.z]),pos,'a screen click never walks the player');
      await page.keyboard.press('Escape');
      await page.waitForFunction(()=>!document.querySelector("#panel")?.open,null,{timeout:3000});
      assert.equal(await page.evaluate(()=>location.href.endsWith('#')),false,'aux panels leave the URL alone');
      if(i===0) await page.screenshot({path:`${out}/${viewport.width}-status-closed.png`});
    }
    await page.waitForTimeout(200);assert.equal(unwanted,0,'side screens never open a popup');
    // Sit down, work while seated, then stand back up on safe ground.
    const seatPoint=await page.evaluate(()=>{
      const h=__home,s=h.world.workstation.fixtures.find(f=>f.id==='seat');
      // Stand where a visitor would stand, facing the desk, and look down at the chair.
      const p=h.world.workstation.at(0,2.2);h.player.cancel();h.player.teleport(p.x,p.z);h.rig.skipIntro();h.rig.setFirstPerson(true,h.world.workstation.faceDesk);
      h.rig.orbit(0,160);
      for(let k=0;k<120;k++)h.rig.update(1/60,h.player);
      const c=s.box.getCenter(new (h.stage.camera.position.constructor)()).project(h.stage.camera);
      return {x:(c.x+1)*innerWidth/2,y:(1-c.y)*innerHeight/2};
    });
    await page.waitForTimeout(140);
    const nearPrompt=await page.locator('#nr-seat-prompt');
    assert.equal(await nearPrompt.isVisible(),true,'standing beside the chair shows the seat prompt');
    assert.equal((await nearPrompt.textContent()).trim(),'按 F 坐下','the prompt names the F key');
    await page.mouse.move(seatPoint.x,seatPoint.y);await page.waitForTimeout(140);
    await page.mouse.click(seatPoint.x,seatPoint.y);
    await page.waitForFunction(()=>__home.world.workstation.controls.seated===true,null,{timeout:3000});
    await page.waitForTimeout(500);
    const seatedState=await page.evaluate(()=>{
      const h=__home,c=h.stage.camera;
      const before=[h.player.pos.x,h.player.pos.z];
      // Hold "walk forward" for a second: a seated visitor must stay put.
      for(let i=0;i<60;i++)h.player.update(1/60,{x:1,z:0,run:false},0,true);
      return {eye:c.position.toArray(),first:h.rig.firstPerson,
        walked:[h.player.pos.x,h.player.pos.z],before,
        seat:[h.world.workstation.seat.x,h.world.workstation.seat.z]};
    });
    const drift=Math.hypot(seatedState.walked[0]-seatedState.before[0],seatedState.walked[1]-seatedState.before[1]);
    assert.ok(drift<.35,`the seated visitor cannot walk away (moved ${drift.toFixed(2)} m)`);
    assert.ok(Math.hypot(seatedState.walked[0]-seatedState.seat[0],seatedState.walked[1]-seatedState.seat[1])<.8,'the seated visitor stays in the chair');
    assert.equal(seatedState.first,true,'sitting is a real first-person viewpoint');
    // The seated eye sits at the chair, looking over the desk at the screens.
    assert.ok(Math.abs(seatedState.eye[0]-seatedState.seat[0])<.5&&Math.abs(seatedState.eye[2]-seatedState.seat[1])<.6,`the camera moved to the seat (eye ${seatedState.eye.map(n=>n.toFixed(2)).join(', ')})`);
    assert.ok(seatedState.eye[1]>1.2&&seatedState.eye[1]<2.2,'the seated eye is at desk height');
    // The status screen stays operable while seated and closes with Escape.
    const seatedPoint=await page.evaluate(()=>{
      const h=__home,s=h.world.workstation.screens.find(s=>s.id==='status');
      // Seated at the desk the side screens sit outside a 50° view, so the
      // visitor turns their head — the same mouse look they use while walking.
      h.rig.setFirstPerson(true,Math.atan2(s.position.x-h.player.pos.x,s.position.z-h.player.pos.z));
      for(let k=0;k<40;k++)h.rig.update(1/60,h.player);
      const v=s.position.clone().project(h.stage.camera);
      return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};
    });
    await page.mouse.move(seatedPoint.x,seatedPoint.y);await page.waitForTimeout(160);
    await page.mouse.click(seatedPoint.x,seatedPoint.y);
    await page.waitForFunction(()=>document.querySelector("#panel")?.open,null,{timeout:3000});
    assert.equal(await page.evaluate(()=>__home.world.workstation.controls.seated),true,'a page does not stand the visitor up');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector("#panel")?.open,null,{timeout:3000});
    assert.equal(await page.evaluate(()=>__home.world.workstation.controls.seated),true,'Escape closes the page first');
    assert.equal((await page.locator('#nr-seat-prompt').textContent()).trim(),'按 F 起身','the seated prompt asks for F');
    // Escape is not a seat control: only F stands the visitor up.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(()=>__home.world.workstation.controls.seated),true,'Escape never stands the visitor up');
    assert.equal(await page.locator('.nr-seat-exit').isVisible(),false,'a fine pointer gets no click-to-stand button');
    await page.keyboard.press('f');
    await page.waitForTimeout(300);
    const stood=await page.evaluate(async()=>{
      const h=__home;const {createNav}=await import('/engine/world/nav.js');
      return {seated:h.world.workstation.controls.seated,pos:[h.player.pos.x,h.player.pos.z],first:h.rig.firstPerson,stand:h.world.workstation.stand};
    });
    assert.equal(stood.seated,false,'Escape beside the desk stands the visitor up');
    assert.ok(Math.hypot(stood.pos[0]-stood.stand.x,stood.pos[1]-stood.stand.z)<.5,`the visitor is placed behind the chair (at ${stood.pos.map(n=>n.toFixed(2)).join(', ')})`);
    const safe=await page.evaluate(([x,z])=>__home.nav.canStand(x,z),stood.pos);
    assert.equal(safe,true,'the standing spot is real floor, not inside the chair');
    await page.evaluate(()=>{const h=__home;h.player.cancel();h.player.teleport(-6,-6);for(let k=0;k<30;k++)h.rig.update(1/60,h.player)});
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#nr-seat-prompt').isVisible(),false,'the prompt disappears away from the chair');
    // From this side angle the right housing covers the main screen in screen
    // space. That point now belongs to the side screen it actually shows, so the
    // GitHub target must not be reachable through it.
    await page.evaluate(()=>{const h=__home,w=h.world.workstation,p=w.at(2,.6),eye=w.at(1.9,-.13),look=w.at(1.02,-.24);h.player.cancel();h.player.teleport(p.x,p.z);h.rig.showcase([eye.x,1.3,eye.z],[look.x,1.3,look.z]);for(let i=0;i<100;i++)h.rig.update(1/60,h.player)});
    await page.mouse.move(viewport.width/2,viewport.height/2);await page.waitForTimeout(160);
    const occluded=await page.locator('#tooltip');
    if(await occluded.isVisible()) assert.notEqual(await occluded.textContent(),'访问 GitHub ↗','the auxiliary housing never offers the GitHub target');
    await page.mouse.click(viewport.width/2,viewport.height/2);await page.waitForTimeout(240);
    assert.equal(unwanted,0,'the auxiliary housing never opens the GitHub popup');
    await page.evaluate(()=>{const p=document.querySelector('#panel');if(p?.open)p.close()});
    await page.evaluate(()=>{__home.player.cancel();__home.player.teleport(8,-8);__home.rig.showcase([7,4,-6],[13,1,-12.3]);for(let i=0;i<100;i++)__home.rig.update(1/60,__home.player)});
    await page.screenshot({path:`${out}/${viewport.width}-context.png`});
    assert.deepEqual(errors,[]);await context.close();
  }
} finally {await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));}
console.log('Workstation: three textured displays, exact main-screen hover/popup, safe external link, auxiliary-screen isolation, roof clearance and hall routes passed at both widths.');
