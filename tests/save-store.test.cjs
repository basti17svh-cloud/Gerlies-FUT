'use strict';
// V21.495: the save must never again depend on Safari's 5 MB localStorage limit (Max, 20.11.2026).
// A Safari-like storage stub counts 2 bytes per character once a value holds a character above U+00FF.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {bigClub}=require('./helpers/big-club.cjs');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const LZ=read('vendor/lz-string/lz-string.min.js'),STORE=read('footera-save-store.js');

function safariStorage(limit=5*1024*1024){
 const data=new Map();
 const cost=(k,v)=>{const s=String(k)+String(v);return /[^\u0000-ÿ]/.test(s)?s.length*2:s.length};
 const used=()=>{let n=0;for(const [k,v] of data)n+=cost(k,v);return n};
 return {data,used,limit,
  getItem:k=>data.has(k)?data.get(k):null,
  removeItem:k=>{data.delete(k)},
  setItem(k,v){
   v=String(v);const old=data.has(k)?cost(k,data.get(k)):0;
   if(used()-old+cost(k,v)>this.limit){const e=new Error('The quota has been exceeded.');e.name='QuotaExceededError';throw e}
   data.set(k,v);
  }};
}
// Minimal IndexedDB with the calls footera-save-store.js uses.
function fakeIndexedDB(){
 const stores=new Map();
 const later=fn=>setImmediate(fn);
 return {stores,open(){
  const req={};
  later(()=>{
   const db={objectStoreNames:{contains:n=>stores.has(n)},createObjectStore:n=>{stores.set(n,new Map())},close(){},
    transaction(name){
     const tx={},map=stores.get(name);
     tx.objectStore=()=>({
      put(v,k){map.set(k,structuredClone(v));later(()=>tx.oncomplete?.())},
      delete(k){map.delete(k);later(()=>tx.oncomplete?.())},
      get(k){const r={};later(()=>{r.result=map.has(k)?structuredClone(map.get(k)):undefined;r.onsuccess?.()});return r}
     });
     return tx;
    }};
   req.result=db;
   if(!stores.size){req.onupgradeneeded?.()}
   req.onsuccess?.();
  });
  return req;
 }};
}
function load({storage=safariStorage(),idb}={}){
 const ctx={localStorage:storage,sessionStorage:safariStorage(),indexedDB:idb,setTimeout,clearTimeout,console,
  document:{addEventListener(){},visibilityState:'visible'},addEventListener(){}};
 ctx.window=ctx;
 vm.createContext(ctx);vm.runInContext(LZ,ctx);vm.runInContext(STORE,ctx);
 ctx.problems=[];ctx.FooteraSaveStore.onProblem((k,d)=>ctx.problems.push([k,d]));
 return ctx;
}

test('a 5.000-card club with Ibrahimović-style names does not fit plain into Safari, but the store saves and reads it back identically',()=>{
 const raw=JSON.stringify(bigClub(5000)),storage=safariStorage();
 assert.ok(raw.length*2>storage.limit,'the plain save alone is over the 5 MB limit');
 assert.throws(()=>storage.setItem('gerliesFutV9',raw),/quota/i,'this is exactly what broke Max\' iPhone');
 const ctx=load({storage});
 assert.equal(ctx.FooteraSaveStore.write(raw),'compressed');
 assert.ok(storage.used()<storage.limit/4,'packed save uses less than a quarter of the space: '+storage.used());
 assert.ok(storage.getItem('gerliesFutV9').startsWith('FTZ1:'));
 assert.equal(ctx.FooteraSaveStore.read(),raw);
 assert.equal(JSON.parse(ctx.FooteraSaveStore.read()).club.length,5000);
 assert.deepEqual(ctx.problems,[],'compressing a big save is planned, not a problem');
});

test('even a 10.000-card club still fits with full portrait caches next to it',()=>{
 const storage=safariStorage(),raw=JSON.stringify(bigClub(10000));
 storage.setItem('gfutImageSourceCacheV9','x'.repeat(1500000));storage.setItem('gfutImageFailureCacheV9','y'.repeat(500000));
 const ctx=load({storage});
 assert.equal(ctx.FooteraSaveStore.write(raw),'compressed');
 assert.equal(ctx.FooteraSaveStore.read(),raw);
});

test('small saves stay plain JSON, so older builds and backups can still read them',()=>{
 const ctx=load(),raw=JSON.stringify(bigClub(50));
 assert.equal(ctx.FooteraSaveStore.write(raw),'plain');
 assert.equal(ctx.localStorage.getItem('gerliesFutV9'),raw);
 assert.equal(ctx.FooteraSaveStore.read(),raw);
 assert.equal(ctx.FooteraSaveStore.lastMode(),'plain');
});

test('a full storage packs even a small save and gives the portrait caches\' space to it, and reports it',()=>{
 const storage=safariStorage(300000),raw=JSON.stringify(bigClub(300));
 storage.setItem('gfutImageSourceCacheV9','x'.repeat(250000));
 const ctx=load({storage});
 assert.ok(raw.length<ctx.FooteraSaveStore.COMPRESS_AT);
 assert.equal(ctx.FooteraSaveStore.write(raw),'compressed');
 assert.equal(ctx.FooteraSaveStore.read(),raw);
 assert.deepEqual(ctx.problems.map(p=>p[0]),['save-compressed']);
});

