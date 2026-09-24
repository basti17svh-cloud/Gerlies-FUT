const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function extract(from,to){
 const start=html.indexOf(from),end=html.indexOf(to,start);
 assert.ok(start>=0&&end>start,`Match simulation section: ${from}`);
 return html.slice(start,end)
}
const engine=extract('function tacticMods(', 'function stopMatchTimer(')+'\n'+extract('function eventChance(', 'let matchManagerDraft=null;');

function simulator(){
 let seed=3951741;
 const math=Object.create(Math);
 math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 const ctx={Math:math,match:null,matchSpeed:550,
  matchPower:()=>ctx.match.basePower,currentMatchBase:()=>({name:'Spieler'}),
  addLog(){},updateMatchUI(){},finishMatch(){ctx.match.finished=true},pauseForManagement(){},
  $(){return{textContent:'',classList:{add(){}}}}
 };
 vm.createContext(ctx);vm.runInContext(engine,ctx);
 function sample({rating,chem,opponentRating,opponentChem,speed=550,count=2000}){
  ctx.matchSpeed=speed;
  let wins=0,draws=0,goalless=0,goals=0,conceded=0,halftimes=0;
  for(let i=0;i<count;i++){
   ctx.match={basePower:rating+1.4,chem,opp:opponentRating+opponentChem*.12,
    lineup:Array(18).fill(1),formation:'4-3-3',tactic:'balanced',
    minute:0,home:0,away:0,shotsHome:0,shotsAway:0,xgHome:0,xgAway:0,poss:50,
    injuryTriggered:true,redTriggered:true};
   let ticks=0;
   while(!ctx.match.finished&&ticks++<100)ctx.simTick();
   assert.ok(ctx.match.finished,'a match reaches full time');
   const m=ctx.match;
   wins+=m.home>m.away;draws+=m.home===m.away;goalless+=m.home===0&&m.away===0;
   goals+=m.home;conceded+=m.away;halftimes+=Boolean(m.halftimeLogged)
  }
  return{win:wins/count,draw:draws/count,goalless:goalless/count,goals:goals/count,conceded:conceded/count,halftimes}
 }
 return{ctx,sample}
}

test('a 84/26 squad usually wins against 50/5 without frequent 0:0 games',()=>{
 const{sample}=simulator(),strong=sample({rating:84,chem:26,opponentRating:50,opponentChem:5});
 assert.ok(strong.win>.88&&strong.win<.99,`win rate ${strong.win}`);
 assert.ok(strong.goalless<.05,`0:0 rate ${strong.goalless}`);
 assert.ok(strong.goals>2.5&&strong.goals<5,`goals ${strong.goals}`);
 assert.ok(strong.conceded>0,'the weaker side can still score');
});

test('a similar opponent remains competitive and chemistry changes results',()=>{
 const{ctx,sample}=simulator();
 ctx.match={basePower:84,chem:0};
 const lowPower=ctx.matchTeamPower();ctx.match.chem=33;
 assert.ok(ctx.matchTeamPower()>lowPower+3.9);
 const equal=sample({rating:84,chem:26,opponentRating:84,opponentChem:26});
 assert.ok(equal.win>.29&&equal.win<.52,`equal matchup win rate ${equal.win}`);
 assert.ok(equal.draw>.15&&equal.draw<.36,`equal matchup draw rate ${equal.draw}`);
 const lowChem=sample({rating:84,chem:0,opponentRating:84,opponentChem:16});
 const highChem=sample({rating:84,chem:33,opponentRating:84,opponentChem:16});
 assert.ok(highChem.win>lowChem.win+.04,`chemistry impact ${lowChem.win} vs ${highChem.win}`);
});

test('the fast setting preserves the match outcome distribution and halftime',()=>{
 const{sample}=simulator(),fixture={rating:84,chem:26,opponentRating:50,opponentChem:5};
 const normal=sample({...fixture,speed:550});
 const fast=sample({...fixture,speed:250});
 assert.ok(Math.abs(normal.win-fast.win)<.05,`win rates ${normal.win} vs ${fast.win}`);
 assert.ok(Math.abs(normal.goals-fast.goals)<.35,`goals ${normal.goals} vs ${fast.goals}`);
 assert.equal(normal.halftimes,2000);
 assert.equal(fast.halftimes,2000);
});
