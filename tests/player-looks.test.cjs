'use strict';
// V21.216 player looks: measured EA-portrait looks + hand-set looks, scene hand-off and the 3D override.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
function looksApi(){
 const ctx={};ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'player-looks.js'),'utf8'),ctx);
 return ctx.FooteraPlayerLooks;
}
test('hand-set looks win field by field over measured ones',()=>{
 const api=looksApi();
 assert.equal(api.get({id:'999001'}),null);
 api.load({looks:{'999001':'5_Sv','239085':'3_Dv'}});
 assert.deepEqual({...api.get({id:'999001'})},{skin:'5',hairColor:'#14110f',beard:'Full_beard'});
 assert.deepEqual({...api.get({id:'239085'})},{skin:'1',hair:'short04',hairColor:'#c9a061',beard:'none'});
 assert.equal(api.sceneSkin({id:'238794'}),'5');assert.equal(api.sceneLook({id:'238794'}).hair,'afro01');
 assert.equal(api.load({looks:'kaputt'}),0);assert.equal(api.get({id:'999001'}),null);
});
test('every hand-set and measured look decodes to known values; ids match the player DB',()=>{
 const api=looksApi();
 const db=new Set(fs.readFileSync(path.join(root,'assets/players-db.csv'),'utf8').split('\n').map(l=>l.split(',')[0]));
 const hand=Object.entries(api.HAND);
 assert.ok(hand.length>=100,'about 100 well-known players: '+hand.length);
 for(const [id,code] of hand){assert.match(code,/^[1-6][kfrax][SDBLGPRYW][nvm]$/,id);const l=api.decode(code);assert.ok(l.skin&&l.hair&&l.hairColor&&l.beard,id)}
 // The weekly DB rebuild may drop a player; a stale look is harmless, but most must still match.
 const missing=hand.filter(([id])=>!db.has(id)).map(([id])=>id);
 assert.ok(missing.length<=hand.length*.1,'EA ids missing from player DB: '+missing.join(', '));
 const measured=JSON.parse(fs.readFileSync(path.join(root,'assets/player-looks.json'),'utf8'));
 for(const [id,code] of Object.entries(measured.looks))assert.match(code,/^[1-6_][kfrax_][SDBLGPRYW_][nvm_]$/,id);
 assert.ok(Object.keys(measured.looks).length>=5000,'measured looks cover the player DB');
});
test('match and scene are wired; nothing is stored on the device',()=>{
 const match=fs.readFileSync(path.join(root,'3d-highlights-match.js'),'utf8'),hl=fs.readFileSync(path.join(root,'3d-highlights.js'),'utf8');
 const scene=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8'),src=fs.readFileSync(path.join(root,'player-looks.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 assert.match(match,/playerLooks:looks/);assert.match(match,/keeperLook:look\(keeper\)/);
 assert.match(hl,/playerLooks:Object\.freeze/);assert.match(scene,/custom:event\.playerLooks\?\.\[i\]/);assert.match(scene,/custom:event\.keeperLook/);
 assert.ok(html.includes('./player-looks.js?v='));assert.ok(sw.includes('./player-looks.js?v='));assert.ok(sw.includes('./assets/player-looks.json'));
 assert.doesNotMatch(src,/localStorage|state\./);
});
test('3D look override: haircut, bald, beard and colour; nothing keeps the name pick',async()=>{
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
