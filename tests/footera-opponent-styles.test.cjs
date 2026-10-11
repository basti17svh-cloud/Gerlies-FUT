const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../footera-opponent-styles.js'),'utf8');
function create(){
 const list=Array.from({length:4},(_,i)=>({kind:'generated',seed:'week|set-0|tier-'+i,name:'CPU '+i,rating:80+i,chem:22,squad:[{id:'p'+i}],rewards:{win:500}}));
 const context={getSquadBattleOpponents:()=>list,oneOffOpponent:()=>({kind:'generated',seed:'rivals|seed',rating:84}),document:{querySelectorAll:()=>[]}};
 vm.createContext(context);vm.runInContext(code,context);return{ctx:context,list,api:context.FooteraOpponentStyles};
}
test('four Squad Battles opponents have stable distinct tactics without changing rating or rewards',()=>{
 const {ctx,list}=create(),first=ctx.getSquadBattleOpponents();assert.equal(first.length,4);
 assert.equal(new Set(first.map(x=>x.styleProfile.id)).size,4);
 const prior=first.map(x=>x.styleProfile.id);ctx.getSquadBattleOpponents();assert.deepEqual(first.map(x=>x.styleProfile.id),prior);
 for(let i=0;i<4;i++){assert.equal(list[i].rating,80+i);assert.equal(list[i].rewards.win,500);assert.ok(list[i].customTactics.buildUp);}
});
test('friend profiles are never rewritten as AI; the same seed always chooses the same style',()=>{
 const {api}=create(),friend={kind:'friend',tactic:'attacking'};
 assert.equal(api.styleFor(friend),friend);assert.equal(friend.styleProfile,undefined);
 const one={kind:'generated',seed:'rivals|constant'},two={kind:'generated',seed:'rivals|constant'};
 assert.equal(api.styleFor(one).styleProfile.id,api.styleFor(two).styleProfile.id);
});
