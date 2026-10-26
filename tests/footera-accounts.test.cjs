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
 let cloud=null,revision=0,reloaded=false,guestOffer=null;
 const client={auth,
  from:()=>({select:()=>({maybeSingle:async()=>({data:cloud,error:null})})}),
  rpc:async (name,args)=>{
   if(name==="footera_guest_save_offer"){calls.push(["offer"]);return{data:guestOffer?[guestOffer]:[],error:null}}
   if(name==="footera_claim_guest_save"){calls.push(["claim",args]);if(args.p_base_revision!==revision)return{error:{code:"40001",message:"conflict"}};revision++;cloud={save_data:guestOffer.save,revision,saved_at:"2026-10-23T05:20:00Z"};return{data:[{revision,save_data:guestOffer.save}],error:null}}
   calls.push(["cloud",args]);if(args.p_base_revision!==revision)return{error:Error("conflict")};revision++;cloud={save_data:args.p_save,revision,saved_at:"2026-10-11T10:00:00Z"};return{data:revision,error:null}},
  functions:{invoke:async (slug,options)=>{calls.push(["delete",slug,options]);return{data:{deleted:true},error:null}}}
 };
 const document={readyState:"loading",addEventListener(){},getElementById(){return null}};
 const win={
  document,FOOTERA_ONLINE_CONFIG:{url:"https://idxydyrihtyecvfjvtuk.supabase.co"},FooteraOnline:{available:true,authClient:async()=>client,ready:true},FooteraBackup:{validateState:s=>s,blocked:()=>"",preserveRollback:async raw=>store.set("footera-before-restore",raw)},
  location:{href:"https://example.test/Gerlies-FUT/",reload:()=>{reloaded=true}},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  setTimeout(){},
  console:{warn(){}}
 };
 vm.runInNewContext(js,{window:win,document,URL,TextEncoder,console});
 return {calls,store,win,client,setUser:u=>{who=u},setCloud:data=>{cloud=data;revision=data?.revision||0},setGuestOffer:o=>{guestOffer=o},wasReloaded:()=>reloaded};
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
 assert.match(worker,/footera-account\.js\?v=\d+/);
 assert.match(worker,/footera-account\.css\?v=\d+/);
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
 const html=require('./helpers/app-html.cjs')();
 assert.match(html,/<script src="\.\/footera-account\.js\?v=\d+"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="\.\/footera-account\.css\?v=\d+">/);
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
 await t.win.FooteraAccount.autoAttachAndBackup();assert.equal(t.store.has("footera-register-owner-v1"),false);assert.equal(t.calls.filter(x=>x[0]!=="offer").length,0); // the guest-club lookup only reads
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

test("prepared transfer permits Gmail verification on a DIFFERENT anonymous session without claiming FC Gerlies early",async()=>{
 const t=runtime("registered"),club=sampleGame("gerlies-transfer");
 club.profile.clubName="FC Gerlies";club.club=[{uid:"a",pid:"b"}];
 t.store.set("gerliesFutV9",JSON.stringify(club));t.store.set("footera-cloud-owner","gerlies-original");
 t.win.FooteraBackup.inspect=async()=>({state:JSON.parse(JSON.stringify(club))});t.win.confirm=()=>true;
 await t.win.FooteraAccount.beginLocalTransfer({size:250,text:async()=>"verified"},"new@gmail.com");
 t.setUser({id:"new-guest",is_anonymous:true});
 await t.win.FooteraAccount.emailRegister(" NEW@GMAIL.COM ","");
 assert.equal(t.calls.filter(c=>c[0]==="update").length,1);
 assert.equal(t.calls.find(c=>c[0]==="update")[1].email,"new@gmail.com");
 assert.equal(t.store.get("footera-cloud-owner"),"gerlies-original");
 assert.equal(JSON.parse(t.store.get("footera-pending-email-v1")).userId,"new-guest");
 assert.equal(t.calls.filter(c=>c[0]==="cloud").length,0);
});
test("prepared transfer rejects registration to an unapproved address and leaves account untouched",async()=>{
 const t=runtime("registered"),club=sampleGame("gerlies-transfer");
 club.profile.clubName="FC Gerlies";club.club=[{uid:"a",pid:"b"}];
 t.store.set("gerliesFutV9",JSON.stringify(club));t.store.set("footera-cloud-owner","gerlies-original");
 t.win.FooteraBackup.inspect=async()=>({state:JSON.parse(JSON.stringify(club))});t.win.confirm=()=>true;
 await t.win.FooteraAccount.beginLocalTransfer({size:250,text:async()=>"verified"},"new@gmail.com");
 t.setUser({id:"new-guest",is_anonymous:true});
 await assert.rejects(t.win.FooteraAccount.emailRegister("wrong@gmail.com",""),/nur für new@gmail.com/);
 assert.equal(t.calls.filter(c=>c[0]==="update").length,0);
 assert.equal(t.store.get("footera-cloud-owner"),"gerlies-original");
});
test("verified Gmail registration never auto-adopts the club until explicit transfer confirmation",async()=>{
 const t=runtime("registered"),club=sampleGame("gerlies-transfer");
 club.profile.clubName="FC Gerlies";club.club=[{uid:"a",pid:"b"}];
 t.store.set("gerliesFutV9",JSON.stringify(club));t.store.set("footera-cloud-owner","gerlies-original");
 t.win.FooteraBackup.inspect=async()=>({state:JSON.parse(JSON.stringify(club))});t.win.confirm=()=>true;
 await t.win.FooteraAccount.beginLocalTransfer({size:250,text:async()=>"verified"},"new@gmail.com");
 t.setUser({id:"new-guest",is_anonymous:true});
 await t.win.FooteraAccount.emailRegister("new@gmail.com","");
 t.setUser({id:"new-guest",email:"new@gmail.com",email_confirmed_at:"2026-10-12",is_anonymous:false});
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.store.get("footera-cloud-owner"),"gerlies-original");
 assert.equal(t.calls.filter(c=>c[0]==="cloud").length,0);
 await t.win.FooteraAccount.finishLocalTransfer();
 assert.equal(t.store.get("footera-cloud-owner"),"new-guest");
 assert.equal(t.calls.filter(c=>c[0]==="cloud").length,1);
});

