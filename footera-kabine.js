// V21.404 Kabinen-Chat: the group chat of your squad. After every match your players write about the game
// (scorer brags, keeper after a clean sheet, red card apology, joker, player of the match ...), new top signings
// from packs join the group and players used in SBCs leave it. You can answer once per match as the coach.
// Device-local log (localStorage) only: nothing in the save changes, no popups, only a small "neu" count.
(function(root){
 "use strict";
 const KEY="footera-kabine-v1",MAX_MSGS=180,MAX_REFS=120,MODAL_ID="kabineModal",KIND="kabine";
 const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
 const escText=v=>typeof esc==="function"?esc(v):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 // "Christopher Nkunku" -> "Nkunku"; "Vini Jr." and short names stay.
 const short=v=>{const n=String(v||"").trim(),w=n.split(/\s+/);return w.length>=2&&n.length>12&&!/^(jr\.?|junior)$/i.test(w[w.length-1])?w.slice(1).join(" "):n};
 function hash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
 const pick=(list,seed,salt="")=>list[hash(seed+"|"+salt)%list.length];
 const fill=(text,vars)=>String(text).replace(/\{(\w+)\}/g,(_,k)=>vars[k]??"");

 /* ---------- storage ---------- */
 function read(){
  let v={};try{v=JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(e){v={}}
  if(!Array.isArray(v.msgs))v.msgs=[];if(!Array.isArray(v.refs))v.refs=[];if(!v.replies||typeof v.replies!=="object")v.replies={};
  v.seen=num(v.seen);return v;
 }
 function write(v){
  v.msgs=v.msgs.slice(-MAX_MSGS);v.refs=v.refs.slice(-MAX_REFS);
  const keep=new Set(v.msgs.map(m=>m.ref));for(const k of Object.keys(v.replies))if(!keep.has(k))delete v.replies[k];
  try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}
 }
 function append(ref,list,{at=Date.now()}={}){
  if(!ref||!list.length)return 0;
  const v=read();if(v.refs.includes(ref))return 0;
  const last=v.msgs.length?num(v.msgs[v.msgs.length-1].ts):0;let ts=Math.max(at,last+1);
  list.forEach((m,i)=>v.msgs.push({...m,ref,id:ref+"#"+i,ts:ts+i*1000}));
  v.refs.push(ref);write(v);refreshBadges();return list.length;
 }

 /* ---------- texts ---------- */
 const T={
  hattrick:["Hattrick-Ball nehm ich mit nach Hause 😎⚽⚽⚽","{n} Tore. Einfach {n} Tore. 🥵","Heute hatte ich einfach Bock 😮‍💨🔥","Jemand Autogramme? ✍️⚽⚽⚽"],
  lateWinner:["{min}. MINUTE!!! ICH KANN NICHT MEHR 😭🔥","WER HAT DIE {min}. MINUTE BESTELLT?! 😤⚽","Mein Puls ist immer noch auf 200 😮‍💨","Bis zum Schluss! Genau dafür spielen wir 🙌🔥"],
  lateEqualizer:["Nie aufhören zu laufen. {min}. Minute 🙌","Punkt gerettet, Leute! 😤","Ich wusste, da geht noch was 👀⚽"],
  pensWinKeeper:["Elfmeterschießen ist mein Wohnzimmer 🧤😎","Ich hab's euch gesagt: Ich ahne die Ecke 🧤🔮"],
  pensWin:["Nerven aus Stahl! 🥶","Vom Punkt eiskalt. Ich zitter immer noch 😅"],
  pensLoss:["Elfmeterschießen ist Lotterie. Kopf hoch, Leute 🫂","So bitter… aber wir kommen zurück 💪"],
  bigComeback:["Zwei Tore hinten und trotzdem gewonnen. DIESE MANNSCHAFT 💪🔥","Nie, wirklich NIE aufgeben 🦁","Wer hat in der Pause die Ansage gemacht? Weltklasse 😤"],
  comeback:["Rückstand gedreht! Starke Moral, Leute 💪","Erst hinten, dann gewonnen. So muss das 🔥"],
  blownLead:["Wie haben wir das noch hergegeben… 😶","Führung verspielt. Das tut weh 😓"],
  bigWin:["{score} 😂 Was ist da passiert","Die armen Leute von {away} 😅","{score}! Ich hab beim Zählen aufgehört 🤯"],
  win:["Drei Punkte! 💪","Weiter so, Team! ⚽","Sieg ist Sieg. Abhaken und weiter 😤","Gut gemacht, Leute 👏"],
  draw0:["0:0… keiner wollte heute treffen 😐","Hinten dicht, vorne nix. Nächstes Mal 😕"],
  draw:["Ein Punkt. Nehmen wir mit.","Da war mehr drin, Leute 😕","Unentschieden. Fühlt sich komisch an 🤷"],
  bigLoss:["Ein Abend zum Vergessen. Kommt nicht wieder 😞","{score}… ich sag heute lieber nix 😶"],
  loss:["Mund abputzen. Nächstes Spiel zeigen wir's allen.","Heute hat's nicht gereicht. Wir lernen draus 😓","Kopf hoch. Wir stehen zusammen 🫂"],
  goal_penalty:["Eiskalt vom Punkt 🥶","Elfer sicher verwandelt ✅","Torwart in die falsche Ecke geschickt 😏"],
  goal_freekick:["Freistoß genau ins Eck. Training zahlt sich aus 😏🎯","Habt ihr die Kurve gesehen?! 🎯🔥"],
  goal_solo:["Hab einfach alle stehen lassen 🕺","Solo-Show heute 😎","Ball am Fuß und durch. Einfach 🏃‍♂️💨"],
  brace:["Doppelpack! ✌️⚽","Zwei Buden heute ✌️😎","2 Tore, 2 Gründe zum Feiern ✌️"],
  goal:["Mein Tor heute 🙌⚽","Endlich wieder getroffen 😮‍💨","Wer hat das Tor gesehen? 👀🔥","Für euch, Leute! ⚽❤️"],
  assist:["@{scorer} der Pass war aber auch nicht schlecht 😏🎁","Gern geschehen @{scorer} 🎁","@{scorer} Abendessen geht auf dich 😂🍝"],
  cleanSheet:["Zu null! 🧤 Hinten ist zu.","Weiße Weste ✨🧤","Kein Gegentor. Die Abwehr war heute eine Mauer 🧱"],
  saves:["{n} Paraden heute. Ich will Prämie 😂🧤","{n} Mal gehalten. Hände tun weh 🧤😮‍💨"],
  keeperBad:["Sorry Leute, heute hab ich nichts gehalten 😞","Ich zahl die nächste Runde. Mein Fehler 😓"],
  red:["Sorry Leute, die Rote geht auf mich 🙈","Ich weiß, ich weiß… 🟥😬","Das war zu viel von mir. Entschuldigung an alle 🙏"],
  redWin:["Haben wir für dich gerissen 😤","Passiert. Wir halten zusammen 🤝"],
  redLoss:["Nächstes Mal Kopf bleiben, ok? 🙏","Lass gut sein, war nicht nur deine Schuld 🫂"],
  joker:["Reinkommen, treffen, fertig 🃏⚽","Joker sticht! 🃏🔥","Von der Bank direkt ins Tor 😎"],
  sub:["Danke für die Minuten, Trainer 🙏","Hab's genossen, auch wenn's nur kurz war 🙌","Nächstes Mal von Anfang an? 👀😅"],
  potmTease:["@{potm} Note {r}?! Spieler des Spiels 👑","@{potm} heute einfach eine andere Liga 🐐","Alle Augen auf @{potm} heute 👑🔥"],
  potmReply:["Teamleistung 🙌","Danke, ohne euch geht das nicht ❤️","Hab ich nur für euch gemacht 😂👑"],
  potmAway:["Wer war eigentlich deren {name}? 😵‍💫","{name} von {away}… den will ich nicht nochmal sehen 😮‍💨"],
  low:["Nicht mein Tag heute. Kommt nicht wieder 😤","Ich weiß, das war nix von mir. Nächstes Mal besser 🙏"],
  party:["Kabine laut machen 🔊🎶","Wer macht heute Musik? 🎧","Heute wird gefeiert! 🕺"],
  join:["Moin zusammen! 👋 Freu mich auf euch","Hallo Team! Lasst uns Titel holen 🏆","Endlich da! Wo ist hier der Kabinen-DJ? 🎧","Servus! Welche Nummer ist noch frei? 😄"],
  joinIcon:["Eine Legende in unserer Gruppe?! 😱","Ich bin gerade sprachlos. Willkommen! 🐐"],
  joinReply:["Willkommen! 🔥","Na endlich mal Verstärkung 😂","Willkommen im Team 🤝","Starke Verpflichtung, Trainer 👀🔥"],
  leave:["Wo sind die alle hin? 😅","Machts gut, Leute 🫡","Und wieder wird's leerer hier 🥲","Der Trainer räumt auf 😳"]
 };
 const REPLIES={
  win:[{t:"Stark, Leute! 👏",a:["Danke, Trainer! 🙌","💪💪💪"]},{t:"Morgen trotzdem Training 😤",a:["Neeein 😭","Wann genau? 😅"]},{t:"Pizza geht heute auf mich 🍕",a:["TRAINER 😍🍕","Ich nehm Salami!"]}],
  draw:[{t:"Kopf hoch, weiter geht's!",a:["Machen wir 💪","Nächstes Mal holen wir die drei Punkte"]},{t:"Da war mehr drin.",a:["Stimmt. Nächstes Mal 😤"]},{t:"Gute Moral gezeigt 💪",a:["Danke, Trainer 🙏"]}],
  loss:[{t:"Mund abputzen, nächstes Spiel!",a:["Jawohl 💪","Wir holen das zurück"]},{t:"Morgen 9 Uhr Videoanalyse 📼",a:["Oh nein… 😩","Ich bring Kaffee mit ☕"]},{t:"Ich glaube an euch.",a:["Wir zahlen das zurück, versprochen 🤝"]}]
 };

 /* ---------- match chat (pure, exported for tests) ---------- */
 function matchMessages(d){
  const s=String(d.seed||""),out=[],spoke=new Map(),MAX=8;
  const P=(Array.isArray(d.players)?d.players:[]).filter(p=>p&&(num(p.minutes)>0||num(p.goals)>0||num(p.assists)>0));
  const gh=num(d.gh),ga=num(d.ga),goals=(Array.isArray(d.goals)?d.goals:[]).slice().sort((a,b)=>num(a.minute)-num(b.minute));
  const pens=gh===ga&&d.pensWinner?d.pensWinner:"",result=gh>ga||pens==="home"?"win":gh<ga||pens==="away"?"loss":"draw";
  const vars={score:`${gh}:${ga}`,away:String(d.away||"Gegner"),home:String(d.home||"Footera Club")};
  const find=(uid,name)=>P.find(p=>uid&&String(p.uid)===String(uid))||P.find(p=>name&&p.name===name)||null;
  const room=()=>out.filter(m=>m.kind!=="sys").length<MAX;
  const say=(p,text,react=null,force=false)=>{if(!p||!text||(!force&&!room()))return false;spoke.set(p.uid||p.name,(spoke.get(p.uid||p.name)||0)+1);out.push({kind:"msg",who:{name:p.name,uid:String(p.uid||""),pid:String(p.pid||"")},text,react});return true};
  const quiet=p=>p&&!spoke.has(p.uid||p.name);
  const byRating=P.slice().sort((a,b)=>num(b.rating)-num(a.rating));
  const keeper=P.find(p=>p.pos==="GK");
  const captain=P.filter(p=>p.pos!=="GK"&&p.started!==false).sort((a,b)=>num(b.ovr)-num(a.ovr))[0]||byRating[0]||null;
  const voice=(salt,not=[])=>{const pool=P.filter(p=>!not.includes(p)&&quiet(p));return pool.length?pool[hash(s+salt)%pool.length]:null};
  const reactN=(salt,min=2,max=9)=>min+hash(s+"r"+salt)%(max-min+1);

  // Scorers of your team (by uid, name as fallback).
  const tally=new Map();
  for(const g of goals.filter(g=>g.side==="home")){const p=find(g.scorerUid,g.scorer);if(!p)continue;const k=p.uid||p.name;const t=tally.get(k)||{p,n:0,goals:[]};t.n++;t.goals.push(g);tally.set(k,t)}
  const scorers=[...tally.values()].sort((a,b)=>b.n-a.n||num(a.goals[0].minute)-num(b.goals[0].minute));
  let h=0,a=0,trailed=false,led=false,maxDef=0;for(const g of goals){if(g.side==="home")h++;else a++;if(a>h){trailed=true;maxDef=Math.max(maxDef,a-h)}if(h>a)led=true}
  const last=goals[goals.length-1]||null,late=last&&num(last.minute)>=85;
  const lastDecides=last&&(last.side==="home"?h-1===a&&h>a:a-1===h&&a>h);
  const lateWinner=result==="win"&&!pens&&late&&last.side==="home"&&lastDecides?last:null;
  const lateEq=result==="draw"&&!pens&&gh>0&&late&&last.side==="home"&&h===a?last:null;

  out.push({kind:"sys",text:`Abpfiff · ${vars.home} ${gh}:${ga} ${vars.away}${pens?` (i.E. ${num(d.pensHome)}:${num(d.pensAway)})`:d.extraTime?" (n.V.)":""}`});

  // 1) the headline message of the night
  const top=scorers[0];
  if(top&&top.n>=3)say(top.p,fill(pick(T.hattrick,s,"h"),{n:top.n}),{e:"🔥",n:reactN("h",6,11)});
  else if(lateWinner){const p=find(lateWinner.scorerUid,lateWinner.scorer)||captain;say(p,fill(pick(T.lateWinner,s,"lw"),{min:lateWinner.minute}),{e:"🔥",n:reactN("lw",6,11)})}
  else if(lateEq){const p=find(lateEq.scorerUid,lateEq.scorer)||captain;say(p,fill(pick(T.lateEqualizer,s,"le"),{min:lateEq.minute}),{e:"🙌",n:reactN("le",4,9)})}
  else if(pens==="home")say(keeper||captain,pick(keeper?T.pensWinKeeper:T.pensWin,s,"pw"),{e:"🧤",n:reactN("pw",5,10)});
  else if(pens==="away")say(captain,pick(T.pensLoss,s,"pl"),{e:"🫂",n:reactN("pl",3,7)});
  else if(result==="win"&&maxDef>=2)say(captain,pick(T.bigComeback,s,"bc"),{e:"💪",n:reactN("bc",6,11)});
  else if(result==="win"&&trailed)say(captain,pick(T.comeback,s,"cb"),{e:"💪",n:reactN("cb",4,9)});
  else if(result==="loss"&&led)say(captain,pick(T.blownLead,s,"bl"),{e:"😓",n:reactN("bl",2,6)});
  else if(result==="win"&&gh-ga>=4)say(voice("bw")||captain,fill(pick(T.bigWin,s,"bw"),vars),{e:"😂",n:reactN("bw",4,9)});
  else if(result==="win")say(captain,pick(T.win,s,"w"),{e:"💪",n:reactN("w",3,8)});
  else if(result==="draw")say(captain,pick(gh===0?T.draw0:T.draw,s,"d"));
  else say(captain,fill(pick(ga-gh>=3?T.bigLoss:T.loss,s,"l"),vars),{e:"🫂",n:reactN("l",2,6)});

  // 2) scorers that have not spoken yet, then the assist
  for(const t of scorers.slice(0,3)){
   if(!quiet(t.p))continue;
   const sub=t.p.started===false;
   const type=t.goals.find(g=>g.type==="freekick")?"freekick":t.goals.find(g=>g.type==="penalty")?"penalty":t.goals.find(g=>g.type==="solo")?"solo":"";
   const text=sub?pick(T.joker,s,"j"+t.p.name):t.n===2?pick(T.brace,s,"b"+t.p.name):pick(type?T["goal_"+type]:T.goal,s,"g"+t.p.name);
   say(t.p,text,{e:sub?"🃏":"⚽",n:reactN("g"+t.p.name,2,8)});
  }
  const assisted=goals.find(g=>g.side==="home"&&(g.assistUid||g.assist)&&quiet(find(g.assistUid,g.assist)));
  if(assisted){const p=find(assisted.assistUid,assisted.assist),sc=find(assisted.scorerUid,assisted.scorer);if(p&&sc&&p!==sc)say(p,fill(pick(T.assist,s,"a"),{scorer:`[${short(sc.name)}]`}),{e:"😂",n:reactN("a",1,5)})}

  // 3) keeper, red card, low performer, joker on the bench
  if(keeper&&quiet(keeper)){
   if(ga===0&&num(keeper.minutes)>=60)say(keeper,pick(T.cleanSheet,s,"cs"),{e:"🧤",n:reactN("cs",3,9)});
   else if(num(keeper.saves)>=4)say(keeper,fill(pick(T.saves,s,"sv"),{n:num(keeper.saves)}),{e:"🧤",n:reactN("sv",3,8)});
   else if(ga>=3)say(keeper,pick(T.keeperBad,s,"kb"),{e:"🫂",n:reactN("kb",2,5)});
  }
  const sent=P.find(p=>num(p.reds)>0);
  if(sent){say(sent,pick(T.red,s,"rc"),{e:"😬",n:reactN("rc",2,6)},true);const mate=quiet(captain)&&captain!==sent?captain:voice("rm",[sent]);if(mate)say(mate,pick(result==="loss"?T.redLoss:T.redWin,s,"rm"),null,true)}
  if(result!=="loss"){const sub=P.find(p=>p.started===false&&num(p.minutes)>0&&quiet(p));if(sub)say(sub,pick(T.sub,s,"sb"))}
  const low=byRating.length>=8?byRating[byRating.length-1]:null;
  if(low&&num(low.rating)>0&&num(low.rating)<6&&num(low.minutes)>=45&&quiet(low))say(low,pick(T.low,s,"lo"));

  // 4) player of the match
  const potm=d.potm;
  if(potm&&potm.side==="home"){
   const p=find(potm.uid,potm.name),mate=voice("pt",[p]);
   if(p&&mate&&say(mate,fill(pick(T.potmTease,s,"pt"),{potm:`[${short(p.name)}]`,r:num(potm.rating).toFixed(1)}),{e:"👑",n:reactN("pt",4,10)}))say(p,pick(T.potmReply,s,"pr"),{e:"❤️",n:reactN("pr",2,7)},true);
  }else if(potm&&potm.side==="away"&&potm.name){const p=voice("pa");if(p)say(p,fill(pick(T.potmAway,s,"pa"),{...vars,name:short(potm.name)}))}

  // 5) a party message after a win
  if(result==="win"){const p=voice("party");if(p)say(p,pick(T.party,s,"party"),{e:"🎶",n:reactN("party",2,7)})}
  return{result,messages:out};
 }

 /* ---------- recording from the live game ---------- */
 function baseFor(entry){
  try{
   const club=(typeof state!=="undefined"&&Array.isArray(state.club))?state.club:[];
   const item=entry?.uid?club.find(x=>String(x.uid)===String(entry.uid)):null;
   if(item&&typeof displayBase==="function")return displayBase(item);
   if(entry?.pid&&typeof P_BY_ID!=="undefined"&&P_BY_ID?.get)return P_BY_ID.get(entry.pid)||P_BY_ID.get(Number(entry.pid))||null;
  }catch(e){}
  return null;
 }
 function matchRef(m){return"m:"+String(m.resultId||m.seed||"")+"|"+num(m.home)+":"+num(m.away)+"|"+(m.goalEvents||[]).map(g=>g.minute+String(g.scorer)).join(",")}
 function fromMatch(m){
  if(!m||typeof matchReportPerformanceRows!=="function")return null;
  const rows=matchReportPerformanceRows("home"),potm=typeof matchReportPotm==="function"?matchReportPotm():null;
  const starters=new Set((m.initialStarters||[]).map(String));
  const players=rows.map(r=>({name:String(r.base?.name||r.name||"Spieler"),uid:String(r.uid||""),pid:String(r.base?.id||""),pos:String(r.position||r.base?.position||"").toUpperCase(),
   ovr:num(r.base?.ovr),rating:num(r.rating),goals:num(r.goals),assists:num(r.assists),minutes:num(r.minutes),saves:num(r.saves),reds:num(r.reds),started:starters.size?starters.has(String(r.uid)):true}));
  return{
   seed:matchRef(m),home:typeof matchHomeTeamName==="function"?matchHomeTeamName():"Footera Club",away:typeof matchAwayTeamName==="function"?matchAwayTeamName():"Gegner",
   gh:m.home,ga:m.away,pensWinner:m.penaltyWinner,pensHome:m.pensHome,pensAway:m.pensAway,extraTime:!!m.extraTimeStarted,mode:m.mode,
   goals:(m.goalEvents||[]).map(g=>({side:g.side,minute:num(g.minute),scorer:String(g.scorer||""),scorerUid:String(g.scorerUid||""),assist:String(g.assist||""),assistUid:String(g.assistUid||""),type:g.type})),
   players,potm:potm?{name:String(potm.base?.name||potm.name||""),uid:String(potm.uid||""),side:potm.side,rating:num(potm.rating)}:null
  };
 }
 function afterMatch(m){
  try{
   const live=m||(typeof match!=="undefined"?match:null);
   if(!live?.finished||live.kabineRecorded)return 0;
   const d=fromMatch(live);if(!d||!d.players.length)return 0;
   live.kabineRecorded=true;
   const {result,messages}=matchMessages(d);
   return append(d.seed,messages.map(x=>({...x,result})));
  }catch(e){console.warn("Kabinen-Chat:",e);return 0}
 }
 function squadVoices(exclude=new Set()){
  try{
   const items=typeof squadItems==="function"?squadItems().filter(Boolean):[];
   return items.filter(i=>!exclude.has(String(i.uid))).map(i=>({item:i,b:typeof displayBase==="function"?displayBase(i):null})).filter(x=>x.b)
    .sort((x,y)=>num(y.b.ovr)-num(x.b.ovr)).map(x=>({name:String(x.b.name||"Spieler"),uid:String(x.item.uid||""),pid:String(x.b.id||"")}));
  }catch(e){return[]}
 }
 function ratingOf(item,b){try{return num(typeof itemRating==="function"?itemRating(item):b?.ovr)||num(b?.ovr)}catch(e){return num(b?.ovr)}}
 // The best new signing of a pack (84+, special cards and icons) joins the group.
 function joinMessages(newcomer,voices,seed){
  const out=[{kind:"sys",text:`Trainer hat ${newcomer.name} hinzugefügt`}];
  out.push({kind:"msg",who:{name:newcomer.name,uid:newcomer.uid,pid:newcomer.pid},text:pick(T.join,seed,"j")});
  const mates=voices.filter(v=>v.uid!==newcomer.uid&&v.name!==newcomer.name).slice(0,4);
  if(mates.length){const m=mates[hash(seed+"m")%mates.length];out.push({kind:"msg",who:m,text:newcomer.icon?pick(T.joinIcon,seed,"ji"):pick(T.joinReply,seed,"jr"),react:{e:"🔥",n:2+hash(seed+"jn")%6}})}
  return out;
 }
 function afterPack(items){
  try{
   if(!Array.isArray(items)||!items.length||typeof displayBase!=="function")return 0;
   const ranked=items.map(item=>{const b=displayBase(item);return b?{item,b,ovr:ratingOf(item,b),special:item.variant==="special"||item.variant==="icon-mid"||!!b.isIcon}:null}).filter(Boolean)
    .filter(x=>x.ovr>=84||(x.special&&x.ovr>=80)).sort((x,y)=>y.ovr-x.ovr);
   const best=ranked[0];if(!best)return 0;
   const newcomer={name:String(best.b.name||"Spieler"),uid:String(best.item.uid||""),pid:String(best.b.id||""),icon:!!best.b.isIcon};
   const ref="p:"+(newcomer.uid||newcomer.pid+"|"+Date.now());
   return append(ref,joinMessages(newcomer,squadVoices(new Set([newcomer.uid])),ref));
  }catch(e){console.warn("Kabinen-Chat:",e);return 0}
 }
 function leaveMessages(names,more,voices,seed){
  const list=more>0?`${names.join(", ")} und ${more} weitere`:names.join(" und ");
  const out=[{kind:"sys",text:`${list} ${names.length+more>1?"haben":"hat"} die Gruppe verlassen (SBC)`}];
  if(voices.length)out.push({kind:"msg",who:voices[hash(seed)%Math.min(3,voices.length)],text:pick(T.leave,seed,"l")});
  return out;
 }
 // Players handed in for an SBC leave the group (only when a 82+ player was among them).
 function afterSbc(items){
  try{
   if(!Array.isArray(items)||!items.length||typeof displayBase!=="function")return 0;
   const gone=items.map(i=>{const b=displayBase(i);return b?{name:String(b.name||"Spieler"),ovr:ratingOf(i,b),uid:String(i.uid||"")}:null}).filter(Boolean).sort((x,y)=>y.ovr-x.ovr);
   if(!gone.length||gone[0].ovr<82)return 0;
   const top=gone.slice(0,2).map(x=>x.name),ref="s:"+gone.map(x=>x.uid).join(",").slice(0,180);
   return append(ref,leaveMessages(top,gone.length-top.length,squadVoices(new Set(gone.map(x=>x.uid))),ref));
  }catch(e){console.warn("Kabinen-Chat:",e);return 0}
 }

 /* ---------- coach answer ---------- */
 function replyOptions(v,ref){
  const block=v.msgs.filter(m=>m.ref===ref);if(!block.length||v.replies[ref]!=null)return[];
  const result=block.find(m=>m.result)?.result;return REPLIES[result]||[];
 }
 function latestMatchRef(v){for(let i=v.msgs.length-1;i>=0;i--)if(String(v.msgs[i].ref).startsWith("m:"))return v.msgs[i].ref;return""}
 function answer(ref,index){
  const v=read(),opts=replyOptions(v,ref),o=opts[index];if(!o)return[];
  const players=v.msgs.filter(m=>m.ref===ref&&m.who).map(m=>m.who),uniq=[...new Map(players.map(p=>[p.uid||p.name,p])).values()];
  const last=num(v.msgs[v.msgs.length-1]?.ts),out=[{kind:"me",text:o.t}];
  o.a.forEach((t,i)=>{const p=uniq[(hash(ref+i)+i)%Math.max(1,uniq.length)];if(p)out.push({kind:"msg",who:p,text:t,react:null})});
  const rref=ref;let ts=Math.max(Date.now(),last+1);
  out.forEach((m,i)=>v.msgs.push({...m,ref:rref,id:rref+"#r"+i,ts:ts+i*1000}));
  v.replies[ref]=index;write(v);return out;
 }

 /* ---------- view ---------- */
 const NAME_COLORS=["#53bdeb","#f7b955","#ff7aa2","#7bd88f","#c39bff","#ff9566","#4fd1c5","#f6e05e","#90cdf4","#fca5a5"];
 const colorFor=name=>NAME_COLORS[hash(name)%NAME_COLORS.length];
 function initials(name){const w=String(name||"?").trim().split(/\s+/);return((w[0]?.[0]||"?")+(w.length>1?w[w.length-1][0]:"")).toUpperCase()}
 function avatarHTML(who){
  const b=baseFor(who);let img="";
  try{if(b&&typeof portraitHTML==="function")img=portraitHTML(b)}catch(e){img=""}
  return`<span class="kb-ava" style="--kb-c:${colorFor(who.name)}"><b>${escText(initials(who.name))}</b>${img}</span>`;
 }
 // Mentions are stored as "@[Name]" so names with spaces stay one mention.
 function textHTML(t){return escText(t).replace(/@\[([^\]]+)\]/g,'<b class="kb-at">@$1</b>')}
 const plain=t=>String(t||"").replace(/@\[([^\]]+)\]/g,"@$1");
 function timeLabel(ts){try{return new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"}).format(new Date(ts))}catch(e){return""}}
 function dayLabel(ts,now=Date.now()){
  const f=d=>{try{return new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(d))}catch(e){return""}};
  const k=f(ts);if(k===f(now))return"Heute";if(k===f(now-86400000))return"Gestern";return k;
 }
 function msgHTML(m,prev){
  if(m.kind==="sys")return`<div class="kb-sys" data-kb-id="${escText(m.id)}"><span>${escText(m.text)}</span></div>`;
  const time=`<time>${escText(timeLabel(m.ts))}</time>`;
  if(m.kind==="me")return`<div class="kb-row me" data-kb-id="${escText(m.id)}"><div class="kb-bubble"><p>${textHTML(m.text)}</p>${time}<i class="kb-ticks" aria-hidden="true">✓✓</i></div></div>`;
  const first=!prev||prev.kind!=="msg"||prev.who?.name!==m.who?.name;
  return`<div class="kb-row${first?" first":""}" data-kb-id="${escText(m.id)}">${first?avatarHTML(m.who):'<span class="kb-ava-space"></span>'}<div class="kb-bubble">${first?`<strong style="color:${colorFor(m.who.name)}">${escText(m.who.name)}</strong>`:""}<p>${textHTML(m.text)}</p>${time}${m.react?`<span class="kb-react">${escText(m.react.e)} ${num(m.react.n)}</span>`:""}</div></div>`;
 }
 function listHTML(msgs,now=Date.now()){
  let html="",day="";
  msgs.forEach((m,i)=>{const d=dayLabel(m.ts,now);if(d!==day){day=d;html+=`<div class="kb-day"><span>${escText(d)}</span></div>`}html+=msgHTML(m,msgs[i-1])});
  return html;
 }
 function emptyHTML(){return`<div class="kb-empty"><span aria-hidden="true">💬</span><strong>Noch ruhig in der Kabine</strong><p>Nach deinem nächsten Spiel schreibt deine Mannschaft hier, was sie vom Spiel hält. Neue Topstars aus Packs stellen sich vor.</p></div>`}
 function clubName(){try{return typeof matchHomeTeamName==="function"?matchHomeTeamName():String(state?.profile?.clubName||"Footera Club")}catch(e){return"Footera Club"}}
 function crest(){try{if(typeof crestHTML==="function"&&typeof clubIdentitySnapshot==="function")return crestHTML(clubIdentitySnapshot(),true)}catch(e){}return'<span class="kb-crest-fallback">⚽</span>'}
 function unread(v=read()){return v.msgs.filter(m=>num(m.ts)>v.seen&&m.kind==="msg").length}
 function refreshBadges(){
  try{if(typeof document==="undefined"||!document.querySelectorAll)return;const n=unread();
   document.querySelectorAll("[data-kabine-count]").forEach(el=>{el.textContent=n?`${n} neu`:"";el.hidden=!n});
   document.querySelectorAll("[data-kabine-sub]").forEach(el=>{el.textContent=n?`${n} neue Nachrichten von deiner Mannschaft`:"Was deine Mannschaft über das Spiel schreibt"});
  }catch(e){}
 }

 let playing=null;
 function $(sel){return document.querySelector(sel)}
 function ensureModal(){
  if($("#"+MODAL_ID))return;
  const el=document.createElement("div");el.id=MODAL_ID;el.className="modal";
  el.innerHTML=`<div class="modalinner kb-inner"><div class="kb-head"><button type="button" class="kb-back" data-kb-close aria-label="Schließen">‹</button><div class="kb-crest"></div><div class="kb-title"><strong></strong><small></small></div><button type="button" class="kb-share" data-kb-share aria-label="Als Bild teilen" title="Als Bild teilen">⤴</button></div><div class="kb-list" id="kabineList"></div><div class="kb-foot" id="kabineFoot"></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",async e=>{
   if(e.target.closest("[data-kb-close]")||e.target===el){close();return}
   const chip=e.target.closest("[data-kb-reply]");
   if(chip){finishPlay();const [ref,i]=[chip.dataset.kbRef,num(chip.dataset.kbReply)];const added=answer(ref,i);renderFoot();if(added.length)play(added.map(()=>0),true);return}
   if(e.target.closest("#kabineList")&&playing){finishPlay();return}
   const share=e.target.closest("[data-kb-share]");if(share){share.disabled=true;try{await sharePicture()}catch(err){console.warn("Kabinen-Chat teilen:",err)}finally{share.disabled=false}}
  });
 }
 function members(){
  const v=squadVoices();const names=v.slice(0,3).map(x=>x.name);
  return names.length?`${names.join(", ")}${v.length>3?` und ${v.length-3} weitere`:""}`:"Deine Mannschaft";
 }
 function renderHead(){
  const inner=$("#"+MODAL_ID);if(!inner)return;
  inner.querySelector(".kb-crest").innerHTML=crest();
  inner.querySelector(".kb-title strong").textContent=`${clubName()} · Kabine`;
  inner.querySelector(".kb-title small").textContent=members();
 }
 function renderFoot(){
  const v=read(),ref=latestMatchRef(v),opts=ref?replyOptions(v,ref):[],foot=$("#kabineFoot");if(!foot)return;
  foot.innerHTML=opts.length?`<span class="kb-foot-label">Als Trainer antworten</span><div class="kb-chips">${opts.map((o,i)=>`<button type="button" class="kb-chip" data-kb-ref="${escText(ref)}" data-kb-reply="${i}">${escText(o.t)}</button>`).join("")}</div>`:`<div class="kb-foot-note">🔒 Nur deine Mannschaft liest mit</div>`;
 }
 function scrollEnd(){const list=$("#kabineList");if(list)list.scrollTop=list.scrollHeight}
 // New messages appear one after another with a "schreibt ..." line, like a real chat. Tap skips.
 function play(_,appendOnly=false){
  if(playing){clearTimeout(playing.timer);playing=null}
  const v=read(),list=$("#kabineList");if(!list)return;
  const reduce=typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fresh=appendOnly?v.msgs.slice(-_.length):v.msgs.filter(m=>num(m.ts)>v.seen);
  const old=appendOnly?v.msgs.slice(0,-_.length):v.msgs.filter(m=>num(m.ts)<=v.seen);
  if(!appendOnly)list.innerHTML=v.msgs.length?listHTML(old):emptyHTML();
  markSeen(v);
  if(!fresh.length){scrollEnd();return}
  if(reduce){list.innerHTML=listHTML(v.msgs);scrollEnd();return}
  let i=0;const all=v.msgs;
  const me={all,timer:0};playing=me;
  const step=()=>{
   if(playing!==me)return;
   if(i>=fresh.length){finishPlay();return}
   const m=fresh[i];
   const typing=list.querySelector(".kb-typing");if(typing)typing.remove();
   if(m.kind==="msg"){
    list.insertAdjacentHTML("beforeend",`<div class="kb-typing"><span>${escText(short(m.who.name))} schreibt</span><i></i><i></i><i></i></div>`);scrollEnd();
    me.timer=setTimeout(()=>{if(playing!==me)return;const t=list.querySelector(".kb-typing");if(t)t.remove();show(m);i++;me.timer=setTimeout(step,260)},520+Math.min(900,plain(m.text).length*14));
   }else{show(m);i++;me.timer=setTimeout(step,m.kind==="me"?420:240)}
  };
  const show=m=>{const idx=all.indexOf(m);const html=(()=>{const prevDay=idx>0?dayLabel(all[idx-1].ts):"";const d=dayLabel(m.ts);return(d!==prevDay?`<div class="kb-day"><span>${escText(d)}</span></div>`:"")+msgHTML(m,all[idx-1])})();list.insertAdjacentHTML("beforeend",html);const el=list.lastElementChild;if(el)el.classList.add("kb-pop");scrollEnd()};
  step();
 }
 function finishPlay(){
  if(!playing)return;clearTimeout(playing.timer);playing=null;
  const list=$("#kabineList"),v=read();if(list){list.innerHTML=v.msgs.length?listHTML(v.msgs):emptyHTML();scrollEnd()}
 }
 function markSeen(v=read()){const last=v.msgs.length?num(v.msgs[v.msgs.length-1].ts):0;if(last>v.seen){v.seen=last;write(v)}refreshBadges()}
 function open(){
  try{if(typeof match!=="undefined"&&match?.finished)afterMatch(match)}catch(e){}
  ensureModal();renderHead();renderFoot();
  if(typeof showUiLayer==="function")showUiLayer(MODAL_ID,KIND);else $("#"+MODAL_ID).classList.add("active");
  play();
 }
 function close(){if(playing){clearTimeout(playing.timer);playing=null}typeof closeUiLayer==="function"?closeUiLayer(MODAL_ID,KIND):$("#"+MODAL_ID)?.classList.remove("active")}

 /* ---------- share picture: the chat of the latest match ---------- */
 function wrap(g,text,maxW){const words=String(text).split(/\s+/),lines=[];let cur="";for(const w of words){const t=cur?cur+" "+w:w;if(g.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur);return lines}
 function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
 async function picture(){
  const v=read(),ref=latestMatchRef(v)||v.msgs[v.msgs.length-1]?.ref;const block=v.msgs.filter(m=>m.ref===ref);if(!block.length)return null;
  const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
  try{await document.fonts?.ready}catch(e){}
  const SANS="Inter,system-ui,sans-serif",F=(w,px)=>`${w} ${px}px ${SANS}`;
  g.fillStyle="#0b141a";g.fillRect(0,0,W,H);
  g.fillStyle="#1f2c34";g.fillRect(0,0,W,150);
  g.fillStyle="#25d366";g.beginPath();g.arc(90,75,42,0,Math.PI*2);g.fill();g.fillStyle="#0b141a";g.font=F(900,38);g.textAlign="center";g.fillText("⚽",90,89);
  g.textAlign="left";g.fillStyle="#e9edef";g.font=F(800,40);g.fillText(`${clubName()} · Kabine`,155,70,W-200);g.fillStyle="#8696a0";g.font=F(600,26);g.fillText(members(),155,110,W-200);
  // Lay out from the bottom so the newest messages are always on the picture.
  const items=[],maxW=700;g.font=F(500,32);
  for(const m of block){
   if(m.kind==="sys"){items.push({m,h:70});continue}
   const lines=wrap(g,plain(m.text),maxW-60);items.push({m,lines,h:(m.kind==="msg"?44:0)+lines.length*42+44+(m.react?34:0)+18});
  }
  // The "Abpfiff" line always stays on top, then as many of the newest messages as fit.
  const head=items[0]?.m.kind==="sys"?items.shift():null;
  let total=head?head.h:0,start=items.length;while(start>0&&total+items[start-1].h<H-150-150){total+=items[start-1].h;start--}
  let y=180;
  for(const it of [...(head?[head]:[]),...items.slice(start)]){
   const m=it.m;
   if(m.kind==="sys"){g.font=F(700,26);const w=Math.min(W-120,g.measureText(m.text).width+48);g.fillStyle="#1d2a30";rr(g,(W-w)/2,y,w,48,14);g.fill();g.fillStyle="#ffd279";g.textAlign="center";g.fillText(m.text,W/2,y+33,W-150);y+=it.h;continue}
   g.font=F(500,32);const textW=Math.max(...it.lines.map(l=>g.measureText(l).width),m.kind==="msg"?(g.font=F(800,28),g.measureText(m.who.name).width):0);g.font=F(500,32);
   const bw=Math.min(maxW,textW+60),bh=it.h-18-(m.react?34:0),me=m.kind==="me",bx=me?W-60-bw:150;
   if(!me){g.fillStyle=colorFor(m.who.name);g.beginPath();g.arc(100,y+34,32,0,Math.PI*2);g.fill();g.fillStyle="#0b141a";g.font=F(900,26);g.textAlign="center";g.fillText(initials(m.who.name),100,y+44)}
   g.fillStyle=me?"#005c4b":"#202c33";rr(g,bx,y,bw,bh,22);g.fill();
   let ty=y+44;g.textAlign="left";
   if(!me){g.fillStyle=colorFor(m.who.name);g.font=F(800,28);g.fillText(m.who.name,bx+30,ty,bw-60);ty+=44}
   g.fillStyle="#e9edef";g.font=F(500,32);for(const l of it.lines){g.fillText(l,bx+30,ty);ty+=42}
   if(m.react){g.font=F(700,26);const t=`${m.react.e} ${m.react.n}`,rw=g.measureText(t).width+30;g.fillStyle="#2a3942";rr(g,bx+20,y+bh-10,rw,40,20);g.fill();g.fillStyle="#e9edef";g.fillText(t,bx+35,y+bh+19)}
   y+=it.h;
  }
  g.fillStyle="#1f2c34";g.fillRect(0,H-110,W,110);g.fillStyle="#e9edef";g.textAlign="center";g.font=F(900,32);g.fillText("FOOTERA – BUILD YOUR ERA",W/2,H-62);
  g.fillStyle="#8696a0";g.font=F(600,22);g.fillText("Insta @official_footera · TikTok @footera_official",W/2,H-28);
  const blob=await new Promise(r=>{try{c.toBlob(r,"image/png")}catch(e){r(null)}});
  return blob?new File([blob],"footera-kabine.png",{type:"image/png"}):null;
 }
 async function sharePicture(){
  const file=await picture();if(!file)return;
  const share=root.FooteraShare?.share,url=root.FooteraShare?.inviteUrl?root.FooteraShare.inviteUrl("","kabine"):location.href;
  if(share)await share({title:"Footera Kabine",text:"💬 Das schreibt meine Mannschaft nach dem Spiel. ⚽",url,file});
 }

 /* ---------- entry points ---------- */
 function buttonHTML(){
  try{if(typeof match!=="undefined"&&match?.finished)afterMatch(match)}catch(e){}
  const n=unread();
  return`<button type="button" class="kb-open" data-kabine-open><span class="kb-open-icon" aria-hidden="true">💬</span><div><strong>Kabinen-Chat</strong><small data-kabine-sub>${n?`${n} neue Nachrichten von deiner Mannschaft`:"Was deine Mannschaft über das Spiel schreibt"}</small></div><em data-kabine-count ${n?"":"hidden"}>${n?`${n} neu`:""}</em><i aria-hidden="true">›</i></button>`;
 }
 function start(){
  document.addEventListener("click",e=>{if(e.target.closest?.("[data-kabine-open]"))open()});
  refreshBadges();
 }

 root.FooteraKabine={KEY,matchMessages,joinMessages,leaveMessages,afterMatch,afterPack,afterSbc,answer,replyOptions,read,unread,open,close,buttonHTML,picture,listHTML,short,_T:T,_REPLIES:REPLIES};
 if(typeof document!=="undefined"&&document.addEventListener){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()}
})(window);
