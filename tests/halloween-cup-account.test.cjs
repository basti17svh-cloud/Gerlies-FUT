const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../footera-account.js'),'utf8'),a=src.indexOf(' function pendingChallengeReward()'),b=src.indexOf(' // The RPC verifies',a);
function setup(){
 const store=new Map(),u={id:'owner',email_confirmed_at:'2026-10-01'},state={profile:{saveId:'cup-club'},coins:100,packs:{},rewardPackQueue:[]};
 let point={revision:1,saveId:'cup-club'},cloudRev=1,receipt=null,drop=false,wrongOwner=false,syncs=0,hold=null;
 const clone=x=>JSON.parse(JSON.stringify(x)),root={localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}};
 const c={rpc:async(name,args)=>{
  assert.equal(name,'footera_claim_halloween_cup_reward');assert.equal(args.p_save,undefined);
  if(hold)await hold;
  if(!receipt){cloudRev++;receipt={save_id:'cup-club',stage:args.p_stage,revision:cloudRev,cloud_revision:cloudRev,replayed:false}}
  else receipt={...receipt,replayed:true};
  if(drop){drop=false;throw Error('lost response')}
  return{data:receipt,error:null};
 }};
 const ctx={root,autoBusy:false,autoBusyDone:null,requirePermanent:async()=>({c,u}),ensureOwned:()=>{if(wrongOwner)throw Error('owner changed')},changeLocked(){},pendingPlayerPick:()=>null,localData:()=>clone(state),saveCloud:async()=>{syncs++},syncPoint:()=>point,pointMatches:()=>true,pickDeadline:async p=>p,pickUser:async()=>wrongOwner?{id:'other'}:u,savePoint:(user,data,rev)=>{point={revision:rev,saveId:data.profile.saveId}},Number,Object,JSON,Error};
 vm.runInNewContext(src.slice(a,b)+';this.claim=claimChallengeReward;this.pending=pendingChallengeReward;',ctx);
 const apply=data=>{state.challengeClaims??={};const key='halloween-team1:'+data.stage;if(state.challengeClaims[key])return;if(data.stage===1)state.coins+=15000;state.challengeClaims[key]=true};
 return{ctx,state,apply,store,syncs:()=>syncs,setDrop:v=>{drop=v},setWrongOwner:v=>{wrongOwner=v},hold:()=>{let release;hold=new Promise(r=>{release=r});return release},point:()=>point};
}
test('lost confirmation retains a retry marker; retry delivers once without another upload',async()=>{
 const t=setup();t.setDrop(true);await assert.rejects(t.ctx.claim(1,t.apply),/lost response/);
 assert.equal(t.state.coins,100);assert.equal(t.ctx.pending().stage,1);
 await t.ctx.claim(1,t.apply);assert.equal(t.state.coins,15100);assert.equal(t.ctx.pending(),null);assert.equal(t.syncs(),1);assert.equal(t.point().revision,2);
});
test('a pending stage cannot be replaced with another claim',async()=>{
 const t=setup();t.setDrop(true);await assert.rejects(t.ctx.claim(1,t.apply));
 await assert.rejects(t.ctx.claim(2,t.apply),/ausstehende/);assert.equal(t.ctx.pending().stage,1);
});
test('owner or club changes during an outstanding request never deliver into the new club',async()=>{
 for(const type of ['owner','club']){
  const t=setup(),release=t.hold(),work=t.ctx.claim(1,t.apply);
  await new Promise(r=>setImmediate(r));
  if(type==='owner')t.setWrongOwner(true);else t.state.profile.saveId='other-club';
  release();await assert.rejects(work,/Konto|Verein/);assert.equal(t.state.coins,100);assert.ok(t.ctx.pending());
 }
});
test('replayed confirmation does not add the same local coins twice',async()=>{
 const t=setup();await t.ctx.claim(1,t.apply);await t.ctx.claim(1,t.apply);assert.equal(t.state.coins,15100);
});
