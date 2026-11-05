import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: new URL('../vendor/three/three.module.min.js', import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith('@engine/')) return { url: new URL('../engine/' + specifier.slice(8), import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith('@world/')) return { url: new URL('../world/' + specifier.slice(7), import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
// The room paints its screen atlas on a canvas and loads two poster images; a
// node test only needs the objects, never the pixels.
const context = () => ({
  clearRect() {}, fillRect() {}, fillText() {}, beginPath() {}, arc() {}, moveTo() {}, lineTo() {},
  closePath() {}, stroke() {}, fill() {}, scale() {}, save() {}, restore() {}, translate() {},
  createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }),
});
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: context }),
  createElementNS: () => ({ style: {}, src: '', width: 1, height: 1, addEventListener() {}, removeEventListener() {}, setAttribute() {} }),
};
const { furnishHall } = await import('../world/furnish.js');
const { HALL_SPOTS } = await import('../world/space-config.js');
const { LIGHT_MODES } = await import('../world/workstation.js');
const THREE = await import('three');
const { PYRAMID } = await import('../world/boundaries.js');
const hall = furnishHall({ walnut: 0, paint: 1, plaster: 2, bookshelf: 3, travertine: 4, linen: 5, terracotta: 6, leaves: 7, black_metal: 8, deepslate: 9 });
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ws = hall.workstation;
const fixture = id => ws.fixtures.find(f => f.id === id);

test('the complete workstation opens diagonally towards the central armillary', () => {
  const hero=ws.mesh.getObjectByName('poster-pyramid');ws.mesh.updateMatrixWorld(true);
  const normal=new THREE.Vector3(0,0,1).transformDirection(hero.matrixWorld);
  const position=hero.getWorldPosition(new THREE.Vector3());
  const angle=Math.atan2(normal.x,normal.z);
  assert.ok(angle<=-25*Math.PI/180&&angle>=-35*Math.PI/180,'the front turns 25–35 degrees towards the centre');
  const towardCentre=new THREE.Vector3(-position.x,0,-position.z).normalize();
  assert.ok(normal.dot(towardCentre)>.95,'the main image opens towards the central instrument');
  assert.ok(position.x>10&&position.z<-10,'the workstation stays in the north-east corner');
  const screenNormal=new THREE.Vector3(Math.sin(ws.screens[0].yaw),0,Math.cos(ws.screens[0].yaw));
  assert.ok(screenNormal.distanceTo(normal)<1e-6,'the screen and backdrop turn together');
  assert.ok(ws.seat.x<HALL_SPOTS.workbench.deskX,'the chair follows the diagonal front');
  const heading=new THREE.Vector3(Math.sin(ws.faceDesk),0,Math.cos(ws.faceDesk));
  assert.ok(heading.dot(normal)<-.98,'the seated visitor looks back towards the diagonal desk');
});

test('the composition has a large central hero image and a separate angled side wing', () => {
  const posters=ws.mesh.getObjectByName('workstation-posters');
  const hero=posters.getObjectByName('poster-pyramid'),side=posters.getObjectByName('poster-v');
  assert.ok(hero.geometry.parameters.width>=3.15,'the hero is substantially wider than the former 2.05 m print');
  assert.ok(hero.geometry.parameters.width/ws.layout.wall.width>=.55&&hero.geometry.parameters.width/ws.layout.wall.width<=.7);
  assert.ok(Math.abs(side.rotation.y)>=Math.PI/4,'V belongs on a real side-facing structure');
  assert.ok(side.position.z-hero.position.z>.8,'the side accent sits forward of the backdrop');
  assert.ok(hero.position.y-hero.geometry.parameters.height/2>1.8,'the large print clears the monitor gantry');
  const heroLocal=ws.toLocal(hero.getWorldPosition(new THREE.Vector3())),screenLocal=ws.toLocal(ws.screens[0].position);
  assert.ok(Math.abs(heroLocal.x-screenLocal.x)<.2,'hero and desk share the frontal centre');
  assert.ok(screenLocal.z-heroLocal.z>.85,'the working layer is separated from the background');
  assert.ok(ws.toLocal(fixture('rack').box.getCenter(new THREE.Vector3())).z>.4,'equipment projects forward at the side');
});

