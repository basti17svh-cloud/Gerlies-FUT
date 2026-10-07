const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function extract(from,to){const start=html.indexOf(from),end=html.indexOf(to,start);assert.ok(start>=0&&end>start,from);return html.slice(start,end)}

function fixture(seed=20261001){
 const positions=['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW','CM','ST','CB','GK','LB','RW','CM'];
 const club=positions.map((position,i)=>({uid:`p${i}`,name:`Heim ${i}`,position,ovr:84,phy:70,sho:80,pas:80,def:75}));
 const bases=new Map(club.map(p=>[p.uid,p]));
 const away=positions.slice(0,11).map((position,i)=>({id:`a${i}`,name:`Gast ${i}`,position,ovr:84,phy:70,sho:80,pas:80,def:75}));
 const math=Object.create(Math);math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 const elements=new Map(),node=id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:'',scrollIntoView(){},addEventListener(){}});return elements.get(id)};
 const ctx={Math:math,match:null,matchSpeed:800,state:{club,roles:[]},resolvedPlayer:p=>p,displayBase:p=>p,
  currentMatchBase:uid=>bases.get(uid)||null,currentMatchRating:uid=>bases.get(uid)?.ovr||0,
  posFit:(base,pos)=>base?.position===pos?1:0,positionLabel:p=>p,esc:String,P_BY_ID:new Map(),$:node,
  stopMatchTimer(){},dismissMatchGoalMoment(){},setMatchPill(){},penaltyShootoutTimer:null,requestAnimationFrame:fn=>fn(),clearTimeout(){},timers:[],setTimeout:fn=>ctx.timers.push(fn),
  addLog(){},updateMatchUI(){},finishMatch(){ctx.match.finished=true},pauseForManagement(){ctx.match.paused=true},
  matchHomeTeamName:()=>"Heim",matchAwayTeamName:()=>"Gast",toast:message=>{ctx.lastToast=message}};
 vm.createContext(ctx);
 vm.runInContext(extract('const FORMATIONS={','const SEASON_REWARDS='),ctx);
 vm.runInContext(extract('function matchPower(','function stopMatchTimer(')+'\n'+extract('function eventChance(','let matchManagerDraft=null;'),ctx);
 vm.runInContext(extract('function matchReportPerformanceRows(','function matchReportTimelineRows('),ctx);
 ctx.match={mode:'rivals',minute:0,home:0,away:0,chem:26,formation:'4-3-3',initialFormation:'4-3-3',tactic:'balanced',
  lineup:club.map(p=>p.uid),initialStarters:club.slice(0,11).map(p=>p.uid),clubIndex:new Map(club.map(p=>[p.uid,p])),
  opponentProfile:{squad:away,formation:'4-3-3',tactic:'balanced'},opp:88,
  paused:false,finished:false,injuryTriggered:false,redTriggered:false,halftimeLogged:false,extraTimeStarted:false,fitnessLoss:{home:{},away:{}},defensiveEvents:[],goalEvents:[],shotEvents:[],yellowCards:[],redCards:[],
  substitutionEvents:[],subbedOut:[],subsUsed:0,shotsHome:0,shotsAway:0,xgHome:0,xgAway:0,poss:50,timeline:[]};
 ctx.match.opp=ctx.matchTeamPower();
 return{ctx,bases,elements,node}
}

test('fitness weakens both sides equally and a fresh substitute restores on-field strength',()=>{
 const{ctx}=fixture(),kickoff=ctx.matchTeamPower();
 ctx.advanceMatchFitness(60);ctx.match.minute=60;
 const tired=ctx.matchTeamPower();assert.ok(kickoff-tired>3,'fitness has a material on-field effect');
 assert.ok(Math.abs(tired-ctx.matchOpponentPower())<.01,'identical sides incur identical fatigue');
 assert.equal(ctx.matchPlayerFitness('p11'),100,'unused substitutes stay fresh');
 assert.ok(ctx.matchPlayerFitness('p0')>ctx.matchPlayerFitness('p5'),'the goalkeeper uses less fitness');
 ctx.match.lineup[5]='p11';ctx.match.lineup[11]=null;
 assert.ok(ctx.matchTeamPower()>tired+.25,'a same-rated fresh substitute is effective');
 const removedFitness=ctx.matchPlayerFitness('p5');ctx.advanceMatchFitness(10);
 assert.equal(ctx.matchPlayerFitness('p5'),removedFitness,'a substituted player stops tiring');
 assert.ok(ctx.matchPlayerFitness('p11')<100&&ctx.matchPlayerFitness('p11')>90);
});

