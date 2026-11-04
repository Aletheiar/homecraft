// Catch roof-to-door sampling seams that strand a descending visitor in glass.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, finishOpening } from './browser.mjs';
const base = process.argv[2] || 'http://127.0.0.1:8765/';
const out = 'tools/.check/entry-descent'; mkdirSync(out, { recursive: true });
const browser = await launchBrowser(), report = [];
try {
  for (const viewport of [{width:1280,height:800},{width:390,height:844}]) {
    const context = await browser.newContext({viewport}), page = await context.newPage(), errors=[];
    page.on('pageerror', e=>errors.push(e.message));
    await page.goto(base);
    await page.waitForFunction(()=>window.__home?.world.pyramid?.sceneryReady,null,{timeout:60000});
    await finishOpening(page);
    const routes = await page.evaluate(()=>{
      const h=__home, result=[];
      const tick=(input,n)=>{for(let i=0;i<n;i++){h.player.update(1/60,input,0);h.extras.update(1/60);}};
      for(const z of [-6,-5.5,-4.6,-4.4,-4.2,-4,-3.8,-3.6,-2.8,0,2.8,3.6,3.8,4,4.2,4.4,4.6,5.5,6]) {
        h.player.teleport(-29,0);h.player.startFlying();tick({x:0,z:0,up:true},170);
        h.player.pos.x=-13;h.player.pos.z=z;h.player.stopFlying();tick({x:0,z:0},200);
        const start={x:h.player.pos.x,y:h.player.y,z:h.player.pos.z,mode:h.player.mode};
        tick({x:-1,z:0},230);
        result.push({z,start,end:{x:h.player.pos.x,y:h.player.y,z:h.player.pos.z,mode:h.player.mode}});
      }
      return result;
    });
    await page.evaluate(()=>{
      const h=__home,tick=(input,n)=>{for(let i=0;i<n;i++){h.player.update(1/60,input,0);h.extras.update(1/60);}};
      h.player.teleport(-29,0);h.player.startFlying();tick({x:0,z:0,up:true},170);
      h.player.pos.x=-13;h.player.pos.z=4.2;h.player.stopFlying();tick({x:0,z:0},200);
      h.rig.recenter(h.player);h.rig.set(Math.PI/2,.45,7);
    });
    await page.keyboard.down('w');
    try {await page.waitForFunction(()=>__home.player.pos.x<-20,null,{timeout:30000});}
    finally {await page.keyboard.up('w');}
    routes.push(await page.evaluate(()=>({z:4.2,method:'native-keyboard',end:{x:__home.player.pos.x,y:__home.player.y,z:__home.player.pos.z,mode:__home.player.mode}})));
    await page.evaluate(()=>{__home.rig.showcase([-28,13,20],[-14,4,4]);for(let i=0;i<90;i++)__home.rig.update(1/60,__home.player);});
    await page.waitForTimeout(150);
    await page.screenshot({path:`${out}/${viewport.width}.png`});
    report.push({viewport,routes,errors});
    await context.close();
  }
} finally {await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));}
const failures=report.flatMap(v=>[...v.errors,...v.routes.filter(r=>!(r.end.x<-20&&Math.abs(r.end.y)<.1&&r.end.mode==='ground')).map(r=>`${v.viewport.width}: ${JSON.stringify(r)}`)]);
console.log(`${report.reduce((n,v)=>n+v.routes.length,0)} door-top descent routes; ${failures.length} failures.`);
assert.deepEqual(failures,[]);
