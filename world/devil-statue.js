// Original voxel interpretation of Isaac's stationary Devil Room statue.
// Local +z is its face. Both monuments face east toward the pyramid.
export const DEVIL_PLACEMENT = Object.freeze({ x: -62.6, z: 19.2, yaw: Math.PI / 2 });
export const DEVIL_PALETTE = Object.freeze([0xaaa5a7,0x747078,0x4c4853,0x29252e,0xccc4bd,0x7b6268]);

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
    box(side*.65,foot+.12,.98,.06,.22,.035,3,'hoof-cleft');
  }
  for(let row=0;row<16;row++) {
    const t=row/15,half=1.72-.75*t;
    box(0,foot+.25+row*.11,.05,half*2,.11,1.65,row<2?3:5,'seated-robe');
  }
  for(const x of [-1.1,-.55,0,.55,1.1]) for(let row=0;row<2;row++)
    box(x*(1-row*.12),foot+.42+row*.4,.89,.08,.33,.04,2,'robe-fold');
  box(0,foot+1.65,.08,2.05,.65,1.5,1,'torso');
  // Finer slices round the skull in depth as well as in silhouette. The
  // exposed dark rim separates cheek and temple facets from the folded wings.
  for(let row=0;row<32;row++) {
    const t=row/31,y=foot+1.5+row*.11;
    const half=t<.43 ? .26+2.65*t : 1.53*Math.sqrt(Math.max(.03,1-((t-.56)/.47)**2));
    const front=1.03+.23*Math.sin(Math.PI*t),depth=1.45+.52*Math.sin(Math.PI*t);
    box(0,y,front-depth/2,half*2,.11,depth,2,'head-back');
    box(0,y,front,Math.max(.15,half*2-.2),.11,.12,row<2?1:0,'goat-face');
    if(row>=9&&row<=24&&row%2===0)for(const side of [-1,1])
      box(side*(half-.14),y,front+.08,.16,.21,.13,1,'cheek-facet');
  }
  for(let row=0;row<10;row++) {
    const half=.17+row*.065;
    box(0,foot+1.56+row*.11,1.13+row*.015,half*2,.11,.22,row<2?2:1,'pointed-jaw');
  }
  for(let row=0;row<8;row++)
    box(0,foot+2.9+row*.1,1.43-row*.025,.52-row*.035,.1,.25,row>4?4:0,'goat-snout');
  box(0,foot+2.9,1.57,.68,.24,.24,1,'goat-snout');
  for(const side of [-1,1])box(side*.2,foot+2.95,1.706,.115,.085,.035,3,'nostrils');
  box(0,foot+2.57,1.44,1.02,.17,.12,3,'mouth');
  box(0,foot+2.51,1.46,.77,.07,.1,1,'lower-lip');
  for(const x of [-.34,-.2,-.065,.065,.2,.34])box(x,foot+2.65,1.51,.065,.065,.04,4,'teeth');
  for(const side of [-1,1]) {
    // Recessed slanted sockets with a projecting stone brow.
    for(let i=0;i<5;i++) {
      const x=side*(.42+i*.13),y=foot+3.28+i*.075;
      box(x,y,1.29,.19,.14,.12,3,'eye');
      box(x,y+.15,1.35,.2,.09,.17,1,'brow');
    }
    for(let i=0;i<3;i++)box(side*(1.36+i*.12),foot+3.7-i*.07,.4,.28,.16,.52,i===1?0:1,'goat-ear');
    // Narrow, hooked horns: smaller overlapping slices replace coarse posts.
    for(let i=0;i<16;i++) {
      const t=i/15,x=side*(.98+.55*Math.sin(Math.PI*t)-.2*t),y=foot+4.35+1.95*t,w=.43-.3*t;
      box(x,y,.04+t*.16,w,.15,.47-.2*t,1,'horn');
      if(i%3===0)box(x,y,.29+t*.06,w*.7,.055,.045,0,'horn-ridge');
    }
    // Curved leading edges and narrow lower tips give folded wings their own
    // contour. The membrane stays behind the face and the offering hands.
    for(let row=0;row<36;row++) {
      const t=row/35,outer=1.48+1.86*(1-t)**.8,inner=1.4+1.68*Math.exp(-10*t)-.1*t;
      box(side*(inner+outer)/2,foot+.5+row*.17,-.65,outer-inner,.17,.6,3,'bat-wing');
      if(row>1&&row<34)box(side*(inner+outer)/2,foot+.52+row*.17,-.3,Math.max(.06,outer-inner-.18),.13,.1,1,'wing-membrane');
    }
    for(let rib=0;rib<2;rib++)for(let i=0;i<7;i++) {
      const t=i/6;
      box(side*(2.82-.8*t-rib*.28),foot+.85+t*2.8+rib*.3,-.21,.095,.48,.06,rib?2:0,'wing-rib');
    }
  }
  box(-1.4,foot+1.65,.7,.46,.7,.6,2,'raised-arm');
  box(-1.57,foot+2.24,.9,.4,.5,.52,1,'raised-arm');
  box(-1.67,foot+2.65,1.08,.48,.42,.44,0,'raised-hand');
  for(const [x,y] of [[-1.83,3.02],[-1.67,3.12]])box(x,foot+y,1.1,.12,.42,.18,0,'raised-finger');
  for(let i=0;i<2;i++)box(-1.53+i*.13,foot+2.84,1.34,.1,.18,.15,1,'curled-finger');
  box(-1.94,foot+2.74,1.23,.18,.16,.21,0,'thumb');
  box(1.42,foot+1.6,.7,.48,.55,.6,2,'lowered-arm');
  box(1.68,foot+1.48,.94,.45,.28,.52,1,'lowered-arm');
  box(1.88,foot+1.53,1.15,.72,.16,.52,0,'open-hand');
  for(let i=0;i<4;i++)box(1.62+i*.17,foot+1.6,1.47,.12,.11,.32-(i===3?.1:0),0,'offering-finger');
  box(1.48,foot+1.64,1.19,.2,.14,.21,0,'thumb');
  for(const [y,w] of [[4.08,.12],[4.2,.25],[4.32,.12]])box(0,foot+y,1.2,w,.12,.065,3,'forehead-mark');
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
