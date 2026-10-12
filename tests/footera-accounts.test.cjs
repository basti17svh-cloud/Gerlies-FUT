const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const js=fs.readFileSync(path.join(__dirname,"../footera-account.js"),"utf8");
const online=fs.readFileSync(path.join(__dirname,"../friend-online.js"),"utf8");
const worker=fs.readFileSync(path.join(__dirname,"../service-worker.js"),"utf8");
const sql=fs.readFileSync(path.join(__dirname,"../online/footera-accounts-v21.109.sql"),"utf8");

function runtime(mode="guest"){
 const calls=[],store=new Map();let who=mode==="guest"?{id:"guest-a",is_anonymous:true}:mode==="registered"?{id:"existing-a",email:"registered@example.org",email_confirmed_at:"2026-10-11",is_anonymous:false,identities:[]}:null;
 const auth={
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  getUser:async()=>({data:{user:who},error:who?null:{name:"AuthSessionMissingError"}}),
  linkIdentity:async options=>{calls.push(["link",options]);return{error:null}},
  signInWithOAuth:async options=>{calls.push(["oauth",options]);return{error:null}},
  updateUser:async (args,options)=>{calls.push(["update",args,options]);return{error:null}},
  signUp:async args=>{calls.push(["signup",args]);return{error:null}},
  signInAnonymously:async()=>{calls.push(["guest"]);return{data:{user:{id:"guest-b",is_anonymous:true}},error:null}},
  resend:async args=>{calls.push(["resend",args]);return{error:null}},
  signOut:async()=>{calls.push(["signout"]);return{error:null}}
 };
 let cloud=null,revision=0,reloaded=false;
 const client={auth,
  from:()=>({select:()=>({maybeSingle:async()=>({data:cloud,error:null})})}),
  rpc:async (_name,args)=>{calls.push(["cloud",args]);if(args.p_base_revision!==revision)return{error:Error("conflict")};revision++;cloud={save_data:args.p_save,revision,saved_at:"2026-10-11T10:00:00Z"};return{data:revision,error:null}},
  functions:{invoke:async (slug,options)=>{calls.push(["delete",slug,options]);return{data:{deleted:true},error:null}}}
 };
 const document={readyState:"loading",addEventListener(){},getElementById(){return null}};
 const win={
  document,FOOTERA_ONLINE_CONFIG:{url:"https://idxydyrihtyecvfjvtuk.supabase.co"},FooteraOnline:{available:true,authClient:async()=>client,ready:true},FooteraBackup:{validateState:s=>s,blocked:()=>""},
  location:{href:"https://example.test/Gerlies-FUT/",reload:()=>{reloaded=true}},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  setTimeout(){},
  console:{warn(){}}
 };
 vm.runInNewContext(js,{window:win,document,URL,TextEncoder,console});
 return {calls,store,win,client,setUser:u=>{who=u},setCloud:data=>{cloud=data;revision=data?.revision||0},wasReloaded:()=>reloaded};
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
 assert.match(worker,/footera-account\.js\?v=21122/);
 assert.match(worker,/footera-account\.css\?v=21122/);
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

test("account deletion rejects guests and incorrect confirmation",async()=>{
 const guest=runtime("guest");
 await assert.rejects(guest.win.FooteraAccount.deleteOwnAccount("FOOTERA LÖSCHEN",""),/angemeldet sein/);
 assert.equal(guest.calls.some(x=>x[0]==="delete"),false);
 const regular=runtime("registered");
 await assert.rejects(regular.win.FooteraAccount.deleteOwnAccount("DELETE",""),/FOOTERA LÖSCHEN/);
});
test("hard deletion is invoked for the authenticated user and clears owned local state only after confirmation",async()=>{
 const t=runtime("registered");
 t.store.set("footera-cloud-owner","existing-a");
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame()));
 t.win.FOOTERA_ONLINE_CONFIG={url:"https://idxydyrihtyecvfjvtuk.supabase.co"};
 const accountSource=require("node:fs").readFileSync(path.join(__dirname,"../footera-account.js"),"utf8");
 assert.match(accountSource,/functions\.invoke\("footera-delete-account"/);
 assert.match(accountSource,/result\.data\?\.deleted!==true/);
 assert.match(accountSource,/if\(ownsLocal\)/);
 assert.match(accountSource,/FOOTERA LÖSCHEN/);
});

