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
 const pick=(list,seed,salt="")=>list[hash(seed+"|"+salt)%list.length];
 const fill=(text,vars)=>String(text).replace(/\{(\w+)\}/g,(_,k)=>vars[k]??"");
 const keyOf=p=>p?String(p.uid||p.name):"";
 const whoOf=p=>({name:String(p.name||"Spieler"),uid:String(p.uid||""),pid:String(p.pid||"")});

 /* ---------- storage ---------- */
 function read(){
  let v={};try{v=JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(e){v={}}
  if(!Array.isArray(v.msgs))v.msgs=[];if(!Array.isArray(v.refs))v.refs=[];if(!v.replies||typeof v.replies!=="object")v.replies={};
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
  {id:"traurig",when:"loss",lines:[["x","Heute keine Musik im Bus, oder? 😶"],["dj","Nur traurige Lieder 🎻😢"]]},
  {id:"nochmal",when:"loss",lines:[["x","Wer schaut sich das Spiel nochmal an? 👀"],["y","Ich nicht. Nie wieder. 🙈"]]},
  {id:"eisbad",lines:[["x","Eisbad nach dem Spiel war heute brutal 🥶🛁"],["food","Ich hab danach drei Kakao gebraucht ☕☕☕"]]},
  {id:"oma",lines:[["captain","Meine Oma hat angerufen. Sie fand die Aufstellung mutig 😂👵"],["x","Oma als Co-Trainer, ich bin dafür 🙋"]]}
 ];

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
 function matchMessages(d){
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
  const captain=P.filter(p=>p.pos!=="GK"&&p.started!==false).sort((a,b)=>num(b.ovr)-num(a.ovr))[0]||byRating[0]||null;
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
  const tryGag=salt=>{
   const pool=GAGS.filter(g=>(!g.when||g.when===result)&&!recent.has(g.id)&&!usedGags.includes(g.id));
   const list=pool.length?pool:GAGS.filter(g=>(!g.when||g.when===result)&&!usedGags.includes(g.id));
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

  const ctx={type:"match",result,gh,ga,away:vars.away,mode,best:ctxP(best),worst:ctxP(worst&&num(worst.rating)<6.6?worst:null),
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
  return{results:ctxs.map(m=>m.ctx?.result||m.result).slice(-12),gags:ctxs.flatMap(m=>m.ctx?.gags||[]).slice(-5)};
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
   gh:m.home,ga:m.away,pensWinner:m.penaltyWinner,pensHome:m.pensHome,pensAway:m.pensAway,extraTime:!!m.extraTimeStarted,mode:m.mode,tournament:!!m.tournament,
   opp:num(m.opp),power:num(m.power),weather:String(m.weather?.kind||""),injuredUid:m.injuryTriggered&&m.forcedOut?String(m.forcedOut):"",
   hour:t.hour,minute:t.minute,prev:hist.results,recentGags:hist.gags,memo:v.memo,mood:v.mood,
   goals:(m.goalEvents||[]).map(g=>({side:g.side,minute:num(g.minute),scorer:String(g.scorer||""),scorerUid:String(g.scorerUid||""),assist:String(g.assist||""),assistUid:String(g.assistUid||""),type:g.type})),
   players,potm:potm?{name:String(potm.base?.name||potm.name||""),uid:String(potm.uid||""),side:potm.side,rating:num(potm.rating)}:null
  };
 }
 // After a match the coach's last words are used up and the mood moves with the result.
 const MOOD_RESULT={win:4,draw:0,loss:-5};
 function afterMatch(m){
  try{
   const live=m||(typeof match!=="undefined"?match:null);
   if(!live?.finished||live.kabineRecorded)return 0;
   const d=fromMatch(live);if(!d||!d.players.length)return 0;
   live.kabineRecorded=true;
   const {result,messages}=matchMessages(d);
   return append(d.seed,messages.map(x=>({...x,result})),{update:v=>{v.memo={};v.mood=clamp(v.mood+(MOOD_RESULT[result]||0),0,100)}});
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
 function joinMessages(newcomer,voices,seed){
  const out=[{kind:"sys",text:`Trainer hat ${newcomer.name} hinzugefügt`,ctx:{type:"pack",n:whoOf(newcomer),icon:!!newcomer.icon,pos:String(newcomer.pos||""),players:voices.slice(0,8).map(v=>({...whoOf(v),pos:String(v.pos||"")}))}}];
  out.push({kind:"msg",who:whoOf(newcomer),text:pick(T.join,seed,"j")});
  const mates=voices.filter(v=>v.uid!==newcomer.uid&&v.name!==newcomer.name);
  const top=mates.slice(0,4);
  if(top.length){const m=top[hash(seed+"m")%top.length];out.push({kind:"msg",who:whoOf(m),text:newcomer.icon?pick(T.joinIcon,seed,"ji"):pick(T.joinReply,seed,"jr"),react:{e:"🔥",n:2+hash(seed+"jn")%6}})}
  const rival=newcomer.pos&&mates.find(v=>v.pos&&v.pos===newcomer.pos&&!out.some(o=>o.who?.uid===v.uid));
  if(rival)out.push({kind:"msg",who:whoOf(rival),text:pick(T.joinRival,seed,"jv"),react:{e:"😂",n:2+hash(seed+"jvn")%5}});
  else{const f=mates.find(v=>!out.some(o=>o.who?.uid===v.uid));if(f&&hash(seed+"fee")%2===0)out.push({kind:"msg",who:whoOf(f),text:pick(T.joinFee,seed,"jf")})}
  return out;
 }
 function afterPack(items){
  try{
   if(!Array.isArray(items)||!items.length||typeof displayBase!=="function")return 0;
   const ranked=items.map(item=>{const b=displayBase(item);return b?{item,b,ovr:ratingOf(item,b),special:item.variant==="special"||item.variant==="icon-mid"||!!b.isIcon}:null}).filter(Boolean)
    .filter(x=>x.ovr>=84||(x.special&&x.ovr>=80)).sort((x,y)=>y.ovr-x.ovr);
   const best=ranked[0];if(!best)return 0;
   const newcomer={name:String(best.b.name||"Spieler"),uid:String(best.item.uid||""),pid:String(best.b.id||""),icon:!!best.b.isIcon,pos:String(best.b.position||"").toUpperCase()};
   const ref="p:"+(newcomer.uid||newcomer.pid+"|"+Date.now());
   return append(ref,joinMessages(newcomer,squadVoices(new Set([newcomer.uid])),ref));
  }catch(e){console.warn("Kabinen-Chat:",e);return 0}
 }
 function leaveMessages(names,more,voices,seed,leaver=null){
  const list=more>0?`${names.join(", ")} und ${more} weitere`:names.join(" und ");
  const out=[];
  if(leaver)out.push({kind:"msg",who:whoOf(leaver),text:pick(T.leaveBye,seed,"lb"),react:{e:"🫡",n:3+hash(seed+"lbn")%7}});
  out.push({kind:"sys",text:`${list} ${names.length+more>1?"haben":"hat"} die Gruppe verlassen (SBC)`,ctx:{type:"sbc",gone:names.slice(0,2),players:voices.slice(0,8).map(v=>({...whoOf(v),pos:String(v.pos||"")}))}});
  if(voices.length)out.push({kind:"msg",who:whoOf(voices[hash(seed)%Math.min(3,voices.length)]),text:pick(T.leave,seed,"l")});
  return out;
 }
 // Players handed in for an SBC leave the group (only when a 82+ player was among them).
 function afterSbc(items){
  try{
   if(!Array.isArray(items)||!items.length||typeof displayBase!=="function")return 0;
   const gone=items.map(i=>{const b=displayBase(i);return b?{name:String(b.name||"Spieler"),ovr:ratingOf(i,b),uid:String(i.uid||""),pid:String(b.id||"")}:null}).filter(Boolean).sort((x,y)=>y.ovr-x.ovr);
   if(!gone.length||gone[0].ovr<82)return 0;
   const top=gone.slice(0,2).map(x=>x.name),ref="s:"+gone.map(x=>x.uid).join(",").slice(0,180);
   return append(ref,leaveMessages(top,gone.length-top.length,squadVoices(new Set(gone.map(x=>x.uid))),ref,gone[0]));
  }catch(e){console.warn("Kabinen-Chat:",e);return 0}
 }

 /* ---------- the coach ---------- */
 // Each option: when(ctx) -> available, coach text(s), reactions [speaker, texts, when?], mood change, memo for next match.
 // Speakers: best/worst/red/joker/keeper/captain/new (pack signing), roles (late/dj/food/gamer/style/kasse),
 // x/y/z = other players. "a|b" = first available.
 const W=c=>c.result==="win",NL=c=>c.result!=="win";
 const COACH={
  praiseBest:{label:c=>`⭐ ${short(c.best.name)} loben`,when:c=>c.type==="match"&&c.best,mood:8,memo:c=>({praised:{uid:c.best.uid,name:c.best.name}}),
   say:["@[{B}] Weltklasse heute! 👑 So will ich das sehen.","@[{B}], so spielt ein Anführer! 👏","Ein Extra-Lob an @[{B}]. Note {r}! 🔥","@[{B}] ich hab Gänsehaut bekommen. Danke! 🙌"],
   re:[["best",["Danke Trainer 🥹 Ich geb's an die Jungs weiter","Krieg ich jetzt die Kapitänsbinde? 😏","Screenshot gemacht. Kommt ins Profil 📸😂","Ich weiß, Trainer. Ich weiß 😎"]],
    ["x",["Trainerliebling 😂","Und wer hat die Bälle aufgelegt? 🙄","@[{B}] muss jetzt die ganze Woche Kaffee holen ☕😂","Schleimer-Alarm 🚨😂","Jetzt hebt @[{B}] komplett ab 🚀😂"]],
    ["keeper",["Ich hab übrigens auch gespielt 🧤😤","Hallo? Weiße Weste? 🧤👀"],c=>c.keeper&&c.keeper.clean&&c.keeper.uid!==c.best.uid],
    ["y",["Ab morgen trägt @[{B}] die Nase noch höher 👃😂","Ich will auch gelobt werden 🥺","Kann man den Chat stumm schalten, bevor jetzt wieder angegeben wird? 🔕😂"]],
    ["best",["Neid ist die höchste Form der Anerkennung 😎","Ihr dürft mir ab jetzt die Tasche tragen 😂"],c=>hash(c.best.name)%2===0]]},
  praiseKeeper:{label:c=>`🧤 ${short(c.keeper.name)} feiern`,when:c=>c.type==="match"&&c.keeper&&(c.keeper.clean||c.keeper.saves>=4)&&c.best?.uid!==c.keeper.uid,mood:5,
   say:["@[{K}] du warst heute eine Wand 🧱🧤","@[{K}] Hände aus Gold heute 🧤✨"],
   re:[["keeper",["Endlich sieht's mal einer 🥹🧤","Ich nehm Lob auch in Form von Pizza 🍕🧤"]],["x",["Hände aus Klebstoff 🧤✨","Ohne dich wär das heute nix geworden 🙏"]]]},
  praiseJoker:{label:c=>`🃏 ${short(c.joker.name)} feiern`,when:c=>c.type==="match"&&c.joker&&c.best?.uid!==c.joker.uid,mood:5,
   say:["Was ein Joker, @[{J}]! 🃏🔥","@[{J}] rein, Tor, Held. So einfach 🃏"],
   re:[["joker",["Nächstes Mal Startelf? 👀😏","Die Bank hat mich heiß gemacht 🔥"]],["x",["Jetzt will @[{J}] bestimmt mehr Gehalt 💰😂","Super-Sub! 🦸"]]]},
  praiseTeam:{label:()=>"👏 Alle loben",when:c=>c.type==="match"&&c.result!=="loss",mood:6,
   say:["Stark, Leute! Jeder einzelne 👏","Ich bin stolz auf euch. Wirklich. 🫶","So sieht ein Team aus 💪"],
   re:[["captain",["Danke, Trainer! 🙌","Wir geben das Lob an die Fans weiter 🙌"]],["x",["💪💪💪","Trainer wird emotional 🥹😂","Ich hab's mir eingerahmt 🖼️"]]]},
  cheerUp:{label:()=>"🫂 Aufbauen",when:c=>c.type==="match"&&c.result==="loss",mood:6,
   say:["Kopf hoch, Leute. Ich glaub an euch. 🫂","Eine Niederlage macht uns nicht kaputt. Wir kommen zurück! 💪"],
   re:[["captain",["Wir zahlen das zurück, versprochen 🤝","Danke, Trainer. Das brauchten wir 🙏"]],["x",["❤️","Nächstes Spiel geht's richtig ab 😤"]]]},
  criticize:{label:c=>`😤 ${short(c.worst.name)} kritisieren`,when:c=>c.type==="match"&&c.worst&&c.worst.uid!==c.best?.uid,mood:-4,
   say:["@[{W}] das war heute zu wenig. Da erwarte ich mehr.","@[{W}], wir müssen reden. Morgen 10 Uhr, mein Büro 🚪","@[{W}] Note {wr}… ich sag lieber nix 😶"],
   re:[["worst",["Ich weiß, Trainer. Kommt nicht wieder 🙏","War der Rasen! 😤 …okay, war ich.","Autsch. Aber berechtigt 😓","Kann ich das Büro-Gespräch per Sprachnachricht machen? 😅"]],
    ["x",["Uiuiui 😬","Ich hol schon mal Popcorn 🍿","Oha, er hat 'wir müssen reden' geschrieben 😳"]],["y",["Kopf hoch @[{W}] 🫂","Ich war auch nicht viel besser, psst 🤫"]]]},
  bench:{label:c=>`🪑 ${short(c.worst.name)} mit Bank drohen`,when:c=>c.type==="match"&&c.worst&&c.worst.uid!==c.best?.uid,mood:-6,memo:c=>({benched:{uid:c.worst.uid,name:c.worst.name}}),
   say:["Noch so ein Spiel, @[{W}], und du wärmst die Bank 🪑","@[{W}] die Bank hat schon nach dir gefragt 🪑😏","@[{W}] ich hab dir schon mal ein Kissen auf die Bank gelegt 🪑"],
   re:[["worst",["NEIN Trainer, bitte nicht 😭","Ich trainier ab morgen doppelt, versprochen 💪","Die Bank ist kalt um diese Jahreszeit 🥶","Challenge accepted 😤"]],["x",["Ich nehm deinen Platz gern 👀","Kissen leih ich dir 🪑😂","Bank-Wärmer-Club, willkommen 🪑😂"]],["y",["Harte Ansage 😳","Ich sag nix. Ich will nicht der Nächste sein 🤐"]]]},
  sermon:{label:()=>"📢 Kabinenpredigt",when:c=>c.type==="match",mood:c=>W(c)?-3:-8,memo:()=>({sermon:true}),
   say:c=>W(c)?["Ja, gewonnen. ABER: Die zweite Halbzeit war ein Kindergeburtstag! 📢😤","Glaubt bloß nicht, dass ich zufrieden bin! Nur weil's 3 Punkte gibt! 📢","ICH. WILL. MEHR. Auch wenn wir gewinnen! 📢🔥"]
    :["SO NICHT, LEUTE! Ich will Leidenschaft sehen! Laufbereitschaft! ZWEIKÄMPFE! 📢😤","Ich war noch nie so sauer. NIE. Morgen will ich Gesichter sehen, die brennen 🔥📢","Wer heute nicht gekämpft hat, braucht morgen nicht zu kommen. Punkt. 📢"],
   re:[["x",["😶","Ja, Trainer 😶","…","Ich hab Angst 😰"]],["sys",["{y} hat die Gruppe stummgeschaltet 🔕","{y} hat das Handy weggelegt 📵"],c=>hash(c.away+c.gh)%2===0],
    ["z",["Wer hat ihn so wütend gemacht? 👀","Meine Ohren klingeln, und das ist nur ein Chat 😵","Selbst mein Handy hat vibriert 📳😳"]],["captain",["Ihr habt ihn gehört, Leute. 💪","Verstanden, Chef. Wir liefern 🫡"]]]},
  pizza:{label:()=>"🍕 Pizza für alle",when:c=>c.type==="match"&&c.result!=="loss",mood:10,memo:()=>({pizza:true}),
   say:["Pizza geht heute auf mich 🍕","Pizza für alle! Ihr habt's euch verdient 🍕🍕","Ich hab 20 Pizzen bestellt. Keine Diskussion 🍕"],
   re:[["food",["TRAINER 😍🍕","Ich nehm drei. Mit extra Käse 🧀","Ich bin schon an der Tür 🏃‍♂️🍕"]],["x",["Ich nehm Salami!","Ananas auf Pizza ist verboten in dieser Kabine 🍍🚫","Bester Trainer der Liga 🍕❤️"]],["y",["@[{food}] lass uns auch was übrig 😂","Wer Ananas bestellt, fliegt raus 🍍😤"]]]},
  party:{label:()=>"🎉 Party heute Abend",when:W,mood:10,memo:()=>({party:true}),
   say:["Heute Abend wird gefeiert 🎉 Musik an!","Party! Aber um 12 seid ihr alle im Bett 😏🎉"],
   re:[["dj",["DJ {dj} ist bereit 🎧🔥","Playlist steht seit der 80. Minute 😎🎶"]],["late",["Ich komm später 😅","Wann geht's los? Ich bin noch beim Friseur 💇‍♂️"]],["x",["@[{late}] du kommst IMMER später 😂"]],["style",["Ich hab mein Outfit schon seit Dienstag geplant 👔✨"]]]},
  dayOff:{label:()=>"😴 Morgen frei",when:c=>c.type==="match"&&c.result!=="loss",mood:8,memo:()=>({dayoff:true}),
   say:["Morgen ist frei. Genießt es 😴","Freier Tag! Aber keine Dummheiten 😏"],
   re:[["x",["BESTER TRAINER DER WELT 🙌","Ich liebe dich, Trainer 😭❤️"]],["gamer",["Footera-Marathon, ich komme 🎮","Endlich Zeit für meine Packs 🎮📦"]],["late",["Endlich mal pünktlich: im Bett 😂"]]]},
  run:{label:()=>"🏃 Straflauf um 7",when:c=>c.type==="match",mood:-6,memo:()=>({run:true}),
   say:c=>W(c)?["Gewonnen, schön. Trotzdem: morgen 7 Uhr Straflauf. Für die zweite Halbzeit 🏃‍♂️⏰"]:["Morgen 7 Uhr. Straflauf. Alle. 🏃‍♂️⏰","Ich hab den Hügel hinterm Trainingsplatz gefunden. Bis morgen um 7 ⛰️🏃"],
   re:[["late",["7 UHR?! Da schlaf ich noch tief und fest 😭","Gibt's 7 Uhr auch abends? 😅"]],["x",["Meine Beine weinen jetzt schon 🦵😭","Ich hab plötzlich Fieber 🤒"]],["y",["Kann ich krank sein? 🤒","Ich bring Kaffee mit ☕","Wer zuletzt ankommt, zahlt Frühstück 🥐"]]]},
  video:{label:()=>"📼 Videoanalyse",when:c=>c.type==="match"&&c.result!=="win",mood:-2,
   say:["Morgen 9 Uhr Videoanalyse 📼 Popcorn gibt's keins.","Ich hab 47 Szenen rausgeschnitten. Wir gehen alle durch 📼"],
   re:[["x",["Oh nein… 😩","Kann man die Gegentore vorspulen? ⏩"]],["gamer",["Kann ich den Controller mitbringen? 🎮"]],["y",["47?! Ich bring Schlafsack mit 😴"]]]},
  fine:{label:c=>`💶 Strafe für ${short((c.red||c.yellow).name)}`,when:c=>c.type==="match"&&(c.red||c.yellow),mood:-2,
   say:c=>c.red?["@[{R}] Rote Karte = 50 € in die Mannschaftskasse 💶"]:["@[{R}] Gelb wegen Meckern = 10 € in die Kasse 💶"],
   re:[["red",["Wie viel?! 😳","Kann ich in Raten zahlen? 😅","Ich zahl mit Panini-Bildern 😂"]],["kasse",["Kasse klingelt 💰😏","Notiert ✍️💶"]],["x",["Davon gibt's dann Pizza 🍕"]]]},
  tactics:{label:()=>"📋 Taktik-Ansage",when:c=>c.type==="match",mood:1,
   say:["Nächstes Spiel: hoch pressen, schnell umschalten! 📋","Mehr über die Flügel, Leute! 📋 Flanken, Flanken, Flanken!","Ab sofort: Wer den Ball verliert, holt ihn zurück. Punkt. 📋"],
   re:[["captain",["Verstanden, Chef 🫡","Jawohl! 📋💪"]],["x",["Ich hab nur 'Flanken' gelesen und bin schon motiviert 😂","Ich schreib's mir auf den Arm ✍️"]],["striker",["Hauptsache, ich krieg den Ball 😏"]]]},
  voice:{label:()=>"🎤 Sprachnachricht",when:c=>c.type==="match",mood:2,voice:true,
   re:[["x",["{dur} Minuten?! 😂","Hab's auf 2-fach gehört, klang wie ein Eichhörnchen 🐿️😂","Trainer, das ist ein Podcast, keine Sprachnachricht 🎙️😂"]],
    ["y",["Kann jemand zusammenfassen? 🙏","Ich bin nach 30 Sekunden eingeschlafen 😴","Bin im Bus, hör ich später. Also nie 😅"]],
    ["captain",["Zusammenfassung: Trainer ist {feel}. 🫡"]]]},
  meme:{label:()=>"😂 Meme schicken",when:c=>c.type==="match",mood:5,meme:true,
   re:[["x",["😂😂😂","Trainer ist online witziger als in der Kabine 😂","WER hat ihm gezeigt, wie Memes gehen? 👀"]],["y",["Hab's in meinen Status gestellt 📲","Ich fühl mich angegriffen 😤😂"]]]},
  // pack signings
  welcome:{label:c=>`🤝 ${short(c.n.name)} begrüßen`,when:c=>c.type==="pack",mood:4,
   say:c=>c.icon?["Willkommen, @[{N}]! Eine echte Legende bei uns 🙇"]:["Willkommen, @[{N}]! 🤝 Zeig, was du kannst.","@[{N}] schön, dass du da bist! 🤝"],
   re:[["new",["Danke Trainer! Ich geb alles 💪","Wann ist das erste Training? 👀"]],["x",["Einstand nicht vergessen 🎂😏","Willkommen im Irrenhaus 😂"]]]},
  cake:{label:()=>"🎂 Einstand fordern",when:c=>c.type==="pack",mood:3,
   say:["Neuzugang heißt Einstand. Kuchen für alle, @[{N}] 🎂","@[{N}] Regel Nummer 1: Wer neu ist, bringt Kuchen 🎂"],
   re:[["new",["Welcher Kuchen? 😅","Ich kann nur Fertigkuchen 😬🎂"]],["food",["Schoko bitte! 🍫","Zwei Bleche, mindestens 🎂🎂"]]]},
  number:{label:()=>"👕 Trikotnummer geben",when:c=>c.type==="pack",mood:3,
   say:["@[{N}] du kriegst die {num} 👕","@[{N}] Rückennummer {num}. Trag sie mit Stolz 👕"],
   re:[["new",["Meine Lieblingsnummer 😍","Ich wollte eigentlich die 10 😤","Mama wird stolz sein 🥹👕"]],["x",["Die 10 bleibt meine 😏","Die {num} hatte vorher ein Bronze-Spieler 😂"]]]},
  // SBC
  thanks:{label:()=>"🫡 Danke sagen",when:c=>c.type==="sbc",mood:2,
   say:c=>[`Danke für alles, ${c.gone.map(short).join(" und ")}! 🫡`,"Ihr wart super. Danke! 🫡"],
   re:[["x",["Wir vergessen euch nie 🥲","Lebt wohl 🫡"]],["y",["Wer kriegt jetzt den Spind? 👀","Ich nehm die Duschgel-Sammlung 😂"]]]},
  business:{label:()=>"💼 Geschäft ist Geschäft",when:c=>c.type==="sbc",mood:-3,
   say:["Geschäft ist Geschäft. Weiter geht's 💼","Kommt vor. Wir bauen weiter 💼"],
   re:[["x",["Kalt, Trainer 🥶","Bin ich der Nächste? 😳"]],["y",["Ich mach ab jetzt freiwillig Extraschichten 😰"]]]}
 };
 const ORDER=["praiseBest","praiseKeeper","praiseJoker","praiseTeam","cheerUp","criticize","bench","fine","sermon","pizza","party","dayOff","run","video","voice","meme","tactics","welcome","cake","number","thanks","business"];
 const NICE=["pizza","party","dayOff","praiseTeam"],HARSH=["run","sermon","bench","video"];
 const MEMES=["[Meme] Ich nach 90 Minuten Pressing: 💀","[Meme] 'Nur kurz auslaufen' – der Trainer, 45 Minuten später 🏃‍♂️🏃‍♂️🏃‍♂️","[Meme] Unsere Abwehr beim Konter: 🚪🏃‍♂️💨","[Meme] Wenn der Schiri 8 Minuten Nachspielzeit anzeigt: 😱","[Meme] Der Ball, wenn ich flanke: 🛰️","[Meme] Ich beim Aufwärmen vs. ich in der 89. Minute: 🦁 / 🐌"];
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
 function coachMessages(id,c,ref,prior=[]){
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
  else if(o.meme)out.push({kind:"me",text:pick(MEMES,seed,"meme"),meme:true});
  else{const pool=typeof o.say==="function"?o.say(c):o.say;out.push({kind:"me",text:fill(pick(pool,seed,"say"),vars)})}
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
  const c=blockCtx(v,ref),prior=used(v,ref)||[],out=coachMessages(o.id,c,ref,prior);if(!out.length)return[];
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
 function memeHTML(m){const t=String(m.text).replace(/^\[Meme\]\s*/,"");return`<div class="kb-meme"><small>MEME</small><p>${textHTML(t)}</p></div>`}
 function msgHTML(m,prev){
  if(m.kind==="sys")return`<div class="kb-sys" data-kb-id="${escText(m.id)}"><span>${escText(m.text)}</span></div>`;
  const time=`<time>${escText(timeLabel(m.ts))}</time>`;
  if(m.kind==="me"){const body=m.voice?voiceHTML(m):m.meme?memeHTML(m):`<p>${textHTML(m.text)}</p>`;return`<div class="kb-row me" data-kb-id="${escText(m.id)}"><div class="kb-bubble${m.voice?" kb-has-voice":""}">${body}${time}<i class="kb-ticks" aria-hidden="true">✓✓</i></div></div>`}
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
   const chip=e.target.closest("[data-kb-reply]");
   if(chip){finishPlay();const added=answer(chip.dataset.kbRef,chip.dataset.kbReply);renderFoot(true);if(added.length)play(added.map(()=>0),true);return}
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
  if(!fresh.length){scrollEnd();unlockFoot();return}
  if(reduce){list.innerHTML=listHTML(v.msgs);scrollEnd();unlockFoot();return}
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
  const list=$("#kabineList"),v=read();if(list){list.innerHTML=v.msgs.length?listHTML(v.msgs):emptyHTML();scrollEnd()}
  unlockFoot();
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
   const lines=wrap(probe,plain(m.text),maxW-60);items.push({m,lines,h:(m.kind==="msg"?44:0)+lines.length*42+44+(m.react?34:0)+18});
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

 root.FooteraKabine={KEY,matchMessages,joinMessages,leaveMessages,coachMessages,castRoles,afterMatch,afterPack,afterSbc,answer,replyOptions,answersLeft,openRef,read,unread,open,close,buttonHTML,picture,shareBlock,visibleMessages,listHTML,short,moodInfo,_T:T,_GAGS:GAGS,_COACH:COACH};
 if(typeof document!=="undefined"&&document.addEventListener){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()}
})(window);
