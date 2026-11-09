// V21.375 Spielervergleich: two cards side by side, every value with a bar, the better value highlighted.
// Read-only: it never changes the club, squad or save. Opened from the player profile (club, squad, pack).
(function(root){
 "use strict";
 const MODAL_ID="playerCompareModal",KIND="player-compare";
 let ctx=null;// {left:item, right:item|null, search:""}

 const GROUPS={GK:"GK",CB:"DEF",LB:"DEF",RB:"DEF",LWB:"DEF",RWB:"DEF",CDM:"MID",CM:"MID",CAM:"MID",LM:"MID",RM:"MID",LW:"ATT",RW:"ATT",ST:"ATT",CF:"ATT"};
 function group(pos){return GROUPS[String(pos||"").toUpperCase()]||"MID"}
 function base(item){try{return item?resolvedPlayer(displayBase(item)):null}catch(e){return null}}
 function rating(item,b){return Number(itemRating(item)||b?.ovr||0)}
 function plusCount(item,b){try{return typeof FooteraPlayStyles!=="undefined"?(FooteraPlayStyles.resolve(b,item)?.plus||[]).length:0}catch(e){return 0}}
 function styleCount(item,b){try{return typeof FooteraPlayStyles!=="undefined"?(FooteraPlayStyles.resolve(b,item)?.styles||[]).length:0}catch(e){return 0}}

 // Positions the card can play, so "SCH vs SCH" only matters when both are field players.
 function fits(b,pos){return posFit(b,pos)>0}

 // Best partner: the starter on this card's position (that's the real decision), otherwise the best club card in the same line.
 function defaultPartner(item){
  const b=base(item);if(!b)return null;
  const squad=squadItems(),form=currentFormation(),uid=item.uid;
  const own=squad.findIndex(x=>x&&x.uid===uid);
  if(own<0){
   let best=null,bestScore=-1;
   for(let i=0;i<11;i++){const x=squad[i],slot=form[i]?.p;if(!x||!slot)continue;const xb=base(x);if(!xb)continue;
    const score=(slot===b.position?3:fits(b,slot)?2:group(slot)===group(b.position)?1:0);
    if(score>0&&(score>bestScore||(score===bestScore&&rating(x,xb)<rating(best,base(best))))){best=x;bestScore=score}}
   if(best)return best;
  }
  return candidates(item,"")[0]||null;
 }

 // Club cards for the picker: same line first, highest rating first. A search looks through the whole club.
 function candidates(item,search){
  const b=base(item),uid=item?.uid,q=normalize(search);
  const rows=[];
  for(const x of state.club||[]){if(!x||x.uid===uid)continue;const xb=base(x);if(!xb)continue;
   if(q){if(!normalize(`${xb.name} ${xb.fullName||""}`).includes(q))continue}
   else if(String(b?.position).toUpperCase()==="GK"?String(xb.position).toUpperCase()!=="GK":group(xb.position)!==group(b?.position))continue;
   rows.push({x,r:rating(x,xb),same:xb.position===b?.position?1:0})}
  rows.sort((a,c)=>c.same-a.same||c.r-a.r);
  const seen=new Set(),out=[];
  for(const row of rows){const key=packItemKey(row.x);if(seen.has(key))continue;seen.add(key);out.push(row.x);if(out.length>=8)break}
  return out;
 }
 function normalize(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim()}

 // One row per value. higher = better for every value we show.
 function rows(li,lb,ri,rb){
  const gk=String(lb.position).toUpperCase()==="GK"&&String(rb.position).toUpperCase()==="GK";
  const statLabels=cardStatPairs(gk?lb:{...lb,position:"ST"}).map(x=>x[0]);
  const out=[{label:"GES",l:rating(li,lb),r:rating(ri,rb),max:99,big:true}];
  ["pac","sho","pas","dri","def","phy"].forEach((k,i)=>out.push({label:statLabels[i],l:Number(lb[k]||0),r:Number(rb[k]||0),max:99,stat:true}));
  const wl=Number(lb.weakFoot||0),wr=Number(rb.weakFoot||0),sl=Number(lb.skillMoves||0),sr=Number(rb.skillMoves||0);
  if(wl&&wr)out.push({label:"Schwacher Fuß",l:wl,r:wr,max:5,stars:true});
  if(sl&&sr)out.push({label:"Technik",l:sl,r:sr,max:5,stars:true});
  const pl=plusCount(li,lb),pr=plusCount(ri,rb);
  if(pl||pr)out.push({label:"PlayStyles+",l:pl,r:pr,max:3,count:true});
  out.push({label:"PlayStyles",l:styleCount(li,lb),r:styleCount(ri,rb),max:10,count:true});
  return out;
 }

 function summary(lb,rb,list){
  const stats=list.filter(x=>x.stat);let l=0,r=0;for(const s of stats){if(s.l>s.r)l++;else if(s.r>s.l)r++}
  const g=list[0];
  if(l===r&&g.l===g.r)return"Beide Karten liegen gleichauf.";
  const leftLeads=l>r||(l===r&&g.l>g.r),leader=leftLeads?lb:rb,other=leftLeads?rb:lb,n=Math.max(l,r);
  const gesOther=leftLeads?g.r>g.l:g.l>g.r;
  return`${esc(leader.name)} ist in ${n} von ${stats.length} Werten vorne.${gesOther?`<small>${esc(other.name)} hat die höhere GES.</small>`:""}`;
 }

 function valueHTML(row,side){
  const v=side==="l"?row.l:row.r,o=side==="l"?row.r:row.l,cls=v>o?"better":v<o?"worse":"even";
  const shown=row.stars?`${v}★`:String(v);
  const pct=Math.max(4,Math.min(100,Math.round(v/row.max*100)));
  return`<div class="pc-val ${cls} ${side}"><b>${shown}</b>${row.big?"":`<i><span style="width:${pct}%"></span></i>`}</div>`;
 }

 function sideHead(item,b,label){
  return`<div class="pc-side"><div class="pc-card">${cardHTML(b,item,false,b.position)}</div><small>${esc(label)}</small></div>`;
 }

 function contextLabel(item){
  if(!item)return"";const i=squadItems().findIndex(x=>x&&x.uid===item.uid);
  if(i>=0&&i<11)return`Startelf · ${positionLabel(currentFormation()[i]?.p,base(item))}`;
  if(i>=11)return i<18?"Ersatzbank":"Reserve";
  return (state.club||[]).some(x=>x.uid===item.uid)?"Verein":"Pack";
 }

 function render(){
  const body=$("playerCompareBody");if(!body||!ctx)return;
  const li=ctx.left,lb=base(li);if(!lb){body.innerHTML="";return}
  const ri=ctx.right,rb=ri?base(ri):null;
  const pick=`<section class="pc-pick"><div class="pc-pick-head"><strong>${rb?"Anderen Spieler wählen":"Mit wem vergleichen?"}</strong><input type="search" id="playerCompareSearch" placeholder="Name im Verein suchen" value="${esc(ctx.search)}" autocomplete="off"></div><div class="pc-pick-list" id="playerComparePickList">${pickListHTML()}</div></section>`;
  if(!rb){body.innerHTML=`<div class="pc-solo">${sideHead(li,lb,contextLabel(li))}</div>${pick}`;return}
  const data=rows(li,lb,ri,rb);
  const table=data.map(row=>`<div class="pc-row ${row.big?"big":""}">${valueHTML(row,"l")}<span class="pc-label">${esc(row.label)}</span>${valueHTML(row,"r")}</div>`).join("");
  const posL=playerPositions(lb).map(p=>positionLabel(p,lb)).join(" · "),posR=playerPositions(rb).map(p=>positionLabel(p,rb)).join(" · ");
  body.innerHTML=`<div class="pc-heads">${sideHead(li,lb,contextLabel(li))}<button type="button" class="pc-swap secondary" data-compare-swap aria-label="Seiten tauschen">⇄</button>${sideHead(ri,rb,contextLabel(ri))}</div><div class="pc-verdict">${summary(lb,rb,data)}</div><div class="pc-table">${table}<div class="pc-row pc-pos"><div class="pc-val l"><b>${esc(posL)}</b></div><span class="pc-label">Positionen</span><div class="pc-val r"><b>${esc(posR)}</b></div></div></div>${pick}`;
 }

 function pickListHTML(){
  const list=candidates(ctx.left,ctx.search),ri=ctx.right;
  return list.length?list.map(x=>{const xb=base(x);return`<button type="button" class="pc-chip ${ri&&x.uid===ri.uid?"active":""}" data-compare-with="${esc(x.uid)}"><b>${rating(x,xb)}</b><span>${esc(xb.name)}</span><small>${esc(positionLabel(xb.position,xb))}</small></button>`}).join(""):`<div class="pc-empty">${ctx.search?"Kein Spieler mit diesem Namen im Verein.":"Keine passende Karte im Verein."}</div>`;
 }

 function ensureModal(){
  if($(MODAL_ID))return;
  const el=document.createElement("div");el.id=MODAL_ID;el.className="modal";
  el.innerHTML=`<div class="modalinner"><div class="modalhead"><div><h3>Spielervergleich</h3><div class="pc-sub">Grün = besserer Wert</div></div><button id="playerCompareClose" class="secondary">Schließen</button></div><div id="playerCompareBody"></div></div>`;
  document.body.appendChild(el);
  $("playerCompareClose").addEventListener("click",()=>closeUiLayer(MODAL_ID,KIND));
  el.addEventListener("click",e=>{
   const w=e.target.closest("[data-compare-with]");
   if(w){const x=(state.club||[]).find(i=>i.uid===w.dataset.compareWith);if(x&&ctx){ctx.right=x;ctx.search="";render();el.scrollTo?.({top:0,behavior:"smooth"})}return}
   if(e.target.closest("[data-compare-swap]")&&ctx?.right){[ctx.left,ctx.right]=[ctx.right,ctx.left];render()}
  });
  el.addEventListener("input",e=>{if(e.target.id!=="playerCompareSearch"||!ctx)return;ctx.search=e.target.value;const list=$("playerComparePickList");if(list)list.innerHTML=pickListHTML()});
 }

 function open(item,partner){
  if(!item||!base(item))return false;
  ensureModal();
  ctx={left:item,right:partner===undefined?defaultPartner(item):partner,search:""};
  render();showUiLayer(MODAL_ID,KIND);$(MODAL_ID).scrollTop=0;return true;
 }

 function menuHTML(attr,value){
  return`<button class="menu-action" ${attr}="${esc(value)}"><span><span>Spieler vergleichen</span><small>Neben deinen Stammspieler oder eine andere Vereinskarte legen.</small></span><b>›</b></button>`;
 }

 root.FooteraCompare={open,menuHTML,defaultPartner,candidates,rows,group};
})(window);
