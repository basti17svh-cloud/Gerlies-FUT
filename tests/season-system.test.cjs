const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../season-system.js'),'utf8');
const timeSource=fs.readFileSync(path.join(__dirname,'../footera-time.js'),'utf8');
const firstTen=[0,500,1000,1800,2800,4000,5500,7500,10000,13500].map((sp,i)=>({level:i+1,sp,reward:i===0?{coins:500}:{pack:'gold'}}));

const SEASON1_NOW=Date.parse('2026-10-20T12:00:00+02:00');
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
  storyGrants:[],
  stats:{competitiveMatches:0,competitiveWins:0,rivalsMatches:0,squadMatches:0,packs:0,market:0,sbcs:0},
  claims:{},objectiveWindows:{},objectiveClaims:{},objectiveBonuses:{},...initial};
 const ctx={state,SEASON_REWARDS:structuredClone(firstTen),TASKS:[{id:'starter',title:'Starter',desc:'Start',stat:'packs',target:1,reward:{coins:100}}],
  $:element,save(){},renderAll(){},renderHome(){},toast(){},confirm(){return true},activeEventObjectives:()=>[],
  openFooteraPointsOverview(required,source,available){state.topup={required,source,available}},
  fmt:n=>String(n),esc:s=>String(s),rewardText:r=>JSON.stringify(r),setInterval(){},
  grant:r=>{state.coins+=r.coins||0;state.sp+=r.sp||0;if(r.pack)state.packs[r.pack]=(state.packs[r.pack]||0)+(r.qty||1)},
  grantSeasonOnly:r=>{state.coins+=r.coins||0;state.points+=r.points||0;if(r.pack)state.packs[r.pack]=(state.packs[r.pack]||0)+(r.qty||1);if(r.story)state.storyGrants.push(r.story)},
  STORY_PASS_PLAYERS:{'s1-15':{name:'Ermedin Demirović',chapter:'Aufbruch',rating:84},'s1-30':{name:'Kobbie Mainoo',chapter:'Durchbruch',rating:85}},storyPreviewCard:()=>'<div class="card-shell story-shell"></div>',
  claimSeasonRewards(){}
 };
 vm.createContext(ctx);
 // Season 2 went live on 30.10.2026 19:00 Berlin: pin these Season-1 scenarios to a Season-1 clock.
 vm.runInContext(`{const RealDate=Date,fixed=${SEASON1_NOW};class FixedDate extends RealDate{constructor(...a){if(a.length)super(...a);else super(fixed)}static now(){return fixed}}globalThis.Date=FixedDate}`,ctx);
 vm.runInContext(timeSource,ctx,{filename:'footera-time.js'});
 vm.runInContext(source,ctx,{filename:'season-system.js'});
 const api=vm.runInContext('({seasonInfo,seasonLevelSp,objectiveWindow,ensureObjectiveWindows,objectiveProgress,availableObjectiveRewardsCount,availableRotatingObjectiveRewardsCount,availablePassRewardsCount,renderTasks})',ctx);
 return{ctx,state:ctx.state,elements,api,click(id,selector,dataset){
  const handler=element(id).listeners.click;
  assert.ok(handler,`${id} click handler`);
  handler({target:{closest:check=>check===selector?{dataset}:null}})
 }}
}

test('30 reward tiers and rotating day/week/season schedules',()=>{
 const{ctx,api}=setup();
 assert.equal(ctx.SEASON_REWARDS.length,30);
 assert.equal(ctx.SEASON_REWARDS.at(-1).baseSp,26500);
 assert.equal(api.seasonLevelSp(ctx.SEASON_REWARDS.at(-1),'s1'),26500);
 assert.equal(api.seasonLevelSp(ctx.SEASON_REWARDS.at(-1),'s2'),39750);
 assert.equal(api.seasonLevelSp(ctx.SEASON_REWARDS[9],'s2'),20250);
 assert.ok(ctx.SEASON_REWARDS.every(t=>t.reward&&t.premium));
 const seasonBoundary=new Date('2026-10-30T18:00:00Z'),dailyBoundary=new Date('2026-09-23T17:00:00Z');
 assert.equal(api.seasonInfo(new Date(seasonBoundary.getTime()-1000)).number,1);
 assert.equal(api.seasonInfo(seasonBoundary).number,2);
 assert.equal(api.seasonInfo(seasonBoundary).name,'BLUTMOND');
 assert.equal(api.seasonInfo(new Date('2026-12-11T17:59:59Z')).key,'s2');
 assert.equal(api.seasonInfo(new Date('2026-12-11T18:00:00Z')).key,'s3');
 assert.equal(api.seasonInfo(new Date('2026-09-27T12:00:00Z')).name,'THE BEGINNING');
 assert.equal(api.objectiveWindow('daily',new Date(dailyBoundary.getTime()-1000)).end.getTime(),dailyBoundary.getTime());
 assert.equal(api.objectiveWindow('weekly',new Date('2026-09-23T20:00:00Z')).tasks.length,6);
 assert.equal(api.objectiveWindow('season',new Date('2026-09-23T20:00:00Z')).tasks.length,12);
 assert.notDeepEqual(api.objectiveWindow('daily',new Date('2026-09-23T20:00:00Z')).tasks.map(t=>t.id),api.objectiveWindow('daily',new Date('2026-09-24T20:00:00Z')).tasks.map(t=>t.id));
});

