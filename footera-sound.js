/* Footera Stadion-Sound (V21.371).
 * Every sound is synthesised live with the Web Audio API: no audio files, no
 * download, no licence questions. Presentation only: nothing here reads or
 * writes the match, the save or any online data.
 *
 * window.FooteraSound
 *  enabled()/setEnabled(on)   setting, stored in localStorage footera-sound-v1 ('on'|'off')
 *  context()                  live AudioContext or null (created on the first tap)
 *  crowd(opts)                stadium bed: {level(v,ramp), muffle(on), stop(fade)}
 *  kick(strength) net() post() whistle(pattern) roar(size) groan(size)
 *  applause(seconds,level) chant(seconds,level)
 *  pack(step)                 pack opening: 'tunnel' | 'clue' | 'flash' | 'board' | 'plain' | 'card'
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
 // Applause: thousands of single hand claps (short filtered bursts) at random
 // times. Built once per context, about 40 ms of work on a phone.
 function applauseBuffer(c){return cached(c,'applause',()=>{
  const sr=c.sampleRate,n=Math.round(sr*3),b=c.createBuffer(2,n,sr),r=rng(2026);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch),claps=2600;
   for(let k=0;k<claps;k++){const start=Math.floor(r()*n),len=Math.floor(sr*(.006+r()*.012)),amp=.25+r()*.75,tone=.35+r()*.5;let lp=0;
    for(let i=0;i<len;i++){const w=r()*2-1;lp+=(w-lp)*tone;const env=Math.exp(-i/(len*.28));d[(start+i)%n]+=(w-lp*.7)*env*amp*.16}}}
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
  const s=c.createBufferSource();s.buffer=type==='pink'?pinkBuffer(c):type==='applause'?applauseBuffer(c):whiteBuffer(c);s.loop=loop;
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

 // A crowd of voices: detuned saw "singers" through vowel formants plus
 // breathy noise. Vowel 'o' is the "Ohhh", 'a' the cheer, 'e' a chant.
 const VOWELS={a:[[800,1],[1150,.5],[2900,.18]],o:[[450,1],[800,.45],[2830,.12]],u:[[330,1],[700,.3],[2500,.08]],e:[[420,1],[1950,.35],[2700,.16]]};
 function voices(c,dest,{at,dur,vowel='a',level=.3,count=16,low=110,high=300,glide=1,attack=.18,release=.9,seed=1,breath=.5}){
  const r=rng(seed),bus=c.createGain(),formants=VOWELS[vowel]||VOWELS.a,mix=c.createGain();mix.gain.value=1;
  for(const[freq,gain]of formants){const f=filter(c,'bandpass',freq,freq<1000?5:8),g=c.createGain();g.gain.value=gain*2.2;bus.connect(f);f.connect(g);g.connect(mix)}
  const lfo=c.createOscillator(),lfoGain=c.createGain();lfo.frequency.value=5.2;lfoGain.gain.value=4;lfo.connect(lfoGain);lfo.start(at);lfo.stop(at+dur+release+.1);
  for(let i=0;i<count;i++){
   const o=c.createOscillator(),g=c.createGain(),f0=low*Math.pow(high/low,r());
   o.type='sawtooth';o.frequency.setValueAtTime(f0,at);o.frequency.exponentialRampToValueAtTime(f0*glide,at+attack+dur*.8);
   o.detune.value=(r()-.5)*40;lfoGain.connect(o.detune);
   // Singers come in a little after one another, like a real crowd.
   const start=at+r()*attack*.8;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(1/count,start+attack);
   g.gain.setValueAtTime(1/count,at+attack+dur*(.6+.4*r()));g.gain.linearRampToValueAtTime(0,at+attack+dur+release*(.6+.4*r()));
   o.connect(g);g.connect(bus);o.start(at);o.stop(at+attack+dur+release+.1);
  }
  if(breath>0){const n=noise(c,{at,dur:dur+attack+release+.1,type:'pink',offset:r()*3}),g=c.createGain();g.gain.value=breath;n.connect(g);g.connect(bus)}
  const outGain=c.createGain();env(outGain,at,attack,level,Math.max(0,dur-attack),release);
  chain(mix,outGain,dest);return at+attack+dur+release;
 }

 // ---------------------------------------------------------------- one-shots
 function kick(strength=.5,at,dest,side=0){
  const x=ready(at,dest);if(!x)return;const{c,dest:d}=x;at=x.at;strength=clamp(strength,.05,1);
  const p=pan(c,side*.5);p.connect(d);
  // Leather thump: falling sine plus a short dry click.
  const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(140+strength*60,at);o.frequency.exponentialRampToValueAtTime(48,at+.09);
  env(g,at,.003,.42*strength+.05,.0,.13);o.connect(g);g.connect(p);o.start(at);o.stop(at+.2);
  const n=noise(c,{at,dur:.05,offset:strength*1.3}),bp=filter(c,'bandpass',1500+strength*900,1.1),ng=c.createGain();env(ng,at,.001,.30*strength+.04,0,.035);chain(n,bp,ng,p);
  hold(.3);
 }
 function net(at,dest){
  const x=ready(at,dest);if(!x)return;const{c,dest:d}=x;at=x.at;
  // Ball into the net: a soft thud and the rope rustle shaking out.
  const n=noise(c,{at,dur:.75,offset:.4}),bp=filter(c,'bandpass',2600,.8),hp=filter(c,'highpass',900),g=c.createGain();
  const am=c.createOscillator(),amg=c.createGain();am.frequency.value=23;amg.gain.value=.4;am.connect(amg);
  const shake=c.createGain();shake.gain.value=.6;amg.connect(shake.gain);am.start(at);am.stop(at+.8);
  env(g,at,.01,.34,.05,.6);chain(n,bp,hp,shake,g,d);
  const o=c.createOscillator(),og=c.createGain();o.frequency.setValueAtTime(95,at);o.frequency.exponentialRampToValueAtTime(42,at+.18);env(og,at,.004,.3,0,.22);o.connect(og);og.connect(d);o.start(at);o.stop(at+.3);
  hold(.9);
 }
 function post(at,dest){
  const x=ready(at,dest);if(!x)return;const{c,dest:d}=x;at=x.at;
  // Aluminium post: inharmonic partials ringing out.
  for(const[f,a,t]of[[512,.16,.9],[1381,.1,.7],[2593,.06,.5],[3910,.035,.35]]){const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;env(g,at,.002,a,0,t);o.connect(g);g.connect(d);o.start(at);o.stop(at+t+.05)}
  kick(.8,at,dest);hold(1);
 }
 const WHISTLES={short:[[0,.28]],long:[[0,.95]],double:[[0,.24],[.36,.24]],final:[[0,.34],[.52,.34],[1.04,1.15]],kickoff:[[0,.7]]};
 function whistle(pattern='short',at,dest){
  const x=ready(at,dest);if(!x)return 0;const{c,dest:d}=x;at=x.at;
  const parts=WHISTLES[pattern]||WHISTLES.short;let end=at;
  for(const[offset,len]of parts){
   const t=at+offset,o=c.createOscillator(),g=c.createGain(),trill=c.createOscillator(),tg=c.createGain(),am=c.createGain();
   // Pea whistle: a high tone with the pea's fast warble on pitch and volume.
   o.type='sine';o.frequency.setValueAtTime(2850,t);o.frequency.linearRampToValueAtTime(3050,t+.05);o.frequency.setValueAtTime(3050,t+len-.05);o.frequency.linearRampToValueAtTime(2900,t+len);
   trill.frequency.value=34;tg.gain.value=70;trill.connect(tg);tg.connect(o.frequency);
   const trillAm=c.createGain();trillAm.gain.value=.22;trill.connect(trillAm);am.gain.value=.78;trillAm.connect(am.gain);
   env(g,t,.012,.13,Math.max(0,len-.06),.05);chain(o,am,g,d);
   const n=noise(c,{at:t,dur:len+.05,offset:offset}),bp=filter(c,'bandpass',3000,6),ng=c.createGain();env(ng,t,.01,.05,Math.max(0,len-.05),.05);chain(n,bp,ng,d);
   o.start(t);trill.start(t);o.stop(t+len+.1);trill.stop(t+len+.1);end=t+len;
  }
  hold(end-at+.2);return end-at;
 }
 function roar(size=1,at,dest){
  const x=ready(at,dest);if(!x)return;const{c,dest:d}=x;at=x.at;size=clamp(size,.2,1.2);
  // Goal: the whole stand at once. Wide noise wall plus a cheering "Jaaa".
  const n=noise(c,{at,dur:4.6,type:'pink',offset:1.1,loop:true}),bp=filter(c,'bandpass',900,.45),lp=filter(c,'lowpass',4200),g=c.createGain();
  g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.95*size,at+.22);g.gain.setTargetAtTime(.62*size,at+.6,.8);g.gain.setTargetAtTime(.0001,at+3.2,.55);
  chain(n,bp,lp,g,d);
  voices(c,d,{at:at+.04,dur:2.4,vowel:'a',level:.34*size,count:20,low:150,high:420,glide:1.12,attack:.16,release:1.3,seed:5,breath:.35});
  applause(4.4,.55*size,at+.5,dest);
  hold(4.8);
 }
 function groan(size=1,at,dest){
  const x=ready(at,dest);if(!x)return;const{c,dest:d}=x;at=x.at;size=clamp(size,.2,1.2);
  // Missed chance: "Ohhh" rising with the shot and sinking with the miss.
  voices(c,d,{at,dur:1.25,vowel:'o',level:.36*size,count:18,low:120,high:330,glide:.8,attack:.12,release:1.1,seed:9,breath:.55});
  const n=noise(c,{at,dur:2.3,type:'pink',offset:2.2}),bp=filter(c,'bandpass',520,.8),g=c.createGain();env(g,at,.15,.32*size,.6,1.2);chain(n,bp,g,d);
  hold(2.6);
 }
 function applause(seconds=3,level=.5,at,dest){
  const x=ready(at,dest);if(!x)return;const{c,dest:d}=x;at=x.at;
  const n=noise(c,{at,dur:seconds+.8,type:'applause',loop:true,offset:at*.37}),hp=filter(c,'highpass',420),g=c.createGain();
  env(g,at,.35,clamp(level,0,1),Math.max(0,seconds-1),1.1);chain(n,hp,g,d);hold(seconds+1);
 }
 function chant(seconds=4,level=.25,at,dest){
  const x=ready(at,dest);if(!x)return;const{c,dest:d}=x;at=x.at;
  // "FOO-TE-RA": three sung syllables, repeated, with a clap on each beat.
  const beat=.42;let t=at;
  while(t<at+seconds-beat*4){
   voices(c,d,{at:t,dur:beat*.9,vowel:'u',level,count:14,low:140,high:260,glide:1,attack:.06,release:.18,seed:21,breath:.3});
   voices(c,d,{at:t+beat,dur:beat*.8,vowel:'e',level:level*.9,count:14,low:150,high:280,glide:1,attack:.05,release:.18,seed:22,breath:.3});
   voices(c,d,{at:t+beat*2,dur:beat*1.5,vowel:'a',level:level*1.05,count:14,low:155,high:290,glide:.97,attack:.05,release:.3,seed:23,breath:.3});
   for(let k=0;k<3;k++){const n=noise(c,{at:t+k*beat,dur:.12,type:'applause',offset:k*.5+t}),g=c.createGain();env(g,t+k*beat,.005,level*1.6,.02,.09);chain(n,g,d)}
   t+=beat*4;
  }
  hold(seconds+.5);
 }

 // ---------------------------------------------------------------- crowd bed
 // The stadium is never silent: a murmuring bed whose level follows the
 // danger of the move. muffle() is used for the slow-motion replay.
 function crowd({level=.35,rain=0,at,dest}={}){
  const x=ready(at,dest);if(!x)return null;const{c,dest:d}=x;at=x.at;
  const r=rng(77),lp=filter(c,'lowpass',5200),hpBed=filter(c,'highpass',110),master=c.createGain();master.gain.setValueAtTime(.0001,at);master.gain.exponentialRampToValueAtTime(Math.max(.0002,level),at+.6);
  lp.connect(hpBed);hpBed.connect(master);master.connect(d);
  const layers=[];
  // Murmur: three bands with slow random swells (people talking, singing).
  for(const[freq,q,gain]of[[300,.9,.9],[750,.7,.75],[1800,.8,.32]]){
   const n=noise(c,{at,type:'pink',loop:true,offset:r()*4}),bp=filter(c,'bandpass',freq,q),g=c.createGain();g.gain.value=gain;
   const lfo=c.createOscillator(),lg=c.createGain();lfo.frequency.value=.13+r()*.25;lg.gain.value=gain*.32;lfo.connect(lg);lg.connect(g.gain);lfo.start(at);
   chain(n,bp,g,lp);layers.push(n,lfo);
  }
  // Distant hand claps and the odd shout keep the bed alive.
  const claps=noise(c,{at,type:'applause',loop:true,offset:r()*3}),clapHp=filter(c,'highpass',900),clapGain=c.createGain();clapGain.gain.value=.12;chain(claps,clapHp,clapGain,lp);layers.push(claps);
  if(rain>0){const n=noise(c,{at,type:'white',loop:true,offset:.7}),hp=filter(c,'highpass',3800),g=c.createGain();g.gain.value=.11*clamp(rain,0,1);chain(n,hp,g,master);layers.push(n)}
  active++;let stopped=false;
  return{
   level(v,ramp=.35,when){if(stopped)return;const t=when??now(c);master.gain.setTargetAtTime(Math.max(.0002,clamp(v,0,1.2)),t,ramp)},
   muffle(on,when){if(stopped)return;const t=when??now(c);lp.frequency.setTargetAtTime(on?850:5200,t,.12)},
   stop(fade=.6,when){if(stopped)return;stopped=true;const t=when??now(c);master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(.0001,t,fade/3);
    for(const n of layers){try{n.stop(t+fade+.3)}catch(_){}}
    setTimeout(()=>{active=Math.max(0,active-1);scheduleIdle()},(fade+.5)*1000)}
  };
 }

 // ---------------------------------------------------------------- packs
 function pack(step,at,dest){
  const x=ready(at,dest);if(!x)return;const{c}=x;let d=x.dest;at=x.at;
  if(step==='tunnel'){
   // Walkout: the tunnel hum and a riser that peaks after ~4.3 s (the normal
   // tunnel length) and then holds until the flash calls stop(). A slow phone
   // or a skip never leaves a gap or a hum under the card.
   const own=c.createGain();own.connect(d);d=own;const RISE=4.3,END=9.5;
   const n=noise(c,{at,dur:END,type:'pink',loop:true,offset:.3}),bp=filter(c,'bandpass',260,1.4),g=c.createGain();
   bp.frequency.setValueAtTime(220,at);bp.frequency.exponentialRampToValueAtTime(2400,at+RISE);
   g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.24,at+RISE);g.gain.setValueAtTime(.24,at+END-.6);g.gain.exponentialRampToValueAtTime(.0001,at+END);chain(n,bp,g,d);
   for(const[f,detune]of[[55,0],[82.4,6],[110,-5]]){const o=c.createOscillator(),og=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(f,at);o.frequency.exponentialRampToValueAtTime(f*2,at+RISE);o.detune.value=detune;
    const lp=filter(c,'lowpass',400);lp.frequency.setValueAtTime(300,at);lp.frequency.exponentialRampToValueAtTime(2200,at+RISE);
    og.gain.setValueAtTime(.0001,at);og.gain.exponentialRampToValueAtTime(.05,at+RISE);og.gain.setValueAtTime(.05,at+END-.6);og.gain.exponentialRampToValueAtTime(.0001,at+END);chain(o,lp,og,d);o.start(at);o.stop(at+END+.05)}
   const n2=noise(c,{at:at+.4,dur:END,type:'applause',loop:true,offset:.8}),hp2=filter(c,'highpass',420),g2=c.createGain();env(g2,at+.4,.35,.22,END-1.6,.8);chain(n2,hp2,g2,own);
   hold(END);
   return{stop(when){try{const t=when??now(c);own.gain.cancelScheduledValues(t);own.gain.setTargetAtTime(.0001,t,.06)}catch(_){}}};
  }
  if(step==='clue'||step==='board'){
   // Heavy drum hit for each clue (nation, position, club).
   const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(step==='board'?120:92,at);o.frequency.exponentialRampToValueAtTime(42,at+.32);env(g,at,.004,.55,.02,.5);o.connect(g);g.connect(d);o.start(at);o.stop(at+.6);
   const n=noise(c,{at,dur:.3,offset:1.7}),lp=filter(c,'lowpass',1400),ng=c.createGain();env(ng,at,.002,.22,0,.2);chain(n,lp,ng,d);hold(.8);return;
  }
  if(step==='flash'){
   // The card: big boom, shimmering sparkle and the crowd going up.
   const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(70,at);o.frequency.exponentialRampToValueAtTime(30,at+1.1);env(g,at,.005,.75,.05,1.3);o.connect(g);g.connect(d);o.start(at);o.stop(at+1.5);
   const n=noise(c,{at,dur:1.2,offset:.9}),bp=filter(c,'bandpass',900,.5),ng=c.createGain();env(ng,at,.003,.42,0,.9);chain(n,bp,ng,d);
   const r=rng(3);for(let i=0;i<9;i++){const t=at+.04+i*.06+r()*.03,s=c.createOscillator(),sg=c.createGain();s.type='sine';s.frequency.value=[1568,2093,2637,3136,3520][i%5]*(1+r()*.01);env(sg,t,.003,.05,0,.7);s.connect(sg);sg.connect(d);s.start(t);s.stop(t+.8)}
   roar(.7,at+.08,dest);hold(5);return;
  }
  if(step==='card'){
   // Second card of a double walkout: a short sparkle and a cheer.
   const r=rng(4);for(let i=0;i<6;i++){const t=at+i*.05,s=c.createOscillator(),sg=c.createGain();s.frequency.value=[2093,2637,3136][i%3]*(1+r()*.01);env(sg,t,.003,.05,0,.5);s.connect(sg);sg.connect(d);s.start(t);s.stop(t+.6)}
   applause(1.8,.35,at,dest);return;
  }
  // plain pack: a quick foil whoosh.
  const n=noise(c,{at,dur:.5,offset:.2}),bp=filter(c,'bandpass',800,1),g=c.createGain();bp.frequency.setValueAtTime(600,at);bp.frequency.exponentialRampToValueAtTime(4200,at+.35);env(g,at,.06,.16,.05,.3);chain(n,bp,g,d);hold(.6);
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
   selects.forEach(s=>s.addEventListener('change',()=>{setEnabled(s.value!=='off');if(enabled)applause(1.2,.35)}));
   onChange(paint)};
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
 }
 root.FooteraSound=Object.freeze({enabled:()=>enabled,setEnabled,onChange,context:()=>enabled?ctx:null,wake,crowd,kick,net,post,whistle,roar,groan,applause,chant,pack,offlineBus,KEY});
})(typeof window!=='undefined'?window:globalThis);
