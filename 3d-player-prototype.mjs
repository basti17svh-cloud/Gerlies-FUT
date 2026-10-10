/* Footera 3D player prototype.
 * Real imported Quaternius CC0 humanoid glTF, not another primitive-based JS
 * figure. Drives its articulated skeleton from the existing visual animation.
 * One foreground scorer only; no change to authoritative match state.
 */
import * as THREE from './vendor/three/three.module.min.js';
import {sampleGlbBodyMotion} from './3d-glb-motion.mjs?v=2175';
import {createGlbClipLayer} from './3d-glb-clip-blend.mjs?v=2175';
import {createFooteraSurfaceMaps,vertexFooteraOcclusion} from './3d-player-materials.mjs?v=2178';
import {footeraAtlasUV} from './3d-rigged-footballer.mjs?v=2190';

const ASSET_URL=new URL('./assets/footera/models/footballer-prototype.glb',import.meta.url);
const MAKEHUMAN_URL=new URL('./assets/footera/models/makehuman-male.glb',import.meta.url);
const REQUIRED=['pelvis','spine_01','spine_03','Head','upperarm_l','upperarm_r',
 'lowerarm_l','lowerarm_r','thigh_l','thigh_r','calf_l','calf_r','foot_l','foot_r'];
let source=null,pending=null,sourceMakeHuman=null,pendingMakeHuman=null;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

// Driver rotations are expressed in player space, NOT in the imported bones'
// local axes (which differ even between the two arms). Conjugate each delta
// through the neutral bone basis. No Euler copying or cumulative rotations.
export function createPlayerSpaceRetarget(bones,playerRoot){
 playerRoot.updateMatrixWorld(true);
 const rootInverse=playerRoot.getWorldQuaternion(new THREE.Quaternion()).invert();
 const rest=new Map();
 for(const [name,bone] of bones){
  const basis=rootInverse.clone().multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
  rest.set(name,{neutral:bone.quaternion.clone(),basis,inverse:basis.clone().invert()});
 }
 const delta=new THREE.Quaternion(),local=new THREE.Quaternion(),rot=new THREE.Euler();
 return function apply(name,x=0,y=0,z=0){
  const bone=bones.get(name),frame=rest.get(name);if(!bone||!frame)return;
  delta.setFromEuler(rot.set(x,y,z,'XYZ'));
  local.copy(frame.inverse).multiply(delta).multiply(frame.basis);
  bone.quaternion.copy(frame.neutral).multiply(local);
 };
}

export async function prepareFooteraPlayerModel(){
 if(source)return true;
 if(typeof document==='undefined'||typeof fetch!=='function')return false;
 if(!pending)pending=(async()=>{
  const [{GLTFLoader},{clone}]=await Promise.all([
   import('./vendor/three/GLTFLoader.mjs'),
   import('./vendor/three/SkeletonUtils.mjs')
  ]);
  const gltf=await new GLTFLoader().loadAsync(ASSET_URL.href);
  const bones=new Set();let weighted=0,verts=0;
  gltf.scene.traverse(node=>{
   if(node.isBone)bones.add(node.name);
   if(node.isSkinnedMesh){weighted++;verts+=node.geometry.getAttribute('position')?.count||0}
  });
  if(!weighted||verts<2000||REQUIRED.some(name=>!bones.has(name)))
   throw new Error('Footera CC0 humanoid failed rig validation');
  source={scene:gltf.scene,clone,vertexCount:verts,boneCount:bones.size};
  return true;
 })().catch(error=>{pending=null;throw error});
 return pending;
}
export function isFooteraPlayerModelReady(){return !!source}
export function isFooteraMakeHumanModelReady(){return !!sourceMakeHuman}
export async function prepareFooteraMakeHumanModel(){
 if(sourceMakeHuman)return true;
 if(typeof document==='undefined'||typeof fetch!=='function')return false;
 if(!pendingMakeHuman)pendingMakeHuman=(async()=>{
  const [{GLTFLoader},{clone}]=await Promise.all([
   import('./vendor/three/GLTFLoader.mjs'),import('./vendor/three/SkeletonUtils.mjs')
  ]);
  const gltf=await new GLTFLoader().loadAsync(MAKEHUMAN_URL.href);
  const bones=new Set();let weighted=0,vertices=0;
  gltf.scene.traverse(node=>{
   if(node.isBone)bones.add(node.name);
   if(node.isSkinnedMesh){weighted++;vertices+=node.geometry.getAttribute('position')?.count||0}
  });
  const needed=['pelvis','spine_01','spine_03','head','thigh_l','thigh_r','calf_l','calf_r',
   'foot_l','foot_r','ball_l','ball_r','upperarm_l','upperarm_r','lowerarm_l','lowerarm_r'];
  if(weighted<1||vertices<12000||needed.some(name=>!bones.has(name)))
   throw new Error('MakeHuman GLB failed 53-bone rig validation');
  // Source animations are stripped from the published GLB and never played.
  if(gltf.animations?.length)throw new Error('Unapproved MakeHuman animations in GLB');
  sourceMakeHuman={scene:gltf.scene,clone,vertexCount:vertices,boneCount:bones.size};
  return true;
 })().catch(error=>{pendingMakeHuman=null;throw error});
 return pendingMakeHuman;
}

