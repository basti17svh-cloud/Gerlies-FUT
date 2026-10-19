import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import * as THREE from '../vendor/three/three.module.min.js';
import {footeraHumanLook,footeraShirtName,footeraCrestSVG,footeraSkinTint,paintFooteraHumanKit,footeraKitLayout} from '../3d-player-human.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function readGlb(file){
 const b=fs.readFileSync(path.join(root,file)),n=b.readUInt32LE(12);
 const json=JSON.parse(b.subarray(20,20+n).toString()),bin=b.subarray(20+n+8);
 const accessor=i=>{
  const a=json.accessors[i],v=json.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];
  const Type={5126:Float32Array,5123:Uint16Array,5125:Uint32Array,5121:Uint8Array}[a.componentType];
  const start=bin.byteOffset+v.byteOffset+(a.byteOffset||0);
  return new Type(bin.buffer.slice(start,start+a.count*size*Type.BYTES_PER_ELEMENT));
 };
 return{json,accessor,bytes:b.length};
}
function worldFrames(json){
 const parent=new Map();json.nodes.forEach((node,i)=>(node.children||[]).forEach(c=>parent.set(c,i)));
 const local=node=>new THREE.Matrix4().compose(new THREE.Vector3(...(node.translation||[0,0,0])),
  new THREE.Quaternion(...(node.rotation||[0,0,0,1])),new THREE.Vector3(...(node.scale||[1,1,1])));
 const frames=new Map();
 json.nodes.forEach((node,i)=>{
  const m=local(node);for(let p=parent.get(i);p!=null;p=parent.get(p))m.premultiply(local(json.nodes[p]));
  const pos=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();m.decompose(pos,q,s);
  frames.set(node.name,{pos,q,node});
 });
 return frames;
}
const human=readGlb('assets/footera/models/footera-humans.glb');
const info=human.json.extras.footera;

test('human GLB: CC0 source, mobile-sized, every garment and haircut present',()=>{
 assert.match(info.source,/MakeHuman.*CC0/);
 assert.ok(human.bytes<5.5e6,'GLB stays under 5.5 MB: '+human.bytes);
 const meshes=human.json.meshes.map(m=>m.name);
 for(const name of ['FooteraBody','FooteraShirt','FooteraShorts','FooteraSocks','FooteraBoots','FooteraEyes'])assert.ok(meshes.includes(name),name);
 for(const hair of info.hair)assert.ok(meshes.includes('FooteraHair-'+hair),hair);
 assert.ok(info.hair.length>=5&&!info.hair.includes('short03'));
 assert.deepEqual(human.json.meshes[0].extras.targetNames,info.morphs);
});

test('human GLB: real skin weights on arms, legs and head (not one rigid pelvis)',()=>{
 const prim=human.json.meshes.find(m=>m.name==='FooteraBody').primitives[0];
 const joints=human.accessor(prim.attributes.JOINTS_0),weights=human.accessor(prim.attributes.WEIGHTS_0);
 const names=human.json.skins[0].joints.map(i=>human.json.nodes[i].name),count=new Map();
 for(let v=0;v<weights.length/4;v++){
  let best=0;for(let k=1;k<4;k++)if(weights[v*4+k]>weights[v*4+best])best=k;
  const bone=names[joints[v*4+best]];count.set(bone,(count.get(bone)||0)+1);
 }
 for(const bone of ['Head','upperarm_l','lowerarm_r','hand_l','thigh_l','calf_r','spine_03','index_02_l'])
  assert.ok((count.get(bone)||0)>20,bone+' drives '+(count.get(bone)||0)+' vertices');
 assert.ok((count.get('pelvis')||0)<weights.length/4*.2);
 // Feet live inside the boots, which follow the foot bones.
 const boots=human.json.meshes.find(m=>m.name==='FooteraBoots').primitives[0];
 const bj=human.accessor(boots.attributes.JOINTS_0),bw=human.accessor(boots.attributes.WEIGHTS_0);
 let feet=0;for(let v=0;v<bw.length/4;v++)if(/^(foot|ball|calf)_/.test(names[bj[v*4+(bw[v*4]>=bw[v*4+1]?0:1)]]))feet++;
 assert.ok(feet>bw.length/4*.98,'boots ride on the feet and ankles');
});

