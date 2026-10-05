/* Footera consumables UX. Changes commit only from the final confirmation. */
(()=>{
 "use strict";
 const C=FooteraChemBoosts,esc=C.safe;let choice=null,targetUid=null,expected=null,page=0;
 function persist(){save();flushSave()}
 function locked(){return !!match&&!match.finished||!!$("onlineMatch")?.classList.contains("active")}
 function renderInventory(){
  const root=$("clubChemBoostSection");if(!root)return;
  const owned=C.inventory(state),total=C.DEFINITIONS.reduce((n,d)=>n+owned[d.id],0);
  root.innerHTML=`<div class="cb-inventory-intro"><h3>Chemie-Boosts</h3><p>${total} Verbrauchsitem${total===1?"":"s"} im Besitz. Kleine Impulse. Große Wirkung.</p><p>Zusätzliche Items in Gold- und Promo-Packs. Die Pfeile zeigen die maximale Wirkung bei 3 individueller Chemie. Ein Spieler trägt einen Boost.</p></div><div class="cb-inventory-grid">${C.DEFINITIONS.map(d=>`<div class="cb-inventory-entry">${C.cardHTML(d.id)}<div class="cb-owned"><span>Im Besitz</span><strong>×${owned[d.id]}</strong></div><button type="button" class="primary" data-cb-choose="${d.id}" ${owned[d.id]?"":"disabled"}>Auf Spieler anwenden</button></div>`).join("")}</div>`
 }
 function ensureModal(){
  if($("chemBoostModal"))return;
  const modal=document.createElement("div");modal.id="chemBoostModal";modal.className="modal cb-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-labelledby","chemBoostDialogTitle");
  modal.innerHTML='<div class="cb-dialog"><div class="cb-dialog-head"><h2 id="chemBoostDialogTitle">Chemie-Boost anwenden</h2><button type="button" class="secondary" data-cb-cancel>Abbrechen</button></div><div class="cb-dialog-body" id="chemBoostDialogBody"></div></div>';document.body.append(modal)
 }
 function open(id,player=null){
  if(locked())return toast("Chemie-Boosts können vor dem nächsten Spiel angewendet werden.");
  choice=C.definition(id);if(!choice||C.count(state,id)<1)return toast("Dieser Chemie-Boost ist nicht im Besitz.");
  ensureModal();targetUid=player;expected=null;page=0;renderPlayers();showUiLayer("chemBoostModal","chem-boost");
  if(player)preview(player);$("chemBoostModal").scrollTop=0
 }
 function renderPlayers(){
  const search=$("chemBoostSearch")?.value||"",q=search.toLocaleLowerCase("de-DE");
  const rows=(state.club||[]).map(item=>({item,b:displayBase(item)})).filter(x=>x.b&&!activeTransferSaleForUid(x.item.uid)&&String(x.b.name).toLocaleLowerCase("de-DE").includes(q));
  const size=24,shown=rows.slice(0,(page+1)*size);
  const html=`<p><b>${esc(choice.name)}</b> · Bestand ${C.count(state,choice.id)}. Wähle einen Spieler für die Vorschau.</p><label>Spieler suchen<input type="search" id="chemBoostSearch" placeholder="Name eingeben" value="${esc(search)}" autocomplete="off"></label><div class="cb-player-list">${shown.map(({item,b})=>{const active=C.active(item),chem=chemBoostPlayerChem(item);return`<button type="button" class="cb-player-option" data-cb-player="${esc(item.uid)}"><strong>${esc(b.name)} · ${itemRating(item)} GES</strong><small>${esc(positionLabel(b.position,b))} · ${chem}/3 Chemie · ${active?esc(active.name):"Kein Chemie-Boost"}</small></button>`}).join("")||'<p>Keine verfügbaren Spieler gefunden.</p>'}</div>${rows.length>shown.length?'<button type="button" class="secondary" data-cb-more>Weitere Spieler anzeigen</button>':""}`;
  const field=$("chemBoostSearch"),focused=field&&document.activeElement===field,pos=field?.selectionStart;
  $("chemBoostDialogBody").innerHTML=html;
  if(focused){$("chemBoostSearch").focus();try{$("chemBoostSearch").setSelectionRange(pos,pos)}catch(e){}}
 }
 function preview(uid){
  const item=state.club.find(x=>x.uid===uid),b=item?displayBase(item):null;if(!b)return;
  targetUid=uid;const previous=C.active(item);expected=previous?.id||null;
  const prospective={...item,chemBoost:{id:choice.id},chemBoostId:null},e=C.effect(resolvedPlayer(b),prospective,chemBoostPlayerChem(item));
  const same=expected===choice.id;
  $("chemBoostDialogBody").innerHTML=`<h3>${esc(b.name)} · ${itemRating(item)} GES</h3><p>${e.chem}/3 individuelle Chemie · Neuer Chemie-Boost: <b>${esc(choice.name)}</b></p>${previous?`<p class="cb-replace-warning">${same?`Dieser Spieler besitzt bereits den Chemie-Boost ‚${esc(previous.name)}‘. Kein weiteres Item erforderlich.`:`Dieser Spieler besitzt bereits den Chemie-Boost ‚${esc(previous.name)}‘. Möchtest du ihn durch ‚${esc(choice.name)}‘ ersetzen?`}</p>`:'<p>Nach Bestätigung wird genau ein Verbrauchsitem verwendet.</p>'}${C.profileHTML(resolvedPlayer(b),prospective,e.chem)}<div class="cb-confirm-actions"><button type="button" class="secondary" data-cb-back>Anderen Spieler wählen</button><button type="button" class="primary" data-cb-confirm ${same?"disabled":""}>${previous?"Boost ersetzen":"Boost anwenden"}</button></div>`;
  $("chemBoostDialogBody").style.setProperty("--cb-accent",choice.color);$("chemBoostModal").scrollTop=0
 }
 function confirmApply(){
  if(!$("chemBoostModal")?.classList.contains("active")||!choice||!targetUid)return;
  if(locked())return toast("Während eines laufenden Spiels ist kein Austausch möglich.");
  const item=state.club.find(x=>x.uid===targetUid);
  if(!item||activeTransferSaleForUid(targetUid))return toast("Dieser Spieler ist nicht mehr verfügbar.");
  const result=C.apply(state,targetUid,choice.id,{confirmed:true,expected});
  if(!result.ok){toast(result.reason==="changed"?"Der aktive Boost hat sich geändert. Prüfe die neue Vorschau.":"Chemie-Boost konnte nicht angewendet werden.");if(result.reason==="changed")preview(targetUid);return}
  // The inventory and attached ID are persisted in the same save snapshot.
  persist();removeUiLayer("chemBoostModal");choice=null;renderAll();renderInventory();
  const i=state.squad.indexOf(item.uid);if($("playerModal")?.classList.contains("active"))openPlayerDetails(item,i>=0?i:null);
  if($("bioModal")?.classList.contains("active"))openBiography(item,i>=0?i:null);
  window.FooteraOnline?.queueProfileSync?.();toast(`${result.boost.name} angewendet.`)
 }
 function openForPlayer(uid){
  if(!state.club.some(i=>i.uid===uid))return;
  ensureModal();targetUid=uid;choice=null;
  const owned=C.DEFINITIONS.filter(d=>C.count(state,d.id)>0);
  $("chemBoostDialogBody").innerHTML=`<p>Chemie-Boost für diesen Spieler auswählen.</p>${owned.map(d=>`<button type="button" class="cb-player-option" data-cb-pick-owned="${d.id}" data-cb-target="${esc(uid)}"><strong>${esc(d.name)} ×${C.count(state,d.id)}</strong><small>${C.ATTRIBUTES.filter(a=>d.arrows[a.key]).map(a=>`${a.name} ${"↑".repeat(d.arrows[a.key])}`).join(" · ")}</small></button>`).join("")||'<p>Keine Chemie-Boosts im Besitz. Du kannst sie zusätzlich in Gold- und Promo-Packs ziehen.</p>'}`;
  showUiLayer("chemBoostModal","chem-boost");$("chemBoostModal").scrollTop=0
 }
 function renderPack(){
  const items=C.pending(state);if(!items.length)return;
  $("resultGrid").insertAdjacentHTML("beforeend",`<section class="pack-result-section"><div class="pack-result-head"><h3>Chemie-Boosts</h3><span>${items.length} zusätzliche Verbrauchsitems</span></div><div class="result-items-grid cb-pack-items">${items.map(i=>`<div class="cb-pack-item">${C.cardHTML(i.chemBoostId)}<button type="button" class="primary" data-cb-collect="${esc(i.uid)}">Zum Verein</button></div>`).join("")}</div></section>`);
  $("resultAllClub").disabled=false;$("resultAllClub").style.display="";
  $("resultHint").textContent+=" Chemie-Boosts haben eigene zusätzliche Slots und werden im Verein gestapelt."
 }
 document.addEventListener("input",e=>{if(e.target.id==="chemBoostSearch"){page=0;renderPlayers()}});
 document.addEventListener("click",e=>{
  const choose=e.target.closest("[data-cb-choose]");if(choose){open(choose.dataset.cbChoose);return}
  const player=e.target.closest("[data-cb-player]");if(player){preview(player.dataset.cbPlayer);return}
  const owned=e.target.closest("[data-cb-pick-owned]");if(owned){open(owned.dataset.cbPickOwned,owned.dataset.cbTarget);return}
  const manage=e.target.closest("[data-cb-manage]");if(manage){openForPlayer(manage.dataset.cbManage);return}
  const collected=e.target.closest("[data-cb-collect]");if(collected){if(C.collect(state,collected.dataset.cbCollect)){persist();packResultsRefresh();toast("Chemie-Boost zum Verein hinzugefügt.")}return}
  if(e.target.closest("[data-cb-confirm]")){confirmApply();return}
  if(e.target.closest("[data-cb-back]")){page=0;renderPlayers();return}
  if(e.target.closest("[data-cb-more]")){page++;renderPlayers();return}
  if(e.target.closest("[data-cb-cancel]")){choice=null;targetUid=null;closeUiLayer("chemBoostModal","chem-boost")}
 });
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("chemBoostModal")?.classList.contains("active")){choice=null;targetUid=null;closeUiLayer("chemBoostModal","chem-boost")}});
 window.FooteraChemBoostUI={renderInventory,renderPack,openForPlayer};
})();
