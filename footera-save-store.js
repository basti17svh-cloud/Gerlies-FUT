/* Footera V21.495 – Spielstand-Speicher ohne 5-MB-Falle (Basti 2026-11-20, nach Max' vollem iPhone-Speicher).
   - Kleine Spielstände bleiben wie bisher als JSON in localStorage (gerliesFutV9).
   - Große Spielstände (ab COMPRESS_AT Zeichen) oder ein voller Speicher: der Stand wird mit
     lz-string komprimiert abgelegt ("FTZ1:" + compressToUTF16). Ein echter Verein mit 2.712 Karten
     schrumpft dabei von 2,2 Mio. auf 114.000 Zeichen (Faktor 19).
   - Zusätzlich liegt eine vollständige Kopie in IndexedDB (kein 5-MB-Limit). Fehlt beim Start der
     Stand in localStorage oder ist er unlesbar, stellt Footera ihn automatisch aus dieser Kopie wieder her.
   - Jeder Speicherfehler wird gemeldet (FooteraSaveStore.onProblem), damit wir ihn sehen, bevor ein
     Spieler sich meldet. */
(()=>{
 "use strict";
 if(window.FooteraSaveStore)return;
 const KEY="gerliesFutV9",LEGACY="uc27v7",PREFIX="FTZ1:",COMPRESS_AT=1200000;
 const DB="footera-save-mirror",STORE="saves",MIRROR_DELAY=2500;
 const CACHE_KEYS=["gfutImageSourceCacheV9","gfutImageFailureCacheV9"];
 const lz=()=>typeof LZString!=="undefined"?LZString:null;
 const listeners=[],history=[];
 let lastMode="",lastProblem="",mirrorTimer=0,mirrorRaw=null,lastMirrored="";

 function problem(kind,detail){
  const key=kind+":"+(detail?.reason||"");
  if(key===lastProblem)return;lastProblem=key;
  // Problems seen before the account script listens (e.g. during start-up) are replayed to it.
  if(history.length<10)history.push([kind,detail||{}]);
  for(const fn of listeners){try{fn(kind,detail||{})}catch(_){}}
 }
 function decode(stored){
  if(typeof stored!=="string"||!stored.startsWith(PREFIX))return stored;
  const L=lz();if(!L)throw Error("Spielstand-Entpacker fehlt.");
  const raw=L.decompressFromUTF16(stored.slice(PREFIX.length));
  if(typeof raw!=="string"||!raw)throw Error("Komprimierter Spielstand ist beschädigt.");
  return raw;
 }
 function encode(raw,force=false){
  const L=lz();
  if(!L||(!force&&raw.length<COMPRESS_AT))return raw;
  const packed=PREFIX+L.compressToUTF16(raw);
  // Never store something that would not come back identical.
  if(L.decompressFromUTF16(packed.slice(PREFIX.length))!==raw)return raw;
  return packed;
 }
 /** Raw JSON of the saved game (decompressed), or null. */
 function read(){
  let stored=null;
  try{stored=localStorage.getItem(KEY)}catch(_){}
  if(stored==null){try{stored=localStorage.getItem(LEGACY)}catch(_){}}
  if(stored==null)return null;
  return decode(stored);
 }
 /** Writes raw JSON. Returns "plain", "compressed" or throws when nothing fits. */
 function write(raw){
  if(typeof raw!=="string"||!raw)throw Error("Leerer Spielstand.");
  let stored=encode(raw),mode=stored===raw?"plain":"compressed";
  try{localStorage.setItem(KEY,stored)}
  catch(first){
   // 1) a full storage: pack the save even when it is small, 2) give the portrait caches' space to it.
   let ok=false;
   const packed=mode==="plain"?encode(raw,true):stored;
   for(const step of [()=>{},()=>{for(const k of CACHE_KEYS)try{localStorage.removeItem(k)}catch(_){}}]){
    step();
    try{localStorage.setItem(KEY,packed);ok=true;break}catch(_){}
   }
   if(!ok){
    problem("save-failed",{reason:String(first?.name||first?.message||"quota").slice(0,60),chars:raw.length});
    scheduleMirror(raw);
    throw first;
   }
   mode=packed===raw?"plain":"compressed";
   problem("save-compressed",{reason:"storage-full",chars:raw.length});
  }
  scheduleMirror(raw);
  lastMode=mode;
  return mode;
 }
 function isCompressed(){try{return String(localStorage.getItem(KEY)||"").startsWith(PREFIX)}catch(_){return false}}

 // ---- IndexedDB mirror -------------------------------------------------
 function openDb(){
  return new Promise((resolve,reject)=>{
   if(typeof indexedDB==="undefined")return reject(Error("IndexedDB fehlt"));
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error("IndexedDB"));
  });
 }
 async function putMirror(raw){
  const db=await openDb();
  try{
   await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).put({raw,savedAt:Date.now(),chars:raw.length},KEY);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
   });
  }finally{db.close()}
 }
 async function readMirror(){
  const db=await openDb();
  try{
   return await new Promise((resolve,reject)=>{
    const req=db.transaction(STORE,"readonly").objectStore(STORE).get(KEY);
    req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
   });
  }finally{db.close()}
 }
 function scheduleMirror(raw){
  mirrorRaw=raw;
  if(mirrorTimer)return;
  mirrorTimer=setTimeout(()=>{
   mirrorTimer=0;const next=mirrorRaw;mirrorRaw=null;
   if(!next||next===lastMirrored)return;
   putMirror(next).then(()=>{lastMirrored=next}).catch(e=>problem("mirror-failed",{reason:String(e?.name||e?.message||"idb").slice(0,60)}));
  },MIRROR_DELAY);
 }
 function flushMirror(){
  if(!mirrorTimer)return Promise.resolve();
  clearTimeout(mirrorTimer);mirrorTimer=0;const next=mirrorRaw;mirrorRaw=null;
  if(!next||next===lastMirrored)return Promise.resolve();
  return putMirror(next).then(()=>{lastMirrored=next}).catch(()=>{});
 }
 async function clearMirror(){
  clearTimeout(mirrorTimer);mirrorTimer=0;mirrorRaw=null;lastMirrored="";
  try{const db=await openDb();try{await new Promise(r=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(KEY);tx.oncomplete=r;tx.onerror=r;tx.onabort=r})}finally{db.close()}}catch(_){}
 }
 /** Start-up check: a club that only survives in IndexedDB is written back and the page reloads once. */
 async function recoverFromMirror(){
  let current=null;
  try{current=read()}catch(_){current=null}
  let parsed=null;try{parsed=current?JSON.parse(current):null}catch(_){parsed=null}
  if(parsed?.onboarded&&parsed?.profile?.saveId)return false;
  const mirror=await readMirror().catch(()=>null);
  let saved=null;try{saved=mirror?.raw?JSON.parse(mirror.raw):null}catch(_){saved=null}
  if(!saved?.onboarded||!saved?.profile?.saveId||!Array.isArray(saved.club))return false;
  try{if(sessionStorage.getItem("footera-mirror-recovered"))return false}catch(_){}
  // Stop the running (empty) game from saving over the recovered club before the reload.
  window.FooteraAccountReplacingSave=true;
  try{write(mirror.raw)}catch(e){window.FooteraAccountReplacingSave=false;throw e}
  try{sessionStorage.setItem("footera-mirror-recovered","1")}catch(_){}
  problem("restored-from-mirror",{reason:"local-missing",chars:mirror.raw.length});
  return true;
 }
 window.addEventListener?.("pagehide",()=>{flushMirror()});
 document.addEventListener?.("visibilitychange",()=>{if(document.visibilityState==="hidden")flushMirror()});

 window.FooteraSaveStore={KEY,PREFIX,COMPRESS_AT,read,write,lastMode:()=>lastMode,decode,encode,isCompressed,readMirror,flushMirror,clearMirror,recoverFromMirror,
  report:problem,
  onProblem(fn){if(typeof fn!=="function")return;listeners.push(fn);for(const [k,d] of history){try{fn(k,d)}catch(_){}}}};
})();
