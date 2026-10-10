/* Footera V21.94 - deterministic TV camera director.
 * A shot has one preplanned camera rail and one nearly fixed lens.
 * No frame-delta dependent snaps, per-pass cuts or reactive zoom pumping.
 * Presentation only; never touches match state or simulation randomness.
 */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
function cubic(a,b,c,d,t){
 const t2=t*t,t3=t2*t,m1=(c-a)*.5,m2=(d-b)*.5;
 return (2*t3-3*t2+1)*b+(t3-2*t2+t)*m1+(-2*t3+3*t2)*c+(t3-t2)*m2;
}
function limitTravel(before,current,maxDelta){
 const delta=current.map((n,i)=>n-before[i]),length=Math.hypot(...delta);
 return length>maxDelta?before.map((n,i)=>n+delta[i]*maxDelta/length):current;
}
/**
 * Derive the complete camera path once per event/aspect. Sampling never needs
 * a previous frame, so dropped frames, seeks and low-end phones cannot make the
 * lens or camera teleport. The goal/keeper and pitch are not modified.
 */
export function createStableCameraTrack(cameraAt,{duration=10.4,step=.05,sigma=.34,focusSpeed=12,railSpeed=14,fovFloor=27.5,fovCeiling=35.5}={}){
 if(typeof cameraAt!=='function')throw new TypeError('Camera sampler required');
 const count=Math.max(2,Math.ceil(duration/step)),dt=duration/count;
 const frames=Array.from({length:count+1},(_,i)=>cameraAt(i*dt));
 const radius=Math.ceil(2.5*sigma/dt),weighted=frames.map((_,i)=>{
  const position=[0,0,0],target=[0,0,0];let weightSum=0;
  for(let j=-radius;j<=radius;j++){
   const f=frames[clamp(i+j,0,count)],offset=j*dt,weight=Math.exp(-.5*(offset/sigma)**2);
   weightSum+=weight;
   for(let axis=0;axis<3;axis++){position[axis]+=f.position[axis]*weight;target[axis]+=f.target[axis]*weight}
  }
  return{position:position.map(x=>x/weightSum),target:target.map(x=>x/weightSum)};
 });
 for(let i=1;i<=count;i++){
  weighted[i].position=limitTravel(weighted[i-1].position,weighted[i].position,railSpeed*dt);
  weighted[i].target=limitTravel(weighted[i-1].target,weighted[i].target,focusSpeed*dt);
 }
 const requestedLens=frames.map(frame=>frame.fov).sort((a,b)=>a-b);
 // A fixed per-clip lens deliberately ignores isolated player-fit spikes.
 // Zoom is from the actual 3D dolly, not abruptly widening the field of view.
 const fov=clamp(requestedLens[Math.floor(requestedLens.length*.84)],fovFloor,fovCeiling);
 const axisAt=(t,key,axis)=>{
  const u=clamp(t,0,duration)/dt,i=Math.min(count-1,Math.floor(u)),v=u-i;
  const val=j=>weighted[clamp(j,0,count)][key][axis];
  return cubic(val(i-1),val(i),val(i+1),val(i+2),v);
 };
 return function sampleStableCamera(time){
  const t=clamp(Number.isFinite(time)?time:0,0,duration),push=smooth((t-2.1)/6);
  return{position:[0,1,2].map(axis=>axisAt(t,'position',axis)),
   target:[0,1,2].map(axis=>axisAt(t,'target',axis)),
   fov:fov-.42*push,
   distance:frames[Math.min(count,Math.round(t/dt))].distance,
   phase:frames[Math.min(count,Math.round(t/dt))].phase};
 };
}
