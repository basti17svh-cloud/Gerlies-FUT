const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),C=require('../chem-boosts.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const extract=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const code=extract('const FORMATIONS={','const SEASON_REWARDS=')+'\n'+extract('function chemBoostMatchBase(','function currentMatchRating(')+'\n'+extract('function tacticMods(','function stopMatchTimer(')+'\n'+extract('function eventChance(','let matchManagerDraft=null;');
function harness(){
 let seed=1;const math=Object.create(Math);math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 const ctx={Math:math,FooteraChemBoosts:C,match:null,state:{club:[],roles:{},focus:{}},P_BY_ID:new Map(),matchSpeed:550,
  resolvedPlayer:x=>x,displayBase:x=>x.base||x,matchPower:()=>ctx.match.basePower,
  recordMatchScene(){},recordMatchEvent(){},addLog(){},updateMatchUI(){},finishMatch(){ctx.match.finished=true},pauseForManagement(){},matchHomeTeamName:()=>"Heim",matchAwayTeamName:()=>"Gast",$(){return{textContent:'',classList:{add(){}}}}};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 function sample(id,chem,other=null,rating=84,awayRating=84,count=80){
  seed=187123;const sum={goals:0,conceded:0,xg:0,shots:0,possession:0,duels:0,win:0,draw:0};
  for(let run=0;run<count;run++){
   const positions=['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW'],player=(r,i)=>({id:`base${i}`,name:`Spieler ${i}`,position:positions[i],ovr:r,pac:r,sho:r,pas:r,dri:r,def:r,phy:r});
   const home=positions.map((_,i)=>({uid:`p${i}`,base:player(rating,i),chemBoost:id?{id}:null})),away=positions.map((_,i)=>({base:player(awayRating,i),chemBoost:other?{id:other}:null}));
   ctx.state.club=home;ctx.match={mode:'rivals',basePower:rating+1.2,chem:chem*11,chemBoostChem:Array(11).fill(chem),opp:awayRating+1.2+chem*11*.12,
    clubIndex:new Map(home.map(i=>[i.uid,i])),initialStarters:home.map(i=>i.uid),lineup:home.map(i=>i.uid),formation:'4-3-3',tactic:'balanced',roles:{},focus:{},
    opponentProfile:{formation:'4-3-3',tactic:'balanced',chem:chem*11,chemScores:Array(11).fill(chem),squad:away,roles:{},focus:{}},
    minute:0,home:0,away:0,shotsHome:0,shotsAway:0,xgHome:0,xgAway:0,poss:50,injuryTriggered:true,redTriggered:true,yellowCards:[],goalEvents:[],shotEvents:[],defensiveEvents:[],timeline:[]};
   let ticks=0;while(!ctx.match.finished&&ticks++<100)ctx.simTick();assert.ok(ctx.match.finished);
   const m=ctx.match;sum.goals+=m.home;sum.conceded+=m.away;sum.xg+=m.xgHome;sum.shots+=m.shotsHome;sum.possession+=m.poss;sum.duels+=m.defensiveEvents.filter(e=>e.side==='home'&&['tackle','interception','block'].includes(e.kind)).length;sum.win+=m.home>m.away;sum.draw+=m.home===m.away;
  }
  for(const key of Object.keys(sum))sum[key]/=count;return sum;
 }
 return{sample};
}
test('all six boosts at chemistry 0–3, every boost matchup and extreme rating gaps remain plausible',()=>{
 const {sample}=harness(),rows=[];
 for(let chem=0;chem<=3;chem++){
  const normal=sample(null,chem);rows.push({boost:'Kein Boost',chem,...normal});
  for(const d of C.DEFINITIONS){const result=sample(d.id,chem);rows.push({boost:d.name,chem,...result});if(!chem)assert.deepEqual(result,normal,`${d.name}: zero chemistry must be exactly neutral`);
   assert.ok(result.win<.75,`${d.name}: unrealistic advantage ${result.win}`);assert.ok(result.goals<normal.goals+1.5);assert.ok(result.xg<normal.xg+1.5);assert.ok(result.shots<normal.shots+5);assert.ok(Math.abs(result.possession-normal.possession)<6);assert.ok(Number.isFinite(result.duels));
  }
 }
 for(let a=0;a<6;a++)for(let b=a+1;b<6;b++){const result=sample(C.DEFINITIONS[a].id,3,C.DEFINITIONS[b].id,84,84,60);rows.push({boost:C.DEFINITIONS[a].name,against:C.DEFINITIONS[b].name,chem:3,...result});assert.ok(result.win>.10&&result.win<.80,'no boost matchup dominates equal-rated teams');}
 for(const [rating,away] of [[84,50],[50,84]])for(const id of [null,'vollstrecker']){const result=sample(id,3,null,rating,away,100);rows.push({boost:id||'Kein Boost',chem:3,rating,againstRating:away,...result});assert.ok(rating>away?result.win>.80:result.win<.20,'boosts cannot erase extreme squad strength differences');}
 // A reproducible developer report, kept outside runtime save data.
 fs.writeFileSync('/tmp/chem-boost-balance-results.json',JSON.stringify({matches:4*7*80+15*60+4*100,rows},null,2));
});
