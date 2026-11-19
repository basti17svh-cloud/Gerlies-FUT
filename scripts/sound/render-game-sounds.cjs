#!/usr/bin/env node
// Renders Footera's game sounds to WAV files, exactly as the game makes them:
// footera-sound.js runs in headless Chromium and every cue is played into an
// OfflineAudioContext through the game's own master bus (compressor included).
// Used by scripts/sound/hear.sh so an agent can listen with earshot.
//
//   node scripts/sound/render-game-sounds.cjs [--out DIR] [--only id,id]
//
// Writes DIR/<id>.wav (48 kHz stereo, 16 bit) and DIR/cues.json (what each
// file should sound like, plus near confusions, for `earshot match`).
// Presentation only: reads repo files, writes nothing outside DIR.
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');

const ROOT=path.resolve(__dirname,'..','..');
const args=process.argv.slice(2);
const opt=(name,def)=>{const i=args.indexOf(name);return i>=0&&args[i+1]?args[i+1]:def};
const OUT=path.resolve(opt('--out',path.join(ROOT,'test-artifacts','sound')));
const ONLY=(opt('--only','')||'').split(',').filter(Boolean);

// Each cue: seconds to render, a script run in the page with
// S=FooteraSound, d=bus (destination), t0=start time, and what it should be.
// Keep descriptions in plain English: earshot's CLAP model reads English.
const CUES=[
 {id:'kick-pass',seconds:.8,play:'S.kick(.35,t0,d)',expect:'a football being kicked, a short leather thump',alts:['a door knock','a kick drum','a hand clap']},
 {id:'kick-shot',seconds:.8,play:'S.kick(1,t0,d)',expect:'a hard kick of a football',alts:['a kick drum','a door slam','a punch']},
 {id:'net',seconds:1,play:'S.net(t0,d)',expect:'a ball hitting a goal net, a deep soft thud',alts:['a kick drum','a pillow hit','thunder']},
 {id:'post',stadium:true,seconds:1.6,play:'S.post(t0,d)',expect:'a ball hitting a metal goal post, a metallic clang',alts:['a bell','a pot lid','a glass clink']},
 {id:'whistle-short',stadium:true,seconds:.8,play:'S.whistle("short",t0,d)',expect:'a referee blowing a whistle',alts:['a bird chirping','a tea kettle','a beep']},
 {id:'whistle-final',stadium:true,seconds:2.8,play:'S.whistle("final",t0,d)',expect:'a referee blowing the final whistle three times',alts:['a car horn','a bird chirping','an alarm beep']},
 {id:'crowd-bed',seconds:6,stadium:true,play:'const b=S.crowd({level:.5,at:t0,dest:d});',expect:'a football stadium crowd murmuring',alts:['rain','traffic noise','a restaurant chatter']},
 {id:'goal-roar',seconds:6,stadium:true,play:'S.roar(1,t0,d)',expect:'a stadium crowd cheering a goal',alts:['applause','a concert crowd','a waterfall']},
 {id:'groan',seconds:3,stadium:true,play:'S.groan(1,t0,d)',expect:'a disappointed crowd groaning after a miss',alts:['a crowd cheering','wind','applause']},
 {id:'applause',seconds:4,stadium:true,play:'S.applause(3.5,.8,t0,d)',expect:'a crowd applauding',alts:['rain','frying food','a crowd cheering']},
 {id:'goal-moment',seconds:7,stadium:true,play:'const b=S.crowd({level:.45,at:t0,dest:d});S.kick(1,t0+.6,d);S.net(t0+.95,d);S.roar(1,t0+1.05,d);b&&b.level(1,.4,t0+1.05);',expect:'a football kicked into the net and the stadium erupts in cheers',alts:['a car crash','fireworks','applause at a concert']},
 {id:'walkout',seconds:9,pack:true,play:'S.pack("tunnel",t0,d,{flashIn:4.25});S.pack("clue",t0+1.2,d);S.pack("clue",t0+2.2,d);S.pack("clue",t0+3.2,d);S.pack("flash",t0+4.25,d);',expect:'a dramatic build up with deep hits, then a boom, fireworks and a cheering crowd',alts:['a thunderstorm','a car engine','a quiet room']},
 {id:'pack-plain',seconds:2.5,pack:true,play:'S.pack("plain",t0,d)',expect:'a soft thud with a magic sparkle',alts:['a door knock','a bell','glass breaking']},
];

