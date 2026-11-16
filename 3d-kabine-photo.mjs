/* Footera V21.443 Siegerfoto aus der Kabine (Basti: "beim Thema Mannschaftsfoto
 * wirklich ein Siegerbild aus der Kabine"). After a win the squad poses in the
 * dressing room like the real Bundesliga victory photos: the back row up on
 * the bench in front of the lockers, fists and arms up, some shirts off, towels,
 * drink crates, the trophy after a title. Everything is our own 3D render of
 * the user's actual players (bodies, faces, hair, skin from the player looks,
 * club kit, crest and squad numbers); no press photo is used.
 * Pure presentation: one still picture, rendered once on a private canvas and
 * returned as a JPEG data URL. Layout and poses are a pure function of the seed.
 */
import * as THREE from './vendor/three/three.module.min.js';
import {RoomEnvironment} from './vendor/three/RoomEnvironment.mjs';
import {prepareFooteraHumanModel,footeraRealBodyLoaded,footeraHumanSource,footeraHumanLook,dressFooteraHuman,
 footeraShirtName,loadFooteraCrestImage,footeraCrestImageNow} from './3d-player-human.mjs?v=21441';
import {createCaptureRetarget} from './3d-mocap-capture-core.mjs?v=21353';
import {FOOTERA_MIXAMO_CELEBRATE} from './3d-mocap-mixamo-celebrate-data.mjs?v=21439';

export const KABINE_PHOTO_VERSION='21.443-kabine-photo';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function photoHash(text){
 let h=2166136261;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}
 h^=h>>>16;h=Math.imul(h,0x85ebca6b)>>>0;h^=h>>>13;return(h^h>>>16)>>>0;
}
const rand=(seed,salt)=>photoHash(seed+'|'+salt)/4294967296;
// Player complexion only from the player record (tone 1-6 or #hex), as in the match scenes.
const SKIN=['#f1d2b3','#dbad88','#c88f69','#a96d4b','#805035','#503326'];
export function photoSkin(value){
 if(typeof value==='number'&&value>=1&&value<=6)return SKIN[Math.round(value)-1];
 const v=String(value??'').trim().toLowerCase();
 if(/^[1-6]$/.test(v))return SKIN[Number(v)-1];
 if(/^#[0-9a-f]{6}$/.test(v))return v;
 return SKIN[2];
}
const hexOr=(v,fb)=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v):fb;

// Poses: frames of the Mixamo celebration captures (30 fps) where the arms are up.
// arms: what the picture shows (fists, arms up, wave), used to keep a row varied.
// Arms on top of the capture: directions in the player's frame [out, up, forward]
// for the upper arm and the forearm. 'fists' = fists by the head, 'roar' = arms
// straight up, 'flex' = biceps, 'point' = pointing at the phone, 'hug' = arm over
// the next player's shoulders, 'pump' = low fist pump.
export const PHOTO_ARMS=Object.freeze({
 fists:{upper:[.85,.3,.3],lower:[-.25,1,.15],fist:true},
 roar:{upper:[.42,1,.18],lower:[.4,1,.2],fist:true},
 flex:{upper:[1,.05,.12],lower:[-.08,1,.05],fist:true},
 point:{upper:[.15,.1,1],lower:[.08,.15,1],fist:false},
 hug:{upper:[.95,.05,.12],lower:[.65,-.6,.3],fist:false},
 pump:{upper:[.3,-.5,.55],lower:[0,.75,.65],fist:true},
 bottle:{upper:[.4,.35,.55],lower:[0,1,.3],fist:true,bottle:true},
 trophy:{upper:[.3,1,.22],lower:[-.42,1,.12],fist:false}
});
// Per row: up on the bench arms go high, in the middle fists and hugs, kneeling in front low (never over a face behind).
const ARM_PAIRS={
 back:[['roar','roar'],['fists','fists'],['roar','bottle'],['fists','roar'],['flex','flex'],['bottle','fists'],['roar','fists']],
 mid:[['fists','fists'],['hug','fists'],['flex','flex'],['hug','hug'],['point','fists'],['fists','bottle'],['hug','roar'],['fists','flex']],
 front:[['pump','pump'],['flex','flex'],['point','pump'],['pump','flex'],['fists','pump'],['point','flex']]
};
// Variants: 'win' (normal), 'big' (4+ goals or a comeback: more shirts off, confetti), 'title' (trophy).
export function photoVariant(spec={}){
 if(spec.title)return'title';
 const gh=Number(spec.gh)||0,ga=Number(spec.ga)||0;
 return spec.big||gh-ga>=4?'big':'win';
}
// Rows from the back (standing on the bench) to the front (kneeling).
export function photoRows(n){
 n=Math.max(1,Math.min(16,n|0));
 if(n<=3)return[n];
 if(n<=6)return[n-Math.floor(n/2),Math.floor(n/2)];
 const front=n>=14?5:n>=10?4:n>=8?3:2,back=Math.ceil((n-front)/2);return[back,n-front-back,front];
}
// Pure layout: where everyone stands, his pose and outfit. players: [{name,...}], same order every time.
export function photoLayout(spec={}){
 const seed=String(spec.seed||'kabine'),players=(spec.players||[]).slice(0,16),variant=photoVariant(spec);
 const rows=photoRows(players.length),out=[];
 // The captain (or the first player) kneels in the middle of the front, with the trophy after a title.
 // No captain given: the first outfield player. Keepers stand in the back row.
 let capIdx=players.findIndex(p=>p&&p.captain);if(capIdx<0)capIdx=Math.max(0,players.findIndex(p=>p&&!p.keeper));
 const order=players.map((p,i)=>i).filter(i=>i!==capIdx).sort((a,b)=>(players[b]?.keeper?1:0)-(players[a]?.keeper?1:0)||photoHash(seed+'o'+a)-photoHash(seed+'o'+b));
 const rowSlots=[];rows.forEach((count,r)=>{for(let k=0;k<count;k++)rowSlots.push({r,k,count})});
 const last=rows.length-1,mid=Math.floor(rows[last]/2);
 const capSlot=rowSlots.findIndex(s=>s.r===last&&s.k===mid);
 const assign=new Array(rowSlots.length);assign[capSlot]=capIdx;
 let q=0;for(let i=0;i<rowSlots.length;i++)if(i!==capSlot)assign[i]=order[q++];
 const towels=variant==='big'?.3:.18;
 rowSlots.forEach((slot,i)=>{
  const pi=assign[i];if(pi==null)return;
  const p=players[pi],{r,k,count}=slot;
  const back=r===0&&rows.length>1,front=r===last&&rows.length>2;
  const gap=back?.66:front?.7:.64,u=k-(count-1)/2;
  const x=u*gap+(rand(seed,'x'+i)-.5)*.1+(!back&&!front&&rows.length>2?gap*.5*((rows[0]-count)%2?0:1)*.0:0);
  const z=back?-2.06:front?-.7:-1.3+(rand(seed,'z'+i)-.5)*.16;
  const y=back?.46:0;
  const isCap=pi===capIdx,keeper=!!p.keeper;
  // the body from a celebration capture, the arms our own (fists, arms up, flexing ...)
  const base=['cheer','cheer2','cheer3','wave','wave2'][photoHash(seed+'b'+pi)%5];
  const pose={cheer:{clip:'cheering',frame:22},cheer2:{clip:'cheering',frame:40},cheer3:{clip:'cheering',frame:58},wave:{clip:'waving',frame:30},wave2:{clip:'waving',frame:60}}[base];
  const set=ARM_PAIRS[back?'back':front?'front':'mid'];
  let arms=set[photoHash(seed+'a'+pi)%set.length];
  // the outermost players hug inwards only
  const mirror=photoHash(seed+'m'+pi)%2;if(mirror)arms=[arms[1],arms[0]];
  // the outermost players hug inwards only (index 0 = his left arm, on the camera's right)
  if(count>1&&(k===0||k===count-1))arms=arms.map((a,j)=>a==='hug'&&(j===0)!==(k===0)?'fists':a);
  if(isCap&&variant==='title')arms=['trophy','trophy'];
  const outfit=!keeper&&rand(seed,'s'+pi)<towels?'towel':'shirt';
  out.push({index:pi,name:String(p.name||''),x,y,z,row:r,back,front,kneel:front&&!(isCap&&variant==='title'),captain:isCap,
   pose,arms,mirror,outfit,
   yaw:(rand(seed,'yaw'+pi)-.5)*.3});
 });
 return{variant,rows,actors:out};
}

