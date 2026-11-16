/* Footera V21.440 — Karten zum Anfassen.
   Große Karten (Spielerprofil, Pack-Reveal, Spielervergleich, Picks) lassen sich mit dem Finger
   oder der Maus neigen; Licht und Glanz wandern mit. Sonderkarten bekommen einen Holo-Schimmer,
   Icons einen goldenen Glanz. Beim Erscheinen läuft einmal ein Lichtstreifen über die Karte.
   Auf Android neigt sich die offene Profilkarte leicht mit dem Handy.
   Nur Optik: kein Spielstand, keine Käufe, keine Online-Daten.
   Abschalten: localStorage footera-card-shine=0. Respektiert "Bewegung reduzieren". */
(()=>{
 if(window.FooteraCardShine)return;
 const ROOTS="#bioModal .bio-hero-card,#bioModal .bio-card,#reveal .reveal-cards,.pc-card,.pick-option.revealed,.founder-result-card";
 const MAX_TILT=13,MIN_WIDTH=110;
 let off=false;
 try{off=localStorage.getItem("footera-card-shine")==="0"}catch(_){}
 const reduced=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
 const SPECIAL_SKIP=/\b(gold|silver|bronze)\b/;

 function finish(shell){
  const card=shell.querySelector(":scope > .custom-card");
  if(!card)return"plain";
  const c=card.className;
  if(/\bicon\b/.test(c))return"icon";
  if(/\bfounder\b/.test(c))return"plain";
  if(SPECIAL_SKIP.test(c))return /\bbase-rare\b/.test(c)?"rare":"plain";
  return"holo"
 }
 function host(shell){
  return shell.querySelector(":scope > .custom-card")||null
 }
 function eligible(shell){
  if(!shell||off)return false;
  if(shell.closest(".mini,[data-card-shine-off],.fh3d"))return false;
  if(!shell.closest(ROOTS))return false;
  if(!host(shell))return false;
  return shell.getBoundingClientRect().width>=MIN_WIDTH
 }
 function prepare(shell){
  const h=host(shell);if(!h)return null;
  let glare=h.querySelector(":scope > .fcs-glare");
  if(!glare){
   glare=document.createElement("i");glare.className="fcs-glare";glare.setAttribute("aria-hidden","true");
   glare.innerHTML='<b class="fcs-foil"></b><b class="fcs-light"></b><b class="fcs-sweep"></b>';
   h.appendChild(glare)
  }
  // Die Kartenform kommt aus dem Rahmenbild (Transparenz). Der Glanz nimmt dieselbe Form an,
  // damit nie ein Rechteck über den Rand hinausleuchtet. Ohne Rahmenbild nur Neigen, kein Glanz.
  if(!glare.dataset.masked){
   const cs=getComputedStyle(h),urls=String(cs.backgroundImage||"").match(/url\([^)]*\)/g);
   const url=urls&&urls[urls.length-1];
   if(url){
    const size=String(cs.backgroundSize||"100% 100%").split(",").pop().trim(),pos=String(cs.backgroundPosition||"center").split(",").pop().trim();
    for(const k of["maskImage","webkitMaskImage"])glare.style[k]=url;
    for(const k of["maskSize","webkitMaskSize"])glare.style[k]=size;
    for(const k of["maskPosition","webkitMaskPosition"])glare.style[k]=pos;
    for(const k of["maskRepeat","webkitMaskRepeat"])glare.style[k]="no-repeat";
    glare.dataset.masked="1"
   }else glare.dataset.masked="none"
  }
  shell.dataset.shine=finish(shell);
  const wrap=shell.parentElement;
  if(wrap&&!wrap.classList.contains("fcs-tilt"))wrap.classList.add("fcs-tilt");
  return{shell,wrap,glare}
 }
 function apply(t,nx,ny,live){
  if(!t||!t.wrap)return;
  const rx=(-ny*MAX_TILT).toFixed(2),ry=(nx*MAX_TILT).toFixed(2);
  const s=t.wrap.style;
  s.setProperty("--fcs-rx",rx+"deg");s.setProperty("--fcs-ry",ry+"deg");
  s.setProperty("--fcs-gx",(50+nx*50).toFixed(1)+"%");s.setProperty("--fcs-gy",(50+ny*50).toFixed(1)+"%");
  s.setProperty("--fcs-hx",(50+nx*35).toFixed(1)+"%");s.setProperty("--fcs-hy",(50+ny*35).toFixed(1)+"%");
  s.setProperty("--fcs-amt",Math.min(1,Math.hypot(nx,ny)).toFixed(3));
  t.wrap.classList.toggle("fcs-live",!!live);
  t.wrap.classList.add("fcs-on")
 }
 function rest(t){
  if(!t||!t.wrap)return;
  t.wrap.classList.remove("fcs-live","fcs-on");
  const s=t.wrap.style;s.setProperty("--fcs-rx","0deg");s.setProperty("--fcs-ry","0deg");s.setProperty("--fcs-amt","0")
 }

 /* ---------- Finger / Maus ---------- */
 let active=null,pending=null,raf=0;
 function pointFor(shell,e){
  const r=shell.getBoundingClientRect();
  const nx=Math.max(-1,Math.min(1,((e.clientX-r.left)/r.width)*2-1));
  const ny=Math.max(-1,Math.min(1,((e.clientY-r.top)/r.height)*2-1));
  return[nx,ny]
 }
 function flush(){raf=0;if(!pending)return;const [t,nx,ny]=pending;pending=null;apply(t,nx,ny,true)}
 function onMove(e){
  if(off||reduced)return;
  const shell=e.target&&e.target.closest?e.target.closest(".card-shell"):null;
  if(!shell||(active&&active.shell!==shell)){if(active&&e.pointerType==="mouse"){rest(active);active=null}if(!shell)return}
  if(!active){if(!eligible(shell))return;active=prepare(shell);if(!active)return}
  const [nx,ny]=pointFor(shell,e);
  pending=[active,nx,ny];if(!raf)raf=requestAnimationFrame(flush)
 }
 function onEnd(e){
  if(!active)return;
  if(e.type==="pointerout"&&e.pointerType==="mouse"){const to=e.relatedTarget;if(to&&active.shell.contains(to))return}
  if(e.type==="pointerout"&&e.pointerType!=="mouse")return;
  const t=active;active=null;pending=null;rest(t)
 }
 document.addEventListener("pointermove",onMove,{passive:true});
 document.addEventListener("pointerdown",onMove,{passive:true});
 for(const ev of["pointerup","pointercancel","pointerout"])document.addEventListener(ev,onEnd,{passive:true});

 /* ---------- Lichtstreifen beim Erscheinen ---------- */
 const swept=new WeakSet();
 function sweep(shell,delay=0){
  if(off||reduced||!shell||swept.has(shell)||!eligible(shell))return;
  const t=prepare(shell);if(!t)return;swept.add(shell);
  setTimeout(()=>{t.glare.classList.remove("fcs-sweeping");void t.glare.offsetWidth;t.glare.classList.add("fcs-sweeping");setTimeout(()=>t.glare.classList.remove("fcs-sweeping"),1500)},delay)
 }
 function scan(root,delay){if(!root)return;for(const shell of root.querySelectorAll(".card-shell"))sweep(shell,delay)}
 function watch(id,delay,when){
  const el=document.getElementById(id);if(!el||!window.MutationObserver)return;
  let timer=0;
  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!when||when())scan(el,delay)},60)}).observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]})
 }

 /* ---------- Handy-Neigung (nur wo ohne Nachfrage erlaubt, also Android) ---------- */
 let gyroTarget=null,base=null,gx=0,gy=0,gyroOn=false,gyroRaf=0;
 const gyroAllowed=typeof DeviceOrientationEvent!=="undefined"&&typeof DeviceOrientationEvent.requestPermission!=="function"&&/Android/i.test(navigator.userAgent||"");
 function currentGyroTarget(){
  const bio=document.getElementById("bioModal");
  if(bio&&bio.classList.contains("active")){const s=bio.querySelector(".bio-hero-card .card-shell,.bio-card .card-shell");if(s&&eligible(s))return s}
  return null
 }
 function onOrient(e){
  if(active||e.beta==null||e.gamma==null)return;
  if(!gyroTarget)return;
  if(!base)base={b:e.beta,g:e.gamma};
  // Langsam nachziehen, damit sich die Karte nicht dauerhaft schief anfühlt.
  base.b+=(e.beta-base.b)*.015;base.g+=(e.gamma-base.g)*.015;
  const tx=Math.max(-1,Math.min(1,(e.gamma-base.g)/18)),ty=Math.max(-1,Math.min(1,(e.beta-base.b)/18));
  gx+=(tx-gx)*.25;gy+=(ty-gy)*.25;
  if(!gyroRaf)gyroRaf=requestAnimationFrame(()=>{gyroRaf=0;const t=gyroTarget&&prepare(gyroTarget);if(t)apply(t,gx*.75,gy*.75,false)})
 }
 function syncGyro(){
  if(off||reduced||!gyroAllowed)return;
  const next=currentGyroTarget();
  if(next===gyroTarget)return;
  if(gyroTarget&&!next){const t=prepare(gyroTarget);rest(t)}
  gyroTarget=next;base=null;gx=gy=0;
  if(next&&!gyroOn){window.addEventListener("deviceorientation",onOrient,{passive:true});gyroOn=true}
  if(!next&&gyroOn){window.removeEventListener("deviceorientation",onOrient);gyroOn=false}
 }

 function start(){
  if(off)return;
  document.documentElement.classList.add("fcs-ready");
  if(reduced)return;
  watch("bioDetailBody",120);
  watch("reveal",650,()=>document.getElementById("reveal")?.classList.contains("active"));
  watch("playerCompareBody",120);
  const bio=document.getElementById("bioModal");
  if(bio&&window.MutationObserver)new MutationObserver(syncGyro).observe(bio,{attributes:true,attributeFilter:["class"]});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
 window.FooteraCardShine={version:"V21.440",finish,eligible,sweep,apply:(shell,nx,ny)=>{const t=eligible(shell)&&prepare(shell);if(t)apply(t,nx,ny,false);return!!t},rest:shell=>{const t=shell&&prepare(shell);rest(t)},disabled:()=>off};
})();