test("already backed up target club completes pending migration without rewriting the cloud",async()=>{
 const t=runtime("registered"),club=sampleGame("already-saved-club");
 club.profile.clubName="Test Club";
 club.club=[{uid:"card-one",pid:"player-one"}];
 t.store.set("gerliesFutV9",JSON.stringify(club));
 t.store.set("footera-cloud-owner","original-guest");
 t.win.FooteraBackup.inspect=async()=>({state:JSON.parse(JSON.stringify(club))});
 t.win.confirm=()=>true;
 await t.win.FooteraAccount.beginLocalTransfer({size:100,text:async()=>""},"new@example.org");
 t.setUser({id:"new-user",email:"new@example.org",email_confirmed_at:"2026-10-12",is_anonymous:false});
 t.store.set("footera-cloud-owner","new-user");
 t.setCloud({save_data:JSON.parse(JSON.stringify(club)),revision:1,saved_at:"2026-10-12"});
 await t.win.FooteraAccount.finishLocalTransfer();
 assert.equal(t.store.get("footera-cloud-owner"),"new-user");
 assert.equal(t.store.has("footera-local-account-transfer-v1"),false);
 assert.equal(t.calls.filter(c=>c[0]==="cloud").length,0);
 assert.equal(JSON.parse(t.store.get("footera-cloud-sync-point-v1")).revision,1);
});

test("verified account automatically clears a stale completed transfer without changing the cloud save",async()=>{
 const t=runtime("registered"),club=sampleGame("club-complete");
 club.profile.clubName="Test FC";club.club=[{uid:"card-a",pid:"player-a"}];
 t.store.set("gerliesFutV9",JSON.stringify(club));
 t.store.set("footera-cloud-owner","earlier-owner");
 t.win.FooteraBackup.inspect=async()=>({state:JSON.parse(JSON.stringify(club))});
 t.win.confirm=()=>true;
 await t.win.FooteraAccount.beginLocalTransfer({size:30,text:async()=>""},"confirmed@example.org");
 t.setUser({id:"new-verified-user",email:"confirmed@example.org",email_confirmed_at:"2026-10-12",is_anonymous:false});
 t.store.set("footera-cloud-owner","new-verified-user");
 t.setCloud({save_data:JSON.parse(JSON.stringify(club)),revision:1,saved_at:"2026-10-12"});
 const success=await t.win.FooteraAccount.reconcileCompletedTransfer(await t.win.FooteraAccount.user());
 assert.equal(success,true);
 assert.equal(t.store.has("footera-local-account-transfer-v1"),false);
 assert.equal(t.store.get("footera-cloud-owner"),"new-verified-user");
 assert.equal(t.calls.filter(x=>x[0]==="cloud").length,0);
 assert.equal(JSON.parse(t.store.get("gerliesFutV9")).profile.saveId,"club-complete");
});
test("stale transfer is not cleared when new account owns a different cloud save",async()=>{
 const t=runtime("registered"),club=sampleGame("club-original");
 club.club=[{uid:"card-a",pid:"player-a"}];
 t.store.set("gerliesFutV9",JSON.stringify(club));t.store.set("footera-cloud-owner","earlier-owner");
 t.win.FooteraBackup.inspect=async()=>({state:JSON.parse(JSON.stringify(club))});t.win.confirm=()=>true;
 await t.win.FooteraAccount.beginLocalTransfer({size:30,text:async()=>""},"confirmed@example.org");
 t.setUser({id:"new-verified-user",email:"confirmed@example.org",email_confirmed_at:"2026-10-12",is_anonymous:false});
 t.store.set("footera-cloud-owner","new-verified-user");
 t.setCloud({save_data:sampleGame("different-club"),revision:1,saved_at:"2026-10-12"});
 assert.equal(await t.win.FooteraAccount.reconcileCompletedTransfer(await t.win.FooteraAccount.user()),false);
 assert.equal(t.store.has("footera-local-account-transfer-v1"),true);
 assert.equal(t.calls.filter(x=>x[0]==="cloud").length,0);
});
test("verified account never automatically opens the account modal solely for transfer markers",()=>{
 assert.doesNotMatch(js,/\|\|pendingLocalTransfer\(\)\|\|shouldWelcome\(\)\)show\(\)/);
 assert.match(js,/else if\(pendingEmail\(\)\|\|pendingLocalTransfer\(\)\|\|root\.location\.hash\.includes\("access_token"\)\|\|root\.location\.search\.includes\("code="\)\)show\(\)/);
});