// Colour fallback for callers without the existing club-kit texture atlas.
export function footballerKitColorAt(nx,ny,nz,kit={},hair=0){
 const c=key=>new THREE.Color(kit[key]||({shirt:'#1b4c52',shirtSecondary:'#dbb45a',shorts:'#15222a',socks:'#173744'}[key]));
 const skin=new THREE.Color(['#dfac87','#c68a66','#ad7558','#80533f'][hair%4]);
 const dark=new THREE.Color('#191b20'),boot=new THREE.Color('#e0ddd3');
 const shirt=c('shirt'),shorts=c('shorts'),socks=c('socks'),second=c('shirtSecondary');
 if(ny<.072)return boot;
 if(ny<.31)return ny>.284?second:socks;
 if(ny<.445)return skin;
 if(ny<.557)return shorts;
 if(ny>.965)return dark;
 if(ny>.80)return skin;
 if(Math.abs(nx)>.235&&ny<.72)return skin;
 if(Math.abs(nx)>.235&&ny>=.72)return shirt;
 if(ny>.565&&ny<.795){
  if(kit.pattern==='halves')return nx>0?second:shirt;
  if(kit.pattern==='stripes'&&Math.floor((nx+.5)*11)%2===0)return second;
  if(kit.pattern==='diagonal'&&Math.floor((nx+nz*.5+.8)*8)%5===0)return second;
  if(kit.pattern==='sleeves'&&Math.abs(nx)>.2)return second;
  return shirt;
 }
 return skin;
}