test('Season 1 Story players occupy free and Premium levels 15 and 30 and free cards claim once',()=>{
 const app=setup({sp:26500});const{state,ctx}=app;
 const rewards=vm.runInContext('({at15:seasonTierReward(SEASON_REWARDS[14],"free"),at30:seasonTierReward(SEASON_REWARDS[29],"free"),premium:seasonTierReward(SEASON_REWARDS[14],"premium"),nextSeason:seasonTierReward(SEASON_REWARDS[14],"free","s2")})',ctx);
 assert.equal(rewards.at15.story,'s1-15');assert.equal(rewards.at30.story,'s1-30');
 assert.equal(rewards.premium.story,'s1-premium-15');assert.ok(!rewards.nextSeason.story);
 app.click('seasonPass','[data-pass-claim]',{passClaim:'free',passLevel:'15'});
 app.click('seasonPass','[data-pass-claim]',{passClaim:'free',passLevel:'30'});
 app.click('seasonPass','[data-pass-claim]',{passClaim:'free',passLevel:'15'});
 assert.deepEqual(state.storyGrants,['s1-15','s1-30']);
 assert.equal(state.packs['82'],undefined);
});

test('Season 2 places season players on both tracks and swaps in the Halloween pack',()=>{
 const app=setup();const{ctx}=app;
 ctx.STORY_PASS_PLAYERS={...ctx.STORY_PASS_PLAYERS,'s2-5':{season:'s2',track:'free',level:5,name:'Endrick',rating:81},'s2-premium-3':{season:'s2',track:'premium',level:3,name:'Estêvão',rating:82}};
 const r=vm.runInContext('({free5:seasonTierReward(SEASON_REWARDS[4],"free","s2"),free6:seasonTierReward(SEASON_REWARDS[5],"free","s2"),prem3:seasonTierReward(SEASON_REWARDS[2],"premium","s2"),free4:seasonTierReward(SEASON_REWARDS[3],"free","s2"),prem6:seasonTierReward(SEASON_REWARDS[5],"premium","s2"),s1free4:seasonTierReward(SEASON_REWARDS[3],"free","s1"),s3free5:seasonTierReward(SEASON_REWARDS[4],"free","s3")})',ctx);
 assert.deepEqual({...r.free5},{story:'s2-5'});
 assert.ok(!r.free6.story);
 assert.equal(r.prem3.story,'s2-premium-3');
 assert.equal(r.free4.pack,'halloween-pack');assert.equal(r.prem6.pack,'halloween-pack');
 assert.equal(r.s1free4.pack,'gold');assert.ok(!r.s3free5.story);
});