test("successful server deletion removes only its own local club and reloads",async()=>{
 const t=runtime("registered");
 t.store.set("footera-cloud-owner","existing-a");
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame()));
 t.store.set("footera-cloud-sync-point-v1",JSON.stringify({userId:"existing-a",revision:1}));
 const result=await t.win.FooteraAccount.deleteOwnAccount("FOOTERA LÖSCHEN","correct-password");
 assert.equal(result,true);
 assert.equal(t.calls.filter(x=>x[0]==="delete").length,1);
 assert.equal(t.calls.find(x=>x[0]==="delete")[2].body.password,"correct-password");
 assert.equal(t.store.get("gerliesFutV9"),undefined);
 assert.equal(t.store.get("footera-cloud-owner"),undefined);
 assert.equal(t.wasReloaded(),true);
});
test("server refuses deletion: local club remains intact",async()=>{
 const t=runtime("registered"),before=JSON.stringify(sampleGame());
 t.store.set("footera-cloud-owner","existing-a");
 t.store.set("gerliesFutV9",before);
 t.client.functions.invoke=async()=>({data:null,error:{context:{json:async()=>({error:"Passwort stimmt nicht."})}}});
 await assert.rejects(t.win.FooteraAccount.deleteOwnAccount("FOOTERA LÖSCHEN","wrong"),/Passwort stimmt nicht/);
 assert.equal(t.store.get("gerliesFutV9"),before);
 assert.equal(t.store.get("footera-cloud-owner"),"existing-a");
 assert.equal(t.wasReloaded(),false);
});
test("different locally owned club is preserved when deleting a separate account",async()=>{
 const t=runtime("registered"),before=JSON.stringify(sampleGame("other"));
 t.store.set("footera-cloud-owner","other-user");
 t.store.set("gerliesFutV9",before);
 await t.win.FooteraAccount.deleteOwnAccount("FOOTERA LÖSCHEN","current-password");
 assert.equal(t.store.get("gerliesFutV9"),before);
 assert.equal(t.store.get("footera-cloud-owner"),"other-user");
});

test("Google login and linking are absent from account UI while email flows remain available",()=>{
 assert.doesNotMatch(js,/id="footeraGoogle"/);
 assert.doesNotMatch(js,/id="footeraSwitchGoogle"/);
 assert.doesNotMatch(js,/id="footeraGoogle"[^\n]*Mit Google/);
 assert.match(js,/id="footeraAccountEmail"/);
 assert.match(js,/id="footeraAccountPassword"/);
 assert.match(js,/id="footeraEmailRegister"/);
 assert.match(js,/id="footeraEmailLogin"/);
 assert.match(js,/id="footeraGuest"/);
});