// Convert one real imported skinned GLB to the exact Footera player footprint.
// Preserve the authored 65-bone hierarchy and skin weights. Clothing gets a
// modest surface adjustment; anatomical toes are covered by shaped boots.
export function mountFooteraPlayerModel(playerRoot,existingDriver,kit,name='',detail=true,variant='quaternius',fallbackAtlas=null){
 const asset=variant==='makehuman'?sourceMakeHuman:source;
 if(!asset)return null;
 const makehuman=variant==='makehuman';
 const model=asset.clone(asset.scene);
 model.name='FooteraImportedFootballer';
 const bones=new Map(),meshes=[];
 model.traverse(node=>{
  if(node.isBone)bones.set(node.name,node);
  if(node.isSkinnedMesh){node.frustumCulled=false;node.castShadow=true;node.receiveShadow=true;meshes.push(node)}
 });
 if(makehuman&&bones.has('head'))bones.set('Head',bones.get('head'));
 if(REQUIRED.some(key=>!bones.has(key))||!meshes.length)return null;
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model);
 const size=new THREE.Vector3();bounds.getSize(size);
 if(size.y<.05||size.y>100)return null;
 const center=bounds.getCenter(new THREE.Vector3());
 const scale=1.83/size.y,normalized=new THREE.Group();
 normalized.name='FooteraPlayerPrototypeMount';
 // Authored model faces +Z; Footera's boots, ball contact and routes face -Z.
 normalized.rotation.y=Math.PI;
 normalized.add(model);model.scale.setScalar(scale);
 model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
 playerRoot.add(normalized);
 // Imported meshes have different polygon shapes than the old procedurally
 // generated skin; tint their original vertices using mesh local coordinates.
 const tintIndex=[...String(name)].reduce((n,ch)=>n+ch.charCodeAt(0),0)%4;
 const hairStyle=([...String(name)].reduce((n,ch)=>(Math.imul(n,31)+ch.charCodeAt(0))|0,2166136261)>>>0)%6;
 model.updateMatrixWorld(true);
 // Shared textile-detail textures stay off on LOW mobile devices.
 const surfaceMaps=detail?createFooteraSurfaceMaps(THREE):null;
 const colorsByMesh=[],kitAtlas=existingDriver.skinned?.atlasTexture||fallbackAtlas;
 for(const mesh of meshes){
  const sourceGeometry=mesh.geometry,sourceMaterial=mesh.material;
  const geometry=mesh.geometry.clone(),pos=geometry.getAttribute('position');
  const colors=new Float32Array(pos.count*3),uv=new Float32Array(pos.count*2),
   heights=new Float32Array(pos.count),zones=new Uint8Array(pos.count),p=new THREE.Vector3();
  // vertex position in the original GLB's unscaled world coordinates.
  const localToModel=model.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
  const modelToLocal=localToModel.clone().invert();
  const isBody=!/eye/i.test(mesh.name);
  geometry.computeBoundingBox();
  const eyeBounds=geometry.boundingBox;
  for(let i=0;i<pos.count;i++){
   p.fromBufferAttribute(pos,i).applyMatrix4(localToModel);
   const nx=(p.x-center.x)*scale,ny=(p.y-bounds.min.y)*scale/1.83,nz=(p.z-center.z)*scale;
   const brow=/eyebrow/i.test(mesh.name),eye=/^eyes$/i.test(mesh.name);
   heights[i]=ny;
   const bareArm=Math.abs(nx)>.43;
   const hairline=.934+(nz>0?.018:0);
   let slot=ny<.056?2:ny<.31?3:ny<.445?2:ny<.557?1:
    ny>.863||bareArm?2:Math.abs(nx)>.26?4:0;
   zones[i]=slot;
   let c=footballerKitColorAt(nx,ny,nz,kit,tintIndex);
   const mapped=footeraAtlasUV(nx,ny,nz,slot);
   uv[i*2]=mapped[0];uv[i*2+1]=mapped[1];
   if(kitAtlas)c=new THREE.Color('#ffffff');
   // Eyebrows/eyes used to receive exactly the skin colour, erasing the face.
   // Their existing meshes use an untextured facial material below.
   if(brow)c.set('#30241e');
   else if(eye){
    // An iris is part of the existing eye mesh, with no extra draw surface.
    const eyeX=(Math.abs(pos.getX(i))-(eyeBounds.max.x-eyeBounds.min.x)*.27)/.012;
    const eyeY=(pos.getY(i)-(eyeBounds.max.y+eyeBounds.min.y)*.5)/.011;
    c.set(eyeX*eyeX+eyeY*eyeY<1?'#29312e':'#b5b4a8');
   }
   else if(ny>hairline)c.set(['#211d1b','#382820','#544034','#765735'][tintIndex]);
   else if(ny<.072)c.set('#242c30');
   // Modest fabric relief; shading remains continuous over weighted joints.
   if(isBody&&ny>=.445&&ny<.863&&!bareArm){
    const seam=Math.abs(nx)<.012&&nz<0?.93:1;
    c.multiplyScalar(seam*(.97+.03*Math.cos(ny*95)*Math.cos(nx*25)));
   }
   // Gentle continuous fabric allowance, never the former unbounded radial
   // inflation that crushed the shirt and produced exaggerated waist ridges.
   // No UV/skin-weight separation or extra arm/leg meshes.
   if(isBody&&(slot===0||slot===1||slot===3||slot===4)){
    const allowance=slot===0?.017:slot===1?.026:slot===3?.010:.009;
    const seam=slot===0?Math.min(1,Math.max(0,(ny-.557)/.035),Math.max(0,(.863-ny)/.035)):
      slot===1?Math.min(1,Math.max(0,(ny-.445)/.018),Math.max(0,(.557-ny)/.018)):
      slot===3?Math.min(1,Math.max(0,(ny-.056)/.025),Math.max(0,(.31-ny)/.025)):1;
    const inflate=1+allowance*Math.max(0,seam);
    p.x=center.x+nx*inflate/scale;p.z=center.z+nz*inflate/scale;
    p.applyMatrix4(modelToLocal);pos.setXYZ(i,p.x,p.y,p.z);
   }
   const ao=vertexFooteraOcclusion(nx,ny,nz,slot);
   colors[i*3]=c.r*ao;colors[i*3+1]=c.g*ao;colors[i*3+2]=c.b*ao;
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const sourceIndices=geometry.index?.array||Array.from({length:pos.count},(_,i)=>i);
  const keepSkin=[],keepKit=[],keepAll=[];
  for(let i=0;i<sourceIndices.length;i+=3){
   const tri=[sourceIndices[i],sourceIndices[i+1],sourceIndices[i+2]];
   if(isBody&&Math.max(...tri.map(k=>heights[k]))<.061)continue;
   keepAll.push(...tri);
   const garment=tri.filter(k=>zones[k]===0||zones[k]===1||zones[k]===3||zones[k]===4).length>=2;
   (makehuman&&isBody&&!garment?keepSkin:keepKit).push(...tri);
  }
  geometry.setIndex(makehuman?keepKit:keepAll);
  geometry.computeVertexNormals();
  // Both PBR maps share this atlas: UV for normal/roughness, UV2 for AO.
  // Each slot already encodes the real material zone, so skin never gets knit.
  const uvAttr=new THREE.Float32BufferAttribute(uv,2);
  geometry.setAttribute('uv',uvAttr);
  if(surfaceMaps&&isBody)geometry.setAttribute('uv2',uvAttr);
  const kitMaterial=new THREE.MeshStandardMaterial({vertexColors:true,
   map:/eye/i.test(mesh.name)?null:kitAtlas,
   roughnessMap:surfaceMaps&&isBody?surfaceMaps.packedMap:null,
   aoMap:surfaceMaps&&isBody?surfaceMaps.packedMap:null,aoMapIntensity:.64,
   normalMap:surfaceMaps&&isBody?surfaceMaps.normalMap:null,
   normalScale:new THREE.Vector2(.39,.39),
    metalness:0,roughness:surfaceMaps?.88:.87,side:THREE.DoubleSide});
  if(makehuman&&isBody){
   // Keep the original CC0 MakeHuman skin UVs/materials for face and bare skin;
   // cloth uses Footera's own club atlas on a second mesh sharing the real rig.
   // No source material is edited, so a cloned player cannot contaminate others.
   const skinGeometry=sourceGeometry.clone();skinGeometry.setIndex(keepSkin);
   const skinMaterial=Array.isArray(sourceMaterial)?sourceMaterial[0].clone():sourceMaterial.clone();
   skinMaterial.side=THREE.DoubleSide;
   mesh.geometry=skinGeometry;mesh.material=skinMaterial;
   const clothes=new THREE.SkinnedMesh(geometry,kitMaterial);
   clothes.name='FooteraMakeHumanTeamKit';
   clothes.bind(mesh.skeleton,mesh.bindMatrix);
   clothes.position.copy(mesh.position);clothes.quaternion.copy(mesh.quaternion);
   clothes.scale.copy(mesh.scale);clothes.frustumCulled=false;
   clothes.castShadow=true;clothes.receiveShadow=true;
   mesh.parent.add(clothes);
   colorsByMesh.push({geometry:skinGeometry,material:skinMaterial},{geometry,material:kitMaterial});
  }else{
   mesh.geometry=geometry;mesh.material=kitMaterial;
   colorsByMesh.push({geometry,material:kitMaterial});
  }
 }
 // Neutral T pose is converted once into normal running arm-down posture.
 const aim=new THREE.Vector3(),from=new THREE.Vector3();
 for(const side of ['l','r']){
  const shoulder=bones.get('upperarm_'+side),elbow=bones.get('lowerarm_'+side);
  for(const [bone,target,desired] of [
   [shoulder,elbow,new THREE.Vector3(side==='l'?-.06:.06,-1,0)],
   [elbow,bones.get('hand_'+side),new THREE.Vector3(side==='l'?-.03:.03,-1,0)]
  ]){
   if(!bone||!target)continue;
   model.updateMatrixWorld(true);
   from.copy(target.getWorldPosition(new THREE.Vector3())).sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
   aim.copy(desired).normalize();
   const worldQ=bone.getWorldQuaternion(new THREE.Quaternion());
   const wanted=new THREE.Quaternion().setFromUnitVectors(from,aim).multiply(worldQ);
   const parentWorld=bone.parent.getWorldQuaternion(new THREE.Quaternion());
   bone.quaternion.copy(parentWorld.invert().multiply(wanted));
  }
 }
 const apply=createPlayerSpaceRetarget(bones,playerRoot);
 // Lightweight football boots, shaped around each real ankle in its rest
 // frame. They follow the imported foot bone and use one draw call per boot.
 for(const side of ['l','r']){
  const foot=bones.get('foot_'+side),ankle=playerRoot.worldToLocal(foot.getWorldPosition(new THREE.Vector3()));
  const vertices=[],colors=[],indices=[],point=new THREE.Vector3(),segments=16;
  const rings=[[.052,.055,.008,.025],[.035,.070,.057,.066],[0,.070,.065,.064],[-.065,.057,.068,.050],[-.14,.037,.065,.030],[-.19,.030,.054,.023],[-.211,.027,.025,.017],[-.217,.027,.002,.002]];
  for(let j=0;j<rings.length;j++){
   const [z,y,w,h]=rings[j];
   for(let n=0;n<=segments;n++){
    const a=n/segments*Math.PI*2,py=Math.max(-.045,y+Math.sin(a)*h-.053);
    point.set(ankle.x+Math.cos(a)*w,ankle.y+py,ankle.z+z);playerRoot.localToWorld(point);foot.worldToLocal(point);vertices.push(...point.toArray());
    const lace=j>=2&&j<=4&&Math.sin(a)>.92;
    const color=new THREE.Color(py<-.034?'#111719':lace?'#e2e4dc':'#25383c');colors.push(color.r,color.g,color.b);
    if(j&&n){const b=j*(segments+1)+n;indices.push(b,b-1,b-segments-2,b,b-segments-2,b-segments-1)}
   }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.51,metalness:0,side:THREE.DoubleSide});
  const boot=new THREE.Mesh(geometry,material);boot.name='FooteraBoot-'+side;boot.castShadow=true;boot.receiveShadow=true;foot.add(boot);colorsByMesh.push({geometry,material});
 }
 // One bound haircut mesh on every real match player's head (mobile-safe).
 if(!makehuman){
  const head=bones.get('Head');
  if(head){
   playerRoot.updateMatrixWorld(true);
   const anchor=playerRoot.localToWorld(new THREE.Vector3(0,1.782,-.002));
   head.updateWorldMatrix(true,false);
   const orientation=head.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(
    playerRoot.getWorldQuaternion(new THREE.Quaternion()));
   const cuts=[[.092,.040,.090,.43],[.099,.061,.097,.56],[.105,.070,.098,.58],
    [.103,.083,.101,.61],[.106,.083,.106,.67],[.109,.078,.099,.74]];
   const [w,h,d,coverage]=cuts[hairStyle],geometry=new THREE.SphereGeometry(1,14,9,0,Math.PI*2,0,Math.PI*coverage);
   const pos=geometry.getAttribute('position');
   for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const wave=hairStyle===4?Math.cos(x*27+z*19)*Math.cos(z*23)*.025:
     hairStyle===3?Math.sin(x*17+z*13)*.020:hairStyle===2?Math.sin(x*6+z*4)*.008:0;
    pos.setXYZ(i,x*(1+wave)+(hairStyle===5?Math.max(0,y)*.13:0),y*(1+wave*.18),z*(1+wave));
   }
   geometry.computeVertexNormals();
   const color=['#201b17','#392921','#624932','#171b1d','#2b2320','#83664a'][hairStyle];
   // Root shadows and directional strand tones make the six silhouettes
   // distinguishable without transparency or additional mobile draw calls.
   const strandColors=new Float32Array(pos.count*3),
    baseColor=new THREE.Color(color),tint=new THREE.Color();
   for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),
     strand=Math.sin(x*23+z*11+hairStyle)*Math.cos(z*29-x*8),
     light=(.93+.09*Math.max(0,y))*(1+.07*strand);
    tint.copy(baseColor).multiplyScalar(light);
    strandColors[i*3]=tint.r;strandColors[i*3+1]=tint.g;strandColors[i*3+2]=tint.b;
   }
   geometry.setAttribute('color',new THREE.Float32BufferAttribute(strandColors,3));
   const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:0});
   const hair=new THREE.Mesh(geometry,material);
   hair.name='FooteraAthleteHair-'+hairStyle;
   hair.position.copy(head.worldToLocal(anchor));
   hair.quaternion.copy(orientation);hair.scale.set(w,h,d);hair.castShadow=true;
   head.add(hair);colorsByMesh.push({geometry,material});
  }
 }
 // The CC0 MakeHuman body intentionally contains no authored hairstyle.
 // Rig a small lightweight haircut to the real head bone: no licensed art,
 // no copied celebrity identity and no change to the actual head/face mesh.
 if(makehuman){
  const head=bones.get('Head');
  playerRoot.updateMatrixWorld(true);
  const anchor=playerRoot.localToWorld(new THREE.Vector3(0,1.753,-.003));
  head.updateWorldMatrix(true,false);
  const headWorld=head.getWorldQuaternion(new THREE.Quaternion());
  const playerWorld=playerRoot.getWorldQuaternion(new THREE.Quaternion());
  const hairAxis=headWorld.invert().multiply(playerWorld);
  const cutColor=new THREE.Color(['#241b17','#2b211b','#39271f','#423128'][tintIndex]);
  const hairMaterial=new THREE.MeshStandardMaterial({color:cutColor,roughness:.97,metalness:0});
  const capGeo=new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI*.57);
  const cap=new THREE.Mesh(capGeo,hairMaterial);
  cap.name='FooteraMakeHumanHair';
  cap.position.copy(head.worldToLocal(anchor));cap.quaternion.copy(hairAxis);
  cap.scale.set(.101,.075,.100);
  cap.castShadow=true;cap.receiveShadow=true;head.add(cap);
  colorsByMesh.push({geometry:capGeo,material:hairMaterial});
  // Small soft locks break the helmet silhouette around the forehead.
  for(let i=-2;i<=2;i++){
   const g=new THREE.SphereGeometry(1,8,6),m=new THREE.MeshStandardMaterial({
    color:cutColor.clone().multiplyScalar(1+(i%2)*.08),roughness:.98});
   const tuft=new THREE.Mesh(g,m);
   tuft.position.copy(cap.position);tuft.quaternion.copy(hairAxis);
   tuft.position.add(new THREE.Vector3(i*.035,-.008,-.078));
   tuft.scale.set(.035,.018,.026);tuft.castShadow=true;head.add(tuft);
   colorsByMesh.push({geometry:g,material:m});
  }
 }
 // Match the EXISTING contact targets using the imported limb lengths. The
 // authored shin is longer than the old rig: angle copying alone floats feet
 // and moves the striking boot away from the authoritative ball contact.
 playerRoot.updateMatrixWorld(true);
 const rootRestInverse=playerRoot.getWorldQuaternion(new THREE.Quaternion()).invert();
 const limbs=['l','r'].map(side=>{
  const hip=bones.get('thigh_'+side),knee=bones.get('calf_'+side),foot=bones.get('foot_'+side);
  const h=hip.getWorldPosition(new THREE.Vector3()),k=knee.getWorldPosition(new THREE.Vector3()),f=foot.getWorldPosition(new THREE.Vector3());
  return{hip,knee,foot,upper:h.distanceTo(k),lower:k.distanceTo(f),
   footRest:rootRestInverse.clone().multiply(foot.getWorldQuaternion(new THREE.Quaternion()))};
 });
 const hp=new THREE.Vector3(),kp=new THREE.Vector3(),fp=new THREE.Vector3(),target=new THREE.Vector3(),
  direction=new THREE.Vector3(),pole=new THREE.Vector3(),desiredKnee=new THREE.Vector3(),
  fromDirection=new THREE.Vector3(),toDirection=new THREE.Vector3(),
  turnQ=new THREE.Quaternion(),worldQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion();
 function pointBone(bone,child,point){
  bone.getWorldPosition(fp);child.getWorldPosition(fromDirection).sub(fp).normalize();
  toDirection.copy(point).sub(fp).normalize();
  turnQ.setFromUnitVectors(fromDirection,toDirection);
  bone.getWorldQuaternion(worldQ).premultiply(turnQ);
  bone.parent.getWorldQuaternion(parentQ).invert();
  bone.quaternion.copy(parentQ).multiply(worldQ);bone.updateMatrixWorld(true);
 }
 function matchFeet(){
  playerRoot.updateMatrixWorld(true);
  for(let i=0;i<2;i++){
   const limb=limbs[i];limb.hip.getWorldPosition(hp);
   existingDriver.ankles[i].getWorldPosition(target);
   existingDriver.knees[i].getWorldPosition(kp);
   direction.copy(target).sub(hp);
   const distance=clamp(direction.length(),.001,limb.upper+limb.lower-.00001);
   direction.normalize();pole.copy(kp).sub(hp);pole.addScaledVector(direction,-pole.dot(direction));
   if(pole.lengthSq()<1e-8){
    pole.set(0,0,-1).applyQuaternion(playerRoot.getWorldQuaternion(worldQ));
    pole.addScaledVector(direction,-pole.dot(direction));
   }
   pole.normalize();
   const cosine=clamp((limb.upper**2+distance**2-limb.lower**2)/(2*limb.upper*distance),-1,1);
   desiredKnee.copy(hp).addScaledVector(direction,limb.upper*cosine).addScaledVector(pole,limb.upper*Math.sqrt(Math.max(0,1-cosine*cosine)));
   pointBone(limb.hip,limb.knee,desiredKnee);pointBone(limb.knee,limb.foot,target);
   existingDriver.ankles[i].getWorldQuaternion(worldQ).multiply(limb.footRest);
   limb.foot.parent.getWorldQuaternion(parentQ).invert();
   limb.foot.quaternion.copy(parentQ).multiply(worldQ);limb.foot.updateMatrixWorld(true);
  }
 }
 const motion={},sampleCapturedLocomotion=createGlbClipLayer();let clipState=null,frameTime=0;
 function animate(time=0,info={}){
  const driver=existingDriver;
  frameTime=Number.isFinite(time)?time:0;
  const m=sampleGlbBodyMotion(frameTime,info,motion);
  clipState=sampleCapturedLocomotion(frameTime,info,info.clipEnabled!==false);
  // The existing Footera pose owns shot contact and leg planting. The
  // imported GLB adds a modest counter-rotating kinetic chain and head aim.
  // Rest-posed neutral quaternions prevent cumulative joint rotation.
  normalized.position.y=clamp(driver.rig.position.y*.68+m.bob,-.10,.22);
  apply('pelvis',driver.rig.rotation.x*.45+m.pelvisPitch,driver.rig.rotation.y+m.pelvisYaw,driver.rig.rotation.z*.7+m.pelvisRoll);
  apply('spine_01',driver.upper.rotation.x*.48+m.spinePitch*.37+clipState.torsoPitch*.38,driver.upper.rotation.y*.48+m.spineYaw*.38,driver.upper.rotation.z*.45+m.spineRoll*.37+clipState.torsoRoll*.40);
  apply('spine_02',driver.upper.rotation.x*.33+m.spinePitch*.35+clipState.torsoPitch*.32,driver.upper.rotation.y*.34+m.spineYaw*.36,driver.upper.rotation.z*.35+m.spineRoll*.34+clipState.torsoRoll*.35);
  apply('spine_03',driver.upper.rotation.x*.28+m.spinePitch*.28+clipState.torsoPitch*.30,driver.upper.rotation.y*.26+m.spineYaw*.26,driver.upper.rotation.z*.28+m.spineRoll*.29+clipState.torsoRoll*.25);
  apply('Head',m.headPitch,m.headYaw,m.headRoll);
  for(let i=0;i<2;i++){
   const side=i?'r':'l',sign=i?1:-1;
   apply('thigh_'+side,driver.legs[i].rotation.x,driver.legs[i].rotation.y,driver.legs[i].rotation.z);
   const swing=driver.gait[i]?.swingWeight??(driver.gait[i]?.support?0:1);
   apply('calf_'+side,driver.knees[i].rotation.x-m.kneeCushion*swing,0,driver.knees[i].rotation.z);
   apply('foot_'+side,driver.ankles[i].rotation.x+(i?m.rightToeLift:m.leftToeLift)*swing,
     driver.ankles[i].rotation.y,driver.ankles[i].rotation.z);
   apply('upperarm_'+side,driver.arms[i].rotation.x*.94+sign*m.armSwing+(i?clipState.rightArmPitch:clipState.leftArmPitch),
     driver.arms[i].rotation.y,driver.arms[i].rotation.z*.92+sign*m.armBrace+(i?clipState.rightArmRoll:clipState.leftArmRoll));
   apply('lowerarm_'+side,driver.elbows[i].rotation.x*.72+.055*m.running+(i?clipState.rightElbow:clipState.leftElbow),0,driver.elbows[i].rotation.z);
  }
  matchFeet();
 }
 function inspectMotion(){
  playerRoot.updateMatrixWorld(true);
  const local=bone=>playerRoot.worldToLocal(bones.get(bone).getWorldPosition(new THREE.Vector3())).toArray();
  return{time:frameTime,rootY:normalized.position.y,headYaw:motion.headYaw||0,
   spineYaw:motion.spineYaw||0,pelvisYaw:motion.pelvisYaw||0,cut:motion.cut||0,
   shot:motion.shot||0,follow:motion.follow||0,running:motion.running||0,
   capturedClip:clipState?.clip||'none',capturedWeight:clipState?.weight||0,
   capturedPhase:clipState?.phase||0,capturedSource:clipState?.source||'none',
   hipLeft:bones.get('thigh_l').quaternion.toArray(),hipRight:bones.get('thigh_r').quaternion.toArray(),
   feet:[local('foot_l'),local('foot_r')],toes:[local('ball_l'),local('ball_r')],
   footTargets:existingDriver.ankles.map(ankle=>playerRoot.worldToLocal(ankle.getWorldPosition(new THREE.Vector3())).toArray()),
   elbows:[local('lowerarm_l'),local('lowerarm_r')],hands:[local('hand_l'),local('hand_r')]};
 }
 animate();
 return{model,modelRoot:normalized,meshCount:meshes.length,vertexCount:asset.vertexCount,
  boneCount:asset.boneCount,variant,hairStyle,animate,inspectMotion,
  surfaceDetail:!!surfaceMaps,
  dispose(){normalized.removeFromParent();for(const {geometry,material} of colorsByMesh){geometry.dispose();material.dispose()}surfaceMaps?.dispose()}
 };
}
