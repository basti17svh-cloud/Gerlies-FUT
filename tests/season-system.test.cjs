const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../season-system.js'),'utf8');
const firstTen=[0,500,1000,1800,2800,4000,5500,7500,10000,13500].map((sp,i)=>({level:i+1,sp,reward:i===0?{coins:500}:{pack:'gold'}}));

function setup(initial={}){
 const elements=new Map();
 function element(id){
  if(!elements.has(id))elements.set(id,{
   innerHTML:'',textContent:'',listeners:{},classList:{contains:()=>false},
   querySelector:()=>({scrollLeft:0}),addEventListener(type,handler){this.listeners[type]=handler}
  });
  return elements.get(id)
 }
 const state={coins:60000,points:1000,sp:0,packs:{},seasonClaims:{},seasonPass:null,
  stats:{competitiveMatches:0,competitiveWins:0,rivalsMatches:0,squadMatches:0,packs:0,market:0,sbcs:0},
  claims:{},objectiveWindows:{},objectiveClaims:{},objectiveBonuses:{},...initial};
 const ctx={state,SEASON_REWARDS:structuredClone(firstTen),TASKS:[{id:'starter',title:'Starter',desc:'Start',stat:'packs',target:1,reward:{coins:100}}],
  $:element,save(){},renderAll(){},renderHome(){},toast(){},confirm(){return true},
  fmt:n=>String(n),esc:s=>String(s),rewardText:r=>JSON.stringify(r),setInterval(){},
  grant:r=>{state.coins+=r.coins||0;state.sp+=r.sp||0;if(r.pack)state.packs[r.pack]=(state.packs[r.pack]||0)+(r.qty||1)},
  grantSeasonOnly:r=>{state.coins+=r.coins||0;state.points+=r.points||0;if(r.pack)state.packs[r.pack]=(state.packs[r.pack]||0)+(r.qty||1)},
  claimSeasonRewards(){}
 };
 vm.createContext(ctx);
 vm.runInContext(source,ctx,{filename:'season-system.js'});
 const api=vm.runInContext('({seasonInfo,objectiveWindow,ensureObjectiveWindows,objectiveProgress,availableObjectiveRewardsCount,availableRotatingObjectiveRewardsCount,availablePassRewardsCount,renderTasks})',ctx);
 return{ctx,state:ctx.state,elements,api,click(id,selector,dataset){
  const handler=element(id).listeners.click;
  assert.ok(handler,`${id} click handler`);
  handler({target:{closest:check=>check===selector?{dataset}:null}})
 }}
}

test('30 reward tiers and rotating day/week/season schedules',()=>{
 const{ctx,api}=setup();
 assert.equal(ctx.SEASON_REWARDS.length,30);
 assert.equal(ctx.SEASON_REWARDS.at(-1).sp,26500);
 assert.ok(ctx.SEASON_REWARDS.every(t=>t.reward&&t.premium));
 const seasonBoundary=new Date(2026,9,22,19,0,0),dailyBoundary=new Date(2026,8,23,19,0,0);
 assert.equal(api.seasonInfo(new Date(seasonBoundary.getTime()-1000)).number,1);
 assert.equal(api.seasonInfo(seasonBoundary).number,2);
 assert.equal(api.objectiveWindow('daily',new Date(dailyBoundary.getTime()-1000)).end.getTime(),dailyBoundary.getTime());
 assert.equal(api.objectiveWindow('weekly',new Date('2026-09-23T20:00:00Z')).tasks.length,4);
 assert.equal(api.objectiveWindow('season',new Date('2026-09-23T20:00:00Z')).tasks.length,4);
 assert.notDeepEqual(api.objectiveWindow('daily',new Date('2026-09-23T20:00:00Z')).tasks.map(t=>t.id),api.objectiveWindow('daily',new Date('2026-09-24T20:00:00Z')).tasks.map(t=>t.id));
});

test('progress counts only actions in the active window and resets on rotation',()=>{
 const{state,api}=setup();
 const first=new Date('2026-09-23T20:00:00Z'),next=new Date('2026-09-24T20:00:00Z');
 state.stats.packs=8;
 api.ensureObjectiveWindows(first);
 const pack=api.objectiveWindow('weekly',first).tasks.find(t=>t.stat==='packs');
 if(pack){assert.equal(api.objectiveProgress(pack),0);state.stats.packs+=3;assert.equal(api.objectiveProgress(pack),pack.target)}
 const daily=api.objectiveWindow('daily',first).tasks[0];
 state.stats[daily.stat]+=daily.target;
 assert.equal(api.objectiveProgress(daily),daily.target);
 api.ensureObjectiveWindows(next);
 const tomorrow=api.objectiveWindow('daily',next).tasks.find(t=>t.stat===daily.stat);
 if(tomorrow)assert.equal(api.objectiveProgress(tomorrow),0);
});

