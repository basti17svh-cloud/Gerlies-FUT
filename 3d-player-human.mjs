/* Footera V21.193 human players.
 * One CC0 MakeHuman body (tools/build-footera-humans.py) with real haircuts,
 * beards, eyebrows and eyes, dressed in a kit painted per player: the saved
 * club pattern and colours, the club crest on the chest and the squad number
 * (and the scorer's name) big on the back. Faces differ per player through
 * morph targets that are baked once at mount time, so the GPU never blends
 * morphs during a highlight. Skeleton frames match the Quaternius rig, so the
 * existing retarget, mocap layers and foot IK drive it unchanged.
 */
import {paintFooteraKitTile} from './3d-rigged-footballer.mjs?v=2190';
import {footeraHDWanted,upgradeFooteraHero} from './3d-player-hd.mjs?v=1';

const HUMAN_URL=new URL('./assets/footera/models/footera-humans.glb?v=21258',import.meta.url);
const NEEDED=['pelvis','spine_01','spine_03','Head','upperarm_l','upperarm_r','lowerarm_l','lowerarm_r',
 'hand_l','hand_r','thigh_l','thigh_r','calf_l','calf_r','foot_l','foot_r','ball_l','ball_r'];
let source=null,pending=null;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

export async function prepareFooteraHumanModel(){
 if(source)return true;
 if(typeof document==='undefined'||typeof fetch!=='function')return false;
 if(!pending)pending=(async()=>{
  const [{GLTFLoader},{clone}]=await Promise.all([
   import('./vendor/three/GLTFLoader.mjs'),import('./vendor/three/SkeletonUtils.mjs')]);
  const gltf=await new GLTFLoader().loadAsync(HUMAN_URL.href);
  const info=gltf.parser.json.extras?.footera,bones=new Set();let vertices=0,body=null;
  gltf.scene.traverse(node=>{
   if(node.isBone)bones.add(node.name);
   if(node.isSkinnedMesh&&node.name==='FooteraBody'){body=node;vertices=node.geometry.getAttribute('position').count}
  });
  if(!info||!body||vertices<5000||NEEDED.some(name=>!bones.has(name)))
   throw new Error('Footera human GLB failed rig validation');
  const skins={};
  for(const [tone,index] of Object.entries(info.skins||{})){
   const texture=await gltf.parser.getDependency('texture',index);
   texture.flipY=false;texture.colorSpace='srgb';skins[tone]=texture;
  }
  source={scene:gltf.scene,clone,info,skins,vertexCount:vertices,boneCount:bones.size};
  return true;
 })().catch(error=>{pending=null;throw error});
 return pending;
}
export function isFooteraHumanModelReady(){return !!source}
export function footeraHumanSource(){return source}