test('tactic and physical rating affect future fatigue without rewriting earlier fitness',()=>{
 const{ctx,bases}=fixture();bases.get('p6').phy=95;bases.get('p7').phy=45;
 ctx.advanceMatchFitness(30);ctx.match.minute=30;
 assert.ok(ctx.matchPlayerFitness('p6')>ctx.matchPlayerFitness('p7'));
 const before=ctx.matchPlayerFitness('p5');ctx.match.tactic='attacking';
 assert.equal(ctx.matchPlayerFitness('p5'),before,'changing tactics cannot retroactively drain fitness');
 const attacking=ctx.matchFitnessDrain(bases.get('p5'),'CM','attacking'),defensive=ctx.matchFitnessDrain(bases.get('p5'),'CM','defensive');
 assert.ok(attacking>defensive);
 ctx.advanceMatchFitness(30);assert.ok(ctx.matchPlayerFitness('p5')<before);
});

test('real saves and defensive actions count towards live ratings and player of the match',()=>{
 const{ctx}=fixture();ctx.match.minute=90;
 ctx.match.defensiveEvents=[...Array.from({length:6},(_,i)=>({side:'home',uid:'p0',index:0,kind:'save',minute:10+i*10,xg:.3})),
  ...Array.from({length:5},(_,i)=>({side:'home',uid:'p2',index:2,kind:i%2?'interception':'tackle',minute:12+i*10,xg:0}))];
 const keeper=ctx.matchPlayerLivePerformance('p0'),defender=ctx.matchPlayerLivePerformance('p2'),passiveDefender=ctx.matchPlayerLivePerformance('p3');
 assert.equal(keeper.saves,6);assert.ok(keeper.rating>=8,'a keeper can earn a high rating without scoring');
 assert.equal(defender.defensiveActions,5);assert.ok(defender.rating>passiveDefender.rating+.5);
 const report=ctx.matchReportPerformanceRows('home').find(row=>row.uid==='p0');
 assert.equal(report.rating,keeper.rating,'live and final ratings share the calculation');
 assert.equal(ctx.matchReportPotm().uid,'p0','a goalkeeper can be player of the match');
});

test('conceded goals and minutes only count while a player was on the pitch, including red cards',()=>{
 const{ctx,bases}=fixture();ctx.match.minute=90;
 ctx.match.lineup[2]='p11';bases.get('p11').position='CB';
 ctx.match.substitutionEvents=[{minute:60,at:60,incoming:[{uid:'p11',position:'CB'}],outgoing:[{uid:'p2'}]}];
 ctx.match.goalEvents=[{side:'away',minute:20,at:20,scorerIndex:9},{side:'away',minute:60,at:60,scorerIndex:9},{side:'away',minute:75,at:75,scorerIndex:9}];
 assert.equal(ctx.matchPlayerLivePerformance('p2').conceded,2);
 assert.equal(ctx.matchPlayerLivePerformance('p11').conceded,1,'a goal before the substitution is not charged to the incoming player');
 assert.equal(ctx.matchPlayerMinutes('p2'),60);assert.equal(ctx.matchPlayerMinutes('p11'),30);
 ctx.match.redCards=[{uid:'p3',minute:52,at:52.5}];ctx.match.lineup[3]=null;
 assert.equal(ctx.matchPlayerMinutes('p3'),52.5,'the participation window ends on a red card');
 assert.equal(ctx.matchPlayerLivePerformance('p3').conceded,1);
 assert.ok(ctx.matchPlayerLivePerformance('p3').rating<6,'dismissals lower the rating');
});

