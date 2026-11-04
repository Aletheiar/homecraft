import * as THREE from 'three';
import { canvasTexture } from '@engine/world/textures.js';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';
import { PROFILE } from '../about/profile.js';

const METAL = { tex: 'black_metal', tint: 0x69757d };
const EDGE = { tex: 'paint', tint: 0x343f48 };
const DARK = { tex: 'paint', tint: 0x171d24 };
const RUBBER = { tex: 'rubber', tint: 0x464f56 };
const CYAN = { tex: 'paint', tint: 0x5bc5bd, emissive: .65 };
const WOOD = { tex: 'walnut' };

// A single static atlas serves all three displays and the equipment plate.
// The terminal and telemetry are explicitly simulated, never live host data.
function screenAtlas() {
  return canvasTexture(1536, 640, ctx => {
    const text = (s, x, y, size = 22, color = '#88cabe') => {
      ctx.font = `${size}px monospace`; ctx.fillStyle = color; ctx.fillText(s, x, y);
    };
    const rect = (x,y,w,h,c) => { ctx.fillStyle=c;ctx.fillRect(x,y,w,h); };
    rect(0,0,1536,640,'#101b23');
    for (let i=0;i<3;i++) {
      rect(i*512+12,12,488,6,'#56c5ba');
      text(['GITHUB / ALETHEIAR','TERMINAL / SIMULATION','HARDWARE / SIMULATION'][i],i*512+24,55,22,'#d6e5e3');
      rect(i*512+24,76,464,2,'#34444c');
    }
    text('REPOSITORIES',24,117,28,'#edf3ee');
    text('Aletheiar / personal workspace',24,151,19);
    ['homecraft','research notes','experiments'].forEach((s,i)=>{
      rect(24,176+i*85,464,69,'#1c2b34');
      text('> '+s,40,204+i*85,23,'#b2ded5');
      text(i===0?'Three.js / voxel world':'code / ideas / exploration',40,230+i*85,17,'#8d9fa7');
    });
    text('OPEN GITHUB PROFILE  >',24,475,23,'#e5bd77');
    ['$ whoami','aletheiar','$ system status','system online','render node ... ready','secure link ... standby','workspace / local','', '> awaiting input _'].forEach((s,i)=>text(s,536,122+i*38,23,i===3?'#d5ecd3':'#79c9b4'));
    ['CPU','MEMORY','NETWORK'].forEach((s,i)=>{
      text(s,1048,126+i*100,24,'#c9d9dc');
      rect(1048,146+i*100,454,22,'#293943');
      for(let k=0;k<[7,11,5][i];k++)rect(1052+k*30,150+i*100,23,14,i===2?'#cda564':'#64b9b0');
    });
    text('NODE 07 / RACK 03',1048,439,21);
    text('DECORATIVE DEMO / NO LIVE DATA',1048,478,19,'#d1ad71');
    rect(0,516,512,124,'#243039');
    text('N // 01    PRIVATE WORKSTATION',18,563,22,'#b7d8d1');
    text('GITHUB  /  ALETHEIAR',18,607,28,'#e0b66d');
  });
}

