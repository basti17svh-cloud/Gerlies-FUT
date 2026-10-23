const test=require('node:test'),assert=require('node:assert/strict');
const scenes=require('../friend-online-3d.js');
const fp=(name,pid)=>({pid,name,position:'ST',ovr:85,sho:85,pas:80,dri:84,pac:86,def:40,phy:78});
test('a goal tick shows only the goal; big chances alone get their own scene',()=>{
 const events=[{kind:'kickoff',minute:0},{kind:'chance',side:'home',minute:12,xg:.31},{kind:'goal',side:'home',minute:12},{kind:'chance',side:'away',minute:30,xg:.24},{kind:'chance',side:'away',minute:31,xg:.12},{kind:'defense',minute:33}];
 assert.deepEqual(events.map((_,i)=>scenes.sceneKind(events,i)),['','','goal','chance','','']);
 assert.equal(scenes.BIG_CHANCE_XG,.22,'must match footera_tick in online/footera-online-matchday-v21.246.sql');
});
test('the score is held at the value before the goal',()=>{
 const events=[{kind:'goal',side:'home'},{kind:'goal',side:'away'},{kind:'goal',side:'home'}];
 assert.deepEqual(scenes.scoreBefore(events,2),{home:1,away:1});
});
test('scene events name the real clubs, scorer, keeper and kits',()=>{
 global.FooteraHighlights={choosePresentation:()=>({sequence:'central',family:'central',finish:'normal',seconds:10.4}),chooseShotPlacement:()=>({side:1,zone:'channel',height:'mid'}),chooseReactions:()=>({defenderAction:'jockey',keeperAction:'classic'})};
 global.FORMATIONS={'4-3-3':[{p:'GK'},{p:'LB'},{p:'CB'},{p:'CB'},{p:'RB'},{p:'CM'},{p:'CM'},{p:'CM'},{p:'LW'},{p:'ST'},{p:'RW'}]};
 const lineup=side=>Array.from({length:18},(_,i)=>fp(`${side} ${i}`,`${side}-${i}`));
 const home=lineup('Heim'),away=lineup('Gast');
 const duel={id:'d1',home_profile:{club_name:'FC Gerlies',formation:'4-3-3',club_identity:{kits:{home:{shirtPrimary:'#d8ff3e'}}}},away_profile:{club_name:'HSV FC',formation:'4-3-3',club_identity:{kits:{home:{shirtPrimary:'#ffffff'},away:{shirtPrimary:'#0a66c2'}}}},
  home_lineup:home,away_lineup:away,events:[{kind:'chance',side:'away',minute:40,xg:.3,player:away[9]},{kind:'goal',side:'away',minute:40,player:away[9],creator:away[6]}]};
 const e=scenes.buildEvent(duel,1,[]);
 assert.equal(e.type,'goal');assert.equal(e.team,'away');assert.equal(e.playerName,'Gast 9');assert.equal(e.creatorName,'Gast 6');
 assert.equal(e.scorerSlot,'ST');assert.equal(e.keeperName,'Heim 0');assert.equal(e.teamName,'HSV FC');
 assert.equal(e.homeColor,'#d8ff3e');assert.equal(e.awayColor,'#0a66c2');assert.deepEqual([e.scoreBeforeHome,e.scoreBeforeAway],[0,0]);
 assert.equal(e.period,1);assert.equal(e.squadNames[0],'Gast 9');
 const c=scenes.buildCeremony({...duel,home_score:0,away_score:1,minute:90},'fulltime');
 assert.equal(c.team,'away');assert.equal(c.homeName,'FC Gerlies');assert.equal(c.awayName,'HSV FC');assert.equal(c.result,'win');
 delete global.FooteraHighlights;delete global.FORMATIONS;
});
