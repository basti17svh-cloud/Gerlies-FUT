// V21.377 Lieblingskarten: a heart on a club card protects it from quick sell, transfer market,
// SBC assistant and the pack twin swap. Stored only on this device (localStorage), the save stays untouched.
(function(){
 "use strict";
 const KEY="footera-favorites-v1",MAX=500;
 let cache=null;
 function read(){
  if(cache)return cache;
  let list=[];
  try{const raw=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(raw))list=raw.map(String).filter(Boolean)}catch(_){}
  cache=new Set(list.slice(-MAX));
  return cache;
 }
 function write(){try{localStorage.setItem(KEY,JSON.stringify([...read()].slice(-MAX)))}catch(_){}}
 function has(uid){return uid!=null&&uid!==""&&read().has(String(uid))}
 function set(uid,on){
  if(uid==null||uid==="")return false;
  const s=read(),id=String(uid);
  if(on)s.add(id);else s.delete(id);
  write();
  return s.has(id);
 }
 function toggle(uid){return set(uid,!has(uid))}
 function list(){return [...read()]}
 // Drop hearts of cards that left the club (sold, SBC, account switch) so the list cannot grow forever.
 function prune(ownedUids){
  if(!ownedUids)return;
  const owned=new Set([...ownedUids].map(String)),s=read();let changed=false;
  for(const id of [...s])if(!owned.has(id)){s.delete(id);changed=true}
  if(changed)write();
 }
 const HEART='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.4 0 5.5 3.3 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z"/></svg>';
 function badgeHTML(uid){return has(uid)?`<span class="favorite-badge" title="Lieblingskarte" aria-label="Lieblingskarte">${HEART}</span>`:""}
 function menuHTML(uid){
  const on=has(uid),esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  return `<button class="menu-action favorite-action${on?" on":""}" data-favorite-toggle="${esc(uid)}"><span><span>${on?"Lieblingskarte · Herz entfernen":"Als Lieblingskarte markieren"}</span><small>${on?"Geschützt: kein Schnellverkauf, kein Transfermarkt, nicht im SBC-Assistenten.":"Schützt die Karte vor Schnellverkauf, Transfermarkt und SBC-Assistent."}</small></span><b class="favorite-heart">${HEART}</b></button>`;
 }
 const blockedText="Lieblingskarte ❤ ist geschützt. Entferne zuerst das Herz im Spielerprofil.";
 window.FooteraFavorites={KEY,has,set,toggle,list,prune,badgeHTML,menuHTML,blockedText,_reset(){cache=null}};
})();
