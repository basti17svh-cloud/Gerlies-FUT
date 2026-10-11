/* Footera permanent accounts and explicit cloud backups.
 * Guest identities are linked in place. Game saves remain local until an explicit cloud action.
 * This is NOT a server-authoritative wallet for real-money purchases. */
(function(root){
 "use strict";
 if(!root.FooteraOnline?.available||!root.document)return;
 const OWNER="footera-cloud-owner",KEY="gerliesFutV9",ROLLBACK="footera-before-restore";
 const maxLength=12*1024*1024;
 let client=null,dialog=null,notice=null,busy=false,recovery=false;
 const $=id=>document.getElementById(id);
 const safeMessage=e=>String(e?.message||e||"Unbekannter Fehler").slice(0,230);
 const callbackURL=()=>new URL("./",root.location.href).href;
 const account=()=>client?.auth.getUser();
 function msg(text,isError=false){
   const target=notice||$("footeraAccountMessage");if(!target)return;
   target.textContent=text;target.dataset.error=isError?"1":"0";
 }
 function isPermanent(u){return !!u&&!u.is_anonymous;}
 async function getClient(){
   if(!client){
     client=await root.FooteraOnline.authClient();
     client.auth.onAuthStateChange((event)=>{
       if(event==="PASSWORD_RECOVERY")recovery=true;
       root.setTimeout(()=>render().catch(console.warn),0);
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
   }catch(e){
     if(before!==null)root.localStorage.setItem(KEY,before);
     if(oldOwner===null)root.localStorage.removeItem(OWNER);else root.localStorage.setItem(OWNER,oldOwner);
     throw e;
   }
   root.location.reload();
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
   }
   const r=await c.auth.signInWithOAuth({provider:"google",options});
   if(r.error)throw r.error;
 }
 async function emailRegister(email,password){
   const c=await getClient(),u=await user();
   if(u?.is_anonymous){
     root.localStorage.setItem(OWNER,u.id);
     const r=await c.auth.updateUser({email});
     if(r.error)throw r.error;
     msg("Bestätigungslink an "+email+" versendet. Nach der Bestätigung hier ein Passwort festlegen.");
   }else if(u){
     throw Error("Du bist bereits angemeldet. Nutze 'Passwort festlegen'.");
   }else{
     if(password.length<10)throw Error("Mindestens 10 Zeichen als Passwort verwenden.");
     const r=await c.auth.signUp({email,password,options:{emailRedirectTo:callbackURL()}});
     if(r.error)throw r.error;
     msg("Registrierung gestartet. Bitte den Bestätigungslink im E-Mail-Postfach öffnen.");
   }
 }
 async function emailLogin(email,password){
   const c=await getClient(),u=await user();
   if(u?.is_anonymous&&!root.confirm("Mit einem BESTEHENDEN Footera-Konto anmelden?\n\nDeine bisherige Gast-Online-ID und Freundescodes werden nicht automatisch auf dieses Konto übertragen. Zum Behalten dieses Gastes bitte stattdessen 'Registrieren' wählen."))return;
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
   root.location.reload();
 }
 async function password(email,pass){
   const c=await getClient(),u=await user();
   if(u&&!u.is_anonymous){
     if(pass.length<10)throw Error("Mindestens 10 Zeichen als Passwort verwenden.");
     const r=await c.auth.updateUser({password:pass});
     if(r.error)throw r.error;
     recovery=false;msg("Passwort gespeichert.");
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
   $("footeraAccountStatus").textContent=logged?"Konto: "+(u.email||"Google")+" · dauerhaft":guest?"Gastkonto · nicht wiederherstellbar":"Noch nicht angemeldet";
   $("footeraAccountIdentity").textContent=logged?(owner===u.id?"Lokaler Verein mit diesem Konto verbunden.":"Lokaler Verein noch nicht mit diesem Konto verbunden."):"Google verknüpfen bewahrt deine bisherige Online-ID.";
   $("footeraGoogle").textContent=guest?"Mit Google verknüpfen":"Mit Google anmelden";
   $("footeraSwitchGoogle").hidden=!guest;
   $("footeraEmailRegister").textContent=guest?"E-Mail mit Gastkonto verknüpfen":"Registrieren";
   $("footeraAccountSave").disabled=!logged||owner!==u?.id;
   $("footeraAccountLoad").disabled=!logged;
   $("footeraAccountAdopt").hidden=!logged||owner===u?.id;
   $("footeraSignOut").hidden=!logged;
   $("footeraSetPassword").textContent=logged||recovery?"Passwort festlegen / ändern":"Passwort vergessen";
   if(logged){
     try{$("footeraAccountCloud").textContent=cloudText(await cloudInfo())}
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
     '<button type="button" class="footera-account-google" id="footeraGoogle"><span>G</span> Mit Google fortfahren</button>'+
     '<button type="button" id="footeraSwitchGoogle" class="footera-account-link" hidden>Stattdessen bei bestehendem Google-Konto anmelden</button>'+
     '<div class="footera-account-separator">oder mit E-Mail</div>'+
     '<form id="footeraAccountForm"><label>E-Mail<input type="email" id="footeraAccountEmail" placeholder="name@beispiel.de" autocomplete="email" required></label>'+
     '<label>Passwort<input id="footeraAccountPassword" type="password" placeholder="Mindestens 10 Zeichen" autocomplete="current-password"></label>'+
     '<div class="footera-account-actions"><button type="submit" id="footeraEmailLogin">Anmelden</button><button type="button" id="footeraEmailRegister">Registrieren</button><button type="button" id="footeraSetPassword">Passwort vergessen</button></div></form>'+
     '<div class="footera-account-cloud"><strong>Cloud-Spielstand</strong><p id="footeraAccountCloud"></p><div class="footera-account-actions"><button id="footeraAccountSave" type="button">In Cloud sichern</button><button id="footeraAccountLoad" type="button">Aus Cloud laden</button><button id="footeraAccountAdopt" type="button" hidden>Lokalen Verein zuordnen</button></div></div>'+
     '<p id="footeraAccountMessage" role="status" aria-live="polite"></p>'+
     '<button type="button" id="footeraSignOut" class="footera-account-link" hidden>Abmelden</button>'+
     '<p class="footera-account-note">Gastkonto-Verknüpfung erhält deine Online-ID. Cloud-Spielstände werden nur ausdrücklich gespeichert oder geladen. Noch keine Echtgeld-Käufe.</p>'+
     '</div>';
   document.body.append(dialog);
   $("footeraAccountClose").addEventListener("click",hide);
   dialog.addEventListener("click",e=>{if(e.target===dialog)hide()});
   document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!dialog.hidden)hide()});
   $("footeraGoogle").addEventListener("click",()=>run(()=>google("link")));
   $("footeraSwitchGoogle").addEventListener("click",()=>run(()=>google("switch")));
   $("footeraEmailRegister").addEventListener("click",()=>run(()=>emailRegister($("footeraAccountEmail").value.trim(),$("footeraAccountPassword").value)));
   $("footeraAccountForm").addEventListener("submit",e=>{e.preventDefault();run(()=>emailLogin($("footeraAccountEmail").value.trim(),$("footeraAccountPassword").value))});
   $("footeraSetPassword").addEventListener("click",()=>run(()=>password($("footeraAccountEmail").value.trim(),$("footeraAccountPassword").value)));
   $("footeraAccountSave").addEventListener("click",()=>run(saveCloud));
   $("footeraAccountLoad").addEventListener("click",()=>run(restoreCloud));
   $("footeraAccountAdopt").addEventListener("click",()=>run(adoptLocal));
   $("footeraSignOut").addEventListener("click",()=>run(signOut));
   if(root.location.hash.includes("access_token")||root.location.search.includes("code=")||root.location.search.includes("error="))show();
   getClient().then(()=>render()).catch(e=>{console.warn("Footera-Konto:",e);msg("Konto-Dienst nicht erreichbar.",true)});
 }
 root.FooteraAccount={getClient,user,saveCloud,restoreCloud,adoptLocal,google,emailRegister,emailLogin,password};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})(window);
