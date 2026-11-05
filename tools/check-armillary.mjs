// Actual runtime acceptance for the central replacement, including the named
// state handoff that the former display's unit-only animation check missed.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, finishOpening } from './browser.mjs';

const base = process.argv[2] || 'http://127.0.0.1:8765/';
const out = 'tools/.check/armillary-a'; mkdirSync(out, { recursive: true });
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
      const { HALL_EXHIBIT_TOP } = await import('/world/layout.js');
      const { HALL_EXHIBIT } = await import('/world/space-config.js');
      const group = h.stage.scene.getObjectByName('hall-exhibit');
      if (!group?.isGroup || !h.world.exhibit) return { installed: false };
      const support = group.getObjectByName('armillary-base'), core = group.getObjectByName('armillary-core');
      const outer = group.getObjectByName('armillary-spin-outer'), gimbal = group.getObjectByName('armillary-gimbal');
      const innerSpin = group.getObjectByName('armillary-spin-inner');
      const bands = ['armillary-ring-outer', 'armillary-ring-middle', 'armillary-ring-inner'].map(n => group.getObjectByName(n));
      if (!support || !core || !outer || !gimbal || !innerSpin || bands.some(b => !b)) return { installed: false };
      const period = HALL_EXHIBIT.armillary.spin, tau = Math.PI * 2, snap = () => [outer.rotation.z, gimbal.rotation.y, innerSpin.rotation.x, core.rotation.y];
      h.player.teleport(-13, 0); h.rig.skipIntro(); h.rig.setFirstPerson(false);
      const before = snap();
      h.extras.update(.5);
      const rotation = snap().map((a, i) => ((a - before[i]) % tau + tau) % tau);
      const expectedHalf = [tau * .5 / period.outer, tau * .5 / period.middle, tau * .5 / period.inner, tau * .5 / period.core];
      group.updateWorldMatrix(true, true);
      // Box3.setFromObject corners a rotated child's local box and inflates it,
      // so the real extents come from the vertices themselves.
      const tight = () => {
        const box = new THREE.Box3(), v = new THREE.Vector3();
        group.traverse(o => {
          if (!o.isMesh) return;
          const p = o.geometry.attributes.position;
          for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld));
        });
        return box;
      };
      const bounds = tight(), size = bounds.getSize(new THREE.Vector3());
      const conflicts = h.world.obstacles.filter(o => o.x0 < bounds.max.x && o.x1 > bounds.min.x && o.z0 < bounds.max.z && o.z1 > bounds.min.z);
      const clear = [[-2,0],[2,0],[0,-2],[0,2],[-2,-2],[2,2]].every(([x,z])=>h.nav.canStand(x,z));
      const routes = STATIONS.filter(s=>['writing','about','friends'].includes(s.id)).map(s=>({id:s.id,path:!!h.nav.findPath({x:-13,z:0},{x:s.at[0],z:s.at[1]})}));
      // The fixed mounting must never cut the sight line to the library sign.
      // The turning bands do cross it at some phases, which is recorded below.
      const origin = new THREE.Vector3(-13,1.65,0), ray = new THREE.Raycaster();
      const signTargets = [-1.4,0,1.4].map(z=>new THREE.Vector3(11,3.76,z));
      const signBlocked = signTargets.some(t=>{
        ray.set(origin,t.clone().sub(origin).normalize()); ray.far=origin.distanceTo(t);
        return ray.intersectObject(support,true).some(h=>h.object.isMesh);
      });
      // Every band turns on its own axle: sample five-second steps across the
      // 120 s cycle of the three periods, and check that the support stays
      // dead still, the axles stay nested and the crystal volume stays empty.
      const cycle=[];
      for(let i=0;i<24;i++){
        const was=snap();
        h.world.exhibit.update(5);
        group.updateWorldMatrix(true,true);
        const delta=snap().map((a,k)=>((a-was[k])%tau+tau)%tau);
        const expected=[tau*5/period.outer,tau*5/period.middle,tau*5/period.inner,tau*5/period.core].map(a=>a%tau);
        const c=core.getWorldPosition(new THREE.Vector3()),probe=new THREE.Raycaster();
        const coreClear=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].every(d=>{
          probe.set(c,new THREE.Vector3(...d));probe.far=HALL_EXHIBIT.armillary.core*1.15;
          return probe.intersectObjects([support,...bands],false).length===0;
        });
        const supportClear=signTargets.every(t=>{
          ray.set(origin,t.clone().sub(origin).normalize());ray.far=origin.distanceTo(t);
          return !ray.intersectObject(support,true).some(h=>h.object.isMesh);
        });
        const signClear=signTargets.map(t=>{
          ray.set(origin,t.clone().sub(origin).normalize());ray.far=origin.distanceTo(t);
          return !ray.intersectObject(group,true).some(h=>h.object.isMesh);
        });
        const still=support.rotation.x===0&&support.rotation.y===0&&support.rotation.z===0&&support.position.lengthSq()===0;
        const box=tight();
        cycle.push({angle:outer.rotation.z,delta,expected,coreClear,supportClear,signClear,still,top:box.max.y,
          span:Math.max(box.max.x-box.min.x,box.max.z-box.min.z),
          nested:gimbal.parent===outer&&innerSpin.parent===gimbal});
      }
      // The trails are baked tubes hanging off the turning groups: they must
      // move with their band, stay outside the rim and cost nothing per frame.
      const trailOf=n=>h.stage.scene.getObjectByName(n);
      const outerTrail=trailOf('armillary-trail-outer'),middleTrail=trailOf('armillary-trail-middle');
      const trailState=n=>{const m=trailOf(n),g=m?.geometry,p=m?.parent;
        if(!m||!g||!p)return null;
        // Every cross-section centre must sit on the reported radius, which is
        // what keeps the arc on its band instead of drifting in space.
        const pos=g.getAttribute('position'),{centreline,sides,segs,shells}=m.userData;
        let onArc=true;
        for(let i=0;i<=segs;i++){const v=new THREE.Vector3();
          for(let s=0;s<sides;s++)v.add(new THREE.Vector3().fromBufferAttribute(pos,i*sides+s));
          if(Math.abs(v.length()/sides-centreline)>1e-5){onArc=false;break}}
        return {parent:p.name,radius:+centreline.toFixed(4),tris:g.index.count/3,
          additive:m.material.blending===THREE.AdditiveBlending,depthWrite:m.material.depthWrite,
          tube:sides>=5&&shells>=2&&g.getAttribute('position').count===shells*(segs+1)*sides,onArc};};
      const trails={outer:trailState('armillary-trail-outer'),middle:trailState('armillary-trail-middle')};
      // Riding the band means a point on the arc swings with the band's axle, so
      // turning the band must carry the same arc vertex around with it.
      const arcPoint=new THREE.Vector3().fromBufferAttribute(outerTrail.geometry.getAttribute('position'),2);
      const arcAt=angle=>{outer.rotation.z=angle;h.stage.scene.updateMatrixWorld(true);
        return arcPoint.clone().applyMatrix4(outerTrail.matrixWorld);};
      const trailMoved=arcAt(.9).distanceTo(arcAt(1.4))>.5;
      // The crystal glow is emissive only and holds steady; count what glows and
      // confirm nothing animates the two intensities.
      const shell=core.material,kernelMaterial=core.getObjectByName('armillary-core-inner').material;
      const steady=[shell.emissiveIntensity,kernelMaterial.emissiveIntensity];
      for(let i=0;i<20;i++)h.world.exhibit.update(.5);
      let glowMeshes=0;group.traverse(o=>{if(o.isMesh&&o.material.emissive&&o.material.emissive.getHex()!==0)glowMeshes++});
      const shine=h.stage.scene.getObjectByName('hall-emblem-shine');
      const glow={steady:shell.emissiveIntensity===steady[0]&&kernelMaterial.emissiveIntensity===steady[1],
        kernelKernel:kernelMaterial.emissiveIntensity>shell.emissiveIntensity,glowMeshes,
        shine:!!shine,shineAdditive:!!shine&&shine.material.blending===THREE.AdditiveBlending,shineOpacity:shine?shine.material.opacity:0};
      h.player.teleport(-2.2,0);let peak=0;
      for(let i=0;i<90;i++){h.player.update(1/60,{x:1,z:0,run:false},0);h.extras.update(1/60);peak=Math.max(peak,h.player.y)}
      const crossing={x:h.player.pos.x,y:h.player.y,peak};
      let oldCones=0,lights=0;group.traverse(o=>{if(o.geometry?.type==='ConeGeometry')oldCones++;if(o.isLight)lights++});
      let triangles=0;group.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
      return {installed:true,position:group.position.toArray(),plinthTop:HALL_EXHIBIT_TOP,core:core.getWorldPosition(new THREE.Vector3()).toArray(),size:size.toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},rotation,expectedHalf,cycle,period,config:{radii:HALL_EXHIBIT.armillary.radii,band:HALL_EXHIBIT.armillary.band},ringCount:support.userData.ringCount,glow,trails,trailMoved,triangles,conflicts,clear,routes,signBlocked,crossing,oldCones,lights,portals:h.world.portals.map(g=>[g.id,g.x,g.z]),stats:h.stats()};
    });
    report.push({viewport,state,errors});
    assert.ok(state.installed, 'The new instrument state is exported to the real update loop');
    assert.equal(state.ringCount, 3); assert.equal(state.oldCones, 0); assert.equal(state.lights, 0);
    assert.deepEqual(state.position, [0,state.plinthTop,0]);
    assert.ok(state.size[0]<2.75&&state.size[2]<2.75);
    // A tumbling band tops out lower than an upright one, so the height is
    // measured over the whole cycle instead of at a single frame.
    assert.ok(state.cycle.every(s=>s.span<2.75&&s.top<3.5),'The turning bands stay inside the plinth footprint and under the ceiling line');
    assert.ok(Math.max(...state.cycle.map(s=>s.top))>3.2,'The instrument still fills the hall at some phase of its cycle');
    assert.deepEqual(state.period, { outer: 20, middle: 40, inner: 60, core: 10 });
    // A quiet core: the glow holds steady, nothing else in the exhibit glows,
    // and the floor's catch-light is additive rather than a light source.
    assert.ok(state.glow.steady, 'The crystal glow is being animated again');
    assert.equal(state.glow.glowMeshes, 2, 'Only the glass shell and its kernel glow');
    assert.ok(state.glow.kernelKernel, 'The inner layer is the brighter one');
    assert.ok(state.glow.shine && state.glow.shineAdditive, 'The floor emblem keeps its lit metal wire');
    assert.ok(state.glow.shineOpacity > 0 && state.glow.shineOpacity <= .25, 'The floor catch-light stays a whisper');
    // Two comet arcs, one per driven band, each hanging off that band's axle.
    for (const [key, parent] of [['outer', 'armillary-spin-outer'], ['middle', 'armillary-gimbal']]) {
      const t = state.trails[key];
      assert.ok(t, `The ${key} band has lost its trail`);
      assert.equal(t.parent, parent, `The ${key} trail no longer rides its own band`);
      assert.equal(t.tris, 840, 'A trail is one short tube, not a second ring');
      assert.ok(t.tube, 'The trail is a closed tube, so it keeps its width when the band turns edge-on');
      assert.ok(t.additive && t.depthWrite === false, 'The trail adds light and writes no depth');
      const rim = state.config.radii[key === 'outer' ? 0 : 1] + state.config.band / 2;
      assert.ok(t.radius > rim && t.radius < rim + .2, 'The trail rides just outside the machined rim');
      assert.ok(t.onArc, 'The trail stays on its arc instead of drifting off the band');
    }
    assert.ok(state.trailMoved, 'The trails follow the band they are mounted on');
    assert.ok(state.rotation.every((r,i)=>Math.abs(r-state.expectedHalf[i])<1e-9),'Every band turns on its own axle at its own period');
    assert.ok(state.cycle.every(s=>s.still&&s.nested&&s.coreClear&&s.supportClear&&s.delta.every((d,k)=>Math.abs(d-s.expected[k])<1e-9)),'The support stays fixed, the axles stay nested and the 120 s cycle clears the crystal and the sight line');
    // A tumbling hoop of this size crosses the high sight line to the reading
    // room sign at some phases; the label has to stay readable for most of the
    // cycle, which is what this counts.
    const open = [0,1,2].map(k=>state.cycle.filter(s=>s.signClear[k]).length);
    assert.ok(open.every(n=>n>=12),'The library sign stays readable for at least half of the ring cycle');
    // A turn about a diametral axle moves each band inside a fixed radial
    // shell, so disjoint shells prove the three hoops can never touch.
    const r = state.config.radii, w = state.config.band, reach = i => [r[i]-w*(i===0?0.5:i===1?0.47:0.44)-.01, r[i]+w*(i===0?0.5:i===1?0.47:0.44)+.01];
    assert.ok(reach(2)[1]<reach(1)[0]&&reach(1)[1]<reach(0)[0],'Each band sweeps its own radial shell, so no two hoops can ever meet');
    assert.deepEqual(state.conflicts,[]);assert.ok(state.clear&&state.routes.every(r=>r.path));assert.equal(state.signBlocked,false);
    assert.ok(state.crossing.x>2&&Math.abs(state.crossing.y)<.05&&state.crossing.peak<=state.plinthTop+.01,'Both low tiers and the crossing remain usable');
    assert.deepEqual(state.portals,[['writing',11,0],['friends',-5.5,6.4],['about',-5.5,-6.4]]);
    const view=async(position,look,file)=>{
      await page.evaluate(({position,look})=>{__home.player.teleport(-4,2);__home.rig.showcase(position,look);for(let i=0;i<100;i++)__home.rig.update(1/60,__home.player)},{position,look});
      await page.waitForTimeout(220);await page.screenshot({path:`${out}/${viewport.width}-${file}.png`});
    };
    await view([-5.4,3.1,5.5],[0,1.5,0],'detail');
    await view([-6.5,2.3,1.5],[0,1.7,0],'front');
    await view([-13,1.7,0],[11,2.2,0],'entrance');
    await view([-9,7,9],[1,0,0],'hall');
    assert.deepEqual(errors,[]);await context.close();
  }
} finally { await browser.close(); writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)); }
console.log('Armillary replacement, real animation, compact bounds, library visibility and navigation passed at desktop/narrow widths.');
