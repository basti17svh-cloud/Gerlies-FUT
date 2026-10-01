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
  matchHomeTeamName:()=>"Footera Club",matchAwayTeamName:()=>"Gegner",
  $(){return{textContent:'',classList:{add(){}}}}
 };
 vm.createContext(ctx);
 vm.runInContext(extract('const FORMATIONS={','const ROLE_OPTIONS='),ctx);
 vm.runInContext(engine,ctx);
 function sample({rating,chem,opponentRating,opponentChem,speed=550,count=2000}){
  ctx.matchSpeed=speed;
  let wins=0,draws=0,goalless=0,goals=0,conceded=0,halftimes=0;
  for(let i=0;i<count;i++){
   ctx.match={mode:'rivals',basePower:rating+1.4,chem,opp:opponentRating+opponentChem*.12,
    lineup:Array(18).fill(1),formation:'4-3-3',tactic:'balanced',
    minute:0,home:0,away:0,shotsHome:0,shotsAway:0,xgHome:0,xgAway:0,poss:50,
    injuryTriggered:true,redTriggered:true,yellowCards:[],goalEvents:[],shotEvents:[],timeline:[]};
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

test('a named red card removes one outfield player and prevents playing eleven again',()=>{
 const{ctx}=simulator(),logs=[],reasons=[];
 ctx.FORMATIONS={'4-3-3':Array.from({length:11},(_,i)=>({p:i===0?'GK':'ST'}))};
 ctx.currentMatchBase=uid=>({name:`Spieler ${uid}`,position:uid==='p0'?'GK':'ST'});
 ctx.posFit=(player,slot)=>player.position===slot?1:0;
 ctx.addLog=message=>logs.push(message);ctx.pauseForManagement=message=>reasons.push(message);
 ctx.match={formation:'4-3-3',minute:78,lineup:Array.from({length:18},(_,i)=>`p${i}`),redCards:[]};
 const managerValidation=extract('function managerDraftIsValid(', 'function managerDropAllowed(');
 vm.runInContext(managerValidation,ctx);
 assert.equal(ctx.sendOffPlayer(),true);
 const red=ctx.match.redCards[0];
 assert.match(red.name,/Spieler p\d+/);assert.notEqual(red.uid,'p0');
 assert.equal(ctx.match.lineup.slice(0,11).filter(Boolean).length,10);
 assert.equal(ctx.match.lineup[ctx.match.redCardSlot],null);
 assert.match(logs[0],new RegExp(red.name));assert.match(reasons[0],new RegExp(red.name));
 assert.equal(ctx.managerDraftIsValid(ctx.match.lineup,'4-3-3'),true);
 const eleven=[...ctx.match.lineup];eleven[ctx.match.redCardSlot]=eleven[11];
 assert.equal(ctx.managerDraftIsValid(eleven,'4-3-3'),false);
});

test('pregame defensive tactic reaches the match simulation',()=>{
 const kickoff=extract('function startMatch(', 'function addLog('),logs=[],elements=new Map();
 const node=id=>{if(!elements.has(id))elements.set(id,{classList:{add(){},remove(){}},value:'',textContent:''});return elements.get(id)};
 const state={squad:Array.from({length:18},(_,i)=>`p${i}`),club:[],formation:'4-4-2',tactic:'defensive'};
 const ctx={state,match:null,squadMetrics:()=>({filled:18,rating:83,chem:26}),$:node,
  pushUiState:()=>{},addLog:message=>logs.push(message),updateMatchUI:()=>{},setMatchPill:()=>{},startMatchTimer:()=>{},resetMatchPresentation:()=>{},recordMatchScene:()=>{},matchHomeTeamName:()=>"Footera Club",matchAwayTeamName:()=>"Gegner"};
 vm.createContext(ctx);vm.runInContext(kickoff,ctx);
 ctx.startMatch('rivals',{name:'RIVALS XI',power:85});
 assert.equal(ctx.match.tactic,'defensive');
 assert.match(logs[0],/Taktik: Defensiv/);
});

test('a goal shows the real scorer card and resumes only after the celebration',()=>{
 const elements=new Map(),classes=new Set(),cards=[];
 const node=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',classList:{add(name){classes.add(name)},remove(name){classes.delete(name)}}});return elements.get(id)};
 const homeItem={uid:'striker-1',variant:'special',eventName:'MOMENTUM'},awayItem={uid:'opponent-1',variant:'special'};
 let stopped=0,resumed=0;
 const ctx={match:{clubIndex:new Map([['striker-1',homeItem]]),opponentProfile:{squad:[{id:'away-1',name:'Gastspieler'}],items:[awayItem]},power:86,opp:85,home:1,away:0,paused:false,finished:false},state:{club:[]},matchHighlightTimer:null,
  $:node,displayBase:item=>({name:item.uid==='striker-1'?'Stürmer':'Gastspieler'}),opponentMatchBase:entry=>entry,friendCard:()=>'',
  cardHTML:(base,item,mini)=>{cards.push({base,item,mini});return `<div class="real-card">${base.name}</div>`},
  stopMatchTimer:()=>stopped++,startMatchTimer:()=>resumed++,setMatchPill:()=>{},setTimeout:()=>17,clearTimeout:()=>{}};
 vm.createContext(ctx);
 vm.runInContext(extract('function dismissMatchGoalMoment(', '$("matchGoalSkip").addEventListener'),ctx);
 ctx.showMatchGoalMoment({side:'home',scorer:'Stürmer',assist:'Vorlagengeber',type:'assist',minute:32},{uid:'striker-1'});
 assert.equal(cards[0].item,homeItem);
 assert.equal(cards[0].mini,false);
 assert.match(node('matchGoalCard').innerHTML,/Stürmer/);
 assert.equal(node('matchGoalScorer').textContent,'Stürmer');
 assert.equal(node('matchGoalAssist').textContent,'Vorlage: Vorlagengeber');
 assert.equal(ctx.match.highlightActive,true);assert.equal(stopped,1);assert.equal(resumed,0);
 ctx.dismissMatchGoalMoment();
 assert.equal(ctx.match.highlightActive,false);assert.equal(resumed,1);
 ctx.match.away=1;
 ctx.showMatchGoalMoment({side:'away',scorer:'Gastspieler',type:'solo',minute:64},{index:0});
 assert.equal(cards[1].item,awayItem);
 assert.equal(node('matchGoalScore').textContent,'1 : 1');
 ctx.match.paused=true;ctx.dismissMatchGoalMoment();
 assert.equal(resumed,1,'a manager pause does not restart the clock');
});
