/* Server-owned Player Picks: fixed offers, one choice, atomic cloud delivery. */
(()=>{
 'use strict';
 let rows=[],owner='',loading=false,busy=false,offer=null,selected='',message='',mounted=false;
 const $=id=>document.getElementById(id);
 const title=p=>p.type==='champions-red'?'Champions Player Pick':'Player Pick';
 const saveId=()=>state.profile?.saveId||'';
 async function account(){
  const api=window.FooteraAccount,c=await api.getClient(),u=await api.user();
  if(!u||u.is_anonymous||!u.email_confirmed_at||localStorage.getItem('footera-cloud-owner')!==u.id)
   throw Error('Melde dich mit dem Konto deines Vereins an, um deine Picks zu laden.');
  return {c,u};
 }
 function render(){
  const host=$('playerPicks');if(!host)return;
  const pending=window.FooteraAccount?.pendingPlayerPick?.();
  const retry=pending&&pending.userId===owner&&pending.saveId===saveId();
  host.innerHTML='<div class="pick-heading"><div><small>DEINE AUSWAHL</small><h3>Meine Player Picks</h3></div><button type="button" data-picks-refresh '+(loading||busy?'disabled':'')+'>Aktualisieren</button></div>'+
   (retry?'<p class="pick-notice">Eine Einlösung wartet auf Bestätigung. Deine Auswahl bleibt gespeichert.</p><button type="button" class="primary" data-pick-recover '+(busy?'disabled':'')+'>Einlösung abschließen</button>':'')+
   '<p class="pick-status" role="status">'+esc(message||(loading?'Picks werden geladen …':rows.length?'Wähle pro Pick einen Spieler. Alle Picks sind untauschbar.':'Noch keine offenen Player Picks.'))+'</p>'+
   rows.map(p=>'<article class="pick-ticket '+(p.type==='champions-red'?'pick-red':'')+'"><span class="pick-ticket-rating">'+p.min_rating+'+</span><div><strong>'+title(p)+'</strong><small>1 aus '+p.choices+' · '+(p.type==='champions-red'?'Aktive TOTW- und Eventkarten':'Goldspieler')+'</small></div><button type="button" class="primary" data-pick-open="'+esc(p.id)+'" '+(busy||retry?'disabled':'')+'>'+(p.options?'Fortsetzen':'Öffnen')+'</button></article>').join('');
 }
 async function refresh(){
  if(loading||busy||!state.onboarded)return;
  loading=true;render();
  try{
   const {c,u}=await account(),id=saveId();
   if(owner!==u.id){rows=[];owner=u.id}
   await window.FooteraAccount.autoAttachAndBackup();
   const {data,error}=await c.rpc('footera_list_player_picks',{p_save_id:id});if(error)throw error;
   const current=await window.FooteraAccount.user();
   if(current?.id!==u.id||localStorage.getItem('footera-cloud-owner')!==u.id||id!==saveId())throw Error('Konto oder Verein wurde gewechselt.');
   rows=Array.isArray(data)?data:[];message='';
  }catch(e){rows=[];message=e.message||'Picks konnten nicht geladen werden.'}
  finally{loading=false;render()}
 }
 function modal(){
  if($('playerPickModal'))return;
  const el=document.createElement('div');el.id='playerPickModal';el.className='modal player-pick-modal';
  el.innerHTML='<section class="player-pick-panel" role="dialog" aria-modal="true" aria-labelledby="playerPickTitle"><button type="button" class="pick-close" data-pick-close aria-label="Auswahl später fortsetzen">×</button><small class="pick-eyebrow">DEINE ENTSCHEIDUNG</small><h2 id="playerPickTitle"></h2><p id="playerPickDescription"></p><div id="playerPickOptions" class="pick-options"></div><p id="playerPickFeedback" role="status"></p><button type="button" class="primary pick-confirm" data-pick-confirm disabled>Spieler auswählen</button><p class="pick-footnote">Du erhältst genau einen Spieler. Die übrigen Optionen verfallen nach deiner Bestätigung.</p></section>';
  document.body.appendChild(el);
 }
 function renderOffer(){
  modal();$('playerPickTitle').textContent=title(offer)+' · '+offer.min_rating+'+';
  $('playerPickDescription').textContent='1 aus '+offer.choices+' · Untauschbar · Auswahl bleibt beim Schließen erhalten';
  $('playerPickOptions').innerHTML=offer.options.map(o=>{
   const item={...o.item,uid:'preview-'+o.id,acquisitionSource:'reward-pick'},base=item.baseSnapshot;
   return '<button type="button" class="pick-option '+(selected===o.id?'selected':'')+'" data-pick-option="'+esc(o.id)+'" aria-pressed="'+(selected===o.id)+'" '+(busy?'disabled':'')+' aria-label="'+esc(base?.name||'Spieler')+' auswählen">'+cardHTML(base,item)+'<span class="pick-select-label">'+(selected===o.id?'✓ Ausgewählt':'Auswählen')+'</span></button>';
  }).join('');
  const b=document.querySelector('[data-pick-confirm]');b.disabled=!selected||busy;b.textContent=busy?'Wird eingelöst …':'Auswahl bestätigen';
  document.querySelector('[data-pick-close]').disabled=busy;
 }
 async function open(id){
  if(busy)return;busy=true;render();
  try{
   if(window.FooteraBackup.blocked())throw Error('Bitte zuerst die aktuelle Spielaktion abschließen.');
   const {c,u}=await account(),sid=saveId();
   const {data,error}=await c.rpc('footera_open_player_pick',{p_id:id,p_save_id:sid});if(error)throw error;
   if((await window.FooteraAccount.user())?.id!==u.id||sid!==saveId())throw Error('Konto oder Verein wurde gewechselt.');
   offer=data;selected='';busy=false;renderOffer();$('playerPickFeedback').textContent='';
   showUiLayer('playerPickModal','player-pick');document.querySelector('[data-pick-close]').focus();
  }catch(e){message=e.message||'Pick konnte nicht geöffnet werden.'}
  finally{busy=false;render()}
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
   rows=rows.filter(p=>p.id!==id);message='';
   if($('playerPickModal'))closeUiLayer('playerPickModal','player-pick');offer=null;selected='';
   renderAll();toast((data.item.baseSnapshot?.name||'Spieler')+((data.save_data.sbcStorage||[]).some(i=>i.uid===id)?' wurde im SBC-Speicher abgelegt.':' ist jetzt in deinem Verein.'));
  }catch(e){
   message=e.message||'Verbindung unterbrochen. Die Einlösung kann sicher erneut versucht werden.';
   if($('playerPickFeedback'))$('playerPickFeedback').textContent=message;
  }finally{busy=false;render();if(offer)renderOffer()}
 }
 function mount(){
  if(mounted)return;mounted=true;modal();render();
  const original=renderStore;renderStore=function(){original();render()};
  document.addEventListener('click',e=>{
   if(e.target.closest('[data-picks-refresh]')){refresh();return}
   const openButton=e.target.closest('[data-pick-open]');if(openButton){open(openButton.dataset.pickOpen);return}
   const option=e.target.closest('[data-pick-option]');if(option&&!busy){selected=option.dataset.pickOption;renderOffer();return}
   if(e.target.closest('[data-pick-confirm]')){choose();return}
   if(e.target.closest('[data-pick-recover]')){choose(true);return}
   if(e.target.closest('[data-pick-close]')&&!busy){closeUiLayer('playerPickModal','player-pick');offer=null;refresh();return}
  });
  window.addEventListener('focus',refresh);
  setTimeout(refresh,3500);
  setInterval(()=>{if(!document.hidden&&currentViewId()==='storeView')refresh()},20000);
 }
 window.FooteraPlayerPicks={refresh,applyDelivery};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