test('screen selection follows its real tilted face and rejects the rear', () => {
  for (const s of ws.screens) {
    const normal=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),s.yaw);
    const origin=s.position.clone().addScaledVector(normal,2),out=new THREE.Vector3();
    assert.equal(fixture(s.id).intersect(new THREE.Ray(origin,normal.clone().negate()),out),true);
    assert.ok(out.distanceTo(s.position)<1e-6);
    assert.equal(fixture(s.id).intersect(new THREE.Ray(s.position.clone().addScaledVector(normal,-2),normal),out),false);
    origin.x+=s.width*2;
    assert.equal(fixture(s.id).intersect(new THREE.Ray(origin,normal.clone().negate()),out),false);
  }
});

test('poster previews follow the real front and turned side faces', () => {
  for(const id of ['poster-pyramid','poster-v']){
    const p=ws.mesh.getObjectByName(id),normal=new THREE.Vector3(0,0,1).transformDirection(p.matrixWorld),position=p.getWorldPosition(new THREE.Vector3());
    const out=new THREE.Vector3();
    assert.equal(fixture(id).intersect(new THREE.Ray(position.clone().addScaledVector(normal,2),normal.clone().negate()),out),true);
    assert.ok(out.distanceTo(position)<1e-6);
    assert.equal(fixture(id).intersect(new THREE.Ray(position.clone().addScaledVector(normal,-2),normal),out),false);
  }
});

test('all workstation geometry fits under the glass and physical objects block walks', () => {
  const unit=new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5));
  const verify=(b,name)=>{
    const r=Math.max(Math.abs(b.min.x),Math.abs(b.max.x),Math.abs(b.min.z),Math.abs(b.max.z));
    assert.ok(b.max.y+.15<PYRAMID.height*(1-r/PYRAMID.half),`${name} clears the sloped glass`);
  };
  for(const item of hall.batches.hall.items.opaque.filter(i=>i.tag==='workstation'))verify(unit.clone().applyMatrix4(item.matrix),'batched box');
  ws.mesh.updateMatrixWorld(true);
  ws.mesh.traverse(o=>{if(o.isMesh){
    const a=o.geometry.attributes.position,v=new THREE.Vector3();
    for(let i=0;i<a.count;i++){
      v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);
      assert.ok(v.y+.15<PYRAMID.height*(1-Math.max(Math.abs(v.x),Math.abs(v.z))/PYRAMID.half),`${o.name} vertex clears the sloped glass`);
    }
  }});
  const blocks=p=>hall.obstacles.some(o=>p.x>=o.x0&&p.x<=o.x1&&p.z>=o.z0&&p.z<=o.z1);
  assert.ok(blocks(ws.at(-.15,1.36)),'the actual chair back blocks walking');
  assert.ok(blocks(ws.at(-.5,-1.38)),'the industrial wall blocks walking');
  assert.ok(blocks(ws.at(2.2,.45)),'the side equipment blocks walking');
  assert.equal(blocks(ws.stand),false,'the exit point lies outside every furniture footprint');
  assert.equal(blocks(ws.at(1,1)),false,'empty wedges around the turned desk have no giant box collider');
});

test('the relocated bookshelf is clear of the deeper industrial backdrop', () => {
  const unit=new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5));
  const items=hall.batches.hall.items.opaque;
  const shelf=items.filter(i=>i.tag!=='workstation'&&Math.abs(i.matrix.elements[12]-HALL_SPOTS.workbench.shelfX)<1e-6&&Math.abs(i.matrix.elements[14]-HALL_SPOTS.workbench.shelfZ)<1e-6);
  assert.equal(shelf.length,3);
  for(const s of shelf)for(const w of items.filter(i=>i.tag==='workstation')){
    const overlap=unit.clone().applyMatrix4(s.matrix).intersect(unit.clone().applyMatrix4(w.matrix));
    const size=overlap.getSize(new THREE.Vector3());
    assert.ok(Math.min(size.x,size.y,size.z)<.035,'the shelf does not penetrate a wall panel or frame');
  }
});

test('the two planters behind the workstation are removed with their footprints', () => {
  const items=hall.batches.hall.items.opaque;
  const removed=[ws.at(-4,-1.4),{x:11.6,z:-15.3}];
  for(const p of removed){
    assert.equal(items.filter(i=>Math.abs(i.matrix.elements[12]-p.x)<1e-6&&Math.abs(i.matrix.elements[14]-p.z)<1e-6).length,0,'no pot or foliage remains behind the screen');
    assert.equal(hall.obstacles.some(o=>Math.abs((o.x0+o.x1)/2-p.x)<1e-6&&Math.abs((o.z0+o.z1)/2-p.z)<1e-6),false,'the removed planter leaves no collision footprint');
  }
  for(const [x,z] of [[15.3,13.4],[11,-2.9],[11,2.9]])
    assert.equal(items.filter(i=>Math.abs(i.matrix.elements[12]-x)<1e-6&&Math.abs(i.matrix.elements[14]-z)<1e-6).length,2,'the lounge and library planters stay in place');
});

