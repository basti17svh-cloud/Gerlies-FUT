const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{webcrypto}=require('node:crypto');
const root=path.join(__dirname,'..'),backup=fs.readFileSync(path.join(root,'footera-backup.js'),'utf8'),app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
async function fixture({duringRollback,failWrite=false}={}){
 const base={version:128,profile:{clubName:'Test FC'},club:[],squad:[],coins:10,points:0},live={...base,coins:900};
 const data=JSON.stringify(base),checksum=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(data))).toString('hex');
 const payload=JSON.stringify({format:'footera-local-backup',schema:1,clubName:'Test FC',checksum,data}),stored=new Map([['gerliesFutV9',JSON.stringify(live)]]),listeners={},notices={textContent:'',dataset:{}};
 let reloads=0,confirms=0,fail=failWrite;
 const ctx={state:live,crypto:webcrypto,TextEncoder,console:{warn(){}},Event:class{},persistActiveSquadPreset(){},setTimeout(){return 1},clearTimeout(){},toast(){},
  document:{readyState:'loading',addEventListener(){},querySelector(){return null},getElementById(){return notices}},$(){return notices},
  confirm(){confirms++;return true},localStorage:{getItem:k=>stored.get(k)||null,setItem(k,v){if(fail&&k==='gerliesFutV9')throw Error('QuotaExceededError');stored.set(k,v)},removeItem:k=>stored.delete(k)},
  addEventListener(k,fn){listeners[k]=fn},dispatchEvent(){},location:{reload(){reloads++;listeners.pagehide()}},
  indexedDB:{open(){const req={result:{createObjectStore(){},close(){},transaction(){const tx={objectStore(){return{put(){queueMicrotask(()=>{duringRollback?.(ctx,stored);tx.oncomplete()})}}}};return tx}}};queueMicrotask(()=>req.onsuccess());return req}}
 };
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(app.slice(app.indexOf('let saveQueued='),app.indexOf('function toast(t){')),ctx);vm.runInContext(backup,ctx);
 return{ctx,stored,notices,data,file:{size:payload.length,text:async()=>payload},get reloads(){return reloads},get confirms(){return confirms},allowWrites(){fail=false}};
}
test('restore survives the real pagehide save handler after a failed flush',async()=>{
 const f=await fixture({failWrite:true,duringRollback(){f.allowWrites()}});f.ctx.save();
 // The running game stays dirty if storage was temporarily unavailable.
 await f.ctx.FooteraBackup.importBackup(f.file);
 assert.equal(f.reloads,1);assert.equal(f.stored.get('gerliesFutV9'),f.data,'pagehide must not overwrite the restored file with the old running game');
});
test('a game action during asynchronous rollback cancels restoration without losing progress',async()=>{
 const f=await fixture({duringRollback(ctx){ctx.state.coins=901;ctx.save()}});
 await f.ctx.FooteraBackup.importBackup(f.file);
 assert.equal(f.reloads,0);f.ctx.flushSave();assert.equal(JSON.parse(f.stored.get('gerliesFutV9')).coins,901);assert.equal(f.notices.dataset.error,'true');
});
test('a cloud replacement during rollback is never overwritten by file import',async()=>{
 const f=await fixture({duringRollback(ctx,stored){ctx.FooteraAccountReplacingSave=true;stored.set('gerliesFutV9','cloud-replacement')}});
 await f.ctx.FooteraBackup.importBackup(f.file);
 assert.equal(f.reloads,0);assert.equal(f.stored.get('gerliesFutV9'),'cloud-replacement');assert.equal(f.ctx.FooteraAccountReplacingSave,true);
});
test('duplicate imports do not race or prompt twice',async()=>{
 const f=await fixture();await Promise.all([f.ctx.FooteraBackup.importBackup(f.file),f.ctx.FooteraBackup.importBackup(f.file)]);
 assert.equal(f.confirms,1);assert.equal(f.reloads,1);
});
test('a failed replacement releases the save guard and preserves the old local save',async()=>{
 const f=await fixture({failWrite:true}),before=f.stored.get('gerliesFutV9');
 await f.ctx.FooteraBackup.importBackup(f.file);
 assert.equal(f.reloads,0);assert.equal(f.stored.get('gerliesFutV9'),before);assert.ok(!f.ctx.FooteraAccountReplacingSave);
 f.allowWrites();f.ctx.state.coins=902;f.ctx.save();assert.equal(f.ctx.flushSave(),true);assert.equal(JSON.parse(f.stored.get('gerliesFutV9')).coins,902);
});
