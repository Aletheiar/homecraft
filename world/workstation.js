import * as THREE from 'three';
import { canvasTexture } from '@engine/world/textures.js';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';
import { PROFILE } from '../about/profile.js';

// The north-east corner is a self-contained industrial room inside the glass
// hall: a layered back wall, two framed official posters, a long desk with the
// triple display, a server rack, a marked floor and a warm/teal light set.
// Everything static is BoxBatch boxes, so the whole room costs one batch mesh
// plus four small meshes of its own: the screen atlas, the posters, the light
// strips and the rack indicators.
const METAL = { tex: 'black_metal', tint: 0x69757d };
const STEEL = { tex: 'black_metal', tint: 0x9aa6ae };
const EDGE = { tex: 'paint', tint: 0x2b343c };
const DARK = { tex: 'paint', tint: 0x171d24 };
const PANEL = { tex: 'paint', tint: 0x4a5560 };
const PLATE = { tex: 'paint', tint: 0x5d6975 };
const RUBBER = { tex: 'paint', tint: 0x4c565f };
const MAT = { tex: 'rubber', tint: 0x1d2127 };
const CYAN = { tex: 'paint', tint: 0x5bc5bd, emissive: .65 };
const WARN = { tex: 'paint', tint: 0xd8b13c };
const TEAL = { tex: 'paint', tint: 0x3f8d86 };
const RED = { tex: 'paint', tint: 0x9d3630 };
const WOOD = { tex: 'walnut' };

