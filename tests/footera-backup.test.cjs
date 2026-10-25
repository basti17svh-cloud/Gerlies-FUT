const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=fs.readFileSync(path.join(__dirname,'../footera-backup.js'),'utf8');
test('backup module is linked and keeps original local save',()=>{const html=require('./helpers/app-html.cjs')();const sw=fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8');assert.match(html,/footera-backup\.js\?v=\d+/);assert.match(sw,/footera-backup\.js\?v=\d+/);assert.match(file,/footera-before-restore/);assert.match(file,/SHA-256/);});

const vm=require('node:vm'),webcrypto=require('node:crypto').webcrypto;
test('backup integrity accepts a valid save and rejects altered contents',async()=>{
 const ctx={document:{readyState:'loading',addEventListener(){}},crypto:webcrypto,TextEncoder};vm.createContext(ctx);vm.runInContext(file,ctx);
 const state={version:126,profile:{clubName:'Test FC'},club:[{uid:'item-1',pid:'player-1'}],squad:Array(23).fill(null),coins:100,points:0};
 const data=JSON.stringify(state),checksum=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(data))).toString('hex');
 const payload={format:'footera-local-backup',schema:1,clubName:'Test FC',checksum,data};
 assert.equal((await ctx.FooteraBackup.inspect(JSON.stringify(payload))).state.coins,100);
 await assert.rejects(ctx.FooteraBackup.inspect(JSON.stringify({...payload,data:data.replace('100','900')})),/Beschädigte/);
 assert.throws(()=>ctx.FooteraBackup.validateState({...state,coins:-1}),/Guthaben/);
});

test('local FC Gerlies export downloads JSON without any account or cloud authorization',async()=>{
 const state={version:128,profile:{clubName:'FC Gerlies',saveId:'main-club'},club:[{uid:'c1',pid:'p1'}],squad:Array(23).fill(null),coins:8000,points:150};
 let downloaded='',appended=0;
 const backupStatus={textContent:'',dataset:{}};
 const doc={readyState:'loading',addEventListener(){},querySelector(){return null},getElementById:id=>id==='footeraBackupStatus'?backupStatus:null,
  createElement(){return {click(){downloaded=this.download},remove(){}}},body:{append(){appended++}}};
 const root={document:doc,crypto:webcrypto,TextEncoder,Blob,
  URL:{createObjectURL(){return 'blob:local-only'},revokeObjectURL(){}},
  localStorage:{getItem:k=>k==='gerliesFutV9'?JSON.stringify(state):null},
  setTimeout(){},console};
 vm.createContext(root);
 vm.runInContext(file,root);
 await root.FooteraBackup.exportBackup();
 assert.match(downloaded,/^Footera_FC_Gerlies_\d{4}-\d{2}-\d{2}\.json$/);
 assert.equal(appended,1);
 assert.match(backupStatus.textContent,/Sicherung erstellt/);
 assert.equal(backupStatus.dataset.error,'false');
});
test('account profile has an independent local-export control and safeguards mismatched cloud saves',()=>{
 const account=fs.readFileSync(path.join(__dirname,'../footera-account.js'),'utf8');
 assert.match(account,/id="footeraProfileExport"/);
 assert.match(account,/footeraProfileExport"\)\.addEventListener\("click"/);
 assert.match(account,/root\.FooteraBackup\.exportBackup\(\)/);
 assert.match(account,/footeraSaveUseDevice"\)\.disabled=!owned\|\|!sameClub\|\|equal/);
 assert.match(account,/id="footeraProfileBackupHint"/);
});

test('Footera current save schema and export validator stay in sync',()=>{
 const html=require('./helpers/app-html.cjs')();
 const saveVersion=Number(html.match(/function baseState\(\)\{return\{\s*version:(\d+)/)?.[1]);
 const maxVersion=Number(file.match(/MAX_GAME_VERSION=(\d+)/)?.[1]);
 assert.ok(saveVersion>0,'baseState save version should be discoverable');
 assert.equal(maxVersion,saveVersion,'Backup exporter must accept current live game save schema');
 const ctx={document:{readyState:'loading',addEventListener(){}},crypto:webcrypto,TextEncoder};
 vm.createContext(ctx);vm.runInContext(file,ctx);
 const base={version:saveVersion,profile:{clubName:'FC Gerlies'},club:[{uid:'x',pid:'y'}],squad:[],coins:949885,points:340000};
 assert.equal(ctx.FooteraBackup.validateState(base).version,saveVersion);
 assert.throws(()=>ctx.FooteraBackup.validateState({...base,version:saveVersion+1}),/Spielstand-Version nicht unterstützt/);
 assert.throws(()=>ctx.FooteraBackup.validateState({...base,version:-1}),/Spielstand-Version nicht unterstützt/);
});

test('large pre-restore save goes to IndexedDB even when localStorage rollback is quota-limited',async()=>{
 const rows=new Map();
 const fakeIDB={open(){
  const db={createObjectStore(){},close(){},
   transaction(){
    const tx={objectStore(){return{
     put(value,key){queueMicrotask(()=>{rows.set(key,value);tx.oncomplete?.()})},
     get(key){const req={};queueMicrotask(()=>{req.result=rows.get(key);req.onsuccess?.()});return req}
    }}};return tx;
   }};
  const request={result:db};
  queueMicrotask(()=>{request.onupgradeneeded?.();request.onsuccess?.()});
  return request;
 }};
 const raw=JSON.stringify({version:128,profile:{clubName:'FC Gerlies'},club:[{uid:'1',pid:'2'}],squad:[],coins:3736540,points:294300});
 const items=new Map([['gerliesFutV9',raw],['footera-before-restore','older rollback']]);
 const root={document:{readyState:'loading',addEventListener(){}},indexedDB:fakeIDB,
  localStorage:{
   getItem:key=>items.get(key)||null,
   setItem:(key,value)=>{if(key==='footera-before-restore')throw Error('QuotaExceededError');items.set(key,value)},
   removeItem:key=>items.delete(key)
  }};
 vm.createContext(root);vm.runInContext(file,root);
 assert.equal(await root.FooteraBackup.preserveRollback(raw),'indexeddb');
 assert.equal(rows.get('latest').data,raw);
 assert.equal(items.get('gerliesFutV9'),raw);
 assert.equal(items.has('footera-before-restore'),false,'legacy duplicate frees localStorage space');
 assert.equal(await root.FooteraBackup.readRollback(),raw);
});
test('when both storage types reject rollback, original save stays unchanged',async()=>{
 const raw=JSON.stringify({version:128,profile:{clubName:'FC Gerlies'},club:[],squad:[],coins:10,points:0});
 const items=new Map([['gerliesFutV9',raw]]);
 const root={document:{readyState:'loading',addEventListener(){}},
  localStorage:{getItem:k=>items.get(k)||null,setItem(){throw Error('QuotaExceededError')},removeItem:k=>items.delete(k)}};
 vm.createContext(root);vm.runInContext(file,root);
 await assert.rejects(root.FooteraBackup.preserveRollback(raw),/Kein Spielstand wurde ersetzt/);
 assert.equal(items.get('gerliesFutV9'),raw);
});
