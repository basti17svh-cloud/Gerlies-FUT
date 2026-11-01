'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const time=read('footera-time.js'),competitions=read('competition-system.js'),league=read('rivals-league.js');
const ME='00000000-0000-4000-8000-00000000a001',F1='00000000-0000-4000-8000-00000000a002',F2='00000000-0000-4000-8000-00000000a003';

function setup({now='2026-11-04T12:00:00Z',friends=[],rpc=null,ready=true}={}){
 let fixed=new Date(now).getTime();
 class ClockDate extends Date{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}
 const state={coins:0,packs:{},rivals:{division:10,points:0},profile:{clubName:'FC Test'},friends:friends.map(uid=>({onlineUid:uid,clubName:'Freund'})),weeklyRewards:[]};
 const calls=[];
 const client={rpc:async(name,args)=>{calls.push({name,args});return rpc?rpc(name,args):{data:[],error:null}}};
 const ctx={Date:ClockDate,Intl,Math,Map,Set,Number,String,Object,Array,JSON,Promise,console,state,PACKS:[{id:'gold',name:'Gold-Pack'},{id:'goldplayers',name:'Premium-Goldspieler-Pack'}],
  $:()=>({textContent:'',innerHTML:''}),save(){},flushSave(){},renderAll(){},currentViewId:()=>'',toast(){},renderPlay(){},
  document:{addEventListener(){},getElementById:()=>null,visibilityState:'visible'},setInterval(){},setTimeout(){},
  fmt:n=>String(n),esc:String,seasonCountdown:()=>'',seasonInfo:()=>({number:1,name:'X'}),passDate:()=>'',
  window:{FooteraOnline:{ready,userId:ME,authClient:async()=>client}}};
 vm.createContext(ctx);vm.runInContext(time,ctx);vm.runInContext(competitions,ctx);vm.runInContext(league,ctx);
 const api=ctx.window.FooteraRivalsLeague;
 return{ctx,state,api,calls,setNow:iso=>{fixed=new Date(iso).getTime()},recordMatch:(result,home,away)=>vm.runInContext('recordCompetitionMatch',ctx)('rivals',result,home,away,{},'pro'),claim:(mode,week)=>vm.runInContext('claimCompetitionReward',ctx)(mode,week)};
}

test('league week runs Sunday 19:00 to Sunday 19:00 Berlin, including the clock changes',()=>{
 const {api}=setup();
 assert.equal(api.leagueWindow(new Date('2026-11-01T17:59:59Z')).start.toISOString(),'2026-10-25T18:00:00.000Z');
 assert.equal(api.leagueWindow(new Date('2026-11-01T18:00:00Z')).start.toISOString(),'2026-11-01T18:00:00.000Z');
 assert.equal(api.leagueWindow(new Date('2026-11-01T18:00:00Z')).end.toISOString(),'2026-11-08T18:00:00.000Z');
 // 25 Oct 2026 is the switch to winter time: 19:00 CEST before, 19:00 CET after.
 assert.equal(api.leagueWindow(new Date('2026-10-25T17:59:00Z')).start.toISOString(),'2026-10-18T17:00:00.000Z');
 assert.equal(api.leagueWindow(new Date('2027-03-28T17:00:00Z')).start.toISOString(),'2027-03-28T17:00:00.000Z');
});

test('every Rivals match counts with goals; other modes and the Rivals ladder stay unchanged',()=>{
 const {state,api,recordMatch}=setup();
 const snap=recordMatch('win',3,1);recordMatch('draw',2,2);recordMatch('loss',0,1);
 assert.equal(snap.mode,'rivals');assert.equal(snap.earned,3);assert.equal(state.rivals.weeklyPoints,4);
 const key=api.leagueWindow().key,w=state.rivalsLeague.weeks[key];
 assert.deepEqual({wins:w.wins,draws:w.draws,losses:w.losses,gf:w.gf,ga:w.ga},{wins:1,draws:1,losses:1,gf:5,ga:4});
});

test('standings sort by points, goal difference, goals, and need 3 games and 2 players for a place',()=>{
 const {api,state}=setup({friends:[F1,F2]});
 const key=api.leagueWindow().key;
 state.rivalsLeague={weeks:{[key]:{wins:3,draws:0,losses:1,gf:9,ga:4,reported:4}}};
 const rows=[{user_id:F1,club_name:'Rivale A',points:9,wins:3,draws:0,losses:0,goals_for:6,goals_against:1},{user_id:F2,club_name:'Rivale B',points:12,wins:4,draws:0,losses:0,goals_for:8,goals_against:2}];
 const board=api.boardRows(key,rows);
 assert.deepEqual(board.map(r=>r.club),['Rivale B','FC Test','Rivale A']);
 assert.equal(api.finalPlace(key,rows).place,2);assert.equal(api.finalPlace(key,rows).players,3);
 // Strangers from the server list are ignored; only saved friends count.
 assert.equal(api.boardRows(key,[...rows,{user_id:'00000000-0000-4000-8000-00000000ffff',club_name:'Fremd',points:99,wins:33,draws:0,losses:0,goals_for:99,goals_against:0}]).length,3);
 // Alone in the league = participation reward, too few games = no reward.
 assert.equal(api.finalPlace(key,[]).place,0);
 state.rivalsLeague.weeks[key]={wins:2,draws:0,losses:0,gf:2,ga:0};
 assert.equal(api.finalPlace(key,rows),null);
});