// Three decorative light settings. They only scale the emissive strips and the
// rack indicators this room owns; the pyramid's daylight is never recomputed.
export const LIGHT_MODES = [
  { id: 'warm', name: '暖黄 + 青色', gain: 1 },
  { id: 'night', name: '夜间增强', gain: 1.55 },
  { id: 'off', name: '灯光关闭', gain: 0 },
];

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
  // Wall plane: the front face the posters and conduits hang on.
  const wallZ = -.93, front = -.86;

  // ---- industrial back wall: a low full-width band with a taller centre
  // panel and two shorter shoulders, so daylight still shows at the corners ----
  b(-.5,0,wallZ,5.2,2.06,.14,PANEL);
  b(-.5,0,wallZ-.02,5.2,.1,.18,DARK);
  b(.05,2.06,wallZ,2.9,1.09,.14,PANEL);
  b(-2.25,2.06,wallZ,1.5,.74,.14,PANEL);
  b(1.8,2.06,wallZ,.56,.56,.14,PANEL);
  for (const dx of [-2.25,.05,1.8]) b(dx,2.06,front-.02,.06,.05,.05,EDGE);
  // Seam ribs, a horizontal cable tray and a yellow warning band.
  for (const dy of [1.04,1.6]) b(-.5,dy,front-.012,5.2,.028,.028,EDGE);
  b(-.5,1.86,front-.03,4.9,.07,.09,EDGE);
  b(-.5,1.99,front-.006,5.2,.035,.012,WARN);
  // Vent bank on the right shoulder, power trunking on the left.
  for (let i=0;i<7;i++) b(1.42,.78+i*.086,front-.01,.9,.05,.05,RUBBER);
  b(1.42,.6,front-.015,.98,.72,.03,DARK);
  for (const dx of [1.36,1.48]) b(dx,2.3,front-.01,.06,.42,.07,EDGE);
  // Conduits in the two gaps between panels, clamped to the wall.
  for (const dx of [-1.44,1.5]) {
    b(dx,.12,front-.03,.052,2.92,.052,METAL);
    for (const dy of [.5,1.2,1.9]) b(dx,dy,front-.03,.09,.06,.09,EDGE);
  }
  // Bolted corner plates and a service hatch below the desk line.
  for (const dx of [-2.6,1.6]) for (const dy of [.16,1.92]) b(dx,dy,front-.008,.09,.09,.02,WARN);
  b(-.5,.12,front-.006,4.6,.06,.014,WARN);
  // Frame the slab so it reads as built structure, not a black billboard:
  // two edge columns, a steel cap and a plinth rail catch the hall's daylight.
  for (const dx of [-3.02,2.02]) {
    b(dx,.02,front-.01,.13,3.1,.17,EDGE);
    b(dx,.02,front+.005,.035,3.08,.02,STEEL);
    for (const dy of [.24,1.34,2.5]) b(dx,dy,front+.01,.17,.05,.03,PLATE);
  }
  b(-.5,3.12,front-.02,5.4,.09,.11,EDGE);
  b(-.5,3.12,front+.01,5.4,.02,.02,STEEL);
  b(-.5,.02,front+.005,5.24,.15,.05,PLATE);
  b(-.5,.15,front+.005,5.24,.018,.06,STEEL);
  // Two bolted service plates on the shoulders, and a hazard rail low on the wall.
  for (const [dx,dy,w,h] of [[-2.3,.86,.62,.34],[1.72,.9,.5,.28]]) {
    b(dx,dy,front+.002,w,h,.03,PLATE);
    b(dx,dy+h-.012,front+.006,w,.012,.02,STEEL);
    for (const ox of [-.24,.24]) b(dx+ox,dy+.06,front+.016,.03,.03,.02,STEEL);
  }
  b(-.5,.52,front+.002,4.9,.03,.02,WARN);
  // A cable run across the top cap, clamped every metre — the wall reads as
  // something that was wired up, not moulded in one piece.
  for (const [i,mat] of [[0,RUBBER],[1,DARK]]) {
    b(-.5,3.02-i*.05,front+.005,4.9,.03,.03,mat);
    for (const dx of [-2.3,-.9,.5,1.7]) b(dx,3.0-i*.05,front+.008,.05,.07,.05,STEEL);
  }

  // ---- two framed official posters on the wall ----
  const posters = [
    { id: 'poster-pyramid', dx: 0, y: 2.42, w: 2.05, h: 2.05 * 800 / 1280, file: 'cyberpunk-pyramid.webp' },
    { id: 'poster-v', dx: -2.25, y: 2.42, w: 1.0, h: 1.0 * 540 / 960, file: 'cyberpunk-v.webp' },
  ];
  for (const p of posters) {
    const bottom = p.y - p.h / 2;
    for (const side of [-1, 1]) b(p.dx + side * (p.w / 2 + .04), bottom - .02, front - .03, .08, p.h + .1, .06, EDGE);
    b(p.dx, bottom - .06, front - .03, p.w + .24, .08, .06, EDGE);
    b(p.dx, bottom + p.h + .02, front - .03, p.w + .24, .08, .06, EDGE);
    b(p.dx, bottom - .07, front - .01, p.w + .24, .02, .02, WARN);
  }
  const posterMaterial = (file) => {
    const texture = new THREE.TextureLoader().load(`assets/posters/${file}`);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  };
  const posterGroup = new THREE.Group(); posterGroup.name = 'workstation-posters';
  for (const p of posters) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), posterMaterial(p.file));
    plane.name = p.id; plane.position.set(x + p.dx, p.y, z + front + .012);
    plane.userData = { file: p.file, credit: 'CD PROJEKT RED' };
    posterGroup.add(plane);
    p.mesh = plane;
  }
  mesh.add(posterGroup);

  // ---- the marked floor: a dark mat, yellow edge tape and red markings.
  // 12 mm above the paving so nothing z-fights, and no collider of its own. ----
  b(-.1,.026,.22,4.34,.012,2.3,MAT);
  for (const dz of [-.92,.92]) b(-.1,.038,.22+dz,4.3,.004,.06,WARN);
  for (const dx of [-2.17,1.97]) b(dx,.038,.22,.06,.004,1.86,WARN);
  b(-.1,.038,-.62,2.5,.004,.1,RED);
  b(-.1,.038,-.5,2.5,.004,.03,RED);
  for (const dx of [-1.62,1.42]) b(dx,.038,-.34,.5,.004,.03,EDGE);

  // ---- desk: a long dark top on an industrial frame, with storage either side
  b(0,.71,0,3.5,.075,1.14,METAL);
  b(-.05,.68,0,3.58,.035,1.19,EDGE);
  b(0,.75,.565,3.34,.017,.012,CYAN);
  b(-.05,.786,.1,2.6,.012,.76,DARK);
  for(const dx of [-1.58,1.58]) {
    b(dx,.02,0,.14,.66,.97,METAL);
    b(dx,.05,.04,.25,.045,1.12,EDGE);
    b(dx,.69,0,.23,.025,1.09,WOOD);
  }
  b(0,.25,-.48,3.16,.12,.09,EDGE);
  solid(x,z,3.58,1.19);
  // Right drawer stack and a closed left cabinet.
  b(1.55,.02,-.06,.62,.68,.92,PANEL);
  for (let i=0;i<3;i++) {
    b(1.55,.14+i*.21,.41,.54,.17,.03,EDGE);
    b(1.55,.22+i*.21,.435,.16,.02,.012,WARN);
  }
  b(-1.62,.02,-.06,.5,.68,.92,PANEL);
  b(-1.62,.36,.41,.42,.44,.03,EDGE);
  b(-1.62,.56,.6,2.9,.03,.02,TEAL);
  // Hazard ticks on the desk lip and a plant on the right drawers so the corner
  // keeps some green life next to the glass.
  for (let i=0;i<6;i++) b(-1.32+i*.5,.735,.577,.16,.02,.012,WARN);
  b(1.55,.70,-.06,.24,.18,.24,{tex:'paint',tint:0x5a5148});
  b(1.55,.86,-.06,.2,.02,.2,RUBBER);
  for (const [dx,dz,h] of [[-.04,-.03,.3],[.03,.04,.24],[0,0,.38]]) b(1.55+dx,.88,-.06+dz,.11,h,.11,{tex:'paint',tint:0x4f7a4a});

  // Rear gantry and three short monitor arms, entirely below the glass slope.
  for(const dx of [-1.58,1.58])b(dx,.79,-.5,.075,.99,.075,METAL);
  b(0,1.72,-.5,3.2,.06,.075,EDGE);
  b(0,1.01,-.51,2.82,.07,.07,METAL);
  const screens = [
    {id:'main',dx:0,y:1.32,dz:-.31,width:1.12,height:.7,yaw:0},
    {id:'terminal',dx:-1.02,y:1.30,dz:-.24,width:.72,height:.58,yaw:.2},
    {id:'status',dx:1.02,y:1.30,dz:-.24,width:.72,height:.58,yaw:-.2},
  ];
  const panels=[];
  for(let i=0;i<screens.length;i++) {
    const s=screens[i];
    b(s.dx,.8,-.48,.07,.46,.065,EDGE);
    b(s.dx,1.22,-.45,.065,.065,.08,METAL);
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
  const displays = new THREE.Mesh(mergeGeometries(panels),new THREE.MeshBasicMaterial({map:screenAtlas(),toneMapped:false}));
  panels.forEach(g=>g.dispose());displays.name='workstation-screens';mesh.add(displays);

  // ---- a used desk: keyboard, mouse, mug, notebook, tools, hard case
  b(-.25,.8,.22,1.02,.035,.3,EDGE);
  for(let row=0;row<4;row++)for(let col=0;col<15;col++)
    b(-.71+col*.066,.837,.115+row*.063,.05,.016,.043,col===0?CYAN:{tex:'paint',tint:0x879b9b});
  b(-.24,.837,.36,.4,.016,.033,RUBBER);
  b(.51,.803,.23,.38,.009,.38,RUBBER);
  b(.51,.815,.22,.105,.045,.16,EDGE);b(.51,.858,.19,.012,.01,.06,CYAN);
  b(1.24,.795,.16,.1,.14,.1,{tex:'paint',tint:0x9fb0ad});
  b(1.24,.935,.16,.11,.02,.11,EDGE);
  b(1.24,.9,.16,.02,.06,.03,CYAN);
  b(-1.02,.795,.34,.42,.02,.3,{tex:'paint',tint:0x6c5a45});
  b(-1.02,.815,.34,.2,.01,.14,WARN);
  for(const dx of [-1.42,-1.12])b(dx,.82,.12,.085,.18,.15,RUBBER);
  b(-1.27,1.04,.12,.25,.045,.055,EDGE);
  for(const dx of [-1.4,-1.14])b(dx,.98,.12,.045,.07,.055,EDGE);
  b(1.9,.06,-.3,.34,.5,.6,WARN);
  b(1.9,.16,-.3,.36,.05,.62,EDGE);
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
  }
  // Rack detail: cooling grille, breakers, a power switch and a box on top.
  for (let i=0;i<8;i++) b(-2.05,1.02+i*.018,.35,.52,.012,.012,RUBBER);
  b(-2.05,1.2,-.08,.72,.09,.81,EDGE);
  b(-2.3,.28,.36,.12,.2,.03,PANEL);
  b(-2.3,.36,.375,.05,.05,.014,WARN);
  b(-1.92,1.31,-.08,.36,.16,.4,{tex:'paint',tint:0x4a5259});
  // Exposed cables follow angular routes; no curved high-poly tubing.
  for(const [i,mat] of [[0,RUBBER],[1,CYAN]]) {
    b(-.55,.86,-.53-i*.04,1.9,.025,.025,mat);
    b(-1.36,.29,-.53-i*.04,.025,.55,.025,mat);
    b(-1.67,.29,-.53-i*.04,.64,.025,.025,mat);
  }
  // The dark chair stays at the existing seat anchor and leaves the approach open.
  const cz=chairZ-z;
  b(-.15,.42,cz,.6,.1,.56,METAL);
  b(-.15,.15,cz,.1,.27,.1,METAL);
  b(-.15,.07,cz,.69,.06,.12,EDGE);b(-.15,.07,cz,.12,.06,.67,EDGE);
  for(const dx of [-.45,.15]) { b(dx,.4,cz,.045,.27,.045,METAL);b(dx,.65,cz-.04,.07,.045,.43,RUBBER); }
  b(-.15,.52,cz+.26,.58,.57,.1,EDGE);
  b(-.15,.59,cz+.2,.44,.38,.025,RUBBER);
  b(-.15,.93,cz+.26,.42,.02,.03,TEAL);
  for(const dx of [-.43,.13])for(const dz of [-.26,.26])b(dx,.02,cz+dz,.09,.06,.09,DARK);
  // Only the backrest blocks: the seat itself has to stay free, otherwise the
  // collision resolver keeps pushing a seated visitor out of their own chair.
  solid(x-.15,chairZ-.32,.62,.3);
  // A small stack of books preserves the personal, inhabited character.
  for(let i=0;i<3;i++)b(-1.21,.8+i*.045,.38,.37,.04,.22,{tex:'paint',tint:[0x987753,0x536d70,0xb2a78c][i]});
  // A yellow cable ramp and a red floor marking keep the mat from reading flat.
  b(-2.35,.026,.9,.62,.03,.2,WARN);
  b(-1.72,.026,.72,.05,.03,.36,RED);

  // ---- light set: one emissive mesh, vertex coloured, dimmed by one material
  const stripGeometries = [], stripColours = [];
  const strip = (dx, y, dz, w, h, d, hex) => {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x + dx, y + h / 2, z + dz);
    stripGeometries.push(g); stripColours.push(hex);
  };
  strip(-.5,3.02,front-.03,3.3,.05,.04,0xffb45e);      // wall cove
  strip(-2.25,2.9,front-.03,1.2,.04,.04,0xffb45e);     // shoulder cove
  strip(1.62,2.72,front-.03,.8,.04,.04,0xffb45e);
  strip(0,.72,.6,2.6,.035,.05,0x49d8c8);               // under-desk
  strip(-2.05,1.06,.36,.52,.04,.03,0xffc068);          // rack header
  strip(1.55,.62,.6,.5,.04,.03,0x49d8c8);              // drawer kick
  // Edge lighting: the corner sits in the pyramid's shade, so the structure is
  // read by a few self-lit lines rather than by another light source.
  strip(-3.02,1.9,front+.012,.05,.98,.03,0xffb45e);    // left column accent
  strip(2.02,1.9,front+.012,.05,.98,.03,0xffb45e);     // right column accent
  strip(-.5,.152,front+.022,5.2,.018,.018,0xffc068);   // plinth rail
  // The big poster is back-lit like the reference: a thin warm halo on its frame.
  const pp = posters[0], pb = pp.y - pp.h / 2;
  strip(pp.dx,pb-.05,front+.006,pp.w+.2,.016,.016,0xffcf7a);
  strip(pp.dx,pp.y+pp.h/2+.034,front+.006,pp.w+.2,.016,.016,0xffcf7a);
  strip(pp.dx-pp.w/2-.09,pb-.034,front+.006,.016,pp.h+.068,.016,0xffcf7a);
  strip(pp.dx+pp.w/2+.09,pb-.034,front+.006,.016,pp.h+.068,.016,0xffcf7a);
  strip(-2.39,.1,.33,.028,1.06,.028,0x49d8c8);         // rack side accents
  strip(-1.71,.1,.33,.028,1.06,.028,0x49d8c8);
  // The switch itself: three lamps, one per mode, lit by the light mesh.
  const switchPos = { dx: 1.62, y: 1.44 };
  b(switchPos.dx,switchPos.y,front-.02,.19,.26,.03,PANEL);
  for (let i=0;i<3;i++) b(switchPos.dx-.05+i*.05,switchPos.y+.06,front-.035,.026,.03,.02,i===0?WARN:EDGE);
  const lightGeometry = mergeGeometries(stripGeometries.map((g, i) => {
    const n = g.attributes.position.count, colour = new Float32Array(n * 3), c = new THREE.Color(stripColours[i]);
    for (let k = 0; k < n; k++) c.toArray(colour, k * 3);
    g.setAttribute('color', new THREE.BufferAttribute(colour, 3));
    const out = g.toNonIndexed(); g.dispose(); return out;
  }));
  stripGeometries.forEach(g => g.dispose());
  const lightMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const lights = new THREE.Mesh(lightGeometry, lightMaterial);
  lights.name = 'workstation-light-strips'; mesh.add(lights);

  // Rack indicators: their own tiny emissive mesh so a simulated boot can blink.
  const lampGeometries = [];
  for(let i=0;i<4;i++) {
    const g=new THREE.BoxGeometry(.035,.028,.012);g.translate(x-1.91,.23+i*.255,z+.356);lampGeometries.push(g);
  }
  for(let i=0;i<3;i++) {
    const g=new THREE.BoxGeometry(.02,.02,.01);g.translate(x-1.86,.2+i*.08,z+.356);lampGeometries.push(g);
  }
  const ledMaterial = new THREE.MeshBasicMaterial({ color: 0xd4a45d, transparent: true, opacity: .7, toneMapped: false });
  const leds=new THREE.Mesh(mergeGeometries(lampGeometries), ledMaterial);
  lampGeometries.forEach(g=>g.dispose());leds.name='workstation-status-leds';mesh.add(leds);

  // ---- interaction boxes, world space, one per thing a visitor can touch ----
  const half = s => s.width / 2;
  const box3 = (cx, y, cz, w, h, d) => new THREE.Box3(
    new THREE.Vector3(cx - w / 2, y - h / 2, cz - d / 2),
    new THREE.Vector3(cx + w / 2, y + h / 2, cz + d / 2));
  const main = screens[0];
  const hotspot = { id: 'workbench', box: new THREE.Box3(
    new THREE.Vector3(main.position.x-half(main), main.position.y-main.height/2, main.position.z-.006),
    new THREE.Vector3(main.position.x+half(main), main.position.y+main.height/2, main.position.z+.006)) };
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
  const fixtures = [
    { id: 'main', page: 'workbench', label: '访问 GitHub ↗', box: hotspot.box, precise: true },
    { id: 'terminal', page: 'terminal', label: '终端 · 模拟', box: box3(screens[1].position.x, screens[1].position.y, screens[1].position.z, .84, .7, .5) },
    { id: 'status', page: 'status', label: '系统状态', box: box3(screens[2].position.x, screens[2].position.y, screens[2].position.z, .84, .7, .5) },
    { id: 'rack', page: 'rack', label: '服务器机柜', box: box3(x-2.05, .6, z-.08, .86, 1.32, .95) },
    { id: 'poster-pyramid', page: 'poster-pyramid', label: '海报 · 玻璃金字塔', box: box3(x, 2.42, z+front, 2.2, 1.44, .12) },
    { id: 'poster-v', page: 'poster-v', label: '海报 · V', box: box3(x-2.25, 2.42, z+front, 1.16, .72, .12) },
    { id: 'lights', label: '灯光模式', box: box3(x+switchPos.dx, switchPos.y+.13, z+front, .34, .42, .14) },
    { id: 'seat', label: '坐下', box: box3(x-.15, .55, chairZ, .9, 1.1, .95) },
  ];
  const seat = { x: x-.15, z: chairZ + .08 };
  const stand = { x: x-.15, z: chairZ + .92 };
  const faceDesk = Math.atan2(x - seat.x, z - seat.z);
  let elapsed = 0, mode = 0, boot = 0;
  // One place owns the corner's decorative light level, so the switch, the boot
  // flash and the frame update can never disagree.
  const applyLights = () => {
    const g = LIGHT_MODES[mode].gain;
    lightMaterial.color.setScalar(g);
    ledMaterial.opacity = g === 0 ? .12 : .62 + .2 * Math.sin(elapsed * Math.PI / 2.5);
  };
  return { mesh, screens, hotspot, fixtures, approach, href: PROFILE.accounts.find(a=>a.id==='github').href,
    seat, stand, faceDesk, lightModes: LIGHT_MODES,
    get lightMode() { return LIGHT_MODES[mode].id; },
    cycleLights() { mode = (mode + 1) % LIGHT_MODES.length; applyLights(); return LIGHT_MODES[mode]; },
    applyLights,
    boot() { boot = 2.4; },
    get booting() { return boot > 0; },
    update(dt){
      if(!mesh.visible||dt<=0)return;
      elapsed=(elapsed+dt)%20;
      if (boot > 0) {
        boot = Math.max(0, boot - dt);
        ledMaterial.color.setHex(boot % .32 > .16 ? 0x9ef2e0 : 0x2a6b62);
        if (boot === 0) ledMaterial.color.setHex(0xd4a45d);
      }
      applyLights();
    }};
}