test('the corner is one walkable room with the desk where the hall expects it', () => {
  assert.equal(ws.href, 'https://github.com/Aletheiar');
  assert.deepEqual(ws.screens.map(s => s.id), ['main', 'terminal', 'status']);
  // The three display anchors stay where the old single-screen desk put them,
  // so the engine hotspot, the seat and the hall layout keep working.
  const centre=ws.at(0,-.31);
  assert.ok(Math.abs(ws.screens[0].position.x-centre.x)<1e-9);
  assert.ok(Math.abs(ws.screens[0].position.z-centre.z)<1e-9);
  assert.equal(ws.screens[1].position.x < ws.screens[0].position.x, true);
  assert.equal(ws.screens[2].position.x > ws.screens[0].position.x, true);
  // Everything a visitor can touch has a label and a box in world space.
  for (const f of ws.fixtures) {
    assert.ok(f.box.min.x < f.box.max.x && f.box.min.y < f.box.max.y && f.box.min.z < f.box.max.z, `${f.id} box is positive`);
    if (f.id !== 'lights') assert.ok(f.label.length > 0, `${f.id} has a hint`);
  }
  assert.deepEqual(ws.fixtures.map(f => f.id), ['main', 'terminal', 'status', 'rack', 'poster-pyramid', 'poster-v', 'lights', 'seat']);
  // The seat sits behind the desk and the stand spot is clear of the chair.
  assert.ok(ws.seat.z > HALL_SPOTS.workbench.deskZ, 'the seat is south of the desk');
  assert.ok(ws.stand.z > ws.seat.z, 'the standing spot is behind the seat');
});

test('both official posters are real image planes on the wall', () => {
  const posters = ws.mesh.getObjectByName('workstation-posters');
  assert.ok(posters && posters.children.length === 2);
  const byName = Object.fromEntries(posters.children.map(m => [m.name, m]));
  for (const [name, file, ratio] of [['poster-pyramid', 'cyberpunk-pyramid.webp', 800 / 1280], ['poster-v', 'cyberpunk-v.webp', 540 / 960]]) {
    const plane = byName[name];
    assert.ok(plane, `${name} is in the scene`);
    assert.equal(plane.userData.file, file, `${name} loads its own official file`);
    assert.equal(plane.userData.credit, 'CD PROJEKT RED');
    assert.ok(plane.material.map, `${name} has a real texture`);
    assert.equal(plane.material.toneMapped, false, `${name} is not tone mapped down`);
    const { width, height } = plane.geometry.parameters;
    assert.ok(Math.abs(height / width - ratio) < 1e-6, `${name} keeps its original aspect ratio`);
    assert.match(index, new RegExp(`assets/posters/${file}`), `${name} also has its own page`);
  }
  // The big one is the focal point: clearly larger than the side poster.
  assert.ok(byName['poster-pyramid'].geometry.parameters.width > byName['poster-v'].geometry.parameters.width * 1.8);
});

test('the room owns five pages, one light switch and no extra lights', () => {
  for (const id of ['terminal', 'status', 'rack', 'poster-pyramid', 'poster-v']) {
    assert.match(index, new RegExp(`data-station="${id}"`), `${id} has a page card`);
  }
  // The terminal must say it is a simulation, and the rack must deny networking.
  assert.match(index, /模拟终端/);
  assert.match(index, /不执行系统命令/);
  assert.match(index, /没有网络连接/);
  assert.match(index, /CD PROJEKT RED/);
  assert.deepEqual(LIGHT_MODES.map(m => m.id), ['warm', 'night', 'off']);
  // The switch cycles the room's own material, never the pyramid's daylight.
  assert.equal(ws.lightMode, 'warm');
  ws.cycleLights();
  assert.equal(ws.lightMode, 'night');
  ws.cycleLights();
  assert.equal(ws.lightMode, 'off');
  ws.cycleLights();
  assert.equal(ws.lightMode, 'warm');
});
