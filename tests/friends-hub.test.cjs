const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const hub=fs.readFileSync(path.join(__dirname,'../friends-hub.js'),'utf8');
const online=fs.readFileSync(path.join(__dirname,'../friend-online.js'),'utf8');
const helpers=online.slice(online.indexOf(' function presence(uid)'),online.indexOf(' function ensureCommsUi()'));
function context(overrides={}){
 const ctx={available:true,online:{ready:true,registered:true,userId:'me'},presenceRows:new Map(),document:{visibilityState:'visible'},navigator:{onLine:true},performance:{now:()=>1000},state:{friends:[]},rows:[],rowsLoaded:true,presenceBusy:false,presenceKey:'',presenceLastAttempt:-Infinity,validUid:v=>!!v,currentView:()=>'',window:{},console:{warn(){}},client:{rpc:async()=>({data:[]})},...overrides};
 vm.createContext(ctx);vm.runInContext(helpers,ctx);return ctx;
}
test('online friends sort first while actions retain their original saved index',()=>{
 const ctx={};vm.createContext(ctx);vm.runInContext(hub.slice(hub.indexOf(' function orderedFriends'),hub.indexOf(' function friendHTML')),ctx);
 const friends=[{onlineUid:'offline'},{onlineUid:'active'},{onlineUid:'other'},{clubName:'Legacy'}];
 const result=ctx.orderedFriends(friends,uid=>uid==='active'?'online':uid?'offline':'unknown');
 assert.deepEqual(Array.from(result,x=>x.index),[1,0,2,3]);assert.equal(result[0].friend,friends[1]);
});
test('presence expires, unknown data stays unknown, and hidden or disconnected apps show no green badge',()=>{
 let now=1000;const ctx=context({performance:{now:()=>now}});
 ctx.presenceRows.set('friend',{isOnline:true,checkedAt:1000,expiresAt:2000});assert.equal(ctx.presence('friend'),'online');
 now=2000;assert.equal(ctx.presence('friend'),'offline');now=47000;assert.equal(ctx.presence('friend'),'unknown');
 now=1000;ctx.presenceRows.set('legacy',{isOnline:null,checkedAt:1000,expiresAt:2000});assert.equal(ctx.presence('legacy'),'unknown');
 ctx.document.visibilityState='hidden';assert.equal(ctx.presence('friend'),'unknown');ctx.document.visibilityState='visible';ctx.navigator.onLine=false;assert.equal(ctx.presence('friend'),'unknown');
});
test('a failed status request clears cached presence without failing the page',async()=>{
 const ctx=context({state:{friends:[{onlineUid:'friend'}]},client:{rpc:async()=>({error:new Error('Unavailable')})}});
 ctx.presenceRows.set('friend',{isOnline:true,checkedAt:1000,expiresAt:90000});await ctx.refreshPresence();assert.equal(ctx.presence('friend'),'unknown');assert.equal(ctx.presenceBusy,false);
});
test('heartbeat runs only with a registered profile in the visible app',async()=>{
 let calls=0;const ctx=context({client:{rpc:async()=>{calls++;return{}}}});
 await ctx.heartbeat();ctx.document.visibilityState='hidden';await ctx.heartbeat();ctx.document.visibilityState='visible';ctx.online.registered=false;await ctx.heartbeat();assert.equal(calls,1);
});
test('live statistics include finished duels against saved friends in both directions',()=>{
 const ctx=context({state:{friends:[{onlineUid:'friend'}]},rows:[
  {status:'finished',home_user:'me',away_user:'friend',home_score:3,away_score:1},
  {status:'finished',home_user:'friend',away_user:'me',home_score:2,away_score:2},
  {status:'finished',home_user:'friend',away_user:'me',home_score:2,away_score:0},
  {status:'invited',home_user:'me',away_user:'friend',home_score:5,away_score:0},
  {status:'finished',home_user:'me',away_user:'stranger',home_score:9,away_score:0}
 ]});
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.duelStats())),{matches:3,wins:1,draws:1,losses:1,goals:5,conceded:5});
});

function navigation(){
 const nodes=new Map(),events=new Map(),history=[];
 const panels=['duels','add','code'].map(area=>({dataset:{friendsPanel:area},hidden:true}));
 const el=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,querySelectorAll:()=>[],contains:()=>false,addEventListener:(name,fn)=>events.set(id+':'+name,fn),focus(){ctx.document.activeElement=this}});return nodes.get(id)};
 const ctx={state:{friends:[]},$:el,esc:String,renderSocial(){},pushUiState:(kind,data)=>history.push({gfut:true,kind,...data}),replaceUiState(){},history:{state:null,back(){}},window:{scrollTo(){}},document:{activeElement:null,querySelectorAll:()=>panels,querySelector:selector=>el(selector)}};
 // Filters and panels have different selectors in the real DOM.
 ctx.document.querySelectorAll=selector=>selector==='[data-friends-panel]'?panels:[];
 vm.createContext(ctx);vm.runInContext(hub,ctx);return{ctx,el,panels,history,api:ctx.window.FooteraFriendsHub};
}
test('each friends tile opens one screen; background refresh retains it without duplicate history',()=>{
 const n=navigation();assert.equal(n.el('friendsHub').hidden,false);assert.ok(n.panels.every(p=>p.hidden));
 for(const area of ['duels','add','code']){
  n.api.open(area);assert.equal(n.el('friendsHub').hidden,true);assert.equal(n.el('friendsDetail').hidden,false);
  assert.deepEqual(n.panels.filter(p=>!p.hidden).map(p=>p.dataset.friendsPanel),[area]);
  const count=n.history.length;n.api.open(area);n.ctx.renderSocial();assert.equal(n.history.length,count);assert.equal(n.el('friendsHub').hidden,true);
 }
});
test('friends navigation supports Android back, forward restoration and leaving for another view',()=>{
 const n=navigation();n.api.open('add');assert.equal(n.history[0].friendsArea,'add');
 assert.equal(n.api.handleBack({gfut:true,view:'socialView'}),true);assert.equal(n.el('friendsHub').hidden,false);assert.ok(n.panels.every(p=>p.hidden));
 n.api.restore({gfut:true,view:'socialView',friendsArea:'add'});assert.equal(n.panels[1].hidden,false);
 assert.equal(n.api.handleBack({gfut:true,view:'homeView'}),false);n.ctx.renderSocial();assert.equal(n.el('friendsHub').hidden,false);
 n.api.restore({view:'socialView',friendsArea:'missing'});assert.equal(n.el('friendsDetail').hidden,true);
});
