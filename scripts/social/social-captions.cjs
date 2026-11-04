/* Captions + slide plans for the Social-Autopilot. German, Basti's rules (memory instagram-caption-rules):
 * max 5 hashtags (#footera #buildyourera #mobilegame #fußball + 1 fitting tag), no EA terms, "Fußball-Manager fürs Handy",
 * never "Browser"/"Kartenspiel", name modes (Squad Battles, Rivals, Champions), link tinyurl.com/footera-play on X. */
const LINK="tinyurl.com/footera-play";
const FLAGS={Germany:"🇩🇪",France:"🇫🇷",Spain:"🇪🇸",England:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",Portugal:"🇵🇹",Brazil:"🇧🇷",Argentina:"🇦🇷",Italy:"🇮🇹",Holland:"🇳🇱",Netherlands:"🇳🇱",Belgium:"🇧🇪",Norway:"🇳🇴",Sweden:"🇸🇪",Denmark:"🇩🇰",Poland:"🇵🇱",Croatia:"🇭🇷",Serbia:"🇷🇸",Switzerland:"🇨🇭",Austria:"🇦🇹",Scotland:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",Wales:"🏴󠁧󠁢󠁷󠁬󠁳󠁿","Republic of Ireland":"🇮🇪",Uruguay:"🇺🇾",Colombia:"🇨🇴",Ecuador:"🇪🇨",Mexico:"🇲🇽","United States":"🇺🇸",Canada:"🇨🇦",Morocco:"🇲🇦",Egypt:"🇪🇬",Senegal:"🇸🇳",Nigeria:"🇳🇬",Ghana:"🇬🇭",Cameroon:"🇨🇲","Côte d'Ivoire":"🇨🇮",Algeria:"🇩🇿",Tunisia:"🇹🇳","Congo DR":"🇨🇩",Mali:"🇲🇱",Guinea:"🇬🇳",Japan:"🇯🇵","Korea Republic":"🇰🇷",Georgia:"🇬🇪",Turkey:"🇹🇷","Türkiye":"🇹🇷",Ukraine:"🇺🇦",Russia:"🇷🇺",Hungary:"🇭🇺",Slovakia:"🇸🇰",Slovenia:"🇸🇮","Czech Republic":"🇨🇿",Czechia:"🇨🇿",Greece:"🇬🇷",Iceland:"🇮🇸",Finland:"🇫🇮",Albania:"🇦🇱",Kosovo:"🇽🇰","Bosnia and Herzegovina":"🇧🇦",Montenegro:"🇲🇪","North Macedonia":"🇲🇰",Romania:"🇷🇴",Paraguay:"🇵🇾",Chile:"🇨🇱",Venezuela:"🇻🇪",Peru:"🇵🇪",Australia:"🇦🇺","Burkina Faso":"🇧🇫",Gabon:"🇬🇦",Jamaica:"🇯🇲","Cape Verde":"🇨🇻",Uzbekistan:"🇺🇿",Israel:"🇮🇱",Armenia:"🇦🇲"};
const flag=n=>FLAGS[n]||"⚽";
const WD=["So","Mo","Di","Mi","Do","Fr","Sa"];
function berlin(ms){const p=Object.fromEntries(new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",year:"numeric",hour12:false}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));const wd=new Date(ms).toLocaleDateString("en-US",{timeZone:"Europe/Berlin",weekday:"short"});return{wd:WD[["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(wd)],day:p.day,month:p.month,year:p.year,hour:p.hour,minute:p.minute}}
const when=v=>{const ms=typeof v==="number"?v:Date.parse(v);const b=berlin(ms);return `${b.wd} ${b.day}.${b.month}. ${b.minute==="00"?b.hour+" Uhr":b.hour+":"+b.minute+" Uhr"}`};
const isoBerlin=ms=>{const b=berlin(ms);const off=new Intl.DateTimeFormat("en",{timeZone:"Europe/Berlin",timeZoneName:"longOffset"}).formatToParts(new Date(ms)).find(x=>x.type==="timeZoneName").value.replace("GMT","")||"+00:00";return `${b.year}-${b.month}-${b.day}T${b.hour}:${b.minute}:00${off}`};
const short=name=>{const n=String(name),parts=n.split(" ");return n.length<=14||parts.length<2?n:parts.slice(1).join(" ")};
const EMO={halloween:["🎃","🩸"],blackfriday:["🖤","⚡"],totw:["🚨","⚫🔴"],season:["⏳","🩸"],footera:["🔥","⚽"]};
const TAG={halloween:"#halloween",blackfriday:"#blackfriday",totw:"#teamderwoche",season:"#seasonpass",footera:"#fußballmanager"};
const tags=theme=>`#footera #buildyourera ${TAG[theme]||TAG.footera} #fußball #mobilegame`;
const themeKey=t=>THEME_ALIASES[t]||t||"footera";
const THEME_ALIASES={"halloween":"halloween","blackfriday":"blackfriday","black friday":"blackfriday"};
const modeName=m=>({squad:"Squad Battles",rivals:"Rivals",champions:"Champions"})[m]||"Spiele";
function slug(s){return String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)}
function idFor(entry,suffix){const b=berlin(entry.at);return `${b.year}-${b.month}-${b.day}-${b.hour}${b.minute}-${slug(suffix)}`}