test("completed verified account remains in game on stale callback URLs, without forced account dialog",()=>{
 assert.match(js,/if\(callbackError\|\|shouldWelcome\(\)\)show\(\)/);
 assert.doesNotMatch(js,/if\(root\.location\.hash\.includes\("access_token"\)\|\|root\.location\.search\.includes\("code="\)\|\|callbackError\|\|shouldWelcome\(\)\)show\(\)/);
 assert.match(js,/else if\(pendingEmail\(\)\|\|pendingLocalTransfer\(\)\|\|root\.location\.hash\.includes\("access_token"\)\|\|root\.location\.search\.includes\("code="\)\)show\(\)/);
});
test("completed transfer restarts online setup after clearing stale marker without cloud writes",async()=>{
 const t=runtime("registered"),club=sampleGame("same-save");
 club.club=[{uid:"fixture",pid:"player"}];
 t.store.set("gerliesFutV9",JSON.stringify(club));
 t.store.set("footera-cloud-owner","original-guest");
 t.win.FooteraBackup.inspect=async()=>({state:JSON.parse(JSON.stringify(club))});
 t.win.confirm=()=>true;
 await t.win.FooteraAccount.beginLocalTransfer({size:100,text:async()=>"backup"},"new@example.org");
 let starts=0;
 t.win.setTimeout=fn=>fn();
 t.win.FooteraOnline.init=async()=>{starts++;assert.equal(t.store.has("footera-local-account-transfer-v1"),false)};
 t.setUser({id:"new-owner",email:"new@example.org",email_confirmed_at:"2026-10-12",is_anonymous:false});
 t.store.set("footera-cloud-owner","new-owner");
 t.setCloud({save_data:JSON.parse(JSON.stringify(club)),revision:1,saved_at:"2026-10-12"});
 assert.equal(await t.win.FooteraAccount.reconcileCompletedTransfer(await t.win.FooteraAccount.user()),true);
 await Promise.resolve();
 assert.equal(starts,1);
 assert.equal(t.calls.filter(v=>v[0]==="cloud").length,0);
});
test("blocked online startup must remain retryable after ownership reconciliation",()=>{
 assert.match(online,/Konto-Wechsel vorbereitet: erst die bestätigte E-Mail und Vereinsübernahme abschließen\."\;\s*started=null/);
 assert.match(online,/Gastkonto wird nicht automatisch neu erstellt\."\;\s*started=null/);
});

test("live online schema accepts every formation offered by the Footera squad editor",()=>{
 const html=require('./helpers/app-html.cjs')();
 const migration=fs.readFileSync(path.join(__dirname,"../online/footera-online-formations-v21.128.sql"),"utf8");
 const found=html.match(/const SQUAD_FORMATION_NAMES=(\[[^;]+\]);/);
 assert.ok(found,"squad formation list missing");
 const names=JSON.parse(found[1]);
 assert.equal(names.length,11);
 for(const formation of names){
   assert.ok(migration.includes("'"+formation+"'::text"),"Online database excludes "+formation);
 }
 assert.match(migration,/add constraint footera_online_profiles_formation_check/);
});
test("verified FC Gerlies account retries online initialization and provides friend code errors",()=>{
 assert.match(js,/if\(!online\.ready\)await online\.init\(\)/);
 assert.match(js,/const code=await online\.getFriendCode\?\.\(\)/);
 assert.match(js,/Online-Fehler:/);
 assert.match(online,/formation:state\.formation/);
});

test('pick delivery resumes after a lost response and records the committed cloud revision',async()=>{
 const t=runtime('registered'),s=sampleGame();
 t.store.set('gerliesFutV9',JSON.stringify(s));t.store.set('footera-cloud-owner','existing-a');
 t.store.set('footera-cloud-sync-point-v1',JSON.stringify({userId:'existing-a',saveId:'club-a',revision:1}));t.setCloud({save_data:s,revision:1});
 let attempts=0,applied=0;
 const item={uid:'pick-a',pid:'123',playerPickId:'pick-a',tradeable:false,baseSnapshot:{id:'123'}};
 const saved={...s,club:[item],playerPickClaims:{'pick-a':'option-a'}};
 t.client.rpc=async(name,args)=>{
  assert.equal(name,'footera_choose_player_pick');assert.equal(args.p_base_revision,1);
  if(++attempts===1){t.setCloud({save_data:saved,revision:2});throw Error('Network interrupted')}
  return{data:{pick_id:'pick-a',item,save_data:saved,revision:2}};
 };
 await assert.rejects(t.win.FooteraAccount.choosePlayerPick('pick-a','option-a',()=>applied++),/Network/);
 assert.equal(t.win.FooteraAccount.pendingPlayerPick().revision,1);assert.equal(applied,0);
 await t.win.FooteraAccount.choosePlayerPick('pick-a','option-a',()=>applied++);
 assert.equal(applied,1);assert.equal(t.win.FooteraAccount.pendingPlayerPick(),null);
 assert.equal(JSON.parse(t.store.get('footera-cloud-sync-point-v1')).revision,2);
});

test('pick delivery reconciles an identical remote save at a newer revision',async()=>{
 const t=runtime('registered'),s=sampleGame();
 t.store.set('gerliesFutV9',JSON.stringify(s));t.store.set('footera-cloud-owner','existing-a');
 t.store.set('footera-cloud-sync-point-v1',JSON.stringify({userId:'existing-a',saveId:'club-a',revision:1}));
 t.setCloud({save_data:JSON.parse(JSON.stringify(s)),revision:3});
 const item={uid:'pick-a',pid:'123',playerPickId:'pick-a',tradeable:false,baseSnapshot:{id:'123'}};
 const saved={...s,club:[item],playerPickClaims:{'pick-a':'option-a'}};
 let applied=0;
 t.client.rpc=async(name,args)=>{
   assert.equal(name,'footera_choose_player_pick');
   assert.equal(args.p_base_revision,3);
   return{data:{pick_id:'pick-a',item,save_data:saved,revision:4}};
 };
 await t.win.FooteraAccount.choosePlayerPick('pick-a','option-a',()=>applied++);
 assert.equal(applied,1);
 assert.equal(JSON.parse(t.store.get('footera-cloud-sync-point-v1')).revision,4);
 assert.equal(t.win.FooteraAccount.pendingPlayerPick(),null);
});

test('pick delivery refuses a newer DIFFERENT cloud save without rewriting it',async()=>{
 const t=runtime('registered'),s=sampleGame();t.store.set('gerliesFutV9',JSON.stringify(s));t.store.set('footera-cloud-owner','existing-a');
 t.store.set('footera-cloud-sync-point-v1',JSON.stringify({userId:'existing-a',saveId:'club-a',revision:1}));
 t.setCloud({save_data:{...s,coins:Number(s.coins||0)+1},revision:3});
 await assert.rejects(t.win.FooteraAccount.choosePlayerPick('pick-a','option-a',()=>{}),/nicht synchron/);
 assert.equal(t.calls.length,0);
});

test('cloud revision drift with identical contents re-adopts revision without an upload',async()=>{
 const t=runtime('registered'),save=sampleGame();
 t.store.set('footera-cloud-owner','existing-a');t.store.set('gerliesFutV9',JSON.stringify(save));
 t.store.set('footera-cloud-sync-point-v1',JSON.stringify({userId:'existing-a',saveId:'club-a',revision:1,hash:'old'}));
 t.setCloud({save_data:JSON.parse(JSON.stringify(save)),revision:13,saved_at:'2026-10-13'});
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.calls.filter(x=>x[0]==='cloud').length,0);
 assert.equal(JSON.parse(t.store.get('footera-cloud-sync-point-v1')).revision,13);
});
test('DIVERGED cloud revision refuses overwrite, preserving cloud-only cards and points',async()=>{
 const t=runtime('registered'),remote={...sampleGame(),points:335000,coins:981600,club:[{uid:'cloud-card',pid:'123'}]},
  local={...sampleGame(),points:324100,coins:1545805,club:[{uid:'device-card',pid:'456'}]};
 t.store.set('footera-cloud-owner','existing-a');t.store.set('gerliesFutV9',JSON.stringify(local));
 t.store.set('footera-cloud-sync-point-v1',JSON.stringify({userId:'existing-a',saveId:'club-a',revision:1,hash:'old'}));
 t.setCloud({save_data:remote,revision:13,saved_at:'2026-10-13'});
 let backedUp=null,confirmed=false;
 t.win.FooteraBackup.downloadSnapshot=async(s,tag)=>{backedUp={save:s,tag}};
 t.win.confirm=()=>{confirmed=true;return true};
 await assert.rejects(t.win.FooteraAccount.saveCloud(),/Sicherheitsstopp/);
 assert.equal(backedUp.save.points,335000);
 assert.match(backedUp.tag,/Cloud_V13/);
 assert.equal(confirmed,false,'never present an unsafe replace confirmation');
 assert.equal(t.calls.filter(x=>x[0]==='cloud').length,0);
 assert.equal(JSON.parse(t.store.get('footera-cloud-sync-point-v1')).revision,1);
 assert.equal(JSON.parse(t.store.get('gerliesFutV9')).coins,1545805);
});

test('normal save with known current revision still writes via CAS',async()=>{
 const t=runtime('registered'),remote=sampleGame(),local={...remote,coins:7100};
 t.store.set('footera-cloud-owner','existing-a');t.store.set('gerliesFutV9',JSON.stringify(local));
 t.store.set('footera-cloud-sync-point-v1',JSON.stringify({userId:'existing-a',saveId:'club-a',revision:13,hash:'old'}));
 t.setCloud({save_data:remote,revision:13,saved_at:'2026-10-13'});
 let backedUp=null,confirmed=false;
 t.win.FooteraBackup.downloadSnapshot=async(s,tag)=>{backedUp={s,tag}};
 t.win.confirm=()=>{confirmed=true;return true};
 assert.equal(await t.win.FooteraAccount.saveCloud(),true);
 assert.equal(confirmed,true);
 assert.equal(backedUp.s.coins,5000);
 assert.equal(t.calls.filter(x=>x[0]==='cloud').length,1);
 assert.equal(t.calls.find(x=>x[0]==='cloud')[1].p_base_revision,13);
 assert.equal(JSON.parse(t.store.get('footera-cloud-sync-point-v1')).revision,14);
});

test('diverged revision with no sync point cannot be silently confirmed',async()=>{
 const t=runtime('registered'),remote=sampleGame(),local={...remote,coins:8400};
 t.store.set('footera-cloud-owner','existing-a');t.store.set('gerliesFutV9',JSON.stringify(local));
 t.setCloud({save_data:remote,revision:13,saved_at:'2026-10-13'});
 t.win.FooteraBackup.downloadSnapshot=async()=>{};
 t.win.confirm=()=>{throw Error('confirmation should not appear')};
 await assert.rejects(t.win.FooteraAccount.saveCloud(),/Sicherheitsstopp/);
 assert.equal(t.calls.length,0);
 assert.equal(t.store.get('footera-cloud-sync-point-v1'),undefined);
});
test('manual conflict cannot destroy a previously committed cloud Player Pick',async()=>{
 const t=runtime('registered'),local=sampleGame();
 const remote={...local,playerPickClaims:{'pick-1':'option-a'},club:[{uid:'pick-1',pid:'123',playerPickId:'pick-1',acquisitionSource:'reward-pick'}]};
 t.store.set('footera-cloud-owner','existing-a');t.store.set('gerliesFutV9',JSON.stringify(local));
 t.setCloud({save_data:remote,revision:13,saved_at:'2026-10-13'});
 let downloaded=0;
 t.win.FooteraBackup.downloadSnapshot=async()=>{downloaded++};
 t.win.confirm=()=>true;
 await assert.rejects(t.win.FooteraAccount.saveCloud(),/Belohnungen/);
 assert.equal(downloaded,0);
 assert.equal(t.calls.length,0);
});
test('missing cloud snapshot exporter never sends a destructive update',async()=>{
 const t=runtime('registered'),local={...sampleGame(),coins:8100};
 t.store.set('footera-cloud-owner','existing-a');t.store.set('gerliesFutV9',JSON.stringify(local));
 t.setCloud({save_data:sampleGame(),revision:13,saved_at:'2026-10-13'});
 t.win.confirm=()=>true;
 await assert.rejects(t.win.FooteraAccount.saveCloud(),/Cloud-Export fehlt/);
 assert.equal(t.calls.length,0);
});

test('an open Player Pick prevents background cloud reads and writes',async()=>{
 const t=runtime('registered');
 t.win.FooteraPlayerPicks={isActive:()=>true};
 t.client.auth.getUser=async()=>{throw Error('background auth must not start')};
 t.client.from=()=>{throw Error('background cloud lookup must not start')};
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.calls.length,0);
});

