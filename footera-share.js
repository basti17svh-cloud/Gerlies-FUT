/* Footera V21.209 — share walkouts, invite friends by link and suggest the home-screen app.
   Invite links look like ./?invite=AB7K-3P9Q&utm_source=share&utm_medium=invite. The code is
   kept on this device until the online service can resolve it, then the inviter becomes a friend. */
(()=>{
 "use strict";
 if(window.FooteraShare)return;
 const INVITE_KEY="footera-pending-invite-v1",HINT_KEY="footera-install-hint-v1",
       INVITE_DAYS=14,HINT_PAUSE_DAYS=3,HINT_MAX=3,CODE=/^[A-HJ-NP-Z2-9]{8}$/;
 const read=k=>{try{return localStorage.getItem(k)}catch{return null}};
 const write=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
 const erase=k=>{try{localStorage.removeItem(k)}catch{}};
 const say=msg=>typeof toast==="function"?toast(msg):console.info(msg);
 const normCode=v=>String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
 const prettyCode=c=>c.slice(0,4)+"-"+c.slice(4);
 const escText=v=>typeof esc==="function"?esc(v):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let shareJob=null,shareMeta=null,hintShown=false;

 function gameUrl(){const u=new URL("./",location.href);u.search="";u.hash="";return u}
 function inviteUrl(code,medium="invite"){
  const u=gameUrl(),c=normCode(code);
  if(CODE.test(c))u.searchParams.set("invite",prettyCode(c));
  u.searchParams.set("utm_source","share");u.searchParams.set("utm_medium",medium);
  return u.toString()
 }
 async function myCode(waitMs=4000){
  const online=window.FooteraOnline;
  if(!online?.available)return"";
  if(CODE.test(normCode(online.friendCode)))return normCode(online.friendCode);
  try{
   const job=(async()=>{await online.init();return normCode(await online.getFriendCode())})();
   const code=await Promise.race([job,new Promise(r=>setTimeout(()=>r(""),waitMs))]);
   return CODE.test(code)?code:""
  }catch(e){console.warn("Footera Einladung:",e);return""}
 }

 /* ---------- sharing ---------- */
 async function share({title,text,url,file}){
  const data={title,text,url};
  if(file&&navigator.canShare?.({files:[file]})){
   try{await navigator.share({...data,files:[file]});return"shared"}
   catch(e){if(e?.name==="AbortError")return"aborted"}
  }
  if(navigator.share){
   try{await navigator.share(data);return"shared"}
   catch(e){if(e?.name==="AbortError")return"aborted"}
  }
  try{await navigator.clipboard.writeText(`${text}\n${url}`);say("Link kopiert – jetzt in WhatsApp oder Instagram einfügen.");return"copied"}catch(e){}
  if(file){const a=document.createElement("a");a.href=URL.createObjectURL(file);a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);say("Bild gespeichert. Link: "+url);return"downloaded"}
  say(url);return"shown"
 }
 async function shareInvite(){
  const code=await myCode();
  if(!code)return say("Einladungslink noch nicht verfügbar. Startelf und Bank müssen vollständig sein und Footera online.");
  return share({title:"Footera",text:`Spiel Footera mit mir! Mein Freundescode: ${prettyCode(code)} ⚽`,url:inviteUrl(code,"invite")})
 }

 /* ---------- share picture of the pulled card ---------- */
 function loadImage(src,cors=true){
  return new Promise(resolve=>{
   if(!src)return resolve(null);
   const img=new Image();
   if(cors&&!/^(data|blob):/.test(src)&&new URL(src,location.href).origin!==location.origin)img.crossOrigin="anonymous";
   img.decoding="async";img.onload=()=>resolve(img.naturalWidth?img:null);img.onerror=()=>resolve(null);
   img.src=src;setTimeout(()=>resolve(null),6000)
  })
 }
 const cssUrls=v=>[...String(v||"").matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m=>m[1]);
 function drawFit(ctx,img,x,y,w,h,fit){
  if(fit!=="cover"&&fit!=="contain"){ctx.drawImage(img,x,y,w,h);return}
  const s=(fit==="cover"?Math.max:Math.min)(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*s,dh=img.naturalHeight*s;
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);ctx.restore()
 }
 const SVG_PROPS=["fill","stroke","stroke-width","opacity","fill-opacity","stroke-opacity","stop-color","stop-opacity"];
 async function svgImage(svg){
  const clone=svg.cloneNode(true),src=[svg,...svg.querySelectorAll("*")],dst=[clone,...clone.querySelectorAll("*")];
  src.forEach((el,i)=>{const cs=getComputedStyle(el);dst[i].setAttribute("style",SVG_PROPS.map(p=>`${p}:${cs.getPropertyValue(p)}`).join(";"))});
  clone.setAttribute("xmlns","http://www.w3.org/2000/svg");
  const r=svg.getBoundingClientRect();clone.setAttribute("width",r.width);clone.setAttribute("height",r.height);
  return loadImage("data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(clone)),false)
 }
 // Photos from other hosts only reach the canvas with CORS; try the card's fallback sources too.
 async function corsCopy(el){
  let list=[];try{list=JSON.parse(el.dataset.candidates||"[]")}catch(e){}
  for(const src of [...new Set([el.currentSrc||el.src,...list])].filter(Boolean).slice(0,4)){const img=await loadImage(src);if(img)return img}
  return null
 }
 function transformText(t,mode){return mode==="uppercase"?t.toUpperCase():mode==="lowercase"?t.toLowerCase():t}
 // Draws the card exactly as the page laid it out: frame and portrait images, inline SVG ornaments and text.
 async function drawCard(ctx,card,x,y,width){
  const box=card.getBoundingClientRect(),s=width/box.width;
  const at=r=>[x+(r.left-box.left)*s,y+(r.top-box.top)*s,r.width*s,r.height*s];
  const hidden=new Set();
  for(const el of [card,...card.querySelectorAll("*")]){
   if([...hidden].some(h=>h.contains(el)))continue;
   const cs=getComputedStyle(el);
   if(cs.display==="none"||cs.visibility==="hidden"||Number(cs.opacity)===0){hidden.add(el);continue}
   const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
   const [rx,ry,rw,rh]=at(r);
   ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,Number(cs.opacity)||1));
   for(const src of cssUrls(cs.backgroundImage)){const img=await loadImage(new URL(src,location.href).href);if(img)drawFit(ctx,img,rx,ry,rw,rh,cs.backgroundSize==="cover"?"cover":cs.backgroundSize==="contain"?"contain":"fill")}
   if(el.tagName==="IMG"&&el.naturalWidth){const img=await corsCopy(el);if(img)drawFit(ctx,img,rx,ry,rw,rh,cs.objectFit)}
   if(el instanceof SVGSVGElement){hidden.add(el);const img=await svgImage(el);if(img)ctx.drawImage(img,rx,ry,rw,rh)}
   for(const node of el.childNodes){
    const raw=node.nodeType===3?node.textContent.replace(/\s+/g," ").trim():"";if(!raw)continue;
    const range=document.createRange();range.selectNodeContents(node);const tr=range.getBoundingClientRect();if(!tr.width)continue;
    const [tx,ty,tw,th]=at(tr),size=parseFloat(cs.fontSize)*s;
    ctx.font=`${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    try{ctx.letterSpacing=(parseFloat(cs.letterSpacing)||0)*s+"px"}catch(e){}
    ctx.fillStyle=cs.color;ctx.textAlign="center";ctx.textBaseline="middle";
    if(cs.textShadow&&cs.textShadow!=="none"){ctx.shadowColor="rgba(0,0,0,.55)";ctx.shadowBlur=4*s}
    ctx.fillText(transformText(raw,cs.textTransform),tx+tw/2,ty+th/2,tw*1.04)
   }
   ctx.restore()
  }
 }
 const THEMES={icon:["#f4f7ff","#5d6c96"],totw:["#ffd25a","#3a2a06"],special:["#57ffe3","#2a1658"],gold:["#d8ff3e","#123a2a"],founder:["#f2d696","#063f3e"]};
 async function renderSharePicture({item,label}){
  const base=typeof displayBase==="function"?displayBase(item):null;
  if(!base||typeof cardHTML!=="function")return null;
  const host=document.createElement("div");
  host.className="footera-share-stage";host.setAttribute("aria-hidden","true");
  host.innerHTML=cardHTML(base,item);
  document.body.append(host);
  try{
   const card=host.firstElementChild;if(!card)return null;
   host.querySelectorAll("img").forEach(img=>{img.loading="eager";if(img.dataset.pendingSrc&&!img.getAttribute("src")){img.src=img.dataset.pendingSrc;img.style.display=""}});
   await Promise.all([...host.querySelectorAll("img")].map(img=>img.complete?0:new Promise(r=>{img.addEventListener("load",r,{once:true});img.addEventListener("error",r,{once:true});setTimeout(r,5000)})));
   try{await document.fonts?.ready}catch(e){}
   const W=1080,H=1920,canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
   const ctx=canvas.getContext("2d"),theme=typeof packRevealTheme==="function"?packRevealTheme(item):"gold",[accent,deep]=THEMES[theme]||THEMES.gold;
   const bg=ctx.createRadialGradient(W/2,H*.44,40,W/2,H*.44,H*.75);bg.addColorStop(0,deep);bg.addColorStop(1,"#030605");
   ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
   const stadium=await loadImage("./assets/footera/stadion.webp");
   if(stadium){ctx.globalAlpha=.22;drawFit(ctx,stadium,0,0,W,H,"cover");ctx.globalAlpha=1}
   ctx.save();ctx.translate(W/2,H*.44);for(let i=0;i<14;i++){ctx.rotate(Math.PI/7);ctx.fillStyle=i%2?accent+"14":accent+"08";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-90,-H);ctx.lineTo(90,-H);ctx.fill()}ctx.restore();
   const emblem=await loadImage("./assets/footera/emblem.png");
   if(emblem)ctx.drawImage(emblem,W/2-70,96,140,140);
   ctx.textAlign="center";ctx.textBaseline="alphabetic";ctx.fillStyle="#fff";
   ctx.font="900 54px Inter,system-ui,sans-serif";try{ctx.letterSpacing="14px"}catch(e){}
   ctx.fillText("FOOTERA",W/2+7,300);
   ctx.fillStyle=accent;ctx.font="900 84px Inter,system-ui,sans-serif";try{ctx.letterSpacing="6px"}catch(e){}
   ctx.fillText(String(label||"WALKOUT").toUpperCase(),W/2+3,430,W-120);
   try{ctx.letterSpacing="0px"}catch(e){}
   const cw=700,cx=(W-cw)/2,cy=500;
   const glow=ctx.createRadialGradient(W/2,cy+cw*.72,40,W/2,cy+cw*.72,cw*.95);glow.addColorStop(0,accent+"55");glow.addColorStop(1,accent+"00");
   ctx.fillStyle=glow;ctx.fillRect(0,cy-200,W,cw*1.9);
   try{await drawCard(ctx,card,cx,cy,cw)}catch(e){console.warn("Footera Teilen-Bild:",e)}
   ctx.fillStyle="#fff";ctx.font="800 50px Inter,system-ui,sans-serif";
   ctx.fillText([base.name,base.team].filter(Boolean).join(" · ").slice(0,48),W/2,1660,W-120);
   ctx.fillStyle="#ffffffb0";ctx.font="600 34px Inter,system-ui,sans-serif";
   ctx.fillText("Kostenlos spielen · BUILD YOUR ERA",W/2,1735,W-120);
   ctx.fillStyle=accent;ctx.font="700 32px Inter,system-ui,sans-serif";
   ctx.fillText(gameUrl().host+gameUrl().pathname.replace(/\/$/,""),W/2,1800,W-120);
   const blob=await new Promise(r=>{try{canvas.toBlob(r,"image/png")}catch(e){r(null)}});
   if(!blob)return null;
   const slug=String(base.name||"karte").normalize("NFD").replace(/[^\w]+/g,"-").replace(/^-|-$/g,"").toLowerCase()||"karte";
   return new File([blob],`footera-${slug}.png`,{type:"image/png"})
  }finally{host.remove()}
 }
 function shareText({item,label,mode}){
  const base=typeof displayBase==="function"?displayBase(item):null,rating=typeof itemRating==="function"?itemRating(item):0;
  const what=mode==="double"?"Double Walkout":mode==="walkout"?"Walkout":label||"Spezialkarte";
  return`${what}! ${base?.name||"Neue Karte"}${rating?` (${rating})`:""} in meinem Footera-Pack 🔥 Kannst du das toppen?`
 }
 function preparePack(meta){
  const box=document.getElementById("resultShare");
  shareMeta=meta&&meta.item?meta:null;shareJob=null;
  if(!box)return;
  if(!shareMeta){box.hidden=true;box.innerHTML="";return}
  const base=typeof displayBase==="function"?displayBase(shareMeta.item):null;
  box.hidden=false;
  box.innerHTML=`<div class="result-share-text"><strong>${escText(shareMeta.mode==="double"?"Double Walkout":shareMeta.mode==="walkout"?"Walkout":shareMeta.label||"Top-Karte")}: ${escText(base?.name||"")}</strong><span>Teile deinen Zug als Bild in deiner Story oder per WhatsApp.</span></div><button type="button" class="primary" id="resultShareBtn">Teilen</button>`;
  // Prepare picture and invite code now: the share sheet must open right after the tap.
  const meta2=shareMeta;
  shareJob=Promise.all([renderSharePicture(meta2).catch(e=>{console.warn(e);return null}),myCode(6000)]);
 }
 async function sharePack(){
  if(!shareMeta)return;
  const meta=shareMeta,btn=document.getElementById("resultShareBtn");
  if(btn){btn.disabled=true;btn.textContent="Wird vorbereitet …"}
  try{
   const [file,code]=await(shareJob||Promise.resolve([null,""]));
   const result=await share({title:"Footera",text:shareText(meta),url:inviteUrl(code,meta.mode==="walkout"||meta.mode==="double"?"walkout":"pack"),file});
   if(result==="shared")say("Danke fürs Teilen!")
  }finally{if(btn){btn.disabled=false;btn.textContent="Teilen"}}
 }

 /* ---------- invite links ---------- */
 function captureInvite(){
  try{
   const u=new URL(location.href),raw=u.searchParams.get("invite");
   if(raw===null)return;
   const code=normCode(raw);
   if(CODE.test(code))write(INVITE_KEY,JSON.stringify({code,at:Date.now()}));
   u.searchParams.delete("invite");
   history.replaceState(history.state,"",u.pathname+u.search+u.hash)
  }catch(e){}
 }
 function pendingInvite(){
  try{const p=JSON.parse(read(INVITE_KEY)||"null");if(p&&CODE.test(p.code)&&Date.now()-p.at<INVITE_DAYS*864e5)return p}catch(e){}
  erase(INVITE_KEY);return null
 }
 let inviteRunning=false;
 async function acceptInvite(){
  const invite=pendingInvite(),online=window.FooteraOnline;
  if(!invite||inviteRunning||!online?.available||typeof storeFriendProfile!=="function")return;
  inviteRunning=true;
  try{
   await online.init();
   if(!online.ready)return;
   const friend=await online.resolveFriendCode(invite.code);
   if(!friend){erase(INVITE_KEY);say("Einladungslink ist nicht mehr gültig.");return}
   const result=storeFriendProfile(friend,{quiet:true});
   erase(INVITE_KEY);
   if(result==="saved")say(`Einladung angenommen: ${friend.clubName||friend.username||"Dein Freund"} ist jetzt in deiner Freundesliste.`)
  }catch(e){console.warn("Footera Einladung:",e)}
  finally{inviteRunning=false}
 }

 /* ---------- add to home screen ---------- */
 function standalone(){return typeof pwaStandalone==="function"?pwaStandalone():window.matchMedia?.("(display-mode: standalone)")?.matches||navigator.standalone===true}
 function isIos(){return/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)}
 function hintState(){try{return JSON.parse(read(HINT_KEY)||"{}")||{}}catch(e){return{}}}
 function closeHint(never){
  document.getElementById("footeraInstallHint")?.remove();
  const s=hintState();write(HINT_KEY,JSON.stringify({count:(s.count||0)+1,at:Date.now(),never:!!never||!!s.never}))
 }
 function showInstallHint(force=false){
  if(standalone()||hintShown&&!force||document.getElementById("footeraInstallHint"))return false;
  const s=hintState();
  if(!force&&(s.never||(s.count||0)>=HINT_MAX||Date.now()-(s.at||0)<HINT_PAUSE_DAYS*864e5))return false;
  hintShown=true;
  const canPrompt=typeof deferredInstallPrompt!=="undefined"&&!!deferredInstallPrompt;
  const how=canPrompt?"Ein Tipp, und Footera liegt als App auf deinem Startbildschirm – mit Vollbild und schnellerem Start."
   :isIos()?"Tippe in Safari unten auf <b>Teilen</b> <span class=\"install-hint-icon\" aria-hidden=\"true\">⬆︎</span> und dann auf <b>„Zum Home-Bildschirm“</b>."
   :"Öffne das Browser-Menü <b>⋮</b> und wähle <b>„App installieren“</b> oder <b>„Zum Startbildschirm hinzufügen“</b>.";
  const el=document.createElement("section");
  el.id="footeraInstallHint";el.className="install-hint";el.setAttribute("role","dialog");el.setAttribute("aria-label","Footera zum Startbildschirm hinzufügen");
  el.innerHTML=`<img src="./icon-192.png" alt="" width="48" height="48"><div class="install-hint-body"><strong>Footera als App</strong><p>${how}</p><div class="install-hint-actions">${canPrompt?'<button type="button" class="primary" data-install-hint="install">Installieren</button>':""}<button type="button" class="secondary" data-install-hint="later">${canPrompt?"Später":"Verstanden"}</button><button type="button" class="install-hint-never" data-install-hint="never">Nicht mehr zeigen</button></div></div>`;
  el.addEventListener("click",async e=>{
   const b=e.target.closest("[data-install-hint]");if(!b)return;
   if(b.dataset.installHint==="install"){closeHint(false);if(typeof triggerPwaInstall==="function")await triggerPwaInstall();return}
   closeHint(b.dataset.installHint==="never")
  });
  document.body.append(el);return true
 }
 function afterPack(){
  const packs=typeof state!=="undefined"?Number(state.stats?.packs||0):0;
  if(packs>=1)setTimeout(()=>showInstallHint(),900)
 }

 function start(){
  acceptInvite();
  window.addEventListener("online",acceptInvite)
 }
 captureInvite();
 document.addEventListener("click",e=>{
  if(e.target.closest("#resultShareBtn")){sharePack();return}
  if(e.target.closest("#shareInviteLink")){shareInvite()}
 });
 window.FooteraShare={inviteUrl,share,shareInvite,preparePack,sharePack,renderSharePicture,acceptInvite,pendingInvite,showInstallHint,afterPack,start};
})();
