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
   playerId:String(event.playerId||''),playerName:String(event.playerName||'Spieler'),keeperName:String(event.keeperName||''),homeColor:String(event.homeColor||'#961e43'),awayColor:String(event.awayColor||'#e9ecf3'),
   homeShorts:String(event.homeShorts||'#f3f4ee'),awayShorts:String(event.awayShorts||'#172b49'),homeSocks:String(event.homeSocks||event.homeColor||'#961e43'),awaySocks:String(event.awaySocks||event.awayColor||'#e9ecf3')});
 }
 function loadRenderer(){return loader||(loader=import('./3d-highlights-scene.mjs?v=2098'))}
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
 const api={TYPES,MODES,Queue,accepts,snapshot,setMode,getMatchPeriod,getAttackDirection,getMode:()=>mode};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FooteraHighlights=api;
})(globalThis);