test("the real entry page loads accounts after online and backup, including the stylesheet",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert.match(html,/<script src="\.\/footera-account\.js\?v=21122"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="\.\/footera-account\.css\?v=21122">/);
 assert.ok(html.indexOf('src="./footera-account.js')>html.indexOf('src="./footera-backup.js'));
 assert.ok(html.indexOf('src="./footera-account.js')>html.indexOf('src="./friend-online.js'));
});
test("empty boot autosave does not suppress first account choice",()=>{
 const t=runtime("fresh");t.store.set("gerliesFutV9",JSON.stringify({onboarded:false,profile:{username:""},club:[]}));
 assert.equal(t.win.FooteraAccount.shouldWelcome(),true);
 t.store.set("gerliesFutV9",JSON.stringify({onboarded:false,profile:{username:"Setup started"},club:[]}));
 assert.equal(t.win.FooteraAccount.shouldWelcome(),false);
});
test("login on a new device with an empty autosave restores its club",async()=>{
 const t=runtime("registered");t.store.set("gerliesFutV9",JSON.stringify({onboarded:false,profile:{username:""},club:[]}));
 t.setCloud({save_data:sampleGame(),revision:2,saved_at:"2026-10-11"});
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(JSON.parse(t.store.get("gerliesFutV9")).profile.saveId,"club-a");
 assert.equal(t.win.FooteraAccountReplacingSave,true);
});
test("confirmed account on a new device reserves ownership before club setup",async()=>{
 const t=runtime("registered");await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.store.get("footera-cloud-owner"),"existing-a");
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame()));
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.calls.filter(x=>x[0]==="cloud").length,1);
});
test("guest registration never changes another account's local owner",async()=>{
 const t=runtime("guest");t.store.set("footera-cloud-owner","other");const before=JSON.stringify(sampleGame());t.store.set("gerliesFutV9",before);
 await assert.rejects(t.win.FooteraAccount.emailRegister("qa@example.org",""),/anderen Konto/);
 assert.equal(t.calls.length,0);assert.equal(t.store.get("footera-cloud-owner"),"other");assert.equal(t.store.get("gerliesFutV9"),before);
});
test("obfuscated duplicate signup cannot authorize local club adoption",async()=>{
 const t=runtime("fresh");t.client.auth.signUp=async()=>({data:{user:{id:"fake-id",identities:[]}},error:null});
 await t.win.FooteraAccount.emailRegister("duplicate@example.org","test-password-only");
 assert.equal(t.store.has("footera-pending-email-v1"),false);
 assert.equal(t.store.has("footera-register-owner-v1"),false);
});
test("new signup binds pending verification to returned identity and resends without a session",async()=>{
 const t=runtime("fresh");t.client.auth.signUp=async()=>({data:{user:{id:"new-id",identities:[{provider:"email"}]}},error:null});
 await t.win.FooteraAccount.emailRegister("qa@example.org","test-password-only");
 assert.equal(JSON.parse(t.store.get("footera-pending-email-v1")).userId,"new-id");
 await t.win.FooteraAccount.resendEmail();assert.equal(t.calls.at(-1)[1].type,"signup");
 assert.equal(t.calls.at(-1)[1].options.emailRedirectTo,"https://example.test/Gerlies-FUT/");
});
test("old registration marker cannot delete another locally owned club",async()=>{
 const t=runtime("registered"),before=JSON.stringify(sampleGame("other"));
 t.store.set("footera-cloud-owner","other");t.store.set("footera-register-owner-v1",JSON.stringify({userId:"existing-a"}));t.store.set("gerliesFutV9",before);
 await t.win.FooteraAccount.deleteOwnAccount("FOOTERA LÖSCHEN","test-password-only");
 assert.equal(t.store.get("gerliesFutV9"),before);assert.equal(t.store.get("footera-cloud-owner"),"other");
});
test("invalid login preserves guest session, owner and save",async()=>{
 const t=runtime("guest");t.win.confirm=()=>true;let probes=0;
 t.win.supabase={createClient:()=>({auth:{signInWithPassword:async()=>{probes++;return{error:Error("invalid credentials")}}}})};
 const before=JSON.stringify(sampleGame());t.store.set("gerliesFutV9",before);
 await assert.rejects(t.win.FooteraAccount.emailLogin("qa@example.org","wrong-test-password"),/invalid credentials/);
 assert.equal(probes,1);assert.equal(t.calls.length,0);assert.equal(t.store.get("gerliesFutV9"),before);assert.equal(t.wasReloaded(),false);
});
test("successful login normalizes email and sets only the verified session",async()=>{
 const t=runtime("fresh");let submitted;
 t.win.supabase={createClient:(_url,_key,opts)=>{assert.equal(opts.auth.persistSession,false);assert.equal(opts.auth.detectSessionInUrl,false);return{auth:{signInWithPassword:async args=>{submitted=args.email;return{data:{session:{access_token:"test-access",refresh_token:"test-refresh"},user:{id:"qa",is_anonymous:false}}}}}}}};
 t.client.auth.setSession=async session=>{t.calls.push(["setSession",session]);return{error:null}};
 await t.win.FooteraAccount.emailLogin(" QA@EXAMPLE.ORG ","test-password-only");
 assert.equal(submitted,"qa@example.org");assert.equal(t.calls[0][0],"setSession");assert.equal(t.wasReloaded(),true);
});
test("logout affects this device only and preserves the owned club",async()=>{
 const t=runtime("registered");t.win.confirm=()=>true;let opts;
 t.client.auth.signOut=async o=>{opts=o;return{error:null}};
 const before=JSON.stringify(sampleGame());t.store.set("gerliesFutV9",before);t.store.set("footera-cloud-owner","existing-a");
 await t.win.FooteraAccount.signOut();assert.equal(opts.scope,"local");assert.equal(t.store.get("gerliesFutV9"),before);assert.equal(t.store.get("footera-cloud-owner"),"existing-a");
});

