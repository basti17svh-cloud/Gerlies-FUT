/* V21.424 Tor-Clips: every goal of your team is recorded as a vertical video (9:16) while its
 * 3D highlight plays, replay included, with the stadium sound when it is on. After the match the
 * report lists the clips: watch, share (TikTok, Instagram, WhatsApp …) or save.
 * Presentation only: nothing here reads or writes the save, the match result or online data.
 * Clips live in memory for the current match only (never uploaded, gone after the next match).
 *
 * window.FooteraGoalClip
 *  supported()                    browser can record a canvas (MediaRecorder + captureStream)
 *  wants(event,host)              true for a goal of your own team in a normal match
 *  begin(event,canvas,layer)      called by the 3D scene; returns {frame(goalSeen,replay),end(result)} or null
 *  clips()                        clips of the current match [{id,minute,name,score,url,blob,type,seconds}]
 *  reportHTML()                   section for the match report (empty without clips)
 *  open(id)                       viewer with share/save
 *  caption(info)/fileName(info)   pure helpers (tests)
 * Opt-out (QA or slow phones): localStorage footera-goal-clips = '0'.
 */
(function(root){
 'use strict';
 const OPT_KEY='footera-goal-clips',MODAL_ID='goalClipModal',KIND='goal-clip',MAX_CLIPS=6,MIN_SECONDS=3;
 const escText=v=>typeof root.esc==='function'?root.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let store={owner:null,list:[]},seq=0,emblem=null,noticeFor=null;

 function optedOut(){try{return root.localStorage?.getItem(OPT_KEY)==='0'}catch(_){return false}}
 function pickType(){
  const MR=root.MediaRecorder;if(!MR||typeof MR.isTypeSupported!=='function')return '';
  // MP4 first: Instagram, TikTok and WhatsApp take it everywhere. WebM only as fallback.
  for(const t of['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'])
   try{if(MR.isTypeSupported(t))return t}catch(_){}
  return '';
 }
 function supported(){
  if(!root.document||optedOut())return false;
  const c=root.HTMLCanvasElement?.prototype;
  return !!(c&&typeof c.captureStream==='function'&&pickType());
 }
 function currentMatch(){try{return typeof match!=='undefined'?match:null}catch(_){return null}}
 function wants(event,host){
  if(!event||event.type!=='goal'||event.ceremony||event.team!=='home')return false;
  // Online friendlies bring their own stage; only the normal match stage records.
  if(host&&host.id&&host.id!=='matchLiveStage')return false;
  return supported();
 }
 // Clips belong to one match; a new match frees the old ones.
 function listFor(owner){
  if(store.owner!==owner){for(const c of store.list){try{URL.revokeObjectURL(c.url)}catch(_){}}store={owner,list:[]}}
  return store.list;
 }
 function teamNames(){
  let home='Footera Club',away='Gegner';
  try{if(typeof matchHomeTeamName==='function')home=matchHomeTeamName()}catch(_){}
  try{if(typeof matchAwayTeamName==='function')away=matchAwayTeamName()}catch(_){}
  return{home,away};
 }
 function caption(info){
  const min=Math.round(Number(info.minute)||0);
  return{
   kicker:info.late?'SPÄTES TOR':'TOOOR!',
   name:String(info.name||'Spieler'),
   line:`${min}. Minute${info.assist?` · Vorlage ${info.assist}`:''}`,
   score:`${info.home} ${info.homeScore} : ${info.awayScore} ${info.away}`
  };
 }
 function fileName(info,ext){
  const slug=String(info.name||'tor').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'tor';
  return`footera-tor-${slug}-${Math.round(Number(info.minute)||0)}min.${ext}`;
 }

 /* ---------- drawing one video frame ---------- */
 function sizes(){
  const mem=Number(root.navigator?.deviceMemory)||8,cores=Number(root.navigator?.hardwareConcurrency)||8;
  return mem<4||cores<=4?{w:540,h:960,bits:2500000}:{w:720,h:1280,bits:4500000};
 }
 function fitText(ctx,text,max,size,weight,family){
  let s=size;ctx.font=`${weight} ${s}px ${family}`;
  while(s>14&&ctx.measureText(text).width>max){s-=2;ctx.font=`${weight} ${s}px ${family}`}
  return s;
 }
 function drawFrame(ctx,src,blurCtx,info,W,H,look){
  const k=W/720;
  // Background: the same scene, tiny and stretched (a cheap blur), darkened.
  if(src.width&&src.height){
   blurCtx.drawImage(src,0,0,blurCtx.canvas.width,blurCtx.canvas.height);
   ctx.imageSmoothingEnabled=true;ctx.drawImage(blurCtx.canvas,0,0,W,H);
  }else{ctx.fillStyle='#071012';ctx.fillRect(0,0,W,H)}
  ctx.fillStyle='rgba(4,10,12,.68)';ctx.fillRect(0,0,W,H);
  // The scene itself: centre crop to 4:3, full width.
  const vw=W,vh=Math.round(W*3/4),vy=Math.round(H*.25);
  if(src.width&&src.height){
   const want=4/3,sa=src.width/src.height;let sw=src.width,sh=src.height,sx=0,sy=0;
   if(sa>want){sw=src.height*want;sx=(src.width-sw)/2}else{sh=src.width/want;sy=(src.height-sh)/2}
   ctx.drawImage(src,sx,sy,sw,sh,0,vy,vw,vh);
  }
  ctx.fillStyle='#63ff78';ctx.fillRect(0,vy-4*k,W,4*k);ctx.fillRect(0,vy+vh,W,4*k);
  // Top: brand.
  const em=emblem&&emblem.complete&&emblem.naturalWidth?emblem:null;
  const top=Math.round(H*.075);
  if(em){const s=86*k;ctx.drawImage(em,W/2-s/2,top-10*k,s,s)}
  ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillStyle='#ffffff';
  ctx.font=`900 ${46*k}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
  ctx.fillText('FOOTERA',W/2,top+(em?120:40)*k);
  ctx.fillStyle='#9fb0a8';ctx.font=`800 ${22*k}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
  ctx.fillText(look.replay?'WIEDERHOLUNG':`LIVE · ${Math.round(Number(info.minute)||0)}'`,W/2,top+(em?154:74)*k);
  if(look.replay){ctx.fillStyle='#ff4d5e';ctx.fillRect(W/2-120*k,top+(em?164:84)*k,240*k,4*k)}
  // Below the scene: the goal.
  const cap=caption(info),by=vy+vh+70*k,family='system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  if(look.goal){
   const a=Math.min(1,(look.now-look.goalAt)/350);ctx.globalAlpha=a;
   ctx.fillStyle='#63ff78';ctx.font=`900 italic ${34*k}px ${family}`;ctx.fillText(cap.kicker,W/2,by);
   ctx.fillStyle='#ffffff';fitText(ctx,cap.name.toLocaleUpperCase('de-DE'),W-80*k,64*k,900,family);ctx.fillText(cap.name.toLocaleUpperCase('de-DE'),W/2,by+70*k);
   ctx.fillStyle='#d6e2dc';ctx.font=`700 ${26*k}px ${family}`;ctx.fillText(cap.line,W/2,by+116*k);
   // Score plate.
   const plate=cap.score;fitText(ctx,plate,W-120*k,30*k,900,family);const pw=Math.min(W-60*k,ctx.measureText(plate).width+60*k),px=W/2-pw/2,py=by+150*k;
   ctx.fillStyle='rgba(10,24,22,.92)';ctx.fillRect(px,py,pw,58*k);ctx.strokeStyle='#63ff78';ctx.lineWidth=2*k;ctx.strokeRect(px,py,pw,58*k);
   ctx.fillStyle='#ffffff';ctx.fillText(plate,W/2,py+40*k);
   ctx.globalAlpha=1;
  }else{
   ctx.fillStyle='#ffffff';ctx.font=`900 ${30*k}px ${family}`;ctx.fillText(`${info.home} – ${info.away}`,W/2,by+30*k);
  }
  // Footer.
  ctx.fillStyle='#ffffff';ctx.font=`900 ${26*k}px ${family}`;ctx.fillText('BUILD YOUR ERA',W/2,H-78*k);
  ctx.fillStyle='#9fb0a8';ctx.font=`700 ${20*k}px ${family}`;ctx.fillText('Gespielt in Footera · kostenlos im Browser',W/2,H-46*k);
 }

 /* ---------- recording ---------- */
 function begin(event,canvas,layer){
  try{
   const host=layer?.parentElement||null;
   if(!canvas||!wants(event,host))return null;
   const owner=currentMatch();
   const names=teamNames(),homeBefore=Number(event.scoreBeforeHome),awayBefore=Number(event.scoreBeforeAway);
   const scorer=event.playerName||'Spieler',helper=event.assistName||event.creatorName||'';
   const info={minute:event.minute,name:scorer,assist:helper&&helper!==scorer?helper:'',home:names.home,away:names.away,
    homeScore:Number.isFinite(homeBefore)?homeBefore+1:'',awayScore:Number.isFinite(awayBefore)?awayBefore:'',late:Number(event.minute)>=85};
   if(!emblem&&root.Image){emblem=new Image();emblem.decoding='async';emblem.src='./assets/footera/emblem.png'}
   const {w:W,h:H,bits}=sizes(),out=document.createElement('canvas');out.width=W;out.height=H;
   const ctx=out.getContext('2d',{alpha:false});if(!ctx)return null;
   const blur=document.createElement('canvas');blur.width=24;blur.height=42;const blurCtx=blur.getContext('2d');
   const look={goal:false,goalAt:0,replay:false,now:0};
   drawFrame(ctx,canvas,blurCtx,info,W,H,look);
   const stream=out.captureStream(30);
   const tap=root.FooteraSound?.enabled?.()&&root.FooteraSound?.recordTap?.();
   for(const t of tap?.stream?.getAudioTracks?.()||[])stream.addTrack(t);
   const type=pickType(),chunks=[];
   let rec;
   try{rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:bits,audioBitsPerSecond:128000})}
   catch(_){try{rec=new MediaRecorder(stream)}catch(__){tap?.release?.();return null}}
   rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
   let started=0,lastDraw=0,ended=false,keep=false;
   rec.onstop=()=>{
    tap?.release?.();for(const t of stream.getTracks())try{t.stop()}catch(_){}
    const seconds=(performance.now()-started)/1000;
    if(!keep||!chunks.length||seconds<MIN_SECONDS)return;
    const mime=(rec.mimeType||type||'video/webm').split(';')[0],blob=new Blob(chunks,{type:mime});
    const list=listFor(owner);
    const clip={id:'gc'+(++seq),minute:info.minute,name:info.name,assist:info.assist,home:info.home,away:info.away,homeScore:info.homeScore,awayScore:info.awayScore,late:info.late,
     blob,type:mime,url:URL.createObjectURL(blob),seconds:Math.round(seconds)};
    list.push(clip);
    while(list.length>MAX_CLIPS){const old=list.shift();try{URL.revokeObjectURL(old.url)}catch(_){}}
    // One short note per match, so the player knows the clips are waiting.
    if(noticeFor!==owner&&typeof toast==='function'){noticeFor=owner;try{toast('🎬 Tor-Clip gespeichert – nach dem Spiel teilen')}catch(_){}}
    refreshReport();
   };
   // Recording starts with the first real picture of the scene, so the clip never opens on black.
   let failed=false;
   const startRec=()=>{try{rec.start(1000);started=performance.now()}catch(_){failed=true;tap?.release?.();for(const t of stream.getTracks())try{t.stop()}catch(__){}}};
   return{
    frame(goalSeen,replay){
     if(ended||failed)return;
     const now=performance.now();
     if(!started){try{drawFrame(ctx,canvas,blurCtx,info,W,H,look)}catch(_){}lastDraw=now;startRec();return}
     if(goalSeen&&!look.goal){look.goal=true;look.goalAt=now}
     look.replay=!!replay;look.now=now;
     // 30 pictures a second are plenty for a phone video and keep the game smooth.
     if(now-lastDraw<31)return;lastDraw=now;
     try{drawFrame(ctx,canvas,blurCtx,info,W,H,look)}catch(_){}
    },
    end(result){
     if(ended)return;ended=true;
     // Keep the clip when the ball went in (also when the replay was skipped).
     keep=look.goal&&result!=='fallback';
     if(!started||failed){tap?.release?.();for(const t of stream.getTracks())try{t.stop()}catch(_){}return}
     try{if(rec.state!=='inactive')rec.stop()}catch(_){tap?.release?.()}
    }
   };
  }catch(err){console.warn('Tor-Clip:',err);return null}
 }
 function clips(){const owner=currentMatch();return store.owner===owner?store.list.slice():[]}

 /* ---------- match report + viewer ---------- */
 function reportHTML(){
  const list=clips();if(!list.length)return '';
  return`<section class="gc-report" data-goal-clips><div class="gc-head"><span aria-hidden="true">🎬</span><div><strong>Deine Tor-Clips</strong><small>Als Video teilen – perfekt für TikTok, Insta & WhatsApp</small></div></div><div class="gc-list">${list.map(c=>`<button type="button" class="gc-item" data-goal-clip-open="${escText(c.id)}"><b>${Math.round(Number(c.minute)||0)}'</b><span>${escText(c.name)}</span><small>${escText(`${c.homeScore}:${c.awayScore}`)} · ${c.seconds} s</small><i aria-hidden="true">▶</i></button>`).join('')}</div></section>`;
 }
 function refreshReport(){
  // A goal in the final minutes can finish recording after the report is drawn.
  const report=root.document?.getElementById('matchReport');if(!report||!report.childElementCount)return;
  const html=reportHTML(),old=report.querySelector('[data-goal-clips]');
  if(old){old.outerHTML=html;return}
  if(!html)return;
  const anchor=report.querySelector('.np-open')||report.querySelector('.match-report-events');
  if(anchor)anchor.insertAdjacentHTML('beforebegin',html);
 }
 let shown=null;
 function ensureModal(){
  let el=document.getElementById(MODAL_ID);if(el)return el;
  el=document.createElement('div');el.id=MODAL_ID;el.className='modal';
  el.innerHTML=`<div class="modalinner gc-inner"><div class="modalhead"><h3>Tor-Clip</h3><button type="button" class="secondary" data-gc-close>Schließen</button></div><div class="gc-player"><video playsinline loop controls preload="auto"></video></div><p class="gc-note" data-gc-note></p><div class="gc-actions"><button type="button" class="primary" data-gc-share>Clip teilen</button><button type="button" class="secondary" data-gc-save>Speichern</button></div></div>`;
  document.body.appendChild(el);
  el.addEventListener('click',async e=>{
   if(e.target.closest('[data-gc-close]')||e.target===el){close();return}
   if(!shown)return;
   if(e.target.closest('[data-gc-share]'))await shareClip(shown);
   else if(e.target.closest('[data-gc-save]'))saveClip(shown);
  });
  return el;
 }
 function close(){
  const el=document.getElementById(MODAL_ID);if(!el)return;
  try{el.querySelector('video')?.pause()}catch(_){}
  if(typeof closeUiLayer==='function')closeUiLayer(MODAL_ID,KIND);else el.classList.remove('active');
 }
 function ext(c){return /mp4/.test(c.type)?'mp4':'webm'}
 function fileOf(c){return new File([c.blob],fileName(c,ext(c)),{type:c.type})}
 function shareText(c){return`⚽ ${c.name} trifft in der ${Math.round(Number(c.minute)||0)}. Minute! ${c.home} ${c.homeScore}:${c.awayScore} ${c.away} – gespielt in Footera. BUILD YOUR ERA`}
 async function shareClip(c){
  const file=fileOf(c),text=shareText(c);
  const url=root.FooteraShare?.inviteUrl?root.FooteraShare.inviteUrl('','torclip'):location.href;
  try{
   if(navigator.canShare?.({files:[file]})){await navigator.share({title:'Footera Tor-Clip',text,files:[file]});if(typeof toast==='function')toast('Danke fürs Teilen!');return}
  }catch(err){if(err?.name==='AbortError')return}
  // No video sharing on this device: save the file and keep the link at hand.
  saveClip(c);
  try{await navigator.clipboard?.writeText(`${text}\n${url}`)}catch(_){}
 }
 function saveClip(c){
  const a=document.createElement('a');a.href=c.url;a.download=fileName(c,ext(c));document.body.append(a);a.click();a.remove();
  if(typeof toast==='function')toast('Clip gespeichert');
 }
 function open(id){
  const c=clips().find(x=>x.id===id);if(!c)return null;
  const el=ensureModal();shown=c;
  const v=el.querySelector('video');v.src=c.url;v.muted=false;
  const note=el.querySelector('[data-gc-note]');
  note.textContent=`${c.name} · ${Math.round(Number(c.minute)||0)}. Minute · ${c.seconds} Sekunden${/webm/.test(c.type)?' · WebM-Video':''}`;
  if(typeof showUiLayer==='function')showUiLayer(MODAL_ID,KIND);else el.classList.add('active');
  try{const p=v.play();if(p&&p.catch)p.catch(()=>{})}catch(_){}
  return c;
 }
 function start(){root.document.addEventListener('click',e=>{const b=e.target.closest?.('[data-goal-clip-open]');if(b)open(b.getAttribute('data-goal-clip-open'))})}

 root.FooteraGoalClip=Object.freeze({supported,wants,begin,clips,reportHTML,open,close,caption,fileName,pickType,OPT_KEY});
 if(root.document&&root.document.addEventListener){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start);else start()}
})(typeof window!=='undefined'?window:globalThis);
