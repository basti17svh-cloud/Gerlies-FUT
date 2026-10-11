const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const js=fs.readFileSync(path.join(__dirname,"../footera-account.js"),"utf8");
const online=fs.readFileSync(path.join(__dirname,"../friend-online.js"),"utf8");
const worker=fs.readFileSync(path.join(__dirname,"../service-worker.js"),"utf8");
const sql=fs.readFileSync(path.join(__dirname,"../online/footera-accounts-v21.109.sql"),"utf8");

function runtime(mode="guest"){
 const calls=[],store=new Map(),who=mode==="guest"?{id:"guest-a",is_anonymous:true}:mode==="registered"?{id:"existing-a",is_anonymous:false,identities:[]}:null;
 const auth={
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  getUser:async()=>({data:{user:who},error:who?null:{name:"AuthSessionMissingError"}}),
  linkIdentity:async options=>{calls.push(["link",options]);return{error:null}},
  signInWithOAuth:async options=>{calls.push(["oauth",options]);return{error:null}},
  updateUser:async args=>{calls.push(["update",args]);return{error:null}},
  signUp:async args=>{calls.push(["signup",args]);return{error:null}},
  signInAnonymously:async()=>{calls.push(["guest"]);return{data:{user:{id:"guest-b",is_anonymous:true}},error:null}}
 };
 const client={auth},document={readyState:"loading",addEventListener(){},getElementById(){return null}},win={
  document,FooteraOnline:{available:true,authClient:async()=>client},
  location:{href:"https://example.test/Gerlies-FUT/"},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  setTimeout(){},
  console:{warn(){}}
 };
 vm.runInNewContext(js,{window:win,document,URL,TextEncoder,console});
 return {calls,store,win};
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
