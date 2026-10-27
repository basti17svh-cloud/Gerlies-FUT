const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync(require('node:path').join(__dirname,'../player-picks.js'),'utf8');
function setup(){
 const calls=[],box={hidden:true},copy={textContent:''},count={textContent:''},host={innerHTML:''};let fail=false,list=[],listFail=false,localOwner='owner';
 const user={id:'owner',email_confirmed_at:'2026-10-01'};
 const window={FooteraAccount:{getClient:async()=>({auth:{getSession:async()=>({data:{session:{user}}})},rpc:async()=>{calls.push('list');if(listFail)throw Error('list unavailable');return{data:list,error:null}}}),pendingPlayerPick:()=>null,
 syncPlayerPickRewards:async()=>{calls.push('sync');if(fail)throw Error('cloud conflict')}}};
 const state={onboarded:true,profile:{saveId:'club'},weeklyRewards:[{mode:'champions',week:'1792774800000',wins:11,claimed:true,reward:{playerPicks:[{},{}]}}]};
 const ctx={window,state,localStorage:{getItem:()=>localOwner},document:{readyState:'loading',addEventListener(){},getElementById:id=>({playerPicks:host,homePlayerPickNotice:box,homePlayerPickCopy:copy,homePlayerPickCount:count}[id]||null)},setTimeout,clearTimeout,esc:String,renderAll(){},toast(){}};
 vm.runInNewContext(src,ctx);return{calls,state,window,host,box,copy,count,setFail:x=>{fail=x},setRows:x=>{list=x},setListFail:x=>{listFail=x},setOwner:x=>{localOwner=x}};
}
test('new claimed rewards sync before listing and confirmed retries only list',async()=>{
 const t=setup();await t.window.FooteraPlayerPicks.refresh(true);assert.deepEqual(t.calls,['sync','list']);
 await t.window.FooteraPlayerPicks.refresh(true);assert.deepEqual(t.calls,['sync','list','list']);
 t.state.weeklyRewards.push({...t.state.weeklyRewards[0],week:'1792170000000'});
 await t.window.FooteraPlayerPicks.refresh(true);assert.deepEqual(t.calls,['sync','list','list','sync','list']);
});
test('failed reward sync is visible, does not list stale cloud and retries successfully',async()=>{
 const t=setup();t.setFail(true);await t.window.FooteraPlayerPicks.refresh(true);
 assert.deepEqual(t.calls,['sync']);assert.equal(t.box.hidden,true);assert.equal(t.count.textContent,'0');assert.match(t.host.innerHTML,/cloud conflict/);
 t.setFail(false);await t.window.FooteraPlayerPicks.refresh(true);
 assert.deepEqual(t.calls,['sync','sync','list']);assert.equal(t.box.hidden,true);
});
test('old reward receipts and an in-flight sync never announce an outstanding Pick',async()=>{
 const t=setup();let release,started;
 const begun=new Promise(resolve=>{started=resolve});
 t.window.FooteraAccount.syncPlayerPickRewards=()=>{started();return new Promise(resolve=>{release=resolve})};
 const refreshing=t.window.FooteraPlayerPicks.refresh(true);await begun;
 assert.equal(t.box.hidden,true);assert.equal(t.count.textContent,'0');
 assert.match(t.host.innerHTML,/werden mit dem Konto abgeglichen/);
 release();await refreshing;
 assert.equal(t.box.hidden,true);assert.equal(t.count.textContent,'0');
});
test('only actual available Picks count; locally delivered Picks and an empty server list disappear',async()=>{
 const t=setup();t.setRows([{id:'pick-a'},{id:'pick-b'}]);
 await t.window.FooteraPlayerPicks.refresh(true);
 assert.equal(t.box.hidden,false);assert.equal(t.count.textContent,'2');
 assert.match(t.copy.textContent,/2 Player Picks/);
 t.state.playerPickClaims={'pick-a':'option-a'};
 await t.window.FooteraPlayerPicks.refresh(true);
 assert.equal(t.count.textContent,'1');assert.doesNotMatch(t.host.innerHTML,/data-pick-open="pick-a"/);
 t.state.playerPickClaims['pick-b']='option-b';
 await t.window.FooteraPlayerPicks.refresh(true);
 assert.equal(t.box.hidden,true);assert.equal(t.count.textContent,'0');
 t.setRows([]);await t.window.FooteraPlayerPicks.refresh(true);
 assert.equal(t.box.hidden,true);assert.equal(t.count.textContent,'0');
});
test('a failed refresh clears the stale count while the Store keeps the connection error visible',async()=>{
 const t=setup();t.setRows([{id:'pick-a'}]);await t.window.FooteraPlayerPicks.refresh(true);
 assert.equal(t.count.textContent,'1');assert.equal(t.box.hidden,false);
 t.setListFail(true);await t.window.FooteraPlayerPicks.refresh(true);
 assert.equal(t.box.hidden,true);assert.equal(t.count.textContent,'0');assert.match(t.host.innerHTML,/list unavailable/);
 t.setListFail(false);t.setRows([]);await t.window.FooteraPlayerPicks.refresh(true);
 assert.equal(t.box.hidden,true);assert.doesNotMatch(t.host.innerHTML,/list unavailable/);
});
test('a club switch hides the previous club count before the next server reply arrives',async()=>{
 const t=setup();t.setRows([{id:'pick-a'}]);await t.window.FooteraPlayerPicks.refresh(true);
 let release,started;const begun=new Promise(resolve=>{started=resolve});
 const previous=t.window.FooteraAccount.getClient;
 t.window.FooteraAccount.getClient=async()=>{started();await new Promise(resolve=>{release=resolve});return previous()};
 t.state.profile.saveId='other-club';
 const refreshing=t.window.FooteraPlayerPicks.refresh(true);await begun;
 assert.equal(t.box.hidden,true);assert.equal(t.count.textContent,'0');
 t.setRows([]);release();await refreshing;assert.equal(t.box.hidden,true);
});
test('an account switch or malformed list cannot retain an old available count',async()=>{
 const t=setup();t.setRows([{id:'pick-a'}]);await t.window.FooteraPlayerPicks.refresh(true);
 t.setOwner('other-owner');await t.window.FooteraPlayerPicks.refresh(true);
 assert.equal(t.box.hidden,true);assert.equal(t.count.textContent,'0');
 t.setOwner('owner');t.setRows({});await t.window.FooteraPlayerPicks.refresh(true);
 assert.equal(t.box.hidden,true);assert.equal(t.count.textContent,'0');assert.match(t.host.innerHTML,/nicht geprüft/);
});
test('refresh automatically resumes the saved accepted choice without requiring a full cloud sync',async()=>{
 const t=setup();let pending={userId:'owner',saveId:'club',pickId:'pick-a',optionId:'option-a',revision:1};
 t.window.FooteraAccount.pendingPlayerPick=()=>pending;
 t.window.FooteraAccount.choosePlayerPickCompact=async(id,option)=>{
  t.calls.push('recover:'+id+':'+option);pending=null;
  return{pick_id:id,item:{baseSnapshot:{name:'Test'}},save_data:{sbcStorage:[]}};
 };
 await t.window.FooteraPlayerPicks.refresh(true);
 assert.deepEqual(t.calls,['list','recover:pick-a:option-a']);assert.equal(pending,null);
 await t.window.FooteraPlayerPicks.refresh(true);
 assert.deepEqual(t.calls,['list','recover:pick-a:option-a','list']);
});
test('failed local Pick persistence is reported and a retry never duplicates the player',()=>{
 const t=setup(),item={uid:'pick-a',pid:'p1',playerPickId:'pick-a',tradeable:false,baseSnapshot:{name:'Test'}};
 const receipt={pick_id:'pick-a',item,save_data:{sbcStorage:[],playerPickClaims:{'pick-a':'option-a'}}};
 t.state.club=[];
 // Load the real delivery function in the same game state with controllable storage.
 let saved=false;
 const ctx={window:{},state:t.state,document:{readyState:'loading',addEventListener(){}},save(){},flushSave:()=>saved};
 vm.runInNewContext(src,ctx);
 assert.throws(()=>ctx.window.FooteraPlayerPicks.applyDelivery(receipt),/noch nicht auf diesem Gerät gespeichert/);
 assert.equal(t.state.club.length,1);
 saved=true;ctx.window.FooteraPlayerPicks.applyDelivery(receipt);assert.equal(t.state.club.length,1);
});
