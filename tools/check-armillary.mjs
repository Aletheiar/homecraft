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
      // The light is a shader torus hanging off its turning group: it must ride
      // the real pose, keep its own phase uniform, and outrun the brass.
      const trailOf=n=>h.stage.scene.getObjectByName(n);
      const outerTrail=trailOf('armillary-trail-outer'),middleTrail=trailOf('armillary-trail-middle');
      const trailState=(n,key,spinPeriod)=>{
        const m=trailOf(n),g=m?.geometry,p=m?.parent,u=m?.material?.uniforms;
        if(!m||!g||!p||!u)return null;
        const box=new THREE.Box3().setFromBufferAttribute(g.getAttribute('position'));
        const size2=box.getSize(new THREE.Vector3());
        return {parent:p.name,period:m.userData.period,head:u.uHead.value,span:u.uSpan.value,
          shader:m.material.isShaderMaterial===true,additive:m.material.blending===THREE.AdditiveBlending,
          depthWrite:m.material.depthWrite,depthTest:m.material.depthTest,
          singlePass:m.material.forceSinglePass===true,renderOrder:m.renderOrder,
          radius:+m.userData.centreline.toFixed(4),tris:g.index.count/3,
          widest:+Math.max(size2.x,size2.y,size2.z).toFixed(4),outruns:m.userData.period<spinPeriod};};
      const trailSpec=h.worldExhibitTrails||null;
      const trails={outer:trailState('armillary-trail-outer','outer',20),middle:trailState('armillary-trail-middle','middle',40)};
      // Acceptance (1): freeze the mechanical turn and the light must keep going.
      const spinOf=n=>h.stage.scene.getObjectByName(n).rotation;
      const ringZ=spinOf('armillary-spin-outer').z;
      const headBefore=outerTrail.material.uniforms.uHead.value;
      for(let i=0;i<6;i++){h.world.exhibit.update(1/6);spinOf('armillary-spin-outer').z=ringZ;}
      const frozenStep=((outerTrail.material.uniforms.uHead.value-headBefore)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
      const frozenRingHeld=spinOf('armillary-spin-outer').z===ringZ;
      // Acceptance (2): with the turn running, both advance, and the light is
      // faster. Sampled over a whole lap so a seam would show up as a jump.
      const lapSteps=[];
      const head0=outerTrail.material.uniforms.uHead.value, ring0=spinOf('armillary-spin-outer').z;
      for(let i=0;i<16;i++){
        h.world.exhibit.update(.5);
        lapSteps.push({head:outerTrail.material.uniforms.uHead.value,ring:spinOf('armillary-spin-outer').z});
      }
      const wrap=a=>((a%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
      let seamOk=true;
      for(let i=1;i<lapSteps.length;i++){
        const d=wrap(lapSteps[i].head-lapSteps[i-1].head);
        if(Math.abs(d-Math.PI*2/4*.5)>1e-6)seamOk=false;
      }
      const flow={frozenRingHeld,frozenStep,lap:lapSteps.length,seamOk,
        headAdvanced:wrap(lapSteps[lapSteps.length-1].head-head0)>0,
        ringAdvanced:wrap(lapSteps[lapSteps.length-1].ring-ring0)>0,spec:trailSpec};
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
      return {installed:true,position:group.position.toArray(),plinthTop:HALL_EXHIBIT_TOP,core:core.getWorldPosition(new THREE.Vector3()).toArray(),size:size.toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},rotation,expectedHalf,cycle,period,config:{radii:HALL_EXHIBIT.armillary.radii,band:HALL_EXHIBIT.armillary.band},ringCount:support.userData.ringCount,glow,trails,flow,triangles,conflicts,clear,routes,signBlocked,crossing,oldCones,lights,portals:h.world.portals.map(g=>[g.id,g.x,g.z]),stats:h.stats()};
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
    // One travelling light per driven band: a full-lap shader tube that adds
    // light, keeps its own phase, and outruns the brass it rides on.
    for (const [key, parent] of [['outer', 'armillary-spin-outer'], ['middle', 'armillary-gimbal']]) {
      const t = state.trails[key];
      assert.ok(t, `The ${key} band has lost its light`);
      assert.equal(t.parent, parent, `The ${key} light no longer rides its own band`);
      assert.ok(t.shader, 'The fade is computed per fragment, so the tail tracks the head');
      assert.ok(t.additive && t.depthWrite === false && t.depthTest === true, 'The light adds without writing depth but still hides behind the metal');
      assert.ok(t.singlePass, 'One draw per light');
      assert.equal(t.renderOrder, 2);
      assert.equal(t.tris, 128 * 5 * 2);
      const diag = 2 * (t.radius + .026);
      assert.ok(Math.abs(t.widest - diag) < .06, 'The tube runs the whole circumference, so it can lap the band');
      const rim = state.config.radii[key === 'outer' ? 0 : 1] + state.config.band / 2;
      assert.ok(t.radius > rim && t.radius < rim + .2, 'The light rides just outside the machined rim');
      assert.ok(t.outruns, `The ${key} light laps faster than its ${key === 'outer' ? 20 : 40} s turn`);
      assert.ok(t.span > 0.5 && t.span < 1.4, 'The lit stretch is a short arc, well under half the ring, not a glowing hoop');
    }
    // Acceptance (1)-(4): the light moves while the ring is held, both advance
    // when it runs, and one full lap has no seam jump.
    assert.ok(state.flow.frozenRingHeld, 'The ring can be held still');
    assert.ok(Math.abs(state.flow.frozenStep - Math.PI / 2) < 1e-6, 'The light keeps lapping the band while the ring is stopped');
    assert.ok(state.flow.headAdvanced && state.flow.ringAdvanced, 'Light and brass both advance once the turn resumes');
    assert.ok(state.flow.seamOk, 'The light wraps the 0/360 seam without a jump or a flicker');
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