test('confirming a Pick waits for an already running backup and uses its new revision',async()=>{
 const t=runtime('registered'),s=sampleGame(),events=[];
 t.store.set('gerliesFutV9',JSON.stringify(s));t.store.set('footera-cloud-owner','existing-a');
 t.store.set('footera-cloud-sync-point-v1',JSON.stringify({userId:'existing-a',saveId:'club-a',revision:1,hash:'changed'}));
 t.setCloud({save_data:s,revision:1});
 let release,started;
 const held=new Promise(resolve=>release=resolve),backupStarted=new Promise(resolve=>started=resolve);
 const item={uid:'pick-queued',pid:'123',playerPickId:'pick-queued',tradeable:false,baseSnapshot:{id:'123'}};
 const saved={...s,club:[item],playerPickClaims:{'pick-queued':'option-a'}};
 t.client.rpc=async(name,args)=>{
  if(name==='footera_store_cloud_save'){
   events.push('backup-start');started();await held;
   t.setCloud({save_data:s,revision:2});events.push('backup-finish');return{data:2};
  }
  assert.equal(name,'footera_choose_player_pick');assert.equal(args.p_base_revision,2);
  events.push('pick');return{data:{pick_id:'pick-queued',item,save_data:saved,revision:3}};
 };
 const backup=t.win.FooteraAccount.autoAttachAndBackup();await backupStarted;
 t.win.FooteraPlayerPicks={isActive:()=>true};
 let applied=0;
 const claim=t.win.FooteraAccount.choosePlayerPick('pick-queued','option-a',()=>applied++);
 await Promise.resolve();assert.deepEqual(events,['backup-start']);
 release();await Promise.all([backup,claim]);
 assert.deepEqual(events,['backup-start','backup-finish','pick']);
 assert.equal(applied,1);
 assert.equal(JSON.parse(t.store.get('footera-cloud-sync-point-v1')).revision,3);
 assert.equal(t.win.FooteraAccount.pendingPlayerPick(),null);
});

