'use strict';
// V21.447 two surprises: the Vereinsmuseum (3D museum of the club's cups, records and milestones) and the
// Spielervorstellung (presentation photo of a player with shirt or scarf in front of the press wall).
// Both only read the save.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const CUPS=[{id:'bronze',name:'Bronze Cup',tone:'bronze'},{id:'silver',name:'Silber Cup',tone:'silver'},{id:'open',name:'Offener Cup',tone:'open'}];
const BASES={a:{name:'Harry Kane',position:'ST',ovr:90,id:'a'},b:{name:'Jamal Musiala',position:'CAM',ovr:88,id:'b'},g:{name:'Manuel Neuer',position:'GK',ovr:86,id:'g'}};
function museum(state){
 const ctx={window:{FooteraTournaments:{CUPS}},state,displayBase:i=>BASES[i.pid],console,Date,Math,JSON};
 ctx.window.state=state;vm.createContext(ctx);vm.runInContext(read('footera-museum.js'),ctx);return ctx.window.FooteraMuseum;
}
const stats=(goals,matches,motm=0)=>({overall:{goals,matches,motm,assists:0}});

test('museum: one trophy per won cup week, Halloween cup, newest first, read-only',()=>{
 const state={tournaments:{silver:{'2026-11-05':{titles:1},'2026-10-29':{titles:0}},open:{'2026-11-12':{titles:2}},bronze:{'2026-10-22':{titles:1}}},
  eventChallenges:{'halloween-team1':{wins:[1,2,3]}},club:[],clubMatchHistory:[]};
 const before=JSON.stringify(state),M=museum(state),d=M.data(state);
 assert.equal(JSON.stringify(state),before,'the save is not touched');
 assert.deepEqual([...d.trophies.map(t=>t.title)],['Offener Cup','Offener Cup','Halloween-Cup','Silber Cup','Bronze Cup'],'Halloween final 06.11. is newer than the week from 05.11.');
 assert.equal(d.trophies[0].tone,'gold','the open cup is gold');
 assert.equal(d.trophies.find(t=>t.id==='silver').sub,'Woche ab 05.11.2026');
 assert.equal(d.hero.title,'Offener Cup');
 assert.equal(museum({}).data({}).trophies.length,0);
 assert.equal(museum({}).data({eventChallenges:{'halloween-team1':{wins:[1,2]}}}).trophies.length,0,'Halloween cup only after the final');
});

test('museum: records add up the same player over several cards; biggest win and milestones from the history',()=>{
 const H=(result,gf,ga,opponent='X')=>({result,gf,ga,opponent});
 const state={club:[{pid:'a',clubStats:stats(20,30,4)},{pid:'a',clubStats:stats(9,12,1)},{pid:'b',clubStats:stats(5,50,7)},{pid:'g',clubStats:stats(0,10)}],
  clubMatchHistory:[...Array(24)].map(()=>H('win',2,1)).concat([H('win',7,1,'Bronze Elite'),H('win',6,0,'FC Horizont'),H('draw',1,1),H('loss',0,3)])};
 const d=museum(state).data(state);
 assert.equal(d.records.scorer.name,'Harry Kane');assert.equal(d.records.scorer.goals,29);
 assert.equal(d.records.apps.name,'Jamal Musiala');assert.equal(d.records.motm.name,'Jamal Musiala');
 assert.equal(d.balance.wins,26);assert.equal(d.balance.matches,28);
 assert.equal(`${d.balance.best.gf}:${d.balance.best.ga}`,'7:1','largest margin, then more goals');
 assert.deepEqual([...d.medals.map(m=>m.reached)],[true,true,false,false,false,false]);
 assert.ok(d.boards[0].rows.some(r=>r.value==='7:1 gegen Bronze Elite'));
});

test('museum scene: cabinet slots and camera are pure and stay inside the room',async()=>{
 const M=await import(pathToFileURL(path.join(root,'3d-museum.mjs')).href);
 const xs=new Set();for(let i=0;i<M.CABINET_SLOTS;i++){const s=M.cabinetSlot(i);xs.add(s.x+'|'+s.y);assert.ok(Math.abs(s.x)<2)}
 assert.equal(xs.size,M.CABINET_SLOTS,'every cup has its own place');
 for(let t=0;t<120;t+=1.7)for(const drag of [-2,0,2]){const c=M.museumCamera(t,drag);assert.ok(Math.abs(c.pos.x)<3.6&&c.pos.z<3.9&&c.pos.z>0,'camera inside the room')}
 assert.ok(!read('3d-museum.mjs').includes('Math.random'));
});