// One hover/click path for every fixture in the corner, plus the seated state.
// The engine keeps its own workbench hotspot for the main display, so nothing
// here duplicates the GitHub binding or the page system: pages open by
// dispatching the project's existing `[data-open]` links.
export function attachWorkstationControls(station,{stage,rig,player}) {
  const canvas=stage.renderer.domElement,tip=document.querySelector('#tooltip');
  const panel=document.querySelector('#panel'),map=document.querySelector('#bigmap');
  const page=document.querySelector('[data-station="workbench"]');
  page.dataset.link=station.href;
  page.querySelector('a').href=station.href;
  // Hidden proxies inside the panel: the engine's own `[data-open]` handler is
  // bound to `#panel`, so clicking one of these opens that page exactly as an
  // in-page link would, with no duplicated page logic here.
  const proxyHost=document.createElement('div');proxyHost.hidden=true;panel.appendChild(proxyHost);
  const proxies=new Map();
  for(const id of ['workbench','terminal','status','rack','poster-pyramid','poster-v']){
    const a=document.createElement('a');a.dataset.open=id;a.href='#';proxyHost.appendChild(a);proxies.set(id,a);
    // The engine's own handler listens on the document and only needs the
    // event, so cancel the anchor's default jump to "#" and keep the URL clean.
    a.addEventListener('click',e=>e.preventDefault());
  }
  const open=id=>{const a=proxies.get(id);if(a)a.click();};
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),hit=new THREE.Vector3(),centre=new THREE.Vector3();
  let px=-1,py=-1,ownsTip=false,seated=false,pointerDown=null;
  const hide=()=>{if(ownsTip){tip.hidden=true;canvas.style.cursor='';ownsTip=false;}};
  // Reach is measured from the desk itself, so the approach point, the seat and
  // the standing spot after leaving are all inside the same radius.
  const near=()=>Math.hypot(player.pos.x-station.seat.x,player.pos.z-station.seat.z)<3.4;
  function pick(clientX,clientY){
    if(!near())return null;
    ndc.set(clientX/innerWidth*2-1,-(clientY/innerHeight)*2+1);ray.setFromCamera(ndc,stage.camera);
    let best=null;
    for(const f of station.fixtures){
      // The seat is only an invitation from the floor beside it.
      if(f.id==='seat'&&seated)continue;
      if(!ray.ray.intersectBox(f.box,hit))continue;
      if(f.precise&&!station.hotspot.hitTest(ray.ray))continue;
      // Screen-sized targets overlap in screen space from a side angle, so the
      // winner is the box the cursor points *through* most centrally, not the one
      // whose front face happens to be nearest.
      f.box.getCenter(centre);
      const score=ray.ray.distanceSqToPoint(centre)+.02*hit.distanceTo(ray.ray.origin);
      if(!best||score<best.score)best={score,f};
    }
    return best?.f||null;
  }
  function seatLabel(){return seated?'起身离开':'坐下 · 操作工作台';}
  function sit(){
    if(seated)return;
    seated=true;player.cancel();
    player.teleport(station.seat.x,station.seat.z);
    rig.skipIntro();
    // Face the desk from the chair, then hand the eye back to the seated heading
    // after recentering (recenter re-derives the yaw from the walking heading).
    rig.setFirstPerson(true,station.faceDesk);
    rig.recenter(player);
    rig.setFirstPerson(true,station.faceDesk);
    document.body.classList.add('seated');
  }
  function stand(){
    if(!seated)return;
    seated=false;player.cancel();
    player.teleport(station.stand.x,station.stand.z);
    rig.setFirstPerson(false);rig.recenter(player);
    document.body.classList.remove('seated');
  }
  // While seated the chair owns the visitor's position: the walk input is zeroed
  // and the seat is re-asserted after the collision pass, so the chair's own
  // collider can never push a seated visitor back out of it.
  const baseUpdate=player.update;
  player.update=(dt,move,yaw,fp)=>{
    if(!seated)return baseUpdate(dt,move,yaw,fp);
    baseUpdate(dt,{x:0,z:0,run:false,up:false,down:false},yaw,fp);
    player.pos.x=station.seat.x;player.pos.z=station.seat.z;
  };

  canvas.addEventListener('pointermove',e=>{px=e.clientX;py=e.clientY;if(e.buttons){px=-1;hide();}});
  canvas.addEventListener('pointerleave',()=>{px=-1;hide();});
  // Capture phase: a fixture click must not also walk the player.
  document.addEventListener('click',e=>{
    if(e.target!==canvas)return;
    const f=pick(e.clientX,e.clientY);
    if(!f){if(seated){e.stopImmediatePropagation();e.preventDefault();hide();}return;}
    e.stopImmediatePropagation();e.preventDefault();
    pointerDown=null;
    if(f.id==='seat'){seated?stand():sit();hide();return;}
    if(f.id==='lights'){station.cycleLights();hide();return;}
    hide();open(f.page);
  },true);
  // F sits at the chair when the visitor is standing right beside it.
  addEventListener('keydown',e=>{
    if(e.key!=='f'&&e.key!=='F')return;
    if(panel.open)return;
    const d=Math.hypot(player.pos.x-station.seat.x,player.pos.z-station.seat.z);
    if(!seated&&d<1.25){e.stopImmediatePropagation();e.preventDefault();sit();}
  },true);
  addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(panel.open)return;                          // the panel closes first
    if(seated){stand();}
  });

  // ---- page content: a simulated terminal, live render stats, a rack demo ----
  const terminal={ready:false};
  function mountTerminal(body){
    const out=body.querySelector('[data-term-out]'),field=body.querySelector('[data-term-in]');
    if(!out||!field)return;
    const print=(text,cls)=>{const line=document.createElement('div');if(cls)line.className=cls;line.textContent=text;out.appendChild(line);out.scrollTop=out.scrollHeight;};
    let lines=0;
    const boot=()=>{
      out.textContent='';lines=0;
      print('NETRUNNER SHELL 0.9 — SIMULATION ONLY');
      print('No command here touches this device or any network.');
      print('');
      print('Type `help` for the command list.','note');
      print('');
    };
    boot();
    field.value='';
    field.addEventListener('keydown',ev=>{
      if(ev.key!=='Enter')return;
      ev.preventDefault();
      const raw=field.value.trim();field.value='';
      if(!raw)return;
      print('> '+raw,'cmd');
      const cmd=raw.toLowerCase();
      if(cmd==='help'){print('help      this list');print('about     who runs this space');print('projects  what is built here');print('github    open the profile in a new tab');print('clear     clear the screen');}
      else if(cmd==='about'){print('Aletheiar — personal site, built as a walkable voxel courtyard.');print('Front end: Three.js, native ES modules, no build step for the world.');}
      else if(cmd==='projects'){print('homecraft        three.js voxel hall and courtyard');print('research notes   long-form write-ups in docs/research');print('experiments      small shaders and geometry studies');}
      else if(cmd==='github'){print('opening https://github.com/Aletheiar in a new tab …','ok');window.open(station.href,'_blank','noopener');}
      else if(cmd==='clear'){boot();}
      else print('unknown command: '+raw+' — try `help`','note');
      lines++;
      if(lines>60){boot();}
      field.scrollIntoView({block:'nearest'});
    });
    setTimeout(()=>field.focus({preventScroll:true}),60);
    terminal.ready=true;
  }
  const status={el:null,timer:0};
  let sample=0;
  function mountStatus(body){
    status.el=body.querySelector('[data-status]');
    status.timer=0;
    fillStatus(stage.renderer.info.render.calls,stage.renderer.info.render.triangles,0);
  }
  function fillStatus(calls,tris,ms){
    const el=status.el;if(!el)return;
    const set=(key,value)=>{const node=el.querySelector(`[data-k="${key}"]`);if(node)node.textContent=value;};
    set('scene','玻璃金字塔 · 中央大厅');
    set('local',new Date().toLocaleTimeString('zh-CN',{hour12:false}));
    set('calls',String(calls));
    set('tris',tris.toLocaleString('en-US'));
    set('frame',ms>0?`${ms.toFixed(1)} ms`:'—');
    set('fps',ms>0?String(Math.round(1000/ms)):'—');
    set('lights',String(stage.scene.children.filter(o=>o.isLight).length));
    set('pixel',`${stage.renderer.getPixelRatio().toFixed(2)}×`);
  }
  function mountRack(body){
    const button=body.querySelector('[data-rack-boot]'),log=body.querySelector('[data-rack-log]');
    if(!button||!log)return;
    button.addEventListener('click',()=>{
      if(station.booting)return;
      station.boot();
      const steps=['power: standby','rail A: 12 V nominal','module 1 … ok','module 2 … ok','module 3 … ok','cooling loop … nominal','decorative node online'];
      log.textContent='';
      steps.forEach((line,i)=>setTimeout(()=>{log.textContent+=(log.textContent?'\n':'')+line;log.scrollTop=log.scrollHeight;},i*160));
    });
  }
  // The panel is the project's own page dialog; fill only the pages this room owns.
  const observer=new MutationObserver(()=>{
    if(!panel.open){status.el=null;return;}
    const body=panel.querySelector('.body');if(!body)return;
    // The shell's input is built when the card opens: a focusable field sitting
    // in the hidden page list would steal focus (and the browser's sticky user
    // activation) from the hall on load.
    const slot=body.querySelector('[data-nr-slot="terminal"]');
    if(slot&&!slot.firstChild){
      slot.innerHTML='<pre class="nr-term-out" data-term-out></pre>'
        +'<label class="nr-term-line"><span>&gt;</span><input data-term-in type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="模拟终端命令"></label>';
    }
    if(body.querySelector('[data-term-out]')&&!body.querySelector('[data-term-ready]')){
      body.dataset.termReady='1';mountTerminal(body);
    }
    if(body.querySelector('[data-status]'))mountStatus(body);
    if(body.querySelector('[data-rack-boot]'))mountRack(body);
  });
  observer.observe(panel,{attributes:true,attributeFilter:['open','data-station']});

  const api = {update(dt){
    // Live render numbers only while the status page is on screen.
    if(status.el&&panel.open){
      status.timer+=dt;
      sample = Math.min(dt, .5) * 1000;
      if(status.timer>.25){
        const r=stage.renderer.info.render;
        fillStatus(r.calls,r.triangles,sample);
        status.timer=0;
      }
    }
    if(px<0||rig.introActive||panel.open||!map.hidden){hide();return;}
    const f=pick(px,py);
    if(!f){hide();return;}
    const label=f.id==='seat'?seatLabel():f.label+(f.id==='lights'?` · ${station.lightModes.find(m=>m.id===station.lightMode).name}`:'');
    tip.textContent=label;tip.hidden=false;ownsTip=true;canvas.style.cursor='pointer';
    tip.style.left=`${Math.min(innerWidth-tip.offsetWidth-8,Math.max(8,px-tip.offsetWidth/2))}px`;
    tip.style.top=`${Math.max(8,py-tip.offsetHeight-16)}px`;
  },get seated(){return seated;},sit,stand};
  // The station object is what the scene stores, so this is where a check (or a
  // later feature) can read the seated state without another global.
  station.controls = api;
  return api;
}
