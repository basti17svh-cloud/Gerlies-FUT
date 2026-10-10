/* Footera highlights: presentation-only queue. No access to the match or its RNG. */
(function(root){
 'use strict';
 const TYPES=Object.freeze(['goal','big_chance_saved','big_chance_missed','shot_post']);
 const MODES=Object.freeze({off:'Aus',goals:'Nur Tore',important:'Wichtige Highlights',all:'Alle Highlights'});
 const KEY='footera-3d-highlights-v1';
 let mode='important',loader;
 try{const saved=root.localStorage?.getItem(KEY);if(saved in MODES)mode=saved}catch(_){}
 function accepts(type,value=mode){return TYPES.includes(type)&&value!=='off'&&(value!=='goals'||type==='goal')}
 function setMode(value){mode=value in MODES?value:'important';try{root.localStorage?.setItem(KEY,mode)}catch(_){}return mode}
 // Period is captured at enqueue time from the simulator's existing lifecycle flags.
 // In particular 45+/90+/105+ belong to the current period until its break is logged.
 function getMatchPeriod(state){return state.extraTimeStarted?(state.extraTimeBreakLogged?4:3):(state.halftimeLogged?2:1)}
 function getAttackDirection(team,period){return (team==='away'?-1:1)*([2,4].includes(Number(period))?-1:1)}
 function snapshot(event){
  // Copy only display data. Never pass a live player, match or saved state to WebGL.
  return Object.freeze({id:String(event.id),type:String(event.type),minute:Number(event.minute),team:String(event.team),
   period:[1,2,3,4].includes(Number(event.period))?Number(event.period):1,attackDirection:getAttackDirection(event.team,event.period),
   playerId:String(event.playerId||''),playerName:String(event.playerName||'Spieler'),keeperName:String(event.keeperName||''),assistName:String(event.assistName||''),creatorName:String(event.creatorName||''),creationType:String(event.creationType||''),sequence:String(event.sequence||'central'),finish:String(event.finish||'normal'),playerStyles:Object.freeze((Array.isArray(event.playerStyles)?event.playerStyles:[]).map(s=>Object.freeze({id:String(s?.id||''),plus:!!s?.plus}))),creatorStyles:Object.freeze((Array.isArray(event.creatorStyles)?event.creatorStyles:[]).map(s=>Object.freeze({id:String(s?.id||''),plus:!!s?.plus}))),
   keeperStyles:Object.freeze((Array.isArray(event.keeperStyles)?event.keeperStyles:[]).map(s=>Object.freeze({id:String(s?.id||''),plus:!!s?.plus}))),
   defenderStyles:Object.freeze((Array.isArray(event.defenderStyles)?event.defenderStyles:[]).map(s=>Object.freeze({id:String(s?.id||''),plus:!!s?.plus}))),
   defenderName:String(event.defenderName||''),defenseKind:String(event.defenseKind||''),playSeconds:Number.isFinite(Number(event.playSeconds))?Math.max(8,Math.min(20,Number(event.playSeconds))):10.4,defenderIndex:Number.isInteger(event.defenderIndex)&&event.defenderIndex>=8&&event.defenderIndex<=15?event.defenderIndex:8,
   defenderAction:String(event.defenderAction||'jockey'),keeperAction:String(event.keeperAction||'classic'),
   playerCardHTML:String(event.playerCardHTML||''),teamName:String(event.teamName||''),teamCrestHTML:String(event.teamCrestHTML||''),
   scoreBeforeHome:Number.isFinite(Number(event.scoreBeforeHome))?Number(event.scoreBeforeHome):null,
   scoreBeforeAway:Number.isFinite(Number(event.scoreBeforeAway))?Number(event.scoreBeforeAway):null,
   scorerSlot:String(event.scorerSlot||''),creatorSlot:String(event.creatorSlot||''),homeColor:String(event.homeColor||'#961e43'),awayColor:String(event.awayColor||'#e9ecf3'),
   homeSecondary:String(event.homeSecondary||event.homeColor||'#961e43'),awaySecondary:String(event.awaySecondary||event.awayColor||'#e9ecf3'),
   homePattern:String(event.homePattern||'solid'),awayPattern:String(event.awayPattern||'solid'),homeKitConfigured:event.homeKitConfigured===true,awayKitConfigured:event.awayKitConfigured===true,
   homeShorts:String(event.homeShorts||'#f3f4ee'),awayShorts:String(event.awayShorts||'#172b49'),homeSocks:String(event.homeSocks||event.homeColor||'#961e43'),awaySocks:String(event.awaySocks||event.awayColor||'#e9ecf3'),
   shirtNumbers:Object.freeze((Array.isArray(event.shirtNumbers)?event.shirtNumbers:[]).slice(0,16).map(n=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=99?Number(n):0)),
   keeperShirtNumber:Number.isInteger(Number(event.keeperShirtNumber))&&Number(event.keeperShirtNumber)>=1&&Number(event.keeperShirtNumber)<=99?Number(event.keeperShirtNumber):1});
 }
 function loadRenderer(){return loader||(loader=import('./3d-highlights-scene.mjs?v=2196'))}
 async function defaultPlay(event,signal){
  if(signal.aborted)return 'skipped';
  const host=root.document?.getElementById('matchLiveStage');if(!host)return 'fallback';
  const loading=document.createElement('div');loading.className='fh3d';
  const text=document.createElement('span');text.className='fh3d-loading';text.textContent='LIVE-CHANCE';
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
    if(!disabled)try{await Promise.race([
      module.prepareFooteraPlayerModel(),
      new Promise(resolve=>setTimeout(()=>resolve(false),4500))
    ])}catch(error){console.warn('Footera GLB unavailable, using original footballer:',error)}
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
   ['short_corner_combo','combination',5,'finesse','medium']
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
  return Object.freeze({defenderAction:defenseAction,keeperAction});
 }
 function choosePresentation(event,history=[]){
  const scorer=visualStyleMap(event.playerStyles),creator=visualStyleMap(event.creatorStyles);
  const striker=String(event.scorerSlot||'').toUpperCase(),provider=String(event.creatorSlot||'').toUpperCase();
  const wide=/^(LW|RW|LF|RF|LM|RM|LB|RB|LV|RV|LAV|RAV|LAS|RAS|LWB|RWB)$/.test(striker),mid=/^(CAM|CM|CDM|ZOM|ZM|ZDM)$/.test(striker),centreBack=/^(CB|IV)$/.test(striker);
  const hasCreator=!!String(event.creatorName||event.assistName||'').trim()&&String(event.creationType||'')!=='solo';
  const side=/^(LW|LF|LM|LB|LV|LAS|LAV|LWB)$/.test(provider)?'left':/^(RW|RF|RM|RB|RV|RAS|RAV|RWB)$/.test(provider)?'right':'';
  const strikerSide=/^(LW|LF|LM|LB|LV|LAS|LAV|LWB)$/.test(striker)?'left':/^(RW|RF|RM|RB|RV|RAS|RAV|RWB)$/.test(striker)?'right':'';
  const recent=(Array.isArray(history)?history:[]).slice(-9);
  const choices=[...VISUAL_SCENES,...PLAYBOOK_SCENES].map(v=>{
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
   for(let i=recent.length-1;i>=0;i--){const item=recent[i];if(item?.sequence===v.id)w*=i===recent.length-1?.07:.19;else if(item?.family===v.family)w*=.56}
   return [v,Math.max(.0001,w)];
  });
  const key=[event.matchId||'',event.id||'',event.minute||'',event.playerId||'',event.playerName||'',event.team||'',event.type||'',event.creationType||'',Array.from(scorer).join(','),Array.from(creator).join(','),recent.map(x=>x.sequence).join(',')].join('|');
  let pick=visualHash(key)/4294967296*choices.reduce((n,x)=>n+x[1],0);
  const chosen=choices.find(x=>(pick-=x[1])<0)?.[0]||choices[0][0];
  // Finishing module is independent from the attack build-up and never touches match outcomes.
  const finish=chosen.finish==='normal'&&scorer.has('finesse-shot')&&visualHash(key+':finish')%7===0?'finesse':
   chosen.finish==='normal'&&scorer.has('low-driven-shot')&&visualHash(key+':low')%8===0?'low_driven':chosen.finish;
  return Object.freeze({sequence:chosen.id,family:chosen.family,finish,seconds:chosen.seconds||10.4});
 }
 class Queue{
  constructor({play,onBusy=()=>{},onIdle=()=>{},onFallback=()=>{},timeout=32000}={}){
   this.play=play||defaultPlay;
   this.onBusy=onBusy;this.onIdle=onIdle;this.onFallback=onFallback;this.timeout=timeout;this.items=[];this.seen=new Set();this.busy=false;this.epoch=0;this.disabled=false;
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
     timer=setTimeout(()=>controller.abort('timeout'),this.timeout);
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
 const api={TYPES,MODES,VISUAL_SCENES,PLAYBOOK_SCENES,choosePresentation,chooseReactions,Queue,accepts,snapshot,setMode,getMatchPeriod,getAttackDirection,getMode:()=>mode};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FooteraHighlights=api;
})(globalThis);
