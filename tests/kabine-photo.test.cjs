'use strict';
// V21.443 Siegerfoto aus der Kabine: after a win the coach can ask for the victory photo; after a cup final the
// captain posts it on his own. The picture is our own 3D render of the user's squad (3d-kabine-photo.mjs).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'footera-kabine.js'),'utf8');
function load(){
 const store=new Map();
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const ctx={window:{},localStorage,Intl,Date,Math,console};vm.createContext(ctx);vm.runInContext(src,ctx);return ctx.window.FooteraKabine;
}
const api=load();
const P=(name,uid,pos,extra={})=>({name,uid,pid:uid,pos,ovr:85,rating:7,goals:0,assists:0,minutes:90,saves:0,reds:0,started:true,...extra});
const squad=()=>[P('Manuel Neuer','gk','GK'),P('Joshua Kimmich','u1','CDM',{ovr:88}),P('Harry Kane','u2','ST',{ovr:90}),P('Jamal Musiala','u3','CAM'),P('Leroy Sané','u4','RW'),P('Kingsley Coman','u5','LW'),P('Dayot Upamecano','u6','CB'),P('Kim Min-jae','u7','CB'),P('Alphonso Davies','u8','LB'),P('Sacha Boey','u9','RB'),P('Leon Goretzka','u10','CM')];
const goal=(side,minute)=>({side,minute,scorer:side==='home'?'Harry Kane':'X',scorerUid:side==='home'?'u2':'',type:'assist',assist:'',assistUid:''});
const match=(seed,gh,ga,extra={})=>api.matchMessages({seed,home:'FC Gerlies',away:'Dortmund',gh,ga,players:squad(),goals:[...Array(gh)].map((_,i)=>goal('home',10+i))
 .concat([...Array(ga)].map((_,i)=>goal('away',50+i))),potm:null,...extra});

test('the victory photo is a coach option only after a win',()=>{
 const win=match('w',2,0).ctx,draw=match('d',1,1).ctx,loss=match('l',0,2).ctx;
 assert.ok(api._COACH.photo.when(win));
 assert.ok(!api._COACH.photo.when(draw)&&!api._COACH.photo.when(loss));
 assert.match(api._COACH.photo.label(win),/Siegerfoto/);
});

test('asking for the photo posts a picture message from a player, the same one every time',()=>{
 const c=match('w2',3,1).ctx,a=api.coachMessages('photo',c,'m:w2'),b=api.coachMessages('photo',c,'m:w2');
 const photo=a.filter(m=>m.photo);assert.equal(photo.length,1);
 assert.equal(a[0].kind,'me');assert.equal(a[1],photo[0],'the photo comes right after the coach');
 assert.equal(photo[0].kind,'msg');assert.ok(photo[0].who?.name);
 assert.equal(photo[0].photo.seed,'m:w2|0|photo');assert.equal(photo[0].photo.gh,3);assert.equal(photo[0].photo.title,false);
 assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
 assert.ok(a.every(m=>!/undefined|\{\w+\}/.test(m.text)));
});

test('after a won cup final the captain posts the photo with the trophy on his own; never after defeats',()=>{
 const won=match('f1',2,1,{final:true,captainUid:'u1'}),lost=match('f2',0,1,{final:true});
 const photo=won.messages.filter(m=>m.photo);
 assert.equal(photo.length,1);assert.equal(photo[0].who.name,'Joshua Kimmich');assert.equal(photo[0].photo.title,true);
 assert.equal(won.ctx.final,true);
 assert.equal(lost.messages.filter(m=>m.photo).length,0);
 assert.equal(match('n',3,0).messages.filter(m=>m.photo).length,0,'no automatic photo after a normal win');
});

test('photoSquad copies names, numbers and looks without touching anything else',()=>{
 const c=match('w3',1,0).ctx,s=api.photoSquad(c);
 assert.equal(s.players.length,c.players.length);
 assert.ok(s.players.every(p=>Number.isInteger(p.number)&&p.number>=1&&p.number<=99));
 assert.equal(new Set(s.players.map(p=>p.number)).size,s.players.length,'numbers differ');
 assert.equal(s.players.find(p=>p.keeper).number,1);
 assert.ok(s.keeperKit&&/^#[0-9a-f]{6}$/i.test(s.keeperKit.shirt));
});

test('layout: everyone on the photo once, captain in the front middle, deterministic',async()=>{
 const M=await import(pathToFileURL(path.join(root,'3d-kabine-photo.mjs')).href);
 for(let n=1;n<=16;n++){const rows=M.photoRows(n);assert.equal(rows.reduce((a,b)=>a+b,0),n,'rows for '+n)}
 const players=Array.from({length:14},(_,i)=>({name:'Spieler '+i,number:i+1,captain:i===5,keeper:i===0}));
 const spec={seed:'m:x|2:0',players,gh:2,ga:0};
 const a=M.photoLayout(spec),b=M.photoLayout(spec);
 assert.deepEqual(a,b);
 assert.deepEqual(a.actors.map(x=>x.index).sort((x,y)=>x-y),players.map((_,i)=>i));
 const cap=a.actors.find(x=>x.captain);assert.equal(cap.index,5);assert.ok(cap.front);
 const front=a.actors.filter(x=>x.front).sort((x,y)=>x.x-y.x);assert.equal(front[Math.floor(front.length/2)].index,5);
 assert.ok(a.actors.every(x=>x.kneel===x.front),'only the front row kneels');
 assert.ok(a.actors.filter(x=>x.back).every(x=>x.y>.4),'back row up on the bench');
 assert.ok(a.actors.every(x=>x.arms.length===2&&x.arms.every(k=>M.PHOTO_ARMS[k])));
 assert.equal(a.variant,'win');assert.equal(M.photoLayout({...spec,title:true}).variant,'title');
 assert.equal(M.photoLayout({...spec,gh:5,ga:0}).variant,'big');
 const t=M.photoLayout({...spec,title:true}).actors.find(x=>x.captain);assert.deepEqual(t.arms,['trophy','trophy']);assert.equal(t.kneel,false);
});

test('the photo module is cached and loaded with the chat version',()=>{
 const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const v=(html.match(/footera-kabine\.js\?v=(\d+)/)||[])[1];
 assert.ok(src.includes(`./3d-kabine-photo.mjs?v=${v}`));assert.ok(sw.includes(`./3d-kabine-photo.mjs?v=${v}`));
 const mod=fs.readFileSync(path.join(root,'3d-kabine-photo.mjs'),'utf8'),scene=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
 // Same module URL as the match scenes, so the 3D bodies load only once.
 assert.ok(!mod.includes("Math.random"),"the same photo every time it is rendered");
 const human=(mod.match(/3d-player-human\.mjs\?v=(\d+)/)||[])[1];assert.ok(human&&scene.includes(`3d-player-human.mjs?v=${human}`));
});

test('keepers stand in the back row; without a captain an outfield player leads',async()=>{
 const M=await import(pathToFileURL(path.join(root,'3d-kabine-photo.mjs')).href);
 const players=Array.from({length:12},(_,i)=>({name:'S'+i,number:i+1,keeper:i===0}));
 for(const seed of ['a','b','c','d']){const l=M.photoLayout({seed,players});
  assert.ok(l.actors.find(x=>x.index===0).back,'keeper on the bench');
  assert.notEqual(l.actors.find(x=>x.captain).index,0);}
});
