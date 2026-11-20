/**
 * Footera Player Evolution – Step 1: isolated 52-joint rig and pose ownership.
 *
 * Not imported by the live renderer. A new model must pass auditFooteraRig()
 * before it may enter Step 2. All animation writers submit complete LOCAL
 * joint quaternions to the director; only commit() writes the skeleton.
 *
 * Coordinate system: metres, +Y up. Imported glTF rest transforms are kept;
 * no assumptions about Mixamo / MetaHuman / Quaternius bone local axes.
 */
import * as THREE from './vendor/three/three.module.min.js';

const CORE = [
 ['pelvis',null],['spine_01','pelvis'],['spine_02','spine_01'],
 ['spine_03','spine_02'],['neck_01','spine_03'],['Head','neck_01']
];
const SIDES = ['l','r'];
const FINGERS = ['thumb','index','middle','ring','pinky'];
const definition = [...CORE];
for (const side of SIDES) {
 for (const [bone,parent] of [
  ['clavicle','spine_03'],['upperarm','clavicle'],['lowerarm','upperarm'],
  ['hand','lowerarm'],['thigh','pelvis'],['calf','thigh'],
  ['foot','calf'],['ball','foot']
 ]) definition.push([bone+'_'+side,parent.includes('_')?parent:parent+'_'+side]);
 for (const finger of FINGERS)
  for (let joint=1;joint<=3;joint++)
   definition.push([finger+'_0'+joint+'_'+side,
    joint===1?'hand_'+side:finger+'_0'+(joint-1)+'_'+side]);
}
export const FOOTERA_EVOLUTION_BONES = Object.freeze(
 definition.map(([name,parent])=>Object.freeze({name,parent}))
);
export const FOOTERA_EVOLUTION_LAYERS = Object.freeze(
 {base:0,locomotion:10,action:20,contact:30,ik:40}
);
const finite = n=>Number.isFinite(n);
const quaternionOk = q=>q&&[q.x,q.y,q.z,q.w].every(finite)&&
 Math.abs(q.x*q.x+q.y*q.y+q.z*q.z+q.w*q.w-1)<.02;
const boneNames = new Set(FOOTERA_EVOLUTION_BONES.map(b=>b.name));

export function collectFooteraBones(root) {
 const map=new Map(),duplicates=[];
 if (!root||typeof root.traverse!=='function')
  throw new TypeError('Footera rig requires a THREE.Object3D root');
 root.traverse(node=>{
  if (!node.isBone) return;
  if (map.has(node.name)) duplicates.push(node.name);
  else map.set(node.name,node);
 });
 return {bones:map,duplicates};
}

/** Read-only inspection. Never changes source geometry or animation. */
export function auditFooteraRig(root,{checkSkin=true}={}) {
 const {bones,duplicates}=collectFooteraBones(root);
 const errors=[],warnings=[];
 for (const duplicate of duplicates) errors.push('duplicate-bone:'+duplicate);
 for (const {name,parent} of FOOTERA_EVOLUTION_BONES) {
  const bone=bones.get(name);
  if (!bone) { errors.push('missing-bone:'+name); continue; }
  if (parent && bone.parent?.name!==parent)
   errors.push('wrong-parent:'+name+':expected='+parent+':got='+(bone.parent?.name||'none'));
  if (!quaternionOk(bone.quaternion)) errors.push('invalid-rest-rotation:'+name);
  const s=bone.scale,p=bone.position;
  if (![s.x,s.y,s.z,p.x,p.y,p.z].every(finite)||
      Math.min(Math.abs(s.x),Math.abs(s.y),Math.abs(s.z))<1e-6)
   errors.push('invalid-rest-transform:'+name);
 }
 let skinnedMeshes=0,checkedVertices=0;
 if (checkSkin) root.traverse(node=>{
  if (!node.isSkinnedMesh) return;
  skinnedMeshes++;
  const skin=node.skeleton,weights=node.geometry?.getAttribute('skinWeight'),
   indices=node.geometry?.getAttribute('skinIndex');
  if (!skin?.bones?.length||!weights||!indices||weights.count!==indices.count) {
   errors.push('missing-skin-data:'+node.name);return;
  }
  if (skin.bones.some(b=>!bones.has(b.name)||bones.get(b.name)!==b))
   errors.push('unbound-skin-bone:'+node.name);
  // Sample the vertex influences across the mesh without modifying buffers.
  const step=Math.max(1,Math.floor(weights.count/4096));
  for(let i=0;i<weights.count;i+=step){
   checkedVertices++;
   let sum=0;
   for(let k=0;k<4;k++){
    const w=weights.getComponent(i,k),joint=indices.getComponent(i,k);
    if(!finite(w)||w<-.0001||w>1.0001) {errors.push('invalid-skin-weight:'+node.name);return}
    if(w>.00001&&(!Number.isInteger(joint)||joint<0||joint>=skin.bones.length)) {
     errors.push('invalid-skin-joint:'+node.name);return;
    }
    sum+=w;
   }
   if(Math.abs(sum-1)>.035){errors.push('unnormalized-skin-weight:'+node.name);return}
  }
 });
 if (checkSkin&&skinnedMeshes===0) warnings.push('no-skinned-mesh');
 return {ok:errors.length===0,boneCount:bones.size,skinnedMeshes,checkedVertices,errors,warnings};
}
function validRig(root) {
 const report=auditFooteraRig(root,{checkSkin:false});
 if (!report.ok) throw new Error('Footera evolution rig invalid: '+report.errors.join(', '));
 return collectFooteraBones(root).bones;
}

