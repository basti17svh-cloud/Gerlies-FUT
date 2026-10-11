const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const js=fs.readFileSync(path.join(__dirname,"../footera-account.js"),"utf8");
const online=fs.readFileSync(path.join(__dirname,"../friend-online.js"),"utf8");
const worker=fs.readFileSync(path.join(__dirname,"../service-worker.js"),"utf8");
const sql=fs.readFileSync(path.join(__dirname,"../online/footera-accounts-v21.109.sql"),"utf8");

function runtime(mode="guest"){
 const calls=[],store=new Map(),who=mode==="guest"?{id:"guest-a",is_anonymous:true}:mode==="registered"?{id:"existing-a",email:"registered@example.org",email_confirmed_at:"2026-10-11",is_anonymous:false,identities:[]}:null;
 const auth={
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  getUser:async()=>({data:{user:who},error:who?null:{name:"AuthSessionMissingError"}}),
  linkIdentity:async options=>{calls.push(["link",options]);return{error:null}},
  signInWithOAuth:async options=>{calls.push(["oauth",options]);return{error:null}},
  updateUser:async (args,options)=>{calls.push(["update",args,options]);return{error:null}},
  signUp:async args=>{calls.push(["signup",args]);return{error:null}},
  signInAnonymously:async()=>{calls.push(["guest"]);return{data:{user:{id:"guest-b",is_anonymous:true}},error:null}},
  resend:async args=>{calls.push(["resend",args]);return{error:null}}
 };
 let cloud=null,revision=0,reloaded=false;
 const client={auth,
  from:()=>({select:()=>({maybeSingle:async()=>({data:cloud,error:null})})}),
  rpc:async (_name,args)=>{calls.push(["cloud",args]);if(args.p_base_revision!==revision)return{error:Error("conflict")};revision++;cloud={save_data:args.p_save,revision,saved_at:"2026-10-11T10:00:00Z"};return{data:revision,error:null}}
 };
 const document={readyState:"loading",addEventListener(){},getElementById(){return null}};
 const win={
  document,FooteraOnline:{available:true,authClient:async()=>client,ready:true},FooteraBackup:{validateState:s=>s,blocked:()=>""},
  location:{href:"https://example.test/Gerlies-FUT/",reload:()=>{reloaded=true}},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  setTimeout(){},
  console:{warn(){}}
 };
 vm.runInNewContext(js,{window:win,document,URL,TextEncoder,console});
 return {calls,store,win,setCloud:data=>{cloud=data;revision=data?.revision||0},wasReloaded:()=>reloaded};
}

test("existing guest links Google instead of creating another user",async()=>{
 const a=runtime("guest");
 await a.win.FooteraAccount.google("link");
 assert.equal(a.calls.length,1);
 assert.equal(a.calls[0][0],"link");
 assert.equal(a.calls[0][1].provider,"google");
 assert.equal(a.store.get("footera-cloud-owner"),"guest-a");
});
test("existing email account links Google in place",async()=>{
 const a=runtime("registered");
 await a.win.FooteraAccount.google("link");
 assert.equal(a.calls[0][0],"link");
 assert.equal(a.calls[0][1].provider,"google");
});
test("new device uses Google OAuth login",async()=>{
 const a=runtime("fresh");
 await a.win.FooteraAccount.google("link");
 assert.equal(a.calls[0][0],"oauth");
 assert.equal(a.calls[0][1].options.redirectTo,"https://example.test/Gerlies-FUT/");
});
test("guest email conversion preserves user identity and requests verification",async()=>{
 const a=runtime("guest");
 await a.win.FooteraAccount.emailRegister("tester@example.org","secretpassword");
 assert.equal(a.calls[0][0],"update");
 assert.equal(a.calls[0][1].email,"tester@example.org");
 assert.equal(a.store.get("footera-cloud-owner"),"guest-a");
});
test("fresh email signup requires adequate password",async()=>{
 const a=runtime("fresh");
 await assert.rejects(a.win.FooteraAccount.emailRegister("a@example.org","123"),/10 Zeichen/);
 assert.equal(a.calls.length,0);
});
test("account switch and cloud saves cannot silently replace online profile",()=>{
 assert.match(online,/localStorage\.getItem\("footera-cloud-owner"\)!==online\.userId/);
 assert.match(online,/if\(!session\)[\s\S]*?footera-cloud-owner/);
 assert.match(online,/authClient/);
 assert.match(worker,/footera-account\.js\?v=21109/);
 assert.match(worker,/footera-account\.css\?v=21109/);
});
test("cloud save schema enforces ownership and revision checks",()=>{
 assert.match(sql,/alter table public\.footera_cloud_saves enable row level security/);
 assert.match(sql,/user_id = \(select auth\.uid\(\)\)/);
 assert.match(sql,/where public\.footera_cloud_saves\.revision=p_base_revision/);
 assert.match(sql,/coalesce\(\(auth\.jwt\(\)->>'is_anonymous'\)::boolean,true\)/);
 assert.match(sql,/revoke all on table public\.footera_cloud_saves from public, anon, authenticated/);
});

