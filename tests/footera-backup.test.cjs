const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=fs.readFileSync(path.join(__dirname,'../footera-backup.js'),'utf8');
test('backup module is linked and keeps original local save',()=>{const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');const sw=fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8');assert.match(html,/footera-backup\.js\?v=\d+/);assert.match(sw,/footera-backup\.js\?v=\d+/);assert.match(file,/footera-before-restore/);assert.match(file,/SHA-256/);});

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
 const state={version:126,profile:{clubName:'FC Gerlies',saveId:'main-club'},club:[{uid:'c1',pid:'p1'}],squad:Array(23).fill(null),coins:8000,points:150};
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
 assert.match(account,/cloudButton\.disabled=owner!==u\.id/);
 assert.match(account,/id="footeraProfileBackupHint"/);
});
