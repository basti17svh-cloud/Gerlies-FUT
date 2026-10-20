const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../3d-highlights-match.js'),'utf8');
const start=src.indexOf('function match3DShirtNumbers'),end=src.indexOf('\n}\n',start)+3;
test('3D shirts carry the numbers chosen in the line-up, also for the scorer',()=>{
 const home=[['gk','TW'],['a','RV'],['b','IV'],['c','IV'],['d','LV'],['e','ZM'],['f','ZM'],['g','ZOM'],['h','RF'],['i','ST'],['j','LF']];
 // Like the app, every call builds fresh row objects.
 const ctx={matchActorRows:side=>side==='home'?home.map(([uid,slot],index)=>({uid,index,slot,name:uid})):home.map(([uid,slot],index)=>({uid:'',index,slot,name:'away'+index,entry:{shirtNumber:index+30}}))};
 vm.runInNewContext(src.slice(start,end)+';this.fn=match3DShirtNumbers',ctx);
 const current={shirtNumbers:{gk:1,a:2,b:4,c:5,d:3,e:6,f:8,g:10,h:11,i:7,j:9}};
 const goal=ctx.fn({team:'home',playerId:'i',playerName:'i'},current,{index:4},{index:0,entry:{shirtNumber:30}},10);
 assert.equal(goal.shirtNumbers[0],7,'scorer wears his own number');
 assert.equal(goal.shirtNumbers[10],34,'defender wears his own number');
 assert.equal(goal.keeperShirtNumber,30);
 const away=ctx.fn({team:'away',playerId:'9',playerName:'away9'},current,{uid:'c',index:3},{uid:'gk',index:0},8);
 assert.equal(away.shirtNumbers[0],39);assert.equal(away.shirtNumbers[8],5);assert.equal(away.keeperShirtNumber,1);
});
