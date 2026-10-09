/* Footera V21.60 – continuous, deterministic attacking runs.
 * Cubic Hermite tangents preserve forward velocity through authored scene
 * waypoints. The old smoothstep segments forced zero velocity at EVERY node.
 * This is visual presentation only: ball/result authority stays unchanged.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const slope=(a,b,axis)=>(b[axis]-a[axis])/(b[0]-a[0]);
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
export const ATTACK_FLOW_VERSION='21.60-continuous-carrier';
function tangent(nodes,index,axis){
 const end=nodes.length-1;
 if(index===0)return slope(nodes[0],nodes[1],axis)*.80;
 if(index===end)return slope(nodes[end-1],nodes[end],axis)*.78;
 const a=nodes[index-1],b=nodes[index],c=nodes[index+1],
  previous=slope(a,b,axis),next=slope(b,c,axis);
 // Lateral feints can reverse, but forward motion must not halt with them.
 if(previous*next<=0)return 0;
 const left=b[0]-a[0],right=c[0]-b[0];
 const average=(previous*right+next*left)/(left+right);
 // Prevent spline overshoot on unequal intervals / quick feints.
 return Math.sign(average)*Math.min(Math.abs(average),3*Math.min(Math.abs(previous),Math.abs(next)));
}
function hermite(p0,p1,v0,v1,u,dt){
 const u2=u*u,u3=u2*u;
 return (2*u3-3*u2+1)*p0+(u3-2*u2+u)*v0*dt+(-2*u3+3*u2)*p1+(u3-u2)*v1*dt;
}
function sampleSegment(a,b,startX,startZ,endX,endZ,time){
 const dt=b[0]-a[0],u=clamp((time-a[0])/dt,0,1);
 return [hermite(a[1],b[1],startX,endX,u,dt),hermite(a[2],b[2],startZ,endZ,u,dt)];
}
/**
 * Timed nodes: [[seconds, lateral metres, forward metres], ...].
 * Zero speed only where actually scripted (e.g. x component of a sharp feint),
 * never at every intermediate route point. The run-through after shooting
 * starts with the SAME velocity as the final approach: no hard stop on contact.
 */
export function sampleFlowRun(nodes,time,followX=.35,followZ=-1.9,followDuration=1.25){
 if(!Array.isArray(nodes)||nodes.length<2)throw new TypeError('Timed football path requires two or more nodes');
 const last=nodes.length-1,end=nodes[last],t=clamp(time,0,Number.MAX_SAFE_INTEGER);
 if(t>end[0]){
  const stop=end[0]+followDuration;
  if(t>=stop)return[end[1]+followX,end[2]+followZ];
  // A genuine follow-through eases from incoming momentum to a settled stance.
  return sampleSegment(end,[stop,end[1]+followX,end[2]+followZ],
   tangent(nodes,last,1),tangent(nodes,last,2),0,0,t);
 }
 for(let i=1;i<=last;i++)if(t<=nodes[i][0]){
  return sampleSegment(nodes[i-1],nodes[i],
   tangent(nodes,i-1,1),tangent(nodes,i-1,2),
   tangent(nodes,i,1),tangent(nodes,i,2),t);
 }
 return[end[1],end[2]];
}
export function flowSpeed(nodes,time,followX=.35,followZ=-1.9,followDuration=1.25){
 const epsilon=.001,t0=Math.max(0,time-epsilon),t1=time+epsilon;
 const a=sampleFlowRun(nodes,t0,followX,followZ,followDuration),
  b=sampleFlowRun(nodes,t1,followX,followZ,followDuration);
 return Math.hypot(b[0]-a[0],b[1]-a[1])/(t1-t0);
}