/* ---------- textures ---------- */
function canvasTexture(w,h,paint,srgb=true){
 const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(ctx)paint(ctx,w,h);
 const t=new THREE.CanvasTexture(c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function shade(hex,f){const c=new THREE.Color(hex);if(f<1)c.multiplyScalar(f);else c.lerp(new THREE.Color('#ffffff'),f-1);return'#'+c.getHexString()}
function floorTexture(){
 return canvasTexture(512,512,(g,w,h)=>{
  g.fillStyle='#4a4b4f';g.fillRect(0,0,w,h);
  // rubber floor tiles with grain
  let r=7;const random=()=>(r=(Math.imul(1664525,r)+1013904223)>>>0)/4294967296;
  for(let i=0;i<9000;i++){const v=60+random()*30|0;g.fillStyle=`rgba(${v},${v},${v+3},.35)`;g.fillRect(random()*w,random()*h,2,2)}
  g.strokeStyle='rgba(20,20,22,.55)';g.lineWidth=3;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*w/4,0);g.lineTo(i*w/4,h);g.stroke();g.beginPath();g.moveTo(0,i*h/4);g.lineTo(w,i*h/4);g.stroke()}
 });
}
function wallTexture(kit,club,crestImg){
 return canvasTexture(2048,512,(g,w,h)=>{
  // painted wall with a club band and the club name, like real dressing rooms
  g.fillStyle='#e9e6df';g.fillRect(0,0,w,h);
  const band=g.createLinearGradient(0,0,0,h);band.addColorStop(0,shade(kit.shirt,.55));band.addColorStop(1,shade(kit.shirt,.9));
  g.fillStyle=band;g.fillRect(0,h*.18,w,h*.64);
  g.fillStyle=kit.shirtSecondary;g.fillRect(0,h*.18,w,10);g.fillRect(0,h*.82-10,w,10);
  g.font='900 150px "Arial Narrow","Roboto Condensed",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';
  g.fillStyle='rgba(255,255,255,.92)';
  const text=String(club||'FOOTERA').toUpperCase().slice(0,26);
  g.fillText(text,w/2+(crestImg?110:0),h/2+6,w*.72);
  if(crestImg){const s=h*.5,tw=Math.min(g.measureText(text).width,w*.72);g.drawImage(crestImg,w/2-tw/2-s-40+110,h/2-s/2,s,s)}
 });
}
function lockerBackTexture(kit){
 return canvasTexture(256,512,(g,w,h)=>{
  const grad=g.createLinearGradient(0,0,0,h);grad.addColorStop(0,shade(kit.shirt,.62));grad.addColorStop(1,shade(kit.shirt,.42));
  g.fillStyle=grad;g.fillRect(0,0,w,h);
  g.fillStyle='rgba(255,255,255,.06)';for(let x=0;x<w;x+=16)g.fillRect(x,0,2,h);
 });
}
function plateTexture(name,number,kit){
 return canvasTexture(512,160,(g,w,h)=>{
  g.fillStyle='#16191d';g.fillRect(0,0,w,h);
  g.fillStyle=kit.shirtSecondary;g.fillRect(0,h-10,w,10);
  g.font='900 92px "Arial Narrow","Roboto Condensed",Arial,sans-serif';g.textBaseline='middle';g.textAlign='left';
  g.fillStyle=kit.shirtSecondary;g.fillText(String(number||''),20,h/2);
  g.font='800 58px "Arial Narrow","Roboto Condensed",Arial,sans-serif';g.fillStyle='#f4f1ea';
  g.fillText(String(footeraShirtName(name)||name).toUpperCase().slice(0,14),number>9?150:110,h/2+2,w-(number>9?165:125));
 });
}
function hangingShirtTexture(kit,number,name){
 return canvasTexture(256,320,(g,w,h)=>{
  g.clearRect(0,0,w,h);
  const body=new Path2D();
  body.moveTo(w*.3,h*.06);body.lineTo(w*.05,h*.2);body.lineTo(w*.12,h*.42);body.lineTo(w*.24,h*.36);body.lineTo(w*.24,h*.97);
  body.lineTo(w*.76,h*.97);body.lineTo(w*.76,h*.36);body.lineTo(w*.88,h*.42);body.lineTo(w*.95,h*.2);body.lineTo(w*.7,h*.06);
  body.quadraticCurveTo(w*.5,h*.16,w*.3,h*.06);body.closePath();
  g.fillStyle=kit.shirt;g.fill(body);
  g.save();g.clip(body);
  if(kit.pattern==='stripes'||kit.pattern==='pinstripes'){g.fillStyle=kit.shirtSecondary;for(let x=0;x<w;x+=w/7)g.fillRect(x,0,w/14,h)}
  else if(kit.pattern==='hoops'){g.fillStyle=kit.shirtSecondary;for(let y=0;y<h;y+=h/6)g.fillRect(0,y,w,h/12)}
  else if(kit.pattern==='halves'){g.fillStyle=kit.shirtSecondary;g.fillRect(w/2,0,w/2,h)}
  else if(kit.pattern==='sleeves'||kit.pattern==='shoulders'){g.fillStyle=kit.shirtSecondary;g.fillRect(0,0,w*.25,h);g.fillRect(w*.75,0,w*.25,h)}
  const shadeG=g.createLinearGradient(0,0,w,0);shadeG.addColorStop(0,'rgba(0,0,0,.28)');shadeG.addColorStop(.5,'rgba(0,0,0,0)');shadeG.addColorStop(1,'rgba(0,0,0,.28)');
  g.fillStyle=shadeG;g.fillRect(0,0,w,h);g.restore();
  // the back of the shirt: name and number
  const ink=new THREE.Color(kit.shirt).getHSL({}).l>.6?'#16191d':'#ffffff';
  g.fillStyle=ink;g.textAlign='center';g.textBaseline='middle';
  g.font='800 30px "Arial Narrow","Roboto Condensed",Arial,sans-serif';g.fillText(String(footeraShirtName(name)||'').toUpperCase().slice(0,12),w/2,h*.3,w*.48);
  g.font='900 120px "Arial Narrow","Roboto Condensed",Arial,sans-serif';g.fillText(String(number||''),w/2,h*.6);
  // hanger
  g.strokeStyle='#8f8f8f';g.lineWidth=5;g.beginPath();g.moveTo(w*.5,h*.1);g.lineTo(w*.5,0);g.stroke();
 });
}
function crateTexture(color){
 return canvasTexture(256,128,(g,w,h)=>{
  g.fillStyle=color;g.fillRect(0,0,w,h);
  g.fillStyle='rgba(0,0,0,.25)';g.fillRect(w*.3,h*.22,w*.4,h*.2);
  g.fillStyle='rgba(255,255,255,.12)';for(let x=0;x<w;x+=w/8)g.fillRect(x,h*.55,w/16,h*.4);
 });
}