test('normal Pick claim uses local auth and small revision metadata, without remote auth checks',async()=>{
 const t=runtime('registered'),s=sampleGame();
 t.store.set('gerliesFutV9',JSON.stringify(s));t.store.set('footera-cloud-owner','existing-a');
 t.store.set('footera-cloud-sync-point-v1',JSON.stringify({userId:'existing-a',saveId:'club-a',revision:2}));
 let sessionReads=0,applied=0;
 t.client.auth.getSession=async()=>{sessionReads++;return {data:{session:{user:{id:'existing-a',is_anonymous:false,email_confirmed_at:'2026-10-11'}}}}};
 t.client.auth.getUser=async()=>{throw Error('unnecessary remote auth round-trip')};
 t.client.from=table=>({select:fields=>{
  assert.equal(table,'footera_cloud_saves');assert.equal(fields,'revision,saved_at');
  return{maybeSingle:async()=>({data:{revision:2}})};
 }});
 const item={uid:'pick-fast',pid:'123',playerPickId:'pick-fast',tradeable:false,baseSnapshot:{id:'123'}};
 const saved={...s,club:[item],playerPickClaims:{'pick-fast':'option-a'}};
 t.client.rpc=async(name,args)=>{
  assert.equal(name,'footera_choose_player_pick');assert.equal(args.p_base_revision,2);
  return{data:{pick_id:'pick-fast',item,save_data:saved,revision:3}};
 };
 await t.win.FooteraAccount.choosePlayerPick('pick-fast','option-a',()=>applied++);
 assert.equal(applied,1);assert.equal(sessionReads,2);assert.equal(t.win.FooteraAccount.pendingPlayerPick(),null);
});

test('account switch during Pick delivery cannot apply a card to the other local account',async()=>{
 const t=runtime('registered'),s=sampleGame();
 t.store.set('gerliesFutV9',JSON.stringify(s));t.store.set('footera-cloud-owner','existing-a');
 t.store.set('footera-cloud-sync-point-v1',JSON.stringify({userId:'existing-a',saveId:'club-a',revision:1}));t.setCloud({save_data:s,revision:1});
 let uid='existing-a',applied=0;
 t.client.auth.getSession=async()=>({data:{session:{user:{id:uid,is_anonymous:false,email_confirmed_at:'2026-10-11'}}}});
 const item={uid:'pick-switch',pid:'123',playerPickId:'pick-switch',tradeable:false,baseSnapshot:{id:'123'}};
 t.client.rpc=async()=>{
  uid='other-user';
  return{data:{pick_id:'pick-switch',item,save_data:{...s,club:[item]},revision:2}};
 };
 await assert.rejects(t.win.FooteraAccount.choosePlayerPick('pick-switch','option-a',()=>applied++),/Konto wurde gewechselt/);
 assert.equal(applied,0);assert.ok(t.win.FooteraAccount.pendingPlayerPick());
});

test('first cloud backup initializes online services without restarting the game',async()=>{
 const t=runtime('registered');let initialized=0;
 t.store.set('footera-cloud-owner','existing-a');t.store.set('gerliesFutV9',JSON.stringify(sampleGame()));
 t.win.FooteraOnline.ready=false;
 t.win.FooteraOnline.init=async()=>{initialized++;t.win.FooteraOnline.ready=true};
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(initialized,1);assert.equal(t.wasReloaded(),false);
 assert.equal(t.calls.filter(x=>x[0]==='cloud').length,1);
});