test('Sunday evaluation waits for the grace period and a closed server board, then pays exactly once',async()=>{
 let closed=false;
 const rows=()=>[{user_id:F1,club_name:'Rivale A',points:3,wins:1,draws:0,losses:2,goals_for:2,goals_against:4,closed},{user_id:ME,club_name:'FC Test',points:9,wins:3,draws:0,losses:0,goals_for:5,goals_against:1,closed}];
 const t=setup({now:'2026-11-04T12:00:00Z',friends:[F1],rpc:(name)=>name==='footera_rivals_league_board'?{data:rows(),error:null}:{data:{},error:null}});
 t.recordMatch('win',2,0);t.recordMatch('win',2,1);t.recordMatch('win',1,0);
 const key=t.api.leagueWindow().key;
 t.setNow('2026-11-08T18:05:00Z');
 assert.equal(await t.api.finalize(true),false,'still inside grace');
 t.setNow('2026-11-08T18:11:00Z');
 assert.equal(await t.api.finalize(true),false,'server board not closed yet');
 closed=true;
 assert.equal(await t.api.finalize(true),true);
 assert.equal(await t.api.finalize(true),false);
 const pending=t.state.weeklyRewards.filter(r=>r.mode==='league');
 assert.equal(pending.length,1);assert.equal(pending[0].week,key);assert.equal(pending[0].place,1);assert.equal(pending[0].players,2);
 assert.equal(pending[0].reward.coins,12000);assert.deepEqual([...pending[0].reward.packs.map(p=>p.id)],['reward-84-1']);
 assert.deepEqual([...pending[0].reward.playerPicks],[]);
 assert.equal(t.claim('league',key),true);assert.equal(t.claim('league',key),false);
 assert.equal(t.state.coins,12000);assert.equal(t.state.packs['reward-84-1'],1);assert.equal(t.state.rewardPackQueue.length,1);
 assert.ok(t.ctx.PACKS.some(p=>p.id==='reward-84-1'),'reward pack exists after reload');
 // Finished week is pruned, the reward row stays as the receipt.
 assert.equal(t.state.rivalsLeague.weeks[key],undefined);
});

test('a failing server never invents a place; without friends the week is evaluated locally',async()=>{
 const failing=setup({friends:[F1],rpc:()=>({data:null,error:{message:'down'}})});
 failing.recordMatch('win',1,0);failing.recordMatch('win',1,0);failing.recordMatch('loss',0,1);
 failing.setNow('2026-11-08T19:00:00Z');
 assert.equal(await failing.api.finalize(true),false);assert.equal(failing.state.weeklyRewards.length,0);
 const offline=setup({friends:[F1],ready:false});
 offline.recordMatch('win',1,0);offline.recordMatch('win',1,0);offline.recordMatch('loss',0,1);
 offline.setNow('2026-11-08T19:00:00Z');
 assert.equal(await offline.api.finalize(true),false);
 const alone=setup({friends:[]});
 alone.recordMatch('draw',1,1);alone.recordMatch('draw',0,0);alone.recordMatch('loss',0,1);
 alone.setNow('2026-11-08T19:00:00Z');
 assert.equal(await alone.api.finalize(true),true);
 const row=alone.state.weeklyRewards[0];assert.equal(row.place,0);assert.equal(row.reward.coins,2000);assert.equal(row.points,2);
 assert.equal(alone.calls.length,0,'no network needed without online friends');
});

test('reports send the full week and are not repeated once confirmed',async()=>{
 const t=setup({friends:[F1]});
 t.recordMatch('win',4,2);
 await t.api.report();await t.api.report();
 const reports=t.calls.filter(c=>c.name==='footera_rivals_league_report');
 assert.equal(reports.length,1);
 assert.deepEqual({...reports[0].args},{p_week:Number(t.api.leagueWindow().key),p_club:'FC Test',p_wins:1,p_draws:0,p_losses:0,p_goals_for:4,p_goals_against:2});
});

test('page wiring: script after friends hub, panels, reward centre and cache entries',()=>{
 const html=read('index.html'),sw=read('service-worker.js'),rewards=read('weekly-rewards.js');
 assert.ok(html.indexOf('rivals-league.js?v=21333')>html.indexOf('friends-hub.js'));
 assert.match(html,/id="rvLeague"/);assert.match(html,/id="friendsLeague"/);
 assert.match(sw,/"\.\/rivals-league\.js\?v=21333"/);assert.match(sw,/"\.\/rivals-league\.css\?v=21333"/);
 assert.match(sw,/"\.\/weekly-rewards\.js\?v=21333"/);assert.match(html,/weekly-rewards\.js\?v=21333/);
 assert.match(sw,/"\.\/competition-system\.js\?v=21333"/);assert.match(html,/competition-system\.js\?v=21333/);
 assert.match(rewards,/league:"Rivals-Freundesliga"/);
 assert.match(read('online/footera-rivals-league-v21.333.sql'),/footera_rivals_league_board/);
});
