// V21.462 Manager als Person: the user designs his manager next to the Trainerkarte (footera-manager.js),
// rendered as one of our own 3D humans (3d-manager.mjs), on his card, on the Siegerfoto and before kick-off.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {pathToFileURL}=require('url');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function load(state){
 const ctx={console,setTimeout,clearTimeout,localStorage:{_:{},getItem(k){return this._[k]??null},setItem(k,v){this._[k]=String(v)}},saved:0};
 ctx.window=ctx;ctx.globalThis=ctx;ctx.state=state;ctx.save=()=>{ctx.saved++};
 vm.createContext(ctx);vm.runInContext(read('footera-coach-card.js'),ctx);vm.runInContext(read('footera-manager.js'),ctx);
 return ctx;
}

test('clean keeps only known choices and safe text',()=>{
 const {FooteraManager:M}=load({});
 const m=M.clean({name:' <b>Jürgen</b> Klopp der Große und Mächtige ',gender:'x',skin:'red',hair:'Braid01',hairColor:'#ABCDEF',beard:'Full_beard',glasses:'gold',age:'veteran',build:'??',outfit:'tracksuit',top:'#123456',trousers:'nope',evil:'x'});
 assert.equal(m.name,'bJürgen/b Klopp der Gr');assert.equal(m.name.length,22);
 assert.equal(m.gender,'male');assert.equal(m.skin,M.DEFAULT.skin);
 assert.equal(m.hair,'ponytail01','the braid is a women\'s cut');
 assert.equal(m.hairColor,'#abcdef');assert.equal(m.beard,'Full_beard');assert.equal(m.glasses,'gold');assert.equal(m.age,'veteran');
 assert.equal(m.build,'normal');assert.equal(m.outfit,'tracksuit');assert.equal(m.top,'#123456');assert.equal(m.trousers,M.DEFAULT.trousers);
 assert.equal('evil' in m,false);
 const w=M.clean({gender:'female',beard:'Full_beard',hair:'Braid01'});assert.equal(w.beard,'none');assert.equal(w.hair,'Braid01');
});

test('a save without a manager is read only, the editor writes profile.manager and saves',()=>{
 const state={profile:{username:'Basti',clubName:'FC Gerlies'},stats:{}};
 const ctx=load(state),M=ctx.FooteraManager;
 assert.equal(M.designed(),false);assert.equal(M.get().name,'Basti');assert.equal(M.forPhoto(),null);
 assert.equal(state.profile.manager,undefined,'reading never writes');
 const next=M.set({outfit:'polo',top:'#FF0000',hair:'bald'});
 assert.equal(ctx.saved,1);assert.equal(M.designed(),true);
 assert.deepEqual(JSON.parse(JSON.stringify(state.profile.manager)),JSON.parse(JSON.stringify(next)));
 assert.equal(state.profile.manager.top,'#ff0000');assert.equal(state.profile.manager.name,'Basti');
 assert.equal(M.forPhoto().hair,'bald');
});