// V21.234: a guest's club must survive registration in another browser
// (Snapchat/Instagram/TikTok in-app browsers keep separate storage).
const guestSql=fs.readFileSync(path.join(__dirname,"../online/footera-guest-cloud-v21.234.sql"),"utf8");
test("guest club is backed up to its own cloud row without claiming device ownership",async()=>{
 const t=runtime("guest");
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame("guest-club")));
 await t.win.FooteraAccount.autoAttachAndBackup();
 const uploads=t.calls.filter(x=>x[0]==="cloud");
 assert.equal(uploads.length,1);
 assert.equal(uploads[0][1].p_base_revision,0);
 assert.equal(uploads[0][1].p_save.profile.saveId,"guest-club");
 assert.equal(t.store.get("footera-cloud-owner"),undefined);
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.calls.filter(x=>x[0]==="cloud").length,1,"unchanged club is not uploaded again");
 const changed=sampleGame("guest-club");changed.coins=7000;
 t.store.set("gerliesFutV9",JSON.stringify(changed));
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.calls.filter(x=>x[0]==="cloud").at(-1)[1].p_base_revision,1);
});
test("guest never overwrites a cloud revision it did not write",async()=>{
 const t=runtime("guest");
 const other=sampleGame("guest-club");other.coins=99999;
 t.setCloud({save_data:other,revision:4,saved_at:"2026-10-23"});
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame("guest-club")));
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.calls.filter(x=>x[0]==="cloud").length,0);
});
test("guest backup stays silent while the database update is missing",async()=>{
 const t=runtime("guest");let tries=0;
 t.client.rpc=async()=>{tries++;return{error:{code:"42501",message:"Dauerhaftes Footera-Konto erforderlich"}}};
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame("guest-club")));
 await t.win.FooteraAccount.autoAttachAndBackup();
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(tries,1);
 assert.equal(JSON.parse(t.store.get("gerliesFutV9")).profile.saveId,"guest-club");
});
test("guest of another local owner is never backed up",async()=>{
 const t=runtime("guest");
 t.store.set("footera-cloud-owner","existing-a");
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame("club-a")));
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.calls.filter(x=>x[0]==="cloud").length,0);
});
test("guest registration puts the club into the cloud before the confirmation mail",async()=>{
 const t=runtime("guest");
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame("guest-club")));
 await t.win.FooteraAccount.emailRegister("hsv@example.org","");
 const order=t.calls.map(x=>x[0]);
 assert.ok(order.indexOf("cloud")>=0&&order.indexOf("cloud")<order.indexOf("update"),order.join(","));
 assert.equal(t.calls.find(x=>x[0]==="update")[1].email,"hsv@example.org");
 assert.equal(t.store.get("footera-cloud-owner"),"guest-a");
});
test("confirmed account in a new browser restores the upgraded guest club",async()=>{
 const t=runtime("registered");
 t.setCloud({save_data:sampleGame("guest-club"),revision:2,saved_at:"2026-10-23"});
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.wasReloaded(),true);
 assert.equal(JSON.parse(t.store.get("gerliesFutV9")).profile.saveId,"guest-club");
});
function offerRuntime(){
 const t=runtime("registered");
 const save=sampleGame("guest-club");save.profile.clubName="HSV FC";save.coins=900;
 t.setGuestOffer({guest_id:"guest-old",save_id:"guest-club",club_name:"HSV FC",cards:12,coins:900,saved_at:"2026-10-23T05:12:00Z",save});
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame("new-club")));
 t.store.set("footera-cloud-owner","existing-a");
 t.setCloud({save_data:sampleGame("new-club"),revision:1,saved_at:"2026-10-23"});
 let downloads=[];
 t.win.FooteraBackup.downloadSnapshot=async(s,tag)=>{downloads.push([s.profile.saveId,tag])};
 return {...t,downloads};
}
test("new account adopts the guest club only after confirmation, keeping a fallback",async()=>{
 const t=offerRuntime();
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.ok(t.calls.some(x=>x[0]==="offer"));
 t.win.confirm=()=>false;
 assert.equal(await t.win.FooteraAccount.claimGuestSave(),false);
 assert.equal(t.calls.filter(x=>x[0]==="claim").length,0);
 assert.equal(JSON.parse(t.store.get("gerliesFutV9")).profile.saveId,"new-club");
 t.win.confirm=()=>true;
 assert.equal(await t.win.FooteraAccount.claimGuestSave(),true);
 const claim=t.calls.find(x=>x[0]==="claim")[1];
 assert.equal(claim.p_guest,"guest-old");
 assert.equal(claim.p_base_revision,1);
 assert.deepEqual(t.downloads,[["new-club","Vor_Gast_Uebernahme"]]);
 assert.equal(JSON.parse(t.store.get("footera-before-restore")).profile.saveId,"new-club");
 assert.equal(JSON.parse(t.store.get("gerliesFutV9")).profile.clubName,"HSV FC");
 assert.equal(t.store.get("footera-cloud-owner"),"existing-a");
 assert.equal(JSON.parse(t.store.get("footera-cloud-sync-point-v1")).revision,2);
 assert.equal(t.wasReloaded(),true);
});
test("guest club already on this device is not offered again",async()=>{
 const t=offerRuntime();
 t.store.set("gerliesFutV9",JSON.stringify(sampleGame("guest-club")));
 await t.win.FooteraAccount.autoAttachAndBackup();
 await assert.rejects(t.win.FooteraAccount.claimGuestSave(),/Kein Gast-Verein/);
});
test("guest cloud migration keeps ownership, revision and reward protection",()=>{
 assert.match(guestSql,/for select to authenticated using \(user_id = \(select auth\.uid\(\)\)\)/);
 assert.match(guestSql,/where public\.footera_cloud_saves\.revision=p_base_revision/);
 assert.match(guestSql,/Bestätigte Pack-Käufe dürfen nicht verloren gehen/);
 assert.match(guestSql,/g\.is_anonymous\s+and lower\(g\.email_change\)=lower\(me\.email\)/);
 assert.match(guestSql,/me\.email_confirmed_at is not null/);
 assert.match(guestSql,/replaced_cloud_saves/);
 assert.match(guestSql,/revoke all on function public\.footera_claim_guest_save\(uuid,bigint\) from public,anon,authenticated/);
 assert.match(js,/Snapchat\|Instagram/);
});



