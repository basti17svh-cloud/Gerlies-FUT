'use strict';
/* Own soundtrack for the Social-Autopilot reels.
 * Basti 2026-11-04: videos need a fitting sound; then "weniger Gameboy, lieber modern ... Sounds die Bock auf Fußball machen".
 * So this is a small offline producer: band-limited supersaws, 808 sub, punchy kick with click, layered claps, reverb bus,
 * sidechain pump, plus stadium elements (referee whistle at kick-off, crowd roar that swells on the reveals, an "oh-oh" chant
 * from formant-filtered voices). All synthesised, no samples, so no licence questions.
 * Two styles: "anthem" (stadium house, TOTW/Footera/Black Friday) and "night" (dark half-time trap, Halloween/Season).
 * soundtrackWav({seconds, theme, seed, hits:{flash, wall, end}}) -> Buffer (16-bit stereo WAV, 44.1 kHz). */
const SR=44100,TAU=Math.PI*2;
const STYLES={
 footera:{kind:"anthem",bpm:126,root:45,prog:[[0,3,7,10],[-4,0,3,7],[-9,-5,-2,3],[-2,2,5,9]],chant:[7,7,10,12,10,7]},
 totw:{kind:"anthem",bpm:128,root:43,prog:[[0,4,7,11],[-3,0,4,7],[-7,-3,0,4],[-5,-1,2,7]],chant:[7,7,9,12,9,7]},
 blackfriday:{kind:"anthem",bpm:130,root:42,prog:[[0,3,7,10],[-4,0,3,7],[-2,2,5,9],[-5,-2,2,5]],chant:[12,12,10,7,10,12]},
 halloween:{kind:"night",bpm:140,root:40,prog:[[0,3,7],[1,4,8],[-4,0,3],[-2,1,5]],chant:[7,7,8,7,3,7]},
 season:{kind:"night",bpm:140,root:41,prog:[[0,3,7],[-4,0,3],[-2,2,5],[-5,-2,2]],chant:[7,7,10,7,5,7]}
};
const hz=m=>440*Math.pow(2,(m-69)/12);
function rng(seed){let x=(seed>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)/4294967296)}}
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}

// RBJ biquad
function biquad(type,f,q){const w=TAU*Math.min(f,SR*.45)/SR,c=Math.cos(w),a=Math.sin(w)/(2*q);let b0,b1,b2;
 if(type==="lp"){b0=(1-c)/2;b1=1-c;b2=b0}else if(type==="hp"){b0=(1+c)/2;b1=-(1+c);b2=b0}else{b0=a;b1=0;b2=-a}
 const a0=1+a,k={b0:b0/a0,b1:b1/a0,b2:b2/a0,a1:-2*c/a0,a2:(1-a)/a0};let x1=0,x2=0,y1=0,y2=0;
 const f2=x=>{const y=k.b0*x+k.b1*x1+k.b2*x2-k.a1*y1-k.a2*y2;x2=x1;x1=x;y2=y1;y1=y;return y};
 f2.set=(nf)=>{const w2=TAU*Math.min(nf,SR*.45)/SR,c2=Math.cos(w2),a2=Math.sin(w2)/(2*q),a02=1+a2;
  if(type==="lp"){k.b0=(1-c2)/2/a02;k.b1=(1-c2)/a02;k.b2=k.b0}else if(type==="hp"){k.b0=(1+c2)/2/a02;k.b1=-(1+c2)/a02;k.b2=k.b0}else{k.b0=a2/a02;k.b1=0;k.b2=-a2/a02}
  k.a1=-2*c2/a02;k.a2=(1-a2)/a02};
 return f2}
// polyBLEP saw (no aliasing buzz = no "Gameboy")
function blep(t,dt){if(t<dt){t/=dt;return t+t-t*t-1}if(t>1-dt){t=(t-1)/dt;return t*t+t+t+1}return 0}

