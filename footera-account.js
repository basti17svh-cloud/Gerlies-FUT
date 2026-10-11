/* Footera permanent accounts and explicit cloud backups.
 * Guest identities are linked in place. Game saves remain local until an explicit cloud action.
 * This is NOT a server-authoritative wallet for real-money purchases. */
(function(root){
 "use strict";
 if(!root.FooteraOnline?.available||!root.document)return;
 const OWNER="footera-cloud-owner",KEY="gerliesFutV9",ROLLBACK="footera-before-restore",WELCOME="footera-account-welcome-v1",PENDING_EMAIL="footera-pending-email-v1",REGISTERED_HERE="footera-register-owner-v1",SYNC_POINT="footera-cloud-sync-point-v1";
 const maxLength=12*1024*1024;
 let client=null,dialog=null,notice=null,busy=false,recovery=false,autoBusy=false,autoStatus="",autoTimer=null;
 const $=id=>document.getElementById(id);
 const safeMessage=e=>String(e?.message||e||"Unbekannter Fehler").slice(0,230);
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
 function rememberPending(email,userId){
   root.localStorage.setItem(PENDING_EMAIL,JSON.stringify({email,userId:userId||null}));
 }
 function clearPending(){root.localStorage.removeItem(PENDING_EMAIL);}
 function registrationOwner(){
   try{return JSON.parse(root.localStorage.getItem(REGISTERED_HERE)||"null")?.userId||null}catch(_){return null}
 }
 function noteVerifiedRegistration(u){
   const pending=pendingEmail();
   if(u&&!u.is_anonymous&&u.email_confirmed_at&&pending?.email===String(u.email||"").toLowerCase()&&(!pending.userId||pending.userId===u.id)){
     root.localStorage.setItem(REGISTERED_HERE,JSON.stringify({userId:u.id}));
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
 function hasLocalGame(){return !!(root.localStorage.getItem(KEY)||root.localStorage.getItem("uc27v7"));}


 // Existing clubs are never interrupted by the introductory choice.
 function shouldWelcome(){
   return !root.localStorage.getItem(WELCOME)
     && !root.localStorage.getItem(KEY)
     && !root.localStorage.getItem("uc27v7");
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
     client=await root.FooteraOnline.authClient();
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
   if(!isPermanent(u))throw Error("Zuerst Google oder E-Mail mit deinem Konto verknüpfen.");
   return {c,u};
 }
 function ensureOwned(u){
   if(root.localStorage.getItem(OWNER)!==u.id){
     throw Error("Dieser lokale Spielstand ist nicht mit dem angemeldeten Konto verbunden. Lade zuerst deine Cloud-Sicherung.");
   }
 }
 async function cloudInfo(){
   const {c}=await requirePermanent();
   const {data,error}=await c.from("footera_cloud_saves").select("save_data,revision,saved_at").maybeSingle();
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
   const before=root.localStorage.getItem(KEY);
   if(before!==null)root.localStorage.setItem(ROLLBACK,before);
   try{
     root.localStorage.setItem(KEY,JSON.stringify(s));
     root.localStorage.setItem(OWNER,u.id);
     savePoint(u,s,existing.revision);
   }catch(e){
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
     const cloud=await cloudInfo();
     if(!hasLocalGame()){
       if(cloud){
         const saved=root.FooteraBackup?.validateState(cloud.save_data);
         if(!saved)throw Error("Cloud-Sicherung konnte nicht geprüft werden.");
         root.localStorage.setItem(KEY,JSON.stringify(saved));
         root.localStorage.setItem(OWNER,u.id);
         savePoint(u,saved,cloud.revision);
         root.location.reload();
         return;
       }
       // Account created before club setup: reserve ownership for the new club.
       if(eligible&&!owner)root.localStorage.setItem(OWNER,u.id);
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
       if(root.FooteraOnline&&!root.FooteraOnline.ready)root.location.reload();
       return;
     }
     if(cloud.save_data?.profile?.saveId!==save.profile?.saveId){
       autoStatus="Im Konto ist bereits ein anderer Verein gesichert. Keine automatische Überschreibung.";
       return;
     }
     const point=syncPoint(u);
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
     rememberPending(address,null);
     msg("Registrierung gestartet. Bestätige die E-Mail "+address+" und melde dich anschließend an.");
   }
   root.localStorage.setItem(WELCOME,"1");
   await render();
   autoAttachAndBackup().catch(console.warn);
 }
 async function resendEmail(){
   const saved=pendingEmail();
   if(!saved)throw Error("Es liegt keine offene E-Mail-Bestätigung vor.");
   const c=await getClient(),u=await user();
   if(saved.userId&&u?.id!==saved.userId)throw Error("Die Bestätigung gehört zu einem anderen Gastkonto.");
   if(u&&!u.is_anonymous){clearPending();await render();return msg("E-Mail bereits bestätigt. Lege jetzt dein Passwort fest.");}
   const params=saved.userId?{type:"email_change",email:saved.email}:{type:"signup",email:saved.email,options:{emailRedirectTo:callbackURL()}};
   const r=await c.auth.resend(params);
   if(r.error)throw r.error;
   msg("Bestätigungslink erneut angefordert für "+saved.email+". Bitte auch im Spam-Ordner nachsehen.");
 }
 async function emailLogin(email,password){
   const c=await getClient(),u=await user();
   if(u?.is_anonymous&&!root.confirm("Mit einem BESTEHENDEN Footera-Konto anmelden?\n\nDeine bisherige Gast-Online-ID und Freundescodes werden nicht automatisch auf dieses Konto übertragen. Zum Behalten dieses Gastes bitte stattdessen 'Registrieren' wählen."))return;
   checkedEmail(email);
   if(!password)throw Error("Bitte das Passwort eingeben.");
   // Do not destroy a guest session on an invalid password.
   const cfg=root.FOOTERA_ONLINE_CONFIG;
   const sdk=root.supabase;
   if(!sdk?.createClient)throw Error("Login-Bibliothek fehlt.");
   const probe=sdk.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
   const verified=await probe.auth.signInWithPassword({email,password});
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
 async function signOut(){
   const c=await getClient(),u=await user();
   if(u?.is_anonymous)throw Error("Gastkonten ohne Wiederherstellungsmöglichkeit nicht abmelden. Erst Google oder E-Mail verknüpfen.");
   if(!root.confirm("Von diesem Gerät abmelden? Der lokale Verein bleibt gespeichert, wird aber erst nach der nächsten Anmeldung wieder mit deinem Konto verbunden."))return;
   const r=await c.auth.signOut();if(r.error)throw r.error;
   root.location.reload();
 }
 async function run(fn){
   if(busy)return;busy=true;
   const controls=dialog?.querySelectorAll("button");controls?.forEach(x=>x.disabled=true);
   try{await fn()}catch(e){msg(safeMessage(e),true)}
   finally{busy=false;controls?.forEach(x=>x.disabled=false)}
 }
 async function render(){
   if(!dialog)return;
   let u=null;try{u=await user()}catch(e){msg(safeMessage(e),true);return}
   const logged=isPermanent(u),guest=!!u?.is_anonymous,owner=root.localStorage.getItem(OWNER);
   const pending=pendingEmail();
   const belongsToPending=!!pending&&(!pending.userId||pending.userId===u?.id);
   $("footeraPendingEmail").hidden=!belongsToPending;
   $("footeraResendEmail").hidden=!belongsToPending||logged;
   if(belongsToPending){
     $("footeraPendingEmail").textContent=logged
       ?"E-Mail bestätigt. Lege jetzt ein Passwort fest und sichere deinen Verein in der Cloud."
       :"Bestätigung für "+pending.email+" ausstehend. Öffne den Bestätigungslink aus deinem Postfach.";
     if(!$("footeraAccountEmail").value)$("footeraAccountEmail").value=pending.email;
   }
   $("footeraAccountWelcome").hidden=!shouldWelcome();
   $("footeraGuest").hidden=logged;
   $("footeraAccountStatus").textContent=logged?"Konto: "+(u.email||"Google")+" · dauerhaft":guest?"Gastkonto · nicht wiederherstellbar":"Noch nicht angemeldet";
   $("footeraAccountIdentity").textContent=logged?(owner===u.id?"Verein mit deinem Konto verbunden.":registrationOwner()===u.id?"Verein wird automatisch verbunden.":owner?"Auf diesem Gerät ist ein anderer Verein gespeichert.":"Dein Verein wird nach der Gründung automatisch verbunden."):"Registrieren bewahrt deinen Gastverein und die Online-ID.";
   $("footeraGoogle").textContent=logged?"Google-Konto verknüpfen":guest?"Mit Google verknüpfen":"Mit Google anmelden";
   $("footeraSwitchGoogle").hidden=!guest;
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
     try{$("footeraAccountCloud").textContent=cloudText(await cloudInfo())+(autoStatus?" · "+autoStatus:"")}
     catch(e){$("footeraAccountCloud").textContent="Cloud nicht erreichbar: "+safeMessage(e)}
   }else $("footeraAccountCloud").textContent="Cloud-Sicherung nach der Anmeldung verfügbar.";
 }
 function show(){
   if(!dialog)return;
   dialog.hidden=false;
   notice=$("footeraAccountMessage");
   msg("");
   render().catch(e=>msg(safeMessage(e),true));
 }
 function hide(){if(dialog)dialog.hidden=true;}
 function mount(){
   if($("footeraAccountDialog"))return;
   const open=document.createElement("button");
   open.type="button";open.id="footeraAccountEntry";open.className="footera-account-entry";
   open.textContent="Konto";open.addEventListener("click",show);document.body.append(open);
   const panel=document.createElement("section");
   panel.className="footera-account-panel";
   panel.innerHTML='<small>FOOTERA · KONTO</small><h3>Konto & Cloud</h3><p>Sichere deine Online-ID und deinen Verein mit Google oder E-Mail.</p><button type="button" id="footeraAccountPanelOpen">Konto verwalten</button>';
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
     '<button type="button" class="footera-account-google" id="footeraGoogle"><span>G</span> Mit Google fortfahren</button>'+
     '<button type="button" id="footeraSwitchGoogle" class="footera-account-link" hidden>Stattdessen bei bestehendem Google-Konto anmelden</button>'+
     '<div class="footera-account-separator">oder mit E-Mail</div>'+
     '<form id="footeraAccountForm"><label>E-Mail<input type="email" id="footeraAccountEmail" placeholder="name@beispiel.de" autocomplete="email" required></label>'+
     '<label>Passwort<input id="footeraAccountPassword" type="password" placeholder="Mindestens 10 Zeichen" autocomplete="current-password"></label>'+
     '<div class="footera-account-actions"><button type="submit" id="footeraEmailLogin">Anmelden</button><button type="button" id="footeraEmailRegister">Registrieren</button><button type="button" id="footeraSetPassword">Passwort vergessen</button></div></form>'+
     '<button type="button" id="footeraGuest" class="footera-account-guest">Als Gast spielen · ohne Registrierung</button>'+
     '<div class="footera-account-cloud"><strong>Cloud-Spielstand</strong><p id="footeraAccountCloud"></p><div class="footera-account-actions"><button id="footeraAccountSave" type="button">In Cloud sichern</button><button id="footeraAccountLoad" type="button">Aus Cloud laden</button><button id="footeraAccountAdopt" type="button" hidden>Lokalen Verein zuordnen</button></div></div>'+
     '<p id="footeraAccountMessage" role="status" aria-live="polite"></p>'+
     '<button type="button" id="footeraSignOut" class="footera-account-link" hidden>Abmelden</button>'+
     '<p class="footera-account-note">Neue registrierte Vereine werden automatisch zugeordnet und gesichert. Gastkonten bleiben bis zur Registrierung nicht wiederherstellbar. Bei Cloud-Konflikten wird nichts überschrieben.</p>'+
     '</div>';
   document.body.append(dialog);
   $("footeraAccountClose").addEventListener("click",hide);
   dialog.addEventListener("click",e=>{if(e.target===dialog)hide()});
   document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!dialog.hidden)hide()});
   $("footeraGuest").addEventListener("click",()=>run(continueAsGuest));
   $("footeraGoogle").addEventListener("click",()=>run(()=>google("link")));
   $("footeraSwitchGoogle").addEventListener("click",()=>run(()=>google("switch")));
   $("footeraResendEmail").addEventListener("click",()=>run(resendEmail));
   $("footeraEmailRegister").addEventListener("click",()=>run(()=>emailRegister($("footeraAccountEmail").value.trim(),$("footeraAccountPassword").value)));
   $("footeraAccountForm").addEventListener("submit",e=>{e.preventDefault();run(()=>emailLogin($("footeraAccountEmail").value.trim(),$("footeraAccountPassword").value))});
   $("footeraSetPassword").addEventListener("click",()=>run(()=>password($("footeraAccountEmail").value.trim(),$("footeraAccountPassword").value)));
   $("footeraAccountSave").addEventListener("click",()=>run(saveCloud));
   $("footeraAccountLoad").addEventListener("click",()=>run(restoreCloud));
   $("footeraAccountAdopt").addEventListener("click",()=>run(adoptLocal));
   $("footeraSignOut").addEventListener("click",()=>run(signOut));
   if(root.location.hash.includes("access_token")||root.location.search.includes("code=")||root.location.search.includes("error=")||shouldWelcome())show();
   getClient().then(()=>{
     render().catch(console.warn);
     autoAttachAndBackup().catch(e=>{autoStatus=safeMessage(e);console.warn("Footera Cloud:",e)});
     if(!autoTimer&&root.setInterval)autoTimer=root.setInterval(()=>{
       autoAttachAndBackup().catch(e=>{autoStatus=safeMessage(e);console.warn("Footera Cloud:",e)});
     },20000);
   }).catch(e=>{console.warn("Footera-Konto:",e);msg("Konto-Dienst nicht erreichbar.",true)});
 }
 root.FooteraAccount={getClient,user,saveCloud,restoreCloud,adoptLocal,google,emailRegister,emailLogin,password,resendEmail,continueAsGuest,shouldWelcome,autoAttachAndBackup};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})(window);
