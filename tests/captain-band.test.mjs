// V21.428 Kapitänsbinde: the captain from "Aufgaben" wears a band on the left
// arm in 3D, leads the walk-out, has a C on his line-up card and speaks for the
// team in the Kabine. Presentation only: the save, the match simulation and
// online data stay untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {FOOTERA_CAPTAIN_BAND,footeraCaptainBandColors} from '../3d-player-human.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

function glbMesh(name){
 const b=fs.readFileSync(path.join(root,'assets/footera/models/footera-humans.glb')),n=b.readUInt32LE(12);
 const json=JSON.parse(b.subarray(20,20+n).toString()),bin=b.subarray(20+n+8);
 const node=json.nodes.find(x=>x.name===name&&x.mesh!=null),a=json.accessors[json.meshes[node.mesh].primitives[0].attributes.POSITION],v=json.bufferViews[a.bufferView];
 const start=bin.byteOffset+v.byteOffset+(a.byteOffset||0);
 return new Float32Array(bin.buffer.slice(start,start+a.count*12));
}
// Furthest vertex from the upper-arm axis per 2 cm slice (bind pose, metres).
function armProfile(name){
 const S=[.214,1.443,.019],E=[.391,1.244,.018],d=E.map((x,i)=>x-S[i]),L=Math.hypot(...d),u=d.map(x=>x/L),P=glbMesh(name),out=new Map();
 for(let i=0;i<P.length;i+=3){
  const r=[P[i]-S[0],P[i+1]-S[1],P[i+2]-S[2]],t=r[0]*u[0]+r[1]*u[1]+r[2]*u[2];if(t<0||t>L)continue;
  const dist=Math.hypot(r[0]-t*u[0],r[1]-t*u[1],r[2]-t*u[2]);if(dist>.09)continue;
  const k=Math.round(t*50)/50;out.set(k,Math.max(out.get(k)||0,dist));
 }
 return out;
}

test('the band sits on the bare upper arm, below the sleeve and just outside the skin',()=>{
 const B=FOOTERA_CAPTAIN_BAND,at=B.along*B.armLength,top=at-B.height/2;
 const sleeve=Math.max(...[...armProfile('FooteraShirt').keys()]);
 assert.ok(top>sleeve,`band top ${top.toFixed(3)} m must start below the sleeve hem ${sleeve.toFixed(3)} m`);
 const skin=armProfile('FooteraBody');
 for(const [k,r] of skin)if(Math.abs(k-at)<=B.height/2+.01){
  assert.ok(B.radius>r,`band radius ${B.radius} over the arm (${r.toFixed(3)} m at ${k})`);
  assert.ok(B.radius-r<.015,`band hugs the arm (gap ${(B.radius-r).toFixed(3)} m at ${k})`);
 }
});

test('classic yellow band, a dark one on yellow shirts so it always reads',()=>{
 assert.equal(footeraCaptainBandColors('#b0172f').band,'#f2c230');
 assert.equal(footeraCaptainBandColors('#ffffff').band,'#f2c230');
 assert.equal(footeraCaptainBandColors('#f6d21c').band,'#16191f');
 assert.equal(footeraCaptainBandColors('#fdb913').band,'#16191f');
});

test('the band hangs on upperarm_l (the left arm) and is disposed with the player',()=>{
 const human=read('3d-player-human.mjs');
 assert.match(human,/getObjectByName\?\.\('upperarm_l'\)/);
 assert.match(human,/if\(opts\.captain\)\{const band=addFooteraCaptainBand\(THREE,model,kit\.shirt,opts\.detail\);if\(band\)owned\.push\(\.\.\.band\)\}/);
 assert.match(read('3d-player-prototype.mjs'),/captain:look\.captain===true\}\)/);
 const scene=read('3d-highlights-scene.mjs');
 assert.match(scene,/captain:Array\.isArray\(event\.captainActors\)&&event\.captainActors\.includes\(i\)/);
 assert.match(scene,/keeper:true,captain:event\.keeperCaptain===true\}/);
 const clean=read('3d-highlights.js');
 assert.match(clean,/captainActors:Object\.freeze\(/);assert.match(clean,/keeperCaptain:event\.keeperCaptain===true/);
});

// 3d-highlights-match.js in a sandbox with a fake line-up.
function matchSandbox(){
 const row=(side,i,name,ovr,slot,uid='')=>({uid:side==='home'?uid||'h'+i:'',index:i,name,slot,base:{name,ovr},entry:{}});
 const home=[row('home',0,'Neuer',88,'GK','gk'),row('home',1,'Kimmich',87,'CDM','kim'),row('home',2,'Kane',91,'ST','kane'),row('home',3,'Musiala',89,'CAM','mus'),
  row('home',4,'Sané',84,'RW'),row('home',5,'Coman',83,'LW'),row('home',6,'Upamecano',84,'CB'),row('home',7,'Kim',83,'CB'),row('home',8,'Davies',82,'LB'),row('home',9,'Laimer',81,'RB'),row('home',10,'Goretzka',82,'CM')];
 const away=[row('away',0,'Kobel',86,'GK'),row('away',1,'Schlotterbeck',84,'CB'),row('away',2,'Guirassy',87,'ST'),row('away',3,'Brandt',83,'CAM'),
  row('away',4,'Adeyemi',80,'LW'),row('away',5,'Can',80,'CDM'),row('away',6,'Anton',82,'CB'),row('away',7,'Ryerson',80,'RB'),row('away',8,'Svensson',78,'LB'),row('away',9,'Gross',82,'CM'),row('away',10,'Beier',81,'RW')];
 const ctx={console,Math,JSON,Number,String,Array,Object,document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},window:{addEventListener(){}},addEventListener(){},match:null};
 ctx.matchActorRows=side=>(side==='home'?home:away).map(r=>({...r}));
 vm.createContext(ctx);vm.runInContext(read('3d-highlights-match.js'),ctx);
 return{ctx,home,away};
}