export function buildWorkstation({ deskX: x, deskZ: z, chairZ, approach }, { box, solid }) {
  const mesh = new THREE.Group(); mesh.name = 'hall-workstation';
  const b = (dx,y,dz,w,h,d,mat=METAL,opts={}) => box(x+dx,y,z+dz,w,h,d,mat,{...opts,tag:'workstation'});
  // A thin local mat defines the corner without adding a step or collider.
  b(-.55,.008,.35,4.8,.012,2.5,RUBBER);
  b(0,.71,0,3.2,.075,1.12,METAL);
  b(0,.68,0,3.28,.035,1.17,EDGE);
  b(0,.75,.552,3.06,.017,.012,CYAN);
  b(0,.786,.1,2.54,.012,.74,DARK);
  for(const dx of [-1.43,1.43]) {
    b(dx,.02,0,.14,.66,.95,METAL);
    b(dx,.05,.04,.25,.045,1.1,EDGE);
    b(dx,.69,0,.23,.025,1.07,WOOD);
  }
  b(0,.25,-.46,2.9,.12,.09,EDGE);
  solid(x,z,3.28,1.17);
  // Rear gantry and three short monitor arms, entirely below the glass slope.
  for(const dx of [-1.4,1.4])b(dx,.79,-.48,.075,.99,.075,METAL);
  b(0,1.72,-.48,2.88,.06,.075,EDGE);
  b(0,1.01,-.49,2.6,.07,.07,METAL);
  const screens = [
    {id:'main',dx:0,y:1.32,dz:-.31,width:1.12,height:.7,yaw:0},
    {id:'terminal',dx:-1.02,y:1.30,dz:-.24,width:.72,height:.58,yaw:.2},
    {id:'status',dx:1.02,y:1.30,dz:-.24,width:.72,height:.58,yaw:-.2},
  ];
  const panels=[];
  for(let i=0;i<screens.length;i++) {
    const s=screens[i];
    b(s.dx,.8,-.46,.07,.46,.065,EDGE);
    b(s.dx,1.22,-.43,.065,.065,.08,METAL);
    b(s.dx,s.y-s.height/2-.035,s.dz-.038,s.width+.07,s.height+.07,.065,DARK,{ry:s.yaw});
    const g=new THREE.PlaneGeometry(s.width,s.height);
    const uv=g.attributes.uv;
    for(let j=0;j<uv.count;j++)uv.setXY(j,(uv.getX(j)+i)/3,.2+uv.getY(j)*.8);
    g.rotateY(s.yaw);g.translate(x+s.dx,s.y,z+s.dz);
    panels.push(g);s.position=new THREE.Vector3(x+s.dx,s.y,z+s.dz);
  }
  // Equipment number on the desktop edge, sharing the screen atlas.
  b(1.01,.795,.46,.5,.17,.026,EDGE);
  const plate=new THREE.PlaneGeometry(.48,.15),puv=plate.attributes.uv;
  for(let j=0;j<puv.count;j++)puv.setXY(j,puv.getX(j)/3,puv.getY(j)*.19);
  plate.translate(x+1.01,.88,z+.475);panels.push(plate);
  const displays = new THREE.Mesh(mergeGeometries(panels),new THREE.MeshBasicMaterial({map:screenAtlas()}));
  panels.forEach(g=>g.dispose());displays.name='workstation-screens';mesh.add(displays);
  // Full key rows, spacebar, mouse and stepped headphone headband.
  b(-.25,.8,.22,1.02,.035,.3,EDGE);
  for(let row=0;row<4;row++)for(let col=0;col<15;col++)
    b(-.71+col*.066,.837,.115+row*.063,.05,.016,.043,col===0?CYAN:{tex:'paint',tint:0x879b9b});
  b(-.24,.837,.36,.4,.016,.033,RUBBER);
  b(.51,.803,.23,.38,.009,.38,RUBBER);
  b(.51,.815,.22,.105,.045,.16,EDGE);b(.51,.858,.19,.012,.01,.06,CYAN);
  for(const dx of [-1.38,-1.08])b(dx,.82,.1,.085,.18,.15,RUBBER);
  b(-1.23,1.04,.1,.25,.045,.055,EDGE);
  for(const dx of [-1.36,-1.1])b(dx,.98,.1,.045,.07,.055,EDGE);
  // Ventilated PC below the table, and a separate short rack on its west side.
  b(.98,.06,-.02,.4,.58,.67,DARK);
  b(.98,.065,.32,.43,.58,.035,EDGE);
  for(let i=0;i<7;i++)b(.98,.15+i*.055,.343,.31,.015,.009,RUBBER);
  b(1.17,.12,.343,.014,.43,.01,CYAN);
  b(-2.05,.03,-.08,.7,1.18,.79,DARK);solid(x-2.05,z-.08,.7,.79);
  for(const dx of [-2.37,-1.73])b(dx,.07,.33,.045,1.09,.05,EDGE);
  for(let i=0;i<4;i++) {
    b(-2.05,.13+i*.255,.327,.56,.21,.038,EDGE);
    for(let j=0;j<5;j++)b(-2.12+j*.055,.17+i*.255,.35,.018,.11,.012,DARK);
    b(-1.84,.195+i*.255,.35,.03,.027,.013,CYAN);
  }
  // Exposed cables follow angular routes; no curved high-poly tubing.
  for(const [i,mat] of [[0,RUBBER],[1,CYAN]]) {
    b(-.55,.84,-.51-i*.04,1.65,.025,.025,mat);
    b(-1.36,.29,-.51-i*.04,.025,.55,.025,mat);
    b(-1.67,.29,-.51-i*.04,.64,.025,.025,mat);
  }
  // The dark chair stays at the existing seat anchor and leaves the approach open.
  const cz=chairZ-z;
  b(-.15,.42,cz,.6,.1,.56,RUBBER);
  b(-.15,.15,cz,.1,.27,.1,METAL);
  b(-.15,.07,cz,.69,.06,.12,EDGE);b(-.15,.07,cz,.12,.06,.67,EDGE);
  for(const dx of [-.45,.15]) { b(dx,.4,cz,.045,.27,.045,METAL);b(dx,.65,cz-.04,.07,.045,.43,RUBBER); }
  b(-.15,.52,cz+.26,.58,.57,.1,EDGE);
  b(-.15,.59,cz+.2,.44,.38,.025,RUBBER);
  for(const dx of [-.43,.13])for(const dz of [-.26,.26])b(dx,.02,cz+dz,.09,.06,.09,DARK);
  solid(x-.15,chairZ,.72,.74);
  // A small stack of books preserves the personal, inhabited character.
  for(let i=0;i<3;i++)b(-1.21,.8+i*.045,.38,.37,.04,.22,{tex:'paint',tint:[0x987753,0x536d70,0xb2a78c][i]});
  // Only a few small LEDs pulse. No dynamic textures or additional light sources.
  const lamps=[];
  for(let i=0;i<4;i++) {
    const g=new THREE.BoxGeometry(.035,.028,.012);g.translate(x-1.91,.23+i*.255,z+.356);lamps.push(g);
  }
  const leds=new THREE.Mesh(mergeGeometries(lamps),new THREE.MeshBasicMaterial({color:0xd4a45d,transparent:true,opacity:.7}));
  lamps.forEach(g=>g.dispose());leds.name='workstation-status-leds';mesh.add(leds);
  const main=screens[0],hotspot={id:'workbench',box:new THREE.Box3(
    new THREE.Vector3(main.position.x-main.width/2,main.position.y-main.height/2,main.position.z-.006),
    new THREE.Vector3(main.position.x+main.width/2,main.position.y+main.height/2,main.position.z+.006))};
  // The engine's broad-phase box alone sees through furniture. Test the two
  // real, tilted auxiliary housings in their local coordinates before accepting
  // a main-screen ray; the same predicate is used by hover and native clicks.
  const housings=screens.slice(1).map(s=>({
    inverse:new THREE.Matrix4().makeRotationY(s.yaw).setPosition(s.position.x,s.y,s.position.z-.038).invert(),
    bounds:new THREE.Box3(new THREE.Vector3(-(s.width+.07)/2,-(s.height+.07)/2,-.0325),
      new THREE.Vector3((s.width+.07)/2,(s.height+.07)/2,.0325)),
  }));
  const localRay=new THREE.Ray(),point=new THREE.Vector3();
  hotspot.hitTest=ray=>{
    if(ray.direction.z>=0||!ray.intersectBox(hotspot.box,point))return false;
    const mainDistance=point.distanceToSquared(ray.origin);
    for(const housing of housings){
      localRay.copy(ray).applyMatrix4(housing.inverse);
      if(localRay.intersectBox(housing.bounds,point)&&point.distanceToSquared(localRay.origin)<mainDistance)return false;
    }
    return true;
  };
  let elapsed=0;
  return {mesh,screens,hotspot,approach,href:PROFILE.accounts.find(a=>a.id==='github').href,
    update(dt){if(!mesh.visible||dt<=0)return;elapsed=(elapsed+dt)%20;leds.material.opacity=.62+.2*Math.sin(elapsed*Math.PI/2.5);}};
}

