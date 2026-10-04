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