test('human rig copies the Quaternius bone frames, so the shared mocap fits',()=>{
 const mine=worldFrames(human.json),theirs=worldFrames(readGlb('assets/footera/models/footballer-prototype.glb').json);
 const kid={pelvis:'spine_01',spine_01:'spine_02',spine_02:'spine_03',spine_03:'neck_01',neck_01:'Head',
  upperarm_l:'lowerarm_l',lowerarm_l:'hand_l',upperarm_r:'lowerarm_r',lowerarm_r:'hand_r',
  thigh_l:'calf_l',calf_l:'foot_l',thigh_r:'calf_r',calf_r:'foot_r',index_01_l:'index_02_l'};
 const axis=q=>new THREE.Vector3(0,1,0).applyQuaternion(q);
 for(const [bone,child] of Object.entries(kid)){
  const a=mine.get(bone),b=mine.get(child),q=theirs.get(bone);
  // Bones point along +Y at their own limb, like the Quaternius rig.
  const along=b.pos.clone().sub(a.pos).normalize();
  assert.ok(axis(a.q).angleTo(along)<.06,bone+' +Y follows the limb');
  // Same frame as Quaternius up to the turn between its T-pose and this
  // body's A-pose: the twist about the bone is preserved.
  const twist=new THREE.Vector3(1,0,0).applyQuaternion(a.q),theirTwist=new THREE.Vector3(1,0,0).applyQuaternion(q.q);
  const turn=new THREE.Quaternion().setFromUnitVectors(axis(q.q),axis(a.q));
  assert.ok(twist.angleTo(theirTwist.applyQuaternion(turn))<.02,bone+' keeps the Quaternius twist');
 }
});

test('looks: stable per player, varied across a squad, complexion from the record',()=>{
 assert.deepEqual(footeraHumanLook('Jamal Musiala','#c88f69',info),footeraHumanLook('Jamal Musiala','#c88f69',info));
 const names=['Jamal Musiala','Harry Kane','Florian Wirtz','Bukayo Saka','Pedri','Rodri','Lamine Yamal','Kylian Mbappe',
  'footballer 1','footballer 2','footballer 3','footballer 4','footballer 5','footballer 6'];
 const looks=names.map(n=>footeraHumanLook(n,'#c88f69',info));
 assert.ok(new Set(looks.map(l=>l.hair)).size>=4);
 assert.ok(new Set(looks.map(l=>l.facial)).size>=2);
 assert.ok(new Set(looks.map(l=>l.hairColor)).size>=4);
 assert.ok(new Set(looks.map(l=>JSON.stringify(l.morphs))).size===names.length);
 for(const l of looks)for(const [k,w] of Object.entries(l.morphs)){assert.ok(info.morphs.includes(k),k);assert.ok(Math.abs(w)<=.5)}
 assert.equal(footeraHumanLook('X','#503326',info).skinKey,'dark');
 assert.equal(footeraHumanLook('X','#f1d2b3',info).skinKey,'light');
 assert.equal(footeraHumanLook('X','#503326',info).skin,'#503326');
 // A light complexion never bleaches the photo texture to chalk.
 assert.ok(footeraSkinTint('#ffffff',[.8,.6,.5]).every(c=>c<=1.12));
 assert.ok(footeraSkinTint('#805035',info.skinMean.dark).every(c=>c>1&&c<2.4));
 assert.equal(footeraHumanLook('X','#a96d4b',info).skinKey,'light');
});

