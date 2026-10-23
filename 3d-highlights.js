/* Footera highlights: presentation-only queue. No access to the match or its RNG. */
(function(root){
 'use strict';
 const TYPES=Object.freeze(['goal','big_chance_saved','big_chance_missed','shot_post','ball_won','ceremony']);
 const MODES=Object.freeze({off:'Aus',goals:'Nur Tore',important:'Wichtige Highlights',all:'Alle Highlights'});
 const KEY='footera-3d-highlights-v1';
 let mode='important',loader;
 try{const saved=root.localStorage?.getItem(KEY);if(saved in MODES)mode=saved}catch(_){}
 // V21.226: walk-out and final whistle belong to Wichtige/Alle Highlights.
 function accepts(type,value=mode){return TYPES.includes(type)&&value!=='off'&&(value!=='goals'||type==='goal')&&(!['ball_won','ceremony'].includes(type)||value==='important'||value==='all')}
 function setMode(value){mode=value in MODES?value:'important';try{root.localStorage?.setItem(KEY,mode)}catch(_){}if(mode!=='off')prewarm();return mode}
 // Period is captured at enqueue time from the simulator's existing lifecycle flags.
 // In particular 45+/90+/105+ belong to the current period until its break is logged.
 function getMatchPeriod(state){return state.extraTimeStarted?(state.extraTimeBreakLogged?4:3):(state.halftimeLogged?2:1)}
 function getAttackDirection(team,period){return (team==='away'?-1:1)*([2,4].includes(Number(period))?-1:1)}
 function snapshot(event){
  // Copy only display data. Never pass a live player, match or saved state to WebGL.
  return Object.freeze({id:String(event.id),type:String(event.type),minute:Number(event.minute),team:String(event.team),
   period:[1,2,3,4].includes(Number(event.period))?Number(event.period):1,attackDirection:event.type==='ceremony'?1:getAttackDirection(event.team,event.period),
   playerId:String(event.playerId||''),playerName:String(event.playerName||'Spieler'),keeperName:String(event.keeperName||''),assistName:String(event.assistName||''),creatorName:String(event.creatorName||''),creationType:String(event.creationType||''),actionKind:String(event.actionKind||''),sceneKind:String(event.sceneKind||''),restartSide:event.restartSide==='right'?'right':'left',buildKeeperName:String(event.buildKeeperName||''),buildKeeperSkinTone:typeof event.buildKeeperSkinTone==='string'||Number.isInteger(event.buildKeeperSkinTone)?event.buildKeeperSkinTone:null,sequence:String(event.sequence||'central'),finish:String(event.finish||'normal'),playerStyles:Object.freeze((Array.isArray(event.playerStyles)?event.playerStyles:[]).map(s=>Object.freeze({id:String(s?.id||''),plus:!!s?.plus}))),creatorStyles:Object.freeze((Array.isArray(event.creatorStyles)?event.creatorStyles:[]).map(s=>Object.freeze({id:String(s?.id||''),plus:!!s?.plus}))),
   keeperStyles:Object.freeze((Array.isArray(event.keeperStyles)?event.keeperStyles:[]).map(s=>Object.freeze({id:String(s?.id||''),plus:!!s?.plus}))),
   defenderStyles:Object.freeze((Array.isArray(event.defenderStyles)?event.defenderStyles:[]).map(s=>Object.freeze({id:String(s?.id||''),plus:!!s?.plus}))),
   shotPlacement:event.shotPlacement?Object.freeze({
    side:event.shotPlacement.side===-1?-1:1,
    zone:['inside','channel','corner'].includes(event.shotPlacement.zone)?event.shotPlacement.zone:'channel',
    height:['low','mid','high'].includes(event.shotPlacement.height)?event.shotPlacement.height:'mid',
    ...(GOAL_STYLES.includes(event.shotPlacement.style)?{style:event.shotPlacement.style}:{})
   }):null,
   defenderName:String(event.defenderName||''),defenseKind:String(event.defenseKind||''),playSeconds:Number.isFinite(Number(event.playSeconds))?Math.max(8,Math.min(30,Number(event.playSeconds))):10.4,defenderIndex:Number.isInteger(event.defenderIndex)&&event.defenderIndex>=8&&event.defenderIndex<=15?event.defenderIndex:8,
   defenderAction:String(event.defenderAction||'jockey'),keeperAction:String(event.keeperAction||'classic'),
   signature:event.signature&&SIGNATURE_NAMES[event.signature.id]?Object.freeze({id:String(event.signature.id),name:SIGNATURE_NAMES[event.signature.id],who:event.signature.who==='creator'?'creator':'scorer'}):null,
   playerCardHTML:String(event.playerCardHTML||''),teamName:String(event.teamName||''),teamCrestHTML:String(event.teamCrestHTML||''),
   scoreBeforeHome:Number.isFinite(Number(event.scoreBeforeHome))?Number(event.scoreBeforeHome):null,
   scoreBeforeAway:Number.isFinite(Number(event.scoreBeforeAway))?Number(event.scoreBeforeAway):null,
   scorerSlot:String(event.scorerSlot||''),creatorSlot:String(event.creatorSlot||''),homeColor:String(event.homeColor||'#961e43'),awayColor:String(event.awayColor||'#e9ecf3'),
   homeSecondary:String(event.homeSecondary||event.homeColor||'#961e43'),awaySecondary:String(event.awaySecondary||event.awayColor||'#e9ecf3'),
   homePattern:String(event.homePattern||'solid'),awayPattern:String(event.awayPattern||'solid'),homeKitConfigured:event.homeKitConfigured===true,awayKitConfigured:event.awayKitConfigured===true,
   homeShorts:String(event.homeShorts||'#f3f4ee'),awayShorts:String(event.awayShorts||'#172b49'),homeSocks:String(event.homeSocks||event.homeColor||'#961e43'),awaySocks:String(event.awaySocks||event.awayColor||'#e9ecf3'),
   shirtNumbers:Object.freeze((Array.isArray(event.shirtNumbers)?event.shirtNumbers:[]).slice(0,16).map(n=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=99?Number(n):0)),
   playerSkinTones:Object.freeze((Array.isArray(event.playerSkinTones)?event.playerSkinTones:[]).slice(0,16).map(v=>typeof v==='string'&&(/^#[0-9a-f]{6}$/i.test(v)||/^[1-6]$/.test(v))?v:Number.isInteger(v)&&v>=1&&v<=6?v:null)),
   keeperSkinTone:event.keeperSkinTone??null,
   playerLooks:Object.freeze(Array.from({length:16},(_,i)=>cleanLook((Array.isArray(event.playerLooks)?event.playerLooks:[])[i]))),
   keeperLook:cleanLook(event.keeperLook),
   keeperShirtNumber:Number.isInteger(Number(event.keeperShirtNumber))&&Number(event.keeperShirtNumber)>=1&&Number(event.keeperShirtNumber)<=99?Number(event.keeperShirtNumber):1,
   // V21.226 ceremonies (walk-out / final whistle) and the goal replay.
   ceremony:['kickoff','fulltime'].includes(event.ceremony)?event.ceremony:'',result:['win','draw'].includes(event.result)?event.result:'',
   homeName:String(event.homeName||''),awayName:String(event.awayName||''),competition:String(event.competition||''),bigMatch:event.bigMatch===true,
   homeScore:Number.isFinite(Number(event.homeScore))?Number(event.homeScore):null,awayScore:Number.isFinite(Number(event.awayScore))?Number(event.awayScore):null,
   defendCrestHTML:String(event.defendCrestHTML||''),squadNames:Object.freeze((Array.isArray(event.squadNames)?event.squadNames:[]).slice(0,16).map(n=>String(n||''))),
   replay:event.replay!==false});
 }
 function loadRenderer(){return loader||(loader=import('./3d-highlights-scene.mjs?v=21229').catch(e=>{loader=null;throw e}))}
  // Idle preparation never stalls the match or hides its live field.
  function prewarm(){if(mode==='off'||!root.document)return;loadRenderer().then(m=>{
   m.prepareFooteraPlayerModel().catch(()=>{});
   // V21.193 human squad: fetched once while idle, then cached by the service worker.
   if(m.footeraHumanPlayersWanted?.())return m.prepareFooteraHumanModel?.();
  }).catch(()=>{})}
  if(root.document&&mode!=='off'){
   const schedule=()=>{if(typeof root.requestIdleCallback==='function')root.requestIdleCallback(prewarm,{timeout:2500});else root.setTimeout(prewarm,1100)};
   if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  }
 async function defaultPlay(event,signal){
  if(signal.aborted)return 'skipped';
  const host=root.document?.getElementById('matchLiveStage');if(!host)return 'fallback';
  const loading=document.createElement('div');loading.className='fh3d-warming';
  const text=document.createElement('span');text.className='fh3d-loading';text.textContent=event.ceremony==='kickoff'?'ANPFIFF':event.ceremony==='fulltime'?'ABPFIFF':'LIVE-CHANCE';
  const top=document.createElement('div');top.className='fh3d-top';
  const skip=document.createElement('button');skip.className='fh3d-skip';skip.textContent='Überspringen';skip.type='button';top.append(skip);loading.append(text,top);host.append(loading);
  let skipped=false,skipResolve;
  const skippedPromise=new Promise(resolve=>{skipResolve=resolve});
  const remove=()=>loading.remove();signal.addEventListener('abort',remove,{once:true});
  skip.onclick=()=>{skipped=true;remove();skipResolve('skipped')};
  try{return await Promise.race([loadRenderer().then(async module=>{
   // First a genuine 3D skinned GLB, then the existing deterministic highlight.
   // Missing file / slow device => existing Footera actor, never delay results.
   if(!signal.aborted&&!skipped){
    let disabled=false;
    try{
      const model=root.localStorage?.getItem('footera-3d-player-model');
      disabled=model==='legacy';
      // V21.81 safety rollback: experimental MakeHuman was visibly malformed.
      // Remove the opt-in; only the isolated A/B diagnostics may load that model.
      if(model==='makehuman')root.localStorage?.removeItem('footera-3d-player-model');
    }catch(_){}
    if(!disabled)module.prepareFooteraPlayerModel().catch(()=>{}); // Use available skinned fallback immediately
    if(!disabled&&module.footeraHumanPlayersWanted?.())module.prepareFooteraHumanModel?.().catch(()=>{});
    // The club crest for the shirts decodes in a few milliseconds; never wait long.
    if(module.loadFooteraCrestImage)await Promise.race([Promise.all([module.loadFooteraCrestImage(event.teamCrestHTML),event.defendCrestHTML?module.loadFooteraCrestImage(event.defendCrestHTML):null]),new Promise(r=>setTimeout(r,250))]);
   }
   remove();return signal.aborted||skipped?'skipped':module.play(event,signal);
  }),skippedPromise])}
  finally{remove();signal.removeEventListener('abort',remove)}
 }

 // Existing PlayStyle IDs are taken from playstyles.js; this is visual weighting only.
 const PLAYBOOK_SCENES=Object.freeze([
  ['triangle_left','combination',7,'normal','short'],['triangle_right','combination',7,'normal','short'],
  ['tiki_short','combination',8,'normal','short'],['tiki_quick','combination',7,'normal','short'],
  ['wall_pass_left','combination',7,'normal','short'],['wall_pass_right','combination',7,'normal','short'],
  ['central_recycle','combination',6,'normal','medium'],['midfield_switch','switch',5,'normal','long'],
  ['first_touch_triangle','combination',7,'normal','medium'],['third_man_run','combination',8,'normal','medium'],
  ['split_defenders','through',8,'low_driven','short'],['curved_striker_run','through',8,'normal','short'],
  ['left_halfspace_thread','through',7,'normal','medium'],['right_halfspace_thread','through',7,'normal','medium'],
  ['deep_playmaker_lob','through',4,'normal','medium'],
  ['overlap_left_low','overlap',7,'normal','medium'],['overlap_right_low','overlap',7,'normal','medium'],
  ['overlap_left_high','overlap',6,'header','medium'],['overlap_right_high','overlap',6,'header','medium'],
  ['early_low_delivery_left','lowcross',6,'low_driven','short'],['early_low_delivery_right','lowcross',6,'low_driven','short'],
  ['switch_overlap_low','switch',5,'normal','long'],['switch_overlap_high','switch',5,'header','long'],
  ['quick_burst_left','dribble',5,'normal','short'],['quick_burst_right','dribble',5,'normal','short'],
  ['inside_link_left','dribble',5,'finesse','medium'],['inside_link_right','dribble',5,'finesse','medium'],
  ['edge_cutback_finesse','cutback',5,'finesse','medium'],['first_time_power','distance',4,'power','short'],
  ['near_post_tap','nearpost',5,'low_driven','short'],
   ['reverse_cutback_left','cutback',7,'finesse','medium'],
   ['reverse_cutback_right','cutback',7,'finesse','medium'],
   ['blindside_overlap_left','overlap',7,'normal','medium'],
   ['blindside_overlap_right','overlap',7,'normal','medium'],
   ['diagonal_counter_left','through',8,'low_driven','short'],
   ['diagonal_counter_right','through',8,'low_driven','short'],
   ['edge_of_box_recycle','combination',7,'power','medium'],
   ['back_post_sweep','lowcross',6,'normal','medium'],
   ['late_midfield_runner','combination',6,'normal','short'],
   ['short_corner_combo','combination',5,'finesse','medium'],
   ['halfspace_overload_left','combination',7,'finesse','medium'],
   ['halfspace_overload_right','combination',7,'finesse','medium'],
   ['counter_reversal_left','switch',6,'low_driven','long'],
   ['counter_reversal_right','switch',6,'low_driven','long'],
   ['wing_isolation_left','dribble',7,'finesse','medium'],
   ['wing_isolation_right','dribble',7,'finesse','medium'],
   ['late_cutback_left','cutback',7,'normal','medium'],
   ['late_cutback_right','cutback',7,'normal','medium'],
  ["layoff_distance","distance",7,"power","short"],
  ["switch_distance_left","distance",6,"finesse","medium"],
  ["near_post_driven_left","nearpost",8,"low_driven","medium"],
  ["near_post_header_right","nearpost",7,"header","medium"],
  ["six_yard_square_left","lowcross",8,"low_driven","medium"],
  ["counter_square_right","through",8,"normal","medium"],
  ["byline_pullback_left","cutback",7,"normal","medium"],
  ["edge_pullback_right","cutback",7,"power","medium"],
  ["back_post_volley_left","lowcross",6,"volley","medium"],
  ["overlap_clipped_right","overlap",6,"header","long"],
  ["striker_wall_return","combination",8,"low_driven","medium"],
  ["diagonal_lob_finish","through",6,"chip","medium"],
  ["false_nine_drop_left", "combination", 6, "finesse", "medium"],
  ["false_nine_drop_right", "combination", 6, "finesse", "medium"],
  ["winger_one_two_left", "combination", 7, "normal", "short"],
  ["winger_one_two_right", "combination", 7, "normal", "short"],
  ["box_rondo", "combination", 6, "low_driven", "medium"],
  ["fullback_link_left", "combination", 6, "normal", "medium"],
  ["fullback_link_right", "combination", 6, "normal", "medium"],
  ["channel_ball_left", "through", 7, "low_driven", "short"],
  ["channel_ball_right", "through", 7, "low_driven", "short"],
  ["playmaker_slide_left", "through", 7, "normal", "short"],
  ["playmaker_slide_right", "through", 7, "normal", "short"],
  ["dink_over_line", "through", 5, "chip", "short"],
  ["long_ball_sprint", "through", 5, "normal", "medium"],
  ["underlap_left", "overlap", 6, "normal", "medium"],
  ["underlap_right", "overlap", 6, "normal", "medium"],
  ["overlap_volley_left", "overlap", 4, "volley", "medium"],
  ["overlap_volley_right", "overlap", 4, "volley", "medium"],
  ["byline_drive_left", "lowcross", 6, "low_driven", "short"],
  ["byline_drive_right", "lowcross", 6, "low_driven", "short"],
  ["far_post_slide_right", "lowcross", 5, "normal", "medium"],
  ["whipped_header_left", "nearpost", 6, "header", "medium"],
  ["whipped_header_right", "nearpost", 6, "header", "medium"],
  ["deep_cross_header_left", "overlap", 5, "header", "long"],
  ["deep_cross_header_right", "overlap", 5, "header", "long"],
  ["slalom_left", "dribble", 5, "finesse", "short"],
  ["slalom_right", "dribble", 5, "power", "short"],
  ["winger_takeon_left", "dribble", 6, "finesse", "medium"],
  ["winger_takeon_right", "dribble", 6, "finesse", "medium"],
  ["pullback_power_left", "cutback", 6, "power", "medium"],
  ["pullback_power_right", "cutback", 6, "power", "medium"],
  ["cutback_volley_left", "cutback", 4, "volley", "medium"],
  ["edge_rocket", "distance", 5, "power", "short"],
  ["recycle_rocket_left", "distance", 5, "power", "medium"],
  ["recycle_curler_right", "distance", 5, "finesse", "medium"],
  ["halfvolley_drive", "distance", 4, "volley", "short"],
  ["switch_cut_left", "switch", 5, "finesse", "long"],
  ["switch_cut_right", "switch", 5, "finesse", "long"],
  ["near_post_flick_header_left", "nearpost", 5, "header", "medium"],
  ["near_post_flick_header_right", "nearpost", 5, "header", "medium"],
  ["counter_sprint_left", "through", 7, "normal", "short"],
  ["counter_sprint_right", "through", 7, "normal", "short"],
  ["rebound_drive", "combination", 5, "power", "short"]
 ].map(([id,family,weight,finish,length],index)=>Object.freeze({
  id,family,weight,finish,
  seconds:length==='long'?17+(index%3):length==='medium'?13+(index%3):9+(index%3),
  tags:Object.freeze(({combination:['tiki-taka','first-touch','incisive-pass'],switch:['long-ball-pass','flair'],
   through:['incisive-pass','through-ball'],overlap:['rapid','quick-step','pinged-pass'],
   lowcross:['pinged-pass','first-touch'],dribble:['technical','trickster','rapid'],
   cutback:['pinged-pass','finesse-shot'],distance:['power-shot','first-touch'],
   nearpost:['first-touch','low-driven-shot']})[family]||[])
 })));
 const VISUAL_SCENES=Object.freeze([
  ['central','central',12,'normal',[]],['one_two','combination',11,'normal',['tiki-taka','incisive-pass']],
  ['through_ball','through',11,'normal',['through-ball','incisive-pass']],
  ['dribble','dribble',9,'normal',['technical','trickster']],
  ['wing_left','wing',10,'normal',['rapid','quick-step']],['wing_right','wing',10,'normal',['rapid','quick-step']],
  ['cutback_left','cutback',10,'normal',['pinged-pass']],['cutback_right','cutback',10,'normal',['pinged-pass']],
  ['inside_left','inside',10,'finesse',['finesse-shot','technical']],
  ['inside_right','inside',10,'finesse',['finesse-shot','technical']],
  ['cut_inside_left','inverted',10,'finesse',['technical','finesse-shot','quick-step']],['cut_inside_right','inverted',10,'finesse',['technical','finesse-shot','quick-step']],
  ['double_feint_left','feint',5.5,'finesse',['trickster','technical','finesse-shot']],['double_feint_right','feint',5.5,'finesse',['trickster','technical','finesse-shot']],
  ['near_post_cut_left','cutfinish',5,'power',['rapid','power-shot']],['near_post_cut_right','cutfinish',5,'power',['rapid','power-shot']],
  ['low_cross_left','lowcross',6,'normal',['pinged-pass','first-touch']],['low_cross_right','lowcross',6,'normal',['pinged-pass','first-touch']],
  ['chip_one_on_one','chip',2.5,'chip',['chip-shot']],['chip_counter','chip',1.5,'chip',['chip-shot','rapid']],
  ['halfspace_left','halfspace',9,'normal',['tiki-taka','first-touch']],
  ['halfspace_right','halfspace',9,'normal',['tiki-taka','first-touch']],
  ['counter_central','counter',10,'normal',['rapid','quick-step']],
  ['counter_left','counter',9,'normal',['rapid','quick-step']],
  ['counter_right','counter',9,'normal',['rapid','quick-step']],
  ['diagonal_switch','switch',7,'normal',['long-ball-pass','flair']],
  ['long_shot','distance',5,'power',['power-shot']],
  ['one_on_one','duel',7,'low_driven',['low-driven-shot','rapid']],
  ['early_cross_left','cross',5,'header',['power-header','aerial']],
  ['early_cross_right','cross',5,'header',['power-header','aerial']],
  ['far_post_left','farpost',4,'header',['power-header','aerial']],
  ['far_post_right','farpost',4,'header',['power-header','aerial']],
  ['near_post_left','nearpost',4,'header',['power-header','aerial']],
  ['near_post_right','nearpost',4,'header',['power-header','aerial']],
  ['volley_left','volley',1.3,'volley',['acrobatic','first-touch']],
  ['volley_right','volley',1.3,'volley',['acrobatic','first-touch']],
  ['second_ball','second',5,'normal',['first-touch']],
  ['high_press','press',6,'normal',['anticipate','intercept']],
  ['finesse_halfspace','curler',5,'finesse',['finesse-shot']],
  ['power_drive','drive',4,'power',['power-shot']],
  ['low_driven_duel','lowduel',5,'low_driven',['low-driven-shot']],
  ['bicycle','bicycle',.08,'bicycle',['acrobatic']]
 ].map(([id,family,weight,finish,tags])=>Object.freeze({id,family,weight,finish,tags:Object.freeze(tags)})));
 function visualHash(input){let n=2166136261;for(const ch of String(input)){n^=ch.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}

 const GOAL_STYLES=Object.freeze(['crossbar_in','post_in','top_corner']);
 // V21.215 Aussehen-Editor: only known haircut/beard ids and plain hex colours reach the scene.
 const LOOK_HAIR=/^(bald|short0[1-4]|afro01)$/,LOOK_BEARD=/^(none|Full_beard|Moustache)$/,LOOK_HEX=/^#[0-9a-f]{6}$/i;
 function cleanLook(v){
  if(!v||typeof v!=='object')return null;
  const out={};
  if(LOOK_HAIR.test(String(v.hair||'')))out.hair=String(v.hair);
  if(LOOK_BEARD.test(String(v.beard||'')))out.beard=String(v.beard);
  if(LOOK_HEX.test(String(v.hairColor||'')))out.hairColor=String(v.hairColor).toLowerCase();
  return Object.keys(out).length?Object.freeze(out):null;
 }
 const LONG_RANGE=new Set(['long_shot','power_drive','finesse_halfspace','layoff_distance','switch_distance_left','edge_pullback_right','first_time_power','edge_of_box_recycle','extended_free_kick']);
 function goalStyle(event,key){
  const finish=String(event.finish||'normal'),seq=String(event.sequence||'');
  if(['header','chip','bicycle'].includes(finish)||/^extended_(?:penalty|corner|throw_in)/.test(seq))return null;
  const n=visualHash(key+':goal-style')%100,far=LONG_RANGE.has(seq)||/(?:distance|rocket|curler|halfvolley)/.test(seq);
  // Long shots often fly into the top corner; elsewhere these stay special.
  if(far)return n<38?'top_corner':n<50?'crossbar_in':n<58?'post_in':null;
  if(finish==='low_driven')return n<12?'post_in':null;
  return n<8?'crossbar_in':n<16?'post_in':n<22?'top_corner':null;
 }
 function chooseShotPlacement(event,history=[]){
  // A deterministic, presentation-only corner: no match RNG is consumed.
  const key=[event.id||'',event.minute||0,event.team||'',event.playerId||'',event.sequence||'',event.finish||'',event.type||''].join('|');
  const prior=(Array.isArray(history)?history:[]).slice(-3).filter(item=>item?.shotSide===-1||item?.shotSide===1);
  let side=(visualHash(key+':corner')&1)?1:-1;
  if(prior.length>1&&prior[prior.length-1].shotSide===prior[prior.length-2].shotSide)
   side=-prior[prior.length-1].shotSide;
  const zones=['inside','channel','corner'],heights=['low','mid','high'];
  const placement={side,zone:zones[visualHash(key+':zone')%3],
   height:event.finish==='low_driven'?'low':event.finish==='chip'?'high':heights[visualHash(key+':height')%3]};
  // V21.204 goal variants (Basti): in off the bar, in off the post, top corner.
  // Only the picture of a goal changes; the simulation already decided it.
  const style=event.type==='goal'?goalStyle(event,key):null;
  if(style==='top_corner'){placement.zone='corner';placement.height='high'}
  if(style)placement.style=style;
  return Object.freeze(placement);
 }
 function visualStyleMap(input){const map=new Map();for(const s of Array.isArray(input)?input:[]){const id=typeof s==='string'?s:s?.id;if(typeof id==='string'&&id)map.set(id,s?.plus?2:1)}return map}
 // Deterministic presentation-only choreography. Every action is an attempt;
 // a defender can NEVER turn an authoritative goal into a block/interception.
 function chooseReactions(event){
  const defender=visualStyleMap(event.defenderStyles),keeper=visualStyleMap(event.keeperStyles);
  const seq=String(event.sequence||'central'),finish=String(event.finish||'normal');
  const aerial=/(?:cross|post|volley|bicycle)/.test(seq)||['header','volley','bicycle'].includes(finish);
  const breakaway=/(?:through_ball|one_on_one|counter|duel)/.test(seq);
  const skill=/(?:dribble|inside|feint|cut_inside|halfspace)/.test(seq);
  const low=finish==='low_driven'||/(?:low_cross|low_driven)/.test(seq);
  const styles=(map,...ids)=>Math.max(0,...ids.map(id=>map.get(id)||0));
  const hashKey=[event.id||'',event.minute||0,event.team||'',event.playerId||'',seq,finish,event.type||''].join('|');
  function pick(options,salt){
   const total=options.reduce((sum,x)=>sum+x[1],0);
   let n=visualHash(hashKey+salt)/4294967296*total;
   return options.find(x=>(n-=x[1])<0)?.[0]||options[0][0];
  }
  const defenseAction=pick([
   ['jockey',5*(skill?2.4:1)*(1+styles(defender,'jockey')*.85)],
   ['close_down',6*(breakaway?2:1)*(1+styles(defender,'anticipate')*.6)],
   ['slide_attempt',3.2*(aerial?.13:1)*(breakaway||skill?1.7:1)*(1+styles(defender,'slide-tackle')*1.3)],
   ['block_attempt',5*(aerial?.3:1)*(1+styles(defender,'block')*1.25)],
   ['lane_read',4.5*(breakaway?1.75:1)*(1+styles(defender,'intercept','anticipate')*.9)],
   ['aerial_challenge',aerial?6*(1+styles(defender,'aerial')*1.1):.08]
  ],':defense');
  // Non-saved shots retain a BEATEN keeper: no impossible successful save animation.
  let keeperAction='beaten';
  if(event.type==='big_chance_saved'){
   keeperAction=pick([
    ['classic',5],
    ['fingertip',3.5*(low?.18:1.5)*(1+styles(keeper,'far-reach')*1.2)],
    ['parry',4*(1+styles(keeper,'deflector')*1.4)],
    ['low_reflex',low?6*(1+styles(keeper,'footwork')*1.25):.15],
    ['rush_spread',breakaway?5*(1+styles(keeper,'rush-out')*1.3):.14],
    ['high_reach',aerial?5*(1+styles(keeper,'cross-claimer','far-reach')*1.05):.14]
   ],':keeper');
  }
  // V21.195 drama: some missed chances become a clearance off the goal line.
  // Still a miss for the match; only the picture changes.
  if(event.type==='big_chance_missed'&&!seq.startsWith('extended_')&&!['chip','bicycle'].includes(finish)&&visualHash(hashKey+':line')%4===0)keeperAction='line_clear';
  return Object.freeze({defenderAction:defenseAction,keeperAction});
 }
 // V21.195 star moments: simulated chances may also show the matching big
 // visual finishes (screamer from distance, volley or bicycle kick, solo
 // feint). Presentation only; the simulated outcome and finish stay.
 const STAR_SCENES=Object.freeze({
  distance:{power:['long_shot','power_drive'],finesse:['finesse_halfspace']},
  cross:{volley:['volley_left','volley_right','bicycle']},
  dribble:{normal:['dribble','double_feint_left','double_feint_right'],finesse:['double_feint_left','double_feint_right','inside_left','inside_right'],low_driven:['dribble']}
 });
 const STAR_IDS=new Set(Object.values(STAR_SCENES).flatMap(x=>Object.values(x).flat()));
 function starScenes(event,scorer){
  const ids=STAR_SCENES[event.actionKind]?.[event.finish]||[];
  return VISUAL_SCENES.filter(v=>ids.includes(v.id)&&(v.id!=='bicycle'||scorer.has('acrobatic'))).map(v=>v.id==='bicycle'?Object.freeze({...v,weight:scorer.get('acrobatic')===2?2.2:.9}):v);
 }
 // V21.196 PlayStyle+ signature moments. A plus PlayStyle that matches what
 // the player actually does in this chance gets its own scene: name badge,
 // slow motion into the strike and a gold ball trail, in the normal TV picture.
 // Presentation only; it shows for goals, saves and misses alike.
 const SIGNATURE_NAMES=Object.freeze({'power-shot':'Powerschuss','finesse-shot':'Angeschnittener Schuss','trivela':'Außenrist','low-driven-shot':'Flacher Vollspannschuss','chip-shot':'Lupfer','power-header':'Präziser Kopfball','aerial':'Kopfballmacht','acrobatic':'Akrobatik','dead-ball':'Ruhender Ball','trickster':'Tricks','technical':'Technik','rapid':'Raserei','quick-step':'Schneller Schritt','incisive-pass':'Entscheidender Pass','through-ball':'Schnittstellenpass','long-ball-pass':'Weiter Pass','pinged-pass':'Harter Pass','tiki-taka':'Tiki-Taka'});
 function signatureStyle(event,finish=event.finish){
  const plus=list=>new Set((Array.isArray(list)?list:[]).filter(s=>s&&s.plus).map(s=>typeof s==='string'?s:s.id));
  const scorer=plus(event.playerStyles),creator=plus(event.creatorStyles),kind=String(event.actionKind||''),scene=String(event.sceneKind||'');
  const first=(set,ids)=>ids.find(id=>set.has(id));
  const shot=scene==='free_kick'||scene==='penalty'?first(scorer,['dead-ball']):
   finish==='power'?first(scorer,['power-shot']):finish==='finesse'?first(scorer,['finesse-shot','trivela']):
   finish==='low_driven'?first(scorer,['low-driven-shot']):finish==='chip'?first(scorer,['chip-shot']):
   finish==='header'?first(scorer,['power-header','aerial']):finish==='volley'||finish==='bicycle'?first(scorer,['acrobatic']):
   kind==='dribble'?first(scorer,['trickster','technical','rapid','quick-step']):null;
  if(shot)return Object.freeze({id:shot,name:SIGNATURE_NAMES[shot],who:'scorer'});
  const hasCreator=!!String(event.creatorName||event.assistName||'').trim()&&String(event.creationType||'')!=='solo';
  const pass=scene==='corner'?first(creator,['dead-ball']):!hasCreator||scene?null:
   kind==='through'?first(creator,['incisive-pass','through-ball']):kind==='switch'?first(creator,['long-ball-pass']):
   kind==='cross'?first(creator,['long-ball-pass','pinged-pass']):kind==='cutback'?first(creator,['pinged-pass']):
   kind==='combination'?first(creator,['tiki-taka']):null;
  return pass?Object.freeze({id:pass,name:SIGNATURE_NAMES[pass],who:'creator'}):null;
 }
 function choosePresentation(event,history=[]){
  // Retired: extended_turnover_counter. Its scripted interception left
  // defenders motionless and the final runner offside. Preserve the simulator's
  // real chance outcome but select a normal, continuous 3D attacking play.
  const extendedKinds=['keeper_buildout','corner','free_kick','penalty','throw_in'];
  if(extendedKinds.includes(event.sceneKind))return Object.freeze({sequence:'extended_'+event.sceneKind+(event.sceneKind==='corner'&&event.restartSide==='right'?'_right':''),family:event.actionKind||event.sceneKind,finish:event.sceneKind==='corner'&&!['header','volley','bicycle'].includes(event.finish)?'header':event.finish||'normal',seconds:({keeper_buildout:25,corner:18,free_kick:16,penalty:13,throw_in:16})[event.sceneKind],signature:signatureStyle(event,event.sceneKind==='corner'&&!['header','volley','bicycle'].includes(event.finish)?'header':event.finish)});
  const scorer=visualStyleMap(event.playerStyles),creator=visualStyleMap(event.creatorStyles);
  const striker=String(event.scorerSlot||'').toUpperCase(),provider=String(event.creatorSlot||'').toUpperCase();
  const wide=/^(LW|RW|LF|RF|LM|RM|LB|RB|LV|RV|LAV|RAV|LAS|RAS|LWB|RWB)$/.test(striker),mid=/^(CAM|CM|CDM|ZOM|ZM|ZDM)$/.test(striker),centreBack=/^(CB|IV)$/.test(striker);
  const hasCreator=!!String(event.creatorName||event.assistName||'').trim()&&String(event.creationType||'')!=='solo';
  const side=/^(LW|LF|LM|LB|LV|LAS|LAV|LWB)$/.test(provider)?'left':/^(RW|RF|RM|RB|RV|RAS|RAV|RWB)$/.test(provider)?'right':'';
  const strikerSide=/^(LW|LF|LM|LB|LV|LAS|LAV|LWB)$/.test(striker)?'left':/^(RW|RF|RM|RB|RV|RAS|RAV|RWB)$/.test(striker)?'right':'';
  const recent=(Array.isArray(history)?history:[]).slice(-9);
  const simulated=['combination','through','dribble','cross','cutback','distance','switch'].includes(event.actionKind);
  const distanceIds=['layoff_distance','switch_distance_left','edge_pullback_right','edge_rocket','recycle_rocket_left','recycle_curler_right','halfvolley_drive'];
  const pool=simulated?PLAYBOOK_SCENES.filter(v=>{
   if(event.actionKind==='distance')return distanceIds.includes(v.id);
   if(event.actionKind==='cross')return v.finish===event.finish;
   if(['header','volley','bicycle'].includes(v.finish)||distanceIds.includes(v.id))return false;
   if(event.finish==='chip')return v.finish==='chip';
   return v.family===event.actionKind;
  }).concat(simulated?starScenes(event,scorer):[]):[...VISUAL_SCENES,...PLAYBOOK_SCENES];
  const starSignature=simulated&&signatureStyle(event)?.who==='scorer';
  const choices=pool.map(v=>{
   let w=v.weight;
   if(PLAYBOOK_SCENES.includes(v)){
    if(!hasCreator)w*=.04;
    if(['combination','through','switch'].includes(v.family)&&hasCreator)w*=1.45;
    if(['lowcross','overlap','nearpost','cutback'].includes(v.family)&&hasCreator)w*=1.6;
    if(v.family==='through'&&(creator.has('incisive-pass')||creator.has('through-ball')))w*=2.1;
    if(v.family==='switch'&&creator.has('long-ball-pass'))w*=2.25;
    if(v.family==='combination'&&creator.has('tiki-taka'))w*=1.9;
    if(v.family==='overlap'&&creator.has('pinged-pass'))w*=1.8;
    if(v.id.includes('left')&&side==='right'||v.id.includes('right')&&side==='left')w*=.22;
     if(v.id.includes('counter')&&creator.has('incisive-pass'))w*=1.45;
     if(v.id.includes('cutback')&&creator.has('pinged-pass'))w*=1.35;
    if(v.id.includes('header')||v.finish==='header')w*=scorer.has('power-header')||scorer.has('aerial')?1.6:.66;
   }
   for(const id of v.tags){const ps=scorer.get(id);if(ps)w*=1+.48*ps;const pa=hasCreator&&creator.get(id);if(pa)w*=1+.38*pa}
   if(['wing','cutback','lowcross','cross','nearpost','farpost','volley'].includes(v.family)&&hasCreator&&/^(LW|RW|LF|RF|LM|RM|LB|RB|LV|RV|LAV|RAV|LAS|RAS|LWB|RWB)$/.test(provider))w*=1.8;
   if(['through','duel','counter','lowduel'].includes(v.family)&&hasCreator&&(creator.has('incisive-pass')||creator.has('through-ball')))w*=1.9;
   if(['cross','nearpost','farpost'].includes(v.family)&&(scorer.has('power-header')||scorer.has('aerial')))w*=2.1;
   if(['cross','nearpost','farpost','volley'].includes(v.family)&&hasCreator&&(creator.has('long-ball-pass')||creator.has('pinged-pass')))w*=1.5;
   if(v.family==='distance'&&mid)w*=2.2;
   if(v.family==='halfspace'&&mid)w*=1.65;
   if(['inside','inverted','feint','cutfinish','curler'].includes(v.family)&&wide)w*=2.8;
   if(['inside','inverted','feint','cutfinish'].includes(v.family)&&!wide)w*=.38;
   if(['inside','inverted','feint','cutfinish'].includes(v.family)&&strikerSide&&v.id.endsWith('_'+(strikerSide==='left'?'right':'left')))w*=.08;
   if(['inverted','feint'].includes(v.family)&&scorer.has('finesse-shot'))w*=scorer.get('finesse-shot')===2?2.3:1.6;
   if(v.family==='feint'&&scorer.has('trickster'))w*=1.65;
   if(v.family==='chip'&&scorer.has('chip-shot'))w*=scorer.get('chip-shot')===2?3.8:2.5;
   if(v.family==='chip'&&!scorer.has('chip-shot'))w*=.55;
   if(v.family==='lowcross'&&hasCreator&&creator.has('pinged-pass'))w*=2.1;
   if(v.family==='duel'&&/^(ST|CF)$/.test(striker))w*=1.8;
   if(centreBack)w*=(v.finish==='header'?3:(['dribble','inside','inverted','feint','cutfinish','chip'].includes(v.family)?.13:.6));
   if(event.creationType==='solo'&&['wing','cross','cutback','lowcross','nearpost','farpost','volley','combination','switch'].includes(v.family))w*=.08;
   if(v.family==='bicycle'&&(!hasCreator||centreBack))w*=.3;
   if(side&&v.id.endsWith('_'+(side==='left'?'right':'left'))&&['wing','cutback','lowcross','cross','nearpost','farpost','volley','counter'].includes(v.family))w*=.25;
   if(event.team==='away'&&event.opponentStyle){
    const style=String(event.opponentStyle),family=v.family;
    const matches=style==='possession'?['combination','switch','halfspace'].includes(family):
     style==='counter'?['through','counter','duel','switch'].includes(family):
     style==='wing'?['wing','cutback','cross','lowcross','overlap','nearpost','farpost'].includes(family):
     style==='press'?['press','through','dribble'].includes(family):
     style==='block'?['counter','through','duel'].includes(family):false;
    if(matches)w*=3.05;else w*=.90;
   }
   // A PlayStyle+ finisher strongly favours the big star version of his finish.
   if(starSignature&&STAR_IDS.has(v.id))w*=v.id==='bicycle'?1.6:4;
   for(let i=recent.length-1;i>=0;i--){const item=recent[i];if(item?.sequence===v.id)w*=i===recent.length-1?.07:.19;else if(item?.family===v.family)w*=.56}
   return [v,Math.max(.0001,w)];
  });
  const key=[event.matchId||'',event.id||'',event.minute||'',event.playerId||'',event.playerName||'',event.team||'',event.type||'',event.creationType||'',Array.from(scorer).join(','),Array.from(creator).join(','),recent.map(x=>x.sequence).join(',')].join('|');
  let pick=visualHash(key)/4294967296*choices.reduce((n,x)=>n+x[1],0);
  const chosen=choices.find(x=>(pick-=x[1])<0)?.[0]||choices[0][0];
  // Finishing module is independent from the attack build-up and never touches match outcomes.
  const finish=simulated?(chosen.id==='bicycle'?'bicycle':event.finish||'normal'):chosen.finish==='normal'&&scorer.has('finesse-shot')&&visualHash(key+':finish')%7===0?'finesse':
   chosen.finish==='normal'&&scorer.has('low-driven-shot')&&visualHash(key+':low')%8===0?'low_driven':chosen.finish;
  return Object.freeze({sequence:chosen.id,family:chosen.family,finish,seconds:chosen.seconds||10.4,signature:signatureStyle(event,finish)});
 }
 class Queue{
  constructor({play,onBusy=()=>{},onIdle=()=>{},onFallback=()=>{},timeout=32000,replayTimeout=10000}={}){
   this.play=play||defaultPlay;
   this.onBusy=onBusy;this.onIdle=onIdle;this.onFallback=onFallback;this.timeout=timeout;this.replayTimeout=replayTimeout;this.items=[];this.seen=new Set();this.busy=false;this.epoch=0;this.disabled=false;
  }
  enqueue(event){
   if(this.disabled||!accepts(event.type)||this.seen.has(String(event.id)))return false;
   this.seen.add(String(event.id));this.items.push(snapshot(event));
   if(!this.busy){this.busy=true;this.onBusy();const epoch=this.epoch;Promise.resolve().then(()=>{if(epoch===this.epoch)this.drain(epoch)})}
   return true;
  }
  async drain(epoch){
   while(this.items.length&&epoch===this.epoch){
    const event=this.items.shift(),controller=new AbortController();this.controller=controller;
    let timer,abort;
    try{
     const interrupted=new Promise(resolve=>{abort=()=>resolve(controller.signal.reason==='timeout'?'fallback':'skipped');controller.signal.addEventListener('abort',abort,{once:true})});
     // A goal also plays its replay (V21.226), roughly eight more seconds.
     const replayMs=event.type==='goal'&&event.replay!==false?this.replayTimeout:0;
     timer=setTimeout(()=>controller.abort('timeout'),(String(event.sequence||'').startsWith('extended_')?Math.max(this.timeout,(Number(event.playSeconds)||0)*1000+15000):this.timeout)+replayMs);
     const result=await Promise.race([Promise.resolve().then(()=>this.play(event,controller.signal)),interrupted]);
     if(result==='fallback'&&epoch===this.epoch){this.disabled=true;this.items=[];this.onFallback(event)}
    }catch(error){if(epoch===this.epoch){this.disabled=true;this.items=[];this.onFallback(event,error)}}
    finally{clearTimeout(timer);controller.signal.removeEventListener('abort',abort);controller.abort();if(this.controller===controller)this.controller=null}
   }
   if(epoch===this.epoch){this.busy=false;this.onIdle()}
  }
  skip(){this.controller?.abort('skip')}
  cancel(){this.epoch++;this.items=[];this.busy=false;this.controller?.abort('cancel');this.controller=null}
 }
 const api={TYPES,MODES,VISUAL_SCENES,PLAYBOOK_SCENES,choosePresentation,signatureStyle,chooseShotPlacement,chooseReactions,Queue,accepts,snapshot,setMode,prewarm,getMatchPeriod,getAttackDirection,getMode:()=>mode};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FooteraHighlights=api;
})(globalThis);