test("club created during cloud lookup is not overwritten by automatic restore",async()=>{
 const t=runtime("registered"),local=sampleGame("created-during-request");
 t.client.from=()=>({select:()=>({maybeSingle:async()=>{t.store.set("gerliesFutV9",JSON.stringify(local));return{data:{save_data:sampleGame("remote-club"),revision:1},error:null}}})});
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(JSON.parse(t.store.get("gerliesFutV9")).profile.saveId,"created-during-request");assert.equal(t.wasReloaded(),false);
});
test("deletion without a positive server confirmation preserves all local data",async()=>{
 const t=runtime("registered"),before=JSON.stringify(sampleGame());t.store.set("gerliesFutV9",before);t.store.set("footera-cloud-owner","existing-a");
 t.client.functions.invoke=async()=>({data:{deleted:false},error:null});
 await assert.rejects(t.win.FooteraAccount.deleteOwnAccount("FOOTERA LÖSCHEN","fixture-only"),/nicht bestätigt/);
 assert.equal(t.store.get("gerliesFutV9"),before);assert.equal(t.wasReloaded(),false);
});
test("cancelled signout leaves session and local club untouched",async()=>{
 const t=runtime("registered");t.win.confirm=()=>false;await t.win.FooteraAccount.signOut();assert.equal(t.calls.length,0);assert.equal(t.wasReloaded(),false);
});
test("a different confirmed identity cannot claim a pending signup with matching email",async()=>{
 const t=runtime("registered");t.store.set("footera-pending-email-v1",JSON.stringify({email:"registered@example.org",userId:"other-signup",kind:"signup"}));t.store.set("gerliesFutV9",JSON.stringify(sampleGame()));
 await t.win.FooteraAccount.autoAttachAndBackup();assert.equal(t.store.has("footera-register-owner-v1"),false);assert.equal(t.calls.length,0);
});

test("confirmed guest remains on the password step while first cloud backup completes",async()=>{
 const t=runtime("registered");t.win.FooteraOnline.ready=false;
 t.store.set("footera-pending-email-v1",JSON.stringify({email:"registered@example.org",userId:"existing-a",kind:"email_change"}));t.store.set("footera-cloud-owner","existing-a");t.store.set("gerliesFutV9",JSON.stringify(sampleGame()));
 await t.win.FooteraAccount.autoAttachAndBackup();assert.equal(t.calls.filter(x=>x[0]==="cloud").length,1);assert.equal(t.wasReloaded(),false);assert.equal(t.store.has("footera-pending-email-v1"),true);
});
test("confirmed fresh signup clears the prompt because its password already exists",async()=>{
 const t=runtime("registered");t.store.set("footera-pending-email-v1",JSON.stringify({email:"registered@example.org",userId:"existing-a",kind:"signup"}));
 await t.win.FooteraAccount.autoAttachAndBackup();assert.equal(t.store.has("footera-pending-email-v1"),false);assert.equal(t.store.get("footera-cloud-owner"),"existing-a");
});

