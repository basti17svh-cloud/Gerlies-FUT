'use strict';
/* Own soundtrack for the Social-Autopilot reels (Basti 2026-11-04: TikTok videos need a fitting sound).
 * Everything is synthesised here (kick, clap, hats, bass, pad, riser, impacts), so there are no licence questions
 * and every reel gets a beat that hits its own timeline: title slam, card flash, team wall, logo end card.
 * Each theme has its own key, tempo and colour; the seed picks one of several patterns, so posts don't all sound alike.
 * soundtrackWav({seconds, theme, seed, hits:{flash, wall, end}}) -> Buffer (16-bit stereo WAV, 44.1 kHz). */
const SR=44100;
const STYLES={
 footera:{bpm:124,root:45,prog:[[0,3,7],[-4,0,3],[-9,-5,-2],[-2,2,5]],bright:.55,swing:0},
 totw:{bpm:126,root:43,prog:[[0,4,7],[-3,0,4],[-7,-3,0],[-5,-1,2]],bright:.7,swing:0},
 halloween:{bpm:98,root:40,prog:[[0,3,7],[1,4,8],[0,3,7],[-2,1,5]],bright:.35,swing:.08,bell:true},
 season:{bpm:96,root:41,prog:[[0,3,7],[-4,0,3],[-2,2,5],[-5,-2,2]],bright:.4,swing:.05,bell:true},
 blackfriday:{bpm:130,root:42,prog:[[0,3,7],[0,3,7],[-4,0,3],[-2,2,5]],bright:.85,swing:0}
};
const hz=m=>440*Math.pow(2,(m-69)/12);
function rng(seed){let x=(seed>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)/4294967296)}}
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}

