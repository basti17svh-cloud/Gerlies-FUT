// V21.414 Team of the Year 2026 – fan vote (Basti 2026-11-13).
// Fr 11.12.2026 19:00 to So 03.01.2027 19:00 Berlin: every account picks 1 TW, 4 ABW, 3 MF, 3 ST from the nominees.
// The server (online/footera-toty-vote-v21.414.sql) keeps one ballot per account; the thank-you pack (6x 84+)
// is granted only when footera_toty_claim_reward returns true, which happens once per account.
(function(root){
 "use strict";
 const SEASON=2026,MODAL_ID="totyModal",KIND="toty";
 const VOTE_FROM="2026-12-11T19:00:00+01:00",VOTE_UNTIL="2027-01-03T19:00:00+01:00";
 const SLOTS=[{id:"gk",label:"Torwart",count:1},{id:"def",label:"Abwehr",count:4},{id:"mid",label:"Mittelfeld",count:3},{id:"att",label:"Angriff",count:3}];
 const NOMINEES=[
  {pid:"192119",slot:"gk",name:"Thibaut Courtois",ovr:90,pos:"GK",club:"Real Madrid"},
  {pid:"230621",slot:"gk",name:"Gianluigi Donnarumma",ovr:89,pos:"GK",club:"Manchester City"},
  {pid:"200389",slot:"gk",name:"Jan Oblak",ovr:88,pos:"GK",club:"Atlético de Madrid"},
  {pid:"220901",slot:"gk",name:"David Raya",ovr:88,pos:"GK",club:"Arsenal"},
  {pid:"212831",slot:"gk",name:"Alisson",ovr:87,pos:"GK",club:"Liverpool"},
  {pid:"232580",slot:"def",name:"Gabriel",ovr:89,pos:"CB",club:"Arsenal"},
  {pid:"252145",slot:"def",name:"Nuno Mendes",ovr:89,pos:"LB",club:"Paris SG"},
  {pid:"256196",slot:"def",name:"Willian Pacho",ovr:89,pos:"CB",club:"Paris SG"},
  {pid:"203376",slot:"def",name:"Virgil van Dijk",ovr:88,pos:"CB",club:"Liverpool"},
  {pid:"235212",slot:"def",name:"Achraf Hakimi",ovr:88,pos:"RB",club:"Paris SG"},
  {pid:"243715",slot:"def",name:"William Saliba",ovr:88,pos:"CB",club:"Arsenal"},
  {pid:"207865",slot:"def",name:"Marquinhos",ovr:87,pos:"CB",club:"Paris SG"},
  {pid:"213331",slot:"def",name:"Jonathan Tah",ovr:87,pos:"CB",club:"FC Bayern München"},
  {pid:"229558",slot:"def",name:"Dayot Upamecano",ovr:87,pos:"CB",club:"FC Bayern München"},
  {pid:"239818",slot:"def",name:"Rúben Dias",ovr:87,pos:"CB",club:"Manchester City"},
  {pid:"247819",slot:"def",name:"Nico Schlotterbeck",ovr:87,pos:"CB",club:"Borussia Dortmund"},
  {pid:"226268",slot:"def",name:"Federico Dimarco",ovr:86,pos:"LB",club:"Inter"},
  {pid:"231866",slot:"mid",name:"Rodri",ovr:90,pos:"CDM",club:"FC Barcelona"},
  {pid:"247827",slot:"mid",name:"Michael Olise",ovr:90,pos:"RM",club:"FC Bayern München"},
  {pid:"251854",slot:"mid",name:"Pedri",ovr:90,pos:"CM",club:"FC Barcelona"},
  {pid:"252371",slot:"mid",name:"Jude Bellingham",ovr:90,pos:"CAM",club:"Real Madrid"},
  {pid:"255253",slot:"mid",name:"Vitinha",ovr:90,pos:"CM",club:"Paris SG"},
  {pid:"158023",slot:"mid",name:"Lionel Messi",ovr:89,pos:"CAM",club:"Inter Miami CF"},
  {pid:"212198",slot:"mid",name:"Bruno Fernandes",ovr:89,pos:"CAM",club:"Man Utd"},
  {pid:"212622",slot:"mid",name:"Joshua Kimmich",ovr:88,pos:"CDM",club:"FC Bayern München"},
  {pid:"234378",slot:"mid",name:"Declan Rice",ovr:88,pos:"CDM",club:"Arsenal"},
  {pid:"241084",slot:"mid",name:"Luis Díaz",ovr:88,pos:"LM",club:"FC Bayern München"},
  {pid:"231747",slot:"att",name:"Kylian Mbappé",ovr:91,pos:"ST",club:"Real Madrid"},
  {pid:"239085",slot:"att",name:"Erling Haaland",ovr:91,pos:"ST",club:"Manchester City"},
  {pid:"202126",slot:"att",name:"Harry Kane",ovr:90,pos:"ST",club:"FC Bayern München"},
  {pid:"231443",slot:"att",name:"Ousmane Dembélé",ovr:90,pos:"ST",club:"Paris SG"},
  {pid:"277643",slot:"att",name:"Lamine Yamal",ovr:90,pos:"RW",club:"FC Barcelona"},
  {pid:"238794",slot:"att",name:"Vini Jr.",ovr:89,pos:"LW",club:"Real Madrid"},
  {pid:"247635",slot:"att",name:"Khvicha Kvaratskhelia",ovr:89,pos:"LW",club:"Paris SG"},
  {pid:"233419",slot:"att",name:"Raphinha",ovr:88,pos:"LW",club:"FC Barcelona"},
  {pid:"231478",slot:"att",name:"Lautaro Martínez",ovr:87,pos:"ST",club:"Inter"},
  {pid:"246669",slot:"att",name:"Bukayo Saka",ovr:87,pos:"RW",club:"Arsenal"}
 ];
 const REWARD_LABEL="6× 84+ Spieler-Pack";
 const BY_PID=new Map(NOMINEES.map(n=>[n.pid,n]));
 const escText=v=>typeof esc==="function"?esc(v):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const ms=v=>Date.parse(v);
 function phase(at=Date.now()){return at<ms(VOTE_FROM)?"before":at<ms(VOTE_UNTIL)?"open":"closed"}
 function data(s=typeof state!=="undefined"?state:null){
  const raw=s&&s.toty&&typeof s.toty==="object"&&s.toty[SEASON]&&typeof s.toty[SEASON]==="object"?s.toty[SEASON]:{};
  const picks=Array.isArray(raw.picks)?raw.picks.map(String).filter(p=>BY_PID.has(p)):[];
  return{picks:[...new Set(picks)],voted:raw.voted===true,rewarded:raw.rewarded===true};
 }
 function store(patch){
  if(typeof state==="undefined")return;
  state.toty=state.toty&&typeof state.toty==="object"?state.toty:{};
  state.toty[SEASON]={...data(),...patch};
  if(typeof save==="function")save();
 }
 // Local draft selection before voting; a full ballot has 1/4/3/3.
 let draft=[];
 function counts(picks){const c={gk:0,def:0,mid:0,att:0};for(const p of picks){const n=BY_PID.get(p);if(n)c[n.slot]++}return c}
 function complete(picks){const c=counts(picks);return picks.length===11&&SLOTS.every(s=>c[s.id]===s.count)}
 function toggle(pid){
  const n=BY_PID.get(pid);if(!n)return false;
  if(draft.includes(pid)){draft=draft.filter(p=>p!==pid);return true}
  const slot=SLOTS.find(s=>s.id===n.slot);
  // A full position swaps out its oldest pick, so one tap always works.
  if(counts(draft)[n.slot]>=slot.count){const first=draft.find(p=>BY_PID.get(p).slot===n.slot);draft=draft.filter(p=>p!==first)}
  draft.push(pid);return true;
 }
 async function client(){const online=root.FooteraOnline;if(!online?.ready||typeof online.authClient!=="function")return null;try{return await online.authClient()}catch(e){return null}}
 const signedIn=()=>{try{return !!root.FooteraAccount?.user?.()}catch(e){return false}};
 function grantReward(){
  if(typeof grant!=="function")return;
  const pack=typeof ratingRewardPack==="function"?ratingRewardPack(84,6):"reward-84-6";
  grant({pack,qty:1});
 }
 async function claimReward(c){
  if(data().rewarded)return false;
  const {data:ok,error}=await c.rpc("footera_toty_claim_reward",{p_season:SEASON});
  if(error)throw error;
  if(ok===true){grantReward();store({rewarded:true});if(typeof flushSave==="function")flushSave();return true}
  store({rewarded:true});return false;
 }
 let busy=false,message="",results=null,resultsAt=0;
 async function submit(at=Date.now()){
  if(busy||!complete(draft)||phase(at)!=="open")return;
  busy=true;message="";render();
  try{
   const c=await client();if(!c||!signedIn()){message="Zum Abstimmen brauchst du ein Footera-Konto (oben rechts über das Profil).";return}
   const {data:r,error}=await c.rpc("footera_toty_vote",{p_season:SEASON,p_picks:draft});
   if(error)throw error;
   store({picks:[...draft],voted:true});
   const paid=await claimReward(c);
   message=r&&r.already?"Du hattest schon abgestimmt, deine erste Stimme zählt.":"Danke! Deine Stimme zählt."+(paid?` Dein Dankeschön (${REWARD_LABEL}) liegt unter Store › Meine Packs.`:"");
   await loadResults(true);
   if(typeof renderAll==="function")renderAll();
  }catch(e){console.warn("TOTY-Abstimmung:",e);message=String(e?.message||"").includes("nicht offen")?"Die Abstimmung ist gerade nicht offen.":"Das hat nicht geklappt. Bitte versuch es gleich noch einmal."}
  finally{busy=false;render();renderHome()}
 }
 // A vote from another device: restore it and claim a missing thank-you pack (the server decides, never twice).
 async function restore(){
  if(!signedIn())return;
  try{
   const c=await client();if(!c)return;
   const {data:rows,error}=await c.rpc("footera_toty_my_vote",{p_season:SEASON});if(error)throw error;
   const row=Array.isArray(rows)?rows[0]:null;if(!row)return;
   store({picks:(row.picks||[]).map(String),voted:true,rewarded:data().rewarded||row.reward_claimed===true});
   if(!row.reward_claimed)await claimReward(c);
  }catch(e){console.warn("TOTY-Stimme laden:",e)}
 }
 async function loadResults(force=false){
  if(!force&&results&&Date.now()-resultsAt<60000)return results;
  try{const c=await client();if(!c)return results;const {data:rows,error}=await c.rpc("footera_toty_results",{p_season:SEASON});if(error)throw error;results=Array.isArray(rows)?rows:[];resultsAt=Date.now()}
  catch(e){console.warn("TOTY-Zwischenstand:",e)}
  return results;
 }
 // Current leaders per position as the server counts them (ties: higher rating first).
 function leaders(rows=results){
  if(!Array.isArray(rows))return null;
  const votes=new Map(rows.map(r=>[String(r.pid),Number(r.votes)||0]));
  return SLOTS.map(s=>({slot:s,players:NOMINEES.filter(n=>n.slot===s.id).map(n=>({...n,votes:votes.get(n.pid)||0})).sort((a,b)=>b.votes-a.votes||b.ovr-a.ovr).slice(0,s.count)}));
 }
 function nomineeHTML(n,picked,locked){
  return`<button type="button" class="toty-pick ${picked?"on":""}" data-toty-pick="${n.pid}" ${locked?"disabled":""} aria-pressed="${picked}"><b>${n.ovr}</b><span>${escText(n.name)}</span><small>${escText(typeof positionLabel==="function"?positionLabel(n.pos):n.pos)} · ${escText(n.club)}</small></button>`;
 }
 function html(at=Date.now()){
  const ph=phase(at),d=data();
  if(ph==="before")return`<p class="toty-lead">Ab Fr 11.12. um 19:00 Uhr wählst du hier deine Elf des Jahres. Wer abstimmt, bekommt ein ${REWARD_LABEL}.</p>`;
  const picks=d.voted?d.picks:draft,locked=d.voted||ph!=="open",c=counts(picks);
  const lead=ph==="closed"?`<p class="toty-lead">Die Abstimmung ist vorbei. Das Team of the Year kommt im Januar in Wellen in die Packs.</p>`:
   d.voted?`<p class="toty-lead">Deine Stimme ist abgegeben. Oben siehst du den Zwischenstand.</p>`:
   `<p class="toty-lead">Wähle 1 Torwart, 4 Abwehr, 3 Mittelfeld und 3 Angriff. Eine Stimme pro Konto, als Dankeschön gibt es ein ${REWARD_LABEL}.</p>`;
  const sections=SLOTS.map(s=>`<section class="toty-slot"><h4>${s.label} <span class="${c[s.id]===s.count?"full":""}">${c[s.id]}/${s.count}</span></h4><div class="toty-grid">${NOMINEES.filter(n=>n.slot===s.id).map(n=>nomineeHTML(n,picks.includes(n.pid),locked)).join("")}</div></section>`).join("");
  const lb=leaders();
  const standings=lb&&(d.voted||ph==="closed")?`<section class="toty-standings"><h4>Zwischenstand</h4>${lb.map(g=>`<p><b>${g.slot.label}:</b> ${g.players.map(p=>escText(p.name)).join(", ")}</p>`).join("")}</section>`:"";
  const label=busy?"Wird gesendet …":complete(draft)?"Stimme abgeben":`Noch ${11-draft.length} Spieler wählen`;
  const action=locked?"":`<button type="button" class="primary toty-submit" data-toty-submit ${complete(draft)&&!busy?"":"disabled"}>${label}</button>`;
  return`${lead}${message?`<p class="toty-msg">${escText(message)}</p>`:""}${standings}${sections}${action}`;
 }
 function $(sel){return typeof document!=="undefined"?document.querySelector(sel):null}
 function renderHome(at=Date.now()){
  const host=$("#totyHome");if(!host)return;
  if(typeof state==="undefined"||!state.onboarded||(state.tutorial&&!state.tutorial.done)||phase(at)!=="open"){host.hidden=true;host.innerHTML="";return}
  const d=data();host.hidden=false;
  host.innerHTML=`<button type="button" class="toty-banner ${d.voted?"done":""}" data-toty-open><span class="toty-icon" aria-hidden="true">🏆</span><span class="toty-banner-copy"><small>TEAM OF THE YEAR · ABSTIMMUNG</small><strong>${d.voted?"Zwischenstand ansehen":"Wähle deine Elf des Jahres"}</strong></span><span class="toty-arrow" aria-hidden="true">›</span></button>`;
 }
 function render(){const body=$("#totyBody");if(body)body.innerHTML=html()}
 function ensureModal(){
  if($("#"+MODAL_ID))return;
  const el=document.createElement("div");el.id=MODAL_ID;el.className="modal";
  el.innerHTML=`<div class="modalinner toty-modal"><div class="modalhead"><h3>Team of the Year</h3><button type="button" class="secondary" data-toty-close>Schließen</button></div><div id="totyBody"></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",e=>{
   if(e.target.closest("[data-toty-close]")){typeof closeUiLayer==="function"?closeUiLayer(MODAL_ID,KIND):el.classList.remove("active");return}
   const p=e.target.closest("[data-toty-pick]");if(p&&!p.disabled){toggle(p.dataset.totyPick);render();return}
   if(e.target.closest("[data-toty-submit]"))submit();
  });
 }
 async function open(){
  ensureModal();if(!draft.length)draft=[...data().picks];render();
  if(typeof showUiLayer==="function")showUiLayer(MODAL_ID,KIND);else $("#"+MODAL_ID).classList.add("active");
  if(phase()!=="before"){await restore();await loadResults();render();renderHome()}
 }
 function start(){
  document.addEventListener("click",e=>{if(e.target.closest?.("[data-toty-open]"))open()});
  setInterval(()=>{if(document.visibilityState==="visible")renderHome()},60000);
 }
 root.FooteraToty={SEASON,VOTE_FROM,VOTE_UNTIL,SLOTS,NOMINEES,REWARD_LABEL,phase,data,counts,complete,toggle,leaders,html,renderHome,open,submit,restore,message:()=>message,
  draft:v=>v===undefined?draft:(draft=[...v])};
 if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()}
})(typeof window!=="undefined"?window:globalThis);
