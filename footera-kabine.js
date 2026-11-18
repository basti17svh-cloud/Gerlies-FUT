// V21.464: safe group chat on mobile: bounded history rendering, resilient log, on-demand WebGL photos.
// V21.404 Kabinen-Chat: the group chat of your squad. After every match your players write about the game
// (scorer brags, keeper after a clean sheet, red card apology, joker, player of the match ...), new top signings
// from packs join the group and players used in SBCs leave it.
// V21.420: much more variety (streaks, Rivals/Champions/Turnier, upsets, weather, night games, yellow cards,
// injuries, recurring characters with running gags: the late-comer, the DJ, the eater, the gamer, the poser, the
// team-fund keeper) and a real coach: up to 3 answers per match out of a dozen options (praise the best player,
// criticise, bench threat, Kabinenpredigt, pizza, party, day off, Straflauf, voice message, meme ...). The players
// react, combos are noticed, and the coach's words come back after the next match. A "Stimmung" meter keeps score.
// Device-local log (localStorage) only: nothing in the save changes, no popups, only a small "neu" count.
(function(root){
 "use strict";
 const KEY="footera-kabine-v1",MAX_MSGS=220,MAX_REFS=120,MODAL_ID="kabineModal",KIND="kabine";
 const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const escText=v=>typeof esc==="function"?esc(v):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 // "Christopher Nkunku" -> "Nkunku"; "Vini Jr." and short names stay.
 const short=v=>{const n=String(v||"").trim(),w=n.split(/\s+/);return w.length>=2&&n.length>12&&!/^(jr\.?|junior)$/i.test(w[w.length-1])?w.slice(1).join(" "):n};
 function hash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
 // V21.438: lines do not come back right away. While a chat is written (fresh(...)), pick() skips lines used in the last
 // chats (kept as short keys in v.lines) and takes the one used longest ago when every line of a list was used.
 let FRESH=null;
 const lineKey=t=>hash(t).toString(36);
 const pick=(list,seed,salt="")=>{
  const st=hash(seed+"|"+salt)%list.length;
  if(!FRESH||list.length<2||typeof list[st]!=="string"||list[st].length<8)return list[st];
  let best=null,bestAt=Infinity;
  for(let i=0;i<list.length;i++){const t=list[(st+i)%list.length],k=lineKey(t),at=FRESH.at.has(k)?FRESH.at.get(k):-1;if(at<bestAt){best=t;bestAt=at;if(at<0)break}}
  const k=lineKey(best);FRESH.at.set(k,FRESH.n++);FRESH.used.push(k);return best;
 };
 function fresh(recent,fn){
  const prev=FRESH,at=new Map();(Array.isArray(recent)?recent:[]).forEach((k,i)=>at.set(String(k),i));
  FRESH={at,n:at.size,used:[]};
  try{const value=fn();return{value,used:FRESH.used}}finally{FRESH=prev}
 }
 const MAX_LINES=420;
 const keepLines=(v,used)=>{v.lines=[...(Array.isArray(v.lines)?v.lines:[]),...used].slice(-MAX_LINES)};
 const fill=(text,vars)=>String(text).replace(/\{(\w+)\}/g,(_,k)=>vars[k]??"");
 const keyOf=p=>p?String(p.uid||p.name):"";
 const whoOf=p=>({name:String(p.name||"Spieler"),uid:String(p.uid||""),pid:String(p.pid||"")});

 /* ---------- storage ---------- */
 function read(){
  let v={};try{v=JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(e){v={}}
  if(!Array.isArray(v.msgs))v.msgs=[];
  // Older/incomplete chat entries must never crash the whole game on render.
  else v.msgs=v.msgs.filter(m=>m&&typeof m==="object"&&["sys","msg","me"].includes(m.kind)&&(m.kind!=="msg"||m.who&&typeof m.who==="object")).slice(-MAX_MSGS);
  if(!Array.isArray(v.refs))v.refs=[];else v.refs=v.refs.filter(x=>typeof x==="string").slice(-MAX_REFS);
  if(!v.replies||typeof v.replies!=="object"||Array.isArray(v.replies))v.replies={};
  if(!v.memo||typeof v.memo!=="object")v.memo={};
  v.seen=num(v.seen);v.mood=v.mood==null?60:clamp(Math.round(num(v.mood)),0,100);return v;
 }
 function write(v){
  v.msgs=v.msgs.slice(-MAX_MSGS);v.refs=v.refs.slice(-MAX_REFS);
  const keep=new Set(v.msgs.map(m=>m.ref));for(const k of Object.keys(v.replies))if(!keep.has(k))delete v.replies[k];
  try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}
 }
 function append(ref,list,{at=Date.now(),update=null}={}){
  if(!ref||!list.length)return 0;
  const v=read();if(v.refs.includes(ref))return 0;
  const last=v.msgs.length?num(v.msgs[v.msgs.length-1].ts):0;let ts=Math.max(at,last+1);
  list.forEach((m,i)=>v.msgs.push({...m,ref,id:ref+"#"+i,ts:ts+i*1000}));
  v.refs.push(ref);if(update)update(v);write(v);refreshBadges();return list.length;
 }

 /* ---------- texts ---------- */
 const T={
  titlePhoto:["🏆📸 POKALSIEGER! Unser Siegerfoto aus der Kabine","Das Foto kommt über jedes Bett 🏆📸","Pokal in der Kabine. Foto für die Ewigkeit 🏆📸","Wer hat den Pokal als Erster angefasst? Egal, Foto! 🏆📸","Siegerfoto mit Pokal. Rahmen ist schon bestellt 🖼️🏆","Ich schick das Foto an jeden, den ich kenne. Auch an meinen Zahnarzt 🏆📸😂"],
  hattrick:["Hattrick-Ball nehm ich mit nach Hause 😎⚽⚽⚽","{n} Tore. Einfach {n} Tore. 🥵","Heute hatte ich einfach Bock 😮‍💨🔥","Jemand Autogramme? ✍️⚽⚽⚽","Ich hab aufgehört zu zählen. Ach nee, waren {n} 😏","Ball unterschreiben lassen, Rahmen kaufen, fertig 🖼️⚽"],
  lateWinner:["{min}. MINUTE!!! ICH KANN NICHT MEHR 😭🔥","WER HAT DIE {min}. MINUTE BESTELLT?! 😤⚽","Mein Puls ist immer noch auf 200 😮‍💨","Bis zum Schluss! Genau dafür spielen wir 🙌🔥","Hab in der {min}. noch kurz an meine Oma gedacht und dann draufgehauen 😭⚽","Hat jemand meinen Herzschrittmacher gesehen? {min}. Minute 🫀🔥"],
  lateEqualizer:["Nie aufhören zu laufen. {min}. Minute 🙌","Punkt gerettet, Leute! 😤","Ich wusste, da geht noch was 👀⚽","{min}. Minute! Lieber spät als nie 😅⚽"],
  pensWinKeeper:["Elfmeterschießen ist mein Wohnzimmer 🧤😎","Ich hab's euch gesagt: Ich ahne die Ecke 🧤🔮","Hab mir die Schützen im Bus auf YouTube angeguckt 🧤📺😏"],
  pensWin:["Nerven aus Stahl! 🥶","Vom Punkt eiskalt. Ich zitter immer noch 😅","Elfmeterschießen gewonnen. Ich brauch erstmal Baldrian 😮‍💨"],
  pensLoss:["Elfmeterschießen ist Lotterie. Kopf hoch, Leute 🫂","So bitter… aber wir kommen zurück 💪","Ab morgen 100 Elfer nach jedem Training. Mindestens 😤"],
  bigComeback:["Zwei Tore hinten und trotzdem gewonnen. DIESE MANNSCHAFT 💪🔥","Nie, wirklich NIE aufgeben 🦁","Wer hat in der Pause die Ansage gemacht? Weltklasse 😤","Ich hatte in der Halbzeit schon die Ausrede getippt. Gelöscht 😂💪"],
  comeback:["Rückstand gedreht! Starke Moral, Leute 💪","Erst hinten, dann gewonnen. So muss das 🔥","Rückstand? Kurz Anlauf genommen 😎"],
  blownLead:["Wie haben wir das noch hergegeben… 😶","Führung verspielt. Das tut weh 😓","Wir führen und schenken es her. Ich geh duschen. Lange. 🚿😶"],
  bigWin:["{score} 😂 Was ist da passiert","Die armen Leute von {away} 😅","{score}! Ich hab beim Zählen aufgehört 🤯","Hat jemand {away} Bescheid gesagt, dass das Spiel angefangen hat? 😂","{score}. Bitte Screenshot, das glaubt mir zu Hause keiner 📸"],
  win:["Drei Punkte! 💪","Weiter so, Team! ⚽","Sieg ist Sieg. Abhaken und weiter 😤","Gut gemacht, Leute 👏","Arbeitssieg. Die schmecken am besten 😮‍💨💪","Nicht schön, aber selten. Äh, nein: schön UND drei Punkte 😎"],
  draw0:["0:0… keiner wollte heute treffen 😐","Hinten dicht, vorne nix. Nächstes Mal 😕","90 Minuten und kein Tor. Die Zuschauer wollen ihr Geld zurück 😅"],
  draw:["Ein Punkt. Nehmen wir mit.","Da war mehr drin, Leute 😕","Unentschieden. Fühlt sich komisch an 🤷","Remis. Weder Fisch noch Fleisch 🐟🥩"],
  bigLoss:["Ein Abend zum Vergessen. Kommt nicht wieder 😞","{score}… ich sag heute lieber nix 😶","Ich lösch jetzt Instagram für 3 Tage 📵😞"],
  loss:["Mund abputzen. Nächstes Spiel zeigen wir's allen.","Heute hat's nicht gereicht. Wir lernen draus 😓","Kopf hoch. Wir stehen zusammen 🫂","Abhaken. Ich will nie wieder darüber reden 🙈"],
  goal_penalty:["Eiskalt vom Punkt 🥶","Elfer sicher verwandelt ✅","Torwart in die falsche Ecke geschickt 😏","Anlauf, Blick, Tor. Langweilig, ich weiß 😴⚽"],
  goal_freekick:["Freistoß genau ins Eck. Training zahlt sich aus 😏🎯","Habt ihr die Kurve gesehen?! 🎯🔥","Die Mauer hat noch nicht mal gezuckt 🧱🎯"],
  goal_solo:["Hab einfach alle stehen lassen 🕺","Solo-Show heute 😎","Ball am Fuß und durch. Einfach 🏃‍♂️💨","Ich hab gar nicht gemerkt, dass ich durch bin 😅"],
  brace:["Doppelpack! ✌️⚽","Zwei Buden heute ✌️😎","2 Tore, 2 Gründe zum Feiern ✌️","Zwei Tore. Einer für Mama, einer für die Gruppe ❤️⚽"],
  goal:["Mein Tor heute 🙌⚽","Endlich wieder getroffen 😮‍💨","Wer hat das Tor gesehen? 👀🔥","Für euch, Leute! ⚽❤️","Torjubel war geplant, ist aber schiefgegangen 😂","Hab die Ecke gewählt und gebetet 🙏⚽"],
  assist:["@[{scorer}] der Pass war aber auch nicht schlecht 😏🎁","Gern geschehen @[{scorer}] 🎁","@[{scorer}] Abendessen geht auf dich 😂🍝","@[{scorer}] ich will 50 % vom Jubel 😤🎁","Wer hat den Pass gespielt? Ich frag für einen Freund 😏 @[{scorer}]"],
  cleanSheet:["Zu null! 🧤 Hinten ist zu.","Weiße Weste ✨🧤","Kein Gegentor. Die Abwehr war heute eine Mauer 🧱","Ich war so unterbeschäftigt, ich hab die Fans gezählt 🧤😂"],
  saves:["{n} Paraden heute. Ich will Prämie 😂🧤","{n} Mal gehalten. Hände tun weh 🧤😮‍💨","{n} Paraden. Abwehr, wir müssen reden 😤🧤"],
  keeperBad:["Sorry Leute, heute hab ich nichts gehalten 😞","Ich zahl die nächste Runde. Mein Fehler 😓","Ich glaub, meine Handschuhe waren eingeseift 🧼🧤"],
  red:["Sorry Leute, die Rote geht auf mich 🙈","Ich weiß, ich weiß… 🟥😬","Das war zu viel von mir. Entschuldigung an alle 🙏","Der Ball war da, ich schwör 🟥🙄"],
  redWin:["Haben wir für dich gerissen 😤","Passiert. Wir halten zusammen 🤝","Zu zehnt gewonnen. Respekt an alle 💪"],
  redLoss:["Nächstes Mal Kopf bleiben, ok? 🙏","Lass gut sein, war nicht nur deine Schuld 🫂","Zu zehnt wird's halt schwer 😮‍💨"],
  yellow:["Gelb für Meckern… ich weiß 🟨🙊","Die Gelbe war ein Witz 🟨🙄","Taktisches Foul. Würd ich wieder machen 🟨😏"],
  yellowReply:["5 € in die Kasse 💶😏","Notiert ✍️💶","Kasse sagt danke 💰"],
  injury:["Bin okay Leute, nur Eis drauf 🧊🦵","Halb so wild, nächste Woche bin ich wieder da 💪🩹","Der Physio sagt, ich soll nicht so jammern 😅🧊"],
  injuryReply:["Gute Besserung! 🙏","Werd schnell wieder fit 💪","Ich bring dir Schokolade vorbei 🍫"],
  joker:["Reinkommen, treffen, fertig 🃏⚽","Joker sticht! 🃏🔥","Von der Bank direkt ins Tor 😎","Bank war warm, Fuß auch 🃏🔥"],
  sub:["Danke für die Minuten, Trainer 🙏","Hab's genossen, auch wenn's nur kurz war 🙌","Nächstes Mal von Anfang an? 👀😅","{m} Minuten. Ich hab trotzdem geschwitzt 😅"],
  potmTease:["@[{potm}] Note {r}?! Spieler des Spiels 👑","@[{potm}] heute einfach eine andere Liga 🐐","Alle Augen auf @[{potm}] heute 👑🔥","@[{potm}] {r}… gibst du uns auch mal den Ball? 😂"],
  potmReply:["Teamleistung 🙌","Danke, ohne euch geht das nicht ❤️","Hab ich nur für euch gemacht 😂👑","Ich weiß 😎"],
  potmAway:["Wer war eigentlich deren {name}? 😵‍💫","{name} von {away}… den will ich nicht nochmal sehen 😮‍💨","Ich träum heute Nacht von {name} 😩"],
  low:["Nicht mein Tag heute. Kommt nicht wieder 😤","Ich weiß, das war nix von mir. Nächstes Mal besser 🙏","Note {r}. Ich geh freiwillig früher ins Bett 😓"],
  party:["Kabine laut machen 🔊🎶","Wer macht heute Musik? 🎧","Heute wird gefeiert! 🕺","Siegerfoto in die Gruppe! 📸"],
  // context of the night
  winStreak:["{n} Siege am Stück! Wer stoppt uns? 🔥","Serie läuft: {n} Siege in Folge 😤🔥","Ich trau mich nicht, die Socken zu wechseln. {n} Siege! 🧦😂","{n} Siege in Serie. Ich hab Gänsehaut 🥶🔥"],
  streakEnd:["Serie gerissen… {n} Siege waren aber geil 😓","Nach {n} Siegen mal verloren. Wir sind auch nur Menschen 🤷","Die Serie ist weg. Ab morgen starten wir eine neue 💪"],
  lossStreak:["{n} Niederlagen am Stück. Wir müssen reden, Leute 😶","Krise? Welche Krise? 🙃 (Okay, {n} Niederlagen…)","{n} Pleiten in Folge. Ich schlaf heute im Trainingszentrum 😤"],
  lossBreak:["ENDLICH wieder gewonnen 😭🙏","Der Knoten ist geplatzt! 💥","Ich hatte vergessen, wie sich Siegen anfühlt 🥹"],
  unbeaten:["{n} Spiele ungeschlagen 🛡️","Seit {n} Spielen nicht verloren. Nicht drüber reden, sonst ist es weg 🤫"],
  rivalsWin:["Rivals-Punkte eingesackt 📈","Rivals-Tabelle, wir kommen 📈😎","Wieder Punkte für die Rivals-Liga 💪📈"],
  rivalsLoss:["Rivals ist heute nicht unser Freund 😮‍💨","Rivals-Punkte verschenkt 😤","Nächste Rivals-Runde gehört uns 📈"],
  championsWin:["Champions-Abend, Champions-Gefühl ⭐🎶","Unter Flutlicht gewinnt's sich am schönsten ✨","Hymne im Ohr und drei Punkte im Sack ⭐"],
  championsLoss:["Auf der großen Bühne zählt jeder Fehler 😓","Champions ist kein Ponyhof 😮‍💨⭐"],
  tournamentWin:["Weiter im Turnier! 🏆","Pokal riecht schon 🏆👃","Noch ein Schritt Richtung Pokal 🏆💪"],
  tournamentLoss:["Turnierspiele sind Nerven pur 😮‍💨","Pokal-Träume heute nicht erfüllt 💔"],
  upsetWin:["Als Außenseiter rein, als Sieger raus 😎","Keiner hat an uns geglaubt. Außer uns 🦁","{away} war stärker? Auf dem Papier vielleicht 📄😏"],
  upsetLoss:["Gegen {away} verlieren… peinlich, Leute 🙈","Das war Pflicht. Und wir haben's verbockt 😬"],
  rain:["Ich bin bis auf die Unterhose nass 🌧️😂","Schuhe trocknen? Vergiss es 🌧️👟","Wasserball wär heute fairer gewesen 🌊⚽"],
  snow:["Wer hat den Ball orange gemacht? Ach ja, Schnee ❄️😂","Meine Zehen sind noch eingefroren 🥶❄️","Schneeballschlacht nach dem Training? ❄️😏"],
  night:["Es ist {time} Uhr, Trainer. Morgen ist Training?? 😴","Wer spielt um diese Uhrzeit Fußball 😂🌙","{time} Uhr und ich bin hellwach. Danke für nix 😵‍💫🌙"],
  morning:["Frühstück und drei Punkte 🥐⚽","So früh hab ich noch nie gespielt. Kaffee! ☕"],
  moodLow:["Die Stimmung hier war auch schon mal besser 😶","Leute, wir müssen wieder Spaß haben. Ernsthaft 🫂"],
  moodHigh:["Beste Stimmung seit Wochen hier 🔥🎶","Ich liebe diese Kabine einfach ❤️"],
  // what the coach said last time
  cbSermonWin:["Die Kabinenpredigt hat gewirkt 😅📢","Ich hatte nach der Predigt so Angst, ich bin für zwei gelaufen 😂"],
  cbSermonLoss:["Ich glaub, die nächste Predigt wird lauter 😬📢","Ich mach schon mal Ohropax rein 🙉"],
  cbRun:["Meine Beine brennen immer noch vom Straflauf 🔥🦵","Der Straflauf steckt mir noch in den Knochen 😮‍💨","Straflauf überlebt. Spiel auch. Knapp 😵"],
  cbPizzaWin:["Pizza-Power 🍕💪 Machen wir das zur Tradition, Trainer?","Ich sag's ja: Carbs gewinnen Spiele 🍕😎"],
  cbPizzaLoss:["Vielleicht war die dritte Pizza zu viel 🍕😅","Ab heute nur noch Salat 🥗😭"],
  cbDayOffWin:["Ausgeschlafen spielt's sich besser 😴⚽","Der freie Tag hat Wunder gewirkt 🙌"],
  cbDayOffLoss:["Wir waren wohl noch im Freizeitmodus 😅"],
  cbPartyWin:["Party gestern, Sieg heute. Perfekte Woche 🎉⚽"],
  cbPartyLoss:["Die Party war besser als das Spiel 🎉😬"],
  cbBenchScored:["Bank? Welche Bank, Trainer? 😏⚽","Hab mir die Ansage zu Herzen genommen. Und dann ins Tor 😎"],
  cbBenchGood:["Hab mir die Ansage zu Herzen genommen 💪","Trainer, war das besser? 👀"],
  cbBenchBad:["Ich pack schon mal mein Kissen für die Bank 🪑😅","Ich hör den Trainer schon tippen… 🪑😬"],
  cbBenchOut:["Grüße an @[{name}] auf der Bank 😂🪑","@[{name}] hat heute die Bank gewärmt. Ganz stark 🪑🔥😂"],
  cbPraisedAgain:["@[{name}] liefert schon wieder. Trainerliebling halt 🙄😂","@[{name}] braucht wohl jede Woche Lob 😂👑"],
  cbPraisedQuiet:["Na, @[{name}], heute kein Lob vom Trainer? 😏","@[{name}] war wohl noch mit dem Lob vom letzten Mal beschäftigt 😂"],
  join:["Moin zusammen! 👋 Freu mich auf euch","Hallo Team! Lasst uns Titel holen 🏆","Endlich da! Wo ist hier der Kabinen-DJ? 🎧","Servus! Welche Nummer ist noch frei? 😄","Hi Leute 👋 Wer zeigt mir, wo es das beste Essen gibt? 🍝","Ich bin da. Ihr könnt jetzt aufhören zu verlieren 😎 (Spaß!)"],
  joinIcon:["Eine Legende in unserer Gruppe?! 😱","Ich bin gerade sprachlos. Willkommen! 🐐","Ich hab dein Poster über meinem Bett. Ist das komisch? 😳🐐"],
  joinReply:["Willkommen! 🔥","Na endlich mal Verstärkung 😂","Willkommen im Team 🤝","Starke Verpflichtung, Trainer 👀🔥","Hoffentlich kannst du auch verteidigen 😏"],
  joinRival:["Konkurrenz auf meiner Position 😳","Ich trainier ab morgen doppelt 😤👀","Na toll. Ich geh schon mal die Bank vorwärmen 🪑😅"],
  joinFee:["Einstand nicht vergessen 🎂😏","Neue Leute bringen Kuchen mit. Regel Nummer 1 🎂"],
  leave:["Wo sind die alle hin? 😅","Machts gut, Leute 🫡","Und wieder wird's leerer hier 🥲","Der Trainer räumt auf 😳","Bin ich der Nächste? 😰"],
  leaveBye:["Danke für alles, Leute 🫡","War mir eine Ehre 🥲","Ich werd euch vermissen ❤️","Spind ist frei. Viel Glück, Leute 🫡"]
 };
 // V21.438: many more lines in every category (Basti: "viel mehr unterschiedliche Antworten", "viel lustiger,
 // außer es gibt Ärger"). Defeats, red cards and crises stay calm; everything else got funnier.
 const MORE_T={
  hattrick:["Ich hätte noch einen vierten gemacht, aber dann wär's unhöflich geworden 😇⚽","Mama hat angerufen. Sie will den Ball. Ich auch 😤⚽⚽⚽","Hattrick. Ich geh heute mit dem Ball ins Bett 🛏️⚽","Ab heute bitte mit 'Herr Hattrick' ansprechen 🎩⚽","{n} Tore und morgen muss ich trotzdem die Hütchen aufbauen 😑","Der Ball und ich, das ist jetzt was Ernstes ❤️⚽"],
  lateWinner:["{min}. Minute und ich hatte schon die Ausrede fürs Unentschieden fertig 😅⚽","Wer in der {min}. noch trifft, darf heute die Musik im Bus aussuchen 😎🎶","{min}. Minute. Ich glaub, der Trainer hat geweint 🥹⚽","Kurz vor Schluss, {min}. Minute. Ich hör den Jubel immer noch 🔊","Ich hab in der {min}. die Augen zugemacht und draufgehalten. Lief 🙈⚽","{min}. Minute! Meine Smartwatch hat Alarm geschlagen ⌚🚨"],
  lateEqualizer:["{min}. Minute. Der Punkt fühlt sich an wie ein Sieg 😤","Bis zur {min}. gezittert, dann zugeschlagen 💪","Wer hat gesagt, das Spiel ist vorbei? {min}. Minute 😏","Puh. {min}. Minute. Ich brauch erstmal Wasser 💧"],
  pensWinKeeper:["Ich hab in die Augen geguckt und die Ecke gesehen 👀🧤","Der Schütze hat mit dem Fuß gezuckt. Hab ich bemerkt 😏🧤","Elfer halten ist wie Lotto, nur dass ich immer gewinne 🧤🎰"],
  pensWin:["Ich hab beim Elfmeterschießen nicht hingeguckt. Ist es vorbei? 🙈","Nerven wie Drahtseile. Meine Knie sagen was anderes 😅","Mein Herz hat bei jedem Schuss eine Pause gemacht 🫀"],
  pensLoss:["Das tut weh. Aber wir haben bis zum Ende gekämpft 🫂","Wir lassen den Kopf nicht hängen. Nächstes Mal 💪","Niemand ist schuld. Wir gewinnen zusammen und verlieren zusammen 🤝"],
  bigComeback:["Ich will diese Halbzeitansprache als Klingelton 📢🔥","Nach dem 0:2 hab ich kurz meinen Kontostand gecheckt, um mich zu beruhigen. Dann gewonnen 😂💪","Diese Mannschaft hat Nerven aus Titan 🦾","Rückstand? Wir nennen das Aufwärmen 😎"],
  comeback:["Erst Schreck, dann Sieg. Mein Blutdruck dankt 😮‍💨","Rückstand gedreht. Ich liebe dieses Team ❤️","Hinten liegen ist nur Anlauf nehmen 🏃‍♂️💨"],
  blownLead:["Das müssen wir in Ruhe aufarbeiten. Führung halten lernen wir 💪","Wir hatten es in der Hand. Nächstes Mal machen wir's zu 🔒","Ärgerlich. Aber wir wissen jetzt, woran wir arbeiten 📋"],
  bigWin:["{score}. Ich hab dem Gegner nach dem Spiel ein Taschentuch gegeben 🤧😂","{score}. Der Anzeigetafel-Typ hatte heute richtig zu tun 🔢😂","Bei {score} hab ich angefangen, die Fans zu grüßen 👋😂","{score}! Bitte keiner {away} anrufen, die brauchen Ruhe 📵😂","{score}. Das Netz vom Tor muss geflickt werden 🥅🪡"],
  win:["Drei Punkte und alle Knochen heil. Perfekt 😎","Sieg! Ich schreib das gleich meiner Oma 👵📲","Gewonnen. Ich hab gar nicht gemerkt, dass ich müde bin 💪","3 Punkte im Sack, Sack ist zu, ab nach Hause 🎒😎","Gewonnen und keiner hat sich blamiert. Fast keiner 😏","Sieg! Heute schlaf ich wie ein Baby 👶💤","Läuft bei uns. Und zwar 90 Minuten lang 🏃‍♂️💨","Wieder ein Sieg. Ich gewöhn mich langsam dran 😌"],
  draw0:["0:0. Die Netze bleiben heute trocken 🥅","Torlos. Wenigstens hinten war alles dicht 🔒","0:0. Spannend wie eine Steuererklärung 📄😅","Ein Punkt und null Tore. Weiter arbeiten 📋"],
  draw:["Unentschieden. Ich weiß nicht, ob ich mich freuen soll 🤷","Ein Punkt ist besser als keiner. Sagt mein Mathe-Lehrer 📐","Remis. Beim nächsten Mal machen wir den Sack zu 💪","Punkteteilung. Wie beim Döner: gerecht, aber zu wenig 🥙"],
  bigLoss:["Das war heute nicht wir. Morgen fangen wir neu an 💪","Ganz bitter. Wir arbeiten das zusammen auf 🫂","{score}. Da gibt's nichts schönzureden. Nächste Woche reagieren wir 😤"],
  loss:["Heute nicht. Wir kommen stärker zurück 💪","Niederlage tut weh. Lernen, abhaken, weiter 🫂","Mund abwischen, morgen wieder Gas geben 😤","Wir stehen zusammen. Gerade jetzt 🤝"],
  goal_penalty:["Ich hab dem Keeper vorher zugezwinkert. Hat geklappt 😉⚽","Elfer? Hab ich im Schlaf geübt. Wirklich, ich träum davon 😴⚽","Den hätte meine Oma auch reingemacht. Aber ich hab's gemacht 😎"],
  goal_freekick:["Ich hab der Mauer vorher gesagt, dass sie springen soll. Sie hat's geglaubt 😏🧱","Freistoß-Gott? Ich nehm den Titel an 👑🎯","Das war Physik. Und Talent. Hauptsächlich Talent 🎯"],
  goal_solo:["Fünf Gegenspieler und ich. War ein faires Duell 😎","Ich hab nicht nach links und nicht nach rechts geguckt. Nur aufs Tor 🎯","Solo! Ich spiel auch gern ab, ehrlich. Nur heute nicht 😅"],
  brace:["Zwei Tore. Ich hab's meiner Kaffeemaschine versprochen ☕⚽⚽","Doppelpack! Ab heute teil ich nur noch in Zweierpacks ✌️😎","Das zweite war schöner. Ich sag's ja nur ✌️"],
  goal:["Das Tor widme ich meinem Physio. Der hat meine Wade gerettet 🦵⚽","Ich wollte eigentlich flanken. Pssst 🤫⚽","Habt ihr gesehen, wie ich danach zur Kurve gelaufen bin? Das war geplant 🏃‍♂️❤️","Tor! Ich schick das Video gleich in die Familiengruppe 📲⚽","Wenn ich treffe, gewinnen wir. Statistik lügt nicht 📊😎","Ich wollt nur kurz Hallo sagen. Mit dem Ball. Ins Netz 👋⚽"],
  assist:["@[{scorer}] das Tor gehört zu 60 % mir. Mindestens 😤🎁","@[{scorer}] ich will Erwähnung im Interview 🎙️😏","Der Pass war so gut, @[{scorer}] musste nur noch stehen bleiben 😂","@[{scorer}] Assist-König meldet sich zum Dienst 🫡🎁","@[{scorer}] du schuldest mir einen Kaffee. Groß ☕"],
  cleanSheet:["Zu null. Ich hätte nebenbei ein Buch lesen können 📖🧤","Kein Gegentor! Meine Handschuhe sind noch wie neu 🧤✨","Weiße Weste und frisch gewaschene Hose. Perfekter Tag 🧤😎","Hinten dicht. Wer will, kann bei uns Torwart-Urlaub buchen 🏖️🧤"],
  saves:["{n} Paraden. Ich will das in die Vereinschronik 📜🧤","{n} Mal gehalten. Ich glaub, ich hab den Ball öfter berührt als unsere Stürmer 😏🧤","{n} Paraden heute. Krieg ich dafür einen Extra-Pudding? 🍮🧤"],
  keeperBad:["Heute war nicht mein Tag. Ich arbeite dran, versprochen 🙏","Ich nehm das auf mich. Nächstes Mal halt ich die 💪","Tut mir leid, Leute. Ich bin morgen früh als Erster im Training 🧤"],
  red:["Das war unnötig von mir. Sorry an alle 🙏","Ich hab euch hängen lassen. Kommt nicht wieder 😓","Die Rote nehm ich auf meine Kappe. Ich lern draus 🟥"],
  redWin:["Zu zehnt durchgezogen. Das ist Teamgeist 🤝","Wir kämpfen auch für dich 💪","Nächstes Mal bleibst du auf dem Platz, ja? 😅🤝"],
  redLoss:["Wir reden morgen in Ruhe drüber 🫂","Passiert jedem mal. Wir halten zusammen 🤝","Kopf hoch. Wir brauchen dich nächste Woche 💪"],
  yellow:["Gelb. Ich hab nur 'Entschuldigung' gesagt. Ziemlich laut 🟨😅","Der Schiri mag mich einfach nicht 🟨🙄","Gelb für Zeitspiel. Ich hab nur meinen Schuh gebunden. Zweimal 🟨👟"],
  yellowReply:["Kasse freut sich. Ich hab schon die Quittung 🧾😏","Ab in die Kasse damit 💶👋","Danke für die Spende 💶🙏"],
  injury:["Nur eine Prellung. Ich hab schon schlimmer ausgesehen 😅🧊","Der Physio hat mich gelobt. Fürs Jammern 🙄🧊","Alles halb so wild, bin bald wieder da 💪"],
  injuryReply:["Werd schnell wieder fit, wir brauchen dich 🙏","Ich bring dir Gummibärchen vorbei 🐻","Ruh dich aus. Wir halten deinen Platz warm 🪑"],
  joker:["Ich hab auf der Bank so viel nachgedacht, da musste ein Tor raus 🤔⚽","Rein, Tor, raus aus der Kabine. Effizient 😎","Mein Platz auf der Bank war warm, mein Fuß war heißer 🔥🃏"],
  sub:["{m} Minuten Vollgas. Das reicht für eine Woche 😮‍💨","Ich hab mehr gelaufen als in der ganzen Hinrunde. In {m} Minuten 😅","Danke für die {m} Minuten. Nächstes Mal 90? 👀"],
  potmTease:["@[{potm}] {r}. Bitte gib uns mal einen Tipp, wie das geht 🙏","@[{potm}] du hast heute für zwei gespielt. Krieg ich dein Gehalt? 😂","@[{potm}] {r}. Das gibt's eigentlich nur in Footera 🎮😂","Ich hab @[{potm}] heute bei jedem Ballkontakt angeschrien. Vor Freude 😭👑"],
  potmReply:["Ich bin auch nur ein Mensch. Ein sehr guter 😎","Danke Leute 🥹 Nächste Runde geht auf mich","Ohne euch wär ich nur ein Typ mit Ball 🙏⚽","Psst, nicht so laut, sonst will ich mehr Gehalt 🤫💰"],
  potmAway:["Dieser {name}… ich glaub, der hat einen Turbo eingebaut 🚀","Ich hab {name} den ganzen Abend nur von hinten gesehen 😩","{name} hat heute alles richtig gemacht. Respekt 🤝"],
  low:["Note {r}. Das war nichts. Ich arbeite dran 💪","{r}… morgen bin ich als Erster im Training 🙏","Heute hab ich mehr gesucht als gefunden. Kommt nicht wieder 😓"],
  party:["DJ, Lautstärke auf 11 🔊🕺","Kabinentanz in 3, 2, 1… 💃🕺","Siegerdusche! Wer hat das Shampoo? 🚿🎶","Heute singt die ganze Kabine. Auch die, die's nicht können 🎤😂","Ich hab schon die Tanzschuhe an 🕺👟","Wer heute nicht mittanzt, muss die Trikots waschen 🧺🕺"],
  winStreak:["{n} Siege in Folge. Ich hab Angst, meine Glücksunterhose zu waschen 🩲😂","{n} Siege am Stück! Bitte keiner was ändern. Auch nicht die Frisur 💇‍♂️🔥","Serie: {n}. Mein Fantasy-Team ist neidisch 📈😎"],
  streakEnd:["Nach {n} Siegen war's halt mal fällig. Neue Serie startet jetzt 💪","Die Serie ist vorbei, die Mannschaft nicht 🤝"],
  lossStreak:["{n} Niederlagen. Wir reden, wir arbeiten, wir kommen raus 💪","Schwere Phase. Jetzt erst recht zusammenhalten 🤝"],
  lossBreak:["Ich hab vor Freude meinen Schienbeinschoner geküsst 😘🦵","Die Last ist weg! Ich hab gerade 3 Kilo verloren 😮‍💨","Wieder gewonnen! Ich wusste es. Okay, ich hab's gehofft 🙏"],
  unbeaten:["{n} Spiele ohne Niederlage. Psst, nicht laut sagen 🤫","{n} Mal nicht verloren. Ich klopf auf Holz 🪵👊","{n} Spiele ungeschlagen. Ich trag ab jetzt jeden Tag dieselbe Mütze 🧢🤫","Ungeschlagen seit {n} Spielen. Die Kabine riecht nach Erfolg. Und nach Socken 🧦😂"],
  rivalsWin:["Rivals-Punkte! Ich hab die Tabelle schon dreimal gecheckt 📈👀","Rivals-Liga, wir klopfen an. Ganz laut 🚪📈"],
  rivalsLoss:["Rivals-Punkte weg. Nächste Woche holen wir sie uns wieder 💪","Rivals tut heute weh. Wir bleiben dran 📈"],
  championsWin:["Champions-Nacht! Ich hab die Hymne mitgesummt 🎶⭐","Unter Flutlicht sehen meine Schuhe noch geiler aus ✨👟"],
  championsLoss:["Wir lernen aus dieser Nacht. Nächstes Mal unter Flutlicht wieder 💪","Große Bühne, harte Lektion. Wir kommen wieder ⭐","Champions ist kein Wunschkonzert. Weiter arbeiten 💪"],
  tournamentWin:["Turnier läuft! Ich hab schon Platz im Schrank für den Pokal gemacht 🏆🗄️","Eine Runde weiter. Pokal, wir sehen uns 🏆👀"],
  tournamentLoss:["Raus aus dem Turnier. Das tut weh, aber wir lernen draus 💪","Turnier vorbei. Nächstes Mal gehen wir weiter 🏆","Ausgeschieden. Das nehmen wir als Antrieb fürs nächste Turnier 🏆💪"],
  upsetWin:["{away} hatte die besseren Werte. Wir hatten das größere Herz ❤️😎","Underdog? Eher Under-Wolf 🐺","Die Buchmacher weinen gerade 😂📉"],
  upsetLoss:["Das war gegen {away} zu wenig. Wir müssen das besser machen 😤","Gegen {away} darf das nicht passieren. Mund abputzen 💪","Wir haben {away} unterschätzt. Das passiert uns nicht nochmal 😤","Abhaken, aber nicht vergessen. Gegen {away} wollen wir Revanche 💪"],
  rain:["Ich hab heute mehr Wasser geschluckt als im Schwimmbad 🌧️🏊","Die Haare sind ruiniert. Das Spiel war's wert 🌧️💇‍♂️","Regen ist nur Gratis-Dusche während des Spiels 🚿🌧️"],
  snow:["Ich hab in der Halbzeit einen Schneemann gebaut. Er hat besser verteidigt als ich ⛄😂","Schnee! Ich fühl mich wie ein Pinguin auf Stollen 🐧❄️","Meine Finger sind noch eingefroren. Ich tipp mit der Nase 👃❄️"],
  night:["{time} Uhr… ich krieg morgen bestimmt eine Krankmeldung vom Trainer 😴","Um {time} Uhr Fußball. Wir sind Profis. Oder verrückt 🌙⚽","{time} Uhr. Meine Mama denkt, ich schlafe 🤫🌙"],
  morning:["Frühes Spiel, frühe Punkte. Ich geh jetzt wieder ins Bett 😴","Noch vor dem Mittagessen gewonnen. Produktiver Tag ☀️","Spiel vor dem Frühstück gewonnen. Jetzt Müsli 🥣😎","Wer früh aufsteht, gewinnt. Oder so ähnlich ☀️⚽"],
  moodLow:["Kopf hoch, Leute. Wir sind besser, als es gerade aussieht 💪","Lasst uns morgen beim Training einfach mal wieder lachen 🫂","Wir sind ein Team. Gerade in solchen Wochen 🤝"],
  moodHigh:["Diese Kabine ist besser als jedes Wellness-Hotel 🧖‍♂️❤️","Stimmung hier ist so gut, ich will gar nicht nach Hause 🏠❌","Ich hab heute zum ersten Mal den Trainer lachen gesehen 😮😂"],
  join:["Moin! Ich bring gute Laune und schlechte Witze mit 😄","Hallo Leute 👋 Wer ist hier der Kabinen-DJ? Wir müssen reden 🎧","Bin da! Wo ist das WLAN-Passwort? 📶😅","Servus! Ich hab gehört, hier gibt's die besten Pizzaabende 🍕","Hallo zusammen! Ich bin schüchtern. Das hält ungefähr 3 Minuten 😇"],
  joinIcon:["Ich trau mich kaum zu schreiben. Hallo, Legende 🙇","Darf ich dich nachher um ein Foto bitten? Für meine Mama 📸🥹","Jetzt müssen wir uns alle benehmen. Eine Legende liest mit 😳"],
  joinReply:["Willkommen! Erste Regel: Nie den Platz vom Kapitän im Bus nehmen 😂","Willkommen! Der Kaffee ist schlecht, aber die Leute sind super ☕❤️","Herzlich willkommen 🤝 Die Kabine ist links, der Spiegel ist meistens besetzt 🪞","Neu hier? Keine Sorge, wir beißen nur im Training 😁","Willkommen! Tipp: Nie das Essen vom Kühlschrank-Fach oben rechts nehmen 🥪⚠️"],
  joinRival:["Ich hab gerade beschlossen, ab morgen um 6 zu trainieren 😤⏰","Willkommen… Konkurrenz belebt das Geschäft, oder? 😅","Okay, jetzt wird's ernst. Ich esse ab heute Brokkoli 🥦😤"],
  joinFee:["Einstand ist Pflicht. Kuchen, Getränke, eine Rede 🎂🎤","Einstand bitte mit Schokokuchen. Keine Rosinen 🎂🚫","Neu hier heißt: nächste Runde Kakao geht auf dich ☕😏"],
  leave:["Und wieder ein leerer Spind 🥲","Der Trainer macht ernst 😳","Gruppe wird kleiner, Herz wird schwerer 💔","Ich räum dann mal die Schuhe weg, die dagelassen wurden 👟🥲","Ich schreib jetzt nur noch nett, sonst bin ich der Nächste 😇"],
  cbSermonWin:["Nach der Predigt hab ich mich nicht getraut, auch nur einen Meter weniger zu laufen 😅","Predigt gewirkt. Meine Ohren sind aber immer noch rot 👂🔥","Ich hab die Predigt als Wecker eingestellt. Funktioniert 📢⏰"],
  cbSermonLoss:["Die Ansage war berechtigt. Wir müssen mehr bringen 😓","Wir haben den Trainer gehört. Jetzt müssen wir's zeigen 💪"],
  cbRun:["Hab nach dem Straflauf zwei Tage nur rückwärts Treppen genommen 🪜😵","Der Straflauf hat geholfen. Sagt mein Kopf. Meine Waden sagen was anderes 🦵😭","Ich hab beim Straflauf ein Reh überholt 🦌💨"],
  cbPizzaWin:["Pizza am Abend, Punkte am Tag. Das ist die Formel 🍕📈","Ich schlag vor: Pizza vor jedem Spiel. Für die Wissenschaft 🍕🧪","Ich glaub, die Salami-Pizza hat heute mitgespielt 🍕⚽"],
  cbPizzaLoss:["Nächstes Mal Pizza erst NACH dem Sieg 🍕","Pizza war gut. Der Rest nicht 😓"],
  cbDayOffWin:["Freier Tag, volle Akkus, drei Punkte 🔋⚽","Ich hab am freien Tag 14 Stunden geschlafen. Hat sich gelohnt 😴⚽"],
  cbDayOffLoss:["Freier Tag ist vorbei, jetzt wird wieder gearbeitet 💪"],
  cbPartyWin:["Die Party hat Kraft gegeben. Oder es war der Kaffee danach ☕🎉","Ich hab nach der Party noch getanzt. Im Spiel. Bei jedem Zweikampf 🕺⚽"],
  cbPartyLoss:["Okay, vielleicht war die Party ein bisschen lang 😬"],
  cbBenchScored:["Trainer, die Bank kann mich mal. Mit Respekt 😏⚽","Danke für die Motivation, Trainer. Tor ist für Sie 🫡⚽"],
  cbBenchGood:["Die Bank hat heute auf mich gewartet. Vergeblich 😎","Hab mir das Kissen gar nicht erst ausgepackt 🪑❌"],
  cbBenchBad:["Ich glaub, ich kenn bald jede Schraube an der Bank 🪑🔩","Ich bring nächstes Mal eine Decke mit. Für die Bank 🧣🪑"],
  cbBenchOut:["@[{name}] hat heute die beste Aussicht im Stadion gehabt. Von der Bank 🪑🔭","@[{name}], wie war das Spiel von der Bank? 😂🪑"],
  cbPraisedAgain:["@[{name}] schon wieder. Der Trainer braucht bald eine neue Lieblingsfarbe 🙄😂","Ich glaub, @[{name}] hat das Lob als Treibstoff getankt ⛽😂","@[{name}] liefert, und wir dürfen applaudieren 👏🙄"],
  cbPraisedQuiet:["@[{name}] hat sich wohl auf dem Lob ausgeruht 🛋️😂","Das Lob vom letzten Mal war wohl zu schwer, @[{name}] 😏","@[{name}], die Lob-Batterie ist leer, oder? 🔋😂"],
  leaveBye:["Macht's gut! Und passt auf meinen Spind auf 🫡","Danke für die schöne Zeit. Ich schick euch eine Postkarte 💌","Tschüss, Leute! Ihr wart die Besten ❤️🫡"]
 };
 for(const k of Object.keys(MORE_T))T[k]=[...(T[k]||[]),...MORE_T[k]];
 // Running gags with recurring characters (see castRoles). Lines: [speaker, text]; speaker is a role, "x"/"y" (any
 // other player), "keeper", "captain" or "striker". {late},{dj},... insert the role's short name.
 const GAGS=[
  {id:"bus",lines:[["late","Bin in 5 Minuten am Bus 🏃‍♂️💨"],["x","@[{late}] der Bus steht seit 20 Minuten 😂"],["kasse","Mannschaftskasse +10 € 💶"]]},
  {id:"late2",lines:[["x","Morgen Training um 10. Also 10 Uhr, @[{late}]. Nicht dein 10 Uhr 😂"],["late","Pünktlich wie immer 😇"],["y","😂😂😂"]]},
  {id:"schlager",lines:[["dj","Heute läuft im Bus nur Schlager 🎶😎"],["x","@[{dj}] bitte nicht schon wieder 😭"],["y","Ich hab Kopfhörer dabei 🎧"]]},
  {id:"playlist",lines:[["dj","Neue Kabinen-Playlist ist online 🎧🔥"],["x","Wieder nur 3 Lieder in Dauerschleife 😂"],["dj","Das nennt man Klassiker 😤"]]},
  {id:"banana",lines:[["food","Was gibt's heute zu essen? 🍝"],["x","@[{food}] du hast in der Halbzeit schon 3 Bananen gegessen 🍌🍌🍌"],["food","Ich bin im Wachstum 😤"]]},
  {id:"doener",lines:[["food","Ich hab Döner für alle bestellt 🥙"],["x","Pssst, der Trainer darf das nicht wissen 🤫"],["y","Zu spät, er liest mit 👀"]]},
  {id:"turnier",lines:[["gamer","Footera-Turnier heute Abend? 🎮"],["x","Nur wenn du nicht wieder den Controller wirfst 😂"],["gamer","Das war EINMAL 😤"]]},
  {id:"rage",lines:[["gamer","Wer hat schon wieder meinen Footera-Account benutzt?! Meine Packs sind weg 😭"],["x","Ich nicht 😇"],["y","Ich auch nicht 😇😇"]]},
  {id:"gel",lines:[["style","Hat jemand mein Haargel gesehen? 💇‍♂️"],["x","@[{style}] du hast 90 Minuten nur auf die Videowand geschaut 😂"],["style","Die Frisur muss sitzen, auch beim Kopfball 😎"]]},
  {id:"fit",lines:[["style","Neues Outfit für die Busfahrt. Bewertungen bitte 👔✨"],["x","3/10. Deine Socken passen nicht 🧦😂"],["y","Sieht aus wie mein Opa im Urlaub 😂"]]},
  {id:"kasse",lines:[["kasse","Erinnerung: Mannschaftskasse ist fällig 💶👀"],["x","Ich hab grad kein Bargeld 🙈"],["y","Das kommt jede Woche 😂"]]},
  {id:"schoner",lines:[["x","Wer hat schon wieder meine Schienbeinschoner?"],["y","Die riechen eh komisch 😷"],["x","Die riechen nach Erfolg 😤"]]},
  {id:"kabel",lines:[["x","Hat jemand ein Ladekabel? 🔌"],["y","Wir sind ein Fußballteam, kein Elektromarkt 😂"]]},
  {id:"elfer",lines:[["keeper","Elfmeterduell morgen nach dem Training, @[{striker}]? 🧤"],["striker","Ich hab Angst um deine Finger 😏"],["x","Ich bring Popcorn 🍿"]]},
  {id:"flasche",lines:[["x","Wer hat beim Aufwärmen aus meiner Trinkflasche getrunken 😤"],["y","Da war Wasser drin? Schmeckte nach Apfelschorle 🤔"]]},
  {id:"maskottchen",lines:[["x","Hat jemand gesehen, wie das Maskottchen von {away} ausgerutscht ist? 😂"],["y","Bestes Highlight des Tages 😂🎥"]]},
  {id:"selfie",when:"win",lines:[["style","Siegerfoto in die Gruppe! 📸"],["x","Mein Doppelkinn ist drauf, löschen 😭"],["dj","Zu spät, ist schon mein Profilbild 😂"]]},
  {id:"buslaut",when:"win",lines:[["dj","Die Busfahrt wird LAUT heute 🔊🚌"],["late","Wartet auf mich!!! 🏃‍♂️"]]},
  {id:"traurig",when:"loss",lines:[["x","Heute im Bus lieber leise, oder? 😶"],["dj","Ich hab nur ruhige Lieder dabei 🎻"]]},
  {id:"nochmal",when:"loss",lines:[["x","Wer schaut sich das Spiel nochmal an? 👀"],["y","Ich nicht. Nie wieder. 🙈"]]},
  {id:"eisbad",lines:[["x","Eisbad nach dem Spiel war heute brutal 🥶🛁"],["food","Ich hab danach drei Kakao gebraucht ☕☕☕"]]},
  {id:"oma",lines:[["captain","Meine Oma hat angerufen. Sie fand die Aufstellung mutig 😂👵"],["x","Oma als Co-Trainer, ich bin dafür 🙋"]]}
 ];
 // V21.438: more running gags. After a defeat only the calm ones (calm:true or when:"loss") are told, after a heavy
 // defeat none: when there is trouble the group stays serious.
 GAGS.push(
  {id:"wecker",lines:[["late","Mein Wecker hat heute nicht geklingelt ⏰"],["x","@[{late}] du hast keinen Wecker. Du hast Ausreden 😂"],["late","Beides gleich zuverlässig 😇"]]},
  {id:"navi",lines:[["late","Navi sagt noch 40 Minuten 🚗"],["x","@[{late}] du wohnst 5 Minuten vom Stadion weg 😂"],["late","Ich nehm die landschaftlich schöne Route 🌄"]]},
  {id:"karaoke",when:"win",lines:[["dj","Karaoke im Bus heute. Keine Ausreden 🎤"],["x","Bitte nicht wieder das eine Lied mit dem Refrain, den keiner kann 😭"],["dj","Genau DESWEGEN 😎🎶"]]},
  {id:"aux",lines:[["x","Wer hat @[{dj}] schon wieder das Aux-Kabel gegeben? 😩"],["dj","Das Aux-Kabel hat MICH gewählt 🎧"]]},
  {id:"nudel",lines:[["food","Hab für morgen Nudelsalat gemacht. 4 Kilo 🥗"],["x","@[{food}] für wen?"],["food","Für mich. Ihr kriegt was ab, wenn ihr lieb seid 😇"]]},
  {id:"riegel",calm:true,lines:[["x","Wer hat meinen Proteinriegel aus der Tasche genommen? 😤"],["food","Ich hab nur geguckt, ob er noch gut ist 🫣"]]},
  {id:"lag",lines:[["gamer","Hab heute Nacht bis 3 Footera gezockt 🎮"],["x","Das erklärt deinen ersten Ballkontakt 😂"],["gamer","Das war Lag, Leute 📶"]]},
  {id:"walkout",lines:[["gamer","Ich hab gerade einen Walkout gezogen und bin aus dem Bett gefallen 🎮😱"],["x","Screenshot oder es ist nie passiert 📸"],["gamer","Bin noch am Boden. Schick ich später 🫠"]]},
  {id:"spiegel",lines:[["style","Kabinenspiegel ist ab heute reserviert. Für mich 🪞"],["x","Der war schon immer für dich reserviert 😂"]]},
  {id:"socken",lines:[["style","Neue Stutzen bestellt. Limited Edition 🧦✨"],["x","Es sind weiße Socken 😐"],["style","LIMITIERTE weiße Socken 😤"]]},
  {id:"parfum",lines:[["x","Warum riecht der ganze Bus nach Parfüm? 🤢"],["style","Das heißt Duft, Banause 😌"],["y","Ich riech es noch durch die Jacke 😷"]]},
  {id:"kasse2",calm:true,lines:[["kasse","Neue Regel: Handy in der Besprechung = 5 € 📵💶"],["x","Gilt das auch für den Trainer? 👀"],["kasse","…nächste Frage 😅"]]},
  {id:"kasse3",calm:true,lines:[["kasse","Kassenstand: 312 € und ein Knopf 💶🔘"],["x","Wer zahlt mit Knöpfen?! 😂"],["y","Kein Kommentar 🤐"]]},
  {id:"handschuh",lines:[["keeper","Neue Handschuhe. Die halten alles 🧤✨"],["striker","Morgen 20 Schüsse, @[{keeper}]. Dann reden wir 😏"],["keeper","Bring Pflaster mit 😎"]]},
  {id:"abschlag",lines:[["x","@[{keeper}] warum ging dein Abschlag ins Publikum? 😂"],["keeper","Das war ein Geschenk für die Fans 🎁"]]},
  {id:"knoten",calm:true,lines:[["x","Wer hat meine Schnürsenkel zusammengeknotet? 👟🪢"],["y","Ich war's nicht. Aber Respekt an den Täter 😂"]]},
  {id:"waerme",calm:true,lines:[["x","Hat jemand eine Wärmflasche? Ich spür meine Zehen nicht mehr 🥶"],["y","Ich leih dir meine Mütze. Die von Oma gestrickte 🧶"]]},
  {id:"wlan",lines:[["x","Kabinen-WLAN ist schon wieder tot 📶"],["gamer","Ich war's nicht. Ich hab nur ein Update geladen. 30 GB 😇"]]},
  {id:"teamabend",lines:[["captain","Teamabend nächste Woche: Bowling oder Escape Room? 🎳🔐"],["x","Bowling. Im Escape Room finden wir @[{late}] nie wieder 😂"],["late","Ich find wenigstens den Ausgang 😤"]]},
  {id:"trikot",when:"win",lines:[["x","Hab mit einem von {away} das Trikot getauscht 👕"],["y","Und? Riecht's nach Niederlage? 😏"]]},
  {id:"rasen",lines:[["x","Der Rasen heute war wie ein Teppich 🌱"],["y","Du bist dreimal ohne Gegner hingefallen 😂"],["x","Teppich mit Falten 😤"]]},
  {id:"selfie2",lines:[["x","Das Maskottchen wollte ein Selfie mit mir 📸"],["y","Auf dem Foto weiß man nicht, wer wer ist 😂"]]},
  {id:"interview",when:"win",lines:[["striker","Hab im Interview 4-mal 'am Ende des Tages' gesagt 🎙️"],["x","Am Ende des Tages zählt nur das 😂"],["captain","Am Ende des Tages haben wir gewonnen 😎"]]},
  {id:"fanpost",lines:[["x","Ich hab Fanpost bekommen! 💌"],["y","Von deiner Oma zählt nicht 😂"],["x","…nächste Frage 😤"]]},
  {id:"busplatz",calm:true,lines:[["x","Wer sitzt schon wieder auf MEINEM Platz im Bus? 🚌"],["y","Da steht nirgendwo dein Name 😏"],["x","Doch. Mit Edding. Unter dem Sitz 😤"]]},
  {id:"dehnen",calm:true,lines:[["x","Der Physio meint, ich soll mehr dehnen 🧘"],["y","Du kommst nicht mal an deine Knie 😂"]]},
  {id:"zusammen",when:"loss",lines:[["captain","Morgen Training wie immer. Wir stehen zusammen 🤝"],["x","Bin da. Als Erster 💪"],["late","Ich auch. Versprochen. Pünktlich 🫡"]]},
  {id:"aufarbeiten",when:"loss",lines:[["x","Ich hab mir die Gegentore angeschaut. Das kriegen wir hin 💪"],["captain","Genau so. Nächste Woche zeigen wir's 🤝"]]},
  {id:"kekse",when:"loss",lines:[["food","Ich hab Kekse im Bus. Für alle 🍪"],["x","Danke, das tut gerade gut 🫂"]]},
  {id:"remisfrisur",when:"draw",lines:[["x","Unentschieden. Wie mein Gefühl gerade 😐"],["y","Wenigstens die Frisur von @[{style}] hat gewonnen 💇‍♂️"],["style","Wie immer 😎"]]},
  {id:"remisdj",when:"draw",lines:[["dj","Bus-Playlist heute: halb fröhlich, halb traurig 🎧"],["x","Also wieder Schlager 😂"]]},
  {id:"pfand",calm:true,lines:[["kasse","Wer hat die 40 Pfandflaschen in der Kabine gesammelt? 🍾"],["food","Das ist meine Altersvorsorge 😤"]]},
  {id:"hund",lines:[["x","Mein Hund hat das Spiel mitgeschaut und gebellt, als ich am Ball war 🐶"],["y","Er wollte dir sagen, dass du abspielen sollst 😂"]]},
  {id:"geburtstag",lines:[["captain","Nicht vergessen: @[{food}] hat morgen Geburtstag 🎂"],["food","Ich wünsch mir ein Buffet. Ein großes 🍗🍝🍰"],["x","Wir hatten an eine Karte gedacht 😂"]]}
 );
 for(const g of GAGS)if(["kasse","schoner","kabel","flasche","eisbad","oma"].includes(g.id))g.calm=true;

 /* ---------- recurring characters ---------- */
 // The same player keeps the same role as long as he is in the squad (by uid, not by match).
 const ROLES=["late","dj","food","gamer","style"];
 function castRoles(list,captain){
  const roles={},used=new Set(captain?[keyOf(captain)]:[]);
  if(captain)roles.kasse=captain;
  const field=(Array.isArray(list)?list:[]).filter(p=>p&&p.pos!=="GK");
  for(const r of ROLES){
   const pool=field.filter(p=>!used.has(keyOf(p)));if(!pool.length)break;
   const p=pool.slice().sort((a,b)=>hash(keyOf(a)+"|"+r)-hash(keyOf(b)+"|"+r))[0];roles[r]=p;used.add(keyOf(p));
  }
  return roles;
 }

 /* ---------- match chat (pure, exported for tests) ---------- */
 function matchMessages(d){const r=fresh(d&&d.recentLines,()=>matchRaw(d||{}));r.value.lines=r.used;return r.value}
 function matchRaw(d){
  const s=String(d.seed||""),out=[],spoke=new Map(),MAX=12;
  const P=(Array.isArray(d.players)?d.players:[]).filter(p=>p&&(num(p.minutes)>0||num(p.goals)>0||num(p.assists)>0));
  const gh=num(d.gh),ga=num(d.ga),goals=(Array.isArray(d.goals)?d.goals:[]).slice().sort((a,b)=>num(a.minute)-num(b.minute));
  const pens=gh===ga&&d.pensWinner?d.pensWinner:"",result=gh>ga||pens==="home"?"win":gh<ga||pens==="away"?"loss":"draw";
  const vars={score:`${gh}:${ga}`,away:String(d.away||"Gegner"),home:String(d.home||"Footera Club")};
  const find=(uid,name)=>P.find(p=>uid&&String(p.uid)===String(uid))||P.find(p=>name&&p.name===name)||null;
  const room=(n=1)=>out.filter(m=>m.kind!=="sys").length+n<=MAX;
  const say=(p,text,react=null,force=false)=>{if(!p||!text||(!force&&!room()))return false;spoke.set(keyOf(p),(spoke.get(keyOf(p))||0)+1);out.push({kind:"msg",who:whoOf(p),text,react});return true};
  const quiet=p=>p&&!spoke.has(keyOf(p));
  const byRating=P.slice().sort((a,b)=>num(b.rating)-num(a.rating));
  const keeper=P.find(p=>p.pos==="GK");
  // V21.428: the captain picked in "Aufgaben" (the one with the band), else the best outfield starter.
  const captain=(d.captainUid&&P.find(p=>String(p.uid)===String(d.captainUid)))||P.filter(p=>p.pos!=="GK"&&p.started!==false).sort((a,b)=>num(b.ovr)-num(a.ovr))[0]||byRating[0]||null;
  const voice=(salt,not=[])=>{const pool=P.filter(p=>!not.includes(p)&&quiet(p));return pool.length?pool[hash(s+salt)%pool.length]:null};
  const anyVoice=(salt,not=[])=>voice(salt,not)||(()=>{const pool=P.filter(p=>!not.includes(p));return pool.length?pool[hash(s+salt)%pool.length]:null})();
  const reactN=(salt,min=2,max=9)=>min+hash(s+"r"+salt)%(max-min+1);
  const roles=castRoles(P,captain);
  const prev=(Array.isArray(d.prev)?d.prev:[]).filter(r=>r==="win"||r==="loss"||r==="draw");
  const run=list=>{let n=0;for(let i=list.length-1;i>=0&&list[i]===list[list.length-1];i--)n++;return n};
  const after=[...prev,result],streak=run(after),prevStreak=prev.length?run(prev):0,prevKind=prev[prev.length-1];
  let unbeaten=0;for(let i=after.length-1;i>=0&&after[i]!=="loss";i--)unbeaten++;
  const memo=d.memo&&typeof d.memo==="object"?d.memo:{};

  // Scorers of your team (by uid, name as fallback).
  const tally=new Map();
  for(const g of goals.filter(g=>g.side==="home")){const p=find(g.scorerUid,g.scorer);if(!p)continue;const k=keyOf(p);const t=tally.get(k)||{p,n:0,goals:[]};t.n++;t.goals.push(g);tally.set(k,t)}
  const scorers=[...tally.values()].sort((a,b)=>b.n-a.n||num(a.goals[0].minute)-num(b.goals[0].minute));
  let h=0,a=0,trailed=false,led=false,maxDef=0;for(const g of goals){if(g.side==="home")h++;else a++;if(a>h){trailed=true;maxDef=Math.max(maxDef,a-h)}if(h>a)led=true}
  const last=goals[goals.length-1]||null,late=last&&num(last.minute)>=85;
  const lastDecides=last&&(last.side==="home"?h-1===a&&h>a:a-1===h&&a>h);
  const lateWinner=result==="win"&&!pens&&late&&last.side==="home"&&lastDecides?last:null;
  const lateEq=result==="draw"&&!pens&&gh>0&&late&&last.side==="home"&&h===a?last:null;

  // Facts the coach can answer to later (stored on the "Abpfiff" line).
  const homePotm=d.potm&&d.potm.side==="home"?find(d.potm.uid,d.potm.name):null;
  const best=homePotm||byRating[0]||null;
  const worst=byRating.length>=6?byRating.filter(p=>num(p.minutes)>=30&&p!==best).pop()||null:null;
  const sent=P.find(p=>num(p.reds)>0),booked=P.find(p=>num(p.yellows)>0&&!num(p.reds));
  const injured=d.injuredUid?P.find(p=>String(p.uid)===String(d.injuredUid)):null;
  const jokerT=scorers.find(t=>t.p.started===false);
  const ctxP=p=>p?{...whoOf(p),pos:String(p.pos||""),rating:num(p.rating),goals:num(p.goals)}:null;

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

  // 2) the story around the match: what the coach said last time, streaks, competitions, upsets, weather, night
  const cbVoice=voice("cb");
  if(memo.benched?.uid||memo.benched?.name){
   const b=memo.benched,p=find(b.uid,b.name);
   if(p&&num(p.goals)>0)say(p,pick(T.cbBenchScored,s,"cbb"),{e:"😏",n:reactN("cbb",4,9)},true);
   else if(p&&num(p.rating)>=7)say(p,pick(T.cbBenchGood,s,"cbb"),null,true);
   else if(p&&num(p.minutes)>0)say(p,pick(T.cbBenchBad,s,"cbb"),{e:"🪑",n:reactN("cbb",2,6)},true);
   else{const m=voice("cbo");if(m)say(m,fill(pick(T.cbBenchOut,s,"cbo"),{name:short(b.name)}),{e:"😂",n:reactN("cbo",3,8)},true)}
  }
  if(memo.praised?.uid||memo.praised?.name){
   const b=memo.praised,p=find(b.uid,b.name),m=voice("cbp",[p]);
   if(p&&m)say(m,fill(pick(num(p.goals)>0||num(p.rating)>=7.5?T.cbPraisedAgain:T.cbPraisedQuiet,s,"cbp"),{name:short(p.name)}),{e:"😂",n:reactN("cbp",2,7)});
  }
  const cbWin=result==="win";
  if(memo.sermon&&captain)say(quiet(captain)?captain:cbVoice,pick(cbWin?T.cbSermonWin:T.cbSermonLoss,s,"cbs"),{e:cbWin?"😅":"😬",n:reactN("cbs",2,7)});
  else if(memo.run)say(cbVoice,pick(T.cbRun,s,"cbr"),{e:"🦵",n:reactN("cbr",2,6)});
  else if(memo.party)say(roles.dj&&quiet(roles.dj)?roles.dj:cbVoice,pick(cbWin?T.cbPartyWin:T.cbPartyLoss,s,"cbq"));
  else if(memo.pizza)say(roles.food&&quiet(roles.food)?roles.food:cbVoice,pick(cbWin?T.cbPizzaWin:T.cbPizzaLoss,s,"cbz"),{e:"🍕",n:reactN("cbz",2,7)});
  else if(memo.dayoff)say(cbVoice,pick(cbWin?T.cbDayOffWin:T.cbDayOffLoss,s,"cbd"));

  const story=[],extra=[];
  if(result==="win"&&streak>=3)story.push(()=>say(voice("ws")||captain,fill(pick(T.winStreak,s,"ws"),{n:streak}),{e:"🔥",n:reactN("ws",5,11)}));
  else if(result==="win"&&prevKind==="loss"&&prevStreak>=2)story.push(()=>say(voice("lb")||captain,pick(T.lossBreak,s,"lb"),{e:"🙏",n:reactN("lb",5,11)}));
  else if(result!=="win"&&prevKind==="win"&&prevStreak>=3)story.push(()=>say(voice("se")||captain,fill(pick(T.streakEnd,s,"se"),{n:prevStreak})));
  else if(result==="loss"&&streak>=3)story.push(()=>say(voice("ls")||captain,fill(pick(T.lossStreak,s,"ls"),{n:streak}),{e:"😶",n:reactN("ls",2,6)}));
  else if(result==="draw"&&unbeaten>=5)story.push(()=>say(voice("ub"),fill(pick(T.unbeaten,s,"ub"),{n:unbeaten}),{e:"🛡️",n:reactN("ub",3,8)}));
  const mode=String(d.mode||""),good=result==="win";
  const modeKey=d.tournament||mode==="tournament"?"tournament":mode==="rivals"?"rivals":mode==="champions"?"champions":"";
  if(modeKey&&result!=="draw")extra.push(()=>say(voice("md"),fill(pick(T[modeKey+(good?"Win":"Loss")],s,"md"),vars)));
  const gap=num(d.opp)-num(d.power);
  if(num(d.opp)&&num(d.power)&&good&&gap>=4)extra.push(()=>say(voice("up"),fill(pick(T.upsetWin,s,"up"),vars),{e:"🦁",n:reactN("up",3,9)}));
  else if(num(d.opp)&&num(d.power)&&result==="loss"&&gap<=-6)extra.push(()=>say(voice("up"),fill(pick(T.upsetLoss,s,"up"),vars)));
  const weather=String(d.weather||"");
  if(weather==="rain"||weather==="snow")extra.push(()=>say(voice("wx"),pick(T[weather],s,"wx"),{e:weather==="snow"?"❄️":"🌧️",n:reactN("wx",2,7)}));
  const hour=d.hour==null?-1:num(d.hour);
  if(hour>=0&&hour<5)extra.push(()=>say(voice("nt"),fill(pick(T.night,s,"nt"),{time:String(hour).padStart(2,"0")+":"+String(num(d.minute)%60).padStart(2,"0")}),{e:"😴",n:reactN("nt",2,7)}));
  else if(hour>=5&&hour<8&&good)extra.push(()=>say(voice("mo"),pick(T.morning,s,"mo")));
  // at most two story lines per match, the rest is kept for another night
  // (a streak always counts; the competition, an upset, the weather or the hour rotate)
  const rot=extra.length?hash(s+"story")%extra.length:0;
  [...story,...extra.slice(rot),...extra.slice(0,rot)].slice(0,2).forEach(f=>f());

  // 3) scorers that have not spoken yet, then the assist
  for(const t of scorers.slice(0,3)){
   if(!quiet(t.p))continue;
   const sub=t.p.started===false;
   const type=t.goals.find(g=>g.type==="freekick")?"freekick":t.goals.find(g=>g.type==="penalty")?"penalty":t.goals.find(g=>g.type==="solo")?"solo":"";
   const text=sub?pick(T.joker,s,"j"+t.p.name):t.n===2?pick(T.brace,s,"b"+t.p.name):pick(type?T["goal_"+type]:T.goal,s,"g"+t.p.name);
   say(t.p,text,{e:sub?"🃏":"⚽",n:reactN("g"+t.p.name,2,8)});
  }
  const assisted=goals.find(g=>g.side==="home"&&(g.assistUid||g.assist)&&quiet(find(g.assistUid,g.assist)));
  if(assisted){const p=find(assisted.assistUid,assisted.assist),sc=find(assisted.scorerUid,assisted.scorer);if(p&&sc&&p!==sc)say(p,fill(pick(T.assist,s,"a"),{scorer:short(sc.name)}),{e:"😂",n:reactN("a",1,5)})}

  // 4) keeper, cards, injury, low performer, sub
  if(keeper&&quiet(keeper)){
   if(ga===0&&num(keeper.minutes)>=60)say(keeper,pick(T.cleanSheet,s,"cs"),{e:"🧤",n:reactN("cs",3,9)});
   else if(num(keeper.saves)>=4)say(keeper,fill(pick(T.saves,s,"sv"),{n:num(keeper.saves)}),{e:"🧤",n:reactN("sv",3,8)});
   else if(ga>=3)say(keeper,pick(T.keeperBad,s,"kb"),{e:"🫂",n:reactN("kb",2,5)});
  }
  if(sent){say(sent,pick(T.red,s,"rc"),{e:"😬",n:reactN("rc",2,6)},true);const mate=quiet(captain)&&captain!==sent?captain:voice("rm",[sent]);if(mate)say(mate,pick(result==="loss"?T.redLoss:T.redWin,s,"rm"),null,true)}
  else if(booked&&quiet(booked)&&room(2)&&hash(s+"yc")%2===0){say(booked,pick(T.yellow,s,"yc"));const k=roles.kasse&&roles.kasse!==booked?roles.kasse:voice("ycr",[booked]);if(k)say(k,pick(T.yellowReply,s,"ycr"),{e:"💶",n:reactN("ycr",2,6)})}
  if(injured){say(injured,pick(T.injury,s,"inj"),{e:"🙏",n:reactN("inj",4,10)},true);const m=anyVoice("injr",[injured]);if(m&&m!==injured)say(m,pick(T.injuryReply,s,"injr"),null,true)}
  if(result!=="loss"){const sub=P.find(p=>p.started===false&&num(p.minutes)>0&&quiet(p));if(sub)say(sub,fill(pick(T.sub,s,"sb"),{m:Math.max(1,Math.round(num(sub.minutes)))}))}
  const low=byRating.length>=8?byRating[byRating.length-1]:null;
  if(low&&num(low.rating)>0&&num(low.rating)<6&&num(low.minutes)>=45&&quiet(low))say(low,fill(pick(T.low,s,"lo"),{r:num(low.rating).toFixed(1)}));

  // 5) player of the match
  const potm=d.potm;
  if(potm&&potm.side==="home"){
   const p=find(potm.uid,potm.name),mate=voice("pt",[p]);
   if(p&&mate&&say(mate,fill(pick(T.potmTease,s,"pt"),{potm:short(p.name),r:num(potm.rating).toFixed(1)}),{e:"👑",n:reactN("pt",4,10)}))say(p,pick(T.potmReply,s,"pr"),{e:"❤️",n:reactN("pr",2,7)},true);
  }else if(potm&&potm.side==="away"&&potm.name){const p=voice("pa");if(p)say(p,fill(pick(T.potmAway,s,"pa"),{...vars,name:short(potm.name)}))}

  // 6) running gags: one per match (two on a quiet night), never one of the last few again
  const recent=new Set(Array.isArray(d.recentGags)?d.recentGags:[]),usedGags=[];
  const striker=P.filter(p=>["ST","CF"].includes(p.pos)).sort((x,y)=>num(y.ovr)-num(x.ovr))[0]||null;
  // V21.438: when there is trouble the jokes stop: after a defeat only calm gags, after a heavy one or a red card none.
  const trouble=result==="loss"||!!sent||ga-gh>=3;
  const tone=g=>result==="loss"?g.when==="loss"||(g.calm&&!g.when):!g.when||g.when===result;
  const tryGag=salt=>{
   if(result==="loss"&&(ga-gh>=3||sent))return false;
   const pool=GAGS.filter(g=>tone(g)&&!recent.has(g.id)&&!usedGags.includes(g.id));
   const list=pool.length?pool:GAGS.filter(g=>tone(g)&&!usedGags.includes(g.id));
   for(let i=0;i<list.length;i++){
    const g=list[(hash(s+salt)+i)%list.length];
    const cast={...roles,keeper,captain,striker},taken=new Set();
    for(const [r] of g.lines)if(cast[r])taken.add(keyOf(cast[r]));
    const others=P.filter(p=>!taken.has(keyOf(p))).sort((x,y)=>hash(s+salt+keyOf(x))-hash(s+salt+keyOf(y)));
    cast.x=others[0]||null;cast.y=others[1]||null;
    if(g.lines.some(([r])=>!cast[r]))continue;
    if(!room(g.lines.length))return false;
    const gv={...vars};for(const r of [...ROLES,"kasse","striker"])if(cast[r])gv[r]=short(cast[r].name);
    g.lines.forEach(([r,t],k)=>say(cast[r],fill(t,gv),k===g.lines.length-1&&hash(s+g.id)%3===0?{e:"😂",n:reactN(g.id,3,9)}:null));
    usedGags.push(g.id);return true;
   }
   return false;
  };
  tryGag("gag");
  if(out.filter(m=>m.kind!=="sys").length<=6)tryGag("gag2");

  // 7) mood of the dressing room and the party after a win
  const mood=d.mood==null?60:num(d.mood);
  if(mood<=30)say(voice("ml")||captain,pick(T.moodLow,s,"ml"));
  else if(mood>=85&&good)say(voice("mh"),pick(T.moodHigh,s,"mh"),{e:"❤️",n:reactN("mh",4,9)});
  if(good){const p=voice("party");if(p)say(p,pick(T.party,s,"party"),{e:"🎶",n:reactN("party",2,7)})}

  // 8) V21.438: a player sends a meme (not after a defeat or a red card); a different one every time
  if(!trouble&&out.filter(m=>m.kind!=="sys").length<=9&&hash(s+"meme")%5<3){
   const mv={...vars};for(const r of ROLES)if(roles[r])mv[r]=short(roles[r].name);if(keeper)mv.keeper=short(keeper.name);if(striker)mv.striker=short(striker.name);
   const who=roles.gamer&&quiet(roles.gamer)?roles.gamer:voice("meme")||anyVoice("meme");
   const meme=who&&room()?memeFor(result,"team",s,d.recentMemes,mv):null;
   if(meme){const m=memeMsg("msg",meme,who);m.react={e:"😂",n:reactN("meme",3,10)};spoke.set(keyOf(who),(spoke.get(keyOf(who))||0)+1);out.push(m)}
  }

  // 9) V21.443: after a cup final the captain posts the victory photo from the dressing room, with the trophy
  if(result==="win"&&d.final&&captain)out.push({kind:"msg",who:whoOf(captain),text:pick(T.titlePhoto,s,"tp"),photo:{seed:s+"|title",title:true,gh,ga},react:{e:"🏆",n:reactN("tp",8,14)}});

  const ctx={type:"match",result,gh,ga,away:vars.away,mode,final:!!d.final,best:ctxP(best),worst:ctxP(worst&&num(worst.rating)<6.6?worst:null),
   red:ctxP(sent),yellow:ctxP(booked),joker:ctxP(jokerT?.p),keeper:keeper?{...ctxP(keeper),clean:ga===0&&num(keeper.minutes)>=60,saves:num(keeper.saves)}:null,
   captain:ctxP(captain),injured:ctxP(injured),gags:usedGags,players:P.slice(0,18).map(p=>({...whoOf(p),pos:String(p.pos||"")}))};
  out[0].ctx=ctx;
  return{result,messages:out,ctx};
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
 function berlinTime(at=Date.now()){
  try{const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(at));return{hour:num(parts.find(p=>p.type==="hour")?.value),minute:num(parts.find(p=>p.type==="minute")?.value)}}
  catch(e){const d=new Date(at);return{hour:d.getHours(),minute:d.getMinutes()}}
 }
 function history(v){
  const ctxs=v.msgs.filter(m=>m.kind==="sys"&&String(m.ref).startsWith("m:")&&(m.ctx||m.result));
  return{results:ctxs.map(m=>m.ctx?.result||m.result).slice(-12),gags:ctxs.flatMap(m=>m.ctx?.gags||[]).slice(-10)};
 }
 function fromMatch(m,v=read(),at=Date.now()){
  if(!m||typeof matchReportPerformanceRows!=="function")return null;
  const rows=matchReportPerformanceRows("home"),potm=typeof matchReportPotm==="function"?matchReportPotm():null;
  const starters=new Set((m.initialStarters||[]).map(String));
  const players=rows.map(r=>({name:String(r.base?.name||r.name||"Spieler"),uid:String(r.uid||""),pid:String(r.base?.id||""),pos:String(r.position||r.base?.position||"").toUpperCase(),
   ovr:num(r.base?.ovr),rating:num(r.rating),goals:num(r.goals),assists:num(r.assists),minutes:num(r.minutes),saves:num(r.saves),reds:num(r.reds),yellows:num(r.yellows),started:starters.size?starters.has(String(r.uid)):true}));
  const hist=history(v),t=berlinTime(at);
  return{
   seed:matchRef(m),home:typeof matchHomeTeamName==="function"?matchHomeTeamName():"Footera Club",away:typeof matchAwayTeamName==="function"?matchAwayTeamName():"Gegner",
   gh:m.home,ga:m.away,pensWinner:m.penaltyWinner,pensHome:m.pensHome,pensAway:m.pensAway,extraTime:!!m.extraTimeStarted,mode:m.mode,tournament:!!m.tournament,final:!!(m.tournament&&num(m.tournament.stage)===3),
   opp:num(m.opp),power:num(m.power),captainUid:String(m.assignments?.captain||""),weather:String(m.weather?.kind||""),injuredUid:m.injuryTriggered&&m.forcedOut?String(m.forcedOut):"",
   hour:t.hour,minute:t.minute,prev:hist.results,recentGags:hist.gags,recentLines:Array.isArray(v.lines)?v.lines:[],recentMemes:recentMemes(v),memo:v.memo,mood:v.mood,
   goals:(m.goalEvents||[]).map(g=>({side:g.side,minute:num(g.minute),scorer:String(g.scorer||""),scorerUid:String(g.scorerUid||""),assist:String(g.assist||""),assistUid:String(g.assistUid||""),type:g.type})),
   players,potm:potm?{name:String(potm.base?.name||potm.name||""),uid:String(potm.uid||""),side:potm.side,rating:num(potm.rating)}:null
  };
 }
 // V21.443 Siegerfoto: who is on the photo and how they look, from the live club (names, squad numbers,
 // skin/hair from the player looks, club kit and crest). Only copies; nothing in the save changes.
 function photoSquad(c){
  const out={players:[],club:clubName(),crestHTML:"",kit:null,keeperKit:null};
  try{
   const capUid=String(c?.captain?.uid||""),capName=String(c?.captain?.name||"");
   out.players=(Array.isArray(c?.players)?c.players:[]).slice(0,16).map(p=>{
    const b=baseFor(p),looks=typeof FooteraPlayerLooks!=="undefined"?FooteraPlayerLooks:null;
    let number=null;try{number=typeof FooteraShirtNumbers!=="undefined"&&p.uid?FooteraShirtNumbers.get(p.uid):null}catch(e){}
    return{name:String(p.name||""),uid:String(p.uid||""),number:Number.isInteger(number)?number:null,keeper:p.pos==="GK",captain:capUid?String(p.uid)===capUid:!!capName&&p.name===capName,
     skin:b&&looks?looks.sceneSkin(b):null,look:b&&looks?looks.sceneLook(b):null};
   });
   const used=new Set(out.players.map(p=>p.number).filter(Boolean));let n=2;
   out.players.forEach(p=>{if(!p.number){if(p.keeper&&!used.has(1)){p.number=1;used.add(1);return}while(used.has(n))n++;p.number=n;used.add(n)}});
   const id=typeof clubIdentitySnapshot==="function"?clubIdentitySnapshot():null,k=id?.kits?.home;
   if(k)out.kit={shirt:k.shirtPrimary,shirtSecondary:k.shirtSecondary,pattern:k.pattern,shorts:k.shorts,socks:k.socks};
   const shirt=/^#[0-9a-f]{6}$/i.test(String(k?.shirtPrimary||""))?String(k.shirtPrimary):"#971d42";
   const far=hex=>{const a=parseInt(hex.slice(1),16),b=parseInt(shirt.slice(1),16);return Math.hypot((a>>16&255)-(b>>16&255),(a>>8&255)-(b>>8&255),(a&255)-(b&255))>140};
   const gk=["#f4b52b","#10bda7","#bc63e8","#42e2ee"].find(far)||"#42e2ee";
   out.keeperKit={shirt:gk,shirtSecondary:"#16191d",pattern:"solid",shorts:"#16191d",socks:gk};
   if(id&&typeof crestHTML==="function")out.crestHTML=String(crestHTML(id,true)||"");
  }catch(e){}
  return out;
 }
 const withPhotoSquad=(list,c)=>list.map(m=>m.photo?{...m,photo:{...m.photo,...photoSquad(c)}}:m);
 // After a match the coach's last words are used up and the mood moves with the result.
 const MOOD_RESULT={win:4,draw:0,loss:-5};
 function afterMatch(m){
  try{
   const live=m||(typeof match!=="undefined"?match:null);
   if(!live?.finished||live.kabineRecorded)return 0;
   const d=fromMatch(live);if(!d||!d.players.length)return 0;
   live.kabineRecorded=true;
   const {result,messages,lines,ctx}=matchMessages(d);
   return append(d.seed,withPhotoSquad(messages,ctx).map(x=>({...x,result})),{update:v=>{v.memo={};v.mood=clamp(v.mood+(MOOD_RESULT[result]||0),0,100);keepLines(v,lines||[])}});
  }catch(e){console.warn("Kabinen-Chat:",e);return 0}
 }
 function squadVoices(exclude=new Set()){
  try{
   const items=typeof squadItems==="function"?squadItems().filter(Boolean):[];
   return items.filter(i=>!exclude.has(String(i.uid))).map(i=>({item:i,b:typeof displayBase==="function"?displayBase(i):null})).filter(x=>x.b)
    .sort((x,y)=>num(y.b.ovr)-num(x.b.ovr)).map(x=>({name:String(x.b.name||"Spieler"),uid:String(x.item.uid||""),pid:String(x.b.id||""),pos:String(x.b.position||"").toUpperCase()}));
  }catch(e){return[]}
 }
 function ratingOf(item,b){try{return num(typeof itemRating==="function"?itemRating(item):b?.ovr)||num(b?.ovr)}catch(e){return num(b?.ovr)}}
 // The best new signing of a pack (84+, special cards and icons) joins the group.
 function joinMessages(newcomer,voices,seed,recentM=[]){
  const out=[{kind:"sys",text:`Trainer hat ${newcomer.name} hinzugefügt`,ctx:{type:"pack",n:whoOf(newcomer),icon:!!newcomer.icon,pos:String(newcomer.pos||""),players:voices.slice(0,8).map(v=>({...whoOf(v),pos:String(v.pos||"")}))}}];
  out.push({kind:"msg",who:whoOf(newcomer),text:pick(T.join,seed,"j")});
  const mates=voices.filter(v=>v.uid!==newcomer.uid&&v.name!==newcomer.name);
  const top=mates.slice(0,4);
  if(top.length){const m=top[hash(seed+"m")%top.length];out.push({kind:"msg",who:whoOf(m),text:newcomer.icon?pick(T.joinIcon,seed,"ji"):pick(T.joinReply,seed,"jr"),react:{e:"🔥",n:2+hash(seed+"jn")%6}})}
  const rival=newcomer.pos&&mates.find(v=>v.pos&&v.pos===newcomer.pos&&!out.some(o=>o.who?.uid===v.uid));
  if(rival)out.push({kind:"msg",who:whoOf(rival),text:pick(T.joinRival,seed,"jv"),react:{e:"😂",n:2+hash(seed+"jvn")%5}});
  else{const f=mates.find(v=>!out.some(o=>o.who?.uid===v.uid));if(f&&hash(seed+"fee")%2===0)out.push({kind:"msg",who:whoOf(f),text:pick(T.joinFee,seed,"jf")})}
  // V21.438: sometimes a teammate welcomes the signing with a meme
  const mm=mates.find(v=>!out.some(o=>o.who?.uid===v.uid));
  if(mm&&hash(seed+"jmeme")%2===0){const m=memeMsg("msg",memeFor("pack","team",seed,recentM,{N:short(newcomer.name)}),mm);if(m){m.react={e:"😂",n:2+hash(seed+"jmn")%6};out.push(m)}}
  return out;
 }
 // V21.447 Spielervorstellung: after a big pull the newcomer's own first message carries his presentation photo.
 const SIGN_TEXT=["📸 Offizielles Vorstellungsfoto ist raus!","Erstes Foto im neuen Trikot 📸✍️","Vertrag unterschrieben, Foto gemacht. Los geht's ✍️📸","Die Fotografen haben mich nicht mehr losgelassen 📸😅"];
 function withSigningPhoto(list,item,ref){
  try{
   const S=root.FooteraSigning;if(!S||!item)return list;
   const spec=S.spec(item,{seed:ref+"|sign"});if(!spec)return list;
   const i=list.findIndex(m=>m.kind==="msg");if(i<0)return list;
   const out=list.slice();out.splice(i+1,0,{kind:"msg",who:list[i].who,text:pick(SIGN_TEXT,ref,"sg"),photo:{...spec,signing:true},react:{e:"🔥",n:3+hash(ref+"sgn")%8}});
   return out;
  }catch(e){return list}
 }
 function afterPack(items){
  try{
   if(!Array.isArray(items)||!items.length||typeof displayBase!=="function")return 0;
   const ranked=items.map(item=>{const b=displayBase(item);return b?{item,b,ovr:ratingOf(item,b),special:item.variant==="special"||item.variant==="icon-mid"||!!b.isIcon}:null}).filter(Boolean)
    .filter(x=>x.ovr>=84||(x.special&&x.ovr>=80)).sort((x,y)=>y.ovr-x.ovr);
   const best=ranked[0];if(!best)return 0;
   const newcomer={name:String(best.b.name||"Spieler"),uid:String(best.item.uid||""),pid:String(best.b.id||""),icon:!!best.b.isIcon,pos:String(best.b.position||"").toUpperCase()};
   const ref="p:"+(newcomer.uid||newcomer.pid+"|"+Date.now());
   const v=read(),r=fresh(v.lines,()=>joinMessages(newcomer,squadVoices(new Set([newcomer.uid])),ref,recentMemes(v)));
   // V21.447: the new signing posts his presentation photo (shirt or scarf in front of the press wall)
   const list=withSigningPhoto(r.value,best.item,ref);
   return append(ref,list,{update:x=>keepLines(x,r.used)});
  }catch(e){console.warn("Kabinen-Chat:",e);return 0}
 }
 function leaveMessages(names,more,voices,seed,leaver=null,recentM=[]){
  const list=more>0?`${names.join(", ")} und ${more} weitere`:names.join(" und ");
  const out=[];
  if(leaver)out.push({kind:"msg",who:whoOf(leaver),text:pick(T.leaveBye,seed,"lb"),react:{e:"🫡",n:3+hash(seed+"lbn")%7}});
  out.push({kind:"sys",text:`${list} ${names.length+more>1?"haben":"hat"} die Gruppe verlassen (SBC)`,ctx:{type:"sbc",gone:names.slice(0,2),players:voices.slice(0,8).map(v=>({...whoOf(v),pos:String(v.pos||"")}))}});
  const first=voices.length?voices[hash(seed)%Math.min(3,voices.length)]:null;
  if(first)out.push({kind:"msg",who:whoOf(first),text:pick(T.leave,seed,"l")});
  const mm=voices.find(v=>v!==first);
  if(mm&&hash(seed+"smeme")%5<2){const m=memeMsg("msg",memeFor("sbc","team",seed,recentM,{}),mm);if(m)out.push(m)}
  return out;
 }
 // Players handed in for an SBC leave the group (only when a 82+ player was among them).
 function afterSbc(items){
  try{
   if(!Array.isArray(items)||!items.length||typeof displayBase!=="function")return 0;
   const gone=items.map(i=>{const b=displayBase(i);return b?{name:String(b.name||"Spieler"),ovr:ratingOf(i,b),uid:String(i.uid||""),pid:String(b.id||"")}:null}).filter(Boolean).sort((x,y)=>y.ovr-x.ovr);
   if(!gone.length||gone[0].ovr<82)return 0;
   const top=gone.slice(0,2).map(x=>x.name),ref="s:"+gone.map(x=>x.uid).join(",").slice(0,180);
   const v=read(),r=fresh(v.lines,()=>leaveMessages(top,gone.length-top.length,squadVoices(new Set(gone.map(x=>x.uid))),ref,gone[0],recentMemes(v)));
   return append(ref,r.value,{update:x=>keepLines(x,r.used)});
  }catch(e){console.warn("Kabinen-Chat:",e);return 0}
 }

 /* ---------- the coach ---------- */
 // Each option: when(ctx) -> available, coach text(s), reactions [speaker, texts, when?], mood change, memo for next match.
 // Speakers: best/worst/red/joker/keeper/captain/new (pack signing), roles (late/dj/food/gamer/style/kasse),
 // x/y/z = other players. "a|b" = first available.
 const W=c=>c.result==="win",NL=c=>c.result!=="win";
 const COACH={
  praiseBest:{label:c=>`⭐ ${short(c.best.name)} loben`,when:c=>c.type==="match"&&c.best,mood:8,memo:c=>({praised:{uid:c.best.uid,name:c.best.name}}),
   say:["@[{B}] Weltklasse heute! 👑 So will ich das sehen.","@[{B}], so spielt ein Anführer! 👏","Ein Extra-Lob an @[{B}]. Note {r}! 🔥","@[{B}] ich hab Gänsehaut bekommen. Danke! 🙌","@[{B}] wenn du so weiterspielst, muss ich dir ein Denkmal bauen 🗿👏","@[{B}] Note {r}. Ich hab's ausgedruckt und an den Kühlschrank gehängt 🧲📄","@[{B}] heute warst du nicht von dieser Welt 👽🔥","Ich sag's nur einmal, @[{B}]: überragend. Und jetzt nicht abheben 😏"],
   re:[["best",["Danke Trainer 🥹 Ich geb's an die Jungs weiter","Krieg ich jetzt die Kapitänsbinde? 😏","Screenshot gemacht. Kommt ins Profil 📸😂","Ich weiß, Trainer. Ich weiß 😎","Kann ich das Lob auch in Urlaubstagen haben? 🏖️😇","Meine Mama hat geweint 🥹","Ich hab mich gerade selbst geliked 👍😂"]],
    ["x",["Trainerliebling 😂","Und wer hat die Bälle aufgelegt? 🙄","@[{B}] muss jetzt die ganze Woche Kaffee holen ☕😂","Schleimer-Alarm 🚨😂","Jetzt hebt @[{B}] komplett ab 🚀😂","@[{B}] trägt ab morgen eine Krone im Training 👑🙄","Ich hab übrigens auch mitgespielt. Nur so 🙋","Wir brauchen eine größere Kabinentür für @[{B}]s Ego 🚪😂"]],
    ["keeper",["Ich hab übrigens auch gespielt 🧤😤","Hallo? Weiße Weste? 🧤👀","Und wer hat hinten alles weggefangen? 🧤🙄"],c=>c.keeper&&c.keeper.clean&&c.keeper.uid!==c.best.uid],
    ["y",["Ab morgen trägt @[{B}] die Nase noch höher 👃😂","Ich will auch gelobt werden 🥺","Kann man den Chat stumm schalten, bevor jetzt wieder angegeben wird? 🔕😂","Nächstes Mal bin ich dran, Trainer 😤","Ich lob mich jetzt einfach selbst: gut gemacht, ich 👏😂"]],
    ["best",["Neid ist die höchste Form der Anerkennung 😎","Ihr dürft mir ab jetzt die Tasche tragen 😂","Autogramme gibt's morgen nach dem Training ✍️"],c=>hash(c.best.name)%2===0]]},
  praiseKeeper:{label:c=>`🧤 ${short(c.keeper.name)} feiern`,when:c=>c.type==="match"&&c.keeper&&(c.keeper.clean||c.keeper.saves>=4)&&c.best?.uid!==c.keeper.uid,mood:5,
   say:["@[{K}] du warst heute eine Wand 🧱🧤","@[{K}] Hände aus Gold heute 🧤✨","@[{K}] ich hab das Tor mal vermessen. Es war heute kleiner. Wegen dir 📏🧤","@[{K}] du hast heute mehr gehalten als mein Kühlschrank 🧊🧤"],
   re:[["keeper",["Endlich sieht's mal einer 🥹🧤","Ich nehm Lob auch in Form von Pizza 🍕🧤","Hab ich doch gesagt: Die Ecke gehört mir 😎","Meine Handschuhe bedanken sich 🧤🙏"]],["x",["Hände aus Klebstoff 🧤✨","Ohne dich wär das heute nix geworden 🙏","Unser Torwart: Wand, Krake und Held in einem 🐙🧱","Ich hab mich beim Konter nur auf dich verlassen. Hat geklappt 😅"]]]},
  praiseJoker:{label:c=>`🃏 ${short(c.joker.name)} feiern`,when:c=>c.type==="match"&&c.joker&&c.best?.uid!==c.joker.uid,mood:5,
   say:["Was ein Joker, @[{J}]! 🃏🔥","@[{J}] rein, Tor, Held. So einfach 🃏","@[{J}] die beste Einwechslung meiner Karriere. Und ich wechsle viel ein 🃏😎"],
   re:[["joker",["Nächstes Mal Startelf? 👀😏","Die Bank hat mich heiß gemacht 🔥","Ich hab auf der Bank schon mal das Tor visualisiert 🧘⚽"]],["x",["Jetzt will @[{J}] bestimmt mehr Gehalt 💰😂","Super-Sub! 🦸","Joker sticht. Und wir haben alle gezittert 🃏😅"]]]},
  praiseTeam:{label:()=>"👏 Alle loben",when:c=>c.type==="match"&&c.result!=="loss",mood:6,
   say:["Stark, Leute! Jeder einzelne 👏","Ich bin stolz auf euch. Wirklich. 🫶","So sieht ein Team aus 💪","Ich hab beim Zuschauen vergessen, Kaffee zu trinken. So gut wart ihr ☕👏","Heute habt ihr mir die Arbeit leicht gemacht. Das darf öfter passieren 😌","Wer heute nicht stolz ist, hat nicht zugeschaut 🫶"],
   re:[["captain",["Danke, Trainer! 🙌","Wir geben das Lob an die Fans weiter 🙌","Das war für Sie, Trainer 🫡"]],["x",["💪💪💪","Trainer wird emotional 🥹😂","Ich hab's mir eingerahmt 🖼️","Kann ich das schriftlich haben? Für meinen Berater 📄😂","Ich hab Gänsehaut. Oder das ist noch vom Eisbad 🥶"]],["y",["Teamwork makes the dream work 🤝","Gruppenkuscheln! 🫂😂"]]]},
  cheerUp:{label:()=>"🫂 Aufbauen",when:c=>c.type==="match"&&c.result==="loss",mood:6,
   say:["Kopf hoch, Leute. Ich glaub an euch. 🫂","Eine Niederlage macht uns nicht kaputt. Wir kommen zurück! 💪","Heute hat's nicht gereicht. Aber ich hab gesehen, wie ihr gekämpft habt. Darauf bauen wir 🤝","Wir verlieren zusammen und wir stehen zusammen wieder auf 💪"],
   re:[["captain",["Wir zahlen das zurück, versprochen 🤝","Danke, Trainer. Das brauchten wir 🙏","Wir sind bereit für die nächste Woche 💪"]],["x",["❤️","Nächstes Spiel geht's richtig ab 😤","Danke Trainer, das tut gut 🙏","Morgen bin ich als Erster da 💪"]]]},
  criticize:{label:c=>`😤 ${short(c.worst.name)} kritisieren`,when:c=>c.type==="match"&&c.worst&&c.worst.uid!==c.best?.uid,mood:-4,
   say:["@[{W}] das war heute zu wenig. Da erwarte ich mehr.","@[{W}], wir müssen reden. Morgen 10 Uhr, mein Büro 🚪","@[{W}] Note {wr}… ich sag lieber nix 😶","@[{W}] ich weiß, dass du mehr kannst. Das will ich nächste Woche sehen.","@[{W}] Note {wr}. Das ist nicht dein Anspruch und nicht meiner."],
   re:[["worst",["Ich weiß, Trainer. Kommt nicht wieder 🙏","War der Rasen! 😤 …okay, war ich.","Autsch. Aber berechtigt 😓","Kann ich das Büro-Gespräch per Sprachnachricht machen? 😅","Verstanden. Ich bin morgen eine Stunde früher da 💪"]],
    ["x",["Uiuiui 😬","Ich hol schon mal Popcorn 🍿","Oha, er hat 'wir müssen reden' geschrieben 😳","Ich sag heute einfach nichts mehr 🤐"]],["y",["Kopf hoch @[{W}] 🫂","Ich war auch nicht viel besser, psst 🤫","@[{W}] wir trainieren morgen zusammen extra 🤝"]]]},
  coffee:{label:c=>`☕ ${short(c.worst.name)} zum Gespräch einladen`,when:c=>c.type==="match"&&c.worst&&c.worst.uid!==c.best?.uid,mood:4,
   say:["@[{W}] komm morgen auf einen Kaffee vorbei. Wir reden in Ruhe ☕","@[{W}] Kopf hoch. Ich glaub an dich. Morgen Kaffee? ☕","@[{W}] jeder hat mal so ein Spiel. Wir schauen es uns morgen zusammen an ☕🤝"],
   re:[["worst",["Danke Trainer, das bedeutet mir viel 🙏","Bin da. Ich bring Kekse mit 🍪","Danke. Ich zeig nächste Woche ein anderes Gesicht 💪"]],["x",["Starker Trainer 🤝","@[{W}] wir stehen hinter dir 🫂","So geht Führung 👏"]],["y",["❤️","Ehrenmann, Trainer 🙌","@[{W}] wird schon wieder 💪"]]]},
  bench:{label:c=>`🪑 ${short(c.worst.name)} mit Bank drohen`,when:c=>c.type==="match"&&c.worst&&c.worst.uid!==c.best?.uid,mood:-6,memo:c=>({benched:{uid:c.worst.uid,name:c.worst.name}}),
   say:["Noch so ein Spiel, @[{W}], und du wärmst die Bank 🪑","@[{W}] die Bank hat schon nach dir gefragt 🪑😏","@[{W}] ich hab dir schon mal ein Kissen auf die Bank gelegt 🪑","@[{W}] die Bank hat WLAN. Nur so als Info 🪑📶"],
   re:[["worst",["NEIN Trainer, bitte nicht 😭","Ich trainier ab morgen doppelt, versprochen 💪","Die Bank ist kalt um diese Jahreszeit 🥶","Challenge accepted 😤","Ich hab's verstanden. Nächstes Mal zeig ich's 😤"]],["x",["Ich nehm deinen Platz gern 👀","Kissen leih ich dir 🪑😂","Bank-Wärmer-Club, willkommen 🪑😂","Ich reservier dir den Platz mit Heizung 🔥🪑"]],["y",["Harte Ansage 😳","Ich sag nix. Ich will nicht der Nächste sein 🤐","Oha. Der Trainer meint's ernst 😬"]]]},
  sermon:{label:()=>"📢 Kabinenpredigt",when:c=>c.type==="match",mood:c=>W(c)?-3:-8,memo:()=>({sermon:true}),
   say:c=>W(c)?["Ja, gewonnen. ABER: Die zweite Halbzeit war ein Kindergeburtstag! 📢😤","Glaubt bloß nicht, dass ich zufrieden bin! Nur weil's 3 Punkte gibt! 📢","ICH. WILL. MEHR. Auch wenn wir gewinnen! 📢🔥","Gewonnen, aber mit DER Einstellung gewinnen wir nächste Woche nichts! 📢"]
    :["SO NICHT, LEUTE! Ich will Leidenschaft sehen! Laufbereitschaft! ZWEIKÄMPFE! 📢😤","Ich war noch nie so sauer. NIE. Morgen will ich Gesichter sehen, die brennen 🔥📢","Wer heute nicht gekämpft hat, braucht morgen nicht zu kommen. Punkt. 📢","Das war nicht unser Fußball. Ab morgen wird wieder gearbeitet. Jeder einzelne. 📢"],
   re:[["x",["😶","Ja, Trainer 😶","…","Ich hab Angst 😰","Verstanden 🫡"]],["sys",["{y} hat die Gruppe stummgeschaltet 🔕","{y} hat das Handy weggelegt 📵"],c=>hash(c.away+c.gh)%2===0],
    ["z",["Wer hat ihn so wütend gemacht? 👀","Meine Ohren klingeln, und das ist nur ein Chat 😵","Selbst mein Handy hat vibriert 📳😳","Er hat Recht. Wir müssen mehr bringen 😤"]],["captain",["Ihr habt ihn gehört, Leute. 💪","Verstanden, Chef. Wir liefern 🫡","Kein Wort mehr. Morgen zeigen wir's auf dem Platz 💪"]]]},
  pizza:{label:()=>"🍕 Pizza für alle",when:c=>c.type==="match"&&c.result!=="loss",mood:10,memo:()=>({pizza:true}),
   say:["Pizza geht heute auf mich 🍕","Pizza für alle! Ihr habt's euch verdient 🍕🍕","Ich hab 20 Pizzen bestellt. Keine Diskussion 🍕","Pizza! Aber wer Ananas bestellt, läuft morgen extra 🍍🏃","Pizza für alle. Die Rechnung schick ich an die Mannschaftskasse. Spaß! 🍕😏"],
   re:[["food",["TRAINER 😍🍕","Ich nehm drei. Mit extra Käse 🧀","Ich bin schon an der Tür 🏃‍♂️🍕","Ich hab schon vorbestellt. Seit der 70. Minute 🍕😇","Familiengröße. Für mich allein 🍕🍕"]],["x",["Ich nehm Salami!","Ananas auf Pizza ist verboten in dieser Kabine 🍍🚫","Bester Trainer der Liga 🍕❤️","Ich will den Rand von allen 🍕😋"]],["y",["@[{food}] lass uns auch was übrig 😂","Wer Ananas bestellt, fliegt raus 🍍😤","Gibt's auch Nachtisch? 🍰👀","Diät ab Montag. Wie immer 😅"]]]},
  party:{label:()=>"🎉 Party heute Abend",when:W,mood:10,memo:()=>({party:true}),
   say:["Heute Abend wird gefeiert 🎉 Musik an!","Party! Aber um 12 seid ihr alle im Bett 😏🎉","Ihr habt's verdient: Party! Ich komm auch. Kurz. Mit Tanzschuhen 🕺","Feiern erlaubt. Morgen Training trotzdem um 10. Ich sag's nur 🎉⏰"],
   re:[["dj",["DJ {dj} ist bereit 🎧🔥","Playlist steht seit der 80. Minute 😎🎶","Ich hab neue Lieder! Also vier statt drei 🎧😎"]],["late",["Ich komm später 😅","Wann geht's los? Ich bin noch beim Friseur 💇‍♂️","Ich bin pünktlich! …zur Afterparty 😇"]],["x",["@[{late}] du kommst IMMER später 😂","Trainer auf der Tanzfläche? Das will ich sehen 🕺📹"]],["style",["Ich hab mein Outfit schon seit Dienstag geplant 👔✨","Glitzerhemd ist gebügelt ✨👔"]]]},
  song:{label:()=>"🎶 Kabinenlied anstimmen",when:W,mood:6,
   say:["Kabinenlied! Alle mitsingen, auch die, die keinen Ton treffen 🎶","Ich fang an: 'Wir sind die Besten…' 🎶 Jetzt ihr!","🎶 Lalala, drei Punkte sind da 🎶 Hab ich selbst gedichtet 😌"],
   re:[["dj",["Ich mach den Beat 🥁🎧","Remix kommt heute Nacht 🎧🔥"]],["x",["Trainer, bitte nicht singen 🙉😂","Ich hab's aufgenommen. Für die Weihnachtsfeier 📹😏","Das war schief. Aber mit Herz ❤️😂"]],["captain",["Alle mitsingen, das ist ein Befehl 🎶🫡","Lauter! Die Nachbarkabine soll's hören 🔊"]]]},
  // V21.443: a real victory photo from the dressing room (only after wins), see 3d-kabine-photo.mjs
  photo:{label:()=>"📸 Siegerfoto aus der Kabine",when:c=>c.type==="match"&&c.result==="win",mood:4,photo:true,
   say:["Mannschaftsfoto! Alle in die Mitte, und keiner macht Hasenohren 📸🐰","Lächeln, Leute! Das kommt in die Vereinszeitung 📸","Siegerfoto! Wer die Augen zu hat, zahlt in die Kasse 📸💶"],
   re:[["style",["Moment, Haare richten 💇‍♂️","Nur von meiner guten Seite. Also allen 😎"]],["late",["Wartet, ich bin gleich da!!! 🏃‍♂️📸","Hab ich's verpasst? 😭"]],["x",["Wer hat Hasenohren gemacht?! 🐰😂","Ich hatte die Augen zu. Nochmal 😭","Ich steh hinten, da sieht man mein Doppelkinn nicht 🙈"]]]},
  dayOff:{label:()=>"😴 Morgen frei",when:c=>c.type==="match"&&c.result!=="loss",mood:8,memo:()=>({dayoff:true}),
   say:["Morgen ist frei. Genießt es 😴","Freier Tag! Aber keine Dummheiten 😏","Morgen frei. Wer trotzdem trainiert, kriegt von mir einen Keks 🍪","Freier Tag! Bitte nicht alle gleichzeitig Footera zocken, sonst bricht der Server zusammen 🎮😂"],
   re:[["x",["BESTER TRAINER DER WELT 🙌","Ich liebe dich, Trainer 😭❤️","Wecker ist aus. Für immer 😴","Ich schlaf bis Mittag. Und dann weiter 😴💤"]],["gamer",["Footera-Marathon, ich komme 🎮","Endlich Zeit für meine Packs 🎮📦","Snacks sind gekauft, Controller ist geladen 🎮🍿"]],["late",["Endlich mal pünktlich: im Bett 😂","Perfekt, dann bin ich übermorgen pünktlich. Vielleicht 😇"]]]},
  run:{label:()=>"🏃 Straflauf um 7",when:c=>c.type==="match",mood:-6,memo:()=>({run:true}),
   say:c=>W(c)?["Gewonnen, schön. Trotzdem: morgen 7 Uhr Straflauf. Für die zweite Halbzeit 🏃‍♂️⏰","Drei Punkte, ja. Die Kondition war trotzdem ein Witz. Morgen 7 Uhr 🏃‍♂️"]:["Morgen 7 Uhr. Straflauf. Alle. 🏃‍♂️⏰","Ich hab den Hügel hinterm Trainingsplatz gefunden. Bis morgen um 7 ⛰️🏃","Morgen früh um 7: Laufen, bis ihr wieder wisst, wie Gewinnen geht 🏃‍♂️⏰"],
   re:[["late",["7 UHR?! Da schlaf ich noch tief und fest 😭","Gibt's 7 Uhr auch abends? 😅","Ich stell mir 4 Wecker. Und komm trotzdem zu spät 😩"]],["x",["Meine Beine weinen jetzt schon 🦵😭","Ich hab plötzlich Fieber 🤒","Verstanden. Wir laufen 💪"]],["y",["Kann ich krank sein? 🤒","Ich bring Kaffee mit ☕","Wer zuletzt ankommt, zahlt Frühstück 🥐","Okay. Haben wir verdient 😓"]]]},
  video:{label:()=>"📼 Videoanalyse",when:c=>c.type==="match"&&c.result!=="win",mood:-2,
   say:["Morgen 9 Uhr Videoanalyse 📼 Popcorn gibt's keins.","Ich hab 47 Szenen rausgeschnitten. Wir gehen alle durch 📼","Videoanalyse morgen. Ich hab die Gegentore in Zeitlupe. Und in Super-Zeitlupe 📼"],
   re:[["x",["Oh nein… 😩","Kann man die Gegentore vorspulen? ⏩","Gute Idee. Wir müssen das verstehen 📋"]],["gamer",["Kann ich den Controller mitbringen? 🎮","Gibt's die Szenen auch als Replay mit anderer Kamera? 🎥"]],["y",["47?! Ich bring Schlafsack mit 😴","Ich schreib mit. Versprochen ✍️"]]]},
  fine:{label:c=>`💶 Strafe für ${short((c.red||c.yellow).name)}`,when:c=>c.type==="match"&&(c.red||c.yellow),mood:-2,
   say:c=>c.red?["@[{R}] Rote Karte = 50 € in die Mannschaftskasse 💶","@[{R}] die Rote kostet 50 €. Und eine Runde Kuchen fürs Team 💶🎂"]:["@[{R}] Gelb wegen Meckern = 10 € in die Kasse 💶","@[{R}] Gelbe Karte: 10 €. Diskutieren kostet extra 💶😏"],
   re:[["red",["Wie viel?! 😳","Kann ich in Raten zahlen? 😅","Ich zahl mit Panini-Bildern 😂","Okay. Hab ich verdient 😓"]],["kasse",["Kasse klingelt 💰😏","Notiert ✍️💶","Quittung kommt per Post 🧾"]],["x",["Davon gibt's dann Pizza 🍕","Die Kasse wird langsam reicher als ich 💰😂"]]]},
  tactics:{label:()=>"📋 Taktik-Ansage",when:c=>c.type==="match",mood:1,
   say:["Nächstes Spiel: hoch pressen, schnell umschalten! 📋","Mehr über die Flügel, Leute! 📋 Flanken, Flanken, Flanken!","Ab sofort: Wer den Ball verliert, holt ihn zurück. Punkt. 📋","Neue Regel: Rückpass nur, wenn's brennt. Und es brennt selten 🔥📋","Nächstes Mal mehr Mut im letzten Drittel. Ich will Abschlüsse sehen! 📋⚽"],
   re:[["captain",["Verstanden, Chef 🫡","Jawohl! 📋💪","Ich übersetz das für die Jungs: Laufen! 🏃"]],["x",["Ich hab nur 'Flanken' gelesen und bin schon motiviert 😂","Ich schreib's mir auf den Arm ✍️","Ich hab ein Taktikbrett gekauft. Weiß noch nicht, wie rum 📋🙃"]],["striker",["Hauptsache, ich krieg den Ball 😏","Ich bin das letzte Drittel. Gebt mir einfach den Ball 😎"]]]},
  voice:{label:()=>"🎤 Sprachnachricht",when:c=>c.type==="match",mood:2,voice:true,
   re:[["x",["{dur} Minuten?! 😂","Hab's auf 2-fach gehört, klang wie ein Eichhörnchen 🐿️😂","Trainer, das ist ein Podcast, keine Sprachnachricht 🎙️😂","Im Hintergrund bellt ein Hund. Gehört der zum Trainerteam? 🐶😂","Ich hab bei Minute 2 kurz geweint. Bei Minute 3 auch 🥹"]],
    ["y",["Kann jemand zusammenfassen? 🙏","Ich bin nach 30 Sekunden eingeschlafen 😴","Bin im Bus, hör ich später. Also nie 😅","Ich hab nur 'Leidenschaft' verstanden. 14 Mal 😂"]],
    ["captain",["Zusammenfassung: Trainer ist {feel}. 🫡","Kurzfassung für alle: Trainer ist {feel}. Gern geschehen 🫡","TL;DR: Trainer ist {feel}. Und er hat einen neuen Lieblingssatz 🫡","Ich hab mitgeschrieben: Trainer ist {feel}. Rest war Hintergrundgeräusch 😅"]]]},
  meme:{label:()=>"😂 Meme schicken",when:c=>c.type==="match",mood:5,meme:true,
   re:[["x",["😂😂😂","Trainer ist online witziger als in der Kabine 😂","WER hat ihm gezeigt, wie Memes gehen? 👀","Ich kann nicht mehr 😭😂","Das kommt in die Kabinen-Ruhmeshalle 🏛️😂","Der Trainer hat einen Social-Media-Praktikanten, ich schwör 😂"]],["y",["Hab's in meinen Status gestellt 📲","Ich fühl mich angegriffen 😤😂","Das bin ich. Das bin wirklich ich 😭","Zu real, Trainer. Zu real 💀"]]]},
  // pack signings
  welcome:{label:c=>`🤝 ${short(c.n.name)} begrüßen`,when:c=>c.type==="pack",mood:4,
   say:c=>c.icon?["Willkommen, @[{N}]! Eine echte Legende bei uns 🙇","@[{N}] willkommen! Die Jungs sind schon ganz aufgeregt 🙇✨"]:["Willkommen, @[{N}]! 🤝 Zeig, was du kannst.","@[{N}] schön, dass du da bist! 🤝","@[{N}] willkommen! Training ist um 10. Also wirklich 10 🤝⏰"],
   re:[["new",["Danke Trainer! Ich geb alles 💪","Wann ist das erste Training? 👀","Ich bin bereit. Wo ist mein Spind? 🔑"]],["x",["Einstand nicht vergessen 🎂😏","Willkommen im Irrenhaus 😂","Endlich ist hier mal einer, der normal ist. Hoffentlich 😅"]]]},
  cake:{label:()=>"🎂 Einstand fordern",when:c=>c.type==="pack",mood:3,
   say:["Neuzugang heißt Einstand. Kuchen für alle, @[{N}] 🎂","@[{N}] Regel Nummer 1: Wer neu ist, bringt Kuchen 🎂","@[{N}] Einstand: Kuchen, Getränke und ein Lied vor versammelter Mannschaft 🎂🎤"],
   re:[["new",["Welcher Kuchen? 😅","Ich kann nur Fertigkuchen 😬🎂","Ein Lied?! Ich bring lieber zwei Kuchen 🎂🎂"]],["food",["Schoko bitte! 🍫","Zwei Bleche, mindestens 🎂🎂","Ich übernehm das Probeessen 🍰😇"]]]},
  number:{label:()=>"👕 Trikotnummer geben",when:c=>c.type==="pack",mood:3,
   say:["@[{N}] du kriegst die {num} 👕","@[{N}] Rückennummer {num}. Trag sie mit Stolz 👕","@[{N}] die {num} gehört jetzt dir. Bitte nicht falsch rum anziehen 👕😏"],
   re:[["new",["Meine Lieblingsnummer 😍","Ich wollte eigentlich die 10 😤","Mama wird stolz sein 🥹👕"]],["x",["Die 10 bleibt meine 😏","Die {num} hatte vorher ein Bronze-Spieler 😂","Die {num}? Die bringt Glück. Meistens 🍀"]]]},
  // SBC
  thanks:{label:()=>"🫡 Danke sagen",when:c=>c.type==="sbc",mood:2,
   say:c=>[`Danke für alles, ${c.gone.map(short).join(" und ")}! 🫡`,"Ihr wart super. Danke! 🫡",`${c.gone.map(short).join(" und ")}: Die Tür steht euch immer offen 🫡❤️`],
   re:[["x",["Wir vergessen euch nie 🥲","Lebt wohl 🫡","Ich behalte euren Platz im Herzen. Den im Bus nehm ich aber 😏"]],["y",["Wer kriegt jetzt den Spind? 👀","Ich nehm die Duschgel-Sammlung 😂","Ich hab noch ein Abschiedsfoto. Kommt in die Vitrine 🖼️"]]]},
  business:{label:()=>"💼 Geschäft ist Geschäft",when:c=>c.type==="sbc",mood:-3,
   say:["Geschäft ist Geschäft. Weiter geht's 💼","Kommt vor. Wir bauen weiter 💼","So ist Fußball. Wir schauen nach vorne 💼"],
   re:[["x",["Kalt, Trainer 🥶","Bin ich der Nächste? 😳","Ich bin ab jetzt der netteste Spieler der Welt 😇"]],["y",["Ich mach ab jetzt freiwillig Extraschichten 😰","Ich putz ab morgen die Schuhe vom Trainer 👞😅"]]]}
 };
 const ORDER=["praiseBest","praiseKeeper","praiseJoker","praiseTeam","cheerUp","coffee","criticize","bench","fine","sermon","pizza","party","song","photo","dayOff","run","video","voice","meme","tactics","welcome","cake","number","thanks","business"];
 const NICE=["pizza","party","dayOff","praiseTeam","song","photo"],HARSH=["run","sermon","bench","video"];
 /* ---------- memes (V21.438) ---------- */
 // Real meme cards in six layouts instead of one line of text. They rotate: a meme that was sent in the last 40 memes
 // is not sent again while fresh ones are left. by: "coach" = only the coach sends it, "team" = only players.
 // when: win / draw / loss / notloss / pack / sbc (empty = any match except defeats). After a defeat only the coach sends
 // a (motivating) meme and the players send none; after a red card or a heavy defeat nobody does.
 // Layouts: two (no / yes), nobody (Niemand: / X:), expect (Erwartung / Realität), classic (top, picture, bottom),
 // brain (four growing brains), pov (POV + picture).
 const MEME_CARDS=[
  {id:"packs",by:"team",t:"two",no:"Nach dem Spiel auslaufen",yes:"Nach dem Spiel direkt Packs öffnen 📦"},
  {id:"35m",t:"two",no:"Kurzer Pass zum freien Mann",yes:"Schuss aus 35 Metern, weil ich's kann 🚀"},
  {id:"neon",by:"team",t:"two",no:"Schwarze Schuhe",yes:"Neon-Schuhe, damit der Trainer mich auch sieht 👟✨"},
  {id:"eisbad",t:"two",no:"Eisbad nach dem Spiel",yes:"Warme Dusche und eine Decke 🛁"},
  {id:"stuermer",t:"two",no:"Defensiv denken",yes:"Mit fünf Stürmern spielen und hoffen 🙏"},
  {id:"kopfball",by:"team",t:"two",no:"Kopfball",yes:"Kopfball, bei dem die Frisur sitzen bleibt 💇‍♂️"},
  {id:"gamerNobody",by:"team",t:"nobody",who:"{gamer}",a:"Ich hab heute 3 Walkouts gezogen, nur dass ihr's wisst 🎮"},
  {id:"lateNobody",by:"team",t:"nobody",who:"{late}",a:"Bin gleich da 🏃‍♂️ (Anpfiff war vor 20 Minuten)"},
  {id:"foodNobody",t:"nobody",who:"{food}",a:"Gibt's nach dem Spiel noch Nudeln? 🍝"},
  {id:"styleNobody",t:"nobody",who:"{style}",a:"Wie sitzen meine Haare auf dem Mannschaftsfoto? 💇‍♂️"},
  {id:"djNobody",t:"nobody",who:"{dj}",a:"*dreht in der Kabine die Bässe auf* 🔊"},
  {id:"kasseNobody",t:"nobody",who:"Die Mannschaftskasse",a:"Hallo, ich bin's. Ich bin leer 💸"},
  {id:"abseits",by:"team",t:"nobody",who:"Ich",a:"ABSEITS!!! (war keins) 🙋‍♂️"},
  {id:"fallrueck",t:"expect",e:"Mein Fallrückzieher im Training",ee:"🦸",r:"Mein Fallrückzieher im Spiel",re:"🤕"},
  {id:"flanke",t:"expect",e:"Meine Flanke im Kopf",ee:"🎯",r:"Meine Flanke in echt",re:"🛰️"},
  {id:"jubel",t:"expect",e:"Torjubel, so wie geplant",ee:"🕺",r:"Torjubel, so wie passiert",re:"🤸💥"},
  {id:"foto",t:"expect",e:"Ich auf dem Mannschaftsfoto (Plan)",ee:"😎",r:"Ich auf dem Mannschaftsfoto (echt)",re:"😵‍💫"},
  {id:"nachspiel",t:"classic",top:"Wenn der Schiri",art:"⏱️😱",bottom:"8 Minuten Nachspielzeit anzeigt"},
  {id:"loewe",t:"classic",top:"Ich beim Aufwärmen 🦁",art:"➡️",bottom:"Ich in der 89. Minute 🐌"},
  {id:"bananen",t:"classic",top:"{food} in der Halbzeit",art:"🍌🍌🍌🍌",bottom:"„Ich hab keinen Hunger“"},
  {id:"djLieder",t:"classic",top:"Wenn {dj}",art:"🎧🔁",bottom:"wieder dieselben drei Lieder spielt"},
  {id:"abschlag",t:"classic",top:"Der Ball",art:"⚽💨🌌",bottom:"wenn {keeper} abschlägt"},
  {id:"kontrolle",t:"classic",top:"Der Trainer",art:"🧐",bottom:"wenn einer beim Laufen abkürzt"},
  {id:"brainBall",t:"brain",rows:["Ball nach vorne","Ball über die Flügel","Ball zurück zum Torwart","Ball direkt in die Kabine, Feierabend"]},
  {id:"brainTor",by:"team",t:"brain",rows:["Ein Tor schießen","Zwei Tore schießen","Den Elfer rausholen","Den Torjubel schon im Bus üben"]},
  {id:"brainSchoner",t:"brain",rows:["Schienbeinschoner","Schienbeinschoner mit Foto","Schienbeinschoner mit Foto von Mama","Schienbeinschoner mit Foto vom Trainer 😳"]},
  {id:"auslaufen",t:"pov",pov:"POV: Der Trainer sagt „nur kurz auslaufen“",art:"🏃‍♂️🏃‍♂️🏃‍♂️⏰"},
  {id:"schoner",t:"pov",pov:"POV: Du hast vergessen, deine Schienbeinschoner zu waschen",art:"🧦☣️"},
  {id:"konter",t:"pov",pov:"POV: Unsere Abwehr beim Konter",art:"🚪🏃‍♂️💨"},
  {id:"lateBus",t:"pov",pov:"POV: Der Bus wartet und {late} sucht seinen zweiten Schuh",art:"🚌👟❓"},
  {id:"zaun",by:"team",t:"pov",pov:"POV: Du schießt im Training den Ball über den Zaun",art:"⚽🌳🏡😬"},
  {id:"bald",t:"pov",pov:"POV: {late} schreibt „bin in 2 Minuten da“",art:"⏳⏳⏳"},
  // after a win
  {id:"profilbild",when:"win",by:"team",t:"two",no:"Bescheiden bleiben",yes:"Das {score} als Profilbild 📲"},
  {id:"aufessen",when:"win",t:"two",no:"Ein Sieg",yes:"Ein Sieg UND {food} hat noch was übrig gelassen 🍕"},
  {id:"gegnerDanach",when:"win",t:"expect",e:"{away} vor dem Spiel",ee:"😤",r:"{away} nach dem Spiel",re:"🫥"},
  {id:"gegnerKlassik",when:"win",t:"classic",top:"{away} nach dem",art:"🫠",bottom:"{score}"},
  {id:"dreiPunkte",when:"win",t:"classic",top:"Drei Punkte",art:"🥳",bottom:"und morgen trotzdem Training"},
  {id:"mauer",when:"win",t:"classic",top:"Unsere Abwehr heute",art:"🧱🧱🧱",bottom:"Betreten verboten"},
  {id:"busPov",when:"win",t:"pov",pov:"POV: Sieg, Bus, und {dj} hat das Aux-Kabel",art:"🔊🚌🕺"},
  {id:"brainSieg",when:"win",t:"brain",rows:["Gewinnen","Hoch gewinnen","Hoch gewinnen, zu null","Gewinnen und der Trainer gibt Eis aus 🍦"]},
  {id:"vorhersage",when:"win",by:"team",t:"nobody",who:"{striker}",a:"Ich hab das Tor übrigens im Bus vorhergesagt 🔮"},
  {id:"keeperLangweilig",when:"win",by:"team",t:"nobody",who:"{keeper}",a:"Ich hab die ganze Zeit mitgefiebert. Auch wenn der Ball nie bei mir war 🧤"},
  {id:"regeneration",when:"win",by:"team",t:"nobody",who:"Der Trainer",a:"Morgen um 9 Uhr Regeneration 😏"},
  // after a draw
  {id:"punkt",when:"draw",t:"classic",top:"Ein Punkt",art:"🤷",bottom:"besser als kein Punkt. Glaub ich"},
  {id:"moralisch",when:"draw",t:"two",no:"Unentschieden",yes:"„Moralischer Sieger“ 😌"},
  {id:"remisPov",when:"draw",t:"pov",pov:"POV: 90 Minuten alles gegeben und es steht {score}",art:"😐🤝😐"},
  // coach
  {id:"aufstellung",by:"coach",t:"nobody",who:"Trainer",a:"*schickt um 23 Uhr die Aufstellung für Samstag* 📋"},
  {id:"zusatz",by:"coach",t:"two",no:"Freier Tag",yes:"Freiwilliges Zusatztraining um 7 😇"},
  {id:"taktikTafel",by:"coach",t:"expect",e:"Meine Taktik an der Tafel",ee:"📋✨",r:"Meine Taktik auf dem Platz",re:"🍝"},
  {id:"brainTaktik",by:"coach",t:"brain",rows:["4-4-2","4-3-3","3-5-2","Einfach alle stürmen lassen"]},
  {id:"memesGelernt",by:"coach",t:"pov",pov:"POV: Der Trainer hat herausgefunden, wie Memes gehen",art:"🧓📲😂"},
  {id:"taktikRum",by:"coach",t:"classic",top:"Wenn ihr den Taktikzettel",art:"📋🙃",bottom:"falsch rum haltet"},
  {id:"pfeife",by:"coach",t:"two",no:"Mit Worten motivieren",yes:"Einmal laut pfeifen 📯"},
  // after a defeat: only the coach, and it motivates
  {id:"wirNaechstes",when:"loss",by:"coach",t:"classic",top:"Wir heute",art:"😓➡️🦁",bottom:"Wir im nächsten Spiel"},
  {id:"brainLernen",when:"loss",by:"coach",t:"brain",rows:["Verlieren","Aus der Niederlage lernen","Videoanalyse","Nächstes Spiel alle umhauen 💪"]},
  {id:"kopfHoch",when:"loss",by:"coach",t:"two",no:"Kopf hängen lassen",yes:"Kopf hoch und nächste Woche zurückschlagen 💪"},
  {id:"planSpiel",when:"loss",by:"coach",t:"expect",e:"Unser Plan",ee:"📋",r:"Das Spiel heute",re:"🌪️"},
  {id:"zusammenLoss",when:"loss",by:"coach",t:"classic",top:"Verlieren wir zusammen",art:"🤝",bottom:"gewinnen wir auch zusammen"},
  {id:"loeweLoss",when:"loss",by:"coach",t:"pov",pov:"POV: Wir nächste Woche nach dieser Niederlage",art:"🦁🔥"},
  {id:"kakaoLoss",when:"loss",by:"coach",t:"nobody",who:"Trainer",a:"Morgen 10 Uhr Training. Danach Kakao für alle ☕"},
  {id:"adlerLoss",when:"loss",by:"coach",t:"expect",e:"Wir heute",ee:"🐣",r:"Wir in zwei Wochen",re:"🦅"},
  {id:"brainMut",when:"loss",by:"coach",t:"brain",rows:["Ärgern","Abhaken","Analysieren","Zurückschlagen 💥"]},
  {id:"enttaeuscht",when:"loss",by:"coach",t:"pov",pov:"POV: Der Trainer ist nicht sauer, nur motiviert",art:"🔥📋"},
  // pack signing
  {id:"neuWir",when:"pack",t:"classic",top:"Wir, als {N}",art:"🤩",bottom:"in die Gruppe kam"},
  {id:"neuBank",when:"pack",t:"nobody",who:"Die Ersatzbank",a:"Ich hab schon mal einen Platz warm gemacht 🪑"},
  {id:"neuKabine",when:"pack",t:"pov",pov:"POV: {N} fragt, wo die Kabine ist",art:"🗺️😅"},
  {id:"neuEinstand",when:"pack",t:"two",no:"Den Neuen höflich begrüßen",yes:"Den Neuen sofort zum Einstand verdonnern 🎂"},
  // SBC
  {id:"sbcKabine",when:"sbc",t:"classic",top:"Die Kabine",art:"🥲",bottom:"nach der SBC"},
  {id:"sbcSeite",when:"sbc",t:"pov",pov:"POV: Der Trainer öffnet wieder die SBC-Seite",art:"😰📱"},
  {id:"sbcSpind",when:"sbc",t:"two",no:"Abschiedsfeier",yes:"Spind sofort leer räumen und das Duschgel behalten 🧴"}
 ];
 const MEME_KEEP=40;
 const memeFields=m=>m.t==="two"?[m.no,m.yes]:m.t==="nobody"?[m.who,m.a]:m.t==="expect"?[m.e,m.ee,m.r,m.re]:m.t==="classic"?[m.top,m.art,m.bottom]:m.t==="brain"?m.rows:[m.pov,m.art];
 function memeText(m){
  if(m.t==="two")return`${m.no} 🙅 / ${m.yes} 👉`;
  if(m.t==="nobody")return`Niemand: … ${m.who}: ${m.a}`;
  if(m.t==="expect")return`Erwartung: ${m.e} ${m.ee} / Realität: ${m.r} ${m.re}`;
  if(m.t==="classic")return`${m.top} ${m.art} ${m.bottom}`;
  if(m.t==="brain")return m.rows.join(" → ");
  return`${m.pov} ${m.art}`;
 }
 // kind: win/draw/loss (match), pack, sbc. by: coach/team. vars fill the placeholders; a meme whose
 // placeholders are not known (no DJ in the squad ...) is skipped. Fresh memes first, then the one sent longest ago.
 function memeFor(kind,by,seed,recent=[],vars={}){
  const fits=m=>{
   if(m.by&&m.by!==by)return false;
   if(kind==="pack"||kind==="sbc")return m.when===kind;
   if(kind==="loss")return m.when==="loss"&&by==="coach";
   return!m.when||m.when===kind||(m.when==="notloss");
  };
  const known=m=>memeFields(m).every(f=>[...String(f).matchAll(/\{(\w+)\}/g)].every(x=>vars[x[1]]));
  const pool=MEME_CARDS.filter(m=>fits(m)&&known(m));if(!pool.length)return null;
  const last=new Map();(Array.isArray(recent)?recent:[]).forEach((id,i)=>last.set(id,i));
  const order=pool.slice().sort((a,b)=>(last.has(a.id)?last.get(a.id):-1)-(last.has(b.id)?last.get(b.id):-1)||hash(seed+a.id)-hash(seed+b.id));
  const m=order[0],out={id:m.id,t:m.t};
  for(const k of ["no","yes","who","a","e","ee","r","re","top","art","bottom","pov"])if(m[k]!=null)out[k]=fill(m[k],vars);
  if(m.rows)out.rows=m.rows.map(r=>fill(r,vars));
  return out;
 }
 const memeMsg=(kind,meme,who=null)=>meme?{kind,...(who?{who:whoOf(who)}:{}),text:"[Meme] "+memeText(meme),meme}:null;
 function recentMemes(v){return v.msgs.filter(m=>m.meme&&typeof m.meme==="object"&&m.meme.id).map(m=>m.meme.id).slice(-MEME_KEEP)}
 const maxAnswers=c=>c?.type==="match"?3:1;
 function blockCtx(v,ref){
  const block=v.msgs.filter(m=>m.ref===ref),c=block.find(m=>m.ctx)?.ctx;
  if(c)return c;
  // chats from before V21.420: only the result is known
  const r=block.find(m=>m.result)?.result;return r?{type:"match",result:r,players:[...new Map(block.filter(m=>m.who).map(m=>[keyOf(m.who),m.who])).values()]}:null;
 }
 function used(v,ref){const r=v.replies[ref];return Array.isArray(r)?r:r==null?[]:null}
 function replyOptions(v,ref){
  const c=blockCtx(v,ref),u=used(v,ref);if(!c||!u||u.length>=maxAnswers(c))return[];
  return ORDER.filter(id=>!u.includes(id)&&COACH[id].when(c)).map(id=>({id,t:COACH[id].label(c)}));
 }
 function answersLeft(v,ref){const c=blockCtx(v,ref),u=used(v,ref);return c&&u?Math.max(0,maxAnswers(c)-u.length):0}
 function latestMatchRef(v){for(let i=v.msgs.length-1;i>=0;i--)if(String(v.msgs[i].ref).startsWith("m:"))return v.msgs[i].ref;return""}
 // The newest of the last few chats that still waits for the coach (a pack signing after the match does not hide it).
 function openRef(v){const refs=[...new Set(v.msgs.map(m=>m.ref))].slice(-4).reverse();return refs.find(r=>replyOptions(v,r).length)||""}
 // Pure: what happens when the coach picks option id in chat ctx (used = earlier answers in that chat).
 function coachMessages(id,c,ref,prior=[],recent=[],recentM=[]){return fresh(recent,()=>coachRaw(id,c,ref,prior,recentM)).value}
 function coachRaw(id,c,ref,prior=[],recentM=[]){
  const o=COACH[id];if(!o||!c||!o.when(c))return[];
  const seed=ref+"|"+id+"|"+prior.length,players=Array.isArray(c.players)?c.players:[];
  const captain=c.captain||players.find(p=>p.pos!=="GK")||players[0]||null;
  const roles=castRoles(players,captain);
  const striker=players.filter(p=>["ST","CF"].includes(p.pos))[0]||null;
  const cast={best:c.best,worst:c.worst,red:c.red||c.yellow,joker:c.joker,keeper:c.keeper,captain,new:c.n,striker,...roles};
  const named=o.re.map(r=>String(r[0]).split("|")[0]).filter(r=>!["x","y","z","sys"].includes(r)).map(r=>cast[r]);
  const target=[c.best,c.worst,c.red||c.yellow,c.joker,c.n,...named].filter(Boolean).map(keyOf),spoken=new Set();
  const others=players.filter(p=>!target.includes(keyOf(p))).sort((a,b)=>hash(seed+keyOf(a))-hash(seed+keyOf(b)));
  const free=()=>others.find(p=>!spoken.has(keyOf(p)))||null;
  const dur=`${2+hash(seed+"d")%5}:${String(hash(seed+"s")%60).padStart(2,"0")}`;
  const feel=c.result==="win"?"glücklich, aber will mehr":c.result==="loss"?"sauer, aber glaubt an uns":"nachdenklich";
  const vars={B:short(c.best?.name),W:short(c.worst?.name),R:short((c.red||c.yellow)?.name),J:short(c.joker?.name),K:short(c.keeper?.name),N:short(c.n?.name),
   r:num(c.best?.rating).toFixed(1),wr:num(c.worst?.rating).toFixed(1),dur,feel,num:String([7,9,11,14,17,19,21,23,27][hash(seed+"n")%9]),away:String(c.away||"Gegner")};
  for(const r of [...ROLES,"kasse"])if(roles[r])vars[r]=short(roles[r].name);
  const out=[];
  if(o.voice)out.push({kind:"me",text:`🎤 Sprachnachricht (${dur})`,voice:dur});
  else if(o.meme){
   const mv={away:vars.away,score:`${num(c.gh)}:${num(c.ga)}`};for(const r of ROLES)if(roles[r])mv[r]=short(roles[r].name);if(c.keeper)mv.keeper=short(c.keeper.name);if(striker)mv.striker=short(striker.name);
   const kind=c.result==="loss"?"loss":c.result==="draw"?"draw":"win";
   out.push(memeMsg("me",memeFor(kind,"coach",seed,recentM,mv))||{kind:"me",text:"[Meme] Ich nach 90 Minuten an der Seitenlinie: 💀",meme:true});
  }
  else{const pool=typeof o.say==="function"?o.say(c):o.say;out.push({kind:"me",text:fill(pick(pool,seed,"say"),vars)})}
  if(o.photo){
   const who=cast.style||captain;
   if(who){spoken.add(keyOf(who));out.push({kind:"msg",who:whoOf(who),text:pick(["📸 Hier ist es! Siegerfoto aus der Kabine","Foto ist im Kasten 📸🔥","📸 Für die Vereinszeitung! Wer die Augen zu hat, zahlt","Siegerfoto! Kommt sofort ins Profilbild 📸😎"],seed,"ph"),photo:{seed:ref+"|"+prior.length+"|photo",title:!!c.final,gh:num(c.gh),ga:num(c.ga)},react:{e:"🔥",n:4+hash(seed+"phn")%8}})}
  }
  const speakerFor=sel=>{
   for(const part of String(sel).split("|")){
    if(["x","y","z"].includes(part)){const p=free();if(p)return p;continue}
    const p=cast[part];if(p&&(!spoken.has(keyOf(p))||["best","worst","red","new","joker","keeper"].includes(part)))return p;
   }
   return null;
  };
  const reacts=o.re.filter(([, ,when])=>!when||when(c));
  reacts.forEach(([sel,texts],i)=>{
   if(sel==="sys"){const p=free();if(p){spoken.add(keyOf(p));out.push({kind:"sys",text:fill(pick(texts,seed,"sys"),{...vars,y:short(p.name)})})}return}
   const who=speakerFor(sel);if(!who)return;
   spoken.add(keyOf(who));
   const react=i===0&&hash(seed+"re")%2===0?{e:pick(["😂","🔥","❤️","😮","🙌"],seed,"e"),n:2+hash(seed+"rn")%8}:null;
   out.push({kind:"msg",who:whoOf(who),text:fill(pick(texts,seed,"re"+i),vars),react});
  });
  // combos: the players notice when the coach changes his mind
  const p=free()||others[0];
  if(p&&prior.some(x=>NICE.includes(x))&&HARSH.includes(id))out.push({kind:"msg",who:whoOf(p),text:pick(["Erst Zuckerbrot, dann Peitsche?! Trainer, ich bin verwirrt 😵‍💫","Wie jetzt, gerade war doch noch Party?! 😭","Kann ich die letzte Nachricht vom Trainer zurückgeben? 😂"],seed,"cmb")});
  else if(p&&prior.some(x=>HARSH.includes(x))&&NICE.includes(id))out.push({kind:"msg",who:whoOf(p),text:pick(["Zuckerbrot und Peitsche 😂","Erst anschreien, dann verwöhnen. Ich hab den Trainer durchschaut 😏","Stimmungsschwankungen beim Trainer heute 😂"],seed,"cmb")});
  else if(p&&prior.length===2&&hash(seed+"talk")%2===0)out.push({kind:"msg",who:whoOf(p),text:pick(["Trainer ist heute aber gesprächig 😂","Der Trainer hat heute mehr geschrieben als in der ganzen Saison 😂"],seed,"talk")});
  return out;
 }
 function answer(ref,key){
  const v=read(),opts=replyOptions(v,ref),o=typeof key==="number"?opts[key]:opts.find(x=>x.id===key);if(!o)return[];
  const c=blockCtx(v,ref),prior=used(v,ref)||[],r=fresh(v.lines,()=>coachRaw(o.id,c,ref,prior,recentMemes(v))),out=withPhotoSquad(r.value,c);if(!out.length)return[];
  keepLines(v,r.used);
  const last=num(v.msgs[v.msgs.length-1]?.ts);let ts=Math.max(Date.now(),last+1);
  out.forEach((m,i)=>v.msgs.push({...m,ref,id:ref+"#r"+prior.length+"-"+i,ts:ts+i*1000}));
  v.replies[ref]=[...prior,o.id];
  const def=COACH[o.id],dm=typeof def.mood==="function"?def.mood(c):num(def.mood);v.mood=clamp(v.mood+dm,0,100);
  // only the coach's words after the latest match come back after the next one
  if(def.memo&&ref===latestMatchRef(v))v.memo={...v.memo,...def.memo(c)};
  write(v);refreshBadges();return out;
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
 function voiceHTML(m){
  const bars=Array.from({length:26},(_,i)=>`<i style="height:${4+hash(m.id+i)%17}px"></i>`).join("");
  return`<div class="kb-voice"><span class="kb-voice-play" aria-hidden="true">▶</span><span class="kb-voice-wave" aria-hidden="true">${bars}</span><span class="kb-voice-len">${escText(m.voice)}</span></div><span class="kb-sr">${escText(m.text)}</span>`;
 }
 // V21.438: meme cards in six layouts (older chats keep their one-line memes).
 function memeHTML(m){
  const c=m.meme&&typeof m.meme==="object"?m.meme:null,e=v=>textHTML(String(v??""));
  if(!c){const t=String(m.text).replace(/^\[Meme\]\s*/,"");return`<div class="kb-meme"><small>MEME</small><p>${textHTML(t)}</p></div>`}
  const theme=hash(c.id)%6;let body="";
  if(c.t==="two")body=`<div class="kb-mm-two"><div class="no"><span aria-hidden="true">🙅‍♂️</span><p>${e(c.no)}</p></div><div class="yes"><span aria-hidden="true">😎👉</span><p>${e(c.yes)}</p></div></div>`;
  else if(c.t==="nobody")body=`<div class="kb-mm-nobody"><p>Niemand:</p><p>Absolut niemand:</p><p><b>${e(c.who)}:</b> ${e(c.a)}</p></div>`;
  else if(c.t==="expect")body=`<div class="kb-mm-expect"><div><small>ERWARTUNG</small><span aria-hidden="true">${e(c.ee)}</span><p>${e(c.e)}</p></div><div><small>REALITÄT</small><span aria-hidden="true">${e(c.re)}</span><p>${e(c.r)}</p></div></div>`;
  else if(c.t==="classic")body=`<div class="kb-mm-classic"><p>${e(c.top)}</p><span aria-hidden="true">${e(c.art)}</span><p>${e(c.bottom)}</p></div>`;
  else if(c.t==="brain")body=`<div class="kb-mm-brain">${(c.rows||[]).map((r,i)=>`<div class="b${i}"><p>${e(r)}</p><span aria-hidden="true">🧠</span></div>`).join("")}</div>`;
  else body=`<div class="kb-mm-pov"><p>${e(c.pov)}</p><span aria-hidden="true">${e(c.art)}</span></div>`;
  return`<div class="kb-meme kb-meme2 kb-mt${theme}"><small>MEME</small>${body}</div><span class="kb-sr">${escText(plain(m.text).replace(/^\[Meme\]\s*/,""))}</span>`;
 }
 /* ---------- V21.443 Siegerfoto ---------- */
 // The photo is rendered on the device from the stored line-up (3d-kabine-photo.mjs) the first time it is shown,
 // one at a time; the newest few stay cached (smaller JPEG) so the chat opens with the picture right away.
 const PHOTO_KEY="footera-kabine-photos-v1",PHOTO_KEEP=4,PHOTO_MODULE="./3d-kabine-photo.mjs?v=21466";
 const photoMem=new Map();let photoQueue=Promise.resolve();const photoBusy=new Set(),photoFailed=new Set();
 const cssId=id=>String(id).replace(/["\\]/g,"\\$&");
 function photoCache(){try{const c=JSON.parse(localStorage.getItem(PHOTO_KEY)||"{}");return c&&typeof c==="object"&&!Array.isArray(c)?c:{}}catch(e){return{}}}
 function photoUrl(id){if(photoMem.has(id))return photoMem.get(id);const c=photoCache()[id];return c&&typeof c.url==="string"&&c.url.startsWith("data:image/")?c.url:""}
 function keepPhoto(id,url){
  try{const c=photoCache();c[id]={url,at:Date.now()};const ids=Object.keys(c).sort((a,b)=>num(c[b].at)-num(c[a].at));ids.slice(PHOTO_KEEP).forEach(k=>delete c[k]);localStorage.setItem(PHOTO_KEY,JSON.stringify(c))}
  catch(e){try{localStorage.setItem(PHOTO_KEY,JSON.stringify({[id]:{url,at:Date.now()}}))}catch(_){}}
 }
 function photoHTML(m){
  const url=photoUrl(m.id),alt=m.photo?.signing?"Vorstellungsfoto":"Siegerfoto aus der Kabine";
  // Generating a 3D photo on opening the chat exhausts mobile GPU/RAM on some devices.
  // Existing cached pictures remain instant; new pictures render only after an explicit tap.
  return`<div class="kb-photo${m.photo?.signing?" kb-photo-portrait":""}${url?" ready":""}" data-kb-photo="${escText(m.id)}">${url?`<img src="${escText(url)}" alt="${alt}">`:`<button type="button" class="kb-photo-wait" data-kb-photo-develop="${escText(m.id)}"><span aria-hidden="true">📸</span><small>${photoBusy.has(m.id)?"Foto wird erstellt …":photoFailed.has(m.id)?"Erneut versuchen":"Foto ansehen"}</small></button>`}</div>`;
 }
 function shrink(url,w=800,q=.82){
  return new Promise(res=>{const img=new Image();img.onload=()=>{try{const c=document.createElement("canvas"),h=Math.round(img.height*w/img.width);c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);res(c.toDataURL("image/jpeg",q))}catch(e){res(url)}};img.onerror=()=>res(url);img.src=url});
 }
 function hydratePhotos(){
  // Only reuse pictures already cached. Never launch WebGL for unseen chat history.
  if(typeof document==="undefined"||!document.querySelectorAll)return;
  document.querySelectorAll("#kabineList .kb-photo:not(.ready)").forEach(el=>{
   const url=photoUrl(el.dataset.kbPhoto);
   if(url)showPhoto(el.dataset.kbPhoto,url);
  });
 }
 function developPhoto(id){
  id=String(id||"");
  if(!id||photoBusy.has(id))return;
  const m=read().msgs.find(x=>x.id===id);
  if(!m?.photo)return;
  photoFailed.delete(id);
  photoBusy.add(id);
  const status=message=>document.querySelectorAll("#kabineList .kb-photo:not(.ready)").forEach(el=>{
   if(el.dataset.kbPhoto!==id)return;
   const label=el.querySelector(".kb-photo-wait small");
   if(label)label.textContent=message;
  });
  status("Foto wird erstellt …");
  // One render at a time and smaller output on phones prevents memory spikes.
  photoQueue=photoQueue.catch(()=>{}).then(async()=>{
   try{
    const mod=await import(PHOTO_MODULE);
    let manager=null;try{manager=root.FooteraManager?.forPhoto?.()||null}catch(_){}
    const mobile=typeof matchMedia==="function"&&matchMedia("(max-width:700px)").matches;
    const width=mobile?720:960;
    const spec=m.photo.signing?m.photo:{...m.photo,manager};
    const r=m.photo.signing?await mod.renderSigningPhoto(spec,{width,height:Math.round(width*1.25)}):await mod.renderKabinePhoto(spec,{width,height:Math.round(width*.75)});
    if(!r?.url||!r.url.startsWith("data:image/"))throw new Error("Empty photo");
    photoMem.set(id,r.url);
    while(photoMem.size>PHOTO_KEEP)photoMem.delete(photoMem.keys().next().value);
    showPhoto(id,r.url);
    keepPhoto(id,r.url);
   }catch(e){
    console.warn("Kabinenfoto konnte nicht erstellt werden:",e);
    photoFailed.add(id);
    status("Foto fehlgeschlagen – erneut tippen");
   }finally{photoBusy.delete(id)}
  });
 }

 function showPhoto(id,url){
  document.querySelectorAll("#kabineList .kb-photo").forEach(el=>{
   if(el.dataset.kbPhoto!==id||el.classList.contains("ready"))return;
   el.classList.add("ready");
   el.innerHTML=`<img src="${escText(url)}" alt="${el.classList.contains("kb-photo-portrait")?"Vorstellungsfoto":"Siegerfoto aus der Kabine"}" loading="lazy" decoding="async">`;
  });
 }
 function openPhoto(id){
  const url=photoUrl(id);if(!url)return;
  const box=document.createElement("div");box.className="kb-photo-view";box.setAttribute("role","dialog");box.setAttribute("aria-label","Siegerfoto");
  box.innerHTML=`<img src="${escText(url)}" alt="Siegerfoto aus der Kabine"><div class="kb-photo-actions"><button type="button" class="kb-photo-btn" data-kb-photo-share>Teilen</button><button type="button" class="kb-photo-btn ghost" data-kb-photo-close>Schließen</button></div>`;
  box.addEventListener("click",async e=>{
   e.stopPropagation();
   if(e.target.closest("[data-kb-photo-share]")){
    try{const blob=await (await fetch(url)).blob(),file=new File([blob],"footera-siegerfoto.jpg",{type:"image/jpeg"});
     if(navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({files:[file],title:"Footera Siegerfoto",text:"📸 Siegerfoto aus der Kabine ⚽"});
     else{const a=document.createElement("a");a.href=url;a.download="footera-siegerfoto.jpg";a.click()}}catch(err){}
    return;
   }
   if(e.target.closest("[data-kb-photo-close]")||e.target===box)box.remove();
  });
  ($("#"+MODAL_ID)||document.body).appendChild(box);
 }
 function msgHTML(m,prev){
  if(m.kind==="sys")return`<div class="kb-sys" data-kb-id="${escText(m.id)}"><span>${escText(m.text)}</span></div>`;
  const time=`<time>${escText(timeLabel(m.ts))}</time>`;
  if(m.kind==="me"){const body=m.voice?voiceHTML(m):m.meme?memeHTML(m):`<p>${textHTML(m.text)}</p>`;return`<div class="kb-row me" data-kb-id="${escText(m.id)}"><div class="kb-bubble${m.voice?" kb-has-voice":""}${m.meme?" kb-has-meme":""}">${body}${time}<i class="kb-ticks" aria-hidden="true">✓✓</i></div></div>`}
  const first=!prev||prev.kind!=="msg"||prev.who?.name!==m.who?.name;
  return`<div class="kb-row${first?" first":""}" data-kb-id="${escText(m.id)}">${first?avatarHTML(m.who):'<span class="kb-ava-space"></span>'}<div class="kb-bubble${m.meme?" kb-has-meme":""}${m.photo?" kb-has-photo":""}">${first?`<strong style="color:${colorFor(m.who.name)}">${escText(m.who.name)}</strong>`:""}${m.photo?photoHTML(m):""}${m.meme?memeHTML(m):`<p>${textHTML(m.text)}</p>`}${time}${m.react?`<span class="kb-react">${escText(m.react.e)} ${num(m.react.n)}</span>`:""}</div></div>`;
 }
 function listHTML(msgs,now=Date.now()){
  let html="",day="";
  msgs.forEach((m,i)=>{const d=dayLabel(m.ts,now);if(d!==day){day=d;html+=`<div class="kb-day"><span>${escText(d)}</span></div>`}html+=msgHTML(m,msgs[i-1])});
  return html;
 }
 // Keep all messages in storage, but mount only a limited number of DOM rows.
 const CHAT_PAGE=60;let chatVisible=CHAT_PAGE;
 function historyHTML(msgs){
  const start=Math.max(0,msgs.length-chatVisible);
  return (start?`<button type="button" class="kb-history-more" data-kb-more>Ältere Nachrichten anzeigen (${start})</button>`:"")+listHTML(msgs.slice(start));
 }
 function emptyHTML(){return`<div class="kb-empty"><span aria-hidden="true">💬</span><strong>Noch ruhig in der Kabine</strong><p>Nach deinem nächsten Spiel schreibt deine Mannschaft hier, was sie vom Spiel hält. Neue Topstars aus Packs stellen sich vor.</p></div>`}
 function clubName(){try{return typeof matchHomeTeamName==="function"?matchHomeTeamName():String(state?.profile?.clubName||"Footera Club")}catch(e){return"Footera Club"}}
 function crest(){try{if(typeof crestHTML==="function"&&typeof clubIdentitySnapshot==="function")return crestHTML(clubIdentitySnapshot(),true)}catch(e){}return'<span class="kb-crest-fallback">⚽</span>'}
 function unread(v=read()){return v.msgs.filter(m=>num(m.ts)>v.seen&&m.kind==="msg").length}
 function moodInfo(mood){const m=clamp(num(mood),0,100);return m>=80?{e:"🔥",t:"Bombenstimmung"}:m>=60?{e:"😃",t:"Gute Stimmung"}:m>=40?{e:"😐",t:"Geht so"}:m>=20?{e:"😕",t:"Angespannt"}:{e:"🥶",t:"Eiszeit"}}
 function refreshBadges(){
  try{if(typeof document==="undefined"||!document.querySelectorAll)return;const v=read(),n=unread(v);
   document.querySelectorAll("[data-kabine-count]").forEach(el=>{el.textContent=n?`${n} neu`:"";el.hidden=!n});
   document.querySelectorAll("[data-kabine-sub]").forEach(el=>{el.textContent=n?`${n} neue Nachrichten von deiner Mannschaft`:"Was deine Mannschaft über das Spiel schreibt"});
   const mi=moodInfo(v.mood);document.querySelectorAll("[data-kabine-mood]").forEach(el=>{el.textContent=`${mi.e} ${mi.t} · ${v.mood}%`;el.style.setProperty("--kb-mood",v.mood+"%")});
  }catch(e){}
 }

 let playing=null;
 function $(sel){return document.querySelector(sel)}
 function ensureModal(){
  if($("#"+MODAL_ID))return;
  const el=document.createElement("div");el.id=MODAL_ID;el.className="modal";
  el.innerHTML=`<div class="modalinner kb-inner"><div class="kb-head"><button type="button" class="kb-back" data-kb-close aria-label="Schließen">‹</button><div class="kb-crest"></div><div class="kb-title"><strong></strong><small></small></div><button type="button" class="kb-share" data-kb-share aria-label="Als Bild teilen" title="Als Bild teilen">⤴</button></div><div class="kb-mood" title="Stimmung in der Kabine: steigt mit Siegen, Lob, Pizza und freien Tagen, sinkt mit Niederlagen und harten Ansagen"><span>Kabinen-Stimmung</span><b data-kabine-mood></b><i><u data-kabine-mood-bar></u></i></div><div class="kb-list" id="kabineList"></div><div class="kb-foot" id="kabineFoot"></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",async e=>{
   if(e.target.closest("[data-kb-close]")||e.target===el){close();return}
   if(e.target.closest("[data-kb-more]")){
    if(playing)finishPlay();
    const list=$("#kabineList");if(!list)return;
    const height=list.scrollHeight,top=list.scrollTop;
    chatVisible=Math.min(MAX_MSGS,chatVisible+CHAT_PAGE);
    list.innerHTML=historyHTML(read().msgs);
    list.scrollTop=Math.max(0,top+list.scrollHeight-height);
    hydratePhotos();return;
   }
   const develop=e.target.closest("[data-kb-photo-develop]");
   if(develop){e.preventDefault();if(playing)finishPlay();developPhoto(develop.dataset.kbPhotoDevelop);return}
   const chip=e.target.closest("[data-kb-reply]");
   if(chip){finishPlay();const added=answer(chip.dataset.kbRef,chip.dataset.kbReply);renderFoot(true);if(added.length)play(added.map(()=>0),true);return}
   const ph=e.target.closest(".kb-photo.ready");if(ph&&!playing){openPhoto(ph.dataset.kbPhoto);return}
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
  renderMood();
 }
 function renderMood(){const v=read(),el=$("#"+MODAL_ID+" [data-kabine-mood]"),bar=$("#"+MODAL_ID+" [data-kabine-mood-bar]");if(el){const mi=moodInfo(v.mood);el.textContent=`${mi.e} ${mi.t} · ${v.mood}%`}if(bar)bar.style.width=v.mood+"%"}
 function renderFoot(waiting=false){
  const v=read(),foot=$("#kabineFoot");if(!foot)return;
  const ref=openRef(v),opts=ref?replyOptions(v,ref):[],left=ref?answersLeft(v,ref):0;
  renderMood();
  if(!opts.length){foot.innerHTML=`<div class="kb-foot-note">🔒 Nur deine Mannschaft liest mit${latestMatchRef(v)?" · Nach dem nächsten Spiel kannst du wieder antworten":""}</div>`;return}
  const label=String(ref).startsWith("m:")?`Als Trainer antworten · noch ${left}×`:String(ref).startsWith("p:")?"Neuzugang begrüßen":"Als Trainer antworten";
  foot.innerHTML=`<span class="kb-foot-label">${escText(label)}</span><div class="kb-chips${opts.length>4?" many":""}">${opts.map(o=>`<button type="button" class="kb-chip" data-kb-ref="${escText(ref)}" data-kb-reply="${escText(o.id)}"${waiting?" disabled":""}>${escText(o.t)}</button>`).join("")}</div>`;
  if(waiting)foot.classList.add("kb-wait");else foot.classList.remove("kb-wait");
 }
 function scrollEnd(){const list=$("#kabineList");if(list)list.scrollTop=list.scrollHeight;hydratePhotos()}
 // New messages appear one after another with a "schreibt ..." line, like a real chat. Tap skips.
 function play(_,appendOnly=false){
  if(playing){clearTimeout(playing.timer);playing=null}
  const v=read(),list=$("#kabineList");if(!list)return;
  const reduce=typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fresh=appendOnly?v.msgs.slice(-_.length):v.msgs.filter(m=>num(m.ts)>v.seen).slice(-chatVisible);
  const old=appendOnly?v.msgs.slice(0,-_.length):v.msgs.filter(m=>num(m.ts)<=v.seen);
  if(!appendOnly)list.innerHTML=v.msgs.length?historyHTML(old):emptyHTML();
  markSeen(v);
  if(!fresh.length){scrollEnd();unlockFoot();return}
  if(reduce){list.innerHTML=historyHTML(v.msgs);scrollEnd();unlockFoot();return}
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
 function unlockFoot(){const foot=$("#kabineFoot");if(foot&&foot.classList.contains("kb-wait"))renderFoot(false)}
 function finishPlay(){
  if(!playing){unlockFoot();return}
  clearTimeout(playing.timer);playing=null;
  const list=$("#kabineList"),v=read();if(list){list.innerHTML=v.msgs.length?historyHTML(v.msgs):emptyHTML();scrollEnd()}
  unlockFoot();
 }
 function markSeen(v=read()){const last=v.msgs.length?num(v.msgs[v.msgs.length-1].ts):0;if(last>v.seen){v.seen=last;write(v)}refreshBadges()}
 function open(){
  try{if(typeof match!=="undefined"&&match?.finished)afterMatch(match)}catch(e){console.warn("Kabinenchat Spielabschluss:",e)}
  try{
   ensureModal();chatVisible=CHAT_PAGE;renderHead();renderFoot();
   if(typeof showUiLayer==="function")showUiLayer(MODAL_ID,KIND);else $("#"+MODAL_ID).classList.add("active");
   play();
  }catch(e){
   // A broken legacy message or failing image must not take down a finished match.
   console.error("Kabinenchat öffnen:",e);
   try{
    ensureModal();
    const list=$("#kabineList");if(list)list.innerHTML='<div class="kb-empty"><span>💬</span><strong>Chat konnte nicht vollständig geladen werden</strong><p>Dein Spielstand bleibt erhalten. Bitte Footera neu laden.</p></div>';
    $("#"+MODAL_ID)?.classList.add("active");
   }catch(_){}
  }
 }
 function close(){if(playing){clearTimeout(playing.timer);playing=null}typeof closeUiLayer==="function"?closeUiLayer(MODAL_ID,KIND):$("#"+MODAL_ID)?.classList.remove("active")}

 /* ---------- share picture: the chat of the latest match ---------- */
 function wrap(g,text,maxW){const words=String(text).split(/\s+/),lines=[];let cur="";for(const w of words){const t=cur?cur+" "+w:w;if(g.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur);return lines}
 function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
 // The picture shows exactly the chat of the latest match: every message of that block, in order (no gaps).
 function shareBlock(v=read()){const ref=latestMatchRef(v)||v.msgs[v.msgs.length-1]?.ref;return ref?v.msgs.filter(m=>m.ref===ref):[]}
 // What the person sees right now in the chat: every message at least half on screen, in order.
 function visibleMessages(v=read()){
  try{const list=document.querySelector("#kabineList");if(!list||!list.isConnected||!list.clientHeight)return[];
   const box=list.getBoundingClientRect(),ids=new Set();
   list.querySelectorAll("[data-kb-id]").forEach(el=>{const r=el.getBoundingClientRect(),seen=Math.min(r.bottom,box.bottom)-Math.max(r.top,box.top);if(r.height&&seen>=Math.min(r.height,box.height)*.5)ids.add(el.dataset.kbId)});
   return v.msgs.filter(m=>ids.has(m.id));
  }catch(e){return[]}
 }
 async function picture(messages=null){
  const block=Array.isArray(messages)&&messages.length?messages:shareBlock();if(!block.length)return null;
  const W=1080,TOP=150,BOTTOM=110,PAD=30,c=document.createElement("canvas"),probe=c.getContext("2d");
  try{await document.fonts?.ready}catch(e){}
  const SANS="Inter,system-ui,sans-serif",F=(w,px)=>`${w} ${px}px ${SANS}`;
  const items=[],maxW=700;probe.font=F(500,32);
  for(const m of block){
   if(m.kind==="sys"){items.push({m,h:70});continue}
   const lines=wrap(probe,plain(m.text).replace(/^\[Meme\]\s*/,"😂 MEME · "),maxW-60);items.push({m,lines,h:(m.kind==="msg"?44:0)+lines.length*42+44+(m.react?34:0)+18});
  }
  // 4:5 when it fits, taller up to 9:16 for long chats; beyond that the chat is scaled down, never cut.
  const body=items.reduce((n,it)=>n+it.h,0),H=Math.max(1350,Math.min(1920,TOP+BOTTOM+PAD*2+body)),room=H-TOP-BOTTOM-PAD*2,k=Math.min(1,room/body);
  c.width=W;c.height=H;const g=c.getContext("2d");
  g.fillStyle="#0b141a";g.fillRect(0,0,W,H);
  g.fillStyle="#1f2c34";g.fillRect(0,0,W,TOP);
  g.fillStyle="#25d366";g.beginPath();g.arc(90,75,42,0,Math.PI*2);g.fill();g.fillStyle="#0b141a";g.font=F(900,38);g.textAlign="center";g.fillText("⚽",90,89);
  g.textAlign="left";g.fillStyle="#e9edef";g.font=F(800,40);g.fillText(`${clubName()} · Kabine`,155,70,W-200);g.fillStyle="#8696a0";g.font=F(600,26);g.fillText(members(),155,110,W-200);
  g.save();g.translate((W-W*k)/2,TOP+PAD);g.scale(k,k);
  let y=0;
  for(const it of items){
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
  g.restore();
  g.fillStyle="#1f2c34";g.fillRect(0,H-110,W,110);g.fillStyle="#e9edef";g.textAlign="center";g.font=F(900,32);g.fillText("FOOTERA – BUILD YOUR ERA",W/2,H-62);
  g.fillStyle="#8696a0";g.font=F(600,22);g.fillText("Insta @official_footera · TikTok @footera_official",W/2,H-28);
  const blob=await new Promise(r=>{try{c.toBlob(r,"image/png")}catch(e){r(null)}});
  return blob?new File([blob],"footera-kabine.png",{type:"image/png"}):null;
 }
 async function sharePicture(){
  finishPlay();const file=await picture(visibleMessages());if(!file)return;
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

 root.FooteraKabine={KEY,matchMessages,joinMessages,leaveMessages,coachMessages,castRoles,afterMatch,afterPack,afterSbc,answer,replyOptions,answersLeft,openRef,read,unread,open,close,buttonHTML,picture,shareBlock,visibleMessages,listHTML,short,moodInfo,photoSquad,_T:T,_GAGS:GAGS,_COACH:COACH,_MEMES:MEME_CARDS,memeFor};
 if(typeof document!=="undefined"&&document.addEventListener){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()}
})(window);
