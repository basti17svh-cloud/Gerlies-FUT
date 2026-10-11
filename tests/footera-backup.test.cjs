const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=fs.readFileSync(path.join(__dirname,'../footera-backup.js'),'utf8');
test('backup module is linked and keeps original local save',()=>{const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');const sw=fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8');assert.match(html,/footera-backup\.js\?v=21106/);assert.match(sw,/footera-backup\.js\?v=21106/);assert.match(file,/footera-before-restore/);assert.match(file,/SHA-256/);});

const vm=require('node:vm'),webcrypto=require('node:crypto').webcrypto;
test('backup integrity accepts a valid save and rejects altered contents',async()=>{
 const ctx={document:{readyState:'loading',addEventListener(){}},crypto:webcrypto,TextEncoder};vm.createContext(ctx);vm.runInContext(file,ctx);
 const state={version:123,profile:{clubName:'Test FC'},club:[{uid:'item-1',pid:'player-1'}],squad:Array(23).fill(null),coins:100,points:0};
 const data=JSON.stringify(state),checksum=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(data))).toString('hex');
 const payload={format:'footera-local-backup',schema:1,clubName:'Test FC',checksum,data};
 assert.equal((await ctx.FooteraBackup.inspect(JSON.stringify(payload))).state.coins,100);
 await assert.rejects(ctx.FooteraBackup.inspect(JSON.stringify({...payload,data:data.replace('100','900')})),/Beschädigte/);
 assert.throws(()=>ctx.FooteraBackup.validateState({...state,coins:-1}),/Guthaben/);
});