function soundtrackWav({seconds=9,theme="footera",seed="",hits={}}={}){
 const st=STYLES[theme]||STYLES.footera,r=rng(hash(seed+theme)),N=Math.round(seconds*SR);
 const L=new Float32Array(N),R=new Float32Array(N),beat=60/st.bpm;
 const flash=hits.flash??1.6,wall=hits.wall,end=hits.end??seconds-1.7;
 const pattern=Math.floor(r()*3);               // 0 four-on-floor, 1 with 16th hats, 2 broken kick
 const bassRhythm=[[1,0,1,1,0,1,1,0],[1,1,0,1,1,0,1,0],[1,0,0,1,1,0,1,1]][Math.floor(r()*3)];
 const add=(buf,i,v)=>{if(i>=0&&i<N)buf[i]+=v};
 const both=(i,v,pan=0)=>{add(L,i,v*(1-pan));add(R,i,v*(1+pan))};
 const noise=rng(hash("n"+seed));
 const duck=new Float32Array(N).fill(1);        // sidechain: kick ducks bass + pad

 function kick(t,amp=1){const s=Math.round(t*SR);let ph=0;for(let i=0;i<SR*.32;i++){const x=i/SR,f=45+105*Math.exp(-x*28);ph+=2*Math.PI*f/SR;both(s+i,Math.sin(ph)*Math.exp(-x*9)*amp*.9);if(s+i<N)duck[s+i]=Math.min(duck[s+i],.35+.65*Math.min(1,x/.18))}}
 function clap(t,amp=1){const s=Math.round(t*SR);let lp=0;for(let i=0;i<SR*.22;i++){const x=i/SR,n=noise()*2-1;lp+=(n-lp)*.35;const e=(x<.03?Math.exp(-((x%.01)*300)):1)*Math.exp(-x*18);both(s+i,(n-lp)*e*.42*amp,(noise()-.5)*.3)}}
 function hat(t,amp=1,open=false){const s=Math.round(t*SR);let prev=0;for(let i=0;i<SR*(open?.18:.05);i++){const x=i/SR,n=noise()*2-1,hp=n-prev;prev=n;both(s+i,hp*Math.exp(-x*(open?22:90))*.13*amp*(.6+st.bright*.6),.25)}}
 function tone(t,dur,f,amp,kind="saw",cut=.1){const s=Math.round(t*SR),len=Math.round(dur*SR);let ph=0,lp=0;for(let i=0;i<len;i++){ph+=f/SR;const p=ph%1;let v=kind==="saw"?2*p-1:kind==="sq"?(p<.5?1:-1):Math.sin(2*Math.PI*p);lp+=(v-lp)*cut;const a=Math.min(1,i/(SR*.01))*Math.min(1,(len-i)/(SR*.03));const d=s+i<N?duck[s+i]:1;both(s+i,lp*a*amp*d)}}
 function bell(t,f,amp){const s=Math.round(t*SR);for(let i=0;i<SR*1.4;i++){const x=i/SR,v=Math.sin(2*Math.PI*f*x)+.5*Math.sin(2*Math.PI*f*2.76*x)*Math.exp(-x*4)+.25*Math.sin(2*Math.PI*f*5.4*x)*Math.exp(-x*8);both(s+i,v*Math.exp(-x*2.6)*amp,-.2)}}
 function riser(t0,t1,amp=.5){const a=Math.round(t0*SR),b=Math.round(t1*SR);let prev=0,lp=0;for(let i=a;i<b;i++){const k=(i-a)/(b-a),n=noise()*2-1;lp+=(n-lp)*(.05+k*.6);const hp=lp-prev;prev=lp;both(i,hp*k*k*amp*2.4,Math.sin(k*20)*.4)}}
 function impact(t,amp=1){const s=Math.round(t*SR);let ph=0,lp=0;for(let i=0;i<SR*1.6;i++){const x=i/SR,f=38+60*Math.exp(-x*6);ph+=2*Math.PI*f/SR;const n=noise()*2-1;lp+=(n-lp)*.25;both(s+i,(Math.sin(ph)*Math.exp(-x*2.2)*.9+lp*Math.exp(-x*3.5)*.35)*amp,(noise()-.5)*.2)}}

 // timeline: soft pad intro, drums drop on the card flash, a riser + impact into the team wall, stab + tail on the end card
 const bar=beat*4,barsTotal=Math.ceil(seconds/bar)+1;
 for(let b=0;b<barsTotal;b++){
  const chord=st.prog[b%st.prog.length],t0=b*bar;
  if(t0<end+bar)for(const n of chord){tone(t0,bar+.05,hz(st.root+24+n),.045,"saw",.03+st.bright*.03);tone(t0,bar+.05,hz(st.root+24+n)*1.004,.035,"saw",.03)}
  for(let s=0;s<8;s++){const t=t0+s*beat/2+(s%2?st.swing*beat:0);
   if(t<flash-.02||t>=end)continue;
   if(bassRhythm[s])tone(t,beat*.45,hz(st.root+chord[0]+(s===6&&pattern===2?12:0)),.22,"sq",.06+st.bright*.05);
   if(s%2===0&&(pattern!==2||s!==4))kick(t);
   if(pattern===2&&s===5)kick(t,.8);
   if(s===2||s===6)clap(t);
   hat(t+(s%2?0:beat/4),s%2?1:.55,s%4===3&&pattern===1);
   if(pattern===1)hat(t+beat/4,.4);
  }
  if(st.bell&&t0<end)bell(t0+beat*(b%2?2.5:0),hz(st.root+36+chord[(b+1)%3]),.07);
 }
 riser(Math.max(0,flash-1.2),flash,.35);kick(flash,1.1);impact(flash,.5);
 if(wall!=null){riser(wall-1.4,wall,.55);impact(wall,1);hat(wall,1.2,true)}
 impact(end,.9);for(const n of st.prog[0])tone(end,1.6,hz(st.root+24+n),.09,"saw",.05);bell(end+.2,hz(st.root+48),.08);

 // master: gentle glue, fade in/out, peak normalise to -1 dBFS
 let peak=0;const fin=SR*.04,fout=SR*.5;
 for(let i=0;i<N;i++){const g=Math.min(1,i/fin)*Math.min(1,(N-i)/fout);L[i]=Math.tanh(L[i]*1.2)*g;R[i]=Math.tanh(R[i]*1.2)*g;peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]))}
 const norm=peak>0?.8/peak:1,buf=Buffer.alloc(44+N*4);
 buf.write("RIFF",0);buf.writeUInt32LE(36+N*4,4);buf.write("WAVEfmt ",8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);
 buf.writeUInt32LE(SR,24);buf.writeUInt32LE(SR*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write("data",36);buf.writeUInt32LE(N*4,40);
 for(let i=0;i<N;i++){buf.writeInt16LE(Math.round(Math.max(-1,Math.min(1,L[i]*norm))*32767),44+i*4);buf.writeInt16LE(Math.round(Math.max(-1,Math.min(1,R[i]*norm))*32767),46+i*4)}
 return buf
}
module.exports={soundtrackWav,STYLES};