test('home captain = the one picked in Aufgaben; off the pitch the band passes on; the opponent\'s best outfielder wears it',()=>{
 const {ctx}=matchSandbox();
 assert.equal(ctx.match3DCaptainRow('home',{assignments:{captain:'kim'}}).name,'Kimmich');
 assert.equal(ctx.match3DCaptainRow('home',{assignments:{captain:'subbed-off'}}).name,'Kane','best outfield player on the pitch');
 assert.equal(ctx.match3DCaptainRow('home',{}).name,'Kane');
 assert.equal(ctx.match3DCaptainRow('away',{assignments:{captain:'kim'}}).name,'Guirassy','own Aufgaben never apply to the opponent');
 assert.equal(ctx.match3DCaptainRow('home',{assignments:{captain:'gk'}}).name,'Neuer','a keeper can be captain');
});

test('the actor wearing the band is the captain in every scene layout',()=>{
 const {ctx}=matchSandbox();
 // Home attacks: Kimmich is captain but Kane scores (actor 0).
 const goal={team:'home',playerId:'kane',playerName:'Kane'};
 const a=ctx.match3DShirtNumbers(goal,{assignments:{captain:'kim'}},null,null,8);
 assert.equal(a.captainActors.length,2,'one band per team');
 const order=ctx.match3DAttackOrder(goal);
 const homeActor=a.captainActors.find(i=>i<8),awayActor=a.captainActors.find(i=>i>=8);
 assert.equal(order[homeActor].name,'Kimmich');
 assert.equal(a.defendRows[awayActor-8].name,'Guirassy');
 assert.equal(a.keeperCaptain,false);
 // Away attacks: the home keeper is in goal and is the captain.
 const b=ctx.match3DShirtNumbers({team:'away',playerId:2,playerName:'Guirassy'},{assignments:{captain:'gk'}},null,{uid:'gk',index:0,name:'Neuer'},8);
 assert.equal(b.keeperCaptain,true);
 assert.ok(b.captainActors.every(i=>i<8),'no home field player wears a second band');
});

test('at the walk-out the captain leads the column; scenes get the band data',()=>{
 const src=read('3d-highlights-match.js');
 assert.match(src,/const attackRows=captainFirst\(team,field\(team\)\)\.slice\(0,8\)/);
 assert.match(src,/captainActors:numbers\.captainActors,keeperCaptain:numbers\.keeperCaptain/);
 assert.match(src,/presentation\.captainActors=shirtInfo\.captainActors;presentation\.keeperCaptain=shirtInfo\.keeperCaptain;/);
 // Presentation only: never written into the save or the simulation.
 assert.doesNotMatch(src,/state\.[a-zA-Z]+\s*=.*captain/);
});

test('line-up card shows a C, Aufgaben explains the band, Kabine uses the captain',()=>{
 const js=read('squad-tactics.js'),css=read('squad-tactics.css');
 assert.match(js,/function markCaptain\(/);assert.match(js,/class="captain-badge"/);
 assert.match(js,/markCaptain\(rows,assign\.captain\)/);
 assert.match(js,/Trägt die Binde und führt das Team beim Einlaufen an\./);
 assert.match(css,/\.slot \.captain-badge\{position:absolute;/);
 const kabine=read('footera-kabine.js');
 assert.match(kabine,/captainUid:String\(m\.assignments\?\.captain\|\|""\)/);
 const store=new Map(),c={window:{},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},Intl,Date,Math,console};
 vm.createContext(c);vm.runInContext(kabine,c);
 const P=(name,uid,pos,ovr)=>({name,uid,pid:uid,pos,ovr,rating:7,goals:0,assists:0,minutes:90,saves:0,reds:0,started:true});
 const players=[P('Neuer','gk','GK',88),P('Kimmich','kim','CDM',87),P('Kane','kane','ST',91),P('Musiala','mus','CAM',89)];
 const base={seed:'cap',home:'FC Gerlies',away:'Union',gh:1,ga:0,players,goals:[{side:'home',minute:5,scorer:'Musiala',scorerUid:'mus',type:'assist',assist:'',assistUid:''}],potm:null};
 const win=d=>c.window.FooteraKabine.matchMessages(d).messages.find(m=>m.kind==='msg');
 assert.equal(win(base).who.name,'Kane','without a pick: best outfield starter');
 assert.equal(win({...base,captainUid:'kim'}).who.name,'Kimmich','the captain with the band speaks first');
});

test('release V21.428 bumps every changed asset',()=>{
 const html=read('index.html'),sw=read('service-worker.js'),app=read('footera-app.js');
 assert.match(app,/const GFUT_BUILD="V21\.428"/);
 for(const url of ['./squad-tactics.js?v=21428','./squad-tactics.css?v=21428','./footera-kabine.js?v=21428','./3d-highlights.js?v=21428','./3d-highlights-match.js?v=21428','./footera-app.js?v=21428']){
  assert.ok(html.includes(url),url);assert.ok(sw.includes(`"${url}"`),'sw '+url);
 }
 for(const url of ['./3d-highlights-scene.mjs?v=21428','./3d-player-prototype.mjs?v=21428','./3d-player-human.mjs?v=21428'])assert.ok(sw.includes(`"${url}"`),'sw '+url);
 assert.match(read('3d-highlights-scene.mjs'),/3d-player-human\.mjs\?v=21428/);
 assert.match(read('3d-player-prototype.mjs'),/3d-player-human\.mjs\?v=21428/);
});