test('when nothing fits the error is thrown (game stays dirty) and reported as save-failed',()=>{
 const storage=safariStorage(1000),raw=JSON.stringify(bigClub(200));
 const ctx=load({storage});
 assert.throws(()=>ctx.FooteraSaveStore.write(raw),/quota/i);
 assert.equal(ctx.problems[0][0],'save-failed');
 assert.equal(ctx.problems[0][1].chars,raw.length);
 assert.match(ctx.problems[0][1].reason,/QuotaExceededError/);
});

test('problems seen before the account script listens are replayed to it, each kind only once in a row',()=>{
 const storage=safariStorage(1000);
 const ctx={localStorage:storage,sessionStorage:safariStorage(),setTimeout,clearTimeout,document:{addEventListener(){}},addEventListener(){}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(LZ,ctx);vm.runInContext(STORE,ctx);
 for(let i=0;i<3;i++)assert.throws(()=>ctx.FooteraSaveStore.write(JSON.stringify(bigClub(50))));
 const seen=[];ctx.FooteraSaveStore.onProblem(k=>seen.push(k));
 assert.deepEqual(seen,['save-failed']);
});

test('the legacy key is still read and a damaged packed save is reported instead of being loaded as empty',()=>{
 const ctx=load();
 ctx.localStorage.setItem('uc27v7','{"old":true}');
 assert.equal(ctx.FooteraSaveStore.read(),'{"old":true}');
 ctx.localStorage.setItem('gerliesFutV9','FTZ1:'+'\u0000');
 assert.throws(()=>ctx.FooteraSaveStore.read(),/beschädigt/);
});

test('a club that only survives in the IndexedDB copy is restored once and protected from the empty start game',async()=>{
 const idb=fakeIndexedDB(),storage=safariStorage(),raw=JSON.stringify(bigClub(5000));
 const ctx=load({storage,idb});
 ctx.FooteraSaveStore.write(raw);
 await ctx.FooteraSaveStore.flushMirror();
 const mirror=await ctx.FooteraSaveStore.readMirror();
 assert.equal(mirror.raw,raw);assert.equal(mirror.chars,raw.length);
 // Safari wiped the website data / the save was lost: start without a local save.
 storage.data.clear();
 const fresh=load({storage,idb});
 assert.equal(await fresh.FooteraSaveStore.recoverFromMirror(),true);
 assert.equal(fresh.FooteraAccountReplacingSave,true,'the running empty game may not save over it before the reload');
 assert.equal(fresh.FooteraSaveStore.read(),raw);
 assert.equal(fresh.problems[0][0],'restored-from-mirror');
 // A second start in the same tab does not loop.
 assert.equal(await fresh.FooteraSaveStore.recoverFromMirror(),false);
});

test('an existing club on the device is never replaced by the IndexedDB copy',async()=>{
 const idb=fakeIndexedDB(),storage=safariStorage();
 const ctx=load({storage,idb});
 ctx.FooteraSaveStore.write(JSON.stringify(bigClub(20)));await ctx.FooteraSaveStore.flushMirror();
 const other=bigClub(3);other.profile.saveId='GF-OTHER';
 storage.setItem('gerliesFutV9',JSON.stringify(other));
 assert.equal(await load({storage,idb}).FooteraSaveStore.recoverFromMirror(),false);
 assert.equal(JSON.parse(storage.getItem('gerliesFutV9')).profile.saveId,'GF-OTHER');
});

test('the game, account and backup read and write the save only through the store',()=>{
 const app=read('footera-app.js'),account=read('footera-account.js'),backup=read('footera-backup.js'),index=read('index.html'),sw=read('service-worker.js');
 assert.match(app,/FooteraSaveStore\.read\(\)/);assert.match(app,/FooteraSaveStore\.write\(raw\)/);
 assert.match(app,/FooteraSaveStore\.recoverFromMirror\(\)/);
 for(const [name,src] of [['account',account],['backup',backup]]){
  const outside=src.split('\n').filter(l=>!/function (read|write)SaveRaw\(/.test(l)).join('\n');
  assert.doesNotMatch(outside,/localStorage\.(getItem|setItem)\(KEY\b/,name+' bypasses the store');
  assert.match(src,/function readSaveRaw\(\)/);
 }
 const lz=index.indexOf('vendor/lz-string/lz-string.min.js'),store=index.indexOf('footera-save-store.js'),appTag=index.indexOf('footera-app.js?v=');
 assert.ok(lz>0&&store>lz&&appTag>store,'lz-string and the store load before the game');
 assert.match(sw,/vendor\/lz-string\/lz-string\.min\.js/);assert.match(sw,/footera-save-store\.js/);
});

test('save problems of signed-in devices are reported to Basti, without the save itself',()=>{
 const account=read('footera-account.js'),sql=read('online/footera-save-problems-v21.495.sql'),admin=read('online/footera-analytics-admin.ts'),dash=read('online/footera-analytics-dashboard.html');
 assert.match(account,/FooteraSaveStore\?\.onProblem\?\.\(queueSaveProblem\)/);
 assert.match(account,/rpc\("footera_report_save_problem"/);
 assert.match(account,/queueSaveProblem\("backup-blocked"/);
 assert.match(sql,/grant execute on function public\.footera_report_save_problem\(text, text, integer, text, text\) to authenticated/);
 assert.match(sql,/>= 30 then/);
 assert.doesNotMatch(sql.split('footera_save_problem_summary')[0],/save_data/,'the report itself never stores save content');
 assert.match(admin,/footera_save_problem_summary/);
 assert.match(dash,/Speicherprobleme · letzte 7 Tage/);
});