test('progress counts only actions in the active window and resets on rotation',()=>{
 const{state,api}=setup();
 const first=new Date('2026-09-23T20:00:00Z'),next=new Date('2026-09-24T20:00:00Z');
 state.stats.packs=8;
 api.ensureObjectiveWindows(first);
 const pack=api.objectiveWindow('weekly',first).tasks.find(t=>t.stat==='packs');
 if(pack){
  assert.equal(api.objectiveProgress(pack),0);
  state.stats.packs+=3;assert.equal(api.objectiveProgress(pack),Math.min(3,pack.target));
  state.stats.packs+=pack.target;assert.equal(api.objectiveProgress(pack),pack.target);
 }
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

test('unclaimed completed goals and weekly bonus appear once above every category',()=>{
 const app=setup();const{state,api}=app;
 const week=api.objectiveWindow('weekly'),ready=week.tasks.find(t=>t.stat!=='packs');
 state.stats.packs=1;state.stats[ready.stat]+=ready.target;
 api.renderTasks();
 let html=app.elements.get('taskList').innerHTML;
 assert.ok(html.indexOf('Jetzt abholen')<html.indexOf('Foundations</strong>'));
 assert.ok(html.indexOf('Starter</h4>')<html.indexOf('Foundations</strong>'));
 assert.equal(html.split(`data-objective-claim="${ready.key}"`).length-1,1);
 state.claims.starter=true;state.objectiveClaims[ready.key]=true;
 for(const task of week.tasks.slice(0,5))state.objectiveClaims[task.key]=true;
 api.renderTasks();html=app.elements.get('taskList').innerHTML;
 assert.ok(html.indexOf('Wochenmeister')<html.indexOf('Foundations</strong>'));
 assert.equal(html.split(`data-objective-bonus="${week.key}"`).length-1,1);
 state.objectiveBonuses[week.key]=true;api.renderTasks();
 html=app.elements.get('taskList').innerHTML;
 assert.ok(html.indexOf('Wochenmeister')>html.indexOf('Wöchentlich</strong>'));
 assert.ok(!html.includes(`data-objective-bonus="${week.key}"`));
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
 assert.equal(week.tasks.length,6);
 for(const goal of week.tasks.slice(0,4))state.objectiveClaims[goal.key]=true;
 app.click('taskList','[data-objective-bonus]',{objectiveBonus:week.key});
 assert.equal(state.sp,sp);
 assert.equal(state.packs.gold,undefined);
 state.objectiveClaims[week.tasks[4].key]=true;
 app.click('taskList','[data-objective-bonus]',{objectiveBonus:week.key});
 assert.equal(state.sp,sp+750);
 assert.equal(state.packs.gold,1);
 app.click('taskList','[data-objective-bonus]',{objectiveBonus:week.key});
 assert.equal(state.sp,sp+750);
 assert.equal(state.packs.gold,1);
});

test('season change settles earned rewards once and resets premium and SP',()=>{
 const app=setup({coins:1000,sp:500,seasonPass:{key:'s1',premium:true,freeClaims:{1:true},premiumClaims:{}},objectiveWindows:{}});
 const{state,api}=app;
 api.ensureObjectiveWindows(new Date('2026-10-30T18:00:00Z'));
 assert.equal(state.seasonPass.key,'s2');
 assert.equal(state.seasonPass.premium,false);
 assert.equal(state.sp,0);
 assert.equal(state.coins,4000);
 assert.equal(state.packs.gold,2);
 api.ensureObjectiveWindows(new Date('2026-10-30T18:01:00Z'));
 assert.equal(state.coins,4000);
 assert.equal(state.packs.gold,2);
});

test('season rollover honors Story entitlement even when old free tiers were already claimed',()=>{
 const app=setup({sp:26500,seasonPass:{key:'s1',premium:false,freeClaims:{15:true,30:true},premiumClaims:{}},objectiveWindows:{}});
 app.api.ensureObjectiveWindows(new Date('2026-10-30T18:00:00Z'));
 assert.deepEqual(app.state.storyGrants,['s1-15','s1-30']);
 app.api.ensureObjectiveWindows(new Date('2026-10-30T18:01:00Z'));
 assert.equal(app.state.storyGrants.length,2);
});

test('Berlin week boundaries retain 09:00 wall time through winter and summer time',()=>{
 const {ctx,api}=setup();
 const before=ctx.berlinWeekStart(new Date('2026-10-26T07:59:59Z'),1,9);
 const after=ctx.berlinWeekStart(new Date('2026-10-26T08:00:00Z'),1,9);
 assert.equal(before.toISOString(),'2026-10-19T07:00:00.000Z');
 assert.equal(after.toISOString(),'2026-10-26T08:00:00.000Z');
 assert.equal(ctx.berlinWeekStart(new Date('2027-03-29T07:00:00Z'),1,9).toISOString(),'2027-03-29T07:00:00.000Z');
 assert.equal(api.seasonInfo(new Date('2026-10-30T17:59:59Z')).key,'s1');
 assert.equal(api.seasonInfo(new Date('2026-10-30T18:00:00Z')).key,'s2');
 assert.equal(ctx.seasonCountdown(new Date('2026-10-30T18:00:00Z'),new Date('2026-10-30T09:36:00Z')),'Endet in 8 Std. 24 Min.');
});

test('not enough premium-pass Points opens the Points overview instead of silently disabling the purchase',()=>{
 const app=setup({points:40,coins:60000});
 app.api.ensureObjectiveWindows();
 app.click('seasonPass','[data-pass-buy]',{passBuy:'points'});
 assert.equal(app.state.topup.required,500);
 assert.equal(app.state.topup.available,40);
 assert.equal(app.state.topup.source,'Premium Season Pass');
 assert.equal(app.state.points,40);
 assert.equal(app.state.seasonPass.premium,false);
});

test('"Alle abholen" claims every ready reward plus the weekly bonus exactly once',()=>{
 const app=setup();const{state,api}=app;
 for(const key of Object.keys(state.stats))state.stats[key]+=1000;
 api.renderTasks();
 assert.match(app.elements.get('taskList').innerHTML,/data-objective-claim-all/);
 const windows=['daily','weekly','season'].map(group=>api.objectiveWindow(group)),week=windows[1];
 const ready=windows.flatMap(w=>w.tasks).filter(t=>api.objectiveProgress(t)>=t.target);
 assert.ok(week.tasks.filter(t=>api.objectiveProgress(t)>=t.target).length>=5,'weekly bonus becomes reachable');
 app.click('taskList','[data-objective-claim-all]',{});
 assert.equal(state.claims.starter,true);
 for(const task of ready)assert.equal(state.objectiveClaims[task.key],true,task.key);
 assert.equal(state.objectiveBonuses[week.key],true);
 const after={coins:state.coins,sp:state.sp,packs:JSON.stringify(state.packs)};
 app.click('taskList','[data-objective-claim-all]',{});
 assert.deepEqual({coins:state.coins,sp:state.sp,packs:JSON.stringify(state.packs)},after);
 assert.equal(api.availableRotatingObjectiveRewardsCount(),0);
});