test('old season claims migrate once and restore missing first-tier coins',()=>{
 const{state,api}=setup({coins:7000,sp:500,seasonClaims:{1:true,2:true}});
 assert.equal(state.coins,7500);
 assert.equal(state.seasonPass.freeClaims[1],true);
 assert.equal(state.seasonPass.freeClaims[2],true);
 assert.equal(api.availableObjectiveRewardsCount(),0);
 api.ensureObjectiveWindows();
 assert.equal(state.coins,7500);
});

test('buying premium unlocks achieved tiers retroactively, and duplicate claims are ignored',()=>{
 const app=setup({sp:500});
 const{state,api}=app;
 assert.equal(api.availableObjectiveRewardsCount(),2);
 app.click('seasonPass','[data-pass-buy]',{passBuy:'coins'});
 assert.equal(state.coins,10000);
 assert.equal(state.seasonPass.premium,true);
 assert.equal(api.availableObjectiveRewardsCount(),4);
 app.click('seasonPass','[data-pass-claim]',{passClaim:'premium',passLevel:'1'});
 const amount=state.coins;
 assert.equal(amount,13000);
 app.click('seasonPass','[data-pass-claim]',{passClaim:'premium',passLevel:'1'});
 assert.equal(state.coins,amount);
 app.click('seasonPass','[data-pass-claim]',{passClaim:'free',passLevel:'1'});
 assert.equal(state.coins,amount+500);
 assert.equal(api.availableObjectiveRewardsCount(),2);
});

test('objective notice counts only objectives while Pass rewards appear separately',()=>{
 const app=setup({sp:500});
 const{api,state}=app;
 assert.equal(api.availablePassRewardsCount(),2);
 assert.equal(api.availableRotatingObjectiveRewardsCount(),0);
 api.renderTasks();
 assert.match(app.elements.get('objectiveSummary').textContent,/^0 Belohnungen abholbereit/);
 const daily=api.objectiveWindow('daily').tasks[0];
 state.stats[daily.stat]+=daily.target;
 assert.ok(api.availableRotatingObjectiveRewardsCount()>=1);
 assert.equal(api.availablePassRewardsCount(),2);
});

test('claiming a rotating objective and the weekly set bonus grants each only once',()=>{
 const app=setup();
 const{state,api}=app;
 const task=api.objectiveWindow('daily').tasks[0];
 state.stats[task.stat]+=task.target;
 app.click('taskList','[data-objective-claim]',{objectiveClaim:task.key});
 const sp=state.sp;
 assert.equal(sp,task.reward.sp);
 app.click('taskList','[data-objective-claim]',{objectiveClaim:task.key});
 assert.equal(state.sp,sp);
 const week=api.objectiveWindow('weekly');
 for(const goal of week.tasks)state.objectiveClaims[goal.key]=true;
 app.click('taskList','[data-objective-bonus]',{objectiveBonus:week.key});
 assert.equal(state.sp,sp+500);
 assert.equal(state.packs.gold,1);
 app.click('taskList','[data-objective-bonus]',{objectiveBonus:week.key});
 assert.equal(state.sp,sp+500);
 assert.equal(state.packs.gold,1);
});

test('season change settles earned rewards once and resets premium and SP',()=>{
 const app=setup({coins:1000,sp:500,seasonPass:{key:'s1',premium:true,freeClaims:{1:true},premiumClaims:{}},objectiveWindows:{}});
 const{state,api}=app;
 api.ensureObjectiveWindows(new Date('2026-10-22T19:00:00Z'));
 assert.equal(state.seasonPass.key,'s2');
 assert.equal(state.seasonPass.premium,false);
 assert.equal(state.sp,0);
 assert.equal(state.coins,4000);
 assert.equal(state.packs.gold,2);
 api.ensureObjectiveWindows(new Date('2026-10-22T19:01:00Z'));
 assert.equal(state.coins,4000);
 assert.equal(state.packs.gold,2);
});