test('a saved shot records the actual defending goalkeeper and does not add a goal',()=>{
 const{ctx}=fixture();ctx.match.minute=24;ctx.Math.random=()=>.2;
 const shot={side:'away',minute:24,shooter:'Gast 9',xg:.35,goal:false};
 ctx.resolveMissedMatchShot(shot,'Gast');
 assert.equal(shot.outcome,'save');assert.equal(shot.onTarget,true);
 assert.equal(ctx.match.defensiveEvents[0].uid,'p0');assert.equal(ctx.match.defensiveEvents[0].xg,.35);
 assert.equal(ctx.match.home,0);assert.equal(ctx.match.away,0);assert.match(ctx.match.lastScene.text,/Heim 0 pariert/);
 ctx.Math.random=()=>.5;ctx.resolveMissedMatchShot({...shot},'Gast');
 const block=ctx.match.defensiveEvents.at(-1);assert.equal(block.kind,'block');assert.notEqual(block.uid,'p0');
});

test('normal and fast playback give identical seeded results, bookings, injuries and dismissals',()=>{
 let injuries=0,reds=0,yellows=0;
 function run(seed,speed){
  const{ctx}=fixture(seed);ctx.matchSpeed=speed;let ticks=0;
  while(!ctx.match.finished&&ticks++<160){if(ctx.match.paused){ctx.match.paused=false;ctx.match.halftimeActive=false;ctx.match.forcedOut=null}ctx.simTick()}
  assert.ok(ctx.match.finished);return JSON.parse(JSON.stringify(ctx.match,(key,value)=>key==='clubIndex'?undefined:value))
 }
 for(let seed=1;seed<=180;seed++){
  const normal=run(seed,800),fast=run(seed,250);assert.deepEqual(fast,normal,`same match at both tempos, seed ${seed}`);
  injuries+=Number(normal.injuryTriggered);reds+=normal.redCards.length;yellows+=normal.yellowCards.length;
 }
 assert.ok(injuries>0&&reds>0&&yellows>0,`the comparison exercises injuries (${injuries}), reds (${reds}) and yellows (${yellows})`);
});

test('tap selection prepares a reversible substitution and still enforces keeper and five-sub limits',()=>{
 const{ctx}=fixture();ctx.match.paused=true;ctx.document={querySelectorAll:()=>[]};
 vm.runInContext(extract('let matchManagerDraft=null;','let matchManagerDrag=null,'),ctx);
 ctx.renderMatchManager=()=>{};
 assert.equal(ctx.selectMatchManagerSlot(9),true);assert.equal(ctx.selectMatchManagerSlot(12),true);
 const draft=ctx.getMatchManagerDraft();assert.equal(draft.lineup[9],'p12');assert.equal(ctx.match.lineup[9],'p9','a tap cannot commit the match lineup');
 assert.equal(ctx.matchManagerPendingSubs(),1);
 ctx.selectMatchManagerSlot(9);ctx.selectMatchManagerSlot(12);assert.equal(ctx.matchManagerPendingSubs(),0,'a draft can be reverted');
 ctx.selectMatchManagerSlot(0);assert.equal(ctx.selectMatchManagerSlot(12),false);assert.equal(draft.lineup[0],'p0');
 assert.match(ctx.lastToast,/Torwart/);ctx.selectMatchManagerSlot(0);
 ctx.match.subsUsed=5;ctx.selectMatchManagerSlot(9);assert.equal(ctx.selectMatchManagerSlot(12),false);
 assert.match(ctx.lastToast,/fünf/);assert.equal(ctx.match.subsUsed,5);
});

