/**
 * Footera Player Evolution 2.0 / Step 12 — experimental world-space plant lock.
 *
 * Original captured Mixamo ankle/heel/toe trajectories decide when a leg is
 * eligible for stance; this controller NEVER authors replacement joint tracks.
 * Each eligible touchdown stores an immutable world-space ankle target, adjusted
 * once for measured sole-to-flat-ground distance. That target stays FIXED until
 * toe-off. A two-bone IK layer is responsible for reaching it.
 *
 * If a contact is unreachable, the residual is reported, not silently hidden.
 * Independent per player; resets on timeline seek/key discontinuity. Laboratory
 * flat plane ONLY, not authoritative game terrain or match-root physics.
 */
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t)};
const sides=['l','r'];
const finite3=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
const distXZ=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);

export function footeraCapturedStance(phase,side){
 if(!Number.isFinite(phase)||!sides.includes(side))throw new RangeError('Invalid gait phase');
 const p=((phase+(side==='r'?.5:0))%1+1)%1;
 return smooth(0,.08,p)*(1-smooth(.43,.55,p));
}

export function createFooteraPlantLock({groundY=0,clearance=.003,
 engage=.18,release=.08,resetGap=.24,maxContactDrop=.30}={}){
 if(![groundY,clearance,engage,release,resetGap,maxContactDrop].every(Number.isFinite)||
  Math.abs(groundY)>.3||clearance<0||clearance>.02||
  release<0||engage<=release||engage>1||
  resetGap<=0||resetGap>1||maxContactDrop<=0||maxContactDrop>.45)
  throw new RangeError('Invalid foot contact lock configuration');
 let last=null;
 let plants={l:null,r:null};
 function reset(){last=null;plants={l:null,r:null}}
 function validateFeet(feet){
  for(const side of sides){
   const f=feet?.[side];
   if(!finite3(f?.ankle)||!finite3(f?.heel)||!finite3(f?.toe)||
    !Number.isFinite(f.lowest))throw new TypeError('Missing measured 3D shoe: '+side);
  }
 }
 function sample({time,key,feet,phase=null,supportSide=null,
  supportWeight=1,supportProgress=0}={}){
  if(!Number.isFinite(time)||time<0||typeof key!=='string'||!key||
    (phase===null&&!sides.includes(supportSide))||
    (phase!==null&&!Number.isFinite(phase))||
    !Number.isFinite(supportWeight)||supportWeight<0||supportWeight>1||
    !Number.isFinite(supportProgress)||supportProgress<0||supportProgress>1)
   throw new RangeError('Invalid contact timeline');
  validateFeet(feet);
  const dt=last&&last.key===key?time-last.time:Infinity;
  if(!last||last.key!==key||dt<0||dt>resetGap)reset();
  const out={};
  for(const side of sides){
   const f=feet[side],weight=phase===null
    ?(side===supportSide?supportWeight:0):footeraCapturedStance(phase,side);
   const old=plants[side];
   const eligible=old?weight>release:weight>=engage;
   if(!eligible){
    plants[side]=null;
    out[side]={locked:false,weight:0,anchor:null,progress:0,
     phase:'swing',touchdown:false,unreachable:false,
     driftXZ:0,soleHeight:f.lowest-groundY};
    continue;
   }
   let touchdown=false;
   if(!old){
    // The ankle is moved along world Y so its CURRENT measured outsole would
    // touch the plane. This is not a rigid-ankle-to-floor assumption.
    const delta=groundY+clearance-f.lowest;
    plants[side]={anchor:[f.ankle[0],f.ankle[1]+delta,f.ankle[2]],
     startTime:time,soleAtTouch:f.lowest,initialDrop:delta};
    touchdown=true;
   }
   const plant=plants[side];
   const progress=phase===null?supportProgress:
    ((phase+(side==='r'?.5:0))%1+1)%1/.55;
   out[side]={locked:true,weight,anchor:[...plant.anchor],
    progress:clamp(progress),phase:progress<.16?'heel-strike':
     progress>.77?'toe-off':'mid-stance',
    touchdown,unreachable:Math.abs(plant.initialDrop)>maxContactDrop,
    initialDrop:plant.initialDrop,driftXZ:distXZ(f.ankle,plant.anchor),
    soleHeight:f.lowest-groundY,age:time-plant.startTime};
  }
  last={time,key};
  return{key,time,feet:out,anchors:Object.fromEntries(sides
   .filter(s=>out[s].locked).map(s=>[s,out[s].anchor])),
   weights:Object.fromEntries(sides.map(s=>[s,out[s].weight])),
   phases:Object.fromEntries(sides.map(s=>[s,out[s].progress])),
   active:sides.filter(s=>out[s].locked),
   source:'original Mixamo captured pose + world-space planted ankle/sole targets'};
 }
 function measure(feet){
  validateFeet(feet);
  return Object.fromEntries(sides.map(side=>{
   const f=feet[side],p=plants[side];
   const heelHeight=f.heel[1]-groundY,toeHeight=f.toe[1]-groundY;
   return[side,{locked:!!p,driftXZ:p?distXZ(f.ankle,p.anchor):null,
    soleHeight:f.lowest-groundY,hover:p?Math.max(0,f.lowest-groundY):null,
    penetration:Math.max(0,groundY-f.lowest),
    heelHeight,toeHeight,
    heelToeDelta:toeHeight-heelHeight,
    initialDrop:p?.initialDrop??null,
    unreachable:!!p&&Math.abs(p.initialDrop)>maxContactDrop}];
  }));
 }
 return{sample,measure,reset,limits:{groundY,clearance,engage,release,resetGap,maxContactDrop}};
}
