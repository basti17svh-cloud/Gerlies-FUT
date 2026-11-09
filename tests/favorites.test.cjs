'use strict';
// V21.377 Lieblingskarten: device-local hearts that protect club cards from quick sell, market, SBC assistant and twin swap.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'footera-favorites.js'),'utf8');
function load(initial){
 const store=new Map(initial?[['footera-favorites-v1',initial]]:[]);
 const ctx={window:{},localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))}};
 vm.createContext(ctx);vm.runInContext(src,ctx);
 return {api:ctx.window.FooteraFavorites,store};
}

test('toggle stores hearts on the device and survives a reload',()=>{
 const {api,store}=load();
 assert.equal(api.has('u1'),false);
 assert.equal(api.toggle('u1'),true);
 assert.equal(api.has('u1'),true);
 assert.deepEqual(JSON.parse(store.get('footera-favorites-v1')),['u1']);
 const again=load(store.get('footera-favorites-v1')).api;
 assert.equal(again.has('u1'),true);
 assert.equal(again.toggle('u1'),false);
 assert.equal(again.has('u1'),false);
});

test('broken storage and empty ids are harmless',()=>{
 const {api}=load('{kaputt');
 assert.equal(api.has('x'),false);
 assert.equal(api.set('',true),false);
 assert.equal(api.has(null),false);
 assert.equal(api.badgeHTML('x'),'');
 api.set('x',true);assert.match(api.badgeHTML('x'),/favorite-badge/);
 assert.match(api.menuHTML('x'),/Herz entfernen/);
});

test('prune drops hearts of cards that left the club',()=>{
 const {api}=load(JSON.stringify(['a','b','c']));
 api.prune(['a','c']);
 assert.deepEqual([...api.list()],['a','c']);
});

test('the app checks hearts before every way a club card can leave',()=>{
 const app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
 assert.match(app,/function isFavoriteItem\(item\)\{return !!\(item&&globalThis\.FooteraFavorites\?\.has\(item\.uid\)\)\}/);
 // club grid quick sell
 assert.match(app,/if\(!i\|\|isFounderItem\(i\)\|\|!i\.tradeable\)return;if\(isFavoriteItem\(i\)\)\{toast/);
 // transfer list and market offer
 assert.match(app,/if\(!isOnTransferList\(uid\)&&item&&globalThis\.FooteraFavorites\?\.has\(item\.uid\)\)\{toast/);
 assert.match(app,/if\(globalThis\.FooteraFavorites\?\.has\(item\.uid\)&&state\.club\.some\(x=>x\.uid===item\.uid\)\)\{toast/);
 // SBC assistant never uses hearts, manual submit warns
 assert.match(app,/for\(const uid of globalThis\.FooteraFavorites\?\.list\(\)\|\|\[\]\)busy\.add\(String\(uid\)\)/);
 assert.match(app,/favorite=!!globalThis\.FooteraFavorites\?\.has\(item\.uid\);if\(teams\.length\|\|evolution\|\|favorite\)risks\.push/);
 // pack twin swap never frees a heart card
 assert.match(app,/!listed\.has\(x\.uid\)&&!isFavoriteItem\(x\)&&/);
});

test('script loads before the app and is in the offline cache',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 const fav=html.indexOf('footera-favorites.js?v='),app=html.indexOf('footera-app.js?v=');
 assert.ok(fav>0&&fav<app);
 const v=html.match(/footera-favorites\.js\?v=(\d+)/)[1],c=html.match(/footera-favorites\.css\?v=(\d+)/)[1];
 assert.ok(sw.includes(`./footera-favorites.js?v=${v}`));assert.ok(sw.includes(`./footera-favorites.css?v=${c}`));
 assert.match(html,/<option value="favorite">Nur Lieblingskarten/);
});
