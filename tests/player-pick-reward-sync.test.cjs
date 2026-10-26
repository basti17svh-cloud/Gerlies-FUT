const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync(require('node:path').join(__dirname,'../player-picks.js'),'utf8');
function setup(){
 const calls=[],box={hidden:true},copy={textContent:''},host={innerHTML:''};let fail=false;
 const user={id:'owner',email_confirmed_at:'2026-10-01'};
 const window={FooteraAccount:{getClient:async()=>({auth:{getSession:async()=>({data:{session:{user}}})},rpc:async()=>{calls.push('list');return{data:[],error:null}}}),pendingPlayerPick:()=>null,
 syncPlayerPickRewards:async()=>{calls.push('sync');if(fail)throw Error('cloud conflict')}}};
 const state={onboarded:true,profile:{saveId:'club'},weeklyRewards:[{mode:'champions',week:'1792774800000',wins:11,claimed:true,reward:{playerPicks:[{},{}]}}]};
 const ctx={window,state,localStorage:{getItem:()=>user.id},document:{readyState:'loading',addEventListener(){},getElementById:id=>({playerPicks:host,homePlayerPickNotice:box,homePlayerPickCopy:copy}[id]||null)},setTimeout,clearTimeout,esc:String};
 vm.runInNewContext(src,ctx);return{calls,state,window,host,box,copy,setFail:x=>{fail=x}};
}
test('new claimed rewards sync before listing and confirmed retries only list',async()=>{
 const t=setup();await t.window.FooteraPlayerPicks.refresh(true);assert.deepEqual(t.calls,['sync','list']);
 await t.window.FooteraPlayerPicks.refresh(true);assert.deepEqual(t.calls,['sync','list','list']);
 t.state.weeklyRewards.push({...t.state.weeklyRewards[0],week:'1792170000000'});
 await t.window.FooteraPlayerPicks.refresh(true);assert.deepEqual(t.calls,['sync','list','list','sync','list']);
});
test('failed reward sync is visible, does not list stale cloud and retries successfully',async()=>{
 const t=setup();t.setFail(true);await t.window.FooteraPlayerPicks.refresh(true);
 assert.deepEqual(t.calls,['sync']);assert.equal(t.box.hidden,false);assert.equal(t.copy.textContent,'cloud conflict');
 t.setFail(false);await t.window.FooteraPlayerPicks.refresh(true);
 assert.deepEqual(t.calls,['sync','sync','list']);assert.equal(t.box.hidden,true);
});
