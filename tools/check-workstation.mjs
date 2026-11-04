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
      const furnitureBlocked=[[13.3,-12.6],[11.25,-12.68],[13.15,-11.5]].every(([x,z])=>!h.nav.canStand(x,z));
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
    assert.ok(state.seatStop>-11&&state.seatStop<-10.2,'the chair stops a walk through its body');
    assert.ok(state.bounds.min[0]>10&&state.bounds.max[0]<15.6&&state.bounds.min[2]>-14&&state.bounds.max[2]<-10.7);
    assert.deepEqual(state.portals,[['writing',11,0],['friends',-5.5,6.4],['about',-5.5,-6.4]]);
    assert.deepEqual(state.core,[0,1.54,0]);
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
    for(const screen of state.screens.filter(s=>s.id!=='main')) {
      // Cancel any click-to-walk route between decorative-screen probes.
      await page.evaluate(()=>__home.player.cancel());
      await page.mouse.move(screen.point.x,screen.point.y);await page.waitForTimeout(120);
      assert.equal(await page.locator('#tooltip').isVisible(),false);
      await page.mouse.click(screen.point.x,screen.point.y);
    }
    await page.waitForTimeout(200);assert.equal(unwanted,0);
    // From this side angle the right housing overlaps the main target in
    // screen space. It must block both hover and the native click picker.
    await page.evaluate(()=>{const h=__home;h.player.cancel();h.player.teleport(15.3,-12);h.rig.showcase([15.2,1.3,-12.73],[14.32,1.3,-12.84]);for(let i=0;i<100;i++)h.rig.update(1/60,h.player)});
    await page.mouse.move(viewport.width/2,viewport.height/2);await page.waitForTimeout(120);
    assert.equal(await page.locator('#tooltip').isVisible(),false,'the auxiliary housing blocks the main hover');
    await page.mouse.click(viewport.width/2,viewport.height/2);await page.waitForTimeout(120);
    assert.equal(unwanted,0,'the auxiliary housing blocks the main click');
    await page.evaluate(()=>{__home.player.cancel();__home.player.teleport(8,-8);__home.rig.showcase([7,4,-6],[13,1,-12.3]);for(let i=0;i<100;i++)__home.rig.update(1/60,__home.player)});
    await page.screenshot({path:`${out}/${viewport.width}-context.png`});
    assert.deepEqual(errors,[]);await context.close();
  }
} finally {await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));}
console.log('Workstation: three textured displays, exact main-screen hover/popup, safe external link, auxiliary-screen isolation, roof clearance and hall routes passed at both widths.');
