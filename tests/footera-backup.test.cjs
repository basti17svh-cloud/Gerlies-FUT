const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=fs.readFileSync(path.join(__dirname,'../footera-backup.js'),'utf8');
test('backup module is linked and keeps original local save',()=>{const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');const sw=fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8');assert.match(html,/footera-backup\.js\?v=21106/);assert.match(sw,/footera-backup\.js\?v=21106/);assert.match(file,/footera-before-restore/);assert.match(file,/SHA-256/);});
