import * as THREE from 'three';
import { canvasTexture } from '@engine/world/textures.js';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';
import { PROFILE } from '../about/profile.js';
import { WORKSTATION_LAYOUT as L, workbenchPoint } from './space-config.js';

// The north-east corner is an open industrial workspace inside the glass
// hall: a stepped back wall, a turned poster wing, a long desk with the
// triple display, a server rack, a marked floor and a warm/teal light set.
// Everything static is BoxBatch boxes, so the whole room costs one batch mesh
// plus five small meshes of its own: the screen atlas, the two posters, the light
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

export function buildWorkstation(anchor, { box, solid: addSolid }) {
  const {deskX:x,deskZ:z,chairZ,approach,yaw=0}=anchor;
  const c=Math.cos(yaw),s=Math.sin(yaw),at=(dx,dz)=>workbenchPoint(dx,dz,anchor);
  const turn=new THREE.Matrix4().makeTranslation(x,0,z)
    .multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeTranslation(-x,0,-z));
  const mesh = new THREE.Group(); mesh.name = 'hall-workstation';
  const b=(dx,y,dz,w,h,d,mat=METAL,opts={})=>{
    const p=at(dx,dz);box(p.x,y,p.z,w,h,d,mat,{...opts,ry:(opts.ry||0)+yaw,tag:'workstation'});
  };
  // The existing walking system accepts axis-aligned footprints. Small tiles
  // cover each turned solid without blocking its large empty corner wedges.
  const solid=(cx,cz,w,d)=>{
    if(!yaw){addSolid(cx,cz,w,d);return;}
    const cols=Math.ceil(w/.24),rows=Math.ceil(d/.24),tw=w/cols,td=d/rows;
    const width=Math.abs(c)*tw+Math.abs(s)*td,depth=Math.abs(s)*tw+Math.abs(c)*td;
    for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){
      const p=at(cx-x-w/2+(i+.5)*tw,cz-z-d/2+(j+.5)*td);
      addSolid(p.x,p.z,width,depth);
    }
  };
  const wallZ=L.wall.dz,front=wallZ+.08;
  // A stepped service wall, with open joints around the central upper panel.
  // The desk is 0.7 m forward of it; neither side becomes a full-height wall.
  b(-.1,.12,wallZ,3.65,1.22,.16,PANEL);
  b(-.1,1.72,wallZ,3.65,2.32,.16,PANEL);
  b(-2.65,.08,wallZ,1.0,1.98,.16,DARK);
  b(2,.08,wallZ,.6,2.2,.16,PANEL);
  solid(x+L.wall.dx,z+wallZ,L.wall.width,.18);
  b(L.wall.dx,.04,wallZ,5.6,.08,.22,EDGE);
  for(const dx of [-1.94,1.74]){
    b(dx,.04,wallZ,.12,4.02,.21,EDGE);
    b(dx,.1,front+.035,.025,3.87,.025,STEEL);
    for(const dy of [.24,1.55,3.85])b(dx,dy,front+.045,.16,.06,.05,PLATE);
  }
  b(-.1,4.04,wallZ,3.7,.08,.2,EDGE);
  b(-.1,4.07,front+.03,3.62,.018,.035,STEEL);
  b(-.1,1.52,front+.09,3.7,.12,.22,EDGE);
  b(-.1,1.59,front+.21,3.4,.025,.025,WARN);
  for(let i=0;i<9;i++)b(-1.6+i*.38,1.54,front+.22,.15,.035,.012,STEEL);
  // Lower service hatches, vents and conduits surround rather than cover the art.
  for(const [dx,w] of [[-2.65,.76],[2,.48]]){
    b(dx,.35,front+.03,w,.9,.04,EDGE);
    for(let i=0;i<8;i++)b(dx,.44+i*.09,front+.06,w-.1,.025,.02,PLATE);
    b(dx,1.48,front+.03,w,.07,.03,WARN);
  }
  for(const dx of [-1.82,1.62]){
    b(dx,.2,front+.09,.045,1.38,.045,METAL);
    for(const dy of [.4,.95,1.4])b(dx,dy,front+.1,.09,.055,.07,STEEL);
  }
  // The left wing turns inward by 60 degrees and extends towards the visitor.
  // Its poster, ribs and feet share the same rigid frame.
  const wing=L.wing,cw=Math.cos(wing.yaw),sw=Math.sin(wing.yaw);
  const wb=(u,y,v,w,h,d,mat=METAL)=>b(wing.dx+u*cw+v*sw,y,wing.dz-u*sw+v*cw,w,h,d,mat,{ry:wing.yaw});
  wb(0,.12,0,wing.width,1.05,.14,DARK);
  wb(0,1.46,0,wing.width,1.34,.14,PANEL);
  for(const u of [-wing.width/2,wing.width/2]){
    wb(u,.04,0,.10,2.88,.2,EDGE);wb(u,.1,.11,.025,2.7,.025,STEEL);
    wb(u,.02,.04,.4,.07,.6,EDGE);
  }
  wb(0,2.8,0,wing.width+.12,.09,.2,EDGE);
  wb(0,1.34,.04,wing.width,.07,.18,EDGE);
  for(let i=0;i<8;i++)wb(0,.28+i*.09,.086,1.46,.035,.025,PLATE);
  wb(0,.14,.09,1.6,.035,.025,WARN);
  for(let i=0;i<5;i++){
    const u=-wing.width/2+i*wing.width/4;
    solid(x+wing.dx+u*cw,z+wing.dz-u*sw,.32,.4);
  }

  // A dominant central print, with V confined to the turned equipment wing.
  const posters = [
    { id:'poster-pyramid',...L.posters.main,h:L.posters.main.w*800/1280,file:'cyberpunk-pyramid.webp' },
    { id:'poster-v',dx:wing.dx+.09*sw,dz:wing.dz+.09*cw,yaw:wing.yaw,...L.posters.side,h:L.posters.side.w*540/960,file:'cyberpunk-v.webp' },
  ];
  for (const p of posters) {
    const bottom=p.y-p.h/2,c=Math.cos(p.yaw),s=Math.sin(p.yaw);
    const frame=(u,y,w,h)=>b(p.dx+u*c-.025*s,y,p.dz-u*s-.025*c,w,h,.055,EDGE,{ry:p.yaw});
    for(const side of [-1,1])frame(side*(p.w/2+.035),bottom-.02,.07,p.h+.1);
    frame(0,bottom-.065,p.w+.2,.075);frame(0,bottom+p.h+.025,p.w+.2,.075);
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
    plane.name=p.id;plane.position.set(x+p.dx,p.y,z+p.dz);plane.rotation.y=p.yaw;
    plane.userData = { file: p.file, credit: 'CD PROJEKT RED' };
    posterGroup.add(plane);
    p.mesh = plane;
  }
  mesh.add(posterGroup);

  // ---- the marked floor: a dark mat, yellow edge tape and red markings.
  // 12 mm above the paving so nothing z-fights, and no collider of its own. ----
  b(-.1,.026,-.08,5.35,.012,2.85,MAT);
  for(const dz of [-1.47,1.31])b(-.1,.038,dz,5.28,.004,.045,WARN);
  for(const dx of [-2.74,2.54])b(dx,.038,-.08,.045,.004,2.78,WARN);
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
  b(0,.68,.58,3.34,.025,.025,TEAL);
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
  const cabinet=L.cabinet;
  b(cabinet.dx,.04,cabinet.dz,.58,.86,1.12,PANEL);
  b(cabinet.dx,.88,cabinet.dz,.68,.05,1.22,EDGE);
  for(let i=0;i<3;i++){
    b(cabinet.dx,.14+i*.23,cabinet.dz+.57,.48,.18,.028,DARK);
    b(cabinet.dx,.22+i*.23,cabinet.dz+.59,.16,.018,.02,WARN);
  }
  b(cabinet.dx,.94,cabinet.dz-.15,.38,.57,.38,DARK);
  for(let i=0;i<6;i++)b(cabinet.dx,1.02+i*.065,cabinet.dz+.05,.27,.025,.02,PLATE);
  b(cabinet.dx,1.48,cabinet.dz+.055,.13,.012,.02,TEAL);
  solid(x+cabinet.dx,z+cabinet.dz,.68,1.22);
  // Ventilated PC below the table, and a separate short rack on its west side.
  b(.98,.06,-.02,.4,.58,.67,DARK);
  b(.98,.065,.32,.43,.58,.035,EDGE);
  for(let i=0;i<7;i++)b(.98,.15+i*.055,.343,.31,.015,.009,RUBBER);
  b(1.17,.12,.343,.014,.43,.01,CYAN);
  const rack=L.rack,rz=rack.dz+.08;
  const rb=(dx,y,dz,w,h,d,mat)=>b(dx,y,dz+rz,w,h,d,mat);
  rb(-2.05,.03,-.08,.7,1.18,.79,DARK);solid(x+rack.dx,z+rack.dz,.7,.79);
  for(const dx of [-2.37,-1.73])rb(dx,.07,.33,.045,1.09,.05,EDGE);
  for(let i=0;i<4;i++) {
    rb(-2.05,.13+i*.255,.327,.56,.21,.038,EDGE);
    for(let j=0;j<5;j++)rb(-2.12+j*.055,.17+i*.255,.35,.018,.11,.012,DARK);
  }
  // Rack detail: cooling grille, breakers, a power switch and a box on top.
  for(let i=0;i<8;i++)rb(-2.05,1.02+i*.018,.35,.52,.012,.012,RUBBER);
  rb(-2.05,1.2,-.08,.72,.09,.81,EDGE);
  rb(-2.3,.28,.36,.12,.2,.03,PANEL);
  rb(-2.3,.36,.375,.05,.05,.014,WARN);
  rb(-1.92,1.31,-.08,.36,.16,.4,{tex:'paint',tint:0x4a5259});
  b(-2.05,.06,-.35,.055,.045,1.15,RUBBER);
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
  // Walking collides with the actual chair footprint. The explicit seated
  // state owns its position instead of running the walking collision solver.
  solid(x-.15,chairZ,.76,.75);
  // A small stack of books preserves the personal, inhabited character.
  for(let i=0;i<3;i++)b(-1.21,.8+i*.045,.38,.37,.04,.22,{tex:'paint',tint:[0x987753,0x536d70,0xb2a78c][i]});
  // A yellow cable ramp and a red floor marking keep the mat from reading flat.
  b(-2.35,.026,.9,.62,.03,.2,WARN);
  b(-1.72,.026,.72,.05,.03,.36,RED);

  // ---- light set: one emissive mesh, vertex coloured, dimmed by one material
  const stripGeometries = [], stripColours = [];
  const strip = (dx, y, dz, w, h, d, hex, yaw=0) => {
    const g = new THREE.BoxGeometry(w, h, d);g.rotateY(yaw);g.translate(x + dx, y + h / 2, z + dz);
    stripGeometries.push(g); stripColours.push(hex);
  };
  strip(-.1,4.055,front+.035,3.35,.025,.04,0xffb45e); // overhead service light
  strip(wing.dx+.11*sw,2.84,wing.dz+.11*cw,1.65,.025,.025,0xffb45e,wing.yaw);
  strip(2,2.25,front+.035,.4,.025,.04,0xffb45e);
  strip(0,.72,.6,2.6,.035,.05,0x49d8c8);               // under-desk
  strip(-2.05,1.06,.36+rz,.52,.04,.03,0xffc068);       // rack header
  strip(1.55,.62,.6,.5,.04,.03,0x49d8c8);              // drawer kick
  // Edge lighting: the corner sits in the pyramid's shade, so the structure is
  // read by a few self-lit lines rather than by another light source.
  strip(-1.94,1.7,front+.13,.025,.27,.025,0xffb45e);
  strip(1.74,1.7,front+.13,.025,.27,.025,0xffb45e);
  strip(cabinet.dx,.1,cabinet.dz+.625,.5,.02,.025,0x49d8c8);
  strip(-2.39,.1,.33+rz,.028,1.06,.028,0x49d8c8);
  strip(-1.71,.1,.33+rz,.028,1.06,.028,0x49d8c8);
  // The switch itself: three lamps, one per mode, lit by the light mesh.
  const switchPos = { dx: 1.62, y: 1.44 };
  b(switchPos.dx,switchPos.y,front+.035,.19,.26,.03,PANEL);
  for (let i=0;i<3;i++) b(switchPos.dx-.05+i*.05,switchPos.y+.06,front+.055,.026,.03,.02,i===0?WARN:EDGE);
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
    const g=new THREE.BoxGeometry(.035,.028,.012);g.translate(x-1.91,.23+i*.255,z+.356+rz);lampGeometries.push(g);
  }
  for(let i=0;i<3;i++) {
    const g=new THREE.BoxGeometry(.02,.02,.01);g.translate(x-1.86,.2+i*.08,z+.356+rz);lampGeometries.push(g);
  }
  const ledMaterial = new THREE.MeshBasicMaterial({ color: 0xd4a45d, transparent: true, opacity: .7, toneMapped: false });
  const leds=new THREE.Mesh(mergeGeometries(lampGeometries), ledMaterial);
  lampGeometries.forEach(g=>g.dispose());leds.name='workstation-status-leds';mesh.add(leds);

  mesh.applyMatrix4(turn);mesh.updateMatrixWorld(true);
  for(const display of screens){
    display.housingPosition=new THREE.Vector3(display.position.x,display.y,display.position.z-.038).applyMatrix4(turn);
    display.position.applyMatrix4(turn);display.yaw+=yaw;
  }
  const posterFaces=posters.map(p=>({...p,position:p.mesh.getWorldPosition(new THREE.Vector3()),yaw:p.yaw+yaw,width:p.w,height:p.h}));

  // ---- interaction boxes, world space, one per thing a visitor can touch ----
  const box3 = (cx, y, cz, w, h, d) => new THREE.Box3(
    new THREE.Vector3(cx - w / 2, y - h / 2, cz - d / 2),
    new THREE.Vector3(cx + w / 2, y + h / 2, cz + d / 2));
  const faceRay=new THREE.Ray(),faceHit=new THREE.Vector3(),facePlane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
  const faceBounds=f=>box3(f.position.x,f.position.y,f.position.z,
    f.width*Math.abs(Math.cos(f.yaw))+.012,f.height+.012,f.width*Math.abs(Math.sin(f.yaw))+.012);
  const intersectFace=f=>{
    const transform=new THREE.Matrix4().makeRotationY(f.yaw).setPosition(f.position),inverse=transform.clone().invert();
    return(ray,out)=>{
      faceRay.copy(ray).applyMatrix4(inverse);
      if(faceRay.direction.z>=0||!faceRay.intersectPlane(facePlane,faceHit)||Math.abs(faceHit.x)>f.width/2||Math.abs(faceHit.y)>f.height/2)return false;
      out.copy(faceHit).applyMatrix4(transform);return true;
    };
  };
  const main=screens[0],mainFace=intersectFace(main);
  const hotspot={id:'workbench',box:faceBounds(main)};
  // The engine's broad-phase box alone sees through furniture. Test the two
  // real, tilted auxiliary housings in their local coordinates before accepting
  // a main-screen ray; the same predicate is used by hover and native clicks.
  const housings=screens.slice(1).map(s=>({
    inverse:new THREE.Matrix4().makeRotationY(s.yaw).setPosition(s.housingPosition).invert(),
    bounds:new THREE.Box3(new THREE.Vector3(-(s.width+.07)/2,-(s.height+.07)/2,-.0325),
      new THREE.Vector3((s.width+.07)/2,(s.height+.07)/2,.0325)),
  }));
  const localRay=new THREE.Ray(),point=new THREE.Vector3();
  hotspot.hitTest=ray=>{
    if(!mainFace(ray,point))return false;
    const mainDistance=point.distanceToSquared(ray.origin);
    for(const housing of housings){
      localRay.copy(ray).applyMatrix4(housing.inverse);
      if(localRay.intersectBox(housing.bounds,point)&&point.distanceToSquared(localRay.origin)<mainDistance)return false;
    }
    return true;
  };
  const fixtures = [
    { id: 'main', page: 'workbench', label: '访问 GitHub ↗', box: hotspot.box, precise: true },
    { id: 'terminal', page: 'terminal', label: '终端 · 模拟', box:faceBounds(screens[1]) },
    { id: 'status', page: 'status', label: '系统状态', box:faceBounds(screens[2]) },
    { id: 'rack', page: 'rack', label: '服务器机柜', box:box3(x+rack.dx,.6,z+rack.dz,.86,1.32,.95).applyMatrix4(turn) },
    ...posterFaces.map(p=>({id:p.id,page:p.id,label:p.id==='poster-v'?'海报 · V':'海报 · 玻璃金字塔',box:faceBounds(p)})),
    { id: 'lights', label: '灯光模式', box:box3(x+switchPos.dx,switchPos.y+.13,z+front,.34,.42,.14).applyMatrix4(turn) },
    { id: 'seat', label: '坐下', box:box3(x-.15,.55,chairZ,.9,1.1,.95).applyMatrix4(turn) },
  ];
  // Intersect display faces in local space. Broad AABBs alone overlap from
  // oblique angles and can select a screen that the cursor never touches.
  for(const f of [...screens,...posterFaces]) {
    fixtures.find(item=>item.id===f.id).intersect=intersectFace(f);
  }
  const seat=at(-.15,chairZ-z-.04),stand=at(-.15,chairZ-z+.92);
  const faceDesk = Math.atan2(x - seat.x, z - seat.z);
  let elapsed = 0, mode = 0, boot = 0;
  // One place owns the corner's decorative light level, so the switch, the boot
  // flash and the frame update can never disagree.
  const applyLights = () => {
    const g = LIGHT_MODES[mode].gain;
    lightMaterial.color.setScalar(g);
    ledMaterial.opacity = g === 0 ? .12 : .62 + .2 * Math.sin(elapsed * Math.PI / 2.5);
  };
  return { mesh, screens, hotspot, fixtures, approach, layout:L, href: PROFILE.accounts.find(a=>a.id==='github').href,
    seat,stand,faceDesk,yaw,at,lightModes:LIGHT_MODES,
    toLocal(p){const dx=p.x-x,dz=p.z-z;return {x:dx*c-dz*s,z:dx*s+dz*c};},
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
export function attachWorkstationControls(station,{stage,rig,player,nav}) {
  const canvas=stage.renderer.domElement,tip=document.querySelector('#tooltip');
  const panel=document.querySelector('#panel'),map=document.querySelector('#bigmap');
  const weatherMenu=document.querySelector('#weatherMenu');
  const modalOpen=()=>panel.open||!map.hidden||!weatherMenu.hidden;
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
    // The panel's existing handler owns activation. Cancel the anchor's
    // default fragment navigation so opening an auxiliary card keeps the URL.
    a.addEventListener('click',e=>e.preventDefault());
  }
  const open=id=>{const a=proxies.get(id);if(a)a.click();};
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),hit=new THREE.Vector3();
  let px=-1,py=-1,ownsTip=false,seated=false,savedView=null;
  const exit=document.createElement('button');
  exit.type='button';exit.className='nr-seat-exit';exit.hidden=true;
  exit.textContent='点击离开座位';exit.setAttribute('aria-label','离开座椅');
  document.querySelector('#hud').appendChild(exit);
  // A pointer:coarse device has no F key, so it gets tappable affordances. On a
  // fine pointer the prompt is a plain read-out: pressing F is the only way in
  // and the only way out.
  const touchLike=matchMedia('(pointer: coarse)').matches;
  const seatPrompt=document.createElement('button');
  seatPrompt.type='button';seatPrompt.id='nr-seat-prompt';
  seatPrompt.className='nr-seat-prompt'+(touchLike?' is-touch':'');
  seatPrompt.hidden=true;
  if(!touchLike)seatPrompt.tabIndex=-1;
  document.querySelector('#hud').appendChild(seatPrompt);
  const feedback=document.createElement('div');feedback.className='nr-feedback';
  feedback.setAttribute('role','status');feedback.hidden=true;document.querySelector('#hud').appendChild(feedback);
  let feedbackTime=0;
  const notify=text=>{feedback.textContent=text;feedback.hidden=false;feedbackTime=2;};
  const focusScene=()=>{canvas.tabIndex=-1;canvas.focus({preventScroll:true});};
  const hide=()=>{if(ownsTip){tip.hidden=true;canvas.style.cursor='';ownsTip=false;}};
  // Reach is measured from the desk itself, so the approach point, the seat and
  // the standing spot after leaving are all inside the same radius.
  const near=()=>Math.hypot(player.pos.x-station.seat.x,player.pos.z-station.seat.z)<3.4
    &&Math.abs(player.y)<.7&&!player.flying;
  // Keep the inherited GitHub hotspot under the same reach rule. Otherwise a
  // rejected local tap could fall through to the engine and open it remotely.
  const mainHit=station.hotspot.hitTest;
  station.hotspot.hitTest=ray=>near()&&mainHit(ray);
  // Both mouse-wheel and two-finger pinch zoom arrive through this method.
  const zoom=rig.zoom;
  rig.zoom=f=>{if(!seated)zoom(f);};
  const reachPoint=new THREE.Vector3();
  function pick(clientX,clientY){
    if(!near())return null;
    ndc.set(clientX/innerWidth*2-1,-(clientY/innerHeight)*2+1);ray.setFromCamera(ndc,stage.camera);
    let best=null,distance=Infinity;
    reachPoint.set(player.pos.x,player.y+1.28,player.pos.z);
    for(const f of station.fixtures){
      // The seat is only an invitation from the floor beside it.
      if(f.id==='seat'&&seated)continue;
      if(f.box.distanceToPoint(reachPoint)>3.1)continue;
      if(f.intersect?!f.intersect(ray.ray,hit):!ray.ray.intersectBox(f.box,hit))continue;
      if(f.precise&&!station.hotspot.hitTest(ray.ray))continue;
      if(!f.intersect&&f.id!=='seat'&&ray.ray.direction.x*Math.sin(station.yaw)+ray.ray.direction.z*Math.cos(station.yaw)>=0)continue;
      const d=hit.distanceToSquared(ray.ray.origin);
      if(d<distance){best=f;distance=d;}
    }
    return best;
  }
  function seatLabel(){return seated?'起身离开':'坐下 · 操作工作台';}
  function sit(){
    if(seated||modalOpen()||!near()||Math.hypot(player.pos.x-station.seat.x,player.pos.z-station.seat.z)>1.8)return;
    savedView=rig.captureView();player.cancel();
    player.teleport(station.seat.x,station.seat.z);
    player.pos.x=station.seat.x;player.pos.z=station.seat.z;
    seated=true;
    rig.skipIntro();
    rig.setFirstPerson(true,station.faceDesk,{eyeHeight:1.28,transition:true});
    document.body.classList.add('seated');
    exit.hidden=!touchLike;
  }
  function stand(){
    if(!seated)return;
    const target=nav.nearestStand(station.stand.x,station.stand.z);
    if(!target||!nav.canStand(target.x,target.z))return;
    player.cancel();
    if(!player.teleport(target.x,target.z))return;
    seated=false;
    rig.restoreView(savedView,{transition:true});savedView=null;
    document.body.classList.remove('seated');
    exit.hidden=true;hide();focusScene();
  }
  exit.addEventListener('click',()=>{if(touchLike)stand();});
  seatPrompt.addEventListener('click',()=>{
    if(!touchLike)return;
    if(seated)stand();else sit();
  });
  // One line of guidance beside the chair: how to get in, and how to get out.
  // Nothing here is clickable with a fine pointer.
  function updatePrompt(){
    // A touch screen shows one affordance at a time: the prompt to sit, then the
    // exit button that replaces it while seated.
    const show=!modalOpen()&&!rig.introActive&&!rig.showcaseActive&&near()&&!(touchLike&&seated);
    seatPrompt.hidden=!show;
    if(!show)return;
    const text=seated?(touchLike?'点击离开':'按 F 起身'):(touchLike?'点击坐下':'按 F 坐下');
    if(seatPrompt.textContent!==text)seatPrompt.textContent=text;
  }
  // While seated, bypass walking physics and keep the visitor at the seat.
  // The physical chair remains solid for everyone walking around it.
  const baseUpdate=player.update;
  player.update=(dt,move,yaw,fp)=>{
    if(!seated)return baseUpdate(dt,move,yaw,fp);
    player.cancel();
    player.pos.x=station.seat.x;player.pos.z=station.seat.z;
  };

  canvas.addEventListener('pointermove',e=>{px=e.clientX;py=e.clientY;if(e.buttons){px=-1;hide();}});
  canvas.addEventListener('pointerleave',()=>{px=-1;hide();});
  // The engine's existing tap recognizer calls this once, only after a real
  // tap (never a drag, pinch or right click), before walking or another hotspot.
  function tap(x,y){
    if(modalOpen())return false;
    const f=pick(x,y);
    if(!f)return seated;
    if(f.id==='seat')sit();
    else if(f.id==='lights')notify('灯光 · '+station.cycleLights().name);
    else {if(f.id==='main')notify('GitHub ↗ Aletheiar');open(f.page);}
    hide();return true;
  }
  // Modal input takes priority; typing never invokes a world shortcut.
  addEventListener('keydown',e=>{
    if(modalOpen())return;
    if(e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    if(e.ctrlKey||e.altKey||e.metaKey)return;
    const key=e.key.toLowerCase();
    // F owns the seat: it sits the visitor down beside the chair and stands them
    // up again. Escape stays with the engine so it can still close a panel.
    if(key==='f'&&(seated||(near()&&Math.hypot(player.pos.x-station.seat.x,player.pos.z-station.seat.z)<1.8))){
      e.stopImmediatePropagation();e.preventDefault();if(!e.repeat)seated?stand():sit();return;
    }
    if(seated&&(key==='v'||key===' '||key==='p'||/^[1-9]$/.test(key))){
      e.stopImmediatePropagation();e.preventDefault();
    }
  },true);
  panel.addEventListener('close',()=>{
    if(panel.open)return;
    if(seated){exit.hidden=!touchLike;if(touchLike)exit.focus({preventScroll:true});else focusScene();}
    else if(station.fixtures.some(f=>f.page===panel.dataset.station))focusScene();
  });
  for(const id of ['viewButton','flyButton','overview-button','enter-button','return-button','hotbar']) {
    document.getElementById(id)?.addEventListener('click',e=>{if(seated){e.preventDefault();e.stopImmediatePropagation();}},true);
  }

  // ---- page content: a simulated terminal, live render stats, a rack demo ----
  function mountTerminal(body){
    const out=body.querySelector('[data-term-out]'),field=body.querySelector('[data-term-in]');
    if(!out||!field)return;
    const print=(text,cls)=>{const line=document.createElement('div');if(cls)line.className=cls;line.textContent=text;out.appendChild(line);out.scrollTop=out.scrollHeight;};
    let lines=0;
    const boot=()=>{
      out.textContent='';lines=0;
      print('NETRUNNER SHELL 0.9 — SIMULATION ONLY');
      print('Preset commands only. `github` opens the public profile in a new tab.');
      print('');
      print('Type `help` for the command list.','note');
      print('');
    };
    boot();
    field.value='';
    body.querySelector('[data-term-form]').addEventListener('submit',ev=>{
      ev.preventDefault();
      const raw=field.value.trim();field.value='';
      if(!raw)return;
      print('> '+raw,'cmd');
      const cmd=raw.toLowerCase();
      if(cmd==='help'){print('help      this list');print('about     who runs this space');print('projects  what is built here');print('github    open the profile in a new tab');print('clear     clear the screen');}
      else if(cmd==='about'){print('Aletheiar — personal site, built as a walkable voxel courtyard.');print('Front end: Three.js, native ES modules, no build step for the world.');}
      else if(cmd==='projects'){print('homecraft        three.js voxel hall and courtyard');print('research notes   long-form write-ups in docs/research');print('experiments      small shaders and geometry studies');}
      else if(cmd==='github'){print('opening https://github.com/Aletheiar in a new tab …','ok');window.open(station.href,'_blank','noopener');}
      else if(cmd==='clear'){out.textContent='';lines=0;}
      else print('unknown command: '+raw+' — try `help`','note');
      lines++;
      if(lines>60){boot();}
      field.scrollIntoView({block:'nearest'});
    });
    field.focus({preventScroll:true});
  }
  const status={el:null,timer:0};
  function mountStatus(body){
    status.el=body.querySelector('[data-status]');
    status.timer=0;
    fillStatus();
  }
  function fillStatus(){
    const el=status.el;if(!el)return;
    const measured=window.__home?.stats(),render=stage.renderer.info.render;
    const calls=measured?.calls??render.calls,tris=measured?.triangles??render.triangles,ms=measured?.frameMs??0;
    const set=(key,value)=>{const node=el.querySelector(`[data-k="${key}"]`);if(node)node.textContent=value;};
    set('scene','玻璃金字塔 · 中央大厅');
    set('local',new Date().toLocaleTimeString('zh-CN',{hour12:false}));
    set('calls',String(calls));
    set('tris',tris.toLocaleString('en-US'));
    set('frame',ms>0?`${ms.toFixed(1)} ms`:'—');
    set('fps',ms>0?String(Math.round(1000/ms)):'—');
    let lights=0;stage.scene.traverse(o=>{if(o.isLight)lights++;});set('lights',String(lights));
    set('pixel',`${stage.renderer.getPixelRatio().toFixed(2)}×`);
  }
  let rackButton=null,rackLog=null,bootWasRunning=false;
  function mountRack(body){
    const button=body.querySelector('[data-rack-boot]'),log=body.querySelector('[data-rack-log]');
    if(!button||!log)return;
    rackButton=button;rackLog=log;button.disabled=station.booting;
    button.addEventListener('click',()=>{
      if(station.booting)return;
      station.boot();button.disabled=true;bootWasRunning=true;
      log.textContent='SIMULATION · starting decorative node…';
    });
  }
  // The panel is the project's own page dialog; fill only the pages this room owns.
  let mountedNode=null;
  const observer=new MutationObserver(()=>{
    if(!panel.open){status.el=null;rackButton=rackLog=mountedNode=null;return;}
    const body=panel.querySelector('.body');if(!body)return;
    if(mountedNode===body.firstElementChild)return;
    mountedNode=body.firstElementChild;status.el=null;rackButton=rackLog=null;
    // The shell's input is built when the card opens: a focusable field sitting
    // in the hidden page list would steal focus (and the browser's sticky user
    // activation) from the hall on load.
    const slot=body.querySelector('[data-nr-slot="terminal"]');
    if(slot&&!slot.firstChild){
      slot.innerHTML='<pre class="nr-term-out" data-term-out role="log" aria-live="polite"></pre>'
        +'<form class="nr-term-line" data-term-form><span>&gt;</span><input data-term-in type="text" enterkeyhint="send" maxlength="160" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="模拟终端命令"><button class="nr-button" type="submit">运行</button></form>';
    }
    if(body.querySelector('[data-term-out]'))mountTerminal(body);
    if(body.querySelector('[data-status]'))mountStatus(body);
    if(body.querySelector('[data-rack-boot]'))mountRack(body);
  });
  observer.observe(panel,{attributes:true,attributeFilter:['open','data-station']});

  let hoverClock=0;
  const api = {tap,update(dt=0){
    updatePrompt();
    exit.hidden=!seated||modalOpen()||!touchLike;
    if(feedbackTime>0){feedbackTime-=dt;if(feedbackTime<=0)feedback.hidden=true;}
    if(bootWasRunning&&!station.booting){
      bootWasRunning=false;
      if(rackButton)rackButton.disabled=false;
      if(rackLog)rackLog.textContent='SIMULATION · decorative node online\nNo network connection.';
    }
    // Live render numbers only while the status page is on screen.
    if(status.el&&panel.open){
      status.timer+=dt;
      if(status.timer>.25){
        fillStatus();
        status.timer=0;
      }
    }
    hoverClock+=dt;if(hoverClock<.075)return;hoverClock=0;
    if(px<0||rig.introActive||modalOpen()){hide();return;}
    const f=pick(px,py);
    if(!f){hide();return;}
    const label=f.id==='seat'?seatLabel():f.label+(f.id==='lights'?` · ${station.lightModes.find(m=>m.id===station.lightMode).name}`:'');
    tip.textContent=label;tip.hidden=false;ownsTip=true;canvas.style.cursor='pointer';
    tip.style.left=`${Math.min(innerWidth-tip.offsetWidth-8,Math.max(8,px-tip.offsetWidth/2))}px`;
    tip.style.top=`${Math.max(8,py-tip.offsetHeight-16)}px`;
  },get seated(){return seated;},get state(){
    if(panel.open&&['terminal','status'].includes(panel.dataset.station))return 'computer';
    if(panel.open&&station.fixtures.some(f=>f.page===panel.dataset.station))return 'viewing';
    return seated?'seated':'roaming';
  },sit,stand};
  // The station object is what the scene stores, so this is where a check (or a
  // later feature) can read the seated state without another global.
  station.controls = api;
  return api;
}