function wavFromChannels(channels,sampleRate){
 const n=channels[0].length,ch=channels.length,buf=Buffer.alloc(44+n*ch*2);
 buf.write('RIFF',0);buf.writeUInt32LE(36+n*ch*2,4);buf.write('WAVE',8);buf.write('fmt ',12);
 buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(ch,22);buf.writeUInt32LE(sampleRate,24);
 buf.writeUInt32LE(sampleRate*ch*2,28);buf.writeUInt16LE(ch*2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*ch*2,40);
 let o=44;for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const v=Math.max(-1,Math.min(1,channels[c][i]));buf.writeInt16LE(Math.round(v<0?v*32768:v*32767),o);o+=2}
 return buf;
}

function serve(){
 const types={'.js':'text/javascript','.mjs':'text/javascript','.mp3':'audio/mpeg','.html':'text/html'};
 const server=http.createServer((req,res)=>{
  const url=decodeURIComponent(req.url.split('?')[0]);
  if(url==='/'){res.writeHead(200,{'content-type':'text/html'});return res.end('<!doctype html><script src="/footera-sound.js"></script>')}
  const file=path.join(ROOT,url);
  if(!file.startsWith(ROOT)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
  res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
 });
 return new Promise(r=>server.listen(0,'127.0.0.1',()=>r(server)));
}

(async()=>{
 const cues=ONLY.length?CUES.filter(c=>ONLY.includes(c.id)):CUES;
 if(!cues.length)throw new Error('no cue matches --only; ids: '+CUES.map(c=>c.id).join(', '));
 fs.mkdirSync(OUT,{recursive:true});
 const server=await serve(),base='http://127.0.0.1:'+server.address().port+'/';
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(base);
  await page.waitForFunction(()=>!!window.FooteraSound);
  const written=[];
  for(const cue of cues){
   const result=await page.evaluate(async({cue})=>{
    const S=window.FooteraSound,rate=48000,off=new OfflineAudioContext(2,Math.ceil(rate*cue.seconds),rate);
    const d=S.offlineBus(off);
    if(cue.stadium&&!await S.preloadStadium(off))throw new Error('stadium recordings did not load');
    if(cue.pack&&!await S.preload(off))throw new Error('walkout recordings did not load');
    const t0=.05;
    // eslint-disable-next-line no-new-func
    new Function('S','d','t0',cue.play)(S,d,t0);
    const buf=await off.startRendering();
    const chans=[];for(let c=0;c<buf.numberOfChannels;c++)chans.push(Array.from(buf.getChannelData(c)));
    return{rate:buf.sampleRate,chans};
   },{cue});
   const peak=Math.max(...result.chans.map(ch=>ch.reduce((m,v)=>Math.max(m,Math.abs(v)),0)));
   if(peak<1e-4)throw new Error(cue.id+': rendered silence');
   const file=path.join(OUT,cue.id+'.wav');
   fs.writeFileSync(file,wavFromChannels(result.chans,result.rate));
   written.push({id:cue.id,file:path.basename(file),seconds:cue.seconds,expect:cue.expect,alts:cue.alts,peakDbfs:+(20*Math.log10(peak)).toFixed(1)});
   console.log(`${cue.id.padEnd(14)} ${cue.seconds}s  peak ${(20*Math.log10(peak)).toFixed(1)} dBFS`);
  }
  fs.writeFileSync(path.join(OUT,'cues.json'),JSON.stringify({renderedFrom:'footera-sound.js',cues:written},null,1)+'\n');
  console.log('wrote',written.length,'files to',OUT);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error('render-game-sounds:',e.message);process.exit(1)});
