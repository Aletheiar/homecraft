// Actual runtime acceptance for the central replacement, including the named
// state handoff that the former display's unit-only animation check missed.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, finishOpening } from './browser.mjs';

const base = process.argv[2] || 'http://127.0.0.1:8765/';
const out = 'tools/.check/armillary'; mkdirSync(out, { recursive: true });
const browser = await launchBrowser(), report = [];
try {
  for (const viewport of [{ width: 1440, height: 950 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport }), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForFunction(() => window.__home?.world.pyramid.sceneryReady, null, { timeout: 60000 });
    await finishOpening(page); await page.locator('#loading').waitFor({ state: 'detached' });
    const state = await page.evaluate(async () => {
      const h = __home, THREE = await import('three');
      const { STATIONS } = await import('/world/layout.js');
      const group = h.stage.scene.getObjectByName('hall-exhibit');
      if (!group?.isGroup || !h.world.exhibit) return { installed: false };
      const metal = group.getObjectByName('armillary-rings'), core = group.getObjectByName('armillary-core');
      h.player.teleport(-13, 0); h.rig.skipIntro(); h.rig.setFirstPerson(false);
      const before = [metal.rotation.y, core.rotation.y];
      h.extras.update(.5);
      const rotation = [metal.rotation.y - before[0], core.rotation.y - before[1]];
      group.updateWorldMatrix(true, true);
      const bounds = new THREE.Box3().setFromObject(group), size = bounds.getSize(new THREE.Vector3());
      const conflicts = h.world.obstacles.filter(o => o.x0 < bounds.max.x && o.x1 > bounds.min.x && o.z0 < bounds.max.z && o.z1 > bounds.min.z);
      const clear = [[-2,0],[2,0],[0,-2],[0,2],[-2,-2],[2,2]].every(([x,z])=>h.nav.canStand(x,z));
      const routes = STATIONS.filter(s=>['writing','about','friends'].includes(s.id)).map(s=>({id:s.id,path:!!h.nav.findPath({x:-13,z:0},{x:s.at[0],z:s.at[1]})}));
      // The instrument must not intersect rays to the library's identifying sign.
      const origin = new THREE.Vector3(-13,1.65,0), ray = new THREE.Raycaster();
      const signBlocked = [-1.4,0,1.4].some(z=>{
        const target=new THREE.Vector3(11,3.76,z),direction=target.clone().sub(origin);
        ray.set(origin,direction.normalize()); ray.far=origin.distanceTo(target);
        return ray.intersectObject(group,true).length>0;
      });
      h.player.teleport(-2.2,0);let peak=0;
      for(let i=0;i<90;i++){h.player.update(1/60,{x:1,z:0,run:false},0);h.extras.update(1/60);peak=Math.max(peak,h.player.y)}
      const crossing={x:h.player.pos.x,y:h.player.y,peak};
      let oldCones=0,lights=0;group.traverse(o=>{if(o.geometry?.type==='ConeGeometry')oldCones++;if(o.isLight)lights++});
      return {installed:true,position:group.position.toArray(),core:core.getWorldPosition(new THREE.Vector3()).toArray(),size:size.toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},rotation,ringCount:metal.userData.ringCount,triangles:metal.geometry.index.count/3+core.geometry.attributes.position.count/3,conflicts,clear,routes,signBlocked,crossing,oldCones,lights,portals:h.world.portals.map(g=>[g.id,g.x,g.z]),stats:h.stats()};
    });
    assert.ok(state.installed, 'The new instrument state is exported to the real update loop');
    assert.equal(state.ringCount, 3); assert.equal(state.oldCones, 0); assert.equal(state.lights, 0);
    assert.deepEqual(state.position, [0,.37,0]);
    assert.ok(state.size[0] < 2.02 && state.size[2] < 2.02 && state.bounds.max[1] < 2.6);
    assert.ok(state.rotation.every(r=>r>0&&r<.02),'Actual production updates rotate slowly');
    assert.deepEqual(state.conflicts,[]);assert.ok(state.clear&&state.routes.every(r=>r.path));assert.equal(state.signBlocked,false);
    assert.ok(state.crossing.x>2&&Math.abs(state.crossing.y)<.05&&state.crossing.peak<.4,'The existing low step and crossing remain usable');
    assert.deepEqual(state.portals,[['writing',11,0],['friends',-5.5,6.4],['about',-5.5,-6.4]]);
    const view=async(position,look,file)=>{
      await page.evaluate(({position,look})=>{__home.player.teleport(-4,2);__home.rig.showcase(position,look);for(let i=0;i<100;i++)__home.rig.update(1/60,__home.player)},{position,look});
      await page.waitForTimeout(220);await page.screenshot({path:`${out}/${viewport.width}-${file}.png`});
    };
    await view([-4.4,2.8,4.5],[0,1.1,0],'detail');
    await view([-13,1.7,0],[11,2.2,0],'entrance');
    await view([-9,7,9],[1,0,0],'hall');
    assert.deepEqual(errors,[]);report.push({viewport,state,errors});await context.close();
  }
} finally { await browser.close(); writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)); }
console.log('Armillary replacement, real animation, compact bounds, library visibility and navigation passed at desktop/narrow widths.');
