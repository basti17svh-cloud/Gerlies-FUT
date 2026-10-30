const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function setup(initial={}){
 const fixed=Date.parse('2026-10-30T20:00:00+01:00');class ClockDate extends Date{constructor(...a){super(...(a.length?a:[fixed]))}static now(){return fixed}}
 const state={coins:100,points:250,packs:{},rivals:{division:10,weeklyPoints:0},weeklyRewards:[],...initial};let saved;
 const c={Date:ClockDate,Intl,state,PACKS:[],document:{addEventListener(){}},save(){saved=JSON.parse(JSON.stringify(state))},flushSave(){},renderAll(){},currentViewId:()=>'',toast(){},fmt:String,esc:String,seasonCountdown:()=>'',setTimeout(){},setInterval(){}};
 vm.createContext(c);for(const f of ['footera-time.js','competition-system.js','champions-system.js'])vm.runInContext(read(f),c);
 return {c,state,saved:()=>saved,api:vm.runInContext('({championsRewardForWins,championsRank,settleChampionsRun,claimCompetitionReward,competitionClaimButtons,rewardLabel})',c)};
}
const points=w=>w===15?12000:w>=13?10000:w>=11?8000:w>=9?6000:w>=7?4500:w>=5?3000:w>=3?1000:0;
test('each 0–15 win result has the promised Footera Points, credited once with the normal reward',()=>{
 for(let wins=0;wins<=15;wins++){
  const t=setup();t.state.champions={week:String(Date.parse('2026-10-30T19:00:00+01:00')),games:15,wins,losses:15-wins,active:true,qualPoints:321};
  assert.equal(t.api.settleChampionsRun(),true);assert.equal(t.api.settleChampionsRun(),false);assert.equal(t.state.weeklyRewards.length,1);
  const r=t.state.weeklyRewards[0];assert.equal(r.points,wins,'result points remain wins');assert.equal(r.reward.points,points(wins));assert.equal(t.state.points,250,'settlement cannot pay early');
  const oldCoins=t.state.coins;assert.equal(t.api.claimCompetitionReward('champions',r.week),true);assert.equal(t.state.points,250+points(wins));assert.equal(t.state.coins,oldCoins+r.reward.coins);assert.equal(t.state.champions.qualPoints,321,'Footera Points never alter qualification CP');
  if(wins>=3)assert.match(t.api.rewardLabel(r),new RegExp(points(wins)+' Footera Points'));else assert.doesNotMatch(t.api.rewardLabel(r),/Footera Points/);assert.equal(t.api.claimCompetitionReward('champions',r.week),false);assert.equal(t.state.points,250+points(wins));
  const reload=setup(t.saved());assert.equal(reload.state.points,250+points(wins));assert.equal(reload.api.claimCompetitionReward('champions',r.week),false);assert.equal(reload.state.points,t.state.points);
 }
});
test('saved pre-change rewards keep their original contents and do not receive retroactive Points',()=>{
 const old={mode:'champions',week:'old',wins:4,points:4,reward:{coins:5000,packs:[],playerPicks:[]},claimed:false};
 const t=setup({weeklyRewards:[old]});assert.equal(t.api.claimCompetitionReward('champions','old'),true);assert.equal(t.state.points,250);assert.equal(t.state.coins,5100);
});
test('not playing a Weekend League never generates participation Points',()=>{
 const t=setup();t.state.champions={week:String(Date.parse('2026-10-30T19:00:00+01:00')),games:0,wins:0,losses:0,active:true};t.api.settleChampionsRun();assert.equal(t.state.weeklyRewards.length,0);assert.equal(t.state.points,250);
});

test('Friday morning accepts one entry; existing active and completed runs retain progress and receipts',()=>{
 const at=new Date('2026-10-30T09:00:00+01:00'),key=String(Date.parse('2026-10-30T19:00:00+01:00'));
 const t=setup();t.state.champions={qualPoints:2000};
 assert.equal(t.c.startChampionsRun(new Date('2026-10-30T08:59:59+01:00')).ok,false);
 assert.equal(t.c.startChampionsRun(at).ok,true);assert.equal(t.state.champions.week,key);assert.equal(t.state.champions.qualPoints,1000);
 Object.assign(t.state.champions,{games:5,wins:3,losses:2,results:'WWWLL'});
 assert.equal(t.c.startChampionsRun(at).ok,true);assert.equal(t.state.champions.games,5);assert.equal(t.state.champions.qualPoints,1000);
 assert.equal(t.c.championsCanStartMatch(at),true);
 const reload=setup(JSON.parse(JSON.stringify(t.state)));assert.equal(reload.c.championsCanStartMatch(at),true);assert.equal(reload.state.champions.results,'WWWLL');
 assert.equal(reload.c.championsCanStartMatch(new Date('2026-11-02T09:00:00+01:00')),false);assert.equal(reload.state.weeklyRewards.length,1);
 assert.equal(reload.c.syncChampionsCompetition(new Date('2026-11-02T09:00:00+01:00')),false);assert.equal(reload.state.weeklyRewards.length,1);
 Object.assign(t.state.champions,{active:false,completed:true});assert.equal(t.c.startChampionsRun(at).ok,false);assert.equal(t.state.champions.qualPoints,1000);
});