test('pauses stop the clock and fitness; a tied friendly reaches extra time and a decisive shootout',()=>{
 const{ctx}=fixture();ctx.match.mode='friendly-random';ctx.match.injuryTriggered=true;ctx.match.redTriggered=true;
 ctx.Math.random=()=>.99;
 ctx.simAttack=()=>{};
 while(ctx.match.minute<45)ctx.simTick();
 assert.equal(ctx.match.minute,45);assert.equal(ctx.match.paused,true);
 const fitness=ctx.matchPlayerFitness('p5');ctx.simTick();
 assert.equal(ctx.match.minute,45);assert.equal(ctx.matchPlayerFitness('p5'),fitness);
 ctx.match.paused=false;ctx.match.halftimeActive=false;
 while(ctx.match.minute<90)ctx.simTick();
 assert.equal(ctx.match.extraTimeStarted,true);assert.equal(ctx.match.extraTimeManagementActive,true);assert.equal(ctx.match.paused,true);
 ctx.match.paused=false;ctx.match.extraTimeManagementActive=false;
 let ticks=0;while(!ctx.match.penaltyActive&&ticks++<40)ctx.simTick();
 assert.equal(ctx.match.penaltyActive,true);assert.equal(ctx.match.finished,false,'the shootout waits for timed kicks');
 // Deterministic home goals and away misses, including the outcome-text draw.
 let draws=0;ctx.Math.random=()=>Math.floor(draws++/2)%2===0?.1:.99;
 let callbacks=0;while(ctx.timers.length&&callbacks++<30)ctx.timers.shift()();
 assert.equal(ctx.match.minute,120);assert.equal(ctx.match.finished,true);
 assert.equal(ctx.match.extraTimeBreakLogged,true);assert.notEqual(ctx.match.pensHome,ctx.match.pensAway);assert.ok(ctx.match.penaltyWinner);
 assert.ok(ctx.matchPlayerFitness('p5')<fitness);
});


