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

 // A crowd of voices: detuned saw "singers" through vowel formants plus
 // breathy noise. Vowel 'o' is the "Ohhh", 'a' the cheer, 'e' a chant.
 // V21.372 (Basti: "es raschelt ganz arg"): no hiss anywhere. Crowd, cheers and
 // applause are sung voices and drums; every noise layer that is left (kick
 // click, net, rumble) is short or low-passed under ~1 kHz.
 const VOWELS={a:[[800,1],[1150,.45]],o:[[450,1],[800,.4]],u:[[330,1],[700,.28]],e:[[420,1],[1950,.18]]};
 function voices(c,dest,{at,dur,vowel='a',level=.3,count=16,low=110,high=300,glide=1,attack=.18,release=.9,seed=1,breath=0,vibrato=4}){
  const r=rng(seed),bus=c.createGain(),formants=VOWELS[vowel]||VOWELS.a,mix=c.createGain(),soft=filter(c,'lowpass',2000,.5);mix.gain.value=1;
  for(const[freq,gain]of formants){const f=filter(c,'bandpass',freq,freq<1000?4:6),g=c.createGain();g.gain.value=gain*2.2;bus.connect(f);f.connect(g);g.connect(mix)}
  // A little of the plain voice keeps it warm instead of nasal.
  const dry=c.createGain();dry.gain.value=.18;bus.connect(dry);dry.connect(mix);
  const lfo=c.createOscillator(),lfoGain=c.createGain();lfo.frequency.value=5.2;lfoGain.gain.value=vibrato;lfo.connect(lfoGain);lfo.start(at);lfo.stop(at+attack+dur+release+.1);
  for(let i=0;i<count;i++){
   const o=c.createOscillator(),g=c.createGain(),f0=low*Math.pow(high/low,r());
   o.type=i%3===0?'triangle':'sawtooth';o.frequency.setValueAtTime(f0,at);o.frequency.exponentialRampToValueAtTime(f0*glide,at+attack+dur*.8);
   o.detune.value=(r()-.5)*40;lfoGain.connect(o.detune);
   // Singers come in a little after one another, like a real crowd.
   const start=at+r()*attack*.8;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(1/count,start+attack);
   g.gain.setValueAtTime(1/count,at+attack+dur*(.6+.4*r()));g.gain.linearRampToValueAtTime(0,at+attack+dur+release*(.6+.4*r()));
   o.connect(g);g.connect(bus);o.start(at);o.stop(at+attack+dur+release+.1);
  }
  if(breath>0){const n=noise(c,{at,dur:dur+attack+release+.1,type:'pink',offset:r()*3}),lp=filter(c,'lowpass',700),g=c.createGain();g.gain.value=breath;chain(n,lp,g,bus)}
  const outGain=c.createGain();env(outGain,at,attack,level,Math.max(0,dur-attack),release);
  chain(mix,soft,outGain,dest);return at+attack+dur+release;
 }
 // Stadium bass drum: the fans' drum behind the goal (also the chant beat).
 function drum(c,d,at,level=.4,pitch=78){
  const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(pitch,at);o.frequency.exponentialRampToValueAtTime(pitch*.55,at+.25);env(g,at,.004,level,.02,.32);o.connect(g);g.connect(d);o.start(at);o.stop(at+.45);
  const o2=c.createOscillator(),g2=c.createGain();o2.frequency.value=pitch*2.7;env(g2,at,.002,level*.18,0,.08);o2.connect(g2);g2.connect(d);o2.start(at);o2.stop(at+.12);
 }
 // A short tonal chord, brass-like: saws through an opening low-pass.
 function chord(c,d,at,notes,{level=.2,dur=1,attack=.02,release=.8,bright=2600,seed=1}={}){
  const r=rng(seed),lp=filter(c,'lowpass',500,1.2),g=c.createGain();
  lp.frequency.setValueAtTime(500,at);lp.frequency.exponentialRampToValueAtTime(bright,at+attack+.12);lp.frequency.exponentialRampToValueAtTime(Math.max(600,bright*.4),at+dur+release);
  env(g,at,attack,level,Math.max(0,dur-attack),release);chain(lp,g,d);
  for(const f of notes)for(const det of[-7,7]){const o=c.createOscillator(),og=c.createGain();o.type=r()<.5?'sawtooth':'square';o.frequency.value=f;o.detune.value=det+(r()-.5)*4;og.gain.value=1/(notes.length*2.4);o.connect(og);og.connect(lp);o.start(at);o.stop(at+dur+release+.1)}
 }
 function bell(c,d,at,f,level=.06,decay=.9){for(const[m,a]of[[1,1],[2.76,.35],[5.4,.12]]){const o=c.createOscillator(),g=c.createGain();o.frequency.value=f*m;env(g,at,.002,level*a,0,decay/m**.4);o.connect(g);g.connect(d);o.start(at);o.stop(at+decay+.1)}}
 const NOTE=n=>440*Math.pow(2,(n-69)/12);

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
 function roar(size=1,at,dest){
  const x=ready(at,dest);if(!x)return;const{c,dest:d}=x;at=x.at;size=clamp(size,.2,1.2);
  // Goal: the whole stand shouting "Jaaa" and cheering on, plus the drums.
  voices(c,d,{at,dur:2.2,vowel:'a',level:.42*size,count:26,low:140,high:440,glide:1.14,attack:.12,release:1.4,seed:5});
  voices(c,d,{at:at+1.4,dur:1.8,vowel:'e',level:.22*size,count:18,low:170,high:400,glide:1.05,attack:.4,release:1.2,seed:6});
  const n=noise(c,{at,dur:3.2,type:'pink',offset:1.1}),lp=filter(c,'lowpass',420),g=c.createGain();env(g,at,.15,.32*size,1.1,1.6);chain(n,lp,g,d);
  for(let k=0;k<4;k++)drum(c,d,at+.6+k*.42,.32*size);
  hold(4.8);
 }
 function groan(size=1,at,dest){
  const x=ready(at,dest);if(!x)return;const{c,dest:d}=x;at=x.at;size=clamp(size,.2,1.2);
  // Missed chance: "Ohhh" rising with the shot and sinking with the miss.
  voices(c,d,{at,dur:1.25,vowel:'o',level:.4*size,count:20,low:120,high:330,glide:.8,attack:.12,release:1.1,seed:9});
  hold(2.6);
 }
 // "Applause" is now a short warm cheer (no clapping hiss).
 function applause(seconds=3,level=.5,at,dest){
  const x=ready(at,dest);if(!x)return;const{c,dest:d}=x;at=x.at;
  voices(c,d,{at,dur:Math.max(.6,seconds*.45),vowel:'e',level:clamp(level,0,1)*.5,count:16,low:160,high:380,glide:1.03,attack:.3,release:seconds*.4,seed:13});
  hold(seconds+1);
 }
 function chant(seconds=4,level=.25,at,dest){
  const x=ready(at,dest);if(!x)return;const{c,dest:d}=x;at=x.at;
  // "FOO-TE-RA": three sung syllables, repeated, with the stadium drum on each beat.
  const beat=.42;let t=at;
  while(t<at+seconds-beat*4){
   voices(c,d,{at:t,dur:beat*.9,vowel:'u',level,count:14,low:140,high:260,glide:1,attack:.06,release:.18,seed:21});
   voices(c,d,{at:t+beat,dur:beat*.8,vowel:'e',level:level*.9,count:14,low:150,high:280,glide:1,attack:.05,release:.18,seed:22});
   voices(c,d,{at:t+beat*2,dur:beat*1.5,vowel:'a',level:level*1.05,count:14,low:155,high:290,glide:.97,attack:.05,release:.3,seed:23});
   for(let k=0;k<3;k++)drum(c,d,t+k*beat,level*1.4);
   t+=beat*4;
  }
  hold(seconds+.5);
 }

 // ---------------------------------------------------------------- crowd bed
 // The stadium is never silent: a soft sung murmur and a deep rumble, no
 // hiss. Its level follows the danger of the move; muffle() for the replay.
 function crowd({level=.35,rain=0,at,dest}={}){
  const x=ready(at,dest);if(!x)return null;const{c,dest:d}=x;at=x.at;void rain;
  const r=rng(77),lp=filter(c,'lowpass',1600,.5),hp=filter(c,'highpass',75),master=c.createGain();master.gain.setValueAtTime(.0001,at);master.gain.exponentialRampToValueAtTime(Math.max(.0002,level),at+.6);
  lp.connect(hp);hp.connect(master);master.connect(d);
  const layers=[];
  // Murmur: many quiet voices on 'o'/'a' that swell slowly and independently.
  const voiceBus=c.createGain();voiceBus.gain.value=.8;
  for(const[freq,q,gain]of[[420,3,1],[780,4,.55]]){const f=filter(c,'bandpass',freq,q),g=c.createGain();g.gain.value=gain*2;voiceBus.connect(f);f.connect(g);g.connect(lp)}
  for(let i=0;i<18;i++){
   const o=c.createOscillator(),g=c.createGain(),lfo=c.createOscillator(),lg=c.createGain();
   o.type=i%2?'sawtooth':'triangle';o.frequency.value=105*Math.pow(3,r());o.detune.value=(r()-.5)*30;
   g.gain.value=.03;lfo.frequency.value=.07+r()*.22;lg.gain.value=.028;lfo.connect(lg);lg.connect(g.gain);
   o.connect(g);g.connect(voiceBus);o.start(at);lfo.start(at);layers.push(o,lfo);
  }
  // Deep stadium rumble (felt more than heard), under 300 Hz only.
  const n=noise(c,{at,type:'pink',loop:true,offset:r()*4}),rl=filter(c,'lowpass',300),rg=c.createGain();rg.gain.value=.22;chain(n,rl,rg,lp);layers.push(n);
  active++;let stopped=false;
  return{
   level(v,ramp=.35,when){if(stopped)return;const t=when??now(c);master.gain.setTargetAtTime(Math.max(.0002,clamp(v,0,1.2)),t,ramp)},
   muffle(on,when){if(stopped)return;const t=when??now(c);lp.frequency.setTargetAtTime(on?650:1600,t,.12)},
   stop(fade=.6,when){if(stopped)return;stopped=true;const t=when??now(c);master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(.0001,t,fade/3);
    for(const n of layers){try{n.stop(t+fade+.3)}catch(_){}}
    setTimeout(()=>{active=Math.max(0,active-1);scheduleIdle()},(fade+.5)*1000)}
  };
 }

 // ---------------------------------------------------------------- packs
 // V21.372 walkout: a small film score instead of noise. D minor tension in
 // the tunnel, each clue a timpani hit with a higher brass stab, the card a
 // boom with a bright D major chord, bells and the crowd.
 function timpani(c,d,at,pitch=73,level=.55){
  drum(c,d,at,level,pitch);
  const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(pitch*1.5,at);o.frequency.exponentialRampToValueAtTime(pitch*1.45,at+.6);env(g,at,.004,level*.25,.05,.9);o.connect(g);g.connect(d);o.start(at);o.stop(at+1.1);
 }
 let clueCount=0;
 function pack(step,at,dest){
  const x=ready(at,dest);if(!x)return;const{c}=x;let d=x.dest;at=x.at;
  if(step==='tunnel'){
   // Drone that swells until the flash calls stop(); fades by itself at END.
   const own=c.createGain();own.connect(d);d=own;const RISE=4.3,END=9.5;clueCount=0;
   const lp=filter(c,'lowpass',220,2),g=c.createGain();
   lp.frequency.setValueAtTime(220,at);lp.frequency.exponentialRampToValueAtTime(1500,at+RISE);
   g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.2,at+1.2);g.gain.exponentialRampToValueAtTime(.3,at+RISE);g.gain.setValueAtTime(.3,at+END-.6);g.gain.exponentialRampToValueAtTime(.0001,at+END);chain(lp,g,d);
   for(const[n,det]of[[38,0],[45,5],[50,-4],[53,3]]){const o=c.createOscillator(),og=c.createGain();o.type='sawtooth';o.frequency.value=NOTE(n);o.detune.value=det;og.gain.value=.12;o.connect(og);og.connect(lp);o.start(at);o.stop(at+END+.05)}
   // Rising tone (a long upward sweep) for the tension.
   const sw=c.createOscillator(),sg=c.createGain();sw.type='triangle';sw.frequency.setValueAtTime(NOTE(62),at+.5);sw.frequency.exponentialRampToValueAtTime(NOTE(86),at+RISE);
   sg.gain.setValueAtTime(.0001,at+.5);sg.gain.exponentialRampToValueAtTime(.035,at+RISE);sg.gain.setValueAtTime(.035,at+END-.6);sg.gain.exponentialRampToValueAtTime(.0001,at+END);sw.connect(sg);sg.connect(d);sw.start(at+.5);sw.stop(at+END+.05);
   // Heartbeat that gets faster.
   let t=at+.15,gap=.85;while(t<at+RISE-.2){drum(c,d,t,.3,72);drum(c,d,t+.16,.2,66);t+=gap;gap=Math.max(.42,gap*.86)}
   hold(END);
   return{stop(when){try{const t=when??now(c);own.gain.cancelScheduledValues(t);own.gain.setTargetAtTime(.0001,t,.08)}catch(_){}}};
  }
  if(step==='clue'||step==='board'){
   // Nation, position, club: timpani + a brass stab that climbs each time.
   const k=clueCount++%3,root=[[50,53,57],[53,57,60],[57,60,64]][k];
   timpani(c,d,at,step==='board'?82:73,.55);
   chord(c,d,at+.01,root.map(NOTE),{level:step==='board'?.12:.16,dur:.28,release:.5,bright:2400,seed:30+k});
   hold(1);return;
  }
  if(step==='flash'){
   // The card: boom, a bright D major chord, bells and the crowd.
   const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(70,at);o.frequency.exponentialRampToValueAtTime(36,at+1.1);env(g,at,.005,.55,.05,1.3);o.connect(g);g.connect(d);o.start(at);o.stop(at+1.5);
   timpani(c,d,at,73,.5);
   chord(c,d,at+.02,[50,57,62,66,69,74].map(NOTE),{level:.24,dur:1.4,attack:.03,release:1.8,bright:3600,seed:41});
   const notes=[74,78,81,86,90,93];notes.forEach((n,i)=>bell(c,d,at+.08+i*.07,NOTE(n),.05,1.1));
   roar(.75,at+.15,dest);clueCount=0;hold(5);return;
  }
  if(step==='card'){
   // Second card of a double walkout: bells and a short chord.
   [81,86,90].forEach((n,i)=>bell(c,d,at+i*.06,NOTE(n),.05,.9));
   chord(c,d,at,[62,66,69].map(NOTE),{level:.14,dur:.5,release:.8,seed:43});
   applause(1.8,.4,at+.05,dest);return;
  }
  // plain pack: a quick bright chime.
  [79,83,86].forEach((n,i)=>bell(c,d,at+i*.05,NOTE(n),.045,.7));hold(.9);
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
 root.FooteraSound=Object.freeze({enabled:()=>enabled,setEnabled,onChange,context:()=>enabled?ctx:null,wake,crowd,kick,net,post,whistle,roar,groan,applause,chant,pack,offlineBus,KEY});
})(typeof window!=='undefined'?window:globalThis);
