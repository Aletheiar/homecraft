import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { launchBrowser,finishOpening } from './browser.mjs';
const base=process.argv[2]||'http://127.0.0.1:8765/',out='tools/.check/decor';mkdirSync(out,{recursive:true});
const browser=await launchBrowser(),report=[];
try {
 for(const viewport of [{width:1440,height:950},{width:390,height:844}]) {
  const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[],removedArtRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',request=>{if(/assets\/gallery\/(defect|watcher)-glass\.webp/.test(request.url()))removedArtRequests.push(request.url());});
  await page.goto(base);await page.waitForFunction(()=>window.__home?.world.pyramid?.sceneryReady,null,{timeout:60000});await finishOpening(page);await page.locator('#return-button').click();
  await page.waitForFunction(()=>__home.world.gallery.ready||__home.world.gallery.error);
  const details=await page.evaluate(()=>{
   const h=__home,arts=['defect','miku','watcher'].map(id=>{const m=h.stage.scene.getObjectByName(`suspended-${id}`);return m?{id,width:m.material.map.image?.width,z:m.position.z,area:m.geometry.parameters.width*m.geometry.parameters.height}:null;});
   const dock=id=>document.querySelector(`#hotbar [data-station="${id}"] img`).src;
   return {arts,statues:h.world.statues,removed:h.world.pyramid.horseTrianglesRemoved,error:h.world.gallery.error,stats:h.stats(),friendsIcon:dock('friends'),aboutIcon:dock('about'),formerSeats:[-4,4].map(z=>h.nav.canStand(-35,z))};
  });
  assert.equal(details.error,null);
  assert.equal(details.arts[0],null,'The Defect hanging panel is removed');
  assert.equal(details.arts[2],null,'The Watcher hanging panel is removed');
  assert.ok(details.arts[1]?.width>0&&details.arts[1].area>15,'The central Miku artwork remains loaded at its original size');
  assert.deepEqual(removedArtRequests,[],'Removed panels do not download their former image textures');
  assert.equal(details.statues.devil.placement.x,-62.6);assert.equal(details.statues.devil.placement.z,19.2);
  assert.ok(details.removed>100,'The imported horse was removed, not covered with a second sculpture');
  assert.ok(details.statues.totalTriangleCount<10000);
  assert.notEqual(details.friendsIcon,details.aboutIcon,'Friends and About use distinct rendered icons');
  assert.ok(details.formerSeats.every(Boolean),'Removed benches also release their walking obstacles');
  const view=async(position,look,file)=>{await page.evaluate(({position,look})=>{__home.rig.showcase(position,look);for(let i=0;i<100;i++)__home.rig.update(1/60,__home.player);},{position,look});await page.waitForTimeout(200);await page.screenshot({path:`${out}/${viewport.width}-${file}.png`});};
  await view([-11,7,0],[1,7.6,0],'gallery');await view([-42,13,28],[-62.6,6.7,19.2],'devil');await view(viewport.width<600?[40,40,0]:[-20,20,0],[-62.6,6.5,0],'pair');
  await view([-43,8,19.2],[-62.6,7.7,19.2],'devil-front');
  await view([-53,34,25],[-23,0,0],'forecourt');
  report.push({viewport,details,errors});assert.deepEqual(errors,[]);await context.close();
 }
}finally{await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));}
console.log('Monument pair, distinct directory icon, clear forecourt and single central gallery artwork passed at desktop/mobile sizes.');