test('shirt name and crest: surname in capitals, crest colours resolved for an image',()=>{
 assert.equal(footeraShirtName('Jamal Musiala'),'MUSIALA');
 assert.equal(footeraShirtName('Pedri'),'PEDRI');
 assert.equal(footeraShirtName(''),'');
 const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'club-crest-art.js'),'utf8'),{window});
 const html=window.FooteraCrestArt.render({...window.FooteraCrestArt.presets.athletic.crest,initials:'FCG'},true);
 const svg=footeraCrestSVG(html);
 assert.match(svg,/^<svg class="club-crest-art"[\s\S]*<\/svg>$/);
 assert.doesNotMatch(svg,/var\(--/);
 assert.match(svg,/FCG/);
 assert.equal(footeraCrestSVG('<span class="fh3d-opponent-crest">AB</span>'),null);
});

function recordingContext(){
 const calls=[];let m=new THREE.Matrix3();const stack=[];
 const ctx={calls,
  setTransform(a,b,c,d,e,f){m=new THREE.Matrix3().set(a,c,e,b,d,f,0,0,1)},
  save(){stack.push(m.clone())},restore(){m=stack.pop()||new THREE.Matrix3()},
  translate(x,y){m.multiply(new THREE.Matrix3().set(1,0,x,0,1,y,0,0,1))},
  scale(x,y){m.multiply(new THREE.Matrix3().set(x,0,0,0,y,0,0,0,1))},
  at(x,y){const v=new THREE.Vector3(x,y,1).applyMatrix3(m);return[v.x,v.y]},
  fillText(text,x,y){calls.push({op:'fillText',text,at:ctx.at(x,y),height:Math.abs(m.elements[4])*100})},
  drawImage(image,x,y,w,h){calls.push({op:'drawImage',at:ctx.at(x+w/2,y+h/2),size:[Math.abs(w*m.elements[0]),Math.abs(h*m.elements[4])]})},
  fillRect(x,y,w,h){calls.push({op:'fillRect',style:ctx.fillStyle,at:ctx.at(x,y)})},
  createLinearGradient:()=>({addColorStop(){}})};
 for(const k of ['beginPath','rect','clip','moveTo','lineTo','quadraticCurveTo','closePath','fill','stroke','strokeText','arc'])ctx[k]=()=>{};
 return ctx;
}

test('kit canvas: big number and name on the back, crest on the left chest',()=>{
 const ctx=recordingContext(),size=1024,crest={};
 paintFooteraHumanKit(ctx,size,{shirt:'#d8ff3e',shirtSecondary:'#173627',pattern:'stripes',shorts:'#173627',socks:'#d8ff3e'},
  {number:10,shirtName:'MUSIALA',crest},info);
 const texts=ctx.calls.filter(c=>c.op==='fillText');
 const back=texts.find(c=>c.text==='10'&&c.at[0]>size/2);
 assert.ok(back,'number on the back half');
 assert.ok(Math.abs(back.at[0]-size*.75)<2,'centred on the back');
 assert.ok(back.height>size*.12,'back number is big: '+back.height);
 const front=texts.find(c=>c.text==='10'&&c.at[0]<size/2);
 assert.ok(front&&front.height<back.height/3,'small chest number');
 const name=texts.find(c=>c.text==='MUSIALA');
 assert.ok(name.at[0]>size/2&&name.at[1]<back.at[1],'name above the number');
 const badge=ctx.calls.find(c=>c.op==='drawImage');
 assert.ok(badge.at[0]>size*.25&&badge.at[0]<size*.5,'crest on the player\'s left chest');
 const {bands}=footeraKitLayout(info);
 assert.ok(badge.at[1]<size*bands.shirt[1]*.5,'crest high on the chest');
 assert.ok(ctx.calls.some(c=>c.op==='fillRect'&&c.style==='#173627'),'stripes painted in the second colour');
});

test('kit canvas: number colour contrasts with the shirt',()=>{
 for(const [shirt,ink] of [['#ffffff','#141820'],['#0b1f4a','#f6f4ee']]){
  const ctx=recordingContext();let style=null;const fillText=ctx.fillText;
  ctx.fillText=function(...a){style??=ctx.fillStyle;return fillText.apply(this,a)};
  paintFooteraHumanKit(ctx,256,{shirt,shirtSecondary:shirt,pattern:'solid'},{number:7},info);
  assert.equal(style,ink);
 }
});