/* ---------- scene ---------- */
function stdMat(color,opts={}){return new THREE.MeshStandardMaterial({color,roughness:.8,metalness:0,...opts})}
function buildRoom(scene,spec,kit,crestImg,owned,seed,variant){
 const add=(mesh,cast=true,receive=true)=>{mesh.castShadow=cast;mesh.receiveShadow=receive;scene.add(mesh);owned.push(mesh);return mesh};
 const W=8.4,D=7,H=3.05,BACK=-2.85;
 const floorTex=floorTexture();floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(5,4);
 add(new THREE.Mesh(new THREE.PlaneGeometry(W,D),stdMat('#ffffff',{map:floorTex,roughness:.92})),false).rotation.x=-Math.PI/2;
 // walls
 const wall=stdMat('#e4e1da',{roughness:.95});
 const back=add(new THREE.Mesh(new THREE.PlaneGeometry(W,H),wall),false);back.position.set(0,H/2,BACK);
 for(const s of [-1,1]){const side=add(new THREE.Mesh(new THREE.PlaneGeometry(D,H),wall),false);side.position.set(s*W/2,H/2,BACK+D/2);side.rotation.y=-s*Math.PI/2}
 const ceiling=add(new THREE.Mesh(new THREE.PlaneGeometry(W,D),stdMat('#8f8c86',{roughness:1})),false,false);ceiling.position.set(0,H,BACK+D/2);ceiling.rotation.x=Math.PI/2;
 // club band with the club name above the lockers
 const band=add(new THREE.Mesh(new THREE.PlaneGeometry(W,W/4),stdMat('#ffffff',{map:wallTexture(kit,spec.club,crestImg),roughness:.9})),false);
 band.scale.set(1,.4,1);band.position.set(0,2.62,BACK+.01);
 // lockers: open cubicles with nameplates of the squad and their hanging shirts
 const names=(spec.players||[]).map(p=>p);
 const lockerW=.96,count=8,lockerH=2.02,depth=.5,front=BACK+depth;
 const frameMat=stdMat(shade(kit.shirt,.35),{roughness:.55});
 const backTex=lockerBackTexture(kit),backMat=stdMat('#ffffff',{map:backTex,roughness:.7});
 for(let i=0;i<count;i++){
  const x=(i-(count-1)/2)*lockerW;
  const panel=add(new THREE.Mesh(new THREE.PlaneGeometry(lockerW-.04,lockerH),backMat),false);panel.position.set(x,.2+lockerH/2,BACK+.02);
  const div=add(new THREE.Mesh(new THREE.BoxGeometry(.045,lockerH,depth),frameMat));div.position.set(x-lockerW/2,.2+lockerH/2,BACK+depth/2);
  if(i===count-1){const d2=div.clone();d2.position.x=x+lockerW/2;add(d2)}
  const shelf=add(new THREE.Mesh(new THREE.BoxGeometry(lockerW,.04,depth),frameMat));shelf.position.set(x,.2+lockerH-.34,BACK+depth/2);
  const p=names[(i+photoHash(seed+'locker')%Math.max(1,names.length))%Math.max(1,names.length)];
  if(p){
   const plate=add(new THREE.Mesh(new THREE.PlaneGeometry(.78,.24),stdMat('#ffffff',{map:plateTexture(p.name,p.number,kit),roughness:.5})),false);
   plate.position.set(x,.2+lockerH-.17,BACK+depth-.02);
   if(photoHash(seed+'shirt'+i)%3!==0){
    const shirt=add(new THREE.Mesh(new THREE.PlaneGeometry(.58,.72),stdMat('#ffffff',{map:hangingShirtTexture(kit,p.number,p.name),transparent:true,alphaTest:.4,roughness:.85,side:THREE.DoubleSide})),false);
    shirt.position.set(x+(rand(seed,'sx'+i)-.5)*.08,1.62,BACK+.12);shirt.rotation.z=(rand(seed,'sr'+i)-.5)*.06;
   }
  }
  // bags and boots on the shelf
  if(photoHash(seed+'bag'+i)%2===0){const bag=add(new THREE.Mesh(new THREE.BoxGeometry(.5,.24,.3),stdMat(i%2?'#1b1f25':shade(kit.shirt,.7),{roughness:.7})));bag.position.set(x,.2+lockerH-.2,BACK+.22)}
 }
 const top=add(new THREE.Mesh(new THREE.BoxGeometry(count*lockerW+.1,.08,depth+.06),frameMat));top.position.set(0,.2+lockerH,BACK+depth/2);
 const base=add(new THREE.Mesh(new THREE.BoxGeometry(count*lockerW+.1,.2,depth),stdMat('#2a2c30',{roughness:.6})));base.position.set(0,.1,BACK+depth/2);
 // the bench in front of the lockers (the back row stands on it)
 const wood=stdMat('#b98a5a',{roughness:.55});
 const bench=add(new THREE.Mesh(new THREE.BoxGeometry(count*lockerW,.06,.42),wood));bench.position.set(0,.43,front+.24);
 for(let i=0;i<5;i++){const leg=add(new THREE.Mesh(new THREE.BoxGeometry(.06,.4,.36),stdMat('#3b3e44',{metalness:.4,roughness:.4})));leg.position.set((i-2)*1.8,.2,front+.24)}
 // ceiling light panels
 const lightMat=new THREE.MeshBasicMaterial({color:'#fffaf0'});
 for(const [x,z] of [[-2.2,-1.4],[0,-1.4],[2.2,-1.4],[-2.2,.9],[0,.9],[2.2,.9]]){const l=add(new THREE.Mesh(new THREE.PlaneGeometry(1.2,.6),lightMat),false,false);l.position.set(x,H-.01,z);l.rotation.x=Math.PI/2}
 // drink crates, towels, balls, boots on the floor
 const crateColors=['#c4161c','#1b4fa0','#e8b100','#2c7a3a'];
 const crates=2+photoHash(seed+'crates')%3;
 for(let i=0;i<crates;i++){
  const side=i%2?1:-1,cx=side*(2.75+rand(seed,'cx'+i)*.55),cz=-1.6+i*.55+rand(seed,'cz'+i)*.3;
  const col=crateColors[photoHash(seed+'cc'+i)%crateColors.length];
  const crate=add(new THREE.Mesh(new THREE.BoxGeometry(.42,.3,.32),stdMat('#ffffff',{map:crateTexture(col),roughness:.6})));
  crate.position.set(cx,.15+(i>=2?0:0),cz);crate.rotation.y=(rand(seed,'cr'+i)-.5)*.5;
  const bottleMat=stdMat(photoHash(seed+'bt'+i)%2?'#3a2410':'#2d6b2a',{roughness:.15,metalness:.1,transparent:true,opacity:.92});
  for(let b=0;b<6;b++){const bottle=add(new THREE.Mesh(new THREE.CylinderGeometry(.028,.032,.24,10),bottleMat));
   bottle.position.set(cx+((b%3)-1)*.12,.38,cz+(b<3?-.07:.07));bottle.rotation.y=crate.rotation.y}
  if(i===0){const stack=crate.clone();stack.position.y=.45;add(stack)}
 }
 const towelMat=stdMat('#f3f1ea',{roughness:1});
 for(let i=0;i<3;i++){const t=add(new THREE.Mesh(new THREE.BoxGeometry(.6,.05,.42),towelMat));t.position.set((rand(seed,'tw'+i)-.5)*6,.48,front+.24);t.rotation.y=(rand(seed,'twr'+i)-.5)*.6}
 const ballMat=stdMat('#f6f6f2',{roughness:.45});
 for(let i=0;i<2;i++){const ball=add(new THREE.Mesh(new THREE.SphereGeometry(.11,20,14),ballMat));ball.position.set((i?1:-1)*(1.9+rand(seed,'bx'+i)*.6),.11,.55+rand(seed,'bz'+i)*.4)}
 // a few cups and bottles on the floor
 for(let i=0;i<5;i++){const cup=add(new THREE.Mesh(new THREE.CylinderGeometry(.04,.03,.11,10),stdMat(i%2?'#d32f2f':'#f5f5f5',{roughness:.5})));cup.position.set((rand(seed,'cupx'+i)-.5)*5.5,.055,.3+rand(seed,'cupz'+i)*1.1);if(i%3===0){cup.rotation.z=Math.PI/2;cup.position.y=.04}}
 // confetti after big wins and titles
 if(variant!=='win'){
  const colors=[kit.shirt,kit.shirtSecondary,'#ffd447','#ffffff'];
  let r=photoHash(seed+'confetti');const random=()=>(r=(Math.imul(1664525,r)+1013904223)>>>0)/4294967296;
  const geo=new THREE.PlaneGeometry(.035,.022);
  for(const col of colors){
   const mat=new THREE.MeshStandardMaterial({color:col,roughness:.5,side:THREE.DoubleSide});
   const n=variant==='title'?120:60,inst=new THREE.InstancedMesh(geo,mat,n),m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
   for(let i=0;i<n;i++){
    const air=random()<.6;
    e.set(random()*6,random()*6,random()*6);q.setFromEuler(e);
    m.compose(new THREE.Vector3((random()-.5)*6.5,air?.4+random()*2.4:.005,-2.3+random()*3.6),q,new THREE.Vector3(1,1,1));inst.setMatrixAt(i,m);
   }
   inst.castShadow=false;inst.receiveShadow=false;scene.add(inst);owned.push(inst);
  }
 }
}
function trophyMesh(owned){
 const g=new THREE.Group();g.name='FooteraKabineTrophy';
 const gold=new THREE.MeshStandardMaterial({color:'#e2b54a',metalness:1,roughness:.22});
 const silver=new THREE.MeshStandardMaterial({color:'#dfe3e8',metalness:1,roughness:.18});
 const pts=[[0,0],[.09,0],[.09,.03],[.05,.05],[.035,.12],[.03,.2],[.06,.24],[.13,.3],[.16,.4],[.15,.48],[.0,.48]].map(([x,y])=>new THREE.Vector2(x,y));
 const cup=new THREE.Mesh(new THREE.LatheGeometry(pts,32),silver);g.add(cup);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.1,.11,.06,24),gold);base.position.y=.03;g.add(base);
 for(const s of [-1,1]){const handle=new THREE.Mesh(new THREE.TorusGeometry(.07,.012,8,20,Math.PI*1.2),silver);handle.position.set(s*.165,.38,0);handle.rotation.z=s>0?-Math.PI*.6:Math.PI*1.6;g.add(handle)}
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;owned.push(o)}});
 return g;
}

