'use strict';
// V21.215 Aussehen-Editor: storage, scene hand-off and the 3D look override.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
function looksApi(store={}){
 const localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}};
 const ctx={localStorage};ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'player-looks.js'),'utf8'),ctx);
 return{api:ctx.FooteraPlayerLooks,store};
}
test('looks are stored per EA id, only known values, Auto removes a field',()=>{
 const {api,store}=looksApi();
 const mbappe={id:'999001',name:'Testspieler'};
 assert.equal(api.get(mbappe),null);
 api.set(mbappe,'skin','5');api.set(mbappe,'hair','bald');api.set(mbappe,'beard','Moustache');api.set(mbappe,'hairColor','#c9a061');
 api.set(mbappe,'hair','<script>');
 assert.deepEqual({...api.get({id:'999001',name:'anders'})},{skin:'5',hair:'bald',beard:'Moustache',hairColor:'#c9a061'});
 assert.equal(api.sceneSkin(mbappe),'5');
 assert.deepEqual({...api.sceneLook(mbappe)},{hair:'bald',hairColor:'#c9a061',beard:'Moustache'});
 for(const f of ['skin','hair','beard','hairColor'])api.set(mbappe,f,'auto');
 assert.equal(api.get(mbappe),null);
 assert.deepEqual(JSON.parse(store[api.KEY]),{});
 // Players without an id fall back to their name, accents ignored.
 api.set({name:'Gyökeres'},'hair','afro01');
 assert.equal(api.get({name:'Gyokeres'}).hair,'afro01');
});
test('well-known players start with a look; the own choice wins and Standard returns to it',()=>{
 const {api}=looksApi();
 const haaland={id:'239085',name:'Erling Haaland'},vini={id:'238794',name:'Vini Jr.'};
 assert.deepEqual({...api.get(haaland)},{skin:'1',hair:'short04',hairColor:'#c9a061',beard:'none'});
 assert.equal(api.sceneSkin(vini),'5');assert.equal(api.sceneLook(vini).hair,'afro01');
 api.set(haaland,'hair','bald');assert.equal(api.get(haaland).hair,'bald');assert.equal(api.get(haaland).hairColor,'#c9a061');
 assert.match(api.profileHTML(haaland),/data-look-field="hair" data-look-value="bald" aria-pressed="true"/);
 api.set(haaland,'hair','auto');assert.equal(api.get(haaland).hair,'short04');assert.equal(api.own(haaland),null);
 // Every starting look decodes to known values only.
 const src=fs.readFileSync(path.join(root,'player-looks.js'),'utf8'),codes=[...src.matchAll(/'(\d+)':'([1-6][frkax][SDBLGPR][nvm])'/g)];
 assert.ok(codes.length>=100,'about 100 well-known players: '+codes.length);
 const db=new Set(fs.readFileSync(path.join(root,'assets/players-db.csv'),'utf8').split('\n').map(l=>l.split(',')[0]));
 for(const [,id] of codes){assert.ok(db.has(id),'EA id in player DB: '+id);const l=api.get({id});assert.ok(l.skin&&l.hair&&l.hairColor&&l.beard,id)}
});
test('broken storage never breaks the profile',()=>{
 const {api}=looksApi({'footera-player-looks-v1':'{kaputt'});
 assert.equal(api.get({id:'1'}),null);
 assert.match(api.profileHTML({id:'1',name:'Test'}),/Aussehen[\s\S]*Hautton[\s\S]*Haarfarbe[\s\S]*Frisur[\s\S]*Bart/);
});
test('profile, match and scene are wired; the save stays untouched',()=>{
 const app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8'),match=fs.readFileSync(path.join(root,'3d-highlights-match.js'),'utf8');
 const hl=fs.readFileSync(path.join(root,'3d-highlights.js'),'utf8'),scene=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 assert.match(app,/!friend&&typeof FooteraPlayerLooks!=="undefined"\?FooteraPlayerLooks\.profileHTML\(b\)/);
 assert.match(match,/playerLooks:looks/);assert.match(match,/keeperLook:look\(keeper\)/);
 assert.match(hl,/playerLooks:Object\.freeze/);assert.match(scene,/custom:event\.playerLooks\?\.\[i\]/);assert.match(scene,/custom:event\.keeperLook/);
 for(const f of ['player-looks.js','player-looks.css']){assert.ok(html.includes('./'+f+'?v='),f);assert.ok(sw.includes('./'+f+'?v='),f)}
 assert.doesNotMatch(fs.readFileSync(path.join(root,'player-looks.js'),'utf8'),/state\.|footera-save|uc27/);
});
test('3D look override: haircut, bald, beard and colour; Auto keeps the name pick',async()=>{
 const {footeraHumanLook}=await import(path.join(root,'3d-player-human.mjs'));
 const info={hair:['short02','short04','short01','afro01'],facial:['Full_beard','Moustache'],brows:['eyebrow001']};
 const auto=footeraHumanLook('Erling Haaland','#f1d2b3',info);
 assert.deepEqual(footeraHumanLook('Erling Haaland','#f1d2b3',info,null),auto);
 const bald=footeraHumanLook('Erling Haaland','#f1d2b3',info,{hair:'bald',beard:'Full_beard',hairColor:'#c9a061'});
 assert.equal(bald.hair,null);assert.equal(bald.facial,'Full_beard');assert.equal(bald.hairColor,'#c9a061');
 assert.deepEqual(bald.morphs,auto.morphs);
 const shaved=footeraHumanLook('Erling Haaland','#f1d2b3',info,{beard:'none',hair:'afro01'});
 assert.equal(shaved.facial,null);assert.equal(shaved.hair,'afro01');assert.equal(shaved.hairColor,auto.hairColor);
 assert.equal(footeraHumanLook('Erling Haaland','#f1d2b3',info,{hair:'mohawk'}).hair,auto.hair);
});
