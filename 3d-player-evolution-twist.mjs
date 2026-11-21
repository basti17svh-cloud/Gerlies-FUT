/**
 * Footera Player Evolution: non-live 60-bone twist correction controller.
 * Uses eight auxiliary skinned joints. Never modifies the original 52 primary
 * animation bones, so gait, kick and foot IK retain their source transforms.
 *
 * A source twist is decomposed about the rest-frame limb axis. The corrective
 * child rotates partially AGAINST the parent bone's total axial rotation,
 * distributing it down the surface instead of corkscrewing the entire limb.
 */
import * as THREE from './vendor/three/three.module.min.js';

export const FOOTERA_TWIST_SEGMENTS=Object.freeze(
 ['l','r'].flatMap(side=>[
  ['upperarm','lowerarm'],['lowerarm','hand'],
  ['thigh','calf'],['calf','foot']
 ].map(([part,end])=>Object.freeze({
  name:part+'_twist_'+side,
  parent:part+'_'+side, end:end+'_'+side,
  ratio:.50
 })))
);
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function inspectFooteraTwistRig(root,{requireSkin=true}={}){
 const bones=new Map(),meshes=[],errors=[],used=new Map();
 if(!root?.traverse)throw new TypeError('Expected Three.js model root');
 root.traverse(o=>{
  if(o.isBone){
   if(bones.has(o.name))errors.push('duplicate:'+o.name);
   bones.set(o.name,o);
  }
  if(o.isSkinnedMesh)meshes.push(o);
 });
 for(const d of FOOTERA_TWIST_SEGMENTS){
  const twist=bones.get(d.name),p=bones.get(d.parent),end=bones.get(d.end);
  if(!twist||!p||!end){errors.push('missing:'+d.name);continue}
  if(twist.parent!==p||end.parent!==p)
   errors.push('invalid-parent:'+d.name);
  if(!twist.position.toArray().every(Number.isFinite))
   errors.push('invalid-pivot:'+d.name);
  let usedCount=0;
  if(requireSkin){
   for(const mesh of meshes){
    const index=mesh.skeleton?.bones?.indexOf(twist)??-1;
    if(index<0)continue;
    const indices=mesh.geometry?.getAttribute('skinIndex');
    const weights=mesh.geometry?.getAttribute('skinWeight');
    if(!indices||!weights)continue;
    const get=['getX','getY','getZ','getW'];
    for(let i=0;i<indices.count;i++)
     for(const field of get)
      if(indices[field](i)===index&&weights[field](i)>.001){usedCount++;break}
   }
   if(usedCount<20)errors.push('twist-not-skinned:'+d.name);
  }
  used.set(d.name,usedCount);
 }
 return{ok:!errors.length,errors,auxiliaryBones:FOOTERA_TWIST_SEGMENTS.length,
  totalBones:bones.size,skinnedVertices:Object.fromEntries(used)};
}

export function createFooteraTwistSolver(root,{strength=1}={}){
 if(!Number.isFinite(strength)||strength<0||strength>1)
  throw new RangeError('Strength out of range');
 const check=inspectFooteraTwistRig(root,{requireSkin:false});
 if(!check.ok)throw new Error('Invalid twist rig: '+check.errors.join(','));
 const joints=new Map();
 root.traverse(o=>{if(o.isBone)joints.set(o.name,o)});
 const defs=FOOTERA_TWIST_SEGMENTS.map(d=>{
  const parent=joints.get(d.parent),child=joints.get(d.end),twist=joints.get(d.name);
  const axis=child.position.clone().normalize();
  if(axis.lengthSq()<.1)throw new Error('Degenerate limb axis: '+d.name);
  return {...d,parent,twist,axis,restParent:parent.quaternion.clone(),
   restTwist:twist.quaternion.clone()};
 });
 const delta=new THREE.Quaternion(),q=new THREE.Quaternion();
 function update(){
  for(const d of defs){
   delta.copy(d.restParent).invert().multiply(d.parent.quaternion).normalize();
   // Swing-twist decomposition in local rest-frame axes.
   const along=delta.x*d.axis.x+delta.y*d.axis.y+delta.z*d.axis.z;
   const angle=clamp(2*Math.atan2(along,delta.w),-Math.PI,Math.PI);
   // Counter-rotation prevents the distal portion from inheriting 100% of
   // the proximal bone's twist, without affecting the child joint chain.
   q.setFromAxisAngle(d.axis,-angle*d.ratio*strength);
   d.twist.quaternion.copy(d.restTwist).multiply(q).normalize();
  }
  root.updateMatrixWorld(true);
 }
 function reset(){
  for(const d of defs)d.twist.quaternion.copy(d.restTwist);
  root.updateMatrixWorld(true);
 }
 return{update,reset,segments:defs.length};
}
