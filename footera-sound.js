/* Footera Stadion-Sound (V21.406).
 * Ball sounds use Web Audio; fans use real CC0 recordings (V21.406). The
 * pack walkout plays short real recordings (CC0, assets/sounds/walkout/). Presentation only: nothing here reads or
 * writes the match, the save or any online data.
 *
 * window.FooteraSound
 *  enabled()/setEnabled(on)   setting, stored in localStorage footera-sound-v1 ('on'|'off')
 *  context()                  live AudioContext or null (created on the first tap)
 *  crowd(opts)                stadium bed: {level(v,ramp), muffle(on), stop(fade)}
 *  kick(strength) net() post() whistle(pattern) roar(size) groan(size)
 *  applause(seconds,level) chant(seconds,level)
 *  pack(step,opts)            pack opening: 'tunnel' | 'clue' | 'flash' | 'board' | 'plain' | 'card'
 *  preload()                  fetch + decode the walkout recordings (called when a pack screen opens)
 *  preloadStadium()           fetch + decode only the match crowd recordings
 * Every one-shot also accepts an absolute start time ('at') so the same voices
 * can be rendered into an OfflineAudioContext (QA videos).
 */
(function(root){
 'use strict';
 const KEY='footera-sound-v1';
 let enabled=true;
 try{if(root.localStorage?.getItem(KEY)==='off')enabled=false}catch(_){}
 let ctx=null,out=null,idleTimer=0,active=0;
 const buffers=new WeakMap();
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const listeners=new Set();

 // ---------------------------------------------------------------- context
 function build(target){
  // Gentle bus: compressor keeps a goal roar on a phone speaker from clipping.
  const comp=target.createDynamicsCompressor();
  comp.threshold.value=-16;comp.knee.value=12;comp.ratio.value=4;comp.attack.value=.006;comp.release.value=.28;
  const gain=target.createGain();gain.gain.value=1;gain.connect(comp);comp.connect(target.destination);
  return gain;
 }
 function context(){
  if(!enabled)return null;
  if(ctx)return ctx;
  const AC=root.AudioContext||root.webkitAudioContext;if(!AC)return null;
  try{
   // Safari 16.4+: 'ambient' mixes with the player's own music and follows
   // the silent switch, like the sound of a casual game should.
   try{if(root.navigator?.audioSession)root.navigator.audioSession.type='ambient'}catch(_){}
   ctx=new AC({latencyHint:'interactive'});out=build(ctx);
  }catch(_){ctx=null;out=null}
  return ctx;
 }
 // Browsers only start audio after a tap. Every tap wakes the context; when
 // nothing has played for a while it is suspended again to save battery.
 function wake(){
  const c=context();if(!c)return null;
  if(c.state!=='running'){try{c.resume().catch(()=>{})}catch(_){}}
  clearTimeout(idleTimer);
  return c;
 }
 function scheduleIdle(){
  clearTimeout(idleTimer);
  if(!ctx||active>0)return;
  idleTimer=setTimeout(()=>{if(ctx&&active===0&&ctx.state==='running'){try{ctx.suspend().catch(()=>{})}catch(_){}}},5000);
 }
 function hold(seconds){active++;setTimeout(()=>{active=Math.max(0,active-1);scheduleIdle()},Math.max(0,seconds)*1000+300)}
 if(root.document){
  const unlock=()=>{if(!enabled)return;const c=wake();
   // Older iOS needs a sound started inside the tap itself.
   if(c&&!c.__footeraUnlocked){c.__footeraUnlocked=true;try{const s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(c.destination);s.start(0)}catch(_){}}
   scheduleIdle()};
  for(const type of['pointerdown','touchend','keydown'])root.document.addEventListener(type,unlock,{capture:true,passive:true});
  root.document.addEventListener('visibilitychange',()=>{if(root.document.hidden&&ctx){try{ctx.suspend().catch(()=>{})}catch(_){}}});
 }

 // ---------------------------------------------------------------- buffers
 // Seeded noise so every phone hears the same crowd (and QA renders repeat).
 function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}
 function cached(c,name,make){let map=buffers.get(c);if(!map){map=new Map();buffers.set(c,map)}if(!map.has(name))map.set(name,make());return map.get(name)}
 function whiteBuffer(c){return cached(c,'white',()=>{const n=Math.round(c.sampleRate*2),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0),r=rng(7);for(let i=0;i<n;i++)d[i]=r()*2-1;return b})}
 function pinkBuffer(c){return cached(c,'pink',()=>{
  const n=Math.round(c.sampleRate*4),b=c.createBuffer(2,n,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch),r=rng(11+ch*31);let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
   for(let i=0;i<n;i++){const w=r()*2-1;b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926}
   // Seamless loop: cross-fade the last 50 ms into the start.
   const f=Math.round(c.sampleRate*.05);for(let i=0;i<f;i++){const k=i/f;d[n-f+i]=d[n-f+i]*(1-k)+d[i]*k}}
  return b})}

 // ---------------------------------------------------------------- helpers
 function now(c){return c.currentTime+.012}
 function env(g,at,attack,peak,hold,release){
  g.gain.cancelScheduledValues(at);g.gain.setValueAtTime(.0001,at);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),at+attack);
  g.gain.setValueAtTime(Math.max(.0002,peak),at+attack+hold);
  g.gain.exponentialRampToValueAtTime(.0001,at+attack+hold+release);
  return at+attack+hold+release;
 }
 function noise(c,{at,dur,type='white',loop=false,offset=0}){
  const s=c.createBufferSource();s.buffer=type==='pink'?pinkBuffer(c):whiteBuffer(c);s.loop=loop;
  s.start(at,offset%s.buffer.duration);if(dur)s.stop(at+dur+.05);return s;
 }
 function filter(c,type,freq,q=.707){const f=c.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;return f}
 function chain(...nodes){for(let i=0;i<nodes.length-1;i++)nodes[i].connect(nodes[i+1]);return nodes[nodes.length-1]}
 function pan(c,value){if(!c.createStereoPanner)return c.createGain();const p=c.createStereoPanner();p.pan.value=clamp(value,-1,1);return p}
 function ready(at,dest){
  if(dest)return{c:dest.context,at:at??now(dest.context),dest};
  const c=wake();if(!c)return null;
  // Without a tap yet (or with iOS audio interrupted) sounds would queue up in
  // the stopped context and all play at once later. Drop them instead.
  if(c.state!=='running'&&(c.state==='interrupted'||root.navigator?.userActivation?.hasBeenActive===false))return null;
  return{c,at:at??now(c),dest:out};
 }

 // ---------------------------------------------------------------- one-shots
 function kick(strength=.5,at,dest,side=0){
  const x=ready(at,dest);if(!x)return;const{c,dest:d}=x;at=x.at;strength=clamp(strength,.05,1);
  const p=pan(c,side*.5);p.connect(d);
  // Leather thump: falling sine plus a very short click.
  const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(150+strength*60,at);o.frequency.exponentialRampToValueAtTime(52,at+.09);
  env(g,at,.003,.46*strength+.06,.0,.13);o.connect(g);g.connect(p);o.start(at);o.stop(at+.2);
  const n=noise(c,{at,dur:.025,offset:strength*1.3}),bp=filter(c,'bandpass',1300+strength*600,1.4),ng=c.createGain();env(ng,at,.001,.16*strength+.03,0,.018);chain(n,bp,ng,p);
  hold(.3);
 }
 function net(at,dest){
  const x=ready(at,dest);if(!x)return;const{c,dest:d}=x;at=x.at;
  // Ball into the net: a deep thud and the net bulging (short, low "whump").
  const o=c.createOscillator(),og=c.createGain();o.frequency.setValueAtTime(110,at);o.frequency.exponentialRampToValueAtTime(45,at+.2);env(og,at,.004,.42,0,.28);o.connect(og);og.connect(d);o.start(at);o.stop(at+.35);
  const n=noise(c,{at,dur:.3,offset:.4}),lp=filter(c,'lowpass',650,.9),g=c.createGain();env(g,at,.008,.22,.02,.2);chain(n,lp,g,d);
  hold(.6);
 }
 function post(at,dest){
  const x=ready(at,dest);if(!x)return;const{c,dest:d}=x;at=x.at;
  // Aluminium post: inharmonic partials ringing out.
  for(const[f,a,t]of[[512,.16,.9],[1381,.09,.7],[2593,.04,.45]]){const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;env(g,at,.002,a,0,t);o.connect(g);g.connect(d);o.start(at);o.stop(at+t+.05)}
  kick(.8,at,dest);hold(1);
 }
 const WHISTLES={short:[[0,.28]],long:[[0,.95]],double:[[0,.24],[.36,.24]],final:[[0,.34],[.52,.34],[1.04,1.15]],kickoff:[[0,.7]]};
 function whistle(pattern='short',at,dest){
  const x=ready(at,dest);if(!x)return 0;const{c,dest:d}=x;at=x.at;
  const parts=WHISTLES[pattern]||WHISTLES.short;let end=at;
  for(const[offset,len]of parts){
   const t=at+offset,o=c.createOscillator(),g=c.createGain(),trill=c.createOscillator(),tg=c.createGain(),am=c.createGain();
   // Pea whistle: a clean tone with the pea's warble on pitch and volume.
   o.type='sine';o.frequency.setValueAtTime(2850,t);o.frequency.linearRampToValueAtTime(3050,t+.05);o.frequency.setValueAtTime(3050,t+len-.05);o.frequency.linearRampToValueAtTime(2900,t+len);
   trill.frequency.value=34;tg.gain.value=70;trill.connect(tg);tg.connect(o.frequency);
   const trillAm=c.createGain();trillAm.gain.value=.22;trill.connect(trillAm);am.gain.value=.78;trillAm.connect(am.gain);
   env(g,t,.012,.12,Math.max(0,len-.06),.05);chain(o,am,g,d);
   o.start(t);trill.start(t);o.stop(t+len+.1);trill.stop(t+len+.1);end=t+len;
  }
  hold(end-at+.2);return end-at;
 }
 // Real crowd recordings only. Never fall back to synthetic vowel voices.
 // One-shots are dropped when not decoded yet, so a late download cannot
 // cheer an old goal. The bed can fade in late, unless its scene was disposed.
 const STADIUM_V='21406';
 const STADIUM_FILES={bed:'stadium/bed',groan:'stadium/groan',applause:'stadium/applause',cheer:'walkout/cheer'};
 const stadiumSets=new WeakMap();
 function preloadStadium(target){
  const c=target||context();if(!c||typeof root.fetch!=='function')return Promise.resolve(false);
  let set=stadiumSets.get(c);if(!set){set={buffers:new Map(),pending:new Map()};stadiumSets.set(c,set)}
  const tasks=Object.entries(STADIUM_FILES).map(([name,path])=>{
   if(set.buffers.has(name))return Promise.resolve();
   if(!set.pending.has(name))set.pending.set(name,root.fetch('assets/sounds/'+path+'.mp3?v='+STADIUM_V)
    .then(r=>r.ok?r.arrayBuffer():Promise.reject(new Error(String(r.status))))
    .then(data=>decode(c,data)).then(buf=>{set.buffers.set(name,buf)})
    .catch(()=>{}).finally(()=>set.pending.delete(name)));
   return set.pending.get(name);
  });
  return Promise.all(tasks).then(()=>set.buffers.size===Object.keys(STADIUM_FILES).length);
 }
 let reactionVariant=0;
 function reaction(name,{gain=.5,seconds=4,offset=0,side=0,at,dest}={}){
  const x=ready(at,dest);if(!x)return null;const{c,dest:d}=x;at=x.at;
  const buf=stadiumSets.get(c)?.buffers.get(name);if(!buf){preloadStadium(c);return null}
  offset=clamp(offset,0,Math.max(0,buf.duration-.2));
  const dur=Math.min(seconds,buf.duration-offset),s=c.createBufferSource(),g=c.createGain(),p=pan(c,side),lp=filter(c,'lowpass',6500);
  s.buffer=buf;chain(s,lp,g,p,d);const release=Math.min(1,dur*.35);
  env(g,at,.035,gain,Math.max(0,dur-release-.035),release);
  s.start(at,offset);s.stop(at+dur+.02);hold(dur);
  let stopped=false;
  return{stop(fade=.18){if(stopped)return;stopped=true;const t=now(c);g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(.0001,t,Math.max(.01,fade/3));try{s.stop(t+fade+.05)}catch(_){}}};
 }
 function roar(size=1,at,dest){
  size=clamp(size,.2,1.2);
  // Original pitch, with different entry points rather than robot detuning.
  return reaction('cheer',{gain:.72*size,seconds:5.8,offset:(reactionVariant++%3)*.35,side:size<.6?.38:-.12,at,dest});
 }
 function groan(size=1,at,dest){return reaction('groan',{gain:.55*clamp(size,.2,1.2),seconds:2.75,side:size<.6?.3:-.1,at,dest})}
 function applause(seconds=3,level=.5,at,dest){return reaction('applause',{gain:.5*clamp(level,0,1),seconds:clamp(seconds,.3,7),at,dest})}
 // Kept for API compatibility: no fabricated spoken/sung club name.
 function chant(){return null}

 // ---------------------------------------------------------------- crowd bed
 function crowd({level=.32,at,dest}={}){
  const x=ready(at,dest);if(!x)return null;const{c,dest:d}=x;at=x.at;
  const lp=filter(c,'lowpass',5800,.5),master=c.createGain();master.gain.value=.0001;lp.connect(master);master.connect(d);
  let source=null,stopped=false,volume=clamp(level,0,1.2),lastLevel=-Infinity,lastValue=-1;
  active++;
  function start(){
   if(stopped||source)return;
   const buf=stadiumSets.get(c)?.buffers.get('bed');if(!buf)return;
   // Crossfade the loop join once per context, preserving the recording's
   // stereo field. Independent offsets avoid restarting the same shout.
   const loop=cached(c,'stadium-loop',()=>{
    const overlap=Math.min(Math.round(buf.sampleRate*.65),Math.floor(buf.length/4)),length=buf.length-overlap;
    const b=c.createBuffer(buf.numberOfChannels,length,buf.sampleRate);
    for(let ch=0;ch<buf.numberOfChannels;ch++){
     const src=buf.getChannelData(ch),dst=b.getChannelData(ch);dst.set(src.subarray(overlap));
     for(let i=0;i<overlap;i++){const k=i/overlap;dst[length-overlap+i]=src[length+i]*(1-k)+src[i]*k}
    }
    return b;
   });
   source=c.createBufferSource();source.buffer=loop;source.loop=true;source.connect(lp);
   const t=Math.max(at,now(c));source.start(t,Math.random()*loop.duration);
   master.gain.setValueAtTime(.0001,t);master.gain.setTargetAtTime(volume*.32,t,.25);
  }
  start();if(!source)preloadStadium(c).then(start).catch(()=>{});
  return{
   level(v,ramp=.35,when){if(stopped)return;volume=clamp(v,0,1.2);const t=when??now(c);
    // No per-frame automation buildup on phones.
    if(t-lastLevel<.12&&Math.abs(volume-lastValue)<.035)return;
    lastLevel=t;lastValue=volume;master.gain.setTargetAtTime(Math.max(.0001,volume*.32),t,Math.max(.03,ramp))},
   muffle(on,when){if(!stopped)lp.frequency.setTargetAtTime(on?1900:5800,when??now(c),.18)},
   stop(fade=.4,when){if(stopped)return;stopped=true;const t=when??now(c);
    master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(.0001,t,Math.max(.01,fade/3));
    try{source?.stop(t+fade+.1)}catch(_){}
    setTimeout(()=>{active=Math.max(0,active-1);master.disconnect();lp.disconnect();scheduleIdle()},(fade+.2)*1000)}
  };
 }

 // ---------------------------------------------------------------- packs
 // V21.374 (Basti: synthesised walkout "sehr billig"): the walkout plays real
 // recordings instead: a football stadium in the dark, a crowd that swells
 // up to the card, a deep hit per clue and a boom, cheer and firework on the
 // card. All CC0, sources in assets/sounds/walkout/CREDITS.md. The files are
 // only fetched when a pack is opened; anything not loaded yet stays silent.
 const SAMPLE_BASE='assets/sounds/walkout/',SAMPLE_V='21374';
 const SAMPLE_NAMES=['stadium','swell','riser','hit','thud','boom','cheer','fireworks','sparkle'];
 const sampleSets=new WeakMap();
 function decode(c,data){return new Promise((resolve,reject)=>{try{const p=c.decodeAudioData(data,resolve,reject);if(p&&typeof p.then==='function')p.then(resolve,reject)}catch(e){reject(e)}})}
 function preload(target){
  const c=target||context();if(!c||typeof root.fetch!=='function')return Promise.resolve(false);
  let set=sampleSets.get(c);
  if(!set){set={buffers:new Map()};sampleSets.set(c,set);
   set.ready=Promise.all(SAMPLE_NAMES.map(name=>root.fetch(SAMPLE_BASE+name+'.mp3?v='+SAMPLE_V)
    .then(r=>r.ok?r.arrayBuffer():Promise.reject(new Error(String(r.status))))
    .then(data=>decode(c,data)).then(buf=>{set.buffers.set(name,buf)}).catch(()=>{})))
    .then(()=>set.buffers.size===SAMPLE_NAMES.length)}
  return set.ready;
 }
 function play(c,d,name,at,{gain=1,rate=1}={}){
  const buf=sampleSets.get(c)?.buffers.get(name);if(!buf)return null;
  const s=c.createBufferSource(),g=c.createGain();s.buffer=buf;s.playbackRate.value=rate;g.gain.value=gain;
  s.connect(g);g.connect(d);s.start(Math.max(at,c.currentTime));return s;
 }
 let clueCount=0;
 // step: 'tunnel' | 'clue' | 'board' | 'flash' | 'card' | 'plain'.
 // opts.flashIn: seconds from the tunnel start to the card flash, so the
 // crowd swell and the riser peak exactly on the card.
 function pack(step,at,dest,opts){
  if(at&&typeof at==='object'&&!dest&&!opts){opts=at;at=undefined}
  const x=ready(at,dest);if(!x)return null;const{c}=x;const d=x.dest;at=x.at;
  preload(c);
  if(step==='tunnel'){
   clueCount=0;
   const flashIn=clamp(Number(opts?.flashIn)||4.25,1.5,12);
   const bed=c.createGain(),build=c.createGain();bed.connect(d);build.connect(d);
   // Stadium in the dark: a soft murmur, slightly darkened.
   const lp=filter(c,'lowpass',2600);lp.connect(bed);
   play(c,lp,'stadium',at,{gain:.24});
   play(c,build,'riser',at+flashIn-3.98,{gain:.2});
   const swellLp=filter(c,'lowpass',6500);swellLp.connect(build);
   play(c,swellLp,'swell',at+flashIn-2.25,{gain:.42});
   hold(flashIn+1.5);
   return{stop(when){try{const t=when??now(c),early=t<at+flashIn-.35;
    bed.gain.cancelScheduledValues(t);bed.gain.setTargetAtTime(.0001,t,early?.06:.45);
    if(early){build.gain.cancelScheduledValues(t);build.gain.setTargetAtTime(.0001,t,.05)}}catch(_){}}};
  }
  if(step==='clue'||step==='board'){
   // Nation, position, club: a deep hit that climbs a little each time.
   const k=clueCount++%3;
   if(step==='board')play(c,d,'thud',at,{gain:.75,rate:1+k*.06});
   else play(c,d,'hit',at,{gain:.5,rate:1+k*.06});
   hold(2.3);return null;
  }
  if(step==='flash'){
   // The card: boom, the stadium erupts, a firework goes up, sparkle on the card.
   clueCount=0;
   play(c,d,'boom',at,{gain:.9});
   play(c,d,'hit',at,{gain:.42,rate:.9});
   // Crowd recordings are gently darkened: no bright rustle on a phone speaker.
   const soft=filter(c,'lowpass',6500);soft.connect(d);
   play(c,soft,'cheer',at+.04,{gain:.72});
   play(c,d,'fireworks',at-.99+.6,{gain:.4});
   play(c,d,'sparkle',at+.38,{gain:.45});
   hold(8);return null;
  }
  if(step==='card'){
   // Second card of a double walkout.
   play(c,d,'thud',at,{gain:.6});play(c,d,'sparkle',at+.02,{gain:.5});
   hold(2.2);return null;
  }
  // plain pack: a short sparkle with a soft thud.
  play(c,d,'thud',at,{gain:.4});play(c,d,'sparkle',at,{gain:.42});hold(2);return null;
 }

 function setEnabled(on){
  enabled=!!on;try{root.localStorage?.setItem(KEY,enabled?'on':'off')}catch(_){}
  if(!enabled&&ctx){try{ctx.suspend().catch(()=>{})}catch(_){}}
  if(enabled)wake();
  for(const fn of listeners){try{fn(enabled)}catch(_){}}
  return enabled;
 }
 function onChange(fn){listeners.add(fn);return()=>listeners.delete(fn)}
 // Build the master bus for an OfflineAudioContext (QA renders only).
 function offlineBus(offline){return build(offline)}
 // Extras: <select data-sound-mode> with An/Aus, kept in step with the 🔊 button.
 if(root.document){
  const wire=()=>{const selects=[...root.document.querySelectorAll('[data-sound-mode]')];
   const paint=()=>selects.forEach(s=>{s.value=enabled?'on':'off'});paint();
   selects.forEach(s=>s.addEventListener('change',()=>{setEnabled(s.value!=='off');if(enabled)kick(.7)}));
   onChange(paint)};
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
 }
 root.FooteraSound=Object.freeze({enabled:()=>enabled,setEnabled,onChange,context:()=>enabled?ctx:null,wake,crowd,kick,net,post,whistle,roar,groan,applause,chant,pack,preload,preloadStadium,offlineBus,KEY});
})(typeof window!=='undefined'?window:globalThis);