test('the Trainerkarte shows the manager name and keeps the crest until a portrait exists',()=>{
 const ctx=load({profile:{username:'Basti',manager:{name:'Der Boss'}},stats:{}});
 const d=ctx.FooteraCoachCard.data(ctx.state);assert.equal(d.name,'Der Boss');
 assert.equal(ctx.FooteraCoachCard.data({profile:{username:'Basti'}}).name,'Basti');
 const html=ctx.FooteraCoachCard.cardHTML(d);assert.match(html,/coach-face"><img src="\.\/assets\/footera\/emblem\.png"/);
 ctx.localStorage.setItem(ctx.FooteraManager.PORTRAIT_KEY,JSON.stringify({key:'old',url:'data:image/png;base64,AAAA'}));
 assert.match(ctx.FooteraCoachCard.cardHTML(d),/<img class="coach-manager-face" src="data:image\/png;base64,AAAA"/);
});

test('club colours: tracksuit in the home kit, the suit keeps dark cloth with a club tie',()=>{
 const ctx=load({profile:{}});ctx.clubIdentitySnapshot=()=>({kits:{home:{shirtPrimary:'#C4122F',shirtSecondary:'#ffffff',shorts:'#111111'}}});
 assert.deepEqual({...ctx.FooteraManager.clubColors({outfit:'tracksuit'})},{top:'#c4122f',trousers:'#111111',accent:'#ffffff'});
 const suit=ctx.FooteraManager.clubColors({outfit:'suit'});assert.equal(suit.tie,'#c4122f');assert.equal(suit.top,'#1d2330');
});

test('editor markup: every option, colour fields per outfit, beard hidden for a Trainerin',()=>{
 const {FooteraManager:M}=load({});
 const html=M.editorHTML(M.clean({outfit:'suit'}));
 for(const f of ['gender','skin','hair','hairColor','beard','glasses','age','build','outfit','top','trousers','accent','tie'])assert.match(html,new RegExp(`data-mg-set="${f}"`),f);
 assert.match(html,/data-mg-name/);assert.match(html,/data-mg-club/);assert.doesNotMatch(html,/Flechtzopf/);
 const w=M.editorHTML(M.clean({gender:'female',outfit:'polo'}));
 assert.doesNotMatch(w,/data-mg-set="beard"/);assert.doesNotMatch(w,/data-mg-set="tie"/);assert.match(w,/Flechtzopf/);
});

test('Siegerfoto: the manager stands on the floor beside the team, inside the picture',async()=>{
 const M=await import(pathToFileURL(path.join(root,'3d-kabine-photo.mjs')).href);
 for(const n of [3,6,11,16]){
  const layout=M.photoLayout({seed:'m'+n,players:Array.from({length:n},(_,i)=>({name:'P'+i}))});
  const at=M.managerSpot(layout.actors),floor=layout.actors.filter(a=>!a.back);
  assert.ok(at.x<=2.3&&at.x>Math.max(...(floor.length?floor:layout.actors).map(a=>a.x)),'beside the row, n='+n);
  assert.ok(at.z>=-1.45&&at.z<=-.9);
 }
 const src=read('3d-kabine-photo.mjs');assert.match(src,/if\(spec\.manager&&mounted\.length\)/);
 assert.match(read('footera-kabine.js'),/renderKabinePhoto\(\{\.\.\.m\.photo,manager\}/);
});

test('kick-off shows the manager with his card; files are pinned and cached',()=>{
 const app=read('footera-app.js');
 assert.match(app,/queueMatchCeremony3D\("kickoff"\);\n \/\/ V21\.462[^\n]*\n try\{window\.FooteraManager\?\.kickoff\(match\)\}catch\(e\)\{\}/);
 const index=read('index.html'),sw=read('service-worker.js'),v=(read('footera-manager.js').match(/3d-manager\.mjs\?v=(\d+)/)||[])[1];
 assert.ok(v);
 for(const f of ['footera-manager.js','footera-manager.css'])assert.ok(index.includes(`./${f}?v=${v}`)&&sw.includes(`"./${f}?v=${v}"`),f);
 assert.ok(sw.includes(`"./3d-manager.mjs?v=${v}"`));
 assert.ok(read('3d-kabine-photo.mjs').includes(`./3d-manager.mjs?v=${v}`),'one module URL');
 assert.ok(index.indexOf('footera-coach-card.js')<index.indexOf('footera-manager.js'));
 // the manager module shares the players' body module, so the GLBs load once
 const human=(read('3d-kabine-photo.mjs').match(/3d-player-human\.mjs\?v=(\d+)/)||[])[1];
 assert.ok(read('3d-manager.mjs').includes(`./3d-player-human.mjs?v=${human}`));
});

test('the 3D manager module loads in Node and maps the look',async()=>{
 const M=await import(pathToFileURL(path.join(root,'3d-manager.mjs')).href);
 assert.equal(typeof M.renderManagerPortrait,'function');assert.equal(typeof M.mountManager,'function');
 assert.deepEqual(Object.keys(M.MANAGER_ARMS).sort(),['clap','crossed','down','fist']);
});
