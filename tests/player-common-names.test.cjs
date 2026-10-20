const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../footera-app.js'),'utf8');
const start=src.indexOf('const COMMON_PLAYER_NAMES_BY_ID'),end=src.indexOf('\n',src.indexOf('function applyPreferredPlayerNames'))+1;
test('Cristiano Ronaldo is shown as "Cristiano Ronaldo", not with his full legal name',()=>{
 const ctx={isExclusiveFounderBase:()=>false};vm.runInNewContext(src.slice(start,end)+';this.apply=applyPreferredPlayerNames',ctx);
 const players=[{id:'20801',name:'Cristiano Ronaldo dos Santos Aveiro',fullName:'Cristiano Ronaldo dos Santos Aveiro'},{id:'1',name:'Ronaldo',fullName:'Ronaldo Luís Nazário de Lima'},{id:'232580',name:'Gabriel dos Santos Magalhães'}];
 ctx.apply(players);
 assert.equal(players[0].name,'Cristiano Ronaldo');assert.equal(players[0].fullName,'Cristiano Ronaldo');
 assert.equal(players[1].name,'Ronaldo');assert.equal(players[2].name,'Gabriel');
});
