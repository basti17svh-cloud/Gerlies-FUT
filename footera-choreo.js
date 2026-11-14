// V21.427 Fan-Choreo: design your own fan choreography (tifo) in the club identity ("Choreo" tab).
// Your fans pull it up over the main stand during the 3D walk-out of every home match: motif, colours,
// banner text, crest and stars. Without any setup the fans show a default choreo in the club colours,
// so it appears right away; it can be switched off in the tab.
// Device-local (localStorage footera-choreo-v1) only: the save, purchases and online data stay untouched.
(function(root){
 "use strict";
 const KEY="footera-choreo-v1";
 const MOTIFS=Object.freeze({stripes:"Streifen",split:"Halb & halb",checker:"Schachbrett",sun:"Sonne",waves:"Wellen",crest:"Riesenwappen"});
 const SUGGEST=Object.freeze(["{CLUB}","NUR DER {SHORT}","WIR SIND {SHORT}","BUILD YOUR ERA","BIS ZUM SCHLUSS","EINE LIEBE","NIE ALLEIN","AUF GEHT'S, {SHORT}!","UNSER VEREIN · UNSER STOLZ","HEUTE ZÄHLT NUR DER SIEG"]);
 const TOPS=Object.freeze(["BUILD YOUR ERA","SEIT {YEAR}","DIE KURVE IST DA","FÜR IMMER {SHORT}","EIN LEBEN LANG",""]);
 const hexOk=v=>/^#[0-9a-f]{6}$/i.test(String(v||""));
 const cleanText=(v,max)=>String(v??"").replace(/[<>]/g,"").replace(/\s+/g," ").trim().toUpperCase().slice(0,max);
 const escText=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

 /* ---------- club data (read-only) ---------- */
 function identity(){try{return typeof clubIdentitySnapshot==="function"?clubIdentitySnapshot():null}catch(e){return null}}
 function clubNames(){
  let club="",short="";
  try{const p=root.state?.profile||(typeof state!=="undefined"?state.profile:null);club=String(p?.clubName||"");short=String(p?.clubShortName||"")}catch(e){}
  club=cleanText(club||"Footera Club",30);short=cleanText(short||club.split(" ").filter(Boolean).pop()||"FTR",12);
  return{club,short};
 }
 function defaults(id=identity()){
  const kit=id?.kits?.home||{};
  return{on:true,motif:"stripes",a:hexOk(kit.shirtPrimary)?kit.shirtPrimary:"#d8ff3e",b:hexOk(kit.shirtSecondary)?kit.shirtSecondary:"#173627",ink:"#ffffff",text:"",top:"BUILD YOUR ERA",crest:true,stars:3};
 }
 function clean(v,base=defaults()){
  const s=v&&typeof v==="object"?v:{};
  return{on:s.on===undefined?base.on:s.on!==false,motif:MOTIFS[s.motif]?s.motif:base.motif,
   a:hexOk(s.a)?s.a:base.a,b:hexOk(s.b)?s.b:base.b,ink:hexOk(s.ink)?s.ink:base.ink,
   text:s.text===undefined?base.text:cleanText(s.text,26),top:s.top===undefined?base.top:cleanText(s.top,28),
   crest:s.crest===undefined?base.crest:s.crest!==false,stars:[0,1,2,3].includes(Number(s.stars))?Number(s.stars):base.stars};
 }
 /* ---------- storage ---------- */
 function stored(){try{const v=JSON.parse(localStorage.getItem(KEY)||"null");return v&&typeof v==="object"?v:null}catch(e){return null}}
 function read(){return clean(stored())}
 function save(spec){const v=clean(spec);try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}return v}
 function fillNames(text,names=clubNames()){return cleanText(String(text||"").replace(/\{CLUB\}/g,names.club).replace(/\{SHORT\}/g,names.short).replace(/\{YEAR\}/g,"2026"),30)}
 // What the 3D walk-out shows: only at your own ground, only when switched on.
 function forMatch(match){
  if(!match||match.venue==="away"||match.mode==="friend_online")return null;
  const s=read();if(!s.on)return null;
  const names=clubNames();
  return{motif:s.motif,a:s.a,b:s.b,ink:s.ink,text:fillNames(s.text,names)||names.club,top:fillNames(s.top,names),crest:s.crest,stars:s.stars};
 }

 /* ---------- drawing (shared by the editor preview, the share picture and the 3D tifo) ---------- */
 function mixHex(a,b,t){const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),x=p(a),y=p(b);return"#"+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,"0")).join("")}
 function luminance(h){const [r,g,b]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);return .2126*r+.7152*g+.0722*b}
 function drawStar(ctx,x,y,r){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}ctx.closePath();ctx.fill()}
 function fitFont(ctx,text,weight,start,min,maxWidth){let size=start;ctx.font=`italic ${weight} ${size}px system-ui,Arial,sans-serif`;while(size>min&&ctx.measureText(text).width>maxWidth){size-=2;ctx.font=`italic ${weight} ${size}px system-ui,Arial,sans-serif`}return size}
 function background(ctx,w,h,s){
  const {a,b}=s;ctx.fillStyle=a;ctx.fillRect(0,0,w,h);ctx.fillStyle=b;
  if(s.motif==="stripes"){for(let i=1;i<12;i+=2)ctx.fillRect(i*w/12,0,w/12+1,h)}
  else if(s.motif==="split"){ctx.beginPath();ctx.moveTo(w*.58,0);ctx.lineTo(w,0);ctx.lineTo(w,h);ctx.lineTo(w*.42,h);ctx.closePath();ctx.fill()}
  else if(s.motif==="checker"){const n=16,m=Math.round(n*h/w)||5,cw=w/n,ch=h/m;for(let x=0;x<n;x++)for(let y=0;y<m;y++)if((x+y)%2)ctx.fillRect(x*cw,y*ch,cw+1,ch+1)}
  else if(s.motif==="sun"){const cx=w/2,cy=h*.52,R=w;for(let i=0;i<24;i+=2){const a0=i*Math.PI/12,a1=(i+1)*Math.PI/12;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a0)*R,cy+Math.sin(a0)*R);ctx.lineTo(cx+Math.cos(a1)*R,cy+Math.sin(a1)*R);ctx.closePath();ctx.fill()}}
  else if(s.motif==="waves"){const bands=6;for(let k=0;k<bands;k+=2){ctx.beginPath();const y0=k*h/bands,y1=(k+1)*h/bands;ctx.moveTo(0,y0);for(let x=0;x<=w;x+=8)ctx.lineTo(x,y0+Math.sin(x/w*Math.PI*6)*h*.035);for(let x=w;x>=0;x-=8)ctx.lineTo(x,y1+Math.sin(x/w*Math.PI*6)*h*.035);ctx.closePath();ctx.fill()}}
  else if(s.motif==="crest"){ctx.fillRect(0,0,w*.1,h);ctx.fillRect(w*.9,0,w*.1,h);ctx.fillStyle=mixHex(a,"#000000",.18);ctx.fillRect(w*.1,0,w*.012,h);ctx.fillRect(w*.888,0,w*.012,h)}
 }
 // spec: cleaned choreo with names filled in. crest: a decoded crest image (or null).
 function draw(ctx,w,h,spec,crest=null){
  const s=clean(spec,{...defaults(null),text:"FOOTERA"}),text=cleanText(s.text,30)||"FOOTERA",top=cleanText(s.top,30);
  ctx.save();ctx.clearRect(0,0,w,h);background(ctx,w,h,s);
  const big=s.motif==="crest";
  // The walk-out shot sees about the middle third of the stand: text and crest stay there.
  if(!big){ctx.fillStyle="rgba(0,0,0,.24)";ctx.fillRect(0,h*.34,w,h*.3)}
  const ink=s.ink,outline=luminance(ink)>.55?"rgba(0,0,0,.55)":"rgba(255,255,255,.55)";
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.lineJoin="round";
  const crestOk=s.crest&&crest&&crest.naturalWidth!==0;
  if(big&&crestOk){const ch=h*.62,cw=ch*200/220;ctx.drawImage(crest,w/2-cw/2,h*.07,cw,ch)}
  const mainY=big?h*.83:h*.49,mainMax=big?w*.62:crestOk?w*.42:w*.52;
  const size=fitFont(ctx,text,900,big?60:96,26,mainMax);
  ctx.lineWidth=Math.max(3,size*.09);ctx.strokeStyle=outline;ctx.strokeText(text,w/2,mainY);ctx.fillStyle=ink;ctx.fillText(text,w/2,mainY);
  if(!big&&crestOk){const ch=h*.34,cw=ch*200/220,half=Math.min(ctx.measureText(text).width/2,mainMax/2);for(const side of[-1,1])ctx.drawImage(crest,w/2+side*(half+cw*.75)-cw/2,mainY-ch/2,cw,ch)}
  ctx.fillStyle=ink;
  if(top&&!big){fitFont(ctx,top,800,28,14,w*.5);ctx.font=ctx.font.replace("italic ","");ctx.globalAlpha=.94;ctx.fillText(top,w/2,h*.255);ctx.globalAlpha=1}
  if(s.stars){const r=big?11:15,gap=r*2.6,y=big?h*.06+2:top?h*.12:h*.22;for(let i=0;i<s.stars;i++)drawStar(ctx,w/2+(i-(s.stars-1)/2)*gap,y,r)}
  // Thousands of held-up cards: a faint grid sells it as a real choreo.
  ctx.globalAlpha=.11;ctx.fillStyle="#000";const step=Math.max(6,Math.round(w/150));
  for(let x=step;x<w;x+=step)ctx.fillRect(x,0,1,h);for(let y=step;y<h;y+=step)ctx.fillRect(0,y,w,1);
  ctx.restore();
 }
 function crestSVG(html){
  const svg=String(html||"").match(/<svg class="club-crest-art"[\s\S]*?<\/svg><\/span>/)?.[0]?.replace(/<\/span>$/,"");if(!svg)return null;
  const vars={};for(const [,k,v] of String(html).matchAll(/--crest-([a-z]+):(#[0-9a-f]{6})/gi))vars[k]=v;
  return svg.replace(/var\(--crest-([a-z]+)\)/g,(m,k)=>vars[k]||"#ffffff");
 }
 const crestCache=new Map();
 function crestImage(html){
  const svg=crestSVG(html);if(!svg||typeof Image==="undefined")return Promise.resolve(null);
  if(!crestCache.has(svg))crestCache.set(svg,new Promise(res=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>res(null);img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg)}));
  return crestCache.get(svg);
 }
 function ownCrestHTML(){const id=identity();try{return id&&root.FooteraCrestArt?.render?root.FooteraCrestArt.render({...id.crest,initials:id.crest?.initials||"F"}):""}catch(e){return""}}

 /* ---------- editor (Verein -> Vereinsidentität -> Choreo) ---------- */
 let rolls=0;
 function panel(){return root.document?.getElementById("identityChoreo")}
 function swatches(){
  const id=identity(),out=[];const push=v=>{if(hexOk(v)&&!out.includes(v.toLowerCase()))out.push(v.toLowerCase())};
  push(id?.kits?.home?.shirtPrimary);push(id?.kits?.home?.shirtSecondary);push(id?.colors?.primary);push(id?.colors?.secondary);push(id?.colors?.accent);
  ["#ffffff","#111111","#c8102e","#0b3d91","#f2c200","#1f7a3a"].forEach(push);return out.slice(0,7);
 }
 function editorHTML(s){
  const names=clubNames(),sw=swatches();
  const colorRow=(key,label)=>`<div class="choreo-color"><span>${label}</span><div class="choreo-swatches">${sw.map(c=>`<button type="button" data-choreo-color="${key}" data-value="${c}" style="--c:${c}" class="${s[key].toLowerCase()===c?"active":""}" aria-label="${label} ${c}"></button>`).join("")}<input type="color" data-choreo-input="${key}" value="${s[key]}" aria-label="${label} frei wählen"></div></div>`;
  return `<div class="choreo-stage" aria-hidden="true"><div class="choreo-roof"></div><div class="choreo-stand"><canvas width="1024" height="320"></canvas></div><div class="choreo-crowd"></div><div class="choreo-pitch"></div></div>
  <label class="choreo-switch"><input type="checkbox" data-choreo-toggle="on" ${s.on?"checked":""}><span>Bei jedem Heimspiel im 3D-Einlauf zeigen</span></label>
  <div class="choreo-label">Motiv</div><div class="choreo-motifs" role="radiogroup" aria-label="Motiv">${Object.entries(MOTIFS).map(([id,label])=>`<button type="button" role="radio" aria-checked="${s.motif===id}" class="${s.motif===id?"active":""}" data-choreo-motif="${id}"><i class="m-${id}" style="--a:${s.a};--b:${s.b}"></i>${label}</button>`).join("")}</div>
  ${colorRow("a","Farbe 1")}${colorRow("b","Farbe 2")}${colorRow("ink","Schrift")}
  <label class="identity-field choreo-text">Spruchband<input data-choreo-input="text" maxlength="26" value="${escText(s.text)}" placeholder="${escText(names.club)}" autocapitalize="characters"></label>
  <div class="choreo-chips">${SUGGEST.map(t=>`<button type="button" data-choreo-suggest="${escText(t)}">${escText(fillNames(t,names))}</button>`).join("")}</div>
  <label class="identity-field choreo-text">Oberzeile<input data-choreo-input="top" maxlength="28" value="${escText(s.top)}" placeholder="leer lassen = keine" autocapitalize="characters"></label>
  <div class="choreo-row"><label class="choreo-switch"><input type="checkbox" data-choreo-toggle="crest" ${s.crest?"checked":""}><span>Wappen zeigen</span></label>
  <label class="choreo-stars">Sterne<select data-choreo-input="stars">${[0,1,2,3].map(n=>`<option value="${n}" ${s.stars===n?"selected":""}>${n}</option>`).join("")}</select></label></div>
  <div class="choreo-actions"><button type="button" class="secondary" data-choreo-action="roll">🎲 Würfeln</button><button type="button" class="secondary" data-choreo-action="reset">Vereinsfarben</button><button type="button" class="primary" data-choreo-action="share">Choreo teilen</button></div>
  <p class="choreo-note">Wird sofort gespeichert. Deine Fans ziehen die Choreo beim Einlauf über die Haupttribüne hoch, nur in deinem Stadion (bei Auswärtsspielen nicht). Nur Optik, am Spiel ändert sich nichts.</p>`;
 }
 let paintToken=0;
 function paint(){
  const host=panel(),canvas=host?.querySelector(".choreo-stage canvas");if(!canvas)return;
  const s=read(),names=clubNames(),spec={...s,text:fillNames(s.text,names)||names.club,top:fillNames(s.top,names)},ctx=canvas.getContext("2d"),token=++paintToken;
  draw(ctx,canvas.width,canvas.height,spec,null);
  if(s.crest)crestImage(ownCrestHTML()).then(img=>{if(img&&token===paintToken)draw(ctx,canvas.width,canvas.height,spec,img)});
  host.querySelector(".choreo-stage")?.classList.toggle("off",!s.on);
 }
 function render(){const host=panel();if(!host)return;host.innerHTML=editorHTML(read());paint()}
 function update(patch,rerender=true){save({...read(),...patch});if(rerender)render();else paint()}
 function roll(){
  rolls++;const keys=Object.keys(MOTIFS),sw=swatches(),seed=Date.now()+rolls*7919,r=n=>Math.floor((Math.sin(seed*(n+1)*12.9898)*43758.5453%1+1)%1*1e6);
  const a=sw[r(1)%Math.min(sw.length,5)],b=sw.filter(c=>c!==a)[r(2)%(sw.length-1)],ink=luminance(a)>.6&&luminance(b)>.6?"#111111":"#ffffff";
  update({motif:keys[r(3)%keys.length],a,b,ink,text:fillNames(SUGGEST[r(4)%SUGGEST.length]),top:TOPS[r(5)%TOPS.length],stars:r(6)%4});
 }
 async function share(btn){
  const s=read(),names=clubNames(),spec={...s,text:fillNames(s.text,names)||names.club,top:fillNames(s.top,names)};
  const c=root.document.createElement("canvas");c.width=1080;c.height=1350;const ctx=c.getContext("2d");
  const g=ctx.createLinearGradient(0,0,0,c.height);g.addColorStop(0,"#06100c");g.addColorStop(1,"#0f2219");ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);
  const t=root.document.createElement("canvas");t.width=1024;t.height=320;draw(t.getContext("2d"),1024,320,spec,s.crest?await crestImage(ownCrestHTML()):null);
  ctx.save();ctx.translate(540,560);ctx.transform(1,0,0,.86,0,0);ctx.drawImage(t,-510,-160,1020,320);ctx.restore();
  ctx.fillStyle="#d8ff3e";ctx.font="900 30px system-ui,Arial";ctx.textAlign="center";ctx.fillText("FAN-CHOREO",540,250);
  ctx.fillStyle="#fff";ctx.font="italic 900 58px system-ui,Arial";ctx.fillText(names.club,540,320);
  for(let i=0;i<260;i++){const x=(i*97)%1080,y=880+((i*53)%300);ctx.fillStyle=i%3?spec.a:spec.b;ctx.globalAlpha=.55;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill()}
  ctx.globalAlpha=1;ctx.fillStyle="#9fb3a9";ctx.font="800 28px system-ui,Arial";ctx.fillText("FOOTERA – BUILD YOUR ERA",540,1260);
  const blob=await new Promise(res=>c.toBlob(res,"image/png"));
  const file=blob&&typeof File==="function"?new File([blob],"footera-choreo.png",{type:"image/png"}):null;
  const fn=root.FooteraShare?.share;
  if(fn)return fn({title:"Footera",text:`Unsere Choreo für ${names.club} 🔥 #Footera`,file});
  if(file){const a=root.document.createElement("a");a.href=URL.createObjectURL(file);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
 }
 // Extras card: straight to the tab.
 function openEditor(){
  const doc=root.document;
  try{if(typeof switchView==="function")switchView("clubView")}catch(e){}
  // The club hub opens its "Vereinsidentität" area through its own (delegated) button.
  const hubButton=doc?.querySelector('[data-club-area="identity"]');
  try{if(hubButton)hubButton.click();else{clubSection="identity";if(typeof makeClubIdentityDraft==="function")clubIdentityDraft=makeClubIdentityDraft();if(typeof renderClub==="function")renderClub()}}catch(e){}
  try{identityTab="choreo";if(typeof syncIdentityTabs==="function")syncIdentityTabs()}catch(e){doc?.querySelector('[data-identity-tab="choreo"]')?.click()}
  syncTab();render();
  doc?.querySelector('.identity-tabs')?.scrollIntoView({block:"start",behavior:"smooth"});
 }
 // The "Vereinsidentität speichern" button has nothing to do in this tab: the choreo saves itself.
 function syncTab(){const doc=root.document;if(!doc)return;const on=!!doc.querySelector('[data-identity-panel="choreo"].active');const btn=doc.getElementById("saveClubIdentity");if(btn)btn.hidden=on;if(on&&!panel()?.childElementCount)render()}
 function bind(){
  const doc=root.document;if(!doc||bind.done)return;bind.done=true;
  doc.addEventListener("click",e=>{
   const t=e.target;if(!t?.closest)return;
   if(t.closest("[data-identity-tab]")){setTimeout(()=>{syncTab();if(doc.querySelector('[data-identity-panel="choreo"].active'))render()},0);return}
   if(t.closest("[data-choreo-open]")){e.preventDefault();openEditor();return}
   if(!t.closest("#identityChoreo"))return;
   const m=t.closest("[data-choreo-motif]");if(m)return update({motif:m.dataset.choreoMotif});
   const c=t.closest("[data-choreo-color]");if(c)return update({[c.dataset.choreoColor]:c.dataset.value});
   const sg=t.closest("[data-choreo-suggest]");if(sg)return update({text:fillNames(sg.dataset.choreoSuggest)});
   const a=t.closest("[data-choreo-action]");if(!a)return;
   if(a.dataset.choreoAction==="roll")roll();
   else if(a.dataset.choreoAction==="reset"){const d=defaults(),s=read();update({a:d.a,b:d.b,ink:d.ink,on:s.on})}
   else if(a.dataset.choreoAction==="share")share(a).catch(()=>{});
  });
  doc.addEventListener("input",e=>{const el=e.target?.closest?.("#identityChoreo [data-choreo-input]");if(!el)return;const k=el.dataset.choreoInput;
   update({[k]:k==="stars"?Number(el.value):el.value},false)});
  doc.addEventListener("change",e=>{const el=e.target?.closest?.("#identityChoreo [data-choreo-toggle]");if(el)update({[el.dataset.choreoToggle]:el.checked},false);
   const inp=e.target?.closest?.("#identityChoreo [data-choreo-input]");if(inp&&inp.type==="color")render()});
  // Club colours or crest may have changed: repaint when the club view is shown again.
  doc.addEventListener("visibilitychange",()=>{if(!doc.hidden&&panel()?.childElementCount)paint()});
 }
 if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",bind,{once:true});else bind()}
 root.FooteraChoreo=Object.freeze({KEY,MOTIFS,SUGGEST,read,save,clean,defaults,forMatch,fillNames,draw,crestImage,render,openEditor});
})(typeof window!=="undefined"?window:globalThis);