// Hover augments the existing click/data-link path, without replacing player input.
export function attachWorkstationControls(station,{stage,rig,player}) {
  const canvas=stage.renderer.domElement,tip=document.querySelector('#tooltip');
  const panel=document.querySelector('#panel'),map=document.querySelector('#bigmap');
  const page=document.querySelector('[data-station="workbench"]');
  page.dataset.link=station.href;
  page.querySelector('a').href=station.href;
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
  let px=-1,py=-1,ownsTip=false;
  const hide=()=>{if(ownsTip){tip.hidden=true;canvas.style.cursor='';ownsTip=false;}};
  canvas.addEventListener('pointermove',e=>{px=e.clientX;py=e.clientY;if(e.buttons){px=-1;hide();}});
  canvas.addEventListener('pointerleave',()=>{px=-1;hide();});
  canvas.addEventListener('pointerdown',hide);
  return {update(){
    if(px<0||rig.introActive||panel.open||!map.hidden){hide();return;}
    ndc.set(px/innerWidth*2-1,-(py/innerHeight)*2+1);ray.setFromCamera(ndc,stage.camera);
    // Positive normal is the chair/hall side; back faces are not an invitation.
    if(!station.hotspot.hitTest(ray.ray)
      ||Math.min(Math.hypot(player.pos.x-station.screens[0].position.x,player.pos.z-station.screens[0].position.z),
        Math.hypot(player.pos.x-station.approach[0],player.pos.z-station.approach[1]))>=2.6){hide();return;}
    tip.textContent='访问 GitHub ↗';tip.hidden=false;ownsTip=true;canvas.style.cursor='pointer';
    tip.style.left=`${Math.min(innerWidth-tip.offsetWidth-8,Math.max(8,px-tip.offsetWidth/2))}px`;
    tip.style.top=`${Math.max(8,py-tip.offsetHeight-16)}px`;
  }};
}
