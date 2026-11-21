/**
 * Footera Player Evolution Step 10: real skinned-boot flat-ground collision.
 * Preview only: never modifies original Mixamo, rig, or match root authority.
 */
import * as THREE from './vendor/three/three.module.min.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

/** Outsole candidates from original skinned boot vertices, not ankle bones. */
export function createFooteraCollisionSoles(root){
 if(!root?.traverse)throw new TypeError('Missing skinned player root');
 root.updateMatrixWorld(true);
 const sources={l:[],r:[]};
 root.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||!/boot/i.test(mesh.name)||!mesh.skeleton)return;
  const position=mesh.geometry?.getAttribute('position');
  const joints=mesh.geometry?.getAttribute('skinIndex');
  const weights=mesh.geometry?.getAttribute('skinWeight');
  if(!position||!joints||!weights)return;
  for(let i=0;i<position.count;i++){
   const influences={l:0,r:0};
   for(const axis of ['getX','getY','getZ','getW']){
    const bone=mesh.skeleton.bones[joints[axis](i)];
    const match=/^(?:foot|ball)_([lr])$/.exec(bone?.name||'');
    if(match)influences[match[1]]+=weights[axis](i);
   }
   for(const side of ['l','r']){
    if(influences[side]<.28)continue;
    const bind=new THREE.Vector3().fromBufferAttribute(position,i);
    mesh.localToWorld(bind);
    sources[side].push({mesh,position,index:i,bindHeight:bind.y});
   }
  }
 });
 for(const side of ['l','r']){
  if(sources[side].length<24)
   throw new Error('No actual skinned boot outsole: '+side);
  sources[side].sort((a,b)=>a.bindHeight-b.bindHeight);
  // Full weighted boot coverage: low bind-pose points alone may miss
  // sidewall and heel points becoming lowest after a strong foot rotation.
  // Collision must constrain every weighted vertex on BOTH real shoes.
 }
 const meshes=[...new Set([...sources.l,...sources.r].map(s=>s.mesh))];
 function sample({groundY=0}={}){
  if(!Number.isFinite(groundY))throw new RangeError('Invalid ground plane');
  root.updateMatrixWorld(true);
  for(const mesh of meshes)mesh.skeleton.update();
  const feet={};
  for(const side of ['l','r']){
   let lowest=Infinity,lowPoint=null;
   for(const s of sources[side]){
    const p=new THREE.Vector3().fromBufferAttribute(s.position,s.index);
    s.mesh.applyBoneTransform(s.index,p);
    s.mesh.localToWorld(p);
    if(p.y<lowest){lowest=p.y;lowPoint=p.toArray()}
   }
   feet[side]={lowest,lowPoint,penetration:Math.max(0,groundY-lowest),
    vertices:sources[side].length,meshCalibrated:true};
  }
  return{feet,lowest:Math.min(feet.l.lowest,feet.r.lowest),
   floorY:groundY,source:'live GLB skinned boot outsole vertices'};
 }
 return{sample,counts:{l:sources.l.length,r:sources.r.length}};
}

/**
 * Prospective sole-height controller with a hard collision lower bound.
 * Smooth when feasible; emergency height lifts are exposed, not hidden.
 */
export function createFooteraCollisionSafeContact({
 maxOffset=.25,maxRate=.72,maxAcceleration=10,leadTime=.10,
 resetGap=.20,clearance=.003
}={}){
 if(![maxOffset,maxRate,maxAcceleration,leadTime,resetGap,clearance].every(Number.isFinite)||
  maxOffset<=0||maxOffset>.4||maxRate<=0||maxRate>3||
  maxAcceleration<=0||maxAcceleration>40||leadTime<0||leadTime>.3||
  resetGap<=0||resetGap>1||clearance<0||clearance>.02)
  throw new RangeError('Invalid collision contact constraints');
 let previous=null;
 function reset(){previous=null}
 function sample({time,key,target,floorLowest,enabled=true}={}){
  if(!Number.isFinite(time)||time<0||!key||typeof key!=='string'||
   !Number.isFinite(target)||!Number.isFinite(floorLowest)||
   typeof enabled!=='boolean')throw new RangeError('Invalid collision contact sample');
  const required=clearance-floorLowest,hardBound=required;
  const desired=clamp(Math.max(target,hardBound),-maxOffset,maxOffset);
  const dt=previous?time-previous.time:0;
  if(!enabled||!previous||previous.key!==key||dt<0||dt>resetGap){
   const offset=desired;
   if(enabled)previous={key,time,offset,velocity:0,hardBound};
   else reset();
   return{offset,target:desired,required,hardBound,lookaheadBound:hardBound,
    residual:Math.max(0,required-offset),velocity:0,safetyOverride:false,
    limitExceeded:required>maxOffset,reset:true};
  }
  if(dt<1e-7)
   return{offset:previous.offset,target:desired,required,hardBound,
    lookaheadBound:hardBound,residual:Math.max(0,required-previous.offset),
    velocity:previous.velocity,safetyOverride:false,
    limitExceeded:required>maxOffset,reset:false};
  // One-sided rising constraint estimate from actual preceding sole samples.
  const rising=Math.max(0,(hardBound-previous.hardBound)/dt);
  const lookaheadBound=hardBound+Math.min(maxRate*1.8,rising)*leadTime;
  const request=clamp(Math.max(target,lookaheadBound),-maxOffset,maxOffset);
  const difference=request-previous.offset;
  const speed=Math.sign(difference)*Math.min(maxRate,
   Math.sqrt(2*maxAcceleration*Math.abs(difference)));
  let velocity=clamp(speed,previous.velocity-maxAcceleration*dt,
   previous.velocity+maxAcceleration*dt);
  let change=velocity*dt;
  if(Math.sign(change)!==Math.sign(difference))change=0;
  else if(Math.abs(change)>Math.abs(difference))change=difference;
  const smoothOffset=previous.offset+change;
  // The collision barrier takes precedence over bounded vertical velocity.
  const offset=clamp(Math.max(smoothOffset,hardBound),-maxOffset,maxOffset);
  const actualVelocity=(offset-previous.offset)/dt;
  const safetyOverride=offset>smoothOffset+1e-7;
  previous={key,time,offset,velocity:actualVelocity,hardBound};
  return{offset,target:request,required,hardBound,lookaheadBound,
   residual:Math.max(0,required-offset),velocity:actualVelocity,
   safetyOverride,limitExceeded:required>maxOffset,
   overRate:Math.max(0,Math.abs(actualVelocity)-maxRate),reset:false};
 }
 return{sample,reset,limits:{maxOffset,maxRate,maxAcceleration,leadTime,clearance}};
}