function soundtrackWav({seconds=9,theme="footera",seed="",hits={}}={}){
 const st=STYLES[theme]||STYLES.footera,night=st.kind==="night",r=rng(hash(seed+theme)),N=Math.round(seconds*SR);
 const L=new Float32Array(N),R=new Float32Array(N),VL=new Float32Array(N),VR=new Float32Array(N); // dry + reverb send
 const beat=60/st.bpm,flash=hits.flash??1.6,wall=hits.wall,end=hits.end??seconds-1.7;
 const noise=rng(hash("n"+seed)),nz=()=>noise()*2-1;
 const pump=new Float32Array(N).fill(1);
 const put=(i,v,pan=0,send=0)=>{if(i<0||i>=N)return;const l=v*(1-pan)*.5+v*.5,rr=v*(1+pan)*.5+v*.5;L[i]+=l;R[i]+=rr;if(send){VL[i]+=l*send;VR[i]+=rr*send}};
 const pat=Math.floor(r()*2);

 function kick(t,amp=1){const s=Math.round(t*SR),hp=biquad("hp",1500,.7);let ph=0;for(let i=0;i<SR*.45;i++){const x=i/SR,f=48+(night?120:170)*Math.exp(-x*32);ph+=TAU*f/SR;
   const body=Math.tanh(Math.sin(ph)*2.2)*Math.exp(-x*(night?5:7.5)),click=hp(nz())*Math.exp(-x*400)*.5;put(s+i,(body*.95+click)*amp);
   if(s+i<N)pump[s+i]=Math.min(pump[s+i],.25+.75*Math.min(1,Math.pow(x/.22,1.5)))}}
 function clap(t,amp=1){const s=Math.round(t*SR),bp=biquad("bp",1300,1.1),hp=biquad("hp",500,.7);for(let i=0;i<SR*.35;i++){const x=i/SR;
   let e=0;for(const o of[0,.009,.018])if(x>=o)e=Math.max(e,Math.exp(-(x-o)*(o<.018?260:22)));put(s+i,hp(bp(nz()))*e*1.5*amp,(noise()-.5)*.3,.5)}}
 function hat(t,amp=1,open=false){const s=Math.round(t*SR),hp=biquad("hp",8000,.8);for(let i=0;i<SR*(open?.25:.06);i++){const x=i/SR;put(s+i,hp(nz())*Math.exp(-x*(open?16:70))*.2*amp,.35,open?.25:.05)}}
 function sub(t,dur,m,amp=1,glideFrom=null){const s=Math.round(t*SR),len=Math.round(dur*SR);let ph=0;for(let i=0;i<len;i++){const x=i/SR,g=glideFrom==null?1:Math.min(1,x/.07),
   f=glideFrom==null?hz(m):hz(glideFrom+(m-glideFrom)*g);ph+=TAU*f/SR;const a=Math.min(1,i/(SR*.004))*Math.min(1,(len-i)/(SR*.03))*(night?Math.exp(-x*.9):1);
   put(s+i,Math.tanh(Math.sin(ph)*(night?2.6:1.8))*.55*a*amp*(night?1:pump[Math.min(N-1,s+i)]))}}
 function supersaw(t,dur,notes,amp,cut0,cut1,send=.35){const s=Math.round(t*SR),len=Math.round(dur*SR),voices=[];
   for(const m of notes)for(const d of[-.011,-.006,-.002,0,.003,.007,.012])voices.push({f:hz(m)*(1+d),ph:r(),pan:d*40});
   const fl=biquad("lp",cut0,.9),fr=biquad("lp",cut0,.9);
   for(let i=0;i<len;i++){if(i%64===0){const k=i/len,c=cut0*Math.pow(cut1/cut0,k);fl.set(c);fr.set(c)}let vl=0,vr=0;
    for(const v of voices){const dt=v.f/SR;v.ph+=dt;if(v.ph>=1)v.ph-=1;const sv=(2*v.ph-1)-blep(v.ph,dt);vl+=sv*(1-v.pan);vr+=sv*(1+v.pan)}
    const a=Math.min(1,i/(SR*.02))*Math.min(1,(len-i)/(SR*.06))*amp/voices.length*pump[Math.min(N-1,s+i)];
    const yl=fl(vl)*a,yr=fr(vr)*a;if(s+i<N){L[s+i]+=yl;R[s+i]+=yr;VL[s+i]+=yl*send;VR[s+i]+=yr*send}}}
 function pluck(t,m,amp){const s=Math.round(t*SR),fl=biquad("lp",5000,1.2);let ph=0,ph2=0;for(let i=0;i<SR*.5;i++){const x=i/SR;ph+=hz(m)/SR;ph2+=hz(m+12)*1.003/SR;
   const v=(Math.sin(TAU*ph)+.4*Math.sin(TAU*ph2)+.25*Math.sin(TAU*ph*3)*Math.exp(-x*20));fl.set(1200+5000*Math.exp(-x*12));put(s+i,fl(v)*Math.exp(-x*(night?3:6))*amp,.2,.45)}}
 // stadium "ooh" chant: several voices, formant filters for an open O vowel
 function chant(t,dur,m,amp){const s=Math.round(t*SR),len=Math.round(dur*SR);for(let vc=0;vc<6;vc++){const det=1+(r()-.5)*.018,off=Math.round(r()*SR*.03),pan=(vc/5-.5)*1.4;
   const f1=biquad("bp",470,5),f2=biquad("bp",820,7),f3=biquad("bp",2600,9);let ph=0;
   for(let i=0;i<len;i++){const x=i/SR,f=hz(m+(vc%2?-12:0))*det*(1+.006*Math.sin(TAU*5.2*x+vc));ph+=f/SR;if(ph>=1)ph-=1;const src=(2*ph-1)-blep(ph,f/SR)+nz()*.08;
    const v=f1(src)*1+f2(src)*.6+f3(src)*.18,a=Math.min(1,i/(SR*.06))*Math.min(1,(len-i)/(SR*.12));put(s+i+off,v*a*amp*.55,pan,.6)}}}
 function crowd(t0,t1,base,swells){const a=Math.round(t0*SR),b=Math.min(N,Math.round(t1*SR)),bl=biquad("bp",700,.6),br=biquad("bp",900,.6),lo=biquad("lp",2600,.7);let w=0;
   for(let i=a;i<b;i++){const t=i/SR;let g=base;for(const s of swells){const d=t-s.at;if(d>-.25)g+=s.amp*(d<0?(d+.25)/.25:Math.exp(-d/s.len))}
    w+=(nz()-w)*.002;const m=1+.35*w;const n=lo(nz());L[i]+=bl(n)*g*m*.9;R[i]+=br(nz())*g*m*.9;VL[i]+=bl(n)*g*.05}}
 function whistle(t,dur,amp){const s=Math.round(t*SR),len=Math.round(dur*SR),bp=biquad("bp",3000,3);let ph=0;for(let i=0;i<len;i++){const x=i/SR,f=2950+170*Math.sin(TAU*31*x)+60*Math.sin(TAU*4*x);ph+=f/SR;
   const a=Math.min(1,i/(SR*.012))*Math.min(1,(len-i)/(SR*.02));put(s+i,(Math.sin(TAU*ph)*.8+bp(nz())*.6)*a*amp,0,.35)}}
 function riser(t0,t1,amp){const a=Math.round(t0*SR),b=Math.round(t1*SR),bp=biquad("bp",400,2.5);for(let i=a;i<b;i++){const k=(i-a)/(b-a);if(i%32===0)bp.set(300+9000*k*k);put(i,bp(nz())*k*k*amp*2.2,Math.sin(k*18)*.5,.5)}}
 function impact(t,amp){const s=Math.round(t*SR),lp=biquad("lp",5000,.7);let ph=0;for(let i=0;i<SR*2;i++){const x=i/SR,f=34+70*Math.exp(-x*7);ph+=TAU*f/SR;lp.set(400+6000*Math.exp(-x*4));
   put(s+i,(Math.tanh(Math.sin(ph)*2)*Math.exp(-x*2)*.9+lp(nz())*Math.exp(-x*2.8)*.45)*amp,(noise()-.5)*.3,.6)}}

 // ---- arrangement ----
 const bar=beat*4,bars=Math.ceil(seconds/bar)+1,breakAt=wall!=null?wall-1.2:null;
 const inBreak=t=>breakAt!=null&&t>=breakAt&&t<wall;
 whistle(.12,.42,.32);whistle(.62,.16,.28);
 crowd(0,seconds,.05,[{at:flash,amp:.12,len:1.2},...(wall!=null?[{at:wall,amp:.2,len:1.6}]:[]),{at:end,amp:.18,len:2}]);
 for(let b=0;b<bars;b++){const t0=b*bar,ch=st.prog[b%st.prog.length],m0=st.root+12+ch[0];if(t0>=end+.01)break;
  const pre=t0<flash-.01;
  supersaw(t0,Math.min(bar,end-t0)+.05,ch.map(n=>st.root+24+n),pre?.7:1.2,pre?500+1400*(t0/flash):night?1600:2600,pre?1900:night?2400:4200,night?.5:.35);
  for(let s=0;s<16;s++){const t=t0+s*beat/4;if(t<flash-.005||t>=end)continue;const brk=inBreak(t);
   if(night){ // half-time trap: kick on 1 and the "and" of 2/3, clap on 3, rolling hats, 808 glides
    if(!brk&&(s===0||s===7||(pat&&s===10)))kick(t);
    if(s===8&&!brk)clap(t,1.1);
    if(!brk||s%2===0)hat(t,s%4===0?.9:.5);
    if(s===14&&b%2&&!brk){hat(t+beat/12,.45);hat(t+beat/6,.45)}
    if(!brk&&(s===0||s===7||s===10))sub(t,s===0?beat*1.7:beat*.7,m0-12+(s===10?7:0),1,s===10?m0-12:null);
   }else{ // stadium house: four on the floor, claps on 2/4, offbeat open hats, pumping sub
    if(s%4===0&&!brk)kick(t);
    if((s===4||s===12)&&!brk)clap(t);
    if(s%4===2)hat(t,1,true);else if(!brk&&s%2)hat(t,.55);
    if(!brk&&[2,6,10,14].includes(s))sub(t,beat*.42,m0-12+(s===14&&pat?7:0),1);
   }}
  if(!pre&&t0+bar<=end+.01){const mel=st.chant;for(let k=0;k<6;k++){const tt=t0+[0,1,1.5,2,3,3.5][k]*beat;if(!inBreak(tt)&&b%2===0)chant(tt,beat*(k===3?.95:.45),st.root+24+mel[k],.38)}}
  if(!pre&&b%2===1)for(let k=0;k<4;k++)pluck(t0+k*beat+(k%2?beat/2:0),st.root+36+ch[(k+1)%ch.length],night?.12:.1);
 }
 riser(Math.max(.7,flash-1.3),flash,.32);impact(flash,.75);kick(flash,1.1);
 if(wall!=null){riser(wall-1.2,wall,.5);impact(wall,1);hat(wall,1.1,true)}
 impact(end,.95);supersaw(end,Math.max(.3,seconds-end),st.prog[0].map(n=>st.root+24+n),.7,3000,700,.7);pluck(end+.05,st.root+36+st.prog[0][0],.2);

 // ---- reverb bus (Freeverb-style: 6 combs + 2 allpasses per side) ----
 const rv=(inp,spread)=>{const out=new Float32Array(N),combs=[1116,1188,1277,1356,1422,1491].map(d=>({b:new Float32Array(d+spread),i:0,f:0})),aps=[556,441].map(d=>({b:new Float32Array(d+spread),i:0}));
  for(let n=0;n<N;n++){let y=0;const x=inp[n]*.25;for(const c of combs){const o=c.b[c.i];c.f=o*.75+c.f*.25;c.b[c.i]=x+c.f*.84;c.i=(c.i+1)%c.b.length;y+=o}
   for(const a of aps){const o=a.b[a.i];a.b[a.i]=y+o*.5;y=o-y*.5;a.i=(a.i+1)%a.b.length}out[n]=y}return out};
 const RL=rv(VL,0),RR=rv(VR,23);
 // ---- master: low-cut, glue compression feel, fade, normalise ----
 const hl=biquad("hp",28,.7),hr=biquad("hp",28,.7);let peak=0;const fin=SR*.02,fout=SR*.45;
 for(let i=0;i<N;i++){const g=Math.min(1,i/fin)*Math.min(1,(N-i)/fout);L[i]=Math.tanh(hl(L[i]+RL[i]*.55)*1.35)*g;R[i]=Math.tanh(hr(R[i]+RR[i]*.55)*1.35)*g;peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]))}
 const norm=peak>0?.8/peak:1,buf=Buffer.alloc(44+N*4);
 buf.write("RIFF",0);buf.writeUInt32LE(36+N*4,4);buf.write("WAVEfmt ",8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);
 buf.writeUInt32LE(SR,24);buf.writeUInt32LE(SR*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write("data",36);buf.writeUInt32LE(N*4,40);
 for(let i=0;i<N;i++){buf.writeInt16LE(Math.round(Math.max(-1,Math.min(1,L[i]*norm))*32767),44+i*4);buf.writeInt16LE(Math.round(Math.max(-1,Math.min(1,R[i]*norm))*32767),46+i*4)}
 return buf
}
module.exports={soundtrackWav,STYLES};
