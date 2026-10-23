const DB_SOURCES=[
 {name:"Footera Spielerdatenbank (EA)",url:"./assets/players-db.csv"}
];
const EA_RATINGS_API="https://drop-api.ea.com/rating/ea-sports-fc";
const DB_MIN_PLAYERS=10000;
// Written next to the CSV on every refresh. A changed revision replaces the offline copy, so weekly rating and name updates reach existing installs.
const DB_VERSION_URL="./assets/players-db-version.json";
const LEAGUE_CHOICES=[
 {id:"bundesliga",label:"Bundesliga",aliases:["Bundesliga"]},
 {id:"premier",label:"Premier League",aliases:["Premier League"]},
 {id:"laliga",label:"LALIGA EA SPORTS",aliases:["LALIGA EA SPORTS","La Liga"]},
 {id:"seriea",label:"Serie A",aliases:["Serie A Enilive","Serie A"]},
 {id:"ligue1",label:"Ligue 1",aliases:["Ligue 1 McDonald's","Ligue 1"]}
];
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString("de-DE");
const CURRENCY_META=Object.freeze({
 coins:{label:"Footera Coins",src:"./assets/footera/coins.webp"},
 points:{label:"Footera Points",src:"./assets/footera/points.webp"}
});
function currencyIconHTML(currency,extraClass=""){const meta=CURRENCY_META[currency]||CURRENCY_META.coins;return `<img class="currency-icon ${currency} ${extraClass}" src="${meta.src}" alt="" aria-hidden="true">`}
function currencyAmountHTML(currency,amount,extraClass=""){const meta=CURRENCY_META[currency]||CURRENCY_META.coins;return `<span class="currency-amount ${currency} ${extraClass}" aria-label="${fmt(amount)} ${meta.label}">${currencyIconHTML(currency)}<span class="currency-value">${fmt(amount)}</span></span>`}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
/* V19.21 — Legacy Event: migrate all early placeholder events into one permanent event identity. */
function isLegacyEventName(name){
 const n=String(name||"").trim().toLowerCase();
 return n==="legacy event"||n==="eventkarte"||n==="road to glory"||n==="birthday event"||n==="champions event"
}
function migrateLegacyEventItem(item){
 if(item&&item.variant==="special"&&isLegacyEventName(item.eventName)){item.eventName="Legacy Event";item.legacyEvent=true}
 // V21.20 replaced Courtois' FC27 ID 192119 by 192120 during a version bump; repair MOMENTUM cards saved since then.
 if(item&&String(item.pid)==="192120"&&isMomentumItem(item))item.pid="192119";
 return repairIconItem(item)
}
// V21.241: Player Picks delivered Icons with an empty variant, so they rendered as gold rare.
// Every midicon-* card is an Icon; give such cards the Icon identity packs always used.
function repairIconItem(item){
 if(item&&!item.variant&&/^midicon-/.test(String(item.pid||""))){item.variant="icon-mid";item.eventName="Icon"}
 return item
}
function migrateLegacyEventState(s){
 if(!s||typeof s!=="object")return s;
 for(const key of ["club","sbcStorage","pendingPack"]){if(Array.isArray(s[key]))s[key].forEach(migrateLegacyEventItem)}
 if(Array.isArray(s.auctions))s.auctions.forEach(x=>{migrateLegacyEventItem(x);if(x?.item)migrateLegacyEventItem(x.item)});
 if(Array.isArray(s.transferSales))s.transferSales.forEach(x=>{if(x?.item)migrateLegacyEventItem(x.item)});
 if(Array.isArray(s.club)&&Array.isArray(s.auctions)){
  const purchases=new Map();
  for(const x of s.auctions){
   const pid=String(x?.base?.id||""),paid=x?.bought?Number(x.price||0):(x?.settled&&x?.won&&!x?.refunded?Number(x.myBid||0):0);
   if(!pid||!(paid>0))continue;
   if(!purchases.has(pid))purchases.set(pid,[]);
   purchases.get(pid).push(Math.round(paid))
  }
  for(const [pid,prices] of purchases){
   const owned=s.club.filter(item=>String(item?.pid||"")===pid&&!(Number(item?.purchasePrice||0)>0));
   if(prices.length===1&&owned.length===1){owned[0].purchasePrice=prices[0];owned[0].acquisitionSource="market"}
  }
 }
 return s
}
// A synthetic, account-bound player. Keep him outside PLAYERS, so no random pack,
// opponent, market, TOTW or base-card generator can select him.
const FOUNDER_SAVE_ID="GF-9AE6CDDEFE8A458D",FOUNDER_PLAYER_ID="footera-founder-bastian-gerlach",FOUNDER_PACK_ID="founder-bastian";
const FOUNDER_BASE=Object.freeze({id:FOUNDER_PLAYER_ID,name:"B. Gerlach",fullName:"Bastian Gerlach",ovr:88,position:"ST",alt:"CAM",nation:"Germany",team:"FC Gerlies",league:"Footera",height:172,preferredFoot:"Right",skillMoves:5,weakFoot:5,pac:91,sho:89,pas:82,dri:88,def:45,phy:84,face:"./assets/footera/founder-bastian-portrait.webp",clubLogo:"./assets/footera/fc-gerlies.svg",leagueLogo:"./assets/footera/emblem.png",source:"footera-founder"});
const FOUNDER_BASTIAN_STATIC_SRC="./assets/footera/founder-bastian-card-hd.webp";
const MARCO_FOUNDER_SAVE_ID="GF-7D87D08A06104571",MARCO_FOUNDER_PLAYER_ID="footera-founder-marco-gerlach",MARCO_FOUNDER_PACK_ID="founder-marco";
const MARCO_FOUNDER_BASE=Object.freeze({id:MARCO_FOUNDER_PLAYER_ID,name:"M. Gerlach",fullName:"Marco Gerlach",ovr:88,position:"ST",alt:"CAM",nation:"Germany",team:"Schweinfurt Rangers 09",league:"Footera",height:178,preferredFoot:"Right",skillMoves:5,weakFoot:5,pac:91,sho:89,pas:82,dri:88,def:45,phy:84,face:"./assets/footera/founder-marco-portrait.webp",clubLogo:"./assets/footera/schweinfurt-rangers-09.webp",leagueLogo:"./assets/footera/emblem.png",source:"footera-founder"});
const NIKLAS_FOUNDER_USER_ID="4af57ea2-9b89-44f7-b7ca-ffdbb7400317",NIKLAS_FOUNDER_PLAYER_ID="footera-founder-niklas-bergstraesser",NIKLAS_FOUNDER_PACK_ID="founder-niklas";
const NIKLAS_FOUNDER_BASE=Object.freeze({id:NIKLAS_FOUNDER_PLAYER_ID,name:"N. Bergsträßer",fullName:"Niklas Bergsträßer",ovr:88,position:"ST",alt:"CAM",nation:"Germany",team:"Wormatia Worms",league:"Footera",height:185,preferredFoot:"Right",skillMoves:5,weakFoot:5,pac:91,sho:89,pas:82,dri:88,def:45,phy:84,playstyles:"Power Header, First Touch, Power Shot",playstylesPlus:"Aerial",face:"./assets/footera/founder-niklas-portrait.webp",clubLogo:"./assets/footera/wormatia-worms.png",leagueLogo:"./assets/footera/emblem.png",source:"footera-founder"});
function isNiklasFounderItem(item){return String(item?.pid||"")===NIKLAS_FOUNDER_PLAYER_ID}
function isNiklasBase(p){return String(p?.id||"")===NIKLAS_FOUNDER_PLAYER_ID||[p?.name,p?.fullName].some(v=>/^(niklas|n\.) bergstr(aesser|aßer)$/.test(String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase()))}
function niklasFounderItem(){return{uid:"footera-founder-niklas",pid:NIKLAS_FOUNDER_PLAYER_ID,tradeable:false,acquired:Date.now(),evo:0,evoStats:{},variant:"founder",eventType:"founder",eventName:"FOUNDER",boost:0,rare:true,acquisitionSource:"Founder Pack",ownerUserId:NIKLAS_FOUNDER_USER_ID}}
function ownsFounderRule(s,rule){return !!rule&&(rule.userId?!!s.profile?.founderOnlineUserId&&s.profile.founderOnlineUserId===rule.userId:!!rule.saveId&&s.profile?.saveId===rule.saveId)}
// Bind this online-only entitlement after the existing authenticated session loads.
// Keep the last verified identity in the save so an offline reload preserves the card.
function syncFounderOnlineOwner(userId){
 if(!userId||state.profile?.founderOnlineUserId===userId)return;
 state.profile.founderOnlineUserId=userId;reconcileFounderState(state);
 pendingPack=state.pendingPack;pendingResolved=new Set(state.pendingResolved||[]);
 save();renderStore();
}
function isFounderItem(item){return [FOUNDER_PLAYER_ID,MARCO_FOUNDER_PLAYER_ID,NIKLAS_FOUNDER_PLAYER_ID].includes(String(item?.pid||""))}
function isMarcoFounderItem(item){return String(item?.pid||"")===MARCO_FOUNDER_PLAYER_ID}
function isBastianBase(p){return [p?.fullName,p?.name].some(v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase()==="bastian gerlach")||String(p?.id||"")===FOUNDER_PLAYER_ID}
function isMarcoBase(p){return [p?.fullName,p?.name].some(v=>/^(marco|m\.) gerlach$/.test(String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase()))||String(p?.id||"")===MARCO_FOUNDER_PLAYER_ID}
function isExclusiveFounderBase(p){return isBastianBase(p)||isMarcoBase(p)||isNiklasBase(p)}
function founderItem(){return{uid:"footera-founder-bastian",pid:FOUNDER_PLAYER_ID,tradeable:false,acquired:Date.now(),evo:0,evoStats:{},variant:"founder",eventType:"founder",eventName:"FOUNDER",boost:0,rare:true,acquisitionSource:"Founder Pack",ownerSaveId:FOUNDER_SAVE_ID}}
function marcoFounderItem(){return{uid:"footera-founder-marco",pid:MARCO_FOUNDER_PLAYER_ID,tradeable:false,acquired:Date.now(),evo:0,evoStats:{},variant:"founder",eventType:"founder",eventName:"FOUNDER",boost:0,rare:true,acquisitionSource:"Founder Pack",ownerSaveId:MARCO_FOUNDER_SAVE_ID}}
const FOUNDER_RULES=[{saveId:FOUNDER_SAVE_ID,playerId:FOUNDER_PLAYER_ID,packId:FOUNDER_PACK_ID,base:FOUNDER_BASE,create:founderItem,uid:"footera-founder-bastian",claimed:"founderClaimed",opening:"founderOpening"},{saveId:MARCO_FOUNDER_SAVE_ID,playerId:MARCO_FOUNDER_PLAYER_ID,packId:MARCO_FOUNDER_PACK_ID,base:MARCO_FOUNDER_BASE,create:marcoFounderItem,uid:"footera-founder-marco",claimed:"marcoFounderClaimed",opening:"marcoFounderOpening"},{userId:NIKLAS_FOUNDER_USER_ID,playerId:NIKLAS_FOUNDER_PLAYER_ID,packId:NIKLAS_FOUNDER_PACK_ID,base:NIKLAS_FOUNDER_BASE,create:niklasFounderItem,uid:"footera-founder-niklas",claimed:"niklasFounderClaimed",opening:"niklasFounderOpening"}];
function founderRuleForItem(item){return FOUNDER_RULES.find(r=>r.playerId===String(item?.pid||""))}
function founderRuleForPack(id){return FOUNDER_RULES.find(r=>r.packId===id)}
function reconcileFounderState(s){
 const original=s.pendingPack||[],resolved=new Set(s.pendingResolved||[]),originalUids=new Map();
 for(const rule of FOUNDER_RULES){
  const owner=ownsFounderRule(s,rule),founder=i=>String(i?.pid||"")===rule.playerId;
  const oldUids=new Set((s.club||[]).filter(founder).map(i=>i.uid));
  for(const oldUid of oldUids)originalUids.set(oldUid,owner?rule.uid:null);
  s.club=(s.club||[]).filter((i,idx,arr)=>!founder(i)||(owner&&arr.findIndex(founder)===idx));
  s.sbcStorage=(s.sbcStorage||[]).filter(i=>!founder(i));
  s.transferList=(s.transferList||[]).filter(uid=>!oldUids.has(uid));
  s.transferSales=(s.transferSales||[]).filter(sale=>!founder(sale.item));
  s.auctions=(s.auctions||[]).filter(a=>!founder(a.item)&&!isExclusiveFounderBase(a.base));
  s.pendingPack=(s.pendingPack||[]).filter(i=>owner||!founder(i));
  if(!owner){delete s.packs[rule.packId];continue}
  const card=s.club.find(founder),inReveal=s.pendingPack.some(founder);
  if(card||s[rule.claimed]){
   const kept=card||rule.create();if(!card)s.club.push(kept);
   Object.assign(kept,rule.create(),{acquired:Number(kept.acquired)||Date.now(),eventStats:null,overridePosition:"",displayRating:88,evoPlaystyles:[]});
   s.packs[rule.packId]=0;s[rule.claimed]=true;s[rule.opening]=false;s.pendingPack=s.pendingPack.filter(i=>!founder(i));
  }else if(inReveal){s.packs[rule.packId]=0}
  else{s.packs[rule.packId]=1;s[rule.opening]=false}
 }
 s.pendingResolved=original.flatMap((item,index)=>resolved.has(index)&&s.pendingPack.includes(item)?[s.pendingPack.indexOf(item)]:[]);
 const remap=uid=>originalUids.has(uid)?originalUids.get(uid):uid;
 s.squad=(s.squad||[]).map(remap);
 s.squadPresets=(s.squadPresets||[]).map(p=>p?{...p,squad:(p.squad||[]).map(remap)}:p);
 return s
}
// loadState() validates saved teams immediately; initialize its formation list first.
const SQUAD_FORMATION_NAMES=["4-3-3","4-3-3 (2)","4-3-3 (3)","4-3-3 (4)","4-4-2","4-4-1-1","4-2-3-1","4-1-2-1-2 (2)","4-2-2-2","4-2-4","3-5-2"];
let PLAYERS=[],P_BY_ID=new Map(),state=reconcileFounderState(loadState()),pickerIndex=-1,pickerMode='player',pickerSourceUid=null,pendingPack=state.pendingPack,marketListings=[],sellEditorUid=null,sbcSelections={},match=null;

const FORMATIONS={
"4-3-3":[
 {p:"GK",x:50,y:89},{p:"LB",x:13,y:69},{p:"CB",x:37,y:73},{p:"CB",x:63,y:73},{p:"RB",x:87,y:69},
 {p:"CM",x:24,y:49},{p:"CM",x:50,y:46},{p:"CM",x:76,y:49},{p:"LW",x:15,y:22},{p:"ST",x:50,y:14},{p:"RW",x:85,y:22}],
"4-3-3 (2)":[
 {p:"GK",x:50,y:89},{p:"LB",x:13,y:69},{p:"CB",x:37,y:73},{p:"CB",x:63,y:73},{p:"RB",x:87,y:69},
 {p:"CDM",x:50,y:61},{p:"CM",x:27,y:43},{p:"CM",x:73,y:43},{p:"LW",x:14,y:21},{p:"ST",x:50,y:13},{p:"RW",x:86,y:21}],
"4-3-3 (3)":[
 {p:"GK",x:50,y:89},{p:"LB",x:13,y:69},{p:"CB",x:37,y:73},{p:"CB",x:63,y:73},{p:"RB",x:87,y:69},
 {p:"CDM",x:31,y:59},{p:"CDM",x:69,y:59},{p:"CM",x:50,y:38},{p:"LW",x:15,y:21},{p:"ST",x:50,y:13},{p:"RW",x:85,y:21}],
"4-3-3 (4)":[
 {p:"GK",x:50,y:89},{p:"LB",x:13,y:69},{p:"CB",x:37,y:73},{p:"CB",x:63,y:73},{p:"RB",x:87,y:69},
 {p:"CM",x:32,y:55},{p:"CM",x:68,y:55},{p:"CAM",x:50,y:31},{p:"LW",x:14,y:20},{p:"ST",x:50,y:12},{p:"RW",x:86,y:20}],
"4-4-2":[
 {p:"GK",x:50,y:89},{p:"LB",x:13,y:69},{p:"CB",x:37,y:73},{p:"CB",x:63,y:73},{p:"RB",x:87,y:69},
 {p:"LM",x:16,y:47},{p:"CM",x:40,y:50},{p:"CM",x:60,y:50},{p:"RM",x:84,y:47},{p:"ST",x:39,y:18},{p:"ST",x:61,y:18}],
"4-4-1-1":[
 {p:"GK",x:50,y:89},{p:"LB",x:13,y:69},{p:"CB",x:37,y:73},{p:"CB",x:63,y:73},{p:"RB",x:87,y:69},
 {p:"LM",x:15,y:49},{p:"CM",x:39,y:52},{p:"CM",x:61,y:52},{p:"RM",x:85,y:49},{p:"CAM",x:50,y:31},{p:"ST",x:50,y:14}],
"4-2-3-1":[
 {p:"GK",x:50,y:89},{p:"LB",x:12,y:69},{p:"CB",x:37,y:73},{p:"CB",x:63,y:73},{p:"RB",x:88,y:69},
 {p:"CDM",x:38,y:54},{p:"CDM",x:62,y:54},{p:"CAM",x:50,y:36},{p:"LM",x:17,y:34},{p:"RM",x:83,y:34},{p:"ST",x:50,y:14}],
"4-1-2-1-2 (2)":[
 {p:"GK",x:50,y:89},{p:"LB",x:13,y:69},{p:"CB",x:37,y:73},{p:"CB",x:63,y:73},{p:"RB",x:87,y:69},
 {p:"CDM",x:50,y:58},{p:"CM",x:31,y:46},{p:"CM",x:69,y:46},{p:"CAM",x:50,y:32},{p:"ST",x:38,y:17},{p:"ST",x:62,y:17}],
"4-2-2-2":[
 {p:"GK",x:50,y:89},{p:"LB",x:13,y:69},{p:"CB",x:37,y:73},{p:"CB",x:63,y:73},{p:"RB",x:87,y:69},
 {p:"CDM",x:36,y:55},{p:"CDM",x:64,y:55},{p:"CAM",x:24,y:35},{p:"CAM",x:76,y:35},{p:"ST",x:39,y:17},{p:"ST",x:61,y:17}],
"4-2-4":[
 {p:"GK",x:50,y:89},{p:"LB",x:13,y:69},{p:"CB",x:37,y:73},{p:"CB",x:63,y:73},{p:"RB",x:87,y:69},
 {p:"CM",x:38,y:50},{p:"CM",x:62,y:50},{p:"LW",x:13,y:23},{p:"ST",x:39,y:16},{p:"ST",x:61,y:16},{p:"RW",x:87,y:23}],
"3-5-2":[
 {p:"GK",x:50,y:89},{p:"CB",x:25,y:70},{p:"CB",x:50,y:73},{p:"CB",x:75,y:70},
 {p:"LM",x:12,y:47},{p:"CDM",x:38,y:54},{p:"CDM",x:62,y:54},{p:"RM",x:88,y:47},{p:"CAM",x:50,y:34},{p:"ST",x:39,y:17},{p:"ST",x:61,y:17}]
};

const ROLE_OPTIONS={
 GK:["Goalkeeper","Ball Playing","Sweeper Keeper"],CB:["Defender","Stopper","Wide Back","Ball Playing Defender"],
 LB:["Fullback","Wingback","Falseback","Inverted Wingback","Attacking Wingback"],RB:["Fullback","Wingback","Falseback","Inverted Wingback","Attacking Wingback"],
 CDM:["Holding","Deep Lying Playmaker","Box Crasher","Centre Half","Wide Half"],CM:["Box to Box","Playmaker","Deep Lying Playmaker","Holding","Half Winger"],
 CAM:["Shadow Striker","Playmaker","Classic 10","Half Winger"],LM:["Inside Forward","Winger","Wide Playmaker","Wide Midfielder"],RM:["Inside Forward","Winger","Wide Playmaker","Wide Midfielder"],
 LW:["Inside Forward","Winger","Wide Playmaker"],RW:["Inside Forward","Winger","Wide Playmaker"],ST:["Advanced Forward","Target Forward","Poacher","False 9"]
};
const FOCUS_OPTIONS=["Balanced","Attack","Build-Up","Defend"];
const ROLE_LABELS={
 "Goalkeeper":"Torwart","Ball Playing":"Spieleröffnender Torwart","Sweeper Keeper":"Mitspielender Torwart",
 "Defender":"Verteidiger","Stopper":"Stopper","Wide Back":"Breiter Innenverteidiger","Ball Playing Defender":"Spieleröffnender Innenverteidiger",
 "Fullback":"Außenverteidiger","Wingback":"Schienenspieler","Falseback":"Falscher Außenverteidiger","Inverted Wingback":"Invertierter Außenverteidiger","Attacking Wingback":"Offensiver Außenverteidiger",
 "Holding":"Absichernd","Deep Lying Playmaker":"Tiefer Spielmacher","Box Crasher":"Nachstoßender Sechser","Centre Half":"Zurückfallender Verteidiger","Wide Half":"Halbraum-Sechser",
 "Box to Box":"Box-to-Box","Playmaker":"Spielmacher","Half Winger":"Halb-Flügelspieler","Classic 10":"Klassische 10",
 "Inside Forward":"Invertierter Flügelspieler","Winger":"Flügelspieler","Wide Playmaker":"Breiter Spielmacher","Wide Midfielder":"Breites Mittelfeld",
 "Advanced Forward":"Stoßstürmer","Target Forward":"Zielstürmer","Poacher":"Knipser","False 9":"Falsche 9"
};
const FOCUS_LABELS={"Balanced":"Ausgewogen","Attack":"Offensiv","Build-Up":"Aufbauspiel","Defend":"Defensiv"};
function roleLabel(v){return ROLE_LABELS[v]||v}
function focusLabel(v){return FOCUS_LABELS[v]||v}

/* V20.71 — Rollen und Fokus greifen jetzt direkt in die Matchsimulation ein.
   Teameffekte werden gemittelt; dadurch entstehen Trade-offs statt eines pauschalen Stärke-Bonus. */
const ROLE_EFFECTS=Object.freeze({
 "Goalkeeper":{defense:.012,defender:1.06,drain:.98},
 "Ball Playing":{defense:.004,poss:.8,assist:1.05,defender:1.02,drain:1.01},
 "Sweeper Keeper":{defense:.009,poss:.4,defender:1.08,drain:1.04},
 "Defender":{attack:-.004,defense:.018,defender:1.14},
 "Stopper":{defense:.022,poss:-.2,defender:1.22,drain:1.05},
 "Wide Back":{defense:.012,poss:.35,assist:1.06,defender:1.10,drain:1.03},
 "Ball Playing Defender":{defense:.008,poss:.75,assist:1.10,defender:1.06},
 "Fullback":{defense:.012,poss:.2,assist:1.03,defender:1.08},
 "Wingback":{attack:.010,defense:-.004,poss:.35,scorer:1.03,assist:1.16,defender:.96,drain:1.08},
 "Falseback":{defense:.006,poss:.75,assist:1.08,defender:1.05},
 "Inverted Wingback":{attack:.006,defense:.004,poss:.65,assist:1.10,defender:1.02,drain:1.05},
 "Attacking Wingback":{attack:.016,defense:-.012,poss:.25,scorer:1.08,assist:1.18,defender:.92,drain:1.12},
 "Holding":{attack:-.006,defense:.020,poss:.15,scorer:.82,assist:.96,defender:1.20,drain:.98},
 "Deep Lying Playmaker":{attack:.002,defense:.006,poss:.90,scorer:.90,assist:1.18,defender:1.05,drain:.99},
 "Box Crasher":{attack:.014,defense:-.006,poss:.10,scorer:1.22,assist:1.04,defender:.96,drain:1.10},
 "Centre Half":{attack:-.010,defense:.024,poss:.20,scorer:.72,assist:.92,defender:1.28,drain:1.02},
 "Wide Half":{attack:.003,defense:.010,poss:.45,scorer:.90,assist:1.08,defender:1.12,drain:1.05},
 "Box to Box":{attack:.008,defense:.008,poss:.20,scorer:1.12,assist:1.10,defender:1.10,drain:1.10},
 "Playmaker":{attack:.004,defense:-.002,poss:.80,scorer:.94,assist:1.24,defender:.94,drain:1.02},
 "Half Winger":{attack:.012,defense:-.005,poss:.35,scorer:1.08,assist:1.15,defender:.92,drain:1.07},
 "Shadow Striker":{attack:.018,defense:-.008,poss:-.10,scorer:1.28,assist:.90,defender:.85,drain:1.08},
 "Classic 10":{attack:.012,defense:-.010,poss:.65,scorer:1.10,assist:1.20,defender:.80,drain:.97},
 "Inside Forward":{attack:.016,defense:-.007,poss:-.10,scorer:1.22,assist:.92,defender:.85,drain:1.07},
 "Winger":{attack:.012,defense:-.004,poss:.25,scorer:.96,assist:1.24,defender:.90,drain:1.08},
 "Wide Playmaker":{attack:.006,defense:-.003,poss:.80,scorer:.90,assist:1.22,defender:.90,drain:1.02},
 "Wide Midfielder":{attack:.003,defense:.009,poss:.35,scorer:.90,assist:1.08,defender:1.14,drain:1.04},
 "Advanced Forward":{attack:.018,defense:-.008,poss:-.15,scorer:1.20,assist:.98,defender:.75,drain:1.06},
 "Target Forward":{attack:.012,defense:-.004,poss:.20,scorer:1.12,assist:1.12,defender:.82,drain:1.05},
 "Poacher":{attack:.016,defense:-.010,poss:-.35,scorer:1.30,assist:.78,defender:.70,drain:1.02},
 "False 9":{attack:.006,defense:-.004,poss:.85,scorer:.94,assist:1.24,defender:.82,drain:1.01}
});
const FOCUS_EFFECTS=Object.freeze({
 "Balanced":{},
 "Attack":{attack:.012,defense:-.008,poss:-.10,scorer:1.08,assist:1.04,defender:.90,drain:1.07},
 "Build-Up":{attack:.004,defense:-.002,poss:.80,scorer:.96,assist:1.10,defender:.98,drain:1.03},
 "Defend":{attack:-.008,defense:.012,poss:-.15,scorer:.90,assist:.96,defender:1.12,drain:1.03}
});
function effectNumber(obj,key,fallback){const value=Number(obj?.[key]);return Number.isFinite(value)?value:fallback}
function roleFocusContext(side,index,position){
 const home=side==="home",profile=home?match:match?.opponentProfile,roles=home?(match?.roles||state.roles||{}):(profile?.roles||{}),focuses=home?(match?.focus||state.focus||{}):(profile?.focus||{});
 const options=ROLE_OPTIONS[position]||[],requested=String(roles?.[index]||""),role=options.includes(requested)?requested:(options[0]||""),requestedFocus=String(focuses?.[index]||"Balanced"),focus=FOCUS_OPTIONS.includes(requestedFocus)?requestedFocus:"Balanced";
 const r=ROLE_EFFECTS[role]||{},f=FOCUS_EFFECTS[focus]||{};
 return{role,focus,attack:effectNumber(r,"attack",0)+effectNumber(f,"attack",0),defense:effectNumber(r,"defense",0)+effectNumber(f,"defense",0),poss:effectNumber(r,"poss",0)+effectNumber(f,"poss",0),scorer:effectNumber(r,"scorer",1)*effectNumber(f,"scorer",1),assist:effectNumber(r,"assist",1)*effectNumber(f,"assist",1),defender:effectNumber(r,"defender",1)*effectNumber(f,"defender",1),drain:effectNumber(r,"drain",1)*effectNumber(f,"drain",1)}
}
function teamRoleFocusMods(side){
 if(!match)return{attack:1,defense:1,poss:0};
 const home=side==="home",profile=match.opponentProfile,form=FORMATIONS[home?match.formation:profile?.formation]||FORMATIONS["4-3-3"],lineup=home?(match.lineup||[]):(profile?.squad||[]);
 let attack=0,defense=0,poss=0,count=0;
 lineup.slice(0,11).forEach((entry,index)=>{if(!entry)return;const ctx=roleFocusContext(side,index,form[index]?.p||"");attack+=ctx.attack;defense+=ctx.defense;poss+=ctx.poss;count++});
 if(!count)return{attack:1,defense:1,poss:0};
 return{attack:Math.max(.92,Math.min(1.08,1+attack/count)),defense:Math.max(.92,Math.min(1.08,1+defense/count)),poss:Math.max(-2.5,Math.min(2.5,poss/count))}
}

function matchClamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0))}
function matchAttributeGap(value){return matchClamp(value,-15,15)}
function matchChemistry(side){return matchClamp(side==="home"?match?.chem:match?.opponentProfile?.chem,0,33)}
function matchAttributes(base){
 const p=base?(typeof resolvedPlayer==="function"?resolvedPlayer(base):base):{};
 const fallback=matchClamp(p?.ovr||70,35,99);
 return{pac:matchClamp(p?.pac??fallback,35,99),sho:matchClamp(p?.sho??fallback,1,99),pas:matchClamp(p?.pas??fallback,35,99),dri:matchClamp(p?.dri??fallback,35,99),def:matchClamp(p?.def??fallback,20,99),phy:matchClamp(p?.phy??fallback,35,99),ovr:fallback}
}
// Match events name players like their cards: the known name (Raphinha, Rodri),
// never the legal name. Founder cards show their full name, so keep it there too.
function matchEventPlayerName(row,fallback){const b=row?.base;return String((b&&typeof isExclusiveFounderBase==="function"&&isExclusiveFounderBase(b)?b.fullName||b.name:row?.name||b?.name)||fallback||"").trim()}
function matchActorRows(side){
 if(!match)return[];
 const home=side==="home",profile=match.opponentProfile,form=FORMATIONS[home?match.formation:profile?.formation]||FORMATIONS["4-3-3"],lineup=home?(match.lineup||[]):(profile?.squad||[]);
 return lineup.slice(0,11).map((entry,index)=>{
  const base=home?currentMatchBase(entry):opponentMatchBase(entry);if(!entry||!base)return null;
  const slot=form[index]?.p||base.position||"",attrs=matchAttributes(base),fitness=matchPlayerFitness(entry,side,index),ctx=roleFocusContext(side,index,slot);
  const styleKey=side+":"+(home?String(entry):index+":"+(base.id||base.name)),cache=match.actionStyles||(match.actionStyles=new Map());
  if(!cache.has(styleKey)){
   const item=home?state.club?.find(p=>String(p.uid)===String(entry)):(profile?.items?.[index]||entry);
   cache.set(styleKey,typeof FooteraPlayStyles!=="undefined"?FooteraPlayStyles.resolve({...((item?.pid&&typeof displayBase==="function"?displayBase(item):null)||base)},item&&typeof item==="object"?{...item}:null).styles.map(p=>({id:p.id,plus:!!p.plus})):[]);
  }
  return{styles:cache.get(styleKey),uid:home?String(entry):"",entry,index,base,name:base.name||(home?"Spieler":"Gegenspieler"),slot,attrs,fitness,ctx}
 }).filter(Boolean)
}
function matchFallbackActor(side,name){
 const rating=matchClamp(side==="home"?(match?.power||75):(match?.opp||75),45,95),attrs={pac:rating,sho:rating,pas:rating,dri:rating,def:rating,phy:rating,ovr:rating};
 return{uid:"",entry:null,index:-1,base:{name,ovr:rating,...attrs},name,slot:"",attrs,fitness:100,ctx:{attack:0,defense:0,poss:0,scorer:1,assist:1,defender:1,drain:1}}
}
function matchPositionPhaseWeight(slot,phase){
 if(phase==="build"){
  if(slot==="GK")return 0.35;
  if(slot==="CB")return 0.65;
  if(["LB","RB","LWB","RWB"].includes(slot))return 0.8;
  if(slot==="CDM")return 1.2;
  if(slot==="CM"||slot==="CAM")return 1.45;
  if(["LM","RM","LW","RW"].includes(slot))return 1.2;
  if(slot==="ST"||slot==="CF")return 0.8;
  return 1
 }
 if(phase==="defense"){
  if(slot==="GK")return 1.1;
  if(slot==="CB")return 1.5;
  if(["LB","RB","LWB","RWB"].includes(slot))return 1.25;
  if(slot==="CDM")return 1.35;
  if(slot==="CM")return 0.85;
  if(slot==="CAM")return 0.5;
  if(["LM","RM","LW","RW"].includes(slot))return 0.42;
  if(slot==="ST"||slot==="CF")return 0.25;
  return 0.7
 }
 if(slot==="ST"||slot==="CF")return 1.55;
 if(["LW","RW","LM","RM"].includes(slot))return 1.35;
 if(slot==="CAM")return 1.3;
 if(slot==="CM")return 0.85;
 if(slot==="CDM")return 0.45;
 if(["LB","RB","LWB","RWB"].includes(slot))return 0.3;
 if(slot==="CB")return 0.2;
 return 0.08
}
function matchWeightedAverage(rows,phase,score){
 let total=0,weight=0;
 for(const row of rows){const w=matchPositionPhaseWeight(row.slot,phase)*(.82+row.fitness*.0018);total+=score(row)*w;weight+=w}
 return weight?total/weight:70
}
function matchTeamAttributeProfile(side){
 const rows=matchActorRows(side);
 if(!rows.length){const a=matchFallbackActor(side,"Team").attrs;return{build:(a.pas*.68+a.dri*.32),transition:(a.pac*.55+a.dri*.45),finish:(a.sho*.72+a.dri*.18+a.phy*.10),defense:(a.def*.60+a.phy*.20+a.pac*.20)}}
 return{
  build:matchWeightedAverage(rows,"build",r=>r.attrs.pas*.68+r.attrs.dri*.32),
  transition:matchWeightedAverage(rows,"attack",r=>r.attrs.pac*.55+r.attrs.dri*.45),
  finish:matchWeightedAverage(rows,"attack",r=>r.attrs.sho*.72+r.attrs.dri*.18+r.attrs.phy*.10),
  defense:matchWeightedAverage(rows,"defense",r=>r.slot==="GK"?r.attrs.ovr:r.attrs.def*.60+r.attrs.phy*.20+r.attrs.pac*.20)
 }
}
function chooseMatchCreator(side,exclude=null){
 const rows=matchActorRows(side).filter(r=>exclude==null||(side==="home"?String(r.uid)!==String(exclude):r.index!==Number(exclude)));
 const weighted=rows.map(r=>({...r,weight:assistSlotWeight(r.slot)*(.42+r.attrs.pas/105+r.attrs.dri/270)*r.ctx.assist*(.72+r.fitness*.0028)}));
 return weightedMatchPick(weighted)||matchFallbackActor(side,side==="home"?"Spieler":"Gegenspieler")
}
function chooseMatchAttacker(side,actionKind="combination",exclude=null){
 // Goalkeepers may never be selected as shot takers, even if deployed out of position.
 const rows=matchActorRows(side).filter(r=>!['GK','TW','TH'].includes(String(r.slot||'').toUpperCase())&&!['GK','TW','TH'].includes(String(r.base?.position||'').toUpperCase()));
 if(!rows.length)return null;
 const weighted=rows.filter(r=>exclude===null||(side==="home"?r.uid!==exclude:r.index!==exclude)).map(r=>({...r,weight:FooteraMatchActions.attackerWeight(r,actionKind)*scorerSlotWeight(r.slot)*(.38+r.attrs.sho/145+r.attrs.pac/300+r.attrs.dri/300)*r.ctx.scorer*(.72+r.fitness*.0028)}));
 return weightedMatchPick(weighted)
}
function matchDefensiveSkill(row){
 if(!row)return 70;const a=row.attrs||matchAttributes(row.base);if(row.slot==="GK")return a.ovr;
 return a.def*.60+a.phy*.20+a.pac*.20
}
function matchFinishingChance(xg,attacker,defendingSide,shot={},defender=null){
 return FooteraMatchActions.goalChance(xg,attacker,shot,matchActorRows(defendingSide).find(r=>r.slot==="GK"),defender)
}
function matchActionTactics(side){return(side==="home"?match?.customTactics:match?.opponentProfile?.customTactics)||{}}
function matchRestartCreator(side,kind,flank="left"){
 const rows=matchActorRows(side).filter(r=>r.slot!=="GK"&&!['GK','TW','TH'].includes(r.base?.position));
 const assignments=side==="home"?match?.assignments:match?.opponentProfile?.assignments;
 const uid=String(assignments?.[flank==="right"?"cornerRight":"cornerLeft"]||"");
 if(kind==="corner"&&uid){const picked=rows.find(r=>String(r.uid||r.entry?.uid)===uid);if(picked)return picked}
 return weightedMatchPick(rows.map(r=>({...r,weight:(['LB','RB','LWB','RWB','LM','RM','LW','RW'].includes(r.slot)?3:1)*(r.attrs.pas/75)*(1+(r.styles||[]).some(p=>p.id===(kind==="throw_in"?"long-throw":"dead-ball")))})))||chooseMatchCreator(side)
}
function matchSetPieceTaker(side,type){
 const rows=matchActorRows(side).filter(r=>r.slot!=="GK"&&!['GK','TW','TH'].includes(r.base?.position));
 const assignments=side==="home"?match?.assignments:match?.opponentProfile?.assignments,key=type==="penalty"?"penalties":"freeKicks",uid=String(assignments?.[key]||"");
 return rows.find(r=>uid&&String(r.uid||r.entry?.uid||match?.opponentProfile?.items?.[r.index]?.uid)===uid)||rows.sort((a,b)=>FooteraMatchActions.shotSkill(b,{creationType:type})-FooteraMatchActions.shotSkill(a,{creationType:type}))[0]||null
}
const SEASON_REWARDS=[
 {level:1,sp:0,reward:{coins:500}},{level:2,sp:500,reward:{pack:"silver",qty:1}},{level:3,sp:1000,reward:{coins:1500}},
 {level:4,sp:1800,reward:{pack:"gold",qty:1}},{level:5,sp:2800,reward:{points:100}},{level:6,sp:4000,reward:{pack:"82",qty:1}},
 {level:7,sp:5500,reward:{coins:4000}},{level:8,sp:7500,reward:{pack:"goldplayers",qty:1}},{level:9,sp:10000,reward:{points:150}},{level:10,sp:13500,reward:{coins:12000,pack:"gold",qty:1}}
];
// Season Pass players. Season 1: Story players at levels 15 and 30; Season 2: a season player every five levels per track.
const STORY_PASS_PLAYERS=Object.freeze({
 "s1-15":{season:"s1",track:"free",level:15,name:"Ermedin Demirović",chapter:"Aufbruch",rating:84,position:"ST",stats:[78,84,75,81,44,82]},
 "s1-premium-15":{season:"s1",track:"premium",level:15,name:"Antonio Nusa",aliases:["Antonio Eromonsele Nordby Nusa"],chapter:"Tempo",rating:85,position:"LW",stats:[91,82,82,89,44,72]},
 "s1-30":{season:"s1",track:"free",level:30,name:"Kobbie Mainoo",chapter:"Durchbruch",rating:85,position:"CM",stats:[75,72,82,86,78,78]},
 "s1-premium-30":{season:"s1",track:"premium",level:30,name:"Renato Veiga",aliases:["Renato Palma Veiga"],chapter:"Vollendung",rating:86,position:"CB",stats:[80,72,83,82,87,88]},
 // Season 2 players: real cards with a season boost, rising from 81 to 87 so the pass mixes solid and top cards.
 "s2-5":{season:"s2",track:"free",level:5,pid:"272505",face:"assets/footera/events/season2/faces/272505.webp",name:"Endrick",chapter:"Saison 2",rating:81,position:"ST",stats:[89,83,68,82,32,75]},
 "s2-10":{season:"s2",track:"free",level:10,pid:"262659",face:"assets/footera/events/season2/faces/262659.webp",name:"Noah Atubolu",chapter:"Saison 2",rating:82,position:"GK",stats:[82,77,82,83,58,79]},
 "s2-15":{season:"s2",track:"free",level:15,pid:"254117",face:"assets/footera/events/season2/faces/254117.webp",name:"Maximilian Beier",chapter:"Saison 2",rating:83,position:"ST",stats:[88,82,76,83,58,67]},
 "s2-20":{season:"s2",track:"free",level:20,pid:"269701",face:"assets/footera/events/season2/dynamic/269701.webp",name:"Nathaniel Brown",chapter:"Saison 2",rating:84,position:"LB",stats:[93,63,79,86,76,62]},
 "s2-25":{season:"s2",track:"free",level:25,pid:"275298",face:"assets/footera/events/season2/faces/275298.webp",name:"Aleksandar Pavlović",chapter:"Saison 2",rating:85,position:"CDM",stats:[68,70,84,84,81,81]},
 "s2-30":{season:"s2",track:"free",level:30,pid:"251852",face:"assets/footera/events/season2/dynamic/251852.webp",name:"Karim Adeyemi",chapter:"Saison 2",rating:86,position:"RM",stats:[99,84,76,86,40,73]},
 "s2-premium-3":{season:"s2",track:"premium",level:3,pid:"76687",face:"assets/footera/events/season2/faces/76687.webp",name:"Estêvão",chapter:"Saison 2",rating:82,position:"RW",stats:[91,78,77,86,35,59]},
 "s2-premium-8":{season:"s2",track:"premium",level:8,pid:"254022",face:"assets/footera/events/season2/faces/254022.webp",name:"Nick Woltemade",chapter:"Saison 2",rating:83,position:"ST",stats:[70,83,75,84,44,80]},
 "s2-premium-13":{season:"s2",track:"premium",level:13,pid:"278349",face:"assets/footera/events/season2/faces/278349.webp",name:"Dean Huijsen",chapter:"Saison 2",rating:84,position:"CB",stats:[75,58,75,75,85,80]},
 "s2-premium-18":{season:"s2",track:"premium",level:18,pid:"264309",face:"assets/footera/events/season2/faces/264309.webp",name:"Arda Güler",chapter:"Saison 2",rating:85,position:"CAM",stats:[79,81,87,86,57,59]},
 "s2-premium-23":{season:"s2",track:"premium",level:23,pid:"227796",face:"assets/footera/events/season2/faces/227796.webp",name:"Christian Pulisic",chapter:"Saison 2",rating:86,position:"RW",stats:[90,86,84,87,50,63]},
 "s2-premium-30":{season:"s2",track:"premium",level:30,pid:"237692",face:"assets/footera/events/season2/faces/237692.webp",name:"Phil Foden",chapter:"Saison 2",rating:87,position:"CAM",stats:[80,85,85,91,60,56]}
});
const EVOLUTION_POOL=[{"id":"breakthrough","name":"Breakthrough","subtitle":"Basis-Karte entwickeln","group":"core","signupDays":7,"completionDays":14,"cost":{"coins":0,"points":0},"maxFinalOvr":79,"statCaps":{"pac":83,"sho":80,"pas":80,"dri":83,"def":78,"phy":80},"req":{"maxOvr":74,"maxPac":88,"maxPlaystyles":6},"stages":[{"matches":3,"wins":0,"ovr":2,"stats":{"pac":2,"sho":2,"dri":2},"label":"Stufe 1"},{"matches":3,"wins":1,"ovr":1,"stats":{"pas":2,"dri":2,"phy":2},"playstyle":"Quick Step","label":"Stufe 2"},{"matches":4,"wins":2,"ovr":2,"stats":{"pac":2,"sho":2,"dri":2},"label":"Stufe 3"}]},{"id":"engine_room","name":"Engine Room","subtitle":"Kompletter Mittelfeldmotor","group":"core","signupDays":7,"completionDays":14,"cost":{"coins":15000,"points":150},"maxFinalOvr":81,"statCaps":{"pac":84,"sho":81,"pas":85,"dri":84,"def":82,"phy":83},"req":{"maxOvr":79,"positions":["CM","CDM","CAM","LM","RM"],"maxPac":88,"maxPlaystyles":7},"stages":[{"matches":3,"wins":1,"ovr":1,"stats":{"pas":2,"dri":2,"phy":1},"label":"Stufe 1"},{"matches":4,"wins":2,"ovr":0,"stats":{"pac":1,"pas":2,"def":2},"label":"Stufe 2"},{"matches":5,"wins":3,"ovr":1,"stats":{"sho":1,"pas":2,"dri":2,"phy":1},"playstyle":"Tiki Taka","label":"Stufe 3"}]},{"id":"finisher","name":"Kaltschnäuziger Abschluss","subtitle":"Stürmer-Evolution","group":"attack","signupDays":7,"completionDays":14,"cost":{"coins":25000,"points":200},"maxFinalOvr":82,"statCaps":{"pac":88,"sho":86,"pas":79,"dri":85,"def":55,"phy":82},"req":{"maxOvr":79,"positions":["ST","CF"],"maxPac":89,"maxPlaystyles":7},"stages":[{"matches":3,"wins":0,"ovr":1,"stats":{"sho":2,"dri":1},"label":"Stufe 1"},{"matches":4,"wins":2,"ovr":1,"stats":{"pac":1,"sho":2,"dri":2},"label":"Stufe 2"},{"matches":5,"wins":3,"ovr":1,"stats":{"sho":2,"phy":2},"playstyle":"Finesse Shot","label":"Stufe 3"}]},{"id":"wide_threat","name":"Flügelgefahr","subtitle":"Schneller Flügelspieler","group":"attack","signupDays":7,"completionDays":12,"cost":{"coins":15000,"points":150},"maxFinalOvr":81,"statCaps":{"pac":90,"sho":81,"pas":82,"dri":86,"def":65,"phy":76},"req":{"maxOvr":78,"positions":["LW","RW","LM","RM"],"maxPac":90,"maxPlaystyles":6},"stages":[{"matches":3,"wins":0,"ovr":1,"stats":{"pac":1,"dri":2},"label":"Stufe 1"},{"matches":4,"wins":1,"ovr":1,"stats":{"pas":2,"dri":2},"label":"Stufe 2"},{"matches":5,"wins":2,"ovr":1,"stats":{"pac":1,"sho":2,"dri":1},"playstyle":"Rapid","label":"Stufe 3"}]},{"id":"aerial_nine","name":"Lufthoheit","subtitle":"Kopfballstarker Neuner","group":"attack","signupDays":7,"completionDays":14,"cost":{"coins":0,"points":0},"maxFinalOvr":80,"statCaps":{"pac":82,"sho":84,"pas":75,"dri":79,"def":58,"phy":86},"req":{"maxOvr":76,"positions":["ST"],"maxPac":84,"maxPlaystyles":6},"stages":[{"matches":3,"wins":1,"ovr":2,"stats":{"phy":2,"sho":2},"label":"Stufe 1"},{"matches":4,"wins":2,"ovr":2,"stats":{"sho":2,"phy":2},"playstyle":"Power Header","label":"Stufe 2"}]},{"id":"box_to_box","name":"Box-to-Box Projekt","subtitle":"Allrounder im Zentrum","group":"mid","signupDays":7,"completionDays":14,"cost":{"coins":25000,"points":200},"maxFinalOvr":82,"statCaps":{"pac":83,"sho":80,"pas":84,"dri":83,"def":83,"phy":85},"req":{"maxOvr":79,"positions":["CM","CDM"],"maxPac":86,"maxPlaystyles":7},"stages":[{"matches":3,"wins":1,"ovr":1,"stats":{"pac":1,"pas":1,"phy":2},"label":"Stufe 1"},{"matches":4,"wins":2,"ovr":1,"stats":{"dri":2,"def":2,"phy":1},"label":"Stufe 2"},{"matches":5,"wins":3,"ovr":1,"stats":{"sho":2,"pas":2,"dri":1,"def":1},"playstyle":"Relentless","label":"Stufe 3"}]},{"id":"creator","name":"Kreativzentrale","subtitle":"Spielmacher-Evolution","group":"mid","signupDays":7,"completionDays":12,"cost":{"coins":15000,"points":150},"maxFinalOvr":81,"statCaps":{"pac":82,"sho":80,"pas":87,"dri":86,"def":70,"phy":77},"req":{"maxOvr":79,"positions":["CM","CAM"],"maxPac":86,"maxPlaystyles":7},"stages":[{"matches":3,"wins":0,"ovr":1,"stats":{"pas":2,"dri":2},"label":"Stufe 1"},{"matches":4,"wins":2,"ovr":1,"stats":{"pas":2,"dri":2,"sho":1},"playstyle":"Incisive Pass","label":"Stufe 2"}]},{"id":"holding_mid","name":"Anker im Mittelfeld","subtitle":"Defensiver Sechser","group":"mid","signupDays":7,"completionDays":14,"cost":{"coins":0,"points":0},"maxFinalOvr":80,"statCaps":{"pac":80,"sho":72,"pas":81,"dri":78,"def":85,"phy":85},"req":{"maxOvr":77,"positions":["CDM","CM"],"maxPac":84,"maxPlaystyles":7},"stages":[{"matches":3,"wins":1,"ovr":1,"stats":{"def":2,"phy":2},"label":"Stufe 1"},{"matches":4,"wins":2,"ovr":1,"stats":{"pas":2,"def":2,"phy":1},"label":"Stufe 2"},{"matches":5,"wins":3,"ovr":1,"stats":{"pac":1,"def":2,"phy":1},"playstyle":"Intercept","label":"Stufe 3"}]},{"id":"defensive_wall","name":"Defensive Wall","subtitle":"Innenverteidiger aufwerten","group":"def","signupDays":7,"completionDays":14,"cost":{"coins":25000,"points":200},"maxFinalOvr":82,"statCaps":{"pac":82,"sho":65,"pas":79,"dri":77,"def":87,"phy":87},"req":{"maxOvr":79,"positions":["CB"],"maxPac":84,"maxPlaystyles":7},"stages":[{"matches":3,"wins":1,"ovr":1,"stats":{"def":2,"phy":2},"label":"Stufe 1"},{"matches":4,"wins":2,"ovr":1,"stats":{"pac":1,"def":2,"phy":1},"label":"Stufe 2"},{"matches":5,"wins":3,"ovr":1,"stats":{"pas":2,"def":2},"playstyle":"Anticipate","label":"Stufe 3"}]},{"id":"fullback_lab","name":"Schienenläufer","subtitle":"Außenverteidiger modernisieren","group":"def","signupDays":7,"completionDays":12,"cost":{"coins":15000,"points":150},"maxFinalOvr":81,"statCaps":{"pac":89,"sho":73,"pas":82,"dri":83,"def":83,"phy":81},"req":{"maxOvr":78,"positions":["LB","RB","LWB","RWB"],"maxPac":90,"maxPlaystyles":7},"stages":[{"matches":3,"wins":0,"ovr":1,"stats":{"pac":1,"pas":2},"label":"Stufe 1"},{"matches":4,"wins":2,"ovr":1,"stats":{"dri":2,"def":2,"phy":1},"label":"Stufe 2"},{"matches":5,"wins":2,"ovr":1,"stats":{"pac":1,"pas":1,"def":1},"playstyle":"Whipped Pass","label":"Stufe 3"}]},{"id":"keeper_project","name":"Letzte Instanz","subtitle":"Torwart-Evolution","group":"def","signupDays":7,"completionDays":14,"cost":{"coins":0,"points":0},"maxFinalOvr":80,"statCaps":{"pac":80,"sho":80,"pas":81,"dri":84,"def":80,"phy":84},"req":{"maxOvr":77,"positions":["GK"],"maxPlaystyles":7},"stages":[{"matches":3,"wins":1,"ovr":1,"stats":{"pac":1,"dri":2,"phy":1},"label":"Stufe 1"},{"matches":4,"wins":2,"ovr":1,"stats":{"pas":2,"dri":1},"label":"Stufe 2"},{"matches":5,"wins":3,"ovr":1,"stats":{"dri":2,"phy":1},"playstyle":"Footwork","label":"Stufe 3"}]}];
EVOLUTION_POOL.push(...[{"id":"s1_low_vereinsprojekt","name":"Vereinsprojekt","subtitle":"Kostenloser Einstieg für 72–76 GES","group":"s1-low","lane":"low","band":"72–76","signupDays":7,"completionDays":14,"cost":{"coins":0,"points":0},"maxFinalOvr":81,"statCaps":{"pac":88,"sho":86,"pas":86,"dri":88,"def":86,"phy":88},"req":{"minOvr":72,"maxOvr":76,"maxPac":89,"maxPlaystyles":8},"stages":[{"matches":2,"wins":0,"ovr":3,"stats":{"pac":2,"pas":1,"dri":2,"phy":1},"label":"Stufe 1"},{"matches":3,"wins":1,"ovr":2,"stats":{"sho":2,"pas":2,"def":1,"phy":1},"label":"Stufe 2"},{"matches":4,"wins":2,"ovr":2,"stats":{"pac":1,"sho":2,"dri":2,"def":1},"playstyle":"Relentless","label":"Stufe 3"}]},{"id":"s1_low_athletik","name":"Athletik-Paket","subtitle":"Tempo und Physis für unterschätzte Karten","group":"s1-low","lane":"low","band":"72–76","signupDays":7,"completionDays":14,"cost":{"coins":20000,"points":150},"maxFinalOvr":82,"statCaps":{"pac":91,"sho":86,"pas":85,"dri":88,"def":87,"phy":91},"req":{"minOvr":72,"maxOvr":76,"maxPac":90,"maxPlaystyles":8},"stages":[{"matches":2,"wins":0,"ovr":3,"stats":{"pac":3,"phy":2,"dri":1},"label":"Stufe 1"},{"matches":3,"wins":1,"ovr":2,"stats":{"pac":2,"sho":1,"def":1,"phy":2},"label":"Stufe 2"},{"matches":4,"wins":2,"ovr":2,"stats":{"pas":2,"dri":2,"def":1,"phy":1},"playstylePlus":"Quick Step","label":"Stufe 3"}]},{"id":"s1_mid_attack","name":"Offensiv-Werkstatt","subtitle":"Mehr Gefahr für Stürmer und Flügel","group":"s1-mid","lane":"mid","band":"77–79","signupDays":7,"completionDays":14,"cost":{"coins":30000,"points":250},"maxFinalOvr":84,"statCaps":{"pac":92,"sho":90,"pas":87,"dri":91,"def":72,"phy":87},"req":{"minOvr":77,"maxOvr":79,"positions":["ST","CF","LW","RW","LM","RM"],"maxPac":91,"maxPlaystyles":8},"stages":[{"matches":3,"wins":1,"ovr":2,"stats":{"pac":2,"sho":2,"dri":2},"label":"Stufe 1"},{"matches":4,"wins":2,"ovr":2,"stats":{"sho":2,"pas":2,"dri":2},"label":"Stufe 2"},{"matches":5,"wins":3,"ovr":1,"stats":{"pac":1,"sho":2,"phy":2},"playstylePlus":"Finesse Shot","label":"Stufe 3"}]},{"id":"s1_mid_defense","name":"Defensiv-Werkstatt","subtitle":"Mehr Stabilität für Abwehr und Sechser","group":"s1-mid","lane":"mid","band":"77–79","signupDays":7,"completionDays":14,"cost":{"coins":30000,"points":250},"maxFinalOvr":84,"statCaps":{"pac":89,"sho":77,"pas":87,"dri":86,"def":91,"phy":92},"req":{"minOvr":77,"maxOvr":79,"positions":["CB","LB","RB","LWB","RWB","CDM"],"maxPac":90,"maxPlaystyles":8},"stages":[{"matches":3,"wins":1,"ovr":2,"stats":{"def":3,"phy":2,"pas":1},"label":"Stufe 1"},{"matches":4,"wins":2,"ovr":2,"stats":{"pac":2,"dri":1,"def":2,"phy":1},"label":"Stufe 2"},{"matches":5,"wins":3,"ovr":1,"stats":{"pas":2,"def":2,"phy":2},"playstylePlus":"Anticipate","label":"Stufe 3"}]},{"id":"s1_high_creator","name":"Kreativer Feinschliff","subtitle":"Technik und Passspiel für 80–81er","group":"s1-high","lane":"high","band":"80–81","signupDays":7,"completionDays":14,"cost":{"coins":50000,"points":350},"maxFinalOvr":85,"statCaps":{"pac":90,"sho":89,"pas":93,"dri":93,"def":84,"phy":86},"req":{"minOvr":80,"maxOvr":81,"positions":["CM","CAM","LM","RM","LW","RW"],"maxPac":91,"maxPlaystyles":7},"stages":[{"matches":4,"wins":1,"ovr":1,"stats":{"pas":3,"dri":2},"label":"Stufe 1"},{"matches":5,"wins":2,"ovr":1,"stats":{"pac":1,"sho":1,"pas":2,"dri":2},"label":"Stufe 2"},{"matches":6,"wins":3,"ovr":2,"stats":{"pas":2,"dri":2,"phy":1},"playstylePlus":"Incisive Pass","label":"Stufe 3"}]},{"id":"s1_high_competitive","name":"Competitive Upgrade","subtitle":"Breiter Feinschliff für starke 80–81er","group":"s1-high","lane":"high","band":"80–81","signupDays":7,"completionDays":14,"cost":{"coins":60000,"points":400},"maxFinalOvr":85,"statCaps":{"pac":93,"sho":92,"pas":92,"dri":93,"def":92,"phy":93},"req":{"minOvr":80,"maxOvr":81,"maxPac":92,"maxPlaystyles":7},"stages":[{"matches":4,"wins":1,"ovr":1,"stats":{"pac":1,"dri":1,"phy":1},"label":"Stufe 1"},{"matches":5,"wins":2,"ovr":1,"stats":{"sho":2,"pas":2,"def":1},"label":"Stufe 2"},{"matches":6,"wins":3,"ovr":2,"stats":{"pac":1,"sho":1,"pas":1,"dri":1,"def":1,"phy":1},"playstylePlus":"Relentless","label":"Stufe 3"}]}]);
EVOLUTION_POOL.push(...[{"id":"s1_elite_sturm","name":"Elite-Torjäger","subtitle":"82–85 GES · Abschluss auf Topniveau","group":"s1-elite","lane":"elite","band":"82–85","signupDays":7,"completionDays":14,"cost":{"coins":55000,"points":400},"maxFinalOvr":88,"statCaps":{"pac":93,"sho":93,"pas":86,"dri":93,"def":75,"phy":91},"req":{"minOvr":82,"maxOvr":85,"positions":["ST","CF","LW","RW"],"maxPlaystyles":7},"stages":[{"matches":4,"wins":1,"ovr":1,"stats":{"pac":1,"sho":2,"dri":1},"label":"Stufe 1"},{"matches":6,"wins":2,"ovr":1,"stats":{"sho":2,"dri":2},"label":"Stufe 2"},{"matches":8,"wins":3,"ovr":1,"stats":{"pac":1,"sho":2,"phy":2},"playstylePlus":"Finesse Shot","label":"Stufe 3"}],"catchUpToCap":true},{"id":"s1_elite_spielmacher","name":"Spielmacher 88","subtitle":"82–85 GES · Pässe und Übersicht","group":"s1-elite","lane":"elite","band":"82–85","signupDays":7,"completionDays":14,"cost":{"coins":70000,"points":500},"maxFinalOvr":88,"statCaps":{"pac":90,"sho":90,"pas":93,"dri":93,"def":87,"phy":89},"req":{"minOvr":82,"maxOvr":85,"positions":["CM","CAM","CDM"],"maxPlaystyles":7},"stages":[{"matches":4,"wins":1,"ovr":1,"stats":{"pas":2,"dri":2},"label":"Stufe 1"},{"matches":6,"wins":2,"ovr":1,"stats":{"pas":2,"dri":1,"phy":1},"label":"Stufe 2"},{"matches":8,"wins":3,"ovr":1,"stats":{"pas":2,"dri":2},"playstylePlus":"Incisive Pass","label":"Stufe 3"}],"catchUpToCap":true},{"id":"s1_elite_abwehr","name":"Abwehrchef 88","subtitle":"82–85 GES · Abwehr und Physis","group":"s1-elite","lane":"elite","band":"82–85","signupDays":7,"completionDays":14,"cost":{"coins":65000,"points":450},"maxFinalOvr":88,"statCaps":{"pac":90,"sho":73,"pas":87,"dri":86,"def":93,"phy":93},"req":{"minOvr":82,"maxOvr":85,"positions":["CB","LB","RB","CDM"],"maxPlaystyles":7},"stages":[{"matches":4,"wins":1,"ovr":1,"stats":{"def":2,"phy":2},"label":"Stufe 1"},{"matches":6,"wins":2,"ovr":1,"stats":{"pac":1,"def":2},"label":"Stufe 2"},{"matches":8,"wins":3,"ovr":1,"stats":{"def":2,"phy":2},"playstylePlus":"Anticipate","label":"Stufe 3"}],"catchUpToCap":true},{"id":"s1_elite_fluegel","name":"Dynamischer Flügel","subtitle":"82–84 GES · Ziel 87 GES","group":"s1-elite","lane":"elite","band":"82–84","signupDays":7,"completionDays":14,"cost":{"coins":45000,"points":350},"maxFinalOvr":87,"statCaps":{"pac":93,"sho":90,"pas":89,"dri":93,"def":74,"phy":85},"req":{"minOvr":82,"maxOvr":84,"positions":["LW","RW","LM","RM"],"maxPlaystyles":7},"stages":[{"matches":4,"wins":1,"ovr":1,"stats":{"pac":1,"dri":2},"label":"Stufe 1"},{"matches":6,"wins":2,"ovr":1,"stats":{"pas":2,"dri":2},"label":"Stufe 2"},{"matches":8,"wins":3,"ovr":1,"stats":{"pac":1,"sho":2},"playstylePlus":"Rapid","label":"Stufe 3"}],"catchUpToCap":true},{"id":"s1_elite_keeper","name":"Letzte Bastion","subtitle":"82–85 GES · Torwart bis 87","group":"s1-elite","lane":"elite","band":"82–85","signupDays":7,"completionDays":14,"cost":{"coins":40000,"points":300},"maxFinalOvr":87,"statCaps":{"pac":88,"sho":88,"pas":88,"dri":93,"def":88,"phy":93},"req":{"minOvr":82,"maxOvr":85,"positions":["GK"],"maxPlaystyles":7},"stages":[{"matches":4,"wins":1,"ovr":1,"stats":{"dri":2,"phy":1},"label":"Stufe 1"},{"matches":6,"wins":2,"ovr":1,"stats":{"pas":1,"dri":2},"label":"Stufe 2"},{"matches":8,"wins":3,"ovr":1,"stats":{"dri":2,"phy":2},"playstylePlus":"Footwork","label":"Stufe 3"}],"catchUpToCap":true}]);
// Event evolutions have their own fixed window and end in the event's card design (applyEvoStage sets cosmeticDesign).
EVOLUTION_POOL.push({"id":"halloween_blutmond","name":"Blutmond-Evolution","subtitle":"Halloween · deine Karte im Blutmond-Design","group":"event","lane":"event","band":"HALLOWEEN","design":"halloween","activeFrom":"2026-10-30T19:00:00+01:00","activeUntilAt":"2026-11-06T19:00:00+01:00","completionDays":14,"cost":{"coins":0,"points":0},"maxFinalOvr":88,"statCaps":{"pac":93,"sho":92,"pas":92,"dri":93,"def":90,"phy":92},"req":{"minOvr":78,"maxOvr":84,"baseCardsOnly":true,"positions":["CB","LB","RB","LWB","RWB","CDM","CM","CAM","LM","RM","LW","RW","CF","ST"],"maxPlaystyles":8},"stages":[{"matches":3,"wins":1,"ovr":1,"stats":{"pac":1,"dri":2,"phy":1},"label":"Geisterstunde"},{"matches":4,"wins":2,"ovr":1,"stats":{"sho":2,"pas":2},"label":"Kürbisnacht"},{"matches":5,"wins":3,"ovr":2,"stats":{"pac":1,"sho":1,"pas":1,"dri":2,"def":1,"phy":1},"playstyle":"First Touch","label":"Blutmond"}]});
const EVOLUTION_SEASON_MAX_OVR=88,EVOLUTION_GLOBAL_STAT_CAP=93;
const EVOLUTIONS=EVOLUTION_POOL;
const CAMPAIGNS=[
 {title:"Foundations",text:"Starteraufgaben, erste SBCs und Markt-Grundlagen.",key:"foundation"},
 {title:"Season Pass",text:"Sammle SP mit Matches und Zielen für kostenlose und Premium-Belohnungen.",key:"season"},
 {title:"Evolution Lab",text:"Entwickle ausgewählte Spieler über Match-Ziele.",key:"evo"}
];

const PACKS=[
 {id:"bronze",name:"Bronze-Pack",coins:450,points:null,type:"bronze",count:5,min:0,max:64,store:true,reward:true,desc:"5 Bronze-Spieler",iconChance:0,standard:true},
 {id:"silver",name:"Silber-Pack",coins:900,points:50,type:"silver",count:5,min:65,max:74,store:true,reward:true,desc:"5 Silber-Spieler",iconChance:0,standard:true},
 {id:"gold",name:"Premium Gold Pack",coins:4500,points:150,type:"gold",count:5,min:75,max:99,store:true,reward:true,desc:"5 Gold-Spieler · unbegrenzt verfügbar",tag:"PREMIUM",iconChance:0.0002,standard:true},
 {id:"82",name:"82+ Players Pack",coins:null,points:null,type:"special",count:3,min:75,max:99,guarantee:82,store:false,reward:true,desc:"3 Gold-Spieler · mind. 1× 82+",iconChance:0.0002},
 {"id":"81x3-sbc","name":"3× 81+ Spielerpack","coins":null,"points":null,"type":"special","count":3,"min":81,"max":99,"guarantee":81,"rareCount":3,"store":false,"reward":true,"desc":"3 Spieler · alle garantiert 81+","iconChance":0.0007},
 {"id":"83x3-sbc","name":"3× 83+ Spielerpack","coins":null,"points":null,"type":"special","count":3,"min":83,"max":99,"guarantee":83,"rareCount":3,"store":false,"reward":true,"desc":"3 Spieler · alle garantiert 83+","iconChance":0.0007},
 {"id":"84x3-sbc","name":"3× 84+ Spielerpack","coins":null,"points":null,"type":"special","count":3,"min":84,"max":99,"guarantee":84,"rareCount":3,"store":false,"reward":true,"desc":"3 Spieler · alle garantiert 84+","iconChance":0.0007},
 {"id":"85x2-sbc","name":"2× 85+ Spielerpack","coins":null,"points":null,"type":"special","count":2,"min":85,"max":99,"guarantee":85,"rareCount":2,"store":false,"reward":true,"desc":"2 Spieler · alle garantiert 85+","iconChance":0.0007},
 {id:"83",name:"83+ Players Pack",coins:null,points:null,type:"special",count:1,min:83,max:99,guarantee:83,store:false,reward:true,desc:"1 Spieler · garantiert 83+",iconChance:0.0005},
 {id:"85",name:"85+ Players Pack",coins:null,points:null,type:"special",count:3,min:75,max:99,guarantee:85,store:false,reward:true,desc:"3 Gold-Spieler · mind. 1× 85+",iconChance:0.002},
 {id:"86",name:"86+ Players Pack",coins:null,points:null,type:"special",count:1,min:86,max:99,guarantee:86,store:false,reward:true,desc:"1 Spieler · garantiert 86+",iconChance:0.004},
 {id:"2x86",name:"2× 86+ Players Pack",coins:null,points:null,type:"special",count:2,min:86,max:99,guarantee:86,store:false,reward:true,desc:"2 Spieler · beide garantiert 86+",iconChance:0.006},
 {id:"goldplayers",name:"Premium Goldspieler-Pack",coins:15000,points:350,type:"gold",count:12,composition:[{quality:"gold",count:12,min:75,max:99}],guarantee:82,rareCount:3,store:true,reward:true,promo:true,rotation:true,packKind:"players",desc:"12 Goldspieler · 3 selten · mind. 1× 82+",tag:"PROMO",iconChance:0.0015,dailyLimit:10,resetHour:19},
 {id:"mixed6",name:"Gemischtes Spieler-Set",coins:7500,points:200,type:"mixed",count:6,composition:[{quality:"gold",count:3,min:75,max:99},{quality:"silver",count:2,min:65,max:74},{quality:"bronze",count:1,min:0,max:64}],guarantee:81,rareCount:3,store:true,reward:false,promo:true,rotation:true,packKind:"mixed",desc:"6 Spieler · 3 Gold, 2 Silber, 1 Bronze · 3 selten · mind. 1× 81+",tag:"PROMO",iconChance:0.001,dailyLimit:10,resetHour:19},
 {id:"primegold",name:"Prime Goldspieler-Pack",coins:21000,points:500,type:"gold",count:12,composition:[{quality:"gold",count:12,min:75,max:99}],guarantee:82,rareCount:6,store:true,reward:false,promo:true,rotation:true,packKind:"players",desc:"12 Goldspieler · 6 selten · mind. 1× 82+",tag:"PROMO",iconChance:0.0017,dailyLimit:10,resetHour:19},
 {id:"electrum",name:"Premium Electrum Spieler-Pack",coins:15000,points:350,type:"mixed",count:12,composition:[{quality:"gold",count:6,min:75,max:99},{quality:"silver",count:6,min:65,max:74}],guarantee:81,rareCount:6,store:true,reward:false,promo:true,rotation:true,packKind:"mixed",desc:"12 Spieler · 6 Gold, 6 Silber · 6 selten · mind. 1× 81+",tag:"PROMO",iconChance:0.0012,dailyLimit:10,resetHour:19},
 {id:"raremixed",name:"Seltenes Gemischtes Spieler-Pack",coins:12000,points:300,type:"mixed",count:12,composition:[{quality:"gold",count:4,min:75,max:99},{quality:"silver",count:4,min:65,max:74},{quality:"bronze",count:4,min:0,max:64}],guarantee:81,rareCount:6,store:true,reward:false,promo:true,rotation:true,packKind:"mixed",desc:"12 Spieler · Gold/Silber/Bronze gemischt · 6 selten · mind. 1× 81+",tag:"PROMO",iconChance:0.001,dailyLimit:10,resetHour:19},
 {id:"ultimate",name:"Ultimatives Pack",coins:75000,points:2500,type:"gold",count:30,composition:[{quality:"gold",count:30,min:75,max:99}],guarantee:84,rareCount:30,store:true,reward:false,promo:true,rotation:true,packKind:"players",desc:"30 Goldspieler · alle selten · mind. 1× 84+",tag:"PROMO",iconChance:0.004,dailyLimit:10,resetHour:19},
 {id:"jumbo-rare",name:"Jumbo-Seltene-Spieler-Pack",coins:60000,points:2000,type:"gold",count:24,composition:[{quality:"gold",count:24,min:75,max:99}],guarantee:83,rareCount:24,store:true,reward:false,promo:true,rotation:true,packKind:"players",desc:"24 Goldspieler · alle selten · mind. 1× 83+",tag:"PROMO",iconChance:0.003,dailyLimit:10,resetHour:19},
 {id:"rare-mixed",name:"Seltenes Gemischtes Spieler-Pack",coins:12000,points:300,type:"mixed",count:12,composition:[{quality:"gold",count:4,min:75,max:99},{quality:"silver",count:4,min:65,max:74},{quality:"bronze",count:4,min:0,max:64}],guarantee:81,rareCount:12,store:true,reward:false,promo:true,rotation:true,packKind:"mixed",desc:"12 Spieler · 4 Gold, 4 Silber, 4 Bronze · alle selten · mind. 1× 81+",tag:"PROMO",iconChance:0.001,dailyLimit:10,resetHour:19},
 {id:"mega",name:"Mega Pack",coins:39000,points:1000,type:"gold",count:12,composition:[{quality:"gold",count:12,min:75,max:99}],guarantee:82,rareCount:6,store:true,reward:false,promo:true,rotation:true,packKind:"mega",chemBoostSlots:{slots:2,chance:1},desc:"12 Goldspieler · 6 selten · mind. 1× 82+ · 2 Chemie-Boosts garantiert",tag:"PROMO",iconChance:0.002,dailyLimit:20,resetHour:19},
 {id:"83x15",name:"83+ ×15 Spieler-Pack",coins:90000,points:3000,type:"gold",count:15,min:83,max:99,composition:[{quality:"gold",count:15,min:83,max:99}],guarantee:83,rareCount:15,store:true,reward:false,promo:true,rotation:true,packKind:"players",desc:"15 seltene Goldspieler · jeder Spieler garantiert 83+",tag:"PROMO",iconChance:0.0025,dailyLimit:7,resetHour:19},
 {id:"84x10",name:"84+ ×10 Spieler-Pack",coins:120000,points:4000,type:"gold",count:10,min:84,max:99,composition:[{quality:"gold",count:10,min:84,max:99}],guarantee:84,rareCount:10,store:true,reward:false,promo:true,rotation:true,packKind:"players",desc:"10 seltene Goldspieler · jeder Spieler garantiert 84+",tag:"PROMO",iconChance:0.003,dailyLimit:5,resetHour:19},
 {id:"jumbo-gold",name:"Jumbo-Gold-Pack",coins:null,points:null,type:"gold",count:12,composition:[{quality:"gold",count:12,min:75,max:99}],rareCount:3,store:false,reward:true,desc:"12 Goldspieler · 3 selten",iconChance:0.0005},
 {id:"premium-electrum-reward",name:"Premium-Electrum-Spieler-Pack",coins:null,points:null,type:"mixed",count:12,composition:[{quality:"gold",count:6,min:75,max:99},{quality:"silver",count:6,min:65,max:74}],rareCount:3,store:false,reward:true,desc:"12 Spieler · 6 Gold, 6 Silber · 3 selten",iconChance:0.0007},
 {id:"small-prime-gold",name:"Small-Prime-Goldspieler-Pack",coins:null,points:null,type:"gold",count:6,composition:[{quality:"gold",count:6,min:75,max:99}],guarantee:80,rareCount:3,store:false,reward:true,desc:"6 Goldspieler · 3 selten · mind. 1× 80+",iconChance:0.001},
 {id:"prime-electrum-reward",name:"Prime-Electrum-Spieler-Pack",coins:null,points:null,type:"mixed",count:12,composition:[{quality:"gold",count:6,min:75,max:99},{quality:"silver",count:6,min:65,max:74}],guarantee:80,rareCount:6,store:false,reward:true,desc:"12 Spieler · 6 Gold, 6 Silber · 6 selten · mind. 1× 80+",iconChance:0.001},
 {id:"halloween-pack",name:"HALLOWEEN-Blutmond-Pack",coins:60000,points:null,type:"gold",count:6,composition:[{quality:"gold",count:5,min:75,max:99}],guarantee:83,rareCount:5,store:true,reward:false,promo:true,rotation:true,packKind:"players",eventSlot:"halloween-2026",desc:"6 Spieler · 1 HALLOWEEN-Karte garantiert · 5 seltene Goldspieler · mind. 1× 83+",tag:"HALLOWEEN",iconChance:0.002,dailyLimit:3,resetHour:19},
 {id:"event-sbc-player",name:"Event-SBC-Spieler-Pack",coins:null,points:null,type:"special",count:1,min:0,max:99,store:false,reward:false,desc:"1 untauschbarer Event-SBC-Spieler",iconChance:0},
 {id:FOUNDER_PACK_ID,name:"FOOTERA FOUNDER Pack",coins:null,points:null,type:"founder",count:1,min:88,max:88,store:false,reward:false,desc:"Exklusive B. Gerlach Founder-Karte · einmalig für diese Vereins-ID",iconChance:0},
 {id:MARCO_FOUNDER_PACK_ID,name:"FOOTERA FOUNDER Pack · M. Gerlach",coins:null,points:null,type:"founder",count:1,min:88,max:88,store:false,reward:false,desc:"Exklusive M. Gerlach Founder-Karte · einmalig für diese Vereins-ID",iconChance:0},
 {id:"founder-niklas",name:"FOOTERA FOUNDER Pack · N. Bergsträßer",coins:null,points:null,type:"founder",count:1,min:88,max:88,store:false,reward:false,desc:"Deine exklusive N. Bergsträßer Founder-Karte · einmalig für Wurstwasser Worms FC",iconChance:0}
];
// This account-only gift shares the ordinary pack's name, artwork and description.
PACKS.push({...PACKS.find(p=>p.id==="goldplayers"),id:"marco-premium-goldplayers-20260930",coins:null,points:null,store:false,reward:false,promo:false,rotation:false,dailyLimit:0,recipientSaveId:"GF-7D87D08A06104571"});
const TOTW_WEEK_1={id:1,name:"Team of the Week 1",releaseDate:"2026-09-16",activeUntil:"23.09.2026 18:59",players:[
 {names:["Lamine Yamal","Lamine Yamal Nasraoui Ebana"],eaId:"277643",ovr:91,position:"RW",fallback:{id:"277643",name:"Lamine Yamal",fullName:"Lamine Yamal Nasraoui Ebana",ovr:91,position:"RW",team:"FC Barcelona",league:"LALIGA EA SPORTS",nation:"Spain",face:"https://cdn.futwiz.com/assets/img/fc27/faces/277643.png",pac:87,sho:85,pas:88,dri:94,def:40,phy:63,source:"fc27-totw-verified"}},{names:["David Raya","David Raya Martin","David Raya Martín"],eaId:"220941",ovr:89,position:"GK",fallback:{id:"220941",name:"David Raya",fullName:"David Raya Martín",ovr:89,position:"GK",team:"Arsenal FC",league:"Premier League",nation:"Spain",face:"https://cdn.futwiz.com/assets/img/fc27/faces/220941.png",pac:88,sho:87,pas:89,dri:89,def:60,phy:88,source:"fc27-totw-verified"}},{names:["Melchie Dumornay","Melchie Daëlle Dumornay"],eaId:"265898",ovr:89,position:"LW",fallback:{id:"265898",name:"Melchie Dumornay",fullName:"Melchie Dumornay",ovr:88,position:"LW",team:"OL Lyonnes",league:"Arkema Première Ligue",nation:"Haiti",face:"https://cdn.futwiz.com/assets/img/fc27/faces/265898.png",pac:93,sho:86,pas:81,dri:91,def:62,phy:75,source:"fc27-totw-verified"}},
 {names:["Lucy Bronze"],eaId:"227246",ovr:86,position:"CB",fallback:{id:"227246",name:"Lucy Bronze",fullName:"Lucy Bronze",ovr:85,position:"CB",team:"Chelsea",league:"Barclays Women's Super League",nation:"England",face:"https://cdn.futwiz.com/assets/img/fc27/faces/227246.png",pac:73,sho:70,pas:82,dri:82,def:86,phy:88,source:"fc27-totw-verified"}},{names:["marcus thuram"],ovr:86,position:"ST"},{names:["felix nmecha"],ovr:86,position:"CM"},{names:["Esmee Brugts"],eaId:"267530",ovr:85,position:"LB",fallback:{id:"267530",name:"Esmee Brugts",fullName:"Esmee Brugts",ovr:84,position:"LB",team:"FC Barcelona",league:"Liga F Moeve",nation:"Netherlands",face:"https://cdn.futwiz.com/assets/img/fc27/faces/267530.png",pac:88,sho:75,pas:80,dri:82,def:82,phy:76,source:"fc27-totw-verified"}},
 {names:["matvey safonov","matvei safonov","safonov"],ovr:84,position:"GK"},{names:["Erëleta Memeti","Ereleta Memeti"],eaId:"265058",ovr:84,position:"RM",fallback:{id:"265058",name:"Erëleta Memeti",fullName:"Erëleta Memeti",ovr:82,position:"RM",team:"Frankfurt",league:"Google Pixel Frauen-Bundesliga",nation:"Kosovo",face:"https://cdn.futwiz.com/assets/img/fc27/faces/265058.png",pac:87,sho:81,pas:82,dri:84,def:58,phy:68,source:"fc27-totw-verified"}},{names:["Amanda Gutierres","Amanda Gutierres dos Santos"],eaId:"267674",ovr:83,position:"ST",fallback:{id:"267674",name:"Amanda Gutierres",fullName:"Amanda Gutierres dos Santos",ovr:79,position:"ST",team:"Boston Legacy",league:"National Women's Soccer League",nation:"Brazil",face:"https://cdn.futwiz.com/assets/img/fc27/faces/267674.png",pac:82,sho:83,pas:66,dri:80,def:41,phy:81,source:"fc27-totw-verified"}},
 {names:["alvaro carreras","alvaro fernandez carreras","álvaro carreras"],ovr:83,position:"LB"},{names:["Gabriel Martinelli","Gabriel Teodoro Martinelli Silva"],eaId:"251566",ovr:82,position:"RW",fallback:{id:"251566",name:"Gabriel Martinelli",fullName:"Gabriel Teodoro Martinelli Silva",ovr:80,position:"RW",team:"Al Hilal",league:"Saudi Pro League",nation:"Brazil",face:"https://cdn.futwiz.com/assets/img/fc27/faces/251566.png",pac:90,sho:80,pas:77,dri:84,def:48,phy:72,source:"fc27-totw-verified"}},
 {names:["xherdan shaqiri"],ovr:80,position:"CAM"},{names:["lewis dunk"],ovr:80,position:"CB"},{names:["jose paradela","josé paradela"],ovr:80,position:"RW"},{names:["ianis stoica"],ovr:80,position:"LM"},
 {names:["sven mijnans"],ovr:80,position:"ST"},{names:["yannik engelhardt"],ovr:80,position:"CDM"},{names:["tiago santos","tiago carvalho santos"],ovr:80,position:"RB"},{names:["gift orban"],ovr:80,position:"ST"},
 {names:["bruno damiani"],ovr:80,position:"ST"},{names:["franco mastantuono","valentin mastantuono","valentín mastantuono"],ovr:80,position:"RM"},{names:["trent kone-doherty","trent koné-doherty","kone-doherty"],ovr:80,position:"RM"}
]};
const TOTW_WEEK_2={id:2,name:"Team of the Week 2",releaseDate:"2026-09-23",activeUntil:"30.09.2026 18:59",players:[
 {names:["Michael Olise","Michael Akpovie Olise"],ovr:91,position:"RM"},
 {names:["Raphinha","Raphael Dias Belloli","Raphael Dias Belloli"],ovr:89,position:"ST"},
 {names:["Sophia Wilson","Sophia Smith","Sophia Olivia Wilson"],ovr:89,position:"ST"},
 {names:["Marquinhos","Marcos Aoas Correa","Marcos Aoás Corrêa"],ovr:88,position:"CB"},
 {names:["Mohamed Salah","Mohamed Salah Hamed Mahrous Ghaly"],ovr:88,position:"RM"},
 {names:["Antoine Semenyo","Antoine Serlom Semenyo"],ovr:86,position:"LM"},
 {names:["Corentin Tolisso"],ovr:84,position:"CM"},
 {names:["Alberto Moleiro","Alberto Moleiro Gonzalez","Alberto Moleiro González"],ovr:84,position:"CAM"},
 {names:["Vedat Muriqi"],ovr:83,position:"ST"},
 {names:["Jonathan David","Jonathan Christian David"],ovr:82,position:"ST"},
 {names:["Miguel Gutierrez","Miguel Gutierrez Ortega","Miguel Gutiérrez","Miguel Gutiérrez Ortega"],ovr:82,position:"LB"},
 {names:["Lorenzo Palmisani"],ovr:82,position:"GK"},
 {names:["Pascal Gross","Pascal Groß"],ovr:81,position:"CDM"},
 {names:["Olivia Holdt"],ovr:81,position:"LM"},
 {names:["Anis Hadj Moussa","Anis Hadj-Moussa"],ovr:80,position:"RW"},
 {names:["Bella Andersson"],ovr:80,position:"CB"},
 {names:["Marco Reus"],ovr:80,position:"CAM"},
 {names:["Pablo Rosario"],ovr:80,position:"CDM"},
 {names:["Hannes Delcroix"],ovr:80,position:"CB"},
 {names:["Dujon Sterling"],ovr:80,position:"RB"},
 {names:["Salomon Rodriguez","Salomón Rodríguez"],ovr:80,position:"ST"},
 {names:["Jack Moylan"],ovr:80,position:"CAM"},
 {names:["Chiara Hahn"],ovr:80,position:"CDM"}
]};
const TOTW_WEEK_3={id:3,name:"Team of the Week 3",releaseDate:"2026-09-30",activeUntil:"07.10.2026 18:59",players:[
 {names:["Konstantinos Tzolakis"],ovr:82,position:"GK",stats:[84,80,78,86,54,83]},
 {names:["Gregor Kobel"],ovr:88,position:"GK",stats:[88,86,84,90,55,87]},
 {names:["Zachary Athekame"],ovr:81,position:"RB",stats:[88,59,79,81,78,77]},
 {names:["Alessandro Bastoni"],ovr:87,position:"CB",stats:[76,58,83,80,89,84]},
 {names:["Michael Kayode"],ovr:82,position:"RB",stats:[89,68,78,82,79,81]},
 {names:["Nico Elvedi"],ovr:83,position:"CB",stats:[75,57,73,71,84,82]},
 {names:["Trent Alexander-Arnold","Trent Alexander Arnold"],ovr:87,position:"RB",stats:[78,71,91,84,80,75]},
 {names:["Mikkel Damsgaard"],ovr:84,position:"CAM",stats:[80,79,88,87,57,67]},
 {names:["Dimitris Kourbelis"],ovr:81,position:"CDM",stats:[68,75,77,75,83,84]},
 {names:["Alex Baena","Álex Baena","Alejandro Baena Rodriguez","Alejandro Baena Rodríguez"],ovr:87,position:"CAM",stats:[81,83,89,88,65,72]},
 {names:["Leo Walta"],ovr:78,position:"CM",stats:[75,82,80,79,61,69]},
 {names:["Michael Olise","Michael Akpovie Olise"],ovr:91,position:"RM",stats:[88,88,90,93,55,70]},
 {names:["Remo Freuler"],ovr:83,position:"CM",stats:[67,76,84,80,82,79]},
 {names:["Lamine Yamal","Lamine Yamal Nasraoui Ebana"],eaId:"277643",ovr:91,position:"RW",stats:[89,88,90,95,40,64]},
 {names:["Erling Haaland","Erling Braut Haaland"],ovr:92,position:"ST",stats:[88,94,73,82,48,91]},
 {names:["Joel Pohjanpalo"],ovr:82,position:"ST",stats:[72,87,72,78,37,84]},
 {names:["Mexx Meerdink"],ovr:80,position:"ST",stats:[78,84,70,80,35,80]},
 {names:["Zeki Amdouni","Mohamed Zeki Amdouni"],ovr:84,position:"ST",stats:[82,86,79,84,41,78]}
]};
const TOTW_WEEK_4={id:4,name:"Team of the Week 4",releaseDate:"2026-10-07",activeUntil:"14.10.2026 18:59",sourceStatus:"admin-approved",players:[
 {names:["Giorgi Mamardashvili"],ovr:86,position:"GK",stats:[88,84,82,89,55,86]},
 {names:["Gianluigi Donnarumma"],ovr:90,position:"GK",stats:[91,86,80,92,52,89]},
 {names:["Joao Cancelo","João Cancelo","Joao Pedro Cavaco Cancelo"],ovr:86,position:"LB",stats:[87,78,87,88,79,75]},
 {names:["Ciaron Brown","Brown"],ovr:82,position:"CB",stats:[77,68,69,72,82,87]},
 {names:["David Hancko","Dávid Hancko"],ovr:85,position:"CB",stats:[80,65,78,76,86,86]},
 {names:["Lasha Dvali"],ovr:81,position:"CB",stats:[68,48,68,65,82,84]},
 {names:["Neco Williams","Neco Shay Williams"],ovr:82,position:"RB",stats:[89,74,78,82,78,78]},
 {names:["Jude Bellingham"],ovr:92,position:"CAM",stats:[82,89,90,92,82,88]},
 {names:["Mikel Merino","Mikel Merino Zazon","Mikel Merino Zazón"],ovr:87,position:"CM",stats:[72,88,86,84,84,87]},
 {names:["Kevin De Bruyne"],ovr:88,position:"CAM",stats:[77,88,92,87,69,72]},
 {names:["Florian Wirtz"],ovr:88,position:"CAM",stats:[87,84,89,92,52,68]},
 {names:["Tom Bischof"],ovr:83,position:"CM",stats:[78,80,84,84,74,74]},
 {names:["Fabian Rieder","Fabian Rieder"],ovr:82,position:"CAM",stats:[81,80,84,83,68,76]},
 {names:["Harry Kane"],ovr:92,position:"ST",stats:[78,95,90,89,52,88]},
 {names:["Bukayo Saka"],ovr:89,position:"RW",stats:[91,88,88,91,62,74]},
 {names:["Robert Lewandowski"],ovr:87,position:"ST",stats:[72,91,82,84,46,83]},
 {names:["Goncalo Ramos","Gonçalo Ramos"],ovr:84,position:"ST",stats:[84,87,76,82,42,84]},
 {names:["Rasmus Hojlund","Rasmus Højlund"],ovr:84,position:"ST",stats:[88,85,71,80,41,86]}
]};
// TOTW 5: von Basti am 13.10.2026 freigegeben; Start 14.10.2026 um 19:00 Europe/Berlin. Ratings/Attribute sind redaktionelles Balancing.
// Prüfunterlagen: docs/TOTW-5-Vorschlag-2026-10-14.md
//  https://www.southamptonfc.com/en/news/article/report-ten-man-saints-stand-firm-for-famous-derby-win
//  https://www.inter.it/en/match_center/5374/inter-parma
//  https://www.mancity.com/news/mens/liverpool-v-city-premier-league-match-report-october-2026-63927325
// Belege: https://www.bundesliga.com/en/bundesliga/news/rb-leipzig-eintracht-frankfurt-match-report-highlights-matchday-5-39497
//  https://www.bundesliga.com/en/bundesliga/news/paderborn-vfb-stuttgart-match-report-highlights-matchday-5-stiller-fuhrich-39482
//  https://www.laliga.com/en-US/match/temporada-2026-2027-laliga-ea-sports-fc-barcelona-getafe-cf-8
//  https://www.theguardian.com/football/2026/oct/11/european-football-lazio-maintain-strong-start-with-win-over-monza
//  https://www.reuters.com/sports/soccer/inter-rout-parma-de-bruyne-double-lifts-napoli-2026-10-10/
//  https://www.reuters.com/sports/soccer/guimaraes-grabs-winner-arsenal-rally-beat-leeds-2026-10-10/
//  https://www.liverpoolfc.com/matches/mens-team/liverpool-v-manchester-city-english-premier-league-20261011
//  https://www.bundesliga.com/en/bundesliga/news/cologne-borussia-monchengladbach-match-report-highlights-matchday-5-said-el-mala-39507
//  https://www.ouest-france.fr/sport/football/resultats-matchs/match-auxerre-rennes-1334-1337/
//  https://www.bundesliga.com/en/bundesliga/news/sport-club-freiburg-schalke-match-report-highlights-matchday-5-39510
//  https://www.thetimes.com/sport/football/article/chelsea-bournemouth-score-result-premier-league-xt8pxwrcz
const TOTW_WEEK_5={id:5,name:"Team of the Week 5",releaseDate:"2026-10-14",activeUntil:"21.10.2026 18:59",sourceStatus:"admin-approved",players:[
  {names:["Karl Hein","Karl Jakob Hein"],eaId:"248732",ovr:81,position:"GK",stats:[83,79,74,85,48,80],fallback:{face:"./assets/footera/totw/5/248732.png",gender:"male",name:"Karl Hein",fullName:"Karl Jakob Hein",team:"Werder Bremen",league:"Bundesliga",nation:"Estonia"}},
  {names:["Pierluigi Gollini"],eaId:"211515",ovr:82,position:"GK",stats:[84,80,74,86,49,81],fallback:{face:"./assets/footera/totw/5/211515.png",gender:"male",name:"Pierluigi Gollini",fullName:"Pierluigi Gollini",team:"Roma",league:"Serie A",nation:"Italy"}},
  {names:["Jules Koundé","Jules Kounde"],eaId:"241486",ovr:87,position:"RB",stats:[84,66,78,82,86,82],fallback:{face:"./assets/footera/totw/5/241486.png",gender:"male",name:"Jules Koundé",fullName:"Jules Kounde",team:"FC Barcelona",league:"LALIGA EA SPORTS",nation:"France"}},
  {names:["James Bree"],eaId:"222156",ovr:81,position:"RB",stats:[79,74,76,75,80,78],fallback:{face:"./assets/footera/totw/5/222156.png",gender:"male",name:"James Bree",fullName:"James Bree",team:"Southampton",league:"EFL Championship",nation:"England"}},
  {names:["Dara O’Shea","Dara O'Shea"],eaId:"235405",ovr:82,position:"CB",stats:[74,66,70,70,83,86],fallback:{face:"./assets/footera/totw/5/235405.png",gender:"male",name:"Dara O’Shea",fullName:"Dara O'Shea",team:"Ipswich Town",league:"Premier League",nation:"Ireland"}},
  {names:["Nuno Tavares","Nuno Albertino Varela Tavares"],eaId:"251530",ovr:84,position:"LB",stats:[92,75,77,83,80,83],fallback:{face:"./assets/footera/totw/5/251530.png",gender:"male",name:"Nuno Tavares",fullName:"Nuno Albertino Varela Tavares",team:"Lazio",league:"Serie A",nation:"Portugal"}},
  {names:["Jon Martín","Jon Martin"],eaId:"277225",ovr:81,position:"CB",stats:[72,60,69,66,82,82],fallback:{face:"./assets/footera/totw/5/277225.png",gender:"male",name:"Jon Martín",fullName:"Jon Martin",team:"Real Sociedad",league:"LALIGA EA SPORTS",nation:"Spain"}},
  {names:["Isco","Francisco Román Alarcón Suárez"],eaId:"197781",ovr:88,position:"CAM",stats:[75,85,90,91,52,62],fallback:{face:"./assets/footera/totw/5/197781.png",gender:"male",name:"Isco",fullName:"Francisco Román Alarcón Suárez",team:"Real Betis",league:"LALIGA EA SPORTS",nation:"Spain"}},
  {names:["Jordan Henderson"],eaId:"183711",ovr:84,position:"CM",stats:[69,83,86,79,75,78],fallback:{face:"./assets/footera/totw/5/183711.png",gender:"male",name:"Jordan Henderson",fullName:"Jordan Henderson",team:"Chelsea",league:"Premier League",nation:"England"}},
  {names:["Angelo Stiller"],eaId:"250959",ovr:85,position:"CM",stats:[69,70,88,82,78,71],fallback:{face:"./assets/footera/totw/5/250959.png",gender:"male",name:"Angelo Stiller",fullName:"Angelo Stiller",team:"VfB Stuttgart",league:"Bundesliga",nation:"Germany"}},
  {names:["Petar Sučić","Petar Sucic"],eaId:"276278",ovr:83,position:"CM",stats:[76,80,83,82,76,78],fallback:{face:"./assets/footera/totw/5/276278.png",gender:"male",name:"Petar Sučić",fullName:"Petar Sucic",team:"Inter",league:"Serie A",nation:"Croatia"}},
  {names:["Bruno Guimarães","Bruno Guimaraes"],eaId:"247851",ovr:88,position:"CM",stats:[72,81,87,85,84,82],fallback:{face:"./assets/footera/totw/5/247851.png",gender:"male",name:"Bruno Guimarães",fullName:"Bruno Guimaraes",team:"Arsenal",league:"Premier League",nation:"Brazil"}},
  {names:["Christopher Nkunku"],eaId:"232411",ovr:89,position:"ST",stats:[88,90,84,91,50,71],fallback:{face:"./assets/footera/totw/5/232411.png",gender:"male",name:"Christopher Nkunku",fullName:"Christopher Nkunku",team:"RB Leipzig",league:"Bundesliga",nation:"France"}},
  {names:["Saïd El Mala","Said El Mala"],eaId:"71178",ovr:83,position:"LW",stats:[91,81,73,88,39,68],fallback:{face:"./assets/footera/totw/5/71178.png",gender:"male",name:"Saïd El Mala",fullName:"Said El Mala",team:"1. FC Köln",league:"Bundesliga",nation:"Germany"}},
  {names:["Pascal Groß","Pascal Gross"],eaId:"190765",ovr:85,position:"CM",stats:[62,79,89,81,77,74],fallback:{face:"./assets/footera/totw/5/190765.png",gender:"male",name:"Pascal Groß",fullName:"Pascal Gross",team:"Brighton & Hove Albion",league:"Premier League",nation:"Germany"}},
  {names:["Jérémy Doku","Jeremy Doku"],eaId:"246420",ovr:87,position:"LW",stats:[96,80,82,93,31,65],fallback:{face:"./assets/footera/totw/5/246420.png",gender:"male",name:"Jérémy Doku",fullName:"Jeremy Doku",team:"Manchester City",league:"Premier League",nation:"Belgium"}},
  {names:["Boulaye Dia"],eaId:"246242",ovr:83,position:"ST",stats:[84,85,73,80,37,76],fallback:{face:"./assets/footera/totw/5/246242.png",gender:"male",name:"Boulaye Dia",fullName:"Boulaye Dia",team:"Rennes",league:"Ligue 1",nation:"Senegal"}},
  {names:["Keisuke Gotō","Keisuke Goto"],eaId:"76570",ovr:80,position:"ST",stats:[75,81,67,75,34,78],fallback:{face:"./assets/footera/totw/5/76570.png",gender:"male",name:"Keisuke Gotō",fullName:"Keisuke Goto",team:"SC Freiburg",league:"Bundesliga",nation:"Japan"}}
]};
const TOTW_WEEK_6={id:6,name:"Team of the Week 6",releaseDate:"2026-10-21",activeUntil:"28.10.2026 18:59",sourceStatus:"admin-approved",players:[
  {names:["Filip Stanković","Filip Stankovic"],eaId:"269271",ovr:80,position:"GK",stats:[79,78,75,80,50,76],fallback:{face:"./assets/footera/totw/6/269271.png",gender:"male",name:"Filip Stanković",fullName:"Filip Stanković",team:"Venezia",league:"Serie A",nation:"Serbia"}},
  {names:["Nahuel Noll"],eaId:"262322",ovr:76,position:"GK",stats:[74,75,69,78,61,75],fallback:{face:"./assets/footera/totw/6/262322.png",gender:"male",name:"Nahuel Noll",fullName:"Nahuel Noll",team:"SC Paderborn 07",league:"Bundesliga",nation:"Germany"}},
  {names:["Carlos Augusto","Carlos Augusto Zopolato Neves"],eaId:"258648",ovr:84,position:"LB",stats:[81,75,80,82,82,79],fallback:{face:"./assets/footera/totw/6/258648.png",gender:"male",name:"Carlos Augusto",fullName:"Carlos Augusto Zopolato Neves",team:"Inter",league:"Serie A",nation:"Brazil"}},
  {names:["Oliver Provstgaard"],eaId:"266123",ovr:77,position:"CB",stats:[75,43,62,66,74,85],fallback:{face:"./assets/footera/totw/6/266123.png",gender:"male",name:"Oliver Provstgaard",fullName:"Oliver Provstgaard",team:"Lazio",league:"Serie A",nation:"Denmark"}},
  {names:["Waldemar Anton"],eaId:"229476",ovr:84,position:"CB",stats:[71,48,69,68,86,86],fallback:{face:"./assets/footera/totw/6/229476.png",gender:"male",name:"Waldemar Anton",fullName:"Waldemar Anton",team:"Borussia Dortmund",league:"Bundesliga",nation:"Germany"}},
  {names:["Miro Muheim"],eaId:"232839",ovr:80,position:"LB",stats:[77,70,77,77,75,77],fallback:{face:"./assets/footera/totw/6/232839.png",gender:"male",name:"Miro Muheim",fullName:"Miro Muheim",team:"Hamburger SV",league:"Bundesliga",nation:"Switzerland"}},
  {names:["Timothy Weah","Tim Weah"],eaId:"241496",ovr:81,position:"RB",stats:[91,79,76,82,72,69],fallback:{face:"./assets/footera/totw/6/241496.png",gender:"male",name:"Timothy Weah",fullName:"Timothy Weah",team:"Olympique de Marseille",league:"Ligue 1",nation:"United States"}},
  {names:["Diego Gómez","Diego Gomez"],eaId:"269278",ovr:81,position:"CM",stats:[76,74,78,82,79,82],fallback:{face:"./assets/footera/totw/6/269278.png",gender:"male",name:"Diego Gómez",fullName:"Diego Gómez",team:"Brighton & Hove Albion",league:"Premier League",nation:"Paraguay"}},
  {names:["Nico Paz","Nicolás Paz Martínez", "Nicolas Paz"],eaId:"277846",ovr:84,position:"CAM",stats:[82,75,81,86,55,68],fallback:{face:"./assets/footera/totw/6/277846.png",gender:"male",name:"Nico Paz",fullName:"Nicolás Paz Martínez",team:"Como",league:"Serie A",nation:"Argentina"}},
  {names:["Ibrahim Maza"],eaId:"275029",ovr:79,position:"CAM",stats:[82,73,73,86,43,69],fallback:{face:"./assets/footera/totw/6/275029.png",gender:"male",name:"Ibrahim Maza",fullName:"Ibrahim Maza",team:"Bayer 04 Leverkusen",league:"Bundesliga",nation:"Algeria"}},
  {names:["Álex Baena","Alex Baena", "Alejandro Baena Rodríguez"],eaId:"257279",ovr:88,position:"LM",stats:[82,84,90,89,67,73],fallback:{face:"./assets/footera/totw/6/257279.png",gender:"male",name:"Álex Baena",fullName:"Alejandro Baena Rodríguez",team:"Atlético de Madrid",league:"LALIGA EA SPORTS",nation:"Spain"}},
  {names:["Adrien Rabiot"],eaId:"210008",ovr:85,position:"CM",stats:[83,81,83,82,79,86],fallback:{face:"./assets/footera/totw/6/210008.png",gender:"male",name:"Adrien Rabiot",fullName:"Adrien Rabiot",team:"AC Milan",league:"Serie A",nation:"France"}},
  {names:["Alexander Prass"],eaId:"263041",ovr:79,position:"LM",stats:[78,69,78,79,73,78],fallback:{face:"./assets/footera/totw/6/263041.png",gender:"male",name:"Alexander Prass",fullName:"Alexander Prass",team:"TSG Hoffenheim",league:"Bundesliga",nation:"Austria"}},
  {names:["Luis Díaz","Luis Diaz", "Luis Fernando Díaz Marulanda"],eaId:"241084",ovr:89,position:"LW",stats:[92,85,80,91,47,79],fallback:{face:"./assets/footera/totw/6/241084.png",gender:"male",name:"Luis Díaz",fullName:"Luis Díaz",team:"FC Bayern München",league:"Bundesliga",nation:"Colombia"}},
  {names:["Kylian Mbappé","Kylian Mbappe"],eaId:"231747",ovr:93,position:"ST",stats:[99,92,83,94,38,78],fallback:{face:"./assets/footera/totw/6/231747.png",gender:"male",name:"Kylian Mbappé",fullName:"Kylian Mbappé Lottin",team:"Real Madrid",league:"LALIGA EA SPORTS",nation:"France"}},
  {names:["Lamine Yamal","Lamine Yamal Nasraoui Ebana"],eaId:"277643",ovr:92,position:"RW",stats:[90,89,91,96,41,65],fallback:{face:"./assets/footera/totw/6/277643.png",gender:"male",name:"Lamine Yamal",fullName:"Lamine Yamal Nasraoui Ebana",team:"FC Barcelona",league:"LALIGA EA SPORTS",nation:"Spain"}},
  {names:["Erling Haaland","Erling Braut Haaland"],eaId:"239085",ovr:93,position:"ST",stats:[89,95,74,83,49,92],fallback:{face:"./assets/footera/totw/6/239085.png",gender:"male",name:"Erling Haaland",fullName:"Erling Braut Haaland",team:"Manchester City",league:"Premier League",nation:"Norway"}},
  {names:["Pedro Neto","Pedro Lomba Neto"],eaId:"238616",ovr:84,position:"RW",stats:[95,80,78,86,42,72],fallback:{face:"./assets/footera/totw/6/238616.png",gender:"male",name:"Pedro Neto",fullName:"Pedro Lomba Neto",team:"Chelsea",league:"Premier League",nation:"Portugal"}}
]};
const TOTW_WEEKS=[TOTW_WEEK_1,TOTW_WEEK_2,TOTW_WEEK_3,TOTW_WEEK_4,TOTW_WEEK_5,TOTW_WEEK_6];

function totwAddCalendarDays(isoDate,days){
 const [y,m,d]=String(isoDate||"").split("-").map(Number);
 const dt=new Date(Date.UTC(y,m-1,d));dt.setUTCDate(dt.getUTCDate()+Number(days||0));
 return dt.toISOString().slice(0,10)
}
function berlinMinuteKey(at=new Date()){
 const p=berlinParts(at),pad=n=>String(n).padStart(2,"0");
 return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}
function totwStartKey(team){return `${team.releaseDate}T19:00`}
function totwEndKey(team){return `${totwAddCalendarDays(team.releaseDate,7)}T18:59`}
function totwRosterErrors(team){
 const rows=Array.isArray(team?.players)?team.players:[],errors=[],counts={GK:0,DEF:0,MID:0,ATT:0},clubs=new Map(),names=new Set();
 const key=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/\s+/g," ");
 if(rows.length!==18)errors.push("Genau 18 Spieler erforderlich");
 for(const player of rows){
  const name=key(player.names?.[0]),club=key(player.fallback?.team),position=String(player.position||"").toUpperCase();
  if(!name||names.has(name))errors.push("Spielername fehlt oder ist doppelt");names.add(name);
  if(!club)errors.push("Vereinszuordnung fehlt");else clubs.set(club,(clubs.get(club)||0)+1);
  if(player.fallback?.gender!=="male")errors.push("Männer-Kader erforderlich");
  const group=position==="GK"?"GK":["CB","LB","RB","LWB","RWB"].includes(position)?"DEF":["CDM","CM","CAM","LM","RM"].includes(position)?"MID":["ST","CF","LW","RW"].includes(position)?"ATT":null;
  if(group)counts[group]++;else errors.push("Ungültige Position");
  if(!Number.isFinite(player.ovr)||player.ovr<75||player.ovr>95||!Array.isArray(player.stats)||player.stats.length!==6||player.stats.some(v=>!Number.isFinite(v)||v<0||v>99))errors.push("Ungültiges Rating oder Attribute");
 }
 if(counts.GK!==2||counts.DEF!==5||counts.MID!==6||counts.ATT!==5)errors.push("Positionsverteilung muss 2 TW / 5 DEF / 6 MID / 5 ANG sein");
 if([...clubs.values()].some(count=>count>1))errors.push("Maximal ein Spieler pro Verein");
 // From TOTW 6 on, nobody may appear in two consecutive weeks.
 const previous=Number(team?.id)>=6?TOTW_WEEKS.find(week=>Number(week.id)===Number(team.id)-1):null;
 if(previous){const before=new Set(previous.players.flatMap(p=>[String(p.eaId||""),key(p.names?.[0])]).filter(Boolean));if(rows.some(p=>before.has(String(p.eaId||""))||before.has(key(p.names?.[0]))))errors.push("Kein Spieler zwei Wochen hintereinander")}
 return [...new Set(errors)]
}
function totwReleaseApproved(team){
 // Preserve the three already-published legacy weeks; every new week needs explicit approval.
 if(!team)return false;
 if(!team.sourceStatus&&[1,2,3].includes(Number(team.id)))return true;
 return team.sourceStatus==="admin-approved"&&(Number(team.id)<5||totwRosterErrors(team).length===0)
}
function activeTotwWeek(at=new Date()){
 const key=berlinMinuteKey(at);
 return [...TOTW_WEEKS].reverse().find(team=>totwReleaseApproved(team)&&key>=totwStartKey(team)&&key<=totwEndKey(team))||null
}
function latestPublishedTotw(at=new Date()){
 const key=berlinMinuteKey(at);
 return [...TOTW_WEEKS].reverse().find(team=>totwReleaseApproved(team)&&key>=totwStartKey(team))||null
}
let LIVE_TOTW=activeTotwWeek()||latestPublishedTotw()||TOTW_WEEK_2;
// FC 27 Base Icon snapshot (29.09.2026): https://www.fut.gg/api/fut/players/v2/27/?rarity_id=12&count=200
// [Name, GES, Hauptposition, Nebenpositionen, Nation, EA-ID, TEM/SCH/PAS/DRI/DEF/PHY, TW-Werte, Skills, schwacher Fuß, Fuß, Porträt]
const MID_ICON_DATA=[
 ["Ronaldo",94,"ST","","Brazil",37576,[94,94,79,94,43,75],[],5,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-37576.e424bc48d9b4cfb981cb0e59a5db2de4dc4997a7de39c13ab42ec368e7528c4c.webp"],
 ["Mia Hamm",93,"ST","CAM,RW","United States",275243,[92,93,86,92,54,81],[],5,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-275243.1f187b0aa4e6ee979b40cc4094f69186a378fef1c09a41a9a42019296d42a9b3.webp"],
 ["Pelé",95,"CAM","ST","Brazil",237067,[93,94,91,94,58,74],[],5,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-237067.a37bb1cbac66a239077bf243e91af34139467083b7457b4333f6997f4e6891f8.webp"],
 ["Franz Beckenbauer",93,"CB","CDM,CM","Germany",168473,[82,73,88,84,93,83],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-168473.524f711cc8172e7c3ba833fa0ab2e78c0c194957b43e73e70f2d2b83d50298e2.webp"],
 ["Eusébio",91,"ST","","Portugal",242519,[92,92,84,91,44,77],[],4,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-242519.69ad96cb5d735ff0dac97cb0de8f67ea4a826ebcecdbb845b0044a0265b5bee6.webp"],
 ["Lothar Matthäus",90,"CM","CB,CDM","Germany",238435,[88,87,88,81,89,82],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-238435.3c49eac48e0bf251cc1d5a91c5dc415795cc251ca60745cb2ac54737aea3ef66.webp"],
 ["Zinedine Zidane",94,"CAM","CM","France",1397,[83,90,94,94,73,84],[],5,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-1397.03f942703887672e3f2bcff80fea96e90a34a6b59ec2c12e5eb09e60dedc3c02.webp"],
 ["Ruud Gullit",91,"CAM","CB,CDM,CM,ST","Netherlands",214100,[86,88,89,87,80,88],[],4,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-214100.90076e0e1171d15fd4ee9a1e13208e6c2622e0b5e13a93b79cfb672924f99a48.webp"],
 ["Formiga",90,"CDM","CM","Brazil",226895,[82,78,85,85,90,86],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-226895.23f1bde218f013a388b666cd2315124d2ec5a0c2ec6c173cc46d27ba0104facf.webp"],
 ["Thierry Henry",91,"ST","LM,LW","France",1625,[93,90,84,90,51,78],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-1625.edc1e6d7a2fe695ae4cdffe0adb79c234f673eac252d5854a023201cf7dab0ed.webp"],
 ["Ferenc Puskás",92,"ST","","Hungary",254642,[90,94,89,91,45,74],[],4,3,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-254642.300c357930e24e94382eb7a0af59db050a1f60892589a6740b31b7694fa27cd3.webp"],
 ["Alex Morgan",91,"ST","","United States",226301,[93,90,80,90,48,77],[],4,4,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-226301.1df9c0080bcada388aab613ba77252563ff8d265a6e9ea4f8be5d10cde86a49d.webp"],
 ["Bobby Charlton",92,"CAM","CM,LM,LW","England",230025,[90,91,87,91,50,74],[],4,5,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-230025.a3aa9869e6e5d4f43d6e1640302d3a3fd13f68415db7211efa6134fe803e3360.webp"],
 ["Johan Cruyff",93,"CAM","ST","Netherlands",190045,[90,91,90,94,42,73],[],5,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-190045.4e0618f047752d99c9c1e5fcf64f236adcf4e50ab6279cf8c8fef30e4d0c9e23.webp"],
 ["Paolo Maldini",93,"CB","LB","Italy",238439,[85,55,75,72,95,84],[],2,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-238439.deee938450e401653df9de15f7c8aa4ed93d741254983b17c26eacc3226a8723.webp"],
 ["Diego Armando Maradona",95,"CAM","ST","Argentina",190042,[90,91,91,96,40,77],[],5,3,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-190042.1c49824ecbc43eaa9a07dbcf543c138f5b6f80707ebd08ff6fc42c435931b498.webp"],
 ["Kenny Dalglish",90,"ST","CAM","Scotland",247699,[89,90,83,89,41,73],[],4,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-247699.57e03692aa3112826beffe9ef6655a48042542abe565fbabf30df0f803d382ca.webp"],
 ["Homare Sawa",91,"CM","CAM","Japan",227006,[84,87,91,91,83,76],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-227006.5f13b02e397d282371293dbad83a201834a53d74e108de7206282a39acd56743.webp"],
 ["Jairzinho",89,"RW","RM,ST","Brazil",268513,[91,89,84,90,49,73],[],5,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-268513.0fa0b15f8e8a42edf8db050ed5f86d357f5c4da8a82d319fb9230f6b81398e63.webp"],
 ["Zico",91,"CAM","CM","Brazil",166691,[89,92,91,91,62,71],[],5,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-166691.1180669ac770ffedb68edb5bfae0c8904bebbdbd090d425c3eef9a71ba9ed36a.webp"],
 ["Garrincha",93,"RW","RM","Brazil",247553,[90,87,92,95,40,66],[],5,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-247553.411a3712dd991aa90efff771e935188ce2b7952b4008b8c384a39017696a9a61.webp"],
 ["Gareth Bale",88,"RW","RM,LM,ST,LW","Wales",71557,[95,89,84,89,65,79],[],4,3,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-71557.e57b3eb429c97c1626c64a059dcfdf69c2ebfcbbc4dc08b23d875b93393dd8fd.webp"],
 ["Ronaldinho",93,"LW","LM,CAM","Brazil",28130,[91,89,90,95,38,80],[],5,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-28130.85c0fd50a7f4c5d7c541ed4d762145d03de0bb7230123fbb757eef183e8f5051.webp"],
 ["Carlos Alberto",91,"RB","CB","Brazil",167135,[89,64,82,84,88,85],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-167135.9dc4cc6a18745b2cae3cc19da24ba3d731674d5075b8bb93b9968c6295bed658.webp"],
 ["Gianluigi Buffon",92,"GK","","Italy",1179,[50,26,36,36,19,60],[95,88,79,94,51,90],1,2,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-1179.0dccb90212db95b45c4bfa9f2baa6cfa75245e3f787f3549c01000a1b9b42b72.webp"],
 ["Lilian Thuram",89,"RB","CB","France",1615,[88,58,76,75,90,90],[],3,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-1615.42febb5b6416a11d20a7a872f6b1f94088caef5b06b8aca8ccd54b47a8cbedfe.webp"],
 ["Yaya Touré",88,"CM","CDM,CAM","Ivory Coast",20289,[80,85,89,84,81,90],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-20289.f658edc4837a795680c79bdea022ec64b30a79d1ca45a8221a62a1e964add631.webp"],
 ["Samuel Eto'o",89,"ST","","Cameroon",9676,[92,90,79,87,45,80],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-9676.b61fab8c27ce7c54fd6d24a3a3ac54ec18e48eeee5dfc8bd5e4ddd08192f916e.webp"],
 ["Karl-Heinz Rummenigge",90,"ST","LM,LW","Germany",243075,[90,91,80,92,56,78],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-243075.9d4599e2ad394fed00092d77af376028c3ae1ac8d5521ed0ba45d4f109623b0f.webp"],
 ["Kaká",90,"CAM","","Brazil",138449,[90,85,87,90,43,71],[],5,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-138449.01eafc695aa95352ca37d1a53c61099009d3a73f4a8c16dcf3dd33ea00f1545e.webp"],
 ["Sergio Agüero",89,"ST","","Argentina",153079,[88,90,78,89,33,74],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-153079.720cae9b705d1395e7ddb497f43d92c466fa47a6eb10ffa4b7ba8d3c980362a5.webp"],
 ["George Best",90,"RW","RM,LM,CAM,LW","Northern Ireland",226764,[91,89,82,92,56,69],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-226764.5f06b06e6c2054e84a6aa5c38b3e2fc835afe1aca82901d4efa92f61b5f33292.webp"],
 ["Zlatan Ibrahimović",91,"ST","","Sweden",41236,[84,93,82,90,46,89],[],5,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-41236.726bc95e768e09410ea2d58cd2b9af5027e8ac2dfdb99f8c96e3e683c17bc66a.webp"],
 ["Lotta Schelin",90,"ST","LM,LW","Sweden",226369,[91,89,82,89,46,82],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-226369.5360abbe489182520b666edd7f9e806da27707a4cca3fa5250bba7e0c4ae031e.webp"],
 ["Francesco Totti",89,"ST","CAM","Italy",1238,[85,91,89,90,40,75],[],4,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-1238.6001f10cc408505920dd5c2bb650db87ac7e9fdddfb021261d12428a34f7e78d.webp"],
 ["Iniesta",92,"CM","LM,CAM,LW","Spain",41,[83,80,91,92,62,68],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-41.e215f1bbee0057a1b4651b74b48085c040fcd684f704fb330c2dbff4511f9809.webp"],
 ["Gerd Müller",92,"ST","","Germany",190048,[87,92,76,85,44,74],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-190048.9b8805f0a7070220c3de064cd525071462c3e42353a20bd6b6ffb9c69c152aaf.webp"],
 ["Petr Čech",88,"GK","","Czech Republic",48940,[54,22,37,33,22,60],[86,85,76,88,54,90],1,3,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-48940.a8361a8bb110509b640553fe05acc7aaf04fbdf76ee596fc19c03dafe2724510.webp"],
 ["Rio Ferdinand",89,"CB","","England",7289,[84,48,65,65,90,86],[],3,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-7289.499f827e546a536b60ee88c61c81b502d906fe603e013fddd77ba87a13e087e4.webp"],
 ["Alessandro Del Piero",90,"CAM","ST","Italy",238382,[83,90,87,91,41,69],[],4,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-238382.cf341725913e805ee45e35652d56860a5c3e71266030f4cfc4e4bf0ba488d280.webp"],
 ["Patrick Vieira",88,"CM","CDM","France",238427,[82,78,80,83,88,90],[],3,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-238427.420d51d597ae2c51e52c95346bf491a462d2d3b0a8db900d2f4c7246b7f7f433.webp"],
 ["Emilio Butragueño",89,"ST","","Spain",191695,[92,89,78,90,40,66],[],3,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-191695.e8c34df6c59cd49a3eedbf9773cc0efa623f9845b123578cd1e80f95873fcfc9.webp"],
 ["Raúl",90,"ST","CAM","Spain",45661,[86,90,80,88,45,72],[],4,4,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-45661.6b9106b03464869f45a32e25475cd817c983fff68692e57784a9f97287b48e45.webp"],
 ["Oliver Kahn",91,"GK","","Germany",488,[58,20,33,30,16,68],[93,86,70,95,57,89],1,2,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-488.8c8112ceabf5d66f2aef91c6717b01a9638100940bb2fbf799b6c8e96d0dbe12.webp"],
 ["Christine Sinclair",92,"ST","CAM","Canada",226359,[83,93,86,90,54,85],[],4,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-226359.1ad4350ae28ee884ba6feb7c308b525eaaa50bbe5e60b9cfe7cd4c8ae58e117d.webp"],
 ["Fernando Torres",88,"ST","","Spain",49369,[90,87,76,87,43,75],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-49369.14c1bdb34fe8ffb8c0e3db1e1c47b41cb04fc2750cc640f3bc6df4c6dd58b4fd.webp"],
 ["Raphaël Varane",88,"CB","","France",201535,[84,49,66,74,88,83],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-201535.f69c24cf50dfae2d716848d9562b566e26ce995986cc7eb07406d1dbd4e04613.webp"],
 ["Rivellino",90,"CAM","LM,LW","Brazil",191190,[87,88,90,93,46,72],[],5,4,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-191190.895e6e158de3e7b27532b079ab4defc02ea8f5a89337afcf9ddf4e4a153380d6.webp"],
 ["Wayne Rooney",90,"ST","CAM","England",54050,[89,91,84,88,59,88],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-54050.b438e71141ab78f3364ea1b35e8cc77fa5f91c124543166f5494a4e4099e332e.webp"],
 ["Hege Riise",90,"CM","CDM,CAM","Norway",84415,[83,82,88,90,78,73],[],4,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-84415.a7913ce9d84301bd2fa15edc9542aeca50e0cd40c7c186ab169ed679a864c555.webp"],
 ["Caroline Seger",90,"CM","CDM","Sweden",226975,[78,79,90,86,85,80],[],4,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-226975.1cadfd5b5d001a94679607407c5569cf27e35c57666544ed468b40798e27a430.webp"],
 ["Ashley Cole",88,"LB","","England",34079,[88,65,79,80,86,80],[],3,2,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-34079.033d057f65c88e0eda4645781885c98b6fed09cf4a0ba82263f88024e93c0c97.webp"],
 ["Hristo Stoichkov",89,"ST","RW,LW","Bulgaria",4833,[90,91,84,90,49,84],[],4,3,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-4833.78699760531f36c7ba1ccf38ab102c800611c6157900a172f290ab433d71d9d5.webp"],
 ["Julie Foudy",90,"CM","CDM","United States",71608,[80,84,88,87,76,81],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-71608.92d8ec17762af12b5af5b67a85bc8eb917a4bd7140fd3a169ad0ecbf488ae8be.webp"],
 ["Roberto Baggio",91,"CAM","ST","Italy",1114,[85,86,90,91,38,65],[],5,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-1114.739789f73e38c61a7b6393039ba9f595dcb51720e07253cc3d38e49cb8d986c2.webp"],
 ["Eric Cantona",89,"ST","","France",167198,[86,89,86,89,50,88],[],5,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-167198.7d08fe659ffcfff624cb603951e1a15bbc340784a686edd4fdb37fa8c12aac7e.webp"],
 ["Sócrates",89,"CAM","CM","Brazil",190046,[82,88,89,89,43,82],[],4,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-190046.295ffcb5b4117e312ab5089f46f52c34c74fb29c94b0c384e1cb7c0a2ae497c3.webp"],
 ["Casillas",90,"GK","","Spain",5479,[58,36,51,40,24,57],[90,88,84,93,59,88],1,3,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-5479.1a344fef946061eb1467a6a1d23d4920e6fe617f445e13ad2172d4c3e23a6402.webp"],
 ["Marinette Pichon",88,"ST","","France",71587,[85,89,80,88,44,75],[],4,4,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-71587.71de8705a21fd5599298019b1dff601fbe885dd1151943757c8c12ed0aa42924.webp"],
 ["Frank Lampard",89,"CM","CDM,CAM","England",5471,[78,91,88,86,75,81],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-5471.70a37049d4a554b5a53e8d0f9ccae76d479ca25c42d946798eaa8875c3c77d00.webp"],
 ["Tobin Heath",90,"RW","RM,LM,LW","United States",226330,[88,84,87,93,55,73],[],5,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-226330.7efa29976da0d59cd818cd48344fd13252975c7ef3ea4c3930a2b3540ab19ce4.webp"],
 ["Cafu",91,"RB","RM","Brazil",5003,[90,56,84,85,88,83],[],4,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-5003.d6a198719439354c5ad0a5f3fc299cada1323f2d620b7f10094d3350f198b576.webp"],
 ["Kelly Smith",89,"ST","CAM","England",227263,[88,90,84,89,46,77],[],4,4,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-227263.6a26169139f90131a8e880df9571d7092b88394023558841890e06cca0bf5e92.webp"],
 ["Michaël Essien",88,"CDM","CM","Ghana",45674,[82,73,77,79,86,89],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-45674.7a28aac1b346661ae4a46a2827cb04f8ca871e171d9b2237094bb9a6a0544dc3.webp"],
 ["Cha Bum Kun",88,"ST","RM,RW","Korea Republic",191208,[88,87,78,86,60,83],[],4,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-191208.27ad1174a64fdbdbf7fe99897201738023f00f23d1e930fbb65f7729e645605c.webp"],
 ["Franck Ribéry",88,"LM","LW","France",156616,[89,85,85,90,37,67],[],5,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-156616.9bba3371ff90c589ff892e1f8e665310ba9a9e900fea824ae55ad031444a3a0e.webp"],
 ["Michael Owen",88,"ST","","England",5419,[89,88,69,87,35,68],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-5419.fcda76bd902771806e4c7092efb3f10a0d1b1d38003890e0d3553fb18ec52741.webp"],
 ["Aya Miyama",90,"LM","CM,CAM,LW","Japan",227002,[84,86,88,90,60,70],[],4,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-227002.4b246ee2939c1178c536e03280233a297c6fa89fb54515e6e1b2b36a8672bcf9.webp"],
 ["Dennis Bergkamp",90,"ST","CAM","Netherlands",238388,[83,89,85,89,35,76],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-238388.91d80991517f6b5fdf1df22cd1431f0f6b0e5a1315945855bd820ddcaacb70b7.webp"],
 ["Luís Figo",90,"RW","RM,CAM","Portugal",5589,[89,84,88,91,38,77],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-5589.ba1e4e44cf974c2c30887d3cf35b09c7b7f5c855c618e313f6fdc47aea722751.webp"],
 ["Peter Schmeichel",89,"GK","","Denmark",238428,[46,38,40,39,26,70],[89,84,86,91,47,87],1,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-238428.c19199fdae90cf634eeb566ea3ddea9bfa30277f754355254244f82c4b668af9.webp"],
 ["Claude Makélélé",88,"CDM","RM,CM","France",1668,[81,48,76,78,88,87],[],3,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-1668.55fdcde7e65df7eee754f7740c36e8f875412f2c77be345b426ebf25624131f2.webp"],
 ["Ian Wright",88,"ST","","England",248146,[89,89,70,83,40,76],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-248146.bcf2560405af286eb3a798f48d45675c6efe9b6624bf6ad26e4cc9b44c784d83.webp"],
 ["Xavi",91,"CM","CDM,CAM","Spain",10535,[80,78,92,91,69,70],[],4,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-10535.d6e7976c0ac4b35a4044c299a75d47a4e714fe24d3b8012822bf308a0ea7fba0.webp"],
 ["Philipp Lahm",89,"RB","LB,CDM","Germany",121939,[84,68,85,83,86,74],[],3,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-121939.bfd72017f6fcc22ca275fa12d7a46494bba8616be4cefe32eebc26c1197e5b57.webp"],
 ["Paul Scholes",89,"CM","CDM,CAM","England",246,[79,85,90,88,68,80],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-246.1bc672205b11ba6775cf95ea349d1ab3480dd6b5dc7021d760ec0059ad2a1416.webp"],
 ["John Barnes",88,"LW","LM,CAM","England",247515,[89,85,83,90,44,83],[],4,4,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-247515.d9821a64f606b7fd3a55e098747c609c20f84ddd2b7dc23fff1b5b8345f2987c.webp"],
 ["Roy Keane",89,"CM","CDM","Republic of Ireland",240,[78,74,82,83,88,88],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-240.111edf458a785d497713a9dfdc96c357c0e3b12d18391095344d072df80e59e2.webp"],
 ["Yuki Nagasato",88,"CAM","RM,RW,ST","Japan",267275,[83,88,84,89,47,78],[],4,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-267275.dc2c3e3b32b997c9c157f10c372224ac4541e3133b21be56ef5b231c47a09f05.webp"],
 ["Camille Abily",90,"CM","CAM","France",227324,[82,89,90,89,80,78],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-227324.bb27ed230b0b46d984765290fe8b4a256330892152e4a74d716d797681cb35dd.webp"],
 ["Andriy Shevchenko",89,"ST","RW","Ukraine",13128,[87,90,72,86,35,75],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-13128.ce9e052158c200597f18107ec149209a7d928329a549e600631ad7cad834e4ca.webp"],
 ["Edwin van der Sar",88,"GK","","Netherlands",51539,[38,18,39,27,13,58],[84,87,79,86,39,92],1,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-51539.604a4cc543e2d0857238f572d3e201ebd7357db70f278a579edc84f5eba4ab22.webp"],
 ["Marco van Basten",91,"ST","","Netherlands",192181,[85,93,76,89,37,74],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-192181.2d57062a6927c46b8823557f3cc03d141ca03ae57deefc45fcb96e6243f215ef.webp"],
 ["Giorgio Chiellini",88,"CB","","Italy",138956,[78,55,62,64,92,89],[],2,3,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-138956.59911b82d5a65d85a7aa93d31bfb5ffdf259ac3e45d7fcf5ca47b51c470a0e88.webp"],
 ["Laurent Blanc",88,"CB","CDM,CM,CAM","France",238443,[78,75,75,79,90,85],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-238443.2a71b0fc76abe1a13f2c4f45bcdff9f45ee4592cb8ea6099aeb9abc522d8a5be.webp"],
 ["Didier Drogba",89,"ST","","Ivory Coast",31432,[87,90,74,81,44,90],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-31432.65a0ccc5b48e59e9d80c24a8b1136eb90bf1812b41423f0d28a4d252351a9b8e.webp"],
 ["Frank Rijkaard",88,"CDM","CB,CM","Netherlands",214098,[77,76,80,80,87,87],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-214098.e798e52d98e20072010f41759751ec06d9846faebaeb8ae852ae42757d5bff3c.webp"],
 ["Robin van Persie",88,"ST","","Netherlands",262112,[84,91,84,88,45,73],[],4,4,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-262112.31fd790a0c8bdde2edd9c72d9ed62c06831315917aa3cf834e996e22f92bf69c.webp"],
 ["Ronald Koeman",89,"CB","CDM","Netherlands",167680,[78,86,86,79,89,85],[],3,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-167680.4b0204e354d09b92febb544333224edc14fcb4e283b2c989b86c6437a5ba419a.webp"],
 ["Marcelo",89,"LB","","Brazil",176676,[87,72,87,89,83,76],[],5,4,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-176676.a7b90c0cf90b689af553b38981dc5feb81d4f9baa94ac87ec723fab4b31178fa.webp"],
 ["Michael Laudrup",88,"CAM","LM,LW","Denmark",222000,[84,82,89,90,40,64],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-222000.48b132aaab8d41c35ccea5a7f30e4696426ea12bbdda5e89c7971bc0b635099d.webp"],
 ["Mario Kempes",88,"ST","LM,CAM,LW","Argentina",82094,[86,91,77,86,47,82],[],3,4,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-82094.a241f013ab9d324be07516d3a3f0b991dd49b59e2a62b92f36b7ce6a3630c912.webp"],
 ["Gianluca Zambrotta",88,"RB","LB,RM,LM","Italy",250890,[88,69,81,82,85,82],[],4,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-250890.0a84fa395e70349684e77d23a729c758654dfa280b853e59309154431687d077.webp"],
 ["Javier Zanetti",89,"RB","LB,CDM,RM,CM,LM","Argentina",1041,[83,60,85,81,86,83],[],2,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-1041.22b820d0db0254483f151ff4fe9894870a6ebd086908ac664b4a939d2f9f0852.webp"],
 ["Hugo Sánchez",89,"ST","","Mexico",166149,[89,90,78,89,41,73],[],3,4,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-166149.df9e65e0a2913f84be238804165d0523ee4c7a9cd194c2b84b92f2425b5ba598.webp"],
 ["Lúcio",89,"CB","","Brazil",266690,[82,72,74,78,91,89],[],3,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-266690.008caffe7f1aef8b7bcc29498625e599934d0e9ffcef45e78de6abe4d8d292f6.webp"],
 ["Dunga",88,"CDM","CM","Brazil",192190,[76,77,82,82,87,85],[],3,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-192190.5f6f8ec763cf460e37b1465d3abc5c0eb5cb1f5864c5ca46d706455ee5e52213.webp"],
 ["Marcel Desailly",89,"CB","CDM","France",1116,[82,51,65,67,89,89],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-1116.a2c329435a73a0a0d5575c45611b3b65680c0b53422261c9ea72882659a2b701.webp"],
 ["Steven Gerrard",89,"CM","CDM,CAM","England",13743,[80,88,89,86,78,83],[],3,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-13743.4c4b2828019bc10f64a04847e530fc204cd673f7c61384a752b30f41c6dfff37.webp"],
 ["Bastian Schweinsteiger",88,"CM","CDM,RM,LM","Germany",121944,[78,83,86,83,83,83],[],3,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-121944.e1066281ceb2ae476c78a1c43ce23272bbd0dc89fe4141071a6cb9d234e395b0.webp"],
 ["Steffi Jones",89,"CB","","Germany",77676,[80,59,74,70,91,86],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-77676.f497c60f9e62f56b0376790e7a7056a63cbebf576b5565c91bcf6855e02b5499.webp"],
 ["Nadine Angerer",92,"GK","","Germany",226293,[58,22,34,31,24,60],[92,88,79,94,59,92],1,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-226293.4d1293de386f2c1ea0dc8921bb61be9bc3630307356bf7dce5c231f98635cb08.webp"],
 ["Roberto Carlos",90,"LB","LM","Brazil",238430,[91,83,83,81,85,86],[],3,2,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-238430.6d295322ddd6cb72916747334eeb82c93ebf4ad550f5f9e3fee8b1f519e84800.webp"],
 ["Ellen White",88,"ST","","England",227270,[88,88,73,85,55,83],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-227270.763033f04f8973462c8d03d4a65b54b55ab163ee989a433e26048151e3ae5398.webp"],
 ["Pavel Nedvěd",89,"LM","CAM,LW","Czech Republic",6235,[86,86,87,88,58,77],[],4,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-6235.186a596a0042fccc20e54c830491831497bf74fab339a5c48e7371d837a25d13.webp"],
 ["Pepe",89,"CB","","Portugal",120533,[78,51,61,65,90,89],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-120533.9dc5c9a968fdb12094fe3dad332eda7363337fa4dd48848019927eea840cb106.webp"],
 ["Jean-Pierre Papin",89,"ST","","France",167134,[83,93,73,83,44,76],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-167134.2e410352d2dfb7c08269ff146a4c3f35b9fab48053e8aed37ccb94f820e6fbf9.webp"],
 ["Sissi",88,"CAM","","Brazil",77790,[84,89,88,87,41,69],[],4,3,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-77790.6a390af95420f42ca4f4fe4f1bc466a7b5ed0aaeff032fc0f58b749a7aab8de9.webp"],
 ["Gheorghe Hagi",88,"CAM","CM,LM,LW","Romania",166124,[83,87,88,88,41,68],[],4,4,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-166124.7ecc8cdc3c5b188aa49f7d06721932b608f6ff9a999ffa1d09d2547cfa4fcda2.webp"],
 ["Sol Campbell",88,"CB","","England",243029,[81,45,60,61,89,89],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-243029.fa3fac3ac86f9278c12548cfd7cba0ef8ce85a953d11c6fc66c857979033054b.webp"],
 ["Emmanuel Petit",88,"CDM","LB,CM","France",1620,[77,77,79,77,85,87],[],3,3,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-1620.0c5ac286931721e39fd97b390f35ba4c1c05fd37f3b474c75d64a25836384534.webp"],
 ["Xabi Alonso",88,"CDM","CM","Spain",45197,[74,77,86,81,83,80],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-45197.820edf5805fe00607c3f9b93e6075320ca95b2830731d2a15701cc201ddd5e5c.webp"],
 ["Rivaldo",90,"LW","LM,CAM","Brazil",4231,[87,88,87,91,42,75],[],4,3,"Left","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-4231.908fcf91947b5d1b98052bd517121fe46ba16ea426db544f865d6a155a3831b0.webp"],
 ["Birgit Prinz",92,"ST","","Germany",275276,[84,92,80,85,52,88],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-275276.c628eee1d00a01e50acc12b99a23d7e196cd704e95d3264e21367f0913ee85d1.webp"],
 ["Andrea Pirlo",90,"CM","CDM","Italy",7763,[75,79,93,89,69,68],[],5,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-7763.960d7f42b4b7f5ae5d0b84297213aa136e05346f7de630620b54abcaa7cb1891.webp"],
 ["Alessandro Nesta",89,"CB","","Italy",1088,[76,44,63,70,92,85],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-1088.4b0f0cb0b5185e137ae329c593dad4b054351c2e55d0c9fbb9ee829bd485c296.webp"],
 ["Hernán Crespo",88,"ST","","Argentina",7512,[88,88,71,87,36,71],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-7512.6cdb6d8d92db6a9c3b82c7aefe494371e05d576053aa0bb83c26f4312f908956.webp"],
 ["Toni Kroos",90,"CM","CDM,CAM","Germany",182521,[74,82,91,86,76,74],[],3,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-182521.1bb8b3bf6b9d30600d12006e45848a9f41023f292e637eed3b9598d986ab7a94.webp"],
 ["Bobby Moore",90,"CB","","England",190044,[74,62,81,76,92,83],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-190044.1b77499f96b2d3b4a71eef0e6116fe2bbe8f1b65df36026ab7803095854761ad.webp"],
 ["Gary Lineker",89,"ST","","England",214267,[86,89,71,84,40,75],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-214267.06d71796d62df52a82b490f0a795c37602f566c2e96d400d37e8d1d10dc22cfb.webp"],
 ["Franco Baresi",91,"CB","","Italy",166906,[75,48,75,74,94,83],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-166906.32d2d2936606b73f6b13c4efc7b1d3ce0f6add05eeacee8e62ae472d9dedceef.webp"],
 ["Robert Pirès",88,"LM","RM,CAM,RW,LW","France",1605,[86,81,86,87,38,67],[],4,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-1605.8094ef7d5cbdc61b6293ddf5edea55cc48eaff19485ea04b4c2a0d2e71b4b8d6.webp"],
 ["Geoff Hurst",88,"ST","","England",82094,[84,91,72,83,39,78],[],3,5,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-82094.b78e46351b49aa5cf28afab06320d95119b0fccb5fbf1d31138da7add4e31b84.webp"],
 ["Fabio Cannavaro",89,"CB","","Italy",1183,[80,44,62,67,93,83],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-1183.d53d8bffbb4a248c5a1737dd99f6880ae532f0cd834663de641f614f8ae6f3cb.webp"],
 ["Fernando Hierro",88,"CB","CDM","Spain",161840,[75,75,76,69,92,84],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-161840.e6c7e0ab071c392ea17f84791b3209cfbb9efa066a8ae16c3e47fc29eb4b38de.webp"],
 ["Nemanja Vidić",88,"CB","","Serbia",140601,[79,48,62,62,90,90],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-140601.4dca60d784a8a82ea5bdda022cf210ceaafd462fbb34084ff6a12bb4ceeb6a3d.webp"],
 ["Ian Rush",88,"ST","","Wales",247703,[85,90,69,85,43,79],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-247703.6dfcfb439d6d896efd60e0181d31d54724adb781307ff74abf662e151325290b.webp"],
 ["Juan Román Riquelme",88,"CAM","","Argentina",23174,[74,85,90,91,33,68],[],5,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-23174.7c38594bc1babb7eed403635bad4a77719ba371db92c80db106c4d124ec0b704.webp"],
 ["Gabriel Batistuta",89,"ST","","Argentina",221162,[86,92,74,82,38,81],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-221162.5dfbb15e2938d5d6d47d3e122f02ebc53b8636e74f4418b5f110ccfb936ae11d.webp"],
 ["Gennaro Gattuso",88,"CDM","CM","Italy",243030,[76,62,69,72,88,88],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-243030.bff9eba56321216c7011eb62740c190d8d919a697afa31067a165ee8af40c007.webp"],
 ["Alan Shearer",89,"ST","","England",51,[82,91,76,81,49,86],[],3,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-51.3449a22e8363a60b02524395029ff05366552d4bb70326c80e812f56fcf3b566.webp"],
 ["Maicon",88,"RB","RM","Brazil",135455,[86,82,81,84,83,85],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-135455.8dc403bf6fbd2b9897948121545029b48d6a2f00714f4e6ab7045f10e16c870b.webp"],
 ["Miroslav Klose",88,"ST","","Germany",242510,[86,87,73,81,40,79],[],3,4,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-242510.079f5442f7941bf6faabdc7374da6e7c169cf2cafb909ad586a7a6fb812ccc35.webp"],
 ["David Beckham",88,"RM","CM,RW","England",250,[80,86,92,85,66,80],[],3,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-250.1a31a2f783180b5ff362cd43fa582199de1182e0bcccd1ff5dfc39f378ebae93.webp"],
 ["Ruud van Nistelrooy",89,"ST","","Netherlands",10264,[84,89,71,84,38,80],[],3,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-10264.8b6f51104928943e0c3d1eb2ac867fcd427c8f9655fd78ecd9f26202b7fb39e1.webp"],
 ["Carles Puyol",89,"CB","RB","Spain",238384,[75,46,66,60,91,88],[],2,3,"Right","https://game-assets.fut.gg/cdn-cgi/image/quality=85,format=auto,width=300/2027/player-item/27-238384.fa0a603983675f3d9f8a4893c4d2973281d352c10a2899193cc3f51895383233.webp"],
];
function iconSlug(name){return normalizeKey(name).replace(/\s+/g,"-")}
const ICON_NATIONS=Object.fromEntries(MID_ICON_DATA.map(([name,,,,nation])=>[iconSlug(name),nation]));
const ICON_EA_IDS=Object.fromEntries(MID_ICON_DATA.map(([name,,,,,eaId])=>[normalizeKey(name),String(eaId)]));
function futwizVerifiedIconId(name){return ICON_EA_IDS[normalizeKey(name)]||""}
function futwizVerifiedIconFace(name){const id=futwizVerifiedIconId(name);return id?`https://cdn.futwiz.com/assets/img/fc27/faces/${id}.png`:""}
const MID_ICON_BASES=MID_ICON_DATA.map(([name,ovr,position,alt,nation,eaId,stats,gk,skillMoves,weakFoot,preferredFoot,face])=>({
 id:`midicon-${iconSlug(name)}`,name,ovr,position,alt,nation,league:"Icons",team:"ICON",face,futwizId:String(eaId),
 pac:position==="GK"?gk[0]:stats[0],sho:position==="GK"?gk[1]:stats[1],pas:position==="GK"?gk[2]:stats[2],
 dri:position==="GK"?gk[3]:stats[3],def:position==="GK"?gk[4]:stats[4],phy:position==="GK"?gk[5]:stats[5],
 skillMoves,weakFoot,preferredFoot,source:"fc27-base-icon",isIcon:true
}));
// Earlier saves used these synthetic IDs. Resolve them to the verified FC 27 cards.
const ICON_LEGACY_ALIASES={
 "midicon-diego-maradona":"Diego Armando Maradona",
 "midicon-andres-iniesta":"Iniesta",
 "midicon-iker-casillas":"Casillas",
 "midicon-cha-bum-kun":"Cha Bum Kun",
 "midicon-elise-pichon":"Marinette Pichon"
};
// Kluivert is a Hero in FC 27. Keep acquired Icon items readable, but do not generate new ones.
const RETIRED_ICON_BASE={id:"midicon-patrick-kluivert",name:"Patrick Kluivert",ovr:88,position:"ST",alt:"",nation:"Netherlands",league:"Icons",team:"ICON",face:"https://cdn.futwiz.com/assets/img/fc26/faces/238424.png",futwizId:"238424",pac:84,sho:86,pas:76,dri:81,def:40,phy:79,skillMoves:4,weakFoot:4,preferredFoot:"Right",source:"retired-icon-save",isIcon:true};
function randomMidIconBase(minRating=0){const pool=Number(minRating)>0?MID_ICON_BASES.filter(base=>Number(base.ovr||0)>=Number(minRating)):MID_ICON_BASES;return pool[Math.floor(Math.random()*pool.length)]||null}
function makeMidIconItem(base,tradeable=true){return makeItem(base,tradeable,{variant:"icon-mid",eventName:"Icon"})}
function totwSearchKeys(p){
 const names=[p?.name,p?.fullName,[p?.firstName,p?.lastName].filter(Boolean).join(" ")].filter(Boolean);
 return [...new Set(names.map(normalizeKey).filter(Boolean))]
}
function totwAliases(info){
 return [...new Set((info?.names||[]).map(normalizeKey).filter(a=>a.split(" ").filter(Boolean).length>=2&&a.split(" ").every(t=>t.length>=2)))]
}
function totwAliasMatch(p,info){
 if(!p||!info)return 0;
 if(info.eaId&&String(p.id||"")===String(info.eaId))return 100;
 const keys=new Set(totwSearchKeys(p)),aliases=totwAliases(info);
 // Some players (e.g. Isco) use one-word primary names; match only exact mononyms.
 const primary=normalizeKey(info?.names?.[0]||"");
 if(primary.length>=4&&!primary.includes(" ")&&keys.has(primary))return 100;
 return aliases.some(a=>keys.has(a))?100:0
}
function uniqueTotwPlayer(matches){
 if(matches.length===1)return matches[0];
 const ids=new Set(matches.map(p=>String(p?.id||"")).filter(Boolean));
 return ids.size===1&&matches.length?matches[0]:null
}
function totwIsActive(at=new Date()){return !!activeTotwWeek(at)}
function totwDisplayName(name){return String(name||"").replace(/^Team of the Week\b/i,"Team der Woche")}
function updateTotwMarketOption(){
 const option=$("marketSpecialType")?.querySelector('option[value="totw"]');if(!option)return;
 option.disabled=false;option.textContent="Team der Woche"
}
function totwInfo(base){
 if(!base||isActiveEventSbcBase(base))return null;const team=activeTotwWeek();if(!team)return null;
 const matches=team.players.filter(info=>!isEventSbcBlockedTotwInfo(team,info)&&totwAliasMatch(base,info)===100);
 return matches.length===1?matches[0]:null
}
function currentTotwBases(){return PLAYERS.filter(p=>!!totwInfo(p))}
const LIVE_TOTW_BASE_CACHE=new Map(),LIVE_TOTW_EA_PENDING=new Set();
function restoreSyntheticPlayerIds(){
 for(const icon of MID_ICON_BASES)P_BY_ID.set(String(icon.id),icon);
 for(const [oldId,name] of Object.entries(ICON_LEGACY_ALIASES)){
  const current=MID_ICON_BASES.find(icon=>icon.name===name);
  if(current)P_BY_ID.set(oldId,{...current,id:oldId})
 }
 P_BY_ID.set(RETIRED_ICON_BASE.id,RETIRED_ICON_BASE);
 P_BY_ID.set(FOUNDER_PLAYER_ID,FOUNDER_BASE);
 P_BY_ID.set(MARCO_FOUNDER_PLAYER_ID,MARCO_FOUNDER_BASE);
 P_BY_ID.set(NIKLAS_FOUNDER_PLAYER_ID,NIKLAS_FOUNDER_BASE);
 P_BY_ID.set(FLASHBACK_REUS_BASE.id,{...FLASHBACK_REUS_BASE,face:P_BY_ID.get("188350")?.face||FLASHBACK_REUS_BASE.face});
 for(const base of LIVE_TOTW_BASE_CACHE.values())if(base?.id)P_BY_ID.set(String(base.id),base);
 for(const info of MOMENTUM_BY_ID.values())if(!P_BY_ID.has(info.pid)){const base=momentumFallbackBase(info);applyPlayerTraits([base]);P_BY_ID.set(info.pid,base)}
 for(const task of EVENT_OBJECTIVES)eventObjectivePlayerBase(task);
}
function bestEaTotwAsset(info,rows){
 const assets=(rows||[]).map(normEAAsset).filter(Boolean);
 let matches=assets.filter(a=>totwAliasMatch(a,info)===100);
 if(info?.eaId){const byId=matches.filter(a=>String(a.id||"")===String(info.eaId));if(byId.length)matches=byId}
 return uniqueTotwPlayer(matches)
}
function mergeTotwWeekBase(team,base,a,index){
 const info=team?.players?.[index]||{},fallback=info.fallback||{};
 const seed={...(base||{}),
  id:fallback.id||base?.id||info.eaId||("totw-"+(team?.id||0)+"-preview-"+index),
  futwizId:String(info.eaId||base?.futwizId||(/^[0-9]+$/.test(String(base?.id||""))?base.id:"")),
  name:fallback.name||base?.name||info.names?.[0]||"TOTW Spieler",
  fullName:fallback.fullName||base?.fullName||base?.name||info.names?.[0]||"",
  firstName:fallback.firstName||base?.firstName||"",lastName:fallback.lastName||base?.lastName||"",
  ovr:Number(fallback.ovr||base?.ovr||info.ovr||80),
  position:fallback.position||base?.position||info.position||"CM",
  alt:fallback.alt||base?.alt||"",
  nation:fallback.nation||base?.nation||"",team:fallback.team||base?.team||"",
  league:fallback.league||base?.league||"",face:fallback.face||base?.face||"",
  nationFlag:fallback.nationFlag||base?.nationFlag||"",nationCode:fallback.nationCode||base?.nationCode||"",
  clubLogo:fallback.clubLogo||base?.clubLogo||"",teamId:fallback.teamId||base?.teamId||"",
  leagueLogo:fallback.leagueLogo||base?.leagueLogo||"",leagueId:fallback.leagueId||base?.leagueId||"",
  pac:Number(info.stats?.[0]??fallback.pac??base?.pac??0),sho:Number(info.stats?.[1]??fallback.sho??base?.sho??0),pas:Number(info.stats?.[2]??fallback.pas??base?.pas??0),
  dri:Number(info.stats?.[3]??fallback.dri??base?.dri??0),def:Number(info.stats?.[4]??fallback.def??base?.def??0),phy:Number(info.stats?.[5]??fallback.phy??base?.phy??0),
  source:fallback.source||base?.source||"fc27-totw-preview"
 };
 const tagged={...seed,_totwWeekId:team?.id||0,_totwWeekName:team?.name||"Team of the Week",_totwRating:Number(info.ovr||seed.ovr||0),_totwPosition:info.position||seed.position};
 if(!a)return tagged;
 return {...tagged,id:a.id||tagged.id,name:fallback.name||a.name||tagged.name,fullName:fallback.fullName||a.fullName||tagged.fullName,firstName:fallback.firstName||a.firstName||tagged.firstName,lastName:fallback.lastName||a.lastName||tagged.lastName,
  team:a.team||tagged.team,league:a.league||tagged.league,nation:a.nation||tagged.nation,face:a.face||tagged.face,nationFlag:a.nationFlag||tagged.nationFlag,nationCode:a.nationCode||tagged.nationCode,
  clubLogo:a.clubLogo||tagged.clubLogo,teamId:a.teamId||tagged.teamId,leagueLogo:a.leagueLogo||tagged.leagueLogo,leagueId:a.leagueId||tagged.leagueId,
  ovr:a.ovr||tagged.ovr,pac:info.stats?.[0]??a.pac??tagged.pac,sho:info.stats?.[1]??a.sho??tagged.sho,pas:info.stats?.[2]??a.pas??tagged.pas,dri:info.stats?.[3]??a.dri??tagged.dri,def:info.stats?.[4]??a.def??tagged.def,phy:info.stats?.[5]??a.phy??tagged.phy}
}
function mergeTotwBase(base,a,index){return mergeTotwWeekBase(LIVE_TOTW,base,a,index)}
const TOTW_ARCHIVE_BASE_CACHE=new Map();
function resolveTotwWeekBase(team,info,index){
 const key=`${team.id}:${index}`,cached=TOTW_ARCHIVE_BASE_CACHE.get(key);if(cached)return cached;
 let candidates=PLAYERS.filter(p=>totwAliasMatch(p,info)===100);
 if(info?.eaId){const byId=candidates.filter(p=>String(p.id||"")===String(info.eaId));if(byId.length)candidates=byId}
 const base=uniqueTotwPlayer(candidates),out=mergeTotwWeekBase(team,base,null,index);
 TOTW_ARCHIVE_BASE_CACHE.set(key,out);if(out?.id)P_BY_ID.set(String(out.id),out);return out
}
function allTotwMarketBases(){return publishedTotwWeeks().flatMap(team=>team.players.map((info,index)=>resolveTotwWeekBase(team,info,index)))}
function resolveTotwBase(info,index){
 const cached=LIVE_TOTW_BASE_CACHE.get(index);
 if(cached){P_BY_ID.set(String(cached.id),cached);return cached}
 let candidates=PLAYERS.filter(p=>totwAliasMatch(p,info)===100);
 if(info?.eaId){const byId=candidates.filter(p=>String(p.id||"")===String(info.eaId));if(byId.length)candidates=byId}
 const base=uniqueTotwPlayer(candidates),out=mergeTotwBase(base,null,index);
 LIVE_TOTW_BASE_CACHE.set(index,out);P_BY_ID.set(String(out.id),out);return out
}
async function hydrateTotwFromEa(index){
 if(LIVE_TOTW_EA_PENDING.has(index))return;const info=LIVE_TOTW.players[index];if(!info)return;
 const current=resolveTotwBase(info,index);if(current.team&&current.league&&current.face&&current.clubLogo&&current.leagueLogo)return;
 LIVE_TOTW_EA_PENDING.add(index);
 try{
  const queries=[current.fullName,current.name,...(info.names||[])].filter(Boolean),seen=new Set();
  let asset=null;
  for(const q of queries){const k=normalizeKey(q);if(!k||seen.has(k))continue;seen.add(k);try{asset=bestEaTotwAsset(info,await fetchEaPlayerSearch(q));if(asset)break}catch(e){}}
  if(asset){const merged=mergeTotwBase(current,asset,index);LIVE_TOTW_BASE_CACHE.set(index,merged);P_BY_ID.set(String(merged.id),merged);if(/^[0-9]+$/.test(String(asset.id||"")))applyEaAssetToPlayerById(asset);scheduleBadgeRerender();if(currentViewId?.()==="marketView")renderMarket()}
 }finally{LIVE_TOTW_EA_PENDING.delete(index)}
}
let TOTW_PREWARM_TOKEN=0;
function scheduleIdleTask(fn,timeout=3000){if("requestIdleCallback" in window)requestIdleCallback(()=>{try{const r=fn();if(r&&typeof r.catch==="function")r.catch(()=>{})}catch(e){}},{timeout});else setTimeout(()=>{try{const r=fn();if(r&&typeof r.catch==="function")r.catch(()=>{})}catch(e){}},Math.min(timeout,1800))}
function prewarmLiveTotw(){
 const active=activeTotwWeek();if(!active)return;
 if(LIVE_TOTW.id!==active.id){LIVE_TOTW=active;LIVE_TOTW_BASE_CACHE.clear();LIVE_TOTW_EA_PENDING.clear()}
 const token=++TOTW_PREWARM_TOKEN,queue=LIVE_TOTW.players.map((_,i)=>i);
 const run=()=>{
  if(token!==TOTW_PREWARM_TOKEN||document.hidden||!queue.length)return;
  const index=queue.shift();
  Promise.resolve(hydrateTotwFromEa(index)).catch(()=>{}).finally(()=>{if(queue.length&&token===TOTW_PREWARM_TOKEN)setTimeout(run,450)})
 };
 scheduleIdleTask(run,3000)
}
function syncTotwClock(){
 const next=activeTotwWeek()||latestPublishedTotw();if(!next)return;
 if(!LIVE_TOTW||LIVE_TOTW.id!==next.id){LIVE_TOTW=next;LIVE_TOTW_BASE_CACHE.clear();LIVE_TOTW_EA_PENDING.clear();prewarmLiveTotw();try{renderHome();if(currentViewId?.()==="marketView")refreshMarket();if(currentViewId?.()==="eventsView")renderEvents()}catch(e){}}
 updateTotwMarketOption()
}
setInterval(syncTotwClock,30000)
function totwPreviewEntry(info,index){
 const base=resolveTotwBase(info,index);if(!base.team||!base.league||!base.face||!base.clubLogo||!base.leagueLogo)hydrateTotwFromEa(index);
 const item={uid:`totw-view-${index}`,pid:String(base.id),evo:0,variant:"special",boost:Math.max(0,Number(info.ovr||base.ovr)-Number(base.ovr||0)),displayRating:Number(info.ovr||base.ovr),eventName:LIVE_TOTW.name,overridePosition:info.position||base.position,rare:true};
 P_BY_ID.set(String(base.id),base);
 return{index,info,base,item,player:displayBase(item)||{...base,ovr:info.ovr,position:info.position||base.position}}
}
function liveTotwTeamEntries(){return LIVE_TOTW.players.map((info,i)=>({info,i})).filter(x=>!isEventSbcBlockedTotwInfo(LIVE_TOTW,x.info)).map(x=>totwPreviewEntry(x.info,x.i))}
function totwTeamCard(entry,slot=null){
 if(!entry)return'<div class="emptyslot">LEER</div>';const b=entry.player,out=slot&&posFit(b,slot)<=0,shown=out?b.position:(slot||b.position);
 return `<button type="button" class="totw-player-btn ${out?"out":""}" data-totw-bio="${entry.index}" aria-label="${esc(b.name)} Spielerbiografie öffnen">${cardHTML(b,entry.item,true,shown)}${out?'<div class="poswarn">!</div>':""}</button>`
}
function openTotwTeam(){
 const all=liveTotwTeamEntries(),lineup=eventTeamLineup(all),formation=lineup.formation||"4-3-3",slots=lineup.slots||FORMATIONS[formation]||FORMATIONS["4-3-3"],xi=lineup.xi||[],benchAll=lineup.bench||[];
 const bench=benchAll.slice(0,7),reserve=benchAll.slice(7),starters=xi.filter(Boolean),rating=starters.length?Math.round(starters.reduce((n,e)=>n+Number(e.player.ovr||0),0)/starters.length):0;
 $("opponentTeamModalTitle").textContent=totwDisplayName(LIVE_TOTW.name);
 $("opponentTeamModalSub").textContent=`${formation} · ${rating} GES · ${all.length} Spieler`;
 const pitch=slots.map((slot,i)=>`<div class="friend-slot totw-slot ${xi[i]&&posFit(xi[i].player,slot.p)<=0?"out":""}" style="left:${slot.x}%;top:${slot.y}%">${xi[i]?totwTeamCard(xi[i],slot.p):`<div class="emptyslot">${positionLabel(slot.p)}</div>`}</div>`).join("");
 const reserveHtml=reserve.length?`<div class="totw-section-title">Reserve</div><div class="totw-reserve">${reserve.map(e=>`<div>${totwTeamCard(e)}</div>`).join("")}</div>`:"";
 $("opponentTeamModalBody").innerHTML=`<div class="totw-team-head"><div><strong>${esc(totwDisplayName(LIVE_TOTW.name))}</strong><span>${totwIsActive()?"Aktuelles Team":"Archiviertes Team"} · stärkste positionsgerechte Elf</span></div><span>${totwIsActive()?"Aktiv bis":"Beendet am"} ${esc(LIVE_TOTW.activeUntil)}</span></div><div class="friend-team-summary"><div class="kpi"><strong>${rating}</strong><span>Gesamtstärke</span></div><div class="kpi"><strong>${esc(formation)}</strong><span>Formation</span></div><div class="kpi"><strong>${all.length}</strong><span>Spieler</span></div></div><div class="pitch friend-pitch">${pitch}</div><div class="totw-section-title">Auswechselspieler</div><div class="friend-bench">${bench.map(e=>`<div>${totwTeamCard(e)}</div>`).join("")}</div>${reserveHtml}`;
 showUiLayer("opponentTeamModal","opponent-team")
}
$("opponentTeamModalBody")?.addEventListener("click",e=>{const btn=e.target.closest("[data-totw-bio]");if(!btn)return;const entry=liveTotwTeamEntries().find(x=>String(x.index)===String(btn.dataset.totwBio));if(entry)openBiography(entry.item,null,entry.player)});

/* V19.23 — reusable Event-Release-Uebersichten.
   Zukuenftige Promo-Teams koennen als Eintrag in EVENT_PROMO_RELEASES hinterlegt werden:
   {id,name,subtitle,activeUntil,theme,players:[{pid|eaId|names,ovr,position,boost,eventName,variant}]} */
// FC27 sofifa_id is the permanent player identity; MOMENTUM is a separate item.
// Keeper stats use Footera's HEC / BSI / ABS / REF / TMP / POS mapping.
const MOMENTUM_EVENT={id:"momentum-team-1",name:"MOMENTUM",shortName:"MOMENTUM",subtitle:"TEAM 1",theme:"momentum",activeFrom:"2026-09-27T00:00:00+02:00",activeUntilAt:"2026-10-02T19:00:00+02:00",activeUntil:"02.10.2026 · 19:00",sbcPlayer:{id:"momentum-kerkez-85",name:"Miloš Kerkez",names:["Miloš Kerkez","Milos Kerkez"],ovr:85,position:"LB",baseOvr:81,team:"Liverpool",nation:"Hungary",alt:"LM",stats:[91,69,80,84,83,82],releaseAt:"2026-09-29T19:00:00+02:00",activeUntilAt:"2026-10-02T19:00:00+02:00",activeUntil:"02.10.2026 · 19:00",packEligible:false},players:[
 {pid:"241461",name:"Ferran Torres",ovr:89,position:"ST",baseOvr:84,team:"Paris Saint-Germain",nation:"Spain",alt:"LW,LM",stats:[91,89,83,87,42,78]},
 {pid:"247827",name:"Michael Olise",ovr:89,position:"RM",baseOvr:90,team:"Bayern München",nation:"France",alt:"RW,CAM",stats:[83,81,89,90,47,69]},
 {pid:"233419",name:"Raphinha",ovr:88,position:"RW",baseOvr:88,team:"FC Barcelona",nation:"Brazil",alt:"LW,CAM,LM,RM,ST",stats:[92,87,86,88,54,76]},
 {pid:"222665",name:"Martin Ødegaard",ovr:88,position:"CAM",baseOvr:86,team:"Arsenal FC",nation:"Norway",alt:"CM",stats:[68,81,91,90,67,66]},
 {pid:"207865",name:"Marquinhos",ovr:88,position:"CB",baseOvr:87,team:"Paris Saint-Germain",nation:"Brazil",alt:"",stats:[77,57,78,76,90,81]},
 {pid:"192119",name:"Thibaut Courtois",ovr:88,position:"GK",baseOvr:90,team:"Real Madrid",nation:"Belgium",alt:"",stats:[85,87,76,89,46,88]},
 {pid:"215441",name:"Serhou Guirassy",ovr:87,position:"ST",baseOvr:85,team:"Borussia Dortmund",nation:"Guinea",alt:"",stats:[75,88,77,83,45,86]},
 {pid:"238900",name:"Ermedin Demirović",ovr:87,position:"ST",baseOvr:80,team:"VfB Stuttgart",nation:"Bosnia and Herzegovina",alt:"",stats:[77,88,79,83,45,84]},
 {pid:"230142",name:"Mikel Oyarzabal",ovr:87,position:"LW",baseOvr:84,team:"Real Sociedad",nation:"Spain",alt:"ST",stats:[79,89,84,88,47,78]},
 {pid:"210881",name:"John McGinn",ovr:86,position:"CM",baseOvr:83,team:"Aston Villa",nation:"Scotland",alt:"RM,LM,CAM,RW,LW",stats:[75,83,85,85,81,87]},
 {pid:"262842",name:"Martin Baturina",ovr:86,position:"CAM",baseOvr:79,team:"Como",nation:"Croatia",alt:"LM,CM,LW",stats:[82,79,86,88,66,65]},
 {pid:"264388",name:"Alberto Moleiro",ovr:85,position:"CAM",baseOvr:82,team:"Villarreal CF",nation:"Spain",alt:"LM,LW,CM",stats:[88,79,81,88,53,70]},
 {pid:"277432",name:"Patrick Dorgu",ovr:85,position:"LB",baseOvr:78,team:"Manchester United",nation:"Denmark",alt:"LM",stats:[90,77,78,82,81,80]},
 {pid:"204970",name:"Florian Thauvin",ovr:84,position:"RW",baseOvr:82,team:"RC Lens",nation:"France",alt:"ST,RM,CAM",stats:[74,83,86,86,48,70]}
]};
const MOMENTUM_TEAM_2={id:"momentum-team-2",name:"MOMENTUM",shortName:"MOMENTUM · TEAM 2",subtitle:"TEAM 2",theme:"momentum",activeFrom:"2026-10-02T19:00:00+02:00",activeUntilAt:"2026-10-09T19:00:00+02:00",activeUntil:"09.10.2026 · 19:00",sbcPlayer:{id:"momentum-kubo-86",pid:"237681",name:"Takefusa Kubo",names:["Takefusa Kubo","Kubo"],ovr:86,position:"RW",baseOvr:80,team:"Real Sociedad",nation:"Japan",league:"LALIGA EA SPORTS",alt:"RM,LW,CAM",stats:[91,84,86,90,49,70],releaseAt:"2026-10-07T19:00:00+02:00",activeUntilAt:"2026-10-09T19:00:00+02:00",activeUntil:"09.10.2026 · 19:00",packEligible:false},players:[
 {pid:"256790",dynamicFace:"assets/footera/events/momentum/team2/musiala.webp",name:"Jamal Musiala",ovr:89,position:"CAM",baseOvr:87,team:"Bayern München",nation:"Germany",alt:"LM,LW",stats:[92,86,87,92,66,78]},
 {pid:"271421",dynamicFace:"assets/footera/events/momentum/team2/doue.webp",name:"Désiré Doué",ovr:89,position:"LW",baseOvr:86,team:"Paris Saint-Germain",nation:"France",alt:"CAM,RW,CM,RM,LM",stats:[94,83,86,92,63,78]},
 {pid:"233731",dynamicFace:"assets/footera/events/momentum/team2/isak.webp",name:"Alexander Isak",ovr:88,position:"ST",baseOvr:86,team:"Liverpool",nation:"Sweden",alt:"",stats:[90,92,78,88,42,83]},
 {pid:"246191",dynamicFace:"assets/footera/events/momentum/team2/alvarez.webp",name:"Julián Álvarez",ovr:88,position:"ST",baseOvr:86,team:"Atlético Madrid",nation:"Argentina",alt:"CAM",stats:[87,89,84,90,54,80]},
 {pid:"224232",dynamicFace:"assets/footera/events/momentum/team2/barella.webp",name:"Nicolò Barella",ovr:88,position:"CM",baseOvr:87,team:"Inter",nation:"Italy",alt:"CDM",stats:[84,81,88,87,82,82]},
 {pid:"215698",dynamicFace:"assets/footera/events/momentum/team2/maignan.webp",name:"Mike Maignan",ovr:88,position:"GK",baseOvr:87,team:"AC Milan",nation:"France",alt:"",stats:[88,85,87,91,62,88]},
 {pid:"256079",dynamicFace:"assets/footera/events/momentum/team2/caicedo.webp",name:"Moisés Caicedo",ovr:87,position:"CDM",baseOvr:86,team:"Chelsea",nation:"Ecuador",alt:"CM",stats:[83,74,81,84,87,82]},
 {pid:"278046",dynamicFace:"assets/footera/events/momentum/team2/cubarsi.webp",name:"Pau Cubarsí",ovr:87,position:"CB",baseOvr:86,team:"FC Barcelona",nation:"Spain",alt:"",stats:[81,55,78,80,87,83]},
 {pid:"251570",dynamicFace:"assets/footera/events/momentum/team2/cherki.webp",name:"Rayan Cherki",ovr:87,position:"CAM",baseOvr:86,team:"Manchester City",nation:"France",alt:"RW,RM,CM",stats:[88,82,86,91,53,75]},
 {pid:"277954",dynamicFace:"assets/footera/events/momentum/team2/yildiz.webp",name:"Kenan Yıldız",ovr:87,position:"LW",baseOvr:84,team:"Juventus",nation:"Turkey",alt:"CAM,LM,ST",stats:[90,82,85,90,54,74]},
 {pid:"235794",dynamicFace:"assets/footera/events/momentum/team2/eze.webp",name:"Eberechi Eze",ovr:87,position:"CAM",baseOvr:84,team:"Arsenal",nation:"England",alt:"LM,LW,CM",stats:[88,84,85,89,59,76]},
 {pid:"234577",dynamicFace:"assets/footera/events/momentum/team2/costa.webp",name:"Diogo Costa",ovr:87,position:"GK",baseOvr:86,team:"FC Porto",nation:"Portugal",alt:"",stats:[88,84,82,89,60,86]},
 {pid:"270964",dynamicFace:"assets/footera/events/momentum/team2/bellingham.webp",name:"Jobe Bellingham",ovr:86,position:"CM",baseOvr:77,team:"Borussia Dortmund",nation:"England",alt:"CDM",stats:[82,78,84,85,81,82]},
 {pid:"260592",dynamicFace:"assets/footera/events/momentum/team2/sesko.webp",name:"Benjamin Šeško",ovr:86,position:"ST",baseOvr:82,team:"Manchester United",nation:"Slovenia",alt:"",stats:[88,87,73,84,48,86]},
 {pid:"247263",dynamicFace:"assets/footera/events/momentum/team2/tapsoba.webp",name:"Edmond Tapsoba",ovr:86,position:"CB",baseOvr:82,team:"Bayer Leverkusen",nation:"Burkina Faso",alt:"",stats:[82,54,72,76,87,85]},
 {pid:"239380",dynamicFace:"assets/footera/events/momentum/team2/lang.webp",name:"Noa Lang",ovr:85,position:"LW",baseOvr:79,team:"Napoli",nation:"Netherlands",alt:"LM",stats:[88,80,82,87,51,72]},
 {pid:"250723",dynamicFace:"assets/footera/events/momentum/team2/kone.webp",name:"Manu Koné",ovr:85,position:"CM",baseOvr:81,team:"AS Roma",nation:"France",alt:"CDM,CAM",stats:[81,76,82,84,83,85]},
 {pid:"251470",dynamicFace:"assets/footera/events/momentum/team2/de-ketelaere.webp",name:"Charles De Ketelaere",ovr:85,position:"CAM",baseOvr:81,team:"Atalanta",nation:"Belgium",alt:"ST,RW,RM",stats:[82,84,83,86,62,78]}
]};
MOMENTUM_EVENT.shortName="MOMENTUM · TEAM 1";
const MOMENTUM_RELEASES=[MOMENTUM_EVENT,MOMENTUM_TEAM_2];
// Extra objective rewards are a separate catalogue: never add them to a regular team or pack pool.
const EVENT_OBJECTIVES=[{
 id:"momentum-haraldsson",key:"event:momentum-haraldsson",group:"event",title:"MOMENTUM: Haraldsson",desc:"Gewinne 8 Squad-Battles-Partien auf mindestens Profi.",
 eventName:"MOMENTUM",eventType:"momentum-objective",releaseId:"momentum-objective-haraldsson",activeFrom:"2026-10-02T19:00:00+02:00",activeUntilAt:"2026-10-09T19:00:00+02:00",
 mode:"squad",minDifficulty:"pro",target:8,reward:{eventObjective:"momentum-haraldsson"},
 player:{pid:"262088",name:"Hákon Haraldsson",ovr:84,baseOvr:78,position:"CAM",alt:"CM,LW",baseAlt:"LM,CM,LW",baseStats:[77,67,75,81,57,70],team:"LOSC Lille",nation:"Iceland",league:"Ligue 1",stats:[86,80,84,87,63,76],dynamicFace:"assets/footera/events/momentum/objectives/haraldsson.webp"}
},{
 id:"halloween-leao",key:"event:halloween-leao",group:"event",title:"HALLOWEEN: Rafael Leão",desc:"Gewinne 8 Squad-Battles-Partien auf mindestens Profi.",
 eventName:"HALLOWEEN",eventType:"halloween-objective",releaseId:"halloween-objective-leao",activeFrom:"2026-10-30T19:00:00+01:00",activeUntilAt:"2026-11-06T19:00:00+01:00",
 mode:"squad",minDifficulty:"pro",target:8,reward:{eventObjective:"halloween-leao"},
 player:{pid:"241721",name:"Rafael Leão",ovr:88,baseOvr:83,position:"LW",alt:"LM,ST",baseAlt:"LM,ST,CAM",baseStats:[93,79,79,83,30,73],team:"AC Milan",nation:"Portugal",league:"Serie A Enilive",stats:[96,86,82,90,34,80],playstylePlusAdds:["rapid"],dynamicFace:"assets/footera/events/halloween/faces/241721.webp"}
}];
function activeEventObjectives(at=Date.now()){return EVENT_OBJECTIVES.filter(task=>eventPackIsActive(task,at))}
function eventObjectiveProgress(task){return Math.min(task.target,Math.max(0,Number(state.eventObjectives?.[task.id]?.progress||0)))}
function eventObjectivePlayerBase(task){
 const info=task?.player;if(!info)return null;
 let base=P_BY_ID.get(info.pid);
 if(!base){base=momentumFallbackBase({...info,stats:info.baseStats,alt:info.baseAlt});applyPlayerTraits([base]);P_BY_ID.set(info.pid,base)}
 return base
}
function makeEventObjectiveItem(task){
 const base=eventObjectivePlayerBase(task),info=task?.player;if(!base||!info)return null;
 const item=makeItem(base,false,{variant:"special",eventType:task.eventType,eventName:task.eventName,eventReleaseId:task.releaseId,dynamicFace:info.dynamicFace,overridePosition:info.position,displayRating:info.ovr,eventStats:info.stats,playstyleAdds:info.playstyleAdds||[],playstylePlusAdds:info.playstylePlusAdds||[],rare:true,acquisitionSource:"Objective"});
 item.objectiveRewardKey=task.id;return item
}
function recordEventObjectiveMatch(completed,result,at=Date.now()){
 if(!completed?.finished||!completed.resultId||result!=="win")return false;
 const difficulty=SB_DIFFICULTIES[completed.battleDifficulty];let changed=false;
 for(const task of activeEventObjectives(at)){
  const minimum=SB_DIFFICULTIES[task.minDifficulty];
  if(completed.mode!==task.mode||!difficulty||!minimum||difficulty.factor<minimum.factor)continue;
  state.eventObjectives=state.eventObjectives||{};
  const row=state.eventObjectives[task.id]||(state.eventObjectives[task.id]={progress:0,matchIds:[],claimed:false});
  if(row.claimed||row.progress>=task.target||row.matchIds.includes(completed.resultId))continue;
  row.matchIds.push(completed.resultId);row.progress=Math.min(task.target,Number(row.progress||0)+1);changed=true
 }
 if(changed){save();flushSave()}
 return changed
}
function claimEventObjective(task,at=Date.now()){
 if(!activeEventObjectives(at).some(t=>t.id===task?.id)||eventObjectiveProgress(task)<task.target)return false;
 const row=state.eventObjectives?.[task.id];
 if(!row||row.claimed||state.objectiveClaims?.[task.key])return false;
 const item=makeEventObjectiveItem(task);if(!item)return false;
 row.claimed=true;state.objectiveClaims=state.objectiveClaims||{};state.objectiveClaims[task.key]=true;state.club.push(item);
 save();flushSave();return true
}
const MOMENTUM_BY_ID=new Map(MOMENTUM_RELEASES.flatMap(event=>event.players.map(info=>[info.pid,info])));
const FOOTERA_EVENT_RULES={timeZone:"Europe/Berlin",endWeekday:5,endHour:19,teamSize:18,keepers:2,maxPlayersPerClub:1,allowExtraClubPlayer:true,avoidRecentSpecialRepeats:true,considerContent:["totw","events","sbc","objectives","season","evolutions"]};
// HALLOWEEN · BLUTMOND: 18 real FC27 players from 18 clubs, own card artwork (halloween-card.css).
// In the Halloween night (31.10. 19:00) every Halloween card gets the Blutmond upgrade, see halloweenUpgradeFor().
const HALLOWEEN_EVENT={id:"halloween-2026",name:"HALLOWEEN",shortName:"HALLOWEEN",subtitle:"BLUTMOND",theme:"halloween",activeFrom:"2026-10-30T19:00:00+01:00",activeUntilAt:"2026-11-06T19:00:00+01:00",activeUntil:"06.11.2026 · 19:00",
 upgrade:{at:"2026-10-31T19:00:00+01:00",ovr:1,stats:1,label:"Blutmond-Upgrade"},
 sbcPlayer:{id:"halloween-mueller-88",pid:"189596",dynamicFace:"assets/footera/events/halloween/faces/189596.webp",name:"Thomas Müller",names:["Thomas Müller","Thomas Muller"],ovr:87,position:"CAM",team:"Whitecaps FC",league:"MLS",nation:"Germany",alt:"ST,RM,RW",stats:[75,87,89,87,61,75],playstyleAdds:["incisive-pass","power-header"],playstylePlusAdds:["first-touch"],releaseAt:"2026-10-31T19:00:00+01:00",activeUntilAt:"2026-11-06T19:00:00+01:00",packEligible:false,segments:[
  {name:"Geisterstunde – 83er-Team",desc:"Teil 1/4 · Der Raumdeuter spukt wieder.",req:"11 Spieler · Ø GES 83 · min. 1 TOTW",minAvg:83,minTotw:1,reward:{pack:"gold",qty:1}},
  {name:"Kürbisfeld – 84er-Team",desc:"Teil 2/4 · Oranje wie ein Kürbis.",req:"11 Spieler · Ø GES 84 · min. 1 Spieler aus den Niederlanden",minAvg:84,requiredNation:"Holland",reward:{pack:"82",qty:1}},
  {name:"Transsilvanien – 85er-Team",desc:"Teil 3/4 · Grüße aus Draculas Heimat.",req:"11 Spieler · Ø GES 85 · min. 1 Spieler aus Rumänien",minAvg:85,requiredNation:"Romania",reward:{pack:"goldplayers",qty:1}},
  {name:"Blutmond – 86er-Team",desc:"Teil 4/4 · Deutschland trifft MLS.",req:"11 Spieler · Ø GES 86 · min. 1 deutscher Spieler · min. 1 MLS-Spieler",minAvg:86,requiredNation:"Germany",requiredLeague:"MLS",reward:{pack:"85",qty:1}}
 ]},
 players:[
 {pid:"220901",dynamicFace:"assets/footera/events/halloween/dynamic/220901.webp",name:"David Raya",ovr:90,position:"GK",baseOvr:88,team:"Arsenal",nation:"Spain",alt:"",stats:[90,89,91,91,61,89],playstylePlusAdds:["far-reach"]},
 {pid:"193080",dynamicFace:"assets/footera/events/halloween/dynamic/193080.webp",name:"De Gea",ovr:85,position:"GK",baseOvr:83,team:"Fiorentina",nation:"Spain",alt:"",stats:[84,83,79,88,49,87],playstylePlusAdds:["footwork"]},
 {pid:"229558",dynamicFace:"assets/footera/events/halloween/dynamic/229558.webp",name:"Dayot Upamecano",ovr:88,position:"CB",baseOvr:87,team:"FC Bayern München",nation:"France",alt:"",stats:[82,47,67,77,88,85],playstylePlusAdds:["anticipate"]},
 {pid:"232488",dynamicFace:"assets/footera/events/halloween/dynamic/232488.webp",name:"Cristian Romero",ovr:84,position:"CB",baseOvr:82,team:"Atlético de Madrid",nation:"Argentina",alt:"",stats:[77,51,65,67,88,84],playstylePlusAdds:["bruiser"]},
 {pid:"265693",dynamicFace:"assets/footera/events/halloween/dynamic/265693.webp",name:"Jakub Kiwior",ovr:84,position:"CB",baseOvr:82,team:"FC Porto",nation:"Poland",alt:"LB",stats:[80,45,75,79,88,84],playstylePlusAdds:["block"]},
 {pid:"239231",dynamicFace:"assets/footera/events/halloween/dynamic/239231.webp",name:"Cucurella",ovr:87,position:"LB",baseOvr:86,team:"Real Madrid",nation:"Spain",alt:"",stats:[85,66,81,80,86,80],playstylePlusAdds:["jockey"]},
 {pid:"266127",dynamicFace:"assets/footera/events/halloween/dynamic/266127.webp",name:"Lewis Hall",ovr:85,position:"LB",baseOvr:83,team:"Newcastle Utd",nation:"England",alt:"",stats:[85,67,84,85,83,71],playstylePlusAdds:["pinged-pass"]},
 {pid:"254243",dynamicFace:"assets/footera/events/halloween/dynamic/254243.webp",name:"Elliot Anderson",ovr:86,position:"CDM",baseOvr:84,team:"Manchester City",nation:"England",alt:"CM",stats:[76,74,86,85,85,82],playstylePlusAdds:["intercept"]},
 {pid:"246863",dynamicFace:"assets/footera/events/halloween/dynamic/246863.webp",name:"Felix Nmecha",ovr:86,position:"CM",baseOvr:85,team:"Borussia Dortmund",nation:"Germany",alt:"CDM",stats:[85,80,84,86,84,90],playstylePlusAdds:["relentless"]},
 {pid:"177003",dynamicFace:"assets/footera/events/halloween/dynamic/177003.webp",name:"Luka Modrić",ovr:87,position:"CM",baseOvr:85,team:"AC Milan",nation:"Croatia",alt:"CDM,CAM",stats:[78,78,90,89,76,72],playstylePlusAdds:["tiki-taka"]},
 {pid:"243245",dynamicFace:"assets/footera/events/halloween/dynamic/243245.webp",name:"Orkun Kökçü",ovr:84,position:"CM",baseOvr:82,team:"Beşiktaş",nation:"Turkey",alt:"CDM,CAM",stats:[78,83,87,83,73,83],playstylePlusAdds:["long-ball-pass"]},
 {pid:"260247",dynamicFace:"assets/footera/events/halloween/dynamic/260247.webp",name:"Morgan Rogers",ovr:86,position:"CAM",baseOvr:84,team:"Chelsea",nation:"England",alt:"LM,CM,LW",stats:[80,85,86,87,70,81],playstylePlusAdds:["press-proven"]},
 {pid:"158023",dynamicFace:"assets/footera/events/halloween/dynamic/158023.webp",name:"Lionel Messi",ovr:91,position:"CAM",baseOvr:89,team:"Inter Miami CF",nation:"Argentina",alt:"RW,ST,RM",stats:[80,90,92,93,36,66],playstylePlusAdds:["finesse-shot"]},
 {pid:"209331",dynamicFace:"assets/footera/events/halloween/dynamic/209331.webp",name:"Mohamed Salah",ovr:89,position:"RM",baseOvr:87,team:"Trabzonspor",nation:"Egypt",alt:"RW,CAM,ST",stats:[88,86,86,89,48,75],playstylePlusAdds:["low-driven-shot"]},
 {pid:"264652",dynamicFace:"assets/footera/events/halloween/dynamic/264652.webp",name:"Bradley Barcola",ovr:87,position:"LW",baseOvr:85,team:"Paris SG",nation:"France",alt:"RW,LM,RM",stats:[95,80,81,87,42,70],playstylePlusAdds:["rapid"]},
 {pid:"228093",dynamicFace:"assets/footera/events/halloween/dynamic/228093.webp",name:"Marcus Thuram",ovr:87,position:"ST",baseOvr:85,team:"Inter",nation:"France",alt:"",stats:[89,86,78,84,53,84],playstylePlusAdds:["power-shot"]},
 {pid:"244176",dynamicFace:"assets/footera/events/halloween/dynamic/244176.webp",name:"Deniz Undav",ovr:86,position:"ST",baseOvr:85,team:"VfB Stuttgart",nation:"Germany",alt:"CAM",stats:[79,88,78,85,35,83],playstylePlusAdds:["acrobatic"]},
 {pid:"194765",dynamicFace:"assets/footera/events/halloween/dynamic/194765.webp",name:"Antoine Griezmann",ovr:86,position:"ST",baseOvr:84,team:"Orlando City",nation:"France",alt:"CAM,CM",stats:[84,88,88,90,62,78],playstylePlusAdds:["incisive-pass"]}
]};
// SBC-only card; never inserted into the ordinary packs or market player pool.
const FLASHBACK_REUS_BASE={id:"footera-flashback-reus-20261009",name:"Marco Reus",fullName:"Marco Reus",ovr:88,position:"CAM",alt:"LW,ST",nation:"Germany",team:"LA Galaxy",league:"Major League Soccer",clubLogo:"./assets/footera/events/flashback/Los_Angeles_Galaxy_logo.svg",leagueLogo:"./assets/footera/events/flashback/Major_League_Soccer_logo.svg",height:180,preferredFoot:"Right",skillMoves:4,weakFoot:4,pac:87,sho:86,pas:88,dri:90,def:52,phy:72,face:"https://cdn.futwiz.com/assets/img/fc27/faces/188350.png",playstyles:"Finesse Shot,Incisive Pass,First Touch,Trivela,Dead Ball",playstylesPlus:"Technical",dynamicFace:"./assets/footera/events/flashback/reus-dortmund.png",nationFlag:"./assets/footera/events/flashback/de.png",source:"footera-flashback"};
const FLASHBACK_REUS_EVENT={id:"flashback-reus-20261009",name:"FLASHBACK",shortName:"FLASHBACK",theme:"flashback",activeFrom:"2026-10-09T19:00:00+02:00",activeUntilAt:"2026-10-29T19:00:00+01:00",activeUntil:"29.10.2026 · 18:59",players:[],sbcPlayer:{
 id:"flashback-reus-88",pid:FLASHBACK_REUS_BASE.id,name:"Marco Reus",names:["Marco Reus"],ovr:88,position:"CAM",team:"LA Galaxy",league:"Major League Soccer",nation:"Germany",alt:"LW,ST",stats:[87,86,88,90,52,72],playstyleAdds:["finesse-shot","incisive-pass","first-touch","trivela","dead-ball"],playstylePlusAdds:["technical"],releaseAt:"2026-10-09T19:00:00+02:00",activeUntilAt:"2026-10-29T19:00:00+01:00",packEligible:false,segments:[
 {name:"Flashback – 83er-Team",desc:"Teil 1/3 · TOTW-Herausforderung.",req:"11 Spieler · Ø GES 83 · min. 1 TOTW",minAvg:83,minTotw:1,reward:{pack:"gold",qty:1}},
 {name:"Flashback – 84er-Team",desc:"Teil 2/3 · Reus' Dortmunder Jahre.",req:"11 Spieler · Ø GES 84 · min. 1 BVB-Spieler",minAvg:84,requiredClub:"Borussia Dortmund",reward:{pack:"82",qty:1}},
 {name:"Flashback – 85er-Team",desc:"Teil 3/3 · Deutschland trifft MLS.",req:"11 Spieler · Ø GES 85 · min. 1 deutscher Spieler · min. 1 MLS-Spieler",minAvg:85,requiredNation:"Germany",requiredLeague:"MLS",reward:{pack:"goldplayers",qty:1}}
 ]}};
const EVENT_PROMO_RELEASES=[...MOMENTUM_RELEASES,HALLOWEEN_EVENT,FLASHBACK_REUS_EVENT];
function completeEventRoster(event){const players=event?.players||[];return players.length===FOOTERA_EVENT_RULES.teamSize&&players.filter(p=>p.position==="GK").length===FOOTERA_EVENT_RULES.keepers&&new Set(players.map(p=>String(p.pid||p.eaId||p.name))).size===players.length&&players.every(p=>!!String(p.team||"").trim())&&new Set(players.map(p=>normalizeKey(p.team))).size===players.length}
function eventRosterReady(event){return event?.id===MOMENTUM_EVENT.id?event.players?.length===14:completeEventRoster(event)}
function activePromoEvent(at=Date.now()){return EVENT_PROMO_RELEASES.find(e=>eventRosterReady(e)&&eventPackIsActive(e,at))||null}
function activeMomentumEvent(at=Date.now()){return MOMENTUM_RELEASES.find(e=>eventRosterReady(e)&&eventPackIsActive(e,at))||null}
function momentumIsActive(at=Date.now()){return !!activeMomentumEvent(at)}
function promoItemInfo(item){
 const objective=EVENT_OBJECTIVES.find(task=>task.releaseId===item?.eventReleaseId&&task.player.pid===String(item?.pid));
 if(objective)return objective.player;
 const event=EVENT_PROMO_RELEASES.find(e=>e.id===item?.eventReleaseId);
 if(event)return (event.players||[]).find(p=>String(p.pid||p.eaId)===String(item.pid))||null;
 return isMomentumItem(item)?MOMENTUM_BY_ID.get(String(item.pid)):null
}
function eventSbcPlayerIsActive(event,at=Date.now()){
 const def=event?.sbcPlayer;if(!def)return false;const t=at instanceof Date?at.getTime():Number(at);
 const start=Date.parse(def.releaseAt),end=Date.parse(def.activeUntilAt||event.activeUntilAt);
 return Number.isFinite(start)&&t>=start&&(!Number.isFinite(end)||t<end)
}
function eventSbcAliases(def){return [...new Set([def?.name,...(def?.names||[])].filter(Boolean).map(normalizeKey).filter(Boolean))]}
function eventSbcMatchesBase(def,base){
 if(!def||!base)return false;
 if(def.pid&&String(def.pid)===String(base.id||""))return true;
 const keys=totwSearchKeys(base);return eventSbcAliases(def).some(a=>keys.includes(a))
}
function eventSbcMatchesTotwInfo(def,info){
 if(!def||!info)return false;
 if(def.pid&&info.eaId&&String(def.pid)===String(info.eaId))return true;
 const aliases=new Set(eventSbcAliases(def));return (info.names||[]).map(normalizeKey).some(n=>aliases.has(n))
}
function activeEventSbcDefs(at=Date.now()){return EVENT_PROMO_RELEASES.map(event=>({event,def:event.sbcPlayer})).filter(x=>x.def&&eventSbcPlayerIsActive(x.event,at))}
function isActiveEventSbcBase(base,at=Date.now()){return activeEventSbcDefs(at).some(x=>eventSbcMatchesBase(x.def,base))}
function eventSbcTotwConflictAtRelease(event,def){
 const start=Date.parse(def?.releaseAt);if(!Number.isFinite(start))return false;
 const team=activeTotwWeek(new Date(start+1000));return !!team&&(team.players||[]).some(info=>eventSbcMatchesTotwInfo(def,info))
}
function eventSbcBlocksTotwInfo(event,def,team,info){
 if(!event||!def||!team||!info||!eventSbcMatchesTotwInfo(def,info))return false;
 const startKey=berlinMinuteKey(new Date(def.releaseAt)),endKey=berlinMinuteKey(new Date(def.activeUntilAt||event.activeUntilAt)),teamKey=totwStartKey(team);
 return teamKey>=startKey&&teamKey<endKey
}
function isEventSbcBlockedTotwInfo(team,info){return EVENT_PROMO_RELEASES.some(event=>eventSbcBlocksTotwInfo(event,event.sbcPlayer,team,info))}
function isMomentumItem(item){return !!item&&item.variant==="special"&&(String(item.eventType||"").startsWith("momentum")||item.eventName==="MOMENTUM")}
function makeMomentumItem(base,tradeable=true,event=null){
 const pid=String(base?.id||""),info=event?(event.players||[]).find(p=>String(p.pid)===pid):MOMENTUM_BY_ID.get(pid);
 return info?makeItem(base,tradeable,{variant:"special",eventType:"momentum",eventName:"MOMENTUM",eventReleaseId:event?.id||MOMENTUM_RELEASES.find(e=>e.players.includes(info))?.id||"",dynamicFace:info.dynamicFace||info.eventFace||"",overridePosition:info.position,displayRating:info.ovr,eventStats:info.stats,playstyleAdds:info.playstyleAdds||info.playstyles||[],playstylePlusAdds:info.playstylePlusAdds||info.playstylesPlus||[],rare:true}):null
}
function momentumFallbackBase(info){return{id:String(info.pid),name:info.name,fullName:info.name,ovr:info.baseOvr,position:info.position,alt:info.alt,team:info.team,nation:info.nation,league:leagueFromClub(info.team,"","","male","fc27-open-data"),face:sofifaFace(info.pid),pac:info.stats[0],sho:info.stats[1],pas:info.stats[2],dri:info.stats[3],def:info.stats[4],phy:info.stats[5],gender:"male",source:"fc27-open-data"}}
let eventSelectedId="";
function publishedTotwWeeks(at=new Date()){const key=berlinMinuteKey(at);return TOTW_WEEKS.filter(team=>totwReleaseApproved(team)&&key>=totwStartKey(team)).slice().reverse()}
function requestedTotwPreview(){
 try{const id=new URL(location.href).searchParams.get("totwPreview");return id?TOTW_WEEKS.find(team=>String(team.id)===id)||null:null}catch(_){return null}
}
function eventResolveBase(info,index,eventId="event"){
 const ids=[info?.pid,info?.eaId].filter(Boolean).map(String);
 for(const id of ids){const p=P_BY_ID.get(id);if(p)return p}
 if(MOMENTUM_RELEASES.some(e=>e.id===eventId)&&MOMENTUM_BY_ID.has(String(info?.pid)))return momentumFallbackBase(info);
 const aliases=[...(info?.names||[]),info?.name].filter(Boolean).map(normalizeKey);
 const matches=PLAYERS.filter(p=>{const keys=totwSearchKeys(p);return aliases.some(a=>keys.includes(a))});
 return uniqueTotwPlayer(matches)||{id:`${eventId}-preview-${index}`,name:info?.name||info?.names?.[0]||"Event Spieler",fullName:info?.name||info?.names?.[0]||"",ovr:Number(info?.baseOvr||info?.ovr||80),position:info?.position||"CM",alt:"",nation:info?.nation||"",team:info?.team||"",league:info?.league||"",face:info?.face||"",pac:Number(info?.pac||0),sho:Number(info?.sho||0),pas:Number(info?.pas||0),dri:Number(info?.dri||0),def:Number(info?.def||0),phy:Number(info?.phy||0),source:"footera-event-preview"}
}
function promoEventEntries(event){
 return (event.players||[]).map((info,index)=>{
  const base=eventResolveBase(info,index,event.id),target=Number(info.ovr||base.ovr||80),boost=Number.isFinite(Number(info.boost))?Number(info.boost):Math.max(0,target-Number(base.ovr||0));
  P_BY_ID.set(String(base.id),base);
  const item={uid:`event-${event.id}-${index}`,pid:String(base.id),evo:0,variant:info.variant||"special",eventType:event.theme||event.id,boost,eventName:info.eventName||event.name,eventReleaseId:event.id,dynamicFace:info.dynamicFace||info.eventFace||"",eventStats:Array.isArray(info.stats)?info.stats:null,overridePosition:info.position||base.position,displayRating:target,playstyleAdds:Array.isArray(info.playstyleAdds||info.playstyles)?(info.playstyleAdds||info.playstyles):[],playstylePlusAdds:Array.isArray(info.playstylePlusAdds||info.playstylesPlus)?(info.playstylePlusAdds||info.playstylesPlus):[],rare:true};
  return{index,info,base,item,player:displayBase(item)||{...base,ovr:target,position:info.position||base.position}}
 })
}
function totwEventEntries(team){
 return team.players.map((info,index)=>({info,index})).filter(x=>!isEventSbcBlockedTotwInfo(team,x.info)).map(({info,index})=>{
  const live=String(team.id)===String(LIVE_TOTW?.id),base=live?resolveTotwBase(info,index):resolveTotwWeekBase(team,info,index);
  if(live&&(!base.team||!base.league||!base.face||!base.clubLogo||!base.leagueLogo))hydrateTotwFromEa(index);
  const item={uid:`event-totw-${team.id}-${index}`,pid:String(base.id),evo:0,variant:"special",eventType:"totw",playstyleAdds:Array.isArray(info.playstyleAdds||info.playstyles)?(info.playstyleAdds||info.playstyles):[],playstylePlusAdds:Array.isArray(info.playstylePlusAdds||info.playstylesPlus)?(info.playstylePlusAdds||info.playstylesPlus):[],boost:Math.max(0,Number(info.ovr||base.ovr)-Number(base.ovr||0)),displayRating:Number(info.ovr||base.ovr),eventName:team.name,overridePosition:info.position||base.position,rare:true};
  P_BY_ID.set(String(base.id),base);
  return{index,info,base,item,player:displayBase(item)||{...base,ovr:info.ovr,position:info.position||base.position}}
 })
}
function totwReviewEntries(team){
 // A draft must never replace an owned player's real base row in P_BY_ID.
 return team.players.map((info,index)=>{
  const real=uniqueTotwPlayer(PLAYERS.filter(player=>totwAliasMatch(player,info)===100));
  const base={...mergeTotwWeekBase(team,real,null,index),id:`totw-review-${team.id}-${index}`,ovr:info.ovr};
  if(info.eaId)base.futwizId=String(info.eaId);else if(real?.id&&/^\d+$/.test(String(real.id)))base.futwizId=String(real.id);
  P_BY_ID.set(base.id,base);
  const item={uid:`totw-review-item-${team.id}-${index}`,pid:base.id,evo:0,variant:"special",eventType:"totw",eventName:team.name,eventReleaseId:`totw-${team.id}`,displayRating:info.ovr,eventStats:info.stats,overridePosition:info.position,rare:true};
  return{index,info,base,item,player:displayBase(item)||base}
 })
}
// The event poster always lists the cards from the highest to the lowest rating.
function byEventRating(entries){return [...entries].sort((a,b)=>Number(b.player?.ovr||0)-Number(a.player?.ovr||0))}
function eventShowcases(){
 const activeId=String(activeTotwWeek()?.id||"");
 const totw=publishedTotwWeeks().map(team=>({id:`totw-${team.id}`,name:totwDisplayName(team.name),shortName:`TOTW ${team.id}`,subtitle:String(team.id)===activeId?"Aktuelles Team der Woche":"TOTW Archiv",activeUntil:team.activeUntil,releaseDate:team.releaseDate,theme:"totw",kind:"totw",team,entries:()=>byEventRating(totwEventEntries(team))}));
 const preview=requestedTotwPreview();
 if(preview&&!totw.some(ev=>ev.team.id===preview.id))totw.unshift({id:`totw-review-${preview.id}`,name:totwDisplayName(preview.name),shortName:`TOTW ${preview.id} · Vorschau`,subtitle:totwReleaseApproved(preview)?"Freigegeben · startet Mittwoch um 19:00":"Vorschlag zur Prüfung · nicht in Packs oder auf dem Markt",activeUntil:preview.activeUntil,releaseDate:preview.releaseDate,theme:"totw",kind:"totw",readOnly:true,team:preview,entries:()=>byEventRating(totwReviewEntries(preview))});
 const promos=EVENT_PROMO_RELEASES.filter(event=>(event.players||[]).length>0&&Date.now()>=Date.parse(event.activeFrom)).map(event=>({...event,theme:event.theme||"event",kind:"promo",entries:()=>byEventRating(promoEventEntries(event))}));
 return [...promos.filter(e=>eventPackIsActive(e)),...totw,...promos.filter(e=>!eventPackIsActive(e))]
}
function renderEvents(){
 const tabs=$("eventTabs"),showcase=$("eventShowcase"),body=$("eventShowcaseBody");if(!tabs||!showcase||!body)return;
 const events=eventShowcases();
 if(!events.length){tabs.innerHTML="";body.innerHTML='<div class="event-empty">Aktuell ist kein Event-Team veröffentlicht.</div>';return}
 if(!events.some(x=>x.id===eventSelectedId))eventSelectedId=events[0].id;
 const selected=events.find(x=>x.id===eventSelectedId)||events[0],entries=selected.entries();
 tabs.innerHTML=events.map(ev=>`<button type="button" class="event-tab ${ev.id===selected.id?"active":""}" data-event-select="${esc(ev.id)}">${esc(ev.shortName||ev.name)}</button>`).join("");
 showcase.dataset.eventTheme=selected.theme||"event";
 const top=entries.length?Math.max(...entries.map(e=>Number(e.player?.ovr||0))):0;
 body.innerHTML=`<div class="event-showcase-head"><span class="event-showcase-kicker">FOOTERA ULTIMATE TEAM</span><h3>${esc(selected.name)}</h3><p>${esc(selected.subtitle||"Event Release")}</p></div><div class="event-meta-strip"><div class="event-meta"><b>${entries.length}</b><span>Spieler</span></div><div class="event-meta"><b>${top||"–"}</b><span>Top-Rating</span></div><div class="event-meta"><b>${esc(selected.readOnly?selected.releaseDate.split("-").reverse().join(".")+" 19:00":selected.activeUntil||"Offen")}</b><span>${selected.readOnly?"Geplanter Start":selected.kind==="totw"?"Verfügbar bis":eventPackIsActive(selected)?"Event bis":"Beendet am"}</span></div></div><div class="event-roster">${entries.length?entries.map((entry,index)=>`<button type="button" class="event-player" data-event-player="${index}" aria-label="${esc(entry.player?.name||"Spieler")} öffnen">${cardHTML(entry.player,entry.item,true,entry.player?.position)}</button>`).join(""):'<div class="event-empty">Für dieses Event sind noch keine Spieler veröffentlicht.</div>'}</div><div class="event-foot"><div><strong>${selected.readOnly?(totwReleaseApproved(selected.team)?"Freigegeben · wartet auf den geplanten Start":"Vorschau · wartet auf deine Freigabe"):selected.kind==="totw"?"Mittwoch 19:00 Rotation":eventPackIsActive(selected)?"Aktueller Promo-Release":"Event-Archiv · nicht mehr in Packs"}</strong><br>${selected.readOnly?(totwReleaseApproved(selected.team)?"Diese Karten werden am geplanten Starttermin automatisch verfügbar.":"Diese Karten sind nicht ziehbar und werden erst nach Freigabe veröffentlicht."):selected.kind==="totw"?"Jede TOTW-Woche bleibt anschließend im Archiv abrufbar.":"Neue Event-Teams erscheinen hier automatisch als eigener Reiter."}</div>${selected.kind==="promo"&&entries.length>=11?'<button type="button" class="secondary" data-event-open-promo>Aufstellung ansehen</button>':selected.kind==="totw"&&String(selected.team?.id)===String(LIVE_TOTW?.id)?'<button type="button" class="secondary" data-event-open-team>Aufstellung ansehen</button>':""}</div>`;
 body.dataset.eventId=selected.id
}
$("eventTabs")?.addEventListener("click",e=>{const b=e.target.closest("[data-event-select]");if(!b)return;eventSelectedId=b.dataset.eventSelect||"";renderEvents()});
$("eventShowcaseBody")?.addEventListener("click",e=>{
 if(e.target.closest("[data-event-open-promo]")){openPromoTeam($("eventShowcaseBody")?.dataset.eventId);return}
 if(e.target.closest("[data-event-open-team]")){openTotwTeam();return}
 const b=e.target.closest("[data-event-player]");if(!b)return;
 const selected=eventShowcases().find(x=>x.id===$("eventShowcaseBody")?.dataset.eventId);if(!selected)return;
 const entry=selected.entries()[Number(b.dataset.eventPlayer)];if(entry)openBiography(entry.item,null,entry.player)
});
// Reuse the TOTW team modal and one global lineup optimizer for every promo release.
function momentumTeamLineup(entries){return eventTeamLineup(entries)}
function promoTeamCard(entry,slot=null){
 if(!entry)return'<div class="emptyslot">LEER</div>';const out=slot&&posFit(entry.player,slot)<=0,shown=out?entry.player.position:(slot||entry.player.position);
 return `<button type="button" class="totw-player-btn ${out?"out":""}" data-promo-team-bio="${entry.index}" aria-label="${esc(entry.player.name)} Spielerbiografie öffnen">${cardHTML(entry.player,entry.item,true,shown)}${out?'<div class="poswarn">!</div>':""}</button>`
}
function openPromoTeam(eventId=""){
 const event=EVENT_PROMO_RELEASES.find(e=>e.id===eventId)||activePromoEvent();if(!event)return;
 const entries=promoEventEntries(event),lineup=eventTeamLineup(entries,{preferredFormation:event.preferredFormation||event.formation||""}),formation=lineup.formation||"4-3-3",slots=lineup.slots||FORMATIONS[formation]||FORMATIONS["4-3-3"],xi=lineup.xi||[],bench=lineup.bench||[],starters=xi.filter(Boolean);
 const rating=starters.length?Math.round(starters.reduce((n,e)=>n+Number(e?.player?.ovr||0),0)/starters.length):0;
 delete $("opponentTeamModalBody").dataset.battleEventRelease;
 $("opponentTeamModalTitle").textContent=`${event.name} ${event.subtitle||""}`.trim();
 $("opponentTeamModalSub").textContent=`${formation} · ${entries.length} Spezialkarten · ${eventPackIsActive(event)?"Event bis":"Archiv · beendet am"} ${event.activeUntil}`;
 $("opponentTeamModalBody").innerHTML=`<div class="momentum-team-overview" data-promo-release="${event.id}"><div class="totw-team-head"><div><strong>${esc(event.name)} ${esc(event.subtitle||"")}</strong><span>stärkste positionsgerechte Elf · ${bench.length} auf der Bank</span></div><span>${esc(event.activeUntil)}</span></div><div class="friend-team-summary"><div class="kpi"><strong>${rating}</strong><span>Gesamtstärke</span></div><div class="kpi"><strong>${esc(formation)}</strong><span>Formation</span></div><div class="kpi"><strong>${entries.length}</strong><span>Spieler</span></div></div><div class="pitch friend-pitch">${slots.map((slot,i)=>`<div class="friend-slot momentum-slot ${xi[i]&&posFit(xi[i].player,slot.p)<=0?"out":""}" style="left:${slot.x}%;top:${slot.y}%">${xi[i]?promoTeamCard(xi[i],slot.p):`<div class="emptyslot">${positionLabel(slot.p)}</div>`}</div>`).join("")}</div><div class="totw-section-title">Auswechselspieler</div><div class="friend-bench momentum-team-bench">${bench.map(e=>`<div>${promoTeamCard(e)}</div>`).join("")}</div></div>`;
 showUiLayer("opponentTeamModal","opponent-team")
}
// Teaser overview before the HALLOWEEN start: what arrives when, with silhouettes instead of names.
function openHalloweenPreview(){
 const ev=HALLOWEEN_EVENT,entries=promoEventEntries(ev),mystery=entries.slice().sort((a,b)=>b.player.ovr-a.player.ovr).slice(0,3);
 const rows=[["FR 30.10. · 19:00","Der Mond geht auf","18 HALLOWEEN-Spezialkarten in allen Packs, die Blutmond-Evolution (78–84 GES → bis zu +4) und das HALLOWEEN-Design im Design-Studio."],["FR 30.10. · 19:00","Objective-Spieler","Gewinne 8 Squad Battles auf Profi und hol dir 88 HALLOWEEN Rafael Leão."],["SA 31.10. · 19:00","Halloween-Nacht","Blutmond-Upgrade: jede HALLOWEEN-Karte bekommt +1 GES und +1 auf alle Werte. Dazu eine geheime Spieler-SBC – wer es ist, verrät der Blutmond erst in dieser Nacht."],["FR 06.11. · 19:00","Sonnenaufgang","Das Event endet. Gezogene Karten und ihr Upgrade bleiben dir."]];
 $("opponentTeamModalTitle").textContent="HALLOWEEN · BLUTMOND";
 $("opponentTeamModalSub").textContent="Vorschau · alle Spieler werden am 30.10. um 19:00 Uhr enthüllt";
 delete $("opponentTeamModalBody").dataset.battleEventRelease;
 $("opponentTeamModalBody").innerHTML=`<div class="halloween-preview"><div class="halloween-preview-cards home-momentum-roster teaser">${mystery.map(e=>`<div class="home-momentum-player">${cardHTML(e.player,e.item,true,e.player.position)}</div>`).join("")}</div><ol class="halloween-timeline">${rows.map(([when,title,text])=>`<li><span>${esc(when)}</span><strong>${esc(title)}</strong><p>${esc(text)}</p></li>`).join("")}</ol></div>`;
 showUiLayer("opponentTeamModal","opponent-team")
}
function openMomentumTeam(eventId=""){return openPromoTeam(eventId||activeMomentumEvent()?.id||"")}
$("opponentTeamModalBody")?.addEventListener("click",e=>{const btn=e.target.closest("[data-promo-team-bio]");if(!btn)return;const event=EVENT_PROMO_RELEASES.find(x=>x.id===btn.closest("[data-promo-release]")?.dataset.promoRelease);if(!event)return;const entry=promoEventEntries(event).find(x=>String(x.index)===String(btn.dataset.promoTeamBio));if(entry)openBiography(entry.item,null,entry.player)});
function eventPackIsActive(event,at=Date.now()){
 const start=event?.activeFrom?Date.parse(event.activeFrom):NaN,end=event?.activeUntilAt?Date.parse(event.activeUntilAt):NaN;
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return false;
 const p=berlinParts(new Date(end)),day=new Date(Date.UTC(p.year,p.month-1,p.day)).getUTCDay();
 return day===FOOTERA_EVENT_RULES.endWeekday&&p.hour===FOOTERA_EVENT_RULES.endHour&&p.minute===0&&at>=start&&at<end
}
function activePromoPackEntry(base,at=Date.now()){
 if(!base)return null;const pid=String(base.id||"");
 for(const event of EVENT_PROMO_RELEASES||[]){
  if(!eventPackIsActive(event,at))continue;
  if(!eventRosterReady(event))continue;
  const info=(event.players||[]).find(x=>String(x?.pid||x?.eaId||"")===pid);
  if(info)return{event,info}
 }
 return null
}
function makePromoPackItem(base,entry,tradeable=true){
 const event=entry?.event,info=entry?.info;if(!event||!info)return null;
 if(event.theme==="momentum")return makeMomentumItem(base,tradeable,event);
 return makeItem(base,tradeable,{variant:"special",eventType:event.theme||event.id||"promo",eventName:event.name||"Event",eventReleaseId:event.id,dynamicFace:info.dynamicFace||info.eventFace||"",eventStats:info.stats,displayRating:info.ovr,boost:Math.max(0,Number(info.ovr||base.ovr)-Number(base.ovr||0)),overridePosition:info.position||base.position,playstyleAdds:info.playstyleAdds||info.playstyles||[],playstylePlusAdds:info.playstylePlusAdds||info.playstylesPlus||[],rare:true})
}
function makeLivePackItem(base,tradeable=true){
 if(isActiveEventSbcBase(base))return makeItem(base,tradeable);
 const promo=activePromoPackEntry(base);if(promo){const special=makePromoPackItem(base,promo,tradeable);if(special)return special}
 const team=activeTotwWeek(),info=totwInfo(base);
 return team&&info?makeItem(base,tradeable,{variant:"special",eventName:team.name,boost:Math.max(0,info.ovr-base.ovr),overridePosition:info.position,rare:true,...(Number(team.id)>=5?{displayRating:info.ovr,eventStats:info.stats,eventType:"totw",eventReleaseId:`totw-${team.id}`}:{})}):makeItem(base,tradeable)
}
let promoEventClockId=null,promoObjectiveClockId="",promoEventClockTimer=0;
function schedulePromoEventClock(){
 clearTimeout(promoEventClockTimer);
 const now=Date.now(),boundaries=[...EVENT_PROMO_RELEASES,...EVENT_OBJECTIVES].flatMap(e=>[Date.parse(e.activeFrom),Date.parse(e.activeUntilAt)]).filter(t=>Number.isFinite(t)&&t>now),next=boundaries.length?Math.min(...boundaries):Infinity;
 promoEventClockTimer=setTimeout(syncPromoEventClock,Math.max(1,Math.min(60000,next-now)))
}
function syncPromoEventClock(){
 const event=activePromoEvent(),next=event?.id||"",previous=promoEventClockId;
 if(previous!==null&&next!==previous){
  promoEventClockId=next;
  if(eventSelectedId===previous)eventSelectedId=next;
  homeHeroSlide=0;squadBattleOpponentCache={key:"",list:[]};
  renderHome();
  if(currentViewId()==="eventsView")renderEvents();
  if(currentViewId()==="marketView")refreshMarket();
  if(currentViewId()==="storeView")renderStore();
  if($("squadBattleModal")?.classList.contains("active")){
   if(squadBattleStage==="selection")renderSquadBattleSelection("none");
   else if(!match&&pendingMatchContext?.opponent?.eventReleaseId){pendingMatchContext.opponent=battleSpecialOpponent("event",state.squadBattle.week);pendingMatchKitSelection=createDefaultMatchKitSelection(pendingMatchContext.opponent);refreshOpenMatchPreview()}
  }
  const team=$("opponentTeamModalBody")?.querySelector("[data-promo-release]");
  if($("opponentTeamModal")?.classList.contains("active")){
   if(team?.dataset.promoRelease===previous)openPromoTeam(event?next:previous);
   else if($("opponentTeamModalBody")?.dataset.battleEventRelease===previous)openOpponentTeam(battleSpecialOpponent("event",state.squadBattle.week))
  }
 }
 const objectiveKey=activeEventObjectives().map(t=>t.id).join("|");
 if(objectiveKey!==promoObjectiveClockId){
  promoObjectiveClockId=objectiveKey;updateObjectiveIndicators();
  if(currentViewId()==="objectivesView")renderTasks()
 }
 schedulePromoEventClock()
}
function startPromoEventClock(){promoEventClockId=activePromoEvent()?.id||"";promoObjectiveClockId=activeEventObjectives().map(t=>t.id).join("|");schedulePromoEventClock()}

const TASKS=[
 {id:"starter",title:"Club gegründet",desc:"Öffne dein Starterset.",stat:"starter",target:1,reward:{coins:750,sp:250}},
 {id:"full",title:"Kompletter Kader",desc:"Besetze Startelf und 7er-Bank.",stat:"full",target:1,reward:{pack:"gold",qty:1,sp:350}},
 {id:"match",title:"Münzen-Boost",desc:"Spiele dein erstes Match und erhalte für die nächsten 5 gewerteten Spiele jeweils +500 Coins.",stat:"matches",target:1,reward:{coinBoost:{games:5,amount:500},sp:250}},
 {id:"win",title:"Erster Sieg",desc:"Gewinne dein erstes Match.",stat:"wins",target:1,reward:{pack:"silver",qty:1,sp:300}},
 {id:"packs",title:"Pack-Fieber",desc:"Öffne 5 Packs.",stat:"packs",target:5,reward:{pack:"82",qty:1,sp:350}},
 {id:"sbc",title:"Squad Building",desc:"Schließe eine SBC ab.",stat:"sbcs",target:1,reward:{pack:"gold",qty:1,sp:400}},
 {id:"market",title:"Transfermarkt",desc:"Kaufe einen Spieler.",stat:"market",target:1,reward:{coins:1500,sp:250}},
 {id:"wins5",title:"Formkurve",desc:"Gewinne 5 Partien.",stat:"wins",target:5,reward:{pack:"82",qty:1,sp:650}},
 {id:"matches10",title:"Stammspieler",desc:"Spiele 10 Partien.",stat:"matches",target:10,reward:{coins:3500,sp:700}}
];

const SBCS=[
 {group:"Grundlagen",id:"bronze",name:"Platz zum Wachsen",desc:"11 Bronze-Spieler abgeben.",req:"11× Bronze · max. GES 64",filter:b=>rarityOf(b)==="bronze",count:11,reward:{pack:"silver",qty:1}},
 {group:"Grundlagen",id:"silver",name:"Spielaufbau",desc:"11 Silber-Spieler abgeben.",req:"11× Silber · GES 65–74",filter:b=>rarityOf(b)==="silver",count:11,reward:{pack:"gold",qty:1}},
 {group:"Verbesserungen",id:"gold",name:"Gold-Upgrade",desc:"Tausche überschüssige Goldkarten gegen zwei 82+-Packs.",req:"11× Gold · min. 2 selten",filter:b=>rarityOf(b)==="gold",count:11,minRare:2,reward:{pack:"82",qty:2}},
 {group:"Verbesserungen",id:"83squad",name:"82+ Upgrade",desc:"Ein günstigeres Upgrade für gemischte Vereinsbestände.",req:"11 Spieler · min. 6 Gold · Ø GES 78 · min. 1 selten",filter:b=>true,count:11,minGold:6,minAvg:78,minRare:1,reward:{pack:"82",qty:1}},
 {group:"Ligen",id:"sameleague",name:"Ligaverbindung",desc:"11 Goldspieler aus einer Liga.",req:"11 Gold · gleiche Liga",filter:b=>rarityOf(b)==="gold",count:11,sameLeague:true,reward:{coins:3500,pack:"82",qty:1}}
];

const GRIND_SBC_TEMPLATES_4D=[{"key":"kern","name":"Kaderkern 83+","req":"11 Spieler · Ø GES 82 · 2 selten","minAvg":82,"minRare":2,"reward":{"pack":"83x3-sbc","qty":1},"desc":"Vier-Tage-Challenge · 11 Spieler · Ø GES 82 · 2 selten"},{"key":"klasse","name":"84er-Auswahl","req":"11 Spieler · Ø GES 83 · 3 selten","minAvg":83,"minRare":3,"reward":{"pack":"84x3-sbc","qty":1},"desc":"Vier-Tage-Challenge · 11 Spieler · Ø GES 83 · 3 selten"},{"key":"elite","name":"Elite-Garantien","req":"11 Spieler · Ø GES 85 · 5 selten","minAvg":85,"minRare":5,"reward":{"pack":"2x86","qty":1},"desc":"Vier-Tage-Challenge · 11 Spieler · Ø GES 85 · 5 selten"},{"key":"fluegel","name":"Internationale Elf","req":"11 Spieler · Ø GES 82 · 3 Ligen · 6 Vereine","minAvg":82,"minLeagues":3,"minClubs":6,"reward":{"pack":"83x3-sbc","qty":1},"desc":"Vier-Tage-Challenge · 11 Spieler · Ø GES 82 · 3 Ligen · 6 Vereine"},{"key":"chemie","name":"Chemiewerkstatt","req":"11 Spieler · Ø GES 81 · 22 Chemie","minAvg":81,"minChem":22,"reward":{"pack":"primegold","qty":1},"desc":"Vier-Tage-Challenge · 11 Spieler · Ø GES 81 · 22 Chemie"},{"key":"topelf","name":"Top-Elf 84","req":"11 Spieler · Ø GES 84 · 4 selten","minAvg":84,"minRare":4,"reward":{"pack":"85x2-sbc","qty":1},"desc":"Vier-Tage-Challenge · 11 Spieler · Ø GES 84 · 4 selten"}];
const GRIND_SBC_TEMPLATES_3D=[{"key":"diversity","name":"Vereinsmix","desc":"Baue ein Team aus mehreren Ligen und Vereinen.","req":"11 Spieler · Ø GES 79 · 4 Ligen · 7 Vereine","minAvg":79,"minLeagues":4,"minClubs":7,"reward":{"pack":"prime-electrum-reward","qty":1}},{"key":"rarity","name":"Seltenes Investment","desc":"Fünf seltene Karten gegen zwei gute Spielerpacks.","req":"11 Spieler · Ø GES 81 · 5 selten","minAvg":81,"minRare":5,"reward":{"pack":"82","qty":2}},{"key":"tripler","name":"83+-Dreierpack","desc":"Drei garantierte 83+ Spieler verdienen.","req":"11 Spieler · Ø GES 82 · 3 selten","minAvg":82,"minRare":3,"reward":{"pack":"83x3-sbc","qty":1}}];
const GRIND_SBC_REPEATABLE={"key":"recycle","name":"Gold-Recycling","desc":"Wiederholbar: Tausche Goldkarten gegen drei garantierte 81+ Spieler.","req":"11 Gold · Ø GES 80 · 2 selten","minAvg":80,"minGold":11,"minRare":2,"reward":{"pack":"81x3-sbc","qty":1}};

const MARQUEE_ROTATIONS=[
 [
  {name:"Bayern München – Borussia Dortmund",league:"Bundesliga",nation:"Germany",clubs:[["Bayern München","FC Bayern München","Bayern Munich"],["Borussia Dortmund","Dortmund"]]},
  {name:"Liverpool – Chelsea",league:"Premier League",nation:"England",clubs:[["Liverpool","Liverpool FC"],["Chelsea","Chelsea FC"]]},
  {name:"Real Madrid – FC Barcelona",league:"LALIGA EA SPORTS",nation:"Spain",clubs:[["Real Madrid","Real Madrid CF"],["FC Barcelona","Barcelona"]]},
  {name:"Inter – AC Milan",league:"Serie A",nation:"Italy",clubs:[["Inter","Inter Milan","Internazionale"],["Milan","AC Milan"]]}
 ],
 [
  {name:"Juventus – Napoli",league:"Serie A",nation:"Italy",clubs:[["Juventus","Juventus FC"],["Napoli","SSC Napoli"]]},
  {name:"Paris Saint-Germain – Marseille",league:"Ligue 1",nation:"France",clubs:[["Paris Saint-Germain","Paris SG","PSG"],["Olympique de Marseille","Marseille"]]},
  {name:"Leverkusen – RB Leipzig",league:"Bundesliga",nation:"Germany",clubs:[["Bayer 04 Leverkusen","Bayer Leverkusen","Leverkusen"],["RB Leipzig","Leipzig"]]},
  {name:"Arsenal – Manchester City",league:"Premier League",nation:"England",clubs:[["Arsenal","Arsenal FC"],["Manchester City","Man City"]]}
 ],
 [
  {name:"Atlético Madrid – Real Madrid",league:"LALIGA EA SPORTS",nation:"Spain",clubs:[["Atletico de Madrid","Atlético Madrid","Atletico Madrid"],["Real Madrid","Real Madrid CF"]]},
  {name:"Roma – Lazio",league:"Serie A",nation:"Italy",clubs:[["Roma","AS Roma"],["Lazio","SS Lazio"]]},
  {name:"Monaco – Paris Saint-Germain",league:"Ligue 1",nation:"France",clubs:[["AS Monaco","Monaco"],["Paris Saint-Germain","Paris SG","PSG"]]},
  {name:"Manchester United – Liverpool",league:"Premier League",nation:"England",clubs:[["Manchester United","Man United","Man Utd"],["Liverpool","Liverpool FC"]]}
 ]
];

function sbcDateKey(d){const p=berlinParts(d);return `${p.year}-${String(p.month).padStart(2,"0")}-${String(p.day).padStart(2,"0")}`}
function sbcWeeklyWindowStart(now=new Date(),weekday=4,hour=19){
 return berlinWeekStart(now,weekday,hour)
}
function sbcWeeklyWindowKey(now=new Date()){return sbcDateKey(sbcWeeklyWindowStart(now,4,19))}
function nextSbcWeeklyReset(now=new Date()){
 return berlinShiftDays(sbcWeeklyWindowStart(now,4,19),7,19)
}
function sbcRotationWindow(now=new Date(),days=4){
 const p=berlinParts(now),anchor=Date.UTC(2026,9,14),day=Date.UTC(p.year,p.month-1,p.day);
 const cycle=Math.floor(Math.round((day-anchor)/86400000)/days),d=new Date(anchor+cycle*days*86400000);
 const start=berlinInstant(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),0);
 return{key:sbcDateKey(start),expiresAt:berlinShiftDays(start,days,0).getTime()};
}
function activeGrindSBCs(now=new Date()){
 const w4=sbcRotationWindow(now,4),w3=sbcRotationWindow(now,3);
 const pick=(pool,window,n)=>[...pool].sort((a,b)=>hashNum(window.key+"|"+a.key)-hashNum(window.key+"|"+b.key)).slice(0,n).map((v,i)=>({...v,id:"grind_"+window.key+"_"+v.key,group:"Grind",filter:b=>true,count:11,once:true,live:true,expiresAt:window.expiresAt,releaseKey:window.key,order:i}));
 return[...pick(GRIND_SBC_TEMPLATES_4D,w4,4),...pick(GRIND_SBC_TEMPLATES_3D,w3,2),{...GRIND_SBC_REPEATABLE,id:"grind_"+w3.key+"_recycle",group:"Grind",filter:b=>true,count:11,once:false,live:true,expiresAt:w3.expiresAt,releaseKey:w3.key,order:9}];
}
// Tägliche SBCs: every day at 19:00 three fresh, quick challenges (easy, medium, highlight) with rotating reward packs.
const DAILY_SBC_TEMPLATES={
 easy:[
  {key:"bronzeblitz",name:"Bronze-Blitz",desc:"Schnell erledigt: 11 Bronzekarten gegen Silber.",req:"11× Bronze",filter:b=>rarityOf(b)==="bronze",reward:{pack:"silver",qty:2}},
  {key:"silbersprint",name:"Silber-Sprint",desc:"11 Silberkarten mit etwas Chemie.",req:"11× Silber · 12 Chemie",filter:b=>rarityOf(b)==="silver",minChem:12,reward:{pack:"gold",qty:1}},
  {key:"bunt",name:"Bunte Truppe",desc:"Irgendwelche 11, Hauptsache aus vielen Ländern.",req:"11 Spieler · min. 5 Nationen",minNations:5,reward:{pack:"silver",qty:2}},
  {key:"bundesabend",name:"Bundesliga-Abend",desc:"Ein Abend in der Bundesliga.",req:"11 Spieler · min. 4 aus Bundesliga",matchLeague:"Bundesliga",minMatchLeaguePlayers:4,reward:{pack:"gold",qty:1}},
  {key:"premierabend",name:"Premier-League-Abend",desc:"Ein Abend auf der Insel.",req:"11 Spieler · min. 4 aus Premier League",matchLeague:"Premier League",minMatchLeaguePlayers:4,reward:{pack:"gold",qty:1}}
 ],
 medium:[
  {key:"weltauswahl",name:"Weltauswahl",desc:"Ein Team quer über den Globus.",req:"11 Spieler · min. 6 Nationen · Ø GES 75",minNations:6,minAvg:75,reward:{pack:"premium-electrum-reward",qty:1}},
  {key:"chemiecheck",name:"Chemie-Check",desc:"Passt das zusammen?",req:"11 Spieler · Ø GES 74 · 24 Chemie",minAvg:74,minChem:24,reward:{pack:"small-prime-gold",qty:1}},
  {key:"ligentour",name:"Ligen-Tour",desc:"Fünf Ligen, viele Vereine.",req:"11 Spieler · min. 5 Ligen · min. 8 Vereine · Ø GES 74",minLeagues:5,minClubs:8,minAvg:74,reward:{pack:"premium-electrum-reward",qty:1}},
  {key:"heimatliebe",name:"Heimatliebe",desc:"Wenige Länder, viel Zusammenhalt.",req:"11 Spieler · max. 3 Nationen · Ø GES 74",maxNations:3,minAvg:74,reward:{pack:"small-prime-gold",qty:1}},
  {key:"laliganacht",name:"LALIGA-Nacht",desc:"Spanische Nacht mit Gold.",req:"11 Spieler · min. 4 aus LALIGA EA SPORTS · Ø GES 76",matchLeague:"LALIGA EA SPORTS",minMatchLeaguePlayers:4,minAvg:76,reward:{pack:"82",qty:1}},
  {key:"serieanacht",name:"Serie-A-Nacht",desc:"Calcio unter Flutlicht.",req:"11 Spieler · min. 4 aus Serie A · Ø GES 76",matchLeague:"Serie A",minMatchLeaguePlayers:4,minAvg:76,reward:{pack:"82",qty:1}}
 ],
 highlight:[
  {key:"seltenesieben",name:"Seltene Sieben",desc:"Tageshighlight: sieben seltene Karten.",req:"11 Spieler · min. 7 selten · Ø GES 79",minRare:7,minAvg:79,reward:{pack:"83x3-sbc",qty:1}},
  {key:"goldjunge",name:"Goldjunge",desc:"Tageshighlight: starkes Gold mit Chemie.",req:"11 Spieler · min. 9 Gold · Ø GES 80 · 22 Chemie",minGold:9,minAvg:80,minChem:22,reward:{pack:"prime-electrum-reward",qty:1}},
  {key:"topklasse",name:"Topklasse",desc:"Tageshighlight für volle Vereine.",req:"11 Spieler · Ø GES 82 · 2 selten",minAvg:82,minRare:2,reward:{pack:"84x3-sbc",qty:1}},
  {key:"jumbotag",name:"Jumbo-Tag",desc:"Tageshighlight mit großem Goldpack.",req:"11 Spieler · Ø GES 78 · min. 4 Ligen · 20 Chemie",minAvg:78,minLeagues:4,minChem:20,reward:{pack:"jumbo-gold",qty:1}}
 ]
};
function activeDailySBCs(now=new Date()){
 const key=promoWindowKey(now,19),expiresAt=nextPromoReset(now,19).getTime();
 return ["easy","medium","highlight"].map((tier,order)=>{
  const pool=DAILY_SBC_TEMPLATES[tier],t=[...pool].sort((a,b)=>hashNum(key+"|"+tier+"|"+a.key)-hashNum(key+"|"+tier+"|"+b.key))[0];
  return{filter:b=>true,...t,id:`daily_${key}_${t.key}`,group:"Täglich",dailyTier:tier,count:11,once:true,live:true,expiresAt,releaseKey:key,order}
 })
}
function marqueeClubMatch(team,aliases){const key=normalizeKey(team||"");return (aliases||[]).some(a=>normalizeKey(a)===key)}
function marqueeLeagueMatch(league,target){const a=normalizeKey(league||""),b=normalizeKey(target||"");return !!a&&!!b&&(a===b||a.startsWith(b+" ")||b.startsWith(a+" "))}
function activeMarqueeSBCs(now=new Date()){
 const cycle=sbcRotationWindow(now,4),key=cycle.key,end=new Date(cycle.expiresAt),rotation=MARQUEE_ROTATIONS[hashNum(key)%MARQUEE_ROTATIONS.length],groupSet=`top_partien_${key}`,groupReward={pack:"primegold",qty:1};
 return rotation.map((match,i)=>{
  const common={group:"Top-Partien",id:`${groupSet}_${i+1}`,name:match.name,desc:`Top-Partien Aufgabe ${i+1}/4 · wöchentlich erneuert.`,filter:b=>true,count:11,once:true,live:true,groupSet,groupReward,expiresAt:end.getTime(),releaseKey:key,order:i,matchLeague:match.league,matchNation:match.nation,matchClubs:match.clubs};
  if(i===0)return{...common,req:`11 Spieler · min. 1 ${nationLabel(match.nation)} · min. 3 Ligen · max. 4 gleicher Verein · Ø GES 74 · 14 Chemie`,requiredNation:match.nation,minLeagues:3,maxSameClub:4,minAvg:74,minChem:14,reward:{pack:"jumbo-gold",qty:1}};
  if(i===1)return{...common,req:`11 Spieler · min. 2 aus ${match.league} · min. 3 Nationen · min. 5 Vereine · Ø GES 76 · 18 Chemie`,minMatchLeaguePlayers:2,minNations:3,minClubs:5,minAvg:76,minChem:18,reward:{pack:"premium-electrum-reward",qty:1}};
  if(i===2)return{...common,req:`11 Spieler · min. 1 aus einem beteiligten Verein · max. 4 Nationen · min. 3 aus ${match.league} · min. 1 selten · Ø GES 78 · 22 Chemie`,minEitherMatchClub:1,maxNations:4,minMatchLeaguePlayers:3,minRare:1,minAvg:78,minChem:22,reward:{pack:"small-prime-gold",qty:1}};
  return{...common,req:`11 Spieler · min. 1 aus beiden beteiligten Vereinen · min. 2 selten · Ø GES 80 · 26 Chemie`,requireBothMatchClubs:true,minRare:2,minAvg:80,minChem:26,reward:{pack:"prime-electrum-reward",qty:1}}
 })
}
function activeEventPlayerSBCs(now=new Date()){
 const ts=now instanceof Date?now.getTime():Number(now),out=[];
 for(const event of EVENT_PROMO_RELEASES){
  const def=event.sbcPlayer;if(!def)continue;const start=Date.parse(def.releaseAt),end=Date.parse(def.activeUntilAt||event.activeUntilAt);
  if(!Number.isFinite(start)||ts<start||(Number.isFinite(end)&&ts>=end))continue;
  if(eventSbcTotwConflictAtRelease(event,def))continue;
  const groupSet=`event_player_${event.id}_${def.id}`,groupReward={playerReward:{eventId:event.id,playerId:def.id}};
  const segments=Array.isArray(def.segments)?def.segments:[
   {name:"MOMENTUM – 83er-Team",desc:`Teil 1/2 für ${def.name}.`,req:"11 Spieler · Ø GES 83 · min. 1 selten",minAvg:83,minRare:1,reward:{pack:"gold",qty:1}},
   {name:"MOMENTUM – 84er-Team",desc:`Teil 2/2 für ${def.name}.`,req:"11 Spieler · Ø GES 84 · min. 2 selten",minAvg:84,minRare:2,reward:{pack:"82",qty:1}}
  ];
  segments.forEach((seg,i)=>out.push({group:"Profis",id:`${groupSet}_${i+1}`,...seg,filter:b=>true,count:11,once:true,live:true,eventSbc:true,eventId:event.id,eventPlayerId:def.id,eventPlayer:def,groupSet,groupReward,expiresAt:end,releaseKey:def.releaseAt,order:i}))
 }
 return out
}
function allActiveSBCs(now=new Date()){return [...(globalThis.FooteraPotm?.activeSBCs(now)||[]),...activeEventPlayerSBCs(now),...activeDailySBCs(now),...activeGrindSBCs(now),...activeMarqueeSBCs(now),...SBCS]}
function getActiveSbcById(id){return allActiveSBCs().find(x=>x.id===id)||null}
function sbcIsCompleted(sbc){return !!(sbc?.once&&state.sbcCompletions?.[sbc.id])}
function sbcTimeLeft(ts){
 const ms=Math.max(0,Number(ts||0)-Date.now()),mins=Math.ceil(ms/60000),days=Math.floor(mins/1440),hours=Math.floor((mins%1440)/60),m=mins%60;
 return days?`${days} T ${hours} Std`:`${hours} Std ${m} Min`
}
function sbcReleaseScheduleLabel(iso){
 const d=new Date(iso);if(!Number.isFinite(d.getTime()))return"19:00";
 return new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",weekday:"long",hour:"2-digit",minute:"2-digit",hour12:false}).format(d).replace(",","").toUpperCase()
}
function sbcGroupProgress(groupSet){
 const rows=allActiveSBCs().filter(x=>x.groupSet===groupSet),done=rows.filter(sbcIsCompleted).length;return{rows,done,total:rows.length}
}
// Event names for player SBC banners; MOMENTUM stays the fallback for older event rows.
function eventSbcEventLabel(eventId){return EVENT_PROMO_RELEASES.find(e=>e.id===eventId&&e.sbcPlayer)?.name||"MOMENTUM"}
function eventSbcNamedTitle(sample){return [FLASHBACK_REUS_EVENT.id,HALLOWEEN_EVENT.id].includes(sample?.eventId)&&sample.eventPlayer?`${eventSbcEventLabel(sample.eventId)} · ${sample.eventPlayer.name}`:""}
function eventSbcRewardDefinition(reward){
 const event=EVENT_PROMO_RELEASES.find(e=>e.id===reward?.playerReward?.eventId),def=event?.sbcPlayer;
 return event&&def&&def.id===reward?.playerReward?.playerId?{event,def}:null
}
function eventSbcRewardBase(event,def){
 const base=def.id===FLASHBACK_REUS_EVENT.sbcPlayer.id?(P_BY_ID.get(FLASHBACK_REUS_BASE.id)||{...FLASHBACK_REUS_BASE}):eventResolveBase({...def,names:def.names||[def.name]},0,`sbc-${event.id}`);
 P_BY_ID.set(String(base.id),base);return base
}
function makeEventSbcRewardItem(reward){
 const found=eventSbcRewardDefinition(reward);if(!found)return null;
 const {event,def}=found,base=eventSbcRewardBase(event,def);
 return makeItem(base,false,{variant:"special",eventType:`${event.theme||event.id}-sbc`,eventName:event.name,dynamicFace:def.dynamicFace||"",overridePosition:def.position||base.position,displayRating:def.ovr,eventStats:def.stats,playstyleAdds:def.playstyleAdds||[],playstylePlusAdds:def.playstylePlusAdds||[],rare:true,acquisitionSource:"SBC"})
}
function eventDisplayOvr(eventId,ovr){return Number(ovr||0)+(String(eventId||"").startsWith("halloween")?Number(halloweenUpgradeFor({eventType:"halloween"})?.ovr||0):0)}
function eventSbcRewardLabel(reward){
 const found=eventSbcRewardDefinition(reward);return found?`${eventDisplayOvr(found.event.id,found.def.ovr)} ${found.event.name} ${found.def.name}`:"Event-Spieler"
}
function sbcGroupBannerHTML(group,rows){
 if(!rows.length)return"";
 if(group==="Täglich")return `<div class="sbc-live-banner daily"><div><span class="sbc-live-kicker">TÄGLICH NEU · NOCH ${esc(sbcTimeLeft(rows[0].expiresAt)).toUpperCase()}</span><h3>Drei frische SBCs pro Tag.</h3><p>Eine schnelle, eine mittlere und ein Tageshighlight. Jeden Abend um 19:00 Uhr kommen neue Aufgaben und andere Packs.</p></div></div>`;
 if(group==="Grind")return `<div class="sbc-live-banner"><div><span class="sbc-live-kicker">SBC GRIND · 3–4 TAGE</span><h3>Neue SBCs. Bessere Packs.</h3><p>Neue 3- und 4-Tage-Challenges mit starken Belohnungen. Gold-Recycling ist wiederholbar; alle anderen Aufgaben sind pro Rotation einmalig.</p></div></div>`;
 const sample=rows[0],p=sbcGroupProgress(sample.groupSet),claimed=!!state.sbcGroupClaims?.[sample.groupSet];
 if(group==="Profis"&&sample.eventSbc){
  const def=sample.eventPlayer,reward=`${def.ovr} ${eventSbcEventLabel(sample.eventId)} ${def.name}`;
  return `<div class="sbc-live-banner"><div><span class="sbc-live-kicker">EVENT-SBC · ${esc(sbcReleaseScheduleLabel(def.releaseAt))}</span><h3>${eventSbcEventLabel(sample.eventId)} · ${esc(def.name)}</h3><p>Schließe alle ${p.total} Teams ab. Jede Teil-SBC gibt ein Pack; danach erhältst du die untauschbare Event-Spielerkarte.</p><div class="sbc-live-meta"><b>${p.done}/${p.total} abgeschlossen</b><span>Gruppenbelohnung: ${esc(reward)}</span><span>${claimed?"Belohnung abgeholt":`Noch ${sbcTimeLeft(sample.expiresAt)}`}</span></div></div></div>`
 }
 if(group!=="Top-Partien")return"";
 const reward=sbcRewardText(sample.groupReward);
 return `<div class="sbc-live-banner"><div><span class="sbc-live-kicker">ALLE 4 TAGE · NEUE AUFGABEN</span><h3>Top-Partien</h3><p>Schließe alle vier Aufgaben ab. Jede SBC gibt ein Pack, danach folgt die Gruppenbelohnung.</p><div class="sbc-live-meta"><b>${p.done}/${p.total} abgeschlossen</b><span>Gruppenbelohnung: ${esc(reward)}</span><span>${claimed?"Belohnung abgeholt":`Noch ${sbcTimeLeft(sample.expiresAt)}`}</span></div></div></div>`
}

function newFooteraSaveId(){const raw=(globalThis.crypto?.randomUUID?.()||uid()+uid()).replace(/[^a-z0-9]/gi,"").toUpperCase();return "GF-"+raw.slice(0,16)}
function defaultClubIdentity(){return{
 crest:{shape:"shield",symbol:"star",primary:"#d8ff3e",secondary:"#173627",accent:"#ffffff",borderColor:"#d8ff3e",borderWidth:"medium",symbolColor:"#ffffff",textColor:"#ffffff",field:"solid",decoration:"none",stars:0,initials:"F"},
 colors:{primary:"#d8ff3e",secondary:"#173627",accent:"#ffffff"},
 kits:{
  home:{pattern:"solid",shirtPrimary:"#d8ff3e",shirtSecondary:"#173627",shorts:"#111714",socks:"#d8ff3e"},
  away:{pattern:"diagonal",shirtPrimary:"#f1f4f2",shirtSecondary:"#173627",shorts:"#f1f4f2",socks:"#173627"}
 }
}}
function safeClubHex(value,fallback){return /^#[0-9a-f]{6}$/i.test(String(value||""))?String(value).toLowerCase():fallback}
function cleanClubKit(src,def){src=src&&typeof src==="object"?src:{};return{pattern:["solid","stripes","hoops","diagonal","halves","sleeves","center","pinstripes","quarters","chevron","chestband","shoulders","sidepanels","reverse","doubleband","checkers","diamonds","fade","splitstripe","cuffs"].includes(src.pattern)?src.pattern:def.pattern,shirtPrimary:safeClubHex(src.shirtPrimary,def.shirtPrimary),shirtSecondary:safeClubHex(src.shirtSecondary,def.shirtSecondary),shorts:safeClubHex(src.shorts,def.shorts),socks:safeClubHex(src.socks,def.socks)}}
function cleanClubIdentity(raw){
 const d=defaultClubIdentity(),x=raw&&typeof raw==="object"?raw:{},crest=x.crest&&typeof x.crest==="object"?x.crest:{},colors=x.colors&&typeof x.colors==="object"?x.colors:{},kits=x.kits&&typeof x.kits==="object"?x.kits:{};

 return{crest:{shape:["shield","round","hex","point","modern","oval","diamond"].includes(crest.shape)?crest.shape:d.crest.shape,symbol:["star","ball","bolt","diamond","crown","f","eagle","lion","wolf","flame","trophy","anchor","castle","sun","moon","cross","comet","skull","bull","bear","fox","horse","dragon","shark","snake","owl","scorpion","swords","shieldmark","fleur","gear","mountain","trident","target","waves","ram"].includes(crest.symbol)?crest.symbol:d.crest.symbol,primary:safeClubHex(crest.primary||colors.primary,d.crest.primary),secondary:safeClubHex(crest.secondary||colors.secondary,d.crest.secondary),accent:safeClubHex(crest.accent||colors.accent,d.crest.accent),borderColor:safeClubHex(crest.borderColor||crest.primary||colors.primary,d.crest.borderColor),borderWidth:["thin","medium","strong","massive"].includes(crest.borderWidth)?crest.borderWidth:d.crest.borderWidth,symbolColor:safeClubHex(crest.symbolColor||crest.accent||colors.accent,d.crest.symbolColor),textColor:safeClubHex(crest.textColor,d.crest.textColor),field:["solid","split","stripes","diagonal","quarters"].includes(crest.field)?crest.field:"solid",decoration:crest.decoration==="laurel"?"laurel":"none",stars:[0,1,2,3].includes(Number(crest.stars))?Number(crest.stars):0,initials:String(crest.initials||"F").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,5)||"F"},colors:{primary:safeClubHex(colors.primary,d.colors.primary),secondary:safeClubHex(colors.secondary,d.colors.secondary),accent:safeClubHex(colors.accent,d.colors.accent)},kits:{home:cleanClubKit(kits.home,d.kits.home),away:cleanClubKit(kits.away,d.kits.away)}}
}
function ensureClubIdentityState(){
 state.profile=state.profile||{};
 state.profile.clubIdentity=cleanClubIdentity(state.profile.clubIdentity);
 let short=String(state.profile.clubShortName||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4);
 if(short.length<2){const parts=String(state.profile.clubName||"Footera Club").trim().split(/\s+/).filter(Boolean);short=(parts.map(x=>x[0]).join("")||"FTR").toUpperCase().slice(0,4);if(short.length<2)short="FC"}
 state.profile.clubShortName=short;
 return state.profile.clubIdentity
}
function clubIdentitySnapshot(){ensureClubIdentityState();return JSON.parse(JSON.stringify(state.profile.clubIdentity))}
function baseState(){return{
 version:128,onboarded:false,starterLeague:"",coins:5000,points:0,sp:0,formation:"4-3-3",tactic:"balanced",club:[],squad:Array(23).fill(null),activeSquadPreset:0,squadPresets:[null,null,null],packs:{},
 stats:{starter:0,full:0,matches:0,wins:0,draws:0,losses:0,competitiveMatches:0,competitiveWins:0,rivalsMatches:0,rivalsWins:0,championsMatches:0,championsWins:0,squadMatches:0,squadWins:0,packs:0,sbcs:0,market:0,friendlies:0,friendlyWins:0},rivals:{division:10,points:0},champions:null,squadBattle:null,weeklyRewards:[],rewardPackQueue:[],claims:{},seasonClaims:{},seasonPass:null,storyPassPending:[],storyPassGranted:{},objectiveWindows:{},objectiveClaims:{},objectiveBonuses:{},eventObjectives:{},
 roles:{},focus:{},activeEvo:null,activeEvos:[],evoProgress:{},evoHistory:[],profile:{username:"",clubName:"Footera Club",clubShortName:"FTR",clubIdentity:defaultClubIdentity(),saveId:newFooteraSaveId()},friends:[],auctions:[],transferList:[],transferSales:[],sbcStorage:[],sbcCompletions:{},sbcGroupClaims:{},pendingPack:[],pendingResolved:[],chemBoostInventory:{},pendingChemBoosts:[],promoClaims:{},directClaims:{},paidPackClaims:{},packLimits:{},coinBoost:{games:0,amount:0},coinBoostQueue:[]
}}
function loadState(){
 try{
  const x=JSON.parse(localStorage.getItem("gerliesFutV9")||localStorage.getItem("uc27v7")||"null"),b=baseState();
  return migrateLegacyEventState(initializeSquadPresets(x?{...b,...x,version:128,squad:Array.from({length:23},(_,i)=>Array.isArray(x.squad)?(x.squad[i]??null):null),stats:{...b.stats,...(x.stats||{})},rivals:{...b.rivals,...(x.rivals||{})},packs:{...(x.packs||{})},claims:{...(x.claims||{})},seasonClaims:{...(x.seasonClaims||{})},roles:{...(x.roles||{})},focus:{...(x.focus||{})},activeEvo:null,activeEvos:Array.isArray(x.activeEvos)?x.activeEvos.filter(Boolean).slice(0,3):(x.activeEvo?[x.activeEvo]:[]),evoProgress:{...(x.evoProgress||{})},evoHistory:Array.isArray(x.evoHistory)?x.evoHistory:[],profile:{...b.profile,...(x.profile||{})},friends:Array.isArray(x.friends)?x.friends:[],auctions:Array.isArray(x.auctions)?x.auctions:[],transferList:Array.isArray(x.transferList)?x.transferList:[],transferSales:Array.isArray(x.transferSales)?x.transferSales:[],sbcStorage:Array.isArray(x.sbcStorage)?x.sbcStorage:[],sbcCompletions:{...(x.sbcCompletions||{})},sbcGroupClaims:{...(x.sbcGroupClaims||{})},weeklyRewards:Array.isArray(x.weeklyRewards)?x.weeklyRewards:[],rewardPackQueue:Array.isArray(x.rewardPackQueue)?x.rewardPackQueue:[],pendingPack:Array.isArray(x.pendingPack)?x.pendingPack:[],pendingResolved:Array.isArray(x.pendingResolved)?x.pendingResolved:[],promoClaims:{...(x.promoClaims||{})},directClaims:{...(x.directClaims||{})},paidPackClaims:{...(x.paidPackClaims||{})},packLimits:{...(x.packLimits||{})},coinBoost:{...b.coinBoost,...(x.coinBoost||{})}}:b))
 }catch(e){return migrateLegacyEventState(initializeSquadPresets(baseState()))}
}
function squadPresetName(name,index){return String(name||'').trim().slice(0,24)||`Team ${index+1}`}
function cleanSquadPreset(raw,clubIds,index){
 const seen=new Set(),squad=Array.from({length:23},(_,i)=>{
  const uid=Array.isArray(raw?.squad)?raw.squad[i]:null;
  if(typeof uid!=="string"||!uid||seen.has(uid)||!clubIds.has(uid))return null;
  seen.add(uid);return uid
 });
 const positions=squad.slice(0,11);
 const entries=values=>Object.fromEntries(Object.entries(values&&typeof values==="object"&&!Array.isArray(values)?values:{}).filter(([key,value])=>/^(10|[0-9])$/.test(key)&&positions[Number(key)]&&typeof value==="string"));
 return{name:squadPresetName(raw?.name,index),formation:SQUAD_FORMATION_NAMES.includes(raw?.formation)?raw.formation:"4-3-3",tactic:["balanced","attacking","defensive"].includes(raw?.tactic)?raw.tactic:"balanced",squad,roles:entries(raw?.roles),focus:entries(raw?.focus)}
}
function initializeSquadPresets(s){
 const idx=Number.isInteger(s.activeSquadPreset)&&s.activeSquadPreset>=0&&s.activeSquadPreset<3?s.activeSquadPreset:0;
 const clubIds=new Set((Array.isArray(s.club)?s.club:[]).map(item=>item?.uid).filter(Boolean)),saved=Array.isArray(s.squadPresets)?s.squadPresets:[];
 s.activeSquadPreset=idx;s.squadPresets=Array.from({length:3},(_,i)=>saved[i]?cleanSquadPreset(saved[i],clubIds,i):null);
 const active=cleanSquadPreset({name:s.squadPresets[idx]?.name||(idx===0?"Mein Team":`Team ${idx+1}`),formation:s.formation,tactic:s.tactic,squad:s.squad,roles:s.roles,focus:s.focus},clubIds,idx);
 s.squadPresets[idx]=active;s.squad=[...active.squad];s.formation=active.formation;s.tactic=active.tactic;s.roles={...active.roles};s.focus={...active.focus};
 return s
}
function persistActiveSquadPreset(s){return initializeSquadPresets(s)}
function activateSquadPreset(s,index){
 if(!Number.isInteger(index)||index<0||index>=3||index===s.activeSquadPreset)return null;
 persistActiveSquadPreset(s);
 const created=!s.squadPresets[index],clubIds=new Set((s.club||[]).map(item=>item.uid));
 const next=s.squadPresets[index]||cleanSquadPreset({...s.squadPresets[s.activeSquadPreset],name:`Team ${index+1}`},clubIds,index);
 s.squadPresets[index]=next;s.activeSquadPreset=index;s.squad=[...next.squad];s.formation=next.formation;s.tactic=next.tactic;s.roles={...next.roles};s.focus={...next.focus};
 return{created,name:next.name}
}
let saveQueued=false,saveDirty=false,saveTimer=0;
function flushSave(){
 if(window.FooteraAccountReplacingSave)return;
 if(!saveDirty&&!saveQueued)return;
 clearTimeout(saveTimer);saveTimer=0;saveQueued=false;saveDirty=false;
 persistActiveSquadPreset(state);
 try{localStorage.setItem("gerliesFutV9",JSON.stringify(state))}catch(e){console.warn("Spielstand konnte nicht gespeichert werden",e)}
}
function save(){
 if(window.FooteraAccountReplacingSave)return;
 saveDirty=true;
 if(saveQueued)return;
 saveQueued=true;
 saveTimer=setTimeout(flushSave,140)
}
window.addEventListener("pagehide",flushSave);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flushSave()})
function toast(t){const e=$("toast");e.textContent=t;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),1800)}

function openIDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open("GFUTPlayerDB1856",1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains("players"))db.createObjectStore("players",{keyPath:"id"});if(!db.objectStoreNames.contains("meta"))db.createObjectStore("meta",{keyPath:"key"})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function idbCount(){const db=await openIDB();return new Promise((res,rej)=>{const t=db.transaction("players","readonly"),r=t.objectStore("players").count();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function idbAll(){const db=await openIDB();return new Promise((res,rej)=>{const t=db.transaction("players","readonly"),r=t.objectStore("players").getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function idbMetaGet(key){const db=await openIDB();return new Promise((res,rej)=>{const r=db.transaction("meta","readonly").objectStore("meta").get(key);r.onsuccess=()=>res(r.result?.value);r.onerror=()=>rej(r.error)})}
async function idbMetaPut(key,value){const db=await openIDB();return new Promise((res,rej)=>{const t=db.transaction("meta","readwrite");t.objectStore("meta").put({key,value});t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
async function idbClear(){const db=await openIDB();return new Promise((res,rej)=>{const t=db.transaction(["players","meta"],"readwrite");t.objectStore("players").clear();t.objectStore("meta").clear();t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
async function idbPutMany(arr){if(!arr?.length)return;const db=await openIDB();return new Promise((res,rej)=>{const t=db.transaction("players","readwrite"),s=t.objectStore("players");for(const p of arr)s.put(p);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}

let PLAYER_ARRAY_INDEX=new Map(),PLAYER_TEAM_INDEX=new Map(),PLAYER_TEAM_SIG_INDEX=new Map(),PLAYER_LEAGUE_INDEX=new Map(),PLAYER_POSITION_RATING_INDEX=new Map(),PLAYER_RATING_INDEX=new Map();
function addRuntimeIndex(map,key,p){if(!key)return;let rows=map.get(key);if(!rows)map.set(key,rows=[]);rows.push(p)}
function removeRuntimeIndex(map,key,p){if(!key)return;const rows=map.get(key);if(!rows)return;const i=rows.indexOf(p);if(i>=0)rows.splice(i,1);if(!rows.length)map.delete(key)}
function rebuildPlayerRuntimeIndexes(){
 PLAYER_ARRAY_INDEX=new Map();PLAYER_TEAM_INDEX=new Map();PLAYER_TEAM_SIG_INDEX=new Map();PLAYER_LEAGUE_INDEX=new Map();PLAYER_POSITION_RATING_INDEX=new Map();PLAYER_RATING_INDEX=new Map();
 for(let i=0;i<PLAYERS.length;i++){
  const p=PLAYERS[i],id=String(p?.id||"");if(id)PLAYER_ARRAY_INDEX.set(id,i);
  addRuntimeIndex(PLAYER_TEAM_INDEX,normalizeKey(p?.team),p);addRuntimeIndex(PLAYER_TEAM_SIG_INDEX,clubIdentityKey(p?.team),p);addRuntimeIndex(PLAYER_LEAGUE_INDEX,normalizeKey(p?.league),p);
  const rating=Math.round(Number(p?.ovr||0));addRuntimeIndex(PLAYER_RATING_INDEX,rating,p);
  const positions=[p?.position,...String(p?.alt||"").split(/[,/]/)].map(x=>String(x||"").trim().toUpperCase()).filter(Boolean);
  for(const pos of new Set(positions)){let byRating=PLAYER_POSITION_RATING_INDEX.get(pos);if(!byRating)PLAYER_POSITION_RATING_INDEX.set(pos,byRating=new Map());addRuntimeIndex(byRating,rating,p)}
 }
}
function playerRowsForTeam(team){const exact=PLAYER_TEAM_INDEX.get(normalizeKey(team));if(exact?.length)return exact;return PLAYER_TEAM_SIG_INDEX.get(clubIdentityKey(team))||[]}
function playerRowsForLeague(league){return PLAYER_LEAGUE_INDEX.get(normalizeKey(league))||[]}
function reindexPlayerAffiliation(p,oldTeam="",oldLeague=""){
 const oldTk=normalizeKey(oldTeam),newTk=normalizeKey(p?.team),oldSig=clubIdentityKey(oldTeam),newSig=clubIdentityKey(p?.team);
 if(oldTk!==newTk){removeRuntimeIndex(PLAYER_TEAM_INDEX,oldTk,p);addRuntimeIndex(PLAYER_TEAM_INDEX,newTk,p)}
 if(oldSig!==newSig){removeRuntimeIndex(PLAYER_TEAM_SIG_INDEX,oldSig,p);addRuntimeIndex(PLAYER_TEAM_SIG_INDEX,newSig,p)}
 const oldLk=normalizeKey(oldLeague),newLk=normalizeKey(p?.league);
 if(oldLk!==newLk){removeRuntimeIndex(PLAYER_LEAGUE_INDEX,oldLk,p);addRuntimeIndex(PLAYER_LEAGUE_INDEX,newLk,p)}
}
function indexedPositionCandidates(slot,target,span,used){
 const byRating=PLAYER_POSITION_RATING_INDEX.get(String(slot||"").toUpperCase());if(!byRating)return[];
 const out=[],lo=Math.max(0,Math.round(target-span)),hi=Math.min(99,Math.round(target+span));
 for(let r=lo;r<=hi;r++)for(const p of byRating.get(r)||[])if(!used.has(String(p.id)))out.push(p);
 return out
}
function indexedRatingCandidates(target,span,used){
 const out=[],lo=Math.max(0,Math.round(target-span)),hi=Math.min(99,Math.round(target+span));
 for(let r=lo;r<=hi;r++)for(const p of PLAYER_RATING_INDEX.get(r)||[])if(!used.has(String(p.id)))out.push(p);
 return out
}

function first(raw,...keys){for(const k of keys){if(raw?.[k]!==undefined&&raw?.[k]!==null&&String(raw[k]).trim()!=="")return raw[k]}return ""}
function deepGet(obj,path){try{return String(path||"").split(".").reduce((acc,key)=>acc==null?undefined:acc[key],obj)}catch(e){return undefined}}
function deepFirst(raw,...paths){for(const path of paths){if(!path)continue;const val=String(path).includes(".")?deepGet(raw,path):raw?.[path];if(val!==undefined&&val!==null&&String(val).trim()!=="")return val}return ""}
function cleanNum(v){const n=Number(String(v??"").replace(/[^0-9.-]/g,""));return Number.isFinite(n)?n:0}
function preferredFootName(value){
 const v=String(value??"").trim().toLowerCase();
 if(v==="1"||v.startsWith("r"))return"Right";
 if(v==="2"||v.startsWith("l"))return"Left";
 return""
}
function parseRareValue(v){
 const raw=String(v??"").trim().toLowerCase();
 if(!raw)return null;
 const x=raw.replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
 if(["0","false","no","common","non rare","nonrare"].includes(x)||x.includes("common"))return false;
 if(["1","true","yes","rare","selten"].includes(x)||x.includes("rare"))return true;
 return null
}
function csvRow(line){const out=[];let cur="",q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(c===','&&!q){out.push(cur);cur=""}else cur+=c}out.push(cur);return out}
function parseCSV(text){const lines=String(text||"").replace(/^\uFEFF/,"").split(/\r?\n/).filter(x=>x.trim().length);if(lines.length<2)throw new Error("CSV enthält keine Datensätze");const headers=csvRow(lines[0]).map(x=>x.trim());const rows=[];for(let i=1;i<lines.length;i++){const vals=csvRow(lines[i]);if(vals.length<3)continue;const r={};for(let c=0;c<headers.length;c++)r[headers[c]]=vals[c]??"";rows.push(r)}return rows}
function sofifaFace(id){const n=String(id||"").replace(/\D/g,"").padStart(6,"0");if(n.length!==6)return"";return`https://cdn.sofifa.net/players/${n.slice(0,3)}/${n.slice(3)}/27_120.png`}
function normCSV(raw){
 const id=String(first(raw,"sofifa_id","player_id","ea_id","id"));
 const commonName=String(first(raw,"common_name","commonName")).trim();
 const name=commonName||String(first(raw,"short_name","name","long_name")).trim();
 const fullName=String(first(raw,"long_name","full_name","player_name","name","common_name","short_name")).trim()||name;
 const positions=String(first(raw,"positions","player_positions","position")).split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
 const face=String(first(raw,"player_face_url","player_face","face_url","image_url"));
 const team=String(first(raw,"club_name","team_name","club","team")).trim();
 const rawLeague=String(first(raw,"league_name","league")).trim(),leagueId=String(first(raw,"league_id","competition_id")),gender=String(first(raw,"gender","sex","player_gender"));
 return{id,name,commonName,fullName,ovr:cleanNum(first(raw,"overall","ovr","rating")),pac:cleanNum(first(raw,"pace","pac")),sho:cleanNum(first(raw,"shooting","sho")),pas:cleanNum(first(raw,"passing","pas")),dri:cleanNum(first(raw,"dribbling","dri")),def:cleanNum(first(raw,"defending","def")),phy:cleanNum(first(raw,"physical","physic","physicality","phy")),position:positions[0]||"CM",alt:positions.slice(1).join(','),preferredFoot:preferredFootName(first(raw,"preferred_foot","preferredFoot")),weakFoot:cleanNum(first(raw,"weak_foot","weakFoot")),skillMoves:cleanNum(first(raw,"skill_moves","skillMoves")),nation:String(first(raw,"nationality_name","nationality","nation")),nationCode:String(first(raw,"nationality_id","nation_id","country_id")),nationFlag:String(first(raw,"nation_flag_url","nationality_flag_url","country_flag_url","nation_logo_url")),league:leagueFromClub(team,rawLeague,leagueId,gender,"fc27-open-data"),leagueId,leagueLogo:String(first(raw,"league_logo_url","competition_logo_url","league_logo")),team,teamId:String(first(raw,"club_team_id","team_id","club_id")),clubLogo:String(first(raw,"club_logo_url","team_logo_url","club_logo","team_logo")),face,card:"",playstyles:String(first(raw,"playstyles","player_traits")),playstylesPlus:String(first(raw,"playstyles_plus","playstylesPlus")),gender,baseRare:parseRareValue(first(raw,"rarity","card_rarity","item_rarity","rare","is_rare","isRare")),source:"fc27-open-data"}
}
const COMMON_PLAYER_NAMES_BY_ID=Object.freeze({"232580":"Gabriel","207865":"Marquinhos"});
const COMMON_PLAYER_NAMES_BY_FULL_NAME=Object.freeze([[/\bronaldo dos santos aveiro\b/,"Cristiano Ronaldo"]]);
function commonNameForFullName(p){const keys=[p?.fullName,p?.name,p?.commonName].map(x=>String(x||"").toLowerCase());for(const[re,name]of COMMON_PLAYER_NAMES_BY_FULL_NAME)if(keys.some(k=>re.test(k)))return name;return""}
function preferredPlayerName(p){return COMMON_PLAYER_NAMES_BY_ID[String(p?.id||"")]||commonNameForFullName(p)||String(p?.commonName||p?.name||"").trim()}
function applyPreferredPlayerNames(players){for(const p of players){if(!p||isExclusiveFounderBase(p))continue;const name=preferredPlayerName(p);if(name)p.name=name;const full=commonNameForFullName(p);if(full){p.fullName=full;p.commonName=full}}}
function keyNameTeam(name,team){return `${normalizeKey(name)}__${normalizeKey(team)}`}
function eaObject(raw,key){
 const v=raw?.[key];
 return v&&typeof v==="object"&&!Array.isArray(v)?v:null
}
function eaVisual(raw,key){
 const obj=eaObject(raw,key);if(!obj)return null;
 const id=String(deepFirst(obj,"id","externalId","externalID")||"").trim();
 const name=String(deepFirst(obj,"label","name","shortName","shortLabel")||"").trim();
 const imageUrl=String(deepFirst(obj,"imageUrl","logoUrl","flagUrl","url")||"").trim();
 return {id,name,imageUrl,obj}
}
function normEAAsset(raw){
 const firstName=String(deepFirst(raw,"firstName","first_name","player.firstName")).trim();
 const lastName=String(deepFirst(raw,"lastName","last_name","player.lastName")).trim();
 const builtName=[firstName,lastName].filter(Boolean).join(" ").trim();
 const commonName=String(deepFirst(raw,"commonName","common_name")).trim();
 const name=String(commonName||deepFirst(raw,"name","Name","fullName","full_name","playerName","shortName")||builtName).trim();
 const url=String(deepFirst(raw,"url","URL","playerUrl","player_url"));
 const urlId=(url.match(/\/(\d+)(?:\?.*)?$/)||[])[1]||"";
 const rawId=String(deepFirst(raw,"eaId","eaID","playerId","playerID","player_id","ea_id","athleteId","athlete_id","id","ID"));
 const id=urlId||(/^[0-9]{4,}$/.test(rawId)?rawId:"");

 const teamV=eaVisual(raw,"team");
 const natV=eaVisual(raw,"nationality");
 const usableVisual=v=>v&&(v.id||v.name||v.imageUrl)?v:null;
 const directLeagueV=usableVisual(eaVisual(raw,"league"));
 const nestedLeagueObj=teamV?.obj
  ?(eaObject(teamV.obj,"league")||eaObject(teamV.obj,"competition")||eaObject(teamV.obj,"tournament"))
  :null;
 const teamLeagueV=nestedLeagueObj
  ?usableVisual({id:String(deepFirst(nestedLeagueObj,"id","externalId","externalID")||"").trim(),name:String(deepFirst(nestedLeagueObj,"label","name","shortName","shortLabel")||"").trim(),imageUrl:String(deepFirst(nestedLeagueObj,"imageUrl","logoUrl","url")||"").trim(),obj:nestedLeagueObj})
  :null;
 const leagueV=directLeagueV||teamLeagueV;

 const posObj=eaObject(raw,"position");
 const pos=String(
  (posObj?deepFirst(posObj,"shortLabel","shortName","label","name","id"):"")||
  deepFirst(raw,"preferredPosition","positionName","positionLabel","Position")
 ).trim().toUpperCase();
 const altRaw=String(deepFirst(raw,"alternative positions","Alternative positions","alternativePositions","alternative_positions","altPositions","alt_positions")).trim();

 const team=String(teamV?.name||deepFirst(raw,"teamName","team_name","clubName","club_name")).trim();
 const league=String(leagueV?.name||deepFirst(raw,"leagueName","league_name","competitionName","competition_name")).trim();
 const nation=String(natV?.name||deepFirst(raw,"nation","Nation","nationName","nation_name","country","countryName","country_name")).trim();

 return {
  id,name,commonName,fullName:builtName||String(deepFirst(raw,"fullName","full_name")||name).trim(),firstName,lastName,team,league,url,
  ovr:cleanNum(deepFirst(raw,"ovr","OVR","overall","overallRating","overall_rating","rating")),
  pac:cleanNum(deepFirst(raw,"pac","PAC","pace","Pace","stats.pace","stats.pac")),
  sho:cleanNum(deepFirst(raw,"sho","SHO","shooting","Shooting","stats.shooting","stats.sho")),
  pas:cleanNum(deepFirst(raw,"pas","PAS","passing","Passing","stats.passing","stats.pas")),
  dri:cleanNum(deepFirst(raw,"dri","DRI","dribbling","Dribbling","stats.dribbling","stats.dri")),
  def:cleanNum(deepFirst(raw,"def","DEF","defending","Defending","stats.defending","stats.def")),
  phy:cleanNum(deepFirst(raw,"phy","PHY","physicality","Physicality","physic","stats.physical","stats.phy")),
  position:pos,
  alt:altRaw.split(/[,/]/).map(x=>x.trim().toUpperCase()).filter(Boolean).join(','),
  preferredFoot:preferredFootName(deepFirst(raw,"preferred foot","Preferred foot","preferredFoot","preferred_foot")),
  weakFoot:cleanNum(deepFirst(raw,"weakFootAbility","weak_foot_ability","weak foot","Weak foot","weakFoot","weak_foot")),
  skillMoves:cleanNum(deepFirst(raw,"skill moves","Skill moves","skillMoves","skill_moves")),
  face:String(deepFirst(raw,"avatarUrl","playerFaceUrl","player_face_url","imageUrl","image_url","headshotImgUrl","headshot_img_url","headshot","portraitUrl","portrait_url","playerImageUrl","player_image_url","images.headshot.url")),
  nation,
  nationCode:String(natV?.id||deepFirst(raw,"nationalityId","nationId","nation_id","countryId","country_id")),
  nationFlag:String(natV?.imageUrl||deepFirst(raw,"nationImageUrl","nation_image_url","nationalityImageUrl","nationality_image_url","countryFlagUrl","country_flag_url","flagUrl","flag_url","images.nation.url")),
  teamId:String(teamV?.id||deepFirst(raw,"teamId","team_id","clubId","club_id")),
  clubLogo:String(teamV?.imageUrl||deepFirst(raw,"teamImageUrl","team_image_url","clubImageUrl","club_image_url","teamLogoUrl","team_logo_url","clubLogoUrl","club_logo_url","badgeUrl","badge_url","crestUrl","crest_url","images.team.url")),
  leagueId:String(leagueV?.id||deepFirst(raw,"leagueId","league_id","competitionId","competition_id")),
  leagueLogo:String(leagueV?.imageUrl||deepFirst(raw,"leagueImageUrl","league_image_url","competitionImageUrl","competition_image_url","leagueLogoUrl","league_logo_url","images.league.url")),
  card:String(deepFirst(raw,"card","cardUrl","card_url","playerCardUrl","player_card_url")),
  playstyles:deepFirst(raw,"play style","playStyle","play_style","playstyles","PlayStyles"),
  playstylesPlus:deepFirst(raw,"play style plus","playStylePlus","play_style_plus","playstylesPlus","playstyles_plus","PlayStylesPlus"),
  gender:String(deepFirst(raw,"__gfutGender","gender.label","gender.name","gender.id","gender","Gender","sex","Sex")),
  baseRare:parseRareValue(deepFirst(raw,"rarity","Rarity","cardRarity","card_rarity","itemRarity","item_rarity","rare","isRare","is_rare"))
 }
}
async function fetchJson(url,ms=45000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{cache:"no-store",signal:c.signal});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json()}finally{clearTimeout(t)}}
async function fetchEaRatingsGender(gender,limit=100,maxPages=240,onPage=null){
 const out=[],pageSize=Math.max(1,Math.min(100,Number(limit)||100));
 for(let page=0,offset=0;page<maxPages;page++){
  const url=`${EA_RATINGS_API}?locale=en&gender=${gender}&limit=${pageSize}&offset=${offset}`;
  const data=await fetchJson(url,45000);
  const items=Array.isArray(data?.items)?data.items:Array.isArray(data?.players)?data.players:Array.isArray(data?.ratings)?data.ratings:[];
  if(!items.length)break;
  out.push(...items);
  if(typeof onPage==="function")onPage(items,page,offset);
  offset+=items.length;
  if(items.length<pageSize)break;
  await sleep(25)
 }
 return out
}
async function enrichPlayersWithEaAssets(players){
 const byId=new Map(),byName=new Map();
 players.forEach((p,i)=>{
  byId.set(String(p.id),i);
  const k=normalizeKey(p.name);
  if(!byName.has(k))byName.set(k,[]);
  byName.get(k).push(i);
 });
 const merged=players.slice(),teamAssets=new Map(),leagueAssets=new Map(),teamAssetsById=new Map(),leagueAssetsById=new Map();
 let applied=0,seen=0,matched=0;

 const rawItems=await fetchEaRatingsGender(0,100,240);
 const items=rawItems.map(x=>({...x,__gfutGender:"male"}));

 const leagueKey=v=>{
  const k=normalizeKey(v);
  if(k.includes("bundesliga")&&!k.includes("frauen"))return"bundesliga";
  if(k.includes("premier league"))return"premier league";
  if(k.includes("laliga")||k.includes("la liga"))return"laliga";
  if(k.startsWith("serie a"))return"serie a";
  if(k.startsWith("ligue 1"))return"ligue 1";
  return k;
 };
 const footballStop=new Set(["fc","cf","afc","ac","sc","ssc","as","sv","vfb","vfl","tsg","rc","fk","sk","bk","club","football","futbol","calcio","de","the"]);
 const sig=v=>normalizeKey(v).split(" ").filter(x=>x&&!footballStop.has(x));
 const overlapScore=(a,b)=>{
  const A=sig(a),B=sig(b);if(!A.length||!B.length)return 0;
  const bs=new Set(B),shared=A.filter(x=>bs.has(x));if(!shared.length)return 0;
  const meaningful=shared.some(x=>x.length>=5||/\d/.test(x));if(!meaningful)return 0;
  const containment=shared.length/Math.min(A.length,B.length),jaccard=shared.length/new Set([...A,...B]).size;
  return containment*.78+jaccard*.22
 };
 const fuzzyResolve=(name,map)=>{
  let best=null,bestScore=0,second=0;
  for(const [k,v] of map){
   const s=overlapScore(name,k);
   if(s>bestScore){second=bestScore;bestScore=s;best=v}else if(s>second)second=s
  }
  return bestScore>=.86&&(bestScore-second>=.08||bestScore>=.98)?best:null
 };
 const teamResolveCache=new Map(),leagueResolveCache=new Map();

 for(const raw of items){
  const a=normEAAsset(raw);seen++;
  if(!a.id&&!a.name)continue;
  const ta={clubLogo:a.clubLogo||"",teamId:a.teamId||"",leagueLogo:a.leagueLogo||"",leagueId:a.leagueId||"",league:a.league||""};
  const la={leagueLogo:a.leagueLogo||"",leagueId:a.leagueId||"",league:a.league||""};
  if(a.team){
   const k=normalizeKey(a.team),prev=teamAssets.get(k)||{};
   const val={
    clubLogo:a.clubLogo||prev.clubLogo||"",teamId:a.teamId||prev.teamId||"",
    leagueLogo:a.leagueLogo||prev.leagueLogo||"",leagueId:a.leagueId||prev.leagueId||"",league:a.league||prev.league||""
   };
   teamAssets.set(k,val);if(a.teamId)teamAssetsById.set(String(a.teamId),val)
  }
  if(a.league){
   const k=leagueKey(a.league),prev=leagueAssets.get(k)||{};
   const val={leagueLogo:a.leagueLogo||prev.leagueLogo||"",leagueId:a.leagueId||prev.leagueId||"",league:a.league||prev.league||""};
   leagueAssets.set(k,val);if(a.leagueId)leagueAssetsById.set(String(a.leagueId),val)
  }

  let idx=undefined;
  if(a.id&&byId.has(String(a.id)))idx=byId.get(String(a.id));
  if(idx===undefined&&a.name){
   const cand=byName.get(normalizeKey(a.name))||[];
   if(cand.length===1)idx=cand[0]
  }
  if(idx===undefined)continue;
  matched++;

  const p=merged[idx],next={...p};
  if(a.name)next.name=a.name;
  if(a.commonName)next.commonName=a.commonName;
  if(a.fullName)next.fullName=a.fullName;
  if(a.firstName)next.firstName=a.firstName;
  if(a.lastName)next.lastName=a.lastName;
  if(a.ovr)next.ovr=a.ovr;if(a.pac)next.pac=a.pac;if(a.sho)next.sho=a.sho;if(a.pas)next.pas=a.pas;if(a.dri)next.dri=a.dri;if(a.def)next.def=a.def;if(a.phy)next.phy=a.phy;
  if(a.position)next.position=a.position;if(a.alt)next.alt=a.alt;
  if(a.nation)next.nation=a.nation;
  if(a.face)next.face=a.face;
  if(a.nationFlag)next.nationFlag=a.nationFlag;
  if(a.nationCode)next.nationCode=a.nationCode;

  // Exact player match: this is the most reliable source for current club/league visual metadata.
  if(a.clubLogo)next.clubLogo=a.clubLogo;
  if(a.teamId)next.teamId=a.teamId;
  if(a.leagueLogo)next.leagueLogo=a.leagueLogo;
  if(a.leagueId)next.leagueId=a.leagueId;
  if(a.league)next.league=a.league;
  if(!next.team&&a.team)next.team=a.team;

  if(a.preferredFoot)next.preferredFoot=a.preferredFoot;
  if(a.weakFoot)next.weakFoot=a.weakFoot;
  if(a.skillMoves)next.skillMoves=a.skillMoves;
  if(a.gender)next.gender=a.gender;
  if(a.baseRare!==null)next.baseRare=a.baseRare;
  if(a.playstyles)next.playstyles=Array.isArray(a.playstyles)?a.playstyles.join(", "):String(a.playstyles);
  if(a.playstylesPlus)next.playstylesPlus=Array.isArray(a.playstylesPlus)?a.playstylesPlus.join(", "):String(a.playstylesPlus);
  next.card="";next.source="fc27-ratings+current-roster";
  merged[idx]=next
 }

 // Team/league maps fill players that could not be matched one-to-one.
 for(let i=0;i<merged.length;i++){
  const p=merged[i],next={...p};
  const teamNameKey=normalizeKey(p.team),leagueNameKey=leagueKey(p.league);
  let ta=p.teamId?teamAssetsById.get(String(p.teamId)):null;
  if(!ta)ta=teamAssets.get(teamNameKey);
  if(!ta&&p.team){
   if(teamResolveCache.has(teamNameKey))ta=teamResolveCache.get(teamNameKey);
   else{ta=fuzzyResolve(p.team,teamAssets);teamResolveCache.set(teamNameKey,ta||null)}
  }
  if(ta){
   if(ta.clubLogo&&!next.clubLogo)next.clubLogo=ta.clubLogo;
   if(ta.teamId&&!next.teamId)next.teamId=ta.teamId;
   if(ta.leagueLogo&&!next.leagueLogo)next.leagueLogo=ta.leagueLogo;
   if(ta.leagueId&&!next.leagueId)next.leagueId=ta.leagueId;
   if(ta.league&&!next.league)next.league=ta.league
  }
  let la=p.leagueId?leagueAssetsById.get(String(p.leagueId)):null;
  if(!la)la=leagueAssets.get(leagueNameKey);
  if(!la&&p.league){
   if(leagueResolveCache.has(leagueNameKey))la=leagueResolveCache.get(leagueNameKey);
   else{la=fuzzyResolve(p.league,leagueAssets);leagueResolveCache.set(leagueNameKey,la||null)}
  }
  if(la){
   if(la.leagueLogo&&!next.leagueLogo)next.leagueLogo=la.leagueLogo;
   if(la.leagueId&&!next.leagueId)next.leagueId=la.leagueId;
   if(la.league&&!next.league)next.league=la.league
  }
  if(JSON.stringify(next)!==JSON.stringify(p)){merged[i]=next;applied++}
 }
 return {players:merged,applied,seen,matched}
}
function rarityOf(p){const r=Number(p?.ovr||0);return r>=75?"gold":r>=65?"silver":"bronze"}
function isBaseRare(p){
 if(!p)return false;
 if(typeof p.baseRare==="boolean")return p.baseRare;
 const explicit=parseRareValue(p.rarity??p.cardRarity??p.itemRarity??p.rareBase);
 if(explicit!==null)return explicit;
 const r=Number(p.ovr||0);
 const ps=String(p.playstylesPlus||p.playstyles_plus||"").trim();
 return r>=80||(r>=78&&!!ps)
}
function isCardRare(p,item=null){return !!item?.rare||isBaseRare(p)}
function isStoryItem(item){return item?.variant==="story"&&!!STORY_PASS_PLAYERS[item.storyRewardKey]}
function cardClass(p,item){if(isFounderItem(item))return"founder";if(item?.cosmeticDesign==="momentum")return"momentum";if(item?.cosmeticDesign==="totw")return"totw";if(item?.cosmeticDesign==="red")return"champions-red";if(item?.cosmeticDesign==="red-pro")return"champions-pro";if(item?.cosmeticDesign==="halloween"||String(item?.eventType||"").startsWith("halloween"))return"halloween";if(item?.eventType==="flashback-sbc")return"flashback";if(item?.variant==="story")return"story";if(isEvolutionItem(item))return"evolution";if(isMomentumItem(item))return"momentum";if(item?.variant==="icon-mid")return"icon";if(item?.variant==="special"&&String(item?.eventName||"").startsWith("Team of the Week"))return"totw";if(item?.variant==="special"&&isLegacyEventName(item?.eventName))return"legacy";return item?.variant==="special"?"special":rarityOf(p)}
function isEvolutionItem(item){return !!item&&(item.evoDesign===true||Number(item.evo||0)>0||Object.values(item.evoStats||{}).some(v=>Number(v)>0)||!!item.evoPlaystyle||(item.evoPlaystyles||[]).length>0||!!item.evoPlaystylePlus||(item.evoPlaystylesPlus||[]).length>0||!!activeEvolutionForUid(item.uid))}
function itemBase(item){const founder=founderRuleForItem(item);if(founder)return founder.base;return item?.acquisitionSource==="reward-pick"&&item.baseSnapshot?{...P_BY_ID.get(String(item.pid)),...item.baseSnapshot,id:String(item.pid)}:P_BY_ID.get(String(item.pid))}
// Blutmond upgrade: every HALLOWEEN card (team, SBC, objective) gains the event upgrade once the Halloween night starts.
function itemRating(item){const b=itemBase(item);if(!b)return 0;const fixed=Number(item?.displayRating||0),momentum=isMomentumItem(item)?promoItemInfo(item):null;return Math.min(99,(fixed>0?fixed:(momentum?momentum.ovr:b.ovr+(item.boost||0)))+(item.evo||0)+Number(halloweenUpgradeFor(item)?.ovr||0))}
function halloweenUpgradeFor(item,at=Date.now()){const up=typeof HALLOWEEN_EVENT!=="undefined"&&HALLOWEEN_EVENT.upgrade;return up&&String(item?.eventType||"").startsWith("halloween")&&at>=Date.parse(up.at)?up:null}
function displayBase(item){
 const b=itemBase(item);if(!b)return null;
 const momentum=isMomentumItem(item)?promoItemInfo(item):null,eventStats=Array.isArray(item?.eventStats)?item.eventStats:null,extra=item?.evoStats||{};
 const changed=!!momentum||!!eventStats||Number(item?.displayRating||0)>0||Number(item?.boost||0)!==0||Number(item?.evo||0)!==0||!!item?.dynamicFace||!!item?.eventFace||!!item?.overridePosition||Object.keys(extra).length>0;
 if(!changed)return b;
 let out={...b,ovr:itemRating(item),position:momentum?.position||item?.overridePosition||b.position};
 if(momentum){if(momentum.name)out.name=momentum.name;if(momentum.team&&(item.eventReleaseId===MOMENTUM_TEAM_2.id||item.eventType==="momentum-objective")){out.team=momentum.team;out.league=momentum.league||leagueFromClub(momentum.team,"","","male","fc27-open-data");out.nation=momentum.nation}if(momentum.stats)for(const [index,k] of ["pac","sho","pas","dri","def","phy"].entries())out[k]=momentum.stats[index];if(momentum.position)out.alt=[...new Set([b.position,...String(b.alt||"").split(/[,/]/).map(s=>s.trim()),...String(momentum.alt||"").split(/[,/]/).map(s=>s.trim())].filter(s=>s&&s!==momentum.position))].join(",")}
 const promo=promoItemInfo(item);if(promo||item.dynamicFace||item.eventFace){out.dynamicFace=item.dynamicFace||item.eventFace||promo?.dynamicFace||promo?.eventFace||"";out.eventReleaseId=item.eventReleaseId||""}
 if(eventStats)for(const [index,k] of ["pac","sho","pas","dri","def","phy"].entries())out[k]=Number(eventStats[index]??out[k]??0);
 const blutmond=halloweenUpgradeFor(item);if(blutmond)for(const k of ["pac","sho","pas","dri","def","phy"])out[k]=Math.min(99,Number(out[k]||0)+Number(blutmond.stats||0));
 if(Object.keys(extra).length){const resolved=resolvedPlayer(out);for(const k of ["pac","sho","pas","dri","def","phy"])out[k]=Math.min(99,Number(resolved[k]||0)+Number(extra[k]||0))}
 return out
}
function makeItem(base,tradeable=false,opts={}){const rare=opts.rare===true||isBaseRare(base),rawPurchase=Number(opts.purchasePrice||0),purchasePrice=Number.isFinite(rawPurchase)&&rawPurchase>0?Math.round(rawPurchase):0,displayRating=Number(opts.displayRating||0),eventStats=Array.isArray(opts.eventStats)?opts.eventStats.map(Number):null;return{uid:uid(),pid:String(base.id),tradeable,acquired:Date.now(),evo:0,evoStats:{},variant:opts.variant||"",eventType:opts.eventType||"",boost:Number(opts.boost||0),eventName:opts.eventName||"",eventReleaseId:opts.eventReleaseId||"",dynamicFace:opts.dynamicFace||opts.eventFace||"",overridePosition:opts.overridePosition||"",displayRating:Number.isFinite(displayRating)&&displayRating>0?displayRating:0,eventStats,playstyleAdds:Array.isArray(opts.playstyleAdds)?opts.playstyleAdds.map(String):[],playstylePlusAdds:Array.isArray(opts.playstylePlusAdds)?opts.playstylePlusAdds.map(String):[],rare,purchasePrice,acquisitionSource:String(opts.acquisitionSource||""),clubGoals:Math.max(0,Number(opts.clubGoals||0)),clubAssists:Math.max(0,Number(opts.clubAssists||0))}}
function storyBase(key){
 const spec=STORY_PASS_PLAYERS[key];if(!spec)return null;
 if(spec.pid&&typeof P_BY_ID!=="undefined"&&P_BY_ID.get(String(spec.pid)))return P_BY_ID.get(String(spec.pid));
 const aliases=[spec.name,...(spec.aliases||[])].map(normalizeKey).filter(Boolean);
 const exact=PLAYERS.find(p=>{const keys=[p.fullName,p.name,[p.firstName,p.lastName].filter(Boolean).join(" ")].map(normalizeKey).filter(Boolean);return aliases.some(a=>keys.includes(a))});
 if(exact)return exact;
 const surname=normalizeKey(spec.name).split(" ").filter(Boolean).pop();if(!surname)return null;
 const matches=PLAYERS.filter(p=>[p.fullName,p.name].map(normalizeKey).some(k=>k===surname||k.endsWith(" "+surname)));
 return matches.length===1?matches[0]:null
}
function storyEventName(spec){return spec.season==="s1"?"STORY":`SAISON ${spec.season.slice(1)}`}
function storyPreviewCard(key){
 const spec=STORY_PASS_PLAYERS[key],base=storyBase(key);if(!spec)return"";
 if(!base)return`<div class="pass-story-placeholder">${spec.rating} · ${esc(spec.name)}</div>`;
 const item={uid:`story-preview-${key}`,pid:String(base.id),variant:"story",eventType:"story",eventName:storyEventName(spec),dynamicFace:spec.face||"",storyRewardKey:key,displayRating:spec.rating,overridePosition:spec.position,eventStats:spec.stats};
 return cardHTML(displayBase(item),item)
}
function deliverStoryPassRewards(){
 const pending=Array.isArray(state.storyPassPending)?state.storyPassPending:[];
 if(!pending.length||DATA_ROUTE==="UI-Fallback")return 0;
 state.storyPassGranted=state.storyPassGranted||{};
 let delivered=0;
 state.storyPassPending=pending.filter(key=>{
  if(state.storyPassGranted[key]||state.club.some(item=>item.storyRewardKey===key)){state.storyPassGranted[key]=true;return false}
  const spec=STORY_PASS_PLAYERS[key],base=storyBase(key);if(!spec||!base)return true;
  const item=makeItem(base,false,{variant:"story",eventType:"story",eventName:storyEventName(spec),dynamicFace:spec.face||"",displayRating:spec.rating,overridePosition:spec.position,eventStats:spec.stats,rare:true,acquisitionSource:`Season Pass ${spec.season.toUpperCase()} · Stufe ${spec.level}`});
  item.storyRewardKey=key;state.club.push(item);state.storyPassGranted[key]=true;delivered++;return false
 });
 save();return delivered
}
function grantStoryPassPlayer(key){
 if(!STORY_PASS_PLAYERS[key]||state.storyPassGranted?.[key]||state.club.some(item=>item.storyRewardKey===key))return;
 state.storyPassPending=Array.isArray(state.storyPassPending)?state.storyPassPending:[];
 if(!state.storyPassPending.includes(key))state.storyPassPending.push(key);
 deliverStoryPassRewards();save()
}
function reconcileStoryPassPlayers(){
 for(const [key,spec] of Object.entries(STORY_PASS_PLAYERS)){
  const track=spec.track==="premium"?"premium":"free",claims=track==="premium"?state.seasonPass?.premiumClaims:state.seasonPass?.freeClaims;
  if(state.seasonPass?.key===spec.season&&claims?.[spec.level])grantStoryPassPlayer(key)
 }
 deliverStoryPassRewards()
}
function portraitFallback(p){return""}
const COUNTRY_CODES={
germany:"DE",deutschland:"DE",france:"FR",french:"FR",england:"GB",spain:"ES",italy:"IT",brazil:"BR",argentina:"AR",netherlands:"NL",holland:"NL",belgium:"BE",portugal:"PT",norway:"NO",sweden:"SE",denmark:"DK",poland:"PL",croatia:"HR",serbia:"RS",switzerland:"CH",austria:"AT",turkey:"TR",turkiye:"TR",morocco:"MA",nigeria:"NG",cameroon:"CM",senegal:"SN",usa:"US","united states":"US","united states of america":"US",mexico:"MX",uruguay:"UY",colombia:"CO",japan:"JP",korea:"KR","south korea":"KR","korea republic":"KR",ghana:"GH","ivory coast":"CI","cote d ivoire":"CI","cote divoire":"CI",egypt:"EG","bosnia and herzegovina":"BA","bosnia-herzegovina":"BA",bosnia:"BA","czech republic":"CZ",czechia:"CZ","republic of ireland":"IE",ireland:"IE","north macedonia":"MK",
"burkina faso":"BF",albania:"AL",algeria:"DZ",andorra:"AD",angola:"AO",armenia:"AM",azerbaijan:"AZ",bahrain:"BH",belarus:"BY",benin:"BJ",bolivia:"BO",botswana:"BW",bulgaria:"BG",burundi:"BI","cape verde":"CV","cabo verde":"CV","central african republic":"CF",chad:"TD",chile:"CL",china:"CN","china pr":"CN","chinese pr":"CN","costa rica":"CR",cuba:"CU",curacao:"CW",cyprus:"CY","democratic republic of congo":"CD","dr congo":"CD","congo dr":"CD",congo:"CG",ecuador:"EC","el salvador":"SV","equatorial guinea":"GQ",eritrea:"ER",estonia:"EE",eswatini:"SZ",ethiopia:"ET","faroe islands":"FO",fiji:"FJ",finland:"FI",gabon:"GA",gambia:"GM",georgia:"GE",greece:"GR",guatemala:"GT",guinea:"GN","guinea bissau":"GW","guinea-bissau":"GW",guyana:"GY",haiti:"HT",honduras:"HN","hong kong":"HK",hungary:"HU",iceland:"IS",india:"IN",indonesia:"ID",iran:"IR",iraq:"IQ",israel:"IL",jamaica:"JM",jordan:"JO",kazakhstan:"KZ",kenya:"KE",kosovo:"XK",kuwait:"KW",kyrgyzstan:"KG",latvia:"LV",lebanon:"LB",lesotho:"LS",liberia:"LR",libya:"LY",liechtenstein:"LI",lithuania:"LT",luxembourg:"LU",madagascar:"MG",malawi:"MW",malaysia:"MY",mali:"ML",malta:"MT",mauritania:"MR",mauritius:"MU",moldova:"MD",monaco:"MC",montenegro:"ME",mozambique:"MZ",namibia:"NA",nepal:"NP","new zealand":"NZ",nicaragua:"NI",niger:"NE","north korea":"KP","korea dpr":"KP","northern ireland":"GB",oman:"OM",pakistan:"PK",palestine:"PS",panama:"PA",paraguay:"PY",peru:"PE",philippines:"PH","puerto rico":"PR",qatar:"QA",romania:"RO",russia:"RU",rwanda:"RW","saudi arabia":"SA","san marino":"SM",scotland:"GB",seychelles:"SC","sierra leone":"SL",singapore:"SG",slovakia:"SK",slovenia:"SI","south africa":"ZA","south sudan":"SS","sri lanka":"LK",sudan:"SD",suriname:"SR",syria:"SY",tajikistan:"TJ",tanzania:"TZ",thailand:"TH",togo:"TG","trinidad and tobago":"TT",tunisia:"TN",turkmenistan:"TM",uganda:"UG",ukraine:"UA","united arab emirates":"AE",uae:"AE",uzbekistan:"UZ",venezuela:"VE",vietnam:"VN",wales:"GB",yemen:"YE",zambia:"ZM",zimbabwe:"ZW"
};
const COUNTRY_NAMES={DE:"Germany",FR:"France",GB:"England",ES:"Spain",IT:"Italy",BR:"Brazil",AR:"Argentina",NL:"Netherlands",BE:"Belgium",PT:"Portugal",NO:"Norway",SE:"Sweden",DK:"Denmark",PL:"Poland",HR:"Croatia",RS:"Serbia",CH:"Switzerland",AT:"Austria",TR:"Turkey",MA:"Morocco",NG:"Nigeria",CM:"Cameroon",SN:"Senegal",US:"United States",MX:"Mexico",UY:"Uruguay",CO:"Colombia",JP:"Japan",KR:"South Korea",GH:"Ghana",CI:"Ivory Coast",EG:"Egypt",BA:"Bosnia and Herzegovina",CZ:"Czech Republic",IE:"Republic of Ireland",MK:"North Macedonia",IS:"Island"};
function countryCode(name){const str=String(name||"").trim();if(/^[A-Z]{2}$/.test(str))return str;const key=normalizeKey(str);return COUNTRY_CODES[key]||String(str).slice(0,2).toUpperCase()}
function nationLabel(name){const raw=String(name||"").trim();if(["england","scotland","wales","northern ireland"].includes(normalizeKey(raw)))return raw;const code=countryCode(raw);return COUNTRY_NAMES[code]||raw||code}
function flagEmoji(name){
 const key=normalizeKey(name);
 const footballFlags={england:"🏴",scotland:"🏴",wales:"🏴","northern ireland":"🏴"};
 if(footballFlags[key])return footballFlags[key];
 const code=countryCode(name);
 return /^[A-Z]{2}$/.test(code)?String.fromCodePoint(...[...code].map(c=>127397+c.charCodeAt(0))):"🏳️"
}
function hashNum(v){let h=0;for(const c of String(v||""))h=((h<<5)-h+c.charCodeAt(0))|0;return Math.abs(h)}
function leagueShort(league){const m={"Bundesliga":"BL","Premier League":"PL","LALIGA EA SPORTS":"LL","LaLiga":"LL","Serie A":"SA","Ligue 1":"L1"};return m[league]||String(league||"LG").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()}
function leagueBadgeStyle(league){const n=normalizeKey(league);if(n==='bundesliga')return 'background:linear-gradient(145deg,#ea2a2a,#941414)';if(n==='premier league')return 'background:linear-gradient(145deg,#7426ff,#2a1555)';if(n.includes('laliga'))return 'background:linear-gradient(145deg,#ff6a2a,#8b143d)';if(n==='serie a')return 'background:linear-gradient(145deg,#1473ff,#082f73)';if(n==='ligue 1')return 'background:linear-gradient(145deg,#08242b,#13b8d9)';return `background:linear-gradient(145deg,hsl(${(hashNum(league)%360)} 70% 44%),hsl(${(hashNum(league)+48)%360} 70% 24%))`}
const CLUB_BADGE_TEXT={"VfB Stuttgart":"VFB","FC Bayern München":"FCB","Bayern Munich":"FCB","Borussia Dortmund":"BVB","1. FSV Mainz 05":"M05","Mainz 05":"M05","RB Leipzig":"RBL","Bayer 04 Leverkusen":"B04","Eintracht Frankfurt":"SGE","SC Freiburg":"SCF","Sport-Club Freiburg":"SCF","Hamburger SV":"HSV","FC Schalke 04":"S04","Werder Bremen":"SVW","SV Werder Bremen":"SVW","1. FC Köln":"KOE","1. FC Union Berlin":"FCU","Borussia Mönchengladbach":"BMG","TSG Hoffenheim":"TSG","FC Augsburg":"FCA","VfL Wolfsburg":"WOB"};
const CLUB_BADGE_STYLE={"VfB Stuttgart":"background:linear-gradient(145deg,#ffffff,#d71920);color:#111","FC Bayern München":"background:linear-gradient(145deg,#d4001f,#00529f)","Borussia Dortmund":"background:linear-gradient(145deg,#f8e800,#111);color:#111","1. FSV Mainz 05":"background:linear-gradient(145deg,#c10617,#ffffff);color:#111","RB Leipzig":"background:linear-gradient(145deg,#12284c,#e61a2d)","Bayer 04 Leverkusen":"background:linear-gradient(145deg,#111,#e32222)","Eintracht Frankfurt":"background:linear-gradient(145deg,#111,#d21f26)","FC Schalke 04":"background:linear-gradient(145deg,#0b4ea2,#8fc1ff)","Hamburger SV":"background:linear-gradient(145deg,#0a2f6f,#1eb3ff)"};
function clubShort(team){if(CLUB_BADGE_TEXT[team])return CLUB_BADGE_TEXT[team];const parts=String(team||"CLB").split(/[^A-Za-z0-9]+/).filter(Boolean);const abbrParts=parts.filter(x=>/^[A-Z]{2,4}$/.test(x));if(abbrParts.length)return abbrParts[0].slice(0,3).toUpperCase();return parts.slice(0,3).map(x=>x[0]).join("").slice(0,3).toUpperCase()||"CLB"}
function clubStyle(team){if(CLUB_BADGE_STYLE[team])return CLUB_BADGE_STYLE[team];const h=hashNum(team)%360;return `background:linear-gradient(145deg,hsl(${h} 78% 54%),hsl(${(h+48)%360} 78% 34%))`}
function statTemplate(pos){const t={GK:[45,20,45,48,18,44],CB:[60,45,58,62,79,77],LB:[78,56,70,74,72,73],RB:[78,56,70,74,72,73],CDM:[67,60,74,73,75,76],CM:[70,68,77,77,70,73],CAM:[75,73,80,80,58,67],LM:[81,72,76,80,52,66],RM:[81,72,76,80,52,66],LW:[84,76,75,83,38,66],RW:[84,76,75,83,38,66],ST:[78,79,68,77,40,74]};return t[pos]||[72,69,71,72,62,70]}
function statValue(p,key){const n=Number(p?.[key]||0);if(n>0)return n;const keys=['pac','sho','pas','dri','def','phy'],i=keys.indexOf(key),base=statTemplate(String(p?.position||'CM').toUpperCase())[i]||60,ovr=Number(p?.ovr||70),adj=Math.round((ovr-75)*0.8);return Math.max(25,Math.min(99,base+adj))}
const RESOLVED_AFFILIATION_CACHE=new WeakMap(),RESOLVED_PLAYER_CACHE=new WeakMap();let AFFILIATION_CACHE_EPOCH=0;
function affiliationCacheSignature(p){return [p?.team,p?.league,p?.clubLogo,p?.leagueLogo,p?.leagueId,p?.teamId,p?.gender,p?.source,p?.nation,p?.nationFlag,p?.name,p?.fullName,p?.firstName,p?.lastName,p?.ovr,p?.position,p?.alt,p?.pac,p?.sho,p?.pas,p?.dri,p?.def,p?.phy,p?.preferredFoot,p?.skillMoves,p?.weakFoot,p?.playstyles,p?.playstylesPlus,p?.face,p?.card,p?.baseRare,p?.rarity,p?.role,p?.workRates,p?.workRate].join("|")}
function resolvedAffiliation(p){
 if(!p||typeof p!=="object")return p;
 const sig=affiliationCacheSignature(p),cached=RESOLVED_AFFILIATION_CACHE.get(p);
 if(cached&&cached.epoch===AFFILIATION_CACHE_EPOCH&&cached.sig===sig)return cached.value;
 let value;
 if(p.id===FOUNDER_PLAYER_ID)value={...p,team:"FC Gerlies",league:"Footera",clubLogo:FOUNDER_BASE.clubLogo,leagueLogo:FOUNDER_BASE.leagueLogo};
 else if(p.id===NIKLAS_FOUNDER_PLAYER_ID)value={...p,team:NIKLAS_FOUNDER_BASE.team,league:"Footera",clubLogo:NIKLAS_FOUNDER_BASE.clubLogo,leagueLogo:NIKLAS_FOUNDER_BASE.leagueLogo};
 else if(p.id===MARCO_FOUNDER_PLAYER_ID)value={...p,team:MARCO_FOUNDER_BASE.team,league:"Footera",clubLogo:MARCO_FOUNDER_BASE.clubLogo,leagueLogo:MARCO_FOUNDER_BASE.leagueLogo};
 else{
  const team=String(p.team||"").trim(),linked=team?discoveredClubLeague(team):{name:"",url:""};
  const linkedLeague=String(linked.name||"").trim(),sourceLeague=String(p.league||"").trim(),league=leagueFromClub(team,sourceLeague,p.leagueId,p.gender,p.source)||sourceLeague||linkedLeague;
  const canonicalSourceLeague=leagueFromClub("",sourceLeague,p.leagueId,p.gender,p.source),canonicalLinkedLeague=leagueFromClub("",linkedLeague,"",p.gender,p.source);
  const sourceLogoMatches=!!canonicalSourceLeague&&normalizeKey(canonicalSourceLeague)===normalizeKey(league),linkedLogoMatches=!!canonicalLinkedLeague&&normalizeKey(canonicalLinkedLeague)===normalizeKey(league);
  const verified=verifiedClubBadge(team,p),women=isWomensAffiliation(team,p);
  value={...p,league,clubLogo:verified?.url||(!women?(apiSportsTeamLogo(team)||String(p.clubLogo||"").trim()||discoveredBadge("club",team)):womensClubLogo(p)),leagueLogo:localLeagueLogo(league)||apiSportsLeagueLogo(league)||(sourceLogoMatches?String(p.leagueLogo||"").trim():"")||(linkedLogoMatches?String(linked.url||"").trim():"")||discoveredBadge("league",league)}
 }
 RESOLVED_AFFILIATION_CACHE.set(p,{epoch:AFFILIATION_CACHE_EPOCH,sig,value});return value
}
function normalizePlayerAffiliations(players){
 for(const p of players||[]){
  if(!p||typeof p!=="object")continue;
  const a=resolvedAffiliation(p);
  p.league=String(a?.league||p.league||"").trim();
  p.clubLogo=String(a?.clubLogo||"").trim();
  p.leagueLogo=String(a?.leagueLogo||"").trim();
 }
 return players
}function resolvedPlayer(p){
 if(!p||typeof p!=="object")return p;
 const a=resolvedAffiliation(p),cached=RESOLVED_PLAYER_CACHE.get(p);if(cached&&cached.affiliation===a)return cached.value;
 const value={...a,name:isExclusiveFounderBase(a)?a.name:preferredPlayerName(a),nation:nationLabel(a.nation),pac:statValue(a,'pac'),sho:statValue(a,'sho'),pas:statValue(a,'pas'),dri:statValue(a,'dri'),def:statValue(a,'def'),phy:statValue(a,'phy')};
 RESOLVED_PLAYER_CACHE.set(p,{affiliation:a,value});return value
}
function emblemsHTML(p){return `<div class="card-icons"><div class="card-flag" title="${esc(nationLabel(p.nation)||'Nation')}">${flagAsset(p)}</div><div class="card-club" title="${esc(p.team||'Verein')}">${badgeAsset('club',p,clubShort(p.team))}</div><div class="card-league" title="${esc(p.league||'Liga')}">${badgeAsset('league',p,leagueShort(p.league))}</div></div>`}
function playerClubLabel(p){const a=resolvedAffiliation(p);return String(a?.team||"").trim()||"Vereinslos"}
function playerLeagueLabel(p){
 const a=resolvedAffiliation(p),league=String(a?.league||"").trim();
 if(league)return league;
 return String(a?.team||"").trim()?"Liga wird ermittelt":"Keine Liga"
}
function playerContextLine(p){const a=resolvedAffiliation(p);return `${playerClubLabel(a)} · ${playerLeagueLabel(a)} · ${[FOUNDER_PLAYER_ID,MARCO_FOUNDER_PLAYER_ID,NIKLAS_FOUNDER_PLAYER_ID].includes(String(p?.id||""))?"Deutschland":nationLabel(a?.nation)}`}
function playerAffiliationHTML(p,compact=false){
 p=resolvedAffiliation(p);
 const hasClub=!!String(p?.team||"").trim(),hasLeague=!!String(p?.league||"").trim(),pid=String(p?.id||"");
 return `<div class="affiliation-grid ${compact?"compact":""}" data-player-id="${esc(pid)}">
  <div class="affiliation-card">
   <div class="affiliation-logo">${hasClub?badgeAsset("club",p,clubShort(p.team)):'<span class="affiliation-empty">—</span>'}</div>
   <div><span>Verein</span><strong>${esc(playerClubLabel(p))}</strong></div>
  </div>
  <div class="affiliation-card">
   <div class="affiliation-logo">${hasLeague?badgeAsset("league",p,leagueShort(p.league)):'<span class="affiliation-empty">—</span>'}</div>
   <div><span>Liga</span><strong>${esc(playerLeagueLabel(p))}</strong></div>
  </div>
 </div>`
}
function refreshAffiliationDom(refreshFaces=false){
 document.querySelectorAll("[data-player-context-id]").forEach(el=>{const p=P_BY_ID.get(String(el.dataset.playerContextId||""));if(p){const text=playerContextLine(p);if(el.textContent!==text)el.textContent=text}});
 document.querySelectorAll(".affiliation-grid[data-player-id]").forEach(el=>{const p=P_BY_ID.get(String(el.dataset.playerId||""));if(!p)return;const wrap=document.createElement("div");wrap.innerHTML=playerAffiliationHTML(p,el.classList.contains("compact"));const fresh=wrap.firstElementChild;if(fresh&&fresh.innerHTML!==el.innerHTML)el.replaceWith(fresh)});
 document.querySelectorAll(".custom-card[data-player-id]").forEach(card=>{
  const p=P_BY_ID.get(String(card.dataset.playerId||""));if(!p)return;const base=resolvedPlayer(p),rp=card.classList.contains("potm")?(globalThis.FooteraPotm?.affiliationForCard(base,card.dataset.eventReleaseId)||base):base,club=card.querySelector(".card-club"),league=card.querySelector(".card-league");
  if(club){const sig=[rp.team,rp.clubLogo,discoveredBadge("club",rp.team),apiSportsTeamLogo(rp.team)].join("|");if(club.dataset.assetSig!==sig){club.dataset.assetSig=sig;club.title=rp.team||"Verein";club.innerHTML=badgeAsset("club",rp,clubShort(rp.team))}}
  if(league){const sig=[rp.league,rp.leagueLogo,discoveredBadge("league",rp.league),apiSportsLeagueLogo(rp.league)].join("|");if(league.dataset.assetSig!==sig){league.dataset.assetSig=sig;league.title=rp.league||"Liga";league.innerHTML=badgeAsset("league",rp,leagueShort(rp.league))}}
  if(refreshFaces&&rp.face){const face=card.querySelector(".face"),dynamic=card.dataset.dynamicFace||"",sig=dynamic||String(rp.face||"");if(face&&face.dataset.faceSig!==sig){face.dataset.faceSig=sig;face.innerHTML=portraitHTML(rp,false,dynamic?{variant:"special",dynamicFace:dynamic,eventReleaseId:card.dataset.eventReleaseId}:null)}}
 });
 const activeGrid=document.querySelector("#bioDetailBody .affiliation-grid[data-player-id]");if(activeGrid&&$("bioModal")?.classList.contains("active")){const p=P_BY_ID.get(String(activeGrid.dataset.playerId||""));if(p)$("bioDetailSub").textContent=playerContextLine(p)}
 const playerGrid=document.querySelector("#playerDetailBody .affiliation-grid[data-player-id]");if(playerGrid&&$("playerModal")?.classList.contains("active")){const p=P_BY_ID.get(String(playerGrid.dataset.playerId||""));if(p)$("playerDetailSub").textContent=playerContextLine(p)}
}
const EA_PLAYER_DETAIL_PENDING=new Set();
async function ensureEaPlayerAssets(p){
 if(!p?.id||p?.isIcon)return;const key=String(p.id);if(EA_PLAYER_DETAIL_PENDING.has(key))return;
 const current=P_BY_ID.get(key)||p;if(current.team&&current.league&&current.face&&current.clubLogo&&current.leagueLogo)return;
 EA_PLAYER_DETAIL_PENDING.add(key);
 try{
  const queries=[current.fullName,current.name,[current.firstName,current.lastName].filter(Boolean).join(" ")].filter(Boolean),seen=new Set();
  let exact=null;
  for(const q of queries){const nk=normalizeKey(q);if(!nk||seen.has(nk))continue;seen.add(nk);try{const assets=(await fetchEaPlayerSearch(q)).map(normEAAsset).filter(Boolean);exact=assets.find(a=>String(a.id)===key)||assets.find(a=>normalizeKey(a.fullName||a.name)===normalizeKey(current.fullName||current.name));if(exact)break}catch(e){}}
  if(exact&&applyEaAssetToPlayerById(exact))refreshAffiliationDom(true)
 }finally{EA_PLAYER_DETAIL_PENDING.delete(key)}
}
function ensurePlayerAffiliationAssets(p){
 if(!p)return;
 if(isExclusiveFounderBase(p))return;
 const a=resolvedAffiliation(p);
 if(a.team&&!verifiedClubBadge(a.team,a)&&!isWomensAffiliation(a.team,a))queueBadgeDiscovery("club",a.team,a.league,true);
 if(a.league)queueBadgeDiscovery("league",a.league,"",true);
 ensureEaPlayerAssets(p)
}
function inlineMetaHTML(p){p=resolvedAffiliation(p);return `<div class="quickcard-meta"><span class="inline-chip flag" title="${esc(nationLabel(p.nation)||'Nation')}">${flagEmoji(p.nation)}</span><span class="inline-chip" title="${esc(p.league||'Liga')}">${esc(leagueShort(p.league))}</span><span class="inline-chip" title="${esc(p.team||'Verein')}">${esc(clubShort(p.team))}</span></div>`}
const IMAGE_SOURCE_CACHE=(()=>{try{return new Map(Object.entries(JSON.parse(localStorage.getItem("gfutImageSourceCacheV9")||"{}")))}catch(e){return new Map()}})();
const IMAGE_FAILURE_CACHE=(()=>{try{return new Map(Object.entries(JSON.parse(localStorage.getItem("gfutImageFailureCacheV9")||"{}")))}catch(e){return new Map()}})();
let IMAGE_CACHE_SAVE_TIMER=0;
function persistImageCaches(){clearTimeout(IMAGE_CACHE_SAVE_TIMER);IMAGE_CACHE_SAVE_TIMER=setTimeout(()=>{try{localStorage.setItem("gfutImageSourceCacheV9",JSON.stringify(Object.fromEntries([...IMAGE_SOURCE_CACHE].slice(-1500))));localStorage.setItem("gfutImageFailureCacheV9",JSON.stringify(Object.fromEntries([...IMAGE_FAILURE_CACHE].slice(-3000))))}catch(e){}},600)}
function imageCacheKey(kind,p){return `${kind}:${String(p?.id||p?.name||"")}`}
function imageFailedRecently(url){const t=Number(IMAGE_FAILURE_CACHE.get(String(url||""))||0);return t>0&&(Date.now()-t)<120000}
function prioritizeCached(arr,key){const available=arr.filter(u=>!imageFailedRecently(u));arr=available.length?available:arr.slice();const hit=IMAGE_SOURCE_CACHE.get(key);if(!hit||!arr.includes(hit))return arr;return [hit,...arr.filter(x=>x!==hit)]}
function rememberLoadedImage(el){const key=el?.dataset?.cacheKey,url=String(el?.currentSrc||el?.src||'');if(key&&url){IMAGE_SOURCE_CACHE.set(key,url);IMAGE_FAILURE_CACHE.delete(url);persistImageCaches()}el?.classList?.add('loaded');if(el?.closest?.('.face')){stopPortraitWatch(el);const fb=el.parentElement?.querySelector('.face-fallback');if(fb)fb.style.display='none'}}
function sofifaFaceByVersion(id,version){const n=String(id||"").replace(/\D/g,"").padStart(6,"0");if(n.length!==6)return"";return`https://cdn.sofifa.net/players/${n.slice(0,3)}/${n.slice(3)}/${version}_120.png`}
function sofifaFaceCandidates(id){return[27,26,25,24].map(v=>sofifaFaceByVersion(id,v)).filter(Boolean)}
function futwizFaceCandidates(id){const raw=String(id||"").replace(/\D/g,"");if(!raw)return[];return[27,26,25].map(v=>`https://cdn.futwiz.com/assets/img/fc${v}/faces/${raw}.png`)}
const FIFAROSTERS_FACE_OVERRIDES={};
function fifaRostersPlayerUrl(p,version=27){const id=String(p?.id||"").replace(/\D/g,"");return id?`https://www.fifarosters.com/players?futid=${id}&player=${id}&v=${version}`:""}
function fifaRostersFaceCandidates(id,version=27){const raw=String(id||"").replace(/\D/g,"");if(!raw)return[];const n=raw.padStart(6,"0"),override=FIFAROSTERS_FACE_OVERRIDES[raw]||FIFAROSTERS_FACE_OVERRIDES[n];return [override,`https://fifarosters.global.ssl.fastly.net/assets/players/${raw}.png`,`https://www.fifarosters.com/assets/players/${raw}.png`,`https://www.fifarosters.com/assets/player-faces/${raw}.png`].filter(Boolean)}
function isWholeCardAsset(url){return /ratings-images-prod\.pulse\.ea\.com\/(?:FC27|FC26)\/(?:components\/items|full\/player-shields)/i.test(String(url||""))}
function portraitCandidates(p){
 const arr=[];const add=u=>{u=String(u||"").trim();if(u&&!isWholeCardAsset(u)&&!arr.includes(u))arr.push(u)};
 const canonical=P_BY_ID.get(String(p?.id||"")),faces=[...(canonical&&canonical!==p?[canonical.face,canonical.portrait,canonical.headshot]:[]),p?.face,p?.portrait,p?.headshot];
 if(p?.isIcon){faces.forEach(add);add(iconPortraitUrl(p));if(p?.futwizId)futwizFaceCandidates(p.futwizId).forEach(add);add(ICON_PORTRAIT_CACHE[iconPortraitKey(p.name)]?.url);return arr}
 const legacy=u=>/https?:\/\/(?:cdn\.sofifa\.net|ratings-images-prod\.pulse\.ea\.com)\//i.test(String(u||""));
 const portraitId=[p?.futwizId,p?.id].map(v=>String(v||"" )).find(v=>/^[0-9]+$/.test(v))||"";
 faces.filter(u=>!legacy(u)).forEach(add);if(portraitId)futwizFaceCandidates(portraitId).forEach(add);faces.filter(legacy).forEach(add);if(portraitId){sofifaFaceCandidates(portraitId).forEach(add);fifaRostersFaceCandidates(portraitId,27).forEach(add)}return arr
}
const API_SPORTS_LEAGUE_IDS={
 "bundesliga":78,"premier league":39,"laliga ea sports":140,"la liga":140,"serie a":135,"ligue 1":61,
 "1a pro league":144,"eredivisie":88,"liga portugal":94,"trendyol super lig":203,"osterreichische fu ball bundesliga":218,
 "scottish premiership":179,"swiss super league":207
};
const API_SPORTS_TEAM_IDS={
 "fc bayern munchen":157,"bayern munchen":157,"bayern munich":157,"bayern":157,
 "borussia dortmund":165,"dortmund":165,"bayer 04 leverkusen":168,"bayer leverkusen":168,"leverkusen":168,
 "vfb stuttgart":172,"stuttgart":172,"rb leipzig":173,"leipzig":173,"sport club freiburg":160,"sc freiburg":160,"freiburg":160,
 "tsg hoffenheim":167,"tsg 1899 hoffenheim":167,"hoffenheim":167,"1 fsv mainz 05":164,"mainz 05":164,"mainz":164,
 "eintracht frankfurt":169,"frankfurt":169,"borussia monchengladbach":163,"monchengladbach":163,"gladbach":163,
 "fc augsburg":170,"augsburg":170,"1 fc union berlin":182,"union berlin":182,"sv werder bremen":162,"werder bremen":162,"werder":162,
 "hamburger sv":175,"hamburg":175,"1 fc koln":192,"fc koln":192,"koln":192,"sc paderborn 07":185,"paderborn":185,
 "sv elversberg":1660,"elversberg":1660,"fc schalke 04":174,"schalke 04":174,"schalke":174,
 "arsenal":42,"arsenal fc":42,"manchester city":50,"man city":50,"aston villa":66,"manchester united":33,"man united":33,"man utd":33,
 "liverpool":40,"liverpool fc":40,"afc bournemouth":35,"bournemouth":35,"brighton hove albion":51,"brighton and hove albion":51,"brighton":51,
 "chelsea":49,"chelsea fc":49,"brentford":55,"brentford fc":55,"crystal palace":52,"everton":45,"everton fc":45,"fulham":36,"fulham fc":36,
 "leeds united":63,"leeds":63,"newcastle united":34,"newcastle":34,"nottingham forest":65,"nottm forest":65,"sunderland":746,"sunderland afc":746,
 "tottenham hotspur":47,"tottenham":47,"spurs":47,"coventry city":1346,"coventry":1346,"ipswich town":57,"ipswich":57,"hull city":64,"hull":64,
 "fc barcelona":529,"barcelona":529,"real madrid":541,"real madrid cf":541,"atletico de madrid":530,"atletico madrid":530,"villarreal cf":533,"villarreal":533,
 "real betis":543,"real betis balompie":543,"rayo vallecano":728,"celta":538,"celta vigo":538,"rc celta":538,"valencia cf":532,"valencia":532,
 "malaga cf":535,"malaga":535,"r racing club":4665,"racing santander":4665,"rc deportivo":544,"deportivo la coruna":544,"deportivo":544,
 "inter":505,"inter milan":505,"internazionale":505,"fc internazionale milano":505,"roma":497,"as roma":497,"napoli":492,"ssc napoli":492,
 "juventus":496,"juventus fc":496,"atalanta":499,"atalanta bc":499,"como":895,"como 1907":895,"milan":489,"ac milan":489,"lazio":487,"ss lazio":487,
 "bologna":500,"bologna fc 1909":500,"fiorentina":502,"acf fiorentina":502,"udinese":494,"udinese calcio":494,"torino":503,"torino fc":503,
 "sassuolo":488,"us sassuolo calcio":488,"genoa":495,"genoa cfc":495,"parma":523,"parma calcio 1913":523,"venezia":517,"venezia fc":517,
 "cagliari":490,"cagliari calcio":490,"lecce":867,"us lecce":867,"frosinone":512,"frosinone calcio":512,"monza":1579,"ac monza":1579,
 "paris saint germain":85,"paris sg":85,"psg":85,"rc lens":116,"lens":116,"losc":79,"losc lille":79,"lille":79,"olympique lyonnais":80,"lyon":80,
 "as monaco":91,"monaco":91,"olympique de marseille":81,"marseille":81,"stade rennais f c":94,"stade rennais fc":94,"rennes":94,
 "rc strasbourg alsace":95,"strasbourg":95,"toulouse fc":96,"toulouse":96,"fc lorient":97,"lorient":97,"le havre ac":111,"le havre":111
};
const CLUB_IDENTITY_STOP=new Set(["fc","cf","afc","ac","sc","ssc","as","sv","vfb","vfl","tsg","rc","fk","sk","bk","club","football","futbol","calcio","the"]);
function clubIdentityKey(v){return normalizeKey(v).split(" ").filter(x=>x&&!CLUB_IDENTITY_STOP.has(x)).join(" ")}
// Logos the game ships itself (scripts/fetch-league-logos.cjs), keyed by EA's league name.
const LOCAL_LEAGUE_LOGOS={
 "arkema pl":"./assets/leagues/arkema-pl.png",
 "barclays wsl":"./assets/leagues/barclays-wsl.png",
 "calcio a femminile":"./assets/leagues/calcio-a-femminile.png",
 "ceska liga zen":"./assets/leagues/ceska-liga-zen.jpg",
 "gpfbl":"./assets/leagues/gpfbl.png",
 "iceland league":"./assets/leagues/iceland-league.png",
 "liga f moeve":"./assets/leagues/liga-f-moeve.png",
 "liga portugal feminino":"./assets/leagues/liga-portugal-feminino.png",
 "nwsl":"./assets/leagues/nwsl.png",
 "nederland vrouwen liga":"./assets/leagues/nederland-vrouwen-liga.jpg",
 "scottish women s league":"./assets/leagues/scottish-women-s-league.png",
 "sverige liga":"./assets/leagues/sverige-liga.png"
};
// The game shows some leagues under their full name (LEAGUE_NAME_ALIASES); those find the logo too.
function localLeagueLogo(league){
 const key=normalizeKey(league);if(LOCAL_LEAGUE_LOGOS[key])return LOCAL_LEAGUE_LOGOS[key];
 for(const [alias,name] of Object.entries(LEAGUE_NAME_ALIASES))if(LOCAL_LEAGUE_LOGOS[alias]&&normalizeKey(name)===key)return LOCAL_LEAGUE_LOGOS[alias];
 return""
}
function apiSportsLeagueLogo(league){const id=API_SPORTS_LEAGUE_IDS[normalizeKey(league)];return id?`https://media.api-sports.io/football/leagues/${id}.png`:""}
const API_SPORTS_TEAM_ID_CACHE=new Map();
function apiSportsTeamId(team){
 const key=normalizeKey(team);
 if(API_SPORTS_TEAM_ID_CACHE.has(key))return API_SPORTS_TEAM_ID_CACHE.get(key);
 const exact=API_SPORTS_TEAM_IDS[key];if(exact){API_SPORTS_TEAM_ID_CACHE.set(key,exact);return exact}
 const sig=clubIdentityKey(team);if(!sig)return"";
 const ids=new Set(Object.entries(API_SPORTS_TEAM_IDS).filter(([name])=>clubIdentityKey(name)===sig).map(([,id])=>id));
 const result=ids.size===1?[...ids][0]:"";
 API_SPORTS_TEAM_ID_CACHE.set(key,result);return result
}
function apiSportsTeamLogo(team){const id=apiSportsTeamId(team);return id?`https://media.api-sports.io/football/teams/${id}.png`:""}

// Exact-name badges from the pinned 2026/27 club collection. No similarity search or women's-team substitution.
let VERIFIED_BADGES={clubs:{}};
function isWomensAffiliation(team,p={}){
 const name=normalizeKey(team),gender=normalizeKey(p?.gender||""),league=normalizeKey(p?.league||"");
 return /(?:women|woman|ladies|vrouwen|feminin|femenin|frauen|damen|femminile|lyonnes)/.test(name+" "+gender)||
  /(?:women|woman|ladies|vrouwen|feminin|femenin|frauen|damen|femminile|liga f|arkema premiere ligue)/.test(league)
}
// EA ships the women's teams with their own team ids and crests, so only EA's crest is exact for them.
function womensClubLogo(p){const url=String(p?.clubLogo||"").trim();return /^https:\/\/drop-assets\.ea\.com\//.test(url)?url:""}
function verifiedClubBadge(team,p={}){
 return isWomensAffiliation(team,p)?null:VERIFIED_BADGES.clubs?.[normalizeKey(team)]||null
}
async function loadVerifiedBadges(){
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);let response;
  try{response=await fetch("./assets/badge-manifest.json",{cache:"force-cache",signal:controller.signal})}finally{clearTimeout(timer)}
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const data=await response.json();
  if(!data?.clubs||Object.keys(data.clubs).length<300)throw new Error("Badge-Manifest unvollständig");
  VERIFIED_BADGES=data
 }catch(e){console.warn("Vereinsbadge-Manifest nicht geladen",e)}
}

/* V18.46 — generic crest resolver for clubs/leagues outside the hardcoded Top-5 set.
   Uses Wikidata entity identity + Wikimedia Commons logo files, cached locally and resolved lazily. */
const GFUT_BADGE_DISCOVERY_KEY="gfutBadgeDiscoveryV1868";
let BADGE_DISCOVERY_CACHE=(()=>{try{return JSON.parse(localStorage.getItem(GFUT_BADGE_DISCOVERY_KEY)||"{}")||{}}catch(e){return{}}})();
const BADGE_DISCOVERY_PENDING=new Set(),BADGE_DISCOVERY_QUEUE=[];
let BADGE_DISCOVERY_ACTIVE=0,BADGE_DISCOVERY_RENDER_TIMER=0,BADGE_PREWARM_STARTED=false,BADGE_PLAYER_SAVE_TIMER=0;
const BADGE_PLAYER_SAVE_PENDING=new Map();
function scheduleBadgePlayerSave(players=[]){
 const rows=Array.isArray(players)?players:[players];for(const p of rows)if(p?.id)BADGE_PLAYER_SAVE_PENDING.set(String(p.id),p);
 if(!BADGE_PLAYER_SAVE_PENDING.size)return;
 clearTimeout(BADGE_PLAYER_SAVE_TIMER);
 BADGE_PLAYER_SAVE_TIMER=setTimeout(()=>{const batch=[...BADGE_PLAYER_SAVE_PENDING.values()];BADGE_PLAYER_SAVE_PENDING.clear();idbPutMany(batch).catch(()=>{})},1800)
}

function badgeDiscoveryKey(kind,name){return kind+"|"+normalizeKey(name)}
function badgeDiscoveryRow(kind,name){return BADGE_DISCOVERY_CACHE[badgeDiscoveryKey(kind,name)]||null}
function discoveredBadge(kind,name){return String(badgeDiscoveryRow(kind,name)?.url||"").trim()}
function discoveredClubLeague(team){
 const row=badgeDiscoveryRow("club",team);
 if(!row)return {name:"",url:""};
 const name=String(row.leagueName||"").trim();
 const direct=String(row.leagueUrl||"").trim();
 const cached=name?discoveredBadge("league",name):"";
 return {name,url:direct||cached}
}
let BADGE_DISCOVERY_SAVE_TIMER=0;
function persistBadgeDiscovery(){clearTimeout(BADGE_DISCOVERY_SAVE_TIMER);BADGE_DISCOVERY_SAVE_TIMER=setTimeout(()=>{try{localStorage.setItem(GFUT_BADGE_DISCOVERY_KEY,JSON.stringify(BADGE_DISCOVERY_CACHE))}catch(e){}},800)}
function claimRank(cl){return cl?.rank==="preferred"?0:cl?.rank==="normal"?1:2}
function claimHasEnd(cl){return !!(cl?.qualifiers?.P582?.length)}
function wikidataClaimId(entity,pid){
 const claims=entity?.claims?.[pid]||[];
 const ranked=[...claims].sort((a,b)=>(claimHasEnd(a)?1:0)-(claimHasEnd(b)?1:0)||claimRank(a)-claimRank(b));
 for(const cl of ranked){const id=cl?.mainsnak?.datavalue?.value?.id;if(id)return String(id)}
 return""
}
function wikidataClaimFile(entity,pid){
 const claims=entity?.claims?.[pid]||[];
 const ranked=[...claims].sort((a,b)=>claimRank(a)-claimRank(b));
 for(const cl of ranked){const v=cl?.mainsnak?.datavalue?.value;if(typeof v==="string"&&v.trim())return v.trim()}
 return""
}
function commonsFileUrl(filename){
 const f=String(filename||"").trim();
 return f?`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(f)}?width=180`:""
}
function plausibleBadgeFile(filename,kind){
 const f=String(filename||"").trim(),n=normalizeKey(f.split(/[\\/]/).pop()||"");
 if(!f||!/\.(?:svg|png|webp|jpe?g|gif)$/i.test(f))return false;
 if(/(?:sjaal|scarf|shawl|jersey|shirt|kit|uniform|stadium|arena|fan|supporter|flag|banner|poster|ticket|mascot|tifo|matchday|footballer|player)/.test(n))return false;
 return kind==="club"||kind==="league"
}

function footballEntityScore(result,kind,name){
 const label=normalizeKey(result?.label||""),target=normalizeKey(name),desc=normalizeKey(result?.description||"");
 const signature=value=>kind==="club"?clubIdentityKey(value).replace(/\b(?:18|19|20)\d{2}\b/g,"").trim():normalizeKey(value);
 if(label!==target&&signature(label)!==signature(target))return -100;
 if(kind==="club"){
  return /association football club|football club|soccer club|professional football club/.test(desc)?10:-100;
 }else{
  return /association football league|football league|professional football league|association football competition/.test(desc)?10:-100;
 }
}
async function wikidataFindFootballEntity(name,kind){
 const base=String(name||"").trim();
 const attempts=kind==="club"
  ?[base,base+" association football",base+" football club",base+" soccer club"]
  :[base,base+" football league",base+" association football league"];
 for(const q of attempts){
  if(!q)continue;
  const url=`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=en&uselang=en&type=item&limit=10&format=json&origin=*`;
  const data=await fetchJson(url,16000),rows=Array.isArray(data?.search)?data.search:[];
  const ranked=rows.map(x=>({x,score:footballEntityScore(x,kind,name)})).sort((a,b)=>b.score-a.score);
  if(ranked[0]?.score>=8)return ranked[0].x
 }
 return null
}
async function wikidataEntity(qid){
 if(!qid)return null;
 const url=`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(qid)}&props=claims%7Clabels&languages=en%7Cde&format=json&origin=*`;
 const data=await fetchJson(url,16000);
 return data?.entities?.[qid]||null
}
function entityLabel(entity){
 return String(entity?.labels?.en?.value||entity?.labels?.de?.value||"").trim()
}

/* V18.53 — icon portrait resolver (Wikidata P18 / Wikimedia Commons), cached lazily. */
const GFUT_ICON_PORTRAIT_KEY="gfutIconPortraitsV1857";
let ICON_PORTRAIT_CACHE=(()=>{try{return JSON.parse(localStorage.getItem(GFUT_ICON_PORTRAIT_KEY)||"{}")||{}}catch(e){return{}}})();
const ICON_PORTRAIT_PENDING=new Set(),ICON_PORTRAIT_QUEUE=[];
let ICON_PORTRAIT_ACTIVE=0,ICON_PORTRAIT_PREWARM_STARTED=false,ICON_PORTRAIT_RENDER_TIMER=0;
let ICON_PORTRAIT_SAVE_TIMER=0;
function persistIconPortraits(){clearTimeout(ICON_PORTRAIT_SAVE_TIMER);ICON_PORTRAIT_SAVE_TIMER=setTimeout(()=>{try{localStorage.setItem(GFUT_ICON_PORTRAIT_KEY,JSON.stringify(ICON_PORTRAIT_CACHE))}catch(e){}},800)}
function iconPortraitKey(name){return normalizeKey(name)}
function iconPortraitUrl(p){return String(p?.face||futwizVerifiedIconFace(p?.name)||"").trim()}
function commonsPortraitUrl(filename){const f=String(filename||"").trim();return f?`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(f)}?width=360`:""}
function footballPersonScore(result,name){
 const label=normalizeKey(result?.label||""),target=normalizeKey(name),desc=normalizeKey(result?.description||"");
 let score=0;if(label===target)score+=12;if(label&&target&&(label.includes(target)||target.includes(label)))score+=4;
 if(/footballer|association football player|soccer player|professional footballer/.test(desc))score+=10;
 else if(/football manager|football coach/.test(desc))score+=3;
 if(/club|team|stadium|league/.test(desc)&&!/footballer|player/.test(desc))score-=8;
 return score
}
async function wikidataFindFootballPerson(name){
 const base=String(name||"").trim();
 for(const q of [base,base+" footballer",base+" soccer player"]){
  const url=`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=en&uselang=en&type=item&limit=10&format=json&origin=*`;
  const data=await fetchJson(url,16000),rows=Array.isArray(data?.search)?data.search:[];
  const ranked=rows.map(x=>({x,score:footballPersonScore(x,name)})).sort((a,b)=>b.score-a.score);
  if(ranked[0]?.score>=10)return ranked[0].x
 }
 return null
}
async function discoverIconPortrait(name){
 const found=await wikidataFindFootballPerson(name);if(!found?.id)return null;
 const entity=await wikidataEntity(found.id);if(!entity)return null;
 const file=wikidataClaimFile(entity,"P18");return file?{name,qid:found.id,url:commonsPortraitUrl(file),ts:Date.now()}:null
}
function applyIconPortrait(name,row){
 if(!row?.url)return;const key=iconPortraitKey(name);
 for(const icon of MID_ICON_BASES){if(iconPortraitKey(icon.name)!==key)continue;icon.face=row.url;P_BY_ID.set(String(icon.id),icon)}
}
function scheduleIconPortraitRerender(){
 clearTimeout(ICON_PORTRAIT_RENDER_TIMER);
 ICON_PORTRAIT_RENDER_TIMER=setTimeout(()=>{try{refreshAffiliationDom(true)}catch(e){}},260)
}
function pumpIconPortraits(){
 while(ICON_PORTRAIT_ACTIVE<3&&ICON_PORTRAIT_QUEUE.length){
  const job=ICON_PORTRAIT_QUEUE.shift();ICON_PORTRAIT_ACTIVE++;
  (async()=>{try{
   const row=await discoverIconPortrait(job.name);ICON_PORTRAIT_CACHE[job.key]=row||{name:job.name,url:"",miss:true,ts:Date.now()};
   if(row)applyIconPortrait(job.name,row);persistIconPortraits();scheduleIconPortraitRerender()
  }catch(e){ICON_PORTRAIT_CACHE[job.key]={name:job.name,url:"",miss:true,ts:Date.now()};persistIconPortraits()}
  finally{ICON_PORTRAIT_PENDING.delete(job.key);ICON_PORTRAIT_ACTIVE--;setTimeout(pumpIconPortraits,140)}})()
 }
}
function queueIconPortrait(p,priority=false){
 if(!p?.isIcon||!p?.name)return;const key=iconPortraitKey(p.name),old=ICON_PORTRAIT_CACHE[key],age=Date.now()-Number(old?.ts||0);
 if(old?.url){if(!p.face)applyIconPortrait(p.name,old);return}
 if((old?.miss&&age<6*60*60*1000)||ICON_PORTRAIT_PENDING.has(key))return;
 ICON_PORTRAIT_PENDING.add(key);const job={key,name:p.name};priority?ICON_PORTRAIT_QUEUE.unshift(job):ICON_PORTRAIT_QUEUE.push(job);pumpIconPortraits()
}
function startIconPortraitPrewarm(){
 if(ICON_PORTRAIT_PREWARM_STARTED)return;ICON_PORTRAIT_PREWARM_STARTED=true;
 for(const icon of MID_ICON_BASES){if(!icon.face&&ICON_PORTRAIT_CACHE[iconPortraitKey(icon.name)]?.url)applyIconPortrait(icon.name,ICON_PORTRAIT_CACHE[iconPortraitKey(icon.name)])}
}
function applyDiscoveredClubMeta(team,row){
 const tk=normalizeKey(team);if(!tk||!row)return[];
 const linkedLeague=row.leagueName?badgeDiscoveryRow("league",row.leagueName):null,leagueUrl=String(row.leagueUrl||linkedLeague?.url||"").trim(),changedRows=[];
 for(const p of playerRowsForTeam(team)){
  const oldLeague=p.league;let changed=false;
  if(row.url&&!p.clubLogo){p.clubLogo=row.url;changed=true}
  if(row.leagueName&&!p.league){p.league=row.leagueName;changed=true}
  if(leagueUrl&&!p.leagueLogo){p.leagueLogo=leagueUrl;changed=true}
  if(changed){changedRows.push(p);if(oldLeague!==p.league)reindexPlayerAffiliation(p,p.team,oldLeague)}
 }
 if(changedRows.length){scheduleMarketFilterIndexRebuild();scheduleBadgePlayerSave(changedRows)}
 return changedRows
}
function applyDiscoveredLeagueMeta(league,row){
 const lk=normalizeKey(league);if(!lk||!row?.url)return[];
 const changedRows=[];
 for(const p of playerRowsForLeague(league))if(!p.leagueLogo){p.leagueLogo=row.url;changedRows.push(p)}
 if(changedRows.length)scheduleBadgePlayerSave(changedRows);
 for(const rowClub of Object.values(BADGE_DISCOVERY_CACHE)){
  if(!rowClub?.leagueName||normalizeKey(rowClub.leagueName)!==lk)continue;
  if(!rowClub.leagueUrl)rowClub.leagueUrl=row.url;
  if(rowClub.name)for(const p of applyDiscoveredClubMeta(rowClub.name,rowClub))if(!changedRows.includes(p))changedRows.push(p)
 }
 return changedRows
}
function applyBadgeCacheToPlayers(){
 const clubs=new Map(),aliases=new Map(),leagues=new Map();
 for(const [key,row] of Object.entries(BADGE_DISCOVERY_CACHE)){
  if(!row?.name)continue;
  if(key.startsWith("league|"))leagues.set(normalizeKey(row.name),row);
  if(key.startsWith("club|")){
   const name=normalizeKey(row.name),sig=clubIdentityKey(row.name);
   if(!clubs.has(name))clubs.set(name,row);
   if(sig&&!aliases.has(sig))aliases.set(sig,row)
  }
 }
 const changedRows=[];let leagueChanged=false;
 for(const p of PLAYERS){
  const oldLeague=p.league,club=clubs.get(normalizeKey(p?.team))||aliases.get(clubIdentityKey(p?.team));let changed=false;
  if(club){
   const linked=club.leagueName?leagues.get(normalizeKey(club.leagueName)):null;
   if(club.url&&!p.clubLogo){p.clubLogo=club.url;changed=true}
   if(club.leagueName&&!p.league){p.league=club.leagueName;changed=true;leagueChanged=true}
   const leagueUrl=club.leagueUrl||linked?.url;
   if(leagueUrl&&!p.leagueLogo){p.leagueLogo=leagueUrl;changed=true}
  }
  const league=leagues.get(normalizeKey(p?.league));
  if(league?.url&&!p.leagueLogo){p.leagueLogo=league.url;changed=true}
  if(changed){changedRows.push(p);if(oldLeague!==p.league)reindexPlayerAffiliation(p,p.team,oldLeague)}
 }
 if(changedRows.length){if(leagueChanged)scheduleMarketFilterIndexRebuild();scheduleBadgePlayerSave(changedRows)}
}
async function discoverFootballBadge(kind,name,leagueHint=""){
 const search=await wikidataFindFootballEntity(name,kind);
 if(!search?.id)return null;
 const entity=await wikidataEntity(search.id);if(!entity)return null;
 const file=[wikidataClaimFile(entity,"P154"),wikidataClaimFile(entity,"P94")].find(candidate=>plausibleBadgeFile(candidate,kind))||"";
 const row={name:String(name||""),qid:search.id,url:commonsFileUrl(file),ts:Date.now()};
 if(kind==="club"){
  const leagueQid=wikidataClaimId(entity,"P118");
  const leagueEntity=leagueQid?await wikidataEntity(leagueQid):null;
  let leagueName=entityLabel(leagueEntity);
  if(!leagueName&&leagueHint)leagueName=String(leagueHint).trim();
  row.leagueName=leagueName;
  if(leagueEntity){
   const leagueFile=[wikidataClaimFile(leagueEntity,"P154"),wikidataClaimFile(leagueEntity,"P94")].find(candidate=>plausibleBadgeFile(candidate,"league"))||"";
   row.leagueUrl=commonsFileUrl(leagueFile)
  }
  if(row.leagueName){
   const existing=badgeDiscoveryRow("league",row.leagueName);
   if(row.leagueUrl){
    BADGE_DISCOVERY_CACHE[badgeDiscoveryKey("league",row.leagueName)]={name:row.leagueName,qid:leagueQid||existing?.qid||"",url:row.leagueUrl,ts:Date.now()}
   }else{
    queueBadgeDiscovery("league",row.leagueName)
   }
  }
 }
 return row
}
function queueBadgeDiscovery(kind,name,leagueHint="",priority=false){
 const clean=String(name||"").trim();if(!clean)return;
 const key=badgeDiscoveryKey(kind,clean),old=BADGE_DISCOVERY_CACHE[key],age=Date.now()-Number(old?.ts||0);
 const recentMiss=old?.miss&&age<5*60*1000;
 const recentNoLogo=old?.qid&&!old?.url&&age<15*60*1000;
 if(old?.url||recentMiss||recentNoLogo||BADGE_DISCOVERY_PENDING.has(key))return;
 BADGE_DISCOVERY_PENDING.add(key);
 const job={kind,name:clean,key,leagueHint:String(leagueHint||"").trim()};
 priority?BADGE_DISCOVERY_QUEUE.unshift(job):BADGE_DISCOVERY_QUEUE.push(job);
 pumpBadgeDiscovery()
}
function scheduleBadgeRerender(){
 AFFILIATION_CACHE_EPOCH++;
 clearTimeout(BADGE_DISCOVERY_RENDER_TIMER);
 BADGE_DISCOVERY_RENDER_TIMER=setTimeout(()=>{try{refreshAffiliationDom(false)}catch(e){}},700)
}
function pumpBadgeDiscovery(){
 while(BADGE_DISCOVERY_ACTIVE<2&&BADGE_DISCOVERY_QUEUE.length){
  const job=BADGE_DISCOVERY_QUEUE.shift();BADGE_DISCOVERY_ACTIVE++;
  (async()=>{
   try{
    const row=await discoverFootballBadge(job.kind,job.name,job.leagueHint);
    BADGE_DISCOVERY_CACHE[job.key]=row||{name:job.name,url:"",ts:Date.now(),miss:true};
    if(row&&job.kind==="club")applyDiscoveredClubMeta(job.name,row);
    if(row&&job.kind==="league")applyDiscoveredLeagueMeta(job.name,row);
    persistBadgeDiscovery();scheduleBadgeRerender()
   }catch(e){
    BADGE_DISCOVERY_CACHE[job.key]={name:job.name,url:"",ts:Date.now(),miss:true};persistBadgeDiscovery()
   }finally{
    BADGE_DISCOVERY_PENDING.delete(job.key);BADGE_DISCOVERY_ACTIVE--;
    setTimeout(pumpBadgeDiscovery,160)
   }
  })()
 }
}
function prioritizeVisibleSquadBadges(){
 try{
  const items=squadItems().filter(Boolean);
  for(const it of items){
   const p=displayBase(it);if(!p)continue;
   if(p.team&&!verifiedClubBadge(p.team,p)&&!isWomensAffiliation(p.team,p))queueBadgeDiscovery("club",p.team,p.league,true);
   if(p.league)queueBadgeDiscovery("league",p.league,"",true)
  }
 }catch(e){}
}
function startGlobalBadgePrewarm(){
 if(BADGE_PREWARM_STARTED||!PLAYERS.length)return;
 BADGE_PREWARM_STARTED=true;
 prioritizeVisibleSquadBadges();
 setTimeout(()=>{
  const clubs=new Map(),leagues=new Set();
  for(const p of PLAYERS){
   if(p?.team&&!p?.clubLogo&&!verifiedClubBadge(p.team,p)&&!isWomensAffiliation(p.team,p)&&!apiSportsTeamLogo(p.team)&&!clubs.has(normalizeKey(p.team)))clubs.set(normalizeKey(p.team),{team:p.team,league:p.league||""});
   if(p?.league&&!p?.leagueLogo&&!apiSportsLeagueLogo(p.league))leagues.add(p.league)
  }
  // Resolve the much smaller league set first, so non-Top-5 league crests are available quickly.
  for(const league of leagues)queueBadgeDiscovery("league",league,"",false);
  for(const row of clubs.values())queueBadgeDiscovery("club",row.team,row.league,false)
 },700)
}
function emblemCandidates(kind,p){
 const arr=[];const add=u=>{u=String(u||"").trim();if(u&&!arr.includes(u))arr.push(u)};
 if(p?.id===NIKLAS_FOUNDER_PLAYER_ID&&kind==="flag")return["./assets/footera/events/flashback/de.png"];
 if(p?.id===NIKLAS_FOUNDER_PLAYER_ID&&kind==="club")return[NIKLAS_FOUNDER_BASE.clubLogo];
 if(p?.id===NIKLAS_FOUNDER_PLAYER_ID&&kind==="league")return[NIKLAS_FOUNDER_BASE.leagueLogo];
 if(p?.id===FOUNDER_PLAYER_ID&&kind==="club")return[FOUNDER_BASE.clubLogo];
 if(p?.id===FOUNDER_PLAYER_ID&&kind==="league")return[FOUNDER_BASE.leagueLogo];
 if(p?.id===MARCO_FOUNDER_PLAYER_ID&&kind==="club")return[MARCO_FOUNDER_BASE.clubLogo];
 if(p?.id===MARCO_FOUNDER_PLAYER_ID&&kind==="league")return[MARCO_FOUNDER_BASE.leagueLogo];
 if(kind==="club"){
  const verified=verifiedClubBadge(p?.team,p);
  if(verified){add(verified.url);return arr}
  if(isWomensAffiliation(p?.team,p)){add(womensClubLogo(p));return arr}
  add(apiSportsTeamLogo(p?.team));add(p?.clubLogo);
  if(/^\d+$/.test(String(p?.teamId||"")))add(`https://cdn.sofifa.net/meta/team/${p.teamId}/120.png`);
  add(discoveredBadge("club",p?.team));
  if(p?.team&&!discoveredBadge("club",p.team))queueBadgeDiscovery("club",p.team,p.league,true)
 }
 if(kind==="league"){
  const linked=discoveredClubLeague(p?.team),leagueName=String(p?.league||linked.name||"").trim();
  const linkedMatches=!!linked.name&&normalizeKey(leagueFromClub("",linked.name))===normalizeKey(leagueFromClub("",leagueName));
  add(localLeagueLogo(leagueName));
  add(apiSportsLeagueLogo(leagueName));
  add(p?.leagueLogo);
  if(linkedMatches)add(linked.url);
  add(discoveredBadge("league",leagueName));
  if(p?.team&&!verifiedClubBadge(p.team,p)&&!linked.url)queueBadgeDiscovery("club",p.team,p.league,true);
  if(leagueName&&!discoveredBadge("league",leagueName))queueBadgeDiscovery("league",leagueName,"",true);
 }
 if(kind==="flag"){
  add(p?.nationFlag);
  const raw=normalizeKey(p?.nation),special={"england":"gb-eng","scotland":"gb-sct","wales":"gb-wls","northern ireland":"gb-nir"};
  const code=special[raw]||countryCode(p?.nation).toLowerCase();
  if(/^[a-z]{2}(?:-[a-z]{3})?$/.test(code))add(`https://flagcdn.com/w40/${code}.png`);
 }
 return arr
}
function imgCandidatesAttr(arr){return esc(JSON.stringify(arr))}
function advanceImg(el){try{const arr=JSON.parse(el.dataset.candidates||'[]'),failed=String(el?.currentSrc||el?.src||'');if(failed){IMAGE_FAILURE_CACHE.set(failed,Date.now());const candidate=arr[Number(el.dataset.idx||0)];if(candidate)IMAGE_FAILURE_CACHE.set(candidate,Date.now());persistImageCaches()}let i=Number(el.dataset.idx||0)+1;while(i<arr.length&&(!arr[i]||imageFailedRecently(arr[i])))i++;if(i<arr.length){el.dataset.idx=String(i);el.src=arr[i];if(el.closest?.('.face'))watchVisiblePortrait(el);return}if(el.closest?.('.face'))stopPortraitWatch(el);if(el.dataset.iconName)queueIconPortrait({name:el.dataset.iconName,isIcon:true},true);el.style.display='none';const fb=el.parentElement?.querySelector('.asset-fallback,.face-fallback');if(fb)fb.style.display=fb.classList.contains('face-fallback')?'flex':'grid'}catch(e){el.style.display='none'}}
function eventDynamicFace(p,item){
 if(item?.variant==="story")return String(item.dynamicFace||"").trim();
 if(item?.variant!=="special")return"";
 if(String(item.eventName||"").startsWith("Team of the Week")||String(item.eventType||"").startsWith("totw")){
  const week=typeof TOTW_WEEKS!=="undefined"?TOTW_WEEKS.find(w=>`totw-${w.id}`===item.eventReleaseId||w.name===item.eventName):null;
  const info=week?.players.find(row=>row.eaId&&String(row.eaId)===String(p?.futwizId||p?.id)||typeof totwAliasMatch==="function"&&totwAliasMatch(p,row)===100);
  return String(info?.fallback?.face||"");
 }
 const info=promoItemInfo(item);return String(item.dynamicFace||item.eventFace||info?.dynamicFace||info?.eventFace||p?.dynamicFace||p?.eventFace||"").trim()
}
function portraitHTML(p,deferred=false,item=null){const dynamic=eventDynamicFace(p,item),key=imageCacheKey(dynamic?`event-portrait:${dynamic}`:'portrait',p),fallback=prioritizeCached(portraitCandidates(p),imageCacheKey('portrait',p)),arr=[...new Set([...(dynamic&&!imageFailedRecently(dynamic)?[dynamic]:[]),...fallback])];if(!arr.length){if(p?.isIcon)queueIconPortrait(p,true);return'<span class="face-fallback" style="display:flex">👤</span>'}return `<img ${deferred?`data-pending-src="${esc(arr[0])}" style="display:none"`:`src="${esc(arr[0])}"`} loading="lazy" decoding="async" fetchpriority="auto" data-cache-key="${esc(key)}" data-candidates="${imgCandidatesAttr(arr)}" data-idx="0" ${p?.isIcon?`data-icon-name="${esc(p.name)}"`:''} referrerpolicy="no-referrer" alt="${esc(p.name||'Spieler')}" onload="rememberLoadedImage(this)" onerror="advanceImg(this)"><span class="face-fallback" ${deferred?'style="display:flex"':''}>👤</span>`}
const PORTRAIT_LOAD_TIMERS=new WeakMap(),VISIBLE_PORTRAITS=new WeakSet();
function stopPortraitWatch(el){clearTimeout(PORTRAIT_LOAD_TIMERS.get(el));PORTRAIT_LOAD_TIMERS.delete(el)}
function watchVisiblePortrait(el){
 stopPortraitWatch(el);
 if(!VISIBLE_PORTRAITS.has(el)||!el.isConnected||!el.getAttribute("src")||el.style.display==="none"||(el.complete&&el.naturalWidth>0))return;
 const src=el.getAttribute("src");
 const pending=[...(document.querySelectorAll?.(".face img")||[])].filter(im=>VISIBLE_PORTRAITS.has(im)&&im.isConnected&&im.style.display!=="none"&&!(im.complete&&im.naturalWidth>0)).length;
 const budget=8000+Math.min(22000,Math.max(0,pending-1)*2000);
 PORTRAIT_LOAD_TIMERS.set(el,setTimeout(()=>{
  PORTRAIT_LOAD_TIMERS.delete(el);
  if(el.isConnected&&VISIBLE_PORTRAITS.has(el)&&el.getAttribute("src")===src&&!(el.complete&&el.naturalWidth>0))advanceImg(el)
 },budget))
}
function initializePortraitLoading(){
 if(typeof IntersectionObserver!=="function")return;
 const visible=new IntersectionObserver(entries=>{
  for(const entry of entries){const el=entry.target;
   if(entry.isIntersecting){VISIBLE_PORTRAITS.add(el);el.fetchPriority="high";el.loading="eager"}
   else{VISIBLE_PORTRAITS.delete(el);stopPortraitWatch(el)}
  }
  for(const entry of entries)if(entry.isIntersecting)watchVisiblePortrait(entry.target)
 },{rootMargin:"150px"});
 const images=node=>node.nodeType===1?[...(node.matches(".face img")?[node]:[]),...node.querySelectorAll(".face img")]:[];
 const added=node=>{for(const el of images(node))visible.observe(el)};
 const removed=node=>{for(const el of images(node)){visible.unobserve(el);VISIBLE_PORTRAITS.delete(el);stopPortraitWatch(el)}};
 new MutationObserver(records=>{for(const r of records){r.removedNodes.forEach(removed);r.addedNodes.forEach(added)}}).observe(document.body,{childList:true,subtree:true});
 added(document.body)
}
function badgeAsset(kind,p,fallbackText){
 const key=imageCacheKey(kind,p),arr=prioritizeCached(emblemCandidates(kind,p),key);
 const fallbackClass=kind==="league"?"league-badge-fallback":"club-badge-fallback",fallbackTextHtml=esc(fallbackText||"");
 if(!arr.length)return '<span class="asset-fallback '+fallbackClass+'">'+fallbackTextHtml+'</span>';
 return '<img class="badge-img" src="'+esc(arr[0])+'" loading="lazy" decoding="async" fetchpriority="low" data-cache-key="'+esc(key)+'" data-candidates="'+imgCandidatesAttr(arr)+'" data-idx="0" referrerpolicy="no-referrer" onload="rememberLoadedImage(this)" onerror="advanceImg(this)"><span class="asset-fallback '+fallbackClass+'" style="display:none">'+fallbackTextHtml+'</span>'
}
function flagAsset(p){const key=imageCacheKey('flag',p),arr=prioritizeCached(emblemCandidates('flag',p),key);if(!arr.length)return `<span>${flagEmoji(p.nation)}</span>`;return `<img class="card-flag-img" src="${esc(arr[0])}" loading="lazy" decoding="async" fetchpriority="low" data-cache-key="${esc(key)}" data-candidates="${imgCandidatesAttr(arr)}" data-idx="0" referrerpolicy="no-referrer" onload="rememberLoadedImage(this)" onerror="advanceImg(this)"><span class="asset-fallback" style="display:none">${flagEmoji(p.nation)}</span>`}
function officialCardCandidates(p){const id=String(p?.id||"").replace(/[^0-9]/g,"");const arr=[];const add=u=>{u=String(u||"").trim();if(u&&!arr.includes(u))arr.push(u)};if(p?.card&&/\/FC27\/components\/items\//i.test(p.card))add(p.card);if(!id)return arr;add(`https://ratings-images-prod.pulse.ea.com/FC27/components/items/${id}_de-DE.webp`);return arr}
function advanceOfficialCard(el){
 try{
  const failed=String(el?.currentSrc||el?.src||'');if(failed){IMAGE_FAILURE_CACHE.set(failed,Date.now());persistImageCaches()}
  const arr=JSON.parse(el.dataset.candidates||'[]');let i=Number(el.dataset.idx||0)+1;
  while(i<arr.length&&imageFailedRecently(arr[i]))i++;
  if(i<arr.length){el.classList.remove('loaded');el.dataset.idx=String(i);el.src=arr[i];return}
  const pending=el.parentElement?.querySelector('.face img[data-pending-src]');
  if(pending){const src=pending.dataset.pendingSrc;delete pending.dataset.pendingSrc;pending.style.display='';pending.src=src}
  el.remove()
 }catch(e){el?.remove()}
}
function officialCardHTML(p,item){
 if(p?.isIcon||item?.variant||item?.evo||item?.boost||item?.overridePosition||!p?.id)return"";
 const arr=prioritizeCached(officialCardCandidates(p),imageCacheKey('official-card',p));
 if(!arr.length)return"";
 return `<img class="official-card" src="${esc(arr[0])}" data-cache-key="${esc(imageCacheKey('official-card',p))}" data-candidates="${imgCandidatesAttr(arr)}" data-idx="0" alt="${esc(p.name||'Spieler')}" loading="lazy" decoding="async" onload="rememberLoadedImage(this)" onerror="advanceOfficialCard(this)">`
}
function playerGender(p){const g=normalizeKey(p?.gender||p?.sex||p?.playerGender||"");if(["female","women","woman","f","1"].includes(g)||/^wom[ae]n s football$/.test(g))return"female";if(["male","men","man","m","0","men s football"].includes(g))return"male";return""}
function positionLabel(pos,p=null){const raw=String(pos||"").toUpperCase();if(raw==="GK")return playerGender(p)==="female"?"TH":"TW";const m={CB:"IV",RB:"RV",LB:"LV",RWB:"RAV",LWB:"LAV",CDM:"ZDM",CM:"ZM",CAM:"ZOM",RM:"RM",RW:"RF",LM:"LM",LW:"LF",CF:"MS",ST:"ST"};return m[raw]||raw}
function cardStatPairs(p){if(String(p?.position||"").toUpperCase()==="GK")return[["HEC",p.pac],["BSI",p.sho],["ABS",p.pas],["REF",p.dri],["TMP",p.def],["POS",p.phy]];return[["TEM",p.pac],["SCH",p.sho],["PAS",p.pas],["DRI",p.dri],["DEF",p.def],["PHY",p.phy]]}
function cardStatLongLabel(k){return({HEC:"Hechten",BSI:"Ballsicherheit",ABS:"Abschlag",REF:"Reflexe",TMP:"Tempo",POS:"Stellungsspiel",TEM:"Tempo",SCH:"Schießen",PAS:"Passen",DRI:"Dribbling",DEF:"Defensive",PHY:"Physis"})[k]||k}
function positionRoleLabel(p){return String(p?.role||"").trim()||"–"}
function playerFoot(p){const f=preferredFootName(p?.preferredFoot);return f==="Left"?"Links":f==="Right"?"Rechts":"–"}
function ratedStars(value){const n=Number(value);return Number.isInteger(n)&&n>=1&&n<=5?n:0}
function skillStars(p){return ratedStars(p?.skillMoves)}
function weakFootStars(p){return ratedStars(p?.weakFoot)}
function workRates(p){return String(p?.workRates||p?.workRate||"").trim()||"–"}
function stars(n){return n>=1&&n<=5?"★".repeat(n)+"☆".repeat(5-n):"–"}
function isOnTransferList(uid){return (state.transferList||[]).includes(uid)}
function activeTransferSaleForUid(uid){return (state.transferSales||[]).find(s=>String(s.uid)===String(uid)&&s.status==="active")||null}
let transferOfferContext=null;
function priceCompareSeed(base,i,kind=""){return hashNum(`${base?.id||base?.name||"player"}|${i}|${promoWindowKey(new Date(),19)}${kind?"|"+kind:""}`)}
function marketListingCardKey(x){return [String(x?.base?.id||""),String(x?.variant||""),String(x?.eventType||""),String(x?.eventName||""),String(Number(x?.boost||0)),String(x?.overridePosition||"")].join("|")}
function marketItemCardKey(item,base=null){const b=base||displayBase(item)||itemBase(item);return [String(item?.pid||b?.id||""),String(item?.variant||""),String(item?.eventType||""),String(item?.eventName||""),String(Number(item?.boost||0)),String(item?.overridePosition||"")].join("|")}
let priceCompareListings=[],priceCompareContext=null;
function buildPriceComparison(item,fallbackBase=null){
 const base=displayBase(item)||fallbackBase;if(!base)return[];
 const key=marketItemCardKey(item,base);
 const collect=()=>{const seen=new Set();return [...marketInventory,...(state.auctions||[])].filter(x=>x&&marketListingCardKey(x)===key).filter(x=>{const id=x.listingId||x;if(seen.has(id))return false;seen.add(id);return true})};
 let all=collect();
 if(!all.length){
  const current=marketFilters(),focused={...current,name:normalizeKey(base.name||""),league:"",club:"",nation:"",position:"",quality:"",specialType:"",ratingMin:0,ratingMax:99,priceMin:0,priceMax:0};
  buildMarketSnapshot(focused);all=collect()
 }
 return all.filter(x=>!x.settled).sort((a,b)=>Number(a.price||0)-Number(b.price||0)||Number(a.ends||0)-Number(b.ends||0))
}
function renderPriceComparison(){
 const ctx=priceCompareContext;if(!ctx)return;
 const item=ctx.item,fallbackBase=ctx.fallbackBase,base=displayBase(item)||fallbackBase;if(!base)return;
 const offers=buildPriceComparison(item,fallbackBase);priceCompareListings=offers;
 const cheapest=offers[0]?.price||0,shown=displayBase(item)||base;
 $("priceCompareTitle").textContent=`Preisvergleich · ${base.name}`;
 $("priceCompareSub").textContent=`${isMomentumItem(item)?"MOMENTUM · ":""}${playerClubLabel(base)} · ${positionLabel(base.position,base)} · GES ${Number(shown.ovr||base.ovr||0)}`;
 const list=offers.length?offers.map((o,i)=>{const st=marketAuctionState(o),next=nextMarketBid(o),time=o.settled?"Abgelaufen":auctionTime(o)+"s";return `<div class="price-compare-row ${st.key}" data-price-compare-offer="${i}"><span class="price-compare-rank">#${i+1}</span><div class="price-compare-info"><div class="price-compare-cell"><small>Startpreis</small><b>${currencyAmountHTML("coins",o.startPrice||o.bid,"compact")}</b></div><div class="price-compare-cell"><small>Akt. Gebot</small><b>${currencyAmountHTML("coins",o.bid,"compact")}</b></div><div class="price-compare-cell"><small>Sofortkauf</small><b>${currencyAmountHTML("coins",o.price,"compact")}</b></div><div class="price-compare-cell"><small>Restzeit</small><b data-price-compare-time="${i}">${time}</b></div></div><div class="price-compare-actions"><button class="secondary" data-price-compare-details="${i}">Details</button><button class="secondary" data-price-compare-bid="${i}" ${(o.settled||st.key==="leading"||next==null)?"disabled":""}>${st.key==="leading"?"Höchstbietender":next==null?"Preislimit erreicht":`Bieten · ${currencyAmountHTML("coins",next,"compact")}`}</button><button class="primary" data-price-compare-buy="${i}" ${o.settled?"disabled":""}>Kaufen · ${currencyAmountHTML("coins",o.price,"compact")}</button></div></div>`}).join(""):'<div class="transfer-empty">Aktuell gibt es keine aktiven Angebote für genau diese Karten-Version.</div>';
 $("priceCompareBody").innerHTML=`<div class="price-compare-hero"><div class="price-compare-card">${cardHTML(shown,item||makeItem(base,true),true)}</div><div><span>Günstigster Sofortkauf</span><strong>${offers.length?currencyAmountHTML("coins",cheapest,"price-compare-best"):"–"}</strong><small>${offers.length} echte Marktangebote ausschließlich für ${esc(base.name)}</small></div></div><div class="price-compare-list">${list}</div>`
}
function openPriceComparison(item,fallbackBase=null){
 const base=displayBase(item)||fallbackBase;if(!base)return;
 priceCompareContext={item,fallbackBase};renderPriceComparison();showUiLayer("priceCompareModal","price-compare")
}
function openTransferOfferModal(item,{packIndex=null}={}){
 if(!item||isFounderItem(item))return;const base=displayBase(item);if(!base)return;
 const inClub=state.club.some(x=>x.uid===item.uid),inSquad=inClub&&transferSalePlayerInSquad(item.uid),active=inClub&&activeTransferSaleForUid(item.uid),p=transferSuggestedPrices(item),special=isSpecialPricedItem(item),minStart=special?SPECIAL_START_MIN:150,minBuy=special?SPECIAL_MARKET_MIN:200;
 transferOfferContext={uid:item.uid,packIndex:Number.isInteger(packIndex)?packIndex:null};
 $("transferOfferSub").textContent=`${base.name} · ${playerClubLabel(base)}`;
 $("transferOfferBody").innerHTML=`<div class="transfer-offer-player"><div class="transfer-offer-card">${cardHTML(base,item,true)}</div><div><h3>${esc(base.name)}</h3><p>Lege Startpreis, Sofortkauf und Angebotsdauer fest.</p>${inSquad?'<div class="transfer-offer-warning">Beim Anbieten wird der Spieler aus allen gespeicherten Mannschaften entfernt.</div>':""}${active?'<div class="transfer-offer-warning">Dieser Spieler ist bereits aktiv auf dem Transfermarkt.</div>':""}${!item.tradeable?'<div class="transfer-offer-warning">Dieses Item ist untauschbar.</div>':""}</div></div><div class="transfer-offer-form"><label>Startpreis<input id="directSellStart" type="number" min="${minStart}" max="${MARKET_MAX_PRICE-50}" step="50" value="${Math.max(minStart,Number(p.start||minStart))}"></label><label>Sofortkauf<input id="directSellBuy" type="number" min="${minBuy}" max="${MARKET_MAX_PRICE}" step="50" value="${Math.max(minBuy,Number(p.buy||minBuy))}"></label><label>Dauer<select id="directSellDuration"><option value="3600">1 Stunde</option><option value="10800">3 Stunden</option><option value="21600">6 Stunden</option></select></label><button id="directSellConfirm" class="primary" ${(!item.tradeable||active)?"disabled":""}>Jetzt aktiv anbieten</button></div>`;
 showUiLayer("transferOfferModal","transfer-offer")
}
function movePackItemToTransferList(k){
 const item=pendingPack[k];if(!item||isFounderItem(item)||pendingResolved.has(k)||!item.tradeable)return false;
 if(!state.club.some(x=>x.uid===item.uid))state.club.push(item);
 state.transferList=state.transferList||[];if(!state.transferList.includes(item.uid))state.transferList.push(item.uid);
 pendingResolved.add(k);state.pendingResolved=[...pendingResolved];save();return true
}
function toggleTransferList(uid){
 state.transferList=state.transferList||[];
 const item=state.club.find(x=>x.uid===uid);
 if(item&&isFounderItem(item))return false;
 if(!isOnTransferList(uid)&&item&&!item.tradeable){toast("Untauschbare Spieler können nicht auf die Transferliste.");return false}
 if(isOnTransferList(uid)&&activeTransferSaleForUid(uid)){toast("Aktive Transfers können nicht aus der Transferliste entfernt werden.");return false}
 if(isOnTransferList(uid))state.transferList=state.transferList.filter(x=>x!==uid);else state.transferList.push(uid);
 save();return true
}
function playerProfileTypeLabel(item,friend=false){
 if(friend)return"FREUNDESKARTE";
 if(isFounderItem(item))return"FOOTERA FOUNDER";
 if(isStoryItem(item))return STORY_PASS_PLAYERS[item.storyRewardKey].season==="s1"?"STORY":`${item.eventName||"SAISON"} · SEASON PASS`;
  if(item?.cosmeticDesign==="totw")return"TEAM OF THE WEEK · EVO";
  if(item?.cosmeticDesign==="momentum")return"MOMENTUM · EVO";
  if(item?.cosmeticDesign==="red")return"CHAMPIONS ROT";
  if(item?.cosmeticDesign==="red-pro")return"CHAMPIONS ELITE ROT";
  if(item?.cosmeticDesign==="halloween")return isEvolutionItem(item)?"HALLOWEEN · BLUTMOND-EVO":"HALLOWEEN · EVO";
  if(String(item?.eventType||"").startsWith("halloween"))return halloweenUpgradeFor(item)?"HALLOWEEN · BLUTMOND-UPGRADE +1":"HALLOWEEN · BLUTMOND";
  if(isMomentumItem(item))return"MOMENTUM";
 if(item?.variant==="icon-mid")return"ICON";
 if(item?.variant==="special"&&String(item?.eventName||"").startsWith("Team of the Week"))return"TEAM OF THE WEEK";
 if(item?.variant==="special")return String(item?.eventName||"SPEZIALKARTE").toUpperCase();
 return"SPIELERPROFIL"
}
function playerBiographyHTML(b,item,{shownPosition=null,clubPerf=null,friend=false}={}){
 const alts=String(b.alt||"").split(/[,/]/).map(x=>x.trim()).filter(Boolean),founder=isFounderItem(item),name=founder?b.fullName:b.name;
 const typeLabel=playerProfileTypeLabel(item,friend),nation=founder?"Deutschland":nationLabel(b.nation),position=positionLabel(b.position,b);
 const info=[["Starker Fuß",playerFoot(b)],["Skills",stars(skillStars(b))],["Schwacher Fuß",stars(weakFootStars(b))],["Workrates",workRates(b)],["Spielerrolle",positionRoleLabel(b)]];
 if(founder)info.splice(1,0,["Größe",`${Number(b.height)||172} cm`]);
 const positions=[b.position,...alts].filter(Boolean),attributes=cardStatPairs(b);
 const performance=clubPerf?`<section class="bio-panel bio-performance"><div class="bio-panel-head"><div><span class="bio-panel-kicker">DEIN VEREIN</span><h4>Vereinsleistung</h4></div><small>Nur Einsätze für deinen Club</small></div><div class="bio-performance-grid"><div><strong>${clubPerf.goals}</strong><span>Tore</span></div><div><strong>${clubPerf.assists}</strong><span>Vorlagen</span></div></div></section>`:"";
 const playstyles=typeof FooteraPlayStyles!=="undefined"?FooteraPlayStyles.profileHTML(item,b):"";
 const chem=!friend&&typeof FooteraChemBoosts!=="undefined"?chemBoostProfileHTML(item,b):"";
 return`<div class="bio-layout bio-profile-v2">
  <section class="bio-hero">
   <div class="bio-hero-card">${cardHTML(b,item,false,shownPosition||b.position)}</div>
   <div class="bio-identity">
    <span class="bio-eyebrow">${esc(typeLabel)}</span>
    <h2>${esc(name)}</h2>
    <p class="bio-context" data-player-context-id="${esc(b.id||"")}">${esc(playerContextLine(b))}</p>
    <div class="bio-hero-kpis">
     <div><strong>${b.ovr}</strong><span>GES</span></div>
     <div><strong>${esc(position)}</strong><span>Position</span></div>
     <div><strong>${flagEmoji(b.nation)} ${esc(nation)}</strong><span>Nation</span></div>
    </div>
    ${playerAffiliationHTML(b,true)}
   </div>
  </section>
  <div class="bio-profile-grid">
   <section class="bio-panel">
    <div class="bio-panel-head"><div><span class="bio-panel-kicker">EINSATZ</span><h4>Positionen & Rolle</h4></div></div>
    <div class="bio-position-list">${positions.map((x,i)=>`<span class="bio-position-pill ${i===0?"primary":""}">${esc(positionLabel(x,b))}</span>`).join("")}</div>
    <div class="bio-role-card"><span>Spielerrolle</span><strong>${esc(positionRoleLabel(b))}</strong></div>
   </section>
   <section class="bio-panel">
    <div class="bio-panel-head"><div><span class="bio-panel-kicker">PROFIL</span><h4>Spielerdaten</h4></div></div>
    <div class="bio-info-grid">${info.map(([label,value])=>`<div class="bio-info-item"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("")}</div>
   </section>
  </div>
  <section class="bio-panel bio-attributes-panel">
   <div class="bio-panel-head"><div><span class="bio-panel-kicker">KERNWERTE</span><h4>Attribute</h4></div><small>Aktuelle Kartenwerte</small></div>
   <div class="bio-attributes-grid">${attributes.map(([label,value])=>{const n=Math.max(0,Math.min(99,Number(value)||0));return`<div class="bio-attribute"><span>${esc(label)}</span><strong>${value}</strong><i><b style="width:${n}%"></b></i></div>`}).join("")}</div>
  </section>
  ${performance}
  <div class="bio-feature-stack">${playstyles}${chem}</div>
 </div>`
}
function openBiography(item,index,fallbackBase=null){
 if(!item)return;
 const shown=displayBase(item),base=shown||(fallbackBase?{...fallbackBase,ovr:Math.min(99,Number(fallbackBase.ovr||0)+Number(item.boost||0)),position:item.overridePosition||fallbackBase.position}:null);
 if(!base)return;
 const b=resolvedPlayer(base),slot=index!=null&&index>=0?(index<11?currentFormation()[index].p:"BANK"):"Vereinsitem",clubPerf=playerClubPerformance(item),shownPosition=index!=null&&index>=0&&index<11&&inPosition(b,slot)?slot:b.position;
 ensurePlayerAffiliationAssets(b);
 $("bioDetailSub").textContent=`${playerProfileTypeLabel(item)} · ${playerContextLine(b)}`;
 $("bioDetailBody").innerHTML=playerBiographyHTML(b,item,{shownPosition,clubPerf});
 showUiLayer("bioModal","bio")
}
function cardHTML(p,item=null,mini=false,shownPosition=null,includeChemBoost=true){
  if(!p)return"";p=resolvedPlayer(p);if(!mini&&item?.variant==="special"&&isLegacyEventName(item?.eventName)&&!p.face)ensureEaPlayerAssets(p);const cls=cardClass(p,item),r=item?(itemRating(item)||Number(item.displayRating)||Number(p.ovr)||0):p.ovr,pos=shownPosition||p.position;
  const baseRare=isCardRare(p,item)&&!item?.variant&&!item?.cosmeticDesign&&cls!=="evolution";
  const rareMark=baseRare?`<div class="rare-mark">SELTEN</div>`:"";
  const fullName=String(p.name||"Spieler").trim(),parts=fullName.split(/\s+/),shortName=fullName.length>19&&parts.length>1?`${parts[0][0]}. ${parts.slice(1).join(" ")}`:fullName;
  const nameScale=shortName.length>21?.68:shortName.length>17?.78:shortName.length>13?.9:1;const playstyleMarker=typeof FooteraPlayStyles!=="undefined"?FooteraPlayStyles.badgeHTML(item,p,mini):"";
  if(cls==="founder"&&String(p.id||"")===FOUNDER_PLAYER_ID&&FOUNDER_BASTIAN_STATIC_SRC){
   const evoMarker=item&&activeEvolutionForUid(item.uid)?`<span class="evo-active-marker" title="Aktive Evolution" aria-label="Aktive Evolution"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10M7 21h10M8 3c0 4 1.4 6.1 4 8 2.6-1.9 4-4 4-8M8 21c0-4 1.4-6.1 4-8 2.6 1.9 4 4 4 8"/></svg></span>`:"";
   return`<div class="${mini?"mini":""}"><div class="card-shell founder-shell bastian-static-founder-shell" data-rating="${r}"><div class="founder-card-art" data-rating="${r}"><img class="founder-static-card" src="${FOUNDER_BASTIAN_STATIC_SRC}" alt="${esc(p.fullName||p.name||"Bastian Gerlach")} Founder-Karte" draggable="false"><span class="founder-live-position">${esc(positionLabel(pos,p))}</span>${cardAltPositionsHTML(p,pos)}</div>${evoMarker}${playstyleMarker}</div>${includeChemBoost&&typeof FooteraChemBoosts!=="undefined"?FooteraChemBoosts.badgeHTML(item,mini):""}</div>`
  }
  const legacyDecor=cls==="legacy"?`<svg class="legacy-facets" viewBox="0 0 100 143" preserveAspectRatio="none" aria-hidden="true">
    <path fill="#6c27aa" opacity=".4" d="M9 17 38 7 57 28 32 50 13 43Z"/><path fill="#ffcf83" opacity=".22" d="M13 43 32 50 23 70 7 62Z"/>
    <path fill="#25104e" opacity=".73" d="M57 28 84 8 93 36 63 57 32 50Z"/><path fill="#9856d5" opacity=".4" d="M84 8 96 20 93 36 63 57Z"/>
    <path fill="#ffbd63" opacity=".24" d="M32 50 63 57 23 70Z"/><path fill="#7935b7" opacity=".24" d="M7 62 23 70 35 95 10 109Z"/>
    <path fill="#f6bf68" opacity=".24" d="M10 109 35 95 49 123 29 136Z"/><path fill="#54207f" opacity=".44" d="M49 123 78 92 93 111 71 136Z"/>
    <path fill="#fac577" opacity=".32" d="M78 92 94 66 93 111Z"/><path fill="#c083ee" opacity=".3" d="M88 43 96 20 94 66 78 92Z"/>
    <path fill="none" stroke="#fdd690" stroke-width=".33" opacity=".47" d="M9 17 32 50 7 62 35 95 10 109m28-102L63 57 93 36m-70 34 40-13 31 9-16 26 15 19m-58-16 14 28 29-31"/>
    <path fill="none" stroke="#fff3c9" stroke-width=".5" opacity=".7" d="M13 43 32 50 57 28M49 123 71 136M88 43 94 66"/>
   </svg><svg class="legacy-frame" viewBox="0 0 100 143" preserveAspectRatio="none" aria-hidden="true"><path class="outer" d="M10 4 18 1 38 3 50 .5 62 3 82 1 90 4 98 14 95 128 88 136 70 140 50 142.5 30 140 12 136 5 128 2 14Z"/><path class="mid" d="M12 6 20 3.2 39 5 50 2.6 61 5 80 3.2 88 6 95 15 92.5 126 85 133.5 68 137 50 139.5 32 137 15 133.5 7.5 126 5 15Z"/><path class="inner" d="M14 8.5 22 5.7 40 7.3 50 5.2 60 7.3 78 5.7 86 8.5 92 16.5 89.5 123.5 82 130.5 66 134 50 136.5 34 134 18 130.5 10.5 123.5 8 16.5Z"/></svg><svg class="legacy-crown" viewBox="0 0 40 20" aria-hidden="true"><path d="M3 17 1 5l10 7L20 1l9 11 10-7-3 12H3Zm1 2h32v-3H4v3Z"/></svg><div class="legacy-shards" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><svg class="legacy-laurel" viewBox="0 0 28 72" aria-hidden="true"><path d="M15 67c-3-7-4-14-4-21 0-12 3-25 10-38l2 1c-6 12-9 25-9 37 0 7 1 13 4 20l-3 1Zm1-48c-5-1-8-4-10-8 5-1 9 1 12 5l-2 3Zm-4 12c-5 0-9-3-11-7 5-2 10 0 13 4l-2 3Zm-2 13c-5 1-9-1-12-5 5-3 10-2 14 2l-2 3Zm1 13c-5 2-9 1-13-2 4-4 9-5 14-2l-1 4Zm5-45c2-5 5-8 10-9 1 5-1 9-6 12l-4-3Zm-3 13c2-5 6-8 11-8 0 5-3 9-8 11l-3-3Zm-2 13c3-5 7-7 12-6-1 5-4 8-10 10l-2-4Zm0 13c4-4 8-6 13-4-2 5-6 8-11 8l-2-4Z"/></svg>`:"";const founderTheme=cls==="founder"?(p.id===MARCO_FOUNDER_PLAYER_ID?" rangers-founder":p.id==="footera-founder-niklas-bergstraesser"?" worms-founder":""):"";const body=`<div class="custom-card ${cls}${founderTheme}${baseRare?" base-rare":""}"${cls==="story"&&item?.eventName&&item.eventName!=="STORY"?` data-story-label="${esc(item.eventName)}"`:""} data-player-id="${esc(p.id||"")}" data-event-release-id="${esc(item?.eventReleaseId||"")}" data-dynamic-face="${esc(eventDynamicFace(p,item))}">${legacyDecor}<div class="card-top"><div class="ovr">${r}</div><div class="pos">${esc(positionLabel(pos,p))}</div></div>${rareMark}${emblemsHTML(p)}<div class="face">${portraitHTML(p,false,item)}</div><div class="card-bottom"><div class="pname" title="${esc(fullName)}" style="--card-name-scale:${nameScale}">${esc(shortName)}</div><div class="stats">${cardStatPairs(p).map(x=>`<span><small>${x[0]}</small><b>${x[1]}</b></span>`).join("")}</div></div>${cardAltPositionsHTML(p,pos)}</div>`;
 const evoMarker=item&&activeEvolutionForUid(item.uid)?`<span class="evo-active-marker" title="Aktive Evolution" aria-label="Aktive Evolution"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10M7 21h10M8 3c0 4 1.4 6.1 4 8 2.6-1.9 4-4 4-8M8 21c0-4 1.4-6.1 4-8 2.6 1.9 4 4 4 8"/></svg></span>`:"";return`<div class="${mini?"mini":""}"><div class="card-shell${cls==="legacy"?" legacy-shell":cls==="flashback"?" flashback-shell":cls==="momentum"?" momentum-shell":cls==="evolution"?" evolution-shell":cls==="founder"?" founder-shell":""}">${body}${evoMarker}${playstyleMarker}</div>${includeChemBoost&&typeof FooteraChemBoosts!=="undefined"?FooteraChemBoosts.badgeHTML(item,mini):""}</div>`
}
function cardAltPositionsHTML(p,shownPosition=p?.position){
 const shown=positionLabel(shownPosition,p),positions=[...new Set(playerPositions(p).map(x=>positionLabel(x,p)))].filter(x=>x&&x!==shown);
 if(!positions.length)return"";
 const text=positions.join(" · "),label=`Weitere spielbare Positionen: ${text}`;
 return`<div class="card-alt-positions" aria-label="${esc(label)}" title="${esc(label)}">${esc(text)}</div>`
}
function normalizeKey(v){return String(v||"").normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}

const TOP5_CLUB_LEAGUES={
 "Bundesliga":[
  ["FC Augsburg","Augsburg"],
  ["1. FC Union Berlin","Union Berlin"],
  ["SV Werder Bremen","Werder Bremen"],
  ["Borussia Dortmund","Dortmund"],
  ["SV Elversberg","Elversberg"],
  ["Eintracht Frankfurt","Frankfurt"],
  ["Sport-Club Freiburg","SC Freiburg","Freiburg"],
  ["Hamburger SV","Hamburg"],
  ["TSG Hoffenheim","TSG 1899 Hoffenheim","Hoffenheim"],
  ["1. FC Köln","FC Köln","Köln","Cologne"],
  ["RB Leipzig","Leipzig"],
  ["Bayer 04 Leverkusen","Bayer Leverkusen","Leverkusen"],
  ["1. FSV Mainz 05","Mainz 05","Mainz"],
  ["Borussia Mönchengladbach","Mönchengladbach","Borussia Monchengladbach","Gladbach"],
  ["FC Bayern München","Bayern München","Bayern Munich"],
  ["SC Paderborn 07","Paderborn"],
  ["FC Schalke 04","Schalke 04","Schalke"],
  ["VfB Stuttgart","Stuttgart"]
 ],
 "Premier League":[
  ["AFC Bournemouth","Bournemouth"],
  ["Arsenal","Arsenal FC"],
  ["Aston Villa"],
  ["Brentford","Brentford FC"],
  ["Brighton & Hove Albion","Brighton and Hove Albion","Brighton"],
  ["Chelsea","Chelsea FC"],
  ["Coventry City","Coventry"],
  ["Crystal Palace"],
  ["Everton","Everton FC"],
  ["Fulham","Fulham FC"],
  ["Hull City","Hull"],
  ["Ipswich Town","Ipswich"],
  ["Leeds United","Leeds"],
  ["Liverpool","Liverpool FC"],
  ["Manchester City","Man City"],
  ["Manchester United","Man United","Man Utd"],
  ["Newcastle United","Newcastle"],
  ["Nottingham Forest","Nottm Forest"],
  ["Sunderland","Sunderland AFC"],
  ["Tottenham Hotspur","Tottenham","Spurs"]
 ],
 "LALIGA EA SPORTS":[
  ["Athletic Club","Athletic Bilbao"],
  ["Atlético de Madrid","Atletico de Madrid","Atlético Madrid","Atletico Madrid"],
  ["CA Osasuna","Osasuna"],
  ["Celta","Celta Vigo","RC Celta"],
  ["Deportivo Alavés","Deportivo Alaves","Alavés","Alaves"],
  ["Elche CF","Elche"],
  ["FC Barcelona","Barcelona"],
  ["Getafe CF","Getafe"],
  ["Levante UD","Levante"],
  ["Málaga CF","Malaga CF","Málaga","Malaga"],
  ["R. Racing Club","Racing Santander","Racing Club"],
  ["Rayo Vallecano"],
  ["RC Deportivo","Deportivo La Coruña","Deportivo La Coruna","Deportivo"],
  ["RCD Espanyol de Barcelona","Espanyol","RCD Espanyol"],
  ["Real Betis","Real Betis Balompié"],
  ["Real Madrid","Real Madrid CF"],
  ["Real Sociedad"],
  ["Sevilla FC","Sevilla"],
  ["Valencia CF","Valencia"],
  ["Villarreal CF","Villarreal"]
 ],
 "Serie A":[
  ["Atalanta","Atalanta BC"],
  ["Sassuolo","US Sassuolo Calcio"],
  ["Bologna","Bologna FC 1909"],
  ["Lazio","SS Lazio"],
  ["Frosinone","Frosinone Calcio"],
  ["Juventus","Juventus FC"],
  ["Genoa","Genoa CFC"],
  ["Napoli","SSC Napoli"],
  ["Inter","Inter Milan","Internazionale","FC Internazionale Milano"],
  ["Monza","AC Monza"],
  ["Parma","Parma Calcio 1913"],
  ["Cagliari","Cagliari Calcio"],
  ["Roma","AS Roma"],
  ["Fiorentina","ACF Fiorentina"],
  ["Torino","Torino FC"],
  ["Milan","AC Milan"],
  ["Udinese","Udinese Calcio"],
  ["Como","Como 1907"],
  ["Venezia","Venezia FC"],
  ["Lecce","US Lecce"]
 ],
 "Ligue 1":[
  ["Angers SCO","Angers"],
  ["AJ Auxerre","Auxerre"],
  ["Stade Brestois 29","Brest"],
  ["Le Havre AC","Le Havre"],
  ["Le Mans FC","Le Mans"],
  ["RC Lens","Lens"],
  ["FC Lorient","Lorient"],
  ["LOSC","LOSC Lille","Lille"],
  ["Olympique Lyonnais","Lyon"],
  ["Olympique de Marseille","Marseille"],
  ["AS Monaco","Monaco"],
  ["OGC Nice","Nice"],
  ["Paris FC"],
  ["Paris Saint-Germain","Paris SG","PSG"],
  ["Stade Rennais F.C.","Stade Rennais FC","Rennes"],
  ["RC Strasbourg Alsace","Strasbourg"],
  ["Toulouse FC","Toulouse"],
  ["ESTAC Troyes","Troyes"]
 ]
};
/* V18.59 — resolve EA competition IDs before unreliable display labels and keep unverified crest fallbacks explicit. */
const EA_LEAGUE_NAME_BY_ID={
 "1":"Danish Superliga","4":"1A Pro League","7":"Liga do Brasil","10":"Eredivisie",
 "13":"Premier League","14":"EFL Championship","16":"Ligue 1","17":"Ligue 2",
 "19":"Bundesliga","20":"2. Bundesliga","31":"Serie A","32":"Serie B",
 "39":"Major League Soccer","41":"Eliteserien","50":"Scottish Premiership",
 "53":"LALIGA EA SPORTS","54":"LaLiga 2","56":"Allsvenskan","57":"Colombia Apertura",
 "58":"Colombia Clausura","60":"EFL League One","61":"EFL League Two","63":"Hellas Liga",
 "65":"SSE Airtricity League","66":"Ekstraklasa","67":"Russian Premier League","68":"Trendyol Süper Lig",
 "80":"Österreichische Fußball-Bundesliga","83":"K League 1","84":"Liga MX","85":"Liga MX",
 "189":"Swiss Super League","308":"Liga Portugal","319":"Česká Liga","322":"Finnliiga",
 "332":"Ukrayina Liha","335":"Campeonato Scotiabank","336":"Liga Dimayor","341":"Liga MX",
 "347":"South African FL","349":"Meiji Yasuda J1 League","350":"Saudi Pro League","351":"A-League Men",
 "10001":"Denmark League 2","10004":"Belgium League 2","10007":"Brazil League 2",
 "10010":"Netherlands League 2","10017":"France League 3","10020":"Germany League 3",
 "10032":"Italy League 3","10041":"Norway League 2","10050":"Scotland League 2",
 "10054":"Spain League 3","10056":"Sweden League 2","10061":"England League 5",
 "10065":"Ireland League 2","10066":"Poland League 2","10067":"Russia League 2",
 "10076":"Rest of World 2","10080":"Austria League 2","10083":"Korea League 2",
 "10189":"Switzerland League 2","10308":"Portugal League 2","10335":"Chile League 2",
 "10336":"Colombia League 2","10341":"Mexico League 2","10350":"Saudi League 2","10353":"Argentina League 2"
};
const LEAGUE_NAME_ALIASES={
 "liga f":"Liga F Moeve","liga f moeve":"Liga F Moeve",
 "arkema pl":"Arkema Première Ligue","arkema premiere ligue":"Arkema Première Ligue","arkema premiere league":"Arkema Première Ligue","premiere ligue":"Arkema Première Ligue",
 "barclays wsl":"Barclays Women's Super League","barclays women s super league":"Barclays Women's Super League","barclays womens super league":"Barclays Women's Super League","womens super league":"Barclays Women's Super League","gpfbl":"Google Pixel Frauen-Bundesliga","google pixel frauen bundesliga":"Google Pixel Frauen-Bundesliga", "nwsl":"National Women's Soccer League","national women s soccer league":"National Women's Soccer League",

 "belgium pro league":"1A Pro League","belgian pro league":"1A Pro League","jupiler pro league":"1A Pro League",
 "liga nos":"Liga Portugal","liga portugal betclic":"Liga Portugal","portuguese league":"Liga Portugal",
 "super lig":"Trendyol Süper Lig","super lig turkey":"Trendyol Süper Lig","trendyol super lig":"Trendyol Süper Lig",
 "scottish prem":"Scottish Premiership","cinch premiership":"Scottish Premiership",
 "austrian bundesliga":"Österreichische Fußball-Bundesliga","bundesliga austria":"Österreichische Fußball-Bundesliga",
 "brack super league":"Swiss Super League","raiffeisen super league":"Swiss Super League",
 "serie a enilive":"Serie A","serie bkt":"Serie B","ligue 1 mcdonalds":"Ligue 1",
 "laliga":"LALIGA EA SPORTS","laliga ea sports":"LALIGA EA SPORTS","la liga":"LALIGA EA SPORTS",
 "laliga hypermotion":"LaLiga 2"
};
const EA_MENS_CLUB_LEAGUES={
 "1A Pro League":["KRC Genk","Genk","KAA Gent","Gent","Club Brugge KV","Club Brugge","RSC Anderlecht","Anderlecht","Royal Antwerp FC","Royal Antwerp","Antwerp","Union Saint-Gilloise","Union SG","Standard Liège","Standard Liege","Sporting Charleroi","Charleroi","Cercle Brugge","KV Mechelen","Mechelen","OH Leuven","Oud-Heverlee Leuven","Sint-Truidense VV","STVV","KVC Westerlo","Westerlo","FCV Dender EH","Dender","Zulte Waregem","KV Kortrijk","Kortrijk","Beerschot","KAS Eupen","Eupen","La Louvière","RAAL La Louvière"],
 "Eredivisie":["Ajax","AFC Ajax","PSV","PSV Eindhoven","Feyenoord","AZ","AZ Alkmaar","FC Twente","Twente","FC Utrecht","Utrecht","Go Ahead Eagles","NEC Nijmegen","NEC","Sparta Rotterdam","SC Heerenveen","Heerenveen","PEC Zwolle","Fortuna Sittard","FC Groningen","Groningen","Heracles Almelo","Heracles","NAC Breda","FC Volendam","Willem II","RKC Waalwijk","Excelsior","Almere City FC","Vitesse","FC Emmen","Cambuur","Roda JC Kerkrade"],
 "Liga Portugal":["SL Benfica","Benfica","FC Porto","Porto","Sporting CP","Sporting Clube de Portugal","SC Braga","Braga","Vitória SC","Vitória Guimarães","Vitoria Guimaraes","Boavista FC","Boavista","FC Famalicão","Famalicão","Rio Ave FC","Rio Ave","Gil Vicente FC","Gil Vicente","Casa Pia AC","Casa Pia","Moreirense FC","Moreirense","Estoril Praia","FC Arouca","Arouca","Santa Clara","CD Nacional","Nacional","Tondela","Farense","Alverca","Estrela da Amadora","CF Estrela da Amadora","Estrela Amadora"],
 "Trendyol Süper Lig":["Amed SK","Amedspor","Galatasaray","Fenerbahçe","Fenerbahce","Beşiktaş","Besiktas","Trabzonspor","Başakşehir","Basaksehir","Sivasspor","Konyaspor","Kayserispor","Antalyaspor","Alanyaspor","Çaykur Rizespor","Caykur Rizespor","Gaziantep FK","Gaziantep","Göztepe","Goztepe","Samsunspor","Kasımpaşa","Kasimpasa","Eyüpspor","Eyupspor","Hatayspor","Adana Demirspor","İstanbulspor","Istanbulspor","Fatih Karagümrük"],
 "Scottish Premiership":["Celtic","Celtic FC","Rangers","Rangers FC","Heart of Midlothian","Hearts","Aberdeen","Hibernian","Dundee United","Dundee FC","Dundee","Motherwell","Kilmarnock","St. Mirren","St Mirren","Ross County","St. Johnstone","St Johnstone","Livingston","Falkirk","Partick Thistle","Ayr United","Dunfermline Athletic"],
 "Österreichische Fußball-Bundesliga":["RB Salzburg","Red Bull Salzburg","Salzburg","SK Sturm Graz","Sturm Graz","Rapid Wien","SK Rapid Wien","Austria Wien","FK Austria Wien","LASK","LASK Linz","TSV Hartberg","Hartberg","Wolfsberger AC","Wolfsberg","Blau-Weiß Linz","Blau Weiss Linz","WSG Tirol","SCR Altach","Altach","Grazer AK","Austria Klagenfurt"],
 "Swiss Super League":["FC Basel 1893","FC Basel","Basel","BSC Young Boys","Young Boys","Servette FC","Servette","FC Zürich","FC Zurich","FC Lugano","Lugano","FC St. Gallen","FC St Gallen","St. Gallen","FC Luzern","Luzern","Lausanne-Sport","Lausanne Sport","Grasshopper Club Zürich","Grasshopper Club Zurich","Grasshoppers","FC Sion","Sion","FC Winterthur","Winterthur","Yverdon Sport","Yverdon"],
 "Super League Vrouwenvoetbal":["RSC Anderlecht Women","RSC Anderlecht Ladies","KRC Genk Ladies","KRC Genk Women","Club Brugge Women","KAA Gent Ladies","Standard Liège Women"]
};
const KNOWN_EA_CLUB_LEAGUE_CACHE=new Map(),TOP5_CLUB_LEAGUE_CACHE=new Map();
function knownEAClubLeague(team){
 const raw=normalizeKey(team);
 if(KNOWN_EA_CLUB_LEAGUE_CACHE.has(raw))return KNOWN_EA_CLUB_LEAGUE_CACHE.get(raw);
 const sig=clubIdentityKey(team);if(!sig&&!raw)return"";
 for(const [league,names] of Object.entries(EA_MENS_CLUB_LEAGUES)){
  if(names.some(name=>normalizeKey(name)===raw||clubIdentityKey(name)===sig)){KNOWN_EA_CLUB_LEAGUE_CACHE.set(raw,league);return league}
 }
 KNOWN_EA_CLUB_LEAGUE_CACHE.set(raw,"");
 return""
}
function leagueFromClub(team,rawLeague="",leagueId="",gender="",source=""){
 const id=String(leagueId||"").trim();if(EA_LEAGUE_NAME_BY_ID[id])return EA_LEAGUE_NAME_BY_ID[id];
 const tk=normalizeKey(team),rk=normalizeKey(rawLeague);
 const verified=verifiedClubBadge(team,{gender,league:rawLeague,source});
 if(verified?.league&&(source==="fc27-open-data"||source==="fc27-open-data-men"))return verified.league;
 if(LEAGUE_NAME_ALIASES[rk])return LEAGUE_NAME_ALIASES[rk];
 // Juventus or Roma women play in their own league; the men's club list must not move them to Serie A.
 if(rk&&/(?:women|woman|ladies|vrouwen|feminin|femenin|frau|damen|femminile)/.test(normalizeKey(gender)))return String(rawLeague);
 if(rk){
  if(rk==="bundesliga")return"Bundesliga";
  if(rk==="premier league")return"Premier League";
  if(rk.includes("la liga")||rk.includes("laliga"))return"LALIGA EA SPORTS";
  if(rk.startsWith("serie a"))return"Serie A";
  if(rk.startsWith("ligue 1"))return"Ligue 1";
 }
 if(!tk)return String(rawLeague||"");
 if(!TOP5_CLUB_LEAGUE_CACHE.has(tk)){
  let found="";
  for(const [league,groups] of Object.entries(TOP5_CLUB_LEAGUES)){
   if(groups.some(aliases=>aliases.some(a=>normalizeKey(a)===tk))){found=league;break}
  }
  if(!found){
   const sig=clubIdentityKey(team);
   if(sig){
    const matches=[];
    for(const [league,groups] of Object.entries(TOP5_CLUB_LEAGUES)){
     if(groups.some(aliases=>aliases.some(a=>clubIdentityKey(a)===sig)))matches.push(league)
    }
    if(matches.length===1)found=matches[0]
   }
  }
  TOP5_CLUB_LEAGUE_CACHE.set(tk,found)
 }
 const top5=TOP5_CLUB_LEAGUE_CACHE.get(tk);if(top5)return top5;
 const female=/(?:women|woman|ladies|vrouwen|feminin|femenin|frau|damen|femminile)/.test(normalizeKey(gender));
 const isMensSource=source==="fc27-open-data"||source==="fc27-open-data-men";
 const mapped=knownEAClubLeague(team),mappedIsWomens=/(?:women|woman|ladies|vrouwen|feminin|femenin|frau|damen|femminile)/.test(normalizeKey(mapped));
 if(female&&mappedIsWomens)return mapped;
 if(isMensSource&&!female&&mapped&&!mappedIsWomens)return mapped;
 return String(rawLeague||"");
}

function validateDatabase(players){
 if(!Array.isArray(players)||players.length<DB_MIN_PLAYERS)return{ok:false,reason:`Nur ${players?.length||0} Spieler gefunden`};
 const valid=players.filter(p=>p.id&&p.name&&p.ovr>=40&&p.ovr<=99&&p.position).length;if(valid/players.length<.95)return{ok:false,reason:"Zu viele unvollständige Datensätze"};
 // EA updates ratings during the season, so anchors only check that the stars are there and rated like stars.
 for(const needle of ['mbapp','haaland','yamal']){const p=players.find(x=>normalizeKey(x.name).includes(needle));if(!p||p.ovr<85)return{ok:false,reason:`Ratinganker ${needle} fehlt oder liegt unter 85`}}
 const counts={gold:0,silver:0,bronze:0};players.forEach(p=>counts[rarityOf(p)]++);if(counts.gold<1000||counts.silver<1000||counts.bronze<500)return{ok:false,reason:"Gold/Silber/Bronze-Verteilung unplausibel"};
 const leagueCounts={};players.forEach(p=>{if(p.league)leagueCounts[p.league]=(leagueCounts[p.league]||0)+1});
 const must=["Bundesliga","Premier League","LALIGA EA SPORTS","Serie A","Ligue 1"];
 for(const label of must){if((leagueCounts[label]||0)<100)return{ok:false,reason:`Liga ${label}: nur ${leagueCounts[label]||0} Spieler zugeordnet`}}
 const withTeam=players.filter(p=>p.team).length,withNation=players.filter(p=>p.nation).length;if(withTeam/players.length<.85||withNation/players.length<.85)return{ok:false,reason:"Vereins-/Nationalitätsfelder unvollständig"};
 return{ok:true,counts}
}
async function fetchText(url,ms=45000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{cache:"no-store",signal:c.signal});if(!r.ok)throw new Error(`HTTP ${r.status}`);const text=await r.text();if(text.length<100000)throw new Error("Antwort ist zu klein");return text}finally{clearTimeout(t)}}
let DATA_ROUTE="cache";
let PLAYER_TRAITS=null;
async function loadPlayerTraits(){
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);let response;
  try{response=await fetch("./assets/player-traits.json",{cache:"force-cache",signal:controller.signal})}finally{clearTimeout(timer)}
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const data=await response.json();
  if(data?.fields?.join(",")!=="skillMoves,weakFoot,preferredFoot,physical"||Object.keys(data.players||{}).length<18000)throw new Error("Spielerwerte unvollständig");
  PLAYER_TRAITS=data.players
 }catch(err){console.warn("Zusätzliche Spielerwerte nicht verfügbar",err);PLAYER_TRAITS=null}
}
function applyPlayerTraits(players){
 if(!PLAYER_TRAITS)return;
 for(const player of players){
  const traits=PLAYER_TRAITS[String(player?.id)];
  if(!traits)continue;
  if(Number.isInteger(traits[0])&&traits[0]>=1&&traits[0]<=5)player.skillMoves=traits[0];
  if(Number.isInteger(traits[1])&&traits[1]>=1&&traits[1]<=5)player.weakFoot=traits[1];
  const foot=preferredFootName(traits[2]);if(foot)player.preferredFoot=foot;
  if((!Number.isFinite(Number(player.phy))||Number(player.phy)<20)&&Number.isInteger(traits[3])&&traits[3]>=20&&traits[3]<=99)player.phy=traits[3]
 }
}
async function savePlayers(players){await idbClear();const chunk=1500;for(let i=0;i<players.length;i+=chunk)await idbPutMany(players.slice(i,i+chunk))}
async function loadFallback(){try{const r=await fetch('./players-fallback.json',{cache:'no-store'});if(!r.ok)return[];return await r.json()}catch(e){return[]}}
// Bumped when the game reads the same file differently, so offline copies are rebuilt once (w1: women's club crests).
const PLAYER_DB_CLIENT_REVISION=":w1";
async function remotePlayerDbRevision(){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),6000);
 try{const r=await fetch(DB_VERSION_URL,{cache:"no-store",signal:c.signal});if(!r.ok)return"";const rev=String((await r.json())?.revision||"");return rev?rev+PLAYER_DB_CLIENT_REVISION:""}catch(e){return""}finally{clearTimeout(t)}
}
// A player EA drops from its database must not vanish from a club that owns the card.
async function keepOwnedPlayers(players){
 const owned=new Set((typeof state!=="undefined"&&Array.isArray(state?.club)?state.club:[]).map(item=>String(item?.pid||"")).filter(Boolean));if(!owned.size)return;
 const known=new Set(players.map(p=>String(p.id)));if([...owned].every(id=>known.has(id)))return;
 let cached=[];try{cached=await idbAll()}catch(e){}
 for(const p of cached)if(owned.has(String(p?.id))&&!known.has(String(p.id))){players.push(p);known.add(String(p.id))}
}
async function syncDatabase(force=false){
 $("dbGate").classList.remove("has-error");$("dbRetry").style.display="none";$("dbReset").style.display="none";$("dbOffline").style.display="none";$("dbWarn").textContent="";$("dbTitle").textContent="Gleich geht's los";$("dbText").textContent="Daten werden geladen …";$("dbBar").style.width="5%";
 try{
  const revision=await remotePlayerDbRevision();
  if(!force){const cached=await idbAll();const cv=validateDatabase(cached);if(cv.ok&&(!revision||revision===await idbMetaGet("revision").catch(()=>""))){PLAYERS=cached;DATA_ROUTE="lokaler Cache";return finishDbLoad(true)}}
  let errors=[];
  for(let i=0;i<DB_SOURCES.length;i++){
   const src=DB_SOURCES[i];$("dbText").textContent="Dein Club wird vorbereitet …";$("dbBar").style.width=`${15+i*20}%`;$("dbPercent").textContent=`${15+i*20}%`;
   try{
    const text=await fetchText(src.url);$("dbText").textContent="Nur noch einen Moment …";$("dbBar").style.width="65%";
    const raw=parseCSV(text),players=raw.map(normCSV).filter(p=>p.id&&p.name&&p.ovr);const v=validateDatabase(players);if(!v.ok)throw new Error(v.reason);
    $("dbText").textContent="Alles für deinen Anpfiff wird bereitgemacht …";$("dbBar").style.width="82%";
    await keepOwnedPlayers(players);await savePlayers(players);if(revision)await idbMetaPut("revision",revision).catch(()=>{});PLAYERS=players;DATA_ROUTE=src.name;return finishDbLoad(true)
   }catch(e){errors.push(`${src.name}: ${e.message||e}`)}
  }
  const cached=await idbAll();const cv=validateDatabase(cached);if(cv.ok){PLAYERS=cached;DATA_ROUTE="lokaler Cache (Netzquelle nicht erreichbar)";return finishDbLoad(true)}
  console.warn("Spieldaten konnten nicht geladen werden:",errors.join(" | "));PLAYERS=await loadFallback();DATA_ROUTE="UI-Fallback";finishDbLoad(false)
 }catch(err){console.error(err);PLAYERS=await loadFallback();DATA_ROUTE="UI-Fallback";finishDbLoad(false)}
}
let EA_VISIBLE_ENRICH_RUNNING=false;
async function fetchEaPlayerSearch(name){
 const q=String(name||"").trim();if(!q)return[];
 const url=`${EA_RATINGS_API}?locale=en&gender=0&limit=20&offset=0&search=${encodeURIComponent(q)}`;
 const data=await fetchJson(url,20000);
 return Array.isArray(data?.items)?data.items:Array.isArray(data?.players)?data.players:Array.isArray(data?.ratings)?data.ratings:[]
}
function propagateEaAffiliation(seed){
 const tk=normalizeKey(seed?.team),lk=normalizeKey(seed?.league);if(!tk&&!lk)return[];
 const targets=new Set([...(tk?playerRowsForTeam(seed.team):[]),...(lk?playerRowsForLeague(seed.league):[])]),changedRows=[];
 for(const p of targets){
  const sameTeam=tk&&normalizeKey(p?.team)===tk,sameLeague=lk&&normalizeKey(p?.league)===lk,oldLeague=p.league;let changed=false;
  if(sameTeam){
   if(seed.clubLogo&&!p.clubLogo){p.clubLogo=seed.clubLogo;changed=true}
   if(seed.teamId&&!p.teamId){p.teamId=seed.teamId;changed=true}
   if(seed.league&&!p.league){p.league=seed.league;changed=true}
   if(seed.leagueLogo&&!p.leagueLogo){p.leagueLogo=seed.leagueLogo;changed=true}
   if(seed.leagueId&&!p.leagueId){p.leagueId=seed.leagueId;changed=true}
  }else if(sameLeague){
   if(seed.leagueLogo&&!p.leagueLogo){p.leagueLogo=seed.leagueLogo;changed=true}
   if(seed.leagueId&&!p.leagueId){p.leagueId=seed.leagueId;changed=true}
  }
  if(changed){changedRows.push(p);P_BY_ID.set(String(p.id),p);if(oldLeague!==p.league)reindexPlayerAffiliation(p,p.team,oldLeague)}
 }
 if(changedRows.length){scheduleMarketFilterIndexRebuild();scheduleBadgePlayerSave(changedRows)}
 return changedRows
}
function applyEaAssetToPlayerById(a){
 if(!a?.id)return false;const id=String(a.id);
 let idx=PLAYER_ARRAY_INDEX.get(id);if(!Number.isInteger(idx)){idx=PLAYERS.findIndex(p=>String(p.id)===id);if(idx<0)return false;PLAYER_ARRAY_INDEX.set(id,idx)}
 const p=PLAYERS[idx],oldTeam=p.team,oldLeague=p.league;let changed=false;
 const set=(key,value,ok=true)=>{if(ok&&value!==undefined&&value!==null&&String(value)!==""&&p[key]!==value){p[key]=value;changed=true}};
 set("team",a.team);set("league",a.league);set("clubLogo",a.clubLogo);set("teamId",a.teamId);set("leagueLogo",a.leagueLogo);set("leagueId",a.leagueId);set("nationFlag",a.nationFlag);set("nationCode",a.nationCode);set("face",a.face);set("preferredFoot",a.preferredFoot);
 set("weakFoot",a.weakFoot,a.weakFoot>=1&&a.weakFoot<=5);set("skillMoves",a.skillMoves,a.skillMoves>=1&&a.skillMoves<=5);set("playstyles",Array.isArray(a.playstyles)?a.playstyles.join(", "):a.playstyles,!!a.playstyles);set("playstylesPlus",Array.isArray(a.playstylesPlus)?a.playstylesPlus.join(", "):a.playstylesPlus,!!a.playstylesPlus);if(typeof FooteraPlayStyles!=="undefined"&&(a.playstyles||a.playstylesPlus))FooteraPlayStyles.enrichPlayer(p);
 if(oldTeam!==p.team||oldLeague!==p.league)reindexPlayerAffiliation(p,oldTeam,oldLeague);
 P_BY_ID.set(id,p);const propagated=propagateEaAffiliation(p);
 if(changed){scheduleMarketFilterIndexRebuild();scheduleBadgePlayerSave([p])}
 if(changed||propagated.length)restoreSyntheticPlayerIds();
 return changed||propagated.length>0
}
async function enrichVisibleSquadAssets(){
 if(EA_VISIBLE_ENRICH_RUNNING||!PLAYERS.length)return;
 EA_VISIBLE_ENRICH_RUNNING=true;
 try{
  const visible=squadItems().filter(Boolean).map(it=>displayBase(it)).filter(Boolean);
  const unique=new Map(visible.map(p=>[String(p.id),p]));
  let changed=false;
  for(const p of unique.values()){
   if(p.clubLogo&&p.leagueLogo)continue;
   try{
    const rows=await fetchEaPlayerSearch(p.fullName||p.name);
    const assets=rows.map(normEAAsset).filter(Boolean);
    const exact=assets.find(a=>String(a.id)===String(p.id))||
      assets.find(a=>normalizeKey(a.name)===normalizeKey(p.name));
    if(exact&&applyEaAssetToPlayerById(exact))changed=true
   }catch(e){}
   await sleep(35)
  }
  if(changed)refreshAffiliationDom(true)
 }finally{EA_VISIBLE_ENRICH_RUNNING=false}
}
let EA_ASSET_ENRICH_RUNNING=false,EA_ASSET_ENRICH_DONE=false;
function portraitCoverage(players){if(!players?.length)return 0;return players.filter(p=>String(p?.face||p?.portrait||p?.headshot||"").trim()).length/players.length}
function emblemCoverage(players){
 if(!players?.length)return 0;
 const ok=players.filter(p=>{
  const club=!!String(p?.clubLogo||"").trim()||!!apiSportsTeamLogo(p?.team);
  const league=!!String(p?.leagueLogo||"").trim()||!!apiSportsLeagueLogo(p?.league);
  return club&&league
 }).length;
 return ok/players.length
}
async function enrichEaAssetsInBackground(){
 const missingFullNames=PLAYERS.some(p=>!String(p?.fullName||"").trim()),needBadges=emblemCoverage(PLAYERS)<.92;
 if(EA_ASSET_ENRICH_RUNNING||EA_ASSET_ENRICH_DONE||!PLAYERS.length||(portraitCoverage(PLAYERS)>.65&&!missingFullNames&&!needBadges))return;
 EA_ASSET_ENRICH_RUNNING=true;
 try{
  const enrichedResult=await enrichPlayersWithEaAssets(PLAYERS),enriched=Array.isArray(enrichedResult)?enrichedResult:enrichedResult?.players;
  if(Array.isArray(enriched)&&enriched.length===PLAYERS.length){PLAYERS=enriched.filter(p=>!isExclusiveFounderBase(p));applyPreferredPlayerNames(PLAYERS);applyPlayerTraits(PLAYERS);if(typeof FooteraPlayStyles!=="undefined")FooteraPlayStyles.enrichPlayers(PLAYERS);normalizePlayerAffiliations(PLAYERS);rebuildPlayerRuntimeIndexes();rebuildMarketFilterIndex();P_BY_ID=new Map(PLAYERS.map(p=>[String(p.id),p]));MARKET_META_MODEL_SIZE=0;restoreSyntheticPlayerIds();await savePlayers(PLAYERS);EA_ASSET_ENRICH_DONE=true;fillLeagueFilter();renderAll()}
 }catch(e){console.warn("EA portrait enrichment failed",e)}finally{EA_ASSET_ENRICH_RUNNING=false}
}
function finishDbLoad(full=true){
 PLAYERS=PLAYERS.filter(p=>!isExclusiveFounderBase(p));
 applyPreferredPlayerNames(PLAYERS);
 applyPlayerTraits(PLAYERS);if(typeof FooteraPlayStyles!=="undefined")FooteraPlayStyles.enrichPlayers(PLAYERS);normalizePlayerAffiliations(PLAYERS);rebuildPlayerRuntimeIndexes();applyBadgeCacheToPlayers();rebuildMarketFilterIndex();
 P_BY_ID=new Map(PLAYERS.map(p=>[String(p.id),p]));MARKET_META_MODEL_SIZE=0;restoreSyntheticPlayerIds();reconcileStoryPassPlayers();startPromoEventClock();$("dbBar").style.width="100%";$("dbPercent").textContent="100%";
 if(full){$("dbTitle").textContent="Bereit für den Anpfiff";$("dbText").textContent="Dein Club wartet auf dich.";$("dbWarn").textContent="";renderHeaderClubName();$('homeDb').textContent="Deine Spieldaten sind bereit. Du kannst sie hier jederzeit aktualisieren.";fillLeagueFilter();updateTotwMarketOption();setTimeout(()=>{$("dbGate").style.display="none";if(!state.onboarded){prepareOnboarding()}const directRewards=grantDirectRewards();renderAll();if(state.onboarded)maybePromptForUsername();if(pendingPack.length||(state.pendingChemBoosts||[]).length)finishPack();if(directRewards.length)setTimeout(()=>toast(`${directRewards.map(r=>r.label).join(" · ")} wurde deinem Store gutgeschrieben.`),450);prioritizeVisibleSquadBadges();scheduleIdleTask(enrichVisibleSquadAssets,2200);setTimeout(startIconPortraitPrewarm,1200);scheduleIdleTask(prewarmLiveTotw,4500)},250)}
 else{$("dbGate").classList.add("has-error");$("dbTitle").textContent="Start gerade nicht möglich";$("dbText").textContent="Deine Spieldaten konnten nicht vollständig geladen werden.";$("dbWarn").textContent="Bitte versuche es erneut. Dein Club und dein Fortschritt bleiben erhalten.";$("dbRetry").style.display="block";$("dbReset").style.display="block";$("dbOffline").style.display="block";renderHeaderClubName();$('homeDb').textContent="Spieldaten derzeit nicht verfügbar. Bitte erneut versuchen."}
}
async function boot(){
 await Promise.all([loadVerifiedBadges(),loadPlayerTraits()]);
 try{await syncDatabase(false)}catch(e){console.error(e);await syncDatabase(true)}
}
$("dbRetry").addEventListener("click",()=>syncDatabase(false));$("dbReset").addEventListener("click",()=>syncDatabase(true));$("dbOffline").addEventListener("click",()=>{$("dbGate").style.display="none";$("onboard").classList.remove("active");renderAll();toast("Vorschau geöffnet. Für alle Spielinhalte bitte erneut laden.")});$("syncAgain").addEventListener("click",()=>{$("dbGate").style.display="grid";syncDatabase(true)});

function leagueChoice(id){return LEAGUE_CHOICES.find(x=>x.id===id)||LEAGUE_CHOICES.find(x=>x.label===id)}
function leaguePool(id){const c=leagueChoice(id);if(!c)return[];const canonical=c.label==="Serie A"?"Serie A":c.label==="Ligue 1"?"Ligue 1":c.label;return PLAYERS.filter(p=>p.league===canonical)}
function buildStarter(id){
 const pool=leaguePool(id).filter(p=>p&&p.id&&Number.isFinite(Number(p.ovr)));
 const poolIds=new Set(pool.map(p=>String(p.id)));
 const bronzeFallback=PLAYERS.filter(p=>p&&p.id&&Number.isFinite(Number(p.ovr))&&Number(p.ovr)<65&&!poolIds.has(String(p.id))).sort((a,b)=>b.ovr-a.ovr||String(a.name).localeCompare(String(b.name),"de"));
 const tiers=[
  pool.filter(p=>Number(p.ovr)>=75&&Number(p.ovr)<=80).sort((a,b)=>b.ovr-a.ovr||String(a.name).localeCompare(String(b.name),"de")),
  pool.filter(p=>Number(p.ovr)>=65&&Number(p.ovr)<75).sort((a,b)=>b.ovr-a.ovr||String(a.name).localeCompare(String(b.name),"de")),
  pool.filter(p=>Number(p.ovr)<65).sort((a,b)=>b.ovr-a.ovr||String(a.name).localeCompare(String(b.name),"de")).concat(bronzeFallback)
 ];
 const targets=[["ST","CM","RW"],["GK","CB","CM","LW"],["LB","CB","RB","CM","LW","RW","ST","CDM","CB","LM","RM"]];
 if(tiers.some((rows,i)=>rows.length<targets[i].length))return null;
 const used=new Set(),selected=tiers.map((rows,i)=>targets[i].map(position=>{
  const player=rows.find(p=>!used.has(p.id)&&posFit(p,position))||rows.find(p=>!used.has(p.id)&&p.position!=="GK")||rows.find(p=>!used.has(p.id));
  if(player)used.add(player.id);
  return player
 }));
 const isKeeper=p=>[p?.position,...String(p?.alt||"").split(/[,/]/)].some(x=>String(x||"").trim().toUpperCase()==="GK");
 if(!selected.flat().some(isKeeper)){
  const keeperTier=tiers.findIndex(rows=>rows.some(isKeeper));
  if(keeperTier>=0){
   const keeper=tiers[keeperTier].find(p=>isKeeper(p)&&!used.has(p.id));
   const replaceIndex=selected[keeperTier].findIndex(p=>!isKeeper(p));
   if(keeper&&replaceIndex>=0)selected[keeperTier][replaceIndex]=keeper;
  }
 }
 return selected.flat()
}

function prepareOnboarding(){
 $("onboard").classList.add("active");
 const hasUsername=!!String(state.profile?.username||"").trim();
 $("usernameStep").style.display=hasUsername?"none":"block";
 $("leagueStep").style.display=hasUsername?"block":"none";
 $("starterStage").classList.remove("active");
 if(hasUsername)renderLeagueChoices()
}
$("firstUsername").addEventListener("input",()=>{
 const u=$("firstUsername").value.trim();
 $("firstTeamPreview").textContent=`Teamname: ${u?u+" FC":"–"}`
});
$("saveFirstUsername").addEventListener("click",()=>{
 const username=$("firstUsername").value.trim();
 if(username.length<2)return toast("Bitte einen Benutzernamen mit mindestens 2 Zeichen eingeben.");
 state.profile.username=username;
 state.profile.clubName=`${username} FC`;
 save();
 renderHeaderClubName();
 $("usernameStep").style.display="none";
 $("leagueStep").style.display="block";
 renderLeagueChoices();
 toast(`Willkommen, ${username}. Dein Team heißt ${state.profile.clubName}.`)
});

function renderLeagueChoices(){$("leagueGrid").innerHTML=LEAGUE_CHOICES.map(c=>{const pool=leaguePool(c.id),g=pool.filter(p=>p.ovr>=75&&p.ovr<=80).length,si=pool.filter(p=>rarityOf(p)==="silver").length,b=pool.filter(p=>rarityOf(p)==="bronze").length;return`<button class="leaguebtn" data-league="${c.id}" ${buildStarter(c.id)?'':'disabled'}><div><strong>${esc(c.label)}</strong><span>${g} Starter-Gold · ${si} Silber · ${b} Bronze verfügbar${b<11?" · Bronze aus weiteren Ligen":""}</span></div><b>›</b></button>`}).join("")}
function posFit(p,slot){
 if(!p)return 0;
 const vals=[p.position,...String(p.alt||"").split(/[,/]/).map(x=>x.trim().toUpperCase()).filter(Boolean)];
 return vals.includes(String(slot||"").toUpperCase())?1:0;
}
function arrangeSquad(items,formation="4-3-3"){
 const form=FORMATIONS[formation]||FORMATIONS["4-3-3"];
 const unique=[...new Map(items.filter(Boolean).map(item=>[item.uid,item])).values()].filter(item=>displayBase(item));
 const rated=unique.sort((a,b)=>itemRating(b)-itemRating(a));
 const candidateMap=new Map(rated.slice(0,20).map(item=>[item.uid,item]));
 for(const position of new Set(form.map(slot=>slot.p))){
  rated.filter(item=>posFit(displayBase(item),position)).slice(0,16).forEach(item=>candidateMap.set(item.uid,item))
 }
 const candidates=[...candidateMap.values()],size=1<<form.length;
 let scores=new Float64Array(size).fill(-Infinity);scores[0]=0;
 const choices=[];
 for(const item of candidates){
  const next=scores.slice(),choice=new Int8Array(size).fill(-1),base=displayBase(item),rating=itemRating(item);
  for(let mask=0;mask<size;mask++){
   if(!Number.isFinite(scores[mask]))continue;
   for(let slot=0;slot<form.length;slot++){
    const bit=1<<slot;if(mask&bit)continue;
    const fit=posFit(base,form[slot].p),points=rating+(fit?300:0)+(fit&&base.isIcon?3:0);
    if(scores[mask]+points>next[mask|bit]){next[mask|bit]=scores[mask]+points;choice[mask|bit]=slot}
   }
  }
  scores=next;choices.push(choice)
 }
 let mask=size-1;
 if(!Number.isFinite(scores[mask])){
  let best=-Infinity;
  for(let m=0;m<size;m++){if(!Number.isFinite(scores[m]))continue;const count=m.toString(2).replace(/0/g,"").length,value=count*100000+scores[m];if(value>best){best=value;mask=m}}
 }
 const starters=Array(form.length).fill(null);
 for(let i=candidates.length-1;i>=0;i--){const slot=choices[i][mask];if(slot>=0){starters[slot]=candidates[i].uid;mask^=1<<slot}}
 const used=new Set(starters.filter(Boolean)),rest=rated.filter(item=>!used.has(item.uid));
 const ordered=[...starters,...rest.slice(0,12).map(item=>item.uid)];
 return [...ordered,...Array(Math.max(0,23-ordered.length)).fill(null)]
}
$("formationSelect").addEventListener("change",()=>{
 const formation=$("formationSelect").value;if(!FORMATIONS[formation])return;
 const selected=squadItems().filter(Boolean);
 state.formation=formation;state.roles={};state.focus={};state.squad=arrangeSquad(selected,formation);
 save();renderAll();toast(`Formation ${formation} eingestellt.`)
});
$("autoSquad").addEventListener("click",()=>{
 if(!state.club.length)return toast("Noch keine Spieler im Verein.");
 state.squad=arrangeSquad(state.club,state.formation);save();renderAll();toast("Team nach Stärke und Position aufgestellt.")
});
$("clearSquad").addEventListener("click",()=>{
 if(!state.squad.some(Boolean))return;
 if(!confirm("Aufstellung leeren? Deine Spieler bleiben im Verein."))return;
 state.squad=Array(23).fill(null);state.roles={};state.focus={};save();renderAll();toast("Aufstellung geleert.")
});
$("leagueGrid").addEventListener("click",e=>{const b=e.target.closest("[data-league]");if(!b||b.disabled)return;state.starterLeague=b.dataset.league;const c=leagueChoice(state.starterLeague);$("leagueStep").style.display="none";$("starterStage").classList.add("active");$("starterTitle").textContent=`${c?.label||state.starterLeague} Starterset`;const st=buildStarter(state.starterLeague);$("starterOpen").disabled=!st;$("starterOpen").dataset.ready=st?"1":"0";$("starterInfo").textContent=st?"3 echte Goldkarten (75–80) · 4 echte Silberkarten · 11 echte Bronzekarten · Fehlende Bronze-Spieler kommen aus weiteren Ligen. Ratings werden nie verändert.":"Für diese Auswahl konnte kein valider 18er-Starterkader gebildet werden."})
$("starterBack").addEventListener("click",prepareOnboarding);
$("starterOpen").addEventListener("click",async()=>{const bases=buildStarter(state.starterLeague);if(!bases)return;const btn=$("starterOpen");btn.disabled=true;$("starterPack").classList.add("pulse");await sleep(1600);const items=bases.map(b=>makeItem(b,false));state.club.push(...items);state.squad=arrangeSquad(items,state.formation);state.onboarded=true;state.stats.starter=1;state.stats.full=1;save();$("starterPack").classList.remove("pulse");$("onboard").classList.remove("active");renderAll();toast("Starterkader erhalten.")})

function openFooteraPointsOverview(required,source,available=Number(state.points||0)){
 const pointsShop=window.FooteraPointsShop;
 if(pointsShop?.open)return pointsShop.open({required,source,available});
 toast("Points-Übersicht wird geladen. Bitte erneut versuchen.");
 return false;
}
function renderWallet(){const local=Number(state.points)||0,server=window.FooteraPaidWallet?.paidBalance()||0;$("coins").textContent=fmt(state.coins);$("points").textContent=fmt(local+server);$("points").closest(".walletbox")?.setAttribute("title",fmt(local)+" erspielte Points + "+fmt(server)+" gekaufte Sandbox-Points")}
function ensureSquadSlots(){if(!Array.isArray(state.squad))state.squad=[];while(state.squad.length<23)state.squad.push(null);if(state.squad.length>23)state.squad=state.squad.slice(0,23)}
function squadItems(){ensureSquadSlots();return state.squad.map(id=>state.club.find(x=>x.uid===id)||null)}
function currentFormation(){return FORMATIONS[state.formation]||FORMATIONS["4-3-3"]}
// Display-only spots for the squad pitch: nudges the formation spots apart until no card (incl. its chemistry tag) covers another.
// Geometry in % of the pitch, matching ux-clarity.css (#pitch aspect .68, slot width 18%, card aspect 1.42, tag ~1.1% below the card).
const PITCH_SPOTS=new WeakMap();
function squadPitchSpots(form){
 if(PITCH_SPOTS.has(form))return PITCH_SPOTS.get(form);
 const W=18,H=W*1.42*.68,TAG=1.1,GAP=.6,spots=form.map(s=>({x:s.x,y:s.y}));
 for(let pass=0;pass<400;pass++){
  let moved=false;
  for(let i=0;i<spots.length;i++)for(let j=i+1;j<spots.length;j++){
   const a=spots[i],b=spots[j],[up,lo]=a.y<=b.y?[a,b]:[b,a],ox=W+GAP-Math.abs(a.x-b.x),oy=H+TAG+GAP-(lo.y-up.y);
   if(ox<=0||oy<=0)continue;moved=true;
   if(ox<oy*.6){const[l,r]=a.x<=b.x?[a,b]:[b,a];l.x-=ox/2+.01;r.x+=ox/2+.01}else{up.y-=oy/2+.01;lo.y+=oy/2+.01}
  }
  for(const s of spots){s.x=Math.min(100-W/2-.5,Math.max(W/2+.5,s.x));s.y=Math.min(100-H/2-TAG-.4,Math.max(H/2+.4,s.y))}
  if(!moved)break;
 }
 const out=spots.map(s=>({x:+s.x.toFixed(1),y:+s.y.toFixed(1)}));PITCH_SPOTS.set(form,out);return out;
}
function inPosition(base,slot){return posFit(base,slot)>0}
function chemThreshold(n,a,b,c){return n>=c?3:n>=b?2:n>=a?1:0}
function chemNationKey(nation){
 const key=normalizeKey(nation||"");
 if(!key)return"";
 // Football uses four distinct home nations, even though their flags share a country code.
 if(["england","scotland","wales","northern ireland"].includes(key))return key;
 return countryCode(nation)
}
function squadChemistry(items){
 const form=currentFormation(),xi=items.slice(0,11).map((item,i)=>{
  const base=item?displayBase(item):null;
  return base&&inPosition(base,form[i]?.p)?{base,icon:!!(base.isIcon||item.variant==="icon-mid"||isFounderItem(item))}:null
 });
 const clubs=new Map(),nations=new Map(),leagues=new Map();let icons=0;
 const add=(map,key)=>{if(key)map.set(key,(map.get(key)||0)+1)};
 for(const entry of xi){
  if(!entry)continue;
  const {base,icon}=entry,nation=chemNationKey(base.nation);
  add(nations,nation);
  if(icon){icons++;continue}
  add(clubs,base.team);add(leagues,base.league)
 }
 return xi.map(entry=>{
  if(!entry)return 0;
  if(entry.icon)return 3;
  const b=entry.base,club=clubs.get(b.team)||0,nation=nations.get(chemNationKey(b.nation))||0,league=(leagues.get(b.league)||0)+(b.league?icons:0);
  return Math.min(3,chemThreshold(club,2,4,7)+chemThreshold(nation,2,5,8)+chemThreshold(league,3,5,8))
 })
}
function opponentSquadChemistry(squad,formation="4-3-3",items=[]){
 const form=FORMATIONS[formation]||FORMATIONS["4-3-3"],xi=(Array.isArray(squad)?squad:[]).slice(0,11).map((raw,i)=>{
  const base=raw?.player?raw.player:raw;
  if(!base||posFit(base,form[i]?.p)<=0)return null;
  const item=Array.isArray(items)?items[i]:null,icon=!!(base.isIcon||item?.variant==="icon-mid"||(item&&isFounderItem(item)));
  return{base,icon}
 });
 const clubs=new Map(),nations=new Map(),leagues=new Map();let icons=0;
 const add=(map,key)=>{if(key)map.set(key,(map.get(key)||0)+1)};
 for(const entry of xi){
  if(!entry)continue;
  const {base,icon}=entry,nation=chemNationKey(base.nation);
  add(nations,nation);
  if(icon){icons++;continue}
  add(clubs,base.team);add(leagues,base.league)
 }
 return xi.map(entry=>{
  if(!entry)return 0;
  if(entry.icon)return 3;
  const b=entry.base,club=clubs.get(b.team)||0,nation=nations.get(chemNationKey(b.nation))||0,league=(leagues.get(b.league)||0)+(b.league?icons:0);
  return Math.min(3,chemThreshold(club,2,4,7)+chemThreshold(nation,2,5,8)+chemThreshold(league,3,5,8))
 })
}
function opponentChemistryTotal(squad,formation="4-3-3",items=[]){return opponentSquadChemistry(squad,formation,items).reduce((sum,value)=>sum+value,0)}
function playerChem(index,items){return index>=0&&index<11?squadChemistry(items)[index]||0:0}
function squadMetrics(){const items=squadItems(),xi=items.slice(0,11).filter(Boolean),matchSquad=items.slice(0,18),rating=xi.length?Math.round(xi.reduce((s,i)=>s+itemRating(i),0)/xi.length):0,chemScores=squadChemistry(items),chem=chemScores.reduce((total,value)=>total+value,0);return{items,filled:matchSquad.filter(Boolean).length,reserveFilled:items.slice(18,23).filter(Boolean).length,rating,chem,chemScores}}
function slotHTML(item,i,chem=0){
 const s=currentFormation()[i],spot=squadPitchSpots(currentFormation())[i],base=item?displayBase(item):null,out=base&&!inPosition(base,s.p),shown=base&&!out?s.p:(base?.position||s.p);
 // Chem style sits with the chemistry diamonds in one tag on the card's bottom edge, outside the layout flow, so it never pushes or covers neighbouring cards.
 const boost=base&&typeof FooteraChemBoosts!=="undefined"?FooteraChemBoosts.badgeHTML(item,true):"";
 return`<button class="slot ${out?"out":""}" data-slot="${i}" style="left:${spot.x}%;top:${spot.y}%">${base?cardHTML(base,item,true,shown,false):`<div class="emptyslot">${positionLabel(s.p)}<br>+</div>`}${out?'<div class="poswarn">!</div>':''}${base?`<div class="chem-dots${boost?" has-boost":""}" title="Individuelle Chemie: ${chem}/3" aria-label="Individuelle Chemie ${chem} von 3">${boost}${[1,2,3].map(n=>`<i class="${chem>=n?"on":""}"></i>`).join("")}</div>`:""}</button>`
}
function benchHTML(item,i){const b=item?displayBase(item):null;return`<div class="benchslot"><button data-slot="${i}" aria-label="${b?esc(b.name):"Bankplatz"}">${b?cardHTML(b,item,true):'<div class="emptyslot">BANK<br>+</div>'}</button></div>`}
function reserveHTML(item,i){const b=item?displayBase(item):null;return`<div class="reserveslot"><button data-slot="${i}" aria-label="${b?esc(b.name):"Reserveplatz"}">${b?cardHTML(b,item,true):'<div class="emptyslot">RES<br>+</div>'}</button></div>`}
let squadDrawerMode="";
function syncSquadDrawer(){
 const drawer=$("squadDrawer");if(!drawer)return;
 drawer.dataset.mode=squadDrawerMode;drawer.classList.toggle("open",!!squadDrawerMode);
 document.querySelectorAll("[data-squad-drawer]").forEach(b=>{const on=b.dataset.squadDrawer===squadDrawerMode;b.classList.toggle("active",on);const i=b.querySelector("i");if(i)i.textContent=on?"⌄":"⌃"})
}
function setSquadDrawer(mode,toggle=false){const next=(toggle&&squadDrawerMode===mode)?"":mode;squadDrawerMode=next;syncSquadDrawer()}
function squadPresetTabsHTML(){return state.squadPresets.map((preset,i)=>{
 const active=i===state.activeSquadPreset,filled=(active?state.squad:preset?.squad||[]).slice(0,18).filter(Boolean).length,name=preset?.name||`Team ${i+1}`;
 return `<button type="button" class="squad-preset-tab ${active?'active':''} ${preset?'':'new'}" data-select-squad="${i}" aria-pressed="${active}" aria-label="${esc(name)} ${preset?active?'aktiv':'aktivieren':'aus aktuellem Team erstellen'}"><strong>${esc(name)}</strong><small>${preset?`${filled}/18 · ${esc(preset.formation)}`:'＋ Team kopieren'}</small></button>`
 }).join('')}
function renderSquadPresetControls(){
 persistActiveSquadPreset(state);
 for(const id of ['squadPresetTabs','playSquadPresets'])if($(id))$(id).innerHTML=squadPresetTabsHTML();
 const input=$("squadPresetName");if(input&&document.activeElement!==input)input.value=state.squadPresets[state.activeSquadPreset]?.name||"Mein Team"
}
function selectSquadPreset(index){
 const changed=activateSquadPreset(state,index);if(!changed)return;
 previewSwapFrom=-1;
 if(squadBattleStage==="preview"&&pendingMatchContext&&["rivals","friendly-random"].includes(pendingMatchContext.mode))pendingMatchContext.opponent=oneOffOpponent(pendingMatchContext.mode);
 save();renderAll();refreshOpenMatchPreview();toast(changed.created?`${changed.name} als Kopie erstellt und aktiviert.`:`${changed.name} aktiviert.`)
}
function handleSquadPresetClick(e){const button=e.target.closest('[data-select-squad]');if(button)selectSquadPreset(Number(button.dataset.selectSquad))}
$("squadPresetTabs").addEventListener("click",handleSquadPresetClick);
$("playSquadPresets").addEventListener("click",handleSquadPresetClick);
$("squadPresetName").addEventListener("input",e=>{
 state.squadPresets[state.activeSquadPreset].name=squadPresetName(e.target.value,state.activeSquadPreset);
 renderSquadPresetControls();save()
});
$("squadPresetName").addEventListener("change",e=>{
 const name=squadPresetName(e.target.value,state.activeSquadPreset);
 state.squadPresets[state.activeSquadPreset].name=name;e.target.value=name;
 renderSquadPresetControls();save();toast(`Team heißt jetzt ${name}.`)
});
$("squadPresetRename").addEventListener("click",e=>{
 const row=$("squadPresetNameRow"),open=row.hidden;
 row.hidden=!open;e.currentTarget.setAttribute("aria-expanded",String(open));
 if(open)$("squadPresetName").focus()
});
$("squadTacticsShortcut").addEventListener("click",()=>{
 const tiles=$("squadPlanMenu");if(tiles)tiles.scrollIntoView({behavior:"smooth",block:"center"})
});
function renderSquad(){
 ensureSquadSlots();
 renderSquadPresetControls();
 const m=squadMetrics();$("sqRating").textContent=m.rating||"–";$("sqChem").textContent=`${m.chem}/33`;$("sqFilled").textContent=`${m.filled}/18`;$("formationSelect").value=state.formation;
 $("pitch").innerHTML=m.items.slice(0,11).map((x,i)=>slotHTML(x,i,m.chemScores[i])).join("");
 $("bench").innerHTML=m.items.slice(11,18).map((x,k)=>benchHTML(x,11+k)).join("");
 $("reserve").innerHTML=m.items.slice(18,23).map((x,k)=>reserveHTML(x,18+k)).join("");
 $("benchDrawerCount").textContent=`${m.items.slice(11,18).filter(Boolean).length}/7`;
 $("reserveDrawerCount").textContent=`${m.reserveFilled}/5`;
 syncSquadDrawer();
 if(m.filled===18)state.stats.full=1;
 renderRoles(m.items);save();window.FooteraOnline?.queueProfileSync?.();setTimeout(prioritizeVisibleSquadBadges,20)
}
function renderRoles(items){
 const form=currentFormation();
 $("roleList").innerHTML=items.slice(0,11).map((it,i)=>{const b=it?displayBase(it):null,slot=form[i].p,roles=ROLE_OPTIONS[slot]||["Balanced"],current=state.roles[i]&&roles.includes(state.roles[i])?state.roles[i]:roles[0],focus=state.focus[i]||"Balanced";state.roles[i]=current;state.focus[i]=focus;return `<div class="role-row"><div class="role-player">${positionLabel(slot,b)} · ${b?esc(b.name):"Leer"}</div><select data-role-slot="${i}" ${b?"":"disabled"}>${roles.map(r=>`<option value="${esc(r)}" ${r===current?"selected":""}>${roleLabel(r)}</option>`).join("")}</select><select data-focus-slot="${i}" ${b?"":"disabled"}>${FOCUS_OPTIONS.map(f=>`<option value="${esc(f)}" ${f===focus?"selected":""}>${focusLabel(f)}</option>`).join("")}</select></div>`}).join("")
}
$("roleList").addEventListener("change",e=>{const r=e.target.closest("[data-role-slot]"),f=e.target.closest("[data-focus-slot]");if(r)state.roles[Number(r.dataset.roleSlot)]=r.value;if(f)state.focus[Number(f.dataset.focusSlot)]=f.value;save()})
$("roleToggle")?.addEventListener("click",()=>{const panel=$("rolePanel"),btn=$("roleToggle");if(!panel||!btn)return;const collapsed=panel.classList.toggle("collapsed");btn.textContent=collapsed?"Aufklappen":"Einklappen";btn.setAttribute("aria-expanded",collapsed?"false":"true")})
let pickerFilterPosition="",pickerFilterLeague="",pickerFilterClub="",pickerFilterQuality="",pickerSortMode="fit",pickerSearchTerm="",pickerMinRating=0,pickerMaxRating=99,pickerOnlyUntradeable=false,pickerPage=0,pickerStage="filters";
const PICKER_PAGE_SIZE=20;
function pickerSlotLabel(i){return i<11?positionLabel(currentFormation()[i].p):i<18?`Bank ${i-10}`:`Reserve ${i-17}`}
function renderPickerPreview(){
 const item=pickerMode==="slot"?state.club.find(x=>x.uid===pickerSourceUid):state.club.find(x=>x.uid===state.squad[pickerIndex]);
 const b=item?displayBase(item):null,label=pickerMode==="slot"?"SPIELER EINFÜGEN":`KADERPLATZ · ${pickerSlotLabel(pickerIndex)}`;
 $("pickerPreview").innerHTML=`<div class="picker-preview-card">${b?cardHTML(b,item,true):'<div class="picker-empty-card">+</div>'}</div><div class="picker-preview-copy"><small>${esc(label)}</small><strong>${b?esc(b.name):"Platz frei"}</strong><span>${pickerMode==="slot"?"Wähle einen Platz in deiner Aufstellung.":b?"Wähle einen Ersatz aus deinem Verein.":"Suche einen Spieler aus deinem Verein."}</span></div>`
}
function pickerItemQuality(item,base=displayBase(item)){
 const cls=cardClass(base,item);
 // Include Icons, Founders, Momentum, Champions, Story, TOTW and Evolutions.
 if(item?.variant||item?.cosmeticDesign||item?.eventType||isEvolutionItem(item))return "special";
 return ["gold","silver","bronze"].includes(cls)?cls:"special"
}
function pickerAffiliationOptions(){
 const rows=state.club.map(item=>{const base=displayBase(item);if(!base)return null;const a=resolvedAffiliation(base);return{league:String(a?.league||"").trim(),club:String(a?.team||"").trim()}}).filter(Boolean);
 return{leagues:[...new Set(rows.map(x=>x.league).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de")),rows}
}
function populatePickerClubFilter(league="",preferredClub=""){
 const select=$("pickerClubFilter");if(!select)return;
 const {rows}=pickerAffiliationOptions(),clubs=[...new Set(rows.filter(x=>!league||x.league===league).map(x=>x.club).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"));
 select.innerHTML='<option value="">Alle Vereine</option>'+clubs.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
 select.value=clubs.includes(preferredClub)?preferredClub:""
}
function populatePickerAffiliationFilters(){
 const leagueSelect=$("pickerLeagueFilter");if(!leagueSelect)return;
 const {leagues}=pickerAffiliationOptions();
 leagueSelect.innerHTML='<option value="">Alle Ligen</option>'+leagues.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
 leagueSelect.value=leagues.includes(pickerFilterLeague)?pickerFilterLeague:"";
 if(leagueSelect.value!==pickerFilterLeague)pickerFilterLeague="";
 populatePickerClubFilter(leagueSelect.value,pickerFilterClub);
 if($("pickerClubFilter").value!==pickerFilterClub)pickerFilterClub=""
}
function pickerCandidates(){
  const i=pickerIndex,slot=i<11?currentFormation()[i].p:(i<18?"BANK":"RESERVE"),used=new Set(state.squad.filter(Boolean)),query=normalizeKey(pickerSearchTerm);
  const list=state.club.filter(it=>{
   const b=displayBase(it);if(!b||used.has(it.uid))return false;
   const rating=itemRating(it),a=resolvedAffiliation(b),quality=pickerItemQuality(it,b);
   return rating>=pickerMinRating&&rating<=pickerMaxRating&&(!pickerOnlyUntradeable||!it.tradeable)
   &&(!pickerFilterPosition||playerPositions(b).includes(pickerFilterPosition))
   &&(!pickerFilterLeague||String(a?.league||"")===pickerFilterLeague)
   &&(!pickerFilterClub||String(a?.team||"")===pickerFilterClub)
   &&(!pickerFilterQuality||quality===pickerFilterQuality)
   &&(!query||normalizeKey(b.name).includes(query))
 });
 list.sort((a,b)=>{
  const ba=displayBase(a),bb=displayBase(b),rating=itemRating(b)-itemRating(a);
  if(pickerSortMode==="fit"&&i<11){const fit=posFit(bb,slot)-posFit(ba,slot);if(fit)return fit}
  if(pickerSortMode==="rating-asc")return-rating||String(ba.name).localeCompare(String(bb.name),"de");
  if(pickerSortMode==="name")return String(ba.name).localeCompare(String(bb.name),"de")||rating;
  return rating||String(ba.name).localeCompare(String(bb.name),"de")
 });
  return{list,slot}
}
function renderPickerCandidates(){
  if(pickerIndex<0)return;
  const {list,slot}=pickerCandidates(),totalPages=Math.ceil(list.length/PICKER_PAGE_SIZE);
 pickerPage=Math.min(pickerPage,Math.max(0,totalPages-1));
 $("pickerResultTitle").textContent="Spieler im Verein";
 $("pickerResultCount").textContent=`${list.length} Treffer · ${pickerSlotLabel(pickerIndex)} besetzen`;
 $("pickerEditFilters").hidden=false;
 $("pickList").className="picklist";
 $("pickList").innerHTML=list.slice(pickerPage*PICKER_PAGE_SIZE,(pickerPage+1)*PICKER_PAGE_SIZE).map(it=>{
   const b=displayBase(it),f=pickerIndex<11?posFit(b,slot):1,tag=pickerIndex>=11?"Im Verein":f?"Position passt":"Andere Position";
   return`<button class="picker-player" type="button" data-pick="${esc(it.uid)}" aria-label="${esc(b.name)} auswählen"><span class="picker-player-add">+</span>${cardHTML(b,it,true)}<span class="picker-player-info"><strong>${esc(b.name)}</strong><small>${esc(positionLabel(b.position,b))} · ${esc(b.team)}</small><span class="picker-player-stats">${cardStatPairs(resolvedPlayer(b)).map(([name,value])=>`<span><b>${Number(value)||0}</b>${esc(name)}</span>`).join("")}</span><span class="fit ${pickerIndex<11&&!f?"bad":""}">${esc(tag)}</span></span><span class="picker-player-arrow">›</span></button>`
  }).join("")||'<div class="picker-no-results">Keine verfügbaren Spieler gefunden.<br>Spieler aus Startelf, Bank und Reserve erscheinen hier nicht. Passe gegebenenfalls deine Filter an.</div>';
 $("pickerPages").hidden=totalPages<=1;
 $("pickerPageLabel").textContent=`Seite ${pickerPage+1} von ${totalPages||1}`;
 $("pickerPrev").disabled=pickerPage===0;$("pickerNext").disabled=pickerPage>=totalPages-1
}
function renderSlotPickerCandidates(){
 const item=state.club.find(x=>x.uid===pickerSourceUid),b=item?displayBase(item):null;if(!b)return;
 $("pickerResultTitle").textContent="Kaderplatz wählen";$("pickerResultCount").textContent="Freie Plätze oder Spieler direkt ersetzen";
 $("pickerEditFilters").hidden=true;$("pickerPages").hidden=true;$("pickList").className="picklist picker-slot-list";
 const groups=[["Startelf",0,11],["Ersatzbank",11,18],["Reserve",18,23]];
 $("pickList").innerHTML=groups.map(([title,start,end])=>`<section class="picker-slot-group"><h4>${title}</h4><div class="picker-slot-grid">${state.squad.slice(start,end).map((uid,k)=>{
  const idx=start+k,occItem=state.club.find(x=>x.uid===uid),occ=occItem?displayBase(occItem):null,fit=idx<11?posFit(b,currentFormation()[idx].p):1;
  return`<button class="picker-slot" type="button" data-slotpick="${idx}" ${uid===item.uid?"disabled":""}><span class="picker-slot-card">${occ?cardHTML(occ,occItem,true):'<span class="picker-empty-card">+</span>'}</span><span class="picker-slot-info"><strong>${esc(pickerSlotLabel(idx))}</strong><small>${occ?esc(occ.name):"Platz frei"}</small><span class="fit ${idx<11&&!fit?"bad":""}">${idx>=11?"Kader":fit?"Position passt":"Andere Position"}</span></span></button>`
 }).join("")}</div></section>`).join("")
}
function setPickerStage(stage){
 pickerStage=stage;$("pickerControls").hidden=stage!=="filters";$("pickerResults").hidden=stage!=="results";
 if(stage==="results"){if(pickerMode==="slot")renderSlotPickerCandidates();else renderPickerCandidates()}
 $("picker").scrollTop=0
}
function openPicker(i){
 ensureSquadSlots();if(!Number.isInteger(i)||i<0||i>=state.squad.length)return;
 pickerMode="player";pickerSourceUid=null;pickerIndex=i;pickerPage=0;
 pickerFilterPosition="";pickerFilterLeague="";pickerFilterClub="";pickerFilterQuality="";pickerSortMode="fit";pickerSearchTerm="";pickerMinRating=0;pickerMaxRating=99;pickerOnlyUntradeable=false;
 $("pickerTitle").textContent="Vereinssuche";$("pickerSub").textContent=`${pickerSlotLabel(i)} · Spieler auswählen`;
 $("pickerName").value="";$("pickerPositionFilter").value="";$("pickerSort").value="fit";$("pickerQualityFilter").value="";$("pickerRatingMin").value="0";$("pickerRatingMax").value="99";$("pickerOnlyUntradeable").checked=false;
 populatePickerAffiliationFilters();
 renderPickerPreview();setPickerStage("filters");showUiLayer("picker","picker")
}
function putItemIntoSlot(itemUid,toIndex){
 ensureSquadSlots();
 if(!Number.isInteger(toIndex)||toIndex<0||toIndex>=state.squad.length||!state.club.some(x=>x.uid===itemUid))return false;
 const fromIndex=state.squad.indexOf(itemUid);if(fromIndex===toIndex)return false;
 if(fromIndex>=0){const displaced=state.squad[toIndex];state.squad[toIndex]=itemUid;state.squad[fromIndex]=displaced||null}
 else state.squad[toIndex]=itemUid;
 return true
}
function removeSquadPlayer(itemUid,fromIndex){
 ensureSquadSlots();
 if(!Number.isInteger(fromIndex)||fromIndex<0||fromIndex>=state.squad.length||state.squad[fromIndex]!==itemUid)return false;
 state.squad[fromIndex]=null;
 if(fromIndex<11){delete state.roles[fromIndex];delete state.focus[fromIndex]}
 return true
}
function openSlotPickerForItem(itemUid){
 ensureSquadSlots();const item=state.club.find(x=>x.uid===itemUid);if(!item)return;
 pickerMode="slot";pickerSourceUid=itemUid;pickerIndex=-1;pickerPage=0;
 $("pickerTitle").textContent="Kaderplatz wählen";$("pickerSub").textContent="Tippe auf einen freien oder besetzten Platz.";
 renderPickerPreview();setPickerStage("results");showUiLayer("picker","picker")
}
function playerPositions(p){return [...new Set([p?.position,...String(p?.alt||"").split(/[,/]/).map(x=>x.trim().toUpperCase()).filter(Boolean)].map(x=>String(x||"").trim().toUpperCase()).filter(Boolean))]}
function positionPlusMatch(p,position,primaryOverride=""){
 const wanted=String(position||"").trim().toUpperCase();if(!wanted)return true;
 return [...new Set([primaryOverride,...playerPositions(p)].map(x=>String(x||"").trim().toUpperCase()).filter(Boolean))].includes(wanted)
}
function detailChemHTML(chem,label="Chemie"){if(chem==null)return"";return`<div class="detail-chem"><div><strong>${esc(label)}</strong><small>${chem}/3 Chemie-Punkte</small></div><div class="detail-chem-diamonds">${[1,2,3].map(n=>`<i class="${chem>=n?"on":""}"></i>`).join("")}</div></div>`}
function purchaseInfoHTML(item){const paid=Number(item?.purchasePrice||0);if(!(paid>0))return"";return `<div class="item-purchase-info"><span>Item gekauft für</span><strong>${currencyAmountHTML("coins",paid,"compact")}</strong></div>`}
function playerClubPerformance(item){return{goals:Math.max(0,Number(item?.clubGoals||0)),assists:Math.max(0,Number(item?.clubAssists||0))}}
function itemTradeabilityChipHTML(item){
 if(!item||typeof item.tradeable!=="boolean")return"";
 const tradeable=!!item.tradeable;
 const icon=tradeable
  ?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12m0 0-3-3m3 3-3 3M18 17H6m0 0 3 3m-3-3 3-3"/></svg>'
  :'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
 return `<span class="fc27-pill trade-status ${tradeable?"tradeable":"untradeable"}">${icon}${tradeable?"Tauschbar":"Untauschbar"}</span>`
}
function playerOverviewHTML(b,item,{shownPosition=null,slot=null,fits=true,chem=null,context=""}={}){
 b=resolvedPlayer(b);ensurePlayerAffiliationAssets(b);
 const shown=shownPosition||b.position,positions=playerPositions(b),attrs=cardStatPairs(b),shownLabel=positionLabel(shown,b),mainLabel=positionLabel(b.position,b),slotLabel=slot&&slot!=="BANK"&&slot!=="RESERVE"?positionLabel(slot,b):slot,status=slot&&slot!=="BANK"&&slot!=="RESERVE"?(fits?`Auf ${slotLabel} spielbar`:`Nicht auf ${slotLabel} spielbar`):(slot==="BANK"?"Ersatzbank":slot==="RESERVE"?"Reserve":"Vereinsitem"),clubPerf=playerClubPerformance(item);
 return`<div class="player-detail-overview"><div class="player-detail-card">${cardHTML(b,item,false,shown)}</div><div class="player-detail-summary"><h2>${esc(isFounderItem(item)?b.fullName||b.name:b.name)}</h2><div class="subline" data-player-context-id="${esc(b.id||"")}">${esc(playerContextLine(b))}</div>${playerAffiliationHTML(b,true)}${purchaseInfoHTML(item)}<div class="fc27-status"><span class="fc27-pill ${fits?"good":"bad"}">${esc(status)}</span>${context?`<span class="fc27-pill">${esc(context)}</span>`:""}${itemTradeabilityChipHTML(item)}${isMomentumItem(item)?`<span class="fc27-pill momentum">MOMENTUM</span>`:isFounderItem(item)?`<span class="fc27-pill">FOUNDER</span>`:isStoryItem(item)?`<span class="fc27-pill">STORY · NUR IM PASS</span>`:""}</div>${detailChemHTML(chem)}<div class="fc27-info-grid"><div class="fc27-info"><b>${esc(shownLabel)}</b><span>Aktuelle Position</span></div><div class="fc27-info"><b>${esc(mainLabel)}</b><span>Hauptposition</span></div><div class="fc27-info"><b>${esc(playerFoot(b))}</b><span>Starker Fuß</span></div><div class="fc27-info"><b>${stars(skillStars(b))} / ${stars(weakFootStars(b))}</b><span>Skills / Schwacher Fuß</span></div>${isFounderItem(item)?`<div class="fc27-info"><b>${Number(b.height)||172} cm</b><span>Größe</span></div><div class="fc27-info"><b>Deutschland</b><span>Nationalität</span></div>`:""}<div class="fc27-info"><b>${clubPerf.goals}</b><span>Tore für deinen Verein</span></div><div class="fc27-info"><b>${clubPerf.assists}</b><span>Vorlagen für deinen Verein</span></div></div><div class="fc27-section"><div class="fc27-section-head"><strong>Spielbare Positionen</strong><small>FC27 Positionslogik</small></div><div class="position-chips">${positions.map((p,i)=>`<span class="position-chip ${i===0?"primary":""} ${p===shown?"current":""}">${esc(positionLabel(p,b))}</span>`).join("")}</div></div><div class="fc27-section"><div class="fc27-section-head"><strong>Attribute</strong><small>${esc(positionLabel(shown,b))}</small></div><div class="detail-attributes">${attrs.map(([k,v])=>`<div class="detail-attribute"><b>${v}</b><span>${k}</span></div>`).join("")}</div></div>${typeof FooteraPlayStyles!=="undefined"?FooteraPlayStyles.compactHTML(item,b):""}${typeof FooteraChemBoosts!=="undefined"?chemBoostProfileHTML(item,b,chem):""}</div></div>`
}

function openPlayerDetails(item,index=null,fromPreview=false){
 if(!item)return;const b=displayBase(item);if(!b)return;
 const inSquad=index!=null&&index>=0&&state.squad[index]===item.uid;
 const slot=inSquad?(index<11?currentFormation()[index]?.p:(index<18?"BANK":"RESERVE")):null;
 const fits=!slot||slot==="BANK"||slot==="RESERVE"||inPosition(b,slot),chem=inSquad&&index<11?playerChem(index,squadItems()):null,shown=slot&&slot!=="BANK"&&slot!=="RESERVE"&&fits?slot:b.position;
 const activeSale=activeTransferSaleForUid(item.uid),blockedByTeam=transferSalePlayerInSquad(item.uid);
 $("playerDetailSub").textContent=`${isFounderItem(item)?"FOUNDER · ":isStoryItem(item)?"STORY · ":isMomentumItem(item)?"MOMENTUM · ":""}${playerContextLine(b)}`;
 const squadActions=inSquad?`<button class="menu-action" data-replace-slot="${index}"><span><span>Spieler austauschen</span><small>Diesen Kaderplatz mit einem Spieler aus dem Verein neu besetzen.</small></span><b>›</b></button>${fromPreview?`<button class="menu-action" data-preview-swap-start="${index}"><span><span>Mit Kaderplatz tauschen</span><small>Spieler in Startelf, Bank oder Reserve direkt tauschen.</small></span><b>›</b></button>`:''}<button class="menu-action" data-move-club="${esc(item.uid)}" data-move-club-index="${index}"><span><span>In den Verein</span><small>Spieler aus der Aufstellung nehmen und Kaderplatz freimachen.</small></span><b>›</b></button>`:`<button class="menu-action" data-insert-item="${esc(item.uid)}"><span><span>In Mannschaft</span><small>Spieler auf einen Kaderplatz setzen.</small></span><b>›</b></button>`;
 const listLabel=isOnTransferList(item.uid)?"Von Transferliste entfernen":"Auf Transferliste";
 const sellDisabled=!item.tradeable||isFounderItem(item)||!!activeSale,sellText=activeSale?"Aktiv auf Transfermarkt":"Auf Transfermarkt anbieten",sellNote=!item.tradeable?"Dieses Item ist untauschbar.":activeSale?"Angebot läuft bereits.":blockedByTeam?"Beim Anbieten wird der Spieler automatisch aus allen gespeicherten Teams entfernt.":"Startpreis, Sofortkauf und Dauer festlegen.";
 const menu=`<div class="detail-menu"><button class="menu-action" data-open-bio="${esc(item.uid)}" data-open-bio-index="${inSquad?index:-1}"><span><span>Vollständige Spielerbiografie</span><small>Attribute, Positionen und zusätzliche Infos ansehen.</small></span><b>›</b></button>${squadActions}<button class="menu-action" data-transferlist="${esc(item.uid)}" ${(!item.tradeable||isFounderItem(item))?"disabled":""}><span><span>${listLabel}</span><small>Spieler passiv auf deiner Transferliste vormerken.</small></span><b>›</b></button><button class="menu-action" data-direct-sell="${esc(item.uid)}" ${sellDisabled?"disabled":""}><span><span>${sellText}</span><small>${sellNote}</small></span><b>›</b></button>${isFounderItem(item)||isStoryItem(item)?"":`<button class="menu-action" data-price-compare="${esc(item.uid)}"><span><span>Preisvergleich</span><small>Nur Marktangebote für genau diesen Spieler anzeigen.</small></span><b>›</b></button>`}</div>`;
 $("playerDetailBody").innerHTML=`${playerOverviewHTML(b,item,{shownPosition:shown,slot,fits,chem,context:inSquad?"Mannschaft":"Verein"})}${menu}`;
 showUiLayer("playerModal","player")
}
function packItemKey(item){const b=item?displayBase(item):null;return [String(item?.pid||""),String(item?.variant||""),String(item?.eventName||""),String(item?.boost||0),String(item?.overridePosition||""),String(item?.evo||0),isCardRare(b,item)?"1":"0"].join("|")}
function isFooteraLiveCard(item){return item?.acquisitionSource==="stripe-live"}
function packDuplicateMap(){const owned=new Set([...(state.club||[]),...(state.sbcStorage||[])].map(packItemKey)),seen=new Set(),map=new Map();pendingPack.forEach((item,k)=>{const key=packItemKey(item),dup=!isFooteraLiveCard(item)&&(owned.has(key)||seen.has(key));map.set(k,dup);seen.add(key)});return map}
function openPackPlayerDetails(k){
 const item=pendingPack[k];if(!item||pendingResolved.has(k))return;const b=displayBase(item);if(!b)return;
 const duplicate=!!packDuplicateMap().get(k),twin=duplicate&&!item.tradeable?tradeableClubTwinForPackItem(item):null;
 $("playerDetailSub").textContent=`Pack · ${duplicate?"DUPLIKAT · ":""}${playerClubLabel(b)} · ${playerLeagueLabel(b)}`;
 const normalActions=!duplicate?`<button class="menu-action" data-pack-profile-club="${k}"><span><span>In den Verein</span><small>Spieler deinem Verein hinzufügen.</small></span><b>›</b></button><button class="menu-action" data-pack-profile-insert="${k}"><span><span>In Mannschaft</span><small>Spieler hinzufügen und direkt einen Kaderplatz auswählen.</small></span><b>›</b></button>`:"";
 const tradeActions=item.tradeable?`<button class="menu-action" data-pack-transfer-profile="${k}"><span><span>Auf Transferliste</span><small>Item aus dem Pack auf die Transferliste verschieben.</small></span><b>›</b></button><button class="menu-action" data-pack-direct-sell="${k}"><span><span>Auf Transfermarkt anbieten</span><small>Startpreis, Sofortkauf und Dauer festlegen.</small></span><b>›</b></button>`:"";
 const storeAvailable=(state.sbcStorage||[]).length<100;
 const duplicateStorageActions=duplicate&&!isFounderItem(item)&&!isFooteraLiveCard(item)?`<button class="menu-action" data-pack-profile-sbcstore="${k}" ${storeAvailable?"":"disabled"}><span><span>${storeAvailable?"In SBC-Speicher":"SBC-Speicher voll (100/100)"}</span><small>Duplikat für spätere SBCs sichern${item.tradeable?" · bleibt tauschbar":""}.</small></span><b>›</b></button>${twin?`<button class="menu-action" data-pack-profile-swap="${k}"><span><span>Mit Vereinskarte tauschen</span><small>Untauschbare Pack-Karte behalten und die tauschbare Vereinskarte freigeben.</small></span><b>›</b></button>`:""}`:"";
 const resolveAction=`<button class="menu-action" data-pack-profile-sell="${k}"><span><span>${item.tradeable?`Schnellverkaufen · +${fmt(quickSell(item))} Coins`:"Abstoßen"}</span><small>${item.tradeable?"Item sofort gegen Münzen auflösen.":"Untauschbares Item endgültig verwerfen."}</small></span><b>›</b></button>`;
 $("playerDetailBody").innerHTML=`${playerOverviewHTML(b,item,{shownPosition:b.position,slot:null,fits:true,chem:null,context:duplicate?"Pack-Duplikat":"Pack-Inhalt"})}<div class="detail-menu">${normalActions}${tradeActions}${duplicateStorageActions}${resolveAction}<button class="menu-action" data-pack-bio="${k}"><span><span>Vollständige Spielerbiografie</span><small>Attribute, Positionen und zusätzliche Infos ansehen.</small></span><b>›</b></button><button class="menu-action" data-pack-price-compare="${k}"><span><span>Preisvergleich</span><small>Nur Marktangebote für genau diesen Spieler anzeigen.</small></span><b>›</b></button></div>`;
 showUiLayer("playerModal","player")
}
let suppressSquadClick=false;
function squadClick(e){const button=e.target.closest("[data-slot]");if(!button)return;if(suppressSquadClick){suppressSquadClick=false;return}const i=Number(button.dataset.slot);if(!Number.isInteger(i))return;const item=squadItems()[i];if(item)openPlayerDetails(item,i);else openPicker(i)}
$("pitch").addEventListener("click",squadClick);
$("bench").addEventListener("click",squadClick);
$("pickerClose").addEventListener("click",()=>{if(pickerMode==="player"&&pickerStage==="results")setPickerStage("filters");else closeUiLayer("picker","picker")});
$("pickerEditFilters").addEventListener("click",()=>setPickerStage("filters"));
$("pickerLeagueFilter").addEventListener("change",e=>populatePickerClubFilter(e.target.value,$("pickerClubFilter").value));
$("pickerControls").addEventListener("submit",e=>{
 e.preventDefault();
 if(pickerMode!=="player")return;
 const min=Math.max(0,Math.min(99,Number($("pickerRatingMin").value||0)));
 const max=Math.max(0,Math.min(99,Number($("pickerRatingMax").value||99)));
 if(min>max){toast("Das minimale Rating muss unter dem maximalen Rating liegen.");return}
 pickerSearchTerm=$("pickerName").value.trim();pickerFilterPosition=$("pickerPositionFilter").value;
 pickerFilterLeague=$("pickerLeagueFilter").value;pickerFilterClub=$("pickerClubFilter").value;pickerFilterQuality=$("pickerQualityFilter").value;
 pickerSortMode=$("pickerSort").value;pickerMinRating=min;pickerMaxRating=max;
 pickerOnlyUntradeable=$("pickerOnlyUntradeable").checked;pickerPage=0;
 setPickerStage("results")
});
$("pickerPrev").addEventListener("click",()=>{if(pickerPage>0){pickerPage--;renderPickerCandidates()}});
$("pickerNext").addEventListener("click",()=>{if((pickerPage+1)*PICKER_PAGE_SIZE<pickerCandidates().list.length){pickerPage++;renderPickerCandidates()}});
$("pickList").addEventListener("click",e=>{
 const b=e.target.closest("[data-pick]"),sp=e.target.closest("[data-slotpick]");
 if(b&&pickerMode==="player"&&!b.disabled){
  if(!pickerCandidates().list.some(item=>item.uid===b.dataset.pick)){renderPickerCandidates();return}
  if(putItemIntoSlot(b.dataset.pick,pickerIndex)){closeUiLayer("picker","picker");save();renderAll();refreshOpenMatchPreview();toast("Aufstellung aktualisiert.")}
  return
 }
 if(sp&&pickerMode==="slot"&&!sp.disabled){
  if(putItemIntoSlot(pickerSourceUid,Number(sp.dataset.slotpick))){closeUiLayer("picker","picker");$("playerModal").classList.remove("active");save();renderAll();refreshOpenMatchPreview();toast("Spieler in den Kader eingefügt.")}
  return
 }
});

$("playerModalClose").addEventListener("click",()=>closeUiLayer("playerModal","player"));
$("bioModalClose").addEventListener("click",()=>closeUiLayer("bioModal","bio"));
$("priceCompareClose").addEventListener("click",()=>closeUiLayer("priceCompareModal","price-compare"));
$("priceCompareBody").addEventListener("click",e=>{
 const details=e.target.closest("[data-price-compare-details]"),bid=e.target.closest("[data-price-compare-bid]"),buy=e.target.closest("[data-price-compare-buy]");
 const button=details||bid||buy;if(!button)return;
 const i=Number(details?.dataset.priceCompareDetails??bid?.dataset.priceCompareBid??buy?.dataset.priceCompareBuy),x=priceCompareListings[i];if(!x)return;
 if(details){openBiography(marketPreviewItem(x),-1,x.base);return}
 if(bid){if(bidMarketObject(x))renderPriceComparison();return}
 if(buy){if(buyMarketObject(x))renderPriceComparison();return}
});
$("transferOfferClose").addEventListener("click",()=>closeUiLayer("transferOfferModal","transfer-offer"));
$("transferOfferBody").addEventListener("click",e=>{
 const confirmBtn=e.target.closest("#directSellConfirm");if(!confirmBtn||!transferOfferContext)return;
 const ctx={...transferOfferContext};let item=null,addedFromPack=false;
 if(ctx.packIndex!=null){
  item=pendingPack[ctx.packIndex];if(!item||isFounderItem(item)||pendingResolved.has(ctx.packIndex)||!item.tradeable)return toast("Pack-Item ist nicht mehr verfügbar.");
  if(!state.club.some(x=>x.uid===item.uid)){state.club.push(item);addedFromPack=true}
 }else item=state.club.find(x=>x.uid===ctx.uid);
 if(!item)return;
 const ok=createTransferSale(item.uid,$("directSellStart")?.value,$("directSellBuy")?.value,$("directSellDuration")?.value);
 if(!ok){if(addedFromPack)state.club=state.club.filter(x=>x.uid!==item.uid);return}
 if(ctx.packIndex!=null){pendingResolved.add(ctx.packIndex);state.pendingResolved=[...pendingResolved];save()}
 transferOfferContext=null;removeUiLayer("transferOfferModal");removeUiLayer("playerModal");
 if(ctx.packIndex!=null){if(finishPackIfResolved())return;renderPackResults();renderAll()}
});
$("playerDetailBody").addEventListener("click",e=>{
 const bio=e.target.closest("[data-open-bio]"),
       cons=e.target.closest("[data-consumable]"),
       rep=e.target.closest("[data-replace-slot]"),
       swap=e.target.closest("[data-preview-swap-start]"),
       move=e.target.closest("[data-move-club]"),
       ins=e.target.closest("[data-insert-item]"),
       tl=e.target.closest("[data-transferlist]"),
       market=e.target.closest("[data-search-market]"),
       marketBio=e.target.closest("[data-market-bio]"),
       marketBid=e.target.closest("[data-market-bid-action]"),
       marketBuy=e.target.closest("[data-market-buy-action]"),
       marketSimilar=e.target.closest("[data-market-similar]"),
       packBio=e.target.closest("[data-pack-bio]"),
       directSell=e.target.closest("[data-direct-sell]"),
       priceCompare=e.target.closest("[data-price-compare]"),
       marketCompare=e.target.closest("[data-market-price-compare]"),
       packCompare=e.target.closest("[data-pack-price-compare]"),
       packDirectSell=e.target.closest("[data-pack-direct-sell]"),
       packTransfer=e.target.closest("[data-pack-transfer-profile]"),
       packProfileClub=e.target.closest("[data-pack-profile-club]"),
       packProfileInsert=e.target.closest("[data-pack-profile-insert]"),
       packProfileStore=e.target.closest("[data-pack-profile-sbcstore]"),
       packProfileSwap=e.target.closest("[data-pack-profile-swap]"),
       packProfileSell=e.target.closest("[data-pack-profile-sell]");
 if(packBio){const k=Number(packBio.dataset.packBio),item=pendingPack[k];if(item&&!pendingResolved.has(k))openBiography(item,-1);return;}
 if(packCompare){const k=Number(packCompare.dataset.packPriceCompare),item=pendingPack[k];if(item&&!pendingResolved.has(k))openPriceComparison(item);return;}
 if(packDirectSell){const k=Number(packDirectSell.dataset.packDirectSell),item=pendingPack[k];if(item&&!pendingResolved.has(k))openTransferOfferModal(item,{packIndex:k});return;}
 if(packTransfer){const k=Number(packTransfer.dataset.packTransferProfile);if(movePackItemToTransferList(k)){removeUiLayer("playerModal");toast("Auf Transferliste verschoben.");if(finishPackIfResolved())return;renderPackResults();renderAll()}return;}
 if(packProfileClub){const k=Number(packProfileClub.dataset.packProfileClub);removeUiLayer("playerModal");resolvePackToClub(k);return;}
 if(packProfileInsert){const k=Number(packProfileInsert.dataset.packProfileInsert);removeUiLayer("playerModal");resolvePackToSquad(k);return;}
 if(packProfileStore){const k=Number(packProfileStore.dataset.packProfileSbcstore);removeUiLayer("playerModal");resolvePackToSbcStorage(k);return;}
 if(packProfileSwap){const k=Number(packProfileSwap.dataset.packProfileSwap);removeUiLayer("playerModal");resolvePackSwapTradeable(k);return;}
 if(packProfileSell){const k=Number(packProfileSell.dataset.packProfileSell);removeUiLayer("playerModal");resolvePackSell(k);return;}
 if(marketCompare){const i=Number(marketCompare.dataset.marketPriceCompare),x=marketListings[i];if(x)openPriceComparison(marketPreviewItem(x),x.base);return;}
 if(directSell){const item=state.club.find(x=>x.uid===directSell.dataset.directSell);if(item)openTransferOfferModal(item);return;}
 if(priceCompare){const item=state.club.find(x=>x.uid===priceCompare.dataset.priceCompare);if(item)openPriceComparison(item);return;}
 if(marketBio){const i=Number(marketBio.dataset.marketBio),x=marketListings[i];if(x)openBiography(marketPreviewItem(x),-1,x.base);return;}
 if(marketBid){const i=Number(marketBid.dataset.marketBidAction);if(bidMarketListing(i))openMarketPlayerDetails(i);return;}
 if(marketBuy){const i=Number(marketBuy.dataset.marketBuyAction);if(buyMarketListing(i))$("playerModal").classList.remove("active");return;}
 if(marketSimilar){const i=Number(marketSimilar.dataset.marketSimilar),x=marketListings[i];if(x){$("playerModal").classList.remove("active");$("marketName").value="";if(isMomentumItem(x)){$("marketSpecialType").value="momentum";$("marketQuality").value="special"}$("marketLeague").value=x.base.league||"";updateMarketDependentFilters();if([...$("marketClub").options].some(o=>o.value===x.base.team))$("marketClub").value=x.base.team||"";$("marketPosition").value=x.overridePosition||x.base.position||"";$("marketRatingMin").value=Math.max(65,Math.min(99,listingRating(x)-3));$("marketRatingMax").value=Math.min(99,listingRating(x)+3);updateRatingUI();refreshMarket();}return;}
 if(bio){
   const item=state.club.find(x=>x.uid===bio.dataset.openBio);
   if(item)openBiography(item,Number(bio.dataset.openBioIndex));
   return;
 }
 if(cons){toast("Verbrauchs-Items werden noch erweitert.");return;}
 if(rep){
   removeUiLayer("playerModal");
   if(squadBattleStage==="preview"&&$("squadBattleModal").classList.contains("active"))replaceUiState("squad-preview",{layer:"squadBattleModal",mode:pendingMatchContext?.mode});
   else replaceUiState("view",{view:currentViewId()});
   openPicker(Number(rep.dataset.replaceSlot));
   return;
 }
 if(swap){
   removeUiLayer("playerModal");replaceUiState("squad-preview",{layer:"squadBattleModal",mode:pendingMatchContext?.mode});
   previewSwapFrom=Number(swap.dataset.previewSwapStart);refreshOpenMatchPreview();return
 }
 if(move){
   if(!removeSquadPlayer(move.dataset.moveClub,Number(move.dataset.moveClubIndex)))return;
   removeUiLayer("playerModal");
   if(squadBattleStage==="preview"&&$("squadBattleModal").classList.contains("active"))replaceUiState("squad-preview",{layer:"squadBattleModal",mode:pendingMatchContext?.mode});
   else replaceUiState("view",{view:currentViewId()});
   save();renderAll();refreshOpenMatchPreview();toast("Spieler im Verein. Der Kaderplatz ist frei.");
   return;
 }
 if(ins){$("playerModal").classList.remove("active");replaceUiState("view",{view:currentViewId()});openSlotPickerForItem(ins.dataset.insertItem);return;}
 if(tl){
   const changed=toggleTransferList(tl.dataset.transferlist);
   const item=state.club.find(x=>x.uid===tl.dataset.transferlist);
   if(item){
     const idx=state.squad.indexOf(item.uid);
     openPlayerDetails(item,idx>=0?idx:null);
   }
   if(changed)toast(isOnTransferList(tl.dataset.transferlist)?"Zur Transferliste hinzugefügt.":"Von Transferliste entfernt.");
   return;
 }
 if(market){
   const item=state.club.find(x=>x.uid===market.dataset.searchMarket);
   const b=item?displayBase(item):null;
   $("playerModal").classList.remove("active");
   if(b){
     replaceUiState("view",{view:"marketView"});
     switchView("marketView",{push:false});
     $("marketName").value=b.name||"";
     $("marketLeague").value=b.league||"";
     updateMarketDependentFilters();
     if([...$("marketClub").options].some(o=>o.value===b.team))$("marketClub").value=b.team||"";
     if([...$("marketNation").options].some(o=>o.value===b.nation))$("marketNation").value=b.nation||"";
     $("marketPosition").value=b.position||"";
     $("marketRatingMin").value=Math.max(65,Math.min(99,Number(b.ovr||65)-5));
     $("marketRatingMax").value=Math.min(99,Number(b.ovr||99)+5);
     updateRatingUI();
     refreshMarket();
   }
   return;
 }
});
let dragState=null;
function clearDropTargets(){document.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'))}
function squadDragElement(e){return e.target.closest('#pitch [data-slot],#bench [data-slot],#reserve [data-slot]')}
function startSquadPointer(e){
 const slot=squadDragElement(e);if(!slot)return;
 const from=Number(slot.dataset.slot),item=squadItems()[from];if(!item)return;
 dragState={from,startX:e.clientX,startY:e.clientY,active:false,source:slot,ghost:null,lastTarget:null,pointerId:e.pointerId,drawerHover:""};
}
function moveSquadPointer(e){
 if(!dragState||e.pointerId!==dragState.pointerId)return;
 const dx=e.clientX-dragState.startX,dy=e.clientY-dragState.startY;
 if(!dragState.active&&Math.hypot(dx,dy)>8){
  dragState.active=true;dragState.source.classList.add('drag-source');
  const g=dragState.source.querySelector('.card-shell')?.cloneNode(true);
  if(g){const wrap=document.createElement('div');wrap.className='dragghost';wrap.appendChild(g);document.body.appendChild(wrap);dragState.ghost=wrap}
 }
 if(!dragState.active)return;
 e.preventDefault();
 dragState.x=e.clientX;dragState.y=e.clientY;
 if(dragState.ghost){dragState.ghost.style.left=e.clientX+'px';dragState.ghost.style.top=e.clientY+'px'}
 updateSquadDropTarget();
 if(!dragState.scrollRaf)dragState.scrollRaf=requestAnimationFrame(squadDragAutoScroll);
}
function squadDragScroller(el){
 for(let n=el?.parentElement;n&&n!==document.body;n=n.parentElement){const oy=getComputedStyle(n).overflowY;if((oy==='auto'||oy==='scroll')&&n.scrollHeight>n.clientHeight+1)return n}
 return document.scrollingElement||document.documentElement;
}
// Finger near the top/bottom edge while dragging scrolls the page, so a bench card can reach the strikers.
function squadDragScrollSpeed(y,top,bottom){
 const zone=Math.min(110,Math.max(60,(bottom-top)*.14));
 if(y<top+zone)return-Math.ceil(22*Math.min(1,(top+zone-y)/zone));
 if(y>bottom-zone)return Math.ceil(22*Math.min(1,(y-(bottom-zone))/zone));
 return 0;
}
function squadDragAutoScroll(){
 if(!dragState?.active)return;
 dragState.scrollRaf=0;
 const scroller=dragState.scroller||(dragState.scroller=squadDragScroller(dragState.source));
 const isPage=scroller===document.scrollingElement||scroller===document.documentElement;
 const r=isPage?{top:0,bottom:window.visualViewport?.height||window.innerHeight}:scroller.getBoundingClientRect();
 const speed=squadDragScrollSpeed(dragState.y,Math.max(0,r.top),Math.min(window.innerHeight,r.bottom));
 if(!speed)return;
 const pos=()=>isPage?window.scrollY:scroller.scrollTop,before=pos();
 if(isPage)window.scrollBy(0,speed);else scroller.scrollTop+=speed;
 if(pos()===before)return;
 updateSquadDropTarget();
 dragState.scrollRaf=requestAnimationFrame(squadDragAutoScroll);
}
function updateSquadDropTarget(){
 if(!dragState)return;
 clearDropTargets();
 const el=document.elementFromPoint(dragState.x,dragState.y);
 const tab=el?.closest?.('[data-squad-drawer]');
 if(tab){
  const mode=tab.dataset.squadDrawer;
  if(mode&&dragState.drawerHover!==mode){dragState.drawerHover=mode;setSquadDrawer(mode,false)}
 }else dragState.drawerHover="";
 const target=el?.closest?.('#pitch [data-slot],#bench [data-slot],#reserve [data-slot]');
 if(target&&Number(target.dataset.slot)!==dragState.from){target.classList.add('drop-target');dragState.lastTarget=target}else dragState.lastTarget=null;
}
function endSquadPointer(e){
 if(!dragState||e.pointerId!==dragState.pointerId)return;
 const d=dragState;
 if(d.active){
  suppressSquadClick=true;
  const target=d.lastTarget||document.elementFromPoint(e.clientX,e.clientY)?.closest?.('#pitch [data-slot],#bench [data-slot],#reserve [data-slot]');
  if(target){
   const to=Number(target.dataset.slot);
   if(Number.isInteger(to)&&to!==d.from){const tmp=state.squad[to];state.squad[to]=state.squad[d.from];state.squad[d.from]=tmp;save();renderAll();toast(to>=18?'In Reserve verschoben.':to>=11?'Auf die Bank verschoben.':'Spieler getauscht.')}
  }
 }
 if(d.scrollRaf)cancelAnimationFrame(d.scrollRaf);
 d.source?.classList.remove('drag-source');d.ghost?.remove();clearDropTargets();dragState=null;
}
document.addEventListener('pointerdown',e=>{if(squadDragElement(e))startSquadPointer(e)},{passive:true});
document.addEventListener('pointermove',moveSquadPointer,{passive:false});
document.addEventListener('pointerup',endSquadPointer);
document.addEventListener('pointercancel',endSquadPointer);
document.querySelector('.squad-drawer-tabs')?.addEventListener('click',e=>{const b=e.target.closest('[data-squad-drawer]');if(!b)return;setSquadDrawer(b.dataset.squadDrawer,true)});
$("reserve")?.addEventListener("click",squadClick);


function weightedPlayer(min,max){
 const pool=PLAYERS.filter(p=>p.ovr>=min&&p.ovr<=max);if(!pool.length)return null;let total=0;const weights=pool.map(p=>{const w=Math.pow(1.62,Math.max(0,max-p.ovr));total+=w;return w});let r=Math.random()*total;for(let i=0;i<pool.length;i++){r-=weights[i];if(r<=0)return pool[i]}return pool[pool.length-1]
}
function promoWindowKey(now=new Date(),hour=19){const p=berlinParts(now),boundary=berlinInstant(p.year,p.month,p.day,hour);return sbcDateKey(new Date(now)<boundary?berlinShiftDays(boundary,-1,hour):boundary)}
function nextPromoReset(now=new Date(),hour=19){const p=berlinParts(now),boundary=berlinInstant(p.year,p.month,p.day,hour);return new Date(now)<boundary?boundary:berlinShiftDays(boundary,1,hour)}
function promoUsage(pack){if(!pack?.dailyLimit)return{used:0,remaining:Infinity,key:""};state.packLimits=state.packLimits||{};const key=promoWindowKey(new Date(),pack.resetHour??19),cur=state.packLimits[pack.id];if(!cur||cur.key!==key){state.packLimits[pack.id]={key,count:0};save()}const used=Number(state.packLimits[pack.id]?.count||0);return{used,remaining:Math.max(0,pack.dailyLimit-used),key}}
function consumePromoPurchase(pack){if(!pack?.dailyLimit)return true;const u=promoUsage(pack);if(u.remaining<=0)return false;state.packLimits[pack.id]={key:u.key,count:u.used+1};return true}
function packChanceLabel(v){if(!v)return"0 %";return `${(v*100).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} %`}
// Scheduled 19:00 shop drops. A dated release overrides the normal daily promo rotation for that 19:00-to-19:00 window.
const PROMO_PACK_RELEASES=Object.freeze({
 "2026-10-05":{startsAt:"2026-10-05T19:00:00+02:00",ids:["ultimate","jumbo-rare","rare-mixed","mega"]},
 "2026-10-07":{startsAt:"2026-10-07T19:00:00+02:00",ids:["ultimate","jumbo-rare"]},
 "2026-10-10":{startsAt:"2026-10-10T19:00:00+02:00",extraIds:["83x15","84x10"]}
});
function promoPackReleaseForKey(key){return PROMO_PACK_RELEASES[String(key||"")]||null}
function promoPackReleaseLabel(release){return [...(release?.ids||[]),...(release?.extraIds||[])].map(id=>PACKS.find(p=>p.id===id)?.name||id).join(" · ")}
function activePromoPacks(now=new Date()){const key=promoWindowKey(now,19),cycle=hashNum(key)%3,sets=[["goldplayers","electrum","raremixed"],["mixed6","primegold","electrum"],["goldplayers","mixed6","primegold"]],release=promoPackReleaseForKey(key),ids=release?.ids||sets[cycle]||sets[0];return [...(typeof HALLOWEEN_EVENT!=="undefined"&&eventPackIsActive(HALLOWEEN_EVENT,now.getTime())?["halloween-pack"]:[]),...ids,...(release?.extraIds||[])].map(id=>PACKS.find(p=>p.id===id)).filter(Boolean)}
function activeStorePacks(){return [...PACKS.filter(p=>p.store&&!p.rotation),...activePromoPacks()]}
function packCompositionText(p){if(!Array.isArray(p.composition))return p.type==="gold"?"Gold-Spieler":`${p.count} Spieler`;return p.composition.map(x=>`${x.count} ${x.quality==="gold"?"Gold":x.quality==="silver"?"Silber":"Bronze"}`).join(" · ")}
const STORE_PACK_ART={"halloween-pack":"./assets/footera/events/halloween/pack-halloween.webp",bronze:"./assets/footera/bronze.webp",silver:"./assets/footera/silber.webp",gold:"./assets/footera/gold.webp",[FOUNDER_PACK_ID]:"./assets/footera/founder-pack.svg",[MARCO_FOUNDER_PACK_ID]:"./assets/footera/founder-marco-pack.svg",[NIKLAS_FOUNDER_PACK_ID]:"./assets/footera/founder-niklas-pack.svg"};
function packArtSrc(id){return STORE_PACK_ART[id]||"./assets/footera/promo.webp"}
// Packs share one artwork, so a tier badge and a Gold/Silber/Bronze bar tell them apart at a glance.
function storePackParts(p){
 if(Array.isArray(p.composition))return p.composition.map(x=>({quality:x.quality,count:Number(x.count)||0})).filter(x=>x.count>0);
 const quality=p.type==="gold"||p.type==="silver"||p.type==="bronze"?p.type:"";
 return quality?[{quality,count:Number(p.count)||0}]:[]
}
function storePackTier(p){
 if(p.eventSlot)return{id:"halloween",label:"HALLOWEEN"};
 const kinds=new Set(storePackParts(p).map(x=>x.quality));
 if(kinds.size>=3)return{id:"mixed",label:"MIX"};
 if(kinds.size===2&&kinds.has("gold")&&kinds.has("silver"))return{id:"electrum",label:"ELECTRUM"};
 if(kinds.size===1){const q=[...kinds][0];return{id:q,label:q==="gold"?"GOLD":q==="silver"?"SILBER":"BRONZE"}}
 return{id:"mixed",label:"MIX"}
}
function storePackMixHTML(p){
 const parts=storePackParts(p);if(!parts.length)return"";
 const name={gold:"Gold",silver:"Silber",bronze:"Bronze"};
 return `<div class="store-mix" aria-label="${esc(packCompositionText(p))}">${p.eventSlot?'<i class="halloween" style="flex:1.6">1 Halloween</i>':""}${parts.map(x=>`<i class="${x.quality}" style="flex:${x.count}">${x.count} ${name[x.quality]||""}</i>`).join("")}</div>`
}
let storeTab="promo";
let storePromoKey="";
function storeCountdown(end){const minutes=Math.max(0,Math.ceil((end-Date.now())/60000));return `${Math.floor(minutes/60)} Std. ${minutes%60} Min.`}
function updateStoreCountdown(){document.querySelectorAll("#storeView [data-store-ends]").forEach(el=>{el.textContent=`Endet in ${storeCountdown(Number(el.dataset.storeEnds))}`})}
setInterval(()=>{if(currentViewId()==="storeView"){if(storeTab==="promo"&&promoWindowKey(new Date(),19)!==storePromoKey)renderStore();else updateStoreCountdown()}},60000);
function generatePack(id,tradeable=true){
 const founderRule=founderRuleForPack(id);
 if(founderRule)return ownsFounderRule(state,founderRule)&&Number(state.packs[id]||0)===1&&!state[founderRule.claimed]&&!state.club.some(i=>i.pid===founderRule.playerId)&&!pendingPack.some(i=>i.pid===founderRule.playerId)?[founderRule.create()]:[];
 if(id==="totw-reward"){
  const entries=activeTotwWeek()?liveTotwTeamEntries():[];if(!entries.length)return[];
  const source=entries[Math.floor(Math.random()*entries.length)];
  return[{...source.item,uid:uid(),tradeable,acquired:Date.now()}]
 }
 const p=PACKS.find(x=>x.id===id);
 if(!p)return[];
 if(p.recipientSaveId)return generateMarcoSurprisePack(p);
 // Shared audited distribution: draws and published percentage figures use one algorithm.
 // Do not silently fall back to a different random engine if the disclosure module is missing.
 if(typeof FooteraPackOdds==="undefined"||!FooteraPackOdds?.draw)return[];
 if(p.eventSlot)return generateEventSlotPack(p,tradeable);
 const chosen=FooteraPackOdds.draw(p,PLAYERS,{icons:MID_ICON_BASES,random:Math.random});
 if(!chosen.available||chosen.items.length!==p.count)return[];
 const arr=chosen.items.map(entry=>entry.icon?makeMidIconItem(entry.base,tradeable):makeLivePackItem(entry.base,tradeable));
 let rareNeed=Math.max(0,Number(p.rareCount||0)-arr.filter(i=>!!i.variant||isCardRare(displayBase(i),i)).length);
 const candidates=arr.map((i,idx)=>({i,idx})).filter(x=>!x.i.variant&&!isCardRare(displayBase(x.i),x.i)).sort(()=>Math.random()-.5);
 for(const x of candidates.slice(0,rareNeed))x.i.rare=true;
 return arr;
}
// Event packs: one guaranteed event card (each roster card equally likely, shown in the odds) plus the normal weighted draw.
function eventSlotDrawPack(p){return{...p,count:p.count-1,eventSlot:null}}
function generateEventSlotPack(p,tradeable=true){
 const event=EVENT_PROMO_RELEASES.find(e=>e.id===p.eventSlot);if(!event||!eventRosterReady(event))return[];
 const info=event.players[Math.floor(Math.random()*event.players.length)],base=eventResolveBase(info,0,event.id);P_BY_ID.set(String(base.id),base);
 const special=makePromoPackItem(base,{event,info},tradeable);if(!special)return[];
 const rest=FooteraPackOdds.draw(eventSlotDrawPack(p),PLAYERS.filter(x=>!event.players.some(i=>String(i.pid)===String(x.id))),{icons:MID_ICON_BASES,random:Math.random});
 if(!rest.available||rest.items.length!==p.count-1)return[];
 const arr=rest.items.map(entry=>entry.icon?makeMidIconItem(entry.base,tradeable):makeLivePackItem(entry.base,tradeable));
 const rareNeed=Math.max(0,Number(p.rareCount||0)-arr.filter(i=>!!i.variant||isCardRare(displayBase(i),i)).length);
 for(const x of arr.filter(i=>!i.variant&&!isCardRare(displayBase(i),i)).sort(()=>Math.random()-.5).slice(0,rareNeed))x.rare=true;
 return[special,...arr]
}
function generateMarcoSurprisePack(pack){
 if(state.profile?.saveId!==pack.recipientSaveId||Number(state.packs[pack.id]||0)!==1)return[];
 const henry=MID_ICON_BASES.find(p=>p.futwizId==="1625"),matthaus=MID_ICON_BASES.find(p=>p.futwizId==="238435"),olise=P_BY_ID.get("247827");
 if(!henry||!matthaus||!olise)return[];
 const fixed=[makeMidIconItem(henry,true),makeMidIconItem(matthaus,true),makeMomentumItem(olise,true,MOMENTUM_EVENT)];
 if(fixed.some(item=>!item))return[];
 const guaranteedIds=new Set(fixed.map(item=>String(item.pid)));
 const random=generatePack("goldplayers",true).filter(item=>!guaranteedIds.has(String(item.pid))).slice(0,9);
 if(random.length!==9)return[];
 return [...fixed,...random]
}
function renderStore(){
 const promo=storeTab==="promo",reset=nextPromoReset(new Date(),19);
 storePromoKey=promoWindowKey(new Date(),19);
 for(const tab of document.querySelectorAll("#storeView [data-store-tab]")){const active=tab.dataset.storeTab===storeTab;tab.classList.toggle("active",active);tab.setAttribute("aria-selected",String(active))}
 const todayRelease=promoPackReleaseForKey(sbcDateKey(new Date()));
 $("storeContext").textContent=promo?(todayRelease&&Date.now()<Date.parse(todayRelease.startsAt)?`Heute ab 19:00 Uhr: ${promoPackReleaseLabel(todayRelease)}.`:"Limitierte Packs · Wechsel täglich um 19:00 Uhr."): "Bronze, Silber und Gold · dauerhaft erhältlich.";
 const purch=promo?activePromoPacks():PACKS.filter(p=>p.store&&!p.promo&&!p.rotation);
 $("packGrid").innerHTML=purch.map(p=>{
  const lim=promoUsage(p),sold=lim.remaining<=0,packArt=packArtSrc(p.id);
  const verifiedLive=typeof window!=="undefined"?window.FooteraPaidWallet?.liveState?.():null;
  const livePackReady=typeof window!=="undefined"&&window.FOOTERA_LIVE_PACK_STORE_ENABLED===true &&
    document.documentElement.dataset.footeraPayments==="enabled" &&
   ["silver","gold"].includes(p.id)&&verifiedLive?.verified&&
   verifiedLive.balance>=Number(p.points||0);
  const liveBuy=livePackReady?`<button type="button" class="store-buy-button points"
   data-buy-live="${esc(p.id)}"><span class="store-price">${currencyAmountHTML("points",p.points)}
   </span><strong>Gekaufte Points</strong></button>`:"";
  const button=(currency,label)=>p[currency]==null?"":`<button type="button" class="store-buy-button ${currency}" data-buy="${esc(p.id)}" data-cur="${currency}" aria-label="${esc(p.name)} für ${fmt(p[currency])} ${label} kaufen" ${sold?"disabled":""}><span class="store-price">${currencyAmountHTML(currency,p[currency],"store-currency")}</span><strong>Kaufen</strong></button>`;
  const tier=storePackTier(p);
  return `<article class="store-pack ${sold?"soldout":""} ${p.eventSlot?"event-pack halloween-pack":""}" data-pack-kind="${esc(p.packKind||"standard")}" data-pack-tier="${tier.id}">
   <div class="store-pack-art"><img src="${packArt}" alt="${esc(p.name)}: Footera-Pack ohne Krone" loading="lazy"><span class="store-pack-badge ${tier.id}">${tier.label}</span></div>
   <div class="store-pack-content"><div class="store-pack-heading"><h3>${esc(p.name)}</h3>${promo?`<span class="store-time" data-store-ends="${reset.getTime()}"></span>`:""}</div>
   ${p.eventSlot?`<span class="store-pack-promise event">1× HALLOWEEN garantiert</span>`:""}${p.guarantee?`<span class="store-pack-promise">mind. 1× ${p.guarantee}+</span>`:""}
   <div class="store-pack-features"><span><b>${p.count}</b> Spieler</span>${p.rareCount?`<span>${p.rareCount} selten</span>`:""}${p.chemBoostSlots?.slots&&Number(p.chemBoostSlots.chance)===1?`<span>${p.chemBoostSlots.slots} Chemie-Boosts garantiert</span>`:""}</div>
   ${storePackMixHTML(p)}
   <p>${esc(p.desc||"")}</p>
   ${promo?`<div class="store-pack-limit">${sold?"Limit erreicht":`${lim.remaining} von ${p.dailyLimit} Käufen übrig`}</div>`:""}
   <button type="button" class="store-odds-trigger" data-pack-odds="${esc(p.id)}" aria-label="Wahrscheinlichkeiten für ${esc(p.name)} ansehen">ⓘ Wahrscheinlichkeiten</button>
   <div class="store-pack-prices ${p.points==null?"coins-only":""}">${button("coins","Footera Coins")}${button("points","Footera Points")}${liveBuy}</div>
   </div></article>`
 }).join("");
 updateStoreCountdown();
 const owned=PACKS.filter(p=>(state.packs[p.id]||0)>0&&(!p.recipientSaveId||state.profile?.saveId===p.recipientSaveId)&&(!founderRuleForPack(p.id)||ownsFounderRule(state,founderRuleForPack(p.id))));$("ownedPacks").innerHTML=owned.length?owned.map(p=>`<div class="owned-pack-row ${founderRuleForPack(p.id)?`founder-pack-row${p.id===MARCO_FOUNDER_PACK_ID?" founder-pack-rangers":p.id===NIKLAS_FOUNDER_PACK_ID?" founder-pack-worms":""}`:""}"><img class="owned-pack-art" src="${packArtSrc(p.id)}" alt="" loading="lazy"><div><strong>${esc(p.name)}</strong><small>${state.packs[p.id]} vorhanden · ${esc(p.desc||'')}</small></div><button type="button" class="owned-odds-trigger" data-pack-odds="${esc(p.id)}" aria-label="Inhalt und Wahrscheinlichkeiten für ${esc(p.name)} ansehen">Chancen</button><button class="primary" data-owned="${p.id}">Öffnen</button></div>`).join(""):'<div class="online-note">Keine ungeöffneten Reward-Packs vorhanden.</div>';
 {const n=owned.reduce((sum,p)=>sum+(state.packs[p.id]||0),0),badge=$("storeMyPacksCount");if(badge){badge.textContent=String(n);if(badge.dataset)badge.dataset.count=String(n)}}
}

let footeraLiveRecoveryBusy=false,footeraLiveCheckoutBusy=false;
// Server-verified LIVE pack contents are immutable across browser restarts.
// They remain non-tradeable and cannot be quick-sold, put in SBCs or evolved
// until server-side disposition/market/Evolution reconciliation is implemented.
function footeraLiveCardItem(card){
 const uid=String(card?.card_id||""),pid=String(card?.player_id||"");
 const snap=card?.card_snapshot;
 if(!/^[a-f0-9-]{36}$/i.test(uid)||!pid||!snap||
    String(snap.uid||"")!==uid||String(snap.pid||"")!==pid||
    snap.tradeable!==false||snap.acquisitionSource!=="stripe-live")return null;
 const item={...snap,uid,pid,tradeable:false,acquisitionSource:"stripe-live",
  paidSpendId:String(card.spend_id||"")};
 return displayBase(item)?item:null;
}
async function recoverFooteraLiveCards(){
 if(footeraLiveRecoveryBusy||footeraLiveCheckoutBusy||!state.onboarded||
    PLAYERS.length<DB_MIN_PLAYERS||!window.FooteraPaidWallet?.fetchLiveCards)return;
 if(!window.FooteraPaidWallet.liveState()?.verified)return;
 footeraLiveRecoveryBusy=true;
 try{
  const cards=await window.FooteraPaidWallet.fetchLiveCards();
  if(!window.FooteraPaidWallet.liveState()?.verified)return;
  const claims=state.livePaidCardClaims||(state.livePaidCardClaims={});
  const known=new Set([...(state.club||[]),...(pendingPack||[]),
    ...(state.sbcStorage||[])].map(i=>String(i.uid||"")));
  let recovered=0;
  for(const card of cards){
   const id=String(card?.card_id||"");
   if(!id||claims[id])continue;
   if(known.has(id)){claims[id]=String(card.spend_id||"");continue}
   const item=footeraLiveCardItem(card);
   if(!item)continue; // missing base catalogue: never lose/acknowledge receipt
   state.club.push(item);claims[id]=String(card.spend_id||"");known.add(id);recovered++;
  }
  if(recovered){
   save();flushSave();renderAll();
   toast(recovered+" servergesicherte Echtgeldkarte"+(recovered===1?"":"n")+" wiederhergestellt.");
  }
 }catch(error){console.warn("Echtgeldkarten konnten nicht wiederhergestellt werden",error)}
 finally{footeraLiveRecoveryBusy=false}
}
if(typeof window!=="undefined"&&typeof window.addEventListener==="function")window.addEventListener("footera:live-wallet-updated",()=>{
 if(!footeraLiveCheckoutBusy)recoverFooteraLiveCards().catch(console.warn);
});
let footeraStorePurchaseBusy=false;
function recoverFooteraPaidPackOrders(orders,userId){
 if(localStorage.getItem("footera-cloud-owner")!==userId||!Array.isArray(orders))return;
 state.paidPackClaims=state.paidPackClaims||{};
 let recovered=0;
 for(const order of orders){
  const p=PACKS.find(x=>x.id===order?.pack_id),id=String(order?.id||"");
  if(!p||!p.store||p.points==null||p.points!==Number(order.points_cost))continue;
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)||state.paidPackClaims[id])continue;
  state.paidPackClaims[id]=p.id;
  state.packs[p.id]=(state.packs[p.id]||0)+1;
  recovered++;
 }
 if(recovered){save();flushSave();if(currentViewId()==="storeView")renderStore();
  toast(recovered===1?"Bezahltes Pack im Store gutgeschrieben.":recovered+" bezahlte Packs im Store gutgeschrieben.");}
}

$("storeView").addEventListener("click",async event=>{
 const button=event.target.closest("[data-buy-live]");if(!button)return;
 if(footeraLiveCheckoutBusy||footeraStorePurchaseBusy)return;
 if(window.FOOTERA_LIVE_PACK_STORE_ENABLED!==true || document.documentElement.dataset.footeraPayments!=="enabled")return;
 const id=button.dataset.buyLive,pack=PACKS.find(p=>p.id===id);
 if(!pack||!["silver","gold"].includes(id)||pendingPack.length)return;
 if(!confirm("Für "+fmt(pack.points)+" verifizierte gekaufte Footera Points "+pack.name+" öffnen?"))return;
 footeraLiveCheckoutBusy=true;button.disabled=true;
 try{
  const purchase=await window.FooteraPaidWallet.spendLivePack(id);
  const items=purchase.cards.map(footeraLiveCardItem);
  if(items.length!==pack.count||items.some(x=>!x))
   throw Error("Karten nicht vollständig geladen. Kaufbeleg wird erneut geprüft.");
  state.livePaidCardClaims=state.livePaidCardClaims||{};
  for(const card of purchase.cards)state.livePaidCardClaims[card.card_id]=card.spend_id;
  openPack(id,items);renderWallet();
 }catch(error){toast(error?.message||"Packkauf noch nicht abgeschlossen.");}
 finally{footeraLiveCheckoutBusy=false;button.disabled=false}
});
$("storeView").addEventListener("click",async e=>{const tab=e.target.closest("[data-store-tab]");if(tab){storeTab=tab.dataset.storeTab;renderStore();return}const b=e.target.closest("[data-buy]");
if(b){
 if(footeraStorePurchaseBusy)return toast("Ein Points-Kauf wird bereits bearbeitet.");
 const p=PACKS.find(x=>x.id===b.dataset.buy),cur=b.dataset.cur;
 if(!p||!activeStorePacks().some(x=>x.id===p.id)||!["coins","points"].includes(cur)||p[cur]==null)return;
 const price=p[cur],lim=promoUsage(p);
 if(p.dailyLimit&&lim.remaining<=0)return toast("Promo-Limit erreicht. Reset täglich um "+(p.resetHour??19)+":00 Uhr.");
 const usingServer=cur==="points"&&Number(state.points||0)<price;
 if(usingServer){
  if(!window.FooteraPaidWallet?.ready()){
   if(!(await window.FooteraPaidWallet?.refresh?.()))return toast("Serverguthaben konnte nicht geladen werden. Bitte erneut versuchen.");
  }
  if(window.FooteraPaidWallet.paidBalance()<price)
   return openFooteraPointsOverview(price,p.name,Math.max(Number(state.points||0),window.FooteraPaidWallet.paidBalance()));
 }else if(state[cur]<price)return toast("Nicht genügend Guthaben.");
 const items=generatePack(p.id);
 if(items.length!==p.count)return toast("Für dieses Pack konnten nicht alle Spieler erzeugt werden. Es wurde kein Guthaben abgezogen.");
 if(!usingServer){
  if(!consumePromoPurchase(p))return toast("Promo-Limit erreicht.");
  state[cur]-=price;save();renderWallet();renderStore();openPack(p.id,items);return;
 }
 footeraStorePurchaseBusy=true;b.disabled=true;
 try{
  const purchase=await window.FooteraPaidWallet.spend(p.id);
  if(state.paidPackClaims?.[purchase.request_id]!==p.id||!(state.packs[p.id]>0)){
   toast("Bezahltes Pack wird im Store wiederhergestellt.");
   await window.FooteraPaidWallet.refresh();
   return;
  }
  if(!consumePromoPurchase(p)){
   toast("Bezahltes Pack liegt unter Meine Packs bereit (Tageslimit erreicht).");
   renderStore();return;
  }
  state.packs[p.id]--;
  save();flushSave();renderWallet();renderStore();openPack(p.id,items);
 }catch(err){
  console.warn("Footera bezahltes Pack:",err);
  toast(String(err?.message||"Kauf fehlgeschlagen.").slice(0,150));
  window.FooteraPaidWallet?.refresh().catch(console.warn);
 }finally{footeraStorePurchaseBusy=false;b.disabled=false}
 return;
}
const o=e.target.closest("[data-owned]");if(o){const id=o.dataset.owned;if((state.packs[id]||0)<1)return;const rule=founderRuleForPack(id);if(rule&&(!ownsFounderRule(state,rule)||state.club.some(i=>i.pid===rule.playerId)||pendingPack.some(i=>i.pid===rule.playerId)))return;const entitlement=state.rewardPackQueue?.find(x=>x.id===id),items=generatePack(id,entitlement?.tradeable??true);if(!items.length)return toast("Für dieses Pack konnten keine Spieler erzeugt werden.");state.packs[id]--;if(rule)state[rule.opening]=true;if(entitlement)state.rewardPackQueue.splice(state.rewardPackQueue.indexOf(entitlement),1);save();openPack(id,items);if(rule)flushSave()}})
let pendingResolved=new Set(state.pendingResolved);
function openPack(id,prepared){const items=prepared||generatePack(id),founder=items?.find(isFounderItem),rule=founderRuleForPack(id);if(founder&&(!rule||founder.pid!==rule.playerId||!state[rule.opening]||!ownsFounderRule(state,rule)||state.club.some(i=>i.pid===rule.playerId)||items.length!==1))return toast("Founder Pack nicht verfügbar.");if(rule&&!founder)return toast("Founder Pack nicht verfügbar.");if(!items.length)return toast("Für dieses Pack konnten keine Spieler erzeugt werden.");pendingPack=items;pendingResolved=new Set();state.pendingChemBoosts=typeof FooteraChemBoosts!=="undefined"?FooteraChemBoosts.rollPack(PACKS.find(p=>p.id===id),Math.random,uid):[];if(!pendingPack.length)return toast("Für dieses Pack konnten keine Spieler erzeugt werden.");state.pendingPack=pendingPack;state.pendingResolved=[];ensureObjectiveWindows();state.stats.packs=(state.stats.packs||0)+1;save();if(typeof flushSave==="function")flushSave();updateObjectiveIndicators();const opening=$("opening"),name=PACKS.find(p=>p.id===id)?.name||"Pack";opening.className="opening active";$("openStage").style.display="block";$("reveal").classList.remove("active");$("revealCard").innerHTML="";$("revealSecondCard").innerHTML="";resetBoardIntro();resetWalkoutTunnel();$("bigPack").classList.remove("pulse");$("bigPackArt").src=packArtSrc(id);$("bigPackArt").alt=name;$("bigPackName").textContent=name;$("packCountdown").textContent="";$("openPackBtn").style.display="inline-block";$("openPackBtn").disabled=false}
function packIsSpecial(item){return !!item&&(item.variant==="special"||item.variant==="icon-mid")}
function packRevealTheme(item){
 if(item?.variant==="icon-mid")return"icon";
 if(item?.variant!=="special")return"gold";
 const type=String(item.eventType||""),name=String(item.eventName||"");
 return /^totw/i.test(type)||/^(team of the week|team der woche|totw)\b/i.test(name)?"totw":"special"
}
function packIsWalkout(item){
 if(!item)return false;
 if(item.variant==="icon-mid")return true;
 return item.variant==="special"?itemRating(item)>=84:itemRating(item)>=86
}
function packWalkoutPriority(item){const theme=packRevealTheme(item);return theme==="icon"?0:theme==="gold"?2:1}
// Better cards build more tension: every tunnel stage and the final hold get
// longer with the rating (gold 86 x1.3 up to icons x1.8).
function packRevealPace(item,mode){
 const r=itemRating(item),theme=packRevealTheme(item);
 if(mode==="board")return 1.15;
 if(isFounderItem(item))return 1.7;
 if(theme==="icon")return 1.8;
 const pace=theme==="gold"?(r>=90?1.75:r>=88?1.5:1.3):1.3+Math.max(0,Math.min(.4,(r-84)*.05));
 return mode==="double"?Math.max(1.6,pace):pace
}
function packRevealPlan(){
 const plan=packRevealPlanBase();
 if(plan.mode!=="plain"&&plan.cards[0])plan.pace=packRevealPace(plan.cards[0],plan.mode);
 return plan
}
function packRevealPlanBase(){
 const ranked=[...pendingPack].sort((a,b)=>itemRating(b)-itemRating(a));
 if(ranked.length===1&&isFounderItem(ranked[0]))return{mode:"walkout",cards:ranked,label:"FOOTERA FOUNDER",duration:5600};
 // Order double walkouts: ICONS, special cards of 84+, then gold cards of 86+.
 const walkouts=ranked.filter(packIsWalkout).sort((a,b)=>packWalkoutPriority(a)-packWalkoutPriority(b)||itemRating(b)-itemRating(a));
 if(walkouts.length>=2)return{mode:"double",cards:walkouts.slice(0,2),label:"DOUBLE WALKOUT",duration:5900};
 if(walkouts.length){
  const first=walkouts[0],theme=packRevealTheme(first);
  if(theme==="gold")return{mode:"walkout",cards:[first],label:"WALKOUT",duration:5200};
  return{mode:"special",cards:[first],label:theme==="icon"?"ICON":totwDisplayName(first.eventName||"SPEZIALKARTE").toUpperCase(),duration:4700}
 }
 const best=ranked[0]||null;
 // Special cards below 84 get the regular short board, never the full tunnel.
 if(best&&(packIsSpecial(best)||itemRating(best)>=83))return{mode:"board",cards:[best],label:"",duration:2350};
 return{mode:"plain",cards:best?[best]:[],label:"HÖCHSTE KARTE",duration:1250}
}
function finishPack(){
 const opening=$("opening");
 if(pendingPack.some(isFounderItem)){const item=pendingPack.find(isFounderItem),rule=founderRuleForItem(item);if(ownsFounderRule(state,rule)){if(!state.club.some(i=>i.pid===rule.playerId))state.club.push(item);item.tradeable=false;state[rule.claimed]=true;state[rule.opening]=false;state.packs[rule.packId]=0;pendingResolved.add(pendingPack.indexOf(item));state.pendingResolved=[...pendingResolved];save();flushSave()}}
 opening.className="opening";
 resetBoardIntro();
 resetWalkoutTunnel();
 opening.querySelector(".pack-fx")?.remove();
 opening.querySelector(".pack-floor-lights")?.remove();
 $("openStage").style.display="block";
 $("reveal").classList.remove("active");
 $("bigPack").classList.remove("pulse");
 $("packCountdown").textContent="";
 let sharePlan=null;try{sharePlan=pendingPack.length?packRevealPlan():null}catch(e){}
 globalThis.FooteraShare?.preparePack(sharePlan&&sharePlan.mode!=="plain"&&sharePlan.cards[0]?{item:sharePlan.cards[0],label:sharePlan.label,mode:sharePlan.mode}:null);
 renderPackResults();
 $("results").classList.add("active");
}
function packFxLayer(){
 const opening=$("opening");let fx=opening.querySelector(".pack-fx");
 if(!fx){fx=document.createElement("div");fx.className="pack-fx";opening.appendChild(fx)}
 return fx
}
function addPackFloorLights(){
 const opening=$("opening");if(opening.querySelector(".pack-floor-lights"))return;
 const x=document.createElement("div");x.className="pack-floor-lights";x.innerHTML="<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>";opening.appendChild(x)
}
function spawnPackConfetti(count=70,theme="gold"){
 const fx=packFxLayer(),palette=theme==="icon"?["#ffffff","#f2f7ff","#e2e9fc","#ffffff","#c9d7ff"]:theme==="totw"?["#ffce47","#ffed99","#fff7cf","#f3ae24","#ffffff"]:theme==="special"?["#57ffe3","#8c63ff","#ff5ad7","#ffffff","#ffd85a"]:["#d8ff3e","#ffffff","#72ffc0","#ffd85a","#7de7ff"];
 for(let i=0;i<count;i++){
  const p=document.createElement("i");p.className="pack-confetti";
  p.style.left=(Math.random()*100)+"%";p.style.background=palette[i%palette.length];
  p.style.setProperty("--dur",(2.5+Math.random()*2.2)+"s");p.style.setProperty("--delay",(Math.random()*.75)+"s");
  p.style.setProperty("--drift",((-80+Math.random()*160)|0)+"px");fx.appendChild(p)
 }
}
function spawnPackSparks(count=34){
 const fx=packFxLayer();
 for(let i=0;i<count;i++){const p=document.createElement("i");p.className="pack-spark";p.style.left=(42+Math.random()*16)+"%";p.style.top=(42+Math.random()*16)+"%";p.style.setProperty("--sx",((-180+Math.random()*360)|0)+"px");p.style.setProperty("--sy",((-170+Math.random()*250)|0)+"px");fx.appendChild(p)}
}
function showPackRevealCard(plan){
 const first=plan.cards[0],firstBase=displayBase(first);if(!first||!firstBase)return false;
 $("revealBadge").textContent=plan.label;
 $("revealCard").innerHTML=cardHTML(firstBase,first);
 $("revealSecondCard").innerHTML="";
 $("walkoutTitle").textContent=`${firstBase.name} · ${positionLabel(firstBase.position,firstBase)} · ${firstBase.team}`;
 $("reveal").classList.add("active");return true
}
function resetBoardIntro(){
 $("boardIntro").classList.remove("active");
 const cue=$("boardCue");cue.classList.remove("active");cue.innerHTML=""
}
function packRevealNationName(nation){
 const key=normalizeKey(nation);
 if(["england","scotland","wales","northern ireland"].includes(key))return nation;
 try{return new Intl.DisplayNames(["de"],{type:"region"}).of(countryCode(nation))||nationLabel(nation)}catch(e){return nationLabel(nation)}
}
function showBoardCue(kind,base){
 const cue=$("boardCue");let label,art,name;
 if(kind==="nation"){label="NATION";art=flagAsset(base);name=packRevealNationName(base.nation)}
 else if(kind==="position"){label="POSITION";art=esc(positionLabel(base.position,base));name=""}
 else{label="VEREIN";art=badgeAsset("club",base,clubShort(base.team));name=base.team||"IKONE"}
 cue.classList.remove("active");cue.innerHTML=`<div class="board-cue-label">${label}</div><div class="board-cue-art${kind==="position"?" is-position":""}">${art}</div>${name?`<div class="board-cue-name">${esc(name)}</div>`:""}`;
 void cue.offsetWidth;cue.classList.add("active")
}
function resetWalkoutTunnel(){
 $("walkoutTunnel").classList.remove("active");
 const clue=$("walkoutClue");clue.classList.remove("active");clue.innerHTML=""
}
function showWalkoutClue(kind,base){
 const clue=$("walkoutClue");let label,art,name;
 if(kind==="nation"){
  label="NATION";art=flagAsset(base);name=packRevealNationName(base.nation)
 }else if(kind==="position"){
  label="POSITION";art=esc(positionLabel(base.position,base));name=""
 }else{
  label="VEREIN";art=badgeAsset("club",base,clubShort(base.team));name=base.team||"IKONE"
 }
 clue.classList.remove("active");clue.innerHTML=`<div class="walkout-clue-label">${label}</div><div class="walkout-clue-art${kind==="position"?" is-position":""}">${art}</div>${name?`<div class="walkout-clue-name">${esc(name)}</div>`:""}`;
 void clue.offsetWidth;clue.classList.add("active")
}
async function runPackReveal(plan){
 const opening=$("opening"),reveal=$("reveal"),flash=$("flash");
 const theme=packRevealTheme(plan.cards[0]),pace=plan.pace||1;
 packRevealSkip={started:Date.now(),tunnel:false,card:false,phase:null,wake:null};
 const tunnelWait=ms=>packRevealWait(Math.round(ms*pace),"tunnel"),cardWait=ms=>packRevealWait(Math.round(ms*pace),"card");
 try{await runPackRevealSteps(plan,opening,flash,theme,tunnelWait,cardWait)}finally{packRevealSkip=null}
}
async function runPackRevealSteps(plan,opening,flash,theme,tunnelWait,cardWait){
 opening.className="opening active revealing mode-"+plan.mode+(theme==="gold"?"":" theme-"+theme)+(isMomentumItem(plan.cards[0])?" theme-momentum":isFounderItem(plan.cards[0])?` theme-founder${isMarcoFounderItem(plan.cards[0])?" theme-founder-rangers":isNiklasFounderItem(plan.cards[0])?" theme-founder-worms":""}`:"");
 $("openPackBtn").disabled=true;$("openPackBtn").style.display="none";
 opening.querySelector(".pack-fx")?.remove();opening.querySelector(".pack-floor-lights")?.remove();

 if(plan.mode==="plain"){
  $("openStage").style.display="none";
  if(!showPackRevealCard(plan)){finishPack();return}
  await cardWait(plan.duration);finishPack();return
 }

 $("bigPack").classList.add("pulse");
 if(plan.mode==="board"){
  const firstBase=displayBase(plan.cards[0]);if(!firstBase){finishPack();return}
  addPackFloorLights();
  await tunnelWait(250);
  $("openStage").style.display="none";
  $("boardIntro").classList.add("active");
  showBoardCue("nation",firstBase);await tunnelWait(850);
  showBoardCue("position",firstBase);await tunnelWait(800);
  showBoardCue("club",firstBase);await tunnelWait(1000);
  resetBoardIntro();
  $("bigPack").classList.remove("pulse");
  flash.classList.remove("go");void flash.offsetWidth;flash.classList.add("go");
  await sleep(350);
  if(!showPackRevealCard(plan)){finishPack();return}
  spawnPackSparks(22);
  await cardWait(plan.duration);finishPack();return
 }

 const firstBase=displayBase(plan.cards[0]);if(!firstBase){finishPack();return}
 addPackFloorLights();
 $("openStage").style.display="none";
 $("walkoutTunnel").classList.add("active");
 await tunnelWait(1200);
 showWalkoutClue("nation",firstBase);await tunnelWait(1000);
 showWalkoutClue("position",firstBase);await tunnelWait(900);
 showWalkoutClue("club",firstBase);await tunnelWait(1150);
 resetWalkoutTunnel();
 $("bigPack").classList.remove("pulse");
 flash.classList.remove("go");void flash.offsetWidth;flash.classList.add("go");
 spawnPackSparks(plan.mode==="double"?60:46);
 spawnPackConfetti(plan.mode==="double"?125:plan.mode==="special"?100:90,theme);
 await sleep(380);
 if(!showPackRevealCard(plan)){finishPack();return}

 if(plan.mode==="double"&&plan.cards[1]){
  await cardWait(700);
  const second=plan.cards[1],secondBase=displayBase(second);
  if(secondBase){$("revealSecondCard").innerHTML=cardHTML(secondBase,second);spawnPackConfetti(60,theme)}
 }
 if(plan.mode==="walkout"){await cardWait(700);spawnPackConfetti(55,theme)}
 if(plan.mode==="special"){await cardWait(650);spawnPackConfetti(50,theme)}
 await cardWait(Math.max(1200,plan.duration-(plan.mode==="double"?700:0)-700));
 finishPack();
}
// Tap during a reveal: the first tap skips the tunnel straight to the card,
// the next one skips the card hold to the pack results.
let packRevealSkip=null;
function packRevealWait(ms,phase){
 const skip=packRevealSkip;
 if(!skip)return sleep(ms);
 if(skip[phase])return Promise.resolve();
 return new Promise(resolve=>{skip.phase=phase;skip.wake=resolve;sleep(ms).then(resolve)})
}
function skipPackReveal(){
 const skip=packRevealSkip;if(!skip||!skip.phase||Date.now()-skip.started<400)return;
 skip[skip.phase]=true;if(skip.phase==="tunnel")skip.card=false;
 const wake=skip.wake;skip.wake=null;wake?.()
}
$("openPackBtn").addEventListener("click",async()=>{try{await runPackReveal(packRevealPlan())}catch(err){console.error("Pack reveal failed",err);finishPack();toast("Pack geöffnet. Animation wurde übersprungen.")}})
$("opening").addEventListener("click",e=>{if(!e.target.closest?.("#openPackBtn"))skipPackReveal()});
function tradeableClubTwinForPackItem(item){
 if(!item||item.tradeable)return null;
 const key=packItemKey(item),listed=new Set(state.transferList||[]);
 return (state.club||[]).find(x=>x?.tradeable&&packItemKey(x)===key&&!listed.has(x.uid)&&!(state.transferSales||[]).some(s=>String(s.uid)===String(x.uid)&&s.status==="active"))||null
}
function closeResolvedPackResults(){
 $("results").classList.remove("active");
 pendingPack=[];pendingResolved=new Set();state.pendingPack=[];state.pendingResolved=[];state.pendingChemBoosts=[];
 save();renderAll();
 globalThis.FooteraShare?.afterPack()
}
function finishPackIfResolved(){
 const unresolved=pendingPack.some((_,k)=>!pendingResolved.has(k));
 if(unresolved||(state.pendingChemBoosts||[]).length)return false;
 closeResolvedPackResults();return true
}
function packResultsRefresh(){
 if(finishPackIfResolved())return true;
 renderPackResults();renderAll();return false
}
function resolvePackToClub(k){
 const i=pendingPack[k],dup=packDuplicateMap().get(k);
 if(!i||isFounderItem(i)||pendingResolved.has(k)||dup)return false;
 if(!state.club.some(x=>x.uid===i.uid))state.club.push(i);
 pendingResolved.add(k);state.pendingResolved=[...pendingResolved];save();toast("Spieler zum Verein hinzugefügt.");
 packResultsRefresh();return true
}
function resolvePackToSquad(k){
 const i=pendingPack[k],dup=packDuplicateMap().get(k);
 if(!i||isFounderItem(i)||pendingResolved.has(k)||dup)return false;
 if(!state.club.some(x=>x.uid===i.uid))state.club.push(i);
 pendingResolved.add(k);state.pendingResolved=[...pendingResolved];save();
 const finished=finishPackIfResolved();if(!finished){renderPackResults();renderAll()}
 openSlotPickerForItem(i.uid);return true
}
function resolvePackToSbcStorage(k){
 const i=pendingPack[k],dup=packDuplicateMap().get(k);
 if(!i||isFounderItem(i)||isFooteraLiveCard(i)||pendingResolved.has(k)||!dup)return false;
 state.sbcStorage=state.sbcStorage||[];if(state.sbcStorage.length>=100){toast("SBC-Speicher voll (100/100).");return false}
 if(state.sbcStorage.some(x=>x.uid===i.uid))return false;
 // The stored card retains its original tradeability and all attributes.
 state.sbcStorage.push(i);pendingResolved.add(k);state.pendingResolved=[...pendingResolved];save();toast("Duplikat im SBC-Speicher abgelegt.");
 packResultsRefresh();return true
}
function resolvePackSwapTradeable(k){
 const incoming=pendingPack[k],dup=packDuplicateMap().get(k);
 if(!incoming||isFooteraLiveCard(incoming)||pendingResolved.has(k)||incoming.tradeable||!dup)return false;
 const existing=tradeableClubTwinForPackItem(incoming);if(!existing){toast("Keine tauschbare Vereinskarte verfügbar.");return false}
 const clubIndex=state.club.findIndex(x=>x.uid===existing.uid);if(clubIndex<0)return false;
 state.club[clubIndex]=incoming;state.squad=state.squad.map(id=>id===existing.uid?incoming.uid:id);
 (state.squadPresets||[]).forEach(p=>{if(p?.squad)p.squad=p.squad.map(id=>id===existing.uid?incoming.uid:id)});
 replaceActiveEvolutionUid(existing.uid,incoming.uid);
 pendingPack[k]=existing;state.pendingPack=pendingPack;state.pendingResolved=[...pendingResolved];save();
 toast("Getauscht: Die tauschbare Vereinskarte kann jetzt verkauft werden.");renderPackResults();renderAll();return true
}
function resolvePackSell(k){
 const i=pendingPack[k];if(!i||pendingResolved.has(k)||isFounderItem(i)||isFooteraLiveCard(i))return false;
 const duplicate=!!packDuplicateMap().get(k);
 if(i.tradeable){const value=quickSell(i);state.coins+=value;toast(`+${fmt(value)} Coins`)}
 else toast(duplicate?"Untauschbares Duplikat abgestoßen.":"Untauschbarer Spieler abgestoßen.");
 pendingResolved.add(k);state.pendingResolved=[...pendingResolved];save();packResultsRefresh();return true
}
function packSellBatch(duplicatesOnly=false){
 const dupMap=duplicatesOnly?packDuplicateMap():null;
 return pendingPack.map((i,k)=>({i,k})).filter(x=>!pendingResolved.has(x.k)&&!isFounderItem(x.i)&&!isFooteraLiveCard(x.i)&&(!duplicatesOnly||dupMap.get(x.k)))
}
function resolvePackSellBatch(duplicatesOnly=false){
 const items=packSellBatch(duplicatesOnly);if(!items.length)return false;
 const total=items.filter(x=>x.i.tradeable).reduce((sum,x)=>sum+quickSell(x.i),0),untradeable=items.filter(x=>!x.i.tradeable).length;
 const label=duplicatesOnly?"Duplikate":"verbleibenden Pack-Karten";
 const wording=untradeable?`Wirklich alle ${items.length} ${label} auflösen? ${items.length-untradeable} tauschbare Karten werden für ${fmt(total)} Coins schnellverkauft. ${untradeable} untauschbare Karten werden für 0 Coins abgestoßen.`:`Wirklich alle ${items.length} ${label} für ${fmt(total)} Coins schnellverkaufen?`;
 if(!confirm(wording))return false;
 state.coins+=total;items.forEach(x=>pendingResolved.add(x.k));state.pendingResolved=[...pendingResolved];save();toast(total?`+${fmt(total)} Coins`:"Karten abgestoßen.");
 packResultsRefresh();return true
}
function renderPackResults(){
 state.pendingResolved=[...pendingResolved];save();
 const hint=$("resultHint"),founder=pendingPack.find(isFounderItem);
 if(founder&&pendingResolved.has(pendingPack.indexOf(founder))){if(hint)hint.textContent="Founder-Karte wurde deinem Verein hinzugefügt.";$("resultGrid").innerHTML=`<section class="pack-result-section founder-result"><div class="pack-result-head"><h3>FOOTERA FOUNDER</h3><span>Einmalige Karte</span></div><div class="founder-result-card">${cardHTML(displayBase(founder),founder)}<strong>${esc(displayBase(founder)?.name||"Founder")} ist jetzt in deinem Verein.</strong></div></section>`;$("resultAllClub").style.display="none";$("resultQuickSellAll").style.display="none";$("resultQuickSellDuplicates").style.display="none";$("resultDone").textContent="Zum Verein";$("resultDone").disabled=false;$("resultDone").style.display="";return}
 const dupMap=packDuplicateMap(),normal=[],dups=[];
 pendingPack.forEach((i,k)=>{if(pendingResolved.has(k))return;(dupMap.get(k)?dups:normal).push({i,k})});
 const sortPackRows=rows=>rows.sort((a,b)=>(Number(packIsSpecial(b.i))-Number(packIsSpecial(a.i)))||(itemRating(b.i)-itemRating(a.i))||(a.k-b.k));
 sortPackRows(normal);sortPackRows(dups);
 if(hint){const total=normal.length+dups.length;hint.textContent=total?`Noch ${total} Karte${total===1?"":"n"} offen · ${normal.length} neu · ${dups.length} Duplikat${dups.length===1?"":"e"}. Profil und Transferoptionen über den jeweiligen Button öffnen.`:"Alle Pack-Karten wurden zugewiesen."}
 const card=({i,k},duplicate)=>{
  const b=displayBase(i),twin=duplicate&&!i.tradeable?tradeableClubTwinForPackItem(i):null,storeAvailable=(state.sbcStorage||[]).length<100;
  const profileAction=`<button class="primary" data-pack-open="${k}">Profil & Transferoptionen</button>`;
  const storeAction=`<button class="secondary" data-pack-sbcstore="${k}" ${storeAvailable?"":"disabled"}>${storeAvailable?"In SBC-Speicher":"SBC-Speicher voll (100/100)"}</button>`;
  const sellAction=`<button class="secondary" data-pack-sell="${k}">${i.tradeable?`Schnellverkaufen · +${fmt(quickSell(i))} Coins`:"Abstoßen"}</button>`;
  const duplicateActions=`${profileAction}${storeAction}${twin?`<button class="secondary" data-pack-swap-tradeable="${k}">Mit Vereinskarte tauschen</button>`:""}${sellAction}`;
  const normalActions=`${profileAction}<button class="secondary" data-pack-club="${k}">In den Verein</button><button class="secondary" data-pack-insert="${k}">In Mannschaft</button><button class="secondary" data-pack-sell="${k}">${i.tradeable?`Schnellverkaufen · +${fmt(quickSell(i))} Coins`:"Abstoßen"}</button>`;
  return `<div class="result-item ${duplicate?"duplicate":""}" data-result-item="${k}"><div class="pack-profile-card">${cardHTML(b,i)}</div>${duplicate?'<div class="duplicate-pill">DUPLIKAT</div>':""}<div class="result-item-actions">${duplicate?duplicateActions:normalActions}</div>${duplicate?'<div class="duplicate-note">Duplikat zuerst auflösen, bevor du fortfährst.</div>':""}</div>`
 };
 const section=(title,rows,duplicate=false)=>`<section class="pack-result-section"><div class="pack-result-head ${duplicate?"duplicate":""}"><h3>${title}</h3><span>${rows.length} Karte${rows.length===1?"":"n"}</span></div>${rows.length?`<div class="result-items-grid">${rows.map(x=>card(x,duplicate)).join("")}</div>`:'<div class="result-section-empty">Keine Karten in diesem Bereich.</div>'}</section>`;
 $("resultGrid").innerHTML=(normal.length?section("Pack-Inhalt",normal,false):"")+(dups.length?section("Duplikate",dups,true):"");
 const allSellable=packSellBatch(),duplicatesSellable=packSellBatch(true),total=allSellable.filter(x=>x.i.tradeable).reduce((sum,x)=>sum+quickSell(x.i),0),duplicateTotal=duplicatesSellable.filter(x=>x.i.tradeable).reduce((sum,x)=>sum+quickSell(x.i),0);
 $("resultAllClub").textContent="Zum Verein hinzufügen";
 $("resultAllClub").disabled=!normal.length;$("resultAllClub").style.display=normal.length?"":"none";
 $("resultQuickSellDuplicates").textContent=duplicatesSellable.length?`Duplikate schnellverkaufen / abstoßen${duplicateTotal?` · +${fmt(duplicateTotal)} Coins`:""}`:"";
 $("resultQuickSellDuplicates").disabled=!duplicatesSellable.length;$("resultQuickSellDuplicates").style.display=duplicatesSellable.length?"":"none";
 $("resultQuickSellAll").textContent=allSellable.length?`${allSellable.every(x=>!x.i.tradeable)?"Alles abstoßen":allSellable.some(x=>!x.i.tradeable)?"Alles schnellverkaufen / abstoßen":"Alles schnellverkaufen"}${total?` · +${fmt(total)} Coins`:""}`:"";
 $("resultQuickSellAll").disabled=!allSellable.length;$("resultQuickSellAll").style.display=allSellable.length?"":"none";
 $("resultDone").disabled=true;$("resultDone").style.display="none";
 if(typeof FooteraChemBoostUI!=="undefined")FooteraChemBoostUI.renderPack()
}
$("resultGrid").addEventListener("click",e=>{
 const c=e.target.closest("[data-pack-club]"),ins=e.target.closest("[data-pack-insert]"),q=e.target.closest("[data-pack-sell]"),o=e.target.closest("[data-pack-open]"),store=e.target.closest("[data-pack-sbcstore]"),tr=e.target.closest("[data-pack-transfer]"),swap=e.target.closest("[data-pack-swap-tradeable]");
 if(c){resolvePackToClub(Number(c.dataset.packClub));return}
 if(ins){resolvePackToSquad(Number(ins.dataset.packInsert));return}
 if(store){resolvePackToSbcStorage(Number(store.dataset.packSbcstore));return}
 if(tr){const k=Number(tr.dataset.packTransfer);if(movePackItemToTransferList(k)){toast("Duplikat auf die Transferliste verschoben.");packResultsRefresh()}return}
 if(swap){resolvePackSwapTradeable(Number(swap.dataset.packSwapTradeable));return}
 if(q){resolvePackSell(Number(q.dataset.packSell));return}
 if(o){const k=Number(o.dataset.packOpen);openPackPlayerDetails(k)}
});
$("resultAllClub").addEventListener("click",()=>{
 const dupMap=packDuplicateMap();let added=0;const boosts=typeof FooteraChemBoosts!=="undefined"?FooteraChemBoosts.collectAll(state):0;
 pendingPack.forEach((i,k)=>{if(!pendingResolved.has(k)&&!dupMap.get(k)&&!isFounderItem(i)){if(!state.club.some(x=>x.uid===i.uid))state.club.push(i);pendingResolved.add(k);added++}});
 if(!added&&!boosts)return;state.pendingResolved=[...pendingResolved];save();flushSave();toast(boosts?`${added} Spieler und ${boosts} Chemie-Boosts zum Verein hinzugefügt.`:added===1?"Spieler zum Verein hinzugefügt.":`${added} Spieler zum Verein hinzugefügt.`);
 packResultsRefresh()
});
$("resultQuickSellAll").addEventListener("click",()=>resolvePackSellBatch());
$("resultQuickSellDuplicates").addEventListener("click",()=>resolvePackSellBatch(true));
$("resultDone").addEventListener("click",()=>{if(!pendingPack.some((_,k)=>!pendingResolved.has(k))&&!(state.pendingChemBoosts||[]).length)closeResolvedPackResults()})

const SPECIAL_MARKET_MIN=10000,SPECIAL_START_MIN=10000,SPECIAL_QUICK_SELL=9000;
function isSpecialPricedItem(i){return !!i&&!isFounderItem(i)&&(packIsSpecial(i)||i.variant==="story"||isEvolutionItem(i))}
function quickSell(i){if(isFounderItem(i))return 0;if(isSpecialPricedItem(i))return SPECIAL_QUICK_SELL;const r=itemRating(i);return r>=90?5000:r>=85?2000:r>=80?500:r>=75?250:r>=65?150:75}
function clubFilterItems(){
 const listed=new Set(state.transferList||[]);
 return (state.club||[]).filter(i=>!listed.has(i.uid)).map(item=>{const b=displayBase(item);if(!b)return null;const a=resolvedAffiliation(b);return{item,b,a,rating:itemRating(item),positions:playerPositions(b)}}).filter(Boolean)
}
let clubFilterOptionsSignature="";
function syncClubFilterOptions(rows=clubFilterItems()){
 const leagueEl=$("clubLeague"),clubEl=$("clubClub");if(!leagueEl||!clubEl)return;
 const wantedLeague=leagueEl.value,wantedClub=clubEl.value,sourceSig=rows.map(x=>`${x.item.uid}:${x.a?.league||""}:${x.a?.team||""}`).join(";"),sig=`${AFFILIATION_CACHE_EPOCH}|${wantedLeague}|${sourceSig}`;
 if(sig===clubFilterOptionsSignature)return;
 clubFilterOptionsSignature=sig;
 const leagues=[...new Set(rows.map(x=>String(x.a?.league||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"));
 leagueEl.innerHTML='<option value="">Alle Ligen</option>'+leagues.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
 leagueEl.value=leagues.includes(wantedLeague)?wantedLeague:"";
 const activeLeague=leagueEl.value;
 const clubs=[...new Set(rows.filter(x=>!activeLeague||String(x.a?.league||"")===activeLeague).map(x=>String(x.a?.team||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"));
 clubEl.innerHTML='<option value="">Alle Vereine</option>'+clubs.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
 clubEl.value=clubs.includes(wantedClub)?wantedClub:""
}
function updateClubRatingLabel(){
 const min=Math.max(0,Math.min(99,Number($("clubRatingMin")?.value||0))),max=Math.max(0,Math.min(99,Number($("clubRatingMax")?.value||99)));
 if($("clubRatingLabel"))$("clubRatingLabel").textContent=`${min}–${max} GES`
}
const UX_COMPACT_MEDIA=window.matchMedia?.("(max-width:620px)");
let clubFiltersCollapsed=!!UX_COMPACT_MEDIA?.matches,marketFiltersCollapsed=!!UX_COMPACT_MEDIA?.matches;
function uxSelectedText(id,fallback=""){const el=$(id),opt=el?.selectedOptions?.[0];return String(opt?.textContent||fallback).trim()}
function setUxFilterPanel(panelId,toggleId,collapsed){
 const panel=$(panelId),toggle=$(toggleId);if(!panel||!toggle)return;
 panel.classList.toggle("collapsed",!!collapsed);toggle.classList.toggle("collapsed",!!collapsed);toggle.setAttribute("aria-expanded",collapsed?"false":"true")
}
function clubFilterSummaryText(){
 const parts=[],pos=$("clubPosition")?.value,rar=$("clubRarity")?.value,league=$("clubLeague")?.value,club=$("clubClub")?.value,trade=$("clubTradeability")?.value,min=Number($("clubRatingMin")?.value||0),max=Number($("clubRatingMax")?.value||99);
 if(pos)parts.push(uxSelectedText("clubPosition"));if(rar)parts.push(uxSelectedText("clubRarity"));if(league)parts.push(league);if(club)parts.push(club);if(trade)parts.push(uxSelectedText("clubTradeability"));if(min>0||max<99)parts.push(`${min}–${max} GES`);
 return parts.length?parts.join(" · "):"Alle Spieler"
}
function renderClubUx(){
 if($("clubUxPlayers"))$("clubUxPlayers").textContent=fmt((state.club||[]).length);
 if($("clubUxTransfer"))$("clubUxTransfer").textContent=fmt((state.transferList||[]).length);
 if($("clubUxSbc"))$("clubUxSbc").textContent=`${(state.sbcStorage||[]).length}/100`;
 if($("clubUxEvos"))$("clubUxEvos").textContent=`${activeEvolutionCount()}/3`;
 if($("clubFilterSummary"))$("clubFilterSummary").textContent=clubFilterSummaryText();
 setUxFilterPanel("clubFilterPanel","clubFilterToggle",clubFiltersCollapsed)
}
function marketActiveFilterList(){
 const list=[],name=String($("marketName")?.value||"").trim(),league=$("marketLeague")?.value,club=$("marketClub")?.value,nation=$("marketNation")?.value,pos=$("marketPosition")?.value,quality=$("marketQuality")?.value,type=$("marketSpecialType")?.value,min=Number($("marketRatingMin")?.value||65),max=Number($("marketRatingMax")?.value||99),pmin=Number($("marketPriceMin")?.value||0),pmax=Number($("marketPriceMax")?.value||0);
 if(name)list.push({key:"name",label:`„${name}“`});if(pos)list.push({key:"position",label:uxSelectedText("marketPosition")});if(quality!=="bronze"&&(min>65||max<99))list.push({key:"rating",label:max<99?`${min}–${max} GES`:`${min}+ GES`,panel:true});
 if(type)list.push({key:"type",label:uxSelectedText("marketSpecialType"),panel:true});if(quality)list.push({key:"quality",label:uxSelectedText("marketQuality")});if(league)list.push({key:"league",label:league,panel:true});if(club)list.push({key:"club",label:club,panel:true});if(nation)list.push({key:"nation",label:nation,panel:true});if(pmin||pmax)list.push({key:"price",label:`${pmin?fmt(pmin):"0"}–${pmax?fmt(pmax):"∞"} Coins`,panel:true});
 return list
}
function marketFilterSummaryText(){
 const parts=marketActiveFilterList().filter(f=>f.panel).map(f=>f.label);
 return parts.length?parts.join(" · "):"Liga, Verein, Preis, Nation, GES"
}
function clearMarketFilter(key){
 if(key==="name")$("marketName").value="";else if(key==="position")$("marketPosition").value="";else if(key==="rating"){$("marketRatingMin").value=65;$("marketRatingMax").value=99}
 else if(key==="type")$("marketSpecialType").value="";else if(key==="quality"){$("marketQuality").value="";if($("marketSpecialType").value!=="base")$("marketSpecialType").value=""}
 else if(key==="league"){$("marketLeague").value="";updateMarketDependentFilters();$("marketClub").value=""}else if(key==="club")$("marketClub").value="";else if(key==="nation")$("marketNation").value="";else if(key==="price"){$("marketPriceMin").value="";$("marketPriceMax").value=""}
 updateRatingUI();refreshMarket()
}
function renderMarketUx(){
 const list=marketActiveFilterList(),panelCount=list.filter(f=>f.panel).length;
 if($("marketFilterSummary"))$("marketFilterSummary").textContent=marketFilterSummaryText();
 const count=$("marketFilterCount");if(count){count.hidden=!panelCount;count.textContent=String(panelCount)}
 const pos=$("marketPosition")?.value||"";
 document.querySelectorAll("[data-market-quick-pos]").forEach(b=>{const on=b.dataset.marketQuickPos===pos;b.classList.toggle("active",on);b.setAttribute("aria-pressed",on?"true":"false")});
 document.querySelectorAll("[data-market-quick-quality]").forEach(b=>{const on=b.dataset.marketQuickQuality===($("marketQuality")?.value||"");b.classList.toggle("active",on);b.setAttribute("aria-pressed",on?"true":"false")});
 const box=$("marketActiveFilters");if(box){box.hidden=!list.length;box.innerHTML=list.length?list.map(f=>`<button type="button" data-market-clear="${f.key}" aria-label="${esc(f.label)} entfernen">${esc(f.label)}<span aria-hidden="true">×</span></button>`).join("")+(list.length>1?`<button type="button" class="market-clear-all" data-market-clear="all">Alle löschen</button>`:""):""}
 setUxFilterPanel("marketFilterPanel","marketFilterToggle",marketFiltersCollapsed)
}
$("clubFilterToggle")?.addEventListener("click",()=>{clubFiltersCollapsed=!clubFiltersCollapsed;renderClubUx()});
$("marketFilterToggle")?.addEventListener("click",()=>{marketFiltersCollapsed=!marketFiltersCollapsed;renderMarketUx()});
$("marketQuick")?.addEventListener("click",e=>{
 const pos=e.target.closest("[data-market-quick-pos]"),quality=e.target.closest("[data-market-quick-quality]"),clear=e.target.closest("[data-market-clear]");
 if(pos){$("marketPosition").value=pos.dataset.marketQuickPos;refreshMarket();return}
 if(quality){const q=quality.dataset.marketQuickQuality,t=$("marketSpecialType").value;$("marketQuality").value=q;if(q!=="special"&&t&&t!=="base")$("marketSpecialType").value="";if(q==="special"&&t==="base")$("marketSpecialType").value="";updateRatingUI();refreshMarket();return}
 if(clear){if(clear.dataset.marketClear==="all")resetMarketFilters();else clearMarketFilter(clear.dataset.marketClear)}
});
const CLUB_RENDER_BATCH=window.matchMedia?.("(max-width:560px)")?.matches?36:72;let clubRenderLimit=CLUB_RENDER_BATCH,clubRenderSignature="",clubRenderFrame=0;
function scheduleClubRender(){cancelAnimationFrame(clubRenderFrame);clubRenderFrame=requestAnimationFrame(()=>{clubRenderFrame=0;renderClub()})}
function renderClub(){
 syncClubSectionUi();renderClubUx();
 if(clubSection==="identity"){renderClubIdentity();return}
 if(clubSection==="boosts"){window.FooteraChemBoostUI?.renderInventory();return}
 const rows=clubFilterItems();syncClubFilterOptions(rows);
 const rar=$("clubRarity").value,pos=$("clubPosition").value,sort=$("clubSort").value,league=$("clubLeague").value,club=$("clubClub").value,trade=$("clubTradeability")?.value||"",min=Number($("clubRatingMin")?.value||0),max=Number($("clubRatingMax")?.value||99);
 updateClubRatingLabel();
 let arr=rows.filter(x=>(!rar||pickerItemQuality(x.item,x.b)===rar)&&(!pos||x.positions.includes(pos))&&(!league||String(x.a?.league||"")===league)&&(!club||String(x.a?.team||"")===club)&&(!trade||(trade==="tradeable"?!!x.item.tradeable:!x.item.tradeable))&&x.rating>=min&&x.rating<=max);
 arr.sort((a,b)=>{if(sort==="new")return Number(b.item.acquired||0)-Number(a.item.acquired||0);if(sort==="old")return Number(a.item.acquired||0)-Number(b.item.acquired||0);if(sort==="rating-asc")return a.rating-b.rating;return b.rating-a.rating});
 const signature=[rar,pos,sort,league,club,trade,min,max,rows.length,(state.transferList||[]).length].join("|");if(signature!==clubRenderSignature){clubRenderSignature=signature;clubRenderLimit=CLUB_RENDER_BATCH}
 const shown=arr.slice(0,clubRenderLimit);
 $("clubGrid").innerHTML=shown.map(x=>{const i=x.item,b=x.b,ps=parsePlayStyles(b,i);return`<div class="item club-item"><button class="club-card-preview" data-club-open="${i.uid}" aria-label="${esc(b.name)} öffnen">${cardHTML(b,i,false,null,false)}${i.tradeable?"":'<span class="club-untradeable-badge" title="Untauschbar" aria-label="Untauschbar"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span>'}</button><h4>${esc(b.name)}</h4><p>${i.tradeable?"Tauschbar":"Untauschbar"} · ${esc(b.team)}</p>${inlineMetaHTML(b)}<div class="playstyle-line">${ps.length?ps.map(p=>`<span class="ps ${p.plus?"plus":""}">${esc(p.name)}${p.plus?"+":""}</span>`).join(""):'<span class="ps">Keine PS-Daten</span>'}</div><div class="itemactions"><button class="secondary" data-insert-item="${i.uid}">In Mannschaft</button>${i.tradeable?`<button class="secondary" data-qs="${i.uid}">Schnellverkauf +${fmt(quickSell(i))}</button>`:""}${isFounderItem(i)?"":`<button class="primary" data-evo-open-player="${i.uid}">Evolutions ansehen</button>`}</div></div>`}).join("")+(arr.length>shown.length?`<button class="secondary club-more" data-club-more>Weitere ${Math.min(CLUB_RENDER_BATCH,arr.length-shown.length)} Spieler anzeigen · ${shown.length}/${arr.length}</button>`:"");
 if(!arr.length)$("clubGrid").innerHTML='<div class="club-empty">Keine Spieler für diesen Filter gefunden.</div>'
}
let clubSection="players",identityTab="general",clubIdentityDraft=null,identityColorClipboard=null,identityColorPointer=null,identityColorSuppressTapUntil=0;
const CREST_SYMBOLS={star:"★",ball:"⚽",bolt:"⚡",diamond:"◆",crown:"♛",f:"F",eagle:"🦅",lion:"🦁",wolf:"🐺",flame:"🔥",trophy:"🏆",anchor:"⚓",castle:"♜",sun:"☀",moon:"☾",cross:"✚",comet:"✦",skull:"☠",bull:"🐂",bear:"🐻",fox:"🦊",horse:"♞",dragon:"🐉",shark:"🦈",snake:"🐍",owl:"🦉",scorpion:"🦂",swords:"⚔",shieldmark:"🛡",fleur:"⚜",gear:"⚙",mountain:"▲",trident:"♆",target:"◎",waves:"≋",ram:"🐏"};
function makeClubIdentityDraft(){ensureClubIdentityState();return{clubName:String(state.profile.clubName||"Footera Club"),clubShortName:String(state.profile.clubShortName||"FTR"),identity:clubIdentitySnapshot()}}
function crestHTML(identity,mini=false){
 const c=cleanClubIdentity(identity).crest;
 if(window.FooteraCrestArt?.render)return window.FooteraCrestArt.render(c,mini);
 const g=CREST_SYMBOLS[c.symbol]||"★";
 return `<div class="club-crest shape-${c.shape} border-${c.borderWidth}${mini?" kit-badge-mini":""}" style="--crest-primary:${c.primary};--crest-secondary:${c.secondary};--crest-accent:${c.accent};--crest-border:${c.borderColor}"><span class="club-crest-symbol">${esc(g)}</span><span class="club-crest-initials">${esc(c.initials)}</span></div>`
}
function kitHTML(kit,mini=false,crest=null){
 const k=kit||defaultClubIdentity().kits.home;
 const badge=crest&&window.FooteraCrestArt?.render?`<span class="kit-crest-stamp">${window.FooteraCrestArt.render(crest,true)}</span>`:"";
 return `<div class="kit-shirt pattern-${esc(k.pattern)}${mini?" kit-mini":""}" style="--kit-a:${safeClubHex(k.shirtPrimary,"#d8ff3e")};--kit-b:${safeClubHex(k.shirtSecondary,"#173627")}">${badge}</div>`
}
function syncClubSectionUi(){
 const players=$("clubPlayersSection"),identity=$("clubIdentitySection");if(players)players.hidden=clubSection!=="players";if(identity)identity.hidden=clubSection!=="identity";const boosts=$("clubChemBoostSection");if(boosts)boosts.hidden=clubSection!=="boosts";
 document.querySelectorAll("[data-club-section]").forEach(b=>b.classList.toggle("active",b.dataset.clubSection===clubSection))
}
function syncIdentityTabs(){
 document.querySelectorAll("[data-identity-tab]").forEach(b=>b.classList.toggle("active",b.dataset.identityTab===identityTab));
 document.querySelectorAll("[data-identity-panel]").forEach(p=>p.classList.toggle("active",p.dataset.identityPanel===identityTab))
}
function renderClubIdentityPreview(){
 if(!clubIdentityDraft)clubIdentityDraft=makeClubIdentityDraft();
 const d=clubIdentityDraft,x=cleanClubIdentity(d.identity);d.identity=x;
 window.FooteraCrestArt?.enhanceOptions($("identityCrestSymbols"));
 window.FooteraCrestArt?.renderPresets($("identityCrestPresets"));
 if($("identityHeroCrest"))$("identityHeroCrest").innerHTML=crestHTML(x);
 if($("identityCrestPreview"))$("identityCrestPreview").innerHTML=crestHTML(x);
 if($("identityHeroName"))$("identityHeroName").textContent=d.clubName||"Footera Club";
 if($("identityHeroShort"))$("identityHeroShort").textContent=d.clubShortName||"FTR";
 if($("identityHeroHomeKit"))$("identityHeroHomeKit").innerHTML=kitHTML(x.kits.home,true,x.crest);
 if($("identityHeroAwayKit"))$("identityHeroAwayKit").innerHTML=kitHTML(x.kits.away,true,x.crest);
 if($("identityHomeKitPreview"))$("identityHomeKitPreview").innerHTML=kitHTML(x.kits.home,false,x.crest);
 if($("identityAwayKitPreview"))$("identityAwayKitPreview").innerHTML=kitHTML(x.kits.away,false,x.crest);
 if($("identityColorChipPrimary"))$("identityColorChipPrimary").style.background=x.colors.primary;
 if($("identityColorChipSecondary"))$("identityColorChipSecondary").style.background=x.colors.secondary;
 if($("identityColorChipAccent"))$("identityColorChipAccent").style.background=x.colors.accent;
 document.querySelectorAll("[data-crest-shape]").forEach(b=>b.classList.toggle("active",b.dataset.crestShape===x.crest.shape));
 document.querySelectorAll("[data-crest-symbol]").forEach(b=>b.classList.toggle("active",b.dataset.crestSymbol===x.crest.symbol));renderIdentityColorTools()
}
function renderClubIdentity(){
 if(!clubIdentityDraft)clubIdentityDraft=makeClubIdentityDraft();const d=clubIdentityDraft,x=cleanClubIdentity(d.identity);d.identity=x;
 const set=(id,val)=>{const el=$(id);if(el&&document.activeElement!==el)el.value=val};
 set("identityClubName",d.clubName);set("identityClubShortName",d.clubShortName);set("identityCrestInitials",x.crest.initials);set("identityCrestBorderColor",x.crest.borderColor);set("identityCrestBorderWidth",x.crest.borderWidth);
 for(const [id,key] of Object.entries({Primary:"primary",Secondary:"secondary",SymbolColor:"symbolColor",TextColor:"textColor",Accent:"accent",Field:"field",Decoration:"decoration",Stars:"stars"}))set("identityCrest"+id,x.crest[key]);
 set("identityColorPrimary",x.colors.primary);set("identityColorSecondary",x.colors.secondary);set("identityColorAccent",x.colors.accent);
 set("identityHomePattern",x.kits.home.pattern);set("identityHomePrimary",x.kits.home.shirtPrimary);set("identityHomeSecondary",x.kits.home.shirtSecondary);set("identityHomeShorts",x.kits.home.shorts);set("identityHomeSocks",x.kits.home.socks);
 set("identityAwayPattern",x.kits.away.pattern);set("identityAwayPrimary",x.kits.away.shirtPrimary);set("identityAwaySecondary",x.kits.away.shirtSecondary);set("identityAwayShorts",x.kits.away.shorts);set("identityAwaySocks",x.kits.away.socks);
 syncIdentityTabs();renderClubIdentityPreview()
}
document.querySelector(".club-section-tabs")?.addEventListener("click",e=>{const b=e.target.closest("[data-club-section]");if(!b)return;clubSection=b.dataset.clubSection;if(clubSection==="identity")clubIdentityDraft=makeClubIdentityDraft();renderClub()});
document.querySelector(".identity-tabs")?.addEventListener("click",e=>{const b=e.target.closest("[data-identity-tab]");if(!b)return;identityTab=b.dataset.identityTab;syncIdentityTabs()});
$("identityCrestShapes")?.addEventListener("click",e=>{const b=e.target.closest("[data-crest-shape]");if(!b||!clubIdentityDraft)return;clubIdentityDraft.identity.crest.shape=b.dataset.crestShape;renderClubIdentityPreview()});
$("identityCrestSymbols")?.addEventListener("click",e=>{const b=e.target.closest("[data-crest-symbol]");if(!b||!clubIdentityDraft)return;clubIdentityDraft.identity.crest.symbol=b.dataset.crestSymbol;renderClubIdentityPreview()});
function bindIdentityInput(id,apply,event="input"){$(id)?.addEventListener(event,e=>{if(!clubIdentityDraft)clubIdentityDraft=makeClubIdentityDraft();apply(e.target.value,clubIdentityDraft);renderClubIdentityPreview()})}
bindIdentityInput("identityClubName",(v,d)=>d.clubName=String(v).slice(0,30));
bindIdentityInput("identityClubShortName",(v,d)=>d.clubShortName=String(v).toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4));
bindIdentityInput("identityCrestInitials",(v,d)=>d.identity.crest.initials=String(v).toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,5));bindIdentityInput("identityCrestBorderColor",(v,d)=>d.identity.crest.borderColor=v);bindIdentityInput("identityCrestBorderWidth",(v,d)=>d.identity.crest.borderWidth=v,"change");
for(const [id,key] of Object.entries({Primary:"primary",Secondary:"secondary",SymbolColor:"symbolColor",TextColor:"textColor",Accent:"accent"}))bindIdentityInput("identityCrest"+id,(v,d)=>d.identity.crest[key]=v);
for(const [id,key] of Object.entries({Field:"field",Decoration:"decoration",Stars:"stars"}))bindIdentityInput("identityCrest"+id,(v,d)=>d.identity.crest[key]=key==="stars"?Number(v):v,"change");
$("identityCrestPresets")?.addEventListener("click",e=>{const b=e.target.closest("[data-crest-preset]"),preset=window.FooteraCrestArt?.presets[b?.dataset.crestPreset];if(!preset)return;if(!clubIdentityDraft)clubIdentityDraft=makeClubIdentityDraft();Object.assign(clubIdentityDraft.identity.crest,preset.crest);renderClubIdentity()});
bindIdentityInput("identityColorPrimary",(v,d)=>d.identity.colors.primary=v);
bindIdentityInput("identityColorSecondary",(v,d)=>d.identity.colors.secondary=v);
bindIdentityInput("identityColorAccent",(v,d)=>d.identity.colors.accent=v);
for(const side of ["Home","Away"]){
 const key=side.toLowerCase();
 bindIdentityInput("identity"+side+"Pattern",(v,d)=>d.identity.kits[key].pattern=v,"change");
 bindIdentityInput("identity"+side+"Primary",(v,d)=>d.identity.kits[key].shirtPrimary=v);
 bindIdentityInput("identity"+side+"Secondary",(v,d)=>d.identity.kits[key].shirtSecondary=v);
 bindIdentityInput("identity"+side+"Shorts",(v,d)=>d.identity.kits[key].shorts=v);
 bindIdentityInput("identity"+side+"Socks",(v,d)=>d.identity.kits[key].socks=v)
}
function identityColorFieldInput(node){const field=node?.closest?.(".identity-field");return field?.querySelector?.('input[type="color"]')||null}
function applyIdentityTransferredColor(input,color){
 const value=safeClubHex(color,"");if(!input||input.type!=="color"||!value)return false;
 input.value=value;input.dispatchEvent(new Event("input",{bubbles:true}));renderIdentityColorTools();return true
}
function clearIdentityColorDropTargets(){document.querySelectorAll("#clubIdentitySection .identity-color-field.color-drop-target").forEach(x=>x.classList.remove("color-drop-target"))}
function renderIdentityColorTools(){
 document.querySelectorAll("#clubIdentitySection input[type='color']").forEach(input=>{
  const field=input.closest(".identity-field");if(!field)return;field.classList.add("identity-color-field");
  let chip=field.querySelector(".identity-color-transfer[data-color-id='"+input.id+"']");
  if(!chip){
   chip=document.createElement("span");chip.className="identity-color-transfer";chip.dataset.colorId=input.id;chip.draggable=true;chip.tabIndex=0;chip.setAttribute("role","button");chip.setAttribute("aria-label","Farbe ziehen oder antippen zum Kopieren");
   chip.innerHTML='<i aria-hidden="true"></i><b></b><small>Ziehen / tippen</small>';field.append(chip)
  }
  const value=safeClubHex(input.value,"#000000");chip.style.setProperty("--transfer-color",value);chip.querySelector("b").textContent=value.toUpperCase();chip.classList.toggle("clipboard-source",identityColorClipboard?.sourceId===input.id)
 })
}
const identityColorShell=$("clubIdentitySection");
identityColorShell?.addEventListener("dragstart",e=>{const chip=e.target.closest(".identity-color-transfer");if(!chip)return;const input=$(chip.dataset.colorId),color=safeClubHex(input?.value,"");if(!color)return;e.dataTransfer.effectAllowed="copy";e.dataTransfer.setData("text/x-footera-color",color);e.dataTransfer.setData("text/plain",color);chip.classList.add("dragging")});
identityColorShell?.addEventListener("dragend",e=>{e.target.closest(".identity-color-transfer")?.classList.remove("dragging");clearIdentityColorDropTargets()});
identityColorShell?.addEventListener("dragover",e=>{const input=identityColorFieldInput(e.target);if(!input)return;e.preventDefault();clearIdentityColorDropTargets();input.closest(".identity-color-field")?.classList.add("color-drop-target");if(e.dataTransfer)e.dataTransfer.dropEffect="copy"});
identityColorShell?.addEventListener("drop",e=>{const input=identityColorFieldInput(e.target);if(!input)return;e.preventDefault();const color=e.dataTransfer?.getData("text/x-footera-color")||e.dataTransfer?.getData("text/plain");clearIdentityColorDropTargets();if(applyIdentityTransferredColor(input,color)){identityColorClipboard=null;toast("Farbe exakt übernommen.")}});
identityColorShell?.addEventListener("click",e=>{const chip=e.target.closest(".identity-color-transfer");if(!chip||Date.now()<identityColorSuppressTapUntil)return;e.preventDefault();e.stopPropagation();const input=$(chip.dataset.colorId),color=safeClubHex(input?.value,"");if(!color)return;if(!identityColorClipboard){identityColorClipboard={sourceId:input.id,color};toast(color.toUpperCase()+" kopiert · Zielfarbe antippen.");renderIdentityColorTools();return}if(identityColorClipboard.sourceId===input.id){identityColorClipboard=null;toast("Farbkopie abgebrochen.");renderIdentityColorTools();return}const copied=identityColorClipboard.color;identityColorClipboard=null;if(applyIdentityTransferredColor(input,copied))toast(copied.toUpperCase()+" übernommen.")});
identityColorShell?.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches(".identity-color-transfer")){e.preventDefault();e.target.click()}});
identityColorShell?.addEventListener("pointerdown",e=>{const chip=e.target.closest(".identity-color-transfer");if(!chip||e.pointerType==="mouse")return;const input=$(chip.dataset.colorId),color=safeClubHex(input?.value,"");if(!color)return;identityColorPointer={pointerId:e.pointerId,sourceId:input.id,color,startX:e.clientX,startY:e.clientY,moved:false,ghost:null};chip.setPointerCapture?.(e.pointerId)});
identityColorShell?.addEventListener("pointermove",e=>{const d=identityColorPointer;if(!d||d.pointerId!==e.pointerId)return;const dx=e.clientX-d.startX,dy=e.clientY-d.startY;if(!d.moved&&Math.hypot(dx,dy)>9){d.moved=true;d.ghost=document.createElement("div");d.ghost.className="identity-color-drag-ghost";d.ghost.style.setProperty("--transfer-color",d.color);d.ghost.textContent=d.color.toUpperCase();document.body.append(d.ghost)}if(!d.moved)return;e.preventDefault();d.ghost.style.left=e.clientX+"px";d.ghost.style.top=e.clientY+"px";clearIdentityColorDropTargets();identityColorFieldInput(document.elementFromPoint(e.clientX,e.clientY))?.closest(".identity-color-field")?.classList.add("color-drop-target")},{passive:false});
function finishIdentityColorPointer(e){
 const d=identityColorPointer;if(!d||d.pointerId!==e.pointerId)return;if(d.moved){const input=identityColorFieldInput(document.elementFromPoint(e.clientX,e.clientY));if(input&&input.id!==d.sourceId&&applyIdentityTransferredColor(input,d.color))toast(d.color.toUpperCase()+" übernommen.");identityColorSuppressTapUntil=Date.now()+450}
 d.ghost?.remove();clearIdentityColorDropTargets();identityColorPointer=null
}
identityColorShell?.addEventListener("pointerup",finishIdentityColorPointer);identityColorShell?.addEventListener("pointercancel",finishIdentityColorPointer);
$("saveClubIdentity")?.addEventListener("click",()=>{
 if(!clubIdentityDraft)return;
 const name=String(clubIdentityDraft.clubName||"").trim(),short=String(clubIdentityDraft.clubShortName||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4);
 if(name.length<2)return toast("Bitte einen Vereinsnamen mit mindestens 2 Zeichen eingeben.");
 if(short.length<2)return toast("Der Kurzname braucht 2 bis 4 Zeichen.");
 state.profile.clubName=name;state.profile.clubShortName=short;state.profile.clubIdentity=cleanClubIdentity(clubIdentityDraft.identity);save();flushSave();
 renderHeaderClubName();renderSocial();window.FooteraOnline?.queueProfileSync?.(200);toast("Vereinsidentität gespeichert.")
});

["clubPosition","clubRarity","clubLeague","clubClub","clubTradeability","clubSort"].forEach(id=>$(id)?.addEventListener("change",renderClub));
function changeClubRating(which){
 const minEl=$("clubRatingMin"),maxEl=$("clubRatingMax");if(!minEl||!maxEl)return;
 let min=Number(minEl.value),max=Number(maxEl.value);
 if(min>max){if(which==="min")maxEl.value=String(min);else minEl.value=String(max)}
 updateClubRatingLabel();scheduleClubRender()
}
$("clubRatingMin")?.addEventListener("input",()=>changeClubRating("min"));
$("clubRatingMax")?.addEventListener("input",()=>changeClubRating("max"));
$("clubGrid").addEventListener("click",e=>{const more=e.target.closest("[data-club-more]"),open=e.target.closest("[data-club-open]"),ins=e.target.closest("[data-insert-item]"),q=e.target.closest("[data-qs]"),ev=e.target.closest("[data-evo-open-player]");if(more){clubRenderLimit+=CLUB_RENDER_BATCH;renderClub();return}if(open){const item=state.club.find(x=>x.uid===open.dataset.clubOpen);if(item)openPlayerDetails(item,null);return}if(ins){openSlotPickerForItem(ins.dataset.insertItem);return}if(q){const i=state.club.find(x=>x.uid===q.dataset.qs);if(!i||isFounderItem(i)||!i.tradeable)return;persistActiveSquadPreset(state);const teams=state.squadPresets.filter(p=>p?.squad.includes(i.uid)).map(p=>p.name);if(teams.length&&!confirm(`Diese Karte steht in ${teams.join(', ')}. Schnellverkaufen und aus allen Mannschaften entfernen?`))return;state.coins+=quickSell(i);state.club=state.club.filter(x=>x.uid!==i.uid);state.squad=state.squad.map(id=>id===i.uid?null:id);removeActiveEvolutionForUid(i.uid);save();renderAll();toast("Schnellverkauft. Betroffene Kaderplätze sind frei.");return}if(ev){evoFocusPlayerUid=ev.dataset.evoOpenPlayer;activeEvoTab="available";switchView("evolutionView");renderEvos();return}})

/* V18.32 meta-sensitive market, German positions and goalkeeper card stats */
// FC27 early-cycle market baseline, calibrated against public console-price snapshots on 2026-10-01.
// Rating is only the floor: player-specific demand/meta can still move cards far above fodder value.
const MARKET_PRICE_CURVE={64:300,65:400,66:450,67:500,68:550,69:600,70:650,71:700,72:750,73:800,74:850,75:900,76:950,77:1000,78:1100,79:1200,80:1350,81:1550,82:1850,83:2300,84:3000,85:4300,86:6500,87:9500,88:14500,89:22000,90:35000,91:55000,92:85000,93:130000,94:195000,95:285000,96:410000,97:575000,98:800000,99:1100000};
const SPECIAL_PRICE_CURVE={75:10000,76:10000,77:10000,78:10000,79:10000,80:10500,81:11000,82:12000,83:13500,84:16500,85:22000,86:32000,87:48000,88:75000,89:115000,90:180000,91:280000,92:430000,93:650000,94:950000,95:1400000,96:2000000,97:2800000,98:3900000,99:5200000};
const TOTW_PRICE_CURVE={75:10500,76:10500,77:10500,78:10500,79:10500,80:10500,81:11000,82:12000,83:14000,84:18000,85:26000,86:40000,87:65000,88:105000,89:175000,90:300000,91:575000,92:900000,93:1300000,94:1800000,95:2400000,96:3200000,97:4200000,98:5500000,99:7000000};
// Real-market anchors stop elite/meta golds from being priced like generic cards of the same rating.
const BASE_GOLD_PRICE_ANCHORS_BY_ID={
 "231747":3740000, // Kylian Mbappé 91
 "239085":117000,  // Erling Haaland 91
 "231443":1899000, // Ousmane Dembélé 90
 "277643":293000,  // Lamine Yamal 90
 "252371":256000,  // Jude Bellingham 90
 "247827":375000,  // Michael Olise 90
 "251854":197000,  // Pedri 90
 "241667":268000,  // Aitana Bonmatí 90
 "255253":140000,  // Vitinha 90
 "202126":36000,   // Harry Kane 90
 "231866":32500,   // Rodri 90
 "192119":87500,   // Thibaut Courtois 90
 "238794":1060000, // Vini Jr. 89
 "262531":1389000, // Claudia Pina 89
 "227102":580000,  // Caroline Graham Hansen 89
 "158023":81500,   // Lionel Messi 89
 "212198":13500,   // Bruno Fernandes 89
 "235212":194000,  // Achraf Hakimi 88
 "243715":160000,  // William Saliba 88
 "203376":31000,   // Virgil van Dijk 88
 "234378":15500,   // Declan Rice 88
 "272834":23000,   // João Neves 88
 "236479":9200,    // Mapi León 88
 "212622":13750,   // Joshua Kimmich 88
 "209331":21500,   // Mohamed Salah 87
 "246420":70500,   // Jérémy Doku 84
 "257289":34000,   // Hugo Ekitiké 85
 "256630":12250,   // Florian Wirtz 86
 "231447":6500,    // Donyell Malen 83
 "251517":6600,    // Joško Gvardiol 85
 "245037":40000,   // Eric García 85
 "245830":9000,    // Yui Hasegawa 88
 "227095":2200     // Manuela Giugliano 85
};
const BASE_GOLD_PRICE_ANCHORS_BY_NAME={
 "nuno-mendes":346000,
 "khvicha-kvaratskhelia":289000,
 "mariona":69500,
 "ewa-pajor":36000,
 "temwa-chawinga":34000,
 "gianluigi-donnarumma":61000
};
const TOTW_PRICE_ANCHORS={
 "277643|91":1641000, // Lamine Yamal
 "247827|91":1575000, // Michael Olise
 "220941|89":256000   // David Raya
};
let MARKET_META_PERCENTILE=new Map(),MARKET_META_BUCKETS=new Map(),MARKET_META_MODEL_SIZE=0;
function marketPlayStyleCount(base){const raw=[base?.playstyles,base?.playstylesPlus].filter(Boolean).join(',');return raw?raw.split(/[,;|]/).map(x=>x.trim()).filter(Boolean).length:0}
function marketPositionGroup(base){const p=String(base?.position||"").toUpperCase();if(p==="GK")return"GK";if(["CB","LB","RB","LWB","RWB"].includes(p))return"DEF";if(["CM","CDM"].includes(p))return"MID";if(["CAM","LM","RM","LW","RW","CF","ST"].includes(p))return"ATT";return"OTHER"}
function marketMetaScore(base){
 const pos=String(base?.position||"").toUpperCase(),pac=Number(base?.pac||0),sho=Number(base?.sho||0),pas=Number(base?.pas||0),dri=Number(base?.dri||0),def=Number(base?.def||0),phy=Number(base?.phy||0),skills=Number(base?.skillMoves||0),wf=Number(base?.weakFoot||0),styles=marketPlayStyleCount(base);
 let score=0;
 if(pos==="GK"){
  score=pac*.22+sho*.18+pas*.12+dri*.25+def*.08+phy*.15;
  if(dri>=85)score+=2;if(pac>=82)score+=1.2;if(phy>=82)score+=.7;
 }else if(["CM","CDM"].includes(pos)){
  score=pac*.17+sho*.07+pas*.18+dri*.18+def*.18+phy*.22;
  const complete=[pac,pas,dri,def,phy].filter(v=>v>=80).length;
  score+=complete*1.15;if(pac>=80&&dri>=82)score+=2.1;if(def>=80&&phy>=84)score+=2.3;if(pas>=82)score+=1;if(sho>=75)score+=.45;
 }else if(["CAM","LM","RM","LW","RW","CF","ST"].includes(pos)){
  score=pac*.29+sho*.23+pas*.10+dri*.28+def*.02+phy*.08;
  if(pac>=90)score+=3.1;else if(pac>=86)score+=1.8;if(dri>=86)score+=2.2;if(sho>=84)score+=1.6;if(pac>=88&&dri>=86)score+=2.2;
 }else if(["CB","LB","RB","LWB","RWB"].includes(pos)){
  score=pac*.25+sho*.02+pas*.08+dri*.09+def*.32+phy*.24;
  if(pac>=84)score+=2.5;else if(pac>=80)score+=1.3;if(def>=84)score+=1.8;if(phy>=84)score+=1.4;if(pac>=82&&def>=82&&phy>=82)score+=2.2;
 }else score=(pac+sho+pas+dri+def+phy)/6;
 if(skills>=5)score+=2.2;else if(skills>=4)score+=1.1;
 if(wf>=5)score+=1.7;else if(wf>=4)score+=.8;
 score+=Math.min(2.4,styles*.32);
 const altCount=String(base?.alt||"").split(/[,/]/).map(x=>x.trim()).filter(Boolean).length;score+=Math.min(1.6,altCount*.45);
 return score
}
function rebuildMarketMetaModel(){
 MARKET_META_PERCENTILE=new Map();MARKET_META_BUCKETS=new Map();MARKET_META_MODEL_SIZE=PLAYERS.length;
 for(const p of PLAYERS){const g=marketPositionGroup(p),r=Math.round(Number(p.ovr||0)),key=`${g}|${r}`,row={id:String(p.id),score:marketMetaScore(p)};if(!MARKET_META_BUCKETS.has(key))MARKET_META_BUCKETS.set(key,[]);MARKET_META_BUCKETS.get(key).push(row)}
 for(const [key,rows] of MARKET_META_BUCKETS){rows.sort((a,b)=>a.score-b.score);const den=Math.max(1,rows.length-1);rows.forEach((row,i)=>MARKET_META_PERCENTILE.set(row.id,i/den))}
}
function ensureMarketMetaModel(){if(MARKET_META_MODEL_SIZE!==PLAYERS.length||!MARKET_META_PERCENTILE.size)rebuildMarketMetaModel()}
function marketMetaPercentile(base){
 ensureMarketMetaModel();const id=String(base?.id||"");if(id&&MARKET_META_PERCENTILE.has(id))return MARKET_META_PERCENTILE.get(id);
 const key=`${marketPositionGroup(base)}|${Math.round(Number(base?.ovr||0))}`,rows=MARKET_META_BUCKETS.get(key)||[];if(!rows.length)return .5;
 const s=marketMetaScore(base),idx=rows.findIndex(x=>x.score>=s);return idx<0?1:idx/Math.max(1,rows.length-1)
}
function marketPercentileMultiplier(p){
 if(p>=.995)return 7.2;if(p>=.985)return 5.8;if(p>=.97)return 4.6;if(p>=.94)return 3.6;if(p>=.88)return 2.75;if(p>=.78)return 2.05;if(p>=.65)return 1.55;if(p>=.45)return 1.16;if(p>=.25)return .96;return .78
}
function marketAbsoluteMetaMultiplier(base){
 const g=marketPositionGroup(base),pac=Number(base?.pac||0),sho=Number(base?.sho||0),pas=Number(base?.pas||0),dri=Number(base?.dri||0),def=Number(base?.def||0),phy=Number(base?.phy||0);
 let m=1;
 if(g==="MID"){if(pac>=80&&dri>=82&&def>=80&&phy>=84)m*=1.45;if([pac,pas,dri,def,phy].filter(v=>v>=80).length>=5)m*=1.28}
 if(g==="ATT"){if(pac>=90&&dri>=84)m*=1.45;else if(pac>=87&&dri>=83)m*=1.25;if(sho>=85&&dri>=85)m*=1.16}
 if(g==="DEF"){if(pac>=84&&def>=84&&phy>=84)m*=1.42;else if(pac>=82&&def>=82)m*=1.20}
 if(g==="GK"){if(dri>=86&&pac>=82)m*=1.18}
 return m
}
function marketDemandMultiplier(base){
 const pct=marketMetaPercentile(base),styles=marketPlayStyleCount(base),alts=String(base?.alt||"").split(/[,/]/).map(x=>x.trim()).filter(Boolean).length;
 let m=marketPercentileMultiplier(pct)*marketAbsoluteMetaMultiplier(base);
 m*=1+Math.min(.22,styles*.025);m*=1+Math.min(.12,alts*.035);
 const lg=normalizeKey(base?.league||"");if(["bundesliga","premier league","laliga ea sports","la liga","serie a","ligue 1"].includes(lg))m*=1.04;
 return m
}
function marketMetaFactor(base){return Math.max(.65,Math.min(10.5,marketDemandMultiplier(base)))}
const MARKET_MAX_PRICE=15000000;
function marketPriceWithinLimit(value,min=150){const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=MARKET_MAX_PRICE}
function marketRoundPrice(v){v=Number(v);if(Number.isNaN(v))v=150;v=Math.max(150,Math.min(MARKET_MAX_PRICE,v));const step=v>=100000?1000:v>=50000?500:v>=10000?250:v>=1000?100:50;return Math.max(150,Math.min(MARKET_MAX_PRICE,Math.round(v/step)*step))}
// Futbin FC 27 snapshot, 2026-09-30. Sources and unavailable-base fallbacks: docs/icon-prices-2026-09-30.json.
// Fixed Footera guide prices; individual offers retain their normal spread.
const ICON_PRICE_CURVE={87:85000,88:145000,89:250000,90:420000,91:650000,92:950000,93:1400000,94:2100000,95:3000000};
const ICON_PRICE_ANCHORS={
 "ronaldo":13400000, // Ronaldo
 "mia-hamm":7450000, // Mia Hamm
 "pele":6350000, // Pelé
 "franz-beckenbauer":1980000, // Franz Beckenbauer
 "eusebio":6500000, // Eusébio
 "lothar-matthaus":3990000, // Lothar Matthäus — base-icon-pc-fallback
 "zinedine-zidane":3600000, // Zinedine Zidane
 "ruud-gullit":6940000, // Ruud Gullit
 "formiga":3450000, // Formiga — same-player-holo-fallback
 "thierry-henry":3880000, // Thierry Henry
 "ferenc-puskas":2690000, // Ferenc Puskás — base-icon-pc-fallback
 "alex-morgan":2800000, // Alex Morgan
 "bobby-charlton":2560000, // Bobby Charlton
 "johan-cruyff":5260000, // Johan Cruyff
 "paolo-maldini":3100000, // Paolo Maldini
 "diego-armando-maradona":5450000, // Diego Armando Maradona
 "kenny-dalglish":1900000, // Kenny Dalglish
 "homare-sawa":1280000, // Homare Sawa
 "jairzinho":4000000, // Jairzinho
 "zico":11000000, // Zico
 "garrincha":2160000, // Garrincha
 "gareth-bale":3350000, // Gareth Bale
 "ronaldinho":7000000, // Ronaldinho
 "carlos-alberto":1400000, // Carlos Alberto
 "gianluigi-buffon":835000, // Gianluigi Buffon
 "lilian-thuram":3200000, // Lilian Thuram
 "yaya-toure":1990000, // Yaya Touré
 "samuel-eto-o":2290000, // Samuel Eto'o
 "karl-heinz-rummenigge":2150000, // Karl-Heinz Rummenigge
 "kaka":2040000, // Kaká
 "sergio-aguero":2980000, // Sergio Agüero
 "george-best":1710000, // George Best
 "zlatan-ibrahimovic":3150000, // Zlatan Ibrahimović
 "lotta-schelin":990000, // Lotta Schelin
 "francesco-totti":1280000, // Francesco Totti
 "iniesta":1550000, // Iniesta
 "gerd-muller":1010000, // Gerd Müller
 "petr-cech":402000, // Petr Čech
 "rio-ferdinand":1850000, // Rio Ferdinand
 "alessandro-del-piero":945000, // Alessandro Del Piero
 "patrick-vieira":2040000, // Patrick Vieira
 "emilio-butragueno":2040000, // Emilio Butragueño
 "raul":929000, // Raúl
 "oliver-kahn":598000, // Oliver Kahn
 "christine-sinclair":910000, // Christine Sinclair
 "fernando-torres":1060000, // Fernando Torres
 "raphael-varane":2550000, // Raphaël Varane — same-player-holo-fallback
 "rivellino":1460000, // Rivellino
 "wayne-rooney":1350000, // Wayne Rooney
 "hege-riise":587000, // Hege Riise — same-player-holo-fallback
 "caroline-seger":679000, // Caroline Seger
 "ashley-cole":549000, // Ashley Cole
 "hristo-stoichkov":1100000, // Hristo Stoichkov
 "julie-foudy":405000, // Julie Foudy
 "roberto-baggio":779000, // Roberto Baggio
 "eric-cantona":1060000, // Eric Cantona
 "socrates":735000, // Sócrates
 "casillas":684000, // Casillas
 "marinette-pichon":374000, // Marinette Pichon
 "frank-lampard":429000, // Frank Lampard
 "tobin-heath":1340000, // Tobin Heath
 "cafu":764000, // Cafu
 "kelly-smith":650000, // Kelly Smith
 "michael-essien":939000, // Michaël Essien
 "cha-bum-kun":680000, // Cha Bum Kun
 "franck-ribery":1110000, // Franck Ribéry
 "michael-owen":499000, // Michael Owen
 "aya-miyama":550000, // Aya Miyama
 "dennis-bergkamp":420000, // Dennis Bergkamp
 "luis-figo":619000, // Luís Figo
 "peter-schmeichel":388000, // Peter Schmeichel
 "claude-makelele":905000, // Claude Makélélé
 "ian-wright":407000, // Ian Wright
 "xavi":708000, // Xavi
 "philipp-lahm":500000, // Philipp Lahm
 "paul-scholes":372000, // Paul Scholes
 "john-barnes":397000, // John Barnes
 "roy-keane":489000, // Roy Keane
 "yuki-nagasato":500000, // Yuki Nagasato
 "camille-abily":779000, // Camille Abily
 "andriy-shevchenko":404000, // Andriy Shevchenko
 "edwin-van-der-sar":545000, // Edwin van der Sar
 "marco-van-basten":429000, // Marco van Basten
 "giorgio-chiellini":638000, // Giorgio Chiellini
 "laurent-blanc":700000, // Laurent Blanc
 "didier-drogba":820000, // Didier Drogba
 "frank-rijkaard":500000, // Frank Rijkaard
 "robin-van-persie":490000, // Robin van Persie
 "ronald-koeman":320000, // Ronald Koeman
 "marcelo":850000, // Marcelo
 "michael-laudrup":300000, // Michael Laudrup
 "mario-kempes":472000, // Mario Kempes
 "gianluca-zambrotta":440000, // Gianluca Zambrotta
 "javier-zanetti":390000, // Javier Zanetti
 "hugo-sanchez":473000, // Hugo Sánchez
 "lucio":1680000, // Lúcio
 "dunga":522000, // Dunga
 "marcel-desailly":787000, // Marcel Desailly
 "steven-gerrard":579000, // Steven Gerrard
 "bastian-schweinsteiger":415000, // Bastian Schweinsteiger
 "steffi-jones":290000, // Steffi Jones
 "nadine-angerer":239000, // Nadine Angerer
 "roberto-carlos":1140000, // Roberto Carlos
 "ellen-white":309000, // Ellen White
 "pavel-nedved":368000, // Pavel Nedvěd
 "pepe":878000, // Pepe
 "jean-pierre-papin":299000, // Jean-Pierre Papin
 "sissi":590000, // Sissi
 "gheorghe-hagi":319000, // Gheorghe Hagi
 "sol-campbell":539000, // Sol Campbell
 "emmanuel-petit":440000, // Emmanuel Petit
 "xabi-alonso":308000, // Xabi Alonso
 "rivaldo":548000, // Rivaldo
 "birgit-prinz":285000, // Birgit Prinz
 "andrea-pirlo":439000, // Andrea Pirlo
 "alessandro-nesta":285000, // Alessandro Nesta
 "hernan-crespo":319000, // Hernán Crespo
 "toni-kroos":478000, // Toni Kroos
 "bobby-moore":241000, // Bobby Moore
 "gary-lineker":223000, // Gary Lineker
 "franco-baresi":346000, // Franco Baresi
 "robert-pires":295000, // Robert Pirès
 "geoff-hurst":255000, // Geoff Hurst
 "fabio-cannavaro":569000, // Fabio Cannavaro
 "fernando-hierro":224000, // Fernando Hierro
 "nemanja-vidic":520000, // Nemanja Vidić
 "ian-rush":208000, // Ian Rush
 "juan-roman-riquelme":239000, // Juan Román Riquelme
 "gabriel-batistuta":398000, // Gabriel Batistuta
 "gennaro-gattuso":259000, // Gennaro Gattuso
 "alan-shearer":209400, // Alan Shearer
 "maicon":499000, // Maicon
 "miroslav-klose":245000, // Miroslav Klose
 "david-beckham":433000, // David Beckham
 "ruud-van-nistelrooy":219000, // Ruud van Nistelrooy
 "carles-puyol":265000, // Carles Puyol
};
function iconMarketPrice(base){
 const slug=iconSlug(base?.name),anchor=ICON_PRICE_ANCHORS[slug];if(anchor)return marketRoundPrice(anchor);
 const rating=Math.max(87,Math.min(95,Math.round(Number(base?.ovr||88)))),score=marketMetaScore(base);
 const factor=Math.max(.58,Math.min(1.85,.78+(score-75)*.043));
 return marketRoundPrice(ICON_PRICE_CURVE[rating]*factor)
}
function marketBaseGoldAnchor(base){
 const id=String(base?.id||"");if(id&&BASE_GOLD_PRICE_ANCHORS_BY_ID[id])return BASE_GOLD_PRICE_ANCHORS_BY_ID[id];
 const names=[base?.name,base?.fullName].filter(Boolean).map(iconSlug);
 for(const name of names)if(BASE_GOLD_PRICE_ANCHORS_BY_NAME[name])return BASE_GOLD_PRICE_ANCHORS_BY_NAME[name];
 return 0
}
function marketPriceForRating(r,special=false,base=null,kind=""){
 if(base?.isIcon)return iconMarketPrice(base);
 const rr=Math.max(0,Math.min(99,Math.round(Number(r||0)))),baseRating=Math.max(0,Math.min(99,Math.round(Number(base?.ovr||rr))));
 const pct=base?marketMetaPercentile(base):.5,meta=base?marketMetaFactor(base):1,anchor=base?marketBaseGoldAnchor(base):0;
 if(kind==="totw"){
  const exact=TOTW_PRICE_ANCHORS[`${String(base?.id||"")}|${rr}`];if(exact)return marketRoundPrice(exact);
  const curve=TOTW_PRICE_CURVE[Math.max(75,rr)]||TOTW_PRICE_CURVE[99],goldGuide=anchor||marketRoundPrice((MARKET_PRICE_CURVE[Math.max(64,baseRating)]||MARKET_PRICE_CURVE[99])*meta);
  const upgrade=Math.max(0,rr-baseRating),demand=.82+Math.min(1.55,pct*1.45)+upgrade*.10;
  return marketRoundPrice(Math.max(10500,curve*demand,goldGuide*(1.18+upgrade*.13)))
 }
 if(!special&&anchor)return marketRoundPrice(anchor);
 const curveKey=Math.max(64,rr),basePrice=rr<64?200:(MARKET_PRICE_CURVE[curveKey]||MARKET_PRICE_CURVE[99]);
 if(!special)return marketRoundPrice(basePrice*meta);
 const goldGuide=anchor||marketRoundPrice((MARKET_PRICE_CURVE[Math.max(64,baseRating)]||MARKET_PRICE_CURVE[99])*meta);
 const upgrade=Math.max(0,rr-baseRating),specialCurve=SPECIAL_PRICE_CURVE[Math.max(75,rr)]||SPECIAL_PRICE_CURVE[99];
 const specialDemand=.9+Math.max(0,pct-.4)*.9+upgrade*.1;
 return marketRoundPrice(Math.max(SPECIAL_MARKET_MIN,specialCurve*specialDemand,goldGuide*(1.15+upgrade*.12)))
}
function marketPreviewItem(x){if(x?.variant==="special"&&isLegacyEventName(x.eventName))x.eventName="Legacy Event";return{uid:"preview",pid:String(x.base.id),evo:0,variant:x.variant||"",eventType:x.eventType||"",boost:x.boost||0,eventName:x.eventName||"",eventReleaseId:x.eventReleaseId||"",dynamicFace:x.dynamicFace||"",displayRating:x.displayRating||0,eventStats:x.eventStats||null,overridePosition:x.overridePosition||"",legacyEvent:isLegacyEventName(x.eventName)}}
function listingRating(x){const info=isMomentumItem(x)?promoItemInfo({...x,pid:x.base?.id}):null;return info?info.ovr:Math.min(99,(x.base?.ovr||0)+(x.boost||0))}
function listingQuality(x){return x.variant==="special"||x.variant==="icon-mid"?"special":rarityOf(x.base)}
function auctionTime(x){return Math.max(0,Math.ceil((Number(x?.ends||0)-Date.now())/1000))}
function qualityLabel(x){if(isMomentumItem(x))return"MOMENTUM";if(x.variant==="icon-mid")return"ICON";if(x.variant==="special"&&isLegacyEventName(x.eventName))return"LEGACY EVENT";if(x.variant==="special")return totwDisplayName(x.eventName)||"Spezial";const q=rarityOf(x.base);return q==="gold"?"Gold":q==="silver"?"Silber":"Bronze"}
function specialVariant(type=""){const eventName="Legacy Event",boost=2+Math.floor(Math.random()*3);return{variant:"special",eventName,boost,legacyEvent:true}}
function marketFilters(){let min=Number($("marketRatingMin").value||65),max=Number($("marketRatingMax").value||99);if(min>max)[min,max]=[max,min];const q=$("marketQuality").value;if(q==="bronze"){min=0;max=64}return{name:normalizeKey($("marketName").value),league:$("marketLeague").value,club:$("marketClub").value,nation:$("marketNation").value,position:$("marketPosition").value,quality:q,specialType:$("marketSpecialType").value,ratingMin:min,ratingMax:max,priceMin:Number($("marketPriceMin").value||0),priceMax:Number($("marketPriceMax").value||0)}}
function updateRatingUI(){let min=Number($("marketRatingMin").value),max=Number($("marketRatingMax").value);if(min>max){if(document.activeElement===$("marketRatingMin"))$("marketRatingMax").value=min;else $("marketRatingMin").value=max;min=Number($("marketRatingMin").value);max=Number($("marketRatingMax").value)}const bronze=$("marketQuality").value==="bronze";$("marketRatingMin").disabled=bronze;$("marketRatingMax").disabled=bronze;$("marketRatingLabel").textContent=bronze?"Bronze · bis 64":`${min} – ${max}`;$("marketRatingFloor").textContent=bronze?"≤64":"65";$("marketSpecialTypeWrap").style.opacity="1"}
function updateMarketDependentFilters(){const league=$("marketLeague").value,clubCurrent=$("marketClub").value,nationCurrent=$("marketNation").value,source=[...marketPlayersForLeague(league),...totwFallbackFilterPlayers().filter(p=>!league||p.league===league)],clubs=[...new Set(source.map(p=>p.team).filter(Boolean))].sort((a,b)=>a.localeCompare(b));$("marketClub").innerHTML='<option value="">Alle Vereine</option>'+clubs.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");if(clubs.includes(clubCurrent))$("marketClub").value=clubCurrent;const nations=[...new Set(source.map(p=>p.nation).filter(Boolean))].sort((a,b)=>a.localeCompare(b));$("marketNation").innerHTML='<option value="">Alle Nationen</option>'+nations.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");if(nations.includes(nationCurrent))$("marketNation").value=nationCurrent}
function sampleMarketPool(pool,limit=200){const n=pool.length,k=Math.min(n,limit),picked=pool.slice(0,k);for(let i=k;i<n;i++){const j=Math.floor(Math.random()*(i+1));if(j<k)picked[j]=pool[i]}return picked.sort(()=>Math.random()-.5)}
function createMarketListing(base,filters,offerIndex=0){let variant="",eventName="",eventType="",boost=0,overridePosition="";const live=totwInfo(base),archived=base?._totwWeekId?{ovr:Number(base._totwRating||0),position:base._totwPosition||base.position,name:base._totwWeekName||"Team of the Week"}:null;
 if(base?.isIcon||filters.specialType==="icon"){variant="icon-mid";eventName="Icon"}
 else if(filters.specialType==="momentum"&&MOMENTUM_BY_ID.has(String(base.id))){variant="special";eventType="momentum";eventName="MOMENTUM";overridePosition=MOMENTUM_BY_ID.get(String(base.id)).position}
 else if(filters.specialType==="totw"&&(archived||live)){const info=archived||live;variant="special";eventName=archived?.name||(activeTotwWeek()?.name||"Team of the Week");boost=Math.max(0,Number(info.ovr||base.ovr)-Number(base.ovr||0));overridePosition=info.position||base.position}
 else if(filters.specialType==="legacy"){const sp=specialVariant("legacy");variant=sp.variant;eventName=sp.eventName;boost=sp.boost}
 else if(filters.specialType!=="base"&&(filters.quality==="special"||(!filters.quality&&filters.specialType))){const sp=specialVariant(filters.specialType);variant=sp.variant;eventName=sp.eventName;boost=sp.boost}
 else if(filters.specialType!=="base"&&!filters.quality&&Math.random()<.08&&base.ovr>=75){if(live&&Math.random()<.5){variant="special";eventName=LIVE_TOTW.name;boost=Math.max(0,live.ovr-base.ovr);overridePosition=live.position}else{const sp=specialVariant();variant=sp.variant;eventName=sp.eventName;boost=sp.boost}}
 const r=eventType==="momentum"?MOMENTUM_BY_ID.get(String(base.id)).ovr:Math.min(99,base.ovr+boost),special=variant==="special"||variant==="icon-mid",isTotw=variant==="special"&&String(eventName||"").startsWith("Team of the Week");
 const priceKind=isTotw?"totw":eventType==="momentum"?"momentum":special?"special":"base",guide=marketPriceForRating(r,special,base,priceKind);
 const offerSeed=marketSnapshotHash(`${base?.id||base?.name||"player"}|${variant}|${eventType}|${eventName}|${boost}|${overridePosition}|${offerIndex}|${promoWindowKey(new Date(),19)}`);
 // EA-like market: same card clusters close to its guide price instead of jumping by ~25% between offers.
 const spread=.96+(offerSeed%81)/1000;let price=Math.max(special?SPECIAL_MARKET_MIN:200,marketRoundPrice(guide*spread));if(isTotw)price=Math.max(10500,price);
 const start=special?Math.max(SPECIAL_START_MIN,marketRoundPrice(price*(.76+((offerSeed>>5)%10)/100))):Math.max(150,marketRoundPrice(price*(.76+((offerSeed>>5)%12)/100)));
 const initialBid=Math.max(start,marketRoundPrice(start*(1+((offerSeed>>9)%8)/100)));
 const promo=eventType==="momentum"?MOMENTUM_RELEASES.find(e=>e.id===filters.eventReleaseId)||MOMENTUM_RELEASES.find(e=>e.players.some(p=>p.pid===String(base.id))):null;
 return{listingId:`mk-${offerSeed.toString(36)}-${offerIndex}`,base,variant,eventType,eventName,eventReleaseId:promo?.id||"",boost,overridePosition,price,startPrice:start,bid:initialBid,ends:Date.now()+90000+(offerSeed%210000),myBid:0}
}
const PLAYER_SEARCH_TEXT_CACHE=new WeakMap();
function playerSearchText(p){if(!p||typeof p!=="object")return"";let text=PLAYER_SEARCH_TEXT_CACHE.get(p);if(text===undefined){text=normalizeKey([p?.name,p?.fullName,p?.firstName,p?.lastName,MOMENTUM_BY_ID.get(String(p?.id||""))?.name].filter(Boolean).join(" "));PLAYER_SEARCH_TEXT_CACHE.set(p,text)}return text}
function playerDisplaySearchName(p){const event=$("marketSpecialType")?.value==="momentum"?MOMENTUM_BY_ID.get(String(p?.id||"")):null;const full=String(p?.fullName||"").trim();return event?.name||full||String(p?.name||"").trim()}
function playerDisplayName(p){const event=$("marketSpecialType")?.value==="momentum"?MOMENTUM_BY_ID.get(String(p?.id||"")):null;return String(event?.name||p?.name||p?.fullName||"").trim()}
function marketNameSuggestionPlayers(query){
 const q=normalizeKey(query);if(q.length<2)return[];
 const seen=new Set(),totw=allTotwMarketBases();
 return [...MID_ICON_BASES,...totw,...PLAYERS].filter(p=>playerSearchText(p).includes(q)).sort((a,b)=>Number(b.ovr||0)-Number(a.ovr||0)||playerDisplaySearchName(a).localeCompare(playerDisplaySearchName(b),"de")).filter(p=>{const k=normalizeKey(playerDisplaySearchName(p))+"|"+normalizeKey(p.team);if(seen.has(k))return false;seen.add(k);return true}).slice(0,16)
}
function hideMarketNameSuggestions(){const box=$("marketNameSuggestions");if(box)box.classList.remove("open")}
function renderMarketNameSuggestions(){
 const box=$("marketNameSuggestions"),input=$("marketName");if(!box||!input)return;
 const rows=marketNameSuggestionPlayers(input.value);
 if(!rows.length){box.innerHTML="";box.classList.remove("open");return}
 box.innerHTML=rows.map(raw=>{const p=resolvedAffiliation(raw);return `<button type="button" class="market-name-suggestion" data-market-name-pid="${esc(p.id)}" data-market-name-type="${p.isIcon?"icon":(p._totwWeekId||totwInfo(p))?"totw":""}"><span class="rating">${Number(p.ovr||0)}</span><span><strong>${esc(playerDisplayName(p))}</strong><small>${p.isIcon?"ICON · ":(p._totwWeekId||totwInfo(p))?"TOTW · ":""}${p.fullName&&normalizeKey(p.fullName)!==normalizeKey(playerDisplayName(p))?`${esc(p.fullName)} · `:""}${esc(p.team)} · ${esc(p.league||"")}</small></span><span class="pos">${esc(positionLabel(p.position,p))}</span></button>`}).join("");
 box.classList.add("open")
}
const MARKET_PAGE_SIZE=20,MARKET_SNAPSHOT_LIMIT=440;
let marketAllListings=[],marketPage=1,marketInventory=[],marketSnapshotKey="";
function marketSnapshotHash(v){let h=2166136261;for(const ch of String(v||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function marketSnapshotCoreKey(f){return JSON.stringify([f.name,f.league,f.club,f.nation,f.position,f.ratingMin,f.ratingMax,PLAYERS.length,activeTotwWeek()?.id||0,activeMomentumEvent()?.id||""])}
function marketBaseMatchesCore(p,f){return (!f.name||playerSearchText(p).includes(f.name))&&(!f.league||String(p?.league||resolvedAffiliation(p)?.league||"")===f.league)&&(!f.club||p.team===f.club)&&(!f.nation||p.nation===f.nation)&&positionPlusMatch(p,f.position)&&Number(p.ovr||0)>=f.ratingMin&&Number(p.ovr||0)<=f.ratingMax}
function marketSnapshotBases(f){
 const regular=f.league?marketPlayersForLeague(f.league):PLAYERS,pool=regular.filter(p=>marketBaseMatchesCore(p,f));
 if(pool.length<=MARKET_SNAPSHOT_LIMIT)return pool.slice();
 const premium=pool.slice().sort((a,b)=>Number(b.ovr||0)-Number(a.ovr||0)||marketMetaPercentile(b)-marketMetaPercentile(a)).slice(0,120),ids=new Set(premium.map(p=>String(p.id)));
 return premium.concat(sampleMarketPool(pool.filter(p=>!ids.has(String(p.id))),MARKET_SNAPSHOT_LIMIT-premium.length))
}
function buildMarketSnapshot(f){
 const bases=marketSnapshotBases(f),offers=[];
 for(const base of bases){
  const count=2+(marketSnapshotHash(base.id)%2);
  for(let i=0;i<count;i++)offers.push(createMarketListing(base,{...f,quality:"",specialType:"base"},i));
  if(Number(base.ovr||0)>=75&&marketSnapshotHash(base.id)%9===0)offers.push(createMarketListing(base,{...f,quality:"special",specialType:"legacy"},0))
 }
 for(const base of allTotwMarketBases())for(let i=0;i<3;i++)offers.push(createMarketListing(base,{...f,quality:"special",specialType:"totw"},i));
 for(const base of MID_ICON_BASES)for(let i=0;i<4;i++)offers.push(createMarketListing(base,{...f,quality:"special",specialType:"icon"},i));
 for(const event of MOMENTUM_RELEASES.filter(e=>Date.now()>=Date.parse(e.activeFrom)))for(const info of event.players){const base=P_BY_ID.get(info.pid);if(base)for(let i=0;i<3;i++)offers.push(createMarketListing(base,{...f,quality:"special",specialType:"momentum",eventReleaseId:event.id},i))}
 for(let i=offers.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[offers[i],offers[j]]=[offers[j],offers[i]]}
 marketInventory=offers;marketSnapshotKey=marketSnapshotCoreKey(f)
}
function ensureMarketSnapshot(f){const key=marketSnapshotCoreKey(f);if(!marketInventory.length||marketSnapshotKey!==key)buildMarketSnapshot(f)}
function marketListingMatchesFilters(x,f){
 const p=x.base||{},rating=listingRating(x),league=String(p?.league||resolvedAffiliation(p)?.league||"");
 if(f.name&&!playerSearchText(p).includes(f.name))return false;if(f.league&&league!==f.league)return false;if(f.club&&p.team!==f.club)return false;if(f.nation&&p.nation!==f.nation)return false;if(!positionPlusMatch(p,f.position,x.overridePosition||""))return false;
 if(rating<f.ratingMin||rating>f.ratingMax)return false;if(f.quality&&listingQuality(x)!==f.quality)return false;
 if(f.specialType==="base"&&x.variant)return false;if(f.specialType==="totw"&&!(x.variant==="special"&&String(x.eventName).startsWith("Team of the Week")))return false;if(f.specialType==="icon"&&x.variant!=="icon-mid")return false;if(f.specialType==="legacy"&&!(x.variant==="special"&&isLegacyEventName(x.eventName)))return false;if(f.specialType==="momentum"&&!isMomentumItem(x))return false;
 if(f.priceMin&&Number(x.price||0)<f.priceMin)return false;if(f.priceMax&&Number(x.price||0)>f.priceMax)return false;return true
}
function marketPageCount(){return Math.max(1,Math.ceil(marketAllListings.length/MARKET_PAGE_SIZE))}
function applyMarketPage(page=1){const pages=marketPageCount();marketPage=Math.max(1,Math.min(pages,Number(page)||1));const start=(marketPage-1)*MARKET_PAGE_SIZE;marketListings=marketAllListings.slice(start,start+MARKET_PAGE_SIZE)}
function updateMarketResultMeta(){const total=marketAllListings.length,pages=marketPageCount();$("marketResultMeta").innerHTML=total?("<span>"+fmt(total)+" Angebote gefunden · "+fmt(marketListings.length)+" auf dieser Seite</span><span>Seite "+marketPage+" von "+pages+" · Bot-Markt aktiv</span>"):("<span>Keine Angebote für diese Filter gefunden.</span><span>DB: "+fmt(PLAYERS.length)+" Spieler geladen</span>")}
function renderMarketPagination(){const el=$("marketPagination");if(!el)return;const pages=marketPageCount();if(marketAllListings.length<=MARKET_PAGE_SIZE){el.hidden=true;el.innerHTML="";return}el.hidden=false;el.innerHTML="<button class=\"secondary\" data-market-page=\"prev\" "+(marketPage<=1?"disabled":"")+">‹ Zurück</button><div class=\"market-page-status\"><strong>Seite "+marketPage+"</strong><span>von "+pages+"</span></div><button class=\"secondary\" data-market-page=\"next\" "+(marketPage>=pages?"disabled":"")+">Weiter ›</button>"}
function setMarketPage(page){const next=Math.max(1,Math.min(marketPageCount(),Number(page)||1));if(next===marketPage)return;applyMarketPage(next);renderMarket();setTimeout(()=>$("marketResultMeta")?.scrollIntoView({behavior:"smooth",block:"start"}),40)}
function activeMarketListings(listings,now=Date.now()){
 return listings.filter(x=>!x.settled&&Number(x.ends)>now).sort((a,b)=>Number(a.ends)-Number(b.ends))
}
function refreshMarket(){
 const f=marketFilters();ensureMarketSnapshot(f);marketAllListings=activeMarketListings(marketInventory.filter(x=>marketListingMatchesFilters(x,f)));applyMarketPage(1);renderMarket()
}
function bidIncrement(amount){return Math.max(50,Math.round(Number(amount||0)*.05/50)*50)}
function nextMarketBid(x){
 const bid=Number(x?.bid||0);if(!marketPriceWithinLimit(bid))return null;
 const next=Math.min(MARKET_MAX_PRICE,bid+bidIncrement(bid));return next>bid?next:null
}
function normalizeMarketAuction(x){
 if(!x||x.settled)return false;let changed=false;
 for(const key of ["price","bid","startPrice"]){if(x[key]!=null&&Number(x[key])>MARKET_MAX_PRICE){x[key]=MARKET_MAX_PRICE;changed=true}}
 if(Number(x.myBid)>MARKET_MAX_PRICE){if(!x.refunded)state.coins+=Number(x.myBid);x.myBid=0;x.refunded=true;x.outbid=false;x.botOutbidAt=0;changed=true}
 return changed
}
function listingToClubItem(x,paidPrice=0){const paid=Math.max(0,Math.round(Number(paidPrice||0)));return makeItem(x.base,true,{variant:x.variant,eventType:x.eventType,boost:x.boost,eventName:x.eventName,eventReleaseId:x.eventReleaseId||"",dynamicFace:x.dynamicFace||"",displayRating:x.displayRating||0,eventStats:x.eventStats||null,overridePosition:x.overridePosition||"",purchasePrice:paid,acquisitionSource:paid>0?"market":""})}
function settleAuctions(){
 if(!PLAYERS.length)return false;
 let changed=false;
 for(const x of new Set([...(state.auctions||[]),...marketListings])){
  if(normalizeMarketAuction(x))changed=true;
  if(x.settled||Date.now()<x.ends)continue;
  x.settled=true;x.botOutbidAt=0;
  if(!x.myBid)continue;
  if(!x.refunded&&x.myBid>=x.bid&&P_BY_ID.has(String(x.base?.id))){
   ensureObjectiveWindows();state.club.push(listingToClubItem(x,x.myBid));state.stats.market++;x.won=true;
   toast(`Gebot gewonnen: ${x.base.name}`)
  }else{
   if(!x.refunded){state.coins+=Number(x.myBid||0);x.refunded=true}
   x.won=false;toast(`Gebot verloren: ${x.base?.name||"Spieler"}.`)
  }
  changed=true
 }
 if(changed){updateObjectiveIndicators();renderWallet();save()}
 return changed
}
function marketAuctionState(x){
 if(x?.bought)return{key:"won",label:"Sofort gekauft",icon:"✓"};
 if(x?.settled&&x?.won)return{key:"won",label:"Gewonnen",icon:"✓"};
 if(x?.settled&&x?.myBid)return{key:"lost",label:"Verloren",icon:"×"};
 if(x?.settled)return{key:"expired",label:"Abgelaufen",icon:"×"};
 if(x?.myBid&&x?.refunded&&Number(x.bid)>Number(x.myBid))return{key:"outbid",label:"Überboten",icon:"!"};
 if(x?.myBid&&!x?.refunded&&Number(x.myBid)>=Number(x.bid))return{key:"leading",label:"Höchstbietender",icon:"✓"};
 return{key:"neutral",label:"Auktion läuft",icon:""}
}
function marketRowHTML(x,i,tracked=false){
 const pi=marketPreviewItem(x),b=displayBase(pi)||x.base,st=marketAuctionState(x),tagClass=isMomentumItem(x)?"momentum":String(x.eventName).startsWith("Team of the Week")?"totw":isLegacyEventName(x.eventName)?"legacy":x.variant==="special"?"special":"",next=nextMarketBid(x),time=x.settled?"Abgelaufen":auctionTime(x)+"s",openAttr=tracked?`data-my-auction-open="${i}"`:`data-market-open="${i}"`,bidAttr=tracked?`data-my-auction-bid="${i}"`:`data-bid="${i}"`,buyAttr=tracked?`data-my-auction-buy="${i}"`:`data-mbuy="${i}"`;
 const removeAction=tracked&&x.settled?`<button class="secondary auction-remove" data-my-auction-remove="${i}">Aus Liste entfernen</button>`:"";
 return `<div class="market-row ${st.key}" ${tracked?'':`data-market-listing="${i}"`}><button class="market-row-card" ${openAttr} aria-label="${esc(isMomentumItem(x)?b.name:(x.base?.name||"Spieler"))} öffnen">${cardHTML(b,pi,true,x.overridePosition||b.position)}</button><div class="market-row-main"><div class="market-row-name"><strong>${esc(isMomentumItem(x)?b.name:(x.base?.name||b.name||"Spieler"))}</strong><span class="quality-tag ${tagClass}">${esc(qualityLabel(x))}</span></div><div class="market-status-line"><span class="market-status-icon">${st.icon}</span><span>${st.label}</span></div><div class="market-price-grid"><div class="market-price-cell"><span>Akt. Gebot</span><b>${currencyAmountHTML("coins",x.bid,"market-currency")}</b></div><div class="market-price-cell"><span>Sofortkauf</span><b>${currencyAmountHTML("coins",x.price,"market-currency")}</b></div><div class="market-price-cell market-price-time"><span>Zeit</span><b ${tracked?`data-my-auction-time="${i}"`:`data-auction-time="${i}"`}>${time}</b></div></div><div class="market-row-sub">${x.myBid?`Dein letztes Gebot: ${currencyAmountHTML("coins",x.myBid,"compact")} · `:""}${esc(x.base?.team||"")} · GES ${listingRating(x)} · Start ${currencyAmountHTML("coins",x.startPrice||x.bid,"compact")}</div></div><div class="market-row-actions"><button class="secondary bid-direct" ${bidAttr} ${(x.settled||st.key==="leading"||next==null)?"disabled":""}>${st.key==="leading"?"Höchstbietender":next==null?"Preislimit erreicht":`Bieten · ${currencyAmountHTML("coins",next,"button-currency")}`}</button><button class="primary buy-direct" ${buyAttr} ${x.settled?"disabled":""}>Kaufen · ${currencyAmountHTML("coins",x.price,"button-currency")}</button>${removeAction}</div></div>`
}
function processBotOutbids(){
 let changed=false;const now=Date.now();
 for(const x of state.auctions||[]){
  if(normalizeMarketAuction(x))changed=true;
  if(x.settled||!x.myBid||x.refunded||!x.botOutbidAt||now<x.botOutbidAt)continue;
  const raise=Math.max(50,Math.round(Number(x.bid||0)*.04/50)*50);
  const next=Math.min(MARKET_MAX_PRICE,Number(x.myBid)+raise);
  if(next<=Number(x.myBid)){x.botOutbidAt=0;changed=true;continue}
  x.bid=next;x.refunded=true;x.outbid=true;x.botOutbidAt=0;state.coins+=Number(x.myBid||0);changed=true;
  toast(`Überboten: ${x.base?.name||"Spieler"} · ${fmt(x.bid)} Coins`)
 }
 if(changed){save();renderWallet()}return changed
}
function renderMyAuctions(){
 const auctions=state.auctions||[];
 $("wonAuctions").innerHTML=auctions.length?`<div class="my-bids-panel"><div class="my-bids-head"><strong>Meine Gebote</strong><span>${auctions.length} beobachtet</span></div>${auctions.slice(-20).reverse().map((x,reverseIndex)=>{const i=auctions.length-1-reverseIndex;return marketRowHTML(x,i,true)}).join("")}</div>`:'<div class="transfer-empty">Du hast aktuell keine Gebote oder beobachteten Auktionen.</div>'
}
function transferSuggestedPrices(item){
 const b=displayBase(item);if(!b)return{start:150,buy:200};
 const special=isSpecialPricedItem(item),isTotw=item.variant==="special"&&String(item.eventName||"").startsWith("Team of the Week"),kind=isTotw?"totw":item.eventType==="momentum"?"momentum":special?"special":"base";
 let buy=marketPriceForRating(itemRating(item),special,b,kind);
 if(isTotw)buy=Math.max(10500,buy);
 buy=Math.max(special?SPECIAL_MARKET_MIN:200,marketRoundPrice(buy));const start=Math.max(special?SPECIAL_START_MIN:150,marketRoundPrice(buy*.82));return{start,buy}
}
function transferSaleItem(sale){return state.club.find(i=>i.uid===sale.uid)||sale.item||null}
function transferSellEditorHTML(item,defaults=null){
 const p=defaults||transferSuggestedPrices(item),uid=item.uid,special=isSpecialPricedItem(item),minStart=special?SPECIAL_START_MIN:150,minBuy=special?SPECIAL_MARKET_MIN:200;
 return `<div class="transfer-sell-editor"><label>Startpreis<input data-sell-start="${esc(uid)}" type="number" min="${minStart}" max="${MARKET_MAX_PRICE-50}" step="50" value="${Math.max(minStart,Number(p.start||p.startPrice||minStart))}"></label><label>Sofortkauf<input data-sell-buy="${esc(uid)}" type="number" min="${minBuy}" max="${MARKET_MAX_PRICE}" step="50" value="${Math.max(minBuy,Number(p.buy||p.buyNow||minBuy))}"></label><label>Dauer<select data-sell-duration="${esc(uid)}"><option value="3600">1 Stunde</option><option value="10800">3 Stunden</option><option value="21600">6 Stunden</option></select></label><button class="primary" data-transfer-confirm-sell="${esc(uid)}">Jetzt anbieten</button></div>`
}
function transferSaleRowHTML(sale,kind){
 const item=transferSaleItem(sale),b=item?displayBase(item):null;if(!item||!b)return"";
 const active=kind==="active",sold=kind==="sold",unsold=kind==="unsold",time=active?Math.max(0,Math.ceil((sale.ends-Date.now())/1000))+"s":sold?"Abgelaufen":"Abgelaufen",editing=unsold&&sellEditorUid===item.uid;
 return `<div class="transfer-sale-row ${kind}"><button class="transfer-sale-card" data-transfer-item-open="${esc(item.uid)}">${cardHTML(b,item,true)}</button><div class="transfer-sale-info"><strong>${esc(b.name)}</strong><small>Startpreis ${currencyAmountHTML("coins",sale.startPrice,"compact")} · Sofortkauf ${currencyAmountHTML("coins",sale.buyNow,"compact")}${sold?` · Verkauft für ${currencyAmountHTML("coins",sale.soldPrice||sale.buyNow,"compact")}`:""}${active?` · Akt. Gebot ${currencyAmountHTML("coins",sale.currentBid||sale.startPrice,"compact")}`:""}</small><div class="transfer-sale-status">${sold?"Verkauft":unsold?"Nicht verkauft":`Aktiv · <span data-transfer-sale-time="${esc(sale.id)}">${time}</span>`}</div></div><div class="transfer-sale-actions">${unsold?`<button class="primary" data-transfer-relist="${esc(sale.uid)}">Erneut anbieten</button>`:""}${active?"":sold?"":`<button class="secondary" data-watch-remove="${esc(sale.uid)}">In Verein</button>`}</div>${editing?transferSellEditorHTML(item,{start:sale.startPrice,buy:sale.buyNow}):""}</div>`
}
function availableTransferRowHTML(item){
 const b=displayBase(item),p=transferSuggestedPrices(item),editing=sellEditorUid===item.uid;
 return `<div class="transfer-sale-row"><button class="transfer-sale-card" data-transfer-item-open="${esc(item.uid)}">${cardHTML(b,item,true)}</button><div class="transfer-sale-info"><strong>${esc(b.name)}</strong><small>${esc(positionLabel(b.position,b))} · ${esc(b.team)} · Richtwert ${currencyAmountHTML("coins",p.buy,"compact")}</small><div class="transfer-sale-status">Verfügbar</div></div><div class="transfer-sale-actions"><button class="primary" data-transfer-sell="${esc(item.uid)}">Anbieten</button><button class="secondary" data-transfer-compare="${esc(item.uid)}">Preisvergleich</button><button class="secondary" data-watch-remove="${esc(item.uid)}">In Verein</button></div>${editing?transferSellEditorHTML(item,p):""}</div>`
}
function renderTransferWatch(){
 settleTransferSales();
 const sales=state.transferSales||[],sold=sales.filter(s=>s.status==="sold"),unsold=sales.filter(s=>s.status==="unsold"),active=sales.filter(s=>s.status==="active"),covered=new Set(active.concat(unsold).map(s=>String(s.uid))),items=(state.transferList||[]).map(id=>state.club.find(x=>x.uid===id)).filter(i=>i&&!covered.has(String(i.uid)));
 const section=(title,rows,body,action="")=>`<section class="transfer-section"><div class="transfer-section-head"><div><h4>${title}</h4><span>${rows.length} Item${rows.length===1?"":"s"}</span></div>${action}</div><div class="transfer-section-body">${rows.length?body:'<div class="transfer-empty">Keine Items in diesem Bereich.</div>'}</div></section>`;
 $("transferWatchList").innerHTML=section("Verkaufte Items",sold,sold.map(s=>transferSaleRowHTML(s,"sold")).join(""),sold.length?'<button class="secondary" data-clear-sold>Verkaufte löschen</button>':"")+section("Nicht verkaufte Items",unsold,unsold.map(s=>transferSaleRowHTML(s,"unsold")).join(""))+section("Verfügbare Items",items,items.map(availableTransferRowHTML).join(""))+section("Aktive Transfers",active,active.map(s=>transferSaleRowHTML(s,"active")).join(""))
}
let marketSection="hub";
function renderTransferHubSummary(){
 const sales=state.transferSales||[],active=sales.filter(s=>s.status==="active"),sold=sales.filter(s=>s.status==="sold"),unsold=sales.filter(s=>s.status==="unsold"),covered=new Set(active.concat(unsold).map(s=>String(s.uid))),available=(state.transferList||[]).filter(uid=>state.club.some(x=>x.uid===uid)&&!covered.has(String(uid))),auctions=state.auctions||[];
 const total=available.length+active.length+unsold.length+sold.length,leading=auctions.filter(x=>!x.settled&&marketAuctionState(x).key==="leading").length,outbid=auctions.filter(x=>marketAuctionState(x).key==="outbid").length;
 if($("marketHubTransferCount"))$("marketHubTransferCount").textContent=fmt(total);
 if($("marketHubActiveSales"))$("marketHubActiveSales").textContent=fmt(active.length);
 if($("marketHubSoldSales"))$("marketHubSoldSales").textContent=fmt(sold.length);
 if($("marketHubBidCount"))$("marketHubBidCount").textContent=fmt(auctions.length);
 if($("marketHubLeadingBids"))$("marketHubLeadingBids").textContent=fmt(leading);
 if($("marketHubOutbidBids"))$("marketHubOutbidBids").textContent=fmt(outbid)
}
function applyMarketSection(){
 const hub=$("marketHub"),search=$("marketSearchShell"),list=$("marketTransferShell"),bids=$("marketBidsShell");if(!hub)return;
 hub.hidden=marketSection!=="hub";search.hidden=marketSection!=="search";list.hidden=marketSection!=="list";bids.hidden=marketSection!=="bids"
}
function showMarketSection(section="hub"){
 marketSection=["hub","search","list","bids"].includes(section)?section:"hub";applyMarketSection();
 if(marketSection==="search"&&!marketListings.length)refreshMarket();else renderMarket();
 window.scrollTo({top:0,behavior:"smooth"})
}
let MARKET_PORTRAIT_WARM_TOKEN=0;
async function prewarmMarketPortraits(token){
 const visible=[...new Map(marketListings.map(x=>{const id=String(x?.base?.id||"");return[id,P_BY_ID.get(id)||x?.base]}).filter(([id,p])=>id&&p)).values()];
 for(const p of visible){
  if(token!==MARKET_PORTRAIT_WARM_TOKEN||currentViewId()!=="marketView"||marketSection!=="search")return;
  const current=P_BY_ID.get(String(p.id))||p;
  if(!String(current.face||"").trim()){
   try{await ensureEaPlayerAssets(current)}catch(e){}
   await sleep(70)
  }
 }
 if(token===MARKET_PORTRAIT_WARM_TOKEN)refreshAffiliationDom(true)
}
function queueMarketPortraitWarmup(){const token=++MARKET_PORTRAIT_WARM_TOKEN;scheduleIdleTask(()=>prewarmMarketPortraits(token),700)}
function renderMarket(){
 processBotOutbids();settleAuctions();settleTransferSales();
 if(marketSection==="search"){
  marketAllListings=activeMarketListings(marketAllListings);applyMarketPage(marketPage);
  $("marketGrid").innerHTML=marketListings.length?marketListings.map((x,i)=>marketRowHTML(x,i,false)).join(""):'<div class="online-note">Keine Angebote für diese Filter gefunden. Preisbereich oder Filter etwas erweitern.</div>';
  updateMarketResultMeta();renderMarketPagination();if(marketListings.length)queueMarketPortraitWarmup()
 }else if(marketSection==="bids")renderMyAuctions();
 else if(marketSection==="list")renderTransferWatch();
 renderTransferHubSummary();applyMarketSection();renderMarketUx()
}
function openMarketPlayerDetails(i){
 const x=marketListings[Number(i)];if(!x)return;const pi=marketPreviewItem(x),base=displayBase(pi)||x.base,b=resolvedPlayer(base),shown=x.overridePosition||b.position,next=nextMarketBid(x),inc=next==null?0:next-Number(x.bid);
 $("playerDetailSub").innerHTML=`Transfermarkt · ${esc(x.base.team)} · ${currencyAmountHTML("coins",x.price,"compact")}`;
 $("playerDetailBody").innerHTML=`${playerOverviewHTML(b,pi,{shownPosition:shown,slot:null,fits:true,chem:null,context:`${fmt(x.price)} Footera Coins`})}<div class="detail-menu"><button class="menu-action" data-market-bio="${i}"><span><span>Vollständige Spielerbiografie</span><small>Attribute, Positionen und zusätzliche Infos ansehen.</small></span><b>›</b></button><button class="menu-action" data-market-price-compare="${i}"><span><span>Preisvergleich</span><small>Nur Angebote für genau diesen Spieler anzeigen.</small></span><b>›</b></button><button class="menu-action" data-market-bid-action="${i}" ${(x.settled||next==null)?'disabled':''}><span><span>${next==null?"Preislimit erreicht":`Bieten +${currencyAmountHTML("coins",inc,"compact")}`}</span><small>Aktuelles Gebot: ${currencyAmountHTML("coins",x.bid,"compact")} · ${x.settled?'Angebot beendet':auctionTime(x)+' Sekunden'}</small></span><b>›</b></button><button class="menu-action" data-market-buy-action="${i}" ${x.settled?'disabled':''}><span><span>Sofortkauf · ${currencyAmountHTML("coins",x.price,"compact")}</span><small>Spieler direkt deinem Verein hinzufügen.</small></span><b>›</b></button></div>`;
 showUiLayer("playerModal","player")
}
function buyMarketObject(x){
 if(x&&!marketPriceWithinLimit(x.price,200)){toast("Maximalpreis: "+fmt(MARKET_MAX_PRICE)+" Coins.");return false}
 const held=x?.myBid&&!x?.refunded?Number(x.myBid):0;
 if(!x||x.settled||state.coins+held<x.price){toast("Nicht genügend Coins oder Angebot abgelaufen.");return false}
 ensureObjectiveWindows();if(held)state.coins+=held;state.coins-=x.price;x.myBid=0;x.refunded=false;x.botOutbidAt=0;x.bought=true;x.boughtAt=Date.now();x.settled=true;x.won=true;state.club.push(listingToClubItem(x,x.price));state.stats.market++;
 if(!state.auctions.includes(x))state.auctions.push(x);
 save();renderAll();toast(`${x.base.name} für ${fmt(x.price)} Coins gekauft.`);return true
}
function buyMarketListing(i,tracked=false){
 const x=tracked?state.auctions?.[Number(i)]:marketListings[Number(i)];return buyMarketObject(x)
}
function bidMarketObject(x){
 if(!x||x.settled)return false;
 const newBid=nextMarketBid(x),held=x.myBid&&!x.refunded?Number(x.myBid):0;
 if(newBid==null||!marketPriceWithinLimit(x.price,200)){toast("Maximalpreis: "+fmt(MARKET_MAX_PRICE)+" Coins.");return false}
 if(state.coins+held<newBid){toast("Nicht genügend Coins.");return false}
 if(held)state.coins+=held;state.coins-=newBid;x.myBid=newBid;x.bid=newBid;x.refunded=false;x.outbid=false;
 x.botOutbidAt=Math.random()<.58?Date.now()+4000+Math.floor(Math.random()*9000):0;
 if(!state.auctions.includes(x))state.auctions.push(x);
 save();renderWallet();renderMarket();toast(`Höchstgebot: ${fmt(newBid)} Coins`);return true
}
function bidMarketListing(i,tracked=false){
 const x=tracked?state.auctions?.[Number(i)]:marketListings[Number(i)];return bidMarketObject(x)
}
function transferSalePlayerInSquad(uid){return (state.squadPresets||[]).some(p=>p?.squad?.includes(uid))||state.squad?.includes(uid)}
function removeTransferItemFromSquads(uid){
 let removed=false;
 const clear=(squad,roles,focus)=>{
  if(!Array.isArray(squad))return;
  squad.forEach((id,i)=>{if(String(id)!==String(uid))return;squad[i]=null;removed=true;if(i<11){if(roles)delete roles[i];if(focus)delete focus[i]}})
 };
 clear(state.squad,state.roles,state.focus);
 for(const preset of state.squadPresets||[])if(preset)clear(preset.squad,preset.roles,preset.focus);
 return removed
}
function createTransferSale(uid,startPrice,buyNow,duration){
 const item=state.club.find(i=>i.uid===uid);if(!item||isFounderItem(item)||!item.tradeable){toast("Spieler ist nicht tauschbar.");return false}
 if(activeTransferSaleForUid(uid)){toast("Spieler ist bereits aktiv angeboten.");return false}
 startPrice=Number(startPrice);buyNow=Number(buyNow);
 const special=isSpecialPricedItem(item),minStart=special?SPECIAL_START_MIN:150,minBuy=special?SPECIAL_MARKET_MIN:200;
 if(!marketPriceWithinLimit(startPrice,minStart)||startPrice>MARKET_MAX_PRICE-50||!marketPriceWithinLimit(buyNow,minBuy)){toast(special?"Spezialkarten: Startpreis mindestens "+fmt(SPECIAL_START_MIN)+" und Sofortkauf mindestens "+fmt(SPECIAL_MARKET_MIN)+" Coins.":"Maximalpreis: "+fmt(MARKET_MAX_PRICE)+" Coins. Startpreis muss darunter liegen.");return false}
 startPrice=Math.max(minStart,Math.min(MARKET_MAX_PRICE-50,marketRoundPrice(startPrice)));buyNow=Math.max(minBuy,startPrice+50,marketRoundPrice(Math.max(startPrice+50,buyNow)));
 if(transferSalePlayerInSquad(uid)){
  const teams=(state.squadPresets||[]).filter(p=>p?.squad?.includes(uid)).map(p=>p.name||"Team");
  if(!confirm(`${displayBase(item)?.name||"Spieler"} steht in ${teams.length?teams.join(", "):"deiner Mannschaft"}. Beim Anbieten wird er aus allen Teams entfernt. Jetzt anbieten?`))return false
 }
 const removedFromSquads=removeTransferItemFromSquads(uid);
 duration=Math.max(3600,Number(duration||3600));
 state.transferSales=state.transferSales||[];state.transferSales=state.transferSales.filter(s=>!(String(s.uid)===String(uid)&&s.status==="unsold"));
 const suggested=transferSuggestedPrices(item).buy,ratio=buyNow/Math.max(1,suggested),chance=ratio<=1.05?.82:ratio<=1.25?.6:ratio<=1.55?.3:.1,willSell=Math.random()<chance,now=Date.now(),ends=now+duration*1000;
 const planned=Math.min(buyNow,Math.max(startPrice,marketRoundPrice(suggested*(.92+Math.random()*.12))));
 state.transferSales.push({id:uid+"-"+now,uid,item:{...item},startPrice,buyNow,currentBid:startPrice,createdAt:now,ends,status:"active",saleAt:willSell?Math.min(ends-5000,now+18000+Math.floor(Math.random()*65000)):0,plannedPrice:planned});
 sellEditorUid=null;renderAll();toast(`${displayBase(item)?.name||"Spieler"} angeboten.${removedFromSquads?" Aus Mannschaft entfernt.":""}`);return true
}
function settleTransferSales(){
 let changed=false,now=Date.now();state.transferSales=state.transferSales||[];
 for(const sale of state.transferSales){
  if(sale.status==="active"||sale.status==="unsold"){
   for(const key of ["startPrice","buyNow","currentBid","plannedPrice"]){const limit=key==="startPrice"?MARKET_MAX_PRICE-50:MARKET_MAX_PRICE;if(Number(sale[key])>limit){sale[key]=limit;changed=true}}
   if(isSpecialPricedItem(sale.item)){
    if(Number(sale.startPrice||0)<SPECIAL_START_MIN){sale.startPrice=SPECIAL_START_MIN;changed=true}
    if(Number(sale.buyNow||0)<SPECIAL_MARKET_MIN){sale.buyNow=SPECIAL_MARKET_MIN;changed=true}
    if(Number(sale.currentBid||0)<SPECIAL_START_MIN){sale.currentBid=SPECIAL_START_MIN;changed=true}
    if(Number(sale.plannedPrice||0)>0&&Number(sale.plannedPrice)<SPECIAL_MARKET_MIN){sale.plannedPrice=SPECIAL_MARKET_MIN;changed=true}
   }
  }
  if(sale.status!=="active")continue;
  if(sale.saleAt&&now>=sale.saleAt){
   sale.status="sold";sale.soldPrice=sale.plannedPrice||sale.buyNow;sale.currentBid=sale.soldPrice;sale.soldAt=now;state.coins+=Number(sale.soldPrice||0);
   state.club=state.club.filter(i=>i.uid!==sale.uid);state.transferList=(state.transferList||[]).filter(id=>id!==sale.uid);changed=true;toast(`Verkauft: ${displayBase(sale.item)?.name||"Spieler"} · ${fmt(sale.soldPrice)} Coins`);continue
  }
  if(now>=sale.ends){sale.status="unsold";sale.saleAt=0;changed=true}
 }
 if(changed){save();renderWallet()}return changed
}
function resetMarketFilters(){$("marketName").value="";$("marketLeague").value="";updateMarketDependentFilters();$("marketClub").value="";$("marketNation").value="";$("marketPosition").value="";$("marketQuality").value="";$("marketSpecialType").value="";$("marketRatingMin").value=65;$("marketRatingMax").value=99;$("marketPriceMin").value="";$("marketPriceMax").value="";updateRatingUI();refreshMarket()}
$("marketPagination").addEventListener("click",e=>{const b=e.target.closest("[data-market-page]");if(!b||b.disabled)return;if(b.dataset.marketPage==="prev")setMarketPage(marketPage-1);if(b.dataset.marketPage==="next")setMarketPage(marketPage+1)});
$("refreshMarket").addEventListener("click",()=>{refreshMarket();if(UX_COMPACT_MEDIA?.matches){marketFiltersCollapsed=true;renderMarketUx()}const grid=$("marketGrid");if(grid&&marketListings.length){setTimeout(()=>grid.scrollIntoView({behavior:"smooth",block:"start"}),80)}});$("resetMarketFilters").addEventListener("click",resetMarketFilters);$("applyMarketFilters")?.addEventListener("click",()=>$("refreshMarket").click());$("marketLeague").addEventListener("change",()=>{updateMarketDependentFilters();refreshMarket()});$("marketClub").addEventListener("change",refreshMarket);$("marketNation").addEventListener("change",refreshMarket);$("marketPosition").addEventListener("change",refreshMarket);$("marketQuality").addEventListener("change",()=>{updateRatingUI();refreshMarket()});$("marketSpecialType").addEventListener("change",()=>{const t=$("marketSpecialType").value;if(t==="totw"||t==="icon"||t==="legacy"||t==="momentum")$("marketQuality").value="special";else if(t==="base"&&$("marketQuality").value==="special")$("marketQuality").value="";updateRatingUI();refreshMarket()});$("marketRatingMin").addEventListener("input",updateRatingUI);$("marketRatingMax").addEventListener("input",updateRatingUI);$("marketRatingMin").addEventListener("change",refreshMarket);$("marketRatingMax").addEventListener("change",refreshMarket);$("marketName").addEventListener("input",renderMarketNameSuggestions);
$("marketName").addEventListener("focus",renderMarketNameSuggestions);
$("marketName").addEventListener("keydown",e=>{if(e.key==="Enter"){hideMarketNameSuggestions();refreshMarket();if(UX_COMPACT_MEDIA?.matches){marketFiltersCollapsed=true;renderMarketUx()}}else if(e.key==="Escape")hideMarketNameSuggestions()});
$("marketNameSuggestions").addEventListener("click",e=>{const b=e.target.closest("[data-market-name-pid]");if(!b)return;const p=P_BY_ID.get(String(b.dataset.marketNamePid));if(!p)return;
 const type=b.dataset.marketNameType||($("marketSpecialType").value==="momentum"&&MOMENTUM_BY_ID.has(String(p.id))?"momentum":"");
 $("marketLeague").value="";updateMarketDependentFilters();$("marketClub").value="";$("marketNation").value="";$("marketPosition").value="";
 $("marketPriceMin").value="";$("marketPriceMax").value="";$("marketRatingMin").value=65;$("marketRatingMax").value=99;
 $("marketSpecialType").value=type;$("marketQuality").value=type?"special":rarityOf(p)==="bronze"?"bronze":"";
 $("marketName").value=playerDisplaySearchName(p);hideMarketNameSuggestions();updateRatingUI();refreshMarket();setTimeout(()=>$("marketGrid")?.scrollIntoView({behavior:"smooth",block:"start"}),80)});
document.addEventListener("click",e=>{if(!e.target.closest(".market-name-field"))hideMarketNameSuggestions()});
$("marketPriceMin").addEventListener("keydown",e=>{if(e.key==="Enter")refreshMarket()});$("marketPriceMax").addEventListener("keydown",e=>{if(e.key==="Enter")refreshMarket()});
$("marketView").addEventListener("click",e=>{
 const section=e.target.closest("[data-market-section]"),home=e.target.closest("[data-market-home]");
 if(section){showMarketSection(section.dataset.marketSection);return}
 if(home){showMarketSection("hub");return}
});
$("marketGrid").addEventListener("click",e=>{const buy=e.target.closest("[data-mbuy]"),bid=e.target.closest("[data-bid]"),open=e.target.closest("[data-market-open]"),listing=e.target.closest("[data-market-listing]");if(buy){buyMarketListing(Number(buy.dataset.mbuy));return}if(bid){bidMarketListing(Number(bid.dataset.bid));return}if(open){openMarketPlayerDetails(Number(open.dataset.marketOpen));return}if(listing){openMarketPlayerDetails(Number(listing.dataset.marketListing));return}})
$("wonAuctions").addEventListener("click",e=>{
 const bid=e.target.closest("[data-my-auction-bid]"),buy=e.target.closest("[data-my-auction-buy]"),open=e.target.closest("[data-my-auction-open]"),remove=e.target.closest("[data-my-auction-remove]");
 if(remove){const i=Number(remove.dataset.myAuctionRemove),x=state.auctions?.[i];if(!x?.settled)return;state.auctions.splice(i,1);save();renderMarket();toast("Abgelaufenen Eintrag entfernt.");return}
 if(bid){bidMarketListing(Number(bid.dataset.myAuctionBid),true);return}
 if(buy){buyMarketListing(Number(buy.dataset.myAuctionBuy),true);return}
 if(open){const x=state.auctions?.[Number(open.dataset.myAuctionOpen)];if(x){const idx=marketListings.indexOf(x);if(idx>=0)openMarketPlayerDetails(idx);else openBiography(marketPreviewItem(x),-1,x.base)}}
});
$("transferWatchList").addEventListener("click",e=>{
 const o=e.target.closest("[data-transfer-item-open]"),r=e.target.closest("[data-watch-remove]"),sell=e.target.closest("[data-transfer-sell]"),compare=e.target.closest("[data-transfer-compare]"),confirmSell=e.target.closest("[data-transfer-confirm-sell]"),relist=e.target.closest("[data-transfer-relist]"),clearSold=e.target.closest("[data-clear-sold]");
 if(o){const uid=o.dataset.transferItemOpen,inClub=state.club.find(x=>x.uid===uid),item=inClub||(state.transferSales||[]).find(s=>String(s.uid)===String(uid))?.item;if(inClub)openPlayerDetails(inClub,state.squad.indexOf(uid)>=0?state.squad.indexOf(uid):null);else if(item)openBiography(item,-1);return}
 if(compare){const item=state.club.find(x=>x.uid===compare.dataset.transferCompare);if(item)openPriceComparison(item);return}
 if(clearSold){state.transferSales=(state.transferSales||[]).filter(s=>s.status!=="sold");save();renderTransferWatch();renderTransferHubSummary();return}
 if(sell||relist){sellEditorUid=(sell||relist).dataset.transferSell||(sell||relist).dataset.transferRelist;renderTransferWatch();return}
 if(confirmSell){const uid=confirmSell.dataset.transferConfirmSell,start=document.querySelector(`[data-sell-start="${CSS.escape(uid)}"]`),buy=document.querySelector(`[data-sell-buy="${CSS.escape(uid)}"]`),dur=document.querySelector(`[data-sell-duration="${CSS.escape(uid)}"]`);createTransferSale(uid,start?.value,buy?.value,dur?.value);return}
 if(r){const uid=r.dataset.watchRemove;if(activeTransferSaleForUid(uid))return toast("Aktiver Transfer kann nicht entfernt werden.");state.transferList=(state.transferList||[]).filter(x=>x!==uid);state.transferSales=(state.transferSales||[]).filter(s=>!(String(s.uid)===String(uid)&&s.status==="unsold"));save();renderTransferWatch();renderTransferHubSummary();toast("Spieler zurück im Verein.");return}
})
let MARKET_BACKGROUND_TICK=0;
function updateMarketCountdowns(){
 const marketActive=document.getElementById("marketView")?.classList.contains("active"),compareActive=document.getElementById("priceCompareModal")?.classList.contains("active"),now=Date.now();
 if(compareActive)document.querySelectorAll("[data-price-compare-time]").forEach(el=>{const x=priceCompareListings[Number(el.dataset.priceCompareTime)];if(x)el.textContent=x.settled||now>=x.ends?"Abgelaufen":`${auctionTime(x)}s`});
 if(!marketActive&&now-MARKET_BACKGROUND_TICK<15000)return;
 MARKET_BACKGROUND_TICK=now;
 const botChanged=processBotOutbids(),expired=marketAllListings.some(x=>!x.settled&&now>=x.ends),settled=settleAuctions(),salesChanged=settleTransferSales();
 if(!marketActive)return;
 document.querySelectorAll("[data-auction-time]").forEach(el=>{const x=marketListings[Number(el.dataset.auctionTime)];if(x&&!x.settled)el.textContent=`${auctionTime(x)}s`});
 document.querySelectorAll("[data-my-auction-time]").forEach(el=>{const x=(state.auctions||[])[Number(el.dataset.myAuctionTime)];if(x&&!x.settled)el.textContent=`${auctionTime(x)}s`});
 document.querySelectorAll("[data-transfer-sale-time]").forEach(el=>{const x=(state.transferSales||[]).find(s=>String(s.id)===String(el.dataset.transferSaleTime));if(x&&x.status==="active")el.textContent=`${Math.max(0,Math.ceil((x.ends-now)/1000))}s`});
 if(botChanged||settled||expired||salesChanged)renderMarket()
}
setInterval(updateMarketCountdowns,1000);
initializePortraitLoading();

function rewardText(r){const a=[];if(r.eventObjective){const task=EVENT_OBJECTIVES.find(t=>t.id===r.eventObjective);if(task)a.push(`${task.player.ovr} ${task.player.name} – ${task.eventName}`)}if(r.coins)a.push(`${fmt(r.coins)} Coins`);if(r.points)a.push(`${fmt(r.points)} Footera Points`);if(r.sp)a.push(`${fmt(r.sp)} SP`);if(r.pack)a.push(`${r.qty||1}× ${PACKS.find(p=>p.id===r.pack)?.name}`);if(r.story){const spec=STORY_PASS_PLAYERS[r.story];if(spec)a.push(`${spec.season==="s1"?"Story":"Saison"}-Spieler ${spec.rating} ${spec.name} · exklusiv im Pass`)}if(r.coinBoost)a.push(`+${fmt(r.coinBoost.amount)} Coins × ${r.coinBoost.games} Spiele`);return a.join(" · ")}
function addCoinBoost(boost){const entry={games:Number(boost.games||0),amount:Number(boost.amount||0)};if(entry.games<=0||entry.amount<=0)return;if(state.coinBoost?.games>0){state.coinBoostQueue=state.coinBoostQueue||[];state.coinBoostQueue.push(entry)}else state.coinBoost=entry}
function grant(r){if(r.coins)state.coins+=r.coins;if(r.points)state.points+=r.points;if(r.sp)state.sp=(state.sp||0)+r.sp;if(r.pack&&r.pack!=="founder-bastian")state.packs[r.pack]=(state.packs[r.pack]||0)+(r.qty||1);if(r.coinBoost)addCoinBoost(r.coinBoost);claimSeasonRewards()}
function claimSeasonRewards(){for(const lvl of SEASON_REWARDS){if((state.sp||0)>=lvl.sp&&!state.seasonClaims[lvl.level]){state.seasonClaims[lvl.level]=true;if(lvl.level>1)grantSeasonOnly(lvl.reward)}}}
function grantSeasonOnly(r){if(r.coins)state.coins+=r.coins;if(r.points)state.points+=r.points;if(r.pack&&r.pack!=="founder-bastian")state.packs[r.pack]=(state.packs[r.pack]||0)+(r.qty||1);if(r.story)grantStoryPassPlayer(r.story);if(r.coinBoost)addCoinBoost(r.coinBoost)}
function parsePlayStyles(base,item){if(typeof FooteraPlayStyles!=="undefined")return FooteraPlayStyles.resolve(base,item).styles;const out=[];const add=(v,plus=false)=>{if(!v)return;if(Array.isArray(v))v.forEach(x=>out.push({name:String(x),plus}));else String(v).split(/[,|;]/).map(x=>x.trim()).filter(Boolean).forEach(x=>out.push({name:x,plus}))};add(base?.playstyles,false);add(base?.playstylesPlus,true);if(item?.evoPlaystyle)out.push({name:item.evoPlaystyle,plus:false});if(Array.isArray(item?.evoPlaystyles))item.evoPlaystyles.forEach(x=>out.push({name:String(x),plus:false}));if(item?.evoPlaystylePlus)out.push({name:item.evoPlaystylePlus,plus:true});if(Array.isArray(item?.evoPlaystylesPlus))item.evoPlaystylesPlus.forEach(x=>out.push({name:String(x),plus:true}));return out.slice(0,8)}
function renderTasks(){const ordered=[...TASKS].sort((a,b)=>{const av=Math.min(a.target,state.stats[a.stat]||0),bv=Math.min(b.target,state.stats[b.stat]||0),ac=av>=a.target,bc=bv>=b.target,aa=!!state.claims[a.id],ba=!!state.claims[b.id],ap=ac&&!aa?0:ac?1:2,bp=bc&&!ba?0:bc?1:2;return ap-bp||(bc-ac)||(bv/b.target-av/a.target)});$("taskList").innerHTML=ordered.map(t=>{const v=Math.min(t.target,state.stats[t.stat]||0),complete=v>=t.target,done=!!state.claims[t.id],cls=complete&&!done?"claimable":complete?"completed":"",stateLabel=done?'<span class="task-state done">ABGEHOLT</span>':complete?'<span class="task-state ready">ABGESCHLOSSEN</span>':'<span class="task-state">IN ARBEIT</span>';return`<div class="task ${cls}"><div class="tasktop"><div><h4>${t.title}</h4><p>${t.desc}</p>${stateLabel}</div><div class="reward">${rewardText(t.reward)}</div></div><div class="progress" style="margin-top:7px"><div style="width:${v/t.target*100}%"></div></div><div class="taskfoot"><small>${v}/${t.target}</small>${done?'<span style="font-size:6px;color:#79f2a9">ERLEDIGT</span>':`<button class="primary" data-claim="${t.id}" ${v<t.target?"disabled":""}>Abholen</button>`}</div></div>`}).join("")}
$("taskList").addEventListener("click",e=>{const b=e.target.closest("[data-claim]");if(!b)return;const t=TASKS.find(x=>x.id===b.dataset.claim);if(!t||state.claims[t.id])return;state.claims[t.id]=true;grant(t.reward);save();renderAll();toast("Belohnung abgeholt.")})

let activeEvoTab="available",evoFocusPlayerUid=null,evoPickerContext=null,evoPickerListStash=null;
function evoWeekStart(date=new Date()){return berlinWeekStart(date,1,19)}
function evoWeekIndex(date=new Date()){const p=berlinParts(evoWeekStart(date));return Math.round((Date.UTC(p.year,p.month-1,p.day)-Date.UTC(2026,8,21))/(7*86400000))}
function evoEventWindowOpen(evo,date=new Date()){const t=new Date(date).getTime();return t>=Date.parse(evo.activeFrom)&&t<Date.parse(evo.activeUntilAt)}
function activeEvolutionDefinitions(date=new Date()){return EVOLUTION_POOL.filter(x=>String(x.group||"").startsWith("s1-")||(x.group==="event"&&evoEventWindowOpen(x,date)))}
function evolutionSchedule(evo,date=new Date(),weekShift=0){if(evo?.group==="event"){const start=new Date(evo.activeFrom),signupEnd=new Date(evo.activeUntilAt),completionEnd=berlinShiftDays(start,Number(evo.completionDays||14),19);return{start,signupEnd,completionEnd,key:`${evo.id}@${evo.activeFrom.slice(0,10)}`}}const start=berlinShiftDays(evoWeekStart(date),weekShift*7,19),signupEnd=berlinShiftDays(start,Number(evo.signupDays||7),19),completionEnd=berlinShiftDays(start,Number(evo.completionDays||14),19);return{start,signupEnd,completionEnd,key:`${evo.id}@${start.toISOString().slice(0,10)}`}}
function evoDate(d){return d.toLocaleString("de-DE",{timeZone:FOOTERA_TIME_ZONE,day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}
function evoTimeLeft(d){const ms=d-Date.now();if(ms<=0)return"abgelaufen";const days=Math.floor(ms/86400000),hrs=Math.floor(ms%86400000/3600000);return days?`${days} T ${hrs} Std`:`${Math.max(1,hrs)} Std`}
function evoRequirementText(evo){const r=evo.req||{},a=[];if(r.positions?.length)a.push(r.positions.length>=12?"Alle Feldspieler":r.positions.map(positionLabel).join(" / "));if(r.baseCardsOnly)a.push("nur normale Karten");if(r.minOvr!=null&&r.maxOvr!=null)a.push(`${r.minOvr}–${r.maxOvr} GES`);else{if(r.minOvr!=null)a.push(`mind. ${r.minOvr} GES`);if(r.maxOvr!=null)a.push(`max. ${r.maxOvr} GES`)}if(evo.maxFinalOvr)a.push(`Ziel max. ${Math.min(EVOLUTION_SEASON_MAX_OVR,Number(evo.maxFinalOvr))} GES`);if(r.maxPac!=null)a.push(`max. ${r.maxPac} TEM`);if(r.maxPlaystyles!=null)a.push(`max. ${r.maxPlaystyles} PlayStyles`);return a.join(" · ")||"Keine Zusatzbedingungen"}
function evoLaneLabel(evo){return evo?.lane==="event"?`EVENT · ${evo.band||"LIMITIERT"}`:evo?.lane==="low"?`LOW · ${evo.band||"72–76"}`:evo?.lane==="mid"?`MID · ${evo.band||"77–79"}`:evo?.lane==="high"?`HIGH · ${evo.band||"80–81"}`:evo?.lane==="elite"?`ELITE · ${evo.band||"bis 85"}`:""}
function evoFinalCap(evo){const local=Number(evo?.maxFinalOvr||EVOLUTION_SEASON_MAX_OVR);return Math.min(EVOLUTION_SEASON_MAX_OVR,Number.isFinite(local)?local:EVOLUTION_SEASON_MAX_OVR)}

const MAX_ACTIVE_EVOLUTIONS=3;
function activeEvolutionEntries(){return Array.isArray(state.activeEvos)?state.activeEvos:[]}
function activeEvolutionCount(){return activeEvolutionEntries().length}
function activeEvolutionForUid(uid){return uid?activeEvolutionEntries().find(x=>String(x.uid)===String(uid))||null:null}
function activeEvolutionForInstance(instanceKey){return instanceKey?activeEvolutionEntries().find(x=>String(x.instanceKey)===String(instanceKey))||null:null}
function activeEvolutionDefinitionRunning(evoId){return activeEvolutionEntries().some(x=>String(x.evoId)===String(evoId))}
function replaceActiveEvolutionUid(fromUid,toUid){let changed=false;for(const x of activeEvolutionEntries()){if(String(x.uid)===String(fromUid)){x.uid=toUid;const p=state.evoProgress?.[x.instanceKey];if(p)p.uid=toUid;changed=true}}return changed}
function removeActiveEvolutionForUid(uid){const rows=activeEvolutionEntries(),removed=rows.filter(x=>String(x.uid)===String(uid));if(!removed.length)return false;for(const x of removed)if(x.instanceKey)delete state.evoProgress?.[x.instanceKey];state.activeEvos=rows.filter(x=>String(x.uid)!==String(uid));return true}
function removeActiveEvolutionInstance(instanceKey,status=""){const rows=activeEvolutionEntries(),entry=rows.find(x=>String(x.instanceKey)===String(instanceKey));if(!entry)return null;state.activeEvos=rows.filter(x=>x!==entry);if(entry.instanceKey)delete state.evoProgress?.[entry.instanceKey];if(status){state.evoHistory=state.evoHistory||[];state.evoHistory.unshift({evoId:entry.evoId,uid:entry.uid,status,at:Date.now()})}return entry}
function evoTotalOvrGain(evo){return (evo?.stages||[]).reduce((n,st)=>n+Number(st.ovr||0),0)}
function evoProjectedFinalOvr(item,evo){return evo?.catchUpToCap?Math.max(itemRating(item),evoFinalCap(evo)):Math.min(evoFinalCap(evo),itemRating(item)+evoTotalOvrGain(evo))}
function evoCostText(evo){const coins=Number(evo?.cost?.coins||0),points=Number(evo?.cost?.points||0);return !coins&&!points?"Kostenlos":[coins?`${fmt(coins)} Footera Coins`:"",points?`${fmt(points)} Footera Points`:""].filter(Boolean).join(" / ")}
function evoCostHTML(evo){const coins=Number(evo?.cost?.coins||0),points=Number(evo?.cost?.points||0);if(!coins&&!points)return'<div class="evo-price"><span class="free">KOSTENLOS</span></div>';return`<div class="evo-price">${coins?currencyAmountHTML("coins",coins,"evo-currency"):""}${points?currencyAmountHTML("points",points,"evo-currency"):""}</div>`}
function evoEligible(item,evo){const b=displayBase(item);if(!b||isFounderItem(item)||isStoryItem(item)||activeEvolutionForUid(item.uid))return false;const r=evo.req||{},positions=playerPositions(b),rating=itemRating(item),rp=resolvedPlayer(b);if(r.baseCardsOnly&&(item.variant||item.cosmeticDesign||item.eventType))return false;if(r.minOvr!=null&&rating<Number(r.minOvr))return false;if(r.maxOvr!=null&&rating>Number(r.maxOvr))return false;if(r.positions?.length&&!r.positions.some(p=>positions.includes(p)))return false;if(r.maxPac!=null&&Number(rp?.pac||0)>Number(r.maxPac))return false;if(r.maxPlaystyles!=null&&parsePlayStyles(b,item).length>r.maxPlaystyles)return false;return !(state.transferList||[]).includes(item.uid)}

function eligibleEvoPlayers(evo){return(state.club||[]).filter(i=>evoEligible(i,evo)).sort((a,b)=>itemRating(b)-itemRating(a))}
function evoPreviewItem(item,evo,stageIndex,baseline=null){const clone={...item,evo:Number(baseline?.evo??item.evo??0),evoStats:{...(baseline?.evoStats||item.evoStats||{})},evoPlaystyles:[...(baseline?.evoPlaystyles||item.evoPlaystyles||[])],evoPlaystylesPlus:[...(baseline?.evoPlaystylesPlus||item.evoPlaystylesPlus||[])]};if(baseline&&Object.prototype.hasOwnProperty.call(baseline,"overridePosition"))clone.overridePosition=baseline.overridePosition||"";for(let i=0;i<=stageIndex;i++)applyEvoStage(clone,evo.stages[i],evo);return clone}
// Evo-Werte nach Position: die Hauptwerte der Position wachsen mindestens so stark wie das GES (+1, wenn die Stufe den Wert betont),
// Werte ohne Nutzen für die Position (z. B. Schuss beim Innenverteidiger) entfallen.
const EVO_KEY_STATS={ST:["sho","dri","pac"],CF:["sho","dri","pas"],LW:["pac","dri","sho"],RW:["pac","dri","sho"],LM:["pac","dri","pas"],RM:["pac","dri","pas"],CAM:["pas","dri","sho"],CM:["pas","dri"],CDM:["def","phy","pas"],CB:["def","phy"],LB:["pac","def"],RB:["pac","def"],LWB:["pac","def","pas"],RWB:["pac","def","pas"],GK:["pac","sho","dri","phy"]};
const EVO_SKIP_STATS={ST:["def"],CF:["def"],LW:["def"],RW:["def"],CAM:["def"],CDM:["sho"],CB:["sho"],GK:["def"]};
function evoStageStatGains(item,stage,ovrGain){const pos=String(displayBase(item)?.position||"").toUpperCase(),listed=stage?.stats||{},skip=EVO_SKIP_STATS[pos]||[],out={};for(const[k,v]of Object.entries(listed))if(!skip.includes(k)&&Number(v)>0)out[k]=Number(v);for(const k of EVO_KEY_STATS[pos]||[])out[k]=Math.max(out[k]||0,ovrGain)+(Number(listed[k])>0?1:0);return out}
function applyEvoStage(item,stage,evo){item.evoDesign=true;if(evo?.design)item.cosmeticDesign=evo.design;const beforeRating=itemRating(item),remaining=Math.max(0,evoFinalCap(evo)-beforeRating),stageIndex=Math.max(0,Array.isArray(evo?.stages)?evo.stages.indexOf(stage):0),stepsLeft=Math.max(1,(evo?.stages?.length||1)-stageIndex),ovrGain=evo.catchUpToCap?Math.ceil(remaining/stepsLeft):Math.min(Number(stage.ovr||0),remaining);const appliedOvr=Math.min(remaining,ovrGain);item.evo=Number(item.evo||0)+appliedOvr;item.evoStats=item.evoStats||{};const caps=evo?.statCaps||{},current=resolvedPlayer(displayBase(item));for(const[k,v]of Object.entries(evoStageStatGains(item,stage,appliedOvr))){const now=Number(current[k]||0),rawCap=Number(caps[k]),cap=Math.min(EVOLUTION_GLOBAL_STAT_CAP,Number.isFinite(rawCap)?rawCap:EVOLUTION_GLOBAL_STAT_CAP),inc=Math.max(0,Math.min(v,cap-now));item.evoStats[k]=Number(item.evoStats[k]||0)+inc}item.evoPlaystyles=item.evoPlaystyles||[];item.evoPlaystylesPlus=item.evoPlaystylesPlus||[];if(stage.playstyle&&!item.evoPlaystyles.includes(stage.playstyle)&&!item.evoPlaystylesPlus.includes(stage.playstyle))item.evoPlaystyles.push(stage.playstyle);if(stage.playstylePlus){item.evoPlaystyles=item.evoPlaystyles.filter(x=>x!==stage.playstylePlus);if(!item.evoPlaystylesPlus.includes(stage.playstylePlus))item.evoPlaystylesPlus.push(stage.playstylePlus)}if(stage.position)item.overridePosition=stage.position}
function stageUpgradeText(st,evo=null,item=null,gains=null){const base=item?displayBase(item):null,keeper=String(base?.position||"").toUpperCase()==="GK"||(evo?.req?.positions?.length===1&&evo.req.positions[0]==="GK"),map=keeper?{pac:"HEC",sho:"BSI",pas:"ABS",dri:"REF",def:"TMP",phy:"POS"}:{pac:"TEM",sho:"SCH",pas:"PAS",dri:"DRI",def:"DEF",phy:"PHY"},a=Object.entries(gains?gains.stats:st.stats||{}).filter(([,v])=>v>0).map(([k,v])=>`+${v} ${map[k]||k.toUpperCase()}`);if(gains){if(gains.ovr)a.unshift(`+${gains.ovr} GES`)}else if(evo?.catchUpToCap)a.unshift(`Rating bis ${evoFinalCap(evo)} GES`);else if(st.ovr)a.unshift(`+${st.ovr} GES`);if(st.playstyle)a.push(`PlayStyle: ${st.playstyle}`);if(st.playstylePlus)a.push(`PlayStyle+: ${st.playstylePlus}`);if(st.position)a.push(`Position: ${positionLabel(st.position)}`);return a.join(" · ")}
function stageGoalText(st){const a=[];if(st.matches)a.push(`${st.matches} Spiele`);if(st.wins)a.push(`${st.wins} Siege`);return a.join(" · ")}
function evoProgressPct(st,prog){const parts=[];if(st.matches)parts.push(Math.min(1,Number(prog.matches||0)/st.matches));if(st.wins)parts.push(Math.min(1,Number(prog.wins||0)/st.wins));return parts.length?Math.round(parts.reduce((a,b)=>a+b,0)/parts.length*100):100}
function evoStageDone(st,prog){return(!st.matches||Number(prog.matches||0)>=st.matches)&&(!st.wins||Number(prog.wins||0)>=st.wins)}
function migrateLegacyEvo(){
 state.activeEvos=activeEvolutionEntries().slice(0,MAX_ACTIVE_EVOLUTIONS);
 let changed=false;
 for(let i=0;i<state.activeEvos.length;i++){
  const row=state.activeEvos[i],evo=EVOLUTION_POOL.find(x=>x.id===row?.evoId);
  if(!evo||!(state.club||[]).some(item=>String(item.uid)===String(row?.uid))){if(row?.instanceKey)delete state.evoProgress?.[row.instanceKey];state.activeEvos.splice(i--,1);changed=true;continue}
  if(!row.instanceKey){
   const sch=evolutionSchedule(evo),old=state.evoProgress?.[evo.id]||{};
   const migrated={...row,instanceKey:sch.key,completionEnd:sch.completionEnd.getTime(),stage:Number(row.stage||0)};
   state.activeEvos[i]=migrated;
   if(!state.evoProgress[sch.key])state.evoProgress[sch.key]={uid:migrated.uid,stage:migrated.stage,matches:Number(old.matches||0),wins:Number(old.wins||0),ready:false};
   changed=true
  }
 }
 state.activeEvo=null;
 if(changed)save()
}
function expireActiveEvolutionIfNeeded(){
 migrateLegacyEvo();const now=Date.now(),expired=[];
 for(const row of activeEvolutionEntries()){const end=Number(row.completionEnd||0);if(end&&now>=end)expired.push(row)}
 if(!expired.length)return false;
 state.evoHistory=state.evoHistory||[];
 for(const row of expired){state.evoHistory.unshift({evoId:row.evoId,uid:row.uid,status:"expired",at:now});if(row.instanceKey)delete state.evoProgress?.[row.instanceKey]}
 state.activeEvos=activeEvolutionEntries().filter(x=>!expired.includes(x));save();return true
}
function evoGoalRow(label,current,target,locked=false){
 const cur=Math.max(0,Number(current||0)),max=Math.max(1,Number(target||0)),pct=Math.max(0,Math.min(100,Math.round(cur/max*100))),done=cur>=max;
 return`<div class="evo-goal ${done?"done":""}"><span class="evo-goal-label">${esc(label)}</span><b class="evo-goal-value">${Math.min(cur,max)}/${max}</b><div class="evo-goal-bar"><i style="width:${locked?0:pct}%"></i></div></div>`
}
function evoStagesHTML(item,evo,progressStage=-1,prog={},baseline=null,instanceKey=""){
 return`<div class="evo-stage-track">${evo.stages.map((st,idx)=>{
  const pi=evoPreviewItem(item,evo,idx,baseline),pb=displayBase(pi),prevItem=evoPreviewItem(item,evo,idx-1,baseline),prevStats=resolvedPlayer(displayBase(prevItem)),nextStats=resolvedPlayer(pb),gains={ovr:itemRating(pi)-itemRating(prevItem),stats:Object.fromEntries(["pac","sho","pas","dri","def","phy"].map(k=>[k,Number(nextStats[k]||0)-Number(prevStats[k]||0)]))},isCurrent=idx===progressStage,done=progressStage>idx,future=progressStage>=0&&idx>progressStage;
  const stageProg=isCurrent?prog:(done?{matches:st.matches||0,wins:st.wins||0}:{matches:0,wins:0});
  const ready=isCurrent&&evoStageDone(st,stageProg);
  const goals=[st.matches?evoGoalRow("Spiele · Startelf",stageProg.matches,st.matches,future):"",st.wins?evoGoalRow("Siege · Startelf",stageProg.wins,st.wins,future):""].join("");
  const starterNote=isCurrent?'<div class="evo-starter-note"><b>Startelf-Pflicht:</b> Der Evo-Spieler muss beim Anpfiff in der Startelf stehen. Danach darf er ausgewechselt werden – er muss nicht durchspielen.</div>':"";
  return`<div class="evo-stage ${isCurrent?'current':''} ${done?'done':''} ${future?'future':''}">
   <div class="evo-stage-head"><div><span>${esc(st.label||`Stufe ${idx+1}`)}</span><strong>${stageGoalText(st)}</strong></div><b>${done?'✓':isCurrent?(ready?'BEREIT':`${evoProgressPct(st,stageProg)}%`):`${pb.ovr} GES`}</b></div>
   <div class="evo-stage-card">${cardHTML(pb,pi,false)}</div>
   <div class="evo-stage-side"><div class="evo-stage-upgrades">${esc(stageUpgradeText(st,evo,item,gains))}</div>${starterNote}<div class="evo-goal-list">${goals}</div>
   ${ready?`<div class="evo-ready-note">Alle Ziele erreicht. Upgrade kann jetzt abgeholt werden.</div><button class="primary evo-stage-claim" data-evo-claim-stage="${idx}" data-evo-claim-instance="${esc(instanceKey)}">Evolution erhalten</button>`:""}</div>
  </div>`
 }).join("")}</div>`
}
function openEvoPicker(evoId,preferredUid=null){const evo=EVOLUTION_POOL.find(x=>x.id===evoId);if(!evo)return;evoPickerListStash=null;const sch=evolutionSchedule(evo),eligible=eligibleEvoPlayers(evo);evoPickerContext={evoId,instanceKey:sch.key};$("evoPickerTitle").textContent=evo.name;$("evoPickerSub").textContent=`${eligible.length} qualifizierte Spieler · Starten bis ${evoDate(sch.signupEnd)}`;const chosen=preferredUid&&eligible.find(i=>i.uid===preferredUid);if(chosen){renderEvoCandidatePreview(evo,chosen,sch);showUiLayer("evoPickerModal","evo-picker");return}const groups=[...new Set(eligible.map(i=>evoPickerPosGroup(displayBase(i).position)))];$("evoPickerBody").innerHTML=`<div class="evo-picker-intro"><strong>Nur qualifizierte Spieler</strong><span>${esc(evoRequirementText(evo))}</span></div>${eligible.length>1?evoPickerFilterHTML(groups,eligible.length):""}<div class="evo-candidate-grid">${eligible.length?eligible.map((i,n)=>{const b=displayBase(i);return`<button class="evo-candidate" data-evo-candidate="${i.uid}" data-evo-name="${esc(evoPickerKey(b.name))}" data-evo-group="${evoPickerPosGroup(b.position)}" data-evo-ovr="${Number(b.ovr)||0}" data-evo-order="${n}">${cardHTML(b,i,true)}<strong>${esc(b.name)}</strong><small>${b.ovr} GES · ${esc(positionLabel(b.position,b))}</small></button>`}).join(""):'<div class="evo-empty">Aktuell befindet sich kein qualifizierter Spieler in deinem Verein.</div>'}<div class="evo-empty evo-filter-empty" hidden>Kein Spieler passt zu deiner Suche.</div></div>`;showUiLayer("evoPickerModal","evo-picker")}
const EVO_PICKER_GROUPS=[["GK","TW"],["DEF","ABW"],["MID","MF"],["ATT","ST"]];
function evoPickerPosGroup(pos){const p=String(pos||"").toUpperCase();if(p==="GK")return"GK";if(["CB","LB","RB","LWB","RWB"].includes(p))return"DEF";if(["CDM","CM","CAM","LM","RM"].includes(p))return"MID";return"ATT"}
function evoPickerKey(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/\s+/g," ")}
function evoPickerFilterHTML(groups,total){const pos=groups.length>1?`<button type="button" class="active" aria-pressed="true" data-evo-filter-pos="">Alle</button>${EVO_PICKER_GROUPS.filter(([g])=>groups.includes(g)).map(([g,l])=>`<button type="button" aria-pressed="false" data-evo-filter-pos="${g}">${l}</button>`).join("")}`:"";return`<div class="evo-filter"><div class="evo-filter-search"><input id="evoPickerSearch" type="search" placeholder="Spieler suchen …" autocomplete="off" enterkeyhint="search" aria-label="Spieler suchen"><span class="evo-filter-count" aria-live="polite">${total} von ${total}</span></div><div class="evo-filter-chips" role="group" aria-label="Filter">${pos}<button type="button" class="evo-filter-sort" data-evo-filter-sort="" aria-label="Sortierung: empfohlen">⇅ GES</button></div></div>`}
function applyEvoPickerFilter(){const body=$("evoPickerBody"),grid=body?.querySelector(".evo-candidate-grid");if(!grid)return;const q=evoPickerKey($("evoPickerSearch")?.value),pos=body.querySelector("[data-evo-filter-pos].active")?.dataset.evoFilterPos||"",sort=body.querySelector("[data-evo-filter-sort]")?.dataset.evoFilterSort||"",cards=[...grid.querySelectorAll("[data-evo-candidate]")];let shown=0;cards.forEach(c=>{const ok=(!q||c.dataset.evoName.includes(q))&&(!pos||c.dataset.evoGroup===pos);c.hidden=!ok;if(ok)shown++});const val=c=>Number(c.dataset[sort?"evoOvr":"evoOrder"]);cards.sort((a,b)=>sort==="high"?val(b)-val(a)||a.dataset.evoOrder-b.dataset.evoOrder:val(a)-val(b)||a.dataset.evoOrder-b.dataset.evoOrder).forEach(c=>grid.appendChild(c));const empty=grid.querySelector(".evo-filter-empty");if(empty){empty.hidden=shown>0;grid.appendChild(empty)}const count=body.querySelector(".evo-filter-count");if(count)count.textContent=`${shown} von ${cards.length}`}
function renderEvoCandidatePreview(evo,item,sch=evolutionSchedule(evo)){
 const b=displayBase(item),full=activeEvolutionCount()>=MAX_ACTIVE_EVOLUTIONS,running=activeEvolutionDefinitionRunning(evo.id),playerBusy=!!activeEvolutionForUid(item.uid),blocked=full||running||playerBusy;
 const reason=playerBusy?"Spieler bereits in Evolution":running?"Diese Evolution läuft bereits":full?"3/3 Evolutionen aktiv":"";
 const coins=Number(evo?.cost?.coins||0),points=Number(evo?.cost?.points||0),free=!coins&&!points;
 let buttons="";
 if(blocked)buttons=`<div class="evo-payment-actions one"><button class="primary" disabled>${reason}</button></div>`;
 else if(free)buttons=`<div class="evo-payment-actions one"><button class="primary" data-evo-start="${evo.id}" data-evo-uid="${item.uid}" data-evo-pay="free">Kostenlos starten</button></div>`;
 else buttons=`<div class="evo-payment-actions">${coins?`<button class="primary" data-evo-start="${evo.id}" data-evo-uid="${item.uid}" data-evo-pay="coins" ${state.coins<coins?"disabled":""}>${currencyAmountHTML("coins",coins,"button-currency")}</button>`:""}${points?`<button class="secondary" data-evo-start="${evo.id}" data-evo-uid="${item.uid}" data-evo-pay="points" ${state.points<points?'title="Zu wenig Points – Points-Übersicht öffnen"':""}>${currencyAmountHTML("points",points,"button-currency")}</button>`:""}</div>`;
 $("evoPickerBody").innerHTML=`<button class="secondary evo-picker-back" data-evo-picker-back="${evo.id}">← Andere Spieler</button><div class="evo-selected"><div><h3>${esc(b.name)}</h3><p>${esc(evoRequirementText(evo))}</p>${evoCostHTML(evo)}<div class="evo-result-cap">Aktuell ${itemRating(item)} GES → maximal ${evoProjectedFinalOvr(item,evo)} GES</div><div class="evo-deadlines"><span>Starten bis <b>${evoDate(sch.signupEnd)}</b></span><span>Abschließen bis <b>${evoDate(sch.completionEnd)}</b></span></div></div>${buttons}</div>${evoStagesHTML(item,evo,-1,{})}`;
 evoPickerContext={evoId:evo.id,uid:item.uid,instanceKey:sch.key}
}
// Handy-Zurück aus der Vorschau führt zur Spielerauswahl: Liste samt Suche, Filter und Scrollposition bleibt erhalten.
function showEvoCandidateFromList(evo,item){
 const body=$("evoPickerBody");evoPickerListStash={nodes:[...body.childNodes],scroll:body.scrollTop,context:evoPickerContext};
 renderEvoCandidatePreview(evo,item);body.scrollTop=0;pushUiState("evo-picker-preview",{layer:"evoPickerModal"})
}
function restoreEvoPickerList(){
 const stash=evoPickerListStash,body=$("evoPickerBody");if(!stash||!body)return false;
 evoPickerListStash=null;body.replaceChildren(...stash.nodes);body.scrollTop=stash.scroll;evoPickerContext=stash.context;return true
}
function startEvolution(evoId,uid,payment="free"){
 expireActiveEvolutionIfNeeded();
 if(activeEvolutionCount()>=MAX_ACTIVE_EVOLUTIONS)return toast("Du hast bereits 3 aktive Evolutionen.");
 if(activeEvolutionForUid(uid))return toast("Dieser Spieler steckt bereits in einer aktiven Evolution.");
 if(activeEvolutionDefinitionRunning(evoId))return toast("Diese Evolution läuft bereits mit einem anderen Spieler.");
 const evo=EVOLUTION_POOL.find(x=>x.id===evoId),item=state.club.find(x=>x.uid===uid);
 if(isFooteraLiveCard(item))return toast("Gekaufte Echtgeldkarten sind erst nach dem sicheren Server-Evolutionssystem evolvierbar.");
 if(!evo||!item||!evoEligible(item,evo))return toast("Dieser Spieler erfüllt die Voraussetzungen nicht.");
 const active=activeEvolutionDefinitions().some(x=>x.id===evo.id),sch=evolutionSchedule(evo);
 if(!active||Date.now()>=sch.signupEnd)return toast("Diese Evolution kann nicht mehr gestartet werden.");
 const coins=Number(evo?.cost?.coins||0),points=Number(evo?.cost?.points||0),free=!coins&&!points;
 let paidWith="free",paidAmount=0;
 if(!free){
  if(payment==="coins"&&coins){if(state.coins<coins)return toast("Nicht genügend Münzen.");state.coins-=coins;paidWith="coins";paidAmount=coins}
  else if(payment==="points"&&points){if(state.points<points)return openFooteraPointsOverview(points,`Evolution ${evo.name}`,Number(state.points||0));state.points-=points;paidWith="points";paidAmount=points}
  else return toast("Wähle Münzen oder Footera Points.")
 }
 item.tradeable=false;
 const entry={evoId:evo.id,uid:item.uid,instanceKey:sch.key,completionEnd:sch.completionEnd.getTime(),stage:0,paidWith,paidAmount,baseline:{evo:Number(item.evo||0),evoStats:{...(item.evoStats||{})},evoPlaystyles:[...(item.evoPlaystyles||[])],overridePosition:item.overridePosition||""}};
 state.activeEvos=activeEvolutionEntries();state.activeEvos.push(entry);
 state.evoProgress[sch.key]={uid:item.uid,stage:0,matches:0,wins:0,ready:false};
 save();closeUiLayer("evoPickerModal","evo-picker");activeEvoTab="active";renderAll();switchView("evolutionView");toast(`${displayBase(item).name}: Evolution gestartet · ${activeEvolutionCount()}/3 aktiv.`)
}
function closeEvoClaimReveal(){
 const o=$("evoClaimOverlay");if(!o)return;
 o.classList.remove("revealed","active");
 o.setAttribute("aria-hidden","true");
 o.style.pointerEvents="none";
 requestAnimationFrame(()=>{if(o.isConnected)o.remove()})
}
function showEvoClaimReveal(beforeItem,afterItem,evo,stageIndex,isFinal){
 closeEvoClaimReveal();
 const beforeBase=displayBase(beforeItem),afterBase=displayBase(afterItem);if(!beforeBase||!afterBase)return;
 const o=document.createElement("div");o.id="evoClaimOverlay";o.className="evo-claim-overlay";o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");o.setAttribute("aria-hidden","false");
 o.innerHTML=`<div class="evo-claim-stage"><div class="evo-claim-kicker">EVOLUTION · STUFE ${stageIndex+1}</div><div class="evo-transform-wrap"><div class="evo-claim-burst"></div><div class="evo-transform-before">${cardHTML(beforeBase,beforeItem,false)}</div><div class="evo-transform-after">${cardHTML(afterBase,afterItem,false)}</div></div><div class="evo-claim-title">${esc(afterBase.name)} · ${itemRating(afterItem)} GES</div><div class="evo-claim-sub">${isFinal?"Evolution abgeschlossen":"Nächste Stufe freigeschaltet"} · neue Werte wurden übernommen</div><button class="primary evo-claim-close" type="button">Weiter</button></div>`;
 document.body.appendChild(o);
 const closeBtn=o.querySelector(".evo-claim-close");
 const closeNow=e=>{e?.preventDefault?.();e?.stopPropagation?.();closeEvoClaimReveal()};
 closeBtn?.addEventListener("click",closeNow,{once:true});
 o.addEventListener("click",e=>{if(e.target===o)closeNow(e)});
 o.addEventListener("keydown",e=>{if(e.key==="Escape")closeNow(e)});
 requestAnimationFrame(()=>{o.classList.add("active");setTimeout(()=>{if(o.isConnected){o.classList.add("revealed");closeBtn?.focus({preventScroll:true})}},180)});
}
function claimEvolutionStage(instanceKey=""){
 expireActiveEvolutionIfNeeded();
 const entry=instanceKey?activeEvolutionForInstance(instanceKey):(activeEvolutionCount()===1?activeEvolutionEntries()[0]:null);if(!entry)return;
 const evo=EVOLUTION_POOL.find(x=>x.id===entry.evoId),item=state.club.find(x=>x.uid===entry.uid);if(!evo||!item)return;
 const stage=Number(entry.stage||0),st=evo.stages[stage],key=entry.instanceKey,prog=state.evoProgress[key]||{};
 if(!st||!evoStageDone(st,prog))return toast("Die Ziele dieser Stufe sind noch nicht vollständig erreicht.");
 const beforeItem=JSON.parse(JSON.stringify(item));applyEvoStage(item,st,evo);
 const afterItem=JSON.parse(JSON.stringify(item)),nextStage=stage+1,isFinal=nextStage>=evo.stages.length;
 if(isFinal){removeActiveEvolutionInstance(key,"completed");activeEvoTab=activeEvolutionCount()?"active":"completed"}
 else{entry.stage=nextStage;state.evoProgress[key]={uid:item.uid,stage:nextStage,matches:0,wins:0,ready:false}}
 save();renderAll();showEvoClaimReveal(beforeItem,afterItem,evo,stage,isFinal)
}
function renderAvailableEvolution(evo){
 const sch=evolutionSchedule(evo),eligible=eligibleEvoPlayers(evo),focus=evoFocusPlayerUid&&eligible.some(x=>x.uid===evoFocusPlayerUid),full=activeEvolutionCount()>=MAX_ACTIVE_EVOLUTIONS,running=activeEvolutionDefinitionRunning(evo.id),disabled=!eligible.length||full||running;
 const label=running?"Evolution läuft":!eligible.length?"Keine geeigneten Spieler":full?"3/3 Evolutionen aktiv":"Spieler wählen & Vorschau";
 const designPreview=evo.design?(()=>{const pick=eligible[0];if(!pick)return`<div class="evo-event-design"><span>Endet im HALLOWEEN-Design · nur normale Karten 78–84 GES</span></div>`;const done=evoPreviewItem(pick,evo,evo.stages.length-1);return`<div class="evo-event-design"><div class="evo-event-design-card">${cardHTML(displayBase(done),done,true)}</div><span>So endet ${esc(displayBase(pick).name)}: ${itemRating(done)} GES im HALLOWEEN-Design</span></div>`})():"";
 return`<div class="evo-offer ${focus?"focus":""}${running?" running":""}${evo.design?` event-evo ${esc(evo.design)}-evo`:""}"><div class="evo-offer-top"><div><div class="evo-tags">${running?`<span class="evo-running">LÄUFT</span>`:""}<span class="evo-live">${Date.now()-sch.start<48*3600000?"NEU":"LIVE"}</span>${evo.lane?`<span class="evo-lane ${evo.lane}">${esc(evoLaneLabel(evo))}</span>`:""}</div><h3>${esc(evo.name)}</h3><p>${esc(evo.subtitle)}</p></div><div class="evo-count"><b>${eligible.length}</b><span>geeignet</span></div></div>${designPreview}<div class="evo-requirements">${esc(evoRequirementText(evo))}${evo.catchUpToCap?` · Dynamische Aufwertung auch für Bronze und Silber · Attribut-Caps`:``}</div>${evoCostHTML(evo)}<div class="evo-deadlines"><span>Starten bis <b>${evoDate(sch.signupEnd)}</b><small>${evoTimeLeft(sch.signupEnd)}</small></span><span>Abschließen bis <b>${evoDate(sch.completionEnd)}</b></span></div><div class="evo-level-pills">${evo.stages.map((st,i)=>`<span>Stufe ${i+1}: ${evo.catchUpToCap?`dynamisch · bis ${evoFinalCap(evo)} GES`:st.ovr?`+${st.ovr} GES`:"Stats"}</span>`).join("")}</div><button class="primary" data-evo-choose="${evo.id}" ${disabled?"disabled":""}>${label}</button></div>`
}
function renderActiveEvolution(){
 expireActiveEvolutionIfNeeded();const rows=activeEvolutionEntries();
 if(!rows.length)return'<div class="evo-empty">Keine Evolution aktiv. Wähle unter „Verfügbar“ eine Evolution und anschließend einen qualifizierten Spieler.</div>';
 return`<div class="evo-active-stack"><div class="evo-slot-summary">${rows.length}/${MAX_ACTIVE_EVOLUTIONS} aktive Evolutionen</div>${rows.map(entry=>{
  const evo=EVOLUTION_POOL.find(x=>x.id===entry.evoId),item=state.club.find(x=>x.uid===entry.uid);
  if(!evo||!item)return'<div class="evo-empty">Eine aktive Evolution konnte nicht geladen werden.</div>';
  const stage=Number(entry.stage||0),prog=state.evoProgress[entry.instanceKey]||{stage,matches:0,wins:0},b=displayBase(item),end=new Date(Number(entry.completionEnd||0));
  return`<div class="evo-active-card"><div class="evo-active-head"><div><span class="evo-live">AKTIV</span><h3>${esc(evo.name)}</h3><p>${esc(b.name)} · Stufe ${Math.min(stage+1,evo.stages.length)}/${evo.stages.length} · ${entry.paidWith==="coins"?currencyAmountHTML("coins",entry.paidAmount,"compact"):entry.paidWith==="points"?currencyAmountHTML("points",entry.paidAmount,"compact"):"Kostenlos"}</p></div><div class="evo-count"><b>${evoTimeLeft(end)}</b><span>Restzeit</span></div></div>${evoStagesHTML(item,evo,stage,prog,entry.baseline||null,entry.instanceKey)}<button class="secondary" data-cancel-evo-instance="${esc(entry.instanceKey)}">Evolution abbrechen</button></div>`
 }).join("")}</div>`
}
function renderEvoHistory(status){const rows=(state.evoHistory||[]).filter(x=>status==="completed"?x.status==="completed":x.status!=="completed");if(!rows.length)return'<div class="evo-empty">Hier gibt es noch keine Einträge.</div>';return rows.slice(0,20).map(h=>{const evo=EVOLUTION_POOL.find(x=>x.id===h.evoId),item=state.club.find(x=>x.uid===h.uid),b=item?displayBase(item):null;return`<div class="evo-history"><div><strong>${esc(evo?.name||h.evoId)}</strong><span>${b?esc(b.name):'Spieler'} · ${h.status==='completed'?'Abgeschlossen':h.status==='expired'?'Abgelaufen':'Abgebrochen'}</span></div>${b?`<div class="evo-history-card">${cardHTML(b,item,true)}</div>`:''}</div>`}).join("")}
function renderPastEvolutions(){const nowDefs=new Set(activeEvolutionDefinitions().map(x=>x.id)),previous=activeEvolutionDefinitions(new Date(Date.now()-7*86400000)).filter(x=>!nowDefs.has(x.id));const old=previous.map(evo=>{const sch=evolutionSchedule(evo,new Date(),-1);return`<div class="evo-offer expired"><div class="evo-offer-top"><div><span class="evo-live">ABGELAUFEN</span><h3>${esc(evo.name)}</h3><p>${esc(evo.subtitle)}</p></div></div><div class="evo-requirements">${esc(evoRequirementText(evo))}</div><div class="evo-deadlines"><span>Startphase beendet <b>${evoDate(sch.signupEnd)}</b></span></div></div>`}).join("");return old+renderEvoHistory("past")}
function renderEvos(){if(!$("evoGrid"))return;$("evoSummary").hidden=activeEvoTab==="cosmetic";expireActiveEvolutionIfNeeded();const tabs=[...document.querySelectorAll("[data-evo-tab]")];tabs.forEach(b=>b.classList.toggle("active",b.dataset.evoTab===activeEvoTab));const active=activeEvolutionDefinitions(),eligibleUnique=new Set(active.flatMap(e=>eligibleEvoPlayers(e).map(i=>String(i.uid)))).size;$("evoSummary").innerHTML=`<div><strong>${active.length} Evolutions live</strong><span>${eligibleUnique} verschiedene Karten in deinem Verein passend</span></div><div><strong>${activeEvolutionCount()}/${MAX_ACTIVE_EVOLUTIONS} aktiv</strong><span>Bis zu 3 Evolutionen gleichzeitig</span></div><div><strong>Season 1 · max. ${EVOLUTION_SEASON_MAX_OVR} GES</strong><span>Stat-Cap ${EVOLUTION_GLOBAL_STAT_CAP} · Evo-Ketten erlaubt</span></div>`;if(activeEvoTab==="available")$("evoGrid").innerHTML=active.slice().sort((a,b)=>(activeEvolutionDefinitionRunning(b.id)*2+(b.group==="event"))-(activeEvolutionDefinitionRunning(a.id)*2+(a.group==="event"))).map(renderAvailableEvolution).join("");else if(activeEvoTab==="active")$("evoGrid").innerHTML=renderActiveEvolution();else if(activeEvoTab==="cosmetic")globalThis.FooteraCosmetics.render();else if(activeEvoTab==="completed")$("evoGrid").innerHTML=renderEvoHistory("completed");else $("evoGrid").innerHTML=renderPastEvolutions();evoFocusPlayerUid=null}
$("evoTabs").addEventListener("click",e=>{const b=e.target.closest("[data-evo-tab]");if(!b)return;activeEvoTab=b.dataset.evoTab;renderEvos()});
$("evoGrid").addEventListener("click",e=>{const ch=e.target.closest("[data-evo-choose]"),claim=e.target.closest("[data-evo-claim-stage]"),cancel=e.target.closest("[data-cancel-evo-instance]");if(ch){openEvoPicker(ch.dataset.evoChoose);return}if(claim){claimEvolutionStage(claim.dataset.evoClaimInstance||"");return}if(cancel){const entry=activeEvolutionForInstance(cancel.dataset.cancelEvoInstance);if(!entry)return;if(!confirm("Evolution abbrechen? Bereits abgeschlossene Stufen bleiben erhalten."))return;removeActiveEvolutionInstance(entry.instanceKey,"cancelled");save();activeEvoTab=activeEvolutionCount()?"active":"available";renderAll();toast("Evolution abgebrochen.")}});
$("evoPickerClose").addEventListener("click",()=>closeUiLayer("evoPickerModal","evo-picker"));
$("evoPickerBody").addEventListener("input",e=>{if(e.target.id==="evoPickerSearch")applyEvoPickerFilter()});
$("evoPickerBody").addEventListener("click",e=>{const chip=e.target.closest("[data-evo-filter-pos]"),sortBtn=e.target.closest("[data-evo-filter-sort]");if(chip){chip.parentElement.querySelectorAll("[data-evo-filter-pos]").forEach(b=>{const on=b===chip;b.classList.toggle("active",on);b.setAttribute("aria-pressed",on?"true":"false")});applyEvoPickerFilter();return}if(sortBtn){const next={"":"high",high:"low",low:""}[sortBtn.dataset.evoFilterSort];sortBtn.dataset.evoFilterSort=next;sortBtn.classList.toggle("active",!!next);sortBtn.textContent=next==="high"?"GES ↓":next==="low"?"GES ↑":"⇅ GES";sortBtn.setAttribute("aria-label",`Sortierung: ${next==="high"?"höchste GES zuerst":next==="low"?"niedrigste GES zuerst":"empfohlen"}`);applyEvoPickerFilter();return}const cand=e.target.closest("[data-evo-candidate]"),back=e.target.closest("[data-evo-picker-back]"),start=e.target.closest("[data-evo-start]");if(cand&&evoPickerContext){const evo=EVOLUTION_POOL.find(x=>x.id===evoPickerContext.evoId),item=state.club.find(x=>x.uid===cand.dataset.evoCandidate);if(evo&&item)showEvoCandidateFromList(evo,item);return}if(back){if(evoPickerListStash){if(history.state?.kind==="evo-picker-preview")history.back();else restoreEvoPickerList()}else openEvoPicker(back.dataset.evoPickerBack);return}if(start){startEvolution(start.dataset.evoStart,start.dataset.evoUid,start.dataset.evoPay||"free")}});
function progressEvolution(resultKey="loss"){
 expireActiveEvolutionIfNeeded();const rows=activeEvolutionEntries();if(!rows.length)return;
 const kickoffStarters=Array.isArray(match?.initialStarters)?match.initialStarters:match?.lineup?.slice(0,11)||[];let changed=false;
 for(const entry of rows){
  const evo=EVOLUTION_POOL.find(x=>x.id===entry.evoId),item=state.club.find(x=>x.uid===entry.uid);
  if(!evo||!item||!kickoffStarters.includes(item.uid))continue;
  const stage=Number(entry.stage||0),st=evo.stages[stage];if(!st)continue;
  const key=entry.instanceKey,prog=state.evoProgress[key]||{uid:item.uid,stage,matches:0,wins:0,ready:false};
  if(prog.ready)continue;
  prog.matches=Number(prog.matches||0)+1;if(resultKey==="win")prog.wins=Number(prog.wins||0)+1;
  prog.ready=evoStageDone(st,prog);state.evoProgress[key]=prog;changed=true;
  if(prog.ready)toast(`${displayBase(item)?.name||"Spieler"}: Stufe ${stage+1} abgeschlossen – Upgrade abholen.`)
 }
 if(changed)save()
}



 let halloweenSbcShown=false;
 let activeSbcGroup="Täglich",activeSbcSet=null,activeSbcId=null,pendingSbcSubmissionId=null,sbcAssistantState=null,sbcSlotDetailState=null;
const SBC_WORKSPACE_KEY="gfutSbcWorkspaceV1882";
let SBC_WORKSPACE=(()=>{try{return JSON.parse(localStorage.getItem(SBC_WORKSPACE_KEY)||"{}")||{}}catch(e){return{}}})();
let sbcPickerState=null,sbcDragState=null,suppressSbcSlotClick=false,SBC_PICKER_FILTERS={};
function sbcDefaultPickerFilters(){return{query:"",position:"",quality:"",source:"",sort:"high",min:0,max:99,league:"",club:""}}
function rememberSbcPickerFilters(){
 if(!activeSbcId||!sbcPickerState)return;
 const {query,position,quality,source,sort,min,max,league,club}=sbcPickerState;
 SBC_PICKER_FILTERS[activeSbcId]={query,position,quality,source,sort,min,max,league,club}
}

function persistSbcWorkspace(){try{localStorage.setItem(SBC_WORKSPACE_KEY,JSON.stringify(SBC_WORKSPACE))}catch(e){}}
function sbcSourceItems(){return[...(state.club||[]).filter(i=>!isFounderItem(i)&&!isStoryItem(i)).map(i=>({item:i,source:"club"})),...(state.sbcStorage||[]).filter(i=>!isFounderItem(i)&&!isStoryItem(i)).map(i=>({item:i,source:"storage"}))]}
function sbcSourceMap(){return new Map(sbcSourceItems().map(x=>[String(x.item.uid),x]))}
function sbcDraft(id){
 const map=sbcSourceMap(),raw=SBC_WORKSPACE[id]||{},seen=new Set();
 const clean=(arr,len)=>Array.from({length:len},(_,i)=>{const uid=String(Array.isArray(arr)?arr[i]||"":"");if(!uid||!map.has(uid)||seen.has(uid))return null;seen.add(uid);return uid});
 const draft={squad:clean(raw.squad,11),test:clean(raw.test,12),testOpen:!!raw.testOpen};
 SBC_WORKSPACE[id]=draft;return draft
}
function sbcSetDraft(id,draft){SBC_WORKSPACE[id]=draft;persistSbcWorkspace()}
function sbcItemRecord(uid){return uid?sbcSourceMap().get(String(uid))||null:null}
function sbcSlotUid(draft,area,index){return area==="squad"?draft.squad[index]:draft.test[index]}
function sbcSetSlotUid(draft,area,index,uid){if(area==="squad")draft.squad[index]=uid||null;else draft.test[index]=uid||null}
function sbcFindUid(draft,uid){
 let i=draft.squad.indexOf(uid);if(i>=0)return{area:"squad",index:i};
 i=draft.test.indexOf(uid);return i>=0?{area:"test",index:i}:null
}
function sbcSwapSlots(id,fromArea,fromIndex,toArea,toIndex){
 const draft=sbcDraft(id),from=sbcSlotUid(draft,fromArea,fromIndex);if(!from)return false;
 const to=sbcSlotUid(draft,toArea,toIndex);
 sbcSetSlotUid(draft,toArea,toIndex,from);sbcSetSlotUid(draft,fromArea,fromIndex,to||null);sbcSetDraft(id,draft);return true
}
function sbcPlaceUid(id,uid,area,index){
 const draft=sbcDraft(id),map=sbcSourceMap();if(!map.has(String(uid)))return false;
 const target=sbcSlotUid(draft,area,index),from=sbcFindUid(draft,String(uid));
 if(from&&from.area===area&&from.index===index)return false;
 if(from){sbcSetSlotUid(draft,from.area,from.index,target||null);sbcSetSlotUid(draft,area,index,String(uid))}
 else sbcSetSlotUid(draft,area,index,String(uid));
 sbcSetDraft(id,draft);return true
}
function sbcRemoveUid(id,area,index){
 const draft=sbcDraft(id);if(!sbcSlotUid(draft,area,index))return false;sbcSetSlotUid(draft,area,index,null);sbcSetDraft(id,draft);return true
}
function sbcDraftChemistry(sbc,draft,map){
 const form=FORMATIONS["4-3-3"],xi=draft.squad.map((uid,i)=>{const item=uid?map.get(String(uid))?.item:null,base=item?displayBase(item):null;return base&&inPosition(base,form[i]?.p)?{base,icon:!!(base.isIcon||item.variant==="icon-mid"||isFounderItem(item))}:null});
 const clubs=new Map(),nations=new Map(),leagues=new Map();let icons=0;const add=(m,k)=>{if(k)m.set(k,(m.get(k)||0)+1)};
 for(const entry of xi){if(!entry)continue;const {base,icon}=entry;add(nations,chemNationKey(base.nation));if(icon){icons++;continue}add(clubs,base.team);add(leagues,base.league)}
 return xi.reduce((sum,entry)=>{if(!entry)return sum;if(entry.icon)return sum+3;const b=entry.base,club=clubs.get(b.team)||0,nation=nations.get(chemNationKey(b.nation))||0,league=(leagues.get(b.league)||0)+(b.league?icons:0);return sum+Math.min(3,chemThreshold(club,2,4,7)+chemThreshold(nation,2,5,8)+chemThreshold(league,3,5,8))},0)
}
function sbcDisplayedSquadRating(avg){
 const value=Math.max(0,Number(avg)||0),whole=Math.floor(value),fraction=value-whole;
 return whole+(fraction>=.8-1e-9?1:0)
}
function isTotwSbcItem(item){return !!item&&(item.cosmeticDesign==="totw"||String(item.eventType||"").toLowerCase().startsWith("totw")||/^team of the week/i.test(String(item.eventName||"")))}
function isMomentumSbcItem(item){return !!item&&(item.cosmeticDesign==="momentum"||String(item.eventType||"").toLowerCase().startsWith("momentum")||item.eventName==="MOMENTUM")}
function sbcDraftStats(sbc,draft=sbcDraft(sbc.id)){
 const map=sbcSourceMap(),items=draft.squad.map(uid=>uid?map.get(String(uid))?.item:null).filter(Boolean),count=items.length;
 const avg=count?items.reduce((n,i)=>n+itemRating(i),0)/count:0,teamRating=sbcDisplayedSquadRating(avg),allRule=count===sbc.count&&items.every(i=>sbc.filter(displayBase(i)));
 const bases=items.map(i=>displayBase(i)),affiliations=bases.map(b=>resolvedAffiliation(b)),leagues=[...new Set(affiliations.map(a=>a?.league).filter(Boolean))],clubs=[...new Set(affiliations.map(a=>a?.team).filter(Boolean))],nations=[...new Set(bases.map(b=>chemNationKey(b?.nation)).filter(Boolean))],allHaveLeague=items.every(i=>!!resolvedAffiliation(displayBase(i))?.league);
 const clubCounts={};for(const a of affiliations){const club=String(a?.team||"");if(club)clubCounts[club]=(clubCounts[club]||0)+1}
 const maxSameClub=Math.max(0,...Object.values(clubCounts)),rareCount=items.filter(i=>!!i.variant||!!i.cosmeticDesign||isCardRare(displayBase(i),i)).length,goldCount=items.filter(i=>rarityOf(displayBase(i))==="gold"||!!i.variant||!!i.evo||!!i.cosmeticDesign).length,chem=sbcDraftChemistry(sbc,draft,map);
 const avgOk=(!sbc.maxAvg||teamRating<=sbc.maxAvg)&&(!sbc.minAvg||teamRating>=sbc.minAvg),leagueOk=!sbc.sameLeague||(count===sbc.count&&allHaveLeague&&leagues.length===1);
 const minLeaguesOk=!sbc.minLeagues||leagues.length>=sbc.minLeagues,minClubsOk=!sbc.minClubs||clubs.length>=sbc.minClubs,maxSameClubOk=!sbc.maxSameClub||maxSameClub<=sbc.maxSameClub,minRareOk=!sbc.minRare||rareCount>=sbc.minRare,minGoldOk=!sbc.minGold||goldCount>=sbc.minGold;
 const requiredNationKey=chemNationKey(sbc.requiredNation||""),requiredNationCount=requiredNationKey?bases.filter(b=>chemNationKey(b?.nation)===requiredNationKey).length:0,requiredNationOk=!sbc.requiredNation||requiredNationCount>=1;
 const matchLeaguePlayers=sbc.matchLeague?affiliations.filter(a=>marqueeLeagueMatch(a?.league,sbc.matchLeague)).length:0,minMatchLeaguePlayersOk=!sbc.minMatchLeaguePlayers||matchLeaguePlayers>=sbc.minMatchLeaguePlayers;
 const minNationsOk=!sbc.minNations||nations.length>=sbc.minNations,maxNationsOk=!sbc.maxNations||nations.length<=sbc.maxNations;
 const matchClubCounts=(sbc.matchClubs||[]).map(aliases=>affiliations.filter(a=>marqueeClubMatch(a?.team,aliases)).length),eitherMatchClubCount=matchClubCounts.reduce((a,b)=>a+b,0),minEitherMatchClubOk=!sbc.minEitherMatchClub||eitherMatchClubCount>=sbc.minEitherMatchClub,requireBothMatchClubsOk=!sbc.requireBothMatchClubs||matchClubCounts.every(n=>n>=1);
 const minChemOk=!sbc.minChem||chem>=sbc.minChem;
 const totwCount=items.filter(isTotwSbcItem).length,minTotwOk=!sbc.minTotw||totwCount>=sbc.minTotw,momentumCount=items.filter(isMomentumSbcItem).length,minMomentumOk=!sbc.minMomentum||momentumCount>=sbc.minMomentum;
 const requiredClubCount=sbc.requiredClub?affiliations.filter(a=>marqueeClubMatch(a?.team,sbc.requiredClub==="Borussia Dortmund"?["Borussia Dortmund","Dortmund","BVB","BVB 09"]:[sbc.requiredClub])).length:0,requiredClubOk=!sbc.requiredClub||requiredClubCount>=1;
 const requiredLeagueCount=sbc.requiredLeague?affiliations.filter(a=>{const k=normalizeKey(a?.league||"");return sbc.requiredLeague==="MLS"?(k==="mls"||k==="major league soccer"):marqueeLeagueMatch(a?.league,sbc.requiredLeague)}).length:0,requiredLeagueOk=!sbc.requiredLeague||requiredLeagueCount>=1;
 const extrasOk=minLeaguesOk&&minClubsOk&&maxSameClubOk&&minRareOk&&minGoldOk&&requiredNationOk&&minMatchLeaguePlayersOk&&minNationsOk&&maxNationsOk&&minEitherMatchClubOk&&requireBothMatchClubsOk&&minChemOk&&minTotwOk&&minMomentumOk&&requiredClubOk&&requiredLeagueOk;
 return{items,count,avg,teamRating,leagues,clubs,nations,maxSameClub,rareCount,goldCount,chem,requiredNationCount,matchLeaguePlayers,matchClubCounts,eitherMatchClubCount,allRule,avgOk,leagueOk,minLeaguesOk,minClubsOk,maxSameClubOk,minRareOk,minGoldOk,requiredNationOk,minMatchLeaguePlayersOk,minNationsOk,maxNationsOk,minEitherMatchClubOk,requireBothMatchClubsOk,minChemOk,totwCount,minTotwOk,momentumCount,minMomentumOk,requiredClubCount,requiredClubOk,requiredLeagueCount,requiredLeagueOk,extrasOk,ok:count===sbc.count&&allRule&&avgOk&&leagueOk&&extrasOk}
}
function sbcRequirementSummary(sbc,stats){
 const reqs=[{label:"Spieler",value:`${stats.count}/${sbc.count}`,ok:stats.count===sbc.count}];
 if(sbc.minAvg)reqs.push({label:"Ø GES",value:`${stats.teamRating} / ${sbc.minAvg}+`,ok:stats.avgOk&&stats.count===sbc.count});
 if(sbc.maxAvg)reqs.push({label:"Ø GES",value:`${stats.teamRating} / max. ${sbc.maxAvg}`,ok:stats.avgOk&&stats.count===sbc.count});
 if(sbc.sameLeague)reqs.push({label:"Liga",value:stats.leagues.length===1&&stats.count===sbc.count?"1 Liga":`${stats.leagues.length} Ligen`,ok:stats.leagueOk&&stats.count===sbc.count});
 if(sbc.minLeagues)reqs.push({label:"Ligen",value:`${stats.leagues.length}/${sbc.minLeagues}`,ok:stats.minLeaguesOk});
 if(sbc.minClubs)reqs.push({label:"Vereine",value:`${stats.clubs.length}/${sbc.minClubs}`,ok:stats.minClubsOk});
 if(sbc.minMomentum)reqs.push({label:"MOMENTUM",value:String(stats.momentumCount)+"/"+String(sbc.minMomentum),ok:stats.minMomentumOk});
  if(sbc.minTotw)reqs.push({label:"TOTW",value:`${stats.totwCount}/${sbc.minTotw}`,ok:stats.minTotwOk});
 if(sbc.requiredClub)reqs.push({label:sbc.requiredClub==="Borussia Dortmund"?"BVB-Spieler":"Verein",value:`${stats.requiredClubCount}/1`,ok:stats.requiredClubOk});
 if(sbc.requiredLeague)reqs.push({label:sbc.requiredLeague==="MLS"?"MLS-Spieler":"Liga-Spieler",value:`${stats.requiredLeagueCount}/1`,ok:stats.requiredLeagueOk});
 if(sbc.minRare)reqs.push({label:"Seltene",value:`${stats.rareCount}/${sbc.minRare}`,ok:stats.minRareOk});
 if(sbc.minGold)reqs.push({label:"Gold",value:`${stats.goldCount}/${sbc.minGold}`,ok:stats.minGoldOk});
 if(sbc.maxSameClub)reqs.push({label:"Max. gleicher Verein",value:`${stats.maxSameClub}/${sbc.maxSameClub}`,ok:stats.maxSameClubOk});
 if(sbc.requiredNation)reqs.push({label:"Passende Nation",value:`${stats.requiredNationCount}/1`,ok:stats.requiredNationOk});
 if(sbc.minMatchLeaguePlayers)reqs.push({label:sbc.matchLeague||"Liga-Spieler",value:`${stats.matchLeaguePlayers}/${sbc.minMatchLeaguePlayers}`,ok:stats.minMatchLeaguePlayersOk});
 if(sbc.minNations)reqs.push({label:"Nationen",value:`${stats.nations.length}/${sbc.minNations}`,ok:stats.minNationsOk});
 if(sbc.maxNations)reqs.push({label:"Max. Nationen",value:`${stats.nations.length}/${sbc.maxNations}`,ok:stats.maxNationsOk});
 if(sbc.minEitherMatchClub)reqs.push({label:"Beteiligter Verein",value:`${stats.eitherMatchClubCount}/${sbc.minEitherMatchClub}`,ok:stats.minEitherMatchClubOk});
 if(sbc.requireBothMatchClubs)reqs.push({label:"Beide Vereine",value:`${stats.matchClubCounts.filter(n=>n>0).length}/2`,ok:stats.requireBothMatchClubsOk});
 if(sbc.minChem)reqs.push({label:"Chemie",value:`${stats.chem}/${sbc.minChem}`,ok:stats.minChemOk});
 if(reqs.length===1)reqs.push({label:"Passende Spieler",value:stats.allRule?"Erfüllt":"Alle Plätze füllen",ok:stats.allRule});
 return reqs
}
function sbcFailedRequirementText(sbc,stats){
 const failed=sbcRequirementSummary(sbc,stats).filter(r=>!r.ok);
 if(!stats.allRule&&!failed.some(r=>r.label==="Passende Spieler"))failed.unshift({label:"Passende Spieler",value:"Alle Plätze füllen"});
 if(!failed.length)return"";
 return "Noch offen: "+failed.map(r=>`${r.label} (${r.value})`).join(" · ")
}
// One live checklist: every requirement with its current value, plus "passende Spieler" whenever a card breaks the SBC filter.
function sbcChecklist(sbc,stats){
 const rows=sbcRequirementParts(sbc,stats);
 if(!rows.length)return sbcRequirementSummary(sbc,stats);
 if(!stats.allRule&&stats.count&&stats.count===sbc.count&&rows.every(r=>!/^11×/.test(r.label)))rows.push({label:"Passende Spieler",value:"Karte passt nicht",ok:false});
 return rows
}
function sbcMissingButtonText(sbc,stats){
 const open=sbcChecklist(sbc,stats).filter(r=>!r.ok);
 if(!open.length)return"Noch nicht abgabebereit";
 const first=open[0];return `Noch offen: ${first.label} ${first.value}${open.length>1?` · +${open.length-1}`:""}`
}
function sbcPackName(id){return ({bronze:"Bronze-Spielerpack",silver:"Silber-Spielerpack",gold:"Premium-Goldpack","82":"82+-Spielerpack","85":"85+-Spielerpack"})[id]||PACKS.find(p=>p.id===id)?.name||"Pack"}
function sbcRewardText(reward){return[reward?.coins?`${fmt(reward.coins)} Coins`:"",reward?.pack?`${(reward.qty||1)>1?`${reward.qty}× `:""}${sbcPackName(reward.pack)}`:""].filter(Boolean).join(" · ")}
function sbcRewardPackLabel(reward){
 if(reward?.pack)return sbcPackName(reward.pack);
 if(reward?.coins)return `${fmt(reward.coins)} Coins`;return"Belohnung"
}
function sbcRequirementChips(s,stats){
 return sbcRequirementParts(s,stats).map(({label,ok})=>`<span class="sbc-part-req ${ok?"ok":""}">${ok?"✓ ":""}${esc(label)}</span>`).join("")
}
// The SBC's own requirement text, split into parts, each with a live ✓/✗ and the current value.
function sbcRequirementParts(s,stats){
 const raw=String(s.req||"").split("·").map(x=>x.trim()).filter(Boolean);
 return raw.map((label,index)=>{
  let ok=false,value="";
  if(/^11 Spieler/i.test(label))ok=stats.count===s.count;
  else if(/^11×/i.test(label)||/^11 Gold/i.test(label)&&!s.minGold)ok=stats.count===s.count&&stats.allRule;
  else if(/GES/i.test(label))ok=stats.avgOk&&stats.count===s.count;
  else if(/Chemie/i.test(label))ok=stats.minChemOk;
  else if(/TOTW/i.test(label))ok=stats.minTotwOk;
  else if(/BVB-Spieler/i.test(label))ok=stats.requiredClubOk;
  else if(/MLS-Spieler/i.test(label))ok=stats.requiredLeagueOk;
  else if(/beiden beteiligten Vereinen/i.test(label))ok=stats.requireBothMatchClubsOk;
  else if(/beteiligten Verein/i.test(label))ok=stats.minEitherMatchClubOk;
  else if(/aus Bundesliga|aus Premier League|aus LALIGA|aus Serie A|aus Ligue 1/i.test(label))ok=stats.minMatchLeaguePlayersOk;
  else if(/max\. .*Nationen/i.test(label))ok=stats.maxNationsOk;
  else if(/Nationen/i.test(label))ok=stats.minNationsOk;
  else if(/Deutschland|England|Spanien|Italien|Frankreich|Germany|Spain|Italy|France/i.test(label))ok=stats.requiredNationOk;
  else if(/Liga/i.test(label)&&s.sameLeague)ok=stats.leagueOk&&stats.count===s.count;
  else if(/Ligen/i.test(label))ok=stats.minLeaguesOk;
  else if(/Vereine/i.test(label))ok=stats.minClubsOk;
  else if(/selten/i.test(label))ok=stats.minRareOk;
  else if(/Gold/i.test(label))ok=stats.minGoldOk;
  else if(/gleicher Verein/i.test(label))ok=stats.maxSameClubOk;
  else if(index===0)ok=stats.count===s.count&&stats.allRule;
  if(/^11/.test(label))value=`${stats.count}/${s.count}`;
  else if(/GES/i.test(label))value=stats.count?String(stats.teamRating):"–";
  else if(/Chemie/i.test(label))value=String(stats.chem);
  else if(/selten/i.test(label))value=String(stats.rareCount);
  else if(/Ligen/i.test(label))value=String(stats.leagues.length);
  else if(/Vereine/i.test(label))value=String(stats.clubs.length);
  else if(/Nationen/i.test(label))value=String(stats.nations.length);
  else if(/Gold/i.test(label))value=String(stats.goldCount);
  return{label,ok,value}
 })
}
// Can the club build this SBC right now? Uses the same "Sparsam" assistant on an empty squad, cached per club state.
let sbcFeasibilityCache={key:"",map:new Map()};
function sbcFeasibilityKey(){return [(state.club||[]).length,(state.sbcStorage||[]).length,(state.club||[]).reduce((n,i)=>n+itemRating(i),0),JSON.stringify((state.squadPresets||[]).map(p=>p?.squad||[]))].join("|")}
function sbcFeasibility(sbc){
 const key=sbcFeasibilityKey();if(sbcFeasibilityCache.key!==key)sbcFeasibilityCache={key,map:new Map()};
 if(sbcFeasibilityCache.map.has(sbc.id))return sbcFeasibilityCache.map.get(sbc.id);
 const draft={squad:Array(sbc.count||11).fill(null),test:[]},a={...sbcAssistantDefaults(),anyPositionFallback:true};
 let result;
 const free=sbcAssistantBest(sbc,draft,a);
 if(free?.valid)result={ok:true,teams:false};
 else{
  const all=sbcAssistantBest(sbc,draft,{...a,protectTeams:false});
  if(all?.valid)result={ok:true,teams:true};
  else{const count=Math.max(free?.count||0,all?.count||0),missing=(sbc.count||11)-count;result={ok:false,missing,reason:missing>0?"":(sbcChecklist(sbc,sbcDraftStats(sbc,(all||free).draft)).find(r=>!r.ok)?.label||"")}}
 }
 sbcFeasibilityCache.map.set(sbc.id,result);return result
}
function sbcFeasibilityHTML(sbc){
 const f=sbcFeasibility(sbc);
 if(f.ok)return `<span class="sbc-feasible ok">${f.teams?"✓ Machbar, nur mit Spielern aus deinen Teams":"✓ Mit deinem Verein machbar"}</span>`;
 if(f.missing>0)return `<span class="sbc-feasible">Dir ${f.missing===1?"fehlt 1 passender Spieler":`fehlen ${f.missing} passende Spieler`}</span>`;
 return `<span class="sbc-feasible">Noch nicht machbar${f.reason?` · ${esc(f.reason)} fehlt`:""}</span>`
}
function sbcOverviewCard(s){
 const stats=sbcDraftStats(s),done=sbcIsCompleted(s),ready=!done&&stats.ok,pct=done?100:Math.round(Math.min(1,stats.count/Math.max(1,s.count))*100),rewardName=sbcRewardPackLabel(s.reward);
 if(s.groupSet){
  const rows=allActiveSBCs().filter(x=>x.groupSet===s.groupSet),idx=Math.max(0,rows.findIndex(x=>x.id===s.id)),total=Math.max(1,rows.length);
  const rewardVisual=s.reward?.pack?`<img src="${packArtSrc(s.reward.pack)}" alt="${esc(rewardName)}" loading="lazy">`:"";
  const stateClass=done?"done":ready?"ready":"",stateText=done?"ABGESCHLOSSEN":ready?"ABGABEBEREIT":"OFFEN";
  return `<article class="sbc-part-card ${done?"completed":ready?"ready":""}"><div class="sbc-part-copy"><div class="sbc-part-head"><span class="sbc-part-index">TEIL-SBC ${idx+1}/${total}</span><span class="sbc-part-state ${stateClass}">${stateText}</span>${s.live&&s.expiresAt&&!done?`<span class="sbc-part-state">Noch ${sbcTimeLeft(s.expiresAt)}</span>`:""}</div><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p><div class="sbc-part-req-title">ANFORDERUNGEN</div><div class="sbc-part-reqs">${sbcRequirementChips(s,stats)}</div><div class="sbc-part-prep"><span>Vorbereitung</span><div class="sbc-part-prep-track"><i style="width:${pct}%"></i></div><b>${done?"✓":`${stats.count}/${s.count}`}</b></div>${done||ready?"":`<div class="sbc-hub-status">${sbcFeasibilityHTML(s)}</div>`}</div><div class="sbc-part-reward">${done?'<span class="done-mark">✓</span>':rewardVisual}<strong>${esc(rewardName)}</strong><button class="${ready?"primary":"secondary"}" type="button" data-sbc-open="${esc(s.id)}" ${done?"disabled":""}>${done?"Erledigt":ready?"Abgeben":"Bauen"}</button></div></article>`
 }
 const rewardArt=s.reward?.pack?`<div class="sbc-hub-pack"><img src="${packArtSrc(s.reward.pack)}" alt="${esc(rewardName)}" loading="lazy"></div><span class="sbc-reward-name">${esc(rewardName)}</span>`:`<span class="sbc-reward-name">${esc(rewardName)}</span>`;
 return `<article class="sbc-hub-card ${done?"completed":""}"><div><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p><div class="sbc-hub-meta">${String(s.req||"").split("·").map(x=>x.trim()).filter(Boolean).map(x=>`<span class="sbc-hub-chip req">${esc(x)}</span>`).join("")}</div><div class="sbc-hub-status">${done?`<span class="sbc-feasible ok">✓ Abgeschlossen</span>`:ready?`<span class="sbc-feasible ok">✓ Abgabebereit</span>`:sbcFeasibilityHTML(s)}${!done&&stats.count?`<span class="sbc-hub-progress">${stats.count}/${s.count} eingesetzt</span>`:""}${s.live&&s.expiresAt&&!done?`<span class="sbc-hub-progress">Noch ${sbcTimeLeft(s.expiresAt)}</span>`:""}</div></div><div class="sbc-hub-reward">${rewardArt}<button class="secondary" type="button" data-sbc-open="${esc(s.id)}" ${done?"disabled":""}>${done?"Erledigt":"Bauen"}</button></div></article>`
}
function sbcWorkSlotHTML(sbc,area,index,slot=null){
 const draft=sbcDraft(sbc.id),uid=sbcSlotUid(draft,area,index),row=sbcItemRecord(uid),item=row?.item,b=item?displayBase(item):null,label=slot?.p||"";
 if(!item)return `<div class="sbc-work-slot ${area==="test"?"sbc-test-slot":""}" data-sbc-area="${area}" data-sbc-index="${index}" ${area==="squad"&&slot?`style="left:${slot.x}%;top:${slot.y}%"`:""} role="button" tabindex="0"><div class="sbc-empty-slot"><div><b>+</b><span>${esc(area==="squad"?positionLabel(label):"PLATZ")}</span></div></div></div>`;
 const shown=area==="squad"&&slot?.p?slot.p:b.position;
 return `<div class="sbc-work-slot filled ${area==="test"?"sbc-test-slot":""}" data-sbc-area="${area}" data-sbc-index="${index}" ${area==="squad"&&slot?`style="left:${slot.x}%;top:${slot.y}%"`:""} role="button" tabindex="0"><div class="sbc-card-wrap">${cardHTML(b,item,true,shown)}</div><button class="sbc-slot-remove" type="button" data-sbc-remove="${area}:${index}" aria-label="Spieler entfernen">×</button></div>`
}
function sbcPickerTargetLabel(){
 if(!sbcPickerState)return"";if(sbcPickerState.area==="test")return `Testareal · Platz ${sbcPickerState.index+1}`;
 const slot=FORMATIONS["4-3-3"][sbcPickerState.index];return `SBC-Aufstellung · ${positionLabel(slot?.p||"")}`
}
function sbcTeamUsageForUid(uid){
 const out=[];for(const preset of state.squadPresets||[]){if(preset?.squad?.includes(uid))out.push(preset.name||"Team")}
 return out
}
function sbcSubmissionRisks(sbc){
 const stats=sbcDraftStats(sbc),risks=[];
 for(const item of stats.items){const teams=sbcTeamUsageForUid(item.uid),evolution=activeEvolutionForUid(item.uid);if(teams.length||evolution)risks.push({item,teams,evolution})}
 return risks
}
function sbcWarningHTML(sbc){
 if(!pendingSbcSubmissionId||pendingSbcSubmissionId!==sbc.id)return"";
 const risks=sbcSubmissionRisks(sbc);if(!risks.length)return"";
 return `<div class="sbc-team-warning" role="dialog" aria-modal="true" aria-label="SBC Sicherheitsabfrage"><div class="sbc-team-warning-card"><div class="sbc-team-warning-head"><div class="sbc-warning-icon">!</div><div><h3>Spieler aus deinen Teams oder einer Evolution ausgewählt</h3><p>Wenn du fortfährst, werden diese Karten dauerhaft abgegeben. Betroffene Kaderplätze werden frei und aktive Evolutionen dieser Spieler beendet.</p></div></div><div class="sbc-warning-list">${risks.map(r=>{const b=displayBase(r.item);return `<div class="sbc-warning-player"><div>${cardHTML(b,r.item,true)}</div><div><strong>${esc(b?.name||"Spieler")} · ${itemRating(r.item)} ${esc(positionLabel(b?.position,b))}</strong>${r.teams.length?`<small>Wird aus folgenden Mannschaften entfernt:</small><div>${r.teams.map(t=>`<span class="sbc-warning-team-pill">${esc(t)}</span>`).join("")}</div>`:""}${r.evolution?`<small>Aktive Evolution wird beendet. Nicht abgeholte Upgrades gehen verloren.</small>`:""}</div></div>`}).join("")}</div><div class="sbc-warning-actions"><button type="button" class="secondary" data-sbc-warning-replace>Spieler austauschen</button><button type="button" class="danger-confirm" data-sbc-warning-confirm>Trotzdem abgeben</button><button type="button" class="sbc-warning-cancel" data-sbc-warning-cancel>Abbrechen und SBC weiter bearbeiten</button></div></div></div>`
}
function sbcPickerFacetRows(){
 if(!sbcPickerState)return[];const source=String(sbcPickerState.source||""),quality=String(sbcPickerState.quality||""),pos=String(sbcPickerState.position||""),min=Number(sbcPickerState.min??0),max=Number(sbcPickerState.max??99);
 return sbcSourceItems().filter(x=>{const b=displayBase(x.item),rating=itemRating(x.item);if(!b)return false;if(source&&x.source!==source)return false;if(pos&&!playerPositions(b).includes(pos))return false;if(rating<min||rating>max)return false;if(quality){const cls=pickerItemQuality(x.item,b);if(cls!==quality)return false}return true})
}
function sbcPickerLeagues(){
 return [...new Set(sbcPickerFacetRows().map(x=>String(resolvedAffiliation(displayBase(x.item))?.league||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"))
}
function sbcPickerClubs(){
 const league=String(sbcPickerState?.league||"");
 return [...new Set(sbcPickerFacetRows().filter(x=>!league||String(resolvedAffiliation(displayBase(x.item))?.league||"")===league).map(x=>String(resolvedAffiliation(displayBase(x.item))?.team||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"))
}
function normalizeSbcPickerClub(){
 if(!sbcPickerState)return;const clubs=sbcPickerClubs();if(sbcPickerState.club&&!clubs.includes(sbcPickerState.club))sbcPickerState.club=""
}
function sbcPickerCandidates(){
 if(!activeSbcId||!sbcPickerState)return[];const draft=sbcDraft(activeSbcId),current=sbcSlotUid(draft,sbcPickerState.area,sbcPickerState.index),used=new Set([...draft.squad,...draft.test].filter(Boolean).filter(uid=>uid!==current));
 const q=normalizeKey(sbcPickerState.query||""),pos=String(sbcPickerState.position||""),quality=String(sbcPickerState.quality||""),source=String(sbcPickerState.source||""),league=String(sbcPickerState.league||""),club=String(sbcPickerState.club||""),min=Number(sbcPickerState.min??0),max=Number(sbcPickerState.max??99);
 const seen=new Set();let rows=sbcSourceItems().filter(x=>!used.has(String(x.item.uid))).filter(x=>{
  const b=displayBase(x.item),rating=itemRating(x.item);if(!b)return false;const a=resolvedAffiliation(b);
  if(q&&!playerSearchText(b).includes(q))return false;if(pos&&!playerPositions(b).includes(pos))return false;
  if(source&&x.source!==source)return false;if(rating<min||rating>max)return false;
  if(quality){const cls=pickerItemQuality(x.item,b);if(cls!==quality)return false}
  if(league&&String(a?.league||"")!==league)return false;if(club&&String(a?.team||"")!==club)return false;
  const uid=String(x.item.uid);if(seen.has(uid))return false;seen.add(uid);return true
 });
 rows.sort((a,b)=>{if(sbcPickerState.sort==="new")return Number(b.item.acquired||0)-Number(a.item.acquired||0);if(sbcPickerState.sort==="old")return Number(a.item.acquired||0)-Number(b.item.acquired||0);const ar=itemRating(a.item),br=itemRating(b.item);if(sbcPickerState.sort==="low")return ar-br;return br-ar});
 return rows.slice(0,120)
}
function sbcPickerHTML(){
 if(!sbcPickerState)return"";normalizeSbcPickerClub();rememberSbcPickerFilters();const rows=sbcPickerCandidates(),leagues=sbcPickerLeagues(),clubs=sbcPickerClubs(),min=Number(sbcPickerState.min??0),max=Number(sbcPickerState.max??99);
 return `<div class="sbc-player-picker" id="sbcPlayerPicker"><div class="sbc-player-picker-inner"><div class="sbc-picker-head"><div><h3>Vereinssuche</h3><p>${esc(sbcPickerTargetLabel())} · Spieler auswählen</p></div><button type="button" class="secondary" data-sbc-picker-close>×</button></div><div class="sbc-picker-filters">
  <div class="sbc-picker-field full"><label>Spielername</label><input id="sbcPickerName" type="search" value="${esc(sbcPickerState.query||"")}" placeholder="Spielername eingeben" autocomplete="off"></div>
  <div class="sbc-picker-field"><label>Position+</label><select id="sbcPickerPosition"><option value="">Beliebig</option>${["GK","CB","LB","RB","LWB","RWB","CDM","CM","CAM","LM","RM","LW","RW","ST"].map(p=>`<option value="${p}" ${sbcPickerState.position===p?"selected":""}>${positionLabel(p)}+</option>`).join("")}</select></div>
  <div class="sbc-picker-field"><label>Qualität</label><select id="sbcPickerQuality"><option value="">Alle Qualitäten</option><option value="gold" ${sbcPickerState.quality==="gold"?"selected":""}>Gold</option><option value="silver" ${sbcPickerState.quality==="silver"?"selected":""}>Silber</option><option value="bronze" ${sbcPickerState.quality==="bronze"?"selected":""}>Bronze</option><option value="special" ${sbcPickerState.quality==="special"?"selected":""}>Spezial</option></select></div>
  <div class="sbc-picker-field"><label>Liga</label><select id="sbcPickerLeague"><option value="">Alle Ligen</option>${leagues.map(v=>`<option value="${esc(v)}" ${sbcPickerState.league===v?"selected":""}>${esc(v)}</option>`).join("")}</select></div>
  <div class="sbc-picker-field"><label>Verein</label><select id="sbcPickerClub"><option value="">Alle Vereine</option>${clubs.map(v=>`<option value="${esc(v)}" ${sbcPickerState.club===v?"selected":""}>${esc(v)}</option>`).join("")}</select></div>
  <div class="sbc-picker-field"><label>Quelle</label><select id="sbcPickerSource"><option value="">Verein + SBC-Speicher</option><option value="club" ${sbcPickerState.source==="club"?"selected":""}>Mein Verein</option><option value="storage" ${sbcPickerState.source==="storage"?"selected":""}>SBC-Speicher</option></select></div>
  <div class="sbc-picker-field"><label>Sortieren</label><select id="sbcPickerSort"><option value="high" ${sbcPickerState.sort==="high"?"selected":""}>GES: hoch → niedrig</option><option value="low" ${sbcPickerState.sort==="low"?"selected":""}>GES: niedrig → hoch</option><option value="new" ${sbcPickerState.sort==="new"?"selected":""}>Neueste zuerst</option><option value="old" ${sbcPickerState.sort==="old"?"selected":""}>Älteste zuerst</option></select></div>
  <div class="sbc-picker-field full"><label>GES-Bereich</label><div class="sbc-picker-range-card"><div class="sbc-picker-range-head"><span id="sbcPickerRangeLabel">${min}–${max} GES</span></div><div class="sbc-picker-range-sliders"><input id="sbcPickerMinRange" type="range" min="0" max="99" step="1" value="${min}" aria-label="Minimales Rating"><input id="sbcPickerMaxRange" type="range" min="0" max="99" step="1" value="${max}" aria-label="Maximales Rating"></div><div class="sbc-picker-rating"><input id="sbcPickerMin" type="number" min="0" max="99" value="${min}" placeholder="Min. GES"><input id="sbcPickerMax" type="number" min="0" max="99" value="${max}" placeholder="Max. GES"></div></div></div>
 </div><div class="sbc-source-switch"><button type="button" class="sbc-source-btn ${sbcPickerState.source!=="storage"?"active":""}" data-sbc-source-quick="club"><b>Mein Verein</b><span>${(state.club||[]).length} Spieler</span></button><button type="button" class="sbc-source-btn ${sbcPickerState.source==="storage"?"active":""}" data-sbc-source-quick="storage"><b>SBC-Speicher</b><span>${(state.sbcStorage||[]).length} Spieler</span></button></div><div class="sbc-picker-results-head"><span id="sbcPickerResultCount">${rows.length} Spieler angezeigt</span><span>${sbcPickerState.source==="storage"?"SBC-Speicher":sbcPickerState.source==="club"?"Verein":"Verein + Speicher"} · Tippen = einsetzen</span></div><div class="sbc-picker-grid" id="sbcPickerResults">${sbcPickerResultsHTML(rows)}</div></div></div>`
}
function sbcPickerResultsHTML(rows=sbcPickerCandidates()){
 return rows.length?rows.map(x=>{const i=x.item,b=displayBase(i),teams=sbcTeamUsageForUid(i.uid);return `<button type="button" class="sbc-pick-card" data-sbc-pick-uid="${esc(i.uid)}">${cardHTML(b,i,true)}<strong>${esc(b.name)}</strong><small>${itemRating(i)} · ${esc(positionLabel(b.position,b))} · ${x.source==="storage"?"SBC-Speicher":"Verein"}</small>${teams.length?`<span class="sbc-pick-team-tag">In: ${esc(teams.join(" · "))}</span>`:""}</button>`}).join(""):'<div class="online-note" style="grid-column:1/-1">Keine Spieler für diese Filter gefunden.</div>'
}
function renderSbcPickerResults(){
 const grid=$("sbcPickerResults"),count=$("sbcPickerResultCount");if(!grid||!sbcPickerState)return;const rows=sbcPickerCandidates();grid.innerHTML=sbcPickerResultsHTML(rows);if(count)count.textContent=`${rows.length} Spieler angezeigt`
}
function openSbcPicker(area,index){
 if(!activeSbcId)return;const saved={...sbcDefaultPickerFilters(),...(SBC_PICKER_FILTERS[activeSbcId]||{})};sbcPickerState={...saved,area,index};normalizeSbcPickerClub();renderSBC();setTimeout(()=>$("sbcPickerName")?.focus(),40)
}
function openSbcSlotDetail(index){
 if(!activeSbcId||!Number.isInteger(index)||index<0||index>=11)return;
 sbcPickerState=null;sbcAssistantState=null;sbcSlotDetailState={index};renderSBC()
}
function closeSbcSlotDetail(){sbcSlotDetailState=null;sbcPickerState=null;renderSBC()}
function moveSbcSlotDetail(delta){
 if(!sbcSlotDetailState)return;const next=(Number(sbcSlotDetailState.index||0)+Number(delta||0)+11)%11;sbcSlotDetailState={index:next};renderSBC()
}
function sbcSlotDetailHTML(sbc){
 if(!sbcSlotDetailState)return"";
 const index=Math.max(0,Math.min(10,Number(sbcSlotDetailState.index||0))),formation=FORMATIONS["4-3-3"],slot=formation[index],draft=sbcDraft(sbc.id),uid=draft.squad[index],row=sbcItemRecord(uid),item=row?.item,b=item?displayBase(item):null,pos=slot?.p||"";
 const card=b?`<div class="sbc-slot-card-large">${cardHTML(b,item,false,pos)}</div><div class="sbc-slot-player-name">${esc(b.name)}</div><div class="sbc-slot-player-meta">${itemRating(item)} GES · ${esc(positionLabel(b.position,b))} · ${esc(playerClubLabel(b))}</div>`:`<div class="sbc-slot-empty-large"><div><b>+</b><span>${esc(positionLabel(pos))}</span></div></div>`;
 const action=b?`<button type="button" class="primary" data-sbc-slot-add>Spieler austauschen</button><button type="button" class="danger" data-sbc-slot-remove-detail>Spieler entfernen</button>`:`<button type="button" class="primary" data-sbc-slot-add>Spieler hinzufügen</button>`;
 return `<div class="sbc-slot-detail"><div class="sbc-slot-detail-inner"><div class="sbc-slot-detail-head"><button type="button" class="sbc-slot-detail-back" data-sbc-slot-detail-close>‹</button><div class="sbc-slot-detail-title"><strong>Kaderplatz</strong><span>POS: ${esc(positionLabel(pos))}</span></div><div class="sbc-slot-count">${index+1}/11</div></div><div class="sbc-slot-detail-stage"><button type="button" class="sbc-slot-nav" data-sbc-slot-prev aria-label="Vorheriger Platz">‹</button><div class="sbc-slot-detail-center">${card}<div class="sbc-slot-position">SBC-POSITION · ${esc(positionLabel(pos))}</div></div><button type="button" class="sbc-slot-nav" data-sbc-slot-next aria-label="Nächster Platz">›</button></div><div class="sbc-slot-detail-actions">${action}</div><div class="sbc-slot-detail-tip">Mit den Pfeilen wechselst du direkt zwischen allen 11 SBC-Plätzen.</div></div></div>`
}
function sbcAssistantLeagues(sbc){
 const rows=sbcSourceItems().filter(x=>{const b=displayBase(x.item);return b&&sbc.filter(b)});
 return [...new Set(rows.map(x=>String(resolvedAffiliation(displayBase(x.item))?.league||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"))
}
function openSbcAssistant(){
 if(!activeSbcId)return;const sbc=getActiveSbcById(activeSbcId);if(!sbc)return;
 sbcSlotDetailState=null;sbcPickerState=null;sbcAssistantState=sbcAssistantDefaults();renderSBC()
}
// "Sparsam" spends SBC-Speicher duplicates first, then untradeable cards, then the weakest cards that still meet the SBC.
function sbcQuickFill(){
 if(!activeSbcId)return;sbcSlotDetailState=null;sbcPickerState=null;sbcAssistantState={...sbcAssistantDefaults(),anyPositionFallback:true};runSbcAssistant();
 if(sbcAssistantState){sbcAssistantState=null;renderSBC()}
}
function sbcAssistantDefaults(){return{sort:"smart",min:0,max:99,quality:"",ignorePosition:false,league:"",protectTeams:true}}
function sbcAssistantHTML(sbc){
 if(!sbcAssistantState)return"";
 const a=sbcAssistantState,leagues=sbcAssistantLeagues(sbc),available=sbcSourceItems().length,protectedCount=sbcSourceItems().filter(x=>sbcTeamUsageForUid(x.item.uid).length).length;
 return `<div class="sbc-assistant"><div class="sbc-assistant-inner"><div class="sbc-assistant-head"><button type="button" class="sbc-assistant-back" data-sbc-assistant-close>‹</button><div><h3>Assistent</h3><p>Automatischer SBC-Aufbau nach deinen Vorgaben</p></div></div><div class="sbc-assistant-panel">
 <div class="sbc-assistant-toggle"><div><strong>Spieler aus meinen 3 Teams schützen</strong><small>Verwendete Karten werden vom Assistenten übersprungen.</small></div><label class="sbc-switch"><input id="sbcAssistantProtect" type="checkbox" ${a.protectTeams?"checked":""}><span></span></label></div>
 <div class="sbc-assistant-toggle"><div><strong>Position ignorieren</strong><small>An: beste Karten beliebig einsetzen · Aus: nur passende Positionen.</small></div><label class="sbc-switch"><input id="sbcAssistantIgnorePosition" type="checkbox" ${a.ignorePosition?"checked":""}><span></span></label></div>
 <div class="sbc-assistant-grid">
  <div class="sbc-assistant-field full"><label>Sortieren nach</label><select id="sbcAssistantSort"><option value="smart" ${a.sort==="smart"?"selected":""}>Sparsam: Duplikate und schwächste zuerst</option><option value="high" ${a.sort==="high"?"selected":""}>GES: hoch bis niedrig</option><option value="low" ${a.sort==="low"?"selected":""}>GES: niedrig bis hoch</option></select></div>
  <div class="sbc-assistant-field full"><label>GES-Bereich</label><div class="sbc-assistant-range"><input id="sbcAssistantMin" type="number" min="0" max="99" value="${Number(a.min)}" placeholder="Min. GES"><input id="sbcAssistantMax" type="number" min="0" max="99" value="${Number(a.max)}" placeholder="Max. GES"></div></div>
  <div class="sbc-assistant-field"><label>Qualität</label><select id="sbcAssistantQuality"><option value="">Alle</option><option value="bronze" ${a.quality==="bronze"?"selected":""}>Bronze</option><option value="silver" ${a.quality==="silver"?"selected":""}>Silber</option><option value="gold" ${a.quality==="gold"?"selected":""}>Gold</option><option value="special" ${a.quality==="special"?"selected":""}>Spezial</option></select></div>
  <div class="sbc-assistant-field"><label>Liga</label><select id="sbcAssistantLeague"><option value="">Alle / automatisch</option>${leagues.map(l=>`<option value="${esc(l)}" ${a.league===l?"selected":""}>${esc(l)}</option>`).join("")}</select></div>
 </div>
 <div class="sbc-assistant-hint"><strong>SBC-Anforderung wird immer berücksichtigt.</strong> Manuell gesetzte Spieler bleiben stehen; nur freie Plätze werden aufgefüllt. Bei „11 Spieler aus 1 Liga“ wählt der Assistent ohne Liga-Vorgabe automatisch eine geeignete Liga. Verfügbar: ${available} Karten${protectedCount?` · davon ${protectedCount} aktuell in Teams`:""}.</div>
 <div class="sbc-assistant-actions"><button type="button" class="secondary" data-sbc-assistant-close>Zurück</button><button type="button" class="primary" data-sbc-assistant-build>Aufbau</button></div>
 <div class="sbc-assistant-summary">Quelle: Mein Verein + SBC-Speicher</div></div></div></div>`
}
function sbcAssistantQuality(item,b){
 if(item?.variant||item?.evo||item?.cosmeticDesign)return"special";return rarityOf(b)
}
function sbcAssistantBasePool(sbc,draft,a){
 const used=new Set([...draft.squad,...draft.test].filter(Boolean)),seen=new Set();
 let rows=sbcSourceItems().filter(x=>!used.has(String(x.item.uid))).filter(x=>{
  const b=displayBase(x.item),rating=itemRating(x.item);if(!b||!sbc.filter(b))return false;
  if(a.protectTeams&&sbcTeamUsageForUid(x.item.uid).length)return false;
  if(rating<Number(a.min||0)||rating>Number(a.max??99))return false;
  if(a.quality&&sbcAssistantQuality(x.item,b)!==a.quality)return false;
  if(a.league&&String(resolvedAffiliation(b)?.league||"")!==a.league)return false;
  const uid=String(x.item.uid);if(seen.has(uid))return false;seen.add(uid);return true
 });
 if(a.sort==="smart")rows.sort((x,y)=>sbcAssistantCost(x)-sbcAssistantCost(y));
 else rows.sort((x,y)=>{const d=itemRating(y.item)-itemRating(x.item);return a.sort==="low"?-d:d});
 return rows
}
function sbcAssistantCost(row){return itemRating(row.item)-(row.source==="storage"?100:0)-(row.item?.tradeable===false?3:0)}
function sbcAssistantBetter(x,y,a){
 if(!y)return true;if(x.valid!==y.valid)return x.valid;if(x.count!==y.count)return x.count>y.count;
 if(a.sort==="smart")return x.cost<y.cost;
 return a.sort==="low"?x.rating<y.rating:x.rating>y.rating
}
// Cheapest valid squad: try every rating floor so an average requirement is met with the weakest cards possible.
function sbcAssistantSmartPlan(sbc,draft,a,rows,empty,league){
 const floors=[...new Set(rows.map(r=>itemRating(r.item)))].sort((x,y)=>x-y);let best=null;
 for(const floor of floors){
  const pool=rows.filter(r=>itemRating(r.item)>=floor);if(pool.length<empty.length&&best)break;
  const plan=sbcAssistantPlan(sbc,draft,a,pool,empty,league);if(plan&&sbcAssistantBetter(plan,best,a))best=plan
 }
 return best
}
function sbcAssistantBest(sbc,draft,a,manualLeagues=[]){
 const empty=draft.squad.map((uid,i)=>uid?null:i).filter(i=>i!==null),rows=sbcAssistantBasePool(sbc,draft,a);
 const leagues=a.league?[a.league]:sbc.sameLeague?(manualLeagues.length?manualLeagues:[...new Set(rows.map(x=>String(resolvedAffiliation(displayBase(x.item))?.league||"")).filter(Boolean))]):[""];
 let best=null;
 for(const league of leagues){const plan=a.sort==="smart"?sbcAssistantSmartPlan(sbc,draft,a,rows,empty,league):sbcAssistantPlan(sbc,draft,a,rows,empty,league);if(plan&&sbcAssistantBetter(plan,best,a))best=plan}
 // One-tap fill: SBCs do not require positions, so fall back to any position when position matching leaves gaps.
 if(a.anyPositionFallback&&!a.ignorePosition&&!best?.valid){const loose=sbcAssistantBest(sbc,draft,{...a,ignorePosition:true,anyPositionFallback:false},manualLeagues);if(loose&&sbcAssistantBetter(loose,best,a))best=loose}
 return best
}
function sbcAssistantPlan(sbc,draft,a,rows,empty,league){
 const pool=league?rows.filter(x=>String(resolvedAffiliation(displayBase(x.item))?.league||"")===league):rows;if(!pool.length)return null;
 const build=ordered=>{
  const choices=new Map(empty.map(slot=>[slot,ordered.map((row,i)=>a.ignorePosition||posFit(displayBase(row.item),FORMATIONS["4-3-3"][slot]?.p)>0?i:-1).filter(i=>i>=0)]));
  const assigned=new Map(),place=(slot,seen)=>{
   for(const i of choices.get(slot)||[]){if(seen.has(i))continue;seen.add(i);const previous=assigned.get(i);if(previous===undefined||place(previous,seen)){assigned.set(i,slot);return true}}
   return false
  };
  for(const slot of [...empty].sort((x,y)=>(choices.get(x)?.length||0)-(choices.get(y)?.length||0)))if((choices.get(slot)||[]).length)place(slot,new Set());
  if(!assigned.size)return null;
  const planned={...draft,squad:[...draft.squad]};for(const [i,slot] of assigned)planned.squad[slot]=String(ordered[i].item.uid);
  const stats=sbcDraftStats(sbc,planned),rating=[...assigned.entries()].reduce((n,[i])=>n+itemRating(ordered[i].item),0),cost=[...assigned.keys()].reduce((n,i)=>n+sbcAssistantCost(ordered[i]),0);
  return{draft:planned,league,rating,cost,count:assigned.size,valid:stats.ok}
 };
 let best=null;for(const plan of [build(pool),build([...pool].reverse())])if(plan&&sbcAssistantBetter(plan,best,a))best=plan;
 return best
}
function runSbcAssistant(){
 const sbc=getActiveSbcById(activeSbcId),a=sbcAssistantState;if(!sbc||!a)return;
 if(Number(a.min)>Number(a.max))return toast("Min. GES darf nicht über Max. GES liegen.");
 const draft=sbcDraft(sbc.id),empty=draft.squad.map((uid,i)=>uid?null:i).filter(i=>i!==null);
 if(!empty.length){sbcAssistantState=null;renderSBC();return toast("Alle 11 SBC-Plätze sind bereits belegt.")}
 const manual=draft.squad.map(uid=>sbcItemRecord(uid)?.item).filter(Boolean);
 if(manual.some(item=>!sbc.filter(displayBase(item))))return toast("Eine manuell eingesetzte Karte erfüllt die SBC-Bedingung nicht. Bitte zuerst austauschen.");
 const manualLeagues=[...new Set(manual.map(item=>String(resolvedAffiliation(displayBase(item))?.league||"")))];
 if(sbc.sameLeague&&(manualLeagues.length>1||manualLeagues.includes("")))return toast("Die manuell eingesetzten Spieler müssen aus derselben Liga stammen.");
 if(sbc.sameLeague&&a.league&&manualLeagues.length&&manualLeagues[0]!==a.league)return toast("Die gewählte Liga passt nicht zu den bereits eingesetzten Spielern.");
 const chosen=sbcAssistantBest(sbc,draft,a,manualLeagues);
 if(!chosen)return toast("Keine passenden Spieler für die freien Plätze gefunden. Bitte Filter oder Teamschutz ändern.");sbcSetDraft(sbc.id,chosen.draft);const total=chosen.draft.squad.filter(Boolean).length,inserted=chosen.count,complete=sbcDraftStats(sbc,chosen.draft).ok;sbcAssistantState=null;renderSBC();
 toast(complete?`Assistent: ${inserted} Spieler eingesetzt${chosen.league?` · Liga: ${chosen.league}`:""}. 11/11 belegt.`:total===chosen.draft.squad.length&&typeof sbcChecklist==="function"?`${inserted} Spieler eingesetzt, aber noch nicht abgabebereit: ${sbcChecklist(sbc,sbcDraftStats(sbc,chosen.draft)).filter(r=>!r.ok).map(r=>r.label).join(", ")||"Bedingung"} fehlt.`:`Teilbefüllung: ${inserted} passende Spieler eingesetzt. ${total}/11 belegt.`)
}
function renderSbcEditor(sbc){
 const draft=sbcDraft(sbc.id),stats=sbcDraftStats(sbc,draft),reqs=sbcRequirementSummary(sbc,stats),formation=FORMATIONS["4-3-3"];
 const activeSelected=stats.items.filter(i=>state.squad.includes(i.uid)).length,storageSelected=stats.items.filter(i=>(state.sbcStorage||[]).some(x=>x.uid===i.uid)).length;
 return `<div class="sbc-builder"><div class="sbc-builder-head"><button type="button" class="sbc-builder-back" data-sbc-back>‹</button><div class="sbc-builder-title"><strong>${esc(sbc.name)}</strong><span>${esc(sbc.req)}</span></div><div class="sbc-builder-reward">${esc(sbcRewardPackLabel(sbc.reward))}</div></div>
 <ul class="sbc-checklist" aria-label="Bedingungen">${sbcChecklist(sbc,stats).map(r=>`<li class="${r.ok?"ok":""}"><i aria-hidden="true">${r.ok?"✓":"✗"}</i><span>${esc(r.label)}</span><b>${esc(r.value)}</b></li>`).join("")}</ul>
 <div class="sbc-editor-pitch">${formation.map((slot,i)=>sbcWorkSlotHTML(sbc,"squad",i,slot)).join("")}</div>
 <button class="sbc-test-toggle ${draft.testOpen?"open":""}" type="button" data-sbc-test-toggle><div><strong>⚒ Testareal</strong><span>12 Zusatzplätze · Spieler vorbereiten und per Drag & Drop einsetzen</span></div><b class="sbc-test-chevron">⌃</b></button>
 <div class="sbc-test-drawer ${draft.testOpen?"open":""}"><div class="sbc-test-note"><span>3 Reihen × 4 Plätze</span><span>${draft.test.filter(Boolean).length}/12 belegt</span></div><div class="sbc-test-grid">${Array.from({length:12},(_,i)=>sbcWorkSlotHTML(sbc,"test",i)).join("")}</div></div>
 <div class="sbc-builder-footer assistant-ready quick-fill"><button type="button" class="sbc-quick-fill" data-sbc-quick-fill>⚡ Automatisch füllen</button><button type="button" class="secondary sbc-assistant-gear" data-sbc-assistant-open aria-label="Assistent-Einstellungen" title="Assistent-Einstellungen">⚙</button><button type="button" class="secondary" data-sbc-player-search>Spieler suchen</button><button type="button" class="primary" data-submit="${esc(sbc.id)}" ${stats.ok?"":"disabled"}>${stats.ok?`Abgeben · ${esc(sbcRewardText(sbc.reward))}`:esc(sbcMissingButtonText(sbc,stats))}</button>${activeSelected||storageSelected?`<div class="sbc-submit-state">${[activeSelected?`${activeSelected} aus aktivem Kader`:"",storageSelected?`${storageSelected} aus SBC-Speicher`:""].filter(Boolean).join(" · ")}</div>`:""}</div>
 </div>${sbcSlotDetailHTML(sbc)}${sbcPickerHTML()}${sbcWarningHTML(sbc)}${sbcAssistantHTML(sbc)}`
}
function sbcFeatureGroupCard(rows,detail=false){
 if(!rows?.length)return"";
 const sample=rows[0],p=sbcGroupProgress(sample.groupSet),claimed=!!state.sbcGroupClaims?.[sample.groupSet],complete=p.total>0&&p.done>=p.total,pct=Math.round((p.done/Math.max(1,p.total))*100);
 const isPlayer=!!sample.eventSbc,found=isPlayer?eventSbcRewardDefinition(sample.groupReward):null;
 const title=isPlayer?(eventSbcNamedTitle(sample)||sample.eventPlayer?.name||"Spieler-SBC"):"Top-Partien";
 const desc=isPlayer?`${sample.eventId===FLASHBACK_REUS_EVENT.id?"LA Galaxy · MLS · Rückblick auf Borussia Dortmund 2013/14. ":sample.eventId===HALLOWEEN_EVENT.id?"Der Raumdeuter spukt wieder: Whitecaps FC · MLS, Halloween-Karte mit Blutmond-Upgrade. ":""}Schließe alle Teil-SBCs ab und erhalte ${sample.eventPlayer?.ovr?eventDisplayOvr(sample.eventId,sample.eventPlayer.ovr):""} ${found?.event?.name||"Event"} ${sample.eventPlayer?.name||"den Spieler"} untauschbar.`:"Schließe alle vier Top-Partien ab. Jede Teil-SBC gibt eine Belohnung; danach folgt der Gruppenbonus.";
 const reward=isPlayer?eventSbcRewardLabel(sample.groupReward):sbcRewardText(sample.groupReward);
 let art="";
 if(isPlayer&&found){
  const base=eventSbcRewardBase(found.event,found.def),item=makeEventSbcRewardItem(sample.groupReward);
  if(base&&item)art=`<div class="sbc-feature-player">${cardHTML(displayBase(item)||base,item)}</div>`;
 }else if(sample.groupReward?.pack){
  art=`<div class="sbc-feature-pack"><img src="${packArtSrc(sample.groupReward.pack)}" alt="${esc(reward)}" loading="lazy"></div>`;
 }
 const attrs=detail?'':` data-sbc-set="${esc(sample.groupSet)}" role="button" tabindex="0"`;
 const status=claimed?"Gruppenbelohnung erhalten":complete?"Alle Teil-SBCs abgeschlossen":(sample.expiresAt?`Noch ${sbcTimeLeft(sample.expiresAt)}`:"Aktiv");
 return `<article class="sbc-feature-card ${isPlayer?"profi":"top-partien"} ${sample.eventId===FLASHBACK_REUS_EVENT.id?"flashback-sbc":sample.eventId===HALLOWEEN_EVENT.id?"halloween-sbc":""} ${detail?"detail":""}"${attrs}><div class="sbc-feature-main"><div class="sbc-feature-copy"><span class="sbc-feature-kicker">${isPlayer?"PROFI-SBC":"WÖCHENTLICHE SBC-GRUPPE"}</span><h3>${esc(title)}</h3><p>${esc(desc)}</p><div class="sbc-feature-progressline"><b>${p.done}/${p.total} SBCs</b><span>${complete?"Abgeschlossen":"abgeschlossen"}</span></div><div class="sbc-feature-track"><i style="width:${pct}%"></i></div><div class="sbc-feature-reward"><strong>GRUPPEN-BONUS</strong><span>${esc(reward)}${isPlayer?" (untauschbar)":""}</span></div></div>${art}</div><div class="sbc-feature-footer"><span>${isPlayer?"Nicht wiederholbar":"Top-Partien"}</span><b>${esc(status)}</b><span class="sbc-feature-arrow">›</span></div></article>`
}
function sbcGroupedRows(rows){
 const map=new Map();for(const row of rows){const key=row.groupSet||row.id;if(!map.has(key))map.set(key,[]);map.get(key).push(row)}
 return [...map.values()]
}
function sbcSetDetailHTML(rows){
 if(!rows?.length)return"";
 const sample=rows[0],isPlayer=!!sample.eventSbc,title=isPlayer?(eventSbcNamedTitle(sample)||sample.eventPlayer?.name||"Profi-SBC"):"Top-Partien",done=rows.filter(sbcIsCompleted).length,total=rows.length,pct=Math.round(done/Math.max(1,total)*100),claimed=!!state.sbcGroupClaims?.[sample.groupSet];
 const reward=isPlayer?eventSbcRewardLabel(sample.groupReward):sbcRewardText(sample.groupReward),expiry=sample.expiresAt?`Noch ${sbcTimeLeft(sample.expiresAt)}`:"Aktiv";
 const bonusState=claimed?"ERHALTEN":done>=total?"FREIGESCHALTET":`NOCH ${total-done} SBC${total-done===1?"":"s"}`;
 return `<div class="sbc-set-detail-nav"><button type="button" data-sbc-set-back>‹</button><div><strong>${esc(title)}</strong><span>${done}/${total} SBCs abgeschlossen</span></div></div><section class="sbc-set-summary ${isPlayer?"profi":"top-partien"}"><div class="sbc-set-summary-top"><div><span class="sbc-set-summary-kicker">${isPlayer?"PROFI-SBC":"TOP-PARTIEN"}</span><h3>${esc(title)}</h3><p>${isPlayer?`Schließe alle ${total} Teil-SBCs ab, um die Spielerkarte zu erhalten.`:`Schließe alle ${total} Aufgaben ab und sichere dir den Gruppenbonus.`}</p></div><span class="sbc-set-expiry">${esc(expiry)}</span></div><div class="sbc-set-progress"><strong>${done}/${total}</strong><div class="sbc-set-progress-bar"><i style="width:${pct}%"></i></div><span>${pct}%</span></div><div class="sbc-set-bonus"><div><small>GRUPPEN-BONUS</small><b>${esc(reward)}${isPlayer?" · untauschbar":""}</b></div><em>${bonusState}</em></div></section><div class="sbc-set-list">${rows.map(sbcOverviewCard).join("")}</div>`
}
function renderSBC(){
 state.sbcCompletions=state.sbcCompletions||{};state.sbcGroupClaims=state.sbcGroupClaims||{};
 const rows=allActiveSBCs(),preferred=["Täglich","POTM","Profis","Grind","Top-Partien","Grundlagen","Verbesserungen","Ligen"],groups=preferred.filter(g=>g==="POTM"||rows.some(s=>s.group===g));if(!groups.includes(activeSbcGroup))activeSbcGroup=groups[0];
 // The first SBC visit during the Halloween SBC opens the Profis tab with Müller once per session.
 const halloweenSbcLive=rows.some(r=>r.eventId===HALLOWEEN_EVENT.id&&!state.sbcGroupClaims?.[r.groupSet]);if(halloweenSbcLive&&!halloweenSbcShown){halloweenSbcShown=true;activeSbcGroup="Profis";activeSbcSet=null}
 if($("sbcStorageCount"))$("sbcStorageCount").textContent=`${(state.sbcStorage||[]).length}/100`;
 if(activeSbcGroup==="POTM"&&globalThis.FooteraPotm?.render())return;
 const active=getActiveSbcById(activeSbcId);
 if(active&&!sbcIsCompleted(active)){
  $("sbcTabs").innerHTML="";$("sbcGrid").innerHTML=renderSbcEditor(active);return
 }
 if(activeSbcId&&!active)activeSbcId=null;
 if(activeSbcSet){
  const detailRows=rows.filter(s=>s.groupSet===activeSbcSet);
  if(detailRows.length){$("sbcTabs").innerHTML="";$("sbcGrid").innerHTML=sbcSetDetailHTML(detailRows);return}
  activeSbcSet=null
 }
 $("sbcTabs").innerHTML=groups.map(g=>`<button class="sbc-tab ${g===activeSbcGroup?"active":""} ${g==="Profis"&&halloweenSbcLive?"halloween-live":""}" data-sbc-group="${esc(g)}">${esc(g)}</button>`).join("");
 const groupRows=rows.filter(s=>s.group===activeSbcGroup);
 if(activeSbcGroup==="Profis"||activeSbcGroup==="Top-Partien"){
  const sets=sbcGroupedRows(groupRows);$("sbcGrid").innerHTML=sets.length?sets.map(x=>sbcFeatureGroupCard(x)).join(""):'<div class="online-note">Keine SBCs in dieser Kategorie.</div>';return
 }
 const banner=sbcGroupBannerHTML(activeSbcGroup,groupRows);
 // Doable SBCs first, then the rest, finished ones at the bottom.
 const rank=x=>sbcIsCompleted(x)?2:sbcDraftStats(x).ok||sbcFeasibility(x).ok?0:1;
 const sorted=groupRows.map((x,i)=>({x,i,r:rank(x)})).sort((a,b)=>a.r-b.r||a.i-b.i).map(e=>e.x);
 $("sbcGrid").innerHTML=banner+sorted.map(sbcOverviewCard).join("")||'<div class="online-note">Keine SBCs in dieser Kategorie.</div>'
}
let queuedSbcGroupRewardPack=null;
function maybeGrantSbcGroupReward(sbc){
 if(!sbc?.groupSet||!sbc.groupReward)return"";
 state.sbcGroupClaims=state.sbcGroupClaims||{};
 const p=sbcGroupProgress(sbc.groupSet);
 if(!p.total||p.done<p.total||state.sbcGroupClaims[sbc.groupSet])return"";
 state.sbcGroupClaims[sbc.groupSet]=true;
 if(sbc.groupReward.playerReward){
  const item=makeEventSbcRewardItem(sbc.groupReward);
  if(item){queuedSbcGroupRewardPack={packId:"event-sbc-player",items:[item]};return ` Gruppenbelohnung: ${eventSbcRewardLabel(sbc.groupReward)}.`}
 }
 grant(sbc.groupReward);return ` Gruppenbelohnung: ${sbcRewardText(sbc.groupReward)}.`
}
function finalizeSbcSubmission(id){
 const sbc=getActiveSbcById(id);if(!sbc)return;if(sbc.scoreSbc)return toast("Öffne diese POTM-SBC über die Punkteabgabe.");if(sbcIsCompleted(sbc))return toast("Diese SBC wurde bereits abgeschlossen.");const stats=sbcDraftStats(sbc);if(!stats.ok)return toast("Die SBC-Bedingungen sind noch nicht erfüllt.");
 if(stats.items.some(isFounderItem)||stats.items.some(isStoryItem)||stats.items.some(isFooteraLiveCard))return toast("Founder-, Story- und Echtgeldkarten können nicht in SBCs abgegeben werden.");
 ensureObjectiveWindows();const ids=new Set(stats.items.map(i=>i.uid));persistActiveSquadPreset(state);
 const teams=[...new Set((state.squadPresets||[]).filter(p=>p?.squad?.some(uid=>ids.has(uid))).map(p=>p.name).filter(Boolean))];
 state.squad=state.squad.map(uid=>uid&&ids.has(uid)?null:uid);
 state.squadPresets=(state.squadPresets||[]).map((preset,index)=>{
  if(!preset)return preset;const squad=(preset.squad||[]).map(uid=>uid&&ids.has(uid)?null:uid);
  const roles={...preset.roles},focus={...preset.focus};for(let i=0;i<11;i++)if(!squad[i]){delete roles[i];delete focus[i]}
  return{...preset,squad,roles,focus}
 });
 for(const uid of ids)removeActiveEvolutionForUid(uid);
 state.club=state.club.filter(i=>!ids.has(i.uid));state.sbcStorage=(state.sbcStorage||[]).filter(i=>!ids.has(i.uid));state.transferList=(state.transferList||[]).filter(uid=>!ids.has(uid));
 grant(sbc.reward);state.stats.sbcs++;state.sbcCompletions=state.sbcCompletions||{};if(sbc.once)state.sbcCompletions[sbc.id]=true;const groupMessage=maybeGrantSbcGroupReward(sbc);
 delete SBC_WORKSPACE[id];persistSbcWorkspace();pendingSbcSubmissionId=null;sbcAssistantState=null;sbcSlotDetailState=null;activeSbcId=null;sbcPickerState=null;if(history.state?.gfut&&history.state.kind==="sbc-editor")replaceUiState("view",{view:"sbcView"});const rewardPack=queuedSbcGroupRewardPack;queuedSbcGroupRewardPack=null;save();renderAll();if(rewardPack)openPack(rewardPack.packId,rewardPack.items);toast((teams.length?`SBC abgeschlossen. Betroffene Teams aktualisiert: ${teams.join(", ")}.`:"SBC abgeschlossen.")+groupMessage)
}
function submitSbcById(id){
 const sbc=getActiveSbcById(id);if(!sbc)return;if(sbc.scoreSbc)return toast("Öffne diese POTM-SBC über die Punkteabgabe.");if(sbcIsCompleted(sbc))return toast("Diese SBC wurde bereits abgeschlossen.");const stats=sbcDraftStats(sbc);if(!stats.ok)return toast("Die SBC-Bedingungen sind noch nicht erfüllt.");
 const risks=sbcSubmissionRisks(sbc);if(risks.length){pendingSbcSubmissionId=id;renderSBC();return}
 finalizeSbcSubmission(id)
}
$("sbcTabs").addEventListener("click",e=>{const b=e.target.closest("[data-sbc-group]");if(!b)return;activeSbcGroup=b.dataset.sbcGroup;activeSbcSet=null;activeSbcId=null;renderSBC()});
let sbcContentRefreshKey=promoWindowKey(new Date(),19)+"|"+sbcRotationWindow(new Date(),3).key+"|"+sbcRotationWindow(new Date(),4).key;
setInterval(()=>{const key=promoWindowKey(new Date(),19)+"|"+sbcRotationWindow(new Date(),3).key+"|"+sbcRotationWindow(new Date(),4).key;if(key===sbcContentRefreshKey)return;sbcContentRefreshKey=key;if(currentViewId()==="sbcView"){activeSbcId=null;activeSbcSet=null;sbcAssistantState=null;sbcSlotDetailState=null;sbcPickerState=null;activeSbcGroup="Täglich";renderSBC();toast("Neue Tages-SBCs sind da.")}},60000);

$("sbcView").addEventListener("click",e=>{
 const setOpen=e.target.closest("[data-sbc-set]"),setBack=e.target.closest("[data-sbc-set-back]"),open=e.target.closest("[data-sbc-open]"),back=e.target.closest("[data-sbc-back]"),toggle=e.target.closest("[data-sbc-test-toggle]"),remove=e.target.closest("[data-sbc-remove]"),slot=e.target.closest(".sbc-work-slot"),search=e.target.closest("[data-sbc-player-search]"),close=e.target.closest("[data-sbc-picker-close]"),pick=e.target.closest("[data-sbc-pick-uid]"),submit=e.target.closest("[data-submit]"),sourceQuick=e.target.closest("[data-sbc-source-quick]"),warnReplace=e.target.closest("[data-sbc-warning-replace]"),warnConfirm=e.target.closest("[data-sbc-warning-confirm]"),warnCancel=e.target.closest("[data-sbc-warning-cancel]"),assistantOpen=e.target.closest("[data-sbc-assistant-open]"),assistantClose=e.target.closest("[data-sbc-assistant-close]"),assistantBuild=e.target.closest("[data-sbc-assistant-build]"),slotDetailClose=e.target.closest("[data-sbc-slot-detail-close]"),slotPrev=e.target.closest("[data-sbc-slot-prev]"),slotNext=e.target.closest("[data-sbc-slot-next]"),slotAdd=e.target.closest("[data-sbc-slot-add]"),slotRemoveDetail=e.target.closest("[data-sbc-slot-remove-detail]");
 if(setBack){activeSbcSet=null;activeSbcId=null;pendingSbcSubmissionId=null;sbcAssistantState=null;sbcSlotDetailState=null;sbcPickerState=null;renderSBC();return}
 if(setOpen){const setId=String(setOpen.dataset.sbcSet||"");if(!setId)return;activeSbcSet=setId;activeSbcId=null;pendingSbcSubmissionId=null;sbcAssistantState=null;sbcSlotDetailState=null;sbcPickerState=null;renderSBC();return}
 if(slotDetailClose){closeSbcSlotDetail();return}
 if(slotPrev){moveSbcSlotDetail(-1);return}
 if(slotNext){moveSbcSlotDetail(1);return}
 if(slotAdd&&activeSbcId&&sbcSlotDetailState){openSbcPicker("squad",Number(sbcSlotDetailState.index));return}
 if(slotRemoveDetail&&activeSbcId&&sbcSlotDetailState){if(sbcRemoveUid(activeSbcId,"squad",Number(sbcSlotDetailState.index))){renderSBC();toast("Spieler entfernt.")}return}
  if(assistantClose){sbcAssistantState=null;renderSBC();return}
 if(assistantBuild){runSbcAssistant();return}
 if(assistantOpen){openSbcAssistant();return}
 if(e.target.closest("[data-sbc-quick-fill]")){sbcQuickFill();return}
  if(warnCancel){pendingSbcSubmissionId=null;renderSBC();return}
 if(warnConfirm&&pendingSbcSubmissionId){const id=pendingSbcSubmissionId;pendingSbcSubmissionId=null;finalizeSbcSubmission(id);return}
 if(warnReplace&&pendingSbcSubmissionId){const sbc=getActiveSbcById(pendingSbcSubmissionId),draft=sbcDraft(pendingSbcSubmissionId),risks=sbc?new Set(sbcSubmissionRisks(sbc).map(r=>r.item.uid)):new Set(),idx=draft.squad.findIndex(uid=>risks.has(uid));pendingSbcSubmissionId=null;if(idx>=0){sbcSlotDetailState={index:idx};openSbcPicker("squad",idx)}else renderSBC();return}
 if(sourceQuick&&sbcPickerState){sbcPickerState.source=sourceQuick.dataset.sbcSourceQuick==="storage"?"storage":"club";normalizeSbcPickerClub();rememberSbcPickerFilters();renderSBC();return}
 if(open){const target=getActiveSbcById(open.dataset.sbcOpen);if(!target)return;if(sbcIsCompleted(target))return toast("Diese SBC wurde bereits abgeschlossen.");pendingSbcSubmissionId=null;sbcAssistantState=null;sbcSlotDetailState=null;activeSbcId=target.id;sbcPickerState=null;renderSBC();if(!uiHistoryApplying)pushUiState("sbc-editor",{view:"sbcView",sbcId:activeSbcId});return}
 if(back){if(history.state?.gfut&&history.state.kind==="sbc-editor"){history.back();return}pendingSbcSubmissionId=null;sbcAssistantState=null;sbcSlotDetailState=null;activeSbcId=null;sbcPickerState=null;renderSBC();return}
 if(toggle&&activeSbcId){const d=sbcDraft(activeSbcId);d.testOpen=!d.testOpen;sbcSetDraft(activeSbcId,d);renderSBC();return}
 if(remove&&activeSbcId){e.stopPropagation();const [area,raw]=String(remove.dataset.sbcRemove||"").split(":");sbcRemoveUid(activeSbcId,area,Number(raw));renderSBC();return}
 if(close){rememberSbcPickerFilters();sbcPickerState=null;renderSBC();return}
 if(pick&&activeSbcId&&sbcPickerState){const area=sbcPickerState.area,index=Number(sbcPickerState.index),before=sbcSlotUid(sbcDraft(activeSbcId),area,index);rememberSbcPickerFilters();if(sbcPlaceUid(activeSbcId,pick.dataset.sbcPickUid,area,index)){const d=sbcDraft(activeSbcId);if(area==="test")d.testOpen=true;sbcSetDraft(activeSbcId,d);sbcPickerState=null;renderSBC();toast(before?"Getauscht.":"Spieler hinzugefügt.")}return}
 if(search&&activeSbcId){sbcSlotDetailState=null;const d=sbcDraft(activeSbcId),ti=d.test.findIndex(x=>!x),si=d.squad.findIndex(x=>!x);if(ti>=0){d.testOpen=true;sbcSetDraft(activeSbcId,d);openSbcPicker("test",ti)}else if(si>=0)openSbcPicker("squad",si);else openSbcPicker("test",0);return}
 if(submit){submitSbcById(submit.dataset.submit);return}
 if(slot&&activeSbcId&&!suppressSbcSlotClick&&!e.target.closest(".sbc-slot-remove")){const area=slot.dataset.sbcArea,index=Number(slot.dataset.sbcIndex);if(area==="squad")openSbcSlotDetail(index);else openSbcPicker(area,index);return}
 suppressSbcSlotClick=false
});
$("sbcView").addEventListener("input",e=>{
 if(sbcAssistantState){
  if(e.target.id==="sbcAssistantMin")sbcAssistantState.min=Math.max(0,Math.min(99,Number(e.target.value||0)));
  else if(e.target.id==="sbcAssistantMax")sbcAssistantState.max=Math.max(0,Math.min(99,Number(e.target.value||99)));
 }
 if(!sbcPickerState)return;
 if(e.target.id==="sbcPickerName"){sbcPickerState.query=e.target.value;rememberSbcPickerFilters();renderSbcPickerResults();return}
 if(["sbcPickerMin","sbcPickerMinRange","sbcPickerMax","sbcPickerMaxRange"].includes(e.target.id)){
  const isMin=e.target.id.includes("Min"),value=Math.max(0,Math.min(99,Number(e.target.value||0)));
  if(isMin)sbcPickerState.min=value;else sbcPickerState.max=value;
  if(Number(sbcPickerState.min)>Number(sbcPickerState.max)){if(isMin)sbcPickerState.max=sbcPickerState.min;else sbcPickerState.min=sbcPickerState.max}
  const min=Number(sbcPickerState.min),max=Number(sbcPickerState.max);
  for(const id of ["sbcPickerMin","sbcPickerMinRange"])if($(id))$(id).value=String(min);
  for(const id of ["sbcPickerMax","sbcPickerMaxRange"])if($(id))$(id).value=String(max);
  if($("sbcPickerRangeLabel"))$("sbcPickerRangeLabel").textContent=`${min}–${max} GES`;
  normalizeSbcPickerClub();rememberSbcPickerFilters();renderSbcPickerResults()
 }
});
$("sbcView").addEventListener("change",e=>{
 if(sbcAssistantState){
  if(e.target.id==="sbcAssistantProtect"){sbcAssistantState.protectTeams=e.target.checked;return}
  if(e.target.id==="sbcAssistantIgnorePosition"){sbcAssistantState.ignorePosition=e.target.checked;return}
  if(e.target.id==="sbcAssistantSort"){sbcAssistantState.sort=e.target.value;return}
  if(e.target.id==="sbcAssistantQuality"){sbcAssistantState.quality=e.target.value;return}
  if(e.target.id==="sbcAssistantLeague"){sbcAssistantState.league=e.target.value;return}
 }
 if(!sbcPickerState)return;
 if(e.target.id==="sbcPickerPosition")sbcPickerState.position=e.target.value;
 else if(e.target.id==="sbcPickerQuality")sbcPickerState.quality=e.target.value;
 else if(e.target.id==="sbcPickerSource")sbcPickerState.source=e.target.value;
 else if(e.target.id==="sbcPickerSort")sbcPickerState.sort=e.target.value;
 else if(e.target.id==="sbcPickerLeague"){sbcPickerState.league=e.target.value;normalizeSbcPickerClub();rememberSbcPickerFilters();renderSBC();return}
 else if(e.target.id==="sbcPickerClub")sbcPickerState.club=e.target.value;
 else if(e.target.id==="sbcPickerMin"||e.target.id==="sbcPickerMinRange")sbcPickerState.min=Math.max(0,Math.min(99,Number(e.target.value||0)));
 else if(e.target.id==="sbcPickerMax"||e.target.id==="sbcPickerMaxRange")sbcPickerState.max=Math.max(0,Math.min(99,Number(e.target.value||99)));
 else return;
 normalizeSbcPickerClub();rememberSbcPickerFilters();renderSbcPickerResults()
});
function clearSbcDragVisuals(){
 document.querySelectorAll("#sbcView .sbc-work-slot.drop-target,#sbcView .sbc-test-slot.drop-target").forEach(x=>x.classList.remove("drop-target"));
 sbcDragState?.source?.classList.remove("drag-source");sbcDragState?.ghost?.remove()
}
document.addEventListener("pointerdown",e=>{
 if(!activeSbcId||sbcPickerState||sbcAssistantState||sbcSlotDetailState||e.target.closest(".sbc-slot-remove"))return;const slot=e.target.closest("#sbcView .sbc-work-slot.filled");if(!slot)return;
 sbcDragState={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,fromArea:slot.dataset.sbcArea,fromIndex:Number(slot.dataset.sbcIndex),source:slot,active:false,target:null,ghost:null}
},{passive:true});
document.addEventListener("pointermove",e=>{
 const d=sbcDragState;if(!d||d.pointerId!==e.pointerId)return;const dist=Math.hypot(e.clientX-d.startX,e.clientY-d.startY);if(!d.active&&dist<7)return;
 if(!d.active){d.active=true;d.source?.classList.add("drag-source");const g=document.createElement("div");g.className="sbc-dragghost";g.innerHTML=d.source?.querySelector(".sbc-card-wrap")?.innerHTML||"";document.body.appendChild(g);d.ghost=g}
 if(d.ghost){d.ghost.style.left=`${e.clientX}px`;d.ghost.style.top=`${e.clientY}px`}
 document.querySelectorAll("#sbcView .sbc-work-slot.drop-target,#sbcView .sbc-test-slot.drop-target").forEach(x=>x.classList.remove("drop-target"));
 const target=document.elementFromPoint(e.clientX,e.clientY)?.closest?.("#sbcView .sbc-work-slot");d.target=target&&!(target.dataset.sbcArea===d.fromArea&&Number(target.dataset.sbcIndex)===d.fromIndex)?target:null;if(d.target)d.target.classList.add("drop-target");e.preventDefault()
},{passive:false});
document.addEventListener("pointerup",e=>{
 const d=sbcDragState;if(!d||d.pointerId!==e.pointerId)return;const active=d.active,target=d.target;clearSbcDragVisuals();sbcDragState=null;
 if(active){suppressSbcSlotClick=true;if(target&&activeSbcId&&sbcSwapSlots(activeSbcId,d.fromArea,d.fromIndex,target.dataset.sbcArea,Number(target.dataset.sbcIndex))){renderSBC();toast("Spieler verschoben.")}setTimeout(()=>{suppressSbcSlotClick=false},80)}
});
document.addEventListener("pointercancel",()=>{clearSbcDragVisuals();sbcDragState=null});


let matchTimer=null,matchSpeed=800,matchHighlightTimer=null,penaltyShootoutTimer=null;

function renderPlay(){
 const m=squadMetrics(),ready=m.filled===18,friendSel=$("friendlyFriendSelect"),old=friendSel?.value||"";
 renderSquadPresetControls();
 document.querySelectorAll(".startmode").forEach(b=>b.disabled=!ready);
 $("playLock").textContent=ready?"":`Kader unvollständig: ${m.filled}/18. Startelf und komplette Bank erforderlich.`;
 renderCompetitionModeStatus();
 $("randomFriendlyRecord").textContent=`${state.stats.friendlies||0} Friendlies · ${state.stats.friendlyWins||0} Siege`;
 if(friendSel){friendSel.innerHTML=state.friends.length?'<option value="">Freund wählen …</option>'+state.friends.map((f,i)=>`<option value="${i}">${esc(f.clubName||"Freund")} · ${f.rating||0} GES · ${f.chem||0}/33</option>`).join(''):'<option value="">Kein Freund gespeichert</option>';if(old!==""&&state.friends[Number(old)])friendSel.value=old}
 const selected=friendSel?.value!==""?state.friends[Number(friendSel.value)]:null;
 $("friendFriendlyRecord").textContent=selected?`Gegner: ${selected.clubName} · Rating ${selected.rating||0} · Chemie ${selected.chem||0}/33`:'Wähle zuerst einen Freund.';
 const friendBtn=document.querySelector('.startmode[data-mode="friendly-friend"]');if(friendBtn)friendBtn.disabled=!ready||!selected;
 if($("friendlyFriendSquad"))$("friendlyFriendSquad").disabled=!selected
}
document.querySelectorAll(".startmode").forEach(b=>b.addEventListener("click",()=>openModeEntry(b.dataset.mode)));
$("friendlyFriendSelect").addEventListener("change",renderPlay);
$("friendlyFriendSquad").addEventListener("click",()=>{const v=$("friendlyFriendSelect").value;if(v!==""&&state.friends[Number(v)])openFriendTeam(Number(v))});

function chemBoostPlayerChem(item){
 if(!item)return 0;const index=state.squad.indexOf(item.uid);
 return index>=0&&index<11?playerChem(index,squadItems()):0
}
function chemBoostProfileHTML(item,base,chem=null){
 if(typeof FooteraChemBoosts==="undefined")return"";
 const level=chem==null?chemBoostPlayerChem(item):chem,own=state.club.some(i=>i.uid&&i.uid===item?.uid);
 return FooteraChemBoosts.profileHTML(resolvedPlayer(base),item,level)+(own?`<button type="button" class="secondary" data-cb-manage="${esc(item.uid)}">Chemie-Boost auswählen</button>`:"")
}
function chemBoostMatchBase(base,item,index,side){
 if(!base||typeof FooteraChemBoosts==="undefined"||!FooteraChemBoosts.active(item))return base;
 const home=side==="home",profile=match?.opponentProfile;
 const scores=home?match?.chemBoostChem:profile?.chemScores;
 // Starting XI keeps kickoff chemistry; substitutes receive no chemistry bonus.
 const original=home?match?.initialStarters?.indexOf(item?.uid):index;
 const level=original>=0&&original<11?Number(scores?.[original]||0):0;
 // Reuse the six effective attributes during a match, without changing saved bases.
 const key=`${side}:${home?item?.uid:index}`,signature=[FooteraChemBoosts.active(item).id,level,base.id,base.ovr,base.position,base.pac,base.sho,base.pas,base.dri,base.def,base.phy].join("|");
 const cache=match?(match.chemBoostBases||(match.chemBoostBases=new Map())):null,previous=cache?.get(key);
 if(previous?.signature===signature)return previous.values;
 const values=FooteraChemBoosts.effect(resolvedPlayer(base),item,level).values;
 cache?.set(key,{signature,values});return values
}
function currentMatchBase(uid){
 const item=match?.clubIndex?.get(uid)||state.club.find(x=>x.uid===uid);
 return item?(typeof chemBoostMatchBase==="function"?chemBoostMatchBase(displayBase(item),item,match?.lineup?.indexOf(uid)??-1,"home"):displayBase(item)):null
}
function currentMatchRating(uid){
 const item=match?.clubIndex?.get(uid)||state.club.find(x=>x.uid===uid);
 return item?itemRating(item):0
}
function matchPower(lineup,formation,tactic){
 const form=FORMATIONS[formation]||FORMATIONS["4-3-3"];
 const xi=lineup.slice(0,11);
 let rating=0,valid=0,fitBonus=0;
 xi.forEach((uid,i)=>{
  if(!uid)return;
  const b=currentMatchBase(uid),r=currentMatchRating(uid);
  if(!b)return;
  rating+=r;valid++;
  fitBonus+=posFit(b,form[i].p)>0?1.2:-1.5;
 });
 let base=valid?rating/valid:60;
 base-=Math.max(0,11-valid)*3.6;
 if(tactic==="attacking")base+=1.3;
 if(tactic==="defensive")base+=.7;
 return base+fitBonus/11
}
function tacticMods(t){
 if(t==="attacking")return{attack:1.11,defense:.92,poss:2.5};
 if(t==="defensive")return{attack:.91,defense:1.11,poss:-2};
 return{attack:1,defense:1,poss:0}
}
function stopMatchTimer(){
 if(matchTimer){clearInterval(matchTimer);matchTimer=null}
}
function startMatchTimer(){
 stopMatchTimer();
 if(!match||match.finished||match.paused||match.highlightActive||match.highlight3DPending)return;
 matchTimer=setInterval(simTick,matchSpeed)
}
function setMatchPill(paused){
 const pill=$("matchStatePill");
 $("match").dataset.state=match?.finished?"finished":paused?"paused":"running";
 pill.innerHTML=match?.finished?'<i></i><span>Abpfiff</span>':match?.penaltyActive?'<i style="background:#d8ff3e;box-shadow:0 0 10px #d8ff3e"></i><span>Elfmeterschießen</span>':match?.halftimeActive?'<i style="background:#ffd463;box-shadow:0 0 10px #ffd463"></i><span>Halbzeit</span>':match?.extraTimeManagementActive?'<i style="background:#ffd463;box-shadow:0 0 10px #ffd463"></i><span>Vor Verlängerung</span>':paused?'<i style="background:#ffd463;box-shadow:0 0 10px #ffd463"></i><span>Simulation pausiert</span>':match?.highlightActive?'<i></i><span>Torjubel</span>':'<i></i><span>Simulation läuft</span>'
}
function matchHomeTeamName(){return String(state.profile?.clubName||"Footera Club").trim()||"Footera Club"}
function matchAwayTeamName(){return String(match?.opponentName||"Gegner").trim()||"Gegner"}
function startMatch(mode,opponent=null,kitSelection=null){
 const m=squadMetrics();if(m.filled<18)return;
 const power=m.rating+m.chem*.12;
 let opp,name,opponentProfile=opponent||null;
 if(opponent){opp=Number(opponent.power??((opponent.rating||70)+(opponent.chem||0)*.12));name=opponent.name||"GEGNER"}
 else if(mode==="friendly-friend"){
  const idx=Number($("friendlyFriendSelect").value);const fr=state.friends[idx];if(!fr)return toast("Bitte zuerst einen Freund wählen.");opponentProfile=friendAsOpponent(fr);opp=opponentProfile.power;name=opponentProfile.name;
 }else if(mode==="friendly-random"){
  const o=oneOffOpponent(mode);opponentProfile=o;opp=o.power;name=o.name;
 }else if(mode==="rivals"){
  const o=oneOffOpponent(mode);opponentProfile=o;opp=o.power;name=o.name;
 }else{
  opp=Math.max(55,Math.min(94,Math.round(power+(Math.random()*4-4))));name="SQUAD BATTLE XI";
 }
 if(opponentProfile?.squad&&typeof opponentSquadChemistry==="function")opponentProfile={...opponentProfile,chemScores:opponentSquadChemistry(opponentProfile.squad.map(opponentMatchBase),opponentProfile.formation,opponentProfile.items||opponentProfile.squad)};
 const kickoffOptions=matchKitOptions(opponentProfile||{name}),selectedKits=kitSelection&&["home","away"].includes(kitSelection.home)&&["home","away"].includes(kitSelection.away)?kitSelection:createDefaultMatchKitSelection(opponentProfile||{name});
 const kickoffKits={home:{...kickoffOptions.home[selectedKits.home]},away:{...kickoffOptions.away[selectedKits.away]}};
 const kickoffTeamIdentity={home:typeof clubIdentitySnapshot==="function"?clubIdentitySnapshot():null,away:opponentProfile?.clubIdentity?(typeof cleanClubIdentity==="function"?cleanClubIdentity(opponentProfile.clubIdentity):opponentProfile.clubIdentity):null};

 if(typeof cancelMatch3D==="function")cancelMatch3D();
 matchManagerDraft=null;
 match={
 mode,minute:0,home:0,away:0,power,chem:m.chem,opp,opponentProfile,opponentName:name,kickoffKits,kickoffTeamIdentity,finished:false,paused:false,
 chemBoostChem:[...(m.chemScores||[])],
 resultId:uid(),battleDifficulty:mode==="squad"?state.squadBattle?.difficulty||"pro":null,
  clubIndex:new Map(state.club.map(item=>[item.uid,item])),
  lineup:[...state.squad.slice(0,18)],initialStarters:[...state.squad.slice(0,11)],initialFormation:state.formation,formation:state.formation,tactic:state.tactic||"balanced",roles:{...state.roles},focus:{...state.focus},redCards:[],yellowCards:[],
  subsUsed:0,subbedOut:[],substitutionEvents:[],fitnessLoss:{home:{},away:{}},defensiveEvents:[],shotsHome:0,shotsAway:0,xgHome:0,xgAway:0,poss:50,goalEvents:[],shotEvents:[],timeline:[],lastScene:null,highlightActive:false,
  injuryTriggered:false,redTriggered:false,halftimeLogged:false,halftimeActive:false,
  extraTimeStarted:false,extraTimeBreakLogged:false,extraTimeManagementActive:false,penaltyActive:false,penaltyState:null,penaltyEvents:[],penaltyWinner:null,pensHome:null,pensAway:null,playerStatsApplied:false
 };
 $("match").classList.add("active");
 $("match").scrollTop=0;
 pushUiState("match",{mode});
 $("matchLog").innerHTML="";
 $("matchReport").innerHTML="";
 $("matchResult").classList.remove("active");
 if(typeof hidePostMatchProgress==="function")hidePostMatchProgress();
 $("managerPanel").classList.remove("active");
 $("eventBanner").classList.remove("active");
 resetMatchPresentation();
 $("matchHomeName").textContent=matchHomeTeamName();$("oppName").textContent=name;
 $("matchCompetition").textContent=mode==="rivals"?"Division Rivals":mode==="champions"?"Footera Champions":mode==="squad"?"Squad Battles":"Freundschaftsspiel";
 $("matchFormationSelect").value=match.formation;
 $("matchTacticSelect").value=match.tactic;
 addLog(`${mode.startsWith("friendly")?`Freundschaftsspiel gegen ${name} angepfiffen.`:`Anpfiff gegen ${name}. Die Partie läuft automatisch.`} Taktik: ${{balanced:"Ausgeglichen",attacking:"Offensiv",defensive:"Defensiv"}[match.tactic]||"Ausgeglichen"}.`);
 recordMatchScene("idle","Anpfiff · Das Spiel läuft.");
 updateMatchUI();setMatchPill(false);startMatchTimer();
 // V21.226: the teams walk out in 3D first (Wichtige/Alle Highlights).
 if(typeof queueMatchCeremony3D==="function")queueMatchCeremony3D("kickoff")
}
function addLog(t){
 if(!match)return;
 const d=document.createElement("div");
 d.className="logline";
 d.textContent=`${Math.min(120,Math.floor(match.minute))}' ${t}`;
 $("matchLog").prepend(d)
}
function updateMatchUI(force=false){
 if(!match||(!force&&match.highlight3DPending))return;
 $("matchMinute").textContent=`${Math.min(120,Math.floor(match.minute))}'`;
 $("matchScore").textContent=`${match.home} : ${match.away}`;
 const yellows=(match.yellowCards||[]).map(card=>`<span class="match-yellow-card">${esc(card.name)} · ${card.minute}'</span>`).join("");
 const reds=(match.redCards||[]).map(card=>`<span class="match-red-card">${esc(card.name)} · ${card.minute}'</span>`).join("");
 $("matchCardEvents").innerHTML=yellows+reds;
 const poss=Math.max(32,Math.min(68,Math.round(match.poss)));
 $("matchPoss").textContent=`${poss} : ${100-poss}`;
 $("matchShots").textContent=`${match.shotsHome} : ${match.shotsAway}`;
 $("matchXg").textContent=`${match.xgHome.toFixed(1)} : ${match.xgAway.toFixed(1)}`;
 const fitness=(match.lineup||[]).slice(0,11).filter(Boolean).map(uid=>matchPlayerFitness(uid));
 $("matchTacticalSummary").textContent=`${match.formation} · ${{balanced:"Ausgeglichen",attacking:"Offensiv",defensive:"Defensiv"}[match.tactic]||"Ausgeglichen"} · Kondition Ø ${fitness.length?Math.round(fitness.reduce((n,v)=>n+v,0)/fitness.length):100}%`;
 $("matchClockProgress").style.width=`${Math.min(100,match.minute/(match.extraTimeStarted?120:90)*100)}%`
}
function resetMatchPresentation(){
 clearTimeout(matchHighlightTimer);matchHighlightTimer=null;
 clearTimeout(penaltyShootoutTimer);penaltyShootoutTimer=null;
 const penaltyPanel=$("penaltyShootoutPanel");if(penaltyPanel){penaltyPanel.hidden=true;penaltyPanel.innerHTML=""}
 $("matchGoalMoment").classList.remove("active");
 $("matchBreakSummary").hidden=true;
 $("matchTimeline").innerHTML='<span class="match-timeline-start">Anpfiff</span>';
 $("matchLiveStage").dataset.scene="idle";
 $("matchSceneType").textContent="ANPFIFF";
 $("matchSceneText").textContent="Das Spiel läuft.";
 $("matchSceneMinute").textContent="0'";
 $("matchChronicle")?.removeAttribute("open")
}
function renderMatchTimeline(){
 if(!match||match.highlight3DPending)return;
 const timeline=$("matchTimeline");
 timeline.innerHTML='<span class="match-timeline-start">Anpfiff</span>'+(match.timeline||[]).map(e=>`<span class="match-timeline-event ${e.kind}" title="${esc(e.text)}">${e.kind==="goal"?"⚽":e.kind==="yellow"?"🟨":e.kind==="red"?"🟥":e.kind==="injury"?"✚":e.kind==="sub"?"↔":"◦"} ${e.minute}' · ${esc(e.text)}</span>`).join("");
 timeline.scrollLeft=timeline.scrollWidth
}
function renderMatchScene(){
 if(!match?.lastScene||match.highlight3DPending)return;
 const scene=match.lastScene,kind=scene.kind;
 $("matchLiveStage").dataset.scene=kind;
 $("matchSceneMinute").textContent=`${scene.minute}'`;
 $("matchSceneType").textContent=kind.endsWith("-goal")?"TOR":kind.endsWith("-save")?"PARADE":kind.endsWith("-post")?"PFOSTEN":kind.endsWith("-block")?"GEBLOCKT":kind.endsWith("-defense")?"BALLGEWINN":kind.endsWith("-chance")?"TORSCHUSS":kind.endsWith("-attack")?"ANGRIFF":kind.endsWith("-card")?"ROTE KARTE":kind.endsWith("-injury")?"VERLETZUNG":"SPIEL LÄUFT";
 $("matchSceneText").textContent=scene.text;
 const ball=$("matchLiveStage").querySelector(".match-ball");
 ball.style.animation="none";void ball.offsetWidth;ball.style.animation=""
}
function dismissMatchGoalMoment(resume=true){
 if(!resume&&typeof cancelMatch3D==="function")cancelMatch3D();
 const wasActive=!!match?.highlightActive;
 clearTimeout(matchHighlightTimer);matchHighlightTimer=null;
 if(match)match.highlightActive=false;
 $("matchGoalMoment").classList.remove("active");
 if(wasActive)setMatchPill(!!match?.paused);
 if(wasActive&&resume&&match&&!match.paused&&!match.finished)startMatchTimer()
}
function showMatchGoalMoment(event,scorer){
 if(!match)return;
 let card="";
 if(event.side==="home"){
  const item=match.clubIndex?.get(scorer?.uid)||state.club.find(x=>x.uid===scorer?.uid);
  const base=item?displayBase(item):scorer?.base;
  if(base)card=cardHTML(base,item||null,false)
 }else{
  const entry=match.opponentProfile?.squad?.[scorer?.index],base=opponentMatchBase(entry)||scorer?.base;
  const item=match.opponentProfile?.items?.[scorer?.index]||null;
  if(match.opponentProfile?.kind==="friend"&&entry)card=friendCard(entry,base?.position||"ST",false);
  else if(base)card=cardHTML(base,item,false)
 }
 if(!card){const generic={id:"match-opponent",name:event.scorer,ovr:Math.round(event.side==="home"?match.power:match.opp),position:"ST"};card=cardHTML(generic,null,false)}
 $("matchGoalCard").innerHTML=card;
 $("matchGoalEyebrow").textContent=`TOR · ${event.minute}'`;
 $("matchGoalScorer").textContent=event.scorer;
 $("matchGoalAssist").textContent=event.type==="assist"&&event.assist?`Vorlage: ${event.assist}`:event.type==="solo"?"Einzelaktion":event.type==="freekick"?"Direkter Freistoß":event.type==="penalty"?"Elfmeter":"";
 $("matchGoalScore").textContent=`${match.home} : ${match.away}`;
 $("matchGoalMoment").classList.add("active");
 match.highlightActive=true;stopMatchTimer();setMatchPill(false);
 clearTimeout(matchHighlightTimer);
 const current=match;
 matchHighlightTimer=setTimeout(()=>{if(match===current)dismissMatchGoalMoment()},2700)
}
$("matchGoalSkip").addEventListener("click",()=>dismissMatchGoalMoment());
function eventChance(base){
 return Math.random()<base
}
function matchFitnessDrain(base,position,tactic,roleDrain=1){
 const player=typeof resolvedPlayer==="function"?resolvedPlayer(base):base;
 const phy=Math.max(40,Math.min(99,Number(player?.phy||70)));
 const intensity=tactic==="attacking"?.045:tactic==="defensive"?-.015:0;
 return Math.max(.22,.36+(78-phy)*.0035+intensity)*(position==="GK"?.48:1)*Math.max(.88,Math.min(1.16,Number(roleDrain)||1))
}
function advanceMatchFitness(minutes){
 if(!match)return;
 const loss=match.fitnessLoss||(match.fitnessLoss={home:{},away:{}});
 for(const side of ["home","away"])for(const row of matchActorRows(side)){
  const key=side==="home"?row.uid:row.index,tactic=side==="home"?match.tactic:match.opponentProfile?.tactic;
  loss[side][key]=(loss[side][key]||0)+minutes*matchFitnessDrain(row.base,row.slot,tactic,row.ctx.drain)*FooteraMatchActions.staminaMultiplier(matchActionTactics(side),row);
 }
}
function matchPlayerFitness(uid,side="home",index=-1){
 const loss=Number(match?.fitnessLoss?.[side]?.[side==="home"?String(uid):index]||0);
 return Math.max(35,Math.min(100,Math.round(100-loss)))
}
function matchFitnessPenalty(side){
 const values=side==="home"?(match?.lineup||[]).slice(0,11).filter(Boolean).map(uid=>matchPlayerFitness(uid)):Array.from({length:11},(_,i)=>matchPlayerFitness("","away",i));
 return values.length?values.reduce((n,fitness)=>n+(100-fitness)*.16,0)/values.length:0
}
function matchOpponentPower(){return Number(match.opp||0)-matchFitnessPenalty("away")}
function matchDefendingPlayers(side){
 return matchActorRows(side).map(row=>{
  const roleWeight=row.slot==="CB"?5:row.slot==="CDM"?4:["LB","RB","LWB","RWB"].includes(row.slot)?3:row.slot==="CM"?1.5:row.slot==="GK"?1.2:.4;
  const skill=matchDefensiveSkill(row);
  return{...row,position:row.slot,weight:roleWeight*(.55+skill/100)*row.ctx.defender*row.fitness/100}
 })
}
function recordMatchDefense(attackingSide,kind,xg=0,preferredIndex=-1){
 const side=attackingSide==="home"?"away":"home",players=matchDefendingPlayers(side);
 const preferred=Number.isInteger(Number(preferredIndex))?players.find(p=>p.index===Number(preferredIndex)):null;
 const player=kind==="save"?(players.find(p=>p.position==="GK")||preferred):(preferred&&preferred.position!=="GK"?preferred:weightedMatchPick(players.filter(p=>p.position!=="GK")));
 if(!player)return null;
 const event={side,kind,uid:player.uid,index:player.index,name:player.name,minute:Math.min(120,Math.floor(match.minute)),at:match.minute,xg};
 (match.defensiveEvents||(match.defensiveEvents=[])).push(event);
 return event
}
function resolveMissedMatchShot(shot,team){
 const accuracy=matchClamp(.50+(Number(shot.shooting??70)-65)*.006+Number(shot.xg||0)*.24,.20,.88),roll=Math.random(),saveCut=accuracy*.72,blockCut=Math.min(.92,saveCut+.22),kind=roll<saveCut?"save":roll<blockCut?"block":"wide";
 const action=kind==="wide"?null:recordMatchDefense(shot.side,kind,shot.xg,shot.defenderIndex);
 shot.outcome=action?kind:"wide";shot.onTarget=shot.outcome==="save";
 if(shot.outcome==="save")match.nextRestart={side:shot.side==="home"?"away":"home",kind:"keeper_buildout",at:match.minute};
 if(shot.outcome==="block"&&roll>saveCut+.12)match.nextRestart={side:shot.side,kind:"corner",flank:(match.shotEvents?.length||0)%2?"left":"right",at:match.minute};
 // Refine only the presentation of already missed shots using the EXISTING roll.
 // No extra random draw, goal check, shot, xG or defensive action is introduced.
 shot.highlightType=shot.outcome==="wide"&&roll>=.965?"shot_post":(Number(shot.xg)>=.16||(typeof FooteraHighlights!=="undefined"&&FooteraHighlights.getMode()==="all"))?(shot.outcome==="save"?"big_chance_saved":shot.outcome==="wide"?"big_chance_missed":""):"";
 // Presentation metadata only: name the actual goalkeeper on saved chances.
 const keeperRow=shot.outcome==="save"&&action?matchActorRows(action.side).find(row=>row.index===action.index):null;
 shot.goalkeeperName=shot.outcome==="save"?(keeperRow?matchEventPlayerName(keeperRow,"Torwart"):action?.name||"Torwart"):"";
 if(shot.outcome==="save"){
  shot.goalkeeperUid=String(action?.uid||"");
  shot.goalkeeperIndex=Number(action?.index??-1);
 }
 if(typeof queueMatchChance3D==="function")queueMatchChance3D(shot);
 if(action){
  const text=kind==="save"?`${action.name} pariert den Abschluss von ${shot.shooter}!`:`${action.name} blockt den Schuss von ${shot.shooter}.`;
  recordMatchScene(`${action.side}-${kind}`,text);addLog(text)
 }else if(shot.highlightType==="shot_post")recordMatchScene(`${shot.side}-post`,`${shot.shooter} trifft den Pfosten · ${team}.`);
 else recordMatchScene(`${shot.side}-chance`,`${shot.shooter} schießt vorbei · ${team}.`)
}
function recordMatchEvent(kind,side,text){
 if(!match)return;
 match.timeline=match.timeline||[];
 match.timeline.push({kind,side,text,minute:Math.min(120,Math.floor(match.minute))});
 if(typeof document!=="undefined")renderMatchTimeline()
}
function recordMatchScene(kind,text){
 if(!match)return;
 match.lastScene={kind,text,minute:Math.min(120,Math.floor(match.minute))};
 if(typeof document!=="undefined")renderMatchScene()
}
function matchTeamPower(){
 // Chemistry is fixed at kickoff; substitutions still change the on-field rating and positional fit.
 return matchPower(match.lineup,match.formation,match.tactic)+Math.max(0,Math.min(33,match.chem||0))*.12-matchFitnessPenalty("home")
}
function weightedMatchPick(rows){
 const usable=(rows||[]).filter(row=>row&&Number(row.weight)>0);if(!usable.length)return null;
 let roll=Math.random()*usable.reduce((n,row)=>n+Number(row.weight),0);
 for(const row of usable){roll-=Number(row.weight);if(roll<=0)return row}
 return usable[usable.length-1]
}
function scorerSlotWeight(slot){
 return slot==="ST"||slot==="CF"?5:slot==="LW"||slot==="RW"||slot==="LM"||slot==="RM"?3.8:slot==="CAM"?3.5:slot==="CM"?2.1:slot==="CDM"?1.25:slot==="LB"||slot==="RB"||slot==="CB"?0.55:0.18
}
function assistSlotWeight(slot){
 return slot==="CAM"?4.3:slot==="LW"||slot==="RW"||slot==="LM"||slot==="RM"?3.9:slot==="CM"?3.5:slot==="ST"||slot==="CF"?2.2:slot==="CDM"?2:slot==="LB"||slot==="RB"?1.8:slot==="CB"?0.65:0.15
}
function chooseScorer(lineup){return chooseMatchAttacker("home")}
function chooseHomeAssist(excludeUid){return chooseMatchCreator("home",excludeUid)}

function opponentMatchBase(entry){
 if(!entry)return null;
 const index=match?.opponentProfile?.squad?.indexOf(entry)??-1,item=match?.opponentProfile?.items?.[index]||entry;
 const effective=base=>typeof chemBoostMatchBase==="function"?chemBoostMatchBase(base,item,index,"away"):base;
 if(typeof entry==="object"){
  if(entry.base&&typeof entry.base==="object")return effective(resolvedPlayer(entry.base));
  if(entry.pid){const itemBaseResolved=displayBase(entry);if(itemBaseResolved)return effective(resolvedPlayer(itemBaseResolved))}
  if(entry.id||entry.name)return effective(resolvedPlayer(entry))
 }
 return effective(P_BY_ID.get(String(entry))||null)
}
function chooseOpponentScorer(){return chooseMatchAttacker("away")}
function chooseOpponentAssist(excludeIndex){return chooseMatchCreator("away",excludeIndex)}

function logGoal(side,scorer,assist,type,shot={}){
 const team=side==="home"?matchHomeTeamName():matchAwayTeamName(),minute=Math.min(120,Math.floor(match.minute));
 const event={
  sceneKind:shot.sceneKind,restartSide:shot.restartSide,defenderIndex:shot.defenderIndex,actionKind:shot.actionKind,finish:shot.finish,shotId:shot.id,side,minute,at:match.minute,playerName:matchEventPlayerName(scorer,"Spieler"),scorer:scorer?.name||"Spieler",assist:assist?.name||"",type,
  scorerUid:side==="home"?String(scorer?.uid||""):"",
  assistUid:side==="home"?String(assist?.uid||""):"",
  scorerIndex:side==="away"?Number(scorer?.index??-1):-1,
  assistIndex:side==="away"?Number(assist?.index??-1):-1,
  scoreHome:match.home,scoreAway:match.away
 };
 match.goalEvents=match.goalEvents||[];match.goalEvents.push(event);
 const in3D=typeof queueMatchGoal3D==="function"&&queueMatchGoal3D(event);
 recordMatchEvent("goal",side,`${event.scorer} · ${team}`);
 recordMatchScene(`${side}-goal`,`${event.scorer} trifft für ${team}!`);
 if(typeof document!=="undefined"&&!in3D)showMatchGoalMoment(event,scorer);
 if(type==="assist"&&assist){addLog(`TOR! ${event.scorer} trifft für ${team}. Vorlage: ${event.assist}.`);return}
 if(type==="solo"){addLog(`TOR! ${event.scorer} trifft für ${team} nach einer Einzelaktion.`);return}
 if(type==="freekick"){addLog(`TOR! ${event.scorer} verwandelt einen direkten Freistoß für ${team}.`);return}
 if(type==="penalty"){addLog(`TOR! ${event.scorer} verwandelt einen Elfmeter für ${team}.`);return}
 addLog(`TOR! ${event.scorer} trifft für ${team}.`)
}
function simAttack(homeSide){
 const pending=match.nextRestart,restart=pending&&match.minute-pending.at<=5?pending:null;delete match.nextRestart;
 if(restart)homeSide=restart.side==="home";
 const won=match.nextCounter,counter=won&&won.side===(homeSide?"home":"away")&&match.minute-won.at<=4?won:null;delete match.nextCounter;
 const side=homeSide?"home":"away",defendingSide=homeSide?"away":"home",team=homeSide?matchHomeTeamName():matchAwayTeamName();
 const attackTactic=tacticMods(homeSide?match.tactic:(match.opponentProfile?.tactic||"balanced"),homeSide?match.customTactics:match.opponentProfile?.customTactics),defenseTactic=tacticMods(homeSide?(match.opponentProfile?.tactic||"balanced"):match.tactic,homeSide?match.opponentProfile?.customTactics:match.customTactics);
 const attackRoles=teamRoleFocusMods(side),defenseRoles=teamRoleFocusMods(defendingSide),attackProfile=matchTeamAttributeProfile(side),defenseProfile=matchTeamAttributeProfile(defendingSide);
 const aiTuning=typeof FooteraOpponentStyles!=='undefined'?FooteraOpponentStyles.matchTuning(match.opponentProfile,side,match.minute):{build:0,duel:0,xg:0};
 const myPower=matchTeamPower(),opponentPower=matchOpponentPower(),edge=(homeSide?myPower-opponentPower:opponentPower-myPower)/28;
 const actions=FooteraMatchActions,advantage=actions.matchupBalance(myPower,opponentPower,matchChemistry(side),matchChemistry(defendingSide));
 let creator=chooseMatchCreator(side);let kind=actions.pick(actions.attackWeights(matchActionTactics(side),creator),Math.random());
 if(restart?.kind==="corner")kind="cross";else if(counter)kind="through";
 if(restart&&["corner","throw_in"].includes(restart.kind))creator=matchRestartCreator(side,restart.kind,restart.flank);
 const setRoll=Math.random(),creationType=restart||counter?(kind==="dribble"?"solo":"assist"):setRoll<.009?"penalty":setRoll<.031?"freekick":kind==="dribble"?"solo":"assist";
 const setPiece=creationType==="penalty"||creationType==="freekick",attacker=setPiece?matchSetPieceTaker(side,creationType):chooseMatchAttacker(side,kind,restart&&["corner","throw_in"].includes(restart.kind)?(side==="home"?creator.uid:creator.index):null);
 if(!attacker)return; // No fictional shot when only a goalkeeper is available.
 if(!setPiece&&(side==="home"?creator.uid===attacker.uid:creator.index===attacker.index))creator=chooseMatchCreator(side,side==="home"?attacker.uid:attacker.index);
 const sceneKind=setPiece?(creationType==="freekick"?"free_kick":"penalty"):restart?.kind|| (counter?"turnover_counter":"");
 const context={sceneKind,restartSide:restart?.flank||"left",tightLateGame:match.minute>=70&&Math.abs(match.home-match.away)<=1,actionKind:setPiece?creationType:kind,finish:setPiece?"normal":actions.finishFor(attacker,kind,Math.random()),creationType};
 const buildDefender=weightedMatchPick(matchDefendingPlayers(defendingSide).filter(p=>p.position!=="GK"));
 const buildAttack=actions.restartBuildSkill(creator,kind,sceneKind,matchActorRows(side).find(r=>r.slot==="GK")),buildDefense=buildDefender?actions.defendSkill(buildDefender,kind,"build"):defenseProfile.defense,buildMargin=matchAttributeGap(buildAttack-buildDefense),buildProfileGap=matchAttributeGap(attackProfile.build-defenseProfile.defense);
 const buildChance=matchClamp(.72+buildMargin*.0035+buildProfileGap*.001+(attackRoles.poss-defenseRoles.poss)*.010+(attackTactic.poss-defenseTactic.poss)*.006+edge*.014+aiTuning.build+advantage.build,.42,.90);
 recordMatchScene(`${side}-build`,`${creator.name} treibt den Spielaufbau von ${team} an.`);
 if(!setPiece&&!eventChance(buildChance-(actions.tactics(matchActionTactics(defendingSide)).pressing-50)*.0008)){
  if(!restart&&Math.random()<.14){match.nextRestart={side,kind:"throw_in",at:match.minute};recordMatchScene(`${side}-throw`,`${team} erhält einen Einwurf.`);return}
  const action=recordMatchDefense(side,"interception",0,buildDefender?.index??-1);
  if(action)match.nextCounter={side:defendingSide,at:match.minute,uid:action.uid,index:action.index};
  if(action){recordMatchScene(`${defendingSide}-interception`,`${action.name} fängt den Pass von ${creator.name} ab.`);if(typeof queueMatchDefensive3D==='function')queueMatchDefensive3D(action,side,creator)}
  return
 }
 const duelDefender=weightedMatchPick(matchDefendingPlayers(defendingSide).filter(p=>p.position!=="GK"));
 const duelAttack=actions.duelSkill(attacker,kind),duelDefense=duelDefender?actions.defendSkill(duelDefender,kind,"duel"):defenseProfile.defense,duelMargin=matchAttributeGap(duelAttack-duelDefense),duelProfileGap=matchAttributeGap(attackProfile.transition-defenseProfile.defense);
 const duelChance=matchClamp(.60+duelMargin*.0038+duelProfileGap*.001+(attackRoles.attack-defenseRoles.defense)*.85+(attackTactic.attack-defenseTactic.defense)*.28+edge*.016+aiTuning.duel+advantage.duel,.28,.86);
 if(!setPiece&&!eventChance(duelChance)){
  const action=recordMatchDefense(side,Math.random()<.72?"tackle":"interception",0,duelDefender?.index??-1);
  if(action)match.nextCounter={side:defendingSide,at:match.minute,uid:action.uid,index:action.index};
  if(action){recordMatchScene(`${defendingSide}-defense`,`${action.name} stoppt ${attacker.name} im Zweikampf.`);if(typeof queueMatchDefensive3D==='function')queueMatchDefensive3D(action,side,attacker)}
  return
 }
 const baseXg=matchClamp(.09+Math.random()*.16+buildMargin*.0009+duelMargin*.0014+(creator.attrs.pas-70)*.0009+(attacker.attrs.dri-70)*.0007+edge*.014+aiTuning.xg+advantage.xg,.05,.52);
 const xg=actions.chanceQuality(baseXg,context,matchActionTactics(defendingSide));
 const creatorDifferent=side==="home"?creator.uid!==attacker.uid:creator.index!==attacker.index;
 const assist=creationType==="assist"?(creatorDifferent?creator:chooseMatchCreator(side,side==="home"?attacker.uid:attacker.index)):null;
 const shot={...context,id:"attempt:"+(match.shotEvents?.length||0),side,minute:Math.min(120,Math.floor(match.minute)),at:match.minute,xg,playerName:matchEventPlayerName(attacker,attacker.name),shooter:attacker.name,shooterUid:homeSide?String(attacker.uid||""):"",shooterIndex:homeSide?-1:Number(attacker.index??-1),shooting:actions.shotSkill(attacker,context),creator:assist?.name||"",creatorUid:assist?.uid||"",creatorIndex:assist?.index??-1,defenderIndex:duelDefender?.index??-1,goal:false,...(!homeSide&&match.opponentProfile?.kind==='generated'&&match.opponentProfile?.styleProfile?.id?{opponentStyle:String(match.opponentProfile.styleProfile.id)}:{})};
 if(homeSide){match.shotsHome++;match.xgHome+=xg}else{match.shotsAway++;match.xgAway+=xg}
 match.shotEvents=match.shotEvents||[];match.shotEvents.push(shot);
 const goalChance=matchFinishingChance(xg,attacker,defendingSide,shot,duelDefender);
 if(eventChance(goalChance)){

  shot.goal=true;shot.outcome="goal";shot.onTarget=true;if(homeSide)match.home++;else match.away++;
  logGoal(side,attacker,assist,creationType,shot)
 }else resolveMissedMatchShot(shot,team)
}
function simTick(){
 if(!match||match.finished||match.paused||match.highlightActive||match.highlight3DPending)return;
 if(resolveEndOfPhase())return;
 // Tempo only changes real-time playback. Every event uses the same virtual-minute step.
 const baseStep=1.25;
 const boundary=!match.halftimeLogged?45:!match.extraTimeStarted?90:!match.extraTimeBreakLogged?105:120;
 const step=Math.min(boundary-match.minute,baseStep);
 if(step<=0){resolveEndOfPhase();return}
 advanceMatchFitness(step);match.minute+=step;
 const homeTactic=tacticMods(match.tactic,match.customTactics),awayTactic=tacticMods(match.opponentProfile?.tactic||"balanced",match.opponentProfile?.customTactics),homeRoles=teamRoleFocusMods("home"),awayRoles=teamRoleFocusMods("away"),homeAttributes=matchTeamAttributeProfile("home"),awayAttributes=matchTeamAttributeProfile("away");
 const powerNow=matchTeamPower(),balance=FooteraMatchActions.matchupBalance(powerNow,matchOpponentPower(),matchChemistry("home"),matchChemistry("away"));
 // Track a bounded 90-minute control target rather than drifting almost
 // imperceptibly from 50:50. Teams with more rating, chemistry and better
 // passing win possession; tactics and CPU styles still matter independently.
 const stylePoss=typeof FooteraOpponentStyles!=='undefined'?FooteraOpponentStyles.possessionBias(match.opponentProfile)*75:0;
 const possessionTarget=matchClamp(50+balance.possession+(homeTactic.poss-awayTactic.poss)*1.0+(homeRoles.poss-awayRoles.poss)*1.2+matchAttributeGap(homeAttributes.build-awayAttributes.build)*.14+stylePoss,34,66);
 match.poss+=(possessionTarget-match.poss)*Math.min(1,step*.065)+(Math.random()-.5)*.45*Math.sqrt(step/1.7);
 match.poss=Math.max(34,Math.min(66,match.poss));

 // Each opportunity now resolves build-up -> duel -> chance -> finish from player attributes.
 const opportunities=step*.42;
 if(Math.random()<Math.min(1,opportunities))simAttack(Math.random()<match.poss/100);
 if(!match.highlightActive&&opportunities>1&&Math.random()<opportunities-1)simAttack(Math.random()<match.poss/100);

 if(match.highlightActive){updateMatchUI();return}

 const min=Math.floor(match.minute);
 if(min>=8&&(match.yellowCards||[]).length<6&&Math.random()<.028)maybeBookPlayer();
 // Management events are limited to regulation time; extra time itself remains uninterrupted.
 if(!match.extraTimeStarted&&min>=50&&!match.injuryTriggered&&Math.random()<.0035){
  match.injuryTriggered=true;
  const starters=match.lineup.slice(0,11).filter(Boolean),starter=starters[Math.floor(Math.random()*starters.length)];
  if(starter){
   match.forcedOut=starter;
   const b=currentMatchBase(starter);
   recordMatchEvent("injury","home",b?.name||"Spieler");recordMatchScene("home-injury",`${b?.name||"Ein Spieler"} hat sich verletzt.`);
   pauseForManagement(`${b?.name||"Ein Spieler"} hat sich verletzt. Eine Auswechslung ist möglich.`);
   return
  }
 }
 if(!match.extraTimeStarted&&min>=60&&!match.redTriggered&&Math.random()<.0017){
  match.redTriggered=sendOffPlayer();
  return
 }

 updateMatchUI();
 resolveEndOfPhase()
}
function maybeBookPlayer(){
 if(!match)return false;
 const side=Math.random()<.5?"home":"away",minute=Math.min(120,Math.floor(match.minute)),already=new Set((match.yellowCards||[]).map(c=>`${c.side}:${c.uid||c.index}`));
 if(side==="home"){
  const form=FORMATIONS[match.formation]||FORMATIONS["4-3-3"],candidates=match.lineup.slice(0,11).map((uid,i)=>({uid,i})).filter(x=>x.uid&&form[x.i]?.p!=="GK"&&!already.has(`home:${x.uid}`));
  if(!candidates.length)return false;
  const picked=candidates[Math.floor(Math.random()*candidates.length)],name=currentMatchBase(picked.uid)?.name||"Spieler";
  match.yellowCards.push({side:"home",uid:picked.uid,index:picked.i,name,minute});recordMatchEvent("yellow","home",name);addLog(`Gelbe Karte für ${name}.`);return true
 }
 const profile=match.opponentProfile,squad=Array.isArray(profile?.squad)?profile.squad:[],form=FORMATIONS[profile?.formation]||FORMATIONS["4-3-3"],candidates=squad.slice(0,11).map((entry,i)=>({entry,i,base:opponentMatchBase(entry)})).filter(x=>x.base&&form[x.i]?.p!=="GK"&&!already.has(`away:${x.i}`));
 if(!candidates.length)return false;
 const picked=candidates[Math.floor(Math.random()*candidates.length)],name=picked.base.name||"Gegenspieler";
 match.yellowCards.push({side:"away",uid:"",index:picked.i,name,minute});recordMatchEvent("yellow","away",name);addLog(`Gelbe Karte für ${name} (${matchAwayTeamName()}).`);return true
}
function sendOffPlayer(){
 if(!match)return false;
 const form=FORMATIONS[match.formation]||FORMATIONS["4-3-3"],candidates=match.lineup.slice(0,11).map((uid,i)=>({uid,i})).filter(x=>x.uid&&form[x.i]?.p!=="GK");
 if(!candidates.length)return false;
 const {uid,i}=candidates[Math.floor(Math.random()*candidates.length)],name=currentMatchBase(uid)?.name||"Spieler",minute=Math.floor(match.minute);
 match.lineup[i]=null;match.redCards=match.redCards||[];match.redCards.push({uid,name,minute,at:match.minute});match.redCardSlot=i;
 recordMatchEvent("red","home",name);recordMatchScene("home-card",`Rote Karte für ${name}.`);
 addLog(`Rote Karte für ${name}! ${matchHomeTeamName()} spielt mit zehn Spielern weiter.`);
 updateMatchUI();pauseForManagement(`Rote Karte für ${name}: Passe bei Bedarf Formation oder Taktik an.`);
 return true
}
function matchNeedsWinner(){
 return !!match&&match.mode!=="rivals"
}
function beginExtraTime(){
 if(!match||match.extraTimeStarted)return;
 match.extraTimeStarted=true;match.extraTimeBreakLogged=false;match.extraTimeManagementActive=true;match.minute=90;
 recordMatchEvent("break","", "Verlängerung");
 addLog("Nach 90 Minuten steht es unentschieden. Vor der Verlängerung ist Team-Management möglich.");
 updateMatchUI();
 pauseForManagement("90 Minuten gespielt – passe jetzt Aufstellung, Wechsel, Formation oder Taktik für die Verlängerung an.")
}
function penaltyShooterPool(side){
 if(side==="home"){
  const rows=(match?.lineup||[]).slice(0,11).map((uid,index)=>{
   const base=uid?currentMatchBase(uid):null;if(!base)return null;
   return{name:base.name||"Spieler",shooting:Math.max(45,Number(base.sho||base.ovr||70)),position:base.position||"",uid,index}
  }).filter(Boolean);
  return rows.sort((a,b)=>(a.position==="GK")-(b.position==="GK")||b.shooting-a.shooting)
 }
 const squad=Array.isArray(match?.opponentProfile?.squad)?match.opponentProfile.squad:[];
 const rows=squad.slice(0,11).map((entry,index)=>{
  const base=opponentMatchBase(entry);if(!base)return null;
  return{name:base.name||"Gegenspieler",shooting:Math.max(45,Number(base.sho||base.ovr||70)),position:base.position||"",index}
 }).filter(Boolean);
 return rows.sort((a,b)=>(a.position==="GK")-(b.position==="GK")||b.shooting-a.shooting)
}
function penaltyOutcomeText(scored){
 const goals=["Souverän verwandelt.","Verlädt den Keeper – drin.","Flach ins Eck – Tor!","Unter die Latte – drin.","Keeper ist dran, aber der Ball geht rein.","Pfosten – und rein!"];
 const misses=["Keeper hält!","An den Pfosten!","Latte!","Drüber!","Knapp vorbei."];
 const list=scored?goals:misses;return list[Math.floor(Math.random()*list.length)]
}
function penaltyDots(side){
 const events=(match?.penaltyEvents||[]).filter(e=>e.side===side),other=(match?.penaltyEvents||[]).filter(e=>e.side!==side),total=Math.max(5,events.length,other.length);
 return Array.from({length:total},(_,i)=>events[i]?'<i class="'+(events[i].scored?"goal":"miss")+'" title="'+esc(events[i].text)+'">'+(events[i].scored?"✓":"×")+'</i>':'<i class="pending">•</i>').join("")
}
function renderPenaltyShootout(lastEvent=null,finished=false){
 const panel=$("penaltyShootoutPanel");if(!panel||!match)return;
 const shooter=lastEvent?'<div class="penalty-live '+(lastEvent.scored?"goal":"miss")+'"><small>'+(lastEvent.side==="home"?esc(matchHomeTeamName()):esc(matchAwayTeamName()))+' · SCHÜTZE '+lastEvent.number+'</small><strong>'+esc(lastEvent.shooter)+'</strong><span>'+esc(lastEvent.text)+'</span></div>':'<div class="penalty-live"><small>ELFMETERSCHIESSEN</small><strong>Die Schützen machen sich bereit.</strong><span>Abwechselnd tritt jedes Team an.</span></div>';
 const winner=finished&&match.penaltyWinner?'<div class="penalty-winner">'+esc(match.penaltyWinner==="home"?matchHomeTeamName():matchAwayTeamName())+' GEWINNT '+match.pensHome+':'+match.pensAway+'</div>':'';
 panel.innerHTML='<div class="penalty-head"><span>ELFMETERSCHIESSEN</span><strong>'+match.pensHome+' : '+match.pensAway+'</strong></div>'+
  '<div class="penalty-team"><b>'+esc(matchHomeTeamName())+'</b><div class="penalty-dots">'+penaltyDots("home")+'</div></div>'+
  '<div class="penalty-team"><b>'+esc(matchAwayTeamName())+'</b><div class="penalty-dots">'+penaltyDots("away")+'</div></div>'+shooter+winner;
 panel.hidden=false
}
function penaltyDecision(){
 const ps=match?.penaltyState;if(!ps)return null;
 const h=Number(match.pensHome||0),a=Number(match.pensAway||0),hk=ps.homeKicks,ak=ps.awayKicks;
 if(hk<=5&&ak<=5){
  const homeRemaining=Math.max(0,5-hk),awayRemaining=Math.max(0,5-ak);
  if(h>a+awayRemaining)return"home";
  if(a>h+homeRemaining)return"away"
 }
 if(hk>=5&&ak>=5&&hk===ak&&h!==a)return h>a?"home":"away";
 return null
}
function runPenaltyShootout(){
 if(!match||match.penaltyWinner||match.penaltyActive)return;
 stopMatchTimer();dismissMatchGoalMoment(false);clearTimeout(penaltyShootoutTimer);
 match.penaltyActive=true;match.paused=true;match.pensHome=0;match.pensAway=0;match.penaltyEvents=[];match.penaltyState={homeKicks:0,awayKicks:0,next:"home"};
 setMatchPill(true);renderPenaltyShootout();
 requestAnimationFrame(()=>$("penaltyShootoutPanel")?.scrollIntoView({behavior:"smooth",block:"center"}));
 const current=match;
 const takeKick=()=>{
  if(match!==current||!match?.penaltyActive)return;
  const ps=match.penaltyState,side=ps.next,pool=penaltyShooterPool(side),kickIndex=side==="home"?ps.homeKicks:ps.awayKicks;
  const shooter=pool.length?pool[kickIndex%pool.length]:{name:side==="home"?"Spieler":"Gegenspieler",shooting:70};
  const edge=Math.max(-.06,Math.min(.06,(matchTeamPower()-matchOpponentPower())/140))*(side==="home"?1:-1);
  const skill=(Number(shooter.shooting||70)-70)*.0025,chance=Math.max(.60,Math.min(.88,.74+edge+skill)),scored=Math.random()<chance,text=penaltyOutcomeText(scored);
  if(side==="home"){ps.homeKicks++;if(scored)match.pensHome++}else{ps.awayKicks++;if(scored)match.pensAway++}
  const event={side,shooter:shooter.name,scored,text,number:kickIndex+1};match.penaltyEvents.push(event);
  addLog('Elfmeterschießen · '+shooter.name+': '+text+' ('+match.pensHome+':'+match.pensAway+')');
  renderPenaltyShootout(event);
  const winner=penaltyDecision();
  if(winner){
   match.penaltyWinner=winner;match.penaltyActive=true;match.paused=true;
   recordMatchEvent("break","",`Elfmeter ${match.pensHome}:${match.pensAway}`);
   addLog(`Elfmeterschießen: ${winner==="home"?matchHomeTeamName():matchAwayTeamName()} gewinnt ${match.pensHome}:${match.pensAway}.`);
   renderPenaltyShootout(event,true);setMatchPill(true);
   penaltyShootoutTimer=setTimeout(()=>{if(match===current)finishMatch()},1700);return
  }
  ps.next=side==="home"?"away":"home";
  penaltyShootoutTimer=setTimeout(takeKick,1350)
 };
 penaltyShootoutTimer=setTimeout(takeKick,900)
}

function resolveEndOfPhase(){
 if(!match||match.finished||match.highlight3DPending)return true;
 if(!match.halftimeLogged&&match.minute>=45){
  match.halftimeLogged=true;match.halftimeActive=true;match.minute=45;updateMatchUI();addLog("Halbzeit.");
  recordMatchEvent("break","", "Halbzeit");
  pauseForManagement("Halbzeit – passe jetzt Aufstellung, Wechsel, Formation oder Taktik für die zweite Halbzeit an.");
  return true
 }
 if(!match.extraTimeStarted&&match.minute>=90){
  match.minute=90;updateMatchUI();
  if(match.home!==match.away||!matchNeedsWinner()){finishMatch();return true}
  beginExtraTime();return true
 }
 if(match.extraTimeStarted&&!match.extraTimeBreakLogged&&match.minute>=105){
  match.extraTimeBreakLogged=true;match.minute=105;updateMatchUI();addLog("Halbzeit der Verlängerung.");
  recordMatchEvent("break","", "105 Minuten");
  return true
 }
 if(match.extraTimeStarted&&match.minute>=120){
  match.minute=120;updateMatchUI();
  if(match.home!==match.away){finishMatch();return true}
  addLog("Auch nach 120 Minuten unentschieden. Das Elfmeterschießen entscheidet.");
  runPenaltyShootout();return true
 }
 return false
}
function matchPlayerWindow(uid){
 if(!match||!uid)return{start:null,end:0,minutes:0};
 const now=Math.max(0,Math.min(120,Number(match.minute||0))),events=Array.isArray(match.substitutionEvents)?match.substitutionEvents:[];
 let start=(match.initialStarters||[]).includes(uid)?0:null,end=now;
 for(const ev of events){
  const minute=Math.max(0,Math.min(120,Number(ev.at??ev.minute??0)));
  if((ev.incoming||[]).some(x=>String(x.uid)===String(uid))&&(start==null||minute<start))start=minute;
  if((ev.outgoing||[]).some(x=>String(x.uid)===String(uid)))end=Math.min(end,minute)
 }
 for(const red of match.redCards||[])if(String(red.uid)===String(uid))end=Math.min(end,Number(red.at??red.minute??now));
 return{start,end,minutes:start==null?0:Math.max(0,end-start)}
}
function matchPlayerMinutes(uid){return matchPlayerWindow(uid).minutes}
function matchPlayerForm(side,uid,index){
 let h=2166136261;for(const c of `${match?.resultId||""}|${side}|${uid||index}`)h=Math.imul(h^c.charCodeAt(0),16777619);
 h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);h^=h>>>16;
 return((h>>>0)/4294967295)*2-1
}
function matchPlayerPerformance(side,uid,index,base){
 const home=side==="home",window=home?matchPlayerWindow(uid):{start:0,end:match.minute,minutes:match.minute},minutes=window.minutes;
 const belongs=(event,uidField,indexField)=>event.side===side&&(home?String(event[uidField]||"")===String(uid):Number(event[indexField]??-1)===index);
 const goals=(match.goalEvents||[]).filter(e=>belongs(e,"scorerUid","scorerIndex")).length,assists=(match.goalEvents||[]).filter(e=>belongs(e,"assistUid","assistIndex")).length;
 const shots=(match.shotEvents||[]).filter(e=>belongs(e,"shooterUid","shooterIndex")),xg=shots.reduce((n,e)=>n+Number(e.xg||0),0);
 const actions=(match.defensiveEvents||[]).filter(e=>belongs(e,"uid","index"));
 const saves=actions.filter(e=>e.kind==="save"),blocks=actions.filter(e=>e.kind==="block").length,tackles=actions.filter(e=>e.kind==="tackle").length,interceptions=actions.filter(e=>e.kind==="interception").length;
 const yellows=(match.yellowCards||[]).filter(e=>belongs(e,"uid","index")).length,reds=(match.redCards||[]).filter(e=>home&&String(e.uid)===String(uid)).length;
 const activeIndex=home?(match.lineup||[]).slice(0,11).indexOf(uid):index,startIndex=home?(match.initialStarters||[]).indexOf(uid):index;
 const priorSub=home?(match.substitutionEvents||[]).flatMap(e=>e.incoming||[]).find(x=>String(x.uid)===String(uid)):null;
 const formation=home?(activeIndex>=0?match.formation:match.initialFormation||match.formation):match.opponentProfile?.formation;
 const form=FORMATIONS[formation]||FORMATIONS["4-3-3"],position=String((activeIndex>=0?form[activeIndex]?.p:priorSub?.position||form[startIndex]?.p)||base?.position||"").toUpperCase();
 const conceded=(match.goalEvents||[]).filter(e=>e.side!==side&&window.start!=null&&Number(e.at??e.minute)>window.start&&Number(e.at??e.minute)<=window.end).length;
 const played=Math.min(1,minutes/90),settled=Math.min(1,Math.max(0,(minutes-10)/50)),attacker=["ST","CF","LW","RW","LM","RM","CAM"].includes(position),midfielder=["CM","CDM","CAM"].includes(position),defender=["CB","LB","RB","LWB","RWB"].includes(position);
 const onTarget=shots.filter(e=>e.onTarget||e.goal).length,quality=Number(base?.ovr||base?.rating||0);
 // Base, card quality and a stable per-match form (the passes and duels the ticker does not show) spread ratings over the 6-8 range.
 let rating=6.45+(quality?Math.max(-.4,Math.min(.35,(quality-82)*.03))*settled:0)+matchPlayerForm(side,uid,index)*.4*settled;
 rating+=goals*.95-Math.max(0,goals-1)*.1+assists*.6;
 rating+=Math.min(.75,shots.length*.09+onTarget*.13+xg*.35)-Math.min(.35,Math.max(0,xg-goals)*.2)-yellows*.25-reds*1.7;
 rating+=Math.min(2.4,saves.length*.32+saves.reduce((n,e)=>n+Number(e.xg||0),0)*.45);
 rating+=Math.min(1.6,tackles*.17+interceptions*.19+blocks*.24);
 if(minutes>=18){
  const sign=home?1:-1,diff=Math.max(-3,Math.min(3,(Number(match.home||0)-Number(match.away||0))*sign)),share=Math.min(1,(minutes-10)/60);
  rating+=((diff>0?.3:diff<0?-.25:0)+diff*.1)*share;
  const xgDiff=Math.max(-2,Math.min(2,(Number(match.xgHome||0)-Number(match.xgAway||0))*sign));
  if(attacker||midfielder)rating+=xgDiff*.1*share;
  if(attacker&&!goals&&!assists&&!shots.length)rating-=Math.min(.4,(minutes-18)/72*.4);
  if(midfielder)rating+=(Number(match.poss||50)-50)*sign*.014;
  if(defender){rating-=conceded*.16;if(!conceded&&minutes>=40)rating+=.4}
  if(position==="GK"){rating-=conceded*.3;if(!conceded&&minutes>=40)rating+=.5}
 }
 if(minutes<8&&!goals&&!assists&&!actions.length&&!shots.length&&!yellows&&!reds)rating=6;
 // Soften the top end so a brace is a 9, a hat-trick a 9.5+, and only a perfect game reaches 10.
 if(rating>7.8)rating=7.8+2.2*(1-Math.exp(-(rating-7.8)/2.2));
 rating=Math.max(3.5,Math.min(10,rating));
 return{rating:Number(rating.toFixed(1)),fitness:matchPlayerFitness(uid,side,index),minutes:Math.round(minutes),position,goals,assists,shots:shots.length,xg:Number(xg.toFixed(2)),saves:saves.length,blocks,tackles,interceptions,defensiveActions:blocks+tackles+interceptions,conceded,yellows,reds}
}
function matchPlayerLivePerformance(uid){
 const base=currentMatchBase(uid);return base?matchPlayerPerformance("home",uid,-1,base):{rating:null,fitness:100,minutes:0,goals:0,assists:0,shots:0,saves:0,defensiveActions:0}
}
function matchPerformanceDetail(p){
 if(p.position==="GK")return `${p.saves} Parade${p.saves===1?"":"n"} · ${p.conceded} Gegentor${p.conceded===1?"":"e"}`;
 if(["CB","LB","RB","LWB","RWB","CDM"].includes(p.position))return `${p.defensiveActions} Defensivaktion${p.defensiveActions===1?"":"en"}`;
 return `${p.goals} Tor${p.goals===1?"":"e"} · ${p.assists} Vorlage${p.assists===1?"":"n"} · ${p.shots} Schüsse`
}
function matchRatingClass(rating){return rating>=7.5?"excellent":rating>=6.7?"good":rating<6?"poor":"average"}
function matchLiveBadgeHTML(uid){
 const p=matchPlayerLivePerformance(uid);if(p.rating==null)return"";
 const played=p.minutes>0||p.goals||p.assists;
 return `<span class="match-live-rating ${played?matchRatingClass(p.rating):"unused"}" title="Live-Bewertung">${played?p.rating.toFixed(1):"–"}</span><span class="match-live-fitness ${p.fitness<=55?"low":p.fitness<=70?"tired":""}" title="Kondition · wirkt auf die Spielstärke">${p.fitness}%</span>`
}
function matchManagerChemLevel(uid){
 if(!uid||!match)return 0;
 const kickoffIndex=(match.initialStarters||[]).indexOf(uid);
 return kickoffIndex>=0&&kickoffIndex<11?Math.max(0,Math.min(3,Number(match.chemBoostChem?.[kickoffIndex]||0))):0
}
function matchManagerChemHTML(uid){
 const chem=matchManagerChemLevel(uid);
 return `<span class="match-manager-chem" title="Individuelle Chemie: ${chem}/3" aria-label="Individuelle Chemie ${chem} von 3">${[1,2,3].map(n=>`<i class="${chem>=n?"on":""}"></i>`).join("")}</span>`
}
function matchManagerBoostHTML(uid){
 if(!uid||typeof FooteraChemBoosts==="undefined")return"";
 const item=match?.clubIndex?.get(uid)||state.club.find(x=>x.uid===uid),boost=FooteraChemBoosts.active(item);
 if(!boost)return"";
 const chem=matchManagerChemLevel(uid),inactive=chem<=0?" inactive":"";
 return `<span class="match-manager-boost${inactive}" style="--cb-accent:${boost.color}" title="Chemie-Boost: ${esc(boost.name)} · ${chem}/3 Chemie" aria-label="Chemie-Boost ${esc(boost.name)}, ${chem} von 3 Chemie">${FooteraChemBoosts.icon(boost.symbol)}</span>`
}
function matchManagerMetaHTML(uid,{chem=true}={}){
 if(!uid)return"";
 const chemistry=chem?matchManagerChemHTML(uid):"",boost=matchManagerBoostHTML(uid);
 return chemistry||boost?`<span class="match-manager-card-meta">${chemistry}${boost}</span>`:""
}
function renderMatchPerformanceStrip(){
 const box=$("matchPerformanceStrip");if(!box||!match)return;
 const ids=[...new Set((match.lineup||[]).slice(0,11).filter(Boolean))],rows=ids.map(uid=>({uid,base:currentMatchBase(uid),p:matchPlayerLivePerformance(uid)})).filter(x=>x.base&&x.p.rating!=null),established=rows.filter(x=>x.p.minutes>=12);
 if(!established.length){box.innerHTML='<span class="match-performance-empty">Live-Bewertungen erscheinen nach den ersten Spielminuten.</span>';return}
 const best=[...established].sort((a,b)=>b.p.rating-a.p.rating)[0],watch=[...established].sort((a,b)=>a.p.rating-b.p.rating).slice(0,2);
 const detail=x=>`${x.p.fitness}% Kondition · ${matchPerformanceDetail(x.p)}`;
 box.innerHTML=`<div class="match-performance-label"><strong>LIVE-LEISTUNG</strong><span>Bewertung · Kondition</span></div><div class="match-performance-cards"><div class="match-performance-card best"><span>Top</span><strong>${esc(best.base.name)} <b>${best.p.rating.toFixed(1)}</b></strong><small>${esc(detail(best))}</small></div>${watch.filter(x=>x.uid!==best.uid).map(x=>`<div class="match-performance-card ${x.p.rating<6?"poor":""}"><span>Beobachten</span><strong>${esc(x.base.name)} <b>${x.p.rating.toFixed(1)}</b></strong><small>${esc(detail(x))}</small></div>`).join("")}</div>`
}
function matchBreakPerformanceText(){
 if(!match)return"";
 const rows=(match.lineup||[]).slice(0,11).filter(Boolean).map(uid=>({base:currentMatchBase(uid),p:matchPlayerLivePerformance(uid)})).filter(x=>x.base&&x.p.minutes>=12);
 if(!rows.length)return"";
 const best=[...rows].sort((a,b)=>b.p.rating-a.p.rating)[0],low=[...rows].sort((a,b)=>a.p.rating-b.p.rating)[0];
 return ` · Top: ${best.base.name} ${best.p.rating.toFixed(1)} · Auffällig: ${low.base.name} ${low.p.rating.toFixed(1)}`
}

let matchManagerDraft=null;
let matchManagerSelectedSlot=null,matchManagerSuppressClickUntil=0;
function initMatchManagerDraft(){
 if(!match)return null;
 matchManagerSelectedSlot=null;
 matchManagerDraft={baseLineup:[...match.lineup],lineup:[...match.lineup],formation:match.formation,tactic:match.tactic};
 return matchManagerDraft
}
function getMatchManagerDraft(){return matchManagerDraft||initMatchManagerDraft()}
function matchManagerPendingSubs(d=getMatchManagerDraft()){
 if(!d)return 0;const baseStarters=new Set(d.baseLineup.slice(0,11).filter(Boolean));
 return d.lineup.slice(0,11).filter(uid=>uid&&!baseStarters.has(uid)).length
}
function matchManagerOutgoing(d=getMatchManagerDraft()){
 if(!d)return [];const active=new Set(d.lineup.slice(0,11).filter(Boolean));
 return d.baseLineup.slice(0,11).filter(uid=>uid&&!active.has(uid))
}
function matchManagerIncoming(d=getMatchManagerDraft()){
 if(!d)return [];const base=new Set(d.baseLineup.slice(0,11).filter(Boolean));
 return d.lineup.slice(0,11).filter(uid=>uid&&!base.has(uid))
}
function matchManagerPlayerLabel(uid,position){
 const base=uid?currentMatchBase(uid):null;if(!base)return `${positionLabel(position)} · freier Platz`;
 const p=matchPlayerLivePerformance(uid);
 return `${positionLabel(position)} · ${base.name} · ${p.minutes?`Bewertung ${p.rating.toFixed(1)} · `:""}Kondition ${p.fitness}%`
}
function matchManagerSlotHTML(uid,i,d=getMatchManagerDraft()){
 const form=FORMATIONS[d?.formation||match?.formation]||FORMATIONS["4-3-3"],slot=form[i],b=uid?currentMatchBase(uid):null,out=b&&posFit(b,slot.p)<=0,forced=uid&&match?.forcedOut===uid;
 const pendingIn=uid&&d?.baseLineup?.slice(11).includes(uid);
 const redEmpty=!uid&&match?.redCardSlot===i;
 return `<button class="match-manager-slot ${out?"out":""} ${forced?"forced":""} ${pendingIn?"pending-in":""} ${redEmpty?"red-card-empty":""}" data-match-slot="${i}" aria-label="${esc(matchManagerPlayerLabel(uid,slot.p))}" aria-pressed="false" style="left:${slot.x}%;top:${slot.y}%">${b?cardHTML(b,state.club.find(x=>x.uid===uid)||null,true,out?b.position:slot.p):`<div class="emptyslot">${redEmpty?"🟥<br>ROT":positionLabel(slot.p)}</div>`}${b?matchLiveBadgeHTML(uid):""}${b?matchManagerMetaHTML(uid):""}${out?'<div class="poswarn" title="Falsche Position" aria-label="Falsche Position">!</div>':''}</button>`
}
function matchManagerBenchHTML(uid,i,d=getMatchManagerDraft()){
 const b=uid?currentMatchBase(uid):null,item=uid?state.club.find(x=>x.uid===uid):null;
 const pendingOut=uid&&d?.baseLineup?.slice(0,11).includes(uid)&&!d.lineup.slice(0,11).includes(uid);
 return `<button class="${pendingOut?"pending-out":""}" data-match-slot="${i}" aria-label="${esc(matchManagerPlayerLabel(uid,b?.position||"Bank"))}" aria-pressed="false">${b?cardHTML(b,item,true,b.position):'<div class="emptyslot">FREI</div>'}${b?matchLiveBadgeHTML(uid):""}${b?matchManagerMetaHTML(uid,{chem:false}):""}</button>`
}
function renderMatchManager(){
 if(!match)return;const d=getMatchManagerDraft();if(!d)return;
 renderMatchPerformanceStrip();
 const form=FORMATIONS[d.formation]||FORMATIONS["4-3-3"];
 $("matchManagerPitch").innerHTML=d.lineup.slice(0,11).map((uid,i)=>matchManagerSlotHTML(uid,i,d)).join("");
 $("matchManagerBench").innerHTML=d.lineup.slice(11,18).map((uid,k)=>matchManagerBenchHTML(uid,11+k,d)).join("");
 const pending=matchManagerPendingSubs(d),used=match.subsUsed||0;
 $("matchSubsMeta").textContent=pending?`${used} + ${pending} geplant / 5 Wechsel`:`${used}/5 Wechsel`;
 $("matchSubsMeta").classList.toggle("pending",pending>0);
 const forced=match.forcedOut?currentMatchBase(match.forcedOut):null;
 const red=match.redCards?.at(-1);
 $("matchManagerStatus").textContent=forced?`${forced.name} verletzt · Wechsel kann vorbereitet werden`:red?`🟥 ${red.name} · 10 Spieler · ${d.formation}`:pending?`${d.formation} · ${pending} Wechsel noch nicht bestätigt`:`${d.formation} · ${$("matchTacticSelect").selectedOptions?.[0]?.textContent||"Ausgeglichen"}`;
 const already=Array.isArray(match.subbedOut)?match.subbedOut:[];
 $("matchUsedSubs").innerHTML=already.length?`<div class="match-manager-used-title">Bereits bestätigte Wechsel · nicht mehr verfügbar</div><div class="match-manager-used-list">${already.map(uid=>{const b=currentMatchBase(uid);return b?`<span class="match-manager-used-player"><b>${currentMatchRating(uid)}</b> ${esc(b.name)}</span>`:""}).join("")}</div>`:"";
 $("matchFormationSelect").value=d.formation;$("matchTacticSelect").value=d.tactic;renderMatchManagerSelection()
}
function proposedManagerSwap(d,from,to){const arr=[...d.lineup],tmp=arr[to];arr[to]=arr[from];arr[from]=tmp;return arr}
function managerDraftIsValid(arr,formation){
 if(arr.slice(0,11).filter(Boolean).length!==11-Math.min(1,match?.redCards?.length||0))return false;
 const form=FORMATIONS[formation]||FORMATIONS["4-3-3"];
 const gkIndex=form.findIndex(x=>x.p==="GK");if(gkIndex>=0){const gk=currentMatchBase(arr[gkIndex]);if(!gk||posFit(gk,"GK")<=0)return false}
 return true
}
function managerDropAllowed(from,to){
 const d=getMatchManagerDraft();if(!match||!d||from===to||from<0||to<0||from>=18||to>=18||!d.lineup[from])return false;
 const proposed=proposedManagerSwap(d,from,to);if(!managerDraftIsValid(proposed,d.formation))return false;
 const temp={...d,lineup:proposed},pending=matchManagerPendingSubs(temp);
 return (match.subsUsed||0)+pending<=5
}
function applyMatchManagerDrop(from,to){
 const d=getMatchManagerDraft();if(!match||!d)return false;
 if(!managerDropAllowed(from,to)){
  const proposed=from>=0&&to>=0&&from<18&&to<18&&d.lineup[from]?proposedManagerSwap(d,from,to):null;
  if(proposed){const temp={...d,lineup:proposed};if((match.subsUsed||0)+matchManagerPendingSubs(temp)>5)toast("Maximal fünf Auswechslungen pro Spiel.");else toast("Ungültiger Wechsel. Die Torwartposition muss mit einem Torwart besetzt bleiben.")}
  return false
 }
 const tmp=d.lineup[to];d.lineup[to]=d.lineup[from];d.lineup[from]=tmp;renderMatchManager();return true
}
function renderMatchManagerSelection(){
 const d=getMatchManagerDraft(),selected=matchManagerSelectedSlot;
 document.querySelectorAll("#managerPanel [data-match-slot]").forEach(el=>el.setAttribute("aria-pressed",String(Number(el.dataset.matchSlot)===selected)));
 const base=selected!=null?currentMatchBase(d?.lineup[selected]):null;
 $("matchManagerHelp").textContent=base?`${base.name} gewählt · Tippe jetzt auf den Zielspieler. Erneutes Antippen hebt die Auswahl auf.`:"Spieler und Ziel antippen oder die Karte ziehen. Erst „Übernehmen“ bestätigt deine Änderungen."
}
function selectMatchManagerSlot(index){
 if(!match?.paused||!Number.isInteger(index)||index<0||index>=18)return false;
 const d=getMatchManagerDraft();if(!d)return false;
 if(matchManagerSelectedSlot==null){if(!d.lineup[index])return false;matchManagerSelectedSlot=index}
 else if(matchManagerSelectedSlot===index)matchManagerSelectedSlot=null;
 else{
  const from=matchManagerSelectedSlot;
  if(!managerDropAllowed(from,index)){applyMatchManagerDrop(from,index);return false}
  matchManagerSelectedSlot=null;return applyMatchManagerDrop(from,index)
 }
 renderMatchManagerSelection();return true
}
$("managerPanel").addEventListener("click",e=>{const slot=e.target.closest("[data-match-slot]");if(slot&&Date.now()>=matchManagerSuppressClickUntil)selectMatchManagerSlot(Number(slot.dataset.matchSlot))});
let matchManagerDrag=null,matchManagerAutoScrollFrame=null,matchManagerAutoScrollVelocity=0;
function stopMatchManagerAutoScroll(){if(matchManagerAutoScrollFrame)cancelAnimationFrame(matchManagerAutoScrollFrame);matchManagerAutoScrollFrame=null;matchManagerAutoScrollVelocity=0;$("match")?.classList.remove("match-manager-dragging")}
function updateMatchManagerDropTarget(x,y){
 const d=matchManagerDrag;if(!d)return;
 document.querySelectorAll("#managerPanel .drop-target,#managerPanel .invalid-target").forEach(el=>el.classList.remove("drop-target","invalid-target"));
 const under=document.elementFromPoint(x,y)?.closest?.("#managerPanel [data-match-slot]");
 d.target=under?Number(under.dataset.matchSlot):null;
 if(under&&d.target!==d.from)under.classList.add(managerDropAllowed(d.from,d.target)?"drop-target":"invalid-target")
}
function updateMatchManagerAutoScroll(clientY){
 const d=matchManagerDrag,host=$("match");if(!d?.active||!host){stopMatchManagerAutoScroll();return}
 const edge=Math.min(175,window.innerHeight*.25),maxSpeed=2.35;
 let velocity=0;
 if(clientY<edge)velocity=-maxSpeed*Math.pow((edge-clientY)/edge,1.25);
 else if(clientY>window.innerHeight-edge)velocity=maxSpeed*Math.pow((clientY-(window.innerHeight-edge))/edge,1.25);
 matchManagerAutoScrollVelocity=velocity;
 if(!velocity){if(matchManagerAutoScrollFrame){cancelAnimationFrame(matchManagerAutoScrollFrame);matchManagerAutoScrollFrame=null}return}
 if(matchManagerAutoScrollFrame)return;
 const tick=()=>{
  if(!matchManagerDrag?.active||!matchManagerAutoScrollVelocity){matchManagerAutoScrollFrame=null;return}
  const before=host.scrollTop;host.scrollTop+=matchManagerAutoScrollVelocity;
  if(host.scrollTop!==before)updateMatchManagerDropTarget(matchManagerDrag.lastX,matchManagerDrag.lastY);
  matchManagerAutoScrollFrame=requestAnimationFrame(tick)
 };
 matchManagerAutoScrollFrame=requestAnimationFrame(tick)
}
function clearMatchManagerDrag(){if(matchManagerDrag?.ghost)matchManagerDrag.ghost.remove();document.querySelectorAll("#managerPanel .drop-target,#managerPanel .invalid-target").forEach(x=>x.classList.remove("drop-target","invalid-target"));stopMatchManagerAutoScroll();matchManagerDrag=null}
function startMatchManagerDrag(e){
 if(!match||!match.paused)return;const d=getMatchManagerDraft(),el=e.target.closest("#managerPanel [data-match-slot]");if(!el||!d)return;const from=Number(el.dataset.matchSlot);if(!Number.isInteger(from)||!d.lineup[from])return;matchManagerDrag={from,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,active:false,ghost:null,target:null};
}
function moveMatchManagerDrag(e){
 const d=matchManagerDrag;if(!d)return;d.lastX=e.clientX;d.lastY=e.clientY;const dist=Math.hypot(e.clientX-d.startX,e.clientY-d.startY);if(!d.active&&dist<7)return;
 if(!d.active){d.active=true;const src=document.querySelector(`#managerPanel [data-match-slot="${d.from}"]`),card=src?.querySelector(".card-shell")?.cloneNode(true),g=document.createElement("div");g.className="match-manager-dragghost";if(card)g.appendChild(card);document.body.appendChild(g);d.ghost=g;document.body.style.userSelect="none";$("match")?.classList.add("match-manager-dragging")}
 if(d.ghost){d.ghost.style.left=`${e.clientX}px`;d.ghost.style.top=`${e.clientY}px`}
 updateMatchManagerDropTarget(e.clientX,e.clientY);updateMatchManagerAutoScroll(e.clientY);
 if(d.active)e.preventDefault()
}
function endMatchManagerDrag(e){const d=matchManagerDrag;if(!d)return;const active=d.active,target=d.target;clearMatchManagerDrag();document.body.style.userSelect="";if(active){matchManagerSuppressClickUntil=Date.now()+400;matchManagerSelectedSlot=null;if(Number.isInteger(target))applyMatchManagerDrop(d.from,target);else renderMatchManagerSelection()}}
document.addEventListener("pointerdown",startMatchManagerDrag,{passive:true});document.addEventListener("pointermove",moveMatchManagerDrag,{passive:false});document.addEventListener("pointerup",endMatchManagerDrag,{passive:true});document.addEventListener("pointercancel",()=>{clearMatchManagerDrag();document.body.style.userSelect=""},{passive:true});

function fillManagerSelectors(){renderMatchManager()}
function pauseForManagement(reason="Team-Management geöffnet."){
 if(match?.paused&&matchManagerDraft){$("managerPanel").scrollIntoView({behavior:"smooth",block:"start"});return}
 if(!match||match.finished)return;match.paused=true;stopMatchTimer();dismissMatchGoalMoment(false);initMatchManagerDraft();$("matchFormationSelect").value=matchManagerDraft.formation;$("matchTacticSelect").value=matchManagerDraft.tactic;renderMatchManager();$("managerPanel").classList.add("active");$("eventBanner").textContent=reason;$("eventBanner").classList.add("active");
 const halftime=!!match.halftimeActive,extraTime=!!match.extraTimeManagementActive;
 $("managerPanel").querySelector("h3").textContent=halftime?"Halbzeit · Team-Management":extraTime?"Vor der Verlängerung":"Team-Management";
 const summary=$("matchBreakSummary");summary.hidden=!halftime&&!extraTime;
 if(!summary.hidden)summary.innerHTML=`<strong>${esc(matchHomeTeamName())} ${match.home}:${match.away} ${esc(matchAwayTeamName())}</strong><span>${halftime?"Halbzeit":"90 Minuten"} · Schüsse ${match.shotsHome}:${match.shotsAway} · xG ${match.xgHome.toFixed(1)}:${match.xgAway.toFixed(1)} · Ballbesitz ${Math.round(match.poss)}:${100-Math.round(match.poss)}${esc(matchBreakPerformanceText())}. Passe jetzt Aufstellung oder Taktik an.</span>`;
 $("confirmSubBtn").textContent=halftime?"Übernehmen & 2. Halbzeit":extraTime?"Übernehmen & Verlängerung":"Übernehmen & weiterspielen";
 $("resumeMatchBtn").textContent=halftime||extraTime?"Ohne Änderungen weiter":"Änderungen verwerfen";
 setMatchPill(true);requestAnimationFrame(()=>$("managerPanel").scrollIntoView({behavior:"smooth",block:"start"}))
}
function resumeMatch(){
 if(!match||match.finished)return;const fromHalftime=!!match.halftimeActive,fromExtraTime=!!match.extraTimeManagementActive;matchManagerDraft=null;match.paused=false;match.forcedOut=null;match.halftimeActive=false;match.extraTimeManagementActive=false;$("managerPanel").classList.remove("active");$("eventBanner").classList.remove("active");$("confirmSubBtn").textContent="Übernehmen & weiterspielen";$("resumeMatchBtn").textContent="Änderungen verwerfen";if(fromHalftime){addLog("2. Halbzeit angepfiffen.");recordMatchScene("idle","2. Halbzeit angepfiffen.")}if(fromExtraTime){addLog("Verlängerung angepfiffen.");recordMatchScene("idle","Verlängerung angepfiffen.")}setMatchPill(false);$("matchLiveStage").scrollIntoView({behavior:"smooth",block:"center"});startMatchTimer()
}
function confirmMatchManagerChanges(){
 if(!match)return;const d=getMatchManagerDraft();if(!d)return;
 const incoming=matchManagerIncoming(d),outgoing=matchManagerOutgoing(d),pending=incoming.length;
 if((match.subsUsed||0)+pending>5)return toast("Maximal fünf Auswechslungen pro Spiel.");
 if(!managerDraftIsValid(d.lineup,d.formation))return toast("Die Startelf ist so nicht gültig.");
 match.formation=d.formation;match.tactic=d.tactic;
 let committed=[...d.lineup];if(outgoing.length)committed=committed.map(uid=>outgoing.includes(uid)?null:uid);
 match.lineup=committed;match.subsUsed=(match.subsUsed||0)+pending;if(!Array.isArray(match.subbedOut))match.subbedOut=[];outgoing.forEach(uid=>{if(uid&&!match.subbedOut.includes(uid))match.subbedOut.push(uid)});
 if(pending){
  const inPlayers=incoming.map(uid=>({uid,name:currentMatchBase(uid)?.name||"Spieler",position:(FORMATIONS[d.formation]||FORMATIONS["4-3-3"])[d.lineup.indexOf(uid)]?.p})),outPlayers=outgoing.map(uid=>({uid,name:currentMatchBase(uid)?.name||"Spieler"}));
  const inNames=inPlayers.map(x=>x.name).join(", "),outNames=outPlayers.map(x=>x.name).join(", ");
  match.substitutionEvents=match.substitutionEvents||[];match.substitutionEvents.push({minute:Math.min(120,Math.floor(match.minute)),at:match.minute,side:"home",incoming:inPlayers,outgoing:outPlayers});
  addLog(`Wechsel bestätigt: ${inNames||pending+" Spieler"} rein · ${outNames||pending+" Spieler"} raus.`);
  recordMatchEvent("sub","home",`${inNames||pending+" Spieler"} eingewechselt`)
 }
 addLog(`Formation: ${match.formation} · Taktik: ${$("matchTacticSelect").selectedOptions[0]?.textContent||"Ausgeglichen"}.`);resumeMatch()
}
$("manageTeamBtn").addEventListener("click",()=>pauseForManagement("Du hast die Simulation für Team-Management pausiert."));
$("resumeMatchBtn").addEventListener("click",()=>{if(!match?.halftimeActive&&!match?.extraTimeManagementActive)toast("Änderungen verworfen.");resumeMatch()});
$("matchFormationSelect").addEventListener("change",()=>{const d=getMatchManagerDraft();if(!d)return;d.formation=$("matchFormationSelect").value;renderMatchManager()});
$("matchTacticSelect").addEventListener("change",()=>{const d=getMatchManagerDraft();if(!d)return;d.tactic=$("matchTacticSelect").value;renderMatchManager()});
$("confirmSubBtn").addEventListener("click",confirmMatchManagerChanges);

$("matchSpeedBtn").addEventListener("click",()=>{
 if(matchSpeed===800){matchSpeed=250;$("matchSpeedBtn").textContent="Tempo: Schnell"}
 else{matchSpeed=800;$("matchSpeedBtn").textContent="Tempo: Normal"}
 if(match&&!match.paused&&!match.finished)startMatchTimer()
});

function matchReportGoalDetail(event){
 if(event.type==="assist"&&event.assist)return `Vorlage: ${event.assist}`;
 if(event.type==="solo")return"Einzelaktion";
 if(event.type==="freekick")return"Direkter Freistoß";
 if(event.type==="penalty")return"Elfmeter";
 return"Tor"
}
function matchReportPerformanceRows(side){
 const home=side==="home",rows=[];
 if(home){
  const ids=[...(match.initialStarters||[]),...(match.substitutionEvents||[]).flatMap(e=>(e.incoming||[]).map(x=>x.uid))].filter(Boolean),seen=new Set();
  ids.forEach((uid,order)=>{if(seen.has(uid))return;seen.add(uid);const item=match.clubIndex?.get(uid)||state.club.find(x=>x.uid===uid),base=item?displayBase(item):currentMatchBase(uid);if(base)rows.push({side:"home",uid,index:-1,order,item,base,name:base.name||"Spieler"})})
 }else{
  const squad=Array.isArray(match.opponentProfile?.squad)?match.opponentProfile.squad:[];
  squad.slice(0,11).forEach((entry,index)=>{const base=opponentMatchBase(entry);if(!base)return;rows.push({side:"away",uid:"",index,order:index,item:match.opponentProfile?.items?.[index]||null,base,name:base.name||"Gegenspieler"})})
 }
 for(const row of rows)Object.assign(row,matchPlayerPerformance(side,row.uid,row.index,row.base));
 return rows.sort((a,b)=>b.rating-a.rating||(b.goals+b.assists)-(a.goals+a.assists)||a.order-b.order)
}
function matchReportPotm(){
 const all=[...matchReportPerformanceRows("home"),...matchReportPerformanceRows("away")];
 return all.sort((a,b)=>b.rating-a.rating||(b.goals+b.assists)-(a.goals+a.assists)||b.goals-a.goals||b.shots-a.shots)[0]||null
}
function matchReportTimelineRows(){
 const rows=[];
 for(const e of match.goalEvents||[])rows.push({minute:e.minute,kind:"goal",side:e.side,title:`${e.scorer} · ${e.scoreHome}:${e.scoreAway}`,detail:matchReportGoalDetail(e),icon:"⚽"});
 for(const e of match.yellowCards||[])rows.push({minute:e.minute,kind:"yellow",side:e.side,title:e.name,detail:"Gelbe Karte",icon:"🟨"});
 for(const e of match.redCards||[])rows.push({minute:e.minute,kind:"red",side:"home",title:e.name,detail:"Rote Karte",icon:"🟥"});
 for(const e of match.substitutionEvents||[]){
  const ins=(e.incoming||[]).map(x=>x.name).join(", "),outs=(e.outgoing||[]).map(x=>x.name).join(", ");
  rows.push({minute:e.minute,kind:"sub",side:e.side||"home",title:ins||"Wechsel",detail:outs?`Für: ${outs}`:"Einwechslung",icon:"↔"})
 }
 for(const e of match.timeline||[])if(e.kind==="injury")rows.push({minute:e.minute,kind:"injury",side:e.side||"home",title:e.text,detail:"Verletzung",icon:"✚"});
 if(match.penaltyWinner)rows.push({minute:120,kind:"pens",side:match.penaltyWinner,title:`Elfmeterschießen ${match.pensHome}:${match.pensAway}`,detail:`${match.penaltyWinner==="home"?matchHomeTeamName():matchAwayTeamName()} gewinnt`,icon:"●"});
 return rows.sort((a,b)=>a.minute-b.minute||({goal:0,yellow:1,red:2,injury:3,sub:4,pens:5}[a.kind]??9)-({goal:0,yellow:1,red:2,injury:3,sub:4,pens:5}[b.kind]??9))
}
function matchReportPlayerCard(row){
 if(!row?.base)return"";
 if(row.side==="away"&&match.opponentProfile?.kind==="friend"){
  const entry=match.opponentProfile?.squad?.[row.index];return entry?friendCard(entry,row.base.position||"ST",true):cardHTML(row.base,row.item,true)
 }
 return cardHTML(row.base,row.item,true)
}
function matchReportPerformanceHTML(title,rows){
 return `<section class="match-report-team"><div class="match-report-section-title"><strong>${esc(title)}</strong><span>Spielerleistungen</span></div><div class="match-performance-list">${rows.map(row=>{const defensive=["CB","LB","RB","LWB","RWB","CDM"].includes(row.position),label=row.position==="GK"?"PAR":defensive?"DEF":"S",value=row.position==="GK"?row.saves:defensive?row.defensiveActions:row.shots;return `<div class="match-performance-row"><div class="match-performance-player"><strong>${esc(row.name)}</strong><span>${esc(positionLabel(row.position,row.base))} · ${row.minutes} Min.</span></div><div><b>${row.goals}</b><span>T</span></div><div><b>${row.assists}</b><span>V</span></div><div title="${esc(matchPerformanceDetail(row))}"><b>${value}</b><span>${label}</span></div><div class="match-rating ${row.rating>=8?"elite":row.rating>=7?"good":""}">${row.rating.toFixed(1)}</div></div>`}).join("")}</div><p class="match-performance-key">T = Tore · V = Vorlagen · S = Schüsse · PAR = Paraden · DEF = erfolgreiche Defensivaktionen</p></section>`
}
function renderMatchReport(){
 const root=$("matchReport");if(!root||!match)return;
 const poss=Math.max(32,Math.min(68,Math.round(match.poss))),potm=matchReportPotm(),timeline=matchReportTimelineRows(),homeRows=matchReportPerformanceRows("home"),awayRows=matchReportPerformanceRows("away");
 const potmTeam=potm?.side==="home"?matchHomeTeamName():matchAwayTeamName(),potmCard=potm?matchReportPlayerCard(potm):"";
 const cardsHome=(match.yellowCards||[]).filter(x=>x.side==="home").length+(match.redCards||[]).length,cardsAway=(match.yellowCards||[]).filter(x=>x.side==="away").length;
 const homeTop=homeRows[0]||null,homeLow=homeRows.length?homeRows[homeRows.length-1]:null,homeAvg=homeRows.length?homeRows.reduce((n,row)=>n+Number(row.rating||0),0)/homeRows.length:0;
 const performanceSummary=homeTop?`<div class="match-report-performance-summary"><span><b>Top</b> ${esc(homeTop.name)} <strong>${homeTop.rating.toFixed(1)}</strong></span><span><b>Ø Team</b> <strong>${homeAvg.toFixed(1)}</strong></span>${homeLow?`<span><b>Schwächster</b> ${esc(homeLow.name)} <strong>${homeLow.rating.toFixed(1)}</strong></span>`:""}</div>`:"";
 root.innerHTML=`<div class="match-report-kicker">SPIELBERICHT 2.0</div>
 <div class="match-report-statgrid">
  <div><span>Ballbesitz</span><b>${poss}%</b><small>${100-poss}%</small></div>
  <div><span>Schüsse</span><b>${match.shotsHome}</b><small>${match.shotsAway}</small></div>
  <div><span>xG</span><b>${match.xgHome.toFixed(1)}</b><small>${match.xgAway.toFixed(1)}</small></div>
  <div><span>Karten</span><b>${cardsHome}</b><small>${cardsAway}</small></div>
 </div>
 ${potm?`<section class="match-potm"><div class="match-potm-card">${potmCard}</div><div class="match-potm-copy"><span>SPIELER DES SPIELS</span><strong>${esc(potm.name)}</strong><small>${esc(potmTeam)}</small><div><b>${potm.rating.toFixed(1)}</b><em>Matchrating</em></div><p>${esc(matchPerformanceDetail(potm))}</p></div></section>`:""}
 <section class="match-report-events"><div class="match-report-section-title"><strong>Timeline</strong><span>Tore, Karten, Wechsel</span></div><div class="match-report-event-list">${timeline.length?timeline.map(e=>`<div class="match-report-event ${e.side} ${e.kind}"><time>${e.minute}'</time><i>${e.icon}</i><div><strong>${esc(e.title)}</strong><span>${esc(e.detail)}</span></div></div>`).join(""):'<div class="match-report-empty">Keine besonderen Ereignisse.</div>'}</div></section>
 <details class="match-report-performance-details"><summary><div><strong>Spielerleistungen</strong><span>${esc(matchHomeTeamName())} · Bewertungen & Statistiken</span></div><i aria-hidden="true">⌄</i></summary>${performanceSummary}<div class="match-report-teams">${matchReportPerformanceHTML(matchHomeTeamName(),homeRows)}${matchReportPerformanceHTML(matchAwayTeamName(),awayRows)}</div></details>`
}
function applyClubGoalStats(){
 if(!match||match.playerStatsApplied)return;
 match.playerStatsApplied=true;
 for(const event of match.goalEvents||[]){
  if(event?.side!=="home")continue;
  if(event.scorerUid){
   const scorer=state.club.find(item=>String(item.uid)===String(event.scorerUid));
   if(scorer)scorer.clubGoals=Math.max(0,Number(scorer.clubGoals||0))+1
  }
  if(event.assistUid){
   const assister=state.club.find(item=>String(item.uid)===String(event.assistUid));
   if(assister)assister.clubAssists=Math.max(0,Number(assister.clubAssists||0))+1
  }
 }
}
function finishMatch(){
 if(!match||match.finished)return;
 ensureObjectiveWindows();
 clearTimeout(penaltyShootoutTimer);penaltyShootoutTimer=null;
 match.penaltyActive=false;match.paused=false;
 const penaltyPanel=$("penaltyShootoutPanel");if(penaltyPanel)penaltyPanel.hidden=true;
 stopMatchTimer();
 dismissMatchGoalMoment(false);
 match.finished=true;match.minute=match.extraTimeStarted?120:90;updateMatchUI();applyClubGoalStats();
 recordMatchEvent("break","", "Abpfiff");
 state.stats.matches++;globalThis.FooteraShare?.afterMatch();
 const isFriendly=String(match.mode).startsWith("friendly");
 const decidedByPens=match.home===match.away&&!!match.penaltyWinner;
 const homeWon=match.home>match.away||(decidedByPens&&match.penaltyWinner==="home");
 const awayWon=match.home<match.away||(decidedByPens&&match.penaltyWinner==="away");
 if(isFriendly)state.stats.friendlies=(state.stats.friendlies||0)+1;
 let reward=0,resultKey="loss";
 if(homeWon){
  resultKey="win";state.stats.wins++;if(isFriendly)state.stats.friendlyWins=(state.stats.friendlyWins||0)+1;
  reward=isFriendly?0:(match.mode==="rivals"?750:match.mode==="champions"?championsMatchCoins("win"):(match.mode==="squad"&&match.opponentProfile?.rewards?match.opponentProfile.rewards.win:700));
  // Division progression and weekly points are recorded once below.
 }else if(!awayWon){
  resultKey="draw";state.stats.draws++;reward=match.mode==="rivals"?610:0
 }else{
  state.stats.losses++;reward=isFriendly?0:(match.mode==="champions"?championsMatchCoins("loss"):(match.mode==="squad"&&match.opponentProfile?.rewards?match.opponentProfile.rewards.loss:465))
 }
 if(!isFriendly){
  state.stats.competitiveMatches=(state.stats.competitiveMatches||0)+1;
  if(resultKey==="win")state.stats.competitiveWins=(state.stats.competitiveWins||0)+1;
  if(match.mode==="rivals"){state.stats.rivalsMatches=(state.stats.rivalsMatches||0)+1;if(resultKey==="win")state.stats.rivalsWins=(state.stats.rivalsWins||0)+1}
  if(match.mode==="champions"){state.stats.championsMatches=(state.stats.championsMatches||0)+1;if(resultKey==="win")state.stats.championsWins=(state.stats.championsWins||0)+1}
  if(match.mode==="squad"){state.stats.squadMatches=(state.stats.squadMatches||0)+1;if(resultKey==="win")state.stats.squadWins=(state.stats.squadWins||0)+1}
 }
 const competitionProgress=recordCompetitionMatch(match.mode,resultKey,match.home,match.away,match.opponentProfile,match.battleDifficulty);
 match.competitionProgress=competitionProgress;match.progressScreenShown=false;
 let boostCoins=0;
 if(!isFriendly&&(!state.coinBoost||state.coinBoost.games<=0)&&state.coinBoostQueue?.length)state.coinBoost=state.coinBoostQueue.shift();
 if(!isFriendly&&state.coinBoost?.games>0&&state.coinBoost?.amount>0){boostCoins=Number(state.coinBoost.amount||0);state.coinBoost.games=Math.max(0,Number(state.coinBoost.games||0)-1)}
 state.coins+=reward+boostCoins;
 const squadSp=match.mode==="squad"&&match.opponentProfile?.sp?Math.round(match.opponentProfile.sp*(resultKey==="win"?1:resultKey==="draw"?.7:.45)):80;state.sp=(state.sp||0)+(isFriendly?0:(match.mode==="rivals"?120:match.mode==="champions"?150:squadSp));
 progressEvolution(resultKey);claimSeasonRewards();save();
 recordEventObjectiveMatch(match,resultKey);
 $("managerPanel").classList.remove("active");
 $("eventBanner").classList.remove("active");
 $("matchResult").classList.add("active");
 $("matchResultTitle").textContent=homeWon?"Sieg":awayWon?"Niederlage":"Unentschieden";
 const pens=decidedByPens?` · Elfmeterschießen ${match.pensHome}:${match.pensAway}`:"";
 const extra=match.extraTimeStarted&&!decidedByPens?" · nach Verlängerung":decidedByPens?" · nach Elfmeterschießen":"";
 $("matchResultText").textContent=`${matchHomeTeamName()} ${match.home}:${match.away} ${matchAwayTeamName()}${pens}${extra} · ${match.shotsHome}:${match.shotsAway} Schüsse · xG ${match.xgHome.toFixed(1)}:${match.xgAway.toFixed(1)}`;
 renderMatchReport();
 $("matchReward").textContent=isFriendly?"Freundschaftsspiel · keine Rivals-/Squad-Battle-Belohnung":`+ ${fmt(reward+boostCoins)} Coins${boostCoins?` · davon +${fmt(boostCoins)} Boost · ${state.coinBoost.games} Boost-Spiele übrig`:""}`;
 renderCompetitionProgress(null);
 setMatchPill(true);
 renderAll();
 // V21.226: the final-whistle scene first; the queue scrolls to the result after it.
 if(!(typeof queueMatchCeremony3D==="function"&&queueMatchCeremony3D("fulltime")))requestAnimationFrame(()=>$("matchResult").scrollIntoView({behavior:"smooth",block:"start"}))
}
function closeFinishedMatch(){
 if(typeof hidePostMatchProgress==="function")hidePostMatchProgress();
 if(history.state?.gfut&&history.state.kind==="match")history.back();
 else{stopMatchTimer();$("match").classList.remove("active");match=null;matchManagerDraft=null;switchView("playView")}
}
$("matchClose").addEventListener("click",()=>{
 if(match?.competitionProgress&&!match.progressScreenShown&&typeof showPostMatchProgress==="function"){
  match.progressScreenShown=true;
  if(showPostMatchProgress(match.competitionProgress))return
 }
 closeFinishedMatch()
});
$("postMatchProgressClose").addEventListener("click",closeFinishedMatch)

let homeHeroSlide=0;
function homeClaimableTasks(){return TASKS.filter(t=>Math.min(t.target,state.stats[t.stat]||0)>=t.target&&!state.claims[t.id])}
function homeOwnedPacks(){return PACKS.filter(p=>(state.packs[p.id]||0)>0)}
function homeRewardsTotal(){return homeClaimableTasks().length+availableObjectiveRewardsCount()+competitionPending().length+homeOwnedPacks().reduce((s,p)=>s+(state.packs[p.id]||0),0)}
function updateObjectiveIndicators(){
 const objectiveReady=homeClaimableTasks().length+availableRotatingObjectiveRewardsCount(),passReady=availablePassRewardsCount();
 for(const [id,count] of [["homeObjectiveBadge",objectiveReady],["moreObjectiveBadge",objectiveReady],["homePassBadge",passReady],["morePassBadge",passReady]]){
  const badge=$(id);if(!badge)continue;badge.hidden=!count;badge.textContent=count?String(count):""
 }
 $("homeObjectiveHint").textContent=objectiveReady?`${objectiveReady} Belohnung${objectiveReady===1?"":"en"} abholbereit`:"Belohnungen freischalten";
 $("homePassHint").textContent=passReady?`${passReady} Passbelohnung${passReady===1?"":"en"} abholbereit`:"Kostenlos & Premium · 30 Stufen"
}
// HALLOWEEN gets its own hero: silhouettes as teaser until the event starts, then the live team.
function halloweenHeroSlide(at=Date.now()){
 const ev=HALLOWEEN_EVENT,start=Date.parse(ev.activeFrom),end=Date.parse(ev.activeUntilAt),teaserFrom=Date.parse("2026-10-22T19:00:00+02:00");
 if(at<teaserFrom||at>=end||!eventRosterReady(ev))return null;
 const fmtDay=d=>new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}).format(new Date(d));
 if(at<start){const days=Math.max(0,Math.round((start-at)/86400000));return{kicker:"DEMNÄCHST · FR 30.10. · 19:00",title:'HALLOWEEN<br><span>BLUTMOND</span>',text:`Eigenes Kartendesign, 18 Spezialkarten, eine geheime Spieler-SBC und die Blutmond-Evolution. ${days<1?"Heute Abend":days===1?"Morgen":`In ${days} Tagen`} geht der Mond auf.`,button:"Was kommt?",action:"halloween-preview",shield:"🎃",live:"BALD",aside:"18 SPEZIALKARTEN",aside2:"30.10. · 19:00",theme:"halloween",teaser:true,event:ev}}
 const upgrade=halloweenUpgradeFor({eventType:"halloween"},at),upAt=Date.parse(ev.upgrade.at);
 return{kicker:upgrade?"BLUTMOND-UPGRADE AKTIV · +1 AUF ALLE HALLOWEEN-KARTEN":"NEUES EVENT · HALLOWEEN",title:'HALLOWEEN<br><span>BLUTMOND</span>',text:upgrade?`Der Blutmond ist aufgegangen: Jede Halloween-Karte hat jetzt +1 GES und +1 auf alle Werte. In Packs bis ${fmtDay(end)} Uhr.`:`18 Spezialkarten in Packs bis ${fmtDay(end)} Uhr. In der Halloween-Nacht (${fmtDay(upAt)} Uhr) bekommt jede Halloween-Karte das Blutmond-Upgrade.`,button:"Zum Team",action:"promo-team",teamView:"momentum-shop",teamButton:"Zum Shop",shield:"🎃",live:"JETZT IN PACKS",aside:`${ev.players.length} SPEZIALKARTEN`,aside2:ev.activeUntil,theme:"halloween",event:ev}
}
function homeHeroSlides(){const event=activeMomentumEvent(),halloween=typeof halloweenHeroSlide==="function"?halloweenHeroSlide():null;return[
 ...(halloween?[halloween]:[]),
 ...(event?[{kicker:`NEUES EVENT · ${event.subtitle}`,title:`MOMENTUM<br><span>${event.subtitle}</span>`,text:`${event.name} ${event.subtitle} ist jetzt live. Verfügbar in Packs bis ${new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}).format(new Date(event.activeUntilAt))} Uhr.`,button:"Zum Team",action:"momentum-team",teamView:"momentum-shop",teamButton:"Zum Shop",shield:"M",live:"JETZT IN PACKS",aside:`${event.players.length} SPEZIALKARTEN`,aside2:event.activeUntil,theme:"momentum",event}]:[]),
 {kicker:"LIVE HUB",title:'DIVISION<br><span>RIVALS</span>',text:"Steige durch die Divisionen auf und sichere dir bessere Rewards.",button:"Rivals öffnen →",go:"playView",shield:"DR",live:"LIVE NOW",aside:"DIVISIONEN. PUNKTE. REWARDS.",aside2:`DIVISION ${state.rivals.division||"ELITE"} · ${state.rivals.weeklyPoints}/35`,theme:"gold"},
 totwIsActive()?{kicker:"AKTUELLE INHALTE",title:'TEAM DER<br><span>WOCHE</span>',text:`${totwDisplayName(LIVE_TOTW.name)} ist aktiv. Entdecke die aktuellen Spezialkarten im Store.`,button:"Zum Store →",go:"storeView",teamView:"totw",shield:"TOTW",live:"JETZT AKTIV",aside:"NEUE SPEZIALKARTEN",aside2:"NUR FÜR KURZE ZEIT",theme:"gold"}:{kicker:"SAISONPASS",title:'DEINE<br><span>SAISON</span>',text:"Spiele Matches und erfülle Ziele, um Spielbelohnungen freizuschalten.",button:"Saisonpass öffnen →",go:"seasonPassView",shield:"SP",live:"SAISON AKTIV",aside:"KOSTENLOS & PREMIUM",aside2:`${fmt(state.sp||0)} SP GESAMMELT`,theme:"gold"},
 {kicker:"EVOLUTIONS",title:'EVOLUTION<br><span>LAB</span>',text:activeEvolutionCount()?`${activeEvolutionCount()}/3 Evolutionen laufen. Spiele weiter und entwickle deine Profis parallel.`:"Wähle geeignete Spieler und entwickle sie über Match-Ziele weiter.",button:"Evolutions öffnen →",go:"evolutionView",shield:"EVO",live:activeEvolutionCount()?`${activeEvolutionCount()}/3 AKTIV`:"VERFÜGBAR",aside:"ENTWICKLE DEINE PROFIS",aside2:"MATCHES · BOOSTS · PLAYSTYLES",theme:"violet"}
]}
function renderHomeHero(){
 const slides=homeHeroSlides();if(homeHeroSlide>=slides.length)homeHeroSlide=0;
 const hero=slides[homeHeroSlide],card=$("homeHeroCard");if(card)card.dataset.theme=hero.theme;
 $("homeHeroKicker").textContent=hero.kicker;$("homeHeroTitle").innerHTML=hero.title;$("homeHeroText").textContent=hero.text;
 $("homeHeroShield").textContent=hero.shield;$("homeHeroLive").textContent=hero.live;$("homeHeroAside").innerHTML=hero.aside.replace(". ",".<br>");$("homeHeroAside2").textContent=hero.aside2;
 const action=$("homeHeroAction");action.textContent=hero.button;action.dataset.homeHeroAction=hero.action||"";if(hero.go)action.dataset.go=hero.go;else delete action.dataset.go;
 const teamBtn=$("homeHeroTeam");teamBtn.style.display=hero.teamView?"inline-flex":"none";teamBtn.textContent=hero.teamButton||"Team ansehen";teamBtn.dataset.homeTeamView=hero.teamView||"";
 const roster=$("homeMomentumRoster");roster.hidden=!hero.event;roster.classList.toggle("teaser",!!hero.teaser);
 const eventPlayers=hero.event?promoEventEntries(hero.event):[];
 roster.innerHTML=eventPlayers.slice(0,4).map((entry,index)=>`<button type="button" class="home-momentum-player" data-home-event-player="${index}" aria-label="${esc(entry.player.name)} Spielerbiografie öffnen">${cardHTML(entry.player,entry.item,true,entry.player.position)}</button>`).join("")+(eventPlayers.length>4?`<span class="home-momentum-count">+${eventPlayers.length-4} weitere Karten im Team</span>`:"");
 $("homeSliderDots").innerHTML=slides.map((_,i)=>`<span class="home-slider-dot ${i===homeHeroSlide?"active":""}" data-home-slide="${i}" aria-hidden="true"></span>`).join("")
}
function renderHomeRewards(){
 const claimable=homeClaimableTasks(),objectivesReady=availableRotatingObjectiveRewardsCount(),passReady=availablePassRewardsCount(),packs=homeOwnedPacks(),pending=competitionPending(),total=claimable.length+objectivesReady+passReady+pending.length+packs.reduce((n,pack)=>n+(state.packs[pack.id]||0),0);
 $("homeReadyCount").textContent=String(total);
 $("homeReadySummary").textContent=total?`Du hast ${total} Belohnung${total===1?"":"en"}, die abgeholt werden können.`:"Aktuell warten keine Belohnungen auf dich.";
 const cards=pending.map(row=>'<div class="home-reward-card"><div class="reward-gift">'+(row.mode==="champions"?"FC":row.mode==="squad"?"SB":"RV")+'</div><div class="home-reward-copy"><strong>'+esc(row.mode==="champions"?"Champions":row.mode==="squad"?"Squad-Battles":"Rivals")+'-Belohnung abholbereit</strong><small>'+esc(row.mode==="rivals"?(Number(row.division)===0?"Elite":"Division "+row.division)+' · '+row.milestone+' Punkte':row.rank)+'</small><p>'+esc(rewardLabel(row))+'</p><button class="primary" type="button" data-weekly-reward-open data-weekly-reward-mode="'+esc(row.mode)+'" data-weekly-reward-week="'+esc(row.week)+'">Rewards ansehen</button></div></div>')
 if(claimable.length){const first=claimable[0];cards.push(`<div class="home-reward-card"><div class="reward-gift"><svg viewBox="0 0 48 48"><path d="M8 20h32v22H8zM5 14h38v8H5zM24 14v28M14 14c-5-2-5-10 0-10 5 0 10 10 10 10M34 14c5-2 5-10 0-10-5 0-10 10-10 10"/></svg></div><div class="home-reward-copy"><strong>Aufgaben-Belohnungen</strong><small>${claimable.length} Aufgabe${claimable.length===1?"":"n"} abgeschlossen</small><p>${esc(first.title)} · ${esc(rewardText(first.reward))}</p><button class="primary" data-go="objectivesView">Jetzt abholen</button></div></div>`)}
 if(objectivesReady)cards.push(`<div class="home-reward-card"><div class="reward-gift">SP</div><div class="home-reward-copy"><strong>Ziele</strong><small>${objectivesReady} Belohnung${objectivesReady===1?"":"en"} abholbereit</small><p>Tages-, Wochen- und Saisonziele warten auf dich.</p><button class="primary" data-go="objectivesView">Jetzt abholen</button></div></div>`);
 if(passReady)cards.push(`<div class="home-reward-card"><div class="reward-gift">PASS</div><div class="home-reward-copy"><strong>Season Pass</strong><small>${passReady} Belohnung${passReady===1?"":"en"} abholbereit</small><p>Belohnungen aus dem kostenlosen oder Premium-Pfad warten auf dich.</p><button class="primary" data-go="seasonPassView">Jetzt abholen</button></div></div>`);
 for(const pack of packs.slice(0,Math.max(0,2-cards.length))){const qty=state.packs[pack.id]||0;cards.push(`<div class="home-reward-card"><img class="mini-pack" src="${packArtSrc(pack.id)}" alt="${esc(pack.name)}" loading="lazy"><div class="home-reward-copy"><strong>${esc(pack.name)}</strong><small>${qty} verfügbar · ${esc(pack.desc||"")}</small><p>Dein Reward-Pack liegt im Store bereit und kann direkt geöffnet werden.</p><button class="primary" data-go="storeView">Jetzt abholen</button></div></div>`)}
 if(!cards.length)cards.push(`<div class="home-empty-note">Noch nichts abholbereit. Schließe Ziele, SBCs oder Season-Stufen ab – neue Rewards erscheinen hier automatisch ganz oben.</div>`);
 $("homeRewardGrid").innerHTML=cards.join("");
 $("homeReadyPanel")?.classList.toggle("home-ready-empty",!total);
 renderHomeNow({pending:pending.length,tasks:claimable.length+objectivesReady,pass:passReady,packs:packs.reduce((n,pack)=>n+(state.packs[pack.id]||0),0)})
}
// "Jetzt dran": rewards and unopened packs sit above the hero, so nothing waits below the fold.
function renderHomeNow({pending,tasks,pass,packs}){
 const box=$("homeNow");if(!box)return;
 const item=(kind,icon,title,sub,go,cta)=>`<button type="button" class="home-now-item ${kind}" data-go="${go}"><span class="home-now-icon" aria-hidden="true">${icon}</span><span class="home-now-copy"><strong>${esc(title)}</strong><small>${esc(sub)}</small></span><span class="home-now-go">${esc(cta)}</span></button>`;
 const rows=[];
 const rewards=pending+tasks+pass,parts=[pending&&`${pending}× Wettbewerb`,tasks&&`${tasks}× Ziele`,pass&&`${pass}× Season Pass`].filter(Boolean);
 if(rewards)rows.push(item("rewards",String(rewards),`${rewards} Belohnung${rewards===1?"":"en"} abholen`,parts.join(" · "),pending?"playView":tasks?"objectivesView":"seasonPassView","Abholen"));
 if(packs)rows.push(item("packs",String(packs),`${packs} Pack${packs===1?"":"s"} ungeöffnet`,"Liegen unter Meine Packs im Store","storeView","Öffnen"));
 box.hidden=!rows.length;
 box.innerHTML=rows.join("")
}
function renderHomeProgress(){
 const m=squadMetrics(),starterDone=[(state.stats.starter||0)>0,m.filled===18,(state.stats.matches||0)>0,((state.stats.sbcs||0)>0||(state.stats.market||0)>0)].filter(Boolean).length,starterTotal=4,seasonUnlocked=SEASON_REWARDS.filter(r=>(state.sp||0)>=r.sp).length,seasonTotal=SEASON_REWARDS.length,sbcDone=Math.min(SBCS.length,state.stats.sbcs||0);
 const entries=[{done:starterDone,total:starterTotal,title:"Starteraufgaben",desc:"Hol dir einen soliden Start.",campaign:0},{done:seasonUnlocked,total:seasonTotal,title:"Season Pass",desc:`Level ${Math.max(1,seasonUnlocked)} von ${seasonTotal}`,go:"seasonPassView"},{done:sbcDone,total:SBCS.length,title:"SBCs",desc:"Challenges abgeschlossen",go:"sbcView"}];
 $("homeProgressGrid").innerHTML=entries.map(x=>{const pct=x.total?Math.round(x.done/x.total*100):0,attrs=x.campaign!=null?`data-campaign-open="${x.campaign}"`:`data-go="${x.go}"`;return `<button class="home-progress-card" ${attrs}><div class="progress-ring" style="--pct:${pct}%"><span>${x.done}/${x.total}</span></div><div class="home-progress-copy"><strong>${esc(x.title)}</strong><small>${esc(x.desc)}</small></div></button>`}).join("")
}
function headerClubName(){const club=String(state.profile?.clubName||"").trim(),user=String(state.profile?.username||"").trim();return club||(user?`${user} FC`:"DEIN CLUB")}
function renderHeaderClubName(){const el=$("dbIndicator");if(!el)return;const name=headerClubName();el.textContent=name;el.title=name==="DEIN CLUB"?"Dein Team":name}
function renderHomeMessages(){
 const box=$("homeUnreadMessages");if(!box)return;
 let rows=[];try{rows=window.FooteraOnline?.unreadSummary?.()||[]}catch(e){console.warn("Ungelesene Nachrichten konnten beim Start nicht gelesen werden",e);rows=[]}
 if(!rows.length){box.hidden=true;box.innerHTML="";return}
 box.hidden=false;
 box.innerHTML=rows.map(row=>`<button type="button" class="home-unread-message" data-home-message-uid="${esc(row.uid)}"><span class="home-unread-message-icon">✉</span><span class="home-unread-message-copy"><strong>${row.count===1?"Neue Nachricht":"Neue Nachrichten"} von ${esc(row.name||"Freund")}</strong><small>${row.count===1?"1 ungelesene Nachricht":`${row.count} ungelesene Nachrichten`} · Tippen, um den Chat zu öffnen</small></span><span class="home-unread-message-action">ÖFFNEN ›</span></button>`).join("")
}
function renderHome(){const m=squadMetrics();renderHeaderClubName();renderHomeMessages();$("homeRating").textContent=m.rating||"–";$("homeChem").textContent=`${m.chem}/33`;$("homePlayers").textContent=state.club.length;renderHomeHero();renderCompetitionHome();renderHomeRewards();renderHomeProgress()}
document.addEventListener("click",e=>{const btn=e.target.closest("[data-home-message-uid]");if(!btn)return;const friend=(state.friends||[]).find(f=>f?.onlineUid===btn.dataset.homeMessageUid);if(friend)window.FooteraOnline?.openChat?.(friend)})
function renderSeason(){const sp=state.sp||0,next=SEASON_REWARDS.find(x=>sp<x.sp),max=SEASON_REWARDS[SEASON_REWARDS.length-1].sp,seasonSpEl=$("seasonSp"),seasonBarEl=$("seasonBar"),seasonTrackEl=$("seasonTrack");if(seasonSpEl)seasonSpEl.textContent=`${fmt(sp)} SP`;if(seasonBarEl)seasonBarEl.style.width=`${Math.min(100,sp/max*100)}%`;if(seasonTrackEl)seasonTrackEl.innerHTML=SEASON_REWARDS.map(x=>`<div class="season-level ${state.seasonClaims[x.level]?"done":next?.level===x.level?"current":""}"><strong>Level ${x.level} · ${fmt(x.sp)} SP</strong><span>${rewardText(seasonTierReward(x,"free"))}</span></div>`).join("")}
function renderCampaigns(){const completedTasks=TASKS.filter(t=>(state.stats[t.stat]||0)>=t.target).length,grid=$("campaignGrid");if(grid)grid.innerHTML=CAMPAIGNS.map((c,i)=>`<div class="campaign-card" data-campaign="${i}"><h3>${c.title}</h3><p>${c.text}</p><b>${c.key==="season"?`Saison ${seasonInfo().number} · ${fmt(state.sp||0)} SP`:c.key==="evo"?(activeEvolutionCount()?`${activeEvolutionCount()}/3 Evolutionen aktiv`:"Keine Evolution aktiv"):`${completedTasks}/${TASKS.length} Objectives abgeschlossen`}</b></div>`).join("")}
function foundationTaskMini(){return [...TASKS].sort((a,b)=>{const av=Math.min(a.target,state.stats[a.stat]||0)/a.target,bv=Math.min(b.target,state.stats[b.stat]||0)/b.target;return bv-av}).slice(0,5).map(t=>{const v=Math.min(t.target,state.stats[t.stat]||0),done=v>=t.target;return`<div class="campaign-task-row"><div><strong>${esc(t.title)}</strong><span>${v}/${t.target} · ${esc(t.desc)}</span></div><b>${done?"FERTIG":`${Math.round(v/t.target*100)}%`}</b></div>`}).join("")}
function openCampaignDetail(index){const x=CAMPAIGNS[Number(index)];if(!x)return;$("campaignModalTitle").textContent=x.title;let body="";if(x.key==="foundation"){const m=squadMetrics(),completed=TASKS.filter(t=>(state.stats[t.stat]||0)>=t.target).length,step1=m.filled===18,step2=completed>0,marketDone=(state.stats.market||0)>0,sbcDone=(state.stats.sbcs||0)>0,step3=marketDone&&sbcDone,doneCount=[step1,step2,step3].filter(Boolean).length;body=`<div class="campaign-overview"><h3>Foundations</h3><p>Starterkader, erste Objectives, Transfermarkt und SBCs. Wähle einen Schritt, um direkt zum passenden Bereich zu springen.</p><div class="progress"><div style="width:${doneCount/3*100}%"></div></div><div class="campaign-overview-meta"><span>${doneCount}/3 Schritte abgeschlossen</span><span>${m.filled}/18 Kaderplätze</span></div></div><div class="campaign-step"><button class="campaign-step-main" data-campaign-go="squadView"><span><strong>Schritt 1 · Starterkader vollständig aufbauen</strong><p>${m.filled}/18 Kaderplätze belegt · ${m.chem}/33 Chemie</p></span><span class="campaign-step-state ${step1?"done":""}">${step1?"FERTIG":"ÖFFNEN"}</span></button></div><div class="campaign-step"><button class="campaign-step-main" data-campaign-go="objectivesView"><span><strong>Schritt 2 · Objectives</strong><p>${completed}/${TASKS.length} Aufgaben abgeschlossen · erledigte Aufgaben stehen oben</p></span><span class="campaign-step-state ${step2?"done":""}">${step2?"FORTSCHRITT":"ÖFFNEN"}</span></button><div class="campaign-step-extra"><div class="campaign-task-mini">${foundationTaskMini()}</div></div></div><div class="campaign-step"><div class="campaign-step-main"><span><strong>Schritt 3 · Transfermarkt & SBC</strong><p>Transferkauf ${marketDone?"erledigt":"offen"} · SBC ${sbcDone?"erledigt":"offen"}</p></span><span class="campaign-step-state ${step3?"done":""}">${step3?"FERTIG":"OFFEN"}</span></div><div class="campaign-step-extra"><div class="campaign-step-actions"><button class="secondary" data-campaign-go="marketView">Transfermarkt</button><button class="secondary" data-campaign-go="sbcView">SBCs</button></div></div></div>`}else if(x.key==="season"){const sp=state.sp||0,next=SEASON_REWARDS.find(r=>sp<r.sp),goal=next?.sp||SEASON_REWARDS[SEASON_REWARDS.length-1].sp,prev=[...SEASON_REWARDS].reverse().find(r=>sp>=r.sp)?.sp||0,pct=goal===prev?100:Math.max(0,Math.min(100,(sp-prev)/(goal-prev)*100));body=`<div class="campaign-overview"><h3>Season ${seasonInfo().number}</h3><p>${fmt(sp)} Season Points gesammelt.${next?` Nächste Belohnung bei ${fmt(next.sp)} SP.`:" Alle aktuellen Season-Stufen erreicht."}</p><div class="progress"><div style="width:${pct}%"></div></div><div class="campaign-overview-meta"><span>${fmt(sp)} SP</span><span>${next?rewardText(seasonTierReward(next,"free")):"Season komplett"}</span></div></div><div class="campaign-step"><button class="campaign-step-main" data-campaign-go="objectivesView"><span><strong>Objectives für SP</strong><p>Aufgabenfortschritt und Belohnungen ansehen.</p></span><span class="campaign-step-state">ÖFFNEN</span></button></div><div class="campaign-step"><button class="campaign-step-main" data-campaign-go="playView"><span><strong>Matches spielen</strong><p>Squad Battles und Rivals bringen Season-Fortschritt.</p></span><span class="campaign-step-state">ÖFFNEN</span></button></div>`}else{body=`<div class="campaign-overview"><h3>Evolutions</h3><p>${activeEvolutionCount()?`${activeEvolutionCount()}/3 Evolutionen sind aktiv. Fortschritt und Anforderungen findest du im Evolutions-Bereich.`:"Aktuell ist keine Evolution aktiv. Wähle im Evolutions-Bereich einen geeigneten Spieler."}</p></div><div class="campaign-step"><button class="campaign-step-main" data-campaign-go="evolutionView"><span><strong>${activeEvolutionCount()?"Evolution-Fortschritt ansehen":"Evolution starten"}</strong><p>Spieler, Anforderungen und Match-Fortschritt öffnen.</p></span><span class="campaign-step-state ${activeEvolutionCount()?"done":""}">ÖFFNEN</span></button></div>`}$("campaignModalBody").innerHTML=body;showUiLayer("campaignModal","campaign")}
$("campaignGrid")?.addEventListener("click",e=>{const c=e.target.closest("[data-campaign]");if(c)openCampaignDetail(c.dataset.campaign)});
document.addEventListener("click",e=>{const b=e.target.closest("[data-campaign-open]");if(b)openCampaignDetail(b.dataset.campaignOpen)});
let heroSwipeStart=null;
$("homeHeroCard")?.addEventListener("pointerdown",e=>{heroSwipeStart={x:e.clientX,y:e.clientY,id:e.pointerId}});
$("homeHeroCard")?.addEventListener("pointerup",e=>{if(!heroSwipeStart||heroSwipeStart.id!==e.pointerId)return;const dx=e.clientX-heroSwipeStart.x,dy=e.clientY-heroSwipeStart.y;heroSwipeStart=null;if(Math.abs(dx)<45||Math.abs(dx)<=Math.abs(dy))return;const len=homeHeroSlides().length;homeHeroSlide=(homeHeroSlide+(dx<0?1:-1)+len)%len;renderHomeHero()});
$("homeHeroCard")?.addEventListener("pointercancel",()=>{heroSwipeStart=null});
$("homeHeroCard")?.addEventListener("click",e=>{const b=e.target.closest("[data-home-event-player]");if(!b)return;const event=homeHeroSlides()[homeHeroSlide]?.event;if(!event)return;const entry=promoEventEntries(event)[Number(b.dataset.homeEventPlayer)];if(entry)openBiography(entry.item,null,entry.player)});
$("homeHeroAction")?.addEventListener("click",e=>{const action=e.currentTarget.dataset.homeHeroAction;if(action==="momentum-team"){e.stopPropagation();openMomentumTeam()}else if(action==="promo-team"){e.stopPropagation();openPromoTeam(HALLOWEEN_EVENT.id)}else if(action==="halloween-preview"){e.stopPropagation();openHalloweenPreview()}});
$("homeHeroTeam")?.addEventListener("click",e=>{e.stopPropagation();const view=e.currentTarget.dataset.homeTeamView;if(view==="totw")openTotwTeam();else if(view==="momentum-shop"){storeTab="promo";switchView("storeView")}});
$("campaignModalClose")?.addEventListener("click",()=>closeUiLayer("campaignModal","campaign"));
$("campaignModalBody")?.addEventListener("click",e=>{const go=e.target.closest("[data-campaign-go]");if(!go)return;$("campaignModal").classList.remove("active");replaceUiState("view",{view:go.dataset.campaignGo});switchView(go.dataset.campaignGo,{push:false})});

let MARKET_FILTER_INDEX=new Map(),MARKET_FILTER_INDEX_TIMER=0;
function rebuildMarketFilterIndex(){const index=new Map();for(const p of PLAYERS){const league=String(p?.league||"").trim()||String(resolvedAffiliation(p)?.league||"").trim();if(!league)continue;if(!p.league)p.league=league;let rows=index.get(league);if(!rows)index.set(league,rows=[]);rows.push(p)}MARKET_FILTER_INDEX=index}
function scheduleMarketFilterIndexRebuild(){if(!PLAYERS.length)return;clearTimeout(MARKET_FILTER_INDEX_TIMER);MARKET_FILTER_INDEX_TIMER=setTimeout(rebuildMarketFilterIndex,350)}
function marketPlayersForLeague(league){if(!MARKET_FILTER_INDEX.size&&PLAYERS.length)rebuildMarketFilterIndex();return league?MARKET_FILTER_INDEX.get(String(league))||[]:PLAYERS}
function totwFallbackFilterPlayers(){return (totwIsActive()?LIVE_TOTW.players:[]).map((info,i)=>mergeTotwBase(null,null,i)).filter(p=>p.team||p.league||p.nation)}
function fillLeagueFilter(){const cur=$("marketLeague")?.value||"",fallbackLeagues=totwFallbackFilterPlayers().map(p=>resolvedAffiliation(p).league),leagues=[...new Set([...PLAYERS.map(p=>p.league),...MID_ICON_BASES.map(p=>p.league),...fallbackLeagues].filter(Boolean))].sort((a,b)=>a.localeCompare(b));if($("marketLeague")){$("marketLeague").innerHTML='<option value="">Alle Ligen</option>'+leagues.map(l=>`<option value="${esc(l)}">${esc(l)}</option>`).join("");if(leagues.includes(cur))$("marketLeague").value=cur;updateMarketDependentFilters();updateRatingUI()}}


function maybePromptForUsername(){
 if(!state.onboarded||String(state.profile?.username||"").trim())return;
 if(!state.profile.saveId)state.profile.saveId=newFooteraSaveId();
 const input=$("requiredUsername");if(input)input.value="";
 showUiLayer("usernameRequiredModal","username-required",{},history.state?.kind==="username-required"?"none":"push");
 setTimeout(()=>input?.focus(),80)
}
$("saveRequiredUsername")?.addEventListener("click",()=>{
 const username=$("requiredUsername")?.value.trim()||"";
 if(username.length<2)return toast("Bitte einen Benutzernamen mit mindestens 2 Zeichen eingeben.");
 state.profile.username=username;
 if(!state.profile.saveId)state.profile.saveId=newFooteraSaveId();
 if(!String(state.profile.clubName||"").trim()||state.profile.clubName==="Footera Club")state.profile.clubName=`${username} FC`;
 save();removeUiLayer("usernameRequiredModal");renderHome();renderSocial();toast(`Benutzername gespeichert: ${username}`)
});
$("requiredUsername")?.addEventListener("keydown",e=>{if(e.key==="Enter")$("saveRequiredUsername")?.click()});

function openTeamManagement(){
 if(!state.profile.saveId)state.profile.saveId=newFooteraSaveId();
 $("teamUsername").value=state.profile.username||"";
 showUiLayer("teamManagementModal","team-management")
}
$("openTeamManagement")?.addEventListener("click",openTeamManagement);
$("teamManagementClose").addEventListener("click",()=>closeUiLayer("teamManagementModal","team-management"));
$("saveTeamManagement").addEventListener("click",()=>{
 const username=$("teamUsername").value.trim();
 if(username.length<2)return toast("Bitte einen gültigen Benutzernamen eingeben.");
 state.profile.username=username;save();renderHome();renderSocial();window.FooteraOnline?.queueProfileSync?.(200);
 if(history.state?.gfut&&history.state.kind==="team-management")history.back();else $("teamManagementModal").classList.remove("active");
 toast("Benutzername gespeichert.")
});
$("openClubIdentityFromTeam")?.addEventListener("click",()=>{removeUiLayer("teamManagementModal");clubSection="identity";clubIdentityDraft=makeClubIdentityDraft();switchView("clubView");renderClub()});

let pendingMatchContext=null,pendingMatchKitSelection=null,previewSwapFrom=-1;
function matchKitClone(kit,fallback){return cleanClubKit(kit,fallback||defaultClubIdentity().kits.home)}
// A consistent identity for a generated opponent, but a fresh club for each seeded match.
function generatedOpponentName(seed){
 const prefixes=["FC","SC","SV","AC","AS","CF","Union","Sporting","Atlético","Dynamo","Racing","Olympique","VfB","VfL","FK","IF","Inter","Borussia","Real","CD","Athletic","Lokomotive","Royal","Victoria"];
 const places=["Nordhafen","Costa Azul","Bergstadt","Valdoria","Montavera","Rosenfeld","Lindenfeld","Kronenberg","Solano","Hohenfels","Porto Verde","Santa Luz","Eichenau","Lago Azul","Falkenstadt","Montelago","Westbridge","Alpenblick","Seabrook","Sonnenstadt","Cascadia","Bellavista","Aurora","Ostmeer","Rivermouth","Felsenburg","Gran Vista","Monte Claro","Altenfurt","Porto Nera","Valloria","Silberbach","Oceana","Eastport","Valencia Nova","Dornwald","Südbrück","Torre Verde","Himmelsfeld","Lacosta","Winterhafen","Goldbach"];
 return prefixes[hashNum(String(seed)+"|clubPrefix")%prefixes.length]+" "+places[hashNum(String(seed)+"|clubPlace")%places.length]
}
function generatedOpponentKits(opponent){
 const key=String(opponent?.seed||opponent?.name||"Gegner"),palettes=[
  ["#182c4f","#72a8ff","#edf3ff"],["#5a1722","#f05b6f","#f6f2ea"],["#173d2d","#71d6a2","#f1f5ee"],
  ["#30204f","#aa82ef","#f3effb"],["#4a3515","#e0b24b","#fff6df"],["#172f38","#57c9d8","#edf8fa"],
  ["#c43324","#fbcd46","#1d2531"],["#14565b","#fa9e42","#f3eae0"],["#003b7c","#ffffff","#ec202b"],
  ["#f3df26","#151d35","#fafafa"],["#802d80","#f5b2e0","#10152e"],["#ce6b1f","#17362c","#f4ead8"],
  ["#0c5e9d","#76d9ff","#fcf6f0"],["#751c1c","#f4e8cf","#203652"],["#4c6729","#ddec66","#f4ebd9"],
  ["#222222","#dfae51","#f4f4f4"],["#c7164c","#f6d7e0","#161e37"],["#f1eeee","#c92030","#14274b"],
  ["#115d6c","#ffde7c","#f8ebd2"],["#bb4f30","#ffb576","#172735"],["#3c3780","#f2c64e","#f1f2ff"],
  ["#103c25","#efb038","#f4f1e3"],["#e5e5df","#11538f","#f13b41"],["#47342c","#d0c4a2","#e8e6df"]
 ],awayPalettes=[
  ["#f8f6ec","#162a40"],["#0d253c","#ef4c70"],["#f3b541","#21263e"],["#c8edff","#1d4262"],
  ["#f4b8d2","#401744"],["#26282d","#e7e4d2"],["#dbe87a","#284431"],["#f4e5bb","#6b2636"],
  ["#d0fcf0","#193a64"],["#f5d6a9","#67332f"],["#edeeee","#bd3434"],["#182c38","#75d4d3"]
 ],patterns=["solid","stripes","hoops","diagonal","halves","sleeves","center","pinstripes","quarters","chevron","chestband","shoulders","sidepanels","reverse","doubleband","checkers","diamonds","fade","splitstripe"];
 const p=palettes[hashNum(key+"|homePalette")%palettes.length],a=awayPalettes[hashNum(key+"|awayPalette")%awayPalettes.length];
 const home={pattern:patterns[hashNum(key+"|homePattern")%patterns.length],shirtPrimary:p[0],shirtSecondary:p[1],shorts:p[0],socks:p[1]};
 const away={pattern:patterns[hashNum(key+"|awayPattern")%patterns.length],shirtPrimary:a[0],shirtSecondary:a[1],shorts:a[1],socks:a[0]};
 return{home,away}
}
function matchKitOptions(opponent){
 ensureClubIdentityState();
 const own=clubIdentitySnapshot().kits,rawOpponent=opponent?.clubIdentity?cleanClubIdentity(opponent.clubIdentity).kits:generatedOpponentKits(opponent);
 return{home:{home:matchKitClone(own.home,defaultClubIdentity().kits.home),away:matchKitClone(own.away,defaultClubIdentity().kits.away)},away:{home:matchKitClone(rawOpponent.home,generatedOpponentKits(opponent).home),away:matchKitClone(rawOpponent.away,generatedOpponentKits(opponent).away)}}
}
function matchKitRgb(hex){const s=String(hex||"").replace("#","");return s.length===6?[parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)]:[128,128,128]}
function matchKitColorDistance(a,b){const x=matchKitRgb(a),y=matchKitRgb(b);return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2])}
function matchKitContrastScore(a,b){
 return matchKitColorDistance(a.shirtPrimary,b.shirtPrimary)*.7+matchKitColorDistance(a.shirtSecondary,b.shirtSecondary)*.15+matchKitColorDistance(a.shorts,b.shorts)*.1+matchKitColorDistance(a.socks,b.socks)*.05
}
function matchKitsTooSimilar(a,b){return matchKitContrastScore(a,b)<105}
function createDefaultMatchKitSelection(opponent){
 const options=matchKitOptions(opponent),preferred={home:"home",away:"away"},keepHome={home:"home",away:"home"};
 if(!matchKitsTooSimilar(options.home.home,options.away.away))return preferred;
 if(!matchKitsTooSimilar(options.home.home,options.away.home))return keepHome;
 const combos=[{home:"away",away:"home"},{home:"away",away:"away"},keepHome,preferred];
 return combos.sort((a,b)=>matchKitContrastScore(options.home[b.home],options.away[b.away])-matchKitContrastScore(options.home[a.home],options.away[a.away]))[0]
}
function currentPreviewKitSelection(){
 if(!pendingMatchKitSelection&&pendingMatchContext)pendingMatchKitSelection=createDefaultMatchKitSelection(pendingMatchContext.opponent);
 return pendingMatchKitSelection||{home:"home",away:"away"}
}
function previewKitSelectorHTML(opponent){
 const options=matchKitOptions(opponent),sel=currentPreviewKitSelection(),clash=matchKitsTooSimilar(options.home[sel.home],options.away[sel.away]),teamName=String(state.profile?.clubName||"Dein Team"),oppName=String(opponent?.name||"Gegner");
 const crests={home:clubIdentitySnapshot().crest,away:opponent?.clubIdentity?cleanClubIdentity(opponent.clubIdentity).crest:null};
 const side=(key,title,name)=>`<div class="preview-kit-team" data-kit-team="${key}"><div class="preview-kit-team-head"><strong>${esc(title)}</strong><span>${esc(name)}</span></div><div class="preview-kit-choices">${["home","away"].map(kind=>`<button type="button" class="preview-kit-choice ${sel[key]===kind?"selected":""}" data-preview-kit-side="${key}" data-preview-kit-choice="${kind}" aria-pressed="${sel[key]===kind}"><span class="preview-kit-art">${kitHTML(options[key][kind],false,crests[key])}</span><b>${kind==="home"?"Heim":"Auswärts"}</b></button>`).join("")}</div></div>`;
 return`<section class="preview-kit-selector" aria-label="Trikotwahl vor dem Spiel"><div class="preview-kit-title"><div><span>TRIKOTWAHL</span><small>Gilt nur für dieses Spiel</small></div><button type="button" class="secondary preview-kit-auto" data-preview-kit-auto>Auto-Kontrast</button></div><div class="preview-kit-grid">${side("home","DEIN TEAM",teamName)}${side("away","GEGNER",oppName)}</div><div class="preview-kit-status ${clash?"warning":"ok"}" data-preview-kit-status>${clash?"⚠ Trikots zu ähnlich · Auto-Kontrast empfohlen":"✓ Trikots klar unterscheidbar"}</div></section>`
}
let squadBattleOpponentCache={key:"",list:[]};
let selectedSquadBattleIndex=-1,selectedSquadBattleReplayConfirm="";
const SB_TIERS=[
 {id:"easy",label:"Schwach",target:67,chem:9,win:330,draw:205,loss:110,sp:40,names:["Rookie United","Bronze Athletic","Starter XI"]},
 {id:"medium",label:"Etwas schwach",target:74,chem:18,win:515,draw:325,loss:185,sp:60,names:["Union Eleven","Metro FC","Rising Stars"]},
 {id:"hard",label:"Etwas gut",target:82,chem:27,win:750,draw:470,loss:280,sp:85,names:["Elite 27","Prime Athletic","Challengers FC"]},
 {id:"elite",label:"Sehr gut",target:88,chem:33,win:1030,draw:655,loss:375,sp:120,names:["Galácticos XI","Champions Club","Ultimate XI"]}
];
function deterministicPick(arr,key){return arr.length?arr[hashNum(key)%arr.length]:null}
function opponentPlayerForSlot(slot,target,seed,used,preferredLeague=""){
 let pool=indexedPositionCandidates(slot,target,2,used);
 if(!pool.length)pool=indexedPositionCandidates(slot,target,5,used);
 if(preferredLeague){
  let leaguePool=pool.filter(p=>p.league===preferredLeague);
  if(!leaguePool.length)leaguePool=indexedPositionCandidates(slot,target,7,used).filter(p=>p.league===preferredLeague);
  if(leaguePool.length)pool=leaguePool
 }
 if(!pool.length)pool=indexedPositionCandidates(slot,target,50,used);
 const b=deterministicPick(pool,seed);if(b)used.add(String(b.id));return b
}
function opponentAnchorLeague(target,seed,used){
 const pool=indexedRatingCandidates(target,4,used),counts=new Map();
 for(const p of pool){if(p?.league)counts.set(p.league,(counts.get(p.league)||0)+1)}
 const viable=[...counts.entries()].filter(([,count])=>count>=8).sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]),"de")).slice(0,10).map(([league])=>league);
 return deterministicPick(viable,seed)||""
}
function opponentLeagueSlots(chemTarget){
 const c=Math.max(0,Math.min(33,Number(chemTarget||0)));
 return c>=30?10:c>=27?9:c>=24?8:c>=20?7:c>=16?6:c>=12?5:c>=8?4:3
}
function opponentBenchPlayer(target,seed,used){let pool=indexedRatingCandidates(target,4,used);if(!pool.length)pool=PLAYERS.filter(p=>!used.has(String(p.id)));const b=deterministicPick(pool,seed);if(b)used.add(String(b.id));return b}
function buildGeneratedOpponent({name,target,chem,formation="4-3-3",seed,tier="",rewards=null,sp=0}){
 const form=FORMATIONS[formation]||FORMATIONS["4-3-3"],used=new Set(),squad=[],chemTarget=Math.max(0,Math.min(33,Number(chem||0)));
 const preferredLeague=opponentAnchorLeague(target,`${seed}|league`,used),leagueSlots=opponentLeagueSlots(chemTarget);
 form.forEach((slot,i)=>squad.push(opponentPlayerForSlot(slot.p,target,`${seed}|xi|${i}`,used,i<leagueSlots?preferredLeague:"")));
 for(let i=0;i<7;i++)squad.push(opponentBenchPlayer(target-1,`${seed}|bench|${i}`,used));
 const xi=squad.slice(0,11).filter(Boolean),rating=xi.length?Math.round(xi.reduce((n,p)=>n+Number(p.ovr||0),0)/xi.length):target;
 const actualChem=opponentChemistryTotal(squad,formation);
 return{kind:"generated",name,seed,formation,rating,chem:actualChem,squad,tier,rewards,sp,power:rating+actualChem*.12}
}
function getSquadBattleOpponents(){
 syncCompetitionWeeks();
 const sb=state.squadBattle,specialPhase=sb.played>=12,setSeq=Math.max(0,Number(sb.setSeq||0)),key=specialPhase?`${sb.week}|special|${battleEventTeam()?.id||""}|${LIVE_TOTW?.id||""}`:`${sb.week}|set-${setSeq}`;
 if(squadBattleOpponentCache.key===key&&squadBattleOpponentCache.list.length)return squadBattleOpponentCache.list;
 const list=specialPhase?
  [battleSpecialOpponent("totw",sb.week),battleSpecialOpponent("event",sb.week)].filter(Boolean):
  SB_TIERS.map((t,i)=>{
   const seed=`${sb.week}|set-${setSeq}|${t.id}`,name=generatedOpponentName(seed+"|name");
   return{...buildGeneratedOpponent({name,target:t.target,chem:t.chem,formation:i%2?"4-2-3-1":"4-3-3",seed,tier:t.label,rewards:{win:t.win,loss:t.loss},sp:t.sp}),battleId:`${seed}|normal`,battleSet:setSeq,strengthId:t.id}
  });
 squadBattleOpponentCache={key,list};return list
}
function friendAsOpponent(fr){
 const team=friendProfileTeams(fr)[0]||fr,rating=Number(team.rating||fr.rating||70),chem=Number(team.chem||fr.chem||0);
 return{kind:"friend",name:fr.clubName||"Freund",formation:FORMATIONS[team.formation]?team.formation:"4-3-3",tactic:["balanced","attacking","defensive"].includes(team.tactic)?team.tactic:"balanced",roles:{...(team.roles||fr.roles||{})},focus:{...(team.focus||fr.focus||{})},rating,chem,squad:Array.isArray(team.squad)?team.squad:Array(18).fill(null),clubIdentity:fr.clubIdentity?cleanClubIdentity(fr.clubIdentity):null,tier:"Freundschaft",power:Math.max(45,Math.min(99,rating+chem*.12)),rewards:null,sp:0}
}
const RIVALS_OPPONENT_LEVELS=Object.freeze({
 10:{min:72,max:76,chem:7},9:{min:74,max:78,chem:10},8:{min:76,max:80,chem:13},7:{min:78,max:82,chem:16},6:{min:79,max:83,chem:18},
 5:{min:81,max:84,chem:20},4:{min:82,max:85,chem:22},3:{min:83,max:86,chem:24},2:{min:84,max:87,chem:27},1:{min:85,max:89,chem:29},0:{min:87,max:91,chem:31}
});
function rivalsOpponentLevel(){
 const division=Math.max(0,Math.min(10,Number(state.rivals?.division??10))),cfg=RIVALS_OPPONENT_LEVELS[division]||RIVALS_OPPONENT_LEVELS[10];
 return{division,...cfg}
}
function oneOffOpponent(mode){
 const m=squadMetrics(),base=Math.max(62,m.rating||72),stamp=Date.now();
 if(mode==="champions")return championsOpponent();
 if(mode==="rivals"){
  const level=rivalsOpponentLevel(),seed=`rivals|d${level.division}|${stamp}`,span=Math.max(0,level.max-level.min);
  const target=level.min+(hashNum(seed+"|rating")%(span+1)),formations=["4-3-3","4-4-2","4-2-3-1"],formation=formations[hashNum(seed+"|formation")%formations.length];
  return buildGeneratedOpponent({name:generatedOpponentName(seed+"|club"),target,chem:level.chem,formation,seed,tier:level.division===0?"Division Rivals · Elite":`Division Rivals · Division ${level.division}`})
 }
 return buildGeneratedOpponent({name:generatedOpponentName(`friendly|${stamp}|club`),target:Math.max(62,Math.min(87,Math.round(base+(Math.random()*6-3)))),chem:Math.max(14,Math.min(29,Math.round((m.chem||22)+(Math.random()*8-4)))),formation:"4-3-3",seed:`friendly|${stamp}`,tier:"Freundschaft"})
}
function ownLineupHTML(){
 const m=squadMetrics(),form=currentFormation(),items=squadItems();
 const card=(item,i,label)=>{const b=item?displayBase(item):null;return `<button type="button" class="preview-lineup-slot ${previewSwapFrom===i?'swap-source':''}" data-preview-slot="${i}" aria-label="${esc(label)}: ${esc(b?.name||'Platz frei')}">${b?cardHTML(b,item,true,i<11&&posFit(b,form[i].p)>0?form[i].p:b.position):`<div class="emptyslot">${esc(label)}<br>+</div>`}</button>`};
 const pitch=items.slice(0,11).map((item,i)=>{const slot=form[i],b=item?displayBase(item):null,out=b&&posFit(b,slot.p)<=0;return `<div class="friend-slot ${out?'out':''}" style="left:${slot.x}%;top:${slot.y}%">${card(item,i,positionLabel(slot.p))}${out?'<div class="poswarn">!</div>':''}</div>`}).join('');
 const bench=items.slice(11,18).map((item,k)=>card(item,k+11,`Bank ${k+1}`)).join('');
 const reserve=items.slice(18,23).map((item,k)=>card(item,k+18,`Reserve ${k+1}`)).join('');
 return{m,pitch,bench,reserve}
}
function previewRolesHTML(){
 const form=currentFormation(),items=squadItems();
 return items.slice(0,11).map((item,i)=>{
  const base=item?displayBase(item):null,slot=form[i]?.p||"",roles=ROLE_OPTIONS[slot]||["Balanced"],role=state.roles[i]&&roles.includes(state.roles[i])?state.roles[i]:roles[0],focus=FOCUS_OPTIONS.includes(state.focus[i])?state.focus[i]:"Balanced";
  return `<div class="preview-role-row"><div class="preview-role-player"><b>${esc(positionLabel(slot,base))}</b><span>${base?esc(base.name):"Leer"}</span></div><label><span>Rolle</span><select data-preview-role="${i}" ${base?"":"disabled"}>${roles.map(r=>`<option value="${esc(r)}" ${r===role?"selected":""}>${esc(roleLabel(r))}</option>`).join("")}</select></label><label><span>Fokus</span><select data-preview-focus="${i}" ${base?"":"disabled"}>${FOCUS_OPTIONS.map(f=>`<option value="${esc(f)}" ${f===focus?"selected":""}>${esc(focusLabel(f))}</option>`).join("")}</select></label></div>`
 }).join("")
}
function refreshOpenMatchPreview(){
 if(squadBattleStage!=="preview"||!pendingMatchContext||!$("squadBattleModal").classList.contains("active"))return;
 const {m,pitch,bench,reserve}=ownLineupHTML(),{mode,opponent}=pendingMatchContext,titles={rivals:"Division Rivals",champions:"Footera Champions",squad:"Squad Battles","friendly-random":"Freundschaftsspiel","friendly-friend":"Gegen Freund"};
 $("matchPreviewModalTitle").textContent=titles[mode]||"Spielvorschau";
 $("squadBattleModalSub").textContent=`Deine Aufstellung · ${state.formation} · Rating ${m.rating||0} · Chemie ${m.chem}/33`;
 const replay=mode==="squad"&&!!opponent&&state.squadBattle?.playedIds?.includes(opponent.battleId);
 const oppText=opponent?`${esc(opponent.name)} · ${opponent.rating||0} GES · ${opponent.chem||0}/33 Chemie${replay?" · BEREITS GEWERTET · 0 BP":""}`:"Gegner wird beim Anpfiff bestimmt";
 const formationOptions=Object.keys(FORMATIONS).map(key=>`<option value="${esc(key)}" ${key===state.formation?"selected":""}>${esc(key)}</option>`).join("");
 $("squadBattleModalBody").innerHTML=`<div class="friend-team-title"><div><h2>${esc(state.profile.clubName||"Dein Team")}</h2><p>${oppText}</p></div><div class="preview-actions">${opponent?'<button id="previewOpponentBtn" class="secondary">Gegner ansehen</button>':''}<button id="squadBattleKickoff" class="${replay?"secondary":"primary"}" ${m.filled<18?'disabled':""}>${replay?"Anpfiff · 0 BP":"Anpfiff"}</button></div></div>${replay?'<div class="sb-repeat-preview-warning"><strong>Wiederholungsspiel</strong><span>Coins und Ziele zählen. Battle-Punkte: <b>0 BP</b>.</span></div>':""}${previewKitSelectorHTML(opponent)}<div class="squad-preset-tabs" aria-label="Gespeicherte Mannschaften">${squadPresetTabsHTML()}</div><section class="preview-team-editor" aria-label="Taktik und Formation vor dem Spiel"><div class="preview-team-controls"><label for="previewFormationSelect"><span>Formation<small>Änderungen gelten für das aktive Team.</small></span><select id="previewFormationSelect" aria-label="Formation vor dem Spiel">${formationOptions}</select></label><label for="previewTacticSelect"><span>Taktik<small>Kann im Spiel weiterhin angepasst werden.</small></span><select id="previewTacticSelect" aria-label="Taktik vor dem Spiel"><option value="balanced" ${state.tactic==="balanced"?"selected":""}>Ausgeglichen</option><option value="attacking" ${state.tactic==="attacking"?"selected":""}>Offensiv</option><option value="defensive" ${state.tactic==="defensive"?"selected":""}>Defensiv</option></select></label></div><details class="preview-role-editor"><summary><span>Rollen & Fokus</span><small>Alle 11 Startelfspieler bearbeiten</small></summary><div class="preview-role-list">${previewRolesHTML()}</div></details></section><div class="friend-team-summary"><div class="kpi"><strong>${m.rating||0}</strong><span>Rating</span></div><div class="kpi"><strong>${m.chem}/33</strong><span>Chemie</span></div><div class="kpi"><strong>${state.formation}</strong><span>Formation</span></div></div><div class="preview-edit-hint">${previewSwapFrom>=0?'Wähle eine zweite Karte in Startelf, Bank oder Reserve.':`Ziehe eine Karte auf einen anderen Platz, um Spieler zu tauschen. Antippen öffnet das Spielermenü. ${m.filled<18?`Für den Anpfiff fehlen ${18-m.filled} Spieler.`:''}`}${previewSwapFrom>=0?'<button type="button" class="secondary" data-preview-swap-cancel>Tausch abbrechen</button>':''}</div><div class="pitch friend-pitch">${pitch}</div><h4 class="preview-lineup-heading">Ersatzbank</h4><div class="friend-bench preview-lineup-row">${bench}</div><h4 class="preview-lineup-heading">Reserve</h4><div class="friend-bench preview-lineup-row">${reserve}</div>`
}
function renderMatchPreview(mode,opponent,historyMode="push"){
 pendingMatchContext={mode,opponent};pendingMatchKitSelection=createDefaultMatchKitSelection(opponent);previewSwapFrom=-1;squadBattleStage="preview";
 showUiLayer("squadBattleModal","squad-preview",{mode},historyMode);refreshOpenMatchPreview()
}
function renderSquadBattleSelection(historyMode="push"){
 const list=getSquadBattleOpponents(),sb=state.squadBattle,selected=list[selectedSquadBattleIndex]||null,refreshRemaining=typeof squadBattleRefreshRemaining==="function"?squadBattleRefreshRemaining():Math.max(0,4-Number(sb.refreshesUsed||0));
 const selectedPlayed=!!selected&&sb.playedIds.includes(selected.battleId),replayArmed=selectedPlayed&&selectedSquadBattleReplayConfirm===String(selected.battleId);
 if($("matchPreviewModalTitle"))$("matchPreviewModalTitle").textContent="Squad Battles · Gegner auswählen";
 $("squadBattleModalSub").textContent=`${sb.played}/14 gewertete Spiele · ${sbRank(sb.points).name}`;
 const options=Object.entries(SB_DIFFICULTIES).map(([key,d])=>`<option value="${key}" ${sb.difficulty===key?"selected":""}>${d.label} ×${d.factor.toFixed(2).replace(".",",")}</option>`).join("");
 const cards=list.map((o,i)=>{
  const played=sb.playedIds.includes(o.battleId);
  return `<button class="sb-opponent ${i===selectedSquadBattleIndex?"selected":""} ${played?"played":""}" data-sb-select="${i}" aria-label="${esc(o.name)}${played?" · bereits gewertet · 0 Battle-Punkte":""}"><span class="tier">${esc(o.tier)}</span>${played?'<span class="sb-played-badge">✓ BEREITS GEWERTET · 0 BP</span>':""}<h4>${esc(o.name)}</h4><p>${esc(o.formation)} · KI-Gegner</p><div class="sb-opponent-stats"><div><strong>${o.rating}</strong><span>Rating</span></div><div><strong>${o.chem}/33</strong><span>Chemie</span></div><div><strong>${fmt(o.rewards?.win||0)}</strong><span>Sieg-Coins</span></div></div></button>`
 }).join("");
 const playButton=selectedPlayed
  ?`<button id="sbReplayLineup" class="${replayArmed?"danger":"secondary"}">${replayArmed?"Bestätigen · 0 BP":"Erneut spielen · 0 BP"}</button>`
  :`<button id="sbContinueLineup" class="primary" ${selectedSquadBattleIndex<0?"disabled":""}>Zur Aufstellung</button>`;
 const warning=selectedPlayed?`<div class="sb-repeat-warning ${replayArmed?"confirm":""}"><strong>${replayArmed?"Wirklich erneut spielen?":"Dieser Gegner wurde bereits gewertet."}</strong><span>Das Spiel zählt für Coins und Ziele, aber bringt <b>0 Battle-Punkte</b> und erhöht nicht ${sb.played}/14.</span></div>`:"";
 $("squadBattleModalBody").innerHTML=`<div class="online-note">${sb.played<12?`Block ${Math.min(3,Math.floor(sb.played/4)+1)}/3 · vier Gegner`:`${sb.played<14?"TOTW und Event-Team":"14/14 erreicht · weiterhin Coins und Ziele"}`} · Montag 09:00 Reset. Bereits gewertete Gegner sind markiert und geben keine zusätzlichen BP.</div>
 <label class="competition-difficulty">Schwierigkeit <select id="sbDifficulty">${options}</select></label>
 <div class="sb-refresh-row"><span>Gegner-Refresh <b>${refreshRemaining}/4 verfügbar</b></span><button id="sbRefreshOpponents" class="secondary" ${sb.played>=12||refreshRemaining<=0?"disabled":""}>4 neue Gegner</button></div>
 <div class="sb-opponent-grid">${cards}</div>
 ${warning}
 <div class="sb-selection-actions"><button id="sbViewOpponent" class="secondary" ${selectedSquadBattleIndex<0?"disabled":""}>Team ansehen</button>${playButton}</div>`;
 squadBattleStage="selection";showUiLayer("squadBattleModal","squad-selection",{},historyMode)
}
function openModeEntry(mode){const m=squadMetrics();if(m.filled<18)return toast(`Kader unvollständig: ${m.filled}/18.`);if(mode==="champions"){if(!championsCanStartMatch()){const started=startChampionsRun();if(!started.ok)return toast(started.reason)}if(!championsCanStartMatch())return toast("Champions ist aktuell nicht spielbar.");renderMatchPreview(mode,championsOpponent());return}if(mode==="squad"){selectedSquadBattleIndex=-1;selectedSquadBattleReplayConfirm="";renderSquadBattleSelection();return}if(mode==="friendly-friend"){const idx=Number($("friendlyFriendSelect").value),fr=state.friends[idx];if(!fr)return toast("Bitte zuerst einen Freund wählen.");renderMatchPreview(mode,friendAsOpponent(fr));return}renderMatchPreview(mode,oneOffOpponent(mode))}
function openOpponentTeam(opponent){if(!opponent)return;$("opponentTeamModalBody").dataset.battleEventRelease=opponent.eventReleaseId||"";const formation=FORMATIONS[opponent.formation]?opponent.formation:"4-3-3",form=FORMATIONS[formation],sq=Array.isArray(opponent.squad)?opponent.squad:Array(18).fill(null);$("opponentTeamModalTitle").textContent=opponent.name||"Gegner";$("opponentTeamModalSub").textContent=`${formation} · Rating ${opponent.rating||0} · Chemie ${opponent.chem||0}/33`;const pitch=sq.slice(0,11).map((pl,i)=>{const slot=form[i];if(!pl)return`<div class="friend-slot" style="left:${slot.x}%;top:${slot.y}%"><div class="emptyslot">${slot.p}</div></div>`;const card=opponent.kind==="friend"?friendCard(pl,slot.p,true):cardHTML(pl,opponent.items?.[i]||null,true,opponent.eventReleaseId&&posFit(pl,slot.p)<=0?pl.position:slot.p);return`<div class="friend-slot" style="left:${slot.x}%;top:${slot.y}%">${card}</div>`}).join(""),bench=sq.slice(11,18).map((pl,k)=>`<div>${pl?(opponent.kind==="friend"?friendCard(pl,"BANK",true):cardHTML(pl,opponent.items?.[k+11]||null,true,pl.position)):'<div class="emptyslot">BANK</div>'}</div>`).join("");$("opponentTeamModalBody").innerHTML=`<div class="friend-team-summary"><div class="kpi"><strong>${opponent.rating||0}</strong><span>Rating</span></div><div class="kpi"><strong>${opponent.chem||0}/33</strong><span>Chemie</span></div><div class="kpi"><strong>${formation}</strong><span>Formation</span></div></div><div class="pitch friend-pitch">${pitch}</div><div class="friend-bench">${bench}</div>${opponent.rewards?`<div class="opponent-note">Squad-Battles-Belohnung: Sieg ${fmt(opponent.rewards.win)} Coins · Remis ${fmt(opponent.rewards.draw)} · Niederlage ${fmt(opponent.rewards.loss)}.</div>`:""}`;showUiLayer("opponentTeamModal","opponent-team")}
$("squadBattleModalClose").addEventListener("click",()=>closeUiLayer("squadBattleModal",squadBattleStage==="preview"?"squad-preview":"squad-selection"));
$("opponentTeamModalClose").addEventListener("click",()=>closeUiLayer("opponentTeamModal","opponent-team"));
function swapPreviewSlots(from,to){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=state.squad.length||to>=state.squad.length||from===to||!state.squad[from])return false;
 [state.squad[from],state.squad[to]]=[state.squad[to],state.squad[from]];
 previewSwapFrom=-1;save();renderAll();refreshOpenMatchPreview();return true
}
let previewDrag=null,suppressPreviewClick=false;
function clearPreviewDrag(){
 previewDrag?.ghost?.remove();previewDrag?.source?.classList.remove("drag-source");
 $("squadBattleModalBody").querySelectorAll(".preview-lineup-slot.drop-target").forEach(el=>el.classList.remove("drop-target"));
 previewDrag=null
}
$("squadBattleModalBody").addEventListener("pointerdown",e=>{
 const slot=e.target.closest("[data-preview-slot]");if(!slot||squadBattleStage!=="preview")return;
 const from=Number(slot.dataset.previewSlot);if(!Number.isInteger(from)||!state.squad[from])return;
 previewDrag={from,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,source:slot,active:false,target:null,ghost:null}
},{passive:true});
document.addEventListener("pointermove",e=>{
 const d=previewDrag;if(!d||e.pointerId!==d.pointerId)return;
 if(!d.active&&Math.hypot(e.clientX-d.startX,e.clientY-d.startY)<8)return;
 if(!d.active){
  d.active=true;d.source.classList.add("drag-source");
  const card=d.source.querySelector(".card-shell")?.cloneNode(true);
  if(card){d.ghost=document.createElement("div");d.ghost.className="preview-dragghost";d.ghost.appendChild(card);document.body.appendChild(d.ghost)}
 }
 e.preventDefault();if(d.ghost){d.ghost.style.left=`${e.clientX}px`;d.ghost.style.top=`${e.clientY}px`}
 const target=document.elementFromPoint(e.clientX,e.clientY)?.closest?.("#squadBattleModalBody [data-preview-slot]");
 $("squadBattleModalBody").querySelectorAll(".preview-lineup-slot.drop-target").forEach(el=>el.classList.remove("drop-target"));
 d.target=target&&Number(target.dataset.previewSlot)!==d.from?Number(target.dataset.previewSlot):null;
 if(d.target!==null)target.classList.add("drop-target")
},{passive:false});
document.addEventListener("pointerup",e=>{
 const d=previewDrag;if(!d||e.pointerId!==d.pointerId)return;
 const target=document.elementFromPoint(e.clientX,e.clientY)?.closest?.("#squadBattleModalBody [data-preview-slot]");
 const to=target?Number(target.dataset.previewSlot):null,active=d.active;clearPreviewDrag();
 if(!active)return;
 suppressPreviewClick=true;setTimeout(()=>{suppressPreviewClick=false},0);
 if(swapPreviewSlots(d.from,to))toast("Aufstellung vor dem Spiel aktualisiert.")
},{passive:true});
document.addEventListener("pointercancel",e=>{if(previewDrag?.pointerId===e.pointerId)clearPreviewDrag()},{passive:true});
$("squadBattleModalBody").addEventListener("change",e=>{
 if(e.target.id==="sbDifficulty"){state.squadBattle.difficulty=e.target.value in SB_DIFFICULTIES?e.target.value:"pro";save();return}
 if(e.target.id==="previewFormationSelect"){
  const formation=e.target.value;if(!FORMATIONS[formation])return;
  const selected=squadItems().filter(Boolean);
  state.formation=formation;state.roles={};state.focus={};state.squad=arrangeSquad(selected,formation);
  previewSwapFrom=-1;save();renderAll();refreshOpenMatchPreview();toast(`Formation ${formation} eingestellt.`);return
 }
 if(e.target.id==="previewTacticSelect"){
  state.tactic=["balanced","attacking","defensive"].includes(e.target.value)?e.target.value:"balanced";
  save();toast(`Taktik: ${e.target.selectedOptions[0]?.textContent||"Ausgeglichen"}.`);return
 }
 const role=e.target.closest("[data-preview-role]"),focus=e.target.closest("[data-preview-focus]");
 if(role){
  const index=Number(role.dataset.previewRole),slot=currentFormation()[index]?.p||"",roles=ROLE_OPTIONS[slot]||[];
  if(Number.isInteger(index)&&roles.includes(role.value)){state.roles[index]=role.value;save();toast(`Rolle: ${roleLabel(role.value)}.`)}return
 }
 if(focus){
  const index=Number(focus.dataset.previewFocus);
  if(Number.isInteger(index)&&FOCUS_OPTIONS.includes(focus.value)){state.focus[index]=focus.value;save();toast(`Fokus: ${focusLabel(focus.value)}.`)}
 }
});
$("squadBattleModalBody").addEventListener("click",e=>{
 if(suppressPreviewClick)return;
 if(e.target.closest('[data-select-squad]')){handleSquadPresetClick(e);return}
 const sel=e.target.closest("[data-sb-select]");
 if(sel){selectedSquadBattleIndex=Number(sel.dataset.sbSelect);selectedSquadBattleReplayConfirm="";renderSquadBattleSelection("none");return}
 if(e.target.closest("#sbRefreshOpponents")){
  if(typeof refreshSquadBattleOpponents!=="function"||!refreshSquadBattleOpponents()){toast(state.squadBattle?.played>=12?"Ab 12/14 warten TOTW und Event-Team.":"Alle 4 Gegner-Refreshes dieser Woche sind verbraucht.");return}
  selectedSquadBattleIndex=-1;selectedSquadBattleReplayConfirm="";squadBattleOpponentCache={key:"",list:[]};renderSquadBattleSelection("none");toast(`Neue Gegner geladen · ${squadBattleRefreshRemaining()}/4 Refreshes übrig.`);return
 }
 if(e.target.closest("#sbViewOpponent")){const o=getSquadBattleOpponents()[selectedSquadBattleIndex];if(o)openOpponentTeam(o);return}
 if(e.target.closest("#sbReplayLineup")){
  const o=getSquadBattleOpponents()[selectedSquadBattleIndex];if(!o)return;
  if(!state.squadBattle?.playedIds?.includes(o.battleId)){selectedSquadBattleReplayConfirm="";renderMatchPreview("squad",o);return}
  if(selectedSquadBattleReplayConfirm!==String(o.battleId)){
   selectedSquadBattleReplayConfirm=String(o.battleId);renderSquadBattleSelection("none");toast("Bereits gewertet: Dieses Wiederholungsspiel bringt 0 BP.");return
  }
  selectedSquadBattleReplayConfirm="";renderMatchPreview("squad",o);return
 }
 if(e.target.closest("#sbContinueLineup")){
  const o=getSquadBattleOpponents()[selectedSquadBattleIndex];if(!o)return;
  if(state.squadBattle?.playedIds?.includes(o.battleId)){selectedSquadBattleReplayConfirm="";renderSquadBattleSelection("none");toast("Dieser Gegner wurde bereits gewertet und bringt 0 BP.");return}
  renderMatchPreview("squad",o);return
 }
 if(e.target.closest("[data-preview-kit-auto]")){if(pendingMatchContext){pendingMatchKitSelection=createDefaultMatchKitSelection(pendingMatchContext.opponent);refreshOpenMatchPreview()}return}
 const kitChoice=e.target.closest("[data-preview-kit-side][data-preview-kit-choice]");
 if(kitChoice&&pendingMatchContext){
  const side=kitChoice.dataset.previewKitSide,choice=kitChoice.dataset.previewKitChoice;
  if(["home","away"].includes(side)&&["home","away"].includes(choice)){const current={...currentPreviewKitSelection()};current[side]=choice;pendingMatchKitSelection=current;refreshOpenMatchPreview()}return
 }
  if(e.target.closest("#previewOpponentBtn")){if(pendingMatchContext?.opponent)openOpponentTeam(pendingMatchContext.opponent);return}
 if(e.target.closest("[data-preview-swap-cancel]")){previewSwapFrom=-1;refreshOpenMatchPreview();return}
 const slotButton=e.target.closest("[data-preview-slot]");
 if(slotButton){
  const i=Number(slotButton.dataset.previewSlot);if(!Number.isInteger(i)||i<0||i>=state.squad.length)return;
  if(previewSwapFrom>=0){
   const source=previewSwapFrom;previewSwapFrom=-1;
   if(swapPreviewSlots(source,i))toast("Kaderplätze getauscht.");else refreshOpenMatchPreview();return
  }
  const item=state.club.find(x=>x.uid===state.squad[i]);if(item)openPlayerDetails(item,i,true);else openPicker(i);
  return
 }
 if(e.target.closest("#squadBattleKickoff")){
  const ctx=pendingMatchContext;if(!ctx)return;
  if(squadMetrics().filled<18){refreshOpenMatchPreview();toast("Für den Anpfiff brauchst du 11 Starter und 7 Bankspieler.");return}
  removeUiLayer("squadBattleModal");previewSwapFrom=-1;replaceUiState("view",{view:"playView"});startMatch(ctx.mode,ctx.opponent,currentPreviewKitSelection());pendingMatchContext=null;pendingMatchKitSelection=null
 }
});

function encodeFriendProfile(){
 const m=squadMetrics(),items=squadItems(),form=state.formation;
 const onlineUid=window.FooteraOnline?.registered?window.FooteraOnline.userId:"";
 ensureClubIdentityState();const payload={v:onlineUid?5:2,onlineUid,username:state.profile.username||"",clubName:state.profile.clubName||"Footera Club",clubShortName:state.profile.clubShortName||"FTR",clubIdentity:clubIdentitySnapshot(),rating:m.rating,chem:m.chem,formation:form,tactic:state.tactic||"balanced",roles:{...state.roles},focus:{...state.focus},division:state.rivals.division,record:{w:state.stats.wins,d:state.stats.draws,l:state.stats.losses},squad:items.slice(0,18).map(i=>{if(!i)return null;const b=displayBase(i);return b?{pid:String(i.pid||b.id||""),name:b.name,ovr:itemRating(i),position:b.position,alt:b.alt||"",team:b.team,league:b.league,nation:b.nation,pac:b.pac,sho:b.sho,pas:b.pas,dri:b.dri,def:b.def,phy:b.phy,face:b.face||"",variant:i.variant||"",boost:i.boost||0,eventName:i.eventName||"",chemBoost:i.chemBoost?{...i.chemBoost}:null}:null})};
 try{return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}catch(e){return""}
}
function decodeFriendProfile(code){try{return JSON.parse(decodeURIComponent(escape(atob(code.trim()))))}catch(e){return null}}
function friendSnapshotItem(item){
 if(!item)return null;
 const b=displayBase(item);if(!b)return null;
 return{pid:String(item.pid||b.id||""),name:b.name,ovr:itemRating(item),position:b.position,alt:b.alt||"",team:b.team,league:b.league,nation:b.nation,pac:b.pac,sho:b.sho,pas:b.pas,dri:b.dri,def:b.def,phy:b.phy,face:b.face||"",dynamicFace:item.dynamicFace||b.dynamicFace||"",variant:item.variant||"",boost:Number(item.boost||0),eventName:item.eventName||"",eventType:item.eventType||"",eventReleaseId:item.eventReleaseId||"",eventStats:Array.isArray(item.eventStats)?item.eventStats.map(Number):null,overridePosition:item.overridePosition||"",displayRating:Number(item.displayRating||0),evo:Number(item.evo||0),evoStats:item.evoStats&&typeof item.evoStats==="object"?{...item.evoStats}:{},evoDesign:item.evoDesign===true,chemBoost:item.chemBoost?{...item.chemBoost}:null}
}
function friendTeamSnapshotForPreset(preset,indexSlot,isActive){
 const requestedFormation=isActive?state.formation:preset?.formation,formation=SQUAD_FORMATION_NAMES.includes(requestedFormation)?requestedFormation:"4-3-3";
 const ids=Array.isArray(isActive?state.squad:preset?.squad)?(isActive?state.squad:preset.squad):Array(23).fill(null);
 const items=Array.from({length:23},(_,i)=>state.club.find(x=>x.uid===ids[i])||null),filled=items.slice(0,18).filter(Boolean).length;
 if(!filled)return null;
 const xi=items.slice(0,11).filter(Boolean),rating=xi.length?Math.round(xi.reduce((sum,it)=>sum+itemRating(it),0)/xi.length):0;
 const bases=items.map(it=>it?displayBase(it):null),chem=opponentChemistryTotal(bases,formation,items),roles={...(isActive?state.roles:preset?.roles||{})},focus={...(isActive?state.focus:preset?.focus||{})},tactic=isActive?state.tactic:(preset?.tactic||"balanced");
 return{slot:indexSlot,name:squadPresetName((isActive?state.squadPresets?.[indexSlot]?.name:preset?.name)||"",indexSlot),active:!!isActive,formation,tactic,roles,focus,rating,chem,filled,squad:items.slice(0,18).map(friendSnapshotItem)}
}
function friendOnlineTeamsSnapshot(){
 persistActiveSquadPreset(state);
 const activeIndex=Number.isInteger(state.activeSquadPreset)?state.activeSquadPreset:0;
 const active=friendTeamSnapshotForPreset(state.squadPresets?.[activeIndex],activeIndex,true);
 const extras=(state.squadPresets||[]).map((preset,i)=>i===activeIndex||!preset?null:friendTeamSnapshotForPreset(preset,i,false)).filter(team=>team&&team.filled===18);
 return[active,...extras].filter(Boolean).slice(0,3)
}
function friendProfileTeams(friend){
 const legacy={slot:Number(friend?.activeSquadPreset||0),name:"Aktuelles Team",active:true,formation:FORMATIONS[friend?.formation]?friend.formation:"4-3-3",tactic:["balanced","attacking","defensive"].includes(friend?.tactic)?friend.tactic:"balanced",roles:{...(friend?.roles||{})},focus:{...(friend?.focus||{})},rating:Number(friend?.rating||0),chem:Number(friend?.chem||0),filled:Array.isArray(friend?.squad)?friend.squad.filter(Boolean).length:0,squad:Array.isArray(friend?.squad)?friend.squad:Array(18).fill(null)};
 const raw=Array.isArray(friend?.teams)?friend.teams.filter(team=>team&&Array.isArray(team.squad)):[];
 if(!raw.length)return[legacy];
 const activeSlot=Number.isFinite(Number(friend?.activeSquadPreset))?Number(friend.activeSquadPreset):Number(friend?.active_preset||0);
 const normalized=raw.map((team,i)=>{const slot=Number.isFinite(Number(team.slot))?Number(team.slot):i,filled=team.squad.slice(0,18).filter(Boolean).length;return{...team,slot,name:String(team.name||("Team "+(slot+1))),formation:FORMATIONS[team.formation]?team.formation:"4-3-3",rating:Number(team.rating||0),chem:Number(team.chem||0),filled,active:team.active===true||slot===activeSlot}});
 const active=normalized.find(team=>team.active)||normalized[0]||legacy;
 const extras=normalized.filter(team=>team!==active&&team.filled===18).sort((a,b)=>a.slot-b.slot);
 return[active,...extras].slice(0,3)
}
function friendBase(fp){if(!fp)return null;const db=fp.pid?P_BY_ID.get(String(fp.pid)):null;return db?{...db,ovr:Number(fp.ovr||db.ovr),position:fp.position||db.position,alt:fp.alt||db.alt,team:fp.team||db.team,league:fp.league||db.league,nation:fp.nation||db.nation,face:fp.face||db.face,pac:fp.pac||db.pac,sho:fp.sho||db.sho,pas:fp.pas||db.pas,dri:fp.dri||db.dri,def:fp.def||db.def,phy:fp.phy||db.phy}:{id:fp.pid||fp.name,name:fp.name||"Spieler",ovr:Number(fp.ovr||0),position:fp.position||"CM",alt:fp.alt||"",team:fp.team||"",league:fp.league||"",nation:fp.nation||"",face:fp.face||"",pac:fp.pac||0,sho:fp.sho||0,pas:fp.pas||0,dri:fp.dri||0,def:fp.def||0,phy:fp.phy||0}}
function friendFits(p,slot){if(!p)return false;const positions=[p.position,...String(p.alt||"").split(/[,/]/).map(x=>x.trim()).filter(Boolean)];return positions.includes(slot)}
function friendItem(fp,b=friendBase(fp)){
 if(!fp||!b)return null;
 return{uid:"friend-"+String(fp.pid||fp.name||b.id||b.name),pid:String(fp.pid||b.id||""),tradeable:false,evo:Number(fp.evo||0),evoStats:fp.evoStats&&typeof fp.evoStats==="object"?{...fp.evoStats}:{},evoDesign:fp.evoDesign===true,chemBoost:fp.chemBoost?{...fp.chemBoost}:null,variant:fp.variant||"",boost:Number(fp.boost||0),eventName:fp.eventName||"",eventType:fp.eventType||"",eventReleaseId:fp.eventReleaseId||"",dynamicFace:fp.dynamicFace||"",overridePosition:fp.overridePosition||"",eventStats:Array.isArray(fp.eventStats)?fp.eventStats.map(Number):null,displayRating:Number(fp.ovr||b.ovr)}
}
function friendCard(fp,slot,mini=true){
 const b=friendBase(fp);if(!b)return'<div class="emptyslot">LEER</div>';
 const shown=friendFits(b,slot)?slot:b.position,item=friendItem(fp,b);
 return cardHTML(b,item,mini,shown)
}
function openFriendBiography(fp,slot=""){
 const raw=friendBase(fp);if(!raw)return;
 const item=friendItem(fp,raw),b=resolvedPlayer(raw),shown=slot&&slot!=="BANK"&&friendFits(b,slot)?slot:b.position;
 ensurePlayerAffiliationAssets(b);
 $("bioDetailSub").textContent=`FREUNDESKARTE · ${playerContextLine(b)}`;
 $("bioDetailBody").innerHTML=playerBiographyHTML(b,item,{shownPosition:shown,friend:true});
 showUiLayer("bioModal","bio")
}
function renderFriendTeamModal(index,selectedIndex=0){
 const f=state.friends[index];if(!f)return;
 const teams=friendProfileTeams(f),safeIndex=Math.max(0,Math.min(teams.length-1,Number(selectedIndex)||0)),team=teams[safeIndex]||teams[0];
 const formation=FORMATIONS[team.formation]?team.formation:"4-3-3",form=FORMATIONS[formation],sq=Array.isArray(team.squad)?team.squad:Array(18).fill(null);
 $("friendTeamModalTitle").textContent=f.clubName||"Freundes-Mannschaft";
 $("friendTeamModalSub").textContent=team.name+(team.active?" · Aktiv":"")+" · "+formation+" · Rating "+(team.rating||0)+" · Chemie "+(team.chem||0)+"/33";
 const tabs=teams.length>1?'<div class="friend-team-tabs">'+teams.map((entry,i)=>'<button type="button" class="'+(i===safeIndex?"active":"")+'" data-friend-index="'+index+'" data-friend-team-tab="'+i+'"><strong>'+esc(entry.name)+'</strong><small>'+(entry.active?"Aktiv · ":"")+(entry.rating||0)+' · '+(entry.chem||0)+'/33</small></button>').join("")+'</div>':"";
 const pitch=sq.slice(0,11).map((fp,i)=>{const slot=form[i],b=friendBase(fp),out=b&&!friendFits(b,slot.p),label=b?`Spielerbiografie von ${b.name} öffnen`:"";return'<div class="friend-slot '+(out?"out":"")+'" style="left:'+slot.x+'%;top:'+slot.y+'%">'+(fp?'<button type="button" class="friend-player-open" data-friend-player="'+i+'" data-friend-index="'+index+'" data-friend-team="'+safeIndex+'" aria-label="'+esc(label)+'">'+friendCard(fp,slot.p,true)+'</button>':'<div class="emptyslot">'+positionLabel(slot.p)+'<br>+</div>')+(out?'<div class="poswarn">!</div>':'')+'</div>'}).join("");
 const bench=sq.slice(11,18).map((fp,k)=>{const b=friendBase(fp),slotIndex=11+k,label=b?`Spielerbiografie von ${b.name} öffnen`:"";return'<div>'+(fp?'<button type="button" class="friend-player-open" data-friend-player="'+slotIndex+'" data-friend-index="'+index+'" data-friend-team="'+safeIndex+'" aria-label="'+esc(label)+'">'+friendCard(fp,"BANK",true)+'</button>':'<div class="emptyslot">BANK<br>+</div>')+'</div>'}).join("");
 let liveText="Gespeicherter Stand";
 if(f._liveUpdatedAt){try{liveText="Aktueller Online-Stand · "+new Date(f._liveUpdatedAt).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}catch(e){liveText="Aktueller Online-Stand"}}
 $("friendTeamModalBody").innerHTML='<div class="friend-team-title"><div><h2>'+esc(team.name)+'</h2><p>'+esc(f.clubName||"Freund")+' · '+esc(liveText)+'</p></div><button class="primary" data-friend-modal-play="'+index+'">Zur eigenen Aufstellung</button></div>'+tabs+'<div class="friend-team-summary"><div class="kpi"><strong>'+(team.rating||0)+'</strong><span>Rating</span></div><div class="kpi"><strong>'+(team.chem||0)+'/33</strong><span>Chemie</span></div><div class="kpi"><strong>'+esc(formation)+'</strong><span>Formation</span></div></div><div class="pitch friend-pitch">'+pitch+'</div><div class="friend-bench">'+bench+'</div>'
}
async function openFriendTeam(index){
 const f=state.friends[index];if(!f)return;
 $("friendTeamModalTitle").textContent=f.clubName||"Freundes-Mannschaft";$("friendTeamModalSub").textContent="Aktuelle Mannschaft wird geladen …";
 $("friendTeamModalBody").innerHTML='<div class="friend-team-loading">Aktuellen Kader laden …</div>';showUiLayer("friendTeamModal","friend-team");
 if(f.onlineUid&&window.FooteraOnline?.ready&&window.FooteraOnline?.fetchFriendProfile){
  try{const live=await window.FooteraOnline.fetchFriendProfile(f);if(live){state.friends[index]={...f,...live,_key:f._key};save()}}catch(e){console.warn("Freundes-Kader konnte nicht live geladen werden",e)}
 }
 renderFriendTeamModal(index,0)
}
function renderSocial(){
 if(!state.profile.saveId)state.profile.saveId=newFooteraSaveId();
 if($("profileUsername"))$("profileUsername").value=state.profile.username||"";
 if($("profileSaveId"))$("profileSaveId").value=state.profile.saveId;
 if($("socialClubName"))$("socialClubName").textContent=state.profile.clubName||"Footera Club";
 const codeBox=$("myFriendCode");
 if(window.FooteraOnline?.available){
  if(codeBox)codeBox.value=window.FooteraOnline.friendCode||"Online-Verbindung wird aufgebaut …";
  const loadCode=()=>window.FooteraOnline?.getFriendCode?.().then(code=>{if(codeBox&&code)codeBox.value=code.slice(0,4)+"-"+code.slice(4)}).catch(e=>{if(codeBox)codeBox.value="Freundescode derzeit nicht verfügbar";console.warn(e)});
  if(window.FooteraOnline.ready)loadCode();else window.FooteraOnline.init()?.then(loadCode).catch(console.warn)
 }else if(codeBox)codeBox.value=encodeFriendProfile();
 if(!window.FooteraFriendsHub)$("friendList").innerHTML=state.friends.length?state.friends.map((f,i)=>`<div class="friend"><h4>${esc(f.clubName||"Freund")}</h4><p>Rating ${f.rating||0} · Chemie ${f.chem||0}/33 · ${esc(f.formation||"4-3-3")} · Division ${f.division||10} · ${f.record?.w||0} S / ${f.record?.d||0} U / ${f.record?.l||0} N</p><div class="friend-actions"><button class="secondary" data-friend-squad="${i}">Aufstellung</button><button class="primary" data-friend-friendly="${i}">Friendly</button>${window.FooteraOnline?.ready&&f.onlineUid?`<button class="secondary friend-message-btn" data-friend-chat="${i}">Nachricht${window.FooteraOnline?.unreadCount?.(f.onlineUid)?` <span class="friend-unread-badge">${window.FooteraOnline.unreadCount(f.onlineUid)}</span>`:""}</button><button class="primary" data-friend-live="${i}">Live-Duell</button><button class="secondary" data-friend-compare="${i}">Rangliste</button>`:""}<button class="secondary" data-friend-remove="${i}">Entfernen</button></div></div>`).join(""):'<div class="friend-empty">Noch keine Freunde gespeichert. Füge einen Profilcode hinzu; danach kannst du dessen Startelf und Bank ansehen und ein Freundschaftsspiel starten.</div>';
 window.FooteraOnline?.render();if(window.FooteraOnline?.available&&!window.FooteraOnline.ready)window.FooteraOnline.init();else if(window.FooteraOnline?.ready&&!window.FooteraOnline.registered)window.FooteraOnline.syncProfile().then(ok=>{if(ok)renderSocial()}).catch(console.warn)
}
$("saveProfileName").addEventListener("click",()=>{const username=$("profileUsername")?.value.trim()||state.profile.username||"";if(username.length<2)return toast("Bitte mindestens 2 Zeichen für den Benutzernamen eingeben.");state.profile.username=username;if(!state.profile.saveId)state.profile.saveId=newFooteraSaveId();save();renderSocial();renderHome();window.FooteraOnline?.syncProfile().catch(console.warn);toast("Benutzername gespeichert.")});
$("copyProfileSaveId")?.addEventListener("click",async()=>{if(!state.profile.saveId)state.profile.saveId=newFooteraSaveId();try{await navigator.clipboard.writeText(state.profile.saveId);toast("Vereins-ID kopiert.")}catch(e){const el=$("profileSaveId");el?.focus();el?.select();toast(`Vereins-ID: ${state.profile.saveId}`)}});
$("copyFriendCode")?.addEventListener("click",async()=>{
 const box=$("myFriendCode"),code=String(box?.value||"").trim();
 if(!code||/wird aufgebaut|nicht verfügbar/i.test(code))return toast("Freundescode ist noch nicht verfügbar.");
 try{await navigator.clipboard.writeText(code);toast("Freundescode kopiert.")}
 catch(e){box?.focus();box?.select();toast("Freundescode markiert – bitte kopieren.")}
});
$("refreshFriendCode").addEventListener("click",async()=>{
 if(window.FooteraOnline?.available){
  try{
   await window.FooteraOnline.init();
   const code=await window.FooteraOnline.getFriendCode();
   if(!code)return toast("Freundescode noch nicht verfügbar. Prüfe, ob Startelf und Bank vollständig sind.");
   $("myFriendCode").value=code.slice(0,4)+"-"+code.slice(4);
   toast("Freundescode aktualisiert.")
  }catch(e){console.warn(e);toast("Freundescode konnte nicht geladen werden.")}
 }else{$("myFriendCode").value=encodeFriendProfile();toast("Profilcode aktualisiert.")}
});
$("addFriendCode").addEventListener("click",async()=>{
 const raw=$("friendCodeInput").value.trim(),shortCode=raw.toUpperCase().replace(/[^A-Z0-9]/g,"");
 let f=null;
 if(/^[A-HJ-NP-Z2-9]{8}$/.test(shortCode)){
  try{
   if(!window.FooteraOnline?.available)return toast("Online-Dienst ist nicht konfiguriert.");
   await window.FooteraOnline.init();
   f=await window.FooteraOnline.resolveFriendCode(shortCode);
   if(!f)return toast("Freundescode nicht gefunden.")
  }catch(e){console.warn(e);return toast("Freundescode konnte nicht geladen werden.")}
 }else{
  f=decodeFriendProfile(raw);
 }
 if(storeFriendProfile(f)==="saved"){$("friendCodeInput").value="";toast("Freundesprofil gespeichert.")}
});
// Shared by the code field and invite links (?invite=): "saved", "own" or "invalid".
function storeFriendProfile(f,{quiet=false}={}){
 if(!f||!Array.isArray(f.squad)){if(!quiet)toast("Freundescode ungültig.");return"invalid"}
 if(f.onlineUid&&f.onlineUid===window.FooteraOnline?.userId){if(!quiet)toast("Das ist dein eigener Freundescode.");return"own"}
 const key=f.onlineUid||((f.clubName||"Freund")+"|"+(f.rating||0)+"|"+(f.division||10)),idx=state.friends.findIndex(x=>x._key===key||(f.onlineUid&&x.onlineUid===f.onlineUid));
 f._key=key;
 if(idx>=0)state.friends[idx]={...state.friends[idx],...f,_key:key};else state.friends.push(f);
 save();renderSocial();renderPlay();return"saved"
}
$("friendList").addEventListener("click",e=>{const r=e.target.closest("[data-friend-remove]"),v=e.target.closest("[data-friend-squad]"),f=e.target.closest("[data-friend-friendly]"),chat=e.target.closest("[data-friend-chat]"),live=e.target.closest("[data-friend-live]"),compare=e.target.closest("[data-friend-compare]");if(r){state.friends.splice(Number(r.dataset.friendRemove),1);save();renderSocial();renderPlay();return}if(v){openFriendTeam(Number(v.dataset.friendSquad));return}if(chat){window.FooteraOnline?.openChat(state.friends[Number(chat.dataset.friendChat)]);return}if(live){window.FooteraOnline?.invite(state.friends[Number(live.dataset.friendLive)]);return}if(compare){window.FooteraOnline?.showComparison(state.friends[Number(compare.dataset.friendCompare)]);return}if(f){const idx=Number(f.dataset.friendFriendly);if(!state.friends[idx])return;switchView("playView");$("friendlyFriendSelect").value=String(idx);renderPlay();window.FooteraPlayHub?.open("friendly-friend");toast(`${state.friends[idx].clubName}: bereit für Friendly.`);return}});
$("friendTeamModalClose").addEventListener("click",()=>closeUiLayer("friendTeamModal","friend-team"));
$("friendTeamModalBody").addEventListener("click",e=>{const player=e.target.closest("[data-friend-player]");if(player){const friendIndex=Number(player.dataset.friendIndex),teamIndex=Number(player.dataset.friendTeam),playerIndex=Number(player.dataset.friendPlayer),fr=state.friends[friendIndex],team=fr?friendProfileTeams(fr)[teamIndex]:null,fp=team?.squad?.[playerIndex];if(fp){const form=FORMATIONS[team.formation]||FORMATIONS["4-3-3"],slot=playerIndex<11?(form[playerIndex]?.p||""):"BANK";openFriendBiography(fp,slot)}return}const tab=e.target.closest("[data-friend-team-tab]");if(tab){renderFriendTeamModal(Number(tab.dataset.friendIndex),Number(tab.dataset.friendTeamTab));return}const b=e.target.closest("[data-friend-modal-play]");if(!b)return;const idx=Number(b.dataset.friendModalPlay),fr=state.friends[idx];if(!fr)return;$("friendTeamModal").classList.remove("active");replaceUiState("view",{view:"playView"});switchView("playView",{push:false});$("friendlyFriendSelect").value=String(idx);renderPlay();window.FooteraPlayHub?.open("friendly-friend");renderMatchPreview("friendly-friend",friendAsOpponent(fr))});



const DIRECT_REWARDS=Object.freeze({
 "GF-9AE6CDDEFE8A458D":[{id:"basti_86plus_20260925",pack:"86",qty:1,label:"86+ Players Pack"},{id:"basti_83plus_20261003",pack:"83",qty:1,label:"83+ Players Pack"},{id:"basti_86plus_20261003",pack:"86",qty:1,label:"86+ Players Pack"},{id:"basti_2x86plus_20261003",pack:"2x86",qty:1,label:"2× 86+ Players Pack"},{id:"basti_83plus_20261003_b2",pack:"83",qty:1,label:"83+ Players Pack"},{id:"basti_86plus_20261003_b2",pack:"86",qty:1,label:"86+ Players Pack"},{id:"basti_2x86plus_20261003_b2",pack:"2x86",qty:1,label:"2× 86+ Players Pack"}],
 "GF-7D87D08A06104571":[{id:"marco_premium_goldplayers_20260930",pack:"marco-premium-goldplayers-20260930",qty:1,label:"Premium Goldspieler-Pack"}]
});
function grantDirectRewards(){
 const saveId=String(state.profile?.saveId||"").trim().toUpperCase(),rewards=DIRECT_REWARDS[saveId]||[];
 if(!rewards.length)return[];
 state.directClaims=state.directClaims||{};
 const granted=[];
 for(const reward of rewards){
  if(state.directClaims[reward.id])continue;
  if(reward.pack){
   const pack=PACKS.find(p=>p.id===reward.pack);
   if(!pack)continue;
   const qty=Math.max(1,Number(reward.qty||1));
   state.packs[reward.pack]=(state.packs[reward.pack]||0)+qty;
   state.directClaims[reward.id]={claimedAt:Date.now(),reward:{pack:reward.pack,qty}};
   granted.push(reward)
  }
 }
 if(granted.length){save();flushSave()}
 return granted
}

const PROMO_CODES={
 "säulen1415":{id:"saeulen1415_100k",points:100000,label:"Säulen1415"},
 "ranger":{id:"ranger_50k",points:50000,label:"Ranger"},
 "basti":{id:"basti_500k",points:500000,label:"Basti"}
};
function normalizePromoCode(v){return String(v||"").normalize("NFC").trim().toLocaleLowerCase("de-DE")}
function renderPromo(){
 const status=$("promoStatus"),title=$("promoRewardTitle"),sub=$("promoRewardSub");
 if(!status)return;
 const claims=Object.values(state.promoClaims||{}).filter(Boolean).sort((a,b)=>Number(b.claimedAt||0)-Number(a.claimedAt||0));
 if(claims.length){const last=claims[0],pts=Number(last.reward?.points||0);status.className="promo-status success";status.textContent=`Zuletzt eingelöst: ${last.code} · ${fmt(pts)} Footera Points. Jeder Code kann pro Spielstand nur einmal verwendet werden.`;if(title)title.textContent=`${fmt(pts)} Footera Points`;if(sub)sub.textContent=`Belohnung aus „${last.code}“`;}
 else{status.className="promo-status";status.textContent="Gib deinen Promocode ein und tippe auf „Einlösen“.";if(title)title.textContent="Promocode-Belohnung";if(sub)sub.textContent="Jeder gültige Code hat seine eigene Belohnung."}
}
function redeemPromo(){
 const input=$("promoCodeInput"),status=$("promoStatus"),key=normalizePromoCode(input?.value),promo=PROMO_CODES[key];
 if(!promo){if(status){status.className="promo-status error";status.textContent="Promocode ungültig. Prüfe die Schreibweise und versuche es erneut."}return}
 state.promoClaims=state.promoClaims||{};
 if(state.promoClaims[promo.id]){if(status){status.className="promo-status success";status.textContent=`„${promo.label}“ wurde in diesem Spielstand bereits eingelöst.`}return}
 state.points+=promo.points;state.promoClaims[promo.id]={claimedAt:Date.now(),code:promo.label,reward:{points:promo.points}};
 save();renderWallet();renderPromo();if(input)input.value="";toast(`${fmt(promo.points)} Footera Points gutgeschrieben.`)
}
$("redeemPromoCode")?.addEventListener("click",redeemPromo);
$("promoCodeInput")?.addEventListener("keydown",e=>{if(e.key==="Enter")redeemPromo()});
function renderActiveView(id){
 if(id==="homeView")renderHome();
 else if(id==="squadView")renderSquad();
 else if(id==="playView")renderPlay();
 else if(id==="storeView")renderStore();
 else if(id==="objectivesView")renderTasks();
 else if(id==="seasonPassView")renderSeasonPass();
 else if(id==="sbcView")renderSBC();
 else if(id==="evolutionView")renderEvos();
 else if(id==="eventsView")renderEvents();
 else if(id==="clubView")renderClub();
 else if(id==="socialView")renderSocial();
 else if(id==="extrasView"){renderPromo();renderSocial();updatePwaInstallUi()}
 else if(id==="marketView"){if(marketSection==="search"&&!marketListings.length)refreshMarket();else renderMarket()}
}
function renderAll(){renderWallet();renderActiveView(currentViewId());updateObjectiveIndicators();save()}

// V18.25 — Android/Samsung Zurück: echte App-Navigation statt versehentlichem Beenden.
let uiHistoryApplying=false,squadBattleStage="closed",uiLayerStack=[];
const UI_LAYER_BASE_Z=210;
function currentViewId(){return document.querySelector(".view.active")?.id||"homeView"}
function uiState(kind="view",extra={}){return{gfut:true,kind,view:extra.view||currentViewId(),...extra}}
function pushUiState(kind="view",extra={}){if(uiHistoryApplying)return;history.pushState(uiState(kind,extra),"",location.href)}
function replaceUiState(kind="view",extra={}){history.replaceState(uiState(kind,extra),"",location.href)}
function syncUiLayerStack(){
 const active=[...document.querySelectorAll(".modal.active")],ids=new Set(active.map(el=>el.id).filter(Boolean));
 uiLayerStack=uiLayerStack.filter(id=>ids.has(id));
 for(const el of active)if(el.id&&!uiLayerStack.includes(el.id))uiLayerStack.push(el.id);
 uiLayerStack.forEach((id,i)=>{const el=$(id);if(el)el.style.zIndex=String(UI_LAYER_BASE_Z+i+1)})
}
function topUiLayer(){syncUiLayerStack();return uiLayerStack[uiLayerStack.length-1]||""}
function removeUiLayer(id){
 const el=$(id);if(el)el.classList.remove("active");
 uiLayerStack=uiLayerStack.filter(x=>x!==id);
 if(id==="squadBattleModal")squadBattleStage="closed";
 syncUiLayerStack()
}
function closeTopUiLayer(){
 const id=topUiLayer();if(!id)return false;
  if(id==="squadBattleModal"&&squadBattleStage==="preview"&&pendingMatchContext?.mode==="squad"){renderSquadBattleSelection("none");syncUiLayerStack();return true}
 if(id==="evoPickerModal"&&restoreEvoPickerList())return true;
 removeUiLayer(id);return true
}
function showUiLayer(id,kind=id,extra={},historyMode="push"){
 const el=$(id);if(!el)return;
 const wasActive=el.classList.contains("active");
 uiLayerStack=uiLayerStack.filter(x=>x!==id);el.classList.add("active");uiLayerStack.push(id);syncUiLayerStack();
 if(historyMode==="replace")replaceUiState(kind,{layer:id,...extra});else if(historyMode!=="none"&&(!wasActive||history.state?.kind!==kind))pushUiState(kind,{layer:id,...extra})
}
function closeUiLayer(id,kind){
 const el=$(id);if(!el?.classList.contains("active"))return;
 if(id==="evoPickerModal"&&evoPickerListStash){evoPickerListStash=null;if(topUiLayer()===id&&history.state?.gfut&&history.state.kind==="evo-picker-preview"){history.go(-2);return}}
 if(topUiLayer()===id&&history.state?.gfut&&history.state.kind===kind){history.back();return}
 removeUiLayer(id)
}
function switchView(id,{push=true,scroll=true}={}){const prev=currentViewId();if(id==="marketView"&&prev!=="marketView")marketSection="hub";if(id==="evolutionView"&&prev!=="evolutionView"&&!evoFocusPlayerUid)activeEvoTab=activeEvolutionCount()?"active":"available";document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));$(id).classList.add("active");const secondaryViews=["evolutionView","objectivesView","seasonPassView","sbcView","clubView","socialView","extrasView"];const activeNavKey=secondaryViews.includes(id)?"moreView":id;document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===activeNavKey));hideMoreTray();renderActiveView(id);updateObjectiveIndicators();if(push&&!uiHistoryApplying&&prev!==id)pushUiState("view",{view:id});if(scroll)window.scrollTo({top:0,behavior:"smooth"})}
function protectLockedBack(message,kind){history.pushState(uiState(kind),"",location.href);toast(message)}
function handleAppBack(targetState){
  if($("usernameRequiredModal")?.classList.contains("active")&&!String(state.profile?.username||"").trim()){protectLockedBack("Bitte zuerst einen Benutzernamen festlegen.","username-required");return true}
  // Modale Detailansichten (z. B. Spielerprofil aus einem geöffneten Pack) haben Vorrang:
  // Zurück schließt zuerst die aktuelle Detailansicht und kehrt sofort zu den Pack-Ergebnissen zurück.
  if(closeTopUiLayer())return true;
  if($("opening")?.classList.contains("active")){protectLockedBack("Packöffnung zuerst abschließen.","pack-opening");return true}
  if($("results")?.classList.contains("active")&&(pendingResolved.size!==pendingPack.length||(state.pendingChemBoosts||[]).length)){protectLockedBack("Pack-Inhalt zuerst vollständig zuweisen.","pack-results");return true}
 if(currentViewId()==="sbcView"&&activeSbcId){
  pendingSbcSubmissionId=null;sbcAssistantState=null;sbcSlotDetailState=null;sbcPickerState=null;activeSbcId=null;renderSBC();return true
 }
 if($("match")?.classList.contains("active")){
  if($("managerPanel")?.classList.contains("active")){resumeMatch();return true}
  if($("matchResult")?.classList.contains("active")){stopMatchTimer();$("match").classList.remove("active");match=null;matchManagerDraft=null;if(targetState?.gfut&&targetState.view)switchView(targetState.view,{push:false});return true}
  protectLockedBack("Das laufende Spiel bleibt geöffnet. Beende zuerst die Partie.","match");return true
 }
 if(currentViewId()==="playView"&&window.FooteraPlayHub?.handleBack(targetState))return true;
 if(currentViewId()==="sbcView"&&window.FooteraPotm?.handleBack(targetState))return true;
 if(currentViewId()==="socialView"&&window.FooteraFriendsHub?.handleBack(targetState))return true;
 return false
}
window.addEventListener("popstate",e=>{uiHistoryApplying=true;try{if(handleAppBack(e.state))return;if(e.state?.gfut&&e.state.view){switchView(e.state.view,{push:false});window.FooteraPlayHub?.restore(e.state);window.FooteraFriendsHub?.restore(e.state);window.FooteraPotm?.restore(e.state)}}finally{setTimeout(()=>{uiHistoryApplying=false},0)}});
if(!history.state?.gfut)replaceUiState("view",{view:currentViewId()});

function moreTray(){return $("moreTray")}
function hideMoreTray(){const t=moreTray();if(t)t.classList.remove("open")}
function toggleMoreTray(){const t=moreTray();if(!t)return;const open=t.classList.toggle("open");document.querySelectorAll('.nav button').forEach(b=>{if(b.dataset.view==="moreView")b.classList.toggle('active',open||["evolutionView","objectivesView","seasonPassView","sbcView","clubView","socialView","extrasView"].includes(currentViewId()))});}

document.querySelectorAll(".nav button").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.toggle==="more"){toggleMoreTray();return}switchView(b.dataset.view)}));document.addEventListener("click",e=>{const moreBtn=e.target.closest("[data-toggle=more]");if(!moreBtn&&!e.target.closest("#moreTray"))hideMoreTray();const b=e.target.closest("[data-go]");if(b){hideMoreTray();switchView(b.dataset.go)}})
$("campaignModal").addEventListener("click",e=>{if(e.target===$("campaignModal"))closeUiLayer("campaignModal","campaign")});


let deferredInstallPrompt=null;
function pwaStandalone(){
 return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone===true;
}
function updatePwaInstallUi(){
 const installed=pwaStandalone();
 const hint=$("pwaInstallHint");
 const buttons=[$("extrasInstallBtn")].filter(Boolean);
 if(installed){
  if(hint)hint.innerHTML='<span class="pwa-installed">Footera ist bereits als App installiert.</span>';
  buttons.forEach(b=>{b.textContent="App installiert";b.disabled=true});
 }else{
  buttons.forEach(b=>{b.disabled=false;b.textContent="Footera installieren"});
 }
}
async function triggerPwaInstall(){
 if(pwaStandalone()){toast("Footera ist bereits installiert.");return}
 if(deferredInstallPrompt){
  deferredInstallPrompt.prompt();
  try{await deferredInstallPrompt.userChoice}catch(e){}
  deferredInstallPrompt=null;
  updatePwaInstallUi();
  return
 }
 if(location.protocol!=="https:" && location.hostname!=="localhost"){
  toast("Für die App-Installation muss Footera zuerst online über HTTPS geöffnet werden.");
  return
 }
 toast("Falls kein Dialog erscheint: Browser-Menü öffnen → „App installieren“ oder „Zum Startbildschirm hinzufügen“.")
}
window.addEventListener("beforeinstallprompt",e=>{
 e.preventDefault();
 deferredInstallPrompt=e;
 updatePwaInstallUi();
});
window.addEventListener("appinstalled",()=>{
 deferredInstallPrompt=null;
 updatePwaInstallUi();
 toast("Footera wurde installiert.")
});
$("extrasInstallBtn")?.addEventListener("click",triggerPwaInstall);
updatePwaInstallUi();


/* V20.30 — smooth startup: preload first, play after scripts are ready, defer heavy boot work */
let resolveFooteraIntroDone=null;
const FOOTERA_INTRO_DONE=new Promise(resolve=>{resolveFooteraIntroDone=resolve});
function completeFooteraIntroGate(){
 if(resolveFooteraIntroDone){const done=resolveFooteraIntroDone;resolveFooteraIntroDone=null;done()}
}
function takeGerliesUpdateResume(){
 try{
  const saved=sessionStorage.getItem("gfut-update-resume");sessionStorage.removeItem("gfut-update-resume");
  const raw=JSON.parse(saved||"null");
  const age=Date.now()-Number(raw?.at);
  return raw&&age>=0&&age<120000&&typeof raw.view==="string"?raw:null
 }catch(e){return null}
}
const GERLIES_UPDATE_RESUME=takeGerliesUpdateResume();
function initFooteraBootIntro(){
 const intro=$("bootIntro"),video=$("bootIntroVideo"),skip=$("bootIntroSkip");
 if(!intro||!video){completeFooteraIntroGate();return}
 if(GERLIES_UPDATE_RESUME){try{video.pause()}catch(e){}intro.remove();completeFooteraIntroGate();return}
 let logoStarted=false,playRequested=false,removed=false,frameHandle=0;
 const safety=setTimeout(()=>finish(),10000);
 function finish(){
  if(logoStarted)return;logoStarted=true;clearTimeout(safety);
  try{if(frameHandle&&typeof video.cancelVideoFrameCallback==="function")video.cancelVideoFrameCallback(frameHandle)}catch(e){}
  try{video.pause()}catch(e){}
  intro.classList.add("logo-phase");
  setTimeout(()=>intro.classList.add("boot-out"),1280);
  setTimeout(()=>{
   if(removed)return;removed=true;
   try{video.removeAttribute("src");video.load()}catch(e){}
   intro.remove();completeFooteraIntroGate()
  },1720)
 }
 function nearOutro(){
  const duration=Number(video.duration),current=Number(video.currentTime);
  return Number.isFinite(duration)&&duration>0&&Number.isFinite(current)&&duration-current<=1.30
 }
 function watchFrames(){
  if(logoStarted)return;
  if(nearOutro()){finish();return}
  if(typeof video.requestVideoFrameCallback==="function")frameHandle=video.requestVideoFrameCallback(watchFrames)
 }
 function onPlaying(){
  intro.classList.add("is-playing");
  if(typeof video.requestVideoFrameCallback==="function")watchFrames()
 }
 function requestPlay(){
  if(playRequested||logoStarted)return;playRequested=true;
  const p=video.play();
  if(p&&typeof p.catch==="function")p.catch(()=>{playRequested=false;setTimeout(()=>{if(!logoStarted)finish()},450)})
 }
 video.addEventListener("playing",onPlaying,{once:true});
 video.addEventListener("timeupdate",()=>{if(!logoStarted&&nearOutro())finish()});
 video.addEventListener("ended",finish,{once:true});
 video.addEventListener("error",finish,{once:true});
 skip?.addEventListener("click",finish);
 setTimeout(()=>skip?.classList.add("visible"),900);

 // The MP4 has already been preloading while the page/scripts were parsed.
 // Start only with a useful buffer; fall back after a short grace period.
 if(video.readyState>=3)requestPlay();
 else{
  video.addEventListener("canplay",requestPlay,{once:true});
  setTimeout(requestPlay,1100)
 }
}

const GFUT_BUILD="V21.243";
if($("buildBadge"))$("buildBadge").textContent=GFUT_BUILD;
function packFlowInProgress(){return pendingPack.length>0||(state.pendingChemBoosts||[]).length>0||$("opening")?.classList.contains("active")||$("results")?.classList.contains("active")}
let gerliesStartupReady=false,gerliesUpdateRegistration=null,gerliesUpdatePending=null,gerliesUpdateTimer=0,gerliesUpdateReloading=false;
function newerGerliesBuild(remote){
 const parsed=/^V(\d+)\.(\d+)$/.exec(String(remote||"")),local=/^V(\d+)\.(\d+)$/.exec(GFUT_BUILD);
 return !!parsed&&!!local&&(Number(parsed[1])>Number(local[1])||(Number(parsed[1])===Number(local[1])&&Number(parsed[2])>Number(local[2])))
}
function gerliesUpdateBlocked(){
 const reg=gerliesUpdateRegistration;
 return !gerliesStartupReady||!!$("bootIntro")||$("dbGate")?.style.display!=="none"||packFlowInProgress()||$("match")?.classList.contains("active")||!!document.querySelector(".modal.active")||!!activeSbcId||!!globalThis.FooteraPlayerPicks?.isActive?.()||!!globalThis.FooteraPotm?.busy()||!!document.activeElement?.matches("input,textarea,select,[contenteditable='true']")||!!reg?.installing||!!reg?.waiting||reg?.active?.state==="activating"
}
function applyGerliesUpdate(){
 clearTimeout(gerliesUpdateTimer);gerliesUpdateTimer=0;
 if(!gerliesUpdatePending?.size||gerliesUpdateReloading)return;
 if(gerliesUpdateBlocked()){gerliesUpdateTimer=setTimeout(applyGerliesUpdate,500);return}
 try{
  flushSave();
  sessionStorage.setItem("gfut-update-resume",JSON.stringify({at:Date.now(),view:currentViewId(),scrollY:window.scrollY||0}));
  for(const key of gerliesUpdatePending)sessionStorage.setItem(key,"1");
  gerliesUpdateReloading=true;
  const fresh=new URL("./",location.href);fresh.searchParams.set("_gfut_updated",Date.now().toString());location.replace(fresh.href)
 }catch(e){gerliesUpdateReloading=false;console.warn("Update konnte nicht angewendet werden",e)}
}
function requestGerliesUpdate(key){
 if(gerliesUpdateReloading)return;
 try{if(sessionStorage.getItem(key))return}catch(e){console.warn("Update-Speicher nicht verfügbar",e);return}
 gerliesUpdatePending=gerliesUpdatePending||new Set();gerliesUpdatePending.add(key);applyGerliesUpdate()
}
function completeGerliesStartup(){
 gerliesStartupReady=true;
 const resume=GERLIES_UPDATE_RESUME,view=resume&&$(resume.view);
 if(view?.classList.contains("view")){
  switchView(resume.view,{push:false,scroll:false});replaceUiState("view",{view:resume.view});
  requestAnimationFrame(()=>window.scrollTo({top:Math.max(0,Number(resume.scrollY)||0),behavior:"auto"}))
 }
 if(typeof requestedTotwPreview==="function"){
  const preview=requestedTotwPreview();
  if(preview){eventSelectedId=publishedTotwWeeks().some(team=>team.id===preview.id)?`totw-${preview.id}`:`totw-review-${preview.id}`;switchView("eventsView",{push:false})}
 }
 applyGerliesUpdate()
}
async function checkForGerliesUpdate(){
 if(location.protocol!=="https:"&&location.hostname!=="localhost")return;
 try{
  const url=new URL("./index.html",location.href);url.searchParams.set("_gfut_update",Date.now().toString());
  const res=await fetch(url,{cache:"no-store",headers:{"Cache-Control":"no-cache"}});
  if(!res.ok)return;const html=await res.text(),match=html.match(/<title>Footera (V[\d.]+)<\/title>/),remote=match?.[1]||"";
  if(newerGerliesBuild(remote)&&!sessionStorage.getItem("gfut-update-"+remote)){
   try{const reg=await navigator.serviceWorker?.getRegistration("./");await reg?.update()}catch(e){}
   requestGerliesUpdate("gfut-update-"+remote)
  }
 }catch(e){console.warn("Update-Prüfung:",e)}
}
if("serviceWorker" in navigator && (location.protocol==="https:" || location.hostname==="localhost")){
 window.addEventListener("load",()=>{
  FOOTERA_INTRO_DONE.then(()=>{
   let previousController=navigator.serviceWorker.controller;
   navigator.serviceWorker.register("./service-worker.js?v=21243",{scope:"./"}).then(async reg=>{gerliesUpdateRegistration=reg;await reg.update();checkForGerliesUpdate()}).catch(err=>console.warn("Service Worker:",err));
   navigator.serviceWorker.addEventListener("controllerchange",()=>{
    const previous=previousController;previousController=navigator.serviceWorker.controller;
    // A new cache controller does not mean the already loaded page is old.
    if(!previous||!previousController||previous.scriptURL===previousController.scriptURL)return;
    checkForGerliesUpdate()
   });
  })
 });
}else window.addEventListener("load",()=>FOOTERA_INTRO_DONE.then(checkForGerliesUpdate));

