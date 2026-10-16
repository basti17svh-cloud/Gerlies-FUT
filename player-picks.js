/* Server-owned Player Picks: fixed offers, one choice, atomic cloud delivery. */
(()=>{
 'use strict';
 let rows=[],owner='',loading=false,busy=false,offer=null,selected='',revealed=new Set(),message='',mounted=false,needsCloudRestore=false,lastRefresh=0;
 const $=id=>document.getElementById(id);
 const title=p=>p.type==='champions-red'?'Champions Player Pick':'Player Pick';
 const saveId=()=>state.profile?.saveId||'';
 async function account(){
  const api=window.FooteraAccount,c=await api.getClient();
  // Reading a valid local auth session avoids an extra network round-trip
  // merely to list or open offers. Every RPC still verifies auth server-side.
  let session=null;
  if(c.auth?.getSession){
   try{session=(await c.auth.getSession()).data?.session}catch(_){}
  }
  const u=session?.user||await api.user();
  if(!u||u.is_anonymous||!u.email_confirmed_at||localStorage.getItem('footera-cloud-owner')!==u.id)
   throw Error('Melde dich mit dem Konto deines Vereins an, um deine Picks zu laden.');
  return {c,u};
 }
 function renderHomeNotice(){
  const box=$('homePlayerPickNotice');if(!box)return;
  const count=rows.length;
  box.hidden=!count;
  const qty=$('homePlayerPickCount');if(qty)qty.textContent=String(count);
  const copy=$('homePlayerPickCopy');if(copy)copy.textContent=count===1?'1 Player Pick wartet im Store auf dich.':count+' Player Picks warten im Store auf dich.';
 }
 function render(){
  renderHomeNotice();
  const host=$('playerPicks');if(!host)return;
  const pending=window.FooteraAccount?.pendingPlayerPick?.();
  const retry=pending&&pending.userId===owner&&pending.saveId===saveId();
  host.innerHTML='<div class="pick-heading"><div><small>DEINE AUSWAHL</small><h3>Meine Player Picks</h3></div><button type="button" data-picks-refresh '+(loading||busy?'disabled':'')+'>Aktualisieren</button></div>'+
   (retry?'<p class="pick-notice">Eine Einlösung wartet auf Bestätigung. Deine Auswahl bleibt gespeichert.</p><button type="button" class="primary" data-pick-recover '+(busy?'disabled':'')+'>Einlösung abschließen</button>':'')+
   '<p class="pick-status" role="status">'+esc(message||(loading?'Picks werden geladen …':rows.length?'Wähle pro Pick einen Spieler. Alle Picks sind untauschbar.':'Noch keine offenen Player Picks.'))+'</p>'+
   rows.map(p=>'<article class="pick-ticket '+(p.type==='champions-red'?'pick-red':'')+'"><span class="pick-ticket-rating">'+p.min_rating+'+</span><div><strong>'+title(p)+'</strong><small>1 aus '+p.choices+' · '+(p.type==='champions-red'?'Aktive TOTW- und Eventkarten':'Goldspieler')+'</small></div><button type="button" class="primary" data-pick-open="'+esc(p.id)+'" '+(busy||retry?'disabled':'')+'>'+(p.options?'Fortsetzen':'Öffnen')+'</button></article>').join('');
 }
 async function refresh(force=false){
  if(loading||busy||offer||!state.onboarded)return;
  if(!force&&rows.length&&Date.now()-lastRefresh<15000)return;
  loading=true;render();
  try{
   const {c,u}=await account(),id=saveId();
   if(owner!==u.id){rows=[];owner=u.id}
   // Listing picks should never trigger full-cloud synchronization.
   const {data,error}=await c.rpc('footera_list_player_picks',{p_save_id:id});if(error)throw error;
   if(localStorage.getItem('footera-cloud-owner')!==u.id||id!==saveId())throw Error('Konto oder Verein wurde gewechselt.');
   rows=Array.isArray(data)?data:[];message='';lastRefresh=Date.now();
  }catch(e){message=e.message||'Picks konnten nicht geladen werden.'}
  finally{loading=false;render()}
 }
 function modal(){
  if($('playerPickModal'))return;
  const el=document.createElement('div');el.id='playerPickModal';el.className='modal player-pick-modal';
  el.innerHTML='<section class="player-pick-panel" role="dialog" aria-modal="true" aria-labelledby="playerPickTitle"><button type="button" class="pick-close" data-pick-close aria-label="Auswahl später fortsetzen">×</button><small class="pick-eyebrow">DEINE ENTSCHEIDUNG</small><h2 id="playerPickTitle"></h2><p id="playerPickDescription"></p><div id="playerPickOptions" class="pick-options"></div><p id="playerPickFeedback" role="status"></p><button type="button" class="primary pick-confirm" data-pick-confirm disabled>Spieler auswählen</button><button type="button" class="primary pick-retry-open" data-pick-reopen hidden>Gespeicherte Karten erneut laden</button><button type="button" class="pick-cloud-recover" data-pick-cloud-restore hidden>Cloud-Abgleich sicher prüfen</button><p class="pick-footnote">Du erhältst genau einen Spieler. Die übrigen Optionen verfallen nach deiner Bestätigung.</p></section>';
  document.body.appendChild(el);
 }
 function renderOffer(){
  if(!offer)return;
  modal();$('playerPickTitle').textContent=title(offer)+' · '+offer.min_rating+'+';
  $('playerPickDescription').textContent='1 aus '+offer.choices+' · Tippe eine Karte zum Aufdecken an. Auswahl bleibt gespeichert.';
  $('playerPickOptions').innerHTML=offer.options.map((o,i)=>{
   const item={...o.item,uid:'preview-'+o.id,acquisitionSource:'reward-pick'},base=item.baseSnapshot,shown=revealed.has(o.id);
   const label=base?.name||'Spieler';
   return '<button type="button" class="pick-option '+(shown?'revealed ':'')+(selected===o.id?'selected':'')+'" data-pick-option="'+esc(o.id)+'" aria-pressed="'+(selected===o.id)+'" '+(busy?'disabled':'')+' aria-label="'+(shown?esc(label)+' auswählen':'Karte '+(i+1)+' aufdecken')+'"><span class="pick-flip"><span class="pick-flip-face pick-flip-back" aria-hidden="true"><span class="pick-back-emblem">F</span><span class="pick-back-brand">FOOTERA</span><span class="pick-back-type">PLAYER PICK</span><span class="pick-back-prompt">ANTIPPEN ZUM AUFDECKEN</span></span><span class="pick-flip-face pick-flip-front">'+cardHTML(base,item)+'</span></span><span class="pick-select-label">'+(selected===o.id?'✓ Ausgewählt':shown?'Auswählen':'Aufdecken')+'</span></button>';
  }).join('');
  const b=document.querySelector('[data-pick-confirm]');b.disabled=!selected||busy;b.textContent=busy?'Wird eingelöst …':'Auswahl bestätigen';
  document.querySelector('[data-pick-close]').disabled=busy;
  const recovery=document.querySelector('[data-pick-cloud-restore]');recovery.hidden=!needsCloudRestore;recovery.disabled=busy;
  document.querySelector('[data-pick-reopen]').hidden=true;
 }
 function showOpening(id){
  modal();
  const pick=rows.find(x=>x.id===id);
  $('playerPickTitle').textContent=pick?title(pick)+' · '+pick.min_rating+'+':'Player Pick';
  $('playerPickDescription').textContent='Deine Karten werden geladen …';
  $('playerPickOptions').innerHTML=Array.from({length:pick?.choices||4},()=>'<div class="pick-loading-card" aria-hidden="true"><span class="pick-back-emblem">F</span><span>FOOTERA</span></div>').join('');
  $('playerPickFeedback').textContent='Deine Auswahl wird sicher vorbereitet.';
  const button=document.querySelector('[data-pick-confirm]');button.disabled=true;button.textContent='Bitte kurz warten …';
  document.querySelector('[data-pick-cloud-restore]').hidden=true;
  document.querySelector('[data-pick-reopen]').hidden=true;
  showUiLayer('playerPickModal','player-pick');
 }
 async function open(id){
  if(busy)return;busy=true;render();
  showOpening(id);
  try{
   if(window.FooteraBackup.blocked())throw Error('Bitte zuerst die aktuelle Spielaktion abschließen.');
   const {c,u}=await account(),sid=saveId();
   const controller=typeof AbortController!=='undefined'?new AbortController():null;
   let request=c.rpc('footera_open_player_pick',{p_id:id,p_save_id:sid});
   if(controller&&typeof request.abortSignal==='function')request=request.abortSignal(controller.signal);
   let timeoutReject;
   const deadline=new Promise((_,reject)=>{timeoutReject=reject});
   const timer=setTimeout(()=>{
     controller?.abort();
     timeoutReject(Error('Der Server antwortet gerade zu langsam. Deine Karten bleiben gespeichert. Tippe auf „Gespeicherte Karten erneut laden“.'));
   },16000);
   let response;
   try{response=await Promise.race([request,deadline])}
   finally{clearTimeout(timer)}
   const {data,error}=response;
   if(error)throw error;
   if(localStorage.getItem('footera-cloud-owner')!==u.id||sid!==saveId())throw Error('Konto oder Verein wurde gewechselt.');
   if(!data||!Array.isArray(data.options)||data.options.length!==data.choices)throw Error('Unvollständige Kartenauswahl. Bitte erneut öffnen.');
   offer=data;selected='';revealed=new Set();needsCloudRestore=false;
   busy=false;renderOffer();$('playerPickFeedback').textContent='';
   document.querySelector('[data-pick-close]').focus();
  }catch(e){
   message=e.message||'Pick konnte nicht geöffnet werden.';
   if($('playerPickFeedback'))$('playerPickFeedback').textContent=message;
   $('playerPickDescription').textContent='Dein Pick bleibt unverändert. Bitte erneut öffnen.';
   $('playerPickOptions').innerHTML='';
   const retryButton=document.querySelector('[data-pick-reopen]');
   retryButton.hidden=false;retryButton.dataset.pickReopen=id;retryButton.disabled=false;
  }finally{busy=false;render();if(offer)renderOffer();else document.querySelector('[data-pick-close]').disabled=false}
 }
 function applyDelivery(data){
  const item=data.item,id=data.pick_id;
  if(!item||item.uid!==id||item.playerPickId!==id||item.tradeable!==false||!item.baseSnapshot)
   throw Error('Ungültige Pick-Gutschrift. Bitte erneut versuchen.');
  state.playerPickClaims=state.playerPickClaims||{};
  if(!state.playerPickClaims[id]){
   const known=[...(state.club||[]),...(state.sbcStorage||[]),...(state.pendingPack||[])].some(i=>i.uid===id);
   if(!known){
    const inStorage=(data.save_data.sbcStorage||[]).some(i=>i.uid===id);
    if(inStorage){state.sbcStorage=state.sbcStorage||[];state.sbcStorage.push(item)}else state.club.push(item);
   }
   state.playerPickClaims[id]=data.save_data.playerPickClaims[id];
  }
  save();flushSave();
 }
 async function choose(recover=false){
  if(busy)return;
  const pending=window.FooteraAccount.pendingPlayerPick();
  const id=recover?pending?.pickId:offer?.id,option=recover?pending?.optionId:selected;
  if(!id||!option)return;
  busy=true;render();if(offer)renderOffer();
  try{
   const data=await window.FooteraAccount.choosePlayerPick(id,option,applyDelivery);
   rows=rows.filter(p=>p.id!==id);message='';needsCloudRestore=false;
   if($('playerPickModal'))closeUiLayer('playerPickModal','player-pick');offer=null;selected='';
   renderAll();toast((data.item.baseSnapshot?.name||'Spieler')+((data.save_data.sbcStorage||[]).some(i=>i.uid===id)?' wurde im SBC-Speicher abgelegt.':' ist jetzt in deinem Verein.'));
  }catch(e){
   message=e.message||'Verbindung unterbrochen. Die Einlösung kann sicher erneut versucht werden.';
   needsCloudRestore=/Cloud-Spielstand und Gerät sind nicht synchron|Verein mit der Cloud synchronisieren/.test(message);
   if($('playerPickFeedback'))$('playerPickFeedback').textContent=message;
  }finally{busy=false;render();if(offer)renderOffer()}
 }
 function mount(){
  if(mounted)return;mounted=true;modal();render();
  const original=renderStore;renderStore=function(){original();render()};
  document.addEventListener('click',e=>{
   if(e.target.closest('[data-picks-refresh]')){refresh(true);return}
   const retryOpen=e.target.closest('[data-pick-reopen]');if(retryOpen&&!busy){open(retryOpen.dataset.pickReopen);return}
   const openButton=e.target.closest('[data-pick-open]');if(openButton){open(openButton.dataset.pickOpen);return}
   const option=e.target.closest('[data-pick-option]');if(option&&!busy){
    const id=option.dataset.pickOption;
    if(!revealed.has(id)){
     revealed.add(id);option.classList.add('revealed');
     option.setAttribute('aria-label',(offer?.options.find(o=>o.id===id)?.item?.baseSnapshot?.name||'Spieler')+' auswählen');
     option.querySelector('.pick-select-label').textContent='Auswählen';
    }else{selected=id;renderOffer()}
    return;
   }
   if(e.target.closest('[data-pick-confirm]')){choose();return}
   if(e.target.closest('[data-pick-recover]')){choose(true);return}
   if(e.target.closest('[data-pick-cloud-restore]')&&!busy){
    const button=e.target.closest('[data-pick-cloud-restore]');button.disabled=true;
    window.FooteraAccount.saveCloud().then(saved=>{
     const feedback=$('playerPickFeedback');
     if(saved){
      needsCloudRestore=false;renderOffer();
      if(feedback)feedback.textContent='Cloud-Abgleich abgeschlossen. Deine Auswahl kannst du jetzt bestätigen.';
     }else if(feedback)feedback.textContent='Abgebrochen. Deine Spielstände und dieser Pick bleiben erhalten.';
    }).catch(err=>{const feedback=$('playerPickFeedback');if(feedback)feedback.textContent=err.message||'Cloud-Abgleich nicht möglich. Keine Daten überschrieben.'})
     .finally(()=>{if(button.isConnected)button.disabled=false});
    return;
   }
   if(e.target.closest('[data-picks-jump]')){
    switchView('storeView');refresh();
    setTimeout(()=>$('playerPicks')?.scrollIntoView({behavior:'smooth',block:'start'}),90);
    return;
   }
   if(e.target.closest('[data-pick-close]')&&!busy){closeUiLayer('playerPickModal','player-pick');offer=null;refresh(true);return}
  });
  window.addEventListener('focus',refresh);
  setTimeout(refresh,3500);
  setInterval(()=>{if(!document.hidden&&['storeView','homeView'].includes(currentViewId()))refresh()},30000);
 }
 window.FooteraPlayerPicks={refresh,applyDelivery,isActive:()=>busy||!!offer||!!$('playerPickModal')?.classList.contains('active')};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