test('matchday team management keeps wrong-position warning visible and moves chemistry/boost metadata outside card art',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../matchday.css'),'utf8');
 const slot=extract('function matchManagerSlotHTML(','function matchManagerBenchHTML(');
 const managerMeta=extract('function matchManagerChemLevel(','function renderMatchPerformanceStrip(');
 const squadSlot=extract('function slotHTML(','function benchHTML(');
 const overview=extract('function playerOverviewHTML(','function openPlayerDetails(');
 assert.match(slot,/class="poswarn" title="Falsche Position"/);
 assert.match(slot,/matchManagerMetaHTML\(uid\)/);
 assert.match(managerMeta,/match-manager-chem/);
 assert.match(managerMeta,/match-manager-boost/);
 assert.match(css,/match-manager-slot\.out \.poswarn\{[\s\S]*?left:-7px;right:auto;top:-7px/);
 assert.match(css,/match-manager-slot>\.mini>\.cb-player-badge[\s\S]*?display:none/);
 assert.match(css,/match-manager-card-meta\{/);
 assert.match(css,/match-manager-bench \.match-live-fitness\{display:none\}/);
 assert.match(css,/manager-panel\.active\{padding-bottom:calc\(170px/);
 assert.doesNotMatch(squadSlot,/isFounderItem\(item\).*chem-dots/);
 assert.match(squadSlot,/Individuelle Chemie:/);
 assert.doesNotMatch(overview,/isFounderItem\(item\)\?"":detailChemHTML/);
 assert.match(overview,/\$\{detailChemHTML\(chem\)\}/);
});

test('match manager drag preview clones only the card so Chemie-Boost wrappers cannot enlarge it',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../matchday.css'),'utf8');
 const drag=extract('function startMatchManagerDrag(e){','function endMatchManagerDrag(e){');
 assert.match(drag,/querySelector\("\.card-shell"\)\?\.cloneNode\(true\)/);
 assert.doesNotMatch(drag,/g\.innerHTML=src\?\.innerHTML/);
 assert.match(css,/V21\.09 — team-management cards keep one fixed size/);
 assert.match(css,/\.match-manager-dragghost>\.card-shell\{[\s\S]*?width:70px!important/);
 assert.match(css,/match-manager-slot>\.mini[\s\S]*?width:100%/);
});

test('match manager chemistry follows kickoff chemistry and substitutes get zero',()=>{
 const{ctx}=fixture();ctx.match.chemBoostChem=[3,2,1,3,2,1,3,2,1,3,2];
 ctx.FooteraChemBoosts={active:()=>null,icon:()=>''};ctx.esc=String;
 vm.runInContext(extract('function matchManagerChemLevel(','function renderMatchPerformanceStrip('),ctx);
 assert.equal(ctx.matchManagerChemLevel('p0'),3);
 assert.equal(ctx.matchManagerChemLevel('p1'),2);
 assert.equal(ctx.matchManagerChemLevel('p10'),2);
 assert.equal(ctx.matchManagerChemLevel('p11'),0,'bench/substitutes carry zero in-match chemistry');
 ctx.match.lineup[9]='p11';
 assert.equal(ctx.matchManagerChemLevel('p11'),0,'an incoming substitute stays at zero chemistry');
});


test('every match preview exposes formation, tactic, roles and focus before kickoff',()=>{
 const preview=extract('function previewRolesHTML(','function renderMatchPreview(');
 const previewEvents=extract('$("squadBattleModalBody").addEventListener("change"', '$("squadBattleModalBody").addEventListener("click"');
 const modeEntry=extract('function openModeEntry(','function openOpponentTeam(');
 const start=extract('function startMatch(','function addLog(');
 assert.match(preview,/id="previewFormationSelect"/);
 assert.match(preview,/id="previewTacticSelect"/);
 assert.match(preview,/data-preview-role=/);
 assert.match(preview,/data-preview-focus=/);
 assert.match(preview,/Rollen & Fokus/);
 assert.match(previewEvents,/previewFormationSelect/);
 assert.match(previewEvents,/state\.formation=formation/);
 assert.match(previewEvents,/state\.roles=\{\};state\.focus=\{\}/);
 assert.match(previewEvents,/state\.squad=arrangeSquad\(selected,formation\)/);
 assert.match(previewEvents,/data-preview-role/);
 assert.match(previewEvents,/data-preview-focus/);
 assert.match(modeEntry,/mode==="champions"[\s\S]*renderMatchPreview\(mode,championsOpponent\(\)\)/);
 assert.match(modeEntry,/mode==="squad"[\s\S]*renderSquadBattleSelection\(\)/);
 assert.match(modeEntry,/mode==="friendly-friend"[\s\S]*renderMatchPreview\(mode,friendAsOpponent\(fr\)\)/);
 assert.match(modeEntry,/renderMatchPreview\(mode,oneOffOpponent\(mode\)\)/);
 assert.match(start,/formation:state\.formation,tactic:state\.tactic\|\|"balanced",roles:\{\.\.\.state\.roles\},focus:\{\.\.\.state\.focus\}/);
});

test('pre-match kit selector supports both teams, contrast warning and kickoff persistence',()=>{
 const preview=extract('function matchKitClone(','function ownLineupHTML(');
 const start=extract('function startMatch(','function addLog(');
 const clicks=extract('$("squadBattleModalBody").addEventListener("click"', 'function encodeFriendProfile(');
 const css=fs.readFileSync(path.join(__dirname,'../matchday.css'),'utf8');
 assert.match(preview,/function generatedOpponentKits\(/);
 assert.match(preview,/function createDefaultMatchKitSelection\(/);
 assert.match(preview,/data-preview-kit-side=/);
 assert.match(preview,/data-preview-kit-choice=/);
 assert.match(preview,/Auto-Kontrast/);
 assert.match(preview,/Trikots zu ähnlich/);
 assert.match(start,/kitSelection=null/);
 assert.match(start,/const kickoffKits=\{home:\{\.\.\.kickoffOptions\.home\[selectedKits\.home\]\},away:\{\.\.\.kickoffOptions\.away\[selectedKits\.away\]\}\}/);
 assert.match(clicks,/data-preview-kit-auto/);
 assert.match(clicks,/data-preview-kit-side/);
 assert.match(clicks,/startMatch\(ctx\.mode,ctx\.opponent,currentPreviewKitSelection\(\)\)/);
 assert.match(css,/V21\.12 — pre-match kit selection/);
 assert.match(css,/\.preview-kit-grid/);
 assert.match(css,/\.preview-kit-choice\.selected/);
});

test('pre-match editor styles stay isolated from 3D highlight CSS',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../matchday.css'),'utf8');
 assert.match(css,/V21\.01 — full pre-match editor/);
 assert.match(css,/\.squad-battle-preview \.preview-team-editor/);
 assert.match(css,/\.squad-battle-preview \.preview-role-row/);
 assert.doesNotMatch(css,/three|webgl|3d-highlight|highlight-canvas/i);
});
