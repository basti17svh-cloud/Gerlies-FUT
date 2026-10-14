// Deterministic presentation routes. Match events and ball ownership stay authoritative.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,u)=>a+(b-a)*u;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const STEP=1/60;

export function createDefensiveUnit({positionAt,ballAt,defenderIndex=8,ballWon=false,duration=10.4}){
 const indices=Array.from({length:8},(_,i)=>i+8);
 const press=defenderIndex;
 const remaining=indices.filter(i=>i!==press);
 // Assign once: no frame-to-frame swapping or whole defence chasing one ball.
 const shooter=positionAt(0,3.5);
 const marker=remaining.reduce((a,b)=>distance(positionAt(a,3.5),shooter)<distance(positionAt(b,3.5),shooter)?a:b);
 const cover=remaining.filter(i=>i!==marker).reduce((a,b)=>Math.abs(positionAt(a,0)[0])<Math.abs(positionAt(b,0)[0])?a:b);
 const roles=Object.fromEntries(indices.map(i=>[i,i===press?'press':i===cover?'cover':i===marker?'mark':'shape']));
 const frames=[],state=indices.map(i=>({p:positionAt(i,0).slice(),v:[0,0]}));
 function target(i,t){
  const reading=Math.max(0,Math.min(t-.18,ballWon?4.4:5.4));
  const b=ballAt(reading),runner=positionAt(0,reading),base=positionAt(i,Math.min(t,6.5));
  const side=(positionAt(i,0)[0]-runner[0])<0?-1:1;
  let p;
  if(i===press){
   // Approach on the goal side, then contain at a real standing-tackle distance.
   p=[b[0]+side*1.25,b[2]-1.45];
  }else if(i===cover){
   // Cover the inside channel behind the pressure, never the same destination.
   p=[mix(b[0],runner[0],.72)*.65,Math.max(-49,Math.min(b[2],runner[1])-5.2)];
  }else if(i===marker){
   p=[runner[0]-side*1.45,runner[1]-1.35];
  }else{
   p=[base[0]+clamp(b[0]*.16,-3.5,3.5),base[1]];
  }
  if(ballWon&&t>4.4)p[1]+=Math.min(3,(t-4.4)*1.1);
  return[clamp(p[0],-32,32),clamp(p[1],-50,0)];
 }
 // Place the three assigned roles before the scene begins; all subsequent
 // steps have bounded speed/acceleration, including pass and direction changes.
 for(let n=0;n<indices.length;n++)if(roles[indices[n]]!=='shape'&&!(ballWon&&indices[n]===press))state[n].p=target(indices[n],0);
 for(let k=0;k<=Math.ceil(duration/STEP);k++){
  const t=k*STEP;
  frames.push(state.map(s=>s.p.slice()));
  const desired=indices.map((i,n)=>{
   if(ballWon&&i===press)return null;
   const goal=target(i,t+STEP),s=state[n],v=[(goal[0]-s.p[0])*2,(goal[1]-s.p[1])*2];
   // Anticipate nearby bodies through steering, never by displacing roots.
   for(let j=0;j<state.length;j++)if(j!==n){
    const other=ballWon&&indices[j]===press?positionAt(press,t):state[j].p;
    const dx=s.p[0]-other[0],dz=s.p[1]-other[1],d=Math.hypot(dx,dz);
    if(d<2.2&&d>.001){const push=(2.2-d)*5;v[0]+=dx/d*push;v[1]+=dz/d*push}
   }
   for(let j=0;j<8;j++){
    const other=positionAt(j,t),dx=s.p[0]-other[0],dz=s.p[1]-other[1],d=Math.hypot(dx,dz);
    if(d<1.15&&d>.001){const push=(1.15-d)*7;v[0]+=dx/d*push;v[1]+=dz/d*push}
   }
   const max=i===press?6.8:6.2,speed=Math.hypot(...v);
   return speed>max?v.map(x=>x*max/speed):v;
  });
  for(let n=0;n<state.length;n++){
   const s=state[n],v=desired[n];
   if(!v){s.p=positionAt(press,t+STEP).slice();continue}
   const dv=[v[0]-s.v[0],v[1]-s.v[1]],a=Math.hypot(...dv),scale=a>5.2*STEP?5.2*STEP/a:1;
   s.v[0]+=dv[0]*scale;s.v[1]+=dv[1]*scale;
   s.p[0]+=s.v[0]*STEP;s.p[1]+=s.v[1]*STEP;
  }
 }
 return{roles,position(index,time){
  if(index<8||index>15||(ballWon&&index===press))return positionAt(index,time);
  const f=clamp(time/STEP,0,frames.length-1),a=Math.floor(f),b=Math.min(a+1,frames.length-1),u=f-a;
  return frames[a][index-8].map((v,j)=>mix(v,frames[b][index-8][j],u));
 }};
}