test("changing the login email uses existing authenticated identity and preserves cloud club",async()=>{
 const t=runtime("registered"),club=sampleGame("preserve-this-club");
 t.setCloud({save_data:club,revision:5,saved_at:"2026-10-12T07:45:06Z"});
 t.win.confirm=()=>true;
 await t.win.FooteraAccount.requestAccountEmailChange(" BASTI17SVH@GMAIL.COM ");
 const changes=t.calls.filter(x=>x[0]==="update");
 assert.equal(changes.length,1);
 assert.equal(changes[0][1].email,"basti17svh@gmail.com");
 assert.equal(changes[0][2].emailRedirectTo,"https://example.test/Gerlies-FUT/");
 assert.equal(t.calls.filter(x=>["signup","signout","cloud"].includes(x[0])).length,0);
 const pending=JSON.parse(t.store.get("footera-account-email-change-v1"));
 assert.equal(pending.userId,"existing-a");
 assert.equal(pending.previousEmail,"registered@example.org");
 assert.equal(pending.newEmail,"basti17svh@gmail.com");
 assert.equal(t.wasReloaded(),false);
});
test("email change is blocked until existing club has been backed up",async()=>{
 const t=runtime("registered");t.win.confirm=()=>true;
 await assert.rejects(t.win.FooteraAccount.requestAccountEmailChange("new@example.org"),/Cloud gespeichert/);
 assert.equal(t.calls.length,0);
});
test("email change blocks unsynced local club and never overwrites its save",async()=>{
 const t=runtime("registered"),remote=sampleGame("existing-club");
 const local={...remote,coins:99999};
 t.setCloud({save_data:remote,revision:4,saved_at:"2026-10-12T09:00:00Z"});
 t.store.set("footera-cloud-owner","existing-a");
 t.store.set("gerliesFutV9",JSON.stringify(local));
 t.win.confirm=()=>true;
 await assert.rejects(t.win.FooteraAccount.requestAccountEmailChange("new@example.org"),/nicht gesicherte Änderungen/);
 assert.equal(t.store.get("gerliesFutV9"),JSON.stringify(local));
 assert.equal(t.calls.length,0);
});
test("cancelled email change neither mutates account nor saves",async()=>{
 const t=runtime("registered");
 t.setCloud({save_data:sampleGame(),revision:2,saved_at:"2026-10-12T09:00:00Z"});
 t.win.confirm=()=>false;
 await t.win.FooteraAccount.requestAccountEmailChange("new@example.org");
 assert.equal(t.calls.length,0);
 assert.equal(t.store.has("footera-account-email-change-v1"),false);
});


