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
   playerCardHTML:String(event.playerCardHTML||''),teamName:String(event.teamName||''),teamCrestHTML:String(event.teamCrestHTML||''),
   scoreBeforeHome:Number.isFinite(Number(event.scoreBeforeHome))?Number(event.scoreBeforeHome):null,
   scoreBeforeAway:Number.isFinite(Number(event.scoreBeforeAway))?Number(event.scoreBeforeAway):null,
   scorerSlot:String(event.scorerSlot||''),creatorSlot:String(event.creatorSlot||''),homeColor:String(event.homeColor||'#961e43'),awayColor:String(event.awayColor||'#e9ecf3'),
   homeSecondary:String(event.homeSecondary||event.homeColor||'#961e43'),awaySecondary:String(event.awaySecondary||event.awayColor||'#e9ecf3'),
   homePattern:String(event.homePattern||'solid'),awayPattern:String(event.awayPattern||'solid'),homeKitConfigured:event.homeKitConfigured===true,awayKitConfigured:event.awayKitConfigured===true,
   homeShorts:String(event.homeShorts||'#f3f4ee'),awayShorts:String(event.awayShorts||'#172b49'),homeSocks:String(event.homeSocks||event.homeColor||'#961e43'),awaySocks:String(event.awaySocks||event.awayColor||'#e9ecf3')});
 }
 function loadRenderer(){return loader||(loader=import('./3d-highlights-scene.mjs?v=2127'))}
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
  try{return await Promise.race([loadRenderer().then(module=>{remove();return signal.aborted||skipped?'skipped':module.play(event,signal)}),skippedPromise])}
  finally{remove();signal.removeEventListener('abort',remove)}
 }

 // Existing PlayStyle IDs are taken from playstyles.js; this is visual weighting only.
 const VISUAL_SCENES=Object.freeze([
  ['central','central',12,'normal',[]],['one_two','combination',11,'normal',['tiki-taka','incisive-pass']],
  ['through_ball','through',11,'normal',['through-ball','incisive-pass']],
  ['dribble','dribble',9,'normal',['technical','trickster']],
  ['wing_left','wing',10,'normal',['rapid','quick-step']],['wing_right','wing',10,'normal',['rapid','quick-step']],
  ['cutback_left','cutback',10,'normal',['pinged-pass']],['cutback_right','cutback',10,'normal',['pinged-pass']],
  ['inside_left','inside',10,'finesse',['finesse-shot','technical']],
  ['inside_right','inside',10,'finesse',['finesse-shot','technical']],
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
 function choosePresentation(event,history=[]){
  const scorer=visualStyleMap(event.playerStyles),creator=visualStyleMap(event.creatorStyles);
  const striker=String(event.scorerSlot||'').toUpperCase(),provider=String(event.creatorSlot||'').toUpperCase();
  const wide=/^(LW|RW|LM|RM|LB|RB|LWB|RWB)$/.test(striker),mid=/^(CAM|CM|CDM)$/.test(striker),centreBack=/^(CB)$/.test(striker);
  const hasCreator=!!String(event.creatorName||event.assistName||'').trim()&&String(event.creationType||'')!=='solo';
  const side=/^(LW|LM|LB|LWB)$/.test(provider)?'left':/^(RW|RM|RB|RWB)$/.test(provider)?'right':'';
  const recent=(Array.isArray(history)?history:[]).slice(-5);
  const choices=VISUAL_SCENES.map(v=>{
   let w=v.weight;
   for(const id of v.tags){const ps=scorer.get(id);if(ps)w*=1+.48*ps;const pa=hasCreator&&creator.get(id);if(pa)w*=1+.38*pa}
   if(['wing','cutback','cross','nearpost','farpost','volley'].includes(v.family)&&hasCreator&&/^(LW|RW|LM|RM|LB|RB|LWB|RWB)$/.test(provider))w*=1.8;
   if(['through','duel','counter','lowduel'].includes(v.family)&&hasCreator&&(creator.has('incisive-pass')||creator.has('through-ball')))w*=1.9;
   if(['cross','nearpost','farpost'].includes(v.family)&&(scorer.has('power-header')||scorer.has('aerial')))w*=2.1;
   if(['cross','nearpost','farpost','volley'].includes(v.family)&&hasCreator&&(creator.has('long-ball-pass')||creator.has('pinged-pass')))w*=1.5;
   if(v.family==='distance'&&mid)w*=2.2;
   if(v.family==='halfspace'&&mid)w*=1.65;
   if(['inside','curler'].includes(v.family)&&wide)w*=2;
   if(v.family==='duel'&&/^(ST|CF)$/.test(striker))w*=1.8;
   if(centreBack)w*=(v.finish==='header'?3:(['dribble','inside'].includes(v.family)?.13:.6));
   if(event.creationType==='solo'&&['wing','cross','cutback','nearpost','farpost','volley','combination','switch'].includes(v.family))w*=.08;
   if(v.family==='bicycle'&&(!hasCreator||centreBack))w*=.3;
   if(side&&v.id.endsWith('_'+(side==='left'?'right':'left'))&&['wing','cutback','cross','nearpost','farpost','volley','counter'].includes(v.family))w*=.25;
   for(let i=recent.length-1;i>=0;i--){const item=recent[i];if(item?.sequence===v.id)w*=i===recent.length-1?.07:.19;else if(item?.family===v.family)w*=.56}
   return [v,Math.max(.0001,w)];
  });
  const key=[event.matchId||'',event.id||'',event.minute||'',event.playerId||'',event.playerName||'',event.team||'',event.type||'',event.creationType||'',Array.from(scorer).join(','),Array.from(creator).join(','),recent.map(x=>x.sequence).join(',')].join('|');
  let pick=visualHash(key)/4294967296*choices.reduce((n,x)=>n+x[1],0);
  const chosen=choices.find(x=>(pick-=x[1])<0)?.[0]||choices[0][0];
  // Finishing module is independent from the attack build-up and never touches match outcomes.
  const finish=chosen.finish==='normal'&&scorer.has('finesse-shot')&&visualHash(key+':finish')%7===0?'finesse':
   chosen.finish==='normal'&&scorer.has('low-driven-shot')&&visualHash(key+':low')%8===0?'low_driven':chosen.finish;
  return Object.freeze({sequence:chosen.id,family:chosen.family,finish});
 }
 class Queue{
  constructor({play,onBusy=()=>{},onIdle=()=>{},onFallback=()=>{},timeout=18000}={}){
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
 const api={TYPES,MODES,VISUAL_SCENES,choosePresentation,Queue,accepts,snapshot,setMode,getMatchPeriod,getAttackDirection,getMode:()=>mode};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FooteraHighlights=api;
})(globalThis);
