const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../footera-opponent-styles.js'),'utf8');
const SLOTS=['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW'];
const BENCH=['CB','RB','CM','CAM','LW','ST','GK'];
function setup({style='possession',kind='generated',fitness=()=>100}={}){
 const events=[],ticker=[],logs=[];
 const squad=[...SLOTS,...BENCH].map((pos,i)=>({id:'o'+i,name:(i<11?'Start':'Bank')+i,position:pos,ovr:80,sho:70+i,def:60,pac:80,dri:80,pas:80,phy:80}));
 const original={kind,seed:'brain',name:'CPU',styleProfile:{id:style,label:'Stil',hint:''},tactic:'balanced',customTactics:{width:50,depth:50,pressing:50,buildUp:'balanced',longShots:50,crossing:50},squad};
 const ctx={document:{querySelectorAll:()=>[]},Math:Object.create(Math),
  matchAwayTeamName:()=>'Testgegner',matchCommentaryTicker:(t,tone)=>ticker.push({t,tone}),addLog:t=>logs.push(t),recordMatchEvent:(k,s,t)=>events.push({k,s,t}),
  opponentMatchBase:e=>e,
  matchPlayerFitness:(uid,side,i)=>ctx.match.fitnessLoss.away[i]===0?100:fitness(i),
  matchActorRows:side=>ctx.match.opponentProfile.squad.slice(0,11).map((base,index)=>({index,base,name:base.name,slot:SLOTS[index]}))};
 ctx.Math.random=()=>{throw new Error('the CPU coach must not draw match RNG')};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 ctx.match={mode:'rivals',minute:0,home:0,away:0,opponentProfile:original,goalEvents:[],shotEvents:[],fitnessLoss:{home:{},away:{}},extraTimeStarted:false};
 const api=ctx.FooteraOpponentStyles;
 const run=(to,step=1.25)=>{while(ctx.match.minute<to){ctx.match.minute+=step;api.think(ctx.match)}};
 return{ctx,api,run,original,events,ticker,logs};
}
test('a trailing CPU goes forward late, a leading CPU protects, the cached opponent stays untouched',()=>{
 const a=setup();a.ctx.match.home=1;a.run(55);
 assert.equal(a.ctx.match.opponentProfile.tactic,'balanced','no panic before the coach reacts');
 a.run(66);const p=a.ctx.match.opponentProfile;
 assert.equal(p.tactic,'attacking');assert.ok(p.customTactics.depth>50&&p.customTactics.pressing>50);assert.equal(p.customTactics.buildUp,'fast');
 assert.equal(a.original.tactic,'balanced');assert.equal(a.original.customTactics.depth,50,'Squad Battles cache is not rewritten');
 assert.ok(a.ticker.some(x=>/stellt um/.test(x.t)));
 a.run(84);assert.ok(p.customTactics.depth>=70,'all in during the final minutes');
 const b=setup({style:'block'});b.ctx.match.away=1;b.run(70);
 assert.equal(b.ctx.match.opponentProfile.tactic,'defensive');assert.ok(b.ctx.match.opponentProfile.customTactics.depth<50);
 b.ctx.match.home=1;b.ctx.match.goalEvents.push({at:71});b.run(80);
 assert.equal(b.ctx.match.opponentProfile.tactic,'balanced','after the equaliser the CPU returns to its own style');
 assert.equal(b.api.decisions(b.ctx.match).filter(d=>d.kind==='tactic').length,2);
});
test('the CPU secures the flank the user keeps attacking and only that flank defends better',()=>{
 const a=setup();
 a.ctx.match.shotEvents.push({side:'home',attackFlank:'left',xg:.14,creator:'Vinícius'},{side:'home',attackFlank:'left',xg:.12,creator:'Vinícius'},{side:'home',attackFlank:'right',xg:.03});
 a.run(25);
 assert.ok(a.ticker.some(x=>/linke Seite ab gegen Vinícius/.test(x.t)));
 const left=a.api.flankTuning(a.ctx.match,'home','cross','left'),right=a.api.flankTuning(a.ctx.match,'home','cross','right'),inside=a.api.flankTuning(a.ctx.match,'home','combination','left');
 assert.ok(left.duel<0);assert.equal(right.duel,0);assert.equal(inside.duel,0);
 assert.ok(a.api.flankTuning(a.ctx.match,'away','cross','').build<0,'securing a flank costs own build-up');
 assert.equal(a.api.attackFlank('cross',{slot:'LW'},{slot:'ST'}),'left');
 assert.equal(a.api.attackFlank('dribble',{slot:'CM'},{slot:'RW'}),'right');
 assert.equal(a.api.attackFlank('combination',{slot:'CM'},{slot:'ST'}),'');
});
test('tired outfield players are substituted from a fitting bench, keeper and limits respected',()=>{
 const tired=new Set([1,8,9,10,5,6,0]);
 const a=setup({fitness:i=>tired.has(i)?60:95});a.run(90);
 const s=a.ctx.match.opponentProfile.squad,subs=a.events.filter(e=>e.k==='sub');
 assert.ok(subs.length>=3&&subs.length<=5,'between three and five changes: '+subs.length);
 assert.equal(s[0].name,'Start0','the goalkeeper is never subbed for fatigue');
 assert.ok(subs.every(e=>e.s==='away'&&/ für /.test(e.t)));
 assert.equal(a.original.squad[1].name,'Start1','original squad array is untouched');
 const swapped=s.slice(0,11).filter(p=>p.name.startsWith('Bank'));assert.equal(swapped.length,subs.length);
 assert.ok(swapped.every(p=>p.position!=='GK'));
 assert.equal(new Set(s.map(p=>p.id)).size,s.length,'nobody appears twice');
});
test('friends and online opponents are never coached by the CPU',()=>{
 const a=setup({kind:'friend'});a.ctx.match.home=2;a.run(88);
 assert.equal(a.ctx.match.aiBrain,undefined);assert.equal(a.ctx.match.opponentProfile,a.original);assert.equal(a.ticker.length,0);
});
