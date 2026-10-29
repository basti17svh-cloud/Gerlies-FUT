/* V21.246: 3D live scenes for online friendlies, like the Rivals matchday.
   Presentation only: the database owns clock, events and result. It holds its
   clock while a scene plays (see online/footera-online-matchday-v21.246.sql). */
(function(root){
 'use strict';
 // Keep in sync with footera_tick: chances from this xG on get a 3D scene.
 const BIG_CHANCE_XG=.22;
 const KEEPER=/^(GK|TW|TH)$/i;
 const SHIRT_FALLBACKS=[9,10,7,11,18,21,6,8,4,5,3,2,14,17,15,20];
 function hash(value){let n=2166136261;for(const ch of String(value||'')){n^=ch.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}
 function formationSlots(formation){const all=typeof FORMATIONS!=='undefined'?FORMATIONS:{};return all[formation]||all['4-3-3']||[]}
 function profile(duel,side){return duel?.[side+'_profile']||{}}
 function teamName(duel,side){return String(profile(duel,side).club_name||'Footera Club').trim()||'Footera Club'}
 function identity(duel,side){const id=profile(duel,side).club_identity;return id&&typeof id==='object'?id:null}
 function crest(duel,side){
  const id=identity(duel,side);
  if(id&&typeof crestHTML==='function'){try{return crestHTML(id,true)||''}catch(_){}}
  return ''
 }
 // Away side wears its away kit, like the Rivals matchday.
 function kit(duel,side){const kits=identity(duel,side)?.kits;return side==='home'?(kits?.home||null):(kits?.away||kits?.home||null)}
 function rows(duel,side){
  const lineup=Array.isArray(duel?.[side+'_lineup'])?duel[side+'_lineup']:[],form=formationSlots(profile(duel,side).formation);
  return lineup.slice(0,11).map((fp,index)=>{
   if(!fp||typeof fp!=='object')return null;
   const base=typeof friendBase==='function'?friendBase(fp):fp,item=typeof friendItem==='function'?friendItem(fp,base):null;
   return{index,fp,base,item,name:String(fp.name||base?.name||'Spieler'),slot:String(form[index]?.p||fp.position||base?.position||'')}
  }).filter(Boolean)
 }
 function same(row,fp){return!!(row&&fp&&(fp.pid?String(row.fp.pid)===String(fp.pid):false)&&String(row.fp.name||'')===String(fp.name||''))}
 function find(list,fp){if(!fp)return null;return list.find(r=>same(r,fp))||list.find(r=>String(r.name).toLowerCase()===String(fp.name||'').toLowerCase())||null}
 function styles(row){
  if(!row?.base||typeof FooteraPlayStyles==='undefined')return[];
  try{return FooteraPlayStyles.resolve({...row.base},row.item?{...row.item}:null).styles.map(p=>({id:String(p.id),plus:!!p.plus})).filter(p=>!p.id.startsWith('custom-'))}catch(_){return[]}
 }
 function tone(row){
  const chosen=typeof FooteraPlayerLooks!=='undefined'&&row?.base?FooteraPlayerLooks.sceneSkin(row.base):null;
  return[chosen,row?.base?.skinTone,row?.base?.skinColor].find(v=>typeof v==='string'&&(/^[1-6]$/.test(v.trim())||/^#[0-9a-f]{6}$/i.test(v.trim()))||Number.isInteger(v)&&v>=1&&v<=6)??null
 }
 function look(row){return typeof FooteraPlayerLooks!=='undefined'&&row?.base?FooteraPlayerLooks.sceneLook(row.base):null}
 function card(row){
  if(!row)return'';
  try{return typeof friendCard==='function'?friendCard(row.fp,row.slot||row.fp.position||'ST',false)||'':''}catch(e){console.warn('Online-Karte',e);return''}
 }
 function kitFields(duel){
  const home=kit(duel,'home'),away=kit(duel,'away');
  return{homeColor:home?.shirtPrimary,homeSecondary:home?.shirtSecondary,homePattern:home?.pattern,homeShorts:home?.shorts,homeSocks:home?.socks,homeKitConfigured:!!home,
   awayColor:away?.shirtPrimary,awaySecondary:away?.shirtSecondary,awayPattern:away?.pattern,awayShorts:away?.shorts,awaySocks:away?.socks,awayKitConfigured:!!away}
 }
 // Attack rows 0-7 (scorer first), defence rows 8-15 (chosen defender at 8).
 function squadLayout(attack,defend,scorer,defender,creator=null,creatorActor=1){
  const field=list=>list.filter(r=>!KEEPER.test(r.slot));
  const a=Array(8).fill(null);a[0]=scorer;if(creator&&creator!==scorer)a[creatorActor]=creator;const rest=field(attack).filter(r=>r!==scorer&&r!==creator);for(let i=0;i<8;i++)if(!a[i])a[i]=rest.shift()||null;
  const d=[defender,...field(defend).filter(r=>r!==defender)].filter(Boolean).slice(0,8);
  const tones=Array(16).fill(null),looks=Array(16).fill(null),names=Array(16).fill(''),numbers=SHIRT_FALLBACKS.slice();
  a.forEach((r,i)=>{if(r){tones[i]=tone(r);looks[i]=look(r);names[i]=r.name}});
  d.forEach((r,i)=>{tones[8+i]=tone(r);looks[8+i]=look(r);names[8+i]=r.name});
  return{playerSkinTones:tones,playerLooks:looks,squadNames:names,shirtNumbers:numbers}
 }
 function defenderFor(list,id){
  const pri=r=>/^(CB|IV)$/i.test(r.slot)?0:/^(CDM|ZDM)$/i.test(r.slot)?1:/^(LB|RB|LV|RV|LWB|RWB)$/i.test(r.slot)?2:3;
  const pool=list.filter(r=>!KEEPER.test(r.slot)).sort((a,b)=>pri(a)-pri(b)||a.index-b.index);
  return pool.length?pool[hash(id)%Math.min(2,pool.length)]:null
 }
 function period(minute){return Number(minute)>45?2:1}
 // Which events of a duel row are shown in 3D. A goal tick appends its chance
 // and then the goal: the chance is part of the goal scene.
 function sceneKind(events,i){
  const e=events[i];if(!e)return'';
  if(e.kind==='goal')return'goal';
  if(e.kind!=='chance'||Number(e.xg||0)<BIG_CHANCE_XG)return'';
  const next=events[i+1];
  if(next&&next.kind==='goal'&&Number(next.minute)===Number(e.minute)&&next.side===e.side)return'';
  return'chance'
 }
 function scoreBefore(events,i){
  let home=0,away=0;
  for(let k=0;k<i;k++){const e=events[k];if(e?.kind==='goal'){if(e.side==='away')away++;else home++}}
  return{home,away}
 }
 function buildEvent(duel,i,history=[]){
  const H=root.FooteraHighlights;if(!H)return null;
  const events=Array.isArray(duel?.events)?duel.events:[],e=events[i],kind=sceneKind(events,i);if(!kind)return null;
  const team=e.side==='away'?'away':'home',defending=team==='home'?'away':'home',id=`online:${duel.id}:${i}`;
  const attack=rows(duel,team),defend=rows(duel,defending);
  const scorer=find(attack,e.player)||attack.filter(r=>!KEEPER.test(r.slot)).at(-1)||null;
  const creator=find(attack,e.creator);
  const goalie=defend.find(r=>KEEPER.test(r.slot))||null,defender=defenderFor(defend,id);
  const roll=hash(id+':outcome')%10;
  const type=kind==='goal'?'goal':roll<6?'big_chance_saved':roll<9?'big_chance_missed':'shot_post';
  const saved=type==='big_chance_saved',shown=saved?goalie:scorer,shownSide=saved?defending:team;
  const event={id,matchId:String(duel.id||''),type,minute:Number(e.minute||0),team,period:period(e.minute),
   playerId:String(scorer?.index??''),playerName:scorer?.name||String(e.text||'Spieler'),
   creatorName:creator?.name||'',assistName:creator?.name||'',creationType:creator&&creator!==scorer?'assist':'solo',
   keeperName:goalie?.name||'',defenderName:defender?.name||'',defenderIndex:8,
   playerStyles:styles(scorer),creatorStyles:styles(creator),keeperStyles:styles(goalie),defenderStyles:styles(defender),
   scorerSlot:scorer?.slot||'',creatorSlot:creator?.slot||'',
   playerCardHTML:card(shown),teamName:teamName(duel,shownSide),teamCrestHTML:crest(duel,shownSide),
   keeperSkinTone:tone(goalie),keeperLook:look(goalie),keeperShirtNumber:1,
   ...squadLayout(attack,defend,scorer,defender),...kitFields(duel)};
  if(type==='goal'){const before=scoreBefore(events,i);event.scoreBeforeHome=before.home;event.scoreBeforeAway=before.away}
  const selected=H.choosePresentation(event,history);
  event.sequence=selected.sequence;event.finish=selected.finish||'normal';event.playSeconds=selected.seconds||10.4;

  event.shotPlacement=H.chooseShotPlacement(event,history);
  const reactions=H.chooseReactions(event);event.defenderAction=reactions.defenderAction;event.keeperAction=reactions.keeperAction;
  event.creatorActor=H.creatorActor?.(event.sequence)||1;
  Object.assign(event,squadLayout(attack,defend,scorer,defender,creator,event.creatorActor));
  event.signatures=H.signatureMoments?.(event)||[];event.signature=H.signatureStyle?.(event)||null;
  event.family=selected.family;
  return event
 }
 function buildCeremony(duel,kind){
  if(!root.FooteraHighlights)return null;
  const home=Number(duel?.home_score||0),away=Number(duel?.away_score||0);
  const team=kind==='fulltime'&&away>home?'away':'home',defending=team==='home'?'away':'home';
  const attack=rows(duel,team),defend=rows(duel,defending),lead=attack.find(r=>!KEEPER.test(r.slot))||null;
  const goalie=defend.find(r=>KEEPER.test(r.slot))||null;
  return{id:`online:${duel.id}:ceremony:${kind}`,type:'ceremony',ceremony:kind,team,minute:kind==='kickoff'?0:Number(duel?.minute||90),period:1,sequence:'central',finish:'normal',
   playerId:String(lead?.index??''),playerName:lead?.name||'',result:kind==='fulltime'&&home===away?'draw':'win',
   homeName:teamName(duel,'home'),awayName:teamName(duel,'away'),homeScore:home,awayScore:away,competition:'Online-Freundschaftsspiel',bigMatch:false,
   teamCrestHTML:crest(duel,team),defendCrestHTML:crest(duel,defending),keeperName:goalie?.name||'',keeperSkinTone:tone(goalie),keeperLook:look(goalie),keeperShirtNumber:1,
   ...squadLayout(attack,defend,lead,null),...kitFields(duel)}
 }
 function pushHistory(history,event){
  return event&&event.type!=='ceremony'?history.concat({sequence:event.sequence,family:event.family,shotSide:event.shotPlacement?.side}).slice(-9):history
 }
 // Scene history before event `end`, the same in every session that sees the duel.
 function historyAt(duel,end){
  const events=Array.isArray(duel?.events)?duel.events:[];let history=[];
  for(let i=0;i<Math.min(end,events.length);i++)if(sceneKind(events,i))history=pushHistory(history,buildEvent(duel,i,history));
  return history
 }
 const api={BIG_CHANCE_XG,sceneKind,buildEvent,buildCeremony,rows,teamName,crest,scoreBefore,pushHistory,historyAt};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FooteraOnline3D=api;
})(globalThis);
