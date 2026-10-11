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

test('CPU attack highlights follow tactical styles deterministically and never consume match RNG',()=>{
 const H=require('../3d-highlights.js');
 const tags={
  possession:new Set(['combination','switch','halfspace']),
  counter:new Set(['through','counter','duel','switch']),
  wing:new Set(['wing','cutback','cross','lowcross','overlap','nearpost','farpost']),
  press:new Set(['press','through','dribble']),
  block:new Set(['counter','through','duel'])
 };
 const signatures=new Set(),results={};let rng=0;
 const original=Math.random;Math.random=()=>{rng++;return .123};
 try{
  for(const [style,types] of Object.entries(tags)){
   let matches=0;const distribution={};const chosen=[];
   for(let i=0;i<350;i++){
    const event={id:'same-opportunity-'+i,minute:10+i%76,type:'goal',team:'away',
     opponentStyle:style,playerId:'striker',playerName:'Stürmer',scorerSlot:'ST',
     creatorName:'Passgeber',creatorSlot:'CM',playerStyles:[],creatorStyles:[]};
    const plan=H.choosePresentation(event,[]);
    assert.equal(plan.sequence,H.choosePresentation(event,[]).sequence);
    matches+=types.has(plan.family)?1:0;distribution[plan.family]=(distribution[plan.family]||0)+1;
    chosen.push(plan.sequence);
   }
   signatures.add(chosen.join(','));
   results[style]={matchingRate:matches/350,distribution};
   assert.ok(matches/350>.08,style+' should visibly show its own preferred football routes');
  }
 }finally{Math.random=original}
 assert.equal(rng,0,'3D style selection never draws from simulator Math.random');
 assert.equal(signatures.size,5,'five team styles produce genuinely different 3D sequence distributions');
 console.log('FOOTERA AI VISUAL STYLE ROUTES',JSON.stringify(results));
});
