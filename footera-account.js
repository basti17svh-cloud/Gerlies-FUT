/* Footera permanent accounts and ownership-checked cloud backups.
 * Guest identities are linked in place. Only verified owners can automatically back up a club.
 * This is NOT a server-authoritative wallet for real-money purchases. */
(function(root){
 "use strict";
 if(!root.FooteraOnline?.available||!root.document)return;
 const OWNER="footera-cloud-owner",KEY="gerliesFutV9",ROLLBACK="footera-before-restore",WELCOME="footera-account-welcome-v1",PENDING_EMAIL="footera-pending-email-v1",EMAIL_CHANGE="footera-account-email-change-v1",REGISTERED_HERE="footera-register-owner-v1",SYNC_POINT="footera-cloud-sync-point-v1";
 const maxLength=12*1024*1024;
 let client=null,dialog=null,notice=null,profilePage=null,deleteDialog=null,busy=false,recovery=false,autoBusy=false,autoStatus="",autoTimer=null,deleteBusy=false;
 const $=id=>document.getElementById(id);
 const safeMessage=e=>{
   const messages={invalid_credentials:"E-Mail oder Passwort stimmt nicht.",email_not_confirmed:"Bitte zuerst deine E-Mail-Adresse bestätigen.",email_exists:"Diese E-Mail-Adresse ist bereits registriert. Bitte anmelden oder Passwort vergessen verwenden.",user_already_exists:"Diese E-Mail-Adresse ist bereits registriert. Bitte anmelden oder Passwort vergessen verwenden.",over_email_send_rate_limit:"Zu viele E-Mail-Anfragen. Bitte warte etwas und versuche es erneut.",otp_expired:"Der Bestätigungslink ist abgelaufen oder bereits verwendet. Bitte einen neuen Link anfordern."};
   return messages[e?.code]||String(e?.message||e||"Unbekannter Fehler").slice(0,230);
 };
 const callbackURL=()=>new URL("./",root.location.href).href;
 const account=()=>client?.auth.getUser();
 function msg(text,isError=false){
   const target=notice||$("footeraAccountMessage");if(!target)return;
   target.textContent=text;target.dataset.error=isError?"1":"0";
 }
 function isPermanent(u){return !!u&&!u.is_anonymous;}
 function checkedEmail(value){
   const email=String(value||"").trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error("Bitte eine gültige E-Mail-Adresse eingeben.");
   return email;
 }
 function pendingEmail(){
   try{const v=JSON.parse(root.localStorage.getItem(PENDING_EMAIL)||"null");
     return v&&typeof v.email==="string"?v:null;
   }catch(_){return null;}
 }
 function rememberPending(email,userId,kind="email_change"){
   root.localStorage.setItem(PENDING_EMAIL,JSON.stringify({email,userId:userId||null,kind}));
 }
 function clearPending(){root.localStorage.removeItem(PENDING_EMAIL);}
 function pendingAccountEmailChange(){
   try{
     const request=JSON.parse(root.localStorage.getItem(EMAIL_CHANGE)||"null");
     if(!request||typeof request.newEmail!=="string"||typeof request.userId!=="string"
       ||!Number.isFinite(request.createdAt)||Date.now()-request.createdAt>7*86400000)return null;
     return request;
   }catch(_){return null}
 }
 function acknowledgeAccountEmailChange(u){
   const request=pendingAccountEmailChange();
   if(!u||!request||request.userId!==u.id)return false;
   if(String(u.email||"").toLowerCase()!==request.newEmail)return false;
   root.localStorage.removeItem(EMAIL_CHANGE);
   return true;
 }
 async function requestAccountEmailChange(value){
   const {c,u}=await requirePermanent();
   if(!u.email_confirmed_at)throw Error("Bitte bestätige zuerst deine bisherige E-Mail-Adresse.");
   const newEmail=checkedEmail(value);
   const previousEmail=String(u.email||"").toLowerCase();
   if(newEmail===previousEmail)throw Error("Die neue E-Mail-Adresse muss sich von der bisherigen unterscheiden.");
   const cloud=await cloudInfo();
   if(!cloud?.save_data?.profile?.clubName||!Array.isArray(cloud.save_data.club))
     throw Error("Dein Vereins-Spielstand ist noch nicht sicher in der Cloud gespeichert. Bitte erst den Verein sichern.");
   if(root.localStorage.getItem(OWNER)===u.id&&hasLocalGame()){
     let saved=null;
     try{saved=localData()}catch(e){throw Error("Der lokale Spielstand konnte nicht geprüft werden: "+safeMessage(e))}
     if(saved?.profile?.saveId!==cloud.save_data.profile.saveId)
       throw Error("Cloud und lokaler Verein stimmen nicht überein. Bitte die Cloud-Sicherung vor einem E-Mail-Wechsel prüfen.");
     if(!structurallyEqual(saved,cloud.save_data))
       throw Error("Der lokale Verein enthält noch nicht gesicherte Änderungen. Bitte zuerst auf 'Spielstand sichern' tippen und dann erneut versuchen.");
   }
   if(!root.confirm("E-Mail-Adresse dieses bestehenden Footera-Kontos ändern?\n\nBisher: "+previousEmail+"\nNeu: "+newEmail+"\n\nVerein und Cloud-Sicherung bleiben derselben Konto-ID zugeordnet. Bitte bestätige die Nachrichten von Supabase in deinen Postfächern."))return;
   const result=await c.auth.updateUser({email:newEmail},{emailRedirectTo:callbackURL()});
   if(result.error)throw result.error;
   root.localStorage.setItem(EMAIL_CHANGE,JSON.stringify({
     userId:u.id,newEmail,previousEmail,createdAt:Date.now()
   }));
   $("footeraNewEmail").value="";
   msg("E-Mail-Wechsel angefordert. Öffne die Bestätigungslinks von Supabase in der bisherigen und der neuen Mailbox (je nach Kontoeinstellungen). Nicht abmelden oder ein neues Konto erstellen.");
 }
 function prepareSaveReplacement(){
   if(typeof flushSave==="function")flushSave();
   // pagehide and delayed game writes must not restore the previous in-memory club.
   root.FooteraAccountReplacingSave=true;
 }
 function registrationOwner(){
   try{return JSON.parse(root.localStorage.getItem(REGISTERED_HERE)||"null")?.userId||null}catch(_){return null}
 }
 function noteVerifiedRegistration(u){
   const pending=pendingEmail();
   if(u&&!u.is_anonymous&&u.email_confirmed_at&&pending?.email===String(u.email||"").toLowerCase()&&(!pending.userId||pending.userId===u.id)){
     root.localStorage.setItem(REGISTERED_HERE,JSON.stringify({userId:u.id}));
     if(pending.kind==="signup")clearPending(); // Password was already chosen at signup.
   }
 }
 function syncPoint(u){
   try{const p=JSON.parse(root.localStorage.getItem(SYNC_POINT)||"null");return p?.userId===u.id?p:null}catch(_){return null}
 }
 function fingerprint(s){
   const raw=JSON.stringify(s);let h=2166136261;
   for(let i=0;i<raw.length;i++)h=Math.imul(h^raw.charCodeAt(i),16777619);
   return (h>>>0).toString(16)+":"+raw.length;
 }
 function savePoint(u,s,revision){
   root.localStorage.setItem(SYNC_POINT,JSON.stringify({userId:u.id,saveId:s.profile?.saveId||null,revision,hash:fingerprint(s)}));
 }
 function structurallyEqual(a,b){
   const norm=v=>Array.isArray(v)?v.map(norm):v&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,norm(v[k])])):v;
   return JSON.stringify(norm(a))===JSON.stringify(norm(b));
 }
 function hasLocalGame(){
   const raw=root.localStorage.getItem(KEY)||root.localStorage.getItem("uc27v7");
   if(!raw)return false;
   try{
     const s=JSON.parse(raw);
     // Boot also saves an empty baseState. It is not an established club.
     return !!(s.onboarded||s.profile?.username||s.club?.length);
   }catch(_){return true} // Never replace an unreadable existing save automatically.
 }


 // Existing clubs are never interrupted by the introductory choice.
 function shouldWelcome(){
   return !root.localStorage.getItem(WELCOME)
     && !hasLocalGame();
 }
 async function continueAsGuest(){
   const c=await getClient();
   let u=await user();
   if(!u){
     const result=await c.auth.signInAnonymously();
     if(result.error)throw result.error;
     u=result.data?.user||result.data?.session?.user;
     if(!u?.is_anonymous)throw Error("Gastkonto konnte nicht erstellt werden.");
   }
   // A permanent account must never be replaced with a new guest identity.
   root.localStorage.setItem(WELCOME,"1");
   hide();
 }
 async function getClient(){
   if(!client){
     const ready=await root.FooteraOnline.authClient();
     if(client)return client; // Concurrent mount calls share one auth subscription.
     client=ready;
     client.auth.onAuthStateChange((event)=>{
       if(event==="PASSWORD_RECOVERY")recovery=true;
       root.setTimeout(()=>{
         render().catch(console.warn);
         autoAttachAndBackup().catch(e=>{autoStatus=safeMessage(e);console.warn("Footera Cloud:",e)});
       },0);
     });
   }
   return client;
 }
 async function user(){
   const c=await getClient(),r=await c.auth.getUser();
   if(r.error&&r.error.name!=="AuthSessionMissingError")throw r.error;
   return r.data?.user||null;
 }
 function localData(){
   if(typeof flushSave==="function")flushSave();
   const raw=root.localStorage.getItem(KEY)||root.localStorage.getItem("uc27v7");
   if(!raw)throw Error("Es wurde noch kein lokaler Spielstand gefunden.");
   if(new TextEncoder().encode(raw).length>maxLength)throw Error("Spielstand ist für die Cloud zu groß (max. 12 MB).");
   const parsed=JSON.parse(raw);
   if(!root.FooteraBackup?.validateState)throw Error("Die Spielstand-Prüfung ist nicht geladen.");
   return root.FooteraBackup.validateState(parsed);
 }
 function changeLocked(){
   const blocked=root.FooteraBackup?.blocked?.();
   if(blocked)throw Error("Nicht möglich "+blocked+".");
 }
 async function requirePermanent(){
   const c=await getClient(),u=await user();
   if(!isPermanent(u))throw Error("Bitte zuerst dein E-Mail-Konto registrieren oder anmelden.");
   return {c,u};
 }
 function ensureOwned(u){
   if(root.localStorage.getItem(OWNER)!==u.id){
     throw Error("Dieser lokale Spielstand ist nicht mit dem angemeldeten Konto verbunden. Lade zuerst deine Cloud-Sicherung.");
   }
 }
 async function cloudInfo(metadataOnly=false){
   const {c}=await requirePermanent();
   const fields=metadataOnly?"revision,saved_at":"save_data,revision,saved_at";
   const {data,error}=await c.from("footera_cloud_saves").select(fields).maybeSingle();
   if(error)throw error;
   return data;
 }
 function cloudText(data){
   return data?"Letzte Cloud-Sicherung: "+new Date(data.saved_at).toLocaleString("de-DE")+" · Version "+data.revision:"Noch keine Cloud-Sicherung vorhanden.";
 }
 async function saveCloud(){
   changeLocked();
   const {c,u}=await requirePermanent();
   ensureOwned(u);
   const save=localData(),existing=await cloudInfo();
   if(existing){
     const same=existing.save_data?.profile?.saveId===save.profile?.saveId;
     if(!same)throw Error("Die Cloud enthält einen anderen Verein. Laden und prüfen statt überschreiben.");
     if(!root.confirm("Bestehende Cloud-Sicherung überschreiben?\n\nVerein: "+String(save.profile?.clubName||"Footera")+"\nVorhandene Sicherung: "+new Date(existing.saved_at).toLocaleString("de-DE")))return;
   }
   const {data,error}=await c.rpc("footera_store_cloud_save",{p_save:save,p_base_revision:existing?.revision||0});
   if(error)throw error;
   savePoint(u,save,data);
   msg("Cloud-Sicherung erfolgreich gespeichert (Version "+data+").");
   await render();
 }
 async function restoreCloud(){
   changeLocked();
   const {u}=await requirePermanent(),existing=await cloudInfo();
   if(!existing)throw Error("Für dieses Konto gibt es noch keine Cloud-Sicherung.");
   const s=existing.save_data;
   root.FooteraBackup?.validateState(s);
   const name=String(s.profile?.clubName||"Footera");
   const oldOwner=root.localStorage.getItem(OWNER);
   const warning=oldOwner&&oldOwner!==u.id?"\n\nAchtung: Auf diesem Gerät gehört ein lokaler Spielstand zu einem anderen Konto.":"";
   if(!root.confirm("Cloud-Spielstand laden?\n\nVerein: "+name+"\nSpielerkarten: "+s.club.length+"\nSicherung: "+new Date(existing.saved_at).toLocaleString("de-DE")+"\n\nDein lokaler Spielstand wird ersetzt und vorher als Rückfallsicherung abgelegt."+warning))return;
   changeLocked();
   if(typeof flushSave==="function")flushSave();
   const before=root.localStorage.getItem(KEY);
   if(before!==null)root.localStorage.setItem(ROLLBACK,before);
   prepareSaveReplacement();
   try{
     root.localStorage.setItem(KEY,JSON.stringify(s));
     root.localStorage.setItem(OWNER,u.id);
     savePoint(u,s,existing.revision);
   }catch(e){
     root.FooteraAccountReplacingSave=false;
     if(before!==null)root.localStorage.setItem(KEY,before);
     if(oldOwner===null)root.localStorage.removeItem(OWNER);else root.localStorage.setItem(OWNER,oldOwner);
     throw e;
   }
   root.location.reload();
 }
 // Verified accounts receive an automatic owner link and first cloud backup.
 // Only missing local data may be restored automatically. Existing clubs are never replaced.
 async function autoAttachAndBackup(){
   if(autoBusy)return;
   autoBusy=true;
   try{
     const c=await getClient(),u=await user();
     if(!isPermanent(u))return;
     noteVerifiedRegistration(u);
     const owner=root.localStorage.getItem(OWNER);
     if(owner&&owner!==u.id){
       autoStatus="Dieser lokale Verein gehört bereits zu einem anderen Konto. Keine automatische Übernahme.";
       return;
     }
     const eligible=owner===u.id||registrationOwner()===u.id;
     const localPresent=hasLocalGame();
     if(localPresent&&!eligible)return;
     const cloud=await cloudInfo(!!syncPoint(u)&&localPresent);
     if(!localPresent){
       if(cloud){
         const saved=root.FooteraBackup?.validateState(cloud.save_data);
         if(!saved)throw Error("Cloud-Sicherung konnte nicht geprüft werden.");
         if(hasLocalGame())return; // Club setup may have completed during the request.
         prepareSaveReplacement();
         try{
           root.localStorage.setItem(KEY,JSON.stringify(saved));
           root.localStorage.setItem(OWNER,u.id);
           savePoint(u,saved,cloud.revision);
         }catch(e){root.FooteraAccountReplacingSave=false;throw e}
         root.location.reload();
         return;
       }
       // Account created before club setup: reserve ownership for the new club.
       if(!owner)root.localStorage.setItem(OWNER,u.id);
       return;
     }
     if(!eligible)return; // Never steal an unidentified local/legacy guest.
     if(root.FooteraBackup?.blocked?.())return;
     const save=localData();
     if(!save.onboarded||!save.profile?.username)return;
     if(!cloud){
       const {data,error}=await c.rpc("footera_store_cloud_save",{p_save:save,p_base_revision:0});
       if(error)throw error;
       root.localStorage.setItem(OWNER,u.id);
       savePoint(u,save,data);
       autoStatus="Dein Verein ist automatisch mit deinem Konto verbunden und in der Cloud gesichert.";
       // A verified guest still needs to set a password. Do not interrupt typing
       // with a background reload or hide that required step.
       if(root.FooteraOnline&&!root.FooteraOnline.ready&&pendingEmail()?.kind!=="email_change")root.location.reload();
       return;
     }
     const point=syncPoint(u);
     if(cloud.save_data&&cloud.save_data?.profile?.saveId!==save.profile?.saveId){
       autoStatus="Im Konto ist bereits ein anderer Verein gesichert. Keine automatische Überschreibung.";
       return;
     }
     if(!point){
       if(structurallyEqual(cloud.save_data,save)){
         root.localStorage.setItem(OWNER,u.id);
         savePoint(u,save,cloud.revision);
       }else autoStatus="Der lokale und der Cloud-Spielstand unterscheiden sich. Keine automatische Überschreibung.";
       return;
     }
     if(point.saveId!==save.profile?.saveId||point.revision!==cloud.revision){
       autoStatus="Cloud-Spielstand wurde auf einem anderen Gerät geändert. Automatische Sicherung angehalten.";
       return;
     }
     if(point.hash===fingerprint(save))return;
     const {data,error}=await c.rpc("footera_store_cloud_save",{p_save:save,p_base_revision:point.revision});
     if(error)throw error;
     savePoint(u,save,data);
     autoStatus="Dein Verein wurde automatisch in der Cloud aktualisiert.";
   }finally{autoBusy=false}
 }
 async function adoptLocal(){
   changeLocked();
   const {u}=await requirePermanent();
   const existing=await cloudInfo();
   if(existing)throw Error("Für dieses Konto existiert schon eine Cloud-Sicherung. Lade sie zuerst.");
   const local=localData();
   const owner=root.localStorage.getItem(OWNER);
   if(owner&&owner!==u.id)throw Error("Dieser Spielstand ist bereits einem anderen Konto zugeordnet.");
   if(!root.confirm("Lokalen Verein "+String(local.profile.clubName||"Footera")+" diesem Konto zuordnen?\n\nNur möglich, weil noch keine Cloud-Sicherung besteht. Die bisherige Online-ID dieses Geräts wird dadurch nicht übernommen."))return;
   root.localStorage.setItem(OWNER,u.id);
   msg("Verein zugeordnet. Speichere ihn jetzt in der Cloud.");
   root.location.reload();
 }
 async function google(kind){
   const c=await getClient(),u=await user(),options={redirectTo:callbackURL()};
   if(kind==="switch"&&u?.is_anonymous){
     if(!root.confirm("Mit einem BESTEHENDEN Google-Konto anmelden?\n\nDie bisherige Gast-Online-ID wird dabei NICHT übertragen. Wenn du dein jetziges Gastkonto behalten möchtest, wähle stattdessen 'Google verknüpfen'."))return;
     root.localStorage.setItem(OWNER,"__restore_required__");
     const r=await c.auth.signOut();if(r.error)throw r.error;
   }else if(u?.is_anonymous){
     // Mark this device before OAuth leaves the page, preserving the same user id.
     root.localStorage.setItem(OWNER,u.id);
     const r=await c.auth.linkIdentity({provider:"google",options});
     if(r.error)throw Error(safeMessage(r.error)+". Google-Provider und manuelle Identitäts-Verknüpfung in Supabase aktivieren.");
     return;
   }else if(u&&kind!=="switch"){
     if((u.identities||[]).some(identity=>identity.provider==="google")){
       msg("Google ist bereits mit diesem Footera-Konto verbunden.");return;
     }
     const linked=await c.auth.linkIdentity({provider:"google",options});
     if(linked.error)throw Error(safeMessage(linked.error)+". Bitte Google und manuelle Identitäts-Verknüpfung in Supabase konfigurieren.");
     return;
   }
   const r=await c.auth.signInWithOAuth({provider:"google",options});
   if(r.error)throw r.error;
 }
 async function emailRegister(email,password){
   const c=await getClient(),u=await user(),address=checkedEmail(email);
   if(u?.is_anonymous){
     const owner=root.localStorage.getItem(OWNER);
     if(owner&&owner!==u.id)throw Error("Dieser lokale Verein gehört zu einem anderen Konto. Bitte zuerst das zugehörige Konto anmelden.");
     // Upgrade the existing guest. Password is only allowed after email verification.
     const r=await c.auth.updateUser({email:address},{emailRedirectTo:callbackURL()});
     if(r.error)throw r.error;
     root.localStorage.setItem(OWNER,u.id);
     rememberPending(address,u.id);
     msg("Bestätigungslink an "+address+" verschickt. Öffne ihn auf diesem Gerät und lege danach ein Passwort fest.");
   }else if(u){
     throw Error("Du bist bereits angemeldet. Nutze 'Passwort festlegen / ändern'.");
   }else{
     if(String(password||"").length<10)throw Error("Mindestens 10 Zeichen als Passwort verwenden.");
     const r=await c.auth.signUp({email:address,password,options:{emailRedirectTo:callbackURL()}});
     if(r.error)throw r.error;
     // Supabase deliberately obfuscates already-registered addresses. Such a
     // response must never grant permission to adopt the local club.
     if(r.data?.user?.identities?.length===0){
       msg("Falls die Adresse neu ist, erhältst du eine Bestätigungs-E-Mail. Hast du bereits ein Konto, nutze Anmelden oder Passwort vergessen.");
       return;
     }
     rememberPending(address,r.data?.user?.id||null,"signup");
     msg("Registrierung angefordert. Prüfe dein Postfach und den Spam-Ordner für "+address+". Bei einem bestehenden Konto nutze Anmelden oder Passwort vergessen.");
   }
   root.localStorage.setItem(WELCOME,"1");
   await render();
   autoAttachAndBackup().catch(console.warn);
 }
 async function resendEmail(){
   const saved=pendingEmail();
   if(!saved)throw Error("Es liegt keine offene E-Mail-Bestätigung vor.");
   const c=await getClient(),u=await user();
   if(saved.kind!=="signup"&&saved.userId&&u?.id!==saved.userId)throw Error("Die Bestätigung gehört zu einem anderen Gastkonto.");
   if(u&&saved.userId&&u.id!==saved.userId)throw Error("Die Bestätigung gehört zu einem anderen Konto.");
   if(u&&!u.is_anonymous){clearPending();await render();return msg("E-Mail bereits bestätigt. Lege jetzt dein Passwort fest.");}
   const params={type:u?.is_anonymous?"email_change":"signup",email:saved.email,options:{emailRedirectTo:callbackURL()}};
   const r=await c.auth.resend(params);
   if(r.error)throw r.error;
   msg("Bestätigungslink erneut angefordert für "+saved.email+". Bitte auch im Spam-Ordner nachsehen.");
 }
 async function emailLogin(email,password){
   const c=await getClient(),u=await user();
   if(u?.is_anonymous&&!root.confirm("Mit einem BESTEHENDEN Footera-Konto anmelden?\n\nDeine bisherige Gast-Online-ID und Freundescodes werden nicht automatisch auf dieses Konto übertragen. Zum Behalten dieses Gastes bitte stattdessen 'Registrieren' wählen."))return;
   const address=checkedEmail(email);
   if(!password)throw Error("Bitte das Passwort eingeben.");
   // Do not destroy a guest session on an invalid password.
   const cfg=root.FOOTERA_ONLINE_CONFIG;
   const sdk=root.supabase;
   if(!sdk?.createClient)throw Error("Login-Bibliothek fehlt.");
   const probe=sdk.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
   const verified=await probe.auth.signInWithPassword({email:address,password});
   if(verified.error)throw verified.error;
   if(!verified.data.session)throw Error("Anmeldung nicht bestätigt.");
   const existingOwner=root.localStorage.getItem(OWNER);
   if(u?.is_anonymous&&!existingOwner)root.localStorage.setItem(OWNER,"__restore_required__");
   const r=await c.auth.setSession({access_token:verified.data.session.access_token,refresh_token:verified.data.session.refresh_token});
   if(r.error)throw r.error;
   root.localStorage.setItem(WELCOME,"1");
   noteVerifiedRegistration(verified.data.user);
   clearPending();
   root.location.reload();
 }
 async function password(email,pass){
   const c=await getClient(),u=await user();
   if(u&&!u.is_anonymous){
     if(pass.length<10)throw Error("Mindestens 10 Zeichen als Passwort verwenden.");
     const r=await c.auth.updateUser({password:pass});
     if(r.error)throw r.error;
     recovery=false;noteVerifiedRegistration(u);clearPending();msg("Passwort gespeichert. Dein Verein wird automatisch mit dem Konto verbunden und in der Cloud gesichert.");
     autoAttachAndBackup().catch(console.warn);
     await render();
   }else{
     if(!email)throw Error("Bitte E-Mail-Adresse eintragen.");
     const r=await c.auth.resetPasswordForEmail(email,{redirectTo:callbackURL()});
     if(r.error)throw r.error;
     msg("E-Mail zur Passwort-Wiederherstellung verschickt.");
   }
 }
 // Permanent accounts have an independent profile page, not just the login modal.
 function stateForProfile(u){
   if(!u||root.localStorage.getItem(OWNER)!==u.id)return null;
   try{
     const raw=root.localStorage.getItem(KEY)||root.localStorage.getItem("uc27v7");
     const state=raw?JSON.parse(raw):null;
     return state&&typeof state==="object"&&state.profile?state:null;
   }catch(_){return null}
 }
 function labelValue(id,value){const el=$(id);if(el)el.textContent=String(value??"–")}
 function integerValue(value){return Number(value||0).toLocaleString("de-DE")}
 async function renderProfile(){
   if(!profilePage||profilePage.hidden)return;
   const u=await user();
   if(!isPermanent(u)){profilePage.hidden=true;show();return}
   const state=stateForProfile(u),club=state?.profile||{};
   labelValue("footeraProfileUsername",club.username||"Noch kein Benutzername");
   labelValue("footeraProfileClub",club.clubName||"Noch kein Verein");
   labelValue("footeraProfileEmail",u.email||"Über Google angemeldet");
   labelValue("footeraProfileFriendCode",root.FooteraOnline?.friendCode||"Noch nicht synchronisiert");
   labelValue("footeraProfileCards",state?.club?.length??"–");
   labelValue("footeraProfileCoins",state?integerValue(state.coins):"–");
   labelValue("footeraProfilePoints",state?integerValue(Number(state.points||0)+(root.FooteraPaidWallet?.paidBalance()||0)):"–");
   labelValue("footeraProfileStatus","Dauerhaftes Footera-Konto");
   const providers=(u.identities||[]).map(x=>x.provider).filter(Boolean);
   labelValue("footeraProfileMethod",providers.map(x=>x==="email"?"E-Mail":x==="google"?"Google":x).join(" · ")||"Anmeldung");
   labelValue("footeraProfileSince",u.created_at?new Date(u.created_at).toLocaleDateString("de-DE"):"–");
   labelValue("footeraProfileCloud","Cloud wird geprüft …");
   try{const cloud=await cloudInfo(true);labelValue("footeraProfileCloud",cloud?("Gesichert am "+new Date(cloud.saved_at).toLocaleString("de-DE")+" · Version "+cloud.revision):"Noch keine Cloud-Sicherung")}
   catch(e){labelValue("footeraProfileCloud","Cloud nicht erreichbar: "+safeMessage(e))}
 }
 async function showProfile(){
   const u=await user();
   if(!isPermanent(u)){show();return}
   if(dialog)dialog.hidden=true;
   if(deleteDialog)deleteDialog.hidden=true;
   profilePage.hidden=false;
   await renderProfile();
 }
 function hideProfile(){if(profilePage)profilePage.hidden=true}
 function openDeletion(){
   if(!deleteDialog)return;
   deleteDialog.hidden=false;
   $("footeraDeletePhrase").value="";
   $("footeraDeletePassword").value="";
   $("footeraDeleteAgree").checked=false;
   $("footeraDeleteError").textContent="";
   $("footeraDeleteConfirm").disabled=true;
   const uEmail=$("footeraProfileEmail")?.textContent||"";
   $("footeraDeleteAccountName").textContent=uEmail;
   const resetNeeded=(root.FooteraAccountDeleteEmailProvider||false);
   $("footeraDeletePasswordLabel").hidden=!resetNeeded;
 }
 function updateDeleteReady(){
   $("footeraDeleteConfirm").disabled=$("footeraDeletePhrase").value.trim()!=="FOOTERA LÖSCHEN"||!$("footeraDeleteAgree").checked||deleteBusy;
 }
 async function deleteOwnAccount(phrase,password){
   if(phrase!=="FOOTERA LÖSCHEN")throw Error("Bitte FOOTERA LÖSCHEN exakt eingeben.");
   const c=await getClient(),u=await user();
   if(!isPermanent(u))throw Error("Zur Kontolöschung musst du angemeldet sein.");
   const result=await c.functions.invoke("footera-delete-account",{body:{confirmation:phrase,password:String(password||"")}});
   if(result.error){
     let detail="";
     try{const body=await result.error.context?.json?.();detail=String(body?.error||"")}catch(_){}
     throw Error(detail||"Kontolöschung nicht möglich. Bitte prüfe die Anmeldung und versuche es erneut.");
   }
   if(result.data?.deleted!==true)throw Error("Kontolöschung wurde nicht bestätigt. Keine lokalen Daten verändert.");
   const localOwner=root.localStorage.getItem(OWNER);
   const ownsLocal=localOwner?localOwner===u.id:registrationOwner()===u.id;
   // Do not erase an unrelated club in a shared browser.
   if(ownsLocal){
     prepareSaveReplacement();
     for(const k of [KEY,"uc27v7",ROLLBACK,OWNER,WELCOME])root.localStorage.removeItem(k);
   }
   if(syncPoint(u))root.localStorage.removeItem(SYNC_POINT);
   if(registrationOwner()===u.id)root.localStorage.removeItem(REGISTERED_HERE);
   if(pendingEmail()?.userId===u.id||pendingEmail()?.email===u.email)clearPending();
   // The user has already been deleted by the server; clear the session locally even if signOut fails.
   try{await c.auth.signOut({scope:"local"})}catch(_){}
   const projectId=new URL(root.FOOTERA_ONLINE_CONFIG.url).hostname.split(".")[0];
   root.localStorage.removeItem("sb-"+projectId+"-auth-token");
   if(deleteDialog)deleteDialog.hidden=true;
   if(profilePage)profilePage.hidden=true;
   root.location.reload();
   return true;
 }
 async function runDelete(){
   if(deleteBusy)return;
   deleteBusy=true;
   const button=$("footeraDeleteConfirm");
   button.disabled=true;
   $("footeraDeleteError").textContent="";
   try{
     if(!$("footeraDeleteAgree").checked)throw Error("Bitte die Folgen der Löschung bestätigen.");
     await deleteOwnAccount($("footeraDeletePhrase").value.trim(),$("footeraDeletePassword").value);
   }catch(e){$("footeraDeleteError").textContent=safeMessage(e)}
   finally{deleteBusy=false;updateDeleteReady()}
 }
 async function signOut(){
   const c=await getClient(),u=await user();
   if(u?.is_anonymous)throw Error("Gastkonten können ohne Wiederherstellungsmöglichkeit nicht abgemeldet werden. Registriere zuerst deine E-Mail.");
   if(!root.confirm("Von diesem Gerät abmelden? Der lokale Verein bleibt gespeichert, wird aber erst nach der nächsten Anmeldung wieder mit deinem Konto verbunden."))return;
   const r=await c.auth.signOut({scope:"local"});if(r.error)throw r.error;
   root.location.reload();
 }
 async function run(fn){
   if(busy)return;busy=true;
   const controls=dialog?.querySelectorAll("button");controls?.forEach(x=>x.disabled=true);
   try{await fn()}catch(e){msg(safeMessage(e),true)}
   finally{busy=false;controls?.forEach(x=>x.disabled=false);await render()}
 }
 async function render(){
   if(!dialog)return;
   let u=null;try{u=await user()}catch(e){msg(safeMessage(e),true);return}
   const logged=isPermanent(u),guest=!!u?.is_anonymous,owner=root.localStorage.getItem(OWNER);
   const emailChanged=logged&&acknowledgeAccountEmailChange(u);
   const changeRequest=pendingAccountEmailChange();
   const changeSection=$("footeraEmailChangeSection");
   if(changeSection)changeSection.hidden=!logged;
   if(logged&&$("footeraExistingEmail"))$("footeraExistingEmail").textContent=u.email||"–";
   const changeMessage=$("footeraEmailChangeProgress");
   if(changeMessage){
     changeMessage.textContent=emailChanged
       ?"Die neue E-Mail-Adresse wurde bestätigt. Dein Footera-Konto und deine Cloud-Sicherung bleiben zugeordnet."
       :logged&&changeRequest?.userId===u.id
         ?"E-Mail-Änderung läuft: "+changeRequest.previousEmail+" → "+changeRequest.newEmail+". Prüfe beide E-Mail-Postfächer auf Supabase-Bestätigungslinks."
         :"Es wird nur die E-Mail-Adresse geändert. Dein Verein bleibt mit derselben Footera-Konto-ID verbunden.";
   }
   const pending=pendingEmail();
   const belongsToPending=!!pending&&(!u||!pending.userId||pending.userId===u.id);
   $("footeraPendingEmail").hidden=!belongsToPending;
   $("footeraResendEmail").hidden=!belongsToPending||logged;
   if(belongsToPending){
     $("footeraPendingEmail").textContent=logged
       ?"E-Mail bestätigt. Dein Konto ist bereit. Bei einem verknüpften Gastkonto jetzt ein Passwort festlegen."
       :"Bestätigung für "+pending.email+" ausstehend. Öffne den Bestätigungslink aus deinem Postfach.";
     if(!$("footeraAccountEmail").value)$("footeraAccountEmail").value=pending.email;
   }
   $("footeraAccountWelcome").hidden=!shouldWelcome();
   $("footeraGuest").hidden=logged;
   $("footeraAccountContinue").hidden=!logged;
   const entry=$("footeraAccountEntry");if(entry)entry.textContent=logged?"Mein Profil":"Konto";
   $("footeraAccountStatus").textContent=logged?"Konto: "+(u.email||"Google")+" · dauerhaft":guest?"Gastkonto · nicht wiederherstellbar":"Noch nicht angemeldet";
   $("footeraAccountIdentity").textContent=logged?(owner===u.id?"Verein mit deinem Konto verbunden.":registrationOwner()===u.id?"Verein wird automatisch verbunden.":owner?"Auf diesem Gerät ist ein anderer Verein gespeichert.":"Dein Verein wird nach der Gründung automatisch verbunden."):"Du kannst deinen Gastverein später über E-Mail registrieren.";
   $("footeraEmailRegister").textContent=guest?"E-Mail mit Gastkonto verknüpfen":"Registrieren";
   $("footeraEmailRegister").hidden=logged;
   $("footeraEmailLogin").hidden=logged;
   $("footeraAccountSave").disabled=!logged||owner!==u?.id;
   $("footeraAccountLoad").disabled=!logged;
   $("footeraAccountAdopt").hidden=!logged||owner===u?.id||registrationOwner()===u?.id;
   $("footeraSignOut").hidden=!logged;
   $("footeraSetPassword").textContent=logged||recovery?"Passwort festlegen / ändern":"Passwort vergessen";
   $("footeraAccountPassword").placeholder=guest?"Nach E-Mail-Bestätigung festlegen":"Mindestens 10 Zeichen";
   if(logged){
     try{$("footeraAccountCloud").textContent=cloudText(await cloudInfo(true))+(autoStatus?" · "+autoStatus:"")}
     catch(e){$("footeraAccountCloud").textContent="Cloud nicht erreichbar: "+safeMessage(e)}
   }else $("footeraAccountCloud").textContent="Cloud-Sicherung nach der Anmeldung verfügbar.";
 }
 function show(){
   if(!dialog)return;
   if(profilePage)profilePage.hidden=true;
   dialog.hidden=false;
   notice=$("footeraAccountMessage");
   msg("");
   render().catch(e=>msg(safeMessage(e),true));
 }
 function hide(){if(dialog)dialog.hidden=true;}
 function mount(){
   if($("footeraAccountDialog"))return;
   const callbackParams=new URLSearchParams(root.location.hash.slice(1));
   const queryParams=new URLSearchParams(root.location.search);
   const callbackError=callbackParams.get("error_code")||queryParams.get("error_code")||callbackParams.get("error")||queryParams.get("error");
   const open=document.createElement("button");
   open.type="button";open.id="footeraAccountEntry";open.className="footera-account-entry";
   open.textContent="Konto";
   open.addEventListener("click",()=>user().then(u=>isPermanent(u)?showProfile():show()).catch(()=>show()));
   document.body.append(open);
   user().then(u=>{open.textContent=isPermanent(u)?"Mein Profil":"Konto"}).catch(()=>{});
   const panel=document.createElement("section");
   panel.className="footera-account-panel";
   panel.innerHTML='<small>FOOTERA · KONTO</small><h3>Konto & Cloud</h3><p>Verwalte dein E-Mail-Konto und deinen Verein.</p><button type="button" id="footeraAccountPanelOpen">Konto verwalten</button>';
   const club=$("clubView");
   if(club){const backup=$("footeraBackupPanel");if(backup?.parentNode)backup.insertAdjacentElement("afterend",panel);else club.prepend(panel);}
   panel.querySelector("button").addEventListener("click",show);
   dialog=document.createElement("div");
   dialog.id="footeraAccountDialog";dialog.className="footera-account-overlay";dialog.hidden=true;
   dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-label","Footera Konto");
   dialog.innerHTML='<div class="footera-account-modal">'+
     '<header><div><small>BUILD YOUR ERA</small><h2>Footera-Konto</h2></div><button type="button" id="footeraAccountClose" aria-label="Schließen">✕</button></header>'+
     '<p id="footeraAccountStatus" class="footera-account-status">Konto wird geprüft …</p>'+
     '<p id="footeraAccountIdentity"></p>'+
     '<p id="footeraPendingEmail" class="footera-email-pending" hidden></p>'+
     '<button type="button" id="footeraResendEmail" class="footera-account-link" hidden>Bestätigungs-E-Mail erneut senden</button>'+
     '<div class="footera-account-welcome" id="footeraAccountWelcome"><strong>Dein Team. Deine Ära.</strong><p>Erstelle ein Konto oder probiere Footera als Gast. Deinen Verein kannst du später mit einem Konto sichern.</p></div>'+
     '<p class="footera-email-intro">Mit E-Mail-Adresse anmelden oder registrieren.</p>'+
     '<form id="footeraAccountForm"><label>E-Mail<input type="email" id="footeraAccountEmail" placeholder="name@beispiel.de" autocomplete="email" required></label>'+
     '<label>Passwort<input id="footeraAccountPassword" type="password" placeholder="Mindestens 10 Zeichen" autocomplete="current-password"></label>'+
     '<div class="footera-account-actions"><button type="submit" id="footeraEmailLogin">Anmelden</button><button type="button" id="footeraEmailRegister">Registrieren</button><button type="button" id="footeraSetPassword">Passwort vergessen</button></div></form>'+
     '<button type="button" id="footeraGuest" class="footera-account-guest">Als Gast spielen · ohne Registrierung</button>'+
     '<button type="button" id="footeraAccountContinue" class="footera-account-guest" hidden>Weiter zu meinem Verein</button>'+
     '<section class="footera-email-change" id="footeraEmailChangeSection" hidden><strong>Anmelde-E-Mail ändern</strong><p>Aktuell: <span id="footeraExistingEmail">–</span></p><p>Dein Verein bleibt dem bisherigen Konto zugeordnet. Bestätige den Wechsel in deinen E-Mail-Postfächern.</p><form id="footeraEmailChangeForm"><label>Neue E-Mail-Adresse<input id="footeraNewEmail" type="email" inputmode="email" autocomplete="email" placeholder="neue-adresse@beispiel.de" maxlength="254" required></label><button type="submit" id="footeraEmailChangeButton">Änderung per E-Mail bestätigen</button></form><p id="footeraEmailChangeProgress" role="status" aria-live="polite"></p></section>'+
     '<div class="footera-account-cloud"><strong>Cloud-Spielstand</strong><p id="footeraAccountCloud"></p><div class="footera-account-actions"><button id="footeraAccountSave" type="button">In Cloud sichern</button><button id="footeraAccountLoad" type="button">Aus Cloud laden</button><button id="footeraAccountAdopt" type="button" hidden>Lokalen Verein zuordnen</button></div></div>'+
     '<p id="footeraAccountMessage" role="status" aria-live="polite"></p>'+
     '<button type="button" id="footeraSignOut" class="footera-account-link" hidden>Abmelden</button>'+
     '<p class="footera-account-note">Neue registrierte Vereine werden automatisch zugeordnet und gesichert. Gastkonten bleiben bis zur Registrierung nicht wiederherstellbar. Bei Cloud-Konflikten wird nichts überschrieben.</p>'+
     '</div>';
   document.body.append(dialog);
   profilePage=document.createElement("div");
   profilePage.id="footeraProfilePage";
   profilePage.className="footera-profile-overlay";
   profilePage.hidden=true;
   profilePage.setAttribute("role","dialog");
   profilePage.setAttribute("aria-modal","true");
   profilePage.setAttribute("aria-label","Mein Footera-Profil");
   profilePage.innerHTML='<section class="footera-profile-page">'+
     '<header class="footera-profile-header"><div><small>FOOTERA · BUILD YOUR ERA</small><h2>Mein Profil</h2></div><button id="footeraProfileClose" type="button" aria-label="Profil schließen">✕</button></header>'+
     '<div class="footera-profile-hero"><span class="footera-profile-avatar">F</span><div><small>MEIN ACCOUNT</small><h3 id="footeraProfileUsername">–</h3><p id="footeraProfileClub">–</p><p id="footeraProfileStatus">–</p></div></div>'+
     '<h3 class="footera-profile-section-title">Mein Verein</h3>'+
     '<div class="footera-profile-stats"><div><small>SPIELERKARTEN</small><strong id="footeraProfileCards">–</strong></div><div><small>MÜNZEN</small><strong id="footeraProfileCoins">–</strong></div><div><small>FC POINTS</small><strong id="footeraProfilePoints">–</strong></div></div>'+
     '<h3 class="footera-profile-section-title">Mein Konto</h3>'+
     '<dl class="footera-profile-details"><div><dt>E-Mail-Adresse</dt><dd id="footeraProfileEmail">–</dd></div><div><dt>Freundescode</dt><dd id="footeraProfileFriendCode">–</dd></div><div><dt>Anmeldung über</dt><dd id="footeraProfileMethod">–</dd></div><div><dt>Registriert seit</dt><dd id="footeraProfileSince">–</dd></div><div><dt>Cloud-Spielstand</dt><dd id="footeraProfileCloud">–</dd></div></dl>'+
     '<div class="footera-profile-actions"><button id="footeraProfileSettings" type="button">Kontoeinstellungen</button><button id="footeraProfileChangeEmail" type="button">E-Mail ändern</button><button id="footeraProfileBackup" type="button">Spielstand sichern</button><button id="footeraProfileSignOut" type="button">Abmelden</button></div>'+
     '<div class="footera-profile-danger"><small>GEFAHRENBEREICH</small><h3>Konto endgültig löschen</h3><p>Entfernt deine Anmeldung, deinen Verein und Cloud-Spielstand sowie deine zugehörigen Online-Daten. Diese Aktion kann nicht rückgängig gemacht werden.</p><button id="footeraProfileDelete" type="button">Konto unwiderruflich löschen</button></div>'+
     '</section>';
   document.body.append(profilePage);
   deleteDialog=document.createElement("div");
   deleteDialog.id="footeraDeleteDialog";
   deleteDialog.className="footera-account-overlay footera-delete-overlay";
   deleteDialog.hidden=true;
   deleteDialog.setAttribute("role","dialog");deleteDialog.setAttribute("aria-modal","true");deleteDialog.setAttribute("aria-label","Footera-Konto löschen");
   deleteDialog.innerHTML='<section class="footera-delete-card">'+
     '<header><h2>Konto endgültig löschen?</h2><button id="footeraDeleteCancelTop" type="button" aria-label="Abbrechen">✕</button></header>'+
     '<p>Dieses Konto <strong id="footeraDeleteAccountName"></strong> wird unwiderruflich gelöscht. Vereinsdaten, Karten, Münzen, FC Points, Freundescode, Chats und Duelle gehen verloren.</p>'+
     '<p>Auch die Cloud-Sicherung wird entfernt. Lokale Kopien auf anderen Geräten können dort noch bestehen, sind aber keinem gültigen Konto mehr zugeordnet.</p>'+
     '<label class="footera-delete-label">Schreibe FOOTERA LÖSCHEN<input id="footeraDeletePhrase" autocomplete="off" spellcheck="false" placeholder="FOOTERA LÖSCHEN"></label>'+
     '<label class="footera-delete-label" id="footeraDeletePasswordLabel">Zur Bestätigung dein Kontopasswort<input id="footeraDeletePassword" type="password" autocomplete="current-password" placeholder="Passwort eingeben"></label>'+
     '<label class="footera-delete-check"><input id="footeraDeleteAgree" type="checkbox">Ich verstehe, dass alle meine Footera-Kontodaten unwiderruflich gelöscht werden.</label>'+
     '<p id="footeraDeleteError" role="alert"></p>'+
     '<button type="button" id="footeraDeleteConfirm" class="footera-delete-confirm" disabled>Endgültig löschen</button>'+
     '<button type="button" id="footeraDeleteCancel" class="footera-delete-cancel">Abbrechen</button>'+
     '</section>';
   document.body.append(deleteDialog);
   $("footeraProfileClose").addEventListener("click",hideProfile);
   $("footeraProfileSettings").addEventListener("click",()=>{hideProfile();show()});
   $("footeraProfileChangeEmail").addEventListener("click",()=>{
     hideProfile();show();
     root.setTimeout(()=>$("footeraNewEmail")?.focus(),80);
   });
   $("footeraProfileBackup").addEventListener("click",()=>run(async()=>{await saveCloud();await renderProfile()}));
   $("footeraProfileSignOut").addEventListener("click",()=>run(signOut));
   $("footeraProfileDelete").addEventListener("click",async()=>{
     const u=await user();
     root.FooteraAccountDeleteEmailProvider=(u?.identities||[]).some(x=>x.provider==="email");
     openDeletion();
   });
   const cancelDeletion=()=>{deleteDialog.hidden=true;$("footeraDeletePassword").value=""};
   $("footeraDeleteCancelTop").addEventListener("click",cancelDeletion);
   $("footeraDeleteCancel").addEventListener("click",cancelDeletion);
   $("footeraDeletePhrase").addEventListener("input",updateDeleteReady);
   $("footeraDeleteAgree").addEventListener("change",updateDeleteReady);
   $("footeraDeleteConfirm").addEventListener("click",runDelete);
   $("footeraAccountClose").addEventListener("click",hide);
   dialog.addEventListener("click",e=>{if(e.target===dialog)hide()});
   document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!dialog.hidden)hide()});
   $("footeraGuest").addEventListener("click",()=>run(continueAsGuest));
   $("footeraAccountContinue").addEventListener("click",()=>run(async()=>{await autoAttachAndBackup();root.localStorage.setItem(WELCOME,"1");hide()}));
   $("footeraResendEmail").addEventListener("click",()=>run(resendEmail));
   $("footeraEmailRegister").addEventListener("click",()=>run(()=>emailRegister($("footeraAccountEmail").value.trim(),$("footeraAccountPassword").value)));
   $("footeraAccountForm").addEventListener("submit",e=>{e.preventDefault();run(()=>emailLogin($("footeraAccountEmail").value.trim(),$("footeraAccountPassword").value))});
   $("footeraSetPassword").addEventListener("click",()=>run(()=>password($("footeraAccountEmail").value.trim(),$("footeraAccountPassword").value)));
   $("footeraEmailChangeForm").addEventListener("submit",e=>{
     e.preventDefault();
     run(()=>requestAccountEmailChange($("footeraNewEmail").value));
   });
   $("footeraAccountSave").addEventListener("click",()=>run(saveCloud));
   $("footeraAccountLoad").addEventListener("click",()=>run(restoreCloud));
   $("footeraAccountAdopt").addEventListener("click",()=>run(adoptLocal));
   $("footeraSignOut").addEventListener("click",()=>run(signOut));
   if(root.location.hash.includes("access_token")||root.location.search.includes("code=")||callbackError||pendingEmail()||shouldWelcome())show();
   getClient().then(()=>{
     render().catch(console.warn);
     if(callbackError)msg(safeMessage({code:callbackError,message:"Der Anmeldelink ist ungültig oder abgelaufen. Bitte einen neuen Link anfordern."}),true);
     autoAttachAndBackup().catch(e=>{autoStatus=safeMessage(e);console.warn("Footera Cloud:",e)});
     if(!autoTimer&&root.setInterval)autoTimer=root.setInterval(()=>{
       autoAttachAndBackup().catch(e=>{autoStatus=safeMessage(e);console.warn("Footera Cloud:",e)});
     },20000);
   }).catch(e=>{console.warn("Footera-Konto:",e);msg("Konto-Dienst nicht erreichbar.",true)});
 }
 root.FooteraAccount={getClient,user,saveCloud,restoreCloud,adoptLocal,google,emailRegister,emailLogin,password,resendEmail,continueAsGuest,shouldWelcome,autoAttachAndBackup,deleteOwnAccount,showProfile,signOut};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})(window);
