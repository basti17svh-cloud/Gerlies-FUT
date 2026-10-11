/* Footera: portable local-save export/import (anonymous online identity is excluded). */
(function(root){
"use strict";
const KEY="gerliesFutV9",ROLLBACK="footera-before-restore",FORMAT="footera-local-backup",MAX=20*1024*1024;
function fail(t){throw Error(t)}
function obj(v){return !!v&&typeof v==="object"&&!Array.isArray(v)}
function validateState(s){
 if(!obj(s)||!obj(s.profile)||!Array.isArray(s.club)||!Array.isArray(s.squad))fail("Profil, Verein oder Mannschaft fehlen.");
 if(!Number.isInteger(s.version)||s.version<1||s.version>123)fail("Spielstand-Version nicht unterstützt.");
 if(!Number.isFinite(s.coins)||s.coins<0||!Number.isFinite(s.points)||s.points<0)fail("Ungültiges Guthaben.");
 if(s.club.length>25000||s.squad.length>50)fail("Ungültige Vereinsgröße.");
 if(s.squadPresets!==undefined&&(!Array.isArray(s.squadPresets)||s.squadPresets.length>3))fail("Ungültige Mannschaftspläne.");
 if(s.club.some(p=>!obj(p)||typeof p.uid!=="string"||typeof p.pid!=="string"))fail("Ungültige Karten.");
 if(new Set(s.club.map(p=>p.uid)).size!==s.club.length)fail("Doppelte Karten-IDs.");
 return s;
}
async function hash(text){
 if(!root.crypto?.subtle||!root.TextEncoder)fail("Sicherung benötigt HTTPS.");
 const buf=await root.crypto.subtle.digest("SHA-256",new root.TextEncoder().encode(text));
 return Array.from(new Uint8Array(buf),v=>v.toString(16).padStart(2,"0")).join("");
}
function blocked(){
 if(typeof match!=="undefined"&&match&&!match.finished)return "während eines Spiels";
 if(typeof pendingPack!=="undefined"&&pendingPack.length)return "solange Pack-Karten offen sind";
 if(typeof state!=="undefined"&&(state.pendingChemBoosts||[]).length)return "solange Boosts offen sind";
 if(typeof activeSbcId!=="undefined"&&activeSbcId)return "während einer SBC-Abgabe";
 if(root.document.querySelector("#opening.active,#results.active"))return "solange Pack-Karten offen sind";
 return "";
}
function status(t,err=false){const e=root.document.getElementById("footeraBackupStatus");if(e){e.textContent=t;e.dataset.error=err?"true":"false"}}
async function inspect(text){
 if(new root.TextEncoder().encode(text).length>MAX)fail("Datei größer als 20 MB.");
 let b;try{b=JSON.parse(text)}catch(_){fail("Ungültiges JSON.")}
 if(!obj(b)||b.format!==FORMAT||b.schema!==1||typeof b.data!=="string"||!(/^[a-f0-9]{64}$/i).test(String(b.checksum)))fail("Keine gültige Footera-Sicherung.");
 if(await hash(b.data)!==b.checksum)fail("Beschädigte oder veränderte Sicherung.");
 let s;try{s=JSON.parse(b.data)}catch(_){fail("Spieldaten unlesbar.")}
 validateState(s);
 if(String(b.clubName)!==String(s.profile.clubName))fail("Vereinsdaten stimmen nicht überein.");
 return{backup:b,state:s};
}
async function exportBackup(){
 const why=blocked();if(why)return status("Nicht möglich "+why+".",true);
 try{
  if(typeof flushSave==="function")flushSave();
  const raw=root.localStorage.getItem(KEY)||root.localStorage.getItem("uc27v7");
  if(!raw)fail("Noch kein gespeicherter Spielstand.");
  const s=validateState(JSON.parse(raw)),data=JSON.stringify(s),when=new Date().toISOString();
  const b={format:FORMAT,schema:1,exportedAt:when,clubName:String(s.profile.clubName||"Footera"),appVersion:typeof GFUT_BUILD==="string"?GFUT_BUILD:"",checksum:await hash(data),data};
  const link=root.document.createElement("a"),url=root.URL.createObjectURL(new Blob([JSON.stringify(b)],{type:"application/json"}));
  try{link.href=url;link.download="Footera_"+b.clubName.replace(/[^a-z0-9_-]/gi,"_").slice(0,32)+"_"+when.slice(0,10)+".json";root.document.body.append(link);link.click();link.remove()}finally{root.setTimeout(()=>root.URL.revokeObjectURL(url),1000)}
  status("Sicherung erstellt. Datei außerhalb des Browsers aufbewahren.");
 }catch(e){status(String(e.message||e),true)}
}
async function importBackup(file){
 if(!file)return;
 const why=blocked();if(why)return status("Nicht möglich "+why+".",true);
 try{
  if(file.size>MAX)fail("Datei größer als 20 MB.");
  const {backup,state:s}=await inspect(await file.text());
  const ok=root.confirm("Spielstand wiederherstellen?\n\nVerein: "+s.profile.clubName+"\nKarten: "+s.club.length+"\nSicherung: "+backup.exportedAt+"\n\nDer aktuelle lokale Spielstand wird ersetzt. Dein Online-Konto wird NICHT übertragen.");
  if(!ok)return status("Abgebrochen.");
  if(blocked())fail("Spielaktion während der Prüfung gestartet.");
  if(typeof flushSave==="function")flushSave();
  const before=root.localStorage.getItem(KEY);
  if(before!==null)root.localStorage.setItem(ROLLBACK,before);
  try{root.localStorage.setItem(KEY,backup.data)}catch(e){if(before!==null)root.localStorage.setItem(KEY,before);throw e}
  status("Spielstand wiederhergestellt. Footera lädt neu.");
  root.location.reload();
 }catch(e){status(String(e.message||e),true)}
}
function mount(){
 const host=root.document.getElementById("clubView");if(!host||root.document.getElementById("footeraBackupPanel"))return;
 const p=root.document.createElement("section");p.id="footeraBackupPanel";p.className="footera-backup";
 p.innerHTML='<small>VEREIN · SICHERUNG</small><h3>Spielstand sichern</h3><p>Lokalen Footera-Verein exportieren oder wiederherstellen. Online-Konten sind nicht enthalten.</p><div class="footera-backup-actions"><button type="button" class="primary" id="footeraBackupExport">Sicherung herunterladen</button><button type="button" class="secondary" id="footeraBackupImport">Wiederherstellen</button><input id="footeraBackupFile" type="file" accept=".json,application/json" hidden></div><p id="footeraBackupStatus" role="status" aria-live="polite">Datei außerhalb des Browsers aufbewahren.</p>';
 const title=host.querySelector(".headline");if(title)title.insertAdjacentElement("afterend",p);else host.prepend(p);
 p.querySelector("#footeraBackupExport").addEventListener("click",exportBackup);
 p.querySelector("#footeraBackupImport").addEventListener("click",()=>p.querySelector("#footeraBackupFile").click());
 p.querySelector("#footeraBackupFile").addEventListener("change",async e=>{const f=e.target.files?.[0];e.target.value="";await importBackup(f)});
}
root.FooteraBackup={validateState,inspect,exportBackup,importBackup,blocked};
if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})(globalThis);
