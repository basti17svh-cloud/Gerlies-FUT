const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../friend-online.js'),'utf8');
function app(){
 const calls=[],duels=[],games=[],nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{contains:()=>true},innerHTML:'',textContent:''});return nodes.get(id)};
 const c={calls,online:{ready:true,registered:true,userId:'me'},navigator:{onLine:true},document:{visibilityState:'visible'},window:{},console:{warn(){}},presenceRows:new Map(),reconnectBusy:false,connectionError:'',comparisonRequest:0,comparisonSyncKey:'',comparing:'friend',comparison:{friend:{onlineUid:'friend',clubName:'Friend'},rows:[],loading:false},rows:[],rowsLoaded:false,active:null,duelStatus:new Map(),notified:new Set(),chatFriend:null,
  currentView:()=> 'socialView',validUid:v=>!!v,errorText:e=>e.message,render(){calls.push('render')},renderComparison(){calls.push('ranking')},applyMatch(d){c.active=d;calls.push('match')},showIncomingInvite(){calls.push('invite')},
  loadUnreadCounts:async()=>calls.push('unread'),heartbeat:async()=>calls.push('heartbeat'),refreshPresence:async()=>calls.push('presence'),loadConversation:async()=>calls.push('chat'),$:node,toast(){},
  client:{from(){let kind;const q={select(s){kind=s==='*'?'duels':'ranking';return q},eq(){return q},in(){return q},order(){return q},limit:async()=>duels.shift()||{data:[]},range:async()=>games.shift()||{data:[]}};return q}}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf(' async function refresh(){'),source.indexOf(' function clearOnlineGoalMoment(){')),c);
 vm.runInContext(source.slice(source.indexOf(' async function showComparison('),source.indexOf(' function renderComparison(')),c);
 return {c,calls,duels,games,node};
}
test('a finished duel refreshes an open ranking once and repeated events do not duplicate its result',async()=>{
 const {c,duels,games}=app(),match={id:'one',home_user:'me',away_user:'friend',status:'finished',home_score:2,away_score:1};
 duels.push({data:[match]});games.push({data:[match]});await c.refresh();assert.equal(c.comparison.rows.length,1);assert.equal(c.comparison.rows[0].id,'one');
 const request=c.comparisonRequest;duels.push({data:[match]});await c.refresh();assert.equal(c.comparisonRequest,request);assert.equal(c.comparison.rows.length,1);
});
test('an old ranking response cannot replace a more recently selected friend',async()=>{
 const {c,games}=app();let finish;games.push(new Promise(r=>finish=r));const old=c.showComparison({onlineUid:'old'});
 games.push({data:[{id:'new-result'}]});await c.showComparison({onlineUid:'new'});finish({data:[{id:'old-result'}]});await old;
 assert.equal(c.comparison.friend.onlineUid,'new');assert.equal(c.comparison.rows[0].id,'new-result');
});
test('an older failed ranking request cannot erase a newer successful response',async()=>{
 const {c,games}=app();let finish;games.push(new Promise(r=>finish=r));const old=c.showComparison({onlineUid:'old'});
 games.push({data:[{id:'new-result'}]});await c.showComparison({onlineUid:'new'});finish({error:Error('stale failure')});await old;
 assert.equal(c.comparison.rows[0].id,'new-result');assert.equal(c.comparison.error,undefined);
});
test('a result repeated across paginated responses counts once when new matches shift the page boundary',async()=>{
 const {c,games}=app();const first=Array.from({length:500},(_,i)=>({id:'game-'+i}));
 games.push({data:first},{data:[first[499],{id:'last-game'}]});await c.showComparison({onlineUid:'friend'});
 assert.equal(c.comparison.rows.length,501);assert.equal(c.comparison.rows.filter(g=>g.id==='game-499').length,1);
});
test('reconnect reloads the active duel, unread counts, chat and complete ranking',async()=>{
 const {c,calls,duels,games}=app();c.active={id:'live'};c.chatFriend={onlineUid:'friend'};duels.push({data:[{id:'live',status:'live',minute:70}]});games.push({data:[]},{data:[{id:'older-finished'}]});
 await c.recoverOnline();assert.equal(c.active.minute,70);for(const kind of ['match','unread','heartbeat','presence','chat','ranking'])assert.ok(calls.includes(kind),kind);assert.equal(c.comparison.rows[0].id,'older-finished');assert.equal(c.reconnectBusy,false);
});
test('failed refresh clears stale online presence and a later recovery clears its error',async()=>{
 const {c,duels}=app();c.presenceRows.set('friend',{});duels.push({error:Error('Network unavailable')});await c.recoverOnline();assert.equal(c.connectionError,'Network unavailable');assert.equal(c.presenceRows.size,0);
 duels.push({data:[]});await c.recoverOnline();assert.equal(c.connectionError,'');
});
test('offline or hidden sessions do not start a reconnect and concurrent recoveries coalesce',async()=>{
 const {c,calls,duels}=app();c.navigator.onLine=false;await c.recoverOnline();assert.equal(calls.length,0);c.navigator.onLine=true;c.document.visibilityState='hidden';await c.recoverOnline();assert.equal(calls.length,0);c.document.visibilityState='visible';
 let finish;duels.push(new Promise(r=>finish=r));const first=c.recoverOnline();await c.recoverOnline();finish({data:[]});await first;assert.equal(calls.filter(x=>x==='unread').length,1);
});
test('reconnected chats show the latest 120 messages in chronological order and reject a stale chat response',async()=>{
 const {c}=app();let order;const data=[{id:'newest'},{id:'older'}];c.online.userId='me';c.chatFriend={onlineUid:'friend'};c.renderChat=()=>{};c.markConversationRead=async()=>{};c.chatMessages=[];
 c.client={from(){const q={select:()=>q,or:()=>q,order:(key,opts)=>{order=opts;return q},limit:async()=>({data})};return q}};
 vm.runInContext(source.slice(source.indexOf(' async function loadConversation('),source.indexOf(' function renderChat(')),c);
 await c.loadConversation({onlineUid:'friend'});assert.equal(order.ascending,false);assert.deepEqual(Array.from(c.chatMessages,m=>m.id),['older','newest']);
 c.chatFriend={onlineUid:'other'};c.chatMessages=[];await c.loadConversation({onlineUid:'friend'});assert.equal(c.chatMessages.length,0);
});
