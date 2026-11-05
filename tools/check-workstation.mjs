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
      const h=__home;h.player.teleport(13.3,-10.2);h.rig.skipIntro();
      h.rig.showcase([10.1,2.6,-8.9],[13.1,1,-12.5]);
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
      const furnitureBlocked=[[13.3,-12.6],[11.25,-12.68],[13.15,-12.0]].every(([x,z])=>!h.nav.canStand(x,z));
      h.player.teleport(10,-10.2);
      for(let i=0;i<75;i++)h.player.update(1/60,{x:1,z:0,run:false},0);
      const crossing={x:h.player.pos.x,z:h.player.pos.z};
      h.player.teleport(13.3,-10.2);
      for(let i=0;i<60;i++)h.player.update(1/60,{x:0,z:-1,run:false},0);
      const seatStop=h.player.pos.z;h.player.teleport(13.3,-10.2);
      // Check all rendered workstation boxes, not merely collider centres.
      const {furnishHall}=await import('/world/furnish.js');const hall=furnishHall(h.world.tiles.layer);
      const items=hall.batches.hall.items.opaque.filter(i=>i.tag==='workstation');
      const bounds=new T.Box3(),unit=new T.Box3(new T.Vector3(-.5,-.5,-.5),new T.Vector3(.5,.5,.5));
      let roofClear=true;
      for(const i of items){const b=unit.clone().applyMatrix4(i.matrix);bounds.union(b);const r=Math.max(Math.abs(b.min.x),Math.abs(b.max.x),Math.abs(b.min.z),Math.abs(b.max.z));if(b.max.y+.15>PYRAMID.height*(1-r/PYRAMID.half))roofClear=false;}
      // New canvases from the isolated measurement are never uploaded to the renderer.
      return {screens:ws.screens.map(s=>({id:s.id,point:project(s.position)})),href:ws.href,atlas:[atlas.width,atlas.height],ledChanged:before!==after,routes,furnitureBlocked,crossing,seatStop,roofClear,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},boxes:items.length,stats:h.stats(),portals:h.world.portals.map(g=>[g.id,g.x,g.z]),core:h.stage.scene.getObjectByName('armillary-core').getWorldPosition(new T.Vector3()).toArray()};
    });
    assert.equal(state.screens.length,3);assert.deepEqual(state.atlas,[1536,640]);
    assert.equal(state.href,'https://github.com/Aletheiar');assert.ok(state.ledChanged);
    assert.ok(state.roofClear);assert.ok(state.routes.every(s=>s.clear&&s.path));
    assert.ok(state.furnitureBlocked&&state.crossing.x>13.5&&Math.abs(state.crossing.z+10.2)<.01);
    assert.ok(state.seatStop<-11.05&&state.seatStop>-11.6,`the chair back stops a walk through its body (stopped at ${state.seatStop.toFixed(2)})`);
    assert.ok(state.bounds.min[0]>10&&state.bounds.max[0]<15.6&&state.bounds.min[2]>-14&&state.bounds.max[2]<-10.7);
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
    // The two side screens are interactive in their own right: each shows its
    // own hint, opens its own panel, never a popup, never a walk, never a stack.
    const sides=[['terminal','终端'],['status','系统状态']];
    for(const [i,[id,hint]] of sides.entries()) {
      await page.evaluate(()=>__home.player.cancel());
      // Opening and closing a page releases the locked showcase camera, so
      // re-lock it and project immediately before each hover.
      const point=await page.evaluate(sid=>{
        const h=__home,s=h.world.workstation.screens.find(s=>s.id===sid);
        // Stand at the desk and look straight at this screen: the same view a
        // visitor has, without a locked showcase camera in between.
        h.player.cancel();h.player.teleport(13.3,-10.6);
        h.rig.skipIntro();h.rig.setFirstPerson(true,Math.atan2(s.position.x-13.3,s.position.z+10.6));
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
      if(i===0) await page.screenshot({path:`${out}/${viewport.width}-terminal.png`});
    }
    await page.waitForTimeout(200);assert.equal(unwanted,0,'side screens never open a popup');
    // Sit down, work while seated, then stand back up on safe ground.
    const seatPoint=await page.evaluate(()=>{
      const h=__home,s=h.world.workstation.fixtures.find(f=>f.id==='seat');
      // Stand where a visitor would stand, facing the desk, and look down at the chair.
      h.player.cancel();h.player.teleport(13.3,-10.4);h.rig.skipIntro();h.rig.setFirstPerson(true,-Math.PI);
      h.rig.orbit(0,160);
      for(let k=0;k<120;k++)h.rig.update(1/60,h.player);
      const c=s.box.getCenter(new (h.stage.camera.position.constructor)()).project(h.stage.camera);
      return {x:(c.x+1)*innerWidth/2,y:(1-c.y)*innerHeight/2};
    });
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
    assert.ok(Math.abs(seatedState.eye[0]-13.15)<.5&&Math.abs(seatedState.eye[2]+11.5)<.6,`the camera moved to the seat (eye ${seatedState.eye.map(n=>n.toFixed(2)).join(', ')})`);
    assert.ok(seatedState.eye[1]>1.2&&seatedState.eye[1]<2.2,'the seated eye is at desk height');
    // Screens stay operable while seated: open the terminal, close it with Escape.
    const seatedPoint=await page.evaluate(()=>{
      const h=__home,s=h.world.workstation.screens.find(s=>s.id==='terminal');
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
    await page.keyboard.press('Escape');
    const stood=await page.evaluate(async()=>{
      const h=__home;const {createNav}=await import('/engine/world/nav.js');
      return {seated:h.world.workstation.controls.seated,pos:[h.player.pos.x,h.player.pos.z],first:h.rig.firstPerson};
    });
    assert.equal(stood.seated,false,'Escape beside the desk stands the visitor up');
    assert.ok(stood.pos[0]>12.5&&stood.pos[0]<13.8&&stood.pos[1]>-11.2&&stood.pos[1]<-10.2,`the visitor is placed behind the chair (at ${stood.pos.map(n=>n.toFixed(2)).join(', ')})`);
    const safe=await page.evaluate(([x,z])=>__home.nav.canStand(x,z),stood.pos);
    assert.equal(safe,true,'the standing spot is real floor, not inside the chair');
    // From this side angle the right housing covers the main screen in screen
    // space. That point now belongs to the side screen it actually shows, so the
    // GitHub target must not be reachable through it.
    await page.evaluate(()=>{const h=__home;h.player.cancel();h.player.teleport(15.3,-12);h.rig.showcase([15.2,1.3,-12.73],[14.32,1.3,-12.84]);for(let i=0;i<100;i++)h.rig.update(1/60,h.player)});
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
