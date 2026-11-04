// Original voxel interpretation of Isaac's stationary Devil Room statue.
// Local +z is its face. Both monuments face east toward the pyramid.
export const DEVIL_PLACEMENT = Object.freeze({ x: -62.6, z: 19.2, yaw: Math.PI / 2 });
export const DEVIL_PALETTE = Object.freeze([0x96949b,0x62616b,0x44414b,0x25232c,0xb4afb3,0x78666e]);

export function createDevilBoxes() {
  const boxes=[];
  const box=(x,y,z,w,h,d,tone,part)=>boxes.push({x,y,z,w,h,d,tone,part});
  // Match the angel's base dimensions and height without leaving the old base.
  box(0,0,0,6,.4,6,1,'foundation');
  box(0,.4,0,4,4.05,4.4,1,'pedestal');
  box(0,.65,0,4.08,.15,4.48,2,'pedestal-trim');
  box(0,4.45,0,4.45,.2,4.85,2,'pedestal-trim');
  box(0,4.65,0,4.6,.15,5,0,'pedestal-trim');
  box(0,1.3,2.215,2.5,2.3,.035,2,'pedestal-panel');
  box(0,1.4,2.24,2.3,2.1,.035,1,'pedestal-panel');
  for(const x of [-1.78,1.78])box(x,.9,2.23,.2,3.2,.12,0,'pedestal-trim');
  const foot=4.8;
  for(const side of [-1,1]) {
    box(side*.65,foot,.25,1,.3,1.3,3,'hooves');
    box(side*.65,foot+.12,.46,.68,.23,1.02,1,'hooves');
  }
  for(let row=0;row<9;row++) {
    const half=1.7-row*.09;
    box(0,foot+.25+row*.2,.05,half*2,.2,1.65,row<2?3:5,'seated-robe');
  }
  box(0,foot+1.65,.08,2.05,.65,1.5,1,'torso');
  // A solid rounded skull, tapering into the goat's long pointed jaw.
  for(let row=0;row<18;row++) {
    const y=foot+1.5+row*.2,v=(row-9)/9;
    const half=row<8 ? .27+row*.14 : Math.max(.25,1.55*Math.sqrt(Math.max(0,1-v*v)));
    box(0,y,-.12,half*2,.2,1.9,2,'head-back');
    box(0,y,.85,half*2,.2,.2,3,'head-outline');
    if(row>1&&row<17)box(0,y,1,Math.max(.2,half*2-.32),.2,.2,0,'goat-face');
  }
  for(let row=0;row<7;row++) {
    const half=.22+row*.13;
    box(0,foot+1.6+row*.2,1.13,half*2,.2,.34,row<2?2:0,'pointed-jaw');
  }
  box(0,foot+3.05,1.22,.42,.75,.45,4,'goat-snout');
  box(0,foot+2.95,1.44,.68,.26,.25,0,'goat-snout');
  for(const side of [-1,1])box(side*.2,foot+3,1.59,.14,.13,.04,3,'nostrils');
  box(0,foot+2.58,1.37,1.08,.22,.13,3,'mouth');
  for(const x of [-.36,-.12,.12,.36])box(x,foot+2.65,1.46,.12,.12,.06,4,'teeth');
  for(const side of [-1,1]) {
    // Stepped slanted black eyes and brows, rather than a human face.
    for(let i=0;i<3;i++)box(side*(.48+i*.19),foot+3.35+i*.1,1.14,.25,.24,.12,3,'eye');
    box(side*1.43,foot+3.8,.15,.6,.35,.65,1,'goat-ear');
    // Two upward-curving horns with visible light ridges.
    for(let i=0;i<10;i++) {
      const x=side*(.98+Math.sin(i/9*Math.PI)*.43),y=foot+4.35+i*.22,w=.5-i*.035;
      box(x,y,.02,w,.25,.65,1,'horn');
      box(x,y,.37,w*.72,.13,.04,i%2?0:4,'horn-ridge');
    }
    // Folded bat wings sweep up behind the horns, then end beside the robe.
    for(let row=0;row<28;row++) {
      const t=row/27,outer=3.3-1.7*t,inner=1.55-.15*t;
      box(side*(inner+outer)/2,foot+.5+row*.22,-.65,outer-inner,.22,.6,3,'bat-wing');
      if(row>1&&row<26)box(side*(inner+outer)/2,foot+.54+row*.22,-.28,Math.max(.08,outer-inner-.22),.15,.08,1,'wing-membrane');
    }
    for(let i=0;i<3;i++)box(side*(2.35-i*.25),foot+1.05+i*.45,-.17,.15,.6,.09,0,'wing-rib');
  }
  // The room prop's characteristic asymmetric offering gesture.
  box(-1.45,foot+1.65,.72,.55,1.15,.65,2,'raised-arm');
  box(-1.67,foot+2.65,1.02,.62,.52,.64,0,'raised-hand');
  box(-1.84,foot+3.1,1.02,.18,.5,.26,0,'raised-finger');
  box(1.6,foot+1.45,.72,.6,.65,.65,2,'lowered-arm');
  box(1.85,foot+1.47,1.05,.95,.22,.72,0,'open-hand');
  box(0,foot+4.17,1.14,.18,.25,.1,3,'forehead-mark');
  return boxes;
}

// Source GLB coordinates were measured before this bounded runtime cut. A
// triangle spanning outside the old monument is preserved, including ground
// and palace geometry. No source asset is rewritten.
export function removeHorseGeometry(geometry) {
  const p=geometry.attributes.position,idx=geometry.index,keep=[];
  const count=idx?idx.count:p.count;
  const inside=i=>p.getX(i)>=-66.3&&p.getX(i)<=-58.9&&p.getZ(i)>=16.1&&p.getZ(i)<=22.3&&p.getY(i)>=-.05&&p.getY(i)<=12;
  let removed=0;
  for(let i=0;i<count;i+=3) {
    const a=idx?idx.getX(i):i,b=idx?idx.getX(i+1):i+1,c=idx?idx.getX(i+2):i+2;
    if(inside(a)&&inside(b)&&inside(c))removed++;else keep.push(a,b,c);
  }
  if(removed)geometry.setIndex(keep);
  return removed;
}
