const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
function setup(){
 const elements=new Map(),panels=['rivals','squad','friendly-random','friendly-friend'].map(mode=>({dataset:{playPanel:mode},hidden:true}));
 const el=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,focus(){}});return elements.get(id)};
 const fixed=Date.parse('2026-10-04T19:00:00Z');
 class ClockDate extends Date{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}
 const state={coins:100,packs:{},rivals:{division:5,step:3,checkpoint:3,streak:2,weeklyPoints:15},squadBattle:{points:6173,played:7,playedIds:[]},stats:{rivalsMatches:12,rivalsWins:8,squadMatches:7,squadWins:5,friendlies:3,friendlyWins:3},friends:[],weeklyRewards:[],clubMatchHistory:[{mode:'rivals',result:'win',gf:2,ga:1,opponent:'Test'},{mode:'squad',result:'loss',gf:0,ga:2},{mode:'friendly',result:'win',gf:3,ga:0}]};
 const history=[];
 const ctx={Date:ClockDate,Intl,state,PACKS:[{id:'82',name:'82+ Spieler-Pack'},{id:'primegold',name:'Prime Goldspieler-Pack'}],$:el,fmt:String,esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),save(){},renderAll(){},renderPlay(){},renderCompetitionModeStatus(){},seasonCountdown:()=> 'Reset in 1 Tag',seasonInfo:()=>({}),currentViewId:()=> 'playView',updateObjectiveIndicators(){},setInterval(){},window:{scrollTo(){},FooteraOnline:{showComparison(){}}},document:{addEventListener(){},querySelectorAll:()=>panels,querySelector(){return null}},history:{state:{}},pushUiState:(kind,extra)=>history.push({kind,...extra}),module:{exports:{}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'footera-time.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'competition-system.js'),'utf8'),ctx);
 state.squadBattle.points=6173;state.squadBattle.played=7;state.rivals.weeklyPoints=15;
 vm.runInContext(fs.readFileSync(path.join(root,'play-hub.js'),'utf8'),ctx);
 return{state,ctx,el,panels,history,api:ctx.module.exports};
}
test('mode cards show the current division, BP and progress without changing saved competition data',()=>{
 const s=setup(),before=JSON.stringify(s.state);s.api.renderOverview();
 assert.match(s.el('playRivalsSummary').innerHTML,/Division 5/);
 assert.match(s.el('rvRecord').innerHTML,/Stufe 3 \/ 5/);
 assert.match(s.el('rvWeeklyCard').innerHTML,/15 \/ 15 Punkte/);
 assert.match(s.el('rvWeeklyCard').innerHTML,/Noch 20 Punkte/);
 assert.match(s.el('sbRecord').innerHTML,/Silber 1/);assert.match(s.el('sbRecord').innerHTML,/Noch 1827 BP/);
 assert.match(s.el('playSquadSummary').innerHTML,/7 \/ 14/);
 assert.equal(JSON.stringify(s.state),before);
});
test('elite and completed SB weeks retain valid ranks, capped progress and pending reward buttons',()=>{
 const s=setup();Object.assign(s.state.rivals,{division:0,skill:650,weeklyPoints:42});Object.assign(s.state.squadBattle,{points:24000,played:14});
 s.state.weeklyRewards.push({mode:'squad',week:'previous',claimed:false,reward:{coins:25000,packs:[]}});
 s.api.renderOverview();
 assert.match(s.el('rvRecord').innerHTML,/650 Skill-Rating/);assert.doesNotMatch(s.el('rvRecord').innerHTML,/undefined|NaN/);
 assert.match(s.el('rvWeeklyCard').innerHTML,/35 \/ 35 Punkte/);
 assert.match(s.el('sbRecord').innerHTML,/Höchster Rang erreicht/);
 assert.match(s.el('sbRecord').innerHTML,/Weitere Partien bringen keine Battle-Punkte/);
 assert.match(s.el('sbWeeklyCard').innerHTML,/data-claim-competition="squad" data-competition-week="previous"/);
});
test('stats isolate competitive modes and label shared friendly history',()=>{
 const s=setup();assert.equal(s.api.statsFor('rivals').goals,2);assert.equal(s.api.statsFor('squad').conceded,2);
 assert.equal(s.api.statsFor('friendly-friend').matches,3);
 assert.match(s.api.statsHTML('friendly-random'),/gemeinsam gezählt/);
 s.state.clubMatchHistory[0].opponent='<script>alert(1)</script>';
 assert.doesNotMatch(s.api.statsHTML('rivals'),/<script>/);
});
test('friend ranking stays unavailable without a selected online friend',()=>{
 const s=setup();s.state.friends=[{clubName:'Friend',onlineUid:'online-id'}];s.api.renderOverview();assert.equal(s.el('playFriendRanking').disabled,true);
 s.el('friendlyFriendSelect').value='0';s.api.renderOverview();assert.equal(s.el('playFriendRanking').disabled,false);
 delete s.state.friends[0].onlineUid;s.api.renderOverview();assert.equal(s.el('playFriendRanking').disabled,true);
});
test('mode navigation shows exactly one panel and supports Android back and history restoration',()=>{
 const s=setup();s.api.show('squad');assert.equal(s.el('playModeHub').hidden,true);assert.deepEqual(s.panels.filter(x=>!x.hidden).map(x=>x.dataset.playPanel),['squad']);
 assert.equal(s.history[0].playMode,'squad');s.ctx.window.FooteraPlayHub.handleBack({gfut:true,view:'playView'});
 assert.equal(s.el('playModeHub').hidden,false);assert.ok(s.panels.every(x=>x.hidden));
 s.ctx.window.FooteraPlayHub.restore({view:'playView',playMode:'rivals'});assert.equal(s.panels[0].hidden,false);
 s.api.show('unknown');assert.equal(s.el('playModeDetail').hidden,true);
});
