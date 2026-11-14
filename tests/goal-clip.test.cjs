'use strict';
// V21.424 Tor-Clips: goals of your own team are recorded as vertical videos (presentation only).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'footera-goal-clip.js'),'utf8');
function load(extra={}){const ctx={Math,Date,URL,console,...extra};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(src,ctx);return ctx.FooteraGoalClip}

test('caption and file name of a clip',()=>{
 const api=load();
 const c=api.caption({minute:67.4,name:'Florian Wirtz',assist:'Musiala',home:'FC Gerlies',away:'Bayern',homeScore:2,awayScore:1});
 assert.equal(c.kicker,'TOOOR!');assert.equal(c.name,'Florian Wirtz');
 assert.equal(c.line,'67. Minute · Vorlage Musiala');assert.equal(c.score,'FC Gerlies 2 : 1 Bayern');
 assert.equal(api.caption({minute:89,name:'X',late:true,home:'A',away:'B',homeScore:1,awayScore:0}).kicker,'SPÄTES TOR');
 assert.equal(api.fileName({name:'Vinícius Júnior',minute:12},'mp4'),'footera-tor-vinicius-junior-12min.mp4');
 assert.equal(api.fileName({name:'',minute:3},'webm'),'footera-tor-tor-3min.webm');
});

test('only goals of your own team in a normal match are recorded, never without recorder support',()=>{
 const noRecorder=load({document:{}});
 assert.equal(noRecorder.wants({type:'goal',team:'home'},{id:'matchLiveStage'}),false);
 class MR{static isTypeSupported(t){return t==='video/mp4'}}
 function Canvas(){}Canvas.prototype.captureStream=function(){};
 const api=load({document:{},MediaRecorder:MR,HTMLCanvasElement:Canvas,localStorage:{getItem:()=>null}});
 assert.equal(api.pickType(),'video/mp4');
 assert.equal(api.wants({type:'goal',team:'home'},{id:'matchLiveStage'}),true);
 assert.equal(api.wants({type:'goal',team:'away'},{id:'matchLiveStage'}),false,'opponent goals are not recorded');
 assert.equal(api.wants({type:'big_chance_saved',team:'home'},{id:'matchLiveStage'}),false);
 assert.equal(api.wants({type:'goal',team:'home',ceremony:'fulltime'},{id:'matchLiveStage'}),false);
 assert.equal(api.wants({type:'goal',team:'home'},{id:'onlineLiveStage'}),false,'online friendlies keep their own stage');
 const off=load({document:{},MediaRecorder:MR,HTMLCanvasElement:Canvas,localStorage:{getItem:k=>k==='footera-goal-clips'?'0':null}});
 assert.equal(off.wants({type:'goal',team:'home'},{id:'matchLiveStage'}),false,'opt-out switch');
 assert.equal(api.reportHTML(),'','no section without clips');
});

test('the clip never touches the save and is wired into scene, report, page and service worker',()=>{
 assert.doesNotMatch(src,/\bsave\(\)|state\.|localStorage\.setItem|supabase|fetch\(/i);
 const scene=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
 assert.match(scene,/FooteraGoalClip\?\.begin\?\.\(event,canvas,layer\)/);
 assert.match(scene,/goalClip\?\.end\(result\)/);
 assert.match(scene,/goalClip\.frame\(displayTime>=goalArrival,false\)/);
 assert.match(scene,/goalClip\.frame\(true,true\)/);
 const app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
 assert.match(app,/FooteraGoalClip\?\.reportHTML\?\.\(\)/);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 for(const f of[/footera-goal-clip\.js\?v=(\d+)/,/footera-goal-clip\.css\?v=(\d+)/,/footera-sound\.js\?v=(\d+)/]){
  const v=(html.match(f)||[])[1];assert.ok(v,'index.html loads '+f);assert.ok(sw.includes(html.match(f)[0]),'service worker caches '+html.match(f)[0]);
 }
 assert.ok(html.indexOf('footera-sound.js')<html.indexOf('footera-goal-clip.js'),'sound loads before the clip recorder');
 const sound=fs.readFileSync(path.join(root,'footera-sound.js'),'utf8');assert.match(sound,/recordTap/);
});