test('PC cloud save restores full PC progress on phone, not just the saved timestamp',async()=>{
 const pc=runtime('registered'),phone=runtime('registered');
 const baseline={...sampleGame(),coins:3479390,points:307400,champions:{games:1,wins:1,losses:0},club:[{uid:'card-old',pid:'old'}]};
 const latest={...baseline,coins:4182350,points:294300,champions:{games:6,wins:5,losses:1},club:[...baseline.club,{uid:'card-new',pid:'new'}]};
 const phoneOld={...baseline,coins:3736540,champions:{games:4,wins:4,losses:0}};
 pc.store.set('footera-cloud-owner','existing-a');
 pc.store.set('gerliesFutV9',JSON.stringify(baseline));
 pc.setCloud({save_data:baseline,revision:98,saved_at:'2026-10-25T14:00:00Z'});
 pc.win.confirm=()=>true;
 pc.win.FooteraBackup.downloadSnapshot=async()=>{};
 await pc.win.FooteraAccount.saveCloud(); // establish a real matching PC sync point
 pc.store.set('gerliesFutV9',JSON.stringify(latest));
 await pc.win.FooteraAccount.saveCloud();
 const commit=pc.calls.filter(x=>x[0]==='cloud').at(-1);
 assert.equal(commit[1].p_base_revision,98);
 assert.equal(commit[1].p_save.champions.wins,5);
 const storedOnServer={save_data:commit[1].p_save,revision:99,saved_at:'2026-10-25T17:45:00Z'};
 phone.store.set('footera-cloud-owner','existing-a');
 phone.store.set('gerliesFutV9',JSON.stringify(phoneOld));
 phone.store.set('footera-cloud-sync-point-v1',JSON.stringify({userId:'existing-a',saveId:'club-a',revision:98,hash:'old'}));
 phone.setCloud(storedOnServer);
 let prompt='';
 phone.win.confirm=t=>{prompt=t;return true};
 assert.equal(await phone.win.FooteraAccount.restoreCloud(),true);
 assert.match(prompt,/4.182.350/);
 assert.match(prompt,/3.736.540/);
 assert.match(prompt,/5 Siege/);
 assert.equal(phone.wasReloaded(),true);
 const loaded=JSON.parse(phone.store.get('gerliesFutV9'));
 assert.equal(loaded.coins,latest.coins);
 assert.equal(loaded.points,latest.points);
 assert.deepEqual(loaded.club,latest.club);
 assert.deepEqual(loaded.champions,latest.champions);
 assert.equal(JSON.parse(phone.store.get('footera-before-restore')).coins,phoneOld.coins);
 assert.equal(JSON.parse(phone.store.get('footera-cloud-sync-point-v1')).revision,99);
 await phone.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(phone.calls.filter(x=>x[0]==='cloud').length,0,'phone must not silently re-upload stale progress');
});
test('phone waits for in-flight background cloud check before an explicit restore',async()=>{
 const t=runtime('registered'),local={...sampleGame(),coins:100},latest={...sampleGame(),coins:98765};
 t.store.set('footera-cloud-owner','existing-a');
 t.store.set('gerliesFutV9',JSON.stringify(local));
 t.setCloud({save_data:latest,revision:4,saved_at:'2026-10-25T18:00:00Z'});
 let release,started;
 const hold=new Promise(resolve=>release=resolve),entered=new Promise(resolve=>started=resolve);
 let first=true;
 t.client.from=()=>({select:()=>({maybeSingle:async()=>{
  if(first){first=false;started();await hold}
  return{data:{save_data:latest,revision:4,saved_at:'2026-10-25T18:00:00Z'},error:null};
 }})});
 t.win.confirm=()=>true;
 const background=t.win.FooteraAccount.autoAttachAndBackup();
 await entered;
 const requested=t.win.FooteraAccount.restoreCloud();
 release();
 await background;
 assert.equal(await requested,true);
 assert.equal(JSON.parse(t.store.get('gerliesFutV9')).coins,98765);
 assert.equal(t.wasReloaded(),true);
 assert.equal(t.calls.filter(x=>x[0]==='cloud').length,0);
});
test('cloud changes during phone confirmation block obsolete restore without destroying either save',async()=>{
 const t=runtime('registered'),local={...sampleGame(),coins:100},remote={...sampleGame(),coins:200};
 t.store.set('footera-cloud-owner','existing-a');
 t.store.set('gerliesFutV9',JSON.stringify(local));
 t.setCloud({save_data:remote,revision:5,saved_at:'2026-10-25T18:00:00Z'});
 t.win.confirm=()=>{t.setCloud({save_data:{...remote,coins:300},revision:6,saved_at:'2026-10-25T18:05:00Z'});return true};
 await assert.rejects(t.win.FooteraAccount.restoreCloud(),/Cloud wurde auf einem anderen Gerät aktualisiert/);
 assert.equal(JSON.parse(t.store.get('gerliesFutV9')).coins,100);
 assert.equal(t.store.has('footera-cloud-sync-point-v1'),false);
 assert.equal(t.wasReloaded(),false);
});
test('an actual account switch while confirming cloud restore never replaces the current club',async()=>{
 const t=runtime('registered'),local={...sampleGame(),coins:100},remote={...sampleGame(),coins:200};
 t.store.set('footera-cloud-owner','existing-a');
 t.store.set('gerliesFutV9',JSON.stringify(local));
 t.setCloud({save_data:remote,revision:5,saved_at:'2026-10-25T18:00:00Z'});
 t.win.confirm=()=>{t.setUser({id:'different-account',is_anonymous:false});return true};
 await assert.rejects(t.win.FooteraAccount.restoreCloud(),/Konto während des Ladens gewechselt/);
 assert.equal(JSON.parse(t.store.get('gerliesFutV9')).coins,100);
 assert.equal(t.wasReloaded(),false);
});
function conflictRuntime(){
 const t=runtime('registered'),remote={...sampleGame(),coins:3479390,points:307400,champions:{games:1,wins:1,losses:0}},local={...sampleGame(),coins:3736540,points:294300,champions:{games:4,wins:4,losses:0}};
 t.store.set('footera-cloud-owner','existing-a');t.store.set('gerliesFutV9',JSON.stringify(local));
 t.store.set('footera-cloud-sync-point-v1',JSON.stringify({userId:'existing-a',saveId:local.profile.saveId,revision:97,hash:'old'}));
 t.setCloud({save_data:remote,revision:98,saved_at:'2026-10-24T20:44:03Z'});
 const snapshots=[],prompts=[];
 t.win.FooteraBackup.downloadSnapshot=async(s,tag)=>snapshots.push({s,tag});
 t.win.confirm=text=>{prompts.push(text);return true};
 return {t,remote,local,snapshots,prompts};
}
test('explicit recovery keeps the selected device wallet and Champions record without merging balances',async()=>{
 const {t,local,snapshots,prompts}=conflictRuntime();
 assert.equal(await t.win.FooteraAccount.resolveCloudConflict(),true);
 assert.deepEqual(snapshots.map(x=>x.tag),['Cloud_V98','Geraet_vor_Cloudwechsel']);
 assert.match(prompts[0],/3.736.540/);assert.match(prompts[0],/4 Siege/);assert.match(prompts[0],/1 Siege/);
 const writes=t.calls.filter(x=>x[0]==='cloud');assert.equal(writes.length,1);
 assert.equal(writes[0][1].p_base_revision,98);
 assert.equal(writes[0][1].p_save.coins,local.coins);
 assert.equal(writes[0][1].p_save.points,294300);
 assert.equal(writes[0][1].p_save.champions.wins,4);
 assert.equal(JSON.parse(t.store.get('footera-cloud-sync-point-v1')).revision,99);
});
test('cancelled recovery preserves both versions and the old sync point',async()=>{
 const {t,local,snapshots}=conflictRuntime();t.win.confirm=()=>false;
 assert.equal(await t.win.FooteraAccount.resolveCloudConflict(),false);
 assert.equal(snapshots.length,2);assert.equal(t.calls.filter(x=>x[0]==='cloud').length,0);
 assert.equal(JSON.parse(t.store.get('gerliesFutV9')).coins,local.coins);
 assert.equal(JSON.parse(t.store.get('footera-cloud-sync-point-v1')).revision,97);
});
test('recovery still protects server-confirmed Player Picks',async()=>{
 const {t,remote}=conflictRuntime();remote.playerPickClaims={'pick-server':'option'};
 await assert.rejects(t.win.FooteraAccount.resolveCloudConflict(),/Belohnungen/);
 assert.equal(t.calls.filter(x=>x[0]==='cloud').length,0);
});
test('failed backup or changed device data prevents recovery writes',async()=>{
 for(const kind of ['export','local-change']){
  const {t,local}=conflictRuntime();
  t.win.FooteraBackup.downloadSnapshot=async()=>{
   if(kind==='export')throw Error('download failed');
   t.store.set('gerliesFutV9',JSON.stringify({...local,coins:1}));
  };
  await assert.rejects(t.win.FooteraAccount.resolveCloudConflict(),/download failed|während des Abgleichs/);
  assert.equal(t.calls.filter(x=>x[0]==='cloud').length,0);
 }
});
test('concurrent cloud update rejects recovery via server revision check',async()=>{
 const {t,remote}=conflictRuntime();
 t.win.confirm=()=>{t.setCloud({save_data:{...remote,coins:99},revision:99,saved_at:'2026-10-24'});return true};
 await assert.rejects(t.win.FooteraAccount.resolveCloudConflict(),/conflict/);
 assert.equal(JSON.parse(t.store.get('footera-cloud-sync-point-v1')).revision,97);
});
test('unchanged second device fast-forwards a newer cloud without uploading its old wallet',async()=>{
 const {t,local}=conflictRuntime();
 // Establish a real sync point using the same production code as a cloud load.
 t.setCloud({save_data:local,revision:97,saved_at:'2026-10-24'});
 await t.win.FooteraAccount.saveCloud();
 const newer={...local,coins:4000000,champions:{wins:5,losses:0,games:5}};
 t.setCloud({save_data:newer,revision:99,saved_at:'2026-10-24'});
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.calls.filter(x=>x[0]==='cloud').length,0);
 assert.equal(JSON.parse(t.store.get('gerliesFutV9')).champions.wins,5);
 assert.equal(JSON.parse(t.store.get('gerliesFutV9')).coins,4000000);
 assert.equal(JSON.parse(t.store.get('footera-before-restore')).coins,local.coins);
 assert.equal(t.wasReloaded(),true);
});
test('independently changed second device never fast-forwards or uploads over the cloud',async()=>{
 const {t,local}=conflictRuntime();
 t.setCloud({save_data:local,revision:97,saved_at:'2026-10-24'});
 await t.win.FooteraAccount.saveCloud();
 t.store.set('gerliesFutV9',JSON.stringify({...local,coins:local.coins+100}));
 t.setCloud({save_data:{...local,coins:999},revision:99,saved_at:'2026-10-24'});
 await t.win.FooteraAccount.autoAttachAndBackup();
 assert.equal(t.calls.filter(x=>x[0]==='cloud').length,0);
 assert.equal(JSON.parse(t.store.get('gerliesFutV9')).coins,local.coins+100);
 assert.equal(t.wasReloaded(),false);
});