test("new visitors see account choice without overwriting a club",()=>{
 const a=runtime("fresh");
 assert.equal(a.win.FooteraAccount.shouldWelcome(),true);
 a.store.set("gerliesFutV9","existing-game-save");
 assert.equal(a.win.FooteraAccount.shouldWelcome(),false);
 assert.equal(a.store.get("gerliesFutV9"),"existing-game-save");
});
test("guest continues using existing anonymous ID without a duplicate account",async()=>{
 const a=runtime("guest");
 await a.win.FooteraAccount.continueAsGuest();
 assert.equal(a.calls.length,0);
 assert.equal(a.store.get("footera-account-welcome-v1"),"1");
});
test("new visitor can create an anonymous account and continue",async()=>{
 const a=runtime("fresh");
 await a.win.FooteraAccount.continueAsGuest();
 assert.deepEqual(a.calls.map(x=>x[0]),["guest"]);
 assert.equal(a.win.FooteraAccount.shouldWelcome(),false);
});
test("permanent session cannot be downgraded to a guest",async()=>{
 const a=runtime("registered");
 await a.win.FooteraAccount.continueAsGuest();
 assert.equal(a.calls.length,0);
});

test("guest email upgrade points back to Footera and keeps the same owner",async()=>{
 const a=runtime("guest");
 await a.win.FooteraAccount.emailRegister(" BASTI@Example.org ","ignored");
 assert.equal(a.calls[0][0],"update");
 assert.equal(a.calls[0][1].email,"basti@example.org");
 assert.equal(a.calls[0][2].emailRedirectTo,"https://example.test/Gerlies-FUT/");
 assert.equal(a.store.get("footera-cloud-owner"),"guest-a");
 assert.equal(JSON.parse(a.store.get("footera-pending-email-v1")).userId,"guest-a");
});
test("malformed guest email cannot claim the local game save",async()=>{
 const a=runtime("guest");
 await assert.rejects(a.win.FooteraAccount.emailRegister("bad-address",""),/gültige E-Mail-Adresse/);
 assert.equal(a.calls.length,0);
 assert.equal(a.store.get("footera-cloud-owner"),undefined);
});
test("signup stores pending confirmation and redirect",async()=>{
 const a=runtime("fresh");
 await a.win.FooteraAccount.emailRegister("NEW@Example.org","verystrongpassword");
 assert.equal(a.calls[0][0],"signup");
 assert.equal(a.calls[0][1].email,"new@example.org");
 assert.equal(a.calls[0][1].options.emailRedirectTo,"https://example.test/Gerlies-FUT/");
 assert.equal(JSON.parse(a.store.get("footera-pending-email-v1")).userId,null);
});
test("resend has distinct confirmation types for fresh and upgraded accounts",async()=>{
 const fresh=runtime("fresh");
 await fresh.win.FooteraAccount.emailRegister("new@example.org","verystrongpassword");
 await fresh.win.FooteraAccount.resendEmail();
 assert.equal(fresh.calls.at(-1)[1].type,"signup");
 const guest=runtime("guest");
 await guest.win.FooteraAccount.emailRegister("guest@example.org","");
 await guest.win.FooteraAccount.resendEmail();
 assert.equal(guest.calls.at(-1)[1].type,"email_change");
});

function sampleGame(id="club-a"){return{version:1,onboarded:true,profile:{username:"Tester",clubName:"Test FC",saveId:id},club:[],squad:[],coins:5000,points:0};}
test("freshly confirmed account automatically adopts and saves its own club",async()=>{
 const t=runtime("registered");
 t.store.set("footera-pending-email-v1",JSON.stringify({email:"registered@example.org",userId:null}));
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame()));
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.store.get("footera-cloud-owner"),"existing-a");
 assert.equal(t.calls.filter(x=>x[0]==="cloud").length,1);
 assert.equal(t.calls.find(x=>x[0]==="cloud")[1].p_base_revision,0);
});
test("unmodified club is not re-uploaded on the next automatic sync",async()=>{
 const t=runtime("registered");
 t.store.set("footera-pending-email-v1",JSON.stringify({email:"registered@example.org",userId:null}));
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame()));
 await t.win.FooteraAccount.autoAttachAndBackup();
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.calls.filter(x=>x[0]==="cloud").length,1);
});
test("returning player without a local club restores the account cloud save",async()=>{
 const t=runtime("registered");
 t.setCloud({save_data:sampleGame(),revision:3,saved_at:"2026-10-11"});
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.wasReloaded(),true);
 assert.equal(t.store.get("footera-cloud-owner"),"existing-a");
 assert.equal(t.calls.filter(x=>x[0]==="cloud").length,0);
});
test("another player's existing club is never automatically adopted",async()=>{
 const t=runtime("registered");
 t.store.set("footera-cloud-owner","other-owner");
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame()));
 t.store.set("footera-pending-email-v1",JSON.stringify({email:"registered@example.org",userId:null}));
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.store.get("footera-cloud-owner"),"other-owner");
 assert.equal(t.calls.filter(x=>x[0]==="cloud").length,0);
});
test("cloud club mismatch blocks overwrite during signup",async()=>{
 const t=runtime("registered");
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame("different-club")));
 t.store.set("footera-pending-email-v1",JSON.stringify({email:"registered@example.org",userId:null}));
 t.setCloud({save_data:sampleGame("first-club"),revision:2,saved_at:"2026-10-11"});
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.calls.filter(x=>x[0]==="cloud").length,0);
});
test("unidentified legacy club without registration marker is not silently adopted",async()=>{
 const t=runtime("registered");
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame()));
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.store.get("footera-cloud-owner"),undefined);
});
test("outdated revision never overwrites newer cloud progress",async()=>{
 const t=runtime("registered"),s=sampleGame();
 t.store.set("footera-cloud-owner","existing-a");
 t.store.set("gerliesFutV9",JSON.stringify({...s,coins:7000}));
 t.store.set("footera-cloud-sync-point-v1",JSON.stringify({userId:"existing-a",saveId:"club-a",revision:1,hash:"old"}));
 t.setCloud({save_data:s,revision:2,saved_at:"2026-10-11"});
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.calls.filter(x=>x[0]==="cloud").length,0);
});
