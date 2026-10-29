/* Halloween Team 1 cup. Match results stay in the simulation; rewards are account-owned. */
(()=>{
 'use strict';
 const ID='halloween-team1',MODE='halloween-cup',START=Date.parse('2026-10-30T19:00:00+01:00'),END=Date.parse('2026-11-06T19:00:00+01:00');
 ratingRewardPack(82,15);
 const rounds=[
  {label:'Viertelfinale',name:'Nebelwald FC',rating:76,chem:16,style:'block',reward:'15.000 Münzen'},
  {label:'Halbfinale',name:'Geisterstunde XI',rating:81,chem:23,style:'wing',reward:'15× 82+-Spieler-Pack · untauschbar'},
  {label:'Finale',name:'Blutmond United',rating:85,chem:28,style:'press',reward:'Halloween Team 1 · 1 aus 3 Spielerpick'}
 ];
 let busy=false,message='';
 function progress(){return state.eventChallenges?.[ID]?.wins||[]}
 function claimKey(stage){return ID+':'+stage}
 function active(at=Date.now()){return at>=START&&at<END}
 function canStart(at=Date.now()){
  if(busy)return 'Die Belohnung wird gerade bestätigt.';
  if(at<START)return 'Der Halloween-Cup startet am 30.10. um 19:00 Uhr.';
  if(at>=END)return 'Der Halloween-Cup ist beendet.';
  if(progress().length>=3)return 'Du hast den Halloween-Cup bereits gewonnen.';
  return '';
 }
 function opponent(){
  const stage=progress().length+1,r=rounds[stage-1];if(!r)return null;
  const o=buildGeneratedOpponent({name:r.name,target:r.rating,chem:r.chem,seed:ID+'|'+stage,tier:r.label});
  o.cupId=ID;o.cupStage=stage;o.styleProfile={id:r.style,label:{block:'Kompakte Defensive',wing:'Flügelspiel',press:'Pressing'}[r.style]};delete o.customTactics;delete o.tactic;
  window.FooteraOpponentStyles?.styleFor?.(o);
  return o;
 }
 function kickoff(o,at=Date.now()){
  const reason=canStart(at);if(reason)return {error:reason};
  if(o?.cupId!==ID||o.cupStage!==progress().length+1)return {error:'Die Cup-Runde hat sich geändert. Bitte die Vorschau erneut öffnen.'};
  return {saveId:state.profile.saveId,stage:o.cupStage,kickoffAt:at};
 }
 function record(m,result,at=Date.now()){
  const ctx=m?.halloweenCup;
  if(m?.mode!==MODE||result!=='win'||!ctx||ctx.saveId!==state.profile.saveId||ctx.stage!==progress().length+1||ctx.stage>3||!m.resultId||!m.finished)return false;
  if(progress().length&&ctx.kickoffAt<progress().at(-1).finishedAt)return false;
  if(ctx.kickoffAt<START||ctx.kickoffAt>=END||at<ctx.kickoffAt||at>=END+7200000||progress().some(w=>w.id===m.resultId))return false;
  state.eventChallenges??={};state.eventChallenges[ID]??={wins:[]};
  state.eventChallenges[ID].wins.push({id:m.resultId,stage:ctx.stage,kickoffAt:ctx.kickoffAt,finishedAt:at});
  save();message=rounds[ctx.stage-1].label+' gewonnen! Deine Belohnung wartet im Halloween-Cup.';return true;
 }
 function applyReward(data){
  if(data.save_id!==state.profile.saveId)throw Error('Der Verein wurde gewechselt.');
  const key=claimKey(data.stage);state.challengeClaims??={};
  if(Object.hasOwn(state.challengeClaims,key))return;
  if(data.stage===1)state.coins+=15000;
  if(data.stage===2){state.packs['reward-82-15']=(state.packs['reward-82-15']||0)+1;state.rewardPackQueue??=[];state.rewardPackQueue.push({id:'reward-82-15',tradeable:false,challengeClaim:key})}
  state.challengeClaims[key]=true;save();flushSave();renderAll();
 }
 async function claim(stage){
  if(busy)return;
  busy=true;message='Belohnung wird mit deinem Konto abgeglichen …';render();
  try{
   await window.FooteraAccount.claimChallengeReward(stage,applyReward);
   message=stage===3?'Dein Halloween-Team-1-Pick liegt unter Store → Meine Player Picks.':'Belohnung erhalten: '+rounds[stage-1].reward;
   window.FooteraPlayerPicks?.refresh?.(true);
  }catch(e){message=e.message||'Keine Bestätigung. Die Belohnung bleibt erhalten; bitte erneut abholen.'}
  finally{busy=false;render()}
 }
 function render(){
  const host=document.getElementById('halloweenCupBody'),summary=document.getElementById('playHalloweenSummary');
  const won=progress().length,at=Date.now(),reason=canStart(at);
  if(summary)summary.textContent=at<START?'Ab 30.10. · 19:00 Uhr':at>=END?'Beendet · verdiente Rewards bleiben abholbar':won+'/3 Siege · garantierter Eventpick';
  if(!host)return;
  host.innerHTML='<section class="play-box cup-hero"><span class="play-kicker">HALLOWEEN · TEAM 1</span><h4>Drei Siege bis zum Blutmond</h4><p>30.10., 19:00 – 06.11., 19:00 Uhr · freie Mannschaftswahl · keine Kaderanforderungen</p><strong>1 aus 3 Halloween-Spielern garantiert</strong><p>Alle 18 Spieler aus Team 1 können erscheinen. Drei unterschiedliche Optionen, ein Spieler für deinen Verein. Untauschbar.</p></section>'+
   '<ol class="cup-rounds">'+rounds.map((r,i)=>{
    const stage=i+1,earned=won>=stage,claimed=!!state.challengeClaims?.[claimKey(stage)];
    return '<li class="play-box '+(earned?'cup-won':'')+'"><span class="play-kicker">'+(earned?'✓ Gewonnen':stage===won+1?'Deine nächste Runde':'Noch gesperrt')+'</span><h4>'+r.label+' · '+r.name+'</h4><p>Zielstärke '+r.rating+' GES · '+({block:'Kompakte Defensive',wing:'Flügelspiel',press:'Pressing'}[r.style])+'</p><strong>'+r.reward+'</strong>'+(earned?'<p>'+(claimed?'✓ Belohnung abgeholt':'Belohnung verdient')+'</p>'+(!claimed?'<button class="primary" type="button" data-cup-claim="'+stage+'" '+(busy?'disabled':'')+'>Belohnung abholen</button>':''):'')+'</li>';
   }).join('')+'</ol><section class="play-box"><button type="button" class="primary startmode" data-mode="halloween-cup" '+(reason?'disabled':'')+'>'+ (won>=3?'Cup gewonnen':at<START?'Start am 30.10. · 19:00':at>=END?'Cup beendet':'Zur Aufstellung · '+rounds[won].label)+'</button><p class="play-note">Niederlage? Versuche dieselbe Runde erneut. Bei Gleichstand folgen Verlängerung und Elfmeterschießen. Jede Belohnung einmal pro Konto. Zum Abholen benötigst du dein bestätigtes Footera-Konto.</p><p role="status">'+esc(message)+'</p></section>';
 }
 document.addEventListener('click',e=>{if(e.target.closest('[data-mode="halloween-cup"]')){openModeEntry(MODE);return}const b=e.target.closest('[data-cup-claim]');if(b)claim(Number(b.dataset.cupClaim))});
 window.FooteraHalloweenCup={ID,MODE,START,END,rounds,active,canStart,opponent,kickoff,record,render,applyReward,busy:()=>busy};
})();