/**
 * Retarget in ROOT-relative world space, not by copying source local Euler
 * angles. This preserves the target's own bind pose, even when local limb axes
 * or player-root facings differ. sample() returns LOCAL target quaternions;
 * it does not mutate the target skeleton.
 */
export function createFooteraEvolutionRetargeter(sourceRoot,targetRoot) {
 const source=validRig(sourceRoot),target=validRig(targetRoot);
 sourceRoot.updateMatrixWorld(true);targetRoot.updateMatrixWorld(true);
 const sourceRest=new Map(),targetRest=new Map();
 const sRootInv=sourceRoot.getWorldQuaternion(new THREE.Quaternion()).invert();
 const tRootInv=targetRoot.getWorldQuaternion(new THREE.Quaternion()).invert();
 for(const {name} of FOOTERA_EVOLUTION_BONES){
  sourceRest.set(name,sRootInv.clone().multiply(source.get(name).getWorldQuaternion(new THREE.Quaternion())));
  targetRest.set(name,tRootInv.clone().multiply(target.get(name).getWorldQuaternion(new THREE.Quaternion())));
 }
 function sample(){
  sourceRoot.updateMatrixWorld(true);targetRoot.updateMatrixWorld(true);
  const srInv=sourceRoot.getWorldQuaternion(new THREE.Quaternion()).invert();
  const trWorld=targetRoot.getWorldQuaternion(new THREE.Quaternion());
  const desiredWorld=new Map(),pose=new Map();
  for(const {name,parent} of FOOTERA_EVOLUTION_BONES){
   const current=srInv.clone().multiply(source.get(name).getWorldQuaternion(new THREE.Quaternion()));
   const delta=current.multiply(sourceRest.get(name).clone().invert());
   const world=trWorld.clone().multiply(delta).multiply(targetRest.get(name));
   const actualParent=target.get(name).parent;
   const parentWorld=parent&&actualParent===target.get(parent)
    ?desiredWorld.get(parent)
    :actualParent.getWorldQuaternion(new THREE.Quaternion());
   pose.set(name,parentWorld.clone().invert().multiply(world).normalize());
   desiredWorld.set(name,world);
  }
  return pose;
 }
 return {sample,sourceBoneCount:source.size,targetBoneCount:target.size};
}

/**
 * Exclusive per-joint pose writer. Overlays have explicit precedence and
 * optional blend weights, preventing several systems from mutating a bone in
 * unpredictable order. No automatic IK or procedural additive rotations.
 */
export function createFooteraPoseDirector(root) {
 const bones=validRig(root),rest=new Map();
 for(const {name} of FOOTERA_EVOLUTION_BONES)
  rest.set(name,bones.get(name).quaternion.clone());
 let claims=new Map(),overrides=[];
 function beginFrame(){claims=new Map();overrides=[]}
 function submit(layer,pose,{weight=1}={}){
  const priority=FOOTERA_EVOLUTION_LAYERS[layer];
  if(priority===undefined)throw new Error('Unknown pose layer: '+layer);
  if(!finite(weight)||weight<0||weight>1)throw new RangeError('Pose weight must be in [0,1]');
  if(weight===0)return;
  const entries=pose instanceof Map?pose.entries():Object.entries(pose||{});
  for(const [name,q] of entries){
   if(!boneNames.has(name)||!bones.has(name))throw new Error('Unknown pose joint: '+name);
   if(!quaternionOk(q))throw new Error('Invalid pose quaternion: '+name);
   const prior=claims.get(name);
   if(prior&&prior.priority===priority)
    throw new Error('Duplicate pose owner for '+name+': '+layer);
   if(prior&&prior.priority>priority)continue;
   const base=prior?.q||rest.get(name),next=base.clone().slerp(q,weight).normalize();
   if(prior)overrides.push({joint:name,from:prior.layer,to:layer});
   claims.set(name,{q:next,layer,priority});
  }
 }
 function commit(){
  for(const {name} of FOOTERA_EVOLUTION_BONES)
   bones.get(name).quaternion.copy(claims.get(name)?.q||rest.get(name));
  root.updateMatrixWorld(true);
  return {written:FOOTERA_EVOLUTION_BONES.length,owners:new Map(
   [...claims].map(([name,x])=>[name,x.layer])),overrides:[...overrides]};
 }
 beginFrame();
 return {beginFrame,submit,commit,boneCount:bones.size};
}