test("wrong WEB.DE session can be safely disconnected only after matching local JSON backup",async()=>{
 const t=runtime("registered"),local=sampleGame("gerlies-main"),cloud=sampleGame("holy");
 local.club=[{uid:"fixture-1",pid:"player-fixture"}];
 local.profile.clubName="FC Gerlies";cloud.profile.clubName="Holy FC";
 t.store.set("gerliesFutV9",JSON.stringify(local));
 t.store.set("footera-cloud-owner","original-guest");
 t.setCloud({save_data:cloud,revision:5,saved_at:"2026-10-12"});
 t.win.FooteraBackup.inspect=async()=>({state:JSON.parse(JSON.stringify(local))});
 t.win.confirm=()=>true;
 let signedOutWith;
 t.client.auth.signOut=async opts=>{signedOutWith=opts;return{error:null}};
 await t.win.FooteraAccount.beginLocalTransfer({size:200,text:async()=>"valid-backup"}," NEW@EXAMPLE.ORG ");
 assert.equal(signedOutWith.scope,"local");
 assert.equal(t.wasReloaded(),true);
 assert.equal(t.store.get("gerliesFutV9"),JSON.stringify(local));
 assert.equal(t.store.get("footera-cloud-owner"),"original-guest");
 const pending=JSON.parse(t.store.get("footera-local-account-transfer-v1"));
 assert.equal(pending.targetEmail,"new@example.org");
 assert.equal(pending.saveId,"gerlies-main");
 assert.equal(t.calls.filter(c=>c[0]==="cloud").length,0);
});
test("mismatching file cannot trigger logout or ownership changes",async()=>{
 const t=runtime("registered"),local=sampleGame("gerlies-main");
 local.club=[{uid:"fixture-1",pid:"player-fixture"}];
 t.store.set("gerliesFutV9",JSON.stringify(local));
 t.store.set("footera-cloud-owner","original-guest");
 t.win.FooteraBackup.inspect=async()=>({state:sampleGame("wrong-id")});
 t.win.confirm=()=>true;
 await assert.rejects(t.win.FooteraAccount.beginLocalTransfer({size:10,text:async()=>""},"new@example.org"),/unterscheiden/);
 assert.equal(t.calls.some(c=>c[0]==="signout"),false);
 assert.equal(t.store.has("footera-local-account-transfer-v1"),false);
 assert.equal(t.wasReloaded(),false);
});
test("Gmail must be verified before safely claiming FC Gerlies; no old cloud overwrite",async()=>{
 const t=runtime("registered"),local=sampleGame("gerlies-main");
 local.club=[{uid:"fixture-1",pid:"player-fixture"}];
 local.profile.clubName="FC Gerlies";
 t.store.set("gerliesFutV9",JSON.stringify(local));
 t.store.set("footera-cloud-owner","original-guest");
 t.win.FooteraBackup.inspect=async()=>({state:JSON.parse(JSON.stringify(local))});
 t.win.confirm=()=>true;
 await t.win.FooteraAccount.beginLocalTransfer({size:200,text:async()=>"json"},"new@example.org");
 t.setUser({id:"gmail-user",email:"new@example.org",email_confirmed_at:null,is_anonymous:false,identities:[]});
 await assert.rejects(t.win.FooteraAccount.finishLocalTransfer(),/E-Mail bestätigen/);
 assert.equal(t.store.get("footera-cloud-owner"),"original-guest");
 assert.equal(t.calls.filter(c=>c[0]==="cloud").length,0);
});
test("confirmed Gmail can claim FC Gerlies only after fresh, empty-cloud verification",async()=>{
 const t=runtime("registered"),local=sampleGame("gerlies-main");
 local.club=[{uid:"fixture-1",pid:"player-fixture"}];
 local.profile.clubName="FC Gerlies";local.club=[{uid:"a",pid:"b"}];
 t.store.set("gerliesFutV9",JSON.stringify(local));
 t.store.set("footera-cloud-owner","original-guest");
 t.win.FooteraBackup.inspect=async()=>({state:JSON.parse(JSON.stringify(local))});
 t.win.confirm=()=>true;
 await t.win.FooteraAccount.beginLocalTransfer({size:200,text:async()=>"json"},"new@example.org");
 t.setUser({id:"gmail-user",email:"new@example.org",email_confirmed_at:"2026-10-12",is_anonymous:false,identities:[]});
 await t.win.FooteraAccount.finishLocalTransfer();
 assert.equal(t.store.get("gerliesFutV9"),JSON.stringify(local));
 assert.equal(t.store.get("footera-cloud-owner"),"gmail-user");
 assert.equal(t.store.has("footera-local-account-transfer-v1"),false);
 const saved=t.calls.filter(c=>c[0]==="cloud");
 assert.equal(saved.length,1);assert.equal(saved[0][1].p_base_revision,0);
 assert.equal(saved[0][1].p_save.profile.clubName,"FC Gerlies");
});
test("preexisting Gmail cloud save prevents accidental club overwrites",async()=>{
 const t=runtime("registered"),local=sampleGame("gerlies-main");
 local.club=[{uid:"fixture-1",pid:"player-fixture"}];
 local.profile.clubName="FC Gerlies";t.store.set("gerliesFutV9",JSON.stringify(local));
 t.store.set("footera-cloud-owner","original-guest");
 t.win.FooteraBackup.inspect=async()=>({state:JSON.parse(JSON.stringify(local))});t.win.confirm=()=>true;
 await t.win.FooteraAccount.beginLocalTransfer({size:40,text:async()=>""},"new@example.org");
 t.setUser({id:"gmail-user",email:"new@example.org",email_confirmed_at:"2026-10-12",is_anonymous:false,identities:[]});
 t.setCloud({save_data:sampleGame("someone-else"),revision:3,saved_at:"2026-10-12"});
 await assert.rejects(t.win.FooteraAccount.finishLocalTransfer(),/bereits einen anderen Cloud-Spielstand/);
 assert.equal(t.store.get("footera-cloud-owner"),"original-guest");
 assert.equal(t.calls.filter(c=>c[0]==="cloud").length,0);
});
test("new Gmail account cannot claim a local save modified during handoff",async()=>{
 const t=runtime("registered"),local=sampleGame("gerlies-main");
 local.club=[{uid:"fixture-1",pid:"player-fixture"}];
 local.profile.clubName="FC Gerlies";t.store.set("gerliesFutV9",JSON.stringify(local));
 t.store.set("footera-cloud-owner","original-guest");
 t.win.FooteraBackup.inspect=async()=>({state:JSON.parse(JSON.stringify(local))});t.win.confirm=()=>true;
 await t.win.FooteraAccount.beginLocalTransfer({size:40,text:async()=>""},"new@example.org");
 t.setUser({id:"gmail-user",email:"new@example.org",email_confirmed_at:"2026-10-12",is_anonymous:false});
 t.store.set("gerliesFutV9",JSON.stringify({...local,coins:12345}));
 await assert.rejects(t.win.FooteraAccount.finishLocalTransfer(),/wurden verändert/);
 assert.equal(t.store.get("footera-cloud-owner"),"original-guest");
 assert.equal(t.calls.filter(c=>c[0]==="cloud").length,0);
});