function buildPosts(entry,content){
 const f=content.facts,cards=content.cards,theme=themeKey(entry.kind==="totw"?"totw":entry.theme||(f.deal?.theme)||"footera"),[e1,e2]=EMO[theme]||EMO.footera;
 const idx=role=>cards.map((c,i)=>c.role===role?i:-1).filter(i=>i>=0);
 const team=idx("team"),sbc=idx("sbc"),obj=idx("objective"),pass=idx("pass");
 const post={kind:entry.kind,theme,postAt:isoBerlin(entry.at),title:entry.title,keys:entry.keys,status:"entwurf"};
 const extras=[],slides=[];
 const finish=(o)=>{const p={...post,...o};p.id=idFor(entry,o.slug||entry.title);delete p.slug;return [p]};
 const topLine=list=>list.map(x=>`${x.name.split(" ").length>1?short(x.name):x.name} ${x.ovr}`).join(", ").replace(/, ([^,]*)$/," und $1");

 if(entry.kind==="teaser"){
  const bf=entry.keys.includes("bf-teaser"),rel=when(entry.releaseAt),eventName=bf?"BLACK FRIDAY":(f.event||entry.title),teamName=bf?"":(f.team&&/team/i.test(f.team)?f.team:"");
  const head=bf?`${e1} BLACK FRIDAY KOMMT ${e2}`:`⏳ HEUTE ${berlin(entry.releaseAt).hour} UHR ${e2}`;
  const body=bf?`Ab ${rel} gibt es in Footera ${f.count||18} neue Neon-Karten, jeden Tag einen neuen Deal und −30 % auf Coin-Packs im Shop.\nErkennst du schon jemanden? 👀`:`${eventName}${teamName?" "+teamName.replace(/TEAM/i,"Team"):""} kommt nach Footera: ${f.count||cards.length} neue Event-Karten.\nErkennst du schon jemanden? Tipp in die Kommentare 👇`;
  const caption=`${head}\n\n${body}\n\nFootera, der Fußball-Manager fürs Handy. Link in Bio ${e1}\n${tags(theme)}`;
  slides.push({theme,kicker:bf?"Ab "+rel:"Heute · "+berlin(entry.releaseAt).hour+":00 Uhr",title:eventName,sub:teamName||`${f.count||cards.length} neue Karten`,cardIdx:team.slice(0,bf?9:9),silhouette:true,layout:"grid"});
  return finish({slug:(bf?"black-friday":eventName)+"-teaser",title:`Teaser: ${eventName}${teamName?" "+teamName:""}`,slides,reel:{theme,kicker:slides[0].kicker,title:eventName,sub:slides[0].sub,cardIdx:team,silhouette:true},
   instagram:{caption,type:"carousel"},story:true,tiktok:{title:`${eventName}: ${bf?"ab "+rel:"heute "+berlin(entry.releaseAt).hour+" Uhr"} ${e2}`,caption,format:"video"},
   x:{priority:bf?1:3,text:`${head}\n\n${body.split("\n")[0]}\n\n👉 ${LINK}\n#footera`},plan:{instagram:"carousel",story:true,tiktok:"video",x:bf}});
 }

 if(entry.kind==="totw"){
  const list=(f.top||[]).map(p=>`${flag(p.nation)} ${p.ovr} ${p.name}`).join("\n");
  const caption=`🚨 TOTW ${f.totw} IST DA!\n\nAb 19 Uhr in den Packs ⚫🔴\n\n${list}\n\nWen ziehst du? 👇\nFOOTERA – BUILD YOUR ERA\n${tags("totw")}`;
  slides.push({theme:"totw",kicker:"Team of the Week",title:`TOTW ${f.totw}`,sub:`${when(entry.at)} · ${f.count} Spieler`,cardIdx:team,layout:"grid"});
  slides.push({theme:"totw",kicker:"Die Top-Karten",title:`TOTW ${f.totw}`,cardIdx:team.slice(0,3),layout:"grid"});
  return finish({slug:`totw-${f.totw}`,title:`TOTW ${f.totw}`,slides,reel:{theme:"totw",kicker:"Team of the Week",title:`TOTW ${f.totw}`,sub:"Ab 19 Uhr in den Packs",cardIdx:team},
   instagram:{caption,type:"carousel"},story:true,tiktok:{title:`TOTW ${f.totw} ist da 🚨`,caption,format:"video"},
   x:{priority:1,text:`🚨 TOTW ${f.totw} IST DA!\n\nAb 19 Uhr in den Packs ⚫🔴\n\n${(f.top||[]).slice(0,5).map(p=>`${flag(p.nation)} ${p.ovr} ${p.name}`).join("\n")}\n\n👉 ${LINK}`},plan:{instagram:"carousel",story:true,tiktok:"video",x:true}});
 }

 if(entry.kind==="last-chance"){
  const what=f.sbc?`die SBC ${f.sbc.name} ${f.sbc.ovr}`:f.objective?`das Objective ${f.objective.name} ${f.objective.ovr}`:f.deal?`„${f.deal.name}“`:`das ${f.event||entry.title.replace(/ endet$/,"")}-Event`;
  const head=`⏰ LETZTE CHANCE ${e2}`;
  const caption=`${head}\n\nHeute um ${berlin(entry.endAt).hour} Uhr endet ${what} in Footera.\nSchon erledigt? 👇\n\nFOOTERA – BUILD YOUR ERA\n${tags(theme)}`;
  const ci=sbc.length?sbc:obj.length?obj:team.slice(0,6);
  slides.push({theme,kicker:"Letzte Chance",title:f.sbc?short(f.sbc.name):f.objective?short(f.objective.name):f.deal?f.deal.name:(f.event||entry.title.replace(/ endet$/,"")),sub:`Endet heute · ${berlin(entry.endAt).hour}:00 Uhr`,cardIdx:ci,layout:ci.length===1?"hero":"grid"});
  return finish({slug:"letzte-chance-"+(f.sbc?.name||f.objective?.name||f.deal?.name||f.event||entry.title),title:`Letzte Chance: ${what}`,slides,
   instagram:{caption,type:"story-only"},story:true,tiktok:null,x:{priority:3,text:`${head}\n\nHeute ${berlin(entry.endAt).hour} Uhr endet ${what} in Footera.\n\n👉 ${LINK}`},plan:{instagram:"story",story:true,tiktok:null,x:false}});
 }

 if(entry.kind==="season-end"){
  const s=f.season||{},d=entry.daysLeft,head=d>=7?`⏳ NOCH ${d} TAGE SEASON PASS`:d===1?"⏳ MORGEN ENDET DER SEASON PASS":"⏳ HEUTE ENDET DER SEASON PASS";
  const caption=`${head} ${e2}\n\nSaison ${s.number} „${s.name}“ endet ${when(entry.endAt)}. Hol dir jetzt noch die letzten Stufen und Pass-Spieler.\nAuf welcher Stufe bist du? 👇\n\nFOOTERA – BUILD YOUR ERA\n${tags("season")}`;
  slides.push({theme:"season",kicker:`Saison ${s.number} · ${s.name}`,title:d>=2?`Noch ${d} Tage`:d===1?"Morgen Schluss":"Heute Schluss",sub:`Season Pass endet ${when(entry.endAt)}`,cardIdx:pass,layout:"grid"});
  return finish({slug:`season-pass-${d}`,title:head,slides,reel:d===7?{theme:"season",kicker:`Saison ${s.number} · ${s.name}`,title:`Noch ${d} Tage`,sub:"Season Pass Endspurt",cardIdx:pass}:null,
   instagram:{caption,type:"carousel"},story:true,tiktok:d===7?{title:`Season Pass: noch ${d} Tage ⏳`,caption,format:"video"}:null,x:{priority:d===7?2:3,text:`${head}\n\nSaison ${s.number} „${s.name}“ endet ${when(entry.endAt)}.\n\n👉 ${LINK}`},plan:{instagram:d===1?"story":"carousel",story:true,tiktok:d===7?"video":null,x:false}});
 }

 // Launch moment: event team and/or SBC / objective / evolution / deals at the same minute.
 let headline="",title=entry.title,priority=2;
 if(team.length){
  headline=`${e1} ${f.event}${f.team&&/team/i.test(f.team)?" "+f.team.toUpperCase():""} IST LIVE ${e2}`;priority=1;
  extras.push(`${f.count} neue Event-Karten, angeführt von ${topLine(f.top||[])}`);
  slides.push({theme,kicker:`${f.event} · ${f.team||"Event"}`,title:f.event,sub:`${f.count} neue Karten · bis ${when(f.until)}`,cardIdx:team,layout:"grid"});
  if(team.length>6)slides.push({theme,kicker:`${f.event} · Die Top-Karten`,title:f.event,sub:topLine(f.top||[]),cardIdx:team.slice(0,3),layout:"grid"});
  title=`${f.event} ${f.team||""} Launch`.trim();
 }
 if(f.sbc){
  if(!headline){headline=`🔓 NEUE SPIELER-SBC: ${f.sbc.name.toUpperCase()} ${f.sbc.ovr} ${e2}`;priority=1;title=`SBC ${f.sbc.name} ${f.sbc.ovr}`}
  extras.push(`Spieler-SBC ${f.sbc.name} ${f.sbc.ovr}: ${f.sbc.parts} Teile, bis ${when(f.sbc.until)}`);
  slides.push({theme,kicker:`${f.sbc.event} · Spieler-SBC`,title:short(f.sbc.name),titleAccent:String(f.sbc.ovr),sub:`${f.sbc.parts} Teile · bis ${when(f.sbc.until)}`,cardIdx:sbc,layout:"hero",lines:(f.sbc.segments||[]).slice(0,3).map((s,i)=>`<b>${i+1}</b> · ${s.replace(/–/g,"·")}`)});
 }
 if(f.objective){
  if(!headline){headline=`🎁 GRATIS: ${f.objective.name.toUpperCase()} ${f.objective.ovr} ${e2}`;title=`Objective ${f.objective.name}`}
  extras.push(`${f.objective.name} ${f.objective.ovr} gratis: ${f.objective.desc.replace(/\.$/,"")}`);
  slides.push({theme,kicker:`${f.objective.event||"Event"} · Objective`,title:short(f.objective.name),titleAccent:String(f.objective.ovr),pill:"Gratis",sub:`${f.objective.target} Siege in ${modeName(f.objective.mode)}`,cardIdx:obj,layout:"hero"});
 }
 if(f.evo){
  if(!headline){headline=`🧬 NEUE EVOLUTION: ${f.evo.name.toUpperCase()}`;title=`Evolution ${f.evo.name}`}
  extras.push(`Neue Evolution „${f.evo.name}“${f.evo.band?" ("+f.evo.band+")":""}`);
 }
 if(f.deal){
  if(!headline){headline=`${e2} DEAL DES TAGES: ${f.deal.name.toUpperCase()}`;title=f.deal.name}
  extras.push(`${f.deal.desc.replace(/^Deal des Tages · /,"")} Bis ${when(f.deal.until)}`);
  slides.push({theme,kicker:"Deal des Tages",title:f.deal.name,sub:`bis ${when(f.deal.until)}`,lines:[f.deal.desc.replace(/^Deal des Tages · /,""),f.deal.req],layout:"text"});
 }
 if(f.storeDeal){
  if(!headline){headline=`💸 SHOP-DEAL: COIN-PACKS −${f.storeDeal.pct} %`;title=`Shop-Deal −${f.storeDeal.pct} %`}
  extras.push(`Coin-Packs im Shop −${f.storeDeal.pct} %, bis ${when(f.storeDeal.until)}`);
  slides.push({theme,kicker:"Shop-Deal",title:`−${f.storeDeal.pct} %`,sub:`auf Coin-Packs · bis ${when(f.storeDeal.until)}`,layout:"text"});
 }
 if(!headline)return [];
 if(extras.length===1&&f.sbc)extras[0]=`Die ${f.sbc.event}-Karte gibt es jetzt als Spieler-SBC: ${f.sbc.parts} Teile, nur bis ${when(f.sbc.until)}.`;
 if(extras.length===1&&f.objective&&!f.sbc)extras[0]=`${f.objective.desc.replace(/\.$/,"")} und hol dir die Karte gratis. Nur bis ${when(f.objective.until)}.`;
 const numbered=extras.length>1?extras.map((x,i)=>`${["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣"][i]} ${x}`).join("\n"):extras[0];
 const question=team.length?"Wer ist dein Favorit? 👇":f.sbc?"Wer schafft ihn als Erstes? 👇":"Holst du ihn dir? 👇";
 const caption=`${headline}\n\n${extras.length>1?"👉 Wisch dich durch:\n\n":""}${numbered}\n\n${question}\nFOOTERA – BUILD YOUR ERA\n${tags(theme)}`;
 const xText=`${headline}\n\n${extras.slice(0,2).map(x=>"• "+x).join("\n")}\n\n👉 ${LINK}`;
 const reelCards=team.length?team:sbc.length?sbc:obj;
 const reelBase=team.length?slides[0]:slides[0]||{};
 return finish({slug:(entry.keys[0]||"").split(":").slice(1).join("-").replace(/-\d+$/,"").slice(0,48)||title,title,slides,reel:reelCards.length?{theme,kicker:reelBase.kicker,title:reelBase.title,titleAccent:reelBase.titleAccent,sub:reelBase.sub,pill:reelBase.pill,cardIdx:reelCards,lines:team.length?[]:(reelBase.lines||[])}:null,
  instagram:{caption,type:slides.length>1?"carousel":"post"},story:true,tiktok:{title:headline.replace(/\s+/g," ").slice(0,90),caption,format:reelCards.length?"video":"photo"},
  x:{priority,text:xText.length>280?`${headline}\n\n• ${extras[0]}\n\n👉 ${LINK}`:xText},plan:{instagram:slides.length>1?"carousel":"post",story:true,tiktok:reelCards.length?"video":"photo",x:priority===1}});
}
module.exports={buildPosts,when,isoBerlin};
