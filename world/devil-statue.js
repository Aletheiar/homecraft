// Original voxel interpretation of Isaac's stationary Devil Room statue.
// Local +z is its face. Both monuments face east toward the pyramid.
export const DEVIL_PLACEMENT = Object.freeze({ x: -62.6, z: 19.2, yaw: Math.PI / 2 });
export const DEVIL_PALETTE = Object.freeze([0xaaa5a7,0x747078,0x4c4853,0x29252e,0xccc4bd,0x8c8588]);

export function createDevilBoxes() {
  const boxes = [];
  const box = (x,y,z,w,h,d,tone,part,rotation={}) => boxes.push({x,y,z,w,h,d,tone,part,...rotation});
  const foot = 4.8;
  // Keep the monument base; all figure coordinates below are above its cap.
  box(0,0,0,6,.4,6,1,'foundation');
  box(0,.4,0,4,4.05,4.4,1,'pedestal');
  box(0,.65,0,4.08,.15,4.48,2,'pedestal-trim');
  box(0,4.45,0,4.45,.2,4.85,2,'pedestal-trim');
  box(0,4.65,0,4.6,.15,5,0,'pedestal-trim');
  box(0,1.3,2.215,2.5,2.3,.035,2,'pedestal-panel');
  box(0,1.4,2.24,2.3,2.1,.035,1,'pedestal-panel');
  for (const x of [-1.78,1.78]) box(x,.9,2.23,.2,3.2,.12,0,'pedestal-trim');

  // Scan polygon outlines into contiguous horizontal stone runs. Overlap is
  // only 2 mm, avoiding light pinholes between separately transformed runs.
  function shape(points, front, depth, tone, part, step=.12, columns=1) {
    const lo=Math.min(...points.map(p=>p[1])),hi=Math.max(...points.map(p=>p[1]));
    const rows=Math.ceil((hi-lo)/step),h=(hi-lo)/rows;
    for(let row=0;row<rows;row++) {
      const y=lo+(row+.5)*h,cuts=[];
      for(let i=0;i<points.length;i++) {
        const a=points[i],b=points[(i+1)%points.length];
        if((a[1]>y)!==(b[1]>y))cuts.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]));
      }
      cuts.sort((a,b)=>a-b);
      for(let i=0;i<cuts.length;i+=2) {
        const w=(cuts[i+1]-cuts[i])/columns;
        for(let col=0;col<columns;col++) {
          const x=cuts[i]+(col+.5)*w,z=typeof front==='function'?front(y,x):front;
          const slope=columns>1?(front(y,x+.001)-front(y,x-.001))/.002:0;
          box(x,foot+y-h/2,z-depth/2,w*Math.hypot(1,slope),h+.002,depth,tone,part,{ry:-Math.atan(slope)});
        }
      }
    }
  }
  const mirror=(points,side)=>points.map(([x,y])=>[x*side,y]);
  function rounded(x,cy,z,rx,ry,rz,tone,part,rows=10) {
    for(let i=0;i<rows;i++) {
      const v=(i+.5)/rows*2-1,k=Math.sqrt(1-v*v),h=2*ry/rows;
      box(x,foot+cy-ry+i*h,z,2*rx*k,h+.002,2*rz*k,tone,part);
    }
  }
  function curve(p,n=16) {
    return Array.from({length:n+1},(_,i)=>{
      const t=i/n,u=1-t;
      return [0,1].map(k=>u*u*u*p[0][k]+3*u*u*t*p[1][k]+3*u*t*t*p[2][k]+t*t*t*p[3][k]);
    });
  }
  function ridge(points,side,z,width,depth,tone,part) {
    for(let i=0;i<points.length-1;i++) {
      const a=points[i],b=points[i+1],az=typeof z==='function'?z(a[1]):z,bz=typeof z==='function'?z(b[1]):z;
      const dx=side*(b[0]-a[0]),dy=b[1]-a[1],dz=bz-az,length=Math.hypot(dx,dy,dz);
      box(side*(a[0]+b[0])/2,foot+(a[1]+b[1])/2-length/2,(az+bz)/2,width,length+.025,depth,tone,part,
        {rx:Math.atan2(dz,dy),rz:-Math.atan2(dx,Math.hypot(dy,dz))});
    }
  }

  // Crouching figure: broad bent knees, folded shins and small tucked hooves.
  // There is no triangular skirt or standing lower body.
  rounded(0,1.53,-.35,1.12,1.05,.72,2,'torso',13);
  for(const side of [-1,1]) {
    rounded(side*1.04,.76,.4,.91,.48,.87,5,'crouched-knee',8);
    shape(mirror([[.25,.34],[.72,.6],[1.55,.55],[1.47,.29],[.6,.2]],side),.86,.42,1,'folded-shin',.1);
    rounded(side*.73,.18,.45,.48,.18,.57,2,'hooves',4);
    box(side*.73,foot+.12,1.02,.055,.16,.03,3,'hoof-cleft');
  }
  box(0,foot+.61,1.34,.19,.08,.035,2,'knee-crease');

  // The reference has a rounded face disc with a small lower projection,
  // rather than a long triangular goat beard. Keep cheeks full below the eyes.
  const skull=[[0,1.91],[-.52,1.98],[-.94,2.2],[-1.24,2.56],[-1.37,3.02],[-1.29,3.5],[-.98,3.86],[-.52,4.04],[0,4.08],[.52,4.04],[.98,3.86],[1.29,3.5],[1.37,3.02],[1.24,2.56],[.94,2.2],[.52,1.98]];
  const face=[...skull].map(([x,y])=>[x*.92,y+.035]);
  shape(skull,y=>1.13+.15*Math.sin((y-1.25)/2.8*Math.PI),1.75,2,'head-back',.11);
  shape(face,(y,x)=>1.25+.15*Math.sin((y-1.25)/2.8*Math.PI)-.16*(x/1.4)**2,.13,0,'goat-face',.12,3);
  for(const side of [-1,1]) {
    shape(mirror([[.21,3.35],[.4,3.4],[.97,3.43],[1.05,3.34],[.55,3.24],[.26,3.15]],side),1.54,.21,0,'brow',.09);
    shape(mirror([[.35,3.02],[.63,3.07],[.97,3.2],[.87,3.02],[.67,2.91],[.44,2.94]],side),1.495,.045,3,'eye',.055);
    shape(mirror([[1.02,2.83],[1.12,2.73],[1.02,2.52],[.84,2.45],[.91,2.68]],side),1.405,.1,0,'cheek-facet',.1);
    shape(mirror([[1.2,3.55],[1.78,3.39],[1.5,3.13],[1.16,3.26]],side),.91,.6,1,'goat-ear',.11);
    shape(mirror([[1.3,3.41],[1.59,3.35],[1.37,3.26]],side),1.23,.04,2,'ear-fold',.09);
  }
  shape([[-.12,3.36],[.12,3.36],[.18,2.79],[.38,2.48],[.27,2.27],[-.27,2.27],[-.38,2.48],[-.18,2.79]],1.7,.3,0,'goat-snout',.1);
  shape([[-.38,2.49],[0,2.37],[.38,2.49],[.23,2.21],[0,2.14],[-.23,2.21]],1.87,.24,1,'nose-pad',.08);
  for(const side of [-1,1]) box(side*.21,foot+2.32,1.995,.12,.075,.025,3,'nostrils');
  shape([[-.44,2.08],[-.25,2.13],[0,2.05],[.25,2.13],[.44,2.08],[.33,1.98],[0,1.94],[-.33,1.98]],1.62,.045,3,'mouth',.05);
  for(const x of [-.21,-.07,.07,.21]) box(x,foot+2.045,1.65,.055,.045,.035,0,'teeth');
  shape([[-.34,2.04],[-.3,1.82],[0,1.68],[.3,1.82],[.34,2.04]],1.55,.2,0,'pointed-jaw',.075);
  shape([[0,3.78],[-.14,3.6],[-.045,3.46],[-.045,3.2],[.045,3.2],[.045,3.46],[.14,3.6]],1.46,.035,3,'forehead-mark',.085);

  // Bowed wings. Their outer arch swells above the shoulder, bends at its
  // knuckle and opens into a low swept tip instead of a straight A-frame.
  const outside=[...curve([[1.49,4.96],[1.6,5.37],[1.91,5.34],[2.02,4.92]],9),
    ...curve([[2.02,4.92],[2.25,4.6],[2.75,4.32],[2.75,3.75]],9).slice(1),
    ...curve([[2.75,3.75],[2.5,3.05],[2.42,2.15],[3.38,1.13]],13).slice(1)];
  const inside=[[3.03,1.14],[2.72,1.38],[2.28,1.92],[1.93,2.35],[2.03,2.85],[1.72,3.18],[1.35,3.35],[1.3,3.75],[1.45,4.2],[1.49,4.96]];
  const wingFront=y=>.02+.38*Math.exp(-(((y-3.35)/1.0)**2));
  for(const side of [-1,1]) {
    const wing=[...outside,...inside];
    shape(mirror(wing,side),wingFront,.68,1,'bat-wing',.13);
    const membrane=wing.map(([x,y])=>[1.7+(x-1.7)*.85,3.18+(y-3.18)*.9]);
    shape(mirror(membrane,side),y=>wingFront(y)+.08,.12,0,'wing-membrane',.16);
    ridge(outside,side,y=>wingFront(y)+.13,.16,.19,0,'wing-leading-bone');
    ridge(curve([[1.64,3.3],[2.29,3.45],[2.35,2.38],[2.99,1.43]],11),side,y=>wingFront(y)+.17,.095,.12,2,'wing-rib');
    ridge(curve([[1.58,3.25],[2.15,3.04],[2.02,2.2],[2.6,1.65]],9),side,y=>wingFront(y)+.18,.08,.12,2,'wing-rib');
    // Horns sweep outward, hook in, and remain shorter than the old posts.
    const horn=[...curve([[.82,3.7],[.96,4.2],[1.08,4.45],[1.43,4.74]],11),
      ...curve([[1.43,4.74],[1.54,4.86],[1.4,4.95],[1.25,4.72]],6).slice(1)];
    horn.forEach(([x,y],i)=>{
      const width=.36-.24*i/(horn.length-1);
      box(side*x,foot+y-width/2,.36,width,width+.04,.45,0,'horn');
      if(i%4===0)box(side*x,foot+y-width/2,.61,width*.7,.055,.035,1,'horn-ridge');
    });
  }
  // Compact bent arms, a curled raised claw and the low open offering palm.
  rounded(-1.29,2.14,.52,.39,.57,.46,1,'raised-arm',7);
  rounded(-1.57,2.59,1.0,.36,.34,.3,0,'raised-hand',5);
  for(const [x,y]of[[-1.76,2.8],[-1.57,2.91],[-1.39,2.84]]) {
    box(x,foot+y,1.16,.12,.22,.16,1,'raised-finger');
    box(x+.035,foot+y+.16,1.27,.1,.09,.13,0,'curled-finger');
  }
  box(-1.28,foot+2.56,1.26,.15,.14,.19,0,'thumb');
  rounded(1.38,2.15,.47,.39,.5,.43,1,'lowered-arm',7);
  box(1.57,foot+1.77,.82,.39,.28,.48,1,'lowered-arm');
  rounded(1.72,1.62,1.09,.49,.13,.35,0,'open-hand',3);
  for(let i=0;i<4;i++)box(1.39+i*.19,foot+1.67,1.43,.14,.1,.24,0,'offering-finger');
  box(1.25,foot+1.72,1.15,.22,.12,.22,0,'thumb');
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