test("a successful cloud RPC may be resumed without overwriting the same save",async()=>{
 const t=runtime("registered"),local=sampleGame("gerlies-main");
 local.profile.clubName="FC Gerlies";local.club=[{uid:"c1",pid:"p1"}];
 t.store.set("gerliesFutV9",JSON.stringify(local));t.store.set("footera-cloud-owner","guest-original");
 t.win.FooteraBackup.inspect=async()=>({state:JSON.parse(JSON.stringify(local))});t.win.confirm=()=>true;
 await t.win.FooteraAccount.beginLocalTransfer({size:40,text:async()=>""},"gmail@example.org");
 t.setUser({id:"gmail-new",email:"gmail@example.org",email_confirmed_at:"2026-10-12",is_anonymous:false});
 t.setCloud({save_data:JSON.parse(JSON.stringify(local)),revision:1,saved_at:"2026-10-12"});
 await t.win.FooteraAccount.finishLocalTransfer();
 assert.equal(t.store.get("footera-cloud-owner"),"gmail-new");
 assert.equal(JSON.parse(t.store.get("footera-cloud-sync-point-v1")).revision,1);
 assert.equal(t.calls.filter(c=>c[0]==="cloud").length,0);
});
test("failed sign-out leaves both current login ownership and local FC Gerlies intact",async()=>{
 const t=runtime("registered"),local=sampleGame("gerlies-main");
 local.profile.clubName="FC Gerlies";local.club=[{uid:"c1",pid:"p1"}];
 t.store.set("gerliesFutV9",JSON.stringify(local));t.store.set("footera-cloud-owner","guest-original");
 t.win.FooteraBackup.inspect=async()=>({state:JSON.parse(JSON.stringify(local))});t.win.confirm=()=>true;
 t.client.auth.signOut=async()=>({error:Error("offline")});
 await assert.rejects(t.win.FooteraAccount.beginLocalTransfer({size:40,text:async()=>""},"gmail@example.org"),/offline/);
 assert.equal(t.store.get("gerliesFutV9"),JSON.stringify(local));
 assert.equal(t.store.get("footera-cloud-owner"),"guest-original");
 assert.equal(t.store.has("footera-local-account-transfer-v1"),false);
 assert.equal(t.wasReloaded(),false);
});
test("mismatched account is visibly called out before profile controls",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../footera-account.js"),"utf8");
 assert.match(source,/footera-profile-hero"\)\.insertAdjacentElement\("afterend",profileTransfer\)/);
 assert.match(source,/footeraAccountTransferProgress/);
 assert.match(source,/footeraProfileTransferFile/);
 assert.match(source,/root\.FooteraBackup\.inspect\(await file\.text\(\)\)/);
});
