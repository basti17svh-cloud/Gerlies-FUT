const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),src=fs.readFileSync(path.join(root,'halloween-cup.js'),'utf8');
function setup(){
 const state={profile:{saveId:'cup-club'},coins:100,packs:{},rewardPackQueue:[]},nodes={halloweenCupBody:{innerHTML:''},playHalloweenSummary:{}};
 const ctx={state,Date,PACKS:[],window:{},document:{addEventListener(){},getElementById:id=>nodes[id]},save(){},flushSave(){},renderAll(){},esc:String,buildGeneratedOpponent:o=>({kind:'generated',...o})};
 const competition=fs.readFileSync(path.join(root,'competition-system.js'),'utf8');
 vm.runInNewContext(competition.slice(competition.indexOf('function ratingRewardPack('),competition.indexOf('if(!PACKS.some(p=>p.id==="totw-reward"')),ctx);
 vm.runInNewContext(src,ctx);return{state,cup:ctx.window.FooteraHalloweenCup,nodes,packs:ctx.PACKS};
}
function match(t,stage,kickoffAt=t.cup.START+1000){return{mode:'halloween-cup',resultId:'result-'+stage,finished:true,halloweenCup:{saveId:'cup-club',stage,kickoffAt}}}
test('cup accepts kickoff only inside the Team 1 window and validates the preview stage',()=>{
 const t=setup(),c=t.cup;
 assert.ok(c.canStart(c.START-1));assert.equal(c.canStart(c.START),'');assert.ok(c.canStart(c.END));
 assert.ok(c.kickoff({cupId:c.ID,cupStage:2},c.START).error);
 assert.equal(c.kickoff({cupId:c.ID,cupStage:1},c.START).stage,1);
});
test('loss stays in the same round; duplicate finish, wrong owner and skipped stages never progress',()=>{
 const t=setup(),m=match(t,1),now=t.cup.START+2000;
 assert.equal(t.cup.record(m,'loss',now),false);
 assert.equal(t.cup.record(match(t,2),'win',now),false);
 m.halloweenCup.saveId='other';assert.equal(t.cup.record(m,'win',now),false);m.halloweenCup.saveId='cup-club';
 assert.equal(t.cup.record(m,'win',now),true);assert.equal(t.cup.record(m,'win',now),false);
 assert.equal(t.state.eventChallenges[t.cup.ID].wins.length,1);
});
test('three sequential wins complete the cup; starting before expiry allows the final to finish',()=>{
 const t=setup();
 for(let i=1;i<=3;i++)assert.equal(t.cup.record(match(t,i,t.cup.END-7000+i*2000),'win',t.cup.END-6000+i*2000+1),true);
 assert.equal(t.state.eventChallenges[t.cup.ID].wins.length,3);assert.ok(t.cup.canStart(t.cup.START+10000));
 assert.equal(t.cup.record(match(t,4),'win',t.cup.END+100),false);
});
test('matches outside the permitted kickoff or finish window cannot earn a reward',()=>{
 for(const [kickoff,end]of [[-1,1000],[604800000,604800001],[1,612000000]]){
  const t=setup();assert.equal(t.cup.record(match(t,1,t.cup.START+kickoff),'win',t.cup.START+end),false);
 }
});
test('account receipts deliver each reward once locally, including after reload',()=>{
 const t=setup();for(let repeat=0;repeat<2;repeat++)for(let stage=1;stage<=3;stage++)t.cup.applyReward({save_id:'cup-club',stage});
 assert.equal(t.state.coins,15100);assert.equal(t.state.packs['reward-82-15'],1);assert.equal(t.state.rewardPackQueue.length,1);
 assert.equal(t.state.rewardPackQueue[0].tradeable,false);assert.equal(Object.keys(t.state.challengeClaims).length,3);
 assert.throws(()=>t.cup.applyReward({save_id:'other',stage:1}),/Verein/);
});
test('opponents have three increasing targets and three established simulation styles',()=>{
 const t=setup();for(let i=1;i<=3;i++){
  const o=t.cup.opponent();assert.equal(o.target,[76,81,85][i-1]);assert.equal(o.styleProfile.id,['block','wing','press'][i-1]);assert.ok(o.styleProfile.label);
  assert.equal(t.cup.record(match(t,i,t.cup.START+i*1000),'win',t.cup.START+i*1000+500),true);
 }
 assert.equal(t.cup.opponent(),null);
});
test('frozen server pool includes all 18 approved Team 1 cards and no SBC, objective or Team 2 cards',()=>{
 const sql=fs.readFileSync(path.join(root,'online/footera-halloween-cup-pool-v21.297.sql'),'utf8');
 const options=sql.split('\n').filter(l=>l.startsWith("('")).map(l=>JSON.parse(l.slice(l.indexOf(",'" )+2,l.lastIndexOf("'::jsonb")).replace(/''/g,"'")));
 assert.equal(options.length,18);assert.equal(new Set(options.map(o=>o.item.pid)).size,18);
 for(const o of options){assert.equal(o.item.eventReleaseId,'halloween-2026');assert.equal(o.item.tradeable,false);assert.equal(o.item.cosmeticDesign,undefined);assert.equal(o.item.eventStats.length,6)}
 assert.equal(Math.min(...options.map(o=>o.item.displayRating)),84);assert.equal(Math.max(...options.map(o=>o.item.displayRating)),91);
 assert.equal(options.find(o=>o.item.pid==='264652').item.baseSnapshot.team,'Liverpool');
});

test('cup pack contains fifteen players all rated at least 82 and cannot be bought',()=>{
 const t=setup(),pack=t.packs.find(p=>p.id==='reward-82-15');
 assert.ok(pack);assert.equal(pack.count,15);assert.equal(pack.min,82);assert.equal(pack.store,false);assert.equal(pack.reward,true);assert.equal(pack.coins,null);assert.equal(pack.points,null);
});