/* ---------- players ---------- */
function bonesOf(model){const bones=new Map();model.traverse(n=>{if(n.isBone)bones.set(n.name,n)});return bones}
function mountPlayer(scene,actor,p,kit,keeperKit,crestImg,owned){
 const look=footeraHumanLook(p.name,photoSkin(p.skin),undefined,p.look||null,{keeper:!!p.keeper});
 const asset=footeraHumanSource(look);if(!asset)return null;
 const model=asset.clone(asset.scene);
 const dressed=dressFooteraHuman(THREE,model,look,p.keeper?keeperKit:kit,{detail:true,number:p.number,shirtName:footeraShirtName(p.name),crest:crestImg,boots:'#20262b',captain:!!p.captain});
 for(const o of dressed.owned){owned.push(o)}
 const meshes=[];model.traverse(n=>{if(n.isSkinnedMesh){n.frustumCulled=false;n.castShadow=true;n.receiveShadow=true;meshes.push(n)}});
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3();for(const m of meshes)if(m.name==='FooteraBody'||m.name==='FooteraBoots')bounds.expandByObject(m);
 const size=bounds.getSize(new THREE.Vector3());if(size.y<.05)return null;
 const height=Number.isFinite(look.height)?look.height:look.female?1.72:1.83,scale=height/size.y,center=bounds.getCenter(new THREE.Vector3());
 const root=new THREE.Group();root.name='FooteraKabinePlayer';
 const holder=new THREE.Group();holder.add(model);root.add(holder);
 model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
 scene.add(root);
 return{root,holder,model,meshes,bones:bonesOf(model),look,scale};
}
const UP=new THREE.Vector3(0,1,0);
function poseActor(p,actor,camera){
 const {root,bones}=p;
 root.position.set(actor.x,actor.y,actor.z);
 // face the camera, a little turned
 const toCam=Math.atan2(camera.position.x-actor.x,camera.position.z-actor.z);
 root.rotation.y=toCam+actor.yaw;
 root.updateMatrixWorld(true);
 const footY=Math.min(...['foot_l','foot_r'].map(n=>bones.get(n)?.getWorldPosition(new THREE.Vector3()).y??0));
 const rig=createCaptureRetarget(bones,root,FOOTERA_MIXAMO_CELEBRATE);
 if(rig){
  const legs=actor.back?.55:1;
  rig.pose(actor.pose.clip,actor.pose.frame,{body:1,legs:actor.kneel?0:legs},actor.mirror);
 }
 if(actor.kneel)kneel(bones,root,actor.mirror);
 if(actor.arms)applyArms(bones,root,actor.arms);
 // look into the camera
 aimHead(bones,camera);
 root.updateMatrixWorld(true);
 // feet back onto the floor (or the bench)
 const lows=actor.kneel?[['calf_l',.06],['calf_r',.06],['ball_l',.02],['ball_r',.02]]:[['foot_l',footY-actor.y],['foot_r',footY-actor.y]];
 let low=Infinity;for(const [n,off] of lows){const b=bones.get(n);if(b)low=Math.min(low,b.getWorldPosition(new THREE.Vector3()).y-off)}
 if(Number.isFinite(low))root.position.y+=actor.y-low;
 root.updateMatrixWorld(true);
}
// One knee down in the front row: world-space bone directions, posed parents first.
function pointBone(bone,child,dirWorld){
 bone.updateMatrixWorld(true);
 const a=bone.getWorldPosition(new THREE.Vector3()),b=child.getWorldPosition(new THREE.Vector3());
 const cur=b.sub(a).normalize(),q=new THREE.Quaternion().setFromUnitVectors(cur,dirWorld.clone().normalize());
 const wq=bone.getWorldQuaternion(new THREE.Quaternion()),pq=bone.parent.getWorldQuaternion(new THREE.Quaternion());
 bone.quaternion.copy(pq.invert().multiply(q.multiply(wq)));bone.updateMatrixWorld(true);
}
function kneel(bones,root,mirror){
 root.updateMatrixWorld(true);
 const fwd=new THREE.Vector3(0,0,1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize();
 const left=new THREE.Vector3().crossVectors(UP,fwd).normalize();
 const [up,down]=mirror?['r','l']:['l','r'];
 const side=s=>s==='l'?1:-1;
 // standing knee: thigh forward, shin down
 const t1=bones.get('thigh_'+up),c1=bones.get('calf_'+up),f1=bones.get('foot_'+up);
 const t2=bones.get('thigh_'+down),c2=bones.get('calf_'+down),f2=bones.get('foot_'+down);
 if(!t1||!c1||!f1||!t2||!c2||!f2)return;
 pointBone(t1,c1,fwd.clone().multiplyScalar(.95).addScaledVector(UP,-.02).addScaledVector(left,side(up)*.18));
 pointBone(c1,f1,UP.clone().negate().addScaledVector(fwd,-.05));
 // kneeling leg: thigh down, shin back on the floor
 pointBone(t2,c2,UP.clone().negate().addScaledVector(fwd,.42).addScaledVector(left,side(down)*.1));
 pointBone(c2,f2,fwd.clone().negate().addScaledVector(UP,-.08));
 const ball=bones.get('ball_'+down);if(ball)pointBone(f2,ball,fwd.clone().negate().addScaledVector(UP,-.6));
 // hips sink a little, the upper body stays upright
 const pelvis=bones.get('pelvis');if(pelvis){pelvis.updateMatrixWorld(true)}
}
function bodyFrame(root){
 const fwd=new THREE.Vector3(0,0,1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize();
 return{fwd,left:new THREE.Vector3().crossVectors(UP,fwd).normalize()};
}
function frameDir(f,side,[o,u,w]){return f.left.clone().multiplyScalar(side==='l'?o:-o).addScaledVector(UP,u).addScaledVector(f.fwd,w).normalize()}
export function applyArms(bones,root,arms){
 root.updateMatrixWorld(true);const f=bodyFrame(root);
 ['l','r'].forEach((side,i)=>{
  const a=PHOTO_ARMS[arms[i]];if(!a)return;
  const up=bones.get('upperarm_'+side),lo=bones.get('lowerarm_'+side),hand=bones.get('hand_'+side);if(!up||!lo||!hand)return;
  pointBone(up,lo,frameDir(f,side,a.upper));
  pointBone(lo,hand,frameDir(f,side,a.lower));
  // the hand carries on the forearm's line
  const mid=bones.get('middle_01_'+side);if(mid)pointBone(hand,mid,frameDir(f,side,a.lower));
  if(a.fist)makeFist(bones,side);
 });
}
let FIST_SIGN=-1;export function _setFistSign(v){FIST_SIGN=v}
// Fingers fold into the palm (one bone per finger in our rig).
function makeFist(bones,side){
 const hand=bones.get('hand_'+side),thumb=bones.get('thumb_01_'+side),mid=bones.get('middle_01_'+side);if(!hand||!thumb||!mid)return;
 hand.updateMatrixWorld(true);
 const h=hand.getWorldPosition(new THREE.Vector3()),d=mid.getWorldPosition(new THREE.Vector3()).sub(h).normalize();
 const t=thumb.getWorldPosition(new THREE.Vector3()).sub(h);t.addScaledVector(d,-t.dot(d)).normalize();
 // curl round the knuckle line (thumb direction), towards the palm
 const palm=t.clone().multiplyScalar(FIST_SIGN*(side==='l'?1:-1));
 for(const finger of ['index','middle','ring','pinky'])[[1,1.15],[2,1.35],[3,.9]].forEach(([joint,angle])=>{
  const bone=bones.get(finger+'_0'+joint+'_'+side);if(!bone)return;
  const wq=bone.getWorldQuaternion(new THREE.Quaternion()),pq=bone.parent.getWorldQuaternion(new THREE.Quaternion());
  const q=new THREE.Quaternion().setFromAxisAngle(palm,angle);
  bone.quaternion.copy(pq.invert().multiply(q.multiply(wq)));bone.updateMatrixWorld(true);
 });
}
function aimHead(bones,camera){
 const head=bones.get('Head'),neck=bones.get('neck_01');if(!head)return;
 for(const [bone,share] of [[neck,.45],[head,.7]]){
  if(!bone)continue;
  bone.updateMatrixWorld(true);
  const pos=bone.getWorldPosition(new THREE.Vector3());
  const facing=new THREE.Vector3(0,0,1).applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion()));
  // the head's forward axis in our rig: measured from the eyes direction of the root
  const want=camera.position.clone().sub(pos).normalize();
  const root=bone;let fwd=bone.userData.kbForward;
  if(!fwd)continue;
  const cur=fwd.clone().applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion())).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(cur,want);
  q.slerp(new THREE.Quaternion(),1-share);
  const wq=bone.getWorldQuaternion(new THREE.Quaternion()),pq=bone.parent.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(pq.invert().multiply(q.multiply(wq)));bone.updateMatrixWorld(true);
  void facing;void root;
 }
}
// The head's forward direction in its own space, measured in the rest pose (the model faces +Z).
function measureHeadForward(p){
 p.root.updateMatrixWorld(true);
 for(const name of ['neck_01','Head']){
  const bone=p.bones.get(name);if(!bone)continue;
  const fwd=new THREE.Vector3(0,0,1).applyQuaternion(p.root.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion()).invert());
  bone.userData.kbForward=fwd.normalize();
 }
}
// A towel over the neck: a soft band from the chest over the shoulders.
function addTowel(p,owned,color){
 const neck=p.bones.get('neck_01'),spine=p.bones.get('spine_03');if(!neck||!spine)return;
 p.root.updateMatrixWorld(true);
 const at=neck.getWorldPosition(new THREE.Vector3()),f=bodyFrame(p.root);
 const chest=spine.getWorldPosition(new THREE.Vector3());
 const pts=[];
 for(const s of [-1,1]){
  // front end hangs down the chest, the band goes round the back of the neck
  pts.push([s*.1,chest.y-at.y-.16,.12],[s*.11,-.02,.1],[s*.12,.03,.0],[s*.06,.04,-.08]);
 }
 const path=[pts[0],pts[1],pts[2],pts[3],[0,.045,-.1],pts[7],pts[6],pts[5],pts[4]].map(([x,y,z])=>at.clone().addScaledVector(f.left,x).addScaledVector(UP,y).addScaledVector(f.fwd,z));
 const curve=new THREE.CatmullRomCurve3(path);
 const geo=new THREE.TubeGeometry(curve,40,.032,8,false);
 geo.scale(1,1,1);
 const towel=new THREE.Mesh(geo,stdMat(color,{roughness:1}));towel.castShadow=true;towel.receiveShadow=true;
 p.root.parent.add(towel);owned.push(towel);
}
function addBottle(p,side,owned,seed){
 const hand=p.bones.get('hand_'+side),mid=p.bones.get('middle_01_'+side);if(!hand||!mid)return;
 const h=hand.getWorldPosition(new THREE.Vector3()),m=mid.getWorldPosition(new THREE.Vector3());
 const glass=new THREE.MeshStandardMaterial({color:photoHash(seed)%2?'#2f6a2a':'#5a3a16',roughness:.12,metalness:.05,transparent:true,opacity:.9});
 const g=new THREE.Group();
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.032,.032,.16,12),glass);body.position.y=.02;
 const neck=new THREE.Mesh(new THREE.CylinderGeometry(.012,.03,.09,12),glass);neck.position.y=.145;
 const label=new THREE.Mesh(new THREE.CylinderGeometry(.0335,.0335,.06,12,1,true),stdMat('#f1e6c8',{roughness:.6}));label.position.y=.01;
 g.add(body,neck,label);g.traverse(o=>{if(o.isMesh){o.castShadow=true;owned.push(o)}});
 g.position.copy(h.clone().lerp(m,.8));g.rotation.z=(photoHash(seed+'t')%100/100-.5)*.6;
 p.root.parent.add(g);
}