function hash(text){
 let h=2166136261;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}
 // Final avalanche so names that differ in one letter still look different.
 h^=h>>>16;h=Math.imul(h,0x85ebca6b)>>>0;h^=h>>>13;h=Math.imul(h,0xc2b2ae35)>>>0;return(h^h>>>16)>>>0;
}
function hexRGB(hex){const n=parseInt(String(hex).replace('#',''),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}
const luminance=hex=>{const [r,g,b]=hexRGB(hex);return .2126*r+.7152*g+.0722*b};
const HAIR_SHADES=['#1b1512','#2a1d16','#3b2a1f','#14110f','#4f3826','#6e5038','#8a6a48','#241a14'];

// Everything that makes one player look like himself, from his name only:
// no ancestry is inferred, the complexion comes from the player record.
// custom (V21.215 Aussehen-Editor): {hair:'short02'|'bald'|..., hairColor:'#hex',
// beard:'none'|'Full_beard'|'Moustache'}; anything missing stays name-picked.
// custom.female (V21.258, women's players from the EA record): the female body
// morph and skin, a women's haircut and never a beard.
export function footeraHumanLook(name='',skinTone='#c88f69',info=source?.info,custom=null){
 const h=hash(name),pick=(list,shift)=>list[(h>>>shift)%list.length];
 const female=custom?.female===true&&!!info?.hairFemale?.length;
 const hair=female?info.hairFemale:info?.hair||['short02'],facial=info?.facial||[],brows=info?.brows||['eyebrow001'];
 const tone=/^#[0-9a-f]{6}$/i.test(String(skinTone))?skinTone:'#c88f69',dark=luminance(tone)<.42;
 const r=k=>(((h>>>k)&255)/255)*2-1,morphs={};
 // Small mixes keep every face plausible; three race axes add variety only.
 for(const [i,key] of ['race_african','race_asian','race_caucasian'].entries())morphs[key]=r(i*3+1)*.45;
 for(const [i,key] of ['head_square','jaw_width','chin_prominent','nose_width','nose_length','nose_hump',
  'lips_volume','mouth_width','cheekbones','eyes_size','brow_ridge'].entries())morphs[key]=r((i*5+11)%27)*.5;
 morphs.face_age=r(23)*.25-.1;
 if(female){
  // Softer faces: no square heads, wide jaws or heavy brows on top of the morph.
  morphs.female=1;
  for(const key of ['head_square','jaw_width','brow_ridge','nose_hump'])morphs[key]=Math.min(morphs[key],0)*.6-.15;
  morphs.face_age=Math.min(morphs.face_age,0);
 }
 // Half the squad clean-shaven, most others a short full beard.
 const beard=(h>>>13)%10,facialHair=female?null:beard>=9?facial[1]:beard>=5?facial[0]:null;
 const look={hair:pick(hair,3),facial:facialHair||null,brows:female?brows[0]:pick(brows,9),morphs,
  skin:tone,skinKey:(dark?'dark':'light')+(female?'Female':''),female,
  hairColor:dark?pick(['#120f0e','#1b1512','#241a14'],17):pick(HAIR_SHADES,17)};
 if(custom){
  if(!female&&(custom.hair==='bald'||hair.includes(custom.hair)))look.hair=custom.hair==='bald'?null:custom.hair;
  else if(female&&hair.includes(custom.hair))look.hair=custom.hair;
  if(!female){if(custom.beard==='none')look.facial=null;else if(facial.includes(custom.beard))look.facial=custom.beard}
  if(/^#[0-9a-f]{6}$/i.test(String(custom.hairColor||'')))look.hairColor=custom.hairColor;
 }
 return look;
}

export function footeraShirtName(name=''){
 const parts=String(name).trim().split(/\s+/).filter(Boolean);
 return(parts[parts.length-1]||'').toUpperCase().slice(0,14);
}

// Kit canvas, square. Bands (v from the top): shirt 0-.62 with the front in
// the left half and the back in the right half, shorts .64-.86, socks .88-1.
// Builder metres (extras.footera.kitMetres): each band spans half-width
// `across` and the heights top..bottom on the authored body.
export function footeraKitLayout(info=source?.info){
 const bands=info?.kitBands||{shirt:[0,.62],shorts:[.64,.86],socks:[.88,1]};
 const metres=info?.kitMetres||{shirt:[.62,1.6,.86],shorts:[.32,1.03,.69]};
 return{bands,metres};
}

// Draws in metres on one half of a garment band. front: x grows to the
// viewer's right; back: x grows to the viewer's right seen from behind.
function garmentSpace(ctx,size,band,metres,half){
 const [across,top,bottom]=metres,[v0,v1]=band;
 const sx=size*.25/across,sy=size*(v1-v0)/(top-bottom);
 ctx.setTransform(sx,0,0,-sy,size*(half==='back'?.75:.25),size*v0+sy*top);
}

export function paintFooteraHumanKit(ctx,size,kit={},opts={},info=source?.info){
 const {bands,metres}=footeraKitLayout(info);
 const shirt=kit.shirt||'#1b4c52',second=kit.shirtSecondary||shirt,shorts=kit.shorts||'#15222a',socks=kit.socks||shorts;
 ctx.setTransform(1,0,0,1,0,0);
 ctx.fillStyle=shirt;ctx.fillRect(0,0,size,size*bands.shirt[1]+2);
 for(const half of ['front','back']){
  // Club pattern over the torso; sleeves keep their own pattern rule.
  ctx.save();garmentSpace(ctx,size,bands.shirt,metres.shirt,half);
  const sleeves=['sleeves','shoulders','cuffs'].includes(kit.pattern);
  if(sleeves){
   for(const side of [-1,1]){ctx.save();ctx.translate(side>0?.215:-.62,1.6);ctx.scale(.405,-.74);
    paintFooteraKitTile(ctx,kit,1,1,'sleeves');ctx.restore()}
  }
  // The back stays plain under name and number, like real kits, so no stripe
  // or sash ever runs through the squad number.
  if(half==='front'||sleeves){ctx.save();ctx.translate(-.215,1.52);ctx.scale(.43,-.66);
  ctx.beginPath();ctx.rect(0,0,1,1);ctx.clip();paintFooteraKitTile(ctx,kit,1,1,'shirt');ctx.restore()}
  // Collar trim and a soft side seam.
  ctx.strokeStyle=second;ctx.lineWidth=.014;
  ctx.beginPath();if(half==='front'){ctx.moveTo(-.075,1.5);ctx.quadraticCurveTo(0,1.44,.075,1.5)}else{ctx.moveTo(-.08,1.52);ctx.quadraticCurveTo(0,1.505,.08,1.52)}ctx.stroke();
  ctx.fillStyle='rgba(0,0,0,.10)';for(const x of [-.205,.19])ctx.fillRect(x,.86,.015,.56);
  ctx.restore();
 }
 const ink=luminance(shirt)>.55?'#141820':'#f6f4ee',edge=luminance(second)>.55===luminance(shirt)>.55?(ink==='#f6f4ee'?'#141820':'#f6f4ee'):second;
 const text=(t,x,y,h,font='800',narrow=.86)=>{
  // Fonts are set in pixels at 100 units per glyph height, then scaled;
  // shirt numbers are condensed like real kit lettering.
  ctx.save();ctx.translate(x,y);ctx.scale(h/100*narrow,-h/100);
  ctx.font=`${font} 132px "Arial Narrow","Roboto Condensed",Arial,sans-serif`;ctx.textAlign='center';ctx.textBaseline='alphabetic';
  ctx.lineJoin='round';ctx.lineWidth=9;ctx.strokeStyle=edge;ctx.strokeText(t,0,0);
  ctx.fillStyle=ink;ctx.fillText(t,0,0);ctx.restore();
 };
 const number=Number.isInteger(opts.number)&&opts.number>0?String(opts.number):'';
 ctx.save();garmentSpace(ctx,size,bands.shirt,metres.shirt,'back');
 if(number)text(number,0,1.10,.23);
 if(opts.shirtName){
  ctx.save();const n=opts.shirtName.length;ctx.translate(0,0);
  if(n>8)ctx.scale(8/n,1);text(opts.shirtName,0,1.385,.05,'700');ctx.restore();
 }
 ctx.restore();
 ctx.save();garmentSpace(ctx,size,bands.shirt,metres.shirt,'front');
 // V21.214 (Basti): the club crest is a real 10 cm badge, big enough to read
 // in the celebration close-up, with a soft dark edge so it stands out on
 // any shirt colour.
 if(opts.crest)try{ctx.save();ctx.translate(.098,1.365);ctx.scale(1,-1);
  ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=Math.max(1,size/340);
  ctx.drawImage(opts.crest,-.05,-.055,.1,.11);ctx.restore()}catch(_){}
 else{ctx.fillStyle=second;ctx.beginPath();ctx.moveTo(.06,1.425);ctx.lineTo(.13,1.425);ctx.lineTo(.13,1.385);ctx.quadraticCurveTo(.095,1.35,.06,1.385);ctx.closePath();ctx.fill()}
 // Chest sponsor instead of a front number, like real club kits.
 if(opts.sponsor!==false){
  // Own outline in the opposite tone so it stays readable over stripes.
  const word=typeof opts.sponsor==='string'?opts.sponsor:'FOOTERA',dark=ink==='#141820';
  ctx.save();ctx.translate(0,1.21);ctx.scale(.056/100*.8,-.056/100);
  ctx.font='900 132px "Arial Narrow","Roboto Condensed",Arial,sans-serif';ctx.textAlign='center';
  const w=ctx.measureText?.(word).width||0,max=.3/(.056/100*.8);if(w>max)ctx.scale(max/w,1);
  ctx.lineJoin='round';ctx.lineWidth=14;ctx.strokeStyle=dark?'#f6f4ee':'#141820';ctx.strokeText(word,0,0);
  ctx.fillStyle=ink;ctx.fillText(word,0,0);ctx.restore();
 }
 ctx.restore();
 // Shorts with side piping; the small number sits on the front left leg.
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=shorts;ctx.fillRect(0,size*bands.shorts[0]-2,size,size*(bands.shorts[1]-bands.shorts[0])+4);
 if(metres.shorts)for(const half of ['front','back']){
  ctx.save();garmentSpace(ctx,size,bands.shorts,metres.shorts,half);
  if(second!==shorts){ctx.fillStyle=second;for(const x of [-.19,.175])ctx.fillRect(x,.6,.015,.6)}
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(-.4,metres.shorts[1]-.035,.8,.012);
  if(half==='front'&&number){ctx.save();ctx.translate(-.11,metres.shorts[2]+.05);ctx.scale(.0006,-.0006);
   ctx.font='800 100px Arial,sans-serif';ctx.textAlign='center';ctx.fillStyle=luminance(shorts)>.55?'#141820':'#f6f4ee';ctx.fillText(number,0,0);ctx.restore()}
  ctx.restore();
 }
 // Socks: club colour with a knitted cuff and a stripe in the trim colour.
 ctx.setTransform(1,0,0,1,0,0);const s0=size*bands.socks[0],sh=size*(bands.socks[1]-bands.socks[0]);
 ctx.fillStyle=socks;ctx.fillRect(0,s0-2,size,sh+2);
 ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(0,s0,size,sh*.07);
 if(second!==socks){ctx.fillStyle=second;ctx.fillRect(0,s0+sh*.13,size,sh*.07)}
 ctx.fillStyle='rgba(255,255,255,.06)';for(let y=s0+sh*.25;y<s0+sh;y+=Math.max(2,size/256))ctx.fillRect(0,y,size,1);
 // Fine jersey knit over shirt and shorts.
 if(opts.knit!==false){
  let s=hash(kit.shirt+kit.pattern)||1;
  for(let i=0;i<size*size/90;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;const x=(s>>>8)%size;s=(Math.imul(s,1664525)+1013904223)>>>0;const y=(s>>>8)%(size*bands.shorts[1]|0);
   ctx.fillStyle=s&1?'rgba(255,255,255,.035)':'rgba(0,0,0,.045)';ctx.fillRect(x,y,1,1)}
 }
 ctx.setTransform(1,0,0,1,0,0);
 return true;
}

// The crest editor renders a self-contained SVG; CSS variables are resolved
// so it also works as a plain image on the shirt.
export function footeraCrestSVG(html=''){
 const svg=String(html).match(/<svg class="club-crest-art"[\s\S]*?<\/svg><\/span>/)?.[0]?.replace(/<\/span>$/,'');
 if(!svg)return null;
 const vars={};for(const [,k,v] of String(html).matchAll(/--crest-([a-z]+):(#[0-9a-f]{6})/gi))vars[k]=v;
 return svg.replace(/var\(--crest-([a-z]+)\)/g,(m,k)=>vars[k]||'#ffffff');
}
const crestImages=new Map(),crestReady=new Map();
// The decoded crest, once loadFooteraCrestImage has finished for this HTML.
export function footeraCrestImageNow(html){return crestReady.get(footeraCrestSVG(html))||null}
export function loadFooteraCrestImage(html){
 const svg=footeraCrestSVG(html);
 if(!svg||typeof Image==='undefined')return Promise.resolve(null);
 if(!crestImages.has(svg))crestImages.set(svg,new Promise(resolve=>{
  const image=new Image();image.onload=()=>{crestReady.set(svg,image);resolve(image)};image.onerror=()=>resolve(null);
  image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 }));
 return crestImages.get(svg);
}

const toLinear=c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);
// Linear multiplier that turns the skin texture's median colour into the
// player's recorded complexion.
export function footeraSkinTint(skin,mean){
 const target=hexRGB(skin);
 // Brightening the light photo texture far above its own tone washes it out
 // to chalk, so very light complexions stop just above the texture's colour.
 const max=.2126*mean[0]+.7152*mean[1]+.0722*mean[2]>.5?1.12:2.4;
 return target.map((c,i)=>clamp(toLinear(c)/Math.max(.02,toLinear(mean[i])),.3,max));
}
// Bake this player's face into private geometry copies, drop unused haircuts
// and give every surface its own material. Returns disposables.
export function dressFooteraHuman(THREE,model,look,kit,opts={}){
 const info=source?.info,owned=[],remove=[];
 const keep=name=>{
  if(name.startsWith('FooteraHair-'))return name==='FooteraHair-'+look.hair;
  if(name.startsWith('FooteraFacial-'))return name==='FooteraFacial-'+look.facial;
  if(name.startsWith('FooteraBrows-'))return name==='FooteraBrows-'+look.brows;
  return true;
 };
 const meshes=[];model.traverse(node=>{if(node.isSkinnedMesh)(keep(node.name)?meshes:remove).push(node)});
 for(const node of remove)node.removeFromParent();
 const size=opts.detail?1024:512,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d');
 if(ctx)paintFooteraHumanKit(ctx,size,kit,opts,info);
 const kitMap=new THREE.CanvasTexture(canvas);kitMap.colorSpace=THREE.SRGBColorSpace;kitMap.flipY=false;
 kitMap.anisotropy=opts.detail?8:4;kitMap.name='FooteraHumanKit';owned.push({texture:kitMap});
 // A GLB without the women's skins keeps the men's texture of the same tone.
 const skinKey=source?.skins?.[look.skinKey]?look.skinKey:String(look.skinKey).replace('Female','');
 const skinMap=source?.skins?.[skinKey];
 const tint=footeraSkinTint(look.skin,info?.skinMean?.[skinKey]||[.75,.55,.45]);
 for(const mesh of meshes){
  const geometry=mesh.geometry.clone(),morphs=geometry.morphAttributes.position,names=mesh.morphTargetDictionary||{};
  if(morphs?.length){
   const pos=geometry.getAttribute('position'),out=pos.array.slice();
   for(const [key,weight] of Object.entries(look.morphs||{})){
    const index=names[key],delta=morphs[index];if(index==null||!delta||!weight)continue;
    const d=delta.array;for(let i=0;i<out.length;i++)out[i]+=d[i]*weight;
   }
   geometry.setAttribute('position',new THREE.BufferAttribute(out,3));
   geometry.morphAttributes={};geometry.morphTargetsRelative=false;
  }
  mesh.geometry=geometry;mesh.morphTargetInfluences=undefined;mesh.morphTargetDictionary=undefined;
  mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;
  const material=mesh.material.clone(),name=mesh.name;
  if(name==='FooteraBody'){
   if(skinMap){material.map=skinMap}
   material.color.setRGB(tint[0],tint[1],tint[2]);material.roughness=.58;
  }else if(name==='FooteraShirt'||name==='FooteraShorts'||name==='FooteraSocks'){
   material.map=kitMap;material.color.set('#ffffff');material.roughness=name==='FooteraSocks'?.92:.78;
   if(material.normalMap)material.normalScale.set(.8,.8);
  }else if(name==='FooteraBoots'){
   material.color.set(opts.boots||'#20262b');material.roughness=.42;
  }else if(/^Footera(Hair|Facial|Brows)-/.test(name)){
   material.color.set(look.hairColor);
   material.color.multiplyScalar(name.startsWith('FooteraHair')?1:.85);material.roughness=.7;
   mesh.castShadow=name.startsWith('FooteraHair');
  }
  mesh.material=material;owned.push({geometry,material});
 }
 // HD preview: richer surfaces on the close-up heroes only.
 if(opts.detail&&footeraHDWanted())owned.push(...upgradeFooteraHero(THREE,meshes,look,kitMap,footeraKitLayout(info),hash(look.hair+look.skin)%97+1));
 return{owned,kitMap,canvas};
}
