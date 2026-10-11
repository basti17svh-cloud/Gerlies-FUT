const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const opponentCode=fs.readFileSync(path.join(root,'footera-opponent-styles.js'),'utf8');
function extract(from,to){const a=html.indexOf(from),b=html.indexOf(to,a+from.length);assert.ok(a>=0&&b>a,'missing '+from);return html.slice(a,b)}
const engine=extract('function matchClamp(', 'const SEASON_REWARDS=')+'\n'+extract('function tacticMods(', 'function stopMatchTimer(')+'\n'+extract('function eventChance(', 'let matchManagerDraft=null;');
const p=rating=>({name:'Testspieler',position:'CM',ovr:rating,pac:rating,sho:rating,pas:rating,dri:rating,def:rating,phy:rating});
function make(seed=12345){
 let randomSeed=seed>>>0;const math=Object.create(Math);
 math.random=()=>((randomSeed=(1664525*randomSeed+1013904223)>>>0)/4294967296);
 const ctx={Math:math,match:null,matchSpeed:550,state:{roles:{},focus:{}},P_BY_ID:new Map(),
  matchPower:()=>ctx.match.basePower,currentMatchBase:()=>p(ctx.match?.homeRating||82),
  resolvedPlayer:x=>x,displayBase:x=>x,
  roleFocusContext:()=>({attack:0,defense:0,poss:0,scorer:1,assist:1,defender:1,drain:1}),
  teamRoleFocusMods:()=>({attack:1,defense:1,poss:0}),
  recordMatchScene(){},recordMatchEvent(){},
  addLog(){},updateMatchUI(){},finishMatch(){ctx.match.finished=true},pauseForManagement(){},
  matchHomeTeamName:()=>'FC Gerlies',matchAwayTeamName:()=>'KI-Gegner',
  $(){return{textContent:'',classList:{add(){}}}}
 };
 vm.createContext(ctx);vm.runInContext(extract('const FORMATIONS={','const ROLE_OPTIONS='),ctx);vm.runInContext(engine,ctx);
 vm.runInContext(opponentCode,ctx);
 return ctx;
}
function run(style,count=250){
 let poss=0,homeShots=0,awayShots=0,awayXg=0,goalsHome=0,goalsAway=0,winsHome=0;
 // Same seed for all five styles; only tactics and bounded match effects differ.
 const ctx=make(416774);
 for(let i=0;i<count;i++){
  const opp=ctx.FooteraOpponentStyles.styleFor({kind:'generated',seed:'balanced-test-'+i,name:'KI-Gegner',
   formation:'4-3-3',rating:82,chem:24,squad:Array.from({length:11},()=>p(82)),power:84.88},0);
  if(style) {
   const selected=ctx.FooteraOpponentStyles.profiles.find(x=>x.id===style);
   opp.styleProfile={id:selected.id,label:selected.label,hint:selected.hint};
   opp.tactic=selected.tactic;opp.customTactics={...selected.tactics};
  }else{delete opp.styleProfile;opp.tactic='balanced';opp.customTactics={width:50,depth:50,pressing:50,buildUp:'balanced',attackFocus:'balanced',dribbling:50,crossing:50,longShots:50};}
  ctx.match={mode:'rivals',basePower:84.88,homeRating:82,chem:24,opp:84.88,opponentProfile:opp,
   lineup:Array.from({length:18},(_,j)=>'p'+j),formation:'4-3-3',tactic:'balanced',roles:{},focus:{},
   minute:0,home:0,away:0,shotsHome:0,shotsAway:0,xgHome:0,xgAway:0,poss:50,
   injuryTriggered:true,redTriggered:true,yellowCards:[],goalEvents:[],shotEvents:[],timeline:[]};
  for(let t=0;t<100&&!ctx.match.finished;t++)ctx.simTick();
  const m=ctx.match;assert.ok(m.finished,'normal match reaches full time');
  poss+=m.poss;homeShots+=m.shotsHome;awayShots+=m.shotsAway;awayXg+=m.xgAway;goalsHome+=m.home;goalsAway+=m.away;winsHome+=m.home>m.away;
  assert.ok(m.shotEvents.every(s=>s.side==='home'||s.side==='away'));
  if(style)assert.ok(m.shotEvents.filter(s=>s.side==='away').every(s=>s.opponentStyle===style));
 }
 return{homePoss:poss/count,shotsHome:homeShots/count,shotsAway:awayShots/count,xgAway:awayXg/count,goalsHome:goalsHome/count,goalsAway:goalsAway/count,homeWins:winsHome/count};
}
test('all styles affect real simulation while non-generated friend and Champions profiles stay neutral',()=>{
 const x=make().FooteraOpponentStyles;
 assert.equal(x.activeId({kind:'friend',styleProfile:{id:'press'}}),'');
 assert.deepEqual([...Object.values(x.matchTuning({kind:'friend',styleProfile:{id:'press'}},'home'))],[0,0,0]);
 assert.equal(x.possessionBias({kind:'friend',styleProfile:{id:'press'}}),0);
 assert.equal(x.matchTuning({kind:'generated',styleProfile:{id:'possession'}},'away').build>0,true);
 assert.equal(x.matchTuning({kind:'generated',styleProfile:{id:'counter'}},'away').duel>0,true);
 assert.equal(x.matchTuning({kind:'generated',styleProfile:{id:'block'}},'home').duel<0,true);
 assert.equal(x.matchTuning({kind:'generated',styleProfile:{id:'press'}},'home',88).build>x.matchTuning({kind:'generated',styleProfile:{id:'press'}},'home',18).build,true);
});
test('paired full matches: five personalities produce different measurable football, not runaway wins',()=>{
 const values=Object.fromEntries(['possession','counter','wing','press','block'].map(id=>[id,run(id,260)]));
 console.log('FOOTERA CPU FOOTBALL STYLE BALANCE',JSON.stringify(values));
 const neutral=run(null,260);console.log('FOOTERA CPU NEUTRAL',JSON.stringify(neutral));
 assert.ok(values.possession.homePoss<values.counter.homePoss-2,'possession AI should hold the ball more often than counter AI');
 assert.ok(values.block.homePoss>values.possession.homePoss+2,'deep block should concede more possession');
 assert.ok(values.counter.xgAway>values.block.xgAway,'counter teams should produce more dangerous chances than the deep block');
 const rates=Object.values(values).map(x=>x.homeWins);
 assert.ok(Math.max(...rates)-Math.min(...rates)<.25,'styles must not overwhelm squad strength');
 for(const row of Object.values(values)){
  assert.ok(row.homePoss>34&&row.homePoss<66,'possession within existing engine caps');
  assert.ok(row.shotsAway>0&&row.shotsHome>0,'every style still generates chances');
  assert.ok(row.goalsHome>=.4&&row.goalsAway>=.4,'scoring remains realistic');
 }
});