/* ---------- render ---------- */
async function loadBodies(timeout=20000){
 await prepareFooteraHumanModel();
 try{await Promise.race([footeraRealBodyLoaded(),new Promise(r=>setTimeout(r,timeout))])}catch(_){}
}
function kitOf(k={},fb){return{shirt:hexOr(k.shirt,fb.shirt),shirtSecondary:hexOr(k.shirtSecondary,hexOr(k.shirt,fb.shirtSecondary)),pattern:String(k.pattern||'solid'),shorts:hexOr(k.shorts,fb.shorts),socks:hexOr(k.socks,fb.socks)}}
// spec: {seed, club, players:[{name,number,skin,look,captain,keeper}], kit, keeperKit, crestHTML, gh, ga, title, big}
// opts: {width, height, quality}. Resolves to {url, width, height, variant}.
export async function renderKabinePhoto(spec={},opts={}){
 if(typeof document==='undefined')throw new Error('no document');
 const width=opts.width||1080,height=opts.height||810,seed=String(spec.seed||'kabine');
 await loadBodies(opts.bodyTimeout);
 const kit=kitOf(spec.kit,{shirt:'#971d42',shirtSecondary:'#f3f4ee',shorts:'#f3f4ee',socks:'#971d42'});
 const keeperKit=kitOf(spec.keeperKit,{shirt:'#f4b52b',shirtSecondary:'#16191d',shorts:'#16191d',socks:'#f4b52b'});
 let crestImg=null;
 if(spec.crestHTML){crestImg=footeraCrestImageNow(spec.crestHTML);if(!crestImg)try{crestImg=await Promise.race([loadFooteraCrestImage(spec.crestHTML),new Promise(r=>setTimeout(()=>r(null),1500))])}catch(_){}}
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,alpha:false});
 const owned=[];
 try{
  renderer.setPixelRatio(1);renderer.setSize(width,height,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.8;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#2a2724');
  const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(new RoomEnvironment(renderer),.04).texture;pmrem.dispose();
  scene.environment=env;owned.push({texture:env});
  const camera=new THREE.PerspectiveCamera(54,width/height,.1,40);
  const layout=spec.qaLayout||photoLayout(spec);
  // a phone held up a little above head height, slightly off centre
  const cx=(rand(seed,'camx')-.5)*.7;
  camera.position.set(cx,1.58,2.85);camera.lookAt(cx*.25,1.12,-1.4);
  if(spec.qaCamera){camera.position.fromArray(spec.qaCamera.pos);camera.fov=spec.qaCamera.fov||camera.fov;camera.updateProjectionMatrix();camera.lookAt(new THREE.Vector3().fromArray(spec.qaCamera.at))}
  camera.updateMatrixWorld(true);
  buildRoom(scene,spec,kit,crestImg,owned,seed,layout.variant);
  // light: warm ceiling panels, a soft fill and the phone's flash (hard shadow on the lockers)
  scene.add(new THREE.HemisphereLight('#fff6e6','#4a4038',.55));
  for(const [x,z] of [[-2.2,-1.2],[0,-1.2],[2.2,-1.2],[0,1]]){const l=new THREE.PointLight('#fff1dc',3.2,0,2);l.position.set(x,2.85,z);scene.add(l)}
  const flash=new THREE.SpotLight('#fff8f0',20,0,Math.PI/3,.7,2);
  flash.position.copy(camera.position).add(new THREE.Vector3(.12,.08,0));flash.target.position.set(cx*.25,1.1,-1.6);
  flash.castShadow=true;flash.shadow.mapSize.set(2048,2048);flash.shadow.bias=-.0004;flash.shadow.normalBias=.02;flash.shadow.radius=4;
  scene.add(flash,flash.target);
  const key=new THREE.DirectionalLight('#fff0dd',.9);key.position.set(-2,3,2);scene.add(key);
  // the players
  const players=spec.players||[],mounted=[];
  for(const actor of layout.actors){
   const p=players[actor.index];if(!p)continue;
   const m=mountPlayer(scene,actor,p,kit,keeperKit,crestImg,owned);if(!m)continue;
   measureHeadForward(m);
   poseActor(m,actor,camera);
   if(actor.outfit==='towel')addTowel(m,owned,photoHash(seed+'tc'+actor.index)%3?'#f3f1ea':kit.shirtSecondary);
   actor.arms?.forEach((a,i)=>{if(a==='bottle')addBottle(m,i?'r':'l',owned,seed+actor.index)});
   mounted.push({m,actor});
  }
  // the trophy, held up between the captain's hands
  if(layout.variant==='title'){
   const cap=mounted.find(x=>x.actor.captain);
   const trophy=trophyMesh(owned);scene.add(trophy);
   if(cap){
    const hl=cap.m.bones.get('hand_l')?.getWorldPosition(new THREE.Vector3()),hr=cap.m.bones.get('hand_r')?.getWorldPosition(new THREE.Vector3());
    if(hl&&hr){const mid=hl.clone().add(hr).multiplyScalar(.5);trophy.position.set(mid.x,mid.y-.12,mid.z+.05);trophy.scale.setScalar(clamp(hl.distanceTo(hr)/.36,.85,1.35))}
    else trophy.position.set(cap.actor.x,.0,cap.actor.z+.45);
   }else trophy.position.set(0,0,-.2);
  }
  renderer.render(scene,camera);
  // photo look: slight vignette, warm grade and grain on a 2D copy
  const out=document.createElement('canvas');out.width=width;out.height=height;const g=out.getContext('2d');
  g.drawImage(canvas,0,0);
  const v=g.createRadialGradient(width/2,height*.52,height*.35,width/2,height/2,height*.95);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.42)');
  g.fillStyle=v;g.fillRect(0,0,width,height);
  g.globalCompositeOperation='soft-light';g.fillStyle='rgba(255,196,140,.18)';g.fillRect(0,0,width,height);g.globalCompositeOperation='source-over';
  const noise=g.getImageData(0,0,width,height),d=noise.data;let s=photoHash(seed+'grain');
  for(let i=0;i<d.length;i+=4){s=(Math.imul(1664525,s)+1013904223)>>>0;const n=((s>>>24)-128)*.06;d[i]+=n;d[i+1]+=n;d[i+2]+=n}
  g.putImageData(noise,0,0);
  return{url:out.toDataURL('image/jpeg',opts.quality||.86),width,height,variant:layout.variant,actors:layout.actors.length};
 }finally{
  for(const o of owned){
   if(o.isMesh||o.isInstancedMesh){o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];for(const mm of ms){mm?.map?.dispose?.();mm?.dispose?.()}}
   else{o.geometry?.dispose?.();o.material?.dispose?.();o.texture?.dispose?.()}
  }
  renderer.dispose();try{renderer.forceContextLoss()}catch(_){}
 }
}
