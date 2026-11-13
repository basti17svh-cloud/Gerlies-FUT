// V21.400 Footera Kurier (V21.402 dark mode): after every match a "tomorrow's newspaper" front page about the game.
// Headline, scorers, story, player of the match with his card, Kurier grades and a coach quote. Shareable as a picture.
// Read-only: everything comes from the finished `match` object; nothing in the save changes.
(function(root){
 "use strict";
 const MODAL_ID="newspaperModal",KIND="newspaper";
 const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
 const escText=v=>typeof esc==="function"?esc(v):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const up=v=>String(v||"").toLocaleUpperCase("de-DE");
 // Headlines use the short name for long full names ("Christopher Nkunku" -> "Nkunku").
 const short=v=>{const n=String(v||"").trim(),w=n.split(/\s+/);return w.length>=2&&n.length>14?w.slice(1).join(" "):n};

 // Same match -> same text every time the paper is opened (no random reshuffle).
 function hash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
 const pick=(list,seed,salt="")=>list[hash(seed+"|"+salt)%list.length];

 const MODE_LABELS={rivals:"Division Rivals",champions:"Champions",squad:"Squad Battles",tournament:"Turnier",double:"Doppel-Spieltag","halloween-cup":"Halloween Cup",special:"Event-Spiel",board:"Vorstands-Challenge",walkout:"Walkout-Spiel",plain:"Testspiel","friendly-friend":"Freundschaftsspiel","friendly-random":"Freundschaftsspiel"};
 const MODE_IN={rivals:"in Division Rivals",champions:"in Champions",squad:"in den Squad Battles",tournament:"im Turnier",double:"am Doppel-Spieltag","halloween-cup":"im Halloween Cup",special:"im Event-Spiel",board:"in der Vorstands-Challenge",plain:"im Testspiel"};
 function modeIn(mode){const m=String(mode||"");return MODE_IN[m]||(m.startsWith("friendly")?"im Freundschaftsspiel":"")}
 function modeLabel(mode){const m=String(mode||"");return MODE_LABELS[m]||(m.startsWith("friendly")?"Freundschaftsspiel":"Pflichtspiel")}

 /* ---------- facts from a finished match ---------- */
 // Pure: turns plain match data into facts the story is written from. Exported for tests.
 function facts(d){
  const gh=num(d.gh),ga=num(d.ga),goals=(Array.isArray(d.goals)?d.goals:[]).slice().sort((a,b)=>num(a.minute)-num(b.minute));
  const pensWinner=gh===ga&&d.pensWinner?d.pensWinner:"";
  const result=gh>ga||pensWinner==="home"?"win":gh<ga||pensWinner==="away"?"loss":"draw";
  const homeGoals=goals.filter(g=>g.side==="home"),awayGoals=goals.filter(g=>g.side==="away");
  const count=list=>{const m=new Map();for(const g of list){const k=String(g.scorer||"Spieler");m.set(k,(m.get(k)||0)+1)}return[...m.entries()].sort((a,b)=>b[1]-a[1])};
  const homeScorers=count(homeGoals),awayScorers=count(awayGoals);
  // Running score: was the home side ever behind / ahead?
  let h=0,a=0,trailed=false,led=false,maxDeficit=0;
  for(const g of goals){if(g.side==="home")h++;else a++;if(a>h){trailed=true;maxDeficit=Math.max(maxDeficit,a-h)}if(h>a)led=true}
  const last=goals[goals.length-1]||null;
  const lastWasDecider=last&&(last.side==="home"?(h-1===a&&h>a):(a-1===h&&a>h));
  const lastWasEqualizer=last&&h===a;
  const late=last&&num(last.minute)>=85;
  return{
   home:String(d.home||"Footera Club"),away:String(d.away||"Gegner"),gh,ga,result,mode:String(d.mode||""),
   extraTime:!!d.extraTime,pensWinner,pensHome:num(d.pensHome),pensAway:num(d.pensAway),
   goals,homeScorers,awayScorers,
   hattrick:homeScorers[0]&&homeScorers[0][1]>=3?{name:homeScorers[0][0],goals:homeScorers[0][1]}:null,
   brace:homeScorers[0]&&homeScorers[0][1]===2?{name:homeScorers[0][0]}:null,
   comeback:result==="win"&&trailed,bigComeback:result==="win"&&maxDeficit>=2,blownLead:result==="loss"&&led,
   lateWinner:result==="win"&&!pensWinner&&late&&last.side==="home"&&lastWasDecider?last:null,
   lateEqualizer:result!=="loss"&&gh===ga&&late&&last.side==="home"&&lastWasEqualizer?last:null,
   lateLoss:result==="loss"&&!pensWinner&&late&&last.side==="away"&&lastWasDecider?last:null,
   cleanSheet:ga===0,margin:gh-ga,
   xgHome:num(d.xgHome),xgAway:num(d.xgAway),shotsHome:num(d.shotsHome),shotsAway:num(d.shotsAway),poss:Math.max(25,Math.min(75,Math.round(num(d.poss)||50))),
   redCards:num(d.redCards),potm:d.potm||null,top:Array.isArray(d.top)?d.top:[],low:d.low||null,
   seed:String(d.seed||`${d.home}|${d.away}|${gh}:${ga}|${goals.map(g=>g.minute+g.scorer).join(",")}`)
  };
 }

 /* ---------- story ---------- */
 function score(f){return`${f.gh}:${f.ga}`}
 function headline(f){
  const s=f.seed,H=up(f.home),A=up(f.away);
  if(f.pensWinner==="home")return{kicker:"Elfmeter-Krimi",title:pick(["NERVENSTARK VOM PUNKT!","HELDEN VOM PUNKT!"],s),sub:`${f.home} gewinnt das Elfmeterschießen ${f.pensHome}:${f.pensAway} gegen ${f.away}.`};
  if(f.pensWinner==="away")return{kicker:"Elfmeter-Drama",title:pick(["DRAMA VOM PUNKT!","AUS IM ELFMETERSCHIESSEN"],s),sub:`${f.away} behält im Elfmeterschießen die Nerven: ${f.pensHome}:${f.pensAway}.`};
  if(f.hattrick)return{kicker:f.hattrick.goals>=4?"Viererpack":"Hattrick",title:pick([`${up(short(f.hattrick.name))} SCHIESST ${A} AB!`,f.hattrick.goals>=4?`${f.hattrick.goals} TORE VON ${up(short(f.hattrick.name))}!`:`HATTRICK-HELD ${up(short(f.hattrick.name))}!`,`${up(short(f.hattrick.name))}-SHOW BEIM ${score(f)}!`],s),sub:`${f.hattrick.goals} Tore an einem Abend: ${f.hattrick.name} trifft und trifft gegen ${f.away}.`};
  if(f.bigComeback)return{kicker:"Comeback",title:pick(["DAS WUNDER IST PERFEKT!","WAHNSINNS-COMEBACK!"],s),sub:`${f.home} liegt schon zwei Tore hinten und gewinnt am Ende noch ${score(f)}.`};
  if(f.lateWinner)return{kicker:"Last Minute",title:pick(["LAST-MINUTE-JUBEL!","SPÄTER SIEG, GROSSE GEFÜHLE!",`${up(short(f.lateWinner.scorer))} ERLÖST ${H}!`],s),sub:`${f.lateWinner.scorer} trifft in der ${f.lateWinner.minute}. Minute zum ${score(f)}-Sieg gegen ${f.away}.`};
  if(f.comeback)return{kicker:"Comeback",title:pick([`${H} DREHT DAS SPIEL!`,"RÜCKSTAND? EGAL!"],s),sub:`Erst hinten, dann ${score(f)}: ${f.home} gibt gegen ${f.away} nie auf.`};
  if(f.result==="win"&&f.margin>=4)return{kicker:"Torfestival",title:pick([`TORFESTIVAL! ${score(f)} GEGEN ${A}`,`${A} UNTER DIE RÄDER GEKOMMEN`,`GALA-ABEND BEIM ${score(f)}`],s),sub:`${f.home} lässt ${f.away} keine Chance.`};
  if(f.result==="win"&&f.xgAway>f.xgHome+0.8)return{kicker:"Glück gehört dazu",title:pick(["DREIER TROTZ DRUCK!","GEZITTERT, GEWONNEN!"],s),sub:`${f.away} war oft gefährlicher (xG ${f.xgHome.toFixed(1)}:${f.xgAway.toFixed(1)}), doch ${f.home} gewinnt ${score(f)}.`};
  if(f.result==="win"&&f.cleanSheet)return{kicker:"Zu null",title:pick(["DIE NULL STEHT!",`${H} MAUERT SICH ZUM SIEG`,`${score(f)} – HINTEN DICHT!`],s),sub:`Kein Gegentor gegen ${f.away}, ${f.home} gewinnt ${score(f)}.`};
  if(f.result==="win")return{kicker:"Sieg",title:pick([`${H} SIEGT ${score(f)}!`,`SIEG GEGEN ${A}!`,`${score(f)}! ${H} JUBELT`],s),sub:f.brace?`${f.brace.name} trifft doppelt beim Sieg gegen ${f.away}.`:`Verdienter Erfolg gegen ${f.away}.`};
  if(f.lateEqualizer)return{kicker:"Spätes Glück",title:pick(["PUNKT IN LETZTER SEKUNDE!","AUSGLEICH IN DER NACHSPIELZEIT!"],s),sub:`${f.lateEqualizer.scorer} rettet ${f.home} in der ${f.lateEqualizer.minute}. Minute das ${score(f)}.`};
  if(f.result==="draw"&&f.gh===0)return{kicker:"Remis",title:pick([`NULLNUMMER GEGEN ${A}`,"0:0 – KEINER WILL VERLIEREN"],s),sub:f.xgHome>f.xgAway+0.5?`${f.home} hatte die besseren Chancen, aber kein Tor fällt.`:`Ein zähes Spiel ohne Tore.`};
  if(f.result==="draw")return{kicker:"Remis",title:pick([`PUNKTETEILUNG BEIM ${score(f)}`,`${score(f)} GEGEN ${A}`,"UNENTSCHIEDEN NACH KAMPF"],s),sub:f.goals.length>=6?`Ein Spektakel mit ${f.goals.length} Toren.`:`${f.home} und ${f.away} trennen sich ${score(f)}.`};
  if(f.lateLoss)return{kicker:"Bitter",title:pick([`K.O. IN DER ${f.lateLoss.minute}. MINUTE`,"BITTER! SPÄTES GEGENTOR"],s),sub:`${f.lateLoss.scorer} trifft spät für ${f.away}, ${f.home} verliert ${score(f)}.`};
  if(f.blownLead)return{kicker:"Führung verspielt",title:pick(["FÜHRUNG VERSPIELT!","ERST JUBEL, DANN FRUST"],s),sub:`${f.home} führt und verliert am Ende ${score(f)} gegen ${f.away}.`};
  if(f.xgHome>f.xgAway+0.8)return{kicker:"Pech",title:pick(["PECH! KEIN LOHN FÜR DIE MÜHE","CHANCEN VERGEBEN, SPIEL VERLOREN"],s),sub:`xG ${f.xgHome.toFixed(1)}:${f.xgAway.toFixed(1)}, trotzdem ${score(f)} gegen ${f.away}.`};
  if(f.margin<=-3)return{kicker:"Rabenschwarz",title:pick([`${score(f)}-PLEITE GEGEN ${A}`,"EIN ABEND ZUM VERGESSEN"],s),sub:`${f.away} ist an diesem Tag eine Nummer zu groß.`};
  return{kicker:"Niederlage",title:pick([`NIEDERLAGE GEGEN ${A}`,`${H} VERLIERT ${score(f)}`,`KEINE PUNKTE GEGEN ${A}`],s),sub:`${f.away} gewinnt ${score(f)}. Mund abputzen, weiter geht's.`};
 }
 function scorerList(list,goals,side){
  return list.map(([name])=>{const mins=goals.filter(g=>g.side===side&&String(g.scorer)===name).map(g=>`${g.minute}.${g.type==="penalty"?" FE":""}`);return`${name} (${mins.join(", ")})`}).join(", ");
 }
 function article(f){
  const s=f.seed,out=[],mode=modeIn(f.mode),where=mode?" "+mode:"";
  const verb=f.result==="win"?pick(["besiegt","schlägt","bezwingt"],s,"v"):f.result==="loss"?pick(["unterliegt","verliert gegen"],s,"v"):"trennt sich von";
  const extra=f.pensWinner?" nach Elfmeterschießen":f.extraTime?" nach Verlängerung":"";
  const p1=f.result==="draw"&&!f.pensWinner?`${f.home} ${verb} ${f.away}${where} ${score(f)}${extra}.`:`${f.home} ${verb} ${f.away}${where} mit ${score(f)}${extra}.`;
  const hs=f.homeScorers.length?` Für ${f.home} ${f.homeScorers.length===1?"traf":"trafen"} ${scorerList(f.homeScorers,f.goals,"home")}.`:"";
  const as=f.awayScorers.length?` ${f.away} kam durch ${scorerList(f.awayScorers,f.goals,"away")} zu ${f.ga===1?"seinem Tor":"seinen Toren"}.`:"";
  out.push(p1+hs+as);
  const control=f.poss>=58?`${f.home} hatte mit ${f.poss}% Ballbesitz klar mehr vom Spiel`:f.poss<=42?`${f.away} hatte mit ${100-f.poss}% Ballbesitz mehr vom Spiel`:`Beim Ballbesitz war es mit ${f.poss}:${100-f.poss} ausgeglichen`;
  out.push(`${control}, bei ${f.shotsHome}:${f.shotsAway} Schüssen und xG ${f.xgHome.toFixed(1)}:${f.xgAway.toFixed(1)}.${f.redCards?` Dazu musste ${f.home} ${f.redCards===1?"eine Rote Karte":f.redCards+" Rote Karten"} verkraften.`:""}`);
  if(f.potm){
   out.push(f.potm.side==="home"
    ?`Bester Mann auf dem Platz: ${f.potm.name} mit der Kurier-Note ${num(f.potm.rating).toFixed(1)}. ${pick(["Die Fans feiern ihn noch lange nach Abpfiff.","Ein Auftritt, über den man morgen in der Kabine spricht.","So sieht ein Unterschiedsspieler aus."],s,"p")}`
    :`Bitter: Der beste Mann stand beim Gegner. ${f.potm.name} (${f.away}) holt sich die Kurier-Note ${num(f.potm.rating).toFixed(1)}.`);
  }
  return out;
 }
 function quote(f){
  const s=f.seed;
  const lines=f.result==="win"
   ?(f.comeback||f.lateWinner?["Diese Mannschaft gibt niemals auf. Darauf bin ich stolz.","Was für ein Abend! Genau dafür spielt man Fußball."]:f.margin>=3?["Heute hat fast alles geklappt. Jetzt nicht abheben.","So stelle ich mir unseren Fußball vor."]:["Drei Punkte, mehr zählt heute nicht.","Wir haben das clever gemacht und verdient gewonnen.","Ein Arbeitssieg, aber ein wichtiger."])
   :f.result==="draw"?["Ein Punkt, mit dem wir leben können.","Am Ende war mehr drin. Wir bleiben dran.","Ehrliches Remis, beide Teams haben alles gegeben."]
   :(f.xgHome>f.xgAway?["Wir hätten heute drei Spiele gewinnen können. Fußball ist manchmal brutal.","Wenn du die Chancen nicht machst, wirst du bestraft."]:["Heute war der Gegner besser. Das müssen wir anerkennen.","Kopf hoch, Mund abputzen, nächstes Spiel."]);
  return pick(lines,s,"q");
 }
 function story(f){return{...headline(f),article:article(f),quote:quote(f)}}

 /* ---------- reading the live match ---------- */
 function fromMatch(m){
  if(!m)return null;
  const rowsHome=typeof matchReportPerformanceRows==="function"?matchReportPerformanceRows("home"):[];
  const potm=typeof matchReportPotm==="function"?matchReportPotm():null;
  const strip=r=>r?{name:String(r.name||r.base?.name||"Spieler"),rating:num(r.rating),side:r.side,goals:num(r.goals),assists:num(r.assists),position:String(r.position||r.base?.position||""),uid:String(r.uid||""),index:num(r.index),row:r}:null;
  const played=rowsHome.filter(r=>num(r.minutes)>0);
  const d={
   home:typeof matchHomeTeamName==="function"?matchHomeTeamName():"Footera Club",away:typeof matchAwayTeamName==="function"?matchAwayTeamName():"Gegner",
   gh:m.home,ga:m.away,mode:m.mode,extraTime:m.extraTimeStarted,pensWinner:m.penaltyWinner,pensHome:m.pensHome,pensAway:m.pensAway,
   goals:(m.goalEvents||[]).map(g=>({side:g.side,minute:num(g.minute),scorer:String(g.scorer||"Spieler"),type:g.type,assist:g.assist||""})),
   xgHome:m.xgHome,xgAway:m.xgAway,shotsHome:m.shotsHome,shotsAway:m.shotsAway,poss:m.poss,redCards:(m.redCards||[]).length,
   potm:strip(potm),top:played.slice(0,3).map(strip),low:played.length>3?strip(played[played.length-1]):null,
   seed:String(m.resultId||m.seed||"")+"|"+(m.goalEvents||[]).map(g=>g.minute+String(g.scorer)).join(",")+"|"+m.home+":"+m.away
  };
  return facts(d);
 }
 function edition(){try{return Math.max(1,num(typeof state!=="undefined"?state.stats?.matches:0))}catch(e){return 1}}
 function dateLine(at=new Date()){
  const next=new Date(at.getTime()+86400000);
  return new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(next);
 }

 /* ---------- page ---------- */
 function cardFor(entry){
  const row=entry?.row;if(!row?.base)return"";
  try{return typeof matchReportPlayerCard==="function"?matchReportPlayerCard(row):(typeof cardHTML==="function"?cardHTML(row.base,row.item,true):"")}catch(e){return""}
 }
 function html(f,{at=new Date(),no=edition()}={}){
  const st=story(f),potmCard=f.potm?cardFor(f.potm):"";
  const scorers=side=>{const by=new Map();for(const g of f.goals.filter(x=>x.side===side)){const k=String(g.scorer);if(!by.has(k))by.set(k,[]);by.get(k).push(`${g.minute}'${g.type==="penalty"?" FE":""}`)}return[...by.entries()].map(([n,m])=>`<li>${escText(n)} <i>${escText(m.join(" "))}</i></li>`).join("")};
  const grades=[...f.top,...(f.low&&!f.top.some(t=>t.uid===f.low.uid)?[f.low]:[])].map((r,i,arr)=>`<li class="${i===arr.length-1&&f.low&&r===f.low?"low":""}"><span>${escText(r.name)}</span><b>${r.rating.toFixed(1)}</b></li>`).join("");
  return`<article class="np-paper">
  <header class="np-mast"><div class="np-mast-row"><span>Ausgabe Nr. ${no}</span><span>${escText(dateLine(at))}</span></div><h1>FOOTERA KURIER</h1><div class="np-mast-row np-mast-sub"><span>${escText(modeLabel(f.mode))}</span><span>Das Blatt für deinen Club</span></div></header>
  <div class="np-kicker">${escText(st.kicker)}</div>
  <h2 class="np-title">${escText(st.title)}</h2>
  <p class="np-sub">${escText(st.sub)}</p>
  <div class="np-score"><div class="np-team"><strong>${escText(f.home)}</strong><ul>${scorers("home")}</ul></div><div class="np-result">${f.gh}<em>:</em>${f.ga}${f.pensWinner?`<small>i.E. ${f.pensHome}:${f.pensAway}</small>`:f.extraTime?"<small>n.V.</small>":""}</div><div class="np-team away"><strong>${escText(f.away)}</strong><ul>${scorers("away")}</ul></div></div>
  <div class="np-body">
   ${f.potm?`<figure class="np-photo">${potmCard?`<div class="np-card">${potmCard}</div>`:""}<figcaption><b>${escText(f.potm.name)}</b><span>Spieler des Spiels · Note ${f.potm.rating.toFixed(1)}</span></figcaption></figure>`:""}
   <div class="np-text">${st.article.map((p,i)=>`<p${i===0?' class="np-lead"':""}>${escText(p)}</p>`).join("")}</div>
  </div>
  <div class="np-columns">
   ${grades?`<section class="np-box"><h3>Kurier-Noten</h3><ul class="np-grades">${grades}</ul></section>`:""}
   <section class="np-box np-quote"><h3>Stimme zum Spiel</h3><blockquote>„${escText(st.quote)}“</blockquote><cite>Trainer, ${escText(f.home)}</cite></section>
  </div>
  <footer class="np-foot">FOOTERA – BUILD YOUR ERA</footer>
 </article>`;
 }

 /* ---------- share picture ---------- */
 function loadImage(src){return new Promise(r=>{const img=new Image();img.onload=()=>r(img);img.onerror=()=>r(null);img.src=src;setTimeout(()=>r(null),4000)})}
 function wrap(g,text,maxW){const words=String(text).split(/\s+/),lines=[];let cur="";for(const w of words){const t=cur?cur+" "+w:w;if(g.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur);return lines}
 async function picture(f,{at=new Date(),no=edition()}={}){
  const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d"),st=story(f);
  try{await document.fonts?.ready}catch(e){}
  const SERIF="Georgia,'Times New Roman',serif",SANS="Inter,system-ui,sans-serif",F=(w,px,fam=SANS)=>`${w} ${px}px ${fam}`;
  g.fillStyle="#0e1411";g.fillRect(0,0,W,H);{const glow=g.createRadialGradient(W/2,0,40,W/2,0,H*.7);glow.addColorStop(0,"rgba(255,77,94,.16)");glow.addColorStop(1,"rgba(255,77,94,0)");g.fillStyle=glow;g.fillRect(0,0,W,H)}
  g.fillStyle="#a9b3ad";g.textAlign="left";g.font=F(700,24);g.fillText(`AUSGABE NR. ${no}`,70,78);g.textAlign="right";g.fillText(up(dateLine(at)),W-70,78);
  g.textAlign="center";g.fillStyle="#fff";g.font=F(900,104,SERIF);g.fillText("FOOTERA KURIER",W/2,190,W-120);
  g.fillStyle="#e8e2d4";g.fillRect(70,215,W-140,6);g.fillRect(70,229,W-140,2);
  g.fillStyle="#ff4d5e";g.font=F(900,30);g.fillText(up(st.kicker),W/2,288);
  g.fillStyle="#fff";g.font=F(900,78,SERIF);let y=370;for(const line of wrap(g,st.title,W-140).slice(0,3)){g.fillText(line,W/2,y,W-140);y+=84}
  g.fillStyle="#b9c4be";g.font=F(500,34,SERIF);for(const line of wrap(g,st.sub,W-180).slice(0,2)){g.fillText(line,W/2,y+6);y+=44}
  y+=26;g.fillStyle="#050807";g.fillRect(70,y,W-140,150);g.strokeStyle="#2c3a33";g.lineWidth=2;g.strokeRect(70,y,W-140,150);
  g.fillStyle="#f3ecdc";g.font=F(900,92);g.fillText(`${f.gh} : ${f.ga}`,W/2,y+108);
  g.font=F(800,30);g.textAlign="left";g.fillText(f.home,100,y+88,300);g.textAlign="right";g.fillText(f.away,W-100,y+88,300);
  y+=190;
  const bottom=H-150,cardW=Math.max(170,Math.min(300,Math.floor((bottom-y-50)/1.43))),hasCard=!!f.potm?.row?.base&&!!root.FooteraShare?.drawCard;
  const textX=hasCard?70+cardW+40:70,textW=W-70-textX;
  if(hasCard){await drawCardAt(f.potm.row,70,y,cardW);g.fillStyle="#9fb0a8";g.textAlign="center";g.font=F(700,24);g.fillText(`${f.potm.name} · Note ${f.potm.rating.toFixed(1)}`,70+cardW/2,y+cardW*1.43+36,cardW+20)}
  g.textAlign="left";g.fillStyle="#e8e2d4";g.font=F(500,31,SERIF);let ty=y+30;
  // Only whole paragraphs, never a sentence cut off at the bottom.
  for(const p of st.article){const lines=wrap(g,p,textW);if(ty+(lines.length-1)*42>bottom)break;for(const line of lines){g.fillText(line,textX,ty);ty+=42}ty+=16}
  g.fillStyle="#e8e2d4";g.fillRect(70,H-120,W-140,3);g.textAlign="center";g.font=F(900,32);g.fillText("FOOTERA – BUILD YOUR ERA",W/2,H-70);
  g.fillStyle="#9fb0a8";g.font=F(600,24);g.fillText("Insta @official_footera · TikTok @footera_official",W/2,H-32);
  async function drawCardAt(row,x,cy,width){
   const host=document.createElement("div");host.className="footera-share-stage";host.setAttribute("aria-hidden","true");
   try{host.innerHTML=cardFor({row});document.body.append(host);
    const card=host.querySelector(".card-shell")||host.firstElementChild;if(!card)return;
    host.querySelectorAll("img").forEach(img=>{img.loading="eager";if(img.dataset.pendingSrc&&!img.getAttribute("src")){img.src=img.dataset.pendingSrc;img.style.display=""}});
    await Promise.all([...host.querySelectorAll("img")].map(img=>img.complete?0:new Promise(r=>{img.addEventListener("load",r,{once:true});img.addEventListener("error",r,{once:true});setTimeout(r,4000)})));
    g.save();await root.FooteraShare.drawCard(g,card,x,cy,width);g.restore();
   }catch(e){console.warn("Kurier Karte:",e)}finally{host.remove()}
  }
  const blob=await new Promise(r=>{try{c.toBlob(r,"image/png")}catch(e){r(null)}});
  return blob?new File([blob],"footera-kurier.png",{type:"image/png"}):null;
 }

 /* ---------- modal ---------- */
 let shown=null;
 function $(sel){return document.querySelector(sel)}
 function ensureModal(){
  if($("#"+MODAL_ID))return;
  const el=document.createElement("div");el.id=MODAL_ID;el.className="modal";
  el.innerHTML=`<div class="modalinner np-inner"><div class="modalhead"><h3>Footera Kurier</h3><button type="button" class="secondary" data-np-close>Schließen</button></div><div id="newspaperBody"></div><div class="np-actions"><button type="button" class="primary" data-np-share>Titelseite teilen</button></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",async e=>{
   if(e.target.closest("[data-np-close]")||e.target===el){typeof closeUiLayer==="function"?closeUiLayer(MODAL_ID,KIND):el.classList.remove("active");return}
   const btn=e.target.closest("[data-np-share]");if(!btn||!shown)return;
   await shareShown(btn);
  });
 }
 // V21.415: the picture (with the POTM card and its photo) takes several seconds. Phones only open
 // the share sheet right after a tap, so the picture is prepared as soon as the Kurier opens
 // (like the pack share). If it is still not ready at the tap, a second tap shares it.
 const SHARE_LABEL="Titelseite teilen",READY_LABEL="Bild bereit – jetzt teilen";
 function prepareShare(){
  const ed=shown;if(!ed)return null;
  if(!ed.job)ed.job=picture(ed.f,ed).catch(err=>{console.warn("Kurier Bild:",err);return null}).then(file=>{ed.file=file;ed.ready=true;return file});
  return ed.job;
 }
 function shareData(ed){
  const url=root.FooteraShare?.inviteUrl?root.FooteraShare.inviteUrl("","kurier"):location.href,st=story(ed.f);
  return{title:"Footera Kurier",text:`📰 ${st.title} ${ed.f.home} ${ed.f.gh}:${ed.f.ga} ${ed.f.away}. ⚽`,url,file:ed.file||null};
 }
 async function shareShown(btn){
  const ed=shown;if(!ed||ed.busy)return;
  const share=root.FooteraShare?.share;
  if(ed.ready){
   try{if(share){const r=await share(shareData(ed));if(r==="shared"&&typeof toast==="function")toast("Danke fürs Teilen!")}}
   catch(err){console.warn("Kurier teilen:",err)}
   finally{if(btn.isConnected)btn.textContent=SHARE_LABEL}
   return;
  }
  ed.busy=true;btn.disabled=true;btn.textContent="Wird vorbereitet …";
  try{await prepareShare()}finally{ed.busy=false;if(shown===ed&&btn.isConnected){btn.disabled=false;btn.textContent=READY_LABEL}}

 }
 function open(m){
  const live=m||(typeof match!=="undefined"?match:null);
  if(!live?.finished)return null;
  const f=fromMatch(live);if(!f)return null;
  ensureModal();
  shown={f,at:new Date(),no:edition()};
  const shareBtn=document.querySelector("#"+MODAL_ID+" [data-np-share]");if(shareBtn){shareBtn.disabled=false;shareBtn.textContent=SHARE_LABEL}
  $("#newspaperBody").innerHTML=html(f,shown);
  if(typeof showUiLayer==="function")showUiLayer(MODAL_ID,KIND);else $("#"+MODAL_ID).classList.add("active");
  {const ed=shown;setTimeout(()=>{if(shown===ed)prepareShare()},350)}
  const body=$("#"+MODAL_ID);if(body)body.scrollTop=0;
  return f;
 }
 function buttonHTML(){return`<button type="button" class="np-open" data-newspaper-open><span aria-hidden="true">📰</span><div><strong>Zeitung von morgen</strong><small>Was der Footera Kurier über dein Spiel schreibt</small></div><i aria-hidden="true">›</i></button>`}
 function start(){document.addEventListener("click",e=>{if(e.target.closest?.("[data-newspaper-open]"))open()})}

 root.FooteraNewspaper={facts,story,headline,article,quote,fromMatch,html,picture,open,buttonHTML,modeLabel};
 if(typeof document!=="undefined"&&document.addEventListener){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()}
})(window);
