const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../footera-account.js'),'utf8'),a=src.indexOf(' async function claimTournamentReward('),b=src.indexOf(' function pendingChallengeReward()',a);
function setup(){
 const store=new Map(),u={id:'owner',email_confirmed_at:'2026-10-01'},state={profile:{saveId:'cup-club'},coins:100,packs:{},rewardPackQueue:[]};
 let point={revision:1,saveId:'cup-club'},cloudRev=1,receipt=null,drop=false,wrongOwner=false,syncs=0,hold=null;
 const clone=x=>JSON.parse(JSON.stringify(x)),root={localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}};
 const c={rpc:async(name,args)=>{
  assert.equal(name,'footera_claim_tournament_reward');assert.equal(args.p_save,undefined);
  if(hold)await hold;
  if(!receipt){cloudRev++;receipt={save_id:'cup-club',cup_id:args.p_cup,week:args.p_week,claim_key:`tournament:${args.p_cup}:${args.p_week}`,revision:cloudRev,cloud_revision:cloudRev,replayed:false}}
  else receipt={...receipt,replayed:true};
  if(drop){drop=false;throw Error('lost response')}
  return{data:receipt,error:null};
 }};
 const ctx={root,autoBusy:false,autoBusyDone:null,requirePermanent:async()=>({c,u}),ensureOwned:()=>{if(wrongOwner)throw Error('owner changed')},changeLocked(){},pendingPlayerPick:()=>null,localData:()=>clone(state),saveCloud:async()=>{syncs++},syncPoint:()=>point,pointMatches:()=>true,pickDeadline:async p=>p,pickUser:async()=>wrongOwner?{id:'other'}:u,savePoint:(user,data,rev)=>{point={revision:rev,saveId:data.profile.saveId}},Number,Object,JSON,Error};
 ctx.pendingChallengeReward=()=>{try{return JSON.parse(store.get('footera-pending-challenge-v1')||'null')}catch{return null}};
 vm.runInNewContext(src.slice(a,b)+';this.claim=claimTournamentReward;this.pending=pendingChallengeReward;',ctx);
 const apply=data=>{state.challengeClaims??={};const key=data.claim_key;if(state.challengeClaims[key])return;state.coins+=7500;state.challengeClaims[key]=true};
 root.FooteraTournaments={applyDeliveryToSave:(s,data)=>{s.challengeClaims??={};if(!s.challengeClaims[data.claim_key]){s.coins+=7500;s.challengeClaims[data.claim_key]=true}return s}};
 return{ctx,state,apply,store,syncs:()=>syncs,setDrop:v=>{drop=v},setWrongOwner:v=>{wrongOwner=v},hold:()=>{let release;hold=new Promise(r=>{release=r});return release},point:()=>point};
}
test('tournament lost confirmation retains a retry marker; retry delivers once without another upload',async()=>{
 const t=setup();t.setDrop(true);await assert.rejects(t.ctx.claim('bronze','2026-10-29',t.apply),/lost response/);
 assert.equal(t.state.coins,100);assert.equal(t.ctx.pending().cup,'bronze');
 await t.ctx.claim('bronze','2026-10-29',t.apply);assert.equal(t.state.coins,7600);assert.equal(t.ctx.pending(),null);assert.equal(t.syncs(),1);assert.equal(t.point().revision,2);
});
test('a pending cup cannot be replaced with another claim',async()=>{
 const t=setup();t.setDrop(true);await assert.rejects(t.ctx.claim('bronze','2026-10-29',t.apply));
 await assert.rejects(t.ctx.claim('silver','2026-10-29',t.apply),/ausstehende/);assert.equal(t.ctx.pending().cup,'bronze');
});
test('owner or club changes during an outstanding request never deliver into the new club',async()=>{
 for(const type of ['owner','club']){
  const t=setup(),release=t.hold(),work=t.ctx.claim('bronze','2026-10-29',t.apply);
  await new Promise(r=>setImmediate(r));
  if(type==='owner')t.setWrongOwner(true);else t.state.profile.saveId='other-club';
  release();await assert.rejects(work,/Konto|Verein/);assert.equal(t.state.coins,100);assert.ok(t.ctx.pending());
 }
});
test('replayed tournament confirmation does not add the same local coins twice',async()=>{
 const t=setup();await t.ctx.claim('bronze','2026-10-29',t.apply);await t.ctx.claim('bronze','2026-10-29',t.apply);assert.equal(t.state.coins,7600);
});