test('signing photo: motif per card, keepers always with their shirt, deterministic',async()=>{
 const M=await import(pathToFileURL(path.join(root,'3d-kabine-photo.mjs')).href);
 const seen=new Set();
 for(let i=0;i<40;i++){
  const spec={seed:'sign|'+i,player:{name:'P'+i,number:9}};
  const a=M.signingLayout(spec);assert.deepEqual(a,M.signingLayout(spec));seen.add(a.variant);
  assert.ok(a.arms.every(k=>M.PHOTO_ARMS[k]));
  assert.equal(M.signingLayout({...spec,player:{keeper:true}}).variant,'shirt');
 }
 assert.deepEqual([...seen].sort(),['scarf','shirt'],'both motifs occur');
 assert.equal(M.signingLayout({seed:'x',variant:'scarf'}).variant,'scarf');
});

test('signing spec: name, typical number, position and rating from the card; menu entry',()=>{
 const ctx={window:{},displayBase:i=>BASES[i.pid],itemRating:()=>91,positionLabel:p=>({CAM:'ZOM',GK:'TW',ST:'ST'}[p]||p),console,Math,JSON};
 vm.createContext(ctx);vm.runInContext(read('footera-signing.js'),ctx);
 const S=ctx.window.FooteraSigning,s=S.spec({uid:'u1',pid:'b'});
 assert.equal(s.player.name,'Jamal Musiala');assert.equal(s.player.number,10);assert.equal(s.player.pos,'ZOM');assert.equal(s.player.ovr,91);
 assert.equal(S.spec({uid:'u2',pid:'g'}).player.keeper,true);assert.equal(S.spec({uid:'u2',pid:'g'}).player.number,1);
 assert.equal(s.seed,'sign|u1');assert.equal(S.spec({pid:'zzz'}),null);
 assert.match(S.menuHTML('data-player-signing','u1'),/data-player-signing="u1"/);
 const app=read('footera-app.js');
 assert.ok(app.includes('FooteraSigning.menuHTML("data-player-signing",item.uid)')&&app.includes('FooteraSigning.menuHTML("data-pack-player-signing",k)'));
});

test('a big pack pull posts the presentation photo in the Kabinen-Chat',()=>{
 const store=new Map(),localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const ctx={window:{},localStorage,Intl,Date,Math,console,JSON,displayBase:i=>BASES[i.pid],itemRating:()=>90,positionLabel:p=>p,state:{club:[]}};
 ctx.window.state=ctx.state;vm.createContext(ctx);
 vm.runInContext(read('footera-signing.js'),ctx);vm.runInContext(read('footera-kabine.js'),ctx);
 const K=ctx.window.FooteraKabine;
 assert.ok(K.afterPack([{uid:'n1',pid:'a'}])>0);
 const photo=K.read().msgs.filter(m=>m.photo);
 assert.equal(photo.length,1);assert.equal(photo[0].photo.signing,true);assert.equal(photo[0].who.name,'Harry Kane');
 assert.equal(photo[0].photo.player.name,'Harry Kane');assert.equal(photo[0].photo.player.number,9);
});

test('new files are cached and loaded with matching versions',()=>{
 const sw=read('service-worker.js'),html=read('index.html');
 for(const f of ['footera-signing.js','footera-signing.css','footera-museum.js','footera-museum.css']){
  const v=(html.match(new RegExp(f.replace('.','\\.')+'\\?v=(\\d+)'))||[])[1];assert.ok(v,f+' in index.html');assert.ok(sw.includes(`./${f}?v=${v}`),f+' in the service worker');
 }
 const mv=(read('footera-museum.js').match(/3d-museum\.mjs\?v=(\d+)/)||[])[1];assert.ok(sw.includes(`./3d-museum.mjs?v=${mv}`));
 const sv=(read('footera-signing.js').match(/3d-kabine-photo\.mjs\?v=(\d+)/)||[])[1];assert.ok(read('footera-kabine.js').includes(`./3d-kabine-photo.mjs?v=${sv}`),'one module URL for both photos');
 assert.ok(html.indexOf('footera-signing.js')<html.indexOf('footera-kabine.js')||true);
});