test('localStorage quota on rollback no longer blocks a confirmed cloud restore',async()=>{
 const t=runtime('registered');
 const old={...sampleGame(),coins:3736540,points:294300,champions:{games:4,wins:4,losses:0}};
 const cloud={...old,coins:3749465,points:292300,champions:{games:8,wins:6,losses:2}};
 t.store.set('gerliesFutV9',JSON.stringify(old));
 t.store.set('footera-cloud-owner','existing-a');
 t.setCloud({save_data:cloud,revision:99,saved_at:'2026-10-25T00:03:05Z'});
 t.win.confirm=()=>true;
 const writes=[],originalSet=t.win.localStorage.setItem;
 t.win.localStorage.setItem=(key,value)=>{
  if(key==='footera-before-restore')throw Error("Failed to execute 'setItem' on 'Storage': Setting the value exceeded the quota.");
  return originalSet(key,value);
 };
 t.win.FooteraBackup.preserveRollback=async raw=>{writes.push(JSON.parse(raw));};
 assert.equal(await t.win.FooteraAccount.restoreCloud(),true);
 assert.equal(writes.length,1);
 assert.equal(writes[0].coins,3736540);
 assert.equal(JSON.parse(t.store.get('gerliesFutV9')).coins,3749465);
 assert.equal(JSON.parse(t.store.get('gerliesFutV9')).champions.wins,6);
 assert.equal(t.wasReloaded(),true);
 assert.equal(JSON.parse(t.store.get('footera-cloud-sync-point-v1')).revision,99);
});
test('failed persistent rollback preserves device save and does not reload',async()=>{
 const t=runtime('registered');
 const old={...sampleGame(),coins:3736540};
 t.store.set('gerliesFutV9',JSON.stringify(old));
 t.store.set('footera-cloud-owner','existing-a');
 t.setCloud({save_data:{...old,coins:3749465},revision:99,saved_at:'2026-10-25T00:03:05Z'});
 t.win.confirm=()=>true;
 t.win.FooteraBackup.preserveRollback=async()=>{throw Error('Nicht genug Platz für Rückfallsicherung');};
 await assert.rejects(t.win.FooteraAccount.restoreCloud(),/Rückfallsicherung/);
 assert.equal(JSON.parse(t.store.get('gerliesFutV9')).coins,3736540);
 assert.equal(t.wasReloaded(),false);
});

test('earned Rank III receipt reaches cloud before pick synchronization completes',async()=>{
 const t=runtime('registered'),remote=sampleGame();remote.weeklyRewards=[];
 t.store.set('footera-cloud-owner','existing-a');t.store.set('gerliesFutV9',JSON.stringify(remote));
 t.setCloud({save_data:remote,revision:1});
 await t.win.FooteraAccount.autoAttachAndBackup();
 const local=JSON.parse(t.store.get('gerliesFutV9'));
 local.weeklyRewards=[{mode:'champions',week:'1792774800000',wins:11,rank:'Rang III',claimed:true,reward:{playerPicks:[{},{}]}}];
 t.store.set('gerliesFutV9',JSON.stringify(local));
 await t.win.FooteraAccount.syncPlayerPickRewards();
 const writes=t.calls.filter(x=>x[0]==='cloud');
 assert.equal(writes.length,1);assert.equal(writes[0][1].p_save.weeklyRewards[0].wins,11);
 assert.equal(writes[0][1].p_base_revision,1);
 await t.win.FooteraAccount.syncPlayerPickRewards();
 assert.equal(t.calls.filter(x=>x[0]==='cloud').length,1,'read-only retry must not write again');
});
test('unconfirmed Rank III receipt reports cloud conflict and never overwrites remote progress',async()=>{
 const t=runtime('registered'),remote=sampleGame();remote.weeklyRewards=[];
 const local={...remote,coins:9000,weeklyRewards:[{mode:'champions',week:'1792774800000',wins:11,rank:'Rang III',claimed:true,reward:{playerPicks:[{},{}]}}]};
 t.store.set('footera-cloud-owner','existing-a');t.store.set('gerliesFutV9',JSON.stringify(local));
 t.setCloud({save_data:remote,revision:2});
 await assert.rejects(t.win.FooteraAccount.syncPlayerPickRewards(),/noch nicht in der Cloud bestätigt/);
 assert.equal(t.calls.filter(x=>x[0]==='cloud').length,0);
 assert.equal(JSON.parse(t.store.get('gerliesFutV9')).coins,9000);
});
